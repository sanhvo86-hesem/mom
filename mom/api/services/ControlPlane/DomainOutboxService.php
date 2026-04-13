<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Minimal DB-backed domain outbox writer.
 */
final class DomainOutboxService
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

        try {
            $this->db->execute(
                'INSERT INTO domain_outbox_events
                    (aggregate_type, aggregate_id, event_type, payload, idempotency_key, correlation_id)
                 VALUES
                    (:aggregate_type, :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, :correlation_id)
                 ON CONFLICT DO NOTHING',
                [
                    ':aggregate_type' => $aggregateType,
                    ':aggregate_id' => $aggregateId,
                    ':event_type' => $eventType,
                    ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':idempotency_key' => $this->stringOrNull($options['idempotency_key'] ?? null),
                    ':correlation_id' => $this->stringOrNull($options['correlation_id'] ?? null),
                ],
            );
            return true;
        } catch (\Throwable $e) {
            error_log('[DomainOutboxService] enqueue failed: ' . $e->getMessage());
            return false;
        }
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
