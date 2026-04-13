<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

final class PostgresTrustedReleaseRecordRepository implements TrustedReleaseRecordRepository
{
    private const TABLE = 'mes_trusted_release_record';

    public function __construct(private readonly Connection $db)
    {
    }

    public function save(array $packet): array
    {
        return $this->db->transactional(function () use ($packet): array {
            $packetId = trim((string)($packet['packet_id'] ?? ''));
            if ($packetId === '') {
                throw new RuntimeException('missing_release_record_packet_id');
            }

            $existing = $this->findForUpdate($packetId);
            if ($existing !== null && (string)($existing['packet_state'] ?? '') === 'released') {
                $sameHash = (string)($existing['packet_hash'] ?? '') === (string)($packet['packet_hash'] ?? '');
                if ((string)($packet['packet_state'] ?? '') !== 'released' || !$sameHash) {
                    throw new RecordConflictException('release_record_immutable');
                }
                return $this->normalizeRow($existing);
            }

            $row = $this->upsert($packet, $existing);
            if ($row === null) {
                throw new RuntimeException('Unable to persist trusted release record packet.');
            }
            return $this->normalizeRow($row);
        });
    }

    public function find(string $packetId): ?array
    {
        $row = $this->db->queryOne('SELECT * FROM ' . self::TABLE . ' WHERE packet_id = :packet_id LIMIT 1', [
            ':packet_id' => $packetId,
        ]);
        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    public function list(array $filters = []): array
    {
        $where = [];
        $params = [];
        foreach (TrustedReleaseRecordService::filterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            $where[] = "{$field} = :{$field}";
            $params[":{$field}"] = $value;
        }

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        $params[':limit'] = $limit;
        $sql = 'SELECT * FROM ' . self::TABLE
            . ($where !== [] ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY updated_at DESC, packet_id ASC LIMIT :limit';

        return array_map(fn(array $row): array => $this->normalizeRow($row), $this->db->query($sql, $params));
    }

    public function probe(): array
    {
        try {
            // GOV-005: Use parameterized query for table existence check
            $row = $this->db->queryOne("SELECT to_regclass(:table_name) AS table_name", [':table_name' => self::TABLE]);
            $available = trim((string)($row['table_name'] ?? '')) !== '';
            $count = $available ? (int)$this->db->queryScalar('SELECT COUNT(*) FROM ' . self::TABLE) : 0;

            return [
                'slice' => 'trusted_release_record',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => $available ? 'authoritative_ready' : 'degraded',
                'authority_mode' => $available ? 'postgres_primary' : 'degraded',
                'authoritative' => $available,
                'fallback_only' => false,
                'table_available' => $available,
                'packet_count' => $count,
                'table' => self::TABLE,
            ];
        } catch (\Throwable $e) {
            return [
                'slice' => 'trusted_release_record',
                'backend' => 'postgres',
                'primary_backend' => 'postgres',
                'readiness_state' => 'degraded',
                'authority_mode' => 'degraded',
                'authoritative' => false,
                'fallback_only' => false,
                'table_available' => false,
                'packet_count' => 0,
                'table' => self::TABLE,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function findForUpdate(string $packetId): ?array
    {
        return $this->db->queryOne(
            'SELECT * FROM ' . self::TABLE . ' WHERE packet_id = :packet_id LIMIT 1 FOR UPDATE',
            [':packet_id' => $packetId],
        );
    }

    /**
     * @param array<string, mixed> $packet
     * @param array<string, mixed>|null $existing
     * @return array<string, mixed>|null
     */
    private function upsert(array $packet, ?array $existing): ?array
    {
        $now = gmdate(DATE_ATOM);
        $packet['created_at'] = $existing['created_at'] ?? ($packet['created_at'] ?? $now);
        $packet['updated_at'] = $now;
        $packet['row_version'] = (int)($existing['row_version'] ?? 0) + 1;

        $columns = [
            'packet_id',
            'packet_type',
            'payload_schema_version',
            'packet_version',
            'packet_state',
            'target_aggregate_type',
            'target_aggregate_id',
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'part_number',
            'part_revision',
            'lot_number',
            'serial_number',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
            'history_packet_id',
            'packet_hash',
            'packet_hash_algorithm',
            'frozen_at',
            'released_at',
            'released_by',
            'release_decision_code',
            'release_decision_reason',
            'blocker_count',
            'blocker_categories',
            'canonical_identifiers',
            'assertions',
            'packet_payload',
            'provenance',
            'retention_metadata',
            'record_copy_metadata',
            'metrics_snapshot',
            'correlation_id',
            'request_id',
            'traceparent',
            'source_system',
            'source_record_id',
            'created_at',
            'updated_at',
            'row_version',
        ];

        $jsonColumns = [
            'blocker_categories',
            'canonical_identifiers',
            'assertions',
            'packet_payload',
            'provenance',
            'retention_metadata',
            'record_copy_metadata',
            'metrics_snapshot',
        ];

        $params = [];
        $placeholders = [];
        $updates = [];
        foreach ($columns as $column) {
            $params[":{$column}"] = in_array($column, $jsonColumns, true)
                ? ManufacturingEventCodec::canonicalJson($packet[$column] ?? ($column === 'blocker_categories' ? [] : []))
                : ($packet[$column] ?? null);
            $placeholders[] = in_array($column, $jsonColumns, true)
                ? ":{$column}::jsonb"
                : ":{$column}";
            if ($column !== 'packet_id' && $column !== 'created_at') {
                $updates[] = "{$column} = EXCLUDED.{$column}";
            }
        }

        $sql = 'INSERT INTO ' . self::TABLE . ' (' . implode(', ', $columns) . ')
                VALUES (' . implode(', ', $placeholders) . ')
                ON CONFLICT (packet_id) DO UPDATE SET ' . implode(', ', $updates) . '
                RETURNING *';

        return $this->db->insertReturning($sql, $params);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach ([
            'blocker_categories',
            'canonical_identifiers',
            'assertions',
            'packet_payload',
            'provenance',
            'retention_metadata',
            'record_copy_metadata',
            'metrics_snapshot',
        ] as $field) {
            $row[$field] = ManufacturingEventCodec::decodeJsonObject($row[$field] ?? []);
        }

        $payload = is_array($row['packet_payload'] ?? null) ? $row['packet_payload'] : [];
        foreach (['sections', 'blockers', 'release_decision'] as $field) {
            if (!isset($row[$field]) && isset($payload[$field])) {
                $row[$field] = $payload[$field];
            }
        }

        foreach ($row as $key => $value) {
            if ($value === null) {
                continue;
            }
            if (is_scalar($value)) {
                $row[$key] = (string)$value;
            }
        }
        return $row;
    }
}

if (!class_exists('MOM\\Services\\PostgresTrustedReleaseRecordRepository', false)) {
    class_alias(PostgresTrustedReleaseRecordRepository::class, 'MOM\\Services\\PostgresTrustedReleaseRecordRepository');
}
