<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\RegulatedCommandEvidenceGateService;
use PHPUnit\Framework\TestCase;

final class RegulatedCommandEvidenceGateServiceTest extends TestCase
{
    public function testSignatureWithoutMeaningIsBlocked(): void
    {
        $result = (new RegulatedCommandEvidenceGateService())->evaluateRegulatedCommand(
            $this->command(),
            $this->signature(['signature_meaning' => '']),
            $this->policy(),
            $this->auditReady(),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('signature_meaning_required', $result['reason_code']);
    }

    public function testSameCreatorApproverBlockedUnlessExceptionIsValid(): void
    {
        $service = new RegulatedCommandEvidenceGateService();

        $blocked = $service->evaluateRegulatedCommand(
            $this->command(['actor_ref' => 'qa-1']),
            $this->signature(['signer_ref' => 'qa-1']),
            $this->policy(),
            $this->auditReady(),
        );

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('sod_creator_approver_same_actor', $blocked['reason_code']);

        $allowed = $service->evaluateRegulatedCommand(
            $this->command(['actor_ref' => 'qa-1']),
            $this->signature(['signer_ref' => 'qa-1']),
            $this->policy([
                'sod_exception' => [
                    'approved' => true,
                    'exception_id' => 'SOD-EX-1',
                    'reason' => 'Emergency customer containment.',
                    'approved_by' => 'quality-director',
                    'expires_at' => '2999-01-01T00:00:00Z',
                ],
            ]),
            $this->auditReady(),
        );

        $this->assertTrue($allowed['allowed']);
        $this->assertSame('regulated_command_evidence_ready', $allowed['reason_code']);
    }

    public function testStatusEnumDriftFailsParityGate(): void
    {
        $service = new RegulatedCommandEvidenceGateService();
        $config = [
            'status_flow' => [
                'so' => ['states' => ['draft', 'confirmed']],
                'jo' => ['states' => ['planned', 'released']],
                'wo' => ['states' => ['scheduled', 'running']],
            ],
        ];
        $registry = [
            'tables' => [
                'sales_order' => [
                    'workflowId' => 'wf_sales_order',
                    'statusColumn' => 'status',
                    'statusSet' => 'sales_order_status_code',
                ],
            ],
        ];

        $result = $service->evaluateStatusParity($config, $registry);

        $this->assertFalse($result['allowed']);
        $this->assertSame('workflow_status_parity_drift', $result['reason_code']);
        $this->assertSame('stale_status_set_reference', $result['findings'][0]['code']);
    }

    public function testAuditStoreDownFailsRegulatedCommand(): void
    {
        $result = (new RegulatedCommandEvidenceGateService())->evaluateRegulatedCommand(
            $this->command(),
            $this->signature(),
            $this->policy(),
            ['available' => false, 'source_backend' => 'json'],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('authoritative_audit_store_required', $result['reason_code']);
    }

    public function testReplayedSignatureChallengeIsBlocked(): void
    {
        $result = (new RegulatedCommandEvidenceGateService())->evaluateRegulatedCommand(
            $this->command(),
            $this->signature([
                'challenge_replayed' => true,
                'challenge_usage_count' => 2,
            ]),
            $this->policy(),
            $this->auditReady(),
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('signature_challenge_replay_blocked', $result['reason_code']);
    }

    /** @return array<string, mixed> */
    private function command(array $override = []): array
    {
        return $override + [
            'command_name' => 'EngineeringReleasePackage.Release',
            'actor_ref' => 'engineer-1',
            'aggregate_type' => 'engineering_release_package',
            'aggregate_id' => 'pkg-1',
        ];
    }

    /** @return array<string, mixed> */
    private function signature(array $override = []): array
    {
        return $override + [
            'signature_meaning' => 'engineering_package_release_approval',
            'record_hash_sha256' => str_repeat('a', 64),
            'signer_ref' => 'qa-1',
            'signed_at' => '2026-05-29T00:00:00Z',
            'auth_challenge_id' => 'esign-test-1',
            'auth_challenge_consumed_at' => '2026-05-29T00:00:01Z',
            'challenge_usage_count' => 1,
        ];
    }

    /** @return array<string, mixed> */
    private function policy(array $override = []): array
    {
        return $override + [
            'regulated' => true,
            'command_name' => 'EngineeringReleasePackage.Release',
            'required_signature_meaning' => 'engineering_package_release_approval',
            'require_reauth_challenge' => true,
            'require_authoritative_audit' => true,
            'approval_steps' => [
                [
                    'step_code' => 'approval',
                    'approver_role_code' => 'qa_manager',
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function auditReady(): array
    {
        return [
            'available' => true,
            'source_backend' => 'postgres',
        ];
    }
}
