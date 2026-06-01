<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Database\Connection;

final class ScenarioAssertionEngine
{
    /**
     * @param array<string,mixed> $scenario
     * @param array<string,mixed> $driverResult
     * @return array<string,mixed>
     */
    public function assert(array $scenario, array $driverResult, Connection $db): array
    {
        $failures = [];
        $expectedAcceptance = (bool)($scenario['expected_acceptance'] ?? false);
        if ((bool)($driverResult['accepted'] ?? false) !== $expectedAcceptance) {
            $failures[] = 'accepted expected ' . ($expectedAcceptance ? 'true' : 'false');
        }

        $problem = is_array($driverResult['problem'] ?? null) ? (array)$driverResult['problem'] : [];
        $expectedProblem = trim((string)($scenario['expected_problem_code'] ?? ''));
        if ($expectedProblem !== '' && (string)($problem['code'] ?? '') !== $expectedProblem) {
            $failures[] = 'problem code expected ' . $expectedProblem . ' got ' . (string)($problem['code'] ?? 'none');
        }

        foreach ($this->strings($scenario['must_write_sql_contains'] ?? []) as $needle) {
            if (!$this->hasSql($db, $needle)) {
                $failures[] = "missing SQL evidence containing '{$needle}'";
            }
        }
        foreach ($this->strings($scenario['must_not_write_sql_contains'] ?? []) as $needle) {
            if ($this->hasSql($db, $needle)) {
                $failures[] = "forbidden SQL evidence containing '{$needle}'";
            }
        }
        foreach ($this->assoc($scenario['exact_write_counts'] ?? []) as $needle => $expected) {
            $actual = $this->countSql($db, (string)$needle);
            if ($actual !== (int)$expected) {
                $failures[] = "SQL count '{$needle}' expected {$expected} got {$actual}";
            }
        }

        if (($scenario['must_emit_audit'] ?? false) === true && !$this->hasSql($db, 'INSERT INTO audit_events')) {
            $failures[] = 'missing audit_events write';
        }
        if (($scenario['must_emit_outbox'] ?? false) === true && !$this->hasSql($db, 'INSERT INTO domain_outbox_events')) {
            $failures[] = 'missing domain_outbox_events write';
        }
        if (($scenario['must_write_evidence'] ?? false) === true && !$this->hasSql($db, 'domain_command_evidence_links')) {
            $failures[] = 'missing regulated evidence link write';
        }

        $idempotency = is_array($driverResult['idempotency'] ?? null) ? (array)$driverResult['idempotency'] : [];
        if (isset($scenario['expected_replay_count']) && (int)($idempotency['replay_count'] ?? 0) !== (int)$scenario['expected_replay_count']) {
            $failures[] = 'idempotency replay count mismatch';
        }
        if (isset($scenario['expected_operation_count']) && (int)($idempotency['operation_count'] ?? 0) !== (int)$scenario['expected_operation_count']) {
            $failures[] = 'idempotency operation count mismatch';
        }

        return [
            'status' => $failures === [] ? 'pass' : 'fail',
            'failures' => $failures,
            'evidence' => [
                'query_count' => $this->queryCount($db),
                'audit_write_count' => $this->countSql($db, 'INSERT INTO audit_events'),
                'outbox_write_count' => $this->countSql($db, 'INSERT INTO domain_outbox_events'),
                'evidence_link_write_count' => $this->countSql($db, 'domain_command_evidence_links'),
                'problem_code' => (string)($problem['code'] ?? ''),
            ],
        ];
    }

    private function hasSql(Connection $db, string $needle): bool
    {
        return $this->countSql($db, $needle) > 0;
    }

    private function countSql(Connection $db, string $needle): int
    {
        if ($db instanceof ScenarioSandboxConnection) {
            return $db->countSqlContains($needle);
        }
        return 0;
    }

    private function queryCount(Connection $db): int
    {
        if ($db instanceof ScenarioSandboxConnection) {
            return count($db->queries());
        }
        return 0;
    }

    /**
     * @return list<string>
     */
    private function strings(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        return array_values(array_filter(array_map(static fn (mixed $item): string => trim((string)$item), $value)));
    }

    /**
     * @return array<string,mixed>
     */
    private function assoc(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }
}
