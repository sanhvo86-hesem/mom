<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use DateTimeZone;
use MOM\Services\MdaRuntimeSecurityBoundaryService;
use PHPUnit\Framework\TestCase;

final class MdaRuntimeSecurityBoundaryServiceTest extends TestCase
{
    public function testBolaAttemptBlocked(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->evaluateBola([
            'actor_ref' => 'supplier-user',
            'supplier_party_id_scope' => ['SUP-001'],
        ], [
            'kind' => 'supplier_quality_case',
            'resource_ref' => 'SCAR-002',
            'supplier_party_id' => 'SUP-002',
        ], [
            'granted' => true,
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('bola_scope_violation_blocked', $result['reason_code']);
    }

    public function testAiReleaseRequestRefused(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->evaluateAiAction([
            'actor_ref' => 'mda-copilot',
            'actor_type' => 'ai',
        ], [
            'command_name' => 'ReleaseQualityHold',
            'action_class' => 'release',
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('ai_governed_action_refused', $result['reason_code']);
    }

    public function testPrivilegedCommandRequiresReauth(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->evaluatePrivilegedReauth([
            'command_name' => 'ApproveEngineeringReleasePackage',
            'privileged' => true,
        ], []);

        $this->assertFalse($result['allowed']);
        $this->assertSame('privileged_reauth_required', $result['reason_code']);
    }

    public function testExpiredSodExceptionBlocksApproval(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->evaluateSodException([
            'requester_ref' => 'u-1',
            'approver_ref' => 'u-1',
        ], [
            'exception_code' => 'SOD-1',
            'reason' => 'Emergency cover',
            'approved_by' => 'qa-manager',
            'exception_state' => 'approved',
            'expires_at' => '2026-05-01T00:00:00+00:00',
        ], new DateTimeImmutable('2026-05-29T00:00:00+00:00', new DateTimeZone('UTC')));

        $this->assertFalse($result['allowed']);
        $this->assertSame('sod_exception_expired', $result['reason_code']);
    }

    public function testUnapprovedSignalTagMapCannotChangeSemantics(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->evaluateOtSignalTrust([
            'adapter_code' => 'MTCONNECT-01',
            'approved' => true,
            'approved_checksum_sha256' => str_repeat('a', 64),
        ], [
            'signal_tag' => 'path/feedhold',
            'proposed_checksum_sha256' => str_repeat('b', 64),
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('ot_signal_tag_map_not_approved', $result['reason_code']);
    }

    public function testFieldRedactionMasksUnauthorizedSensitiveField(): void
    {
        $result = (new MdaRuntimeSecurityBoundaryService())->redactFields([
            'roles' => ['operator'],
        ], [
            'supplier_name' => 'Supplier A',
            'bank_account' => '123456789',
        ], [[
            'field_name' => 'bank_account',
            'visible_role_codes' => ['finance_manager'],
            'mask_strategy' => 'last4',
        ]]);

        $this->assertTrue($result['allowed']);
        $this->assertSame('field_redaction_applied', $result['reason_code']);
        $this->assertSame('*****6789', $result['record']['bank_account']);
    }
}
