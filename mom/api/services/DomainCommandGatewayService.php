<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use RuntimeException;
use Throwable;

/**
 * Shared runtime spine for governed domain commands.
 *
 * This service does not own business transitions. It normalizes the command
 * envelope, delegates idempotency to the existing replay ledger, renders RFC
 * 9457 problem details, and keeps outbox publication failures from erasing a
 * committed command result.
 */
final class DomainCommandGatewayService
{
    /** @var callable|null */
    private $outboxPublisher;

    public function __construct(
        private ?IdempotencyService $idempotencyService = null,
        ?callable $outboxPublisher = null,
    ) {
        $this->outboxPublisher = $outboxPublisher;
    }

    /**
     * @return array<string, mixed>
     */
    public function authorityProbe(): array
    {
        $idempotencyProbe = $this->idempotencyService?->backendProbe() ?? [
            'enabled' => false,
            'backend' => 'not_injected',
            'authoritative' => false,
            'readiness_state' => 'not_configured',
        ];

        return [
            'slice' => 'domain_command_gateway',
            'readiness_state' => ($idempotencyProbe['authoritative'] ?? false)
                ? 'command_gateway_postgres_ready'
                : 'command_gateway_compatibility_bridge',
            'mutation_authority' => 'domain_command_service',
            'idempotency_authority' => $idempotencyProbe,
            'audit_authority' => 'domain_command_audit',
            'outbox_link_authority' => 'domain_command_outbox_link',
            'problem_contract' => 'RFC_9457_problem_details',
            'generic_crud_mutation_allowed' => false,
            'openapi_operation_id' => 'mdaDomainCommandExecute',
        ];
    }

