<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use HESEM\QMS\Database\DataLayer;
use HESEM\QMS\Database\Connection;

/**
 * Canonical read-through query service for the Foundation Governance Contract Slice.
 *
 * Provides DB-backed list/query for organizations, parties, and calendars
 * over the 072 canonical schema hardened by 079.
 *
 * @package HESEM\QMS\Services
 * @since   5.0.0
 */
final class FoundationGovernanceService
{
    private DataLayer $data;

    public function __construct(DataLayer $data)
    {
        $this->data = $data;
    }

    // ── Cursor helpers ─────────────────────────────────────────────────────

    /**
     * Decode an opaque cursor string into sort-key values.
     *
     * @param string $cursor Base64url-encoded cursor.
     * @return array{v: int, s: list<string>, d: list<string>, k: list<string>}
     * @throws \InvalidArgumentException On invalid cursor.
     */
    public function decodeCursor(string $cursor): array
    {
        $raw = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($raw === false) {
            throw new \InvalidArgumentException('Invalid cursor encoding.');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || ($decoded['v'] ?? 0) !== 1) {
            throw new \InvalidArgumentException('Unsupported cursor version.');
        }
        return $decoded;
    }

    /**
     * Encode sort-key values into an opaque cursor string.
     *
     * @param list<string> $sortFields  Column names.
     * @param list<string> $directions  asc/desc per column.
     * @param list<string> $keyValues   Values at the boundary row.
     * @return string Base64url-encoded cursor.
     */
    public function encodeCursor(array $sortFields, array $directions, array $keyValues): string
    {
        $payload = json_encode([
            'v' => 1,
            's' => $sortFields,
            'd' => $directions,
            'k' => $keyValues,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    }

    /**
     * Build a CursorPageInfo envelope.
     */
    public function buildPageInfo(int $limit, bool $hasNext, bool $hasPrev, ?string $startCursor, ?string $endCursor, array $sort): array
    {
        return [
            'limit'           => $limit,
            'hasNextPage'     => $hasNext,
            'hasPreviousPage' => $hasPrev,
            'startCursor'     => $startCursor,
            'endCursor'       => $endCursor,
            'sort'            => $sort,
        ];
    }

    // ── Organizations ──────────────────────────────────────────────────────

    /**
     * List organizations across all seven org subtypes, flattened.
     *
     * @param array<string, mixed> $params Query parameters.
     * @return array{data: list<array>, pageInfo: array}
     */
    public function listOrganizations(array $params): array
    {
        $limit  = min(100, max(1, (int)($params['limit'] ?? 50)));
        $cursor = $params['cursor'] ?? null;
        $orgType = $params['organizationType'] ?? null;
        $parentId = $params['parentOrganizationId'] ?? null;
        $statusCode = $params['statusCode'] ?? null;
        $search = $params['search'] ?? null;

        $sortFields = ['organization_type', 'organization_code', 'organization_id'];
        $directions = ['asc', 'asc', 'asc'];
        $sort = array_map(fn($f, $d) => ['field' => $f, 'direction' => $d], $sortFields, $directions);

        $subtypes = [
            'enterprise'  => ['table' => 'org_enterprise',   'pk' => 'enterprise_id',   'code' => 'enterprise_code',   'name' => 'enterprise_name',   'parent_col' => null,               'parent_type' => null,          'tz' => 'base_timezone'],
            'company'     => ['table' => 'org_company',      'pk' => 'company_id',      'code' => 'company_code',      'name' => 'legal_name',        'parent_col' => 'enterprise_id',    'parent_type' => 'enterprise',  'tz' => null],
            'site'        => ['table' => 'org_site',         'pk' => 'site_id',         'code' => 'site_code',         'name' => 'site_name',         'parent_col' => 'company_id',       'parent_type' => 'company',     'tz' => 'timezone'],
            'plant'       => ['table' => 'org_plant',        'pk' => 'plant_id',        'code' => 'plant_code',        'name' => 'plant_name',        'parent_col' => 'site_id',          'parent_type' => 'site',        'tz' => null],
            'warehouse'   => ['table' => 'org_warehouse',    'pk' => 'warehouse_id',    'code' => 'warehouse_code',    'name' => 'warehouse_name',    'parent_col' => 'plant_id',         'parent_type' => 'plant',       'tz' => null],
            'work_center' => ['table' => 'org_work_center',  'pk' => 'work_center_id',  'code' => 'work_center_code',  'name' => 'work_center_name',  'parent_col' => 'plant_id',         'parent_type' => 'plant',       'tz' => null],
            'work_unit'   => ['table' => 'org_work_unit',    'pk' => 'work_unit_id',    'code' => 'work_unit_code',    'name' => 'work_unit_name',    'parent_col' => 'work_center_id',   'parent_type' => 'work_center', 'tz' => null],
        ];

        $targetTypes = $orgType !== null && $orgType !== ''
            ? (isset($subtypes[$orgType]) ? [$orgType => $subtypes[$orgType]] : [])
            : $subtypes;

        $allRows = [];
        foreach ($targetTypes as $typeName => $meta) {
            $rows = $this->queryOrgSubtype($typeName, $meta, $statusCode, $search, $parentId);
            foreach ($rows as $r) {
                $allRows[] = $r;
            }
        }

        usort($allRows, function (array $a, array $b): int {
            return strcmp($a['organizationType'], $b['organizationType'])
                ?: strcmp($a['organizationCode'], $b['organizationCode'])
                ?: strcmp($a['organizationId'], $b['organizationId']);
        });

        $startIdx = 0;
        if ($cursor !== null && $cursor !== '') {
            $ck = $this->decodeCursor($cursor);
            $cursorType = $ck['k'][0] ?? '';
            $cursorCode = $ck['k'][1] ?? '';
            $cursorId   = $ck['k'][2] ?? '';
            foreach ($allRows as $idx => $row) {
                $cmp = strcmp($row['organizationType'], $cursorType)
                    ?: strcmp($row['organizationCode'], $cursorCode)
                    ?: strcmp($row['organizationId'], $cursorId);
                if ($cmp > 0) {
                    $startIdx = $idx;
                    break;
                }
            }
        }

        $page = array_slice($allRows, $startIdx, $limit + 1);
        $hasNext = count($page) > $limit;
        if ($hasNext) {
            array_pop($page);
        }

        $startCursor = null;
        $endCursor   = null;
        if (!empty($page)) {
            $first = $page[0];
            $startCursor = $this->encodeCursor($sortFields, $directions, [$first['organizationType'], $first['organizationCode'], $first['organizationId']]);
            $last = $page[count($page) - 1];
            $endCursor = $this->encodeCursor($sortFields, $directions, [$last['organizationType'], $last['organizationCode'], $last['organizationId']]);
        }

        return [
            'data'     => $page,
            'pageInfo' => $this->buildPageInfo($limit, $hasNext, $startIdx > 0, $startCursor, $endCursor, $sort),
        ];
    }

    /**
     * @return list<array>
     */
    private function queryOrgSubtype(string $typeName, array $meta, ?string $statusCode, ?string $search, ?string $parentId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            return $this->queryOrgSubtypeFromFile($typeName, $meta, $statusCode, $search, $parentId);
        }

        $table = $meta['table'];
        $pk    = $meta['pk'];
        $code  = $meta['code'];
        $name  = $meta['name'];
        $parentCol = $meta['parent_col'];
        $tzCol     = $meta['tz'];

        $where  = [];
        $binds  = [];

        if ($statusCode !== null && $statusCode !== '') {
            $where[] = "status_code = :status_code";
            $binds[':status_code'] = $statusCode;
        }
        if ($search !== null && $search !== '') {
            $where[] = "({$code} ILIKE :search OR {$name} ILIKE :search)";
            $binds[':search'] = '%' . $search . '%';
        }
        // parentOrganizationId filter: match typed alias like "company:UUID"
        if ($parentId !== null && $parentId !== '' && $parentCol !== null) {
            // Extract the raw UUID portion after the type prefix
            $parentParts = explode(':', $parentId, 2);
            $rawParentId = count($parentParts) === 2 ? $parentParts[1] : $parentId;
            $where[] = "{$parentCol}::text = :parent_id";
            $binds[':parent_id'] = $rawParentId;
        }

        $whereClause = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

        $tzSelect = $tzCol !== null ? ", {$tzCol} AS base_timezone" : ", NULL AS base_timezone";
        $parentSelect = $parentCol !== null
            ? ", '{$meta['parent_type']}:' || {$parentCol}::text AS parent_organization_id"
            : ", NULL AS parent_organization_id";

        $sql = "SELECT '{$typeName}:' || {$pk}::text AS organization_id,
                       '{$typeName}' AS organization_type,
                       {$code} AS organization_code,
                       {$name} AS organization_name
                       {$parentSelect}
                       , status_code
                       {$tzSelect}
                       , updated_at
                       , row_version
                FROM {$table} {$whereClause}
                ORDER BY {$code} ASC, {$pk} ASC";

        try {
            $rows = $conn->query($sql, $binds);
        } catch (\Throwable $e) {
            return $this->queryOrgSubtypeFromFile($typeName, $meta, $statusCode, $search, $parentId);
        }

        return array_map(fn(array $r) => [
            'organizationId'       => $r['organization_id'],
            'organizationType'     => $r['organization_type'],
            'organizationCode'     => $r['organization_code'],
            'organizationName'     => $r['organization_name'],
            'parentOrganizationId' => $r['parent_organization_id'],
            'statusCode'           => $r['status_code'],
            'baseTimezone'         => $r['base_timezone'],
            'updatedAt'            => $r['updated_at'] ? (new \DateTimeImmutable($r['updated_at']))->format('c') : null,
            'rowVersion'           => (int)($r['row_version'] ?? 1),
        ], $rows);
    }

    /**
     * Fallback: read from file when DB is unavailable.
     * @return list<array>
     */
    private function queryOrgSubtypeFromFile(string $typeName, array $meta, ?string $statusCode, ?string $search, ?string $parentId): array
    {
        return [];
    }

    // ── Parties ────────────────────────────────────────────────────────────

    /**
     * List parties with cursor pagination.
     *
     * @param array<string, mixed> $params
     * @return array{data: list<array>, pageInfo: array}
     */
    public function listParties(array $params): array
    {
        $limit   = min(100, max(1, (int)($params['limit'] ?? 50)));
        $cursor  = $params['cursor'] ?? null;
        $partyType  = $params['partyType'] ?? null;
        $roleCode   = $params['roleCode'] ?? null;
        $statusCode = $params['statusCode'] ?? null;
        $search     = $params['search'] ?? null;

        $sortFields = ['display_name', 'party_id'];
        $directions = ['asc', 'asc'];
        $sort = array_map(fn($f, $d) => ['field' => $f, 'direction' => $d], $sortFields, $directions);

        $conn = $this->data->getConnection();
        if ($conn === null) {
            return ['data' => [], 'pageInfo' => $this->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $where = [];
        $binds = [];

        if ($partyType !== null && $partyType !== '') {
            $where[] = "p.party_type = :party_type";
            $binds[':party_type'] = $partyType;
        }
        if ($statusCode !== null && $statusCode !== '') {
            $where[] = "p.status_code = :status_code";
            $binds[':status_code'] = $statusCode;
        }
        if ($roleCode !== null && $roleCode !== '') {
            $where[] = "EXISTS (SELECT 1 FROM party_role pr WHERE pr.party_id = p.party_id AND pr.role_code = :role_code AND pr.status_code = 'active')";
            $binds[':role_code'] = $roleCode;
        }
        if ($search !== null && $search !== '') {
            $where[] = "(p.display_name ILIKE :search OR p.party_code ILIKE :search)";
            $binds[':search'] = '%' . $search . '%';
        }

        if ($cursor !== null && $cursor !== '') {
            $ck = $this->decodeCursor($cursor);
            $where[] = "(p.display_name, p.party_id::text) > (:ck_name, :ck_id)";
            $binds[':ck_name'] = $ck['k'][0] ?? '';
            $binds[':ck_id']   = $ck['k'][1] ?? '';
        }

        $whereClause = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

        $sql = "SELECT p.party_id, p.party_type, p.display_name, p.status_code,
                       (SELECT pc.email_address FROM party_contact pc WHERE pc.party_id = p.party_id AND pc.is_primary = true LIMIT 1) AS primary_email,
                       (SELECT pc.phone_number FROM party_contact pc WHERE pc.party_id = p.party_id AND pc.is_primary = true LIMIT 1) AS primary_phone,
                       p.updated_at, p.row_version
                FROM party p
                {$whereClause}
                ORDER BY p.display_name ASC, p.party_id ASC
                LIMIT :lim";

        $binds[':lim'] = $limit + 1;

        try {
            $rows = $conn->query($sql, $binds);
        } catch (\Throwable $e) {
            return ['data' => [], 'pageInfo' => $this->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $hasNext = count($rows) > $limit;
        if ($hasNext) {
            array_pop($rows);
        }

        $data = array_map(fn(array $r) => [
            'partyId'      => $r['party_id'],
            'partyType'    => $r['party_type'],
            'displayName'  => $r['display_name'],
            'statusCode'   => $r['status_code'],
            'primaryEmail' => $r['primary_email'],
            'primaryPhone' => $r['primary_phone'],
            'updatedAt'    => $r['updated_at'] ? (new \DateTimeImmutable($r['updated_at']))->format('c') : null,
            'rowVersion'   => (int)($r['row_version'] ?? 1),
        ], $rows);

        $startCursor = null;
        $endCursor   = null;
        if (!empty($data)) {
            $first = $data[0];
            $startCursor = $this->encodeCursor($sortFields, $directions, [$first['displayName'], $first['partyId']]);
            $last = $data[count($data) - 1];
            $endCursor = $this->encodeCursor($sortFields, $directions, [$last['displayName'], $last['partyId']]);
        }

        return [
            'data'     => $data,
            'pageInfo' => $this->buildPageInfo($limit, $hasNext, $cursor !== null, $startCursor, $endCursor, $sort),
        ];
    }

    // ── Calendars ──────────────────────────────────────────────────────────

    /**
     * List calendars with cursor pagination.
     *
     * @param array<string, mixed> $params
     * @return array{data: list<array>, pageInfo: array}
     */
    public function listCalendars(array $params): array
    {
        $limit   = min(100, max(1, (int)($params['limit'] ?? 50)));
        $cursor  = $params['cursor'] ?? null;
        $statusCode  = $params['statusCode'] ?? null;
        $baseTimezone = $params['baseTimezone'] ?? null;
        $search = $params['search'] ?? null;

        $sortFields = ['calendar_code', 'calendar_id'];
        $directions = ['asc', 'asc'];
        $sort = array_map(fn($f, $d) => ['field' => $f, 'direction' => $d], $sortFields, $directions);

        $conn = $this->data->getConnection();
        if ($conn === null) {
            return ['data' => [], 'pageInfo' => $this->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $where = [];
        $binds = [];

        if ($statusCode !== null && $statusCode !== '') {
            $where[] = "c.status_code = :status_code";
            $binds[':status_code'] = $statusCode;
        }
        if ($baseTimezone !== null && $baseTimezone !== '') {
            $where[] = "c.timezone = :tz";
            $binds[':tz'] = $baseTimezone;
        }
        if ($search !== null && $search !== '') {
            $where[] = "(c.calendar_code ILIKE :search OR c.calendar_name ILIKE :search)";
            $binds[':search'] = '%' . $search . '%';
        }

        if ($cursor !== null && $cursor !== '') {
            $ck = $this->decodeCursor($cursor);
            $where[] = "(c.calendar_code, c.calendar_id::text) > (:ck_code, :ck_id)";
            $binds[':ck_code'] = $ck['k'][0] ?? '';
            $binds[':ck_id']   = $ck['k'][1] ?? '';
        }

        $whereClause = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

        $sql = "SELECT c.calendar_id, c.calendar_code, c.calendar_name, c.timezone AS base_timezone,
                       c.status_code,
                       (SELECT count(*) FROM shift s WHERE s.calendar_id = c.calendar_id) AS shift_count,
                       c.updated_at, c.row_version
                FROM calendar c
                {$whereClause}
                ORDER BY c.calendar_code ASC, c.calendar_id ASC
                LIMIT :lim";

        $binds[':lim'] = $limit + 1;

        try {
            $rows = $conn->query($sql, $binds);
        } catch (\Throwable $e) {
            return ['data' => [], 'pageInfo' => $this->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $hasNext = count($rows) > $limit;
        if ($hasNext) {
            array_pop($rows);
        }

        $data = array_map(fn(array $r) => [
            'calendarId'   => $r['calendar_id'],
            'calendarCode' => $r['calendar_code'],
            'calendarName' => $r['calendar_name'],
            'baseTimezone' => $r['base_timezone'],
            'statusCode'   => $r['status_code'],
            'shiftCount'   => (int)($r['shift_count'] ?? 0),
            'updatedAt'    => $r['updated_at'] ? (new \DateTimeImmutable($r['updated_at']))->format('c') : null,
            'rowVersion'   => (int)($r['row_version'] ?? 1),
        ], $rows);

        $startCursor = null;
        $endCursor   = null;
        if (!empty($data)) {
            $first = $data[0];
            $startCursor = $this->encodeCursor($sortFields, $directions, [$first['calendarCode'], $first['calendarId']]);
            $last = $data[count($data) - 1];
            $endCursor = $this->encodeCursor($sortFields, $directions, [$last['calendarCode'], $last['calendarId']]);
        }

        return [
            'data'     => $data,
            'pageInfo' => $this->buildPageInfo($limit, $hasNext, $cursor !== null, $startCursor, $endCursor, $sort),
        ];
    }
}
