<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\PartyIdentityAuthorityService;
use PHPUnit\Framework\TestCase;

final class PartyIdentityAuthorityServiceTest extends TestCase
{
    public function testTerminatedEmployeeCannotOperateMachine(): void
    {
        $service = new PartyIdentityAuthorityService();

        $result = $service->evaluateOperatorReadiness(
            [
                'employee_id' => 'EMP001',
                'user_status' => 'active',
                'employment_status' => 'terminated',
            ],
            [[
                'employee_id' => 'EMP001',
                'qualification_type' => 'machine',
                'qualification_code' => 'CNC-01',
                'qualification_level' => 'qualified',
                'expiry_date' => '2027-12-31',
            ]],
            [[
                'qualification_type' => 'machine',
                'qualification_code' => 'CNC-01',
            ]],
            new \DateTimeImmutable('2026-05-29T00:00:00Z'),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('employment_not_active', $result['reason_code']);
    }

    public function testExpiredQualificationBlocksOperatorReadiness(): void
    {
        $service = new PartyIdentityAuthorityService();

        $result = $service->evaluateOperatorReadiness(
            [
                'employee_id' => 'EMP002',
                'user_status' => 'active',
                'employment_status' => 'active',
            ],
            [[
                'employee_id' => 'EMP002',
                'qualification_type' => 'machine',
                'qualification_code' => 'CNC-02',
                'qualification_level' => 'qualified',
                'expiry_date' => '2025-12-31',
            ]],
            [[
                'qualification_type' => 'machine',
                'qualification_code' => 'CNC-02',
            ]],
            new \DateTimeImmutable('2026-05-29T00:00:00Z'),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('qualification_expired', $result['reason_code']);
    }

    public function testExpiredSupplierCertificateBlocksReceivingGate(): void
    {
        $service = new PartyIdentityAuthorityService();

        $result = $service->evaluateSupplierProcessApproval([
            'approval_status' => 'approved',
            'effective_from' => '2025-01-01T00:00:00Z',
            'certificate_expires_on' => '2026-01-31',
        ], new \DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('supplier_certificate_expired', $result['reason_code']);
    }

    public function testSamePersonCannotApproveRegulatedReleaseWithoutSodException(): void
    {
        $service = new PartyIdentityAuthorityService();

        $result = $service->evaluateRegulatedSod([
            'created_by_party_id' => 'party-a',
            'approved_by_party_id' => 'party-a',
        ], new \DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('sod_self_approval', $result['reason_code']);
    }

    public function testPartyMergeRequiresEveryReferenceToHaveRemapPolicy(): void
    {
        $service = new PartyIdentityAuthorityService();

        $result = $service->planPartyMergeRemap(
            [
                'losing_party_id' => 'party-old',
                'surviving_party_id' => 'party-new',
            ],
            [
                [
                    'reference_table_name' => 'sales_orders',
                    'reference_pk_json' => ['sales_order_id' => 'SO-1'],
                    'remap_policy' => 'requires_command',
                ],
                [
                    'reference_table_name' => 'ncr_records',
                    'reference_pk_json' => ['ncr_id' => 'NCR-1'],
                    'remap_policy' => 'unknown',
                ],
            ],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('party_merge_unmapped_reference', $result['reason_code']);
    }
}
