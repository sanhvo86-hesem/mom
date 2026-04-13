<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * Mutation idempotency coordinator.
 *
 * PostgreSQL is the authoritative replay ledger when the existing database
 * configuration enables it. JSON-only runtimes keep an explicit file fallback.
 */
final class IdempotencyService
{
    private bool $enabled;
    private int $ttlSeconds;
    private int $retryWindowSeconds;
    private IdempotencyReplayRepository $repository;

    public function __construct(
        string $dataDir,
        ?CacheService $cacheService = null,
        ?IdempotencyReplayRepository $repository = null,
        ?array $databaseConfig = null,
    ) {
        unset($cacheService);

        $apiConfigPath = dirname(__DIR__) . '/config.php';
        $apiConfig = is_file($apiConfigPath) ? (array)(require $apiConfigPath) : [];
        $idempotency = is_array($apiConfig['idempotency'] ?? null) ? $apiConfig['idempotency'] : [];
        $this->enabled = (bool)($idempotency['enabled'] ?? true);
        $this->ttlSeconds = max(300, (int)($idempotency['ttl_seconds'] ?? 86400));
        $this->retryWindowSeconds = max(15, (int)($idempotency['retry_window_seconds'] ?? 120));
        $this->repository = $repository ?? $this->defaultRepository($dataDir, $databaseConfig);
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
     * @param callable():array{status_code?:int, payload?:array<string, mixed>} $operation
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
        $idempotencyKey = $this->normalizeKey((string)($descriptor['key'] ?? ''));
        if ($scopeKey === '' || $idempotencyKey === '') {
            throw new RuntimeException('Idempotency descriptor is incomplete.');
        }

        $fingerprintHash = $this->fingerprint(is_array($descriptor['fingerprint'] ?? null) ? (array)$descriptor['fingerprint'] : []);
        $ttlSeconds = $this->descriptorTtlSeconds($descriptor);
        $startedAt = $this->nowIso();
        $state = $this->baseState($descriptor, $scopeKey, $idempotencyKey, $fingerprintHash, $ttlSeconds, $startedAt);

        return $this->repository->execute(
            $state,
            $idempotencyKey,
            $fingerprintHash,
            $this->retryWindowSeconds,
            $operation,
        );
    }

    private function defaultRepository(string $dataDir, ?array $databaseConfig): IdempotencyReplayRepository
    {
        $dbConfig = $databaseConfig ?? (array)(require dirname(__DIR__, 2) . '/database/config.php');
        if ((bool)($dbConfig['use_postgres'] ?? false)) {
            return new PostgresIdempotencyReplayRepository(Connection::getInstance($dbConfig));
        }

        return new FileIdempotencyReplayRepository($dataDir);
    }

    /**
     * @param array<string, mixed> $descriptor
     * @return array<string, mixed>
     */
    private function baseState(
        array $descriptor,
        string $scopeKey,
        string $idempotencyKey,
        string $fingerprintHash,
        int $ttlSeconds,
        string $startedAt,
    ): array {
        return [
            'version' => '2.0',
            'status' => 'in_progress',
            'scope_key' => $scopeKey,
            'idempotency_key' => $idempotencyKey,
            'fingerprint_hash' => $fingerprintHash,
            'fingerprint' => $fingerprintHash,
            'key_source' => (string)($descriptor['key_source'] ?? ''),
            'mode' => (string)($descriptor['mode'] ?? ''),
            'kind' => (string)($descriptor['kind'] ?? ''),
            'domain' => (string)($descriptor['domain'] ?? ''),
            'table' => (string)($descriptor['table'] ?? ''),
            'user_id' => (string)($descriptor['user_id'] ?? ''),
            'metadata' => is_array($descriptor['metadata'] ?? null) ? (array)$descriptor['metadata'] : [],
            'ttl_seconds' => $ttlSeconds,
            'created_at' => $startedAt,
            'updated_at' => $startedAt,
            'expires_at' => gmdate('c', time() + $ttlSeconds),
        ];
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

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
