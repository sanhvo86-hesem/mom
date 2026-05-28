#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Integrity Drift Test (P12)
 * ────────────────────────────────────────────────────────────────────────────
 * Mutates temporary registry / document copies only, then invokes the real
 * check_kpi_integrity.php guard via KPI_INTEGRITY_* env overrides. Exit 0
 * means the CI guard caught all 8 required Prompt 12 fake drifts and the
 * untouched registry/document set still passes afterwards.
 */

$base       = dirname(__DIR__, 2);          // -> repo .../mom/mom
$registryFp = $base . '/data/registry/kpi-authority-registry.json';
$guardFp    = $base . '/tools/release/check_kpi_integrity.php';
$annexDir   = $base . '/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control';
$annex125Fp = $annexDir . '/annex-125-cnc-performance-operating-system.html';

foreach ([$registryFp, $guardFp, $annex125Fp] as $fp) {
    if (!is_readable($fp)) {
        fwrite(STDERR, "drift_test: file not readable: $fp\n");
        exit(2);
    }
}

$registry = json_decode((string) file_get_contents($registryFp), true);
if (!is_array($registry)) {
    fwrite(STDERR, "drift_test: registry is not valid JSON\n");
    exit(2);
}

/**
 * @param array<string, mixed> $mutatedRegistry
 * @param array<string, string> $extraEnv
 * @return array{0:int,1:string}
 */
$runGuard = static function (array $mutatedRegistry, array $extraEnv = []) use ($guardFp): array {
    $tmp = tempnam(sys_get_temp_dir(), 'kpi_drift_registry_');
    if ($tmp === false) {
        throw new RuntimeException('drift_test: cannot create temp registry file');
    }
    file_put_contents(
        $tmp,
        json_encode($mutatedRegistry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
    );

    $env = array_merge($_ENV, getenv(), $extraEnv, [
        'KPI_INTEGRITY_REGISTRY' => $tmp,
    ]);
    $descr = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open([PHP_BINARY, $guardFp], $descr, $pipes, null, $env);
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

/**
 * @param array<string, mixed> $registry
 * @param callable(array<string, mixed>): void $mutate
 */
$mutateMetric = static function (array &$registry, string $code, callable $mutate): void {
    foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $section) {
        if (!is_array($registry[$section] ?? null)) {
            continue;
        }
        foreach ($registry[$section] as &$row) {
            if (is_array($row) && strtoupper((string) ($row['canonical_code'] ?? '')) === $code) {
                $mutate($row);
                unset($row);
                return;
            }
        }
        unset($row);
    }
    throw new RuntimeException("drift_test: metric '$code' not found");
};

/** @param array<string, mixed> $registry */
$removeMetricEverywhere = static function (array &$registry, string $code): void {
    foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics', 'dashboard_core_kpis'] as $section) {
        if (!is_array($registry[$section] ?? null)) {
            continue;
        }
        $registry[$section] = array_values(array_filter(
            $registry[$section],
            static fn(array $row): bool => strtoupper((string) ($row['canonical_code'] ?? '')) !== $code,
        ));
    }
    if (is_array($registry['runtime_calculated_metrics'] ?? null)) {
        $registry['runtime_calculated_metrics'] = array_values(array_filter(
            $registry['runtime_calculated_metrics'],
            static fn(string $rowCode): bool => strtoupper($rowCode) !== $code,
        ));
    }
};

/**
 * @param array<string, mixed> $overrides
 * @return array<string, mixed>
 */
