<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Append-only writer for the hash-chained audit log
 * (table audit_event_chain, migration 174 / ADR-0013).
 *
 * Every event recorded here:
 *   - is INSERT-only (UPDATE/DELETE rejected by trigger)
 *   - is hash-linked to its predecessor via prev_sha256 / row_sha256
 *   - is therefore tamper-evident in the sense of 21 CFR Part 11 §11.10(e)
 *
 * The trigger audit_event_chain_link_tg() computes prev_sha256 and
 * row_sha256 server-side; this service only INSERTs the user-supplied
 * payload columns.
 *
 * Failure of this service is non-fatal to the caller. We log to
 * php_error_log on swallow because losing an audit event is a
 * compliance signal even if the operation that triggered it succeeded.
 */
class AuditChainService
{
    public function __construct(
        private readonly Connection $db,
    ) {
    }

    /**
     * Record one event. Returns the chain_id and row_sha256 of the new
     * row, or null on failure.
     *
     * @param array<string,mixed> $payload  Domain-specific event data.
     * @param array<string,mixed> $metadata Operational metadata (request id, etc).
     * @return array{chain_id:int, row_sha256:string}|null
     */
    public function record(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        ?string $actorId,
        ?string $actorName,
        array $payload,
        array $metadata = [],
        ?string $ipAddress = null,
    ): ?array {
        $payloadJson  = json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        ) ?: '{}';
        $metadataJson = json_encode(
            $metadata,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        ) ?: '{}';

        try {
            $row = $this->db->insertReturning(
                'INSERT INTO audit_event_chain (
                     event_type, aggregate_type, aggregate_id,
                     actor_id, actor_name, payload, metadata, ip_address,
                     prev_sha256, row_sha256
                 ) VALUES (
                     :event_type, :aggregate_type, :aggregate_id,
                     :actor_id, :actor_name,
                     CAST(:payload  AS jsonb),
                     CAST(:metadata AS jsonb),
                     :ip_address,
                     repeat(\'0\', 64),
                     repeat(\'0\', 64)
                 )
                 RETURNING chain_id, row_sha256',
                [
                    ':event_type'     => $eventType,
                    ':aggregate_type' => $aggregateType,
                    ':aggregate_id'   => $aggregateId,
                    ':actor_id'       => $actorId,
                    ':actor_name'     => $actorName,
                    ':payload'        => $payloadJson,
                    ':metadata'       => $metadataJson,
                    ':ip_address'     => $ipAddress,
                ],
            );
            if (!is_array($row)) {
                return null;
            }
            return [
                'chain_id'   => (int)($row['chain_id'] ?? 0),
                'row_sha256' => (string)($row['row_sha256'] ?? ''),
            ];
        } catch (Throwable $e) {
            @error_log('[AuditChainService] record failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Verify chain integrity from a given chain_id forward.
     * Returns null if the chain is intact, or the diagnostic row of the
     * first broken entry.
     *
     * @return array<string,mixed>|null
     */
    public function verifyFrom(int $fromChainId = 0): ?array
    {
        try {
            $row = $this->db->queryOne(
                'SELECT * FROM audit_event_chain_verify(:from_id)',
                [':from_id' => $fromChainId],
            );
            return is_array($row) && !empty($row) ? $row : null;
        } catch (Throwable $e) {
            @error_log('[AuditChainService] verify failed: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}
