<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ContextualConversionPlanner;
use MOM\Api\Services\Uom\ConversionEngine;
use MOM\Api\Services\Uom\ConversionRuleService;
use MOM\Api\Services\Uom\DensityContextualConverter;
use MOM\Api\Services\Uom\ItemUomPolicyService;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use MOM\Api\Services\Uom\PackagingContextualConverter;
use MOM\Api\Services\Uom\PotencyContextualConverter;
use MOM\Api\Services\Uom\QuantityKindService;
use MOM\Api\Services\Uom\UomException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class ContextualConversionP08Test extends TestCase
{
    public function testSimP0801OneLWaterWithLotDensityConvertsToOneKg(): void
    {
        $engine = $this->engine(
            units: [
                'L' => $this->unit('L', 'Volume', '0.001'),
                'kg' => $this->unit('kg', 'Mass', '1'),
            ],
            density: [
                'WATER|LOT-1' => [
                    'density_value' => '1',
                    'density_unit_code' => 'kg_L',
                    'density_source' => 'lot pycnometer',
                    'temperature_celsius' => '20.0',
                    'lot_id' => 'LOT-1',
                    'method_code' => 'DENS-METHOD-1',
                    'approved_by' => '11111111-1111-1111-1111-111111111111',
                ],
            ]
        );

        $out = $engine->convert('1', 'L', 'kg', 3, context: [
            'substance_code' => 'WATER',
            'lot_id' => 'LOT-1',
            'temperature_c' => '20.0',
            'trace_id' => 'trace-p08-01',
        ]);

        $this->assertSame('1.000', $out['result']);
        $this->assertSame('density', $out['contextual_route']);
        $this->assertSame('density_based', $out['measval']['evidence']['category']);
        $this->assertSame('LOT-1', $out['contextual_evidence']['lot_id']);
    }

    public function testSimP0802OneLSolventWithoutDensityRejectsContextRequired(): void
    {
        $engine = $this->engine(units: [
            'L' => $this->unit('L', 'Volume', '0.001'),
            'kg' => $this->unit('kg', 'Mass', '1'),
        ]);

        $this->expectException(UomException::class);
        try {
            $engine->convert('1', 'L', 'kg', 3, context: ['trace_id' => 'trace-p08-02']);
        } catch (UomException $e) {
            $this->assertSame('UOM_CONTEXT_REQUIRED', $e->problemCode);
            throw $e;
        }
    }

    public function testSimP0803OneThousandIuVitaminConvertsToMgWithLotPotency(): void
    {
        $engine = $this->engine(units: [
            'IU' => $this->unit('IU', 'PotencyUnit', null),
            'mg' => $this->unit('mg', 'Mass', '0.000001'),
        ]);

        $out = $engine->convert('1000', 'IU', 'mg', 2, context: [
            'substance' => 'VITAMIN-D',
            'assay_method' => 'HPLC',
            'potency_value' => '100',
            'potency_unit' => 'IU_per_mg',
            'lot_id' => 'VD-LOT-1',
            'certificate_ref' => 'COA-VD-1',
            'expiry_date' => '2027-01-01',
            'approved_by' => '11111111-1111-1111-1111-111111111111',
            'effective_date' => '2026-05-30',
        ]);

        $this->assertSame('10.00', $out['result']);
        $this->assertSame('potency', $out['contextual_route']);
        $this->assertSame('potency_assay', $out['measval']['evidence']['category']);
    }

    public function testSimP0804PackagingPolicyIsItemSpecific(): void
    {
        $engine = $this->engine(
            units: [
                'BOX' => $this->unit('BOX', 'CountOrQuantity', null),
                'EA' => $this->unit('EA', 'CountOrQuantity', '1'),
            ],
            packaging: [
                'ITEM-A|SUP-1' => $this->packPolicy('ITEM-A', 'SUP-1', '10'),
                'ITEM-B|SUP-1' => $this->packPolicy('ITEM-B', 'SUP-1', '24'),
            ]
        );

        $itemA = $engine->convert('1', 'BOX', 'EA', 0, context: [
            'item_id' => 'ITEM-A',
            'supplier_id' => 'SUP-1',
            'packaging_level' => 'outer',
            'effective_date' => '2026-05-30',
        ]);
        $itemB = $engine->convert('1', 'BOX', 'EA', 0, context: [
            'item_id' => 'ITEM-B',
            'supplier_id' => 'SUP-1',
            'packaging_level' => 'outer',
            'effective_date' => '2026-05-30',
        ]);

        $this->assertSame('10', $itemA['result']);
        $this->assertSame('24', $itemB['result']);
    }

    public function testSimP0805ExpiredPackagingPolicyRejects(): void
    {
        $engine = $this->engine(
            units: [
                'BOX' => $this->unit('BOX', 'CountOrQuantity', null),
                'EA' => $this->unit('EA', 'CountOrQuantity', '1'),
            ],
            packaging: [
                'ITEM-X|SUP-1' => $this->packPolicy('ITEM-X', 'SUP-1', '10', '2026-01-01', '2026-02-01'),
            ]
        );

        $this->expectException(UomException::class);
        try {
            $engine->convert('1', 'BOX', 'EA', 0, context: [
                'item_id' => 'ITEM-X',
                'supplier_id' => 'SUP-1',
                'packaging_level' => 'outer',
                'effective_date' => '2026-05-30',
            ]);
        } catch (UomException $e) {
            $this->assertSame('UOM_MISSING_PACKAGING_POLICY', $e->problemCode);
            throw $e;
        }
    }

    public function testDirectDensityContextRequiresEvidence(): void
    {
        $engine = $this->engine(units: [
            'L' => $this->unit('L', 'Volume', '0.001'),
            'kg' => $this->unit('kg', 'Mass', '1'),
        ]);

        $this->expectException(UomException::class);
        $engine->convert('1', 'L', 'kg', 3, context: [
            'material_id' => 'SOLVENT-X',
            'density_value' => '0.8',
            'density_unit' => 'kg_L',
            'source_method' => 'lab',
        ]);
    }

    private function engine(array $units, array $density = [], array $packaging = []): ConversionEngine
    {
        $db = $this->connection($units, $density, $packaging);
        return new ConversionEngine(
            new QuantityKindService($db),
            new ConversionRuleService($db),
            new MeasurementValueFactory(),
            new ContextualConversionPlanner(
                new DensityContextualConverter($db),
                new PotencyContextualConverter(),
                new PackagingContextualConverter(new ItemUomPolicyService($db))
            )
        );
    }

    private function connection(array $units, array $density, array $packaging): Connection
    {
        return new class($units, $density, $packaging) extends Connection {
            public function __construct(
                private array $units,
                private array $density,
                private array $packaging,
            ) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                if (str_contains($sql, 'FROM uom_unit_catalog')) {
                    return $this->units[(string)($params[':code'] ?? '')] ?? null;
                }
                if (str_contains($sql, 'FROM material_density_registry')) {
                    $key = (string)($params[':sc'] ?? '') . '|' . (string)($params[':lot_id'] ?? '');
                    return $this->density[$key] ?? $this->density[(string)($params[':sc'] ?? '') . '|'] ?? null;
                }
                if (str_contains($sql, 'FROM item_packaging_policy')) {
                    $key = (string)($params[':item'] ?? '') . '|' . (string)($params[':supp'] ?? '');
                    $row = $this->packaging[$key] ?? null;
                    if ($row === null) {
                        return null;
                    }
                    $asOf = (string)($params[':as_of'] ?? '9999-12-31');
                    if (($row['effective_to'] ?? null) !== null && (string)$row['effective_to'] <= $asOf) {
                        return null;
                    }
                    return $row;
                }
                if (str_contains($sql, 'FROM uom_quantity_kind_compatibility') || str_contains($sql, 'FROM uom_conversion_rule')) {
                    return null;
                }
                return null;
            }

            public function query(string $sql, array $params = []): array
            {
                return [];
            }

            public function execute(string $sql, array $params = []): int
            {
                return 0;
            }
        };
    }

    private function unit(string $code, string $kind, ?string $siFactor): array
    {
        return [
            'canonical_code' => $code,
            'quantity_kind_code' => $kind,
            'si_factor' => $siFactor,
            'si_offset' => '0',
            'is_affine' => false,
            'lifecycle_status' => 'active',
            'risk_level' => 'medium',
        ];
    }

    private function packPolicy(string $itemId, string $supplierId, string $outerQty, string $from = '2026-01-01', ?string $to = null): array
    {
        return [
            'id' => 'pack-' . $itemId,
            'item_id' => $itemId,
            'supplier_id' => $supplierId,
            'outer_pack_qty' => $outerQty,
            'effective_from' => $from,
            'effective_to' => $to,
        ];
    }
}
