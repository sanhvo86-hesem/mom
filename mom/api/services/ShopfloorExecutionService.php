<?php

declare(strict_types=1);

namespace MOM\Services;

use InvalidArgumentException;
use MOM\Api\Services\ConnectedGovernanceService;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Database\Connection;
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

    /** @var list<string> */
    private const REPORT_MODES = ['snapshot', 'correction'];

    /** @var list<string> */
    private const COMPLETION_INTENTS = ['none', 'complete_shift', 'complete_target'];

    /** @var list<string> */
    private const EXECUTION_EVENT_TYPES = ['progress', 'downtime', 'blocked', 'pause', 'resume', 'correction', 'completion'];

    /** @var list<string> */
    private const REFERENCE_POLICIES = ['warn', 'enforce_dispatch'];

    /** @var list<string> */
    private const QUALITY_GATE_POLICIES = ['warn', 'enforce_first_piece'];

    /** @var list<string> */
    private const DISPATCH_EXECUTION_EVENT_TYPES = [
        'dispatch.target_created',
        'dispatch.target_updated',
        'dispatch.target_dispatched',
        'dispatch.production_reported',
        'dispatch.downtime_reported',
        'dispatch.production_blocked',
        'dispatch.target_paused',
        'dispatch.target_resumed',
        'dispatch.target_completed',
    ];

    private const BACKDATE_GRACE_DAYS = 2;
    private const FUTURE_TIMESTAMP_TOLERANCE_SECONDS = 900;

    private readonly string $dataDir;
    private ?ManufacturingEventBackboneService $eventBackbone;
    private ?ConnectedGovernanceService $connectedGovernance;

    public function __construct(
        string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?ManufacturingEventBackboneService $eventBackbone = null,
        ?ConnectedGovernanceService $connectedGovernance = null,
    ) {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->eventBackbone = $eventBackbone;
        $this->connectedGovernance = $connectedGovernance;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function normalizeTargetForCreate(array $body, string $userId, string $now): array
    {
        $body = $this->withTargetAliases($body);
        $machineId = $this->requiredString($body['machine_id'] ?? $body['equipment_id'] ?? null, 'missing_machine_id');
        $equipmentId = $this->stringValue($body['equipment_id'] ?? '');
        if ($equipmentId === '') {
            $equipmentId = $machineId;
        }
        $itemId = $this->stringValue($body['item_id'] ?? $body['part_number'] ?? '');
        $partNumber = $this->stringValue($body['part_number'] ?? $itemId);
        $shiftCode = $this->normalizeShiftCode($body['shift_code'] ?? 'morning');
        $firstPieceRequired = $this->truthy($body['first_piece_required'] ?? false);
        $qualityGatePolicy = $this->normalizeQualityGatePolicy($body['quality_gate_policy'] ?? null, $firstPieceRequired);

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
            'operation_revision' => $this->stringValue($body['operation_revision'] ?? ''),
            'routing_id' => $this->stringValue($body['routing_id'] ?? ''),
            'operation_name' => $this->stringValue($body['operation_name'] ?? $body['operation'] ?? ''),
            'machine_id' => $machineId,
            'equipment_id' => $equipmentId,
            'work_center_id' => $this->stringValue($body['work_center_id'] ?? ''),
            'org_company_code' => $this->stringValue($body['org_company_code'] ?? $body['company_code'] ?? $body['company_id'] ?? ''),
            'org_legal_entity_code' => $this->stringValue($body['org_legal_entity_code'] ?? $body['legal_entity_code'] ?? ''),
            'org_plant_id' => $this->stringValue($body['org_plant_id'] ?? $body['plant_id'] ?? ''),
            'org_site_id' => $this->stringValue($body['org_site_id'] ?? $body['site_id'] ?? ''),
            'operator_id' => $this->stringValue($body['operator_id'] ?? ''),
            'shift_date' => $this->normalizeDate($body['shift_date'] ?? null, 'shift_date'),
            'shift_code' => $shiftCode,
            'cycle_time_minutes' => $this->positiveFloat($body['cycle_time_minutes'] ?? null, 'cycle_time_minutes'),
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
            'setup_sheet_revision' => $this->stringValue($body['setup_sheet_revision'] ?? ''),
            'inspection_plan_id' => $this->stringValue($body['inspection_plan_id'] ?? ''),
            'first_piece_required' => $firstPieceRequired,
            'quality_gate_policy' => $qualityGatePolicy,
            'reference_policy' => $this->normalizeReferencePolicy($body['reference_policy'] ?? null),
            'material_lot_number' => $this->stringValue($body['material_lot_number'] ?? $body['lot_number'] ?? ''),
            'heat_number' => $this->stringValue($body['heat_number'] ?? ''),
            'traveler_number' => $this->stringValue($body['traveler_number'] ?? ''),
            'due_at' => $this->optionalTimestampString($body['due_at'] ?? null, 'due_at'),
            'status' => 'planned',
            'notes' => $this->stringValue($body['notes'] ?? ''),
            'metadata' => is_array($body['metadata'] ?? null) ? (array)$body['metadata'] : new \stdClass(),
            'created_by' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        return $this->finalizeTarget($this->enrichTargetFromOrderStore($target));
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $updates
     * @return array<string, mixed>
     */
    public function applyTargetUpdates(array $target, array $updates, string $now): array
    {
        $updates = $this->withTargetAliases($updates, true);
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
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'item_id',
            'part_number',
            'part_revision',
            'item_description',
            'operation_seq',
            'operation_id',
            'operation_revision',
            'routing_id',
            'operation_name',
            'cnc_program_id',
            'cnc_program_revision',
            'setup_sheet_id',
            'setup_sheet_revision',
            'inspection_plan_id',
            'first_piece_required',
            'quality_gate_policy',
            'reference_policy',
            'material_lot_number',
            'heat_number',
            'traveler_number',
            'due_at',
            'metadata',
        ];

        $this->assertTargetUpdateAllowed($target, $updates, $editable);

        foreach ($editable as $field) {
            if (array_key_exists($field, $updates)) {
                $target[$field] = $updates[$field];
            }
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
        $target['cycle_time_minutes'] = $this->positiveFloat($target['cycle_time_minutes'] ?? 0, 'cycle_time_minutes');
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
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $target[$field] = $this->stringValue($target[$field] ?? '');
        }
        $firstPieceRequired = $this->truthy($target['first_piece_required'] ?? false);
        $target['first_piece_required'] = $firstPieceRequired;
        $target['quality_gate_policy'] = $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $firstPieceRequired);
        $target['reference_policy'] = $this->normalizeReferencePolicy($target['reference_policy'] ?? null);
        $overrideReason = $this->stringValue($updates['supervisor_override_reason'] ?? $updates['override_reason'] ?? '');
        if ($overrideReason !== '') {
            $target['last_target_override_reason'] = $overrideReason;
            $target['last_target_override_at'] = $now;
        }
        $target['updated_at'] = $now;

        return $this->finalizeTarget($this->enrichTargetFromOrderStore($target));
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $updates
     * @param list<string> $editableFields
     */
    private function assertTargetUpdateAllowed(array $target, array $updates, array $editableFields): void
    {
        $status = strtolower($this->stringValue($target['status'] ?? 'planned'));
        if ($status === 'planned') {
            return;
        }

        $overrideReason = $this->stringValue($updates['supervisor_override_reason'] ?? $updates['override_reason'] ?? '');
        $lockedFields = [
            'machine_id',
            'equipment_id',
            'work_center_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'item_id',
            'part_number',
            'part_revision',
            'item_description',
            'operation_seq',
            'operation_id',
            'operation_revision',
            'routing_id',
            'operation_name',
            'cnc_program_id',
            'cnc_program_revision',
            'setup_sheet_id',
            'setup_sheet_revision',
            'inspection_plan_id',
            'first_piece_required',
            'quality_gate_policy',
            'reference_policy',
            'material_lot_number',
            'heat_number',
            'traveler_number',
            'cycle_time_minutes',
            'setup_time_minutes',
            'standard_setup_minutes',
            'standard_run_minutes',
            'expected_run_minutes',
            'shift_duration_minutes',
            'target_quantity',
            'shift_code',
            'due_at',
        ];

        if (in_array($status, ['completed', 'cancelled'], true)) {
            $lockedFields = array_values(array_diff($editableFields, ['notes', 'metadata']));
        }

        $changedLockedFields = [];
        foreach ($lockedFields as $field) {
            if (!array_key_exists($field, $updates)) {
                continue;
            }
            if ($this->targetFieldValuesEquivalent($field, $target[$field] ?? null, $updates[$field])) {
                continue;
            }
            $changedLockedFields[] = $field;
        }

        if ($status === 'completed') {
            if ($changedLockedFields !== []) {
                throw new InvalidArgumentException('target_locked_after_completion');
            }
            return;
        }
        if ($status === 'cancelled') {
            if ($changedLockedFields !== []) {
                throw new InvalidArgumentException('target_locked_after_cancellation');
            }
            return;
        }
        if ($changedLockedFields === []) {
            return;
        }
        if ($overrideReason !== '') {
            return;
        }

        throw new InvalidArgumentException('target_update_requires_supervisor_override:' . implode(',', $changedLockedFields));
    }

    private function targetFieldValuesEquivalent(string $field, mixed $current, mixed $candidate): bool
    {
        if ($field === 'first_piece_required') {
            return $this->truthy($current) === $this->truthy($candidate);
        }
        if (is_array($current) || is_array($candidate) || is_object($current) || is_object($candidate)) {
            return $this->canonicalJson($current) === $this->canonicalJson($candidate);
        }

        return $this->stringValue($current) === $this->stringValue($candidate);
    }

    /**
     * @param array<string, mixed> $target
     */
    public function assertTargetDispatchable(array $target): void
    {
        $policy = $this->normalizeReferencePolicy($target['reference_policy'] ?? null);
        if ($policy !== 'enforce_dispatch') {
            return;
        }

        $blockers = $this->digitalThreadReferenceBlockers($target);
        if ($blockers === []) {
            return;
        }

        throw new InvalidArgumentException('dispatch_reference_blocked:' . implode(',', $blockers));
    }

    /**
     * MES-004 FIX: CRITICAL SECTION - Read-modify-write on execution state.
     * Callers MUST wrap this in a DB transaction (SELECT FOR UPDATE on targets table)
     * or file lock (flock LOCK_EX) to prevent concurrent corruption.
     *
     * @param array<string, mixed> $target
     * @param array<string, mixed> $log
     * @return array<string, mixed>
     */
    public function applyExecutionStateFromReport(array $target, array $log, string $now): array
    {
        $eventType = (string)($log['execution_event_type'] ?? 'progress');
        $target['last_execution_event_type'] = $eventType;
        $target['last_execution_event_at'] = (string)(($log['actual_end'] ?? '') ?: ($log['updated_at'] ?? $now));

        if ($eventType === 'pause') {
            $target['execution_state'] = 'paused';
            $target['paused_at'] = $target['last_execution_event_at'];
        } elseif ($eventType === 'resume') {
            $target['execution_state'] = 'running';
            $target['resumed_at'] = $target['last_execution_event_at'];
            $target['resumed_from_event_id'] = (string)($log['resumed_from_event_id'] ?? '');
        } elseif ($eventType === 'blocked') {
            $target['execution_state'] = 'blocked';
            $target['blocked_at'] = $target['last_execution_event_at'];
        } elseif ($eventType === 'completion') {
            $target['execution_state'] = 'completed';
        } elseif (($target['status'] ?? '') === 'in_progress') {
            $target['execution_state'] = 'running';
        }

        $target['updated_at'] = $now;
        return $target;
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>|null
     */
    public function assertReportActorCanSubmit(array $target, string $actorId, bool $hasPlannerOverride, array $context = []): ?array
    {
        $assignedOperator = $this->stringValue($target['operator_id'] ?? '');
        $actorAliases = [$actorId];
        foreach ((array)($context['actor_aliases'] ?? []) as $alias) {
            $aliasValue = $this->stringValue($alias);
            if ($aliasValue !== '') {
                $actorAliases[] = $aliasValue;
            }
        }
        $actorAliases = array_values(array_unique($actorAliases));

        if ($assignedOperator === '' && !$hasPlannerOverride) {
            throw new RuntimeException('missing_operator_assignment');
        }
        if ($assignedOperator !== '' && !in_array($assignedOperator, $actorAliases, true) && !$hasPlannerOverride) {
            throw new RuntimeException('forbidden_operator_assignment');
        }

        if ($this->connectedGovernance === null) {
            return null;
        }

        return $this->connectedGovernance->assertExecutionEntitled($actorId, $target, array_merge([
            'action' => 'dispatch.report_production',
            'correlation_id' => (string)($target['target_id'] ?? $target['wo_number'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $target
     */
    public function assertProductionReportGovernance(array $body, array $target, bool $hasPlannerOverride, string $now): void
    {
        $status = strtolower($this->stringValue($target['status'] ?? 'planned'));
        $reportMode = $this->normalizeReportMode($body['report_mode'] ?? 'snapshot');

        if ($status === 'cancelled') {
            throw new InvalidArgumentException('target_cancelled');
        }
        if ($status === 'planned' && !$hasPlannerOverride) {
            throw new RuntimeException('target_not_dispatched');
        }
        if ($status === 'completed' && $reportMode !== 'correction') {
            throw new InvalidArgumentException('completed_target_requires_correction');
        }
        if ($reportMode === 'correction' && !$hasPlannerOverride) {
            throw new RuntimeException('correction_override_required');
        }

        $this->assertReportTimestampGovernance($body, $target, $hasPlannerOverride, $now);
    }

    /**
     * @param array<string, mixed>      $body
     * @param array<string, mixed>      $target
     * @param array<string, mixed>|null $existingLog
     * @return array<string, mixed>
     */
    public function buildProductionLog(
        array $body,
        array $target,
        ?array $existingLog,
        string $operatorId,
        string $now,
        bool $hasPlannerOverride = false,
    ): array {
        if (($target['status'] ?? '') === 'cancelled') {
            throw new InvalidArgumentException('target_cancelled');
        }

        $reportMode = $this->normalizeReportMode($body['report_mode'] ?? 'snapshot');
        $completionIntent = $this->normalizeCompletionIntent($body['completion_intent'] ?? ($this->truthy($body['complete_target'] ?? false) ? 'complete_target' : 'none'));
        $correctionReason = $this->stringValue($body['correction_reason'] ?? '');
        if ($reportMode === 'correction' && !is_array($existingLog)) {
            throw new InvalidArgumentException('correction_requires_existing_report');
        }
        if ($reportMode === 'correction' && $correctionReason === '') {
            throw new InvalidArgumentException('correction_reason_required');
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
        $executionEventType = $this->executionEventType($body, $reportMode, $completionIntent, $reasonPayload);
        $resumedFromEventId = $this->stringValue($body['resumed_from_event_id'] ?? '');
        if ($executionEventType === 'pause' && $reasonPayload['reason_codes']['downtime'] === [] && $reasonPayload['reason_codes']['blocking'] === []) {
            throw new InvalidArgumentException('pause_requires_reason_code');
        }
        if ($executionEventType === 'blocked' && $reasonPayload['reason_codes']['blocking'] === []) {
            throw new InvalidArgumentException('blocked_report_requires_reason_code');
        }
        if ($executionEventType === 'resume' && $resumedFromEventId === '' && $notes === '' && $issuesText === '') {
            throw new InvalidArgumentException('resume_requires_context');
        }

        $quantityTotal = $quantityGood + $quantityNg + $quantityRework;
        $totalActualMinutes = $actualSetup + $actualRun + $actualIdle;
        if (
            $quantityTotal === 0
            && $totalActualMinutes <= 0.0
            && $notes === ''
            && $issuesText === ''
            && $reasonPayload['has_issue_context'] === false
            && !in_array($executionEventType, ['resume'], true)
        ) {
            throw new InvalidArgumentException('empty_production_report');
        }

        $targetQuantity = $this->nonNegativeInt($target['target_quantity'] ?? 0, 'target_quantity');
        $overproductionReason = $this->stringValue($body['overproduction_reason'] ?? '');
        if ($targetQuantity > 0 && $quantityGood > $targetQuantity && $overproductionReason === '') {
            throw new InvalidArgumentException('overproduction_reason_required');
        }
        $achievementPct = $targetQuantity > 0 ? round(($quantityGood / $targetQuantity) * 100, 1) : 0.0;
        $ngRatePct = $quantityTotal > 0 ? round(($quantityNg / $quantityTotal) * 100, 1) : 0.0;
        $reworkRatePct = $quantityTotal > 0 ? round(($quantityRework / $quantityTotal) * 100, 1) : 0.0;

        $actualCycleTimeAvg = null;
        if ($quantityTotal > 0 && $actualRun > 0.0) {
            $actualCycleTimeAvg = round($actualRun / $quantityTotal, 2);
        }
        $qualityGate = $this->evaluateQualityGate($body, $target, $executionEventType, $quantityTotal, $actualRun, $hasPlannerOverride, $now);

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
            'operation_revision' => (string)($target['operation_revision'] ?? ''),
            'routing_id' => (string)($target['routing_id'] ?? ''),
            'operation_name' => (string)($target['operation_name'] ?? ''),
            'machine_id' => (string)($target['machine_id'] ?? ''),
            'equipment_id' => (string)($target['equipment_id'] ?? $target['machine_id'] ?? ''),
            'work_center_id' => (string)($target['work_center_id'] ?? ''),
            'org_company_code' => (string)($target['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($target['org_legal_entity_code'] ?? ''),
            'org_plant_id' => (string)($target['org_plant_id'] ?? ''),
            'org_site_id' => (string)($target['org_site_id'] ?? ''),
            'operator_id' => $operatorId,
            'shift_date' => (string)($target['shift_date'] ?? ''),
            'shift_code' => (string)($target['shift_code'] ?? ''),
            'cnc_program_id' => (string)($target['cnc_program_id'] ?? ''),
            'cnc_program_revision' => (string)($target['cnc_program_revision'] ?? ''),
            'setup_sheet_id' => (string)($target['setup_sheet_id'] ?? ''),
            'setup_sheet_revision' => (string)($target['setup_sheet_revision'] ?? ''),
            'inspection_plan_id' => (string)($target['inspection_plan_id'] ?? ''),
            'first_piece_required' => $this->truthy($target['first_piece_required'] ?? false),
            'quality_gate_policy' => $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $this->truthy($target['first_piece_required'] ?? false)),
            'quality_gate' => $qualityGate,
            'quality_override_reason' => $this->stringValue($body['quality_override_reason'] ?? ''),
            'material_lot_number' => (string)($target['material_lot_number'] ?? ''),
            'heat_number' => (string)($target['heat_number'] ?? ''),
            'traveler_number' => (string)($target['traveler_number'] ?? ''),
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
            'reference_validation' => is_array($target['reference_validation'] ?? null) ? $target['reference_validation'] : null,
            'notes' => $notes,
            'issues_encountered' => $issuesText,
            'offline_created' => $this->truthy($body['offline_created'] ?? false),
            'sync_status' => 'synced',
            'device_id' => $this->stringValue($body['device_id'] ?? ''),
            'client_report_id' => $this->stringValue($body['client_report_id'] ?? ''),
            'idempotency_key' => $this->stringValue($body['idempotency_key'] ?? ''),
            'execution_entitlement' => is_array($target['execution_entitlement'] ?? null) ? $target['execution_entitlement'] : null,
            'execution_event_type' => $executionEventType,
            'resumed_from_event_id' => $resumedFromEventId,
            'report_mode' => $reportMode,
            'completion_intent' => $completionIntent,
            'correction_reason' => $correctionReason,
            'overproduction_reason' => $overproductionReason,
            'source_schema_version' => 'phase1_shopfloor_execution.v1',
            'updated_at' => $now,
            'quantity_total' => $quantityTotal,
            'achievement_pct' => $achievementPct,
            'ng_rate_pct' => $ngRatePct,
            'rework_rate_pct' => $reworkRatePct,
            'report_count' => is_array($existingLog) ? ((int)($existingLog['report_count'] ?? 1) + 1) : 1,
        ];

        if ($log['log_id'] === '') {
            $log['log_id'] = 'LOG-' . bin2hex(random_bytes(8));
        }
        if ($log['offline_created'] === true) {
            if ((string)$log['idempotency_key'] === '') {
                throw new InvalidArgumentException('offline_report_requires_idempotency_key');
            }
            if ((string)$log['client_report_id'] === '') {
                throw new InvalidArgumentException('offline_report_requires_client_report_id');
            }
        }
        $log['created_at'] = is_array($existingLog) ? (string)($existingLog['created_at'] ?? $now) : $now;
        $log['report_fingerprint'] = $this->productionReportFingerprint($log);
        if ((string)$log['idempotency_key'] === '') {
            $log['idempotency_key'] = $this->serverDerivedIdempotencyKey($log);
        }
        $log['advisory_projection'] = $this->buildAdvisoryProjection($log, $target);

        return $log;
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function evaluateQualityGate(
        array $body,
        array $target,
        string $executionEventType,
        int $quantityTotal,
        float $actualRun,
        bool $hasPlannerOverride,
        string $now,
    ): array {
        $firstPieceRequired = $this->truthy($target['first_piece_required'] ?? false);
        $policy = $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $firstPieceRequired);
        $productionRelevant = $quantityTotal > 0 || $actualRun > 0.0;
        if (!$productionRelevant || in_array($executionEventType, ['pause', 'resume', 'blocked'], true)) {
            return [
                'status' => 'not_applicable',
                'policy' => $policy,
                'first_piece_required' => $firstPieceRequired,
                'source' => 'phase1_quality_gate',
            ];
        }

        $inspection = $this->passingFirstPieceInspection($target);
        if ($inspection !== null) {
            return [
                'status' => 'passed',
                'policy' => $policy,
                'first_piece_required' => $firstPieceRequired,
                'capture_id' => (string)($inspection['capture_id'] ?? $inspection['inspection_id'] ?? ''),
                'inspection_plan_id' => (string)($inspection['inspection_plan_id'] ?? ''),
                'captured_at' => (string)($inspection['captured_at'] ?? $inspection['created_at'] ?? ''),
                'checked_at' => $now,
                'source' => 'mobile_inspection_capture',
            ];
        }

        $required = $firstPieceRequired || $policy === 'enforce_first_piece';
        if (!$required) {
            return [
                'status' => $this->stringValue($target['inspection_plan_id'] ?? '') !== '' ? 'warning' : 'not_required',
                'policy' => $policy,
                'first_piece_required' => false,
                'checked_at' => $now,
                'source' => 'phase1_quality_gate',
                'message' => 'first_piece_inspection_not_captured',
            ];
        }

        $overrideReason = $this->stringValue($body['quality_override_reason'] ?? $body['supervisor_override_reason'] ?? '');
        if ($hasPlannerOverride && $overrideReason !== '') {
            return [
                'status' => 'overridden',
                'policy' => $policy,
                'first_piece_required' => true,
                'override_reason' => $overrideReason,
                'checked_at' => $now,
                'source' => 'supervisor_quality_override',
            ];
        }

        throw new InvalidArgumentException('first_piece_inspection_required');
    }

    /**
     * @param array<string, mixed> $candidateLog
     * @param array<int|string, mixed> $logs
     * @return array<string, mixed>|null
     */
    public function replayProductionLogForIdempotency(array $candidateLog, array $logs, array $events = []): ?array
    {
        $idempotencyKey = $this->stringValue($candidateLog['idempotency_key'] ?? '');
        if ($idempotencyKey === '') {
            return null;
        }

        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }
            /** @var array<string, mixed> $event */
            if ($this->stringValue($event['idempotency_key'] ?? '') !== $idempotencyKey) {
                continue;
            }
            if ($this->stringValue($event['target_id'] ?? '') !== $this->stringValue($candidateLog['target_id'] ?? '')) {
                throw new RuntimeException('idempotency_conflict');
            }
            if (!hash_equals(
                $this->stringValue($event['report_fingerprint'] ?? ''),
                $this->stringValue($candidateLog['report_fingerprint'] ?? ''),
            )) {
                throw new RuntimeException('idempotency_conflict');
            }
            $eventLog = $event['production_log'] ?? null;
            if (is_array($eventLog)) {
                /** @var array<string, mixed> $eventLog */
                return $eventLog;
            }
            return $candidateLog;
        }

        foreach ($logs as $existingLog) {
            if (!is_array($existingLog)) {
                continue;
            }
            /** @var array<string, mixed> $existingLog */
            if ($this->stringValue($existingLog['idempotency_key'] ?? '') !== $idempotencyKey) {
                continue;
            }

            if ($this->stringValue($existingLog['target_id'] ?? '') !== $this->stringValue($candidateLog['target_id'] ?? '')) {
                throw new RuntimeException('idempotency_conflict');
            }

            $existingFingerprint = $this->stringValue($existingLog['report_fingerprint'] ?? '');
            $candidateFingerprint = $this->stringValue($candidateLog['report_fingerprint'] ?? '');
            if (
                $existingFingerprint !== ''
                && $candidateFingerprint !== ''
                && !hash_equals($existingFingerprint, $candidateFingerprint)
            ) {
                throw new RuntimeException('idempotency_conflict');
            }

            if ($existingFingerprint === '' && !$this->legacyProductionLogMatches($existingLog, $candidateLog)) {
                throw new RuntimeException('idempotency_conflict');
            }

            return $existingLog;
        }

        return null;
    }

    /**
     * @param array<string, mixed>      $log
     * @param array<string, mixed>      $target
     * @param array<string, mixed>|null $previousLog
     * @return array<string, mixed>
     */
    public function buildProductionReportEvent(array $log, array $target, ?array $previousLog, string $actorId, string $now): array
    {
        $previousFingerprint = is_array($previousLog) ? $this->stringValue($previousLog['report_fingerprint'] ?? '') : '';
        $previousGood = is_array($previousLog) ? (int)($previousLog['quantity_good'] ?? 0) : 0;
        $previousNg = is_array($previousLog) ? (int)($previousLog['quantity_ng'] ?? 0) : 0;
        $previousRework = is_array($previousLog) ? (int)($previousLog['quantity_rework'] ?? 0) : 0;
        $previousSetup = is_array($previousLog) ? (float)($previousLog['actual_setup_minutes'] ?? 0) : 0.0;
        $previousRun = is_array($previousLog) ? (float)($previousLog['actual_run_minutes'] ?? 0) : 0.0;
        $previousIdle = is_array($previousLog) ? (float)($previousLog['actual_idle_minutes'] ?? 0) : 0.0;

        return [
            'event_id' => 'PRE-' . bin2hex(random_bytes(8)),
            'event_type' => 'dispatch.production_report_recorded',
            'event_schema_version' => 'phase1_shopfloor_execution_event.v1',
            'target_id' => (string)($log['target_id'] ?? ''),
            'log_id' => (string)($log['log_id'] ?? ''),
            'execution_event_type' => (string)($log['execution_event_type'] ?? 'progress'),
            'report_mode' => (string)($log['report_mode'] ?? 'snapshot'),
            'completion_intent' => (string)($log['completion_intent'] ?? 'none'),
            'idempotency_key' => (string)($log['idempotency_key'] ?? ''),
            'client_report_id' => (string)($log['client_report_id'] ?? ''),
            'report_fingerprint' => (string)($log['report_fingerprint'] ?? ''),
            'previous_report_fingerprint' => $previousFingerprint,
            'previous_log_id' => is_array($previousLog) ? (string)($previousLog['log_id'] ?? '') : '',
            'actor_id' => $actorId,
            'occurred_at' => (string)(($log['actual_end'] ?? '') ?: ($log['updated_at'] ?? $now)),
            'recorded_at' => $now,
            'source_controller' => 'DispatchController',
            'source_store' => 'dispatch/production_report_events.json',
            'operational_truth' => true,
            'digital_thread' => $this->digitalThreadPayload($log),
            'quality_gate' => is_array($log['quality_gate'] ?? null) ? $log['quality_gate'] : null,
            'quantity_delta' => [
                'good' => (int)($log['quantity_good'] ?? 0) - $previousGood,
                'ng' => (int)($log['quantity_ng'] ?? 0) - $previousNg,
                'rework' => (int)($log['quantity_rework'] ?? 0) - $previousRework,
            ],
            'time_delta_minutes' => [
                'setup' => round((float)($log['actual_setup_minutes'] ?? 0) - $previousSetup, 2),
                'run' => round((float)($log['actual_run_minutes'] ?? 0) - $previousRun, 2),
                'idle' => round((float)($log['actual_idle_minutes'] ?? 0) - $previousIdle, 2),
            ],
            'production_log' => $log,
        ];
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function buildTargetLifecycleEvent(array $target, string $eventType, string $actorId, string $now, array $context = []): array
    {
        if (!in_array($eventType, self::DISPATCH_EXECUTION_EVENT_TYPES, true)) {
            throw new InvalidArgumentException('invalid_dispatch_execution_event_type');
        }

        return [
            'event_id' => 'DTE-' . bin2hex(random_bytes(8)),
            'event_type' => $eventType,
            'event_schema_version' => 'phase1_dispatch_execution_event.v1',
            'target_id' => (string)($target['target_id'] ?? ''),
            'status' => (string)($target['status'] ?? ''),
            'execution_state' => (string)($target['execution_state'] ?? ''),
            'actor_id' => $actorId,
            'occurred_at' => $this->stringValue($context['occurred_at'] ?? '') !== '' ? $this->stringValue($context['occurred_at'] ?? '') : $now,
            'recorded_at' => $now,
            'source_controller' => 'DispatchController',
            'source_store' => 'dispatch/execution_events.json',
            'operational_truth' => true,
            'digital_thread' => $this->digitalThreadPayload($target),
            'context' => $context,
        ];
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function digitalThreadPayload(array $record): array
    {
        return [
            'org_company_code' => (string)($record['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($record['org_legal_entity_code'] ?? ''),
            'org_plant_id' => (string)($record['org_plant_id'] ?? ''),
            'org_site_id' => (string)($record['org_site_id'] ?? ''),
            'wo_number' => (string)($record['wo_number'] ?? ''),
            'jo_number' => (string)($record['jo_number'] ?? ''),
            'item_id' => (string)($record['item_id'] ?? ''),
            'part_number' => (string)($record['part_number'] ?? ''),
            'part_revision' => (string)($record['part_revision'] ?? ''),
            'routing_id' => (string)($record['routing_id'] ?? ''),
            'operation_seq' => $record['operation_seq'] ?? null,
            'operation_id' => (string)($record['operation_id'] ?? ''),
            'operation_revision' => (string)($record['operation_revision'] ?? ''),
            'machine_id' => (string)($record['machine_id'] ?? ''),
            'equipment_id' => (string)($record['equipment_id'] ?? $record['machine_id'] ?? ''),
            'work_center_id' => (string)($record['work_center_id'] ?? ''),
            'operator_id' => (string)($record['operator_id'] ?? ''),
            'shift_date' => (string)($record['shift_date'] ?? ''),
            'shift_code' => (string)($record['shift_code'] ?? ''),
            'cnc_program_id' => (string)($record['cnc_program_id'] ?? ''),
            'cnc_program_revision' => (string)($record['cnc_program_revision'] ?? ''),
            'setup_sheet_id' => (string)($record['setup_sheet_id'] ?? ''),
            'setup_sheet_revision' => (string)($record['setup_sheet_revision'] ?? ''),
            'inspection_plan_id' => (string)($record['inspection_plan_id'] ?? ''),
            'material_lot_number' => (string)($record['material_lot_number'] ?? ''),
            'heat_number' => (string)($record['heat_number'] ?? ''),
            'traveler_number' => (string)($record['traveler_number'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $log
     * @param array<string, mixed> $body
     */
    public function shouldCompleteTarget(array $log, array $body): bool
    {
        $intent = $this->normalizeCompletionIntent($body['completion_intent'] ?? ($this->truthy($body['complete_target'] ?? false) ? 'complete_target' : 'none'));
        if ($intent === 'none') {
            return false;
        }
        if ((int)($log['target_quantity'] ?? 0) <= 0) {
            return false;
        }
        if ((int)($log['quantity_good'] ?? 0) < (int)($log['target_quantity'] ?? 0)) {
            throw new InvalidArgumentException('completion_quantity_below_target');
        }
        if ($this->stringValue($log['actual_end'] ?? '') === '') {
            throw new InvalidArgumentException('completion_requires_actual_end');
        }

        return true;
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    public function targetResponse(array $target): array
    {
        $targetId = (string)($target['target_id'] ?? $target['id'] ?? '');
        $woNumber = (string)($target['wo_number'] ?? $target['wo_id'] ?? '');
        $shiftDate = (string)($target['shift_date'] ?? $target['target_date'] ?? '');
        $shiftCode = (string)($target['shift_code'] ?? $target['shift'] ?? '');

        return array_merge($target, [
            'id' => $targetId,
            'wo_id' => $woNumber,
            'target_date' => $shiftDate,
            'shift' => $shiftCode,
            'cycle_time' => (float)($target['cycle_time_minutes'] ?? $target['cycle_time'] ?? 0),
            'setup_time' => (float)($target['setup_time_minutes'] ?? $target['setup_time'] ?? 0),
            'shift_duration' => (float)($target['shift_duration_minutes'] ?? $target['shift_duration'] ?? 0),
            'target_qty' => (int)($target['target_quantity'] ?? $target['target_qty'] ?? 0),
            'first_piece_required' => $this->truthy($target['first_piece_required'] ?? false),
            'quality_gate_policy' => $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $this->truthy($target['first_piece_required'] ?? false)),
        ]);
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
            'org_company_code' => (string)($target['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($target['org_legal_entity_code'] ?? ''),
            'org_plant_id' => (string)($target['org_plant_id'] ?? ''),
            'org_site_id' => (string)($target['org_site_id'] ?? ''),
            'wo_number' => (string)($target['wo_number'] ?? ''),
            'jo_number' => (string)($target['jo_number'] ?? ''),
            'part_number' => (string)($target['part_number'] ?? $target['item_id'] ?? ''),
            'part_revision' => (string)($target['part_revision'] ?? ''),
            'operation_seq' => $target['operation_seq'] ?? null,
            'operation_id' => (string)($target['operation_id'] ?? ''),
            'operation_revision' => (string)($target['operation_revision'] ?? ''),
            'routing_id' => (string)($target['routing_id'] ?? ''),
            'operation_name' => (string)($target['operation_name'] ?? ''),
            'target_quantity' => (int)($target['target_quantity'] ?? 0),
            'quantity_good_reported' => (int)($log['quantity_good'] ?? 0),
            'quantity_ng_reported' => (int)($log['quantity_ng'] ?? 0),
            'quantity_rework_reported' => (int)($log['quantity_rework'] ?? 0),
            'achievement_pct' => (float)($log['achievement_pct'] ?? 0),
            'cnc_program_id' => (string)($target['cnc_program_id'] ?? ''),
            'cnc_program_revision' => (string)($target['cnc_program_revision'] ?? ''),
            'setup_sheet_id' => (string)($target['setup_sheet_id'] ?? ''),
            'setup_sheet_revision' => (string)($target['setup_sheet_revision'] ?? ''),
            'inspection_plan_id' => (string)($target['inspection_plan_id'] ?? ''),
            'first_piece_required' => $this->truthy($target['first_piece_required'] ?? false),
            'quality_gate_policy' => $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $this->truthy($target['first_piece_required'] ?? false)),
            'reference_validation' => is_array($target['reference_validation'] ?? null) ? $target['reference_validation'] : null,
            'report_count' => (int)($log['report_count'] ?? 0),
            'notes' => (string)($target['notes'] ?? ''),
        ];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public function activeReasonCatalog(): array
    {
        $master = $this->masterData();

        $downtime = $this->activeRows((array)($master['downtime_reason_codes'] ?? []), 'reason_code');
        $blocking = $this->activeRows((array)($master['blocking_reason_codes'] ?? []), 'reason_code');

        return [
            'downtime' => $downtime,
            'downtime_resolution' => $this->activeRows((array)($master['downtime_resolution_codes'] ?? []), 'resolution_code'),
            'ng' => $this->activeRows((array)($master['defect_catalog'] ?? []), 'defect_code'),
            'rework' => $this->activeRows((array)($master['defect_catalog'] ?? []), 'defect_code'),
            'blocking' => $blocking,
        ];
    }

    /**
     * @param array<string, mixed> $log
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    public function appendProductionReportEvent(array $log, array $target, string $actorId): array
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

            $result = $this->events()->recordWorkExecutionEvent([
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
                'equipment_id' => (string)($log['equipment_id'] ?? $log['machine_id'] ?? $target['equipment_id'] ?? $target['machine_id'] ?? ''),
                'operator_id' => (string)($log['operator_id'] ?? $log['personnel_id'] ?? $actorId),
                'tool_id' => (string)($log['tool_id'] ?? $log['tool_id_used'] ?? $target['tool_id'] ?? ''),
                'process_id' => (string)($log['process_id'] ?? $log['method_id'] ?? $target['process_id'] ?? ''),
                'material_id' => (string)($log['material_id'] ?? $target['material_id'] ?? $target['item_id'] ?? ''),
                'material_lot_id' => (string)($log['material_lot_id'] ?? $log['material_lot_number'] ?? $target['material_lot_id'] ?? ''),
                'material_batch_id' => (string)($log['material_batch_id'] ?? $log['batch_id'] ?? $target['material_batch_id'] ?? ''),
                'batch_number' => (string)($log['batch_number'] ?? $target['batch_number'] ?? ''),
                'routing_id' => (string)($log['routing_id'] ?? $log['route_id'] ?? $target['routing_id'] ?? $target['route_id'] ?? ''),
                'setup_sheet_id' => (string)($log['setup_sheet_id'] ?? $target['setup_sheet_id'] ?? ''),
                'inspection_plan_id' => (string)($log['inspection_plan_id'] ?? $target['inspection_plan_id'] ?? ''),
                'nc_program_id' => (string)($log['nc_program_id'] ?? $target['nc_program_id'] ?? ''),
                'cnc_program_id' => (string)($log['cnc_program_id'] ?? $target['cnc_program_id'] ?? ''),
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
                    'source_store' => 'dispatch/production_report_events.json',
                    'ot_boundary' => 'manual_capture_no_machine_control',
                ],
            ]);
            return [
                'projection_status' => !empty($result['replayed']) ? 'replayed' : 'recorded',
                'manufacturing_event' => is_array($result['event'] ?? null) ? $result['event'] : [],
                'replayed' => (bool)($result['replayed'] ?? false),
            ];
        } catch (Throwable $e) {
            $deadLetter = $this->appendManufacturingEventProjectionDeadLetter($log, $target, $actorId, $e);
            @error_log('[ShopfloorExecutionService] manufacturing event projection failed: ' . $e->getMessage());
            return [
                'projection_status' => 'dead_letter',
                'error_code' => 'manufacturing_event_projection_failed',
                'error_message' => $e->getMessage(),
                'dead_letter' => $deadLetter,
            ];
        }
    }

    /**
     * @param array<string, mixed> $log
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function appendManufacturingEventProjectionDeadLetter(array $log, array $target, string $actorId, Throwable $error): array
    {
        $dir = $this->dataDir . '/manufacturing-events';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $recordedAt = gmdate(DATE_ATOM);
        $deadLetter = [
            'dead_letter_id' => 'MEP-DL-' . substr(hash('sha256', ($log['log_id'] ?? '') . '|' . $recordedAt . '|' . $error->getMessage()), 0, 16),
            'dead_letter_type' => 'manufacturing_event_projection',
            'dead_letter_state' => 'pending_reconciliation',
            'error_code' => 'manufacturing_event_projection_failed',
            'error_message' => $error->getMessage(),
            'recorded_at' => $recordedAt,
            'actor_id' => $actorId,
            'source_record_id' => (string)($log['log_id'] ?? ''),
            'source_target_id' => (string)($target['target_id'] ?? $log['target_id'] ?? ''),
            'idempotency_key' => (string)($log['idempotency_key'] ?? ''),
            'retry_hint' => 'replay_through_manufacturing_event_projection_worker',
            'payload' => [
                'production_log' => $log,
                'target' => $target,
            ],
        ];
        $line = json_encode($deadLetter, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($line)) {
            @file_put_contents($dir . '/projection-dead-letter.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);
        }
        return $deadLetter;
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
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $target[$field] = $this->stringValue($target[$field] ?? '');
        }
        $firstPieceRequired = $this->truthy($target['first_piece_required'] ?? false);
        $target['first_piece_required'] = $firstPieceRequired;
        $target['quality_gate_policy'] = $this->normalizeQualityGatePolicy($target['quality_gate_policy'] ?? null, $firstPieceRequired);
        $referencePolicy = $this->normalizeReferencePolicy($target['reference_policy'] ?? null);
        $target['reference_policy'] = $referencePolicy;
        $warnings = $this->digitalThreadReferenceWarnings($target);
        $blockers = $referencePolicy === 'enforce_dispatch' ? $this->digitalThreadReferenceBlockers($target) : [];
        $target['reference_validation'] = [
            'status' => $blockers !== [] ? 'blocked' : ($warnings === [] ? 'ok' : 'warning'),
            'warnings' => $warnings,
            'blockers' => $blockers,
            'policy' => $referencePolicy,
            'source' => 'phase1_dispatch_reference_guard',
        ];

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
        $ngDetails = $this->normalizeDefectDetails($body['ng_details'] ?? [], 'ng_details', $catalog['ng']);
        $reworkDetails = $this->normalizeDefectDetails($body['rework_details'] ?? [], 'rework_details', $catalog['rework']);
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

        $this->assertDetailQuantityMatches($ngDetails, $quantityNg, 'ng_detail_quantity_mismatch');
        $this->assertDetailQuantityMatches($reworkDetails, $quantityRework, 'rework_detail_quantity_mismatch');

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
     * @param list<array<string, mixed>> $catalog
     * @return list<array<string, mixed>>
     */
    private function normalizeDefectDetails(mixed $value, string $field, array $catalog): array
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
            $quantityValue = null;
            if (array_key_exists('quantity', $row)) {
                $quantityValue = $row['quantity'];
            } elseif (array_key_exists('qty', $row)) {
                $quantityValue = $row['qty'];
            }

            $quantity = null;
            if ($quantityValue !== null && $quantityValue !== '') {
                $quantity = $this->nonNegativeInt($quantityValue, $field . '.quantity');
            }
            $defectCode = $this->resolveDefectCode(
                $row['defect_code'] ?? $row['reason_code'] ?? '',
                $row['type'] ?? $row['defect_type'] ?? '',
                $catalog,
            );
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
                'reason_domain' => 'blocking',
                'loss_class' => $this->stringValue($row['loss_class'] ?? 'blocked'),
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
        if ((string)($log['inspection_plan_id'] ?? '') === '') {
            $flags[] = 'missing_inspection_plan_reference';
        }
        if ((float)($log['actual_run_minutes'] ?? 0) <= 0.0 && (int)($log['quantity_total'] ?? 0) > 0) {
            $flags[] = 'missing_actual_run_time';
        }
        $referenceValidation = is_array($log['reference_validation'] ?? null) ? $log['reference_validation'] : [];
        foreach ((array)($referenceValidation['warnings'] ?? []) as $warning) {
            if (is_string($warning) && $warning !== '') {
                $flags[] = $warning;
            }
        }
        $qualityGate = is_array($log['quality_gate'] ?? null) ? $log['quality_gate'] : [];
        $qualityGateStatus = strtolower($this->stringValue($qualityGate['status'] ?? ''));
        if ($qualityGateStatus === 'warning') {
            $flags[] = 'first_piece_inspection_not_captured';
        } elseif ($qualityGateStatus === 'overridden') {
            $flags[] = 'first_piece_inspection_overridden';
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
                'execution_event_type' => (string)($log['execution_event_type'] ?? 'progress'),
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
                'first_piece_required' => $this->truthy($log['first_piece_required'] ?? false),
                'quality_gate_policy' => (string)($log['quality_gate_policy'] ?? 'warn'),
                'quality_gate_status' => $qualityGateStatus,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $log
     */
    private function productionReportFingerprint(array $log): string
    {
        $fingerprint = [];
        foreach ($this->productionFingerprintFields() as $field) {
            $fingerprint[$field] = $log[$field] ?? null;
        }

        return hash('sha256', $this->canonicalJson($fingerprint));
    }

    /**
     * @param array<string, mixed> $log
     */
    private function serverDerivedIdempotencyKey(array $log): string
    {
        $seed = [
            'target_id' => $log['target_id'] ?? '',
            'operator_id' => $log['operator_id'] ?? '',
            'actual_start' => $log['actual_start'] ?? '',
            'actual_end' => $log['actual_end'] ?? '',
            'client_report_id' => $log['client_report_id'] ?? '',
            'report_fingerprint' => $log['report_fingerprint'] ?? '',
        ];

        return 'server:' . hash('sha256', $this->canonicalJson($seed));
    }

    /**
     * @param array<string, mixed> $existingLog
     * @param array<string, mixed> $candidateLog
     */
    private function legacyProductionLogMatches(array $existingLog, array $candidateLog): bool
    {
        foreach ($this->productionFingerprintFields() as $field) {
            if (($existingLog[$field] ?? null) != ($candidateLog[$field] ?? null)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return list<string>
     */
    private function productionFingerprintFields(): array
    {
        return [
            'target_id',
            'wo_number',
            'jo_number',
            'item_id',
            'part_number',
            'part_revision',
            'operation_seq',
            'operation_id',
            'operation_revision',
            'routing_id',
            'machine_id',
            'equipment_id',
            'work_center_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'operator_id',
            'shift_date',
            'shift_code',
            'cnc_program_id',
            'cnc_program_revision',
            'setup_sheet_id',
            'setup_sheet_revision',
            'inspection_plan_id',
            'first_piece_required',
            'quality_gate_policy',
            'quality_override_reason',
            'material_lot_number',
            'heat_number',
            'traveler_number',
            'quantity_good',
            'quantity_ng',
            'quantity_rework',
            'actual_start',
            'actual_end',
            'actual_setup_minutes',
            'actual_run_minutes',
            'actual_idle_minutes',
            'reason_codes',
            'downtime_events',
            'ng_details',
            'rework_details',
            'blocking_issues',
            'notes',
            'issues_encountered',
            'offline_created',
            'device_id',
            'client_report_id',
            'report_mode',
            'completion_intent',
            'execution_event_type',
            'resumed_from_event_id',
            'correction_reason',
            'overproduction_reason',
        ];
    }

    private function canonicalJson(mixed $value): string
    {
        $normalized = $this->sortForHash($value);
        $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('unable_to_encode_report_fingerprint');
        }

        return $json;
    }

    private function sortForHash(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        if (!array_is_list($value)) {
            ksort($value);
        }

        foreach ($value as $key => $child) {
            $value[$key] = $this->sortForHash($child);
        }

        return $value;
    }

    private function normalizeReportMode(mixed $value): string
    {
        $mode = strtolower($this->stringValue($value));
        if ($mode === '') {
            $mode = 'snapshot';
        }
        if (!in_array($mode, self::REPORT_MODES, true)) {
            throw new InvalidArgumentException('invalid_report_mode');
        }

        return $mode;
    }

    private function normalizeCompletionIntent(mixed $value): string
    {
        if (is_bool($value)) {
            $value = $value ? 'complete_target' : 'none';
        }
        $intent = strtolower($this->stringValue($value));
        if ($intent === '') {
            $intent = 'none';
        }
        if (!in_array($intent, self::COMPLETION_INTENTS, true)) {
            throw new InvalidArgumentException('invalid_completion_intent');
        }

        return $intent;
    }

    private function normalizeReferencePolicy(mixed $value): string
    {
        $policy = strtolower($this->stringValue($value));
        if ($policy === '') {
            $master = $this->masterData();
            $policy = strtolower($this->stringValue($master['shopfloor_reference_policy'] ?? 'warn'));
        }
        if ($policy === '') {
            $policy = 'warn';
        }
        if (!in_array($policy, self::REFERENCE_POLICIES, true)) {
            throw new InvalidArgumentException('invalid_reference_policy');
        }

        return $policy;
    }

    private function normalizeQualityGatePolicy(mixed $value, bool $firstPieceRequired = false): string
    {
        $policy = strtolower($this->stringValue($value));
        if ($policy === '') {
            $master = $this->masterData();
            $policy = strtolower($this->stringValue($master['shopfloor_quality_gate_policy'] ?? 'warn'));
        }
        if ($policy === '') {
            $policy = $firstPieceRequired ? 'enforce_first_piece' : 'warn';
        }
        if ($firstPieceRequired && $policy === 'warn') {
            $policy = 'enforce_first_piece';
        }
        if (!in_array($policy, self::QUALITY_GATE_POLICIES, true)) {
            throw new InvalidArgumentException('invalid_quality_gate_policy');
        }

        return $policy;
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>|null
     */
    private function passingFirstPieceInspection(array $target): ?array
    {
        $dbInspection = $this->passingFirstPieceInspectionFromDb($target);
        if ($dbInspection !== null) {
            return $dbInspection;
        }

        $file = $this->dataDir . '/mobile/inspections.json';
        if (!is_file($file)) {
            return null;
        }
        $raw = @file_get_contents($file);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        $rows = $decoded;
        if (isset($decoded['inspections']) && is_array($decoded['inspections'])) {
            $rows = $decoded['inspections'];
        }

        $targetWo = $this->stringValue($target['wo_number'] ?? '');
        $targetOperation = $this->stringValue($target['operation_seq'] ?? '');
        $targetPlan = $this->stringValue($target['inspection_plan_id'] ?? '');
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $captureType = strtolower($this->stringValue($row['capture_type'] ?? $row['inspection_type'] ?? ''));
            if ($captureType !== 'first_piece') {
                continue;
            }
            if (!in_array(strtolower($this->stringValue($row['overall_result'] ?? $row['result'] ?? '')), ['pass', 'passed', 'ok', 'accepted', 'approved'], true)) {
                continue;
            }
            if ($targetWo !== '' && $this->stringValue($row['wo_number'] ?? $row['work_order_id'] ?? '') !== $targetWo) {
                continue;
            }
            $rowOperation = $this->stringValue($row['operation_seq'] ?? $row['operation_id'] ?? '');
            if ($targetOperation !== '' && $rowOperation !== $targetOperation) {
                continue;
            }
            $rowPlan = $this->stringValue($row['inspection_plan_id'] ?? $row['plan_id'] ?? '');
            if ($targetPlan !== '' && $rowPlan !== $targetPlan) {
                continue;
            }

            /** @var array<string, mixed> $row */
            return $row;
        }

        return null;
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>|null
     */
    private function passingFirstPieceInspectionFromDb(array $target): ?array
    {
        if ($this->dataLayer === null || $this->dataLayer->getMode() === DataLayer::MODE_JSON_ONLY) {
            return null;
        }

        $db = $this->dataLayer->getConnection();
        if ($db === null || !$this->tableAvailable($db, 'mobile_inspection_captures')) {
            return null;
        }

        $targetWo = $this->stringValue($target['wo_number'] ?? '');
        if ($targetWo === '') {
            return null;
        }
        $targetOperation = $this->stringValue($target['operation_seq'] ?? '');
        $targetPlan = $this->stringValue($target['inspection_plan_id'] ?? '');

        try {
            $where = [
                "capture_type = 'first_piece'",
                "lower(COALESCE(overall_result, '')) IN ('pass', 'passed', 'ok', 'accepted', 'approved')",
                'wo_number = :wo_number',
            ];
            $params = [':wo_number' => $targetWo];
            if ($targetOperation !== '') {
                $where[] = 'operation_seq::text = :operation_seq';
                $params[':operation_seq'] = $targetOperation;
            }
            if ($targetPlan !== '') {
                $where[] = "(inspection_plan_id::text = :inspection_plan_id OR metadata->>'inspection_plan_external_id' = :inspection_plan_id)";
                $params[':inspection_plan_id'] = $targetPlan;
            }

            $row = $db->queryOne(
                'SELECT capture_id::text AS capture_id,
                        operator_id,
                        wo_number,
                        jo_number,
                        operation_seq,
                        capture_type,
                        inspection_plan_id::text AS inspection_plan_id,
                        overall_result,
                        metadata,
                        created_at::text AS created_at
                   FROM mobile_inspection_captures
                  WHERE ' . implode(' AND ', $where) . '
                  ORDER BY created_at DESC
                  LIMIT 1',
                $params,
            );
            if (!is_array($row)) {
                return null;
            }
            if (isset($row['metadata']) && is_string($row['metadata'])) {
                $decoded = json_decode($row['metadata'], true);
                $row['metadata'] = is_array($decoded) ? $decoded : [];
            }
            if ($targetPlan !== '' && $this->stringValue($row['inspection_plan_id'] ?? '') === '') {
                $metadata = is_array($row['metadata'] ?? null) ? $row['metadata'] : [];
                $row['inspection_plan_id'] = $this->stringValue($metadata['inspection_plan_external_id'] ?? '');
            }

            return $row;
        } catch (Throwable $e) {
            @error_log('[ShopfloorExecutionService] mobile inspection DB lookup failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $reasonPayload
     */
    private function executionEventType(array $body, string $reportMode, string $completionIntent, array $reasonPayload): string
    {
        $explicit = $this->stringValue($body['execution_event_type'] ?? $body['event_type'] ?? '');
        if ($explicit !== '') {
            $eventType = strtolower($explicit);
            if (!in_array($eventType, self::EXECUTION_EVENT_TYPES, true)) {
                throw new InvalidArgumentException('invalid_execution_event_type');
            }
            if ($eventType === 'correction' && $reportMode !== 'correction') {
                throw new InvalidArgumentException('correction_event_requires_report_mode');
            }
            if ($eventType === 'completion' && $completionIntent === 'none') {
                throw new InvalidArgumentException('completion_event_requires_completion_intent');
            }

            return $eventType;
        }

        if ($reportMode === 'correction') {
            return 'correction';
        }
        if ($completionIntent !== 'none') {
            return 'completion';
        }
        if (($reasonPayload['reason_codes']['blocking'] ?? []) !== []) {
            return 'blocked';
        }
        if (($reasonPayload['reason_codes']['downtime'] ?? []) !== []) {
            return 'downtime';
        }

        return 'progress';
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $target
     */
    private function assertReportTimestampGovernance(array $body, array $target, bool $hasPlannerOverride, string $now): void
    {
        $nowAt = $this->timestamp($now, 'now');
        $shiftDate = $this->normalizeDate($target['shift_date'] ?? null, 'shift_date');
        $shiftCode = strtolower($this->stringValue($target['shift_code'] ?? 'morning'));
        $shiftDateAt = new \DateTimeImmutable($shiftDate . 'T00:00:00+00:00');
        $nowDateAt = new \DateTimeImmutable($nowAt->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d') . 'T00:00:00+00:00');

        if (!$hasPlannerOverride && $nowDateAt > $shiftDateAt->modify('+' . self::BACKDATE_GRACE_DAYS . ' days')) {
            throw new RuntimeException('backdate_override_required');
        }

        $allowedDates = [$shiftDate];
        if ($shiftCode === 'night') {
            $allowedDates[] = $shiftDateAt->modify('+1 day')->format('Y-m-d');
        }

        foreach (['actual_start', 'actual_end'] as $field) {
            if (!array_key_exists($field, $body) || $this->stringValue($body[$field]) === '') {
                continue;
            }

            $value = $this->optionalTimestampString($body[$field], $field);
            $timestamp = $this->timestamp($value, $field);
            if ($timestamp->getTimestamp() > $nowAt->getTimestamp() + self::FUTURE_TIMESTAMP_TOLERANCE_SECONDS) {
                throw new InvalidArgumentException('future_actual_timestamp');
            }
            if (!in_array($timestamp->format('Y-m-d'), $allowedDates, true)) {
                throw new InvalidArgumentException('actual_timestamp_outside_shift');
            }
        }
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return (float)$value !== 0.0;
        }
        $text = strtolower($this->stringValue($value));

        return in_array($text, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function enrichTargetFromOrderStore(array $target): array
    {
        $woNumber = $this->stringValue($target['wo_number'] ?? '');
        if ($woNumber === '') {
            return $target;
        }

        $orders = $this->ordersStore();
        $workOrders = is_array($orders['work_orders'] ?? null) ? (array)$orders['work_orders'] : [];
        $matchedWorkOrder = null;
        foreach ($workOrders as $workOrder) {
            if (!is_array($workOrder)) {
                continue;
            }
            if ($this->stringValue($workOrder['wo_number'] ?? $workOrder['work_order_no'] ?? '') === $woNumber) {
                $matchedWorkOrder = $workOrder;
                break;
            }
        }
        if (!is_array($matchedWorkOrder)) {
            return $target;
        }

        $fillMap = [
            'jo_number' => ['jo_number'],
            'operation_seq' => ['operation_seq', 'operation_number'],
            'operation_id' => ['operation_id'],
            'operation_name' => ['operation_name', 'operation_desc', 'operation'],
            'machine_id' => ['machine_id'],
            'equipment_id' => ['equipment_id', 'machine_id'],
            'work_center_id' => ['work_center_id'],
            'org_company_code' => ['org_company_code', 'company_code', 'company_id'],
            'org_legal_entity_code' => ['org_legal_entity_code', 'legal_entity_code'],
            'org_plant_id' => ['org_plant_id', 'plant_id'],
            'org_site_id' => ['org_site_id', 'site_id'],
            'operator_id' => ['operator_id'],
            'cnc_program_id' => ['cnc_program_id', 'nc_program_id', 'program_id'],
            'cnc_program_revision' => ['cnc_program_revision', 'program_revision'],
            'setup_sheet_id' => ['setup_sheet_id'],
            'setup_sheet_revision' => ['setup_sheet_revision'],
            'inspection_plan_id' => ['inspection_plan_id'],
            'material_lot_number' => ['material_lot_number', 'lot_number'],
            'heat_number' => ['heat_number'],
            'traveler_number' => ['traveler_number'],
        ];

        foreach ($fillMap as $targetField => $sourceFields) {
            if ($this->stringValue($target[$targetField] ?? '') !== '') {
                continue;
            }
            foreach ($sourceFields as $sourceField) {
                $value = $matchedWorkOrder[$sourceField] ?? null;
                if ($this->stringValue($value) !== '') {
                    $target[$targetField] = $value;
                    break;
                }
            }
        }

        if ((float)($target['standard_setup_minutes'] ?? 0) <= 0.0 && isset($matchedWorkOrder['setup_time_est'])) {
            $target['standard_setup_minutes'] = $matchedWorkOrder['setup_time_est'];
        }
        if ((float)($target['setup_time_minutes'] ?? 0) <= 0.0 && isset($matchedWorkOrder['setup_time_est'])) {
            $target['setup_time_minutes'] = $matchedWorkOrder['setup_time_est'];
        }
        if ((float)($target['expected_run_minutes'] ?? 0) <= 0.0 && isset($matchedWorkOrder['run_time_est'])) {
            $target['expected_run_minutes'] = $matchedWorkOrder['run_time_est'];
        }
        if ((float)($target['standard_run_minutes'] ?? 0) <= 0.0 && isset($matchedWorkOrder['run_time_est'])) {
            $target['standard_run_minutes'] = $matchedWorkOrder['run_time_est'];
        }

        return $target;
    }

    /**
     * @return array<string, mixed>
     */
    private function ordersStore(): array
    {
        $file = $this->dataDir . '/orders/orders.json';
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

    private function tableAvailable(Connection $db, string $table): bool
    {
        try {
            $row = $db->queryOne('SELECT to_regclass(:table_name) AS table_name', [':table_name' => $table]);
            return is_array($row) && $this->stringValue($row['table_name'] ?? '') !== '';
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @param array<string, mixed> $target
     * @return list<string>
     */
    private function digitalThreadReferenceWarnings(array $target): array
    {
        $warnings = [];
        $cncProgramId = $this->stringValue($target['cnc_program_id'] ?? '');
        if ($cncProgramId !== '' && !$this->cncProgramKnown($cncProgramId)) {
            $warnings[] = 'unverified_cnc_program_reference';
        }
        if ($cncProgramId !== '' && $this->cncProgramKnown($cncProgramId) && !$this->cncProgramReleased($cncProgramId)) {
            $warnings[] = 'cnc_program_not_released';
        }
        $setupSheetId = $this->stringValue($target['setup_sheet_id'] ?? '');
        if ($setupSheetId !== '' && !$this->setupSheetKnown($setupSheetId)) {
            $warnings[] = 'unverified_setup_sheet_reference';
        }
        if ($setupSheetId !== '' && $this->setupSheetKnown($setupSheetId) && !$this->setupSheetReleased($setupSheetId)) {
            $warnings[] = 'setup_sheet_not_released';
        }
        if ($this->stringValue($target['inspection_plan_id'] ?? '') === '') {
            $warnings[] = 'missing_inspection_plan_reference';
        } elseif (!$this->inspectionPlanKnown($this->stringValue($target['inspection_plan_id'] ?? ''))) {
            $warnings[] = 'unverified_inspection_plan_reference';
        }

        return $warnings;
    }

    /**
     * @param array<string, mixed> $target
     * @return list<string>
     */
    private function digitalThreadReferenceBlockers(array $target): array
    {
        $blockers = [];
        $cncProgramId = $this->stringValue($target['cnc_program_id'] ?? '');
        if ($cncProgramId === '') {
            $blockers[] = 'missing_cnc_program_reference';
        } elseif (!$this->cncProgramKnown($cncProgramId)) {
            $blockers[] = 'unverified_cnc_program_reference';
        } elseif (!$this->cncProgramReleased($cncProgramId)) {
            $blockers[] = 'cnc_program_not_released';
        }

        $setupSheetId = $this->stringValue($target['setup_sheet_id'] ?? '');
        if ($setupSheetId === '') {
            $blockers[] = 'missing_setup_sheet_reference';
        } elseif (!$this->setupSheetKnown($setupSheetId)) {
            $blockers[] = 'unverified_setup_sheet_reference';
        } elseif (!$this->setupSheetReleased($setupSheetId)) {
            $blockers[] = 'setup_sheet_not_released';
        }

        $inspectionPlanId = $this->stringValue($target['inspection_plan_id'] ?? '');
        if ($inspectionPlanId === '') {
            $blockers[] = 'missing_inspection_plan_reference';
        } elseif (!$this->inspectionPlanKnown($inspectionPlanId)) {
            $blockers[] = 'unverified_inspection_plan_reference';
        }

        return $blockers;
    }

    private function cncProgramKnown(string $programId): bool
    {
        return $this->cncProgramRecord($programId) !== null;
    }

    private function cncProgramReleased(string $programId): bool
    {
        $program = $this->cncProgramRecord($programId);
        if ($program === null) {
            return false;
        }
        $status = strtolower($this->stringValue($program['status'] ?? $program['approval_status'] ?? 'released'));

        return in_array($status, ['released', 'approved', 'active'], true);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function cncProgramRecord(string $programId): ?array
    {
        $file = $this->dataDir . '/cnc-programs/programs.json';
        if (!is_file($file)) {
            return null;
        }

        $raw = @file_get_contents($file);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }

        $programs = json_decode($raw, true);
        if (!is_array($programs) || $programs === []) {
            return null;
        }

        foreach ($programs as $program) {
            if (!is_array($program)) {
                continue;
            }
            foreach (['id', 'program_id', 'cnc_program_id', 'nc_program_id', 'program_number', 'name'] as $field) {
                if ($this->stringValue($program[$field] ?? '') === $programId) {
                    /** @var array<string, mixed> $program */
                    return $program;
                }
            }
        }

        return null;
    }

    private function setupSheetKnown(string $setupSheetId): bool
    {
        return $this->setupSheetRecord($setupSheetId) !== null;
    }

    private function setupSheetReleased(string $setupSheetId): bool
    {
        $sheet = $this->setupSheetRecord($setupSheetId);
        if ($sheet === null) {
            return false;
        }
        $status = strtolower($this->stringValue($sheet['status'] ?? $sheet['approval_status'] ?? 'draft'));

        return in_array($status, ['released', 'approved', 'active'], true);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function setupSheetRecord(string $setupSheetId): ?array
    {
        $file = $this->dataDir . '/cnc-programs/setup-sheets.json';
        if (!is_file($file)) {
            return null;
        }

        $raw = @file_get_contents($file);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }

        $sheets = json_decode($raw, true);
        if (!is_array($sheets) || $sheets === []) {
            return null;
        }

        foreach ($sheets as $sheet) {
            if (!is_array($sheet)) {
                continue;
            }
            foreach (['id', 'setup_sheet_id', 'sheet_id', 'setup_number', 'title'] as $field) {
                if ($this->stringValue($sheet[$field] ?? '') === $setupSheetId) {
                    /** @var array<string, mixed> $sheet */
                    return $sheet;
                }
            }
        }

        return null;
    }

    private function inspectionPlanKnown(string $inspectionPlanId): bool
    {
        $master = $this->masterData();
        $plans = (array)($master['inspection_plans'] ?? []);
        if ($plans === []) {
            return true;
        }

        foreach ($plans as $plan) {
            if (!is_array($plan)) {
                continue;
            }
            foreach (['inspection_plan_id', 'plan_id', 'id', 'name', 'inspection_plan_name'] as $field) {
                if ($this->stringValue($plan[$field] ?? '') === $inspectionPlanId) {
                    $status = strtolower($this->stringValue($plan['status'] ?? 'released'));
                    return in_array($status, ['released', 'active', 'approved'], true);
                }
            }
        }

        return false;
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
    private function assertDetailQuantityMatches(array $details, int $expected, string $error): void
    {
        $sum = 0;
        $hasQuantity = false;
        foreach ($details as $detail) {
            if (($detail['quantity'] ?? null) !== null) {
                $hasQuantity = true;
                $sum += (int)$detail['quantity'];
            }
        }
        if ($hasQuantity && $sum !== $expected) {
            throw new InvalidArgumentException($error);
        }
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function withTargetAliases(array $data, bool $rejectConflicts = false): array
    {
        $aliases = [
            'wo_id' => 'wo_number',
            'work_order_id' => 'wo_number',
            'target_date' => 'shift_date',
            'date' => 'shift_date',
            'shift' => 'shift_code',
            'cycle_time' => 'cycle_time_minutes',
            'setup_time' => 'setup_time_minutes',
            'shift_duration' => 'shift_duration_minutes',
            'target_qty' => 'target_quantity',
            'qty_target' => 'target_quantity',
            'company_code' => 'org_company_code',
            'company_id' => 'org_company_code',
            'legal_entity_code' => 'org_legal_entity_code',
            'plant_id' => 'org_plant_id',
            'site_id' => 'org_site_id',
            'program_id' => 'cnc_program_id',
            'program_revision' => 'cnc_program_revision',
            'revision' => 'part_revision',
            'part_description' => 'item_description',
            'operation' => 'operation_name',
        ];

        foreach ($aliases as $alias => $canonical) {
            if (!array_key_exists($alias, $data)) {
                continue;
            }
            if (array_key_exists($canonical, $data)) {
                if (
                    $rejectConflicts
                    && !$this->targetFieldValuesEquivalent($canonical, $data[$canonical], $data[$alias])
                ) {
                    throw new InvalidArgumentException('conflicting_target_alias:' . $alias);
                }
                continue;
            }
            if (array_key_exists($alias, $data)) {
                $data[$canonical] = $data[$alias];
            }
        }

        return $data;
    }

    /**
     * @param list<array<string, mixed>> $catalog
     */
    private function resolveDefectCode(mixed $code, mixed $legacyType, array $catalog): string
    {
        $direct = $this->normalizeCode($code);
        if ($direct !== '') {
            return $direct;
        }

        $type = $this->normalizeCode($legacyType);
        if ($type === '') {
            return '';
        }

        foreach ($catalog as $row) {
            if (!is_array($row)) {
                continue;
            }
            $catalogCode = $this->normalizeCode($row['defect_code'] ?? '');
            if ($catalogCode === '') {
                continue;
            }
            foreach (['defect_code', 'defect_group', 'defect_name'] as $field) {
                if ($this->normalizeCode($row[$field] ?? '') === $type) {
                    return $catalogCode;
                }
            }
        }

        return $type;
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

    private function timestamp(string $value, string $field): \DateTimeImmutable
    {
        try {
            return new \DateTimeImmutable($value);
        } catch (Throwable) {
            throw new InvalidArgumentException('invalid_' . str_replace('.', '_', $field));
        }
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
