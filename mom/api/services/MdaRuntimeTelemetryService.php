<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use MOM\Services\MasterDataFallbackTelemetry;
use Throwable;

/**
 * Runtime authority telemetry collector for MDA V4 command closure.
 *
 * This service is observability only. It never becomes mutation authority and
 * must not block command execution when the telemetry sink is unavailable.
 */
final class MdaRuntimeTelemetryService
{
    private const LOG_RELATIVE_PATH = '/logs/mda-runtime-telemetry.jsonl';
    private const SNAPSHOT_RELATIVE_PATH = '/registry/mda-v4-runtime-control-tower.latest.json';

    /**
     * @var array<string,array<string,mixed>>
     */
    private const METRICS = [
        'hesem.mda.command.outcome.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.idempotency.replay.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.idempotency.conflict.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.readiness.blocker.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.quality_hold.blocker.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.inventory.reconciliation.mismatch.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.uom.failure.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.fallback.read.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 180],
        'hesem.mda.drift.count' => ['unit' => '1', 'kind' => 'gauge', 'retention_days' => 730],
        'hesem.mda.outbox.lag.seconds.p95' => ['unit' => 's', 'kind' => 'gauge', 'retention_days' => 180],
        'hesem.mda.audit.failure.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 3650],
        'hesem.mda.esign.failure.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 3650],
        'hesem.mda.security.denial.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 3650],
        'hesem.mda.direct_mutation.attempt.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 3650],
        'hesem.mda.projection.staleness.seconds' => ['unit' => 's', 'kind' => 'gauge', 'retention_days' => 180],
        'hesem.mda.scenario.result.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.scenario.failure.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.tooling.blocker.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
        'hesem.mda.gage.blocker.total' => ['unit' => '1', 'kind' => 'counter', 'retention_days' => 730],
    ];

