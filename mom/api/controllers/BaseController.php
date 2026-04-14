<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * Base controller with shared utilities for all QMS API controllers.
 *
 * Provides DataLayer injection, request parsing, response helpers,
 * permission checking, input validation, and audit logging shortcuts.
 *
 * @package MOM\Api\Controllers
 * @since   2.0.0
 */
abstract class BaseController
{
    /** @var DataLayer Shared data abstraction layer. */
    protected DataLayer $data;

    /** @var string Absolute path to project root. */
    protected string $rootDir;

    /** @var string Absolute path to data directory. */
    protected string $dataDir;

    /** @var string Absolute path to config directory. */
    protected string $confDir;

    /** @var array|null Cached JSON body (parsed once). */
    private ?array $jsonBodyCache = null;

    /** @var array|null Cached user store. */
    protected ?array $store = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param DataLayer $data    Shared data layer instance.
     * @param string    $rootDir Absolute path to project root.
     * @param string    $dataDir Absolute path to data directory.
     */
    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        $this->data    = $data;
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->confDir = $this->dataDir . '/config';
    }

    /**
     * Inject the user store (loaded once by the Router).
     *
     * @param array|null $store Users store data.
     * @return static
     */
    public function setStore(?array $store): static
    {
        $this->store = $store;
        return $this;
    }

    // ── Request Helpers ─────────────────────────────────────────────────────

    /**
     * Read and cache the JSON request body.
     *
     * @return array Decoded body (empty array if not JSON).
     */
    protected function jsonBody(int $maxBytes = 10485760): array
    {
        if ($this->jsonBodyCache !== null) {
            return $this->jsonBodyCache;
        }
        if (!array_key_exists('__mom_raw_input', $GLOBALS)) {
            $readLimit = max(1, $maxBytes) + 1;
            $raw = @file_get_contents('php://input', false, null, 0, $readLimit);
            $GLOBALS['__mom_raw_input'] = ($raw !== false) ? $raw : '';
        }
        $raw = $GLOBALS['__mom_raw_input'];
        if (strlen($raw) > max(1, $maxBytes)) {
            $limitMb = round(max(1, $maxBytes) / 1048576, 1);
            $this->error('request_body_too_large', 413, 'Request body exceeds ' . $limitMb . 'MB limit');
        }

        // Validate Content-Type header if body is non-empty
        if (strlen($raw) > 0 && trim($raw) !== '') {
            $contentType = $this->requestHeader('Content-Type');
            if ($contentType !== null && !str_contains($contentType, 'application/json')) {
                $this->error('unsupported_media_type', 415, 'Content-Type must be application/json');
            }
        }

        if ($raw === false || trim($raw) === '') {
            return $this->jsonBodyCache = [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->error('invalid_json_body', 400, 'Request body must be a JSON object or array');
        }
        return $this->jsonBodyCache = $data;
    }

    /**
     * Get a query parameter with optional default.
     *
     * @param string      $key     Parameter name.
     * @param string|null $default Default value.
     * @return string|null
     */
    protected function query(string $key, ?string $default = null): ?string
    {
        return isset($_GET[$key]) ? (string)$_GET[$key] : $default;
    }

    /**
     * Get a scalar input parameter from query string or JSON body.
     *
     * Query parameters win when both are present.
     *
     * @param string      $key     Parameter name.
     * @param string|null $default Default value.
     * @return string|null
     */
    protected function input(string $key, ?string $default = null): ?string
    {
        if (isset($_GET[$key])) {
            return (string)$_GET[$key];
        }

        $body = $this->jsonBody();
        if (!array_key_exists($key, $body)) {
            return $default;
        }

        $value = $body[$key];
        if (is_scalar($value) || $value === null) {
            return $value === null ? $default : (string)$value;
        }

        return $default;
    }

    /**
     * Get a request header value by case-insensitive name.
     *
     * @param string $name Header name.
     * @return string|null
     */
    protected function requestHeader(string $name): ?string
    {
        $target = strtolower(trim($name));
        if ($target === '') {
            return null;
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $headerName => $value) {
                    if (strtolower(trim((string)$headerName)) === $target) {
                        return is_scalar($value) ? (string)$value : null;
                    }
                }
            }
        }

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$serverKey]) && is_scalar($_SERVER[$serverKey])) {
            return (string)$_SERVER[$serverKey];
        }

        return null;
    }

    /**
     * Get the HTTP request method (uppercase).
     *
     * @return string
     */
    protected function method(): string
    {
        return strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    /**
     * Get uploaded file info by field name.
     *
     * @param string $field Form field name.
     * @return array|null File info array or null.
     */
    protected function uploadedFile(string $field): ?array
    {
        if (!isset($_FILES[$field]) || ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        return $_FILES[$field];
    }

    /**
     * Get the client IP address.
     *
     * @return string
     */
    protected function clientIp(): string
    {
        return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    // ── Response Helpers ────────────────────────────────────────────────────

    /**
     * Send a JSON response and terminate.
     *
     * @param array $payload Response data.
     * @param int   $code    HTTP status code.
     * @return never
     */
    protected function json(array $payload, int $code = 200): never
    {
        api_json($payload, $code);
        throw new RuntimeException('api_json did not terminate the request');
    }

    /**
     * Send a success response.
     *
     * @param array $extra Additional keys to merge.
     * @param int   $code  HTTP status code.
     * @return never
     */
    protected function success(array $extra = [], int $code = 200): never
    {
        $this->json(array_merge(['ok' => true, 'server_time' => $this->nowIso()], $extra), $code);
    }

    /**
     * Send an empty response body.
     *
     * @param int                    $code    HTTP status code.
     * @param array<string, string>  $headers Extra response headers.
     * @return never
     */
    protected function emptyResponse(int $code = 204, array $headers = []): never
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        $headers = array_merge([
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'same-origin',
        ], $headers);

        if (defined('API_THROW_RESPONSES') && API_THROW_RESPONSES) {
            throw ExitException::empty($code, $headers);
        }

        http_response_code($code);
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }
        exit;
    }

    /**
     * Send a raw response body.
     *
     * @param string                 $body    Raw response body.
     * @param int                    $code    HTTP status code.
     * @param array<string, string>  $headers Extra response headers.
     * @return never
     */
    protected function rawResponse(string $body, int $code = 200, array $headers = []): never
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        $headers = array_merge([
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'same-origin',
        ], $headers);

        if (defined('API_THROW_RESPONSES') && API_THROW_RESPONSES) {
            throw ExitException::raw($body, $code, $headers);
        }

        http_response_code($code);
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo $body;
        exit;
    }

    /**
     * Send an HTML response body.
     *
     * @param string                 $html    HTML body.
     * @param int                    $code    HTTP status code.
     * @param array<string, string>  $headers Extra response headers.
     * @return never
     */
    protected function htmlResponse(string $html, int $code = 200, array $headers = []): never
    {
        $this->rawResponse($html, $code, array_merge([
            'Content-Type' => 'text/html; charset=utf-8',
        ], $headers));
    }

    /**
     * Send an error response.
     *
     * @param string      $error  Error code.
     * @param int         $code   HTTP status code.
     * @param string|null $detail Optional detail message.
     * @param array       $extra  Additional keys to merge.
     * @return never
     */
    protected function error(string $error, int $code = 400, ?string $detail = null, array $extra = []): never
    {
        $payload = array_merge(['ok' => false, 'error' => $error], $extra);
        if ($detail !== null) {
            $payload['detail'] = $detail;
        }
        $payload['server_time'] = $this->nowIso();
        $this->json($payload, $code);
    }

    protected function rethrowResponse(Throwable $e): void
    {
        if ($e instanceof ExitException) {
            throw $e;
        }
    }

    /**
     * Send a paginated list response.
     *
     * @param string $key    Response key (e.g. 'docs', 'users').
     * @param array  $items  Result items.
     * @param int    $total  Total count.
     * @param int    $offset Current offset.
     * @param int    $limit  Page size.
     * @return never
     */
    protected function paginated(string $key, array $items, int $total, int $offset = 0, int $limit = 50): never
    {
        $this->success([
            $key       => $items,
            'total'    => $total,
            'offset'   => $offset,
            'limit'    => $limit,
            'has_more' => ($offset + count($items)) < $total,
        ]);
    }

    // ── Auth & Permission Helpers ───────────────────────────────────────────

    /**
     * Require a logged-in user. Terminates with 401 on failure.
     *
     * @return array The authenticated user record.
     */
    protected function requireAuth(): array
    {
        if ($this->store === null) {
            $this->error('system_not_initialized', 500);
        }
        // Delegate to the existing require_logged_in() function
        return require_logged_in($this->store);
    }

    /**
     * Require the current user to be an admin. Terminates with 403 on failure.
     *
     * @param array $user Authenticated user record.
     * @return void
     */
    protected function requireAdmin(array $user): void
    {
        if (!user_is_admin($user)) {
            $this->error('forbidden', 403);
        }
    }

    /**
     * Check whether the current user holds at least one of the allowed roles.
     *
     * Role checks are normalized through the legacy migration map so
     * old role codes continue to work with the standardized controllers.
     *
     * @param array<int, string> $roles Allowed role codes.
     * @return bool
     */
    protected function userHasAnyRole(array $user, array $roles): bool
    {
        $allowed = array_values(array_unique(array_filter(array_map(
            static fn($role) => migrate_role(strtolower(trim((string)$role))),
            $roles
        ))));

        $userRoles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        foreach ($userRoles as $role) {
            $normalized = migrate_role(strtolower(trim((string)$role)));
            if ($normalized !== '' && in_array($normalized, $allowed, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Require the current user to hold at least one of the allowed roles.
     *
     * Role checks are normalized through the legacy migration map so
     * old role codes continue to work with the standardized controllers.
     *
     * @param array<int, string> $roles Allowed role codes.
     * @return void
     */
    protected function requireAnyRole(array $user, array $roles): void
    {
        if (!$this->userHasAnyRole($user, $roles)) {
            $this->error('forbidden', 403);
        }
    }

    /**
     * Require CSRF token validation. Terminates with 403 on failure.
     *
     * @return void
     */
    protected function requireCsrf(): void
    {
        require_csrf();
    }

    /**
     * Require an allowed Origin/Referer for browser-auth flows.
     *
     * @param list<string> $extraAllowedOrigins Additional allowed origins.
     * @return void
     */
    protected function requireAllowedOrigin(array $extraAllowedOrigins = []): void
    {
        require_allowed_origin($extraAllowedOrigins);
    }

    /**
     * Check whether the user has a specific role-based permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key (e.g. 'canCreateDocs').
     * @return bool
     */
    protected function hasPermission(array $user, string $permission): bool
    {
        return $this->hasAnyPermission($user, [$permission]);
    }

    /**
     * @param array<int, string> $permissions
     */
    protected function hasAnyPermission(array $user, array $permissions): bool
    {
        return user_has_any_permission($user, $permissions, $this->confDir . '/role_permissions.json');
    }

    /**
     * @param array<int, string> $permissions
     */
    protected function permissionMatrixManages(array $permissions): bool
    {
        return permission_matrix_manages_permission($permissions, $this->confDir . '/role_permissions.json');
    }

    protected function userPermissionMatrixConfigured(array $user): bool
    {
        return user_permission_matrix_configured($user, $this->confDir . '/role_permissions.json');
    }

    /**
     * @param array<int, string> $permissions
     */
    protected function requireAnyPermission(array $user, array $permissions, bool $allowAdminBypass = true): void
    {
        if ($allowAdminBypass && user_is_admin($user)) {
            return;
        }
        if (!$this->hasAnyPermission($user, $permissions)) {
            $this->error('forbidden', 403);
        }
    }

    // ── Validation Helpers ──────────────────────────────────────────────────

    /**
     * Require specific fields in the JSON body. Terminates with 400 on missing.
     *
     * @param array    $data   Data array to validate.
     * @param string[] $fields Required field names.
     * @return void
     */
    protected function requireFields(array $data, array $fields): void
    {
        foreach ($fields as $field) {
            $value = $data[$field] ?? null;
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $this->error("missing_{$field}", 400);
            }
        }
    }

    /**
     * Validate a string against a regex pattern.
     *
     * @param string $value   Value to validate.
     * @param string $pattern Regex pattern.
     * @param string $error   Error code on failure.
     * @return string The validated value.
     */
    protected function validatePattern(string $value, string $pattern, string $error): string
    {
        if (!preg_match($pattern, $value)) {
            $this->error($error, 400);
        }
        return $value;
    }

    /**
     * Sanitize a document code (uppercase, safe characters only).
     *
     * @param string $code Raw code input.
     * @return string Sanitized code.
     */
    protected function sanitizeCode(string $code): string
    {
        return sanitize_code($code);
    }

    // ── Audit Helpers ───────────────────────────────────────────────────────

    /**
     * Log an action to the audit trail.
     *
     * @param string      $action  Action identifier.
     * @param array       $context Additional context data.
     * @param string|null $user    Username (auto-detected from session if null).
     * @return void
     */
    protected function auditLog(string $action, array $context = [], ?string $user = null): void
    {
        $user = $user ?? (string)($_SESSION['user'] ?? 'anonymous');

        // Sanitize context: only keep scalar values, convert to strings to prevent log injection
        $sanitizedContext = [];
        foreach ($context as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $sanitizedContext[$key] = $value === null ? null : (string)$value;
            }
        }

        $entry = [
            'action'    => $action,
            'user'      => $user,
            'ip'        => $this->clientIp(),
            'timestamp' => $this->nowIso(),
            'context'   => $sanitizedContext,
        ];
        if (in_array(strtolower((string)getenv('MOM_ENABLE_LEGACY_AUDIT_LOG')), ['1', 'true', 'yes'], true)) {
            $logFile = $this->dataDir . '/audit.log';
            $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
        }

        try {
            $aggregateId = '';
            foreach (['aggregate_id', 'id', 'username', 'code', 'record_id'] as $key) {
                if (!isset($sanitizedContext[$key]) || !is_scalar($sanitizedContext[$key])) {
                    continue;
                }
                $candidate = trim((string)$sanitizedContext[$key]);
                if ($candidate === '') {
                    continue;
                }
                $aggregateId = $candidate;
                break;
            }
            if ($aggregateId === '') {
                $aggregateId = $action;
            }

            $metadata = [
                'source' => 'api_controller',
                'controller' => static::class,
            ];
            if ($sanitizedContext !== []) {
                $metadata['context_keys'] = array_values(array_map('strval', array_keys($sanitizedContext)));
            }

            $this->data->logEvent(
                $action,
                'api_action',
                $aggregateId,
                ['context' => $sanitizedContext],
                [
                    'actor_name' => $user,
                    'ip_address' => $this->clientIp(),
                    'session_id' => session_status() === PHP_SESSION_ACTIVE ? session_id() : null,
                    'metadata' => $metadata,
                ]
            );
        } catch (Throwable $e) {
            @error_log('[BaseController] audit write failed: ' . $e->getMessage());
        }
    }

    // ── Utility ─────────────────────────────────────────────────────────────

    /**
     * Current ISO 8601 timestamp in UTC.
     *
     * @return string
     */
    protected function nowIso(): string
    {
        return gmdate('c');
    }

    /**
     * Human-readable datetime (YYYY-MM-DD HH:MM).
     *
     * @return string
     */
    protected function humanDt(): string
    {
        return gmdate('Y-m-d H:i');
    }

    /**
     * Invalidate the scan cache (forces re-scan on next folder browse).
     *
     * @return void
     */
    protected function invalidateScanCache(): void
    {
        invalidate_scan_cache($this->dataDir);
    }

    /**
     * Read a JSON file and return its contents.
     *
     * @param string $path Absolute file path.
     * @return array|null
     */
    protected function readJsonFile(string $path): ?array
    {
        return read_json_file($path);
    }

    /**
     * Write data to a JSON file atomically.
     *
     * @param string $path Absolute file path.
     * @param array  $data Data to write.
     * @return void
     */
    protected function writeJsonFile(string $path, array $data): void
    {
        write_json_file($path, $data);
    }
}
