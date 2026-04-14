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
    /** @var array<string, mixed> */
    private array $databaseConfig;
    /** @var array<string, int> */
    private array $metrics = [
        'first_execution' => 0,
        'replay' => 0,
        'conflict' => 0,
        'fingerprint_conflict' => 0,
        'in_progress_conflict' => 0,
        'fallback_execution' => 0,
        'postgres_execution' => 0,
        'failure' => 0,
        'disabled_passthrough' => 0,
    ];

    public function __construct(
        string $dataDir,
        ?CacheService $cacheService = null,
        ?IdempotencyReplayRepository $repository = null,
        ?array $databaseConfig = null,
    ) {
        $apiConfigPath = dirname(__DIR__) . '/config.php';
        $apiConfig = is_file($apiConfigPath) ? (array)(require $apiConfigPath) : [];
        $idempotency = is_array($apiConfig['idempotency'] ?? null) ? $apiConfig['idempotency'] : [];
        $this->enabled = (bool)($idempotency['enabled'] ?? true);
        $this->ttlSeconds = max(300, (int)($idempotency['ttl_seconds'] ?? 86400));
        $this->retryWindowSeconds = max(15, (int)($idempotency['retry_window_seconds'] ?? 120));
        $this->databaseConfig = $databaseConfig ?? $this->loadDatabaseConfig();
        $this->repository = $repository ?? $this->defaultRepository($dataDir, $cacheService, $this->databaseConfig);
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
     * @return array<string, mixed>
     */
    public function backendProbe(): array
    {
        $repositoryClass = $this->repository::class;
        $backend = $this->backendName();
        $expectsPostgres = $this->expectsPostgresAuthority();
        $readiness = $backend === 'postgres'
            ? 'authoritative_ready'
            : ($expectsPostgres ? 'degraded' : 'compatibility_only');

        return [
            'enabled' => $this->enabled,
            'repository_class' => $repositoryClass,
            'backend' => $backend,
            'authoritative' => $backend === 'postgres',
            'fallback_only' => in_array($backend, ['cache', 'file'], true),
            'expected_backend' => $expectsPostgres ? 'postgres_primary' : 'fallback_allowed',
            'active_backend' => $backend === 'postgres' ? 'postgres_primary' : $backend . '_fallback',
            'readiness_state' => $readiness,
            'expected_authority_met' => !$expectsPostgres || $backend === 'postgres',
            'configuration_error' => $expectsPostgres && $backend !== 'postgres'
                ? 'expected_postgres_authority_but_active_backend_is_' . $backend
                : '',
            'metrics' => $this->metrics(),
        ];
    }

    /**
     * Fail closed when the active repository does not match the configured
     * PostgreSQL authority expectation.
     */
    public function assertExpectedPostgresAuthority(): void
    {
        if (!$this->expectsPostgresAuthority()) {
            return;
        }
        if ($this->backendName() === 'postgres') {
            return;
        }

        throw new RuntimeException('expected_postgres_idempotency_authority_but_active_backend_is_' . $this->backendName());
    }

    /**
     * @return array<string, int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    /**
     * @param array<string, mixed> $descriptor
     * @param callable():array{status_code?:int, payload?:array<string, mixed>} $operation
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}
     */
    public function execute(array $descriptor, callable $operation): array
    {
        if (!$this->enabled) {
            $this->incrementMetric('disabled_passthrough');
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

        $backend = $this->backendName();
        $this->incrementMetric($backend === 'postgres' ? 'postgres_execution' : 'fallback_execution');

        try {
            $result = $this->repository->execute(
                $state,
                $idempotencyKey,
                $fingerprintHash,
                $this->retryWindowSeconds,
                $operation,
            );
        } catch (RecordConflictException $e) {
            $this->incrementMetric('conflict');
            if (str_contains(strtolower($e->getMessage()), 'in progress')) {
                $this->incrementMetric('in_progress_conflict');
            } else {
                $this->incrementMetric('fingerprint_conflict');
            }
            throw $e;
        } catch (\Throwable $e) {
            $this->incrementMetric('failure');
            throw $e;
        }

        $this->incrementMetric(($result['replayed'] ?? false) ? 'replay' : 'first_execution');
        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadDatabaseConfig(): array
    {
        $dbConfigPath = dirname(__DIR__, 2) . '/database/config.php';
        return is_file($dbConfigPath) ? (array)(require $dbConfigPath) : [];
    }

    private function defaultRepository(
        string $dataDir,
        ?CacheService $cacheService,
        ?array $databaseConfig
    ): IdempotencyReplayRepository {
        $dbConfig = $databaseConfig ?? [];
        if ((bool)($dbConfig['use_postgres'] ?? false)) {
            return new PostgresIdempotencyReplayRepository(Connection::getInstance($dbConfig));
        }

        $cacheService ??= new CacheService($dataDir, 'mom:idempotency:');
        if ($cacheService->isRedisAvailable()) {
            return new CacheIdempotencyReplayRepository($cacheService);
        }

        return new FileIdempotencyReplayRepository($dataDir);
    }

    private function backendName(): string
    {
        return match (true) {
            $this->repository instanceof PostgresIdempotencyReplayRepository => 'postgres',
            $this->repository instanceof CacheIdempotencyReplayRepository => 'cache',
            $this->repository instanceof FileIdempotencyReplayRepository => 'file',
            default => 'custom',
        };
    }

    private function expectsPostgresAuthority(): bool
    {
        return (bool)($this->databaseConfig['use_postgres'] ?? false);
    }

    private function incrementMetric(string $key): void
    {
        if (!array_key_exists($key, $this->metrics)) {
            $this->metrics[$key] = 0;
        }
        $this->metrics[$key]++;
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
            'scope_key_hash' => hash('sha256', $scopeKey),
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
        // OPS-R6-003: Validate idempotency key length and format
        if (strlen($key) < 16) {
            throw new RuntimeException('idempotency_key_invalid_length');
        }
        if (strlen($key) > 128) {
            throw new RuntimeException('idempotency_key_invalid_length');
        }
        if (preg_match('/^[a-zA-Z0-9_\-\.]+$/', $key) !== 1) {
            throw new RuntimeException('idempotency_key_invalid_format');
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
     * @param int $depth Current recursion depth.
     * @return mixed
     */
    private function normalizeForHash(mixed $value, int $depth = 0): mixed
    {
        if ($depth > 20) {
            return '[max_depth_exceeded]';
        }

        if (!is_array($value)) {
            return $value;
        }

        $isList = array_keys($value) === range(0, count($value) - 1);
        if ($isList) {
            return array_map(fn($item) => $this->normalizeForHash($item, $depth + 1), $value);
        }

        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->normalizeForHash($item, $depth + 1);
        }

        return $value;
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}

if (!class_exists('MOM\\Services\\IdempotencyService', false)) {
    class_alias(IdempotencyService::class, 'MOM\\Services\\IdempotencyService');
}
