<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Authoritative audit-pack assembly. Callers provide scope only; package
 * content is loaded from canonical record tables to prevent omission/injection.
 */
final class AuditPackExportService
{
    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $scope
     * @return array<string, mixed>
     */
    public function buildForScope(array $scope, string $orgId): array
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_audit_pack_store_required');
        }

        $scopeType = $this->requiredText($scope, 'scope_type');
        $scopeRef = $this->requiredText($scope, 'scope_ref');
        $evidencePackages = $this->queryRows(
            "SELECT
                er.subject_type,
                er.subject_id,
                er.evidence_record_id,
                ev.evidence_version_id,
                ev.package_hash_sha256,
                ev.manifest_hash_sha256,
                COALESCE(er.metadata ->> 'org_id', er.metadata -> 'scope' ->> 'org_id') AS org_id,
                COALESCE(jsonb_object_agg(ea.artifact_role, jsonb_build_object('sha256', ea.sha256, 'storage_uri', ea.storage_uri))
                    FILTER (WHERE ea.evidence_artifact_id IS NOT NULL), '{}'::jsonb) AS artifacts
             FROM evidence_records er
             JOIN evidence_versions ev ON ev.evidence_version_id = er.current_version_id
             LEFT JOIN evidence_artifacts ea ON ea.evidence_version_id = ev.evidence_version_id
             WHERE (er.evidence_key = :scope_ref OR er.evidence_record_id::text = :scope_ref OR er.subject_id = :scope_ref)
               AND (:org_id = '' OR COALESCE(er.metadata ->> 'org_id', er.metadata -> 'scope' ->> 'org_id') = :org_id)
             GROUP BY er.evidence_record_id, ev.evidence_version_id",
            [':scope_ref' => $scopeRef, ':org_id' => $orgId],
        );

        $auditEvents = $this->queryRows(
            "SELECT event_id, event_type, aggregate_type, aggregate_id, actor_id, actor_name,
                    payload, metadata, recorded_at, source_event_hash,
                    COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') AS org_id
             FROM audit_events
             WHERE (aggregate_id = :scope_ref OR aggregate_type = :scope_type)
               AND (:org_id = '' OR COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') = :org_id)
             ORDER BY COALESCE(aggregate_sequence, 0), recorded_at",
            [':scope_type' => $scopeType, ':scope_ref' => $scopeRef, ':org_id' => $orgId],
        );

        $changeAuthorities = $this->queryRows(
            "SELECT co.*, COALESCE(co.metadata ->> 'org_id', co.metadata -> 'scope' ->> 'org_id') AS org_id
             FROM plm_change_orders co
             JOIN plm_change_affected_objects cao ON cao.plm_change_order_id = co.plm_change_order_id
             WHERE (cao.object_id = :scope_ref OR co.change_order_number = :scope_ref OR co.plm_change_order_id::text = :scope_ref)
               AND (:org_id = '' OR COALESCE(co.metadata ->> 'org_id', co.metadata -> 'scope' ->> 'org_id') = :org_id)",
            [':scope_ref' => $scopeRef, ':org_id' => $orgId],
        );

        $genealogyLinks = $this->queryRows(
            "SELECT *, COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') AS org_id
             FROM genealogy_edge_facts
             WHERE from_object_id = :scope_ref OR to_object_id = :scope_ref OR evidence_record_id::text = :scope_ref",
            [':scope_ref' => $scopeRef],
        );

        return (new AuditPackExporter())->buildManifest(
            $scope + ['authority' => 'canonical_audit_pack_export_service'],
            $evidencePackages,
            $auditEvents,
            $changeAuthorities,
            array_values(array_filter($genealogyLinks, static fn(array $row): bool => ($row['org_id'] ?? $orgId) === $orgId || $orgId === '')),
        );
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    private function queryRows(string $sql, array $params): array
    {
        $rows = $this->db?->query($sql, $params);
        return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredText(array $data, string $key): string
    {
        $value = trim((string)($data[$key] ?? ''));
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
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
}
