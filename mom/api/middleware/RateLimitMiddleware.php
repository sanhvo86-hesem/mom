<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Services\CacheService;
use Throwable;

/**
 * Rate-limiting middleware using a token-bucket algorithm.
 *
 * Per-user rate limiting with configurable limits per endpoint group.
 * State is stored in Redis through CacheService when injected, with the
 * original JSON file store retained as a local fallback.
 *
 * @package MOM\Api\Middleware
 * @since   2.0.0
 */
class RateLimitMiddleware
{
    /** @var string Directory for rate-limit state files. */
    private string $stateDir;

    /** @var int Default maximum requests per window. */
    private int $defaultMaxRequests;

    /** @var int Default window size in seconds. */
    private int $defaultWindowSeconds;

    /** @var array<string, array{max: int, window: int}> Per-action overrides. */
    private array $endpointLimits;

    /** @var array<int, string> Actions that must bypass generic request throttling. */
    private array $exemptActions;

    /** @var CacheService|null Shared cache used for distributed counters. */
    private ?CacheService $cacheService;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $stateDir             Directory for rate-limit state files.
     * @param int    $defaultMaxRequests   Default max requests per window.
     * @param int    $defaultWindowSeconds Default window size in seconds.
     * @param array  $endpointLimits       Per-action overrides: [action => [max, window]].
     * @param CacheService|null $cacheService Redis-backed cache service. Falls back to file state when unavailable.
     */
    public function __construct(
        string $stateDir,
        int $defaultMaxRequests = 120,
        int $defaultWindowSeconds = 60,
        array $endpointLimits = [],
        ?CacheService $cacheService = null,
    ) {
        $this->stateDir             = rtrim(str_replace('\\', '/', $stateDir), '/');
        $this->defaultMaxRequests   = $defaultMaxRequests;
        $this->defaultWindowSeconds = $defaultWindowSeconds;
        $this->cacheService         = $cacheService;

        // Default stricter limits for sensitive endpoints
        $this->endpointLimits = array_merge([
            'auth_login'         => ['max' => 10, 'window' => 300],
            'auth_mfa_verify'    => ['max' => 10, 'window' => 300],
            'auth_enroll_verify' => ['max' => 10, 'window' => 300],
            'admin_git_sync'     => ['max' => 5,  'window' => 60],
            'admin_git_pull'     => ['max' => 5,  'window' => 60],
        ], $endpointLimits);

        // These actions are only reachable through nginx internal auth_request
        // and may fan out into dozens of subrequests for a single page load.
        // Applying the generic per-user limiter here causes false 429s for
        // Netdata/Grafana assets and chart APIs.
        $this->exemptActions = [
            'vps_terminal_auth',
            'vps_observability_auth',
        ];
    }

    /**
     * Create the middleware callable.
     *
     * @return callable(string, callable): void
     */
    public function handler(): callable
    {
        $self = $this;

        return static function (string $action, callable $next) use ($self): void {
            $self->check($action);
            $next();
        };
    }

    /**
     * Perform the rate-limit check for the given action.
     *
     * Uses a sliding-window counter. Sends 429 response if limit is exceeded.
     *
     * @param string $action The action being rate-limited.
     * @return void
     */
    public function check(string $action): void
    {
        if (in_array($action, $this->exemptActions, true)) {
            return;
        }

        // Determine user key
        $userKey = 'anon_' . $this->clientIp();
        if (!empty($_SESSION['user'])) {
            $userKey = 'user_' . (string)$_SESSION['user'];
        }

        // Determine limits for this action
        $limits = $this->endpointLimits[$action] ?? null;
        $maxRequests   = $limits['max'] ?? $this->defaultMaxRequests;
        $windowSeconds = $limits['window'] ?? $this->defaultWindowSeconds;

        $bucketKey = $this->bucketKey($userKey, $action);

        if ($this->cacheService !== null) {
            try {
                $this->checkWithCache($bucketKey, $maxRequests, $windowSeconds);
                return;
            } catch (ExitException $e) {
                throw $e;
            } catch (Throwable $e) {
                @error_log('[RateLimitMiddleware] Cache backend failed, falling back to file store: ' . $e->getMessage());
            }
        }

        $this->checkWithFileStore($bucketKey, $maxRequests, $windowSeconds);
    }

