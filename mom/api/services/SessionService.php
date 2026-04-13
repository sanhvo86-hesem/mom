<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * SessionService - Extracted from legacy api.php.
 *
 * Encapsulates PHP session management with security hardening:
 *   session_init()                      -> SessionService::init()
 *   destroy_auth_session()              -> SessionService::destroy()
 *   clear_auth_session_state()          -> SessionService::clearAuthState()
 *   clear_preauth_session_state()       -> SessionService::clearPreauthState()
 *   clear_enroll_session_state()        -> SessionService::clearEnrollState()
 *   clear_pending_auth_session_state()  -> SessionService::clearPendingState()
 *   set_preauth_session()               -> SessionService::setPreauth()
 *   set_authenticated_session()         -> SessionService::setAuthenticated()
 *   extract_user_scope()                -> SessionService::extractUserScope()
 *   session_requires_completed_mfa()    -> SessionService::requiresCompletedMfa()
 *   session_regenerate_id_safe()        -> SessionService::regenerateIdSafe()
 *   password_policy()                   -> SessionService::passwordPolicy()
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class SessionService
{
    /**
     * Initialize PHP session with security hardening.
     * Equivalent to legacy: session_init()
     */
    public static function init(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) return;

        $isCliLike = in_array(PHP_SAPI, ['cli', 'phpdbg'], true);
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https')
            || ((string)($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '') === 'on');
        $headersMutable = !headers_sent();
        $headerlessSessionMode = $isCliLike || !$headersMutable;

        // CLI / after-output: in-memory session only
        if ($isCliLike && !$headersMutable) {
            if (!is_array($_SESSION ?? null)) {
                $_SESSION = [];
            }
            return;
        }

        if ($headerlessSessionMode) {
            @ini_set('session.use_cookies', '0');
            if (PHP_VERSION_ID < 80500) {
                @ini_set('session.use_only_cookies', '0');
            }
            @ini_set('session.cache_limiter', '');
        } else {
            @ini_set('session.use_only_cookies', '1');
            @ini_set('session.use_strict_mode', '1');
            @ini_set('session.cookie_httponly', '1');
            @ini_set('session.cookie_samesite', 'Lax');
            if ($https) {
                @ini_set('session.cookie_secure', '1');
            }
        }

        $domain = '';
        $sessionName = $https ? '__Host-HESEMSESSID' : 'HESEMSESSID';

        if (!$headerlessSessionMode) {
            session_name($sessionName);
            session_set_cookie_params([
                'lifetime' => 0,
                'path'     => '/',
                'domain'   => $domain,
                'secure'   => $https,
                'httponly'  => true,
                'samesite'  => 'Lax',
            ]);
        }

        $lastError = null;
        foreach (self::dirCandidates() as $sessDir) {
            FileHelper::ensureDir($sessDir);
            if (!is_dir($sessDir) || !is_writable($sessDir)) {
                continue;
            }

            if ($headersMutable) {
                @session_save_path($sessDir);
            }

            if ($headerlessSessionMode && session_id() === '') {
                @session_id(bin2hex(random_bytes(16)));
            }

            try {
                self::sessionStartOrThrow();
                return;
            } catch (\Throwable $e) {
                $lastError = $e;
                @session_write_close();
                if (self::exceptionAllowsFreshStart($e)) {
                    if (self::startWithFreshId()) {
                        return;
                    }
                }
            }
        }

        if ($lastError instanceof \Throwable) {
            throw $lastError;
        }

        self::sessionStartOrThrow();
    }

    /**
     * Completely destroy the authentication session.
     * Equivalent to legacy: destroy_auth_session()
     */
    public static function destroy(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) self::init();
        self::clearAuthState();
        if (ini_get('session.use_cookies') && !headers_sent()) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_destroy();
        }
    }

    /**
     * Clear all auth-related session variables.
     * Equivalent to legacy: clear_auth_session_state()
     */
    public static function clearAuthState(): void
    {
        unset(
            $_SESSION['user'],
            $_SESSION['preauth_user'],
            $_SESSION['preauth_started'],
            $_SESSION['mfa_ok'],
            $_SESSION['enroll_user'],
            $_SESSION['enroll_secret'],
            $_SESSION['enroll_started'],
            $_SESSION['last_active'],
            $_SESSION['user_scope'],
            $_SESSION['org_scope']
        );
    }

    /**
     * Clear pre-auth session state.
     * Equivalent to legacy: clear_preauth_session_state()
     */
    public static function clearPreauthState(): void
    {
        unset($_SESSION['preauth_user'], $_SESSION['preauth_started']);
        if (empty($_SESSION['user'])) {
            unset($_SESSION['mfa_ok']);
        }
    }

    /**
     * Clear enrollment session state.
     * Equivalent to legacy: clear_enroll_session_state()
     */
    public static function clearEnrollState(): void
    {
        unset($_SESSION['enroll_user'], $_SESSION['enroll_secret'], $_SESSION['enroll_started']);
    }

    /**
     * Clear all pending auth session state (enroll + preauth).
     * Equivalent to legacy: clear_pending_auth_session_state()
     */
    public static function clearPendingState(): void
    {
        self::clearEnrollState();
        self::clearPreauthState();
    }

    /**
     * Set pre-authentication session (before MFA).
     * Equivalent to legacy: set_preauth_session($username)
     */
    public static function setPreauth(string $username): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) self::init();
        self::regenerateIdSafe(true);
        self::clearAuthState();
        $_SESSION['preauth_user'] = strtolower(trim($username));
        $_SESSION['preauth_started'] = time();
        $_SESSION['mfa_ok'] = false;
    }

    /**
     * Set fully authenticated session (after MFA).
     * Equivalent to legacy: set_authenticated_session($username, $user)
     */
    public static function setAuthenticated(string $username, array $user = []): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) self::init();
        self::regenerateIdSafe(true);
        self::clearAuthState();
        $_SESSION['user'] = strtolower(trim($username));
        $_SESSION['mfa_ok'] = true;
        $_SESSION['last_active'] = time();
        $scope = self::extractUserScope($user);
        if ($scope !== []) {
            $_SESSION['user_scope'] = $scope;
            $_SESSION['org_scope'] = $scope;
        }
    }

    /**
     * Extract org scope fields from a user record.
     * Equivalent to legacy: extract_user_scope($user)
     */
    public static function extractUserScope(array $user): array
    {
        $scope = [];
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $value = $user[$field] ?? null;
            if (!is_scalar($value)) continue;
            $text = trim((string)$value);
            if ($text === '') continue;
            $scope[$field] = $text;
        }
        return $scope;
    }

    /**
     * Check if MFA verification is required for the user.
     * Equivalent to legacy: session_requires_completed_mfa($user, $settings)
     */
    public static function requiresCompletedMfa(array $user, array $settings = []): bool
    {
        $systemRequiresMfa = (bool)($settings['require_mfa'] ?? true);
        if (!$systemRequiresMfa) {
            return false;
        }

        return true;
    }

    /**
     * Safely regenerate session ID with fallback.
     * Equivalent to legacy: session_regenerate_id_safe($deleteOldSession)
     */
    public static function regenerateIdSafe(bool $deleteOldSession = true): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        try {
            if (@session_regenerate_id($deleteOldSession)) {
                return;
            }
        } catch (\Throwable $e) {
            @error_log('[API] session_regenerate_id failed: ' . $e->getMessage());
        }

        if ($deleteOldSession) {
            try {
                if (@session_regenerate_id(false)) {
                    @error_log('[API] session_regenerate_id fallback kept old session file');
                    return;
                }
            } catch (\Throwable $e) {
                @error_log('[API] session_regenerate_id fallback failed: ' . $e->getMessage());
            }
        }

        @error_log('[API] session_regenerate_id skipped; continuing with current session id');
    }

    /**
     * Validate password against policy rules.
     * Equivalent to legacy: password_policy($pw)
     *
     * @return array{0: bool, 1: string}
     */
    public static function passwordPolicy(string $pw): array
    {
        if (strlen($pw) < 10) return [false, 'Password must be at least 10 characters'];
        if (!preg_match('/[a-z]/', $pw)) return [false, 'Password must include a lowercase letter'];
        if (!preg_match('/[A-Z]/', $pw)) return [false, 'Password must include an uppercase letter'];
        if (!preg_match('/\d/', $pw)) return [false, 'Password must include a number'];
        if (!preg_match('/[^A-Za-z0-9]/', $pw)) return [false, 'Password must include a symbol'];
        return [true, ''];
    }

    // ── Internal helpers ────────────────────────────────────────────────

    private static function sessionStartOrThrow(): void
    {
        set_error_handler(static function (int $severity, string $message, string $file, int $line): never {
            throw new \RuntimeException($message . ' in ' . $file . ':' . $line, $severity);
        });

        try {
            if (!session_start()) {
                throw new \RuntimeException('session_start_failed');
            }
        } finally {
            restore_error_handler();
        }
    }

    private static function exceptionAllowsFreshStart(\Throwable $e): bool
    {
        $message = strtolower(trim($e->getMessage()));
        if ($message === '') return false;

        return str_contains($message, 'session_start(): open(')
            || str_contains($message, 'failed to read session data')
            || str_contains($message, 'permission denied')
            || str_contains($message, 'no such file or directory');
    }

    private static function startWithFreshId(): bool
    {
        if (in_array(PHP_SAPI, ['cli', 'phpdbg'], true) && headers_sent()) {
            if (!is_array($_SESSION ?? null)) {
                $_SESSION = [];
            }
            return true;
        }

        $cookieName = session_name();
        if ($cookieName !== '' && isset($_COOKIE[$cookieName])) {
            unset($_COOKIE[$cookieName]);
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        @ini_set('session.use_cookies', '0');
        if (PHP_VERSION_ID < 80500) {
            @ini_set('session.use_only_cookies', '0');
        }
        @ini_set('session.cache_limiter', '');
        @session_id(bin2hex(random_bytes(16)));

        try {
            self::sessionStartOrThrow();
            return true;
        } catch (\Throwable $retryError) {
            @error_log('[API] Session recovery failed: ' . $retryError->getMessage() . ' in ' . $retryError->getFile() . ':' . $retryError->getLine());
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_write_close();
            }
        }

        return false;
    }

    /**
     * Get candidate session storage directories.
     * Equivalent to legacy: session_dir_candidates()
     */
    private static function dirCandidates(): array
    {
        global $DATA_DIR;

        $primary = ($DATA_DIR ?? '') . '/sessions';
        if ($primary !== '/sessions' && $primary !== '' && !is_dir($primary)) {
            @mkdir($primary, 0775, true);
        }

        $candidates = [
            $primary,
            sys_get_temp_dir() . '/hesem-sessions',
            self::normalizeSessionDir((string)session_save_path()),
            '/var/lib/php/sessions',
            sys_get_temp_dir(),
        ];

        $unique = [];
        foreach ($candidates as $candidate) {
            $candidate = self::normalizeSessionDir((string)$candidate);
            if ($candidate === '' || in_array($candidate, $unique, true)) continue;
            $unique[] = $candidate;
        }

        return $unique;
    }

    private static function normalizeSessionDir(string $path): string
    {
        $path = trim($path);
        if ($path === '') return '';
        if (strpos($path, ';') !== false) {
            $parts = explode(';', $path);
            $path = (string)end($parts);
        }
        return rtrim($path, '/');
    }
}
