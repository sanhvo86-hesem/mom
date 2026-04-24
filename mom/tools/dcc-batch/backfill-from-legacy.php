<?php

declare(strict_types=1);

/**
 * DCC Batch — Backfill From Legacy
 * ================================
 *
 * Second-pass migration that imports legacy JSON state / manifest data into
 * the migration-150 + 155 DCC control plane. Where `migrate.php` normalises
 * the HTML shell, this script populates the authoritative database:
 *
 *   • Upserts `dcc_document_header` from the per-file `_state.json` so the
 *     renderer shows the real revision / owner / approver / effective date
 *     instead of the hardcoded V0 / QA / CEO seed.
 *   • Inserts one `dcc_document_revision` row per approved / initial_release
 *     entry in the `_manifest.json`, idempotent on (doc_code, revision).
 *   • Flags the highest released revision with `is_current = TRUE`.
 *   • Records the filename / filesystem_path anchor on the header row so the
 *     filename↔DB contract introduced by migration 155 is satisfied.
 *
 * Options (all additive to migrate.php's option set):
 *   --dry-run                   report actions but do not write
 *   --verbose / -v              per-file log
 *   --filter-prefix=<CODE>      restrict to matching canonical codes
 *   --only-headers              skip revision bodies
 *   --only-revisions            skip header upserts
 *
 * Legacy state shape (mom/docs/**_/_Archive/<basename>_state.json):
 *   { status, revision, updateType?, has_release?, released_revision?, … }
 *
 * Legacy manifest shape (<basename>_manifest.json):
 *   { code, updated_at, versions: [ {version, status, updateType, file, …}, … ] }
 *
 * Normalisation rules (mirrored by migrate.php's new legacy-seed branch):
 *   • Multi-role ("QA/QMS") → first token, warning emitted.
 *   • Revision lacking "V" prefix → prepend "V".
 *   • Status mapping: approved / effective / initial_release → released,
 *     draft / in_review / pending_approval pass through, fallback draft.
 *
 * Exit codes:
 *   0 — every doc processed without fatal error (warnings allowed)
 *   1 — any fatal error (DB unreachable, write failure, invalid config)
 *
 * @since 4.1.0
 */

require __DIR__ . '/lib.php';
require __DIR__ . '/../../vendor/autoload.php';

use MOM\Services\DocumentControl\DocumentControlService;
use function MOM\Tools\DccBatch\walk_docs;
use function MOM\Tools\DccBatch\is_html_path;
use function MOM\Tools\DccBatch\code_from_filename;
use function MOM\Tools\DccBatch\code_from_filename_loose;
use function MOM\Tools\DccBatch\clean_text;
use function MOM\Tools\DccBatch\doc_type_from_code;
use function MOM\Tools\DccBatch\extract_subtitle;
use function MOM\Tools\DccBatch\extract_title;
use function MOM\Tools\DccBatch\load_doc_descriptions;
use function MOM\Tools\DccBatch\strip_brand_suffix;
use function MOM\Tools\DccBatch\strip_code_prefix;
use function MOM\Tools\DccBatch\build_data_layer;

$ROOT_DIR = realpath(__DIR__ . '/../../..');
if ($ROOT_DIR === false) {
    fwrite(STDERR, "[backfill] cannot resolve repo root\n");
    exit(1);
}

$opts = parse_argv($argv);

$dl = build_data_layer($ROOT_DIR);
if (!$dl) {
    fwrite(STDERR, "[backfill] DB unavailable; aborting.\n");
    exit(1);
}

$service = new DocumentControlService($dl);

$docTypeCatalog = load_doc_type_defaults($dl);
$customDocsByCode = load_custom_doc_catalog($ROOT_DIR);
$docDescriptions = load_doc_descriptions($ROOT_DIR);

$stats = [
    'inspected'           => 0,
    'skipped_no_code'     => 0,
    'skipped_no_state'    => 0,
    'headers_upserted'    => 0,
    'headers_unchanged'   => 0,
    'revisions_inserted'  => 0,
    'revisions_existing'  => 0,
    'filename_anchored'   => 0,
    'current_flags_set'   => 0,
    'warnings'            => 0,
    'errors'              => 0,
];
$warnings = [];

