<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

/**
 * Ledger-only inventory authority for governed inventory/WIP/cost commands.
 *
 * This handler never mutates balance projections directly. Balances are
 * refreshable read models; inventory truth is the append-only ledger plus
 * genealogy facts and reconciliation evidence.
 */
final class InventoryCommandHandler
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?UomCommandQuantityNormalizer $uomNormalizer = null,
        private readonly ?QualityHoldService $qualityHolds = null,
    ) {}

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function receiveInventory(array $payload): array
    {
        return $this->movement('ReceiveInventoryCommand', $payload, 'receipt', 'received_quantity', 1, 'receipt');
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function putawayInventory(array $payload): array
    {
        return $this->movement('PutawayInventoryCommand', $payload, 'putaway', 'putaway_quantity', 1, 'putaway');
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveInventory(array $payload): array
    {
        $this->assertOpenPeriod($payload);
        $this->assertQualityClear('MoveInventoryCommand', $payload);
        $this->assertLotUsable($payload);
        $uom = $this->normalizeUom('MoveInventoryCommand', $payload, 'move_quantity');
        $source = $this->ledgerPayload($payload, $uom, -1);
        $target = $this->ledgerPayload(array_merge($payload, [
            'warehouse_id' => $payload['to_warehouse_id'] ?? $payload['warehouse_id'] ?? null,
            'container_id' => $payload['to_container_id'] ?? $payload['container_id'] ?? null,
        ]), $uom, 1);

        $fromLedger = $this->writeInventoryLedger('MoveInventoryCommand', $source, 'move_out', 'move_out');
        $toLedger = $this->writeInventoryLedger('MoveInventoryCommand', $target, 'move_in', 'move_in');
        $this->writeGenealogy('move', 'location', $this->subjectRef($payload, 'from'), 'location', $this->subjectRef($payload, 'to'), $uom, $payload);
        $this->writeAuditAndOutbox('inventory.moved', (string)($toLedger['inventory_ledger_id'] ?? ''), $payload, ['from' => $fromLedger, 'to' => $toLedger, 'uom' => $uom]);

        return ['inventory_ledger' => [$fromLedger, $toLedger], 'uom' => $uom];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function issueMaterialToWorkOrder(array $payload): array
    {
        $payload = $this->aliasQuantity($payload, 'issue_quantity', ['qty_consumed', 'quantity']);
        $result = $this->movement('IssueMaterialToWorkOrderCommand', $payload, 'issue_to_wip', 'issue_quantity', -1, 'consume');
        $this->writeWipIfAvailable('IssueMaterialToWorkOrderCommand', $payload, $result['uom'], 1, 'material_issue');
        $this->writeCostIfAvailable('IssueMaterialToWorkOrderCommand', $payload, 'material', 'material_issue');
        return $result;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function splitLot(array $payload): array
    {
        $this->assertOpenPeriod($payload);
        $this->assertQualityClear('SplitLotCommand', $payload);
        $this->assertLotUsable($payload);
        $uom = $this->normalizeUom('SplitLotCommand', $payload, 'split_quantity');
        $source = $this->ledgerPayload($payload, $uom, -1);
        $childPayload = array_merge($payload, [
            'lot_id' => $payload['child_lot_id'] ?? null,
            'lot_number' => $payload['child_lot_number'] ?? null,
        ]);
        $child = $this->ledgerPayload($childPayload, $uom, 1);

        $sourceLedger = $this->writeInventoryLedger('SplitLotCommand', $source, 'split_out', 'split_out');
        $childLedger = $this->writeInventoryLedger('SplitLotCommand', $child, 'split_in', 'split_in');
        $this->writeGenealogy(
            'split',
            'lot',
            $this->requiredAny($payload, ['source_lot_number', 'lot_number', 'lot_id'], 'source_lot'),
            'lot',
            $this->requiredAny($payload, ['child_lot_number', 'child_lot_id'], 'child_lot'),
            $uom,
            $payload
        );
        $this->writeAuditAndOutbox('inventory.lot_split', (string)($childLedger['inventory_ledger_id'] ?? ''), $payload, ['source' => $sourceLedger, 'child' => $childLedger, 'uom' => $uom]);

        return ['inventory_ledger' => [$sourceLedger, $childLedger], 'uom' => $uom];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function mergeLot(array $payload): array
    {
        $this->assertOpenPeriod($payload);
        $this->assertQualityClear('MergeLotCommand', $payload);
        $uom = $this->normalizeUom('MergeLotCommand', $payload, 'merge_quantity');
        $sourceRefs = $this->stringList($payload['source_lot_numbers'] ?? $payload['source_lots'] ?? []);
        if ($sourceRefs === []) {
            $sourceRefs = [$this->requiredAny($payload, ['source_lot_number', 'lot_number', 'lot_id'], 'source_lot')];
        }
        $targetRef = $this->requiredAny($payload, ['target_lot_number', 'target_lot_id'], 'target_lot');
        $ledgers = [];
        foreach ($sourceRefs as $index => $sourceRef) {
            $sourcePayload = array_merge($payload, ['lot_number' => $sourceRef]);
            $ledgers[] = $this->writeInventoryLedger('MergeLotCommand', $this->ledgerPayload($sourcePayload, $uom, -1), 'merge_out', 'merge_out_' . $index);
            $this->writeGenealogy('merge', 'lot', $sourceRef, 'lot', $targetRef, $uom, $payload + ['source_lot_number' => $sourceRef]);
        }
        $targetPayload = array_merge($payload, ['lot_number' => $targetRef]);
        $ledgers[] = $this->writeInventoryLedger('MergeLotCommand', $this->ledgerPayload($targetPayload, $uom, 1), 'merge_in', 'merge_in');
        $this->writeAuditAndOutbox('inventory.lot_merged', (string)($ledgers[array_key_last($ledgers)]['inventory_ledger_id'] ?? ''), $payload, ['ledger' => $ledgers, 'uom' => $uom]);

        return ['inventory_ledger' => $ledgers, 'uom' => $uom];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function completeToStock(array $payload): array
    {
        $payload = $this->aliasQuantity($payload, 'completed_quantity', ['qty_good', 'quantity_good', 'quantity']);
        $result = $this->movement('CompleteToStockCommand', $payload, 'complete_to_stock', 'completed_quantity', 1, 'produce');
        $this->writeWipIfAvailable('CompleteToStockCommand', $payload, $result['uom'], -1, 'complete_to_stock');
        $this->writeCostIfAvailable('CompleteToStockCommand', $payload, 'production', 'complete_to_stock');
        return $result;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function scrapInventory(array $payload): array
    {
        $payload = $this->aliasQuantity($payload, 'scrap_quantity', ['qty_scrap', 'quantity']);
        $result = $this->movement('ScrapInventoryCommand', $payload, 'scrap', 'scrap_quantity', -1, 'scrap');
        $this->writeWipIfAvailable('ScrapInventoryCommand', $payload, $result['uom'], -1, 'scrap');
        $this->writeCostIfAvailable('ScrapInventoryCommand', $payload, 'scrap', 'scrap');
        return $result;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function reworkInventory(array $payload): array
    {
        $payload = $this->aliasQuantity($payload, 'rework_quantity', ['quantity']);
        $result = $this->movement('ReworkInventoryCommand', $payload, 'rework', 'rework_quantity', -1, 'rework');
        $this->writeWipIfAvailable('ReworkInventoryCommand', $payload, $result['uom'], 1, 'rework');
        return $result;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function adjustInventoryWithApproval(array $payload): array
    {
        if ($this->firstText($payload, ['approval_ref', 'signature_event_id', 'mrb_ref', 'cycle_count_approval_ref']) === '') {
            throw new DomainCommandException('inventory_adjustment_approval_required', 'Inventory adjustment requires approval or signature evidence.', 409);
        }
        $payload = $this->aliasQuantity($payload, 'adjustment_quantity', ['quantity_delta', 'quantity']);
        $direction = 1;
        $quantity = $this->firstText($payload, ['adjustment_quantity']);
        if (str_starts_with($quantity, '-')) {
            $direction = -1;
            $payload['adjustment_quantity'] = ltrim($quantity, '-');
        }
        return $this->movement('AdjustInventoryWithApprovalCommand', $payload, 'adjustment', 'adjustment_quantity', $direction, 'adjust');
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function postInventoryLedgerTransaction(array $payload): array
    {
        $payload = $this->aliasQuantity($payload, 'quantity_delta', ['quantity', 'qty']);
        $direction = 1;
        $quantity = $this->firstText($payload, ['quantity_delta']);
        if (str_starts_with($quantity, '-')) {
            $direction = -1;
            $payload['quantity_delta'] = ltrim($quantity, '-');
        }
        return $this->movement(
            'PostInventoryLedgerTransactionCommand',
            $payload,
            $this->firstText($payload, ['movement_type']) ?: 'ledger_post',
            'quantity_delta',
            $direction,
            'ledger_post'
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function runReconciliation(array $payload): array
    {
        $periodCode = $this->requiredAny($payload, ['period_code', 'period'], 'period_code');
        $actorId = $this->actor($payload);
        $idempotencyKey = $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key');
        $mismatches = $this->reconciliationMismatches($periodCode);
        $hash = $this->hash(['period_code' => $periodCode, 'mismatches' => $mismatches]);
        $run = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO inventory_reconciliation_run
                    (period_code, run_status, ledger_hash_sha256, mismatch_count, started_by, idempotency_key, metadata, completed_at)
                VALUES
                    (:period_code, :run_status, :ledger_hash_sha256, :mismatch_count, :started_by, :idempotency_key, CAST(:metadata AS jsonb), now())
                ON CONFLICT (period_code, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM inventory_reconciliation_run WHERE period_code = :period_code AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':period_code' => $periodCode,
                ':run_status' => $mismatches === [] ? 'pass' : 'mismatch',
                ':ledger_hash_sha256' => $hash,
                ':mismatch_count' => count($mismatches),
                ':started_by' => $actorId,
                ':idempotency_key' => $idempotencyKey,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
        foreach ($mismatches as $mismatch) {
            $this->writeMismatch((string)($run['reconciliation_run_id'] ?? ''), $mismatch);
        }
        $this->writeAuditAndOutbox('inventory.reconciled', (string)($run['reconciliation_run_id'] ?? $periodCode), $payload, ['run' => $run, 'mismatches' => $mismatches]);

        return ['reconciliation_run' => $run ?? [], 'mismatches' => $mismatches, 'allowed_to_close' => $mismatches === []];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function closeInventoryPeriod(array $payload): array
    {
        if ($this->firstText($payload, ['signature_event_id']) === '') {
            throw new DomainCommandException('inventory_period_close_signature_required', 'Inventory period close requires e-signature evidence.', 409);
        }
        $reconciliation = $this->runReconciliation($payload);
        if (($reconciliation['allowed_to_close'] ?? false) !== true) {
            throw new DomainCommandException('inventory_reconciliation_mismatch', 'Inventory period close is blocked by reconciliation mismatch.', 409, [
                'mismatches' => $reconciliation['mismatches'] ?? [],
            ]);
        }

        $periodCode = $this->requiredAny($payload, ['period_code', 'period'], 'period_code');
        $evidenceHash = $this->hash(['period_code' => $periodCode, 'reconciliation' => $reconciliation, 'payload' => $payload]);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO inventory_period_close
                    (period_code, close_status, reconciliation_run_id, closed_by, signature_event_id,
                     evidence_hash_sha256, idempotency_key, metadata, closed_at)
                VALUES
                    (:period_code, 'closed', :reconciliation_run_id, :closed_by, :signature_event_id,
                     :evidence_hash_sha256, :idempotency_key, CAST(:metadata AS jsonb), now())
                ON CONFLICT (period_code) DO UPDATE SET
                    close_status = 'closed',
                    reconciliation_run_id = EXCLUDED.reconciliation_run_id,
                    closed_by = EXCLUDED.closed_by,
                    signature_event_id = EXCLUDED.signature_event_id,
                    evidence_hash_sha256 = EXCLUDED.evidence_hash_sha256,
                    idempotency_key = EXCLUDED.idempotency_key,
                    metadata = EXCLUDED.metadata,
                    closed_at = now()
                RETURNING *
             )
             SELECT * FROM inserted",
            [
                ':period_code' => $periodCode,
                ':reconciliation_run_id' => $reconciliation['reconciliation_run']['reconciliation_run_id'] ?? null,
                ':closed_by' => $this->actor($payload),
                ':signature_event_id' => $this->firstText($payload, ['signature_event_id']),
                ':evidence_hash_sha256' => $evidenceHash,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
        $this->writeAuditAndOutbox('inventory.period_closed', (string)($row['inventory_period_close_id'] ?? $periodCode), $payload, ['period_close' => $row]);

        return ['period_close' => $row ?? [], 'reconciliation' => $reconciliation];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function exportRecallTrace(array $payload): array
    {
        $subjectType = $this->requiredAny($payload, ['subject_type'], 'subject_type');
        $subjectRef = $this->requiredAny($payload, ['subject_ref', 'lot_number', 'serial_number'], 'subject_ref');
        $direction = $this->firstText($payload, ['direction']) ?: 'both';
        if (!in_array($direction, ['forward', 'backward', 'both'], true)) {
            throw new DomainCommandException('recall_trace_direction_invalid', 'Recall trace direction must be forward, backward, or both.', 400);
        }
        $edges = $this->db->query(
            "SELECT edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id,
                    quantity, uom, source_event_id, event_time, metadata
               FROM genealogy_edge_facts
              WHERE (:direction IN ('backward', 'both') AND to_object_type = :subject_type AND to_object_id = :subject_ref)
                 OR (:direction IN ('forward', 'both') AND from_object_type = :subject_type AND from_object_id = :subject_ref)
              ORDER BY event_time DESC
              LIMIT 500",
            [':subject_type' => $subjectType, ':subject_ref' => $subjectRef, ':direction' => $direction]
        );
        $hash = $this->hash(['subject_type' => $subjectType, 'subject_ref' => $subjectRef, 'direction' => $direction, 'edges' => $edges]);
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO inventory_recall_trace_export
                    (subject_type, subject_ref, direction, trace_hash_sha256, exported_by, idempotency_key, trace_payload)
                VALUES
                    (:subject_type, :subject_ref, :direction, :trace_hash_sha256, :exported_by, :idempotency_key, CAST(:trace_payload AS jsonb))
                ON CONFLICT (subject_type, subject_ref, direction, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM inventory_recall_trace_export
              WHERE subject_type = :subject_type AND subject_ref = :subject_ref AND direction = :direction AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':subject_type' => $subjectType,
                ':subject_ref' => $subjectRef,
                ':direction' => $direction,
                ':trace_hash_sha256' => $hash,
                ':exported_by' => $this->actor($payload),
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':trace_payload' => $this->json(['edges' => $edges]),
            ]
        );
        $this->writeAuditAndOutbox('inventory.recall_trace_exported', (string)($row['recall_trace_export_id'] ?? $subjectRef), $payload, ['export' => $row, 'edge_count' => count($edges)]);

        return ['recall_trace_export' => $row ?? [], 'edges' => $edges];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function movement(string $commandName, array $payload, string $movementType, string $quantityRole, int $direction, string $genealogyType): array
    {
        $this->assertOpenPeriod($payload);
        $this->assertQualityClear($commandName, $payload);
        $this->assertLotUsable($payload);
        $uom = $this->normalizeUom($commandName, $payload, $quantityRole);
        $ledgerPayload = $this->ledgerPayload($payload, $uom, $direction);
        $ledger = $this->writeInventoryLedger($commandName, $ledgerPayload, $movementType, 'primary');
        $this->writeCommandGenealogy($genealogyType, $payload, $uom, (string)($ledger['inventory_ledger_id'] ?? ''));
        $this->writeAuditAndOutbox('inventory.' . $movementType, (string)($ledger['inventory_ledger_id'] ?? ''), $payload, ['ledger' => $ledger, 'uom' => $uom]);

        return ['inventory_ledger' => $ledger, 'uom' => $uom];
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function assertQualityClear(string $commandName, array $payload): void
    {
        ($this->qualityHolds ?? new QualityHoldService($this->db))->assertNoActiveHoldsForCommand($commandName, $payload, $this->actor($payload));
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function assertOpenPeriod(array $payload): void
    {
        $periodCode = $this->firstText($payload, ['period_code', 'inventory_period']);
        if ($periodCode === '') {
            return;
        }
        $row = $this->db->queryOne(
            "SELECT close_status FROM inventory_period_close WHERE period_code = :period_code LIMIT 1",
            [':period_code' => $periodCode]
        );
        if (is_array($row) && ($row['close_status'] ?? '') === 'closed') {
            throw new DomainCommandException('inventory_period_closed', 'Inventory period is closed for ledger posting.', 409, ['period_code' => $periodCode]);
        }
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function assertLotUsable(array $payload): void
    {
        $lotRef = $this->firstText($payload, ['lot_id', 'lot_number', 'lot_ref', 'source_lot_number']);
        if ($lotRef === '') {
            if (($payload['trace_required'] ?? false) === true) {
                throw new DomainCommandException('inventory_genealogy_required', 'Trace-controlled inventory command requires lot or serial reference.', 409);
            }
            return;
        }
        $row = $this->db->queryOne(
            "SELECT lot_id::text AS lot_id, lot_no, lot_status, expiry_date
               FROM lot
              WHERE lot_id::text = :lot_ref OR lot_no = :lot_ref
              LIMIT 1",
            [':lot_ref' => $lotRef]
        );
        if (!is_array($row)) {
            return;
        }
        $status = strtolower($this->text($row['lot_status'] ?? ''));
        if (in_array($status, ['blocked', 'hold', 'quality_hold', 'quarantine', 'expired'], true)) {
            throw new DomainCommandException('inventory_lot_not_usable', 'Inventory lot status blocks this command.', 409, ['lot_ref' => $lotRef, 'lot_status' => $status]);
        }
        $expiry = $this->text($row['expiry_date'] ?? '');
        if ($expiry !== '' && strtotime($expiry) < strtotime(gmdate('Y-m-d')) && $this->firstText($payload, ['deviation_ref', 'concession_ref']) === '') {
            throw new DomainCommandException('inventory_lot_expired', 'Expired lot requires approved deviation or concession before movement.', 409, ['lot_ref' => $lotRef]);
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function normalizeUom(string $commandName, array $payload, string $quantityRole): array
    {
        return ($this->uomNormalizer ?? new UomCommandQuantityNormalizer($this->db))->normalizeAndRecord(
            $commandName,
            $payload,
            $this->actor($payload),
            $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
            $quantityRole,
            ['domain' => 'inventory_ledger_command']
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $uom
     * @return array<string,mixed>
     */
    private function ledgerPayload(array $payload, array $uom, int $direction): array
    {
        $qty = (string)($uom['converted_magnitude'] ?? '0');
        if ($direction < 0 && !str_starts_with($qty, '-')) {
            $qty = '-' . $qty;
        }
        return array_merge($payload, [
            'item_site_id' => $this->resolveItemSiteId($payload),
            'quantity_delta' => $qty,
            'quantity_uom' => (string)($uom['target_unit_code'] ?? ''),
            'uom_measurement_id' => (string)($uom['measurement_id'] ?? ''),
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function writeInventoryLedger(string $commandName, array $payload, string $movementType, string $lineRole): array
    {
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO inventory_ledger
                    (item_site_id, warehouse_id, lot_id, serial_id, movement_type, qty_delta,
                     reference_entity_name, reference_entity_id, source_command_name, idempotency_key,
                     ledger_line_role, uom_measurement_id, quantity_uom, metadata)
                VALUES
                    (:item_site_id, :warehouse_id, :lot_id, :serial_id, :movement_type, :qty_delta,
                     :reference_entity_name, :reference_entity_id, :source_command_name, :idempotency_key,
                     :ledger_line_role, :uom_measurement_id, :quantity_uom, CAST(:metadata AS jsonb))
                ON CONFLICT (source_command_name, idempotency_key, ledger_line_role)
                    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL
                DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM inventory_ledger
              WHERE source_command_name = :source_command_name
                AND idempotency_key = :idempotency_key
                AND ledger_line_role = :ledger_line_role
             LIMIT 1",
            [
                ':item_site_id' => $payload['item_site_id'],
                ':warehouse_id' => $this->nullableText($payload['warehouse_id'] ?? null),
                ':lot_id' => $this->nullableText($payload['lot_id'] ?? null),
                ':serial_id' => $this->nullableText($payload['serial_id'] ?? null),
                ':movement_type' => $movementType,
                ':qty_delta' => $payload['quantity_delta'],
                ':reference_entity_name' => $this->firstText($payload, ['reference_entity_name', 'source_entity_name']) ?: $commandName,
                ':reference_entity_id' => $this->nullableText($payload['reference_entity_id'] ?? $payload['work_order_id'] ?? null),
                ':source_command_name' => $commandName,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':ledger_line_role' => $lineRole,
                ':uom_measurement_id' => $this->nullableText($payload['uom_measurement_id'] ?? null),
                ':quantity_uom' => $this->nullableText($payload['quantity_uom'] ?? null),
                ':metadata' => $this->json(['authority' => self::class, 'payload_refs' => $this->payloadRefs($payload)]),
            ]
        );

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $uom
     */
    private function writeWipIfAvailable(string $commandName, array $payload, array $uom, int $direction, string $stage): void
    {
        $productionOrderId = $this->firstText($payload, ['production_order_id']);
        $itemRevisionId = $this->firstText($payload, ['item_revision_id']);
        if ($productionOrderId === '' || $itemRevisionId === '') {
            return;
        }
        $qty = (string)($uom['converted_magnitude'] ?? '0');
        if ($direction < 0 && !str_starts_with($qty, '-')) {
            $qty = '-' . $qty;
        }
        $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO wip_ledger
                    (production_order_id, item_revision_id, stage_code, quantity_delta, amount_delta,
                     source_command_name, idempotency_key, ledger_line_role, uom_measurement_id, metadata)
                VALUES
                    (:production_order_id, :item_revision_id, :stage_code, :quantity_delta, :amount_delta,
                     :source_command_name, :idempotency_key, :ledger_line_role, :uom_measurement_id, CAST(:metadata AS jsonb))
                ON CONFLICT (source_command_name, idempotency_key, ledger_line_role)
                    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL
                DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted",
            [
                ':production_order_id' => $productionOrderId,
                ':item_revision_id' => $itemRevisionId,
                ':stage_code' => $stage,
                ':quantity_delta' => $qty,
                ':amount_delta' => $this->nullableText($payload['amount_delta'] ?? null),
                ':source_command_name' => $commandName,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':ledger_line_role' => 'wip_' . $stage,
                ':uom_measurement_id' => $this->nullableText($uom['measurement_id'] ?? null),
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writeCostIfAvailable(string $commandName, array $payload, string $element, string $lineRole): void
    {
        $amount = $this->firstText($payload, ['cost_amount', 'amount_delta']);
        if ($amount === '') {
            return;
        }
        $costObjectId = $this->firstText($payload, ['cost_object_id', 'production_order_id', 'work_order_id', 'reference_entity_id']);
        if ($costObjectId === '') {
            return;
        }
        $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO cost_ledger
                    (cost_object_type, cost_object_id, cost_element_code, cost_amount, currency_code,
                     reference_entity_name, reference_entity_id, source_command_name, idempotency_key,
                     ledger_line_role, metadata)
                VALUES
                    (:cost_object_type, :cost_object_id, :cost_element_code, :cost_amount, :currency_code,
                     :reference_entity_name, :reference_entity_id, :source_command_name, :idempotency_key,
                     :ledger_line_role, CAST(:metadata AS jsonb))
                ON CONFLICT (source_command_name, idempotency_key, ledger_line_role)
                    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL
                DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted",
            [
                ':cost_object_type' => $this->firstText($payload, ['cost_object_type']) ?: 'production_order',
                ':cost_object_id' => $costObjectId,
                ':cost_element_code' => $element,
                ':cost_amount' => $amount,
                ':currency_code' => $this->firstText($payload, ['currency_code']) ?: 'VND',
                ':reference_entity_name' => $this->firstText($payload, ['reference_entity_name']) ?: $commandName,
                ':reference_entity_id' => $this->nullableText($payload['reference_entity_id'] ?? null),
                ':source_command_name' => $commandName,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':ledger_line_role' => 'cost_' . $lineRole,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $uom
     */
    private function writeCommandGenealogy(string $type, array $payload, array $uom, string $sourceEventId): void
    {
        $lotRef = $this->firstText($payload, ['lot_number', 'lot_ref', 'lot_id']);
        $serialRef = $this->firstText($payload, ['serial_number', 'serial_ref', 'serial_id']);
        $workOrderRef = $this->firstText($payload, ['work_order_ref', 'wo_number', 'job_number', 'production_order_id']);
        $shipmentRef = $this->firstText($payload, ['shipment_id', 'shipment_ref']);
        if ($type === 'receipt' && $lotRef !== '') {
            $this->writeGenealogy('produce', 'supplier_receipt', $this->firstText($payload, ['receipt_id', 'supplier_ref']) ?: 'receipt', 'lot', $lotRef, $uom, $payload, $sourceEventId);
            return;
        }
        if ($type === 'consume' && $lotRef !== '' && $workOrderRef !== '') {
            $this->writeGenealogy('consume', 'lot', $lotRef, 'work_order', $workOrderRef, $uom, $payload, $sourceEventId);
            return;
        }
        if ($type === 'produce' && $workOrderRef !== '' && $lotRef !== '') {
            $this->writeGenealogy('produce', 'work_order', $workOrderRef, 'lot', $lotRef, $uom, $payload, $sourceEventId);
            return;
        }
        if ($type === 'scrap' && $lotRef !== '') {
            $this->writeGenealogy('scrap', 'lot', $lotRef, 'scrap', $this->firstText($payload, ['scrap_ref', 'idempotency_key']), $uom, $payload, $sourceEventId);
            return;
        }
        if ($type === 'ship' && $lotRef !== '' && $shipmentRef !== '') {
            $this->writeGenealogy('ship', 'lot', $lotRef, 'shipment', $shipmentRef, $uom, $payload, $sourceEventId);
            return;
        }
        if (($payload['trace_required'] ?? false) === true && ($lotRef !== '' || $serialRef !== '')) {
            throw new DomainCommandException('inventory_genealogy_edge_required', 'Trace-controlled command could not derive a genealogy edge.', 409);
        }
    }

    /**
     * @param array<string,mixed> $uom
     * @param array<string,mixed> $payload
     */
    private function writeGenealogy(
        string $edgeType,
        string $fromType,
        string $fromId,
        string $toType,
        string $toId,
        array $uom,
        array $payload,
        ?string $sourceEventId = null
    ): void {
        if ($fromId === '' || $toId === '') {
            return;
        }
        $this->db->execute(
            "INSERT INTO genealogy_edge_facts
                (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id,
                 quantity, uom, source_event_id, metadata)
             VALUES
                (:edge_fact_type, :from_object_type, :from_object_id, :to_object_type, :to_object_id,
                 :quantity, :uom, :source_event_id, CAST(:metadata AS jsonb))
             ON CONFLICT (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id, source_event_id)
             DO NOTHING",
            [
                ':edge_fact_type' => $edgeType,
                ':from_object_type' => $fromType,
                ':from_object_id' => $fromId,
                ':to_object_type' => $toType,
                ':to_object_id' => $toId,
                ':quantity' => $this->nullableText($uom['converted_magnitude'] ?? null),
                ':uom' => $this->nullableText($uom['target_unit_code'] ?? null),
                ':source_event_id' => $sourceEventId ?? $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':metadata' => $this->json(['authority' => self::class, 'payload_refs' => $this->payloadRefs($payload)]),
            ]
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function reconciliationMismatches(string $periodCode): array
    {
        return $this->db->query(
            "WITH ledger AS (
                SELECT item_site_id::text AS item_site_id,
                       COALESCE(warehouse_id::text, '') AS warehouse_id,
                       COALESCE(lot_id::text, '') AS lot_ref,
                       COALESCE(serial_id::text, '') AS serial_ref,
                       SUM(qty_delta) AS ledger_qty
                  FROM inventory_ledger
                 WHERE movement_at < (date_trunc('month', :period_code::date) + interval '1 month')
                 GROUP BY item_site_id::text, COALESCE(warehouse_id::text, ''), COALESCE(lot_id::text, ''), COALESCE(serial_id::text, '')
            ),
            projection AS (
                SELECT item_site_id::text AS item_site_id,
                       COALESCE(warehouse_id::text, '') AS warehouse_id,
                       COALESCE(lot_id::text, '') AS lot_ref,
                       COALESCE(serial_id::text, '') AS serial_ref,
                       SUM(on_hand_qty) AS projection_qty
                  FROM inventory_balance_snapshot
                 GROUP BY item_site_id::text, COALESCE(warehouse_id::text, ''), COALESCE(lot_id::text, ''), COALESCE(serial_id::text, '')
            )
            SELECT 'ledger_projection_delta' AS mismatch_type,
                   COALESCE(l.item_site_id, p.item_site_id) AS item_site_id,
                   COALESCE(l.warehouse_id, p.warehouse_id) AS warehouse_id,
                   COALESCE(l.lot_ref, p.lot_ref) AS lot_ref,
                   COALESCE(l.serial_ref, p.serial_ref) AS serial_ref,
                   COALESCE(l.ledger_qty, 0) AS ledger_qty,
                   COALESCE(p.projection_qty, 0) AS projection_qty,
                   COALESCE(l.ledger_qty, 0) - COALESCE(p.projection_qty, 0) AS delta_qty,
                   CASE WHEN abs(COALESCE(l.ledger_qty, 0) - COALESCE(p.projection_qty, 0)) > 0.000001 THEN 'critical' ELSE 'minor' END AS severity
              FROM ledger l
              FULL OUTER JOIN projection p
                ON p.item_site_id = l.item_site_id
               AND p.warehouse_id = l.warehouse_id
               AND p.lot_ref = l.lot_ref
               AND p.serial_ref = l.serial_ref
             WHERE abs(COALESCE(l.ledger_qty, 0) - COALESCE(p.projection_qty, 0)) > 0.000001
             LIMIT 200",
            [':period_code' => $periodCode]
        );
    }

    /**
     * @param array<string,mixed> $mismatch
     */
    private function writeMismatch(string $runId, array $mismatch): void
    {
        if ($runId === '') {
            return;
        }
        $this->db->execute(
            "INSERT INTO inventory_reconciliation_mismatch
                (reconciliation_run_id, mismatch_type, item_site_id, warehouse_id, lot_ref, serial_ref,
                 ledger_qty, projection_qty, delta_qty, severity, metadata)
             VALUES
                (:reconciliation_run_id, :mismatch_type, :item_site_id, :warehouse_id, :lot_ref, :serial_ref,
                 :ledger_qty, :projection_qty, :delta_qty, :severity, CAST(:metadata AS jsonb))",
            [
                ':reconciliation_run_id' => $runId,
                ':mismatch_type' => $this->text($mismatch['mismatch_type'] ?? 'ledger_projection_delta'),
                ':item_site_id' => $this->nullableText($mismatch['item_site_id'] ?? null),
                ':warehouse_id' => $this->nullableText($mismatch['warehouse_id'] ?? null),
                ':lot_ref' => $this->nullableText($mismatch['lot_ref'] ?? null),
                ':serial_ref' => $this->nullableText($mismatch['serial_ref'] ?? null),
                ':ledger_qty' => $this->nullableText($mismatch['ledger_qty'] ?? null),
                ':projection_qty' => $this->nullableText($mismatch['projection_qty'] ?? null),
                ':delta_qty' => $this->nullableText($mismatch['delta_qty'] ?? null),
                ':severity' => $this->text($mismatch['severity'] ?? 'major'),
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function resolveItemSiteId(array $payload): string
    {
        $direct = $this->firstText($payload, ['item_site_id']);
        if ($direct !== '') {
            return $direct;
        }
        $itemId = $this->requiredAny($payload, ['item_id', 'item_ref', 'material_id', 'part_number'], 'item_id');
        $siteId = $this->firstText($payload, ['site_id', 'plant_id']);
        $row = $this->db->queryOne(
            "SELECT item_site_id::text AS item_site_id
               FROM item_site
              WHERE item_id::text = :item_id
                AND (:site_id IS NULL OR site_id::text = :site_id)
              ORDER BY effective_from DESC NULLS LAST
              LIMIT 1",
            [':item_id' => $itemId, ':site_id' => $siteId !== '' ? $siteId : null]
        );
        if (!is_array($row) || $this->text($row['item_site_id'] ?? '') === '') {
            throw new DomainCommandException('item_site_required', 'Inventory command requires resolvable item_site_id.', 409, ['item_id' => $itemId, 'site_id' => $siteId]);
        }
        return (string)$row['item_site_id'];
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $sourceKeys
     * @return array<string,mixed>
     */
    private function aliasQuantity(array $payload, string $targetKey, array $sourceKeys): array
    {
        if (!isset($payload[$targetKey])) {
            foreach ($sourceKeys as $key) {
                if (isset($payload[$key])) {
                    $payload[$targetKey] = $payload[$key];
                    break;
                }
            }
        }
        return $payload;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,string>
     */
    private function payloadRefs(array $payload): array
    {
        $refs = [];
        foreach (['item_id', 'item_site_id', 'warehouse_id', 'lot_id', 'lot_number', 'serial_id', 'serial_number', 'work_order_ref', 'shipment_id', 'period_code'] as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                $refs[$key] = $value;
            }
        }
        return $refs;
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function actor(array $payload): string
    {
        return $this->requiredAny($payload, ['actor_id', 'operator_id'], 'actor_id');
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function requiredAny(array $payload, array $keys, string $label): string
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
     * @return list<string>
     */
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

    private function subjectRef(array $payload, string $direction): string
    {
        $prefix = $direction === 'from' ? 'from_' : 'to_';
        return $this->firstText($payload, [$prefix . 'location_id', $prefix . 'warehouse_id', $prefix . 'container_id']) ?: $direction;
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

    private function hash(mixed $payload): string
    {
        return hash('sha256', $this->json($payload));
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('inventory_ledger_json_failed', 'Inventory command payload cannot be encoded.', 500, [], $e);
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $result
     */
    private function writeAuditAndOutbox(string $eventType, string $aggregateId, array $payload, array $result): void
    {
        $body = ['payload_refs' => $this->payloadRefs($payload), 'result' => $result];
        $bodyJson = $this->json($body);
        $this->db->execute(
            "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, 'inventory_ledger_command', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
            [
                ':event_type' => $eventType,
                ':aggregate_id' => $aggregateId !== '' ? $aggregateId : $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':actor_name' => $this->actor($payload),
                ':payload' => $bodyJson,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                ('inventory_ledger_command', :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'inventory_ledger_command.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_id' => $aggregateId !== '' ? $aggregateId : $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
                ':event_type' => $eventType,
                ':payload' => $bodyJson,
                ':idempotency_key' => $this->requiredAny($payload, ['idempotency_key'], 'idempotency_key'),
            ]
        );
    }
}
