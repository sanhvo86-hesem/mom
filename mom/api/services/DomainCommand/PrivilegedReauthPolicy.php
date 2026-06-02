<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use DateTimeImmutable;
use MOM\Database\Connection;
use Throwable;

final class PrivilegedReauthPolicy
{
    private const MAX_AGE_SECONDS = 300;

    public function __construct(
        private readonly ?Connection $db = null,
        private readonly ?CommandRecordHasher $hasher = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        if (($entry['regulated_action'] ?? false) !== true) {
            return $this->allow();
        }

        $timestampOnly = array_key_exists('reauth_at', $envelope)
            || array_key_exists('reauthenticated_at', $envelope)
            || array_key_exists('reauth_at', $payload);
        $evidence = is_array($envelope['reauth_evidence'] ?? null) ? (array)$envelope['reauth_evidence'] : [];
        if ($evidence === [] && is_array($payload['reauth_evidence'] ?? null)) {
            $evidence = (array)$payload['reauth_evidence'];
        }
        if ($evidence === []) {
            return $this->deny(
                $timestampOnly ? 'reauth_payload_timestamp_untrusted' : 'reauth_required',
                $timestampOnly
                    ? 'Timestamp-only re-authentication is not trusted for governed commands.'
                    : 'Privileged governed command requires server-issued re-authentication evidence.',
                ['max_age_seconds' => self::MAX_AGE_SECONDS]
            );
        }

        $challengeId = trim((string)($evidence['challenge_id'] ?? $evidence['reauth_challenge_id'] ?? ''));
        if ($challengeId === '') {
            return $this->deny('reauth_required', 'Privileged governed command requires recent re-authentication.', [
                'max_age_seconds' => self::MAX_AGE_SECONDS,
            ]);
        }

        if ($this->db === null) {
            return $this->deny('reauth_server_lookup_required', 'Re-authentication challenge must be verified server-side.');
        }

        try {
            $row = $this->db->queryOne(
                "UPDATE domain_command_reauth_challenge
                    SET consumed_at = now(), result = COALESCE(result, 'consumed')
                  WHERE challenge_id = :challenge_id
                    AND actor_id = :actor_id
                    AND command_name = :command_name
                    AND consumed_at IS NULL
                    AND expires_at > now()
                    AND result IN ('verified', 'issued')
                  RETURNING challenge_id, actor_id, command_name, payload_hash_sha256,
                            intent_hash_sha256, issued_at, expires_at, consumed_at, result",
                [
                    ':challenge_id' => $challengeId,
                    ':actor_id' => trim((string)($envelope['actor_id'] ?? $envelope['actor_ref'] ?? '')),
                    ':command_name' => (string)($entry['command_name'] ?? $envelope['command_name'] ?? ''),
                ]
            );
        } catch (Throwable) {
            return $this->deny('reauth_lookup_failed', 'Re-authentication challenge could not be verified server-side.');
        }

        if (!is_array($row) || $row === []) {
            return $this->deny('reauth_challenge_invalid', 'Re-authentication challenge is missing, expired, mismatched, or replayed.');
        }

        $issuedAt = trim((string)($row['issued_at'] ?? ''));
        try {
            $issued = new DateTimeImmutable($issuedAt);
        } catch (Throwable) {
            return $this->deny('reauth_challenge_invalid', 'Re-authentication challenge issue timestamp is invalid.');
        }
        if ((time() - $issued->getTimestamp()) > self::MAX_AGE_SECONDS) {
            return $this->deny('reauth_challenge_stale', 'Re-authentication challenge is stale.', ['max_age_seconds' => self::MAX_AGE_SECONDS]);
        }

        $expectedPayloadHash = trim((string)($row['payload_hash_sha256'] ?? ''));
        if ($expectedPayloadHash !== '') {
            $actualPayloadHash = ($this->hasher ?? new CommandRecordHasher())->hash($entry, $payload);
            if (!hash_equals(strtolower($expectedPayloadHash), strtolower($actualPayloadHash))) {
                return $this->deny('reauth_payload_mismatch', 'Re-authentication challenge is not bound to this command payload.');
            }
        }

        return $this->allow();
    }

    /**
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function allow(): array
    {
        return ['allowed' => true, 'code' => 'allowed', 'message' => 'Allowed.', 'details' => []];
    }

    /**
     * @param array<string,mixed> $details
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function deny(string $code, string $message, array $details = []): array
    {
        return ['allowed' => false, 'code' => $code, 'message' => $message, 'details' => $details];
    }
}