$seenCodes = [];

foreach (walk_docs($ROOT_DIR) as $abs) {
    if (!is_html_path($abs)) {
        continue;
    }
    $rel  = substr($abs, strlen($ROOT_DIR) + 1);
    $code = code_from_filename($abs);
    if ($code === '') {
        $code = code_from_filename_loose($abs);
    }
    if ($code === '') {
        $stats['skipped_no_code']++;
        if ($opts['verbose']) echo "[skip] no code → $rel\n";
        continue;
    }
    if ($opts['filter_prefix'] !== '' && !str_starts_with($code, $opts['filter_prefix'])) {
        continue;
    }
    // One canonical code may be present in several on-disk files (e.g. a live
    // copy plus archive helpers that slipped into the walk). Process the first
    // occurrence — the filename anchor belongs to the live file.
    if (isset($seenCodes[$code])) {
        continue;
    }
    $seenCodes[$code] = true;

    $stats['inspected']++;
    $baseRel = rel_from_root($abs, $ROOT_DIR);
    $statePaths    = legacy_state_paths($ROOT_DIR, $baseRel);
    $state         = read_first_existing_json($statePaths['state']);
    $manifest      = read_first_existing_json($statePaths['manifest']);
    $catalogEntry  = $customDocsByCode[$code] ?? [];
    $legacyDesc    = isset($docDescriptions[$code]) ? (string)$docDescriptions[$code] : null;

    if ($state === null && $manifest === null && $catalogEntry === [] && ($legacyDesc === null || trim($legacyDesc) === '')) {
        $stats['skipped_no_state']++;
        if ($opts['verbose']) echo "[skip] no legacy state for $code ($rel)\n";
        // We still anchor filename when state is absent — filename contract
        // is independent of approval history.
        if (!$opts['only_revisions']) {
            maybe_anchor_filename($service, $dl, $code, $abs, $ROOT_DIR, $stats, $opts);
        }
        continue;
    }

    /* ── Header upsert from legacy state ─────────────────────────────── */
    if (!$opts['only_revisions']) {
        try {
            upsert_header_from_legacy(
                $service,
                $dl,
                $code,
                $abs,
                $state ?? [],
                $catalogEntry,
                $legacyDesc,
                $docTypeCatalog,
                $opts,
                $stats,
                $warnings,
                $rel
            );
        } catch (\Throwable $e) {
            $stats['errors']++;
            echo "[err ] header upsert failed $code: " . $e->getMessage() . "\n";
        }
        // Filename anchor is part of the header contract.
        maybe_anchor_filename($service, $dl, $code, $abs, $ROOT_DIR, $stats, $opts);
    }

    /* ── Revision rows from manifest ─────────────────────────────────── */
    if (!$opts['only_headers'] && is_array($manifest) && !empty($manifest['versions'])) {
        $versions = $manifest['versions'];
        $releasedTracks = [];
        foreach ($versions as $v) {
            if (!is_array($v)) continue;
            $legacyStatus = strtolower(trim((string)($v['status'] ?? '')));
            if (!in_array($legacyStatus, ['approved', 'initial_release', 'released', 'effective'], true)) {
                continue;
            }
            $rev = normalise_revision((string)($v['version'] ?? ''));
            if ($rev === '') continue;

            $updateType = strtolower(trim((string)($v['updateType'] ?? 'minor')));
            if (!in_array($updateType, ['major', 'minor', 'patch'], true)) {
                $updateType = 'minor';
            }
            $effective = extract_effective_date((string)($v['approvedDate'] ?? ($v['date'] ?? '')));
            $fileRel = trim((string)($v['file'] ?? ''));

            if ($opts['dry_run']) {
                $stats['revisions_inserted']++;
                if ($opts['verbose']) echo "[dry ] would recordRevision $code $rev ($legacyStatus)\n";
            } else {
                try {
                    $existingBefore = $dl->query(
                        "SELECT 1 FROM dcc_document_revision WHERE doc_code = :c AND revision = :r",
                        [':c' => $code, ':r' => $rev]
                    ) ?? [];
                    $service->recordRevision($code, [
                        'revision'       => $rev,
                        'update_type'    => $updateType,
                        'effective_date' => $effective,
                        'filename'       => $fileRel !== '' ? basename($fileRel) : null,
                        'content_path'   => $fileRel !== '' ? $fileRel : null,
                        'note'           => 'backfilled_from_manifest',
                    ], (string)($v['approvedBy'] ?? ($v['user'] ?? 'dcc-backfill')));
                    if ($existingBefore === []) {
                        $stats['revisions_inserted']++;
                        if ($opts['verbose']) echo "[ok  ] recordRevision $code $rev ($legacyStatus)\n";
                    } else {
                        $stats['revisions_existing']++;
                    }
                } catch (\Throwable $e) {
                    $stats['errors']++;
                    echo "[err ] recordRevision failed $code $rev: " . $e->getMessage() . "\n";
                    continue;
                }
            }
            $releasedTracks[] = $rev;
        }

        // Pick highest released revision to flag as current.
        if (!empty($releasedTracks)) {
            $current = pick_current_revision($releasedTracks, $state, $catalogEntry);
            if ($current !== '') {
                if ($opts['dry_run']) {
                    $stats['current_flags_set']++;
                    if ($opts['verbose']) echo "[dry ] would markRevisionCurrent $code $current\n";
                } else {
                    try {
                        $service->markRevisionCurrent($code, $current, 'dcc-backfill');
                        $stats['current_flags_set']++;
                        if ($opts['verbose']) echo "[ok  ] markRevisionCurrent $code $current\n";
                    } catch (\Throwable $e) {
                        $stats['errors']++;
                        echo "[err ] markRevisionCurrent failed $code $current: " . $e->getMessage() . "\n";
                    }
                }
            }
        }
    }
}

