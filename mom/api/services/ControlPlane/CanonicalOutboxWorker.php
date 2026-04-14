<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Worker for canonical migration-106/108 outbox_events.
 */
final class CanonicalOutboxWorker
{
    private const DEFAULT_MAX_ATTEMPTS = 5;

    private ?object $db;

    /**
     * @param array<string, callable> $handlers handler_key or event_type => handler
     */
    public function __construct(?object $db = null, private readonly array $handlers = [])
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @return array{processed: int, failed: int, dead_letter: int, skipped: int}
     */
    public function runOnce(int $limit = 50, string $leaseOwner = 'canonical-outbox-worker'): array
    {
        if ($this->db === null || !method_exists($this->db, 'query') || !method_exists($this->db, 'execute')) {
            return ['processed' => 0, 'failed' => 0, 'dead_letter' => 0, 'skipped' => 0];
        }

        $rows = $this->db->query(
            "SELECT *
             FROM outbox_events
             WHERE outbox_state IN ('pending', 'failed', 'retry_scheduled')
               AND (next_attempt_at IS NULL OR next_attempt_at <= now())
               AND (leased_until IS NULL OR leased_until <= now())
             ORDER BY occurred_at
             LIMIT :limit",
            [':limit' => max(1, min(500, $limit))],
        );

        $result = ['processed' => 0, 'failed' => 0, 'dead_letter' => 0, 'skipped' => 0];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                $result['skipped']++;
                continue;
            }

            $id = (string)($row['outbox_event_id'] ?? '');
            $handlerKey = (string)($row['handler_key'] ?? '');
            $eventType = (string)($row['event_type'] ?? '');
            $handler = $this->handlers[$handlerKey] ?? $this->handlers[$eventType] ?? null;
            if ($id === '' || !is_callable($handler)) {
                $this->markFailed($id, 'outbox_handler_missing', 'No handler registered for ' . ($handlerKey ?: $eventType));
                $result['failed']++;
                continue;
            }

            try {
                $this->claim($id, $leaseOwner);
                // CTRL-007: Wrap handler execution in try-catch that marks failed properly
                try {
                    $handler($row);
                    $this->markDone($id);
                    $result['processed']++;
                } catch (\Throwable $e) {
                    @error_log('[OutboxWorker] Handler failed: ' . $e->getMessage());
                    // mark failed, do NOT re-throw partial state
                    $attempt = max(0, (int)($row['attempt_count'] ?? 0)) + 1;
                    if ($attempt >= self::DEFAULT_MAX_ATTEMPTS) {
                        $this->markDeadLetter($id, $e);
                        $result['dead_letter']++;
                    } else {
                        $this->markRetry($id, $attempt, $e);
                        $result['failed']++;
                    }
                }
            } catch (\Throwable $e) {
                @error_log('[OutboxWorker] Claim or finalization failed: ' . $e->getMessage());
                // If claiming failed, mark as failed and don't re-throw
                $attempt = max(0, (int)($row['attempt_count'] ?? 0)) + 1;
                if ($attempt >= self::DEFAULT_MAX_ATTEMPTS) {
                    $this->markDeadLetter($id, $e);
                    $result['dead_letter']++;
                } else {
                    $this->markRetry($id, $attempt, $e);
                    $result['failed']++;
                }
            }
        }

        return $result;
    }

    private function claim(string $id, string $leaseOwner): void
    {
        $this->execute(
            "UPDATE outbox_events
             SET outbox_state = 'processing',
                 lease_owner = :lease_owner,
                 leased_until = now() + interval '5 minutes',
                 updated_at = now()
             WHERE outbox_event_id = CAST(:id AS uuid)",
            [':id' => $id, ':lease_owner' => $leaseOwner],
        );
    }

    private function markDone(string $id): void
    {
        $this->execute(
            "UPDATE outbox_events
             SET outbox_state = 'done',
                 lease_owner = NULL,
                 leased_until = NULL,
                 updated_at = now()
             WHERE outbox_event_id = CAST(:id AS uuid)",
            [':id' => $id],
        );
    }

    private function markRetry(string $id, int $attempt, \Throwable $error): void
    {
        $delayMinutes = min(60, 2 ** min(5, $attempt));
        $this->execute(
            "UPDATE outbox_events
             SET outbox_state = 'retry_scheduled',
                 attempt_count = attempt_count + 1,
                 next_attempt_at = now() + (:delay_minutes || ' minutes')::interval,
                 lease_owner = NULL,
                 leased_until = NULL,
                 last_error_code = :error_code,
                 last_error_message = :error_message,
                 updated_at = now()
             WHERE outbox_event_id = CAST(:id AS uuid)",
            [
                ':id' => $id,
                ':delay_minutes' => (string)$delayMinutes,
                ':error_code' => $error::class,
                ':error_message' => $error->getMessage(),
            ],
        );
    }

    private function markDeadLetter(string $id, \Throwable $error): void
    {
        $this->execute(
            "UPDATE outbox_events
             SET outbox_state = 'dead_letter',
                 attempt_count = attempt_count + 1,
                 lease_owner = NULL,
                 leased_until = NULL,
                 dead_letter_reason = :dead_letter_reason,
                 last_error_code = :error_code,
                 last_error_message = :error_message,
                 updated_at = now()
             WHERE outbox_event_id = CAST(:id AS uuid)",
            [
                ':id' => $id,
                ':dead_letter_reason' => $error->getMessage(),
                ':error_code' => $error::class,
                ':error_message' => $error->getMessage(),
            ],
        );
    }

    private function markFailed(string $id, string $code, string $message): void
    {
        if ($id === '') {
            return;
        }
        $this->execute(
            "UPDATE outbox_events
             SET outbox_state = 'failed',
                 attempt_count = attempt_count + 1,
                 last_error_code = :error_code,
                 last_error_message = :error_message,
                 updated_at = now()
             WHERE outbox_event_id = CAST(:id AS uuid)",
            [':id' => $id, ':error_code' => $code, ':error_message' => $message],
        );
    }

    /**
     * @param array<string, mixed> $params
     */
    private function execute(string $sql, array $params): void
    {
        if ($this->db !== null && method_exists($this->db, 'execute')) {
            $this->db->execute($sql, $params);
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
}
