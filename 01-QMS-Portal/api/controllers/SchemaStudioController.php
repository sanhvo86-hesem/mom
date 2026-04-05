<?php
declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Database\Connection;
use HESEM\QMS\Database\DataLayer;
use PDO;
use Throwable;

class SchemaStudioController extends BaseController
{
    private string $studioDir;
    private string $designDir;
    private string $snapshotDir;
    private string $exportDir;

    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);
        $this->studioDir = $this->dataDir . '/schema-studio';
        $this->designDir = $this->studioDir . '/designs';
        $this->snapshotDir = $this->studioDir . '/snapshots';
        $this->exportDir = $this->studioDir . '/exports';
        $this->ensureDir($this->studioDir);
        $this->ensureDir($this->designDir);
        $this->ensureDir($this->snapshotDir);
        $this->ensureDir($this->exportDir);
    }

    private function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
    }

    private function requireReadAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['schema_studio.read', 'schema_studio.write']);
    }

    private function requireWriteAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['schema_studio.write']);
    }

    private function requireDatabaseAccess(array $user): void
    {
        $this->requireAnyRole($user, array_merge(admin_roles(), ['developer', 'it_admin']));
    }

    private function requireMigrationAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['schema_studio.migrate', 'schema_studio.write']);
    }

    private function requireExportAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['schema_studio.export', 'schema_studio.read', 'schema_studio.write']);
    }

    private function requireDataWriteAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['schema_studio.data_write', 'schema_studio.write']);
    }

    private function safeId(string $value, string $fallback = 'schema_studio'): string
    {
        $clean = preg_replace('/[^A-Za-z0-9_-]+/', '_', trim($value));
        $clean = trim((string)$clean, '_');
        return $clean !== '' ? $clean : $fallback . '_' . gmdate('Ymd_His');
    }

    private function endsWith(string $value, string $suffix): bool
    {
        if ($suffix === '') {
            return true;
        }
        return substr($value, -strlen($suffix)) === $suffix;
    }

    private function designPath(string $id): string
    {
        return $this->designDir . '/' . $this->safeId($id) . '.json';
    }

    private function baselinePath(string $id): string
    {
        return $this->snapshotDir . '/' . $this->safeId($id) . '.baseline.json';
    }

    private function destructiveConfirmToken(array $user): string
    {
        $actor = (string)($user['user_id'] ?? $user['username'] ?? 'system');
        return 'CONFIRMED_DESTRUCTIVE_' . $actor;
    }

    private function forbiddenMigrationStatement(string $sql): ?string
    {
        if (preg_match('/\b(TRUNCATE|DELETE|UPDATE|INSERT|COPY|VACUUM|ANALYZE|REINDEX|GRANT|REVOKE|ALTER\s+SYSTEM|CREATE\s+ROLE|ALTER\s+ROLE|DROP\s+ROLE|SET\s+ROLE|DO|CALL|EXECUTE)\b/i', $sql, $matches)) {
            return strtoupper((string)($matches[1] ?? ''));
        }

        return null;
    }

    private function reconcileSchemaDocument(array $schema): array
    {
        $tables = array_values(is_array($schema['tables'] ?? null) ? $schema['tables'] : []);
        $relations = array_values(is_array($schema['relations'] ?? null) ? $schema['relations'] : []);
        $tableIndexMap = [];
        $columnIndexMap = [];
        $normalizedRelations = [];
        $relationBySource = [];

        foreach ($tables as $tableIndex => &$table) {
            $tableId = (string)($table['id'] ?? '');
            if ($tableId === '') {
                $tableId = 'tbl_' . substr(md5((string)($table['name'] ?? 'table_' . $tableIndex)), 0, 10);
                $table['id'] = $tableId;
            }
            $tableIndexMap[$tableId] = $tableIndex;
            $table['columns'] = array_values(is_array($table['columns'] ?? null) ? $table['columns'] : []);

            $pkOrder = 1;
            foreach ($table['columns'] as $columnIndex => &$column) {
                $columnId = (string)($column['id'] ?? '');
                if ($columnId === '') {
                    $columnId = 'col_' . substr(md5($tableId . '.' . (string)($column['name'] ?? 'column_' . $columnIndex)), 0, 10);
                    $column['id'] = $columnId;
                }
                $columnIndexMap[$columnId] = ['table' => $tableIndex, 'column' => $columnIndex];
                if (!empty($column['primary_key'])) {
                    $column['pk_order'] = $pkOrder++;
                    $column['nullable'] = false;
                } else {
                    $column['pk_order'] = null;
                }
            }
            unset($column);
        }
        unset($table);

        foreach ($relations as $relationIndex => $relation) {
            if (!is_array($relation)) {
                continue;
            }
            $fromTableId = (string)($relation['from_table_id'] ?? '');
            $fromColId = (string)($relation['from_col_id'] ?? '');
            $toTableId = (string)($relation['to_table_id'] ?? '');
            $toColId = (string)($relation['to_col_id'] ?? '');
            $sourceKey = $fromTableId . '.' . $fromColId;

            if (!isset($tableIndexMap[$fromTableId], $tableIndexMap[$toTableId], $columnIndexMap[$fromColId], $columnIndexMap[$toColId])) {
                continue;
            }
            if (isset($relationBySource[$sourceKey])) {
                continue;
            }

            $normalizedRelations[] = [
                'id' => (string)($relation['id'] ?? ('rel_' . substr(md5($sourceKey . '>' . $toTableId . '.' . $toColId), 0, 10))),
                'from_table_id' => $fromTableId,
                'from_col_id' => $fromColId,
                'to_table_id' => $toTableId,
                'to_col_id' => $toColId,
                'name' => (string)($relation['name'] ?? ('fk_' . $fromColId)),
                'on_delete' => (string)($relation['on_delete'] ?? 'RESTRICT'),
                'on_update' => (string)($relation['on_update'] ?? 'CASCADE'),
                'nullable' => (bool)($tables[$columnIndexMap[$fromColId]['table']]['columns'][$columnIndexMap[$fromColId]['column']]['nullable'] ?? true),
                'edge' => is_array($relation['edge'] ?? null) ? $relation['edge'] : ['type' => 'orthogonal', 'waypoints' => []],
            ];
            $relationBySource[$sourceKey] = count($normalizedRelations) - 1;
        }

        foreach ($tables as $tableIndex => &$table) {
            foreach ($table['columns'] as $columnIndex => &$column) {
                $sourceKey = (string)$table['id'] . '.' . (string)$column['id'];
                $existingFk = is_array($column['foreign_key'] ?? null) ? $column['foreign_key'] : null;

                if (isset($relationBySource[$sourceKey])) {
                    $relation = $normalizedRelations[$relationBySource[$sourceKey]];
                    $column['foreign_key'] = [
                        'ref_table_id' => $relation['to_table_id'],
                        'ref_col_id' => $relation['to_col_id'],
                        'on_delete' => $relation['on_delete'],
                        'on_update' => $relation['on_update'],
                        'constraint_name' => $relation['name'],
                        'deferrable' => (bool)($existingFk['deferrable'] ?? false),
                    ];
                    continue;
                }

                if ($existingFk && isset($tableIndexMap[(string)($existingFk['ref_table_id'] ?? '')], $columnIndexMap[(string)($existingFk['ref_col_id'] ?? '')])) {
                    $normalizedRelations[] = [
                        'id' => 'rel_' . substr(md5($sourceKey . '>' . (string)$existingFk['ref_table_id'] . '.' . (string)$existingFk['ref_col_id']), 0, 10),
                        'from_table_id' => (string)$table['id'],
                        'from_col_id' => (string)$column['id'],
                        'to_table_id' => (string)$existingFk['ref_table_id'],
                        'to_col_id' => (string)$existingFk['ref_col_id'],
                        'name' => (string)($existingFk['constraint_name'] ?? ('fk_' . ((string)$table['name'] ?: 'table') . '_' . ((string)$column['name'] ?: 'column'))),
                        'on_delete' => (string)($existingFk['on_delete'] ?? 'RESTRICT'),
                        'on_update' => (string)($existingFk['on_update'] ?? 'CASCADE'),
                        'nullable' => (bool)($column['nullable'] ?? true),
                        'edge' => ['type' => 'orthogonal', 'waypoints' => []],
                    ];
                    $relationBySource[$sourceKey] = count($normalizedRelations) - 1;
                    $column['foreign_key'] = [
                        'ref_table_id' => (string)$existingFk['ref_table_id'],
                        'ref_col_id' => (string)$existingFk['ref_col_id'],
                        'on_delete' => (string)($existingFk['on_delete'] ?? 'RESTRICT'),
                        'on_update' => (string)($existingFk['on_update'] ?? 'CASCADE'),
                        'constraint_name' => (string)($existingFk['constraint_name'] ?? ('fk_' . ((string)$table['name'] ?: 'table') . '_' . ((string)$column['name'] ?: 'column'))),
                        'deferrable' => (bool)($existingFk['deferrable'] ?? false),
                    ];
                    continue;
                }

                $column['foreign_key'] = null;
            }
            unset($column);
        }
        unset($table);

        $schema['tables'] = $tables;
        $schema['relations'] = array_values($normalizedRelations);

        return $schema;
    }

    private function normalizeFieldList($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(static function ($item): string {
                return trim((string)$item);
            }, $value), static function (string $item): bool {
                return $item !== '';
            }));
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map(static function (string $item): string {
                return trim($item);
            }, explode(',', $value)), static function (string $item): bool {
                return $item !== '';
            }));
        }

        if (is_scalar($value)) {
            $single = trim((string)$value);
            return $single === '' ? [] : [$single];
        }

        return [];
    }

    private function db(): PDO
    {
        return Connection::getInstance()->getPdo();
    }

    private function safeIdentifier(string $value, string $fallback = ''): string
    {
        $value = trim($value);
        if ($value !== '' && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $value)) {
            return $value;
        }
        return $fallback;
    }

    private function quoteIdentifier(string $value): string
    {
        $safe = $this->safeIdentifier($value);
        if ($safe === '') {
            throw new RuntimeException('invalid_identifier');
        }
        return '"' . str_replace('"', '""', $safe) . '"';
    }

    private function buildSampleRow(array $columns): array
    {
        $row = [];
        foreach ($columns as $index => $column) {
            $name = (string)($column['column_name'] ?? '');
            $type = (string)($column['data_type'] ?? '');
            if ($name === '') {
                continue;
            }
            $row[$name] = $this->sampleValueForColumn($name, $type, (int)$index);
        }
        return $row;
    }

    private function primaryKeyColumns(PDO $pdo, string $schema, string $table): array
    {
        $stmt = $pdo->prepare("
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            INNER JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
               AND tc.table_name = kcu.table_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = :schema
              AND tc.table_name = :table
            ORDER BY kcu.ordinal_position
        ");
        $stmt->execute([
            ':schema' => $schema,
            ':table' => $table,
        ]);
        return array_values(array_filter(array_map(static function ($row): string {
            return trim((string)($row['column_name'] ?? ''));
        }, $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []), static function (string $item): bool {
            return $item !== '';
        }));
    }

    private function tableColumnMetadata(PDO $pdo, string $schema, string $table): array
    {
        $stmt = $pdo->prepare("
            SELECT
                column_name,
                data_type,
                udt_name,
                is_nullable,
                column_default,
                ordinal_position,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                is_identity,
                is_generated
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :table
            ORDER BY ordinal_position
        ");
        $stmt->execute([
            ':schema' => $schema,
            ':table' => $table,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function normalizeRowInputValue($value, array $column)
    {
        $dataType = strtolower((string)($column['data_type'] ?? 'text'));

        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            return $value;
        }

        $stringValue = is_scalar($value) ? (string)$value : '';

        if ($dataType === 'boolean') {
            $lower = strtolower(trim($stringValue));
            if (in_array($lower, ['1', 'true', 't', 'yes', 'y', 'on'], true)) {
                return true;
            }
            if (in_array($lower, ['0', 'false', 'f', 'no', 'n', 'off'], true)) {
                return false;
            }
        }

        return $stringValue;
    }

    private function sampleValueForColumn(string $columnName, string $dataType, int $index)
    {
        $name = strtolower($columnName);
        $type = strtolower($dataType);
        $seq  = $index + 1;

        if (strpos($name, 'email') !== false) {
            return 'sample' . $seq . '@hesem.local';
        }
        if (strpos($name, 'phone') !== false) {
            return '0900000' . str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        }
        if (strpos($name, 'code') !== false) {
            return strtoupper(substr(preg_replace('/[^a-z0-9]+/i', '_', $columnName), 0, 12)) . '_' . str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        }
        if (strpos($name, 'name') !== false) {
            return 'Mẫu ' . str_replace('_', ' ', $columnName) . ' ' . $seq;
        }
        if (strpos($name, 'status') !== false) {
            return 'active';
        }
        if (strpos($name, 'description') !== false || strpos($name, 'comment') !== false || strpos($name, 'note') !== false) {
            return 'Dữ liệu mẫu cho ' . $columnName;
        }

        switch ($type) {
            case 'smallint':
            case 'integer':
            case 'bigint':
                return $seq;
            case 'numeric':
            case 'decimal':
            case 'real':
            case 'double precision':
            case 'money':
                return number_format(100 + ($seq * 1.25), 2, '.', '');
            case 'boolean':
                return true;
            case 'date':
                return gmdate('Y-m-d');
            case 'time without time zone':
            case 'time with time zone':
                return gmdate('H:i:s');
            case 'timestamp without time zone':
                return gmdate('Y-m-d H:i:s');
            case 'timestamp with time zone':
                return gmdate(DATE_ATOM);
            case 'json':
            case 'jsonb':
                return [
                    'sample' => true,
                    'column' => $columnName,
                    'index' => $seq,
                ];
            case 'uuid':
                return sprintf(
                    '00000000-0000-0000-0000-%012d',
                    $seq
                );
            case 'array':
                return ['sample_' . $seq];
            default:
                if (strpos($name, 'id') !== false) {
                    return 'sample_' . $columnName . '_' . $seq;
                }
                return 'sample_' . $columnName . '_' . $seq;
        }
    }

    public function listDesigns(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $designs = [];
        foreach (glob($this->designDir . '/*.json') ?: [] as $file) {
            $data = $this->readJsonFile($file);
            if (!$data) {
                continue;
            }
            $designs[] = [
                'id' => (string)($data['_meta']['id'] ?? basename($file, '.json')),
                'name' => (string)($data['_meta']['name'] ?? basename($file, '.json')),
                'version' => (string)($data['_meta']['version'] ?? '1.0.0'),
                'updatedAt' => (string)($data['_meta']['updatedAt'] ?? ''),
                'author' => (string)($data['_meta']['author'] ?? ''),
                'tableCount' => count($data['tables'] ?? []),
            ];
        }
        usort($designs, static fn(array $a, array $b): int => strcmp((string)$b['updatedAt'], (string)$a['updatedAt']));
        $this->success(['designs' => $designs]);
    }

    public function getDesign(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $id = $this->input('id', '') ?? '';
        if ($id === '') {
            $this->error('missing_id', 400);
        }
        $schema = $this->readJsonFile($this->designPath($id));
        if (!$schema) {
            $this->error('not_found', 404);
        }
        $baseline = $this->readJsonFile($this->baselinePath($id));
        $this->success(['schema' => $schema, 'baseline' => $baseline]);
    }

    public function saveDesign(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        if (!is_array($schema) || !isset($schema['_meta'])) {
            $this->error('invalid_schema', 400);
        }
        $schema = $this->reconcileSchemaDocument($schema);
        $schema['_meta']['id'] = $this->safeId((string)($schema['_meta']['id'] ?? ''));
        $schema['_meta']['updatedAt'] = $this->nowIso();
        $schema['_meta']['author'] = (string)($user['username'] ?? 'system');
        $this->writeJsonFile($this->designPath((string)$schema['_meta']['id']), $schema);
        $this->auditLog('schema_studio_save', ['design_id' => $schema['_meta']['id']], (string)($user['username'] ?? ''));
        $this->success(['id' => $schema['_meta']['id'], 'savedAt' => $schema['_meta']['updatedAt']]);
    }

    public function deleteDesign(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $id = $this->input('id', '') ?? '';
        if ($id === '') {
            $this->error('missing_id', 400);
        }
        $path = $this->designPath($id);
        if (is_file($path)) {
            @unlink($path);
        }
        $baseline = $this->baselinePath($id);
        if (is_file($baseline)) {
            @unlink($baseline);
        }
        $this->auditLog('schema_studio_delete', ['design_id' => $id], (string)($user['username'] ?? ''));
        $this->success(['deleted' => true]);
    }

    public function setBaseline(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? ''));
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : null;
        if ($designId === '' || !$schema) {
            $this->error('missing_payload', 400);
        }
        $schema = $this->reconcileSchemaDocument($schema);
        $this->writeJsonFile($this->baselinePath($designId), $schema);
        $this->auditLog('schema_studio_set_baseline', ['design_id' => $designId], (string)($user['username'] ?? ''));
        $this->success(['baselineAt' => $this->nowIso()]);
    }

    public function loadFromRegistry(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $registryPath = $this->dataDir . '/registry/table-registry.json';
        $relationPath = $this->dataDir . '/registry/relation-map.json';
        $domainPath = $this->dataDir . '/registry/domain-architecture.json';
        $tableRegistry = $this->readJsonFile($registryPath) ?? [];
        $relationMap = $this->readJsonFile($relationPath) ?? [];
        $domainArch = $this->readJsonFile($domainPath) ?? [];

        $domainMap = [];
        foreach (($domainArch['domains'] ?? []) as $domainKey => $domainDef) {
            $tables = is_array($domainDef['tables'] ?? null) ? $domainDef['tables'] : [];
            foreach ($tables as $tableName) {
                $domainMap[(string)$tableName] = (string)$domainKey;
            }
        }

        $schema = [
            '_meta' => [
                'id' => 'registry_' . gmdate('Ymd_His'),
                'name' => 'Registry Import',
                'version' => '1.0.0',
                'description' => 'Imported from qms-data/registry',
                'source' => 'registry',
                'validation_profile' => 'logical_registry',
                'createdAt' => $this->nowIso(),
                'updatedAt' => $this->nowIso(),
                'author' => 'registry',
            ],
            'enums' => [],
            'tables' => [],
            'relations' => [],
            'groups' => [],
            'notes' => [],
        ];

        $tableMap = [];
        $colMap = [];
        $columnIndexMap = [];
        $tables = $tableRegistry['tables'] ?? [];
        $tableIndex = 0;
        foreach ($tables as $tableName => $tableDef) {
            if (!is_string($tableName) || !is_array($tableDef)) {
                continue;
            }
            $tableId = 'tbl_' . substr(md5($tableName), 0, 10);
            $tableMap[$tableName] = $tableId;
            $columns = [];
            $rawColumns = $tableDef['columns'] ?? [];
            $pkFields = $this->normalizeFieldList($tableDef['primaryKey'] ?? ($tableDef['primaryKeys'] ?? []));
            foreach ($rawColumns as $columnName => $columnDef) {
                $name = is_string($columnName) ? $columnName : (is_array($columnDef) ? (string)($columnDef['name'] ?? '') : (string)$columnDef);
                if ($name === '') {
                    continue;
                }
                $colId = 'col_' . substr(md5($tableName . '.' . $name), 0, 10);
                $colMap[$tableName . '.' . $name] = $colId;
                $isIdentifier = $this->endsWith($name, '_id') || $name === 'id';
                $type = is_array($columnDef) ? (string)($columnDef['type'] ?? ($isIdentifier ? 'uuid' : 'varchar')) : ($isIdentifier ? 'uuid' : 'varchar');
                $isPk = !empty($pkFields) ? in_array($name, $pkFields, true) : $name === 'id';
                $pkOrder = $isPk ? array_search($name, $pkFields, true) : false;
                $required = is_array($columnDef) && array_key_exists('required', $columnDef) ? (bool)$columnDef['required'] : null;
                $defaultVal = is_array($columnDef) && array_key_exists('default', $columnDef) ? $columnDef['default'] : null;
                $columns[] = [
                    'id' => $colId,
                    'name' => $name,
                    'type' => $type,
                    'length' => null,
                    'scale' => null,
                    'is_array' => false,
                    'nullable' => $required === null ? !in_array($name, ['id', 'created_at'], true) : !$required,
                    'unique' => is_array($columnDef) ? (bool)($columnDef['unique'] ?? false) : false,
                    'primary_key' => $isPk,
                    'pk_order' => $isPk ? (($pkOrder === false ? 0 : (int)$pkOrder) + 1) : null,
                    'default_val' => $defaultVal !== null ? (string)$defaultVal : ($isPk && $type === 'UUID' ? 'uuid_generate_v4()' : (($name === 'created_at' || $name === 'updated_at') ? 'now()' : null)),
                    'check_expr' => null,
                    'generated_expr' => null,
                    'generated_stored' => false,
                    'comment' => is_array($columnDef) ? (string)($columnDef['description'] ?? $columnDef['label'] ?? $columnDef['comment'] ?? '') : '',
                    'foreign_key' => null,
                ];
                $columnIndexMap[$colId] = ['table' => $tableIndex, 'column' => count($columns) - 1];
            }
            $schema['tables'][] = [
                'id' => $tableId,
                'name' => $tableName,
                'schema' => 'public',
                'comment' => (string)($tableDef['description'] ?? $tableDef['comment'] ?? ''),
                'domain' => (string)($domainMap[$tableName] ?? $tableDef['domain'] ?? 'default'),
                'color' => null,
                'tags' => [],
                'rls_enabled' => false,
                'canvas' => [
                    'x' => 80 + (($tableIndex % 5) * 300),
                    'y' => 80 + ((int)floor($tableIndex / 5) * 240),
                    'width' => 260,
                    'collapsed' => true,
                ],
                'columns' => $columns,
                'indexes' => [],
                'check_constraints' => [],
                'triggers' => [],
            ];
            $tableIndex++;
        }

        $edges = [];
        if (is_array($relationMap['edges'] ?? null)) {
            $edges = $relationMap['edges'];
        } elseif (is_array($relationMap['relations'] ?? null)) {
            $edges = $relationMap['relations'];
        } elseif (is_array($relationMap)) {
            $edges = $relationMap;
        }

        foreach ($edges as $edge) {
            $fromTable = is_scalar($edge['from']['entity'] ?? null) ? trim((string)$edge['from']['entity']) : '';
            $toTable = is_scalar($edge['to']['entity'] ?? null) ? trim((string)$edge['to']['entity']) : '';
            $fromFields = $this->normalizeFieldList($edge['from']['field'] ?? '');
            $toFields = $this->normalizeFieldList($edge['to']['field'] ?? 'id');
            $fromTableId = $tableMap[$fromTable] ?? null;
            $toTableId = $tableMap[$toTable] ?? null;
            if (!$fromTableId || !$toTableId || empty($fromFields) || empty($toFields)) {
                continue;
            }

            $pairCount = min(count($fromFields), count($toFields));
            $onDelete = is_scalar($edge['cascadeActions']['delete'] ?? null) ? trim((string)$edge['cascadeActions']['delete']) : 'RESTRICT';
            $onUpdate = is_scalar($edge['cascadeActions']['update'] ?? null) ? trim((string)$edge['cascadeActions']['update']) : 'CASCADE';
            if ($onDelete === '') {
                $onDelete = 'RESTRICT';
            }
            if ($onUpdate === '') {
                $onUpdate = 'CASCADE';
            }

            for ($pairIndex = 0; $pairIndex < $pairCount; $pairIndex++) {
                $fromCol = $fromFields[$pairIndex] ?? '';
                $toCol = $toFields[$pairIndex] ?? 'id';
                if ($fromCol === '' || $toCol === '') {
                    continue;
                }

                $fromColId = $colMap[$fromTable . '.' . $fromCol] ?? null;
                $toColId = $colMap[$toTable . '.' . $toCol] ?? null;
                if (!$fromColId || !$toColId) {
                    continue;
                }

                $sourceColumnRef = $columnIndexMap[$fromColId] ?? null;
                $sourceNullable = true;
                if ($sourceColumnRef) {
                    $sourceNullable = (bool)($schema['tables'][$sourceColumnRef['table']]['columns'][$sourceColumnRef['column']]['nullable'] ?? true);
                }

                $suffix = $pairCount > 1 ? '_' . ($pairIndex + 1) : '';
                $schema['relations'][] = [
                    'id' => 'rel_' . substr(md5($fromTable . '.' . $fromCol . '>' . $toTable . '.' . $toCol), 0, 10),
                    'from_table_id' => $fromTableId,
                    'from_col_id' => $fromColId,
                    'to_table_id' => $toTableId,
                    'to_col_id' => $toColId,
                    'name' => 'fk_' . $fromTable . '_' . $fromCol . $suffix,
                    'on_delete' => $onDelete,
                    'on_update' => $onUpdate,
                    'nullable' => $sourceNullable,
                    'edge' => ['type' => 'orthogonal', 'waypoints' => []],
                ];

                if ($sourceColumnRef) {
                    $schema['tables'][$sourceColumnRef['table']]['columns'][$sourceColumnRef['column']]['foreign_key'] = [
                        'ref_table_id' => $toTableId,
                        'ref_col_id' => $toColId,
                        'constraint_name' => 'fk_' . $fromTable . '_' . $fromCol . $suffix,
                        'on_delete' => $onDelete,
                        'on_update' => $onUpdate,
                        'deferrable' => false,
                    ];
                }
            }
        }

        foreach ($schema['tables'] as &$table) {
            foreach ($table['columns'] as &$column) {
                foreach ($schema['relations'] as $relation) {
                    if ($relation['from_table_id'] === $table['id'] && $relation['from_col_id'] === $column['id']) {
                        $column['foreign_key'] = [
                            'ref_table_id' => $relation['to_table_id'],
                            'ref_col_id' => $relation['to_col_id'],
                            'on_delete' => $relation['on_delete'],
                            'on_update' => $relation['on_update'],
                            'constraint_name' => $relation['name'],
                            'deferrable' => false,
                        ];
                        break;
                    }
                }
            }
        }
        unset($table, $column);

        $this->success(['schema' => $schema]);
    }

    public function reverseEngineer(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        try {
            $pdo = $this->db();
            $tables = $pdo->query("
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_type='BASE TABLE'
                  AND table_schema NOT IN ('pg_catalog','information_schema','pg_toast')
                ORDER BY table_schema, table_name
            ")->fetchAll(PDO::FETCH_ASSOC);
            $columns = $pdo->query("
                SELECT table_schema, table_name, column_name, data_type, udt_name,
                       character_maximum_length, numeric_scale, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema NOT IN ('pg_catalog','information_schema','pg_toast')
                ORDER BY table_schema, table_name, ordinal_position
            ")->fetchAll(PDO::FETCH_ASSOC);
            $fks = $pdo->query("
                SELECT tc.constraint_name, kcu.table_schema, kcu.table_name, kcu.column_name,
                       ccu.table_schema AS ref_table_schema, ccu.table_name AS ref_table_name, ccu.column_name AS ref_column_name,
                       rc.update_rule, rc.delete_rule
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.referential_constraints rc
                  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
            ")->fetchAll(PDO::FETCH_ASSOC);
            $pkRows = $pdo->query("
                SELECT kcu.table_schema, kcu.table_name, kcu.column_name, kcu.ordinal_position
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type='PRIMARY KEY'
            ")->fetchAll(PDO::FETCH_ASSOC);

            $pkMap = [];
            foreach ($pkRows as $pk) {
                $pkMap[$pk['table_schema'] . '.' . $pk['table_name']][$pk['column_name']] = (int)$pk['ordinal_position'];
            }

            $schema = [
                '_meta' => [
                    'id' => 'live_' . gmdate('Ymd_His'),
                    'name' => 'Live DB ' . gmdate('Y-m-d H:i'),
                    'version' => '1.0.0',
                    'description' => 'Reverse engineered from PostgreSQL',
                    'createdAt' => $this->nowIso(),
                    'updatedAt' => $this->nowIso(),
                    'author' => (string)($user['username'] ?? 'system'),
                ],
                'enums' => [],
                'tables' => [],
                'relations' => [],
                'groups' => [],
                'notes' => [],
            ];
            $tableMap = [];
            $colMap = [];
            $index = 0;
            foreach ($tables as $tbl) {
                $key = $tbl['table_schema'] . '.' . $tbl['table_name'];
                $tableId = 'tbl_' . substr(md5($key), 0, 10);
                $tableMap[$key] = $tableId;
                $tableColumns = [];
                foreach ($columns as $col) {
                    if ($col['table_schema'] !== $tbl['table_schema'] || $col['table_name'] !== $tbl['table_name']) {
                        continue;
                    }
                    $colId = 'col_' . substr(md5($key . '.' . $col['column_name']), 0, 10);
                    $colMap[$key . '.' . $col['column_name']] = $colId;
                    $isPk = isset($pkMap[$key][$col['column_name']]);
                    $tableColumns[] = [
                        'id' => $colId,
                        'name' => $col['column_name'],
                        'type' => $col['udt_name'] === 'varchar' ? 'varchar' : $col['udt_name'],
                        'length' => $col['character_maximum_length'] ? (int)$col['character_maximum_length'] : null,
                        'scale' => $col['numeric_scale'] ? (int)$col['numeric_scale'] : null,
                        'is_array' => strpos((string)$col['data_type'], 'ARRAY') === 0,
                        'nullable' => $col['is_nullable'] === 'YES',
                        'unique' => false,
                        'primary_key' => $isPk,
                        'pk_order' => $isPk ? (int)($pkMap[$key][$col['column_name']] ?? 1) : null,
                        'default_val' => $col['column_default'],
                        'check_expr' => null,
                        'generated_expr' => null,
                        'generated_stored' => false,
                        'comment' => '',
                        'foreign_key' => null,
                    ];
                }
                $schema['tables'][] = [
                    'id' => $tableId,
                    'name' => $tbl['table_name'],
                    'schema' => $tbl['table_schema'],
                    'comment' => '',
                    'domain' => 'default',
                    'color' => null,
                    'tags' => [],
                    'rls_enabled' => false,
                    'canvas' => [
                        'x' => 80 + (($index % 4) * 320),
                        'y' => 80 + ((int)floor($index / 4) * 240),
                        'width' => 260,
                        'collapsed' => true,
                    ],
                    'columns' => $tableColumns,
                    'indexes' => [],
                    'check_constraints' => [],
                    'triggers' => [],
                ];
                $index++;
            }

            foreach ($fks as $fk) {
                $fromKey = $fk['table_schema'] . '.' . $fk['table_name'];
                $toKey = $fk['ref_table_schema'] . '.' . $fk['ref_table_name'];
                $fromTableId = $tableMap[$fromKey] ?? null;
                $toTableId = $tableMap[$toKey] ?? null;
                $fromColId = $colMap[$fromKey . '.' . $fk['column_name']] ?? null;
                $toColId = $colMap[$toKey . '.' . $fk['ref_column_name']] ?? null;
                if (!$fromTableId || !$toTableId || !$fromColId || !$toColId) {
                    continue;
                }
                $schema['relations'][] = [
                    'id' => 'rel_' . substr(md5($fk['constraint_name']), 0, 10),
                    'from_table_id' => $fromTableId,
                    'from_col_id' => $fromColId,
                    'to_table_id' => $toTableId,
                    'to_col_id' => $toColId,
                    'name' => $fk['constraint_name'],
                    'on_delete' => (string)($fk['delete_rule'] ?? 'NO ACTION'),
                    'on_update' => (string)($fk['update_rule'] ?? 'NO ACTION'),
                    'nullable' => true,
                    'edge' => ['type' => 'orthogonal', 'waypoints' => []],
                ];
            }

            foreach ($schema['tables'] as &$table) {
                foreach ($table['columns'] as &$column) {
                    foreach ($schema['relations'] as $relation) {
                        if ($relation['from_table_id'] === $table['id'] && $relation['from_col_id'] === $column['id']) {
                            $column['foreign_key'] = [
                                'ref_table_id' => $relation['to_table_id'],
                                'ref_col_id' => $relation['to_col_id'],
                                'on_delete' => $relation['on_delete'],
                                'on_update' => $relation['on_update'],
                                'constraint_name' => $relation['name'],
                                'deferrable' => false,
                            ];
                            break;
                        }
                    }
                }
            }
            unset($table, $column);

            $this->auditLog('schema_studio_reverse_engineer', ['table_count' => count($schema['tables'])], (string)($user['username'] ?? ''));
            $this->success(['schema' => $schema]);
        } catch (Throwable $e) {
            error_log('[SchemaStudio] reverseEngineer failed: ' . $e->getMessage());
            $this->error('reverse_engineer_failed', 500, 'Database introspection failed');
        }
    }

    public function validateSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        $issues = [];
        foreach (($schema['tables'] ?? []) as $table) {
            if (!array_filter($table['columns'] ?? [], static fn(array $column): bool => (bool)($column['primary_key'] ?? false))) {
                $issues[] = ['level' => 'error', 'code' => 'E01', 'table' => $table['name'] ?? ''];
            }
        }
        $this->success(['issues' => $issues, 'count' => count($issues)]);
    }

    public function applyMigration(): never
    {
        $user = $this->requireAuth();
        $this->requireMigrationAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $sql = trim((string)($body['sql'] ?? ''));
        if ($sql === '') {
            $this->error('missing_sql', 400);
        }
        $forbiddenStatement = $this->forbiddenMigrationStatement($sql);
        if ($forbiddenStatement !== null) {
            $this->error('forbidden_migration_statement', 400, null, [
                'statement' => $forbiddenStatement,
            ]);
        }
        $destructive = (bool)preg_match('/\bDROP\s+(TABLE|COLUMN|TYPE|INDEX|VIEW|SEQUENCE|SCHEMA)\b/i', $sql);
        $allowDestructive = (bool)($body['allow_destructive'] ?? false);
        $confirmToken = (string)($body['confirm_destructive'] ?? '');
        if ($destructive && (!$allowDestructive || $confirmToken !== $this->destructiveConfirmToken($user))) {
            $this->error('destructive_requires_confirmation', 400, null, [
                'requires_confirm' => true,
                'confirm_format' => 'CONFIRMED_DESTRUCTIVE_{user_id}',
            ]);
        }
        $sql = preg_replace('/^\s*BEGIN\s*;\s*/i', '', $sql) ?? $sql;
        $sql = preg_replace('/\s*COMMIT\s*;\s*$/i', '', $sql) ?? $sql;
        try {
            $pdo = $this->db();
            $pdo->beginTransaction();
            $pdo->exec($sql);
            $pdo->commit();
            $this->auditLog('schema_studio_apply_migration', [
                'design_id' => (string)($body['design_id'] ?? ''),
                'sql_length' => strlen($sql),
                'destructive' => $destructive,
            ], (string)($user['username'] ?? ''));
            $this->success(['appliedAt' => $this->nowIso()]);
        } catch (Throwable $e) {
            try {
                $pdo = $this->db();
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
            } catch (Throwable $ignored) {
            }
            error_log('[SchemaStudio] applyMigration failed: ' . $e->getMessage());
            $this->error('migration_failed', 500, 'Migration execution failed');
        }
    }

    public function previewTableData(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $schema = $this->safeIdentifier((string)($body['schema'] ?? 'public'), 'public');
        $table = $this->safeIdentifier((string)($body['table'] ?? ''), '');
        $limit = (int)($body['limit'] ?? 12);
        $limit = max(1, min(500, $limit));
        $offset = max(0, (int)($body['offset'] ?? 0));

        if ($table === '') {
            $this->error('missing_table', 400);
        }

        $columns = [];

        try {
            $pdo = $this->db();
            $columns = $this->tableColumnMetadata($pdo, $schema, $table);
            $primaryKeyColumns = $this->primaryKeyColumns($pdo, $schema, $table);

            if (!$columns) {
                $this->success([
                    'available' => false,
                    'schema' => $schema,
                    'table' => $table,
                    'columns' => [],
                    'rows' => [],
                    'primaryKeyColumns' => [],
                    'totalRows' => 0,
                    'offset' => $offset,
                    'hasMore' => false,
                    'message' => 'table_not_found',
                ]);
            }

            $countSql = 'SELECT COUNT(*) FROM ' . $this->quoteIdentifier($schema) . '.' . $this->quoteIdentifier($table);
            $totalRows = (int)$pdo->query($countSql)->fetchColumn();
            $orderBy = '';
            if ($primaryKeyColumns !== []) {
                $orderBy = ' ORDER BY ' . implode(', ', array_map(function (string $column): string {
                    return $this->quoteIdentifier($column);
                }, $primaryKeyColumns));
            }

            $sql = 'SELECT * FROM ' . $this->quoteIdentifier($schema) . '.' . $this->quoteIdentifier($table) . $orderBy . ' LIMIT ' . $limit . ' OFFSET ' . $offset;
            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $actualRowCount = count($rows);
            $syntheticSample = false;

            if ($totalRows === 0 && $columns) {
                $rows = [$this->buildSampleRow($columns)];
                $syntheticSample = true;
            }

            $this->success([
                'available' => true,
                'schema' => $schema,
                'table' => $table,
                'columns' => $columns,
                'rows' => $rows,
                'primaryKeyColumns' => $primaryKeyColumns,
                'rowCount' => count($rows),
                'actualRowCount' => $actualRowCount,
                'totalRows' => $totalRows,
                'syntheticSample' => $syntheticSample,
                'limit' => $limit,
                'offset' => $offset,
                'hasMore' => !$syntheticSample && (($offset + $actualRowCount) < $totalRows),
            ]);
        } catch (Throwable $e) {
            error_log('[SchemaStudio] previewTableData failed: ' . $e->getMessage());
            if ($columns) {
                $this->success([
                    'available' => true,
                    'schema' => $schema,
                    'table' => $table,
                    'columns' => $columns,
                    'rows' => [$this->buildSampleRow($columns)],
                    'primaryKeyColumns' => [],
                    'rowCount' => 1,
                    'actualRowCount' => 0,
                    'totalRows' => 0,
                    'syntheticSample' => true,
                    'limit' => $limit,
                    'offset' => 0,
                    'hasMore' => false,
                    'message' => 'preview_sample_only',
                ]);
            }
            $this->success([
                'available' => false,
                'schema' => $schema,
                'table' => $table,
                'columns' => $columns,
                'rows' => [],
                'primaryKeyColumns' => [],
                'totalRows' => 0,
                'offset' => $offset,
                'hasMore' => false,
                'message' => 'preview_unavailable',
            ]);
        }
    }

    public function saveTableRow(): never
    {
        $user = $this->requireAuth();
        $this->requireDataWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $schema = $this->safeIdentifier((string)($body['schema'] ?? 'public'), 'public');
        $table = $this->safeIdentifier((string)($body['table'] ?? ''), '');
        $mode = strtolower((string)($body['mode'] ?? 'insert'));
        $row = is_array($body['row'] ?? null) ? $body['row'] : [];
        $original = is_array($body['original'] ?? null) ? $body['original'] : [];

        if ($table === '') {
            $this->error('missing_table', 400);
        }

        try {
            $pdo = $this->db();
            $columns = $this->tableColumnMetadata($pdo, $schema, $table);
            $primaryKeyColumns = $this->primaryKeyColumns($pdo, $schema, $table);
            $columnMap = [];
            $insertColumns = [];
            $insertParams = [];
            $insertValues = [];
            $updateAssignments = [];
            $updateParams = [];
            $whereClauses = [];
            $rowResult = [];

            if (!$columns) {
                $this->error('table_not_found', 404);
            }

            foreach ($columns as $column) {
                $columnName = (string)($column['column_name'] ?? '');
                if ($columnName !== '') {
                    $columnMap[$columnName] = $column;
                }
            }

            if ($mode === 'update' && $primaryKeyColumns === []) {
                $this->error('table_has_no_primary_key', 400, 'Editing existing rows requires a primary key');
            }

            if ($mode === 'update') {
                foreach ($primaryKeyColumns as $pkColumn) {
                    if (!array_key_exists($pkColumn, $original) && !array_key_exists($pkColumn, $row)) {
                        $this->error('missing_primary_key_value', 400, 'Missing primary key value for row update');
                    }
                    $whereParam = ':where_' . $pkColumn;
                    $whereClauses[] = $this->quoteIdentifier($pkColumn) . ' IS NOT DISTINCT FROM ' . $whereParam;
                    $updateParams[$whereParam] = $this->normalizeRowInputValue($original[$pkColumn] ?? $row[$pkColumn] ?? null, $columnMap[$pkColumn] ?? []);
                }

                foreach ($row as $columnName => $value) {
                    if (!isset($columnMap[$columnName]) || in_array($columnName, $primaryKeyColumns, true)) {
                        continue;
                    }
                    $paramName = ':set_' . $columnName;
                    $updateAssignments[] = $this->quoteIdentifier((string)$columnName) . ' = ' . $paramName;
                    $updateParams[$paramName] = $this->normalizeRowInputValue($value, $columnMap[$columnName]);
                }

                if ($updateAssignments === []) {
                    $this->error('no_row_changes', 400, 'No editable changes found for this row');
                }

                $sql = 'UPDATE '
                    . $this->quoteIdentifier($schema) . '.' . $this->quoteIdentifier($table)
                    . ' SET ' . implode(', ', $updateAssignments)
                    . ' WHERE ' . implode(' AND ', $whereClauses)
                    . ' RETURNING *';

                $stmt = $pdo->prepare($sql);
                $stmt->execute($updateParams);
                $rowResult = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            } else {
                foreach ($row as $columnName => $value) {
                    if (!isset($columnMap[$columnName])) {
                        continue;
                    }

                    $column = $columnMap[$columnName];
                    $isGenerated = strtoupper((string)($column['is_generated'] ?? 'NEVER')) !== 'NEVER';
                    $isIdentity = strtoupper((string)($column['is_identity'] ?? 'NO')) === 'YES';

                    if ($isGenerated) {
                        continue;
                    }
                    if ($isIdentity && ($value === '' || $value === null)) {
                        continue;
                    }
                    if ($value === '' && (($column['column_default'] ?? null) !== null) && !in_array($columnName, $primaryKeyColumns, true)) {
                        continue;
                    }

                    $insertColumns[] = $this->quoteIdentifier((string)$columnName);
                    $paramName = ':ins_' . $columnName;
                    $insertValues[] = $paramName;
                    $insertParams[$paramName] = $this->normalizeRowInputValue($value, $column);
                }

                if ($insertColumns === []) {
                    $sql = 'INSERT INTO '
                        . $this->quoteIdentifier($schema) . '.' . $this->quoteIdentifier($table)
                        . ' DEFAULT VALUES RETURNING *';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute();
                } else {
                    $sql = 'INSERT INTO '
                        . $this->quoteIdentifier($schema) . '.' . $this->quoteIdentifier($table)
                        . ' (' . implode(', ', $insertColumns) . ') VALUES (' . implode(', ', $insertValues) . ') RETURNING *';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($insertParams);
                }
                $rowResult = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            }

            $this->auditLog('schema_studio_table_row_save', [
                'schema' => $schema,
                'table' => $table,
                'mode' => $mode,
            ], (string)($user['username'] ?? ''));

            $this->success([
                'saved' => true,
                'mode' => $mode,
                'schema' => $schema,
                'table' => $table,
                'row' => $rowResult,
                'primaryKeyColumns' => $primaryKeyColumns,
                'columns' => $columns,
            ]);
        } catch (Throwable $e) {
            error_log('[SchemaStudio] saveTableRow failed: ' . $e->getMessage());
            $this->error('row_save_failed', 500, $e->getMessage());
        }
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireExportAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        $payload = json_encode($schema, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            $this->error('export_failed', 500);
        }
        $filename = $this->exportDir . '/schema_export_' . gmdate('Ymd_His') . '.json';
        if (@file_put_contents($filename, $payload) === false) {
            $this->error('export_failed', 500);
        }
        $this->auditLog('schema_studio_export', [
            'filename' => basename($filename),
            'bytes' => strlen($payload),
        ], (string)($user['username'] ?? ''));
        $this->success([
            'filename' => basename($filename),
            'bytes' => strlen($payload),
        ]);
    }
}
