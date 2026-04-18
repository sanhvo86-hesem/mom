<?php

declare(strict_types=1);

/**
 * scan-hardcoded-visuals.php
 * ----------------------------------------------------------------------------
 * Walks mom/scripts/portal/*.js (plus optional extra paths) and records every
 * hardcoded visual literal that SHOULD be resolved through the Graphics
 * Authority (GraphicsAuthority.tokens.read / CSS variable) instead.
 *
 * Output: _reports/agent-audits/graphics-hardcode-audit-<date>.json
 *
 * Detected patterns:
 *   hex_color     — #rgb / #rgba / #rrggbb / #rrggbbaa literals
 *   rgba_color    — rgba(...) / rgb(...)
 *   font_family   — "font-family: 'Foo', ..." or "fontFamily: 'Foo'"
 *   dimension_px  — bare '16px', '24px' etc. inside style strings
 *   dimension_rem — bare '1.25rem' etc.
 *   motion_ms     — '150ms', '0.3s' durations in style strings
 *
 * Usage:
 *   php tools/scripts/graphics-audit/scan-hardcoded-visuals.php [--limit=50] [--path=mom/scripts/portal]
 *
 * Exit codes:
 *   0  scan completed (report written regardless of findings)
 *   1  argument or I/O error
 */

$opts = [];
foreach (array_slice($argv, 1) as $arg) {
    if (preg_match('/^--([a-zA-Z0-9_-]+)(?:=(.*))?$/', $arg, $m)) {
        $opts[$m[1]] = $m[2] ?? true;
    }
}

$repoRoot = dirname(__DIR__, 3);
$targets = [];
if (isset($opts['path']) && is_string($opts['path'])) {
    $targets[] = $repoRoot . '/' . ltrim($opts['path'], '/');
} else {
    $targets[] = $repoRoot . '/mom/scripts/portal';
}

$limit = isset($opts['limit']) ? (int)$opts['limit'] : 0;

// Files the scanner may not flag: these are either the authority itself
// (must hold seeds) or legacy bridges tracked separately.
$authorityFiles = [
    'mom/scripts/portal/00b-theme-manager.js',
    'mom/scripts/portal/00ba-graphics-governance-service.js',
    'mom/scripts/portal/00bb-graphics-authority.js',
    'mom/scripts/portal/00c-admin-appearance.js',
];

$patterns = [
    'hex_color'     => '/#[0-9a-fA-F]{3,8}\b/',
    'rgba_color'    => '/rgba?\([^)]+\)/i',
    'font_family'   => '/(?:font[- ]?family|fontFamily)\s*[:=]\s*[\'"][^\'"]{3,200}[\'"]/i',
    'dimension_px'  => '/(?<![a-zA-Z0-9_-])\d+(?:\.\d+)?px\b/',
    'dimension_rem' => '/(?<![a-zA-Z0-9_-])\d+(?:\.\d+)?rem\b/',
    'motion_ms'     => '/(?<![a-zA-Z0-9_-])\d+(?:\.\d+)?m?s\b(?![a-zA-Z])/',
];

// Aggressively skip noise: URL refs, base64, comments, etc. The snippet
// extractor already trims to the surrounding line so reviewers can judge.
$lineSkip = '/^\s*(?:\/\/|\*|#)/';

$results = [
    '_meta' => [
        'scanner' => 'scan-hardcoded-visuals.php',
        'generated_at' => gmdate('c'),
        'repo_root' => $repoRoot,
        'targets' => $targets,
        'authority_files_excluded' => $authorityFiles,
        'rule' => 'CLAUDE.md → Graphics Authority Link (no-hardcode rule)',
    ],
    'summary' => [
        'files_scanned' => 0,
        'files_flagged' => 0,
        'total_findings' => 0,
        'by_pattern' => array_fill_keys(array_keys($patterns), 0),
    ],
    'findings' => [],
];

foreach ($targets as $target) {
    if (!is_dir($target)) {
        fwrite(STDERR, "warn: target not a directory: $target\n");
        continue;
    }
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($target, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iter as $file) {
        if (!$file->isFile()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, ['js', 'html', 'css'], true)) continue;
        $rel = substr($file->getPathname(), strlen($repoRoot) + 1);
        if (in_array($rel, $authorityFiles, true)) continue;

        $results['summary']['files_scanned']++;

        $contents = @file_get_contents($file->getPathname());
        if ($contents === false) continue;

        $lines = explode("\n", $contents);
        $fileFindings = [];
        foreach ($lines as $idx => $line) {
            if ($line === '') continue;
            if (preg_match($lineSkip, $line)) continue;
            foreach ($patterns as $kind => $rx) {
                if (preg_match_all($rx, $line, $matches)) {
                    foreach ($matches[0] as $match) {
                        // Filter trivial cosmetics (pure white/black might be OK).
                        $norm = strtolower($match);
                        if ($kind === 'hex_color' && in_array($norm, ['#fff', '#000', '#ffffff', '#000000'], true)) {
                            continue;
                        }
                        $fileFindings[] = [
                            'file' => $rel,
                            'line' => $idx + 1,
                            'kind' => $kind,
                            'match' => $match,
                            'snippet' => trim(mb_substr($line, 0, 240)),
                        ];
                        $results['summary']['by_pattern'][$kind]++;
                        $results['summary']['total_findings']++;
                    }
                }
            }
        }

        if ($fileFindings !== []) {
            $results['summary']['files_flagged']++;
            if ($limit > 0 && count($fileFindings) > $limit) {
                $fileFindings = array_slice($fileFindings, 0, $limit);
                $fileFindings[] = [
                    'file' => $rel,
                    'line' => 0,
                    'kind' => '_truncated',
                    'match' => '...',
                    'snippet' => "...additional findings truncated at --limit=$limit",
                ];
            }
            $results['findings'] = array_merge($results['findings'], $fileFindings);
        }
    }
}

$outDir = $repoRoot . '/_reports/agent-audits';
if (!is_dir($outDir)) @mkdir($outDir, 0775, true);
$outPath = $outDir . '/graphics-hardcode-audit-' . gmdate('Y-m-d') . '.json';
$encoded = json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($encoded === false) {
    fwrite(STDERR, "error: encode failed\n");
    exit(1);
}
$written = file_put_contents($outPath, $encoded);
if ($written === false) {
    fwrite(STDERR, "error: cannot write $outPath\n");
    exit(1);
}

printf(
    "graphics-hardcode scan complete\n  scanned: %d files\n  flagged: %d files\n  findings: %d\n  report: %s\n",
    $results['summary']['files_scanned'],
    $results['summary']['files_flagged'],
    $results['summary']['total_findings'],
    $outPath
);

foreach ($results['summary']['by_pattern'] as $kind => $n) {
    printf("    %-15s %d\n", $kind, $n);
}
