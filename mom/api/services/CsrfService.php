<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * CsrfService - Extracted from legacy api.php.
 *
 * Encapsulates CSRF token management:
 *   csrf_token()   -> CsrfService::token()
 *   require_csrf() -> CsrfService::validate()
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class CsrfService
{
    /**
     * Get or generate a CSRF token for the current session.
     * Equivalent to legacy: csrf_token()
     */
    public static function token(): string
    {
        SessionService::init();
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return (string)$_SESSION['csrf'];
    }

    /**
     * Validate the CSRF token from the request header.
     * Sends 403 JSON response and exits on failure.
     * Equivalent to legacy: require_csrf()
     */
    public static function validate(): void
    {
        SessionService::init();
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($token === '' || empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], (string)$token)) {
            api_json(['ok' => false, 'error' => 'csrf_failed'], 403);
        }
    }
}
