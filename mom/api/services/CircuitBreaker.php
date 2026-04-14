<?php
declare(strict_types=1);
namespace MOM\Services;

use MOM\Api\Services\CacheService;

/**
 * Circuit Breaker for external service calls (Epicor, etc.)
 * States: CLOSED (normal) → OPEN (fail fast) → HALF_OPEN (test)
 *
 * Prevents cascading failures when external services are unavailable.
 * Config: failure_threshold (default 3), recovery_timeout_sec (default 60), half_open_max (default 1)
 */
final class CircuitBreaker
{
    private const STATE_CLOSED    = 'closed';
    private const STATE_OPEN      = 'open';
    private const STATE_HALF_OPEN = 'half_open';

    private string $state = self::STATE_CLOSED;
    private int $failureCount = 0;
    private int $successCount = 0;
    private ?float $lastFailureTime = null;
    private ?float $openedAt = null;

    private int $failureThreshold;
    private int $recoveryTimeoutSec;
    private int $halfOpenMaxAttempts;
    private string $stateFile;
    private string $stateKey;
    private ?CacheService $cacheService;

    // WRK-004 FIX: Track if a half-open test request is currently in progress
    private bool $halfOpenTestInProgress = false;

    public function __construct(
        string $stateDir,
        string $serviceName = 'default',
        int $failureThreshold = 3,
        int $recoveryTimeoutSec = 60,
        int $halfOpenMaxAttempts = 1,
        ?CacheService $cacheService = null,
    ) {
        $this->failureThreshold = $failureThreshold;
        $this->recoveryTimeoutSec = $recoveryTimeoutSec;
        $this->halfOpenMaxAttempts = $halfOpenMaxAttempts;
        $this->cacheService = $cacheService;

        if (!is_dir($stateDir)) @mkdir($stateDir, 0775, true);
        $serviceKey = (string)preg_replace('/[^a-z0-9_]/', '_', strtolower($serviceName));
        $this->stateKey = 'circuit_breaker:' . $serviceKey;
        $this->stateFile = rtrim($stateDir, '/\\') . '/circuit_breaker_' . $serviceKey . '.json';
        $this->loadState();
    }

    /** Check if request is allowed. Returns true if circuit allows the call. */
    public function allowRequest(): bool
    {
        $this->evaluateState();

        if ($this->state === self::STATE_CLOSED) return true;

        // REAUDIT-R6-021: In HALF_OPEN state, only allow ONE test request at a time.
        // Other concurrent requests must wait or be rejected.
        if ($this->state === self::STATE_HALF_OPEN) {
            // Only allow if no other request is already testing
            if ($this->isHalfOpenTestInProgress()) {
                return false; // Another request is already testing, reject this one
            }
            $this->setHalfOpenTestInProgress(true); // Mark that a test is in progress
            return true; // Allow this test request
        }

        // STATE_OPEN: check if recovery timeout has elapsed
        return false;
    }

    /** Record a successful call. */
    public function recordSuccess(): void
    {
        if ($this->state === self::STATE_HALF_OPEN) {
            $this->successCount++;
            if ($this->successCount >= $this->halfOpenMaxAttempts) {
                $this->state = self::STATE_CLOSED;
                $this->failureCount = 0;
                $this->successCount = 0;
                $this->openedAt = null;
            }
            // REAUDIT-R6-021: Clear the half-open test flag after success
            $this->setHalfOpenTestInProgress(false);
        } else {
            $this->failureCount = 0;
        }
        $this->saveState();
    }

    /** Record a failed call. */
    public function recordFailure(): void
    {
        $this->failureCount++;
        $this->lastFailureTime = microtime(true);

        if ($this->state === self::STATE_HALF_OPEN) {
            $this->state = self::STATE_OPEN;
            $this->openedAt = microtime(true);
            $this->successCount = 0;
            // REAUDIT-R6-021: Clear the half-open test flag after failure
            $this->setHalfOpenTestInProgress(false);
        } elseif ($this->failureCount >= $this->failureThreshold) {
            $this->state = self::STATE_OPEN;
            $this->openedAt = microtime(true);
        }
        $this->saveState();
    }

    /** Get current state for health checks. */
    public function getStatus(): array
    {
        $this->evaluateState();
        return [
            'state' => $this->state,
            'failure_count' => $this->failureCount,
            'success_count' => $this->successCount,
            'failure_threshold' => $this->failureThreshold,
            'recovery_timeout_sec' => $this->recoveryTimeoutSec,
            'last_failure_at' => $this->lastFailureTime ? date('c', (int)$this->lastFailureTime) : null,
            'opened_at' => $this->openedAt ? date('c', (int)$this->openedAt) : null,
            'time_in_open_sec' => $this->openedAt ? (int)(microtime(true) - $this->openedAt) : 0,
        ];
    }

