<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\MdaRuntimeTelemetryService;
use MOM\Database\Connection;
use MOM\Services\MasterDataFallbackTelemetry;
use PHPUnit\Framework\TestCase;

final class MdaRuntimeTelemetryServiceTest extends TestCase
{
    public function testProblemDetailsTelemetryRedactsSensitiveDimensions(): void
    {
        $dir = $this->tempDir();
        $db = new MdaRuntimeTelemetryFakeConnection();
        $service = new MdaRuntimeTelemetryService($dir, $db);

        $service->recordProblemDetails('StartJobCommand', [
            'code' => 'resource_readiness_blocked',
            'status' => 409,
            'trace_id' => 'trace-1',
            'details' => ['actor_id' => 'operator-secret', 'payload' => ['lot' => 'LOT-1']],
        ]);

        $log = file_get_contents($dir . '/logs/mda-runtime-telemetry.jsonl') ?: '';
        $this->assertStringContainsString('hesem.mda.readiness.blocker.total', $log);
        $this->assertStringContainsString('StartJobCommand', $log);
        $this->assertStringNotContainsString('operator-secret', $log);
        $this->assertStringNotContainsString('LOT-1', $log);
        $this->assertTrue($db->hasQuery('INSERT INTO mda_runtime_telemetry_event'));
    }

    public function testReportCreatesP60ScorecardAlerts(): void
    {
        $dir = $this->tempDir();
        $db = new MdaRuntimeTelemetryFakeConnection(outboxLagSeconds: '601', directMutationDenied: '1');
        $service = new MdaRuntimeTelemetryService($dir, $db);
        (new MasterDataFallbackTelemetry($dir))->recordFallbackRead('customer', 'postgres_primary_fallback', ['actor_id' => 'hidden']);
        $service->recordMetric('hesem.mda.direct_mutation.attempt.total', 1, ['table.name' => 'quality_hold']);
        $service->recordScenarioResult('V4-SIM-057-007', 'fail');

        $report = $service->report();
        $ruleIds = array_column($report['active_alerts'], 'rule_id');

        $this->assertContains('fallback_read_total', $ruleIds);
        $this->assertContains('outbox_lag_p95', $ruleIds);
        $this->assertContains('direct_mutation_attempt', $ruleIds);
        $this->assertContains('scenario_failure', $ruleIds);
        $this->assertSame('NO_GO_RUNTIME_OBSERVABILITY', $report['p60_scorecard_input']['decision']);
        $this->assertFileExists($dir . '/registry/mda-v4-runtime-control-tower.latest.json');
        $this->assertTrue($db->hasQuery('INSERT INTO mda_runtime_control_tower_snapshot'));
    }

    public function testMetricCatalogCoversP57RequiredSignals(): void
    {
        $catalog = (new MdaRuntimeTelemetryService($this->tempDir()))->metricCatalog();
        foreach ([
            'hesem.mda.fallback.read.total',
            'hesem.mda.drift.count',
            'hesem.mda.outbox.lag.seconds.p95',
            'hesem.mda.audit.failure.total',
            'hesem.mda.security.denial.total',
            'hesem.mda.direct_mutation.attempt.total',
            'hesem.mda.scenario.failure.total',
            'hesem.mda.projection.staleness.seconds',
        ] as $metric) {
            $this->assertArrayHasKey($metric, $catalog);
        }
    }

    private function tempDir(): string
    {
        $dir = sys_get_temp_dir() . '/mda-telemetry-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);
        return $dir;
    }
}

final class MdaRuntimeTelemetryFakeConnection extends Connection
{
    /** @var list<array{sql:string,params:array<string,mixed>}> */
    public array $queries = [];

    public function __construct(
        private readonly string $outboxLagSeconds = '0',
        private readonly string $directMutationDenied = '0',
    ) {}

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM domain_outbox_events')) {
            return ['outbox_lag_p95_seconds' => $this->outboxLagSeconds, 'pending_count' => '1'];
        }
        if (str_contains($sql, 'FROM generic_crud_denial_event')) {
            return ['denied' => $this->directMutationDenied];
        }
        return null;
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasQuery(string $needle): bool
    {
        foreach ($this->queries as $query) {
            if (str_contains($query['sql'], $needle)) {
                return true;
            }
        }
        return false;
    }
}
