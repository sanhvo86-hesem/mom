<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class SignatureManifestationService
{
    public function __construct(private readonly Connection $db) {}

    /**
     * @return list<array<string,mixed>>
     */
    public function forRecord(string $recordType, string $recordId): array
    {
        if (trim($recordType) === '' || trim($recordId) === '') {
            throw new DomainCommandException('signature_manifestation_record_required', 'record_type and record_id are required.', 400);
        }

        try {
            return $this->db->query(
                "SELECT
                    se.signature_event_id::text AS signature_event_id,
                    se.signed_object_type AS record_type,
                    se.signed_object_id AS record_id,
                    COALESCE(se.signer_ref, se.signer_user_id::text) AS signer_ref,
                    se.signer_role,
                    se.signature_meaning,
                    se.signed_at,
                    se.signature_manifestation,
                    se.signed_payload_hash_sha256,
                    se.displayed_record_hash_sha256,
                    dcel.evidence_link_id::text AS evidence_link_id,
                    dcel.command_name,
                    dcel.requirement_snapshot_hash_sha256
                 FROM signature_events se
                 LEFT JOIN domain_command_evidence_links dcel
                   ON dcel.signature_event_id = se.signature_event_id
                WHERE se.signed_object_type = :record_type
                  AND se.signed_object_id = :record_id
                ORDER BY se.signed_at DESC",
                [
                    ':record_type' => trim($recordType),
                    ':record_id' => trim($recordId),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('signature_manifestation_store_unavailable', 'Signature manifestation store is unavailable.', 500, [], $e);
        }
    }
}
