<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;

final class PostgresMasterDataRepository implements MasterDataRepository
{
    /**
     * @param array<string, mixed> $defaultStore
     */
    public function __construct(
        private readonly Connection $db,
        private readonly string $dataDir,
        private readonly array $defaultStore,
        private readonly string $mode,
        private readonly ?JsonMasterDataRepository $jsonBridge = null,
        private readonly ?MasterDataFallbackTelemetry $telemetry = null,
    ) {
    }

    public function loadStore(): array
    {
        try {
            $rows = $this->db->query(
                'SELECT entity_type, entity_id, status, data, created_at, updated_at, created_by, updated_by
                   FROM master_data_store
                  ORDER BY entity_type, entity_id'
            );
            $store = $this->defaultStore;
            foreach ($rows as $row) {
                $entity = trim((string)($row['entity_type'] ?? ''));
                $entityId = trim((string)($row['entity_id'] ?? ''));
                if ($entity === '' || $entityId === '') {
                    continue;
                }
                $data = $this->decodeJsonb($row['data'] ?? null);
                $record = array_merge($data, [
                    $this->idFieldForEntity($entity, $data) => $entityId,
                    'status' => (string)($row['status'] ?? ($data['status'] ?? 'active')),
                    'created_at' => (string)($row['created_at'] ?? ($data['created_at'] ?? '')),
                    'updated_at' => (string)($row['updated_at'] ?? ($data['updated_at'] ?? '')),
                    'created_by' => (string)($row['created_by'] ?? ($data['created_by'] ?? '')),
                    'updated_by' => (string)($row['updated_by'] ?? ($data['updated_by'] ?? '')),
                ]);
                $store[$entity] = is_array($store[$entity] ?? null) ? $store[$entity] : [];
                $store[$entity][] = $record;
            }

            if ($rows === [] && $this->mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY) {
                return $this->fallbackStore('postgres_empty', ['row_count' => 0]);
            }

            $store['_meta'] = is_array($store['_meta'] ?? null) ? $store['_meta'] : [];
            $store['_meta']['authority_backend'] = 'postgres';
            $store['_meta']['authority_mode'] = $this->mode;

            return $store;
        } catch (\Throwable $e) {
            if ($this->mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY) {
                return $this->fallbackStore('postgres_read_failed', ['error' => $e->getMessage()]);
            }
            throw new RuntimeException('PostgreSQL master-data store is unavailable: ' . $e->getMessage(), previous: $e);
        }
    }

    public function saveStore(array $data): void
    {
        $this->db->transactional(function () use ($data): void {
            foreach ($this->entityNames($data) as $entity) {
                $rows = array_values(array_filter((array)($data[$entity] ?? []), 'is_array'));
                $this->db->execute('DELETE FROM master_data_store WHERE entity_type = :entity_type', [
                    ':entity_type' => $entity,
                ]);
                foreach ($rows as $row) {
                    $entityId = $this->entityIdForRecord($entity, $row);
                    if ($entityId === '') {
                        throw new RuntimeException("Missing master-data entity id for {$entity}");
                    }
                    $json = json_encode($row, JSON_UNESCAPED_SLASHES);
                    if (!is_string($json)) {
                        throw new RuntimeException("Unable to encode master-data row for {$entity}");
                    }
                    $this->db->execute(
                        'INSERT INTO master_data_store (entity_type, entity_id, status, data, created_by, updated_by, updated_at)
                         VALUES (:entity_type, :entity_id, :status, CAST(:data AS jsonb), :created_by, :updated_by, NOW())
                         ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                             status = EXCLUDED.status,
                             data = EXCLUDED.data,
                             updated_by = EXCLUDED.updated_by,
                             updated_at = NOW()',
                        [
                            ':entity_type' => $entity,
                            ':entity_id' => $entityId,
                            ':status' => (string)($row['status'] ?? 'active'),
                            ':data' => $json,
                            ':created_by' => (string)($row['created_by'] ?? ''),
                            ':updated_by' => (string)($row['updated_by'] ?? ''),
                        ]
                    );
                }
            }
        });

        if ($this->shadowJsonWriteAllowed()) {
            $shadow = $data;
            $shadow['_meta'] = is_array($shadow['_meta'] ?? null) ? $shadow['_meta'] : [];
            $shadow['_meta']['runtime_authority'] = 'postgres_shadow_export';
            $shadow['_meta']['updated'] = gmdate('c');
            $this->jsonBridge()?->saveStore($shadow);
        }
    }

