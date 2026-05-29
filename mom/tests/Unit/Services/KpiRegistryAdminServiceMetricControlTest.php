<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\KpiRegistryAdminService;
use MOM\Services\KpiEngine;
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
            'backend_status' => 'runtime_calculated',
            'primary_endpoint' => 'GET /api/kpi/TEST_MCO_SERVICE',
            'formula' => [
                'min_sample' => 5,
            ],
        ]);

        $validator($row, true);

        $this->addToAssertionCount(1);
    }

    public function testServiceRejectsRuntimeMetricWithoutBackendStatus(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'calculation_status' => 'runtime_calculated',
            'data_contract_gap' => '',
            'target_graduation_condition' => '',
            'backend_status' => '',
            'primary_endpoint' => 'GET /api/kpi/TEST_MCO_SERVICE',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_runtime_missing_backend_status:TEST_MCO_SERVICE');

        $validator($row, false);
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

    public function testServiceRejectsBlockerMetricWithoutBlockerOnlyContract(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'canonical_code' => 'TEST_BLOCKER_SERVICE',
            'metric_subtype' => 'blocker_metric',
            'reward_mode' => 'not_rewardable',
            'scoring_model_detail' => 'blocker_only',
            'hold_release_rule' => '',
            'decision_action' => '',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_blocker_invalid_reward_mode:TEST_BLOCKER_SERVICE');

        $validator($row, true);
    }

    public function testServiceRejectsGateMetricWithoutLinkedCdr(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'canonical_code' => 'TEST_GATE_SERVICE',
            'metric_subtype' => 'gate_control_metric',
            'measurement_data_type' => 'binary_event',
            'scoring_model_detail' => 'binary_pass_fail',
            'evaluation_use' => 'gate_hold_release',
            'reward_mode' => 'blocker_only',
            'gate' => 'G5',
            'linked_cdr' => [],
            'gate_pass_condition' => 'All required release evidence complete.',
            'hold_release_rule' => 'Hold shipment until evidence is complete.',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_gate_missing_linked_cdr:TEST_GATE_SERVICE');

        $validator($row, true);
    }

    public function testServiceRejectsCanonicalCodeWithVietnameseCharacters(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'canonical_code' => 'CHECK_DIM_BÁO_CÁO',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_invalid_code:CHECK_DIM_BÁO_CÁO');

        $validator($row, true);
    }

    public function testServiceRejectsCompositeWeightsNotEqualToHundred(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'canonical_code' => 'TEST_COMPOSITE_SERVICE',
            'metric_subtype' => 'composite_readiness_index',
            'measurement_data_type' => 'composite_index',
            'scoring_model_detail' => 'composite_weighted_score',
            'reward_mode' => 'not_rewardable',
            'components' => [
                ['code' => 'A', 'weight_pct' => 60, 'name' => 'A'],
                ['code' => 'B', 'weight_pct' => 30, 'name' => 'B'],
            ],
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_composite_weights_not_100:TEST_COMPOSITE_SERVICE');

        $validator($row, true);
    }

    public function testServiceRejectsRoleMeasureWithoutControllability(): void
    {
        $validator = $this->validator();
        $row = $this->completeMetricControlRow([
            'canonical_code' => 'TEST_ROLE_SERVICE',
            'metric_subtype' => 'role_performance_measure',
            'evaluation_use' => 'role_performance_review',
            'controllability_scope' => '',
            'role_assignments' => [
                ['role' => 'QA', 'assignment_type' => 'role_measure_active', 'weight_pct' => 100],
            ],
            'action_when_red' => 'Open same-day coaching and evidence review.',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_mco_role_missing_controllability:TEST_ROLE_SERVICE');

        $validator($row, true);
    }

    public function testLoadExposesPrompt10AdminConsoleContractAndIntegrityPanels(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $service = new KpiRegistryAdminService($repoRoot, $repoRoot . '/mom/data');

        $config = $service->load();

        self::assertSame('KPI-ADMIN-CONSOLE-DYNAMIC-UX-P13', $config['admin_console_contract']['contract_id'] ?? null);
        self::assertSame('field_structured_no_raw_json', $config['admin_console_contract']['editor_mode'] ?? null);
        self::assertTrue($config['admin_console_contract']['ui_render_contract']['suppress_staged_numeric_values'] ?? false);
        self::assertSame('LAM-EVIDENCE-PACK-CONTRACT-P15', $config['lam_evidence_pack_contract']['contract_id'] ?? null);
        self::assertArrayHasKey('integrity_panels', $config['admin_views'] ?? []);
        self::assertArrayHasKey('bsc_model', $config['admin_views']['integrity_panels'] ?? []);
        self::assertArrayHasKey('annex128_matrix', $config['admin_views']['integrity_panels'] ?? []);
    }

    public function testConsoleEditableFieldsCoverUnifiedMetricControlEditor(): void
    {
        foreach ([
            'name_vi',
            'gate_pass_condition',
            'linked_cdr',
            'lam_profile_link',
            'customer_profile_link',
            'controllability_scope',
            'components',
            'required_evidence',
        ] as $field) {
            self::assertContains($field, KpiEngine::CONSOLE_EDITABLE_FIELDS);
        }
        foreach (['canonical_code', 'formula', 'data_source', 'calculation_status', 'metric_type'] as $field) {
            self::assertNotContains($field, KpiEngine::CONSOLE_EDITABLE_FIELDS);
        }
    }

    public function testCustomerRequirementProfileOverlaySanitizesAndValidates(): void
    {
        $service = $this->service();
        $sanitize = \Closure::bind(
            function (array $root): array {
                return $this->sanitizeCustomerRequirementProfiles($root);
            },
            $service,
            KpiRegistryAdminService::class,
        );
        $validate = \Closure::bind(
            function (array $root, array $governance, array $gate, array $seed): void {
                $this->validateCustomerRequirementProfiles($root, $governance, $gate, $seed);
            },
            $service,
            KpiRegistryAdminService::class,
        );

        $clean = $sanitize([
            'schema_version' => 1,
            'rule' => 'service test profile rule',
            'profiles' => [
                'acme_semiconductor' => [
                    'profile_name' => 'ACME Semiconductor',
                    'profile_name_vi' => 'Khách ACME bán dẫn',
                    'status' => 'active',
                    'applies_when' => [
                        'customer_codes' => 'ACME, ACME-SG',
                        'silent_default_forbidden' => true,
                    ],
                    'quality_requirements' => [
                        'ctq_master_required' => true,
                        'record_retention_years' => 10,
                    ],
                    'linked_metrics' => ['OTD'],
                ],
            ],
        ]);

        self::assertArrayHasKey('ACME_SEMICONDUCTOR', $clean['profiles']);
        self::assertSame(['ACME', 'ACME-SG'], $clean['profiles']['ACME_SEMICONDUCTOR']['applies_when']['customer_codes']);

        $validate(
            $clean,
            [['canonical_code' => 'OTD']],
            [],
            ['proposed_operating_metrics' => [], 'runtime_calculated_metrics' => []],
        );
        $this->addToAssertionCount(1);
    }

    public function testCustomerRequirementProfileRejectsUnknownLinkedMetric(): void
    {
        $service = $this->service();
        $sanitize = \Closure::bind(
            function (array $root): array {
                return $this->sanitizeCustomerRequirementProfiles($root);
            },
            $service,
            KpiRegistryAdminService::class,
        );
        $validate = \Closure::bind(
            function (array $root, array $governance, array $gate, array $seed): void {
                $this->validateCustomerRequirementProfiles($root, $governance, $gate, $seed);
            },
            $service,
            KpiRegistryAdminService::class,
        );

        $clean = $sanitize([
            'profiles' => [
                'ACME' => [
                    'profile_name' => 'ACME',
                    'applies_when' => ['customer_codes' => ['ACME']],
                    'quality_requirements' => ['iso9001_qms_required' => true],
                    'linked_metrics' => ['DOES_NOT_EXIST'],
                ],
            ],
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('kpi_registry_customer_profile_unknown_metric:ACME:DOES_NOT_EXIST');

        $validate($clean, [], [], ['proposed_operating_metrics' => [], 'runtime_calculated_metrics' => []]);
    }

    /**
     * @return callable(array<string, mixed>, bool): void
     */
    private function validator(): callable
    {
        $service = $this->service();

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

    private function service(): KpiRegistryAdminService
    {
        $repoRoot = dirname(__DIR__, 4);
        return new KpiRegistryAdminService($repoRoot, $repoRoot . '/mom/data');
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
            'decision_action' => 'Service test decision action when red.',
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