/* ── Summary ──────────────────────────────────────────────────────────── */
echo "\n============================================================\n";
echo " DCC Legacy Backfill Summary " . ($opts['dry_run'] ? '(DRY-RUN)' : '(APPLIED)') . "\n";
echo "============================================================\n";
foreach ($stats as $k => $v) printf(" %-22s %d\n", $k, $v);
if (!empty($warnings)) {
    echo "\n Warnings (" . count($warnings) . "):\n";
    foreach ($warnings as $w) echo "   - $w\n";
}
echo "============================================================\n";

exit($stats['errors'] > 0 ? 1 : 0);

/* ──────────────────────────────────────────────────────────────────────── */

function parse_argv(array $argv): array
{
    $opts = [
        'dry_run'         => false,
        'verbose'         => false,
        'filter_prefix'   => '',
        'only_headers'    => false,
        'only_revisions'  => false,
    ];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--dry-run')                      $opts['dry_run'] = true;
        elseif ($arg === '--verbose' || $arg === '-v') $opts['verbose'] = true;
        elseif ($arg === '--only-headers')             $opts['only_headers']   = true;
        elseif ($arg === '--only-revisions')           $opts['only_revisions'] = true;
        elseif (str_starts_with($arg, '--filter-prefix=')) {
            $opts['filter_prefix'] = strtoupper(substr($arg, strlen('--filter-prefix=')));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 2200);
            exit(0);
        }
    }
    if ($opts['only_headers'] && $opts['only_revisions']) {
        fwrite(STDERR, "[backfill] --only-headers and --only-revisions are mutually exclusive\n");
        exit(1);
    }
    return $opts;
}

/**
 * Build the two-candidate list of state / manifest JSON paths. Older docs
 * kept these files under `mom/data/registry/doc-state/<code>.json`; the
 * current layout (doc_store_info in mom/api.php) puts them in the sibling
 * `_Archive` folder. We probe both so backfill stays tolerant across
 * historical layouts.
 *
 * @return array{state: list<string>, manifest: list<string>}
 */
function legacy_state_paths(string $rootDir, string $baseRel): array
{
    $rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
    $baseRel = ltrim(str_replace('\\', '/', $baseRel), '/');
    $dir     = dirname($baseRel);
    if ($dir === '.' || $dir === '/') $dir = '';
    $baseName = pathinfo($baseRel, PATHINFO_FILENAME);
    $archiveDir = ($dir !== '' ? ($dir . '/') : '') . '_Archive';
    $stateCandidates    = [$rootDir . '/' . $archiveDir . '/' . $baseName . '_state.json'];
    $manifestCandidates = [$rootDir . '/' . $archiveDir . '/' . $baseName . '_manifest.json'];
    // Legacy registry fallback keyed by canonical code.
    $code = canonical_code_for($baseName);
    if ($code !== '') {
        $stateCandidates[]    = $rootDir . '/mom/data/registry/doc-state/' . $code . '.json';
        $manifestCandidates[] = $rootDir . '/mom/data/registry/doc-state/' . $code . '_manifest.json';
    }
    return ['state' => $stateCandidates, 'manifest' => $manifestCandidates];
}

