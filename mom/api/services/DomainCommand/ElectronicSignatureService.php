<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class ElectronicSignatureService
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?SignatureChallengeService $challenges = null,
        private readonly ?CommandRecordHasher $hasher = null,
        private readonly ?RegulatedActionPolicy $policy = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $policy
     * @return array<string,mixed>
     */
    public function preflight(array $entry, array $envelope, array $payload, array $policy, string $recordHash, string $actorId): array
    {
        unset($entry, $payload);
        $evidence = $this->signatureEvidence($envelope);
        if ($evidence === []) {
            throw new DomainCommandException('signature_evidence_required', 'Electronic signature evidence is required for this regulated command.', 409);
        }

        $meaning = $this->requiredText($evidence['signature_meaning'] ?? $evidence['meaning'] ?? $envelope['signature_meaning'] ?? null, 'signature_meaning');
        ($this->policy ?? new RegulatedActionPolicy())->assertMeaningAllowed($policy, $meaning);
        $evidence['signature_meaning'] = $meaning;
        $evidence['signed_payload_hash_sha256'] = $this->requiredHash($evidence['signed_payload_hash_sha256'] ?? null, 'signed_payload_hash_sha256');
        $evidence['displayed_record_hash_sha256'] = $this->requiredHash($evidence['displayed_record_hash_sha256'] ?? $evidence['displayed_payload_hash_sha256'] ?? null, 'displayed_record_hash_sha256');
        $this->assertHashEquals($recordHash, (string)$evidence['signed_payload_hash_sha256'], 'signature_record_hash_mismatch');
        $this->assertHashEquals($recordHash, (string)$evidence['displayed_record_hash_sha256'], 'signature_displayed_record_hash_mismatch');
        $this->requiredText($evidence['auth_challenge_id'] ?? null, 'auth_challenge_id');
        $this->requiredText($evidence['auth_method'] ?? null, 'auth_method');
        $evidence['auth_result_hash_sha256'] = $this->requiredHash($evidence['auth_result_hash_sha256'] ?? null, 'auth_result_hash_sha256');
        $identity = $evidence['signer_identity_snapshot'] ?? null;
        if (!is_array($identity) || $identity === []) {
            $identity = $this->canonicalSignerIdentitySnapshot($evidence, $actorId);
            if ($identity !== []) {
                $evidence['signer_identity_snapshot'] = $identity;
            }
        }
        if (!is_array($identity) || $identity === []) {
            throw new DomainCommandException('signer_identity_snapshot_required', 'Signer identity snapshot is required.', 409);
        }
        $this->requiredText($evidence['signature_manifestation'] ?? null, 'signature_manifestation');

        ($this->challenges ?? new SignatureChallengeService($this->db))->inspectChallenge($evidence, $policy, $recordHash, $actorId);

        return $evidence;
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $policy
     * @param array<string,mixed> $evidence
     * @return array<string,mixed>
     */
    public function applySignature(array $entry, array $payload, array $policy, array $evidence, string $recordHash, string $actorId, string $idempotencyKey): array
    {
        unset($policy);
        $challenge = ($this->challenges ?? new SignatureChallengeService($this->db))->consumeChallenge($evidence, $recordHash, $actorId);
        $signerUserId = $this->nullableUuid($evidence['signer_user_id'] ?? $evidence['user_id'] ?? null);
        $signerRef = $this->text($evidence['signer_ref'] ?? $evidence['actor_ref'] ?? $actorId);
        $meaning = $this->requiredText($evidence['signature_meaning'] ?? null, 'signature_meaning');
        $authResultHash = $this->requiredHash($evidence['auth_result_hash_sha256'] ?? null, 'auth_result_hash_sha256');
        $signatureHash = hash('sha256', $recordHash . '|' . ($signerUserId ?? $signerRef) . '|' . $meaning . '|' . $authResultHash . '|' . (string)$evidence['auth_challenge_id']);
        $signatureIdempotencyKey = hash('sha256', $idempotencyKey . '|signature|' . $meaning . '|' . $recordHash);

        try {
            $row = $this->db->queryOne(
                "WITH inserted AS (
                    INSERT INTO signature_events
                        (signed_object_type, signed_object_id, signed_object_version, signer_user_id, signer_ref,
                         signer_role, signature_meaning, signature_state, signed_payload_hash_sha256,
                         signature_hash_sha256, auth_challenge_id, auth_method, auth_result_hash_sha256,
                         signer_identity_snapshot, displayed_record_hash_sha256, signature_manifestation,
                         signed_at, idempotency_key, metadata)
                    VALUES
                        (:signed_object_type, :signed_object_id, :signed_object_version, CAST(:signer_user_id AS uuid), :signer_ref,
                         :signer_role, :signature_meaning, 'applied', :signed_payload_hash_sha256,
                         :signature_hash_sha256, :auth_challenge_id, :auth_method, :auth_result_hash_sha256,
                         CAST(:signer_identity_snapshot AS jsonb), :displayed_record_hash_sha256, :signature_manifestation,
                         now(), :idempotency_key, CAST(:metadata AS jsonb))
                    ON CONFLICT (idempotency_key) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM signature_events WHERE idempotency_key = :idempotency_key
                 LIMIT 1",
                [
                    ':signed_object_type' => (string)($entry['root'] ?? 'domain_command'),
                    ':signed_object_id' => ($this->hasher ?? new CommandRecordHasher())->recordId($entry, $payload),
                    ':signed_object_version' => $this->nullableText($payload['revision_ref'] ?? $payload['version'] ?? null),
                    ':signer_user_id' => $signerUserId,
                    ':signer_ref' => $signerRef,
                    ':signer_role' => $this->nullableText($evidence['signer_role'] ?? null),
                    ':signature_meaning' => $meaning,
                    ':signed_payload_hash_sha256' => $recordHash,
                    ':signature_hash_sha256' => $signatureHash,
                    ':auth_challenge_id' => (string)$evidence['auth_challenge_id'],
                    ':auth_method' => (string)$evidence['auth_method'],
                    ':auth_result_hash_sha256' => $authResultHash,
                    ':signer_identity_snapshot' => $this->json($evidence['signer_identity_snapshot']),
                    ':displayed_record_hash_sha256' => $recordHash,
                    ':signature_manifestation' => (string)$evidence['signature_manifestation'],
                    ':idempotency_key' => $signatureIdempotencyKey,
                    ':metadata' => $this->json([
                        'authority' => 'DomainCommand.ElectronicSignatureService',
                        'command_name' => (string)($entry['command_name'] ?? ''),
                        'challenge_consumed_at' => $challenge['consumed_at'] ?? null,
                    ]),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_signature_store_unavailable', 'Regulated signature store is unavailable.', 500, [], $e);
        }

        if (!is_array($row) || $row === []) {
            throw new DomainCommandException('regulated_signature_persist_failed', 'Regulated signature event could not be persisted.', 500);
        }

        return $row;
    }

    /**
     * @param array<string,mixed> $envelope
     * @return array<string,mixed>
     */
    private function signatureEvidence(array $envelope): array
    {
        foreach (['signature_evidence', 'electronic_signature', 'signature'] as $field) {
            if (is_array($envelope[$field] ?? null)) {
                return (array)$envelope[$field];
            }
        }

        $payload = is_array($envelope['payload'] ?? null) ? (array)$envelope['payload'] : [];
        foreach (['signature_evidence', 'electronic_signature', 'signature'] as $field) {
            if (is_array($payload[$field] ?? null)) {
                return (array)$payload[$field];
            }
        }

        return [];
    }

    private function assertHashEquals(string $expected, string $actual, string $code): void
    {
        if (!hash_equals(strtolower($expected), strtolower($actual))) {
            throw new DomainCommandException($code, 'Signature hash is not linked to the command record hash.', 409);
        }
    }

    private function requiredHash(mixed $value, string $field): string
    {
        $text = strtolower($this->requiredText($value, $field));
        if (preg_match('/^[a-f0-9]{64}$/', $text) !== 1) {
            throw new DomainCommandException($field . '_invalid', $field . ' must be a SHA-256 hex digest.', 409);
        }

        return $text;
    }

    private function requiredText(mixed $value, string $field): string
    {
        $text = $this->text($value);
        if ($text === '') {
            throw new DomainCommandException($field . '_required', $field . ' is required.', 409);
        }

        return $text;
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->text($value);
        return preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    /**
     * @param array<string,mixed> $evidence
     * @return array<string,mixed>
     */
    private function canonicalSignerIdentitySnapshot(array $evidence, string $actorId): array
    {
        $actorRefs = array_values(array_filter(array_unique([
            $this->text($evidence['signer_user_id'] ?? ''),
            $this->text($evidence['user_id'] ?? ''),
            $this->text($evidence['signer_ref'] ?? ''),
            $this->text($evidence['actor_ref'] ?? ''),
            $actorId,
        ])));
        if ($actorRefs === []) {
            return [];
        }

        try {
            $params = [':actor_id' => $actorId];
            $valuePlaceholders = [];
            foreach ($actorRefs as $idx => $actorRef) {
                $placeholder = ':actor_ref_' . $idx;
                $valuePlaceholders[] = '(' . $placeholder . ')';
                $params[$placeholder] = $actorRef;
            }
            $actorRefValuesSql = implode(',', $valuePlaceholders);
            $row = $this->db->queryOne(
                "WITH actor_refs(ref) AS (VALUES {$actorRefValuesSql})
                 SELECT user_id::text, employee_id, username, email, full_name, full_name_vi,
                        dept_code, role_code, role_label, user_status, mfa_enabled,
                        hcm_position_id, hcm_org_unit_id, employment_status, row_version
                   FROM v_user_canonical
                  WHERE EXISTS (
                        SELECT 1
                          FROM actor_refs
                         WHERE actor_refs.ref IN (user_id::text, username, employee_id, email)
                  )
                  ORDER BY
                        CASE
                            WHEN user_id::text = :actor_id THEN 0
                            WHEN username = :actor_id THEN 1
                            WHEN employee_id = :actor_id THEN 2
                            ELSE 3
                        END
                  LIMIT 1",
                $params
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('signer_identity_lookup_failed', 'Signer identity must be resolved through v_user_canonical before signing.', 500, [
                'identity_source' => 'v_user_canonical',
            ], $e);
        }

        if (!is_array($row) || $row === []) {
            return [];
        }

        return [
            'identity_source' => 'v_user_canonical',
            'user_id' => (string)($row['user_id'] ?? ''),
            'employee_id' => (string)($row['employee_id'] ?? ''),
            'username' => (string)($row['username'] ?? ''),
            'email_hash_sha256' => hash('sha256', strtolower((string)($row['email'] ?? ''))),
            'full_name_hash_sha256' => hash('sha256', (string)($row['full_name'] ?? '')),
            'dept_code' => (string)($row['dept_code'] ?? ''),
            'role_code' => (string)($row['role_code'] ?? ''),
            'role_label' => (string)($row['role_label'] ?? ''),
            'user_status' => (string)($row['user_status'] ?? ''),
            'mfa_enabled' => (bool)($row['mfa_enabled'] ?? false),
            'hcm_position_id' => (string)($row['hcm_position_id'] ?? ''),
            'hcm_org_unit_id' => (string)($row['hcm_org_unit_id'] ?? ''),
            'employment_status' => (string)($row['employment_status'] ?? ''),
            'row_version' => (string)($row['row_version'] ?? ''),
        ];
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_signature_json_failed', 'Regulated signature payload cannot be encoded.', 500, [], $e);
        }
    }
}
