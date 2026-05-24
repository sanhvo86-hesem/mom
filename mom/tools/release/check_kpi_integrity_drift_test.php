#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Integrity Drift Test (P09)
 * ────────────────────────────────────────────────────────────────────────────
 * Verifies the integrity guard actually fires on the regressions it claims to
 * cover. We do not call check_kpi_integrity.php's internal functions
 * (top-level script, not a class) — instead we:
 *   1. Load the live registry JSON.
 *   2. Mutate one field in-memory per scenario.
 *   3. Serialize to a tmp file.
 *   4. Invoke `php check_kpi_integrity.php` via `proc_open` with
 *      KPI_INTEGRITY_REGISTRY pointed at the tmp file.
 *   5. Assert the expected P0 / P1 marker token appears in output AND the
 *      guard exits non-zero (P0) / zero (P1).
 *
 * Scenarios (minimal, high-value):
 *   A. Gate metric linked_cdr mutated to 'Z99' (fake CDR) → expect P0.6 fire.
 *   B. executive_scorecard adds a code whose governance row is
 *      staged_data_contract → expect P0.9.C fire.
 *   C. A reward-eligible rate metric formula.min_sample forced to 0 →
 *      expect P0.7.2 fire (rate / reward / sample-size combo).
 *   E. dashboard_core_kpis[0].primary_endpoint mutated to a fake path
 *      → expect P0.9.B fire (route resolution across mom/api/routes/*.php).
 *
 *  (Scenario D is reserved for nested-alias-chain coverage of the deleted
 *   P0.9.A; current registry has no nested aliases and the rule was
 *   removed in the P09 audit fix, so D is intentionally skipped.)
 *
 * Exit 0 = all scenarios caught by the guard. Exit 1 = at least one scenario
 * was NOT caught (the guard has degraded; CI will flag the regression).
 */

$base       = dirname(__DIR__, 2);          // -> mom
$registryFp = $base . '/data/registry/kpi-authority-registry.json';
$guardFp    = $base . '/tools/release/check_kpi_integrity.php';

if (!is_readable($registryFp)) {
    fwrite(STDERR, "drift_test: registry not readable: $registryFp\n");
    exit(2);
}
if (!is_readable($guardFp)) {
    fwrite(STDERR, "drift_test: guard not readable: $guardFp\n");
    exit(2);
}

$registry = json_decode((string) file_get_contents($registryFp), true);
if (!is_array($registry)) {
    fwrite(STDERR, "drift_test: registry is not valid JSON\n");
    exit(2);
}

/**
 * Run the guard with KPI_INTEGRITY_REGISTRY pointed at a tmp file containing
 * the supplied (already-mutated) registry array. Returns [exitCode, stdout].
 */
$runGuard = static function (array $mutatedRegistry) use ($guardFp): array {
    $tmp = tempnam(sys_get_temp_dir(), 'kpi_drift_');
    if ($tmp === false) {
        throw new RuntimeException('drift_test: cannot create temp file');
    }
    file_put_contents($tmp, json_encode($mutatedRegistry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

    $env = array_merge($_ENV, getenv(), [
        'KPI_INTEGRITY_REGISTRY' => $tmp,
    ]);
    $descr = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open(
        ['php', $guardFp],
        $descr,
        $pipes,
        null,
        $env
    );
    if (!is_resource($proc)) {
        @unlink($tmp);
        throw new RuntimeException('drift_test: proc_open failed');
    }
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]) ?: '';
    $stderr = stream_get_contents($pipes[2]) ?: '';
    fclose($pipes[1]);
    fclose($pipes[2]);
    $code = proc_close($proc);
    @unlink($tmp);
    return [$code, $stdout . $stderr];
};

$report = [];
$allPass = true;
$assert = static function (string $scenario, bool $cond, string $detail) use (&$report, &$allPass): void {
    $report[] = ($cond ? '  PASS  ' : '  FAIL  ') . "[$scenario] $detail";
    if (!$cond) {
        $allPass = false;
    }
};

// ── Scenario A: fake CDR on a gate metric → P0.6 must fire ──────────────────
$mut = $registry;
if (isset($mut['gate_control_metrics'][0]['linked_cdr']) && is_array($mut['gate_control_metrics'][0]['linked_cdr'])) {
    $originalCdr = $mut['gate_control_metrics'][0]['linked_cdr'];
    $mut['gate_control_metrics'][0]['linked_cdr'] = ['Z99'];
    [$codeA, $outA] = $runGuard($mut);
    $assert('A.fake_cdr', $codeA === 1, "guard exit code = $codeA (expected 1)");
    $assert('A.fake_cdr', str_contains($outA, "linked_cdr 'Z99'"), "output mentions linked_cdr 'Z99'");
    // restore not needed — we operated on a copy
    unset($originalCdr);
} else {
    $assert('A.fake_cdr', false, 'no gate_control_metrics[0].linked_cdr to mutate');
}

// ── Scenario B: executive_scorecard adds a staged_data_contract code → P0.9.C ──
$mut = $registry;
$stagedCode = null;
foreach ($mut['annex122_governance_kpis'] ?? [] as $row) {
    if (is_array($row) && (($row['calculation_status'] ?? '') === 'staged_data_contract')) {
        $stagedCode = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
        break;
    }
}
if ($stagedCode !== null && $stagedCode !== '') {
    if (!in_array($stagedCode, (array) ($mut['executive_scorecard'] ?? []), true)) {
        $mut['executive_scorecard'][] = $stagedCode;
    }
    [$codeB, $outB] = $runGuard($mut);
    $assert('B.staged_in_scorecard', $codeB === 1, "guard exit code = $codeB (expected 1)");
    $assert('B.staged_in_scorecard',
        str_contains($outB, 'P0.9.C') && str_contains($outB, $stagedCode),
        "output mentions P0.9.C with code $stagedCode");
} else {
    $assert('B.staged_in_scorecard', false, 'no staged_data_contract governance KPI to mutate');
}

// ── Scenario C: reward-eligible rate metric formula.min_sample forced to 0 ───
$mut = $registry;
$mutatedCodeC = null;
$rewardSet = ['bonus_pool_candidate', 'team_reward_candidate', 'role_review_input'];
foreach ($mut['annex122_governance_kpis'] ?? [] as $idx => $row) {
    if (!is_array($row)) {
        continue;
    }
    $unit = strtolower(trim((string) ($row['formula']['unit'] ?? $row['thresholds']['unit'] ?? '')));
    $isRate = in_array($unit, ['%', 'percent', 'percentage', 'ppm', 'dppm', 'rate', 'ratio', 'per_million', 'parts_per_million'], true);
    $rewardMode = strtolower(trim((string) ($row['reward_mode'] ?? '')));
    if ($isRate && in_array($rewardMode, $rewardSet, true)) {
        $mut['annex122_governance_kpis'][$idx]['formula']['min_sample'] = 0;
        $mutatedCodeC = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
        break;
    }
}
if ($mutatedCodeC !== null && $mutatedCodeC !== '') {
    [$codeC, $outC] = $runGuard($mut);
    $assert('C.percent_min_sample', $codeC === 1, "guard exit code = $codeC (expected 1)");
    $assert('C.percent_min_sample',
        str_contains($outC, 'P0.7.2') && str_contains($outC, $mutatedCodeC),
        "output mentions P0.7.2 with code $mutatedCodeC");
} else {
    $assert('C.percent_min_sample', false, 'no reward-eligible rate metric to mutate');
}

// ── Scenario E: dashboard endpoint primary_endpoint points at a fake path ────
//      → P0.9.B must fire (route does not resolve under mom/api/routes/*.php).
$mut = $registry;
if (isset($mut['dashboard_core_kpis'][0]) && is_array($mut['dashboard_core_kpis'][0])) {
    // Use a non-/api/kpi/ prefix so the endpoint-to-action mapper returns null
    // (the /api/kpi/{tail} fallback resolves to 'kpi_get' which is registered).
    // This path is not under any router->get/post in mom/api/routes/*.php.
    $mut['dashboard_core_kpis'][0]['primary_endpoint'] = 'GET /api/__P09_TEST_FAKE_PATH__/zzz';
    [$codeE, $outE] = $runGuard($mut);
    $assert('E.fake_endpoint', $codeE === 1, "guard exit code = $codeE (expected 1)");
    $assert('E.fake_endpoint',
        str_contains($outE, 'P0.9.B')
            && (str_contains($outE, '__P09_TEST_FAKE_PATH__')
                || str_contains($outE, 'primary_endpoint')),
        "output mentions P0.9.B + fake path / primary_endpoint marker");
} else {
    $assert('E.fake_endpoint', false, 'no dashboard_core_kpis[0] to mutate');
}

echo "KPI integrity drift test\n";
echo "  scenarios: 4 (A,B,C,E — D reserved for deleted P0.9.A nested-alias rule)\n";
foreach ($report as $line) {
    echo $line . "\n";
}
if (!$allPass) {
    echo "\nDrift test FAILED — guard did not catch at least one expected regression.\n";
    exit(1);
}
echo "\nDrift test PASSED — guard caught all expected regressions.\n";
exit(0);