$baseFakeMetric = static function (array $overrides): array {
    return array_merge([
        'canonical_code' => 'FAKE_P12_DRIFT',
        'name' => 'Fake Prompt 12 drift',
        'name_vi' => 'Sai lệch giả lập Prompt 12',
        'layer' => 'test_only',
        'status' => 'staged_data_contract',
        'calculation_status' => 'staged_data_contract',
        'metric_type' => 'operating_metric',
        'metric_subtype' => 'operating_metric',
        'control_intent' => 'flow_constraint',
        'measurement_data_type' => 'percent_ratio',
        'scoring_model_detail' => 'rag_3_band',
        'evaluation_use' => 'daily_management',
        'reward_mode' => 'not_rewardable',
        'lifecycle_status' => 'pilot',
        'thresholds' => [
            'direction' => 'higher_is_better',
            'unit' => 'percent',
            'green_point' => 95,
            'yellow_point' => 85,
            'target' => 95,
        ],
        'counter_metric' => [
            'code' => 'FAKE_P12_DRIFT-CTR',
            'endpoint' => 'POST /api/kpi/FAKE_P12_DRIFT-CTR/input',
            'name_vi' => 'Counter giả lập Prompt 12',
            'intent' => 'Prevent fake drift from passing silently.',
        ],
        'blocking_conditions' => ['fake_prompt_12_drift_blocker'],
        'process' => 'quality_assurance',
        'category' => 'internal',
        'owner_role' => 'QA',
        'evidence_source' => 'fake test evidence',
        'data_contract_gap' => 'fake test gap',
        'target_graduation_condition' => 'fake test graduation',
    ], $overrides);
};

$report = [];
$allPass = true;
$assert = static function (string $scenario, bool $cond, string $detail) use (&$report, &$allPass): void {
    $report[] = ($cond ? '  PASS  ' : '  FAIL  ') . "[$scenario] $detail";
    if (!$cond) {
        $allPass = false;
    }
};

/**
 * @param callable(array<string, mixed>): void $mutate
 * @param array<string, string> $extraEnv
 */
$expectP0 = static function (
    string $scenario,
    callable $mutate,
    string $expectedOutput,
    array $extraEnv = []
) use ($registry, $runGuard, $assert): void {
    $mut = $registry;
    $mutate($mut);
    [$code, $out] = $runGuard($mut, $extraEnv);
    $assert($scenario, $code === 1, "guard exit code = $code (expected 1)");
    $assert($scenario, str_contains($out, $expectedOutput), "output contains '$expectedOutput'");
};

// 1. Remove linked CDR from a gate metric.
$expectP0('01.remove_gate_cdr', static function (array &$mut) use ($mutateMetric): void {
    $mutateMetric($mut, 'CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED', static function (array &$row): void {
        $row['linked_cdr'] = [];
    });
}, 'gate_control_metric requires linked_cdr');

// 2. Rename a canonical code in ANNEX to Vietnamese.
$tmpAnnex125 = tempnam(sys_get_temp_dir(), 'kpi_drift_annex125_');
if ($tmpAnnex125 === false) {
    throw new RuntimeException('drift_test: cannot create temp ANNEX-125 file');
}
$annex125Drifted = str_replace(
    'CHECK_DIM_REPORT_ON_SHIP',
    'CHECK_DIM_REPORT_ON_GIAO HÀNG',
    (string) file_get_contents($annex125Fp),
    $replaceCount
);
if ($replaceCount < 1) {
    throw new RuntimeException('drift_test: CHECK_DIM_REPORT_ON_SHIP not found in ANNEX-125');
}
file_put_contents($tmpAnnex125, $annex125Drifted);
$expectP0('02.annex_translated_canonical_code', static function (array &$mut): void {
    // Registry stays unchanged; only the temp ANNEX-125 drifts.
}, 'doc canonical/translation drift', ['KPI_INTEGRITY_ANNEX125' => $tmpAnnex125]);
@unlink($tmpAnnex125);

// 3. Mark a staged metric rewardable.
$expectP0('03.staged_metric_rewardable', static function (array &$mut) use ($mutateMetric): void {
    $mutateMetric($mut, 'DOWNTIME_IMPACT', static function (array &$row): void {
        $row['calculation_status'] = 'staged_data_contract';
        $row['reward_mode'] = 'bonus_pool_candidate';
        $row['reward_eligible'] = true;
    });
}, "reward_mode 'bonus_pool_candidate' requires calculation_status=runtime_calculated");

// 4. Add runtime metric without calc function.
$expectP0('04.runtime_metric_without_calculator', static function (array &$mut) use ($baseFakeMetric): void {
    $mut['proposed_operating_metrics'][] = $baseFakeMetric([
        'canonical_code' => 'FAKE_RUNTIME_NO_CALC_P12',
        'calculation_status' => 'runtime_calculated',
        'lifecycle_status' => 'approved',
        'data_contract_gap' => '',
        'target_graduation_condition' => '',
    ]);
    $mut['runtime_calculated_metrics'][] = 'FAKE_RUNTIME_NO_CALC_P12';
}, 'KpiEngine::getCalculator() does not wire a calculator');