function canonical_code_for(string $baseName): string
{
    $stem = strtoupper($baseName);
    if (preg_match('/^([A-Z]+(?:-[A-Z0-9]+)*-\d+)/', $stem, $m)) {
        return $m[1];
    }
    return '';
}

function read_first_existing_json(array $candidates): ?array
{
    foreach ($candidates as $path) {
        if (!is_file($path)) continue;
        $raw = @file_get_contents($path);
        if ($raw === false) continue;
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return null;
}

/**
 * Load the runtime-style docs_custom catalog, preferring the ignored local
 * override file when present and falling back to the tracked baseline.
 *
 * @return array<string, array<string, mixed>>
 */
function load_custom_doc_catalog(string $rootDir): array
{
    $candidates = [
        rtrim($rootDir, '/') . '/mom/data/config/docs_custom.local.json',
        rtrim($rootDir, '/') . '/mom/data/config/docs_custom.json',
    ];
    foreach ($candidates as $file) {
        $docs = parse_custom_doc_catalog($file);
        if ($docs !== []) {
            return $docs;
        }
    }
    return [];
}

/**
 * @return array<string, array<string, mixed>>
 */
function parse_custom_doc_catalog(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $raw = @file_get_contents($file);
    $data = $raw === false ? null : json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    $rows = isset($data['docs']) && is_array($data['docs'])
        ? $data['docs']
        : (array_is_list($data) ? $data : []);
    $out = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $code = strtoupper(trim((string)($row['code'] ?? '')));
        if ($code === '') {
            continue;
        }
        $out[$code] = $row;
    }
    return $out;
}

function rel_from_root(string $abs, string $rootDir): string
{
    $rootDir = rtrim($rootDir, '/') . '/';
    if (str_starts_with($abs, $rootDir)) {
        return substr($abs, strlen($rootDir));
    }
    return $abs;
}

/**
 * Return a map doc_type => [owner_role_code, approver_role_code] for default
 * seeding when state.json lacks explicit owner / approver. Falls back to
 * the hard-coded QA / CEO pair for any doc_type missing from the catalog.
 *
 * @return array<string, array{owner: string, approver: string}>
 */
function load_doc_type_defaults(\MOM\Database\DataLayer $dl): array
{
    $out = [];
    try {
        $rows = $dl->query(
            "SELECT doc_type, default_owner_role, default_approver_role
             FROM dcc_doc_type_catalog
             WHERE is_active = TRUE"
        ) ?? [];
        foreach ($rows as $r) {
            $out[strtoupper((string)$r['doc_type'])] = [
                'owner'    => trim((string)($r['default_owner_role']    ?? '')),
                'approver' => trim((string)($r['default_approver_role'] ?? '')),
            ];
        }
    } catch (\Throwable $e) {
        // Migration 155 may not be applied yet — fall back to hard defaults.
    }
    return $out;
}

/**
 * Split multi-role strings ("QA/QMS", "CEO, MD") into the first token and
 * register a warning. Empty input returns the caller-provided fallback.
 *
 * @param array<int, string> $warnings
 */
function normalise_role(
    ?string $raw,
    string $fallback,
    string $field,
    string $code,
    array &$warnings,
    array &$stats
): string {
    $raw = trim((string)$raw);
    if ($raw === '') return $fallback;
    if (preg_match('#[/,;|\s]#', $raw)) {
        $first = preg_split('#[/,;|\s]+#', $raw)[0] ?? $raw;
        $first = strtoupper(trim($first));
        $warnings[] = "$code: $field was '$raw', split to '$first'";
        $stats['warnings']++;
        return $first !== '' ? $first : $fallback;
    }
    return strtoupper($raw);
}

