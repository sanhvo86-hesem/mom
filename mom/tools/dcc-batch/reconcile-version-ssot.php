<?php

declare(strict_types=1);

/**
 * DCC Version SSOT Reconciler
 * ===========================
 *
 * Repairs drift between the canonical DCC version-control tables and the
 * legacy document workflow caches:
 *
 *   1. dcc_document_revision.is_current is the released-body authority.
 *   2. dcc_document_header is the current header projection.
 *   3. *_manifest.json, *_state.json, and static HTML DCC bootstrap are
 *      compatibility caches and are rewritten from the DCC authority.
 *
 * When no released DCC body exists and the header is still draft/in_review,
 * the legacy approved manifest is treated as the compatibility authority once
 * to repair DCC, then DCC is mirrored back to every cache. This prevents draft
 * header leaks from becoming current truth.
 *
 * Usage:
 *   php mom/tools/dcc-batch/reconcile-version-ssot.php --dry-run
 *   php mom/tools/dcc-batch/reconcile-version-ssot.php --filter-prefix=QMS
 *   php mom/tools/dcc-batch/reconcile-version-ssot.php --json
 */

require __DIR__ . '/lib.php';
require __DIR__ . '/../../vendor/autoload.php';

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentControlService;
use function MOM\Tools\DccBatch\build_data_layer;
use function MOM\Tools\DccBatch\code_from_filename;
use function MOM\Tools\DccBatch\code_from_filename_loose;
use function MOM\Tools\DccBatch\doc_type_from_code;
use function MOM\Tools\DccBatch\is_html_path;
use function MOM\Tools\DccBatch\walk_docs;

$ROOT_DIR = realpath(__DIR__ . '/../../..');
if ($ROOT_DIR === false) {
    fwrite(STDERR, "[version-ssot] cannot resolve repo root\n");
    exit(1);
}

$opts = parse_args($argv);
$dl = build_data_layer($ROOT_DIR);
if (!$dl) {
    fwrite(STDERR, "[version-ssot] DB unavailable; aborting.\n");
    exit(1);
}
$svc = new DocumentControlService($dl);

$docPaths = build_doc_path_map($ROOT_DIR);
$headers = load_headers($dl);
$revisions = load_revisions($dl);

$stats = [
    'inspected' => 0,
    'authority_from_dcc_revision' => 0,
    'authority_from_header' => 0,
    'authority_from_legacy' => 0,
    'header_repaired' => 0,
    'revision_inserted' => 0,
    'manifest_written' => 0,
    'state_written' => 0,
    'html_written' => 0,
    'skipped_no_path' => 0,
    'skipped_no_authority' => 0,
    'warnings' => 0,
    'errors' => 0,
];
$details = [];

$codes = array_unique(array_merge(array_keys($headers), array_keys($docPaths)));
sort($codes, SORT_STRING);

foreach ($codes as $code) {
    if ($opts['filter_prefix'] !== '' && !str_starts_with($code, $opts['filter_prefix'])) {
        continue;
    }
    $stats['inspected']++;
    $baseRel = $docPaths[$code] ?? (string)($headers[$code]['filesystem_path'] ?? '');
    $baseRel = normalize_rel($baseRel);
    if ($baseRel === '' || !is_file($ROOT_DIR . '/' . $baseRel)) {
        $stats['skipped_no_path']++;
        $details[] = ['code' => $code, 'status' => 'skipped_no_path'];
        continue;
    }

    $store = doc_store_paths($ROOT_DIR, $baseRel);
    $state = read_json($store['state']) ?? [];
    $manifest = read_json($store['manifest']) ?? ['code' => $code, 'versions' => []];
    $legacy = legacy_current_release($manifest, $state);
    $authority = choose_authority($headers[$code] ?? [], $revisions[$code] ?? [], $legacy, $baseRel);
    if ($authority === null) {
        $stats['skipped_no_authority']++;
        $details[] = ['code' => $code, 'status' => 'skipped_no_authority'];
        continue;
    }
    $stats['authority_from_' . $authority['source']]++;

    try {
        $headerChanged = reconcile_header($svc, $headers[$code] ?? [], $authority, $opts);
        if ($headerChanged) {
            $stats['header_repaired']++;
        }
        if ($authority['source'] === 'legacy') {
            $inserted = ensure_revision_from_legacy($svc, $dl, $code, $authority, $opts);
            if ($inserted) {
                $stats['revision_inserted']++;
            }
        }
    } catch (Throwable $e) {
        $stats['errors']++;
        $details[] = ['code' => $code, 'status' => 'error', 'message' => $e->getMessage()];
        continue;
    }

    $bodyRows = $revisions[$code] ?? [];
    if ($bodyRows === []) {
        $bodyRows[] = synthetic_revision_row($authority);
    }

    $nextManifest = build_manifest($code, $baseRel, $manifest, $bodyRows, $authority);
    $nextState = build_state($code, $state, $authority);
    if (projection_changed($nextManifest, $manifest, ['updated_at'])) {
        $stats['manifest_written']++;
        if (!$opts['dry_run']) {
            $nextManifest['updated_at'] = gmdate('c');
            write_json($store['manifest'], $nextManifest);
        }
    }
    if (projection_changed($nextState, $state, ['updated_at'])) {
        $stats['state_written']++;
        if (!$opts['dry_run']) {
            $nextState['updated_at'] = gmdate('c');
            write_json($store['state'], $nextState);
        }
    }

    $html = (string)@file_get_contents($ROOT_DIR . '/' . $baseRel);
    $nextHtml = sync_html_cache($html, $headers[$code] ?? [], $authority);
    if ($nextHtml !== $html) {
        $stats['html_written']++;
        if (!$opts['dry_run']) {
            file_put_contents($ROOT_DIR . '/' . $baseRel, $nextHtml, LOCK_EX);
        }
    }

    $details[] = [
        'code' => $code,
        'status' => 'ok',
        'source' => $authority['source'],
        'revision' => $authority['revision'],
        'path' => $baseRel,
    ];
}

