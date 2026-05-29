<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Executable contract runner for MDA scenario libraries.
 *
 * The runner validates scenario DSL, executes static contract assertions, and
 * exports dashboard/evidence payloads. It does not mutate governed runtime data.
 */
final class MdaExecutableScenarioRunnerService
{
    private const DSL_VERSION = '2026-05-29.p38';

    private const GROUP_ROOT_MAP = [
        'master_data' => 'ROOT-ITEM-001',
        'engineering' => 'ROOT-ENG-001',
        'supplier_quality' => 'ROOT-QUAL-001',
        'inventory' => 'ROOT-INV-001',
        'mes' => 'ROOT-MES-001',
        'quality' => 'ROOT-QUAL-001',
        'tooling' => 'ROOT-TOOL-001',
        'traceability' => 'ROOT-INV-001',
        'finance' => 'ROOT-INV-001',
        'migration' => 'ROOT-INT-001',
        'security' => 'ROOT-EVD-001',
        'observability' => 'ROOT-INT-001',
        'frontend' => 'ROOT-INT-001',
        'data_quality' => 'ROOT-INT-001',
        'planning' => 'ROOT-WO-001',
        'maintenance' => 'ROOT-EQP-001',
        'shipment' => 'ROOT-QUAL-001',
        'governance' => 'ROOT-INT-001',
        'recall' => 'ROOT-INV-001',
        'ai_governance' => 'ROOT-INT-001',
        'ot_security' => 'ROOT-MES-001',
    ];

    /** @return array<string, mixed> */
    public function schemaProbe(): array
    {
        return [
            'dsl_version' => self::DSL_VERSION,
            'schema_path' => 'mom/contracts/schemas/mda-sim-schema.json',
            'runner' => self::class,
            'supports_fixture_loader' => true,
            'supports_static_command_driver' => true,
            'supports_assertion_engine' => true,
            'supports_evidence_export' => true,
            'supports_dashboard' => true,
            'runtime_mutation' => false,
        ];
    }

    /** @return array<string, mixed> */
    public function loadCsvLibrary(string $csvPath, array $options = []): array
    {
        if (!is_file($csvPath)) {
            throw new RuntimeException('Scenario CSV not found: ' . $csvPath);
        }

        $rows = $this->readCsv($csvPath);
        $scenarios = [];
        foreach ($rows as $row) {
            $scenarios[] = $this->scenarioFromCsvRow($row);
        }

        return [
            'dsl_version' => self::DSL_VERSION,
            'source_path' => $csvPath,
            'declared_count' => (int)($options['declared_count'] ?? count($scenarios)),
            'minimum_required_count' => (int)($options['minimum_required_count'] ?? 200),
            'final_acceptance' => (bool)($options['final_acceptance'] ?? false),
            'scenarios' => $scenarios,
        ];
    }

    /** @return array<string, mixed> */
    public function runFromCsv(string $csvPath, array $options = []): array
    {
        return $this->run($this->loadCsvLibrary($csvPath, $options), $options);
    }