/**
 * Accept "2.0", "v2.0", "V2.0" and return the canonical "V2.0" form.
 * Returns empty string when the input cannot be salvaged.
 */
function normalise_revision(string $raw): string
{
    $raw = trim($raw);
    if ($raw === '') return '';
    // Strip leading v/V prefix (possibly multiple) then reapply exactly one.
    $raw = preg_replace('/^[vV]+/', '', $raw) ?? $raw;
    if (!preg_match('/^\d+(\.\d+)?$/', $raw)) return '';
    return 'V' . $raw;
}

/**
 * Legacy statuses → migration-150 lifecycle states.
 */
function normalise_status(?string $raw): string
{
    $raw = strtolower(trim((string)$raw));
    if ($raw === '') return 'draft';
    $mapping = [
        'approved'         => 'released',
        'effective'        => 'released',
        'initial_release'  => 'released',
        'released'         => 'released',
        'draft'            => 'draft',
        'in_review'        => 'in_review',
        'pending_approval' => 'in_review',
        'superseded'       => 'superseded',
        'obsolete'         => 'obsolete',
    ];
    return $mapping[$raw] ?? 'draft';
}

/**
 * Parse an effective date from a legacy timestamp like "2026-03-25 08:59"
 * or an ISO-8601 string. Falls back to today on failure.
 */
function extract_effective_date(string $raw): string
{
    $raw = trim($raw);
    if ($raw === '') return date('Y-m-d');
    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $raw, $m)) {
        return $m[1];
    }
    $ts = strtotime($raw);
    return $ts !== false ? date('Y-m-d', $ts) : date('Y-m-d');
}

/**
 * Pick the revision to flag current. Priority:
 *   1. state.released_revision (normalised)
 *   2. state.revision (normalised)  — only when state.has_release is truthy
 *   3. highest versioned revision in the released list
 *
 * @param list<string>              $released
 * @param array<string, mixed>|null $state
 * @param array<string, mixed>      $legacyCatalog
 */
function pick_current_revision(array $released, ?array $state, array $legacyCatalog = []): string
{
    if (is_array($state)) {
        if (!empty($state['released_revision'])) {
            $r = normalise_revision((string)$state['released_revision']);
            if ($r !== '' && in_array($r, $released, true)) return $r;
        }
        if (!empty($state['has_release']) && !empty($state['revision'])) {
            $r = normalise_revision((string)$state['revision']);
            if ($r !== '' && in_array($r, $released, true)) return $r;
        }
    }
    if (!empty($legacyCatalog['rev'])) {
        $r = normalise_revision((string)$legacyCatalog['rev']);
        if ($r !== '' && in_array($r, $released, true)) return $r;
    }
    // Highest numeric rank.
    usort($released, static function (string $a, string $b): int {
        $ra = revision_rank($a);
        $rb = revision_rank($b);
        return $rb <=> $ra;
    });
    return $released[0] ?? '';
}

function revision_rank(string $r): float
{
    if (!preg_match('/^V(\d+)(?:\.(\d+))?$/', $r, $m)) return 0.0;
    $major = (int)$m[1];
    $minor = isset($m[2]) ? (int)$m[2] : 0;
    return $major + ($minor / 1000.0);
}

/**
 * Upsert the header using normalised legacy values. If the row does not
 * exist, create it with the legacy revision / effective date / roles /
 * status. If it exists, patch only the fields we know the legacy store
 * authoritatively owns so we do not clobber portal edits.
 *
 * @param array<string, mixed>                                  $state
 * @param array<string, mixed>                                  $legacyCatalog
 * @param array<string, array{owner: string, approver: string}> $docTypeCatalog
 * @param array<string, int>                                    $stats
 * @param array<int, string>                                    $warnings
 */
