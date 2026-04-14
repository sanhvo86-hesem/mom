<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use RuntimeException;

/**
 * Minimal regulated e-signature ceremony validator. It does not authenticate
 * users by itself; it requires the controller/auth layer to pass a durable
 * re-auth challenge result and binds that ceremony to the displayed record hash.
 */
final class ElectronicSignatureService
{
    /**
     * @param array<string, mixed> $event
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function validateEvidenceSignature(array $event, array $context): array
    {
        $payloadHash = $this->requiredSha256($context['signed_payload_hash_sha256'] ?? null, 'signed_payload_hash_sha256');
        $displayedHash = $this->requiredSha256($event['displayed_record_hash_sha256'] ?? $event['displayed_payload_hash_sha256'] ?? null, 'displayed_record_hash_sha256');
        if (!hash_equals($payloadHash, $displayedHash)) {
            throw new RuntimeException('signature_displayed_record_hash_mismatch');
        }

        $authChallengeId = $this->requiredText($event['auth_challenge_id'] ?? null, 'auth_challenge_id');
        $authMethod = $this->requiredText($event['auth_method'] ?? null, 'auth_method');
        $authResultHash = $this->requiredSha256($event['auth_result_hash_sha256'] ?? null, 'auth_result_hash_sha256');
        $identity = $event['signer_identity_snapshot'] ?? null;
        if (!is_array($identity) || $identity === []) {
            throw new RuntimeException('signer_identity_snapshot_required');
        }
        $manifestation = $this->requiredText($event['signature_manifestation'] ?? null, 'signature_manifestation');

        return [
            'auth_challenge_id' => $authChallengeId,
            'auth_method' => $authMethod,
            'auth_result_hash_sha256' => $authResultHash,
            'signer_identity_snapshot' => $identity,
            'displayed_record_hash_sha256' => $displayedHash,
            'signature_manifestation' => $manifestation,
        ];
    }

    private function requiredText(mixed $value, string $field): string
    {
        $text = is_scalar($value) ? trim((string)$value) : '';
        if ($text === '') {
            throw new RuntimeException($field . '_required');
        }
        return $text;
    }

    private function requiredSha256(mixed $value, string $field): string
    {
        $text = strtolower($this->requiredText($value, $field));
        if (preg_match('/^[a-f0-9]{64}$/', $text) !== 1) {
            throw new RuntimeException($field . '_invalid');
        }
        return $text;
    }
}
