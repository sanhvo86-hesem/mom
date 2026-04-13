<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use DateTimeImmutable;
use DateTimeInterface;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Event types supported by the audit trail.
 */
enum AuditEventType: string
{
    case CREATED         = 'CREATED';
    case UPDATED         = 'UPDATED';
    case DELETED         = 'DELETED';
    case STATUS_CHANGED  = 'STATUS_CHANGED';
    case APPROVED        = 'APPROVED';
    case REJECTED        = 'REJECTED';
    case SUBMITTED       = 'SUBMITTED';
    case ASSIGNED        = 'ASSIGNED';
    case COMMENTED       = 'COMMENTED';
    case ATTACHED        = 'ATTACHED';
    case PRINTED         = 'PRINTED';
    case EXPORTED        = 'EXPORTED';
    case VIEWED          = 'VIEWED';
}

/**
 * Immutable audit event data transfer object.
 */
final readonly class AuditEvent
{
    public string $eventId;
    public string $recordedAt;

    /**
     * @param AuditEventType $eventType     Type of event.
     * @param string         $aggregateType Entity type (e.g. "NCR", "CAPA", "Document").
     * @param string         $aggregateId   Entity identifier (e.g. "NCR-2026-001").
     * @param string         $actorId       User who performed the action.
     * @param array          $payload       Event-specific data (before/after, details).
     * @param array          $metadata      Context data (IP, session, user_agent).
     * @param string|null    $esigReason    Electronic-signature reason (21 CFR Part 11 prep).
     */
    public function __construct(
        public AuditEventType $eventType,
        public string $aggregateType,
        public string $aggregateId,
        public string $actorId,
        public array $payload = [],
        public array $metadata = [],
        public ?string $esigReason = null,
    ) {
        $this->eventId = self::generateUuid();
        $this->recordedAt = gmdate('Y-m-d\TH:i:s.v\Z');
    }

    /**
     * Generate a UUID v4.
     */
    private static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant 1
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Serialize to array for storage.
     */
    public function toArray(): array
    {
        return [
            'event_id'       => $this->eventId,
            'event_type'     => $this->eventType->value,
            'aggregate_type' => $this->aggregateType,
            'aggregate_id'   => $this->aggregateId,
            'actor_id'       => $this->actorId,
            'payload'        => $this->payload,
            'metadata'       => $this->metadata,
            'esig_reason'    => $this->esigReason,
            'recorded_at'    => $this->recordedAt,
        ];
    }
}

// ── Audit Trail Service ─────────────────────────────────────────────────────

