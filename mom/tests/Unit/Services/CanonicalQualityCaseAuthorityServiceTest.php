<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\CanonicalQualityCaseAuthorityService;
use PHPUnit\Framework\TestCase;

final class CanonicalQualityCaseAuthorityServiceTest extends TestCase
{
    public function testOqcFailBlocksShipmentAndCreatesVisibleNcrCapaLink(): void
    {
        $plan = (new CanonicalQualityCaseAuthorityService())->createFailureContainmentPlan([
            'inspection_stage' => 'oqc',
            'source_type' => 'oqc',
            'source_id' => 'OQC-1',
            'result' => 'fail',
            'severity' => 'critical',
            'sales_order_id' => 'SO-1',
            'shipment_id' => 'SHIP-1',
            'lot_id' => 'LOT-1',
            'defects' => [['code' => 'DIM_FAIL']],
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertContains('shipment_release', $plan['gates_blocked']);
        $this->assertNotEmpty($plan['holds']);
        $this->assertSame('nonconformance', $plan['quality_order']['case_type']);
        $this->assertNotEmpty(array_filter($plan['case_links'], static fn(array $link): bool => ($link['trace_entity_type'] ?? '') === 'capa_review'));
    }

    public function testIqcFailBlocksPutaway(): void
    {
        $service = new CanonicalQualityCaseAuthorityService();
        $plan = $service->createFailureContainmentPlan([
            'inspection_stage' => 'iqc',
            'source_type' => 'iqc',
            'source_id' => 'IQC-1',
            'result' => 'rejected',
            'receipt_id' => 'RCPT-1',
            'lot_id' => 'LOT-2',
            'supplier_id' => 'SUP-1',
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertContains('putaway_inventory', $plan['gates_blocked']);

        $gate = $service->evaluateHoldGate('lot', 'LOT-2', $plan['holds']);

        $this->assertFalse($gate['allowed']);
        $this->assertSame('active_quality_hold_blocks_subject', $gate['reason_code']);
    }

    public function testMrbUseAsIsRequiresApprovalEsign(): void
    {
        $service = new CanonicalQualityCaseAuthorityService();

        $blocked = $service->evaluateMrbDisposition(
            ['disposition' => 'use_as_is', 'customer_concession_required' => false],
            ['allowed' => false, 'reason_code' => 'signature_meaning_required'],
        );

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('mrb_use_as_is_esign_required', $blocked['reason_code']);

        $allowed = $service->evaluateMrbDisposition(
            ['disposition' => 'use_as_is', 'customer_concession_required' => false],
            ['allowed' => true, 'reason_code' => 'regulated_command_evidence_ready'],
        );

        $this->assertTrue($allowed['allowed']);
        $this->assertSame('mrb_disposition_gate_ready', $allowed['reason_code']);
    }

    public function testCriticalScarBlocksSupplierItemApproval(): void
    {
        $result = (new CanonicalQualityCaseAuthorityService())->evaluateSupplierApprovalAgainstScar(
            ['supplier_ref' => 'SUP-1', 'item_ref' => 'ITEM-1'],
            [
                [
                    'scar_id' => 'SCAR-1',
                    'supplier_ref' => 'SUP-1',
                    'affected_parts' => ['ITEM-1'],
                    'severity' => 'critical',
                    'status' => 'issued',
                ],
            ],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('critical_scar_blocks_supplier_item_approval', $result['reason_code']);
    }

    public function testComplaintTracesBackwardToShipmentLotSerial(): void
    {
        $result = (new CanonicalQualityCaseAuthorityService())->traceComplaintBackward(
            ['complaint_ref' => 'COMP-1'],
            [
                ['case_ref_type' => 'complaint', 'case_ref' => 'COMP-1', 'trace_entity_type' => 'shipment', 'trace_entity_ref' => 'SHIP-1'],
                ['case_ref_type' => 'complaint', 'case_ref' => 'COMP-1', 'trace_entity_type' => 'lot', 'trace_entity_ref' => 'LOT-1'],
                ['case_ref_type' => 'complaint', 'case_ref' => 'COMP-1', 'trace_entity_type' => 'serial', 'trace_entity_ref' => 'SER-1'],
            ],
        );

        $this->assertTrue($result['allowed']);
        $this->assertSame('complaint_backward_trace_ready', $result['reason_code']);
    }
}
