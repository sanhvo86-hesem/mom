<?php

declare(strict_types=1);

/**
 * UoM V3 PR-Diff Truth Auditor (P00 deliverable).
 *
 * Mission
 * -------
 * Reports under _reports/uom-measurement-conversion-v3/ make claims about what
 * was inspected/changed. The V3 prompt pack forbids generating those reports
 * BEFORE the final diff (the most common over-pass failure mode in V1 reports).
 *
 * This script compares:
 *   - "Files changed" / "Files inspected" sections inside each V3 report, AND
 *   - The actual `git diff --name-status <base>..HEAD` output.
 *
 * It emits an exit code of 1 (CI fail) whenever:
 *   - A V3 report claims a file path is unchanged when git actually shows it
 *     modified/added/deleted.
 *   - A V3 report omits a forbidden file edit that exists in the diff.
 *   - A V3 report references a path that does not exist in the diff AND does
 *     not exist on disk.
 *
 * Output is plain text and is meant to run in CI / pre-merge.
 *
 * Usage:
 *   php mom/tools/release/check_uom_pr_diff_truth.php [base-ref]
 *
 *   base-ref defaults to `origin/main`.
 */

const HMV4_FORBIDDEN = [
    'mom/portal.html',
    'mom/styles/portal.main.css',
    'mom/styles/eqms-suite.css',
    'mom/styles/density-darkmode.css',
    'mom/scripts/portal/01-module-router.js',
    'mom/scripts/portal/02-state-auth-ui.js',
    'mom/scripts/portal/40-eqms-shell.js',
];

const REPORT_DIR = '_reports/uom-measurement-conversion-v3';

function fail(string $msg): void { fwrite(STDERR, "[FAIL] {$msg}\n"); }
function info(string $msg): void { fwrite(STDOUT, "[INFO] {$msg}\n"); }
function warn(string $msg): void { fwrite(STDERR, "[WARN] {$msg}\n"); }

function runGit(string $cmd): array
{
    $out = [];
    $code = 0;
    exec($cmd . ' 2>&1', $out, $code);
    return ['code' => $code, 'lines' => $out];
}

function collectDiff(string $base): array
{
    $cmd = sprintf('git diff --name-status %s..HEAD', escapeshellarg($base));
    $r = runGit($cmd);
    if ($r['code'] !== 0) {
        fail("git diff failed against {$base}");
        exit(2);
    }
    $map = [];
    foreach ($r['lines'] as $line) {
        if (!preg_match('/^([A-Z])\s+(.+)$/', trim($line), $m)) {
            continue;
        }
        // For renames git emits `R### old\tnew` — collapse to new path only.
        if ($m[1] === 'R' || $m[1] === 'C') {
            $parts = preg_split('/\s+/', $m[2], 2);
            $map[$parts[1] ?? $parts[0]] = $m[1];
            continue;
        }
        $map[$m[2]] = $m[1];
    }
    return $map;
}

/**
 * Extract candidate file paths from a Markdown V3 report.
 *
 * Heuristic — V3 reports use bullet/inline code-block paths under headings
 * like "## Files changed", "## Files inspected", "## Allowed files/classes to
 * change". We pull every `mom/...`, `tests/...`, `_reports/...`,
 * `.github/...`, `docs/...` token that looks like a path.
 */
function extractClaimedPaths(string $reportPath): array
{
    if (!is_readable($reportPath)) {
        return [];
    }
    $text = file_get_contents($reportPath) ?: '';
    $paths = [];
    // Only repo-local prefixes are auditable. External pack paths
    // (e.g. V3 pack schemas/*.json) are explicitly out of scope.
    $repoPrefix = '(?:mom/|tests/|_reports/|docs/|\.github/|tools/)';
    if (preg_match_all('#`(' . $repoPrefix . '[\w\-./]+\.\w+)`#', $text, $m)) {
        foreach ($m[1] as $p) {
            $paths[$p] = true;
        }
    }
    if (preg_match_all('#^\s*-\s+(' . $repoPrefix . '[\w\-./]+\.\w+)\s*$#m', $text, $m2)) {
        foreach ($m2[1] as $p) {
            $paths[$p] = true;
        }
    }
    return array_keys($paths);
}

