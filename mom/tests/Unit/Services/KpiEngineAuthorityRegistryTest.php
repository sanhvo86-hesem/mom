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
        $this->assertContains('OEE_BOTTLENECK', $scorecard);
        $this->assertContains('THROUGHPUT_PER_CONSTRAINT_HOUR', $scorecard);
        $this->assertNotContains('OEE_BOTTLENECK', KpiEngine::ALL_METRICS);
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
