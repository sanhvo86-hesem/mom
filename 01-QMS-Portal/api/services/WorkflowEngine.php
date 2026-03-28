<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use HESEM\QMS\Database\Connection;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Result of a workflow state transition attempt.
 */
final readonly class TransitionResult
{
    public function __construct(
        public bool $success,
        public string $recordId,
        public string $fromState,
        public string $toState,
        public ?string $error = null,
        public ?string $errorVi = null,
        public array $triggeredActions = [],
    ) {
    }

    /** @return array Serializable representation. */
    public function toArray(): array
    {
        return [
            'success'          => $this->success,
            'record_id'        => $this->recordId,
            'from_state'       => $this->fromState,
            'to_state'         => $this->toState,
            'error'            => $this->error,
            'error_vi'         => $this->errorVi,
            'triggered_actions' => $this->triggeredActions,
        ];
    }
}

// ── Workflow Engine ─────────────────────────────────────────────────────────

/**
 * State-machine workflow engine for HESEM QMS record lifecycle management.
 *
 * Defines and enforces the allowed state transitions for every QMS record type
 * (NCR, CAPA, FAI, Calibration, Audit, Training, ECR, SCAR, Risk, Improvement,
 * Management Review, Document). Provides:
 *
 * - Role-based transition permission checks
 * - Automatic actions on state transitions (notifications, due dates, assignments)
 * - Escalation rules for overdue items
 * - Parallel approval support (multiple approvers)
 * - Delegation support (approve on behalf of)
 * - Full state-change history with audit trail integration
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class WorkflowEngine
{
    /**
     * Workflow definitions: record_type => array of state machine rules.
     *
     * Each entry defines:
     *   - states:       list of valid states
     *   - initial:      the starting state
     *   - terminal:     states that end the lifecycle
     *   - transitions:  from_state => [to_state => [roles, actions, conditions]]
     *
     * @var array<string, array>
     */
    private array $workflows;

    /** Workflow state storage directory. */
    private readonly string $stateDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string               $dataDir             Absolute path to qms-data directory.
     * @param Connection|null      $db                  Optional database connection.
     * @param AuditTrail|null      $auditTrail          Optional audit trail for logging transitions.
     * @param NotificationService|null $notificationService Optional notification service.
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
        private readonly ?AuditTrail $auditTrail = null,
        private readonly ?NotificationService $notificationService = null,
    ) {
        $this->stateDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/workflow-states';
        if (!is_dir($this->stateDir)) {
            @mkdir($this->stateDir, 0775, true);
        }
        $this->workflows = $this->buildWorkflowDefinitions();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Perform a state transition on a record.
     *
     * @param string      $recordId    Record identifier (e.g. "NCR-2026-001").
     * @param string      $targetState The desired new state.
     * @param string      $userId      User performing the transition.
     * @param string|null $comment     Optional comment / reason for transition.
     * @param string|null $onBehalfOf  If delegating, the original approver's ID.
     * @return TransitionResult
     */
    public function transition(
        string $recordId,
        string $targetState,
        string $userId,
        ?string $comment = null,
        ?string $onBehalfOf = null,
    ): TransitionResult {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: '',
                toState: $targetState,
                error: "Record not found: {$recordId}",
                errorVi: "Khong tim thay ban ghi: {$recordId}",
            );
        }

        $recordType = $record['record_type'] ?? '';
        $currentState = $record['current_state'] ?? '';

        // Validate transition is allowed by the state machine
        $workflow = $this->getWorkflowConfig($recordType);
        if ($workflow === null) {
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: $currentState,
                toState: $targetState,
                error: "No workflow defined for record type: {$recordType}",
                errorVi: "Khong co quy trinh cho loai ban ghi: {$recordType}",
            );
        }

        $transitionDef = $workflow['transitions'][$currentState][$targetState] ?? null;
        if ($transitionDef === null) {
            $allowed = array_keys($workflow['transitions'][$currentState] ?? []);
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: $currentState,
                toState: $targetState,
                error: sprintf(
                    'Transition from "%s" to "%s" is not allowed. Allowed: %s',
                    $currentState,
                    $targetState,
                    implode(', ', $allowed) ?: '(none)',
                ),
                errorVi: sprintf(
                    'Chuyen trang thai tu "%s" sang "%s" khong duoc phep. Cho phep: %s',
                    $currentState,
                    $targetState,
                    implode(', ', $allowed) ?: '(khong co)',
                ),
            );
        }

        // Check role permission
        $effectiveUser = $onBehalfOf ?? $userId;
        $requiredRoles = $transitionDef['roles'] ?? [];
        if (!empty($requiredRoles) && !$this->userHasRole($effectiveUser, $requiredRoles, $record)) {
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: $currentState,
                toState: $targetState,
                error: sprintf(
                    'User "%s" lacks required role. Required: %s',
                    $effectiveUser,
                    implode(', ', $requiredRoles),
                ),
                errorVi: sprintf(
                    'Nguoi dung "%s" khong co quyen. Yeu cau: %s',
                    $effectiveUser,
                    implode(', ', $requiredRoles),
                ),
            );
        }

        // Check required fields / conditions
        $conditionErrors = $this->checkTransitionConditions($transitionDef, $record);
        if (!empty($conditionErrors)) {
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: $currentState,
                toState: $targetState,
                error: 'Transition conditions not met: ' . implode('; ', $conditionErrors),
                errorVi: 'Dieu kien chuyen trang thai chua dat: ' . implode('; ', $conditionErrors),
            );
        }

        // Perform the transition
        $triggeredActions = [];
        $now = gmdate('Y-m-d\TH:i:s\Z');

        $historyEntry = [
            'from'        => $currentState,
            'to'          => $targetState,
            'user'        => $userId,
            'on_behalf_of' => $onBehalfOf,
            'comment'     => $comment,
            'timestamp'   => $now,
        ];

        // Update record state
        $record['current_state'] = $targetState;
        $record['updated_at'] = $now;
        $record['updated_by'] = $userId;

        // Append to history
        if (!isset($record['history'])) {
            $record['history'] = [];
        }
        $record['history'][] = $historyEntry;

        // Execute automatic actions
        $actions = $transitionDef['actions'] ?? [];
        foreach ($actions as $action) {
            $result = $this->executeAction($action, $record, $userId, $targetState, $now);
            if ($result !== null) {
                $triggeredActions[] = $result;
            }
        }

        // Persist state
        $this->saveRecordState($recordId, $record);

        // Log to audit trail
        if ($this->auditTrail !== null) {
            $this->auditTrail->logEvent(new AuditEvent(
                eventType: AuditEventType::STATUS_CHANGED,
                aggregateType: $recordType,
                aggregateId: $recordId,
                actorId: $userId,
                payload: [
                    'from'        => $currentState,
                    'to'          => $targetState,
                    'comment'     => $comment,
                    'on_behalf_of' => $onBehalfOf,
                ],
                metadata: [
                    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                ],
            ));
        }

        return new TransitionResult(
            success: true,
            recordId: $recordId,
            fromState: $currentState,
            toState: $targetState,
            triggeredActions: $triggeredActions,
        );
    }

    /**
     * Get the transitions available to a user for a record.
     *
     * @param string $recordId Record identifier.
     * @param string $userId   User to check permissions for.
     * @return array List of available target states with labels.
     */
    public function getAvailableTransitions(string $recordId, string $userId): array
    {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            return [];
        }

        $recordType = $record['record_type'] ?? '';
        $currentState = $record['current_state'] ?? '';
        $workflow = $this->getWorkflowConfig($recordType);

        if ($workflow === null) {
            return [];
        }

        $transitions = $workflow['transitions'][$currentState] ?? [];
        $available = [];

        foreach ($transitions as $targetState => $def) {
            $requiredRoles = $def['roles'] ?? [];
            $hasPermission = empty($requiredRoles) || $this->userHasRole($userId, $requiredRoles, $record);

            $available[] = [
                'target_state' => $targetState,
                'label'        => $def['label'] ?? ucfirst(str_replace('_', ' ', $targetState)),
                'label_vi'     => $def['label_vi'] ?? null,
                'roles'        => $requiredRoles,
                'permitted'    => $hasPermission,
                'requires'     => $def['requires'] ?? [],
            ];
        }

        return $available;
    }

    /**
     * Check whether a specific transition is allowed.
     *
     * @param string $recordId    Record identifier.
     * @param string $targetState Desired target state.
     * @param string $userId      User performing the check.
     * @return bool
     */
    public function canTransition(string $recordId, string $targetState, string $userId): bool
    {
        $available = $this->getAvailableTransitions($recordId, $userId);
        foreach ($available as $t) {
            if ($t['target_state'] === $targetState && $t['permitted'] === true) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the full workflow state-change history for a record.
     *
     * @param string $recordId Record identifier.
     * @return array Chronological list of state transitions.
     */
    public function getWorkflowHistory(string $recordId): array
    {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            return [];
        }
        return $record['history'] ?? [];
    }

    /**
     * Get the current state of a record.
     *
     * @param string $recordId Record identifier.
     * @return array|null Record state data or null if not found.
     */
    public function getRecordState(string $recordId): ?array
    {
        return $this->loadRecordState($recordId);
    }

    /**
     * Initialize a new record in the workflow.
     *
     * @param string $recordId   Record identifier (e.g. "NCR-2026-001").
     * @param string $recordType Record type (e.g. "NCR").
     * @param string $userId     User creating the record.
     * @param array  $data       Initial record data.
     * @return array The initialized record state.
     */
    public function initializeRecord(
        string $recordId,
        string $recordType,
        string $userId,
        array $data = [],
    ): array {
        $workflow = $this->getWorkflowConfig($recordType);
        if ($workflow === null) {
            throw new RuntimeException("No workflow defined for record type: {$recordType}");
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $initialState = $workflow['initial'];

        $record = array_merge($data, [
            'record_id'     => $recordId,
            'record_type'   => $recordType,
            'current_state' => $initialState,
            'created_by'    => $userId,
            'created_at'    => $now,
            'updated_by'    => $userId,
            'updated_at'    => $now,
            'history'       => [[
                'from'      => '',
                'to'        => $initialState,
                'user'      => $userId,
                'comment'   => 'Record created',
                'timestamp' => $now,
            ]],
            'approvals'     => [],
            'delegations'   => [],
        ]);

        $this->saveRecordState($recordId, $record);

        // Log creation to audit trail
        if ($this->auditTrail !== null) {
            $this->auditTrail->logEvent(new AuditEvent(
                eventType: AuditEventType::CREATED,
                aggregateType: $recordType,
                aggregateId: $recordId,
                actorId: $userId,
                payload: $data,
            ));
        }

        return $record;
    }

    /**
     * Get the workflow configuration for a record type.
     *
     * @param string $recordType Record type code.
     * @return array|null Workflow configuration or null.
     */
    public function getWorkflowConfig(string $recordType): ?array
    {
        $type = strtoupper(trim($recordType));
        return $this->workflows[$type] ?? null;
    }

    /**
     * Get all defined workflow types.
     *
     * @return string[] List of record type codes with workflows.
     */
    public function getDefinedWorkflowTypes(): array
    {
        return array_keys($this->workflows);
    }

    /**
     * Check for overdue records and trigger escalations.
     *
     * @return array List of escalated record IDs.
     */
    public function processEscalations(): array
    {
        $escalated = [];
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        // Scan state files for overdue items
        $files = glob($this->stateDir . '/*.json') ?: [];
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content === false) {
                continue;
            }
            $record = json_decode($content, true);
            if (!is_array($record)) {
                continue;
            }

            $dueDate = $record['due_date'] ?? null;
            if ($dueDate === null) {
                continue;
            }

            $due = new \DateTimeImmutable($dueDate);
            if ($now <= $due) {
                continue;
            }

            $currentState = $record['current_state'] ?? '';
            $recordType = $record['record_type'] ?? '';
            $workflow = $this->getWorkflowConfig($recordType);

            if ($workflow === null) {
                continue;
            }

            // Check if current state has escalation rules
            $terminal = $workflow['terminal'] ?? [];
            if (in_array($currentState, $terminal, true)) {
                continue;
            }

            $recordId = $record['record_id'] ?? basename($file, '.json');
            $escalated[] = $recordId;

            // Notify assigned user and their manager
            if ($this->notificationService !== null) {
                $assignee = $record['assigned_to'] ?? $record['created_by'] ?? '';
                if ($assignee !== '') {
                    $this->notificationService->notify(
                        userId: $assignee,
                        type: NotificationType::OVERDUE_ALERT,
                        message: sprintf('Record %s is overdue (due: %s, state: %s)', $recordId, $dueDate, $currentState),
                        data: [
                            'record_id'   => $recordId,
                            'record_type' => $recordType,
                            'due_date'    => $dueDate,
                            'state'       => $currentState,
                        ],
                        priority: NotificationPriority::URGENT,
                        messageVi: sprintf('Ban ghi %s da qua han (han: %s, trang thai: %s)', $recordId, $dueDate, $currentState),
                    );
                }
            }
        }

        return $escalated;
    }

    /**
     * Register a delegation (user A can approve on behalf of user B).
     *
     * @param string $recordId    Record identifier.
     * @param string $delegatorId The original approver delegating.
     * @param string $delegateId  The user receiving delegation.
     * @param string $reason      Reason for delegation.
     */
    public function addDelegation(
        string $recordId,
        string $delegatorId,
        string $delegateId,
        string $reason,
    ): void {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            throw new RuntimeException("Record not found: {$recordId}");
        }

        $record['delegations'][] = [
            'delegator' => $delegatorId,
            'delegate'  => $delegateId,
            'reason'    => $reason,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'active'    => true,
        ];

        $this->saveRecordState($recordId, $record);
    }

    /**
     * Record a parallel approval (one of multiple required approvers signs off).
     *
     * @param string      $recordId   Record identifier.
     * @param string      $approverId Approver user ID.
     * @param bool        $approved   True = approved, false = rejected.
     * @param string|null $comment    Optional comment.
     * @return array{approved_count: int, required_count: int, complete: bool}
     */
    public function recordParallelApproval(
        string $recordId,
        string $approverId,
        bool $approved,
        ?string $comment = null,
    ): array {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            throw new RuntimeException("Record not found: {$recordId}");
        }

        $record['approvals'][] = [
            'approver'  => $approverId,
            'decision'  => $approved ? 'approved' : 'rejected',
            'comment'   => $comment,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        ];

        $approvedCount = 0;
        $rejectedCount = 0;
        foreach ($record['approvals'] as $a) {
            match ($a['decision'] ?? '') {
                'approved' => $approvedCount++,
                'rejected' => $rejectedCount++,
                default    => null,
            };
        }

        $requiredCount = (int) ($record['required_approvals'] ?? 1);
        $complete = ($approvedCount >= $requiredCount) || ($rejectedCount > 0);

        $this->saveRecordState($recordId, $record);

        return [
            'approved_count' => $approvedCount,
            'rejected_count' => $rejectedCount,
            'required_count' => $requiredCount,
            'complete'       => $complete,
        ];
    }

    // ── State Persistence ───────────────────────────────────────────────────

    /**
     * Load record workflow state.
     */
    private function loadRecordState(string $recordId): ?array
    {
        $safeId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $recordId);

        // Try PostgreSQL first
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $row = $this->db->queryOne(
                    'SELECT * FROM workflow_states WHERE record_id = :id',
                    [':id' => $recordId],
                );
                if ($row !== null) {
                    $data = is_string($row['state_data'] ?? null)
                        ? json_decode($row['state_data'], true)
                        : ($row['state_data'] ?? []);
                    return is_array($data) ? $data : null;
                }
            } catch (\Throwable) {
                // Fall through to JSON
            }
        }

        // JSON fallback
        $file = $this->stateDir . '/' . $safeId . '.json';
        if (!is_file($file)) {
            return null;
        }

        $content = file_get_contents($file);
        if ($content === false) {
            return null;
        }

        $data = json_decode($content, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Save record workflow state.
     */
    private function saveRecordState(string $recordId, array $state): void
    {
        $safeId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $recordId);

        // Try PostgreSQL first
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $json = json_encode($state, JSON_UNESCAPED_UNICODE);
                $existing = $this->db->queryOne(
                    'SELECT record_id FROM workflow_states WHERE record_id = :id',
                    [':id' => $recordId],
                );
                if ($existing) {
                    $this->db->execute(
                        "UPDATE workflow_states SET state_data = :data::jsonb, current_state = :state, updated_at = NOW() WHERE record_id = :id",
                        [':data' => $json, ':state' => $state['current_state'] ?? '', ':id' => $recordId],
                    );
                } else {
                    $this->db->execute(
                        "INSERT INTO workflow_states (record_id, record_type, current_state, state_data, created_at, updated_at) VALUES (:id, :type, :state, :data::jsonb, NOW(), NOW())",
                        [
                            ':id'    => $recordId,
                            ':type'  => $state['record_type'] ?? '',
                            ':state' => $state['current_state'] ?? '',
                            ':data'  => $json,
                        ],
                    );
                }
            } catch (\Throwable $e) {
                error_log('[WorkflowEngine] PG write failed: ' . $e->getMessage());
            }
        }

        // Always write JSON as backup / primary
        $file = $this->stateDir . '/' . $safeId . '.json';
        file_put_contents(
            $file,
            json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX,
        );
    }

    // ── Role Checking ───────────────────────────────────────────────────────

    /**
     * Check if a user has one of the required roles for a transition.
     *
     * @param string $userId       User to check.
     * @param array  $requiredRoles List of role codes (any match suffices).
     * @param array  $record       Record state (for context: owner, assignee).
     * @return bool
     */
    private function userHasRole(string $userId, array $requiredRoles, array $record): bool
    {
        // Special role checks
        foreach ($requiredRoles as $role) {
            $role = strtolower(trim($role));

            // "owner" means the user who created the record
            if ($role === 'owner' && ($record['created_by'] ?? '') === $userId) {
                return true;
            }

            // "assignee" means the currently assigned user
            if ($role === 'assignee' && ($record['assigned_to'] ?? '') === $userId) {
                return true;
            }

            // Check delegation
            foreach ($record['delegations'] ?? [] as $d) {
                if (($d['active'] ?? false) && ($d['delegate'] ?? '') === $userId) {
                    return true;
                }
            }
        }

        // Load user roles from config
        $userRoles = $this->loadUserRoles($userId);
        foreach ($requiredRoles as $role) {
            if (in_array(strtolower(trim($role)), $userRoles, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Load a user's roles from the users configuration.
     *
     * @return string[] Lowercase role codes.
     */
    private function loadUserRoles(string $userId): array
    {
        $usersFile = rtrim(str_replace('\\', '/', $this->dataDir), '/') . '/config/users.json';
        if (!is_file($usersFile)) {
            return [];
        }

        $content = file_get_contents($usersFile);
        if ($content === false) {
            return [];
        }

        $users = json_decode($content, true);
        if (!is_array($users)) {
            return [];
        }

        foreach ($users as $user) {
            if (!is_array($user)) {
                continue;
            }
            $uid = $user['username'] ?? $user['id'] ?? '';
            if ($uid === $userId) {
                $role = $user['role'] ?? '';
                $roles = is_array($role) ? $role : [$role];
                return array_map('strtolower', array_filter($roles));
            }
        }

        return [];
    }

    // ── Transition Conditions ───────────────────────────────────────────────

    /**
     * Check that all conditions for a transition are satisfied.
     *
     * @return string[] Error messages for unmet conditions (empty = all OK).
     */
    private function checkTransitionConditions(array $transitionDef, array $record): array
    {
        $errors = [];
        $requires = $transitionDef['requires'] ?? [];

        foreach ($requires as $condition) {
            match ($condition) {
                'has_root_cause' => (empty($record['root_cause'] ?? '') && empty($record['data']['root_cause'] ?? ''))
                    ? $errors[] = 'Root cause analysis is required'
                    : null,
                'has_action_plan' => (empty($record['action_plan'] ?? '') && empty($record['data']['action_plan'] ?? ''))
                    ? $errors[] = 'Action plan is required'
                    : null,
                'has_disposition' => (empty($record['disposition'] ?? '') && empty($record['data']['disposition'] ?? ''))
                    ? $errors[] = 'Disposition decision is required'
                    : null,
                'has_verification' => (empty($record['verification_result'] ?? '') && empty($record['data']['verification_result'] ?? ''))
                    ? $errors[] = 'Verification evidence is required'
                    : null,
                'has_comment' => null, // Comment is passed in transition(), not in record
                'all_approvals' => ($this->pendingApprovalsExist($record))
                    ? $errors[] = 'All required approvals must be completed'
                    : null,
                default => null,
            };
        }

        return $errors;
    }

    /**
     * Check if there are pending approvals not yet satisfied.
     */
    private function pendingApprovalsExist(array $record): bool
    {
        $required = (int) ($record['required_approvals'] ?? 1);
        $completed = 0;
        foreach ($record['approvals'] ?? [] as $a) {
            if (($a['decision'] ?? '') === 'approved') {
                $completed++;
            }
        }
        return $completed < $required;
    }

    // ── Automatic Actions ───────────────────────────────────────────────────

    /**
     * Execute an automatic action triggered by a transition.
     *
     * @return string|null Description of the executed action.
     */
    private function executeAction(
        string $action,
        array &$record,
        string $userId,
        string $targetState,
        string $now,
    ): ?string {
        return match ($action) {
            'notify_approver' => $this->actionNotifyApprover($record),
            'notify_owner' => $this->actionNotifyOwner($record, $targetState),
            'set_due_date_7d' => $this->actionSetDueDate($record, 7, $now),
            'set_due_date_14d' => $this->actionSetDueDate($record, 14, $now),
            'set_due_date_30d' => $this->actionSetDueDate($record, 30, $now),
            'clear_due_date' => $this->actionClearDueDate($record),
            'notify_qa_manager' => $this->actionNotifyRole($record, 'qa_manager', $targetState),
            'notify_production_director' => $this->actionNotifyRole($record, 'production_director', $targetState),
            default => null,
        };
    }

    private function actionNotifyApprover(array $record): ?string
    {
        if ($this->notificationService === null) {
            return null;
        }
        $approver = $record['approver'] ?? $record['assigned_to'] ?? '';
        if ($approver === '') {
            return null;
        }
        $this->notificationService->notify(
            userId: $approver,
            type: NotificationType::APPROVAL_REQUIRED,
            message: sprintf('Approval required for %s (%s)', $record['record_id'] ?? '', $record['record_type'] ?? ''),
            data: ['record_id' => $record['record_id'] ?? '', 'record_type' => $record['record_type'] ?? ''],
            priority: NotificationPriority::URGENT,
            messageVi: sprintf('Can phe duyet cho %s (%s)', $record['record_id'] ?? '', $record['record_type'] ?? ''),
        );
        return 'notify_approver: ' . $approver;
    }

    private function actionNotifyOwner(array $record, string $targetState): ?string
    {
        if ($this->notificationService === null) {
            return null;
        }
        $owner = $record['created_by'] ?? '';
        if ($owner === '') {
            return null;
        }
        $this->notificationService->notify(
            userId: $owner,
            type: NotificationType::STATUS_CHANGED,
            message: sprintf('%s moved to "%s"', $record['record_id'] ?? '', $targetState),
            data: ['record_id' => $record['record_id'] ?? '', 'new_state' => $targetState],
            messageVi: sprintf('%s da chuyen sang "%s"', $record['record_id'] ?? '', $targetState),
        );
        return 'notify_owner: ' . $owner;
    }

    private function actionSetDueDate(array &$record, int $days, string $now): string
    {
        $due = (new \DateTimeImmutable($now))->modify("+{$days} days");
        $record['due_date'] = $due->format('Y-m-d');
        return "set_due_date: {$record['due_date']}";
    }

    private function actionClearDueDate(array &$record): string
    {
        $record['due_date'] = null;
        return 'clear_due_date';
    }

    private function actionNotifyRole(array $record, string $role, string $targetState): ?string
    {
        // Role notification is handled via the notification service's role-lookup
        // For now, log the intent
        return "notify_role:{$role} for {$record['record_id']}";
    }

    // ── Workflow Definitions ────────────────────────────────────────────────

    /**
     * Build all workflow state machine definitions.
     *
     * @return array<string, array> Keyed by record type code.
     */
    private function buildWorkflowDefinitions(): array
    {
        return [
            'DOC' => [
                'initial'  => 'draft',
                'terminal' => ['obsolete'],
                'states'   => ['draft', 'in_review', 'approved', 'released', 'obsolete'],
                'transitions' => [
                    'draft' => [
                        'in_review' => [
                            'label'    => 'Submit for Review',
                            'label_vi' => 'Gui xem xet',
                            'roles'    => ['owner', 'admin', 'qms_engineer'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'in_review' => [
                        'approved' => [
                            'label'    => 'Approve',
                            'label_vi' => 'Phe duyet',
                            'roles'    => ['qa_manager', 'admin', 'general_manager'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                        'draft' => [
                            'label'    => 'Return to Draft',
                            'label_vi' => 'Tra ve ban nhap',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [
                        'released' => [
                            'label'    => 'Release',
                            'label_vi' => 'Ban hanh',
                            'roles'    => ['qa_manager', 'admin', 'qms_engineer'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'released' => [
                        'obsolete' => [
                            'label'    => 'Obsolete',
                            'label_vi' => 'Loi thoi',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'in_review' => [
                            'label'    => 'Revise',
                            'label_vi' => 'Sua doi',
                            'roles'    => ['owner', 'admin', 'qms_engineer'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'obsolete' => [],
                ],
            ],

            'NCR' => [
                'initial'  => 'open',
                'terminal' => ['closed'],
                'states'   => ['open', 'containment', 'investigation', 'disposition', 'closed'],
                'transitions' => [
                    'open' => [
                        'containment' => [
                            'label'    => 'Start Containment',
                            'label_vi' => 'Bat dau kiem soat',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                    ],
                    'containment' => [
                        'investigation' => [
                            'label'    => 'Begin Investigation',
                            'label_vi' => 'Bat dau dieu tra',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'investigation' => [
                        'disposition' => [
                            'label'    => 'Record Disposition',
                            'label_vi' => 'Ghi nhan xu ly',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => ['has_root_cause'],
                        ],
                    ],
                    'disposition' => [
                        'closed' => [
                            'label'    => 'Close NCR',
                            'label_vi' => 'Dong NCR',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_disposition'],
                        ],
                        'investigation' => [
                            'label'    => 'Reopen Investigation',
                            'label_vi' => 'Mo lai dieu tra',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'CAPA' => [
                'initial'  => 'initiated',
                'terminal' => ['closed'],
                'states'   => ['initiated', 'root_cause', 'action_plan', 'implementation', 'verification', 'closed'],
                'transitions' => [
                    'initiated' => [
                        'root_cause' => [
                            'label'    => 'Begin Root Cause Analysis',
                            'label_vi' => 'Bat dau phan tich nguyen nhan goc',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'root_cause' => [
                        'action_plan' => [
                            'label'    => 'Define Action Plan',
                            'label_vi' => 'Xac dinh ke hoach hanh dong',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => ['has_root_cause'],
                        ],
                    ],
                    'action_plan' => [
                        'implementation' => [
                            'label'    => 'Begin Implementation',
                            'label_vi' => 'Bat dau thuc hien',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => ['has_action_plan'],
                        ],
                    ],
                    'implementation' => [
                        'verification' => [
                            'label'    => 'Submit for Verification',
                            'label_vi' => 'Gui xac minh',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'verification' => [
                        'closed' => [
                            'label'    => 'Close CAPA',
                            'label_vi' => 'Dong CAPA',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_verification'],
                        ],
                        'implementation' => [
                            'label'    => 'Return to Implementation',
                            'label_vi' => 'Tra ve thuc hien',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'FAI' => [
                'initial'  => 'planned',
                'terminal' => ['closed'],
                'states'   => ['planned', 'in_progress', 'review', 'approved', 'closed'],
                'transitions' => [
                    'planned' => [
                        'in_progress' => [
                            'label'    => 'Start Inspection',
                            'label_vi' => 'Bat dau kiem tra',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'review' => [
                            'label'    => 'Submit for Review',
                            'label_vi' => 'Gui xem xet',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'review' => [
                        'approved' => [
                            'label'    => 'Approve FAI',
                            'label_vi' => 'Phe duyet FAI',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                        'in_progress' => [
                            'label'    => 'Return for Rework',
                            'label_vi' => 'Tra ve lam lai',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [
                        'closed' => [
                            'label'    => 'Close FAI',
                            'label_vi' => 'Dong FAI',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'CAL' => [
                'initial'  => 'scheduled',
                'terminal' => ['certified'],
                'states'   => ['scheduled', 'in_progress', 'pass', 'fail', 'certified'],
                'transitions' => [
                    'scheduled' => [
                        'in_progress' => [
                            'label'    => 'Start Calibration',
                            'label_vi' => 'Bat dau hieu chuan',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'pass' => [
                            'label'    => 'Record Pass',
                            'label_vi' => 'Ghi nhan Dat',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'fail' => [
                            'label'    => 'Record Fail',
                            'label_vi' => 'Ghi nhan Khong dat',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => ['notify_qa_manager'],
                            'requires' => [],
                        ],
                    ],
                    'pass' => [
                        'certified' => [
                            'label'    => 'Certify',
                            'label_vi' => 'Chung nhan',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'fail' => [
                        'scheduled' => [
                            'label'    => 'Reschedule',
                            'label_vi' => 'Lap lich lai',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'certified' => [],
                ],
            ],

            'AUD' => [
                'initial'  => 'planned',
                'terminal' => ['closed'],
                'states'   => ['planned', 'in_progress', 'reporting', 'follow_up', 'closed'],
                'transitions' => [
                    'planned' => [
                        'in_progress' => [
                            'label'    => 'Start Audit',
                            'label_vi' => 'Bat dau danh gia',
                            'roles'    => ['auditor', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'reporting' => [
                            'label'    => 'Draft Report',
                            'label_vi' => 'Soan bao cao',
                            'roles'    => ['auditor', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'reporting' => [
                        'follow_up' => [
                            'label'    => 'Issue Findings',
                            'label_vi' => 'Ban hanh phat hien',
                            'roles'    => ['auditor', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => [],
                        ],
                    ],
                    'follow_up' => [
                        'closed' => [
                            'label'    => 'Close Audit',
                            'label_vi' => 'Dong danh gia',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['clear_due_date'],
                            'requires' => [],
                        ],
                        'reporting' => [
                            'label'    => 'Reopen Reporting',
                            'label_vi' => 'Mo lai bao cao',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'TRN' => [
                'initial'  => 'scheduled',
                'terminal' => ['certified'],
                'states'   => ['scheduled', 'in_progress', 'assessment', 'certified'],
                'transitions' => [
                    'scheduled' => [
                        'in_progress' => [
                            'label'    => 'Start Training',
                            'label_vi' => 'Bat dau dao tao',
                            'roles'    => ['hr_manager', 'trainer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'assessment' => [
                            'label'    => 'Assess Competency',
                            'label_vi' => 'Danh gia nang luc',
                            'roles'    => ['hr_manager', 'trainer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'assessment' => [
                        'certified' => [
                            'label'    => 'Certify Completion',
                            'label_vi' => 'Chung nhan hoan thanh',
                            'roles'    => ['hr_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                        'in_progress' => [
                            'label'    => 'Require Retraining',
                            'label_vi' => 'Yeu cau dao tao lai',
                            'roles'    => ['hr_manager', 'trainer', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'certified' => [],
                ],
            ],

            'ECR' => [
                'initial'  => 'submitted',
                'terminal' => ['verified'],
                'states'   => ['submitted', 'review', 'approved', 'implemented', 'verified'],
                'transitions' => [
                    'submitted' => [
                        'review' => [
                            'label'    => 'Start Review',
                            'label_vi' => 'Bat dau xem xet',
                            'roles'    => ['engineering_manager', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'review' => [
                        'approved' => [
                            'label'    => 'Approve Change',
                            'label_vi' => 'Phe duyet thay doi',
                            'roles'    => ['engineering_manager', 'qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'set_due_date_30d'],
                            'requires' => [],
                        ],
                        'submitted' => [
                            'label'    => 'Return for Revision',
                            'label_vi' => 'Tra ve chinh sua',
                            'roles'    => ['engineering_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [
                        'implemented' => [
                            'label'    => 'Mark Implemented',
                            'label_vi' => 'Danh dau da thuc hien',
                            'roles'    => ['engineering_manager', 'process_engineer', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'implemented' => [
                        'verified' => [
                            'label'    => 'Verify Implementation',
                            'label_vi' => 'Xac minh thuc hien',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_verification'],
                        ],
                    ],
                    'verified' => [],
                ],
            ],

            'SCAR' => [
                'initial'  => 'issued',
                'terminal' => ['closed'],
                'states'   => ['issued', 'response_due', 'response_received', 'verification', 'closed'],
                'transitions' => [
                    'issued' => [
                        'response_due' => [
                            'label'    => 'Send to Supplier',
                            'label_vi' => 'Gui nha cung cap',
                            'roles'    => ['buyer', 'supply_chain_manager', 'admin'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'response_due' => [
                        'response_received' => [
                            'label'    => 'Record Response',
                            'label_vi' => 'Ghi nhan phan hoi',
                            'roles'    => ['buyer', 'supply_chain_manager', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'response_received' => [
                        'verification' => [
                            'label'    => 'Verify Actions',
                            'label_vi' => 'Xac minh hanh dong',
                            'roles'    => ['qa_manager', 'supply_chain_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'response_due' => [
                            'label'    => 'Reject Response',
                            'label_vi' => 'Tu choi phan hoi',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                    ],
                    'verification' => [
                        'closed' => [
                            'label'    => 'Close SCAR',
                            'label_vi' => 'Dong SCAR',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_verification'],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'RISK' => [
                'initial'  => 'identified',
                'terminal' => ['closed'],
                'states'   => ['identified', 'assessed', 'mitigated', 'monitored', 'closed'],
                'transitions' => [
                    'identified' => [
                        'assessed' => [
                            'label'    => 'Complete Assessment',
                            'label_vi' => 'Hoan thanh danh gia',
                            'roles'    => ['qa_manager', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'assessed' => [
                        'mitigated' => [
                            'label'    => 'Define Mitigation',
                            'label_vi' => 'Xac dinh giam thieu',
                            'roles'    => ['qa_manager', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => [],
                        ],
                    ],
                    'mitigated' => [
                        'monitored' => [
                            'label'    => 'Begin Monitoring',
                            'label_vi' => 'Bat dau giam sat',
                            'roles'    => ['qa_manager', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'monitored' => [
                        'closed' => [
                            'label'    => 'Close Risk',
                            'label_vi' => 'Dong rui ro',
                            'roles'    => ['qa_manager', 'admin', 'general_manager'],
                            'actions'  => ['clear_due_date'],
                            'requires' => [],
                        ],
                        'assessed' => [
                            'label'    => 'Reassess Risk',
                            'label_vi' => 'Danh gia lai rui ro',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'IMP' => [
                'initial'  => 'proposed',
                'terminal' => ['closed'],
                'states'   => ['proposed', 'approved', 'pdca_do', 'pdca_check', 'pdca_act', 'closed'],
                'transitions' => [
                    'proposed' => [
                        'approved' => [
                            'label'    => 'Approve Project',
                            'label_vi' => 'Phe duyet du an',
                            'roles'    => ['production_director', 'general_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [
                        'pdca_do' => [
                            'label'    => 'Begin DO Phase',
                            'label_vi' => 'Bat dau giai doan DO',
                            'roles'    => ['assignee', 'admin', 'owner'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => [],
                        ],
                    ],
                    'pdca_do' => [
                        'pdca_check' => [
                            'label'    => 'Move to CHECK Phase',
                            'label_vi' => 'Chuyen sang giai doan CHECK',
                            'roles'    => ['assignee', 'admin', 'owner'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'pdca_check' => [
                        'pdca_act' => [
                            'label'    => 'Move to ACT Phase',
                            'label_vi' => 'Chuyen sang giai doan ACT',
                            'roles'    => ['assignee', 'admin', 'owner'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'pdca_do' => [
                            'label'    => 'Return to DO Phase',
                            'label_vi' => 'Quay lai giai doan DO',
                            'roles'    => ['assignee', 'admin', 'owner'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'pdca_act' => [
                        'closed' => [
                            'label'    => 'Close Project',
                            'label_vi' => 'Dong du an',
                            'roles'    => ['production_director', 'general_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_verification'],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            'MR' => [
                'initial'  => 'scheduled',
                'terminal' => ['approved'],
                'states'   => ['scheduled', 'in_progress', 'minutes_drafted', 'approved'],
                'transitions' => [
                    'scheduled' => [
                        'in_progress' => [
                            'label'    => 'Begin Meeting',
                            'label_vi' => 'Bat dau hop',
                            'roles'    => ['qms_engineer', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'minutes_drafted' => [
                            'label'    => 'Draft Minutes',
                            'label_vi' => 'Soan bien ban',
                            'roles'    => ['qms_engineer', 'qa_manager', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'minutes_drafted' => [
                        'approved' => [
                            'label'    => 'Approve Minutes',
                            'label_vi' => 'Phe duyet bien ban',
                            'roles'    => ['general_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                        'in_progress' => [
                            'label'    => 'Revise Minutes',
                            'label_vi' => 'Chinh sua bien ban',
                            'roles'    => ['general_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [],
                ],
            ],
        ];
    }
}
