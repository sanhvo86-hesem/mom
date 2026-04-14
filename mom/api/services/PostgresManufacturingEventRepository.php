<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

final class PostgresManufacturingEventRepository implements ManufacturingEventRepository
{
    private const TABLE = 'mes_operational_event_ledger';
    private const REQUIRED_CONTEXT_COLUMNS = [
        'equipment_id',
        'operator_id',
        'tool_id',
        'process_id',
        'material_id',
        'material_lot_id',
        'material_batch_id',
        'batch_number',
        'routing_id',
        'setup_sheet_id',
        'inspection_plan_id',
        'nc_program_id',
        'cnc_program_id',
    ];

    public function __construct(private readonly Connection $db)
    {
    }

    public function append(array $event): array
    {
        return $this->db->transactional(function () use ($event): array {
            $duplicate = $this->findDuplicate($event);
            if ($duplicate !== null) {
                return $this->handleDuplicate($duplicate, $event);
            }

            $event['previous_event_hash'] = $this->previousHash($event);
            $event['recorded_at'] = $event['recorded_at'] ?? gmdate(DATE_ATOM);
            $event['event_hash'] = ManufacturingEventCodec::eventHash($event);

            $row = $this->insertEvent($event);
            if ($row === null) {
                $duplicate = $this->findDuplicate($event) ?? $this->findByEventId((string)$event['event_id']);
                if ($duplicate !== null) {
                    return $this->handleDuplicate($duplicate, $event);
                }
                throw new RuntimeException('Unable to append manufacturing operational event.');
            }

            return ['event' => ManufacturingEventCodec::normalizeRow($row), 'replayed' => false];
        });
    }

    public function timeline(array $filters = []): array
    {
        $where = [];
        $params = [];
        foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            $where[] = "{$field} = :{$field}";
            $params[":{$field}"] = $value;
        }

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        $offset = max(0, (int)($filters['offset'] ?? 0));
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;
        $sql = 'SELECT * FROM ' . self::TABLE
            . ($where !== [] ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY occurred_at ASC, recorded_at ASC, event_id ASC LIMIT :limit OFFSET :offset';

        $rows = $this->db->query($sql, $params);
        return array_map([ManufacturingEventCodec::class, 'normalizeRow'], $rows);
    }

