<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use InvalidArgumentException;
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

    public function testExecutiveScorecardKeepsProposedCncConstraintMetricsOutsideRuntimeAutoRegistration(): void
    {
        $registry = $this->readRegistry();
        $scorecard = $registry['executive_scorecard'] ?? [];

        $this->assertContains('OTD', $scorecard);
        $this->assertContains('FPY', $scorecard);
        $this->assertContains('COMPLAINT_RATE', $scorecard);
        $this->assertContains('GROSS_MARGIN_JOB_FAMILY', $scorecard);
        $this->assertContains('OEE_BOTTLENECK', $scorecard);
        $this->assertContains('THROUGHPUT_PER_CONSTRAINT_HOUR', $scorecard);
        $this->assertContains('SUPPLIER_READINESS', $scorecard);
        $this->assertNotContains('IN_PROCESS_REJECT_RATE', $scorecard);
        $this->assertNotContains('SUPPLIER_OTD', $scorecard);
        $this->assertNotContains('SUPPLIER_QUAL', $scorecard);
        $this->assertNotContains('OEE_BOTTLENECK', KpiEngine::ALL_METRICS);
    }

    public function testCatalogExposesDocumentAndBackendCoverage(): void
    {
        $engine = $this->newEngineWithoutConstructor();
        $catalog = $engine->getMetricCatalog();

        $this->assertSame(19, $catalog['counts']['runtime_calculated_metrics'] ?? null);
        $this->assertSame(12, $catalog['counts']['dashboard_core_kpis'] ?? null);
        $this->assertSame(19, $catalog['counts']['gate_control_metrics'] ?? null);
        $this->assertSame(15, $catalog['counts']['proposed_operating_metrics'] ?? null);
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
            '_reports/kpi/report-kpi-performance-governance-2026-04-18.json',
            $catalog['performance_governance_audit']['audit_report'] ?? null,
        );
        $this->assertContains('metric_type', $catalog['metric_governance_schema']['required_catalog_fields'] ?? []);
        $this->assertSame('CNC-EXEC-BSC-15-2026', $catalog['scorecard_operating_model']['model_id'] ?? null);

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
            $metricsByCode[$metric['canonical_code']] = $metric;
        }

        $this->assertSame('runtime_calculated', $metricsByCode['OTD']['backend_status'] ?? null);
        $this->assertTrue($metricsByCode['OTD']['is_official_kpi'] ?? false);
        $this->assertSame('company_scorecard', $metricsByCode['OTD']['evaluation_use'] ?? null);
        $this->assertSame(10.0, $metricsByCode['OTD']['scorecard_weight_pct'] ?? null);
        $this->assertSame(95, $metricsByCode['OTD']['quantitative_thresholds']['green_min'] ?? null);
        $this->assertContains('executive_scorecard', $metricsByCode['OTD']['usage_types'] ?? []);
        $this->assertContains('gate_control', $metricsByCode['OTD']['usage_types'] ?? []);
        $this->assertSame(false, $metricsByCode['OEE_BOTTLENECK']['runtime_calculated'] ?? null);
        $this->assertSame('staged_data_contract', $metricsByCode['OEE_BOTTLENECK']['calculation_status'] ?? null);
        $this->assertSame(8.0, $metricsByCode['OEE_BOTTLENECK']['scorecard_weight_pct'] ?? null);
        $this->assertSame('gate_control_metric', $metricsByCode['SPC_SIGNAL_REACTION_TIME']['metric_type'] ?? null);
        $this->assertFalse($metricsByCode['SPC_SIGNAL_REACTION_TIME']['is_official_kpi'] ?? true);
        $this->assertSame('supplier_scorecard', $metricsByCode['SUPPLIER_READINESS']['evaluation_use'] ?? null);
        $this->assertSame(5.0, $metricsByCode['SUPPLIER_READINESS']['scorecard_weight_pct'] ?? null);
        $this->assertContains('recordable_incident', $metricsByCode['RECORDABLE_INCIDENT_RATE']['blocking_conditions'] ?? []);
        $this->assertContains('gate_control_metrics', $metricsByCode['FPY']['sources'] ?? []);
        $this->assertContains('KPI-05', $metricsByCode['FPY']['local_ids'] ?? []);
        $this->assertContains('KPI-ALL-02', $metricsByCode['FPY']['local_ids'] ?? []);
    }

    public function testExecutiveScorecardWeightsAndQuantitativeRulesAreComplete(): void
    {
        $registry = $this->readRegistry();
        $scorecard = $registry['executive_scorecard'] ?? [];
        $items = $registry['scorecard_operating_model']['executive_scorecard_items'] ?? [];
        $this->assertIsArray($scorecard);
        $this->assertIsArray($items);
        $this->assertSame(15, count($items));

        $itemsByCode = [];
        $weightTotal = 0.0;
        foreach ($items as $item) {
            $this->assertIsArray($item);
            $code = $item['canonical_code'] ?? null;
            $this->assertIsString($code);
            $itemsByCode[$code] = $item;
            $weightTotal += (float) ($item['scorecard_weight_pct'] ?? 0);
            $this->assertNotEmpty($item['quantitative_thresholds'] ?? [], $code);
            $this->assertNotEmpty($item['rating_criteria'] ?? null, $code);
            $this->assertNotEmpty($item['reward_rule'] ?? null, $code);
            $this->assertNotEmpty($item['blocking_conditions'] ?? [], $code);
        }

        $this->assertEqualsWithDelta(100.0, $weightTotal, 0.0001);
        foreach ($scorecard as $code) {
            $this->assertIsString($code);
            $this->assertArrayHasKey($code, $itemsByCode, "{$code} must have a scorecard operating rule.");
        }
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
        $this->assertSame('kpi', $staged['metric_type']);
        $this->assertSame('company_scorecard', $staged['evaluation_use']);

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
