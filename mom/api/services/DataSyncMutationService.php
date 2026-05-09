<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Write-side counterpart to DataSyncStatusService. Handles every admin action
 * that mutates a runtime config file or its mirror in /var/www/data-private/.
 *
 * Every mutation must:
 *   1. Validate the file basename against the canonical whitelist
 *   2. Snapshot the current bytes into /var/www/data-private/.snapshots/<ts>/
 *   3. Atomically replace the target (tmp file + rename)
 *   4. sha256-verify the post-write content
 *   5. Mirror to /var/www/data-private/config/<file> when site changes
 *   6. Append an audit_events row + an /var/log/qms-data-sync.log line
 *
 * Failure modes returned as RuntimeException with a stable code for the
 * controller to map to an HTTP error.
 *
 * Concurrent admin actions are serialised by a per-file flock on
 * <site_config>/.locks/<file>.lock so two admins cannot race upload/restore
 * on the same file.
 */
final class DataSyncMutationService
{
    // Mirror the whitelist from DataSyncStatusService. audit-runtime-files.php
    // verifies parity at deploy time.
    public const RUNTIME_CONFIG_FILES = [
        'users.json',
        'role_permissions.json',
        'portal_role_docs.json',
        'module_access_config.json',
        'user_doc_overrides.json',
        'docs_custom.json',
        'docs_custom.local.json',
        'docs_visibility.json',
        'doc_descriptions.json',
        'folder_descriptions.json',
        'doc_owner_overrides.json',
        'doc_review_policy.json',
        'record_type_expanded.json',
        'form_control_registry.json',
        'form_builder_formulas.json',
        'so_jo_wo_config.json',
        'portal_display_config.json',
        'data_collection_settings.json',
        'epicor_integration_policy.json',
        'evidence_retention_policy.json',
        'evidence_review_sla_policy.json',
        'ai_config.json',
    ];

    private const MAX_FILE_BYTES   = 5 * 1024 * 1024; // 5 MB
    private const SNAPSHOT_PREFIX  = 'admin-ui-';
    private const SNAPSHOT_KEEP    = 50;

    private string $dataDir;
    private string $privateDataDir;
    private string $syncLogPath;
    private ?DataLayer $data;

