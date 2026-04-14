<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Canonical evidence read model. Legacy vault JSON remains compatibility-only;
 * finalized evidence authority is evidence_records/evidence_versions/artifacts.
 */
final class CanonicalEvidenceReadService
{
    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @return array<string, mixed>
     */
    public function package(string $evidenceRef): array
    {
        $id = trim($evidenceRef);
        if ($id === '') {
            throw new RuntimeException('evidence_ref_required');
        }
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('canonical_evidence_store_required');
        }

        $record = $this->db->queryOne(
            "SELECT *
             FROM evidence_records
             WHERE evidence_record_id::text = :id OR evidence_key = :id
             LIMIT 1",
            [':id' => $id],
        );
        if (!is_array($record)) {
            throw new RuntimeException('canonical_evidence_record_not_found');
        }

        $recordId = (string)($record['evidence_record_id'] ?? '');
        $versionId = trim((string)($record['current_version_id'] ?? ''));
        $version = null;
        if ($versionId !== '') {
            $version = $this->db->queryOne(
                "SELECT *
                 FROM evidence_versions
                 WHERE evidence_version_id::text = :version_id
                 LIMIT 1",
                [':version_id' => $versionId],
            );
        }
        if (!is_array($version)) {
            $version = $this->db->queryOne(
                "SELECT *
                 FROM evidence_versions
                 WHERE evidence_record_id::text = :record_id
                 ORDER BY version_no DESC, finalized_at DESC NULLS LAST, created_at DESC
                 LIMIT 1",
                [':record_id' => $recordId],
            );
        }
        if (!is_array($version)) {
            throw new RuntimeException('canonical_evidence_version_not_found');
        }

        $versionId = (string)($version['evidence_version_id'] ?? '');

        return [
            'authority' => 'canonical_evidence_control_plane',
            'legacy_vault_role' => 'compatibility_read_only_not_source_of_truth',
            'evidence_record' => $this->normalizeRow($record),
            'evidence_version' => $this->normalizeRow($version),
            'evidence_artifacts' => $this->queryRows(
                "SELECT *
                 FROM evidence_artifacts
                 WHERE evidence_version_id::text = :version_id
                 ORDER BY artifact_role",
                [':version_id' => $versionId],
            ),
            'signature_events' => $this->queryRows(
                "SELECT *
                 FROM signature_events
                 WHERE signed_object_type = 'evidence_version'
                   AND signed_object_id = :version_id
                 ORDER BY signed_at, signature_event_id",
                [':version_id' => $versionId],
            ),
            'publication_records' => $this->queryRows(
                "SELECT *
                 FROM evidence_publications
                 WHERE evidence_version_id::text = :version_id
                 ORDER BY updated_at DESC",
                [':version_id' => $versionId],
            ),
            'retention_locks' => $this->queryRows(
                "SELECT *
                 FROM retention_locks
                 WHERE (object_type = 'evidence_record' AND object_id = :record_id)
                    OR (object_type = 'evidence_version' AND object_id = :version_id)
                 ORDER BY created_at DESC",
                [':record_id' => $recordId, ':version_id' => $versionId],
            ),
        ];
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
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    private function queryRows(string $sql, array $params): array
    {
        if ($this->db === null) {
            return [];
        }
        $rows = [];
        if (method_exists($this->db, 'query')) {
            $rows = $this->db->query($sql, $params);
        } elseif (method_exists($this->db, 'queryAll')) {
            $rows = $this->db->queryAll($sql, $params);
        }
        if (!is_array($rows)) {
            return [];
        }

        $normalized = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $normalized[] = $this->normalizeRow($row);
            }
        }
        return $normalized;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['metadata', 'canonical_payload', 'publication_receipt'] as $field) {
            if (is_string($row[$field] ?? null)) {
                $decoded = json_decode((string)$row[$field], true);
                if (is_array($decoded)) {
                    $row[$field] = $decoded;
                }
            }
        }
        return $row;
    }
}
