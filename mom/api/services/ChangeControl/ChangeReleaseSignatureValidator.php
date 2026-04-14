<?php

declare(strict_types=1);

namespace MOM\Services\ChangeControl;

use RuntimeException;

/**
 * Verifies that a change-order release signature is a durable e-signature row,
 * not merely a UUID-shaped request value.
 */
final class ChangeReleaseSignatureValidator
{
    public function __construct(private readonly object $db)
    {
    }

    /**
     * @param array<string, mixed> $changeOrder
     * @return array<string, mixed>
     */
    public function requireValidReleaseSignature(
        string $signatureEventId,
        array $changeOrder,
        string $releasePackageHash,
        string $actorRef,
    ): array {
        if (!method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_signature_store_required');
        }

        $changeOrderId = trim((string)($changeOrder['plm_change_order_id'] ?? ''));
        $changeOrderNumber = trim((string)($changeOrder['change_order_number'] ?? ''));
        if ($changeOrderId === '' && $changeOrderNumber === '') {
            throw new RuntimeException('change_order_release_signature_subject_required');
        }

        $row = $this->db->queryOne(
            "SELECT
                se.signature_event_id,
                se.signed_object_type,
                se.signed_object_id,
                se.signer_user_id,
                se.signer_ref,
                se.signature_meaning,
                se.signature_state,
                se.signed_payload_hash_sha256,
                se.displayed_record_hash_sha256,
                se.auth_challenge_id,
                se.auth_method,
                se.auth_result_hash_sha256,
                se.signature_manifestation,
                ac.challenge_state,
                ac.consumed_at,
                ac.signature_action
             FROM signature_events se
             JOIN e_signature_auth_challenges ac
               ON ac.auth_challenge_id = se.auth_challenge_id
              AND ac.challenge_state = 'consumed'
              AND ac.consumed_at IS NOT NULL
              AND ac.signature_action IN ('change_order_release', 'change_order_release_approval')
              AND ac.signed_payload_hash_sha256 = se.signed_payload_hash_sha256
              AND ac.displayed_record_hash_sha256 = se.displayed_record_hash_sha256
              AND (ac.signer_ref IS NULL OR ac.signer_ref = :actor_ref)
             WHERE se.signature_event_id = CAST(:signature_event_id AS uuid)
               AND se.signed_object_type IN ('change_order', 'plm_change_order')
               AND (
                    se.signed_object_id = :change_order_id
                    OR se.signed_object_id = :change_order_number
               )
               AND se.signature_state = 'applied'
               AND lower(replace(se.signature_meaning, ' ', '_')) IN ('change_order_release', 'change_order_release_approval')
               AND se.signed_payload_hash_sha256 = :release_package_hash_sha256
               AND se.displayed_record_hash_sha256 = :release_package_hash_sha256
               AND NULLIF(trim(COALESCE(se.auth_challenge_id, '')), '') IS NOT NULL
               AND NULLIF(trim(COALESCE(se.auth_method, '')), '') IS NOT NULL
               AND se.auth_result_hash_sha256 IS NOT NULL
               AND NULLIF(trim(COALESCE(se.signer_ref, '')), '') = :actor_ref
             LIMIT 1",
            [
                ':signature_event_id' => $signatureEventId,
                ':change_order_id' => $changeOrderId,
                ':change_order_number' => $changeOrderNumber,
                ':release_package_hash_sha256' => $releasePackageHash,
                ':actor_ref' => $actorRef,
            ],
        );

        if (!is_array($row) || trim((string)($row['signature_event_id'] ?? '')) === '') {
            throw new RuntimeException('change_order_release_signature_not_authoritative');
        }

        return $row;
    }
}
