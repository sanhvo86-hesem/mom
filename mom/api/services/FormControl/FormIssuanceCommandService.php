<?php

declare(strict_types=1);

namespace MOM\Services\FormControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use MOM\Services\ControlPlane\EqmsFormExecutionService;
use RuntimeException;

/**
 * Canonical form-control writer for issuance and submission attempts. Offline
 * Excel remains a carrier; `frm_issuances` and `frm_submission_attempts` are
 * the operational ledger.
 */
final class FormIssuanceCommandService
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
    public function issue(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $deliveryMode = $this->deliveryMode($input['delivery_mode'] ?? '');
        $templateRevisionId = $this->requiredUuid($input, 'frm_template_revision_id');
        $schemaVersionId = $this->requiredUuid($input, 'frm_schema_version_id');
        if ($templateRevisionId === $schemaVersionId) {
            throw new RuntimeException('template_revision_schema_version_must_be_distinct');
        }
        $templateRevision = $this->loadTemplateRevision($db, $templateRevisionId);
        $schemaVersion = $this->loadSchemaVersion($db, $schemaVersionId, $templateRevisionId);
        $manifest = (new EqmsFormExecutionService())->buildIssuanceManifest(
            $templateRevision,
            $schemaVersion,
            [
                'delivery_mode' => $deliveryMode,
                'issued_record_id' => $this->requiredText($input, 'issued_record_id'),
                'allocation_id' => $this->requiredText($input, 'allocation_id'),
                'subject' => is_array($input['subject'] ?? null) ? $input['subject'] : ($input['issued_for_context'] ?? []),
                'effectivity_context' => is_array($input['effectivity_context'] ?? null) ? $input['effectivity_context'] : [],
            ],
        );
        $callerManifestHash = $this->nullableSha256($input['issuance_manifest_hash_sha256'] ?? $input['carrier_manifest_hash_sha256'] ?? null);
        if ($callerManifestHash !== null && !hash_equals($callerManifestHash, (string)$manifest['carrier_manifest_hash_sha256'])) {
            throw new RuntimeException('issuance_manifest_hash_mismatch');
        }

        $row = $db->queryOne(
            "INSERT INTO frm_issuances
                (allocation_id, issued_record_id, frm_template_revision_id, frm_schema_version_id,
                 issuance_no, delivery_mode, issuance_state, issued_to_user_id, issued_to_ref,
                 issued_for_context, issued_artifact_uri, issuance_manifest_hash_sha256, expires_at,
                 idempotency_key, metadata)
             VALUES
                (:allocation_id, :issued_record_id, CAST(:frm_template_revision_id AS uuid),
                 CAST(:frm_schema_version_id AS uuid), :issuance_no, :delivery_mode, 'issued',
                 CAST(:issued_to_user_id AS uuid), :issued_to_ref, CAST(:issued_for_context AS jsonb),
                 :issued_artifact_uri, :issuance_manifest_hash_sha256, CAST(:expires_at AS timestamptz),
                 :idempotency_key, CAST(:metadata AS jsonb))
             ON CONFLICT (allocation_id) DO UPDATE SET
                 updated_at = now(),
                 metadata = frm_issuances.metadata || EXCLUDED.metadata
             RETURNING *",
            [
                ':allocation_id' => $this->requiredText($input, 'allocation_id'),
                ':issued_record_id' => $this->requiredText($input, 'issued_record_id'),
                ':frm_template_revision_id' => $templateRevisionId,
                ':frm_schema_version_id' => $schemaVersionId,
                ':issuance_no' => max(1, (int)($input['issuance_no'] ?? 1)),
                ':delivery_mode' => $deliveryMode,
                ':issued_to_user_id' => $this->nullableUuid($input['issued_to_user_id'] ?? null),
                ':issued_to_ref' => $this->nullableText($input['issued_to_ref'] ?? $actorRef),
                ':issued_for_context' => $this->json($input['issued_for_context'] ?? $input['subject'] ?? []),
                ':issued_artifact_uri' => $this->nullableText($input['issued_artifact_uri'] ?? null),
                ':issuance_manifest_hash_sha256' => (string)$manifest['carrier_manifest_hash_sha256'],
                ':expires_at' => $this->nullableText($input['expires_at'] ?? null),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'FormIssuanceCommandService',
                    'actor_ref' => $actorRef,
                    'server_authoritative_validation' => true,
                    'offline_excel_role' => 'controlled_capture_carrier',
                    'template_revision_id' => $templateRevisionId,
                    'schema_version_id' => $schemaVersionId,
                    'issuance_manifest' => $manifest,
                ]),
            ],
        );
        if (!is_array($row) || $this->text($row['frm_issuance_id'] ?? '') === '') {
            throw new RuntimeException('form_issuance_persistence_failed');
        }

        return [
            'authority' => 'canonical_form_control',
            'issuance' => $row,
            'issuance_manifest' => $manifest,
            'version_semantics' => [
                'template_revision_id' => $templateRevisionId,
                'schema_version_id' => $schemaVersionId,
                'legacy_form_schemas_role' => 'compatibility_not_runtime_authority',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function recordSubmissionAttempt(array $input, string $actorRef): array
    {
        $db = $this->requireDb();
        $issuanceId = $this->requiredUuid($input, 'frm_issuance_id');
        $issuance = $this->loadIssuanceForSubmission($db, $issuanceId);
        $carrierManifest = $this->carrierManifestFromInputOrIssuance($input, $issuance);
        $submission = is_array($input['submission'] ?? null) ? $input['submission'] : $input;
        if (!isset($submission['original_artifact_hash_sha256']) && isset($submission['original_hash_sha256'])) {
            $submission['original_artifact_hash_sha256'] = $submission['original_hash_sha256'];
        }
        $serverValidation = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            $issuance,
            $carrierManifest,
            $submission,
            $this->knownFingerprints($db, $submission),
        );
        $attemptState = $this->attemptStateFromValidation($serverValidation);
        $hash = $this->nullableSha256($input['original_hash_sha256'] ?? $input['original_artifact_hash_sha256'] ?? null);
        $hash = $this->nullableSha256($serverValidation['original_artifact_hash_sha256'] ?? null) ?? $hash;
        $validationErrors = is_array($serverValidation['errors'] ?? null) ? $serverValidation['errors'] : [];
        $canonicalPayloadHash = $this->nullableSha256($serverValidation['canonical_payload_hash_sha256'] ?? null);
        $duplicate = is_array($serverValidation['duplicate'] ?? null) ? $serverValidation['duplicate'] : null;

        $row = $db->queryOne(
            "INSERT INTO frm_submission_attempts
                (frm_issuance_id, attempt_no, attempt_state, submitted_by_user_id, submitted_by_ref,
                 original_artifact_uri, original_hash_sha256, parsed_payload, validation_errors,
                 duplicate_of_attempt_id, idempotency_key, metadata)
             VALUES
                (CAST(:frm_issuance_id AS uuid), :attempt_no, :attempt_state, CAST(:submitted_by_user_id AS uuid),
                 :submitted_by_ref, :original_artifact_uri, :original_hash_sha256, CAST(:parsed_payload AS jsonb),
                 CAST(:validation_errors AS jsonb), CAST(:duplicate_of_attempt_id AS uuid), :idempotency_key,
                 CAST(:metadata AS jsonb))
             ON CONFLICT (frm_issuance_id, attempt_no) DO UPDATE SET
                 attempt_state = EXCLUDED.attempt_state,
                 validation_errors = EXCLUDED.validation_errors,
                 updated_at = now()
             RETURNING *",
            [
                ':frm_issuance_id' => $issuanceId,
                ':attempt_no' => max(1, (int)($input['attempt_no'] ?? 1)),
                ':attempt_state' => $attemptState,
                ':submitted_by_user_id' => $this->nullableUuid($input['submitted_by_user_id'] ?? null),
                ':submitted_by_ref' => $this->nullableText($input['submitted_by_ref'] ?? $actorRef),
                ':original_artifact_uri' => $this->nullableText($input['original_artifact_uri'] ?? null),
                ':original_hash_sha256' => $hash,
                ':parsed_payload' => $this->json($input['parsed_payload'] ?? $input['canonical_payload'] ?? []),
                ':validation_errors' => $this->json($validationErrors),
                ':duplicate_of_attempt_id' => $this->nullableUuid($duplicate['frm_submission_attempt_id'] ?? $input['duplicate_of_attempt_id'] ?? null),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'FormIssuanceCommandService',
                    'actor_ref' => $actorRef,
                    'server_authoritative_validation' => true,
                    'carrier_role' => 'offline_or_online_capture_not_source_of_truth',
                ]),
            ],
        );
        if (!is_array($row) || $this->text($row['frm_submission_attempt_id'] ?? '') === '') {
            throw new RuntimeException('form_submission_attempt_persistence_failed');
        }

        $validationInput = array_merge($input, [
            'validation_state' => (string)$serverValidation['validation_state'],
            'validation_errors' => $validationErrors,
            'validation_summary' => $serverValidation,
            'canonical_payload_hash_sha256' => $canonicalPayloadHash,
            'original_artifact_hash_sha256' => $hash,
            'frm_schema_version_id' => $issuance['schema_version_id'] ?? $issuance['frm_schema_version_id'] ?? null,
            'validator_version' => 'server_submission_validator.v1',
        ]);
        $validation = $this->persistValidationLedger($db, (string)$row['frm_submission_attempt_id'], $validationInput, $attemptState, $hash);
        $fingerprints = $this->persistDuplicateFingerprints($db, (string)$row['frm_submission_attempt_id'], $validationInput, $hash);

        return [
            'authority' => 'canonical_form_control',
            'submission_attempt' => $row,
            'server_validation' => $serverValidation,
            'validation_result' => $validation['result'],
            'validation_errors' => $validation['errors'],
            'duplicate_detection_fingerprints' => $fingerprints,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{result: array<string, mixed>|null, errors: list<array<string, mixed>>}
     */
    private function persistValidationLedger(object $db, string $attemptId, array $input, string $attemptState, ?string $originalHash): array
    {
        $validationState = $this->validationState($input['validation_state'] ?? $this->validationStateForAttempt($attemptState));
        $result = $db->queryOne(
            "INSERT INTO submission_validation_results
                (frm_submission_attempt_id, validation_state, schema_version_id, validator_version,
                 canonical_payload_hash_sha256, original_artifact_hash_sha256, validation_summary)
             VALUES
                (CAST(:frm_submission_attempt_id AS uuid), :validation_state, CAST(:schema_version_id AS uuid),
                 :validator_version, :canonical_payload_hash_sha256, :original_artifact_hash_sha256,
                 CAST(:validation_summary AS jsonb))
             ON CONFLICT (frm_submission_attempt_id, validator_version) DO UPDATE SET
                 validation_state = EXCLUDED.validation_state,
                 canonical_payload_hash_sha256 = EXCLUDED.canonical_payload_hash_sha256,
                 original_artifact_hash_sha256 = EXCLUDED.original_artifact_hash_sha256,
                 validation_summary = EXCLUDED.validation_summary
             RETURNING *",
            [
                ':frm_submission_attempt_id' => $attemptId,
                ':validation_state' => $validationState,
                ':schema_version_id' => $this->nullableUuid($input['schema_version_id'] ?? $input['frm_schema_version_id'] ?? null),
                ':validator_version' => $this->nullableText($input['validator_version'] ?? null) ?? 'submission_validator.v1',
                ':canonical_payload_hash_sha256' => $this->nullableSha256($input['canonical_payload_hash_sha256'] ?? null),
                ':original_artifact_hash_sha256' => $originalHash,
                ':validation_summary' => $this->json($input['validation_summary'] ?? [
                    'attempt_state' => $attemptState,
                    'authority' => 'submission_validation_results',
                ]),
            ],
        );

        $errors = [];
        if (is_array($result) && $this->text($result['submission_validation_result_id'] ?? '') !== '') {
            foreach ($this->validationErrors($input['validation_errors'] ?? []) as $error) {
                $row = $db->queryOne(
                    "INSERT INTO submission_validation_errors
                        (submission_validation_result_id, severity, error_code, field_path, message, remediation_hint)
                     VALUES
                        (CAST(:submission_validation_result_id AS uuid), :severity, :error_code,
                         :field_path, :message, :remediation_hint)
                     RETURNING *",
                    [
                        ':submission_validation_result_id' => (string)$result['submission_validation_result_id'],
                        ':severity' => $error['severity'],
                        ':error_code' => $error['error_code'],
                        ':field_path' => $error['field_path'],
                        ':message' => $error['message'],
                        ':remediation_hint' => $error['remediation_hint'],
                    ],
                );
                if (is_array($row)) {
                    $errors[] = $row;
                }
            }
        }

        return ['result' => is_array($result) ? $result : null, 'errors' => $errors];
    }

    /**
     * @param array<string, mixed> $input
     * @return list<array<string, mixed>>
     */
    private function persistDuplicateFingerprints(object $db, string $attemptId, array $input, ?string $originalHash): array
    {
        $fingerprints = [];
        $scope = $this->fingerprintScope($input['fingerprint_scope'] ?? 'issuance');
        $candidates = [];
        if ($originalHash !== null) {
            $candidates[] = ['artifact_hash', $originalHash];
        }
        $canonicalHash = $this->nullableSha256($input['canonical_payload_hash_sha256'] ?? null);
        if ($canonicalHash !== null) {
            $candidates[] = ['canonical_payload_hash', $canonicalHash];
        }
        foreach (is_array($input['duplicate_fingerprints'] ?? null) ? $input['duplicate_fingerprints'] : [] as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }
            $value = $this->nullableSha256($candidate['fingerprint_value_sha256'] ?? $candidate['value_sha256'] ?? null);
            if ($value !== null) {
                $candidates[] = [$this->fingerprintType($candidate['fingerprint_type'] ?? 'business_key'), $value];
            }
        }

        foreach ($candidates as [$type, $value]) {
            $row = $db->queryOne(
                "INSERT INTO duplicate_detection_fingerprints
                    (fingerprint_scope, fingerprint_type, fingerprint_value_sha256, frm_submission_attempt_id)
                 VALUES
                    (:fingerprint_scope, :fingerprint_type, :fingerprint_value_sha256, CAST(:frm_submission_attempt_id AS uuid))
                 ON CONFLICT (fingerprint_scope, fingerprint_type, fingerprint_value_sha256) DO NOTHING
                 RETURNING *",
                [
                    ':fingerprint_scope' => $scope,
                    ':fingerprint_type' => $this->fingerprintType($type),
                    ':fingerprint_value_sha256' => $value,
                    ':frm_submission_attempt_id' => $attemptId,
                ],
            );
            if (is_array($row)) {
                $fingerprints[] = $row;
            }
        }

        return $fingerprints;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadTemplateRevision(object $db, string $templateRevisionId): array
    {
        $row = $db->queryOne(
            "SELECT frm_template_revision_id, frm_family_id, template_revision, lifecycle_state,
                    template_checksum_sha256, issuance_policy, naming_policy
             FROM frm_template_revisions
             WHERE frm_template_revision_id = CAST(:frm_template_revision_id AS uuid)",
            [':frm_template_revision_id' => $templateRevisionId],
        );
        if (!is_array($row) || $this->text($row['frm_template_revision_id'] ?? '') === '') {
            throw new RuntimeException('form_template_revision_not_found');
        }
        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadSchemaVersion(object $db, string $schemaVersionId, string $templateRevisionId): array
    {
        $row = $db->queryOne(
            "SELECT frm_schema_version_id, frm_template_revision_id, schema_version, lifecycle_state,
                    json_schema, validation_rules, render_profile
             FROM frm_schema_versions
             WHERE frm_schema_version_id = CAST(:frm_schema_version_id AS uuid)
               AND frm_template_revision_id = CAST(:frm_template_revision_id AS uuid)",
            [
                ':frm_schema_version_id' => $schemaVersionId,
                ':frm_template_revision_id' => $templateRevisionId,
            ],
        );
        if (!is_array($row) || $this->text($row['frm_schema_version_id'] ?? '') === '') {
            throw new RuntimeException('form_schema_version_not_found_for_template_revision');
        }
        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadIssuanceForSubmission(object $db, string $issuanceId): array
    {
        $row = $db->queryOne(
            "SELECT fi.frm_issuance_id,
                    fi.allocation_id,
                    fi.issued_record_id,
                    fi.frm_template_revision_id AS template_revision_id,
                    fi.frm_schema_version_id AS schema_version_id,
                    fi.issuance_state,
                    fi.delivery_mode,
                    fi.issuance_manifest_hash_sha256 AS carrier_manifest_hash_sha256,
                    fi.metadata,
                    tr.frm_family_id,
                    tr.template_revision,
                    tr.template_checksum_sha256,
                    sv.schema_version
             FROM frm_issuances fi
             JOIN frm_template_revisions tr ON tr.frm_template_revision_id = fi.frm_template_revision_id
             JOIN frm_schema_versions sv ON sv.frm_schema_version_id = fi.frm_schema_version_id
             WHERE fi.frm_issuance_id = CAST(:frm_issuance_id AS uuid)",
            [':frm_issuance_id' => $issuanceId],
        );
        if (!is_array($row) || $this->text($row['frm_issuance_id'] ?? '') === '') {
            throw new RuntimeException('form_issuance_not_found');
        }
        if (is_string($row['metadata'] ?? null)) {
            $decoded = json_decode((string)$row['metadata'], true);
            if (is_array($decoded)) {
                $row['metadata'] = $decoded;
            }
        }
        return $row;
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $issuance
     * @return array<string, mixed>
     */
    private function carrierManifestFromInputOrIssuance(array $input, array $issuance): array
    {
        if (is_array($input['carrier_manifest'] ?? null)) {
            return $input['carrier_manifest'];
        }
        $metadata = is_array($issuance['metadata'] ?? null) ? $issuance['metadata'] : [];
        if (is_array($metadata['issuance_manifest'] ?? null)) {
            return $metadata['issuance_manifest'];
        }
        return [
            'allocation_id' => (string)($issuance['allocation_id'] ?? ''),
            'issued_record_id' => (string)($issuance['issued_record_id'] ?? ''),
            'template_revision_id' => (string)($issuance['template_revision_id'] ?? ''),
            'schema_version_id' => (string)($issuance['schema_version_id'] ?? ''),
            'carrier_manifest_hash_sha256' => (string)($issuance['carrier_manifest_hash_sha256'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $submission
     * @return list<array<string, mixed>>
     */
    private function knownFingerprints(object $db, array $submission): array
    {
        if (!method_exists($db, 'query')) {
            return [];
        }
        $hashes = array_values(array_filter([
            $this->nullableSha256($submission['original_artifact_hash_sha256'] ?? $submission['original_hash_sha256'] ?? null),
            $this->nullableSha256($submission['canonical_payload_hash_sha256'] ?? null),
        ]));
        if ($hashes === []) {
            return [];
        }

        $rows = $db->query(
            "SELECT *
             FROM duplicate_detection_fingerprints
             WHERE fingerprint_value_sha256 IN (:hash_a, :hash_b)",
            [
                ':hash_a' => $hashes[0] ?? '',
                ':hash_b' => $hashes[1] ?? $hashes[0] ?? '',
            ],
        );
        return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
    }

    /**
     * @param array<string, mixed> $validation
     */
    private function attemptStateFromValidation(array $validation): string
    {
        if (is_array($validation['duplicate'] ?? null)) {
            return 'duplicate';
        }
        return (string)($validation['validation_state'] ?? '') === 'passed' ? 'valid' : 'invalid';
    }

    private function requireDb(): object
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('canonical_form_store_required');
        }
        return $this->db;
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

    private function deliveryMode(mixed $value): string
    {
        $mode = strtolower($this->text($value));
        if (!in_array($mode, ['online', 'offline_excel'], true)) {
            throw new RuntimeException('unsupported_delivery_mode');
        }
        return $mode;
    }

    private function validationStateForAttempt(string $attemptState): string
    {
        return match ($attemptState) {
            'valid', 'accepted' => 'passed',
            'invalid', 'duplicate', 'quarantined', 'rejected' => 'failed',
            default => 'warning',
        };
    }

    private function validationState(mixed $value): string
    {
        $state = strtolower($this->text($value));
        if (!in_array($state, ['passed', 'failed', 'warning', 'quarantined'], true)) {
            throw new RuntimeException('invalid_submission_validation_state');
        }
        return $state;
    }

    private function fingerprintScope(mixed $value): string
    {
        $scope = strtolower($this->text($value));
        if (!in_array($scope, ['issuance', 'form_family', 'subject', 'global'], true)) {
            throw new RuntimeException('invalid_duplicate_fingerprint_scope');
        }
        return $scope;
    }

    private function fingerprintType(mixed $value): string
    {
        $type = strtolower($this->text($value));
        if (!in_array($type, ['artifact_hash', 'canonical_payload_hash', 'business_key'], true)) {
            throw new RuntimeException('invalid_duplicate_fingerprint_type');
        }
        return $type;
    }

    /**
     * @return list<array{severity: string, error_code: string, field_path: ?string, message: string, remediation_hint: ?string}>
     */
    private function validationErrors(mixed $errors): array
    {
        if (!is_array($errors)) {
            return [];
        }

        $normalized = [];
        foreach ($errors as $error) {
            if (is_string($error) && trim($error) !== '') {
                $normalized[] = [
                    'severity' => 'error',
                    'error_code' => 'validation_error',
                    'field_path' => null,
                    'message' => trim($error),
                    'remediation_hint' => null,
                ];
                continue;
            }
            if (!is_array($error)) {
                continue;
            }
            $severity = strtolower($this->text($error['severity'] ?? 'error'));
            if (!in_array($severity, ['blocker', 'error', 'warning', 'info'], true)) {
                $severity = 'error';
            }
            $message = $this->text($error['message'] ?? $error['detail'] ?? '');
            if ($message === '') {
                continue;
            }
            $normalized[] = [
                'severity' => $severity,
                'error_code' => $this->text($error['error_code'] ?? $error['code'] ?? 'validation_error') ?: 'validation_error',
                'field_path' => $this->nullableText($error['field_path'] ?? null),
                'message' => $message,
                'remediation_hint' => $this->nullableText($error['remediation_hint'] ?? null),
            ];
        }

        return $normalized;
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
