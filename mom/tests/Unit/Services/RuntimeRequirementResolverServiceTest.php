<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\RuntimeRequirementGateException;
use MOM\Api\Services\RuntimeRequirementResolverService;
use MOM\Api\Services\GateContextBuilder;
use MOM\Services\MobileWorkQueueService;
use PHPUnit\Framework\TestCase;

final class RuntimeRequirementResolverServiceTest extends TestCase
{
    public function testCallerRequireFlagDoesNotBecomeAuthorityAndBlocks(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: [[
            'command_name' => 'ReleaseShipmentCommand',
            'evidence_class' => 'customer_coc',
            'required' => true,
            'precedence' => 100,
            'match_criteria' => [],
            'source_authority' => 'customer_requirement_profile',
            'lifecycle_status' => 'active',
        ]]);

        $result = $resolver->resolve('ReleaseShipmentCommand', [
            'customer_id' => 'CUST-1',
            'require_coc' => false,
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('caller_require_flag_forbidden', $result['blockers'][0]['reason_code']);
    }

    public function testUnresolvedPolicyDefaultsToBlock(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: []);

        $result = $resolver->resolve('StartJobCommand', ['wo_number' => 'WO-1']);

        $this->assertFalse($result['allowed']);
        $this->assertSame('authority_lookup_failed', $result['reason_code']);
    }

    public function testOptionalToolingCanPassAndSnapshotRecordsOptionalMissing(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: [[
            'command_name' => 'StartJobCommand',
            'evidence_class' => 'tool_life_preset',
            'required' => false,
            'precedence' => 50,
            'match_criteria' => ['operation_seq' => '10'],
            'source_authority' => 'operation_definition',
            'lifecycle_status' => 'active',
        ]]);

        $result = $resolver->resolve('StartJobCommand', ['operation_seq' => '10']);

        $this->assertTrue($result['allowed']);
        $this->assertSame('optional_missing', $result['requirements'][0]['status']);
        $this->assertSame(64, strlen($result['requirements_snapshot_hash']));
    }

    public function testEqualPrecedencePolicyConflictBlocks(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: [
            [
                'command_name' => 'StartJobCommand',
                'evidence_class' => 'inspection_plan',
                'required' => true,
                'precedence' => 100,
                'match_criteria' => ['site_id' => 'S1'],
                'source_authority' => 'site_quality_profile',
                'lifecycle_status' => 'active',
            ],
            [
                'command_name' => 'StartJobCommand',
                'evidence_class' => 'inspection_plan',
                'required' => false,
                'precedence' => 100,
                'match_criteria' => ['site_id' => 'S1'],
                'source_authority' => 'item_quality_profile',
                'lifecycle_status' => 'active',
            ],
        ]);

        $result = $resolver->resolve('StartJobCommand', ['site_id' => 'S1']);

        $this->assertFalse($result['allowed']);
        $this->assertSame('policy_conflict', $result['reason_code']);
    }

    public function testPreResolvedUomFailureBlocksEvenWhenPolicyIsOptional(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: [[
            'command_name' => 'ReceiveInventoryCommand',
            'evidence_class' => 'uom',
            'required' => false,
            'precedence' => 100,
            'match_criteria' => [],
            'source_authority' => 'item_uom_policy',
            'lifecycle_status' => 'active',
        ]]);

        $result = $resolver->resolve(
            'ReceiveInventoryCommand',
            ['item_id' => 'PART-1', 'quantity' => '1', 'uom' => 'BOX'],
            [],
            [],
            [[
                'reason_code' => 'uom_authority_resolution_failed',
                'evidence_class' => 'uom',
                'message' => 'UOM bridge failed.',
                'operator_message' => 'Resolve UOM before continuing.',
            ]]
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('uom_authority_resolution_failed', $result['reason_code']);
        $this->assertSame(64, strlen($result['requirements_snapshot_hash']));
    }

    public function testGateContextBuilderThrowsWhenRequiredEvidenceMissing(): void
    {
        $resolver = new RuntimeRequirementResolverService(policyRows: [[
            'command_name' => 'RegulatedApproveCommand',
            'evidence_class' => 'e_signature',
            'required' => true,
            'precedence' => 100,
            'match_criteria' => [],
            'source_authority' => 'regulated_action_policy',
            'lifecycle_status' => 'active',
        ]]);
        $builder = new GateContextBuilder($resolver);

        $this->expectException(RuntimeRequirementGateException::class);

        $builder->buildOrFail('RegulatedApproveCommand', []);
    }

    public function testMobileStartTaskUsesRuntimeGateBeforeMutation(): void
    {
        $dir = sys_get_temp_dir() . '/mda-p47-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        $resolver = new RuntimeRequirementResolverService(policyRows: [[
            'command_name' => 'StartJobCommand',
            'evidence_class' => 'nc_checksum',
            'required' => true,
            'precedence' => 100,
            'match_criteria' => ['task_type' => 'operation_complete'],
            'source_authority' => 'operation_definition',
            'lifecycle_status' => 'active',
        ]]);
        $service = new MobileWorkQueueService(
            $dir,
            null,
            null,
            new GateContextBuilder($resolver)
        );
        $task = $service->assignTask('OP-1', 'WO-1', 'operation_complete', [
            'operation_seq' => 10,
        ]);

        try {
            $service->startTask((string)$task['queue_id'], 'OP-1');
            $this->fail('Start task should be blocked by missing nc_checksum evidence.');
        } catch (RuntimeRequirementGateException $e) {
            $this->assertSame('missing_required_evidence', $e->reasonCode());
        }

        $queue = $service->getOperatorQueue('OP-1');
        $this->assertSame('pending', $queue[0]['task_status']);
    }
}
