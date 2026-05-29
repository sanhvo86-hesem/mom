<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileIdempotencyReplayRepository;
use MOM\Api\Services\IdempotencyReplayRepository;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\DomainCommandGatewayService;
use MOM\Services\DomainCommandProblemException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class DomainCommandGatewayServiceTest extends TestCase
{
    public function testSameIdempotencyKeyReplaysDeterministicResult(): void
    {
        $gateway = new DomainCommandGatewayService($this->idempotencyGateway('replay'));
        $calls = 0;
        $envelope = $this->validEnvelope('idem-domain-0001');

        $first = $gateway->execute($envelope, function () use (&$calls): array {
            $calls++;
            return [
                'ok' => true,
                'data' => ['command_result_id' => 'cmd-result-1'],
            ];
        });
        $second = $gateway->execute($envelope, function () use (&$calls): array {
            $calls++;
            return [
                'ok' => true,
                'data' => ['command_result_id' => 'cmd-result-2'],
            ];
        });

        $this->assertSame(1, $calls);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame($first['payload']['data'], $second['payload']['data']);
    }

    public function testInProgressIdempotencyConflictDoesNotDoubleExecute(): void
    {
        $repo = new class implements IdempotencyReplayRepository {
            public int $calls = 0;

            public function execute(
                array $state,
                string $idempotencyKey,
                string $fingerprintHash,
                int $retryWindowSeconds,
                callable $operation,
            ): array {
                unset($state, $idempotencyKey, $fingerprintHash, $retryWindowSeconds, $operation);
                $this->calls++;
                throw new RecordConflictException('Idempotency request is already in progress.');
            }
        };
        $gateway = new DomainCommandGatewayService($this->idempotencyGateway('in-progress', $repo));

        $result = $gateway->execute($this->validEnvelope('idem-domain-0002'), static fn(): array => [
            'ok' => true,
        ]);

        $this->assertSame(1, $repo->calls);
        $this->assertSame(409, $result['status_code']);
        $this->assertSame('idempotency_in_progress', $result['payload']['code']);
        $this->assertTrue($result['payload']['retryable']);
    }

    public function testValidationProblemReturnsProblemDetail(): void
    {
        $gateway = new DomainCommandGatewayService($this->idempotencyGateway('validation'));

        $result = $gateway->execute($this->validEnvelope('idem-domain-0003'), static function (): array {
            throw new DomainCommandProblemException(
                'domain_command_precondition_failed',
                422,
                'Release package is missing a required inspection plan.',
                'Domain command precondition failed',
                false,
                [['field' => '/payload/inspection_plan_id', 'code' => 'required', 'message' => 'Inspection plan is required.']],
            );
        });

        $this->assertSame(422, $result['status_code']);
        $this->assertSame('https://qms.hesem.com.vn/problems/domain-command/domain-command-precondition-failed', $result['payload']['type']);
        $this->assertSame('domain_command_precondition_failed', $result['payload']['code']);
        $this->assertSame(422, $result['payload']['status']);
        $this->assertNotEmpty($result['payload']['violations']);
    }

    public function testOutboxFailureDoesNotLoseCommandResult(): void
    {
        $gateway = new DomainCommandGatewayService(
            $this->idempotencyGateway('outbox'),
            static function (): void {
                throw new RuntimeException('outbox worker unavailable');
            },
        );

        $result = $gateway->execute($this->validEnvelope('idem-domain-0004'), static fn(): array => [
            'ok' => true,
            'data' => ['command_result_id' => 'cmd-result-outbox'],
            'outbox_event' => [
                'event_type' => 'CommandAccepted',
                'aggregate_type' => 'engineering_release_package',
                'aggregate_id' => 'pkg-1',
            ],
        ]);

        $this->assertSame(200, $result['status_code']);
        $this->assertSame('cmd-result-outbox', $result['payload']['data']['command_result_id']);
        $this->assertSame('pending_retry', $result['payload']['outbox_status']);
        $this->assertSame('outbox_publish_failed', $result['payload']['outbox_error_code']);
    }

    public function testOpenApiRouteAbsentBlocksPass(): void
    {
        $gateway = new DomainCommandGatewayService($this->idempotencyGateway('openapi'));

        $result = $gateway->assertOpenApiOperationPresent('openapi: 3.1.0');

        $this->assertFalse($result['allowed']);
        $this->assertSame('domain_command_openapi_missing', $result['reason_code']);
    }

    private function idempotencyGateway(
        string $name,
        ?IdempotencyReplayRepository $repository = null,
    ): IdempotencyService {
        $dataDir = sys_get_temp_dir() . '/mom-domain-command-test-' . $name . '-' . getmypid();
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0775, true);
        }

        return new IdempotencyService(
            $dataDir,
            null,
            $repository ?? new FileIdempotencyReplayRepository($dataDir),
            ['use_postgres' => false],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validEnvelope(string $idempotencyKey): array
    {
        return [
            'command_name' => 'EngineeringReleasePackage.Release',
            'idempotency_key' => $idempotencyKey,
            'correlation_id' => 'corr-domain-command-test',
            'actor_id' => 'user-1',
            'aggregate_type' => 'engineering_release_package',
            'aggregate_id' => 'pkg-1',
            'payload' => [
                'engineering_release_package_id' => 'pkg-1',
            ],
        ];
    }
}