    /**
     * @param array<string, mixed> $dsl
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function run(array $dsl, array $options = []): array
    {
        $scenarios = [];
        foreach ((array)($dsl['scenarios'] ?? []) as $scenario) {
            if (is_array($scenario)) {
                $scenarios[] = $this->normalizeScenario($scenario);
            }
        }

        $declaredCount = (int)($options['declared_count'] ?? $dsl['declared_count'] ?? count($scenarios));
        $minimumRequired = (int)($options['minimum_required_count'] ?? $dsl['minimum_required_count'] ?? 200);
        $finalAcceptance = (bool)($options['final_acceptance'] ?? $dsl['final_acceptance'] ?? false);
        $actualCount = count($scenarios);
        $results = [];

        foreach ($scenarios as $scenario) {
            $results[] = $this->runScenario($scenario, $finalAcceptance);
        }

        $dashboard = $this->buildDashboard($declaredCount, $minimumRequired, $finalAcceptance, $results);
        $evidenceExport = $this->exportEvidencePack($dashboard, $results, (string)($dsl['source_path'] ?? 'inline'));

        return [
            'allowed' => $dashboard['acceptance_state'] !== 'blocked',
            'status' => $dashboard['acceptance_state'],
            'reason_code' => $dashboard['reason_code'],
            'dsl_version' => self::DSL_VERSION,
            'declared_count' => $declaredCount,
            'actual_count' => $actualCount,
            'scenario_count_matches' => $declaredCount === $actualCount,
            'dashboard' => $dashboard,
            'results' => $results,
            'evidence_export' => $evidenceExport,
        ];
    }

    /** @param array<string, mixed> $scenario @return array<string, mixed> */
    private function runScenario(array $scenario, bool $finalAcceptance): array
    {
        $issues = [];
        foreach (['scenario_id', 'root_code', 'command', 'expected_gate', 'expected_evidence'] as $required) {
            if ($this->text($scenario[$required] ?? '') === '') {
                $issues[] = $required . '_missing';
            }
        }
        if ($this->strings($scenario['assertions'] ?? []) === []) {
            $issues[] = 'assertion_missing';
        }
        if (!$this->hasEffectMapping($scenario)) {
            $issues[] = 'event_ledger_hold_or_error_mapping_missing';
        }
        if ($finalAcceptance && $this->text($scenario['command_driver'] ?? '') === 'mock_only') {
            $issues[] = 'mock_only_final_acceptance_prohibited';
        }
        if (($scenario['forced_result'] ?? true) === false) {
            $issues[] = 'forced_failure';
        }

        $status = $issues === [] ? 'pass' : 'fail';
        $severity = $this->normalizeSeverity($scenario['severity'] ?? 'P1');

        $result = [
            'scenario_id' => $this->text($scenario['scenario_id'] ?? ''),
            'root_code' => $this->text($scenario['root_code'] ?? ''),
            'command' => $this->text($scenario['command'] ?? ''),
            'expected_gate' => $this->text($scenario['expected_gate'] ?? ''),
            'command_driver' => $this->text($scenario['command_driver'] ?? 'static_contract'),
            'severity' => $severity,
            'status' => $status,
            'blocks_acceptance' => $status === 'fail' && in_array($severity, ['P0', 'P1'], true),
            'issues' => $issues,
            'assertion_count' => count($this->strings($scenario['assertions'] ?? [])),
        ];
        $result['evidence_hash_sha256'] = $this->hashPayload($result);

        return $result;
    }

    /** @param array<int, array<string, mixed>> $results @return array<string, mixed> */
    private function buildDashboard(int $declaredCount, int $minimumRequired, bool $finalAcceptance, array $results): array
    {
        $total = count($results);
        $failed = array_values(array_filter($results, static fn (array $result): bool => $result['status'] === 'fail'));
        $passed = $total - count($failed);
        $p0Failed = count(array_filter($failed, static fn (array $result): bool => $result['severity'] === 'P0'));
        $p1Failed = count(array_filter($failed, static fn (array $result): bool => $result['severity'] === 'P1'));
        $blockerFailed = count(array_filter($failed, static fn (array $result): bool => (bool)$result['blocks_acceptance']));
        $mockFinal = count(array_filter($failed, static fn (array $result): bool => in_array('mock_only_final_acceptance_prohibited', (array)$result['issues'], true)));
        $countMatches = $declaredCount === $total;
        $minCountMet = $total >= $minimumRequired;
        $acceptanceState = ($countMatches && $minCountMet && $blockerFailed === 0 && $mockFinal === 0) ? 'passed' : 'blocked';

        $dashboard = [
            'generated_at' => gmdate(DATE_ATOM),
            'dsl_version' => self::DSL_VERSION,
            'declared_count' => $declaredCount,
            'total_scenarios_executed' => $total,
            'passed_scenarios' => $passed,
            'failed_scenarios' => count($failed),
            'failed_blocker_scenarios' => $blockerFailed,
            'p0_failed_scenarios' => $p0Failed,
            'p1_failed_scenarios' => $p1Failed,
            'scenario_count_matches' => $countMatches,
            'minimum_required_count' => $minimumRequired,
            'minimum_required_count_met' => $minCountMet,
            'final_acceptance' => $finalAcceptance,
            'mock_only_final_acceptance_failures' => $mockFinal,
            'root_coverage' => $this->coverage($results, 'root_code'),
            'command_coverage' => $this->coverage($results, 'command'),
            'gate_coverage' => $this->coverage($results, 'expected_gate'),
            'mandatory_widgets' => [
                'total_scenarios_executed' => $total,
                'failed_blocker_scenarios' => $blockerFailed,
                'open_p0_p1_p2_gaps' => 'external_gap_register_required',
                'fallback_reads_last_24h' => 'requires_p37_runtime_telemetry',
                'drift_count_by_domain' => 'requires_p37_runtime_telemetry',
                'gate_failure_top_10' => $this->topFailures($failed),
                'outbox_lag_p95' => 'requires_live_outbox_metrics',
                'audit_esign_failure_totals' => 'requires_live_audit_esign_metrics',
            ],
            'acceptance_state' => $acceptanceState,
            'reason_code' => $acceptanceState === 'passed' ? 'scenario_acceptance_dashboard_passed' : 'scenario_acceptance_dashboard_blocked',
        ];
        $dashboard['dashboard_hash_sha256'] = $this->hashPayload($dashboard);

        return $dashboard;
    }

