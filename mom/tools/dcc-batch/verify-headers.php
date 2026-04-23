<?php

declare(strict_types=1);

/**
 * DCC Batch — Header Template Verifier
 * ====================================
 *
 * SIMULATES the rendered DCC ribbon for every doc and verifies it conforms
 * to the canonical template:
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  [HESEM logo]   <Title>                                          │
 *   │                  <subtitle (optional, Vietnamese)>               │
 *   │  ─────────────── orange separator ────────────────────────────── │
 *   │  ID: <code> │ REV: V0 │ EFF: <date> │ OWNER: <role> │ APPR: …   │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Per-row template checks:
 *   T1  title          non-empty AND not equal to bare code
 *   T2  doc_code       matches expected canonical pattern
 *   T3  doc_type       in {MAN,POL,SOP,WI,FRM,ANNEX,JD,DEPT,ORG,REF,TRN}
 *   T4  revision       matches /^V\d+(\.\d+)?$/
 *   T5  effective_date matches /^\d{4}-\d{2}-\d{2}$/
 *   T6  owner_role     non-empty, single-role (no /,;|whitespace)
 *   T7  approver_role  non-empty, single-role
 *   T8  status         in {draft,in_review,approved,released,superseded,obsolete}
 *   T9  subtitle       null OR non-whitespace string (no leading/trailing space)
 *   T10 (HTML only)    placeholder data-dcc-doc-code matches DB doc_code
 *
 * Usage (run from project root):
 *   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php
 *   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php --filter-prefix=FRM
 *   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php --json
 *   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php --verbose
 *
 * Exit 0 if every row passes, 1 otherwise.
 */

require __DIR__ . '/lib.php';

use function MOM\Tools\DccBatch\walk_docs;
use function MOM\Tools\DccBatch\is_html_path;
use function MOM\Tools\DccBatch\code_from_filename;
use function MOM\Tools\DccBatch\code_from_filename_loose;
use function MOM\Tools\DccBatch\extract_placeholder_code;
use function MOM\Tools\DccBatch\build_data_layer;

$ROOT_DIR = realpath(__DIR__ . '/../../..');
$opts = parse_argv($argv);

$dl = build_data_layer($ROOT_DIR);
if (!$dl) {
    fwrite(STDERR, "[verify] DB unavailable; cannot simulate headers.\n");
    exit(1);
}

