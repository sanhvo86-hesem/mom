<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\OperationalOverrideService;
use Throwable;

final class OperationalOverrideController extends BaseController
{
    private ?OperationalOverrideService $overrideService = null;
    private ?IdempotencyService $idempotencyService = null;

    private function overrides(): OperationalOverrideService
    {
        if ($this->overrideService === null) {
            $this->overrideService = new OperationalOverrideService($this->dataDir, $this->confDir);
        }

        return $this->overrideService;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    private function requireOverrideRead(array $user): void
    {
        $this->requireAnyPermission($user, ['governance.override_control.read']);
    }

    private function requireOverrideWrite(array $user): void
    {
        $this->requireAnyPermission($user, ['governance.override_control.create']);
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->error('invalid_idempotency_key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->error('invalid_idempotency_key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function createIdempotency(array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'actor_party_id' => $actorPartyId,
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['operational_override', $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'create',
                'domain' => 'governance',
                'table' => 'operational_override_controls',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['operational_override', $actorPartyId]),
            'key' => 'drv-override-create-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:payload_retry_window',
            'mode' => 'derived_payload_window',
            'kind' => 'create',
            'domain' => 'governance',
            'table' => 'operational_override_controls',
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function transitionIdempotency(string $overrideId, array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'override_id' => $overrideId,
            'transition' => trim((string)($body['transition'] ?? '')),
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['operational_override', 'transition', $overrideId, $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'transition',
                'domain' => 'governance',
                'table' => 'operational_override_controls',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['operational_override', 'transition', $overrideId, $actorPartyId]),
            'key' => 'drv-override-transition-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:identity+payload_retry_window',
            'mode' => 'derived_identity_window',
            'kind' => 'transition',
            'domain' => 'governance',
            'table' => 'operational_override_controls',
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    public function listOverrides(): never
    {
        $user = $this->requireAuth();
        $this->requireOverrideRead($user);

        $filters = [
            'override_type' => $this->query('override_type'),
            'subject_type' => $this->query('subject_type'),
            'subject_id' => $this->query('subject_id'),
            'control_family' => $this->query('control_family'),
            'control_code' => $this->query('control_code'),
            'current_status' => $this->query('current_status'),
        ];

        try {
            $this->success(['override_controls' => $this->overrides()->listOverrides($filters)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('override_control_list_failed', 500, $e->getMessage());
        }
    }

    public function getOverride(): never
    {
        $user = $this->requireAuth();
        $this->requireOverrideRead($user);

        $overrideId = trim((string)($this->query('overrideId') ?? ''));
        if ($overrideId === '') {
            $this->error('missing_override_id', 400);
        }

        try {
            $override = $this->overrides()->getOverride($overrideId);
            if ($override === null) {
                $this->error('override_control_not_found', 404);
            }

            $this->success(['override_control' => $override]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('override_control_detail_failed', 500, $e->getMessage());
        }
    }

    public function createOverride(): never
    {
        $user = $this->requireAuth();
        $this->requireOverrideWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->createIdempotency($body, $this->userId($user)),
                function () use ($body): array {
                    $override = $this->overrides()->createOverride($body);
                    return [
                        'status_code' => 201,
                        'payload' => ['override_control' => $override],
                    ];
                }
            );

            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('override_control_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('override_control_create_failed', 500, $e->getMessage());
        }
    }

    public function transitionOverride(): never
    {
        $user = $this->requireAuth();
        $this->requireOverrideWrite($user);
        $this->requireCsrf();

        $overrideId = trim((string)($this->query('overrideId') ?? ''));
        if ($overrideId === '') {
            $this->error('missing_override_id', 400);
        }

        try {
            $body = $this->jsonBody();
            $transition = trim((string)($body['transition'] ?? ''));
            if ($transition === '') {
                $this->error('missing_transition', 400);
            }

            $execution = $this->idempotency()->execute(
                $this->transitionIdempotency($overrideId, $body, $this->userId($user)),
                function () use ($overrideId, $body, $user): array {
                    $override = $this->overrides()->transitionOverride(
                        $overrideId,
                        (string)($body['transition'] ?? ''),
                        $this->userId($user),
                        $body
                    );
                    return [
                        'status_code' => 200,
                        'payload' => ['override_control' => $override],
                    ];
                }
            );

            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 200));
        } catch (RecordConflictException $e) {
            $this->error('override_control_transition_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('override_control_transition_failed', 500, $e->getMessage());
        }
    }
}
