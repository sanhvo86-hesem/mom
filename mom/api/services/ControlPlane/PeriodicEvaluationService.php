<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Periodic evaluation register for Annex 11 / ALCOA+ control reviews.
 */
final class PeriodicEvaluationService
{
    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboard(int $limit = 100): array
    {
        $this->requireDb();
        $limit = max(1, min(500, $limit));

        $items = $this->db->query(
            "SELECT *
             FROM periodic_evaluations
             ORDER BY due_at ASC, created_at DESC
             LIMIT :limit",
            [':limit' => $limit],
        );
        $counts = $this->db->query(
            "SELECT evaluation_state, count(*) AS count
             FROM periodic_evaluations
             GROUP BY evaluation_state
             ORDER BY evaluation_state",
        );

        return ['counts' => $counts, 'items' => array_map([$this, 'decodeJsonColumns'], is_array($items) ? $items : [])];
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function schedule(array $request): array
    {
        $this->requireDb();
        foreach (['evaluation_scope', 'scope_ref', 'due_at'] as $field) {
            if (trim((string)($request[$field] ?? '')) === '') {
                throw new RuntimeException('missing_' . $field);
            }
        }

        // FOUND-003 FIX: Validate due_at does not exceed 1 year in future
        $dueAtStr = trim((string)$request['due_at']);
        $this->validateDueAt($dueAtStr);

        $row = $this->db->queryOne(
            "INSERT INTO periodic_evaluations
                (evaluation_scope, scope_ref, due_at, assigned_role, result_payload)
             VALUES
                (:evaluation_scope, :scope_ref, CAST(:due_at AS timestamptz), :assigned_role, CAST(:result_payload AS jsonb))
             ON CONFLICT (evaluation_scope, scope_ref, due_at) DO UPDATE
                SET updated_at = now()
             RETURNING *",
            [
                ':evaluation_scope' => trim((string)$request['evaluation_scope']),
                ':scope_ref' => trim((string)$request['scope_ref']),
                ':due_at' => $dueAtStr,
                ':assigned_role' => $this->nullableText($request['assigned_role'] ?? null),
                ':result_payload' => json_encode((array)($request['result_payload'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('periodic_evaluation_schedule_failed');
        }
        return $this->decodeJsonColumns($row);
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function close(array $request): array
    {
        $this->requireDb();
        $target = $this->state($request['evaluation_state'] ?? $request['target_state'] ?? '');
        if (!in_array($target, ['passed', 'failed', 'waived'], true)) {
            throw new RuntimeException('periodic_evaluation_terminal_state_required');
        }

        $id = $this->nullableText($request['periodic_evaluation_id'] ?? $request['evaluation_id'] ?? null);
        $scope = $this->nullableText($request['evaluation_scope'] ?? null);
        $scopeRef = $this->nullableText($request['scope_ref'] ?? null);
        if ($id === null && ($scope === null || $scopeRef === null)) {
            throw new RuntimeException('periodic_evaluation_identity_required');
        }

        if ($target === 'waived' && $this->nullableText($request['waiver_signature_event_id'] ?? null) === null) {
            throw new RuntimeException('waiver_signature_event_required');
        }
        if (in_array($target, ['passed', 'failed'], true)
            && $this->nullableText($request['integrity_digest_id'] ?? null) === null
            && $this->nullableText($request['audit_pack_export_id'] ?? null) === null) {
            throw new RuntimeException('periodic_evaluation_closure_evidence_required');
        }

        $row = $this->db->queryOne(
            "UPDATE periodic_evaluations
             SET evaluation_state = :evaluation_state,
                 started_at = COALESCE(started_at, now()),
                 completed_at = now(),
                 result_payload = COALESCE(result_payload, '{}'::jsonb) || CAST(:result_payload AS jsonb),
                 integrity_digest_id = COALESCE(CAST(:integrity_digest_id AS uuid), integrity_digest_id),
                 audit_pack_export_id = COALESCE(CAST(:audit_pack_export_id AS uuid), audit_pack_export_id),
                 waiver_signature_event_id = COALESCE(CAST(:waiver_signature_event_id AS uuid), waiver_signature_event_id),
                 updated_at = now()
             WHERE (:periodic_evaluation_id IS NOT NULL AND periodic_evaluation_id::text = :periodic_evaluation_id)
                OR (:evaluation_scope IS NOT NULL AND :scope_ref IS NOT NULL AND evaluation_scope = :evaluation_scope AND scope_ref = :scope_ref)
             RETURNING *",
            [
                ':evaluation_state' => $target,
                ':periodic_evaluation_id' => $id,
                ':evaluation_scope' => $scope,
                ':scope_ref' => $scopeRef,
                ':result_payload' => json_encode((array)($request['result_payload'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':integrity_digest_id' => $this->nullableUuid($request['integrity_digest_id'] ?? null),
                ':audit_pack_export_id' => $this->nullableUuid($request['audit_pack_export_id'] ?? null),
                ':waiver_signature_event_id' => $this->nullableUuid($request['waiver_signature_event_id'] ?? null),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('periodic_evaluation_not_found');
        }
        return $this->decodeJsonColumns($row);
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            throw new RuntimeException('authoritative_periodic_evaluation_store_required');
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
        foreach (['result_payload'] as $key) {
            if (isset($row[$key]) && is_string($row[$key])) {
                $decoded = json_decode($row[$key], true);
                if (is_array($decoded)) {
                    $row[$key] = $decoded;
                }
            }
        }
        return $row;
    }

    private function nullableText(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string)$value);
        return $text === '' ? null : $text;
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->nullableText($value);
        return $text !== null && preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    private function state(mixed $value): string
    {
        return strtolower(trim(is_scalar($value) ? (string)$value : ''));
    }

    /**
     * FOUND-003 FIX: Validate due_at date is not more than 1 year in future
     */
    private function validateDueAt(string $dueAtStr): void
    {
        try {
            $dueAt = new \DateTimeImmutable($dueAtStr);
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            $maxFuture = $now->add(new \DateInterval('P1Y'));

            if ($dueAt > $maxFuture) {
                throw new RuntimeException('due_at_exceeds_one_year_future');
            }
            if ($dueAt < $now) {
                throw new RuntimeException('due_at_cannot_be_retroactive');
            }
        } catch (\Throwable $e) {
            if (strpos($e->getMessage(), 'due_at') !== false) {
                throw $e;
            }
            throw new RuntimeException('invalid_due_at_format');
        }
    }
}
