<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\FileIdempotencyReplayRepository;
use MOM\Api\Services\IdempotencyService;
use MOM\Services\DomainCommandGatewayService;
use MOM\Services\DomainCommandProblemException;
use Throwable;

/**
 * Generic domain-command envelope endpoint.
 *
 * The endpoint is intentionally fail-closed until a governed command handler is
 * explicitly registered by its owning domain service. It still enforces the
 * shared envelope, idempotency, RFC 9457 problem contract and OpenAPI surface.
 */
final class DomainCommandController extends BaseController
{
    public function execute(): never
    {
        try {
            $user = $this->requireAuth();
            $body = $this->jsonBody(1048576);
            $commandName = trim((string)($_GET['commandName'] ?? $body['command_name'] ?? $body['command'] ?? ''));
            $envelope = [
                'command_name' => $commandName,
                'idempotency_key' => $this->requestHeader('Idempotency-Key') ?? (string)($body['idempotency_key'] ?? ''),
                'correlation_id' => $this->requestHeader('X-Correlation-Id') ?? (string)($body['correlation_id'] ?? ''),
                'actor_id' => (string)($user['id'] ?? $user['user_id'] ?? $user['username'] ?? ''),
                'aggregate_type' => is_scalar($body['aggregate_type'] ?? null) ? (string)$body['aggregate_type'] : '',
                'aggregate_id' => is_scalar($body['aggregate_id'] ?? null) ? (string)$body['aggregate_id'] : '',
                'payload' => is_array($body['payload'] ?? null) ? (array)$body['payload'] : [],
                'metadata' => [
                    'http_route' => '/api/v1/commands/{commandName}',
                    'authority_slice' => 'P31',
                ],
            ];

            $gateway = $this->gateway();
            $result = $gateway->execute(
                $envelope,
                static function (array $command): array {
                    throw new DomainCommandProblemException(
                        'domain_command_handler_not_registered',
                        501,
                        'No governed handler is registered for command ' . (string)$command['command_name'] . '.',
                        'Domain command handler is not registered',
                    );
                },
            );

            $headers = ['Content-Type' => 'application/json; charset=utf-8'];
            if (($result['status_code'] ?? 500) >= 400) {
                $headers['Content-Type'] = 'application/problem+json; charset=utf-8';
            }

            throw ExitException::json((array)$result['payload'], (int)$result['status_code'], $headers);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            throw ExitException::json([
                'type' => 'https://qms.hesem.com.vn/problems/domain-command/execution-failed',
                'title' => 'Domain command execution failed',
                'status' => 500,
                'detail' => $e->getMessage(),
                'code' => 'domain_command_execution_failed',
                'retryable' => true,
            ], 500, ['Content-Type' => 'application/problem+json; charset=utf-8']);
        }
    }

    private function gateway(): DomainCommandGatewayService
    {
        return new DomainCommandGatewayService(
            new IdempotencyService(
                $this->dataDir,
                null,
                new FileIdempotencyReplayRepository($this->dataDir),
                ['use_postgres' => false],
            ),
        );
    }
}
