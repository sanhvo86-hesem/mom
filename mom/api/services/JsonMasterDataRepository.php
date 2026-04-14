<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * JSON compatibility adapter for master-data persistence.
 */
final class JsonMasterDataRepository implements MasterDataRepository
{
    private readonly string $masterFile;
    private readonly string $historyFile;
    private readonly string $pendingFile;
    private readonly string $archiveFile;
    private readonly string $ordersFile;
    private readonly string $mesRuntimeFile;

    /**
     * @param array<string, mixed> $defaultStore
     */
    public function __construct(
        string $dataDir,
        private readonly array $defaultStore,
    ) {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $mdDir = $base . '/master-data';

        $this->masterFile = $mdDir . '/master-data.json';
        $this->historyFile = $mdDir . '/master-data-history.json';
        $this->pendingFile = $mdDir . '/master-data-pending.json';
        $this->archiveFile = $mdDir . '/master-data-archive.json';
        $this->ordersFile = $base . '/orders/orders.json';
        $this->mesRuntimeFile = $base . '/mes/mes-runtime.json';

        $this->ensureDirectory($mdDir);
    }

    public function loadStore(): array
    {
        return $this->readJson($this->masterFile) ?? $this->defaultStore;
    }

    public function saveStore(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();
        $this->writeJson($this->masterFile, $data);
    }

    public function loadHistory(): array
    {
        return $this->readJson($this->historyFile) ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
    }

    public function saveHistory(array $data): void
    {
        $this->writeJson($this->historyFile, $data);
    }

    public function loadPending(): array
    {
        return $this->readJson($this->pendingFile) ?? ['_meta' => ['version' => '1.0'], 'entries' => []];
    }

    public function savePending(array $data): void
    {
        $this->writeJson($this->pendingFile, $data);
    }

    public function loadArchive(): array
    {
        return $this->readJson($this->archiveFile) ?? ['_meta' => ['version' => '1.0']];
    }

    public function saveArchive(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();
        $this->writeJson($this->archiveFile, $data);
    }

    public function loadOrders(): array
    {
        return $this->readJson($this->ordersFile) ?? ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
    }

    public function loadMesRuntime(): array
    {
        return $this->readJson($this->mesRuntimeFile) ?? [
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
            'primary_backend' => 'json',
            'shadow_backend' => '',
            'shadow_write_active' => false,
            'stores' => [
                'active' => 'master-data/master-data.json',
                'history' => 'master-data/master-data-history.json',
                'pending' => 'master-data/master-data-pending.json',
                'archive' => 'master-data/master-data-archive.json',
            ],
            'drift_detection' => [
                'shadow_path_present' => false,
                'mismatch_counter' => 0,
                'data_layer_declares_postgres' => (bool)($dataLayerSummary['use_postgres'] ?? false),
                'data_layer_mode' => (string)($dataLayerSummary['mode'] ?? ''),
            ],
            'notes' => 'JSON compatibility adapter owns active, history, pending approval, archive, and reference stores.',
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
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

    /**
     * @param array<string, mixed> $data
     */
    private function writeJson(string $path, array $data): void
    {
        $this->ensureDirectory(dirname($path));
        $tmp = $path . '.tmp';
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function ensureDirectory(string $dir): void
    {
        if (is_dir($dir)) {
            return;
        }
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize master-data storage.');
        }
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