if ($opts['json']) {
    echo json_encode(['dry_run' => $opts['dry_run'], 'stats' => $stats, 'details' => $details], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
} else {
    echo "\n============================================================\n";
    echo " DCC Version SSOT Reconcile " . ($opts['dry_run'] ? '(DRY-RUN)' : '(APPLIED)') . "\n";
    echo "============================================================\n";
    foreach ($stats as $key => $value) {
        printf(" %-32s %d\n", $key, $value);
    }
    echo "============================================================\n";
}

exit($stats['errors'] > 0 ? 1 : 0);

function parse_args(array $argv): array
{
    $opts = ['dry_run' => false, 'json' => false, 'filter_prefix' => ''];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--dry-run') {
            $opts['dry_run'] = true;
        } elseif ($arg === '--json') {
            $opts['json'] = true;
        } elseif (str_starts_with($arg, '--filter-prefix=')) {
            $opts['filter_prefix'] = strtoupper(substr($arg, strlen('--filter-prefix=')));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 1800);
            exit(0);
        }
    }
    return $opts;
}

function build_doc_path_map(string $rootDir): array
{
    $out = [];
    foreach (walk_docs($rootDir) as $abs) {
        if (!is_html_path($abs)) {
            continue;
        }
        $code = code_from_filename($abs);
        if ($code === '') {
            $code = code_from_filename_loose($abs);
        }
        if ($code === '') {
            continue;
        }
        $out[$code] ??= normalize_rel(substr($abs, strlen(rtrim($rootDir, '/') . '/')));
    }
    return $out;
}

function load_headers(DataLayer $dl): array
{
    $rows = $dl->query(
        "SELECT doc_code, title, subtitle, doc_type, revision, effective_date,
                status, owner_role_code, approver_role_code, iso_clause,
                filename, filesystem_path, updated_by
         FROM dcc_document_header"
    ) ?? [];
    $out = [];
    foreach ($rows as $row) {
        $code = strtoupper(trim((string)($row['doc_code'] ?? '')));
        if ($code !== '') {
            $out[$code] = $row;
        }
    }
    return $out;
}

function load_revisions(DataLayer $dl): array
{
    $rows = $dl->query(
        "SELECT doc_code, revision, update_type, effective_date, content_sha256,
                content_path, filename, approved_by, approved_at, released_by,
                released_at, is_current, note
         FROM dcc_document_revision
         ORDER BY doc_code, is_current DESC, released_at DESC NULLS LAST,
                  approved_at DESC NULLS LAST, revision DESC"
    ) ?? [];
    $out = [];
    foreach ($rows as $row) {
        $code = strtoupper(trim((string)($row['doc_code'] ?? '')));
        if ($code !== '') {
            $out[$code] ??= [];
            $out[$code][] = $row;
        }
    }
    return $out;
}

