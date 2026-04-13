<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * UserRepository - Extracted from legacy api.php.
 *
 * Encapsulates user store operations that were previously global functions:
 *   users_load()         -> UserRepository::loadStore()
 *   users_save()         -> UserRepository::saveStore()
 *   find_user_by_username() -> UserRepository::findByUsername()
 *   update_user()        -> UserRepository::updateUser()
 *
 * Provides the same functionality in a testable, namespace-compliant class.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class UserRepository
{
    private string $usersFile;
    private ?array $store = null;

    public function __construct(string $dataDir)
    {
        $this->usersFile = rtrim($dataDir, '/') . '/config/users.json';
    }

    /**
     * Load the user store from disk.
     * Equivalent to legacy: users_load($usersFile)
     */
    public function loadStore(): ?array
    {
        if ($this->store !== null) {
            return $this->store;
        }

        if (!is_file($this->usersFile)) {
            return null;
        }

        $raw = @file_get_contents($this->usersFile);
        if ($raw === false) {
            return null;
        }

        $data = json_decode($raw, true);
        $this->store = is_array($data) ? $data : null;
        return $this->store;
    }

    /**
     * Save the user store to disk.
     * Equivalent to legacy: users_save($usersFile, $store)
     */
    public function saveStore(array $store): void
    {
        $this->store = $store;

        $dir = dirname($this->usersFile);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Cannot encode users');
        }

        // Atomic write: tmp + rename
        $tmp = $this->usersFile . '.tmp';
        $written = @file_put_contents($tmp, $json, LOCK_EX);

        if ($written !== false) {
            $renamed = @rename($tmp, $this->usersFile);
            if (!$renamed) {
                // Fallback: direct write
                @file_put_contents($this->usersFile, $json, LOCK_EX);
                @unlink($tmp);
            }
        } else {
            // Fallback: direct write
            $wrote = @file_put_contents($this->usersFile, $json, LOCK_EX);
            if ($wrote === false) {
                throw new \RuntimeException('Cannot write users file: ' . $this->usersFile);
            }
        }

        @chmod($this->usersFile, 0664);
    }

    /**
     * Find a user by username (case-insensitive).
     * Equivalent to legacy: find_user_by_username($store, $username)
     */
    public function findByUsername(string $username): ?array
    {
        $store = $this->loadStore();
        if ($store === null) {
            return null;
        }

        $u = strtolower(trim($username));
        foreach ($store['users'] ?? [] as $user) {
            if (is_array($user) && strtolower((string)($user['username'] ?? '')) === $u) {
                return $user;
            }
        }
        return null;
    }

    /**
     * Update or insert a user record.
     * Equivalent to legacy: update_user($store, $newUser)
     */
    public function updateUser(array $newUser): void
    {
        $store = $this->loadStore() ?? ['users' => [], 'settings' => []];
        $u = strtolower((string)($newUser['username'] ?? ''));

        $users = $store['users'] ?? [];
        $found = false;

        foreach ($users as $i => $user) {
            if (is_array($user) && strtolower((string)($user['username'] ?? '')) === $u) {
                $users[$i] = $newUser;
                $found = true;
                break;
            }
        }

        if (!$found) {
            $users[] = $newUser;
        }

        $store['users'] = $users;
        $this->saveStore($store);
    }

    /**
     * List all users (without sensitive fields).
     *
     * @return list<array>
     */
    public function listUsers(): array
    {
        $store = $this->loadStore();
        if ($store === null) {
            return [];
        }

        return array_map(function (array $user): array {
            // Remove sensitive fields
            unset($user['password'], $user['totp_secret']);
            return $user;
        }, $store['users'] ?? []);
    }

    /**
     * Get store settings.
     */
    public function getSettings(): array
    {
        $store = $this->loadStore();
        return ($store['settings'] ?? []) ?: [];
    }

    /**
     * Check if a user has a specific role.
     */
    public function userHasRole(string $username, string $role): bool
    {
        $user = $this->findByUsername($username);
        if ($user === null) return false;
        return ($user['role'] ?? '') === $role;
    }

    /**
     * Check if a user is active.
     */
    public function isActive(string $username): bool
    {
        $user = $this->findByUsername($username);
        if ($user === null) return false;
        return (bool)($user['active'] ?? true);
    }
}
