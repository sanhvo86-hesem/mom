#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Integrity Drift Test (P12)
 * ────────────────────────────────────────────────────────────────────────────
 * Mutates temporary registry / document / engine copies only, then invokes
 * the real check_kpi_integrity.php guard via KPI_INTEGRITY_* env overrides.
 * Exit 0 means the CI guard caught every required Prompt 12 fake drift and
 * the untouched registry still passes afterwards.
 *
 * Do not weaken expected failures here to "make CI green". This file is the
 * self-proof that the guard fails closed across world-class KPI drift classes.
 */

$base       = dirname(__DIR__, 2);          // -> repo .../mom/mom
$registryFp = $base . '/data/registry/kpi-authority-registry.json';
$guardFp    = $base . '/tools/release/check_kpi_integrity.php';
$annexDir   = $base . '/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control';
$annex125Fp = $annexDir . '/annex-125-cnc-performance-operating-system.html';
$engineFp   = $base . '/api/services/KpiEngine.php';

foreach ([$registryFp, $guardFp, $annex125Fp, $engineFp] as $fp) {
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

// 1. Gate metric lacks linked_cdr.
$expectP0('01.gate_metric_lacks_linked_cdr', static function (array &$mut) use ($mutateMetric): void {
    $mutateMetric($mut, 'CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED', static function (array &$row): void {
        $row['linked_cdr'] = [];
    });
}, 'gate_control_metric requires linked_cdr');

// 2. Remove KpiEngine calculator for a runtime metric.
$tmpEngine = tempnam(sys_get_temp_dir(), 'kpi_drift_engine_');
if ($tmpEngine === false) {
    throw new RuntimeException('drift_test: cannot create temp KpiEngine file');
}
$engineText = (string) file_get_contents($engineFp);
$needle = "            self::METRIC_SHIP_PACKET_COMPLETENESS => \$this->calcShipPacketCompleteness(...),\n";
if (!str_contains($engineText, $needle)) {
    throw new RuntimeException('drift_test: KpiEngine calculator line for SHIP_PACKET_COMPLETENESS not found');
}
file_put_contents($tmpEngine, str_replace($needle, '', $engineText));
$expectP0('02.runtime_metric_missing_calculator', static function (array &$mut): void {
    // Registry unchanged; engine temp file drifts.
}, "runtime_calculated_metrics lists 'SHIP_PACKET_COMPLETENESS' but it does not appear in KpiEngine::getCalculator()", [
    'KPI_INTEGRITY_ENGINE' => $tmpEngine,
]);
@unlink($tmpEngine);

// 3. LAM linked metric references unknown code.
$expectP0('03.lam_linked_metric_unknown', static function (array &$mut): void {
    $mut['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO']['linked_metrics'][] = 'FAKE_LAM_UNKNOWN_METRIC_P12';
}, "linked_metric 'FAKE_LAM_UNKNOWN_METRIC_P12' does not resolve");

// 4. Cpk metric lacks sample_policy.
$expectP0('04.cpk_without_sample_policy', static function (array &$mut) use ($baseFakeMetric): void {
    $mut['proposed_operating_metrics'][] = $baseFakeMetric([
        'canonical_code' => 'FAKE_CPK_NO_SAMPLE_P12',
        'metric_subtype' => 'spc_capability_metric',
        'control_intent' => 'quality_at_source',
        'measurement_data_type' => 'spc_variable',
        'scoring_model_detail' => 'spec_limit_capability',
    ]);
}, 'spc_capability_metric requires sample_policy.min_n_score');

// 5. Staged metric becomes bonus_pool_candidate.
$expectP0('05.staged_metric_bonus_pool_candidate', static function (array &$mut) use ($mutateMetric): void {
    $mutateMetric($mut, 'DOWNTIME_IMPACT', static function (array &$row): void {
        $row['calculation_status'] = 'staged_data_contract';
        $row['reward_mode'] = 'bonus_pool_candidate';
        $row['reward_eligible'] = true;
    });
}, "reward_mode 'bonus_pool_candidate' requires calculation_status=runtime_calculated");

// 6. Translate canonical code in docs.
$tmpAnnex125 = tempnam(sys_get_temp_dir(), 'kpi_drift_annex125_');
if ($tmpAnnex125 === false) {
    throw new RuntimeException('drift_test: cannot create temp ANNEX-125 file');
}
file_put_contents(
    $tmpAnnex125,
    (string) file_get_contents($annex125Fp)
        . "\n<!-- fake drift: CHECK_DIM_REPORT_ON_GIAO HÀNG -->\n",
);
$expectP0('06.translated_canonical_code_in_docs', static function (array &$mut): void {
    // Registry stays unchanged; only the ANNEX-125 temp file drifts.
}, "P0.21 ANNEX-125 contains forbidden fragment 'CHECK_DIM_REPORT_ON_GIAO HÀNG'", ['KPI_INTEGRITY_ANNEX125' => $tmpAnnex125]);
@unlink($tmpAnnex125);

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

// 8. Role active measure references unknown metric.
$expectP0('08.role_active_measure_unknown_metric', static function (array &$mut): void {
    $roles = &$mut['jd_kpi_scorecards']['roles'];
    if (!is_array($roles)) {
        throw new RuntimeException('drift_test: jd_kpi_scorecards.roles missing');
    }
    foreach ($roles as &$card) {
        if (!is_array($card)) {
            continue;
        }
        $items = is_array($card['active_scorecard'] ?? null)
            ? $card['active_scorecard']
            : (is_array($card['scorecard'] ?? null) ? $card['scorecard'] : []);
        if ($items === []) {
            continue;
        }
        $card['active_scorecard'][0]['kpi_code'] = 'FAKE_UNKNOWN_ROLE_METRIC_P12';
        unset($card);
        return;
    }
    unset($card);
    throw new RuntimeException('drift_test: no active role scorecard found');
}, "is not a governed metric.");

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
