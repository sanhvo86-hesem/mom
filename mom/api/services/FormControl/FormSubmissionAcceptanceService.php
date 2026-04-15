<?php

declare(strict_types=1);

namespace MOM\Services\FormControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Portal-first acceptance transition for validated offline/online submissions.
 */
final class FormSubmissionAcceptanceService
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
    public function accept(array $input, string $actorRef): array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_form_store_required');
        }

        $attemptId = $this->requiredUuid($input['frm_submission_attempt_id'] ?? $input['submission_attempt_id'] ?? $input['attempt_id'] ?? null);
        $signatureEventId = $this->requiredUuid($input['signature_event_id'] ?? $input['acceptance_signature_event_id'] ?? null);
        $reason = $this->requiredText($input, 'reason');

        $validation = $this->db->queryOne(
            "SELECT
                a.frm_submission_attempt_id,
                a.attempt_state,
                vr.validation_state,
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
        if (!is_array($validation) || trim((string)($validation['frm_submission_attempt_id'] ?? '')) === '') {
            throw new RuntimeException('submission_attempt_not_found');
        }
        if (!in_array((string)($validation['attempt_state'] ?? ''), ['valid', 'accepted'], true)) {
            throw new RuntimeException('submission_attempt_not_valid');
        }
        if (!in_array((string)($validation['validation_state'] ?? ''), ['passed', 'accepted'], true)) {
            throw new RuntimeException('submission_attempt_validation_not_passed');
        }

        $canonicalPayloadHash = $this->requiredSha256($validation['canonical_payload_hash_sha256'] ?? null, 'canonical_payload_hash_sha256');
        $originalArtifactHash = $this->requiredSha256($validation['original_artifact_hash_sha256'] ?? null, 'original_artifact_hash_sha256');
        $signature = $this->db->queryOne(
            "SELECT se.signature_event_id
             FROM signature_events se
             INNER JOIN e_signature_auth_challenges ac
                ON ac.auth_challenge_id = se.auth_challenge_id
             WHERE se.signature_event_id = CAST(:signature_event_id AS uuid)
               AND se.signature_state = 'applied'
               AND se.signed_object_type IN ('frm_submission_attempt', 'form_submission_attempt')
               AND se.signed_object_id = :attempt_id
               AND lower(replace(se.signature_meaning, ' ', '_')) = 'form_submission_acceptance'
               AND se.signed_payload_hash_sha256 = :canonical_payload_hash_sha256
               AND se.displayed_record_hash_sha256 = :original_artifact_hash_sha256
               AND ac.challenge_state = 'consumed'
               AND ac.consumed_at IS NOT NULL
               AND ac.signature_action = 'form_submission_acceptance'
               AND ac.signed_payload_hash_sha256 = :canonical_payload_hash_sha256
               AND ac.displayed_record_hash_sha256 = :original_artifact_hash_sha256
               AND (se.signer_ref IS NULL OR se.signer_ref = :actor_ref)
               AND (ac.signer_ref IS NULL OR ac.signer_ref = :actor_ref)
             LIMIT 1",
            [
                ':signature_event_id' => $signatureEventId,
                ':attempt_id' => $attemptId,
                ':actor_ref' => $actorRef,
                ':canonical_payload_hash_sha256' => $canonicalPayloadHash,
                ':original_artifact_hash_sha256' => $originalArtifactHash,
            ],
        );
        if (!is_array($signature) || trim((string)($signature['signature_event_id'] ?? '')) === '') {
            throw new RuntimeException('submission_acceptance_signature_not_authoritative');
        }

        $row = $this->db->queryOne(
            "UPDATE frm_submission_attempts
             SET attempt_state = 'accepted',
                 accepted_at = now(),
                 accepted_by_ref = :actor_ref,
                 acceptance_signature_event_id = CAST(:signature_event_id AS uuid),
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now(),
                 row_version = row_version + 1
             WHERE frm_submission_attempt_id = CAST(:attempt_id AS uuid)
               AND attempt_state IN ('valid', 'accepted')
             RETURNING *",
            [
                ':attempt_id' => $attemptId,
                ':actor_ref' => $actorRef,
                ':signature_event_id' => $signatureEventId,
                ':metadata' => $this->json([
                    'acceptance_reason' => $reason,
                    'acceptance_signature_event_id' => $signatureEventId,
                    'accepted_by_ref' => $actorRef,
                ]),
            ],
        );

        if (!is_array($row) || trim((string)($row['frm_submission_attempt_id'] ?? '')) === '') {
            throw new RuntimeException('submission_acceptance_failed');
        }

        return $row;
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
            $candidate = $db->getConnection();
            return is_object($candidate) ? $candidate : null;
        }
        return $db;
    }

    /**
     * @param array<string, mixed> $input
     */
    private function requiredText(array $input, string $field): string
    {
        $value = $input[$field] ?? null;
        $text = is_scalar($value) ? trim((string)$value) : '';
        if ($text === '') {
            throw new RuntimeException($field . '_required');
        }
        return $text;
    }

    private function requiredUuid(mixed $value): string
    {
        $text = is_scalar($value) ? trim((string)$value) : '';
        if (preg_match('/^[a-f0-9-]{36}$/i', $text) !== 1) {
            throw new RuntimeException('uuid_required');
        }
        return $text;
    }

    private function requiredSha256(mixed $value, string $field): string
    {
        $text = is_scalar($value) ? strtolower(trim((string)$value)) : '';
        if (preg_match('/^[a-f0-9]{64}$/', $text) !== 1) {
            throw new RuntimeException($field . '_required');
        }
        return $text;
    }

    /**
     * @param array<string, mixed> $value
     */
    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
