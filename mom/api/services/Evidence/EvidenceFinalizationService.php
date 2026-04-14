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

        $signatureEvents = is_array($package['manifest']['signature_events'] ?? null)
            ? $package['manifest']['signature_events']
            : [];
        if ($signatureEvents === []) {
            throw new RuntimeException('evidence_signature_event_required');
        }
        foreach ($signatureEvents as $event) {
            if (!is_array($event)) {
                throw new RuntimeException('signature_event_invalid');
            }
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
            throw new RuntimeException('authoritative_evidence_store_required');
        }

        if (method_exists($db, 'transactional')) {
            return $db->transactional(fn(): array => $this->persistCanonicalRowsInsideTransaction($db, $input, $package));
        }

        return $this->persistCanonicalRowsInsideTransaction($db, $input, $package);
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $package
     * @return array<string, mixed>
     */
    private function persistCanonicalRowsInsideTransaction(object $db, array $input, array $package): array
    {
        $subjectType = $this->text($package['subject_type'] ?? $input['subject_type'] ?? '');
        $subjectId = $this->text($package['subject_id'] ?? $input['subject_id'] ?? '');
        if ($subjectType === '' || $subjectId === '') {
            throw new RuntimeException('evidence_subject_required_for_persistence');
        }
        $this->assertSourceSubmissionAttemptAccepted($db, $input, $package);
        $evidenceKey = $this->text($input['evidence_key'] ?? '');
        if ($evidenceKey === '') {
            $evidenceKey = 'EV-' . substr(hash('sha256', $subjectType . '|' . $subjectId . '|' . ($package['package_hash_sha256'] ?? '')), 0, 24);
        }
        $idempotencyBase = $this->nullableText($input['idempotency_key'] ?? null);
        $amendmentNo = max(0, (int)($input['amendment_no'] ?? 0));
        $sourceVersionId = $this->nullableUuid($input['source_version_id'] ?? $input['source_evidence_version_id'] ?? null);
        $sourceChangeOrderId = $this->nullableUuid($input['source_change_order_id'] ?? $input['change_order_id'] ?? null);
        if (($amendmentNo > 0 || $sourceVersionId !== null) && $sourceChangeOrderId === null) {
            throw new RuntimeException('evidence_amendment_change_order_required');
        }
        $recordMetadata = ['source' => 'EvidenceFinalizationService'];
        $scope = is_array($input['scope'] ?? null) ? $input['scope'] : [];
        $orgId = $this->nullableText($input['org_id'] ?? $scope['org_id'] ?? null);
        if ($orgId !== null) {
            $recordMetadata['org_id'] = $orgId;
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
                ':metadata' => $this->json($recordMetadata),
            ],
        );
        if (!is_array($record) || $this->text($record['evidence_record_id'] ?? '') === '') {
            throw new RuntimeException('evidence_record_persistence_failed');
        }
        $this->assertEvidenceRecordReplayEquivalent($record, [
            'evidence_key' => $evidenceKey,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'source_issuance_id' => $this->nullableUuid($input['source_issuance_id'] ?? null),
            'source_attempt_id' => $this->nullableUuid($input['source_attempt_id'] ?? null),
        ]);
        if ($this->text($record['record_state'] ?? '') === 'finalized') {
            if ($sourceVersionId === null) {
                throw new RuntimeException('evidence_finalization_amendment_required');
            }
            if ($sourceChangeOrderId === null) {
                throw new RuntimeException('evidence_amendment_change_order_required');
            }
            $this->assertReleasedEvidenceChangeAuthority($db, $sourceChangeOrderId, $record, $sourceVersionId, $input);
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
        $this->assertEvidenceVersionReplayEquivalent($version, [
            'evidence_record_id' => (string)$record['evidence_record_id'],
            'package_hash_sha256' => (string)$package['package_hash_sha256'],
            'manifest_hash_sha256' => (string)$package['manifest_hash_sha256'],
            'canonical_payload_hash_sha256' => (string)$package['canonical_payload_hash_sha256'],
            'readable_snapshot_hash_sha256' => (string)$package['readable_snapshot_hash_sha256'],
            'source_version_id' => $sourceVersionId,
            'source_change_order_id' => $sourceChangeOrderId,
        ]);

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
            ':metadata' => $this->json([
                'publication_boundary' => 'async_read_only_replica',
                'source_change_order_id' => $sourceChangeOrderId,
            ]),
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
            throw new RuntimeException('evidence_signature_event_required');
        }

        $trustedSignerUserId = $this->nullableUuid($input['authenticated_user_id'] ?? $input['signer_user_id'] ?? null);
        $trustedSignerRef = $this->nullableText($input['authenticated_signer_ref'] ?? $input['actor_ref'] ?? $input['actor_id'] ?? null);
        $trustedSessionId = $this->nullableText($input['session_id'] ?? null);
        $trustedOrgId = $this->nullableText($input['org_id'] ?? null);
        $trustedSignatureAction = $this->nullableText($input['signature_action'] ?? null) ?? 'evidence_finalize';
        $persisted = [];
        foreach ($events as $index => $event) {
            if (!is_array($event)) {
                throw new RuntimeException('signature_event_invalid');
            }

            $eventSignerUserId = $this->nullableUuid($event['signer_user_id'] ?? $event['user_id'] ?? null);
            $eventSignerRef = $this->nullableText($event['signer_ref'] ?? $event['actor_ref'] ?? null);
            if ($trustedSignerUserId !== null && $eventSignerUserId !== null && !hash_equals($trustedSignerUserId, $eventSignerUserId)) {
                throw new RuntimeException('signature_authenticated_user_mismatch');
            }
            if ($trustedSignerRef !== null && $eventSignerRef !== null && !hash_equals($trustedSignerRef, $eventSignerRef)) {
                throw new RuntimeException('signature_authenticated_signer_mismatch');
            }
            $signerUserId = $trustedSignerUserId ?? $eventSignerUserId;
            $signerRef = $trustedSignerRef ?? $eventSignerRef;
            if ($signerUserId === null && $signerRef === null) {
                throw new RuntimeException('signature_event_signer_required');
            }

            $meaning = $this->text($event['signature_meaning'] ?? $event['meaning'] ?? '');
            if ($meaning === '') {
                throw new RuntimeException('signature_event_meaning_required');
            }

            $payloadHash = $this->nullableHash($event['signed_payload_hash_sha256'] ?? null)
                ?? (string)$package['manifest_hash_sha256'];
            $this->assertSignedPayloadBelongsToPackage($payloadHash, $package);
            $ceremony = (new ElectronicSignatureService($db))->validateEvidenceSignature($event, [
                'signed_payload_hash_sha256' => $payloadHash,
                'signer_user_id' => $signerUserId,
                'signer_ref' => $signerRef,
                'org_id' => $trustedOrgId,
                'session_id' => $trustedSessionId,
                'signature_action' => $trustedSignatureAction,
            ]);
            $signatureHash = $this->nullableHash($event['signature_hash_sha256'] ?? null)
                ?? hash('sha256', $payloadHash . '|' . ($signerUserId ?? $signerRef) . '|' . $meaning . '|' . $ceremony['auth_result_hash_sha256']);
            $idempotencyKey = $this->nullableText($event['idempotency_key'] ?? null)
                ?? hash('sha256', (string)$version['evidence_version_id'] . '|signature|' . $index . '|' . $signatureHash);

            $row = $db->queryOne(
                "WITH inserted AS (
                    INSERT INTO signature_events
                        (signed_object_type, signed_object_id, signed_object_version, signer_user_id, signer_ref,
                         signer_role, signature_meaning, signature_state, signed_payload_hash_sha256,
                         signature_hash_sha256, auth_challenge_id, auth_method, auth_result_hash_sha256,
                         signer_identity_snapshot, displayed_record_hash_sha256, signature_manifestation,
                         signed_at, idempotency_key, metadata)
                    VALUES
                        ('evidence_version', :signed_object_id, :signed_object_version, CAST(:signer_user_id AS uuid), :signer_ref,
                         :signer_role, :signature_meaning, :signature_state, :signed_payload_hash_sha256,
                         :signature_hash_sha256, :auth_challenge_id, :auth_method, :auth_result_hash_sha256,
                         CAST(:signer_identity_snapshot AS jsonb), :displayed_record_hash_sha256, :signature_manifestation,
                         CAST(:signed_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
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
                    ':auth_challenge_id' => $ceremony['auth_challenge_id'],
                    ':auth_method' => $ceremony['auth_method'],
                    ':auth_result_hash_sha256' => $ceremony['auth_result_hash_sha256'],
                    ':signer_identity_snapshot' => $this->json($ceremony['signer_identity_snapshot']),
                    ':displayed_record_hash_sha256' => $ceremony['displayed_record_hash_sha256'],
                    ':signature_manifestation' => $ceremony['signature_manifestation'],
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
                $this->assertSignatureConflictEquivalent($row, [
                    'signed_object_type' => 'evidence_version',
                    'signed_object_id' => (string)$version['evidence_version_id'],
                    'signature_meaning' => $meaning,
                    'signed_payload_hash_sha256' => $payloadHash,
                    'signature_hash_sha256' => $signatureHash,
                    'auth_challenge_id' => $ceremony['auth_challenge_id'],
                    'auth_method' => $ceremony['auth_method'],
                    'auth_result_hash_sha256' => $ceremony['auth_result_hash_sha256'],
                    'displayed_record_hash_sha256' => $ceremony['displayed_record_hash_sha256'],
                    'signer_user_id' => $signerUserId,
                    'signer_ref' => $signerRef,
                ]);
                $persisted[] = $row;
            }
        }

        if ($persisted === []) {
            throw new RuntimeException('evidence_signature_event_required');
        }

        return $persisted;
    }

    /**
     * @param array<string, mixed> $input
     */
    private function assertSourceSubmissionAttemptAccepted(object $db, array $input, array $package): void
    {
        $attemptId = $this->nullableUuid($input['source_attempt_id'] ?? $input['frm_submission_attempt_id'] ?? null);
        if ($attemptId === null) {
            if ($this->requiresAcceptedSourceAttempt($input)) {
                throw new RuntimeException('source_submission_attempt_required');
            }
            return;
        }

        $issuanceId = $this->nullableUuid($input['source_issuance_id'] ?? $input['frm_issuance_id'] ?? null);
        $schemaVersionId = $this->nullableUuid($input['source_schema_version_id'] ?? $input['frm_schema_version_id'] ?? null);
        $row = $db->queryOne(
            "SELECT
                a.frm_submission_attempt_id,
                a.frm_issuance_id,
	                vr.schema_version_id,
	                a.attempt_state,
	                vr.validation_state,
	                a.original_hash_sha256,
	                vr.canonical_payload_hash_sha256,
	                vr.original_artifact_hash_sha256
	             FROM frm_submission_attempts a
	             LEFT JOIN submission_validation_results vr
               ON vr.frm_submission_attempt_id = a.frm_submission_attempt_id
             WHERE a.frm_submission_attempt_id = CAST(:attempt_id AS uuid)
             ORDER BY vr.created_at DESC NULLS LAST
             LIMIT 1",
            [':attempt_id' => $attemptId],
        );

        if (!is_array($row) || $this->text($row['frm_submission_attempt_id'] ?? '') === '') {
            throw new RuntimeException('source_submission_attempt_not_found');
        }
        if (!in_array($this->text($row['attempt_state'] ?? ''), ['accepted', 'valid'], true)) {
            throw new RuntimeException('source_submission_attempt_not_accepted');
        }
        $validationState = $this->text($row['validation_state'] ?? '');
        if ($validationState !== '' && !in_array($validationState, ['passed', 'accepted'], true)) {
            throw new RuntimeException('source_submission_attempt_validation_not_passed');
        }
        if ($issuanceId !== null && $this->nullableUuid($row['frm_issuance_id'] ?? null) !== $issuanceId) {
            throw new RuntimeException('source_submission_attempt_issuance_mismatch');
        }
        if ($schemaVersionId !== null && $this->nullableUuid($row['schema_version_id'] ?? null) !== $schemaVersionId) {
            throw new RuntimeException('source_submission_attempt_schema_mismatch');
        }
        $this->assertSourceAttemptHashMatches(
            $this->nullableHash($row['canonical_payload_hash_sha256'] ?? null),
            $this->nullableHash($package['canonical_payload_hash_sha256'] ?? null),
            'source_submission_attempt_canonical_payload_hash_missing',
            'source_submission_attempt_canonical_payload_mismatch',
        );
        $this->assertSourceAttemptHashMatches(
            $this->nullableHash($row['original_artifact_hash_sha256'] ?? null) ?? $this->nullableHash($row['original_hash_sha256'] ?? null),
            $this->nullableHash($package['artifacts']['original']['sha256'] ?? null),
            'source_submission_attempt_original_artifact_hash_missing',
            'source_submission_attempt_original_artifact_mismatch',
        );
    }

    private function assertSourceAttemptHashMatches(?string $sourceHash, ?string $packageHash, string $missingCode, string $mismatchCode): void
    {
        if ($sourceHash === null || $packageHash === null) {
            throw new RuntimeException($missingCode);
        }
        if (!hash_equals($sourceHash, $packageHash)) {
            throw new RuntimeException($mismatchCode);
        }
    }

    /**
     * @param array<string, mixed> $package
     */
    private function assertSignedPayloadBelongsToPackage(string $payloadHash, array $package): void
    {
        $allowed = array_filter([
            $this->nullableHash($package['manifest_hash_sha256'] ?? null),
            $this->nullableHash($package['package_hash_sha256'] ?? null),
            $this->nullableHash($package['canonical_payload_hash_sha256'] ?? null),
            $this->nullableHash($package['readable_snapshot_hash_sha256'] ?? null),
        ]);
        foreach ($allowed as $allowedHash) {
            if (hash_equals((string)$allowedHash, $payloadHash)) {
                return;
            }
        }

        throw new RuntimeException('signature_payload_hash_not_in_evidence_package');
    }

    /**
     * @param array<string, mixed> $input
     */
    private function requiresAcceptedSourceAttempt(array $input): bool
    {
        if ($this->nullableUuid($input['source_issuance_id'] ?? $input['frm_issuance_id'] ?? null) !== null) {
            return true;
        }
        foreach (['subject_type', 'evidence_origin', 'capture_channel', 'source_type'] as $key) {
            $value = strtolower($this->text($input[$key] ?? ''));
            foreach (['form', 'offline', 'online', 'submission', 'excel'] as $marker) {
                if ($value !== '' && str_contains($value, $marker)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    private function assertEvidenceRecordReplayEquivalent(array $row, array $expected): void
    {
        foreach (['evidence_key', 'subject_type', 'subject_id', 'source_issuance_id', 'source_attempt_id'] as $field) {
            if (array_key_exists($field, $row) && $this->text($row[$field]) !== $this->text($expected[$field] ?? '')) {
                throw new RuntimeException('evidence_record_idempotency_conflict');
            }
        }
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    private function assertEvidenceVersionReplayEquivalent(array $row, array $expected): void
    {
        foreach (['evidence_record_id', 'package_hash_sha256', 'manifest_hash_sha256', 'canonical_payload_hash_sha256', 'readable_snapshot_hash_sha256', 'source_version_id', 'source_change_order_id'] as $field) {
            if (array_key_exists($field, $row) && $this->text($row[$field]) !== $this->text($expected[$field] ?? '')) {
                throw new RuntimeException('evidence_version_idempotency_conflict');
            }
        }
    }

    /**
     * @param array<string, mixed> $record
     * @param array<string, mixed> $input
     */
    private function assertReleasedEvidenceChangeAuthority(object $db, string $changeOrderId, array $record, string $sourceVersionId, array $input): void
    {
        if (!method_exists($db, 'query')) {
            throw new RuntimeException('authoritative_change_authority_store_required');
        }

        $fieldPaths = $this->fieldPaths($input['field_paths'] ?? $input['affected_fields'] ?? ['canonical_payload']);
        $rows = $db->query(
            "SELECT
                co.plm_change_order_id::text AS plm_change_order_id,
                co.change_order_number,
                co.status,
                cao.object_type,
                cao.object_id,
                cao.affected_fields,
                eff.plm_change_effectivity_id::text AS plm_change_effectivity_id,
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
               AND (cao.object_id = :source_version_id OR cao.object_id = :evidence_record_id)
               AND cao.disposition = 'accepted'
             ORDER BY eff.effective_from DESC",
            [
                ':change_order_id' => $changeOrderId,
                ':source_version_id' => $sourceVersionId,
                ':evidence_record_id' => $this->text($record['evidence_record_id'] ?? ''),
            ],
        );

        foreach (is_array($rows) ? $rows : [] as $row) {
            if (!is_array($row) || $this->text($row['plm_change_effectivity_id'] ?? '') === '') {
                continue;
            }
            if (!$this->fieldListCovers($row['affected_fields'] ?? null, $fieldPaths)) {
                continue;
            }
            if (!$this->effectivityScopeMatches($row, $input)) {
                continue;
            }
            return;
        }

        throw new RuntimeException('evidence_finalization_change_authority_not_verified');
    }

    /**
     * @return list<string>
     */
    private function fieldPaths(mixed $raw): array
    {
        if (is_string($raw) && trim($raw) !== '') {
            return [trim($raw)];
        }
        if (!is_array($raw)) {
            return [];
        }
        $paths = [];
        foreach ($raw as $value) {
            $text = $this->text($value);
            if ($text !== '') {
                $paths[] = $text;
            }
        }
        return array_values(array_unique($paths));
    }

    /**
     * @param list<string> $fieldPaths
     */
    private function fieldListCovers(mixed $raw, array $fieldPaths): bool
    {
        $available = $this->textList($raw);
        foreach ($fieldPaths as $path) {
            if (!in_array(strtolower($path), $available, true)) {
                return false;
            }
        }
        return $fieldPaths !== [];
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
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $this->textList($decoded);
        }
        $text = trim($raw, "{}");
        return array_values(array_unique(array_filter(array_map(
            static fn(string $value): string => strtolower(trim($value, " \t\n\r\0\x0B\"'")),
            str_getcsv($text, ',', '"', '\\'),
        ))));
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $input
     */
    private function effectivityScopeMatches(array $row, array $input): bool
    {
        $scopeRaw = $row['effectivity_scope'] ?? [];
        if (is_string($scopeRaw)) {
            $decoded = json_decode($scopeRaw, true);
            $scopeRaw = is_array($decoded) ? $decoded : [];
        }
        $scope = is_array($scopeRaw) ? $scopeRaw : [];
        $context = is_array($input['effectivity'] ?? null) ? $input['effectivity'] : (is_array($input['effectivity_context'] ?? null) ? $input['effectivity_context'] : $input);
        foreach (['site', 'plant', 'product', 'lot', 'serial', 'order_id', 'role'] as $key) {
            if (!array_key_exists($key, $scope)) {
                continue;
            }
            $actual = $context[$key] ?? $context['effectivity_' . $key] ?? null;
            $expected = $scope[$key];
            if (is_array($expected)) {
                if (!in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ((string)$expected !== (string)$actual) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    private function assertSignatureConflictEquivalent(array $row, array $expected): void
    {
        foreach (['signed_object_type', 'signed_object_id', 'signature_meaning', 'signed_payload_hash_sha256', 'signature_hash_sha256', 'auth_challenge_id', 'auth_method', 'auth_result_hash_sha256', 'displayed_record_hash_sha256'] as $field) {
            if (isset($row[$field]) && $this->text($row[$field]) !== $this->text($expected[$field] ?? '')) {
                throw new RuntimeException('evidence_finalization_idempotency_conflict');
            }
        }

        $rowSignerUserId = $this->nullableUuid($row['signer_user_id'] ?? null);
        $expectedSignerUserId = $this->nullableUuid($expected['signer_user_id'] ?? null);
        if ($rowSignerUserId !== null || $expectedSignerUserId !== null) {
            if ($rowSignerUserId !== $expectedSignerUserId) {
                throw new RuntimeException('evidence_finalization_idempotency_conflict');
            }
            return;
        }

        if (isset($row['signer_ref']) && $this->text($row['signer_ref']) !== $this->text($expected['signer_ref'] ?? '')) {
            throw new RuntimeException('evidence_finalization_idempotency_conflict');
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
