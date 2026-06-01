<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Api\Services\MdaRuntimeTelemetryService;
use MOM\Database\Connection;
use RuntimeException;
use Throwable;

final class MdaRuntimeScenarioRunner
{
    private const LIBRARY_RELATIVE_PATH = '/registry/mda-v4-runtime-scenarios.json';
    private const DASHBOARD_RELATIVE_PATH = '/registry/mda-v4-runtime-scenario-dashboard.latest.json';

    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
        private readonly ?MdaRuntimeTelemetryService $telemetry = null,
        private readonly ?ScenarioFixtureSeeder $seeder = null,
        private readonly ?ScenarioCommandDriver $driver = null,
        private readonly ?ScenarioAssertionEngine $assertions = null,
    ) {}

    /**
     * @param list<array<string,mixed>>|null $library
     * @return array<string,mixed>
     */
    public function run(?array $library = null): array
    {
        $started = microtime(true);
        $scenarios = $library ?? $this->loadLibrary();
        $this->assertLibraryIntegrity($scenarios);
        $results = [];
        $telemetryDir = $this->scenarioTelemetryDir();
        $this->resetScenarioTelemetry($telemetryDir);
        $telemetry = $this->telemetry ?? new MdaRuntimeTelemetryService($telemetryDir);

        foreach ($scenarios as $scenario) {
            $db = $this->db ?? new ScenarioSandboxConnection();
            $seed = ($this->seeder ?? new ScenarioFixtureSeeder())->seed($db, $scenario);
            $driverResult = ($this->driver ?? new ScenarioCommandDriver())->run($scenario, $db);
            $assertion = ($this->assertions ?? new ScenarioAssertionEngine())->assert($scenario, $driverResult, $db);
            $status = (string)$assertion['status'];
            $scenarioId = (string)($scenario['scenario_id'] ?? 'unknown');
            $this->recordScenarioTelemetry($telemetry, $scenario, $driverResult, $status);
            $results[] = [
                'scenario_id' => $scenarioId,
                'title' => (string)($scenario['title'] ?? ''),
                'tags' => is_array($scenario['tags'] ?? null) ? array_values((array)$scenario['tags']) : [],
                'p0_blockers' => is_array($scenario['p0_blockers'] ?? null) ? array_values((array)$scenario['p0_blockers']) : [],
                'status' => $status,
                'seed' => $seed,
                'gateway_mode' => (string)($driverResult['gateway_mode'] ?? ''),
                'accepted' => (bool)($driverResult['accepted'] ?? false),
                'problem' => $driverResult['problem'] ?? null,
                'idempotency' => $driverResult['idempotency'] ?? [],
                'assertion' => $assertion,
            ];
        }

        foreach ($scenarios as $scenario) {
            foreach ((array)($scenario['telemetry_metrics'] ?? []) as $metric) {
                if (is_array($metric)) {
                    $telemetry->recordMetric((string)$metric['name'], (float)($metric['value'] ?? 1), (array)($metric['dimensions'] ?? []), 'mda.scenario.injected_metric');
                }
            }
        }
        $telemetryReport = $telemetry->report();
        $dashboard = $this->dashboard($scenarios, $results, $telemetryReport, $started);
        $this->writeDashboard($dashboard);

        return $dashboard;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function loadLibrary(): array
    {
        $path = rtrim($this->dataDir, '/') . self::LIBRARY_RELATIVE_PATH;
        $raw = is_file($path) ? file_get_contents($path) : false;
        if (!is_string($raw) || trim($raw) === '') {
            throw new RuntimeException('MDA V4 runtime scenario library is missing.');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('MDA V4 runtime scenario library is not valid JSON.');
        }
        $scenarios = is_array($decoded['scenarios'] ?? null) ? (array)$decoded['scenarios'] : $decoded;
        if (!array_is_list($scenarios)) {
            throw new RuntimeException('MDA V4 runtime scenario library must be a list.');
        }

        return $scenarios;
    }

    /**
     * @param list<array<string,mixed>> $scenarios
     */
    private function assertLibraryIntegrity(array $scenarios): void
    {
        if (count($scenarios) < 12) {
            throw new RuntimeException('P58 scenario count integrity failed: blocker-complete library requires at least 12 scenarios.');
        }

        $required = [
            'P0-RESOURCE-READINESS-NOT-WIRED',
            'P0-QUALITY-HOLD-FRAGMENTATION',
            'P0-INVENTORY-BALANCE-DIRECT-MUTATION',
            'P0-UOM-AUTHORITY-AMBIGUITY',
            'P0-AI-GOVERNED-ACTION-ESCAPE',
            'P0-AUDIT-EVIDENCE-ESIGN-NOT-WIRED',
            'P0-ENGINEERING-PACKAGE-NOT-LIVE-GATED',
            'P0-SCENARIO-MOCK-ONLY-FINAL-ACCEPTANCE',
        ];
        $covered = [];
        foreach ($scenarios as $scenario) {
            foreach ((array)($scenario['p0_blockers'] ?? []) as $blocker) {
                $covered[(string)$blocker] = true;
            }
            if (($scenario['mock_only'] ?? false) === true) {
                throw new RuntimeException('P58 scenario library contains mock_only=true scenario.');
            }
        }
        foreach ($required as $blocker) {
            if (!isset($covered[$blocker])) {
                throw new RuntimeException('P58 scenario library missing blocker coverage: ' . $blocker);
            }
        }
    }

    /**
     * @param array<string,mixed> $scenario
     * @param array<string,mixed> $driverResult
     */
    private function recordScenarioTelemetry(MdaRuntimeTelemetryService $telemetry, array $scenario, array $driverResult, string $status): void
    {
        $commandName = (string)($scenario['command_envelope']['command_name'] ?? $scenario['command_envelope']['command'] ?? '');
        $telemetry->recordScenarioResult((string)($scenario['scenario_id'] ?? 'unknown'), $status, [
            'command.name' => $commandName,
            'scenario.status' => $status,
        ]);
        if (($driverResult['accepted'] ?? false) === true) {
            $telemetry->recordCommandOutcome($commandName, (($driverResult['result']['replayed'] ?? false) === true) ? 'replayed' : 'accepted', [
                'idempotency.replayed' => (bool)($driverResult['result']['replayed'] ?? false),
            ]);
            return;
        }
        $problem = is_array($driverResult['problem'] ?? null) ? (array)$driverResult['problem'] : [];
        if ($problem !== []) {
            $telemetry->recordProblemDetails($commandName, $problem);
        }
    }

    /**
     * @param list<array<string,mixed>> $scenarios
     * @param list<array<string,mixed>> $results
     * @param array<string,mixed> $telemetryReport
     * @return array<string,mixed>
     */
    private function dashboard(array $scenarios, array $results, array $telemetryReport, float $started): array
    {
        $passed = count(array_filter($results, static fn (array $row): bool => ($row['status'] ?? '') === 'pass'));
        $failed = count($results) - $passed;
        $covered = [];
        foreach ($results as $row) {
            foreach ((array)($row['p0_blockers'] ?? []) as $blocker) {
                $covered[(string)$blocker] = true;
            }
        }
        $fallbackTotal = (float)($telemetryReport['metric_totals']['hesem.mda.fallback.read.total'] ?? 0);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'runtime_mode' => $this->db === null ? 'transaction_sandbox_real_gateway' : 'external_connection_real_gateway',
            'mock_only' => false,
            'scenario_total' => count($scenarios),
            'passed' => $passed,
            'failed' => $failed,
            'duration_ms' => (int)round((microtime(true) - $started) * 1000),
            'blockers_covered' => array_values(array_keys($covered)),
            'blocker_complete' => count($covered) >= 8,
            'decision' => $failed === 0 ? 'P58_PASS_READY_FOR_NEXT' : 'P58_REPAIR_REQUIRED',
            'cutover_decision' => $fallbackTotal > 0 ? 'NO_GO_CUTOVER_FALLBACK_READ_PRESENT' : 'GO_FOR_CUTOVER_REHEARSAL_INPUT',
            'p60_scorecard_input' => [
                'scenario_failure_count' => $failed,
                'scenario_total' => count($scenarios),
                'fallback_read_total' => $fallbackTotal,
                'telemetry_decision' => (string)($telemetryReport['p60_scorecard_input']['decision'] ?? ''),
                'active_alert_count' => count((array)($telemetryReport['active_alerts'] ?? [])),
            ],
            'telemetry' => [
                'required_metrics_present' => (bool)($telemetryReport['p60_scorecard_input']['required_metrics_present'] ?? false),
                'active_alerts' => $telemetryReport['active_alerts'] ?? [],
            ],
            'results' => $results,
        ];
    }

    /**
     * @param array<string,mixed> $dashboard
     */
    private function writeDashboard(array $dashboard): void
    {
        $path = rtrim($this->dataDir, '/') . self::DASHBOARD_RELATIVE_PATH;
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return;
        }
        @file_put_contents($path, json_encode($dashboard, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", LOCK_EX);
    }

    private function scenarioTelemetryDir(): string
    {
        return rtrim($this->dataDir, '/') . '/runtime/p58-scenario-telemetry';
    }

    private function resetScenarioTelemetry(string $telemetryDir): void
    {
        $logPath = rtrim($telemetryDir, '/') . '/logs/mda-runtime-telemetry.jsonl';
        if (is_file($logPath)) {
            @unlink($logPath);
        }
    }
}
