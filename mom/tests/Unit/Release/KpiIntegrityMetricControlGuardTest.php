<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Release;

use PHPUnit\Framework\TestCase;

final class KpiIntegrityMetricControlGuardTest extends TestCase
{
    public function testRejectsStagedRewardMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'DOWNTIME_IMPACT', static function (array &$row): void {
                    $row['reward_mode'] = 'bonus_pool_candidate';
                    $row['calculation_status'] = 'staged_data_contract';
                });
            },
            "reward_mode 'bonus_pool_candidate' requires calculation_status=runtime_calculated",
        );
    }

    public function testRejectsCpkMetricWithoutSamplePolicy(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_CPK_NO_SAMPLE_P03',
                    'metric_subtype' => 'spc_capability_metric',
                    'control_intent' => 'quality_at_source',
                    'measurement_data_type' => 'spc_variable',
                    'scoring_model_detail' => 'spec_limit_capability',
                ]);
            },
            'spc_capability_metric requires sample_policy.min_n_score',
        );
    }

    public function testRejectsGateMetricWithoutCdr(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED', static function (array &$row): void {
                    $row['linked_cdr'] = [];
                });
            },
            'gate_control_metric requires linked_cdr',
        );
    }

    public function testRejectsHealthIndicatorRewardableOrScored(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'DOC_RECORD_RETENTION_10Y', static function (array &$row): void {
                    $row['reward_mode'] = 'bonus_pool_candidate';
                    $row['scorecard_contributes_to_reward'] = true;
                });
            },
            'health_indicator cannot be rewardable or scorecard-scored',
        );
    }

    public function testRejectsCompositeWeightsNotOneHundred(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_COMPOSITE_WEIGHT_DRIFT_P03',
                    'metric_subtype' => 'composite_readiness_index',
                    'control_intent' => 'continuous_improvement',
                    'measurement_data_type' => 'composite_index',
                    'scoring_model_detail' => 'composite_weighted_score',
                    'components' => [
                        ['code' => 'A', 'weight_pct' => 50],
                        ['code' => 'B', 'weight_pct' => 40],
                    ],
                ]);
            },
            'composite_weighted_score component weights must sum to 100',
        );
    }

    public function testRejectsSubtypeWithoutControlIntent(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'DOWNTIME_IMPACT', static function (array &$row): void {
                    unset($row['control_intent']);
                });
            },
            'metric_subtype is set but control_intent is empty',
        );
    }

    public function testRejectsEmptyLamG3GateCoverage(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO']['gate_coverage']['G3'] = [];
            },
            'customer_requirement_profiles LAM_SEMSYSCO: gate_coverage.G3 must not be empty',
        );
    }

    public function testRejectsLamG5MetricMissingGateRow(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['gate_control_metrics'] = array_values(array_filter(
                    $registry['gate_control_metrics'],
                    static fn(array $row): bool => ($row['canonical_code'] ?? '') !== 'CMM_QUEUE_AGING',
                ));
            },
            "required G5 metric 'CMM_QUEUE_AGING' has no gate_control_metrics row",
        );
    }

    public function testRejectsLamGateRowWithoutProfileLink(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'IPQC_CHARACTERISTIC_COMPLETENESS', static function (array &$row): void {
                    unset($row['lam_profile_link']);
                });
            },
            'Gate IPQC_CHARACTERISTIC_COMPLETENESS: LAM G3/G5 metric must declare lam_profile_link=LAM_SEMSYSCO',
        );
    }

    /**
     * @param callable(array<string, mixed>): void $mutate
     */
    private function assertFakeDriftRejected(callable $mutate, string $expectedOutput): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $registryPath = $repoRoot . '/mom/data/registry/kpi-authority-registry.json';
        $registry = json_decode((string) file_get_contents($registryPath), true);
        self::assertIsArray($registry);
        $mutate($registry);

        $tmp = tempnam(sys_get_temp_dir(), 'kpi-mco-p03-');
        self::assertIsString($tmp);
        file_put_contents(
            $tmp,
            json_encode($registry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        );

        try {
            $script = $repoRoot . '/mom/tools/release/check_kpi_integrity.php';
            $command = 'KPI_INTEGRITY_REGISTRY=' . escapeshellarg($tmp)
                . ' ' . escapeshellarg(PHP_BINARY)
                . ' ' . escapeshellarg($script)
                . ' 2>&1';
            $lines = [];
            $exitCode = 0;
            exec($command, $lines, $exitCode);
            $output = implode("\n", $lines);

            self::assertSame(1, $exitCode, $output);
            self::assertStringContainsString($expectedOutput, $output);
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * @param array<string, mixed>          $registry
     * @param callable(array<string, mixed>): void $mutate
     */
    private static function mutateMetric(array &$registry, string $code, callable $mutate): void
    {
        foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $section) {
            foreach ($registry[$section] as &$row) {
                if (is_array($row) && strtoupper((string) ($row['canonical_code'] ?? '')) === $code) {
                    $mutate($row);
                    unset($row);
                    return;
                }
            }
            unset($row);
        }
        self::fail("Metric {$code} not found in fake registry.");
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private static function baseFakeMetric(array $overrides): array
    {
        return array_merge([
            'canonical_code' => 'FAKE_MCO_P03',
            'name' => 'Fake MCO drift',
            'name_vi' => 'Sai lệch MCO giả lập',
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
                'code' => 'FAKE_MCO_P03-CTR',
                'endpoint' => 'POST /api/kpi/FAKE_MCO_P03-CTR/input',
                'name_vi' => 'Counter giả lập',
                'intent' => 'Prevent fake test drift from passing silently.',
            ],
            'blocking_conditions' => ['fake_mco_drift_blocker'],
            'process' => 'quality_assurance',
            'category' => 'internal',
            'owner_role' => 'QA',
            'evidence_source' => 'fake test evidence',
            'data_contract_gap' => 'fake test gap',
            'target_graduation_condition' => 'fake test graduation',
        ], $overrides);
    }
}
