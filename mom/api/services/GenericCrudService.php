<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use MOM\Services\WorkflowEngine;
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
    private const DELETE_GOVERNED_DOMAINS = [
        'audit_risk',
        'calibration_equipment',
        'customer_portal',
        'document_control',
        'evidence_vault',
        'forms_system',
        'master_data_governance',
        'quality_lab',
        'quality_management',
        'record_system',
        'shipping_compliance',
        'supplier_relationship',
        'trade_compliance',
    ];

    private Connection $db;
    private RegistryService $registry;
    private string $dataDir;
    private ?WorkflowEngine $workflowEngine = null;
    private ?EventBus $eventBus;

    /** @var array<string, array<string, mixed>> */
    private array $tables = [];
    /** @var array<string, array<string, mixed>>|null */
    private ?array $tableGovernanceOverlay = null;

    public function __construct(string $dataDir, ?EventBus $eventBus = null)
    {
        $this->dataDir = $dataDir;
        $this->eventBus = $eventBus;
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
     * @param array<string, mixed> $table
     */
    private function managedStatusField(array $table): string
    {
        $statusColumn = trim((string)($table['statusColumn'] ?? ''));
        if ($statusColumn !== '') {
            return $statusColumn;
        }

        $workflowId = trim((string)($table['workflowId'] ?? ''));
        if ($workflowId === '') {
            return '';
        }

        $workflow = $this->registry->workflowById($workflowId);
        if (!is_array($workflow)) {
            return '';
        }

        $workflowField = trim((string)($workflow['stateField'] ?? ''));
        if ($workflowField === '') {
            return '';
        }

        return array_key_exists($workflowField, (array)($table['columns'] ?? [])) ? $workflowField : '';
    }

    /**
     * @param array<string, mixed> $table
     */
    private function managedStatusSet(array $table): string
    {
        $workflowId = trim((string)($table['workflowId'] ?? ''));
        if ($workflowId !== '') {
            $workflow = $this->registry->workflowById($workflowId);
            if (is_array($workflow)) {
                $workflowStatusSet = trim((string)($workflow['statusSet'] ?? ''));
                if ($workflowStatusSet !== '') {
                    return $workflowStatusSet;
                }
            }
        }

        return trim((string)($table['statusSet'] ?? ''));
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
    public function list(string $domain, string $tableName, array $query = [], array $scope = []): array
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

        $statusColumn = $this->managedStatusField($table);
        $status = trim((string)($query['status'] ?? ''));
        if ($status !== '' && $statusColumn !== '' && in_array($statusColumn, $columns, true)) {
            $where[] = $this->q($statusColumn) . ' = :status';
            $params[':status'] = $status;
        }

        $scopeWhere = $this->scopeWhereClause($table, $scope, 'scope');
        if ($scopeWhere['sql'] !== '') {
            $where[] = $scopeWhere['sql'];
            $params = array_merge($params, $scopeWhere['params']);
        }

        foreach ($query as $key => $value) {
            if (!is_scalar($value) || $value === '') {
                continue;
            }
            if (in_array($key, ['search', 'q', 'status', 'sort', 'direction', 'limit', 'offset', 'action', 'domain', 'table', 'id', 'cursor', 'scope', 'row_version', 'expected_row_version', 'version'], true)) {
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
        $primaryKey = $this->primaryKeyMeta($table);
        $projection = $this->listProjectionColumns($domain, $tableName, $table, $sort);
        $orderBy = [$this->q($sort) . ' ' . $direction];
        foreach ((array)($primaryKey['fields'] ?? []) as $pkField) {
            if ($pkField === '' || $pkField === $sort) {
                continue;
            }
            $orderBy[] = $this->q($pkField) . ' ' . $direction;
        }

        $tableSql = $this->q($tableName);
        $listSql = 'SELECT ' . implode(', ', array_map([$this, 'q'], $projection)) . ' FROM ' . $tableSql . $whereSql
            . ' ORDER BY ' . implode(', ', $orderBy)
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
            'appliedScope' => $scopeWhere['scope'],
            'primaryKey' => $primaryKey['mode'] === 'scalar'
                ? $primaryKey['key']
                : $primaryKey['fields'],
            'primaryKeyFields' => $primaryKey['fields'],
            'recordAddressing' => $primaryKey['mode'],
            'concurrencyField' => array_key_exists('row_version', (array)($table['columns'] ?? [])) ? 'row_version' : null,
            'optimisticConcurrency' => array_key_exists('row_version', (array)($table['columns'] ?? [])),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function detail(string $domain, string $tableName, array $identity, array $scope = []): ?array
    {
        $table = $this->resolveTable($domain, $tableName);
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'detail'),
            $this->scopeWhereClause($table, $scope, 'detail_scope')
        );
        $sql = 'SELECT * FROM ' . $this->q($tableName) . ' WHERE ' . $where['sql'] . ' LIMIT 1';
        $row = $this->db->queryOne($sql, $where['params']);
        return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function create(string $domain, string $tableName, array $payload, string $userId = 'system', array $scope = []): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $data = $this->filterWritableColumns($table, $this->applyScopeColumns($table, $payload, $scope), false);
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

        $record = $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row) ?? $row;
        $this->publishRecordEvent(DomainEvent::recordCreated(
            $domain,
            $tableName,
            $this->recordIdForEvent($table, $record),
            $record,
        ));

        return $record;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function update(string $domain, string $tableName, array $identity, array $payload, string $userId = 'system', array $scope = [], ?int $expectedVersion = null): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $existing = $this->detail($domain, $tableName, $identity, $scope);
        if ($existing === null) {
            throw new RecordNotFoundException('Record not found');
        }

        $data = $this->filterWritableColumns($table, $this->applyScopeColumns($table, $payload, $scope), true);
        $this->validatePayload($domain, $tableName, $table, $data, 'update');
        $data = $this->applyAuditColumns($table, $data, $userId, false);

        if ($data === []) {
            throw new RuntimeException('No writable columns supplied');
        }

        $sets = [];
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'update'),
            $this->scopeWhereClause($table, $scope, 'update_scope'),
            $this->versionWhereClause($table, $expectedVersion, 'update_version')
        );
        $params = $where['params'];
        foreach ($data as $column => $value) {
            $param = ':u_' . $column;
            $sets[] = $this->q($column) . ' = ' . $param;
            $params[$param] = $value;
        }

        $sql = 'UPDATE ' . $this->q($tableName)
            . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . $where['sql'] . ' RETURNING *';

        $row = $this->db->insertReturning($sql, $params);
        if (!is_array($row)) {
            $this->assertMutationResult($tableName, $table, $identity, $scope, $expectedVersion, 'Update');
        }

        $record = $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row) ?? $row;
        $oldValues = [];
        foreach (array_keys($data) as $column) {
            if (array_key_exists($column, $existing)) {
                $oldValues[$column] = $existing[$column];
            }
        }
        $this->publishRecordEvent(DomainEvent::recordUpdated(
            $domain,
            $tableName,
            $this->recordIdForEvent($table, $record, $identity),
            $data,
            $oldValues,
        ));

        return $record;
    }

    /**
     * @return array<string, mixed>
     */
    public function delete(string $domain, string $tableName, array $identity, array $scope = [], ?int $expectedVersion = null, string $userId = ''): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $deleteContract = $this->deleteContract($tableName, $table);
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'delete'),
            $this->scopeWhereClause($table, $scope, 'delete_scope'),
            $this->versionWhereClause($table, $expectedVersion, 'delete_version')
        );

        if (($deleteContract['mode'] ?? '') === 'archive_only') {
            throw new RuntimeException((string)($deleteContract['message'] ?? 'Hard delete disabled for governed records'));
        }

        if (($deleteContract['mode'] ?? '') === 'soft_delete') {
            $data = [];
            $columns = (array)($table['columns'] ?? []);
            $now = gmdate('c');

            if (array_key_exists('deleted_at', $columns)) {
                $data['deleted_at'] = $now;
            }
            if (array_key_exists('archived_at', $columns)) {
                $data['archived_at'] = $now;
            }
            if (array_key_exists('is_deleted', $columns)) {
                $data['is_deleted'] = true;
            }

            $data = $this->applyAuditColumns($table, $data, $userId, false);
            $params = $where['params'];
            $sets = [];
            foreach ($data as $column => $value) {
                $param = ':d_' . $column;
                $sets[] = $this->q($column) . ' = ' . $param;
                $params[$param] = $value;
            }

            $sql = 'UPDATE ' . $this->q($tableName)
                . ' SET ' . implode(', ', $sets)
                . ' WHERE ' . $where['sql'] . ' RETURNING *';
            $row = $this->db->insertReturning($sql, $params);
            if (!is_array($row)) {
                $this->assertMutationResult($tableName, $table, $identity, $scope, $expectedVersion, 'Delete');
            }
            $record = $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row) ?? $row;
            $this->publishRecordEvent(DomainEvent::recordDeleted(
                $domain,
                $tableName,
                $this->recordIdForEvent($table, $record, $identity),
                'soft',
                $record,
            ));

            return $record;
        }

        $sql = 'DELETE FROM ' . $this->q($tableName)
            . ' WHERE ' . $where['sql'] . ' RETURNING *';
        $row = $this->db->insertReturning($sql, $where['params']);
        if (!is_array($row)) {
            $this->assertMutationResult($tableName, $table, $identity, $scope, $expectedVersion, 'Delete');
        }
        $record = $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row) ?? $row;
        $this->publishRecordEvent(DomainEvent::recordDeleted(
            $domain,
            $tableName,
            $this->recordIdForEvent($table, $record, $identity),
            'hard',
            $record,
        ));

        return $record;
    }

    private function workflowEngine(): WorkflowEngine
    {
        if ($this->workflowEngine === null) {
            $this->workflowEngine = new WorkflowEngine($this->dataDir, $this->db);
        }

        return $this->workflowEngine;
    }

    /**
     * @return array<string, mixed>
     */
    private function transitionRuntimeContract(string $domain, string $tableName): array
    {
        return $this->registry->transitionRuntime($domain, $tableName);
    }

    /**
     * @param array<string, mixed> $table
     * @return array<string, mixed>
     */
    private function assertTransitionRuntimeSupported(string $domain, string $tableName, array $table): array
    {
        $runtime = $this->transitionRuntimeContract($domain, $tableName);
        $lifecycleMode = strtolower(trim((string)($runtime['lifecycle_mode'] ?? '')));
        if ($lifecycleMode !== 'persisted') {
            return $runtime;
        }

        $bridge = is_array($runtime['engine_bridge'] ?? null) ? $runtime['engine_bridge'] : [];
        if (($bridge['ready'] ?? false) === true) {
            return $runtime;
        }

        $workflowId = trim((string)($table['workflowId'] ?? ''));
        $reasons = array_values(array_filter(array_map(
            static fn($reason): string => trim((string)$reason),
            is_array($bridge['block_reasons'] ?? null) ? $bridge['block_reasons'] : []
        )));
        $reasonText = $reasons !== [] ? ' [' . implode(', ', $reasons) . ']' : '';
        $detail = trim((string)($bridge['advisory'] ?? $runtime['runtime_error_detail'] ?? $runtime['advisory'] ?? ''));
        $message = "Persisted workflow {$workflowId} cannot run through generic status updates{$reasonText}.";
        if ($detail !== '') {
            $message .= ' ' . $detail;
        }
        $message .= ' Use the dedicated workflow-engine bridge before enabling production transitions.';

        throw new WorkflowBridgeRequiredException($message);
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $existing
     * @param array<string, mixed> $identity
     * @param array<string, mixed> $scope
     * @param array<string, mixed> $runtime
     * @return array<string, mixed>
     */
    private function transitionViaWorkflowEngine(string $domain, string $tableName, array $table, array $existing, array $identity, string $statusColumn, string $toStatus, string $userId, array $scope, ?int $expectedVersion, array $runtime): array
    {
        $bridge = is_array($runtime['engine_bridge'] ?? null) ? $runtime['engine_bridge'] : [];
        $identityField = trim((string)($bridge['identity_field'] ?? ''));
        $recordId = $identityField !== '' && array_key_exists($identityField, $existing) && is_scalar($existing[$identityField])
            ? trim((string)$existing[$identityField])
            : '';
        if ($recordId === '') {
            throw new WorkflowBridgeRequiredException('Workflow-engine bridge is configured, but no engine record identity could be resolved for this record.');
        }

        $stateMap = is_array($bridge['state_map'] ?? null) ? $bridge['state_map'] : [];
        $engineTargetState = trim((string)($stateMap[$toStatus] ?? $toStatus));
        if ($engineTargetState === '') {
            throw new WorkflowBridgeRequiredException('Workflow-engine bridge is configured, but the requested target state is not mapped for engine execution.');
        }

        $data = $this->applyAuditColumns($table, [$statusColumn => $toStatus], $userId, false);
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'transition'),
            $this->scopeWhereClause($table, $scope, 'transition_scope'),
            $this->versionWhereClause($table, $expectedVersion, 'transition_version')
        );
        $params = $where['params'];
        $params[':status'] = $toStatus;
        $sets = [$this->q($statusColumn) . ' = :status'];

        foreach ($data as $column => $value) {
            if ($column === $statusColumn) {
                continue;
            }
            $param = ':t_' . $column;
            $sets[] = $this->q($column) . ' = ' . $param;
            $params[$param] = $value;
        }

        $record = $this->db->transactional(function () use ($domain, $tableName, $table, $recordId, $engineTargetState, $userId, $params, $sets, $where, $identity, $scope, $expectedVersion): array {
            $result = $this->workflowEngine()->transition($recordId, $engineTargetState, $userId);
            if (!$result->success) {
                throw new RuntimeException((string)($result->error ?? 'Workflow engine transition failed'));
            }

            $sql = 'UPDATE ' . $this->q($tableName)
                . ' SET ' . implode(', ', $sets)
                . ' WHERE ' . $where['sql'] . ' RETURNING *';
            $row = $this->db->insertReturning($sql, $params);
            if (!is_array($row)) {
                $this->assertMutationResult($tableName, $table, $identity, $scope, $expectedVersion, 'Transition');
            }

            return $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row) ?? $row;
        });

        $this->publishRecordEvent(DomainEvent::recordUpdated(
            $domain,
            $tableName,
            $this->recordIdForEvent($table, $record, $identity),
            [$statusColumn => $toStatus],
            [$statusColumn => $existing[$statusColumn] ?? null],
        ));

        return $record;
    }

    /**
     * @param array<int, string> $userRoles
     * @return array<string, mixed>
     */
    public function transition(string $domain, string $tableName, array $identity, string $toStatus, string $userId, array $userRoles = [], array $scope = [], ?int $expectedVersion = null): array
    {
        $table = $this->resolveTable($domain, $tableName);
        $runtime = $this->assertTransitionRuntimeSupported($domain, $tableName, $table);
        $statusColumn = $this->managedStatusField($table);
        if ($statusColumn === '') {
            throw new RuntimeException("Table {$tableName} does not define a status column");
        }

        $existing = $this->detail($domain, $tableName, $identity, $scope);
        if ($existing === null) {
            throw new RecordNotFoundException('Record not found');
        }

        $currentStatus = (string)($existing[$statusColumn] ?? '');
        $this->assertValidStatus($table, $toStatus);
        $this->assertAllowedTransition($table, $currentStatus, $toStatus, $userRoles);
        if (strtolower(trim((string)($runtime['lifecycle_mode'] ?? ''))) === 'persisted') {
            return $this->transitionViaWorkflowEngine(
                $domain,
                $tableName,
                $table,
                $existing,
                $identity,
                $statusColumn,
                $toStatus,
                $userId,
                $scope,
                $expectedVersion,
                $runtime
            );
        }

        $data = $this->applyAuditColumns($table, [$statusColumn => $toStatus], $userId, false);
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'transition'),
            $this->scopeWhereClause($table, $scope, 'transition_scope'),
            $this->versionWhereClause($table, $expectedVersion, 'transition_version')
        );
        $params = $where['params'];
        $params[':status'] = $toStatus;
        $sets = [$this->q($statusColumn) . ' = :status'];

        foreach ($data as $column => $value) {
            if ($column === $statusColumn) {
                continue;
            }
            $param = ':t_' . $column;
            $sets[] = $this->q($column) . ' = ' . $param;
            $params[$param] = $value;
        }

        $sql = 'UPDATE ' . $this->q($tableName)
            . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . $where['sql'] . ' RETURNING *';
        $row = $this->db->insertReturning($sql, $params);
        if (!is_array($row)) {
            $this->assertMutationResult($tableName, $table, $identity, $scope, $expectedVersion, 'Transition');
        }

        $record = $this->augmentRowWithJoinFields($domain, $tableName, 'detail', $row);
        $record = $record ?? $row;
        $recordId = $this->recordIdForEvent($table, $record, $identity);
        $this->publishRecordEvent(DomainEvent::recordUpdated(
            $domain,
            $tableName,
            $recordId,
            [$statusColumn => $toStatus],
            [$statusColumn => $currentStatus],
        ));
        $this->publishRecordEvent(DomainEvent::workflowTransitioned(
            "{$domain}.{$tableName}",
            $recordId,
            $currentStatus,
            $toStatus,
            $userId,
        ));

        return $record;
    }

    private function publishRecordEvent(DomainEvent $event): void
    {
        try {
            ($this->eventBus ?? EventBus::getInstance())->publish($event);
        } catch (\Throwable $e) {
            @error_log('[GenericCrudService] Failed to publish domain event: ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $record
     * @param array<string, mixed> $identity
     */
    private function recordIdForEvent(array $table, array $record, array $identity = []): string
    {
        $primaryKey = $this->primaryKeyMeta($table);
        $fields = (array)($primaryKey['fields'] ?? []);
        $parts = [];

        foreach ($fields as $field) {
            $value = $record[$field] ?? $identity[$field] ?? ($identity['id'] ?? null);
            if (is_scalar($value) && (string)$value !== '') {
                $parts[] = $field . '=' . (string)$value;
            }
        }

        if ($parts !== []) {
            return implode('|', $parts);
        }

        foreach (['record_id', 'id', 'uuid', 'number', 'code'] as $fallbackField) {
            $value = $record[$fallbackField] ?? $identity[$fallbackField] ?? null;
            if (is_scalar($value) && (string)$value !== '') {
                return (string)$value;
            }
        }

        $encoded = json_encode($identity !== [] ? $identity : $record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return 'unknown:' . hash('sha256', is_string($encoded) ? $encoded : serialize($record));
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function filterWritableColumns(array $table, array $payload, bool $isUpdate): array
    {
        $columns = (array)($table['columns'] ?? []);
        $primaryKeys = array_flip($this->primaryKeyMeta($table)['fields']);
        $statusColumn = $this->managedStatusField($table);
        $result = [];

        foreach ($payload as $key => $value) {
            if (!is_string($key) || !isset($columns[$key]) || !is_array($columns[$key])) {
                continue;
            }

            $column = $columns[$key];
            $hasDefault = isset($column['default']) && $column['default'] !== null && $column['default'] !== '';
            $isAudit = in_array($key, ['created_at', 'updated_at', 'created_by', 'updated_by'], true);
            $isPk = isset($primaryKeys[$key]);
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
            $createdBy = $this->auditActorValue((array)$columns['created_by'], $userId);
            if ($createdBy !== null) {
                $data['created_by'] = $createdBy;
            }
        }
        if (array_key_exists('updated_at', $columns)) {
            $data['updated_at'] = $now;
        }
        if (array_key_exists('updated_by', $columns)) {
            $updatedBy = $this->auditActorValue((array)$columns['updated_by'], $userId);
            if ($updatedBy !== null) {
                $data['updated_by'] = $updatedBy;
            }
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

        if ($kind === 'create') {
            foreach ($columns as $columnName => $columnMeta) {
                if (!is_array($columnMeta)) {
                    continue;
                }
                $hasDefault = isset($columnMeta['default']) && $columnMeta['default'] !== null && $columnMeta['default'] !== '';
                $required = (bool)($columnMeta['required'] ?? false);
                $generated = (bool)($columnMeta['generated'] ?? false);
                if ($required && !$generated && !$hasDefault && !array_key_exists($columnName, $data)) {
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
     * @return array<int, string>
     */
    private function listProjectionColumns(string $domain, string $tableName, array $table, string $sort): array
    {
        $selected = [];
        $columns = (array)($table['columns'] ?? []);
        $fieldDefs = (array)($this->registry->fields($domain . '.' . $tableName . '.list') ?? []);
        $primaryKey = $this->primaryKeyMeta($table);
        $add = function (string $column) use (&$selected, $columns): void {
            if ($column === '' || !array_key_exists($column, $columns) || in_array($column, $selected, true)) {
                return;
            }
            $selected[] = $column;
        };

        foreach ((array)($primaryKey['fields'] ?? []) as $field) {
            $add((string)$field);
        }
        $add($sort);
        $add($this->managedStatusField($table));
        $add('row_version');
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $add($field);
        }

        foreach ($fieldDefs as $field) {
            if (!is_array($field) || ($field['source'] ?? '') !== 'db_column') {
                continue;
            }
            if (($field['dbTable'] ?? $tableName) !== $tableName) {
                continue;
            }
            $add((string)($field['dbColumn'] ?? ''));
        }

        foreach ($this->joinFieldSpecs($domain, $tableName, 'list') as $spec) {
            if (is_array($spec) && isset($spec['sourceField'])) {
                $add((string)$spec['sourceField']);
            }
        }

        return $selected !== [] ? $selected : array_keys($columns);
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

        $primaryKeyFields = $this->primaryKeyMeta($table)['fields'];
        if ($primaryKeyFields !== []) {
            return $this->assertIdentifier((string)$primaryKeyFields[0], 'primary key');
        }

        if ($columns !== []) {
            return $this->assertIdentifier((string)$columns[0], 'sort column');
        }

        throw new RuntimeException('Table does not define a sortable column');
    }

    /**
     * @param array<string, mixed> $table
     */
    private function primaryKeyMeta(array $table): array
    {
        $columns = array_keys((array)($table['columns'] ?? []));
        $raw = $table['primaryKey'] ?? null;
        $values = is_array($raw) ? $raw : [$raw];
        $fields = [];

        foreach ($values as $value) {
            $field = $this->resolveKeyField((string)$value, $columns);
            if ($field === '' || in_array($field, $fields, true)) {
                continue;
            }
            $fields[] = $field;
        }

        if (count($fields) === 1) {
            return ['mode' => 'scalar', 'fields' => $fields, 'key' => $fields[0]];
        }
        if ($fields !== []) {
            return ['mode' => 'composite', 'fields' => $fields, 'key' => null];
        }

        return ['mode' => 'missing', 'fields' => [], 'key' => null];
    }

    /**
     * @param array<int, string> $columns
     */
    private function resolveKeyField(string $value, array $columns): string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return '';
        }
        if (in_array($candidate, $columns, true)) {
            return $this->assertIdentifier($candidate, 'primary key');
        }
        if (preg_match_all('/[A-Za-z_][A-Za-z0-9_]*/', $candidate, $matches) >= 1) {
            foreach ($matches[0] as $token) {
                $token = trim((string)$token);
                if ($token !== '' && in_array($token, $columns, true)) {
                    return $this->assertIdentifier($token, 'primary key');
                }
            }
        }
        return '';
    }

    /**
     * @param array<string, mixed> $identity
     * @return array{sql:string, params:array<string, mixed>, identity:array<string, mixed>}
     */
    private function identityWhereClause(array $table, array $identity, string $prefix): array
    {
        $pk = $this->primaryKeyMeta($table);
        if ($pk['mode'] === 'missing' || $pk['fields'] === []) {
            throw new RuntimeException('Table does not define a primary key');
        }

        $normalized = [];
        foreach ($pk['fields'] as $index => $field) {
            $value = $identity[$field] ?? null;
            if ($pk['mode'] === 'scalar' && $value === null && array_key_exists('id', $identity)) {
                $value = $identity['id'];
            }
            if ($value === null && !array_key_exists($field, $identity) && !($pk['mode'] === 'scalar' && array_key_exists('id', $identity))) {
                throw new RuntimeException("Missing record identity field: {$field}");
            }
            $column = (array)(($table['columns'] ?? [])[$field] ?? []);
            if ($value === '' && !((bool)($column['required'] ?? false))) {
                $value = null;
            }
            if ($value !== null && (is_array($value) || is_object($value))) {
                throw new RuntimeException("Invalid record identity field: {$field}");
            }
            $normalized[$field] = $value;
        }

        $clauses = [];
        $params = [];
        foreach ($normalized as $field => $value) {
            if ($value === null) {
                $clauses[] = $this->q($field) . ' IS NULL';
                continue;
            }
            $param = ':' . $prefix . '_' . count($params);
            $clauses[] = $this->q($field) . ' = ' . $param;
            $params[$param] = $value;
        }

        return [
            'sql' => implode(' AND ', $clauses),
            'params' => $params,
            'identity' => $normalized,
        ];
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $scope
     * @return array{sql:string, params:array<string, mixed>, scope:array<string, mixed>}
     */
    private function scopeWhereClause(array $table, array $scope, string $prefix): array
    {
        $columns = (array)($table['columns'] ?? []);
        $normalized = [];
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            if (!array_key_exists($field, $columns) || !array_key_exists($field, $scope)) {
                continue;
            }
            $value = $scope[$field];
            if (!is_scalar($value) || trim((string)$value) === '') {
                continue;
            }
            $normalized[$field] = (string)$value;
        }

        $clauses = [];
        $params = [];
        foreach ($normalized as $field => $value) {
            $param = ':' . $prefix . '_' . count($params);
            $clauses[] = $this->q($field) . ' = ' . $param;
            $params[$param] = $value;
        }

        return [
            'sql' => implode(' AND ', $clauses),
            'params' => $params,
            'scope' => $normalized,
        ];
    }

    /**
     * @param array<string, mixed> $table
     * @return array{sql:string, params:array<string, mixed>}
     */
    private function versionWhereClause(array $table, ?int $expectedVersion, string $prefix): array
    {
        $columns = (array)($table['columns'] ?? []);
        if ($expectedVersion === null || !array_key_exists('row_version', $columns)) {
            return ['sql' => '', 'params' => []];
        }

        return [
            'sql' => $this->q('row_version') . ' = :' . $prefix,
            'params' => [':' . $prefix => $expectedVersion],
        ];
    }

    /**
     * @param array<string, mixed> ...$clauses
     * @return array{sql:string, params:array<string, mixed>}
     */
    private function combineWhereClauses(array ...$clauses): array
    {
        $sqlParts = [];
        $params = [];
        foreach ($clauses as $clause) {
            $sql = trim((string)($clause['sql'] ?? ''));
            if ($sql === '') {
                continue;
            }
            $sqlParts[] = '(' . $sql . ')';
            $params = array_merge($params, (array)($clause['params'] ?? []));
        }

        return [
            'sql' => implode(' AND ', $sqlParts),
            'params' => $params,
        ];
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $data
     * @param array<string, mixed> $scope
     * @return array<string, mixed>
     */
    private function applyScopeColumns(array $table, array $data, array $scope): array
    {
        $columns = (array)($table['columns'] ?? []);
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            if (!array_key_exists($field, $columns) || array_key_exists($field, $data) || !array_key_exists($field, $scope)) {
                continue;
            }
            $value = $scope[$field];
            if (!is_scalar($value) || trim((string)$value) === '') {
                continue;
            }
            $data[$field] = (string)$value;
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $column
     */
    private function auditActorValue(array $column, string $actor): ?string
    {
        $trimmed = trim($actor);
        if ($trimmed === '') {
            return null;
        }

        $type = strtoupper((string)($column['type'] ?? ''));
        if (str_contains($type, 'UUID') && !$this->isUuid($trimmed)) {
            return null;
        }

        return $trimmed;
    }

    private function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, mixed> $identity
     * @param array<string, mixed> $scope
     */
    private function assertMutationResult(string $tableName, array $table, array $identity, array $scope, ?int $expectedVersion, string $verb): never
    {
        $where = $this->combineWhereClauses(
            $this->identityWhereClause($table, $identity, 'verify'),
            $this->scopeWhereClause($table, $scope, 'verify_scope')
        );

        $existing = $this->db->queryOne(
            'SELECT * FROM ' . $this->q($tableName) . ' WHERE ' . $where['sql'] . ' LIMIT 1',
            $where['params']
        );

        if (is_array($existing) && $expectedVersion !== null && array_key_exists('row_version', $existing)) {
            throw new RecordConflictException(sprintf(
                '%s rejected due to stale row_version. Expected %d, current %d.',
                $verb,
                $expectedVersion,
                (int)$existing['row_version']
            ));
        }

        throw new RecordNotFoundException('Record not found');
    }

    /**
     * @param array<string, mixed> $table
     */
    private function assertValidStatus(array $table, string $toStatus): void
    {
        $statusSet = $this->managedStatusSet($table);
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
        $check = $this->registry->canTransition($workflowId, $fromStatus, $toStatus, $userRoles);
        if (($check['allowed'] ?? false) !== true) {
            $reason = trim((string)($check['reason'] ?? ''));
            throw new RuntimeException($reason !== '' ? $reason : "Transition {$fromStatus} -> {$toStatus} is not allowed");
        }
    }

    /**
     * @param array<string, mixed> $table
     * @return array{mode:string, message:string}
     */
    private function deleteContract(string $tableName, array $table): array
    {
        $columns = (array)($table['columns'] ?? []);
        $overlay = $this->tableGovernanceOverlayFor($tableName);
        $overlayDeletionMode = strtolower(trim((string)($overlay['deletionMode'] ?? '')));
        $waiverRequired = (bool)($overlay['hardDeleteWaiverRequired'] ?? false);

        if ($overlayDeletionMode === 'archive_only' || $waiverRequired) {
            if (array_key_exists('deleted_at', $columns) || array_key_exists('is_deleted', $columns) || array_key_exists('archived_at', $columns)) {
                return [
                    'mode' => 'soft_delete',
                    'message' => '',
                ];
            }

            return [
                'mode' => 'archive_only',
                'message' => 'Hard delete disabled by enterprise registry governance. Use archive, correction, reversal, or supersession flows instead.',
            ];
        }

        if ((bool)($table['supportTable'] ?? false) && $overlayDeletionMode === 'hard_delete') {
            return [
                'mode' => 'hard_delete',
                'message' => '',
            ];
        }

        if (array_key_exists('deleted_at', $columns) || array_key_exists('is_deleted', $columns) || array_key_exists('archived_at', $columns)) {
            return [
                'mode' => 'soft_delete',
                'message' => '',
            ];
        }

        $normalizedTable = strtolower(trim($tableName));
        $normalizedDomain = strtolower(trim((string)($table['domain'] ?? '')));
        $archiveOnly = trim((string)($table['workflowId'] ?? '')) !== ''
            || trim((string)($table['statusColumn'] ?? '')) !== ''
            || in_array($normalizedDomain, self::DELETE_GOVERNED_DOMAINS, true)
            || preg_match('/audit|evidence|document|record|retention|allocation|certificate|passport|training|complaint|shipment|invoice|order|supplier|customer|workflow/', $normalizedTable) === 1;

        if ($archiveOnly) {
            return [
                'mode' => 'archive_only',
                'message' => 'Hard delete disabled for governed records. Use archive, retention, or governed disposal flows instead.',
            ];
        }

        return [
            'mode' => 'hard_delete',
            'message' => '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function tableGovernanceOverlayFor(string $tableName): array
    {
        if ($this->tableGovernanceOverlay === null) {
            $path = rtrim($this->dataDir, '/\\') . '/registry/table-governance-overlay.json';
            $payload = [];
            if (is_file($path)) {
                $decoded = json_decode((string)file_get_contents($path), true);
                if (is_array($decoded)) {
                    $payload = $decoded;
                }
            }
            $this->tableGovernanceOverlay = is_array($payload['tables'] ?? null) ? $payload['tables'] : [];
        }

        $table = $this->tableGovernanceOverlay[$tableName] ?? [];
        return is_array($table) ? $table : [];
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