function upsert_header_from_legacy(
    DocumentControlService $service,
    \MOM\Database\DataLayer $dl,
    string $code,
    string $absPath,
    array $state,
    array $legacyCatalog,
    ?string $legacyDescription,
    array $docTypeCatalog,
    array $opts,
    array &$stats,
    array &$warnings,
    string $rel
): void {
    $docType   = doc_type_from_code($code);
    $defaults  = $docTypeCatalog[$docType] ?? [];
    $ownerDef    = $defaults['owner']    ?? 'QA';
    $approverDef = $defaults['approver'] ?? 'CEO';

    $revision  = normalise_revision((string)($state['revision'] ?? ($state['released_revision'] ?? ($legacyCatalog['rev'] ?? ''))));
    if ($revision === '') $revision = 'V0';
    $status    = normalise_status($state['status'] ?? ($legacyCatalog['status'] ?? null));
    $effective = extract_effective_date((string)($state['effective_date'] ?? ($state['updated_at'] ?? '')));
    $html      = @file_get_contents($absPath);
    $catalogTitle = trim((string)($legacyCatalog['title'] ?? ''));
    $catalogSubtitle = trim((string)($legacyCatalog['description'] ?? ($legacyDescription ?? '')));
    $derivedTitle = derive_backfill_title(
        is_string($html) ? $html : '',
        $code,
        $absPath,
        $catalogTitle
    );
    $derivedSubtitle = derive_backfill_subtitle(
        is_string($html) ? $html : '',
        $catalogSubtitle
    );

    $owner     = normalise_role((string)($state['owner'] ?? ($legacyCatalog['owner'] ?? '')), $ownerDef, 'owner_role_code', $code, $warnings, $stats);
    $approver  = normalise_role((string)($state['approver'] ?? ($legacyCatalog['approver'] ?? ($legacyCatalog['approved_by'] ?? ''))), $approverDef, 'approver_role_code', $code, $warnings, $stats);

    $existing = $dl->query(
        "SELECT doc_code, title, subtitle, revision, status, owner_role_code,
                approver_role_code, effective_date, updated_by
         FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
        [':c' => $code]
    ) ?? [];

    if ($existing === []) {
        if ($opts['dry_run']) {
            $stats['headers_upserted']++;
            if ($opts['verbose']) echo "[dry ] would INSERT header $code ($revision, $status)\n";
            return;
        }
        // No row at all — create with minimal values. Title defaults to code;
        // migrate.php's HTML pass will have populated a proper title already.
        $dl->execute(
            "INSERT INTO dcc_document_header
                (doc_code, title, doc_type, revision, effective_date,
                 subtitle, owner_role_code, approver_role_code, status, locale_default,
                 metadata, created_at, created_by, updated_at, updated_by)
             VALUES
                (:c, :t, :dt, :r, :e,
                 :sub,
                 :o, :a, :s, 'vi',
                 '{}'::jsonb, now(), 'dcc-backfill', now(), 'dcc-backfill')",
            [
                ':c'  => $code,
                ':t'  => $derivedTitle !== '' ? $derivedTitle : $code,
                ':dt' => $docType,
                ':r'  => $revision,
                ':e'  => $effective,
                ':sub' => $derivedSubtitle,
                ':o'  => $owner,
                ':a'  => $approver,
                ':s'  => $status,
            ]
        );
        $stats['headers_upserted']++;
        if ($opts['verbose']) echo "[ok  ] INSERT header $code ($revision, $status)\n";
        return;
    }

    $current = $existing[0];
    $sets    = [];
    $params  = [':c' => $code];

    $cmp = static fn (string $a, string $b): bool => strtolower(trim($a)) !== strtolower(trim($b));

    if ($cmp((string)$current['revision'], $revision)) {
        $sets[] = 'revision = :r';
        $params[':r'] = $revision;
    }
    $currentTitle = trim((string)($current['title'] ?? ''));
    $currentUpdatedBy = trim((string)($current['updated_by'] ?? ''));
    if (($currentTitle === '' || strtoupper($currentTitle) === $code || $currentUpdatedBy === 'dcc-backfill')
        && $derivedTitle !== ''
        && strtoupper($derivedTitle) !== $code) {
        $sets[] = 'title = :t';
        $params[':t'] = $derivedTitle;
    }
    $currentSubtitle = trim((string)($current['subtitle'] ?? ''));
    if ($currentSubtitle === '' && $derivedSubtitle !== null && trim($derivedSubtitle) !== '') {
        $sets[] = 'subtitle = :sub';
        $params[':sub'] = $derivedSubtitle;
    }
    if ((string)($current['effective_date'] ?? '') !== $effective) {
        $sets[] = 'effective_date = :e';
        $params[':e'] = $effective;
    }
    if ($cmp((string)$current['owner_role_code'], $owner)) {
        $sets[] = 'owner_role_code = :o';
        $params[':o'] = $owner;
    }
    if ($cmp((string)$current['approver_role_code'], $approver)) {
        $sets[] = 'approver_role_code = :a';
        $params[':a'] = $approver;
    }
    if ($cmp((string)$current['status'], $status)) {
        $sets[] = 'status = :s';
        $params[':s'] = $status;
    }

    if ($sets === []) {
        $stats['headers_unchanged']++;
        return;
    }
    if ($opts['dry_run']) {
        $stats['headers_upserted']++;
        if ($opts['verbose']) echo "[dry ] would UPDATE header $code (" . implode(',', $sets) . ")\n";
        return;
    }
    $sets[] = "updated_by = 'dcc-backfill'";
    $sql = "UPDATE dcc_document_header SET " . implode(', ', $sets) . " WHERE doc_code = :c";
    $dl->execute($sql, $params);
    $stats['headers_upserted']++;
    if ($opts['verbose']) echo "[ok  ] UPDATE header $code (" . implode(',', $sets) . ")\n";
}

