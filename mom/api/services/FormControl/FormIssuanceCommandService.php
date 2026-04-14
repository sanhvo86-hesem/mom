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

        return [
            'authority' => 'canonical_form_control',
            'submission_attempt' => $row,
        ];
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