function choose_authority(array $header, array $rows, array $legacy, string $baseRel): ?array
{
    foreach ($rows as $row) {
        if (truthy($row['is_current'] ?? false)) {
            return authority_from_row($row, 'dcc_revision', $baseRel, $header);
        }
    }
    if ($rows !== []) {
        return authority_from_row($rows[0], 'dcc_revision', $baseRel, $header);
    }

    $headerRev = normalise_revision((string)($header['revision'] ?? ''));
    $headerStatus = strtolower(trim((string)($header['status'] ?? '')));
    if ($headerRev !== '' && is_release_status($headerStatus)) {
        return authority_from_header($header, $headerRev, $headerStatus, $baseRel);
    }

    if ($headerRev !== '' && legacy_is_generated_header_projection($legacy)) {
        return authority_from_header($header, $headerRev, $headerStatus !== '' ? $headerStatus : 'draft', $baseRel);
    }

    if (($legacy['revision'] ?? '') !== '') {
        return [
            'source' => 'legacy',
            'doc_code' => strtoupper((string)($header['doc_code'] ?? '')),
            'revision' => (string)$legacy['revision'],
            'legacy_revision' => legacy_revision((string)$legacy['revision']),
            'effective_date' => valid_date((string)($legacy['effective_date'] ?? '')),
            'status' => 'approved',
            'path' => $baseRel,
            'actor' => (string)($legacy['actor'] ?? 'dcc-version-ssot'),
            'note' => 'reconciled_from_legacy_release',
        ];
    }

    if ($headerRev !== '') {
        return authority_from_header($header, $headerRev, $headerStatus !== '' ? $headerStatus : 'draft', $baseRel);
    }

    return null;
}

function authority_from_header(array $header, string $revision, string $status, string $baseRel): array
{
    return [
        'source' => 'header',
        'doc_code' => strtoupper((string)($header['doc_code'] ?? '')),
        'revision' => $revision,
        'legacy_revision' => legacy_revision($revision),
        'effective_date' => valid_date((string)($header['effective_date'] ?? '')),
        'status' => $status !== '' ? $status : 'draft',
        'path' => $baseRel,
        'actor' => (string)($header['updated_by'] ?? 'dcc-version-ssot'),
        'note' => 'dcc_header_projection',
    ];
}

function authority_from_row(array $row, string $source, string $baseRel, array $header): array
{
    $revision = normalise_revision((string)($row['revision'] ?? ''));
    return [
        'source' => $source,
        'doc_code' => strtoupper((string)($row['doc_code'] ?? ($header['doc_code'] ?? ''))),
        'revision' => $revision,
        'legacy_revision' => legacy_revision($revision),
        'effective_date' => valid_date((string)($row['effective_date'] ?? ($header['effective_date'] ?? ''))),
        'status' => strtolower(trim((string)($header['status'] ?? 'approved'))) ?: 'approved',
        'path' => normalize_rel((string)($row['content_path'] ?? '')) ?: $baseRel,
        'actor' => (string)($row['released_by'] ?? ($row['approved_by'] ?? 'dcc-version-ssot')),
        'note' => (string)($row['note'] ?? 'dcc_current_revision'),
    ];
}

function reconcile_header(DocumentControlService $svc, array $header, array $authority, array $opts): bool
{
    if ($header === []) {
        return false;
    }
    $currentRev = normalise_revision((string)($header['revision'] ?? ''));
    $currentEff = valid_date((string)($header['effective_date'] ?? ''));
    $wantedStatus = (string)($authority['status'] ?? '');
    if ($authority['source'] === 'legacy') {
        $wantedStatus = 'approved';
    }
    $statusChanged = $wantedStatus !== '' && strtolower((string)($header['status'] ?? '')) !== $wantedStatus;
    $changed = $currentRev !== $authority['revision']
        || $currentEff !== $authority['effective_date']
        || $statusChanged;
    if (!$changed) {
        return false;
    }
    if (!$opts['dry_run']) {
        $svc->projectCurrentRevision(
            (string)$header['doc_code'],
            (string)$authority['revision'],
            (string)$authority['effective_date'],
            'dcc-version-ssot-reconcile',
            $statusChanged ? $wantedStatus : null,
            null,
            (string)$authority['note']
        );
    }
    return true;
}

