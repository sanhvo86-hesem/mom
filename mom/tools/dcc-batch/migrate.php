<?php

declare(strict_types=1);

/**
 * DCC Batch Migration — Migrate / Fix Script
 * ==========================================
 *
 * Brings every controlled HTML document under `mom/docs/**` into
 * compliance with the DCC header pattern:
 *
 *   • Injects (or refreshes) the head bootstrap script.
 *   • Replaces any legacy `<div class="form-header">` with the canonical
 *     `<div class="dcc-header" data-dcc-doc-code="…">` placeholder.
 *   • Strips the legacy ISO-section title concatenation (replaces with
 *     `<div class="iso-title">…</div>`).
 *   • Upserts a `dcc_document_header` row keyed on the canonical code,
 *     extracting an initial title (from old <h1> / <strong class="doc-name">
 *     / <title> / filename) and subtitle (from <span class="sub-vn">).
 *   • Idempotent — safe to re-run; only changes what is out of compliance.
 *
 * Usage (run from the project root):
 *   php mom/tools/dcc-batch/migrate.php --dry-run            # preview only
 *   php mom/tools/dcc-batch/migrate.php --filter-prefix=QMS  # only QMS-* files
 *   php mom/tools/dcc-batch/migrate.php --limit=20           # cap iterations
 *   php mom/tools/dcc-batch/migrate.php --no-db              # skip DB upsert
 *   php mom/tools/dcc-batch/migrate.php --no-html            # skip HTML edits
 *   php mom/tools/dcc-batch/migrate.php --verbose
 *
 * Exit 0 on success, 1 if anything failed.
 *
 * @since 4.1.0
 */

require __DIR__ . '/lib.php';

use function MOM\Tools\DccBatch\walk_docs;
use function MOM\Tools\DccBatch\is_html_path;
use function MOM\Tools\DccBatch\code_from_filename;
use function MOM\Tools\DccBatch\code_from_filename_loose;
use function MOM\Tools\DccBatch\doc_type_from_code;
use function MOM\Tools\DccBatch\extract_title;
use function MOM\Tools\DccBatch\extract_subtitle;
use function MOM\Tools\DccBatch\has_dcc_bootstrap;
use function MOM\Tools\DccBatch\has_dcc_placeholder;
use function MOM\Tools\DccBatch\extract_placeholder_code;
use function MOM\Tools\DccBatch\has_legacy_form_header;
use function MOM\Tools\DccBatch\has_legacy_title_block_outside_dcc;
use function MOM\Tools\DccBatch\inject_or_replace_bootstrap;
use function MOM\Tools\DccBatch\inject_or_replace_placeholder;
use function MOM\Tools\DccBatch\clean_iso_title_concat;
use function MOM\Tools\DccBatch\strip_legacy_title_meta_after_placeholder;
use function MOM\Tools\DccBatch\strip_redundant_title_blocks;
use function MOM\Tools\DccBatch\build_placeholder;
use function MOM\Tools\DccBatch\logo_path_for;
use function MOM\Tools\DccBatch\build_data_layer;
use function MOM\Tools\DccBatch\load_doc_descriptions;

$ROOT_DIR = realpath(__DIR__ . '/../../..');

$opts = parse_argv($argv);

$dl = ($opts['no_db']) ? null : build_data_layer($ROOT_DIR);
if (!$dl && !$opts['no_db']) {
    fwrite(STDERR, "[migrate] DB unavailable; pass --no-db to skip DB upserts.\n");
    exit(1);
}

/* Pre-load existing DB rows so we know what already has metadata. */
$dbHeaders = [];
if ($dl) {
    try {
        $rows = $dl->query("SELECT doc_code, title, subtitle, doc_type FROM dcc_document_header") ?? [];
        foreach ($rows as $r) {
            $dbHeaders[strtoupper((string)$r['doc_code'])] = $r;
        }
    } catch (\Throwable $e) {
        fwrite(STDERR, "[migrate] DB query failed: " . $e->getMessage() . "\n");
        exit(1);
    }
}

$stats = [
    'inspected'        => 0,
    'skipped_no_code'  => 0,
    'html_changed'     => 0,
    'html_unchanged'   => 0,
    'html_errors'      => 0,
    'db_inserted'      => 0,
    'db_updated'       => 0,
    'db_unchanged'     => 0,
    'db_errors'        => 0,
];