    public function probe(): array
    {
        try {
            // GOV-005: Use parameterized query for table existence check
            $row = $this->db->queryOne("SELECT to_regclass(:table_name) AS table_name", [':table_name' => self::TABLE]);
            $available = trim((string)($row['table_name'] ?? '')) !== '';
            $missingColumns = $available ? $this->missingContextColumns() : self::REQUIRED_CONTEXT_COLUMNS;
            $count = $available ? (int)$this->db->queryScalar('SELECT COUNT(*) FROM ' . self::TABLE) : 0;
            $authoritative = $available && $missingColumns === [];

            return [
                'slice' => 'manufacturing_events',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => $authoritative ? 'authoritative_ready' : 'degraded',
                'authority_mode' => $authoritative ? 'postgres_primary' : 'degraded',
                'authoritative' => $authoritative,
                'fallback_only' => false,
                'table_available' => $available,
                'schema_complete' => $missingColumns === [],
                'missing_columns' => $missingColumns,
                'event_count' => $count,
                'table' => self::TABLE,
            ];
        } catch (\Throwable $e) {
            return [
                'slice' => 'manufacturing_events',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => 'degraded',
                'authority_mode' => 'degraded',
                'authoritative' => false,
                'fallback_only' => false,
                'table_available' => false,
                'schema_complete' => false,
                'missing_columns' => self::REQUIRED_CONTEXT_COLUMNS,
                'event_count' => 0,
                'table' => self::TABLE,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @return list<string>
     */
    private function missingContextColumns(): array
    {
        $quoted = implode(', ', array_map(
            static fn(string $column): string => "'" . str_replace("'", "''", $column) . "'",
            self::REQUIRED_CONTEXT_COLUMNS,
        ));
        $rows = $this->db->query(
            "SELECT column_name
             FROM information_schema.columns
             WHERE table_name = :table_name
               AND column_name IN ({$quoted})",
            [':table_name' => self::TABLE],
        );
        $present = [];
        foreach ($rows as $row) {
            if (is_array($row) && isset($row['column_name'])) {
                $present[] = (string)$row['column_name'];
            }
        }

        return array_values(array_diff(self::REQUIRED_CONTEXT_COLUMNS, $present));
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>|null
     */
    private function findDuplicate(array $event): ?array
    {
        $byEventId = $this->findByEventId((string)($event['event_id'] ?? ''));
        if ($byEventId !== null) {
            return $byEventId;
        }

        if (trim((string)($event['idempotency_key'] ?? '')) === '') {
            return null;
        }

        return $this->db->queryOne(
            'SELECT * FROM ' . self::TABLE . '
             WHERE source_system = :source_system
	               AND source_aggregate_type = :source_aggregate_type
	               AND source_aggregate_id = :source_aggregate_id
	               AND event_type = :event_type
	               AND idempotency_key = :idempotency_key
	               AND enterprise_id IS NOT DISTINCT FROM :enterprise_id
	               AND company_id IS NOT DISTINCT FROM :company_id
	               AND site_id IS NOT DISTINCT FROM :site_id
	               AND plant_id IS NOT DISTINCT FROM :plant_id
	               AND org_company_code IS NOT DISTINCT FROM :org_company_code
	               AND org_legal_entity_code IS NOT DISTINCT FROM :org_legal_entity_code
	               AND org_plant_id IS NOT DISTINCT FROM :org_plant_id
	               AND org_site_id IS NOT DISTINCT FROM :org_site_id
	             LIMIT 1
	             FOR UPDATE',
            array_merge([
                ':source_system' => (string)$event['source_system'],
                ':source_aggregate_type' => (string)$event['source_aggregate_type'],
                ':source_aggregate_id' => (string)$event['source_aggregate_id'],
                ':event_type' => (string)$event['event_type'],
                ':idempotency_key' => (string)$event['idempotency_key'],
            ], $this->scopeParams($event)),
        );
    }

    private function findByEventId(string $eventId): ?array
    {
        if ($eventId === '') {
            return null;
        }
        return $this->db->queryOne(
            'SELECT * FROM ' . self::TABLE . ' WHERE event_id = :event_id LIMIT 1 FOR UPDATE',
            [':event_id' => $eventId],
        );
    }

    /**
     * @param array<string, mixed> $existing
     * @param array<string, mixed> $event
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    private function handleDuplicate(array $existing, array $event): array
    {
        if (($existing['fingerprint_hash'] ?? '') !== ($event['fingerprint_hash'] ?? '')) {
            throw new RecordConflictException('manufacturing_event_idempotency_conflict');
        }
        return ['event' => ManufacturingEventCodec::normalizeRow($existing), 'replayed' => true];
    }

    /**
     * @param array<string, mixed> $event
     */
    private function previousHash(array $event): ?string
    {
        $row = $this->db->queryOne(
            'SELECT event_hash FROM ' . self::TABLE . '
	             WHERE source_system = :source_system
	               AND source_aggregate_type = :source_aggregate_type
	               AND source_aggregate_id = :source_aggregate_id
	               AND enterprise_id IS NOT DISTINCT FROM :enterprise_id
	               AND company_id IS NOT DISTINCT FROM :company_id
	               AND site_id IS NOT DISTINCT FROM :site_id
	               AND plant_id IS NOT DISTINCT FROM :plant_id
	               AND org_company_code IS NOT DISTINCT FROM :org_company_code
	               AND org_legal_entity_code IS NOT DISTINCT FROM :org_legal_entity_code
	               AND org_plant_id IS NOT DISTINCT FROM :org_plant_id
	               AND org_site_id IS NOT DISTINCT FROM :org_site_id
	             ORDER BY occurred_at DESC, recorded_at DESC, event_id DESC
	             LIMIT 1
	             FOR UPDATE',
            array_merge([
                ':source_system' => (string)$event['source_system'],
                ':source_aggregate_type' => (string)$event['source_aggregate_type'],
                ':source_aggregate_id' => (string)$event['source_aggregate_id'],
            ], $this->scopeParams($event)),
        );

        $hash = trim((string)($row['event_hash'] ?? ''));
        return $hash !== '' ? $hash : null;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, string|null>
     */
    private function scopeParams(array $event): array
    {
        return [
            ':enterprise_id' => $this->nullableScope($event['enterprise_id'] ?? null),
            ':company_id' => $this->nullableScope($event['company_id'] ?? null),
            ':site_id' => $this->nullableScope($event['site_id'] ?? null),
            ':plant_id' => $this->nullableScope($event['plant_id'] ?? null),
            ':org_company_code' => $this->nullableScope($event['org_company_code'] ?? null),
            ':org_legal_entity_code' => $this->nullableScope($event['org_legal_entity_code'] ?? null),
            ':org_plant_id' => $this->nullableScope($event['org_plant_id'] ?? null),
            ':org_site_id' => $this->nullableScope($event['org_site_id'] ?? null),
        ];
    }

    private function nullableScope(mixed $value): ?string
    {
        $text = trim((string)($value ?? ''));
        return $text !== '' ? $text : null;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>|null
     */
    private function insertEvent(array $event): ?array
    {
        $columns = [
            'event_id',
            'event_type',
            'event_category',
            'event_version',
            'payload_schema_version',
            'fingerprint_hash',
            'event_hash',
            'previous_event_hash',
            'correlation_id',
            'request_id',
            'causation_event_id',
            'traceparent',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
            'equipment_id',
            'operator_id',
            'tool_id',
            'process_id',
            'source_system',
            'source_aggregate_type',
            'source_aggregate_id',
            'source_event_id',
            'source_record_id',
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'part_number',
            'part_revision',
            'lot_number',
            'material_id',
            'material_lot_id',
            'material_batch_id',
            'batch_number',
            'serial_number',
            'parent_lot_number',
            'parent_serial_number',
            'child_lot_number',
            'child_serial_number',
            'routing_id',
            'setup_sheet_id',
            'inspection_plan_id',
            'nc_program_id',
            'cnc_program_id',
            'inspection_id',
            'ncr_id',
            'capa_id',
            'scar_id',
            'evidence_id',
            'approval_id',
            'electronic_signature_id',
            'actor_id',
            'actor_role',
            'occurred_at',
            'recorded_at',
            'idempotency_key',
            'payload',
            'metadata',
            'row_version',
        ];

        $params = [];
        $placeholders = [];
        foreach ($columns as $column) {
            $params[":{$column}"] = in_array($column, ['payload', 'metadata'], true)
                ? ManufacturingEventCodec::canonicalJson($event[$column] ?? [])
                : ($event[$column] ?? null);
            $placeholders[] = in_array($column, ['payload', 'metadata'], true)
                ? ":{$column}::jsonb"
                : ":{$column}";
        }

        $sql = 'INSERT INTO ' . self::TABLE . ' (' . implode(', ', $columns) . ')
                VALUES (' . implode(', ', $placeholders) . ')
                ON CONFLICT DO NOTHING
                RETURNING *';

        return $this->db->insertReturning($sql, $params);
    }
}

if (!class_exists('MOM\\Services\\PostgresManufacturingEventRepository', false)) {
    class_alias(PostgresManufacturingEventRepository::class, 'MOM\\Services\\PostgresManufacturingEventRepository');
}
