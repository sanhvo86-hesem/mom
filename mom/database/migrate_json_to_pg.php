<?php
/**
 * JSON → PostgreSQL Migration Script
 *
 * Migrates existing JSON-file data into PostgreSQL tables created by
 * migration 082_allocation_lifecycle.sql (and existing 004/005/037 tables).
 *
 * Covers:
 *   - data/allocations/allocation_log.json → allocations + allocation_events
 *   - data/online-forms/entries/<code>.json → form_entries
 *   - data/evidence/vault.json → evidence_vault
 *   - data/evidence/custody.json → evidence_chain_custody
 *   - data/evidence/links.json → evidence_links
 *
 * Usage:
 *   php mom/database/migrate_json_to_pg.php [--dry-run]
 *
 * @package MOM\Database
 * @since   4.0.0
 */

declare(strict_types=1);

// ── Bootstrap ──────────────────────────────────────────────────────────────

$ROOT_DIR = dirname(__DIR__, 2);
$DATA_DIR = $ROOT_DIR . '/mom/data';

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Connection.php';

use MOM\Database\Connection;

$dryRun = in_array('--dry-run', $argv ?? [], true);

$config = require __DIR__ . '/config.php';
if (!($config['use_postgres'] ?? false)) {
    echo "ERROR: USE_POSTGRES is not enabled in config. Set USE_POSTGRES=true.\n";
    exit(1);
}

$db = Connection::getInstance($config);

$stats = [
    'allocations'       => 0,
    'allocation_events' => 0,
    'form_entries'      => 0,
    'evidence_vault'    => 0,
    'evidence_custody'  => 0,
    'evidence_links'    => 0,
    'errors'            => 0,
];

echo "=== JSON → PostgreSQL Migration ===\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no writes)" : "LIVE") . "\n";
echo "Data dir: {$DATA_DIR}\n\n";

// ── Helpers ────────────────────────────────────────────────────────────────

function readJsonFile(string $path): ?array {
    if (!is_file($path)) return null;
    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function mapAllocationStatus(string $status): string {
    return match (strtoupper($status)) {
        'ALLOCATED'   => 'allocated',
        'DOWNLOADED'  => 'in_use',
        'SUBMITTED'   => 'submitted',
        'RECEIVED'    => 'approved',
        'ARCHIVED'    => 'approved',
        'VOIDED'      => 'voided',
        'AUTO-VOIDED' => 'expired',
        'REJECTED'    => 'voided',
        default       => 'allocated',
    };
}

function mapAllocationEventType(string $status): string {
    return match (strtoupper($status)) {
        'ALLOCATED'   => 'allocated',
        'DOWNLOADED'  => 'opened',
        'SUBMITTED'   => 'submitted',
        'RECEIVED'    => 'approved',
        'VOIDED'      => 'voided',
        'AUTO-VOIDED' => 'expired',
        'REJECTED'    => 'rejected',
        default       => 'note_added',
    };
}

function uuidOrGenerate(string $id): string {
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
        return strtolower($id);
    }
    $hash = md5('hesem-migrate:' . $id);
    return substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-4' . substr($hash, 13, 3)
        . '-' . dechex(8 | (hexdec(substr($hash, 16, 1)) & 3)) . substr($hash, 17, 3)
        . '-' . substr($hash, 20, 12);
}

// ── 1. Migrate Allocations ─────────────────────────────────────────────────

echo "--- Allocations ---\n";
$allocFile = $DATA_DIR . '/allocations/allocation_log.json';
$allocations = readJsonFile($allocFile) ?? [];
echo "Found " . count($allocations) . " allocation records.\n";

