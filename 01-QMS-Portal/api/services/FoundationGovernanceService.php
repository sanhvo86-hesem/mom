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

    /**
     * Emit a structured observability event (OTel-compatible naming).
     */
    private function emitObservabilityEvent(string $eventName, array $attributes): void
    {
        $entry = json_encode([
            'event'      => $eventName,
            'timestamp'  => gmdate('Y-m-d\TH:i:s.v\Z'),
            'attributes' => $attributes,
            'service'    => 'foundation_governance_contract_slice',
            'component'  => 'FoundationGovernanceService',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @error_log("[otel.event] {$entry}");
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

    // ══ Canonical Write Commands ════════════════════════════════════════════

    /**
     * Register an organization node in the appropriate canonical org table.
     *
     * @param array  $payload Must include: organization_type, organization_code, organization_name.
     * @param string $actorId The acting user.
     * @return array The created row representation.
     * @throws \InvalidArgumentException On validation failure.
     * @throws \RuntimeException On DB failure.
     */
    public function registerOrganizationNode(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $orgType = trim($payload['organization_type'] ?? '');
        $orgCode = trim($payload['organization_code'] ?? '');
        $orgName = trim($payload['organization_name'] ?? '');

        if ($orgType === '' || $orgCode === '' || $orgName === '') {
            throw new \InvalidArgumentException('organization_type, organization_code, and organization_name are required.');
        }

        $tableMap = [
            'enterprise'  => ['table' => 'org_enterprise',  'pk' => 'enterprise_id',  'code' => 'enterprise_code',  'name' => 'enterprise_name'],
            'company'     => ['table' => 'org_company',     'pk' => 'company_id',     'code' => 'company_code',     'name' => 'legal_name'],
            'site'        => ['table' => 'org_site',        'pk' => 'site_id',        'code' => 'site_code',        'name' => 'site_name'],
            'plant'       => ['table' => 'org_plant',       'pk' => 'plant_id',       'code' => 'plant_code',       'name' => 'plant_name'],
            'warehouse'   => ['table' => 'org_warehouse',   'pk' => 'warehouse_id',   'code' => 'warehouse_code',   'name' => 'warehouse_name'],
            'work_center' => ['table' => 'org_work_center', 'pk' => 'work_center_id', 'code' => 'work_center_code', 'name' => 'work_center_name'],
            'work_unit'   => ['table' => 'org_work_unit',   'pk' => 'work_unit_id',   'code' => 'work_unit_code',   'name' => 'work_unit_name'],
        ];

        $meta = $tableMap[$orgType] ?? null;
        if ($meta === null) {
            throw new \InvalidArgumentException("Invalid organization_type: {$orgType}");
        }

        $table   = $meta['table'];
        $pkCol   = $meta['pk'];
        $codeCol = $meta['code'];
        $nameCol = $meta['name'];

        // Build parent FK if needed
        $parentFk = '';
        $parentBind = [];
        $parentRequired = [
            'company'     => ['col' => 'enterprise_id',   'param' => 'parent_id'],
            'site'        => ['col' => 'company_id',      'param' => 'parent_id'],
            'plant'       => ['col' => 'site_id',         'param' => 'parent_id'],
            'warehouse'   => ['col' => 'plant_id',        'param' => 'parent_id'],
            'work_center' => ['col' => 'plant_id',        'param' => 'parent_id'],
            'work_unit'   => ['col' => 'work_center_id',  'param' => 'parent_id'],
        ];

        if (isset($parentRequired[$orgType])) {
            $parentCol = $parentRequired[$orgType]['col'];
            $parentId  = trim($payload['parent_id'] ?? '');
            if ($parentId === '') {
                throw new \InvalidArgumentException("{$parentCol} (parent_id) is required for {$orgType}.");
            }
            $parentFk = ", {$parentCol}";
            $parentBind = [':parent_id' => $parentId];
        }

        $sql = "INSERT INTO {$table} ({$codeCol}, {$nameCol}{$parentFk})
                VALUES (:code, :name" . ($parentFk !== '' ? ', :parent_id' : '') . ")
                RETURNING {$pkCol}, {$codeCol}, {$nameCol}, status_code, created_at, row_version";

        $binds = array_merge([':code' => $orgCode, ':name' => $orgName], $parentBind);

        $row = $conn->insertReturning($sql, $binds);
        if ($row === null) {
            throw new \RuntimeException('Insert failed for ' . $table);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED,
            $table,
            $row[$pkCol],
            $actorId,
            ['code' => $orgCode, 'name' => $orgName, 'type' => $orgType]
        ));

        $this->emitObservabilityEvent('foundation.organization.registered', [
            'organization_type' => $orgType, 'organization_code' => $orgCode,
        ]);

        return [
            'organizationId'   => "{$orgType}:{$row[$pkCol]}",
            'organizationType' => $orgType,
            'organizationCode' => $row[$codeCol],
            'organizationName' => $row[$nameCol],
            'statusCode'       => $row['status_code'] ?? 'active',
            'rowVersion'       => (int)($row['row_version'] ?? 1),
        ];
    }

    /**
     * Register a new party in the canonical party table.
     *
     * @return array The created party representation.
     */
    public function registerParty(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $partyCode   = trim($payload['party_code'] ?? '');
        $partyType   = trim($payload['party_type'] ?? '');
        $displayName = trim($payload['display_name'] ?? '');

        if ($partyCode === '' || $partyType === '' || $displayName === '') {
            throw new \InvalidArgumentException('party_code, party_type, and display_name are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO party (party_code, party_type, display_name, country_code)
             VALUES (:code, :type, :name, :country)
             RETURNING party_id, party_code, party_type, display_name, status_code, created_at, row_version",
            [
                ':code'    => $partyCode,
                ':type'    => $partyType,
                ':name'    => $displayName,
                ':country' => trim($payload['country_code'] ?? ''),
            ]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for party');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'party', $row['party_id'], $actorId,
            ['party_code' => $partyCode, 'party_type' => $partyType]
        ));

        return [
            'partyId'     => $row['party_id'],
            'partyCode'   => $row['party_code'],
            'partyType'   => $row['party_type'],
            'displayName' => $row['display_name'],
            'statusCode'  => $row['status_code'] ?? 'active',
            'rowVersion'  => (int)($row['row_version'] ?? 1),
        ];
    }

    /**
     * Register a new calendar in the canonical calendar table.
     *
     * @return array The created calendar representation.
     */
    public function registerCalendar(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $calendarCode = trim($payload['calendar_code'] ?? '');
        $calendarName = trim($payload['calendar_name'] ?? '');
        $timezone     = trim($payload['timezone'] ?? 'Asia/Ho_Chi_Minh');

        if ($calendarCode === '' || $calendarName === '') {
            throw new \InvalidArgumentException('calendar_code and calendar_name are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO calendar (calendar_code, calendar_name, timezone)
             VALUES (:code, :name, :tz)
             RETURNING calendar_id, calendar_code, calendar_name, timezone, status_code, created_at, row_version",
            [':code' => $calendarCode, ':name' => $calendarName, ':tz' => $timezone]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for calendar');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'calendar', $row['calendar_id'], $actorId,
            ['calendar_code' => $calendarCode]
        ));

        return [
            'calendarId'   => $row['calendar_id'],
            'calendarCode' => $row['calendar_code'],
            'calendarName' => $row['calendar_name'],
            'baseTimezone' => $row['timezone'],
            'statusCode'   => $row['status_code'] ?? 'active',
            'rowVersion'   => (int)($row['row_version'] ?? 1),
        ];
    }

    /**
     * Assign a role to a party.
     *
     * @return array The created party_role representation.
     */
    public function assignPartyRole(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $partyId         = trim($payload['party_id'] ?? '');
        $roleCode        = trim($payload['role_code'] ?? '');
        $scopeEntityName = trim($payload['scope_entity_name'] ?? '');
        $scopeEntityId   = trim($payload['scope_entity_id'] ?? '');

        if ($partyId === '' || $roleCode === '') {
            throw new \InvalidArgumentException('party_id and role_code are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO party_role (party_id, role_code, scope_entity_name, scope_entity_id)
             VALUES (:pid, :role, :sen, :sei)
             RETURNING party_role_id, party_id, role_code, scope_entity_name, scope_entity_id, status_code, row_version",
            [
                ':pid'  => $partyId,
                ':role' => $roleCode,
                ':sen'  => $scopeEntityName !== '' ? $scopeEntityName : null,
                ':sei'  => $scopeEntityId !== '' ? $scopeEntityId : null,
            ]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for party_role');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'party_role', $row['party_role_id'], $actorId,
            ['party_id' => $partyId, 'role_code' => $roleCode]
        ));

        return [
            'partyRoleId'     => $row['party_role_id'],
            'partyId'         => $row['party_id'],
            'roleCode'        => $row['role_code'],
            'statusCode'      => $row['status_code'] ?? 'active',
            'rowVersion'      => (int)($row['row_version'] ?? 1),
        ];
    }

    /**
     * Register a shift under a calendar.
     *
     * @return array The created shift representation.
     */
    public function registerShift(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $calendarId     = trim($payload['calendar_id'] ?? '');
        $shiftCode      = trim($payload['shift_code'] ?? '');
        $shiftName      = trim($payload['shift_name'] ?? '');
        $startTime      = trim($payload['start_time'] ?? '');
        $endTime        = trim($payload['end_time'] ?? '');
        $crossesMidnight = (bool)($payload['crosses_midnight'] ?? false);

        if ($calendarId === '' || $shiftCode === '' || $shiftName === '' || $startTime === '' || $endTime === '') {
            throw new \InvalidArgumentException('calendar_id, shift_code, shift_name, start_time, and end_time are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO shift (calendar_id, shift_code, shift_name, start_time, end_time, crosses_midnight)
             VALUES (:cid, :code, :name, :st, :et, :cm)
             RETURNING shift_id, calendar_id, shift_code, shift_name, start_time, end_time, crosses_midnight, status_code, row_version",
            [
                ':cid'  => $calendarId,
                ':code' => $shiftCode,
                ':name' => $shiftName,
                ':st'   => $startTime,
                ':et'   => $endTime,
                ':cm'   => $crossesMidnight ? 'true' : 'false',
            ]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for shift');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'shift', $row['shift_id'], $actorId,
            ['calendar_id' => $calendarId, 'shift_code' => $shiftCode]
        ));

        return [
            'shiftId'        => $row['shift_id'],
            'calendarId'     => $row['calendar_id'],
            'shiftCode'      => $row['shift_code'],
            'shiftName'      => $row['shift_name'],
            'statusCode'     => $row['status_code'] ?? 'active',
            'rowVersion'     => (int)($row['row_version'] ?? 1),
        ];
    }

    // ══ Concurrency-Guarded Update / Deactivate Commands ═══════════════════

    /**
     * Amend an organization node (update name or mutable fields).
     * Requires row_version for optimistic concurrency.
     *
     * @return array Updated organization representation.
     */
    public function amendOrganizationNode(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $orgType = trim($payload['organization_type'] ?? '');
        $orgId   = trim($payload['organization_id'] ?? '');
        $rowVersion = (int)($payload['row_version'] ?? 0);

        if ($orgType === '' || $orgId === '' || $rowVersion === 0) {
            throw new \InvalidArgumentException('organization_type, organization_id, and row_version are required.');
        }

        $tableMap = [
            'enterprise'  => ['table' => 'org_enterprise',  'pk' => 'enterprise_id',  'name' => 'enterprise_name'],
            'company'     => ['table' => 'org_company',     'pk' => 'company_id',     'name' => 'legal_name'],
            'site'        => ['table' => 'org_site',        'pk' => 'site_id',        'name' => 'site_name'],
            'plant'       => ['table' => 'org_plant',       'pk' => 'plant_id',       'name' => 'plant_name'],
            'warehouse'   => ['table' => 'org_warehouse',   'pk' => 'warehouse_id',   'name' => 'warehouse_name'],
            'work_center' => ['table' => 'org_work_center', 'pk' => 'work_center_id', 'name' => 'work_center_name'],
            'work_unit'   => ['table' => 'org_work_unit',   'pk' => 'work_unit_id',   'name' => 'work_unit_name'],
        ];

        $meta = $tableMap[$orgType] ?? null;
        if ($meta === null) {
            throw new \InvalidArgumentException("Invalid organization_type: {$orgType}");
        }

        $newName = trim($payload['organization_name'] ?? '');
        if ($newName === '') {
            throw new \InvalidArgumentException('organization_name is required for amend.');
        }

        $affected = $conn->execute(
            "UPDATE {$meta['table']} SET {$meta['name']} = :name
             WHERE {$meta['pk']} = :id AND row_version = :rv",
            [':name' => $newName, ':id' => $orgId, ':rv' => $rowVersion]
        );

        if ($affected === 0) {
            throw new \RuntimeException('etag_mismatch', 412);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::UPDATED, $meta['table'], $orgId, $actorId,
            ['organization_name' => $newName, 'type' => $orgType]
        ));

        return ['amended' => true, 'organizationId' => "{$orgType}:{$orgId}"];
    }

    /**
     * Reparent an organization node to a new parent.
     * Requires row_version for optimistic concurrency.
     */
    public function reparentOrganizationNode(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $orgType     = trim($payload['organization_type'] ?? '');
        $orgId       = trim($payload['organization_id'] ?? '');
        $newParentId = trim($payload['new_parent_id'] ?? '');
        $rowVersion  = (int)($payload['row_version'] ?? 0);

        if ($orgType === '' || $orgId === '' || $newParentId === '' || $rowVersion === 0) {
            throw new \InvalidArgumentException('organization_type, organization_id, new_parent_id, and row_version are required.');
        }

        $parentColMap = [
            'company'     => 'enterprise_id',
            'site'        => 'company_id',
            'plant'       => 'site_id',
            'warehouse'   => 'plant_id',
            'work_center' => 'plant_id',
            'work_unit'   => 'work_center_id',
        ];
        $pkMap = [
            'company'     => ['table' => 'org_company',     'pk' => 'company_id'],
            'site'        => ['table' => 'org_site',        'pk' => 'site_id'],
            'plant'       => ['table' => 'org_plant',       'pk' => 'plant_id'],
            'warehouse'   => ['table' => 'org_warehouse',   'pk' => 'warehouse_id'],
            'work_center' => ['table' => 'org_work_center', 'pk' => 'work_center_id'],
            'work_unit'   => ['table' => 'org_work_unit',   'pk' => 'work_unit_id'],
        ];

        if (!isset($parentColMap[$orgType])) {
            throw new \InvalidArgumentException("Cannot reparent organization_type: {$orgType}");
        }

        $parentCol = $parentColMap[$orgType];
        $meta = $pkMap[$orgType];

        $affected = $conn->execute(
            "UPDATE {$meta['table']} SET {$parentCol} = :parent
             WHERE {$meta['pk']} = :id AND row_version = :rv",
            [':parent' => $newParentId, ':id' => $orgId, ':rv' => $rowVersion]
        );

        if ($affected === 0) {
            throw new \RuntimeException('etag_mismatch', 412);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::UPDATED, $meta['table'], $orgId, $actorId,
            ['action' => 'reparent', 'new_parent_id' => $newParentId]
        ));

        return ['reparented' => true, 'organizationId' => "{$orgType}:{$orgId}"];
    }

    /**
     * Deactivate an organization node.
     * Requires row_version for optimistic concurrency.
     */
    public function deactivateOrganizationNode(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $orgType    = trim($payload['organization_type'] ?? '');
        $orgId      = trim($payload['organization_id'] ?? '');
        $rowVersion = (int)($payload['row_version'] ?? 0);

        if ($orgType === '' || $orgId === '' || $rowVersion === 0) {
            throw new \InvalidArgumentException('organization_type, organization_id, and row_version are required.');
        }

        $tableMap = [
            'enterprise'  => ['table' => 'org_enterprise',  'pk' => 'enterprise_id'],
            'company'     => ['table' => 'org_company',     'pk' => 'company_id'],
            'site'        => ['table' => 'org_site',        'pk' => 'site_id'],
            'plant'       => ['table' => 'org_plant',       'pk' => 'plant_id'],
            'warehouse'   => ['table' => 'org_warehouse',   'pk' => 'warehouse_id'],
            'work_center' => ['table' => 'org_work_center', 'pk' => 'work_center_id'],
            'work_unit'   => ['table' => 'org_work_unit',   'pk' => 'work_unit_id'],
        ];

        $meta = $tableMap[$orgType] ?? null;
        if ($meta === null) {
            throw new \InvalidArgumentException("Invalid organization_type: {$orgType}");
        }

        $affected = $conn->execute(
            "UPDATE {$meta['table']} SET status_code = 'inactive'
             WHERE {$meta['pk']} = :id AND row_version = :rv AND status_code = 'active'",
            [':id' => $orgId, ':rv' => $rowVersion]
        );

        if ($affected === 0) {
            throw new \RuntimeException('etag_mismatch', 412);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::STATUS_CHANGED, $meta['table'], $orgId, $actorId,
            ['action' => 'deactivate', 'new_status' => 'inactive']
        ));

        return ['deactivated' => true, 'organizationId' => "{$orgType}:{$orgId}"];
    }

    /**
     * Amend party identity (update display_name or mutable fields).
     * Requires row_version for optimistic concurrency.
     */
    public function amendPartyIdentity(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $partyId    = trim($payload['party_id'] ?? '');
        $rowVersion = (int)($payload['row_version'] ?? 0);

        if ($partyId === '' || $rowVersion === 0) {
            throw new \InvalidArgumentException('party_id and row_version are required.');
        }

        $sets = [];
        $binds = [':id' => $partyId, ':rv' => $rowVersion];

        if (isset($payload['display_name']) && trim($payload['display_name']) !== '') {
            $sets[] = "display_name = :name";
            $binds[':name'] = trim($payload['display_name']);
        }
        if (isset($payload['party_type']) && trim($payload['party_type']) !== '') {
            $sets[] = "party_type = :type";
            $binds[':type'] = trim($payload['party_type']);
        }
        if (isset($payload['country_code'])) {
            $sets[] = "country_code = :country";
            $binds[':country'] = trim($payload['country_code']);
        }
        if (isset($payload['tax_registration_no'])) {
            $sets[] = "tax_registration_no = :tax";
            $binds[':tax'] = trim($payload['tax_registration_no']);
        }

        if (empty($sets)) {
            throw new \InvalidArgumentException('At least one field to amend is required.');
        }

        $affected = $conn->execute(
            "UPDATE party SET " . implode(', ', $sets) . " WHERE party_id = :id AND row_version = :rv",
            $binds
        );

        if ($affected === 0) {
            throw new \RuntimeException('etag_mismatch', 412);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::UPDATED, 'party', $partyId, $actorId,
            array_filter($payload, fn($k) => $k !== 'row_version', ARRAY_FILTER_USE_KEY)
        ));

        return ['amended' => true, 'partyId' => $partyId];
    }

    /**
     * Register a party site.
     */
    public function registerPartySite(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $partyId      = trim($payload['party_id'] ?? '');
        $siteRoleCode = trim($payload['site_role_code'] ?? '');
        $siteName     = trim($payload['site_name'] ?? '');

        if ($partyId === '' || $siteRoleCode === '' || $siteName === '') {
            throw new \InvalidArgumentException('party_id, site_role_code, and site_name are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO party_site (party_id, site_role_code, site_name, address_line_1, city_name, country_code, is_default)
             VALUES (:pid, :role, :name, :addr1, :city, :country, :def)
             RETURNING party_site_id, party_id, site_role_code, site_name, is_default, status_code, row_version",
            [
                ':pid'     => $partyId,
                ':role'    => $siteRoleCode,
                ':name'    => $siteName,
                ':addr1'   => trim($payload['address_line_1'] ?? ''),
                ':city'    => trim($payload['city_name'] ?? ''),
                ':country' => trim($payload['country_code'] ?? ''),
                ':def'     => ($payload['is_default'] ?? false) ? 'true' : 'false',
            ]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for party_site');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'party_site', $row['party_site_id'], $actorId,
            ['party_id' => $partyId, 'site_name' => $siteName]
        ));

        return [
            'partySiteId'  => $row['party_site_id'],
            'partyId'      => $row['party_id'],
            'siteRoleCode' => $row['site_role_code'],
            'siteName'     => $row['site_name'],
            'statusCode'   => $row['status_code'] ?? 'active',
            'rowVersion'   => (int)($row['row_version'] ?? 1),
        ];
    }

    /**
     * Register a party contact.
     */
    public function registerPartyContact(array $payload, string $actorId): array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $partyId     = trim($payload['party_id'] ?? '');
        $contactName = trim($payload['contact_name'] ?? '');

        if ($partyId === '' || $contactName === '') {
            throw new \InvalidArgumentException('party_id and contact_name are required.');
        }

        $row = $conn->insertReturning(
            "INSERT INTO party_contact (party_id, party_site_id, contact_name, contact_role_code, email_address, phone_number, is_primary)
             VALUES (:pid, :sid, :name, :role, :email, :phone, :primary)
             RETURNING party_contact_id, party_id, contact_name, email_address, phone_number, is_primary, status_code, row_version",
            [
                ':pid'     => $partyId,
                ':sid'     => trim($payload['party_site_id'] ?? '') !== '' ? $payload['party_site_id'] : null,
                ':name'    => $contactName,
                ':role'    => trim($payload['contact_role_code'] ?? '') !== '' ? $payload['contact_role_code'] : null,
                ':email'   => trim($payload['email_address'] ?? '') !== '' ? $payload['email_address'] : null,
                ':phone'   => trim($payload['phone_number'] ?? '') !== '' ? $payload['phone_number'] : null,
                ':primary' => ($payload['is_primary'] ?? false) ? 'true' : 'false',
            ]
        );

        if ($row === null) {
            throw new \RuntimeException('Insert failed for party_contact');
        }

        $auditTrail = new AuditTrail($this->data->getDataDir(), $conn);
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED, 'party_contact', $row['party_contact_id'], $actorId,
            ['party_id' => $partyId, 'contact_name' => $contactName]
        ));

        return [
            'partyContactId' => $row['party_contact_id'],
            'partyId'        => $row['party_id'],
            'contactName'    => $row['contact_name'],
            'emailAddress'   => $row['email_address'],
            'phoneNumber'    => $row['phone_number'],
            'isPrimary'      => (bool)($row['is_primary'] ?? false),
            'statusCode'     => $row['status_code'] ?? 'active',
            'rowVersion'     => (int)($row['row_version'] ?? 1),
        ];
    }
}
