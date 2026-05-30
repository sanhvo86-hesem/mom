<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ContextualConversionPlanner;
use MOM\Api\Services\Uom\DensityContextualConverter;
use MOM\Api\Services\Uom\UomException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P05 — ContextualConversionPlanner contract test
 * (closes HB-07).
 *
 * The planner is a routing layer; the contract tests pin the
 * classifier output for each V3 simulation case. Execution tests
 * rely on a stub density converter so the planner stays
 * decoupled from a real Postgres registry.
 */
final class ContextualConversionPlannerTest extends TestCase
{
    public function testSameKindClassifiedAsPassThrough(): void
    {
        $p = $this->planner();
        $r = $p->classify(
            ['quantity_kind_code' => 'Mass'],
            ['quantity_kind_code' => 'Mass'],
            []
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_SAME_KIND, $r['route']);
    }

    public function testSim017VolumeToMassWithoutContextIsForbidden(): void
    {
        $p = $this->planner();
        $r = $p->classify(
            ['quantity_kind_code' => 'Volume'],
            ['quantity_kind_code' => 'Mass'],
            [] // no substance_code
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_FORBIDDEN, $r['route']);
        $this->assertArrayHasKey('context_required', $r);
        $this->assertArrayHasKey('substance_code', $r['context_required']);
    }

    public function testSim017ExecuteWithoutContextThrowsContextRequired(): void
    {
        $p = $this->planner();
        try {
            $p->execute(
                '10', 'L', 'kg',
                ['quantity_kind_code' => 'Volume'],
                ['quantity_kind_code' => 'Mass'],
                [], 6, 'ROUND_HALF_EVEN'
            );
            $this->fail('Expected UOM_CONTEXT_REQUIRED');
        } catch (UomException $e) {
            $this->assertSame('UOM_CONTEXT_REQUIRED', $e->problemCode);
        }
    }

    public function testSim018VolumeToMassWithSubstanceIsDensityRoute(): void
    {
        $p = $this->planner();
        $r = $p->classify(
            ['quantity_kind_code' => 'Volume'],
            ['quantity_kind_code' => 'Mass'],
            ['substance_code' => 'WATER']
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_DENSITY, $r['route']);
    }

    public function testSim020MassToAmountWithoutAssayIsForbidden(): void
    {
        $p = $this->planner();
        $r = $p->classify(
            ['quantity_kind_code' => 'Mass'],
            ['quantity_kind_code' => 'AmountOfSubstance'],
            []
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_FORBIDDEN, $r['route']);
        $this->assertArrayHasKey('assay_pct', $r['context_required']);
    }

    public function testUnknownKindPairIsForbidden(): void
    {
        $p = $this->planner();
        $r = $p->classify(
            ['quantity_kind_code' => 'Length'],
            ['quantity_kind_code' => 'Power'],
            []
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_FORBIDDEN, $r['route']);
    }

    // ────────────────────────────────────────────────────────────────────────

    private function planner(): ContextualConversionPlanner
    {
        // The classifier path under test does not invoke the
        // DensityContextualConverter — it only routes. We therefore use
        // PHPUnit's createMock to keep the planner satisfied without
        // touching DensityContextualConverter's `private readonly Connection`
        // (which extending+overriding causes a fatal under PHP 8.5).
        $density = $this->createMock(DensityContextualConverter::class);
        return new ContextualConversionPlanner($density);
    }
}