/* ── Pre-load the entire dcc_document_header table ──────────────────── */
$rows = $dl->query("SELECT doc_code, title, subtitle, doc_type, revision,
                           effective_date, owner_role_code, approver_role_code,
                           status FROM dcc_document_header") ?? [];
$dbByCode = [];
foreach ($rows as $r) $dbByCode[strtoupper((string)$r['doc_code'])] = $r;

/* ── Walk filesystem to know which DB rows correspond to actual files ─ */
$fileByCode = [];
foreach (walk_docs($ROOT_DIR) as $abs) {
    $code = is_html_path($abs) ? code_from_filename($abs) : code_from_filename_loose($abs);
    if ($code === '') continue;
    $fileByCode[strtoupper($code)] = $abs;
}

$validDocTypes = ['MAN','POL','SOP','WI','FRM','ANNEX','JD','DEPT','ORG','REF','TRN'];
$validStatuses = ['draft','in_review','approved','released','superseded','obsolete'];
$singleRoleRe  = '/^[A-Z0-9_-]+$/';      // no whitespace, no /,;|
$revisionRe    = '/^V\d+(\.\d+)?$/';
$effectiveRe   = '/^\d{4}-\d{2}-\d{2}$/';
// Codes are usually multi-segment (FRM-403, QMS-MAN-001, JD-CHIEF-EXEC),
// but single-segment codes are valid for competency module pages (C01-C19).
// Some prefixes are 2 chars (WI, JD), so require only ≥2 chars on the first
// segment. Total length must still be ≥3.
$codeRe        = '#^[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*$#';

$results = [];
$buckets = [
    'T1_bad_title'         => 0,
    'T2_bad_code'          => 0,
    'T3_bad_doc_type'      => 0,
    'T4_bad_revision'      => 0,
    'T5_bad_effective_date'=> 0,
    'T6_bad_owner'         => 0,
    'T7_bad_approver'      => 0,
    'T8_bad_status'        => 0,
    'T9_bad_subtitle'      => 0,
    'T10_placeholder_drift'=> 0,
    'X_orphan_db_row'      => 0,   // DB row but no file on disk
    'X_orphan_file'        => 0,   // file on disk but no DB row
];

$total = 0;
$passed = 0;

foreach ($dbByCode as $key => $row) {
    if ($opts['filter_prefix'] !== '' && !str_starts_with($key, $opts['filter_prefix'])) continue;
    $total++;
    $entry = ['doc_code' => $row['doc_code'], 'fails' => [], 'simulated' => null];

    // T2: doc_code shape
    if (!preg_match($codeRe, (string)$row['doc_code'])) {
        $entry['fails'][] = 'T2_bad_code:' . $row['doc_code'];
        $buckets['T2_bad_code']++;
    }
    // T1: title
    $title = trim((string)$row['title']);
    if ($title === '' || strtoupper($title) === strtoupper((string)$row['doc_code'])) {
        $entry['fails'][] = 'T1_bad_title';
        $buckets['T1_bad_title']++;
    }
    // T3: doc_type
    if (!in_array((string)$row['doc_type'], $validDocTypes, true)) {
        $entry['fails'][] = 'T3_bad_doc_type:' . $row['doc_type'];
        $buckets['T3_bad_doc_type']++;
    }
    // T4: revision
    if (!preg_match($revisionRe, (string)$row['revision'])) {
        $entry['fails'][] = 'T4_bad_revision:' . $row['revision'];
        $buckets['T4_bad_revision']++;
    }
    // T5: effective_date
    if (!preg_match($effectiveRe, (string)$row['effective_date'])) {
        $entry['fails'][] = 'T5_bad_effective_date:' . $row['effective_date'];
        $buckets['T5_bad_effective_date']++;
    }
    // T6/T7: roles single + non-empty
    foreach (['owner_role_code' => 'T6_bad_owner', 'approver_role_code' => 'T7_bad_approver'] as $col => $bucket) {
        $v = trim((string)$row[$col]);
        if ($v === '' || !preg_match($singleRoleRe, $v)) {
            $entry['fails'][] = $bucket . ':' . $v;
            $buckets[$bucket]++;
        }
    }
    // T8: status
    if (!in_array((string)$row['status'], $validStatuses, true)) {
        $entry['fails'][] = 'T8_bad_status:' . $row['status'];
        $buckets['T8_bad_status']++;
    }
    // T9: subtitle (null OK; if string, must be trimmed and non-empty)
    if ($row['subtitle'] !== null) {
        $sub = (string)$row['subtitle'];
        if ($sub !== trim($sub) || $sub === '') {
            $entry['fails'][] = 'T9_bad_subtitle';
            $buckets['T9_bad_subtitle']++;
        }
    }
    // X_orphan_db_row: DB has row, but no file matches
    if (!isset($fileByCode[$key])) {
        $entry['fails'][] = 'X_orphan_db_row';
        $buckets['X_orphan_db_row']++;
    }
    // T10: HTML placeholder data-dcc-doc-code matches DB code
    if (isset($fileByCode[$key]) && is_html_path($fileByCode[$key])) {
        $html = @file_get_contents($fileByCode[$key]);
        if (is_string($html)) {
            $pCode = extract_placeholder_code($html);
            if ($pCode !== null && strtoupper($pCode) !== $key) {
                $entry['fails'][] = 'T10_placeholder_drift:' . $pCode;
                $buckets['T10_placeholder_drift']++;
            }
        }
    }

    // Build the simulated render snapshot the renderer would produce
    $entry['simulated'] = simulate_ribbon($row);

    if (empty($entry['fails'])) $passed++;
    $results[] = $entry;
}

// Also detect orphan files (file exists but no DB row)
foreach ($fileByCode as $key => $abs) {
    if (isset($dbByCode[$key])) continue;
    if ($opts['filter_prefix'] !== '' && !str_starts_with($key, $opts['filter_prefix'])) continue;
    $buckets['X_orphan_file']++;
    $results[] = [
        'doc_code'  => $key,
        'fails'     => ['X_orphan_file:' . substr($abs, strlen($ROOT_DIR) + 1)],
        'simulated' => null,
    ];
    $total++;
}

if ($opts['json']) {
    echo json_encode([
        'total'    => $total,
        'passed'   => $passed,
        'failures' => $buckets,
        'rows'     => $results,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
} else {
    print_human_report($total, $passed, $buckets, $results, $opts['verbose']);
}

exit(($total - $passed) > 0 ? 1 : 0);

/* ──────────────────────────────────────────────────────────────────── */

/**
 * Build a plain-text snapshot of what the DCC ribbon will render for this
 * row. Useful for eye-balling the visual contract:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ HESEM Manual                                                      │
 *   │ Sổ tay QMS tích hợp …                                             │
 *   │ ID: QMS-MAN-001 │ REV: V0 │ EFF: 2026-04-13 │ OWNER: QA │ APPR: CEO│
 *   └──────────────────────────────────────────────────────────────────┘
 */
function simulate_ribbon(array $row): string
{
    $title    = (string)$row['title'];
    $subtitle = $row['subtitle'] === null ? '' : (string)$row['subtitle'];
    $ribbon   = sprintf(
        'ID: %s │ REV: %s │ EFF: %s │ OWNER: %s │ APPR: %s',
        $row['doc_code'],
        $row['revision'],
        $row['effective_date'],
        $row['owner_role_code'],
        $row['approver_role_code']
    );
    $lines = [
        '┌── DCC HEADER ────────────────────────────────────────────────────────',
        '│ ' . $title,
    ];
    if ($subtitle !== '') $lines[] = '│ ' . $subtitle;
    $lines[] = '├──────────────────────────────────────────────────────────────────────';
    $lines[] = '│ ' . $ribbon . ' │ status=' . $row['status'];
    $lines[] = '└──────────────────────────────────────────────────────────────────────';
    return implode("\n", $lines);
}

function parse_argv(array $argv): array
{
    $opts = ['json' => false, 'verbose' => false, 'filter_prefix' => '', 'show_simulations' => 0];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--json') $opts['json'] = true;
        elseif ($arg === '--verbose' || $arg === '-v') $opts['verbose'] = true;
        elseif (str_starts_with($arg, '--filter-prefix=')) {
            $opts['filter_prefix'] = strtoupper(substr($arg, strlen('--filter-prefix=')));
        } elseif (str_starts_with($arg, '--show-simulations=')) {
            $opts['show_simulations'] = (int)substr($arg, strlen('--show-simulations='));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 1500); exit(0);
        }
    }
    return $opts;
}

function print_human_report(int $total, int $passed, array $buckets, array $results, bool $verbose): void
{
    $failed = $total - $passed;
    echo "\n============================================================\n";
    echo " DCC Header Template Verification\n";
    echo "============================================================\n";
    echo " Headers checked  : {$total}\n";
    echo " Template-conformant: {$passed}\n";
    echo " Failures         : {$failed}\n";
    echo "------------------------------------------------------------\n";
    foreach ($buckets as $k => $count) {
        if ($count === 0) continue;
        printf("   %-26s %5d\n", $k, $count);
    }
    if (array_sum($buckets) === 0) echo "   (none — all headers match template)\n";
    echo "============================================================\n";

    if ($verbose) {
        echo "\nFirst 30 failing rows:\n";
        $shown = 0;
        foreach ($results as $r) {
            if (empty($r['fails'])) continue;
            printf("  [%-15s]\n", $r['doc_code']);
            foreach ($r['fails'] as $f) echo "      ↳ $f\n";
            if (++$shown >= 30) break;
        }
        if ($shown === 0) echo "  (none)\n";
        echo "\n3 sample simulated headers:\n";
        $shown = 0;
        foreach ($results as $r) {
            if ($r['simulated'] === null) continue;
            echo $r['simulated'] . "\n\n";
            if (++$shown >= 3) break;
        }
    }
}