    /**
     * @var array<string,array<string,mixed>>
     */
    private const ALERT_RULES = [
        'fallback_read_total' => ['metric' => 'hesem.mda.fallback.read.total', 'operator' => '>', 'threshold' => 0, 'severity' => 'P0'],
        'drift_count' => ['metric' => 'hesem.mda.drift.count', 'operator' => '>', 'threshold' => 0, 'severity' => 'P0'],
        'outbox_lag_p95' => ['metric' => 'hesem.mda.outbox.lag.seconds.p95', 'operator' => '>', 'threshold' => 300, 'severity' => 'P0'],
        'audit_store_down' => ['metric' => 'hesem.mda.audit.failure.total', 'operator' => '>', 'threshold' => 0, 'severity' => 'P0'],
        'direct_mutation_attempt' => ['metric' => 'hesem.mda.direct_mutation.attempt.total', 'operator' => '>', 'threshold' => 0, 'severity' => 'P0'],
        'scenario_failure' => ['metric' => 'hesem.mda.scenario.failure.total', 'operator' => '>', 'threshold' => 0, 'severity' => 'P0'],
    ];

    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
    ) {}

    /**
     * @return array<string,array<string,mixed>>
     */
    public function metricCatalog(): array
    {
        return self::METRICS;
    }

    /**
     * @return array<string,array<string,mixed>>
     */
    public function alertRules(): array
    {
        return self::ALERT_RULES;
    }

    /**
     * @param array<string,mixed> $dimensions
     */
    public function recordMetric(string $metricName, float|int $value = 1, array $dimensions = [], string $eventName = 'mda.runtime.metric'): void
    {
        $safe = $this->safeDimensions($dimensions);
        $event = [
            'metric_name' => $metricName,
            'event_name' => $eventName,
            'metric_value' => $value,
            'command_name' => (string)($safe['command.name'] ?? ''),
            'problem_code' => (string)($safe['problem.code'] ?? ''),
            'outcome' => (string)($safe['command.outcome'] ?? ''),
            'trace_id' => (string)($safe['trace_id'] ?? ''),
            'dimensions' => $safe,
            'occurred_at' => gmdate(DATE_ATOM),
        ];
        $this->appendEvent($event);
        $this->insertEvent($event);
    }

    /**
     * @param array<string,mixed> $dimensions
     */
    public function recordCommandOutcome(string $commandName, string $outcome, array $dimensions = []): void
    {
        $dims = $dimensions + [
            'command.name' => $commandName,
            'command.outcome' => $outcome,
        ];
        $this->recordMetric('hesem.mda.command.outcome.total', 1, $dims, 'mda.command.outcome');
        if (($dimensions['idempotency.replayed'] ?? false) === true || $outcome === 'replayed') {
            $this->recordMetric('hesem.mda.idempotency.replay.total', 1, $dims, 'mda.command.replayed');
        }
    }

    /**
     * @param array<string,mixed> $problem
     */
    public function recordProblemDetails(string $commandName, array $problem): void
    {
        $code = (string)($problem['code'] ?? 'unknown_problem');
        $metric = $this->metricForProblemCode($code);
        $dims = [
            'command.name' => $commandName,
            'command.outcome' => 'blocked',
            'problem.code' => $code,
            'http.status_code' => (string)($problem['status'] ?? ''),
            'trace_id' => (string)($problem['trace_id'] ?? ''),
        ];
        $this->recordMetric($metric, 1, $dims, 'mda.command.problem');
    }

    /**
     * @param array<string,mixed> $dimensions
     */
    public function recordScenarioResult(string $scenarioId, string $status, array $dimensions = []): void
    {
        $safeStatus = strtolower(trim($status)) === 'pass' ? 'pass' : 'fail';
        $dims = $dimensions + [
            'scenario.id_hash' => $this->hashIdentifier($scenarioId),
            'scenario.status' => $safeStatus,
        ];
        $this->recordMetric('hesem.mda.scenario.result.total', 1, $dims, 'mda.scenario.result');
        if ($safeStatus !== 'pass') {
            $this->recordMetric('hesem.mda.scenario.failure.total', 1, $dims, 'mda.scenario.failure');
        }
    }

    /**
     * @return array<string,mixed>
     */
    public function report(): array
    {
        $events = $this->readEvents();
        $totals = $this->metricTotals($events);
        $fallback = (new MasterDataFallbackTelemetry($this->dataDir))->summary();
        if ((int)($fallback['fallback_read_total'] ?? 0) > 0) {
            $totals['hesem.mda.fallback.read.total'] = max(
                (float)($totals['hesem.mda.fallback.read.total'] ?? 0),
                (float)$fallback['fallback_read_total']
            );
        }
        if ((int)($fallback['drift_incident_total'] ?? 0) > 0) {
            $totals['hesem.mda.drift.count'] = max(
                (float)($totals['hesem.mda.drift.count'] ?? 0),
                (float)$fallback['drift_incident_total']
            );
        }

        $dbSignals = $this->databaseSignals();
        foreach ($dbSignals['metric_totals'] as $metricName => $value) {
            $totals[$metricName] = max((float)($totals[$metricName] ?? 0), (float)$value);
        }

        $activeAlerts = $this->activeAlerts($totals);
        $scorecard = [
            'p0_alert_count' => count(array_filter($activeAlerts, static fn(array $alert): bool => ($alert['severity'] ?? '') === 'P0')),
            'active_alerts' => $activeAlerts,
            'required_metrics_present' => $this->requiredMetricsPresent($totals),
            'decision' => $activeAlerts === [] ? 'GO_FOR_REVIEW' : 'NO_GO_RUNTIME_OBSERVABILITY',
        ];

        $report = [
            'generated_at' => gmdate(DATE_ATOM),
            'status' => $activeAlerts === [] ? 'pre_production_candidate' : 'degraded',
            'metric_totals' => $totals,
            'fallback_telemetry' => $fallback,
            'database_signals' => $dbSignals,
            'active_alerts' => $activeAlerts,
            'metric_catalog' => self::METRICS,
            'alert_rules' => self::ALERT_RULES,
            'redaction_policy' => $this->redactionPolicy(),
            'p60_scorecard_input' => $scorecard,
        ];

        $this->writeSnapshot($report);
        $this->insertSnapshot($report);

        return $report;
    }

    /**
     * @return array<string,mixed>
     */
    public function redactionPolicy(): array
    {
        return [
            'classification' => 'safe_dimensions_only',
            'allowed_plain_dimensions' => [
                'command.name',
                'command.outcome',
                'problem.code',
                'http.status_code',
                'metric.scope',
                'scenario.status',
                'source.authority',
            ],
            'hashed_dimensions' => ['scenario.id_hash', 'table.name_hash', 'aggregate.id_hash'],
            'blocked_plain_dimensions' => ['actor_id', 'operator_id', 'employee_id', 'full_name', 'email', 'payload', 'password', 'signature_secret'],
            'retention_days_default' => 730,
            'part11_related_retention_days' => 3650,
        ];
    }

    private function metricForProblemCode(string $code): string
    {
        if ($code === 'idempotency_conflict') {
            return 'hesem.mda.idempotency.conflict.total';
        }
        if ($code === 'resource_readiness_blocked') {
            return 'hesem.mda.readiness.blocker.total';
        }
        if ($code === 'quality_hold_active') {
            return 'hesem.mda.quality_hold.blocker.total';
        }
        if (str_starts_with($code, 'uom_') || str_contains($code, 'uom')) {
            return 'hesem.mda.uom.failure.total';
        }
        if (str_starts_with($code, 'inventory_reconciliation')) {
            return 'hesem.mda.inventory.reconciliation.mismatch.total';
        }
        if (str_starts_with($code, 'tooling_')) {
            return 'hesem.mda.tooling.blocker.total';
        }
        if (str_starts_with($code, 'gage_')) {
            return 'hesem.mda.gage.blocker.total';
        }
        if (str_contains($code, 'audit')) {
            return 'hesem.mda.audit.failure.total';
        }
        if (str_contains($code, 'signature') || str_contains($code, 'esign')) {
            return 'hesem.mda.esign.failure.total';
        }
        if (str_contains($code, 'scope') || str_contains($code, 'permission') || str_contains($code, 'sod') || str_contains($code, 'ai_actor') || str_contains($code, 'ot_trust')) {
            return 'hesem.mda.security.denial.total';
        }
        return 'hesem.mda.command.outcome.total';
    }

    /**
     * @param array<string,mixed> $dimensions
     * @return array<string,string|int|float|bool>
     */
    private function safeDimensions(array $dimensions): array
    {
        $allowed = array_flip($this->redactionPolicy()['allowed_plain_dimensions']);
        $out = [];
        foreach ($dimensions as $key => $value) {
            $key = trim((string)$key);
            if ($key === '') {
                continue;
            }
            if (isset($allowed[$key]) || in_array($key, ['trace_id', 'idempotency.replayed'], true) || str_ends_with($key, '_hash')) {
                $out[$key] = is_scalar($value) ? $value : $this->json($value);
                continue;
            }
            if (str_ends_with($key, '_id') || str_ends_with($key, '.id') || str_contains($key, 'table.name') || str_contains($key, 'aggregate.id')) {
                $out[$key . '_hash'] = $this->hashIdentifier(is_scalar($value) ? (string)$value : $this->json($value));
            }
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $event
     */
    private function appendEvent(array $event): void
    {
        $path = $this->eventLogPath();
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return;
        }
        @file_put_contents($path, $this->json($event) . "\n", FILE_APPEND | LOCK_EX);
    }

    /**
     * @param array<string,mixed> $event
     */
    private function insertEvent(array $event): void
    {
        if ($this->db === null) {
            return;
        }
        try {
            $this->db->execute(
                "INSERT INTO mda_runtime_telemetry_event
                    (metric_name, event_name, metric_value, command_name, problem_code, outcome, trace_id, dimensions, metadata)
                 VALUES
                    (:metric_name, :event_name, :metric_value, :command_name, :problem_code, :outcome, :trace_id, CAST(:dimensions AS jsonb), CAST(:metadata AS jsonb))",
                [
                    ':metric_name' => (string)$event['metric_name'],
                    ':event_name' => (string)$event['event_name'],
                    ':metric_value' => (string)$event['metric_value'],
                    ':command_name' => $this->nullable((string)($event['command_name'] ?? '')),
                    ':problem_code' => $this->nullable((string)($event['problem_code'] ?? '')),
                    ':outcome' => $this->nullable((string)($event['outcome'] ?? '')),
                    ':trace_id' => $this->nullable((string)($event['trace_id'] ?? '')),
                    ':dimensions' => $this->json((array)($event['dimensions'] ?? [])),
                    ':metadata' => $this->json(['authority' => self::class]),
                ]
            );
        } catch (Throwable) {
            // Telemetry must not block business command execution.
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function readEvents(): array
    {
        $path = $this->eventLogPath();
        if (!is_file($path)) {
            return [];
        }
        $events = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $decoded = json_decode((string)$line, true);
            if (is_array($decoded)) {
                $events[] = $decoded;
            }
        }
        return $events;
    }

    /**
     * @param list<array<string,mixed>> $events
     * @return array<string,float>
     */
    private function metricTotals(array $events): array
    {
        $totals = [];
        foreach ($events as $event) {
            $metric = (string)($event['metric_name'] ?? '');
            if ($metric === '') {
                continue;
            }
            $totals[$metric] = (float)($totals[$metric] ?? 0) + (float)($event['metric_value'] ?? 1);
        }
        foreach (array_keys(self::METRICS) as $metric) {
            $totals[$metric] = (float)($totals[$metric] ?? 0);
        }
        return $totals;
    }

    /**
     * @return array{metric_totals:array<string,float>,probe_errors:list<string>}
     */
    private function databaseSignals(): array
    {
        $totals = [];
        $errors = [];
        if ($this->db === null) {
            return ['metric_totals' => [], 'probe_errors' => []];
        }
        try {
            $row = $this->db->queryOne(
                "SELECT
                    COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (now() - occurred_at))), 0)::text AS outbox_lag_p95_seconds,
                    COUNT(*)::text AS pending_count
                   FROM domain_outbox_events
                  WHERE status IN ('pending', 'processing', 'failed')"
            );
            $totals['hesem.mda.outbox.lag.seconds.p95'] = (float)($row['outbox_lag_p95_seconds'] ?? 0);
        } catch (Throwable $e) {
            $errors[] = 'outbox_lag_probe_failed';
        }
        try {
            $row = $this->db->queryOne("SELECT COUNT(*)::text AS denied FROM generic_crud_denial_event WHERE occurred_at >= now() - INTERVAL '24 hours'");
            $totals['hesem.mda.direct_mutation.attempt.total'] = (float)($row['denied'] ?? 0);
        } catch (Throwable $e) {
            $errors[] = 'direct_mutation_probe_failed';
        }

        return ['metric_totals' => $totals, 'probe_errors' => $errors];
    }

    /**
     * @param array<string,float> $totals
     * @return list<array<string,mixed>>
     */
    private function activeAlerts(array $totals): array
    {
        $alerts = [];
        foreach (self::ALERT_RULES as $ruleId => $rule) {
            $metric = (string)$rule['metric'];
            $value = (float)($totals[$metric] ?? 0);
            $threshold = (float)$rule['threshold'];
            $active = match ((string)$rule['operator']) {
                '>' => $value > $threshold,
                '>=' => $value >= $threshold,
                default => false,
            };
            if ($active) {
                $alerts[] = [
                    'rule_id' => $ruleId,
                    'metric' => $metric,
                    'value' => $value,
                    'threshold' => $threshold,
                    'severity' => (string)$rule['severity'],
                ];
            }
        }
        return $alerts;
    }

    /**
     * @param array<string,float> $totals
     */
    private function requiredMetricsPresent(array $totals): bool
    {
        foreach (array_keys(self::METRICS) as $metric) {
            if (!array_key_exists($metric, $totals)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string,mixed> $report
     */
    private function writeSnapshot(array $report): void
    {
        $path = rtrim($this->dataDir, '/') . self::SNAPSHOT_RELATIVE_PATH;
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return;
        }
        @file_put_contents($path, $this->json($report), LOCK_EX);
    }

    /**
     * @param array<string,mixed> $report
     */
    private function insertSnapshot(array $report): void
    {
        if ($this->db === null) {
            return;
        }
        try {
            $this->db->execute(
                "INSERT INTO mda_runtime_control_tower_snapshot
                    (snapshot_status, summary, metric_totals, active_alerts, p60_scorecard_input, metadata)
                 VALUES
                    (:snapshot_status, CAST(:summary AS jsonb), CAST(:metric_totals AS jsonb),
                     CAST(:active_alerts AS jsonb), CAST(:p60_scorecard_input AS jsonb), CAST(:metadata AS jsonb))",
                [
                    ':snapshot_status' => (string)$report['status'],
                    ':summary' => $this->json(['generated_at' => $report['generated_at'], 'status' => $report['status']]),
                    ':metric_totals' => $this->json((array)$report['metric_totals']),
                    ':active_alerts' => $this->json((array)$report['active_alerts']),
                    ':p60_scorecard_input' => $this->json((array)$report['p60_scorecard_input']),
                    ':metadata' => $this->json(['authority' => self::class]),
                ]
            );
        } catch (Throwable) {
            // File snapshot remains the fallback control-tower data source.
        }
    }

    private function eventLogPath(): string
    {
        return rtrim($this->dataDir, '/') . self::LOG_RELATIVE_PATH;
    }

    private function hashIdentifier(string $value): string
    {
        return substr(hash('sha256', $value), 0, 16);
    }

    private function nullable(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    private function json(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return is_string($json) ? $json : '{}';
    }
}
