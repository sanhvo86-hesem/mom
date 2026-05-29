<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\InventoryLedgerAuthorityService;
use PHPUnit\Framework\TestCase;

final class InventoryLedgerAuthorityServiceTest extends TestCase
{
    public function testDoubleScanIssueReplaysWithoutSecondPosting(): void
    {
        $service = new InventoryLedgerAuthorityService();
        $command = [
            'command_name' => 'IssueMaterialToWorkOrder',
            'idempotency_key' => 'idem-issue-001',
            'work_order_ref' => 'WO-100',
            'item_ref' => 'ITEM-1',
            'lot_ref' => 'LOT-A',
            'qty' => 5,
            'uom' => 'PCS',
            'period_state' => 'open',
        ];
        $lots = [
            ['lot_ref' => 'LOT-A', 'expiry_date' => '2026-06-01', 'available_qty' => 10],
        ];

        $first = $service->evaluateIssueCommand($command, [], $lots, [], new DateTimeImmutable('2026-05-29T00:00:00Z'));
        $second = $service->evaluateIssueCommand($command, [$first['command_packet']], $lots, [], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertTrue($first['allowed']);
        $this->assertSame('inventory_issue_command_ready', $first['reason_code']);
        $this->assertTrue($second['allowed']);
        $this->assertSame('replayed', $second['status']);
        $this->assertSame('inventory_issue_idempotent_replay', $second['reason_code']);
    }

    public function testDirectStockBalanceMutationIsBlocked(): void
    {
        $result = (new InventoryLedgerAuthorityService())->evaluateDirectBalanceMutation('stock_balances', [
            'qty_on_hand' => 999,
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('direct_stock_balance_update_blocked', $result['reason_code']);
    }

    public function testExpiredLotAndFefoViolationAreBlocked(): void
    {
        $service = new InventoryLedgerAuthorityService();
        $expired = $service->evaluateIssueCommand([
            'idempotency_key' => 'idem-expired',
            'work_order_ref' => 'WO-101',
            'item_ref' => 'ITEM-1',
            'lot_ref' => 'LOT-OLD',
            'qty' => 1,
        ], [], [
            ['lot_ref' => 'LOT-OLD', 'expiry_date' => '2026-05-01', 'available_qty' => 10],
        ], [], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $fefo = $service->evaluateIssueCommand([
            'idempotency_key' => 'idem-fefo',
            'work_order_ref' => 'WO-102',
            'item_ref' => 'ITEM-1',
            'lot_ref' => 'LOT-LATE',
            'qty' => 1,
        ], [], [
            ['lot_ref' => 'LOT-EARLY', 'expiry_date' => '2026-06-01', 'available_qty' => 10],
            ['lot_ref' => 'LOT-LATE', 'expiry_date' => '2026-07-01', 'available_qty' => 10],
        ], [], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($expired['allowed']);
        $this->assertSame('expired_lot_blocked', $expired['reason_code']);
        $this->assertFalse($fefo['allowed']);
        $this->assertSame('fefo_violation', $fefo['reason_code']);
    }

    public function testActiveQualityHoldBlocksLotIssue(): void
    {
        $result = (new InventoryLedgerAuthorityService())->evaluateIssueCommand([
            'idempotency_key' => 'idem-held-lot',
            'work_order_ref' => 'WO-HOLD',
            'item_ref' => 'ITEM-1',
            'lot_ref' => 'LOT-HOLD',
            'qty' => 1,
            'period_state' => 'open',
        ], [], [
            ['lot_ref' => 'LOT-HOLD', 'expiry_date' => '2026-06-01', 'available_qty' => 5],
        ], [
            [
                'quality_hold_id' => 'HOLD-1',
                'subject_type' => 'lot',
                'subject_ref' => 'LOT-HOLD',
                'hold_status' => 'active',
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('inventory_lot_on_hold', $result['reason_code']);
    }

    public function testCompletionPostsWipAndCostLedgerPacket(): void
    {
        $plan = (new InventoryLedgerAuthorityService())->planCompletionLedger([
            'work_order_ref' => 'WO-200',
            'item_ref' => 'FG-1',
            'qty_good' => 10,
            'unit_cost_amount' => 12.5,
            'period_state' => 'open',
            'currency_code' => 'VND',
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertSame('completion_wip_cost_ledger_planned', $plan['reason_code']);
        $this->assertSame(-10.0, $plan['wip_ledger_event']['quantity_delta']);
        $this->assertSame(125.0, $plan['cost_ledger_event']['cost_amount']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $plan['posting_packets'][0]['posting_hash_sha256']);
    }

    public function testRecallTracesSupplierHeatToShipmentCustomer(): void
    {
        $result = (new InventoryLedgerAuthorityService())->traceRecall([
            'supplier_heat' => 'HEAT-77',
        ], [
            ['edge_type' => 'consume', 'from_type' => 'supplier_heat', 'from_ref' => 'HEAT-77', 'to_type' => 'lot', 'to_ref' => 'RAW-LOT-1'],
            ['edge_type' => 'produce', 'from_type' => 'lot', 'from_ref' => 'RAW-LOT-1', 'to_type' => 'lot', 'to_ref' => 'FG-LOT-1'],
        ], [
            ['shipment_ref' => 'SHIP-1', 'customer_ref' => 'CUST-1', 'lot_refs' => ['FG-LOT-1']],
        ]);

        $this->assertTrue($result['allowed']);
        $this->assertSame('recall_trace_evidence_generated', $result['reason_code']);
        $this->assertSame(['SHIP-1'], $result['shipment_refs']);
        $this->assertSame(['CUST-1'], $result['customer_refs']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $result['evidence_export']['evidence_package_hash_sha256']);
    }
}
