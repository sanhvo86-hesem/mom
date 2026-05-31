<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

/**
 * Canonical quality hold/eQMS transaction chain for live domain commands.
 *
 * Movement, MES, and shipment commands must query this service inside their
 * transaction. Caller-provided hold arrays are intentionally ignored.
 */
final class QualityHoldService
{
    public function __construct(private readonly Connection $db) {}

    /**
     * @param array<string,mixed> $payload
     */
    public function assertNoActiveHoldsForCommand(string $commandName, array $payload, string $actorId): void
    {
        $subjects = $this->subjectsFromPayload($payload);
        if ($subjects === []) {
            return;
        }

        $holds = $this->activeHolds($subjects);
        if ($holds === []) {
            return;
        }

        $workOrderRef = $this->firstText($payload, ['work_order_ref', 'wo_number', 'job_number']) ?: 'UNKNOWN';
        $operationRef = $this->firstText($payload, ['operation_ref', 'operation_seq']);
        $operatorPayload = [
            'decision' => 'block',
            'blocked_actions' => [$commandName],
            'reasons' => array_map(
                static fn (array $hold): array => [
                    'code' => 'quality_hold_active',
                    'hold_number' => (string)($hold['hold_number'] ?? ''),
                    'subject_type' => (string)($hold['subject_type'] ?? ''),
                    'subject_ref' => (string)($hold['subject_ref'] ?? ''),
                    'severity' => (string)($hold['severity'] ?? ''),
                    'message' => (string)($hold['operator_message'] ?? 'Quality hold is active.'),
                ],
                $holds
            ),
        ];

        $this->writeReadinessHold($commandName, $workOrderRef, $operationRef, $payload, $operatorPayload);
        $this->writeAudit('quality_hold.command_blocked', $commandName, $workOrderRef, $actorId, [
            'subjects' => $subjects,
            'active_holds' => $holds,
            'operator_reason_payload' => $operatorPayload,
        ]);

        throw new DomainCommandException('quality_hold_active', 'Canonical quality hold blocks this command.', 409, [
            'subjects_checked' => $subjects,
            'active_holds' => $holds,
            'operator_reason_payload' => $operatorPayload,
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function applyHold(array $payload): array
    {
        $actorId = $this->actor($payload);
        $subjects = $this->subjectsFromPayload($payload);
        if ($subjects === []) {
            $subjects = $this->subjectsFromList($payload['subjects'] ?? []);
        }
        if ($subjects === []) {
            throw new DomainCommandException('quality_hold_subject_required', 'At least one canonical hold subject is required.', 400);
        }

        return $this->createHold(
            holdScope: $this->stage($payload),
            severity: $this->severity($payload),
            reasonCode: $this->firstText($payload, ['reason_code', 'defect_code']) ?: 'QUALITY_HOLD',
            operatorMessage: $this->firstText($payload, ['operator_message', 'hold_reason']) ?: 'Quality hold is active.',
            actorId: $actorId,
            idempotencyKey: $this->firstText($payload, ['idempotency_key']),
            subjects: $subjects,
            sourceType: $this->firstText($payload, ['source_type']) ?: 'manual_quality_hold',
            sourceRef: $this->firstText($payload, ['source_ref', 'inspection_id', 'ncr_number']) ?: $this->hash($payload),
            sourceCommandName: 'ApplyQualityHoldCommand',
            metadata: ['payload' => $payload]
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function releaseHold(array $payload): array
    {
        $actorId = $this->actor($payload);
        $holdRef = $this->firstText($payload, ['hold_id', 'hold_number']);
        if ($holdRef === '') {
            throw new DomainCommandException('quality_hold_ref_required', 'hold_id or hold_number is required.', 400);
        }
        $reason = $this->firstText($payload, ['release_reason', 'reason']);
        if ($reason === '') {
            throw new DomainCommandException('quality_hold_release_reason_required', 'Release reason is required.', 400);
        }

        $hold = $this->loadActiveHold($holdRef);
        if ($hold === null) {
            throw new DomainCommandException('quality_hold_not_active', 'No active quality hold was found for release.', 409, ['hold_ref' => $holdRef]);
        }

        $evidenceHash = $this->hash([
            'hold' => $hold,
            'release_reason' => $reason,
            'actor_id' => $actorId,
            'evidence' => $payload['evidence'] ?? [],
        ]);
        $holdId = (string)$hold['hold_id'];
        $idempotencyKey = $this->firstText($payload, ['idempotency_key']);

        $release = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_hold_release
                    (hold_id, release_reason, released_by, signature_event_id, evidence_hash_sha256, idempotency_key, metadata)
                VALUES
                    (:hold_id, :release_reason, :released_by, :signature_event_id, :evidence_hash_sha256, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (hold_id, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_hold_release WHERE hold_id = :hold_id AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':hold_id' => $holdId,
                ':release_reason' => $reason,
                ':released_by' => $actorId,
                ':signature_event_id' => $this->nullableText($payload['signature_event_id'] ?? null),
                ':evidence_hash_sha256' => $evidenceHash,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class, 'payload' => $payload]),
            ]
        );

        $this->db->execute(
            "UPDATE quality_hold
                SET hold_status = 'released', released_by = :released_by, released_at = now(), updated_at = now()
              WHERE hold_id = :hold_id AND hold_status = 'active'",
            [':hold_id' => $holdId, ':released_by' => $actorId]
        );

        $this->writeAudit('quality_hold.released', 'ReleaseQualityHoldCommand', $holdId, $actorId, ['hold' => $hold, 'release' => $release]);
        $this->writeOutbox('quality_hold', $holdId, 'QualityHoldReleased', ['hold' => $hold, 'release' => $release], $idempotencyKey);

        return ['hold_id' => $holdId, 'hold_number' => (string)$hold['hold_number'], 'release' => $release ?? []];
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $uomMeasurement
     * @return array<string,mixed>
     */
    public function recordInspectionResult(array $payload, array $uomMeasurement = []): array
    {
        $actorId = $this->actor($payload);
        $inspectionId = $this->required($payload, ['inspection_id', 'inspection_result_id', 'characteristic_ref'], 'inspection_id');
        $status = $this->inspectionStatus($payload);
        $stage = $this->stage($payload);
        $idempotencyKey = $this->firstText($payload, ['idempotency_key']);

        $result = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_inspection_result_runtime
                    (inspection_id, work_order_ref, operation_ref, item_id, lot_ref, serial_ref, shipment_ref,
                     supplier_ref, customer_ref, inspection_stage, result_status, measured_payload,
                     uom_measurement_id, actor_id, idempotency_key, metadata)
                VALUES
                    (:inspection_id, :work_order_ref, :operation_ref, :item_id, :lot_ref, :serial_ref, :shipment_ref,
                     :supplier_ref, :customer_ref, :inspection_stage, :result_status, CAST(:measured_payload AS jsonb),
                     :uom_measurement_id, :actor_id, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (inspection_id, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_inspection_result_runtime
              WHERE inspection_id = :inspection_id AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':inspection_id' => $inspectionId,
                ':work_order_ref' => $this->firstNullableText($payload, ['work_order_ref', 'wo_number', 'job_number']),
                ':operation_ref' => $this->firstNullableText($payload, ['operation_ref', 'operation_seq']),
                ':item_id' => $this->firstNullableText($payload, ['item_id', 'part_number', 'material_id']),
                ':lot_ref' => $this->firstNullableText($payload, ['lot_number', 'lot_ref']),
                ':serial_ref' => $this->firstNullableText($payload, ['serial_number', 'serial_ref']),
                ':shipment_ref' => $this->firstNullableText($payload, ['shipment_id', 'shipment_ref']),
                ':supplier_ref' => $this->firstNullableText($payload, ['supplier_id', 'supplier_ref']),
                ':customer_ref' => $this->firstNullableText($payload, ['customer_id', 'customer_ref']),
                ':inspection_stage' => $stage,
                ':result_status' => $status,
                ':measured_payload' => $this->json(['payload' => $payload, 'uom' => $uomMeasurement]),
                ':uom_measurement_id' => $this->nullableText($uomMeasurement['measurement_id'] ?? null),
                ':actor_id' => $actorId,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );

        if ($status !== 'fail') {
            $this->writeAudit('quality.inspection_result_passed', 'RecordInspectionResultCommand', $inspectionId, $actorId, ['result' => $result]);
            return ['inspection_result' => $result ?? [], 'quality_chain_created' => false];
        }

        $subjects = $this->failureSubjects($stage, $payload);
        $hold = $this->createHold(
            holdScope: $stage,
            severity: $this->severity($payload),
            reasonCode: $this->firstText($payload, ['defect_code', 'reason_code']) ?: 'INSPECTION_FAIL',
            operatorMessage: $this->firstText($payload, ['operator_message']) ?: strtoupper($stage) . ' failed. Canonical quality hold is active.',
            actorId: $actorId,
            idempotencyKey: $idempotencyKey . ':inspection_fail_hold',
            subjects: $subjects,
            sourceType: 'inspection_result',
            sourceRef: $inspectionId,
            sourceCommandName: 'RecordInspectionResultCommand',
            metadata: ['inspection_result' => $result, 'uom' => $uomMeasurement]
        );

        $qualityOrder = $this->createQualityOrder($stage, $inspectionId, (string)($result['result_id'] ?? ''), $actorId, $idempotencyKey, $payload);
        $ncr = $this->createNcr($stage, $qualityOrder, $hold, $result ?? [], $actorId, $idempotencyKey, $payload);
        $this->linkCase('quality_hold', (string)$hold['hold_id'], $subjects, 'holds_subject');
        $this->linkCase('ncr', (string)$ncr['ncr_id'], $subjects, 'nonconformance_impacts');
        $this->writeAudit('quality.inspection_result_failed_chain_created', 'RecordInspectionResultCommand', $inspectionId, $actorId, [
            'result' => $result,
            'hold' => $hold,
            'quality_order' => $qualityOrder,
            'ncr' => $ncr,
        ]);
        $this->writeOutbox('quality_inspection_result', $inspectionId, 'InspectionFailureQualityChainCreated', [
            'result' => $result,
            'hold' => $hold,
            'quality_order' => $qualityOrder,
            'ncr' => $ncr,
        ], $idempotencyKey);

        return [
            'inspection_result' => $result ?? [],
            'quality_order' => $qualityOrder,
            'ncr' => $ncr,
            'hold' => $hold,
            'quality_chain_created' => true,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function recordMrbDisposition(array $payload): array
    {
        $actorId = $this->actor($payload);
        $dispositionType = $this->required($payload, ['disposition_type'], 'disposition_type');
        $customerApprovalRequired = filter_var($payload['customer_approval_required'] ?? false, FILTER_VALIDATE_BOOL);
        if ($dispositionType === 'use_as_is' && $customerApprovalRequired && $this->firstText($payload, ['customer_approval_ref']) === '') {
            throw new DomainCommandException('mrb_customer_approval_required', 'Use-as-is MRB disposition requires customer approval reference.', 409);
        }

        $ncr = $this->loadNcr($payload);
        $holdId = $this->firstNullableText($payload, ['hold_id']) ?? (isset($ncr['hold_id']) ? (string)$ncr['hold_id'] : null);
        $idempotencyKey = $this->firstText($payload, ['idempotency_key']);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO mrb_disposition_runtime
                    (ncr_id, hold_id, disposition_type, disposition_status, customer_approval_required,
                     customer_approval_ref, actor_id, signature_event_id, idempotency_key, metadata)
                VALUES
                    (:ncr_id, :hold_id, :disposition_type, 'approved', :customer_approval_required,
                     :customer_approval_ref, :actor_id, :signature_event_id, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (ncr_id, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM mrb_disposition_runtime WHERE ncr_id = :ncr_id AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':ncr_id' => $ncr['ncr_id'] ?? null,
                ':hold_id' => $holdId,
                ':disposition_type' => $dispositionType,
                ':customer_approval_required' => $customerApprovalRequired,
                ':customer_approval_ref' => $this->firstNullableText($payload, ['customer_approval_ref']),
                ':actor_id' => $actorId,
                ':signature_event_id' => $this->nullableText($payload['signature_event_id'] ?? null),
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class, 'payload' => $payload]),
            ]
        );

        if (isset($ncr['ncr_id'])) {
            $ncrStatus = in_array($dispositionType, ['use_as_is', 'rework', 'scrap', 'return_to_supplier'], true)
                ? $dispositionType
                : 'pending_mrb';
            $this->db->execute(
                "UPDATE quality_nonconformance_runtime
                    SET disposition_status = :status, updated_at = now()
                  WHERE ncr_id = :ncr_id",
                [':ncr_id' => $ncr['ncr_id'], ':status' => $ncrStatus]
            );
        }

        $this->writeAudit('quality.mrb_disposition_recorded', 'RecordMrbDispositionCommand', (string)($ncr['ncr_number'] ?? ''), $actorId, ['disposition' => $row, 'ncr' => $ncr]);
        $this->writeOutbox('mrb_disposition', (string)($row['disposition_id'] ?? $idempotencyKey), 'MrbDispositionRecorded', ['disposition' => $row, 'ncr' => $ncr], $idempotencyKey);

        return ['mrb_disposition' => $row ?? [], 'ncr' => $ncr];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function traceImpactGraph(string $caseType, string $caseId): array
    {
        return $this->db->query(
            "SELECT case_type, case_id, related_type, related_ref, relationship, source_authority, metadata, created_at
               FROM quality_case_trace_link
              WHERE case_type = :case_type AND case_id = :case_id
              ORDER BY created_at DESC",
            [':case_type' => $caseType, ':case_id' => $caseId]
        );
    }

    /**
     * @param list<array{subject_type:string,subject_ref:string}> $subjects
     * @return list<array<string,mixed>>
     */
    private function activeHolds(array $subjects): array
    {
        $clauses = [];
        $params = [];
        foreach ($subjects as $index => $subject) {
            $clauses[] = "(s.subject_type = :subject_type_{$index} AND s.subject_ref = :subject_ref_{$index})";
            $params[":subject_type_{$index}"] = $subject['subject_type'];
            $params[":subject_ref_{$index}"] = $subject['subject_ref'];
        }

        return $this->db->query(
            "SELECT h.hold_id, h.hold_number, h.hold_scope, h.severity, h.reason_code,
                    h.operator_message, s.subject_type, s.subject_ref
               FROM quality_hold h
               JOIN quality_hold_subject s ON s.hold_id = h.hold_id
              WHERE h.hold_status = 'active'
                AND (" . implode(' OR ', $clauses) . ")
              ORDER BY CASE h.severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 ELSE 2 END, h.created_at DESC
              LIMIT 20",
            $params
        );
    }

    /**
     * @param list<array{subject_type:string,subject_ref:string}> $subjects
     * @param array<string,mixed> $metadata
     * @return array<string,mixed>
     */
    private function createHold(
        string $holdScope,
        string $severity,
        string $reasonCode,
        string $operatorMessage,
        string $actorId,
        string $idempotencyKey,
        array $subjects,
        string $sourceType,
        string $sourceRef,
        string $sourceCommandName,
        array $metadata
    ): array {
        $holdNumber = 'QH-' . substr($this->hash([$sourceType, $sourceRef, $subjects, $idempotencyKey]), 0, 12);
        $hold = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_hold
                    (hold_number, hold_status, hold_scope, severity, reason_code, operator_message, created_by, idempotency_key, metadata)
                VALUES
                    (:hold_number, 'active', :hold_scope, :severity, :reason_code, :operator_message, :created_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (hold_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_hold WHERE hold_number = :hold_number
             LIMIT 1",
            [
                ':hold_number' => $holdNumber,
                ':hold_scope' => $holdScope,
                ':severity' => $severity,
                ':reason_code' => $reasonCode,
                ':operator_message' => $operatorMessage,
                ':created_by' => $actorId,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json($metadata + ['authority' => self::class]),
            ]
        );
        if (!is_array($hold)) {
            throw new DomainCommandException('quality_hold_write_failed', 'Quality hold could not be created.', 500);
        }

        foreach ($subjects as $subject) {
            $this->db->execute(
                "INSERT INTO quality_hold_subject (hold_id, subject_type, subject_ref, relationship, metadata)
                 VALUES (:hold_id, :subject_type, :subject_ref, 'held_subject', CAST(:metadata AS jsonb))
                 ON CONFLICT (hold_id, subject_type, subject_ref) DO NOTHING",
                [
                    ':hold_id' => $hold['hold_id'],
                    ':subject_type' => $subject['subject_type'],
                    ':subject_ref' => $subject['subject_ref'],
                    ':metadata' => $this->json(['authority' => self::class]),
                ]
            );
        }

        $this->db->execute(
            "INSERT INTO quality_hold_source
                (hold_id, source_type, source_ref, source_command_name, source_idempotency_key, metadata)
             VALUES
                (:hold_id, :source_type, :source_ref, :source_command_name, :source_idempotency_key, CAST(:metadata AS jsonb))
             ON CONFLICT (hold_id, source_type, source_ref) DO NOTHING",
            [
                ':hold_id' => $hold['hold_id'],
                ':source_type' => $sourceType,
                ':source_ref' => $sourceRef,
                ':source_command_name' => $sourceCommandName,
                ':source_idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );

        $this->writeAudit('quality_hold.applied', $sourceCommandName, (string)$hold['hold_number'], $actorId, ['hold' => $hold, 'subjects' => $subjects]);
        $this->writeOutbox('quality_hold', (string)$hold['hold_id'], 'QualityHoldApplied', ['hold' => $hold, 'subjects' => $subjects], $idempotencyKey);

        return $hold + ['subjects' => $subjects];
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<array{subject_type:string,subject_ref:string}>
     */
    private function failureSubjects(string $stage, array $payload): array
    {
        $subjects = $this->subjectsFromPayload($payload);
        if ($stage === 'iqc' && $this->firstText($payload, ['supplier_id', 'supplier_ref']) !== '') {
            $subjects[] = ['subject_type' => 'supplier', 'subject_ref' => $this->firstText($payload, ['supplier_id', 'supplier_ref'])];
        }
        if ($stage === 'oqc' && $this->firstText($payload, ['shipment_id', 'shipment_ref']) !== '') {
            $subjects[] = ['subject_type' => 'shipment', 'subject_ref' => $this->firstText($payload, ['shipment_id', 'shipment_ref'])];
        }

        return $this->uniqueSubjects($subjects);
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<array{subject_type:string,subject_ref:string}>
     */
    private function subjectsFromPayload(array $payload): array
    {
        $pairs = [
            'lot' => ['lot_number', 'lot_ref'],
            'serial' => ['serial_number', 'serial_ref'],
            'container' => ['container_id', 'container_ref'],
            'wip' => ['wip_id', 'wip_ref'],
            'work_order' => ['work_order_ref', 'wo_number', 'job_number'],
            'job' => ['job_ref'],
            'operation' => ['operation_ref', 'operation_seq'],
            'shipment' => ['shipment_id', 'shipment_ref'],
            'supplier' => ['supplier_id', 'supplier_ref'],
            'customer' => ['customer_id', 'customer_ref'],
            'item' => ['item_id', 'part_number', 'material_id', 'material_ref'],
            'equipment' => ['equipment_id', 'machine_ref'],
            'tool' => ['tool_id', 'tool_ref'],
        ];
        $subjects = [];
        foreach ($pairs as $type => $keys) {
            $ref = $this->firstText($payload, $keys);
            if ($ref !== '') {
                $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
            }
        }

        return $this->uniqueSubjects($subjects);
    }

    /**
     * @param mixed $raw
     * @return list<array{subject_type:string,subject_ref:string}>
     */
    private function subjectsFromList(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $subjects = [];
        foreach ($raw as $row) {
            if (!is_array($row)) {
                continue;
            }
            $type = $this->firstText($row, ['subject_type', 'type']);
            $ref = $this->firstText($row, ['subject_ref', 'ref']);
            if ($type !== '' && $ref !== '') {
                $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
            }
        }
        return $this->uniqueSubjects($subjects);
    }

    /**
     * @param list<array{subject_type:string,subject_ref:string}> $subjects
     * @return list<array{subject_type:string,subject_ref:string}>
     */
    private function uniqueSubjects(array $subjects): array
    {
        $seen = [];
        $out = [];
        foreach ($subjects as $subject) {
            $key = $subject['subject_type'] . '|' . $subject['subject_ref'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $subject;
        }
        return $out;
    }

    private function createQualityOrder(string $stage, string $sourceRef, string $resultId, string $actorId, string $idempotencyKey, array $payload): array
    {
        $number = 'QO-' . substr($this->hash([$stage, $sourceRef, $idempotencyKey]), 0, 12);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_order_runtime
                    (quality_order_number, source_result_id, order_type, order_status, source_ref, created_by, idempotency_key, metadata)
                VALUES
                    (:number, :source_result_id, :order_type, 'open', :source_ref, :created_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (quality_order_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_order_runtime WHERE quality_order_number = :number
             LIMIT 1",
            [
                ':number' => $number,
                ':source_result_id' => $resultId !== '' ? $resultId : null,
                ':order_type' => in_array($stage, ['iqc', 'ipqc', 'oqc'], true) ? $stage : 'internal_quality',
                ':source_ref' => $sourceRef,
                ':created_by' => $actorId,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class, 'payload' => $payload]),
            ]
        );
        return is_array($row) ? $row : [];
    }

    private function createNcr(string $stage, array $qualityOrder, array $hold, array $result, string $actorId, string $idempotencyKey, array $payload): array
    {
        $number = 'NCR-' . substr($this->hash([$stage, $qualityOrder, $hold, $idempotencyKey]), 0, 12);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO quality_nonconformance_runtime
                    (ncr_number, quality_order_id, hold_id, source_result_id, severity, defect_code, source_stage, disposition_status, created_by, idempotency_key, metadata)
                VALUES
                    (:number, :quality_order_id, :hold_id, :source_result_id, :severity, :defect_code, :source_stage, 'pending_mrb', :created_by, :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (ncr_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM quality_nonconformance_runtime WHERE ncr_number = :number
             LIMIT 1",
            [
                ':number' => $number,
                ':quality_order_id' => $qualityOrder['quality_order_id'] ?? null,
                ':hold_id' => $hold['hold_id'] ?? null,
                ':source_result_id' => $result['result_id'] ?? null,
                ':severity' => $this->severity($payload),
                ':defect_code' => $this->firstNullableText($payload, ['defect_code', 'reason_code']),
                ':source_stage' => $stage,
                ':created_by' => $actorId,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                ':metadata' => $this->json(['authority' => self::class, 'payload' => $payload]),
            ]
        );
        return is_array($row) ? $row : [];
    }

    /**
     * @param list<array{subject_type:string,subject_ref:string}> $subjects
     */
    private function linkCase(string $caseType, string $caseId, array $subjects, string $relationship): void
    {
        foreach ($subjects as $subject) {
            $this->db->execute(
                "INSERT INTO quality_case_trace_link
                    (case_type, case_id, related_type, related_ref, relationship, source_authority, metadata)
                 VALUES
                    (:case_type, :case_id, :related_type, :related_ref, :relationship, :source_authority, CAST(:metadata AS jsonb))
                 ON CONFLICT (case_type, case_id, related_type, related_ref, relationship) DO NOTHING",
                [
                    ':case_type' => $caseType,
                    ':case_id' => $caseId,
                    ':related_type' => $subject['subject_type'],
                    ':related_ref' => $subject['subject_ref'],
                    ':relationship' => $relationship,
                    ':source_authority' => self::class,
                    ':metadata' => $this->json(['authority' => self::class]),
                ]
            );
        }
    }

    private function loadActiveHold(string $holdRef): ?array
    {
        return $this->db->queryOne(
            "SELECT * FROM quality_hold
              WHERE hold_status = 'active'
                AND (hold_id::text = :hold_ref OR hold_number = :hold_ref)
              LIMIT 1",
            [':hold_ref' => $holdRef]
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function loadNcr(array $payload): array
    {
        $ref = $this->firstText($payload, ['ncr_id', 'ncr_number']);
        if ($ref === '') {
            throw new DomainCommandException('ncr_ref_required', 'ncr_id or ncr_number is required.', 400);
        }
        $row = $this->db->queryOne(
            "SELECT * FROM quality_nonconformance_runtime
              WHERE ncr_id::text = :ref OR ncr_number = :ref
              LIMIT 1",
            [':ref' => $ref]
        );
        if (!is_array($row)) {
            throw new DomainCommandException('ncr_not_found', 'NCR was not found.', 404, ['ncr_ref' => $ref]);
        }
        return $row;
    }

    /**
     * @param array<string,mixed> $operatorPayload
     */
    private function writeReadinessHold(string $commandName, string $workOrderRef, string $operationRef, array $payload, array $operatorPayload): void
    {
        $hash = $this->hash([$commandName, $workOrderRef, $operationRef, $operatorPayload]);
        $this->db->execute(
            "INSERT INTO resource_readiness_evidence_state
                (work_order_ref, operation_ref, command_scope, evidence_key, resource_type, resource_ref,
                 readiness_status, evidence_hash_sha256, source_authority, operator_message, metadata)
             VALUES
                (:work_order_ref, :operation_ref, :command_scope, 'quality_hold', 'quality_hold', :resource_ref,
                 'held', :evidence_hash_sha256, :source_authority, :operator_message, CAST(:metadata AS jsonb))
             ON CONFLICT (work_order_ref, operation_ref, command_scope, evidence_key, resource_ref)
             DO UPDATE SET readiness_status = 'held', evidence_hash_sha256 = EXCLUDED.evidence_hash_sha256,
                           operator_message = EXCLUDED.operator_message, metadata = EXCLUDED.metadata, updated_at = now()",
            [
                ':work_order_ref' => $workOrderRef,
                ':operation_ref' => $operationRef !== '' ? $operationRef : null,
                ':command_scope' => $commandName,
                ':resource_ref' => $this->firstText($payload, ['lot_number', 'lot_ref', 'work_order_ref', 'job_number']) ?: $workOrderRef,
                ':evidence_hash_sha256' => $hash,
                ':source_authority' => self::class,
                ':operator_message' => 'Canonical quality hold is active.',
                ':metadata' => $this->json($operatorPayload),
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writeAudit(string $eventType, string $commandName, string $aggregateId, string $actorId, array $payload): void
    {
        $this->db->execute(
            "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, 'quality_hold_chain', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
            [
                ':event_type' => $eventType,
                ':aggregate_id' => $aggregateId,
                ':actor_name' => $actorId,
                ':payload' => $this->json($payload),
                ':metadata' => $this->json(['authority' => self::class, 'command_name' => $commandName]),
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writeOutbox(string $aggregateType, string $aggregateId, string $eventType, array $payload, string $idempotencyKey): void
    {
        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                (:aggregate_type, :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'quality_hold_chain.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_type' => $aggregateType,
                ':aggregate_id' => $aggregateId,
                ':event_type' => $eventType,
                ':payload' => $this->json($payload),
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function inspectionStatus(array $payload): string
    {
        if (array_key_exists('passed', $payload)) {
            return filter_var($payload['passed'], FILTER_VALIDATE_BOOL) ? 'pass' : 'fail';
        }
        $raw = strtolower($this->firstText($payload, ['result_status', 'inspection_disposition', 'disposition', 'result']));
        return in_array($raw, ['fail', 'failed', 'reject', 'rejected', 'ng', 'nonconforming', 'nonconformance'], true) ? 'fail' : 'pass';
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function stage(array $payload): string
    {
        $stage = strtolower($this->firstText($payload, ['inspection_stage', 'inspection_type', 'hold_scope']));
        return in_array($stage, ['iqc', 'ipqc', 'oqc', 'fai', 'final', 'other'], true) ? $stage : 'ipqc';
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function severity(array $payload): string
    {
        $severity = strtolower($this->firstText($payload, ['severity', 'risk_level']));
        return in_array($severity, ['minor', 'major', 'critical'], true) ? $severity : 'major';
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function actor(array $payload): string
    {
        return $this->required($payload, ['actor_id', 'operator_id'], 'actor_id');
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function required(array $payload, array $keys, string $label): string
    {
        $value = $this->firstText($payload, $keys);
        if ($value === '') {
            throw new DomainCommandException($label . '_required', $label . ' is required.', 400);
        }
        return $value;
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
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

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function firstNullableText(array $payload, array $keys): ?string
    {
        $value = $this->firstText($payload, $keys);
        return $value === '' ? null : $value;
    }

    private function nullableText(mixed $value): ?string
    {
        $value = $this->text($value);
        return $value === '' ? null : $value;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
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
            throw new DomainCommandException('quality_hold_json_failed', 'Quality hold payload cannot be encoded.', 500, [], $e);
        }
    }
}