    /** Check if recovery timeout elapsed and transition OPEN → HALF_OPEN. */
    private function evaluateState(): void
    {
        if ($this->state === self::STATE_OPEN && $this->openedAt !== null) {
            $elapsed = microtime(true) - $this->openedAt;
            if ($elapsed >= $this->recoveryTimeoutSec) {
                $this->state = self::STATE_HALF_OPEN;
                $this->successCount = 0;
                $this->saveState();
            }
        }
    }

    private function loadState(): void
    {
        if ($this->cacheService !== null) {
            try {
                $data = $this->cacheService->get($this->stateKey);
                if (is_array($data)) {
                    $this->hydrateState($data);
                    return;
                }
            } catch (\Throwable $e) {
                @error_log('[CircuitBreaker] Cache load failed, falling back to file store: ' . $e->getMessage());
            }
        }

        if (!is_file($this->stateFile)) return;
        $lockHandle = @fopen($this->stateFile, 'r');
        if ($lockHandle) {
            if (@flock($lockHandle, LOCK_SH)) {
                try {
                    $data = json_decode(@file_get_contents($this->stateFile) ?: '', true);
                    if (!is_array($data)) return;
                    $this->hydrateState($data);
                } finally {
                    @flock($lockHandle, LOCK_UN);
                    @fclose($lockHandle);
                }
                return;
            } else {
                @fclose($lockHandle); // Close even when lock fails
            }
        }
        // Lock failed - attempt non-locked read
        $data = json_decode(@file_get_contents($this->stateFile) ?: '', true);
        if (!is_array($data)) return;
        $this->hydrateState($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function hydrateState(array $data): void
    {
        $this->state = $data['state'] ?? self::STATE_CLOSED;
        $this->failureCount = (int)($data['failure_count'] ?? 0);
        $this->successCount = (int)($data['success_count'] ?? 0);
        $this->lastFailureTime = isset($data['last_failure_time']) ? (float)$data['last_failure_time'] : null;
        $this->openedAt = isset($data['opened_at']) ? (float)$data['opened_at'] : null;
    }

    private function saveState(): void
    {
        $state = [
            'state' => $this->state,
            'failure_count' => $this->failureCount,
            'success_count' => $this->successCount,
            'last_failure_time' => $this->lastFailureTime,
            'opened_at' => $this->openedAt,
            'updated_at' => date('c'),
        ];

        if ($this->cacheService !== null) {
            try {
                $this->cacheService->set($this->stateKey, $state);
                return;
            } catch (\Throwable $e) {
                @error_log('[CircuitBreaker] Cache save failed, falling back to file store: ' . $e->getMessage());
            }
        }

        @file_put_contents($this->stateFile, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX);
    }

    /**
     * REAUDIT-R6-021: Check if a half-open test is currently in progress.
     * Uses Redis for distribution across PHP-FPM workers if cache is available.
     */
    private function isHalfOpenTestInProgress(): bool
    {
        if ($this->cacheService !== null) {
            try {
                $testKey = $this->stateKey . ':test_in_progress';
                $value = $this->cacheService->get($testKey);
                return $value === true;
            } catch (\Throwable $e) {
                @error_log('[CircuitBreaker] Cache check failed: ' . $e->getMessage());
                // Fall back to instance variable
            }
        }

        return $this->halfOpenTestInProgress;
    }

    /**
     * REAUDIT-R6-021: Set or clear the half-open test in progress flag.
     * Uses Redis for distribution across PHP-FPM workers if cache is available.
     */
    private function setHalfOpenTestInProgress(bool $value): void
    {
        if ($this->cacheService !== null) {
            try {
                $testKey = $this->stateKey . ':test_in_progress';
                if ($value) {
                    // Set with 5-second TTL to auto-expire if process dies
                    $this->cacheService->set($testKey, true, 5);
                } else {
                    // Clear the flag immediately
                    $this->cacheService->delete($testKey);
                }
                return;
            } catch (\Throwable $e) {
                @error_log('[CircuitBreaker] Cache set failed: ' . $e->getMessage());
                // Fall back to instance variable
            }
        }

        $this->halfOpenTestInProgress = $value;
    }
}
