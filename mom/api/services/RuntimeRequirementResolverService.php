<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Resolves operational gate requirements from authoritative policy rows.
 *
 * Caller payloads may provide candidate evidence, but never final `require_*`
 * truth. Missing policy, policy load failure, policy conflict, or missing
 * required evidence blocks by default.
 */
final class RuntimeRequirementResolverService
{
    public const SNAPSHOT_SCHEMA_VERSION = 'runtime_requirement_snapshot.v1';

    public const EVIDENCE_CLASSES = [
        'operator_qualification',
        'training',
        'machine_readiness',
        'calibration',
        'pm',
        'material_lot_serial_shelf_life_hold',
        'tool_life_preset',
        'gage_calibration_msa_oot',
        'nc_checksum',
        'control_plan',
        'inspection_plan',
        'uom',
        'supplier_certification',
        'customer_coc',
        'e_signature',
    ];

    /** @var list<array<string,mixed>>|null */
    private ?array $injectedPolicies;

    /** @var array<string,int> */
    private array $metrics = [
        'evaluations' => 0,
        'passes' => 0,
        'blocks' => 0,
        'policy_lookup_failed' => 0,
        'policy_missing' => 0,
        'policy_conflict' => 0,
        'caller_require_flag_forbidden' => 0,
        'missing_required_evidence' => 0,
        'uom_authority_resolution_failed' => 0,
    ];

