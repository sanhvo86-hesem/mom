<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\TraceabilityGenealogyService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class TraceabilityGenealogyServiceTest extends TestCase
{
    private string $tmpDir;
    private TraceabilityGenealogyService $traceability;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_traceability_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);

        $events = new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $this->traceability = new TraceabilityGenealogyService($this->tmpDir, events: $events);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testCreatesDeterministicBackwardAndForwardTraceChain(): void
    {
        $this->seedSupplierToShipmentChain('SUP-LOT-1', 'REC-LOT-1', 'PROD-LOT-1', 'SHIP-1', 'SITE-A');

        $upstream = $this->traceability->upstreamTrace(['shipment_id' => 'SHIP-1', 'org_site_id' => 'SITE-A']);
        $downstream = $this->traceability->downstreamTrace(['lot_number' => 'SUP-LOT-1', 'org_site_id' => 'SITE-A']);
        $impact = $this->traceability->impactedOutputs(['lot_number' => 'SUP-LOT-1', 'org_site_id' => 'SITE-A']);

        $this->assertSame('upstream', $upstream['direction']);
        $this->assertSame('downstream', $downstream['direction']);
        $this->assertSame(4, $upstream['node_count']);
        $this->assertSame(3, $upstream['edge_count']);
        $this->assertSame([
            'supplier_receipt',
            'production_consumption',
            'shipment_pack',
        ], array_column($downstream['edges'], 'link_type'));
        $this->assertSame(3, $impact['impacted_output_count']);
        $this->assertSame(1, $impact['shipment_count']);
        $this->assertSame('SHIP-1', $impact['shipments'][0]['shipment_id']);
    }

    public function testBrokenGenealogyReferenceIsRejectedBeforeAppend(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('broken_genealogy_reference');

        $this->traceability->recordGenealogyLink([
            'link_type' => 'production_consumption',
            'parent_lot_number' => 'SUP-LOT-BROKEN',
            'wo_number' => 'WO-BROKEN',
        ]);
    }

    public function testTraceReadModelHonorsSiteScope(): void
    {
        $this->seedSupplierToShipmentChain('SUP-SCOPE', 'REC-A', 'PROD-A', 'SHIP-A', 'SITE-A');
        $this->seedSupplierToShipmentChain('SUP-SCOPE', 'REC-B', 'PROD-B', 'SHIP-B', 'SITE-B');

        $siteA = $this->traceability->downstreamTrace(['lot_number' => 'SUP-SCOPE', 'org_site_id' => 'SITE-A']);
        $siteB = $this->traceability->downstreamTrace(['lot_number' => 'SUP-SCOPE', 'org_site_id' => 'SITE-B']);

        $this->assertSame(['SHIP-A'], array_values(array_filter(array_map(
            static fn(array $node): string => (string)($node['shipment_id'] ?? ''),
            $siteA['nodes'],
        ))));
        $this->assertSame(['SHIP-B'], array_values(array_filter(array_map(
            static fn(array $node): string => (string)($node['shipment_id'] ?? ''),
            $siteB['nodes'],
        ))));
    }

    public function testSupplierQualityIssueBlocksConsumptionAndShipmentUntilClosed(): void
    {
        $this->seedSupplierToShipmentChain('SUP-LOT-Q', 'REC-LOT-Q', 'PROD-LOT-Q', 'SHIP-Q', 'SITE-A');
        $this->traceability->recordSupplierQualityIssue([
            'supplier_issue_id' => 'SQI-1',
            'scar_id' => 'SCAR-1',
            'inspection_id' => 'INC-1',
            'affected_lot_number' => 'SUP-LOT-Q',
            'vendor_id' => 'VEND-1',
            'issue_status' => 'issued',
            'org_site_id' => 'SITE-A',
            'occurred_at' => '2026-04-13T10:00:00Z',
        ]);

        $impact = $this->traceability->supplierIssueImpactSummary(['scar_id' => 'SCAR-1', 'org_site_id' => 'SITE-A']);
        $shipment = $this->traceability->shipmentEligibility(['shipment_id' => 'SHIP-Q', 'org_site_id' => 'SITE-A']);

        $this->assertSame(1, $impact['issue_count']);
        $this->assertSame(3, $impact['issues'][0]['impacted_output_count']);
        $this->assertFalse($shipment['eligible']);
        $this->assertSame('supplier_quality_shipment_block', $shipment['blockers'][0]['reason_code']);

        try {
            $this->traceability->recordProductionConsumption([
                'parent_lot_number' => 'SUP-LOT-Q',
                'child_lot_number' => 'PROD-LOT-BLOCKED',
                'wo_number' => 'WO-BLOCKED',
                'org_site_id' => 'SITE-A',
            ]);
            $this->fail('Open supplier quality issue should block consumption.');
        } catch (RuntimeException $e) {
            $this->assertSame('material_consumption_blocked_by_supplier_quality', $e->getMessage());
        }

        $this->traceability->recordSupplierQualityIssue([
            'supplier_issue_id' => 'SQI-1',
            'scar_id' => 'SCAR-1',
            'inspection_id' => 'INC-1',
            'affected_lot_number' => 'SUP-LOT-Q',
            'vendor_id' => 'VEND-1',
            'issue_status' => 'closed',
            'org_site_id' => 'SITE-A',
            'occurred_at' => '2026-04-13T11:00:00Z',
        ]);

        $eligible = $this->traceability->consumptionEligibility(['lot_number' => 'SUP-LOT-Q', 'org_site_id' => 'SITE-A']);
        $this->assertTrue($eligible['eligible']);
    }

    public function testContainmentPacketBlocksClosureUntilImpactEvidenceAndApprovalArePresent(): void
    {
        $this->seedSupplierToShipmentChain('SUP-LOT-C', 'REC-LOT-C', 'PROD-LOT-C', 'SHIP-C', 'SITE-A');
        $this->traceability->recordSupplierQualityIssue([
            'supplier_issue_id' => 'SQI-C',
            'scar_id' => 'SCAR-C',
            'affected_lot_number' => 'SUP-LOT-C',
            'vendor_id' => 'VEND-C',
            'issue_status' => 'issued',
            'org_site_id' => 'SITE-A',
            'occurred_at' => '2026-04-13T12:00:00Z',
        ]);

        $blocked = $this->traceability->assembleContainmentPacket([
            'supplier_issue_id' => 'SQI-C',
            'scar_id' => 'SCAR-C',
            'affected_lot_number' => 'SUP-LOT-C',
            'required_evidence_ids' => ['EVID-C'],
            'required_approval_ids' => ['APR-C'],
            'org_site_id' => 'SITE-A',
        ]);

        $this->assertSame('blocked', $blocked['packet_state']);
        $this->assertSame([
            'impact_assessment_incomplete',
            'required_evidence_missing',
            'required_approval_missing',
        ], array_column($blocked['blockers'], 'reason_code'));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('containment_packet_blocked');
        $this->traceability->resolveContainmentPacket([
            'supplier_issue_id' => 'SQI-C',
            'scar_id' => 'SCAR-C',
            'affected_lot_number' => 'SUP-LOT-C',
            'required_evidence_ids' => ['EVID-C'],
            'required_approval_ids' => ['APR-C'],
            'impact_assessment_completed' => true,
            'evidence_ids' => ['EVID-C'],
            'org_site_id' => 'SITE-A',
        ]);
    }

    public function testContainmentPacketCanResolveWithRequiredProof(): void
    {
        $this->seedSupplierToShipmentChain('SUP-LOT-R', 'REC-LOT-R', 'PROD-LOT-R', 'SHIP-R', 'SITE-A');
        $this->traceability->recordSupplierQualityIssue([
            'supplier_issue_id' => 'SQI-R',
            'scar_id' => 'SCAR-R',
            'affected_lot_number' => 'SUP-LOT-R',
            'vendor_id' => 'VEND-R',
            'issue_status' => 'issued',
            'org_site_id' => 'SITE-A',
        ]);

        $resolved = $this->traceability->resolveContainmentPacket([
            'supplier_issue_id' => 'SQI-R',
            'scar_id' => 'SCAR-R',
            'affected_lot_number' => 'SUP-LOT-R',
            'required_evidence_ids' => ['EVID-R'],
            'required_approval_ids' => ['APR-R'],
            'impact_assessment_completed' => true,
            'evidence_ids' => ['EVID-R'],
            'approval_ids' => ['APR-R'],
            'resolved_by' => 'qa-manager',
            'org_site_id' => 'SITE-A',
        ]);

        $this->assertSame('resolved', $resolved['packet_state']);
        $this->assertSame(0, $resolved['blocker_count']);
        $this->assertSame('SCAR-R', $resolved['triggering_issue']['scar_id']);
        $this->assertSame(3, $resolved['impact_summary']['impacted_output_count']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $resolved['packet_hash']);
    }

    private function seedSupplierToShipmentChain(string $supplierLot, string $receiptLot, string $productionLot, string $shipmentId, string $siteId): void
    {
        $this->traceability->recordGenealogyLink([
            'link_type' => 'supplier_receipt',
            'parent_lot_number' => $supplierLot,
            'child_lot_number' => $receiptLot,
            'vendor_id' => 'VEND-1',
            'inspection_id' => 'INC-' . $receiptLot,
            'org_site_id' => $siteId,
            'occurred_at' => '2026-04-13T08:00:00Z',
        ]);
        $this->traceability->recordGenealogyLink([
            'link_type' => 'production_consumption',
            'parent_lot_number' => $receiptLot,
            'child_lot_number' => $productionLot,
            'wo_number' => 'WO-' . $productionLot,
            'operation_seq' => '20',
            'org_site_id' => $siteId,
            'occurred_at' => '2026-04-13T08:30:00Z',
        ]);
        $this->traceability->recordGenealogyLink([
            'link_type' => 'shipment_pack',
            'lot_number' => $productionLot,
            'shipment_id' => $shipmentId,
            'packing_id' => 'PK-' . $shipmentId,
            'package_number' => 'PKG-' . $shipmentId,
            'org_site_id' => $siteId,
            'occurred_at' => '2026-04-13T09:00:00Z',
        ]);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
