<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Server-side e-signature re-authentication challenge authority.
 *
 * Challenges bind signer, action, payload hash, displayed hash, optional org,
 * optional session, expiry, and one-time consumption.
 */
final class ElectronicSignatureChallengeService
{
    private const CHALLENGE_TTL_SECONDS = 300;
    private const ALLOWED_SIGNATURE_ACTIONS = [
        'evidence_finalize',
        'document_release',
        'document_read_acknowledgement',
        'periodic_evaluation_waiver',
        'change_order_release',
        'verification_waiver',
    ];

    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function issueChallenge(array $input): array
    {
        $db = $this->requireDb();
        if ($this->nullableText($input['auth_challenge_id'] ?? null) !== null) {
            throw new RuntimeException('signature_auth_challenge_id_server_authoritative');
        }
        if ($this->nullableText($input['expires_at'] ?? null) !== null) {
            throw new RuntimeException('signature_auth_challenge_expiry_server_authoritative');
        }
        $challengeId = 'esign-' . bin2hex(random_bytes(16));
        $payloadHash = $this->requiredSha256($input['signed_payload_hash_sha256'] ?? null, 'signed_payload_hash_sha256');
        $displayedHash = $this->requiredSha256($input['displayed_record_hash_sha256'] ?? null, 'displayed_record_hash_sha256');
        $signatureAction = $this->signatureAction($input['signature_action'] ?? 'evidence_finalize');
        $signerUserId = $this->nullableUuid($input['signer_user_id'] ?? $input['user_id'] ?? null);
        $signerRef = $this->nullableText($input['signer_ref'] ?? $input['actor_ref'] ?? null);
        if ($signerUserId === null && $signerRef === null) {
            throw new RuntimeException('signature_challenge_signer_required');
        }

        $row = $db->queryOne(
            "INSERT INTO e_signature_auth_challenges
                (auth_challenge_id, signer_user_id, signer_ref, session_id, org_id, signature_action,
                 signed_payload_hash_sha256, displayed_record_hash_sha256, challenge_state, expires_at,
                 idempotency_key, metadata)
             VALUES
                (:auth_challenge_id, CAST(:signer_user_id AS uuid), :signer_ref, :session_id, :org_id,
                 :signature_action, :signed_payload_hash_sha256, :displayed_record_hash_sha256, 'issued',
                 CAST(:expires_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
             ON CONFLICT (auth_challenge_id) DO NOTHING
             RETURNING *",
            [
                ':auth_challenge_id' => $challengeId,
                ':signer_user_id' => $signerUserId,
                ':signer_ref' => $signerRef,
                ':session_id' => $this->nullableText($input['session_id'] ?? null),
                ':org_id' => $this->nullableText($input['org_id'] ?? null),
                ':signature_action' => $signatureAction,
                ':signed_payload_hash_sha256' => $payloadHash,
                ':displayed_record_hash_sha256' => $displayedHash,
                ':expires_at' => gmdate('c', time() + self::CHALLENGE_TTL_SECONDS),
                ':idempotency_key' => $this->nullableText($input['idempotency_key'] ?? null),
                ':metadata' => $this->json(is_array($input['metadata'] ?? null) ? $input['metadata'] : []),
            ],
        );

        if (!is_array($row) || $this->text($row['auth_challenge_id'] ?? '') === '') {
            throw new RuntimeException('signature_auth_challenge_issue_failed');
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function consumeChallenge(array $input): array
    {
        $db = $this->requireDb();
        $challengeId = $this->requiredText($input, 'auth_challenge_id');
        $payloadHash = $this->requiredSha256($input['signed_payload_hash_sha256'] ?? null, 'signed_payload_hash_sha256');
        $displayedHash = $this->requiredSha256($input['displayed_record_hash_sha256'] ?? null, 'displayed_record_hash_sha256');
        $signerUserId = $this->nullableUuid($input['signer_user_id'] ?? $input['user_id'] ?? null);
        $signerRef = $this->nullableText($input['signer_ref'] ?? $input['actor_ref'] ?? null);
        if ($signerUserId === null && $signerRef === null) {
            throw new RuntimeException('signature_challenge_signer_required');
        }

        $row = $db->queryOne(
            "UPDATE e_signature_auth_challenges
             SET challenge_state = 'consumed',
                 consumed_at = now(),
                 consumed_by_user_id = CAST(:signer_user_id AS uuid),
                 consumed_by_ref = :signer_ref,
                 row_version = row_version + 1
             WHERE auth_challenge_id = :auth_challenge_id
               AND challenge_state = 'issued'
               AND consumed_at IS NULL
               AND expires_at > now()
	               AND signed_payload_hash_sha256 = :signed_payload_hash_sha256
	               AND displayed_record_hash_sha256 = :displayed_record_hash_sha256
	               AND signature_action = :signature_action
	               AND (signer_user_id IS NULL OR (:signer_user_id IS NOT NULL AND signer_user_id = CAST(:signer_user_id AS uuid)))
	               AND (signer_ref IS NULL OR (:signer_ref IS NOT NULL AND signer_ref = :signer_ref))
	               AND (session_id IS NULL OR (:session_id IS NOT NULL AND session_id = :session_id))
	               AND (org_id IS NULL OR (:org_id IS NOT NULL AND org_id = :org_id))
	             RETURNING *",
            [
                ':auth_challenge_id' => $challengeId,
                ':signer_user_id' => $signerUserId,
                ':signer_ref' => $signerRef,
                ':session_id' => $this->nullableText($input['session_id'] ?? null),
                ':org_id' => $this->nullableText($input['org_id'] ?? null),
                ':signature_action' => $this->nullableText($input['signature_action'] ?? null) ?? 'evidence_finalize',
                ':signed_payload_hash_sha256' => $payloadHash,
                ':displayed_record_hash_sha256' => $displayedHash,
            ],
        );

        if (!is_array($row) || $this->text($row['auth_challenge_id'] ?? '') === '') {
            throw new RuntimeException('signature_auth_challenge_not_valid');
        }

        return $row;
    }

    private function requireDb(): object
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('signature_auth_challenge_store_required');
        }
        return $this->db;
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

    private function requiredSha256(mixed $value, string $field): string
    {
        $text = strtolower($this->requiredText([$field => $value], $field));
        if (preg_match('/^[a-f0-9]{64}$/', $text) !== 1) {
            throw new RuntimeException($field . '_invalid');
        }
        return $text;
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

    private function signatureAction(mixed $value): string
    {
        $action = $this->nullableText($value) ?? 'evidence_finalize';
        if (!in_array($action, self::ALLOWED_SIGNATURE_ACTIONS, true)) {
            throw new RuntimeException('signature_action_not_allowed');
        }
        return $action;
    }

    private function json(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
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
}
