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
                     finalized_at, finalized_by_user_id, idempotency_key, metadata)
                VALUES
                    (CAST(:evidence_record_id AS uuid), :version_no, 'locked', :amendment_no,
                     CAST(:source_version_id AS uuid), CAST(:source_change_order_id AS uuid),
                     CAST(:canonical_payload AS jsonb), :package_hash_sha256, :manifest_hash_sha256,
                     :canonical_payload_hash_sha256, :readable_snapshot_hash_sha256,
                     now(), CAST(:finalized_by_user_id AS uuid), :idempotency_key, CAST(:metadata AS jsonb))
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
                ':finalized_by_user_id' => $this->nullableUuid($input['finalized_by_user_id'] ?? $input['authenticated_user_id'] ?? $input['actor_id'] ?? null),
                ':idempotency_key' => $idempotencyBase !== null ? $idempotencyBase . ':version' : null,
                ':metadata' => $this->json([
                    'finalization_state' => 'finalized',
                    'record_content_hash_sha256' => (string)($package['record_content_hash_sha256'] ?? ''),
                ]),
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
            $this->assertArtifactPersisted($artifacts[$role], $role, $artifact);
        }

        $signatureEvents = $this->persistSignatureEvents($db, $input, $package, $record, $version);
        $retentionLock = (new RetentionLockService($db))->ensureForFinalEvidence($record, $version, [
            'package_hash_sha256' => (string)$package['package_hash_sha256'],
        ] + $input);
        if (!is_array($retentionLock) || $this->text($retentionLock['retention_lock_id'] ?? '') === '' || $this->text($retentionLock['lock_state'] ?? 'active') !== 'active') {
            throw new RuntimeException('retention_lock_required_for_final_evidence');
        }

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
                ':publication_state' => $this->text($publicationState['publication_state'] ?? $publicationState['state'] ?? 'pending') ?: 'pending',
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
        if (!is_array($publication) || $this->text($publication['evidence_publication_id'] ?? '') === '') {
            throw new RuntimeException('evidence_publication_state_record_required');
        }
        if ($this->text($publication['publication_state'] ?? '') !== $this->text($publicationState['publication_state'] ?? $publicationState['state'] ?? 'pending')) {
            throw new RuntimeException('evidence_publication_state_mismatch');
        }

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

        $this->persistFinalizationAuditEvent($db, $input, $package, $record, $version, $signatureEvents, $retentionLock, $publication);

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
        if ($this->text($row['attempt_state'] ?? '') !== 'accepted') {
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
            $this->nullableHash($package['record_content_hash_sha256'] ?? null),
        ]);
        foreach ($allowed as $allowedHash) {
            if (hash_equals((string)$allowedHash, $payloadHash)) {
                return;
            }
        }

        throw new RuntimeException('signature_payload_hash_not_in_evidence_package');
    }

    /**
     * @param array<string, mixed>|mixed $row
     * @param array<string, mixed> $artifact
     */
    private function assertArtifactPersisted(mixed $row, string $role, array $artifact): void
    {
        if (!is_array($row) || $this->text($row['evidence_artifact_id'] ?? '') === '') {
            throw new RuntimeException('evidence_artifact_persistence_required_' . $role);
        }
        if ($this->text($row['artifact_role'] ?? '') !== $role) {
            throw new RuntimeException('evidence_artifact_role_mismatch_' . $role);
        }
        if (!hash_equals($this->text($artifact['sha256'] ?? ''), $this->text($row['sha256'] ?? ''))) {
            throw new RuntimeException('evidence_artifact_hash_mismatch_' . $role);
        }
        if ($this->text($row['storage_uri'] ?? '') === '') {
            throw new RuntimeException('evidence_artifact_storage_uri_required_' . $role);
        }
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $package
     * @param array<string, mixed> $record
     * @param array<string, mixed> $version
     * @param list<array<string, mixed>> $signatureEvents
     * @param array<string, mixed> $retentionLock
     * @param array<string, mixed> $publication
     */
    private function persistFinalizationAuditEvent(
        object $db,
        array $input,
        array $package,
        array $record,
        array $version,
        array $signatureEvents,
        array $retentionLock,
        array $publication,
    ): void {
        if (!method_exists($db, 'queryOne')) {
            throw new RuntimeException('authoritative_audit_store_required_for_finalization');
        }

        $recordId = $this->text($record['evidence_record_id'] ?? '');
        $versionId = $this->text($version['evidence_version_id'] ?? '');
        if ($recordId === '' || $versionId === '') {
            throw new RuntimeException('finalization_audit_subject_required');
        }

        $payload = [
            'evidence_record_id' => $recordId,
            'evidence_version_id' => $versionId,
            'package_hash_sha256' => (string)$package['package_hash_sha256'],
            'manifest_hash_sha256' => (string)$package['manifest_hash_sha256'],
            'record_content_hash_sha256' => (string)($package['record_content_hash_sha256'] ?? ''),
            'source_attempt_id' => $this->nullableUuid($input['source_attempt_id'] ?? $input['frm_submission_attempt_id'] ?? null),
            'source_issuance_id' => $this->nullableUuid($input['source_issuance_id'] ?? $input['frm_issuance_id'] ?? null),
            'source_change_order_id' => $this->nullableUuid($input['source_change_order_id'] ?? $input['change_order_id'] ?? null),
            'signature_event_ids' => array_values(array_filter(array_map(
                fn(array $event): string => $this->text($event['signature_event_id'] ?? ''),
                $signatureEvents,
            ))),
            'retention_lock_id' => $this->text($retentionLock['retention_lock_id'] ?? ''),
            'evidence_publication_id' => $this->text($publication['evidence_publication_id'] ?? ''),
        ];
        $metadata = array_filter([
            'authority' => 'EvidenceFinalizationService',
            'authoritative_audit_required' => true,
            'canonical_hash_contract' => 'AuditTrail.canonicalHashRecord.v1',
            'org_id' => $this->nullableText($input['org_id'] ?? null),
            'session_id' => $this->nullableText($input['session_id'] ?? null),
        ], static fn(mixed $value): bool => $value !== null && $value !== '');
        $actorUuid = $this->nullableUuid($input['authenticated_user_id'] ?? $input['finalized_by_user_id'] ?? $input['actor_id'] ?? null);
        $actorRef = $this->nullableText($input['authenticated_signer_ref'] ?? $input['actor_ref'] ?? $input['actor_id'] ?? null);
        $actorOriginal = $actorUuid ?? $actorRef ?? '';
        $eventId = $this->deterministicUuid('evidence.finalized|' . $recordId . '|' . $versionId . '|' . (string)$package['package_hash_sha256']);

        $existing = $db->queryOne(
            "SELECT event_id, event_type, aggregate_type, aggregate_id, payload, metadata,
                    source_event_hash, aggregate_sequence
             FROM audit_events
             WHERE event_id = CAST(:event_id AS uuid)
               AND event_type = 'evidence.finalized'
               AND aggregate_type = 'evidence_record'
               AND aggregate_id = :aggregate_id
             LIMIT 1",
            [
                ':event_id' => $eventId,
                ':aggregate_id' => $recordId,
            ],
        );
        if (is_array($existing) && $this->text($existing['event_type'] ?? '') === 'evidence.finalized') {
            $this->assertFinalizationAuditEventVerifiable($existing, $payload);
            return;
        }

        $db->queryOne(
            'SELECT pg_advisory_xact_lock(hashtext(:audit_chain_key)) AS locked',
            [':audit_chain_key' => 'audit_events|evidence_record|' . $recordId],
        );
        $chain = $db->queryOne(
            "SELECT
                COALESCE(MAX(aggregate_sequence), 0) + 1 AS next_sequence,
                COALESCE(
                    (ARRAY_AGG(COALESCE(source_event_hash, metadata -> 'audit_chain' ->> 'event_hash')
                        ORDER BY COALESCE(aggregate_sequence, 0) DESC, recorded_at DESC))[1],
                    ''
                ) AS prev_hash
             FROM audit_events
             WHERE aggregate_type = 'evidence_record'
               AND aggregate_id = :aggregate_id",
            [':aggregate_id' => $recordId],
        );
        $aggregateSequence = max(1, (int)($chain['next_sequence'] ?? 1));
        $prevHash = $this->text($chain['prev_hash'] ?? '');
        $recordedAt = gmdate('Y-m-d\TH:i:s.v\Z');
        $eventHash = $this->canonicalAuditEventHash([
            'event_id' => $eventId,
            'event_type' => 'evidence.finalized',
            'aggregate_type' => 'evidence_record',
            'aggregate_id' => $recordId,
            'actor_id' => $actorOriginal,
            'payload' => $payload,
            'metadata' => $metadata,
            'esig_reason' => null,
            'recorded_at' => $recordedAt,
            'prev_hash' => $prevHash,
        ]);

        $row = $db->queryOne(
            "WITH inserted AS (
                 INSERT INTO audit_events
                    (event_id, event_type, aggregate_type, aggregate_id, actor_id, actor_name,
                     payload, metadata, recorded_at, source_event_hash, aggregate_sequence)
                 VALUES
                    (CAST(:event_id AS uuid), 'evidence.finalized', 'evidence_record', :aggregate_id,
                     CAST(:actor_id AS uuid), :actor_name, CAST(:payload AS jsonb),
                     CAST(:metadata AS jsonb) || jsonb_build_object(
                        'audit_chain',
                        jsonb_build_object(
                            'prev_hash', :prev_hash,
                            'event_hash', :event_hash,
                            'esig_reason', NULL,
                            'original_actor_id', :actor_original
                        )
                     ),
                     CAST(:recorded_at AS timestamptz),
                     :event_hash,
                     :aggregate_sequence)
                 ON CONFLICT DO NOTHING
                 RETURNING event_id, event_type, aggregate_type, aggregate_id, payload,
                           source_event_hash, aggregate_sequence, metadata
             )
             SELECT event_id, event_type, aggregate_type, aggregate_id, payload,
                    source_event_hash, aggregate_sequence, metadata
             FROM inserted
             UNION ALL
             SELECT event_id, event_type, aggregate_type, aggregate_id, payload,
                    source_event_hash, aggregate_sequence, metadata
             FROM audit_events
             WHERE event_id = CAST(:event_id AS uuid)
               AND event_type = 'evidence.finalized'
               AND aggregate_type = 'evidence_record'
               AND aggregate_id = :aggregate_id
             LIMIT 1",
            [
                ':event_id' => $eventId,
                ':aggregate_id' => $recordId,
                ':actor_id' => $actorUuid,
                ':actor_name' => $actorUuid === null ? $actorRef : null,
                ':actor_original' => $actorOriginal,
                ':payload' => $this->json($payload),
                ':metadata' => $this->json($metadata),
                ':recorded_at' => $recordedAt,
                ':event_hash' => $eventHash,
                ':prev_hash' => $prevHash,
                ':aggregate_sequence' => $aggregateSequence,
            ],
        );
        if (!is_array($row)) {
            throw new RuntimeException('finalization_audit_event_required');
        }
        $this->assertFinalizationAuditEventVerifiable($row, $payload);
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expectedPayload
     */
    private function assertFinalizationAuditEventVerifiable(array $row, array $expectedPayload): void
    {
        $eventHash = $this->nullableHash($row['source_event_hash'] ?? $row['event_hash'] ?? null);
        $metadata = $this->arrayValue($row['metadata'] ?? []);
        $chain = $this->arrayValue($metadata['audit_chain'] ?? []);
        $chainHash = $this->nullableHash($chain['event_hash'] ?? null);
        if ($this->text($row['event_type'] ?? '') !== 'evidence.finalized'
            || $this->text($row['aggregate_type'] ?? '') !== 'evidence_record'
            || (int)($row['aggregate_sequence'] ?? 0) < 1
            || $eventHash === null
            || $chainHash === null
            || !hash_equals($eventHash, $chainHash)
        ) {
            throw new RuntimeException('finalization_audit_event_required');
        }

        $payload = $this->arrayValue($row['payload'] ?? []);
        foreach (['evidence_record_id', 'evidence_version_id', 'package_hash_sha256', 'manifest_hash_sha256'] as $field) {
            if ($this->text($payload[$field] ?? '') !== $this->text($expectedPayload[$field] ?? '')) {
                throw new RuntimeException('finalization_audit_event_payload_mismatch');
            }
        }
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

    private function deterministicUuid(string $seed): string
    {
        $hex = substr(hash('sha256', $seed), 0, 32);
        $hex[12] = '5';
        $hex[16] = dechex((hexdec($hex[16]) & 0x3) | 0x8);

        return substr($hex, 0, 8) . '-'
            . substr($hex, 8, 4) . '-'
            . substr($hex, 12, 4) . '-'
            . substr($hex, 16, 4) . '-'
            . substr($hex, 20, 12);
    }

    /**
     * Mirrors AuditTrail::canonicalHashRecord() so evidence finalization events
     * can be verified by the same tamper-evident event-hash contract.
     *
     * @param array<string, mixed> $event
     */
    private function canonicalAuditEventHash(array $event): string
    {
        $metadata = is_array($event['metadata'] ?? null) ? $event['metadata'] : [];
        unset($metadata['audit_chain'], $metadata['esig']);

        $record = [
            'event_id' => (string)($event['event_id'] ?? ''),
            'event_type' => (string)($event['event_type'] ?? ''),
            'aggregate_type' => (string)($event['aggregate_type'] ?? ''),
            'aggregate_id' => (string)($event['aggregate_id'] ?? ''),
            'actor_id' => (string)($event['actor_id'] ?? ''),
            'payload' => is_array($event['payload'] ?? null) ? $event['payload'] : [],
            'metadata' => $metadata,
            'esig_reason' => $event['esig_reason'] ?? null,
            'recorded_at' => (string)($event['recorded_at'] ?? ''),
            'prev_hash' => (string)($event['prev_hash'] ?? ''),
        ];

        $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('finalization_audit_hash_encode_failed');
        }

        return hash('sha256', $json);
    }

    /**
     * @return array<string, mixed>
     */
    private function arrayValue(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
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