    public function loadHistory(): array
    {
        try {
            $rows = $this->db->query('SELECT payload FROM master_data_history_event ORDER BY changed_at DESC, event_id DESC');
            return [
                '_meta' => ['version' => '1.0', 'authority_backend' => 'postgres'],
                'entries' => array_values(array_map(fn(array $row): array => $this->decodeJsonb($row['payload'] ?? null), $rows)),
            ];
        } catch (\Throwable $e) {
            if ($this->mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY) {
                $this->telemetry?->recordFallbackRead('history', 'postgres_history_read_failed', ['error' => $e->getMessage()]);
                return $this->jsonBridge()?->loadHistory() ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
            }
            throw $e;
        }
    }

    public function saveHistory(array $data): void
    {
        $entries = array_values(array_filter((array)($data['entries'] ?? []), 'is_array'));
        $this->db->transactional(function () use ($entries): void {
            $this->db->execute('DELETE FROM master_data_history_event');
            foreach ($entries as $entry) {
                $json = json_encode($entry, JSON_UNESCAPED_SLASHES);
                if (!is_string($json)) {
                    continue;
                }
                $this->db->execute(
                    "INSERT INTO master_data_history_event (entity_type, entity_id, action_name, changed_at, changed_by, payload)
                     VALUES (:entity_type, :entity_id, :action_name, COALESCE(CAST(NULLIF(:changed_at, '') AS timestamptz), NOW()), :changed_by, CAST(:payload AS jsonb))",
                    [
                        ':entity_type' => (string)($entry['entity_type'] ?? ''),
                        ':entity_id' => (string)($entry['entity_id'] ?? ''),
                        ':action_name' => (string)($entry['action'] ?? $entry['action_name'] ?? ''),
                        ':changed_at' => (string)($entry['changed_at'] ?? ''),
                        ':changed_by' => (string)($entry['changed_by'] ?? ''),
                        ':payload' => $json,
                    ]
                );
            }
        });
        if ($this->shadowJsonWriteAllowed()) {
            $this->jsonBridge()?->saveHistory($data);
        }
    }

    public function loadPending(): array
    {
        try {
            $rows = $this->db->query('SELECT payload FROM master_data_pending_change ORDER BY requested_at DESC, pending_id DESC');
            return [
                '_meta' => ['version' => '1.0', 'authority_backend' => 'postgres'],
                'entries' => array_values(array_map(fn(array $row): array => $this->decodeJsonb($row['payload'] ?? null), $rows)),
            ];
        } catch (\Throwable $e) {
            if ($this->mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY) {
                $this->telemetry?->recordFallbackRead('pending', 'postgres_pending_read_failed', ['error' => $e->getMessage()]);
                return $this->jsonBridge()?->loadPending() ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
            }
            throw $e;
        }
    }

    public function savePending(array $data): void
    {
        $entries = array_values(array_filter((array)($data['entries'] ?? []), 'is_array'));
        $this->db->transactional(function () use ($entries): void {
            $this->db->execute('DELETE FROM master_data_pending_change');
            foreach ($entries as $entry) {
                $json = json_encode($entry, JSON_UNESCAPED_SLASHES);
                if (!is_string($json)) {
                    continue;
                }
                $this->db->execute(
                    "INSERT INTO master_data_pending_change (entity_type, entity_id, requested_by, requested_at, payload)
                     VALUES (:entity_type, :entity_id, :requested_by, COALESCE(CAST(NULLIF(:requested_at, '') AS timestamptz), NOW()), CAST(:payload AS jsonb))",
                    [
                        ':entity_type' => (string)($entry['entity_type'] ?? ''),
                        ':entity_id' => (string)($entry['entity_id'] ?? ''),
                        ':requested_by' => (string)($entry['requested_by'] ?? $entry['changed_by'] ?? ''),
                        ':requested_at' => (string)($entry['requested_at'] ?? $entry['changed_at'] ?? ''),
                        ':payload' => $json,
                    ]
                );
            }
        });
        if ($this->shadowJsonWriteAllowed()) {
            $this->jsonBridge()?->savePending($data);
        }
    }

