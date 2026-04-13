<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * Authentication controller for HESEM MOM Portal.
 *
 * Handles login, MFA verification, MFA enrollment, logout, and status checks.
 * Replicates exact behavior of the legacy api.php auth actions.
 *
 * @package MOM\Api\Controllers
 * @since   2.0.0
 */
class AuthController extends BaseController
{
    /**
     * GET status â€” Check current authentication state.
     *
     * Legacy action: `status` / `auth_status`
     *
     * @return never
     */
    public function status(): never
    {
        $logged = false;
        $mfaPending = false;
        $enrollPending = false;
        $pendingExpiresIn = null;
        $authExpired = null;
        $user = null;

        if (!empty($_SESSION['user']) && is_array($this->store)) {
            /** @var array<string, mixed>|false $u */
            $u = find_user_by_username($this->store, (string)$_SESSION['user']);
            if ($u) {
                $settings = $this->store['settings'] ?? [];
                $mfaPending = session_requires_completed_mfa(
                    $u,
                    is_array($settings) ? $settings : []
                ) && empty($_SESSION['mfa_ok']);

                if (!$mfaPending) {
                    $logged = true;
                    $user = sanitize_user_for_client($u);
                }
            }
        }

        // Check enrollment pending state
        $enrollUser    = (string)($_SESSION['enroll_user'] ?? '');
        $enrollSecret  = (string)($_SESSION['enroll_secret'] ?? '');
        $enrollStarted = (int)($_SESSION['enroll_started'] ?? 0);
        $enrollRemaining = pending_auth_remaining_seconds($enrollStarted);

        if (
            !$logged &&
            $enrollUser !== '' &&
            $enrollSecret !== '' &&
            $enrollRemaining > 0
        ) {
            $settings = is_array($this->store['settings'] ?? null) ? $this->store['settings'] : [];
            $issuer = (string)($settings['issuer'] ?? 'HESEM MOM');

            $this->json([
                'ok'                 => true,
                'logged_in'          => false,
                'mfa_pending'        => false,
                'enroll_pending'     => true,
                'issuer'             => $issuer,
                'account'            => $enrollUser,
                'username'           => $enrollUser,
                'secret'             => $enrollSecret,
                'otpauth_url'        => otpauth_url($issuer, $enrollUser, $enrollSecret),
                'user'               => null,
                'csrf_token'         => csrf_token(),
                'pending_expires_in' => $enrollRemaining,
                'auth_expired'       => null,
                'server_time'        => $this->nowIso(),
                'initialized'        => is_array($this->store),
            ]);
        }

        // Clean up expired enrollment state
        if (($enrollUser !== '' || $enrollSecret !== '' || $enrollStarted > 0) && !$enrollPending) {
            clear_pending_auth_session_state();
            $authExpired = 'enroll';
        }

        // Check preauth (MFA pending) state
        $preauthUser      = (string)($_SESSION['preauth_user'] ?? '');
        $preauthStarted   = (int)($_SESSION['preauth_started'] ?? 0);
        $preauthRemaining = pending_auth_remaining_seconds($preauthStarted);

        if (!$enrollPending && $preauthUser !== '' && $preauthRemaining <= 0) {
            clear_pending_auth_session_state();
            $authExpired = $authExpired ?: 'mfa';
            $preauthUser = '';
        }

        if (!$enrollPending && $preauthUser !== '' && is_array($this->store)) {
            /** @var array<string, mixed>|false $u */
            $u = find_user_by_username($this->store, $preauthUser);
            if ($u && session_requires_completed_mfa(
                $u,
                is_array($this->store['settings'] ?? null) ? $this->store['settings'] : []
            ) && empty($_SESSION['mfa_ok'])) {
                $mfaPending = true;
                $pendingExpiresIn = $preauthRemaining > 0 ? $preauthRemaining : null;
            }
        }

        $this->json([
            'ok'                 => true,
            'logged_in'          => (bool)$logged,
            'mfa_pending'        => (bool)$mfaPending,
            'enroll_pending'     => (bool)$enrollPending,
            'pending_expires_in' => $pendingExpiresIn,
            'auth_expired'       => $authExpired,
            'user'               => $user,
            'csrf_token'         => csrf_token(),
            'server_time'        => $this->nowIso(),
            'initialized'        => is_array($this->store),
        ]);
    }

