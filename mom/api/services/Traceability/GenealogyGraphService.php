<?php

declare(strict_types=1);

namespace MOM\Services\Traceability;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Authoritative write/read surface for as-manufactured genealogy facts.
 */
final class GenealogyGraphService
{
    private const EDGE_FACT_TYPES = [
        'consume',
        'produce',
        'split',
        'merge',
        'rework',
        'hold',
        'release',
        'quarantine',
        'scrap',
        'supersede',
        'ship',
        'inspect',
        'measure',
    ];

    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $fact
     * @return array<string, mixed>
     */
    public function recordEdgeFact(array $fact, string $actorRef): array
    {
        $this->requireDb();

        $edgeFactType = $this->requiredToken($fact, 'edge_fact_type');
        if (!in_array($edgeFactType, self::EDGE_FACT_TYPES, true)) {
            throw new RuntimeException('unsupported_genealogy_edge_fact_type');
        }

        $fromType = $this->requiredToken($fact, 'from_object_type');
        $fromId = $this->requiredText($fact, 'from_object_id');
        $toType = $this->requiredToken($fact, 'to_object_type');
        $toId = $this->requiredText($fact, 'to_object_id');
        $sourceEventId = $this->text($fact['source_event_id'] ?? '');
        if ($sourceEventId === '') {
            $sourceEventId = 'portal-' . hash('sha256', implode('|', [$edgeFactType, $fromType, $fromId, $toType, $toId, $actorRef]));
        }
        $fieldPath = $this->text($fact['field_path'] ?? 'genealogy.' . $edgeFactType);
        $authority = $this->assertReleasedChangeAuthority($fact, $fieldPath, $fromType, $fromId, $toType, $toId);

        $metadata = is_array($fact['metadata'] ?? null) ? $fact['metadata'] : [];
        $metadata['actor_ref'] = $actorRef;
        $metadata['authority'] = 'canonical_genealogy_edge_fact';
        $metadata['change_authority'] = $authority;

        $row = $this->db->queryOne(
            "INSERT INTO genealogy_edge_facts
                (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id,
                 quantity, uom, effective_at, evidence_record_id, change_order_id, source_event_id,
                 fact_state, metadata)
             VALUES
                (:edge_fact_type, :from_object_type, :from_object_id, :to_object_type, :to_object_id,
                 :quantity, :uom, :effective_at, CAST(:evidence_record_id AS uuid), CAST(:change_order_id AS uuid),
                 :source_event_id, :fact_state, CAST(:metadata AS jsonb))
             ON CONFLICT (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id, source_event_id)
             DO UPDATE SET
                 quantity = EXCLUDED.quantity,
                 uom = EXCLUDED.uom,
                 effective_at = COALESCE(EXCLUDED.effective_at, genealogy_edge_facts.effective_at),
                 fact_state = EXCLUDED.fact_state,
                 metadata = genealogy_edge_facts.metadata || EXCLUDED.metadata
             RETURNING *",
            [
                ':edge_fact_type' => $edgeFactType,
                ':from_object_type' => $fromType,
                ':from_object_id' => $fromId,
                ':to_object_type' => $toType,
                ':to_object_id' => $toId,
                ':quantity' => isset($fact['quantity']) && is_numeric($fact['quantity']) ? (string)$fact['quantity'] : null,
                ':uom' => $this->nullableText($fact['uom'] ?? null),
                ':effective_at' => $this->nullableText($fact['effective_at'] ?? null),
                ':evidence_record_id' => $this->nullableUuid($fact['evidence_record_id'] ?? null),
                ':change_order_id' => $this->nullableUuid($authority['plm_change_order_id'] ?? $fact['change_order_id'] ?? null),
                ':source_event_id' => $sourceEventId,
                ':fact_state' => $this->text($fact['fact_state'] ?? 'active') ?: 'active',
                ':metadata' => $this->json($metadata),
            ],
        );

        $projected = $this->projectGraph($edgeFactType, $fromType, $fromId, $toType, $toId, $sourceEventId, $fact, $metadata);

        if (is_array($row)) {
            $normalized = $this->normalizeRow($row);
            $normalized['projected_graph'] = $projected;
            return $normalized;
        }

        return [
            'edge_fact_type' => $edgeFactType,
            'from_object_type' => $fromType,
            'from_object_id' => $fromId,
            'to_object_type' => $toType,
            'to_object_id' => $toId,
            'source_event_id' => $sourceEventId,
            'metadata' => $metadata,
            'projected_graph' => $projected,
        ];
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function evaluateAndPersist5M(array $request): array
    {
        $this->requireDb();

        $operationClass = $this->requiredToken($request, 'operation_class');
        $objectType = $this->requiredToken($request, 'object_type');
        $objectId = $this->requiredText($request, 'object_id');
        $context = is_array($request['context'] ?? null) ? $request['context'] : $request;

        $missing = [];
        foreach ($this->required5M($request) as $dimension => $required) {
            if (!$required) {
                continue;
            }
            if (!$this->hasContextForDimension($dimension, $context)) {
                $missing[] = $dimension;
            }
        }

        $gateState = $missing === [] ? 'complete' : 'blocked';
        $row = $this->db->queryOne(
            "INSERT INTO traceability_5m_obligations
                (operation_class, object_type, object_id, material_required, machine_required,
                 method_required, measurement_required, manpower_required, gate_state,
                 missing_context, decided_at)
             VALUES
                (:operation_class, :object_type, :object_id, :material_required, :machine_required,
                 :method_required, :measurement_required, :manpower_required, :gate_state,
                 CAST(:missing_context AS jsonb), now())
             ON CONFLICT (operation_class, object_type, object_id)
             DO UPDATE SET
                 material_required = EXCLUDED.material_required,
                 machine_required = EXCLUDED.machine_required,
                 method_required = EXCLUDED.method_required,
                 measurement_required = EXCLUDED.measurement_required,
                 manpower_required = EXCLUDED.manpower_required,
                 gate_state = EXCLUDED.gate_state,
                 missing_context = EXCLUDED.missing_context,
                 decided_at = now()
             RETURNING *",
            [
                ':operation_class' => $operationClass,
                ':object_type' => $objectType,
                ':object_id' => $objectId,
                ':material_required' => $this->boolSql($request['material_required'] ?? true),
                ':machine_required' => $this->boolSql($request['machine_required'] ?? true),
                ':method_required' => $this->boolSql($request['method_required'] ?? true),
                ':measurement_required' => $this->boolSql($request['measurement_required'] ?? true),
                ':manpower_required' => $this->boolSql($request['manpower_required'] ?? true),
                ':gate_state' => $gateState,
                ':missing_context' => $this->json($missing),
            ],
        );

        return [
            'allowed' => $gateState === 'complete',
            'gate_state' => $gateState,
            'missing_context' => $missing,
            'obligation' => is_array($row) ? $this->normalizeRow($row) : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function asManufacturedThread(string $subjectType, string $subjectId, int $limit = 200): array
    {
        $this->requireDb();
        $subjectType = $this->normalizeToken($subjectType);
        $subjectId = trim($subjectId);
        if ($subjectType === '' || $subjectId === '') {
            throw new RuntimeException('genealogy_subject_required');
        }

        $snapshotRows = $this->db->query(
            "SELECT *
             FROM as_manufactured_snapshots
             WHERE subject_type = :subject_type
               AND subject_ref = :subject_id
               AND snapshot_state = 'current'
             ORDER BY built_at DESC
             LIMIT 1",
            [
                ':subject_type' => $subjectType,
                ':subject_id' => $subjectId,
            ],
        );

        $rows = $this->db->query(
            "SELECT
                e.*,
                from_node.node_type AS from_node_type,
                from_node.node_ref AS from_node_ref,
                to_node.node_type AS to_node_type,
                to_node.node_ref AS to_node_ref
             FROM genealogy_edges e
             INNER JOIN genealogy_nodes from_node ON from_node.genealogy_node_id = e.from_node_id
             INNER JOIN genealogy_nodes to_node ON to_node.genealogy_node_id = e.to_node_id
             WHERE (from_node.node_type = :subject_type AND from_node.node_ref = :subject_id)
                OR (to_node.node_type = :subject_type AND to_node.node_ref = :subject_id)
             ORDER BY e.event_time ASC NULLS LAST, e.created_at ASC
             LIMIT :limit",
            [
                ':subject_type' => $subjectType,
                ':subject_id' => $subjectId,
                ':limit' => max(1, min(1000, $limit)),
            ],
        );

        return [
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'authority' => 'genealogy_projected_graph',
            'snapshot' => is_array($snapshotRows) && isset($snapshotRows[0]) && is_array($snapshotRows[0])
                ? $this->normalizeRow($snapshotRows[0])
                : null,
            'graph_hash_sha256' => is_array($snapshotRows) && isset($snapshotRows[0]['snapshot_hash_sha256'])
                ? (string)$snapshotRows[0]['snapshot_hash_sha256']
                : '',
            'edges' => array_map(fn(array $row): array => $this->normalizeRow($row), is_array($rows) ? $rows : []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            return [
                'slice' => 'traceability_genealogy',
                'readiness_state' => 'compatibility_only',
                'authority_mode' => 'legacy_traceability_read_model',
                'authoritative' => false,
                'fallback_only' => true,
            ];
        }

        return [
            'slice' => 'traceability_genealogy',
            'backend' => 'postgres',
            'primary_backend' => 'postgres',
            'readiness_state' => 'authoritative',
            'authority_mode' => 'canonical_genealogy_graph',
            'authoritative' => true,
            'fallback_only' => false,
            'authoritative_tables' => [
                'genealogy_edge_facts',
                'genealogy_nodes',
                'genealogy_edges',
                'as_manufactured_snapshots',
                'traceability_5m_obligations',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $fact
     * @return array<string, mixed>
     */
    private function assertReleasedChangeAuthority(
        array $fact,
        string $fieldPath,
        string $fromType,
        string $fromId,
        string $toType,
        string $toId,
    ): array {
        $changeRef = $this->text($fact['change_order_id'] ?? $fact['change_order_number'] ?? $fact['change_authority_id'] ?? '');
        if ($changeRef === '') {
            throw new RuntimeException('genealogy_change_authority_required');
        }
        if ($fieldPath === '') {
            throw new RuntimeException('genealogy_field_path_required');
        }
        if (!method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_genealogy_change_authority_store_required');
        }

        $rows = $this->db->query(
            "SELECT
                co.plm_change_order_id::text AS plm_change_order_id,
                co.change_order_number,
                co.status,
                cao.object_type,
                cao.object_id,
                cao.affected_fields,
                cao.effectivity_rule,
                eff.plm_change_effectivity_id::text AS plm_change_effectivity_id,
                eff.effectivity_scope,
                eff.effective_from,
                eff.effective_to
             FROM plm_change_orders co
             INNER JOIN plm_change_affected_objects cao
                ON cao.plm_change_order_id = co.plm_change_order_id
             INNER JOIN plm_change_effectivities eff
                ON eff.plm_change_order_id = co.plm_change_order_id
             WHERE (co.plm_change_order_id::text = :change_ref OR co.change_order_number = :change_ref)
               AND co.status = 'released'
               AND lower(cao.object_type) IN (:from_type, :to_type)
               AND cao.object_id IN (:from_id, :to_id)
               AND cao.disposition = 'accepted'
               AND :field_path = ANY(cao.affected_fields)
               AND lower(eff.object_type) IN (:from_type, :to_type)
               AND eff.object_id IN (:from_id, :to_id)
               AND eff.effective_from <= COALESCE(CAST(:effective_at AS timestamptz), now())
               AND (eff.effective_to IS NULL OR eff.effective_to > COALESCE(CAST(:effective_at AS timestamptz), now()))
             ORDER BY eff.effective_from DESC
             LIMIT 1",
            [
                ':change_ref' => $changeRef,
                ':from_type' => $fromType,
                ':to_type' => $toType,
                ':from_id' => $fromId,
                ':to_id' => $toId,
                ':field_path' => $fieldPath,
                ':effective_at' => $this->nullableText($fact['effective_at'] ?? null),
            ],
        );

        foreach (is_array($rows) ? $rows : [] as $row) {
            if (is_array($row)) {
                return $this->normalizeRow($row);
            }
        }

        throw new RuntimeException('genealogy_change_authority_not_verified');
    }

    /**
     * @param array<string, mixed> $fact
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function projectGraph(
        string $edgeFactType,
        string $fromType,
        string $fromId,
        string $toType,
        string $toId,
        string $sourceEventId,
        array $fact,
        array $metadata,
    ): array {
        $fromNode = $this->upsertNode($fromType, $fromId, $metadata);
        $toNode = $this->upsertNode($toType, $toId, $metadata);
        $edge = $this->upsertProjectedEdge(
            (string)($fromNode['genealogy_node_id'] ?? ''),
            (string)($toNode['genealogy_node_id'] ?? ''),
            $this->projectedEdgeType($edgeFactType),
            $sourceEventId,
            $fact,
            $metadata,
        );
        $snapshot = $this->upsertSnapshot($toType, $toId, [
            'source_event_id' => $sourceEventId,
            'edge_fact_type' => $edgeFactType,
            'from' => ['type' => $fromType, 'id' => $fromId],
            'to' => ['type' => $toType, 'id' => $toId],
            'metadata' => $metadata,
        ], $fact);

        return ['from_node' => $fromNode, 'to_node' => $toNode, 'edge' => $edge, 'snapshot' => $snapshot];
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function upsertNode(string $type, string $id, array $metadata): array
    {
        $row = $this->db->queryOne(
            "INSERT INTO genealogy_nodes (node_type, node_ref, canonical_label, lifecycle_state, metadata)
             VALUES (:node_type, :node_ref, :canonical_label, :lifecycle_state, CAST(:metadata AS jsonb))
             ON CONFLICT (node_type, node_ref) DO UPDATE
                SET metadata = genealogy_nodes.metadata || EXCLUDED.metadata
             RETURNING *",
            [
                ':node_type' => $this->nodeType($type),
                ':node_ref' => $id,
                ':canonical_label' => $type . ':' . $id,
                ':lifecycle_state' => 'active',
                ':metadata' => $this->json($metadata),
            ],
        );
        return is_array($row) ? $this->normalizeRow($row) : ['node_type' => $type, 'node_ref' => $id];
    }

    /**
     * @param array<string, mixed> $fact
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function upsertProjectedEdge(string $fromNodeId, string $toNodeId, string $edgeType, string $sourceEventId, array $fact, array $metadata): array
    {
        $row = $this->db->queryOne(
            "INSERT INTO genealogy_edges
                (from_node_id, to_node_id, edge_type, event_time, evidence_record_id, source_event_id, metadata)
             VALUES
                (CAST(:from_node_id AS uuid), CAST(:to_node_id AS uuid), :edge_type, CAST(:event_time AS timestamptz),
                 CAST(:evidence_record_id AS uuid), :source_event_id, CAST(:metadata AS jsonb))
             ON CONFLICT (from_node_id, to_node_id, edge_type, source_event_id) DO UPDATE
                SET metadata = genealogy_edges.metadata || EXCLUDED.metadata
             RETURNING *",
            [
                ':from_node_id' => $this->nullableUuid($fromNodeId),
                ':to_node_id' => $this->nullableUuid($toNodeId),
                ':edge_type' => $edgeType,
                ':event_time' => $this->nullableText($fact['effective_at'] ?? null),
                ':evidence_record_id' => $this->nullableUuid($fact['evidence_record_id'] ?? null),
                ':source_event_id' => $sourceEventId,
                ':metadata' => $this->json($metadata),
            ],
        );
        return is_array($row) ? $this->normalizeRow($row) : ['edge_type' => $edgeType, 'source_event_id' => $sourceEventId];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $fact
     * @return array<string, mixed>
     */
    private function upsertSnapshot(string $subjectType, string $subjectRef, array $payload, array $fact): array
    {
        $snapshotSubject = $this->snapshotSubjectType($subjectType);
        if ($snapshotSubject === '') {
            return ['snapshot_state' => 'not_applicable'];
        }
        $payloadJson = $this->json($payload);
        $hash = hash('sha256', $payloadJson);
        $row = $this->db->queryOne(
            "INSERT INTO as_manufactured_snapshots
                (subject_type, subject_ref, snapshot_state, snapshot_payload, snapshot_hash_sha256, evidence_record_id)
             VALUES
                (:subject_type, :subject_ref, 'current', CAST(:snapshot_payload AS jsonb), :snapshot_hash_sha256,
                 CAST(:evidence_record_id AS uuid))
             ON CONFLICT (subject_type, subject_ref, snapshot_hash_sha256) DO UPDATE
                SET built_at = now()
             RETURNING *",
            [
                ':subject_type' => $snapshotSubject,
                ':subject_ref' => $subjectRef,
                ':snapshot_payload' => $payloadJson,
                ':snapshot_hash_sha256' => $hash,
                ':evidence_record_id' => $this->nullableUuid($fact['evidence_record_id'] ?? null),
            ],
        );
        return is_array($row) ? $this->normalizeRow($row) : ['subject_type' => $snapshotSubject, 'subject_ref' => $subjectRef, 'snapshot_hash_sha256' => $hash];
    }

    private function projectedEdgeType(string $factType): string
    {
        return match ($factType) {
            'consume' => 'consumed',
            'produce' => 'produced',
            'rework' => 'reworked_from',
            'ship' => 'shipped_as',
            'supersede' => 'supersedes',
            'inspect', 'measure' => 'evidenced_by',
            default => 'authorized_by_change',
        };
    }

    private function nodeType(string $type): string
    {
        return match ($type) {
            'user', 'operator', 'person' => 'personnel',
            'machine' => 'equipment',
            default => in_array($type, ['job', 'work_order', 'operation', 'lot', 'serial', 'material', 'equipment', 'tool', 'personnel', 'document_revision', 'evidence_record', 'evidence_version', 'change_order', 'nonconformance', 'shipment'], true)
                ? $type
                : 'evidence_record',
        };
    }

    private function snapshotSubjectType(string $type): string
    {
        return in_array($type, ['job', 'work_order', 'lot', 'serial', 'shipment'], true) ? $type : '';
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

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_genealogy_store_required');
        }
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, bool>
     */
    private function required5M(array $request): array
    {
        return [
            'material' => $this->truthy($request['material_required'] ?? true),
            'machine' => $this->truthy($request['machine_required'] ?? true),
            'method' => $this->truthy($request['method_required'] ?? true),
            'measurement' => $this->truthy($request['measurement_required'] ?? true),
            'manpower' => $this->truthy($request['manpower_required'] ?? true),
        ];
    }

    /**
     * @param array<string, mixed> $context
     */
    private function hasContextForDimension(string $dimension, array $context): bool
    {
        $fields = match ($dimension) {
            'material' => ['material_id', 'material_lot_id', 'material_lot_ids', 'lot_id'],
            'machine' => ['machine_id', 'equipment_id', 'work_center_id'],
            'method' => ['method_id', 'routing_id', 'process_id', 'doc_revision_id', 'doc_revision_ids'],
            'measurement' => ['measurement_id', 'measurement_ids', 'inspection_id', 'inspection_result_id', 'result_value'],
            'manpower' => ['operator_id', 'personnel_id', 'user_id'],
            default => [],
        };

        foreach ($fields as $field) {
            $value = $context[$field] ?? null;
            if (is_array($value) && $value !== []) {
                return true;
            }
            if (is_scalar($value) && trim((string)$value) !== '') {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['metadata', 'missing_context'] as $field) {
            if (is_string($row[$field] ?? null)) {
                $decoded = json_decode((string)$row[$field], true);
                if (is_array($decoded)) {
                    $row[$field] = $decoded;
                }
            }
        }
        return $row;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredToken(array $data, string $key): string
    {
        $value = $this->normalizeToken($data[$key] ?? '');
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredText(array $data, string $key): string
    {
        $value = $this->text($data[$key] ?? '');
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
    }

    private function normalizeToken(mixed $value): string
    {
        $value = strtolower($this->text($value));
        $value = preg_replace('/[^a-z0-9_:-]+/', '_', $value) ?? '';
        return trim($value, '_');
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

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }

    private function boolSql(mixed $value): string
    {
        return $this->truthy($value) ? 'true' : 'false';
    }

    /**
     * @param mixed $value
     */
    private function json($value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }
}
