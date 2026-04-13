<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use DateTimeImmutable;
use DateTimeZone;
use MOM\Database\DataLayer;
use RuntimeException;

final class PlanningScenarioService
{
    private const STATES = ['draft', 'calculated', 'infeasible', 'approved', 'published', 'superseded', 'cancelled'];
    private const BLOCKER_CATEGORIES = [
        'capacity_overload',
        'capacity_missing',
        'quality_hold',
        'maintenance_window',
        'missing_qualification',
        'expired_qualification',
        'material_shortage',
        'active_revision_missing',
    ];
    private const SIGNAL_CATEGORIES = [
        'capacity_loss',
        'quality_hold',
        'maintenance_block',
        'material_shortage',
        'workforce_unqualified',
        'promise_risk',
    ];

    /** @var array<string, int> */
    private array $metrics = [
        'scenario_calculate' => 0,
        'scenario_infeasible' => 0,
        'scenario_approved' => 0,
        'scenario_published' => 0,
        'publish_block' => 0,
        'promise_risk' => 0,
        'replanning_signal' => 0,
        'capacity_loss' => 0,
        'quality_hold_block' => 0,
        'maintenance_block' => 0,
        'missing_qualification_block' => 0,
        'probe' => 0,
    ];

    private PlanningScenarioRepository $repository;

    public function __construct(
        private readonly string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?PlanningScenarioRepository $repository = null,
    ) {
        $this->repository = $repository ?? $this->defaultRepository();
    }

    /**
     * @return list<string>
     */
    public static function scenarioFilterFields(): array
    {
        return [
            'scenario_id',
            'scenario_key',
            'scenario_state',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
            'machine_id',
            'source_system',
            'source_record_id',
            'correlation_id',
            'request_id',
        ];
    }

