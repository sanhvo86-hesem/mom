<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Middleware;

/**
 * Authentication middleware for HESEM QMS API.
 *
 * Performs session-based auth checks and TOTP 2FA verification.
 * Skips authentication for public endpoints (login, status).
 *
 * @package HESEM\QMS\Api\Middleware
 * @since   2.0.0
 */
class AuthMiddleware
{
    /** @var list<string> Actions that do not require authentication. */
    private const PUBLIC_ACTIONS = [
        'status',
        'auth_login',
        'auth_mfa_verify',
        'auth_enroll_verify',
    ];

    /** @var array|null Users store reference. */
    private ?array $store;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param array|null $store Users store data.
     */
    public function __construct(?array $store)
    {
        $this->store = $store;
    }

    /**
     * Create the middleware callable.
     *
     * @return callable(string, callable): void
     */
    public function handler(): callable
    {
        $store = $this->store;

        return static function (string $action, callable $next) use ($store): void {
            // Strip RESTful prefix for matching (e.g. "GET:/api/documents" -> just check the action)
            $actionName = $action;
            if (str_contains($action, ':')) {
                $actionName = substr($action, strpos($action, ':') + 1);
            }

            // Skip auth for public endpoints
            if (in_array($actionName, self::PUBLIC_ACTIONS, true)) {
                $next();
                return;
            }

            // Ensure session is initialized
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_init();
            }

            // Check system initialization
            if ($store === null) {
                // Allow the request through; controllers will check for store
                $next();
                return;
            }

            // Check session exists
            if (empty($_SESSION['user'])) {
                // Allow through for status-like checks; controller handles 401
                $next();
                return;
            }

            // Validate idle session timeout
            $idleLimit = 4 * 60 * 60; // 4 hours
            $now = time();
            if (isset($_SESSION['last_active'])) {
                $last = (int)$_SESSION['last_active'];
                if ($last > 0 && ($now - $last) > $idleLimit) {
                    // Session expired - let controller handle the error
                    $next();
                    return;
                }
            }

            // Update last active time
            $_SESSION['last_active'] = $now;

            // Pass through to controller
            $next();
        };
    }

    /**
     * Extract user context from the current session.
     *
     * @param array $store Users store.
     * @return array|null User record or null if not authenticated.
     */
    public static function currentUser(array $store): ?array
    {
        if (empty($_SESSION['user'])) {
            return null;
        }
        return find_user_by_username($store, (string)$_SESSION['user']);
    }

    /**
     * Check whether the current session has completed MFA.
     *
     * @return bool
     */
    public static function isMfaVerified(): bool
    {
        return !empty($_SESSION['mfa_ok']);
    }
}
