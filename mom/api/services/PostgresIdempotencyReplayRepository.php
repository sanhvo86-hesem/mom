<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * PostgreSQL authoritative idempotency replay ledger.
 */
final class PostgresIdempotencyReplayRepository implements IdempotencyReplayRepository
{
    public function __construct(private Connection $db)
    {
    }

    /**
     * @param array<string, mixed> $state
     * @param callable():array{status_code?:int, payload?:array<string, mixed>} $operation
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}
     */
    public function execute(
        array $state,
        string $idempotencyKey,
        string $fingerprintHash,
        int $retryWindowSeconds,
        callable $operation,
    ): array {
        unset($retryWindowSeconds);

        $reservation = $this->reserve($state, $idempotencyKey, $fingerprintHash);
        if (($reservation['replay'] ?? false) === true) {
            return [
                'status_code' => max(200, (int)($reservation['status_code'] ?? 200)),
                'payload' => is_array($reservation['payload'] ?? null) ? (array)$reservation['payload'] : [],
                'replayed' => true,
                'stored_at' => (string)($reservation['stored_at'] ?? ''),
            ];
        }

        try {
            $result = $operation();
        } catch (Throwable $e) {
            try {
                $this->markFailed($state, $idempotencyKey, $fingerprintHash, (string)$reservation['lock_owner'], $e);
            } catch (Throwable $ledgerFailure) {
                @error_log('[Idempotency] PostgreSQL failure marker write failed: ' . $ledgerFailure->getMessage());
            }
            throw $e;
        }

        $payload = is_array($result['payload'] ?? null) ? (array)$result['payload'] : [];
        $statusCode = max(200, (int)($result['status_code'] ?? 200));
        $completedAt = $this->complete($state, $idempotencyKey, $fingerprintHash, (string)$reservation['lock_owner'], $statusCode, $payload);

        return [
            'status_code' => $statusCode,
            'payload' => $payload,
            'replayed' => false,
            'stored_at' => $completedAt,
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function reserve(array $state, string $idempotencyKey, string $fingerprintHash): array
    {
        $scopeKey = (string)($state['scope_key'] ?? '');
        $scopeKeyHash = trim((string)($state['scope_key_hash'] ?? ''));
        if ($scopeKeyHash === '') {
            $scopeKeyHash = hash('sha256', $scopeKey);
        }
        $lockOwner = bin2hex(random_bytes(16));
        $now = $this->nowIso();
        $expiresAt = (string)($state['expires_at'] ?? gmdate('c', time() + 86400));
        $metadata = $this->metadataJson($state);

        return $this->db->transactional(function () use (
            $scopeKey,
            $scopeKeyHash,
            $idempotencyKey,
            $fingerprintHash,
            $lockOwner,
            $now,
            $expiresAt,
            $metadata,
        ): array {
            $inserted = $this->db->insertReturning(
                "INSERT INTO idempotency_replay_ledger (
                    scope_key,
                    scope_key_hash,
                    idempotency_key,
                    fingerprint_hash,
                    status,
                    response_payload,
                    metadata,
                    lock_owner,
                    created_at,
                    updated_at,
                    expires_at
                ) VALUES (
                    :scope_key,
                    :scope_key_hash,
                    :idempotency_key,
                    :fingerprint_hash,
                    'in_progress',
                    '{}'::jsonb,
                    :metadata::jsonb,
                    :lock_owner,
                    :created_at::timestamptz,
                    :updated_at::timestamptz,
                    :expires_at::timestamptz
                )
                ON CONFLICT (scope_key_hash, idempotency_key) DO NOTHING
                RETURNING ledger_id",
                [
                    ':scope_key' => $scopeKey,
                    ':scope_key_hash' => $scopeKeyHash,
                    ':idempotency_key' => $idempotencyKey,
                    ':fingerprint_hash' => $fingerprintHash,
                    ':metadata' => $metadata,
                    ':lock_owner' => $lockOwner,
                    ':created_at' => $now,
                    ':updated_at' => $now,
                    ':expires_at' => $expiresAt,
                ],
            );

            if (is_array($inserted) && $inserted !== []) {
                return [
                    'replay' => false,
                    'lock_owner' => $lockOwner,
                ];
            }

            $existing = $this->db->queryOne(
                "SELECT
                    scope_key,
                    scope_key_hash,
                    idempotency_key,
                    fingerprint_hash,
                    status,
                    status_code,
                    response_payload,
                    metadata,
                    lock_owner,
                    error_class,
                    error_message,
                    created_at,
                    updated_at,
                    completed_at,
                    expires_at
                FROM idempotency_replay_ledger
                WHERE scope_key_hash = :scope_key_hash
                  AND idempotency_key = :idempotency_key
                FOR UPDATE",
                [
                    ':scope_key_hash' => $scopeKeyHash,
                    ':idempotency_key' => $idempotencyKey,
                ],
            );

            if (!is_array($existing)) {
                throw new RuntimeException('Unable to claim idempotency ledger row.');
            }

            $storedFingerprint = trim((string)($existing['fingerprint_hash'] ?? ''));
            if ($storedFingerprint !== '' && !hash_equals($storedFingerprint, $fingerprintHash)) {
                throw new RecordConflictException('Idempotency key was already used for a different request fingerprint.');
            }

            if (($existing['status'] ?? '') === 'in_progress') {
                throw new RecordConflictException('Idempotency request is already in progress.');
            }

            $expired = $this->isExpired($existing);
            if (!$expired && ($existing['status'] ?? '') === 'completed') {
                return [
                    'replay' => true,
                    'status_code' => max(200, (int)($existing['status_code'] ?? 200)),
                    'payload' => $this->decodeJsonArray($existing['response_payload'] ?? null),
                    'stored_at' => (string)($existing['completed_at'] ?? $existing['updated_at'] ?? ''),
                ];
            }

            $affected = $this->db->execute(
                "UPDATE idempotency_replay_ledger
                SET scope_key = :scope_key,
                    fingerprint_hash = :fingerprint_hash,
                    status = 'in_progress',
                    status_code = NULL,
                    response_payload = '{}'::jsonb,
                    metadata = :metadata::jsonb,
                    lock_owner = :lock_owner,
                    error_class = NULL,
                    error_message = NULL,
                    completed_at = NULL,
                    updated_at = :updated_at::timestamptz,
                    expires_at = :expires_at::timestamptz
                WHERE scope_key_hash = :scope_key_hash
                  AND idempotency_key = :idempotency_key",
                [
                    ':scope_key' => $scopeKey,
                    ':scope_key_hash' => $scopeKeyHash,
                    ':idempotency_key' => $idempotencyKey,
                    ':fingerprint_hash' => $fingerprintHash,
                    ':metadata' => $metadata,
                    ':lock_owner' => $lockOwner,
                    ':updated_at' => $now,
                    ':expires_at' => $expiresAt,
                ],
            );

            if ($affected < 1) {
                throw new RuntimeException('Unable to reserve idempotency ledger row.');
            }

            return [
                'replay' => false,
                'lock_owner' => $lockOwner,
            ];
        });
    }

    /**
     * @param array<string, mixed> $state
     * @param array<string, mixed> $payload
     */
    private function complete(
        array $state,
        string $idempotencyKey,
        string $fingerprintHash,
        string $lockOwner,
        int $statusCode,
        array $payload,
    ): string {
        $completedAt = $this->nowIso();
        $affected = $this->db->execute(
            "UPDATE idempotency_replay_ledger
            SET status = 'completed',
                status_code = :status_code,
                response_payload = :response_payload::jsonb,
                lock_owner = NULL,
                error_class = NULL,
                error_message = NULL,
                completed_at = :completed_at::timestamptz,
                updated_at = :updated_at::timestamptz
            WHERE scope_key = :scope_key
              AND scope_key_hash = :scope_key_hash
              AND idempotency_key = :idempotency_key
              AND fingerprint_hash = :fingerprint_hash
              AND lock_owner = :lock_owner",
            [
                ':scope_key' => (string)($state['scope_key'] ?? ''),
                ':scope_key_hash' => (string)($state['scope_key_hash'] ?? hash('sha256', (string)($state['scope_key'] ?? ''))),
                ':idempotency_key' => $idempotencyKey,
                ':fingerprint_hash' => $fingerprintHash,
                ':lock_owner' => $lockOwner,
                ':status_code' => $statusCode,
                ':response_payload' => $this->jsonEncode($payload),
                ':completed_at' => $completedAt,
                ':updated_at' => $completedAt,
            ],
        );

        if ($affected < 1) {
            throw new RuntimeException('Unable to complete idempotency ledger row.');
        }

        return $completedAt;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function markFailed(array $state, string $idempotencyKey, string $fingerprintHash, string $lockOwner, Throwable $e): void
    {
        $failedAt = $this->nowIso();
        $affected = $this->db->execute(
            "UPDATE idempotency_replay_ledger
            SET status = 'failed',
                status_code = NULL,
                response_payload = '{}'::jsonb,
                lock_owner = NULL,
                error_class = :error_class,
                error_message = :error_message,
                updated_at = :updated_at::timestamptz
            WHERE scope_key = :scope_key
              AND scope_key_hash = :scope_key_hash
              AND idempotency_key = :idempotency_key
              AND fingerprint_hash = :fingerprint_hash
              AND lock_owner = :lock_owner",
            [
                ':scope_key' => (string)($state['scope_key'] ?? ''),
                ':scope_key_hash' => (string)($state['scope_key_hash'] ?? hash('sha256', (string)($state['scope_key'] ?? ''))),
                ':idempotency_key' => $idempotencyKey,
                ':fingerprint_hash' => $fingerprintHash,
                ':lock_owner' => $lockOwner,
                ':error_class' => $e::class,
                ':error_message' => $e->getMessage(),
                ':updated_at' => $failedAt,
            ],
        );

        if ($affected < 1) {
            throw new RuntimeException('Unable to persist idempotency failure state.', 0, $e);
        }
    }

    /**
     * @param array<string, mixed> $state
     */
    private function metadataJson(array $state): string
    {
        $metadata = [
            'version' => (string)($state['version'] ?? '1.0'),
            'key_source' => (string)($state['key_source'] ?? ''),
            'mode' => (string)($state['mode'] ?? ''),
            'kind' => (string)($state['kind'] ?? ''),
            'domain' => (string)($state['domain'] ?? ''),
            'table' => (string)($state['table'] ?? ''),
            'user_id' => (string)($state['user_id'] ?? ''),
            'ttl_seconds' => max(0, (int)($state['ttl_seconds'] ?? 0)),
        ];

        if (is_array($state['metadata'] ?? null)) {
            $metadata['descriptor_metadata'] = (array)$state['metadata'];
        }

        return $this->jsonEncode($metadata);
    }

    /**
     * @param mixed $value
     */
    private function jsonEncode(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode idempotency ledger JSON.');
        }
        return $json;
    }

    /**
     * @param mixed $value
     * @return array<string, mixed>
     */
    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function isExpired(array $row): bool
    {
        $expiresAt = trim((string)($row['expires_at'] ?? ''));
        if ($expiresAt === '') {
            return false;
        }
        $ts = strtotime($expiresAt);
        return $ts !== false && $ts < time();
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}

if (!class_exists('MOM\\Services\\PostgresIdempotencyReplayRepository', false)) {
    class_alias(PostgresIdempotencyReplayRepository::class, 'MOM\\Services\\PostgresIdempotencyReplayRepository');
}
