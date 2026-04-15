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
        $orgId = $this->text($filters['org_id'] ?? '');
        $limit = max(1, min(500, (int)($filters['limit'] ?? 100)));
        $where = [];
        $params = [':limit' => $limit];
        if ($state !== '') {
            $where[] = 'ep.publication_state = :state';
            $params[':state'] = $state;
        }
        if ($orgId !== '') {
            $where[] = "(ep.metadata->>'org_id' = :org_id OR ev.metadata->>'org_id' = :org_id)";
            $params[':org_id'] = $orgId;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        $items = $this->db->query(
            "SELECT ep.*, ev.evidence_record_id
             FROM evidence_publications ep
             JOIN evidence_versions ev ON ev.evidence_version_id = ep.evidence_version_id
             {$whereSql}
             ORDER BY ep.updated_at DESC, ep.created_at DESC
             LIMIT :limit",
            $params,
        );

        $countWhereSql = $orgId === '' ? '' : "WHERE metadata->>'org_id' = :org_id";
        $countParams = $orgId === '' ? [] : [':org_id' => $orgId];
        $counts = $this->db->query(
            "SELECT publication_state, count(*) AS count
             FROM evidence_publications
             {$countWhereSql}
             GROUP BY publication_state
             ORDER BY publication_state",
            $countParams,
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

        $publication = $this->fetchPublicationWithAuthority($publicationId);
        $targetState = $this->actionTargetState($action);
        if (in_array($action, ['withdraw', 'supersede'], true) && trim($reason) === '') {
            throw new RuntimeException('publication_action_reason_required');
        }
        $transition = (new PublicationStateService())->transition(
            $publication,
            $targetState,
            $this->transitionContext($publication),
        );
        if (empty($transition['allowed'])) {
            throw new RuntimeException((string)($transition['error_code'] ?? 'publication_action_not_allowed'));
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
                'target_publication_state' => $targetState,
                'source_change_order_id' => (string)($this->transitionContext($publication)['change_order_id'] ?? ''),
                'change_order_state' => (string)($this->transitionContext($publication)['change_order_state'] ?? ''),
                'transition' => $transition,
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

    /**
     * Apply a queued publication action. This is the canonical handler body for
     * `publication.retry`, `publication.withdraw`, and `publication.supersede`.
     * It persists the attempt and receipt trail before mutating publication
     * state, so asynchronous publication changes remain auditable.
     *
     * @param array<string, mixed> $outboxRow
     * @return array<string, mixed>
     */
    public function processQueuedAction(array $outboxRow, string $workerRef = 'publication-worker'): array
    {
        $this->requireDb();
        if (!method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_publication_store_required');
        }

        $payload = $this->decodePayload($outboxRow['payload'] ?? []);
        $publicationId = $this->text($payload['publication_id'] ?? $outboxRow['aggregate_id'] ?? '');
        $action = strtolower($this->text($payload['action'] ?? ''));
        if ($publicationId === '' || !in_array($action, ['retry', 'withdraw', 'supersede'], true)) {
            throw new RuntimeException('publication_action_payload_invalid');
        }

        $work = function () use ($publicationId, $action, $payload, $outboxRow, $workerRef): array {
            $publication = $this->fetchPublicationWithAuthority($publicationId);
            $targetState = $this->actionTargetState($action);
            $context = $this->transitionContext($publication);
            $transition = (new PublicationStateService())->transition($publication, $targetState, $context);
            if (empty($transition['allowed'])) {
                throw new RuntimeException((string)($transition['error_code'] ?? 'publication_action_not_allowed'));
            }

            $requestPayload = [
                'action' => $action,
                'reason' => $this->text($payload['reason'] ?? ''),
                'actor_ref' => $this->text($payload['actor_ref'] ?? $workerRef),
                'worker_ref' => $workerRef,
                'transition' => $transition,
                'source_change_order_id' => (string)($context['change_order_id'] ?? ''),
            ];
            $attempt = $this->db->queryOne(
                "INSERT INTO publication_attempts
                    (evidence_publication_id, attempt_no, attempt_state, request_payload)
                 VALUES
                    (CAST(:evidence_publication_id AS uuid),
                     (SELECT COALESCE(MAX(attempt_no), 0) + 1
                        FROM publication_attempts
                       WHERE evidence_publication_id = CAST(:evidence_publication_id AS uuid)),
                     'started', CAST(:request_payload AS jsonb))
                 RETURNING *",
                [
                    ':evidence_publication_id' => $publicationId,
                    ':request_payload' => $this->json($requestPayload),
                ],
            );
            if (!is_array($attempt) || $this->text($attempt['publication_attempt_id'] ?? '') === '') {
                throw new RuntimeException('publication_attempt_persistence_failed');
            }

            $receiptPayload = [
                'action' => $action,
                'publication_id' => $publicationId,
                'previous_state' => (string)($publication['publication_state'] ?? ''),
                'new_state' => $targetState,
                'reason' => $requestPayload['reason'],
                'actor_ref' => $requestPayload['actor_ref'],
                'source_change_order_id' => $requestPayload['source_change_order_id'],
                'processed_at' => gmdate(DATE_ATOM),
            ];
            $receiptHash = hash('sha256', $this->json($receiptPayload));
            $targetUri = $this->text($payload['target_uri'] ?? $payload['notice_uri'] ?? '');
            if ($targetUri === '') {
                $targetUri = 'urn:mom:publication-action:' . $publicationId . ':' . $action . ':' . $receiptHash;
            }

            $receipt = null;
            if (in_array($action, ['withdraw', 'supersede'], true)) {
                $receipt = $this->db->queryOne(
                    "INSERT INTO publication_receipts
                        (evidence_publication_id, target_type, target_uri, target_hash_sha256,
                         source_package_hash_sha256, receipt_payload, verified_at)
                     VALUES
                        (CAST(:evidence_publication_id AS uuid), 'external_index', :target_uri, :target_hash_sha256,
                         :source_package_hash_sha256, CAST(:receipt_payload AS jsonb), now())
                     ON CONFLICT (evidence_publication_id, target_uri) DO UPDATE SET
                         receipt_payload = EXCLUDED.receipt_payload,
                         verified_at = now()
                     RETURNING *",
                    [
                        ':evidence_publication_id' => $publicationId,
                        ':target_uri' => $targetUri,
                        ':target_hash_sha256' => $receiptHash,
                        ':source_package_hash_sha256' => (string)($publication['source_package_hash_sha256'] ?? ''),
                        ':receipt_payload' => $this->json($receiptPayload),
                    ],
                );
            }

            $updated = $this->db->queryOne(
                "UPDATE evidence_publications
                 SET publication_state = :publication_state,
                     attempt_count = attempt_count + 1,
                     publication_receipt = CASE
                         WHEN CAST(:publication_receipt AS jsonb) <> '{}'::jsonb THEN CAST(:publication_receipt AS jsonb)
                         ELSE publication_receipt
                     END,
                     last_error_code = CASE
                         WHEN :publication_state = 'retry_scheduled' THEN COALESCE(NULLIF(last_error_code, ''), 'retry_requested')
                         ELSE NULL
                     END,
                     last_error_message = CASE
                         WHEN :publication_state = 'retry_scheduled' THEN COALESCE(NULLIF(last_error_message, ''), :reason)
                         ELSE NULL
                     END,
                     metadata = metadata || CAST(:metadata AS jsonb),
                     updated_at = now(),
                     row_version = row_version + 1
                 WHERE evidence_publication_id = CAST(:evidence_publication_id AS uuid)
                 RETURNING *",
                [
                    ':evidence_publication_id' => $publicationId,
                    ':publication_state' => $targetState,
                    ':publication_receipt' => $receipt === null ? '{}' : $this->json($receiptPayload),
                    ':reason' => $requestPayload['reason'],
                    ':metadata' => $this->json([
                        'last_publication_action' => $receiptPayload,
                    ]),
                ],
            );
            if (!is_array($updated) || $this->text($updated['evidence_publication_id'] ?? '') === '') {
                throw new RuntimeException('publication_state_update_failed');
            }

            $completed = $this->db->queryOne(
                "UPDATE publication_attempts
                 SET attempt_state = 'succeeded',
                     response_payload = CAST(:response_payload AS jsonb),
                     completed_at = now()
                 WHERE publication_attempt_id = CAST(:publication_attempt_id AS uuid)
                 RETURNING *",
                [
                    ':publication_attempt_id' => (string)$attempt['publication_attempt_id'],
                    ':response_payload' => $this->json([
                        'publication_state' => $targetState,
                        'receipt_hash_sha256' => $receiptHash,
                        'outbox_event_id' => (string)($outboxRow['outbox_event_id'] ?? ''),
                    ]),
                ],
            );

            return [
                'publication' => $this->decodeJsonColumns($updated),
                'attempt' => is_array($completed) ? $completed : $attempt,
                'receipt' => $receipt,
                'target_state' => $targetState,
            ];
        };

        if (method_exists($this->db, 'transactional')) {
            return $this->db->transactional($work);
        }
        return $work();
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_publication_store_required');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchPublicationWithAuthority(string $publicationId): array
    {
        $publication = $this->db->queryOne(
            "SELECT ep.*,
                    ev.source_change_order_id,
                    co.status AS change_order_state
             FROM evidence_publications ep
             JOIN evidence_versions ev ON ev.evidence_version_id = ep.evidence_version_id
             LEFT JOIN plm_change_orders co ON co.plm_change_order_id = ev.source_change_order_id
             WHERE ep.evidence_publication_id = CAST(:id AS uuid)",
            [':id' => $publicationId],
        );
        if (!is_array($publication)) {
            throw new RuntimeException('publication_not_found');
        }
        return $this->decodeJsonColumns($publication);
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

    /**
     * @return array<string, mixed>
     */
    private function decodePayload(mixed $payload): array
    {
        if (is_array($payload)) {
            return $payload;
        }
        if (is_string($payload)) {
            $decoded = json_decode($payload, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    private function json(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }

    private function actionTargetState(string $action): string
    {
        return match ($action) {
            'retry' => 'retry_scheduled',
            'withdraw' => 'withdrawn',
            'supersede' => 'superseded',
            default => throw new RuntimeException('unsupported_publication_action'),
        };
    }

    /**
     * @param array<string, mixed> $publication
     * @return array<string, mixed>
     */
    private function transitionContext(array $publication): array
    {
        $metadata = is_array($publication['metadata'] ?? null) ? $publication['metadata'] : [];
        return [
            'change_order_state' => $this->text(
                $publication['change_order_state']
                    ?? $publication['source_change_order_state']
                    ?? $metadata['change_order_state']
                    ?? '',
            ),
            'change_order_id' => $this->text(
                $publication['source_change_order_id']
                    ?? $metadata['source_change_order_id']
                    ?? '',
            ),
        ];
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }
}
