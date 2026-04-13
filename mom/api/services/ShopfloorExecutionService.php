<?php

declare(strict_types=1);

namespace MOM\Services;

use InvalidArgumentException;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * Phase 1 shopfloor execution normalizer.
 *
 * Dispatch targets and production logs remain the operational write path. This
 * service keeps the controller thin enough to preserve legacy compatibility
 * while adding strict CNC execution validation, normalized reason codes, and a
 * deterministic projection for later analytics/AI consumers.
 */
final class ShopfloorExecutionService
{
    /** @var list<string> */
    private const SHIFT_CODES = ['morning', 'afternoon', 'night'];

    /** @var list<string> */
    private const TARGET_STATUSES = ['planned', 'dispatched', 'in_progress', 'completed', 'cancelled'];

    /** @var list<string> */
    private const ISSUE_SEVERITIES = ['minor', 'major', 'critical'];

    private readonly string $dataDir;
    private ?ManufacturingEventBackboneService $eventBackbone;

    public function __construct(
        string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?ManufacturingEventBackboneService $eventBackbone = null,
    ) {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->eventBackbone = $eventBackbone;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function normalizeTargetForCreate(array $body, string $userId, string $now): array
    {
        $machineId = $this->requiredString($body['machine_id'] ?? $body['equipment_id'] ?? null, 'missing_machine_id');
        $equipmentId = $this->stringValue($body['equipment_id'] ?? '');
        if ($equipmentId === '') {
            $equipmentId = $machineId;
        }
        $itemId = $this->stringValue($body['item_id'] ?? $body['part_number'] ?? '');
        $partNumber = $this->stringValue($body['part_number'] ?? $itemId);
        $shiftCode = $this->normalizeShiftCode($body['shift_code'] ?? 'morning');

        $target = [
            'target_id' => 'TGT-' . bin2hex(random_bytes(8)),
            'wo_number' => $this->requiredString($body['wo_number'] ?? null, 'missing_wo_number'),
            'jo_number' => $this->stringValue($body['jo_number'] ?? ''),
            'item_id' => $itemId,
            'part_number' => $partNumber,
            'part_revision' => $this->stringValue($body['part_revision'] ?? $body['revision'] ?? ''),
            'item_description' => $this->stringValue($body['item_description'] ?? $body['part_description'] ?? ''),
            'operation_seq' => $this->nullablePositiveInt($body['operation_seq'] ?? null, 'operation_seq'),
            'operation_id' => $this->stringValue($body['operation_id'] ?? ''),
            'operation_name' => $this->stringValue($body['operation_name'] ?? $body['operation'] ?? ''),
            'machine_id' => $machineId,
            'equipment_id' => $equipmentId,
            'work_center_id' => $this->stringValue($body['work_center_id'] ?? ''),
            'operator_id' => $this->stringValue($body['operator_id'] ?? ''),
            'shift_date' => $this->normalizeDate($body['shift_date'] ?? null, 'shift_date'),
            'shift_code' => $shiftCode,
            'cycle_time_minutes' => $this->nonNegativeFloat($body['cycle_time_minutes'] ?? 0, 'cycle_time_minutes'),
            'setup_time_minutes' => $this->nonNegativeFloat($body['setup_time_minutes'] ?? 0, 'setup_time_minutes'),
            'standard_setup_minutes' => $this->nonNegativeFloat(
                $body['standard_setup_minutes'] ?? $body['setup_time_minutes'] ?? 0,
                'standard_setup_minutes',
            ),
            'standard_run_minutes' => $this->nonNegativeFloat($body['standard_run_minutes'] ?? 0, 'standard_run_minutes'),
            'expected_run_minutes' => $this->nonNegativeFloat($body['expected_run_minutes'] ?? 0, 'expected_run_minutes'),
            'shift_duration_minutes' => $this->positiveFloat($body['shift_duration_minutes'] ?? 480, 'shift_duration_minutes'),
            'target_quantity' => $this->positiveInt($body['target_quantity'] ?? 0, 'target_quantity'),
            'priority' => $this->nonNegativeInt($body['priority'] ?? 50, 'priority'),
            'dispatch_sequence' => $this->positiveInt($body['dispatch_sequence'] ?? 1, 'dispatch_sequence'),
            'cnc_program_id' => $this->stringValue($body['cnc_program_id'] ?? $body['program_id'] ?? ''),
            'cnc_program_revision' => $this->stringValue($body['cnc_program_revision'] ?? $body['program_revision'] ?? ''),
            'setup_sheet_id' => $this->stringValue($body['setup_sheet_id'] ?? ''),
            'due_at' => $this->optionalTimestampString($body['due_at'] ?? null, 'due_at'),
            'status' => 'planned',
            'notes' => $this->stringValue($body['notes'] ?? ''),
            'metadata' => is_array($body['metadata'] ?? null) ? (array)$body['metadata'] : new \stdClass(),
            'created_by' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        return $this->finalizeTarget($target);
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $updates
     * @return array<string, mixed>
     */
    public function applyTargetUpdates(array $target, array $updates, string $now): array
    {
        $machineProvided = array_key_exists('machine_id', $updates);
        $equipmentProvided = array_key_exists('equipment_id', $updates);
        $editable = [
            'operator_id',
            'cycle_time_minutes',
            'setup_time_minutes',
            'standard_setup_minutes',
            'standard_run_minutes',
            'expected_run_minutes',
            'shift_duration_minutes',
            'target_quantity',
            'priority',
            'dispatch_sequence',
            'shift_code',
            'notes',
            'machine_id',
            'equipment_id',
            'work_center_id',
            'item_id',
            'part_number',
            'part_revision',
            'item_description',
            'operation_seq',
            'operation_id',
            'operation_name',
            'cnc_program_id',
            'cnc_program_revision',
            'setup_sheet_id',
            'due_at',
            'metadata',
        ];

        foreach ($editable as $field) {
            if (array_key_exists($field, $updates)) {
                $target[$field] = $updates[$field];
            }
        }
        if (array_key_exists('program_id', $updates)) {
            $target['cnc_program_id'] = $updates['program_id'];
        }
        if (array_key_exists('program_revision', $updates)) {
            $target['cnc_program_revision'] = $updates['program_revision'];
        }
        if (array_key_exists('revision', $updates)) {
            $target['part_revision'] = $updates['revision'];
        }
        if (array_key_exists('part_description', $updates)) {
            $target['item_description'] = $updates['part_description'];
        }
        if (array_key_exists('operation', $updates)) {
            $target['operation_name'] = $updates['operation'];
        }
        if ($machineProvided && !$equipmentProvided) {
            $target['equipment_id'] = $target['machine_id'] ?? '';
        }
        if ($equipmentProvided && !$machineProvided) {
            $target['machine_id'] = $target['equipment_id'] ?? '';
        }

        $target['machine_id'] = $this->requiredString($target['machine_id'] ?? $target['equipment_id'] ?? null, 'missing_machine_id');
        $target['equipment_id'] = $this->stringValue($target['equipment_id'] ?? '');
        if ($target['equipment_id'] === '') {
            $target['equipment_id'] = $target['machine_id'];
        }
        $target['wo_number'] = $this->requiredString($target['wo_number'] ?? null, 'missing_wo_number');
        $target['shift_date'] = $this->normalizeDate($target['shift_date'] ?? null, 'shift_date');
        $target['shift_code'] = $this->normalizeShiftCode($target['shift_code'] ?? 'morning');
        $target['operation_seq'] = $this->nullablePositiveInt($target['operation_seq'] ?? null, 'operation_seq');
        $target['cycle_time_minutes'] = $this->nonNegativeFloat($target['cycle_time_minutes'] ?? 0, 'cycle_time_minutes');
        $target['setup_time_minutes'] = $this->nonNegativeFloat($target['setup_time_minutes'] ?? 0, 'setup_time_minutes');
        $defaultSetupMinutes = $target['setup_time_minutes'];
        $target['standard_setup_minutes'] = $this->nonNegativeFloat($target['standard_setup_minutes'] ?? $defaultSetupMinutes, 'standard_setup_minutes');
        $target['standard_run_minutes'] = $this->nonNegativeFloat($target['standard_run_minutes'] ?? 0, 'standard_run_minutes');
        $target['expected_run_minutes'] = $this->nonNegativeFloat($target['expected_run_minutes'] ?? 0, 'expected_run_minutes');
        $target['shift_duration_minutes'] = $this->positiveFloat($target['shift_duration_minutes'] ?? 480, 'shift_duration_minutes');
        $target['target_quantity'] = $this->positiveInt($target['target_quantity'] ?? 0, 'target_quantity');
        $target['priority'] = $this->nonNegativeInt($target['priority'] ?? 50, 'priority');
        $target['dispatch_sequence'] = $this->positiveInt($target['dispatch_sequence'] ?? 1, 'dispatch_sequence');
        $target['due_at'] = $this->optionalTimestampString($target['due_at'] ?? null, 'due_at');
        $target['metadata'] = is_array($target['metadata'] ?? null) ? (array)$target['metadata'] : new \stdClass();
        $target['updated_at'] = $now;

        return $this->finalizeTarget($target);
    }

    /**
     * @param array<string, mixed> $target
     */
    public function assertReportActorCanSubmit(array $target, string $actorId, bool $hasPlannerOverride): void
    {
        $assignedOperator = $this->stringValue($target['operator_id'] ?? '');
        if ($assignedOperator !== '' && $assignedOperator !== $actorId && !$hasPlannerOverride) {
            throw new RuntimeException('forbidden_operator_assignment');
        }
    }

    /**
     * @param array<string, mixed>      $body
     * @param array<string, mixed>      $target
     * @param array<string, mixed>|null $existingLog
     * @return array<string, mixed>
     */
    public function buildProductionLog(array $body, array $target, ?array $existingLog, string $operatorId, string $now): array
    {
        if (($target['status'] ?? '') === 'cancelled') {
            throw new InvalidArgumentException('target_cancelled');
        }

        $quantityGood = $this->nonNegativeInt($body['quantity_good'] ?? 0, 'quantity_good');
        $quantityNg = $this->nonNegativeInt($body['quantity_ng'] ?? 0, 'quantity_ng');
        $quantityRework = $this->nonNegativeInt($body['quantity_rework'] ?? 0, 'quantity_rework');

        $actualSetup = $this->nonNegativeFloat($body['actual_setup_minutes'] ?? 0, 'actual_setup_minutes');
        $actualRun = $this->nonNegativeFloat($body['actual_run_minutes'] ?? 0, 'actual_run_minutes');
        $idleProvided = array_key_exists('actual_idle_minutes', $body);
        $actualIdle = $this->nonNegativeFloat($body['actual_idle_minutes'] ?? 0, 'actual_idle_minutes');

        $reasonPayload = $this->normalizeReasonPayload($body, $quantityNg, $quantityRework, $actualIdle, $idleProvided);
        if (!$idleProvided && ($reasonPayload['downtime_minutes'] ?? 0.0) > 0.0) {
            $actualIdle = (float)$reasonPayload['downtime_minutes'];
        }
        if ($idleProvided && ((float)$reasonPayload['downtime_minutes']) > ($actualIdle + 0.01)) {
            throw new InvalidArgumentException('downtime_minutes_exceed_idle_minutes');
        }

        $actualStart = $this->optionalTimestampString($body['actual_start'] ?? $target['started_at'] ?? $now, 'actual_start');
        $actualEnd = $this->optionalTimestampString($body['actual_end'] ?? '', 'actual_end');
        $this->assertTimestampOrder($actualStart, $actualEnd);

        $notes = $this->stringValue($body['notes'] ?? '');
        $issuesText = $this->stringValue($body['issues_encountered'] ?? $body['issue_notes'] ?? '');
        $quantityTotal = $quantityGood + $quantityNg + $quantityRework;
        $totalActualMinutes = $actualSetup + $actualRun + $actualIdle;
        if ($quantityTotal === 0 && $totalActualMinutes <= 0.0 && $notes === '' && $issuesText === '' && $reasonPayload['has_issue_context'] === false) {
            throw new InvalidArgumentException('empty_production_report');
        }

        $targetQuantity = $this->nonNegativeInt($target['target_quantity'] ?? 0, 'target_quantity');
        $achievementPct = $targetQuantity > 0 ? round(($quantityGood / $targetQuantity) * 100, 1) : 0.0;
        $ngRatePct = $quantityTotal > 0 ? round(($quantityNg / $quantityTotal) * 100, 1) : 0.0;
        $reworkRatePct = $quantityTotal > 0 ? round(($quantityRework / $quantityTotal) * 100, 1) : 0.0;

        $actualCycleTimeAvg = null;
        if ($quantityTotal > 0 && $actualRun > 0.0) {
            $actualCycleTimeAvg = round($actualRun / $quantityTotal, 2);
        }

        $log = [
            'log_id' => is_array($existingLog) ? (string)($existingLog['log_id'] ?? '') : '',
            'target_id' => (string)($target['target_id'] ?? ''),
            'wo_number' => (string)($target['wo_number'] ?? ''),
            'jo_number' => (string)($target['jo_number'] ?? ''),
            'item_id' => (string)($target['item_id'] ?? ''),
            'part_number' => (string)($target['part_number'] ?? $target['item_id'] ?? ''),
            'part_revision' => (string)($target['part_revision'] ?? ''),
            'operation_seq' => $target['operation_seq'] ?? null,
            'operation_id' => (string)($target['operation_id'] ?? ''),
            'operation_name' => (string)($target['operation_name'] ?? ''),
            'machine_id' => (string)($target['machine_id'] ?? ''),
            'equipment_id' => (string)($target['equipment_id'] ?? $target['machine_id'] ?? ''),
            'work_center_id' => (string)($target['work_center_id'] ?? ''),
            'operator_id' => $operatorId,
            'shift_date' => (string)($target['shift_date'] ?? ''),
            'shift_code' => (string)($target['shift_code'] ?? ''),
            'cnc_program_id' => (string)($target['cnc_program_id'] ?? ''),
            'cnc_program_revision' => (string)($target['cnc_program_revision'] ?? ''),
            'setup_sheet_id' => (string)($target['setup_sheet_id'] ?? ''),
            'quantity_good' => $quantityGood,
            'quantity_ng' => $quantityNg,
            'quantity_rework' => $quantityRework,
            'target_quantity' => $targetQuantity,
            'actual_start' => $actualStart,
            'actual_end' => $actualEnd,
            'actual_setup_minutes' => $actualSetup,
            'actual_run_minutes' => $actualRun,
            'actual_idle_minutes' => $actualIdle,
            'actual_cycle_time_avg' => $actualCycleTimeAvg,
            'reason_codes' => $reasonPayload['reason_codes'],
            'downtime_events' => $reasonPayload['downtime_events'],
            'ng_details' => $reasonPayload['ng_details'],
            'rework_details' => $reasonPayload['rework_details'],
            'blocking_issues' => $reasonPayload['blocking_issues'],
            'notes' => $notes,
            'issues_encountered' => $issuesText,
            'offline_created' => (bool)($body['offline_created'] ?? false),
            'sync_status' => 'synced',
            'device_id' => $this->stringValue($body['device_id'] ?? ''),
            'client_report_id' => $this->stringValue($body['client_report_id'] ?? ''),
            'idempotency_key' => $this->stringValue($body['idempotency_key'] ?? ''),
            'source_schema_version' => 'phase1_shopfloor_execution.v1',
            'updated_at' => $now,
            'quantity_total' => $quantityTotal,
            'achievement_pct' => $achievementPct,
            'ng_rate_pct' => $ngRatePct,
            'rework_rate_pct' => $reworkRatePct,
        ];

        if ($log['log_id'] === '') {
            $log['log_id'] = 'LOG-' . bin2hex(random_bytes(8));
        }
        $log['created_at'] = is_array($existingLog) ? (string)($existingLog['created_at'] ?? $now) : $now;
        $log['advisory_projection'] = $this->buildAdvisoryProjection($log, $target);

        return $log;
    }

    public function normalizeDateFilter(mixed $value, string $field = 'date'): string
    {
        return $this->normalizeDate($value, $field);
    }

    public function normalizeOptionalShiftCode(mixed $value): ?string
    {
        if ($this->stringValue($value) === '') {
            return null;
        }

        return $this->normalizeShiftCode($value);
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed>|null $log
     * @return array<string, mixed>
     */
    public function operatorTaskCard(array $target, ?array $log): array
    {
        return [
            'target_id' => (string)($target['target_id'] ?? ''),
            'status' => (string)($target['status'] ?? ''),
            'shift_date' => (string)($target['shift_date'] ?? ''),
            'shift_code' => (string)($target['shift_code'] ?? ''),
            'sequence' => (int)($target['dispatch_sequence'] ?? 99),
            'priority' => (int)($target['priority'] ?? 50),
            'machine_id' => (string)($target['machine_id'] ?? ''),
            'equipment_id' => (string)($target['equipment_id'] ?? $target['machine_id'] ?? ''),
            'work_center_id' => (string)($target['work_center_id'] ?? ''),
            'wo_number' => (string)($target['wo_number'] ?? ''),
            'jo_number' => (string)($target['jo_number'] ?? ''),
            'part_number' => (string)($target['part_number'] ?? $target['item_id'] ?? ''),
            'part_revision' => (string)($target['part_revision'] ?? ''),
            'operation_seq' => $target['operation_seq'] ?? null,
            'operation_name' => (string)($target['operation_name'] ?? ''),
            'target_quantity' => (int)($target['target_quantity'] ?? 0),
            'quantity_good_reported' => (int)($log['quantity_good'] ?? 0),
            'quantity_ng_reported' => (int)($log['quantity_ng'] ?? 0),
            'quantity_rework_reported' => (int)($log['quantity_rework'] ?? 0),
            'achievement_pct' => (float)($log['achievement_pct'] ?? 0),
            'cnc_program_id' => (string)($target['cnc_program_id'] ?? ''),
            'setup_sheet_id' => (string)($target['setup_sheet_id'] ?? ''),
            'notes' => (string)($target['notes'] ?? ''),
        ];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public function activeReasonCatalog(): array
    {
        $master = $this->masterData();

        return [
            'downtime' => $this->activeRows((array)($master['downtime_reason_codes'] ?? []), 'reason_code'),
            'downtime_resolution' => $this->activeRows((array)($master['downtime_resolution_codes'] ?? []), 'resolution_code'),
            'ng' => $this->activeRows((array)($master['defect_catalog'] ?? []), 'defect_code'),
            'rework' => $this->activeRows((array)($master['defect_catalog'] ?? []), 'defect_code'),
            'blocking' => $this->activeRows((array)($master['downtime_reason_codes'] ?? []), 'reason_code'),
        ];
    }

    /**
     * @param array<string, mixed> $log
     * @param array<string, mixed> $target
     */
    public function appendProductionReportEvent(array $log, array $target, string $actorId): void
    {
        try {
            $idempotencyKey = (string)($log['idempotency_key'] ?? '');
            if ($idempotencyKey === '') {
                $idempotencyKey = 'dispatch-report:' . (string)($log['log_id'] ?? '') . ':' . (string)($log['updated_at'] ?? '');
            }
            $occurredAt = (string)($log['actual_end'] ?? '');
            if ($occurredAt === '') {
                $occurredAt = (string)($log['updated_at'] ?? gmdate(DATE_ATOM));
            }

            $this->events()->recordWorkExecutionEvent([
                'correlation_id' => (string)($log['target_id'] ?? $log['wo_number'] ?? ''),
                'request_id' => (string)($log['client_report_id'] ?? ''),
                'source_record_id' => (string)($log['log_id'] ?? ''),
                'source_event_id' => (string)($log['log_id'] ?? ''),
                'wo_number' => (string)($log['wo_number'] ?? ''),
                'jo_number' => (string)($log['jo_number'] ?? ''),
                'operation_seq' => (string)($log['operation_seq'] ?? ''),
                'part_number' => (string)($log['part_number'] ?? ''),
                'part_revision' => (string)($log['part_revision'] ?? ''),
                'work_center_id' => (string)($log['work_center_id'] ?? ''),
                'actor_id' => $actorId,
                'actor_role' => 'shopfloor_operator',
                'occurred_at' => $occurredAt,
                'idempotency_key' => $idempotencyKey,
                'payload' => [
                    'phase' => 'manual_shift_report',
                    'target' => [
                        'target_id' => (string)($target['target_id'] ?? ''),
                        'machine_id' => (string)($target['machine_id'] ?? ''),
                        'shift_date' => (string)($target['shift_date'] ?? ''),
                        'shift_code' => (string)($target['shift_code'] ?? ''),
                    ],
                    'production_log' => $log,
                    'projection_only' => true,
                ],
                'metadata' => [
                    'source_controller' => 'DispatchController',
                    'source_store' => 'dispatch/production_logs.json',
                    'ot_boundary' => 'manual_capture_no_machine_control',
                ],
            ]);
        } catch (Throwable $e) {
            @error_log('[ShopfloorExecutionService] manufacturing event projection failed: ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function finalizeTarget(array $target): array
    {
        $status = strtolower($this->stringValue($target['status'] ?? 'planned'));
        if (!in_array($status, self::TARGET_STATUSES, true)) {
            throw new InvalidArgumentException('invalid_target_status');
        }
        $target['status'] = $status;

        if ((float)($target['setup_time_minutes'] ?? 0) > (float)($target['shift_duration_minutes'] ?? 0)) {
            throw new InvalidArgumentException('setup_time_exceeds_shift_duration');
        }

        if (($target['part_number'] ?? '') === '' && ($target['item_id'] ?? '') !== '') {
            $target['part_number'] = (string)$target['item_id'];
        }
        if (($target['item_id'] ?? '') === '' && ($target['part_number'] ?? '') !== '') {
            $target['item_id'] = (string)$target['part_number'];
        }

        return $target;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function normalizeReasonPayload(array $body, int $quantityNg, int $quantityRework, float $actualIdle, bool $idleProvided): array
    {
        $catalog = $this->activeReasonCatalog();
        $downtimeEvents = $this->normalizeDowntimeEvents($body['downtime_events'] ?? []);
        $ngDetails = $this->normalizeDefectDetails($body['ng_details'] ?? [], 'ng_details');
        $reworkDetails = $this->normalizeDefectDetails($body['rework_details'] ?? [], 'rework_details');
        $blockingIssues = $this->normalizeBlockingIssues($body['blocking_issues'] ?? []);

        $downtimeCodes = array_merge(
            $this->normalizeCodeList($body['downtime_reason_codes'] ?? []),
            $this->normalizeCodeList($body['downtime_reason_code'] ?? []),
            array_values(array_filter(array_map(static fn(array $row): string => (string)($row['reason_code'] ?? ''), $downtimeEvents))),
        );
        $ngCodes = array_merge(
            $this->normalizeCodeList($body['ng_reason_codes'] ?? []),
            array_values(array_filter(array_map(static fn(array $row): string => (string)($row['defect_code'] ?? ''), $ngDetails))),
        );
        $reworkCodes = array_merge(
            $this->normalizeCodeList($body['rework_reason_codes'] ?? []),
            array_values(array_filter(array_map(static fn(array $row): string => (string)($row['defect_code'] ?? ''), $reworkDetails))),
        );
        $blockingCodes = array_merge(
            $this->normalizeCodeList($body['blocking_reason_codes'] ?? []),
            array_values(array_filter(array_map(static fn(array $row): string => (string)($row['reason_code'] ?? ''), $blockingIssues))),
        );

        $downtimeCodes = $this->uniqueCodes($downtimeCodes);
        $ngCodes = $this->uniqueCodes($ngCodes);
        $reworkCodes = $this->uniqueCodes($reworkCodes);
        $blockingCodes = $this->uniqueCodes($blockingCodes);

        $this->assertCodesKnown($downtimeCodes, $catalog['downtime'], 'unknown_downtime_reason_code', 'reason_code');
        $this->assertCodesKnown($ngCodes, $catalog['ng'], 'unknown_ng_reason_code', 'defect_code');
        $this->assertCodesKnown($reworkCodes, $catalog['rework'], 'unknown_rework_reason_code', 'defect_code');
        $this->assertCodesKnown($blockingCodes, $catalog['blocking'], 'unknown_blocking_reason_code', 'reason_code');
        $this->assertResolutionCodesKnown($downtimeEvents, $catalog['downtime_resolution']);

        if ($quantityNg > 0 && $ngCodes === []) {
            throw new InvalidArgumentException('missing_ng_reason_code');
        }
        if ($quantityRework > 0 && $reworkCodes === []) {
            throw new InvalidArgumentException('missing_rework_reason_code');
        }
        if (($idleProvided && $actualIdle > 0.0) && $downtimeCodes === []) {
            throw new InvalidArgumentException('missing_downtime_reason_code');
        }

        $this->assertDetailQuantityDoesNotExceed($ngDetails, $quantityNg, 'ng_detail_quantity_exceeds_quantity_ng');
        $this->assertDetailQuantityDoesNotExceed($reworkDetails, $quantityRework, 'rework_detail_quantity_exceeds_quantity_rework');

        $downtimeMinutes = 0.0;
        foreach ($downtimeEvents as $event) {
            $downtimeMinutes += (float)($event['minutes'] ?? 0);
        }
        if ($quantityNg === 0 && $ngCodes !== []) {
            throw new InvalidArgumentException('ng_reason_without_quantity');
        }
        if ($quantityRework === 0 && $reworkCodes !== []) {
            throw new InvalidArgumentException('rework_reason_without_quantity');
        }
        if ($downtimeCodes !== [] && $actualIdle <= 0.0 && $downtimeMinutes <= 0.0) {
            throw new InvalidArgumentException('downtime_reason_without_minutes');
        }

        return [
            'reason_codes' => [
                'downtime' => $downtimeCodes,
                'ng' => $ngCodes,
                'rework' => $reworkCodes,
                'blocking' => $blockingCodes,
            ],
            'downtime_events' => $downtimeEvents,
            'ng_details' => $ngDetails,
            'rework_details' => $reworkDetails,
            'blocking_issues' => $blockingIssues,
            'downtime_minutes' => $downtimeMinutes,
            'has_issue_context' => $downtimeCodes !== [] || $ngCodes !== [] || $reworkCodes !== [] || $blockingCodes !== [],
        ];
    }

    /**
     * @param mixed $value
     * @return list<array<string, mixed>>
     */
    private function normalizeDowntimeEvents(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (!is_array($value) || !array_is_list($value)) {
            throw new InvalidArgumentException('invalid_downtime_events');
        }

        $events = [];
        foreach ($value as $idx => $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException('invalid_downtime_event_' . $idx);
            }

            $startedAt = $this->optionalTimestampString($row['started_at'] ?? null, 'downtime_events.started_at');
            $endedAt = $this->optionalTimestampString($row['ended_at'] ?? null, 'downtime_events.ended_at');
            $this->assertTimestampOrder($startedAt, $endedAt);

            $minutes = $this->nonNegativeFloat($row['minutes'] ?? $row['duration_minutes'] ?? 0, 'downtime_events.minutes');
            if ($minutes <= 0.0 && $startedAt !== '' && $endedAt !== '') {
                $minutes = $this->minutesBetween($startedAt, $endedAt);
            }
            $reasonCode = $this->normalizeCode($row['reason_code'] ?? $row['downtime_reason_code'] ?? '');
            $resolutionCode = $this->normalizeResolutionCode($row['resolution_code'] ?? '');
            $notes = $this->stringValue($row['notes'] ?? '');
            if (
                $reasonCode === ''
                && $minutes <= 0.0
                && $startedAt === ''
                && $endedAt === ''
                && $resolutionCode === ''
                && $notes === ''
            ) {
                continue;
            }
            if ($reasonCode === '' && ($minutes > 0.0 || $notes !== '' || $resolutionCode !== '')) {
                throw new InvalidArgumentException('missing_downtime_reason_code');
            }

            $events[] = [
                'reason_code' => $reasonCode,
                'minutes' => $minutes,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
                'resolution_code' => $resolutionCode,
                'notes' => $notes,
            ];
        }

        return $events;
    }

    /**
     * @param mixed $value
     * @return list<array<string, mixed>>
     */
    private function normalizeDefectDetails(mixed $value, string $field): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (!is_array($value) || !array_is_list($value)) {
            throw new InvalidArgumentException('invalid_' . $field);
        }

        $details = [];
        foreach ($value as $idx => $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException('invalid_' . $field . '_' . $idx);
            }
            $quantity = null;
            if (array_key_exists('quantity', $row) && $row['quantity'] !== null && $row['quantity'] !== '') {
                $quantity = $this->nonNegativeInt($row['quantity'], $field . '.quantity');
            }
            $defectCode = $this->normalizeCode($row['defect_code'] ?? $row['reason_code'] ?? '');
            if ($defectCode === '') {
                throw new InvalidArgumentException('missing_defect_code');
            }
            $details[] = [
                'defect_code' => $defectCode,
                'quantity' => $quantity,
                'notes' => $this->stringValue($row['notes'] ?? ''),
            ];
        }

        return $details;
    }

    /**
     * @param mixed $value
     * @return list<array<string, mixed>>
     */
    private function normalizeBlockingIssues(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (!is_array($value) || !array_is_list($value)) {
            throw new InvalidArgumentException('invalid_blocking_issues');
        }

        $issues = [];
        foreach ($value as $idx => $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException('invalid_blocking_issue_' . $idx);
            }
            $severity = strtolower($this->stringValue($row['severity'] ?? 'major'));
            if (!in_array($severity, self::ISSUE_SEVERITIES, true)) {
                throw new InvalidArgumentException('invalid_blocking_issue_severity');
            }
            $reasonCode = $this->normalizeCode($row['reason_code'] ?? $row['issue_code'] ?? '');
            if ($reasonCode === '') {
                throw new InvalidArgumentException('missing_blocking_reason_code');
            }
            $issues[] = [
                'reason_code' => $reasonCode,
                'severity' => $severity,
                'blocked_minutes' => $this->nonNegativeFloat($row['blocked_minutes'] ?? 0, 'blocking_issues.blocked_minutes'),
                'notes' => $this->stringValue($row['notes'] ?? ''),
            ];
        }

        return $issues;
    }

    /**
     * @param array<string, mixed> $log
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function buildAdvisoryProjection(array $log, array $target): array
    {
        $flags = [];
        if (($log['operation_seq'] ?? null) === null && (string)($log['operation_id'] ?? '') === '') {
            $flags[] = 'missing_operation_reference';
        }
        if ((string)($log['cnc_program_id'] ?? '') === '') {
            $flags[] = 'missing_cnc_program_reference';
        }
        if ((float)($log['actual_run_minutes'] ?? 0) <= 0.0 && (int)($log['quantity_total'] ?? 0) > 0) {
            $flags[] = 'missing_actual_run_time';
        }

        $achievement = (float)($log['achievement_pct'] ?? 0.0);
        $ngRate = (float)($log['ng_rate_pct'] ?? 0.0);
        $idle = (float)($log['actual_idle_minutes'] ?? 0.0);
        $risk = 'normal';
        if ($achievement < 75.0 || $idle >= 60.0 || $ngRate >= 10.0) {
            $risk = 'high';
        } elseif ($achievement < 90.0 || $idle > 0.0 || $ngRate >= 5.0) {
            $risk = 'elevated';
        }

        return [
            'projection_only' => true,
            'source' => 'deterministic_phase1_shopfloor_features',
            'delay_risk_hint' => $risk,
            'data_quality_flags' => $flags,
            'features' => [
                'machine_id' => (string)($log['machine_id'] ?? ''),
                'equipment_id' => (string)($log['equipment_id'] ?? ''),
                'work_center_id' => (string)($log['work_center_id'] ?? ''),
                'shift_date' => (string)($log['shift_date'] ?? ''),
                'shift_code' => (string)($log['shift_code'] ?? ''),
                'target_quantity' => (int)($log['target_quantity'] ?? 0),
                'quantity_total' => (int)($log['quantity_total'] ?? 0),
                'quantity_good' => (int)($log['quantity_good'] ?? 0),
                'quantity_ng' => (int)($log['quantity_ng'] ?? 0),
                'quantity_rework' => (int)($log['quantity_rework'] ?? 0),
                'achievement_pct' => $achievement,
                'ng_rate_pct' => $ngRate,
                'rework_rate_pct' => (float)($log['rework_rate_pct'] ?? 0.0),
                'planned_cycle_time_minutes' => (float)($target['cycle_time_minutes'] ?? 0.0),
                'actual_cycle_time_avg' => $log['actual_cycle_time_avg'],
                'actual_setup_minutes' => (float)($log['actual_setup_minutes'] ?? 0.0),
                'actual_run_minutes' => (float)($log['actual_run_minutes'] ?? 0.0),
                'actual_idle_minutes' => $idle,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function masterData(): array
    {
        $file = $this->dataDir . '/master-data/master-data.json';
        if (!is_file($file)) {
            return [];
        }

        $raw = @file_get_contents($file);
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<int, mixed> $rows
     * @return list<array<string, mixed>>
     */
    private function activeRows(array $rows, string $codeField): array
    {
        $active = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if (strtolower((string)($row['status'] ?? 'active')) !== 'active') {
                continue;
            }
            if ($this->normalizeCode($row[$codeField] ?? '') === '') {
                continue;
            }
            $active[] = $row;
        }
        return $active;
    }

    /**
     * @param list<string> $codes
     * @param list<array<string, mixed>> $catalog
     */
    private function assertCodesKnown(array $codes, array $catalog, string $error, string $codeField): void
    {
        $known = [];
        foreach ($catalog as $row) {
            $known[$this->normalizeCode($row[$codeField] ?? '')] = true;
        }

        foreach ($codes as $code) {
            if ($code === '') {
                continue;
            }
            if (!isset($known[$code])) {
                throw new InvalidArgumentException($error . ':' . $code);
            }
        }
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $catalog
     */
    private function assertResolutionCodesKnown(array $events, array $catalog): void
    {
        $codes = [];
        foreach ($events as $event) {
            $code = $this->normalizeCode($event['resolution_code'] ?? '');
            if ($code !== '') {
                $codes[] = $code;
            }
        }

        $this->assertCodesKnown($this->uniqueCodes($codes), $catalog, 'unknown_downtime_resolution_code', 'resolution_code');
    }

    /**
     * @param list<array<string, mixed>> $details
     */
    private function assertDetailQuantityDoesNotExceed(array $details, int $limit, string $error): void
    {
        $sum = 0;
        $hasQuantity = false;
        foreach ($details as $detail) {
            if (($detail['quantity'] ?? null) !== null) {
                $hasQuantity = true;
                $sum += (int)$detail['quantity'];
            }
        }
        if ($hasQuantity && $sum > $limit) {
            throw new InvalidArgumentException($error);
        }
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeCodeList(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (is_string($value)) {
            $value = str_contains($value, ',') ? explode(',', $value) : [$value];
        }
        if (!is_array($value)) {
            throw new InvalidArgumentException('invalid_reason_code_list');
        }

        $codes = [];
        foreach ($value as $code) {
            $normalized = $this->normalizeCode($code);
            if ($normalized !== '') {
                $codes[] = $normalized;
            }
        }

        return $codes;
    }

    /**
     * @param list<string> $codes
     * @return list<string>
     */
    private function uniqueCodes(array $codes): array
    {
        $seen = [];
        $result = [];
        foreach ($codes as $code) {
            $normalized = $this->normalizeCode($code);
            if ($normalized === '' || isset($seen[$normalized])) {
                continue;
            }
            $seen[$normalized] = true;
            $result[] = $normalized;
        }
        return $result;
    }

    private function requiredString(mixed $value, string $error): string
    {
        $text = $this->stringValue($value);
        if ($text === '') {
            throw new InvalidArgumentException($error);
        }
        return $text;
    }

    private function stringValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_scalar($value)) {
            return trim((string)$value);
        }
        return '';
    }

    private function normalizeCode(mixed $value): string
    {
        return strtoupper($this->stringValue($value));
    }

    private function normalizeResolutionCode(mixed $value): string
    {
        return strtolower($this->stringValue($value));
    }

    private function normalizeShiftCode(mixed $value): string
    {
        $shiftCode = strtolower($this->stringValue($value));
        if (!in_array($shiftCode, self::SHIFT_CODES, true)) {
            throw new InvalidArgumentException('invalid_shift_code');
        }
        return $shiftCode;
    }

    private function normalizeDate(mixed $value, string $field): string
    {
        $date = $this->requiredString($value, 'missing_' . $field);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new InvalidArgumentException('invalid_' . $field);
        }

        [$year, $month, $day] = array_map('intval', explode('-', $date));
        if (!checkdate($month, $day, $year)) {
            throw new InvalidArgumentException('invalid_' . $field);
        }

        return $date;
    }

    private function optionalTimestampString(mixed $value, string $field): string
    {
        $text = $this->stringValue($value);
        if ($text === '') {
            return '';
        }
        try {
            new \DateTimeImmutable($text);
        } catch (Throwable) {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
        return $text;
    }

    private function assertTimestampOrder(string $start, string $end): void
    {
        if ($start === '' || $end === '') {
            return;
        }

        $startAt = new \DateTimeImmutable($start);
        $endAt = new \DateTimeImmutable($end);
        if ($endAt < $startAt) {
            throw new InvalidArgumentException('actual_end_before_actual_start');
        }
    }

    private function minutesBetween(string $start, string $end): float
    {
        $startAt = new \DateTimeImmutable($start);
        $endAt = new \DateTimeImmutable($end);
        return round(max(0, $endAt->getTimestamp() - $startAt->getTimestamp()) / 60, 2);
    }

    private function nonNegativeFloat(mixed $value, string $field): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
        $number = (float)$value;
        if ($number < 0.0) {
            throw new InvalidArgumentException('negative_' . str_replace('.', '_', $field));
        }
        return round($number, 2);
    }

    private function positiveFloat(mixed $value, string $field): float
    {
        $number = $this->nonNegativeFloat($value, $field);
        if ($number <= 0.0) {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
        return $number;
    }

    private function nonNegativeInt(mixed $value, string $field): int
    {
        if ($value === null || $value === '') {
            return 0;
        }
        if (is_int($value)) {
            $number = $value;
        } elseif (is_float($value)) {
            if (floor($value) !== $value) {
                throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
            }
            $number = (int)$value;
        } elseif (is_string($value)) {
            $text = trim($value);
            if (!preg_match('/^\d+$/', $text)) {
                throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
            }
            $number = (int)$text;
        } else {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
        if ($number < 0) {
            throw new InvalidArgumentException('negative_' . str_replace('.', '_', $field));
        }
        return $number;
    }

    private function positiveInt(mixed $value, string $field): int
    {
        $number = $this->nonNegativeInt($value, $field);
        if ($number <= 0) {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
        return $number;
    }

    private function nullablePositiveInt(mixed $value, string $field): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        return $this->positiveInt($value, $field);
    }

    private function events(): ManufacturingEventBackboneService
    {
        if ($this->eventBackbone === null) {
            $this->eventBackbone = new ManufacturingEventBackboneService($this->dataDir, $this->dataLayer);
        }
        return $this->eventBackbone;
    }
}
