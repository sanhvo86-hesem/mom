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
                ':due_at' => trim((string)$request['due_at']),
                ':assigned_role' => $this->nullableText($request['assigned_role'] ?? null),
                ':result_payload' => json_encode((array)($request['result_payload'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('periodic_evaluation_schedule_failed');
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
}
