<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ConversionEngine;
use MOM\Api\Services\Uom\ConversionRuleService;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use MOM\Api\Services\Uom\QuantityKindService;
use MOM\Api\Services\Uom\UomKindMismatchException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class QuantityKindCompatibilityP07Test extends TestCase
{
    public function testSimP0701TorqueToEnergyRejectsByDefault(): void
    {
        $engine = $this->engine(
            [
                'N_m' => $this->unit('N_m', 'Torque', '1'),
                'J' => $this->unit('J', 'Energy', '1'),
            ],
            [],
            [
                'Torque>Energy' => $this->denyRule('same_dimension_semantic_trap'),
            ]
        );

        $this->expectException(UomKindMismatchException::class);
        try {
            $engine->convert('10', 'N_m', 'J', 2, context: ['trace_id' => 'trace-p07-01']);
        } catch (UomKindMismatchException $e) {
            $this->assertSame('Torque', $e->fromKind);
            $this->assertSame('Energy', $e->toKind);
            $this->assertSame('same_dimension_semantic_trap', $e->reason);
            $this->assertSame('trace-p07-01', $e->traceId);
            throw $e;
        }
    }

    public function testSimP0702DeltaCelToDeltaKAllowsLinearOneToOne(): void
    {
        $engine = $this->engine(
            [
                'DeltaCel' => $this->unit('DeltaCel', 'TemperatureDifference', '1'),
                'DeltaK' => $this->unit('DeltaK', 'TemperatureDifference', '1'),
            ],
            [
                'DeltaCel>DeltaK' => $this->rule('UOMCONV-TDIFF-DELTACEL-DELTAK-v1', 'exact_linear', '1'),
            ],
            []
        );

        $out = $engine->convert('10', 'DeltaCel', 'DeltaK', 0, context: ['trace_id' => 'trace-p07-02']);

        $this->assertSame('10', $out['result']);
        $this->assertSame('TemperatureDifference', $out['measval']['semantic_context']['quantity_kind']);
    }

    public function testSimP0703AbsoluteCelToKAllowsAffine(): void
    {
        $engine = $this->engine(
            [
                'Cel' => $this->unit('Cel', 'ThermodynamicTemperature', '1', true),
                'K' => $this->unit('K', 'ThermodynamicTemperature', '1'),
            ],
            [
                'Cel>K' => $this->rule('UOMCONV-TEMP-CEL-K-v1', 'affine', '1', '273.15'),
            ],
            []
        );

        $out = $engine->convert('10', 'Cel', 'K', 2, context: ['trace_id' => 'trace-p07-03']);

        $this->assertSame('283.15', $out['result']);
    }

    public function testSimP0704YieldPercentToConcentrationPercentRejects(): void
    {
        $svc = $this->quantityKindService([
            'YieldPercentage>ConcentrationPercentage' => $this->denyRule('dimensionless_subtype_trap'),
        ]);

        $this->expectException(UomKindMismatchException::class);
        try {
            $svc->assertCompatible(
                ['quantity_kind_code' => 'YieldPercentage'],
                ['quantity_kind_code' => 'ConcentrationPercentage'],
                'trace-p07-04',
                new \DateTimeImmutable('2026-05-30')
            );
        } catch (UomKindMismatchException $e) {
            $this->assertSame('dimensionless_subtype_trap', $e->reason);
            throw $e;
        }
    }

    public function testSimP0705PhToHydrogenConcentrationRejectsWithoutChemistryHandler(): void
    {
        $svc = $this->quantityKindService([
            'pH>Molarity' => $this->denyRule('logarithmic_requires_chemistry_handler'),
        ]);

        $this->expectException(UomKindMismatchException::class);
        try {
            $svc->assertCompatible(
                ['quantity_kind_code' => 'pH'],
                ['quantity_kind_code' => 'Molarity'],
                'trace-p07-05',
                new \DateTimeImmutable('2026-05-30')
            );
        } catch (UomKindMismatchException $e) {
            $this->assertSame('logarithmic_requires_chemistry_handler', $e->reason);
            $this->assertStringContainsString('chemistry handler', $e->remediationPath);
            throw $e;
        }
    }

    public function testExplicitActiveCompatibilityCanAllowCrossKind(): void
    {
        $svc = $this->quantityKindService([
            'WorkInstructionValue>MachineDisplayValue' => [
                'allowed' => true,
                'compatibility_type' => 'approved_site_specific_semantic_equivalence',
                'condition_schema' => '{}',
                'remediation_path' => 'already approved',
            ],
        ]);

        $svc->assertCompatible(
            ['quantity_kind_code' => 'WorkInstructionValue'],
            ['quantity_kind_code' => 'MachineDisplayValue'],
            'trace-p07-allow',
            new \DateTimeImmutable('2026-05-30')
        );

        $this->addToAssertionCount(1);
    }

    public function testConditionalCompatibilityRequiresHandler(): void
    {
        $svc = $this->quantityKindService([
            'A>B' => [
                'allowed' => true,
                'compatibility_type' => 'conditional',
                'condition_schema' => '{"requires":"site_handler"}',
                'remediation_path' => 'route through handler',
            ],
        ]);

        $this->expectException(UomKindMismatchException::class);
        $svc->assertCompatible(
            ['quantity_kind_code' => 'A'],
            ['quantity_kind_code' => 'B'],
            'trace-p07-conditional',
            new \DateTimeImmutable('2026-05-30')
        );
    }

    private function engine(array $units, array $rules, array $compatibility): ConversionEngine
    {
        $db = $this->connection($units, $rules, $compatibility);
        return new ConversionEngine(
            new QuantityKindService($db),
            new ConversionRuleService($db),
            new MeasurementValueFactory()
        );
    }

    private function quantityKindService(array $compatibility): QuantityKindService
    {
        return new QuantityKindService($this->connection([], [], $compatibility));
    }

    private function connection(array $units, array $rules, array $compatibility): Connection
    {
        return new class($units, $rules, $compatibility) extends Connection {
            public function __construct(
                private array $units,
                private array $rules,
                private array $compatibility,
            ) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                if (str_contains($sql, 'FROM uom_unit_catalog')) {
                    return $this->units[(string)($params[':code'] ?? '')] ?? null;
                }
                if (str_contains($sql, 'FROM uom_quantity_kind_compatibility')) {
                    $key = (string)($params[':from_kind'] ?? '') . '>' . (string)($params[':to_kind'] ?? '');
                    return $this->compatibility[$key] ?? null;
                }
                if (str_contains($sql, 'FROM uom_conversion_rule')) {
                    $key = str_contains($sql, 'bidirectional = true')
                        ? (string)$params[':to'] . '>' . (string)$params[':from']
                        : (string)$params[':from'] . '>' . (string)$params[':to'];
                    return $this->rules[$key] ?? null;
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

    private function unit(string $code, string $kind, string $siFactor, bool $affine = false): array
    {
        return [
            'canonical_code' => $code,
            'quantity_kind_code' => $kind,
            'si_factor' => $siFactor,
            'si_offset' => '0',
            'is_affine' => $affine,
            'lifecycle_status' => 'active',
            'risk_level' => 'low',
            'dimension_vector' => 'test',
            'measurement_family' => 'test',
        ];
    }

    private function rule(string $code, string $category, string $factor, string $offset = '0'): array
    {
        return [
            'rule_code' => $code,
            'version' => 1,
            'category' => $category,
            'factor' => $factor,
            'offset_value' => $offset,
            'rounding_policy_id' => 'ROUND_HALF_EVEN',
            'risk_level' => 'low',
            'factor_exact' => true,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'context_required' => false,
        ];
    }

    private function denyRule(string $type): array
    {
        return [
            'allowed' => false,
            'compatibility_type' => $type,
            'condition_schema' => '{}',
            'remediation_path' => match ($type) {
                'logarithmic_requires_chemistry_handler' => 'pH requires an explicit logarithmic chemistry handler.',
                default => 'Use the business-correct quantity kind; do not rely on same dimension vectors.',
            },
        ];
    }
}
