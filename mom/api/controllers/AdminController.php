<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\DataSyncMutationService;
use MOM\Api\Services\DataSyncStatusService;
use MOM\Api\Services\DecisionThresholdService;
use MOM\Api\Services\GraphicsGovernanceException;
use MOM\Api\Services\GraphicsGovernanceService;
use MOM\Api\Services\LocalRuntimeSyncService;
use MOM\Api\Services\KpiRegistryAdminService;
use MOM\Api\Services\RaciMatrixService;
use MOM\Api\Services\VersionControlService;
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

    private ?DecisionThresholdService $decisionThresholdService = null;

    private ?RaciMatrixService $raciMatrixService = null;

    private ?KpiRegistryAdminService $kpiRegistryAdminService = null;

    private ?LocalRuntimeSyncService $localRuntimeSyncService = null;

    private function graphicsGovernance(): GraphicsGovernanceService
    {
        if ($this->graphicsGovernanceService === null) {
            $this->graphicsGovernanceService = new GraphicsGovernanceService($this->rootDir, $this->dataDir);
        }
        return $this->graphicsGovernanceService;
    }

    private function decisionThresholds(): DecisionThresholdService
    {
        if ($this->decisionThresholdService === null) {
            $this->decisionThresholdService = new DecisionThresholdService($this->rootDir, $this->dataDir);
        }
        return $this->decisionThresholdService;
    }

    private function raciMatrix(): RaciMatrixService
    {
        if ($this->raciMatrixService === null) {
            $this->raciMatrixService = new RaciMatrixService($this->rootDir, $this->dataDir);
        }
        return $this->raciMatrixService;
    }

    private function kpiRegistryAdmin(): KpiRegistryAdminService
    {
        if ($this->kpiRegistryAdminService === null) {
            $this->kpiRegistryAdminService = new KpiRegistryAdminService($this->rootDir, $this->dataDir);
        }
        return $this->kpiRegistryAdminService;
    }

    private function localRuntimeSync(): LocalRuntimeSyncService
    {
        if ($this->localRuntimeSyncService === null) {
            $this->localRuntimeSyncService = new LocalRuntimeSyncService($this->rootDir, $this->dataDir);
        }
        return $this->localRuntimeSyncService;
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
     * The separate local-sync control endpoints below are guarded so they can
     * execute only when this API itself is running from a local macOS checkout.
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
     * GET admin_data_sync_download_file ?file=<basename>
     * Returns the raw content of one whitelisted runtime file as an attachment.
     */
    public function dataSyncDownloadFile(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $file = (string)($this->query('file') ?? '');
        try {
            $svc = $this->dataSyncMutator();
            $row = $svc->readSiteFile($file);
            $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $file) ?: 'download.json';
            // Send as application/json download
            while (ob_get_level() > 0) { @ob_end_clean(); }
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $safeName . '"');
            header('X-File-SHA256: ' . $row['sha256']);
            header('Cache-Control: no-store, must-revalidate');
            header('X-Content-Type-Options: nosniff');
            echo $row['bytes'];
            $this->auditLog('admin_data_sync_download_file', ['file' => $file, 'sha256' => $row['sha256']]);
            exit;
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_upload_file
     * Body: { file, content, expected_sha256?, change_ref?, force? }
     */
    public function dataSyncUploadFile(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody(8 * 1024 * 1024);
        $file = (string)($body['file'] ?? '');
        $content = (string)($body['content'] ?? '');
        $expected = isset($body['expected_sha256']) && $body['expected_sha256'] !== ''
            ? (string)$body['expected_sha256'] : null;
        $force = !empty($body['force']);
        if ($force) {
            // Bypass drift detection by passing null baseline.
            $expected = null;
        }
        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if ($changeRef === '') {
            $changeRef = 'admin-ui-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        $actor = (string)($me['username'] ?? 'unknown');

        try {
            $svc = $this->dataSyncMutator();
            $result = $svc->uploadFile($file, $content, $expected, $actor, $changeRef);
            $this->success(array_merge(['file' => $file, 'change_ref' => $changeRef], $result));
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_resolve_drift
     * Body: { file, direction: site_to_mirror|mirror_to_site, change_ref? }
     */
    public function dataSyncResolveDrift(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        // Pha 5 freeze gate.
        $cfg = module_access_load_config($this->confDir . '/module_access_config.json');
        if (deploy_freeze_is_active($cfg)) {
            $f = deploy_freeze_normalize((array)($cfg['deploy_freeze'] ?? []));
            $this->error('deploy_frozen', 423, 'Config drift resolution is frozen (ticket=' . ($f['ticket_id'] ?: 'unknown') . ').');
        }

        $body = $this->jsonBody();
        $file = (string)($body['file'] ?? '');
        $direction = (string)($body['direction'] ?? '');
        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if ($changeRef === '') {
            $changeRef = 'admin-ui-drift-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        $actor = (string)($me['username'] ?? 'unknown');

        try {
            $svc = $this->dataSyncMutator();
            $result = $svc->resolveMirrorDrift($file, $direction, $actor, $changeRef);
            $this->success(array_merge(['file' => $file], $result));
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * GET admin_data_sync_snapshots
     */
    public function dataSyncListSnapshots(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        try {
            $svc = $this->dataSyncMutator();
            $rows = $svc->listSnapshots(60);
            $this->success(['snapshots' => $rows]);
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_restore_snapshot
     * Body: { snapshot_id, file? (optional, restores single file), change_ref? }
     */
    public function dataSyncRestoreSnapshot(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $snapshotId = (string)($body['snapshot_id'] ?? '');
        $file = isset($body['file']) && $body['file'] !== '' ? (string)$body['file'] : null;
        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if ($changeRef === '') {
            $changeRef = 'admin-ui-restore-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        $actor = (string)($me['username'] ?? 'unknown');

        try {
            $svc = $this->dataSyncMutator();
            $result = $svc->restoreFromSnapshot($snapshotId, $file, $actor, $changeRef);
            $this->success($result);
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_take_snapshot
     * Body: { files?: list<basename>, reason?: string }
     */
    public function dataSyncTakeSnapshot(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $files = isset($body['files']) && is_array($body['files']) ? array_values(array_map('strval', $body['files'])) : null;
        $reason = trim((string)($body['reason'] ?? 'manual'));
        if (strlen($reason) > 80) { $reason = substr($reason, 0, 80); }
        $actor = (string)($me['username'] ?? 'unknown');

        try {
            $svc = $this->dataSyncMutator();
            $result = $svc->takeManualSnapshot($files, $actor, $reason);
            $this->success($result);
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * GET admin_data_sync_read_file ?file=<basename>
     * Returns content from BOTH site and mirror pools so the admin diff-viewer
     * can render an inline comparison before resolving drift.
     */
    public function dataSyncReadFile(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $file = (string)($this->query('file') ?? '');
        try {
            $svc = $this->dataSyncMutator();
            $result = $svc->readBothFiles($file);
            $this->success($result);
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_batch_resolve
     * Body: { direction: site_to_mirror|mirror_to_site, scope: drift|no_mirror|absent|all, change_ref? }
     * Resolves all qualifying files in one shot with a pre-flight snapshot.
     */
    public function dataSyncBatchResolve(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        // Pha 5 freeze gate. Batch resolve is the highest-blast-radius
        // mutation on the sync surface, so it must respect the freeze.
        $cfg = module_access_load_config($this->confDir . '/module_access_config.json');
        if (deploy_freeze_is_active($cfg)) {
            $f = deploy_freeze_normalize((array)($cfg['deploy_freeze'] ?? []));
            $this->error('deploy_frozen', 423, 'Batch config sync is frozen (ticket=' . ($f['ticket_id'] ?: 'unknown') . ').');
        }

        $body      = $this->jsonBody();
        $direction = (string)($body['direction'] ?? '');
        $scope     = (string)($body['scope'] ?? 'drift');
        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if ($changeRef === '') {
            $changeRef = 'admin-ui-batch-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        $actor = (string)($me['username'] ?? 'unknown');

        try {
            $svc    = $this->dataSyncMutator();
            $result = $svc->batchResolveDrift($direction, $scope, $actor, $changeRef);
            $this->success(array_merge(['direction' => $direction, 'scope' => $scope, 'change_ref' => $changeRef], $result));
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_unregister_file
     * Body: { file }
     * Removes a single "missing both" file from the Config Sync registry so it
     * stops appearing in the table. Only allowed when the file is absent from
     * both site and mirror pools.
     */
    public function dataSyncUnregisterFile(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body  = $this->jsonBody();
        $file  = (string)($body['file'] ?? '');
        $actor = (string)($me['username'] ?? 'unknown');
        $cr    = 'admin-ui-unregister-' . substr(bin2hex(random_bytes(3)), 0, 6);

        try {
            // Verify the file is truly absent from both pools before excluding.
            $statusSvc = new DataSyncStatusService(
                $this->rootDir,
                $this->dataDir,
                $this->data
            );
            $found = null;
            foreach ($statusSvc->status()['config_files'] as $row) {
                if (($row['name'] ?? '') === $file) {
                    $found = $row;
                    break;
                }
            }
            // Also accept files that are already excluded (idempotent re-exclusion).
            // If $found is null, it may be excluded already — proceed.
            if ($found !== null && ($found['site_present'] || $found['private_present'])) {
                $this->error('unregister_only_for_missing_both', 409,
                    'File exists on at least one pool; only missing-both files may be unregistered.');
            }
            $result = $this->dataSyncMutator()->excludeFile($file, $actor, $cr);
            $this->success(array_merge(['file' => $file, 'change_ref' => $cr], $result));
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * POST admin_data_sync_batch_unregister
     * Removes ALL "missing both" files from the registry in one call.
     */
    public function dataSyncBatchUnregister(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $actor = (string)($me['username'] ?? 'unknown');
        $cr    = 'admin-ui-batch-unregister-' . substr(bin2hex(random_bytes(3)), 0, 6);

        try {
            $statusSvc = new DataSyncStatusService(
                $this->rootDir,
                $this->dataDir,
                $this->data
            );
            $goneFiles = array_filter(
                $statusSvc->status()['config_files'],
                fn($row) => !($row['site_present'] ?? false) && !($row['private_present'] ?? false)
            );
            $mutSvc  = $this->dataSyncMutator();
            $results = [];
            foreach ($goneFiles as $row) {
                $results[] = $mutSvc->excludeFile((string)$row['name'], $actor, $cr);
            }
            $this->success([
                'change_ref'    => $cr,
                'excluded_count' => count($results),
                'results'       => $results,
            ]);
        } catch (Throwable $e) {
            $this->mapMutationException($e);
        }
    }

    /**
     * GET admin_local_sync_report
     *
     * Returns the last sync report written by data-sync.sh after completing a
     * pull/push cycle. The report is stored at
     * $PRIVATE_DATA/.local-sync-report.json on the VPS and contains:
     *   ts, actor, conflict_mode, pull_count, push_applied, conflict_count
     *
     * If the file doesn't exist yet (no sync has run since bootstrap), the
     * response contains a "never_synced" flag so the UI can show a hint.
     *
     * @return never
     */
    public function localSyncReport(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $privateDataDir = rtrim((string)(getenv('PRIVATE_DATA') ?: '/var/www/data-private'), '/');
        $reportPath     = $privateDataDir . '/.local-sync-report.json';

        if (!is_file($reportPath)) {
            $this->success(['ok' => true, 'never_synced' => true, 'report' => null]);
        }

        $raw = @file_get_contents($reportPath);
        if ($raw === false) {
            $this->success(['ok' => true, 'never_synced' => true, 'report' => null]);
        }

        $report = json_decode((string)$raw, true);
        if (!is_array($report)) {
            $this->success(['ok' => true, 'never_synced' => true, 'report' => null]);
        }

        $this->success([
            'ok'           => true,
            'never_synced' => false,
            'report'       => [
                'ts'             => (string)($report['ts'] ?? ''),
                'actor'          => (string)($report['actor'] ?? ''),
                'conflict_mode'  => (string)($report['conflict_mode'] ?? ''),
                'pull_count'     => (int)($report['pull_count'] ?? 0),
                'push_applied'   => (bool)($report['push_applied'] ?? false),
                'conflict_count' => (int)($report['conflict_count'] ?? 0),
            ],
        ]);
    }

    /**
     * GET admin_local_sync_control_status
     *
     * Reports whether this API can safely execute the workstation pull-down
     * path. On the production VPS it intentionally returns execution_allowed=false.
     *
     * @return never
     */
    public function localSyncControlStatus(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $target = (string)($this->query('target', 'eqms') ?? 'eqms');
        try {
            $this->success($this->localRuntimeSync()->status($target));
        } catch (Throwable $e) {
            $this->error('local_sync_status_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_local_sync_run
     * Body: { target?, apply_decision_thresholds? }
     *
     * Runs the laptop-side pull-down script only from a local checkout.
     *
     * @return never
     */
    public function localSyncRun(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $target = (string)($body['target'] ?? 'eqms');
        $applyDecisionThresholds = !empty($body['apply_decision_thresholds']);

        try {
            $result = $this->localRuntimeSync()->runPull($target, $applyDecisionThresholds);
            $this->auditLog('admin_local_sync_run', [
                'target' => (string)($result['target'] ?? $target),
                'apply_decision_thresholds' => $applyDecisionThresholds ? '1' : '0',
                'exit_code' => (string)($result['exit_code'] ?? ''),
            ]);
            $this->success($result);
        } catch (Throwable $e) {
            $this->error('local_sync_run_failed', 409, $e->getMessage());
        }
    }

    /**
     * POST admin_local_sync_schedule_set
     * Body: { interval_minutes, enabled, target?, apply_decision_thresholds? }
     *
     * Installs/updates the macOS LaunchAgent that pulls VPS runtime config
     * down to the laptop on a fixed interval.
     *
     * @return never
     */
    public function localSyncScheduleSet(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $intervalMinutes = max(1, min(1440, (int)($body['interval_minutes'] ?? 5)));
        $enabled = (bool)($body['enabled'] ?? false);
        $target = (string)($body['target'] ?? 'eqms');
        $applyDecisionThresholds = array_key_exists('apply_decision_thresholds', $body)
            ? (bool)$body['apply_decision_thresholds']
            : true;

        try {
            $result = $this->localRuntimeSync()->configureSchedule(
                $intervalMinutes,
                $enabled,
                $target,
                $applyDecisionThresholds
            );
            $this->auditLog('admin_local_sync_schedule_set', [
                'target' => (string)($result['target'] ?? $target),
                'enabled' => $enabled ? '1' : '0',
                'interval_minutes' => (string)$intervalMinutes,
                'apply_decision_thresholds' => $applyDecisionThresholds ? '1' : '0',
            ]);
            $this->success($result);
        } catch (Throwable $e) {
            $this->error('local_sync_schedule_failed', 409, $e->getMessage());
        }
    }

    /**
     * GET  admin_sync_schedule_get  — Read auto-sync schedule config.
     * POST admin_sync_schedule_set  — Write schedule (interval_minutes, enabled, last_auto_sync?).
     *
     * Config stored at $PRIVATE_DATA/.sync-schedule.json so it survives deploys.
     * The JS timer in the admin UI reads this and starts/stops setInterval accordingly.
     *
     * @return never
     */
    public function syncScheduleGet(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $path = $this->syncSchedulePath();
        if (!is_file($path)) {
            $this->success(['ok' => true, 'interval_minutes' => 5, 'enabled' => false, 'last_auto_sync' => null]);
        }
        $raw    = (string)(@file_get_contents($path) ?: '{}');
        $config = json_decode($raw, true);
        if (!is_array($config)) {
            $this->success(['ok' => true, 'interval_minutes' => 5, 'enabled' => false, 'last_auto_sync' => null]);
        }
        $this->success([
            'ok'               => true,
            'interval_minutes' => (int)($config['interval_minutes'] ?? 5),
            'enabled'          => (bool)($config['enabled'] ?? false),
            'last_auto_sync'   => isset($config['last_auto_sync']) ? (string)$config['last_auto_sync'] : null,
        ]);
    }

    public function syncScheduleSet(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body            = $this->jsonBody();
        $intervalMinutes = max(1, min(1440, (int)($body['interval_minutes'] ?? 5)));
        $enabled         = (bool)($body['enabled'] ?? false);
        $lastAutoSync    = isset($body['last_auto_sync']) ? (string)$body['last_auto_sync'] : null;

        $config = [
            'interval_minutes' => $intervalMinutes,
            'enabled'          => $enabled,
            'last_auto_sync'   => $lastAutoSync,
            'updated_at'       => (new \DateTime())->format('c'),
            'updated_by'       => (string)($me['username'] ?? 'unknown'),
        ];

        $path = $this->syncSchedulePath();
        $tmp  = $path . '.tmp.' . substr(bin2hex(random_bytes(3)), 0, 6);
        if (file_put_contents($tmp, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false
            || !rename($tmp, $path)) {
            @unlink($tmp);
            $this->error('sync_schedule_write_failed', 500);
        }

        $this->auditLog('admin_sync_schedule_set', [
            'interval_minutes' => $intervalMinutes,
            'enabled'          => $enabled,
        ]);
        $this->success(['ok' => true, 'interval_minutes' => $intervalMinutes, 'enabled' => $enabled]);
    }

    private function syncSchedulePath(): string
    {
        $dir = rtrim((string)(getenv('PRIVATE_DATA') ?: '/var/www/data-private'), '/');
        return $dir . '/.sync-schedule.json';
    }

    private function dataSyncMutator(): DataSyncMutationService
    {
        return new DataSyncMutationService($this->dataDir, $this->data);
    }

    private function versionControlService(): VersionControlService
    {
        return new VersionControlService($this->dataDir, $this->data);
    }

    /**
     * GET admin_version_control_overview
     *
     * Read-only dashboard payload for the Admin → Version Control → Overview
     * sub-tab. Combines drift status, snapshot inventory, and DCC document
     * activity into a single round-trip so the panel renders without N
     * sequential calls. Each section is independently fault-tolerant: a
     * Postgres outage degrades the doc_activity tile but does not break
     * the drift / snapshot tiles.
     *
     * @return never
     */
    public function versionControlOverview(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $syncStatus = [];
        try {
            $syncStatus = (new DataSyncStatusService($this->rootDir, $this->dataDir, $this->data))->status();
        } catch (Throwable $e) {
            $this->auditLog('admin_version_control_overview_sync_failed', ['error' => $e->getMessage()]);
        }

        $snapshots = [];
        try {
            $snapshots = $this->dataSyncMutator()->listSnapshots(60);
        } catch (Throwable $e) {
            $this->auditLog('admin_version_control_overview_snapshots_failed', ['error' => $e->getMessage()]);
        }

        try {
            $payload = $this->versionControlService()->buildOverview(
                is_array($syncStatus) ? $syncStatus : [],
                is_array($snapshots) ? $snapshots : []
            );
            $this->success($payload);
        } catch (Throwable $e) {
            $this->auditLog('admin_version_control_overview_failed', ['error' => $e->getMessage()]);
            $this->error('version_control_overview_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET admin_version_control_doc_history_list ?limit=N&search=STR
     *
     * Returns the docs that have any rows in `dcc_document_revision_history`,
     * ordered by most-recent change first. Drives the "Lịch sử tài liệu"
     * sub-tab listing.
     *
     * @return never
     */
    public function versionControlDocHistoryList(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $limit = max(1, min(500, (int)($this->query('limit', '100') ?? '100')));
        $search = trim((string)($this->query('search', '') ?? ''));
        if (strlen($search) > 80) {
            $search = substr($search, 0, 80);
        }

        try {
            $payload = $this->versionControlService()->listDocsWithHistory($limit, $search);
            $this->success($payload);
        } catch (Throwable $e) {
            $this->auditLog('admin_version_control_doc_history_list_failed', ['error' => $e->getMessage()]);
            $this->error('doc_history_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET admin_version_control_doc_revisions ?doc_code=qms-man-001
     *
     * Returns the full revision history for a single document — the header
     * snapshot, every approved body row from `dcc_document_revision`, and
     * every status transition from `dcc_document_revision_history`. Drives
     * the per-doc drawer in the "Lịch sử tài liệu" sub-tab.
     *
     * @return never
     */
    public function versionControlDocRevisions(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $docCode = trim((string)($this->query('doc_code', '') ?? ''));
        if ($docCode === '') {
            $this->error('invalid_doc_code', 400, 'doc_code query parameter is required');
        }
        if (strlen($docCode) > 80 || !preg_match('/^[A-Za-z0-9._-]+$/', $docCode)) {
            $this->error('invalid_doc_code', 400, 'doc_code must be alphanumeric (with . _ -) and ≤ 80 chars');
        }

        try {
            $payload = $this->versionControlService()->getDocRevisions($docCode);
            $this->success(array_merge(['doc_code' => strtolower($docCode)], $payload));
        } catch (Throwable $e) {
            $this->auditLog('admin_version_control_doc_revisions_failed', [
                'error' => $e->getMessage(),
                'doc_code' => $docCode,
            ]);
            $this->error('doc_revisions_failed', 500, $e->getMessage());
        }
    }

    /**
     * Map RuntimeException codes thrown by DataSyncMutationService into
     * stable HTTP errors the frontend can react to.
     */
    private function mapMutationException(Throwable $e): never
    {
        $msg = $e->getMessage();
        $code = strtok($msg, ':') ?: 'unknown_error';
        $detail = (string)substr($msg, strlen($code) + 1);
        $http = match ($code) {
            'invalid_file', 'invalid_direction', 'invalid_snapshot_id', 'invalid_json', 'empty_content' => 400,
            'file_not_found', 'snapshot_not_found', 'snapshot_has_no_config', 'snapshot_empty', 'source_missing' => 404,
            'file_too_large' => 413,
            'drift_detected', 'file_locked' => 409,
            'mirror_unavailable' => 503,
            'forbidden' => 403,
            default => 500,
        };
        $this->auditLog('admin_data_sync_action_failed', ['code' => $code, 'detail' => $detail]);
        $this->error($code, $http, $detail);
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
     * GET admin_vc_mode_get — Load the admin Version Control Developer/Operation
     * mode policy plus the effective mode resolved for the calling user.
     *
     * Returns:
     *   {
     *     "policy": { "default", "role_overrides", "lock_on_production",
     *                 "updated_at", "runtime_is_production" },
     *     "effective_mode": "developer" | "operation",
     *     "your_roles":     [<role>, ...]
     *   }
     *
     * Any authenticated user may read this — the panel needs the effective
     * mode to decide which buttons to render. Mutation is admin-only.
     */
    public function vcModeGet(): never
    {
        $me = $this->requireAuth();

        $configFile = $this->confDir . '/module_access_config.json';
        $config = module_access_load_config($configFile);
        $roles = $this->rolesForUser($me);
        $effective = admin_vc_mode_resolve_for_roles($config, $roles);

        $this->success([
            'policy' => admin_vc_mode_public_payload($config),
            'effective_mode' => $effective,
            'your_roles' => $roles,
        ]);
    }

    /**
     * POST admin_vc_mode_set — Update the admin VC mode policy.
     *
     * Body:
     *   {
     *     "default":             "developer" | "operation" (optional),
     *     "role_overrides":      { "<role>": "developer"|"operation", ... } (optional),
     *     "lock_on_production":  true | false (optional),
     *     "reason":              "<short audit reason>" (REQUIRED — flows
     *                            into the audit_events row so an auditor can
     *                            see why the policy moved)
     *   }
     *
     * Admin-only. Every change is audited with: old policy, new policy,
     * resolved effective mode for the actor before/after, and the reason.
     * Frontend ALWAYS prompts for `reason`; backend rejects empty strings
     * so a future scripted caller can't bypass the audit trail.
     */
    public function vcModeSet(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) < 4) {
            $this->error('reason_required', 400, 'A reason of at least 4 characters is required for VC mode changes.');
        }
        if (mb_strlen($reason) > 500) {
            $reason = mb_substr($reason, 0, 500);
        }

        $configFile = $this->confDir . '/module_access_config.json';
        $current = module_access_load_config($configFile);
        $oldPolicy = admin_vc_mode_normalize((array)($current['admin_vc_mode'] ?? []));
        $roles = $this->rolesForUser($me);
        $oldEffective = admin_vc_mode_resolve_for_roles($current, $roles);

        // Merge: anything not provided in the request is carried over from
        // the existing policy. This keeps the endpoint convenient for
        // single-field updates (just flip default, just toggle lock) without
        // forcing the UI to send the full document each time.
        $merged = [
            'default' => array_key_exists('default', $body)
                ? $body['default']
                : $oldPolicy['default'],
            'role_overrides' => array_key_exists('role_overrides', $body)
                ? $body['role_overrides']
                : $oldPolicy['role_overrides'],
            'lock_on_production' => array_key_exists('lock_on_production', $body)
                ? $body['lock_on_production']
                : $oldPolicy['lock_on_production'],
        ];
        $newPolicy = admin_vc_mode_normalize($merged);
        $newPolicy['updated_at'] = now_iso();

        // Persist by re-saving the full module_access config with the new
        // vc_mode block merged in. module_access_save_config preserves the
        // portal_modules + admin_tabs blocks from the on-disk file when not
        // present in $config (it falls back to defaults if the key is
        // missing); to avoid resetting access policy we pass them through.
        $toSave = [
            'portal_modules' => $current['portal_modules'],
            'admin_tabs' => $current['admin_tabs'],
            'admin_vc_mode' => $newPolicy,
        ];
        $saved = module_access_save_config($configFile, $toSave);
        $newEffective = admin_vc_mode_resolve_for_roles($saved, $roles);

        $this->auditLog('admin_vc_mode_set', [
            'reason' => $reason,
            'old_policy' => $oldPolicy,
            'new_policy' => $newPolicy,
            'old_effective_mode_for_actor' => $oldEffective,
            'new_effective_mode_for_actor' => $newEffective,
        ]);

        $this->success([
            'policy' => admin_vc_mode_public_payload($saved),
            'effective_mode' => $newEffective,
            'your_roles' => $roles,
        ]);
    }

    /**
     * POST admin_deploy_trigger — Pha 4 (Developer mode only).
     *
     * Records a deploy intent in audit_events. Does NOT actually push code
     * or run the deploy script — that would violate the CLAUDE.md
     * governance rule that PHP-FPM never mutates the git working tree on
     * the VPS. Instead it returns "next steps" so the operator can either
     *   (a) push from their developer laptop, OR
     *   (b) trigger the GitHub Actions workflow manually
     * and the audit row preserves the intent + actor + sha + reason for
     * ISO §8.5.6 traceability.
     *
     * Body:
     *   { target_sha?:   <git sha to deploy (default = current HEAD on VPS)>
     *     reason:        <required, ≥4 chars> }
     *
     * Enforcement (defence in depth):
     *   1. Admin role + CSRF
     *   2. Effective VC mode MUST be 'developer' (fails 409 in Op mode).
     *      Production lock_on_production=true means this is unreachable
     *      on the live VPS regardless of role overrides — by design.
     *
     * Output:
     *   { ok, intent_id, target_sha, gha_workflow_url, next_steps:[...] }
     */
    public function deployTrigger(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $configFile = $this->confDir . '/module_access_config.json';
        $config = module_access_load_config($configFile);
        // Pha 5 freeze gate. 423 Locked is the canonical HTTP status for
        // "the resource is intentionally unavailable" — the FE pill maps it
        // to the red banner without an extra round-trip.
        if (deploy_freeze_is_active($config)) {
            $f = deploy_freeze_normalize((array)($config['deploy_freeze'] ?? []));
            $this->error('deploy_frozen', 423, 'Deploys are currently frozen by ' . ($f['set_by'] ?: 'admin') . ' (ticket=' . ($f['ticket_id'] ?: 'unknown') . '). Reason: ' . ($f['reason'] ?: 'unspecified'));
        }
        $roles = $this->rolesForUser($me);
        $effectiveMode = admin_vc_mode_resolve_for_roles($config, $roles);
        if ($effectiveMode !== 'developer') {
            $this->error('mode_not_developer', 409, 'Effective VC mode is "' . $effectiveMode . '". Use admin_change_request_submit instead, or switch to Developer mode (requires lock_on_production=false on this runtime).');
        }

        $body = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) < 4) {
            $this->error('reason_required', 400, 'A reason of at least 4 characters is required.');
        }
        if (mb_strlen($reason) > 500) $reason = mb_substr($reason, 0, 500);

        $targetSha = trim((string)($body['target_sha'] ?? ''));
        if ($targetSha !== '' && !preg_match('/^[a-f0-9]{7,40}$/i', $targetSha)) {
            $this->error('invalid_sha', 400, 'target_sha must be a hex git SHA (7..40 chars) or empty for HEAD.');
        }

        $intentId = 'DEPLOY-' . date('YmdHis') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
        $ghaWorkflowUrl = 'https://github.com/sanhvo86-hesem/mom/actions/workflows/deploy.yml';

        $this->auditLog('admin_deploy_trigger_intent', [
            'intent_id' => $intentId,
            'target_sha' => $targetSha,
            'reason' => $reason,
            'effective_mode' => $effectiveMode,
            'gha_workflow_url' => $ghaWorkflowUrl,
        ]);

        $this->success([
            'intent_id' => $intentId,
            'target_sha' => $targetSha !== '' ? $targetSha : 'HEAD',
            'gha_workflow_url' => $ghaWorkflowUrl,
            'next_steps' => [
                'Push your local branch to origin/main (if not already there): git push origin main',
                'Trigger or watch the GitHub Actions workflow at: ' . $ghaWorkflowUrl,
                'Or run manually on VPS: ssh eqms \'sudo -n bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh\'',
                'Audit row recorded with intent_id=' . $intentId,
            ],
            'message' => 'Deploy intent recorded. Run one of the next_steps to perform the actual deploy.',
        ]);
    }

    /**
     * POST admin_change_request_submit — Pha 4 (Operation mode flow).
     *
     * Creates a deploy change request in audit_events. The request stays
     * pending until an admin with separation-of-duties (different actor
     * than the submitter) calls admin_change_request_approve.
     *
     * Body:
     *   { target_sha?, reason (required, ≥10 chars for Op),
     *     change_ref? (CR ticket id; auto-generated if absent),
     *     approver_hint? (optional username/role to notify; not enforced server-side) }
     *
     * Allowed in BOTH modes (so an admin in Dev can also use it for
     * audit-friendly deploys) but enforced via change_ref / approval.
     */
    public function changeRequestSubmit(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) < 10) {
            $this->error('reason_required', 400, 'Operation mode requires a reason of at least 10 characters.');
        }
        if (mb_strlen($reason) > 1000) $reason = mb_substr($reason, 0, 1000);

        $targetSha = trim((string)($body['target_sha'] ?? ''));
        if ($targetSha !== '' && !preg_match('/^[a-f0-9]{7,40}$/i', $targetSha)) {
            $this->error('invalid_sha', 400, 'target_sha must be a hex git SHA (7..40 chars) or empty for HEAD.');
        }

        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if ($changeRef === '') {
            $changeRef = 'CR-' . date('YmdHis') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        if (!preg_match('/^[A-Za-z0-9._:-]{3,80}$/', $changeRef)) {
            $this->error('invalid_change_ref', 400, 'change_ref must match [A-Za-z0-9._:-]{3,80}.');
        }

        $approverHint = trim((string)($body['approver_hint'] ?? ''));
        if (mb_strlen($approverHint) > 120) $approverHint = mb_substr($approverHint, 0, 120);

        $this->auditLog('admin_change_request_submit', [
            'change_ref' => $changeRef,
            'target_sha' => $targetSha,
            'reason' => $reason,
            'approver_hint' => $approverHint,
            'submitted_by' => (string)($me['username'] ?? 'unknown'),
            'status' => 'pending_approval',
        ]);

        $this->success([
            'change_ref' => $changeRef,
            'target_sha' => $targetSha !== '' ? $targetSha : 'HEAD',
            'status' => 'pending_approval',
            'submitted_by' => (string)($me['username'] ?? 'unknown'),
            'approver_hint' => $approverHint,
            'next_steps' => [
                'Pending until an admin (different from the submitter) approves via admin_change_request_approve.',
                'Search the timeline for change_ref=' . $changeRef . ' to find the approval row.',
            ],
            'message' => 'Change request ' . $changeRef . ' submitted and pending approval.',
        ]);
    }

    /**
     * POST admin_change_request_approve — Pha 4.
     *
     * Approver decision on a previously-submitted CR. Enforces
     * separation-of-duties: the approver MUST be a different actor than
     * the original submitter. (Tightening to a dedicated 'cr_approver'
     * role is a follow-up — admin_roles() is the gate today.)
     *
     * Body: { change_ref, decision: 'approve'|'reject', reason }
     *
     * Does NOT actually run the deploy on approve — same governance
     * reason as deployTrigger. Returns next_steps + records audit row.
     */
    public function changeRequestApprove(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        // Pha 5 freeze gate. Note: rejection is fine even on 'reject'
        // decisions during freeze — an explicit unfreeze is required first
        // so the audit trail clearly separates the incident close from CR
        // dispositions made afterwards.
        $configFile = $this->confDir . '/module_access_config.json';
        $config = module_access_load_config($configFile);
        if (deploy_freeze_is_active($config)) {
            $f = deploy_freeze_normalize((array)($config['deploy_freeze'] ?? []));
            $this->error('deploy_frozen', 423, 'CR approvals are currently frozen (ticket=' . ($f['ticket_id'] ?: 'unknown') . '). Unfreeze first or wait for expiry.');
        }

        $body = $this->jsonBody();
        $changeRef = trim((string)($body['change_ref'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9._:-]{3,80}$/', $changeRef)) {
            $this->error('invalid_change_ref', 400, 'change_ref required and must match [A-Za-z0-9._:-]{3,80}.');
        }
        $decision = strtolower(trim((string)($body['decision'] ?? '')));
        if (!in_array($decision, ['approve', 'reject'], true)) {
            $this->error('invalid_decision', 400, 'decision must be "approve" or "reject".');
        }
        $reason = trim((string)($body['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) < 4) {
            $this->error('reason_required', 400, 'A reason of at least 4 characters is required.');
        }
        if (mb_strlen($reason) > 1000) $reason = mb_substr($reason, 0, 1000);

        // Look up the most-recent matching submit audit row to enforce
        // separation-of-duties + prevent double-approval.
        try {
            $existing = $this->data->getAuditLog([
                'event_type' => 'admin_change_request_submit',
                'search' => $changeRef,
                'limit' => 50,
            ]);
        } catch (Throwable $e) {
            $this->error('audit_lookup_failed', 500, $e->getMessage());
        }
        $submitRow = null;
        foreach ((is_array($existing) ? $existing : []) as $row) {
            if (!is_array($row)) continue;
            // BaseController->auditLog wraps the context inside payload.context,
            // so the change_ref we passed lives at payload.context.change_ref
            // rather than payload.change_ref. Read through the wrapper.
            $payload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
            $ctx = is_array($payload['context'] ?? null) ? $payload['context'] : $payload;
            if (($ctx['change_ref'] ?? '') === $changeRef) { $submitRow = $row; break; }
        }
        if ($submitRow === null) {
            $this->error('change_ref_not_found', 404, 'No submit row found for change_ref=' . $changeRef);
        }
        $submitter = (string)($submitRow['actor_name'] ?? $submitRow['user'] ?? '');
        $approver = (string)($me['username'] ?? '');
        if ($submitter !== '' && $approver !== '' && strcasecmp($submitter, $approver) === 0) {
            $this->error('self_approval_forbidden', 403, 'You submitted ' . $changeRef . '. A different admin must approve it (separation of duties).');
        }

        // Block double-approve / approve-after-reject by scanning for an
        // existing approve row on the same CR.
        try {
            $prior = $this->data->getAuditLog([
                'event_type' => 'admin_change_request_approve',
                'search' => $changeRef,
                'limit' => 20,
            ]);
        } catch (Throwable $e) {
            $prior = [];
        }
        foreach ((is_array($prior) ? $prior : []) as $row) {
            $payload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
            $ctx = is_array($payload['context'] ?? null) ? $payload['context'] : $payload;
            if (($ctx['change_ref'] ?? '') === $changeRef) {
                $this->error('already_decided', 409, 'change_ref=' . $changeRef . ' already has a decision in audit_events.');
            }
        }

        $this->auditLog('admin_change_request_approve', [
            'change_ref' => $changeRef,
            'decision' => $decision,
            'reason' => $reason,
            'submitter' => $submitter,
            'approver' => $approver,
            'submit_recorded_at' => (string)($submitRow['recorded_at'] ?? ''),
        ]);

        $nextSteps = $decision === 'approve'
            ? [
                'Approval recorded. Run the deploy from the developer laptop or via GHA.',
                'Pass --change-ref ' . $changeRef . ' to data-push.sh if a config sync is part of this CR.',
              ]
            : [
                'Rejection recorded. No further action needed.',
                'Submitter should address the reason and submit a new CR if appropriate.',
              ];

        $this->success([
            'change_ref' => $changeRef,
            'decision' => $decision,
            'submitter' => $submitter,
            'approver' => $approver,
            'next_steps' => $nextSteps,
        ]);
    }

    /**
     * GET admin_change_request_list — Pha 4 helper.
     *
     * Returns the most-recent N change requests with their resolved status
     * by joining submit + approve rows in audit_events. Drives the
     * "Pending change requests" section in Status tab (Op mode).
     */
    public function changeRequestList(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $limit = max(1, min(200, (int)($this->query('limit', '50') ?? '50')));
        try {
            $submits = $this->data->getAuditLog([
                'event_type' => 'admin_change_request_submit',
                'limit' => $limit * 2,
            ]);
            $approves = $this->data->getAuditLog([
                'event_type' => 'admin_change_request_approve',
                'limit' => $limit * 2,
            ]);
        } catch (Throwable $e) {
            $this->error('change_request_list_failed', 500, $e->getMessage());
        }

        // BaseController->auditLog wraps the context under payload.context.
        // Helper to dereference once + read field defensively.
        $ctxOf = static function (array $row): array {
            $p = is_array($row['payload'] ?? null) ? $row['payload'] : [];
            return is_array($p['context'] ?? null) ? $p['context'] : $p;
        };

        $approvalsByCr = [];
        foreach ((is_array($approves) ? $approves : []) as $row) {
            $ctx = $ctxOf($row);
            $cr = (string)($ctx['change_ref'] ?? '');
            if ($cr === '') continue;
            $approvalsByCr[$cr] = [
                'decision' => (string)($ctx['decision'] ?? ''),
                'approver' => (string)($ctx['approver'] ?? ''),
                'reason' => (string)($ctx['reason'] ?? ''),
                'recorded_at' => (string)($row['recorded_at'] ?? ''),
            ];
        }

        $crs = [];
        foreach ((is_array($submits) ? $submits : []) as $row) {
            $ctx = $ctxOf($row);
            $cr = (string)($ctx['change_ref'] ?? '');
            if ($cr === '' || isset($crs[$cr])) continue; // dedupe — latest submit wins (already sorted DESC by getAuditLog)
            $approval = $approvalsByCr[$cr] ?? null;
            $status = $approval === null
                ? 'pending_approval'
                : ($approval['decision'] === 'approve' ? 'approved' : 'rejected');
            $crs[$cr] = [
                'change_ref' => $cr,
                'status' => $status,
                'submitter' => (string)($row['actor_name'] ?? ''),
                'submitted_at' => (string)($row['recorded_at'] ?? ''),
                'target_sha' => (string)($ctx['target_sha'] ?? ''),
                'reason' => (string)($ctx['reason'] ?? ''),
                'approver_hint' => (string)($ctx['approver_hint'] ?? ''),
                'approval' => $approval,
            ];
            if (count($crs) >= $limit) break;
        }

        $this->success([
            'change_requests' => array_values($crs),
            'count' => count($crs),
            'pending_count' => count(array_filter($crs, static fn($c) => $c['status'] === 'pending_approval')),
            'limit' => $limit,
        ]);
    }

    /**
     * GET admin_deploy_freeze_get — Pha 5.
     * Returns current deploy-freeze status. Any authenticated user may read
     * (the header banner needs the value to render).
     */
    public function deployFreezeGet(): never
    {
        $this->requireAuth();
        $configFile = $this->confDir . '/module_access_config.json';
        $config = module_access_load_config($configFile);
        $this->success(['freeze' => deploy_freeze_public_payload($config)]);
    }

    /**
     * POST admin_deploy_freeze_set — Pha 5 emergency switch.
     *
     * Body:
     *   { enabled: bool,
     *     reason: string (required when enabling, ≥10 chars),
     *     ticket_id: string (required when enabling, ≥4 chars; e.g. INC-2026-013),
     *     expires_at?: ISO timestamp (optional auto-expire) }
     *
     * Enforcement:
     *   - Admin role + CSRF
     *   - Disable (enabled=false) only requires reason (any length ≥4) and
     *     ticket_id (the INC ref that closed the freeze, can match the
     *     enable ticket or a new "resolved" one).
     */
    public function deployFreezeSet(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $enabled = (bool)($body['enabled'] ?? false);
        $reason = trim((string)($body['reason'] ?? ''));
        $ticket = trim((string)($body['ticket_id'] ?? ''));
        $expiresAt = trim((string)($body['expires_at'] ?? ''));

        $minReason = $enabled ? 10 : 4;
        if ($reason === '' || mb_strlen($reason) < $minReason) {
            $this->error('reason_required', 400, 'Reason must be ≥' . $minReason . ' characters.');
        }
        if (mb_strlen($reason) > 500) $reason = mb_substr($reason, 0, 500);

        if ($ticket === '' || !preg_match('/^[A-Za-z0-9._:-]{4,80}$/', $ticket)) {
            $this->error('ticket_required', 400, 'ticket_id must match [A-Za-z0-9._:-]{4,80}.');
        }

        if ($expiresAt !== '') {
            $ts = strtotime($expiresAt);
            if ($ts === false) $this->error('invalid_expires_at', 400, 'expires_at must be a valid ISO timestamp.');
            if ($ts < time()) $this->error('expires_at_past', 400, 'expires_at must be in the future.');
            $expiresAt = gmdate('Y-m-d\TH:i:s\Z', $ts);
        }

        $configFile = $this->confDir . '/module_access_config.json';
        $current = module_access_load_config($configFile);
        $oldFreeze = deploy_freeze_normalize((array)($current['deploy_freeze'] ?? []));

        $newFreeze = [
            'enabled' => $enabled,
            'reason' => $reason,
            'ticket_id' => $ticket,
            'set_by' => (string)($me['username'] ?? 'unknown'),
            'set_at' => $enabled ? now_iso() : ($oldFreeze['set_at'] ?? null),
            'expires_at' => $enabled ? ($expiresAt !== '' ? $expiresAt : null) : null,
            'updated_at' => now_iso(),
        ];

        $toSave = [
            'portal_modules' => $current['portal_modules'],
            'admin_tabs' => $current['admin_tabs'],
            'admin_vc_mode' => $current['admin_vc_mode'],
            'deploy_freeze' => $newFreeze,
        ];
        $saved = module_access_save_config($configFile, $toSave);

        $this->auditLog('admin_deploy_freeze_set', [
            'enabled' => $enabled ? '1' : '0',
            'reason' => $reason,
            'ticket_id' => $ticket,
            'expires_at' => $expiresAt,
            'old_enabled' => $oldFreeze['enabled'] ? '1' : '0',
            'old_ticket_id' => $oldFreeze['ticket_id'],
        ]);

        $this->success(['freeze' => deploy_freeze_public_payload($saved)]);
    }

    /**
     * GET admin_gha_workflow_status — Pha 5.
     *
     * Polls GitHub for the last N runs of .github/workflows/deploy.yml so the
     * admin header bar can show "Deploy: ✓ <sha> 2m ago" without the
     * operator having to open GitHub.
     *
     * Requires GITHUB_PAT env var with `actions:read` scope on the repo.
     * When unset, returns status=not_configured with instructions — never a
     * hard 500 (the panel still works without it; just no GHA pill).
     *
     * Result is cached for 30 seconds in mom/data/cache/ to stay under
     * GitHub's API rate limit when multiple admins poll concurrently.
     */
    public function ghaWorkflowStatus(): never
    {
        $this->requireAuth();

        $settings = admin_gha_settings_read();
        $repo = $settings['repo'] ?: (getenv('GITHUB_REPO') ?: 'sanhvo86-hesem/mom');
        $workflow = $settings['workflow'] ?: (getenv('GITHUB_WORKFLOW_FILE') ?: 'deploy.yml');
        // PAT preference order: secrets file (admin UI) → env var (FPM pool conf).
        $pat = $settings['pat'] !== '' ? $settings['pat'] : (string)(getenv('GITHUB_PAT') ?: '');

        if ($pat === '') {
            $this->success([
                'status' => 'not_configured',
                'repo' => $repo,
                'workflow' => $workflow,
                'runs' => [],
                'message' => 'GitHub PAT chưa cấu hình. Vào tab Trạng thái → card "Cài đặt GHA" để nhập, hoặc set env[GITHUB_PAT] trong /etc/php/8.5/fpm/pool.d/mom.conf.',
            ]);
        }

        $cacheFile = $this->dataDir . '/cache/admin-gha-status.json';
        if (is_file($cacheFile)) {
            $age = time() - (int)filemtime($cacheFile);
            if ($age < 30) {
                $cached = @file_get_contents($cacheFile);
                if (is_string($cached)) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        $decoded['cached_age_seconds'] = $age;
                        $this->success($decoded);
                    }
                }
            }
        }

        $url = 'https://api.github.com/repos/' . $repo . '/actions/workflows/' . $workflow . '/runs?per_page=5';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_HTTPHEADER => [
                'Accept: application/vnd.github+json',
                'Authorization: Bearer ' . $pat,
                'X-GitHub-Api-Version: 2022-11-28',
                'User-Agent: HESEM-MOM-Admin/1.0',
            ],
        ]);
        $body = curl_exec($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        // curl_close() is a no-op since PHP 8.0 and emits deprecation
        // warning in PHP 8.5+ (our prod runtime), which the centralised
        // error handler escalates to fatal. PHP GC closes handles on
        // resource destruction automatically.

        if ($http < 200 || $http >= 300 || !is_string($body)) {
            $this->success([
                'status' => 'api_error',
                'repo' => $repo,
                'workflow' => $workflow,
                'http_code' => $http,
                'curl_error' => $err,
                'runs' => [],
                'message' => 'GitHub API returned HTTP ' . $http . ($err !== '' ? ' (' . $err . ')' : ''),
            ]);
        }
        $decoded = json_decode($body, true);
        $runsRaw = is_array($decoded['workflow_runs'] ?? null) ? $decoded['workflow_runs'] : [];

        $runs = [];
        foreach ($runsRaw as $r) {
            if (!is_array($r)) continue;
            $runs[] = [
                'id' => (int)($r['id'] ?? 0),
                'run_number' => (int)($r['run_number'] ?? 0),
                'status' => (string)($r['status'] ?? ''),                 // queued/in_progress/completed
                'conclusion' => (string)($r['conclusion'] ?? ''),         // success/failure/cancelled/skipped
                'head_sha' => substr((string)($r['head_sha'] ?? ''), 0, 12),
                'head_branch' => (string)($r['head_branch'] ?? ''),
                'event' => (string)($r['event'] ?? ''),
                'actor' => (string)($r['triggering_actor']['login'] ?? $r['actor']['login'] ?? ''),
                'created_at' => (string)($r['created_at'] ?? ''),
                'updated_at' => (string)($r['updated_at'] ?? ''),
                'html_url' => (string)($r['html_url'] ?? ''),
            ];
        }

        $latest = $runs[0] ?? null;
        $statusPill = 'unknown';
        if ($latest) {
            if ($latest['status'] !== 'completed') {
                $statusPill = $latest['status']; // queued, in_progress
            } else {
                $statusPill = $latest['conclusion']; // success, failure, cancelled, skipped
            }
        }

        $payload = [
            'status' => 'ok',
            'repo' => $repo,
            'workflow' => $workflow,
            'latest_status_pill' => $statusPill,
            'latest' => $latest,
            'runs' => $runs,
            'fetched_at' => now_iso(),
        ];

        // Best-effort cache; ignore failures (cache miss is fine).
        @mkdir(dirname($cacheFile), 0775, true);
        @file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $this->success($payload);
    }

    /**
     * GET admin_gha_settings_get — return GHA configuration WITHOUT exposing
     * the PAT itself. Frontend gets only a masked preview ("github_pat_11A…last4")
     * + configured-or-not boolean + repo + workflow + last-updated timestamp.
     * Used by the "Cài đặt GHA" card on the Status tab.
     */
    public function ghaSettingsGet(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $settings = admin_gha_settings_read();
        $hasPat = $settings['pat'] !== '';
        $patPreview = '';
        if ($hasPat) {
            $p = $settings['pat'];
            // Show first 12 chars + last 4 for identification, never full value.
            $patPreview = mb_strlen($p) > 18
                ? mb_substr($p, 0, 12) . '…' . mb_substr($p, -4)
                : '****';
        }
        $envPatSet = (string)(getenv('GITHUB_PAT') ?: '') !== '';

        $this->success([
            'configured_via' => $settings['pat'] !== '' ? 'admin_ui' : ($envPatSet ? 'env_var' : null),
            'has_pat' => $hasPat || $envPatSet,
            'pat_preview' => $patPreview,
            'pat_length' => $hasPat ? mb_strlen($settings['pat']) : 0,
            'repo' => $settings['repo'] ?: (getenv('GITHUB_REPO') ?: 'sanhvo86-hesem/mom'),
            'workflow' => $settings['workflow'] ?: (getenv('GITHUB_WORKFLOW_FILE') ?: 'deploy.yml'),
            'updated_at' => $settings['updated_at'],
            'updated_by' => $settings['updated_by'],
            'env_pat_set' => $envPatSet,
        ]);
    }

    /**
     * POST admin_gha_settings_set — write GitHub PAT to /var/www/data-private/
     * secrets/github-pat.txt (chmod 600). PAT is NEVER logged/audited as
     * plaintext; only a sha256 preview goes into audit_events for traceability.
     *
     * Body: { pat: <github_pat_...>, repo?: string, workflow?: string }
     */
    public function ghaSettingsSet(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $body = $this->jsonBody();
        $pat = trim((string)($body['pat'] ?? ''));
        $repo = trim((string)($body['repo'] ?? ''));
        $workflow = trim((string)($body['workflow'] ?? ''));

        if ($pat === '' || mb_strlen($pat) < 20) {
            $this->error('invalid_pat', 400, 'PAT phải có ít nhất 20 ký tự.');
        }
        if (mb_strlen($pat) > 200) {
            $this->error('invalid_pat', 400, 'PAT dài quá 200 ký tự — kiểm tra paste đúng chưa.');
        }
        // GitHub PAT formats: ghp_, github_pat_, gho_, ghs_, ghr_. Accept all.
        if (!preg_match('/^(ghp_|github_pat_|gho_|ghs_|ghr_)[A-Za-z0-9_]+$/', $pat)) {
            $this->error('invalid_pat_format', 400, 'PAT phải bắt đầu bằng ghp_ hoặc github_pat_ (xem https://github.com/settings/personal-access-tokens).');
        }

        if ($repo !== '' && !preg_match('#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repo)) {
            $this->error('invalid_repo', 400, 'repo format owner/name.');
        }
        if ($workflow !== '' && !preg_match('/^[A-Za-z0-9_.-]+\.(yml|yaml)$/', $workflow)) {
            $this->error('invalid_workflow', 400, 'workflow phải là tên file .yml/.yaml.');
        }

        $result = admin_gha_settings_write($pat, $repo, $workflow, (string)($me['username'] ?? 'unknown'));
        if (!$result['ok']) {
            $this->error('write_failed', 500, $result['error']);
        }

        // Invalidate cache so next status fetch uses new PAT.
        @unlink($this->dataDir . '/cache/admin-gha-status.json');

        $this->auditLog('admin_gha_settings_set', [
            'repo' => $result['repo'],
            'workflow' => $result['workflow'],
            'pat_sha256_short' => substr(hash('sha256', $pat), 0, 12),
            'pat_length' => mb_strlen($pat),
        ]);

        // Re-read with masking to return preview to UI.
        $settings = admin_gha_settings_read();
        $this->success([
            'ok' => true,
            'configured_via' => 'admin_ui',
            'has_pat' => true,
            'pat_preview' => mb_substr($pat, 0, 12) . '…' . mb_substr($pat, -4),
            'pat_length' => mb_strlen($pat),
            'repo' => $settings['repo'],
            'workflow' => $settings['workflow'],
            'updated_at' => $settings['updated_at'],
            'updated_by' => $settings['updated_by'],
            'message' => 'GHA PAT đã lưu. Pill Deploy sẽ refresh sau khi cache hết hạn (≤30s).',
        ]);
    }

    /**
     * POST admin_gha_settings_delete — remove the PAT file. Status pill
     * reverts to "not_configured" (or falls back to env var if set).
     */
    public function ghaSettingsDelete(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $result = admin_gha_settings_delete();
        @unlink($this->dataDir . '/cache/admin-gha-status.json');
        $this->auditLog('admin_gha_settings_delete', [
            'existed' => $result['existed'] ? '1' : '0',
        ]);
        $this->success([
            'ok' => true,
            'message' => 'GHA PAT đã xoá.',
            'existed' => $result['existed'],
        ]);
    }

    /**
     * GET admin_version_control_unified_timeline — Pha 3 of the admin VC
     * v2 redesign. Merges three previously-separate streams into a single
     * chronological feed so an operator can answer "what changed in the
     * last hour / who did it / can I roll it back" without context-switching
     * between Snapshots, Doc history, and Audit log tabs.
     *
     * Sources merged (best-effort fan-out — a partial failure on one
     * source returns the other two with a warning, never a hard 500):
     *   1. audit_events            (via DataAccessAdapter::getAuditLog)
     *   2. data-sync snapshots     (via DataSyncMutationService::listSnapshots)
     *   3. dcc_document_body rows  (via VersionControlService::listDocsWithHistory
     *                                — we use the rolled-up doc list because
     *                                pulling every revision body is O(N) per
     *                                doc and not worth it for a feed view)
     *
     * Output envelope per row:
     *   {
     *     id:         "<source>:<key>"          (stable, unique)
     *     ts:         ISO 8601 UTC              (canonical sort key)
     *     type:       "audit" | "snapshot" | "doc_revision"
     *     source:     <table or store name>
     *     actor:      <username or party id>    (best-effort)
     *     summary:    <short human label>
     *     key:        <aggregate identifier>
     *     payload:    <original row, sanitised>
     *     restorable: bool                       (snapshots only, today)
     *   }
     *
     * Query params:
     *   limit       — total rows returned post-merge (1..500, default 100)
     *   types       — comma list filter, e.g. "audit,snapshot"
     *                 (subset of audit|snapshot|doc_revision; default = all)
     *   actor       — substring match on actor (case-insensitive)
     *   search      — substring match on summary or key
     *   since       — ISO date or datetime; drops rows older than this
     */
    public function versionControlUnifiedTimeline(): never
    {
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $limit = max(1, min(500, (int)($this->query('limit', '100') ?? '100')));
        $typesRaw = trim((string)($this->query('types', '') ?? ''));
        $typesAllowed = ['audit', 'snapshot', 'doc_revision'];
        $types = $typesRaw === ''
            ? $typesAllowed
            : array_values(array_intersect($typesAllowed, array_filter(array_map('trim', explode(',', strtolower($typesRaw))))));
        if ($types === []) $types = $typesAllowed;

        $actorFilter = strtolower(trim((string)($this->query('actor', '') ?? '')));
        $searchFilter = strtolower(trim((string)($this->query('search', '') ?? '')));
        $sinceFilter = trim((string)($this->query('since', '') ?? ''));
        if ($sinceFilter !== '') {
            // Accept YYYY-MM-DD or full ISO; normalise to YYYY-MM-DDTHH:MM:SSZ.
            $ts = strtotime($sinceFilter);
            $sinceFilter = $ts ? gmdate('Y-m-d\TH:i:s\Z', $ts) : '';
        }

        $events = [];
        $warnings = [];

        // ── Source 1: audit_events ────────────────────────────────────────
        if (in_array('audit', $types, true)) {
            try {
                // Pull a generous slice from audit and apply the substring
                // filters in PHP after merge — passing actor_name to
                // getAuditLog uses an exact match which would drop "sanh.vo"
                // when the user typed "sanh". since/from is safe to push
                // down because the DB-side comparison is a range, not exact.
                $filters = ['limit' => max($limit, 200)];
                if ($sinceFilter !== '') $filters['from'] = $sinceFilter;
                $filters['exclude_aggregate_types'] = ['runtime_read_model', 'connector_feed', 'runtime_shadow'];
                $auditRows = $this->data->getAuditLog($filters);
                foreach ((is_array($auditRows) ? $auditRows : []) as $row) {
                    if (!is_array($row)) continue;
                    $eventType = (string)($row['event_type'] ?? $row['action'] ?? 'audit_event');
                    $aggType = (string)($row['aggregate_type'] ?? '');
                    $aggId = (string)($row['aggregate_id'] ?? '');
                    $actor = (string)($row['actor_name'] ?? $row['user'] ?? '');
                    $ts = (string)($row['recorded_at'] ?? $row['timestamp'] ?? '');
                    $id = 'audit:' . ($row['id'] ?? md5($ts . '|' . $eventType . '|' . $actor));
                    // Pull the wrapped context payload (BaseController->auditLog
                    // wraps everything under payload.context). If it exists and
                    // contains a change_ref / intent_id / similar identifier,
                    // suffix it into the summary so the substring search picks
                    // it up — without this, a user searching the timeline for
                    // a CR id wouldn't find the audit row it lives in.
                    $rawPayload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
                    $ctx = is_array($rawPayload['context'] ?? null) ? $rawPayload['context'] : $rawPayload;
                    $idHint = '';
                    foreach (['change_ref', 'intent_id', 'cr_id', 'snapshot_id', 'doc_code'] as $hintKey) {
                        if (!empty($ctx[$hintKey]) && is_scalar($ctx[$hintKey])) {
                            $idHint = ' [' . (string)$ctx[$hintKey] . ']';
                            break;
                        }
                    }
                    $events[] = [
                        'id' => $id,
                        'ts' => $ts,
                        'type' => 'audit',
                        'source' => 'audit_events',
                        'actor' => $actor,
                        'summary' => $eventType . ($aggType !== '' ? ' · ' . $aggType : '') . ($aggId !== '' ? '#' . substr($aggId, 0, 12) : '') . $idHint,
                        'key' => $eventType . ($idHint !== '' ? trim($idHint, ' []') : ''),
                        'payload' => [
                            'event_type' => $eventType,
                            'aggregate_type' => $aggType,
                            'aggregate_id' => $aggId,
                            'ip_address' => (string)($row['ip_address'] ?? $row['ip'] ?? ''),
                            'payload' => is_array($row['payload'] ?? null) ? $row['payload'] : [],
                            'metadata' => is_array($row['metadata'] ?? null) ? $row['metadata'] : [],
                        ],
                        'restorable' => false,
                    ];
                }
            } catch (Throwable $e) {
                $warnings[] = ['source' => 'audit_events', 'error' => $e->getMessage()];
            }
        }

        // ── Source 2: data-sync snapshots ─────────────────────────────────
        if (in_array('snapshot', $types, true)) {
            try {
                $snapshots = $this->dataSyncMutator()->listSnapshots(min(60, $limit));
                foreach ((is_array($snapshots) ? $snapshots : []) as $snap) {
                    if (!is_array($snap)) continue;
                    $sid = (string)($snap['id'] ?? '');
                    $ts = (string)($snap['captured_at'] ?? '');
                    $actor = (string)($snap['actor'] ?? '');
                    $reason = trim((string)($snap['reason'] ?? ''));
                    $changeRef = trim((string)($snap['change_ref'] ?? ''));
                    $subset = (string)($snap['subset'] ?? 'config');
                    $fileCount = (int)($snap['file_count'] ?? 0);
                    $events[] = [
                        'id' => 'snapshot:' . $sid,
                        'ts' => $ts,
                        'type' => 'snapshot',
                        'source' => 'data_snapshots',
                        'actor' => $actor,
                        'summary' => 'Snapshot ' . $sid . ($fileCount > 0 ? ' (' . $fileCount . ' files)' : '') . ($reason !== '' ? ' — ' . $reason : ''),
                        'key' => $sid,
                        'payload' => [
                            'snapshot_id' => $sid,
                            'subset' => $subset,
                            'change_ref' => $changeRef,
                            'reason' => $reason,
                            'file_count' => $fileCount,
                        ],
                        'restorable' => true,
                    ];
                }
            } catch (Throwable $e) {
                $warnings[] = ['source' => 'data_snapshots', 'error' => $e->getMessage()];
            }
        }

        // ── Source 3: dcc document revisions ──────────────────────────────
        if (in_array('doc_revision', $types, true)) {
            try {
                // listDocsWithHistory returns docs with last_recorded_at;
                // we collapse each doc into one timeline row using its
                // most-recent header status as the summary.
                $payload = $this->versionControlService()->listDocsWithHistory(min(200, $limit), '');
                $docs = is_array($payload['docs'] ?? null) ? $payload['docs'] : [];
                foreach ($docs as $doc) {
                    if (!is_array($doc)) continue;
                    $code = (string)($doc['doc_code'] ?? '');
                    if ($code === '') continue;
                    $ts = (string)($doc['last_recorded_at'] ?? '');
                    $rev = (string)($doc['header_revision'] ?? $doc['latest_revision'] ?? '');
                    $status = (string)($doc['header_status'] ?? '');
                    $rowCount = (int)($doc['history_rows'] ?? 0);
                    $events[] = [
                        'id' => 'doc:' . $code . ':' . $rev,
                        'ts' => $ts,
                        'type' => 'doc_revision',
                        'source' => 'dcc_document_body',
                        'actor' => '', // doc list doesn't carry actor; per-revision drawer does
                        'summary' => strtoupper($code) . ' rev ' . $rev . ($status !== '' ? ' — ' . $status : '') . ' (' . $rowCount . ' revs)',
                        'key' => $code,
                        'payload' => [
                            'doc_code' => $code,
                            'doc_type' => (string)($doc['doc_type'] ?? ''),
                            'revision' => $rev,
                            'status' => $status,
                            'history_rows' => $rowCount,
                        ],
                        'restorable' => false,
                    ];
                }
            } catch (Throwable $e) {
                $warnings[] = ['source' => 'dcc_document_body', 'error' => $e->getMessage()];
            }
        }

        // ── Apply remaining client-side filters ───────────────────────────
        if ($actorFilter !== '') {
            $events = array_values(array_filter($events, static fn(array $e) =>
                $e['actor'] !== '' && strpos(strtolower($e['actor']), $actorFilter) !== false));
        }
        if ($searchFilter !== '') {
            $events = array_values(array_filter($events, static fn(array $e) =>
                strpos(strtolower($e['summary']), $searchFilter) !== false
                || strpos(strtolower($e['key']), $searchFilter) !== false));
        }
        if ($sinceFilter !== '') {
            $events = array_values(array_filter($events, static fn(array $e) =>
                $e['ts'] !== '' && strcmp($e['ts'], $sinceFilter) >= 0));
        }

        // ── Merge-sort by ts DESC, then cap at limit ──────────────────────
        // ts is always a string per normalizer above (PHPStan correctly
        // points out the ?? '' is redundant — keeping (string) cast for
        // explicitness even though it's a no-op).
        usort($events, static function (array $a, array $b): int {
            return strcmp((string)$b['ts'], (string)$a['ts']);
        });
        if (count($events) > $limit) {
            $events = array_slice($events, 0, $limit);
        }

        $this->success([
            'events' => $events,
            'count' => count($events),
            'limit' => $limit,
            'types_requested' => $types,
            'warnings' => $warnings,
        ]);
    }

    /**
     * Return the list of role slugs held by a user record. Mirrors the
     * lookups in other admin endpoints — pulls .role, .roles[], and
     * .role_list[] as a tolerant union so a user record produced by any
     * historical writer still resolves correctly.
     */
    private function rolesForUser(array $user): array
    {
        $roles = [];
        $push = function ($v) use (&$roles) {
            $r = strtolower(trim((string)$v));
            if ($r !== '' && !in_array($r, $roles, true)) $roles[] = $r;
        };
        if (isset($user['role'])) $push($user['role']);
        foreach ((array)($user['roles'] ?? []) as $r) $push($r);
        foreach ((array)($user['role_list'] ?? []) as $r) $push($r);
        return $roles;
    }

    /**
     * GET admin_decision_thresholds_get — Load decision-threshold authority data.
     *
     * The persisted JSON is the admin-owned source for threshold wording.
     * Publishing back to controlled RACI documents happens only through
     * admin_decision_thresholds_save.
     *
     * @return never
     */
    public function decisionThresholdsGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        try {
            $this->success(['config' => $this->decisionThresholds()->load()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('decision_thresholds_get_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_decision_thresholds_save — Save thresholds and republish RACI docs.
     *
     * This path intentionally rejects Finance/FIN in threshold authority text.
     * CEO is the final approval role and the affected documents receive a
     * revision bump during publication.
     *
     * @return never
     */
    public function decisionThresholdsSave(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        $body = $this->jsonBody();
        $config = $body['config'] ?? null;
        if (!is_array($config)) {
            $this->error('invalid_config', 400, 'Decision threshold config must be an object.');
        }

        try {
            $result = $this->decisionThresholds()->save(
                $config,
                $user,
                trim((string)($body['reason'] ?? ''))
            );
            $mirrorSync = $this->syncDecisionThresholdMirror($user);
            $result['mirror_sync'] = $mirrorSync;
            $docs = is_array($result['updated_documents'] ?? null) ? $result['updated_documents'] : [];
            $this->auditLog('admin_decision_thresholds_save', [
                'document_count' => count($docs),
                'approval_role_code' => 'CEO',
                'finance_role_removed' => 'true',
                'mirror_sync_status' => (string)($mirrorSync['status'] ?? 'unknown'),
            ], (string)($user['username'] ?? 'admin'));
            $this->success($result);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            if ($e->getMessage() === 'decision_threshold_finance_role_blocked') {
                $this->error('decision_threshold_finance_role_blocked', 422, 'Finance/FIN is not allowed in decision-threshold authority. CEO is the final authority.');
            }
            $this->error('decision_thresholds_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * Keep VPS data-private mirror current after the admin threshold editor
     * republishes runtime-owned RACI authority data.
     */
    private function syncDecisionThresholdMirror(array $user): array
    {
        try {
            $actor = (string)($user['username'] ?? 'admin');
            $result = $this->dataSyncMutator()->resolveMirrorDrift(
                'decision_thresholds.json',
                'site_to_mirror',
                $actor,
                'admin_decision_thresholds_save'
            );

            return array_merge(['status' => 'synced'], $result);
        } catch (Throwable $e) {
            $this->auditLog('admin_decision_thresholds_mirror_failed', [
                'file' => 'decision_thresholds.json',
                'error' => $e->getMessage(),
            ], (string)($user['username'] ?? 'admin'));

            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * GET admin_raci_matrix_get — Load the editable RACI gate matrix.
     *
     * @return never
     */
    public function raciMatrixGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        try {
            $this->success(['config' => $this->raciMatrix()->load()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('raci_matrix_get_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_raci_matrix_save — Save the RACI matrix and regenerate the
     * §5 gate-matrix region inside the controlled RACI-MASTER-MATRIX document.
     *
     * @return never
     */
    public function raciMatrixSave(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        $body = $this->jsonBody();
        $config = $body['config'] ?? null;
        if (!is_array($config) || !is_array($config['rows'] ?? null)) {
            $this->error('invalid_config', 400, 'RACI matrix config must be an object with a rows array.');
        }

        try {
            $result = $this->raciMatrix()->save(
                $config,
                $user,
                trim((string)($body['reason'] ?? ''))
            );
            $mirrorSync = $this->syncRaciMatrixMirror($user);
            $result['mirror_sync'] = $mirrorSync;
            $this->auditLog('admin_raci_matrix_save', [
                'row_count' => count($config['rows']),
                'mirror_sync_status' => (string)($mirrorSync['status'] ?? 'unknown'),
            ], (string)($user['username'] ?? 'admin'));
            $this->success($result);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $msg = $e->getMessage();
            if (str_starts_with($msg, 'raci_matrix_invalid_accountable')
                || str_starts_with($msg, 'raci_matrix_missing_responsible')
                || $msg === 'raci_matrix_empty') {
                $this->error('raci_matrix_invalid', 422, 'Vi phạm bất biến RACI (1 chữ A và ít nhất 1 chữ R mỗi dòng): ' . $msg);
            }
            $this->error('raci_matrix_save_failed', 500, $msg);
        }
    }

    /**
     * GET admin_kpi_registry_get — Load the governed KPI catalog for the
     * KPI Admin Console (official, operating, gate, JD, data-contract,
     * counter, retired and integrity views with coverage statistics).
     *
     * @return never
     */
    public function kpiRegistryGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        try {
            $this->success(['config' => $this->kpiRegistryAdmin()->load()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_registry_get_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_kpi_registry_save — Persist Console edits to the KPI runtime
     * overlay and regenerate the §4/§5/§6 marker regions inside ANNEX-122.
     *
     * @return never
     */
    public function kpiRegistrySave(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), ['ceo', 'general_director']))));

        $body = $this->jsonBody();
        $governance = $body['governance_overrides'] ?? [];
        $gate       = $body['gate_overrides'] ?? [];
        $proposed   = $body['proposed_overrides'] ?? [];
        $added      = $body['added_kpis'] ?? [];
        $retired    = $body['retired_codes'] ?? [];
        if (!is_array($governance) || !is_array($gate) || !is_array($proposed)
            || !is_array($added) || !is_array($retired)) {
            $this->error('invalid_config', 400, 'KPI registry save needs override objects.');
        }
        $nonEmptyGroups = static function (array $g): bool {
            foreach ($g as $v) {
                if (is_array($v) && $v !== []) {
                    return true;
                }
            }
            return false;
        };
        if ($governance === [] && $gate === [] && $proposed === []
            && !$nonEmptyGroups($added) && !$nonEmptyGroups($retired)) {
            $this->error('invalid_config', 400, 'No KPI changes supplied to save.');
        }

        try {
            $result = $this->kpiRegistryAdmin()->save(
                [
                    'governance_overrides' => $governance,
                    'gate_overrides'       => $gate,
                    'proposed_overrides'   => $proposed,
                    'added_kpis'           => $added,
                    'retired_codes'        => $retired,
                ],
                $user,
                trim((string)($body['reason'] ?? '')),
            );
            $this->auditLog('admin_kpi_registry_save', [
                'override_count'   => (int)($result['override_count'] ?? 0),
                'added_count'      => (int)($result['added_count'] ?? 0),
                'retired_count'    => (int)($result['retired_count'] ?? 0),
                'annex122_updated' => (bool)($result['annex122_updated'] ?? false),
            ], (string)($user['username'] ?? 'admin'));
            $this->success($result);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $msg = $e->getMessage();
            if (str_starts_with($msg, 'kpi_registry_threshold_incomplete')
                || str_starts_with($msg, 'kpi_registry_reward_without_counter')
                || str_starts_with($msg, 'kpi_registry_duplicate_code')
                || str_starts_with($msg, 'kpi_registry_invalid_cadence')
                || str_starts_with($msg, 'kpi_registry_threshold_order')
                || str_starts_with($msg, 'kpi_registry_added_missing_code')
                || str_starts_with($msg, 'kpi_registry_added_missing_contract')
                || str_starts_with($msg, 'kpi_registry_added_code_conflict')
                || str_starts_with($msg, 'kpi_registry_missing_code')) {
                $this->error('kpi_registry_invalid', 422, 'Vi phạm quy tắc KPI: ' . $msg);
            }
            $this->error('kpi_registry_save_failed', 500, $msg);
        }
    }

    /**
     * Keep the VPS data-private mirror current after the RACI matrix editor
     * republishes runtime-owned data.
     */
    private function syncRaciMatrixMirror(array $user): array
    {
        try {
            $actor = (string)($user['username'] ?? 'admin');
            $result = $this->dataSyncMutator()->resolveMirrorDrift(
                'raci_matrix.json',
                'site_to_mirror',
                $actor,
                'admin_raci_matrix_save'
            );

            return array_merge(['status' => 'synced'], $result);
        } catch (Throwable $e) {
            $this->auditLog('admin_raci_matrix_mirror_failed', [
                'file' => 'raci_matrix.json',
                'error' => $e->getMessage(),
            ], (string)($user['username'] ?? 'admin'));

            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
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

        $limit = max(1, min(1000, (int)($this->query('limit', '500') ?? '500')));
        $filters = ['limit' => $limit];
        foreach (['event_type', 'aggregate_type', 'aggregate_id', 'actor_name', 'search', 'from', 'to'] as $key) {
            $value = trim((string)($this->query($key, '') ?? ''));
            if ($value !== '') {
                $filters[$key] = $value;
            }
        }
        // Exclude system observability events by default (runtime_read_model, connector_feed, runtime_shadow).
        // Admin can opt-in to see these with include_system=1.
        $includeSystem = filter_var($this->query('include_system', '0'), FILTER_VALIDATE_BOOLEAN);
        if (!$includeSystem) {
            $filters['exclude_aggregate_types'] = ['runtime_read_model', 'connector_feed', 'runtime_shadow'];
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
     * POST /api/v1/admin/audit/log — Append a front-end-originated administrative
     * audit event to audit_events. Used by the admin console (UI.audit) to record
     * supplementary actions that do not have their own server endpoint, e.g.
     * "audit.export", "module_permission.toggle.preview", "role.permissions.cell.click".
     *
     * Body: { event_type: string, detail?: object }
     *
     * @return never
     */
    public function logFrontendAuditEvent(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($user);

        $data = $this->jsonBody();
        $eventType = trim((string)($data['event_type'] ?? ''));
        if ($eventType === '') {
            $this->error('missing_event_type', 400);
        }
        // Cap event_type length defensively.
        if (strlen($eventType) > 80) {
            $eventType = substr($eventType, 0, 80);
        }

        // Flatten detail into scalar context for auditLog (it strips non-scalars).
        $detailRaw = $data['detail'] ?? [];
        $context   = ['source' => 'frontend'];
        if (is_array($detailRaw)) {
            foreach ($detailRaw as $k => $v) {
                $key = (string)$k;
                if ($key === '' || strlen($key) > 60) {
                    continue;
                }
                if (is_scalar($v) || $v === null) {
                    $context[$key] = $v === null ? null : (string)$v;
                } elseif (is_array($v)) {
                    $context[$key] = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
            }
        }

        try {
            $this->auditLog('fe.' . $eventType, $context);
            $this->success(['ok' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('audit_log_failed', 500, $e->getMessage());
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
            'model'         => getenv('ANTHROPIC_MODEL') ?: 'claude-sonnet-4-6',
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
            'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
            'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5',
            'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-3-20240307',
        ];

        $model = (string)($body['model'] ?? 'claude-sonnet-4-6');
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
        unset($ch); /* PHP 8.5: curl_close deprecated */

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
