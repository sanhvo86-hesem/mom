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
        $evidencePackages = $this->attachPublicationAndRetentionRecords($evidencePackages, $orgId);

        $aggregateIds = $this->scopeAggregateIds($scopeRef, $evidencePackages);
        $auditEvents = $this->queryRows(
            "SELECT event_id, event_type, aggregate_type, aggregate_id, actor_id, actor_name,
                    payload, metadata, recorded_at, source_event_hash, aggregate_sequence,
                    COALESCE(source_event_hash, metadata -> 'audit_chain' ->> 'event_hash') AS event_hash,
                    metadata -> 'audit_chain' ->> 'prev_hash' AS prev_hash,
                    COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') AS org_id
             FROM audit_events
             WHERE (
                    aggregate_id = ANY(CAST(:aggregate_ids AS text[]))
                    OR payload ->> 'evidence_record_id' = ANY(CAST(:aggregate_ids AS text[]))
                    OR payload ->> 'evidence_version_id' = ANY(CAST(:aggregate_ids AS text[]))
                    OR metadata ->> 'evidence_record_id' = ANY(CAST(:aggregate_ids AS text[]))
                    OR metadata ->> 'evidence_version_id' = ANY(CAST(:aggregate_ids AS text[]))
                )
               AND aggregate_type IN ('evidence_record', 'evidence_version', 'signature_event', 'evidence_publication', 'retention_lock', 'audit_pack')
               AND (:org_id = '' OR COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') = :org_id)
             ORDER BY COALESCE(aggregate_sequence, 0), recorded_at",
            [
                ':aggregate_ids' => $this->postgresTextArray($aggregateIds),
                ':org_id' => $orgId,
            ],
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
     * @param array<string, mixed> $manifest
     * @param array<string, mixed> $export
     * @return array<string, mixed>
     */
    public function recordExportLifecycle(array $manifest, array $export, ?string $requestedByUserId = null): array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_audit_pack_store_required');
        }

        $scope = is_array($manifest['scope'] ?? null) ? $manifest['scope'] : [];
        $scopeType = $this->requiredText($scope, 'scope_type');
        $scopeRef = $this->requiredText($scope, 'scope_ref');
        $state = (string)($export['export_state'] ?? $manifest['export_state'] ?? 'failed');
        if (!in_array($state, ['ready', 'failed'], true)) {
            $state = 'failed';
        }

        $row = $this->db->queryOne(
            "INSERT INTO audit_pack_exports
                (export_scope, scope_ref, export_state, requested_by, completed_at,
                 package_uri, package_hash_sha256, manifest_payload, error_code, error_message)
             VALUES
                (:export_scope, :scope_ref, :export_state, CAST(:requested_by AS uuid), now(),
                 :package_uri, :package_hash_sha256, CAST(:manifest_payload AS jsonb), :error_code, :error_message)
             RETURNING *",
            [
                ':export_scope' => $scopeType,
                ':scope_ref' => $scopeRef,
                ':export_state' => $state,
                ':requested_by' => $this->nullableUuid($requestedByUserId),
                ':package_uri' => $this->nullableText($export['package_uri'] ?? null),
                ':package_hash_sha256' => $this->nullableSha256($export['package_hash_sha256'] ?? null),
                ':manifest_payload' => $this->json($manifest),
                ':error_code' => $this->nullableText($export['error_code'] ?? $manifest['error_code'] ?? null),
                ':error_message' => $this->nullableText($export['error_message'] ?? null),
            ],
        );

        if (!is_array($row) || trim((string)($row['audit_pack_export_id'] ?? '')) === '') {
            throw new RuntimeException('audit_pack_export_lifecycle_record_required');
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function readExportLifecycle(array $params): array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_audit_pack_store_required');
        }

        $exportId = $this->nullableUuid($params['audit_pack_export_id'] ?? null);
        $scopeType = $this->nullableText($params['scope_type'] ?? null);
        $scopeRef = $this->nullableText($params['scope_ref'] ?? null);
        $packageHash = $this->nullableSha256($params['package_hash_sha256'] ?? $params['package_hash'] ?? null);
        if ($exportId === null && ($scopeType === null || $scopeRef === null) && $packageHash === null) {
            throw new RuntimeException('audit_pack_export_lookup_required');
        }

        $row = $this->db->queryOne(
            "SELECT *
             FROM audit_pack_exports
             WHERE (:audit_pack_export_id IS NOT NULL AND audit_pack_export_id = CAST(:audit_pack_export_id AS uuid))
                OR (:package_hash_sha256 IS NOT NULL AND package_hash_sha256 = :package_hash_sha256)
                OR (:scope_type IS NOT NULL AND :scope_ref IS NOT NULL
                    AND export_scope = :scope_type
                    AND scope_ref = :scope_ref)
             ORDER BY completed_at DESC NULLS LAST, created_at DESC
             LIMIT 1",
            [
                ':audit_pack_export_id' => $exportId,
                ':package_hash_sha256' => $packageHash,
                ':scope_type' => $scopeType,
                ':scope_ref' => $scopeRef,
            ],
        );

        if (!is_array($row) || trim((string)($row['audit_pack_export_id'] ?? '')) === '') {
            throw new RuntimeException('audit_pack_export_not_found');
        }

        return $row;
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
     * @param list<array<string, mixed>> $packages
     * @return list<array<string, mixed>>
     */
    private function attachPublicationAndRetentionRecords(array $packages, string $orgId): array
    {
        if ($packages === []) {
            return [];
        }

        $versionIds = array_values(array_unique(array_filter(array_map(
            fn(array $package): string => $this->requiredTextOrNull($package['evidence_version_id'] ?? null) ?? '',
            $packages,
        ), static fn(string $id): bool => $id !== '')));
        $recordIds = array_values(array_unique(array_filter(array_map(
            fn(array $package): string => $this->requiredTextOrNull($package['evidence_record_id'] ?? null) ?? '',
            $packages,
        ), static fn(string $id): bool => $id !== '')));

        $publications = $versionIds === [] ? [] : $this->queryRows(
            "SELECT *, COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') AS org_id
             FROM evidence_publications
             WHERE evidence_version_id::text = ANY(CAST(:evidence_version_ids AS text[]))
               AND (:org_id = '' OR COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id', :org_id) = :org_id)
             ORDER BY created_at, evidence_publication_id",
            [
                ':evidence_version_ids' => $this->postgresTextArray($versionIds),
                ':org_id' => $orgId,
            ],
        );
        $retentionLocks = $recordIds === [] ? [] : $this->queryRows(
            "SELECT *, COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id') AS org_id
             FROM retention_locks
             WHERE aggregate_type = 'evidence_record'
               AND aggregate_id = ANY(CAST(:evidence_record_ids AS text[]))
               AND lock_state IN ('active', 'retained', 'locked')
               AND (:org_id = '' OR COALESCE(metadata ->> 'org_id', metadata -> 'scope' ->> 'org_id', :org_id) = :org_id)
             ORDER BY created_at, retention_lock_id",
            [
                ':evidence_record_ids' => $this->postgresTextArray($recordIds),
                ':org_id' => $orgId,
            ],
        );

        $publicationsByVersion = $this->groupRows($publications, 'evidence_version_id');
        $retentionByRecord = $this->groupRows($retentionLocks, 'aggregate_id');

        foreach ($packages as &$package) {
            $versionId = $this->requiredTextOrNull($package['evidence_version_id'] ?? null) ?? '';
            $recordId = $this->requiredTextOrNull($package['evidence_record_id'] ?? null) ?? '';
            $package['publication_records'] = $publicationsByVersion[$versionId] ?? [];
            $package['retention_locks'] = $retentionByRecord[$recordId] ?? [];
            if (!isset($package['publication_state']) && isset($package['publication_records'][0])) {
                $package['publication_state'] = $package['publication_records'][0];
            }
        }
        unset($package);

        return $packages;
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return array<string, list<array<string, mixed>>>
     */
    private function groupRows(array $rows, string $field): array
    {
        $grouped = [];
        foreach ($rows as $row) {
            $key = $this->requiredTextOrNull($row[$field] ?? null) ?? '';
            if ($key === '') {
                continue;
            }
            $grouped[$key] ??= [];
            $grouped[$key][] = $row;
        }
        return $grouped;
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

    /**
     * @param list<array<string, mixed>> $evidencePackages
     * @return list<string>
     */
    private function scopeAggregateIds(string $scopeRef, array $evidencePackages): array
    {
        $ids = [$scopeRef];
        foreach ($evidencePackages as $package) {
            foreach (['evidence_record_id', 'evidence_version_id', 'package_hash_sha256', 'manifest_hash_sha256'] as $field) {
                $value = $this->requiredTextOrNull($package[$field] ?? null);
                if ($value !== null) {
                    $ids[] = $value;
                }
            }
        }

        return array_values(array_unique(array_filter($ids, static fn(string $id): bool => $id !== '')));
    }

    private function requiredTextOrNull(mixed $value): ?string
    {
        $text = is_scalar($value) ? trim((string)$value) : '';
        return $text === '' ? null : $text;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = is_scalar($value) ? trim((string)$value) : '';
        return $text === '' ? null : $text;
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->nullableText($value);
        return $text !== null && preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    private function nullableSha256(mixed $value): ?string
    {
        $text = strtolower($this->nullableText($value) ?? '');
        return preg_match('/^[a-f0-9]{64}$/', $text) === 1 ? $text : null;
    }

    /**
     * @param array<string, mixed> $value
     */
    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    /**
     * @param list<string> $values
     */
    private function postgresTextArray(array $values): string
    {
        $escaped = array_map(
            static fn(string $value): string => '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"',
            $values,
        );
        return '{' . implode(',', $escaped) . '}';
    }
}