function ensure_revision_from_legacy(DocumentControlService $svc, DataLayer $dl, string $code, array $authority, array $opts): bool
{
    $header = $dl->query(
        "SELECT 1 FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
        [':c' => $code]
    ) ?? [];
    if ($header === []) {
        return false;
    }
    $existing = $dl->query(
        "SELECT 1 FROM dcc_document_revision WHERE doc_code = :c AND revision = :r LIMIT 1",
        [':c' => $code, ':r' => $authority['revision']]
    ) ?? [];
    if ($existing !== []) {
        if (!$opts['dry_run']) {
            $svc->markRevisionCurrent($code, (string)$authority['revision'], 'dcc-version-ssot-reconcile');
        }
        return false;
    }
    if (!$opts['dry_run']) {
        $svc->recordRevision($code, [
            'revision' => (string)$authority['revision'],
            'effective_date' => (string)$authority['effective_date'],
            'update_type' => 'minor',
            'content_path' => (string)$authority['path'],
            'filename' => basename((string)$authority['path']),
            'note' => 'version_ssot_reconciled_from_legacy',
        ], 'dcc-version-ssot-reconcile');
        $svc->markRevisionCurrent($code, (string)$authority['revision'], 'dcc-version-ssot-reconcile');
    }
    return true;
}

function build_manifest(string $code, string $baseRel, array $manifest, array $rows, array $authority): array
{
    $existing = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
    $out = [];
    $seen = [];
    foreach ($existing as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $status = strtolower((string)($entry['status'] ?? ''));
        if (in_array($status, ['draft', 'in_review', 'pending_approval', 'rejected'], true)) {
            $out[] = $entry + ['source' => 'legacy_workflow_transient'];
            $seen[normalise_revision((string)($entry['version'] ?? ''))] = true;
        }
    }
    usort($rows, static fn(array $a, array $b): int => revision_rank((string)($b['revision'] ?? '')) <=> revision_rank((string)($a['revision'] ?? '')));
    foreach ($rows as $row) {
        $rev = normalise_revision((string)($row['revision'] ?? ''));
        if ($rev === '' || isset($seen[$rev])) {
            continue;
        }
        $current = $rev === $authority['revision'] || truthy($row['is_current'] ?? false);
        $authoritySource = (string)($row['authority_source'] ?? ($authority['source'] ?? 'dcc_revision'));
        $actor = trim((string)($row['released_by'] ?? ($row['approved_by'] ?? ($authority['actor'] ?? ''))));
        $date = first_nonempty([
            (string)($row['released_at'] ?? ''),
            (string)($row['approved_at'] ?? ''),
            (string)($row['effective_date'] ?? ''),
            (string)$authority['effective_date'],
        ]);
        $out[] = [
            'status' => manifest_status($authority, $current),
            'version' => 'v' . legacy_revision($rev),
            'date' => $date,
            'by' => $actor,
            'approvedBy' => $actor,
            'approvedDate' => $date,
            'file' => normalize_rel((string)($row['content_path'] ?? '')) ?: $baseRel,
            'note' => trim((string)($row['note'] ?? '')) ?: 'DCC controlled revision',
            'updateType' => trim((string)($row['update_type'] ?? '')),
            'source' => version_source_label($authoritySource),
        ];
        $seen[$rev] = true;
    }
    foreach ($existing as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $status = strtolower((string)($entry['status'] ?? ''));
        if (!in_array($status, ['approved', 'initial_release', 'released', 'effective', 'obsolete'], true)) {
            continue;
        }
        $rev = normalise_revision((string)($entry['version'] ?? ''));
        if ($rev === '' || isset($seen[$rev])) {
            continue;
        }
        $entry['status'] = 'obsolete';
        $entry['source'] = 'legacy_manifest_compat';
        $out[] = $entry;
        $seen[$rev] = true;
    }
    $manifest['code'] = $code;
    $manifest['updated_at'] = (string)($manifest['updated_at'] ?? '');
    $manifest['versions'] = array_values($out);
    $manifest['version_source'] = version_source_label((string)($authority['source'] ?? 'dcc_revision'));
    return $manifest;
}

function build_state(string $code, array $state, array $authority): array
{
    $legacyRev = legacy_revision((string)$authority['revision']);
    $status = strtolower(trim((string)($authority['status'] ?? '')));
    $hasRelease = authority_has_release($authority);
    $state['code'] = $code;
    $state['status'] = $status !== '' ? $status : ($hasRelease ? 'approved' : 'draft');
    $state['revision'] = $legacyRev;
    if ($hasRelease) {
        $state['released_revision'] = $legacyRev;
    } else {
        unset($state['released_revision']);
    }
    $state['has_release'] = $hasRelease;
    $state['effective_date'] = (string)$authority['effective_date'];
    $state['version_source'] = version_source_label((string)($authority['source'] ?? 'dcc_revision'));
    $state['dcc_revision'] = (string)$authority['revision'];
    foreach (['lastEdit', 'submittedBy', 'submittedDate', 'submittedUpdateType', 'rejectedBy', 'rejectedDate', 'checked_out_by'] as $key) {
        unset($state[$key]);
    }
    $state['updated_at'] = (string)($state['updated_at'] ?? '');
    return $state;
}