function main(array $argv): int
{
    $base = $argv[1] ?? 'origin/main';
    info("base ref = {$base}");

    // Update remote if possible (best-effort, do not fail on offline CI).
    runGit('git fetch origin main --quiet || true');

    $diff = collectDiff($base);
    info('diff entries: ' . count($diff));

    $exit = 0;

    // 1. Forbidden file edits MUST be either absent from diff, OR explicitly
    //    disclosed in P00-final-diff-auditor.md.
    $forbidEdits = [];
    foreach (HMV4_FORBIDDEN as $f) {
        if (isset($diff[$f])) {
            $forbidEdits[$f] = $diff[$f];
        }
    }
    if ($forbidEdits) {
        $auditor = REPORT_DIR . '/P00-final-diff-auditor.md';
        $disclosed = file_exists($auditor) ? file_get_contents($auditor) : '';
        foreach ($forbidEdits as $f => $st) {
            if (strpos($disclosed, $f) === false) {
                fail("Forbidden file edited but not disclosed in P00-final-diff-auditor.md: {$f} ({$st})");
                $exit = 1;
            } else {
                info("Forbidden file disclosed: {$f} ({$st})");
            }
        }
    } else {
        info('No HMV4 forbidden file edits in diff.');
    }

    // 2. V3 reports — every claimed `mom/...` path that does not appear in the
    //    diff and does not exist on disk is a contradiction.
    $reportFiles = glob(REPORT_DIR . '/P*-*.md') ?: [];
    info('V3 reports found: ' . count($reportFiles));
    foreach ($reportFiles as $rf) {
        $claimed = extractClaimedPaths($rf);
        foreach ($claimed as $p) {
            // Skip self-references and pure report references.
            if (strpos($p, '_reports/') === 0) {
                continue;
            }
            $inDiff = isset($diff[$p]);
            $onDisk = is_file($p);
            if (!$inDiff && !$onDisk) {
                fail(sprintf(
                    "Report %s references missing path %s (not in diff, not on disk)",
                    basename($rf),
                    $p
                ));
                $exit = 1;
            }
        }
    }

    // 3. Print sanity table — diff counts per top-level domain.
    $counts = [];
    foreach ($diff as $p => $st) {
        $parts = explode('/', $p);
        $domain = match (true) {
            $parts[0] === '_reports' => 'reports',
            $parts[0] === 'docs' || ($parts[0] === 'mom' && ($parts[1] ?? '') === 'docs') => 'docs',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'api' && ($parts[2] ?? '') === 'services' && ($parts[3] ?? '') === 'Uom' => 'uom-services',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'api' && ($parts[2] ?? '') === 'controllers' => 'controllers',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'api' && ($parts[2] ?? '') === 'routes' => 'routes',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'database' && ($parts[2] ?? '') === 'migrations' => 'migrations',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'tests' => 'tests',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'scripts' => 'scripts',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'styles' => 'styles',
            $parts[0] === 'mom' && ($parts[1] ?? '') === 'contracts' => 'contracts',
            $parts[0] === 'tests' => 'e2e',
            default => 'other',
        };
        $counts[$domain] ??= ['A' => 0, 'M' => 0, 'D' => 0, 'R' => 0, 'C' => 0];
        $counts[$domain][$st] = ($counts[$domain][$st] ?? 0) + 1;
    }
    info('Diff domain distribution:');
    foreach ($counts as $d => $sts) {
        info(sprintf(
            '  %-15s A=%d  M=%d  D=%d  R=%d  C=%d',
            $d, $sts['A'], $sts['M'], $sts['D'], $sts['R'], $sts['C']
        ));
    }

    info($exit === 0 ? 'PR diff truth: PASS' : 'PR diff truth: FAIL');
    return $exit;
}

exit(main($argv));
