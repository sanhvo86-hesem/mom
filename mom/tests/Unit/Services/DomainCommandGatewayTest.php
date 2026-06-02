<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Api\Services\IdempotencyReplayRepository;
use MOM\Api\Services\RecordConflictException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandGatewayTest extends TestCase
{
    public function testUnknownCommandFailsClosedBeforeMutation(): void
    {
        $gateway = new DomainCommandGateway(new DomainCommandFakeConnection());

        $this->expectException(DomainCommandException::class);
        $this->expectExceptionMessage("Command 'BogusCommand' is not registered.");

        $gateway->dispatch([
            'command_name' => 'BogusCommand',
            'idempotency_key' => 'idem-unknown-1',
            'actor_id' => 'tester',
            'actor_roles' => ['admin'],
            'payload' => [],
        ]);
    }

    public function testCreateItemCommandExecutesImplementedHandler(): void
    {
        $connection = new DomainCommandFakeConnection();
        $gateway = new DomainCommandGateway(
            $connection,
            new CommandRegistry(),
            new DomainCommandFakeIdempotencyReplayRepository()
        );

        $result = $gateway->dispatch([
            'command_name' => 'CreateItemCommand',
            'idempotency_key' => 'idem-item-1',
            'actor_id' => 'planner',
            'actor_permissions' => ['master_data.item.write'],
            'payload' => [
                'item_code' => 'ITEM-GPT-PRO-001',
                'item_name' => 'GPT Pro Closure Item',
                'item_type' => 'manufactured',
            ],
        ]);

        $this->assertFalse($result['replayed']);
        $handler = (array)($result['payload']['result'] ?? []);
        $this->assertSame('ITEM-GPT-PRO-001', $handler['item_code'] ?? null);
        $this->assertNotEmpty($connection->executeCalls);
    }

    public function testIdempotencyReplayReturnsStoredPayloadWithoutHandlerExecution(): void
    {
        $idempotency = new DomainCommandFakeIdempotencyReplayRepository(replayPayload: [
            'command_name' => 'CreateEngineeringReleasePackageCommand',
            'result' => ['package_id' => 'pkg-1'],
        ]);
        $gateway = new DomainCommandGateway(new DomainCommandFakeConnection(), new CommandRegistry(), $idempotency);

        $result = $gateway->dispatch([
            'command_name' => 'CreateEngineeringReleasePackageCommand',
            'idempotency_key' => 'idem-release-1',
            'actor_id' => 'qa',
            'actor_permissions' => ['engineering.package.write'],
            'reauth_evidence' => ['challenge_id' => 'reauth-1'],
            'payload' => ['package_id' => 'pkg-1'],
        ]);

        $this->assertTrue($result['replayed']);
        $this->assertSame('pkg-1', $result['payload']['result']['package_id']);
        $this->assertFalse($idempotency->operationCalled);
    }

    public function testIdempotencyConflictBecomesDomainProblem(): void
    {
        $gateway = new DomainCommandGateway(
            new DomainCommandFakeConnection(),
            new CommandRegistry(),
            new DomainCommandFakeIdempotencyReplayRepository(conflict: true)
        );

        try {
            $gateway->dispatch([
                'command_name' => 'CreateEngineeringReleasePackageCommand',
                'idempotency_key' => 'idem-release-1',
                'actor_id' => 'qa',
                'actor_permissions' => ['engineering.package.write'],
                'reauth_evidence' => ['challenge_id' => 'reauth-1'],
                'payload' => ['package_id' => 'pkg-2'],
            ]);
            $this->fail('Expected idempotency conflict.');
        } catch (DomainCommandException $e) {
            $this->assertSame('idempotency_conflict', $e->problemCode);
        }
    }

    public function testRoleOnlyPermissionBypassIsDenied(): void
    {
        $gateway = new DomainCommandGateway(
            new DomainCommandFakeConnection(),
            new CommandRegistry(),
            new DomainCommandFakeIdempotencyReplayRepository()
        );

        try {
            $gateway->dispatch([
                'command_name' => 'CreateItemCommand',
                'idempotency_key' => 'idem-role-bypass-1',
                'actor_id' => 'admin-user',
                'actor_roles' => ['admin'],
                'payload' => ['item_code' => 'ITEM-ROLE-BYPASS', 'item_name' => 'Role Bypass', 'item_type' => 'manufactured'],
            ]);
            $this->fail('Expected role-only permission denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('command_permission_denied', $e->problemCode);
        }
    }

    public function testClientBreakGlassFlagWithoutServerGrantIsDenied(): void
    {
        $gateway = new DomainCommandGateway(
            new DomainCommandFakeConnection(),
            new CommandRegistry(),
            new DomainCommandFakeIdempotencyReplayRepository()
        );

        try {
            $gateway->dispatch([
                'command_name' => 'CreateItemCommand',
                'idempotency_key' => 'idem-client-break-glass-1',
                'actor_id' => 'operator-1',
                'break_glass' => [
                    'server_verified' => true,
                    'permission' => 'master_data.item.write',
                    'expires_at' => gmdate('c', time() + 300),
                ],
                'payload' => ['item_code' => 'ITEM-BG-BYPASS', 'item_name' => 'Break Glass Bypass', 'item_type' => 'manufactured'],
            ]);
            $this->fail('Expected client break-glass flag denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('command_permission_denied', $e->problemCode);
        }
    }
}

final class DomainCommandFakeConnection extends Connection
{
    /** @var list<array{sql:string,params:array<string,mixed>}> */
    public array $executeCalls = [];

    public function __construct() {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'INSERT INTO item_revision')) {
            return [
                'item_revision_id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'item_id' => (string)($params[':item_id'] ?? '11111111-1111-1111-1111-111111111111'),
                'revision_code' => (string)($params[':revision_code'] ?? 'A'),
                'lifecycle_state' => 'draft',
                'approval_state' => 'draft',
                'drawing_reference' => (string)($params[':drawing_reference'] ?? ''),
                'effective_from' => '2026-06-01T00:00:00+00:00',
            ];
        }

        if (str_contains($sql, 'UPDATE item_revision')) {
            return [
                'item_revision_id' => (string)($params[':item_revision_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
                'item_id' => '11111111-1111-1111-1111-111111111111',
                'revision_code' => 'A',
                'lifecycle_state' => 'released',
                'approval_state' => 'approved',
                'drawing_reference' => '',
                'effective_from' => '2026-06-01T00:00:00+00:00',
            ];
        }

        if (str_contains($sql, 'INSERT INTO item')) {
            return [
                'item_id' => '11111111-1111-1111-1111-111111111111',
                'item_code' => (string)($params[':item_code'] ?? ''),
                'item_name' => (string)($params[':item_name'] ?? ''),
                'item_type' => (string)($params[':item_type'] ?? ''),
                'base_uom_code' => (string)($params[':base_uom_code'] ?? ''),
                'product_family_code' => (string)($params[':product_family_code'] ?? ''),
                'status_code' => 'active',
            ];
        }

        return null;
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'domain_command_reauth_challenge')) {
            return [
                'challenge_id' => (string)($params[':challenge_id'] ?? 'reauth-1'),
                'actor_id' => (string)($params[':actor_id'] ?? 'qa'),
                'command_name' => (string)($params[':command_name'] ?? 'CreateEngineeringReleasePackageCommand'),
                'payload_hash_sha256' => '',
                'intent_hash_sha256' => '',
                'issued_at' => gmdate('c'),
                'expires_at' => gmdate('c', time() + 300),
                'consumed_at' => gmdate('c'),
                'result' => 'consumed',
            ];
        }
        if (str_contains($sql, 'FROM item WHERE')) {
            return [
                'item_id' => '11111111-1111-1111-1111-111111111111',
                'item_code' => 'ITEM-GPT-PRO-001',
                'item_name' => 'GPT Pro Closure Item',
                'item_type' => 'manufactured',
                'base_uom_code' => '',
                'status_code' => 'active',
            ];
        }
        if (str_contains($sql, 'FROM item_revision')) {
            return [
                'item_revision_id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'item_id' => '11111111-1111-1111-1111-111111111111',
                'revision_code' => 'A',
                'lifecycle_state' => 'draft',
                'approval_state' => 'draft',
                'drawing_reference' => '',
                'effective_from' => '2026-06-01T00:00:00+00:00',
            ];
        }
        return ['created_by' => 'originator'];
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->executeCalls[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }
}

final class DomainCommandFakeIdempotencyReplayRepository implements IdempotencyReplayRepository
{
    public bool $operationCalled = false;

    /**
     * @param array<string,mixed>|null $replayPayload
     */
    public function __construct(
        private readonly ?array $replayPayload = null,
        private readonly bool $conflict = false,
    ) {}

    public function execute(
        array $state,
        string $idempotencyKey,
        string $fingerprintHash,
        int $retryWindowSeconds,
        callable $operation,
    ): array {
        unset($state, $idempotencyKey, $fingerprintHash, $retryWindowSeconds);
        if ($this->conflict) {
            throw new RecordConflictException('Idempotency key was already used for a different request fingerprint.');
        }
        if ($this->replayPayload !== null) {
            return [
                'status_code' => 200,
                'payload' => $this->replayPayload,
                'replayed' => true,
                'stored_at' => '2026-05-31T00:00:00+00:00',
            ];
        }

        $this->operationCalled = true;
        $result = $operation();

        return [
            'status_code' => (int)($result['status_code'] ?? 200),
            'payload' => is_array($result['payload'] ?? null) ? (array)$result['payload'] : [],
            'replayed' => false,
            'stored_at' => '2026-05-31T00:00:00+00:00',
        ];
    }
}
