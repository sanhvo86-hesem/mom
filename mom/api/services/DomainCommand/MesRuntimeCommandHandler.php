<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class MesRuntimeCommandHandler
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?ResourceReadinessService $readiness = null,
        private readonly ?UomCommandQuantityNormalizer $uomNormalizer = null,
        private readonly ?QualityHoldService $qualityHolds = null,
    ) {}

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function startJob(array $command): array
    {
        $this->qualityHolds()->assertNoActiveHoldsForCommand('StartJobCommand', $command, $this->actor($command));
        $readiness = $this->readiness($command, 'StartJobCommand');
        $jobNumber = $this->requiredAny($command, ['job_number', 'work_order_ref', 'wo_number'], 'job_number');
        $operationSeq = (int)$this->requiredAny($command, ['operation_seq', 'operation_ref'], 'operation_seq');
        $equipmentId = $this->requiredAny($command, ['equipment_id', 'machine_ref', 'work_unit_ref'], 'equipment_id');
        $actorId = $this->actor($command);

        $this->db->execute(
            "INSERT INTO mes_job_execution (job_number, first_setup_start, current_operation_seq, current_equipment_id, operator_ids, machines_used, metadata)
             VALUES (:job_number, now(), :operation_seq, :equipment_id, ARRAY[CAST(:operator_id AS text)], ARRAY[CAST(:equipment_id AS text)], CAST(:metadata AS jsonb))
             ON CONFLICT (job_number) DO UPDATE SET
                first_setup_start = COALESCE(mes_job_execution.first_setup_start, EXCLUDED.first_setup_start),
                current_operation_seq = EXCLUDED.current_operation_seq,
                current_equipment_id = EXCLUDED.current_equipment_id,
                updated_at = now()",
            [
                ':job_number' => $jobNumber,
                ':operation_seq' => $operationSeq,
                ':equipment_id' => $equipmentId,
                ':operator_id' => $actorId,
                ':metadata' => $this->json(['readiness_snapshot_id' => $readiness['readiness_snapshot_id'] ?? '']),
            ]
        );

        $this->db->execute(
            "INSERT INTO mes_operation_execution (job_number, operation_seq, equipment_id, setup_start_at, operator_id, phase, metadata)
             VALUES (:job_number, :operation_seq, :equipment_id, now(), :operator_id, 'SETUP', CAST(:metadata AS jsonb))
             ON CONFLICT (job_number, operation_seq, equipment_id) DO UPDATE SET
                setup_start_at = COALESCE(mes_operation_execution.setup_start_at, EXCLUDED.setup_start_at),
                operator_id = EXCLUDED.operator_id,
                phase = 'SETUP',
                updated_at = now()",
            [
                ':job_number' => $jobNumber,
                ':operation_seq' => $operationSeq,
                ':equipment_id' => $equipmentId,
                ':operator_id' => $actorId,
                ':metadata' => $this->json(['readiness_snapshot_id' => $readiness['readiness_snapshot_id'] ?? '']),
            ]
        );

        $event = $this->writeOperationalEvent('order.work_execution', 'order', 'job_started', $command, $readiness);
        $this->writeAuditAndOutbox('mes.job_started', $jobNumber, $command, $event, $readiness);

        return ['job_number' => $jobNumber, 'operation_seq' => $operationSeq, 'event_id' => $event['event_id'] ?? '', 'readiness' => $readiness];
    }

    public function issueMaterial(array $command): array
    {
        $this->qualityHolds()->assertNoActiveHoldsForCommand('IssueMaterialToWorkOrderCommand', $command, $this->actor($command));
        $uomPayload = $command;
        if (!isset($uomPayload['issue_quantity']) && isset($uomPayload['qty_consumed'])) {
            $uomPayload['issue_quantity'] = $uomPayload['qty_consumed'];
        }
        if (!isset($uomPayload['material_uom']) && isset($uomPayload['qty_uom'])) {
            $uomPayload['material_uom'] = $uomPayload['qty_uom'];
        }
        $uomMeasurement = $this->normalizeUom($uomPayload, 'IssueMaterialToWorkOrderCommand', 'issue_quantity');
        $readiness = $this->readiness($command, 'IssueMaterialToWorkOrderCommand');
        $jobNumber = $this->requiredAny($command, ['job_number', 'work_order_ref', 'wo_number'], 'job_number');
        $operationSeq = (int)$this->text($command['operation_seq'] ?? $command['operation_ref'] ?? '0');
        $itemId = $this->requiredAny($command, ['item_id', 'item_ref', 'material_ref'], 'item_id');
        $qty = (string)$uomMeasurement['converted_magnitude'];
        $uom = (string)$uomMeasurement['target_unit_code'];
        $commandWithUom = $this->withUomEvidence($command, [$uomMeasurement]);

        $this->db->execute(
            "INSERT INTO mes_material_consumption
                (job_number, operation_seq, equipment_id, item_id, lot_number, consumption_type, qty_consumed, qty_uom, operator_id, metadata)
             VALUES
                (:job_number, :operation_seq, :equipment_id, :item_id, :lot_number, 'CONSUMED', :qty_consumed, :qty_uom, :operator_id, CAST(:metadata AS jsonb))",
            [
                ':job_number' => $jobNumber,
                ':operation_seq' => $operationSeq,
                ':equipment_id' => $this->nullableText($command['equipment_id'] ?? $command['machine_ref'] ?? null),
                ':item_id' => $itemId,
                ':lot_number' => $this->nullableText($command['lot_number'] ?? $command['lot_ref'] ?? null),
                ':qty_consumed' => $qty,
                ':qty_uom' => $uom,
                ':operator_id' => $this->actor($command),
                ':metadata' => $this->json([
                    'readiness_snapshot_id' => $readiness['readiness_snapshot_id'] ?? '',
                    'uom_measurement_id' => $uomMeasurement['measurement_id'] ?? '',
                    'uom_authority' => $uomMeasurement['authority'] ?? '',
                ]),
            ]
        );

        $event = $this->writeOperationalEvent('order.work_execution', 'order', 'material_issued', $commandWithUom, $readiness);
        $this->writeAuditAndOutbox('mes.material_issued', $jobNumber, $commandWithUom, $event, $readiness);

        return ['job_number' => $jobNumber, 'event_id' => $event['event_id'] ?? '', 'readiness' => $readiness, 'uom' => $uomMeasurement];
    }

    public function loadTool(array $command): array
    {
        $this->qualityHolds()->assertNoActiveHoldsForCommand('LoadToolCommand', $command, $this->actor($command));
        $readiness = $this->readiness($command, 'LoadToolCommand');
        $toolId = $this->requiredAny($command, ['tool_id', 'tool_ref'], 'tool_id');
        $equipmentId = $this->requiredAny($command, ['equipment_id', 'machine_ref'], 'equipment_id');
        $jobNumber = $this->text($command['job_number'] ?? $command['work_order_ref'] ?? '');

        $this->db->execute(
            "INSERT INTO mes_tool_life_events
                (event_time, tool_id, equipment_id, event_type, magazine_position, life_count_at_event, life_remaining_pct, job_number, operator_id, metadata)
             VALUES
                (now(), :tool_id, :equipment_id, 'LOAD', :magazine_position, :life_count_at_event, :life_remaining_pct, :job_number, :operator_id, CAST(:metadata AS jsonb))",
            [
                ':tool_id' => $toolId,
                ':equipment_id' => $equipmentId,
                ':magazine_position' => $this->nullableText($command['magazine_position'] ?? null),
                ':life_count_at_event' => $this->nullableText($command['life_count_at_event'] ?? null),
                ':life_remaining_pct' => $this->nullableText($command['life_remaining_pct'] ?? null),
                ':job_number' => $jobNumber !== '' ? $jobNumber : null,
                ':operator_id' => $this->actor($command),
                ':metadata' => $this->json(['readiness_snapshot_id' => $readiness['readiness_snapshot_id'] ?? '']),
            ]
        );

        $event = $this->writeOperationalEvent('order.work_execution', 'order', 'tool_loaded', $command, $readiness);
        $this->writeAuditAndOutbox('mes.tool_loaded', $toolId, $command, $event, $readiness);

        return ['tool_id' => $toolId, 'event_id' => $event['event_id'] ?? '', 'readiness' => $readiness];
    }

    public function recordInspectionResult(array $command): array
    {
        $uomMeasurement = $this->normalizeUom($command, 'RecordInspectionResultCommand', 'actual_value');
        $readiness = $this->readiness($command, 'RecordInspectionResultCommand');
        $inspectionId = $this->requiredAny($command, ['inspection_id', 'inspection_result_id', 'characteristic_ref'], 'inspection_id');
        $commandWithUom = $this->withUomEvidence($command, [$uomMeasurement]);
        $qualityChain = $this->qualityHolds()->recordInspectionResult($commandWithUom, $uomMeasurement);
        $event = $this->writeOperationalEvent('quality.inspection', 'quality', 'inspection_result_recorded', $commandWithUom, $readiness);
        $this->writeAuditAndOutbox('quality.inspection_result_recorded', $inspectionId, $commandWithUom, $event, $readiness);

        return [
            'inspection_id' => $inspectionId,
            'event_id' => $event['event_id'] ?? '',
            'readiness' => $readiness,
            'uom' => $uomMeasurement,
            'quality_chain' => $qualityChain,
        ];
    }

    public function completeOperation(array $command): array
    {
        $this->qualityHolds()->assertNoActiveHoldsForCommand('CompleteOperationCommand', $command, $this->actor($command));
        $goodPayload = $command;
        if (!isset($goodPayload['completed_quantity']) && isset($goodPayload['qty_good'])) {
            $goodPayload['completed_quantity'] = $goodPayload['qty_good'];
        }
        $goodUom = $this->normalizeUom($goodPayload, 'CompleteOperationCommand', 'completed_quantity');
        $scrapUom = null;
        $scrapMagnitude = $this->text($command['scrap_quantity'] ?? $command['qty_scrap'] ?? '');
        if ($scrapMagnitude !== '' && $scrapMagnitude !== '0') {
            $scrapPayload = $command;
            $scrapPayload['completed_quantity'] = $scrapMagnitude;
            $scrapUom = $this->normalizeUom($scrapPayload, 'CompleteOperationCommand', 'scrap_quantity');
        }
        $readiness = $this->readiness($command, 'CompleteOperationCommand');
        $jobNumber = $this->requiredAny($command, ['job_number', 'work_order_ref', 'wo_number'], 'job_number');
        $operationSeq = (int)$this->requiredAny($command, ['operation_seq', 'operation_ref'], 'operation_seq');
        $equipmentId = $this->requiredAny($command, ['equipment_id', 'machine_ref', 'work_unit_ref'], 'equipment_id');
        $commandWithUom = $this->withUomEvidence($command, array_values(array_filter([$goodUom, $scrapUom])));

        $this->db->execute(
            "UPDATE mes_operation_execution
                SET last_piece_at = COALESCE(last_piece_at, now()),
                    qty_good = COALESCE(qty_good, 0) + :qty_good,
                    qty_scrap = COALESCE(qty_scrap, 0) + :qty_scrap,
                    is_complete = TRUE,
                    phase = 'TEARDOWN',
                    updated_at = now()
              WHERE job_number = :job_number
                AND operation_seq = :operation_seq
                AND equipment_id = :equipment_id",
            [
                ':job_number' => $jobNumber,
                ':operation_seq' => $operationSeq,
                ':equipment_id' => $equipmentId,
                ':qty_good' => (string)$goodUom['converted_magnitude'],
                ':qty_scrap' => $scrapUom !== null ? (string)$scrapUom['converted_magnitude'] : '0',
            ]
        );

        $event = $this->writeOperationalEvent('order.work_execution', 'order', 'operation_completed', $commandWithUom, $readiness);
        $this->writeAuditAndOutbox('mes.operation_completed', $jobNumber, $commandWithUom, $event, $readiness);

        return [
            'job_number' => $jobNumber,
            'operation_seq' => $operationSeq,
            'event_id' => $event['event_id'] ?? '',
            'readiness' => $readiness,
            'uom' => array_values(array_filter([$goodUom, $scrapUom])),
        ];
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    private function normalizeUom(array $command, string $commandName, string $quantityRole): array
    {
        return ($this->uomNormalizer ?? new UomCommandQuantityNormalizer($this->db))->normalizeAndRecord(
            $commandName,
            $command,
            $this->actor($command),
            $this->requiredAny($command, ['idempotency_key'], 'idempotency_key'),
            $quantityRole,
            [
                'domain' => 'mes_runtime_command',
                'trace_id' => $this->text($command['trace_id'] ?? $command['correlation_id'] ?? ''),
            ]
        );
    }

    /**
     * @param array<string,mixed> $command
     * @param list<array<string,mixed>> $measurements
     * @return array<string,mixed>
     */
    private function withUomEvidence(array $command, array $measurements): array
    {
        $command['uom_authority_evidence'] = array_map(
            static fn (array $measurement): array => [
                'authority' => (string)($measurement['authority'] ?? ''),
                'measurement_id' => (string)($measurement['measurement_id'] ?? ''),
                'quantity_role' => (string)($measurement['quantity_role'] ?? ''),
                'converted_magnitude' => (string)($measurement['converted_magnitude'] ?? ''),
                'target_unit_code' => (string)($measurement['target_unit_code'] ?? ''),
                'measval_hash_sha256' => (string)($measurement['measval_hash_sha256'] ?? ''),
            ],
            $measurements
        );

        return $command;
    }

    private function readiness(array $command, string $commandName): array
    {
        return ($this->readiness ?? new ResourceReadinessService($this->db))->evaluateAndSnapshot(
            $commandName,
            $command,
            $this->actor($command),
            $this->requiredAny($command, ['idempotency_key'], 'idempotency_key')
        );
    }

    private function qualityHolds(): QualityHoldService
    {
        return $this->qualityHolds ?? new QualityHoldService($this->db);
    }

    private function writeOperationalEvent(string $eventType, string $category, string $semanticEvent, array $command, array $readiness): array
    {
        $payload = [
            'semantic_event' => $semanticEvent,
            'command' => $command,
            'readiness' => $readiness,
        ];
        $payloadJson = $this->json($payload);
        $eventId = 'mes-' . hash('sha256', $semanticEvent . '|' . ($command['idempotency_key'] ?? '') . '|' . $payloadJson);
        $eventHash = hash('sha256', $eventId . '|' . $payloadJson);
        $fingerprint = hash('sha256', $payloadJson);

        try {
            $row = $this->db->queryOne(
                "WITH inserted AS (
                    INSERT INTO mes_operational_event_ledger
                        (event_id, event_type, event_category, fingerprint_hash, event_hash, correlation_id,
                         source_system, source_aggregate_type, source_aggregate_id, wo_number, operation_seq,
                         actor_id, occurred_at, idempotency_key, payload, metadata)
                    VALUES
                        (:event_id, :event_type, :event_category, :fingerprint_hash, :event_hash, :correlation_id,
                         'mom', :source_aggregate_type, :source_aggregate_id, :wo_number, :operation_seq,
                         :actor_id, now(), :idempotency_key, CAST(:payload AS jsonb), CAST(:metadata AS jsonb))
                    ON CONFLICT (event_id) DO NOTHING
                    RETURNING event_id, event_hash
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT event_id, event_hash FROM mes_operational_event_ledger WHERE event_id = :event_id
                 LIMIT 1",
                [
                    ':event_id' => $eventId,
                    ':event_type' => $eventType,
                    ':event_category' => $category,
                    ':fingerprint_hash' => $fingerprint,
                    ':event_hash' => $eventHash,
                    ':correlation_id' => $this->text($command['correlation_id'] ?? $command['idempotency_key'] ?? $eventId),
                    ':source_aggregate_type' => (string)($command['source_aggregate_type'] ?? 'work_order'),
                    ':source_aggregate_id' => $this->text($command['work_order_ref'] ?? $command['job_number'] ?? $command['tool_id'] ?? $eventId),
                    ':wo_number' => $this->nullableText($command['work_order_ref'] ?? $command['wo_number'] ?? $command['job_number'] ?? null),
                    ':operation_seq' => $this->nullableText($command['operation_seq'] ?? $command['operation_ref'] ?? null),
                    ':actor_id' => $this->actor($command),
                    ':idempotency_key' => $this->nullableText($command['idempotency_key'] ?? null),
                    ':payload' => $payloadJson,
                    ':metadata' => $this->json(['authority' => 'DomainCommand.MesRuntimeCommandHandler']),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('mes_event_write_failed', 'MES runtime event could not be written.', 500, [], $e);
        }

        return is_array($row) ? $row : ['event_id' => $eventId, 'event_hash' => $eventHash];
    }

    private function writeAuditAndOutbox(string $eventType, string $aggregateId, array $command, array $event, array $readiness): void
    {
        $payloadJson = $this->json(['command' => $command, 'event' => $event, 'readiness' => $readiness]);
        $this->db->execute(
            "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, 'mes_runtime_command', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
            [
                ':event_type' => $eventType,
                ':aggregate_id' => $aggregateId,
                ':actor_name' => $this->actor($command),
                ':payload' => $payloadJson,
                ':metadata' => $this->json(['authority' => 'DomainCommand.MesRuntimeCommandHandler']),
            ]
        );

        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                ('mes_runtime_command', :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'mes_runtime_command.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_id' => $aggregateId,
                ':event_type' => $eventType,
                ':payload' => $payloadJson,
                ':idempotency_key' => $this->nullableText($command['idempotency_key'] ?? null),
            ]
        );
    }

    private function requiredAny(array $payload, array $keys, string $label): string
    {
        foreach ($keys as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                return $value;
            }
        }

        throw new DomainCommandException($label . '_required', $label . ' is required.', 400);
    }

    private function actor(array $command): string
    {
        return $this->requiredAny($command, ['actor_id', 'operator_id'], 'actor_id');
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

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('mes_runtime_json_failed', 'MES runtime payload cannot be encoded.', 500, [], $e);
        }
    }
}