    /**
     * @param list<array<string,mixed>>|null $policyRows
     */
    public function __construct(
        private readonly ?Connection $db = null,
        ?array $policyRows = null,
    ) {
        $this->injectedPolicies = $policyRows === null
            ? null
            : array_values(array_filter($policyRows, 'is_array'));
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $candidateEvidence
     * @param array<string,mixed> $actor
     * @param list<array<string,mixed>> $preResolvedBlockers
     * @return array<string,mixed>
     */
    public function resolve(
        string $commandName,
        array $payload,
        array $candidateEvidence = [],
        array $actor = [],
        array $preResolvedBlockers = []
    ): array {
        $this->metrics['evaluations']++;

        $blockers = array_values(array_filter($preResolvedBlockers, 'is_array'));
        $callerRequireFlags = $this->findCallerRequireFlags($payload);
        foreach ($callerRequireFlags as $flag) {
            $blockers[] = $this->blocker(
                'caller_require_flag_forbidden',
                'caller_payload',
                "Caller-provided '{$flag}' is not requirement authority."
            );
        }

        try {
            $policies = $this->loadPolicies($commandName, $payload);
        } catch (Throwable $e) {
            $this->metrics['policy_lookup_failed']++;
            $blockers[] = $this->blocker(
                'authority_lookup_failed',
                'runtime_requirement_policy',
                'Requirement policy could not be loaded from authoritative storage.'
            );
            return $this->result($commandName, [], [], $candidateEvidence, $blockers, $actor);
        }

        if ($policies === []) {
            $this->metrics['policy_missing']++;
            $blockers[] = $this->blocker(
                'authority_lookup_failed',
                'runtime_requirement_policy',
                "No active requirement policy resolved for command '{$commandName}'."
            );
            return $this->result($commandName, [], [], $candidateEvidence, $blockers, $actor);
        }

        [$requirements, $conflicts] = $this->collapsePolicies($policies);
        foreach ($conflicts as $conflict) {
            $this->metrics['policy_conflict']++;
            $blockers[] = $this->blocker(
                'policy_conflict',
                (string)($conflict['evidence_class'] ?? 'unknown'),
                'Conflicting authoritative requirement policies have equal precedence.'
            );
        }

        $evaluated = [];
        foreach ($requirements as $requirement) {
            $evidenceClass = (string)$requirement['evidence_class'];
            $required = (bool)($requirement['required'] ?? true);
            $present = $this->evidencePresent($candidateEvidence, $requirement);

            $row = $requirement;
            $row['evidence_present'] = $present;
            $row['required'] = $required;
            $row['status'] = $present ? 'satisfied' : ($required ? 'missing_required' : 'optional_missing');
            $evaluated[] = $row;

            if ($required && !$present) {
                $this->metrics['missing_required_evidence']++;
                $blockers[] = $this->blocker(
                    'missing_required_evidence',
                    $evidenceClass,
                    "Required evidence '{$evidenceClass}' is missing."
                );
            }
        }

        return $this->result($commandName, $requirements, $evaluated, $candidateEvidence, $blockers, $actor);
    }

    /**
     * @return array<string,int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    /**
     * @return array<string,mixed>
     */
    public function probe(): array
    {
        return [
            'slice' => 'runtime_requirement_resolver',
            'backend' => $this->injectedPolicies !== null ? 'injected_policy_rows' : 'postgres_runtime_requirement_policy',
            'readiness_state' => 'fail_closed_resolver_ready',
            'caller_require_flags_trusted' => false,
            'unresolved_policy_default' => 'block',
            'snapshot_schema_version' => self::SNAPSHOT_SCHEMA_VERSION,
            'evidence_classes' => self::EVIDENCE_CLASSES,
            'metrics' => $this->metrics,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<array<string,mixed>>
     */
    private function loadPolicies(string $commandName, array $payload): array
    {
        $rows = $this->injectedPolicies;
        if ($rows === null) {
            if ($this->db === null) {
                throw new \RuntimeException('runtime_requirement_policy_repository_unavailable');
            }
            $rows = $this->db->query(
                "SELECT policy_id, policy_scope, command_name, evidence_class,
                        required, precedence, match_criteria, evidence_keys,
                        source_authority, operator_message, problem_code,
                        lifecycle_status, effective_from, effective_to
                   FROM runtime_requirement_policy
                  WHERE command_name = :command
                    AND lifecycle_status = 'active'
                    AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
                    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                  ORDER BY precedence DESC, policy_scope ASC, evidence_class ASC",
                [':command' => $commandName]
            );
        }

        $matches = [];
        foreach ($rows as $row) {
            if ((string)($row['command_name'] ?? '') !== $commandName) {
                continue;
            }
            if (strtolower((string)($row['lifecycle_status'] ?? 'active')) !== 'active') {
                continue;
            }
            $criteria = $this->decodeMap($row['match_criteria'] ?? []);
            if (!$this->criteriaMatches($criteria, $payload)) {
                continue;
            }
            $row['required'] = $this->truthy($row['required'] ?? true);
            $row['precedence'] = (int)($row['precedence'] ?? 0);
            $row['evidence_keys'] = $this->decodeList($row['evidence_keys'] ?? []);
            $matches[] = $row;
        }

        return $matches;
    }

    /**
     * @param list<array<string,mixed>> $policies
     * @return array{0:list<array<string,mixed>>,1:list<array<string,mixed>>}
     */
    private function collapsePolicies(array $policies): array
    {
        $byClass = [];
        foreach ($policies as $policy) {
            $class = (string)($policy['evidence_class'] ?? '');
            if ($class === '') {
                continue;
            }
            $byClass[$class][] = $policy;
        }

        $requirements = [];
        $conflicts = [];
        foreach ($byClass as $class => $rows) {
            usort($rows, static fn (array $a, array $b): int => ((int)$b['precedence']) <=> ((int)$a['precedence']));
            $top = $rows[0];
            $samePrecedence = array_values(array_filter(
                $rows,
                static fn (array $row): bool => (int)$row['precedence'] === (int)$top['precedence']
            ));
            $requiredValues = array_unique(array_map(static fn (array $row): string => ((bool)$row['required']) ? '1' : '0', $samePrecedence));
            if (count($requiredValues) > 1) {
                $conflicts[] = [
                    'evidence_class' => $class,
                    'policies' => $samePrecedence,
                ];
                continue;
            }

            $top['superseded_policy_count'] = max(0, count($rows) - 1);
            $requirements[] = $top;
        }

        return [$requirements, $conflicts];
    }

    /**
     * @param array<string,mixed> $candidateEvidence
     * @param array<string,mixed> $requirement
     */
    private function evidencePresent(array $candidateEvidence, array $requirement): bool
    {
        $class = (string)($requirement['evidence_class'] ?? '');
        if ($class === '' || !array_key_exists($class, $candidateEvidence)) {
            return false;
        }
        $evidence = $candidateEvidence[$class];
        if ($evidence === null || $evidence === '' || $evidence === []) {
            return false;
        }

        $keys = $this->decodeList($requirement['evidence_keys'] ?? []);
        if ($keys === []) {
            return true;
        }
        if (!is_array($evidence)) {
            return false;
        }
        foreach ($keys as $key) {
            if (!array_key_exists($key, $evidence) || $evidence[$key] === null || $evidence[$key] === '') {
                return false;
            }
        }
        return true;
    }

    /**
     * @param list<array<string,mixed>> $requirements
     * @param list<array<string,mixed>> $evaluated
     * @param array<string,mixed> $candidateEvidence
     * @param list<array<string,mixed>> $blockers
     * @param array<string,mixed> $actor
     * @return array<string,mixed>
     */
    private function result(
        string $commandName,
        array $requirements,
        array $evaluated,
        array $candidateEvidence,
        array $blockers,
        array $actor
    ): array {
        $allowed = $blockers === [];
        if ($allowed) {
            $this->metrics['passes']++;
        } else {
            $this->metrics['blocks']++;
            foreach ($blockers as $blocker) {
                $code = (string)($blocker['reason_code'] ?? '');
                if (isset($this->metrics[$code])) {
                    $this->metrics[$code]++;
                }
            }
        }

        $snapshot = [
            'schema_version' => self::SNAPSHOT_SCHEMA_VERSION,
            'command_name' => $commandName,
            'requirements' => $evaluated,
            'candidate_evidence_classes' => array_keys($candidateEvidence),
            'blockers' => $blockers,
            'source_authorities' => array_values(array_unique(array_map(
                static fn (array $row): string => (string)($row['source_authority'] ?? 'unknown'),
                $requirements
            ))),
            'actor_id' => (string)($actor['actor_id'] ?? $actor['user_id'] ?? ''),
        ];

        return [
            'allowed' => $allowed,
            'gate_state' => $allowed ? 'ready' : 'blocked',
            'reason_code' => $allowed ? 'requirements_satisfied' : (string)($blockers[0]['reason_code'] ?? 'requirements_blocked'),
            'command_name' => $commandName,
            'requirements' => $evaluated,
            'candidate_evidence' => $candidateEvidence,
            'blockers' => $blockers,
            'requirements_snapshot' => $snapshot,
            'requirements_snapshot_hash' => $this->hashSnapshot($snapshot),
            'resolved_at' => gmdate(DATE_ATOM),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function blocker(string $reasonCode, string $evidenceClass, string $message): array
    {
        return [
            'reason_code' => $reasonCode,
            'evidence_class' => $evidenceClass,
            'message' => $message,
            'operator_message' => $this->operatorMessage($reasonCode, $evidenceClass),
        ];
    }

    private function operatorMessage(string $reasonCode, string $evidenceClass): string
    {
        return match ($reasonCode) {
            'caller_require_flag_forbidden' => 'Requirement flags from the request are not accepted. The system will resolve requirements from released policy.',
            'authority_lookup_failed' => 'The required policy could not be loaded. The command is blocked until policy authority is available.',
            'policy_conflict' => 'Conflicting requirement policies were found. A supervisor must resolve the policy conflict.',
            'missing_required_evidence' => "Required evidence '{$evidenceClass}' is missing.",
            'uom_authority_resolution_failed' => 'The UOM authority could not normalize the command quantity. The command is blocked until UOM evidence is resolved.',
            default => 'Runtime requirement gate blocked this command.',
        };
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<string>
     */
    private function findCallerRequireFlags(array $payload): array
    {
        $flags = [];
        foreach ($payload as $key => $value) {
            if (str_starts_with((string)$key, 'require_')) {
                $flags[] = (string)$key;
            }
            if (is_array($value)) {
                foreach ($this->findCallerRequireFlags($value) as $nested) {
                    $flags[] = (string)$key . '.' . $nested;
                }
            }
        }
        return $flags;
    }

    /**
     * @param array<string,mixed> $criteria
     * @param array<string,mixed> $payload
     */
    private function criteriaMatches(array $criteria, array $payload): bool
    {
        foreach ($criteria as $field => $expected) {
            if ($expected === null || $expected === '' || $expected === '*') {
                continue;
            }
            if (!array_key_exists((string)$field, $payload)) {
                return false;
            }
            if ((string)$payload[(string)$field] !== (string)$expected) {
                return false;
            }
        }
        return true;
    }

    /**
     * @return array<string,mixed>
     */
    private function decodeMap(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /**
     * @return list<string>
     */
    private function decodeList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_map('strval', $value));
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? array_values(array_map('strval', $decoded)) : [];
        }
        return [];
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'required'], true);
    }

    /**
     * @param array<string,mixed> $snapshot
     */
    private function hashSnapshot(array $snapshot): string
    {
        $stable = $this->sortRecursive($snapshot);
        return hash('sha256', json_encode($stable, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortRecursive($item), $value);
        }
        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursive($item);
        }
        return $value;
    }
}
