<?php

declare(strict_types=1);

namespace MOM\Services\Publication;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use MOM\Services\ControlPlane\CanonicalOutboxService;
use RuntimeException;

/**
 * Operational monitor for asynchronous publication.
 *
 * SharePoint remains a read-only publication target. This service exposes the
 * authoritative publication state and queues retry/withdraw/supersede commands
 * through the canonical outbox instead of letting users upload to SharePoint.
 */
final class PublicationMonitorService
{
    private ?object $db;
    private CanonicalOutboxService $outbox;

    public function __construct(?object $db = null, ?CanonicalOutboxService $outbox = null)
    {
        $this->db = $this->normalizeDb($db);
        $this->outbox = $outbox ?? new CanonicalOutboxService($this->db);
    }

    /**
     * @return array<string, mixed>
     */
    public function summarize(array $filters = []): array
    {
        $this->requireDb();

        $state = $this->text($filters['state'] ?? '');
        $limit = max(1, min(500, (int)($filters['limit'] ?? 100)));
        $where = '';
        $params = [':limit' => $limit];
        if ($state !== '') {
            $where = 'WHERE ep.publication_state = :state';
            $params[':state'] = $state;
        }

        $items = $this->db->query(
            "SELECT ep.*, ev.evidence_record_id
             FROM evidence_publications ep
             JOIN evidence_versions ev ON ev.evidence_version_id = ep.evidence_version_id
             {$where}
             ORDER BY ep.updated_at DESC, ep.created_at DESC
             LIMIT :limit",
            $params,
        );

        $counts = $this->db->query(
            "SELECT publication_state, count(*) AS count
             FROM evidence_publications
             GROUP BY publication_state
             ORDER BY publication_state",
        );

        return [
            'counts' => $counts,
            'items' => array_map([$this, 'decodeJsonColumns'], is_array($items) ? $items : []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function queueAction(string $publicationId, string $action, string $actorRef, string $reason, string $idempotencyKey): array
    {
        $this->requireDb();
        if (preg_match('/^[a-f0-9-]{36}$/i', $publicationId) !== 1) {
            throw new RuntimeException('invalid_publication_id');
        }
        $action = strtolower(trim($action));
        if (!in_array($action, ['retry', 'withdraw', 'supersede'], true)) {
            throw new RuntimeException('unsupported_publication_action');
        }
        if ($idempotencyKey === '') {
            throw new RuntimeException('idempotency_key_required');
        }

        $publication = $this->db->queryOne(
            'SELECT * FROM evidence_publications WHERE evidence_publication_id = CAST(:id AS uuid)',
            [':id' => $publicationId],
        );
        if (!is_array($publication)) {
            throw new RuntimeException('publication_not_found');
        }

        $this->outbox->enqueue(
            'evidence_publication',
            $publicationId,
            'EvidencePublicationActionRequested',
            [
                'action' => $action,
                'reason' => $reason,
                'actor_ref' => $actorRef,
                'publication_state' => (string)($publication['publication_state'] ?? ''),
            ],
            [
                'idempotency_key' => $idempotencyKey,
                'handler_key' => 'publication.' . $action,
                'payload_schema_version' => 'publication_action.v1',
                'dedupe_key' => hash('sha256', $publicationId . '|' . $action . '|' . $idempotencyKey),
            ],
        );

        return [
            'publication_id' => $publicationId,
            'action' => $action,
            'queued' => true,
        ];
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_publication_store_required');
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

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decodeJsonColumns(array $row): array
    {
        foreach (['publication_receipt', 'metadata'] as $key) {
            if (isset($row[$key]) && is_string($row[$key])) {
                $decoded = json_decode($row[$key], true);
                if (is_array($decoded)) {
                    $row[$key] = $decoded;
                }
            }
        }
        return $row;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }
}
