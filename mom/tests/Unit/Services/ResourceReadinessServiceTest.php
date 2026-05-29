<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\ResourceReadinessService;
use PHPUnit\Framework\TestCase;

final class ResourceReadinessServiceTest extends TestCase
{
    private const HASH_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    private const HASH_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    public function testOperatorTrainingExpiredBlocksStart(): void
    {
        $result = (new ResourceReadinessService())->evaluateReleaseOrStart([
            'command_name' => 'StartJob',
            'work_order_ref' => 'WO-1',
            'operator_id' => 'EMP-1',
            'operator_qualification' => [
                'employee_id' => 'EMP-1',
                'qualification_code' => 'CNC-L2',
                'status' => 'qualified',
                'expiry_date' => '2026-05-01',
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('resource_readiness_blocked', $result['reason_code']);
        $this->assertContains('operator_training_expired', $this->blockerCodes($result));
        $this->assertSame('blocked', $result['readiness_snapshot']['readiness_state']);
    }

    public function testMachinePmOverdueBlocksStart(): void
    {
        $result = (new ResourceReadinessService())->evaluateReleaseOrStart([
            'command_name' => 'StartJob',
            'work_order_ref' => 'WO-2',
            'machine' => [
                'machine_id' => 'MILL-1',
                'status' => 'active',
                'pm_status' => 'overdue',
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertContains('machine_pm_overdue', $this->blockerCodes($result));
    }

    public function testMaterialLotOnHoldBlocksIssue(): void
    {
        $result = (new ResourceReadinessService())->evaluateMaterialIssue([
            'work_order_ref' => 'WO-3',
            'material_lot_id' => 'LOT-1',
            'quality_holds' => [
                [
                    'quality_hold_id' => 'HOLD-1',
                    'subject_type' => 'lot',
                    'subject_ref' => 'LOT-1',
                    'hold_status' => 'active',
                    'severity_code' => 'critical',
                ],
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertContains('material_lot_on_hold', $this->blockerCodes($result));
        $this->assertSame(['HOLD-1'], $result['readiness_snapshot']['quality_hold_refs']);
    }

    public function testWrongNcChecksumBlocksStart(): void
    {
        $result = (new ResourceReadinessService())->evaluateReleaseOrStart([
            'command_name' => 'StartJob',
            'work_order_ref' => 'WO-4',
            'nc_program_id' => 'NC-1',
            'expected_nc_checksum_sha256' => self::HASH_A,
            'controller_nc_checksum_sha256' => self::HASH_B,
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertContains('nc_checksum_mismatch', $this->blockerCodes($result));
    }

    public function testIpqcFailHoldsWipAndCreatesQualityCasePlan(): void
    {
        $plan = (new ResourceReadinessService())->planIpqcFailureContainment([
            'inspection_id' => 'IPQC-1',
            'work_order_id' => 'WO-5',
            'lot_id' => 'LOT-5',
            'result' => 'fail',
            'severity' => 'major',
            'defects' => [['code' => 'BURR']],
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertSame('quality_failure_containment_required', $plan['reason_code']);
        $this->assertContains('complete_operation', $plan['gates_blocked']);
        $this->assertNotEmpty(array_filter($plan['holds'], static fn(array $hold): bool => ($hold['subject_type'] ?? '') === 'work_order'));
        $this->assertSame('quality.containment_required', $plan['runtime_event']['event_type']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $plan['runtime_event']['event_hash_sha256']);
    }

    /**
     * @param array<string, mixed> $result
     * @return list<string>
     */
    private function blockerCodes(array $result): array
    {
        return array_values(array_map(static fn(array $blocker): string => (string)$blocker['code'], $result['blockers'] ?? []));
    }
}
