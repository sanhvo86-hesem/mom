<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Runtime finalization facade for record-centric immutable evidence packages.
 */
final class EvidenceFinalizationService
{
    public function __construct(
        private readonly string $dataDir,
        private readonly ?object $db = null,
        private readonly ?ImmutableStorageAdapter $storage = null,
    ) {
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function finalize(array $input): array
    {
        $package = (new EvidencePackageBuilder($this->storage ?? new LocalImmutableStorageAdapter($this->dataDir)))->build($input);
        $this->assertComplete($package);
        $canonicalRows = $this->persistCanonicalRows($input, $package);

        return [
            'finalization_state' => 'finalized',
            'record_state' => 'locked',
            'immutable_after_finalization' => true,
            'persisted' => $canonicalRows !== [],
            'canonical' => $canonicalRows,
            'package' => $package,
            'publication_state' => $package['manifest']['publication_state'] ?? ['publication_state' => 'pending'],
        ];
    }

    /**
     * @param array<string, mixed> $package
     */
    private function assertComplete(array $package): void
    {
        $artifacts = is_array($package['artifacts'] ?? null) ? $package['artifacts'] : [];
        foreach (['original', 'canonical_payload', 'readable_snapshot', 'hash_signature_manifest'] as $required) {
            if (!is_array($artifacts[$required] ?? null)) {
                throw new RuntimeException('evidence_package_missing_' . $required);
            }
            foreach (['storage_uri', 'sha256', 'size_bytes'] as $field) {
                if (!isset($artifacts[$required][$field]) || (string)$artifacts[$required][$field] === '') {
                    throw new RuntimeException('evidence_package_incomplete_' . $required);
                }
            }
        }

        if (!is_array($package['manifest']['publication_state'] ?? null)) {
            throw new RuntimeException('evidence_package_missing_publication_state');
        }
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $package
     * @return array<string, mixed>
     */
    private function persistCanonicalRows(array $input, array $package): array
    {
        $db = $this->normalizeDb($this->db);
        if ($db === null || !method_exists($db, 'queryOne')) {
            return [];
        }

        $subjectType = $this->text($package['subject_type'] ?? $input['subject_type'] ?? '');
        $subjectId = $this->text($package['subject_id'] ?? $input['subject_id'] ?? '');
        if ($subjectType === '' || $subjectId === '') {
            throw new RuntimeException('evidence_subject_required_for_persistence');
        }
        $evidenceKey = $this->text($input['evidence_key'] ?? '');
        if ($evidenceKey === '') {
            $evidenceKey = 'EV-' . substr(hash('sha256', $subjectType . '|' . $subjectId . '|' . ($package['package_hash_sha256'] ?? '')), 0, 24);
        }

        $record = $db->queryOne(
            "WITH inserted AS (
                INSERT INTO evidence_records
                    (evidence_key, subject_type, subject_id, record_state, retention_class,
                     source_issuance_id, source_attempt_id, source_change_order_id, idempotency_key, metadata)
                VALUES
                    (:evidence_key, :subject_type, :subject_id, 'open', :retention_class,
                     CAST(:source_issuance_id AS uuid), CAST(:source_attempt_id AS uuid), CAST(:source_change_order_id AS uuid),
                     :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (evidence_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM evidence_records WHERE evidence_key = :evidence_key
             LIMIT 1",
            [
                ':evidence_key' => $evidenceKey,
                ':subject_type' => $subjectType,
                ':subject_id' => $subjectId,
                ':retention_class' => $this->nullableText($input['retention_class'] ?? null),
                ':source_issuance_id' => $this->nullableUuid($input['source_issuance_id'] ?? null),
                ':source_attempt_id' => $this->nullableUuid($input['source_attempt_id'] ?? null),
                ':source_change_order_id' => $this->nullableUuid($input['source_change_order_id'] ?? $input['change_order_id'] ?? null),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json(['source' => 'EvidenceFinalizationService']),
            ],
        );
        if (!is_array($record) || $this->text($record['evidence_record_id'] ?? '') === '') {
            throw new RuntimeException('evidence_record_persistence_failed');
        }

        $idempotencyBase = $this->nullableText($input['idempotency_key'] ?? null);
        $amendmentNo = max(0, (int)($input['amendment_no'] ?? 0));
        $sourceVersionId = $this->nullableUuid($input['source_version_id'] ?? $input['source_evidence_version_id'] ?? null);
        $sourceChangeOrderId = $this->nullableUuid($input['source_change_order_id'] ?? $input['change_order_id'] ?? null);
        if (($amendmentNo > 0 || $sourceVersionId !== null) && $sourceChangeOrderId === null) {
            throw new RuntimeException('evidence_amendment_change_order_required');
        }
        $version = $db->queryOne(
            "WITH inserted AS (
                INSERT INTO evidence_versions
                    (evidence_record_id, version_no, version_state, amendment_no, source_version_id, source_change_order_id,
                     canonical_payload, package_hash_sha256, manifest_hash_sha256,
                     canonical_payload_hash_sha256, readable_snapshot_hash_sha256,
                     finalized_at, idempotency_key, metadata)
                VALUES
                    (CAST(:evidence_record_id AS uuid), :version_no, 'locked', :amendment_no,
                     CAST(:source_version_id AS uuid), CAST(:source_change_order_id AS uuid),
                     CAST(:canonical_payload AS jsonb), :package_hash_sha256, :manifest_hash_sha256,
                     :canonical_payload_hash_sha256, :readable_snapshot_hash_sha256,
                     now(), :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (package_hash_sha256) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM evidence_versions WHERE package_hash_sha256 = :package_hash_sha256
             LIMIT 1",
            [
                ':evidence_record_id' => (string)$record['evidence_record_id'],
                ':version_no' => max(1, (int)($input['version_no'] ?? 1)),
                ':amendment_no' => $amendmentNo,
                ':source_version_id' => $sourceVersionId,
                ':source_change_order_id' => $sourceChangeOrderId,
                ':canonical_payload' => $this->json($input['canonical_payload'] ?? []),
                ':package_hash_sha256' => (string)$package['package_hash_sha256'],
                ':manifest_hash_sha256' => (string)$package['manifest_hash_sha256'],
                ':canonical_payload_hash_sha256' => (string)$package['canonical_payload_hash_sha256'],
                ':readable_snapshot_hash_sha256' => (string)$package['readable_snapshot_hash_sha256'],
                ':idempotency_key' => $idempotencyBase !== null ? $idempotencyBase . ':version' : null,
                ':metadata' => $this->json(['finalization_state' => 'finalized']),
            ],
        );
        if (!is_array($version) || $this->text($version['evidence_version_id'] ?? '') === '') {
            throw new RuntimeException('evidence_version_persistence_failed');
        }

        $artifacts = [];
        foreach (['original', 'canonical_payload', 'readable_snapshot', 'hash_signature_manifest'] as $role) {
            $artifact = is_array($package['artifacts'][$role] ?? null) ? $package['artifacts'][$role] : [];
            $artifacts[$role] = $db->queryOne(
                "WITH inserted AS (
                    INSERT INTO evidence_artifacts
                        (evidence_version_id, artifact_role, storage_adapter, storage_uri, size_bytes,
                         sha256, is_required_for_final, idempotency_key, metadata)
                    VALUES
                        (CAST(:evidence_version_id AS uuid), :artifact_role, :storage_adapter, :storage_uri, :size_bytes,
                         :sha256, true, :idempotency_key, CAST(:metadata AS jsonb))
                    ON CONFLICT (evidence_version_id, artifact_role, sha256) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM evidence_artifacts
                  WHERE evidence_version_id = CAST(:evidence_version_id AS uuid)
                    AND artifact_role = :artifact_role
                    AND sha256 = :sha256
                 LIMIT 1",
                [
                    ':evidence_version_id' => (string)$version['evidence_version_id'],
                    ':artifact_role' => $role,
                    ':storage_adapter' => (string)($artifact['storage_adapter'] ?? ''),
                    ':storage_uri' => (string)($artifact['storage_uri'] ?? ''),
                    ':size_bytes' => (int)($artifact['size_bytes'] ?? 0),
                    ':sha256' => (string)($artifact['sha256'] ?? ''),
                    ':idempotency_key' => hash('sha256', (string)$version['evidence_version_id'] . '|' . $role . '|' . (string)($artifact['sha256'] ?? '')),
                    ':metadata' => $this->json(['required_for_final' => true]),
                ],
            );
        }

        $signatureEvents = $this->persistSignatureEvents($db, $input, $package, $record, $version);
        $retentionLock = (new RetentionLockService($db))->ensureForFinalEvidence($record, $version, [
            'package_hash_sha256' => (string)$package['package_hash_sha256'],
        ] + $input);

        $publicationState = is_array($package['manifest']['publication_state'] ?? null) ? $package['manifest']['publication_state'] : [];
        $publication = $db->queryOne(
            "WITH inserted AS (
                INSERT INTO evidence_publications
                    (evidence_version_id, publication_target, publication_state, authority_role,
                     source_package_hash_sha256, source_manifest_hash_sha256, publication_receipt, idempotency_key, metadata)
                VALUES
                    (CAST(:evidence_version_id AS uuid), :publication_target, :publication_state, 'read_only_replica',
                     :source_package_hash_sha256, :source_manifest_hash_sha256, CAST(:publication_receipt AS jsonb),
                     :idempotency_key, CAST(:metadata AS jsonb))
                ON CONFLICT (evidence_version_id, publication_target) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM evidence_publications
              WHERE evidence_version_id = CAST(:evidence_version_id AS uuid)
                AND publication_target = :publication_target
             LIMIT 1",
            [
                ':evidence_version_id' => (string)$version['evidence_version_id'],
                ':publication_target' => $this->text($publicationState['target_type'] ?? 'sharepoint_graph') ?: 'sharepoint_graph',
                ':publication_state' => $this->text($publicationState['publication_state'] ?? 'pending') ?: 'pending',
                ':source_package_hash_sha256' => (string)$package['package_hash_sha256'],
                ':source_manifest_hash_sha256' => (string)$package['manifest_hash_sha256'],
                ':publication_receipt' => $this->json($publicationState['publication_receipt'] ?? []),
                ':idempotency_key' => hash('sha256', (string)$version['evidence_version_id'] . '|publication|sharepoint_graph'),
                ':metadata' => $this->json(['publication_boundary' => 'async_read_only_replica']),
            ],
        );

        $record = $db->queryOne(
            "UPDATE evidence_records
             SET record_state = 'finalized',
                 current_version_id = CAST(:evidence_version_id AS uuid),
                 updated_at = now(),
                 row_version = row_version + 1
             WHERE evidence_record_id = CAST(:evidence_record_id AS uuid)
               AND (
                   record_state <> 'finalized'
                   OR current_version_id IS DISTINCT FROM CAST(:evidence_version_id AS uuid)
               )
             RETURNING *",
            [
                ':evidence_version_id' => (string)$version['evidence_version_id'],
                ':evidence_record_id' => (string)$record['evidence_record_id'],
            ],
        ) ?: $record;

        return [
            'evidence_record' => $record,
            'evidence_version' => $version,
            'evidence_artifacts' => $artifacts,
            'signature_events' => $signatureEvents,
            'retention_lock' => $retentionLock,
            'evidence_publication' => $publication,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $package
     * @param array<string, mixed> $record
     * @param array<string, mixed> $version
     * @return list<array<string, mixed>>
     */
    private function persistSignatureEvents(object $db, array $input, array $package, array $record, array $version): array
    {
        $manifest = is_array($package['manifest'] ?? null) ? $package['manifest'] : [];
        $events = is_array($manifest['signature_events'] ?? null)
            ? $manifest['signature_events']
            : (is_array($input['signature_events'] ?? null) ? $input['signature_events'] : []);
        if ($events === []) {
            return [];
        }

        $persisted = [];
        foreach ($events as $index => $event) {
            if (!is_array($event)) {
                continue;
            }

            $signerUserId = $this->nullableUuid($event['signer_user_id'] ?? $event['user_id'] ?? null);
            $signerRef = $this->nullableText($event['signer_ref'] ?? $event['actor_ref'] ?? $input['actor_ref'] ?? $input['actor_id'] ?? null);
            if ($signerUserId === null && $signerRef === null) {
                throw new RuntimeException('signature_event_signer_required');
            }

            $meaning = $this->text($event['signature_meaning'] ?? $event['meaning'] ?? '');
            if ($meaning === '') {
                throw new RuntimeException('signature_event_meaning_required');
            }

            $payloadHash = $this->nullableHash($event['signed_payload_hash_sha256'] ?? null)
                ?? (string)$package['manifest_hash_sha256'];
            $signatureHash = $this->nullableHash($event['signature_hash_sha256'] ?? null)
                ?? hash('sha256', $payloadHash . '|' . ($signerUserId ?? $signerRef) . '|' . $meaning);
            $idempotencyKey = $this->nullableText($event['idempotency_key'] ?? null)
                ?? hash('sha256', (string)$version['evidence_version_id'] . '|signature|' . $index . '|' . $signatureHash);

            $row = $db->queryOne(
                "WITH inserted AS (
                    INSERT INTO signature_events
                        (signed_object_type, signed_object_id, signed_object_version, signer_user_id, signer_ref,
                         signer_role, signature_meaning, signature_state, signed_payload_hash_sha256,
                         signature_hash_sha256, signed_at, idempotency_key, metadata)
                    VALUES
                        ('evidence_version', :signed_object_id, :signed_object_version, CAST(:signer_user_id AS uuid), :signer_ref,
                         :signer_role, :signature_meaning, :signature_state, :signed_payload_hash_sha256,
                         :signature_hash_sha256, CAST(:signed_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
                    ON CONFLICT (idempotency_key) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM signature_events WHERE idempotency_key = :idempotency_key
                 LIMIT 1",
                [
                    ':signed_object_id' => (string)$version['evidence_version_id'],
                    ':signed_object_version' => $this->nullableText($version['version_no'] ?? null) ?? '1',
                    ':signer_user_id' => $signerUserId,
                    ':signer_ref' => $signerRef,
                    ':signer_role' => $this->nullableText($event['signer_role'] ?? $event['role'] ?? null),
                    ':signature_meaning' => $meaning,
                    ':signature_state' => $this->signatureState($event['signature_state'] ?? 'applied'),
                    ':signed_payload_hash_sha256' => $payloadHash,
                    ':signature_hash_sha256' => $signatureHash,
                    ':signed_at' => $this->nullableText($event['signed_at'] ?? null) ?? gmdate('c'),
                    ':idempotency_key' => $idempotencyKey,
                    ':metadata' => $this->json([
                        'authority' => 'EvidenceFinalizationService',
                        'evidence_record_id' => (string)($record['evidence_record_id'] ?? ''),
                        'package_hash_sha256' => (string)$package['package_hash_sha256'],
                    ]),
                ],
            );
            if (is_array($row)) {
                $persisted[] = $row;
            }
        }

        return $persisted;
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

    private function nullableHash(mixed $value): ?string
    {
        $text = strtolower($this->text($value));
        return preg_match('/^[a-f0-9]{64}$/', $text) === 1 ? $text : null;
    }

    private function signatureState(mixed $value): string
    {
        $state = strtolower($this->text($value));
        if (!in_array($state, ['applied', 'rejected', 'voided'], true)) {
            throw new RuntimeException('invalid_signature_state');
        }
        return $state;
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
