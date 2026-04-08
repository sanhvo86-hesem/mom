<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;

/**
 * Rate-limiting middleware using a token-bucket algorithm.
 *
 * Per-user rate limiting with configurable limits per endpoint group.
 * State is stored in JSON files under the ratelimit directory.
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

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $stateDir             Directory for rate-limit state files.
     * @param int    $defaultMaxRequests   Default max requests per window.
     * @param int    $defaultWindowSeconds Default window size in seconds.
     * @param array  $endpointLimits       Per-action overrides: [action => [max, window]].
     */
    public function __construct(
        string $stateDir,
        int $defaultMaxRequests = 120,
        int $defaultWindowSeconds = 60,
        array $endpointLimits = [],
    ) {
        $this->stateDir             = rtrim(str_replace('\\', '/', $stateDir), '/');
        $this->defaultMaxRequests   = $defaultMaxRequests;
        $this->defaultWindowSeconds = $defaultWindowSeconds;

        // Default stricter limits for sensitive endpoints
        $this->endpointLimits = array_merge([
            'auth_login'         => ['max' => 10, 'window' => 300],
            'auth_mfa_verify'    => ['max' => 10, 'window' => 300],
            'auth_enroll_verify' => ['max' => 10, 'window' => 300],
            'admin_git_sync'     => ['max' => 5,  'window' => 60],
            'admin_git_pull'     => ['max' => 5,  'window' => 60],
        ], $endpointLimits);
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
        // Determine user key
        $userKey = 'anon_' . $this->clientIp();
        if (!empty($_SESSION['user'])) {
            $userKey = 'user_' . (string)$_SESSION['user'];
        }

        // Determine limits for this action
        $limits = $this->endpointLimits[$action] ?? null;
        $maxRequests   = $limits['max'] ?? $this->defaultMaxRequests;
        $windowSeconds = $limits['window'] ?? $this->defaultWindowSeconds;

        // Build state file key
        $bucketKey = preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $userKey . '__' . $action);
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

            $retryAfter = $windowSeconds - ($now - (int)$state['start']);
            throw ExitException::json([
                'ok'          => false,
                'error'       => 'rate_limited',
                'retry_after' => max(1, $retryAfter),
                'server_time' => gmdate('c'),
            ], 429, [
                'Retry-After' => (string)max(1, $retryAfter),
                'X-RateLimit-Limit' => (string)$maxRequests,
                'X-RateLimit-Remaining' => '0',
                'X-RateLimit-Reset' => (string)((int)$state['start'] + $windowSeconds),
            ]);
        }

        // Save state and set rate-limit headers
        @file_put_contents($stateFile, json_encode($state), LOCK_EX);

        $remaining = max(0, $maxRequests - (int)$state['hits']);
        header('X-RateLimit-Limit: ' . $maxRequests);
        header('X-RateLimit-Remaining: ' . $remaining);
        header('X-RateLimit-Reset: ' . ((int)$state['start'] + $windowSeconds));
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