    public function __construct(
        string $dataDir,
        ?DataLayer $data = null,
        ?string $privateDataDir = null,
        ?string $syncLogPath = null
    ) {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->privateDataDir = rtrim(str_replace('\\', '/', $privateDataDir
            ?? ((string)(getenv('PRIVATE_DATA') ?: '/var/www/data-private'))), '/');
        $this->syncLogPath = $syncLogPath
            ?? ((string)(getenv('QMS_DATA_SYNC_LOG') ?: '/var/log/qms-data-sync.log'));
        $this->data = $data;
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * @return array{name:string,bytes:string,sha256:string,size:int,mtime:string}
     */
    public function readSiteFile(string $name): array
    {
        $this->assertWhitelisted($name);
        $path = $this->sitePath($name);
        if (!is_file($path)) {
            throw new RuntimeException('file_not_found:' . $name);
        }
        $size = (int)@filesize($path);
        if ($size > self::MAX_FILE_BYTES) {
            throw new RuntimeException('file_too_large:' . $size);
        }
        $bytes = @file_get_contents($path);
        if ($bytes === false) {
            throw new RuntimeException('file_unreadable:' . $name);
        }
        return [
            'name'    => $name,
            'bytes'   => $bytes,
            'sha256'  => hash('sha256', $bytes),
            'size'    => strlen($bytes),
            'mtime'   => gmdate('c', (int)@filemtime($path)),
        ];
    }

    /**
     * Replace the site copy of $name with $contents. If $expectedSha is
     * provided and the on-disk sha doesn't match, abort with drift_detected
     * (caller can show "force overwrite?" prompt).
     *
     * @return array<string,mixed>
     */
    public function uploadFile(
        string $name,
        string $contents,
        ?string $expectedSha,
        string $actor,
        string $changeRef
    ): array {
        $this->assertWhitelisted($name);
        $this->assertJsonValid($contents);
        if (strlen($contents) > self::MAX_FILE_BYTES) {
            throw new RuntimeException('file_too_large:' . strlen($contents));
        }

        $path = $this->sitePath($name);
        $newSha = hash('sha256', $contents);

        return $this->withFileLock($name, function () use ($path, $name, $contents, $newSha, $expectedSha, $actor, $changeRef) {
            // Drift check: only if file currently exists and caller passed a
            // baseline sha.
            $currentSha = is_file($path) ? hash_file('sha256', $path) : null;
            if ($expectedSha !== null && $currentSha !== null && $currentSha !== $expectedSha) {
                throw new RuntimeException('drift_detected:' . $currentSha);
            }
            if ($currentSha === $newSha) {
                return [
                    'unchanged'  => true,
                    'sha256'     => $newSha,
                    'snapshot'   => null,
                ];
            }

            $snapshotId = $this->snapshotSet([$name], 'upload', $actor, $changeRef);
            $this->atomicWrite($path, $contents);

            // sha verify
            $actualSha = hash_file('sha256', $path);
            if ($actualSha !== $newSha) {
                throw new RuntimeException('post_write_sha_mismatch:' . $actualSha);
            }

            // Mirror to data-private
            $mirrorPath = $this->mirrorPath($name);
            $this->ensureMirrorDir();
            $this->atomicWrite($mirrorPath, $contents);

            $this->writeAudit('admin_ui_upload', $name, [
                'actor'       => $actor,
                'change_ref'  => $changeRef,
                'old_sha'     => $currentSha,
                'new_sha'     => $newSha,
                'snapshot_id' => $snapshotId,
            ]);

            return [
                'unchanged'  => false,
                'old_sha256' => $currentSha,
                'new_sha256' => $newSha,
                'snapshot'   => $snapshotId,
            ];
        });
    }

    /**
     * Resolve site/mirror divergence by copying ONE direction over the other.
     * direction ∈ {site_to_mirror, mirror_to_site}
     */
    public function resolveMirrorDrift(
        string $name,
        string $direction,
        string $actor,
        string $changeRef
    ): array {
        $this->assertWhitelisted($name);
        if (!in_array($direction, ['site_to_mirror', 'mirror_to_site'], true)) {
            throw new RuntimeException('invalid_direction:' . $direction);
        }
        $sitePath = $this->sitePath($name);
        $mirrorPath = $this->mirrorPath($name);

        if (!is_dir($this->privateDataDir)) {
            throw new RuntimeException('mirror_unavailable:' . $this->privateDataDir);
        }

        $src = $direction === 'site_to_mirror' ? $sitePath : $mirrorPath;
        $dst = $direction === 'site_to_mirror' ? $mirrorPath : $sitePath;

        if (!is_file($src)) {
            throw new RuntimeException('source_missing:' . basename($src));
        }
        $srcSha = hash_file('sha256', $src);
        $dstSha = is_file($dst) ? hash_file('sha256', $dst) : null;
        if ($srcSha === $dstSha) {
            return ['unchanged' => true, 'sha256' => $srcSha];
        }

        return $this->withFileLock($name, function () use ($name, $src, $dst, $direction, $srcSha, $actor, $changeRef) {
            $snapshotId = $this->snapshotSet([$name], 'mirror_action_' . $direction, $actor, $changeRef);
            $this->ensureMirrorDir();
            $bytes = file_get_contents($src);
            if ($bytes === false) {
                throw new RuntimeException('source_unreadable:' . basename($src));
            }
            $this->atomicWrite($dst, $bytes);
            $verify = hash_file('sha256', $dst);
            if ($verify !== $srcSha) {
                throw new RuntimeException('post_write_sha_mismatch:' . $verify);
            }
            $this->writeAudit('admin_ui_mirror_' . $direction, $name, [
                'actor'       => $actor,
                'change_ref'  => $changeRef,
                'sha256'      => $srcSha,
                'snapshot_id' => $snapshotId,
            ]);
            return ['unchanged' => false, 'direction' => $direction, 'sha256' => $srcSha, 'snapshot' => $snapshotId];
        });
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listSnapshots(int $limit = 30): array
    {
        $dir = $this->privateDataDir . '/.snapshots';
        if (!is_dir($dir) || !is_readable($dir)) {
            return [];
        }
        $entries = @scandir($dir, SCANDIR_SORT_DESCENDING);
        if (!is_array($entries)) {
            return [];
        }
        $out = [];
        foreach ($entries as $e) {
            if ($e === '.' || $e === '..' || !preg_match('/^\d{8}T\d{6}Z(-[a-zA-Z0-9_-]+)?$/', $e)) {
                continue;
            }
            $sub = $dir . '/' . $e;
            $info = ['id' => $e, 'captured_at' => '', 'subset' => '', 'change_ref' => '', 'actor' => '', 'reason' => '', 'file_count' => 0];
            $meta = $sub . '/SNAPSHOT.json';
            if (is_file($meta) && is_readable($meta)) {
                $raw = @file_get_contents($meta);
                if (is_string($raw)) {
                    $j = json_decode($raw, true);
                    if (is_array($j)) {
                        $info['captured_at'] = (string)($j['captured_at'] ?? '');
                        $info['subset']      = (string)($j['subset'] ?? '');
                        $info['change_ref']  = (string)($j['change_ref'] ?? '');
                        $info['actor']       = (string)($j['captured_before_push_by'] ?? $j['actor'] ?? '');
                        $info['reason']      = (string)($j['reason'] ?? '');
                    }
                }
            }
            $configDir = $sub . '/config';
            if (is_dir($configDir)) {
                $info['file_count'] = count(array_filter(scandir($configDir) ?: [], fn($f) => $f !== '.' && $f !== '..'));
            }
            $out[] = $info;
            if (count($out) >= $limit) {
                break;
            }
        }
        return $out;
    }

    public function restoreFromSnapshot(string $snapshotId, ?string $fileName, string $actor, string $changeRef): array
    {
        if (!preg_match('/^\d{8}T\d{6}Z(-[a-zA-Z0-9_-]+)?$/', $snapshotId)) {
            throw new RuntimeException('invalid_snapshot_id:' . $snapshotId);
        }
        $snapDir = $this->privateDataDir . '/.snapshots/' . $snapshotId;
        if (!is_dir($snapDir)) {
            throw new RuntimeException('snapshot_not_found:' . $snapshotId);
        }
        $configDir = $snapDir . '/config';
        if (!is_dir($configDir)) {
            throw new RuntimeException('snapshot_has_no_config:' . $snapshotId);
        }
        $files = $fileName !== null ? [$fileName] : array_values(array_filter(scandir($configDir) ?: [],
            fn($f) => $f !== '.' && $f !== '..' && in_array($f, self::RUNTIME_CONFIG_FILES, true)));
        if ($files === []) {
            throw new RuntimeException('snapshot_empty');
        }
        if ($fileName !== null) {
            $this->assertWhitelisted($fileName);
        }

        $restored = [];
        // Snapshot CURRENT before applying historical snapshot, so user can
        // un-restore.
        $prePost = $this->snapshotSet($files, 'pre_restore_from_' . $snapshotId, $actor, $changeRef);

        foreach ($files as $f) {
            $src = $configDir . '/' . $f;
            $dst = $this->sitePath($f);
            if (!is_file($src)) {
                continue;
            }
            $bytes = file_get_contents($src);
            if ($bytes === false) {
                throw new RuntimeException('snapshot_read_failed:' . $f);
            }
            $expectedSha = hash('sha256', $bytes);
            $this->withFileLock($f, function () use ($dst, $bytes, $expectedSha, $f) {
                $this->atomicWrite($dst, $bytes);
                $actual = hash_file('sha256', $dst);
                if ($actual !== $expectedSha) {
                    throw new RuntimeException('post_write_sha_mismatch:' . $f);
                }
                $this->ensureMirrorDir();
                $this->atomicWrite($this->mirrorPath($f), $bytes);
            });
            $restored[] = ['name' => $f, 'sha256' => $expectedSha];
        }
        $this->writeAudit('admin_ui_restore', $snapshotId, [
            'actor'       => $actor,
            'change_ref'  => $changeRef,
            'snapshot_id' => $snapshotId,
            'pre_restore_snapshot' => $prePost,
            'restored'    => $restored,
        ]);
        return ['snapshot' => $snapshotId, 'pre_restore_snapshot' => $prePost, 'restored' => $restored];
    }

    /**
     * Read content from BOTH site and mirror pools for a single file.
     * Used by the admin diff-viewer: shows what differs before resolving.
     *
     * @return array{name:string, site:array<string,mixed>|null, mirror:array<string,mixed>|null}
     */
    public function readBothFiles(string $name): array
    {
        $this->assertWhitelisted($name);
        $sitePath   = $this->sitePath($name);
        $mirrorPath = $this->mirrorPath($name);

        $read = function (string $path): ?array {
            if (!is_file($path) || !is_readable($path)) {
                return null;
            }
            $size = (int)@filesize($path);
            if ($size > self::MAX_FILE_BYTES) {
                return ['error' => 'file_too_large', 'size' => $size];
            }
            $bytes = @file_get_contents($path);
            if ($bytes === false) {
                return ['error' => 'file_unreadable'];
            }
            return [
                'bytes'  => $bytes,
                'size'   => strlen($bytes),
                'sha256' => hash('sha256', $bytes),
                'mtime'  => gmdate('c', (int)@filemtime($path)),
            ];
        };

        return [
            'name'   => $name,
            'site'   => $read($sitePath),
            'mirror' => $read($mirrorPath),
        ];
    }

    /**
     * Batch-resolve drift/missing for multiple files in one direction.
     *
     * scope:
     *   'drift'     – files where both pools exist but sha differs
     *   'no_mirror' – files present on site but mirror absent (seed mirror)
     *   'absent'    – files absent on site but mirror present (restore VPS)
     *   'all'       – all of the above that make sense for the given direction
     *
     * Returns per-file results (ok/skipped/error) plus a snapshot id that
     * covers every file touched.
     *
     * @return array<string,mixed>
     */
    public function batchResolveDrift(
        string $direction,
        string $scope,
        string $actor,
        string $changeRef
    ): array {
        if (!in_array($direction, ['site_to_mirror', 'mirror_to_site'], true)) {
            throw new RuntimeException('invalid_direction:' . $direction);
        }
        if (!in_array($scope, ['drift', 'no_mirror', 'absent', 'all'], true)) {
            throw new RuntimeException('invalid_scope:' . $scope);
        }
        if (!is_dir($this->privateDataDir)) {
            throw new RuntimeException('mirror_unavailable:' . $this->privateDataDir);
        }

        // Collect candidate files
        $candidates = [];
        foreach (self::RUNTIME_CONFIG_FILES as $name) {
            $sitePath   = $this->sitePath($name);
            $mirrorPath = $this->mirrorPath($name);
            $siteExists   = is_file($sitePath);
            $mirrorExists = is_file($mirrorPath);

            if ($scope === 'drift' || $scope === 'all') {
                // Both present but sha differs → resolve
                if ($siteExists && $mirrorExists) {
                    $ss = @hash_file('sha256', $sitePath);
                    $ms = @hash_file('sha256', $mirrorPath);
                    if ($ss !== false && $ms !== false && $ss !== $ms) {
                        $candidates[] = ['name' => $name, 'reason' => 'drift'];
                        continue;
                    }
                }
            }
            if ($scope === 'no_mirror' || $scope === 'all') {
                // Site present, mirror absent → seed mirror (only makes sense site_to_mirror)
                if ($siteExists && !$mirrorExists && $direction === 'site_to_mirror') {
                    $candidates[] = ['name' => $name, 'reason' => 'no_mirror'];
                    continue;
                }
            }
            if ($scope === 'absent' || $scope === 'all') {
                // Site absent, mirror present → restore VPS (only makes sense mirror_to_site)
                if (!$siteExists && $mirrorExists && $direction === 'mirror_to_site') {
                    $candidates[] = ['name' => $name, 'reason' => 'absent'];
                    continue;
                }
            }
        }

        if (empty($candidates)) {
            return ['resolved' => [], 'skipped' => 0, 'snapshot' => null, 'total_candidates' => 0];
        }

        // Pre-flight snapshot covering all candidate files
        $names = array_column($candidates, 'name');
        $snapshotId = $this->snapshotSet($names, 'batch_' . $direction . '_' . $scope, $actor, $changeRef);

        $results = [];
        $this->ensureMirrorDir();

        foreach ($candidates as $c) {
            $name = $c['name'];
            try {
                $result = $this->withFileLock($name, function () use ($name, $direction) {
                    $sitePath   = $this->sitePath($name);
                    $mirrorPath = $this->mirrorPath($name);
                    $src = $direction === 'site_to_mirror' ? $sitePath : $mirrorPath;
                    $dst = $direction === 'site_to_mirror' ? $mirrorPath : $sitePath;
                    if (!is_file($src)) {
                        return ['status' => 'skipped', 'reason' => 'source_missing'];
                    }
                    $bytes = @file_get_contents($src);
                    if ($bytes === false) {
                        return ['status' => 'error', 'reason' => 'source_unreadable'];
                    }
                    $srcSha = hash('sha256', $bytes);
                    $dstSha = is_file($dst) ? @hash_file('sha256', $dst) : null;
                    if ($srcSha === $dstSha) {
                        return ['status' => 'skipped', 'reason' => 'already_in_sync'];
                    }
                    $this->atomicWrite($dst, $bytes);
                    $verify = @hash_file('sha256', $dst);
                    if ($verify !== $srcSha) {
                        return ['status' => 'error', 'reason' => 'post_write_sha_mismatch'];
                    }
                    return ['status' => 'ok', 'sha256' => $srcSha];
                });
                $results[] = array_merge(['name' => $name, 'scope_reason' => $c['reason']], $result);
            } catch (\Throwable $e) {
                $results[] = ['name' => $name, 'scope_reason' => $c['reason'], 'status' => 'error', 'reason' => $e->getMessage()];
            }
        }

        $ok = array_filter($results, fn($r) => $r['status'] === 'ok');
        $this->writeAudit('admin_ui_batch_' . $direction, $scope, [
            'actor'       => $actor,
            'change_ref'  => $changeRef,
            'scope'       => $scope,
            'snapshot_id' => $snapshotId,
            'resolved'    => count($ok),
            'total'       => count($candidates),
        ]);

        return [
            'resolved'         => $results,
            'snapshot'         => $snapshotId,
            'total_candidates' => count($candidates),
            'ok_count'         => count($ok),
        ];
    }

    /**
     * Take a manual snapshot of the current site state for the given files.
     */
    public function takeManualSnapshot(?array $names, string $actor, string $reason): array
    {
        $names = $names ?: self::RUNTIME_CONFIG_FILES;
        foreach ($names as $n) {
            $this->assertWhitelisted($n);
        }
        $snap = $this->snapshotSet($names, 'manual_' . $reason, $actor, $reason);
        $this->writeAudit('admin_ui_snapshot_manual', $snap, [
            'actor' => $actor, 'reason' => $reason, 'files' => $names,
        ]);
        return ['snapshot' => $snap];
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function sitePath(string $name): string
    {
        return $this->dataDir . '/config/' . $name;
    }

    private function mirrorPath(string $name): string
    {
        return $this->privateDataDir . '/config/' . $name;
    }

    private function ensureMirrorDir(): void
    {
        $dir = $this->privateDataDir . '/config';
        if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException('mirror_dir_uncreatable:' . $dir);
        }
    }

    private function assertWhitelisted(string $name): void
    {
        if (!in_array($name, self::RUNTIME_CONFIG_FILES, true)) {
            throw new RuntimeException('invalid_file:' . $name);
        }
        // Path traversal belt-and-suspenders.
        if (str_contains($name, '/') || str_contains($name, '\\') || str_starts_with($name, '.')) {
            throw new RuntimeException('invalid_file:' . $name);
        }
    }

    private function assertJsonValid(string $contents): void
    {
        if ($contents === '') {
            throw new RuntimeException('empty_content');
        }
        $decoded = json_decode($contents, true);
        if ($decoded === null && strtolower(trim($contents)) !== 'null') {
            throw new RuntimeException('invalid_json:' . json_last_error_msg());
        }
    }

    private function atomicWrite(string $path, string $contents): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('dir_uncreatable:' . $dir);
        }
        $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
        $written = @file_put_contents($tmp, $contents, LOCK_EX);
        if ($written === false || $written !== strlen($contents)) {
            @unlink($tmp);
            throw new RuntimeException('write_failed:' . basename($path));
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('rename_failed:' . basename($path));
        }
        @chmod($path, 0664);
    }

