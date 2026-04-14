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
                signature_event_id,
                signed_object_type,
                signed_object_id,
                signer_user_id,
                signer_ref,
                signature_meaning,
                signature_state,
                signed_payload_hash_sha256,
                displayed_record_hash_sha256,
                auth_challenge_id,
                auth_method,
                auth_result_hash_sha256,
                signature_manifestation
             FROM signature_events
             WHERE signature_event_id = CAST(:signature_event_id AS uuid)
               AND signed_object_type IN ('change_order', 'plm_change_order')
               AND (
                    signed_object_id = :change_order_id
                    OR signed_object_id = :change_order_number
               )
               AND signature_state = 'applied'
               AND lower(replace(signature_meaning, ' ', '_')) IN ('change_order_release', 'change_order_release_approval')
               AND signed_payload_hash_sha256 = :release_package_hash_sha256
               AND displayed_record_hash_sha256 = :release_package_hash_sha256
               AND NULLIF(trim(COALESCE(auth_challenge_id, '')), '') IS NOT NULL
               AND NULLIF(trim(COALESCE(auth_method, '')), '') IS NOT NULL
               AND auth_result_hash_sha256 IS NOT NULL
               AND (
                    NULLIF(trim(COALESCE(signer_ref, '')), '') IS NULL
                    OR signer_ref = :actor_ref
               )
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
