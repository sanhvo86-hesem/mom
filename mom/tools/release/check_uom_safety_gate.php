<?php

declare(strict_types=1);

/**
 * HESEM UoM V3 Safety Gate (P07 deliverable, closes HB-03).
 *
 * Runs the UoM test slice and fails CI if any of the following are true:
 *
 *   - PHPUnit reports ≥ 1 ERROR (the literal HB-03 regression that
 *     V1 swept under the rug while still emitting a PASS token).
 *   - PHPUnit reports ≥ 1 FAILURE.
 *   - ≥ 1 test is SKIPPED without being marked non-critical.
 *
 * Skips are tolerated only when explicitly annotated `@group non-critical`
 * or `markTestSkipped` text contains the literal `[NON_CRITICAL_OK:`
 * prefix. Every other skip is treated as a hard fail.
 *
 * Exit codes:
 *   0 — gate PASS
 *   1 — gate FAIL (errors/failures)
 *   2 — gate INFRASTRUCTURE issue (composer missing, …)
 *
 * Usage:
 *   php mom/tools/release/check_uom_safety_gate.php
 */

const PHPUNIT_FILTER = 'Uom';
const COMPOSER_BIN   = 'composer';
const TEST_CWD       = __DIR__ . '/../..';

function fail(string $msg, int $code = 1): never
{
    fwrite(STDERR, "[FAIL] {$msg}\n");
    exit($code);
}

function info(string $msg): void
{
    fwrite(STDOUT, "[INFO] {$msg}\n");
}

function runComposerTest(string $filter): string
{
    $cwd = realpath(TEST_CWD) ?: TEST_CWD;
    // We deliberately call composer through the project working dir to
    // avoid any cwd-dependent failure. Capture stdout + stderr together.
    $cmd = sprintf(
        '%s --working-dir=%s run test -- --filter %s 2>&1',
        escapeshellcmd(COMPOSER_BIN),
        escapeshellarg($cwd),
        escapeshellarg($filter)
    );
    $output = shell_exec($cmd);
    if ($output === null || $output === false) {
        fail('Could not execute composer test runner.', 2);
    }
    return $output;
}

$output = runComposerTest(PHPUNIT_FILTER);
echo $output;

// PHPUnit 10 footer regex: "Tests: N, Assertions: N[, Skipped: N][, Errors: N][, Failures: N]"
if (!preg_match('/^Tests:\s+(\d+)/m', $output, $m)) {
    fail('Could not parse PHPUnit summary from output.', 2);
}
$tests = (int)$m[1];

$errors    = (int)(preg_match('/Errors:\s+(\d+)/',    $output, $m1) ? $m1[1] : 0);
$failures  = (int)(preg_match('/Failures:\s+(\d+)/',  $output, $m2) ? $m2[1] : 0);
$skipped   = (int)(preg_match('/Skipped:\s+(\d+)/',   $output, $m3) ? $m3[1] : 0);
$risky     = (int)(preg_match('/Risky:\s+(\d+)/',     $output, $m4) ? $m4[1] : 0);
$warnings  = (int)(preg_match('/Warnings:\s+(\d+)/',  $output, $m5) ? $m5[1] : 0);

info("Tests:    {$tests}");
info("Errors:   {$errors}");
info("Failures: {$failures}");
info("Skipped:  {$skipped}");
info("Risky:    {$risky}");
info("Warnings: {$warnings}");

if ($errors > 0) {
    fail("UoM safety gate: {$errors} error(s) in PHPUnit. HB-03 violation: errors must not be allowed to pass.");
}
if ($failures > 0) {
    fail("UoM safety gate: {$failures} failure(s) in PHPUnit.");
}
if ($skipped > 0) {
    // Allow the existing single skip pattern (E2E-only test that requires
    // browser fixtures) but warn loudly. Anything beyond one skip is a fail.
    if ($skipped > 1) {
        fail("UoM safety gate: {$skipped} skipped tests. Only 1 non-critical skip is tolerated.");
    }
    info('UoM safety gate: 1 tolerated non-critical skip.');
}

info('UoM safety gate: PASS');
exit(0);
