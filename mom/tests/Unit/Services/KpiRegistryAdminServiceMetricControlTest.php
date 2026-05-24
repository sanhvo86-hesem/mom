<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\KpiRegistryAdminService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class KpiRegistryAdminServiceMetricControlTest extends TestCase
{
    public function testServiceAllowsCompleteStagedPilotMetricControlObject(): void
    {
        $validator = $this->validator();

        $validator($this->completeMetricControlRow(), true);

        $this->addToAssertionCount(1);
    }

    public function testServiceRejectsConsoleAddedStagedRewardMetric(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'reward_mode' => 'bonus_pool_candidate',
            'calculation_status' => 'staged_data_contract',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_reward_requires_runtime:TEST_MCO_SERVICE');

        $validator($row, true);
    }

    public function testServiceRejectsBonusCandidateWithoutMinimumSamplePolicy(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'calculation_status' => 'runtime_calculated',
            'reward_mode' => 'bonus_pool_candidate',
            'attribution_rule' => 'service test attribution rule',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_bonus_missing_min_sample:TEST_MCO_SERVICE');

        $validator($row, true);
    }

    public function testServiceAllowsBonusCandidateWithGuardrails(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'calculation_status' => 'runtime_calculated',
            'reward_mode' => 'bonus_pool_candidate',
            'attribution_rule' => 'service test attribution rule',
            'formula' => [
                'min_sample' => 5,
            ],
        ]);

        $validator($row, true);

        $this->addToAssertionCount(1);
    }

    public function testServiceAllowsStagedPilotCpkMetricWithStrictSamplePolicy(): void
    {
        $validator = $this->validator();

        $validator($this->completeCpkMetricControlRow(), true);

        $this->addToAssertionCount(1);
    }

    public function testServiceRejectsCpkMetricWithoutGageValidityPolicy(): void
    {
        $validator = $this->validator();
        $row = $this->completeCpkMetricControlRow();
        $row['sample_policy']['gage_validity_required'] = false;

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_capability_gage_validity_required:TEST_CPK_SERVICE');

        $validator($row, true);
    }

    public function testLoadExposesPrompt10AdminConsoleContractAndIntegrityPanels(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $service = new KpiRegistryAdminService($repoRoot, $repoRoot . '/mom/data');

        $config = $service->load();

        self::assertSame(
            'KPI-ADMIN-CONSOLE-DYNAMIC-UX-P10',
            $config['admin_console_contract']['contract_id'] ?? null,
        );
        self::assertArrayHasKey('integrity_panels', $config['admin_views'] ?? []);
        self::assertArrayHasKey('bsc_model', $config['admin_views']['integrity_panels'] ?? []);
        self::assertArrayHasKey('annex128_matrix', $config['admin_views']['integrity_panels'] ?? []);
    }

    /**
     * @return callable(array<string, mixed>, bool): void
     */
    private function validator(): callable
    {
        $repoRoot = dirname(__DIR__, 4);
        $service = new KpiRegistryAdminService($repoRoot, $repoRoot . '/mom/data');

        $validator = \Closure::bind(
            function (array $row, bool $requireComplete): void {
                $this->validateMetricControlObject($row, 'proposed_operating_metrics', $requireComplete);
            },
            $service,
            KpiRegistryAdminService::class,
        );
        self::assertInstanceOf(\Closure::class, $validator);

        return $validator;
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function completeMetricControlRow(array $overrides = []): array
    {
        return array_merge([
            'canonical_code' => 'TEST_MCO_SERVICE',
            'name' => 'Test MCO service metric',
            'name_vi' => 'Metric kiểm thử MCO service',
            'calculation_status' => 'staged_data_contract',
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
            ],
            'owner_role' => 'QA',
            'evidence_source' => 'service test evidence',
            'data_contract_gap' => 'service test staged source gap',
            'target_graduation_condition' => 'service test graduation condition',
            'counter_metric' => [
                'name_vi' => 'Counter service test',
                'intent' => 'Prevent service-level MCO drift from passing.',
            ],
            'blocking_conditions' => ['service_test_blocker'],
        ], $overrides);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function completeCpkMetricControlRow(array $overrides = []): array
    {
        return array_merge($this->completeMetricControlRow([
            'canonical_code' => 'TEST_CPK_SERVICE',
            'name' => 'Test Cpk service metric',
            'name_vi' => 'Metric kiểm thử Cpk',
            'metric_subtype' => 'spc_capability_metric',
            'control_intent' => 'quality_at_source',
            'measurement_data_type' => 'spc_variable',
            'scoring_model_detail' => 'spec_limit_capability',
            'evaluation_use' => 'process_control_review',
            'reward_mode' => 'not_rewardable',
            'thresholds' => [
                'direction' => 'higher_is_better',
                'unit' => 'cpk',
                'green_point' => 1.33,
                'yellow_point' => 1.0,
            ],
            'counter_metric' => [
                'name_vi' => 'Counter Cpk service test',
                'intent' => 'Prevent Cpk policy drift from passing.',
            ],
            'blocking_conditions' => [
                'ctq_sample_policy_insufficient',
                'invalid_gage_used_for_ctq_measurement',
            ],
            'sample_policy' => [
                'min_n_score' => 25,
                'provisional_n' => 25,
                'internal_n' => 50,
                'customer_grade_n' => 100,
                'stability_required' => true,
                'gage_validity_required' => true,
            ],
        ]), $overrides);
    }
}