function derive_backfill_title(string $html, string $code, string $absPath, string $catalogTitle = ''): string
{
    $catalogTitle = strip_brand_suffix(strip_code_prefix(clean_text($catalogTitle), $code));
    if ($catalogTitle !== '' && strtoupper($catalogTitle) !== strtoupper($code)) {
        return $catalogTitle;
    }

    if (preg_match('/data-dcc-bootstrap\s*=\s*([\'"])(.*?)\1/is', $html, $m)) {
        $raw = html_entity_decode((string)$m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $seed = json_decode($raw, true);
        if (is_array($seed) && isset($seed['header']['title'])) {
            $candidate = strip_brand_suffix(strip_code_prefix(clean_text((string)$seed['header']['title']), $code));
            if ($candidate !== '' && strtoupper($candidate) !== strtoupper($code)) {
                return $candidate;
            }
        }
    }

    if (preg_match('/<title[^>]*>(.*?)<\/title>/isu', $html, $m)) {
        $candidate = strip_brand_suffix(strip_code_prefix(clean_text((string)$m[1]), $code));
        if ($candidate !== '' && strtoupper($candidate) !== strtoupper($code)) {
            return $candidate;
        }
    }

    return extract_title($html, $code, $absPath);
}

function derive_backfill_subtitle(string $html, string $catalogSubtitle = ''): ?string
{
    $catalogSubtitle = clean_text($catalogSubtitle);
    if ($catalogSubtitle !== '') {
        return $catalogSubtitle;
    }
    $subtitle = extract_subtitle($html);
    if ($subtitle === null) {
        return null;
    }
    $subtitle = clean_text($subtitle);
    return $subtitle !== '' ? $subtitle : null;
}

/**
 * Record the current filesystem filename + path on the header row. No-op
 * when the header row does not yet exist (e.g. --only-revisions runs).
 */
function maybe_anchor_filename(
    DocumentControlService $service,
    \MOM\Database\DataLayer $dl,
    string $code,
    string $abs,
    string $rootDir,
    array &$stats,
    array $opts
): void {
    $existing = $dl->query(
        "SELECT doc_code, filename FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
        [':c' => $code]
    ) ?? [];
    if ($existing === []) {
        return;
    }
    $filename = basename($abs);
    $relPath  = rel_from_root($abs, $rootDir);
    if (trim((string)($existing[0]['filename'] ?? '')) === $filename) {
        return;
    }
    if ($opts['dry_run']) {
        $stats['filename_anchored']++;
        if ($opts['verbose']) echo "[dry ] would updateFilenameAnchor $code $filename\n";
        return;
    }
    try {
        $service->updateFilenameAnchor($code, $filename, $relPath);
        $stats['filename_anchored']++;
        if ($opts['verbose']) echo "[ok  ] updateFilenameAnchor $code $filename\n";
    } catch (\Throwable $e) {
        $stats['errors']++;
        echo "[err ] updateFilenameAnchor failed $code: " . $e->getMessage() . "\n";
    }
}
