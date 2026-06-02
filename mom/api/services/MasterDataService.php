<?php

declare(strict_types=1);

namespace MOM\Services;

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
 * Persistence layout is owned by MasterDataRepository adapters.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class MasterDataService
{
    // ── Entity configuration ────────────────────────────────────────────────

    /**
     * Map of entity type => primary-key field name.
     */
    private const ENTITY_KEYS = [
        'customers'                 => 'customer_id',
        'customer_sites'            => 'site_id',
        'commercial_accounts'       => 'account_id',
        'suppliers'                 => 'supplier_id',
        'parts'                     => 'part_number',
        'revisions'                 => 'revision_id',
        'incoterms'                 => 'incoterm_code',
        'payment_terms'             => 'payment_term_code',
        'shipping_methods'          => 'shipping_method_id',
        'promise_policies'          => 'promise_policy_id',
        'routing_library'           => 'routing_id',
        'bom_library'               => 'bom_id',
        'control_plans'             => 'control_plan_id',
        'inspection_plans'          => 'inspection_plan_id',
        'traveler_templates'        => 'traveler_template_id',
        'quality_gate_profiles'     => 'quality_gate_profile_id',
        'launch_gate_templates'     => 'gate_template_id',
        'customer_item_approvals'   => 'approval_id',
        'supplier_process_approvals'=> 'approval_id',
        'warehouse_locations'       => 'warehouse_id',
        'defect_catalog'            => 'defect_code',
        'nc_program_releases'       => 'program_id',
        'capas'                     => 'capa_number',
        'work_centers'              => 'work_center_id',
        'machines'                  => 'machine_id',
        'operators'                 => 'operator_id',
        'tooling_assets'            => 'tool_id',
        'downtime_reason_codes'     => 'reason_code',
        'downtime_resolution_codes' => 'resolution_code',
        'mes_connectivity_adapters' => 'adapter_id',
        'mes_alarm_catalog'         => 'alarm_code',
        'mes_alarm_playbooks'       => 'playbook_id',
        'tool_assemblies'           => 'assembly_id',
    ];

    /**
     * Map of entity type => field used for duplicate detection (natural key).
     */
    private const DUPLICATE_FIELDS = [
        'customers'                 => 'customer_name',
        'customer_sites'            => 'site_name',
        'commercial_accounts'       => 'account_owner',
        'suppliers'                 => 'supplier_name',
        'parts'                     => 'part_number',
        'revisions'                 => 'revision_id',
        'incoterms'                 => 'incoterm_name',
        'payment_terms'             => 'payment_term_name',
        'shipping_methods'          => 'shipping_method_name',
        'promise_policies'          => 'policy_name',
        'routing_library'           => 'routing_name',
        'bom_library'               => 'bom_name',
        'control_plans'             => 'control_plan_name',
        'inspection_plans'          => 'inspection_plan_name',
        'traveler_templates'        => 'traveler_template_name',
        'quality_gate_profiles'     => 'profile_name',
        'launch_gate_templates'     => 'gate_name',
        'customer_item_approvals'   => 'approval_id',
        'supplier_process_approvals'=> 'approval_id',
        'warehouse_locations'       => 'warehouse_name',
        'defect_catalog'            => 'defect_name',
        'nc_program_releases'       => 'program_id',
        'capas'                     => 'capa_number',
        'work_centers'              => 'work_center_name',
        'machines'                  => 'machine_name',
        'operators'                 => 'operator_id',
        'tooling_assets'            => 'tool_id',
        'downtime_reason_codes'     => 'reason_code',
        'downtime_resolution_codes' => 'resolution_code',
        'mes_connectivity_adapters' => 'adapter_id',
        'mes_alarm_catalog'         => 'alarm_code',
        'mes_alarm_playbooks'       => 'playbook_id',
        'tool_assemblies'           => 'assembly_id',
    ];

    /**
     * Valid lifecycle statuses per entity type.
     * Statuses not listed here are rejected by changeStatus().
     */
    private const STATUS_MAP = [
        'customers'                 => ['draft', 'active', 'inactive', 'blocked', 'obsolete'],
        'customer_sites'            => ['draft', 'active', 'inactive', 'blocked', 'obsolete'],
        'commercial_accounts'       => ['draft', 'active', 'inactive', 'blocked', 'obsolete'],
        'suppliers'                 => ['draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete'],
        'parts'                     => ['draft', 'active', 'inactive', 'obsolete'],
        'revisions'                 => ['draft', 'released', 'superseded', 'obsolete'],
        'incoterms'                 => ['draft', 'active', 'inactive', 'obsolete'],
        'payment_terms'             => ['draft', 'active', 'inactive', 'obsolete'],
        'shipping_methods'          => ['draft', 'active', 'inactive', 'obsolete'],
        'promise_policies'          => ['draft', 'active', 'inactive', 'obsolete'],
        'routing_library'           => ['draft', 'released', 'superseded', 'obsolete'],
        'bom_library'               => ['draft', 'released', 'superseded', 'obsolete'],
        'control_plans'             => ['draft', 'released', 'superseded', 'obsolete'],
        'inspection_plans'          => ['draft', 'released', 'superseded', 'obsolete'],
        'traveler_templates'        => ['draft', 'released', 'superseded', 'obsolete'],
        'quality_gate_profiles'     => ['draft', 'active', 'inactive', 'obsolete'],
        'launch_gate_templates'     => ['draft', 'active', 'inactive', 'obsolete'],
        'customer_item_approvals'   => ['draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete'],
        'supplier_process_approvals'=> ['draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete'],
        'warehouse_locations'       => ['draft', 'active', 'inactive', 'obsolete'],
        'defect_catalog'            => ['draft', 'active', 'inactive', 'obsolete'],
        'nc_program_releases'       => ['draft', 'released', 'blocked', 'superseded', 'obsolete'],
        'capas'                     => ['draft', 'open', 'in_progress', 'closed', 'cancelled', 'obsolete'],
        'work_centers'              => ['draft', 'active', 'inactive', 'blocked', 'obsolete'],
        'machines'                  => ['draft', 'active', 'idle', 'maintenance', 'down', 'blocked', 'retired', 'obsolete'],
        'operators'                 => ['draft', 'active', 'inactive', 'training', 'blocked', 'obsolete'],
        'tooling_assets'            => ['draft', 'active', 'quarantine', 'retired', 'obsolete'],
        'downtime_reason_codes'     => ['draft', 'active', 'inactive', 'obsolete'],
        'downtime_resolution_codes' => ['draft', 'active', 'inactive', 'obsolete'],
        'mes_connectivity_adapters' => ['draft', 'active', 'inactive', 'blocked', 'obsolete'],
        'mes_alarm_catalog'         => ['draft', 'active', 'inactive', 'obsolete'],
        'mes_alarm_playbooks'       => ['draft', 'active', 'inactive', 'obsolete'],
        'tool_assemblies'           => ['draft', 'active', 'inactive', 'obsolete'],
    ];

    /**
     * Allowed status transitions: from => [to, ...].
     * Universal across entity types -- entity-specific statuses are filtered
     * by STATUS_MAP first.
     */
    private const TRANSITIONS = [
        'draft'       => ['active', 'approved', 'open', 'released', 'training', 'idle', 'maintenance', 'down', 'quarantine'],
        'active'      => ['inactive', 'obsolete'],
        'approved'    => ['conditional', 'blocked', 'inactive', 'obsolete'],
        'conditional' => ['approved', 'blocked', 'inactive', 'obsolete'],
        'blocked'     => ['approved', 'conditional', 'inactive', 'obsolete'],
        'inactive'    => ['active', 'approved', 'obsolete'],
        'open'        => ['in_progress', 'closed', 'cancelled', 'obsolete'],
        'in_progress' => ['closed', 'open', 'obsolete'],
        'released'    => ['blocked', 'superseded', 'obsolete'],
        'superseded'  => ['obsolete'],
        'idle'        => ['active', 'maintenance', 'down', 'blocked', 'retired', 'obsolete'],
        'maintenance' => ['active', 'idle', 'blocked', 'retired', 'obsolete'],
        'down'        => ['active', 'idle', 'maintenance', 'blocked', 'retired', 'obsolete'],
        'training'    => ['active', 'inactive', 'blocked', 'obsolete'],
        'quarantine'  => ['active', 'retired', 'obsolete'],
        'cancelled'   => ['obsolete'],
        'retired'     => ['obsolete'],
        'closed'      => ['obsolete'],
        'obsolete'    => [],
    ];

    private readonly MasterDataRepository $repository;
    private readonly MasterDataAuthorityModeService $authorityMode;
    private readonly MasterDataFallbackTelemetry $fallbackTelemetry;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data directory.
     */
    public function __construct(
        string $dataDir,
        mixed $rootDirOrRepository = null,
        ?MasterDataRepository $repository = null,
        ?MasterDataAuthorityModeService $authorityMode = null,
    )
    {
        $rootDir = is_string($rootDirOrRepository) ? $rootDirOrRepository : null;
        $this->authorityMode = $authorityMode ?? new MasterDataAuthorityModeService($dataDir, $rootDir);
        $this->fallbackTelemetry = new MasterDataFallbackTelemetry($dataDir);
        $explicitRepository = $repository
            ?? ($rootDirOrRepository instanceof MasterDataRepository ? $rootDirOrRepository : null);

        if ($explicitRepository instanceof MasterDataRepository) {
            $this->repository = $explicitRepository;
            return;
        }

        $jsonRepository = new JsonMasterDataRepository($dataDir, $this->defaultStore());
        if (!$this->authorityMode->usesPostgresRepository()) {
            $this->repository = $jsonRepository;
            return;
        }

        $config = (array)(require dirname(__DIR__, 2) . '/database/config.php');
        $this->repository = new PostgresMasterDataRepository(
            \MOM\Database\Connection::getInstance($config),
            $this->defaultStore(),
            $this->authorityMode->mode(),
            $jsonRepository,
            $this->fallbackTelemetry,
        );
    }

    /**
     * Report the master-data persistence posture explicitly. The current
     * default adapter is repository-bound but still JSON primary.
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
            ];

        $modeSummary = $this->authorityMode->summary();
        $primary = strtolower(trim((string)($repoProbe['primary_backend'] ?? 'custom')));
        $mode = (string)($modeSummary['mode'] ?? '');
        $readiness = match (true) {
            $primary === 'postgres' && $mode === MasterDataAuthorityModeService::MODE_POSTGRES_ONLY => 'authoritative_ready_postgres_only',
            $primary === 'postgres' && $mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY => 'authoritative_ready_with_fallback_telemetry',
            $primary === 'postgres' && $mode === MasterDataAuthorityModeService::MODE_SHADOW_WRITE => 'postgres_authority_shadow_export',
            $mode === MasterDataAuthorityModeService::MODE_JSON_ONLY => 'blocked_postgres_required',
            $primary === 'json' => 'blocked_postgres_required',
            default => 'degraded',
        };

        return array_merge($repoProbe, [
            'slice' => 'master_data',
            'readiness_state' => $readiness,
            'authoritative_primary' => str_starts_with($readiness, 'authoritative_ready') || $readiness === 'postgres_authority_shadow_export',
            'data_layer_mode' => (string)($dataLayerSummary['mode'] ?? ''),
            'postgres_configured' => (bool)($dataLayerSummary['use_postgres'] ?? false),
            'authority_mode' => $modeSummary,
            'fallback_telemetry' => $this->fallbackTelemetry->summary(),
            'notes' => $readiness === 'blocked_postgres_required'
                ? 'Master data governance commands are blocked until PostgreSQL authority mode is enabled. JSON is compatibility/read-only for governed roots.'
                : (string)($repoProbe['notes'] ?? ''),
        ]);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * List runtime records for a governed master-data entity.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listRecords(string $entityType): array
    {
        if (!$this->isValidEntity($entityType)) {
            return [];
        }

        return array_values(array_filter(
            (array)($this->loadStore()[$entityType] ?? []),
            'is_array',
        ));
    }

    /**
     * Fetch a single runtime record by governed entity key.
     */
    public function getRecord(string $entityType, string $entityId): ?array
    {
        if (!$this->isValidEntity($entityType)) {
            return null;
        }

        return $this->findRecord($this->loadStore(), $entityType, $entityId);
    }

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
        return $this->blockedGovernedCommandResult('create', $entityType);
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
        return $this->blockedGovernedCommandResult('update', $entityType);
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
        return $this->blockedGovernedCommandResult('delete', $entityType);
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
        $this->assertLegacyMutationBlocked('changeStatus', $entityType);

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

        $needle = strtolower(trim((string)($data[$dupField] ?? '')));
        if ($needle === '') {
            return null;
        }

        $store = $this->loadStore();
        $idKey = self::ENTITY_KEYS[$entityType];

        foreach (($store[$entityType] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $existing = strtolower(trim((string)($row[$dupField] ?? '')));
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
        $store = $this->loadStore();
        $runtime = $this->loadMesRuntime();

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
                foreach (($store['revisions'] ?? []) as $revision) {
                    if (!is_array($revision)) continue;
                    if ((string)($revision['part_number'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'revision',
                            'id'    => (string)($revision['revision_id'] ?? ''),
                            'field' => 'part_number',
                        ];
                    }
                }
                foreach (($store['nc_program_releases'] ?? []) as $release) {
                    if (!is_array($release)) continue;
                    if ((string)($release['part_number'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'nc_program_release',
                            'id'    => (string)($release['program_id'] ?? ''),
                            'field' => 'part_number',
                        ];
                    }
                }
                break;

            case 'suppliers':
                // Check parts referencing this supplier
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
                foreach (($store['tooling_assets'] ?? []) as $tool) {
                    if (!is_array($tool)) continue;
                    if ((string)($tool['supplier_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'tooling_asset',
                            'id'    => (string)($tool['tool_id'] ?? ''),
                            'field' => 'supplier_id',
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

            case 'nc_program_releases':
                foreach (($orders['work_orders'] ?? []) as $wo) {
                    if (!is_array($wo)) continue;
                    if ((string)($wo['nc_program_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'work_order',
                            'id'    => (string)($wo['wo_number'] ?? ''),
                            'field' => 'nc_program_id',
                        ];
                    }
                }
                foreach (($runtime['nc_download_receipts'] ?? []) as $receipt) {
                    if (!is_array($receipt)) continue;
                    if ((string)($receipt['program_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'nc_download_receipt',
                            'id'    => (string)($receipt['receipt_id'] ?? ''),
                            'field' => 'program_id',
                        ];
                    }
                }
                break;

            case 'work_centers':
                foreach (($store['machines'] ?? []) as $machine) {
                    if (!is_array($machine)) continue;
                    if ((string)($machine['work_center_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'machine',
                            'id'    => (string)($machine['machine_id'] ?? ''),
                            'field' => 'work_center_id',
                        ];
                    }
                }
                foreach (($store['nc_program_releases'] ?? []) as $release) {
                    if (!is_array($release)) continue;
                    if ((string)($release['work_center_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'nc_program_release',
                            'id'    => (string)($release['program_id'] ?? ''),
                            'field' => 'work_center_id',
                        ];
                    }
                }
                foreach (($orders['work_orders'] ?? []) as $wo) {
                    if (!is_array($wo)) continue;
                    if ((string)($wo['work_center_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'work_order',
                            'id'    => (string)($wo['wo_number'] ?? ''),
                            'field' => 'work_center_id',
                        ];
                    }
                }
                break;

            case 'machines':
                foreach (($orders['work_orders'] ?? []) as $wo) {
                    if (!is_array($wo)) continue;
                    if ((string)($wo['machine_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'work_order',
                            'id'    => (string)($wo['wo_number'] ?? ''),
                            'field' => 'machine_id',
                        ];
                    }
                }
                foreach (($store['mes_connectivity_adapters'] ?? []) as $adapter) {
                    if (!is_array($adapter)) continue;
                    if ((string)($adapter['machine_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'mes_connectivity_adapter',
                            'id'    => (string)($adapter['adapter_id'] ?? ''),
                            'field' => 'machine_id',
                        ];
                    }
                }
                $machineRuntimeTypes = [
                    'downtime_events' => 'downtime_event',
                    'maintenance_requests' => 'maintenance_request',
                    'progress_reports' => 'progress_report',
                    'tooling_status' => 'tooling_status',
                    'connector_feeds' => 'connector_feed',
                    'machine_signals' => 'machine_signal',
                    'machine_alarm_events' => 'machine_alarm_event',
                    'nc_download_receipts' => 'nc_download_receipt',
                    'mes_tool_preset_offsets' => 'tool_preset_offset',
                ];
                foreach ($machineRuntimeTypes as $collection => $referenceType) {
                    foreach (($runtime[$collection] ?? []) as $row) {
                        if (!is_array($row)) continue;
                        if ((string)($row['machine_id'] ?? '') === $entityId) {
                            $refs[] = [
                                'type'  => $referenceType,
                                'id'    => (string)($row['downtime_id'] ?? $row['request_id'] ?? $row['progress_id'] ?? $row['tool_runtime_id'] ?? $row['feed_id'] ?? $row['signal_id'] ?? $row['alarm_event_id'] ?? $row['receipt_id'] ?? $row['preset_id'] ?? ''),
                                'field' => 'machine_id',
                            ];
                        }
                    }
                }
                break;

            case 'operators':
                foreach (($orders['work_orders'] ?? []) as $wo) {
                    if (!is_array($wo)) continue;
                    if ((string)($wo['operator_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'work_order',
                            'id'    => (string)($wo['wo_number'] ?? ''),
                            'field' => 'operator_id',
                        ];
                    }
                }
                $operatorRuntimeTypes = [
                    'progress_reports' => 'progress_report',
                    'machine_signals' => 'machine_signal',
                ];
                foreach ($operatorRuntimeTypes as $collection => $referenceType) {
                    foreach (($runtime[$collection] ?? []) as $row) {
                        if (!is_array($row)) continue;
                        if ((string)($row['operator_id'] ?? '') === $entityId) {
                            $refs[] = [
                                'type'  => $referenceType,
                                'id'    => (string)($row['progress_id'] ?? $row['signal_id'] ?? ''),
                                'field' => 'operator_id',
                            ];
                        }
                    }
                }
                break;

            case 'tooling_assets':
                foreach (($store['tool_assemblies'] ?? []) as $assembly) {
                    if (!is_array($assembly)) continue;
                    if ((string)($assembly['parent_tool_id'] ?? '') === $entityId || (string)($assembly['component_tool_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'tool_assembly',
                            'id'    => (string)($assembly['assembly_id'] ?? ''),
                            'field' => (string)($assembly['parent_tool_id'] ?? '') === $entityId ? 'parent_tool_id' : 'component_tool_id',
                        ];
                    }
                }
                foreach (($runtime['tooling_status'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['tool_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'tooling_status',
                            'id'    => (string)($row['tool_runtime_id'] ?? ''),
                            'field' => 'tool_id',
                        ];
                    }
                }
                foreach (($runtime['mes_tool_preset_offsets'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['tool_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'tool_preset_offset',
                            'id'    => (string)($row['preset_id'] ?? ''),
                            'field' => 'tool_id',
                        ];
                    }
                }
                break;

            case 'downtime_reason_codes':
                foreach (($runtime['downtime_events'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['reason_code'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'downtime_event',
                            'id'    => (string)($row['downtime_id'] ?? ''),
                            'field' => 'reason_code',
                        ];
                    }
                }
                break;

            case 'downtime_resolution_codes':
                foreach (($runtime['downtime_events'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['resolution_code'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'downtime_event',
                            'id'    => (string)($row['downtime_id'] ?? ''),
                            'field' => 'resolution_code',
                        ];
                    }
                }
                break;

            case 'mes_connectivity_adapters':
                foreach (($runtime['mes_connectivity_events'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['adapter_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'mes_connectivity_event',
                            'id'    => (string)($row['event_id'] ?? ''),
                            'field' => 'adapter_id',
                        ];
                    }
                }
                break;

            case 'mes_alarm_catalog':
                foreach (($store['mes_alarm_playbooks'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['alarm_code'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'mes_alarm_playbook',
                            'id'    => (string)($row['playbook_id'] ?? ''),
                            'field' => 'alarm_code',
                        ];
                    }
                }
                foreach (($runtime['machine_alarm_events'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['alarm_code'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'machine_alarm_event',
                            'id'    => (string)($row['alarm_event_id'] ?? ''),
                            'field' => 'alarm_code',
                        ];
                    }
                }
                break;

            case 'mes_alarm_playbooks':
                foreach (($runtime['machine_alarm_events'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['playbook_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'machine_alarm_event',
                            'id'    => (string)($row['alarm_event_id'] ?? ''),
                            'field' => 'playbook_id',
                        ];
                    }
                }
                break;

            case 'tool_assemblies':
                foreach (($runtime['mes_tool_preset_offsets'] ?? []) as $row) {
                    if (!is_array($row)) continue;
                    if ((string)($row['assembly_id'] ?? '') === $entityId) {
                        $refs[] = [
                            'type'  => 'tool_preset_offset',
                            'id'    => (string)($row['preset_id'] ?? ''),
                            'field' => 'assembly_id',
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
        $this->assertLegacyMutationBlocked('approvePendingChange', 'pending_change');
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
        $this->assertLegacyMutationBlocked('rejectPendingChange', 'pending_change');
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

    private function blockedGovernedCommandResult(string $operation, string $entityType): MasterDataResult
    {
        try {
            $this->authorityMode->assertGovernedCommandAllowed($operation . ':' . $entityType);
        } catch (MasterDataAuthorityException $e) {
            return new MasterDataResult(
                false,
                $e->getMessage(),
                data: $e->problemDetails(),
                errorCode: $e->codeName(),
            );
        }

        return new MasterDataResult(
            false,
            'Governed master-data mutation requires DomainCommandGateway.',
            data: $this->domainCommandRequiredProblem($operation, $entityType),
            errorCode: 'domain_command_required',
        );
    }

    private function assertLegacyMutationBlocked(string $operation, string $entityType): void
    {
        $this->authorityMode->assertGovernedCommandAllowed($operation . ':' . $entityType);
        throw new MasterDataAuthorityException(
            'domain_command_required',
            'Governed master-data mutation requires DomainCommandGateway.',
            $this->domainCommandRequiredProblem($operation, $entityType),
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function domainCommandRequiredProblem(string $operation, string $entityType): array
    {
        return [
            'type' => 'https://hesemeng.com/problems/domain-command-required',
            'title' => 'Domain command required',
            'status' => 409,
            'code' => 'domain_command_required',
            'detail' => 'Legacy MasterDataService mutation is read-only for governed roots. Use DomainCommandGateway.',
            'operation' => $operation,
            'entity_type' => $entityType,
            'authority' => 'DomainCommandGateway',
        ];
    }

    // ── File I/O helpers ────────────────────────────────────────────────────

    private function loadStore(): array
    {
        return $this->repository->loadStore();
    }

    private function saveStore(array $data): void
    {
        $this->repository->saveStore($data);
    }

    private function loadHistory(): array
    {
        return $this->repository->loadHistory();
    }

    private function saveHistory(array $data): void
    {
        $this->repository->saveHistory($data);
    }

    private function loadPending(): array
    {
        return $this->repository->loadPending();
    }

    private function savePending(array $data): void
    {
        $this->repository->savePending($data);
    }

    private function loadArchive(): array
    {
        return $this->repository->loadArchive();
    }

    private function saveArchive(array $data): void
    {
        $this->repository->saveArchive($data);
    }

    private function loadOrders(): array
    {
        return $this->repository->loadOrders();
    }

    private function loadMesRuntime(): array
    {
        return $this->repository->loadMesRuntime();
    }

    private function defaultStore(): array
    {
        return [
            '_meta'     => ['version' => '1.0', 'updated' => $this->nowIso()],
            'customers' => [],
            'customer_sites' => [],
            'commercial_accounts' => [],
            'suppliers' => [],
            'parts' => [],
            'revisions' => [],
            'incoterms' => [],
            'payment_terms' => [],
            'shipping_methods' => [],
            'promise_policies' => [],
            'routing_library' => [],
            'bom_library' => [],
            'control_plans' => [],
            'inspection_plans' => [],
            'traveler_templates' => [],
            'quality_gate_profiles' => [],
            'launch_gate_templates' => [],
            'customer_item_approvals' => [],
            'supplier_process_approvals' => [],
            'warehouse_locations' => [],
            'defect_catalog' => [],
            'nc_program_releases' => [],
            'capas' => [],
            'work_centers' => [],
            'machines' => [],
            'operators' => [],
            'tooling_assets' => [],
            'downtime_reason_codes' => [],
            'downtime_resolution_codes' => [],
            'mes_connectivity_adapters' => [],
            'mes_alarm_catalog' => [],
            'mes_alarm_playbooks' => [],
            'tool_assemblies' => [],
        ];
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
