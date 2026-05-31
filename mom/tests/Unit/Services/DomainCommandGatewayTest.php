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

    public function testRegisteredButUnimplementedCommandFailsClosed(): void
    {
        $gateway = new DomainCommandGateway(new DomainCommandFakeConnection());

        try {
            $gateway->dispatch([
                'command_name' => 'CreateItemCommand',
                'idempotency_key' => 'idem-start-1',
                'actor_id' => 'operator',
                'actor_roles' => ['admin'],
                'payload' => ['work_order_ref' => 'WO-1'],
            ]);
            $this->fail('Expected fail-closed unimplemented command.');
        } catch (DomainCommandException $e) {
            $this->assertSame('command_handler_not_runtime_complete', $e->problemCode);
        }
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
            'actor_roles' => ['admin'],
            'reauth_at' => date(DATE_ATOM),
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
                'actor_roles' => ['admin'],
                'reauth_at' => date(DATE_ATOM),
                'payload' => ['package_id' => 'pkg-2'],
            ]);
            $this->fail('Expected idempotency conflict.');
        } catch (DomainCommandException $e) {
            $this->assertSame('idempotency_conflict', $e->problemCode);
        }
    }
}

final class DomainCommandFakeConnection extends Connection
{
    public function __construct() {}

    public function queryOne(string $sql, array $params = []): ?array
    {
        unset($sql, $params);
        return ['created_by' => 'originator'];
    }

    public function execute(string $sql, array $params = []): int
    {
        unset($sql, $params);
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
