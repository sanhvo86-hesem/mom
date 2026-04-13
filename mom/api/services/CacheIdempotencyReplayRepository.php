<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use Throwable;

/**
 * Redis-capable compatibility replay store for DB-disabled runtime.
 */
final class CacheIdempotencyReplayRepository implements IdempotencyReplayRepository
{
    public function __construct(private CacheService $cacheService)
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
        $scopeKey = (string)($state['scope_key'] ?? '');
        $stateKey = $this->stateKey($scopeKey, $idempotencyKey);
        $lockKey = $stateKey . ':lock';
        $stateTtl = max(15, (int)($state['ttl_seconds'] ?? 86400));
        $inProgressTtl = max($stateTtl, 86400);
        $lockTtl = max(5, $inProgressTtl, $retryWindowSeconds);

        $existing = $this->cacheState($stateKey);
        $replay = $this->replayExistingState($existing, $fingerprintHash);
        if ($replay !== null) {
            return $replay;
        }

        $lockOwner = bin2hex(random_bytes(8));
        if (!$this->cacheService->setNx($lockKey, [
            'owner' => $lockOwner,
            'created_at' => $this->nowIso(),
        ], $lockTtl)) {
            $existing = $this->cacheState($stateKey);
            $replay = $this->replayExistingState($existing, $fingerprintHash);
            if ($replay !== null) {
                return $replay;
            }
            if ($existing !== null && ($existing['status'] ?? '') === 'in_progress') {
                throw new RecordConflictException('Idempotency request is already in progress.');
            }
            throw new RecordConflictException('Idempotency request is already in progress.');
        }

        try {
            $existing = $this->cacheState($stateKey);
            $replay = $this->replayExistingState($existing, $fingerprintHash);
            if ($replay !== null) {
                return $replay;
            }
            if ($existing !== null && ($existing['status'] ?? '') === 'in_progress') {
                throw new RecordConflictException('Idempotency request is already in progress.');
            }

            $this->cacheService->set($stateKey, $state, $inProgressTtl);

            try {
                $result = $operation();
            } catch (Throwable $e) {
                $state['status'] = 'failed';
                $state['updated_at'] = $this->nowIso();
                $state['error_class'] = $e::class;
                $state['error_message'] = $e->getMessage();
                try {
                    $this->cacheService->set($stateKey, $state, $stateTtl);
                } catch (Throwable $ledgerFailure) {
                    @error_log('[Idempotency] cache failure marker write failed: ' . $ledgerFailure->getMessage());
                }
                throw $e;
            }

            $completedAt = $this->nowIso();
            $payload = is_array($result['payload'] ?? null) ? (array)$result['payload'] : [];
            $statusCode = max(200, (int)($result['status_code'] ?? 200));

            $state['status'] = 'completed';
            $state['updated_at'] = $completedAt;
            $state['completed_at'] = $completedAt;
            $state['status_code'] = $statusCode;
            $state['response_payload'] = $payload;
            unset($state['error_class'], $state['error_message']);
            $this->cacheService->set($stateKey, $state, $stateTtl);

            return [
                'status_code' => $statusCode,
                'payload' => $payload,
                'replayed' => false,
                'stored_at' => $completedAt,
            ];
        } finally {
            $this->cacheService->delete($lockKey);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function cacheState(string $stateKey): ?array
    {
        $state = $this->cacheService->get($stateKey);
        return is_array($state) ? $state : null;
    }

    /**
     * @param array<string, mixed>|null $existing
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}|null
     */
    private function replayExistingState(?array $existing, string $fingerprintHash): ?array
    {
        if ($existing === null || $this->isExpired($existing)) {
            return null;
        }

        $storedFingerprint = trim((string)($existing['fingerprint_hash'] ?? $existing['fingerprint'] ?? ''));
        if ($storedFingerprint !== '' && !hash_equals($storedFingerprint, $fingerprintHash)) {
            throw new RecordConflictException('Idempotency key was already used for a different request fingerprint.');
        }

        if (($existing['status'] ?? '') === 'completed' && is_array($existing['response_payload'] ?? null)) {
            return [
                'status_code' => max(200, (int)($existing['status_code'] ?? 200)),
                'payload' => (array)$existing['response_payload'],
                'replayed' => true,
                'stored_at' => (string)($existing['completed_at'] ?? $existing['updated_at'] ?? ''),
            ];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function isExpired(array $state): bool
    {
        $expiresAt = trim((string)($state['expires_at'] ?? ''));
        if ($expiresAt === '') {
            return false;
        }
        $ts = strtotime($expiresAt);
        return $ts !== false && $ts < time();
    }

    private function stateKey(string $scopeKey, string $idempotencyKey): string
    {
        return 'state:' . hash('sha256', $scopeKey . '|' . $idempotencyKey);
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}

if (!class_exists('MOM\\Services\\CacheIdempotencyReplayRepository', false)) {
    class_alias(CacheIdempotencyReplayRepository::class, 'MOM\\Services\\CacheIdempotencyReplayRepository');
}