    public function loadArchive(): array
    {
        try {
            $rows = $this->db->query('SELECT entity_type, entity_id, payload FROM master_data_archive_store ORDER BY archived_at DESC, archive_id DESC');
            $archive = ['_meta' => ['version' => '1.0', 'authority_backend' => 'postgres']];
            foreach ($rows as $row) {
                $entity = (string)($row['entity_type'] ?? '');
                if ($entity === '') {
                    continue;
                }
                $archive[$entity] = is_array($archive[$entity] ?? null) ? $archive[$entity] : [];
                $archive[$entity][] = $this->decodeJsonb($row['payload'] ?? null);
            }
            return $archive;
        } catch (\Throwable $e) {
            if ($this->mode === MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY) {
                $this->telemetry?->recordFallbackRead('archive', 'postgres_archive_read_failed', ['error' => $e->getMessage()]);
                return $this->jsonBridge()?->loadArchive() ?? ['_meta' => ['version' => '1.0']];
            }
            throw $e;
        }
    }

    public function saveArchive(array $data): void
    {
        $this->db->transactional(function () use ($data): void {
            $this->db->execute('DELETE FROM master_data_archive_store');
            foreach ($this->entityNames($data) as $entity) {
                foreach (array_values(array_filter((array)($data[$entity] ?? []), 'is_array')) as $row) {
                    $entityId = $this->entityIdForRecord($entity, $row);
                    $json = json_encode($row, JSON_UNESCAPED_SLASHES);
                    if ($entityId === '' || !is_string($json)) {
                        continue;
                    }
                    $this->db->execute(
                        'INSERT INTO master_data_archive_store (entity_type, entity_id, status, archived_by, payload)
                         VALUES (:entity_type, :entity_id, :status, :archived_by, CAST(:payload AS jsonb))',
                        [
                            ':entity_type' => $entity,
                            ':entity_id' => $entityId,
                            ':status' => (string)($row['status'] ?? 'obsolete'),
                            ':archived_by' => (string)($row['archived_by'] ?? $row['deleted_by'] ?? ''),
                            ':payload' => $json,
                        ]
                    );
                }
            }
        });
        if ($this->shadowJsonWriteAllowed()) {
            $this->jsonBridge()?->saveArchive($data);
        }
    }

    public function loadOrders(): array
    {
        return $this->jsonBridge()?->loadOrders() ?? ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
    }

    public function loadMesRuntime(): array
    {
        return $this->jsonBridge()?->loadMesRuntime() ?? [
            'downtime_events' => [],
            'maintenance_requests' => [],
            'progress_reports' => [],
            'tooling_status' => [],
            'connector_feeds' => [],
            'machine_signals' => [],
            'mes_connectivity_events' => [],
            'machine_alarm_events' => [],
            'nc_download_receipts' => [],
            'mes_tool_preset_offsets' => [],
        ];
    }

