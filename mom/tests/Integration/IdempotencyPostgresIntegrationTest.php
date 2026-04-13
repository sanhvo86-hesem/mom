<?php

declare(strict_types=1);

namespace MOM\Tests\Integration;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\PostgresIdempotencyReplayRepository;
use MOM\Api\Services\RecordConflictException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class IdempotencyPostgresIntegrationTest extends TestCase
{
    private ?Connection $db = null;
    private string $scopeKey = '';

    protected function setUp(): void
    {
        $enabled = filter_var((string)(getenv('MOM_TEST_POSTGRES_IDEMPOTENCY') ?: ''), FILTER_VALIDATE_BOOLEAN);
        if ($enabled !== true) {
            $this->markTestSkipped('Set MOM_TEST_POSTGRES_IDEMPOTENCY=1 to run against a configured PostgreSQL database.');
        }

        $baseDir = $this->baseDir();
        $config = (array)(require $baseDir . '/database/config.php');
        $config['use_postgres'] = true;
        Connection::resetInstance();
        $this->db = Connection::getInstance($config);
        $this->db->executeScript('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        $this->db->executeScript((string)file_get_contents($baseDir . '/database/migrations/097_idempotency_replay_ledger.sql'));
    }

    protected function tearDown(): void
    {
        if ($this->db !== null && $this->scopeKey !== '') {
            try {
                $this->db->execute(
                    'DELETE FROM idempotency_replay_ledger WHERE scope_key = :scope_key',
                    [':scope_key' => $this->scopeKey],
                );
            } catch (\Throwable) {
            }
        }
        Connection::resetInstance();
    }

    public function testPostgresLedgerReplaysAndRejectsConflictingFingerprint(): void
    {
        self::assertInstanceOf(Connection::class, $this->db);
        $this->scopeKey = 'integration|idempotency|' . bin2hex(random_bytes(6));
        $service = new IdempotencyService(
            sys_get_temp_dir(),
            repository: new PostgresIdempotencyReplayRepository($this->db),
            databaseConfig: ['use_postgres' => true],
        );
        $descriptor = $this->descriptor($this->scopeKey);
        $executions = 0;

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 201,
                'payload' => ['record' => ['id' => 'PG-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('PostgreSQL replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('PG-001', $second['payload']['record']['id'] ?? null);

        $conflicting = $descriptor;
        $conflicting['fingerprint']['payload']['amount'] = 42;

        $this->expectException(RecordConflictException::class);
        $service->execute($conflicting, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function descriptor(string $scopeKey): array
    {
        return [
            'scope_key' => $scopeKey,
            'key' => 'pg-retry-001',
            'key_source' => 'header:Idempotency-Key',
            'mode' => 'client_token',
            'kind' => 'integration',
            'domain' => 'tests',
            'table' => 'idempotency_replay_ledger',
            'user_id' => 'integration-user',
            'ttl_seconds' => 300,
            'fingerprint' => [
                'payload' => [
                    'customer_po' => 'PO-PG-001',
                ],
            ],
        ];
    }

    private function baseDir(): string
    {
        if (defined('QMS_TEST_BASE_DIR')) {
            return (string)constant('QMS_TEST_BASE_DIR');
        }

        return dirname(__DIR__, 2);
    }
}
