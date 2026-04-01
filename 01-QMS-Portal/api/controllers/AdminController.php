<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use Throwable;

/**
 * Admin operations controller for HESEM QMS Portal.
 *
 * Handles git sync/pull, cache clearing, data collection settings,
 * and portal display configuration.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class AdminController extends BaseController
{
    /**
     * POST gitSync — Commit and push local document changes to git.
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
     * POST gitPull — Pull latest changes from the remote repository.
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
     * GET gitStatus — Read current git repository status for cPanel sync panel.
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
     * POST gitDiscardLocal — Discard meaningful local runtime changes on server.
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
     * POST clearCache — Clear browser/CDN caches via headers.
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
     * GET getSettings — Get data collection settings.
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
        foreach ($defaults as $k => $v) {
            if (!isset($settings[$k])) $settings[$k] = $v;
        }

        $this->json(['ok' => true, 'settings' => $settings]);
    }

    /**
     * POST saveSettings — Save data collection settings (admin only).
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
        } catch (Throwable $e) {
            $this->error('save_failed', 500, $e->getMessage());
        }

        $this->auditLog('save_data_settings');
        $this->json(['ok' => true, 'settings' => $current]);
    }

    /**
     * GET getPortalConfig — Get portal display configuration (admin only).
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
     * POST savePortalConfig — Save portal display configuration (admin only).
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
}
