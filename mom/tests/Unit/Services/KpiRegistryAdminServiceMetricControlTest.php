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
}
