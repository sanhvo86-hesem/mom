<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\EqmsControlPlaneStateMachine;
use PHPUnit\Framework\TestCase;

final class EqmsControlPlaneStateMachineTest extends TestCase
{
    private EqmsControlPlaneStateMachine $stateMachine;

    protected function setUp(): void
    {
        $this->stateMachine = new EqmsControlPlaneStateMachine();
    }

    public function testDocumentReleaseRequiresRoleAndReleaseEvidence(): void
    {
        $blocked = $this->stateMachine->canTransition('document_revision', 'approved', 'released', [
            'roles' => ['author'],
            'evidence' => ['approval_signature'],
        ]);

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('missing_role', $blocked['error']);
        $this->assertSame(['qa_qms', 'approver'], $blocked['missing_roles']);
        $this->assertSame(['release_manifest'], $blocked['missing_evidence']);

        $allowed = $this->stateMachine->canTransition('document_revision', 'approved', 'released', [
            'roles' => ['qa_qms'],
            'evidence' => ['approval_signature', 'release_manifest'],
        ]);

        $this->assertTrue($allowed['allowed']);
        $this->assertContains('DocumentRevisionReleased', $allowed['emitted_events']);
        $this->assertContains('enqueue_publication', $allowed['side_effects']);
    }

    public function testLockedEvidenceVersionCannotReturnToDraft(): void
    {
        $result = $this->stateMachine->canTransition('evidence_version', 'locked', 'draft', [
            'roles' => ['qa_qms'],
            'evidence' => ['released_change_order'],
            'change_order_id' => 'CO-100',
            'change_order_state' => 'released',
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('transition_not_allowed', $result['error']);
    }

    public function testPostReleaseEvidenceSupersessionRequiresReleasedChangeOrder(): void
    {
        $blocked = $this->stateMachine->canTransition('evidence_record', 'finalized', 'superseded', [
            'roles' => ['qa_qms'],
            'evidence' => ['released_change_order', 'replacement_evidence_version'],
            'change_order_id' => 'CO-200',
            'change_order_state' => 'approved',
        ]);

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('change_authority_required', $blocked['error']);
        $this->assertContains('released_change_order_required', $blocked['failed_guards']);

        $allowed = $this->stateMachine->canTransition('evidence_record', 'finalized', 'superseded', [
            'roles' => ['qa_qms'],
            'evidence' => ['released_change_order', 'replacement_evidence_version'],
            'change_order_id' => 'CO-200',
            'change_order_state' => 'released',
        ]);

        $this->assertTrue($allowed['allowed']);
        $this->assertContains('EvidenceRecordSuperseded', $allowed['emitted_events']);
    }

    public function testPublicationQueueRejectsDirectSharePointUpload(): void
    {
        $blocked = $this->stateMachine->canTransition('publication', 'pending', 'queued', [
            'roles' => ['qa_qms'],
            'evidence' => ['publication_manifest', 'read_only_distribution_target'],
            'target_authority_role' => 'source_of_truth',
            'direct_user_upload' => true,
        ]);

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('sharepoint_not_input_channel', $blocked['error']);
        $this->assertContains('publication_target_read_only', $blocked['failed_guards']);

        $allowed = $this->stateMachine->canTransition('publication', 'pending', 'queued', [
            'roles' => ['qa_qms'],
            'evidence' => ['publication_manifest', 'read_only_distribution_target'],
            'target_authority_role' => 'read_only_replica',
            'direct_user_upload' => false,
        ]);

        $this->assertTrue($allowed['allowed']);
        $this->assertContains('enqueue_publication_job', $allowed['side_effects']);
    }

    public function testPublicationQueueAcceptsCanonicalAuthorityRoleField(): void
    {
        $allowed = $this->stateMachine->canTransition('publication', 'pending', 'queued', [
            'roles' => ['qa_qms'],
            'evidence' => ['publication_manifest', 'read_only_distribution_target'],
            'authority_role' => 'read_only_replica',
            'direct_user_upload' => 'false',
        ]);

        $this->assertTrue($allowed['allowed']);
        $this->assertContains('PublicationQueued', $allowed['emitted_events']);
    }

    public function testChangeOrderReleaseRequiresEffectivityTrainingAndReadAckGates(): void
    {
        $blocked = $this->stateMachine->canTransition('change_order', 'approved', 'released', [
            'roles' => ['qa_qms'],
            'evidence' => ['release_manifest', 'verification_passed', 'training_gate_complete', 'read_ack_gate_complete'],
            'training_gate_complete' => true,
            'read_ack_gate_complete' => false,
        ]);

        $this->assertFalse($blocked['allowed']);
        $this->assertSame('effectivity_gate_not_met', $blocked['error']);

        $allowed = $this->stateMachine->canTransition('change_order', 'approved', 'released', [
            'roles' => ['qa_qms'],
            'evidence' => ['release_manifest', 'verification_passed', 'training_gate_complete', 'read_ack_gate_complete'],
            'training_gate_complete' => true,
            'read_ack_gate_complete' => true,
        ]);

        $this->assertTrue($allowed['allowed']);
        $this->assertContains('authorize_resulting_objects', $allowed['side_effects']);
        $this->assertContains('activate_effectivity', $allowed['side_effects']);
    }

    public function testChangeOrderReleaseAllowsConfiguredOptionalReadAckGate(): void
    {
        $allowed = $this->stateMachine->canTransition('change_order', 'approved', 'released', [
            'roles' => ['qa_qms'],
            'evidence' => ['release_manifest', 'verification_passed', 'training_gate_complete'],
            'training_gate_required' => true,
            'read_ack_gate_required' => false,
            'training_gate_complete' => true,
            'read_ack_gate_complete' => false,
        ]);

        $this->assertTrue($allowed['allowed']);
    }

    public function testEveryDefinitionHasStatesInitialStateAndTransitions(): void
    {
        foreach ($this->stateMachine->definitions() as $machine => $definition) {
            $this->assertNotEmpty($definition['states'], $machine);
            $this->assertContains($definition['initial'], $definition['states'], $machine);
            $this->assertNotEmpty($definition['transitions'], $machine);

            foreach ($definition['transitions'] as $transition) {
                $this->assertContains($transition['from'], $definition['states'], $machine);
                $this->assertContains($transition['to'], $definition['states'], $machine);
                $this->assertIsArray($transition['required_roles']);
                $this->assertIsArray($transition['required_evidence']);
                $this->assertIsArray($transition['emitted_events']);
                $this->assertIsArray($transition['side_effects']);
            }
        }
    }
}
