<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * CsrfService - CSRF token management and validation.
 *
 * SVC-005: CSRF enforcement is now done via middleware for all state-changing requests.
 * This service provides token generation and validation utilities.
 *
 * Encapsulates CSRF token management:
 *   csrf_token()   -> CsrfService::token()
 *   require_csrf() -> CsrfService::validate()
 *
 * IMPORTANT: For POST/PUT/DELETE/PATCH requests, CSRF validation is performed
 * automatically by CsrfMiddleware. Controllers should only call validate() if
 * they bypass middleware validation or need custom handling.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class CsrfService
{
    private const TOKEN_TTL_SECONDS = 3600;

    /**
     * List of endpoints that are exempt from CSRF validation.
     * These use alternative auth methods (API key, webhook signature, etc.).
     *
     * @var array<string>
     */
    private static array $csrfExempt = [
        '/api/webhooks/*',           // Webhook signatures validate instead
        '/api/auth/callback/*',      // OAuth/SAML redirects don't have CSRF tokens
        '/api/health',               // Health checks are read-only info
        '/api/status',               // Status checks are read-only info
    ];

    /**
     * Legacy action keys that bypass CSRF because they authenticate via
     * a different mechanism (HMAC for AEOI worker, API key for Epicor, etc.).
     * Matched against the `action` query parameter.
     *
     * @var array<string>
     */
    private static array $csrfExemptActions = [
        // AI Email Order Intake — local Outlook worker uses HMAC (X-AEOI-*)
        'aeoi_worker_config',
        'aeoi_worker_email_envelope',
        'aeoi_worker_extraction_result',
    ];

    /**
     * Get or generate a CSRF token for the current session.
     * Equivalent to legacy: csrf_token()
     * SECURITY FIX PIPE-CSRF-002: Tokens expire after 1 hour (3600 seconds)
     */
    public static function token(): string
    {
        SessionService::init();
        $generatedAt = isset($_SESSION['csrf_generated_at']) ? (int)$_SESSION['csrf_generated_at'] : null;
        $expired = $generatedAt !== null && (time() - $generatedAt) > self::TOKEN_TTL_SECONDS;

        if (empty($_SESSION['csrf']) || $expired) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            $_SESSION['csrf_generated_at'] = time();
        } elseif ($generatedAt === null) {
            $_SESSION['csrf_generated_at'] = time();
        }
        return (string)$_SESSION['csrf'];
    }

    /**
     * Validate the CSRF token from the request header.
     * Sends 403 JSON response and exits on failure.
     * Equivalent to legacy: require_csrf()
     *
     * NOTE: CsrfMiddleware automatically calls this for all state-changing requests.
     * Controllers should only call this if they bypass middleware or need custom handling.
     * SECURITY FIX PIPE-CSRF-002: Also checks that token is not older than 3600 seconds (1 hour)
     */
    public static function validate(): void
    {
        SessionService::init();
        $token        = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = (string)($_SESSION['csrf'] ?? '');
        $generatedAt  = isset($_SESSION['csrf_generated_at']) ? (int)$_SESSION['csrf_generated_at'] : null;

        // SEC-SESSION-002: Release session lock immediately after reading CSRF data.
        // CsrfMiddleware runs before AuthMiddleware; holding the session lock through
        // the entire controller execution serialises concurrent requests from the same
        // browser tab/session and is the primary cause of EQMS tab load hangs.
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        if ($token === '' || $sessionToken === '' || !hash_equals($sessionToken, $token)) {
            api_json(['ok' => false, 'error' => 'csrf_failed'], 403);
        }

        // SECURITY FIX PIPE-CSRF-002: Check token freshness
        if ($generatedAt !== null) {
            $tokenAge = time() - $generatedAt;
            if ($tokenAge > self::TOKEN_TTL_SECONDS) {
                api_json(['ok' => false, 'error' => 'csrf_expired'], 403);
            }
        }
    }

    /**
     * SVC-005: Check if an endpoint is exempt from CSRF validation.
     * Exempt endpoints use alternative auth (API key, webhook signature, OAuth, etc.).
     *
     * @param string $path The request path (e.g. '/api/webhooks/github')
     * @return bool True if the endpoint is CSRF-exempt
     */
    public static function isExempt(string $path): bool
    {
        // Path-based exemptions
        $normalisedPath = strtolower(trim($path));
        if ($normalisedPath !== '') {
            foreach (self::$csrfExempt as $exemptPattern) {
                // Simple wildcard matching: /api/webhooks/* matches /api/webhooks/github
                if (str_ends_with($exemptPattern, '*')) {
                    $prefix = substr($exemptPattern, 0, -1);
                    if (str_starts_with($normalisedPath, $prefix)) {
                        return true;
                    }
                } elseif ($normalisedPath === $exemptPattern) {
                    return true;
                }
            }
        }

        // Action-based exemptions (legacy ?action=foo routing)
        $action = strtolower(trim((string)($_GET['action'] ?? '')));
        if ($action !== '' && in_array($action, self::$csrfExemptActions, true)) {
            return true;
        }

        return false;
    }
}
