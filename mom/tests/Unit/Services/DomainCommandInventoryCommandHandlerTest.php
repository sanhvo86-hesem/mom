<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\InventoryCommandHandler;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandInventoryCommandHandlerTest extends TestCase
{
    public function testIssueHeldLotBlocksBeforeLedgerAndUom(): void
    {
        $db = new DomainCommandInventoryFakeConnection(activeHold: true);

        try {
            (new InventoryCommandHandler($db))->issueMaterialToWorkOrder($this->issuePayload('idem-held-lot'));
            $this->fail('Expected quality hold block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('quality_hold_active', $e->problemCode);
            $this->assertTrue($db->hasQuery('FROM quality_hold h'));
            $this->assertFalse($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
            $this->assertFalse($db->hasQuery('INSERT INTO inventory_ledger'));
        }
    }

    public function testExpiredLotBlocksWithoutDeviationBeforeLedger(): void
    {
        $db = new DomainCommandInventoryFakeConnection(expiredLot: true);

        try {
            (new InventoryCommandHandler($db))->moveInventory($this->issuePayload('idem-expired-lot') + [
                'move_quantity' => '1',
                'inventory_uom' => 'PCS',
                'from_warehouse_id' => '00000000-0000-0000-0000-000000000010',
                'to_warehouse_id' => '00000000-0000-0000-0000-000000000011',
            ]);
            $this->fail('Expected expired lot block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('inventory_lot_expired', $e->problemCode);
            $this->assertFalse($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
            $this->assertFalse($db->hasQuery('INSERT INTO inventory_ledger'));
        }
    }

    public function testSplitLotWritesLedgerOnlyAndGenealogy(): void
    {
        $db = new DomainCommandInventoryFakeConnection();
        $result = (new InventoryCommandHandler($db))->splitLot([
            'idempotency_key' => 'idem-split-lot',
            'actor_id' => 'inventory-1',
            'item_id' => 'PART-1',
            'item_site_id' => '00000000-0000-0000-0000-000000000101',
            'warehouse_id' => '00000000-0000-0000-0000-000000000201',
            'lot_id' => '00000000-0000-0000-0000-000000000301',
            'source_lot_number' => 'LOT-1',
            'child_lot_id' => '00000000-0000-0000-0000-000000000302',
            'child_lot_number' => 'LOT-1A',
            'split_quantity' => '2',
            'inventory_uom' => 'PCS',
            'trace_required' => true,
        ]);

        $this->assertCount(2, $result['inventory_ledger']);
        $this->assertTrue($db->hasQuery('INSERT INTO inventory_ledger'));
        $this->assertTrue($db->hasQuery('INSERT INTO genealogy_edge_facts'));
        $this->assertFalse($db->hasQuery('UPDATE stock_balances'));
        $this->assertFalse($db->hasQuery('INSERT INTO stock_balances'));
    }

    public function testPeriodCloseBlocksWhenReconciliationMismatchExists(): void
    {
        $db = new DomainCommandInventoryFakeConnection(hasMismatch: true);

        try {
            (new InventoryCommandHandler($db))->closeInventoryPeriod([
                'idempotency_key' => 'idem-close-period',
                'actor_id' => 'controller-1',
                'period_code' => '2026-05-01',
                'signature_event_id' => '00000000-0000-0000-0000-000000000901',
            ]);
            $this->fail('Expected reconciliation mismatch block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('inventory_reconciliation_mismatch', $e->problemCode);
            $this->assertTrue($db->hasQuery('INSERT INTO inventory_reconciliation_run'));
            $this->assertTrue($db->hasQuery('INSERT INTO inventory_reconciliation_mismatch'));
            $this->assertFalse($db->hasQuery('INSERT INTO inventory_period_close'));
        }
    }

    public function testRecallTraceExportWritesEvidenceRecord(): void
    {
        $db = new DomainCommandInventoryFakeConnection();
        $result = (new InventoryCommandHandler($db))->exportRecallTrace([
            'idempotency_key' => 'idem-recall-trace',
            'actor_id' => 'quality-1',
            'subject_type' => 'lot',
            'subject_ref' => 'LOT-1',
            'direction' => 'both',
        ]);

        $this->assertCount(1, $result['edges']);
        $this->assertTrue($db->hasQuery('INSERT INTO inventory_recall_trace_export'));
        $this->assertTrue($db->hasQuery('inventory.recall_trace_exported'));
    }

    public function testCostRollupWritesCostLedgerWithUomEvidence(): void
    {
        $db = new DomainCommandInventoryFakeConnection();
        $result = (new InventoryCommandHandler($db))->costRollup([
            'idempotency_key' => 'idem-cost-rollup',
            'actor_id' => 'cost-1',
            'item_id' => 'PART-1',
            'cost_object_id' => '00000000-0000-0000-0000-000000000401',
            'cost_quantity' => '3',
            'cost_uom' => 'PCS',
            'cost_amount' => '1200.00',
            'currency_code' => 'VND',
        ]);

        $this->assertSame('PCS', $result['uom']['target_unit_code']);
        $this->assertTrue($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
        $this->assertTrue($db->hasQuery('INSERT INTO cost_ledger'));
        $this->assertTrue($db->hasParam(':uom_measurement_id', 'uom-measurement-1'));
    }

    public function testShipmentPackWritesPackageWithUomEvidence(): void
    {
        $db = new DomainCommandInventoryFakeConnection();
        $result = (new InventoryCommandHandler($db))->shipmentPack([
            'idempotency_key' => 'idem-ship-pack',
            'actor_id' => 'shipper-1',
            'shipment_id' => '00000000-0000-0000-0000-000000000901',
            'package_number' => 1,
            'item_id' => 'PART-1',
            'ship_quantity' => '5',
            'sales_uom' => 'PCS',
            'lot_number' => 'LOT-1',
        ]);

        $this->assertSame('PCS', $result['uom']['target_unit_code']);
        $this->assertTrue($db->hasQuery('INSERT INTO shipment_packages'));
        $this->assertTrue($db->hasQuery('INSERT INTO genealogy_edge_facts'));
        $this->assertTrue($db->hasParam(':uom_measurement_id', 'uom-measurement-1'));
    }

    /**
     * @return array<string,mixed>
     */
    private function issuePayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'production_order_id' => '00000000-0000-0000-0000-000000000401',
            'item_revision_id' => '00000000-0000-0000-0000-000000000501',
            'item_id' => 'PART-1',
            'item_site_id' => '00000000-0000-0000-0000-000000000101',
            'warehouse_id' => '00000000-0000-0000-0000-000000000201',
            'lot_id' => '00000000-0000-0000-0000-000000000301',
            'lot_number' => 'LOT-1',
            'issue_quantity' => '10',
            'material_uom' => 'BOX',
            'trace_required' => true,
        ];
    }
}

final class DomainCommandInventoryFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $queries = [];

    public function __construct(
        private readonly bool $activeHold = false,
        private readonly bool $expiredLot = false,
        private readonly bool $hasMismatch = false,
    ) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM quality_hold h') && $this->activeHold) {
            return [[
                'hold_id' => 'hold-1',
                'hold_number' => 'QH-ACTIVE',
                'severity' => 'critical',
                'operator_message' => 'Canonical quality hold is active.',
                'subject_type' => 'lot',
                'subject_ref' => 'LOT-1',
            ]];
        }

        if (str_contains($sql, 'FULL OUTER JOIN projection') && $this->hasMismatch) {
            return [[
                'mismatch_type' => 'ledger_projection_delta',
                'item_site_id' => '00000000-0000-0000-0000-000000000101',
                'warehouse_id' => '00000000-0000-0000-0000-000000000201',
                'lot_ref' => '00000000-0000-0000-0000-000000000301',
                'serial_ref' => '',
                'ledger_qty' => '10.000000',
                'projection_qty' => '8.000000',
                'delta_qty' => '2.000000',
                'severity' => 'critical',
            ]];
        }

        if (str_contains($sql, 'FROM genealogy_edge_facts')) {
            return [[
                'edge_fact_type' => 'ship',
                'from_object_type' => 'lot',
                'from_object_id' => 'LOT-1',
                'to_object_type' => 'shipment',
                'to_object_id' => 'SHIP-1',
                'quantity' => '1',
                'uom' => 'PCS',
                'source_event_id' => 'event-1',
                'metadata' => '{}',
            ]];
        }

        return [];
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM inventory_period_close')) {
            return null;
        }

        if (str_contains($sql, 'FROM lot')) {
            return [
                'lot_id' => '00000000-0000-0000-0000-000000000301',
                'lot_no' => 'LOT-1',
                'lot_status' => 'active',
                'expiry_date' => $this->expiredLot ? '2020-01-01' : '2099-01-01',
            ];
        }

        if (str_contains($sql, 'FROM item_site')) {
            return ['item_site_id' => '00000000-0000-0000-0000-000000000101'];
        }

        if (str_contains($sql, 'FROM uom_unit_catalog')) {
            $code = (string)($params[':a'] ?? $params[':code'] ?? '');
            return $this->unit($code);
        }

        if (str_contains($sql, 'FROM item_uom_policy')) {
            return [
                'id' => 'policy-1',
                'item_id' => 'PART-1',
                'inventory_unit_code' => 'PCS',
                'purchase_unit_code' => 'BOX',
                'sales_unit_code' => 'PCS',
                'recipe_unit_code' => 'PCS',
                'qc_unit_code' => 'PCS',
                'effective_from' => '2026-01-01',
                'resolved_priority' => 7,
            ];
        }

        if (str_contains($sql, 'FROM uom_conversion_rule')) {
            return null;
        }

        if (str_contains($sql, 'INSERT INTO domain_command_uom_measurement')) {
            return [
                'measurement_id' => 'uom-measurement-1',
                'measval_hash_sha256' => $params[':measval_hash_sha256'] ?? hash('sha256', 'uom'),
            ];
        }

        if (str_contains($sql, 'INSERT INTO inventory_ledger')) {
            return [
                'inventory_ledger_id' => '00000000-0000-0000-0000-000000000701',
                'movement_type' => $params[':movement_type'] ?? 'movement',
                'qty_delta' => $params[':qty_delta'] ?? '0',
                'ledger_line_role' => $params[':ledger_line_role'] ?? 'primary',
            ];
        }

        if (str_contains($sql, 'INSERT INTO inventory_reconciliation_run')) {
            return [
                'reconciliation_run_id' => '00000000-0000-0000-0000-000000000801',
                'period_code' => $params[':period_code'] ?? '2026-05-01',
                'run_status' => $params[':run_status'] ?? 'pass',
                'mismatch_count' => $params[':mismatch_count'] ?? 0,
            ];
        }

        if (str_contains($sql, 'INSERT INTO inventory_period_close')) {
            return [
                'inventory_period_close_id' => '00000000-0000-0000-0000-000000000802',
                'period_code' => $params[':period_code'] ?? '2026-05-01',
                'close_status' => 'closed',
            ];
        }

        if (str_contains($sql, 'INSERT INTO inventory_recall_trace_export')) {
            return [
                'recall_trace_export_id' => '00000000-0000-0000-0000-000000000803',
                'subject_type' => $params[':subject_type'] ?? 'lot',
                'subject_ref' => $params[':subject_ref'] ?? 'LOT-1',
                'direction' => $params[':direction'] ?? 'both',
            ];
        }

        if (str_contains($sql, 'INSERT INTO cost_ledger')) {
            return [
                'cost_ledger_id' => '00000000-0000-0000-0000-000000000804',
                'cost_amount' => $params[':cost_amount'] ?? '0',
                'uom_measurement_id' => $params[':uom_measurement_id'] ?? '',
            ];
        }

        if (str_contains($sql, 'INSERT INTO shipment_packages')) {
            return [
                'package_id' => '00000000-0000-0000-0000-000000000805',
                'shipment_id' => $params[':shipment_id'] ?? '',
                'quantity_uom' => $params[':quantity_uom'] ?? '',
                'uom_measurement_id' => $params[':uom_measurement_id'] ?? '',
            ];
        }

        return null;
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasQuery(string $needle): bool
    {
        foreach ($this->queries as $query) {
            $haystack = $query['sql'] . ' ' . json_encode($query['params'], JSON_THROW_ON_ERROR);
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }
        return false;
    }

    public function hasParam(string $key, mixed $value): bool
    {
        foreach ($this->queries as $query) {
            if (($query['params'][$key] ?? null) === $value) {
                return true;
            }
        }
        return false;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function unit(string $code): ?array
    {
        $units = [
            'BOX' => [
                'canonical_code' => 'BOX',
                'quantity_kind_code' => 'CountOrQuantity',
                'si_factor' => '50',
                'si_offset' => '0',
                'is_affine' => false,
                'lifecycle_status' => 'active',
                'risk_level' => 'medium',
            ],
            'PCS' => [
                'canonical_code' => 'PCS',
                'quantity_kind_code' => 'CountOrQuantity',
                'si_factor' => '1',
                'si_offset' => '0',
                'is_affine' => false,
                'lifecycle_status' => 'active',
                'risk_level' => 'low',
            ],
        ];

        return $units[$code] ?? null;
    }
}
