<?php

declare(strict_types=1);

/**
 * DCC Batch — Body Structure Scanner
 * ==================================
 *
 * Walks every controlled HTML doc and reports what HTML blocks (if any)
 * sit BETWEEN the `<div class="dcc-header">` placeholder and the first
 * "real content" anchor (`<div class="iso-map">`, `<div class="form-sheet">`,
 * `<div class="doc-content">`, or `<h1>`/`<h2>`).
 *
 * Goal: discover EVERY layout variant left over from legacy headers so the
 * migrate tool can be extended to strip them all. The reference document
 * QMS-MAN-001 has zero blocks between dcc-header and the iso-map — that's
 * the canonical layout we want everywhere.
 *
 * Usage:
 *   php mom/tools/dcc-batch/scan-structure.php             # human report
 *   php mom/tools/dcc-batch/scan-structure.php --json      # JSON
 *   php mom/tools/dcc-batch/scan-structure.php --verbose   # list every doc per pattern
 *
 * Exit 0 always; this is purely informational.
 */

require __DIR__ . '/lib.php';

use function MOM\Tools\DccBatch\walk_docs;
use function MOM\Tools\DccBatch\is_html_path;
use function MOM\Tools\DccBatch\code_from_filename;

$ROOT_DIR = realpath(__DIR__ . '/../../..');
$opts = ['json' => false, 'verbose' => false];
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--json') $opts['json'] = true;
    if ($arg === '--verbose' || $arg === '-v') $opts['verbose'] = true;
}

/**
 * Anchors that mark the start of "real content" (we should NOT see anything
 * between the dcc-header placeholder and one of these).
 */
$contentAnchors = [
    'iso-map', 'form-sheet', 'doc-content', 'preface-block',
    'callout', 'toc',
];

$variants = [];     // pattern_signature => [count, sample_paths[]]
$cleanCount = 0;
$skipped = 0;

foreach (walk_docs($ROOT_DIR) as $abs) {
    if (!is_html_path($abs)) continue;
    $code = code_from_filename($abs);
    if ($code === '') continue;
    $rel = substr($abs, strlen($ROOT_DIR) + 1);
    $html = @file_get_contents($abs);
    if (!is_string($html) || $html === '' || !preg_match('#<head\b#i', $html)) {
        $skipped++;
        continue;
    }

    if (!preg_match('#<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*></div>#i', $html, $m, PREG_OFFSET_CAPTURE)) {
        $variants['NO_PLACEHOLDER'] = ($variants['NO_PLACEHOLDER'] ?? ['count' => 0, 'samples' => []]);
        $variants['NO_PLACEHOLDER']['count']++;
        if (count($variants['NO_PLACEHOLDER']['samples']) < 5) $variants['NO_PLACEHOLDER']['samples'][] = "$code  $rel";
        continue;
    }

    $start = (int)($m[0][1] + strlen($m[0][0]));
    // Find the first content anchor after dcc-header
    $end = strlen($html);
    foreach ($contentAnchors as $anchor) {
        $pos = stripos($html, 'class="' . $anchor . '"', $start);
        if ($pos === false) $pos = stripos($html, "class='" . $anchor . "'", $start);
        if ($pos !== false && $pos < $end) {
            // Walk back to the opening `<div`
            $tagStart = strrpos(substr($html, 0, $pos), '<div');
            if ($tagStart !== false && $tagStart >= $start) {
                $end = $tagStart;
            } elseif ($tagStart !== false && $tagStart < $start) {
                // anchor is wrapped by a div that started BEFORE dcc-header — skip
                continue;
            }
        }
    }

    $between = trim(substr($html, $start, $end - $start));
    if ($between === '') {
        $cleanCount++;
        continue;
    }

    // Build a signature: extract the classes of top-level divs in $between
    $signature = signature_of_blocks($between);
    if (!isset($variants[$signature])) {
        $variants[$signature] = ['count' => 0, 'samples' => []];
    }
    $variants[$signature]['count']++;
    if (count($variants[$signature]['samples']) < 5) {
        $variants[$signature]['samples'][] = "$code  $rel";
    }
}

if ($opts['json']) {
    echo json_encode([
        'clean'    => $cleanCount,
        'skipped'  => $skipped,
        'variants' => $variants,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    exit(0);
}

echo "\n============================================================\n";
echo " DCC Body Structure Scan\n";
echo "============================================================\n";
echo " Canonical (no legacy block between dcc-header and content): {$cleanCount}\n";
echo " Skipped (malformed / no <head>):                            {$skipped}\n";
echo "------------------------------------------------------------\n";
if (count($variants) === 0) {
    echo " No legacy variants detected — everything is canonical.\n";
} else {
    uasort($variants, fn($a,$b) => $b['count'] <=> $a['count']);
    foreach ($variants as $sig => $info) {
        printf("\n  [%d docs]  %s\n", $info['count'], $sig);
        foreach ($info['samples'] as $s) echo "      ↳ $s\n";
    }
}
echo "============================================================\n\n";
exit(0);

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Reduce a chunk of HTML to a compact signature describing its top-level
 * elements, so we can group docs by structural shape.
 */
function signature_of_blocks(string $html): string
{
    // Find every <div class="…"> at the OUTER level (depth 0)
    $depth = 0;
    $out = [];
    $len = strlen($html);
    $i = 0;
    while ($i < $len) {
        if ($html[$i] === '<') {
            // Check for opening div tag
            if (substr($html, $i, 5) === '<div ' || substr($html, $i, 4) === '<div') {
                if ($depth === 0 && preg_match('/^<div[^>]*class\s*=\s*["\']([^"\']+)["\']/i', substr($html, $i, 200), $m)) {
                    $cls = trim($m[1]);
                    // Keep the FIRST class (signature token)
                    $first = explode(' ', $cls)[0];
                    $out[] = '<div.' . $first . '>';
                }
                $depth++;
                $end = strpos($html, '>', $i);
                if ($end === false) break;
                $i = $end + 1;
                continue;
            }
            if (substr($html, $i, 6) === '</div>') {
                $depth = max(0, $depth - 1);
                $i += 6;
                continue;
            }
            // Other top-level tags
            if ($depth === 0 && preg_match('/^<(h[1-6]|p|ul|ol|table|section|article|aside)\b/i', substr($html, $i, 20), $m)) {
                $out[] = '<' . strtolower($m[1]) . '>';
                $end = strpos($html, '>', $i);
                if ($end === false) break;
                $i = $end + 1;
                continue;
            }
        }
        $i++;
    }
    return implode(' + ', array_unique($out)) ?: '(only-text-or-comment)';
}
