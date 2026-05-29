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

    public function testRejectsCustomerSpecificMetricWithoutProfileOrApplicability(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_CUSTOMER_SPEC_NO_PROFILE_P03',
                    'metric_subtype' => 'operating_metric',
                    'control_intent' => 'customer_specific_requirement',
                    'measurement_data_type' => 'percent_ratio',
                    'scoring_model_detail' => 'evidence_completeness_score',
                    'required_evidence' => ['csr_ack_record'],
                    'data_contract_gap' => '',
                    'target_graduation_condition' => 'Profile and applicability approved.',
                    'lam_profile_link' => '',
                    'customer_profile_link' => '',
                    'applicability_rule' => '',
                ]);
            },
            'customer_specific_requirement requires customer/profile applicability or staged data-contract gap',
        );
    }

    public function testRejectsRoleMeasureWithoutControllability(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_ROLE_NO_CONTROL_P03',
                    'metric_subtype' => 'role_performance_measure',
                    'control_intent' => 'continuous_improvement',
                    'measurement_data_type' => 'percent_ratio',
                    'scoring_model_detail' => 'rag_3_band',
                    'role_assignments' => [
                        ['role' => 'QC', 'assignment_type' => 'role_measure_active', 'weight_pct' => 100],
                    ],
                    'controllability_scope' => '',
                ]);
            },
            'role_performance_measure requires controllability_scope',
        );
    }

    public function testRejectsBlockerMetricWithoutBlockerOnlyContract(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['proposed_operating_metrics'][] = self::baseFakeMetric([
                    'canonical_code' => 'FAKE_BLOCKER_RULE_DRIFT_P04',
                    'metric_subtype' => 'blocker_metric',
                    'control_intent' => 'gate_release_control',
                    'measurement_data_type' => 'risk_score',
                    'scoring_model_detail' => 'rag_3_band',
                    'reward_mode' => 'not_rewardable',
                    'blocking_conditions' => [],
                    'hold_release_rule' => '',
                    'decision_action' => '',
                ]);
            },
            'blocker_metric reward_mode must be blocker_only',
        );
    }

    public function testRejectsCanonicalCodeWithTranslatedCharacters(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CHECK_DIM_REPORT_ON_SHIP', static function (array &$row): void {
                    $row['canonical_code'] = 'CHECK_DIM_REPORT_ON_GIAO_HANG';
                });
            },
            "canonical_code 'CHECK_DIM_REPORT_ON_GIAO_HANG' must use only A-Z, 0-9, _",
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

    public function testRejectsLamEvidencePackLinkToUnknownMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO']['evidence_pack_metric_links'][] = 'FAKE_UNKNOWN_EVIDENCE_METRIC';
            },
            "customer_requirement_profiles LAM_SEMSYSCO: evidence_pack_metric_links references unknown metric 'FAKE_UNKNOWN_EVIDENCE_METRIC'.",
        );
    }

    public function testRejectsLamRiskClassApplicabilityMissingCategory(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                unset($registry['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO']['risk_class_gate_applicability']['HOT_ORDER']);
            },
            'customer_requirement_profiles LAM_SEMSYSCO: risk_class_gate_applicability.HOT_ORDER is missing.',
        );
    }

    public function testRejectsLamRiskClassApplicabilityMetricMappedToWrongGate(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['customer_requirement_profiles']['profiles']['LAM_SEMSYSCO']['risk_class_gate_applicability']['FIRST_ARTICLE']['gate_metrics']['G4'] = [
                    'SHIP_PACKET_COMPLETENESS',
                ];
            },
            "customer_requirement_profiles LAM_SEMSYSCO: risk_class_gate_applicability.FIRST_ARTICLE expects metric 'SHIP_PACKET_COMPLETENESS' on gate G4.",
        );
    }

    public function testRejectsRetentionMetricWithoutOwner(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'DOC_RECORD_RETENTION_10Y', static function (array &$row): void {
                    unset($row['retention_owner']);
                });
            },
            'Prompt 11 DOC_RECORD_RETENTION_10Y: retention_owner must not be empty.',
        );
    }

    public function testRejectsAdminConsoleServiceWithoutDynamicFieldGroup(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $service = $repoRoot . '/mom/api/services/KpiRegistryAdminService.php';
        $tmp = tempnam(sys_get_temp_dir(), 'kpi-admin-service-p10-');
        self::assertIsString($tmp);
        file_put_contents(
            $tmp,
            str_replace("'reward_control' => ['reward_mode', 'attribution_rule', 'counter_metric.intent', 'blocking_conditions', 'sample_policy.min_n_score'],", '', (string) file_get_contents($service)),
        );

        try {
            $this->assertFakeDriftRejected(
                static function (array &$registry): void {
                    // Registry remains intact; service contract drifts.
                },
                'dynamic_field_groups.reward_control is missing from service source',
                ['KPI_INTEGRITY_ADMIN_SERVICE' => $tmp],
            );
        } finally {
            @unlink($tmp);
        }
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
            'Gate IPQC_CHARACTERISTIC_COMPLETENESS: LAM gate metric must declare lam_profile_link=LAM_SEMSYSCO',
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

    public function testRejectsPilotRewardFreezeDrift(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['pilot_governance_program']['reward_freeze_controls']['monetary_payout_allowed'] = true;
            },
            'pilot_governance_program.reward_freeze_controls.monetary_payout_allowed must remain false',
        );
    }

    public function testRejectsPilotScopeUnknownMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['pilot_governance_program']['pilot_scope']['strategic_driver_panel'][] = 'FAKE_PILOT_SCOPE_UNKNOWN_METRIC_P14';
            },
            "pilot_governance_program pilot scope references unknown metric 'FAKE_PILOT_SCOPE_UNKNOWN_METRIC_P14'",
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

    public function testRejectsBonusSimulationCalibrationWithoutHr(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['bonus_simulation_model']['calibration_body'] = 'CEO + QMS + Finance';
            },
            'bonus_simulation_model.calibration_body must include HR',
        );
    }

    public function testRejectsRuntimeMetricWithoutDeclaredBackendStatus(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'OTD', static function (array &$row): void {
                    $row['backend_status'] = '';
                });
            },
            'Registry OTD: runtime_calculated must declare backend_status=runtime_calculated',
        );
    }

    public function testRejectsCustomerSeverityManualContractMissingContainmentField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CUSTOMER_NCR_SEVERITY_SCORE', static function (array &$row): void {
                    $row['manual_input_contract']['fields'] = array_values(array_filter(
                        $row['manual_input_contract']['fields'] ?? [],
                        static fn($field): bool => $field !== 'containment_status',
                    ));
                });
            },
            "CUSTOMER_NCR_SEVERITY_SCORE.manual_input_contract.fields missing 'containment_status'",
        );
    }

    public function testRejectsRepeatNcrRuleWithoutFailedControlId(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'REPEAT_NCR_RATE', static function (array &$row): void {
                    $row['repeat_detection_rule']['required_fields'] = array_values(array_filter(
                        $row['repeat_detection_rule']['required_fields'] ?? [],
                        static fn($field): bool => $field !== 'failed_control_id',
                    ));
                });
            },
            "REPEAT_NCR_RATE.repeat_detection_rule.required_fields missing 'failed_control_id'",
        );
    }

    public function testRejectsCapaEffectivenessTrainingOnlyDrift(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CAPA_EFFECTIVENESS', static function (array &$row): void {
                    $row['capa_effectiveness_rule']['training_only_not_accepted'] = false;
                });
            },
            'CAPA_EFFECTIVENESS.capa_effectiveness_rule.training_only_not_accepted must be true',
        );
    }

    public function testRejectsTrainingAsCapaManualContractMissingApprovalReference(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'TRAINING_AS_CAPA_COUNTER', static function (array &$row): void {
                    $row['manual_input_contract']['fields'] = array_values(array_filter(
                        $row['manual_input_contract']['fields'] ?? [],
                        static fn($field): bool => $field !== 'exception_approval_ref',
                    ));
                });
            },
            "TRAINING_AS_CAPA_COUNTER.manual_input_contract.fields missing 'exception_approval_ref'",
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

    public function testRejectsMissingPrompt06InsufficientCpkMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::removeMetric($registry, 'INSUFFICIENT_CPK_DATA_STATUS');
            },
            "Prompt 06 required metric 'INSUFFICIENT_CPK_DATA_STATUS' missing",
        );
    }

    public function testRejectsCtqOutOfSpecMetricOutsideG5(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CTQ_OUT_OF_SPEC_EVENT_COUNT', static function (array &$row): void {
                    $row['gate'] = 'G6';
                });
            },
            'Prompt 06 CTQ_OUT_OF_SPEC_EVENT_COUNT: must be a G5 gate_control_metric.',
        );
    }

    public function testRejectsMissingCtqDashboardPanelId(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                unset($registry['ctq_capability_policy']['dashboard_card_contract']['panel_id']);
            },
            'Prompt 06 ctq_capability_policy.dashboard_card_contract.panel_id must not be empty.',
        );
    }

    public function testRejectsCtqMetricWithoutCtqCapabilityUsageType(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'POST_CHANGE_CPK_REVALIDATION', static function (array &$row): void {
                    $row['usage_types'] = ['lam_profile_gate'];
                });
            },
            'Prompt 06 POST_CHANGE_CPK_REVALIDATION: usage_types must include ctq_capability_contract.',
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

    public function testRejectsPrompt07MissingConstraintMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::removeMetric($registry, 'CURRENT_CONSTRAINT_RESOURCE');
                $registry['dashboard_core_kpis'] = array_values(array_filter(
                    $registry['dashboard_core_kpis'],
                    static fn(array $row): bool => ($row['canonical_code'] ?? '') !== 'CURRENT_CONSTRAINT_RESOURCE',
                ));
            },
            "Prompt 07 required constraint metric 'CURRENT_CONSTRAINT_RESOURCE' missing.",
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

    public function testRejectsPrompt08MaterialReadinessMissingOverrideEvidenceField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'MATERIAL_AVAILABILITY_PLAN', static function (array &$row): void {
                    $row['readiness_component_contract']['manual_override_fields'] = array_values(array_filter(
                        $row['readiness_component_contract']['manual_override_fields'] ?? [],
                        static fn(string $field): bool => $field !== 'metadata.readiness_override_evidence_reference',
                    ));
                });
            },
            "Prompt 08 MATERIAL_AVAILABILITY_PLAN.readiness_component_contract: missing manual_override_field 'metadata.readiness_override_evidence_reference'.",
        );
    }

    public function testRejectsPrompt09ShipPacketDependencyMissingGageGate(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'SHIP_PACKET_COMPLETENESS', static function (array &$row): void {
                    $row['release_dependency_contract']['required_gate_metrics'] = array_values(array_filter(
                        $row['release_dependency_contract']['required_gate_metrics'] ?? [],
                        static fn(string $field): bool => $field !== 'GAGE_VALID_FOR_RELEASE',
                    ));
                });
            },
            "Prompt 09 SHIP_PACKET_COMPLETENESS.release_dependency_contract: missing required_gate_metric 'GAGE_VALID_FOR_RELEASE'.",
        );
    }

    public function testRejectsPrompt07ConstraintMetricMadeRewardable(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CONSTRAINT_LOST_HOURS', static function (array &$row): void {
                    $row['reward_eligible'] = true;
                    $row['reward_mode'] = 'bonus_pool_candidate';
                });
            },
            'Prompt 07 CONSTRAINT_LOST_HOURS: constraint metric must not be rewardable or scorecard contributing.',
        );
    }

    public function testRejectsPrompt07QueueMetricWithoutDailyManagementContext(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CMM_QUEUE_AGING', static function (array &$row): void {
                    $row['usage_contexts'] = ['lam_profile_gate'];
                });
            },
            'Prompt 07 CMM_QUEUE_AGING: queue metric must include daily_management or flow_constraint usage_context.',
        );
    }

    public function testRejectsPrompt07MissingConstraintRegisterContract(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                unset($registry['lean_flow_operating_model']['constraint_register_contract']);
            },
            'Prompt 07 lean_flow_operating_model: missing constraint_register_contract.contract_id.',
        );
    }

    public function testRejectsPrompt07ConstraintRegisterMissingBufferPolicy(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['lean_flow_operating_model']['constraint_register_contract']['required_fields'] = array_values(array_filter(
                    $registry['lean_flow_operating_model']['constraint_register_contract']['required_fields'] ?? [],
                    static fn(string $field): bool => $field !== 'buffer_policy',
                ));
            },
            "Prompt 07 lean_flow_operating_model.constraint_register_contract: missing 'buffer_policy'.",
        );
    }

    public function testRejectsPrompt07QueueContractMissingNeededByField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['lean_flow_operating_model']['queue_aging_contract']['required_fields'] = array_values(array_filter(
                    $registry['lean_flow_operating_model']['queue_aging_contract']['required_fields'] ?? [],
                    static fn(string $field): bool => $field !== 'needed_by_at',
                ));
            },
            "Prompt 07 lean_flow_operating_model.queue_aging_contract: missing 'needed_by_at'.",
        );
    }

    public function testRejectsPrompt07InspectionPlanAdherenceAsQueueMetric(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['lean_flow_operating_model']['cmm_qc_queue_metrics'][] = 'INSPECTION_PLAN_ADHERENCE';
            },
            'Prompt 07 lean_flow_operating_model: INSPECTION_PLAN_ADHERENCE must not be treated as a queue engine metric.',
        );
    }

    public function testRejectsPrompt07InspectionPlanAdherenceOnDailyBoard(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['lean_flow_operating_model']['daily_board_required_signals'][] = 'INSPECTION_PLAN_ADHERENCE';
            },
            'Prompt 07 daily_board_required_signals: INSPECTION_PLAN_ADHERENCE must stay off the daily flow board.',
        );
    }

    public function testRejectsPrompt08ManualGovernedMetricWithoutPrimaryEndpoint(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'SUBTIER_REQUIREMENT_FLOWDOWN', static function (array &$row): void {
                    unset($row['primary_endpoint']);
                });
            },
            'manual_governed metric must declare primary_endpoint=GET /api/kpi/SUBTIER_REQUIREMENT_FLOWDOWN',
        );
    }

    public function testRejectsPrompt08DashboardContractMissingGraduationField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['dashboard_render_contract']['required_fields_per_card'] = array_values(array_filter(
                    $registry['dashboard_render_contract']['required_fields_per_card'] ?? [],
                    static fn(string $field): bool => $field !== 'target_graduation_condition',
                ));
            },
            "dashboard_render_contract.required_fields_per_card: missing 'target_graduation_condition'.",
        );
    }

    public function testRejectsPrompt08CpkManualContractMissingSampleBand(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CPK_PRODUCT_MIN_CTQ', static function (array &$row): void {
                    $row['manual_input_contract']['fields'] = array_values(array_filter(
                        $row['manual_input_contract']['fields'] ?? [],
                        static fn(string $field): bool => $field !== 'sample_size_band',
                    ));
                });
            },
            "manual_input_contract drift — missing token 'sample_size_band'.",
        );
    }

    public function testRejectsPrompt07CmmQueueContractMissingOwnerRoleField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CMM_QUEUE_AGING', static function (array &$row): void {
                    $row['manual_input_contract']['fields'] = array_values(array_filter(
                        $row['manual_input_contract']['fields'] ?? [],
                        static fn(string $field): bool => $field !== 'owner_role',
                    ));
                });
            },
            "Prompt 07 CMM_QUEUE_AGING: manual_input_contract.fields missing 'owner_role'.",
        );
    }

    public function testRejectsPrompt07CmmQueueContractMissingNeededByField(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                self::mutateMetric($registry, 'CMM_QUEUE_AGING', static function (array &$row): void {
                    $row['manual_input_contract']['fields'] = array_values(array_filter(
                        $row['manual_input_contract']['fields'] ?? [],
                        static fn(string $field): bool => $field !== 'needed_by_at',
                    ));
                });
            },
            "Prompt 07 CMM_QUEUE_AGING: manual_input_contract.fields missing 'needed_by_at'.",
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

    public function testRejectsPrompt09BlocklistedGenericChecklistText(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['BUY']['active_scorecard'][0]['formula_or_checklist']
                    = 'Checklist: verify released work package, complete record, and close handover.';
            },
            "formula_or_checklist still contains generic blocklisted text 'verify released work package'.",
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

    public function testRejectsPrompt09SupportRoleCountWithoutJustification(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $card = &$registry['jd_kpi_scorecards']['roles']['ITA'];
                while (count($card['active_scorecard']) < 4) {
                    $copy = $card['active_scorecard'][0];
                    $copy['role_measure_code'] = 'ITA_FAKE_EXTRA_' . count($card['active_scorecard']);
                    $card['active_scorecard'][] = $copy;
                }
                unset($card['active_count_justification']);
            },
            "role_category 'support_specialist' has 4 active items; policy max 3 requires active_count_justification.",
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

    public function testRejectsPrompt12SupportRoleGenericTemplateText(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                $registry['jd_kpi_scorecards']['roles']['APAR']['active_scorecard'][0]['controllability_scope']
                    = "APAR kiểm soát trực tiếp bằng chứng 'invoice pack review' và các hành vi nằm trong ranh giới công việc của vai trò này; cụ thể là kiểm soát bằng chứng dữ liệu/tuân thủ, access-backup-recovery, hồ sơ tài chính/nhân sự/EHS/IT, chất lượng closure và escalation ngoại lệ trong quy trình hỗ trợ được giao. Không dùng measure này để gánh nguyên nhân ngoài ranh giới kiểm soát của APAR.";
            },
            "still contains generic blocklisted text 'kiểm soát bằng chứng dữ liệu/tuân thủ, access-backup-recovery, hồ sơ tài chính/nhân sự/ehs/it, chất lượng closure và escalation ngoại lệ trong quy trình hỗ trợ được giao.'",
        );
    }

    public function testRejectsPrompt15LamEvidencePackContractWithoutRetrievalKeys(): void
    {
        $this->assertFakeDriftRejected(
            static function (array &$registry): void {
                unset($registry['lam_evidence_pack_contract']['retrieval_test']['query_keys']);
            },
            'lam_evidence_pack_contract.retrieval_test.query_keys must include PO/shipment/job/packet lookup keys.',
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