/**
 * Immutable event-sourcing audit trail for ISO 9001 / AS9100 compliance.
 *
 * All events are append-only -- no update or delete operations exist.
 * Each event is hash-chained to the previous event for tamper detection.
 * Electronic-signature fields prepare for 21 CFR Part 11 compliance.
 *
 * Supports both PostgreSQL (JSONB payload) and JSON file storage, following
 * the DataLayer migration-mode pattern.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class AuditTrail
{
    /** Maximum events per query to prevent memory exhaustion. */
    private const MAX_QUERY_LIMIT = 5000;

    /** Hash algorithm for tamper-detection chain. */
    private const HASH_ALGO = 'sha256';

    /** Canonical regulated aggregates must not silently downgrade to JSON fallback. */
    private const AUTHORITATIVE_AGGREGATE_TYPES = [
        'audit_pack',
        'change_order',
        'change_request',
        'doc_revision',
        'doc_revisions',
        'document_revision',
        'evidence_artifact',
        'evidence_package',
        'evidence_publication',
        'evidence_record',
        'evidence_version',
        'frm_issuance',
        'frm_submission_attempt',
        'integrity_digest',
        'integrity_exception',
        'plm_change_order',
        'plm_change_request',
        'publication',
        'retention_lock',
        'signature_event',
    ];

    /** Directory for JSON-based event storage. */
    private readonly string $eventDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string          $dataDir Absolute path to data directory.
     * @param Connection|null $db      Optional database connection.
     */
    public function __construct(
        string $dataDir,
        private readonly ?Connection $db = null,
    ) {
        $this->eventDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/audit-trail';
        if (!is_dir($this->eventDir)) {
            @mkdir($this->eventDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Append an immutable event to the audit trail.
     *
     * Events can never be updated or deleted once logged.
     *
     * @param AuditEvent $event The event to record.
     * @throws RuntimeException If the event cannot be persisted.
     */
    public function logEvent(AuditEvent $event): void
    {
        $record = $event->toArray();
        $requiresAuthoritativeStore = $this->requiresAuthoritativeStore($event);

        // Build hash chain: hash of this event includes the previous event's hash
        $prevHash = $this->getLastEventHash($event->aggregateType, $event->aggregateId, $requiresAuthoritativeStore);
        $record['prev_hash'] = $prevHash;
        $record['event_hash'] = hash(self::HASH_ALGO, json_encode($this->canonicalHashRecord($record), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        // Electronic signature block
        if ($event->esigReason !== null) {
            $record['esig'] = [
                'signer'    => $event->actorId,
                'reason'    => $event->esigReason,
                'timestamp' => $event->recordedAt,
                'hash'      => hash(self::HASH_ALGO, $event->actorId . '|' . $event->esigReason . '|' . $event->recordedAt),
            ];
        }

        // Persist to PostgreSQL if available
        if ($this->db !== null) {
            try {
                $this->persistToPostgres($record);
            } catch (\Throwable $e) {
                if ($requiresAuthoritativeStore) {
                    throw new RuntimeException(
                        'Authoritative audit write failed for controlled event: ' . $e->getMessage(),
                        0,
                        $e,
                    );
                }
                error_log('[AuditTrail] PG write failed, falling back to JSON: ' . $e->getMessage());
                $this->persistToJson($record);
            }
        } else {
            if ($requiresAuthoritativeStore) {
                throw new RuntimeException('Authoritative audit store is required for controlled event.');
            }
            $this->persistToJson($record);
        }
    }

    /**
     * Query events with flexible filters.
     *
     * @param array $filters Supported keys:
     *   - aggregate_type: string
     *   - aggregate_id:   string
     *   - event_type:     string|AuditEventType
     *   - actor_id:       string
     *   - date_from:      string (ISO 8601)
     *   - date_to:        string (ISO 8601)
     *   - limit:          int (default 100, max 5000)
     *   - offset:         int (default 0)
     * @return array List of event records.
     */
    public function getEvents(array $filters = []): array
    {
        $limit = min((int) ($filters['limit'] ?? 100), self::MAX_QUERY_LIMIT);
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        if ($this->db !== null) {
            try {
                return $this->queryPostgres($filters, $limit, $offset);
            } catch (\Throwable) {
                // Fall through to JSON
            }
        }

        return $this->queryJson($filters, $limit, $offset);
    }

    /**
     * Get the full event history of a specific entity.
     *
     * @param string $entityType Entity type (e.g. "NCR").
     * @param string $entityId   Entity ID (e.g. "NCR-2026-001").
     * @return array Chronological list of events.
     */
    public function getEntityHistory(string $entityType, string $entityId): array
    {
        return $this->getEvents([
            'aggregate_type' => $entityType,
            'aggregate_id'   => $entityId,
            'limit'          => self::MAX_QUERY_LIMIT,
        ]);
    }

    /**
     * Reconstruct entity state at a specific point in time by replaying events.
     *
     * @param string                 $entityType Entity type.
     * @param string                 $entityId   Entity ID.
     * @param DateTimeInterface|null $asOf       Point-in-time (null = current state).
     * @return array Reconstructed state snapshot.
     */
    public function getEntitySnapshot(
        string $entityType,
        string $entityId,
        ?DateTimeInterface $asOf = null,
    ): array {
        $filters = [
            'aggregate_type' => $entityType,
            'aggregate_id'   => $entityId,
            'limit'          => self::MAX_QUERY_LIMIT,
        ];

        if ($asOf !== null) {
            $filters['date_to'] = $asOf->format('Y-m-d\TH:i:s\Z');
        }

        $events = $this->getEvents($filters);
        $state = [
            '_entity_type' => $entityType,
            '_entity_id'   => $entityId,
            '_event_count' => count($events),
            '_snapshot_at' => $asOf?->format('Y-m-d\TH:i:s\Z') ?? gmdate('Y-m-d\TH:i:s\Z'),
        ];

        // Replay events to build state
        foreach ($events as $event) {
            $payload = is_string($event['payload'] ?? null)
                ? (json_decode($event['payload'], true) ?? [])
                : ($event['payload'] ?? []);
            $eventType = $event['event_type'] ?? '';

            match ($eventType) {
                'CREATED' => $state = array_merge($state, $payload),
                'UPDATED' => $state = array_merge($state, $payload['after'] ?? $payload),
                'STATUS_CHANGED' => $state['_status'] = $payload['to'] ?? ($payload['status'] ?? ''),
                'DELETED' => $state['_deleted'] = true,
                'APPROVED' => $state = array_merge($state, [
                    '_status' => 'approved',
                    '_approved_by' => $event['actor_id'] ?? '',
                    '_approved_at' => $event['recorded_at'] ?? '',
                ]),
                'REJECTED' => $state = array_merge($state, [
                    '_status' => 'rejected',
                    '_rejected_by' => $event['actor_id'] ?? '',
                    '_rejected_at' => $event['recorded_at'] ?? '',
                ]),
                default => null,
            };
        }

        return $state;
    }

    /**
     * Verify the hash chain integrity for an entity's events.
     *
     * @param string $entityType Entity type.
     * @param string $entityId   Entity ID.
     * @return array{valid: bool, errors: string[]} Verification result.
     */
    public function verifyIntegrity(string $entityType, string $entityId): array
    {
        $events = $this->getEntityHistory($entityType, $entityId);
        $errors = [];
        $prevHash = '';

        foreach ($events as $i => $event) {
            // Check prev_hash linkage
            $storedPrevHash = $event['prev_hash'] ?? '';
            if ($storedPrevHash !== $prevHash) {
                $errors[] = sprintf(
                    'Event #%d (%s): prev_hash mismatch (expected %s, got %s)',
                    $i,
                    $event['event_id'] ?? '?',
                    substr($prevHash, 0, 12) ?: '(empty)',
                    substr($storedPrevHash, 0, 12) ?: '(empty)',
                );
            }

            // Recompute event hash
            $storedHash = (string)($event['event_hash'] ?? '');
            $computed = hash(self::HASH_ALGO, json_encode($this->canonicalHashRecord($event), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            if ($computed !== $storedHash) {
                $errors[] = sprintf(
                    'Event #%d (%s): event_hash tampered (computed %s, stored %s)',
                    $i,
                    $event['event_id'] ?? '?',
                    substr($computed, 0, 12),
                    substr($storedHash, 0, 12),
                );
            }

            $prevHash = $storedHash;
        }

        return ['valid' => count($errors) === 0, 'errors' => $errors];
    }

    /**
     * Export events to CSV format.
     *
     * @param array  $filters Same filters as getEvents().
     * @param string $outputPath Absolute path to write CSV file.
     * @return int Number of rows exported.
     */
    public function exportToCsv(array $filters, string $outputPath): int
    {
        $events = $this->getEvents(array_merge($filters, ['limit' => self::MAX_QUERY_LIMIT]));

        $fh = fopen($outputPath, 'w');
        if ($fh === false) {
            throw new RuntimeException("Cannot open export file: {$outputPath}");
        }

        // Header row
        fputcsv($fh, [
            'event_id', 'event_type', 'aggregate_type', 'aggregate_id',
            'actor_id', 'recorded_at', 'esig_reason', 'payload_summary',
        ]);

        $count = 0;
        foreach ($events as $event) {
            $payload = is_string($event['payload'] ?? null)
                ? $event['payload']
                : json_encode($event['payload'] ?? [], JSON_UNESCAPED_UNICODE);
            $summary = mb_substr($payload, 0, 500);

            fputcsv($fh, [
                $event['event_id'] ?? '',
                $event['event_type'] ?? '',
                $event['aggregate_type'] ?? '',
                $event['aggregate_id'] ?? '',
                $event['actor_id'] ?? '',
                $event['recorded_at'] ?? '',
                $event['esig_reason'] ?? '',
                $summary,
            ]);
            $count++;
        }

        fclose($fh);
        return $count;
    }

    // ── PostgreSQL Backend ──────────────────────────────────────────────────

    /**
     * Insert event into PostgreSQL audit_events table.
     */
    private function persistToPostgres(array $record): void
    {
        $actor = (string)($record['actor_id'] ?? '');
        $actorUuid = $this->resolveUserUuid($actor);
        $metadata = is_array($record['metadata'] ?? null) ? $record['metadata'] : [];
        unset($metadata['audit_chain'], $metadata['esig']);

        $storageMetadata = $metadata;
        $storageMetadata['audit_chain'] = [
            'prev_hash' => (string)($record['prev_hash'] ?? ''),
            'event_hash' => (string)($record['event_hash'] ?? ''),
            'esig_reason' => $record['esig_reason'] ?? null,
            'original_actor_id' => $actor,
        ];
        if (isset($record['esig'])) {
            $storageMetadata['esig'] = $record['esig'];
        }

        $params = [
            ':event_id'       => $record['event_id'],
            ':event_type'     => $record['event_type'],
            ':aggregate_type' => $record['aggregate_type'],
            ':aggregate_id'   => $record['aggregate_id'],
            ':actor_id'       => $actorUuid,
            ':actor_name'     => $actorUuid === null && $actor !== '' ? $actor : null,
            ':payload'        => json_encode($record['payload'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':metadata'       => json_encode($storageMetadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':recorded_at'    => $record['recorded_at'],
            ':source_event_hash' => $record['event_hash'] ?? '',
        ];

        $sql = <<<'SQL'
            INSERT INTO audit_events (
                event_id, event_type, aggregate_type, aggregate_id,
                actor_id, actor_name, payload, metadata, recorded_at, source_event_hash
            ) VALUES (
                CAST(:event_id AS uuid), :event_type, :aggregate_type, :aggregate_id,
                CAST(:actor_id AS uuid), :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb),
                CAST(:recorded_at AS timestamptz), :source_event_hash
            )
        SQL;

        try {
            $this->db->execute($sql, $params);
            return;
        } catch (\Throwable $e) {
            if (!str_contains(strtolower($e->getMessage()), 'source_event_hash')) {
                throw $e;
            }
        }

        unset($params[':source_event_hash']);
        $fallbackSql = <<<'SQL'
            INSERT INTO audit_events (
                event_id, event_type, aggregate_type, aggregate_id,
                actor_id, actor_name, payload, metadata, recorded_at
            ) VALUES (
                CAST(:event_id AS uuid), :event_type, :aggregate_type, :aggregate_id,
                CAST(:actor_id AS uuid), :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb),
                CAST(:recorded_at AS timestamptz)
            )
        SQL;
        $this->db->execute($fallbackSql, $params);
    }

    /**
     * Query events from PostgreSQL with filters.
     */
    private function queryPostgres(array $filters, int $limit, int $offset): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['aggregate_type'])) {
            $where[] = 'aggregate_type = :atype';
            $params[':atype'] = $filters['aggregate_type'];
        }
        if (!empty($filters['aggregate_id'])) {
            $where[] = 'aggregate_id = :aid';
            $params[':aid'] = $filters['aggregate_id'];
        }
        if (!empty($filters['event_type'])) {
            $et = $filters['event_type'];
            $where[] = 'event_type = :etype';
            $params[':etype'] = ($et instanceof AuditEventType) ? $et->value : (string) $et;
        }
        if (!empty($filters['actor_id'])) {
            $where[] = 'actor_id = :actor';
            $params[':actor'] = $filters['actor_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'recorded_at >= :dfrom';
            $params[':dfrom'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'recorded_at <= :dto';
            $params[':dto'] = $filters['date_to'];
        }

        $sql = 'SELECT * FROM audit_events';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY recorded_at ASC LIMIT :lim OFFSET :off';
        $params[':lim'] = $limit;
        $params[':off'] = $offset;

        $rows = $this->db->query($sql, $params);

        // Decode JSON columns
        return array_map(function (array $row): array {
            foreach (['payload', 'metadata', 'esig'] as $col) {
                if (is_string($row[$col] ?? null)) {
                    $row[$col] = json_decode($row[$col], true) ?? [];
                }
            }
            $metadata = is_array($row['metadata'] ?? null) ? $row['metadata'] : [];
            $chain = is_array($metadata['audit_chain'] ?? null) ? $metadata['audit_chain'] : [];
            if (array_key_exists('original_actor_id', $chain)) {
                $row['actor_id'] = (string)$chain['original_actor_id'];
            }
            $row['prev_hash'] = (string)($row['prev_hash'] ?? ($chain['prev_hash'] ?? ''));
            $row['event_hash'] = (string)($row['event_hash'] ?? ($row['source_event_hash'] ?? ($chain['event_hash'] ?? '')));
            $row['esig_reason'] = $row['esig_reason'] ?? ($chain['esig_reason'] ?? null);
            $row['esig'] = is_array($metadata['esig'] ?? null) ? $metadata['esig'] : ($row['esig'] ?? []);
            unset($metadata['audit_chain'], $metadata['esig']);
            $row['metadata'] = $metadata;
            return $row;
        }, $rows);
    }

    // ── JSON File Backend ───────────────────────────────────────────────────

    /**
     * Append event to a per-aggregate JSON file.
     */
    private function persistToJson(array $record): void
    {
        $dir = $this->eventDir . '/' . strtolower($record['aggregate_type']);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $file = $dir . '/' . $this->safeFilename($record['aggregate_id']) . '.jsonl';

        $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        $result = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        if ($result === false) {
            throw new RuntimeException("Failed to write audit event to: {$file}");
        }
    }

    /**
     * Query events from JSON files with filters.
     */
    private function queryJson(array $filters, int $limit, int $offset): array
    {
        $events = [];

        // Determine which files to scan
        $aggType = $filters['aggregate_type'] ?? null;
        $aggId = $filters['aggregate_id'] ?? null;

        if ($aggType !== null && $aggId !== null) {
            // Single entity: read one file
            $file = $this->eventDir . '/' . strtolower($aggType) . '/' . $this->safeFilename($aggId) . '.jsonl';
            $events = $this->readJsonlFile($file);
        } elseif ($aggType !== null) {
            // All entities of a type: scan directory
            $dir = $this->eventDir . '/' . strtolower($aggType);
            $events = $this->readJsonlDirectory($dir);
        } else {
            // All events: scan all subdirectories
            if (is_dir($this->eventDir)) {
                $dirs = glob($this->eventDir . '/*', GLOB_ONLYDIR);
                foreach ($dirs ?: [] as $dir) {
                    $events = array_merge($events, $this->readJsonlDirectory($dir));
                }
            }
        }

        // Apply remaining filters
        $events = $this->applyJsonFilters($events, $filters);

        // Sort chronologically
        usort($events, fn(array $a, array $b) => ($a['recorded_at'] ?? '') <=> ($b['recorded_at'] ?? ''));

        // Apply offset and limit
        return array_slice($events, $offset, $limit);
    }

    /**
     * Get the hash of the last event for an entity (for chain linking).
     */
    private function getLastEventHash(string $aggType, string $aggId, bool $requiresAuthoritativeStore = false): string
    {
        // Try PostgreSQL first
        if ($this->db !== null) {
            $lastFailure = null;
            try {
                $row = $this->db->queryOne(
                    "SELECT COALESCE(source_event_hash, metadata -> 'audit_chain' ->> 'event_hash') AS event_hash
                     FROM audit_events
                     WHERE aggregate_type = :t AND aggregate_id = :id
                     ORDER BY recorded_at DESC LIMIT 1",
                    [':t' => $aggType, ':id' => $aggId],
                );
                if ($row !== null) {
                    return (string) ($row['event_hash'] ?? '');
                }
            } catch (\Throwable $e) {
                $lastFailure = $e;
                try {
                    $row = $this->db->queryOne(
                        "SELECT metadata -> 'audit_chain' ->> 'event_hash' AS event_hash
                         FROM audit_events
                         WHERE aggregate_type = :t AND aggregate_id = :id
                         ORDER BY recorded_at DESC LIMIT 1",
                        [':t' => $aggType, ':id' => $aggId],
                    );
                    if ($row !== null) {
                        return (string)($row['event_hash'] ?? '');
                    }
                } catch (\Throwable $fallbackFailure) {
                    $lastFailure = $fallbackFailure;
                }
            }

            if ($requiresAuthoritativeStore) {
                if ($lastFailure !== null) {
                    throw new RuntimeException(
                        'Authoritative audit chain is unavailable for controlled event: ' . $lastFailure->getMessage(),
                        0,
                        $lastFailure,
                    );
                }
                return '';
            }
        } elseif ($requiresAuthoritativeStore) {
            throw new RuntimeException('Authoritative audit store is required for controlled event.');
        }

        // JSON fallback: read last line of JSONL file
        $file = $this->eventDir . '/' . strtolower($aggType) . '/' . $this->safeFilename($aggId) . '.jsonl';
        if (!is_file($file)) {
            return '';
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false || count($lines) === 0) {
            return '';
        }

        $last = json_decode(end($lines), true);
        return is_array($last) ? (string) ($last['event_hash'] ?? '') : '';
    }

    private function requiresAuthoritativeStore(AuditEvent $event): bool
    {
        foreach (['audit_fail_closed', 'authoritative_audit_required', 'controlled_record'] as $flag) {
            if ($this->boolValue($event->metadata[$flag] ?? false)) {
                return true;
            }
        }

        $aggregateType = strtolower(trim($event->aggregateType));
        return in_array($aggregateType, self::AUTHORITATIVE_AGGREGATE_TYPES, true);
    }

    private function boolValue(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }

    /**
     * Read all events from a JSONL file.
     */
    private function readJsonlFile(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return [];
        }

        $events = [];
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) {
                $events[] = $decoded;
            }
        }

        return $events;
    }

    /**
     * Read all JSONL files in a directory.
     */
    private function readJsonlDirectory(string $dir): array
    {
        if (!is_dir($dir)) {
            return [];
        }

        $events = [];
        $files = glob($dir . '/*.jsonl');
        foreach ($files ?: [] as $file) {
            $events = array_merge($events, $this->readJsonlFile($file));
        }

        return $events;
    }

    /**
     * Apply query filters to an in-memory event array.
     */
    private function applyJsonFilters(array $events, array $filters): array
    {
        return array_values(array_filter($events, function (array $event) use ($filters): bool {
            if (!empty($filters['event_type'])) {
                $et = $filters['event_type'];
                $target = ($et instanceof AuditEventType) ? $et->value : (string) $et;
                if (($event['event_type'] ?? '') !== $target) {
                    return false;
                }
            }
            if (!empty($filters['actor_id'])) {
                if (($event['actor_id'] ?? '') !== $filters['actor_id']) {
                    return false;
                }
            }
            if (!empty($filters['date_from'])) {
                if (($event['recorded_at'] ?? '') < $filters['date_from']) {
                    return false;
                }
            }
            if (!empty($filters['date_to'])) {
                if (($event['recorded_at'] ?? '') > $filters['date_to']) {
                    return false;
                }
            }
            return true;
        }));
    }

    /**
     * Build the exact event subset covered by the tamper-evident event hash.
     *
     * Storage-only fields such as Postgres actor_name/source_event_hash and the
     * e-signature envelope are intentionally excluded; the original hash is
     * computed before the optional e-signature block is attached.
     */
    private function canonicalHashRecord(array $event): array
    {
        $metadata = is_array($event['metadata'] ?? null) ? $event['metadata'] : [];
        unset($metadata['audit_chain'], $metadata['esig']);

        return [
            'event_id'       => (string)($event['event_id'] ?? ''),
            'event_type'     => (string)($event['event_type'] ?? ''),
            'aggregate_type' => (string)($event['aggregate_type'] ?? ''),
            'aggregate_id'   => (string)($event['aggregate_id'] ?? ''),
            'actor_id'       => (string)($event['actor_id'] ?? ''),
            'payload'        => is_array($event['payload'] ?? null) ? $event['payload'] : [],
            'metadata'       => $metadata,
            'esig_reason'    => $event['esig_reason'] ?? null,
            'recorded_at'    => (string)($event['recorded_at'] ?? ''),
            'prev_hash'      => (string)($event['prev_hash'] ?? ''),
        ];
    }

    private function resolveUserUuid(string $actor): ?string
    {
        $actor = trim($actor);
        if ($actor === '') {
            return null;
        }
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $actor) === 1) {
            return strtolower($actor);
        }
        if ($this->db === null) {
            return null;
        }

        try {
            $row = $this->db->queryOne(
                'SELECT user_id FROM users WHERE username = :actor OR employee_id = :actor OR email = :actor LIMIT 1',
                [':actor' => $actor],
            );
            if (is_array($row) && !empty($row['user_id'])) {
                return (string)$row['user_id'];
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    /**
     * Sanitize an entity ID for use as a filename.
     */
    private function safeFilename(string $id): string
    {
        return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $id);
    }
}