    /**
     * @param array<string, mixed> $dataLayerSummary
     * @return array<string, mixed>
     */
    public function authorityProbe(array $dataLayerSummary = []): array
    {
        return [
            'repository_class' => self::class,
            'primary_backend' => 'postgres',
            'shadow_backend' => $this->shadowJsonWriteAllowed() ? 'json_export' : '',
            'shadow_write_active' => $this->shadowJsonWriteAllowed(),
            'authority_mode' => $this->mode,
            'stores' => [
                'active' => 'postgres:master_data_store',
                'history' => 'postgres:master_data_history_event',
                'pending' => 'postgres:master_data_pending_change',
                'archive' => 'postgres:master_data_archive_store',
            ],
            'drift_detection' => [
                'runner' => MasterDataDriftReconciliationRunner::class,
                'fallback_telemetry' => MasterDataFallbackTelemetry::class,
                'data_layer_mode' => (string)($dataLayerSummary['mode'] ?? $this->mode),
            ],
            'notes' => 'PostgreSQL master_data_store is the governed master-data repository; JSON is compatibility export/fallback only where mode permits.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fallbackStore(string $reason, array $context): array
    {
        if ($this->jsonBridge === null) {
            throw new RuntimeException('PostgreSQL master-data fallback requested but JSON bridge is unavailable.');
        }

        $this->telemetry?->recordFallbackRead('master_data_store', $reason, $context);
        $store = $this->jsonBridge->loadStore();
        $store['_meta'] = is_array($store['_meta'] ?? null) ? $store['_meta'] : [];
        $store['_meta']['authority_backend'] = 'json_fallback';
        $store['_meta']['fallback_reason'] = $reason;

        return $store;
    }

    private function shadowJsonWriteAllowed(): bool
    {
        return in_array($this->mode, [
            MasterDataAuthorityModeService::MODE_SHADOW_WRITE,
            MasterDataAuthorityModeService::MODE_POSTGRES_PRIMARY,
        ], true);
    }

    private function jsonBridge(): ?JsonMasterDataRepository
    {
        return $this->jsonBridge;
    }

    /**
     * @param mixed $value
     * @return array<string, mixed>
     */
    private function decodeJsonb(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $store
     * @return array<int, string>
     */
    private function entityNames(array $store): array
    {
        return array_values(array_filter(array_keys($store), static fn(string $key): bool => $key !== '' && $key[0] !== '_' && is_array($store[$key] ?? null)));
    }

    /**
     * @param array<string, mixed> $row
     */
    private function entityIdForRecord(string $entity, array $row): string
    {
        $field = $this->idFieldForEntity($entity, $row);
        return trim((string)($row[$field] ?? $row['entity_id'] ?? ''));
    }

    /**
     * @param array<string, mixed> $row
     */
    private function idFieldForEntity(string $entity, array $row = []): string
    {
        $fields = [
            'customers' => 'customer_id',
            'customer_sites' => 'site_id',
            'commercial_accounts' => 'account_id',
            'suppliers' => 'supplier_id',
            'parts' => 'part_number',
            'revisions' => 'revision_id',
            'incoterms' => 'incoterm_code',
            'payment_terms' => 'payment_term_code',
            'shipping_methods' => 'shipping_method_id',
            'promise_policies' => 'promise_policy_id',
            'routing_library' => 'routing_id',
            'bom_library' => 'bom_id',
            'control_plans' => 'control_plan_id',
            'inspection_plans' => 'inspection_plan_id',
            'traveler_templates' => 'traveler_template_id',
            'quality_gate_profiles' => 'quality_gate_profile_id',
            'launch_gate_templates' => 'gate_template_id',
            'customer_item_approvals' => 'approval_id',
            'supplier_process_approvals' => 'approval_id',
            'warehouse_locations' => 'warehouse_id',
            'defect_catalog' => 'defect_code',
            'nc_program_releases' => 'program_id',
            'capas' => 'capa_number',
            'work_centers' => 'work_center_id',
            'machines' => 'machine_id',
            'operators' => 'operator_id',
            'tooling_assets' => 'tool_id',
            'downtime_reason_codes' => 'reason_code',
            'downtime_resolution_codes' => 'resolution_code',
            'mes_connectivity_adapters' => 'adapter_id',
            'mes_alarm_catalog' => 'alarm_code',
            'mes_alarm_playbooks' => 'playbook_id',
            'tool_assemblies' => 'assembly_id',
        ];

        if (isset($fields[$entity])) {
            return $fields[$entity];
        }
        foreach (array_keys($row) as $key) {
            if (str_ends_with((string)$key, '_id') || str_ends_with((string)$key, '_code') || str_ends_with((string)$key, '_number')) {
                return (string)$key;
            }
        }

        return 'entity_id';
    }
}
