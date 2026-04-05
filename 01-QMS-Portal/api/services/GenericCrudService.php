<?php
declare(strict_types=1);

namespace HESEM\QMS\Api\Services;

use HESEM\QMS\Database\Connection;
use RuntimeException;

/**
 * Registry-backed CRUD service for table actions generated from table-registry.
 *
 * The service deliberately keeps write logic conservative:
 * - only valid table/column identifiers from table-registry are accepted
 * - generated columns and defaulted PKs are not writable
 * - workflow status changes should flow through transition()
 */
class GenericCrudService
{
    private Connection $db;
    private RegistryService $registry;

    /** @var array<string, array<string, mixed>> */
    private array $tables = [];

    public function __construct(string $dataDir)
    {
        $portalRoot = dirname(__DIR__, 2);
        $config = (array)(require $portalRoot . '/database/config.php');
        $this->db = Connection::getInstance($config);
        $this->registry = new RegistryService($dataDir);
        $this->tables = (array)($this->registry->raw('table-registry')['tables'] ?? []);
    }

    /**
     * @return array<string, mixed>
     */
    public function resolveTable(string $domain, string $tableName): array
    {
        $domain = $this->assertIdentifier($domain, 'domain');
        $tableName = $this->assertIdentifier($tableName, 'table');
        $table = $this->tables[$tableName] ?? null;

        if (!is_array($table)) {
            throw new RuntimeException("Unknown table: {$tableName}");
        }

        if (($table['domain'] ?? '') !== $domain) {
            throw new RuntimeException("Table {$tableName} does not belong to domain {$domain}");
        }

        return $table;
    }

