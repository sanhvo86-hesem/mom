<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

final class PostgresPlanningScenarioRepository implements PlanningScenarioRepository
{
    private const SCENARIO_TABLE = 'aps_planning_scenarios';

    public function __construct(private readonly Connection $db)
    {
    }

    public function saveScenario(array $scenario): array
    {
        return $this->db->transactional(function () use ($scenario): array {
            $scenarioId = trim((string)($scenario['scenario_id'] ?? ''));
            if ($scenarioId === '') {
                throw new RuntimeException('missing_planning_scenario_id');
            }

            $uuid = $this->uuidFor($scenarioId);
            $createdByActor = trim((string)($scenario['created_by'] ?? $scenario['calculated_by'] ?? ''));
            $scenario['scenario_id'] = $scenarioId;
            $scenario['postgres_aps_scenario_id'] = $uuid;
            $scenario['payload_schema_version'] = (string)($scenario['payload_schema_version'] ?? 'planning_scenario.v1');
            if ($createdByActor !== '') {
                $scenario['created_by_actor'] = $createdByActor;
            }

            $row = $this->db->insertReturning(
                'INSERT INTO ' . self::SCENARIO_TABLE . ' (
                    aps_scenario_id,
                    scenario_name,
                    scenario_status,
                    is_baseline,
                    snapshot_at,
                    created_by,
                    notes,
                    metadata,
                    updated_at
                ) VALUES (
                    :aps_scenario_id,
                    :scenario_name,
                    :scenario_status,
                    false,
                    :snapshot_at,
                    :created_by,
                    :notes,
                    CAST(:metadata AS jsonb),
                    NOW()
                )
                ON CONFLICT (aps_scenario_id) DO UPDATE SET
                    scenario_name = EXCLUDED.scenario_name,
                    scenario_status = EXCLUDED.scenario_status,
                    snapshot_at = EXCLUDED.snapshot_at,
                    created_by = COALESCE(' . self::SCENARIO_TABLE . '.created_by, EXCLUDED.created_by),
                    notes = EXCLUDED.notes,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                RETURNING *',
                [
                    ':aps_scenario_id' => $uuid,
                    ':scenario_name' => $this->scenarioName($scenario),
                    ':scenario_status' => $this->postgresState($scenario),
                    ':snapshot_at' => (string)($scenario['calculated_at'] ?? $scenario['updated_at'] ?? gmdate(DATE_ATOM)),
                    ':created_by' => $this->createdByUuid($scenario),
                    ':notes' => (string)($scenario['scenario_name'] ?? $scenario['scenario_key'] ?? $scenarioId),
                    ':metadata' => $this->encodeJson($scenario),
                ],
            );

            if (!is_array($row)) {
                throw new RuntimeException('Unable to persist planning scenario.');
            }

            return $this->normalizeRow($row);
        });
    }

    public function findScenario(string $scenarioIdOrKey): ?array
    {
        $needle = trim($scenarioIdOrKey);
        if ($needle === '') {
            return null;
        }

        $params = [
            ':needle' => $needle,
            ':uuid' => $this->uuidFor($needle),
        ];
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::SCENARIO_TABLE . '
             WHERE aps_scenario_id = :uuid
                OR scenario_name = :needle
                OR metadata->>\'scenario_id\' = :needle
                OR metadata->>\'scenario_key\' = :needle
             LIMIT 1',
            $params,
        );

        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    public function listScenarios(array $filters = []): array
    {
        $rows = $this->db->query(
            'SELECT * FROM ' . self::SCENARIO_TABLE . '
             WHERE metadata->>\'payload_schema_version\' = \'planning_scenario.v1\'
             ORDER BY updated_at DESC, scenario_name ASC
             LIMIT :limit',
            [':limit' => min(500, max(1, (int)($filters['limit'] ?? 100)))],
        );

        $scenarios = array_map(fn(array $row): array => $this->normalizeRow($row), $rows);
        $scenarios = array_values(array_filter($scenarios, fn(array $row): bool => $this->matchesFilters($row, $filters, PlanningScenarioService::scenarioFilterFields())));
        return $scenarios;
    }

    public function saveReplanningSignal(array $signal): array
    {
        $scenarioId = trim((string)($signal['scenario_id'] ?? ''));
        if ($scenarioId === '') {
            throw new RuntimeException('missing_replanning_signal_scenario_id');
        }

        return $this->db->transactional(function () use ($scenarioId, $signal): array {
            $scenario = $this->findScenarioForUpdate($scenarioId);
            if ($scenario === null) {
                throw new RuntimeException('planning_scenario_not_found');
            }

            $signals = is_array($scenario['replanning_signals'] ?? null) ? $scenario['replanning_signals'] : [];
            $signalId = trim((string)($signal['signal_id'] ?? ''));
            $replaced = false;
            foreach ($signals as $index => $existing) {
                if (is_array($existing) && (string)($existing['signal_id'] ?? '') === $signalId) {
                    $signals[$index] = $signal;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $signals[] = $signal;
            }
            $scenario['replanning_signals'] = $signals;
            $this->saveScenario($scenario);
            return $signal;
        });
    }

    private function findScenarioForUpdate(string $scenarioIdOrKey): ?array
    {
        $needle = trim($scenarioIdOrKey);
        if ($needle === '') {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::SCENARIO_TABLE . '
             WHERE aps_scenario_id = :uuid
                OR scenario_name = :needle
                OR metadata->>\'scenario_id\' = :needle
                OR metadata->>\'scenario_key\' = :needle
             LIMIT 1
             FOR UPDATE',
            [
                ':needle' => $needle,
                ':uuid' => $this->uuidFor($needle),
            ],
        );

        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    public function listReplanningSignals(array $filters = []): array
    {
        $signals = [];
        foreach ($this->listScenarios(['limit' => 500]) as $scenario) {
            foreach ((array)($scenario['replanning_signals'] ?? []) as $signal) {
                if (is_array($signal)) {
                    $signals[] = $signal;
                }
            }
        }

        $signals = array_values(array_filter($signals, fn(array $row): bool => $this->matchesFilters($row, $filters, PlanningScenarioService::signalFilterFields())));
        usort($signals, static function (array $left, array $right): int {
            $cmp = strcmp((string)($right['created_at'] ?? ''), (string)($left['created_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['signal_id'] ?? ''), (string)($right['signal_id'] ?? ''));
        });

        return array_slice($signals, 0, min(500, max(1, (int)($filters['limit'] ?? 100))));
    }

    public function probe(): array
    {
        try {
            $tableAvailable = $this->tableAvailable(self::SCENARIO_TABLE);
            return [
                'slice' => 'planning_scenario',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => $tableAvailable ? 'authoritative_ready' : 'degraded',
                'authority_mode' => $tableAvailable ? 'postgres_primary_existing_aps_schema' : 'degraded',
                'authoritative' => $tableAvailable,
                'fallback_only' => false,
                'table_available' => $tableAvailable,
                'tables' => [self::SCENARIO_TABLE => $tableAvailable],
                'scenario_count' => $tableAvailable ? (int)$this->db->queryScalar(
                    'SELECT COUNT(*) FROM ' . self::SCENARIO_TABLE . ' WHERE metadata->>\'payload_schema_version\' = \'planning_scenario.v1\''
                ) : 0,
            ];
        } catch (\Throwable $e) {
            return [
                'slice' => 'planning_scenario',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => 'degraded',
                'authority_mode' => 'degraded',
                'authoritative' => false,
                'fallback_only' => false,
                'table_available' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function tableAvailable(string $table): bool
    {
        // GOV-005: SQL injection protection - validate table name against whitelist regex
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/', $table)) {
            return false;
        }

        // Only allow known tables in the schema
        $allowedTables = [
            'aps_planning_scenarios',
            'aps_scenario_operations',
            'aps_scenario_allocations',
            'aps_scenario_demands',
            'aps_scenario_supplies',
        ];

        if (!in_array($table, $allowedTables, true)) {
            return false;
        }

        // Use parameterized query with to_regclass for safety
        $row = $this->db->queryOne("SELECT to_regclass(:table_name) AS table_name", [':table_name' => $table]);
        return trim((string)($row['table_name'] ?? '')) !== '';
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        $metadata = $row['metadata'] ?? [];
        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : [];
        }
        $metadata = is_array($metadata) ? $metadata : [];
        $metadata['postgres_aps_scenario_id'] = (string)($row['aps_scenario_id'] ?? $metadata['postgres_aps_scenario_id'] ?? '');
        $metadata['created_at'] = (string)($metadata['created_at'] ?? $row['created_at'] ?? '');
        $metadata['updated_at'] = (string)($metadata['updated_at'] ?? $row['updated_at'] ?? '');
        return $metadata;
    }

    /**
     * @param list<string> $filterFields
     */
    private function matchesFilters(array $row, array $filters, array $filterFields): bool
    {
        foreach ($filterFields as $field) {
            if (!array_key_exists($field, $filters) || $filters[$field] === null || $filters[$field] === '') {
                continue;
            }
            if ((string)($row[$field] ?? '') !== (string)$filters[$field]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $scenario
     */
    private function scenarioName(array $scenario): string
    {
        $name = trim((string)($scenario['scenario_key'] ?? $scenario['scenario_name'] ?? $scenario['scenario_id'] ?? ''));
        return $name !== '' ? substr($name, 0, 150) : 'planning-scenario';
    }

    /**
     * @param array<string, mixed> $scenario
     */
    private function postgresState(array $scenario): string
    {
        $state = (string)($scenario['scenario_state'] ?? 'draft');
        return match ($state) {
            'published' => 'published',
            'superseded', 'cancelled' => 'archived',
            default => 'draft',
        };
    }

    private function uuidFor(string $value): string
    {
        $value = trim($value);
        if ($this->isUuid($value)) {
            return strtolower($value);
        }

        $hash = md5($value);
        return sprintf(
            '%s-%s-4%s-%s%s-%s',
            substr($hash, 0, 8),
            substr($hash, 8, 4),
            substr($hash, 13, 3),
            dechex((hexdec($hash[16]) & 0x3) | 0x8),
            substr($hash, 17, 3),
            substr($hash, 20, 12),
        );
    }

    /**
     * @param array<string, mixed> $scenario
     */
    private function createdByUuid(array $scenario): ?string
    {
        $candidate = trim((string)($scenario['created_by_user_id']
            ?? $scenario['created_by_uuid']
            ?? $scenario['created_by']
            ?? $scenario['calculated_by_user_id']
            ?? ''));

        return $this->isUuid($candidate) ? strtolower($candidate) : null;
    }

    private function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function encodeJson(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('planning_scenario_json_encode_failed');
        }
        return $json;
    }
}

if (!class_exists('MOM\\Services\\PostgresPlanningScenarioRepository', false)) {
    class_alias(PostgresPlanningScenarioRepository::class, 'MOM\\Services\\PostgresPlanningScenarioRepository');
}
