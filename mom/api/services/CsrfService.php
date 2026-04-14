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
     * Get or generate a CSRF token for the current session.
     * Equivalent to legacy: csrf_token()
     * SECURITY FIX PIPE-CSRF-002: Tokens expire after 1 hour (3600 seconds)
     */
    public static function token(): string
    {
        SessionService::init();
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
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
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($token === '' || empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], (string)$token)) {
            api_json(['ok' => false, 'error' => 'csrf_failed'], 403);
        }

        // SECURITY FIX PIPE-CSRF-002: Check token freshness
        if (isset($_SESSION['csrf_generated_at'])) {
            $tokenAge = time() - (int)$_SESSION['csrf_generated_at'];
            if ($tokenAge > 3600) {
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
        $path = strtolower(trim($path));
        if ($path === '') {
            return false;
        }

        foreach (self::$csrfExempt as $exemptPattern) {
            // Simple wildcard matching: /api/webhooks/* matches /api/webhooks/github
            if (str_ends_with($exemptPattern, '*')) {
                $prefix = substr($exemptPattern, 0, -1);
                if (str_starts_with($path, $prefix)) {
                    return true;
                }
            } elseif ($path === $exemptPattern) {
                return true;
            }
        }

        return false;
    }
}
