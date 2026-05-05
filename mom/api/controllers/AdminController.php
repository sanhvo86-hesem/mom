<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\DataSyncStatusService;
use MOM\Api\Services\GraphicsGovernanceException;
use MOM\Api\Services\GraphicsGovernanceService;
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
    private ?GraphicsGovernanceService $graphicsGovernanceService = null;

    private function graphicsGovernance(): GraphicsGovernanceService
    {
        if ($this->graphicsGovernanceService === null) {
            $this->graphicsGovernanceService = new GraphicsGovernanceService($this->rootDir, $this->dataDir);
        }
        return $this->graphicsGovernanceService;
    }

    /**
     * GET gitStatus — Read current git repository status (read-only).
     *
     * Action: `admin_git_status`
     *
     * The portal does not write to the working tree; deployment goes through
     * the GitHub Actions pipeline (`.github/workflows/deploy.yml`) and
     * `tools/vps-setup/scripts/deploy.sh` on the VPS.
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
                'remote_origin_hash'       => (string)($result['remote_origin_hash'] ?? ''),
                'remote_ref_stale'         => (bool)($result['remote_ref_stale'] ?? false),
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
     * GET dataSyncStatus — Read-only status of the local↔VPS runtime-config bridge.
     *
     * Action: `admin_data_sync_status`
     *
     * Surfaces what data-sync.sh, data-pull.sh, and data-push.sh manage:
     * which runtime config files exist, whether they match the
     * /var/www/data-private mirror, how many push snapshots are kept, and
     * the most recent audit-log lines and audit_events rows.
     *
     * The portal NEVER drives data-sync from PHP — that script must run on
     * the developer workstation (where it has SSH credentials and a working
     * pool to reconcile against). This endpoint only observes state.
     *
     * @return never
     */
    public function dataSyncStatus(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        try {
            $svc = new DataSyncStatusService(
                $this->rootDir,
                $this->dataDir,
                $this->data
            );
            $this->success($svc->status());
        } catch (Throwable $e) {
            $this->auditLog('admin_data_sync_status_failed', ['error' => $e->getMessage()]);
            $this->error('data_sync_status_failed', 500, $e->getMessage());
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
            $this->success($this->graphicsGovernance()->getDesignConfig());
        } catch (GraphicsGovernanceException $e) {
            $this->error($e->errorCode(), $e->statusCode(), $e->getMessage(), [
                'errors' => $e->errors(),
            ] + $e->extra());
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
            $result = $this->graphicsGovernance()->saveDesignConfig(
                (array)$config,
                $this->expectedGraphicsVersion($body, (array)$config),
                (string)($user['username'] ?? 'admin')
            );
            $this->auditLog('design_config_save', [
                'keys' => count((array)$config),
                'authority' => 'backend_graphics_design_config',
                'version' => $result['version'] ?? '',
                'etag' => $result['etag'] ?? '',
            ], (string)($user['username'] ?? ''));
            $this->success($result);
        } catch (GraphicsGovernanceException $e) {
            $this->error($e->errorCode(), $e->statusCode(), $e->getMessage(), [
                'errors' => $e->errors(),
            ] + $e->extra());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('design_config_save_failed', 500, $e->getMessage());
        }
    }

    // ── AI Configuration ─────────────────────────────────────────────────────

    /**
     * GET admin_ai_config_get — Load AI engine configuration.
     */
    public function getAiConfig(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, admin_roles());

        $aiCfgFile = $this->confDir . '/ai_config.json';
        $cfg = is_file($aiCfgFile)
            ? (json_decode((string)file_get_contents($aiCfgFile), true) ?: [])
            : [];

        // Mask API key — only return last 4 chars
        $key = (string)($cfg['api_key'] ?? '');
        if ($key !== '') {
            $cfg['api_key_masked'] = str_repeat('•', max(0, strlen($key) - 4)) . substr($key, -4);
            unset($cfg['api_key']); // never send the real key to browser
        }

        // Merge env defaults so the UI always has values
        $envEnabled = filter_var(getenv('AI_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN);
        $defaults = [
            'enabled'       => $envEnabled,
            'model'         => getenv('ANTHROPIC_MODEL') ?: 'claude-sonnet-4-20250514',
            'max_tokens'    => (int)(getenv('ANTHROPIC_MAX_TOKENS') ?: 4096),
            'timeout'       => (int)(getenv('ANTHROPIC_TIMEOUT') ?: 30),
            'cache_ttl'     => (int)(getenv('AI_CACHE_TTL') ?: 300),
            'rpm_limit'     => 60,
            'user_rpm_limit'=> 20,
            'features'      => [
                'realtime'        => true,
                'recommendations' => true,
                'chat'            => true,
                'predictions'     => true,
                'schedule'        => true,
                'summarise'       => true,
                'rca'             => true,
            ],
        ];

        foreach ($defaults as $k => $v) {
            if (!array_key_exists($k, $cfg)) {
                $cfg[$k] = $v;
            }
        }
        if (!isset($cfg['features']) || !is_array($cfg['features'])) {
            $cfg['features'] = $defaults['features'];
        }

        $this->success(['config' => $cfg]);
    }

    /**
     * POST admin_ai_config_save — Save AI engine configuration.
     */
    public function saveAiConfig(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, admin_roles());

        $body = $this->jsonBody();

        // Validate
        $allowed_models = [
            'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5',
            'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-3-20240307',
        ];

        $model = (string)($body['model'] ?? 'claude-sonnet-4-20250514');
        if (!in_array($model, $allowed_models, true)) {
            $this->error('invalid_model', 400, 'Unknown model: ' . $model);
        }

        $maxTok  = max(512, min(16000, (int)($body['max_tokens'] ?? 4096)));
        $timeout = max(10,  min(120,   (int)($body['timeout']    ?? 30)));
        $cacheTtl= max(0,   min(3600,  (int)($body['cache_ttl']  ?? 300)));
        $rpmLim  = max(5,   min(300,   (int)($body['rpm_limit']  ?? 60)));
        $userRpm = max(1,   min(60,    (int)($body['user_rpm_limit'] ?? 20)));

        $enabled = filter_var($body['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Load existing config to preserve stored API key if not updated
        $aiCfgFile = $this->confDir . '/ai_config.json';
        $existing  = is_file($aiCfgFile)
            ? (json_decode((string)file_get_contents($aiCfgFile), true) ?: [])
            : [];
        $newKey   = isset($body['api_key']) ? trim((string)$body['api_key']) : '';
        $apiKey   = $newKey !== '' ? $newKey : ($existing['api_key'] ?? '');

        $features = [];
        $allowedFeats = ['realtime','recommendations','chat','predictions','schedule','summarise','rca'];
        $bodyFeats = is_array($body['features'] ?? null) ? $body['features'] : [];
        foreach ($allowedFeats as $f) {
            $features[$f] = filter_var($bodyFeats[$f] ?? true, FILTER_VALIDATE_BOOLEAN);
        }

        $cfg = [
            'enabled'        => $enabled,
            'model'          => $model,
            'api_key'        => $apiKey,
            'max_tokens'     => $maxTok,
            'timeout'        => $timeout,
            'cache_ttl'      => $cacheTtl,
            'rpm_limit'      => $rpmLim,
            'user_rpm_limit' => $userRpm,
            'features'       => $features,
            'updated_at'     => gmdate('c'),
            'updated_by'     => (string)($user['username'] ?? 'admin'),
        ];

        $aiCfgFile = $this->confDir . '/ai_config.json';
        file_put_contents($aiCfgFile, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->auditLog('ai_config_save', [
            'enabled' => $enabled,
            'model'   => $model,
            'features'=> $features,
        ], (string)($user['username'] ?? ''));

        $this->success(['saved' => true]);
    }

    /**
     * GET admin_ai_usage_get — AI token usage and circuit breaker status.
     */
    public function getAiUsage(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, admin_roles());

        $logDir = $this->dataDir . '/ai-logs';
        $today  = gmdate('Y-m-d');
        $todayFile = $logDir . '/usage-' . $today . '.jsonl';

        $todayStats = ['requests' => 0, 'tokens_in' => 0, 'tokens_out' => 0, 'cost_usd' => 0.0];
        $totalStats = ['requests' => 0, 'tokens_in' => 0, 'tokens_out' => 0, 'cost_usd' => 0.0];

        // Aggregate today's log
        if (is_file($todayFile)) {
            $lines = file($todayFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ((array)$lines as $line) {
                $entry = json_decode($line, true);
                if (!is_array($entry)) continue;
                $todayStats['requests']++;
                $todayStats['tokens_in']  += (int)($entry['input_tokens']  ?? 0);
                $todayStats['tokens_out'] += (int)($entry['output_tokens'] ?? 0);
                $todayStats['cost_usd']   += (float)($entry['cost_usd']    ?? 0);
            }
        }

        // Aggregate all logs (up to last 30 files for performance)
        if (is_dir($logDir)) {
            $files = glob($logDir . '/usage-*.jsonl') ?: [];
            rsort($files);
            $files = array_slice($files, 0, 30);
            foreach ($files as $f) {
                $lines = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ((array)$lines as $line) {
                    $entry = json_decode($line, true);
                    if (!is_array($entry)) continue;
                    $totalStats['requests']++;
                    $totalStats['tokens_in']  += (int)($entry['input_tokens']  ?? 0);
                    $totalStats['tokens_out'] += (int)($entry['output_tokens'] ?? 0);
                    $totalStats['cost_usd']   += (float)($entry['cost_usd']    ?? 0);
                }
            }
        }

        // Circuit breaker state from cache file
        $cbFile = $this->dataDir . '/ai-logs/circuit_breaker.json';
        $cb = ['state' => 'closed', 'failure_count' => 0, 'failure_threshold' => 5, 'recovery_timeout' => 120];
        if (is_file($cbFile)) {
            $stored = json_decode((string)file_get_contents($cbFile), true);
            if (is_array($stored)) {
                $cb = array_merge($cb, $stored);
                // Compute live state from timestamps
                if (($stored['state'] ?? '') === 'open') {
                    $openedAt = (int)($stored['opened_at'] ?? 0);
                    $recoveryTimeout = (int)($stored['recovery_timeout'] ?? 120);
                    if (time() - $openedAt >= $recoveryTimeout) {
                        $cb['state'] = 'half_open';
                    }
                }
            }
        }

        $this->success([
            'usage' => [
                'today'           => $todayStats,
                'total'           => $totalStats,
                'circuit_breaker' => $cb,
            ],
        ]);
    }

    /**
     * POST admin_ai_test_connection — Ping Anthropic API with current/provided key.
     */
    public function testAiConnection(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, admin_roles());

        $body  = $this->jsonBody();
        $aiCfgFile = $this->confDir . '/ai_config.json';
        $cfg   = is_file($aiCfgFile)
            ? (json_decode((string)file_get_contents($aiCfgFile), true) ?: [])
            : [];
        $key   = trim((string)($body['api_key'] ?? ''));
        $model = (string)($body['model'] ?? ($cfg['model'] ?? 'claude-sonnet-4-20250514'));

        if ($key === '') {
            $key = (string)($cfg['api_key'] ?? getenv('ANTHROPIC_API_KEY') ?: '');
        }
        if ($key === '') {
            $this->error('no_api_key', 400, 'No API key configured');
        }

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'x-api-key: ' . $key,
                'anthropic-version: 2023-06-01',
                'content-type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model'      => $model,
                'max_tokens' => 10,
                'messages'   => [['role' => 'user', 'content' => 'ping']],
            ]),
        ]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) {
            $this->error('curl_error', 502, $err);
        }

        $resp = json_decode((string)$raw, true);
        if ($code === 200 || isset($resp['content'])) {
            $this->success(['connected' => true, 'model' => $model]);
        }

        $msg = (string)($resp['error']['message'] ?? ('HTTP ' . $code));
        $this->error('connection_failed', 502, $msg);
    }

    /**
     * POST admin_ai_reset_circuit_breaker — Reset the AI circuit breaker to closed state.
     */
    public function resetAiCircuitBreaker(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, admin_roles());

        $cbFile = $this->dataDir . '/ai-logs/circuit_breaker.json';
        $reset = [
            'state'            => 'closed',
            'failure_count'    => 0,
            'failure_threshold'=> 5,
            'recovery_timeout' => 120,
            'reset_at'         => gmdate('c'),
            'reset_by'         => (string)($user['username'] ?? 'admin'),
        ];
        @mkdir(dirname($cbFile), 0755, true);
        file_put_contents($cbFile, json_encode($reset));

        $this->auditLog('ai_circuit_breaker_reset', [], (string)($user['username'] ?? ''));
        $this->success(['reset' => true]);
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $resource
     */
    private function expectedGraphicsVersion(array $body, array $resource): ?string
    {
        $header = $this->requestHeader('If-Match');
        if ($header !== null && trim($header) !== '') {
            return $header;
        }
        foreach (['expectedVersion', 'baseVersion', 'registryVersion', 'version'] as $key) {
            if (isset($body[$key]) && is_scalar($body[$key])) {
                return (string)$body[$key];
            }
        }
        $meta = is_array($resource['_meta'] ?? null) ? (array)$resource['_meta'] : [];
        if (isset($meta['governanceRevision']) && is_scalar($meta['governanceRevision'])) {
            return 'rev-' . (string)$meta['governanceRevision'];
        }
        if (isset($meta['version']) && is_scalar($meta['version'])) {
            return (string)$meta['version'];
        }
        return null;
    }
}
