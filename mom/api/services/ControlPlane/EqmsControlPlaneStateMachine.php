<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use InvalidArgumentException;

final class EqmsControlPlaneStateMachine
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public function definitions(): array
    {
        return [
            'document_revision' => [
                'initial' => 'draft',
                'states' => ['draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete', 'withdrawn'],
                'transitions' => [
                    $this->transition('draft', 'in_review', ['author', 'qa_qms'], ['draft_payload'], ['DocumentRevisionSubmitted'], ['lock_editable_baseline']),
                    $this->transition('in_review', 'approved', ['reviewer', 'qa_qms'], ['review_decision'], ['DocumentRevisionApproved'], ['record_review_signature']),
                    $this->transition('approved', 'released', ['qa_qms', 'approver'], ['approval_signature', 'release_manifest'], ['DocumentRevisionReleased'], ['create_effectivity', 'enqueue_distribution', 'enqueue_publication']),
                    $this->transition('released', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order'], ['DocumentRevisionSuperseded'], ['close_open_distribution', 'create_supersession_link'], true),
                    $this->transition('released', 'obsolete', ['qa_qms', 'change_coordinator'], ['released_change_order', 'withdrawal_justification'], ['DocumentRevisionObsoleted'], ['withdraw_distribution'], true),
                    $this->transition('draft', 'withdrawn', ['author', 'qa_qms'], ['withdrawal_justification'], ['DocumentRevisionWithdrawn'], []),
                    $this->transition('in_review', 'withdrawn', ['author', 'qa_qms'], ['withdrawal_justification'], ['DocumentRevisionWithdrawn'], []),
                ],
            ],
            'form_issuance' => [
                'initial' => 'draft',
                'states' => ['draft', 'issued', 'downloaded', 'in_progress', 'submitted', 'accepted', 'rejected', 'voided', 'expired', 'superseded'],
                'transitions' => [
                    $this->transition('draft', 'issued', ['qa_qms', 'operator_supervisor'], ['released_template_revision', 'released_schema_version', 'issuance_manifest'], ['FormIssuanceIssued'], ['reserve_allocation', 'write_issuance_ledger']),
                    $this->transition('issued', 'downloaded', ['operator', 'submitter'], ['portal_download_receipt'], ['FormIssuanceDownloaded'], ['stamp_download_receipt']),
                    $this->transition('issued', 'in_progress', ['operator', 'submitter'], ['online_session_started'], ['FormIssuanceStarted'], []),
                    $this->transition('downloaded', 'submitted', ['operator', 'submitter'], ['upload_attempt'], ['FormIssuanceSubmitted'], ['create_submission_attempt']),
                    $this->transition('in_progress', 'submitted', ['operator', 'submitter'], ['online_finalize_request'], ['FormIssuanceSubmitted'], ['create_submission_attempt']),
                    $this->transition('submitted', 'accepted', ['qa_qms', 'system'], ['accepted_submission_attempt'], ['FormIssuanceAccepted'], ['create_or_update_evidence_record']),
                    $this->transition('submitted', 'rejected', ['qa_qms', 'system'], ['validation_failure_report'], ['FormIssuanceRejected'], ['surface_validation_results']),
                    $this->transition('issued', 'voided', ['qa_qms', 'change_coordinator'], ['void_reason'], ['FormIssuanceVoided'], ['invalidate_carrier']),
                    $this->transition('downloaded', 'voided', ['qa_qms', 'change_coordinator'], ['void_reason'], ['FormIssuanceVoided'], ['invalidate_carrier']),
                    $this->transition('issued', 'expired', ['system'], ['expiry_policy'], ['FormIssuanceExpired'], ['block_future_submission']),
                    $this->transition('downloaded', 'expired', ['system'], ['expiry_policy'], ['FormIssuanceExpired'], ['block_future_submission']),
                    $this->transition('issued', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order'], ['FormIssuanceSuperseded'], ['issue_replacement'], true),
                    $this->transition('downloaded', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order'], ['FormIssuanceSuperseded'], ['issue_replacement'], true),
                ],
            ],
            'submission_attempt' => [
                'initial' => 'received',
                'states' => ['received', 'parsing', 'validating', 'valid', 'invalid', 'duplicate', 'quarantined', 'accepted', 'rejected'],
                'transitions' => [
                    $this->transition('received', 'parsing', ['system'], ['original_artifact_hash'], ['SubmissionAttemptParsingStarted'], []),
                    $this->transition('parsing', 'validating', ['system'], ['parsed_payload'], ['SubmissionAttemptValidationStarted'], []),
                    $this->transition('validating', 'valid', ['system'], ['schema_validation_passed', 'issuance_match'], ['SubmissionAttemptValidated'], ['canonicalize_payload']),
                    $this->transition('validating', 'invalid', ['system'], ['validation_errors'], ['SubmissionAttemptInvalid'], ['publish_validation_results']),
                    $this->transition('validating', 'duplicate', ['system'], ['duplicate_match'], ['SubmissionAttemptDuplicateDetected'], ['link_duplicate_attempt']),
                    $this->transition('validating', 'quarantined', ['system'], ['malware_or_integrity_exception'], ['SubmissionAttemptQuarantined'], ['block_acceptance']),
                    $this->transition('valid', 'accepted', ['qa_qms', 'system'], ['acceptance_decision'], ['SubmissionAttemptAccepted'], ['create_evidence_version']),
                    $this->transition('invalid', 'rejected', ['qa_qms', 'system'], ['rejection_decision'], ['SubmissionAttemptRejected'], ['close_attempt']),
                    $this->transition('duplicate', 'rejected', ['qa_qms', 'system'], ['duplicate_review_decision'], ['SubmissionAttemptRejected'], ['close_attempt']),
                    $this->transition('quarantined', 'rejected', ['qa_qms'], ['quarantine_review_decision'], ['SubmissionAttemptRejected'], ['close_attempt']),
                ],
            ],
            'evidence_record' => [
                'initial' => 'open',
                'states' => ['open', 'under_review', 'finalized', 'superseded', 'voided', 'retained', 'legal_hold'],
                'transitions' => [
                    $this->transition('open', 'under_review', ['operator', 'qa_qms'], ['evidence_version_draft'], ['EvidenceRecordUnderReview'], ['start_review_workflow']),
                    $this->transition('under_review', 'finalized', ['qa_qms', 'approver'], ['locked_evidence_version', 'signature_manifest'], ['EvidenceRecordFinalized'], ['seal_current_version', 'enqueue_publication', 'apply_retention_policy']),
                    $this->transition('finalized', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order', 'replacement_evidence_version'], ['EvidenceRecordSuperseded'], ['link_supersession'], true),
                    $this->transition('finalized', 'voided', ['qa_qms', 'change_coordinator'], ['released_change_order', 'void_justification'], ['EvidenceRecordVoided'], ['retain_voided_package'], true),
                    $this->transition('finalized', 'retained', ['system', 'records_manager'], ['retention_lock'], ['EvidenceRecordRetained'], ['apply_worm_lock']),
                    $this->transition('retained', 'legal_hold', ['records_manager', 'qa_qms'], ['legal_hold_reference'], ['EvidenceRecordLegalHoldApplied'], ['freeze_disposition']),
                ],
            ],
            'evidence_version' => [
                'initial' => 'draft',
                'states' => ['draft', 'validating', 'ready_for_review', 'locked', 'superseded', 'voided'],
                'transitions' => [
                    $this->transition('draft', 'validating', ['system'], ['original_artifact', 'canonical_payload'], ['EvidenceVersionValidationStarted'], ['run_payload_validation']),
                    $this->transition('validating', 'ready_for_review', ['system'], ['validation_passed', 'readable_snapshot', 'hash_manifest'], ['EvidenceVersionReadyForReview'], ['build_package_manifest']),
                    $this->transition('ready_for_review', 'locked', ['qa_qms', 'approver'], ['approval_signature', 'hash_manifest'], ['EvidenceVersionLocked'], ['write_immutable_package']),
                    $this->transition('locked', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order', 'replacement_evidence_version'], ['EvidenceVersionSuperseded'], ['link_version_chain'], true),
                    $this->transition('locked', 'voided', ['qa_qms', 'change_coordinator'], ['released_change_order', 'void_justification'], ['EvidenceVersionVoided'], ['retain_voided_package'], true),
                ],
            ],
            'publication' => [
                'initial' => 'pending',
                'states' => ['pending', 'queued', 'publishing', 'published', 'failed', 'retry_scheduled', 'dead_letter', 'withdrawn', 'superseded'],
                'transitions' => [
                    $this->transition('pending', 'queued', ['system', 'qa_qms'], ['publication_manifest', 'read_only_distribution_target'], ['PublicationQueued'], ['enqueue_publication_job'], false, ['publication_target_read_only']),
                    $this->transition('queued', 'publishing', ['system'], ['background_job_claim'], ['PublicationStarted'], []),
                    $this->transition('publishing', 'published', ['system'], ['publication_receipt', 'target_hash'], ['PublicationSucceeded'], ['write_publication_receipt']),
                    $this->transition('publishing', 'failed', ['system'], ['failure_reason'], ['PublicationFailed'], ['write_failure_record']),
                    $this->transition('failed', 'retry_scheduled', ['system', 'qa_qms'], ['retry_policy'], ['PublicationRetryScheduled'], ['enqueue_retry_job']),
                    $this->transition('failed', 'dead_letter', ['system'], ['max_attempts_exhausted', 'failure_reason'], ['PublicationDeadLettered'], ['open_integrity_exception']),
                    $this->transition('retry_scheduled', 'queued', ['system'], ['retry_window_open'], ['PublicationQueued'], ['enqueue_publication_job']),
                    $this->transition('published', 'withdrawn', ['qa_qms', 'change_coordinator'], ['released_change_order', 'withdrawal_justification'], ['PublicationWithdrawn'], ['publish_withdrawal_notice'], true),
                    $this->transition('published', 'superseded', ['qa_qms', 'change_coordinator'], ['released_change_order', 'replacement_publication'], ['PublicationSuperseded'], ['publish_supersession_notice'], true),
                ],
            ],
            'change_request' => [
                'initial' => 'draft',
                'states' => ['draft', 'submitted', 'triage', 'approved_for_order', 'rejected', 'cancelled'],
                'transitions' => [
                    $this->transition('draft', 'submitted', ['author', 'requester'], ['change_problem_statement', 'requested_scope'], ['ChangeRequestSubmitted'], ['create_triage_task']),
                    $this->transition('submitted', 'triage', ['change_coordinator', 'qa_qms'], ['triage_owner'], ['ChangeRequestInTriage'], ['classify_change']),
                    $this->transition('triage', 'approved_for_order', ['qa_qms', 'change_coordinator'], ['impact_assessment', 'approval_decision'], ['ChangeRequestApprovedForOrder'], ['create_change_order']),
                    $this->transition('triage', 'rejected', ['qa_qms', 'change_coordinator'], ['rejection_reason'], ['ChangeRequestRejected'], ['close_change_request']),
                    $this->transition('draft', 'cancelled', ['author', 'requester'], ['cancel_reason'], ['ChangeRequestCancelled'], []),
                    $this->transition('submitted', 'cancelled', ['change_coordinator', 'qa_qms'], ['cancel_reason'], ['ChangeRequestCancelled'], []),
                ],
            ],
            'change_order' => [
                'initial' => 'draft',
                'states' => ['draft', 'impact_assessment', 'in_review', 'approved', 'released', 'implemented', 'closed', 'cancelled'],
                'transitions' => [
                    $this->transition('draft', 'impact_assessment', ['change_coordinator'], ['affected_objects'], ['ChangeOrderImpactAssessmentStarted'], ['build_impact_matrix']),
                    $this->transition('impact_assessment', 'in_review', ['change_coordinator'], ['affected_objects', 'resulting_objects', 'effectivity_plan', 'wip_disposition'], ['ChangeOrderSubmittedForReview'], ['route_reviews']),
                    $this->transition('in_review', 'approved', ['qa_qms', 'approver'], ['approval_signature', 'training_plan', 'verification_plan'], ['ChangeOrderApproved'], ['freeze_change_scope']),
                    $this->transition('approved', 'released', ['qa_qms', 'change_coordinator'], ['release_manifest', 'verification_passed', 'training_gate_complete', 'read_ack_gate_complete'], ['ChangeOrderReleased'], ['authorize_resulting_objects', 'activate_effectivity', 'enqueue_training'], false, ['training_or_read_ack_complete']),
                    $this->transition('released', 'implemented', ['change_coordinator', 'qa_qms'], ['implementation_evidence'], ['ChangeOrderImplemented'], ['start_effectiveness_review']),
                    $this->transition('implemented', 'closed', ['qa_qms'], ['effectiveness_review_passed'], ['ChangeOrderClosed'], ['close_change_authority']),
                    $this->transition('draft', 'cancelled', ['change_coordinator', 'qa_qms'], ['cancel_reason'], ['ChangeOrderCancelled'], []),
                    $this->transition('impact_assessment', 'cancelled', ['change_coordinator', 'qa_qms'], ['cancel_reason'], ['ChangeOrderCancelled'], []),
                    $this->transition('in_review', 'cancelled', ['qa_qms'], ['cancel_reason'], ['ChangeOrderCancelled'], []),
                ],
            ],
            'verification' => [
                'initial' => 'planned',
                'states' => ['planned', 'in_progress', 'passed', 'failed', 'waived'],
                'transitions' => [
                    $this->transition('planned', 'in_progress', ['qa_qms', 'verifier'], ['verification_protocol'], ['VerificationStarted'], []),
                    $this->transition('in_progress', 'passed', ['qa_qms', 'verifier'], ['verification_evidence', 'verification_signature'], ['VerificationPassed'], ['release_gate_update']),
                    $this->transition('in_progress', 'failed', ['qa_qms', 'verifier'], ['failure_evidence'], ['VerificationFailed'], ['block_change_release']),
                    $this->transition('planned', 'waived', ['qa_qms'], ['waiver_justification', 'risk_acceptance_signature'], ['VerificationWaived'], ['write_exception_register']),
                ],
            ],
            'effectiveness_review' => [
                'initial' => 'scheduled',
                'states' => ['scheduled', 'due', 'in_review', 'effective', 'ineffective', 'overdue', 'cancelled'],
                'transitions' => [
                    $this->transition('scheduled', 'due', ['system'], ['due_date_reached'], ['EffectivenessReviewDue'], ['create_review_task']),
                    $this->transition('due', 'in_review', ['qa_qms', 'change_coordinator'], ['review_started'], ['EffectivenessReviewStarted'], []),
                    $this->transition('in_review', 'effective', ['qa_qms'], ['effectiveness_evidence', 'review_signature'], ['EffectivenessReviewPassed'], ['close_periodic_action']),
                    $this->transition('in_review', 'ineffective', ['qa_qms'], ['ineffectiveness_evidence', 'capa_or_change_request'], ['EffectivenessReviewFailed'], ['open_follow_up_change_or_capa']),
                    $this->transition('due', 'overdue', ['system'], ['overdue_policy'], ['EffectivenessReviewOverdue'], ['escalate_overdue_review']),
                    $this->transition('scheduled', 'cancelled', ['qa_qms'], ['cancel_reason'], ['EffectivenessReviewCancelled'], []),
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function definition(string $machine): array
    {
        $definitions = $this->definitions();
        if (!isset($definitions[$machine])) {
            throw new InvalidArgumentException(sprintf('Unknown eQMS control-plane state machine "%s".', $machine));
        }

        return $definitions[$machine];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function allowedTransitions(string $machine, string $from): array
    {
        $definition = $this->definition($machine);

        return array_values(array_filter(
            $definition['transitions'],
            static fn(array $transition): bool => $transition['from'] === $from,
        ));
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function canTransition(string $machine, string $from, string $to, array $context = []): array
    {
        foreach ($this->allowedTransitions($machine, $from) as $transition) {
            if ($transition['to'] !== $to) {
                continue;
            }

            return $this->evaluateTransition($transition, $context);
        }

        return [
            'allowed' => false,
            'error' => 'transition_not_allowed',
            'message' => sprintf('No %s transition from %s to %s is registered.', $machine, $from, $to),
            'transition' => null,
            'missing_roles' => [],
            'missing_evidence' => [],
            'failed_guards' => [],
            'side_effects' => [],
            'emitted_events' => [],
        ];
    }

    /**
     * @param array<string, bool> $permissions
     * @return array<string, mixed>
     */
    public function stateAwareResponse(string $machine, string $state, array $permissions = []): array
    {
        $transitions = $this->allowedTransitions($machine, $state);

        return [
            'machine' => $machine,
            'state' => $state,
            'authoritative_state' => true,
            'immutable' => in_array($state, ['released', 'finalized', 'locked', 'published', 'retained', 'legal_hold', 'closed'], true),
            'available_actions' => array_map(
                static function (array $transition) use ($permissions): array {
                    $roleAllowed = empty($transition['required_roles']);
                    foreach ($transition['required_roles'] as $role) {
                        if (($permissions[$role] ?? false) === true) {
                            $roleAllowed = true;
                            break;
                        }
                    }

                    return [
                        'target_state' => $transition['to'],
                        'label' => $transition['label'],
                        'enabled' => $roleAllowed,
                        'disabled_reason' => $roleAllowed ? null : 'missing_role',
                        'requires_change_authority' => $transition['requires_change_authority'],
                        'required_evidence' => $transition['required_evidence'],
                    ];
                },
                $transitions,
            ),
        ];
    }

    /**
     * @param list<string> $requiredRoles
     * @param list<string> $requiredEvidence
     * @param list<string> $emittedEvents
     * @param list<string> $sideEffects
     * @param list<string> $guards
     * @return array<string, mixed>
     */
    private function transition(
        string $from,
        string $to,
        array $requiredRoles,
        array $requiredEvidence,
        array $emittedEvents,
        array $sideEffects,
        bool $requiresChangeAuthority = false,
        array $guards = [],
    ): array {
        return [
            'from' => $from,
            'to' => $to,
            'label' => $this->label($to),
            'required_roles' => $requiredRoles,
            'required_evidence' => $requiredEvidence,
            'requires_change_authority' => $requiresChangeAuthority,
            'guards' => $guards,
            'emitted_events' => $emittedEvents,
            'side_effects' => $sideEffects,
        ];
    }

    /**
     * @param array<string, mixed> $transition
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function evaluateTransition(array $transition, array $context): array
    {
        $roles = $this->stringList($context['roles'] ?? []);
        $evidence = $this->stringList($context['evidence'] ?? []);
        $missingRoles = $this->missingAnyRole($transition['required_roles'], $roles);
        $requiredEvidence = $this->requiredEvidenceForContext($transition, $context);
        $missingEvidence = array_values(array_diff($requiredEvidence, $evidence));
        $failedGuards = $this->failedGuards($transition, $context);

        $allowed = $missingRoles === [] && $missingEvidence === [] && $failedGuards === [];

        return [
            'allowed' => $allowed,
            'error' => $allowed ? null : $this->errorCode($missingRoles, $missingEvidence, $failedGuards),
            'message' => $allowed ? 'Transition allowed.' : 'Transition blocked by state-machine guard.',
            'transition' => array_merge($transition, ['required_evidence' => $requiredEvidence]),
            'missing_roles' => $missingRoles,
            'missing_evidence' => $missingEvidence,
            'failed_guards' => $failedGuards,
            'side_effects' => $allowed ? $transition['side_effects'] : [],
            'emitted_events' => $allowed ? $transition['emitted_events'] : [],
        ];
    }

    /**
     * @param list<string> $requiredRoles
     * @param list<string> $roles
     * @return list<string>
     */
    private function missingAnyRole(array $requiredRoles, array $roles): array
    {
        if ($requiredRoles === []) {
            return [];
        }

        foreach ($requiredRoles as $role) {
            if (in_array($role, $roles, true)) {
                return [];
            }
        }

        return $requiredRoles;
    }

    /**
     * @param array<string, mixed> $transition
     * @param array<string, mixed> $context
     * @return list<string>
     */
    private function requiredEvidenceForContext(array $transition, array $context): array
    {
        $required = $transition['required_evidence'];
        if (!in_array('training_or_read_ack_complete', $transition['guards'], true)) {
            return $required;
        }

        if (!$this->boolContext($context, 'training_gate_required', true)) {
            $required = array_values(array_diff($required, ['training_gate_complete']));
        }
        if (!$this->boolContext($context, 'read_ack_gate_required', true)) {
            $required = array_values(array_diff($required, ['read_ack_gate_complete']));
        }

        return $required;
    }

    /**
     * @param array<string, mixed> $transition
     * @param array<string, mixed> $context
     * @return list<string>
     */
    private function failedGuards(array $transition, array $context): array
    {
        $failed = [];

        if (($transition['requires_change_authority'] ?? false) === true) {
            if (($context['change_order_state'] ?? null) !== 'released' || empty($context['change_order_id'])) {
                $failed[] = 'released_change_order_required';
            }
        }

        foreach ($transition['guards'] as $guard) {
            if ($guard === 'publication_target_read_only') {
                $authorityRole = $context['target_authority_role'] ?? $context['authority_role'] ?? null;
                if ($authorityRole !== 'read_only_replica' || $this->boolContext($context, 'direct_user_upload', false) === true) {
                    $failed[] = $guard;
                }
                continue;
            }

            if ($guard === 'training_or_read_ack_complete') {
                $trainingRequired = $this->boolContext($context, 'training_gate_required', true);
                $readAckRequired = $this->boolContext($context, 'read_ack_gate_required', true);
                $trainingComplete = $this->boolContext($context, 'training_gate_complete', false);
                $readAckComplete = $this->boolContext($context, 'read_ack_gate_complete', false);
                if (($trainingRequired && !$trainingComplete) || ($readAckRequired && !$readAckComplete)) {
                    $failed[] = $guard;
                }
                continue;
            }

            if (($context[$guard] ?? false) !== true) {
                $failed[] = $guard;
            }
        }

        return array_values(array_unique($failed));
    }

    /**
     * @param array<string, mixed> $context
     */
    private function boolContext(array $context, string $key, bool $default): bool
    {
        if (!array_key_exists($key, $context)) {
            return $default;
        }

        $value = $context[$key];
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value)) {
            return $value === 1;
        }

        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes'], true);
        }

        return $default;
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (is_string($value)) {
            return [$value];
        }

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, static fn(mixed $item): bool => is_string($item) && $item !== ''));
    }

    /**
     * @param list<string> $missingRoles
     * @param list<string> $missingEvidence
     * @param list<string> $failedGuards
     */
    private function errorCode(array $missingRoles, array $missingEvidence, array $failedGuards): string
    {
        if ($missingRoles !== []) {
            return 'missing_role';
        }

        if ($missingEvidence !== []) {
            return 'missing_required_evidence';
        }

        if (in_array('released_change_order_required', $failedGuards, true)) {
            return 'change_authority_required';
        }

        if (in_array('publication_target_read_only', $failedGuards, true)) {
            return 'sharepoint_not_input_channel';
        }

        if (in_array('training_or_read_ack_complete', $failedGuards, true)) {
            return 'effectivity_gate_not_met';
        }

        return 'guard_failed';
    }

    private function label(string $to): string
    {
        return ucwords(str_replace('_', ' ', $to));
    }
}
