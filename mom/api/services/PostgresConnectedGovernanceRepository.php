<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

final class PostgresConnectedGovernanceRepository implements ConnectedGovernanceRepository
{
    private const ROLLOUT_TABLE = 'eqms_controlled_revision_rollout';
    private const OBLIGATION_TABLE = 'eqms_training_obligation';
    private const DECISION_TABLE = 'eqms_execution_entitlement_decision';

    public function __construct(private readonly Connection $db)
    {
    }

    public function saveRollout(array $rollout): array
    {
        return $this->db->transactional(function () use ($rollout): array {
            $rolloutId = trim((string)($rollout['rollout_id'] ?? ''));
            if ($rolloutId === '') {
                throw new RuntimeException('missing_connected_governance_rollout_id');
            }

            $existing = $this->db->queryOne(
                'SELECT * FROM ' . self::ROLLOUT_TABLE . ' WHERE rollout_id = :rollout_id LIMIT 1 FOR UPDATE',
                [':rollout_id' => $rolloutId],
            );
            $row = $this->upsert(self::ROLLOUT_TABLE, $this->rolloutColumns(), ['rollout_id'], $rollout, $existing);
            if ($row === null) {
                throw new RuntimeException('Unable to persist connected governance rollout.');
            }
            return $this->normalizeRow($row);
        });
    }

