<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use InvalidArgumentException;
use MOM\Services\DashboardService;
use MOM\Services\DateRange;
use MOM\Services\KpiEngine;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class KpiEngineAuthorityRegistryTest extends TestCase
{
    public function testRuntimeMetricsMatchGovernedRegistry(): void
    {
        $registry = $this->readRegistry();

        $this->assertSame(
            KpiEngine::ALL_METRICS,
            $registry['runtime_calculated_metrics'] ?? [],
            'Runtime KPI list must remain the approved KpiEngine auto-registration set.',
        );
    }

    public function testLegacyMetricAliasesNormalizeToCanonicalRuntimeCodes(): void
    {
        $engine = $this->newEngineWithoutConstructor();

        $this->assertSame('SCRAP_RATE', $this->invokeNormalize($engine, 'SCRAP'));
        $this->assertSame('CAPA_CLOSURE', $this->invokeNormalize($engine, 'CAPA-CLOSE'));
        $this->assertSame('COMPLAINT_RATE', $this->invokeNormalize($engine, 'CCR'));
        $this->assertSame('SUPPLIER_QUAL', $this->invokeNormalize($engine, 'SQI'));
        $this->assertSame('TRAINING_COMP', $this->invokeNormalize($engine, 'TRN-COMP'));
        $this->assertSame('CYCLE_TIME_VARIANCE', $this->invokeNormalize($engine, 'CYCLE-VAR'));
        $this->assertSame('QC_HOLD_SLA', $this->invokeNormalize($engine, 'QC_HOLD'));
    }

    public function testAutoRegistrationRejectsMetricOutsideRuntimeAuthority(): void
    {
        $engine = $this->newEngineWithoutConstructor();
        $method = (new ReflectionClass(KpiEngine::class))->getMethod('registerKpiDefinition');

        $this->expectException(InvalidArgumentException::class);
        $method->invoke($engine, 'OEE_BOTTLENECK');
    }

    public function testExecutiveScorecardKeepsOnlyLeanRuntimeCoreInCompanyScorecard(): void
    {
        $registry = $this->readRegistry();
        $scorecard = $registry['executive_scorecard'] ?? [];

        $this->assertSame([
            'OTD',
            'COMPLAINT_RATE',
            'FPY',
            'COPQ',
            'PLAN_ADHERENCE',
            'WIP_AGING',
            'MATERIAL_AVAILABILITY_PLAN',
        ], $scorecard);
        $this->assertNotContains('GROSS_MARGIN_JOB_FAMILY', $scorecard);
        $this->assertNotContains('OEE_BOTTLENECK', $scorecard);
        $this->assertNotContains('THROUGHPUT_PER_CONSTRAINT_HOUR', $scorecard);
        $this->assertNotContains('SUPPLIER_READINESS', $scorecard);
        $this->assertNotContains('IN_PROCESS_REJECT_RATE', $scorecard);
        $this->assertNotContains('SUPPLIER_OTD', $scorecard);
        $this->assertNotContains('SUPPLIER_QUAL', $scorecard);
        $this->assertNotContains('OEE_BOTTLENECK', KpiEngine::ALL_METRICS);
    }

    public function testCatalogExposesDocumentAndBackendCoverage(): void
    {
        $engine = $this->newEngineWithoutConstructor();
        $catalog = $engine->getMetricCatalog();

        $this->assertSame(35, $catalog['counts']['runtime_calculated_metrics'] ?? null);
        $this->assertSame(31, $catalog['counts']['dashboard_core_kpis'] ?? null);
        $this->assertSame(46, $catalog['counts']['gate_control_metrics'] ?? null);
        $this->assertSame(142, $catalog['counts']['proposed_operating_metrics'] ?? null);
        $this->assertSame(
            'CTQ-CAPABILITY-POLICY-LAM-SEMSYSCO-2026-05',
            $catalog['ctq_capability_policy']['policy_id'] ?? null,
        );
        $this->assertSame(
            'CTQ-SPC-CAPABILITY-DATA-CONTRACT-2026-05',
            $catalog['ctq_data_contract']['contract_id'] ?? null,
        );
        $this->assertNotEmpty($catalog['data_contract_required_fields'] ?? []);
        $this->assertContains('canonical_code', $catalog['data_contract_required_fields'] ?? []);
        $this->assertContains('metric_type', $catalog['data_contract_required_fields'] ?? []);
        $this->assertContains('evaluation_use', $catalog['data_contract_required_fields'] ?? []);
        $this->assertContains('scorecard_weight_pct', $catalog['metric_governance_schema']['required_catalog_fields'] ?? []);
        $this->assertContains('quantitative_thresholds', $catalog['metric_governance_schema']['required_catalog_fields'] ?? []);
        $this->assertSame(
            'A measurement may be called KPI only when it has an approved evaluation use. If it is not used for evaluation, call it operating metric, control metric, gate metric, role performance measure, or health indicator.',
            $catalog['performance_governance_policy']['naming_rule'] ?? null,
        );
        $this->assertSame(
            'A KPI/metric change is not complete and must not be used for dashboard, evaluation, recognition, reward, corrective action, or discipline until the matrix and related documents are updated and the audit script is rerun.',
            $catalog['change_control_policy']['release_gate'] ?? null,
        );
        $this->assertSame(
            '_reports/kpi/report-kpi-performance-governance-2026-04-18.json',
            $catalog['performance_governance_audit']['audit_report'] ?? null,
        );
        $this->assertContains('metric_type', $catalog['metric_governance_schema']['required_catalog_fields'] ?? []);
        $this->assertSame('CNC-EXEC-BSC-LEAN-7+DRIVERS-2026', $catalog['scorecard_operating_model']['model_id'] ?? null);
        $this->assertSame(
            'KPI-DASHBOARD-RENDER-CONTRACT-1',
            $catalog['dashboard_render_contract']['contract_id'] ?? null,
        );
        $this->assertSame(
            'LEAN-TOC-CMM-MATERIAL-READINESS-2026-05',
            $catalog['lean_flow_operating_model']['model_id'] ?? null,
        );
        $this->assertSame(
            'Prompt 07 - Lean flow, TOC, CMM queue and material readiness hardening',
            $catalog['lean_flow_operating_model']['introduced_by_prompt'] ?? null,
        );
        $this->assertNotContains('INSPECTION_PLAN_ADHERENCE', $catalog['lean_flow_operating_model']['cmm_qc_queue_metrics'] ?? []);
        $this->assertContains('INSPECTION_PLAN_ADHERENCE', $catalog['lean_flow_operating_model']['queue_discipline_support_metrics'] ?? []);
        $this->assertNotContains('INSPECTION_PLAN_ADHERENCE', $catalog['lean_flow_operating_model']['daily_board_required_signals'] ?? []);
        $this->assertContains('needed_by_at', $catalog['lean_flow_operating_model']['queue_aging_contract']['required_fields'] ?? []);
        $this->assertContains('completion_at', $catalog['lean_flow_operating_model']['queue_aging_contract']['required_fields'] ?? []);
        $this->assertContains('buffer_policy', $catalog['lean_flow_operating_model']['constraint_register_contract']['required_fields'] ?? []);
        $this->assertContains('protection_action', $catalog['lean_flow_operating_model']['constraint_register_contract']['required_fields'] ?? []);
        $this->assertSame(true, $catalog['bonus_simulation_model']['simulation_only'] ?? null);
        $this->assertStringContainsString('HR', (string) ($catalog['bonus_simulation_model']['calibration_body'] ?? ''));
        $this->assertArrayHasKey('critical', $catalog['customer_ncr_severity_matrix'] ?? []);
        $this->assertNotEmpty($catalog['customer_ncr_data_contract']['required_fields'] ?? []);

        $metricsByCode = [];
        foreach (($catalog['metrics'] ?? []) as $metric) {
            $this->assertIsArray($metric);
            $this->assertNotEmpty($metric['metric_type'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertIsBool($metric['is_official_kpi'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertNotEmpty($metric['usage_types'] ?? [], (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertNotEmpty($metric['calculation_status'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertNotEmpty($metric['motive'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertNotEmpty($metric['expected_result'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertNotEmpty($metric['decision_purpose'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertIsArray($metric['consequence'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertIsArray($metric['data_contract'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertArrayHasKey('scorecard_weight_pct', $metric, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertArrayHasKey('quantitative_thresholds', $metric, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertArrayHasKey('rating_criteria', $metric, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertArrayHasKey('reward_rule', $metric, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertArrayHasKey('blocking_conditions', $metric, (string) ($metric['canonical_code'] ?? 'unknown'));
            $this->assertIsArray($metric['metric_control'] ?? null, (string) ($metric['canonical_code'] ?? 'unknown'));
            $metricsByCode[$metric['canonical_code']] = $metric;
        }

        $this->assertSame('runtime_calculated', $metricsByCode['OTD']['backend_status'] ?? null);
        $this->assertTrue($metricsByCode['OTD']['is_official_kpi'] ?? false);
        $this->assertSame('company_scorecard', $metricsByCode['OTD']['evaluation_use'] ?? null);
        $this->assertSame(18.0, $metricsByCode['OTD']['scorecard_weight_pct'] ?? null);
        $this->assertSame('percent', $metricsByCode['OTD']['scorecard_unit'] ?? null);
        $this->assertSame(95.0, $metricsByCode['OTD']['scorecard_target'] ?? null);
        $this->assertTrue($metricsByCode['OTD']['scorecard_higher_is_better'] ?? false);
        $this->assertSame('active_runtime', $metricsByCode['OTD']['scorecard_scoring_status'] ?? null);
        $this->assertFalse($metricsByCode['OTD']['scorecard_contributes_to_reward'] ?? true);
        $this->assertFalse($metricsByCode['OTD']['reward_eligible'] ?? true);
        $this->assertTrue($metricsByCode['OTD']['reward_freeze_active'] ?? false);
        $this->assertSame('pilot_reward_freeze_active', $metricsByCode['OTD']['consequence']['monetary_recognition_status'] ?? null);
        $this->assertSame(
            $metricsByCode['OTD']['reward_rule'] ?? null,
            $metricsByCode['OTD']['consequence']['recognition_rule'] ?? null,
        );
        $this->assertSame(95, $metricsByCode['OTD']['quantitative_thresholds']['green_min'] ?? null);
        $this->assertContains('executive_scorecard', $metricsByCode['OTD']['usage_types'] ?? []);
        $this->assertContains('gate_control', $metricsByCode['OTD']['usage_types'] ?? []);
        $this->assertSame(false, $metricsByCode['OEE_BOTTLENECK']['runtime_calculated'] ?? null);
        $this->assertSame('staged_data_contract', $metricsByCode['OEE_BOTTLENECK']['calculation_status'] ?? null);
        $this->assertNull($metricsByCode['OEE_BOTTLENECK']['scorecard_weight_pct'] ?? null);
        $this->assertSame('not_applicable', $metricsByCode['OEE_BOTTLENECK']['scorecard_scoring_status'] ?? null);
        $this->assertFalse($metricsByCode['OEE_BOTTLENECK']['scorecard_contributes_to_reward'] ?? true);
        $this->assertSame('gate_control_metric', $metricsByCode['SPC_SIGNAL_REACTION_TIME']['metric_type'] ?? null);
        $this->assertFalse($metricsByCode['SPC_SIGNAL_REACTION_TIME']['is_official_kpi'] ?? true);
        $this->assertFalse($metricsByCode['SPC_SIGNAL_REACTION_TIME']['scorecard_applicable'] ?? true);
        $this->assertSame('not_applicable', $metricsByCode['SPC_SIGNAL_REACTION_TIME']['scorecard_scoring_status'] ?? null);
        $this->assertSame('runtime_calculated', $metricsByCode['SHIP_PACKET_COMPLETENESS']['calculation_status'] ?? null);
        $this->assertSame('runtime_calculated', $metricsByCode['NCR_3D_RESPONSE_SLA']['calculation_status'] ?? null);
        $this->assertSame('runtime_calculated', $metricsByCode['NCR_4D_PRELIMINARY_SLA']['calculation_status'] ?? null);
        $this->assertSame('runtime_calculated', $metricsByCode['NCR_8D_UPDATE_SLA']['calculation_status'] ?? null);
        $this->assertSame('runtime_calculated', $metricsByCode['CUSTOMER_ACCEPTED_8D_CLOSURE_RATE']['calculation_status'] ?? null);
        $this->assertSame('manual_governed', $metricsByCode['FINAL_RELEASE_RFT']['calculation_status'] ?? null);
        $this->assertSame('manual_governed', $metricsByCode['CHECK_DIM_REPORT_ON_SHIP']['calculation_status'] ?? null);
        $this->assertSame('manual_governed', $metricsByCode['CURRENT_CONSTRAINT_RESOURCE']['calculation_status'] ?? null);
        $this->assertContains('buffer_policy', $metricsByCode['CURRENT_CONSTRAINT_RESOURCE']['manual_input_contract']['fields'] ?? []);
        $this->assertContains('protection_action', $metricsByCode['CURRENT_CONSTRAINT_RESOURCE']['manual_input_contract']['fields'] ?? []);
        $this->assertSame('staged_data_contract', $metricsByCode['CONSTRAINT_STARVED_TIME']['calculation_status'] ?? null);
        $this->assertSame('staged_data_contract', $metricsByCode['CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS']['calculation_status'] ?? null);
        $this->assertFalse($metricsByCode['CURRENT_CONSTRAINT_RESOURCE']['scorecard_contributes_to_reward'] ?? true);
        $this->assertContains('flow_constraint', $metricsByCode['CONSTRAINT_STARVED_TIME']['metric_control']['usage_contexts'] ?? []);
        $this->assertSame('staged_data_contract', $metricsByCode['FAI_QUEUE_AGING']['calculation_status'] ?? null);
        $this->assertSame('staged_data_contract', $metricsByCode['FINAL_INSPECTION_QUEUE_AGING']['calculation_status'] ?? null);
        $this->assertContains('needed_by_at', $metricsByCode['CMM_QUEUE_AGING']['manual_input_contract']['fields'] ?? []);
        $this->assertContains('completion_at', $metricsByCode['CMM_QUEUE_AGING']['manual_input_contract']['fields'] ?? []);
        $this->assertContains('needed_by_at', $metricsByCode['QC_HOLD_SLA']['manual_input_contract']['fields'] ?? []);
        $this->assertContains('completion_at', $metricsByCode['QC_HOLD_SLA']['manual_input_contract']['fields'] ?? []);
        $this->assertSame('composite_readiness_index', $metricsByCode['MATERIAL_AVAILABILITY_PLAN']['metric_control']['type']['metric_subtype'] ?? null);
        $this->assertContains(
            'metadata.readiness_override_evidence_reference',
            $metricsByCode['MATERIAL_AVAILABILITY_PLAN']['readiness_component_contract']['manual_override_fields'] ?? [],
        );
        $this->assertStringContainsString(
            'physical_ready=true',
            (string) ($metricsByCode['MATERIAL_AVAILABILITY_PLAN']['readiness_block_rule'] ?? ''),
        );
        $this->assertSame(5, $metricsByCode['FAI_FIRST_PASS']['small_lot_review_policy']['below_n'] ?? null);
        $this->assertSame(10, $metricsByCode['IN_PROCESS_REJECT_RATE']['small_lot_review_policy']['below_n'] ?? null);
        $this->assertContains(
            'GAGE_VALID_FOR_RELEASE',
            $metricsByCode['SHIP_PACKET_COMPLETENESS']['release_dependency_contract']['required_gate_metrics'] ?? [],
        );
        $this->assertContains(
            'customer_notification_status',
            $metricsByCode['CUSTOMER_NCR_SEVERITY_SCORE']['manual_input_contract']['fields'] ?? [],
        );
        $this->assertContains(
            'falsification_investigation_ref',
            $metricsByCode['CUSTOMER_NCR_SEVERITY_SCORE']['manual_input_contract']['fields'] ?? [],
        );
        $this->assertSame(365, $metricsByCode['REPEAT_NCR_RATE']['repeat_detection_rule']['lookback_days'] ?? null);
        $this->assertSame(
            true,
            $metricsByCode['CAPA_EFFECTIVENESS']['capa_effectiveness_rule']['training_only_not_accepted'] ?? null,
        );
        $this->assertSame(
            'TRAINING_AS_CAPA_COUNTER',
            $metricsByCode['CAPA_EFFECTIVENESS']['capa_effectiveness_rule']['linked_counter_metric'] ?? null,
        );
        $this->assertContains(
            'exception_approval_ref',
            $metricsByCode['TRAINING_AS_CAPA_COUNTER']['manual_input_contract']['fields'] ?? [],
        );
        $this->assertNotSame('company_scorecard', $metricsByCode['SUPPLIER_READINESS']['evaluation_use'] ?? null);
        $this->assertNull($metricsByCode['SUPPLIER_READINESS']['scorecard_weight_pct'] ?? null);
        $this->assertNull($metricsByCode['RECORDABLE_INCIDENT_RATE']['scorecard_weight_pct'] ?? null);
        $this->assertSame('not_applicable', $metricsByCode['RECORDABLE_INCIDENT_RATE']['scorecard_scoring_status'] ?? null);
        $this->assertFalse($metricsByCode['RECORDABLE_INCIDENT_RATE']['scorecard_contributes_to_reward'] ?? true);
        $this->assertSame(14.0, $metricsByCode['PLAN_ADHERENCE']['scorecard_weight_pct'] ?? null);
        $this->assertSame(14.0, $metricsByCode['MATERIAL_AVAILABILITY_PLAN']['scorecard_weight_pct'] ?? null);
        $this->assertContains('gate_control_metrics', $metricsByCode['FPY']['sources'] ?? []);
        $this->assertContains('BSC-CORE-03', $metricsByCode['FPY']['local_ids'] ?? []);
        $this->assertContains('KPI-ALL-02', $metricsByCode['FPY']['local_ids'] ?? []);
        $lamGateControl = $metricsByCode['CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED']['metric_control'] ?? [];
        $this->assertSame('gate_control_metric', $lamGateControl['type']['metric_subtype'] ?? null);
        $this->assertSame('blocker_only', $lamGateControl['reward']['reward_mode'] ?? null);
        $this->assertTrue($lamGateControl['staged_value_suppression']['suppressed'] ?? false);
        $this->assertSame('present', $lamGateControl['counter_metric_status']['status'] ?? null);
        $ctqCapability = $metricsByCode['CPK_PRODUCT_MIN_CTQ']['metric_control'] ?? [];
        $this->assertSame('ctq_capability_policy', $ctqCapability['capability']['policy'] ?? null);
        $this->assertSame('CTQ-STATUS-CARD-LAM-2026-05', $ctqCapability['ctq_status_card']['panel_id'] ?? null);
        $this->assertContains('sample_band', $ctqCapability['ctq_status_card']['capability_fields'] ?? []);
        $ctqGate = $metricsByCode['GAGE_VALID_FOR_CTQ_MEASUREMENT']['metric_control'] ?? [];
        $this->assertSame('CTQ-STATUS-CARD-LAM-2026-05', $ctqGate['ctq_status_card']['panel_id'] ?? null);
        $this->assertSame('ctq_capability_policy', $ctqGate['ctq_status_card']['policy_ref'] ?? null);
    }

    public function testExecutiveScorecardWeightsAndQuantitativeRulesAreComplete(): void
    {
        $registry = $this->readRegistry();
        $scorecard = $registry['executive_scorecard'] ?? [];
        $items = $registry['scorecard_operating_model']['executive_scorecard_items'] ?? [];
        $this->assertIsArray($scorecard);
        $this->assertIsArray($items);
        $this->assertSame(7, count($items));

        $itemsByCode = [];
        $weightTotal = 0.0;
        $blockingIds = [];
        foreach ($items as $item) {
            $this->assertIsArray($item);
            $code = $item['canonical_code'] ?? null;
            $this->assertIsString($code);
            $itemsByCode[$code] = $item;
            $weightTotal += (float) ($item['scorecard_weight_pct'] ?? 0);
            $this->assertNotEmpty($item['unit'] ?? null, $code);
            $this->assertIsNumeric($item['target'] ?? null, $code);
            $this->assertIsBool($item['higher_is_better'] ?? null, $code);
            $this->assertNotEmpty($item['quantitative_thresholds'] ?? [], $code);
            $this->assertNotEmpty($item['rating_criteria'] ?? null, $code);
            $this->assertNotEmpty($item['reward_rule'] ?? null, $code);
            $this->assertNotEmpty($item['blocking_conditions'] ?? [], $code);
            foreach ((array) ($item['blocking_conditions'] ?? []) as $conditionId) {
                $this->assertIsString($conditionId);
                $blockingIds[] = $conditionId;
            }
        }
        foreach ((array) ($registry['scorecard_operating_model']['reward_policy']['blocking_conditions'] ?? []) as $conditionId) {
            $this->assertIsString($conditionId);
            $blockingIds[] = $conditionId;
        }

        $registeredBlockingIds = [];
        foreach ((array) ($registry['blocking_condition_registry']['groups'] ?? []) as $group) {
            $this->assertIsArray($group);
            foreach ((array) ($group['condition_ids'] ?? []) as $conditionId) {
                $this->assertIsString($conditionId);
                $registeredBlockingIds[] = $conditionId;
            }
        }

        $expectedCodes = array_values(array_map('strval', $scorecard));
        $itemCodes = array_keys($itemsByCode);
        sort($expectedCodes);
        sort($itemCodes);
        $this->assertSame($expectedCodes, $itemCodes);
        $this->assertSame([], array_values(array_diff(array_unique($blockingIds), array_unique($registeredBlockingIds))));
        $this->assertEqualsWithDelta(100.0, $weightTotal, 0.0001);
        foreach ($scorecard as $code) {
            $this->assertIsString($code);
            $this->assertArrayHasKey($code, $itemsByCode, "{$code} must have a scorecard operating rule.");
        }
    }

    public function testExecutiveScorecardCatalogExposesEvidenceContracts(): void
    {
        $engine = $this->newEngineWithoutConstructor();
        $catalog = $engine->getMetricCatalog();
        $scorecardCodes = $catalog['executive_scorecard'] ?? [];
        $metricsByCode = [];
        foreach (($catalog['metrics'] ?? []) as $metric) {
            $this->assertIsArray($metric);
            $metricsByCode[(string) ($metric['canonical_code'] ?? '')] = $metric;
        }

        $this->assertCount(7, $scorecardCodes);
        foreach ($scorecardCodes as $code) {
            $this->assertIsString($code);
            $metric = $metricsByCode[$code] ?? null;
            $this->assertIsArray($metric, $code);
            $this->assertTrue($metric['scorecard_applicable'] ?? false, $code);
            $this->assertNotEmpty($metric['scorecard_unit'] ?? null, $code);
            $this->assertIsFloat($metric['scorecard_target'] ?? null, $code);
            $this->assertIsBool($metric['scorecard_higher_is_better'] ?? null, $code);
            $this->assertNotEmpty($metric['scorecard_scoring_status'] ?? null, $code);
            $this->assertIsArray($metric['data_contract'] ?? null, $code);
            $this->assertNotSame(
                'approved MOM/MES/EQMS/ERP read model or staged data contract',
                $metric['data_contract']['source_system'] ?? null,
                $code,
            );
            $this->assertNotSame(
                'source document, event log, form, snapshot, or governed data contract',
                $metric['data_contract']['evidence_record'] ?? null,
                $code,
            );
        }
    }

    public function testExecutiveDashboardUsesGovernedLeanKpiScorecard(): void
    {
        $registry = $this->readRegistry();
        $expectedCodes = array_values(array_map('strval', $registry['executive_scorecard'] ?? []));
        $dashboard = (new ReflectionClass(DashboardService::class))->newInstanceWithoutConstructor();
        $kpiProperty = (new ReflectionClass(DashboardService::class))->getProperty('kpi');
        if (PHP_VERSION_ID < 80100) {
            $kpiProperty->setAccessible(true);
        }
        $kpiProperty->setValue($dashboard, $this->newEngineWithoutConstructor());

        $payload = $dashboard->getExecutiveDashboard(new DateRange('2026-01-01', '2026-01-31'));
        $this->assertSame($expectedCodes, array_keys($payload['kpis'] ?? []));
        $this->assertArrayNotHasKey('SCRAP_RATE', $payload['kpis'] ?? []);
        $this->assertArrayNotHasKey('CAPA_CLOSURE', $payload['kpis'] ?? []);
        $this->assertArrayNotHasKey('PUT_THRU', $payload['kpis'] ?? []);
        $this->assertSame(
            'CNC-EXEC-BSC-LEAN-7+DRIVERS-2026',
            $payload['kpis']['OTD']['scorecard']['model_id'] ?? null,
        );
    }

    public function testJdScorecardsExposeControllabilityAndCandidateModel(): void
    {
        $engine = $this->newEngineWithoutConstructor();
        $scorecards = $engine->jdScorecards();

        $this->assertSame('active_candidate_role_scorecard', $scorecards['model'] ?? null);
        $this->assertSame(
            'P09-JD-ROLE-SCORECARD-DETEMPLATE-2026-05',
            $scorecards['detemplating_policy']['policy_id'] ?? null,
        );
        $roles = $scorecards['roles'] ?? [];
        $this->assertIsArray($roles);
        $this->assertArrayHasKey('OPR', $roles);
        $this->assertArrayHasKey('FIN', $roles);

        $opr = $roles['OPR'];
        $this->assertSame(3, $opr['active_measure_count'] ?? null);
        $this->assertNotEmpty($opr['candidate_bank'] ?? []);
        $this->assertNotEmpty($opr['optional_rotate'] ?? []);
        $this->assertNotEmpty($opr['do_not_use'] ?? []);
        $this->assertNotEmpty($opr['role_blockers'] ?? []);
        $this->assertNotEmpty($opr['controllability_scope'] ?? null);
        $this->assertStringContainsString('not automatic reward', strtolower((string) ($opr['not_automatic_reward_or_discipline_warning'] ?? '')));

        foreach (($opr['active_scorecard'] ?? []) as $item) {
            $this->assertIsArray($item);
            $this->assertFalse($item['scorecard_contributes_to_reward'] ?? true);
            $this->assertSame('not_rewardable', $item['reward_mode'] ?? null);
            $this->assertNotEmpty($item['target_definition'] ?? null);
            $this->assertNotEmpty($item['formula_or_checklist'] ?? null);
            $this->assertNotEmpty($item['action_when_red'] ?? null);
            $this->assertNotEmpty($item['controllability_scope'] ?? null);
            $this->assertNotEmpty($item['attribution_rule'] ?? null);
            $this->assertNotEmpty($item['lifecycle_status'] ?? null);
            $this->assertNotSame(
                'Role accountable only for the evidence and actions inside the JD authority boundary; upstream blockers must be logged and escalated.',
                $item['controllability_scope'] ?? '',
            );
        }

        $oprCodes = array_column($opr['active_scorecard'] ?? [], 'kpi_code');
        $this->assertContains('TIME_ENTRY_COMPLIANCE', $oprCodes);
        $this->assertNotContains('OTD', $oprCodes);
        $this->assertNotContains('COPQ', $oprCodes);
        $this->assertNotContains('GROSS_MARGIN_JOB_FAMILY', $oprCodes);

        $finCodes = array_column($roles['FIN']['active_scorecard'] ?? [], 'kpi_code');
        $this->assertContains('INVOICE_RFT', $finCodes);
        $this->assertNotContains('GROSS_MARGIN_JOB_FAMILY', $finCodes);

        $apar = $roles['APAR'];
        $this->assertStringContainsString('invoice pack', strtolower((string) ($apar['controllability_scope'] ?? '')));
        $this->assertStringContainsString('queue từ ship-ready sang invoice', mb_strtolower((string) ($apar['fairness_notes'] ?? '')));
        $this->assertStringNotContainsString(
            'kiểm soát bằng chứng dữ liệu/tuân thủ, access-backup-recovery',
            mb_strtolower((string) ($apar['active_scorecard'][0]['controllability_scope'] ?? ''))
        );

        $ita = $roles['ITA'];
        $this->assertStringContainsString('backup-restore drill', mb_strtolower((string) ($ita['controllability_scope'] ?? '')));
        $this->assertStringContainsString('approval nghiệp vụ', mb_strtolower((string) ($ita['attribution_rules']['exclusions'] ?? '')));
        $this->assertStringContainsString('backup policy', mb_strtolower((string) ($ita['active_scorecard'][0]['owner_control_boundary'] ?? '')));

        $registry = $this->readRegistry();
        $lamEvidence = $registry['lam_evidence_pack_contract'] ?? [];
        $this->assertSame('LAM-EVIDENCE-PACK-CONTRACT-P15', $lamEvidence['contract_id'] ?? null);
        $this->assertSame('LAM_SEMSYSCO', $lamEvidence['profile_code'] ?? null);
        $this->assertGreaterThanOrEqual(10, (int) ($lamEvidence['retention_requirements']['retention_years'] ?? 0));
        $this->assertContains('CHECK_DIM_REPORT_ON_SHIP', $lamEvidence['required_sections'][5]['linked_metric_codes'] ?? []);
    }

    public function testMetricSupportSeparatesKnownNonRuntimeFromUnknownMetric(): void
    {
        $engine = $this->newEngineWithoutConstructor();

        $runtime = $engine->describeMetricSupport('SCRAP');
        $this->assertSame('SCRAP_RATE', $runtime['canonical_code']);
        $this->assertTrue($runtime['known_metric']);
        $this->assertTrue($runtime['runtime_calculated']);

        $staged = $engine->describeMetricSupport('OEE_BOTTLENECK');
        $this->assertTrue($staged['known_metric']);
        $this->assertFalse($staged['runtime_calculated']);
        $this->assertSame('staged_data_contract', $staged['backend_status']);
        $this->assertSame('operating_metric', $staged['metric_type']);
        $this->assertNotSame('company_scorecard', $staged['evaluation_use']);

        $unknown = $engine->describeMetricSupport('NOT_A_KPI');
        $this->assertFalse($unknown['known_metric']);
        $this->assertFalse($unknown['runtime_calculated']);
        $this->assertSame('unknown_metric', $unknown['backend_status']);
    }

    /**
     * @return array<string, mixed>
     */
    private function readRegistry(): array
    {
        $path = dirname(__DIR__, 3) . '/data/registry/kpi-authority-registry.json';
        $payload = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($payload);

        return $payload;
    }

    private function newEngineWithoutConstructor(): KpiEngine
    {
        return (new ReflectionClass(KpiEngine::class))->newInstanceWithoutConstructor();
    }

    private function invokeNormalize(KpiEngine $engine, string $metricCode): string
    {
        $method = (new ReflectionClass(KpiEngine::class))->getMethod('normalizeMetricCode');

        return (string) $method->invoke($engine, $metricCode);
    }
}
