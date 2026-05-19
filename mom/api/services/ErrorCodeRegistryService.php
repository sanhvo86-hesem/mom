<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Bilingual error code catalogue.
 *
 * Every API controller can ask for the operator-facing message for a
 * canonical code (e.g. AUTH-001) without hardcoding strings. Modules call
 * `GET /api/v1/error-codes/{code}` (public, no auth) to lookup a single
 * code, or this service directly from PHP.
 *
 * Backed by migration 192_error_code_registry_restore.sql (which restores
 * the schema declaration for the table that was created by the now-lost
 * 188_error_code_registry migration — see the migration file's header for
 * the full restoration story).
 *
 * The reads are tiny (≈ 35 rows in production), so we cache the full
 * catalogue per PHP request to avoid hammering the DB for every API
 * response that wants to expand an error code.
 *
 * @since 4.3.0
 */
final class ErrorCodeRegistryService
{
    private const VALID_SEVERITY = ['error', 'warning', 'info'];

    /** @var array<string, array<string,mixed>>|null */
    private static ?array $catalogue = null;

    public function __construct(
        private readonly DataLayer $data,
    ) {}

    /**
     * Look up a single code. Returns null when the code is unknown or
     * has been retired (`is_active = false`). Callers should fall back
     * to a generic message in that case rather than surfacing the raw
     * code to the operator.
     *
     * @return ?array{code:string, domain:string, http_status:int, severity:string, title_vi:string, title_en:?string, description_vi:?string, hint_vi:?string, is_active:bool}
     */
    public function find(string $code): ?array
    {
        $code = strtoupper(trim($code));
        if ($code === '') return null;
        $all = $this->loadAll();
        $row = $all[$code] ?? null;
        if (!is_array($row) || empty($row['is_active'])) {
            return null;
        }
        return $row;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listAll(bool $activeOnly = false): array
    {
        $rows = array_values($this->loadAll());
        if ($activeOnly) {
            $rows = array_values(array_filter($rows, static fn (array $r): bool => !empty($r['is_active'])));
        }
        usort($rows, static fn (array $a, array $b): int => strcmp((string)$a['code'], (string)$b['code']));
        return $rows;
    }

    /**
     * Admin upsert (create or overwrite). Returns the persisted row.
     *
     * @param array<string,mixed> $fields
     * @return array<string,mixed>|null
     */
    public function upsert(array $fields, string $actor): ?array
    {
        $code = strtoupper(trim((string)($fields['code'] ?? '')));
        $domain = trim((string)($fields['domain'] ?? ''));
        $titleVi = trim((string)($fields['title_vi'] ?? ''));
        if ($code === '' || $domain === '' || $titleVi === '') {
            return null;
        }
        $severity = strtolower(trim((string)($fields['severity'] ?? 'error')));
        if (!in_array($severity, self::VALID_SEVERITY, true)) {
            $severity = 'error';
        }
        $httpStatus = (int)($fields['http_status'] ?? 400);
        if ($httpStatus < 100 || $httpStatus > 599) {
            $httpStatus = 400;
        }
        try {
            $this->data->execute(
                "INSERT INTO error_code_registry
                    (code, domain, http_status, title_vi, title_en, description_vi, hint_vi, severity, is_active)
                 VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7, :p8, :p9)
                 ON CONFLICT (code) DO UPDATE
                   SET domain = EXCLUDED.domain,
                       http_status = EXCLUDED.http_status,
                       title_vi = EXCLUDED.title_vi,
                       title_en = EXCLUDED.title_en,
                       description_vi = EXCLUDED.description_vi,
                       hint_vi = EXCLUDED.hint_vi,
                       severity = EXCLUDED.severity,
                       is_active = EXCLUDED.is_active,
                       updated_at = now()",
                [
                    ':p1' => $code,
                    ':p2' => mb_substr($domain, 0, 30),
                    ':p3' => $httpStatus,
                    ':p4' => mb_substr($titleVi, 0, 200),
                    ':p5' => $this->nullableShort($fields['title_en'] ?? null, 200),
                    ':p6' => $this->nullableShort($fields['description_vi'] ?? null, 2000),
                    ':p7' => $this->nullableShort($fields['hint_vi'] ?? null, 500),
                    ':p8' => $severity,
                    ':p9' => !array_key_exists('is_active', $fields) || (bool)$fields['is_active'],
                ]
            );
            self::$catalogue = null;
            $this->writeAudit($code, 'error_code.upsert', $actor);
            return $this->find($code) ?? $this->loadAll()[$code] ?? null;
        } catch (Throwable $e) {
            error_log('ErrorCodeRegistryService.upsert failed: ' . $e->getMessage());
            return null;
        }
    }

