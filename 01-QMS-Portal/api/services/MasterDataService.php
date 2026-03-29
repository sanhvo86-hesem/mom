<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Result object returned by MasterDataService mutation methods.
 */
final class MasterDataResult
{
    public function __construct(
        public readonly bool   $ok,
        public readonly string $message,
        public readonly ?array $data = null,
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
 * Master Data Governance Service (P0-01).
 *
 * Provides lifecycle management, duplicate detection, referential-integrity
 * checks, change-history logging, pending-approval workflow, and archival
 * for all master-data entity types (customers, suppliers, parts, revisions, capas).
 *
 * JSON storage layout under qms-data/master-data/:
 *   master-data.json         -- active records
 *   master-data-history.json -- change-history log
 *   master-data-pending.json -- pending-approval changes
 *   master-data-archive.json -- obsolete / archived records
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class MasterDataService
{
    // ── Entity configuration ────────────────────────────────────────────────

    /**
     * Map of entity type => primary-key field name.
     */
    private const ENTITY_KEYS = [
        'customers'  => 'customer_id',
        'suppliers'  => 'supplier_id',
        'parts'      => 'part_number',
        'revisions'  => 'revision_id',
        'capas'      => 'capa_number',
    ];

    /**
     * Map of entity type => field used for duplicate detection (natural key).
     */
    private const DUPLICATE_FIELDS = [
        'customers' => 'customer_name',
        'suppliers' => 'supplier_name',
        'parts'     => 'part_number',
        'revisions' => 'revision_id',
        'capas'     => 'capa_number',
    ];

    /**
     * Valid lifecycle statuses per entity type.
     * Statuses not listed here are rejected by changeStatus().
     */
    private const STATUS_MAP = [
        'customers'  => ['draft', 'active', 'inactive', 'obsolete'],
        'suppliers'  => ['draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete'],
        'parts'      => ['draft', 'active', 'inactive', 'obsolete'],
        'revisions'  => ['draft', 'released', 'superseded', 'obsolete'],
        'capas'      => ['draft', 'open', 'in_progress', 'closed', 'obsolete'],
    ];

    /**
     * Allowed status transitions: from => [to, ...].
     * Universal across entity types -- entity-specific statuses are filtered
     * by STATUS_MAP first.
     */
    private const TRANSITIONS = [
        'draft'       => ['active', 'approved', 'open', 'released'],
        'active'      => ['inactive', 'obsolete'],
        'approved'    => ['conditional', 'blocked', 'inactive', 'obsolete'],
        'conditional' => ['approved', 'blocked', 'inactive', 'obsolete'],
        'blocked'     => ['approved', 'conditional', 'inactive', 'obsolete'],
        'inactive'    => ['active', 'approved', 'obsolete'],
        'open'        => ['in_progress', 'closed', 'obsolete'],
        'in_progress' => ['closed', 'open', 'obsolete'],
        'released'    => ['superseded', 'obsolete'],
        'superseded'  => ['obsolete'],
        'closed'      => ['obsolete'],
        'obsolete'    => [],
    ];

    /**
     * Statuses that require approval before a field-level change takes effect.
     */
    private const APPROVAL_REQUIRED_STATUSES = ['active', 'approved', 'released'];

    // ── File paths ──────────────────────────────────────────────────────────

    private readonly string $masterFile;
    private readonly string $historyFile;
    private readonly string $pendingFile;
    private readonly string $archiveFile;
    private readonly string $ordersDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(private readonly string $dataDir)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $mdDir = $base . '/master-data';

        $this->masterFile  = $mdDir . '/master-data.json';
        $this->historyFile = $mdDir . '/master-data-history.json';
        $this->pendingFile = $mdDir . '/master-data-pending.json';
        $this->archiveFile = $mdDir . '/master-data-archive.json';
        $this->ordersDir   = $base . '/orders';

        if (!is_dir($mdDir)) {
            @mkdir($mdDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Create a new master-data record.
     *
     * Performs duplicate detection and assigns lifecycle status "draft".
     *
     * @param string $entityType One of: customers, suppliers, parts, revisions, capas.
     * @param array  $data       Field values. Must include the entity's primary-key field.
     * @param string $userId     Creating user identifier.
     * @return MasterDataResult
     */
    public function create(string $entityType, array $data, string $userId): MasterDataResult
    {
        if (!$this->isValidEntity($entityType)) {
            return new MasterDataResult(false, 'Invalid entity type.', errorCode: 'invalid_entity');
        }

        $idKey = self::ENTITY_KEYS[$entityType];
        $id    = trim((string)($data[$idKey] ?? ''));
        if ($id === '') {
            return new MasterDataResult(false, "Missing required key field: {$idKey}.", errorCode: 'missing_key');
        }

        // Duplicate detection
        $existingId = $this->checkDuplicate($entityType, $data);
        if ($existingId !== null) {
            return new MasterDataResult(
                false,
                "Duplicate detected: existing record {$existingId}.",
                errorCode: 'duplicate',
                data: ['existing_id' => $existingId],
            );
        }

        $store = $this->loadStore();

        // Ensure no record with same primary key
        foreach (($store[$entityType] ?? []) as $row) {
            if (is_array($row) && (string)($row[$idKey] ?? '') === $id) {
                return new MasterDataResult(false, "Record with {$idKey} = {$id} already exists.", errorCode: 'duplicate_key');
            }
        }

        $now = $this->nowIso();
        $record = array_merge($data, [
            $idKey       => $id,
            'status'     => 'draft',
            'created_at' => $now,
            'created_by' => $userId,
            'updated_at' => $now,
            'updated_by' => $userId,
        ]);

        $store[$entityType]   = array_values($store[$entityType] ?? []);
        $store[$entityType][] = $record;
        $this->saveStore($store);

        $this->logHistory($entityType, $id, 'create', [], $record, $userId, 'Initial creation');

        return new MasterDataResult(true, 'Record created.', data: $record);
    }

    /**
     * Update an existing master-data record.
     *
     * If the record is in an approval-required status (active/approved/released),
     * the changes are placed in the pending-approval queue instead of being
     * applied immediately.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Primary-key value.
     * @param array  $changes    Field => new-value map.
     * @param string $userId     Requesting user.
     * @param string $reason     Reason for change.
     * @return MasterDataResult
     */
    public function update(string $entityType, string $entityId, array $changes, string $userId, string $reason): MasterDataResult
    {
        if (!$this->isValidEntity($entityType)) {
            return new MasterDataResult(false, 'Invalid entity type.', errorCode: 'invalid_entity');
        }

        $store  = $this->loadStore();
        $idKey  = self::ENTITY_KEYS[$entityType];
        $record = $this->findRecord($store, $entityType, $entityId);

        if ($record === null) {
            return new MasterDataResult(false, 'Record not found.', errorCode: 'not_found');
        }

        $currentStatus = (string)($record['status'] ?? 'draft');

        // If status requires approval, queue changes
        if (in_array($currentStatus, self::APPROVAL_REQUIRED_STATUSES, true)) {
            return $this->queuePendingChange($entityType, $entityId, $changes, $userId, $reason, $record);
        }

        // Direct update
        return $this->applyUpdate($store, $entityType, $entityId, $changes, $userId, $reason);
    }

    /**
     * Delete a master-data record (soft: marks as obsolete, then archives).
     *
     * Checks referential integrity before proceeding.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Primary-key value.
     * @param string $userId     Requesting user.
     * @return MasterDataResult
     */
    public function delete(string $entityType, string $entityId, string $userId): MasterDataResult
    {
        if (!$this->isValidEntity($entityType)) {
            return new MasterDataResult(false, 'Invalid entity type.', errorCode: 'invalid_entity');
        }

        // Referential integrity
        $refs = $this->checkReferentialIntegrity($entityType, $entityId);
        if (!empty($refs)) {
            return new MasterDataResult(
                false,
                'Cannot delete: record is referenced by other entities.',
                errorCode: 'referential_integrity',
                data: ['references' => $refs],
            );
        }

        $store  = $this->loadStore();
        $record = $this->findRecord($store, $entityType, $entityId);
        if ($record === null) {
            return new MasterDataResult(false, 'Record not found.', errorCode: 'not_found');
        }

        // Remove from active store
        $idKey = self::ENTITY_KEYS[$entityType];
        $store[$entityType] = array_values(array_filter(
            $store[$entityType] ?? [],
            static fn ($r) => is_array($r) && (string)($r[$idKey] ?? '') !== $entityId,
        ));
        $this->saveStore($store);

        // Archive
        $record['status']      = 'obsolete';
        $record['deleted_at']  = $this->nowIso();
        $record['deleted_by']  = $userId;
        $this->archiveRecord($entityType, $record);

        $this->logHistory($entityType, $entityId, 'delete', $record, [], $userId, 'Record deleted and archived');

        return new MasterDataResult(true, 'Record deleted and archived.', data: $record);
    }

    /**
     * Transition a record through the lifecycle.
     *
     * Validates that the transition is allowed, then updates the record's
     * status. When moving to "obsolete", the record is also archived.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Primary-key value.
     * @param string $newStatus  Target status.
     * @param string $userId     Requesting user.
     * @return bool True if transition succeeded.
     */
    public function changeStatus(string $entityType, string $entityId, string $newStatus, string $userId): bool
    {
        if (!$this->isValidEntity($entityType)) {
            return false;
        }

        $validStatuses = self::STATUS_MAP[$entityType] ?? [];
        if (!in_array($newStatus, $validStatuses, true)) {
            return false;
        }

        $store  = $this->loadStore();
        $idKey  = self::ENTITY_KEYS[$entityType];
        $record = $this->findRecord($store, $entityType, $entityId);

        if ($record === null) {
            return false;
        }

        $currentStatus = (string)($record['status'] ?? 'draft');
        $allowed       = self::TRANSITIONS[$currentStatus] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            return false;
        }

        // Filter by entity-valid statuses
        if (!in_array($newStatus, $validStatuses, true)) {
            return false;
        }

        $now = $this->nowIso();

        // Apply status change in store
        foreach ($store[$entityType] as $idx => $row) {
            if (!is_array($row) || (string)($row[$idKey] ?? '') !== $entityId) {
                continue;
            }
            $store[$entityType][$idx]['status']     = $newStatus;
            $store[$entityType][$idx]['updated_at']  = $now;
            $store[$entityType][$idx]['updated_by']  = $userId;

            $this->logHistory(
                $entityType,
                $entityId,
                'status_change',
                ['status' => $currentStatus],
                ['status' => $newStatus],
                $userId,
                "Status: {$currentStatus} -> {$newStatus}",
            );

            // If obsolete, archive and remove from active
            if ($newStatus === 'obsolete') {
                $archived = $store[$entityType][$idx];
                $archived['archived_at'] = $now;
                $archived['archived_by'] = $userId;
                $this->archiveRecord($entityType, $archived);

                unset($store[$entityType][$idx]);
                $store[$entityType] = array_values($store[$entityType]);
            }

            $this->saveStore($store);
            return true;
        }

        return false;
    }

    /**
     * Return the full change-history log for a given entity record.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Primary-key value.
     * @return array List of history entries, newest first.
     */
    public function getHistory(string $entityType, string $entityId): array
    {
        $history = $this->loadHistory();
        $entries = $history['entries'] ?? [];

        $filtered = array_filter($entries, static function (array $e) use ($entityType, $entityId): bool {
            return ($e['entity_type'] ?? '') === $entityType
                && ($e['entity_id'] ?? '') === $entityId;
        });

        // Sort newest first
        usort($filtered, static fn (array $a, array $b) => strcmp(
            (string)($b['changed_at'] ?? ''),
            (string)($a['changed_at'] ?? ''),
        ));

        return array_values($filtered);
    }

    /**
     * Check for a duplicate record by natural-key field.
     *
     * @param string $entityType Entity type.
     * @param array  $data       Record data to check.
     * @return string|null Existing primary-key value if duplicate found, null otherwise.
     */
    public function checkDuplicate(string $entityType, array $data): ?string
    {
        if (!$this->isValidEntity($entityType)) {
            return null;
        }

        $dupField = self::DUPLICATE_FIELDS[$entityType] ?? null;
        if ($dupField === null) {
            return null;
        }

        $needle = mb_strtolower(trim((string)($data[$dupField] ?? '')));
        if ($needle === '') {
            return null;
        }

        $store = $this->loadStore();
        $idKey = self::ENTITY_KEYS[$entityType];

        foreach (($store[$entityType] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $existing = mb_strtolower(trim((string)($row[$dupField] ?? '')));
            if ($existing === $needle) {
                return (string)($row[$idKey] ?? '');
            }
        }

        return null;
    }

    /**
     * Check referential integrity: which orders or other entities reference
     * this record?
     *
     * - Cannot delete a customer if any SO references its customer_id.
     * - Cannot delete a part if any JO references its part_number.
     * - Cannot delete a supplier if any part has it as preferred_supplier_id.
     * - Cannot delete a revision if any JO references its part_revision.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Primary-key value.
     * @return array List of referencing records [{type, id, field}, ...].
     */
    public function checkReferentialIntegrity(string $entityType, string $entityId): array
    {
        $refs = [];

        $orders = $this->loadOrders();

        switch ($entityType) {
            case 'customers':
                // Check SOs referencing this customer_id
                foreach (($orders['sales_orders'] ?? []) as $so) {
                    if (!is_array($so)) continue;
                    if ((string)($so['customer_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'sales_order',
                            'id'    => (string)($so['so_number'] ?? ''),
                            'field' => 'customer_id',
                        ];
                    }
                }
                break;

            case 'parts':
                // Check JOs referencing this part_number
                foreach (($orders['job_orders'] ?? []) as $jo) {
                    if (!is_array($jo)) continue;
                    if ((string)($jo['part_number'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'job_order',
                            'id'    => (string)($jo['jo_number'] ?? ''),
                            'field' => 'part_number',
                        ];
                    }
                }
                break;

            case 'suppliers':
                // Check parts referencing this supplier
                $store = $this->loadStore();
                foreach (($store['parts'] ?? []) as $part) {
                    if (!is_array($part)) continue;
                    if ((string)($part['preferred_supplier_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'part',
                            'id'    => (string)($part['part_number'] ?? ''),
                            'field' => 'preferred_supplier_id',
                        ];
                    }
                }
                break;

            case 'revisions':
                // Check JOs referencing this revision
                foreach (($orders['job_orders'] ?? []) as $jo) {
                    if (!is_array($jo)) continue;
                    if ((string)($jo['part_revision'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'job_order',
                            'id'    => (string)($jo['jo_number'] ?? ''),
                            'field' => 'part_revision',
                        ];
                    }
                }
                break;
        }

        return $refs;
    }

    /**
     * Approve a pending change, applying it to the active store.
     *
     * @param string $changeId   Unique change identifier.
     * @param string $approverId Approving user.
     * @return bool True on success.
     */
    public function approvePendingChange(string $changeId, string $approverId): bool
    {
        $pending = $this->loadPending();
        $entries = $pending['entries'] ?? [];
        $found   = null;
        $foundIdx = -1;

        foreach ($entries as $idx => $entry) {
            if (($entry['change_id'] ?? '') === $changeId && ($entry['status'] ?? '') === 'pending') {
                $found    = $entry;
                $foundIdx = $idx;
                break;
            }
        }

        if ($found === null) {
            return false;
        }

        $entityType = (string)($found['entity_type'] ?? '');
        $entityId   = (string)($found['entity_id'] ?? '');
        $changes    = (array)($found['changes'] ?? []);
        $userId     = (string)($found['requested_by'] ?? 'system');
        $reason     = (string)($found['reason'] ?? 'Approved change');

        // Apply the update
        $store  = $this->loadStore();
        $result = $this->applyUpdate($store, $entityType, $entityId, $changes, $userId, $reason);

        if (!$result->ok) {
            return false;
        }

        // Mark pending entry as approved
        $now = $this->nowIso();
        $entries[$foundIdx]['status']      = 'approved';
        $entries[$foundIdx]['approved_by'] = $approverId;
        $entries[$foundIdx]['approved_at'] = $now;
        $pending['entries'] = $entries;
        $this->savePending($pending);

        return true;
    }

    /**
     * Reject a pending change.
     *
     * @param string $changeId   Unique change identifier.
     * @param string $approverId Rejecting user.
     * @param string $reason     Rejection reason.
     * @return bool True on success.
     */
    public function rejectPendingChange(string $changeId, string $approverId, string $reason): bool
    {
        $pending = $this->loadPending();
        $entries = $pending['entries'] ?? [];

        foreach ($entries as $idx => $entry) {
            if (($entry['change_id'] ?? '') === $changeId && ($entry['status'] ?? '') === 'pending') {
                $now = $this->nowIso();
                $entries[$idx]['status']       = 'rejected';
                $entries[$idx]['rejected_by']  = $approverId;
                $entries[$idx]['rejected_at']  = $now;
                $entries[$idx]['reject_reason'] = $reason;
                $pending['entries'] = $entries;
                $this->savePending($pending);
                return true;
            }
        }

        return false;
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /**
     * Validate entity type.
     */
    private function isValidEntity(string $entityType): bool
    {
        return isset(self::ENTITY_KEYS[$entityType]);
    }

    /**
     * Find a record by primary key within a loaded store.
     */
    private function findRecord(array $store, string $entityType, string $entityId): ?array
    {
        $idKey = self::ENTITY_KEYS[$entityType];
        foreach (($store[$entityType] ?? []) as $row) {
            if (is_array($row) && (string)($row[$idKey] ?? '') === $entityId) {
                return $row;
            }
        }
        return null;
    }

    /**
     * Apply field-level updates directly to the store.
     */
    private function applyUpdate(
        array  $store,
        string $entityType,
        string $entityId,
        array  $changes,
        string $userId,
        string $reason,
    ): MasterDataResult {
        $idKey   = self::ENTITY_KEYS[$entityType];
        $now     = $this->nowIso();
        $updated = null;

        foreach ($store[$entityType] as $idx => $row) {
            if (!is_array($row) || (string)($row[$idKey] ?? '') !== $entityId) {
                continue;
            }

            $oldValues = [];
            $newValues = [];

            foreach ($changes as $field => $newValue) {
                // Never allow changing the primary key or system fields
                if (in_array($field, [$idKey, 'created_at', 'created_by'], true)) {
                    continue;
                }
                $oldValues[$field] = $row[$field] ?? null;
                $newValues[$field] = $newValue;
                $store[$entityType][$idx][$field] = $newValue;
            }

            $store[$entityType][$idx]['updated_at'] = $now;
            $store[$entityType][$idx]['updated_by'] = $userId;

            $this->logHistory($entityType, $entityId, 'update', $oldValues, $newValues, $userId, $reason);

            $updated = $store[$entityType][$idx];
            break;
        }

        if ($updated === null) {
            return new MasterDataResult(false, 'Record not found.', errorCode: 'not_found');
        }

        $this->saveStore($store);

        return new MasterDataResult(true, 'Record updated.', data: $updated);
    }

    /**
     * Queue a change for approval.
     */
    private function queuePendingChange(
        string $entityType,
        string $entityId,
        array  $changes,
        string $userId,
        string $reason,
        array  $currentRecord,
    ): MasterDataResult {
        $now      = $this->nowIso();
        $changeId = 'CHG-' . substr(md5($entityType . $entityId . $now . random_int(0, 99999)), 0, 12);

        // Build field-level diff
        $fieldChanges = [];
        foreach ($changes as $field => $newValue) {
            $fieldChanges[] = [
                'field_name' => $field,
                'old_value'  => $currentRecord[$field] ?? null,
                'new_value'  => $newValue,
            ];
        }

        $entry = [
            'change_id'    => $changeId,
            'entity_type'  => $entityType,
            'entity_id'    => $entityId,
            'changes'      => $changes,
            'field_changes' => $fieldChanges,
            'reason'       => $reason,
            'requested_by' => $userId,
            'requested_at' => $now,
            'status'       => 'pending',
        ];

        $pending = $this->loadPending();
        $pending['entries']   = $pending['entries'] ?? [];
        $pending['entries'][] = $entry;
        $this->savePending($pending);

        $this->logHistory($entityType, $entityId, 'change_requested', [], $changes, $userId, "Pending approval: {$reason}");

        return new MasterDataResult(
            true,
            'Change queued for approval.',
            data: ['change_id' => $changeId, 'status' => 'pending'],
        );
    }

    /**
     * Log a change-history entry.
     */
    private function logHistory(
        string $entityType,
        string $entityId,
        string $action,
        array  $oldValues,
        array  $newValues,
        string $changedBy,
        string $reason,
    ): void {
        $history = $this->loadHistory();
        $history['entries'] = $history['entries'] ?? [];

        $entry = [
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'action'      => $action,
            'changed_by'  => $changedBy,
            'changed_at'  => $this->nowIso(),
            'reason'      => $reason,
            'field_changes' => [],
        ];

        // Build per-field change entries
        $allFields = array_unique(array_merge(array_keys($oldValues), array_keys($newValues)));
        foreach ($allFields as $field) {
            $entry['field_changes'][] = [
                'field_name' => $field,
                'old_value'  => $oldValues[$field] ?? null,
                'new_value'  => $newValues[$field] ?? null,
            ];
        }

        $history['entries'][] = $entry;
        $this->saveHistory($history);
    }

    /**
     * Append a record to the archive store.
     */
    private function archiveRecord(string $entityType, array $record): void
    {
        $archive = $this->loadArchive();
        $archive[$entityType]   = $archive[$entityType] ?? [];
        $archive[$entityType][] = $record;
        $this->saveArchive($archive);
    }

    // ── File I/O helpers ────────────────────────────────────────────────────

    private function loadStore(): array
    {
        return $this->readJson($this->masterFile) ?? $this->defaultStore();
    }

    private function saveStore(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();
        $this->writeJson($this->masterFile, $data);
    }

    private function loadHistory(): array
    {
        return $this->readJson($this->historyFile) ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
    }

    private function saveHistory(array $data): void
    {
        $this->writeJson($this->historyFile, $data);
    }

    private function loadPending(): array
    {
        return $this->readJson($this->pendingFile) ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
    }

    private function savePending(array $data): void
    {
        $this->writeJson($this->pendingFile, $data);
    }

    private function loadArchive(): array
    {
        return $this->readJson($this->archiveFile) ?? ['_meta' => ['version' => '1.0']];
    }

    private function saveArchive(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();
        $this->writeJson($this->archiveFile, $data);
    }

    private function loadOrders(): array
    {
        $file = $this->ordersDir . '/orders.json';
        return $this->readJson($file) ?? ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
    }

    private function defaultStore(): array
    {
        return [
            '_meta'     => ['version' => '1.0', 'updated' => $this->nowIso()],
            'customers' => [],
            'suppliers' => [],
            'parts'     => [],
            'revisions' => [],
            'capas'     => [],
        ];
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
        $tmp  = $path . '.tmp';
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        @rename($tmp, $path);
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
