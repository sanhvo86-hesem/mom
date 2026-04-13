<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Canonical outbox writer for migration 106/108 outbox_events.
 *
 * DomainOutboxService is now a compatibility wrapper that forwards into this
 * canonical table. New control-plane workers should use this class directly.
 */
final class CanonicalOutboxService
{
    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $options
     */
    public function enqueue(
        string $aggregateType,
        string $aggregateId,
        string $eventType,
        array $payload,
        array $options = [],
    ): bool {
        if ($this->db === null || !method_exists($this->db, 'execute')) {
            return false;
        }

        $idempotencyKey = $this->stringOrNull($options['idempotency_key'] ?? null);
        $dedupeKey = $this->stringOrNull($options['dedupe_key'] ?? null);
        if ($dedupeKey === null && $idempotencyKey !== null) {
            $dedupeKey = hash('sha256', $aggregateType . '|' . $aggregateId . '|' . $eventType . '|' . $idempotencyKey);
        }

        try {
            $this->db->execute(
                'INSERT INTO outbox_events
                    (aggregate_type, aggregate_id, event_type, event_version, payload, outbox_state,
                     idempotency_key, correlation_id, causation_id, handler_key, dedupe_key,
                     payload_schema_version, next_attempt_at)
                 VALUES
                    (:aggregate_type, :aggregate_id, :event_type, :event_version, CAST(:payload AS jsonb), :outbox_state,
                     :idempotency_key, :correlation_id, :causation_id, :handler_key, :dedupe_key,
                     :payload_schema_version, :next_attempt_at)
                 ON CONFLICT DO NOTHING',
                [
                    ':aggregate_type' => $aggregateType,
                    ':aggregate_id' => $aggregateId,
                    ':event_type' => $eventType,
                    ':event_version' => max(1, (int)($options['event_version'] ?? 1)),
                    ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':outbox_state' => (string)($options['outbox_state'] ?? 'pending'),
                    ':idempotency_key' => $idempotencyKey,
                    ':correlation_id' => $this->stringOrNull($options['correlation_id'] ?? null),
                    ':causation_id' => $this->stringOrNull($options['causation_id'] ?? null),
                    ':handler_key' => $this->stringOrNull($options['handler_key'] ?? null),
                    ':dedupe_key' => $dedupeKey,
                    ':payload_schema_version' => (string)($options['payload_schema_version'] ?? 'outbox_event.v1'),
                    ':next_attempt_at' => $this->stringOrNull($options['next_attempt_at'] ?? null),
                ],
            );
            return true;
        } catch (\Throwable $e) {
            error_log('[CanonicalOutboxService] enqueue failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * @param array<string, mixed> $publicationPayload
     * @param array<string, mixed> $options
     */
    public function enqueuePublication(string $evidenceVersionId, array $publicationPayload, array $options = []): bool
    {
        return $this->enqueue(
            'evidence_version',
            $evidenceVersionId,
            'EvidencePublicationRequested',
            $publicationPayload,
            array_merge($options, [
                'handler_key' => 'publication.sharepoint_graph',
                'payload_schema_version' => 'publication_request.v1',
            ]),
        );
    }

    /**
     * @param array<string, mixed> $exportPayload
     * @param array<string, mixed> $options
     */
    public function enqueueAuditPack(string $scopeRef, array $exportPayload, array $options = []): bool
    {
        return $this->enqueue(
            'audit_pack',
            $scopeRef,
            'AuditPackExportRequested',
            $exportPayload,
            array_merge($options, [
                'handler_key' => 'audit_pack.export',
                'payload_schema_version' => 'audit_pack_export.v1',
            ]),
        );
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

    private function stringOrNull(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string)$value);
        return $text === '' ? null : $text;
    }
}