    public function delete(string $code, string $actor): bool
    {
        $code = strtoupper(trim($code));
        if ($code === '') return false;
        try {
            $this->data->execute(
                "DELETE FROM error_code_registry WHERE code = :p1",
                [':p1' => $code]
            );
            self::$catalogue = null;
            $this->writeAudit($code, 'error_code.delete', $actor);
            return true;
        } catch (Throwable $e) {
            error_log('ErrorCodeRegistryService.delete failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Soft-disable a code (sets is_active=false). Preferred over hard
     * delete when the code may still appear in archived audit events.
     */
    public function setActive(string $code, bool $active, string $actor): bool
    {
        $code = strtoupper(trim($code));
        if ($code === '') return false;
        try {
            $this->data->execute(
                "UPDATE error_code_registry SET is_active = :p1, updated_at = now() WHERE code = :p2",
                [':p1' => $active, ':p2' => $code]
            );
            self::$catalogue = null;
            $this->writeAudit($code, $active ? 'error_code.enable' : 'error_code.disable', $actor);
            return true;
        } catch (Throwable $e) {
            error_log('ErrorCodeRegistryService.setActive failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Group active rows by domain — used by the admin UI sidebar.
     *
     * @return array<string, list<array<string,mixed>>>
     */
    public function groupedByDomain(): array
    {
        $out = [];
        foreach ($this->loadAll() as $row) {
            $domain = (string)($row['domain'] ?? '_');
            $out[$domain][] = $row;
        }
        ksort($out);
        return $out;
    }

    /**
     * @return array<string, array<string,mixed>>
     */
    private function loadAll(): array
    {
        if (self::$catalogue !== null) {
            return self::$catalogue;
        }
        try {
            $rows = $this->data->query(
                "SELECT code, domain, http_status, title_vi, title_en,
                        description_vi, hint_vi, severity, is_active,
                        created_at, updated_at
                   FROM error_code_registry"
            );
        } catch (Throwable $e) {
            error_log('ErrorCodeRegistryService.loadAll failed: ' . $e->getMessage());
            self::$catalogue = [];
            return self::$catalogue;
        }
        $out = [];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $code = strtoupper((string)($row['code'] ?? ''));
                if ($code === '') continue;
                $out[$code] = [
                    'code' => $code,
                    'domain' => (string)($row['domain'] ?? ''),
                    'http_status' => (int)($row['http_status'] ?? 400),
                    'title_vi' => (string)($row['title_vi'] ?? ''),
                    'title_en' => $row['title_en'] ?? null,
                    'description_vi' => $row['description_vi'] ?? null,
                    'hint_vi' => $row['hint_vi'] ?? null,
                    'severity' => (string)($row['severity'] ?? 'error'),
                    'is_active' => (bool)($row['is_active'] ?? false),
                    'created_at' => (string)($row['created_at'] ?? ''),
                    'updated_at' => (string)($row['updated_at'] ?? ''),
                ];
            }
        }
        self::$catalogue = $out;
        return $out;
    }

    private function nullableShort(mixed $value, int $max): ?string
    {
        if ($value === null) return null;
        $s = trim((string)$value);
        if ($s === '') return null;
        return mb_substr($s, 0, $max);
    }

    private function writeAudit(string $code, string $eventType, string $actor): void
    {
        // Audit events are append-only and hash-chained elsewhere; we use a
        // best-effort fire-and-forget here so a missing audit row never
        // blocks an admin save.
        try {
            $this->data->execute(
                "INSERT INTO audit_events
                    (event_type, actor_name, aggregate_type, aggregate_id, payload, recorded_at)
                 VALUES (:p1, :p2, 'error_code', :p3, :p4::jsonb, now())",
                [
                    ':p1' => $eventType,
                    ':p2' => $actor,
                    ':p3' => $code,
                    ':p4' => json_encode(['code' => $code], JSON_UNESCAPED_UNICODE) ?: '{}',
                ]
            );
        } catch (Throwable) {
            // intentionally swallow — audit is observability, not transaction
        }
    }

    /** Test-only cache reset. */
    public static function resetCache(): void
    {
        self::$catalogue = null;
    }
}
