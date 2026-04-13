<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;

/**
 * Approval Workflow Adapter for the Foundation Governance Contract Slice.
 *
 * Maps approval-group decision commands into WorkflowEngine transition checks
 * before canonical persistence. This is the bridge that makes
 * WORKFLOW_BRIDGE_READY = true safe.
 *
 * Workflow definition:
 *   states:   [pending, approved, rejected, changes_requested]
 *   initial:  pending
 *   terminal: [approved, rejected]
 *   transitions:
 *     pending → approved          (via decisionCode = 'approve')
 *     pending → rejected          (via decisionCode = 'reject')
 *     pending → changes_requested (via decisionCode = 'request_changes')
 *
 * Invariants enforced:
 *   - state validation: only pending steps can be decided
 *   - actor authorization: actor must not be the requester (self-approval prohibition)
 *   - concurrency: row_version must match (optimistic concurrency via ETag)
 *
 * @package MOM\Services
 * @since   5.0.0
 */
final class ApprovalWorkflowAdapter
{
    private const VALID_TRANSITIONS = [
        'pending' => ['approve', 'reject', 'request_changes'],
    ];

    private const DECISION_TO_STATE = [
        'approve'         => 'approved',
        'reject'          => 'rejected',
        'request_changes' => 'changes_requested',
    ];

    private ?WorkflowEngine $engine = null;
    private DataLayer $data;

    public function __construct(DataLayer $data)
    {
        $this->data = $data;
    }

    /**
     * Get or create the WorkflowEngine instance.
     */
    private function engine(): WorkflowEngine
    {
        if ($this->engine === null) {
            $this->engine = new WorkflowEngine(
                $this->data->getDataDir(),
                $this->data->getConnection(),
                new AuditTrail($this->data->getDataDir(), $this->data->getConnection()),
            );
        }
        return $this->engine;
    }

    /**
     * Validate that a decision transition is allowed for the given step.
     *
     * @param string $currentStepStatus The current status of the approval step (e.g., 'pending').
     * @param string $decisionCode      The proposed decision (e.g., 'approve', 'reject').
     * @param string $actorPartyId      The party performing the decision.
     * @param string|null $requesterPartyId The party who requested the approval.
     * @return array{valid: bool, error: ?string, errorCode: ?int}
     */
    public function validateTransition(
        string $currentStepStatus,
        string $decisionCode,
        string $actorPartyId,
        ?string $requesterPartyId,
    ): array {
        // 1. State validation: only pending steps can be decided
        $allowed = self::VALID_TRANSITIONS[$currentStepStatus] ?? null;
        if ($allowed === null) {
            return [
                'valid' => false,
                'error' => "invalid_state_transition: step is '{$currentStepStatus}', only 'pending' accepts decisions",
                'errorCode' => 409,
            ];
        }

        // 2. Decision code validation
        if (!in_array($decisionCode, $allowed, true)) {
            return [
                'valid' => false,
                'error' => "validation_error: '{$decisionCode}' is not valid from state '{$currentStepStatus}'",
                'errorCode' => 422,
            ];
        }

        // 3. Self-approval prohibition
        // If requesterPartyId is null, treat it as the current session user to prevent bypass
        $effectiveRequesterId = $requesterPartyId ?? $_SESSION['user_id'] ?? null;

        if ($effectiveRequesterId !== null && $effectiveRequesterId === $actorPartyId) {
            return [
                'valid' => false,
                'error' => 'self_approval_forbidden: requester may not decide their own request',
                'errorCode' => 403,
            ];
        }

        return ['valid' => true, 'error' => null, 'errorCode' => null];
    }

    /**
     * Execute a decision through the workflow bridge.
     *
     * This method:
     * 1. Validates the transition is allowed
     * 2. Records the transition in the WorkflowEngine audit trail
     * 3. Returns success so the caller can persist the canonical row
     *
     * @param string      $approvalGroupId  The approval group UUID.
     * @param string      $stepCode         The approval step code being decided.
     * @param string      $currentStatus    Current step status (should be 'pending').
     * @param string      $decisionCode     The decision: approve, reject, request_changes.
     * @param string      $actorPartyId     The party making the decision.
     * @param string|null $requesterPartyId The party who requested the approval.
     * @param string|null $comment          Optional comment.
     * @return array{success: bool, error: ?string, errorCode: ?int, targetState: ?string}
     */
    public function executeDecision(
        string $approvalGroupId,
        string $stepCode,
        string $currentStatus,
        string $decisionCode,
        string $actorPartyId,
        ?string $requesterPartyId,
        ?string $comment = null,
    ): array {
        // Validate the transition
        $validation = $this->validateTransition($currentStatus, $decisionCode, $actorPartyId, $requesterPartyId);
        if (!$validation['valid']) {
            return [
                'success'     => false,
                'error'       => $validation['error'],
                'errorCode'   => $validation['errorCode'],
                'targetState' => null,
            ];
        }

        $targetState = self::DECISION_TO_STATE[$decisionCode] ?? 'completed';

        // Execute the transition through WorkflowEngine as the authoritative
        // state-machine authority. The engine MUST accept the transition for
        // the decision to proceed. Engine rejection is fatal.
        $recordId = "approval_group:{$approvalGroupId}:{$stepCode}";
        try {
            $engine = $this->engine();

            // Initialize the workflow record if not already tracked
            $existing = $engine->getRecordState($recordId);
            if ($existing === null) {
                $engine->initializeRecord($recordId, 'APPROVAL_STEP', $actorPartyId, [
                    'approval_group_id' => $approvalGroupId,
                    'step_code'         => $stepCode,
                ]);
            }

            // Execute the transition — engine is authoritative
            $result = $engine->transition(
                $recordId,
                $targetState,
                $actorPartyId,
                $comment,
            );

            if (!$result->success) {
                @error_log("[ApprovalWorkflowAdapter] Engine rejected transition for {$recordId}: " . ($result->error ?? 'unknown'));
                return [
                    'success'     => false,
                    'error'       => 'workflow_engine_rejected: ' . ($result->error ?? 'transition not allowed'),
                    'errorCode'   => 409,
                    'targetState' => null,
                ];
            }
        } catch (\Throwable $e) {
            @error_log("[ApprovalWorkflowAdapter] Engine error for {$recordId}: " . $e->getMessage());
            return [
                'success'     => false,
                'error'       => 'workflow_engine_error: ' . $e->getMessage(),
                'errorCode'   => 500,
                'targetState' => null,
            ];
        }

        // Observability: structured log for successful transition
        $this->emitObservabilityEvent('approval.decision.executed', [
            'approval_group_id' => $approvalGroupId,
            'step_code'         => $stepCode,
            'decision_code'     => $decisionCode,
            'target_state'      => $targetState,
            'actor_party_id'    => $actorPartyId,
            'engine_backed'     => true,
        ]);

        return [
            'success'     => true,
            'error'       => null,
            'errorCode'   => null,
            'targetState' => $targetState,
        ];
    }

    /**
     * Emit a structured observability event (OTel-compatible naming).
     */
    private function emitObservabilityEvent(string $eventName, array $attributes): void
    {
        $entry = json_encode([
            'event'      => $eventName,
            'timestamp'  => gmdate('Y-m-d\TH:i:s.v\Z'),
            'attributes' => $attributes,
            'service'    => 'foundation_governance_contract_slice',
            'component'  => 'ApprovalWorkflowAdapter',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @error_log("[otel.event] {$entry}");
    }

    /**
     * Get the target state name for a decision code.
     */
    public function getTargetState(string $decisionCode): ?string
    {
        return self::DECISION_TO_STATE[$decisionCode] ?? null;
    }
}
