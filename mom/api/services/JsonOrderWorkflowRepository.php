<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * JSON compatibility adapter for order workflow persistence.
 */
final class JsonOrderWorkflowRepository implements OrderWorkflowRepository
{
    private readonly string $configFile;
    private readonly string $ordersFile;
    private readonly string $usersFile;
    private int $shadowWriteAttempts = 0;
    private int $shadowWriteFailures = 0;
    private string $lastShadowError = '';

    public function __construct(
        private readonly string $dataDir,
        private readonly ?object $db = null,
    ) {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->configFile = $base . '/config/so_jo_wo_config.json';
        $this->ordersFile = $base . '/orders/orders.json';
        $this->usersFile = $base . '/config/users.json';
    }

    public function loadConfig(): array
    {
        return $this->readJson($this->configFile) ?? [];
    }

    public function loadUsers(): array
    {
        $users = $this->readJson($this->usersFile);
        return is_array($users) ? array_values($users) : [];
    }

    public function loadOrders(): array
    {
        return $this->readJson($this->ordersFile) ?? [
            '_meta' => ['version' => '1.0'],
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [],
        ];
    }

    public function saveOrders(array $data): void
    {
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
        $data['_meta']['updated'] = $this->nowIso();

        $this->writeJson($this->ordersFile, $data);
        $this->shadowWriteOrders($data);
    }

    public function appendImmutableAuditEvent(string $orderType, string $orderId, array $event): void
    {
        $base = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $logDir = $base . '/orders/audit_trail';
        $this->ensureDirectory($logDir);

        $safeOrderId = preg_replace('/[^A-Za-z0-9_-]/', '_', $orderId) ?: 'unknown';
        $logFile = $logDir . '/' . $safeOrderId . '.jsonl';

        $prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        if (is_file($logFile)) {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!empty($lines)) {
                $lastLine = end($lines);
                $lastEvent = json_decode((string)$lastLine, true);
                if (is_array($lastEvent)) {
                    $prevHash = (string)($lastEvent['event_hash'] ?? $prevHash);
                }
            }
        }

        $event['order_type'] = $orderType;
        $event['order_id'] = $orderId;
        $event['prev_hash'] = $prevHash;
        $event['event_hash'] = hash('sha256', (string)json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($line === false || @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Unable to append order audit event.');
        }
    }

    public function appendOrderNotification(array $notification): void
    {
        $base = rtrim(str_replace('\\', '/', $this->dataDir), '/');
        $queueDir = $base . '/notifications';
        $this->ensureDirectory($queueDir);

        $line = json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($line === false || @file_put_contents($queueDir . '/order_notifications.jsonl', $line . "\n", FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Unable to append order notification.');
        }
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
            'shadow_backend' => $this->db !== null ? 'postgres' : '',
            'shadow_write_active' => $this->db !== null,
            'shadow_write_attempts' => $this->shadowWriteAttempts,
            'shadow_write_failures' => $this->shadowWriteFailures,
            'last_shadow_error' => $this->lastShadowError,
            'drift_detection' => [
                'shadow_path_present' => $this->db !== null,
                'mismatch_counter' => $this->shadowWriteFailures,
                'data_layer_declares_postgres' => (bool)($dataLayerSummary['use_postgres'] ?? false),
                'data_layer_mode' => (string)($dataLayerSummary['mode'] ?? ''),
            ],
            'notes' => 'JSON compatibility adapter owns order store, audit JSONL, notification JSONL, and optional PostgreSQL shadow writes.',
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function shadowWriteOrders(array $data): void
    {
        if ($this->db === null) {
            return;
        }

        $this->shadowWriteAttempts++;

        try {
            if (method_exists($this->db, 'isConnected') && !$this->db->isConnected()) {
                return;
            }

            foreach (($data['sales_orders'] ?? []) as $so) {
                if (!is_array($so) || empty($so['so_number'] ?? '')) {
                    continue;
                }
                $this->upsertOrderRow('sales_orders', 'sales_order_number', (string)$so['so_number'], $so);
            }

            foreach (($data['job_orders'] ?? []) as $jo) {
                if (!is_array($jo) || empty($jo['jo_number'] ?? '')) {
                    continue;
                }
                $this->upsertOrderRow('job_orders', 'job_number', (string)$jo['jo_number'], $jo);
            }

            foreach (($data['work_orders'] ?? []) as $wo) {
                if (!is_array($wo) || empty($wo['wo_number'] ?? '')) {
                    continue;
                }
                $this->upsertWorkOrderRow($wo);
            }
        } catch (\Throwable $e) {
            $this->shadowWriteFailures++;
            $this->lastShadowError = $e->getMessage();
            error_log('[OrderWorkflowRepository] Shadow write to PostgreSQL failed: ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function upsertOrderRow(string $table, string $idColumn, string $idValue, array $row): void
    {
        if ($this->db === null) {
            return;
        }

        $status = (string)($row['status'] ?? 'draft');
        $metadata = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($metadata === false) {
            throw new RuntimeException('Unable to encode order metadata.');
        }
        $updatedAt = (string)($row['updated_at'] ?? $this->nowIso());
        $statusColumn = match ($table) {
            'sales_orders' => 'so_status',
            'job_orders' => 'job_status',
            default => throw new RuntimeException('Unsupported shadow-write table: ' . $table),
        };

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
                    "UPDATE {$table} SET {$statusColumn} = :status, metadata = :meta::jsonb, updated_at = :at::timestamptz WHERE {$idColumn} = :id",
                    [':status' => $status, ':meta' => $metadata, ':at' => $updatedAt, ':id' => $idValue],
                );
                return;
            }

            $this->db->execute(
                "INSERT INTO {$table} ({$idColumn}, {$statusColumn}, metadata, created_at, updated_at) VALUES (:id, :status, :meta::jsonb, :at::timestamptz, :at::timestamptz)
                 ON CONFLICT ({$idColumn}) DO UPDATE SET {$statusColumn} = EXCLUDED.{$statusColumn}, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at",
                [':id' => $idValue, ':status' => $status, ':meta' => $metadata, ':at' => $updatedAt],
            );
        } catch (\Throwable $e) {
            $this->shadowWriteFailures++;
            $this->lastShadowError = $e->getMessage();
            error_log("[OrderWorkflowRepository] Upsert {$table}.{$idValue} failed: " . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $wo
     */
    private function upsertWorkOrderRow(array $wo): void
    {
        if ($this->db === null) {
            return;
        }

        $woNumber = (string)($wo['wo_number'] ?? '');
        if ($woNumber === '') {
            return;
        }

        $status = (string)($wo['status'] ?? 'scheduled');
        $metadata = json_encode($wo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($metadata === false) {
            throw new RuntimeException('Unable to encode work-order metadata.');
        }

        try {
            $this->db->execute(
                "INSERT INTO job_operations (operation_code, status, metadata, created_at)
                 VALUES (:wo, :status, :meta::jsonb, NOW())
                 ON CONFLICT (operation_code) DO UPDATE SET status = EXCLUDED.status, metadata = EXCLUDED.metadata",
                [':wo' => $woNumber, ':status' => $status, ':meta' => $metadata],
            );
        } catch (\Throwable $e) {
            $this->shadowWriteFailures++;
            $this->lastShadowError = $e->getMessage();
            error_log("[OrderWorkflowRepository] Upsert WO {$woNumber} failed: " . $e->getMessage());
        }
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
        $tmp = $path . '.tmp.' . getmypid();
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

    private function ensureDirectory(string $dir): void
    {
        if (is_dir($dir)) {
            return;
        }
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize order workflow storage.');
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