function sync_html_cache(string $html, array $header, array $authority): string
{
    if ($html === '') {
        return $html;
    }
    $revision = (string)$authority['revision'];
    $effective = (string)$authority['effective_date'];
    $title = (string)($header['title'] ?? '');
    $subtitle = (string)($header['subtitle'] ?? '');
    $owner = (string)($header['owner_role_code'] ?? '');
    $approver = (string)($header['approver_role_code'] ?? '');
    $docType = (string)($header['doc_type'] ?? doc_type_from_code((string)($authority['doc_code'] ?? '')));
    $status = (string)($authority['status'] ?? ($header['status'] ?? 'approved'));

    $html = preg_replace_callback('/data-dcc-bootstrap="([^"]*)"/i', static function (array $m) use ($authority, $revision, $effective, $title, $subtitle, $owner, $approver, $docType, $status): string {
        $decoded = html_entity_decode((string)$m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $payload = json_decode($decoded, true);
        if (!is_array($payload)) {
            $payload = [];
        }
        $payload['header'] = is_array($payload['header'] ?? null) ? $payload['header'] : [];
        $payload['header']['doc_code'] = (string)($authority['doc_code'] ?? ($payload['header']['doc_code'] ?? ''));
        if ($title !== '') {
            $payload['header']['title'] = $title;
        }
        if ($subtitle !== '') {
            $payload['header']['subtitle'] = $subtitle;
        }
        $payload['header']['doc_type'] = $docType;
        $payload['header']['revision'] = $revision;
        $payload['header']['effective_date'] = $effective;
        $payload['header']['owner_role_code'] = $owner;
        $payload['header']['approver_role_code'] = $approver;
        $payload['header']['status'] = $status;
        $encoded = htmlspecialchars(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return 'data-dcc-bootstrap="' . $encoded . '"';
    }, $html) ?? $html;

    $html = preg_replace('/data-dcc-status="[^"]*"/i', 'data-dcc-status="' . h($status) . '"', $html) ?? $html;
    $html = replace_dcc_cell($html, 'revision', $revision);
    $html = replace_dcc_cell($html, 'effective_date', $effective);
    if ($title !== '') {
        $html = preg_replace('/(<h2 class="dcc-header__title">)(.*?)(<\/h2>)/isu', '$1' . h($title) . '$3', $html, 1) ?? $html;
    }
    if ($subtitle !== '') {
        $html = preg_replace('/(<p class="dcc-header__subtitle">)(.*?)(<\/p>)/isu', '$1' . h($subtitle) . '$3', $html, 1) ?? $html;
    }
    return $html;
}

function replace_dcc_cell(string $html, string $cell, string $value): string
{
    $pattern = '/(<div class="dcc-header__cell"[^>]*data-dcc-cell="' . preg_quote($cell, '/') . '"[^>]*>.*?<span class="dcc-header__value">)(.*?)(<\/span>)/isu';
    return preg_replace($pattern, '$1' . h($value) . '$3', $html, 1) ?? $html;
}

function doc_store_paths(string $rootDir, string $baseRel): array
{
    $dir = dirname($baseRel);
    if ($dir === '.' || $dir === '/') {
        $dir = '';
    }
    $baseName = pathinfo($baseRel, PATHINFO_FILENAME);
    $archiveDir = ($dir !== '' ? $dir . '/' : '') . '_Archive';
    return [
        'state' => rtrim($rootDir, '/') . '/' . $archiveDir . '/' . $baseName . '_state.json',
        'manifest' => rtrim($rootDir, '/') . '/' . $archiveDir . '/' . $baseName . '_manifest.json',
    ];
}

function read_json(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($data) ? $data : null;
}

function write_json(string $path, array $data): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", LOCK_EX);
}

function legacy_current_release(array $manifest, array $state): array
{
    $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
    foreach ($versions as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $status = strtolower((string)($entry['status'] ?? ''));
        if (!in_array($status, ['approved', 'initial_release', 'released', 'effective'], true)) {
            continue;
        }
        $rev = normalise_revision((string)($entry['version'] ?? ''));
        if ($rev === '') {
            continue;
        }
        return [
            'revision' => $rev,
            'effective_date' => valid_date((string)($entry['approvedDate'] ?? ($entry['date'] ?? ''))),
            'actor' => (string)($entry['approvedBy'] ?? ($entry['by'] ?? 'dcc-version-ssot')),
            'source' => (string)($entry['source'] ?? ''),
            'note' => (string)($entry['note'] ?? ''),
            'version_source' => (string)($manifest['version_source'] ?? ''),
        ];
    }
    $rev = normalise_revision((string)($state['released_revision'] ?? ($state['revision'] ?? '')));
    if ($rev === '') {
        return [];
    }
    return [
        'revision' => $rev,
        'effective_date' => valid_date((string)($state['effective_date'] ?? ($state['updated_at'] ?? ''))),
        'actor' => (string)($state['approved_by'] ?? 'dcc-version-ssot'),
        'source' => (string)($state['version_source'] ?? ''),
        'note' => '',
        'version_source' => (string)($state['version_source'] ?? ''),
    ];
}

function synthetic_revision_row(array $authority): array
{
    return [
        'doc_code' => $authority['doc_code'] ?? '',
        'revision' => $authority['revision'],
        'update_type' => 'minor',
        'effective_date' => $authority['effective_date'],
        'content_path' => $authority['path'],
        'filename' => basename((string)$authority['path']),
        'approved_by' => $authority['actor'],
        'approved_at' => $authority['effective_date'],
        'released_by' => $authority['actor'],
        'released_at' => $authority['effective_date'],
        'is_current' => true,
        'note' => $authority['note'],
        'authority_source' => $authority['source'],
    ];
}

function projection_changed(array $next, array $current, array $volatileKeys): bool
{
    foreach ($volatileKeys as $key) {
        unset($next[$key], $current[$key]);
    }
    return $next !== $current;
}

function is_release_status(string $status): bool
{
    return in_array(strtolower(trim($status)), ['approved', 'released', 'effective', 'initial_release', 'superseded', 'obsolete'], true);
}

function authority_has_release(array $authority): bool
{
    $source = (string)($authority['source'] ?? '');
    if ($source === 'dcc_revision' || $source === 'legacy') {
        return true;
    }
    return is_release_status((string)($authority['status'] ?? ''));
}

function manifest_status(array $authority, bool $current): string
{
    if (!$current) {
        return 'obsolete';
    }
    $status = strtolower(trim((string)($authority['status'] ?? '')));
    if (authority_has_release($authority)) {
        return 'approved';
    }
    return $status !== '' ? $status : 'draft';
}

function version_source_label(string $source): string
{
    return match ($source) {
        'header' => 'dcc_document_header',
        'legacy' => 'legacy_manifest',
        default => 'dcc_document_revision',
    };
}

function legacy_is_generated_header_projection(array $legacy): bool
{
    if ($legacy === []) {
        return false;
    }
    return (string)($legacy['note'] ?? '') === 'dcc_header_projection'
        || (string)($legacy['version_source'] ?? '') === 'dcc_document_header';
}

function normalise_revision(string $raw): string
{
    $raw = trim($raw);
    if ($raw === '') {
        return '';
    }
    $raw = preg_replace('/^[vV]+/', '', $raw) ?? $raw;
    if (!preg_match('/^\d+(?:\.\d+)?$/', $raw)) {
        return '';
    }
    return 'V' . $raw;
}

function legacy_revision(string $revision): string
{
    return preg_replace('/^[vV]+/', '', trim($revision)) ?? trim($revision);
}

function revision_rank(string $revision): int
{
    $legacy = legacy_revision($revision);
    if (!preg_match('/^(\d+)(?:\.(\d+))?$/', $legacy, $m)) {
        return 0;
    }
    return ((int)$m[1] * 1000) + (int)($m[2] ?? 0);
}

function valid_date(string $raw): string
{
    $raw = trim($raw);
    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $raw, $m)) {
        return $m[1];
    }
    $ts = strtotime($raw);
    return $ts !== false ? gmdate('Y-m-d', $ts) : gmdate('Y-m-d');
}

function truthy(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    return in_array(strtolower(trim((string)$value)), ['1', 't', 'true', 'yes', 'y'], true);
}

function normalize_rel(string $path): string
{
    $path = trim(str_replace('\\', '/', $path));
    $path = preg_replace('#/+#', '/', $path) ?? $path;
    return ltrim($path, '/');
}

function first_nonempty(array $values): string
{
    foreach ($values as $value) {
        $value = trim((string)$value);
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
