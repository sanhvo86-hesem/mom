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

    public function testRejectsBonusSimulationDisabled(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['bonus_simulation_model']['simulation_only'] = false;
            },
            'bonus_simulation_model.simulation_only MUST be true',
        );
    }

    public function testRejectsAnnex125Old15KpiWording(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $annex125 = $repoRoot . '/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html';
        $tmp = tempnam(sys_get_temp_dir(), 'kpi-annex125-drift-');
        self::assertIsString($tmp);
        file_put_contents(
            $tmp,
            (string) file_get_contents($annex125)
                . "\n<!-- fake drift: Scorecard lãnh đạo 15 KPI CNC-EXEC-BSC-15-2026 -->\n",
        );

        try {
            $this->assertFakeDriftRejected(
                static function (array &$registry): void {
                    // Registry remains LEAN-7; only the temp ANNEX-125 copy drifts.
                },
                'P0.20 BSC docs drift',
                ['KPI_INTEGRITY_ANNEX125' => $tmp],
            );
        } finally {
            @unlink($tmp);
        }
    }

    public function testRejectsCustomerSeverityMatrixHardGateWithoutRegisteredBlocker(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['customer_ncr_severity_matrix']['critical']['blocking_condition_id'] = 'unknown_hard_gate';
            },
            'customer_ncr_severity_matrix.critical blocking_condition_id',
        );
    }

    public function testRejectsCustomerNcrSeverityMetricRewardable(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CUSTOMER_NCR_SEVERITY_SCORE', static function (array &$row): void {
                    $row['reward_mode'] = 'bonus_pool_candidate';
                    $row['reward_eligible'] = true;
                });
            },
            'CUSTOMER_NCR_SEVERITY_SCORE: severity/hard-gate metrics must not be directly rewardable',
        );
    }

    public function testRejectsMissingPrompt05CustomerNcrMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::removeMetric($registry, 'NO_CONTAINMENT_COUNTER');
            },
            "Prompt 05 required metric 'NO_CONTAINMENT_COUNTER' missing",
        );
    }

    public function testRejectsRuntimeCpkWithoutCtqSpecSource(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CPK_PRODUCT_MIN_CTQ', static function (array &$row): void {
                    $row['calculation_status'] = 'runtime_calculated';
                    $row['data_source'] = ['measurement_sources' => ['mes_inline_measurements']];
                });
            },
            'Prompt 06 CPK_PRODUCT_MIN_CTQ: runtime Cpk metric requires CTQ spec source.',
        );
    }

    public function testRejectsCpkRewardableBeforeCustomerGrade(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CPK_PRODUCT_MIN_CTQ', static function (array &$row): void {
                    $row['reward_mode'] = 'bonus_pool_candidate';
                    $row['reward_eligible'] = true;
                });
            },
            'Prompt 06 CPK_PRODUCT_MIN_CTQ: Cpk/SPC capability metrics must not be directly rewardable',
        );
    }

    public function testRejectsCheckDimMetricMissingFromLamProfile(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $profile =& $registry['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO'];
                $profile['linked_metrics'] = array_values(array_filter(
                    $profile['linked_metrics'],
                    static fn(string $code): bool => $code !== 'CHECK_DIM_REPORT_ON_SHIP',
                ));
                $profile['gate_coverage']['G6'] = array_values(array_filter(
                    $profile['gate_coverage']['G6'],
                    static fn(string $code): bool => $code !== 'CHECK_DIM_REPORT_ON_SHIP',
                ));
            },
            'Prompt 06 LAM_SEMSYSCO: CHECK_DIM_REPORT_ON_SHIP must be linked',
        );
    }

    public function testRejectsCapabilityPolicyThatCanRenderGreenWithInsufficientSample(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['ctq_capability_policy']['sample_bands']['insufficient']['forbid_green'] = false;
            },
            'Prompt 06 ctq_capability_policy.sample_bands.insufficient must suppress numeric Cpk',
        );
    }

    public function testRejectsCpkMetricWithoutSpecContractOrStagedGap(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_CPK_NO_SPEC_GAP_P06',
                    'metric_subtype' => 'spc_capability_metric',
                    'control_intent' => 'quality_at_source',
                    'measurement_data_type' => 'spc_variable',
                    'scoring_model_detail' => 'spec_limit_capability',
                    'reward_mode' => 'not_rewardable',
                    'data_contract_gap' => '',
                    'sample_policy' => [
                        'min_n_score' => 25,
                        'provisional_n' => 25,
                        'internal_n' => 50,
                        'customer_grade_n' => 100,
                        'stability_required' => true,
                        'gage_validity_required' => true,
                    ],
                ]);
            },
            'Prompt 06 FAKE_CPK_NO_SPEC_GAP_P06: Cpk metric must declare CTQ spec source or staged data_contract_gap.',
        );
    }

    public function testRejectsGageValidityBlockerMissingForCtqMeasurement(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'GAGE_VALID_FOR_CTQ_MEASUREMENT', static function (array &$row): void {
                    $row['blocking_conditions'] = ['invalid_gage_used_for_ipqc_or_spc'];
                });
            },
            'Prompt 06 GAGE_VALID_FOR_CTQ_MEASUREMENT: missing invalid_gage_used_for_ctq_measurement blocker.',
        );
    }

    public function testRejectsPrompt07RuntimeMetricStillCarryingStagedGap(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'NCR_3D_RESPONSE_SLA', static function (array &$row): void {
                    $row['data_contract_gap'] = 'fake stale gap after runtime graduation';
                });
            },
            'Prompt 07 NCR_3D_RESPONSE_SLA: runtime metric must not retain data_contract_gap.',
        );
    }

    public function testRejectsPrompt07ManualGovernedMetricWithoutVerificationContract(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CHECK_DIM_REPORT_ON_SHIP', static function (array &$row): void {
                    unset($row['manual_input_contract']['verification']);
                });
            },
            'Prompt 07 CHECK_DIM_REPORT_ON_SHIP: manual_governed metric requires manual_input_contract.verification.',
        );
    }

    public function testRejectsPrompt07DashboardRuntimeMetricStillStaged(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                foreach ($registry['dashboard_core_kpis'] as &$row) {
                    if (is_array($row) && ($row['canonical_code'] ?? '') === 'NCR_8D_UPDATE_SLA') {
                        $row['backend_status'] = 'staged_data_contract';
                        unset($row);
                        return;
                    }
                }
                unset($row);
                self::fail('Dashboard row NCR_8D_UPDATE_SLA not found.');
            },
            'Prompt 07 dashboard NCR_8D_UPDATE_SLA: backend_status must be runtime_calculated.',
        );
    }

    public function testRejectsPrompt08MissingConstraintMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::removeMetric($registry, 'CURRENT_CONSTRAINT_RESOURCE');
                $registry['dashboard_core_kpis'] = array_values(array_filter(
                    $registry['dashboard_core_kpis'],
                    static fn(array $row): bool => ($row['canonical_code'] ?? '') !== 'CURRENT_CONSTRAINT_RESOURCE',
                ));
            },
            "Prompt 08 required constraint metric 'CURRENT_CONSTRAINT_RESOURCE' missing.",
        );
    }

    public function testRejectsPrompt08MaterialReadinessMissingCertComponent(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'MATERIAL_AVAILABILITY_PLAN', static function (array &$row): void {
                    $row['components'] = array_values(array_filter(
                        $row['components'] ?? [],
                        static fn(array $component): bool => ($component['code'] ?? '') !== 'mill_cert_coc_verified',
                    ));
                });
            },
            "Prompt 08 MATERIAL_AVAILABILITY_PLAN: missing readiness component 'mill_cert_coc_verified'.",
        );
    }

    public function testRejectsPrompt08ConstraintMetricMadeRewardable(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CONSTRAINT_LOST_HOURS', static function (array &$row): void {
                    $row['reward_eligible'] = true;
                    $row['reward_mode'] = 'bonus_pool_candidate';
                });
            },
            'Prompt 08 CONSTRAINT_LOST_HOURS: constraint metric must not be rewardable or scorecard contributing.',
        );
    }

    public function testRejectsPrompt08QueueMetricWithoutDailyManagementContext(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CMM_QUEUE_AGING', static function (array &$row): void {
                    $row['usage_contexts'] = ['lam_profile_gate'];
                });
            },
            'Prompt 08 CMM_QUEUE_AGING: queue metric must include daily_management or flow_constraint usage_context.',
        );
    }

    public function testRejectsPrompt09GenericRoleMeasureText(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard'][0]['controllability_scope']
                    = 'Role accountable only for the evidence and actions inside the JD authority boundary; upstream blockers must be logged and escalated.';
            },
            'generic template controllability text was not de-templated',
        );
    }

    public function testRejectsPrompt09FrontlineOutcomeMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard'][0]['kpi_code'] = 'OTD';
            },
            'frontline role cannot carry OTD/COPQ/gross-margin',
        );
    }

    public function testRejectsPrompt09MissingRoleBlockers(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                unset($registry['jd_kpi_scorecards']['roles']['QC']['role_blockers']);
            },
            'missing role_blockers for controllability/fairness governance',
        );
    }

    public function testRejectsPrompt09RoleWithMoreThanSixActiveMeasuresWithoutJustification(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $item = $registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard'][0];
                while (count($registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard']) <= 6) {
                    $copy = $item;
                    $copy['role_measure_code'] = 'OPR_FAKE_EXTRA_' . count($registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard']);
                    $registry['jd_kpi_scorecards']['roles']['OPR']['active_scorecard'][] = $copy;
                }
            },
            '>6 requires active_count_justification',
        );
    }

    public function testRejectsPrompt09JdFileWithoutRegistryRenderer(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['OPR']['jd_file']
                    = 'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html';
            },
            'does not load the registry JD scorecard renderer',
        );
    }

    public function testRejectsPrompt09RoleMeasureMadeRewardable(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['QC']['active_scorecard'][0]['scorecard_contributes_to_reward'] = true;
            },
            'role measures must stay not_rewardable in Prompt 09',
        );
    }

    /**
     * @param callable(array<string, mixed>): void $mutate
     * @param array<string, string> $extraEnv
     */
    private function assertFakeDriftRejected(callable $mutate, string $expectedOutput, array $extraEnv = []): void
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
            $env = 'KPI_INTEGRITY_REGISTRY=' . escapeshellarg($tmp);
            foreach ($extraEnv as $name => $value) {
                $env .= ' ' . $name . '=' . escapeshellarg($value);
            }
            $command = $env
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
     * @param array<string, mixed> $registry
     */
    private static function removeMetric(array &$registry, string $code): void
    {
        foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $section) {
            $before = count($registry[$section]);
            $registry[$section] = array_values(array_filter(
                $registry[$section],
                static fn(array $row): bool => strtoupper((string) ($row['canonical_code'] ?? '')) !== $code,
            ));
            if (count($registry[$section]) !== $before) {
                return;
            }
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
