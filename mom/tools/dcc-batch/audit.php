<?php

declare(strict_types=1);

/**
 * DCC Batch Migration — Audit Script (read-only)
 * ==============================================
 *
 * Walks every controlled HTML document under `mom/docs/**` and reports
 * which ones do NOT satisfy the DCC header pattern. Exits with code 0
 * when everything is clean, 1 when any failures are found.
 *
 * Usage (run from the project root):
 *   php mom/tools/dcc-batch/audit.php                       # human report
 *   php mom/tools/dcc-batch/audit.php --json                # JSON to stdout
 *   php mom/tools/dcc-batch/audit.php --filter-prefix=QMS   # only QMS-* docs
 *   php mom/tools/dcc-batch/audit.php --verbose             # per-file detail
 *
 * Compliance checks (per file):
 *   C1  HTML readable
 *   C2  Canonical doc_code derivable from filename
 *   C3  DCC bootstrap script present in <head>
 *   C4  DCC body placeholder present (<div class="dcc-header" data-dcc-doc-code>)
 *   C5  Placeholder data-dcc-doc-code matches canonical-from-filename
 *   C6  No legacy <div class="form-header"> remaining
 *   C7  No legacy <div class="title"><strong class="doc-name"> outside dcc-header
 *   C8  DB row exists in dcc_document_header for the canonical code
 *   C9  DB row title is non-empty
 *   C10 DB row doc_type is valid
 *
 * Each violation is categorised so we can drive the migrate script to
 * fix specific buckets in batches.
 *
 * @since 4.1.0
 */

require __DIR__ . '/lib.php';

use function MOM\Tools\DccBatch\walk_docs;
use function MOM\Tools\DccBatch\code_from_filename;
use function MOM\Tools\DccBatch\has_dcc_bootstrap;
use function MOM\Tools\DccBatch\has_dcc_placeholder;
use function MOM\Tools\DccBatch\extract_placeholder_code;
use function MOM\Tools\DccBatch\has_legacy_form_header;
use function MOM\Tools\DccBatch\has_legacy_title_block_outside_dcc;
use function MOM\Tools\DccBatch\build_data_layer;

$ROOT_DIR = realpath(__DIR__ . '/../../..');  // mom/tools/dcc-batch → repo root

$opts = parse_argv($argv);

$dl = build_data_layer($ROOT_DIR);
if (!$dl) {
    fwrite(STDERR, "[audit] DB unavailable — DB checks (C8-C10) will be skipped.\n");
}

$dbHeaders = [];
if ($dl) {
    try {
        $rows = $dl->query("SELECT doc_code, title, doc_type, subtitle FROM dcc_document_header") ?? [];
        foreach ($rows as $r) {
            $dbHeaders[strtoupper((string)$r['doc_code'])] = $r;
        }
    } catch (\Throwable $e) {
        fwrite(STDERR, "[audit] DB query failed: " . $e->getMessage() . "\n");
        $dl = null;
    }
}

$results = [];
$buckets = [
    'C1_unreadable'                 => 0,
    'C2_no_canonical_code'          => 0,
    'C3_missing_bootstrap'          => 0,
    'C4_missing_placeholder'        => 0,
    'C5_placeholder_code_mismatch'  => 0,
    'C6_legacy_form_header'         => 0,
    'C7_legacy_title_block'         => 0,
    'C8_missing_db_row'             => 0,
    'C9_empty_db_title'             => 0,
    'C10_invalid_db_doc_type'       => 0,
];
$validDocTypes = ['MAN','POL','SOP','WI','FRM','ANNEX','JD','DEPT','ORG','REF','TRN'];