    /**
     * @return list<string>
     */
    public static function signalFilterFields(): array
    {
        return [
            'signal_id',
            'scenario_id',
            'signal_category',
            'source_type',
            'source_id',
            'work_order_id',
            'wo_number',
            'job_number',
            'work_center_id',
            'machine_id',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'correlation_id',
            'request_id',
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function calculateScenario(array $input): array
    {
        $this->metrics['scenario_calculate']++;

        $scenario = $this->scenarioHeader($input);
        $demands = $this->normalizeDemand($input, $scenario);
        $capacity = $this->normalizeCapacity($input, $scenario);
        $qualityHolds = $this->normalizeQualityHolds($input);
        $qualificationAssertions = $this->normalizeQualificationAssertions($input);
        $materialAvailability = $this->normalizeMaterialAvailability($input);

        $blockers = [];
        $schedule = [];
        $capacityLoad = $this->initialCapacityLoad($capacity);

        foreach ($demands as $index => $operation) {
            $operationBlockers = [];
            $bucketKey = $this->bucketKeyForOperation($operation, $capacity);
            $bucket = $bucketKey !== null ? $capacity[$bucketKey] : null;

            if (trim((string)($operation['work_center_id'] ?? '')) === '') {
                $operationBlockers[] = $this->blocker($scenario, $operation, 'capacity_missing', 'work_center_missing', 'Operation has no work center for capacity planning.');
            } elseif ($bucket === null) {
                $operationBlockers[] = $this->blocker($scenario, $operation, 'capacity_missing', 'capacity_bucket_missing', 'No capacity bucket exists for the operation work center, machine, and planning date.');
            } else {
                $remaining = (int)$bucket['available_remaining_minutes'];
                $rawRemaining = (int)$bucket['raw_remaining_minutes'];
                $required = (int)$operation['required_minutes'];
                if ((int)$bucket['maintenance_blocked_minutes'] > 0 && $rawRemaining >= $required && $remaining < $required) {
                    $operationBlockers[] = $this->blocker($scenario, $operation, 'maintenance_window', 'maintenance_window', 'Maintenance or downtime removes enough capacity to block the operation.');
                    $this->metrics['maintenance_block']++;
                }
                if ($remaining < $required) {
                    $operationBlockers[] = $this->blocker($scenario, $operation, 'capacity_overload', 'capacity_overload', 'Required operation minutes exceed remaining finite capacity.');
                    $this->metrics['capacity_loss']++;
                }
            }

            $qualityHold = $this->matchingQualityHold($operation, $qualityHolds);
            if ($qualityHold !== null) {
                $operationBlockers[] = $this->blocker($scenario, $operation, 'quality_hold', 'quality_hold', 'Open quality hold blocks executable planning.', ['quality_hold' => $qualityHold]);
                $this->metrics['quality_hold_block']++;
            }

            $qualificationBlocker = $this->qualificationBlocker($scenario, $operation, $qualificationAssertions);
            if ($qualificationBlocker !== null) {
                $operationBlockers[] = $qualificationBlocker;
                $this->metrics['missing_qualification_block']++;
            }

            $materialBlocker = $this->materialBlocker($scenario, $operation, $materialAvailability);
            if ($materialBlocker !== null) {
                $operationBlockers[] = $materialBlocker;
            }

            if ($this->requiresActiveRevision($scenario, $operation) && trim((string)($operation['active_revision_id'] ?? '')) === '') {
                $operationBlockers[] = $this->blocker($scenario, $operation, 'active_revision_missing', 'active_revision_missing', 'No active controlled revision reference is available for this executable operation.');
            }

            foreach ($operationBlockers as $blocker) {
                $blockers[] = $blocker;
            }

            if ($operationBlockers === [] && $bucketKey !== null) {
                $slot = $this->scheduleOperation($operation, $capacity[$bucketKey], $index);
                $schedule[] = $slot;
                $capacity[$bucketKey]['scenario_allocated_minutes'] += (int)$operation['required_minutes'];
                $capacity[$bucketKey]['available_remaining_minutes'] -= (int)$operation['required_minutes'];
                $capacityLoad[$bucketKey] = $this->capacityLoadRow($capacity[$bucketKey]);
            } else {
                $schedule[] = $this->blockedScheduleRow($operation, $operationBlockers);
            }
        }

        $reasonCodes = $this->uniqueReasonCodes($blockers);
        $state = $blockers === [] ? 'calculated' : 'infeasible';
        if ($state === 'infeasible') {
            $this->metrics['scenario_infeasible']++;
            $this->metrics['promise_risk']++;
        }

        $scenario['scenario_state'] = $state;
        $scenario['constraints'] = [
            'constraint_model' => 'deterministic_finite_capacity.v1',
            'evaluated_constraints' => [
                'machine_work_center_capacity',
                'operation_routing_minutes',
                'labor_qualification_readiness',
                'maintenance_downtime_capacity',
                'quality_release_holds',
                'material_shortage',
                'active_revision_reference',
            ],
            'input_counts' => [
                'operations' => count($demands),
                'capacity_buckets' => count($capacity),
                'quality_holds' => count($qualityHolds),
                'qualification_assertions' => count($qualificationAssertions),
                'material_rows' => count($materialAvailability),
            ],
        ];
        $scenario['schedule'] = $schedule;
        $scenario['blockers'] = $blockers;
        $scenario['capacity_load'] = array_values($capacityLoad);
        $scenario['promise'] = [
            'feasible' => $blockers === [],
            'promise_date' => $blockers === [] ? $this->maxScheduleDate($schedule) : null,
            'promise_risk' => $blockers !== [],
            'reason_codes' => $reasonCodes,
            'explanation' => $blockers === []
                ? 'Finite-capacity scenario has no critical blockers.'
                : 'Finite-capacity scenario has blockers: ' . implode(', ', $reasonCodes),
        ];
        $scenario['metrics'] = [
            'operation_count' => count($demands),
            'scheduled_operation_count' => count(array_filter($schedule, fn(array $row): bool => (string)($row['schedule_state'] ?? '') === 'planned')),
            'blocker_count' => count($blockers),
            'total_required_minutes' => array_sum(array_map(fn(array $row): int => (int)($row['required_minutes'] ?? 0), $demands)),
        ];
        $scenario['calculated_at'] = gmdate(DATE_ATOM);
        $scenario['updated_at'] = gmdate(DATE_ATOM);

        return $this->repository->saveScenario($scenario);
    }

    /**
     * @return array<string, mixed>
     */
    public function scenarioDetail(string $scenarioIdOrKey): array
    {
        $scenario = $this->repository->findScenario($scenarioIdOrKey);
        if ($scenario === null) {
            throw new RuntimeException('planning_scenario_not_found');
        }

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'scenario' => $scenario,
            'feasibility' => $this->feasibility($scenarioIdOrKey),
            'capacity_load' => (array)($scenario['capacity_load'] ?? []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function feasibility(string $scenarioIdOrKey): array
    {
        $scenario = $this->repository->findScenario($scenarioIdOrKey);
        if ($scenario === null) {
            throw new RuntimeException('planning_scenario_not_found');
        }

        $blockers = is_array($scenario['blockers'] ?? null) ? $scenario['blockers'] : [];
        $reasonCounts = [];
        foreach ($blockers as $blocker) {
            if (!is_array($blocker)) {
                continue;
            }
            $reason = (string)($blocker['reason_code'] ?? 'unknown');
            $reasonCounts[$reason] = (int)($reasonCounts[$reason] ?? 0) + 1;
        }
        ksort($reasonCounts);

        return [
            'scenario_id' => (string)($scenario['scenario_id'] ?? ''),
            'scenario_state' => (string)($scenario['scenario_state'] ?? 'draft'),
            'publishable' => $blockers === [] && in_array((string)($scenario['scenario_state'] ?? ''), ['calculated', 'approved', 'published'], true),
            'promise' => is_array($scenario['promise'] ?? null) ? $scenario['promise'] : [],
            'blocker_count' => count($blockers),
            'reason_counts' => $reasonCounts,
            'blockers' => $blockers,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function capacityLoad(string $scenarioIdOrKey): array
    {
        $scenario = $this->repository->findScenario($scenarioIdOrKey);
        if ($scenario === null) {
            throw new RuntimeException('planning_scenario_not_found');
        }

        return [
            'scenario_id' => (string)($scenario['scenario_id'] ?? ''),
            'capacity_load' => is_array($scenario['capacity_load'] ?? null) ? $scenario['capacity_load'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function approveScenario(string $scenarioIdOrKey, array $context = []): array
    {
        $scenario = $this->repository->findScenario($scenarioIdOrKey);
        if ($scenario === null) {
            throw new RuntimeException('planning_scenario_not_found');
        }
        if ((string)($scenario['scenario_state'] ?? '') !== 'calculated' || count((array)($scenario['blockers'] ?? [])) > 0) {
            throw new RuntimeException('planning_scenario_not_approvable');
        }

        $scenario['scenario_state'] = 'approved';
        $scenario['approved_at'] = gmdate(DATE_ATOM);
        $scenario['approved_by'] = (string)($context['approved_by'] ?? $context['actor_id'] ?? 'planner');
        $scenario['updated_at'] = gmdate(DATE_ATOM);
        $this->metrics['scenario_approved']++;

        return $this->repository->saveScenario($scenario);
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function publishScenario(string $scenarioIdOrKey, array $context = []): array
    {
        $scenario = $this->repository->findScenario($scenarioIdOrKey);
        if ($scenario === null) {
            throw new RuntimeException('planning_scenario_not_found');
        }
        if ((string)($scenario['scenario_state'] ?? '') !== 'approved') {
            $this->metrics['publish_block']++;
            throw new RuntimeException('planning_scenario_not_approved');
        }
        if (count((array)($scenario['blockers'] ?? [])) > 0) {
            $this->metrics['publish_block']++;
            throw new RuntimeException('planning_scenario_publish_blocked');
        }

        $publishedAt = gmdate(DATE_ATOM);
        $scheduleId = $this->stableId('dispatch-schedule', [
            $scenario['scenario_id'] ?? '',
            $publishedAt,
            $context['published_by'] ?? $context['actor_id'] ?? 'planner',
        ]);
        $entries = [];
        foreach ((array)($scenario['schedule'] ?? []) as $row) {
            if (!is_array($row) || (string)($row['schedule_state'] ?? '') !== 'planned') {
                continue;
            }
            $entries[] = array_merge($row, [
                'dispatch_state' => 'ready',
                'quality_prerequisites_satisfied' => true,
                'published_schedule_id' => $scheduleId,
            ]);
        }

        $scenario['scenario_state'] = 'published';
        $scenario['published_at'] = $publishedAt;
        $scenario['published_by'] = (string)($context['published_by'] ?? $context['actor_id'] ?? 'planner');
        $scenario['published_schedule'] = [
            'published_schedule_id' => $scheduleId,
            'scenario_id' => (string)($scenario['scenario_id'] ?? ''),
            'published_at' => $publishedAt,
            'published_by' => $scenario['published_by'],
            'entry_count' => count($entries),
            'entries' => $entries,
            'provenance' => [
                'source_scenario_state' => 'approved',
                'scenario_version' => (int)($scenario['row_version'] ?? 0),
                'promise' => $scenario['promise'] ?? [],
            ],
        ];
        $scenario['updated_at'] = $publishedAt;
        $this->metrics['scenario_published']++;

        return $this->repository->saveScenario($scenario);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function dispatchReadiness(array $filters = []): array
    {
        $scenarios = isset($filters['scenario_id'])
            ? array_filter([$this->repository->findScenario((string)$filters['scenario_id'])])
            : $this->repository->listScenarios($filters);

        $ready = [];
        $blocked = [];
        foreach ($scenarios as $scenario) {
            if (!is_array($scenario)) {
                continue;
            }
            if ((string)($scenario['scenario_state'] ?? '') === 'published') {
                foreach ((array)($scenario['published_schedule']['entries'] ?? []) as $entry) {
                    if (is_array($entry)) {
                        $ready[] = $entry;
                    }
                }
                continue;
            }

            foreach ((array)($scenario['blockers'] ?? []) as $blocker) {
                if (is_array($blocker)) {
                    $blocked[] = $blocker;
                }
            }
        }

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'ready_count' => count($ready),
            'blocked_count' => count($blocked),
            'ready_dispatch' => $ready,
            'blocked_work' => $blocked,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function recordReplanningSignal(array $input): array
    {
        $signal = $this->normalizeReplanningSignal($input);
        $saved = $this->repository->saveReplanningSignal($signal);
        $this->metrics['replanning_signal']++;
        if (isset($this->metrics[$saved['signal_category'] ?? ''])) {
            $this->metrics[(string)$saved['signal_category']]++;
        }
        return $saved;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function replanningSignals(array $filters = []): array
    {
        $signals = $this->repository->listReplanningSignals($filters);
        $categoryCounts = [];
        foreach ($signals as $signal) {
            $category = (string)($signal['signal_category'] ?? 'unknown');
            $categoryCounts[$category] = (int)($categoryCounts[$category] ?? 0) + 1;
        }
        ksort($categoryCounts);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'signal_count' => count($signals),
            'category_counts' => $categoryCounts,
            'signals' => $signals,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        $this->metrics['probe']++;
        return array_merge($this->repository->probe(), [
            'slice' => 'planning_scenario',
            'state_model' => self::STATES,
            'constraint_categories' => self::BLOCKER_CATEGORIES,
            'replanning_signal_categories' => self::SIGNAL_CATEGORIES,
            'read_models' => [
                'scenario_detail',
                'promise_feasibility_explanation',
                'capacity_load_by_work_center_machine_period',
                'dispatch_readiness',
                'replanning_signal_summary',
            ],
            'metrics' => $this->metrics,
        ]);
    }

    /**
     * @return array<string, int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    private function defaultRepository(): PlanningScenarioRepository
    {
        if ($this->dataLayer !== null && $this->dataLayer->getMode() !== DataLayer::MODE_JSON_ONLY) {
            $connection = $this->dataLayer->getConnection();
            if ($connection !== null) {
                return new PostgresPlanningScenarioRepository($connection);
            }
        }
        return new FilePlanningScenarioRepository($this->dataDir);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function scenarioHeader(array $input): array
    {
        $scenarioKey = trim((string)($input['scenario_key'] ?? $input['scenario_name'] ?? ''));
        if ($scenarioKey === '') {
            $scenarioKey = 'planning-' . substr(hash('sha256', json_encode($input, JSON_UNESCAPED_SLASHES) ?: serialize($input)), 0, 16);
        }

        $scenarioId = trim((string)($input['scenario_id'] ?? ''));
        if ($scenarioId === '') {
            $scenarioId = $this->stableUuid($scenarioKey);
        }

        return array_merge($this->scopeFields($input), [
            'scenario_id' => $scenarioId,
            'scenario_key' => $scenarioKey,
            'scenario_name' => (string)($input['scenario_name'] ?? $scenarioKey),
            'scenario_state' => 'draft',
            'horizon_start' => $this->dateOnly((string)($input['horizon_start'] ?? $input['start_date'] ?? gmdate('Y-m-d'))),
            'horizon_days' => max(1, (int)($input['horizon_days'] ?? 1)),
            'require_active_revision' => $this->truthy($input['require_active_revision'] ?? false),
            'payload_schema_version' => 'planning_scenario.v1',
            'source_system' => (string)($input['source_system'] ?? 'mom_planning'),
            'source_record_id' => (string)($input['source_record_id'] ?? $scenarioKey),
            'created_by' => (string)($input['created_by'] ?? $input['calculated_by'] ?? 'planner'),
            'request_id' => (string)($input['request_id'] ?? ''),
            'correlation_id' => (string)($input['correlation_id'] ?? ''),
            'traceparent' => (string)($input['traceparent'] ?? ''),
            'metadata' => is_array($input['metadata'] ?? null) ? $input['metadata'] : [],
            'created_at' => gmdate(DATE_ATOM),
        ]);
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $scenario
     * @return list<array<string, mixed>>
     */
    private function normalizeDemand(array $input, array $scenario): array
    {
        $rows = $input['work_orders'] ?? $input['orders'] ?? $input['operations'] ?? [];
        $rows = is_array($rows) ? array_values($rows) : [];
        $demand = [];
        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }
            $workOrderId = trim((string)($row['work_order_id'] ?? $row['wo_number'] ?? $row['order_id'] ?? ''));
            if ($workOrderId === '') {
                $workOrderId = 'work-order-' . ($index + 1);
            }
            $operationSeq = trim((string)($row['operation_seq'] ?? $row['operation_number'] ?? $row['operation'] ?? '10'));
            $operationId = trim((string)($row['operation_id'] ?? ''));
            if ($operationId === '') {
                $operationId = $this->stableId('operation', [$workOrderId, $operationSeq]);
            }
            $setup = max(0, (int)($row['setup_time_minutes'] ?? $row['setup_minutes'] ?? 0));
            $run = max(0, (int)($row['run_time_minutes'] ?? $row['run_minutes'] ?? 0));
            $qty = max(1, (int)($row['quantity'] ?? $row['qty'] ?? 1));
            $cycle = max(0, (int)($row['cycle_time_minutes'] ?? $row['cycle_minutes'] ?? 0));
            $required = max(1, (int)($row['required_minutes'] ?? ($setup + ($run > 0 ? $run : ($qty * max(1, $cycle))))));

            $demand[] = array_merge($this->scopeFields(array_merge($scenario, $row)), [
                'operation_id' => $operationId,
                'work_order_id' => $workOrderId,
                'wo_number' => (string)($row['wo_number'] ?? $workOrderId),
                'job_number' => (string)($row['job_number'] ?? $row['jo_number'] ?? ''),
                'operation_seq' => $operationSeq,
                'work_center_id' => (string)($row['work_center_id'] ?? ''),
                'machine_id' => (string)($row['machine_id'] ?? $row['equipment_id'] ?? ''),
                'bucket_date' => $this->dateOnly((string)($row['bucket_date'] ?? $row['planned_date'] ?? $row['scheduled_date'] ?? $scenario['horizon_start'])),
                'required_minutes' => $required,
                'setup_time_minutes' => $setup,
                'run_time_minutes' => $run > 0 ? $run : $qty * max(1, $cycle),
                'quantity' => $qty,
                'operator_id' => (string)($row['operator_id'] ?? $row['employee_id'] ?? ''),
                'role_code' => (string)($row['role_code'] ?? ''),
                'required_qualification_type' => (string)($row['required_qualification_type'] ?? $row['qualification_type'] ?? ''),
                'required_qualification_code' => (string)($row['required_qualification_code'] ?? $row['qualification_code'] ?? ''),
                'active_revision_id' => (string)($row['active_revision_id'] ?? $row['revision_id'] ?? ''),
                'active_revision_version' => (string)($row['active_revision_version'] ?? $row['revision_version'] ?? ''),
                'requires_active_revision' => $this->truthy($row['requires_active_revision'] ?? $row['require_active_revision'] ?? false),
                'item_id' => (string)($row['item_id'] ?? ''),
                'part_number' => (string)($row['part_number'] ?? ''),
                'part_revision' => (string)($row['part_revision'] ?? ''),
                'priority' => (int)($row['priority'] ?? 50),
            ]);
        }

        usort($demand, static fn(array $left, array $right): int => [$left['priority'], $left['bucket_date'], $left['work_order_id']] <=> [$right['priority'], $right['bucket_date'], $right['work_order_id']]);
        return $demand;
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $scenario
     * @return array<string, array<string, mixed>>
     */
    private function normalizeCapacity(array $input, array $scenario): array
    {
        $rows = $input['capacity_buckets'] ?? $input['capacity'] ?? [];
        $rows = is_array($rows) ? array_values($rows) : [];
        $buckets = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $bucket = array_merge($this->scopeFields(array_merge($scenario, $row)), [
                'work_center_id' => (string)($row['work_center_id'] ?? ''),
                'machine_id' => (string)($row['machine_id'] ?? $row['equipment_id'] ?? ''),
                'bucket_date' => $this->dateOnly((string)($row['bucket_date'] ?? $row['date'] ?? $scenario['horizon_start'])),
                'available_minutes' => max(0, (int)($row['available_minutes'] ?? 0)),
                'allocated_minutes' => max(0, (int)($row['allocated_minutes'] ?? 0)),
                'maintenance_blocked_minutes' => max(0, (int)($row['maintenance_blocked_minutes'] ?? $row['downtime_minutes'] ?? 0)),
                'overtime_available_minutes' => max(0, (int)($row['overtime_available_minutes'] ?? 0)),
                'shift_start' => (string)($row['shift_start'] ?? '08:00'),
            ]);
            $bucket['raw_remaining_minutes'] = max(0, (int)$bucket['available_minutes'] + (int)$bucket['overtime_available_minutes'] - (int)$bucket['allocated_minutes']);
            $bucket['available_remaining_minutes'] = max(0, (int)$bucket['raw_remaining_minutes'] - (int)$bucket['maintenance_blocked_minutes']);
            $bucket['scenario_allocated_minutes'] = 0;
            $buckets[$this->bucketKey((string)$bucket['work_center_id'], (string)$bucket['machine_id'], (string)$bucket['bucket_date'])] = $bucket;
        }
        return $buckets;
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function normalizeQualityHolds(array $input): array
    {
        $rows = $input['quality_holds'] ?? $input['holds'] ?? $input['quality_blockers'] ?? [];
        $rows = is_array($rows) ? array_values($rows) : [];
        return array_values(array_filter(array_map(fn($row): ?array => is_array($row) ? $row : null, $rows)));
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function normalizeQualificationAssertions(array $input): array
    {
        $rows = $input['qualification_assertions'] ?? $input['training_assertions'] ?? [];
        $rows = is_array($rows) ? array_values($rows) : [];
        return array_values(array_filter(array_map(fn($row): ?array => is_array($row) ? $row : null, $rows)));
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function normalizeMaterialAvailability(array $input): array
    {
        $rows = $input['material_availability'] ?? $input['material_readiness'] ?? $input['materials'] ?? [];
        $rows = is_array($rows) ? array_values($rows) : [];
        return array_values(array_filter(array_map(fn($row): ?array => is_array($row) ? $row : null, $rows)));
    }

    /**
     * @param array<string, array<string, mixed>> $capacity
     */
    private function bucketKeyForOperation(array $operation, array $capacity): ?string
    {
        $date = (string)$operation['bucket_date'];
        $workCenter = (string)$operation['work_center_id'];
        $machine = (string)$operation['machine_id'];
        foreach ([
            $this->bucketKey($workCenter, $machine, $date),
            $this->bucketKey($workCenter, '', $date),
        ] as $candidate) {
            if (isset($capacity[$candidate])) {
                return $candidate;
            }
        }
        return null;
    }

    private function bucketKey(string $workCenterId, string $machineId, string $date): string
    {
        return $workCenterId . '|' . $machineId . '|' . $date;
    }

    /**
     * @param array<string, mixed> $scenario
     * @param array<string, mixed> $operation
     * @param array<string, mixed> $details
     * @return array<string, mixed>
     */
    private function blocker(array $scenario, array $operation, string $category, string $reasonCode, string $message, array $details = []): array
    {
        return [
            'blocker_id' => $this->stableId('planning-blocker', [
                $scenario['scenario_id'] ?? '',
                $operation['operation_id'] ?? '',
                $category,
                $reasonCode,
            ]),
            'category' => $category,
            'reason_code' => $reasonCode,
            'severity' => 'critical',
            'message' => $message,
            'work_order_id' => (string)($operation['work_order_id'] ?? ''),
            'wo_number' => (string)($operation['wo_number'] ?? ''),
            'job_number' => (string)($operation['job_number'] ?? ''),
            'operation_id' => (string)($operation['operation_id'] ?? ''),
            'operation_seq' => (string)($operation['operation_seq'] ?? ''),
            'work_center_id' => (string)($operation['work_center_id'] ?? ''),
            'machine_id' => (string)($operation['machine_id'] ?? ''),
            'details' => $details,
        ];
    }

    /**
     * @param list<array<string, mixed>> $qualityHolds
     * @return array<string, mixed>|null
     */
    private function matchingQualityHold(array $operation, array $qualityHolds): ?array
    {
        foreach ($qualityHolds as $hold) {
            $status = strtolower((string)($hold['hold_status'] ?? $hold['status'] ?? 'open'));
            if (in_array($status, ['closed', 'released', 'resolved', 'cancelled'], true)) {
                continue;
            }
            foreach (['work_order_id', 'wo_number', 'job_number'] as $field) {
                if (trim((string)($hold[$field] ?? '')) !== '' && (string)$hold[$field] === (string)($operation[$field] ?? '')) {
                    return $hold;
                }
            }
        }
        return null;
    }

    /**
     * @param list<array<string, mixed>> $assertions
     * @return array<string, mixed>|null
     */
    private function qualificationBlocker(array $scenario, array $operation, array $assertions): ?array
    {
        $requiredCode = trim((string)($operation['required_qualification_code'] ?? ''));
        if ($requiredCode === '') {
            return null;
        }
        $operatorId = trim((string)($operation['operator_id'] ?? ''));
        $requiredType = trim((string)($operation['required_qualification_type'] ?? ''));

        foreach ($assertions as $assertion) {
            $actor = trim((string)($assertion['employee_id'] ?? $assertion['actor_id'] ?? $assertion['operator_id'] ?? ''));
            if ($operatorId !== '' && $actor !== '' && $actor !== $operatorId) {
                continue;
            }
            if ((string)($assertion['qualification_code'] ?? '') !== $requiredCode) {
                continue;
            }
            if ($requiredType !== '' && trim((string)($assertion['qualification_type'] ?? '')) !== '' && (string)$assertion['qualification_type'] !== $requiredType) {
                continue;
            }
            $state = strtolower((string)($assertion['assertion_state'] ?? $assertion['status'] ?? 'active'));
            if (in_array($state, ['expired', 'revoked', 'superseded', 'inactive', 'blocked'], true)) {
                return $this->blocker($scenario, $operation, 'expired_qualification', 'expired_qualification', 'Required qualification assertion is not active.', ['qualification_assertion' => $assertion]);
            }
            $expiresAt = trim((string)($assertion['expires_at'] ?? ''));
            if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
                return $this->blocker($scenario, $operation, 'expired_qualification', 'expired_qualification', 'Required qualification assertion is expired.', ['qualification_assertion' => $assertion]);
            }
            return null;
        }

        return $this->blocker($scenario, $operation, 'missing_qualification', 'missing_qualification', 'Required operator qualification is missing.');
    }

    /**
     * @param list<array<string, mixed>> $materials
     * @return array<string, mixed>|null
     */
    private function materialBlocker(array $scenario, array $operation, array $materials): ?array
    {
        $itemId = trim((string)($operation['item_id'] ?? ''));
        $partNumber = trim((string)($operation['part_number'] ?? ''));
        if ($itemId === '' && $partNumber === '') {
            return null;
        }
        foreach ($materials as $material) {
            $match = ($itemId !== '' && (string)($material['item_id'] ?? '') === $itemId)
                || ($partNumber !== '' && (string)($material['part_number'] ?? '') === $partNumber);
            if (!$match) {
                continue;
            }
            $shortage = $this->truthy($material['shortage_flag'] ?? $material['material_shortage'] ?? false)
                || (array_key_exists('projected_available_balance', $material) && (float)$material['projected_available_balance'] < 0);
            if ($shortage) {
                return $this->blocker($scenario, $operation, 'material_shortage', 'material_shortage', 'Material availability projects a shortage for this operation.', ['material' => $material]);
            }
        }
        return null;
    }

    private function requiresActiveRevision(array $scenario, array $operation): bool
    {
        return $this->truthy($scenario['require_active_revision'] ?? false) || $this->truthy($operation['requires_active_revision'] ?? false);
    }

    /**
     * @param array<string, mixed> $operation
     * @param array<string, mixed> $bucket
     * @return array<string, mixed>
     */
    private function scheduleOperation(array $operation, array $bucket, int $sequence): array
    {
        $date = (string)$bucket['bucket_date'];
        $startTime = trim((string)($bucket['shift_start'] ?? '08:00'));
        $start = new DateTimeImmutable($date . 'T' . $startTime . ':00Z', new DateTimeZone('UTC'));
        $start = $start->modify('+' . ((int)$bucket['scenario_allocated_minutes']) . ' minutes');
        $end = $start->modify('+' . ((int)$operation['required_minutes']) . ' minutes');

        return [
            'schedule_state' => 'planned',
            'sequence' => $sequence + 1,
            'operation_id' => (string)$operation['operation_id'],
            'work_order_id' => (string)$operation['work_order_id'],
            'wo_number' => (string)$operation['wo_number'],
            'job_number' => (string)$operation['job_number'],
            'operation_seq' => (string)$operation['operation_seq'],
            'work_center_id' => (string)$operation['work_center_id'],
            'machine_id' => (string)$operation['machine_id'],
            'planned_start' => $start->format(DATE_ATOM),
            'planned_end' => $end->format(DATE_ATOM),
            'required_minutes' => (int)$operation['required_minutes'],
            'operator_id' => (string)$operation['operator_id'],
            'active_revision_id' => (string)$operation['active_revision_id'],
            'active_revision_version' => (string)$operation['active_revision_version'],
            'required_qualification_type' => (string)$operation['required_qualification_type'],
            'required_qualification_code' => (string)$operation['required_qualification_code'],
            'item_id' => (string)$operation['item_id'],
            'part_number' => (string)$operation['part_number'],
            'part_revision' => (string)$operation['part_revision'],
        ];
    }

    /**
     * @param list<array<string, mixed>> $blockers
     * @return array<string, mixed>
     */
    private function blockedScheduleRow(array $operation, array $blockers): array
    {
        return [
            'schedule_state' => 'blocked',
            'operation_id' => (string)$operation['operation_id'],
            'work_order_id' => (string)$operation['work_order_id'],
            'wo_number' => (string)$operation['wo_number'],
            'job_number' => (string)$operation['job_number'],
            'operation_seq' => (string)$operation['operation_seq'],
            'work_center_id' => (string)$operation['work_center_id'],
            'machine_id' => (string)$operation['machine_id'],
            'required_minutes' => (int)$operation['required_minutes'],
            'blocker_reason_codes' => $this->uniqueReasonCodes($blockers),
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $capacity
     * @return array<string, array<string, mixed>>
     */
    private function initialCapacityLoad(array $capacity): array
    {
        $load = [];
        foreach ($capacity as $key => $bucket) {
            $load[$key] = $this->capacityLoadRow($bucket);
        }
        return $load;
    }

    /**
     * @param array<string, mixed> $bucket
     * @return array<string, mixed>
     */
    private function capacityLoadRow(array $bucket): array
    {
        $available = max(1, (int)$bucket['available_minutes'] + (int)$bucket['overtime_available_minutes'] - (int)$bucket['maintenance_blocked_minutes']);
        $used = (int)$bucket['allocated_minutes'] + (int)$bucket['scenario_allocated_minutes'];
        return [
            'work_center_id' => (string)$bucket['work_center_id'],
            'machine_id' => (string)$bucket['machine_id'],
            'bucket_date' => (string)$bucket['bucket_date'],
            'available_minutes' => (int)$bucket['available_minutes'],
            'overtime_available_minutes' => (int)$bucket['overtime_available_minutes'],
            'maintenance_blocked_minutes' => (int)$bucket['maintenance_blocked_minutes'],
            'preallocated_minutes' => (int)$bucket['allocated_minutes'],
            'scenario_allocated_minutes' => (int)$bucket['scenario_allocated_minutes'],
            'remaining_minutes' => max(0, (int)$bucket['available_remaining_minutes']),
            'load_pct' => round(($used / $available) * 100, 2),
        ];
    }

    /**
     * @param list<array<string, mixed>> $schedule
     */
    private function maxScheduleDate(array $schedule): ?string
    {
        $max = null;
        foreach ($schedule as $row) {
            $end = trim((string)($row['planned_end'] ?? ''));
            if ($end !== '' && ($max === null || strcmp($end, $max) > 0)) {
                $max = $end;
            }
        }
        return $max !== null ? substr($max, 0, 10) : null;
    }

    /**
     * @param list<array<string, mixed>> $blockers
     * @return list<string>
     */
    private function uniqueReasonCodes(array $blockers): array
    {
        $codes = [];
        foreach ($blockers as $blocker) {
            if (is_array($blocker)) {
                $code = (string)($blocker['reason_code'] ?? '');
                if ($code !== '') {
                    $codes[$code] = true;
                }
            }
        }
        $codes = array_keys($codes);
        sort($codes);
        return $codes;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeReplanningSignal(array $input): array
    {
        $scenarioId = trim((string)($input['scenario_id'] ?? ''));
        if ($scenarioId === '') {
            throw new RuntimeException('missing_replanning_signal_scenario_id');
        }

        $category = $this->normalizeSignalCategory($input);
        $signalId = trim((string)($input['signal_id'] ?? ''));
        if ($signalId === '') {
            $signalId = $this->stableId('replanning-signal', [
                $scenarioId,
                $category,
                $input['source_type'] ?? '',
                $input['source_id'] ?? '',
                $input['work_order_id'] ?? $input['wo_number'] ?? '',
            ]);
        }

        return array_merge($this->scopeFields($input), [
            'signal_id' => $signalId,
            'scenario_id' => $scenarioId,
            'signal_category' => $category,
            'source_type' => (string)($input['source_type'] ?? 'runtime_condition'),
            'source_id' => (string)($input['source_id'] ?? ''),
            'work_order_id' => (string)($input['work_order_id'] ?? $input['wo_number'] ?? ''),
            'wo_number' => (string)($input['wo_number'] ?? $input['work_order_id'] ?? ''),
            'job_number' => (string)($input['job_number'] ?? $input['jo_number'] ?? ''),
            'work_center_id' => (string)($input['work_center_id'] ?? ''),
            'machine_id' => (string)($input['machine_id'] ?? $input['equipment_id'] ?? ''),
            'impact_payload' => is_array($input['impact_payload'] ?? null) ? $input['impact_payload'] : $input,
            'status' => (string)($input['status'] ?? 'open'),
            'request_id' => (string)($input['request_id'] ?? ''),
            'correlation_id' => (string)($input['correlation_id'] ?? ''),
            'traceparent' => (string)($input['traceparent'] ?? ''),
            'created_at' => gmdate(DATE_ATOM),
            'updated_at' => gmdate(DATE_ATOM),
        ]);
    }

    private function normalizeSignalCategory(array $input): string
    {
        $raw = strtolower(trim((string)($input['signal_category'] ?? $input['category'] ?? '')));
        $source = strtolower(trim((string)($input['source_type'] ?? '')));
        $reason = strtolower(trim((string)($input['reason_code'] ?? '')));
        $basis = $raw !== '' ? $raw : $source . ' ' . $reason;

        return match (true) {
            str_contains($basis, 'quality') || str_contains($basis, 'ncr') || str_contains($basis, 'capa') => 'quality_hold',
            str_contains($basis, 'maintenance') || str_contains($basis, 'downtime') => 'maintenance_block',
            str_contains($basis, 'material') || str_contains($basis, 'shortage') => 'material_shortage',
            str_contains($basis, 'qualification') || str_contains($basis, 'training') || str_contains($basis, 'workforce') => 'workforce_unqualified',
            str_contains($basis, 'promise') || str_contains($basis, 'late') || str_contains($basis, 'risk') => 'promise_risk',
            default => in_array($raw, self::SIGNAL_CATEGORIES, true) ? $raw : 'capacity_loss',
        };
    }

    /**
     * @param array<string, mixed> $source
     * @return array<string, string>
     */
    private function scopeFields(array $source): array
    {
        return [
            'enterprise_id' => (string)($source['enterprise_id'] ?? ''),
            'company_id' => (string)($source['company_id'] ?? ''),
            'site_id' => (string)($source['site_id'] ?? ''),
            'plant_id' => (string)($source['plant_id'] ?? ''),
            'org_company_code' => (string)($source['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($source['org_legal_entity_code'] ?? ''),
            'org_plant_id' => (string)($source['org_plant_id'] ?? ''),
            'org_site_id' => (string)($source['org_site_id'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function publicFilters(array $filters): array
    {
        $public = [];
        foreach (array_unique(array_merge(self::scenarioFilterFields(), self::signalFilterFields())) as $field) {
            if (array_key_exists($field, $filters) && $filters[$field] !== null && $filters[$field] !== '') {
                $public[$field] = $filters[$field];
            }
        }
        return $public;
    }

    private function dateOnly(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return gmdate('Y-m-d');
        }
        $ts = strtotime($value);
        return $ts !== false ? gmdate('Y-m-d', $ts) : gmdate('Y-m-d');
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int)$value === 1;
        }
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'y', 'active', 'required'], true);
    }

    /**
     * @param list<mixed> $parts
     */
    private function stableId(string $prefix, array $parts): string
    {
        return $prefix . '-' . substr(hash('sha256', implode('|', array_map(static fn(mixed $part): string => (string)$part, $parts))), 0, 24);
    }

    private function stableUuid(string $basis): string
    {
        $hash = md5($basis);
        return sprintf(
            '%s-%s-4%s-%s%s-%s',
            substr($hash, 0, 8),
            substr($hash, 8, 4),
            substr($hash, 13, 3),
            dechex((hexdec($hash[16]) & 0x3) | 0x8),
            substr($hash, 17, 3),
            substr($hash, 20, 12),
        );
    }
}

if (!class_exists('MOM\\Services\\PlanningScenarioService', false)) {
    class_alias(PlanningScenarioService::class, 'MOM\\Services\\PlanningScenarioService');
}
