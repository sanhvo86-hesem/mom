<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Server-side document access analytics.
 *
 * The log is SQL-backed by design: KPI values must come from server-observed
 * access events, not from readiness drills or user-entered counters.
 */
final class DocAccessAnalyticsService
{
    private const SOURCES = ['portal', 'qr', 'direct', 'api'];

    public function __construct(
        private readonly DataLayer $data,
    ) {
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $doc
     */
    public function recordAccess(array $user, array $doc, string $source = 'portal', bool $isReal = true): void
    {
        $docCode = $this->normalizeDocCode((string)($doc['code'] ?? $doc['doc_code'] ?? ''));
        if ($docCode === '') {
            return;
        }

        try {
            $canonicalUser = $this->resolveCanonicalUser($user);
            if ($canonicalUser === null) {
                return;
            }

            $this->data->execute(
                'INSERT INTO doc_access_log (user_id, doc_code, source, dept_id, role_code, is_real)
                 VALUES (CAST(:user_id AS uuid), :doc_code, :source, :dept_id, :role_code, :is_real)',
                [
                    ':user_id' => (string)$canonicalUser['user_id'],
                    ':doc_code' => $docCode,
                    ':source' => $this->normalizeSource($source),
                    ':dept_id' => $this->limitText((string)($canonicalUser['dept_code'] ?? ''), 8),
                    ':role_code' => $this->limitText((string)($canonicalUser['role_code'] ?? ''), 16),
                    ':is_real' => $isReal,
                ],
            );
        } catch (Throwable $e) {
            @error_log('[DocAccessAnalyticsService] access log skipped for ' . $docCode . ': ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $championState
     * @param array<int, array<string, mixed>> $userDirectory
     * @return array<string, mixed>
     */
    public function summary(array $championState = [], array $userDirectory = []): array
    {
        try {
            $totalUsers = $this->activeUserCount();
            $activeUsers7d = $this->activeDocumentUserCount7d();
            $lastAccessByDoc = $this->lastAccessByDoc();
            $championIds = $this->resolveChampionUserIds($championState, $userDirectory);
            $usage = $this->championUsage($championIds, $totalUsers);

            return [
                'available' => true,
                'generatedAt' => gmdate('c'),
                'activeUsers7d' => $activeUsers7d,
                'totalUsers' => $totalUsers,
                'activeUserRatePct' => $totalUsers > 0 ? round(($activeUsers7d * 100) / $totalUsers, 1) : null,
                'championUserCount' => count($championIds),
                'nonChampionUserCount' => $usage['nonChampionUserCount'],
                'championAccessCount7d' => $usage['championAccessCount7d'],
                'nonChampionAccessCount7d' => $usage['nonChampionAccessCount7d'],
                'championUsageRatioPct' => $usage['championUsageRatioPct'],
                'lastAccessByDoc' => $lastAccessByDoc,
            ];
        } catch (Throwable $e) {
            @error_log('[DocAccessAnalyticsService] summary unavailable: ' . $e->getMessage());
            return self::unavailable($e->getMessage());
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function unavailable(string $error = ''): array
    {
        return [
            'available' => false,
            'generatedAt' => gmdate('c'),
            'error' => $error,
            'activeUsers7d' => null,
            'totalUsers' => null,
            'activeUserRatePct' => null,
            'championUserCount' => null,
            'nonChampionUserCount' => null,
            'championAccessCount7d' => null,
            'nonChampionAccessCount7d' => null,
            'championUsageRatioPct' => null,
            'lastAccessByDoc' => [],
        ];
    }

    private function activeUserCount(): int
    {
        $row = $this->data->row(
            "SELECT COUNT(*)::INT AS c
               FROM v_user_canonical
              WHERE COALESCE(NULLIF(LOWER(user_status), ''), 'active') NOT IN ('disabled', 'inactive', 'deleted', 'archived')",
        );

        return (int)($row['c'] ?? 0);
    }

    private function activeDocumentUserCount7d(): int
    {
        $row = $this->data->row(
            "SELECT COUNT(DISTINCT user_id)::INT AS c
               FROM doc_access_log
              WHERE access_at >= NOW() - INTERVAL '7 days'
                AND is_real
                AND (doc_code LIKE 'SOP-%' OR doc_code LIKE 'WI-%')",
        );

        return (int)($row['c'] ?? 0);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function lastAccessByDoc(): array
    {
        $rows = $this->data->query(
            "SELECT doc_code,
                    MAX(access_at)::TEXT AS last_access_at,
                    COUNT(*) FILTER (
                        WHERE access_at >= NOW() - INTERVAL '14 days' AND is_real
                    )::INT AS real_access_14d
               FROM doc_access_log
              WHERE is_real
                AND (doc_code LIKE 'SOP-%' OR doc_code LIKE 'WI-%')
              GROUP BY doc_code",
        ) ?? [];

        $out = [];
        foreach ($rows as $row) {
            $code = $this->normalizeDocCode((string)($row['doc_code'] ?? ''));
            if ($code === '') {
                continue;
            }
            $out[$code] = [
                'docCode' => $code,
                'lastAccessAt' => (string)($row['last_access_at'] ?? ''),
                'realAccess14d' => (int)($row['real_access_14d'] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * @param array<int, string> $championIds
     * @return array<string, int|float|null>
     */
    private function championUsage(array $championIds, int $totalUsers): array
    {
        $championCount = count($championIds);
        $nonChampionUserCount = max(0, $totalUsers - $championCount);

        if ($championCount === 0 || $nonChampionUserCount === 0) {
            return [
                'championAccessCount7d' => 0,
                'nonChampionAccessCount7d' => 0,
                'nonChampionUserCount' => $nonChampionUserCount,
                'championUsageRatioPct' => null,
            ];
        }

        $params = [];
        $placeholders = [];
        foreach ($championIds as $i => $id) {
            $key = ':champion_' . $i;
            $params[$key] = $id;
            $placeholders[] = 'CAST(' . $key . ' AS uuid)';
        }
        $inList = implode(', ', $placeholders);

        $row = $this->data->row(
            "SELECT
                    COUNT(*) FILTER (WHERE user_id IN ($inList))::INT AS champion_access_count,
                    COUNT(*) FILTER (WHERE user_id NOT IN ($inList))::INT AS non_champion_access_count
               FROM doc_access_log
              WHERE access_at >= NOW() - INTERVAL '7 days'
                AND is_real
                AND (doc_code LIKE 'SOP-%' OR doc_code LIKE 'WI-%')",
            $params,
        );

        $championAccess = (int)($row['champion_access_count'] ?? 0);
        $nonChampionAccess = (int)($row['non_champion_access_count'] ?? 0);
        $championAvg = $championAccess / max(1, $championCount);
        $nonChampionAvg = $nonChampionAccess / max(1, $nonChampionUserCount);
        $ratio = $nonChampionAvg > 0 ? round(($championAvg / $nonChampionAvg) * 100, 1) : null;

        return [
            'championAccessCount7d' => $championAccess,
            'nonChampionAccessCount7d' => $nonChampionAccess,
            'nonChampionUserCount' => $nonChampionUserCount,
            'championUsageRatioPct' => $ratio,
        ];
    }

    /**
     * @param array<string, mixed> $championState
     * @param array<int, array<string, mixed>> $userDirectory
     * @return array<int, string>
     */
    private function resolveChampionUserIds(array $championState, array $userDirectory): array
    {
        $people = $this->extractChampionPeople($championState);
        $userByName = [];
        foreach ($userDirectory as $user) {
            $name = $this->personKey((string)($user['name'] ?? ''));
            if ($name !== '') {
                $userByName[$name] = $user;
            }
        }

        $ids = [];
        foreach ($people as $person) {
            $nameKey = $this->personKey((string)($person['name'] ?? ''));
            if ($nameKey !== '' && isset($userByName[$nameKey])) {
                $person = array_merge($userByName[$nameKey], $person);
            }
            $row = $this->resolveCanonicalUser($person);
            if ($row === null) {
                continue;
            }
            $id = (string)($row['user_id'] ?? '');
            if ($this->isUuid($id)) {
                $ids[$id] = $id;
            }
        }

        return array_values($ids);
    }

    /**
     * @param array<string, mixed> $championState
     * @return array<int, array<string, mixed>>
     */
    private function extractChampionPeople(array $championState): array
    {
        $records = is_array($championState['champions'] ?? null) ? $championState['champions'] : [];
        $people = [];
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }
            foreach (['participants', 'backups'] as $key) {
                $rows = is_array($record[$key] ?? null) ? $record[$key] : [];
                foreach ($rows as $person) {
                    if (is_array($person)) {
                        $people[] = $person;
                    }
                }
            }
            foreach (['primary', 'backup'] as $key) {
                if (is_array($record[$key] ?? null)) {
                    $people[] = $record[$key];
                }
            }
        }

        return $people;
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>|null
     */
    private function resolveCanonicalUser(array $user): ?array
    {
        $where = [];
        $params = [];

        $userId = (string)($user['user_id'] ?? $user['id'] ?? '');
        if ($this->isUuid($userId)) {
            $where[] = 'user_id = CAST(:user_id AS uuid)';
            $params[':user_id'] = $userId;
        }

        $username = strtolower(trim((string)($user['username'] ?? $user['user'] ?? '')));
        if ($username !== '') {
            $where[] = 'LOWER(username) = :username';
            $params[':username'] = $username;
        }

        $employeeId = trim((string)($user['employee_id'] ?? ''));
        if ($employeeId !== '') {
            $where[] = 'employee_id = :employee_id';
            $params[':employee_id'] = $employeeId;
        }

        $name = trim((string)($user['name'] ?? $user['full_name'] ?? $user['full_name_vi'] ?? ''));
        if ($name !== '') {
            $where[] = '(LOWER(full_name) = :person_name OR LOWER(full_name_vi) = :person_name)';
            $params[':person_name'] = strtolower($name);
        }

        if ($where === []) {
            return null;
        }

        return $this->data->row(
            'SELECT user_id::TEXT AS user_id, username, employee_id, dept_code, role_code
               FROM v_user_canonical
              WHERE ' . implode(' OR ', $where) . '
              LIMIT 1',
            $params,
        );
    }

    private function normalizeDocCode(string $code): string
    {
        $code = strtoupper(trim($code));
        $code = preg_replace('/[^A-Z0-9._-]/', '', $code) ?? '';
        return $this->limitText($code, 64);
    }

    private function normalizeSource(string $source): string
    {
        $source = strtolower(trim($source));
        return in_array($source, self::SOURCES, true) ? $source : 'portal';
    }

    private function limitText(string $value, int $max): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return substr($value, 0, $max);
    }

    private function personKey(string $name): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name) ?? ''));
    }

    private function isUuid(string $value): bool
    {
        return (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value);
    }
}