    /**
     * POST login â€” Authenticate with username/password (+ optional OTP).
     *
     * Legacy action: `auth_login` / `login`
     *
     * @return never
     */
    public function login(): never
    {
        if ($this->method() !== 'POST') {
            $this->error('method_not_allowed', 405);
        }
        $this->requireAllowedOrigin();

        $data     = $this->jsonBody();
        $username = strtolower(trim((string)($data['username'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $code     = trim((string)($data['code'] ?? ($data['otp'] ?? '')));

        // Rate limiting
        $rlDir = $this->dataDir . '/ratelimit';
        // Per-IP rate limiting
        rate_limit_check('login_' . $this->clientIp(), 30, 300, $rlDir);
        // Per-username rate limiting
        rate_limit_check('login_u_' . $username, 30, 300, $rlDir);
        // Combined global IP rate limiting: prevent attackers from trying many usernames
        // Max 20 failed attempts per IP across all usernames in 15 minutes (900 seconds)
        rate_limit_check('login_combined_' . $this->clientIp(), 20, 900, $rlDir);

        if (!is_array($this->store)) {
            $this->error('system_not_initialized', 500);
        }

        $user = find_user_by_username($this->store, $username);
        if (!$user || !($user['active'] ?? true)) {
            usleep(150000);
            $this->error('invalid_credentials', 401);
        }

        $hash = (string)($user['password_hash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            usleep(150000);
            $this->error('invalid_credentials', 401);
        }

        $settings   = $this->store['settings'] ?? [];
        $requireMfa = (bool)($settings['require_mfa'] ?? true);
        $mfa        = $user['mfa'] ?? [];
        $mfaEnabled = (bool)($mfa['enabled'] ?? false);

        // User has MFA enabled
        if ($mfaEnabled) {
            $secretB32 = (string)($mfa['secret_b32'] ?? '');

            // If OTP supplied inline, verify and finish login
            if ($code !== '') {
                if ($secretB32 === '' || !totp_verify($secretB32, $code, 1, 30, 6)) {
                    $this->error('invalid_code', 401);
                }

                set_authenticated_session($username, $user);
                $this->updateLastLogin($user, $username);

                $this->json([
                    'ok'         => true,
                    'logged_in'  => true,
                    'user'       => sanitize_user_for_client($user),
                    'csrf_token' => csrf_token(),
                ]);
            }

            // Require separate MFA step
            set_preauth_session($username);
            $this->json([
                'ok'                 => true,
                'mfa_required'       => true,
                'enroll_required'    => false,
                'message'            => 'Enter your authenticator code',
                'pending_expires_in' => pending_auth_ttl_seconds(),
                'csrf_token'         => csrf_token(),
            ]);
        }

        // MFA required by system but user hasn't enrolled yet
        if ($requireMfa) {
            set_preauth_session($username);
            $secretBin = random_bytes(20);
            $secretB32 = base32_encode($secretBin);

            $_SESSION['enroll_user']    = $username;
            $_SESSION['enroll_secret']  = $secretB32;
            $_SESSION['enroll_started'] = time();

            $issuer = (string)($settings['issuer'] ?? 'HESEM MOM');

            $this->json([
                'ok'                 => true,
                'mfa_required'       => false,
                'enroll_required'    => true,
                'issuer'             => $issuer,
                'account'            => $username,
                'secret'             => $secretB32,
                'otpauth_url'        => otpauth_url($issuer, $username, $secretB32),
                'message'            => 'Enroll MFA in your Authenticator app',
                'pending_expires_in' => pending_auth_ttl_seconds(),
                'csrf_token'         => csrf_token(),
            ]);
        }

        // No MFA required
        set_authenticated_session($username, $user);
        $this->updateLastLogin($user, $username);

        $this->json([
            'ok'         => true,
            'logged_in'  => true,
            'user'       => sanitize_user_for_client($user),
            'csrf_token' => csrf_token(),
        ]);
    }

    /**
     * POST mfaVerify â€” Verify TOTP code during login.
     *
     * Legacy action: `auth_mfa_verify` / `mfa_verify` / `verify`
     *
     * @return never
     */
    public function mfaVerify(): never
    {
        if ($this->method() !== 'POST') {
            $this->error('method_not_allowed', 405);
        }
        $this->requireAllowedOrigin();
        if (!is_array($this->store)) {
            $this->error('system_not_initialized', 500);
        }

        $data = $this->jsonBody();
        $code = (string)($data['code'] ?? '');

        $rlDir = $this->dataDir . '/ratelimit';
        rate_limit_check('mfa_' . $this->clientIp(), 60, 300, $rlDir);

        $username       = (string)($_SESSION['preauth_user'] ?? '');
        $preauthStarted = (int)($_SESSION['preauth_started'] ?? 0);

        if ($username !== '' && pending_auth_remaining_seconds($preauthStarted) <= 0) {
            clear_pending_auth_session_state();
            $this->error('mfa_expired', 401);
        }

        if ($username === '') {
            // Fallback: allow re-supplying credentials
            $u = strtolower(trim((string)($data['username'] ?? '')));
            $p = (string)($data['password'] ?? '');

            if ($u === '' || $p === '') {
                $this->error('unauthorized', 401);
            }

            $uRec = find_user_by_username($this->store, $u);
            if (!$uRec || !($uRec['active'] ?? true)) {
                $this->error('unauthorized', 401);
            }

            $h = (string)($uRec['password_hash'] ?? '');
            if ($h === '' || !password_verify($p, $h)) {
                usleep(150000);
                $this->error('unauthorized', 401);
            }
            $username = $u;
        }

        $user = find_user_by_username($this->store, $username);
        if (!$user) {
            $this->error('unauthorized', 401);
        }

        $mfa       = $user['mfa'] ?? [];
        $enabled   = (bool)($mfa['enabled'] ?? false);
        $secretB32 = (string)($mfa['secret_b32'] ?? '');

        if (!$enabled || $secretB32 === '') {
            $this->error('mfa_not_enabled', 400);
        }

        if (!totp_verify($secretB32, $code, 1, 30, 6)) {
            $this->error('invalid_code', 401);
        }

        set_authenticated_session($username, $user);
        $this->updateLastLogin($user, $username);

        $this->json([
            'ok'         => true,
            'logged_in'  => true,
            'user'       => sanitize_user_for_client($user),
            'csrf_token' => csrf_token(),
        ]);
    }

    /**
     * POST enrollVerify â€” Verify TOTP during MFA enrollment.
     *
     * Legacy action: `auth_enroll_verify` / `enroll_verify` / `enroll`
     *
     * @return never
     */
    public function enrollVerify(): never
    {
        if ($this->method() !== 'POST') {
            $this->error('method_not_allowed', 405);
        }
        $this->requireAllowedOrigin();
        if (!is_array($this->store)) {
            $this->error('system_not_initialized', 500);
        }

        $data = $this->jsonBody();
        $code = (string)($data['code'] ?? '');

        $rlDir = $this->dataDir . '/ratelimit';
        rate_limit_check('enroll_' . $this->clientIp(), 60, 300, $rlDir);

        $username  = (string)($_SESSION['enroll_user'] ?? '');
        $secretB32 = (string)($_SESSION['enroll_secret'] ?? '');
        $started   = (int)($_SESSION['enroll_started'] ?? 0);

        if ($username === '' || $secretB32 === '' || pending_auth_remaining_seconds($started) <= 0) {
            clear_pending_auth_session_state();
            $this->error('enroll_expired', 401);
        }

        if (!totp_verify($secretB32, $code, 1, 30, 6)) {
            $this->error('invalid_code', 401);
        }

        $user = find_user_by_username($this->store, $username);
        if (!$user) {
            $this->error('user_not_found', 404);
        }

        $user['mfa'] = [
            'enabled'    => true,
            'secret_b32' => $secretB32,
            'enabled_at' => $this->nowIso(),
        ];
        $user['updated_at'] = $this->nowIso();
        update_user($this->store, $user);
        $this->saveUsersStore();

        set_authenticated_session($username, $user);

        $this->json([
            'ok'         => true,
            'logged_in'  => true,
            'user'       => sanitize_user_for_client($user),
            'csrf_token' => csrf_token(),
            'message'    => 'MFA enabled',
        ]);
    }

    /**
     * POST logout â€” Destroy the current session.
     *
     * Legacy action: `auth_logout` / `logout`
     *
     * @return never
     */
    public function logout(): never
    {
        if ($this->method() !== 'POST') {
            $this->error('method_not_allowed', 405);
        }
        $this->requireAllowedOrigin();
        $this->requireCsrf();
        destroy_auth_session();
        $this->json(['ok' => true, 'logged_in' => false]);
    }

    // â”€â”€ Private Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Update user's last_login timestamp and persist.
     *
     * @param array  $user     User record (modified by reference in store).
     * @param string $username Username for lookup.
     * @return void
     */
    private function updateLastLogin(array $user, string $username): void
    {
        $user['last_login']  = $this->nowIso();
        $user['updated_at']  = $this->nowIso();
        update_user($this->store, $user);
        $this->saveUsersStore();
    }

    /**
     * Persist the users store to disk.
     *
     * @return void
     */
    private function saveUsersStore(): void
    {
        $usersFile = $this->confDir . '/users.json';
        try {
            users_save($usersFile, $this->store);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('users_save_failed', 500);
        }
    }
}
