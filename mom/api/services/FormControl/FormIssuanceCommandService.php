<?php

declare(strict_types=1);

namespace MOM\Services\FormControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
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
                ':issuance_manifest_hash_sha256' => $this->nullableSha256($input['issuance_manifest_hash_sha256'] ?? $input['carrier_manifest_hash_sha256'] ?? null),
                ':expires_at' => $this->nullableText($input['expires_at'] ?? null),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'FormIssuanceCommandService',
                    'actor_ref' => $actorRef,
                    'offline_excel_role' => 'controlled_capture_carrier',
                    'template_revision_id' => $templateRevisionId,
                    'schema_version_id' => $schemaVersionId,
                ]),
            ],
        );
        if (!is_array($row) || $this->text($row['frm_issuance_id'] ?? '') === '') {
            throw new RuntimeException('form_issuance_persistence_failed');
        }

        return [
            'authority' => 'canonical_form_control',
            'issuance' => $row,
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
        $attemptState = $this->attemptState($input['attempt_state'] ?? 'received');
        $hash = $this->nullableSha256($input['original_hash_sha256'] ?? $input['original_artifact_hash_sha256'] ?? null);
        if ($hash === null && in_array($attemptState, ['valid', 'accepted', 'duplicate'], true)) {
            throw new RuntimeException('submission_original_hash_required');
        }

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
                ':frm_issuance_id' => $this->requiredUuid($input, 'frm_issuance_id'),
                ':attempt_no' => max(1, (int)($input['attempt_no'] ?? 1)),
                ':attempt_state' => $attemptState,
                ':submitted_by_user_id' => $this->nullableUuid($input['submitted_by_user_id'] ?? null),
                ':submitted_by_ref' => $this->nullableText($input['submitted_by_ref'] ?? $actorRef),
                ':original_artifact_uri' => $this->nullableText($input['original_artifact_uri'] ?? null),
                ':original_hash_sha256' => $hash,
                ':parsed_payload' => $this->json($input['parsed_payload'] ?? $input['canonical_payload'] ?? []),
                ':validation_errors' => $this->json($input['validation_errors'] ?? []),
                ':duplicate_of_attempt_id' => $this->nullableUuid($input['duplicate_of_attempt_id'] ?? null),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json([
                    'authority' => 'FormIssuanceCommandService',
                    'actor_ref' => $actorRef,
                    'carrier_role' => 'offline_or_online_capture_not_source_of_truth',
                ]),
            ],
        );
        if (!is_array($row) || $this->text($row['frm_submission_attempt_id'] ?? '') === '') {
            throw new RuntimeException('form_submission_attempt_persistence_failed');
        }

        $validation = $this->persistValidationLedger($db, (string)$row['frm_submission_attempt_id'], $input, $attemptState, $hash);
        $fingerprints = $this->persistDuplicateFingerprints($db, (string)$row['frm_submission_attempt_id'], $input, $hash);

        return [
            'authority' => 'canonical_form_control',
            'submission_attempt' => $row,
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

    private function attemptState(mixed $value): string
    {
        $state = strtolower($this->text($value));
        if (!in_array($state, ['received', 'parsing', 'validating', 'valid', 'invalid', 'duplicate', 'quarantined', 'accepted', 'rejected'], true)) {
            throw new RuntimeException('invalid_submission_attempt_state');
        }
        return $state;
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
