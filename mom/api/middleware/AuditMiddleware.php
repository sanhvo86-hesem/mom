<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;
use Throwable;

/**
 * Audit trail middleware for HESEM MOM API.
 *
 * Legacy request-access audit sink.
 *
 * This middleware is disabled by default because governed records must use the
 * canonical DB-backed audit trail. Enable only for short-lived diagnostics.
 *
 * @package MOM\Api\Middleware
 * @since   2.0.0
 */
class AuditMiddleware
{
    /** @var string Absolute path to the audit log file. */
    private string $logFile;

    /** @var list<string> Actions to skip logging (high-frequency, low-risk). */
    private array $skipActions;

    private static int $writeFailureCount = 0;
    private static ?string $lastWriteFailureAt = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string       $logFile     Absolute path to audit log file.
     * @param list<string> $skipActions Actions to skip (e.g. 'status' for health checks).
     */
    public function __construct(string $logFile, array $skipActions = [], private readonly bool $enabled = false)
    {
        $this->logFile     = $logFile;
        $this->skipActions = $skipActions ?: ['status'];
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
            // Skip logging for high-frequency endpoints
            if (in_array($action, $self->skipActions, true)) {
                $next();
                return;
            }

            $startTime = microtime(true);
            $entry = [
                'action'    => $action,
                'user'      => (string)($_SESSION['user'] ?? 'anonymous'),
                'ip'        => (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
                'method'    => strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')),
                'uri'       => (string)($_SERVER['REQUEST_URI'] ?? '/'),
                'timestamp' => gmdate('c'),
            ];

            // Capture request summary (sanitized)
            $entry['request'] = $self->summarizeRequest();

            $responseCode = 200;

            try {
                $next();
                $responseCode = http_response_code() ?: 200;
            } catch (Throwable $e) {
                $responseCode = $e instanceof ExitException
                    ? $e->getStatusCode()
                    : (http_response_code() ?: 500);
                throw $e;
            } finally {
                $entry['response_code'] = $responseCode;
                $entry['duration_ms']   = round((microtime(true) - $startTime) * 1000, 2);
                $self->writeEntry($entry);
            }
        };
    }

    /**
     * Create a sanitized summary of the current request.
     *
     * Captures query params and a truncated body summary. Strips sensitive
     * fields like passwords and TOTP codes.
     *
     * @return array{query: array<string, string>, body_keys: list<string>}
     */
    public function summarizeRequest(): array
    {
        // INFRA-012 FIX + NEW-R6-004: Expanded sensitive params list (financial/PII/auth fields)
        $sensitiveParams = [
            'password', 'pw', 'pass', 'passwd',
            'token', 'access_token', 'refresh_token', 'id_token',
            'code', 'otp', 'pin', 'mfa_code',
            'secret', 'client_secret',
            'key', 'api_key', 'private_key',
            'csrf', 'xsrf',
            'card_number', 'cvv', 'cvc', 'ccv',
            'ssn', 'sin', 'tax_id',
            'passphrase', 'authorization',
        ];
        $query = array_diff_key($_GET, array_flip($sensitiveParams));

        // Body keys only (not values, to avoid logging sensitive data)
        $raw = $GLOBALS['__mom_raw_input'] ?? ($GLOBALS['__mom_raw_input'] = @file_get_contents('php://input') ?: '');
        $bodyKeys = [];
        if ($raw !== false && trim($raw) !== '') {
            $body = json_decode($raw, true);
            if (is_array($body)) {
                $bodyKeys = array_keys($body);
            }
        }

        return [
            'query'     => array_map('strval', $query),
            'body_keys' => $bodyKeys,
        ];
    }

    /**
     * Write an audit entry to the log file.
     * SECURITY FIX PIPE-AUDIT-001: Implements log rotation (10MB max) and URI sanitization.
     *
     * @param array $entry Audit log entry.
     * @return void
     */
    public function writeEntry(array $entry): void
    {
        if (!$this->enabled) {
            return;
        }

        $dir = dirname($this->logFile);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        // SECURITY FIX PIPE-AUDIT-001: Sanitize URI to remove query parameters (may contain sensitive data)
        if (isset($entry['uri']) && is_string($entry['uri'])) {
            // Keep only the path part, discard query string and fragment
            $uri = $entry['uri'];
            if (($qpos = strpos($uri, '?')) !== false) {
                $uri = substr($uri, 0, $qpos);
            }
            if (($fpos = strpos($uri, '#')) !== false) {
                $uri = substr($uri, 0, $fpos);
            }
            $entry['uri'] = $uri;
        }

        // SECURITY FIX PIPE-AUDIT-001: Implement log rotation when file exceeds 10MB
        if (is_file($this->logFile)) {
            $fileSize = filesize($this->logFile);
            if ($fileSize !== false && $fileSize > 10 * 1024 * 1024) {
                // Rotate the log: rename to {logfile}.{Y-m-d-H-i-s}
                $rotatedName = $this->logFile . '.' . gmdate('Y-m-d-H-i-s');
                @rename($this->logFile, $rotatedName);
            }
        }

        $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($line === false || @file_put_contents($this->logFile, $line . "\n", FILE_APPEND | LOCK_EX) === false) {
            self::$writeFailureCount++;
            self::$lastWriteFailureAt = gmdate('c');
            @error_log('[AuditMiddleware] Legacy audit file sink write failed');
        }
    }

    /**
     * @return array{write_failure_count:int,last_write_failure_at:?string}
     */
    public static function legacySinkHealth(): array
    {
        return [
            'write_failure_count' => self::$writeFailureCount,
            'last_write_failure_at' => self::$lastWriteFailureAt,
        ];
    }

    public static function resetLegacySinkHealthForTests(): void
    {
        if (!defined('API_THROW_RESPONSES') || !API_THROW_RESPONSES) {
            return;
        }
        self::$writeFailureCount = 0;
        self::$lastWriteFailureAt = null;
    }
}
