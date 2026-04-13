<?php
declare(strict_types=1);

namespace MOM\Api\Services;

final class WorkforceQualificationGateService
{
    /** @var list<array<string, mixed>> */
    private array $requirements;

    /** @var list<array<string, mixed>> */
    private array $qualifications;

    /** @var array<string, int> */
    private array $metrics = [
        'evaluations' => 0,
        'passes' => 0,
        'blocks' => 0,
        'missing_requirement_match' => 0,
        'missing_qualification' => 0,
        'expired_qualification' => 0,
        'insufficient_proficiency' => 0,
    ];

    public function __construct(
        private readonly string $dataDir,
        private readonly ?ManufacturingEventBackboneService $eventBackbone = null,
        ?array $requirements = null,
        ?array $qualifications = null,
    ) {
        $this->requirements = $requirements !== null
            ? array_values(array_filter($requirements, 'is_array'))
            : $this->loadList('workforce/qualification-requirements.json');
        $this->qualifications = $qualifications !== null
            ? array_values(array_filter($qualifications, 'is_array'))
            : $this->loadList('workforce/qualification-ledger.json');
    }

    /**
     * @param array<string, mixed> $task
     * @return array<string, mixed>
     */
    public function assertCanStartTask(string $employeeId, array $task): array
    {
        $evaluation = $this->evaluateTaskStart($employeeId, $task);
        if ((bool)$evaluation['allowed'] === false) {
            $this->emitDecisionEvent($task, $employeeId, $evaluation);
            throw new WorkforceQualificationException(
                (string)$evaluation['reason_code'],
                $evaluation,
                (string)$evaluation['message'],
            );
        }

        if (($evaluation['status'] ?? '') === 'passed') {
            $this->emitDecisionEvent($task, $employeeId, $evaluation);
        }

        return $evaluation;
    }

