<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Result object for status-transition operations.
 */
final class TransitionResult
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
 * Reads configuration from qms-data/config/so_jo_wo_config.json.
 * Persists orders in qms-data/orders/orders.json.
 *
 * @package HESEM\QMS\Services
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
     * Defines which states allow editing of specific fields.
     * Fields not listed here are editable in any non-terminal state.
     */
    private const FIELD_EDIT_RULES = [
        'so' => [
            'total_qty'   => ['draft', 'quoted'],
            'due_date'    => ['draft', 'quoted', 'confirmed', 'in_production'],
            'total_value' => ['draft', 'quoted'],
            'priority'    => ['draft', 'quoted', 'confirmed', 'in_production'],
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
     * Fields that require an ECR (engineering change request) when edited
     * after the order has been released.
     */
    private const ECR_FIELDS = ['part_revision', 'material_spec', 'routing_id'];

    /**
     * Statuses considered "post-release" where ECR is required for
     * ECR_FIELDS edits.
     */
    private const POST_RELEASE_STATUSES = ['released', 'active', 'running', 'inspection'];

    // ── Dependencies ────────────────────────────────────────────────────────

    private readonly string $configFile;
    private readonly string $ordersFile;

    /** Cached config loaded from disk. */
    private ?array $configCache = null;

    /** Optional database connection for PostgreSQL dual-write. */
    private ?object $db = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string      $dataDir Absolute path to qms-data directory.
     * @param object|null $db      Optional database connection (Connection instance) for PostgreSQL dual-write.
     */
    public function __construct(private readonly string $dataDir, ?object $db = null)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->configFile = $base . '/config/so_jo_wo_config.json';
        $this->ordersFile = $base . '/orders/orders.json';
        $this->db = $db;
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
     * @return TransitionResult
     */
    public function validateTransition(
        string $orderType,
        string $currentStatus,
        string $targetStatus,
        string $userRole,
    ): TransitionResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new TransitionResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        $role = $this->migrateRole($userRole);

        // Role-based guard: must have edit permission
        if (!$this->hasRolePermission($orderType, 'edit', $role)) {
            return new TransitionResult(false, 'Insufficient role for this order type.', errorCode: 'forbidden');
        }

        // Cancel guard
        if ($targetStatus === 'cancelled') {
            if (!$this->isRoleInList($role, self::CANCEL_ROLES)) {
                return new TransitionResult(false, 'Cancel requires manager or director role.', errorCode: 'cancel_forbidden');
            }
        }

        // Reopen guard (closed -> any active state)
        if ($currentStatus === 'closed' && $targetStatus !== 'cancelled') {
            if (!$this->isRoleInList($role, self::REOPEN_ROLES)) {
                return new TransitionResult(false, 'Reopen from closed requires director approval.', errorCode: 'reopen_forbidden');
            }
        }

        // Check config-defined transitions
        $flowKey     = $meta['flow_key'];
        $config      = $this->loadConfig();
        $transitions = $config['status_flow'][$flowKey]['transitions'] ?? [];
        $allowed     = $transitions[$currentStatus] ?? [];

        // Allow cancel from any non-terminal status (if role check passed)
        if ($targetStatus === 'cancelled' && !in_array($currentStatus, ['cancelled', 'closed'], true)) {
            return new TransitionResult(true, 'Transition allowed.', data: [
                'from' => $currentStatus,
                'to'   => $targetStatus,
            ]);
        }

        if (!in_array($targetStatus, $allowed, true)) {
            return new TransitionResult(
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

        return new TransitionResult(true, 'Transition allowed.', data: [
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
     * @return TransitionResult
     */
    public function executeTransition(
        string  $orderType,
        string  $orderId,
        string  $targetStatus,
        string  $userId,
        ?string $reason = null,
    ): TransitionResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new TransitionResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        // Cancel requires reason
        if ($targetStatus === 'cancelled' && ($reason === null || trim($reason) === '')) {
            return new TransitionResult(false, 'Cancel requires a reason.', errorCode: 'reason_required');
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
            return new TransitionResult(false, 'Order not found.', errorCode: 'not_found');
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

        return new TransitionResult(true, "Transitioned to '{$targetStatus}'.", data: $orders[$storeKey][$recordIdx]);
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

        // Terminal status -- no edits
        if (in_array($currentStatus, self::TERMINAL_STATUSES, true)) {
            return new EditResult(false, "Cannot edit fields in '{$currentStatus}' status.", errorCode: 'status_locked');
        }

        // Check controlled field rules
        $rules = self::FIELD_EDIT_RULES[$orderType] ?? [];
        if (isset($rules[$fieldName])) {
            $allowedStates = $rules[$fieldName];
            if (!in_array($currentStatus, $allowedStates, true)) {
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

        // ECR check for post-release edits
        if (
            in_array($fieldName, self::ECR_FIELDS, true)
            && in_array($currentStatus, self::POST_RELEASE_STATUSES, true)
        ) {
            return new EditResult(
                false,
                "Field '{$fieldName}' requires an Engineering Change Request (ECR) after release.",
                errorCode: 'ecr_required',
                data: ['field' => $fieldName, 'current_status' => $currentStatus],
            );
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
    ): EditResult {
        $meta = self::ORDER_META[$orderType] ?? null;
        if ($meta === null) {
            return new EditResult(false, 'Invalid order type.', errorCode: 'invalid_order_type');
        }

        $userRole = $this->resolveUserRole($userId);

        // Validate all fields first
        $errors = [];
        foreach ($changes as $field => $newValue) {
            $result = $this->validateFieldEdit($orderType, $orderId, $field, $newValue, $userRole);
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

        // Add cancel option if not already terminal and role allows
        if (
            !in_array('cancelled', $allowed, true)
            && !in_array($currentStatus, ['cancelled', 'closed'], true)
            && $this->isRoleInList($role, self::CANCEL_ROLES)
        ) {
            $allowed[] = 'cancelled';
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

        // Try loading from users config
        $usersFile = rtrim(str_replace('\\', '/', $this->dataDir), '/') . '/config/users.json';
        $users = $this->readJson($usersFile);
        if (is_array($users)) {
            foreach ($users as $u) {
                if (is_array($u) && (string)($u['username'] ?? '') === $userId) {
                    return $this->migrateRole((string)($u['role'] ?? 'system'));
                }
            }
        }

        return 'system';
    }

    // ── Shipment gate enforcement ──────────────────────────────────────────

    /**
     * Enforce shipment readiness gate before allowing SO -> shipped.
     * Returns a failure TransitionResult if gate is NOT READY, null if OK.
     */
    private function enforceShipmentGate(string $soNumber, string $userId, string $userRole): ?TransitionResult
    {
        $base    = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $confDir = $base . '/config';

        $gateService = new ShipmentGateService($base, $confDir);

        try {
            $result = $gateService->checkReadiness($soNumber, $userId, $userRole);
        } catch (RuntimeException $e) {
            return new TransitionResult(
                false,
                'Shipment gate check failed: ' . $e->getMessage(),
                errorCode: 'shipment_gate_error',
            );
        }

        if (!$result['ready']) {
            $failedCodes = implode(', ', $result['failed_gates'] ?? []);
            return new TransitionResult(
                false,
                "Cannot ship: shipment readiness gate NOT READY. Failed gates: {$failedCodes}. " .
                "Resolve all required gate failures or request an override from QA Manager.",
                errorCode: 'shipment_gate_not_ready',
                data: [
                    'failed_gates' => $result['failed_gates'] ?? [],
                    'items'        => $result['items'] ?? [],
                ],
            );
        }

        return null; // Gate passed
    }

    // ── Quantity validation ─────────────────────────────────────────────────

    /**
     * Validate that completion quantity is reasonable before WO -> completed.
     * Returns a failure TransitionResult if invalid, null if OK.
     */
    private function validateCompletionQuantity(array $record): ?TransitionResult
    {
        $qtyOrdered   = (int)($record['qty_ordered'] ?? 0);
        $qtyCompleted = (int)($record['qty_completed'] ?? 0);
        $qtyScrap     = (int)($record['qty_scrap'] ?? 0);

        if ($qtyOrdered > 0 && ($qtyCompleted + $qtyScrap) === 0) {
            return new TransitionResult(
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
        $base    = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $logDir  = $base . '/orders/audit_trail';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }

        $logFile = $logDir . '/' . preg_replace('/[^A-Za-z0-9_-]/', '_', $orderId) . '.jsonl';

        // Read last hash for chain
        $prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        if (is_file($logFile)) {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!empty($lines)) {
                $lastLine = end($lines);
                $lastEvent = json_decode($lastLine, true);
                $prevHash = $lastEvent['event_hash'] ?? $prevHash;
            }
        }

        $event['order_type']  = $orderType;
        $event['order_id']    = $orderId;
        $event['prev_hash']   = $prevHash;
        $event['event_hash']  = hash('sha256', json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
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

        // Persist to notification queue
        $base     = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $queueDir = $base . '/notifications';
        if (!is_dir($queueDir)) {
            @mkdir($queueDir, 0775, true);
        }

        $queueFile = $queueDir . '/order_notifications.jsonl';
        $line = json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($queueFile, $line, FILE_APPEND | LOCK_EX);
    }

    // ── File I/O ────────────────────────────────────────────────────────────

    private function loadConfig(): array
    {
        if ($this->configCache !== null) {
            return $this->configCache;
        }
        $this->configCache = $this->readJson($this->configFile) ?? [];
        return $this->configCache;
    }

    private function loadOrders(): array
    {
        // Try PostgreSQL first if DB available (for future POSTGRES_PRIMARY mode)
        // Currently: always read from JSON (JSON_ONLY / SHADOW_WRITE)
        return $this->readJson($this->ordersFile) ?? [
            '_meta'        => ['version' => '1.0'],
            'sales_orders' => [],
            'job_orders'   => [],
            'work_orders'  => [],
        ];
    }

    private function saveOrders(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();

        // ── 1. Always write JSON (primary store) ────────────────────────
        $this->writeJson($this->ordersFile, $data);

        // ── 2. Shadow-write to PostgreSQL if DB available ───────────────
        $this->shadowWriteOrders($data);
    }

    /**
     * Shadow-write order data to PostgreSQL tables.
     * Non-blocking: errors are logged but do not fail the operation.
     *
     * Writes to: sales_orders, job_orders, job_operations (via RuntimeShadowSync pattern)
     */
    private function shadowWriteOrders(array $data): void
    {
        if ($this->db === null) {
            return;
        }

        try {
            // Check if DB is connected (duck-type: method_exists for flexibility)
            if (method_exists($this->db, 'isConnected') && !$this->db->isConnected()) {
                return;
            }

            // Upsert each SO
            foreach (($data['sales_orders'] ?? []) as $so) {
                if (!is_array($so) || empty($so['so_number'] ?? '')) continue;
                $this->upsertOrderRow('sales_orders', 'sales_order_number', $so['so_number'], $so);
            }

            // Upsert each JO
            foreach (($data['job_orders'] ?? []) as $jo) {
                if (!is_array($jo) || empty($jo['jo_number'] ?? '')) continue;
                $this->upsertOrderRow('job_orders', 'job_number', $jo['jo_number'], $jo);
            }

            // Upsert each WO into job_operations
            foreach (($data['work_orders'] ?? []) as $wo) {
                if (!is_array($wo) || empty($wo['wo_number'] ?? '')) continue;
                $this->upsertWorkOrderRow($wo);
            }
        } catch (\Throwable $e) {
            error_log('[OrderWorkflowService] Shadow write to PostgreSQL failed: ' . $e->getMessage());
        }
    }

    /**
     * Upsert a single order row into PostgreSQL.
     */
    private function upsertOrderRow(string $table, string $idColumn, string $idValue, array $row): void
    {
        if ($this->db === null) return;

        $status    = $row['status'] ?? 'draft';
        $metadata  = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $updatedAt = $row['updated_at'] ?? $this->nowIso();

        try {
            $existing = null;
            if (method_exists($this->db, 'queryOne')) {
                $existing = $this->db->queryOne(
                    "SELECT 1 FROM {$table} WHERE {$idColumn} = :id LIMIT 1",
                    [':id' => $idValue],
                );
            }

            if ($existing) {
                $this->db->execute(
                    "UPDATE {$table} SET so_status = :status, metadata = :meta::jsonb, updated_at = :at::timestamptz WHERE {$idColumn} = :id",
                    [':status' => $status, ':meta' => $metadata, ':at' => $updatedAt, ':id' => $idValue],
                );
            } else {
                // Insert with minimal required fields -- full sync handled by RuntimeShadowSync
                $this->db->execute(
                    "INSERT INTO {$table} ({$idColumn}, so_status, metadata, created_at, updated_at) VALUES (:id, :status, :meta::jsonb, :at::timestamptz, :at::timestamptz)
                     ON CONFLICT ({$idColumn}) DO UPDATE SET so_status = EXCLUDED.so_status, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at",
                    [':id' => $idValue, ':status' => $status, ':meta' => $metadata, ':at' => $updatedAt],
                );
            }
        } catch (\Throwable $e) {
            // Log but don't fail -- shadow write is non-critical
            error_log("[OrderWorkflowService] Upsert {$table}.{$idValue} failed: " . $e->getMessage());
        }
    }

    /**
     * Upsert a work order row into job_operations table.
     */
    private function upsertWorkOrderRow(array $wo): void
    {
        if ($this->db === null) return;

        $woNumber = $wo['wo_number'] ?? '';
        if ($woNumber === '') return;

        $status   = $wo['status'] ?? 'scheduled';
        $metadata = json_encode($wo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        try {
            $this->db->execute(
                "INSERT INTO job_operations (operation_code, status, metadata, created_at)
                 VALUES (:wo, :status, :meta::jsonb, NOW())
                 ON CONFLICT (operation_code) DO UPDATE SET status = EXCLUDED.status, metadata = EXCLUDED.metadata",
                [':wo' => $woNumber, ':status' => $status, ':meta' => $metadata],
            );
        } catch (\Throwable $e) {
            error_log("[OrderWorkflowService] Upsert WO {$woNumber} failed: " . $e->getMessage());
        }
    }

    private function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp  = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
