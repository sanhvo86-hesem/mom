<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;
use Throwable;

/**
 * File-backed replay store for mutation idempotency.
 *
 * The store persists a request fingerprint plus the successful response
 * payload and serializes duplicate requests with a per-key file lock.
 */
final class IdempotencyService
{
    private string $storeDir;
    private bool $enabled;
    private int $ttlSeconds;
    private int $retryWindowSeconds;

    public function __construct(string $dataDir)
    {
        $this->storeDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/idempotency';
        $configPath = dirname(__DIR__) . '/config.php';
        $config = is_file($configPath) ? (array)(require $configPath) : [];
        $idempotency = is_array($config['idempotency'] ?? null) ? $config['idempotency'] : [];
        $this->enabled = (bool)($idempotency['enabled'] ?? true);
        $this->ttlSeconds = max(300, (int)($idempotency['ttl_seconds'] ?? 86400));
        $this->retryWindowSeconds = max(15, (int)($idempotency['retry_window_seconds'] ?? 120));
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function retryWindowSeconds(): int
    {
        return $this->retryWindowSeconds;
    }

    /**
     * @param array<string, mixed> $descriptor
     * @param callable():array{status_code:int, payload:array<string, mixed>} $operation
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}
     */
    public function execute(array $descriptor, callable $operation): array
    {
        if (!$this->enabled) {
            $result = $operation();
            return [
                'status_code' => max(200, (int)($result['status_code'] ?? 200)),
                'payload' => is_array($result['payload'] ?? null) ? (array)$result['payload'] : [],
                'replayed' => false,
                'stored_at' => '',
            ];
        }

        $scopeKey = trim((string)($descriptor['scope_key'] ?? ''));
        $rawKey = $this->normalizeKey((string)($descriptor['key'] ?? ''));
        if ($scopeKey === '' || $rawKey === '') {
            throw new RuntimeException('Idempotency descriptor is incomplete.');
        }

        $fingerprint = $this->fingerprint(is_array($descriptor['fingerprint'] ?? null) ? (array)$descriptor['fingerprint'] : []);
        $ttlSeconds = $this->descriptorTtlSeconds($descriptor);
        $path = $this->statePath($scopeKey, $rawKey);
        $lockPath = $path . '.lock';
        $this->ensureDirectory(dirname($path));

        $handle = @fopen($lockPath, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Unable to open idempotency lock.');
        }

        try {
            if (!@flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock idempotency state.');
            }

            $existing = $this->readState($path);
            if ($existing !== null && !$this->isExpired($existing)) {
                $storedFingerprint = trim((string)($existing['fingerprint'] ?? ''));
                if ($storedFingerprint !== '' && !hash_equals($storedFingerprint, $fingerprint)) {
                    throw new RecordConflictException('Idempotency key was already used for a different request fingerprint.');
                }

                if (($existing['status'] ?? '') === 'completed' && is_array($existing['response_payload'] ?? null)) {
                    return [
                        'status_code' => max(200, (int)($existing['status_code'] ?? 200)),
                        'payload' => (array)$existing['response_payload'],
                        'replayed' => true,
                        'stored_at' => (string)($existing['completed_at'] ?? $existing['updated_at'] ?? ''),
                    ];
                }
            }

            $startedAt = $this->nowIso();
            $state = [
                'version' => '1.0',
                'status' => 'in_progress',
                'scope_key' => $scopeKey,
                'fingerprint' => $fingerprint,
                'key_source' => (string)($descriptor['key_source'] ?? ''),
                'mode' => (string)($descriptor['mode'] ?? ''),
                'kind' => (string)($descriptor['kind'] ?? ''),
                'domain' => (string)($descriptor['domain'] ?? ''),
                'table' => (string)($descriptor['table'] ?? ''),
                'user_id' => (string)($descriptor['user_id'] ?? ''),
                'ttl_seconds' => $ttlSeconds,
                'created_at' => $startedAt,
                'updated_at' => $startedAt,
                'expires_at' => gmdate('c', time() + $ttlSeconds),
            ];
            $this->writeState($path, $state);

            try {
                $result = $operation();
            } catch (Throwable $e) {
                $state['status'] = 'failed';
                $state['updated_at'] = $this->nowIso();
                $state['error_class'] = $e::class;
                $state['error_message'] = $e->getMessage();
                $this->writeState($path, $state);
                throw $e;
            }

            $completedAt = $this->nowIso();
            $payload = is_array($result['payload'] ?? null) ? (array)$result['payload'] : [];
            $statusCode = max(200, (int)($result['status_code'] ?? 200));

            $state['status'] = 'completed';
            $state['updated_at'] = $completedAt;
            $state['completed_at'] = $completedAt;
            $state['status_code'] = $statusCode;
            $state['response_payload'] = $payload;
            unset($state['error_class'], $state['error_message']);
            $this->writeState($path, $state);

            return [
                'status_code' => $statusCode,
                'payload' => $payload,
                'replayed' => false,
                'stored_at' => $completedAt,
            ];
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    private function normalizeKey(string $value): string
    {
        $key = trim($value);
        if ($key === '') {
            return '';
        }
        if (strlen($key) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $key) !== 1) {
            throw new RuntimeException('Invalid idempotency key token.');
        }

        return $key;
    }

    /**
     * @param array<string, mixed> $descriptor
     */
    private function descriptorTtlSeconds(array $descriptor): int
    {
        $raw = $descriptor['ttl_seconds'] ?? null;
        if ($raw === null || $raw === '') {
            return $this->ttlSeconds;
        }
        if (!is_scalar($raw)) {
            throw new RuntimeException('Invalid idempotency ttl token.');
        }

        return max(15, (int)$raw);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function fingerprint(array $payload): string
    {
        $normalized = $this->normalizeForHash($payload);
        $encoded = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            throw new RuntimeException('Unable to encode idempotency fingerprint.');
        }

        return hash('sha256', $encoded);
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private function normalizeForHash(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $isList = array_keys($value) === range(0, count($value) - 1);
        if ($isList) {
            return array_map(fn($item) => $this->normalizeForHash($item), $value);
        }

        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->normalizeForHash($item);
        }

        return $value;
    }

    private function statePath(string $scopeKey, string $rawKey): string
    {
        $hash = hash('sha256', $scopeKey . '|' . $rawKey);
        $bucket = substr($hash, 0, 2);
        return $this->storeDir . '/' . $bucket . '/' . $hash . '.json';
    }

    private function ensureDirectory(string $dir): void
    {
        if (is_dir($dir)) {
            return;
        }
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize idempotency storage.');
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readState(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function writeState(string $path, array $state): void
    {
        $this->ensureDirectory(dirname($path));
        $tmp = $path . '.tmp';
        $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode idempotency state.');
        }
        if (@file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException('Unable to persist idempotency state.');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to finalize idempotency state.');
        }
    }

    /**
     * @param array<string, mixed> $state
     */
    private function isExpired(array $state): bool
    {
        $expiresAt = trim((string)($state['expires_at'] ?? ''));
        if ($expiresAt === '') {
            return false;
        }
        $ts = strtotime($expiresAt);
        return $ts !== false && $ts < time();
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
