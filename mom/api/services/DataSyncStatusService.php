<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;

/**
 * Read-only introspection of the runtime-config "two-pool" bridge:
 *
 *   - Site copy under  mom/data/config/<file>          (PHP-FPM reads/writes here)
 *   - VPS mirror under /var/www/data-private/config/   (preserved across deploys)
 *   - Snapshots under  /var/www/data-private/.snapshots/<ts>/  (data-push.sh evidence)
 *   - Sync log         /var/log/qms-data-sync.log              (append-only audit)
 *   - DB rows          audit_events WHERE event_type = 'data_push'
 *
 * The portal never invokes data-sync.sh from PHP — that script must run on the
 * developer workstation. This service just exposes "what does the VPS pool
 * currently look like and when was it last touched" so the admin console can
 * surface it next to the git/deploy status.
 *
 * Source list of runtime files is intentionally duplicated from
 * tools/vps-setup/scripts/_runtime-files.sh — keep them aligned by hand.
 */
final class DataSyncStatusService
{
    // Keep this list in sync with tools/vps-setup/scripts/_runtime-files.sh.
    // tools/vps-setup/scripts/audit-runtime-files.php verifies parity.
    private const RUNTIME_CONFIG_FILES = [
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

    private string $dataDir;
    private string $privateDataDir;
    private string $syncLogPath;
    private ?DataLayer $data;

    public function __construct(
        string $rootDir,
        string $dataDir,
        ?DataLayer $data = null,
        ?string $privateDataDir = null,
        ?string $syncLogPath = null
    ) {
        // $rootDir is part of the controller wiring contract (BaseController
        // hands it to every service) but this read-only introspection service
        // does not need it. Discard explicitly so phpstan stops flagging it.
        unset($rootDir);
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->privateDataDir = rtrim(str_replace('\\', '/', $privateDataDir
            ?? ((string)(getenv('PRIVATE_DATA') ?: '/var/www/data-private'))), '/');
        $this->syncLogPath = $syncLogPath
            ?? ((string)(getenv('QMS_DATA_SYNC_LOG') ?: '/var/log/qms-data-sync.log'));
        $this->data = $data;
    }

    /**
     * @return array<string,mixed>
     */
    public function status(): array
    {
        return [
            'private_data_dir'     => $this->privateDataDir,
            'private_data_present' => is_dir($this->privateDataDir),
            'config_files'         => $this->collectConfigFiles(),
            'snapshots'            => $this->collectSnapshotSummary(),
            'sync_log'             => $this->collectSyncLogTail(),
            'audit_events_recent'  => $this->collectRecentAuditEvents(),
            'runtime_files_count'  => count(self::RUNTIME_CONFIG_FILES),
            'docs'                 => [
                'how_to_sync'  => 'Run on your laptop: bash tools/vps-setup/scripts/data-sync.sh',
                'check_only'   => 'bash tools/vps-setup/scripts/data-sync.sh --check-only',
                'pull_only'    => 'bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes',
                'push_only'    => 'bash tools/vps-setup/scripts/data-sync.sh --push-only --yes --change-ref <CR>',
                'readme'       => 'tools/vps-setup/README-DATA-SYNC.md',
            ],
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function collectConfigFiles(): array
    {
        $rows = [];
        foreach (self::RUNTIME_CONFIG_FILES as $name) {
            $sitePath    = $this->dataDir . '/config/' . $name;
            $privatePath = $this->privateDataDir . '/config/' . $name;

            $siteHash    = $this->hashFileShort($sitePath);
            $privateHash = $this->hashFileShort($privatePath);

            $rows[] = [
                'name'                 => $name,
                'site_relative_path'   => 'mom/data/config/' . $name,
                'site_present'         => is_file($sitePath),
                'site_size'            => is_file($sitePath) ? (int)@filesize($sitePath) : 0,
                'site_mtime'           => is_file($sitePath) ? gmdate('c', (int)@filemtime($sitePath)) : '',
                'site_sha256_short'    => $siteHash,
                'private_present'      => is_file($privatePath),
                'private_size'         => is_file($privatePath) ? (int)@filesize($privatePath) : 0,
                'private_mtime'        => is_file($privatePath) ? gmdate('c', (int)@filemtime($privatePath)) : '',
                'private_sha256_short' => $privateHash,
                // True iff site equals private mirror. False is the interesting state:
                // it usually means deploy.sh restored from one source while the other
                // was edited, or the mirror was never seeded.
                'in_sync_with_mirror'  => $siteHash !== '' && $siteHash === $privateHash,
            ];
        }
        return $rows;
    }

    /**
     * @return array<string,mixed>
     */
    private function collectSnapshotSummary(): array
    {
        $dir = $this->privateDataDir . '/.snapshots';
        $out = [
            'dir'      => $dir,
            'readable' => is_dir($dir) && is_readable($dir),
            'count'    => 0,
            'latest'   => null,
        ];
        if (!$out['readable']) {
            return $out;
        }
        $entries = @scandir($dir, SCANDIR_SORT_DESCENDING);
        if (!is_array($entries)) {
            return $out;
        }
        $valid = [];
        foreach ($entries as $e) {
            if ($e === '.' || $e === '..') {
                continue;
            }
            // Snapshot timestamps are always 20YYMMDDTHHMMSSZ.
            if (!preg_match('/^\d{8}T\d{6}Z$/', $e)) {
                continue;
            }
            $valid[] = $e;
        }
        $out['count'] = count($valid);
        if ($out['count'] > 0) {
            $latest = $valid[0]; // already DESC sorted
            $meta = $dir . '/' . $latest . '/SNAPSHOT.json';
            $info = ['id' => $latest, 'captured_at' => '', 'subset' => '', 'change_ref' => '', 'actor' => ''];
            if (is_file($meta) && is_readable($meta)) {
                $raw = @file_get_contents($meta);
                if (is_string($raw)) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $info['captured_at'] = (string)($decoded['captured_at'] ?? '');
                        $info['subset']      = (string)($decoded['subset'] ?? '');
                        $info['change_ref']  = (string)($decoded['change_ref'] ?? '');
                        $info['actor']       = (string)($decoded['captured_before_push_by'] ?? '');
                    }
                }
            }
            $out['latest'] = $info;
        }
        return $out;
    }

    /**
     * @return array<string,mixed>
     */
    private function collectSyncLogTail(int $maxLines = 12): array
    {
        $path = $this->syncLogPath;
        $out = [
            'path'     => $path,
            'readable' => is_file($path) && is_readable($path),
            'tail'     => [],
        ];
        if (!$out['readable']) {
            return $out;
        }
        $size = (int)@filesize($path);
        if ($size <= 0) {
            return $out;
        }
        // Tail: read the last 16 KB and split by newline. Avoids slurping a
        // potentially large rotated log into memory.
        $window = min($size, 16384);
        $fh = @fopen($path, 'rb');
        if (!is_resource($fh)) {
            return $out;
        }
        @fseek($fh, -$window, SEEK_END);
        $buffer = (string)@stream_get_contents($fh);
        @fclose($fh);
        if ($buffer === '') {
            return $out;
        }
        $lines = preg_split("/\r?\n/", trim($buffer)) ?: [];
        $out['tail'] = array_slice($lines, -$maxLines);
        return $out;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function collectRecentAuditEvents(int $limit = 5): array
    {
        if ($this->data === null) {
            return [];
        }
        try {
            $rows = $this->data->query(
                "SELECT recorded_at, actor_name, aggregate_id AS subset, payload
                 FROM audit_events
                 WHERE event_type = 'data_push'
                 ORDER BY recorded_at DESC
                 LIMIT " . max(1, min(50, (int)$limit)),
                []
            );
        } catch (\Throwable $e) {
            // Audit table absent (early bootstrap) or DB unreachable — non-fatal.
            return [];
        }
        $out = [];
        foreach ($rows ?? [] as $row) {
            $payload = $row['payload'] ?? null;
            if (is_string($payload)) {
                $decoded = json_decode($payload, true);
                $payload = is_array($decoded) ? $decoded : [];
            } elseif (!is_array($payload)) {
                $payload = [];
            }
            $out[] = [
                'recorded_at' => (string)($row['recorded_at'] ?? ''),
                'actor'       => (string)($row['actor_name'] ?? ''),
                'subset'      => (string)($row['subset'] ?? ''),
                'change_ref'  => (string)($payload['change_ref'] ?? ''),
                'snapshot_id' => (string)($payload['snapshot_id'] ?? ''),
            ];
        }
        return $out;
    }

    private function hashFileShort(string $path): string
    {
        if (!is_file($path) || !is_readable($path)) {
            return '';
        }
        $full = @hash_file('sha256', $path);
        return is_string($full) ? substr($full, 0, 12) : '';
    }
}
