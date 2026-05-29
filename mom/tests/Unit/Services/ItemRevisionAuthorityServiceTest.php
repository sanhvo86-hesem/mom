<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ItemRevisionAuthorityService;
use MOM\Services\UomAuthorityService;
use PHPUnit\Framework\TestCase;

final class ItemRevisionAuthorityServiceTest extends TestCase
{
    public function testReleasedRevisionDirectEditIsBlocked(): void
    {
        $service = new ItemRevisionAuthorityService();

        $result = $service->evaluateReleasedRevisionEdit(
            [
                'item_id' => 'item-1',
                'revision_code' => 'A',
                'drawing_reference' => 'DRW-1',
                'effective_from' => '2026-01-01T00:00:00Z',
                'release_hash' => 'hash-a',
                'lifecycle_state' => 'released',
            ],
            [
                'item_id' => 'item-1',
                'revision_code' => 'A',
                'drawing_reference' => 'DRW-2',
                'effective_from' => '2026-01-01T00:00:00Z',
                'release_hash' => 'hash-a',
                'lifecycle_state' => 'released',
            ],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('released_revision_direct_edit', $result['reason_code']);
    }

    public function testDraftUomBlocksRevisionRelease(): void
    {
        $uom = new UomAuthorityService();
        $uom->createUom([
            'uom_code' => 'BAG',
            'uom_name' => 'Bag',
            'dimension_code' => 'count',
        ], 'mdm');
        $service = new ItemRevisionAuthorityService($uom);

        $result = $service->evaluateRevisionRelease(
            ['base_uom_code' => 'BAG'],
            ['lifecycle_state' => 'draft'],
            [],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('uom_not_approved', $result['reason_code']);
    }

    public function testCustomerRevisionMismatchBlocksSalesOrderLine(): void
    {
        $service = new ItemRevisionAuthorityService();

        $result = $service->evaluateCustomerCrossref(
            [
                'customer_part_number' => 'CUST-PN-1',
                'customer_revision_code' => 'B',
            ],
            [[
                'customer_part_number' => 'CUST-PN-1',
                'customer_revision_code' => 'A',
                'crossref_status' => 'approved',
                'effective_from' => '2026-01-01T00:00:00Z',
            ]],
            new \DateTimeImmutable('2026-05-29T00:00:00Z'),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('customer_revision_mismatch', $result['reason_code']);
    }

    public function testMissingSupplierCrossrefBlocksPurchaseOrderLine(): void
    {
        $service = new ItemRevisionAuthorityService();

        $result = $service->evaluateSupplierCrossref(
            [
                'supplier_part_number' => 'SUP-PN-1',
                'supplier_revision_code' => 'R1',
            ],
            [],
            new \DateTimeImmutable('2026-05-29T00:00:00Z'),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('supplier_item_crossref_missing', $result['reason_code']);
    }

    public function testEcoCannotMutateRunningWorkOrderSnapshot(): void
    {
        $service = new ItemRevisionAuthorityService();

        $result = $service->evaluateEcoSnapshotStability(
            [
                'work_order_id' => 'WO-1',
                'item_revision_id' => 'rev-a',
                'revision_code' => 'A',
                'released_snapshot_hash' => 'hash-a',
            ],
            [
                'work_order_id' => 'WO-1',
                'item_revision_id' => 'rev-b',
                'revision_code' => 'B',
                'released_snapshot_hash' => 'hash-b',
            ],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('running_snapshot_mutated_by_eco', $result['reason_code']);
    }
}
