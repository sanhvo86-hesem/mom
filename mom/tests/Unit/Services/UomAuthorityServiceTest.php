<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\UomAuthorityService;
use PHPUnit\Framework\TestCase;

final class UomAuthorityServiceTest extends TestCase
{
    public function testReceiveBoxNormalizesToPieces(): void
    {
        $service = new UomAuthorityService(conversions: [[
            'conversion_id' => 'BOX-PCS',
            'from_uom' => 'BOX',
            'to_uom' => 'PCS',
            'dimension_code' => 'count',
            'numerator' => 50,
            'denominator' => 1,
            'precision_scale' => 0,
            'approval_status' => 'approved',
        ]]);

        $result = $service->convertQuantity(10, 'BOX', 'PCS', ['at' => '2026-05-29T00:00:00Z']);

        $this->assertSame(500.0, $result['normalized_qty']);
        $this->assertSame('PCS', $result['normalized_uom']);
        $this->assertSame('BOX-PCS', $result['conversion_id']);
    }

    public function testIncompatibleDimensionBlocksWithoutPackagingPolicy(): void
    {
        $service = new UomAuthorityService();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('uom_dimension_mismatch');

        $service->createConversion([
            'from_uom' => 'KG',
            'to_uom' => 'PCS',
            'dimension_code' => 'mass',
            'numerator' => 1,
        ], 'qa');
    }

    public function testAmbiguousActiveConversionIsBlocked(): void
    {
        $service = new UomAuthorityService();
        $first = $service->createConversion([
            'conversion_id' => 'BOX-PCS-A',
            'from_uom' => 'BOX',
            'to_uom' => 'PCS',
            'dimension_code' => 'count',
            'numerator' => 50,
            'effective_from' => '2026-01-01T00:00:00Z',
        ], 'mdm');
        $service->approveConversion($first['record_id'], 'qa');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('uom_conversion_ambiguous');

        $service->createConversion([
            'conversion_id' => 'BOX-PCS-B',
            'from_uom' => 'BOX',
            'to_uom' => 'PCS',
            'dimension_code' => 'count',
            'numerator' => 60,
            'effective_from' => '2026-01-01T00:00:00Z',
        ], 'mdm');
    }

    public function testEffectivityKeepsReleasedSnapshotStable(): void
    {
        $service = new UomAuthorityService(conversions: [
            [
                'conversion_id' => 'BOX-OLD',
                'from_uom' => 'BOX',
                'to_uom' => 'PCS',
                'dimension_code' => 'count',
                'numerator' => 50,
                'precision_scale' => 0,
                'approval_status' => 'approved',
                'effective_from' => '2026-01-01T00:00:00Z',
                'effective_to' => '2026-06-01T00:00:00Z',
            ],
            [
                'conversion_id' => 'BOX-NEW',
                'from_uom' => 'BOX',
                'to_uom' => 'PCS',
                'dimension_code' => 'count',
                'numerator' => 60,
                'precision_scale' => 0,
                'approval_status' => 'approved',
                'effective_from' => '2026-06-01T00:00:00Z',
            ],
        ]);

        $releasedWo = $service->convertQuantity(1, 'BOX', 'PCS', ['at' => '2026-05-15T00:00:00Z']);
        $newWo = $service->convertQuantity(1, 'BOX', 'PCS', ['at' => '2026-06-15T00:00:00Z']);

        $this->assertSame(50.0, $releasedWo['normalized_qty']);
        $this->assertSame('BOX-OLD', $releasedWo['conversion_id']);
        $this->assertSame(60.0, $newWo['normalized_qty']);
        $this->assertSame('BOX-NEW', $newWo['conversion_id']);
    }

    public function testRoundingIsDeterministicAndAudited(): void
    {
        $service = new UomAuthorityService(conversions: [[
            'conversion_id' => 'BOX-FRACTION',
            'from_uom' => 'BOX',
            'to_uom' => 'PCS',
            'dimension_code' => 'count',
            'numerator' => 5,
            'denominator' => 2,
            'precision_scale' => 0,
            'rounding_mode' => 'floor',
            'approval_status' => 'approved',
        ]]);

        $result = $service->convertQuantity(1, 'BOX', 'PCS');

        $this->assertSame(2.0, $result['normalized_qty']);
        $this->assertSame('ConvertQuantity', $result['audit']['command']);
        $this->assertNotEmpty($service->auditLog());
    }

    public function testDraftUomBlocksReleasedItemRevision(): void
    {
        $service = new UomAuthorityService();
        $service->createUom([
            'uom_code' => 'BAG',
            'uom_name' => 'Bag',
            'dimension_code' => 'count',
        ], 'mdm');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('uom_not_approved');

        $service->assertUomApprovedForRelease('BAG');
    }
}
