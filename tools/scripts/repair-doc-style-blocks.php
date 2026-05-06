<?php
declare(strict_types=1);

/**
 * One-shot remediation: repairs broken CSS nesting and strips runtime
 * artifacts (Kaspersky AV link injections, browser-side abn_style blocks,
 * and the dynamically-appended DCC header stylesheet/renderer) that have
 * leaked into authored HTML under mom/docs/.
 *
 * Idempotent. Safe to re-run. Reports counts of modified files.
 *
 * Usage:
 *   php tools/scripts/repair-doc-style-blocks.php           # apply fixes
 *   php tools/scripts/repair-doc-style-blocks.php --dry-run # report only
 */

$root = dirname(__DIR__, 2);
$docsRoot = $root . '/mom/docs';
$dryRun = in_array('--dry-run', $argv, true);

if (!is_dir($docsRoot)) {
    fwrite(STDERR, "docs root not found: $docsRoot\n");
    exit(1);
}

$summary = [
    'scanned'                  => 0,
    'broken_small_nesting'     => 0,
    'kaspersky_link'           => 0,
    'abn_style_block'          => 0,
    'dcc_runtime_link'         => 0,
    'dcc_runtime_script'       => 0,
    'js_ready_class'           => 0,
    'qms_view_lang_attr'       => 0,
    'modified'                 => 0,
];

$modifiedFiles = [];

$rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($docsRoot, FilesystemIterator::SKIP_DOTS));
foreach ($rii as $fileInfo) {
    if (!$fileInfo->isFile()) continue;
    if (strtolower($fileInfo->getExtension()) !== 'html') continue;

    $path = $fileInfo->getPathname();
    $summary['scanned']++;

    $orig = file_get_contents($path);
    if ($orig === false) continue;

    $html = $orig;

    // 1. Repair the ".small{ thead{...}tfoot{...} p{...}" broken nesting that
    //    sweeps subsequent rules into ".small descendant" scoping under modern
    //    CSS Nesting. Replace with three flat rules and drop the matching
    //    closing "}" that lives on its own line just before </style>.
    $brokenSmallPattern = '/\.small\{\s*thead\{display:table-header-group\}tfoot\{display:table-footer-group\}\s*p\{orphans:3;widows:3\}/';
    if (preg_match($brokenSmallPattern, $html)) {
        $html = preg_replace(
            $brokenSmallPattern,
            ".small thead{display:table-header-group}\n.small tfoot{display:table-footer-group}\n.small p{orphans:3;widows:3}",
            $html,
            1
        );
        // Drop the orphaned closing brace that previously matched the .small{
        // opener. It always sits on its own line right before </style>.
        $html = preg_replace(
            '/\n\}\n(<\/style>)/',
            "\n$1",
            $html,
            1
        );
        $summary['broken_small_nesting']++;
    }

    // 2. Kaspersky AV-injected stylesheet links (browser-side, never authored).
    $count = 0;
    $html = preg_replace(
        '/<link\b[^>]*href=["\'][^"\']*kaspersky-labs\.com[^"\']*["\'][^>]*>\s*/i',
        '',
        $html,
        -1,
        $count
    );
    if ($count > 0) $summary['kaspersky_link'] += $count;

    // 3. Browser AdBlock-style style blocks (class="abn_style").
    $count = 0;
    $html = preg_replace(
        '/<style\b[^>]*class=["\'][^"\']*\babn_[^"\']*["\'][^>]*>[\s\S]*?<\/style>\s*/i',
        '',
        $html,
        -1,
        $count
    );
    if ($count > 0) $summary['abn_style_block'] += $count;

    // 4. Runtime-appended DCC header stylesheet (data-dcc-header-stylesheet).
    $count = 0;
    $html = preg_replace(
        '/<link\b[^>]*data-dcc-header-stylesheet[^>]*>\s*/i',
        '',
        $html,
        -1,
        $count
    );
    if ($count > 0) $summary['dcc_runtime_link'] += $count;

    // 5. Runtime-appended DCC header renderer script.
    $count = 0;
    $html = preg_replace(
        '/<script\b[^>]*src=["\'][^"\']*11-dcc-header-renderer\.js[^"\']*["\'][^>]*>\s*<\/script>\s*/i',
        '',
        $html,
        -1,
        $count
    );
    if ($count > 0) $summary['dcc_runtime_script'] += $count;

    // 6. Strip the runtime-only "js-ready" class from <html> (added by the
    //    portal app bridge after hydration; should not be persisted).
    if (preg_match('/<html\b[^>]*class="[^"]*\bjs-ready\b[^"]*"/i', $html)) {
        $html = preg_replace_callback(
            '/(<html\b[^>]*class=")([^"]*)(")/i',
            static function ($m) {
                $classes = preg_replace('/\bjs-ready\b/', '', $m[2]);
                $classes = preg_replace('/\s+/', ' ', trim($classes));
                if ($classes === '') {
                    // Drop the now-empty class="" attribute entirely.
                    return preg_replace('/\s*class=""/i', '', $m[1] . $m[3]);
                }
                return $m[1] . $classes . $m[3];
            },
            $html,
            1
        );
        $summary['js_ready_class']++;
    }

    // 7. Strip data-qms-view-lang runtime attribute on <html> / <body>.
    $count = 0;
    $html = preg_replace('/\s+data-qms-view-lang="[^"]*"/i', '', $html, -1, $count);
    if ($count > 0) $summary['qms_view_lang_attr'] += $count;

    if ($html !== $orig) {
        $summary['modified']++;
        $modifiedFiles[] = substr($path, strlen($root) + 1);
        if (!$dryRun) {
            file_put_contents($path, $html);
        }
    }
}

echo "Scanned : {$summary['scanned']} HTML files under mom/docs/\n";
echo "Modified: {$summary['modified']}\n";
echo "  .small{ thead{...}      : {$summary['broken_small_nesting']}\n";
echo "  Kaspersky link          : {$summary['kaspersky_link']}\n";
echo "  abn_style block         : {$summary['abn_style_block']}\n";
echo "  data-dcc-header-stylesheet: {$summary['dcc_runtime_link']}\n";
echo "  11-dcc-header-renderer.js: {$summary['dcc_runtime_script']}\n";
echo "  js-ready class          : {$summary['js_ready_class']}\n";
echo "  data-qms-view-lang attr : {$summary['qms_view_lang_attr']}\n";

if ($modifiedFiles && $dryRun) {
    echo "\n--- DRY RUN: would modify ---\n";
    foreach ($modifiedFiles as $f) echo "  $f\n";
} elseif ($modifiedFiles) {
    echo "\n--- modified ---\n";
    foreach ($modifiedFiles as $f) echo "  $f\n";
}
