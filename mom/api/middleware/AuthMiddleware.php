<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;

/**
 * Authentication middleware for HESEM MOM API.
 *
 * Performs session-based auth checks and TOTP 2FA verification.
 * Skips authentication for public endpoints (login, status).
 *
 * @package MOM\Api\Middleware
 * @since   2.0.0
 */
class AuthMiddleware
{
    /** @var array|null Users store reference. */
    private ?array $store;

    /** @var list<string> */
    private array $publicActions;

    /** @var list<string> */
    private array $publicRoutes;

    private bool $enforce;

    private int $idleTimeoutSeconds;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param array|null              $store  Users store data.
     * @param array<string, mixed>    $config Auth middleware configuration.
     */
    public function __construct(?array $store, array $config = [])
    {
        $this->store = $store;
        $this->publicActions = array_values(array_filter(array_map(
            'strval',
            (array)($config['public_actions'] ?? [
                'status',
                'auth_login',
                'auth_mfa_verify',
                'auth_enroll_verify',
            ])
        )));
        $this->publicRoutes = array_values(array_filter(array_map(
            static fn($route): string => strtoupper(trim((string)$route)),
            (array)($config['public_routes'] ?? [
                'GET /api/auth/status',
                'POST /api/auth/login',
                'POST /api/auth/mfa',
                'POST /api/auth/enroll',
            ])
        )));
        $this->enforce = (bool)($config['enforce_middleware'] ?? true);
        $this->idleTimeoutSeconds = max(60, (int)($config['idle_timeout_seconds'] ?? (30 * 60)));
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
            if ($self->isPublic($action)) {
                $next();
                return;
            }

            if (!$self->enforce) {
                $next();
                return;
            }

            // Ensure session is initialized
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_init();
            }

            // Check system initialization
            if ($self->store === null) {
                $self->deny('system_not_initialized', 500);
            }

            // Check session exists
            if (empty($_SESSION['user'])) {
                $self->deny('unauthorized', 401);
            }

            // Validate idle session timeout for ALL authentication methods (not just session)
            // SECURITY FIX PIPE-AUTH-001: This check must apply to API keys and JWT tokens too
            $now = time();
            if (isset($_SESSION['last_active'])) {
                $last = (int)$_SESSION['last_active'];
                if ($last > 0 && ($now - $last) > $self->idleTimeoutSeconds) {
                    destroy_auth_session();
                    $self->deny('session_expired', 401);
                }
            }

            $user = find_user_by_username($self->store, (string)$_SESSION['user']);
            if (!$user || !($user['active'] ?? true)) {
                $self->deny('unauthorized', 401);
            }

            $settings = $self->store['settings'] ?? [];
            if (session_requires_completed_mfa($user, is_array($settings) ? $settings : []) && empty($_SESSION['mfa_ok'])) {
                $self->deny('mfa_required', 401);
            }

            // Update last active time
            $_SESSION['last_active'] = $now;

            // Pass through to controller
            $next();
        };
    }

    private function isPublic(string $action): bool
    {
        if (in_array($action, $this->publicActions, true)) {
            return true;
        }

        if (!str_contains($action, ':')) {
            return false;
        }

        [$method, $path] = explode(':', $action, 2);
        $routeKey = strtolower(strtoupper(trim($method)) . ' ' . trim($path));

        foreach ($this->publicRoutes as $publicRoute) {
            if ($routeKey === strtolower($publicRoute)) {
                return true;
            }
        }

        return false;
    }

    private function deny(string $error, int $statusCode): never
    {
        throw ExitException::json([
            'ok' => false,
            'error' => $error,
            'server_time' => gmdate('c'),
        ], $statusCode);
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