$docDescriptions = load_doc_descriptions($ROOT_DIR);

$processed = 0;
foreach (walk_docs($ROOT_DIR) as $abs) {
    $rel  = substr($abs, strlen($ROOT_DIR) + 1);
    // Loose extraction handles both standard (FRM-403) and underscore-separated
    // form filenames (FRM-403_SCAR.xlsx) which are common in mom/docs/forms/.
    $code = is_html_path($abs) ? code_from_filename($abs) : code_from_filename_loose($abs);
    if ($code === '') {
        $stats['skipped_no_code']++;
        if ($opts['verbose']) echo "[skip] no code → $rel\n";
        continue;
    }
    if ($opts['filter_prefix'] !== '' && !str_starts_with($code, $opts['filter_prefix'])) {
        continue;
    }

    $stats['inspected']++;
    $changes = [];

    /* ════════════════════════════════════════════════════════════════════
     * NON-HTML BRANCH: Excel forms etc. — DB-only pass.
     * Excel files cannot host an HTML script, so we just ensure a DB row
     * exists. Title comes from filename; subtitle from doc_descriptions.json.
     * ════════════════════════════════════════════════════════════════════ */
    if (!is_html_path($abs)) {
        $stats['nonhtml_inspected'] = ($stats['nonhtml_inspected'] ?? 0) + 1;
        $extractedTitle    = title_from_filename_for_form($abs, $code);
        $extractedSubtitle = $docDescriptions[$code] ?? null;
        if ($subtitleStr = ($extractedSubtitle ? trim((string)$extractedSubtitle) : '')) {
            $extractedSubtitle = $subtitleStr;
        } else {
            $extractedSubtitle = null;
        }
        if ($dl && !$opts['no_db']) {
            upsert_db_row($dl, $dbHeaders, $stats, $opts, $code, $extractedTitle, $extractedSubtitle);
        }
        if ($opts['limit'] > 0 && ++$processed >= $opts['limit']) {
            echo "[info] hit --limit={$opts['limit']}, stopping.\n";
            break;
        }
        continue;
    }

    /* ════════════════════════════════════════════════════════════════════
     * HTML BRANCH: full DCC pattern (head + body + DB row)
     * ════════════════════════════════════════════════════════════════════ */
    $html = @file_get_contents($abs);
    if (!is_string($html)) {
        $stats['html_errors']++;
        echo "[err ] cannot read $rel\n";
        continue;
    }
    // Skip malformed fragments (no <head> means it's a partial / include).
    // The DCC pattern requires a real document structure to mount onto.
    if (!preg_match('#<head\b#i', $html)) {
        $stats['skipped_malformed'] = ($stats['skipped_malformed'] ?? 0) + 1;
        if ($opts['verbose']) echo "[skip] malformed (no <head>) → $rel\n";
        continue;
    }

    // ── Extract metadata BEFORE we mutate the HTML, so we can use legacy
    //    title/subtitle as the seed for the DB row when it is missing.
    //
    //    Subtitle priority chain:
    //      1. <span class="sub-vn">           (extract_subtitle, in lib)
    //      2. data-dcc-bootstrap seed         (extract_subtitle, in lib)
    //      3. doc_descriptions.json[code]     (this script, file-based fallback)
    //
    //    The legacy listing card already reads (3) so authors who set a
    //    description via the old "Save description" path expect it to flow
    //    into the DCC ribbon too.
    $extractedTitle    = extract_title($html, $code, $abs);
    $extractedSubtitle = extract_subtitle($html);
    if ($extractedSubtitle === null) {
        $fromDesc = $docDescriptions[$code] ?? null;
        if (is_string($fromDesc) && trim($fromDesc) !== '') {
            $extractedSubtitle = trim($fromDesc);
        }
    }

    // ── HTML pass ──────────────────────────────────────────────────────
    if (!$opts['no_html']) {
        $next = $html;

        if (!has_dcc_bootstrap($next) || $opts['force_bootstrap']) {
            $candidate = inject_or_replace_bootstrap($next);
            if ($candidate !== $next) { $next = $candidate; $changes[] = 'bootstrap'; }
        }

        $needsPlaceholder = !has_dcc_placeholder($next)
                            || extract_placeholder_code($next) !== $code
                            || $opts['force_placeholder'];

        if ($needsPlaceholder || has_legacy_form_header($next)) {
            $logo = logo_path_for($abs, $ROOT_DIR);
            $existingDb = $dbHeaders[strtoupper($code)] ?? null;
            $seedTitle    = $existingDb ? trim((string)$existingDb['title'])    : $extractedTitle;
            $seedSubtitle = $existingDb ? (trim((string)($existingDb['subtitle'] ?? '')) ?: null)
                                        : $extractedSubtitle;
            if ($seedTitle === '') $seedTitle = $extractedTitle ?: $code;

            $placeholder = build_placeholder($code, $seedTitle, $seedSubtitle, $logo);
            $candidate = inject_or_replace_placeholder($next, $placeholder);
            if ($candidate !== $next) { $next = $candidate; $changes[] = 'placeholder'; }
        }

        // Strip the flattened legacy title + meta blocks that may sit
        // immediately AFTER the dcc-header placeholder (common in SOPs).
        // This must run AFTER inject_or_replace_placeholder so the anchor exists.
        $candidate = strip_legacy_title_meta_after_placeholder($next);
        if ($candidate !== $next) { $next = $candidate; $changes[] = 'strip_legacy_title_meta'; }

        // Strip redundant title blocks ANYWHERE in the body that visually
        // duplicate the DCC ribbon (h1 with "CODE - Title", or POL-style
        // card+badge+h1+mini-note overview wrapper).
        $candidate = strip_redundant_title_blocks($next, $code);
        if ($candidate !== $next) { $next = $candidate; $changes[] = 'strip_redundant_titles'; }

        if (has_legacy_title_block_outside_dcc($next)) {
            $candidate = clean_iso_title_concat($next);
            if ($candidate !== $next) { $next = $candidate; $changes[] = 'iso_title_clean'; }
        }

        if ($next !== $html) {
            if ($opts['dry_run']) {
                $stats['html_changed']++;
                echo "[dry ] would change $rel  (" . implode(',', $changes) . ")\n";
            } else {
                if (@file_put_contents($abs, $next) === false) {
                    $stats['html_errors']++;
                    echo "[err ] write failed $rel\n";
                } else {
                    $stats['html_changed']++;
                    if ($opts['verbose']) echo "[ok  ] changed $rel  (" . implode(',', $changes) . ")\n";
                }
            }
        } else {
            $stats['html_unchanged']++;
        }
    }

    // ── DB pass (HTML branch) ──────────────────────────────────────────
    if ($dl && !$opts['no_db']) {
        upsert_db_row($dl, $dbHeaders, $stats, $opts, $code, $extractedTitle, $extractedSubtitle);
    }

    if ($opts['limit'] > 0 && ++$processed >= $opts['limit']) {
        echo "[info] hit --limit={$opts['limit']}, stopping.\n";
        break;
    }
}

