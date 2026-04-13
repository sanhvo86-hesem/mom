<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Legacy domain_outbox_events drain worker.
 *
 * New side effects must be dispatched from CanonicalOutboxWorker/outbox_events.
 * This worker remains only to drain or dead-letter rows created before the
 * canonical outbox cutover.
 */
final class DomainOutboxWorker
{
    private const MAX_ATTEMPTS = 5;

    private ?object $db;

    /**
     * @param array<string, callable> $handlers event_type => handler
     */
    public function __construct(?object $db = null, private readonly array $handlers = [])
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @return array{processed: int, failed: int, dead_letter: int}
     */
    public function runOnce(int $limit = 50): array
    {
        if ($this->db === null || !method_exists($this->db, 'query') || !method_exists($this->db, 'execute')) {
            return ['processed' => 0, 'failed' => 0, 'dead_letter' => 0];
        }

        $rows = $this->db->query(
            "SELECT *
             FROM domain_outbox_events
             WHERE status IN ('pending', 'failed')
               AND (next_attempt_at IS NULL OR next_attempt_at <= now())
             ORDER BY occurred_at
             LIMIT :limit",
            [':limit' => max(1, min(500, $limit))],
        );

        $processed = 0;
        $failed = 0;
        $deadLetter = 0;
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = (string)($row['domain_outbox_event_id'] ?? '');
            $eventType = (string)($row['event_type'] ?? '');
            try {
                $this->mark($id, 'processing', null);
                $handler = $this->handlers[$eventType] ?? null;
                if (!is_callable($handler)) {
                    throw new \RuntimeException('outbox_handler_missing:' . $eventType);
                }
                $handler($row);
                $this->mark($id, 'done', null);
                $processed++;
            } catch (\Throwable $e) {
                $attempts = max(0, (int)($row['attempts'] ?? 0)) + 1;
                $this->mark($id, 'failed', $e);
                if ($attempts >= self::MAX_ATTEMPTS) {
                    $deadLetter++;
                } else {
                    $failed++;
                }
            }
        }

        return ['processed' => $processed, 'failed' => $failed, 'dead_letter' => $deadLetter];
    }

    private function mark(string $id, string $status, ?\Throwable $error): void
    {
        if ($id === '' || $this->db === null || !method_exists($this->db, 'execute')) {
            return;
        }

        $this->db->execute(
            "UPDATE domain_outbox_events
             SET status = CASE
                     WHEN :status = 'failed' AND attempts + 1 >= :max_attempts THEN 'dead_letter'
                     ELSE :status
                 END,
                 attempts = CASE WHEN :status = 'failed' THEN attempts + 1 ELSE attempts END,
                 last_attempt_at = now(),
                 next_attempt_at = CASE
                     WHEN :status = 'failed' AND attempts + 1 < :max_attempts THEN now() + interval '5 minutes'
                     ELSE NULL
                 END,
                 error_class = :error_class,
                 error_message = :error_message,
                 updated_at = now()
             WHERE domain_outbox_event_id = CAST(:id AS uuid)",
            [
                ':status' => $status,
                ':max_attempts' => self::MAX_ATTEMPTS,
                ':error_class' => $error ? $error::class : null,
                ':error_message' => $error ? $error->getMessage() : null,
                ':id' => $id,
            ],
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
}