foreach ($allocations as $alloc) {
    if (!is_array($alloc)) continue;

    $allocId = $alloc['allocation_id'] ?? '';
    $recordId = $alloc['record_id'] ?? '';
    if ($allocId === '' || $recordId === '') continue;

    $parts = explode('-', $recordId);
    $year = (int)($parts[1] ?? date('Y'));
    $seq  = (int)($parts[2] ?? 0);

    $context = json_encode([
        'job_number'     => $alloc['job_number'] ?? null,
        'status_history' => $alloc['status_history'] ?? [],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if (!$dryRun) {
        try {
            $db->execute(
                'INSERT INTO allocations
                    (allocation_id, record_id, record_type, dept_code, fiscal_year, seq,
                     form_code, status, master_context, created_by, created_at, updated_by, updated_at)
                 VALUES
                    (:aid::uuid, :rid, :rtype::record_type_enum, :dept::dept_code, :year, :seq,
                     :form, :status::allocation_status_enum, :ctx::jsonb, :user, :ts::timestamptz, :user2, :ts2::timestamptz)
                 ON CONFLICT (record_id) DO NOTHING',
                [
                    ':aid'    => $allocId,
                    ':rid'    => $recordId,
                    ':rtype'  => strtoupper($alloc['record_type'] ?? 'NCR'),
                    ':dept'   => strtoupper($alloc['department'] ?? 'QA'),
                    ':year'   => $year,
                    ':seq'    => $seq,
                    ':form'   => $alloc['form_code'] ?? null,
                    ':status' => mapAllocationStatus($alloc['status'] ?? 'ALLOCATED'),
                    ':ctx'    => $context,
                    ':user'   => $alloc['requested_by'] ?? 'system',
                    ':ts'     => $alloc['requested_at'] ?? gmdate('c'),
                    ':user2'  => $alloc['requested_by'] ?? 'system',
                    ':ts2'    => $alloc['requested_at'] ?? gmdate('c'),
                ]
            );
            $stats['allocations']++;

            // Insert events from status_history
            foreach ($alloc['status_history'] ?? [] as $hist) {
                if (!is_array($hist)) continue;
                $db->execute(
                    'INSERT INTO allocation_events
                        (allocation_id, event_type, actor, detail, metadata, created_at)
                     VALUES
                        (:aid::uuid, :etype::allocation_event_type, :actor, :detail, :meta::jsonb, :ts::timestamptz)
                     ON CONFLICT DO NOTHING',
                    [
                        ':aid'    => $allocId,
                        ':etype'  => mapAllocationEventType($hist['to'] ?? ''),
                        ':actor'  => $hist['performed_by'] ?? 'system',
                        ':detail' => ($hist['from'] ?? 'null') . ' → ' . ($hist['to'] ?? ''),
                        ':meta'   => json_encode(['reason' => $hist['reason'] ?? null]),
                        ':ts'     => $hist['performed_at'] ?? gmdate('c'),
                    ]
                );
                $stats['allocation_events']++;
            }
        } catch (\Throwable $e) {
            echo "  ERROR migrating allocation {$recordId}: " . $e->getMessage() . "\n";
            $stats['errors']++;
        }
    } else {
        $stats['allocations']++;
    }
}

echo "  Migrated: {$stats['allocations']} allocations, {$stats['allocation_events']} events\n\n";

// ── 2. Migrate Form Entries ────────────────────────────────────────────────

echo "--- Form Entries ---\n";
$entriesBaseDir = $DATA_DIR . '/online-forms/entries';
$entryCount = 0;

if (is_dir($entriesBaseDir)) {
    foreach (scandir($entriesBaseDir) as $file) {
        if (!str_ends_with($file, '.json') || $file === '.' || $file === '..') continue;
        $filePath = $entriesBaseDir . '/' . $file;

        // Skip per-entry subdirectories (handle consolidated files only)
        if (is_dir($filePath)) continue;

        $code = strtoupper(pathinfo($file, PATHINFO_FILENAME));
        $entries = readJsonFile($filePath) ?? [];

        foreach ($entries as $entry) {
            if (!is_array($entry)) continue;
            $entryId = $entry['entry_id'] ?? '';
            if ($entryId === '') continue;

            if (!$dryRun) {
                try {
                    $dataJson = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $uuid = uuidOrGenerate($entryId);

                    $db->execute(
                        'INSERT INTO form_entries
                            (entry_id, form_code, form_version, data, workflow_state, metadata, recorded_at)
                         VALUES
                            (:eid::uuid, :code, 1, :data::jsonb, \'draft\'::workflow_status,
                             :meta::jsonb, :ts::timestamptz)
                         ON CONFLICT (entry_id) DO NOTHING',
                        [
                            ':eid'  => $uuid,
                            ':code' => $code,
                            ':data' => $dataJson,
                            ':meta' => json_encode([
                                'source' => 'json_migration',
                                'original_entry_id' => $entryId,
                            ]),
                            ':ts' => $entry['submitted_at'] ?? gmdate('c'),
                        ]
                    );
                    $entryCount++;
                } catch (\Throwable $e) {
                    echo "  ERROR migrating form entry {$code}/{$entryId}: " . $e->getMessage() . "\n";
                    $stats['errors']++;
                }
            } else {
                $entryCount++;
            }
        }
    }
}

$stats['form_entries'] = $entryCount;
echo "  Migrated: {$entryCount} form entries\n\n";

// ── 3. Migrate Evidence Vault ──────────────────────────────────────────────

echo "--- Evidence Vault ---\n";
$vaultFile = $DATA_DIR . '/evidence/vault.json';
$vault = readJsonFile($vaultFile) ?? [];
echo "Found " . count($vault) . " evidence records.\n";

foreach ($vault as $rec) {
    if (!is_array($rec)) continue;
    $evId = $rec['evidence_id'] ?? '';
    if ($evId === '') continue;

    $validTypes = ['photo', 'document', 'certificate', 'measurement', 'video', 'audio', 'log', 'report', 'other'];
    $evType = strtolower($rec['type'] ?? 'document');
    if (!in_array($evType, $validTypes, true)) $evType = 'document';

    if (!$dryRun) {
        try {
            $meta = json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $db->execute(
                'INSERT INTO evidence_vault
                    (evidence_id, evidence_type, title, description, file_name, file_path,
                     file_hash, mime_type, file_size, chain_hash, chain_sequence,
                     stored_by, metadata)
                 VALUES
                    (:eid::uuid, :etype::evidence_type_enum, :title, :desc, :fname, :fpath,
                     :fhash, :mime, :fsize, :chash, :cseq,
                     :user, :meta::jsonb)
                 ON CONFLICT (evidence_id) DO NOTHING',
                [
                    ':eid'   => $evId,
                    ':etype' => $evType,
                    ':title' => $rec['title'] ?? '',
                    ':desc'  => $rec['description'] ?? '',
                    ':fname' => $rec['filename'] ?? $rec['original_name'] ?? '',
                    ':fpath' => $rec['stored_path'] ?? '',
                    ':fhash' => $rec['file_hash'] ?? '',
                    ':mime'  => $rec['mime_type'] ?? 'application/octet-stream',
                    ':fsize' => (int)($rec['file_size'] ?? 0),
                    ':chash' => $rec['chain_hash'] ?? '',
                    ':cseq'  => (int)($rec['chain_sequence'] ?? 0),
                    ':user'  => $rec['stored_by'] ?? 'system',
                    ':meta'  => $meta,
                ]
            );
            $stats['evidence_vault']++;
        } catch (\Throwable $e) {
            echo "  ERROR migrating evidence {$evId}: " . $e->getMessage() . "\n";
            $stats['errors']++;
        }
    } else {
        $stats['evidence_vault']++;
    }
}

echo "  Migrated: {$stats['evidence_vault']} evidence records\n\n";

// ── 4. Migrate Evidence Custody ────────────────────────────────────────────

echo "--- Evidence Custody ---\n";
$custodyFile = $DATA_DIR . '/evidence/custody.json';
$custody = readJsonFile($custodyFile) ?? [];
echo "Found " . count($custody) . " custody events.\n";

$validActions = ['stored', 'accessed', 'exported', 'transferred', 'sealed', 'released', 'archived'];

foreach ($custody as $evt) {
    if (!is_array($evt)) continue;
    $evtId = $evt['event_id'] ?? '';
    $evId  = $evt['evidence_id'] ?? '';
    if ($evtId === '' || $evId === '') continue;

    $action = strtolower($evt['action'] ?? 'accessed');
    if (!in_array($action, $validActions, true)) $action = 'accessed';

    if (!$dryRun) {
        try {
            $db->execute(
                'INSERT INTO evidence_chain_custody
                    (custody_id, evidence_id, action, actor, reason, created_at)
                 VALUES
                    (:cid::uuid, :eid::uuid, :action::custody_action_enum, :actor, :reason, :ts::timestamptz)
                 ON CONFLICT DO NOTHING',
                [
                    ':cid'    => $evtId,
                    ':eid'    => $evId,
                    ':action' => $action,
                    ':actor'  => $evt['user'] ?? 'system',
                    ':reason' => $evt['reason'] ?? null,
                    ':ts'     => $evt['timestamp'] ?? gmdate('c'),
                ]
            );
            $stats['evidence_custody']++;
        } catch (\Throwable $e) {
            echo "  ERROR migrating custody event {$evtId}: " . $e->getMessage() . "\n";
            $stats['errors']++;
        }
    } else {
        $stats['evidence_custody']++;
    }
}

echo "  Migrated: {$stats['evidence_custody']} custody events\n\n";

// ── 5. Migrate Evidence Links ──────────────────────────────────────────────

echo "--- Evidence Links ---\n";
$linksFile = $DATA_DIR . '/evidence/links.json';
$links = readJsonFile($linksFile) ?? [];
echo "Found " . count($links) . " evidence links.\n";

foreach ($links as $link) {
    if (!is_array($link)) continue;
    $linkId = $link['link_id'] ?? '';
    $evId   = $link['evidence_id'] ?? '';
    if ($linkId === '' || $evId === '') continue;

    if (!$dryRun) {
        try {
            $db->execute(
                'INSERT INTO evidence_links
                    (link_id, evidence_id, entity_type, entity_id, linked_by, note, created_at)
                 VALUES
                    (:lid::uuid, :eid::uuid, :etype, :entityid, :user, :note, :ts::timestamptz)
                 ON CONFLICT DO NOTHING',
                [
                    ':lid'      => $linkId,
                    ':eid'      => $evId,
                    ':etype'    => $link['entity_type'] ?? '',
                    ':entityid' => $link['entity_id'] ?? '',
                    ':user'     => $link['linked_by'] ?? 'system',
                    ':note'     => $link['note'] ?? null,
                    ':ts'       => $link['linked_at'] ?? gmdate('c'),
                ]
            );
            $stats['evidence_links']++;
        } catch (\Throwable $e) {
            echo "  ERROR migrating link {$linkId}: " . $e->getMessage() . "\n";
            $stats['errors']++;
        }
    } else {
        $stats['evidence_links']++;
    }
}

echo "  Migrated: {$stats['evidence_links']} evidence links\n\n";

// ── Summary ────────────────────────────────────────────────────────────────

echo "=== Migration Summary ===\n";
echo "  Allocations:       {$stats['allocations']}\n";
echo "  Allocation Events: {$stats['allocation_events']}\n";
echo "  Form Entries:      {$stats['form_entries']}\n";
echo "  Evidence Vault:    {$stats['evidence_vault']}\n";
echo "  Evidence Custody:  {$stats['evidence_custody']}\n";
echo "  Evidence Links:    {$stats['evidence_links']}\n";
echo "  Errors:            {$stats['errors']}\n";
echo "  Mode:              " . ($dryRun ? "DRY RUN" : "LIVE") . "\n";

if ($stats['errors'] > 0) {
    echo "\nWARNING: {$stats['errors']} errors occurred. Check output above.\n";
    exit(2);
}

echo "\nMigration " . ($dryRun ? "preview" : "completed") . " successfully.\n";
exit(0);
