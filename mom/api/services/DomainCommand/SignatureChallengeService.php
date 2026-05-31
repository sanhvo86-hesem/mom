<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use DateTimeImmutable;
use MOM\Database\Connection;
use Throwable;

final class SignatureChallengeService
{
    private const TTL_SECONDS = 300;

    public function __construct(
        private readonly Connection $db,
        private readonly ?CommandRecordHasher $hasher = null,
        private readonly ?RegulatedActionPolicy $policy = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function issueForCommand(array $entry, array $envelope, array $payload, string $actorId): array
    {
        $policy = ($this->policy ?? new RegulatedActionPolicy())->requireForEntry($entry);
        if (($policy['signature_required'] ?? false) !== true) {
            throw new DomainCommandException('signature_not_required', 'This command does not require an electronic signature challenge.', 409, [
                'command_name' => (string)($entry['command_name'] ?? ''),
            ]);
        }

        $meaning = $this->text($envelope['signature_meaning'] ?? $payload['signature_meaning'] ?? '');
        ($this->policy ?? new RegulatedActionPolicy())->assertMeaningAllowed($policy, $meaning);
        $recordHash = ($this->hasher ?? new CommandRecordHasher())->hash($entry, $payload);
        $challengeId = 'domain-esign-' . bin2hex(random_bytes(16));

        try {
            $row = $this->db->queryOne(
                "INSERT INTO e_signature_auth_challenges
                    (auth_challenge_id, signer_user_id, signer_ref, session_id, org_id, signature_action,
                     signed_payload_hash_sha256, displayed_record_hash_sha256, challenge_state, expires_at,
                     idempotency_key, metadata)
                 VALUES
                    (:auth_challenge_id, CAST(:signer_user_id AS uuid), :signer_ref, :session_id, :org_id,
                     :signature_action, :signed_payload_hash_sha256, :displayed_record_hash_sha256, 'issued',
                     CAST(:expires_at AS timestamptz), :idempotency_key, CAST(:metadata AS jsonb))
                 RETURNING *",
                [
                    ':auth_challenge_id' => $challengeId,
                    ':signer_user_id' => $this->nullableUuid($envelope['signer_user_id'] ?? $envelope['user_id'] ?? null),
                    ':signer_ref' => $this->text($envelope['signer_ref'] ?? $envelope['actor_ref'] ?? $actorId),
                    ':session_id' => $this->nullableText($envelope['session_id'] ?? null),
                    ':org_id' => $this->nullableText($envelope['org_id'] ?? null),
                    ':signature_action' => $meaning,
                    ':signed_payload_hash_sha256' => $recordHash,
                    ':displayed_record_hash_sha256' => $recordHash,
                    ':expires_at' => gmdate('c', time() + self::TTL_SECONDS),
                    ':idempotency_key' => $this->nullableText($envelope['idempotency_key'] ?? null) !== null
                        ? hash('sha256', (string)$envelope['idempotency_key'] . '|signature_challenge|' . $meaning)
                        : null,
                    ':metadata' => $this->json([
                        'authority' => 'DomainCommand.SignatureChallengeService',
                        'command_name' => (string)($entry['command_name'] ?? ''),
                        'root' => (string)($entry['root'] ?? ''),
                        'policy_hash_sha256' => (string)$policy['policy_hash_sha256'],
                    ]),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('signature_challenge_store_unavailable', 'Signature challenge store is unavailable.', 500, [], $e);
        }

        if (!is_array($row) || $this->text($row['auth_challenge_id'] ?? '') === '') {
            throw new DomainCommandException('signature_challenge_issue_failed', 'Signature challenge could not be issued.', 500);
        }

        $row['signed_payload_hash_sha256'] = $recordHash;
        $row['displayed_record_hash_sha256'] = $recordHash;
        $row['signature_meaning'] = $meaning;

        return $row;
    }

    /**
     * @param array<string,mixed> $evidence
     * @param array<string,mixed> $policy
     * @return array<string,mixed>
     */
    public function inspectChallenge(array $evidence, array $policy, string $recordHash, string $actorId): array
    {
        $challengeId = $this->requiredText($evidence['auth_challenge_id'] ?? null, 'auth_challenge_id');
        $meaning = $this->requiredText($evidence['signature_meaning'] ?? $evidence['meaning'] ?? null, 'signature_meaning');
        ($this->policy ?? new RegulatedActionPolicy())->assertMeaningAllowed($policy, $meaning);

        try {
            $row = $this->db->queryOne(
                "SELECT auth_challenge_id, signer_user_id::text AS signer_user_id, signer_ref, session_id, org_id,
                        signature_action, signed_payload_hash_sha256, displayed_record_hash_sha256,
                        challenge_state, expires_at, consumed_at
                   FROM e_signature_auth_challenges
                  WHERE auth_challenge_id = :auth_challenge_id",
                [':auth_challenge_id' => $challengeId]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('signature_challenge_store_unavailable', 'Signature challenge store is unavailable.', 500, [], $e);
        }

        if (!is_array($row) || $row === []) {
            throw new DomainCommandException('signature_challenge_not_found', 'Signature challenge was not found.', 409);
        }

        $this->assertChallengeUsable($row, $meaning, $recordHash, $actorId);

        return $row;
    }

    /**
     * @param array<string,mixed> $evidence
     * @return array<string,mixed>
     */
    public function consumeChallenge(array $evidence, string $recordHash, string $actorId): array
    {
        $challengeId = $this->requiredText($evidence['auth_challenge_id'] ?? null, 'auth_challenge_id');
        $meaning = $this->requiredText($evidence['signature_meaning'] ?? $evidence['meaning'] ?? null, 'signature_meaning');

        try {
            $row = $this->db->queryOne(
                "UPDATE e_signature_auth_challenges
                    SET challenge_state = 'consumed',
                        consumed_at = now(),
                        consumed_by_user_id = CAST(:signer_user_id AS uuid),
                        consumed_by_ref = :signer_ref,
                        row_version = row_version + 1,
                        updated_at = now()
                  WHERE auth_challenge_id = :auth_challenge_id
                    AND challenge_state = 'issued'
                    AND consumed_at IS NULL
                    AND expires_at > now()
                    AND signature_action = :signature_action
                    AND signed_payload_hash_sha256 = :signed_payload_hash_sha256
                    AND displayed_record_hash_sha256 = :displayed_record_hash_sha256
                  RETURNING *",
                [
                    ':auth_challenge_id' => $challengeId,
                    ':signer_user_id' => $this->nullableUuid($evidence['signer_user_id'] ?? null),
                    ':signer_ref' => $this->text($evidence['signer_ref'] ?? $evidence['actor_ref'] ?? $actorId),
                    ':signature_action' => $meaning,
                    ':signed_payload_hash_sha256' => $recordHash,
                    ':displayed_record_hash_sha256' => $recordHash,
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('signature_challenge_store_unavailable', 'Signature challenge store is unavailable.', 500, [], $e);
        }

        if (!is_array($row) || $row === []) {
            throw new DomainCommandException('signature_challenge_not_valid_or_replayed', 'Signature challenge is expired, consumed, mismatched, or replayed.', 409);
        }

        return $row;
    }

    /**
     * @param array<string,mixed> $row
     */
    private function assertChallengeUsable(array $row, string $meaning, string $recordHash, string $actorId): void
    {
        if ($this->text($row['challenge_state'] ?? '') !== 'issued' || $this->text($row['consumed_at'] ?? '') !== '') {
            throw new DomainCommandException('signature_challenge_replayed', 'Signature challenge has already been consumed or is not issued.', 409);
        }
        $expiresAt = $this->text($row['expires_at'] ?? '');
        try {
            $expires = new DateTimeImmutable($expiresAt);
        } catch (Throwable $e) {
            throw new DomainCommandException('signature_challenge_expiry_invalid', 'Signature challenge expiry is invalid.', 409, [], $e);
        }
        if ($expires->getTimestamp() <= time()) {
            throw new DomainCommandException('signature_challenge_expired', 'Signature challenge has expired.', 409);
        }
        if (!hash_equals($meaning, $this->text($row['signature_action'] ?? ''))) {
            throw new DomainCommandException('signature_challenge_action_mismatch', 'Signature challenge action does not match signature meaning.', 409);
        }
        if (!hash_equals($recordHash, strtolower($this->text($row['signed_payload_hash_sha256'] ?? '')))) {
            throw new DomainCommandException('signature_record_hash_mismatch', 'Signature challenge is not linked to this command record hash.', 409);
        }
        if (!hash_equals($recordHash, strtolower($this->text($row['displayed_record_hash_sha256'] ?? '')))) {
            throw new DomainCommandException('signature_displayed_record_hash_mismatch', 'Displayed record hash does not match the command record hash.', 409);
        }
        $signerRef = $this->text($row['signer_ref'] ?? '');
        $signerUserId = $this->text($row['signer_user_id'] ?? '');
        if ($signerRef !== '' && !hash_equals($signerRef, $actorId)) {
            throw new DomainCommandException('signature_challenge_signer_mismatch', 'Signature challenge signer does not match the command actor.', 403);
        }
        if ($signerRef === '' && $signerUserId !== '' && !hash_equals($signerUserId, $actorId)) {
            throw new DomainCommandException('signature_challenge_signer_mismatch', 'Signature challenge signer does not match the command actor.', 403);
        }
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->text($value);
        return preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function requiredText(mixed $value, string $field): string
    {
        $text = $this->text($value);
        if ($text === '') {
            throw new DomainCommandException($field . '_required', $field . ' is required.', 409);
        }

        return $text;
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
            throw new DomainCommandException('signature_challenge_json_failed', 'Signature challenge metadata cannot be encoded.', 500, [], $e);
        }
    }
}
