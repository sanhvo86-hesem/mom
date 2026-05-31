<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

/**
 * Runtime authority for tooling, preset, gage, breakage, and OOT gates.
 */
final class ToolingCommandHandler
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?QualityHoldService $qualityHolds = null,
    ) {}

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function assertToolReady(string $commandName, array $payload, string $actorId): array
    {
        $toolId = $this->firstText($payload, ['tool_id', 'tool_ref']);
        if ($toolId === '') {
            return ['checked' => false, 'reason' => 'tool_not_declared'];
        }

        $state = $this->db->queryOne(
            "SELECT tool_id, tool_status, assembly_id, assembly_status, component_status, preset_status,
                    calibration_status, life_count, warning_limit, stop_limit, allowed_machine_family,
                    compatible_item_id, last_preset_id, metadata
               FROM tooling_runtime_state
              WHERE tool_id = :tool_id
              LIMIT 1",
            [':tool_id' => $toolId]
        );
        if (!is_array($state)) {
            $this->blockTool($commandName, $payload, $actorId, $toolId, 'tool_runtime_state_missing', 'Tool runtime state is missing.');
        }

        $blockers = [];
        foreach (['tool_status', 'assembly_status', 'component_status'] as $key) {
            $value = strtolower($this->text($state[$key] ?? ''));
            if (!in_array($value, ['active', ''], true)) {
                $blockers[] = ['code' => $key . '_' . $value, 'message' => 'Tool or assembly is not active.'];
            }
        }
        if (strtolower($this->text($state['preset_status'] ?? '')) !== 'approved') {
            $blockers[] = ['code' => 'tool_preset_not_approved', 'message' => 'Tool preset is not approved.'];
        }
        if (in_array(strtolower($this->text($state['calibration_status'] ?? '')), ['expired', 'oot'], true)) {
            $blockers[] = ['code' => 'tool_calibration_not_valid', 'message' => 'Tool calibration is not valid.'];
        }
        $stopLimit = $this->decimalOrNull($state['stop_limit'] ?? null);
        $lifeCount = $this->decimalOrNull($state['life_count'] ?? null);
        if ($stopLimit !== null && $lifeCount !== null && $lifeCount >= $stopLimit) {
            $blockers[] = ['code' => 'tool_life_stop_threshold', 'message' => 'Tool life is at or above stop threshold.'];
        }
        $machineFamily = $this->firstText($payload, ['machine_family', 'equipment_family']);
        $allowedFamily = $this->text($state['allowed_machine_family'] ?? '');
        if ($machineFamily !== '' && $allowedFamily !== '' && $machineFamily !== $allowedFamily) {
            $blockers[] = ['code' => 'tool_machine_family_mismatch', 'message' => 'Tool is not compatible with this machine family.'];
        }
        $itemId = $this->firstText($payload, ['item_id', 'part_number', 'material_id']);
        $compatibleItem = $this->text($state['compatible_item_id'] ?? '');
        if ($itemId !== '' && $compatibleItem !== '' && $itemId !== $compatibleItem) {
            $blockers[] = ['code' => 'tool_item_mismatch', 'message' => 'Tool is not compatible with this item.'];
        }

        if ($blockers !== []) {
            $this->blockTool($commandName, $payload, $actorId, $toolId, 'tooling_runtime_blocked', 'Tooling runtime gate blocks this command.', $blockers);
        }

        $this->writeAudit('tooling.ready', $commandName, $toolId, $actorId, ['state' => $state]);
        return ['checked' => true, 'tool_id' => $toolId, 'state' => $state, 'blockers' => []];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function assertGageReady(string $commandName, array $payload, string $actorId): array
    {
        $gageId = $this->firstText($payload, ['gage_id', 'gage_ref', 'measurement_device_id']);
        if ($gageId === '') {
            return ['checked' => false, 'reason' => 'gage_not_declared'];
        }

        $state = $this->db->queryOne(
            "SELECT gage_id, gage_status, calibration_status, msa_status, calibration_due_at,
                    last_calibration_record_id, open_oot_id, metadata
               FROM gage_runtime_state
              WHERE gage_id = :gage_id
              LIMIT 1",
            [':gage_id' => $gageId]
        );
        if (!is_array($state)) {
            $this->blockGage($commandName, $payload, $actorId, $gageId, 'gage_runtime_state_missing', 'Gage runtime state is missing.');
        }

        $blockers = [];
        if (strtolower($this->text($state['gage_status'] ?? '')) !== 'active') {
            $blockers[] = ['code' => 'gage_not_active', 'message' => 'Gage is not active.'];
        }
        if (in_array(strtolower($this->text($state['calibration_status'] ?? '')), ['expired', 'oot'], true)) {
            $blockers[] = ['code' => 'gage_calibration_not_valid', 'message' => 'Gage calibration is not valid.'];
        }
        if (strtolower($this->text($state['msa_status'] ?? '')) === 'unacceptable') {
            $blockers[] = ['code' => 'gage_msa_unacceptable', 'message' => 'Gage MSA status is unacceptable.'];
        }
        $dueAt = $this->text($state['calibration_due_at'] ?? '');
        if ($dueAt !== '' && strtotime($dueAt) <= time()) {
            $blockers[] = ['code' => 'gage_calibration_expired', 'message' => 'Gage calibration is expired.'];
        }

        if ($blockers !== []) {
            $this->blockGage($commandName, $payload, $actorId, $gageId, 'gage_runtime_blocked', 'Gage runtime gate blocks this command.', $blockers);
        }

        $this->writeAudit('gage.ready', $commandName, $gageId, $actorId, ['state' => $state]);
        return ['checked' => true, 'gage_id' => $gageId, 'state' => $state, 'blockers' => []];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function recordToolUsageFromCompletion(array $payload): array
    {
        $toolId = $this->firstText($payload, ['tool_id', 'tool_ref']);
        if ($toolId === '') {
            return ['recorded' => false, 'reason' => 'tool_not_declared'];
        }
        $pieces = $this->firstText($payload, ['completed_quantity', 'qty_good', 'pieces_completed', 'quantity']);
        $lifeIncrement = $pieces !== '' ? $pieces : '1';
        $event = $this->writeToolLifeEvent('USAGE', $toolId, $payload, ['life_increment' => $lifeIncrement]);
        $this->db->execute(
            "UPDATE tooling_runtime_state
                SET life_count = life_count + CAST(:life_increment AS numeric),
                    last_event_at = now(),
                    updated_at = now()
              WHERE tool_id = :tool_id",
            [':tool_id' => $toolId, ':life_increment' => $lifeIncrement]
        );
        $this->writeAuditAndOutbox('tooling.usage_recorded', $toolId, $payload, ['event' => $event, 'life_increment' => $lifeIncrement]);

        return ['recorded' => true, 'tool_id' => $toolId, 'event' => $event, 'life_increment' => $lifeIncrement];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function reportToolBreakage(array $payload): array
    {
        $actorId = $this->actor($payload);
        $toolId = $this->requiredAny($payload, ['tool_id', 'tool_ref'], 'tool_id');
        $detected = (int)$this->requiredAny($payload, ['detected_piece_no', 'piece_no'], 'detected_piece_no');
        $lastGood = (int)$this->requiredAny($payload, ['last_good_piece_no'], 'last_good_piece_no');
        $suspectFrom = max(1, $lastGood + 1);
        $suspectTo = max($suspectFrom, $detected);
        $idempotencyKey = $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key');

        $event = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO tooling_breakage_event
                    (tool_id, work_order_ref, operation_ref, equipment_id, detected_piece_no, last_good_piece_no,
                     suspect_from_piece_no, suspect_to_piece_no, containment_required, reported_by, idempotency_key, metadata)
                VALUES
                    (:tool_id, :work_order_ref, :operation_ref, :equipment_id, :detected_piece_no, :last_good_piece_no,
                     :suspect_from_piece_no, :suspect_to_piece_no, TRUE, :reported_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (tool_id, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM tooling_breakage_event WHERE tool_id = :tool_id AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':tool_id' => $toolId,
                ':work_order_ref' => $this->firstNullableText($payload, ['work_order_ref', 'job_number', 'wo_number']),
                ':operation_ref' => $this->firstNullableText($payload, ['operation_ref', 'operation_seq']),
                ':equipment_id' => $this->firstNullableText($payload, ['equipment_id', 'machine_ref']),
                ':detected_piece_no' => $detected,
                ':last_good_piece_no' => $lastGood,
                ':suspect_from_piece_no' => $suspectFrom,
                ':suspect_to_piece_no' => $suspectTo,
                ':reported_by' => $actorId,
                ':idempotency_key' => $idempotencyKey,
                ':metadata' => $this->json(['authority' => self::class, 'payload_refs' => $this->payloadRefs($payload)]),
            ]
        );
        $this->db->execute(
            "UPDATE tooling_runtime_state
                SET tool_status = 'broken', last_event_at = now(), updated_at = now()
              WHERE tool_id = :tool_id",
            [':tool_id' => $toolId]
        );
        $lifeEvent = $this->writeToolLifeEvent('BREAKAGE', $toolId, $payload, ['breakage_event' => $event]);
        $subjects = $this->containmentSubjects($payload);
        $hold = $this->applyContainmentHold('tool_breakage', (string)($event['breakage_event_id'] ?? $idempotencyKey), $payload, $subjects);
        $ncr = $this->writeNcr('tool_breakage', (string)($hold['hold_id'] ?? ''), $payload);
        foreach ($subjects as $subject) {
            $this->writeContainment((string)($event['breakage_event_id'] ?? ''), (string)($hold['hold_id'] ?? ''), (string)($ncr['ncr_id'] ?? ''), $subject, $suspectFrom, $suspectTo);
        }
        $this->writeAuditAndOutbox('tooling.breakage_reported', $toolId, $payload, ['event' => $event, 'life_event' => $lifeEvent, 'hold' => $hold, 'ncr' => $ncr, 'subjects' => $subjects]);

        return ['breakage_event' => $event ?? [], 'life_event' => $lifeEvent, 'hold' => $hold, 'ncr' => $ncr, 'subjects' => $subjects];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function investigateGageOot(array $payload): array
    {
        $actorId = $this->actor($payload);
        $gageId = $this->requiredAny($payload, ['gage_id', 'gage_ref', 'measurement_device_id'], 'gage_id');
        $idempotencyKey = $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key');
        $impacted = $this->impactedMeasurements($gageId, $payload);
        $subjects = $this->subjectsFromImpacted($impacted, $payload);
        $hold = $subjects !== [] ? $this->applyContainmentHold('gage_oot', $gageId . ':' . $idempotencyKey, $payload, $subjects) : [];
        $ncr = $subjects !== [] ? $this->writeNcr('gage_oot', (string)($hold['hold_id'] ?? ''), $payload) : [];
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO gage_oot_investigation_runtime
                    (gage_id, oot_status, discovery_at, last_good_at, affected_from, affected_to,
                     impacted_measurement_count, risk_assessment, hold_id, ncr_id, reported_by, idempotency_key, metadata)
                VALUES
                    (:gage_id, 'containment', now(), :last_good_at, :affected_from, :affected_to,
                     :impacted_measurement_count, :risk_assessment, :hold_id, :ncr_id, :reported_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (gage_id, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM gage_oot_investigation_runtime WHERE gage_id = :gage_id AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':gage_id' => $gageId,
                ':last_good_at' => $this->nullableText($payload['last_good_at'] ?? null),
                ':affected_from' => $this->nullableText($payload['affected_from'] ?? null),
                ':affected_to' => $this->nullableText($payload['affected_to'] ?? null),
                ':impacted_measurement_count' => count($impacted),
                ':risk_assessment' => $this->firstText($payload, ['risk_assessment']) ?: 'OOT impact requires quality review.',
                ':hold_id' => $this->nullableText($hold['hold_id'] ?? null),
                ':ncr_id' => $this->nullableText($ncr['ncr_id'] ?? null),
                ':reported_by' => $actorId,
                ':idempotency_key' => $idempotencyKey,
                ':metadata' => $this->json(['authority' => self::class, 'impacted_measurements' => $impacted]),
            ]
        );
        $this->db->execute(
            "UPDATE gage_runtime_state
                SET gage_status = 'oot', calibration_status = 'oot', open_oot_id = :oot_id, updated_at = now()
              WHERE gage_id = :gage_id",
            [':gage_id' => $gageId, ':oot_id' => $row['oot_runtime_id'] ?? null]
        );
        foreach ($impacted as $impact) {
            $this->writeCaseTrace('ncr', (string)($ncr['ncr_id'] ?? $gageId), 'inspection_result', (string)($impact['result_id'] ?? $impact['inspection_id'] ?? ''));
        }
        $this->writeAuditAndOutbox('gage.oot_investigated', $gageId, $payload, ['investigation' => $row, 'hold' => $hold, 'ncr' => $ncr, 'impacted' => $impacted]);

        return ['oot_investigation' => $row ?? [], 'hold' => $hold, 'ncr' => $ncr, 'impacted_measurements' => $impacted];
    }

    private function blockTool(string $commandName, array $payload, string $actorId, string $toolId, string $code, string $message, array $blockers = []): never
    {
        $this->writeReadinessEvidence($commandName, $payload, 'tooling', $toolId, $code, $message, $blockers);
        $this->writeAudit('tooling.blocked', $commandName, $toolId, $actorId, ['code' => $code, 'blockers' => $blockers]);
        throw new DomainCommandException($code, $message, 409, ['tool_id' => $toolId, 'blockers' => $blockers]);
    }

    private function blockGage(string $commandName, array $payload, string $actorId, string $gageId, string $code, string $message, array $blockers = []): never
    {
        $this->writeReadinessEvidence($commandName, $payload, 'gage', $gageId, $code, $message, $blockers);
        $this->writeAudit('gage.blocked', $commandName, $gageId, $actorId, ['code' => $code, 'blockers' => $blockers]);
        throw new DomainCommandException($code, $message, 409, ['gage_id' => $gageId, 'blockers' => $blockers]);
    }

    private function writeReadinessEvidence(string $commandName, array $payload, string $resourceType, string $resourceRef, string $code, string $message, array $blockers): void
    {
        $workOrderRef = $this->firstText($payload, ['work_order_ref', 'wo_number', 'job_number']) ?: 'UNKNOWN';
        $operationRef = $this->firstText($payload, ['operation_ref', 'operation_seq']);
        $operatorPayload = ['decision' => 'block', 'blocked_actions' => [$commandName], 'reasons' => [['code' => $code, 'operator_message' => $message, 'blockers' => $blockers]]];
        $this->db->execute(
            "INSERT INTO resource_readiness_evidence_state
                (work_order_ref, operation_ref, command_scope, evidence_key, resource_type, resource_ref,
                 readiness_status, evidence_hash_sha256, source_authority, operator_message, metadata)
             VALUES
                (:work_order_ref, :operation_ref, :command_scope, :evidence_key, :resource_type, :resource_ref,
                 'blocked', :evidence_hash_sha256, :source_authority, :operator_message, CAST(:metadata AS jsonb))
             ON CONFLICT (work_order_ref, operation_ref, command_scope, evidence_key, resource_ref)
             DO UPDATE SET readiness_status = 'blocked', evidence_hash_sha256 = EXCLUDED.evidence_hash_sha256,
                           operator_message = EXCLUDED.operator_message, metadata = EXCLUDED.metadata, updated_at = now()",
            [
                ':work_order_ref' => $workOrderRef,
                ':operation_ref' => $operationRef !== '' ? $operationRef : null,
                ':command_scope' => $commandName,
                ':evidence_key' => $resourceType . '_runtime',
                ':resource_type' => $resourceType,
                ':resource_ref' => $resourceRef,
                ':evidence_hash_sha256' => $this->hash($operatorPayload),
                ':source_authority' => self::class,
                ':operator_message' => $message,
                ':metadata' => $this->json($operatorPayload),
            ]
        );
    }

    private function writeToolLifeEvent(string $eventType, string $toolId, array $payload, array $metadata): array
    {
        $this->db->execute(
            "INSERT INTO mes_tool_life_events
                (event_time, tool_id, equipment_id, event_type, magazine_position, life_count_at_event,
                 life_remaining_pct, job_number, operator_id, breakage_detected_by, breakage_action, metadata)
             VALUES
                (now(), :tool_id, :equipment_id, :event_type, :magazine_position, :life_count_at_event,
                 :life_remaining_pct, :job_number, :operator_id, :breakage_detected_by, :breakage_action, CAST(:metadata AS jsonb))",
            [
                ':tool_id' => $toolId,
                ':equipment_id' => $this->firstText($payload, ['equipment_id', 'machine_ref']) ?: 'UNKNOWN',
                ':event_type' => $eventType,
                ':magazine_position' => $this->nullableText($payload['magazine_position'] ?? null),
                ':life_count_at_event' => $this->nullableText($payload['life_count_at_event'] ?? null),
                ':life_remaining_pct' => $this->nullableText($payload['life_remaining_pct'] ?? null),
                ':job_number' => $this->firstNullableText($payload, ['job_number', 'work_order_ref', 'wo_number']),
                ':operator_id' => $this->actor($payload),
                ':breakage_detected_by' => $eventType === 'BREAKAGE' ? $this->firstNullableText($payload, ['detected_by', 'actor_id']) : null,
                ':breakage_action' => $eventType === 'BREAKAGE' ? 'containment_started' : null,
                ':metadata' => $this->json(['authority' => self::class] + $metadata),
            ]
        );
        return ['tool_id' => $toolId, 'event_type' => $eventType];
    }

    private function applyContainmentHold(string $sourceType, string $sourceRef, array $payload, array $subjects): array
    {
        if ($subjects === []) {
            return [];
        }
        $holdPayload = [
            'actor_id' => $this->actor($payload),
            'idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
            'signature_event_id' => $this->nullableText($payload['signature_event_id'] ?? null),
            'severity' => $this->firstText($payload, ['severity']) ?: 'critical',
            'hold_scope' => $this->firstText($payload, ['hold_scope', 'inspection_stage']) ?: 'ipqc',
            'subjects' => $subjects,
            'source_type' => $sourceType,
            'source_ref' => $sourceRef,
            'reason_code' => strtoupper($sourceType),
            'operator_message' => 'Containment hold created from ' . $sourceType . '.',
            'source_payload_refs' => $this->payloadRefs($payload),
        ];

        return ($this->qualityHolds ?? new QualityHoldService($this->db))->applyHold($holdPayload);
    }

    private function writeNcr(string $sourceStage, string $holdId, array $payload): array
    {
        $number = 'NCR-' . substr($this->hash([$sourceStage, $holdId, $payload['idempotency_key'] ?? '']), 0, 12);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_nonconformance_runtime
                    (ncr_number, hold_id, severity, defect_code, source_stage, disposition_status, created_by, idempotency_key, metadata)
                VALUES
                    (:ncr_number, :hold_id, :severity, :defect_code, :source_stage, 'pending_mrb', :created_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (ncr_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_nonconformance_runtime WHERE ncr_number = :ncr_number
             LIMIT 1",
            [
                ':ncr_number' => $number,
                ':hold_id' => $holdId !== '' ? $holdId : null,
                ':severity' => $this->firstText($payload, ['severity']) ?: 'critical',
                ':defect_code' => strtoupper($sourceStage),
                ':source_stage' => $sourceStage,
                ':created_by' => $this->actor($payload),
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key') . ':ncr',
                ':metadata' => $this->json(['authority' => self::class, 'payload_refs' => $this->payloadRefs($payload)]),
            ]
        );
        return is_array($row) ? $row : [];
    }

    private function writeContainment(string $breakageEventId, string $holdId, string $ncrId, array $subject, int $suspectFrom, int $suspectTo): void
    {
        if ($breakageEventId === '') {
            return;
        }
        $this->db->execute(
            "INSERT INTO tooling_breakage_containment
                (breakage_event_id, hold_id, ncr_id, subject_type, subject_ref, suspect_window, metadata)
             VALUES
                (:breakage_event_id, :hold_id, :ncr_id, :subject_type, :subject_ref, CAST(:suspect_window AS jsonb), CAST(:metadata AS jsonb))
             ON CONFLICT (breakage_event_id, subject_type, subject_ref) DO NOTHING",
            [
                ':breakage_event_id' => $breakageEventId,
                ':hold_id' => $holdId !== '' ? $holdId : null,
                ':ncr_id' => $ncrId !== '' ? $ncrId : null,
                ':subject_type' => $subject['subject_type'],
                ':subject_ref' => $subject['subject_ref'],
                ':suspect_window' => $this->json(['from_piece' => $suspectFrom, 'to_piece' => $suspectTo]),
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
    }

    private function impactedMeasurements(string $gageId, array $payload): array
    {
        return $this->db->query(
            "SELECT result_id::text, inspection_id, work_order_ref, lot_ref, serial_ref, shipment_ref, measured_payload
               FROM quality_inspection_result_runtime
              WHERE measured_payload::text ILIKE :gage_like
                AND (:affected_from IS NULL OR recorded_at >= :affected_from::timestamptz)
                AND (:affected_to IS NULL OR recorded_at <= :affected_to::timestamptz)
              ORDER BY recorded_at DESC
              LIMIT 200",
            [
                ':gage_like' => '%' . $gageId . '%',
                ':affected_from' => $this->nullableText($payload['affected_from'] ?? null),
                ':affected_to' => $this->nullableText($payload['affected_to'] ?? null),
            ]
        );
    }

    private function subjectsFromImpacted(array $impacted, array $payload): array
    {
        $subjects = $this->containmentSubjects($payload);
        foreach ($impacted as $row) {
            foreach (['lot_ref' => 'lot', 'serial_ref' => 'serial', 'shipment_ref' => 'shipment', 'work_order_ref' => 'work_order'] as $key => $type) {
                $ref = $this->text($row[$key] ?? '');
                if ($ref !== '') {
                    $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
                }
            }
        }
        return $this->uniqueSubjects($subjects);
    }

    private function containmentSubjects(array $payload): array
    {
        $subjects = [];
        foreach (['affected_lots' => 'lot', 'affected_serials' => 'serial', 'affected_shipments' => 'shipment', 'affected_wip' => 'wip'] as $key => $type) {
            foreach ($this->stringList($payload[$key] ?? []) as $ref) {
                $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
            }
        }
        foreach (['lot_number' => 'lot', 'serial_number' => 'serial', 'shipment_id' => 'shipment', 'work_order_ref' => 'work_order'] as $key => $type) {
            $ref = $this->text($payload[$key] ?? '');
            if ($ref !== '') {
                $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
            }
        }
        return $this->uniqueSubjects($subjects);
    }

    private function writeCaseTrace(string $caseType, string $caseId, string $relatedType, string $relatedRef): void
    {
        if ($caseId === '' || $relatedRef === '') {
            return;
        }
        $this->db->execute(
            "INSERT INTO quality_case_trace_link
                (case_type, case_id, related_type, related_ref, relationship, source_authority, metadata)
             VALUES
                (:case_type, :case_id, :related_type, :related_ref, 'oot_impacts_measurement', :source_authority, CAST(:metadata AS jsonb))
             ON CONFLICT (case_type, case_id, related_type, related_ref, relationship) DO NOTHING",
            [
                ':case_type' => $caseType,
                ':case_id' => $caseId,
                ':related_type' => $relatedType,
                ':related_ref' => $relatedRef,
                ':source_authority' => self::class,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
    }

    private function writeAudit(string $eventType, string $commandName, string $aggregateId, string $actorId, array $payload): void
    {
        $this->db->execute(
            "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, 'tooling_gage_runtime', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
            [
                ':event_type' => $eventType,
                ':aggregate_id' => $aggregateId,
                ':actor_name' => $actorId,
                ':payload' => $this->json($payload),
                ':metadata' => $this->json(['authority' => self::class, 'command_name' => $commandName]),
            ]
        );
    }

    private function writeAuditAndOutbox(string $eventType, string $aggregateId, array $payload, array $result): void
    {
        $body = ['payload_refs' => $this->payloadRefs($payload), 'result' => $result];
        $bodyJson = $this->json($body);
        $this->writeAudit($eventType, (string)($payload['command_name'] ?? $eventType), $aggregateId, $this->actor($payload), $body);
        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                ('tooling_gage_runtime', :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'tooling_gage_runtime.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_id' => $aggregateId,
                ':event_type' => $eventType,
                ':payload' => $bodyJson,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
            ]
        );
    }

    private function uniqueSubjects(array $subjects): array
    {
        $seen = [];
        $out = [];
        foreach ($subjects as $subject) {
            $type = $this->text($subject['subject_type'] ?? '');
            $ref = $this->text($subject['subject_ref'] ?? '');
            if ($type === '' || $ref === '') {
                continue;
            }
            $key = $type . '|' . $ref;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = ['subject_type' => $type, 'subject_ref' => $ref];
        }
        return $out;
    }

    private function decimalOrNull(mixed $value): ?float
    {
        $text = $this->text($value);
        return is_numeric($text) ? (float)$text : null;
    }

    private function actor(array $payload): string
    {
        return $this->requiredAny($payload, ['actor_id', 'operator_id'], 'actor_id');
    }

    private function requiredAny(array $payload, array $keys, string $label): string
    {
        $value = $this->firstText($payload, $keys);
        if ($value === '') {
            throw new DomainCommandException($label . '_required', $label . ' is required.', 400);
        }
        return $value;
    }

    private function firstText(array $payload, array $keys): string
    {
        foreach ($keys as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    private function firstNullableText(array $payload, array $keys): ?string
    {
        $value = $this->firstText($payload, $keys);
        return $value === '' ? null : $value;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function stringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $row) {
            $text = $this->text($row);
            if ($text !== '') {
                $out[] = $text;
            }
        }
        return array_values(array_unique($out));
    }

    private function payloadRefs(array $payload): array
    {
        $refs = [];
        foreach (['tool_id', 'gage_id', 'work_order_ref', 'job_number', 'operation_seq', 'equipment_id', 'lot_number', 'shipment_id'] as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                $refs[$key] = $value;
            }
        }
        return $refs;
    }

    private function hash(mixed $payload): string
    {
        return hash('sha256', $this->json($payload));
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('tooling_runtime_json_failed', 'Tooling runtime payload cannot be encoded.', 500, [], $e);
        }
    }
}