    /**
     * @param array<string, mixed> $task
     * @return array<string, mixed>
     */
    public function evaluateTaskStart(string $employeeId, array $task): array
    {
        $this->metrics['evaluations']++;
        $requirements = $this->matchingRequirements($task);
        if ($requirements === []) {
            $this->metrics['missing_requirement_match']++;
            return [
                'allowed' => true,
                'status' => 'not_applicable',
                'reason_code' => 'qualification_not_required',
                'message' => 'No qualification requirement matched this task.',
                'employee_id' => $employeeId,
                'requirements' => [],
                'checked_at' => gmdate(DATE_ATOM),
            ];
        }

        $failures = [];
        foreach ($requirements as $requirement) {
            $result = $this->checkRequirement($employeeId, $requirement);
            if (($result['ok'] ?? false) !== true) {
                $failures[] = $result;
            }
        }

        if ($failures !== []) {
            $this->metrics['blocks']++;
            $reason = (string)($failures[0]['reason_code'] ?? 'qualification_blocked');
            if (isset($this->metrics[$reason])) {
                $this->metrics[$reason]++;
            }

            return [
                'allowed' => false,
                'status' => 'blocked',
                'reason_code' => $reason,
                'message' => $this->messageFor($reason),
                'employee_id' => $employeeId,
                'requirements' => $requirements,
                'failures' => $failures,
                'checked_at' => gmdate(DATE_ATOM),
            ];
        }

        $this->metrics['passes']++;
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'qualified',
            'message' => 'Qualification gate passed.',
            'employee_id' => $employeeId,
            'requirements' => $requirements,
            'checked_at' => gmdate(DATE_ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        $hasRequirements = count($this->requirements) > 0;

        return [
            'slice' => 'workforce_qualification_gate',
            'backend' => 'configuration_and_event_ledger',
            'primary_backend' => 'configuration_and_event_ledger',
            'readiness_state' => $hasRequirements ? 'authoritative_ready' : 'authority_partial',
            'authority_mode' => $hasRequirements ? 'service_invariant' : 'service_invariant_no_requirements',
            'authoritative' => $hasRequirements,
            'requirement_count' => count($this->requirements),
            'qualification_record_count' => count($this->qualifications),
            'gated_action' => 'mobile_work_queue.start_task',
            'metrics' => $this->metrics,
        ];
    }

    /**
     * @return array<string, int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    /**
     * @param array<string, mixed> $task
     * @return list<array<string, mixed>>
     */
    private function matchingRequirements(array $task): array
    {
        $matches = [];
        foreach ($this->requirements as $requirement) {
            if (!$this->matchesRequirement($task, $requirement)) {
                continue;
            }
            $matches[] = $requirement;
        }
        return $matches;
    }

    /**
     * @param array<string, mixed> $task
     * @param array<string, mixed> $requirement
     */
    private function matchesRequirement(array $task, array $requirement): bool
    {
        foreach (['task_type', 'work_center_id', 'machine_id', 'operation_seq', 'wo_number'] as $field) {
            $required = trim((string)($requirement[$field] ?? ''));
            if ($required === '' || $required === '*') {
                continue;
            }
            if ((string)($task[$field] ?? '') !== $required) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $requirement
     * @return array<string, mixed>
     */
    private function checkRequirement(string $employeeId, array $requirement): array
    {
        $requiredCode = trim((string)($requirement['qualification_code'] ?? ''));
        $requiredType = trim((string)($requirement['qualification_type'] ?? 'skill'));
        $minProficiency = max(0, (int)($requirement['min_proficiency'] ?? $requirement['min_competence_level'] ?? 0));

        foreach ($this->qualifications as $qualification) {
            if ((string)($qualification['employee_id'] ?? '') !== $employeeId) {
                continue;
            }
            if (trim((string)($qualification['qualification_type'] ?? 'skill')) !== $requiredType) {
                continue;
            }
            if (trim((string)($qualification['qualification_code'] ?? $qualification['skill_code'] ?? $qualification['certification_code'] ?? '')) !== $requiredCode) {
                continue;
            }

            $status = strtolower(trim((string)($qualification['status'] ?? $qualification['qualification_level'] ?? 'active')));
            if (in_array($status, ['expired', 'suspended', 'revoked', 'inactive'], true)) {
                return $this->failure('expired_qualification', $requirement, $qualification);
            }

            $expiry = trim((string)($qualification['expires_at'] ?? $qualification['expiry_date'] ?? ''));
            if ($expiry !== '' && strtotime($expiry) !== false && strtotime($expiry . ' 23:59:59 UTC') < time()) {
                return $this->failure('expired_qualification', $requirement, $qualification);
            }

            $actualProficiency = (int)($qualification['proficiency'] ?? $qualification['competence_level'] ?? $qualification['level'] ?? 0);
            if ($minProficiency > 0 && $actualProficiency < $minProficiency) {
                return $this->failure('insufficient_proficiency', $requirement, $qualification);
            }

            return [
                'ok' => true,
                'reason_code' => 'qualified',
                'requirement' => $requirement,
                'qualification' => $qualification,
            ];
        }

        return $this->failure('missing_qualification', $requirement, null);
    }

    /**
     * @param array<string, mixed> $requirement
     * @param array<string, mixed>|null $qualification
     * @return array<string, mixed>
     */
    private function failure(string $reasonCode, array $requirement, ?array $qualification): array
    {
        return [
            'ok' => false,
            'reason_code' => $reasonCode,
            'requirement' => $requirement,
            'qualification' => $qualification,
        ];
    }

    private function messageFor(string $reasonCode): string
    {
        return match ($reasonCode) {
            'missing_qualification' => 'Required qualification is missing.',
            'expired_qualification' => 'Required qualification is expired, suspended, revoked, or inactive.',
            'insufficient_proficiency' => 'Required qualification proficiency is below the configured minimum.',
            default => 'Workforce qualification gate blocked execution.',
        };
    }

    /**
     * @param array<string, mixed> $task
     * @param array<string, mixed> $evaluation
     */
    private function emitDecisionEvent(array $task, string $employeeId, array $evaluation): void
    {
        if ($this->eventBackbone === null) {
            return;
        }

        $queueId = (string)($task['queue_id'] ?? 'unknown');
        $status = (string)($evaluation['status'] ?? 'unknown');
        $this->eventBackbone->recordWorkExecutionEvent([
            'correlation_id' => (string)($task['correlation_id'] ?? 'qualification-' . $queueId),
            'request_id' => (string)($task['request_id'] ?? ''),
            'source_aggregate_type' => 'workforce_qualification_gate',
            'source_aggregate_id' => $queueId,
            'source_record_id' => $queueId,
            'wo_number' => $task['wo_number'] ?? null,
            'jo_number' => $task['jo_number'] ?? null,
            'operation_seq' => $task['operation_seq'] ?? null,
            'work_center_id' => $task['work_center_id'] ?? null,
            'actor_id' => $employeeId,
            'actor_role' => 'operator',
            'idempotency_key' => 'qualification-gate-' . $queueId . '-' . $employeeId . '-' . $status,
            'payload' => [
                'qualification_gate' => [
                    'action' => 'mobile_work_queue.start_task',
                    'outcome' => $status,
                    'reason_code' => $evaluation['reason_code'] ?? null,
                    'message' => $evaluation['message'] ?? null,
                ],
            ],
            'metadata' => [
                'requirements' => $evaluation['requirements'] ?? [],
                'failures' => $evaluation['failures'] ?? [],
            ],
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadList(string $relativePath): array
    {
        $path = rtrim($this->dataDir, '/') . '/' . ltrim($relativePath, '/');
        if (!is_file($path)) {
            return [];
        }
        $decoded = json_decode((string)file_get_contents($path), true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
    }
}

if (!class_exists('MOM\\Services\\WorkforceQualificationGateService', false)) {
    class_alias(WorkforceQualificationGateService::class, 'MOM\\Services\\WorkforceQualificationGateService');
}
