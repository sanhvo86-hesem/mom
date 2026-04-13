<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;
use Throwable;

/**
 * JSON-only compatibility replay store.
 *
 * This repository is intentionally selected only when PostgreSQL is disabled.
 */
final class FileIdempotencyReplayRepository implements IdempotencyReplayRepository
{
    private string $storeDir;

    public function __construct(string $dataDir)
    {
        $this->storeDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/idempotency';
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
        $path = $this->statePath($scopeKey, $idempotencyKey);
        $lockPath = $path . '.lock';
        $this->ensureDirectory(dirname($path));

        $handle = @fopen($lockPath, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Unable to open idempotency lock.');
        }

        try {
            if (!@flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock idempotency state.');
            }

            $existing = $this->readState($path);
            $replay = $this->replayExistingState($existing, $fingerprintHash);
            if ($replay !== null) {
                return $replay;
            }

            if (
                $existing !== null
                && !$this->isExpired($existing)
                && ($existing['status'] ?? '') === 'in_progress'
                && !$this->isInProgressStale($existing, $retryWindowSeconds)
            ) {
                throw new RecordConflictException('Idempotency request is already in progress.');
            }

            $this->writeState($path, $state);

            try {
                $result = $operation();
            } catch (Throwable $e) {
                $state['status'] = 'failed';
                $state['updated_at'] = $this->nowIso();
                $state['error_class'] = $e::class;
                $state['error_message'] = $e->getMessage();
                $this->writeState($path, $state);
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
            $this->writeState($path, $state);

            return [
                'status_code' => $statusCode,
                'payload' => $payload,
                'replayed' => false,
                'stored_at' => $completedAt,
            ];
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
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

    private function statePath(string $scopeKey, string $idempotencyKey): string
    {
        $hash = hash('sha256', $scopeKey . '|' . $idempotencyKey);
        $bucket = substr($hash, 0, 2);
        return $this->storeDir . '/' . $bucket . '/' . $hash . '.json';
    }

    private function ensureDirectory(string $dir): void
    {
        if (is_dir($dir)) {
            return;
        }
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize idempotency storage.');
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readState(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function writeState(string $path, array $state): void
    {
        $this->ensureDirectory(dirname($path));
        $tmp = $path . '.tmp';
        $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode idempotency state.');
        }
        if (@file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException('Unable to persist idempotency state.');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to finalize idempotency state.');
        }
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

    /**
     * @param array<string, mixed> $state
     */
    private function isInProgressStale(array $state, int $retryWindowSeconds): bool
    {
        $updatedAt = trim((string)($state['updated_at'] ?? ''));
        if ($updatedAt === '') {
            return false;
        }
        $ts = strtotime($updatedAt);
        return $ts !== false && $ts <= (time() - max(15, $retryWindowSeconds));
    }

    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
