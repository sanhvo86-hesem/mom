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

    private const MAX_GENEALOGY_DEPTH = 50;

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
        if (method_exists($this->db, 'transactional')) {
            return $this->db->transactional(fn(): array => $this->recordEdgeFactInsideTransaction($fact, $actorRef));
        }

        return $this->recordEdgeFactInsideTransaction($fact, $actorRef);
    }

    /**
     * @param array<string, mixed> $fact
     * @return array<string, mixed>
     */
    private function recordEdgeFactInsideTransaction(array $fact, string $actorRef): array
    {
        $edgeFactType = $this->requiredToken($fact, 'edge_fact_type');
        if (!in_array($edgeFactType, self::EDGE_FACT_TYPES, true)) {
            throw new RuntimeException('unsupported_genealogy_edge_fact_type');
        }

        $fromType = $this->requiredToken($fact, 'from_object_type');
        $fromId = $this->requiredText($fact, 'from_object_id');
        $toType = $this->requiredToken($fact, 'to_object_type');
        $toId = $this->requiredText($fact, 'to_object_id');
        $this->nodeType($fromType);
        $this->nodeType($toType);
        $scope = $this->requireTrustedScope($fact);

        // MES-R6-004 FIX: Cycle detection
        if ($fromId === $toId) {
            throw new RuntimeException('genealogy_self_reference_not_allowed');
        }

        // Check if reverse edge already exists
        $reverseEdgeExists = $this->db->queryOne(
            "SELECT 1 FROM genealogy_edge_facts gef
             WHERE gef.edge_fact_type = :edge_fact_type
               AND gef.from_object_type = :to_object_type
               AND gef.from_object_id = :to_object_id
               AND gef.to_object_type = :from_object_type
               AND gef.to_object_id = :from_object_id
               " . $this->scopeEqualitySql('gef') . "
             LIMIT 1",
            [
                ':edge_fact_type' => $edgeFactType,
                ':to_object_type' => $toType,
                ':to_object_id' => $toId,
                ':from_object_type' => $fromType,
                ':from_object_id' => $fromId,
            ] + $this->scopeEqualityParams($scope)
        );

        if ($reverseEdgeExists !== null) {
            throw new RuntimeException('genealogy_cycle_detected');
        }

        // MES-004 FIX: Transitive cycle detection using recursive CTE
        $cyclePath = $this->db->queryOne(
            "WITH RECURSIVE path AS (
                SELECT from_object_id, to_object_id,
                       org_company_code, org_legal_entity_code, org_plant_id, org_site_id,
                       1 as depth
                FROM genealogy_edge_facts e
                WHERE e.from_object_id = :to_id
                  " . $this->scopeEqualitySql('e') . "
                UNION ALL
                SELECT p.from_object_id, e.to_object_id,
                       e.org_company_code, e.org_legal_entity_code, e.org_plant_id, e.org_site_id,
                       p.depth + 1
                FROM path p
                JOIN genealogy_edge_facts e
                  ON e.from_object_id = p.to_object_id
                 AND COALESCE(e.org_company_code, '') = COALESCE(p.org_company_code, '')
                 AND COALESCE(e.org_legal_entity_code, '') = COALESCE(p.org_legal_entity_code, '')
                 AND COALESCE(e.org_plant_id, '') = COALESCE(p.org_plant_id, '')
                 AND COALESCE(e.org_site_id, '') = COALESCE(p.org_site_id, '')
	                WHERE p.depth < " . self::MAX_GENEALOGY_DEPTH . "
            )
            SELECT 1 FROM path WHERE to_object_id = :from_id LIMIT 1",
            [':to_id' => $toId, ':from_id' => $fromId] + $this->scopeEqualityParams($scope)
        );

        if ($cyclePath !== null) {
            throw new RuntimeException('genealogy_cycle_detected');
        }
        $sourceEventId = $this->text($fact['source_event_id'] ?? '');
        $changeRef = $this->text($fact['change_order_id'] ?? $fact['change_order_number'] ?? $fact['change_authority_id'] ?? '');
        $factFingerprint = hash('sha256', $this->json([
            'edge_fact_type' => $edgeFactType,
            'from_object_type' => $fromType,
            'from_object_id' => $fromId,
            'to_object_type' => $toType,
            'to_object_id' => $toId,
            'change_authority_ref' => $changeRef,
            'quantity' => isset($fact['quantity']) && is_numeric($fact['quantity']) ? (string)$fact['quantity'] : null,
            'uom' => $this->nullableText($fact['uom'] ?? null),
            'effective_at' => $this->nullableText($fact['effective_at'] ?? null),
            'evidence_record_id' => $this->nullableUuid($fact['evidence_record_id'] ?? null),
            'fact_state' => $this->text($fact['fact_state'] ?? 'active') ?: 'active',
            'scope' => $scope,
        ]));
        if ($sourceEventId === '') {
            $sourceEventId = 'portal-' . hash('sha256', $factFingerprint . '|' . $actorRef);
        }
        $fieldPath = $this->text($fact['field_path'] ?? 'genealogy.' . $edgeFactType);
        $edgeFactId = $this->text($fact['edge_fact_id'] ?? '');
        if ($edgeFactId === '') {
            $edgeFactId = hash('sha256', $factFingerprint);
        }
        $authority = $this->assertReleasedChangeAuthority($fact, $fieldPath, $fromType, $fromId, $toType, $toId, $edgeFactId);

        $metadata = is_array($fact['metadata'] ?? null) ? $fact['metadata'] : [];
        $metadata['actor_ref'] = $actorRef;
        $metadata['authority'] = 'canonical_genealogy_edge_fact';
        $metadata['change_authority'] = $authority;
        $metadata['edge_fact_id'] = $edgeFactId;
        $metadata['fact_fingerprint_sha256'] = $factFingerprint;
        $metadata['scope'] = $scope;

        $row = $this->db->queryOne(
            "INSERT INTO genealogy_edge_facts
                (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id,
                 quantity, uom, effective_at, evidence_record_id, change_order_id, source_event_id,
                 fact_state, metadata, org_company_code, org_legal_entity_code, org_plant_id, org_site_id)
             VALUES
                (:edge_fact_type, :from_object_type, :from_object_id, :to_object_type, :to_object_id,
                 :quantity, :uom, :effective_at, CAST(:evidence_record_id AS uuid), CAST(:change_order_id AS uuid),
                 :source_event_id, :fact_state, CAST(:metadata AS jsonb),
                 :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id)
             ON CONFLICT (
                edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id, source_event_id,
                (COALESCE(org_company_code, '')), (COALESCE(org_legal_entity_code, '')),
                (COALESCE(org_plant_id, '')), (COALESCE(org_site_id, ''))
             )
             DO NOTHING
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
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
            ],
        );

        if (!is_array($row)) {
            $row = $this->db->queryOne(
                "SELECT *
                 FROM genealogy_edge_facts
                 WHERE edge_fact_type = :edge_fact_type
                   AND from_object_type = :from_object_type
                   AND from_object_id = :from_object_id
                   AND to_object_type = :to_object_type
                   AND to_object_id = :to_object_id
                   AND source_event_id = :source_event_id
                   " . $this->scopeEqualitySql('genealogy_edge_facts') . "
                 LIMIT 1",
                [
                    ':edge_fact_type' => $edgeFactType,
                    ':from_object_type' => $fromType,
                    ':from_object_id' => $fromId,
                    ':to_object_type' => $toType,
                    ':to_object_id' => $toId,
                    ':source_event_id' => $sourceEventId,
                ] + $this->scopeEqualityParams($scope),
            );
            $this->assertEdgeFactReplayEquivalent(is_array($row) ? $row : [], $factFingerprint);
        }

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
        $scope = $this->requireTrustedScope($request);
        $context = is_array($request['context'] ?? null) ? $request['context'] : $request;
        $required5M = $this->required5M($request);

        $missing = [];
        foreach ($required5M as $dimension => $required) {
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
                 missing_context, decided_at, org_company_code, org_legal_entity_code, org_plant_id, org_site_id)
             VALUES
                (:operation_class, :object_type, :object_id, :material_required, :machine_required,
                 :method_required, :measurement_required, :manpower_required, :gate_state,
                CAST(:missing_context AS jsonb), now(), :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id)
             ON CONFLICT (
                operation_class, object_type, object_id,
                (COALESCE(org_company_code, '')), (COALESCE(org_legal_entity_code, '')),
                (COALESCE(org_plant_id, '')), (COALESCE(org_site_id, ''))
             )
             DO UPDATE SET
                 material_required = EXCLUDED.material_required,
                 machine_required = EXCLUDED.machine_required,
                 method_required = EXCLUDED.method_required,
                 measurement_required = EXCLUDED.measurement_required,
                 manpower_required = EXCLUDED.manpower_required,
                 gate_state = EXCLUDED.gate_state,
                 missing_context = EXCLUDED.missing_context,
                 decided_at = now(),
                 org_company_code = EXCLUDED.org_company_code,
                 org_legal_entity_code = EXCLUDED.org_legal_entity_code,
                 org_plant_id = EXCLUDED.org_plant_id,
                 org_site_id = EXCLUDED.org_site_id
             RETURNING *",
            [
                ':operation_class' => $operationClass,
                ':object_type' => $objectType,
                ':object_id' => $objectId,
                ':material_required' => $this->boolSql($required5M['material']),
                ':machine_required' => $this->boolSql($required5M['machine']),
                ':method_required' => $this->boolSql($required5M['method']),
                ':measurement_required' => $this->boolSql($required5M['measurement']),
                ':manpower_required' => $this->boolSql($required5M['manpower']),
                ':gate_state' => $gateState,
                ':missing_context' => $this->json($missing),
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
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
    /**
     * @param array<string, string> $scope
     * @return array<string, mixed>
     */
    public function asManufacturedThread(string $subjectType, string $subjectId, int $limit = 200, array $scope = []): array
    {
        $this->requireDb();
        $subjectType = $this->normalizeToken($subjectType);
        $subjectId = trim($subjectId);
        if ($subjectType === '' || $subjectId === '') {
            throw new RuntimeException('genealogy_subject_required');
        }
        $subjectType = $this->nodeType($subjectType);

        $scope = $this->requireReadScope($scope);
        $limit = max(1, min(1000, $limit));
        $scopeSql = $this->scopeSql('s', $scope);
        $snapshotRows = $this->db->query(
            "SELECT *
             FROM as_manufactured_snapshots s
             WHERE subject_type = :subject_type
               AND subject_ref = :subject_id
               AND snapshot_state = 'current'
               {$scopeSql}
             ORDER BY built_at DESC
             LIMIT 1",
            [
                ':subject_type' => $subjectType,
                ':subject_id' => $subjectId,
            ] + $this->scopeParams($scope),
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
             WHERE ((from_node.node_type = :subject_type AND from_node.node_ref = :subject_id)
                OR (to_node.node_type = :subject_type AND to_node.node_ref = :subject_id)
                )
               " . $this->scopeSql('e', $scope) . "
             ORDER BY e.event_time ASC NULLS LAST, e.created_at ASC
             LIMIT :limit",
            [
                ':subject_type' => $subjectType,
                ':subject_id' => $subjectId,
                ':limit' => $limit + 1,
            ] + $this->scopeParams($scope),
        );
        $edgeRows = is_array($rows) ? array_values($rows) : [];
        $truncated = count($edgeRows) > $limit;
        if ($truncated) {
            $edgeRows = array_slice($edgeRows, 0, $limit);
        }

        return [
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'authority' => 'genealogy_projected_graph',
            'limit' => $limit,
            'complete' => !$truncated,
            'truncated' => $truncated,
            'snapshot' => is_array($snapshotRows) && isset($snapshotRows[0]) && is_array($snapshotRows[0])
                ? $this->normalizeRow($snapshotRows[0])
                : null,
            'graph_hash_sha256' => is_array($snapshotRows) && isset($snapshotRows[0]['snapshot_hash_sha256'])
                ? (string)$snapshotRows[0]['snapshot_hash_sha256']
                : '',
            'edge_count' => count($edgeRows),
            'edges' => array_map(fn(array $row): array => $this->normalizeRow($row), $edgeRows),
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
        string $edgeFactId,
    ): array {
        $changeRef = $this->text($fact['change_order_id'] ?? $fact['change_order_number'] ?? $fact['change_authority_id'] ?? '');
        if ($changeRef === '') {
            throw new RuntimeException('genealogy_change_authority_required');
        }
        if ($fieldPath === '') {
            throw new RuntimeException('genealogy_field_path_required');
        }
        $requestedEffect = $this->genealogyRequestedEffect($fact);
        if (!method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_genealogy_change_authority_store_required');
        }

        $rows = $this->db->query(
            "SELECT
                co.plm_change_order_id::text AS plm_change_order_id,
                co.change_order_number,
                co.status,
                from_ao.object_type AS from_object_type,
                from_ao.object_id AS from_object_id,
                from_ao.affected_fields AS from_affected_fields,
                to_ao.object_type AS to_object_type,
                to_ao.object_id AS to_object_id,
                to_ao.affected_fields AS to_affected_fields,
                ro.object_type AS resulting_object_type,
                ro.object_id AS resulting_object_id,
                from_eff.plm_change_effectivity_id::text AS from_effectivity_id,
                from_eff.effectivity_scope AS from_effectivity_scope,
                from_eff.effective_from AS from_effective_from,
                from_eff.effective_to AS from_effective_to,
                to_eff.plm_change_effectivity_id::text AS to_effectivity_id,
                to_eff.effectivity_scope AS to_effectivity_scope,
                to_eff.effective_from AS to_effective_from,
                to_eff.effective_to AS to_effective_to
             FROM plm_change_orders co
             INNER JOIN plm_change_affected_objects from_ao
                ON from_ao.plm_change_order_id = co.plm_change_order_id
               AND lower(from_ao.object_type) = :from_type
               AND from_ao.object_id = :from_id
               AND from_ao.requested_effect = :requested_effect
               AND from_ao.disposition = 'accepted'
             INNER JOIN plm_change_affected_objects to_ao
                ON to_ao.plm_change_order_id = co.plm_change_order_id
               AND lower(to_ao.object_type) = :to_type
               AND to_ao.object_id = :to_id
               AND to_ao.requested_effect = :requested_effect
               AND to_ao.disposition = 'accepted'
             INNER JOIN plm_change_resulting_objects ro
                ON ro.plm_change_order_id = co.plm_change_order_id
               AND lower(ro.object_type) = 'genealogy_edge_fact'
               AND ro.object_id = :edge_fact_id
             INNER JOIN plm_change_effectivities from_eff
                ON from_eff.plm_change_order_id = co.plm_change_order_id
               AND lower(from_eff.object_type) = :from_type
               AND from_eff.object_id = :from_id
             INNER JOIN plm_change_effectivities to_eff
                ON to_eff.plm_change_order_id = co.plm_change_order_id
               AND lower(to_eff.object_type) = :to_type
               AND to_eff.object_id = :to_id
             WHERE (co.plm_change_order_id::text = :change_ref OR co.change_order_number = :change_ref)
               AND co.status = 'released'
               AND :field_path = ANY(from_ao.affected_fields)
               AND :field_path = ANY(to_ao.affected_fields)
               AND from_eff.effective_from <= COALESCE(CAST(:effective_at AS timestamptz), now())
               AND (from_eff.effective_to IS NULL OR from_eff.effective_to > COALESCE(CAST(:effective_at AS timestamptz), now()))
               AND to_eff.effective_from <= COALESCE(CAST(:effective_at AS timestamptz), now())
               AND (to_eff.effective_to IS NULL OR to_eff.effective_to > COALESCE(CAST(:effective_at AS timestamptz), now()))
             ORDER BY from_eff.effective_from DESC, to_eff.effective_from DESC
             LIMIT 1",
            [
                ':change_ref' => $changeRef,
                ':from_type' => $fromType,
                ':to_type' => $toType,
                ':from_id' => $fromId,
                ':to_id' => $toId,
                ':edge_fact_id' => $edgeFactId,
                ':field_path' => $fieldPath,
                ':requested_effect' => $requestedEffect,
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
     */
    private function genealogyRequestedEffect(array $fact): string
    {
        $effect = strtolower($this->text($fact['requested_effect'] ?? $fact['change_effect'] ?? 'metadata_update'));
        if (!in_array($effect, ['create', 'revise', 'release', 'supersede', 'withdraw', 'obsolete', 'replace', 'amend', 'deviation', 'metadata_update', 'training_update', 'publication_update'], true)) {
            throw new RuntimeException('invalid_genealogy_requested_effect');
        }
        return $effect;
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
        $scope = is_array($metadata['scope'] ?? null) ? $metadata['scope'] : [];
        $fromNode = $this->upsertNode($fromType, $fromId, $metadata, $scope);
        $toNode = $this->upsertNode($toType, $toId, $metadata, $scope);
        $edge = $this->upsertProjectedEdge(
            (string)($fromNode['genealogy_node_id'] ?? ''),
            (string)($toNode['genealogy_node_id'] ?? ''),
            $this->projectedEdgeType($edgeFactType),
            $sourceEventId,
            $fact,
            $metadata,
            $scope,
        );
        $snapshot = $this->upsertSnapshot($toType, $toId, [
            'source_event_id' => $sourceEventId,
            'edge_fact_type' => $edgeFactType,
            'from' => ['type' => $fromType, 'id' => $fromId],
            'to' => ['type' => $toType, 'id' => $toId],
            'metadata' => $metadata,
        ], $fact, $scope);

        return ['from_node' => $fromNode, 'to_node' => $toNode, 'edge' => $edge, 'snapshot' => $snapshot];
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function upsertNode(string $type, string $id, array $metadata, array $scope): array
    {
        $row = $this->db->queryOne(
            "INSERT INTO genealogy_nodes
                (node_type, node_ref, canonical_label, lifecycle_state, metadata,
                 org_company_code, org_legal_entity_code, org_plant_id, org_site_id)
             VALUES
                (:node_type, :node_ref, :canonical_label, :lifecycle_state, CAST(:metadata AS jsonb),
                 :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id)
             ON CONFLICT (
                node_type, node_ref,
                (COALESCE(org_company_code, '')), (COALESCE(org_legal_entity_code, '')),
                (COALESCE(org_plant_id, '')), (COALESCE(org_site_id, ''))
             ) DO UPDATE
                SET metadata = genealogy_nodes.metadata || EXCLUDED.metadata
             RETURNING *",
            [
                ':node_type' => $this->nodeType($type),
                ':node_ref' => $id,
                ':canonical_label' => $type . ':' . $id,
                ':lifecycle_state' => 'active',
                ':metadata' => $this->json($metadata),
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
            ],
        );
        return is_array($row) ? $this->normalizeRow($row) : ['node_type' => $type, 'node_ref' => $id];
    }

    /**
     * @param array<string, mixed> $fact
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function upsertProjectedEdge(string $fromNodeId, string $toNodeId, string $edgeType, string $sourceEventId, array $fact, array $metadata, array $scope): array
    {
        $row = $this->db->queryOne(
            "INSERT INTO genealogy_edges
                (from_node_id, to_node_id, edge_type, event_time, evidence_record_id, source_event_id, metadata,
                 org_company_code, org_legal_entity_code, org_plant_id, org_site_id)
             VALUES
                (CAST(:from_node_id AS uuid), CAST(:to_node_id AS uuid), :edge_type, CAST(:event_time AS timestamptz),
                 CAST(:evidence_record_id AS uuid), :source_event_id, CAST(:metadata AS jsonb),
                 :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id)
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
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
            ],
        );
        return is_array($row) ? $this->normalizeRow($row) : ['edge_type' => $edgeType, 'source_event_id' => $sourceEventId];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $fact
     * @return array<string, mixed>
     */
    private function upsertSnapshot(string $subjectType, string $subjectRef, array $payload, array $fact, array $scope): array
    {
        $snapshotSubject = $this->snapshotSubjectType($subjectType);
        if ($snapshotSubject === '') {
            return ['snapshot_state' => 'not_applicable'];
        }
        $payloadJson = $this->json($payload);
        $hash = hash('sha256', $payloadJson);
        $this->db->queryOne(
            "UPDATE as_manufactured_snapshots
             SET snapshot_state = 'superseded',
                 built_at = now(),
                 row_version = row_version + 1
             WHERE subject_type = :subject_type
               AND subject_ref = :subject_ref
               AND COALESCE(org_company_code, '') = COALESCE(:org_company_code, '')
               AND COALESCE(org_legal_entity_code, '') = COALESCE(:org_legal_entity_code, '')
               AND COALESCE(org_plant_id, '') = COALESCE(:org_plant_id, '')
               AND COALESCE(org_site_id, '') = COALESCE(:org_site_id, '')
               AND snapshot_state = 'current'
               AND snapshot_hash_sha256 <> :snapshot_hash_sha256
             RETURNING as_manufactured_snapshot_id",
            [
                ':subject_type' => $snapshotSubject,
                ':subject_ref' => $subjectRef,
                ':snapshot_hash_sha256' => $hash,
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
            ],
        );
        $row = $this->db->queryOne(
            "INSERT INTO as_manufactured_snapshots
                (subject_type, subject_ref, snapshot_state, snapshot_payload, snapshot_hash_sha256, evidence_record_id,
                 org_company_code, org_legal_entity_code, org_plant_id, org_site_id)
             VALUES
                (:subject_type, :subject_ref, 'current', CAST(:snapshot_payload AS jsonb), :snapshot_hash_sha256,
                 CAST(:evidence_record_id AS uuid),
                 :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id)
             ON CONFLICT (
                subject_type, subject_ref, snapshot_hash_sha256,
                (COALESCE(org_company_code, '')), (COALESCE(org_legal_entity_code, '')),
                (COALESCE(org_plant_id, '')), (COALESCE(org_site_id, ''))
             ) DO UPDATE
                SET built_at = now()
             RETURNING *",
            [
                ':subject_type' => $snapshotSubject,
                ':subject_ref' => $subjectRef,
                ':snapshot_payload' => $payloadJson,
                ':snapshot_hash_sha256' => $hash,
                ':evidence_record_id' => $this->nullableUuid($fact['evidence_record_id'] ?? null),
                ':org_company_code' => $scope['org_company_code'] ?? null,
                ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
                ':org_plant_id' => $scope['org_plant_id'] ?? null,
                ':org_site_id' => $scope['org_site_id'] ?? null,
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

    /**
     * @param array<string, mixed> $row
     */
    private function assertEdgeFactReplayEquivalent(array $row, string $factFingerprint): void
    {
        if ($row === []) {
            throw new RuntimeException('genealogy_edge_fact_replay_not_found');
        }
        $metadata = $row['metadata'] ?? [];
        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : [];
        }
        $recorded = is_array($metadata) ? $this->text($metadata['fact_fingerprint_sha256'] ?? '') : '';
        if ($recorded === '') {
            throw new RuntimeException('genealogy_edge_fact_fingerprint_required_for_replay');
        }
        if (!hash_equals($recorded, $factFingerprint)) {
            throw new RuntimeException('genealogy_edge_fact_idempotency_conflict');
        }
    }

    /**
     * @param array<string, mixed> $fact
     * @return array<string, string>
     */
    private function trustedScope(array $fact): array
    {
        $scope = is_array($fact['scope'] ?? null) ? $fact['scope'] : [];
        $normalized = [];
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $value = $this->text($scope[$field] ?? $fact[$field] ?? '');
            if ($value !== '') {
                $normalized[$field] = $value;
            }
        }
        return $normalized;
    }

    /**
     * @param array<string, mixed> $fact
     * @return array<string, string>
     */
    private function requireTrustedScope(array $fact): array
    {
        return $this->requireCanonicalPartitionScope($this->trustedScope($fact));
    }

    /**
     * @param array<string, string> $scope
     * @return array<string, string>
     */
    private function requireReadScope(array $scope): array
    {
        return $this->requireCanonicalPartitionScope($scope);
    }

    /**
     * @param array<string, string> $scope
     * @return array<string, string>
     */
    private function requireCanonicalPartitionScope(array $scope): array
    {
        if (($scope['org_site_id'] ?? '') !== '' || ($scope['org_plant_id'] ?? '') !== '') {
            return $scope;
        }

        throw new RuntimeException('genealogy_partition_scope_required');
    }

    /**
     * @param array<string, string> $scope
     */
    private function scopeSql(string $alias, array $scope): string
    {
        $clauses = [];
        foreach (['org_plant_id', 'org_company_code', 'org_legal_entity_code', 'org_site_id'] as $field) {
            if (($scope[$field] ?? '') !== '') {
                $clauses[] = $alias . '.' . $field . ' = :' . $field;
            }
        }
        return $clauses === [] ? '' : ' AND ' . implode(' AND ', $clauses);
    }

    private function scopeEqualitySql(string $alias): string
    {
        $prefix = trim($alias) !== '' ? trim($alias) . '.' : '';
        return " AND COALESCE({$prefix}org_company_code, '') = COALESCE(:org_company_code, '')
                 AND COALESCE({$prefix}org_legal_entity_code, '') = COALESCE(:org_legal_entity_code, '')
                 AND COALESCE({$prefix}org_plant_id, '') = COALESCE(:org_plant_id, '')
                 AND COALESCE({$prefix}org_site_id, '') = COALESCE(:org_site_id, '')";
    }

    /**
     * @param array<string, string> $scope
     * @return array<string, string|null>
     */
    private function scopeEqualityParams(array $scope): array
    {
        return [
            ':org_company_code' => $scope['org_company_code'] ?? null,
            ':org_legal_entity_code' => $scope['org_legal_entity_code'] ?? null,
            ':org_plant_id' => $scope['org_plant_id'] ?? null,
            ':org_site_id' => $scope['org_site_id'] ?? null,
        ];
    }

    /**
     * @param array<string, string> $scope
     * @return array<string, string>
     */
    private function scopeParams(array $scope): array
    {
        $params = [];
        foreach (['org_plant_id', 'org_company_code', 'org_legal_entity_code', 'org_site_id'] as $field) {
            if (($scope[$field] ?? '') !== '') {
                $params[':' . $field] = $scope[$field];
            }
        }
        return $params;
    }

    private function nodeType(string $type): string
    {
        $normalized = match ($type) {
            'user', 'operator', 'person' => 'personnel',
            'machine', 'asset' => 'equipment',
            'route' => 'routing',
            'fixture', 'gauge' => 'tool',
            default => $type,
        };

        $allowed = [
            'job',
            'work_order',
            'job_order',
            'operation',
            'work_center',
            'lot',
            'batch',
            'serial',
            'material',
            'equipment',
            'tool',
            'personnel',
            'method',
            'measurement',
            'process',
            'routing',
            'setup_sheet',
            'inspection_plan',
            'inspection_result',
            'nc_program',
            'cnc_program',
            'document_revision',
            'form_template',
            'form_schema',
            'evidence_record',
            'evidence_version',
            'change_request',
            'change_order',
            'nonconformance',
            'deviation',
            'capa',
            'shipment',
            'supplier_lot',
            'customer_order',
        ];

        if (!in_array($normalized, $allowed, true)) {
            throw new RuntimeException('unsupported_genealogy_node_type');
        }

        return $normalized;
    }

    private function snapshotSubjectType(string $type): string
    {
        return $this->nodeType($type);
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
        $policy = $this->loadPersisted5MPolicy($request);
        if ($policy !== []) {
            return [
                'material' => $this->truthy($policy['material_required'] ?? true),
                'machine' => $this->truthy($policy['machine_required'] ?? true),
                'method' => $this->truthy($policy['method_required'] ?? true),
                'measurement' => $this->truthy($policy['measurement_required'] ?? true),
                'manpower' => $this->truthy($policy['manpower_required'] ?? true),
            ];
        }

        // Caller-supplied *_required booleans are capture metadata only. They
        // cannot weaken the 5M obligation unless a governed policy row says so.
        return [
            'material' => true,
            'machine' => true,
            'method' => true,
            'measurement' => true,
            'manpower' => true,
        ];
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    private function loadPersisted5MPolicy(array $request): array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            return [];
        }

        try {
            $row = $this->db->queryOne(
                "SELECT material_required, machine_required, method_required, measurement_required, manpower_required,
                        policy_source, policy_state, effective_from, effective_to
                 FROM traceability_5m_policy_rules
                 WHERE operation_class = :operation_class
                   AND object_type = :object_type
                   AND (object_id = :object_id OR object_id = '*')
                   AND policy_state = 'active'
                   AND effective_from <= COALESCE(CAST(:effective_at AS timestamptz), now())
                   AND (effective_to IS NULL OR effective_to > COALESCE(CAST(:effective_at AS timestamptz), now()))
                 ORDER BY object_id DESC, effective_from DESC
                 LIMIT 1",
                [
                    ':operation_class' => $this->requiredToken($request, 'operation_class'),
                    ':object_type' => $this->requiredToken($request, 'object_type'),
                    ':object_id' => $this->requiredText($request, 'object_id'),
                    ':effective_at' => $this->nullableText($request['effective_at'] ?? null),
                ],
            );
        } catch (\Throwable) {
            return [];
        }

        return is_array($row) ? $row : [];
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