/* ── Summary ──────────────────────────────────────────────────────────── */
echo "\n============================================================\n";
echo " DCC Header Migration Summary " . ($opts['dry_run'] ? '(DRY-RUN)' : '(APPLIED)') . "\n";
echo "============================================================\n";
foreach ($stats as $k => $v) printf(" %-22s %d\n", $k, $v);
echo "============================================================\n";

exit(($stats['html_errors'] + $stats['db_errors']) > 0 ? 1 : 0);

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Derive a human-readable title from a form filename like
 *   `FRM-101_Master_Document_Register.xlsx`
 * Strips the leading code, replaces underscores/dashes with spaces, and
 * applies title case. Returns the bare code if nothing meaningful remains.
 */
function title_from_filename_for_form(string $absPath, string $code): string
{
    $stem = preg_replace('/\.[^.]+$/', '', basename($absPath)) ?? basename($absPath);
    // Strip leading code with optional separator
    $stem = preg_replace('/^' . preg_quote($code, '/') . '[_\-]?/i', '', (string)$stem) ?? $stem;
    if (trim((string)$stem) === '') return $code;
    $words = preg_split('/[_\-]+/u', strtolower((string)$stem)) ?: [];
    $words = array_map('ucfirst', $words);
    $title = trim(implode(' ', $words));
    return $title !== '' ? $title : $code;
}

/**
 * Idempotent INSERT/UPDATE helper for `dcc_document_header`.
 * Mutates $stats and $dbHeaders in place; honours $opts['dry_run'].
 */