    /**
     * @return array<int, array{
     *   key:string,
     *   sourceField:string,
     *   targetTable:string,
     *   targetKey:string,
     *   targetField:string
     * }>
     */
    private function joinFieldSpecs(string $domain, string $tableName, string $kind): array
    {
        $table = $this->tables[$tableName] ?? [];
        $fieldDefs = (array)($this->registry->fields($domain . '.' . $tableName . '.' . $kind) ?? []);
        $foreignKeys = (array)($table['foreignKeys'] ?? []);
        $specs = [];

        foreach ($fieldDefs as $field) {
            if (!is_array($field) || ($field['source'] ?? '') !== 'join') {
                continue;
            }

            $outputKey = trim((string)($field['key'] ?? ''));
            $sourceField = trim((string)($field['joinVia'] ?? ''));
            $targetTable = trim((string)($field['dbTable'] ?? ''));
            $targetField = trim((string)($field['dbColumn'] ?? ''));
            if ($outputKey === '' || $sourceField === '' || $targetTable === '' || $targetField === '') {
                continue;
            }

            $targetKey = '';
            foreach ($foreignKeys as $foreignKey) {
                if (!is_array($foreignKey) || trim((string)($foreignKey['column'] ?? '')) !== $sourceField) {
                    continue;
                }

                $reference = trim((string)($foreignKey['references'] ?? ''));
                if ($reference === '' || strpos($reference, '.') === false) {
                    continue;
                }

                [$refTable, $refColumn] = explode('.', $reference, 2);
                if ($refTable === $targetTable && $refColumn !== '') {
                    $targetKey = trim((string)$refColumn);
                    break;
                }
            }

            if ($targetKey === '') {
                continue;
            }

            $specs[] = [
                'key' => $outputKey,
                'sourceField' => $sourceField,
                'targetTable' => $targetTable,
                'targetKey' => $targetKey,
                'targetField' => $targetField,
            ];
        }

        return $specs;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function augmentRowsWithJoinFields(string $domain, string $tableName, string $kind, array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }

        $specs = $this->joinFieldSpecs($domain, $tableName, $kind);
        if ($specs === []) {
            return $rows;
        }

        $groups = [];
        foreach ($specs as $spec) {
            $groupKey = $spec['sourceField'] . '|' . $spec['targetTable'] . '|' . $spec['targetKey'];
            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'sourceField' => $spec['sourceField'],
                    'targetTable' => $spec['targetTable'],
                    'targetKey' => $spec['targetKey'],
                    'targetFields' => [],
                ];
            }
            $groups[$groupKey]['targetFields'][$spec['key']] = $spec['targetField'];
        }

        foreach ($groups as $group) {
            $values = [];
            foreach ($rows as $row) {
                $value = $row[$group['sourceField']] ?? null;
                if (!is_scalar($value) || $value === '') {
                    continue;
                }
                $values[(string)$value] = $value;
            }

            if ($values === []) {
                continue;
            }

            $params = [];
            $placeholders = [];
            $index = 0;
            foreach ($values as $value) {
                $param = ':j_' . $index;
                $params[$param] = $value;
                $placeholders[] = $param;
                $index += 1;
            }

            $selectColumns = [$this->q($group['targetKey'])];
            foreach (array_unique(array_values($group['targetFields'])) as $targetField) {
                $selectColumns[] = $this->q($targetField);
            }

            $sql = 'SELECT ' . implode(', ', $selectColumns)
                . ' FROM ' . $this->q($group['targetTable'])
                . ' WHERE ' . $this->q($group['targetKey']) . ' IN (' . implode(', ', $placeholders) . ')';
            $lookupRows = $this->db->query($sql, $params);
            $lookup = [];
            foreach ($lookupRows as $lookupRow) {
                if (!is_array($lookupRow) || !array_key_exists($group['targetKey'], $lookupRow)) {
                    continue;
                }
                $lookup[(string)$lookupRow[$group['targetKey']]] = $lookupRow;
            }

            foreach ($rows as &$row) {
                $sourceValue = $row[$group['sourceField']] ?? null;
                if (!is_scalar($sourceValue)) {
                    continue;
                }
                $joined = $lookup[(string)$sourceValue] ?? null;
                if (!is_array($joined)) {
                    continue;
                }
                foreach ($group['targetFields'] as $outputKey => $targetField) {
                    $row[$outputKey] = $joined[$targetField] ?? null;
                }
            }
            unset($row);
        }

        return $rows;
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>|null
     */
    private function augmentRowWithJoinFields(string $domain, string $tableName, string $kind, ?array $row): ?array
    {
        if ($row === null) {
            return null;
        }

        $rows = $this->augmentRowsWithJoinFields($domain, $tableName, $kind, [$row]);
        return $rows[0] ?? $row;
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function list(string $domain, string $tableName, array $query = []): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $where = [];
        $params = [];
        $columns = array_keys((array)($table['columns'] ?? []));

        $search = trim((string)($query['search'] ?? $query['q'] ?? ''));
        if ($search !== '') {
            $searchable = $this->searchableColumns($table);
            if ($searchable !== []) {
                $parts = [];
                foreach ($searchable as $index => $column) {
                    $param = ':search_' . $index;
                    $parts[] = $this->q($column) . '::text ILIKE ' . $param;
                    $params[$param] = '%' . $search . '%';
                }
                $where[] = '(' . implode(' OR ', $parts) . ')';
            }
        }

        $statusColumn = (string)($table['statusColumn'] ?? '');
        $status = trim((string)($query['status'] ?? ''));
        if ($status !== '' && $statusColumn !== '' && in_array($statusColumn, $columns, true)) {
            $where[] = $this->q($statusColumn) . ' = :status';
            $params[':status'] = $status;
        }

        foreach ($query as $key => $value) {
            if (!is_scalar($value) || $value === '' || $value === null) {
                continue;
            }
            if (in_array($key, ['search', 'q', 'status', 'sort', 'direction', 'limit', 'offset', 'action', 'domain', 'table', 'id'], true)) {
                continue;
            }
            if (!in_array($key, $columns, true)) {
                continue;
            }

            $param = ':f_' . count($params);
            $where[] = $this->q($key) . ' = ' . $param;
            $params[$param] = (string)$value;
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $sort = trim((string)($query['sort'] ?? ''));
        if (!in_array($sort, $columns, true)) {
            $sort = $this->defaultSortColumn($table);
        }
        $direction = strtolower(trim((string)($query['direction'] ?? 'desc'))) === 'asc' ? 'ASC' : 'DESC';
        $offset = max(0, (int)($query['offset'] ?? 0));
        $limit = min(500, max(1, (int)($query['limit'] ?? 100)));

        $tableSql = $this->q($tableName);
        $listSql = 'SELECT * FROM ' . $tableSql . $whereSql
            . ' ORDER BY ' . $this->q($sort) . ' ' . $direction
            . ' LIMIT ' . $limit . ' OFFSET ' . $offset;
        $countSql = 'SELECT COUNT(*) AS total FROM ' . $tableSql . $whereSql;

        $rows = $this->db->query($listSql, $params);
        $rows = $this->augmentRowsWithJoinFields($domain, $tableName, 'list', $rows);
        $countRow = $this->db->queryOne($countSql, $params);
        $total = (int)($countRow['total'] ?? 0);

        return [
            'records' => $rows,
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit,
            'table' => $tableName,
            'domain' => $domain,
            'primaryKey' => $this->primaryKey($table),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function detail(string $domain, string $tableName, string $id): ?array
    {
        $table = $this->resolveTable($domain, $tableName);
        $pk = $this->primaryKey($table);
        $sql = 'SELECT * FROM ' . $this->q($tableName) . ' WHERE ' . $this->q($pk) . ' = :id LIMIT 1';
        $row = $this->db->queryOne($sql, [':id' => $id]);
        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function create(string $domain, string $tableName, array $payload, string $userId = 'system'): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $data = $this->filterWritableColumns($table, $payload, false);
        $this->validatePayload($domain, $tableName, $table, $data, 'create');
        $data = $this->applyAuditColumns($table, $data, $userId, true);

        if ($data === []) {
            throw new RuntimeException('No writable columns supplied');
        }

        $columns = array_keys($data);
        $params = [];
        $placeholders = [];
        foreach ($columns as $column) {
            $param = ':' . $column;
            $params[$param] = $data[$column];
            $placeholders[] = $param;
        }

        $sql = 'INSERT INTO ' . $this->q($tableName)
            . ' (' . implode(', ', array_map(fn(string $column): string => $this->q($column), $columns)) . ')'
            . ' VALUES (' . implode(', ', $placeholders) . ') RETURNING *';

        $row = $this->db->insertReturning($sql, $params);
        if (!is_array($row)) {
            throw new RuntimeException('Insert did not return a record');
        }

        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function update(string $domain, string $tableName, string $id, array $payload, string $userId = 'system'): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $existing = $this->detail($domain, $tableName, $id);
        if ($existing === null) {
            throw new RuntimeException('Record not found');
        }

        $data = $this->filterWritableColumns($table, $payload, true);
        $this->validatePayload($domain, $tableName, $table, $data, 'update');
        $data = $this->applyAuditColumns($table, $data, $userId, false);

        if ($data === []) {
            throw new RuntimeException('No writable columns supplied');
        }

        $sets = [];
        $params = [':id' => $id];
        foreach ($data as $column => $value) {
            $param = ':u_' . $column;
            $sets[] = $this->q($column) . ' = ' . $param;
            $params[$param] = $value;
        }

        $pk = $this->primaryKey($table);
        $sql = 'UPDATE ' . $this->q($tableName)
            . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . $this->q($pk) . ' = :id RETURNING *';

        $row = $this->db->insertReturning($sql, $params);
        if (!is_array($row)) {
            throw new RuntimeException('Update did not return a record');
        }

        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @return array<string, mixed>
     */
    public function delete(string $domain, string $tableName, string $id): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $pk = $this->primaryKey($table);
        $sql = 'DELETE FROM ' . $this->q($tableName)
            . ' WHERE ' . $this->q($pk) . ' = :id RETURNING *';
        $row = $this->db->insertReturning($sql, [':id' => $id]);
        if (!is_array($row)) {
            throw new RuntimeException('Record not found');
        }
        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @param array<int, string> $userRoles
     * @return array<string, mixed>
     */
    public function transition(string $domain, string $tableName, string $id, string $toStatus, string $userId, array $userRoles = []): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $statusColumn = trim((string)($table['statusColumn'] ?? ''));
        if ($statusColumn === '') {
            throw new RuntimeException("Table {$tableName} does not define a status column");
        }

        $existing = $this->detail($domain, $tableName, $id);
        if ($existing === null) {
            throw new RuntimeException('Record not found');
        }

        $currentStatus = (string)($existing[$statusColumn] ?? '');
        $this->assertValidStatus($table, $toStatus);
        $this->assertAllowedTransition($table, $currentStatus, $toStatus, $userRoles);
        $data = $this->applyAuditColumns($table, [$statusColumn => $toStatus], $userId, false);
        $params = [':id' => $id, ':status' => $toStatus];
        $sets = [$this->q($statusColumn) . ' = :status'];

        foreach ($data as $column => $value) {
            if ($column === $statusColumn) {
                continue;
            }
            $param = ':t_' . $column;
            $sets[] = $this->q($column) . ' = ' . $param;
            $params[$param] = $value;
        }

        $pk = $this->primaryKey($table);
        $sql = 'UPDATE ' . $this->q($tableName)
            . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . $this->q($pk) . ' = :id RETURNING *';
        $row = $this->db->insertReturning($sql, $params);
        if (!is_array($row)) {
            throw new RuntimeException('Transition did not return a record');
        }

        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function filterWritableColumns(array $table, array $payload, bool $isUpdate): array
    {
        $columns = (array)($table['columns'] ?? []);
        $pk = $this->primaryKey($table);
        $statusColumn = (string)($table['statusColumn'] ?? '');
        $result = [];

        foreach ($payload as $key => $value) {
            if (!is_string($key) || !isset($columns[$key]) || !is_array($columns[$key])) {
                continue;
            }

            $column = $columns[$key];
            $hasDefault = isset($column['default']) && $column['default'] !== null && $column['default'] !== '';
            $isAudit = in_array($key, ['created_at', 'updated_at', 'created_by', 'updated_by'], true);
            $isPk = ($key === $pk);
            $isGenerated = (bool)($column['generated'] ?? false);
            $isStatusManaged = $isUpdate && $statusColumn !== '' && $key === $statusColumn;

            if ($isAudit || $isGenerated || $isStatusManaged) {
                continue;
            }

            if ($isPk && $hasDefault) {
                continue;
            }

            $result[$key] = $this->normalizeValue($value, $column);
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function applyAuditColumns(array $table, array $data, string $userId, bool $isCreate): array
    {
        $columns = (array)($table['columns'] ?? []);
        $now = gmdate('c');

        if ($isCreate && array_key_exists('created_at', $columns) && !isset($data['created_at'])) {
            $data['created_at'] = $now;
        }
        if ($isCreate && array_key_exists('created_by', $columns) && !isset($data['created_by'])) {
            $data['created_by'] = $userId;
        }
        if (array_key_exists('updated_at', $columns)) {
            $data['updated_at'] = $now;
        }
        if (array_key_exists('updated_by', $columns)) {
            $data['updated_by'] = $userId;
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $data
     */
    private function validatePayload(string $domain, string $tableName, array $table, array $data, string $kind): void
    {
        $columns = (array)($table['columns'] ?? []);
        $pk = $this->primaryKey($table);

        if ($kind === 'create') {
            foreach ($columns as $columnName => $columnMeta) {
                if (!is_array($columnMeta)) {
                    continue;
                }
                $isPk = $columnName === $pk;
                $hasDefault = isset($columnMeta['default']) && $columnMeta['default'] !== null && $columnMeta['default'] !== '';
                $required = (bool)($columnMeta['required'] ?? false);
                $generated = (bool)($columnMeta['generated'] ?? false);
                if ($required && !$isPk && !$generated && !$hasDefault && !array_key_exists($columnName, $data)) {
                    throw new RuntimeException("Missing required field: {$columnName}");
                }
            }
        }

        $fieldDefs = (array)($this->registry->fields($domain . '.' . $tableName . '.' . $kind) ?? []);
        $fieldMap = [];
        foreach ($fieldDefs as $field) {
            if (is_array($field) && isset($field['key'])) {
                $fieldMap[(string)$field['key']] = $field;
            }
        }

        foreach ($data as $columnName => $value) {
            $field = $fieldMap[$columnName] ?? null;
            if (!is_array($field)) {
                continue;
            }
            $constraints = (array)($field['constraints'] ?? []);

            if (isset($constraints['maxLength']) && is_string($value) && mb_strlen($value) > (int)$constraints['maxLength']) {
                throw new RuntimeException("Field {$columnName} exceeds max length {$constraints['maxLength']}");
            }
            if (isset($constraints['min']) && is_numeric($value) && (float)$value < (float)$constraints['min']) {
                throw new RuntimeException("Field {$columnName} is below minimum {$constraints['min']}");
            }
            if (isset($constraints['max']) && is_numeric($value) && (float)$value > (float)$constraints['max']) {
                throw new RuntimeException("Field {$columnName} exceeds maximum {$constraints['max']}");
            }
            if (isset($constraints['pattern']) && is_string($value) && @preg_match('/' . $constraints['pattern'] . '/u', $value) !== 1) {
                throw new RuntimeException("Field {$columnName} does not match required pattern");
            }
            if (isset($constraints['enumRef']) && is_scalar($value)) {
                $allowed = array_map(
                    static fn(array $option): string => (string)($option['value'] ?? ''),
                    $this->registry->statusSet((string)$constraints['enumRef'])
                );
                if ($allowed !== [] && !in_array((string)$value, $allowed, true)) {
                    throw new RuntimeException("Field {$columnName} contains an invalid status value");
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $table
     * @return array<int, string>
     */
    private function searchableColumns(array $table): array
    {
        $columns = (array)($table['columns'] ?? []);
        $preferred = [];
        $fallback = [];

        foreach ($columns as $columnName => $meta) {
            if (!is_array($meta)) {
                continue;
            }
            $type = strtoupper((string)($meta['type'] ?? ''));
            if (!preg_match('/CHAR|TEXT|UUID|JSON|ENUM/', $type)) {
                continue;
            }

            if (preg_match('/name|title|number|code|description|status|email|phone|record_id|job_number|part_number/i', $columnName)) {
                $preferred[] = $columnName;
            } else {
                $fallback[] = $columnName;
            }
        }

        return array_slice(array_values(array_unique(array_merge($preferred, $fallback))), 0, 10);
    }

    /**
     * @param array<string, mixed> $table
     */
    private function defaultSortColumn(array $table): string
    {
        $columns = array_keys((array)($table['columns'] ?? []));
        foreach (['updated_at', 'created_at', 'effective_date', 'event_time', 'recorded_at', 'measured_at', 'detected_at', 'alarm_time', 'start_time', 'ts'] as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }

        $primaryKey = $table['primaryKey'] ?? null;
        if (is_string($primaryKey) && trim($primaryKey) !== '') {
            return $this->assertIdentifier(trim($primaryKey), 'primary key');
        }

        if ($columns !== []) {
            return $this->assertIdentifier((string)$columns[0], 'sort column');
        }

        throw new RuntimeException('Table does not define a sortable column');
    }

    /**
     * @param array<string, mixed> $table
     */
    private function primaryKey(array $table): string
    {
        $pk = $table['primaryKey'] ?? null;
        if (is_array($pk)) {
            $keys = array_values(array_filter(array_map(static fn($value): string => trim((string)$value), $pk), static fn(string $value): bool => $value !== ''));
            if (count($keys) !== 1) {
                throw new RuntimeException('Composite or missing primary key is not supported by GenericCrudService');
            }
            $pk = $keys[0];
        }
        $pk = is_string($pk) ? trim($pk) : '';
        if ($pk === '') {
            throw new RuntimeException('Table does not define a primary key');
        }
        return $this->assertIdentifier($pk, 'primary key');
    }

    /**
     * @param array<string, mixed> $table
     */
    private function assertValidStatus(array $table, string $toStatus): void
    {
        $statusSet = trim((string)($table['statusSet'] ?? ''));
        if ($statusSet === '') {
            return;
        }

        $values = array_map(
            static fn(array $option): string => (string)($option['value'] ?? ''),
            $this->registry->statusSet($statusSet)
        );
        if ($values !== [] && !in_array($toStatus, $values, true)) {
            throw new RuntimeException("Invalid status value: {$toStatus}");
        }
    }

    /**
     * @param array<string, mixed> $table
     * @param array<int, string> $userRoles
     */
    private function assertAllowedTransition(array $table, string $fromStatus, string $toStatus, array $userRoles): void
    {
        $workflowId = trim((string)($table['workflowId'] ?? ''));
        if ($workflowId === '') {
            return;
        }

        $workflow = $this->registry->workflowById($workflowId);
        if (!is_array($workflow)) {
            return;
        }

        $transitions = (array)($workflow['transitions'] ?? []);
        foreach ($transitions as $transition) {
            if (!is_array($transition)) {
                continue;
            }
            if (($transition['from'] ?? '') !== $fromStatus || ($transition['to'] ?? '') !== $toStatus) {
                continue;
            }

            foreach ((array)($transition['guards'] ?? []) as $guard) {
                if (!is_array($guard) || ($guard['type'] ?? '') !== 'role') {
                    continue;
                }
                $roles = array_map('strval', (array)($guard['roles'] ?? []));
                if ($roles !== [] && array_intersect($roles, $userRoles) === []) {
                    throw new RuntimeException('Transition blocked by role guard');
                }
            }
            return;
        }

        throw new RuntimeException("Transition {$fromStatus} -> {$toStatus} is not allowed");
    }

    private function assertIdentifier(string $value, string $label): string
    {
        if (!preg_match('/^[a-z0-9_]+$/', $value)) {
            throw new RuntimeException("Invalid {$label}: {$value}");
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $column
     */
    private function normalizeValue(mixed $value, array $column): mixed
    {
        $type = strtoupper((string)($column['type'] ?? ''));
        if (is_array($value) || is_object($value)) {
            if (str_contains($type, 'JSON')) {
                $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($json === false) {
                    throw new RuntimeException('Unable to encode JSON payload');
                }
                return $json;
            }
            throw new RuntimeException('Complex values are only allowed for JSON columns');
        }

        return $value;
    }

    private function q(string $identifier): string
    {
        return '"' . $this->assertIdentifier($identifier, 'identifier') . '"';
    }
}
