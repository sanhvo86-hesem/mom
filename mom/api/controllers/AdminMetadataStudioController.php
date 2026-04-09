<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\DataSchemaService;

final class AdminMetadataStudioController extends BaseController
{
    private DataSchemaService $service;

    public function __construct(\MOM\Database\DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);
        $this->service = new DataSchemaService($data, $dataDir, $rootDir);
    }

    private function requireWorkspaceAccess(): array
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        return $user;
    }

    private function registryDir(): string
    {
        $dir = $this->dataDir . '/registry';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    private function registryPath(string $name): string
    {
        return $this->registryDir() . '/' . $name . '.json';
    }

    private function configPath(string $file): string
    {
        return $this->confDir . '/' . $file;
    }

    private function slugifyKey(string $value, string $separator = '_'): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9._-]+/', $separator, $value) ?? '';
        $value = preg_replace('/' . preg_quote($separator, '/') . '+/', $separator, $value) ?? '';
        return trim($value, $separator);
    }

    private function dataFieldsIndex(): array
    {
        return $this->readJsonFile($this->registryPath('data-fields')) ?? [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function dataFieldsParts(array $index): array
    {
        $parts = $index['parts'] ?? ($index['_meta']['parts'] ?? []);
        return is_array($parts) ? array_values(array_filter($parts, 'is_array')) : [];
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private function loadDataFieldsEntry(string $endpointKey): ?array
    {
        $index = $this->dataFieldsIndex();
        if (isset($index[$endpointKey]) && is_array($index[$endpointKey])) {
            return array_values((array)$index[$endpointKey]);
        }

        foreach ($this->dataFieldsParts($index) as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            $payload = $this->readJsonFile($this->registryDir() . '/' . $file) ?? [];
            if (isset($payload[$endpointKey]) && is_array($payload[$endpointKey])) {
                return array_values((array)$payload[$endpointKey]);
            }
        }

        return null;
    }

    /**
     * @param list<array<string, mixed>> $fields
     */
    private function saveDataFieldsEntry(string $endpointKey, array $fields): void
    {
        $fields = array_values(array_filter($fields, 'is_array'));
        $indexPath = $this->registryPath('data-fields');
        $index = $this->readJsonFile($indexPath) ?? [];
        $parts = $this->dataFieldsParts($index);

        if (array_key_exists($endpointKey, $index)) {
            unset($index[$endpointKey]);
        }

        $updated = false;
        foreach ($parts as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            $path = $this->registryDir() . '/' . $file;
            $payload = $this->readJsonFile($path) ?? [];
            if (!array_key_exists($endpointKey, $payload)) {
                continue;
            }
            $payload[$endpointKey] = $fields;
            $this->writeJsonFile($path, $payload);
            $updated = true;
            break;
        }

        if (!$updated && $parts !== []) {
            $last = $parts[count($parts) - 1];
            $file = trim((string)($last['file'] ?? ''));
            if ($file !== '') {
                $path = $this->registryDir() . '/' . $file;
                $payload = $this->readJsonFile($path) ?? [];
                $payload[$endpointKey] = $fields;
                $this->writeJsonFile($path, $payload);
                $updated = true;
            }
        }

        if (!$updated) {
            $index[$endpointKey] = $fields;
        }

        $this->writeJsonFile($indexPath, $index);
    }

    private function touchMeta(array &$payload, ?string $countKey = null, ?int $count = null): void
    {
        if (!isset($payload['_meta']) || !is_array($payload['_meta'])) {
            $payload['_meta'] = [];
        }
        $payload['_meta']['generatedAt'] = $this->nowIso();
        if ($countKey !== null && $count !== null) {
            $payload['_meta'][$countKey] = $count;
        }
    }

    private function ensureDomainEntry(array &$tableRegistry, string $domain): void
    {
        if (!isset($tableRegistry['domains']) || !is_array($tableRegistry['domains'])) {
            $tableRegistry['domains'] = [];
        }
        if (isset($tableRegistry['domains'][$domain]) && is_array($tableRegistry['domains'][$domain])) {
            return;
        }

        $label = ucwords(str_replace('_', ' ', $domain));
        $tableRegistry['domains'][$domain] = [
            'label' => $label,
            'labelEn' => $label,
            'icon' => 'fa-database',
            'color' => '#2563eb',
            'description' => '',
            'tables' => [],
            'workflows' => [],
            'relatedDomains' => [],
        ];
    }

    private function syncTableDomainMembership(array &$tableRegistry, string $tableKey, string $domain): void
    {
        if (!isset($tableRegistry['domains']) || !is_array($tableRegistry['domains'])) {
            $tableRegistry['domains'] = [];
        }

        foreach ($tableRegistry['domains'] as $domainKey => $domainMeta) {
            if (!is_array($domainMeta)) {
                continue;
            }
            $tables = array_values(array_filter((array)($domainMeta['tables'] ?? []), static fn(mixed $item): bool => (string)$item !== $tableKey));
            $tableRegistry['domains'][$domainKey]['tables'] = $tables;
        }

        $this->ensureDomainEntry($tableRegistry, $domain);
        $tables = array_values(array_unique(array_merge((array)($tableRegistry['domains'][$domain]['tables'] ?? []), [$tableKey])));
        sort($tables);
        $tableRegistry['domains'][$domain]['tables'] = $tables;
    }

    private function relationEntity(string $tableKey): ?array
    {
        $relationMap = $this->readJsonFile($this->registryPath('relation-map')) ?? [];
        $entities = is_array($relationMap['entities'] ?? null) ? $relationMap['entities'] : [];
        return is_array($entities[$tableKey] ?? null) ? $entities[$tableKey] : null;
    }

    private function synthesizeTableFromRelationEntity(string $tableKey, array $entity): array
    {
        $columns = [];
        foreach ((array)($entity['fields'] ?? []) as $field) {
            if (!is_scalar($field)) {
                continue;
            }
            $name = trim((string)$field);
            if ($name === '') {
                continue;
            }
            $columns[$name] = [
                'type' => 'text',
                'nullable' => true,
            ];
        }

        return [
            'key' => $tableKey,
            'label' => (string)($entity['label'] ?? $this->slugifyKey($tableKey)),
            'labelEn' => (string)($entity['labelEn'] ?? $entity['label'] ?? $tableKey),
            'domain' => (string)($entity['domain'] ?? ''),
            'primaryKey' => (string)($entity['primaryKey'] ?? ''),
            'statusColumn' => (string)($entity['statusField'] ?? ''),
            'workflowId' => (string)($entity['workflowId'] ?? ''),
            'columnCount' => count($columns),
            'supportTable' => (bool)($entity['supportTable'] ?? false),
            'canonical' => false,
            'source' => 'relation-map',
            'columns' => $columns,
        ];
    }

    private function savePolicy(): array
    {
        return [
            'requiresRevision' => true,
            'maxPayloadBytes' => DataSchemaService::DETAIL_SAVE_MAX_BYTES,
            'conflictMode' => 'reject_stale_write',
            'auditTrail' => true,
        ];
    }

    private function ensureSavePayloadLimit(): void
    {
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > DataSchemaService::DETAIL_SAVE_MAX_BYTES) {
            $this->error('payload_too_large', 413, null, [
                'maxBytes' => DataSchemaService::DETAIL_SAVE_MAX_BYTES,
                'save_policy' => $this->savePolicy(),
            ]);
        }
    }

    private function relativeWorkspacePath(string $path): string
    {
        $normalized = str_replace('\\', '/', $path);
        $prefix = rtrim(str_replace('\\', '/', $this->rootDir), '/') . '/';
        if (str_starts_with($normalized, $prefix)) {
            return substr($normalized, strlen($prefix));
        }
        return ltrim($normalized, '/');
    }

    /**
     * @return array<string, mixed>
     */
    private function fileRevision(string $path): array
    {
        clearstatcache(true, $path);
        $exists = is_file($path);
        $size = $exists ? (int)(filesize($path) ?: 0) : 0;
        $mtime = $exists ? (int)(filemtime($path) ?: 0) : 0;

        return [
            'path' => $this->relativeWorkspacePath($path),
            'exists' => $exists,
            'mtime' => $mtime > 0 ? gmdate('c', $mtime) : '',
            'size' => $size,
            'sha1' => $exists ? substr((string)sha1_file($path), 0, 12) : '',
        ];
    }

    private function dataFieldsEntrySourcePath(string $endpointKey): ?string
    {
        $index = $this->dataFieldsIndex();
        if (isset($index[$endpointKey]) && is_array($index[$endpointKey])) {
            return $this->registryPath('data-fields');
        }

        foreach ($this->dataFieldsParts($index) as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            $path = $this->registryDir() . '/' . $file;
            $payload = $this->readJsonFile($path) ?? [];
            if (isset($payload[$endpointKey]) && is_array($payload[$endpointKey])) {
                return $path;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function currentRevision(string $type, string $key): array
    {
        $files = [];
        switch ($type) {
            case 'api':
                $files = [
                    'endpoint_catalog' => $this->fileRevision($this->registryPath('endpoint-catalog')),
                    'api_params' => $this->fileRevision($this->registryPath('api-params')),
                    'data_fields_index' => $this->fileRevision($this->registryPath('data-fields')),
                ];
                $sourcePath = $this->dataFieldsEntrySourcePath($key);
                if (is_string($sourcePath) && $sourcePath !== '') {
                    $files['data_fields_source'] = $this->fileRevision($sourcePath);
                }
                break;
            case 'table':
                $files = [
                    'table_registry' => $this->fileRevision($this->registryPath('table-registry')),
                ];
                break;
            case 'schema':
                $files = [
                    'schema_library' => $this->fileRevision($this->registryPath('schema-library')),
                ];
                break;
            case 'variable':
                $files = [
                    'variable_library' => $this->fileRevision($this->configPath('variable_library.json')),
                ];
                break;
        }

        return [
            'type' => $type,
            'key' => $key,
            'capturedAt' => $this->nowIso(),
            'files' => $files,
        ];
    }

    private function revisionsMatch(array $expected, array $current): bool
    {
        if ((string)($expected['type'] ?? '') !== (string)($current['type'] ?? '')) {
            return false;
        }
        if ((string)($expected['key'] ?? '') !== (string)($current['key'] ?? '')) {
            return false;
        }

        $expectedFiles = is_array($expected['files'] ?? null) ? $expected['files'] : [];
        $currentFiles = is_array($current['files'] ?? null) ? $current['files'] : [];
        if (array_keys($expectedFiles) !== array_keys($currentFiles)) {
            return false;
        }

        foreach ($currentFiles as $name => $currentFile) {
            $expectedFile = is_array($expectedFiles[$name] ?? null) ? $expectedFiles[$name] : null;
            if ($expectedFile === null) {
                return false;
            }
            foreach (['path', 'exists', 'mtime', 'size', 'sha1'] as $field) {
                if (($expectedFile[$field] ?? null) !== ($currentFile[$field] ?? null)) {
                    return false;
                }
            }
        }

        return true;
    }

    private function assertRevisionToken(string $type, string $key, mixed $revision): void
    {
        $current = $this->currentRevision($type, $key);
        if (!is_array($revision)) {
            $this->error('missing_revision_token', 409, 'Reload the detail view before saving.', [
                'current_revision' => $current,
                'save_policy' => $this->savePolicy(),
            ]);
        }

        if (!$this->revisionsMatch($revision, $current)) {
            $this->error('stale_workspace_revision', 409, 'This document changed on the server. Reload detail and re-apply your edit.', [
                'current_revision' => $current,
                'save_policy' => $this->savePolicy(),
            ]);
        }
    }

    public function getSummary(): never
    {
        $this->requireWorkspaceAccess();
        $this->success([
            'workspace' => $this->service->getWorkspace(),
        ]);
    }

    public function getDetail(): never
    {
        $this->requireWorkspaceAccess();

        $type = trim((string)$this->query('type', ''));
        $key = trim((string)$this->query('key', ''));
        if ($type === '' || $key === '') {
            $this->error('missing_type_or_key', 400);
        }

        switch ($type) {
            case 'api': {
                $endpointCatalog = $this->readJsonFile($this->registryPath('endpoint-catalog')) ?? [];
                $endpoint = is_array($endpointCatalog['endpoints'][$key] ?? null) ? $endpointCatalog['endpoints'][$key] : null;
                if ($endpoint === null) {
                    $this->error('api_not_found', 404);
                }
                $apiParams = $this->readJsonFile($this->registryPath('api-params')) ?? [];
                $fields = $this->loadDataFieldsEntry($key) ?? [];
                $this->success([
                    'type' => 'api',
                    'key' => $key,
                    'item' => $endpoint,
                    'api_params' => is_array($apiParams[$key] ?? null)
                        ? $apiParams[$key]
                        : ['params' => [], 'response' => ['type' => 'object', 'fields' => [], 'pagination' => false]],
                    'fields' => $fields,
                    'revision' => $this->currentRevision('api', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'table': {
                $tableRegistry = $this->readJsonFile($this->registryPath('table-registry')) ?? [];
                $table = is_array($tableRegistry['tables'][$key] ?? null) ? $tableRegistry['tables'][$key] : null;
                $relationEntity = $this->relationEntity($key);
                if ($table === null && $relationEntity === null) {
                    $this->error('table_not_found', 404);
                }
                if ($table === null && $relationEntity !== null) {
                    $table = $this->synthesizeTableFromRelationEntity($key, $relationEntity);
                }
                $domainKey = (string)($table['domain'] ?? '');
                $domain = is_array($tableRegistry['domains'][$domainKey] ?? null) ? $tableRegistry['domains'][$domainKey] : null;
                $this->success([
                    'type' => 'table',
                    'key' => $key,
                    'item' => $table,
                    'domain' => $domain,
                    'relation_entity' => $relationEntity,
                    'revision' => $this->currentRevision('table', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'schema': {
                $schemaLibrary = $this->readJsonFile($this->registryPath('schema-library')) ?? [];
                $schema = is_array($schemaLibrary['entities'][$key] ?? null) ? $schemaLibrary['entities'][$key] : null;
                if ($schema === null) {
                    $this->error('schema_not_found', 404);
                }
                $this->success([
                    'type' => 'schema',
                    'key' => $key,
                    'item' => $schema,
                    'revision' => $this->currentRevision('schema', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'variable': {
                $variableLibrary = $this->readJsonFile($this->configPath('variable_library.json')) ?? [];
                $category = is_array($variableLibrary['categories'][$key] ?? null) ? $variableLibrary['categories'][$key] : null;
                if ($category === null) {
                    $this->error('variable_category_not_found', 404);
                }
                $this->success([
                    'type' => 'variable',
                    'key' => $key,
                    'item' => $category,
                    'revision' => $this->currentRevision('variable', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            default:
                $this->error('invalid_type', 400, 'Allowed: api, table, schema, variable');
        }
    }

    public function saveDetail(): never
    {
        $user = $this->requireWorkspaceAccess();
        $this->requireCsrf();
        $this->ensureSavePayloadLimit();

        $body = $this->jsonBody();
        $type = trim((string)($body['type'] ?? ''));
        $key = trim((string)($body['key'] ?? ''));
        $revision = $body['revision'] ?? null;

        switch ($type) {
            case 'api': {
                $item = $body['item'] ?? null;
                $apiParams = $body['api_params'] ?? null;
                $fields = $body['fields'] ?? [];
                if (!is_array($item) || !is_array($apiParams) || !is_array($fields)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = trim((string)($item['action'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_api_key', 400);
                }
                $this->assertRevisionToken('api', $key, $revision);
                foreach (['security', 'request', 'response', 'workflow', 'capabilities'] as $field) {
                    if (array_key_exists($field, $item) && !is_array($item[$field])) {
                        $this->error('invalid_api_' . $field, 400);
                    }
                }
                if (count($fields) > 5000) {
                    $this->error('too_many_fields', 400);
                }

                $catalogPath = $this->registryPath('endpoint-catalog');
                $catalog = $this->readJsonFile($catalogPath) ?? [];
                if (!isset($catalog['endpoints']) || !is_array($catalog['endpoints'])) {
                    $catalog['endpoints'] = [];
                }

                $existing = is_array($catalog['endpoints'][$key] ?? null) ? $catalog['endpoints'][$key] : [];
                $merged = array_merge($existing, $item);
                $merged['action'] = $key;
                $merged['field_count'] = count(array_filter($fields, 'is_array'));
                if (!isset($merged['security']) || !is_array($merged['security'])) {
                    $merged['security'] = [
                        'auth_required' => true,
                        'csrf_required' => false,
                        'admin_only' => false,
                        'permission_keys' => [],
                        'dynamic_permission' => true,
                    ];
                }
                if (!isset($merged['request']) || !is_array($merged['request'])) {
                    $merged['request'] = ['query_params' => [], 'body_fields' => [], 'required_body_fields' => []];
                }
                if (!isset($merged['response']) || !is_array($merged['response'])) {
                    $merged['response'] = ['collection_key' => null, 'response_fields' => [], 'paginated' => false];
                }

                $catalog['endpoints'][$key] = $merged;
                $this->touchMeta($catalog, 'endpointCount', count($catalog['endpoints']));
                $this->writeJsonFile($catalogPath, $catalog);

                $apiParamsPath = $this->registryPath('api-params');
                $paramsDoc = $this->readJsonFile($apiParamsPath) ?? [];
                $paramsDoc[$key] = $apiParams;
                $this->touchMeta($paramsDoc);
                $this->writeJsonFile($apiParamsPath, $paramsDoc);

                $this->saveDataFieldsEntry($key, array_values(array_filter($fields, 'is_array')));

                $this->auditLog('admin_metadata_studio_save_api', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success([
                    'saved' => true,
                    'type' => 'api',
                    'key' => $key,
                    'revision' => $this->currentRevision('api', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'table': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['tableKey'] ?? $item['key'] ?? $item['labelEn'] ?? $item['label'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_table_key', 400);
                }

                $domain = $this->slugifyKey((string)($item['domain'] ?? ''));
                if ($domain === '') {
                    $this->error('missing_domain', 400);
                }
                $this->assertRevisionToken('table', $key, $revision);
                if (array_key_exists('columns', $item) && !is_array($item['columns'])) {
                    $this->error('invalid_table_columns', 400);
                }
                if (array_key_exists('primaryKeys', $item) && !is_array($item['primaryKeys'])) {
                    $this->error('invalid_table_primary_keys', 400);
                }
                if (array_key_exists('primaryKey', $item) && !is_scalar($item['primaryKey']) && !is_array($item['primaryKey'])) {
                    $this->error('invalid_table_primary_key', 400);
                }

                $item['domain'] = $domain;
                $item['columnCount'] = (int)($item['columnCount'] ?? count((array)($item['columns'] ?? [])));

                $tablePath = $this->registryPath('table-registry');
                $tableRegistry = $this->readJsonFile($tablePath) ?? [];
                if (!isset($tableRegistry['tables']) || !is_array($tableRegistry['tables'])) {
                    $tableRegistry['tables'] = [];
                }
                $tableRegistry['tables'][$key] = array_merge(
                    is_array($tableRegistry['tables'][$key] ?? null) ? $tableRegistry['tables'][$key] : [],
                    $item
                );
                $this->syncTableDomainMembership($tableRegistry, $key, $domain);
                $this->touchMeta($tableRegistry, 'tableCount', count($tableRegistry['tables']));
                $tableRegistry['_meta']['domainCount'] = count((array)($tableRegistry['domains'] ?? []));
                $this->writeJsonFile($tablePath, $tableRegistry);

                $this->auditLog('admin_metadata_studio_save_table', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success([
                    'saved' => true,
                    'type' => 'table',
                    'key' => $key,
                    'revision' => $this->currentRevision('table', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'schema': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['key'] ?? $item['label'] ?? $item['description'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_schema_key', 400);
                }
                $this->assertRevisionToken('schema', $key, $revision);
                foreach (['tables', 'migrations'] as $field) {
                    if (array_key_exists($field, $item) && !is_array($item[$field])) {
                        $this->error('invalid_schema_' . $field, 400);
                    }
                }

                $schemaPath = $this->registryPath('schema-library');
                $schemaLibrary = $this->readJsonFile($schemaPath) ?? [];
                if (!isset($schemaLibrary['entities']) || !is_array($schemaLibrary['entities'])) {
                    $schemaLibrary['entities'] = [];
                }
                $schemaLibrary['entities'][$key] = array_merge(
                    is_array($schemaLibrary['entities'][$key] ?? null) ? $schemaLibrary['entities'][$key] : [],
                    $item
                );
                $this->touchMeta($schemaLibrary, 'entityGroups', count($schemaLibrary['entities']));
                $this->writeJsonFile($schemaPath, $schemaLibrary);

                $this->auditLog('admin_metadata_studio_save_schema', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success([
                    'saved' => true,
                    'type' => 'schema',
                    'key' => $key,
                    'revision' => $this->currentRevision('schema', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            case 'variable': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['key'] ?? $item['label'] ?? $item['label_vi'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_variable_category_key', 400);
                }
                $this->assertRevisionToken('variable', $key, $revision);
                if (array_key_exists('variables', $item) && !is_array($item['variables'])) {
                    $this->error('invalid_variable_library', 400);
                }

                $variablePath = $this->configPath('variable_library.json');
                $variableLibrary = $this->readJsonFile($variablePath) ?? [];
                if (!isset($variableLibrary['categories']) || !is_array($variableLibrary['categories'])) {
                    $variableLibrary['categories'] = [];
                }
                $variableLibrary['categories'][$key] = array_merge(
                    is_array($variableLibrary['categories'][$key] ?? null) ? $variableLibrary['categories'][$key] : [],
                    $item
                );
                $variableLibrary['generated'] = $this->nowIso();
                $this->writeJsonFile($variablePath, $variableLibrary);

                $this->auditLog('admin_metadata_studio_save_variable', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success([
                    'saved' => true,
                    'type' => 'variable',
                    'key' => $key,
                    'revision' => $this->currentRevision('variable', $key),
                    'save_policy' => $this->savePolicy(),
                ]);
            }
            default:
                $this->error('invalid_type', 400, 'Allowed: api, table, schema, variable');
        }
    }
}