function upsert_db_row(
    \MOM\Database\DataLayer $dl,
    array &$dbHeaders,
    array &$stats,
    array $opts,
    string $code,
    string $title,
    ?string $subtitle
): void {
    $key      = strtoupper($code);
    $existing = $dbHeaders[$key] ?? null;
    $title    = $title !== '' ? $title : $code;
    $docType  = \MOM\Tools\DccBatch\doc_type_from_code($code);
    $validDocTypes = ['MAN','POL','SOP','WI','FRM','ANNEX','JD','DEPT','ORG','REF','TRN'];

    if (!$existing) {
        if ($opts['dry_run']) {
            $stats['db_inserted']++;
            echo "[dry ] would INSERT db row $code\n";
            return;
        }
        try {
            $dl->execute(
                "INSERT INTO dcc_document_header
                 (doc_code, title, subtitle, doc_type, revision, effective_date,
                  owner_role_code, approver_role_code, status, locale_default,
                  metadata, created_at, created_by, updated_at, updated_by)
                 VALUES
                 (:c, :t, :s, :dt, 'V0', CURRENT_DATE,
                  'QA', 'CEO', 'draft', 'vi',
                  '{}'::jsonb, now(), 'dcc-batch', now(), 'dcc-batch')",
                [':c' => $code, ':t' => $title, ':s' => $subtitle, ':dt' => $docType]
            );
            $dbHeaders[$key] = [
                'doc_code' => $code, 'title' => $title,
                'subtitle' => $subtitle, 'doc_type' => $docType,
            ];
            $stats['db_inserted']++;
            if ($opts['verbose']) echo "[ok  ] db INSERT $code\n";
        } catch (\Throwable $e) {
            $stats['db_errors']++;
            echo "[err ] db INSERT failed $code: " . $e->getMessage() . "\n";
        }
        return;
    }

    $needsUpdate = false;
    $set = [];
    $params = [':c' => $code];
    if (trim((string)$existing['title']) === '' || strtoupper(trim((string)$existing['title'])) === strtoupper($code)) {
        $set[] = "title = :t"; $params[':t'] = $title; $needsUpdate = true;
    }
    $existingDocType = (string)($existing['doc_type'] ?? '');
    if ($existingDocType === '' || !in_array($existingDocType, $validDocTypes, true)) {
        $set[] = "doc_type = :dt"; $params[':dt'] = $docType; $needsUpdate = true;
    }
    if ($subtitle !== null && trim((string)($existing['subtitle'] ?? '')) === '') {
        $set[] = "subtitle = :s"; $params[':s'] = $subtitle; $needsUpdate = true;
    }
    if (!$needsUpdate) {
        $stats['db_unchanged']++;
        return;
    }
    if ($opts['dry_run']) {
        $stats['db_updated']++;
        echo "[dry ] would UPDATE db row $code\n";
        return;
    }
    try {
        $set[] = "updated_by = 'dcc-batch'";
        $sql = "UPDATE dcc_document_header SET " . implode(', ', $set) . " WHERE doc_code = :c";
        $dl->execute($sql, $params);
        $stats['db_updated']++;
        if ($opts['verbose']) echo "[ok  ] db UPDATE $code\n";
    } catch (\Throwable $e) {
        $stats['db_errors']++;
        echo "[err ] db UPDATE failed $code: " . $e->getMessage() . "\n";
    }
}

function parse_argv(array $argv): array
{
    $opts = [
        'dry_run'           => false,
        'verbose'           => false,
        'filter_prefix'     => '',
        'limit'             => 0,
        'no_db'             => false,
        'no_html'           => false,
        'force_bootstrap'   => false,
        'force_placeholder' => false,
    ];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--dry-run')          $opts['dry_run']  = true;
        elseif ($arg === '--verbose' || $arg === '-v') $opts['verbose']  = true;
        elseif ($arg === '--no-db')        $opts['no_db']    = true;
        elseif ($arg === '--no-html')      $opts['no_html']  = true;
        elseif ($arg === '--force-bootstrap')   $opts['force_bootstrap']   = true;
        elseif ($arg === '--force-placeholder') $opts['force_placeholder'] = true;
        elseif (str_starts_with($arg, '--filter-prefix=')) {
            $opts['filter_prefix'] = strtoupper(substr($arg, strlen('--filter-prefix=')));
        } elseif (str_starts_with($arg, '--limit=')) {
            $opts['limit'] = (int)substr($arg, strlen('--limit='));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 1700);
            exit(0);
        }
    }
    return $opts;
}
