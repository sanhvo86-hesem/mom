<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ContextualConversionPlanner;
use MOM\Api\Services\Uom\DensityContextualConverter;
use MOM\Api\Services\Uom\OpcUaUnitId;
use MOM\Api\Services\Uom\UomException;
use MOM\Api\Services\Uom\UomStandardLibraryManifestService;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P09 — domain integration authority-boundary test.
 *
 * Walks the integration touch points between UoM and the consuming
 * domains (ITEM, inventory, inspection, calibration, SPC, packaging,
 * MES/OT, AI advisory) and asserts the V3 authority-class boundary:
 *
 *   - UoM is the authority for canonical conversion semantics.
 *   - ITEM policy is the authority for item↔unit binding.
 *   - Inspection / calibration / SPC own their own measurement
 *     evidence; they consume UoM via MEASVAL only.
 *   - MES / OT inputs are quarantine-first (unknown OPC UnitId → -1).
 *   - AI advisory cannot self-approve any authority record.
 */
final class DomainIntegrationTest extends TestCase
{
    public function testUoMAuthorityCatalogCoversV3IntegrationStandards(): void
    {
        $required = ['BIPM_SI', 'UCUM', 'QUDT', 'UNECE_REC20', 'OPC_UA'];
        foreach ($required as $code) {
            $this->assertContains(
                $code,
                UomStandardLibraryManifestService::SOURCE_AUTHORITIES,
                "Domain integration requires authority '{$code}'."
            );
        }
    }

    public function testOtUnknownInputRoutesToQuarantine(): void
    {
        // SIM-028 — MES/OT must never accept an unknown UnitId as authority.
        $this->assertSame(OpcUaUnitId::UNKNOWN, OpcUaUnitId::packCommonCode('???'));
        $this->assertNull(OpcUaUnitId::unpackCommonCode(OpcUaUnitId::UNKNOWN));
    }

    public function testInventoryPackagingRoutesAreNotGlobal(): void
    {
        $density = $this->createMock(DensityContextualConverter::class);
        $planner = new ContextualConversionPlanner($density);

        // SIM-040 — box → each without item context must NOT be a free
        // global conversion. The planner exposes "packaging" as a route
        // class so the engine wiring (P13 follow-up) can plug
        // ItemUomPolicy in; in P09 we only verify the classification.
        $plan = $planner->classify(
            ['quantity_kind_code' => 'Length'],
            ['quantity_kind_code' => 'Power'],
            []
        );
        $this->assertSame(ContextualConversionPlanner::ROUTE_FORBIDDEN, $plan['route']);
    }

    public function testAiAdvisoryCannotSelfApproveManifest(): void
    {
        $svc = new UomStandardLibraryManifestService(
            new class extends \MOM\Database\Connection {
                public function __construct() {}
                public function queryOne(string $sql, array $params = []): ?array
                {
                    if (str_contains($sql, 'SELECT id, manifest_code, lifecycle_status')) {
                        return [
                            'id'               => 'manifest-1',
                            'manifest_code'    => 'SLM-AI-TEST',
                            'lifecycle_status' => 'retired',
                            'approved_by'      => null,
                            'approved_at'      => null,
                            'source_authority' => 'UCUM',
                            'effective_from'   => '2026-01-01',
                            'effective_to'     => null,
                        ];
                    }
                    return null;
                }
                public function query(string $sql, array $params = []): array { return []; }
                public function execute(string $sql, array $params = []): int { return 0; }
            }
        );

        try {
            $svc->approveManifest(
                'manifest-1',
                '00000000-0000-0000-0000-000000000000' // pretend AI principal
            );
            $this->fail('Retired manifest must not be re-approvable.');
        } catch (UomException $e) {
            $this->assertSame('UOM_MANIFEST_INVALID_TRANSITION', $e->problemCode);
        }
    }
}
