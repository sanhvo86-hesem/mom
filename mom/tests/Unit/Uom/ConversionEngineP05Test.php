<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ConversionEngine;
use MOM\Api\Services\Uom\ConversionRuleService;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use MOM\Api\Services\Uom\QuantityKindService;
use MOM\Api\Services\Uom\UomCategoryNotSupportedException;
use MOM\Api\Services\Uom\UomMagnitudeOverflowException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class ConversionEngineP05Test extends TestCase
{
    public function testSimP0501LargeScientificKgToGPreservesExactDecimalString(): void
    {
        $engine = $this->engine(
            [
                'kg' => $this->unit('kg', 'Mass', '1'),
                'g' => $this->unit('g', 'Mass', '0.001'),
            ],
            [
                'kg>g' => $this->rule('UOMCONV-MASS-KG-G-v1', 'exact_linear', '1000', true),
            ]
        );

        $out = $engine->convert('9007199254740993e0', 'kg', 'g', 0);

        $this->assertSame('9007199254740993000', $out['result']);
        $this->assertSame('9007199254740993', $out['measval']['input']['magnitude']);
        $this->assertSame(1, $out['measval']['evidence']['rule_version']);
        $this->assertSame('exact_linear', $out['measval']['evidence']['category']);
        $this->assertFalse($out['measval']['evidence']['reversed']);
        $this->assertSame('2026-01-01', $out['measval']['evidence']['effective_from']);
        $this->assertTrue($out['measval']['precision_envelope']['factor_exact']);
        $this->assertSame(30, $out['measval']['precision_envelope']['calculation_scale']);
        $this->assertSame(0, $out['measval']['precision_envelope']['output_precision']);
    }

    public function testSimP0502AffineFahrenheitToCelsiusIsNotFactorOnly(): void
    {
        $engine = $this->engine(
            [
                'degF' => $this->unit('degF', 'ThermodynamicTemperature', '0.55555555555555555556', true),
                'Cel' => $this->unit('Cel', 'ThermodynamicTemperature', '1', true),
            ],
            [
                'degF>Cel' => $this->rule(
                    'UOMCONV-TEMP-DEGF-CEL-v1',
                    'affine',
                    '0.55555555555555555556',
                    true,
                    '-32'
                ),
            ]
        );

        $out = $engine->convert('98.6', 'degF', 'Cel', 1);

        $this->assertSame('37.0', $out['result']);
        $this->assertNotSame('54.8', $out['result']);
    }

    public function testReverseAffineUsesOffsetFormula(): void
    {
        $engine = $this->engine(
            [
                'degF' => $this->unit('degF', 'ThermodynamicTemperature', '0.55555555555555555556', true),
                'Cel' => $this->unit('Cel', 'ThermodynamicTemperature', '1', true),
            ],
            [
                'degF>Cel' => $this->rule(
                    'UOMCONV-TEMP-DEGF-CEL-v1',
                    'affine',
                    '0.55555555555555555556',
                    true,
                    '-32'
                ),
            ]
        );

        $out = $engine->convert('37', 'Cel', 'degF', 1);

        $this->assertSame('98.6', $out['result']);
        $this->assertTrue($out['measval']['evidence']['reversed']);
    }

    public function testSimP0503LogarithmicCategoryRejectsDeterministically(): void
    {
        $engine = $this->engine(
            [
                'pH' => $this->unit('pH', 'Acidity', '1'),
                'mol_L' => $this->unit('mol_L', 'Acidity', '1'),
            ],
            [
                'pH>mol_L' => $this->rule('UOMCONV-PH-MOLL-v1', 'logarithmic', '1', false),
            ]
        );

        $this->expectException(UomCategoryNotSupportedException::class);
        $this->expectExceptionCode(422);
        $engine->convert('7', 'pH', 'mol_L', 2);
    }

    public function testSimP0504DensityBasedCategoryRejectsBeforeP08(): void
    {
        $engine = $this->engine(
            [
                'L' => $this->unit('L', 'Volume', '0.001'),
                'mL' => $this->unit('mL', 'Volume', '0.000001'),
            ],
            [
                'L>mL' => $this->rule('UOMCONV-DENS-CONTEXT-v1', 'density_based', '1', false),
            ]
        );

        $this->expectException(UomCategoryNotSupportedException::class);
        $engine->convert('1', 'L', 'mL', 2);
    }

    public function testSimP0505OverflowRejectsBeforeDbRead(): void
    {
        $queries = new \ArrayObject();
        $engine = $this->engine([], [], $queries);

        $this->expectException(UomMagnitudeOverflowException::class);
        try {
            $engine->convert(str_repeat('9', 61), 'kg', 'g', 2);
        } finally {
            $this->assertCount(0, $queries);
        }
    }

    public function testCategoryDispatchMatrixContainsEveryDbCategory(): void
    {
        foreach ([
            'identity',
            'exact_linear',
            'defined_linear',
            'approximate_linear',
            'affine',
            'si_base_hop',
            'dimensionless_strict',
            'ratio',
            'logarithmic',
            'derived_expression',
            'density_based',
            'potency_assay',
            'packaging_policy',
            'arbitrary',
            'device_display',
        ] as $category) {
            $this->assertArrayHasKey($category, ConversionEngine::CATEGORY_DISPATCH);
        }
    }

    private function engine(array $units, array $rules, ?\ArrayObject $queries = null): ConversionEngine
    {
        $db = new class($units, $rules, $queries ?? new \ArrayObject()) extends Connection {
            public function __construct(
                private array $units,
                private array $rules,
                private \ArrayObject $queries,
            ) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                $this->queries->append(['sql' => $sql, 'params' => $params]);
                if (str_contains($sql, 'FROM uom_unit_catalog')) {
                    return $this->units[(string)($params[':code'] ?? '')] ?? null;
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

        return new ConversionEngine(
            new QuantityKindService($db),
            new ConversionRuleService($db),
            new MeasurementValueFactory()
        );
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
        ];
    }

    private function rule(
        string $code,
        string $category,
        string $factor,
        bool $factorExact,
        string $offset = '0'
    ): array {
        return [
            'rule_code' => $code,
            'version' => 1,
            'category' => $category,
            'factor' => $factor,
            'offset_value' => $offset,
            'rounding_policy_id' => 'ROUND_HALF_EVEN',
            'risk_level' => 'low',
            'factor_exact' => $factorExact,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'context_required' => false,
        ];
    }
}
