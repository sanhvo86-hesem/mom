<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;
use RuntimeException;

require_once __DIR__ . '/MasterDataRepository.php';
require_once __DIR__ . '/JsonMasterDataRepository.php';
require_once dirname(__DIR__, 2) . '/database/DataLayer.php';

/**
 * Runtime cutover bridge between MasterDataService and DataLayer.
 *
 * Active master-data reads/writes use DataLayer mode semantics. History,
 * pending approval and archive stores remain JSON compatibility bridges until
 * the P31/P32 command/audit spine provides native PostgreSQL event storage.
 */
final class DataLayerMasterDataRepository implements MasterDataRepository
{
    public function __construct(
        private readonly DataLayer $dataLayer,
        private readonly JsonMasterDataRepository $jsonRepository,
    ) {}

    public function loadStore(): array
    {
        if ($this->dataLayer->getMode() === DataLayer::MODE_JSON_ONLY) {
            return $this->jsonRepository->loadStore();
        }

        return $this->dataLayer->getRuntimeMasterDataStore();
    }

    public function saveStore(array $data): void
    {
        $mode = $this->dataLayer->getMode();
        $data = $this->withAuthorityMeta($data, $mode);

        if ($mode === DataLayer::MODE_JSON_ONLY) {
            $this->jsonRepository->saveStore($data);
            return;
        }

        if ($mode === DataLayer::MODE_SHADOW_WRITE) {
            $this->jsonRepository->saveStore($data);
            if ($this->dataLayer->syncMasterDataStore($data) !== true) {
                $this->emitBridgeEvent('shadow_write_failed', $mode, 'syncMasterDataStore returned false');
            }
            return;
        }

        if ($this->dataLayer->syncMasterDataStore($data) !== true) {
            throw new RuntimeException('master_data_postgres_write_failed');
        }

        if ($mode === DataLayer::MODE_POSTGRES_PRIMARY) {
            $cache = $this->withAuthorityMeta($data, $mode, 'json_cache_after_postgres_write');
            $this->jsonRepository->saveStore($cache);
        }
    }

    public function loadHistory(): array
    {
        return $this->jsonRepository->loadHistory();
    }

    public function saveHistory(array $data): void
    {
        $this->emitBridgeEvent('history_json_bridge_write', $this->dataLayer->getMode(), 'history remains JSON compatibility bridge');
        $this->jsonRepository->saveHistory($data);
    }

    public function loadPending(): array
    {
        return $this->jsonRepository->loadPending();
    }

    public function savePending(array $data): void
    {
        $this->emitBridgeEvent('pending_json_bridge_write', $this->dataLayer->getMode(), 'pending approval remains JSON compatibility bridge');
        $this->jsonRepository->savePending($data);
    }

    public function loadArchive(): array
    {
        return $this->jsonRepository->loadArchive();
    }

    public function saveArchive(array $data): void
    {
        $this->emitBridgeEvent('archive_json_bridge_write', $this->dataLayer->getMode(), 'archive remains JSON compatibility bridge');
        $this->jsonRepository->saveArchive($data);
    }

    public function loadOrders(): array
    {
        if ($this->dataLayer->getMode() === DataLayer::MODE_JSON_ONLY) {
            return $this->jsonRepository->loadOrders();
        }

        return $this->dataLayer->getRuntimeOrdersStore();
    }

    public function loadMesRuntime(): array
    {
        if ($this->dataLayer->getMode() === DataLayer::MODE_JSON_ONLY) {
            return $this->jsonRepository->loadMesRuntime();
        }

        return $this->dataLayer->getRuntimeMesRuntimeStore();
    }

    /**
     * @param array<string, mixed> $dataLayerSummary
     * @return array<string, mixed>
     */
    public function authorityProbe(array $dataLayerSummary = []): array
    {
        $mode = $this->dataLayer->getMode();
        $postgresPrimary = in_array($mode, [DataLayer::MODE_POSTGRES_PRIMARY, DataLayer::MODE_POSTGRES_ONLY], true);
        $summary = $dataLayerSummary !== [] ? $dataLayerSummary : $this->dataLayer->getModeSummary();

        return [
            'repository_class' => self::class,
            'authority_mode' => $mode,
            'primary_backend' => $postgresPrimary ? 'postgres' : 'json',
            'shadow_backend' => $mode === DataLayer::MODE_SHADOW_WRITE ? 'postgres' : '',
            'shadow_write_active' => $mode === DataLayer::MODE_SHADOW_WRITE,
            'json_bridge_role' => match ($mode) {
                DataLayer::MODE_JSON_ONLY => 'primary_compatibility_store',
                DataLayer::MODE_SHADOW_WRITE => 'primary_with_postgres_shadow',
                DataLayer::MODE_POSTGRES_PRIMARY => 'fallback_cache_after_postgres_write',
                DataLayer::MODE_POSTGRES_ONLY => 'disabled_for_active_store',
                default => 'unknown',
            },
            'stores' => [
                'active' => $postgresPrimary ? 'postgres_runtime_mirror' : 'master-data/master-data.json',
                'history' => 'master-data/master-data-history.json',
                'pending' => 'master-data/master-data-pending.json',
                'archive' => 'master-data/master-data-archive.json',
            ],
            'drift_detection' => [
                'shadow_path_present' => $mode !== DataLayer::MODE_JSON_ONLY,
                'data_layer_mode' => $mode,
                'postgres_reachable' => (bool)($summary['postgres_reachable'] ?? false),
                'fallback_source' => (string)($this->dataLayer->getLastReadMeta()['source'] ?? ''),
                'fallback_active' => (bool)($this->dataLayer->getLastReadMeta()['fallback'] ?? false),
            ],
            'bridge_gaps' => [
                'history_pending_archive_json_bridge',
                'native_pg_command_ledger_deferred_to_p31_p32',
            ],
            'notes' => $postgresPrimary
                ? 'Active master data is routed through DataLayer PostgreSQL runtime mirror; JSON is cache/fallback except POSTGRES_ONLY.'
                : 'Active master data remains JSON compatibility authority until migration mode promotes PostgreSQL.',
        ];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function withAuthorityMeta(array $data, string $mode, string $jsonRole = ''): array
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['authority_mode'] = $mode;
        $data['_meta']['authority_bridge'] = 'DataLayerMasterDataRepository';
        if ($jsonRole !== '') {
            $data['_meta']['json_role'] = $jsonRole;
        }

        return $data;
    }

    private function emitBridgeEvent(string $event, string $mode, string $message): void
    {
        $encoded = json_encode([
            'event' => $event,
            'mode' => $mode,
            'message' => $message,
            'component' => 'DataLayerMasterDataRepository',
        ], JSON_UNESCAPED_SLASHES);
        if (is_string($encoded)) {
            error_log('[hesem.master_data_cutover] ' . $encoded);
        }
    }
}
