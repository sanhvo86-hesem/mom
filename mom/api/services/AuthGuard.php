<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * AuthGuard - Extracted from legacy api.php.
 *
 * Encapsulates authentication guard logic:
 *   require_logged_in($store) -> AuthGuard::requireLoggedIn($userRepo)
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class AuthGuard
{
    /** Idle session timeout: 4 hours */
    private const IDLE_LIMIT = 4 * 60 * 60;

    /**
     * Guard an authenticated endpoint.
     *
     * Validates session user, enforces idle timeout, checks active status,
     * and verifies MFA completion when required by policy.
     *
     * Equivalent to legacy: require_logged_in($store)
     *
     * @param array $store  The user store array (with 'users' and 'settings' keys)
     * @return array The authenticated user record
     */
    public static function requireLoggedIn(array $store): array
    {
        if (empty($_SESSION['user'])) {
            api_json(['ok' => false, 'error' => 'unauthorized'], 401);
        }

        // Idle session timeout
        $now = time();
        if (isset($_SESSION['last_active'])) {
            $last = (int)$_SESSION['last_active'];
            if ($last > 0 && ($now - $last) > self::IDLE_LIMIT) {
                SessionService::destroy();
                api_json(['ok' => false, 'error' => 'session_expired'], 401);
            }
        }
        $_SESSION['last_active'] = $now;

        $me = self::findUserInStore($store, (string)$_SESSION['user']);
        if (!$me || !($me['active'] ?? true)) {
            api_json(['ok' => false, 'error' => 'unauthorized'], 401);
        }

        // Enforce completed MFA
        $settings = $store['settings'] ?? [];
        if (SessionService::requiresCompletedMfa($me, is_array($settings) ? $settings : []) && empty($_SESSION['mfa_ok'])) {
            api_json(['ok' => false, 'error' => 'mfa_required'], 401);
        }

        return $me;
    }

    /**
     * Find a user by username in the store (case-insensitive).
     * Same logic as legacy find_user_by_username() but local to AuthGuard.
     */
    private static function findUserInStore(array $store, string $username): ?array
    {
        $u = strtolower(trim($username));
        foreach ($store['users'] ?? [] as $user) {
            if (is_array($user) && strtolower((string)($user['username'] ?? '')) === $u) {
                return $user;
            }
        }
        return null;
    }
}
