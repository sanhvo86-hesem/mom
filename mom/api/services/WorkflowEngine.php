<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Api\Services\DomainEvent;
use MOM\Api\Services\EventBus;
use MOM\Api\Services\WorkflowDefinitionRegistry;
use MOM\Database\Connection;
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
 * State-machine workflow engine for HESEM MOM record lifecycle management.
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
 * @package MOM\Services
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
     * @param string               $dataDir             Absolute path to data directory.
     * @param Connection|null      $db                  Optional database connection.
     * @param AuditTrail|null      $auditTrail          Optional audit trail for logging transitions.
     * @param NotificationService|null $notificationService Optional notification service.
     * @param EventBus|null        $eventBus            Optional event bus for domain events.
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
        private readonly ?AuditTrail $auditTrail = null,
        private readonly ?NotificationService $notificationService = null,
        private readonly ?EventBus $eventBus = null,
    ) {
        $this->stateDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/workflow-states';
        if (!is_dir($this->stateDir)) {
            @mkdir($this->stateDir, 0775, true);
        }
        $this->workflows = $this->buildWorkflowDefinitions();

        // Populate the shared registry so other services can query definitions
        // without needing a WorkflowEngine instance.
        WorkflowDefinitionRegistry::register($this->workflows);
        WorkflowDefinitionRegistry::registerStepRequirements($this->buildStepDataRequirements());
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
        array  $data = [],
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

        // ── Step data validation: check required fields per transition ────
        $stepDataValidation = $this->validateStepData($recordType, $targetState, $data);
        if (!$stepDataValidation['ok']) {
            return new TransitionResult(
                success: false,
                recordId: $recordId,
                fromState: $currentState,
                toState: $targetState,
                error: 'Required step data missing: ' . implode(', ', array_column($stepDataValidation['missing'], 'label')),
                errorVi: 'Thieu du lieu bat buoc: ' . implode(', ', array_column($stepDataValidation['missing'], 'label_vi')),
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

        // ── Persist step data to structured table ───────────────────────
        $this->persistStepData($recordType, $recordId, $currentState, $targetState, $data, $userId, $now);

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

        $this->publishWorkflowTransition(
            $recordType,
            $recordId,
            $currentState,
            $targetState,
            $userId,
            $triggeredActions,
            $comment,
        );

        return new TransitionResult(
            success: true,
            recordId: $recordId,
            fromState: $currentState,
            toState: $targetState,
            triggeredActions: $triggeredActions,
        );
    }

    /**
     * Publish a workflow transition event after state persistence succeeds.
     *
     * @param array<int, mixed> $triggeredActions
     */
    private function publishWorkflowTransition(
        string $recordType,
        string $recordId,
        string $fromState,
        string $toState,
        string $userId,
        array $triggeredActions,
        ?string $comment,
    ): void {
        try {
            ($this->eventBus ?? EventBus::getInstance())->publish(DomainEvent::workflowTransitioned(
                $recordType,
                $recordId,
                $fromState,
                $toState,
                $userId,
                $triggeredActions,
                $comment,
            ));
        } catch (\Throwable $e) {
            @error_log('[WorkflowEngine] Failed to publish workflow transition event: ' . $e->getMessage());
        }
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
     * @param string|null $meaning    Optional signature meaning (approved/reviewed/rejected/witnessed).
     * @param string|null $comment    Optional comment.
     * @return array{approved_count: int, required_count: int, complete: bool}
     */
    public function recordParallelApproval(
        string $recordId,
        string $approverId,
        bool $approved,
        ?string $meaning = null,
        ?string $comment = null,
    ): array {
        $record = $this->loadRecordState($recordId);
        if ($record === null) {
            throw new RuntimeException("Record not found: {$recordId}");
        }

        $decision = $approved ? 'approved' : 'rejected';
        $normalizedMeaning = strtolower(trim((string)($meaning ?? $decision)));
        if (!in_array($normalizedMeaning, ['approved', 'reviewed', 'rejected', 'witnessed'], true)) {
            $normalizedMeaning = $decision;
        }

        $record['approvals'][] = [
            'approver'  => $approverId,
            'decision'  => $decision,
            'meaning'   => $normalizedMeaning,
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
        $complete = ($approvedCount >= $requiredCount);
        $rejected = ($rejectedCount > 0 && ($approvedCount + $rejectedCount) >= $requiredCount);
        $complete = $complete || $rejected;

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
                        "UPDATE workflow_states SET state_data = CAST(:data AS jsonb), current_state = :state, updated_at = NOW() WHERE record_id = :id",
                        [':data' => $json, ':state' => $state['current_state'] ?? '', ':id' => $recordId],
                    );
                } else {
                    $this->db->execute(
                        "INSERT INTO workflow_states (record_id, record_type, current_state, state_data, created_at, updated_at) VALUES (:id, :type, :state, CAST(:data AS jsonb), NOW(), NOW())",
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

    // ── Step Data Persistence ──────────────────────────────────────────────

    /**
     * Persist structured step data to the appropriate database table.
     * Dual-write: PostgreSQL (if available) + JSON file backup.
     *
     * This ensures every workflow transition has its business data
     * captured in a queryable, structured format -- essential for
     * compliance reporting (AS9100D, ISO 17025).
     */
    private function persistStepData(
        string $recordType,
        string $recordId,
        string $fromState,
        string $toState,
        array  $data,
        string $userId,
        string $now,
    ): void {
        $reqs = $this->getStepDataRequirements($recordType, $toState);

        // Only persist if there are defined requirements for this step
        if (empty($reqs['required_fields']) && empty($reqs['optional_fields'])) {
            return;
        }

        // Build the step data record
        $stepRecord = [
            'workflow_type' => $recordType,
            'record_id'     => $recordId,
            'step_name'     => $toState,
            'from_state'    => $fromState,
            'to_state'      => $toState,
            'data_fields'   => [],
            'captured_by'   => $userId,
            'captured_at'   => $now,
            'target_table'  => $reqs['table'],
        ];

        // Extract relevant fields from data
        foreach (array_keys($reqs['required_fields']) as $field) {
            if (isset($data[$field])) {
                $stepRecord['data_fields'][$field] = $data[$field];
            }
        }
        foreach ($reqs['optional_fields'] as $field) {
            if (isset($data[$field])) {
                $stepRecord['data_fields'][$field] = $data[$field];
            }
        }

        // Try PostgreSQL
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $this->db->execute(
                    "INSERT INTO workflow_step_data (workflow_type, record_id, step_name, from_state, to_state, data_fields, captured_by, captured_at)
                     VALUES (:wtype, :rid, :step, :from, :to, CAST(:data AS jsonb), (SELECT user_id FROM users WHERE username = :user LIMIT 1), CAST(:at AS timestamptz))
                     ON CONFLICT (workflow_type, record_id, step_name, to_state)
                     DO UPDATE SET data_fields = EXCLUDED.data_fields, captured_by = EXCLUDED.captured_by, captured_at = EXCLUDED.captured_at",
                    [
                        ':wtype' => $recordType,
                        ':rid'   => $recordId,
                        ':step'  => $toState,
                        ':from'  => $fromState,
                        ':to'    => $toState,
                        ':data'  => json_encode($stepRecord['data_fields'], JSON_UNESCAPED_UNICODE),
                        ':user'  => $userId,
                        ':at'    => $now,
                    ],
                );
            } catch (\Throwable $e) {
                error_log('[WorkflowEngine] Step data PG write failed: ' . $e->getMessage());
            }
        }

        // Always write JSON backup
        $stepDir = $this->stateDir . '/step_data';
        if (!is_dir($stepDir)) {
            @mkdir($stepDir, 0775, true);
        }
        $safeId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $recordId);
        $stepFile = $stepDir . '/' . $safeId . '_steps.jsonl';
        $line = json_encode($stepRecord, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($stepFile, $line, FILE_APPEND | LOCK_EX);
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
            // Foundation Governance Contract Slice: approval-step lifecycle
            'APPROVAL_STEP' => [
                'initial'  => 'pending',
                'terminal' => ['approved', 'rejected'],
                'states'   => ['pending', 'approved', 'rejected', 'changes_requested'],
                'transitions' => [
                    'pending' => [
                        'approved' => [
                            'label'    => 'Approve',
                            'label_vi' => 'Phe duyet',
                            'roles'    => ['qa_manager', 'admin', 'general_manager', 'approver'],
                            'actions'  => ['audit_decision'],
                            'requires' => [],
                        ],
                        'rejected' => [
                            'label'    => 'Reject',
                            'label_vi' => 'Tu choi',
                            'roles'    => ['qa_manager', 'admin', 'general_manager', 'approver'],
                            'actions'  => ['audit_decision'],
                            'requires' => [],
                        ],
                        'changes_requested' => [
                            'label'    => 'Request Changes',
                            'label_vi' => 'Yeu cau thay doi',
                            'roles'    => ['qa_manager', 'admin', 'general_manager', 'approver'],
                            'actions'  => ['audit_decision'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [],
                    'rejected' => [],
                    'changes_requested' => [
                        'pending' => [
                            'label'    => 'Resubmit for Review',
                            'label_vi' => 'Gui lai xem xet',
                            'roles'    => ['owner', 'admin', 'requester'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                ],
            ],

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
                    ],
                    'obsolete' => [],
                ],
            ],

            // ── NCR: World-class with MRB routing, human factors, auto-CAPA trigger ──
            'NCR' => [
                'initial'  => 'open',
                'terminal' => ['closed', 'voided'],
                'states'   => [
                    'open', 'containment', 'segregated', 'investigation',
                    'mrb_review', 'disposition', 'rework_in_progress',
                    'reinspection', 'closed', 'voided',
                ],
                'transitions' => [
                    'open' => [
                        'containment' => [
                            'label'    => 'Start Containment (24h SLA)',
                            'label_vi' => 'Bat dau kiem soat (SLA 24h)',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee', 'qc_inspector'],
                            'actions'  => ['set_due_date_7d', 'notify_qa_manager'],
                            'requires' => [],
                        ],
                        'voided' => [
                            'label'    => 'Void (duplicate/invalid)',
                            'label_vi' => 'Huy (trung/khong hop le)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'containment' => [
                        'segregated' => [
                            'label'    => 'Confirm Segregation',
                            'label_vi' => 'Xac nhan cach ly',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'investigation' => [
                            'label'    => 'Begin Investigation',
                            'label_vi' => 'Bat dau dieu tra',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'segregated' => [
                        'investigation' => [
                            'label'    => 'Begin Investigation',
                            'label_vi' => 'Bat dau dieu tra',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'investigation' => [
                        'mrb_review' => [
                            'label'    => 'Escalate to MRB',
                            'label_vi' => 'Chuyen len Hoi dong MRB',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['notify_production_director', 'notify_approver'],
                            'requires' => ['has_root_cause'],
                        ],
                        'disposition' => [
                            'label'    => 'Record Disposition (minor)',
                            'label_vi' => 'Ghi nhan xu ly (nhe)',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => ['has_root_cause'],
                        ],
                    ],
                    'mrb_review' => [
                        'disposition' => [
                            'label'    => 'MRB Disposition Decision',
                            'label_vi' => 'Quyet dinh xu ly cua MRB',
                            'roles'    => ['qa_manager', 'production_director', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => ['has_disposition'],
                        ],
                    ],
                    'disposition' => [
                        'rework_in_progress' => [
                            'label'    => 'Start Rework',
                            'label_vi' => 'Bat dau lam lai',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                        'closed' => [
                            'label'    => 'Close NCR (scrap/use-as-is)',
                            'label_vi' => 'Dong NCR (huy/chap nhan)',
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
                    'rework_in_progress' => [
                        'reinspection' => [
                            'label'    => 'Submit for Reinspection',
                            'label_vi' => 'Gui kiem tra lai',
                            'roles'    => ['quality_engineer', 'admin', 'assignee'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'reinspection' => [
                        'closed' => [
                            'label'    => 'Reinspection Pass - Close',
                            'label_vi' => 'Kiem tra lai Dat - Dong',
                            'roles'    => ['qa_manager', 'qc_inspector', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'rework_in_progress' => [
                            'label'    => 'Reinspection Fail - Return',
                            'label_vi' => 'Kiem tra lai Khong dat - Tra ve',
                            'roles'    => ['qa_manager', 'qc_inspector', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                    'voided' => [],
                ],
            ],

            // ── CAPA: 8D methodology, human factors, effectiveness 30/60/90 day ──
            'CAPA' => [
                'initial'  => 'initiated',
                'terminal' => ['closed', 'closed_ineffective'],
                'states'   => [
                    'initiated', 'containment', 'root_cause', 'action_plan',
                    'implementation', 'verification',
                    'effectiveness_30d', 'effectiveness_60d', 'effectiveness_90d',
                    'closed', 'closed_ineffective',
                ],
                'transitions' => [
                    'initiated' => [
                        'containment' => [
                            'label'    => 'D3: Define Interim Containment',
                            'label_vi' => 'D3: Xac dinh hanh dong kiem soat tam thoi',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                    ],
                    'containment' => [
                        'root_cause' => [
                            'label'    => 'D4: Root Cause Analysis (incl. human factors)',
                            'label_vi' => 'D4: Phan tich nguyen nhan goc (gom yeu to con nguoi)',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => [],
                        ],
                    ],
                    'root_cause' => [
                        'action_plan' => [
                            'label'    => 'D5-D6: Corrective Action Plan',
                            'label_vi' => 'D5-D6: Ke hoach hanh dong khac phuc',
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
                            'label'    => 'D7: Submit for Verification',
                            'label_vi' => 'D7: Gui xac minh',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'verification' => [
                        'effectiveness_30d' => [
                            'label'    => 'Approve - Start 30-day Effectiveness Check',
                            'label_vi' => 'Phe duyet - Bat dau kiem tra hieu qua 30 ngay',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['set_due_date_30d', 'notify_owner'],
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
                    'effectiveness_30d' => [
                        'effectiveness_60d' => [
                            'label'    => '30-day Check Pass - Continue to 60-day',
                            'label_vi' => 'Kiem tra 30 ngay Dat - Tiep tuc 60 ngay',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => [],
                        ],
                        'closed' => [
                            'label'    => '30-day Check Pass - Close (low severity)',
                            'label_vi' => 'Kiem tra 30 ngay Dat - Dong (muc do thap)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'implementation' => [
                            'label'    => '30-day Check FAIL - Reopen',
                            'label_vi' => 'Kiem tra 30 ngay KHONG DAT - Mo lai',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'effectiveness_60d' => [
                        'effectiveness_90d' => [
                            'label'    => '60-day Check Pass - Continue to 90-day',
                            'label_vi' => 'Kiem tra 60 ngay Dat - Tiep tuc 90 ngay',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['set_due_date_30d'],
                            'requires' => [],
                        ],
                        'implementation' => [
                            'label'    => '60-day Check FAIL - Reopen',
                            'label_vi' => 'Kiem tra 60 ngay KHONG DAT - Mo lai',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'effectiveness_90d' => [
                        'closed' => [
                            'label'    => 'D8: 90-day Effectiveness Confirmed - Close',
                            'label_vi' => 'D8: Hieu qua 90 ngay xac nhan - Dong',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'closed_ineffective' => [
                            'label'    => '90-day FAIL - Close as Ineffective',
                            'label_vi' => '90 ngay KHONG DAT - Dong khong hieu qua',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'notify_production_director'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                    'closed_ineffective' => [],
                ],
            ],

            // ── FAI: AS9102 three-form, trigger detection, partial FAI support ──
            'FAI' => [
                'initial'  => 'triggered',
                'terminal' => ['closed'],
                'states'   => [
                    'triggered', 'planning', 'form1_part_accountability',
                    'form2_material_process', 'form3_characteristics',
                    'review', 'conditional_approval', 'approved', 'closed',
                ],
                'transitions' => [
                    'triggered' => [
                        'planning' => [
                            'label'    => 'Accept FAI Trigger - Begin Planning',
                            'label_vi' => 'Chap nhan FAI - Bat dau lap ke hoach',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_30d', 'notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'planning' => [
                        'form1_part_accountability' => [
                            'label'    => 'Start Form 1: Part Accountability',
                            'label_vi' => 'Bat dau Form 1: Truy xuat linh kien',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'form1_part_accountability' => [
                        'form2_material_process' => [
                            'label'    => 'Form 2: Material & Process Verification',
                            'label_vi' => 'Form 2: Xac minh vat lieu & quy trinh',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'form2_material_process' => [
                        'form3_characteristics' => [
                            'label'    => 'Form 3: Characteristic Inspection',
                            'label_vi' => 'Form 3: Kiem tra dac tinh san pham',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'form3_characteristics' => [
                        'review' => [
                            'label'    => 'Submit All 3 Forms for Review',
                            'label_vi' => 'Gui ca 3 Form de xem xet',
                            'roles'    => ['qc_inspector', 'quality_engineer', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'review' => [
                        'approved' => [
                            'label'    => 'Full Approval',
                            'label_vi' => 'Phe duyet toan bo',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'conditional_approval' => [
                            'label'    => 'Conditional Approval (minor deviations)',
                            'label_vi' => 'Phe duyet co dieu kien (sai lech nho)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                        'form3_characteristics' => [
                            'label'    => 'Return for Re-measurement',
                            'label_vi' => 'Tra ve do lai',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'conditional_approval' => [
                        'approved' => [
                            'label'    => 'Conditions Met - Full Approval',
                            'label_vi' => 'Dieu kien dat - Phe duyet toan bo',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'approved' => [
                        'closed' => [
                            'label'    => 'Close FAI Package',
                            'label_vi' => 'Dong goi FAI',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            // ── CAL: ISO 17025, OOT investigation, MSA/Gauge R&R gate ──
            'CAL' => [
                'initial'  => 'scheduled',
                'terminal' => ['certified', 'condemned'],
                'states'   => [
                    'scheduled', 'overdue', 'in_progress', 'as_found_pass', 'as_found_fail',
                    'oot_investigation', 'impact_assessment', 'adjustment',
                    'as_left_verification', 'certified', 'condemned',
                ],
                'transitions' => [
                    'scheduled' => [
                        'in_progress' => [
                            'label'    => 'Start Calibration',
                            'label_vi' => 'Bat dau hieu chuan',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'overdue' => [
                            'label'    => 'Mark Overdue (auto)',
                            'label_vi' => 'Danh dau qua han (tu dong)',
                            'roles'    => ['admin'],
                            'actions'  => ['notify_qa_manager'],
                            'requires' => [],
                        ],
                    ],
                    'overdue' => [
                        'in_progress' => [
                            'label'    => 'Start Calibration (overdue)',
                            'label_vi' => 'Bat dau hieu chuan (qua han)',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'as_found_pass' => [
                            'label'    => 'As-Found: PASS (within tolerance)',
                            'label_vi' => 'Kiem tra ban dau: DAT (trong dung sai)',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'as_found_fail' => [
                            'label'    => 'As-Found: FAIL (out of tolerance)',
                            'label_vi' => 'Kiem tra ban dau: KHONG DAT (ngoai dung sai)',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => ['notify_qa_manager'],
                            'requires' => [],
                        ],
                    ],
                    'as_found_pass' => [
                        'certified' => [
                            'label'    => 'Certify Instrument',
                            'label_vi' => 'Chung nhan thiet bi',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'as_found_fail' => [
                        'oot_investigation' => [
                            'label'    => 'Begin OOT Investigation',
                            'label_vi' => 'Bat dau dieu tra vuot dung sai',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                    ],
                    'oot_investigation' => [
                        'impact_assessment' => [
                            'label'    => 'Assess Product Impact',
                            'label_vi' => 'Danh gia anh huong san pham',
                            'roles'    => ['qa_manager', 'quality_engineer', 'admin'],
                            'actions'  => ['set_due_date_14d', 'notify_production_director'],
                            'requires' => [],
                        ],
                    ],
                    'impact_assessment' => [
                        'adjustment' => [
                            'label'    => 'Adjust / Repair Instrument',
                            'label_vi' => 'Dieu chinh / Sua chua thiet bi',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'condemned' => [
                            'label'    => 'Condemn Instrument (unrepairable)',
                            'label_vi' => 'Loai bo thiet bi (khong sua duoc)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'adjustment' => [
                        'as_left_verification' => [
                            'label'    => 'As-Left Verification',
                            'label_vi' => 'Kiem tra sau dieu chinh',
                            'roles'    => ['metrology_specialist', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'as_left_verification' => [
                        'certified' => [
                            'label'    => 'As-Left PASS - Certify',
                            'label_vi' => 'Sau dieu chinh DAT - Chung nhan',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'condemned' => [
                            'label'    => 'As-Left FAIL - Condemn',
                            'label_vi' => 'Sau dieu chinh KHONG DAT - Loai bo',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'certified' => [],
                    'condemned' => [],
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

            // ══════════════════════════════════════════════════════════════
            // NEW LEAN MANUFACTURING WORKFLOWS
            // ══════════════════════════════════════════════════════════════

            // ── KAIZEN: A3 Problem Solving + PDCA (replaces simple IMP) ──
            'KAIZEN' => [
                'initial'  => 'identified',
                'terminal' => ['closed', 'yokoten_deployed'],
                'states'   => [
                    'identified', 'a3_background', 'a3_current_state',
                    'a3_root_cause', 'a3_countermeasures', 'implementation',
                    'check_results', 'standardize', 'yokoten_deploy',
                    'closed', 'yokoten_deployed',
                ],
                'transitions' => [
                    'identified' => [
                        'a3_background' => [
                            'label'    => 'Start A3: Define Background & Problem',
                            'label_vi' => 'Bat dau A3: Xac dinh boi canh & van de',
                            'roles'    => ['assignee', 'owner', 'quality_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'a3_background' => [
                        'a3_current_state' => [
                            'label'    => 'Document Current State (VSM/data)',
                            'label_vi' => 'Mo ta trang thai hien tai (VSM/du lieu)',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'a3_current_state' => [
                        'a3_root_cause' => [
                            'label'    => 'Root Cause Analysis (5 Why / Fishbone)',
                            'label_vi' => 'Phan tich nguyen nhan goc (5 Why / Fishbone)',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'a3_root_cause' => [
                        'a3_countermeasures' => [
                            'label'    => 'Define Countermeasures & Target',
                            'label_vi' => 'Xac dinh bien phap & muc tieu',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => ['set_due_date_14d'],
                            'requires' => ['has_root_cause'],
                        ],
                    ],
                    'a3_countermeasures' => [
                        'implementation' => [
                            'label'    => 'Approve & Implement (DO)',
                            'label_vi' => 'Phe duyet & Thuc hien (DO)',
                            'roles'    => ['production_director', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_30d', 'notify_owner'],
                            'requires' => ['has_action_plan'],
                        ],
                    ],
                    'implementation' => [
                        'check_results' => [
                            'label'    => 'CHECK: Measure Results vs Target',
                            'label_vi' => 'CHECK: Do ket qua so voi muc tieu',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'check_results' => [
                        'standardize' => [
                            'label'    => 'ACT: Standardize Success',
                            'label_vi' => 'ACT: Chuan hoa thanh cong',
                            'roles'    => ['assignee', 'owner', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => ['has_verification'],
                        ],
                        'a3_countermeasures' => [
                            'label'    => 'Results Not Met - Revise Countermeasures',
                            'label_vi' => 'Chua dat - Dieu chinh bien phap',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'standardize' => [
                        'closed' => [
                            'label'    => 'Close Kaizen (local only)',
                            'label_vi' => 'Dong Kaizen (chi noi bo)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                        'yokoten_deploy' => [
                            'label'    => 'Yokoten: Deploy Horizontally',
                            'label_vi' => 'Yokoten: Trien khai ngang',
                            'roles'    => ['qa_manager', 'production_director', 'admin'],
                            'actions'  => ['notify_production_director'],
                            'requires' => [],
                        ],
                    ],
                    'yokoten_deploy' => [
                        'yokoten_deployed' => [
                            'label'    => 'All Areas Deployed - Close',
                            'label_vi' => 'Tat ca khu vuc da trien khai - Dong',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                    'yokoten_deployed' => [],
                ],
            ],

            // ── QRQC: Quick Response Quality Control (Safran method) ──
            'QRQC' => [
                'initial'  => 'detected',
                'terminal' => ['closed'],
                'states'   => [
                    'detected', 'san_gen_shugi', 'immediate_reaction',
                    'root_cause_analysis', 'lesson_learned', 'closed',
                ],
                'transitions' => [
                    'detected' => [
                        'san_gen_shugi' => [
                            'label'    => 'Go See (Genba/Genbutsu/Genjitsu)',
                            'label_vi' => 'Di xem thuc te (Hien truong/Hien vat/Hien trang)',
                            'roles'    => ['shift_leader', 'quality_engineer', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'san_gen_shugi' => [
                        'immediate_reaction' => [
                            'label'    => 'Define Immediate Reaction (< 24h)',
                            'label_vi' => 'Xac dinh phan ung ngay (< 24h)',
                            'roles'    => ['shift_leader', 'quality_engineer', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                    ],
                    'immediate_reaction' => [
                        'root_cause_analysis' => [
                            'label'    => '5-Why + Ishikawa Analysis',
                            'label_vi' => 'Phan tich 5-Why + Ishikawa',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin', 'assignee'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'root_cause_analysis' => [
                        'lesson_learned' => [
                            'label'    => 'Document Lesson Learned',
                            'label_vi' => 'Ghi nhan bai hoc kinh nghiem',
                            'roles'    => ['quality_engineer', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => ['has_root_cause'],
                        ],
                    ],
                    'lesson_learned' => [
                        'closed' => [
                            'label'    => 'Close QRQC',
                            'label_vi' => 'Dong QRQC',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            // ── ANDON: Digital Escalation System ──
            'ANDON' => [
                'initial'  => 'triggered',
                'terminal' => ['resolved'],
                'states'   => [
                    'triggered', 'team_lead_responding', 'supervisor_escalated',
                    'management_escalated', 'resolved',
                ],
                'transitions' => [
                    'triggered' => [
                        'team_lead_responding' => [
                            'label'    => 'Team Lead Response (5 min SLA)',
                            'label_vi' => 'To truong xu ly (SLA 5 phut)',
                            'roles'    => ['shift_leader', 'setup_technician', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'team_lead_responding' => [
                        'resolved' => [
                            'label'    => 'Issue Resolved',
                            'label_vi' => 'Van de da giai quyet',
                            'roles'    => ['shift_leader', 'setup_technician', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'supervisor_escalated' => [
                            'label'    => 'Escalate to Supervisor (15 min)',
                            'label_vi' => 'Chuyen len giam sat vien (15 phut)',
                            'roles'    => ['shift_leader', 'admin'],
                            'actions'  => ['notify_production_director'],
                            'requires' => [],
                        ],
                    ],
                    'supervisor_escalated' => [
                        'resolved' => [
                            'label'    => 'Issue Resolved',
                            'label_vi' => 'Van de da giai quyet',
                            'roles'    => ['cnc_workshop_manager', 'production_director', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'management_escalated' => [
                            'label'    => 'Escalate to Management (30 min)',
                            'label_vi' => 'Chuyen len quan ly (30 phut)',
                            'roles'    => ['cnc_workshop_manager', 'admin'],
                            'actions'  => ['notify_production_director'],
                            'requires' => [],
                        ],
                    ],
                    'management_escalated' => [
                        'resolved' => [
                            'label'    => 'Issue Resolved by Management',
                            'label_vi' => 'Quan ly da giai quyet',
                            'roles'    => ['production_director', 'ceo', 'admin'],
                            'actions'  => ['clear_due_date'],
                            'requires' => [],
                        ],
                    ],
                    'resolved' => [],
                ],
            ],

            // ── 5S_AUDIT: Digital 5S Workplace Audit ──
            'FIVE_S' => [
                'initial'  => 'scheduled',
                'terminal' => ['closed'],
                'states'   => [
                    'scheduled', 'in_progress', 'scored', 'action_required',
                    'actions_completed', 'closed',
                ],
                'transitions' => [
                    'scheduled' => [
                        'in_progress' => [
                            'label'    => 'Start 5S Audit',
                            'label_vi' => 'Bat dau danh gia 5S',
                            'roles'    => ['shift_leader', 'qms_engineer', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'in_progress' => [
                        'scored' => [
                            'label'    => 'Submit Scores (Sort/Set/Shine/Standardize/Sustain)',
                            'label_vi' => 'Nop diem (Sang loc/Sap xep/Sach se/San sang/San sang)',
                            'roles'    => ['shift_leader', 'qms_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'scored' => [
                        'closed' => [
                            'label'    => 'Score >= 80% -- Close (no actions needed)',
                            'label_vi' => 'Diem >= 80% -- Dong (khong can hanh dong)',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                        'action_required' => [
                            'label'    => 'Score < 80% -- Corrective Actions Required',
                            'label_vi' => 'Diem < 80% -- Yeu cau hanh dong khac phuc',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['set_due_date_7d', 'notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'action_required' => [
                        'actions_completed' => [
                            'label'    => 'Actions Completed - Submit for Verification',
                            'label_vi' => 'Hanh dong hoan thanh - Gui xac minh',
                            'roles'    => ['shift_leader', 'assignee', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'actions_completed' => [
                        'closed' => [
                            'label'    => 'Verify & Close',
                            'label_vi' => 'Xac minh & Dong',
                            'roles'    => ['qa_manager', 'qms_engineer', 'admin'],
                            'actions'  => ['clear_due_date'],
                            'requires' => [],
                        ],
                        'action_required' => [
                            'label'    => 'Verification Failed - Redo Actions',
                            'label_vi' => 'Xac minh khong dat - Lam lai hanh dong',
                            'roles'    => ['qa_manager', 'admin'],
                            'actions'  => ['notify_owner'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            // ── GEMBA: Digital Gemba Walk ──
            'GEMBA' => [
                'initial'  => 'planned',
                'terminal' => ['closed'],
                'states'   => [
                    'planned', 'walking', 'observations_logged',
                    'actions_assigned', 'follow_up', 'closed',
                ],
                'transitions' => [
                    'planned' => [
                        'walking' => [
                            'label'    => 'Start Gemba Walk',
                            'label_vi' => 'Bat dau di thuc te',
                            'roles'    => ['production_director', 'qa_manager', 'cnc_workshop_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'walking' => [
                        'observations_logged' => [
                            'label'    => 'Log Observations (Safety/Quality/5S/Flow)',
                            'label_vi' => 'Ghi nhan quan sat (An toan/Chat luong/5S/Dong chay)',
                            'roles'    => ['production_director', 'qa_manager', 'cnc_workshop_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'observations_logged' => [
                        'actions_assigned' => [
                            'label'    => 'Assign Actions to Responsible Persons',
                            'label_vi' => 'Giao hanh dong cho nguoi phu trach',
                            'roles'    => ['production_director', 'qa_manager', 'admin'],
                            'actions'  => ['set_due_date_7d'],
                            'requires' => [],
                        ],
                        'closed' => [
                            'label'    => 'No Actions Needed - Close',
                            'label_vi' => 'Khong can hanh dong - Dong',
                            'roles'    => ['production_director', 'qa_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'actions_assigned' => [
                        'follow_up' => [
                            'label'    => 'Actions Completed - Follow Up',
                            'label_vi' => 'Hanh dong hoan thanh - Theo doi',
                            'roles'    => ['assignee', 'owner', 'admin'],
                            'actions'  => ['notify_approver'],
                            'requires' => [],
                        ],
                    ],
                    'follow_up' => [
                        'closed' => [
                            'label'    => 'Verify & Close Gemba',
                            'label_vi' => 'Xac minh & Dong Gemba',
                            'roles'    => ['production_director', 'qa_manager', 'admin'],
                            'actions'  => ['clear_due_date'],
                            'requires' => [],
                        ],
                    ],
                    'closed' => [],
                ],
            ],

            // ── SMED: Setup Reduction Workflow ──
            'SMED' => [
                'initial'  => 'baseline_recorded',
                'terminal' => ['standardized'],
                'states'   => [
                    'baseline_recorded', 'internal_external_separated',
                    'internal_converted', 'streamlined', 'trial_run',
                    'standardized',
                ],
                'transitions' => [
                    'baseline_recorded' => [
                        'internal_external_separated' => [
                            'label'    => 'Step 1: Separate Internal vs External Tasks',
                            'label_vi' => 'Buoc 1: Tach cong viec Ben trong vs Ben ngoai',
                            'roles'    => ['process_engineer', 'cnc_workshop_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'internal_external_separated' => [
                        'internal_converted' => [
                            'label'    => 'Step 2: Convert Internal to External',
                            'label_vi' => 'Buoc 2: Chuyen Ben trong thanh Ben ngoai',
                            'roles'    => ['process_engineer', 'cnc_workshop_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'internal_converted' => [
                        'streamlined' => [
                            'label'    => 'Step 3: Streamline Remaining Internal',
                            'label_vi' => 'Buoc 3: Tinh gon cong viec Ben trong con lai',
                            'roles'    => ['process_engineer', 'cnc_workshop_manager', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'streamlined' => [
                        'trial_run' => [
                            'label'    => 'Step 4: Trial Run (verify time reduction)',
                            'label_vi' => 'Buoc 4: Chay thu (xac nhan giam thoi gian)',
                            'roles'    => ['process_engineer', 'setup_technician', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'trial_run' => [
                        'standardized' => [
                            'label'    => 'Step 5: Standardize & Train Operators',
                            'label_vi' => 'Buoc 5: Chuan hoa & Dao tao operator',
                            'roles'    => ['cnc_workshop_manager', 'qa_manager', 'admin'],
                            'actions'  => ['notify_owner', 'clear_due_date'],
                            'requires' => ['has_verification'],
                        ],
                        'streamlined' => [
                            'label'    => 'Trial Failed - Revise Streamlining',
                            'label_vi' => 'Chay thu khong dat - Chinh sua lai',
                            'roles'    => ['process_engineer', 'admin'],
                            'actions'  => [],
                            'requires' => [],
                        ],
                    ],
                    'standardized' => [],
                ],
            ],
        ];
    }

    // ── Step Data Requirements (links workflow transitions to DB tables) ────

    /**
     * Get required data fields for a workflow state transition.
     * Maps each workflow type + target state to structured data fields
     * that MUST be captured and persisted to the corresponding DB table.
     *
     * @param string $recordType Workflow type code (NCR, CAPA, FAI, etc.)
     * @param string $targetState Target state of the transition.
     * @return array{table: string, required_fields: array, optional_fields: array, attachments: array}
     */
    public function getStepDataRequirements(string $recordType, string $targetState): array
    {
        $requirements = $this->buildStepDataRequirements();
        $key = strtoupper($recordType) . '::' . $targetState;
        return $requirements[$key] ?? [
            'table'           => 'workflow_step_data',
            'required_fields' => [],
            'optional_fields' => [],
            'attachments'     => [],
        ];
    }

    /**
     * Validate that all required step data is present before transition.
     *
     * @param string $recordType Workflow type code.
     * @param string $targetState Target state.
     * @param array  $data Data provided by the user.
     * @return array{ok: bool, missing: array}
     */
    public function validateStepData(string $recordType, string $targetState, array $data): array
    {
        $reqs = $this->getStepDataRequirements($recordType, $targetState);
        $missing = [];

        foreach ($reqs['required_fields'] as $field => $fieldDef) {
            $value = $data[$field] ?? null;
            if ($value === null || $value === '' || (is_array($value) && empty($value))) {
                $missing[] = [
                    'field'    => $field,
                    'label'    => $fieldDef['label'] ?? $field,
                    'label_vi' => $fieldDef['label_vi'] ?? $field,
                    'type'     => $fieldDef['type'] ?? 'text',
                ];
            }
        }

        return ['ok' => empty($missing), 'missing' => $missing, 'table' => $reqs['table']];
    }

    /**
     * Build the step data requirements map.
     * Key format: "RECORD_TYPE::target_state"
     */
    private function buildStepDataRequirements(): array
    {
        return [
            // ── NCR Steps ──
            'NCR::containment' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'containment_action'  => ['label' => 'Containment Action', 'label_vi' => 'Hanh dong kiem soat', 'type' => 'text'],
                    'quarantine_location' => ['label' => 'Quarantine Location', 'label_vi' => 'Vi tri cach ly', 'type' => 'text'],
                    'quantity_affected'   => ['label' => 'Quantity Affected', 'label_vi' => 'So luong anh huong', 'type' => 'integer'],
                ],
                'optional_fields' => ['suspect_stock_checked'],
                'attachments' => ['evidence_photos'],
            ],
            'NCR::investigation' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'root_cause'        => ['label' => 'Root Cause', 'label_vi' => 'Nguyen nhan goc', 'type' => 'text'],
                    'root_cause_method' => ['label' => 'RCA Method', 'label_vi' => 'Phuong phap RCA', 'type' => 'select'],
                ],
                'optional_fields' => ['human_factors'],
                'attachments' => ['investigation_evidence'],
            ],
            'NCR::mrb_review' => [
                'table' => 'ncr_mrb_decisions',
                'required_fields' => [
                    'mrb_members'               => ['label' => 'MRB Members', 'label_vi' => 'Thanh vien MRB', 'type' => 'user_list'],
                    'engineering_justification' => ['label' => 'Engineering Justification', 'label_vi' => 'Giai trinh ky thuat', 'type' => 'text'],
                ],
                'optional_fields' => ['risk_assessment', 'customer_concession_required'],
                'attachments' => [],
            ],
            'NCR::disposition' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'disposition' => ['label' => 'Disposition', 'label_vi' => 'Xu ly', 'type' => 'select'],
                ],
                'optional_fields' => ['rework_instruction', 'cost_impact'],
                'attachments' => [],
            ],
            // ── CAPA Steps ──
            'CAPA::containment' => [
                'table' => 'capa_8d_steps',
                'required_fields' => [
                    'containment_actions' => ['label' => 'D3: Interim Containment', 'label_vi' => 'D3: Kiem soat tam thoi', 'type' => 'json_array'],
                ],
                'optional_fields' => ['customer_notified'],
                'attachments' => [],
            ],
            'CAPA::root_cause' => [
                'table' => 'capa_8d_steps',
                'required_fields' => [
                    'root_cause_description' => ['label' => 'D4: Root Cause', 'label_vi' => 'D4: Nguyen nhan goc', 'type' => 'text'],
                    'root_cause_method'      => ['label' => 'RCA Method', 'label_vi' => 'Phuong phap', 'type' => 'select'],
                    'escape_point'           => ['label' => 'Escape Point', 'label_vi' => 'Diem thoat', 'type' => 'text'],
                ],
                'optional_fields' => ['human_factors'],
                'attachments' => ['rca_evidence'],
            ],
            'CAPA::action_plan' => [
                'table' => 'capa_8d_steps',
                'required_fields' => [
                    'corrective_actions' => ['label' => 'D5: Corrective Actions', 'label_vi' => 'D5: Hanh dong khac phuc', 'type' => 'json_array'],
                ],
                'optional_fields' => ['risk_of_unintended_effects'],
                'attachments' => [],
            ],
            'CAPA::verification' => [
                'table' => 'capa_8d_steps',
                'required_fields' => [
                    'systemic_actions'     => ['label' => 'D7: Prevent Recurrence', 'label_vi' => 'D7: Ngan ngua tai phat', 'type' => 'text'],
                    'lessons_learned'      => ['label' => 'Lessons Learned', 'label_vi' => 'Bai hoc kinh nghiem', 'type' => 'text'],
                    'fmea_updated'         => ['label' => 'FMEA Updated?', 'label_vi' => 'FMEA da cap nhat?', 'type' => 'boolean'],
                    'control_plan_updated' => ['label' => 'Control Plan Updated?', 'label_vi' => 'Control Plan da cap nhat?', 'type' => 'boolean'],
                ],
                'optional_fields' => ['horizontal_deployment'],
                'attachments' => ['implementation_evidence'],
            ],
            // ── FAI Steps ──
            'FAI::form1_part_accountability' => [
                'table' => 'fai_records',
                'required_fields' => [
                    'part_number'    => ['label' => 'Part Number', 'label_vi' => 'Ma chi tiet', 'type' => 'text'],
                    'drawing_number' => ['label' => 'Drawing Number', 'label_vi' => 'So ban ve', 'type' => 'text'],
                    'serial_number'  => ['label' => 'Serial Number', 'label_vi' => 'So serial', 'type' => 'text'],
                ],
                'optional_fields' => ['sub_parts'],
                'attachments' => ['balloon_drawing'],
            ],
            'FAI::form2_material_process' => [
                'table' => 'fai_records',
                'required_fields' => [
                    'materials'         => ['label' => 'Material Specifications', 'label_vi' => 'Thong so vat lieu', 'type' => 'json_array'],
                    'special_processes' => ['label' => 'Special Processes', 'label_vi' => 'Quy trinh dac biet', 'type' => 'json_array'],
                ],
                'optional_fields' => ['functional_tests'],
                'attachments' => ['material_certificates'],
            ],
            'FAI::form3_characteristics' => [
                'table' => 'fai_characteristics',
                'required_fields' => [
                    'characteristics' => ['label' => 'Measurements', 'label_vi' => 'Do luong', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => ['cmm_report'],
            ],
            // ── CAL Steps ──
            'CAL::as_found_fail' => [
                'table' => 'calibration_records',
                'required_fields' => [
                    'as_found_readings' => ['label' => 'As-Found Readings', 'label_vi' => 'Ket qua ban dau', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => ['calibration_certificate'],
            ],
            'CAL::oot_investigation' => [
                'table' => 'calibration_oot_investigations',
                'required_fields' => [
                    'oot_parameter'   => ['label' => 'OOT Parameter', 'label_vi' => 'Thong so vuot', 'type' => 'text'],
                    'oot_magnitude'   => ['label' => 'OOT Magnitude', 'label_vi' => 'Muc do vuot', 'type' => 'number'],
                    'risk_assessment' => ['label' => 'Risk Assessment', 'label_vi' => 'Danh gia rui ro', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'CAL::impact_assessment' => [
                'table' => 'calibration_oot_investigations',
                'required_fields' => [
                    'affected_work_orders'  => ['label' => 'Affected WOs', 'label_vi' => 'WO anh huong', 'type' => 'json_array'],
                    'product_disposition'   => ['label' => 'Product Disposition', 'label_vi' => 'Xu ly san pham', 'type' => 'text'],
                ],
                'optional_fields' => ['recall_required'],
                'attachments' => [],
            ],
            // ── Lean: KAIZEN ──
            'KAIZEN::a3_current_state' => [
                'table' => 'lean_kaizen_events',
                'required_fields' => [
                    'a3_current_condition'  => ['label' => 'Current Condition', 'label_vi' => 'Trang thai hien tai', 'type' => 'text'],
                    'metric_baseline_value' => ['label' => 'Baseline Value', 'label_vi' => 'Gia tri co so', 'type' => 'number'],
                ],
                'optional_fields' => ['vsm_before_lead_time'],
                'attachments' => ['vsm_map'],
            ],
            'KAIZEN::check_results' => [
                'table' => 'lean_kaizen_events',
                'required_fields' => [
                    'metric_actual_value'  => ['label' => 'Actual Value (after)', 'label_vi' => 'Gia tri thuc te', 'type' => 'number'],
                    'a3_follow_up_results' => ['label' => 'Follow-up Results', 'label_vi' => 'Ket qua theo doi', 'type' => 'text'],
                ],
                'optional_fields' => ['cost_savings'],
                'attachments' => ['results_evidence'],
            ],
            // ── Lean: QRQC ──
            'QRQC::san_gen_shugi' => [
                'table' => 'lean_qrqc_events',
                'required_fields' => [
                    'real_part_verified'  => ['label' => 'Real Part Verified', 'label_vi' => 'Xac nhan hien vat', 'type' => 'boolean'],
                    'real_place_verified' => ['label' => 'Real Place Verified', 'label_vi' => 'Xac nhan hien truong', 'type' => 'boolean'],
                    'real_data_collected' => ['label' => 'Real Data Collected', 'label_vi' => 'Thu thap du lieu thuc', 'type' => 'boolean'],
                ],
                'optional_fields' => [],
                'attachments' => ['defect_photos'],
            ],
            // ── Lean: 5S ──
            'FIVE_S::scored' => [
                'table' => 'lean_5s_audits',
                'required_fields' => [
                    'sort_score'         => ['label' => 'Sort', 'label_vi' => 'Sang loc', 'type' => 'decimal'],
                    'set_in_order_score' => ['label' => 'Set in Order', 'label_vi' => 'Sap xep', 'type' => 'decimal'],
                    'shine_score'        => ['label' => 'Shine', 'label_vi' => 'Sach se', 'type' => 'decimal'],
                    'standardize_score'  => ['label' => 'Standardize', 'label_vi' => 'Chuan hoa', 'type' => 'decimal'],
                    'sustain_score'      => ['label' => 'Sustain', 'label_vi' => 'Duy tri', 'type' => 'decimal'],
                ],
                'optional_fields' => ['safety_score'],
                'attachments' => ['audit_photos'],
            ],
            // ── Lean: ANDON ──
            'ANDON::resolved' => [
                'table' => 'lean_andon_events',
                'required_fields' => [
                    'resolution_description' => ['label' => 'Resolution', 'label_vi' => 'Giai phap', 'type' => 'text'],
                    'response_time_sec'      => ['label' => 'Response Time (sec)', 'label_vi' => 'Thoi gian phan hoi', 'type' => 'integer'],
                    'resolution_time_sec'    => ['label' => 'Resolution Time (sec)', 'label_vi' => 'Thoi gian giai quyet', 'type' => 'integer'],
                ],
                'optional_fields' => ['root_cause_code'],
                'attachments' => [],
            ],
            // ── Lean: SMED ──
            'SMED::trial_run' => [
                'table' => 'lean_smed_events',
                'required_fields' => [
                    'trial_setup_time_min' => ['label' => 'Trial Setup Time', 'label_vi' => 'Thoi gian setup thu', 'type' => 'decimal'],
                ],
                'optional_fields' => ['trial_internal_min', 'trial_external_min'],
                'attachments' => ['trial_video'],
            ],
            // ── AUD (Audit) Steps ──
            'AUD::in_progress' => [
                'table' => 'audits',
                'required_fields' => [
                    'audit_scope' => ['label' => 'Audit Scope', 'label_vi' => 'Pham vi danh gia', 'type' => 'text'],
                    'audit_team' => ['label' => 'Audit Team', 'label_vi' => 'Doi danh gia', 'type' => 'json_array'],
                ],
                'optional_fields' => ['audit_plan_ref'],
                'attachments' => ['audit_plan'],
            ],
            'AUD::reporting' => [
                'table' => 'audit_findings',
                'required_fields' => [
                    'findings' => ['label' => 'Audit Findings', 'label_vi' => 'Phat hien danh gia', 'type' => 'json_array'],
                    'audit_score' => ['label' => 'Audit Score', 'label_vi' => 'Diem danh gia', 'type' => 'number'],
                ],
                'optional_fields' => ['observations', 'opportunities_for_improvement'],
                'attachments' => ['audit_evidence'],
            ],
            'AUD::follow_up' => [
                'table' => 'audit_actions',
                'required_fields' => [
                    'action_items' => ['label' => 'Corrective Action Items', 'label_vi' => 'Hang muc hanh dong khac phuc', 'type' => 'json_array'],
                ],
                'optional_fields' => ['linked_capa_ids'],
                'attachments' => [],
            ],
            'AUD::closed' => [
                'table' => 'audits',
                'required_fields' => [
                    'audit_conclusion' => ['label' => 'Audit Conclusion', 'label_vi' => 'Ket luan danh gia', 'type' => 'select'],
                ],
                'optional_fields' => ['next_audit_date'],
                'attachments' => ['final_report'],
            ],
            // ── TRN (Training) Steps ──
            'TRN::in_progress' => [
                'table' => 'training_records',
                'required_fields' => [
                    'training_topic' => ['label' => 'Training Topic', 'label_vi' => 'Chu de dao tao', 'type' => 'text'],
                    'trainer' => ['label' => 'Trainer', 'label_vi' => 'Nguoi dao tao', 'type' => 'text'],
                    'training_hours' => ['label' => 'Training Hours', 'label_vi' => 'So gio dao tao', 'type' => 'number'],
                ],
                'optional_fields' => ['training_materials'],
                'attachments' => ['training_materials', 'attendance_sheet'],
            ],
            'TRN::assessment' => [
                'table' => 'training_records',
                'required_fields' => [
                    'assessment_method' => ['label' => 'Assessment Method', 'label_vi' => 'Phuong phap danh gia', 'type' => 'select'],
                    'assessment_score' => ['label' => 'Score', 'label_vi' => 'Diem', 'type' => 'number'],
                    'assessment_result' => ['label' => 'Result (Pass/Fail)', 'label_vi' => 'Ket qua (Dat/Khong dat)', 'type' => 'select'],
                ],
                'optional_fields' => ['competence_level'],
                'attachments' => ['assessment_evidence'],
            ],
            'TRN::certified' => [
                'table' => 'training_records',
                'required_fields' => [
                    'certification_expiry' => ['label' => 'Certification Expiry', 'label_vi' => 'Han chung nhan', 'type' => 'date'],
                ],
                'optional_fields' => ['certificate_number'],
                'attachments' => ['certificate'],
            ],
            // ── ECR (Engineering Change Request) Steps ──
            'ECR::review' => [
                'table' => 'engineering_change_requests',
                'required_fields' => [
                    'change_description' => ['label' => 'Change Description', 'label_vi' => 'Mo ta thay doi', 'type' => 'text'],
                    'impact_assessment' => ['label' => 'Impact Assessment', 'label_vi' => 'Danh gia tac dong', 'type' => 'text'],
                    'affected_documents' => ['label' => 'Affected Documents', 'label_vi' => 'Tai lieu anh huong', 'type' => 'json_array'],
                ],
                'optional_fields' => ['revision_from', 'revision_to'],
                'attachments' => ['redline_drawing'],
            ],
            'ECR::approved' => [
                'table' => 'engineering_change_requests',
                'required_fields' => [
                    'approval_justification' => ['label' => 'Approval Justification', 'label_vi' => 'Ly do phe duyet', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'ECR::implemented' => [
                'table' => 'engineering_change_requests',
                'required_fields' => [
                    'implementation_evidence' => ['label' => 'Implementation Evidence', 'label_vi' => 'Bang chung thuc hien', 'type' => 'text'],
                    'documents_updated' => ['label' => 'Documents Updated', 'label_vi' => 'Tai lieu da cap nhat', 'type' => 'json_array'],
                ],
                'optional_fields' => ['cam_program_id', 'baseline_version'],
                'attachments' => ['updated_drawings'],
            ],
            'ECR::verified' => [
                'table' => 'engineering_change_requests',
                'required_fields' => [
                    'verification_result' => ['label' => 'Verification Result', 'label_vi' => 'Ket qua xac minh', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => ['verification_evidence'],
            ],
            // ── SCAR (WorkflowEngine version) Steps ──
            'SCAR::response_due' => [
                'table' => 'supplier_scorecards',
                'required_fields' => [
                    'supplier_contact' => ['label' => 'Supplier Contact Notified', 'label_vi' => 'Lien he NCC da thong bao', 'type' => 'text'],
                    'response_deadline' => ['label' => 'Response Deadline', 'label_vi' => 'Han phan hoi', 'type' => 'date'],
                ],
                'optional_fields' => [],
                'attachments' => ['scar_letter'],
            ],
            'SCAR::response_received' => [
                'table' => 'supplier_scorecards',
                'required_fields' => [
                    'supplier_root_cause' => ['label' => 'Supplier Root Cause', 'label_vi' => 'Nguyen nhan goc NCC', 'type' => 'text'],
                    'supplier_corrective_action' => ['label' => 'Supplier Corrective Action', 'label_vi' => 'Hanh dong khac phuc NCC', 'type' => 'text'],
                ],
                'optional_fields' => ['supplier_preventive_action'],
                'attachments' => ['supplier_response_document'],
            ],
            'SCAR::verification' => [
                'table' => 'supplier_scorecards',
                'required_fields' => [
                    'verification_method' => ['label' => 'Verification Method', 'label_vi' => 'Phuong phap xac minh', 'type' => 'select'],
                    'verification_result' => ['label' => 'Verification Result', 'label_vi' => 'Ket qua xac minh', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => ['verification_evidence'],
            ],
            // ── RISK Steps ──
            'RISK::assessed' => [
                'table' => 'risk_register',
                'required_fields' => [
                    'likelihood' => ['label' => 'Likelihood (1-5)', 'label_vi' => 'Kha nang xay ra (1-5)', 'type' => 'integer'],
                    'impact' => ['label' => 'Impact (1-5)', 'label_vi' => 'Muc do tac dong (1-5)', 'type' => 'integer'],
                    'risk_description' => ['label' => 'Risk Description', 'label_vi' => 'Mo ta rui ro', 'type' => 'text'],
                ],
                'optional_fields' => ['risk_category'],
                'attachments' => [],
            ],
            'RISK::mitigated' => [
                'table' => 'risk_register',
                'required_fields' => [
                    'mitigation_action' => ['label' => 'Mitigation Action', 'label_vi' => 'Hanh dong giam thieu', 'type' => 'text'],
                    'residual_likelihood' => ['label' => 'Residual Likelihood', 'label_vi' => 'Kha nang con lai', 'type' => 'integer'],
                    'residual_impact' => ['label' => 'Residual Impact', 'label_vi' => 'Tac dong con lai', 'type' => 'integer'],
                ],
                'optional_fields' => [],
                'attachments' => ['mitigation_evidence'],
            ],
            'RISK::monitored' => [
                'table' => 'risk_register',
                'required_fields' => [
                    'monitoring_frequency' => ['label' => 'Monitoring Frequency', 'label_vi' => 'Tan suat giam sat', 'type' => 'select'],
                    'last_review_date' => ['label' => 'Last Review Date', 'label_vi' => 'Ngay xem xet gan nhat', 'type' => 'date'],
                ],
                'optional_fields' => ['risk_trend'],
                'attachments' => [],
            ],
            // ── IMP (Improvement/PDCA) Steps ──
            'IMP::approved' => [
                'table' => 'improvement_projects',
                'required_fields' => [
                    'project_title' => ['label' => 'Project Title', 'label_vi' => 'Ten du an', 'type' => 'text'],
                    'target_kpi' => ['label' => 'Target KPI', 'label_vi' => 'KPI muc tieu', 'type' => 'text'],
                    'baseline_value' => ['label' => 'Baseline Value', 'label_vi' => 'Gia tri co so', 'type' => 'number'],
                    'target_value' => ['label' => 'Target Value', 'label_vi' => 'Gia tri muc tieu', 'type' => 'number'],
                ],
                'optional_fields' => ['sponsor'],
                'attachments' => ['project_charter'],
            ],
            'IMP::pdca_do' => [
                'table' => 'improvement_projects',
                'required_fields' => [
                    'do_actions' => ['label' => 'DO Phase Actions', 'label_vi' => 'Hanh dong giai doan DO', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'IMP::pdca_check' => [
                'table' => 'improvement_projects',
                'required_fields' => [
                    'check_results' => ['label' => 'CHECK Results vs Target', 'label_vi' => 'Ket qua CHECK so voi muc tieu', 'type' => 'text'],
                    'actual_value' => ['label' => 'Actual KPI Value', 'label_vi' => 'Gia tri KPI thuc te', 'type' => 'number'],
                ],
                'optional_fields' => [],
                'attachments' => ['results_data'],
            ],
            'IMP::pdca_act' => [
                'table' => 'improvement_projects',
                'required_fields' => [
                    'standardize_or_revise' => ['label' => 'ACT: Standardize or Revise?', 'label_vi' => 'ACT: Chuan hoa hay Dieu chinh?', 'type' => 'select'],
                    'act_actions' => ['label' => 'ACT Phase Actions', 'label_vi' => 'Hanh dong giai doan ACT', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            // ── MR (Management Review) Steps ──
            'MR::in_progress' => [
                'table' => 'management_reviews',
                'required_fields' => [
                    'attendees' => ['label' => 'Attendees', 'label_vi' => 'Nguoi tham du', 'type' => 'json_array'],
                    'agenda_items' => ['label' => 'Agenda Items', 'label_vi' => 'Noi dung chuong trinh', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'MR::minutes_drafted' => [
                'table' => 'management_reviews',
                'required_fields' => [
                    'minutes_text' => ['label' => 'Meeting Minutes', 'label_vi' => 'Bien ban hop', 'type' => 'text'],
                    'action_items' => ['label' => 'Action Items', 'label_vi' => 'Hang muc hanh dong', 'type' => 'json_array'],
                ],
                'optional_fields' => ['next_review_date'],
                'attachments' => ['minutes_document'],
            ],
            // ── GEMBA Walk Steps ──
            'GEMBA::walking' => [
                'table' => 'lean_gemba_walks',
                'required_fields' => [
                    'areas_visited' => ['label' => 'Areas Visited', 'label_vi' => 'Khu vuc da di', 'type' => 'json_array'],
                ],
                'optional_fields' => ['theme_focus'],
                'attachments' => [],
            ],
            'GEMBA::observations_logged' => [
                'table' => 'lean_gemba_walks',
                'required_fields' => [
                    'observations' => ['label' => 'Observations (Safety/Quality/5S/Flow)', 'label_vi' => 'Quan sat (An toan/Chat luong/5S/Dong chay)', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => ['observation_photos'],
            ],
            'GEMBA::actions_assigned' => [
                'table' => 'lean_gemba_walks',
                'required_fields' => [
                    'actions_assigned' => ['label' => 'Actions Assigned', 'label_vi' => 'Hanh dong da giao', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            // ── SMED Steps ──
            'SMED::internal_external_separated' => [
                'table' => 'lean_smed_events',
                'required_fields' => [
                    'internal_tasks' => ['label' => 'Internal Tasks (machine stopped)', 'label_vi' => 'Cong viec Ben trong (may dung)', 'type' => 'json_array'],
                    'external_tasks' => ['label' => 'External Tasks (machine running)', 'label_vi' => 'Cong viec Ben ngoai (may chay)', 'type' => 'json_array'],
                ],
                'optional_fields' => [],
                'attachments' => ['video_recording'],
            ],
            'SMED::streamlined' => [
                'table' => 'lean_smed_events',
                'required_fields' => [
                    'streamlining_actions' => ['label' => 'Streamlining Actions', 'label_vi' => 'Bien phap tinh gon', 'type' => 'json_array'],
                ],
                'optional_fields' => ['quick_change_fixtures'],
                'attachments' => [],
            ],
            'SMED::standardized' => [
                'table' => 'lean_smed_events',
                'required_fields' => [
                    'final_setup_time_min' => ['label' => 'Final Setup Time (min)', 'label_vi' => 'Thoi gian setup cuoi (phut)', 'type' => 'decimal'],
                    'standard_work_created' => ['label' => 'Standard Work Created?', 'label_vi' => 'Da tao tieu chuan?', 'type' => 'boolean'],
                ],
                'optional_fields' => ['operators_trained'],
                'attachments' => ['standard_work_document'],
            ],
            // ── Additional NCR sub-states ──
            'NCR::segregated' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'segregation_location' => ['label' => 'Segregation Location', 'label_vi' => 'Vi tri cach ly', 'type' => 'text'],
                    'segregation_method' => ['label' => 'Segregation Method', 'label_vi' => 'Phuong phap cach ly', 'type' => 'select'],
                ],
                'optional_fields' => [],
                'attachments' => ['segregation_photos'],
            ],
            'NCR::rework_in_progress' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'rework_instruction' => ['label' => 'Rework Instruction', 'label_vi' => 'Huong dan lam lai', 'type' => 'text'],
                    'rework_operator' => ['label' => 'Rework Operator', 'label_vi' => 'Nguoi lam lai', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'NCR::reinspection' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'reinspection_result' => ['label' => 'Reinspection Result', 'label_vi' => 'Ket qua kiem tra lai', 'type' => 'select'],
                ],
                'optional_fields' => ['reinspection_data'],
                'attachments' => ['reinspection_report'],
            ],
            // ── Additional CAPA effectiveness sub-states ──
            'CAPA::effectiveness_30d' => [
                'table' => 'capa_effectiveness_checks',
                'required_fields' => [
                    'check_method' => ['label' => 'Verification Method', 'label_vi' => 'Phuong phap xac minh', 'type' => 'select'],
                    'recurrence_check' => ['label' => 'Recurrence Found?', 'label_vi' => 'Co tai phat?', 'type' => 'boolean'],
                    'check_result' => ['label' => '30-day Result', 'label_vi' => 'Ket qua 30 ngay', 'type' => 'select'],
                ],
                'optional_fields' => ['spc_within_limits', 'sample_size'],
                'attachments' => ['effectiveness_evidence'],
            ],
            'CAPA::effectiveness_60d' => [
                'table' => 'capa_effectiveness_checks',
                'required_fields' => [
                    'check_method' => ['label' => 'Verification Method', 'label_vi' => 'Phuong phap xac minh', 'type' => 'select'],
                    'recurrence_check' => ['label' => 'Recurrence Found?', 'label_vi' => 'Co tai phat?', 'type' => 'boolean'],
                    'check_result' => ['label' => '60-day Result', 'label_vi' => 'Ket qua 60 ngay', 'type' => 'select'],
                ],
                'optional_fields' => ['spc_within_limits'],
                'attachments' => ['effectiveness_evidence'],
            ],
            'CAPA::effectiveness_90d' => [
                'table' => 'capa_effectiveness_checks',
                'required_fields' => [
                    'check_method' => ['label' => 'Verification Method', 'label_vi' => 'Phuong phap xac minh', 'type' => 'select'],
                    'recurrence_check' => ['label' => 'Recurrence Found?', 'label_vi' => 'Co tai phat?', 'type' => 'boolean'],
                    'check_result' => ['label' => '90-day Result', 'label_vi' => 'Ket qua 90 ngay', 'type' => 'select'],
                    'closure_summary' => ['label' => 'D8: Closure Summary', 'label_vi' => 'D8: Tom tat dong', 'type' => 'text'],
                ],
                'optional_fields' => ['team_recognition'],
                'attachments' => ['final_effectiveness_report'],
            ],
            // ── Additional CAL sub-states ──
            'CAL::as_found_pass' => [
                'table' => 'calibration_records',
                'required_fields' => [
                    'as_found_readings' => ['label' => 'As-Found Readings', 'label_vi' => 'Ket qua ban dau', 'type' => 'json_array'],
                ],
                'optional_fields' => ['measurement_uncertainty'],
                'attachments' => ['calibration_certificate'],
            ],
            'CAL::adjustment' => [
                'table' => 'calibration_records',
                'required_fields' => [
                    'adjustments_made' => ['label' => 'Adjustments Made', 'label_vi' => 'Dieu chinh da thuc hien', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
            'CAL::as_left_verification' => [
                'table' => 'calibration_records',
                'required_fields' => [
                    'as_left_readings' => ['label' => 'As-Left Readings', 'label_vi' => 'Ket qua sau dieu chinh', 'type' => 'json_array'],
                    'as_left_in_tolerance' => ['label' => 'As-Left In Tolerance?', 'label_vi' => 'Sau dieu chinh trong dung sai?', 'type' => 'boolean'],
                ],
                'optional_fields' => ['measurement_uncertainty'],
                'attachments' => ['as_left_certificate'],
            ],
        ];
    }
}