    /**
     * @param array<string, mixed> $envelope
     * @param callable(array<string, mixed>):array<string, mixed> $handler
     * @return array<string, mixed>
     */
    public function execute(array $envelope, callable $handler): array
    {
        $normalized = $this->normalizeEnvelope($envelope);
        if (($normalized['valid'] ?? false) !== true) {
            return $this->problemResult(
                'domain_command_envelope_invalid',
                400,
                'Domain command envelope is missing required authority fields.',
                [
                    'correlation_id' => (string)($normalized['correlation_id'] ?? ''),
                    'violations' => $normalized['violations'] ?? [],
                ],
            );
        }

        $idempotency = $this->requireIdempotencyService();
        $descriptor = $this->idempotencyDescriptor($normalized);

        try {
            $replay = $idempotency->execute($descriptor, function () use ($handler, $normalized): array {
                try {
                    $payload = $handler($normalized);
                    $payload = $this->normalizeHandlerPayload($payload);
                } catch (DomainCommandProblemException $e) {
                    $problem = $this->problemPayload(
                        $e->problemCode(),
                        $e->statusCode(),
                        $e->getMessage(),
                        [
                            'title' => $e->title(),
                            'correlation_id' => (string)$normalized['correlation_id'],
                            'retryable' => $e->retryable(),
                            'violations' => $e->violations(),
                        ],
                    );
                    return [
                        'status_code' => $e->statusCode(),
                        'payload' => $problem,
                    ];
                }

                return [
                    'status_code' => max(200, (int)($payload['status_code'] ?? 200)),
                    'payload' => $this->publishOutboxIfRequested($payload, $normalized),
                ];
            });
        } catch (RecordConflictException $e) {
            $message = strtolower($e->getMessage());
            $inProgress = str_contains($message, 'in progress');
            return $this->problemResult(
                $inProgress ? 'idempotency_in_progress' : 'idempotency_conflict',
                409,
                $e->getMessage(),
                [
                    'correlation_id' => (string)$normalized['correlation_id'],
                    'retryable' => $inProgress,
                ],
            );
        } catch (Throwable $e) {
            return $this->problemResult(
                'domain_command_execution_failed',
                500,
                $e->getMessage(),
                [
                    'correlation_id' => (string)$normalized['correlation_id'],
                    'retryable' => true,
                ],
            );
        }

        $payload = $replay['payload'];
        if (is_array($payload)) {
            $payload['replayed'] = (bool)($replay['replayed'] ?? false);
            $payload['idempotency_stored_at'] = (string)($replay['stored_at'] ?? '');
        }

        return [
            'status_code' => max(200, (int)($replay['status_code'] ?? 200)),
            'payload' => $payload,
            'replayed' => (bool)($replay['replayed'] ?? false),
            'stored_at' => (string)($replay['stored_at'] ?? ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function assertOpenApiOperationPresent(string $openApiDocument, string $operationId = 'mdaDomainCommandExecute'): array
    {
        $hasOperation = str_contains($openApiDocument, 'operationId: ' . $operationId)
            || str_contains($openApiDocument, 'operationId:' . $operationId);
        $hasCommandPath = str_contains($openApiDocument, '/api/v1/commands/{commandName}');
        $hasProblemDetail = str_contains($openApiDocument, 'ProblemDetail')
            && str_contains($openApiDocument, 'application/problem+json');

        if ($hasOperation && $hasCommandPath && $hasProblemDetail) {
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'domain_command_openapi_present',
            ];
        }

        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => 'domain_command_openapi_missing',
            'missing' => [
                'operation' => !$hasOperation,
                'path' => !$hasCommandPath,
                'problem_detail' => !$hasProblemDetail,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    private function normalizeEnvelope(array $envelope): array
    {
        $commandName = trim((string)($envelope['command_name'] ?? $envelope['command'] ?? ''));
        $idempotencyKey = trim((string)($envelope['idempotency_key'] ?? ''));
        $correlationId = trim((string)($envelope['correlation_id'] ?? ''));
        $payload = is_array($envelope['payload'] ?? null) ? (array)$envelope['payload'] : [];

        $violations = [];
        if ($commandName === '') {
            $violations[] = $this->violation('/command_name', 'required', 'Command name is required.');
        } elseif (!preg_match('/^[A-Za-z][A-Za-z0-9_.:-]{1,119}$/', $commandName)) {
            $violations[] = $this->violation('/command_name', 'format', 'Command name uses an unsupported format.');
        }
        if ($idempotencyKey === '') {
            $violations[] = $this->violation('/idempotency_key', 'required', 'Idempotency key is required.');
        }
        if ($correlationId === '') {
            $violations[] = $this->violation('/correlation_id', 'required', 'Correlation ID is required.');
        }

        return [
            'valid' => $violations === [],
            'violations' => $violations,
            'command_name' => $commandName,
            'idempotency_key' => $idempotencyKey,
            'correlation_id' => $correlationId,
            'actor_id' => trim((string)($envelope['actor_id'] ?? $envelope['actor_user_id'] ?? '')),
            'aggregate_type' => trim((string)($envelope['aggregate_type'] ?? '')),
            'aggregate_id' => trim((string)($envelope['aggregate_id'] ?? '')),
            'payload' => $payload,
            'metadata' => is_array($envelope['metadata'] ?? null) ? (array)$envelope['metadata'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    private function idempotencyDescriptor(array $command): array
    {
        return [
            'scope_key' => 'domain_command:' . (string)$command['command_name'] . ':' . (string)$command['actor_id'],
            'key' => (string)$command['idempotency_key'],
            'key_source' => 'header_or_envelope:idempotency_key',
            'mode' => 'domain_command_gateway',
            'kind' => 'domain_command',
            'domain' => 'mda',
            'table' => 'domain_command_audit',
            'user_id' => (string)$command['actor_id'],
            'fingerprint' => [
                'command_name' => (string)$command['command_name'],
                'aggregate_type' => (string)$command['aggregate_type'],
                'aggregate_id' => (string)$command['aggregate_id'],
                'actor_id' => (string)$command['actor_id'],
                'payload' => $command['payload'],
            ],
            'metadata' => [
                'correlation_id' => (string)$command['correlation_id'],
                'authority_slice' => 'P31',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeHandlerPayload(array $payload): array
    {
        $statusCode = max(200, (int)($payload['status_code'] ?? 200));
        unset($payload['status_code']);
        $payload['ok'] = (bool)($payload['ok'] ?? true);
        $payload['status_code'] = $statusCode;
        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    private function publishOutboxIfRequested(array $payload, array $command): array
    {
        $events = $payload['outbox_events'] ?? $payload['outbox_event'] ?? [];
        if (!is_array($events) || $events === []) {
            $payload['outbox_status'] = $payload['outbox_status'] ?? 'not_applicable';
            return $payload;
        }

        if (!array_is_list($events)) {
            $events = [$events];
        }

        if ($this->outboxPublisher === null) {
            $payload['outbox_status'] = 'pending';
            return $payload;
        }

        try {
            foreach ($events as $event) {
                if (is_array($event)) {
                    ($this->outboxPublisher)($event, $command);
                }
            }
            $payload['outbox_status'] = 'published';
        } catch (Throwable $e) {
            $payload['outbox_status'] = 'pending_retry';
            $payload['outbox_error_code'] = 'outbox_publish_failed';
            $payload['outbox_error'] = $e->getMessage();
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function problemResult(string $code, int $status, string $detail, array $extra = []): array
    {
        return [
            'status_code' => $status,
            'payload' => $this->problemPayload($code, $status, $detail, $extra),
            'replayed' => false,
            'stored_at' => '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function problemPayload(string $code, int $status, string $detail, array $extra = []): array
    {
        $title = (string)($extra['title'] ?? ucwords(str_replace('_', ' ', $code)));
        unset($extra['title']);

        $payload = [
            'type' => 'https://qms.hesem.com.vn/problems/domain-command/' . str_replace('_', '-', $code),
            'title' => $title,
            'status' => $status,
            'detail' => $detail,
            'code' => $code,
            'retryable' => (bool)($extra['retryable'] ?? false),
        ];
        unset($extra['retryable']);

        foreach ($extra as $key => $value) {
            if ($value !== null && $value !== '' && $value !== []) {
                $payload[$key] = $value;
            }
        }

        return $payload;
    }

    private function requireIdempotencyService(): IdempotencyService
    {
        if ($this->idempotencyService instanceof IdempotencyService) {
            return $this->idempotencyService;
        }

        throw new RuntimeException('domain_command_idempotency_service_not_configured');
    }

    /**
     * @return array<string, string>
     */
    private function violation(string $field, string $code, string $message): array
    {
        return [
            'field' => $field,
            'code' => $code,
            'message' => $message,
        ];
    }
}

if (!class_exists('MOM\\Api\\Services\\DomainCommandGatewayService', false)) {
    class_alias(DomainCommandGatewayService::class, 'MOM\\Api\\Services\\DomainCommandGatewayService');
}
