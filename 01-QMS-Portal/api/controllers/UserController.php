<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use Throwable;

/**
 * User management controller for HESEM QMS Portal.
 *
 * Handles user listing, create/update, delete, password reset,
 * and role permission management.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class UserController extends BaseController
{
    /**
     * GET list â€” List all users (admin only).
     *
     * Legacy action: `admin_users_list`
     *
     * @return never
     */
    public function list(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $users = $this->store['users'] ?? [];
        $sanitized = [];
        foreach ($users as $user) {
            if (!is_array($user)) continue;
            $sanitized[] = sanitize_user_for_client($user);
        }

        $this->success(['users' => $sanitized]);
    }

    /**
     * POST upsert â€” Create or update a user (admin only).
     *
     * Legacy action: `admin_user_upsert`
     *
     * @return never
     */
    public function upsert(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $username = strtolower(trim((string)($data['username'] ?? '')));

        if ($username === '') $this->error('missing_username', 400);

        $usersFile = $this->confDir . '/users.json';
        $existing  = find_user_by_username($this->store, $username);

        if ($existing) {
            // Update existing user
            $allowed = ['name', 'role', 'dept', 'title', 'phone', 'personal_email', 'cccd', 'active'];
            foreach ($allowed as $key) {
                if (array_key_exists($key, $data)) {
                    $existing[$key] = $data[$key];
                }
            }
            $existing['updated_at'] = $this->nowIso();

            // Handle password change
            $newPw = (string)($data['password'] ?? '');
            if ($newPw !== '') {
                [$pwOk, $pwErr] = password_policy($newPw);
                if (!$pwOk) $this->error($pwErr, 400);
                $existing['password_hash'] = password_hash($newPw, PASSWORD_BCRYPT, ['cost' => 12]);
            }

            update_user($this->store, $existing);
        } else {
            // Create new user
            $newPw = (string)($data['password'] ?? '');
            if ($newPw === '') {
                $newPw = random_password(12);
            }
            [$pwOk, $pwErr] = password_policy($newPw);
            if (!$pwOk) $this->error($pwErr, 400);

            $newUser = [
                'username'      => $username,
                'name'          => (string)($data['name'] ?? ''),
                'role'          => (string)($data['role'] ?? 'user'),
                'dept'          => (string)($data['dept'] ?? ''),
                'title'         => (string)($data['title'] ?? ''),
                'phone'         => (string)($data['phone'] ?? ''),
                'personal_email' => (string)($data['personal_email'] ?? ''),
                'cccd'          => (string)($data['cccd'] ?? ''),
                'active'        => (bool)($data['active'] ?? true),
                'password_hash' => password_hash($newPw, PASSWORD_BCRYPT, ['cost' => 12]),
                'mfa'           => ['enabled' => false],
                'created_at'    => $this->nowIso(),
                'updated_at'    => $this->nowIso(),
            ];

            if (!isset($this->store['users'])) {
                $this->store['users'] = [];
            }
            $this->store['users'][] = $newUser;
            $existing = $newUser;
        }

        try {
            users_save($usersFile, $this->store);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }

        $this->auditLog('admin_user_upsert', ['username' => $username]);
        $this->success(['user' => sanitize_user_for_client($existing)]);
    }

    /**
     * POST delete â€” Delete a user (admin only).
     *
     * Legacy action: `admin_user_delete`
     *
     * @return never
     */
    public function delete(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $username = strtolower(trim((string)($data['username'] ?? '')));

        if ($username === '') $this->error('missing_username', 400);

        // Prevent self-deletion
        if ($username === strtolower((string)($me['username'] ?? ''))) {
            $this->error('cannot_delete_self', 400);
        }

        $users = $this->store['users'] ?? [];
        $this->store['users'] = array_values(array_filter($users, function ($u) use ($username) {
            return !is_array($u) || strtolower((string)($u['username'] ?? '')) !== $username;
        }));

        $usersFile = $this->confDir . '/users.json';
        try {
            users_save($usersFile, $this->store);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }

        $this->auditLog('admin_user_delete', ['username' => $username]);
        $this->success(['deleted' => $username]);
    }

    /**
     * POST resetPassword â€” Reset a user's password (admin only).
     *
     * Legacy action: `admin_user_reset_password`
     *
     * @return never
     */
    public function resetPassword(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $username = strtolower(trim((string)($data['username'] ?? '')));
        $newPw    = (string)($data['password'] ?? '');

        if ($username === '') $this->error('missing_username', 400);

        if ($newPw === '') {
            $newPw = random_password(12);
        }
        [$pwOk, $pwErr] = password_policy($newPw);
        if (!$pwOk) $this->error($pwErr, 400);

        $user = find_user_by_username($this->store, $username);
        if (!$user) $this->error('user_not_found', 404);

        $user['password_hash'] = password_hash($newPw, PASSWORD_BCRYPT, ['cost' => 12]);
        $user['updated_at']    = $this->nowIso();
        update_user($this->store, $user);

        $usersFile = $this->confDir . '/users.json';
        try {
            users_save($usersFile, $this->store);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }

        $this->auditLog('admin_user_reset_password', ['username' => $username]);
        $this->success([
            'username'     => $username,
            'temp_password' => $newPw,
        ]);
    }

    /**
     * GET getPermissions â€” Get role permission configuration.
     *
     * Legacy action: `role_perms_get`
     *
     * @return never
     */
    public function getPermissions(): never
    {
        $this->requireAuth();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        $perms = load_role_permissions($rolePermsFile);

        $this->success(['perms' => $perms]);
    }

    /**
     * POST savePermissions â€” Save role permission configuration (admin only).
     *
     * Legacy action: `admin_role_perms_save`
     *
     * @return never
     */
    public function savePermissions(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data = $this->jsonBody();
        $in   = $data['perms'] ?? null;
        if (!is_array($in)) $this->error('invalid_perms', 400);

        $clean = [];
        foreach ($in as $role => $v) {
            $roleKey = (string)$role;
            if ($roleKey === '') continue;
            $row = is_array($v) ? $v : [];
            $clean[$roleKey] = [
                'canCreateDocs' => (bool)($row['canCreateDocs'] ?? false),
            ];
        }

        // Ensure defaults always exist
        foreach (default_role_permissions() as $k => $v) {
            if (!isset($clean[$k])) $clean[$k] = $v;
        }

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        save_role_permissions($rolePermsFile, $clean);

        $this->auditLog('admin_role_perms_save');
        $this->success(['perms' => $clean]);
    }
}