// 5. Add SPC/Cpk metric without sample_policy.
$expectP0('05.cpk_without_sample_policy', static function (array &$mut) use ($baseFakeMetric): void {
    $mut['proposed_operating_metrics'][] = $baseFakeMetric([
        'canonical_code' => 'FAKE_CPK_NO_SAMPLE_P12',
        'metric_subtype' => 'spc_capability_metric',
        'control_intent' => 'quality_at_source',
        'measurement_data_type' => 'spc_variable',
        'scoring_model_detail' => 'spec_limit_capability',
    ]);
}, 'spc_capability_metric requires sample_policy.min_n_score');

// 6. Remove one LAM linked metric row while profile still references it.
$expectP0('06.remove_lam_metric_row', static function (array &$mut) use ($removeMetricEverywhere): void {
    $removeMetricEverywhere($mut, 'CHECK_DIM_REPORT_ON_SHIP');
}, "linked_metric 'CHECK_DIM_REPORT_ON_SHIP' does not resolve");

// 7. Composite readiness component weights sum to 90.
$expectP0('07.composite_weight_90', static function (array &$mut) use ($baseFakeMetric): void {
    $mut['proposed_operating_metrics'][] = $baseFakeMetric([
        'canonical_code' => 'FAKE_COMPOSITE_WEIGHT_90_P12',
        'metric_subtype' => 'composite_readiness_index',
        'control_intent' => 'continuous_improvement',
        'measurement_data_type' => 'composite_index',
        'scoring_model_detail' => 'composite_weighted_score',
        'components' => [
            ['code' => 'A', 'weight_pct' => 50],
            ['code' => 'B', 'weight_pct' => 40],
        ],
    ]);
}, 'composite_weighted_score component weights must sum to 100');

// 8. Add role active scorecard item with staged reward.
$expectP0('08.role_active_scorecard_staged_reward', static function (array &$mut): void {
    $roles = &$mut['jd_kpi_scorecards']['roles'];
    if (!is_array($roles)) {
        throw new RuntimeException('drift_test: jd_kpi_scorecards.roles missing');
    }
    foreach ($roles as &$role) {
        if (!is_array($role) || !is_array($role['active_scorecard'] ?? null) || $role['active_scorecard'] === []) {
            continue;
        }
        $cloned = $role['active_scorecard'][0];
        if (!is_array($cloned)) {
            continue;
        }
        $cloned['kpi_code'] = 'CURRENT_CONSTRAINT_RESOURCE';
        $cloned['role_measure_code'] = 'FAKE_P12_STAGE_REWARD_ROLE';
        $cloned['measure_name_vi'] = 'Chỉ số staged giả lập reward Prompt 12';
        $cloned['scorecard_contributes_to_reward'] = true;
        $cloned['scorecard_scoring_status'] = 'active_runtime';
        $cloned['manual_governed_override'] = false;
        $role['active_scorecard'][] = $cloned;
        unset($role);
        return;
    }
    unset($role);
    throw new RuntimeException('drift_test: no active_scorecard available for fake drift');
}, 'P0.7.4 JD scorecard');

// Prove the untouched registry/document set still passes after temp mutations.
[$cleanCode, $cleanOut] = $runGuard($registry);
$assert('09.clean_pass_after_temp_mutations', $cleanCode === 0, "guard exit code = $cleanCode (expected 0)");
$assert(
    '09.clean_pass_after_temp_mutations',
    str_contains($cleanOut, 'KPI integrity check PASSED'),
    'clean output reports PASS',
);

echo "KPI integrity drift test\n";
echo "  scenarios: 8 required Prompt 12 fake drifts + clean pass proof\n";
foreach ($report as $line) {
    echo $line . "\n";
}
if (!$allPass) {
    echo "\nDrift test FAILED — guard did not catch at least one expected regression.\n";
    exit(1);
}
echo "\nDrift test PASSED — guard caught all required regressions and clean state still passes.\n";
exit(0);
