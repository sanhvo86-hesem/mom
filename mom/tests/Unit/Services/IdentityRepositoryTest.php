<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\AuditChainService;
use MOM\Api\Services\AuthUserShadowSyncService;
use MOM\Api\Services\DataCollectionModeResolver;
use MOM\Api\Services\IdentityRepository;
use MOM\Api\Services\UserRepository;
use MOM\Database\Connection;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

#[CoversClass(IdentityRepository::class)]
#[CoversClass(DataCollectionModeResolver::class)]
final class IdentityRepositoryTest extends TestCase
{
    private string $tmpDir;
    private string $configDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_identity_repo_test_' . bin2hex(random_bytes(4));
        $this->configDir = $this->tmpDir . '/config';
        mkdir($this->configDir, 0775, true);
        file_put_contents(
            $this->configDir . '/users.json',
            json_encode([
                'settings' => ['issuer' => 'TEST'],
                'users'    => [
                    [
                        'username'      => 'alice',
                        'name'          => 'Alice Tester',
                        'password_hash' => 'hash1',
                        'role'          => 'qa_inspector',
                        'active'        => true,
                        'dept'          => 'QA',
                    ],
                ],
            ], JSON_PRETTY_PRINT),
        );
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->tmpDir);
    }

    #[Test]
    public function jsonOnlyModeReadsFromFilesystem(): void
    {
        $repo = $this->makeRepo(DataCollectionModeResolver::MODE_JSON_ONLY, dbExpects: false);
        $user = $repo->findByUsername('alice');
        $this->assertIsArray($user);
        $this->assertSame('alice', $user['username']);
        $this->assertSame('qa_inspector', $user['role']);
    }

    #[Test]
    public function unknownUsernameReturnsNull(): void
    {
        $repo = $this->makeRepo(DataCollectionModeResolver::MODE_JSON_ONLY, dbExpects: false);
        $this->assertNull($repo->findByUsername('nobody'));
    }

    #[Test]
    public function postgresOnlyModeReadsFromDatabase(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturnCallback(
            function (string $sql, array $params = []) {
                if (str_contains($sql, 'data_collection_state')) {
                    return [
                        'mode'           => DataCollectionModeResolver::MODE_POSTGRES_ONLY,
                        'postgres_table' => 'users',
                        'json_path'      => 'config/users.json',
                    ];
                }
                if (str_contains($sql, 'FROM users u')) {
                    return [
                        'username'       => 'bob',
                        'name'           => 'Bob From DB',
                        'password_hash'  => 'hash-from-db',
                        'role'           => 'qa_manager',
                        'status'         => 'active',
                        'dept'           => 'QA',
                        'personal_email' => 'bob@hesem.com',
                        'metadata'       => json_encode(['title' => 'QA Manager']),
                        'employee_id'    => 'EMPBOB',
                        'created_at'     => '2026-05-01T00:00:00Z',
                        'updated_at'     => '2026-05-09T00:00:00Z',
                    ];
                }
                return null;
            },
        );
        $repo = $this->buildRepo($db);
        $user = $repo->findByUsername('bob');
        $this->assertIsArray($user);
        $this->assertSame('Bob From DB', $user['name']);
        $this->assertSame('QA Manager', $user['title']);
        $this->assertTrue($user['active']);
    }

    #[Test]
    public function shadowWriteSaveCallsBothJsonAndPg(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_SHADOW_WRITE,
            'postgres_table' => 'users',
            'json_path'      => 'config/users.json',
        ]);

        $shadow = $this->createMock(AuthUserShadowSyncService::class);
        $shadow->expects($this->once())->method('syncUser');

        $jsonRepo = new UserRepository($this->tmpDir);
        $audit    = new class extends AuditChainService {
            public array $records = [];
            public function __construct() {}
            public function record(
                string $eventType,
                string $aggregateType,
                string $aggregateId,
                ?string $actorId,
                ?string $actorName,
                array $payload,
                array $metadata = [],
                ?string $ipAddress = null,
            ): ?array {
                $this->records[] = compact('eventType', 'payload');
                return ['chain_id' => count($this->records), 'row_sha256' => str_repeat('a', 64)];
            }
        };
        $resolver = new DataCollectionModeResolver($db);
        $repo     = new IdentityRepository($db, $jsonRepo, $shadow, $resolver, $audit);

        $modeUsed = $repo->saveUser([
            'username'      => 'carol',
            'name'          => 'Carol Newuser',
            'password_hash' => 'hash3',
            'role'          => 'qc_inspector',
            'active'        => true,
            'dept'          => 'QA',
        ], 'tester', 'unit-test');

        $this->assertSame(DataCollectionModeResolver::MODE_SHADOW_WRITE, $modeUsed);
        $persisted = $jsonRepo->findByUsername('carol');
        $this->assertNotNull($persisted);
        $this->assertSame('Carol Newuser', $persisted['name']);

        $eventTypes = array_column($audit->records, 'eventType');
        $this->assertContains('identity_user_saved', $eventTypes);
    }

    #[Test]
    public function postgresOnlySaveSkipsJsonAndAuditsMode(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_POSTGRES_ONLY,
            'postgres_table' => 'users',
            'json_path'      => null,
        ]);

        $shadow = $this->createMock(AuthUserShadowSyncService::class);
        $shadow->expects($this->once())->method('syncUser');

        $jsonRepo = new UserRepository($this->tmpDir);
        $auditRecords = [];
        $audit = new class($auditRecords) extends AuditChainService {
            public array $records;
            public function __construct(array &$records) { $this->records = &$records; }
            public function record(
                string $eventType,
                string $aggregateType,
                string $aggregateId,
                ?string $actorId,
                ?string $actorName,
                array $payload,
                array $metadata = [],
                ?string $ipAddress = null,
            ): ?array {
                $this->records[] = ['eventType' => $eventType, 'payload' => $payload];
                return ['chain_id' => 1, 'row_sha256' => str_repeat('b', 64)];
            }
        };
        $resolver = new DataCollectionModeResolver($db);
        $repo     = new IdentityRepository($db, $jsonRepo, $shadow, $resolver, $audit);

        $modeUsed = $repo->saveUser([
            'username'      => 'dave',
            'name'          => 'Dave',
            'password_hash' => 'h',
            'role'          => 'qa_manager',
            'active'        => true,
            'dept'          => 'QA',
        ], 'tester', 'unit-test');

        $this->assertSame(DataCollectionModeResolver::MODE_POSTGRES_ONLY, $modeUsed);
        // JSON file should NOT contain dave because postgres_only skips JSON.
        $this->assertNull($jsonRepo->findByUsername('dave'));
        $this->assertCount(1, $auditRecords);
        $this->assertSame('identity_user_saved', $auditRecords[0]['eventType']);
        $this->assertFalse($auditRecords[0]['payload']['json_ok']);
        $this->assertTrue($auditRecords[0]['payload']['pg_ok']);
    }

    #[Test]
    public function modeResolverFallsBackToJsonOnlyWhenDbUnavailable(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willThrowException(new \RuntimeException('connection refused'));
        $resolver = new DataCollectionModeResolver($db);
        $this->assertSame(
            DataCollectionModeResolver::MODE_JSON_ONLY,
            $resolver->modeFor('users'),
        );
    }

    #[Test]
    public function modeResolverCachesPerRequest(): void
    {
        $db = $this->createMock(Connection::class);
        $db->expects($this->once())                      // <-- only ONE DB hit
           ->method('queryOne')
           ->willReturn([
               'mode'           => DataCollectionModeResolver::MODE_SHADOW_WRITE,
               'postgres_table' => 'users',
               'json_path'      => 'config/users.json',
           ]);
        $resolver = new DataCollectionModeResolver($db);
        $resolver->modeFor('users');
        $resolver->modeFor('users');
        $resolver->modeFor('users');
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private function makeRepo(string $mode, bool $dbExpects): IdentityRepository
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => $mode,
            'postgres_table' => 'users',
            'json_path'      => 'config/users.json',
        ]);
        return $this->buildRepo($db);
    }

    private function buildRepo(Connection $db): IdentityRepository
    {
        $jsonRepo  = new UserRepository($this->tmpDir);
        $shadow    = $this->createMock(AuthUserShadowSyncService::class);
        $audit     = $this->createMock(AuditChainService::class);
        $audit->method('record')->willReturn(['chain_id' => 1, 'row_sha256' => str_repeat('0', 64)]);
        $resolver  = new DataCollectionModeResolver($db);
        return new IdentityRepository($db, $jsonRepo, $shadow, $resolver, $audit);
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            @unlink($path);
            return;
        }
        foreach (scandir($path) ?: [] as $e) {
            if ($e === '.' || $e === '..') continue;
            $this->removeTree($path . '/' . $e);
        }
        @rmdir($path);
    }
}