    /**
     * @template T
     * @param callable():T $fn
     * @return T
     */
    private function withFileLock(string $name, callable $fn)
    {
        $locksDir = $this->dataDir . '/config/.locks';
        if (!is_dir($locksDir) && !@mkdir($locksDir, 0775, true) && !is_dir($locksDir)) {
            // Lock dir uncreatable — degrade gracefully (no concurrency
            // protection) rather than blocking the operation.
            return $fn();
        }
        $lockFile = $locksDir . '/' . $name . '.lock';
        $fp = @fopen($lockFile, 'c+');
        if (!is_resource($fp)) {
            return $fn();
        }
        try {
            if (!@flock($fp, LOCK_EX | LOCK_NB)) {
                throw new RuntimeException('file_locked:' . $name);
            }
            return $fn();
        } finally {
            @flock($fp, LOCK_UN);
            @fclose($fp);
        }
    }

    /**
     * Snapshot the listed site files into
     * /var/www/data-private/.snapshots/<ts>/config/<file>
     * Returns the snapshot id.
     *
     * @param list<string> $names
     */
    private function snapshotSet(array $names, string $reason, string $actor, string $changeRef): string
    {
        $id = gmdate('Ymd\THis\Z') . '-' . self::SNAPSHOT_PREFIX . substr(bin2hex(random_bytes(2)), 0, 4);
        $base = $this->privateDataDir . '/.snapshots/' . $id;
        if (!@mkdir($base . '/config', 0750, true) && !is_dir($base . '/config')) {
            throw new RuntimeException('snapshot_dir_uncreatable:' . $base);
        }
        foreach ($names as $n) {
            $sp = $this->sitePath($n);
            if (is_file($sp)) {
                @copy($sp, $base . '/config/' . $n);
            }
        }
        $meta = [
            'snapshot_id'             => $id,
            'subset'                  => 'config',
            'captured_before_push_by' => $actor,
            'change_ref'              => $changeRef,
            'captured_at'             => gmdate('c'),
            'reason'                  => $reason,
            'vps_root'                => $this->privateDataDir,
            'files'                   => $names,
        ];
        @file_put_contents($base . '/SNAPSHOT.json', json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->pruneSnapshots();
        return $id;
    }

    private function pruneSnapshots(): void
    {
        $dir = $this->privateDataDir . '/.snapshots';
        if (!is_dir($dir)) {
            return;
        }
        $entries = @scandir($dir, SCANDIR_SORT_DESCENDING) ?: [];
        $valid = array_values(array_filter($entries,
            fn($e) => $e !== '.' && $e !== '..' && preg_match('/^\d{8}T\d{6}Z/', $e)));
        $stale = array_slice($valid, self::SNAPSHOT_KEEP);
        foreach ($stale as $s) {
            $p = $dir . '/' . $s;
            $this->rmTree($p);
        }
    }

    private function rmTree(string $path): void
    {
        if (!is_dir($path)) {
            @unlink($path);
            return;
        }
        foreach (scandir($path) ?: [] as $e) {
            if ($e === '.' || $e === '..') continue;
            $this->rmTree($path . '/' . $e);
        }
        @rmdir($path);
    }

    private function writeAudit(string $event, string $aggregateId, array $payload): void
    {
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($this->data !== null) {
            try {
                $this->data->execute(
                    "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, recorded_at)
                     VALUES (:et, 'data_private', :ag, :ac, CAST(:pl AS jsonb), NOW())",
                    [':et' => $event, ':ag' => $aggregateId, ':ac' => (string)($payload['actor'] ?? ''), ':pl' => $payloadJson]
                );
            } catch (\Throwable $e) {
                // Non-fatal — flat-file fallback below.
            }
        }
        $line = sprintf("%s [%s] %s aggregate=%s actor=%s payload=%s\n",
            gmdate('c'), strtoupper($event), 'admin_ui',
            $aggregateId, (string)($payload['actor'] ?? ''), $payloadJson);
        @file_put_contents($this->syncLogPath, $line, FILE_APPEND | LOCK_EX);
    }
}