    /**
     * @param array<string, mixed> $dashboard
     * @param array<int, array<string, mixed>> $results
     * @return array<string, mixed>
     */
    private function exportEvidencePack(array $dashboard, array $results, string $sourcePath): array
    {
        $payload = [
            'source_path' => $sourcePath,
            'dashboard' => $dashboard,
            'result_count' => count($results),
            'failed_results' => array_values(array_filter($results, static fn (array $result): bool => $result['status'] === 'fail')),
        ];
        $body = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        return [
            'format' => 'json',
            'source_path' => $sourcePath,
            'export_hash_sha256' => hash('sha256', $body),
            'body' => $body,
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function readCsv(string $csvPath): array
    {
        $handle = fopen($csvPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Unable to open scenario CSV: ' . $csvPath);
        }

        $header = fgetcsv($handle, null, ',', '"', '');
        if (!is_array($header)) {
            fclose($handle);
            return [];
        }
        $header = array_map(static fn ($value): string => trim((string)$value), $header);
        $rows = [];
        while (($row = fgetcsv($handle, null, ',', '"', '')) !== false) {
            $assoc = [];
            foreach ($header as $index => $column) {
                $assoc[$column] = (string)($row[$index] ?? '');
            }
            $rows[] = $assoc;
        }
        fclose($handle);

        return $rows;
    }

    /** @param array<string, string> $row @return array<string, mixed> */
    private function scenarioFromCsvRow(array $row): array
    {
        $group = $this->text($row['group'] ?? '');
        $expectedErrors = $this->cellList($row['expected_errors'] ?? '');
        $expectedGate = $expectedErrors === [] || $expectedErrors === ['no_error']
            ? 'command_contract_gate'
            : implode('|', $expectedErrors);

        return [
            'scenario_id' => $this->text($row['scenario_id'] ?? ''),
            'group' => $group,
            'root_code' => self::GROUP_ROOT_MAP[$group] ?? 'ROOT-INT-001',
            'seed_data' => $this->text($row['seed_data'] ?? ''),
            'preconditions' => $this->text($row['preconditions'] ?? ''),
            'command' => $this->text($row['commands'] ?? $row['command'] ?? ''),
            'expected_gate' => $expectedGate,
            'expected_events' => $this->cellList($row['expected_events'] ?? ''),
            'expected_ledgers' => $this->cellList($row['expected_ledgers'] ?? ''),
            'expected_holds' => $this->cellList($row['expected_holds'] ?? ''),
            'expected_evidence' => $this->text($row['expected_audit_or_evidence'] ?? $row['expected_evidence'] ?? ''),
            'expected_errors' => $expectedErrors,
            'assertions' => $this->cellList($row['assertions'] ?? ''),
            'severity' => $this->inferSeverity($row),
            'command_driver' => $this->text($row['command_driver'] ?? 'static_contract'),
        ];
    }

    /** @param array<string, mixed> $scenario @return array<string, mixed> */
    private function normalizeScenario(array $scenario): array
    {
        $scenario['scenario_id'] = $this->text($scenario['scenario_id'] ?? '');
        $scenario['group'] = $this->text($scenario['group'] ?? '');
        $scenario['root_code'] = $this->text($scenario['root_code'] ?? (self::GROUP_ROOT_MAP[$scenario['group']] ?? 'ROOT-INT-001'));
        $scenario['command'] = $this->text($scenario['command'] ?? $scenario['commands'] ?? '');
        $scenario['expected_gate'] = $this->text($scenario['expected_gate'] ?? '');
        $scenario['expected_events'] = $this->strings($scenario['expected_events'] ?? []);
        $scenario['expected_ledgers'] = $this->strings($scenario['expected_ledgers'] ?? []);
        $scenario['expected_holds'] = $this->strings($scenario['expected_holds'] ?? []);
        $scenario['expected_errors'] = $this->strings($scenario['expected_errors'] ?? []);
        $scenario['assertions'] = $this->strings($scenario['assertions'] ?? []);
        $scenario['expected_evidence'] = $this->text($scenario['expected_evidence'] ?? '');
        $scenario['severity'] = $this->normalizeSeverity($scenario['severity'] ?? 'P1');
        $driver = $this->text($scenario['command_driver'] ?? 'static_contract');
        $scenario['command_driver'] = in_array($driver, ['static_contract', 'runtime_command', 'mock_only', 'manual_evidence'], true)
            ? $driver
            : 'static_contract';

        return $scenario;
    }

    /** @param array<string, mixed> $scenario */
    private function hasEffectMapping(array $scenario): bool
    {
        return $this->strings($scenario['expected_events'] ?? []) !== []
            || $this->strings($scenario['expected_ledgers'] ?? []) !== []
            || $this->strings($scenario['expected_holds'] ?? []) !== []
            || $this->strings($scenario['expected_errors'] ?? []) !== []
            || $this->text($scenario['expected_evidence'] ?? '') !== '';
    }

    /** @param array<string, string> $row */
    private function inferSeverity(array $row): string
    {
        $group = $this->text($row['group'] ?? '');
        $expectedErrors = $this->cellList($row['expected_errors'] ?? '');
        if (in_array($group, ['migration', 'security', 'quality', 'inventory', 'mes', 'finance'], true)) {
            return 'P0';
        }
        if ($expectedErrors !== [] && $expectedErrors !== ['no_error']) {
            return 'P1';
        }

        return 'P2';
    }

    private function normalizeSeverity(mixed $severity): string
    {
        $severity = strtoupper($this->text($severity));
        return in_array($severity, ['P0', 'P1', 'P2', 'P3'], true) ? $severity : 'P1';
    }

    /** @return list<string> */
    private function cellList(string $value): array
    {
        $value = trim($value);
        if ($value === '') {
            return [];
        }
        $parts = preg_split('/[;|]/', $value) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $part = trim((string)$part);
            if ($part !== '') {
                $out[] = $part;
            }
        }

        return array_values(array_unique($out));
    }

    /** @param mixed $values @return list<string> */
    private function strings(mixed $values): array
    {
        if (is_string($values)) {
            return $this->cellList($values);
        }
        if (!is_array($values)) {
            return [];
        }
        $out = [];
        foreach ($values as $value) {
            $text = $this->text($value);
            if ($text !== '') {
                $out[] = $text;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @param array<int, array<string, mixed>> $results
     * @return array<string, int>
     */
    private function coverage(array $results, string $field): array
    {
        $coverage = [];
        foreach ($results as $result) {
            $value = $this->text($result[$field] ?? '');
            if ($value === '') {
                continue;
            }
            $coverage[$value] = ($coverage[$value] ?? 0) + 1;
        }
        ksort($coverage);

        return $coverage;
    }

    /**
     * @param array<int, array<string, mixed>> $failed
     * @return array<int, array<string, mixed>>
     */
    private function topFailures(array $failed): array
    {
        return array_slice(array_map(static fn (array $result): array => [
            'scenario_id' => $result['scenario_id'],
            'severity' => $result['severity'],
            'issues' => $result['issues'],
        ], $failed), 0, 10);
    }

    /** @param mixed $value */
    private function text(mixed $value): string
    {
        return trim((string)$value);
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        $payload = $this->sortRecursively($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /** @param array<string, mixed> $value @return array<string, mixed> */
    private function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursively($item);
            }
        }

        return $value;
    }
}

if (!class_exists('MOM\\Api\\Services\\MdaExecutableScenarioRunnerService', false)) {
    class_alias(MdaExecutableScenarioRunnerService::class, 'MOM\\Api\\Services\\MdaExecutableScenarioRunnerService');
}
