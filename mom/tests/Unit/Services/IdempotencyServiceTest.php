<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\CacheIdempotencyReplayRepository;
use MOM\Api\Services\CacheService;
use MOM\Api\Services\FileIdempotencyReplayRepository;
use MOM\Api\Services\PostgresIdempotencyReplayRepository;
use MOM\Api\Services\RecordConflictException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class IdempotencyServiceTest extends TestCase
{
    private string $tmpDir;
    private string $oldErrorLog = '';

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_idempotency_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        $this->oldErrorLog = (string)ini_get('error_log');
        ini_set('error_log', $this->tmpDir . '/php_error.log');
    }

    protected function tearDown(): void
    {
        ini_set('error_log', $this->oldErrorLog);
        $this->removeDir($this->tmpDir);
    }

    public function testFileFallbackReplaysMatchingRequestWhenPostgresDisabled(): void
    {
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new FileIdempotencyReplayRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $executions = 0;
        $descriptor = $this->descriptor();

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 201,
                'payload' => ['record' => ['id' => 'SO-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('Replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('SO-001', $second['payload']['record']['id'] ?? null);
        $this->assertDirectoryExists($this->tmpDir . '/idempotency');
    }

    public function testCacheCompatibilityRepositoryReplaysWithoutIdempotencyFileStore(): void
    {
        $cache = new CacheService($this->tmpDir, 'mom:idempotency-test:', [
            'host' => '127.0.0.1',
            'port' => 1,
            'timeout' => 0.01,
        ]);
        $service = new IdempotencyService(
            $this->tmpDir,
            $cache,
            new CacheIdempotencyReplayRepository($cache),
            ['use_postgres' => false],
        );
        $descriptor = $this->descriptor('cache-key-001');
        $executions = 0;

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 202,
                'payload' => ['record' => ['id' => 'CACHE-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('Cache replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('CACHE-001', $second['payload']['record']['id'] ?? null);
        $this->assertDirectoryExists($this->tmpDir . '/cache');
        $this->assertDirectoryDoesNotExist($this->tmpDir . '/idempotency');
    }

    public function testDbBackedRepositoryReplaysMatchingRequestWithoutFileStore(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-key-001');
        $executions = 0;

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 200,
                'payload' => ['record' => ['id' => 'DB-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('DB replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('DB-001', $second['payload']['record']['id'] ?? null);
        $this->assertSame('completed', $db->rows[$this->rowKey($descriptor)]['status'] ?? null);
        $this->assertDirectoryDoesNotExist($this->tmpDir . '/idempotency');
    }

    public function testDbBackedRepositoryRejectsConflictingFingerprint(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-conflict-key');

        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);

        $conflicting = $descriptor;
        $conflicting['fingerprint']['payload']['amount'] = 42;

        $this->expectException(RecordConflictException::class);
        $service->execute($conflicting, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testDbBackedRepositoryRejectsActiveInProgressDuplicate(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-in-progress-key');
        $key = $this->rowKey($descriptor);
        $db->rows[$key] = [
            'scope_key' => $descriptor['scope_key'],
            'scope_key_hash' => hash('sha256', (string)$descriptor['scope_key']),
            'idempotency_key' => $descriptor['key'],
            'fingerprint_hash' => $this->fingerprintForDescriptor($descriptor),
            'status' => 'in_progress',
            'status_code' => null,
            'response_payload' => '{}',
            'metadata' => '{}',
            'lock_owner' => 'other-worker',
            'created_at' => gmdate('c'),
            'updated_at' => gmdate('c'),
            'completed_at' => null,
            'expires_at' => gmdate('c', time() + 300),
        ];

        $this->expectException(RecordConflictException::class);
        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testDbBackedRepositoryRejectsNonExpiredStaleInProgressDuplicate(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-stale-in-progress-key');
        $key = $this->rowKey($descriptor);
        $db->rows[$key] = [
            'scope_key' => $descriptor['scope_key'],
            'scope_key_hash' => hash('sha256', (string)$descriptor['scope_key']),
            'idempotency_key' => $descriptor['key'],
            'fingerprint_hash' => $this->fingerprintForDescriptor($descriptor),
            'status' => 'in_progress',
            'status_code' => null,
            'response_payload' => '{}',
            'metadata' => '{}',
            'lock_owner' => 'slow-worker',
            'created_at' => gmdate('c', time() - 1000),
            'updated_at' => gmdate('c', time() - 1000),
            'completed_at' => null,
            'expires_at' => gmdate('c', time() + 300),
        ];

        $this->expectException(RecordConflictException::class);
        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testDbBackedRepositoryRejectsExpiredInProgressDuplicate(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-expired-in-progress-key');
        $key = $this->rowKey($descriptor);
        $db->rows[$key] = [
            'scope_key' => $descriptor['scope_key'],
            'scope_key_hash' => hash('sha256', (string)$descriptor['scope_key']),
            'idempotency_key' => $descriptor['key'],
            'fingerprint_hash' => $this->fingerprintForDescriptor($descriptor),
            'status' => 'in_progress',
            'status_code' => null,
            'response_payload' => '{}',
            'metadata' => '{}',
            'lock_owner' => 'slow-worker',
            'created_at' => gmdate('c', time() - 1000),
            'updated_at' => gmdate('c', time() - 1000),
            'completed_at' => null,
            'expires_at' => gmdate('c', time() - 300),
        ];

        $this->expectException(RecordConflictException::class);
        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testDbBackedRepositoryUsesHashAuthorityForLongScopeKey(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-long-scope-key');
        $descriptor['scope_key'] = 'generic_crud|update|quality_management|ncr_records|' . str_repeat('scope-segment-', 30);

        $result = $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);

        $row = $db->rows[$this->rowKey($descriptor)] ?? null;
        $this->assertFalse($result['replayed']);
        $this->assertIsArray($row);
        $this->assertGreaterThan(255, strlen((string)$row['scope_key']));
        $this->assertSame(hash('sha256', (string)$descriptor['scope_key']), $row['scope_key_hash'] ?? null);
        $this->assertSame('completed', $row['status'] ?? null);
    }

    public function testDbBackedRepositoryDoesNotReexecuteWhenCompletionPersistenceFails(): void
    {
        $db = new IdempotencyFakeConnection();
        $db->failComplete = true;
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-complete-failure-key');
        $executions = 0;

        try {
            $service->execute($descriptor, static function () use (&$executions): array {
                $executions++;
                return [
                    'status_code' => 201,
                    'payload' => ['ok' => true],
                ];
            });
            $this->fail('Completion persistence failure should bubble.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Unable to complete idempotency ledger row.', $e->getMessage());
        }

        $this->assertSame(1, $executions);
        $this->assertSame('in_progress', $db->rows[$this->rowKey($descriptor)]['status'] ?? null);

        $this->expectException(RecordConflictException::class);
        $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 200,
                'payload' => ['should_not' => 'run'],
            ];
        });
    }

    public function testDbBackedRepositoryPersistsFailureAndAllowsMatchingRetry(): void
    {
        $db = new IdempotencyFakeConnection();
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-failure-key');
        $executions = 0;

        try {
            $service->execute($descriptor, static function () use (&$executions): array {
                $executions++;
                throw new \RuntimeException('Deliberate failure.');
            });
            $this->fail('The failing operation should bubble its exception.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Deliberate failure.', $e->getMessage());
        }

        $failedRow = $db->rows[$this->rowKey($descriptor)] ?? [];
        $this->assertSame('failed', $failedRow['status'] ?? null);
        $this->assertSame(\RuntimeException::class, $failedRow['error_class'] ?? null);

        $retry = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 202,
                'payload' => ['ok' => true],
            ];
        });

        $this->assertSame(2, $executions);
        $this->assertFalse($retry['replayed']);
        $this->assertSame(202, $retry['status_code']);
        $this->assertSame('completed', $db->rows[$this->rowKey($descriptor)]['status'] ?? null);
    }

    public function testDbBackedRepositoryPreservesBusinessExceptionWhenFailureMarkerFails(): void
    {
        $db = new IdempotencyFakeConnection();
        $db->failFailureUpdate = true;
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new PostgresIdempotencyReplayRepository($db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor('db-failure-marker-key');

        try {
            $service->execute($descriptor, static function (): array {
                throw new \RuntimeException('Business failure survives.');
            });
            $this->fail('The original business exception should bubble.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Business failure survives.', $e->getMessage());
        }

        $this->assertSame('in_progress', $db->rows[$this->rowKey($descriptor)]['status'] ?? null);
    }

    public function testFileFallbackRejectsConflictingFingerprint(): void
    {
        $service = new IdempotencyService(
            $this->tmpDir,
            repository: new FileIdempotencyReplayRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $descriptor = $this->descriptor('file-conflict-key');

        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);

        $conflicting = $descriptor;
        $conflicting['fingerprint']['payload']['amount'] = 42;

        $this->expectException(RecordConflictException::class);
        $service->execute($conflicting, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testLegacyServicesNamespaceAliasesRemainAvailable(): void
    {
        $this->assertTrue(class_exists('MOM\\Services\\IdempotencyService'));
        $this->assertTrue(interface_exists('MOM\\Services\\IdempotencyReplayRepository'));
        $this->assertTrue(class_exists('MOM\\Services\\PostgresIdempotencyReplayRepository'));
        $this->assertTrue(class_exists('MOM\\Services\\FileIdempotencyReplayRepository'));
        $this->assertTrue(class_exists('MOM\\Services\\CacheIdempotencyReplayRepository'));
    }

    /**
     * @return array<string, mixed>
     */
    private function descriptor(string $key = 'retry-key-001'): array
    {
        return [
            'scope_key' => 'sales|convert_quote|QUOTE-001',
            'key' => $key,
            'key_source' => 'header:Idempotency-Key',
            'mode' => 'client_token',
            'kind' => 'convert',
            'domain' => 'sales',
            'table' => 'sales_orders',
            'user_id' => 'unit-user',
            'ttl_seconds' => 300,
            'fingerprint' => [
                'quote_id' => 'QUOTE-001',
                'payload' => [
                    'customer_po' => 'PO-001',
                ],
            ],
        ];
    }

    /**
     * @param array<string, mixed> $descriptor
     */
    private function rowKey(array $descriptor): string
    {
        return hash('sha256', (string)$descriptor['scope_key']) . '|' . (string)$descriptor['key'];
    }

    /**
     * @param array<string, mixed> $descriptor
     */
    private function fingerprintForDescriptor(array $descriptor): string
    {
        $normalized = $this->normalizeForHash((array)($descriptor['fingerprint'] ?? []));
        $encoded = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        self::assertIsString($encoded);
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

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}

final class IdempotencyFakeConnection extends Connection
{
    /** @var array<string, array<string, mixed>> */
    public array $rows = [];
    public bool $failComplete = false;
    public bool $failFailureUpdate = false;

    public function __construct()
    {
    }

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        $key = $this->key($params);
        if (isset($this->rows[$key])) {
            return null;
        }

        $this->rows[$key] = [
            'ledger_id' => 'fake-ledger-' . count($this->rows),
            'scope_key' => (string)$params[':scope_key'],
            'scope_key_hash' => (string)$params[':scope_key_hash'],
            'idempotency_key' => (string)$params[':idempotency_key'],
            'fingerprint_hash' => (string)$params[':fingerprint_hash'],
            'status' => 'in_progress',
            'status_code' => null,
            'response_payload' => '{}',
            'metadata' => (string)($params[':metadata'] ?? '{}'),
            'lock_owner' => (string)$params[':lock_owner'],
            'error_class' => null,
            'error_message' => null,
            'created_at' => (string)$params[':created_at'],
            'updated_at' => (string)$params[':updated_at'],
            'completed_at' => null,
            'expires_at' => (string)$params[':expires_at'],
        ];

        return ['ledger_id' => $this->rows[$key]['ledger_id']];
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        return $this->rows[$this->key($params)] ?? null;
    }

    public function execute(string $sql, array $params = []): int
    {
        $key = $this->key($params);
        if (!isset($this->rows[$key])) {
            return 0;
        }

        if (str_contains($sql, "status = 'completed'")) {
            if (!$this->matchesClaim($key, $params)) {
                return 0;
            }
            if ($this->failComplete) {
                return 0;
            }
            $this->rows[$key]['status'] = 'completed';
            $this->rows[$key]['status_code'] = (int)$params[':status_code'];
            $this->rows[$key]['response_payload'] = (string)$params[':response_payload'];
            $this->rows[$key]['lock_owner'] = null;
            $this->rows[$key]['error_class'] = null;
            $this->rows[$key]['error_message'] = null;
            $this->rows[$key]['completed_at'] = (string)$params[':completed_at'];
            $this->rows[$key]['updated_at'] = (string)$params[':updated_at'];
            return 1;
        }

        if (str_contains($sql, "status = 'failed'")) {
            if (!$this->matchesClaim($key, $params)) {
                return 0;
            }
            if ($this->failFailureUpdate) {
                return 0;
            }
            $this->rows[$key]['status'] = 'failed';
            $this->rows[$key]['status_code'] = null;
            $this->rows[$key]['response_payload'] = '{}';
            $this->rows[$key]['lock_owner'] = null;
            $this->rows[$key]['error_class'] = (string)$params[':error_class'];
            $this->rows[$key]['error_message'] = (string)$params[':error_message'];
            $this->rows[$key]['updated_at'] = (string)$params[':updated_at'];
            return 1;
        }

        if (str_contains($sql, "status = 'in_progress'")) {
            $this->rows[$key]['scope_key'] = (string)$params[':scope_key'];
            $this->rows[$key]['scope_key_hash'] = (string)$params[':scope_key_hash'];
            $this->rows[$key]['fingerprint_hash'] = (string)$params[':fingerprint_hash'];
            $this->rows[$key]['status'] = 'in_progress';
            $this->rows[$key]['status_code'] = null;
            $this->rows[$key]['response_payload'] = '{}';
            $this->rows[$key]['metadata'] = (string)$params[':metadata'];
            $this->rows[$key]['lock_owner'] = (string)$params[':lock_owner'];
            $this->rows[$key]['error_class'] = null;
            $this->rows[$key]['error_message'] = null;
            $this->rows[$key]['completed_at'] = null;
            $this->rows[$key]['updated_at'] = (string)$params[':updated_at'];
            $this->rows[$key]['expires_at'] = (string)$params[':expires_at'];
            return 1;
        }

        return 1;
    }

    /**
     * @param array<string, mixed> $params
     */
    private function key(array $params): string
    {
        $scopeHash = (string)($params[':scope_key_hash'] ?? hash('sha256', (string)($params[':scope_key'] ?? '')));
        return $scopeHash . '|' . (string)$params[':idempotency_key'];
    }

    /**
     * @param array<string, mixed> $params
     */
    private function matchesClaim(string $key, array $params): bool
    {
        return ($this->rows[$key]['fingerprint_hash'] ?? null) === ($params[':fingerprint_hash'] ?? null)
            && ($this->rows[$key]['lock_owner'] ?? null) === ($params[':lock_owner'] ?? null);
    }
}
