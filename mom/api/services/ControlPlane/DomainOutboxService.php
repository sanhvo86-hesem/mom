<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Compatibility wrapper for the pre-canonical domain outbox API.
 *
 * New writes are bridged into outbox_events through CanonicalOutboxService.
 * The legacy domain_outbox_events table is retained only for migration/backfill
 * reads; keeping this writer pointed at it would preserve split-brain side
 * effects.
 */
final class DomainOutboxService
{
    private ?object $db;
    private CanonicalOutboxService $canonical;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
        $this->canonical = new CanonicalOutboxService($this->db);
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
        $handlerKey = $this->stringOrNull($options['handler_key'] ?? null);
        if ($handlerKey === null) {
            $handlerKey = 'legacy_domain.' . strtolower((string)preg_replace('/[^a-zA-Z0-9]+/', '_', $eventType));
        }

        return $this->canonical->enqueue(
            $aggregateType,
            $aggregateId,
            $eventType,
            array_merge($payload, [
                '_compatibility' => [
                    'legacy_api' => 'DomainOutboxService',
                    'legacy_table' => 'domain_outbox_events',
                    'canonical_table' => 'outbox_events',
                ],
            ]),
            array_merge($options, [
                'handler_key' => $handlerKey,
                'payload_schema_version' => (string)($options['payload_schema_version'] ?? 'legacy_domain_outbox_bridge.v1'),
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
