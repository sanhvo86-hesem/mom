<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Api\Services\Uom\UomException;
use Throwable;

/**
 * Builds command gate context from resolved runtime requirements.
 *
 * It enriches candidate evidence from authoritative services where available,
 * then delegates final requirement truth to RuntimeRequirementResolverService.
 */
final class GateContextBuilder
{
    public function __construct(
        private readonly RuntimeRequirementResolverService $resolver,
        private readonly ?MdaUomAuthorityBridge $uomBridge = null,
    ) {}

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $actor
     * @return array<string,mixed>
     */
    public function build(string $commandName, array $payload, array $actor = []): array
    {
        $candidateEvidence = $this->candidateEvidence($payload);
        $uomError = null;
        $preResolvedBlockers = [];

        if ($this->uomBridge !== null && array_key_exists($commandName, $this->uomBridge->commandPolicyMatrix())) {
            try {
                $candidateEvidence['uom'] = $this->uomBridge->normalizeCommandQuantity(
                    $commandName,
                    $payload,
                    [
                        'actor_id' => (string)($actor['actor_id'] ?? $actor['user_id'] ?? ''),
                        'trace_id' => (string)($payload['trace_id'] ?? $payload['correlation_id'] ?? ''),
                        'domain' => (string)($payload['domain'] ?? 'mda_command'),
                    ]
                );
            } catch (UomException $e) {
                $uomError = [
                    'problem_code' => $e->problemCode,
                    'message' => $e->getMessage(),
                ];
            } catch (Throwable $e) {
                $uomError = [
                    'problem_code' => 'UOM_AUTHORITY_UNAVAILABLE',
                    'message' => $e->getMessage(),
                ];
            }

            if ($uomError !== null) {
                $preResolvedBlockers[] = [
                    'reason_code' => 'uom_authority_resolution_failed',
                    'evidence_class' => 'uom',
                    'message' => 'UOM authority failed to normalize a governed command quantity.',
                    'operator_message' => 'UOM policy or conversion could not be resolved. Correct UOM evidence before continuing.',
                    'details' => $uomError,
                ];
            }
        }

        $resolution = $this->resolver->resolve($commandName, $payload, $candidateEvidence, $actor, $preResolvedBlockers);
        $context = [
            'command_name' => $commandName,
            'gate_state' => $resolution['gate_state'],
            'allowed' => $resolution['allowed'],
            'reason_code' => $resolution['reason_code'],
            'requirements_snapshot_hash' => $resolution['requirements_snapshot_hash'],
            'requirements_snapshot' => $resolution['requirements_snapshot'],
            'requirements' => $resolution['requirements'],
            'candidate_evidence' => $candidateEvidence,
            'blockers' => $resolution['blockers'],
            'uom_resolution_error' => $uomError,
            'built_at' => gmdate(DATE_ATOM),
        ];

        return $context;
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $actor
     * @return array<string,mixed>
     */
    public function buildOrFail(string $commandName, array $payload, array $actor = []): array
    {
        $context = $this->build($commandName, $payload, $actor);
        if (($context['allowed'] ?? false) !== true) {
            throw new RuntimeRequirementGateException(
                (string)($context['reason_code'] ?? 'requirements_blocked'),
                $context
            );
        }
        return $context;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function candidateEvidence(array $payload): array
    {
        $raw = $payload['evidence'] ?? [];
        if (!is_array($raw)) {
            return [];
        }
        $evidence = [];
        foreach ($raw as $class => $value) {
            $key = (string)$class;
            if ($key === '' || str_starts_with($key, 'require_')) {
                continue;
            }
            $evidence[$key] = $value;
        }
        return $evidence;
    }
}
