<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Binds finalized records to the canonical retention register. Local immutable
 * storage is only a bridge; retention/legal-hold authority is `retention_locks`.
 */
final class RetentionLockService
{
    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $record
     * @param array<string, mixed> $version
     * @param array<string, mixed> $input
     * @return array<string, mixed>|null
     */
    public function ensureForFinalEvidence(array $record, array $version, array $input): ?array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            return null;
        }

        $recordId = $this->text($record['evidence_record_id'] ?? '');
        $versionId = $this->text($version['evidence_version_id'] ?? '');
        if ($recordId === '' || $versionId === '') {
            throw new RuntimeException('retention_lock_subject_required');
        }

        $retentionClass = $this->nullableText($input['retention_class'] ?? null) ?? 'quality_record';
        $lockType = $this->lockType($input['retention_lock_type'] ?? 'retention_schedule');
        $idempotencySeed = $this->nullableText($input['idempotency_key'] ?? null) ?? $recordId . '|' . $versionId;

        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO retention_locks
                    (object_type, object_id, lock_type, lock_state, locked_until, disposition_after,
                     reason, created_by_user_id, idempotency_key, metadata)
                VALUES
                    ('evidence_record', :object_id, :lock_type, 'active', CAST(:locked_until AS timestamptz),
                     :disposition_after, :reason, CAST(:created_by_user_id AS uuid), :idempotency_key,
                     CAST(:metadata AS jsonb))
                ON CONFLICT (object_type, object_id, lock_type) WHERE lock_state = 'active'
                DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM retention_locks
              WHERE object_type = 'evidence_record'
                AND object_id = :object_id
                AND lock_type = :lock_type
                AND lock_state = 'active'
             LIMIT 1",
            [
                ':object_id' => $recordId,
                ':lock_type' => $lockType,
                ':locked_until' => $this->nullableText($input['locked_until'] ?? $input['retention_until'] ?? null),
                ':disposition_after' => $this->dispositionAfter($input['disposition_after'] ?? 'review'),
                ':reason' => $this->nullableText($input['retention_reason'] ?? null) ?? 'Final evidence retention lock',
                ':created_by_user_id' => $this->nullableUuid($input['finalized_by_user_id'] ?? $input['actor_id'] ?? null),
                ':idempotency_key' => hash('sha256', $idempotencySeed . '|retention|' . $lockType),
                ':metadata' => $this->json([
                    'authority' => 'RetentionLockService',
                    'retention_class' => $retentionClass,
                    'evidence_version_id' => $versionId,
                    'package_hash_sha256' => $this->nullableText($version['package_hash_sha256'] ?? $input['package_hash_sha256'] ?? null),
                ]),
            ],
        );

        return is_array($row) ? $row : null;
    }

    private function normalizeDb(?object $db): ?object
    {
        if ($db instanceof DataLayer) {
            return $db->getConnection();
        }
        if ($db instanceof Connection) {
            return $db;
        }
        if ($db !== null && method_exists($db, 'getConnection')) {
            try {
                $candidate = $db->getConnection();
                return is_object($candidate) ? $candidate : null;
            } catch (\Throwable) {
                return null;
            }
        }
        return $db;
    }

    private function lockType(mixed $value): string
    {
        $type = strtolower($this->text($value));
        if (!in_array($type, ['regulatory', 'legal_hold', 'quality_event', 'retention_schedule', 'customer_contract'], true)) {
            throw new RuntimeException('invalid_retention_lock_type');
        }
        return $type;
    }

    private function dispositionAfter(mixed $value): string
    {
        $disposition = strtolower($this->text($value));
        if (!in_array($disposition, ['review', 'archive', 'destroy_if_allowed'], true)) {
            throw new RuntimeException('invalid_retention_disposition');
        }
        return $disposition;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->text($value);
        return preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    private function json(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }
}