$total = 0;
$compliant = 0;
foreach (walk_docs($ROOT_DIR) as $abs) {
    $rel = substr($abs, strlen($ROOT_DIR) + 1);
    $entry = ['path' => $rel, 'violations' => [], 'code' => null];

    $code = code_from_filename($abs);
    if ($code === '') {
        $entry['violations'][] = 'C2_no_canonical_code';
        $buckets['C2_no_canonical_code']++;
        $results[] = $entry;
        $total++;
        continue;
    }

    if ($opts['filter_prefix'] !== '' && !str_starts_with($code, $opts['filter_prefix'])) {
        continue;
    }

    $entry['code'] = $code;
    $total++;

    $html = @file_get_contents($abs);
    if (!is_string($html) || $html === '') {
        $entry['violations'][] = 'C1_unreadable';
        $buckets['C1_unreadable']++;
        $results[] = $entry;
        continue;
    }
    // Skip malformed fragments (no <head> = partial include, not a real doc)
    if (!preg_match('#<head\b#i', $html)) {
        $entry['violations'][] = 'SKIP_malformed_no_head';
        $buckets['SKIP_malformed_no_head'] = ($buckets['SKIP_malformed_no_head'] ?? 0) + 1;
        $results[] = $entry;
        continue;
    }

    if (!has_dcc_bootstrap($html)) {
        $entry['violations'][] = 'C3_missing_bootstrap';
        $buckets['C3_missing_bootstrap']++;
    }
    if (!has_dcc_placeholder($html)) {
        $entry['violations'][] = 'C4_missing_placeholder';
        $buckets['C4_missing_placeholder']++;
    } else {
        $placeholderCode = extract_placeholder_code($html);
        if ($placeholderCode !== null && $placeholderCode !== $code) {
            $entry['violations'][] = 'C5_placeholder_code_mismatch:' . $placeholderCode;
            $buckets['C5_placeholder_code_mismatch']++;
        }
    }
    if (has_legacy_form_header($html)) {
        $entry['violations'][] = 'C6_legacy_form_header';
        $buckets['C6_legacy_form_header']++;
    }
    if (has_legacy_title_block_outside_dcc($html)) {
        $entry['violations'][] = 'C7_legacy_title_block';
        $buckets['C7_legacy_title_block']++;
    }

    if ($dl) {
        $row = $dbHeaders[strtoupper($code)] ?? null;
        if (!$row) {
            $entry['violations'][] = 'C8_missing_db_row';
            $buckets['C8_missing_db_row']++;
        } else {
            $title = trim((string)$row['title']);
            if ($title === '' || strtoupper($title) === strtoupper($code)) {
                $entry['violations'][] = 'C9_empty_db_title';
                $buckets['C9_empty_db_title']++;
            }
            if (!in_array((string)$row['doc_type'], $validDocTypes, true)) {
                $entry['violations'][] = 'C10_invalid_db_doc_type:' . $row['doc_type'];
                $buckets['C10_invalid_db_doc_type']++;
            }
        }
    }

    if (empty($entry['violations'])) {
        $compliant++;
    }
    $results[] = $entry;
}

if ($opts['json']) {
    echo json_encode([
        'total'      => $total,
        'compliant'  => $compliant,
        'violations' => $buckets,
        'files'      => $results,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
} else {
    print_human_report($total, $compliant, $buckets, $results, $opts['verbose']);
}

$failures = $total - $compliant;
exit($failures > 0 ? 1 : 0);

/* ──────────────────────────────────────────────────────────────────────── */

function parse_argv(array $argv): array
{
    $opts = [
        'json'          => false,
        'verbose'       => false,
        'filter_prefix' => '',
    ];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--json')                $opts['json'] = true;
        elseif ($arg === '--verbose' || $arg === '-v') $opts['verbose'] = true;
        elseif (str_starts_with($arg, '--filter-prefix=')) {
            $opts['filter_prefix'] = strtoupper(substr($arg, strlen('--filter-prefix=')));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 1500);
            exit(0);
        }
    }
    return $opts;
}

function print_human_report(int $total, int $compliant, array $buckets, array $results, bool $verbose): void
{
    $failed = $total - $compliant;
    echo "\n============================================================\n";
    echo " DCC Header Audit Report\n";
    echo "============================================================\n";
    echo " Files inspected     : {$total}\n";
    echo " Fully compliant     : {$compliant}\n";
    echo " With violations     : {$failed}\n";
    echo "------------------------------------------------------------\n";
    echo " Violations by bucket:\n";
    foreach ($buckets as $key => $count) {
        if ($count === 0) continue;
        printf("   %-32s %5d\n", $key, $count);
    }
    if (array_sum($buckets) === 0) {
        echo "   (none — all good)\n";
    }
    echo "============================================================\n\n";

    if ($verbose) {
        echo "First 30 non-compliant files:\n";
        $shown = 0;
        foreach ($results as $r) {
            if (empty($r['violations'])) continue;
            printf("  [%-15s] %s\n", $r['code'] ?? '?', $r['path']);
            foreach ($r['violations'] as $v) {
                echo "      ↳ $v\n";
            }
            if (++$shown >= 30) break;
        }
        if ($shown === 0) {
            echo "  (no failures)\n";
        }
        echo "\n";
    }
}
