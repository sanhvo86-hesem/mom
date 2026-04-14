<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Creates amendment drafts without editing finalized evidence in place.
 */
final class EvidenceAmendmentService
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
    public function createAmendment(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $sourceVersionId = $this->requiredUuid($input, 'source_evidence_version_id');
        $changeOrderId = $this->requiredUuid($input, 'source_change_order_id');
        $fieldPaths = $this->fieldPaths($input['field_paths'] ?? $input['affected_fields'] ?? []);
        if ($fieldPaths === []) {
            throw new RuntimeException('evidence_amendment_field_paths_required');
        }

        $authority = $this->assertReleasedChangeAuthority($db, $changeOrderId, $sourceVersionId, $fieldPaths, $input);
        $canonicalPayload = is_array($input['canonical_payload'] ?? null)
            ? $input['canonical_payload']
            : ['amendment_state' => 'draft', 'source_evidence_version_id' => $sourceVersionId];

        $amendment = $db->queryOne(
            "INSERT INTO evidence_versions
                (evidence_record_id, version_no, version_state, amendment_no, source_version_id,
                 source_change_order_id, canonical_payload, idempotency_key, metadata)
             SELECT
                ev.evidence_record_id,
                COALESCE((SELECT max(existing.version_no) + 1 FROM evidence_versions existing
                          WHERE existing.evidence_record_id = ev.evidence_record_id), ev.version_no + 1),
                'draft',
                ev.amendment_no + 1,
                ev.evidence_version_id,
                CAST(:source_change_order_id AS uuid),
                CAST(:canonical_payload AS jsonb),
                :idempotency_key,
                CAST(:metadata AS jsonb)
             FROM evidence_versions ev
             WHERE ev.evidence_version_id = CAST(:source_evidence_version_id AS uuid)
               AND ev.version_state = 'locked'
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING *",
            [
                ':source_evidence_version_id' => $sourceVersionId,
                ':source_change_order_id' => $changeOrderId,
                ':canonical_payload' => $this->json($canonicalPayload),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null)
                    ?? hash('sha256', $sourceVersionId . '|' . $changeOrderId . '|amendment'),
                ':metadata' => $this->json([
                    'authority' => 'EvidenceAmendmentService',
                    'actor_ref' => $actorRef,
                    'field_paths' => $fieldPaths,
                    'change_authority' => $authority,
                    'source_version_is_not_edited' => true,
                ]),
            ],
        );
        if (!is_array($amendment) || $this->text($amendment['evidence_version_id'] ?? '') === '') {
            throw new RuntimeException('evidence_amendment_not_created');
        }

        return [
            'authority' => 'canonical_evidence_control',
            'immutable_after_finalization' => true,
            'source_version_edited' => false,
            'change_authority' => $authority,
            'amendment_version' => $amendment,
        ];
    }

    private function requireDb(): object
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_evidence_store_required');
        }
        return $this->db;
    }

    /**
     * @param list<string> $fieldPaths
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function assertReleasedChangeAuthority(object $db, string $changeOrderId, string $sourceVersionId, array $fieldPaths, array $input): array
    {
        if (!method_exists($db, 'query')) {
            throw new RuntimeException('authoritative_change_authority_store_required');
        }

        $rows = $db->query(
            "SELECT
                co.plm_change_order_id::text AS plm_change_order_id,
                co.change_order_number,
                co.status,
                cao.object_type,
                cao.object_id,
                cao.affected_fields,
                eff.effectivity_scope,
                eff.effective_from,
                eff.effective_to
             FROM plm_change_orders co
             INNER JOIN plm_change_affected_objects cao
                ON cao.plm_change_order_id = co.plm_change_order_id
             INNER JOIN plm_change_effectivities eff
                ON eff.plm_change_order_id = co.plm_change_order_id
             WHERE co.plm_change_order_id = CAST(:change_order_id AS uuid)
               AND co.status = 'released'
               AND lower(cao.object_type) IN ('evidence_version', 'evidence_record')
               AND (cao.object_id = :source_evidence_version_id OR cao.object_id = :evidence_record_id)
               AND cao.disposition = 'accepted'
               AND cao.affected_fields @> string_to_array(:field_paths_csv, ',')
               AND eff.effective_from <= COALESCE(CAST(:effective_at AS timestamptz), now())
               AND (eff.effective_to IS NULL OR eff.effective_to > COALESCE(CAST(:effective_at AS timestamptz), now()))
             ORDER BY eff.effective_from DESC
             LIMIT 1",
            [
                ':change_order_id' => $changeOrderId,
                ':source_evidence_version_id' => $sourceVersionId,
                ':evidence_record_id' => $this->nullableText($input['evidence_record_id'] ?? null) ?? '',
                ':field_paths_csv' => implode(',', $fieldPaths),
                ':effective_at' => $this->nullableText($input['effective_at'] ?? null),
            ],
        );

        foreach (is_array($rows) ? $rows : [] as $row) {
            if (is_array($row)) {
                return $row;
            }
        }

        throw new RuntimeException('evidence_amendment_change_authority_not_verified');
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

    /**
     * @return list<string>
     */
    private function fieldPaths(mixed $value): array
    {
        if (is_string($value) && trim($value) !== '') {
            return [trim($value)];
        }
        if (!is_array($value)) {
            return [];
        }

        $paths = [];
        foreach ($value as $path) {
            $text = $this->text($path);
            if ($text !== '') {
                $paths[] = $text;
            }
        }
        return array_values(array_unique($paths));
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
