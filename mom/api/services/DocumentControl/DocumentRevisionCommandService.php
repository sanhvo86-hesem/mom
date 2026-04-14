<?php

declare(strict_types=1);

namespace MOM\Services\DocumentControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Canonical document-control writer for doc_* tables. Legacy document files
 * may remain carriers/read compatibility, but release authority is record data.
 */
final class DocumentRevisionCommandService
{
    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createRevision(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $lifecycleState = $this->documentState($input['lifecycle_state'] ?? 'draft');
        $sourceChangeOrderId = $this->nullableUuid($input['source_change_order_id'] ?? $input['change_order_id'] ?? null);
        $manifestHash = $this->nullableSha256($input['manifest_hash_sha256'] ?? null);
        if (in_array($lifecycleState, ['released', 'superseded', 'obsolete', 'withdrawn'], true) && $sourceChangeOrderId === null) {
            throw new RuntimeException('released_document_change_order_required');
        }
        if (in_array($lifecycleState, ['released', 'superseded', 'obsolete', 'withdrawn'], true) && $manifestHash === null) {
            throw new RuntimeException('document_revision_manifest_hash_required');
        }
        if ($lifecycleState === 'released'
            && $this->nullableUuid($input['release_signature_event_id'] ?? $input['signature_event_id'] ?? null) === null
            && $this->nullableText($input['controlled_import_receipt_id'] ?? null) === null
        ) {
            throw new RuntimeException('document_release_signature_required');
        }

        $family = $db->queryOne(
            "WITH inserted AS (
                INSERT INTO doc_families
                    (doc_code, doc_type, title, process_area, source_system, source_record_id, metadata)
                VALUES
                    (:doc_code, :doc_type, :title, :process_area, 'mom', :source_record_id, CAST(:metadata AS jsonb))
                ON CONFLICT (doc_code) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM doc_families WHERE doc_code = :doc_code
             LIMIT 1",
            [
                ':doc_code' => $this->requiredText($input, 'doc_code'),
                ':doc_type' => $this->docType($input['doc_type'] ?? 'OTHER'),
                ':title' => $this->requiredText($input, 'title'),
                ':process_area' => $this->nullableText($input['process_area'] ?? null),
                ':source_record_id' => $this->nullableText($input['source_record_id'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'DocumentRevisionCommandService',
                    'actor_ref' => $actorRef,
                ] + (is_array($input['family_metadata'] ?? null) ? $input['family_metadata'] : [])),
            ],
        );
        if (!is_array($family) || $this->text($family['doc_family_id'] ?? '') === '') {
            throw new RuntimeException('doc_family_persistence_failed');
        }
        $this->assertFamilyReplayEquivalent($family, [
            'doc_code' => $this->requiredText($input, 'doc_code'),
            'doc_type' => $this->docType($input['doc_type'] ?? 'OTHER'),
            'title' => $this->requiredText($input, 'title'),
        ]);

        if (in_array($lifecycleState, ['released', 'superseded', 'obsolete', 'withdrawn'], true)) {
            $this->assertReleasedDocumentChangeAuthority(
                $db,
                $sourceChangeOrderId,
                ['document_family', 'doc_family', 'document'],
                [(string)$family['doc_family_id'], $this->requiredText($input, 'doc_code')],
                'lifecycle_state',
                $this->documentChangeEffect($lifecycleState),
                $input,
            );
        }

        $revision = $db->queryOne(
            "WITH inserted AS (
                INSERT INTO doc_revisions
                    (doc_family_id, revision_label, revision_sequence, lifecycle_state, source_change_order_id,
                     canonical_payload, readable_snapshot_uri, manifest_hash_sha256, released_at, idempotency_key, metadata)
                VALUES
                    (CAST(:doc_family_id AS uuid), :revision_label, :revision_sequence, :lifecycle_state,
                     CAST(:source_change_order_id AS uuid), CAST(:canonical_payload AS jsonb), :readable_snapshot_uri,
                     :manifest_hash_sha256, CAST(:released_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (doc_family_id, revision_label) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM doc_revisions
              WHERE doc_family_id = CAST(:doc_family_id AS uuid)
                AND revision_label = :revision_label
             LIMIT 1",
            [
                ':doc_family_id' => (string)$family['doc_family_id'],
                ':revision_label' => $this->requiredText($input, 'revision_label'),
                ':revision_sequence' => max(1, (int)($input['revision_sequence'] ?? 1)),
                ':lifecycle_state' => $lifecycleState,
                ':source_change_order_id' => $sourceChangeOrderId,
                ':canonical_payload' => $this->json($input['canonical_payload'] ?? []),
                ':readable_snapshot_uri' => $this->nullableText($input['readable_snapshot_uri'] ?? null),
                ':manifest_hash_sha256' => $manifestHash,
                ':released_at' => $lifecycleState === 'released' ? ($this->nullableText($input['released_at'] ?? null) ?? gmdate('c')) : null,
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'DocumentRevisionCommandService',
                    'actor_ref' => $actorRef,
                    'legacy_file_role' => 'carrier_not_authority',
                    'release_signature_event_id' => $this->nullableUuid($input['release_signature_event_id'] ?? $input['signature_event_id'] ?? null),
                    'controlled_import_receipt_id' => $this->nullableText($input['controlled_import_receipt_id'] ?? null),
                ] + (is_array($input['revision_metadata'] ?? null) ? $input['revision_metadata'] : [])),
            ],
        );
        if (!is_array($revision) || $this->text($revision['doc_revision_id'] ?? '') === '') {
            throw new RuntimeException('doc_revision_persistence_failed');
        }
        $this->assertRevisionReplayEquivalent($revision, [
            'doc_family_id' => (string)$family['doc_family_id'],
            'revision_label' => $this->requiredText($input, 'revision_label'),
            'revision_sequence' => (string)max(1, (int)($input['revision_sequence'] ?? 1)),
            'lifecycle_state' => $lifecycleState,
            'source_change_order_id' => $sourceChangeOrderId,
            'manifest_hash_sha256' => $manifestHash,
        ]);

        return [
            'authority' => 'canonical_document_control',
            'legacy_document_role' => 'compatibility_read_only_not_source_of_truth',
            'doc_family' => $family,
            'doc_revision' => $revision,
            'doc_effectivities' => $this->persistEffectivities($db, (string)$revision['doc_revision_id'], $input, $sourceChangeOrderId),
            'doc_distributions' => $this->persistDistributions($db, (string)$revision['doc_revision_id'], $input),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function acknowledgeRead(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $revisionId = $this->requiredUuid($input, 'doc_revision_id');
        $audienceUserId = $this->nullableUuid($input['audience_user_id'] ?? $input['user_id'] ?? null);
        $effectiveActor = $this->nullableText($input['actor_ref'] ?? $actorRef);
        if ($audienceUserId === null && $effectiveActor === null) {
            throw new RuntimeException('document_read_ack_actor_required');
        }

        $ackHash = $this->nullableSha256($input['acknowledgement_hash_sha256'] ?? null)
            ?? hash('sha256', $revisionId . '|' . ($audienceUserId ?? $effectiveActor) . '|read_ack');
        $ack = $db->queryOne(
            "INSERT INTO doc_read_acknowledgements
                (doc_revision_id, audience_user_id, actor_ref, acknowledged_at, signature_event_id,
                 acknowledgement_hash_sha256, idempotency_key, metadata)
             VALUES
                (CAST(:doc_revision_id AS uuid), CAST(:audience_user_id AS uuid), :actor_ref,
                 CAST(:acknowledged_at AS timestamptz), CAST(:signature_event_id AS uuid),
                 :acknowledgement_hash_sha256, :idempotency_key, CAST(:metadata AS jsonb))
             ON CONFLICT DO NOTHING
             RETURNING *",
            [
                ':doc_revision_id' => $revisionId,
                ':audience_user_id' => $audienceUserId,
                ':actor_ref' => $effectiveActor,
                ':acknowledged_at' => $this->nullableText($input['acknowledged_at'] ?? null) ?? gmdate('c'),
                ':signature_event_id' => $this->nullableUuid($input['signature_event_id'] ?? null),
                ':acknowledgement_hash_sha256' => $ackHash,
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'DocumentRevisionCommandService',
                    'actor_ref' => $actorRef,
                    'read_acknowledgement_role' => 'effectivity_training_gate_evidence',
                ]),
            ],
        );

        $distribution = $db->queryOne(
            "UPDATE doc_distributions
             SET distribution_state = 'complete',
                 updated_at = now(),
                 row_version = row_version + 1
             WHERE doc_revision_id = CAST(:doc_revision_id AS uuid)
               AND read_ack_required = true
               AND (
                   (audience_type = 'user' AND (audience_ref = :actor_ref OR audience_ref = :audience_user_id))
                   OR (audience_type = 'individual' AND (audience_ref = :actor_ref OR audience_ref = :audience_user_id))
               )
             RETURNING *",
            [
                ':doc_revision_id' => $revisionId,
                ':actor_ref' => $effectiveActor,
                ':audience_user_id' => $audienceUserId,
            ],
        );

        return [
            'authority' => 'canonical_document_control',
            'read_acknowledgement' => is_array($ack) ? $ack : null,
            'distribution_update' => is_array($distribution) ? $distribution : null,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function supersedeRevision(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $revisionId = $this->requiredUuid($input, 'doc_revision_id');
        $sourceChangeOrderId = $this->requiredUuid($input, 'source_change_order_id');
        $supersededBy = $this->nullableUuid($input['superseded_by_doc_revision_id'] ?? null);
        $this->assertReleasedDocumentChangeAuthority(
            $db,
            $sourceChangeOrderId,
            ['document_revision', 'doc_revision'],
            [$revisionId],
            'lifecycle_state',
            'supersede',
            $input,
        );

        $revision = $db->queryOne(
            "UPDATE doc_revisions
             SET lifecycle_state = 'superseded',
                 source_change_order_id = COALESCE(source_change_order_id, CAST(:source_change_order_id AS uuid)),
                 metadata = metadata || CAST(:metadata AS jsonb),
                 updated_at = now(),
                 row_version = row_version + 1
             WHERE doc_revision_id = CAST(:doc_revision_id AS uuid)
               AND lifecycle_state IN ('released', 'approved')
             RETURNING *",
            [
                ':doc_revision_id' => $revisionId,
                ':source_change_order_id' => $sourceChangeOrderId,
                ':metadata' => $this->json([
                    'authority' => 'DocumentRevisionCommandService',
                    'actor_ref' => $actorRef,
                    'superseded_by_doc_revision_id' => $supersededBy,
                ]),
            ],
        );
        if (!is_array($revision) || $this->text($revision['doc_revision_id'] ?? '') === '') {
            throw new RuntimeException('document_revision_supersession_not_allowed');
        }

        $distribution = $db->queryOne(
            "UPDATE doc_distributions
             SET distribution_state = 'superseded',
                 updated_at = now(),
                 row_version = row_version + 1
             WHERE doc_revision_id = CAST(:doc_revision_id AS uuid)
               AND distribution_state <> 'withdrawn'
             RETURNING *",
            [':doc_revision_id' => $revisionId],
        );

        return [
            'authority' => 'canonical_document_control',
            'doc_revision' => $revision,
            'doc_distribution_supersession' => is_array($distribution) ? $distribution : null,
        ];
    }

    private function requireDb(): object
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('canonical_document_store_required');
        }
        return $this->db;
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function persistEffectivities(object $db, string $revisionId, array $input, ?string $sourceChangeOrderId): array
    {
        $rows = [];
        $effectivities = is_array($input['effectivities'] ?? null) ? $input['effectivities'] : [];
        foreach ($effectivities as $effectivity) {
            if (!is_array($effectivity)) {
                continue;
            }
            $row = $db->queryOne(
                "INSERT INTO doc_effectivities
                    (doc_revision_id, effectivity_type, effectivity_scope, effective_from, effective_to, source_change_order_id)
                 VALUES
                    (CAST(:doc_revision_id AS uuid), :effectivity_type, CAST(:effectivity_scope AS jsonb),
                     CAST(:effective_from AS timestamptz), CAST(:effective_to AS timestamptz), CAST(:source_change_order_id AS uuid))
                 RETURNING *",
                [
                    ':doc_revision_id' => $revisionId,
                    ':effectivity_type' => $this->effectivityType($effectivity['effectivity_type'] ?? 'date'),
                    ':effectivity_scope' => $this->json($effectivity['effectivity_scope'] ?? []),
                    ':effective_from' => $this->nullableText($effectivity['effective_from'] ?? null) ?? gmdate('c'),
                    ':effective_to' => $this->nullableText($effectivity['effective_to'] ?? null),
                    ':source_change_order_id' => $this->nullableUuid($effectivity['source_change_order_id'] ?? null) ?? $sourceChangeOrderId,
                ],
            );
            if (is_array($row)) {
                $rows[] = $row;
            }
        }
        return $rows;
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function persistDistributions(object $db, string $revisionId, array $input): array
    {
        $rows = [];
        $distributions = is_array($input['distributions'] ?? null) ? $input['distributions'] : [];
        foreach ($distributions as $distribution) {
            if (!is_array($distribution)) {
                continue;
            }
            $row = $db->queryOne(
                "INSERT INTO doc_distributions
                    (doc_revision_id, audience_type, audience_ref, distribution_state, read_ack_required,
                     distributed_at, idempotency_key, metadata)
                 VALUES
                    (CAST(:doc_revision_id AS uuid), :audience_type, :audience_ref, :distribution_state,
                     :read_ack_required, CAST(:distributed_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (doc_revision_id, audience_type, audience_ref) DO UPDATE SET
                     distribution_state = EXCLUDED.distribution_state,
                     updated_at = now()
                 RETURNING *",
                [
                    ':doc_revision_id' => $revisionId,
                    ':audience_type' => $this->audienceType($distribution['audience_type'] ?? 'role'),
                    ':audience_ref' => $this->requiredText($distribution, 'audience_ref'),
                    ':distribution_state' => $this->distributionState($distribution['distribution_state'] ?? 'pending'),
                    ':read_ack_required' => (bool)($distribution['read_ack_required'] ?? false),
                    ':distributed_at' => $this->nullableText($distribution['distributed_at'] ?? null),
                    ':idempotency_key' => $this->nullableText($distribution['idempotency_key'] ?? null),
                    ':metadata' => $this->json(['authority' => 'DocumentRevisionCommandService']),
                ],
            );
            if (is_array($row)) {
                $rows[] = $row;
            }
        }
        return $rows;
    }

    /**
     * @param list<string> $objectTypes
     * @param list<string> $objectIds
     * @param array<string, mixed> $context
     */
    private function assertReleasedDocumentChangeAuthority(
        object $db,
        ?string $changeOrderId,
        array $objectTypes,
        array $objectIds,
        string $fieldPath,
        string $requestedEffect,
        array $context,
    ): void {
        if ($changeOrderId === null) {
            throw new RuntimeException('released_document_change_order_required');
        }
        if (!method_exists($db, 'query')) {
            throw new RuntimeException('released_document_change_authority_store_required');
        }

        $rows = $db->query(
            "SELECT
                co.plm_change_order_id::text AS plm_change_order_id,
                co.change_order_number,
                co.status,
                lower(cao.object_type) AS object_type,
                cao.object_id,
                cao.affected_fields,
                cao.requested_effect,
                cao.effectivity_rule,
                cao.disposition
                ,eff.plm_change_effectivity_id::text AS plm_change_effectivity_id
                ,eff.effectivity_type
                ,eff.effectivity_scope
                ,eff.effective_from
                ,eff.effective_to
             FROM plm_change_orders co
             INNER JOIN plm_change_affected_objects cao
               ON cao.plm_change_order_id = co.plm_change_order_id
             LEFT JOIN plm_change_effectivities eff
               ON eff.plm_change_order_id = co.plm_change_order_id
              AND lower(eff.object_type) = lower(cao.object_type)
              AND (eff.object_id = cao.object_id OR eff.object_id = '*')
             WHERE co.plm_change_order_id = CAST(:change_order_id AS uuid)
               AND co.status = 'released'
               AND cao.disposition = 'accepted'
             ORDER BY cao.created_at DESC",
            [':change_order_id' => $changeOrderId],
        );
        if (!is_array($rows)) {
            throw new RuntimeException('released_document_change_authority_required');
        }

        $normalizedObjectTypes = array_values(array_filter(array_map(
            fn(string $type): string => strtolower(trim($type)),
            $objectTypes,
        )));
        $normalizedObjectIds = array_values(array_filter(array_map(
            fn(string $id): string => trim($id),
            $objectIds,
        )));

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if (!in_array(strtolower($this->text($row['object_type'] ?? '')), $normalizedObjectTypes, true)) {
                continue;
            }
            if (!in_array($this->text($row['object_id'] ?? ''), $normalizedObjectIds, true)) {
                continue;
            }
            if (!$this->fieldListContains($row['affected_fields'] ?? null, $fieldPath)) {
                continue;
            }
            if (!$this->effectListContains($row['requested_effect'] ?? null, $requestedEffect)) {
                continue;
            }
            if (!$this->canonicalEffectivityMatches($row, $context)) {
                continue;
            }
            return;
        }

        throw new RuntimeException('released_document_change_authority_required');
    }

    private function documentChangeEffect(string $lifecycleState): string
    {
        return match ($lifecycleState) {
            'released' => 'release',
            'superseded' => 'supersede',
            'obsolete' => 'obsolete',
            'withdrawn' => 'withdraw',
            default => 'revise',
        };
    }

    private function fieldListContains(mixed $raw, string $fieldPath): bool
    {
        return in_array($fieldPath, $this->textList($raw), true);
    }

    private function effectListContains(mixed $raw, string $requestedEffect): bool
    {
        $effects = $this->textList($raw);
        if ($effects === []) {
            return false;
        }
        return in_array($requestedEffect, $effects, true)
            || ($requestedEffect === 'withdraw' && in_array('withdrawn', $effects, true));
    }

    /**
     * @return list<string>
     */
    private function textList(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_unique(array_filter(array_map(
                fn(mixed $value): string => is_scalar($value) ? strtolower(trim((string)$value)) : '',
                $raw,
            ))));
        }
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $text = trim($raw);
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $this->textList($decoded);
        }
        if (str_starts_with($text, '{') && str_ends_with($text, '}')) {
            $text = substr($text, 1, -1);
        }
        return array_values(array_unique(array_filter(array_map(
            fn(string $value): string => strtolower(trim($value, " \t\n\r\0\x0B\"'")),
            str_getcsv($text, ',', '"', '\\'),
        ))));
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $context
     */
    private function canonicalEffectivityMatches(array $row, array $context): bool
    {
        if ($this->text($row['plm_change_effectivity_id'] ?? '') === '') {
            return false;
        }

        $scopeRaw = $row['effectivity_scope'] ?? [];
        if (is_string($scopeRaw)) {
            $decoded = json_decode($scopeRaw, true);
            $scopeRaw = is_array($decoded) ? $decoded : [];
        }
        $scope = is_array($scopeRaw) ? $scopeRaw : [];
        $contextScope = $this->effectivityContext($context);
        foreach (['site', 'plant', 'product', 'lot', 'serial', 'order_id', 'role'] as $key) {
            if (!array_key_exists($key, $scope)) {
                continue;
            }
            $actual = $contextScope[$key] ?? $contextScope['effectivity_' . $key] ?? null;
            $expected = $scope[$key];
            if (is_array($expected)) {
                if (!in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ((string)$expected !== (string)$actual) {
                return false;
            }
        }

        $effectiveAt = strtotime($this->nullableText($contextScope['effective_at'] ?? $context['effective_at'] ?? null) ?? gmdate('c'));
        $from = strtotime($this->text($row['effective_from'] ?? ''));
        $to = strtotime($this->text($row['effective_to'] ?? ''));
        if ($from !== false && $effectiveAt !== false && $from > $effectiveAt) {
            return false;
        }
        if ($to !== false && $effectiveAt !== false && $to <= $effectiveAt) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function effectivityContext(array $context): array
    {
        if (is_array($context['effectivity'] ?? null)) {
            return $context['effectivity'];
        }
        if (is_array($context['effectivity_context'] ?? null)) {
            return $context['effectivity_context'];
        }
        if (is_array($context['effectivities'][0]['effectivity_scope'] ?? null)) {
            return $context['effectivities'][0]['effectivity_scope'];
        }
        return $context;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    private function assertFamilyReplayEquivalent(array $row, array $expected): void
    {
        foreach (['doc_code', 'doc_type', 'title'] as $field) {
            if (array_key_exists($field, $row) && $this->text($row[$field]) !== $this->text($expected[$field] ?? '')) {
                throw new RuntimeException('doc_family_idempotency_conflict');
            }
        }
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    private function assertRevisionReplayEquivalent(array $row, array $expected): void
    {
        foreach (['doc_family_id', 'revision_label', 'revision_sequence', 'lifecycle_state', 'source_change_order_id', 'manifest_hash_sha256'] as $field) {
            if (array_key_exists($field, $row) && $this->text($row[$field]) !== $this->text($expected[$field] ?? '')) {
                throw new RuntimeException('doc_revision_idempotency_conflict');
            }
        }
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

    private function docType(mixed $value): string
    {
        $type = strtoupper($this->text($value));
        if (!in_array($type, ['SOP', 'WI', 'ANNEX', 'FRM', 'SPEC', 'POLICY', 'OTHER'], true)) {
            throw new RuntimeException('invalid_document_type');
        }
        return $type;
    }

    private function documentState(mixed $value): string
    {
        $state = strtolower($this->text($value));
        if (!in_array($state, ['draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete', 'withdrawn'], true)) {
            throw new RuntimeException('invalid_document_lifecycle_state');
        }
        return $state;
    }

    private function effectivityType(mixed $value): string
    {
        $type = strtolower($this->text($value));
        if (!in_array($type, ['date', 'site', 'plant', 'product', 'lot', 'serial', 'order', 'role'], true)) {
            throw new RuntimeException('invalid_document_effectivity_type');
        }
        return $type;
    }

    private function audienceType(mixed $value): string
    {
        $type = strtolower($this->text($value));
        if (!in_array($type, ['user', 'role', 'department', 'site', 'plant'], true)) {
            throw new RuntimeException('invalid_document_distribution_audience_type');
        }
        return $type;
    }

    private function distributionState(mixed $value): string
    {
        $state = strtolower($this->text($value));
        if (!in_array($state, ['pending', 'distributed', 'ack_required', 'complete', 'superseded', 'withdrawn'], true)) {
            throw new RuntimeException('invalid_document_distribution_state');
        }
        return $state;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredText(array $data, string $key): string
    {
        $text = $this->text($data[$key] ?? '');
        if ($text === '') {
            throw new RuntimeException($key . '_required');
        }
        return $text;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredUuid(array $data, string $key): string
    {
        $uuid = $this->nullableUuid($data[$key] ?? null);
        if ($uuid === null) {
            throw new RuntimeException($key . '_required');
        }
        return $uuid;
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

    private function nullableSha256(mixed $value): ?string
    {
        $text = strtolower($this->text($value));
        return preg_match('/^[a-f0-9]{64}$/', $text) === 1 ? $text : null;
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
