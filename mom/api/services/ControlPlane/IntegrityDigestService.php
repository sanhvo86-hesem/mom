<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Scheduled integrity digest authority for audit/evidence/publication control records.
 */
final class IntegrityDigestService
{
    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $scope
     * @return array<string, mixed>
     */
    public function computeDailyDigest(array $scope = []): array
    {
        $db = $this->requireDb();
        $scope = $this->normalizedScope($scope);
        $source = $this->sourceSnapshot($scope);
        $digestValue = hash('sha256', $this->json([
            'scope' => $scope,
            'source_high_watermark' => $source['source_high_watermark'] ?? '',
            'source_event_count' => (int)($source['source_event_count'] ?? 0),
            'source_digest' => (string)($source['source_digest'] ?? ''),
        ]));
        $objectId = $this->digestObjectId($scope);

        $existing = $db->queryOne(
            "SELECT integrity_digest_id, digest_value, source_high_watermark, digest_state
             FROM integrity_digests
             WHERE digest_scope = 'daily'
               AND object_type = 'audit_chain'
               AND object_id = :object_id
               AND (:source_high_watermark IS NULL OR source_high_watermark = :source_high_watermark)
             ORDER BY verified_at DESC
             LIMIT 1",
            [
                ':object_id' => $objectId,
                ':source_high_watermark' => $this->nullableText($source['source_high_watermark'] ?? null),
            ],
        );
        if (is_array($existing)
            && $this->text($existing['integrity_digest_id'] ?? '') !== ''
            && $this->text($existing['digest_value'] ?? '') !== ''
            && $this->text($existing['digest_value'] ?? '') !== $digestValue
        ) {
            $this->openException(
                $scope + ['integrity_digest_id' => $this->text($existing['integrity_digest_id'])],
                'integrity_digest_mismatch',
                'Recomputed daily audit-chain digest does not match the existing digest for the same high-watermark.',
                'critical',
            );
        }

        $row = $db->queryOne(
            "INSERT INTO integrity_digests
                (digest_scope, object_type, object_id, digest_algorithm, digest_value, source_high_watermark,
                 verified_at, digest_state, org_company_code, org_legal_entity_code, org_plant_id, org_site_id,
                 metadata)
             VALUES
                ('daily', 'audit_chain', :object_id, 'sha256', :digest_value, :source_high_watermark,
                 now(), 'valid', :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id,
                 CAST(:metadata AS jsonb))
             RETURNING *",
            [
                ':object_id' => $objectId,
                ':digest_value' => $digestValue,
                ':source_high_watermark' => $this->nullableText($source['source_high_watermark'] ?? null),
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
                ':metadata' => $this->json([
                    'authority' => 'IntegrityDigestService',
                    'covered_tables' => ['audit_events'],
                    'source_snapshot' => $source,
                ]),
            ],
        );
        if (!is_array($row) || $this->text($row['integrity_digest_id'] ?? '') === '') {
            throw new RuntimeException('integrity_digest_persist_failed');
        }
        return $row;
    }

    /**
     * @param array<string, mixed> $scope
     * @return array<string, mixed>
     */
    public function openException(array $scope, string $reasonCode, string $description, string $severity = 'major'): array
    {
        $db = $this->requireDb();
        $scope = $this->normalizedScope($scope);
        $severity = strtolower($this->text($severity));
        if (!in_array($severity, ['minor', 'major', 'critical'], true)) {
            throw new RuntimeException('invalid_integrity_exception_severity');
        }
        $row = $db->queryOne(
            "INSERT INTO integrity_exceptions
                (integrity_digest_id, object_type, object_id, severity, exception_state, reason_code, description, metadata)
             VALUES
                (CAST(:integrity_digest_id AS uuid), 'audit_chain', :object_id, :severity, 'open', :reason_code, :description,
                 CAST(:metadata AS jsonb))
             RETURNING *",
            [
                ':integrity_digest_id' => $this->nullableUuid($scope['integrity_digest_id'] ?? null),
                ':object_id' => $this->digestObjectId($scope),
                ':severity' => $severity,
                ':reason_code' => $this->requiredText($reasonCode, 'reason_code'),
                ':description' => $description,
                ':metadata' => $this->json(['authority' => 'IntegrityDigestService', 'scope' => $scope]),
            ],
        );
        if (!is_array($row) || $this->text($row['integrity_exception_id'] ?? '') === '') {
            throw new RuntimeException('integrity_exception_persist_failed');
        }
        return $row;
    }

    /**
     * @param array<string, string> $scope
     * @return array<string, mixed>
     */
    private function sourceSnapshot(array $scope): array
    {
        $rows = $this->db->query(
            "SELECT
                max(recorded_at)::text AS source_high_watermark,
                count(*)::int AS source_event_count,
                encode(digest(COALESCE(string_agg(COALESCE(event_hash, source_event_hash, event_id::text), '' ORDER BY aggregate_type, aggregate_id, recorded_at), ''), 'sha256'), 'hex') AS source_digest
             FROM audit_events
             WHERE (:org_company_code IS NULL OR metadata->>'org_company_code' = :org_company_code)
               AND (:org_legal_entity_code IS NULL OR metadata->>'org_legal_entity_code' = :org_legal_entity_code)
               AND (:org_plant_id IS NULL OR metadata->>'org_plant_id' = :org_plant_id)
               AND (:org_site_id IS NULL OR metadata->>'org_site_id' = :org_site_id)",
            [
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
            ],
        );
        return is_array($rows) && isset($rows[0]) && is_array($rows[0]) ? $rows[0] : [];
    }

    private function requireDb(): object
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne') || !method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_integrity_digest_store_required');
        }
        return $this->db;
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

    /**
     * @param array<string, mixed> $scope
     * @return array<string, string>
     */
    private function normalizedScope(array $scope): array
    {
        $out = [];
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $value = $this->text($scope[$field] ?? '');
            if ($value !== '') {
                $out[$field] = $value;
            }
        }
        if ($this->text($scope['integrity_digest_id'] ?? '') !== '') {
            $out['integrity_digest_id'] = $this->text($scope['integrity_digest_id']);
        }
        return $out;
    }

    /**
     * @param array<string, string> $scope
     */
    private function digestObjectId(array $scope): string
    {
        return $scope === [] ? 'global' : hash('sha256', $this->json($scope));
    }

    private function requiredText(mixed $value, string $field): string
    {
        $text = $this->text($value);
        if ($text === '') {
            throw new RuntimeException($field . '_required');
        }
        return $text;
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