    public function findRollout(string $rolloutId): ?array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::ROLLOUT_TABLE . ' WHERE rollout_id = :rollout_id LIMIT 1',
            [':rollout_id' => $rolloutId],
        );
        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    public function listRollouts(array $filters = []): array
    {
        return $this->listRows(self::ROLLOUT_TABLE, ConnectedGovernanceService::rolloutFilterFields(), $filters, 'effective_from DESC, updated_at DESC, rollout_id ASC');
    }

    public function saveTrainingObligation(array $obligation): array
    {
        return $this->db->transactional(function () use ($obligation): array {
            $obligationId = trim((string)($obligation['training_obligation_id'] ?? ''));
            if ($obligationId === '') {
                throw new RuntimeException('missing_training_obligation_id');
            }

            $existing = $this->db->queryOne(
                'SELECT * FROM ' . self::OBLIGATION_TABLE . ' WHERE training_obligation_id = :training_obligation_id LIMIT 1 FOR UPDATE',
                [':training_obligation_id' => $obligationId],
            );
            $row = $this->upsert(self::OBLIGATION_TABLE, $this->obligationColumns(), ['training_obligation_id'], $obligation, $existing);
            if ($row === null) {
                throw new RuntimeException('Unable to persist training obligation.');
            }
            return $this->normalizeRow($row);
        });
    }

    public function listTrainingObligations(array $filters = []): array
    {
        return $this->listRows(self::OBLIGATION_TABLE, ConnectedGovernanceService::obligationFilterFields(), $filters, 'updated_at DESC, training_obligation_id ASC');
    }

    public function appendEntitlementDecision(array $decision): array
    {
        return $this->db->transactional(function () use ($decision): array {
            $decisionKey = trim((string)($decision['decision_key'] ?? ''));
            if ($decisionKey === '') {
                throw new RuntimeException('missing_entitlement_decision_key');
            }

            $existing = $this->db->queryOne(
                'SELECT * FROM ' . self::DECISION_TABLE . ' WHERE decision_key = :decision_key LIMIT 1 FOR UPDATE',
                [':decision_key' => $decisionKey],
            );
            if ($existing !== null) {
                if ((string)($existing['decision_fingerprint_hash'] ?? '') !== (string)($decision['decision_fingerprint_hash'] ?? '')) {
                    throw new RecordConflictException('execution_entitlement_decision_conflict');
                }
                return $this->normalizeRow($existing);
            }

            $row = $this->insert(self::DECISION_TABLE, $this->decisionColumns(), $decision);
            if ($row === null) {
                throw new RuntimeException('Unable to persist execution entitlement decision.');
            }
            return $this->normalizeRow($row);
        });
    }

    public function listEntitlementDecisions(array $filters = []): array
    {
        return $this->listRows(self::DECISION_TABLE, ConnectedGovernanceService::decisionFilterFields(), $filters, 'created_at DESC, decision_id ASC');
    }

    public function probe(): array
    {
        try {
            $rolloutAvailable = $this->tableAvailable(self::ROLLOUT_TABLE);
            $obligationAvailable = $this->tableAvailable(self::OBLIGATION_TABLE);
            $decisionAvailable = $this->tableAvailable(self::DECISION_TABLE);
            $available = $rolloutAvailable && $obligationAvailable && $decisionAvailable;

            return [
                'slice' => 'connected_governance',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => $available ? 'authoritative_ready' : 'degraded',
                'authority_mode' => $available ? 'postgres_primary' : 'degraded',
                'authoritative' => $available,
                'fallback_only' => false,
                'table_available' => $available,
                'tables' => [
                    self::ROLLOUT_TABLE => $rolloutAvailable,
                    self::OBLIGATION_TABLE => $obligationAvailable,
                    self::DECISION_TABLE => $decisionAvailable,
                ],
                'rollout_count' => $rolloutAvailable ? (int)$this->db->queryScalar('SELECT COUNT(*) FROM ' . self::ROLLOUT_TABLE) : 0,
                'training_obligation_count' => $obligationAvailable ? (int)$this->db->queryScalar('SELECT COUNT(*) FROM ' . self::OBLIGATION_TABLE) : 0,
                'entitlement_decision_count' => $decisionAvailable ? (int)$this->db->queryScalar('SELECT COUNT(*) FROM ' . self::DECISION_TABLE) : 0,
            ];
        } catch (\Throwable $e) {
            return [
                'slice' => 'connected_governance',
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
            'eqms_controlled_revision_rollout',
            'eqms_training_obligation',
            'eqms_execution_entitlement_decision',
        ];

        if (!in_array($table, $allowedTables, true)) {
            return false;
        }

        // Use parameterized query with to_regclass for safety
        $row = $this->db->queryOne("SELECT to_regclass(:table_name) AS table_name", [':table_name' => $table]);
        return trim((string)($row['table_name'] ?? '')) !== '';
    }

    /**
     * @return list<string>
     */
    private function rolloutColumns(): array
    {
        return [
            'rollout_id',
            'controlled_revision_key',
            'revision_type',
            'revision_id',
            'revision_version',
            'document_revision_id',
            'inspection_plan_id',
            'control_plan_id',
            'work_instruction_id',
            'change_control_id',
            'operation_id',
            'operation_seq',
            'work_center_id',
            'machine_id',
            'part_number',
            'part_revision',
            'role_code',
            'required_qualification_type',
            'required_qualification_code',
            'min_proficiency',
            'rollout_state',
            'effective_from',
            'effective_to',
            'released_at',
            'released_by',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'payload_schema_version',
            'source_system',
            'source_record_id',
            'metadata',
            'created_at',
            'updated_at',
            'row_version',
        ];
    }

    /**
     * @return list<string>
     */
    private function obligationColumns(): array
    {
        return [
            'training_obligation_id',
            'rollout_id',
            'obligation_key',
            'controlled_revision_key',
            'revision_type',
            'revision_id',
            'revision_version',
            'audience_role',
            'qualification_type',
            'qualification_code',
            'min_proficiency',
            'obligation_state',
            'due_at',
            'satisfied_at',
            'superseded_at',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'source_system',
            'source_record_id',
            'metadata',
            'created_at',
            'updated_at',
            'row_version',
        ];
    }

    /**
     * @return list<string>
     */
    private function decisionColumns(): array
    {
        return [
            'decision_id',
            'decision_key',
            'decision_fingerprint_hash',
            'action',
            'actor_id',
            'allowed',
            'reason_code',
            'message',
            'rollout_id',
            'training_obligation_id',
            'qualification_assertion_id',
            'assertion_state',
            'target_aggregate_type',
            'target_aggregate_id',
            'wo_number',
            'jo_number',
            'operation_seq',
            'work_center_id',
            'machine_id',
            'part_number',
            'part_revision',
            'active_revision',
            'training_obligation',
            'qualification_assertion',
            'decision_payload',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'correlation_id',
            'request_id',
            'traceparent',
            'payload_schema_version',
            'source_system',
            'source_record_id',
            'created_at',
        ];
    }

    /**
     * @param list<string> $columns
     * @param list<string> $identityColumns
     * @param array<string, mixed>|null $existing
     * @return array<string, mixed>|null
     */
    private function upsert(string $table, array $columns, array $identityColumns, array $row, ?array $existing): ?array
    {
        $now = gmdate(DATE_ATOM);
        $row['created_at'] = $existing['created_at'] ?? ($row['created_at'] ?? $now);
        $row['updated_at'] = $now;
        $row['row_version'] = (int)($existing['row_version'] ?? 0) + 1;

        [$placeholders, $params] = $this->params($columns, $row);
        $updates = [];
        foreach ($columns as $column) {
            if (in_array($column, $identityColumns, true) || $column === 'created_at') {
                continue;
            }
            $updates[] = "{$column} = EXCLUDED.{$column}";
        }

        $sql = 'INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ')
                VALUES (' . implode(', ', $placeholders) . ')
                ON CONFLICT (' . implode(', ', $identityColumns) . ') DO UPDATE SET ' . implode(', ', $updates) . '
                RETURNING *';

        return $this->db->insertReturning($sql, $params);
    }

    /**
     * @param list<string> $columns
     * @param array<string, mixed> $row
     * @return array<string, mixed>|null
     */
    private function insert(string $table, array $columns, array $row): ?array
    {
        [$placeholders, $params] = $this->params($columns, $row);
        $sql = 'INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ')
                VALUES (' . implode(', ', $placeholders) . ')
                RETURNING *';

        return $this->db->insertReturning($sql, $params);
    }

    /**
     * @param list<string> $columns
     * @param array<string, mixed> $row
     * @return array{0: list<string>, 1: array<string, mixed>}
     */
    private function params(array $columns, array $row): array
    {
        $jsonColumns = ['metadata', 'active_revision', 'training_obligation', 'qualification_assertion', 'decision_payload'];
        $placeholders = [];
        $params = [];
        foreach ($columns as $column) {
            $params[":{$column}"] = in_array($column, $jsonColumns, true)
                ? ManufacturingEventCodec::canonicalJson($row[$column] ?? [])
                : ($row[$column] ?? null);
            $placeholders[] = in_array($column, $jsonColumns, true) ? ":{$column}::jsonb" : ":{$column}";
        }
        return [$placeholders, $params];
    }

    /**
     * @param list<string> $filterFields
     * @return list<array<string, mixed>>
     */
    private function listRows(string $table, array $filterFields, array $filters, string $orderBy): array
    {
        $where = [];
        $params = [];
        foreach ($filterFields as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            $where[] = "{$field} = :{$field}";
            $params[":{$field}"] = $value;
        }

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        $params[':limit'] = $limit;
        $sql = 'SELECT * FROM ' . $table
            . ($where !== [] ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY ' . $orderBy . ' LIMIT :limit';

        return array_map([$this, 'normalizeRow'], $this->db->query($sql, $params));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['metadata', 'active_revision', 'training_obligation', 'qualification_assertion', 'decision_payload'] as $field) {
            if (array_key_exists($field, $row)) {
                $row[$field] = ManufacturingEventCodec::decodeJsonObject($row[$field]);
            }
        }
        foreach ($row as $key => $value) {
            if ($value === null) {
                continue;
            }
            if (is_scalar($value)) {
                $row[$key] = is_bool($value) ? $value : (string)$value;
            }
        }
        return $row;
    }
}

if (!class_exists('MOM\\Services\\PostgresConnectedGovernanceRepository', false)) {
    class_alias(PostgresConnectedGovernanceRepository::class, 'MOM\\Services\\PostgresConnectedGovernanceRepository');
}
