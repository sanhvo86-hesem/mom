<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use Throwable;

/**
 * Admin operations controller for HESEM MOM Portal.
 *
 * Handles git sync/pull, cache clearing, data collection settings,
 * and portal display configuration.
 *
 * @package MOM\Api\Controllers
 * @since   2.0.0
 */
class AdminController extends BaseController
{
    /**
     * POST gitSync â€” Commit and push local document changes to git.
     *
     * Legacy action: `admin_git_sync`
     *
     * @return never
     */
    public function gitSync(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        try {
            $result = git_sync_documents($me, $this->rootDir);
            $this->success([
                'pushed'         => (bool)($result['pushed'] ?? false),
                'branch'         => (string)($result['branch'] ?? 'main'),
                'files'          => array_values(array_map('strval', $result['files'] ?? [])),
                'status'         => array_values(array_map('strval', $result['status'] ?? [])),
                'status_entries' => array_values(array_map(static function ($row) {
                    return [
                        'xy'   => (string)($row['xy'] ?? ''),
                        'path' => (string)($row['path'] ?? ''),
                    ];
                }, $result['status_entries'] ?? [])),
                'message'        => (string)($result['message'] ?? ''),
                'commit_output'  => (string)($result['commit_output'] ?? ''),
                'push_output'    => (string)($result['push_output'] ?? ''),
                'head_before'    => (string)($result['head_before'] ?? ''),
                'head_after'     => (string)($result['head_after'] ?? ''),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->auditLog('admin_git_sync_failed', ['error' => $e->getMessage()]);
            $message = $e->getMessage();
            $error = match (true) {
                str_starts_with($message, 'exec_unavailable')          => 'exec_unavailable',
                str_starts_with($message, 'repo_not_found')            => 'repo_not_found',
                str_starts_with($message, 'not_a_git_repo')            => 'not_a_git_repo',
                str_starts_with($message, 'staged_changes_present')    => 'staged_changes_present',
                str_starts_with($message, 'git_add_failed')            => 'git_add_failed',
                str_starts_with($message, 'git_commit_failed')         => 'git_commit_failed',
                str_starts_with($message, 'git_push_failed')           => 'git_push_failed',
                str_starts_with($message, 'git_status_failed')         => 'git_status_failed',
                str_starts_with($message, 'git_index_check_failed')    => 'git_index_check_failed',
                str_starts_with($message, 'git_diff_cached_failed')    => 'git_diff_cached_failed',
                default                                                 => 'git_sync_failed',
            };
            $this->error($error, 500, $message);
        }
    }

    /**
     * POST gitPull â€” Pull latest changes from the remote repository.
     *
     * Legacy action: `admin_git_pull`
     *
     * @return never
     */
    public function gitPull(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        try {
            $result = git_pull_portal($this->rootDir, $me);
            $this->success([
                'pulled'        => (bool)($result['pulled'] ?? false),
                'branch'        => (string)($result['branch'] ?? 'main'),
                'message'       => (string)($result['message'] ?? ''),
                'before_head'   => (string)($result['before_head'] ?? ''),
                'after_head'    => (string)($result['after_head'] ?? ''),
                'changed_files' => array_values(array_map(static function ($row) {
                    return [
                        'status'   => (string)($row['status'] ?? ''),
                        'path'     => (string)($row['path'] ?? ''),
                        'old_path' => (string)($row['old_path'] ?? ''),
                    ];
                }, $result['changed_files'] ?? [])),
                'presync'       => is_array($result['presync'] ?? null) ? [
                    'pushed'         => (bool)($result['presync']['pushed'] ?? false),
                    'branch'         => (string)($result['presync']['branch'] ?? ''),
                    'files'          => array_values(array_map('strval', $result['presync']['files'] ?? [])),
                    'status'         => array_values(array_map('strval', $result['presync']['status'] ?? [])),
                    'status_entries' => array_values(array_map(static function ($row) {
                        return [
                            'xy'   => (string)($row['xy'] ?? ''),
                            'path' => (string)($row['path'] ?? ''),
                        ];
                    }, $result['presync']['status_entries'] ?? [])),
                    'message'        => (string)($result['presync']['message'] ?? ''),
                    'commit_output'  => (string)($result['presync']['commit_output'] ?? ''),
                    'push_output'    => (string)($result['presync']['push_output'] ?? ''),
                    'head_before'    => (string)($result['presync']['head_before'] ?? ''),
                    'head_after'     => (string)($result['presync']['head_after'] ?? ''),
                ] : null,
                'fetch_output'  => (string)($result['fetch_output'] ?? ''),
                'pull_output'   => (string)($result['pull_output'] ?? ''),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->auditLog('admin_git_pull_failed', ['error' => $e->getMessage()]);
            $message = $e->getMessage();
            $error = match (true) {
                str_starts_with($message, 'exec_unavailable')       => 'exec_unavailable',
                str_starts_with($message, 'repo_not_found')         => 'repo_not_found',
                str_starts_with($message, 'not_a_git_repo')         => 'not_a_git_repo',
                str_starts_with($message, 'staged_changes_present') => 'staged_changes_present',
                str_starts_with($message, 'working_tree_dirty')     => 'working_tree_dirty',
                str_starts_with($message, 'git_presync_failed')     => 'git_presync_failed',
                str_starts_with($message, 'git_fetch_failed')       => 'git_fetch_failed',
                str_starts_with($message, 'git_pull_failed')        => 'git_pull_failed',
                str_starts_with($message, 'git_status_failed')      => 'git_status_failed',
                str_starts_with($message, 'git_index_check_failed') => 'git_index_check_failed',
                default                                              => 'git_pull_failed',
            };
            $this->error($error, 500, $message);
        }
    }

    /**
     * GET gitStatus â€” Read current git repository status for cPanel sync panel.
     *
     * Legacy action: `admin_git_status`
     *
     * @return never
     */
    public function gitStatus(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        try {
            $result = git_repository_status($this->rootDir, true);
            $this->success([
                'repo_path'                => (string)($result['repo_path'] ?? ''),
                'remote_url'               => (string)($result['remote_url'] ?? ''),
                'branch'                   => (string)($result['branch'] ?? 'main'),
                'remote_branch'            => (string)($result['remote_branch'] ?? ''),
                'head'                     => is_array($result['head'] ?? null) ? [
                    'hash'         => (string)($result['head']['hash'] ?? ''),
                    'short_hash'   => (string)($result['head']['short_hash'] ?? ''),
                    'subject'      => (string)($result['head']['subject'] ?? ''),
                    'author_name'  => (string)($result['head']['author_name'] ?? ''),
                    'author_email' => (string)($result['head']['author_email'] ?? ''),
                    'committed_at' => (string)($result['head']['committed_at'] ?? ''),
                ] : null,
                'remote_head'              => is_array($result['remote_head'] ?? null) ? [
                    'hash'         => (string)($result['remote_head']['hash'] ?? ''),
                    'short_hash'   => (string)($result['remote_head']['short_hash'] ?? ''),
                    'subject'      => (string)($result['remote_head']['subject'] ?? ''),
                    'author_name'  => (string)($result['remote_head']['author_name'] ?? ''),
                    'author_email' => (string)($result['remote_head']['author_email'] ?? ''),
                    'committed_at' => (string)($result['remote_head']['committed_at'] ?? ''),
                ] : null,
                'ahead_count'              => (int)($result['ahead_count'] ?? 0),
                'behind_count'             => (int)($result['behind_count'] ?? 0),
                'working_tree_clean'       => (bool)($result['working_tree_clean'] ?? false),
                'meaningful_dirty_count'   => (int)($result['meaningful_dirty_count'] ?? 0),
                'meaningful_dirty_paths'   => array_values(array_map('strval', $result['meaningful_dirty_paths'] ?? [])),
                'meaningful_dirty_entries' => array_values(array_map(static function ($row) {
                    return [
                        'xy'   => (string)($row['xy'] ?? ''),
                        'path' => (string)($row['path'] ?? ''),
                    ];
                }, $result['meaningful_dirty_entries'] ?? [])),
                'cpanel_yml_exists'        => (bool)($result['cpanel_yml_exists'] ?? false),
                'deploy_ready'             => (bool)($result['deploy_ready'] ?? false),
                'fetch_error'              => (string)($result['fetch_error'] ?? ''),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->auditLog('admin_git_status_failed', ['error' => $e->getMessage()]);
            $message = $e->getMessage();
            $error = match (true) {
                str_starts_with($message, 'exec_unavailable') => 'exec_unavailable',
                str_starts_with($message, 'repo_not_found')   => 'repo_not_found',
                str_starts_with($message, 'not_a_git_repo')   => 'not_a_git_repo',
                str_starts_with($message, 'git_status_failed') => 'git_status_failed',
                default                                        => 'git_status_failed',
            };
            $this->error($error, 500, $message);
        }
    }

    /**
     * POST gitDiscardLocal â€” Discard meaningful local runtime changes on server.
     *
     * Legacy action: `admin_git_discard_local`
     *
     * @return never
     */
    public function gitDiscardLocal(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        try {
            $result = git_discard_meaningful_local_changes($this->rootDir);
            $this->success([
                'discarded'      => (bool)($result['discarded'] ?? false),
                'branch'         => (string)($result['branch'] ?? 'main'),
                'message'        => (string)($result['message'] ?? ''),
                'discarded_paths' => array_values(array_map('strval', $result['discarded_paths'] ?? [])),
                'restored_paths' => array_values(array_map('strval', $result['restored_paths'] ?? [])),
                'removed_paths'  => array_values(array_map('strval', $result['removed_paths'] ?? [])),
                'remaining_paths' => array_values(array_map('strval', $result['remaining_paths'] ?? [])),
                'before_head'    => (string)($result['before_head'] ?? ''),
                'after_head'     => (string)($result['after_head'] ?? ''),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->auditLog('admin_git_discard_local_failed', ['error' => $e->getMessage()]);
            $message = $e->getMessage();
            $error = match (true) {
                str_starts_with($message, 'exec_unavailable')  => 'exec_unavailable',
                str_starts_with($message, 'repo_not_found')    => 'repo_not_found',
                str_starts_with($message, 'not_a_git_repo')    => 'not_a_git_repo',
                str_starts_with($message, 'git_status_failed') => 'git_status_failed',
                str_starts_with($message, 'git_discard_failed') => 'git_discard_failed',
                default                                         => 'git_discard_failed',
            };
            $this->error($error, 500, $message);
        }
    }

    /**
     * POST clearCache â€” Clear browser/CDN caches via headers.
     *
     * Legacy action: `admin_clear_site_cache`
     *
     * @return never
     */
    public function clearCache(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        header('Clear-Site-Data: "cache"');
        header('Pragma: no-cache');
        header('Expires: 0');

        // Also invalidate server-side scan cache
        $this->invalidateScanCache();

        $this->auditLog('admin_clear_site_cache');
        $this->success(['message' => 'Origin cache reset requested.']);
    }

    /**
     * GET getSettings â€” Get data collection settings.
     *
     * Legacy action: `get_data_settings`
     *
     * @return never
     */
    public function getSettings(): never
    {
        $this->requireAuth();

        $defaults = [
            'collect_gps'        => true,
            'collect_ip'         => true,
            'collect_device'     => true,
            'collect_navigation' => true,
            'collect_connection' => true,
            'require_consent'    => true,
        ];

        $settings = $this->store['data_collection'] ?? $defaults;
        try {
            $shadow = $this->data->getConfig('data_collection_settings');
            if (is_array($shadow)) {
                $settings = is_array($shadow['settings'] ?? null)
                    ? (array)$shadow['settings']
                    : $shadow;
            }
        } catch (Throwable) {
            // Keep users.json-backed fallback when shadow storage is unavailable.
        }
        foreach ($defaults as $k => $v) {
            if (!isset($settings[$k])) $settings[$k] = $v;
        }

        $this->json(['ok' => true, 'settings' => $settings]);
    }

    /**
     * POST saveSettings â€” Save data collection settings (admin only).
     *
     * Legacy action: `save_data_settings`
     *
     * @return never
     */
    public function saveSettings(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);

        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $input   = $this->jsonBody();
        $allowed = ['collect_gps', 'collect_ip', 'collect_device', 'collect_navigation', 'collect_connection', 'require_consent'];
        $current = $this->store['data_collection'] ?? [];

        foreach ($allowed as $key) {
            if (isset($input[$key])) {
                $current[$key] = (bool)$input[$key];
            }
        }

        $this->store['data_collection'] = $current;

        $usersFile = $this->confDir . '/users.json';
        try {
            users_save($usersFile, $this->store);
            $this->data->saveConfig('data_collection_settings', [
                'settings' => $current,
                'updated_by' => (string)($me['username'] ?? ''),
                'updated_at' => $this->nowIso(),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }

        $this->auditLog('save_data_settings');
        $this->json(['ok' => true, 'settings' => $current]);
    }

    /**
     * GET getPortalConfig â€” Get portal display configuration (admin only).
     *
     * Legacy action: `admin_portal_display_config_get`
     *
     * @return never
     */
    public function getPortalConfig(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $configFile = $this->confDir . '/portal_display_config.json';
        $config = portal_load_display_config($configFile);

        $this->success(['config' => portal_display_config_public_payload($config)]);
    }

    /**
     * POST savePortalConfig â€” Save portal display configuration (admin only).
     *
     * Legacy action: `admin_portal_display_config_save`
     *
     * @return never
     */
    public function savePortalConfig(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $configIn = $data['config'] ?? null;
        if (!is_array($configIn)) $this->error('invalid_config', 400);

        $configFile = $this->confDir . '/portal_display_config.json';
        $saved = portal_save_display_config($configFile, $configIn);
        $this->invalidateScanCache();

        $this->auditLog('admin_portal_display_config_save');
        $this->success(['config' => portal_display_config_public_payload($saved)]);
    }

    /**
     * GET getModuleAccessConfig — Get portal module access configuration.
     *
     * Action: `module_access_get`
     *
     * @return never
     */
    public function getModuleAccessConfig(): never
    {
        $this->requireAuth();

        $configFile = $this->confDir . '/module_access_config.json';
        $config = module_access_load_config($configFile);

        $this->success(['config' => module_access_public_payload($config)]);
    }

    /**
     * POST saveModuleAccessConfig — Save portal module access configuration.
     *
     * Action: `admin_module_access_save`
     *
     * @return never
     */
    public function saveModuleAccessConfig(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data = $this->jsonBody();
        $configIn = $data['config'] ?? null;
        if (!is_array($configIn)) {
            $this->error('invalid_config', 400);
        }

        $configFile = $this->confDir . '/module_access_config.json';
        $saved = module_access_save_config($configFile, $configIn);

        $this->auditLog('admin_module_access_save');
        $this->success(['config' => module_access_public_payload($saved)]);
    }

    /**
     * GET getAuditTrail — Read authoritative administrative audit trail.
     *
     * Action: `admin_audit_trail_list`
     *
     * @return never
     */
    public function getAuditTrail(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $limit = max(1, min(500, (int)($this->query('limit', '200') ?? '200')));
        $filters = ['limit' => $limit];
        foreach (['event_type', 'aggregate_type', 'aggregate_id', 'actor_name', 'search', 'from', 'to'] as $key) {
            $value = trim((string)($this->query($key, '') ?? ''));
            if ($value !== '') {
                $filters[$key] = $value;
            }
        }

        try {
            $events = $this->data->getAuditLog($filters);
            $sanitized = array_values(array_map(static function ($row): array {
                $entry = is_array($row) ? $row : [];
                return [
                    'event_type' => (string)($entry['event_type'] ?? $entry['action'] ?? ''),
                    'aggregate_type' => (string)($entry['aggregate_type'] ?? 'api_action'),
                    'aggregate_id' => (string)($entry['aggregate_id'] ?? ''),
                    'actor_name' => (string)($entry['actor_name'] ?? $entry['user'] ?? ''),
                    'payload' => is_array($entry['payload'] ?? null) ? (array)$entry['payload'] : [],
                    'metadata' => is_array($entry['metadata'] ?? null) ? (array)$entry['metadata'] : [],
                    'ip_address' => (string)($entry['ip_address'] ?? $entry['ip'] ?? ''),
                    'recorded_at' => (string)($entry['recorded_at'] ?? $entry['timestamp'] ?? ''),
                ];
            }, is_array($events) ? $events : []));

            $this->success(['events' => $sanitized, 'limit' => $limit]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('audit_trail_read_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getUserDocumentOverrides — Read per-user document access overrides.
     *
     * Action: `user_doc_overrides_get`
     *
     * Admin users receive the full map. Non-admin users only receive their own
     * override slice so document access can be enforced consistently in the UI.
     *
     * @return never
     */
    public function getUserDocumentOverrides(): never
    {
        $user = $this->requireAuth();

        try {
            $config = $this->data->getConfig('user_doc_overrides');
            $rawOverrides = is_array($config['overrides'] ?? null)
                ? (array)$config['overrides']
                : (is_array($config) ? $config : []);
            $clean = $this->normalizeUserDocumentOverrides($rawOverrides);

            if (!$this->userHasAnyRole($user, admin_roles())) {
                $username = strtolower(trim((string)($user['username'] ?? '')));
                $clean = ($username !== '' && isset($clean[$username]))
                    ? [$username => $clean[$username]]
                    : [];
            }

            $this->success(['overrides' => $clean]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('user_doc_overrides_read_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveUserDocumentOverrides — Persist per-user document access overrides.
     *
     * Action: `admin_user_doc_overrides_save`
     *
     * @return never
     */
    public function saveUserDocumentOverrides(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($user);

        $data = $this->jsonBody();
        $input = $data['overrides'] ?? null;
        if (!is_array($input)) {
            $this->error('invalid_overrides', 400);
        }

        $clean = $this->normalizeUserDocumentOverrides($input);
        $payload = [
            'overrides' => $clean,
            'updated_by' => (string)($user['username'] ?? ''),
            'updated_at' => $this->nowIso(),
        ];

        try {
            $this->data->saveConfig('user_doc_overrides', $payload);
            $this->auditLog('admin_user_doc_overrides_save', ['count' => count($clean)]);
            $this->success(['overrides' => $clean]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('user_doc_overrides_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, array{grant: array<int, string>, deny: array<int, string>}>
     */
    private function normalizeUserDocumentOverrides(array $input): array
    {
        $clean = [];
        foreach ($input as $username => $override) {
            $key = strtolower(trim((string)$username));
            if ($key === '' || !is_array($override)) {
                continue;
            }

            $grant = array_values(array_unique(array_filter(array_map(
                static fn($value): string => strtoupper(trim((string)$value)),
                is_array($override['grant'] ?? null) ? (array)$override['grant'] : []
            ))));
            $deny = array_values(array_unique(array_filter(array_map(
                static fn($value): string => strtoupper(trim((string)$value)),
                is_array($override['deny'] ?? null) ? (array)$override['deny'] : []
            ))));

            if ($grant === [] && $deny === []) {
                continue;
            }

            $clean[$key] = [
                'grant' => $grant,
                'deny' => $deny,
            ];
        }

        ksort($clean);
        return $clean;
    }

    // â”€â”€ MFA Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getMfaSettings â€” Get current MFA settings and per-user MFA status.
     * Action: `admin_mfa_settings_get`
     * @return never
     */
    public function getMfaSettings(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $usersFile = $this->confDir . '/users.json';
            $data = $this->readJsonFile($usersFile) ?? ['settings' => [], 'users' => []];

            $settings = $data['settings'] ?? [];
            $users = $data['users'] ?? [];

            $mfaStatus = [];
            foreach ($users as $u) {
                $mfaStatus[] = [
                    'username'    => (string)($u['username'] ?? ''),
                    'name'        => (string)($u['name'] ?? ''),
                    'role'        => (string)($u['role'] ?? ''),
                    'active'      => (bool)($u['active'] ?? false),
                    'mfa_enabled' => !empty($u['mfa']['enabled']),
                    'mfa_enrolled_at' => (string)($u['mfa']['enabled_at'] ?? ''),
                ];
            }

            $this->success([
                'require_mfa'   => (bool)($settings['require_mfa'] ?? false),
                'issuer'        => (string)($settings['issuer'] ?? 'HESEM MOM'),
                'users_mfa'     => $mfaStatus,
                'total_users'   => count($users),
                'mfa_enrolled'  => count(array_filter($mfaStatus, fn($u) => $u['mfa_enabled'])),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('mfa_settings_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveMfaSettings â€” Update global MFA settings and per-user MFA status.
     * Action: `admin_mfa_settings_save`
     *
     * Body fields:
     *   - require_mfa (bool): Global MFA requirement toggle.
     *   - reset_user  (string, optional): Username to reset MFA for.
     *   - enable_user (string, optional): Username to enable MFA for.
     *   - disable_user (string, optional): Username to disable MFA for.
     *
     * @return never
     */
    public function saveMfaSettings(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $userId = (string)($user['username'] ?? 'admin');

        try {
            $usersFile = $this->confDir . '/users.json';
            $data = $this->readJsonFile($usersFile) ?? ['settings' => [], 'users' => []];

            // Update global require_mfa setting
            if (isset($body['require_mfa'])) {
                $data['settings']['require_mfa'] = (bool)$body['require_mfa'];
            }

            // Reset MFA for a specific user
            if (!empty($body['reset_user'])) {
                $targetUser = trim((string)$body['reset_user']);
                foreach ($data['users'] as &$u) {
                    if (($u['username'] ?? '') === $targetUser) {
                        $u['mfa'] = ['enabled' => false, 'secret_b32' => '', 'enabled_at' => ''];
                        break;
                    }
                }
                unset($u);
            }

            // Disable MFA for a specific user
            if (!empty($body['disable_user'])) {
                $targetUser = trim((string)$body['disable_user']);
                foreach ($data['users'] as &$u) {
                    if (($u['username'] ?? '') === $targetUser) {
                        $u['mfa']['enabled'] = false;
                        break;
                    }
                }
                unset($u);
            }

            // Enable MFA for a specific user (they'll need to enroll on next login)
            if (!empty($body['enable_user'])) {
                $targetUser = trim((string)$body['enable_user']);
                foreach ($data['users'] as &$u) {
                    if (($u['username'] ?? '') === $targetUser) {
                        if (empty($u['mfa'])) {
                            $u['mfa'] = ['enabled' => false, 'secret_b32' => '', 'enabled_at' => ''];
                        }
                        // Mark for enrollment - user will set up on next login
                        break;
                    }
                }
                unset($u);
            }

            $this->writeJsonFile($usersFile, $data);

            $this->auditLog('admin_mfa_settings_save', [
                'require_mfa' => $data['settings']['require_mfa'] ?? false,
                'reset_user'  => $body['reset_user'] ?? null,
                'disable_user' => $body['disable_user'] ?? null,
            ], $userId);

            $this->success(['saved' => true, 'require_mfa' => (bool)($data['settings']['require_mfa'] ?? false)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('mfa_settings_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET admin_design_config — Load design system configuration.
     */
    public function getDesignConfig(): never
    {
        $this->requireAuth();
        try {
            $file = $this->dataDir . '/config/design-system-config.json';
            $data = $this->readJsonFile($file) ?? [];
            $this->success(['config' => $data, 'data' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('design_config_load_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_design_config_save — Save design system configuration.
     */
    public function saveDesignConfig(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, array_merge(admin_roles(), ['it_admin', 'ceo']));

        $body = $this->jsonBody();
        $config = $body['config'] ?? null;
        if (!is_array($config) && !is_object($config)) {
            $this->error('invalid_config', 400, 'Config must be an object');
        }

        try {
            $file = $this->dataDir . '/config/design-system-config.json';
            $config['_meta'] = [
                'version' => '2.0',
                'description' => 'Admin-configurable design system.',
                'updatedAt' => date('c'),
                'updatedBy' => $user['username'] ?? 'admin',
            ];
            $this->writeJsonFile($file, (array)$config);
            $this->auditLog('design_config_save', ['keys' => count((array)$config)], (string)($user['username'] ?? ''));
            $this->success(['saved' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('design_config_save_failed', 500, $e->getMessage());
        }
    }
}
