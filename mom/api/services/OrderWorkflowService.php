<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Services\ChangeControl\ChangeAuthorityService;
use RuntimeException;

require_once __DIR__ . '/ChangeControl/ChangeAuthorityService.php';

/**
 * Result object for status-transition operations.
 */
final class OrderTransitionResult
{
    public function __construct(
        public readonly bool    $ok,
        public readonly string  $message,
        public readonly ?array  $data = null,
        public readonly ?string $errorCode = null,
    ) {}

    public function toArray(): array
    {
        return array_filter([
            'ok'         => $this->ok,
            'message'    => $this->message,
            'data'       => $this->data,
            'error_code' => $this->errorCode,
        ], static fn ($v) => $v !== null);
    }
}

/**
 * Result object for field-edit operations.
 */
final class EditResult
{
    public function __construct(
        public readonly bool    $ok,
        public readonly string  $message,
        public readonly ?array  $data = null,
        public readonly ?string $errorCode = null,
    ) {}

    public function toArray(): array
    {
        return array_filter([
            'ok'         => $this->ok,
            'message'    => $this->message,
            'data'       => $this->data,
            'error_code' => $this->errorCode,
        ], static fn ($v) => $v !== null);
    }
}

/**
 * Server-Side Order Workflow Enforcement Service (P0-02).
 *
 * Enforces status-transition rules, role-based guards, controlled field
 * editing by state, cancel/reopen governance, change-history logging,
 * and auto-actions on transition for the SO > JO > WO hierarchy.
 *
 * Reads and persists workflow state through OrderWorkflowRepository.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class OrderWorkflowService
{
    // ── Order type mapping ──────────────────────────────────────────────────

    /**
     * Short name => config / store metadata.
     */
    private const ORDER_META = [
        'so' => [
            'config_key' => 'sales_order',
            'store_key'  => 'sales_orders',
            'number_key' => 'so_number',
            'flow_key'   => 'so',
        ],
        'jo' => [
            'config_key' => 'job_order',
            'store_key'  => 'job_orders',
            'number_key' => 'jo_number',
            'flow_key'   => 'jo',
        ],
        'wo' => [
            'config_key' => 'work_order',
            'store_key'  => 'work_orders',
            'number_key' => 'wo_number',
            'flow_key'   => 'wo',
        ],
    ];

    // ── Field-edit rules (orderType => field => allowed states) ─────────

    /**
     * Defines which states allow direct pre-release editing of specific fields.
     * Once an order reaches a released/running state, every effective field
     * change is governed by released change authority regardless of this table.
     */
    private const FIELD_EDIT_RULES = [
        'so' => [
            'total_qty'   => ['draft', 'quoted'],
            'due_date'    => ['draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production'],
            'total_value' => ['draft', 'quoted'],
            'priority'    => ['draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production'],
        ],
        'jo' => [
            'qty_ordered'     => ['planned', 'released'],
            'due_date'        => ['planned', 'released', 'active', 'on_hold'],
            'part_revision'   => ['planned'],
            'material_spec'   => ['planned'],
            'routing_id'      => ['planned', 'released'],
            'fai_required'    => ['planned', 'released'],
        ],
        'wo' => [
            'machine_id'       => ['scheduled', 'setup'],
            'operator_id'      => ['scheduled', 'setup', 'running'],
            'work_center_id'   => ['scheduled', 'setup'],
            'nc_program_id'    => ['scheduled', 'setup'],
            'setup_time_est'   => ['scheduled', 'setup'],
            'run_time_est'     => ['scheduled', 'setup'],
            'scheduled_start'  => ['scheduled'],
            'scheduled_end'    => ['scheduled'],
            'tool_list'        => ['scheduled', 'setup'],
            'fixture_id'       => ['scheduled', 'setup'],
        ],
    ];

    /**
     * Terminal statuses -- no field edits allowed (except system fields).
     */
    private const TERMINAL_STATUSES = ['closed', 'cancelled', 'completed', 'shipped'];

    /**
     * Roles allowed to cancel an order (requires reason).
     */
    private const CANCEL_ROLES = [
        'ceo', 'production_director', 'sales_manager', 'production_manager',
        'qa_manager', 'it_admin',
    ];

    /**
     * Roles allowed to reopen a closed order.
     */
    private const REOPEN_ROLES = [
        'ceo', 'production_director', 'it_admin',
    ];

    /**
     * Statuses considered post-release. Any effective field edit in these
     * states requires exact released change authority.
     */
    private const POST_RELEASE_STATUSES = ['released', 'active', 'running', 'inspection', 'in_production', 'setup', 'on_hold'];

    // ── Dependencies ────────────────────────────────────────────────────────

    private readonly OrderWorkflowRepository $repository;
    private readonly ?object $db;
    private ?ChangeAuthorityService $changeAuthorityService = null;

    /** Cached config loaded from disk. */
    private ?array $configCache = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string      $dataDir Absolute path to data directory.
     * @param object|null $db      Optional database connection (Connection instance) for PostgreSQL dual-write.
     */
    public function __construct(
        private readonly string $dataDir,
        ?object $db = null,
        ?OrderWorkflowRepository $repository = null,
    )
    {
        $this->db = $db;
        $this->repository = $repository ?? new JsonOrderWorkflowRepository($dataDir, $db);
    }

    /**
     * Report the active workflow persistence posture without implying DB
     * authority where the runtime still uses compatibility storage.
     *
     * @param array<string, mixed> $dataLayerSummary
     * @return array<string, mixed>
     */
    public function authorityProbe(array $dataLayerSummary = []): array
    {
        $repoProbe = method_exists($this->repository, 'authorityProbe')
            ? (array)$this->repository->authorityProbe($dataLayerSummary)
            : [
                'repository_class' => $this->repository::class,
                'primary_backend' => 'custom',
                'shadow_backend' => '',
                'shadow_write_active' => false,
            ];

        $primary = strtolower(trim((string)($repoProbe['primary_backend'] ?? 'custom')));
        $shadowActive = !empty($repoProbe['shadow_write_active']);
        $readiness = match (true) {
            $primary === 'postgres' => 'authoritative_ready',
            $shadowActive => 'authority_partial',
            $primary === 'json' => 'compatibility_only',
            default => 'degraded',
        };

        return array_merge($repoProbe, [
            'slice' => 'order_workflow',
            'readiness_state' => $readiness,
            'authoritative_primary' => $readiness === 'authoritative_ready',
            'data_layer_mode' => (string)($dataLayerSummary['mode'] ?? ''),
            'postgres_configured' => (bool)($dataLayerSummary['use_postgres'] ?? false),
            'notes' => $readiness === 'compatibility_only'
                ? 'Order workflow is repository-bound but JSON primary in current entrypoints.'
                : (string)($repoProbe['notes'] ?? ''),
        ]);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Validate whether a status transition is allowed.
     *
     * Checks:
     * 1. The transition is defined in so_jo_wo_config.json status_flow.
     * 2. The user's role has edit permission for this order type.
     * 3. Cancel requires manager+ role. Reopen from closed requires director+.
     *
     * @param string $orderType     "so", "jo", or "wo".
     * @param string $currentStatus Current status of the order.
     * @param string $targetStatus  Desired target status.
     * @param string $userRole      Role of the requesting user.
     * @return OrderTransitionResult
     */
    public function validateTransition(
        string $orderType,
        string $currentStatus,
        string $targetStatus,
        string $userRole,
    ): OrderTransitionResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new OrderTransitionResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        $role = $this->migrateRole($userRole);

        // Role-based guard: must have edit permission
        if (!$this->hasRolePermission($orderType, 'edit', $role)) {
            return new OrderTransitionResult(false, 'Insufficient role for this order type.', errorCode: 'forbidden');
        }

        // Cancel guard
        if ($targetStatus === 'cancelled') {
            if (!$this->isRoleInList($role, self::CANCEL_ROLES)) {
                return new OrderTransitionResult(false, 'Cancel requires manager or director role.', errorCode: 'cancel_forbidden');
            }
        }

        // Reopen guard (closed -> any active state)
        if ($currentStatus === 'closed' && $targetStatus !== 'cancelled') {
            if (!$this->isRoleInList($role, self::REOPEN_ROLES)) {
                return new OrderTransitionResult(false, 'Reopen from closed requires director approval.', errorCode: 'reopen_forbidden');
            }
        }

        // Check config-defined transitions
        $flowKey     = $meta['flow_key'];
        $config      = $this->loadConfig();
        $transitions = $config['status_flow'][$flowKey]['transitions'] ?? [];
        $allowed     = $transitions[$currentStatus] ?? [];

        if (!in_array($targetStatus, $allowed, true)) {
            return new OrderTransitionResult(
                false,
                "Transition from '{$currentStatus}' to '{$targetStatus}' is not allowed.",
                errorCode: 'invalid_transition',
                data: [
                    'from'    => $currentStatus,
                    'to'      => $targetStatus,
                    'allowed' => $allowed,
                ],
            );
        }

        return new OrderTransitionResult(true, 'Transition allowed.', data: [
            'from' => $currentStatus,
            'to'   => $targetStatus,
        ]);
    }

    /**
     * Execute a status transition on a live order.
     *
     * Validates the transition, updates the record, logs history, and runs
     * any auto-actions defined for the target status.
     *
     * @param string      $orderType    "so", "jo", or "wo".
     * @param string      $orderId      Order number (e.g. "SO-2026-0001").
     * @param string      $targetStatus Desired target status.
     * @param string      $userId       Requesting user identifier.
     * @param string|null $reason       Required for cancel; optional otherwise.
     * @return OrderTransitionResult
     */
    public function executeTransition(
        string  $orderType,
        string  $orderId,
        string  $targetStatus,
        string  $userId,
        ?string $reason = null,
    ): OrderTransitionResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new OrderTransitionResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        // Cancel requires reason
        if ($targetStatus === 'cancelled' && ($reason === null || trim($reason) === '')) {
            return new OrderTransitionResult(false, 'Cancel requires a reason.', errorCode: 'reason_required');
        }

        $orders   = $this->loadOrders();
        $storeKey = $meta['store_key'];
        $idKey    = $meta['number_key'];

        // Find the order
        $record    = null;
        $recordIdx = -1;
        foreach (($orders[$storeKey] ?? []) as $idx => $row) {
            if (!is_array($row)) continue;
            if ((string)($row[$idKey] ?? '') === $orderId) {
                $record    = $row;
                $recordIdx = $idx;
                break;
            }
        }

        if ($record === null) {
            return new OrderTransitionResult(false, 'Order not found.', errorCode: 'not_found');
        }

        $currentStatus = strtolower((string)($record['status'] ?? ''));

        // We need a role for validation -- extract from session or use system
        $userRole = $this->resolveUserRole($userId);
        $validation = $this->validateTransition($orderType, $currentStatus, $targetStatus, $userRole);
        if (!$validation->ok) {
            return $validation;
        }

        // ── Pre-transition guards (BEFORE mutating state) ────────────────

        // Shipment gate enforcement: block SO -> shipped if gate not ready
        if ($orderType === 'so' && $targetStatus === 'shipped') {
            $gateResult = $this->enforceShipmentGate($orderId, $userId, $userRole);
            if ($gateResult !== null) {
                return $gateResult;
            }
        }

        // Engineering release gate: block SO -> engineering_ready without a released package.
        if ($orderType === 'so' && $targetStatus === 'engineering_ready') {
            $engineeringGate = $this->validateEngineeringReadiness($record);
            if ($engineeringGate !== null) {
                return $engineeringGate;
            }
        }

        // Quantity validation: block WO -> completed if qty invalid
        if ($orderType === 'wo' && $targetStatus === 'completed') {
            $qtyCheck = $this->validateCompletionQuantity($record);
            if ($qtyCheck !== null) {
                return $qtyCheck;
            }
        }

        // ── Apply transition (only after all guards pass) ───────────────
        $now = $this->nowIso();

        $orders[$storeKey][$recordIdx]['status']     = $targetStatus;
        $orders[$storeKey][$recordIdx]['updated_at']  = $now;
        $orders[$storeKey][$recordIdx]['updated_by']  = $userId;

        // Append to status_history
        $statusHistory   = array_values((array)($orders[$storeKey][$recordIdx]['status_history'] ?? []));
        $statusHistory[] = [
            'status'    => $targetStatus,
            'from'      => $currentStatus,
            'to'        => $targetStatus,
            'timestamp' => $now,
            'user'      => $userId,
            'reason'    => $reason,
            'note'      => $reason,
        ];
        $orders[$storeKey][$recordIdx]['status_history'] = $statusHistory;

        // Auto-set date fields
        if ($orderType === 'so' && $targetStatus === 'shipped' && empty($orders[$storeKey][$recordIdx]['shipped_date'])) {
            $orders[$storeKey][$recordIdx]['shipped_date'] = date('Y-m-d');
        }
        if ($orderType === 'wo') {
            if (in_array($targetStatus, ['setup', 'running', 'inspection'], true) && empty($orders[$storeKey][$recordIdx]['actual_start'])) {
                $orders[$storeKey][$recordIdx]['actual_start'] = $now;
            }
            if ($targetStatus === 'completed' && empty($orders[$storeKey][$recordIdx]['actual_end'])) {
                $orders[$storeKey][$recordIdx]['actual_end'] = $now;
            }
        }
        if (in_array($targetStatus, ['closed', 'completed'], true)) {
            $orders[$storeKey][$recordIdx]['closed_date'] = date('Y-m-d');
        }
        if ($targetStatus === 'cancelled') {
            $orders[$storeKey][$recordIdx]['cancel_reason'] = $reason;
            $orders[$storeKey][$recordIdx]['cancelled_at']  = $now;
            $orders[$storeKey][$recordIdx]['cancelled_by']  = $userId;
        }

        // Log field-level change history
        $this->logOrderChange($orders, $storeKey, $recordIdx, [
            'status' => ['old' => $currentStatus, 'new' => $targetStatus],
        ], $userId, $reason ?? "Status transition: {$currentStatus} -> {$targetStatus}");

        // ── Hash-chain audit trail integration ──────────────────────────
        $this->appendImmutableAuditEvent($orderType, $orderId, [
            'event_type'   => 'STATUS_CHANGED',
            'from_state'   => $currentStatus,
            'to_state'     => $targetStatus,
            'user'         => $userId,
            'role'         => $userRole,
            'reason'       => $reason,
            'timestamp'    => $now,
            'ip'           => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent'   => $_SERVER['HTTP_USER_AGENT'] ?? '',
        ]);

        $this->saveOrders($orders);

        // Auto-actions on transition
        $this->runAutoActions($orderType, $orderId, $targetStatus, $orders);

        // ── Notification dispatch ───────────────────────────────────────
        $this->dispatchTransitionNotification($orderType, $orderId, $currentStatus, $targetStatus, $userId);

        return new OrderTransitionResult(true, "Transitioned to '{$targetStatus}'.", data: $orders[$storeKey][$recordIdx]);
    }

    /**
     * Validate whether a specific field can be edited on an order.
     *
     * @param string $orderType "so", "jo", or "wo".
     * @param string $orderId   Order number.
     * @param string $fieldName Field to edit.
     * @param mixed  $newValue  Proposed new value.
     * @param string $userRole  Role of the requesting user.
     * @return EditResult
     */
    public function validateFieldEdit(
        string $orderType,
        string $orderId,
        string $fieldName,
        mixed  $newValue,
        string $userRole,
        array $context = [],
    ): EditResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new EditResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        $role = $this->migrateRole($userRole);

        // Role-based guard
        if (!$this->hasRolePermission($orderType, 'edit', $role)) {
            return new EditResult(false, 'Insufficient role.', errorCode: 'forbidden');
        }

        $orders   = $this->loadOrders();
        $storeKey = $meta['store_key'];
        $idKey    = $meta['number_key'];
        $record   = null;

        foreach (($orders[$storeKey] ?? []) as $row) {
            if (is_array($row) && (string)($row[$idKey] ?? '') === $orderId) {
                $record = $row;
                break;
            }
        }

        if ($record === null) {
            return new EditResult(false, 'Order not found.', errorCode: 'not_found');
        }

        $currentStatus = strtolower((string)($record['status'] ?? ''));
        $isPostReleaseField = in_array($currentStatus, self::POST_RELEASE_STATUSES, true);

        // Terminal status -- no edits
        if (in_array($currentStatus, self::TERMINAL_STATUSES, true)) {
            return new EditResult(false, "Cannot edit fields in '{$currentStatus}' status.", errorCode: 'status_locked');
        }

        // Check controlled field rules
        $rules = self::FIELD_EDIT_RULES[$orderType] ?? [];
        if (isset($rules[$fieldName])) {
            $allowedStates = $rules[$fieldName];
            if (!in_array($currentStatus, $allowedStates, true) && !$isPostReleaseField) {
                return new EditResult(
                    false,
                    "Field '{$fieldName}' is locked in '{$currentStatus}' status.",
                    errorCode: 'field_locked',
                    data: [
                        'field'          => $fieldName,
                        'current_status' => $currentStatus,
                        'allowed_states' => $allowedStates,
                    ],
                );
            }
        }

        // Exact released change authority check for every post-release edit.
        if ($isPostReleaseField) {
            $decision = $this->changeAuthority()->assertFieldEditAllowed(
                $orderType,
                $orderId,
                $fieldName,
                $record[$fieldName] ?? null,
                $newValue,
                $currentStatus,
                array_merge($context, [
                    'effectivity' => array_merge(
                        is_array($context['effectivity'] ?? null) ? $context['effectivity'] : [],
                        [
                            'order_id' => $orderId,
                            'order_type' => $orderType,
                            'status' => $currentStatus,
                        ],
                    ),
                ]),
            );

            if (!$decision->allowed) {
                return new EditResult(
                    false,
                    $decision->message,
                    errorCode: $decision->errorCode !== '' ? $decision->errorCode : 'change_authority_required',
                    data: array_merge([
                        'field' => $fieldName,
                        'current_status' => $currentStatus,
                    ], $decision->data),
                );
            }
        }

        return new EditResult(true, 'Edit allowed.', data: [
            'field'     => $fieldName,
            'new_value' => $newValue,
        ]);
    }

    /**
     * Execute field-level edits on an order.
     *
     * Validates each field, applies changes, and logs history.
     *
     * @param string $orderType "so", "jo", or "wo".
     * @param string $orderId   Order number.
     * @param array  $changes   Field => new-value map.
     * @param string $userId    Requesting user.
     * @param string $reason    Reason for changes.
     * @return EditResult
     */
    public function executeFieldEdit(
        string $orderType,
        string $orderId,
        array  $changes,
        string $userId,
        string $reason,
        array $context = [],
    ): EditResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new EditResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        $userRole = $this->resolveUserRole($userId);

        // Validate all fields first
        $errors = [];
        foreach ($changes as $field => $newValue) {
            $result = $this->validateFieldEdit($orderType, $orderId, $field, $newValue, $userRole, $context);
            if (!$result->ok) {
                $errors[$field] = $result->message;
            }
        }

        if (!empty($errors)) {
            return new EditResult(false, 'Some fields cannot be edited.', errorCode: 'validation_failed', data: ['field_errors' => $errors]);
        }

        // Apply changes
        $orders   = $this->loadOrders();
        $storeKey = $meta['store_key'];
        $idKey    = $meta['number_key'];
        $now      = $this->nowIso();
        $updated  = null;

        foreach (($orders[$storeKey] ?? []) as $idx => $row) {
            if (!is_array($row) || (string)($row[$idKey] ?? '') !== $orderId) {
                continue;
            }

            $changeDiff = [];
            foreach ($changes as $field => $newValue) {
                $changeDiff[$field] = [
                    'old' => $row[$field] ?? null,
                    'new' => $newValue,
                ];
                $orders[$storeKey][$idx][$field] = $newValue;
            }

            $orders[$storeKey][$idx]['updated_at'] = $now;
            $orders[$storeKey][$idx]['updated_by'] = $userId;

            $this->logOrderChange($orders, $storeKey, $idx, $changeDiff, $userId, $reason);

            $updated = $orders[$storeKey][$idx];
            break;
        }

        if ($updated === null) {
            return new EditResult(false, 'Order not found.', errorCode: 'not_found');
        }

        $this->saveOrders($orders);

        return new EditResult(true, 'Fields updated.', data: $updated);
    }

    private function changeAuthority(): ChangeAuthorityService
    {
        if ($this->changeAuthorityService === null) {
            $this->changeAuthorityService = new ChangeAuthorityService($this->db);
        }

        return $this->changeAuthorityService;
    }

    /**
     * Retrieve the full change-history log for an order.
     *
     * @param string $orderType "so", "jo", or "wo".
     * @param string $orderId   Order number.
     * @return array List of change-history entries, newest first.
     */
    public function getChangeHistory(string $orderType, string $orderId): array
    {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return [];
        }

        $orders   = $this->loadOrders();
        $storeKey = $meta['store_key'];
        $idKey    = $meta['number_key'];

        foreach (($orders[$storeKey] ?? []) as $row) {
            if (!is_array($row) || (string)($row[$idKey] ?? '') !== $orderId) {
                continue;
            }

            $history = array_values((array)($row['change_history'] ?? []));
            usort($history, static fn (array $a, array $b) => strcmp(
                (string)($b['timestamp'] ?? ''),
                (string)($a['timestamp'] ?? ''),
            ));
            return $history;
        }

        return [];
    }

    /**
     * Get available transitions for the current status and user role.
     *
     * @param string $orderType     "so", "jo", or "wo".
     * @param string $currentStatus Current order status.
     * @param string $userRole      Role of the requesting user.
     * @return array List of available target statuses.
     */
    public function getAvailableTransitions(string $orderType, string $currentStatus, string $userRole): array
    {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return [];
        }

        $role    = $this->migrateRole($userRole);
        $flowKey = $meta['flow_key'];
        $config  = $this->loadConfig();

        $transitions = $config['status_flow'][$flowKey]['transitions'] ?? [];
        $allowed     = $transitions[$currentStatus] ?? [];

        // Filter by role permission
        if (!$this->hasRolePermission($orderType, 'edit', $role)) {
            return [];
        }

        // Filter out reopen targets unless role is director+
        if ($currentStatus === 'closed' && !$this->isRoleInList($role, self::REOPEN_ROLES)) {
            $allowed = [];
        }

        return array_values(array_unique($allowed));
    }

    // ── Auto-actions ────────────────────────────────────────────────────────

    /**
     * Run automatic actions triggered by a transition.
     *
     * Examples:
     * - JO -> active: verify all child WOs are scheduled.
     * - SO -> in_production: check at least one JO exists.
     * - WO -> completed: auto-update qty fields.
     */
    private function runAutoActions(string $orderType, string $orderId, string $targetStatus, array &$orders): void
    {
        switch ($orderType) {
            case 'jo':
                if ($targetStatus === 'active') {
                    $this->autoCheckWoScheduled($orderId, $orders);
                }
                break;

            case 'so':
                if ($targetStatus === 'in_production') {
                    $this->autoCheckJoExists($orderId, $orders);
                }
                break;

            case 'wo':
                if ($targetStatus === 'completed') {
                    $this->autoUpdateParentJoProgress($orderId, $orders);
                }
                break;
        }
    }

    /**
     * When JO moves to "active", verify all child WOs have a scheduled_start.
     * Logs a warning entry on the JO if any WO is not scheduled.
     */
    private function autoCheckWoScheduled(string $joNumber, array &$orders): void
    {
        $unscheduled = [];
        foreach (($orders['work_orders'] ?? []) as $wo) {
            if (!is_array($wo)) continue;
            if ((string)($wo['jo_number'] ?? '') !== $joNumber) continue;
            if (empty($wo['scheduled_start'])) {
                $unscheduled[] = (string)($wo['wo_number'] ?? '');
            }
        }

        if (!empty($unscheduled)) {
            // Append warning to JO record
            foreach (($orders['job_orders'] ?? []) as $idx => $jo) {
                if (!is_array($jo) || (string)($jo['jo_number'] ?? '') !== $joNumber) continue;
                $warnings = (array)($orders['job_orders'][$idx]['workflow_warnings'] ?? []);
                $warnings[] = [
                    'type'      => 'unscheduled_wo',
                    'message'   => 'WOs not yet scheduled: ' . implode(', ', $unscheduled),
                    'timestamp' => $this->nowIso(),
                ];
                $orders['job_orders'][$idx]['workflow_warnings'] = $warnings;
                break;
            }
        }
    }

    /**
     * When SO moves to "in_production", verify at least one JO exists.
     */
    private function autoCheckJoExists(string $soNumber, array &$orders): void
    {
        $hasJo = false;
        foreach (($orders['job_orders'] ?? []) as $jo) {
            if (is_array($jo) && (string)($jo['so_number'] ?? '') === $soNumber) {
                $hasJo = true;
                break;
            }
        }

        if (!$hasJo) {
            foreach (($orders['sales_orders'] ?? []) as $idx => $so) {
                if (!is_array($so) || (string)($so['so_number'] ?? '') !== $soNumber) continue;
                $warnings = (array)($orders['sales_orders'][$idx]['workflow_warnings'] ?? []);
                $warnings[] = [
                    'type'      => 'no_jo',
                    'message'   => 'SO moved to in_production but has no Job Orders.',
                    'timestamp' => $this->nowIso(),
                ];
                $orders['sales_orders'][$idx]['workflow_warnings'] = $warnings;
                break;
            }
        }
    }

    /**
     * When WO completes, update parent JO qty_good/qty_scrap aggregates.
     */
    private function autoUpdateParentJoProgress(string $woNumber, array &$orders): void
    {
        // Find parent JO number
        $parentJo = null;
        foreach (($orders['work_orders'] ?? []) as $wo) {
            if (is_array($wo) && (string)($wo['wo_number'] ?? '') === $woNumber) {
                $parentJo = (string)($wo['jo_number'] ?? '');
                break;
            }
        }

        if ($parentJo === null || $parentJo === '') {
            return;
        }

        // Aggregate all completed WOs for this JO
        $totalGood  = 0;
        $totalScrap = 0;
        $allComplete = true;

        foreach (($orders['work_orders'] ?? []) as $wo) {
            if (!is_array($wo) || (string)($wo['jo_number'] ?? '') !== $parentJo) continue;
            $totalGood  += (int)($wo['qty_completed'] ?? 0);
            $totalScrap += (int)($wo['qty_scrap'] ?? 0);
            if (!in_array(strtolower((string)($wo['status'] ?? '')), ['completed'], true)) {
                $allComplete = false;
            }
        }

        // Update JO
        foreach (($orders['job_orders'] ?? []) as $idx => $jo) {
            if (!is_array($jo) || (string)($jo['jo_number'] ?? '') !== $parentJo) continue;
            $orders['job_orders'][$idx]['qty_good']  = $totalGood;
            $orders['job_orders'][$idx]['qty_scrap'] = $totalScrap;
            $orders['job_orders'][$idx]['updated_at'] = $this->nowIso();

            // If all WOs complete, add a note
            if ($allComplete) {
                $warnings = (array)($orders['job_orders'][$idx]['workflow_warnings'] ?? []);
                $warnings[] = [
                    'type'      => 'all_wo_complete',
                    'message'   => 'All work orders completed. JO ready for completion review.',
                    'timestamp' => $this->nowIso(),
                ];
                $orders['job_orders'][$idx]['workflow_warnings'] = $warnings;
            }
            break;
        }

        $this->saveOrders($orders);
    }

    // ── Change history ──────────────────────────────────────────────────────

    /**
     * Append a change-history entry to the order record itself.
     *
     * @param array  $orders    Full orders store (by reference via caller).
     * @param string $storeKey  e.g. "sales_orders".
     * @param int    $recordIdx Index of the order in the store array.
     * @param array  $changeDiff field => {old, new} map.
     * @param string $userId    User who made the change.
     * @param string $reason    Reason for change.
     */
    private function logOrderChange(
        array  &$orders,
        string $storeKey,
        int    $recordIdx,
        array  $changeDiff,
        string $userId,
        string $reason,
    ): void {
        $history = array_values((array)($orders[$storeKey][$recordIdx]['change_history'] ?? []));

        $fieldEntries = [];
        $legacyChanges = [];
        foreach ($changeDiff as $field => $diff) {
            $fieldEntries[] = [
                'field_name' => $field,
                'old_value'  => $diff['old'] ?? null,
                'new_value'  => $diff['new'] ?? null,
            ];
            $legacyChanges[] = [
                'field' => $field,
                'old'   => $diff['old'] ?? null,
                'new'   => $diff['new'] ?? null,
            ];
        }

        $history[] = [
            'timestamp'     => $this->nowIso(),
            'user'          => $userId,
            'reason'        => $reason,
            'note'          => $reason,
            'changes'       => $legacyChanges,
            'field_changes' => $fieldEntries,
        ];

        $orders[$storeKey][$recordIdx]['change_history'] = $history;
    }

    // ── Role helpers ────────────────────────────────────────────────────────

    /**
     * Check if a role has a specific permission for an order type.
     */
    private function hasRolePermission(string $orderType, string $permission, string $role): bool
    {
        // Admin roles always pass
        if (in_array($role, ['it_admin', 'ceo', 'qa_manager'], true)) {
            return true;
        }

        $meta      = self::ORDER_META[$orderType];
        $config    = $this->loadConfig();
        $configKey = $meta['config_key'];
        $node      = $config[$configKey] ?? [];
        $roles     = array_map([$this, 'migrateRole'], (array)($node['roles_' . $permission] ?? []));

        return in_array($role, $roles, true);
    }

    /**
     * Check if a role appears in an allowed-roles list.
     */
    private function isRoleInList(string $role, array $allowedRoles): bool
    {
        if (in_array($role, ['it_admin', 'ceo'], true)) {
            return true;
        }
        return in_array($role, $allowedRoles, true);
    }

    /**
     * Migrate legacy role names.
     */
    private function migrateRole(string $role): string
    {
        static $map = [
            'general_director'   => 'ceo',
            'deputy_director'    => 'production_director',
            'prod_manager'       => 'cnc_workshop_manager',
            'prod_supervisor'    => 'shift_leader',
            'cnc_setup'          => 'setup_technician',
            'cnc_programmer'     => 'cam_nc_programmer',
            'qms_supervisor'     => 'qms_engineer',
            'doc_controller'     => 'qms_engineer',
            'purchasing_officer' => 'buyer',
            'procurement_manager'=> 'supply_chain_manager',
            'sales_officer'      => 'estimator',
            'planning_officer'   => 'production_planner',
            'hse_officer'        => 'ehs_specialist',
            'maintenance_tech'   => 'maintenance_technician',
            'finance_officer'    => 'gl_payroll_accountant',
            'warehouse_staff'    => 'warehouse_clerk',
            'warehouse_lead'     => 'supply_chain_manager',
        ];
        return $map[$role] ?? $role;
    }

    /**
     * Resolve a user's role from session or user store.
     *
     * Falls back to reading session data. If unavailable, returns 'system'.
     */
    private function resolveUserRole(string $userId): string
    {
        // Try session first
        if (isset($_SESSION['role'])) {
            return $this->migrateRole((string)$_SESSION['role']);
        }

        foreach ($this->repository->loadUsers() as $u) {
            if (is_array($u) && (string)($u['username'] ?? '') === $userId) {
                return $this->migrateRole((string)($u['role'] ?? 'system'));
            }
        }

        return 'system';
    }

    // ── Shipment gate enforcement ──────────────────────────────────────────

    /**
     * Enforce shipment readiness gate before allowing SO -> shipped.
     * Returns a failure OrderTransitionResult if gate is NOT READY, null if OK.
     */
    private function enforceShipmentGate(string $soNumber, string $userId, string $userRole): ?OrderTransitionResult
    {
        $base    = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $confDir = $base . '/config';

        $gateService = new ShipmentGateService($base, $confDir);

        try {
            $result = $gateService->checkReadiness($soNumber, $userId, $userRole);
        } catch (RuntimeException $e) {
            return new OrderTransitionResult(
                false,
                'Shipment gate check failed: ' . $e->getMessage(),
                errorCode: 'shipment_gate_error',
            );
        }

        if (!$result['ready']) {
            $failedCodes = implode(', ', $result['failed_gates']);
            return new OrderTransitionResult(
                false,
                "Cannot ship: shipment readiness gate NOT READY. Failed gates: {$failedCodes}. " .
                "Resolve all required gate failures or request an override from QA Manager.",
                errorCode: 'shipment_gate_not_ready',
                data: [
                    'failed_gates' => $result['failed_gates'],
                    'items'        => $result['items'],
                ],
            );
        }

        return null; // Gate passed
    }

    // ── Engineering readiness enforcement ──────────────────────────────────

    /**
     * @param array<string, mixed> $salesOrder
     */
    private function validateEngineeringReadiness(array $salesOrder): ?OrderTransitionResult
    {
        $requiredFields = [
            'engineering_release_id',
            'bom_id',
            'routing_id',
            'control_plan_id',
            'inspection_plan_id',
        ];

        $missing = [];
        foreach ($requiredFields as $field) {
            if (trim((string)($salesOrder[$field] ?? '')) === '') {
                $missing[] = $field;
            }
        }

        $releaseStatus = strtolower(trim((string)($salesOrder['engineering_release_status'] ?? '')));
        $released = in_array($releaseStatus, ['released', 'approved', 'complete', 'completed'], true);

        if ($missing === [] && $released) {
            return null;
        }

        return new OrderTransitionResult(
            false,
            'Engineering readiness gate failed. SO requires released engineering package before production release.',
            data: [
                'missing_fields' => $missing,
                'engineering_release_status' => $releaseStatus,
            ],
            errorCode: 'engineering_release_incomplete',
        );
    }

    // ── Quantity validation ─────────────────────────────────────────────────

    /**
     * Validate that completion quantity is reasonable before WO -> completed.
     * Returns a failure OrderTransitionResult if invalid, null if OK.
     */
    private function validateCompletionQuantity(array $record): ?OrderTransitionResult
    {
        $qtyOrdered   = (int)($record['qty_ordered'] ?? 0);
        $qtyCompleted = (int)($record['qty_completed'] ?? 0);
        $qtyScrap     = (int)($record['qty_scrap'] ?? 0);

        if ($qtyOrdered > 0 && ($qtyCompleted + $qtyScrap) === 0) {
            return new OrderTransitionResult(
                false,
                "Cannot complete WO: qty_completed and qty_scrap are both zero. " .
                "Report progress before completing.",
                errorCode: 'qty_not_reported',
            );
        }

        // Warn but allow: over-production (qty_completed > qty_ordered * 1.1)
        // This is logged but not blocked -- some processes allow overrun.

        return null;
    }

    // ── Immutable audit trail (hash-chain) ──────────────────────────────────

    /**
     * Append an immutable, hash-chained audit event for an order transition.
     * Provides tamper-proof evidence per AS9100D / 21 CFR Part 11.
     */
    private function appendImmutableAuditEvent(string $orderType, string $orderId, array $event): void
    {
        $this->repository->appendImmutableAuditEvent($orderType, $orderId, $event);
    }

    // ── Notification dispatch ───────────────────────────────────────────────

    /**
     * Dispatch notifications on order status transitions.
     *
     * Priority transitions that ALWAYS notify:
     * - SO: confirmed, in_production, shipped, cancelled
     * - JO: released, active, on_hold, completed, closed
     * - WO: running, completed, on_hold
     */
    private function dispatchTransitionNotification(
        string $orderType,
        string $orderId,
        string $fromStatus,
        string $toStatus,
        string $userId,
    ): void {
        // Define which transitions trigger notifications
        $notifyMap = [
            'so' => ['confirmed', 'in_production', 'shipped', 'cancelled', 'closed'],
            'jo' => ['released', 'active', 'on_hold', 'completed', 'closed', 'cancelled'],
            'wo' => ['setup', 'running', 'completed', 'on_hold', 'cancelled'],
        ];

        $triggers = $notifyMap[$orderType] ?? [];
        if (!in_array($toStatus, $triggers, true)) {
            return;
        }

        // Build notification entry
        $now = $this->nowIso();
        $notification = [
            'type'        => 'order_transition',
            'order_type'  => strtoupper($orderType),
            'order_id'    => $orderId,
            'from_status' => $fromStatus,
            'to_status'   => $toStatus,
            'triggered_by' => $userId,
            'timestamp'   => $now,
            'priority'    => in_array($toStatus, ['cancelled', 'on_hold'], true) ? 'URGENT' : 'NORMAL',
            'message_en'  => strtoupper($orderType) . " {$orderId} transitioned from '{$fromStatus}' to '{$toStatus}'.",
            'message_vi'  => strtoupper($orderType) . " {$orderId} chuyen trang thai tu '{$fromStatus}' sang '{$toStatus}'.",
            'read'        => false,
        ];

        $this->repository->appendOrderNotification($notification);
    }

    // ── File I/O ────────────────────────────────────────────────────────────

    private function loadConfig(): array
    {
        if ($this->configCache !== null) {
            return $this->configCache;
        }
        $this->configCache = $this->repository->loadConfig();
        return $this->configCache;
    }

    private function loadOrders(): array
    {
        return $this->repository->loadOrders();
    }

    private function saveOrders(array $data): void
    {
        $this->repository->saveOrders($data);
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