    /**
     * Perform a Redis-backed rate-limit check via CacheService.
     *
     * @param string $bucketKey     Sanitized subject/action key.
     * @param int    $maxRequests   Max allowed hits per window.
     * @param int    $windowSeconds Window size in seconds.
     * @return void
     */
    private function checkWithCache(string $bucketKey, int $maxRequests, int $windowSeconds): void
    {
        $now = time();
        $ttl = max(1, $windowSeconds);
        $startKey = 'ratelimit:' . $bucketKey . ':start';
        $countKey = 'ratelimit:' . $bucketKey . ':count';

        $this->cacheService?->setNx($startKey, $now, $ttl);
        $windowStart = (int)($this->cacheService?->get($startKey) ?? $now);
        if ($windowStart <= 0) {
            $windowStart = $now;
            $this->cacheService?->set($startKey, $windowStart, $ttl);
        }

        $hits = (int)($this->cacheService?->increment($countKey, 1, $ttl) ?? 1);
        if ($hits > $maxRequests) {
            $this->throwRateLimited($maxRequests, $windowSeconds, $windowStart, $now);
        }

        $this->emitRateLimitHeaders($maxRequests, max(0, $maxRequests - $hits), $windowStart + $windowSeconds);
    }

    /**
     * Perform the legacy file-backed rate-limit check.
     *
     * @param string $bucketKey     Sanitized subject/action key.
     * @param int    $maxRequests   Max allowed hits per window.
     * @param int    $windowSeconds Window size in seconds.
     * @return void
     */
    private function checkWithFileStore(string $bucketKey, int $maxRequests, int $windowSeconds): void
    {
        $stateFile = $this->stateDir . '/' . $bucketKey . '.json';

        if (!is_dir($this->stateDir)) {
            @mkdir($this->stateDir, 0775, true);
        }

        // Load current state
        $now   = time();
        $state = ['start' => $now, 'hits' => 0, 'tokens' => $maxRequests];

        if (is_file($stateFile)) {
            $raw = @file_get_contents($stateFile);
            $tmp = json_decode((string)$raw, true);
            if (is_array($tmp) && isset($tmp['start'], $tmp['hits'])) {
                $state = $tmp;
            }
        }

        // Token bucket: refill tokens based on elapsed time
        $elapsed = $now - (int)$state['start'];
        if ($elapsed >= $windowSeconds) {
            // Window expired, reset
            $state = ['start' => $now, 'hits' => 0, 'tokens' => $maxRequests];
        } else {
            // Refill tokens proportionally
            $refillRate   = (float)$maxRequests / (float)$windowSeconds;
            $refillTokens = (int)floor($elapsed * $refillRate);
            $state['tokens'] = min($maxRequests, (int)($state['tokens'] ?? 0) + $refillTokens);
        }

        // Consume a token
        $state['hits'] = (int)($state['hits'] ?? 0) + 1;

        if ((int)$state['hits'] > $maxRequests) {
            // Rate limited
            @file_put_contents($stateFile, json_encode($state), LOCK_EX);

            $this->throwRateLimited($maxRequests, $windowSeconds, (int)$state['start'], $now);
        }

        // Save state and set rate-limit headers
        @file_put_contents($stateFile, json_encode($state), LOCK_EX);

        $remaining = max(0, $maxRequests - (int)$state['hits']);
        $this->emitRateLimitHeaders($maxRequests, $remaining, (int)$state['start'] + $windowSeconds);
    }

    /**
     * Build a safe storage key for a subject/action bucket.
     *
     * @param string $userKey Subject key.
     * @param string $action  API action key.
     * @return string
     */
    private function bucketKey(string $userKey, string $action): string
    {
        return (string)preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $userKey . '__' . $action);
    }

    /**
     * Emit standard rate-limit headers.
     *
     * @param int $limit     Max allowed hits.
     * @param int $remaining Remaining hits.
     * @param int $resetAt   Unix timestamp when the bucket resets.
     * @return void
     */
    private function emitRateLimitHeaders(int $limit, int $remaining, int $resetAt): void
    {
        header('X-RateLimit-Limit: ' . $limit);
        header('X-RateLimit-Remaining: ' . $remaining);
        header('X-RateLimit-Reset: ' . $resetAt);
    }

    /**
     * Throw the structured 429 response used by both storage backends.
     *
     * @param int $maxRequests   Max allowed hits.
     * @param int $windowSeconds Window size in seconds.
     * @param int $windowStart   Unix timestamp when the bucket opened.
     * @param int $now           Current Unix timestamp.
     * @return never
     */
    private function throwRateLimited(int $maxRequests, int $windowSeconds, int $windowStart, int $now): never
    {
        $retryAfter = $windowSeconds - ($now - $windowStart);
        throw ExitException::json([
            'ok'          => false,
            'error'       => 'rate_limited',
            'retry_after' => max(1, $retryAfter),
            'server_time' => gmdate('c'),
        ], 429, [
            'Retry-After' => (string)max(1, $retryAfter),
            'X-RateLimit-Limit' => (string)$maxRequests,
            'X-RateLimit-Remaining' => '0',
            'X-RateLimit-Reset' => (string)($windowStart + $windowSeconds),
        ]);
    }

    /**
     * Get the client IP address.
     *
     * @return string
     */
    private function clientIp(): string
    {
        return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }
}
