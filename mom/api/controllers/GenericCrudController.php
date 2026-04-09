<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\GenericCrudService;
use MOM\Api\Services\MissingScopeContextException;
use MOM\Api\Services\PreconditionRequiredException;
use MOM\Api\Services\RecordConflictException;
use MOM\Api\Services\RecordNotFoundException;
use MOM\Api\Services\WorkflowBridgeRequiredException;
use RuntimeException;
use Throwable;

/**
 * Registry-driven CRUD controller for table actions generated from table-registry.
 */
class GenericCrudController extends BaseController
{
    private ?GenericCrudService $service = null;
    private ?array $endpointCatalog = null;
    private ?array $runtimeAccessPolicy = null;

    private function service(): GenericCrudService
    {
        if ($this->service === null) {
            $this->service = new GenericCrudService($this->dataDir);
        }

        return $this->service;
    }

    /**
     * @return array<int, string>
     */
    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'it_admin',
                'qms_engineer',
                'quality_manager',
                'quality_engineer',
                'qc_inspector',
                'production_manager',
                'production_planner',
                'engineering_manager',
                'supply_chain_manager',
                'buyer',
                'warehouse_clerk',
                'logistics_coordinator',
                'finance_manager',
                'hr_manager',
            ]
        )));
    }

    private function requireGenericWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->writeRoles());
    }

    private function endpointCatalog(): array
    {
        if ($this->endpointCatalog === null) {
            $path = $this->dataDir . '/registry/endpoint-catalog.json';
            $payload = $this->readJsonFile($path) ?? [];
            $this->endpointCatalog = is_array($payload['endpoints'] ?? null) ? $payload['endpoints'] : [];
        }

        return $this->endpointCatalog;
    }

    private function runtimeAccessPolicy(): array
    {
        if ($this->runtimeAccessPolicy === null) {
            $path = $this->dataDir . '/registry/runtime-access-policy.json';
            $payload = $this->readJsonFile($path) ?? [];
            $this->runtimeAccessPolicy = is_array($payload) ? $payload : [];
        }

        return $this->runtimeAccessPolicy;
    }

    /**
     * @return array<int, string>
     */
    private function scopeFieldNames(): array
    {
        return ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'];
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @return array<int, string>
     */
    private function tableScopeFields(array $tableMeta): array
    {
        $columns = (array)($tableMeta['columns'] ?? []);
        return array_values(array_filter($this->scopeFieldNames(), static fn(string $field): bool => array_key_exists($field, $columns)));
    }

    private function isPrivilegedScopeUser(array $user): bool
    {
        return $this->userHasAnyRole($user, array_merge(admin_roles(), ['it_admin', 'ceo']));
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @return array{mode:string, fields:array<int, string>, key:?string}
     */
    private function primaryKeyMeta(array $tableMeta): array
    {
        $columns = array_keys((array)($tableMeta['columns'] ?? []));
        $raw = $tableMeta['primaryKey'] ?? null;
        $values = is_array($raw) ? $raw : [$raw];
        $fields = [];

        foreach ($values as $value) {
            $candidate = trim((string)$value);
            if ($candidate !== '' && in_array($candidate, $columns, true) && !in_array($candidate, $fields, true)) {
                $fields[] = $candidate;
                continue;
            }
            if (preg_match_all('/[A-Za-z_][A-Za-z0-9_]*/', $candidate, $matches) !== false) {
                foreach ((array)($matches[0] ?? []) as $token) {
                    $token = trim((string)$token);
                    if ($token !== '' && in_array($token, $columns, true) && !in_array($token, $fields, true)) {
                        $fields[] = $token;
                        break;
                    }
                }
            }
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
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function resolveIdentity(array $tableMeta, array $body): array
    {
        $pk = $this->primaryKeyMeta($tableMeta);
        if ($pk['mode'] === 'missing' || $pk['fields'] === []) {
            throw new RuntimeException('Table does not define a primary key');
        }

        $identityBody = is_array($body['identity'] ?? null) ? (array)$body['identity'] : [];
        $identity = [];
        foreach ($pk['fields'] as $field) {
            $provided = false;
            $value = $this->query($field);
            if ($value !== null) {
                $provided = true;
            }
            if (!$provided && array_key_exists($field, $body)) {
                $value = $body[$field];
                $provided = true;
            }
            if (!$provided && array_key_exists($field, $identityBody)) {
                $value = $identityBody[$field];
                $provided = true;
            }
            if ($pk['mode'] === 'scalar' && !$provided) {
                $value = $this->query('id');
                if ($value !== null) {
                    $provided = true;
                }
                if (!$provided && array_key_exists('id', $body)) {
                    $value = $body['id'];
                    $provided = true;
                }
                if (!$provided && array_key_exists('id', $identityBody)) {
                    $value = $identityBody['id'];
                    $provided = true;
                }
            }
            if (!$provided) {
                throw new RuntimeException("Missing record identity field: {$field}");
            }
            $identity[$field] = $value;
        }

        return $identity;
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function resolveScope(array $tableMeta, array $user, array $body): array
    {
        $tableColumns = (array)($tableMeta['columns'] ?? []);
        $scopeFields = array_values(array_filter($this->scopeFieldNames(), static fn(string $field): bool => array_key_exists($field, $tableColumns)));
        if ($scopeFields === []) {
            return [];
        }

        $sessionScope = [];
        foreach (['org_scope', 'user_scope'] as $sessionKey) {
            $value = $_SESSION[$sessionKey] ?? null;
            if (!is_array($value)) {
                continue;
            }
            foreach ($scopeFields as $field) {
                if (array_key_exists($field, $value)) {
                    $sessionScope[$field] = $value[$field];
                }
            }
        }

        $userScope = [];
        foreach ($scopeFields as $field) {
            if (array_key_exists($field, $user)) {
                $userScope[$field] = $user[$field];
            }
        }

        $requestScope = [];
        $bodyScope = is_array($body['scope'] ?? null) ? (array)$body['scope'] : [];
        foreach ($scopeFields as $field) {
            $queryValue = $this->query($field);
            if ($queryValue !== null && trim($queryValue) !== '') {
                $requestScope[$field] = $queryValue;
                continue;
            }
            if (array_key_exists($field, $body)) {
                $requestScope[$field] = $body[$field];
                continue;
            }
            if (array_key_exists($field, $bodyScope)) {
                $requestScope[$field] = $bodyScope[$field];
            }
        }

        $merged = $this->isPrivilegedScopeUser($user)
            ? array_merge($sessionScope, $userScope, $requestScope)
            : array_merge($sessionScope, $userScope);

        $scope = [];
        foreach ($scopeFields as $field) {
            if (!array_key_exists($field, $merged) || !is_scalar($merged[$field])) {
                continue;
            }
            $value = trim((string)$merged[$field]);
            if ($value === '') {
                continue;
            }
            $scope[$field] = $value;
        }

        return $scope;
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $body
     */
    private function resolveExpectedRowVersion(array $tableMeta, array $body): ?int
    {
        $columns = (array)($tableMeta['columns'] ?? []);
        if (!array_key_exists('row_version', $columns)) {
            return null;
        }

        $dataBody = is_array($body['data'] ?? null) ? (array)$body['data'] : [];
        $candidates = [
            $this->parseExpectedVersionToken($this->requestHeader('If-Match')),
            $this->parseExpectedVersionToken($this->requestHeader('X-Row-Version')),
            $this->parseExpectedVersionToken($this->query('expected_row_version')),
            $this->parseExpectedVersionToken($this->query('row_version')),
            $this->parseExpectedVersionToken($this->query('version')),
            $this->parseExpectedVersionToken(array_key_exists('expected_row_version', $body) ? $body['expected_row_version'] : null),
            $this->parseExpectedVersionToken(array_key_exists('row_version', $body) ? $body['row_version'] : null),
            $this->parseExpectedVersionToken(array_key_exists('version', $body) ? $body['version'] : null),
            $this->parseExpectedVersionToken(array_key_exists('expectedVersion', $body) ? $body['expectedVersion'] : null),
            $this->parseExpectedVersionToken(array_key_exists('etag', $body) ? $body['etag'] : null),
            $this->parseExpectedVersionToken(array_key_exists('row_version', $dataBody) ? $dataBody['row_version'] : null),
            $this->parseExpectedVersionToken(array_key_exists('expected_row_version', $dataBody) ? $dataBody['expected_row_version'] : null),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate !== null) {
                return $candidate;
            }
        }

        return null;
    }

    private function parseExpectedVersionToken(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_int($value)) {
            return $value >= 0 ? $value : null;
        }
        if (is_float($value)) {
            return $value >= 0 ? (int)$value : null;
        }
        if (!is_scalar($value)) {
            throw new RuntimeException('Invalid row version token');
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (preg_match('/(\d+)/', $text, $matches) !== 1) {
            throw new RuntimeException('Invalid row version token');
        }

        return max(0, (int)$matches[1]);
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $scope
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private function applyScopeToPayload(array $tableMeta, array $payload, array $scope, array $user): array
    {
        $tableColumns = (array)($tableMeta['columns'] ?? []);
        $privileged = $this->isPrivilegedScopeUser($user);
        foreach ($this->scopeFieldNames() as $field) {
            if (!array_key_exists($field, $tableColumns)) {
                continue;
            }
            if (!$privileged) {
                unset($payload[$field]);
            }
            if (!array_key_exists($field, $payload) && array_key_exists($field, $scope)) {
                $payload[$field] = $scope[$field];
            }
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $record
     */
    private function emitConcurrencyHeaders(array $tableMeta, array $record): void
    {
        $columns = (array)($tableMeta['columns'] ?? []);
        if (!array_key_exists('row_version', $columns) || !array_key_exists('row_version', $record) || !is_scalar($record['row_version'])) {
            return;
        }

        $version = (int)$record['row_version'];
        header('ETag: W/"rv-' . $version . '"');
        header('X-Row-Version: ' . $version);
    }

    private function handleCrudFailure(Throwable $e, string $fallbackError): never
    {
        if ($e instanceof MissingScopeContextException) {
            $this->error('scope_context_required', 403, $e->getMessage());
        }
        if ($e instanceof PreconditionRequiredException) {
            $this->error('precondition_required', 428, $e->getMessage(), ['required' => 'row_version']);
        }
        if ($e instanceof RecordConflictException) {
            $this->error('conflict', 409, $e->getMessage());
        }
        if ($e instanceof RecordNotFoundException) {
            $this->error('not_found', 404, $e->getMessage());
        }
        if ($e instanceof WorkflowBridgeRequiredException) {
            $this->error('workflow_engine_required', 409, $e->getMessage());
        }

        $this->rethrowResponse($e);
        $this->error($fallbackError, 400, $e->getMessage());
    }

    /**
     * @return array{domain:string, table:string, kind:string, id:string, identity:array<string, mixed>, scope:array<string, mixed>, expected_row_version:?int, tableMeta:array<string, mixed>}
     */
    private function resolveContext(string $expectedKind, bool $needsIdentity = false, ?array $user = null): array
    {
        $domain = trim((string)($this->query('domain') ?? ''));
        $table = trim((string)($this->query('table') ?? ''));
        $id = trim((string)($this->query('id') ?? ''));
        $kind = $expectedKind;

        $action = (string)($_GET['action'] ?? $_POST['action'] ?? '');
        if (($domain === '' || $table === '') && preg_match('/^([a-z0-9_]+)\.([a-z0-9_]+)\.(list|detail|create|update|delete|transition)$/', $action, $matches) === 1) {
            $domain = $matches[1];
            $table = $matches[2];
            $kind = $matches[3];
        }

        if ($kind !== $expectedKind) {
            throw new RuntimeException("Unexpected action kind: {$kind}");
        }
        if ($domain === '' || $table === '') {
            throw new RuntimeException('Missing domain/table context');
        }
        $body = $this->jsonBody();
        $tableMeta = $this->service()->resolveTable($domain, $table);
        $identity = [];
        if ($needsIdentity) {
            $identity = $this->resolveIdentity($tableMeta, is_array($body) ? $body : []);
            $pk = $this->primaryKeyMeta($tableMeta);
            if ($pk['mode'] === 'scalar' && $pk['key']) {
                $id = trim((string)($identity[$pk['key']] ?? ''));
            }
        }
        $scope = $user !== null ? $this->resolveScope($tableMeta, $user, is_array($body) ? $body : []) : [];
        $expectedRowVersion = $needsIdentity ? $this->resolveExpectedRowVersion($tableMeta, is_array($body) ? $body : []) : null;
        $scopeFields = $this->tableScopeFields($tableMeta);
        if ($user !== null && $scopeFields !== [] && !$this->isPrivilegedScopeUser($user) && $scope === []) {
            throw new MissingScopeContextException('Missing organization scope context for scoped table access');
        }
        if (in_array($kind, ['update', 'delete', 'transition'], true)
            && array_key_exists('row_version', (array)($tableMeta['columns'] ?? []))
            && $expectedRowVersion === null) {
            throw new PreconditionRequiredException('Missing row_version precondition for optimistic concurrency');
        }

        return [
            'domain' => $domain,
            'table' => $table,
            'kind' => $kind,
            'id' => $id,
            'identity' => $identity,
            'scope' => $scope,
            'expected_row_version' => $expectedRowVersion,
            'tableMeta' => $tableMeta,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function currentRoles(array $user): array
    {
        $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        return array_values(array_filter(array_map(static fn($role): string => migrate_role(strtolower(trim((string)$role))), $roles)));
    }

    /**
     * @param array<string, mixed> $ctx
     * @return array<int, string>
     */
    private function runtimePermissionKeys(array $ctx): array
    {
        $action = strtolower($ctx['domain'] . '.' . $ctx['table'] . '.' . $ctx['kind']);
        $endpoint = $this->endpointCatalog()[$action] ?? null;
        $keys = array_values(array_filter(array_map(
            static fn($value): string => strtolower(trim((string)$value)),
            is_array($endpoint['security']['permission_keys'] ?? null) ? $endpoint['security']['permission_keys'] : []
        ), static fn(string $value): bool => $value !== ''));

        if ($keys !== []) {
            return array_values(array_unique($keys));
        }

        return [
            in_array($ctx['kind'], ['list', 'detail'], true)
                ? strtolower($ctx['domain'] . '.' . $ctx['table'] . '.read')
                : strtolower($ctx['domain'] . '.' . $ctx['table'] . '.' . $ctx['kind']),
        ];
    }

    /**
     * @param array<int, string> $roles
     * @return array<int, string>
     */
    private function normalizeRuntimePolicyRoles(array $roles): array
    {
        $normalized = [];
        foreach ($roles as $role) {
            $value = strtolower(trim((string)$role));
            if ($value === '') {
                continue;
            }
            $normalized[] = $value === 'authenticated' ? $value : migrate_role($value);
        }

        return array_values(array_unique(array_filter($normalized)));
    }

    /**
     * @param array<string, mixed> $ctx
     * @return array<int, string>|null
     */
    private function runtimeAccessRoles(array $ctx): ?array
    {
        $policy = $this->runtimeAccessPolicy();
        $kind = strtolower(trim((string)($ctx['kind'] ?? '')));
        $table = strtolower(trim((string)($ctx['table'] ?? '')));
        $domain = strtolower(trim((string)($ctx['domain'] ?? '')));

        foreach ([
            is_array($policy['tables'][$table] ?? null) ? $policy['tables'][$table] : null,
            is_array($policy['domains'][$domain] ?? null) ? $policy['domains'][$domain] : null,
            is_array($policy['defaults'] ?? null) ? $policy['defaults'] : null,
        ] as $scope) {
            if (!is_array($scope) || !array_key_exists($kind, $scope) || !is_array($scope[$kind])) {
                continue;
            }
            return $this->normalizeRuntimePolicyRoles($scope[$kind]);
        }

        return null;
    }

    /**
     * @param array<string, mixed> $ctx
     */
    private function enforceRuntimePermission(array $user, array $ctx): void
    {
        $permissions = $this->runtimePermissionKeys($ctx);
        $policyRoles = $this->runtimeAccessRoles($ctx);

        if ($policyRoles === []) {
            $this->error('forbidden', 403, 'Operation disabled by runtime access policy', [
                'permission_keys' => $permissions,
            ]);
        }

        if (user_is_admin($user)) {
            return;
        }

        if ((bool)($ctx['tableMeta']['supportTable'] ?? false)) {
            $this->error('forbidden', 403);
        }

        if ($this->userPermissionMatrixConfigured($user)) {
            $this->requireAnyPermission($user, $permissions, false);
            return;
        }

        if ($policyRoles !== null) {
            if (in_array('authenticated', $policyRoles, true)) {
                return;
            }
            if ($policyRoles !== [] && $this->userHasAnyRole($user, $policyRoles)) {
                return;
            }
            $this->error('forbidden', 403, 'Denied by runtime access policy', [
                'required_roles' => $policyRoles,
                'permission_keys' => $permissions,
            ]);
        }

        if (in_array($ctx['kind'], ['list', 'detail'], true)) {
            return;
        }

        $this->error('forbidden', 403, 'No runtime permission rule matched this mutation', [
            'permission_keys' => $permissions,
        ]);
    }

    public function listRecords(): never
    {
        $user = $this->requireAuth();

        try {
            $ctx = $this->resolveContext('list', false, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $result = $this->service()->list($ctx['domain'], $ctx['table'], $_GET, $ctx['scope']);
            $this->success([
                'records' => $result['records'],
                'total' => $result['total'],
                'offset' => $result['offset'],
                'limit' => $result['limit'],
                'has_more' => (($result['offset'] + count((array)$result['records'])) < (int)$result['total']),
                'domain' => $result['domain'],
                'table' => $result['table'],
                'primaryKey' => $result['primaryKey'],
                'primaryKeyFields' => $result['primaryKeyFields'],
                'recordAddressing' => $result['recordAddressing'],
                'scope' => $result['appliedScope'],
                'concurrency' => [
                    'field' => $result['concurrencyField'],
                    'optimistic' => $result['optimisticConcurrency'],
                ],
            ]);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_list_failed');
        }
    }

    public function getDetail(): never
    {
        try {
            $user = $this->requireAuth();
            $ctx = $this->resolveContext('detail', true, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $record = $this->service()->detail($ctx['domain'], $ctx['table'], $ctx['identity'], $ctx['scope']);
            if ($record === null) {
                $this->error('not_found', 404);
            }
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);

            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'id' => $ctx['id'],
                'identity' => $ctx['identity'],
                'scope' => $ctx['scope'],
                'concurrency' => [
                    'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                    'value' => $record['row_version'] ?? null,
                    'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                ],
            ]);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_detail_failed');
        }
    }

    public function createRecord(): never
    {
        $user = $this->requireAuth();

        try {
            $ctx = $this->resolveContext('create', false, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $this->requireCsrf();
            $body = $this->jsonBody();
            $payload = is_array($body['data'] ?? null) ? (array)$body['data'] : $body;
            unset($payload['domain'], $payload['table'], $payload['action']);
            $payload = $this->applyScopeToPayload($ctx['tableMeta'], $payload, $ctx['scope'], $user);
            $record = $this->service()->create(
                $ctx['domain'],
                $ctx['table'],
                $payload,
                (string)($user['username'] ?? 'system'),
                $ctx['scope']
            );
            $this->auditLog('generic_crud_create', ['domain' => $ctx['domain'], 'table' => $ctx['table']], (string)($user['username'] ?? ''));
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'scope' => $ctx['scope'],
                'concurrency' => [
                    'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                    'value' => $record['row_version'] ?? null,
                    'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                ],
            ], 201);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_create_failed');
        }
    }

    public function updateRecord(): never
    {
        $user = $this->requireAuth();

        try {
            $ctx = $this->resolveContext('update', true, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $this->requireCsrf();
            $body = $this->jsonBody();
            $payload = is_array($body['data'] ?? null) ? (array)$body['data'] : $body;
            unset($payload['domain'], $payload['table'], $payload['action'], $payload['id'], $payload['identity'], $payload['row_version'], $payload['expected_row_version'], $payload['version'], $payload['expectedVersion'], $payload['scope']);
            foreach (array_keys($ctx['identity']) as $identityField) {
                unset($payload[$identityField]);
            }
            $payload = $this->applyScopeToPayload($ctx['tableMeta'], $payload, $ctx['scope'], $user);
            $record = $this->service()->update(
                $ctx['domain'],
                $ctx['table'],
                $ctx['identity'],
                $payload,
                (string)($user['username'] ?? 'system'),
                $ctx['scope'],
                $ctx['expected_row_version']
            );
            $this->auditLog('generic_crud_update', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id'], 'identity' => $ctx['identity']], (string)($user['username'] ?? ''));
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'id' => $ctx['id'],
                'identity' => $ctx['identity'],
                'scope' => $ctx['scope'],
                'concurrency' => [
                    'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                    'value' => $record['row_version'] ?? null,
                    'expected' => $ctx['expected_row_version'],
                    'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                ],
            ]);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_update_failed');
        }
    }

    public function deleteRecord(): never
    {
        $user = $this->requireAuth();

        try {
            $ctx = $this->resolveContext('delete', true, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $this->requireCsrf();
            $record = $this->service()->delete(
                $ctx['domain'],
                $ctx['table'],
                $ctx['identity'],
                $ctx['scope'],
                $ctx['expected_row_version'],
                (string)($user['username'] ?? 'system')
            );
            $this->auditLog('generic_crud_delete', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id'], 'identity' => $ctx['identity']], (string)($user['username'] ?? ''));
            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'id' => $ctx['id'],
                'identity' => $ctx['identity'],
                'scope' => $ctx['scope'],
                'concurrency' => [
                    'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                    'expected' => $ctx['expected_row_version'],
                    'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                ],
            ]);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_delete_failed');
        }
    }

    public function transitionRecord(): never
    {
        $user = $this->requireAuth();

        try {
            $ctx = $this->resolveContext('transition', true, $user);
            $this->enforceRuntimePermission($user, $ctx);
            $this->requireCsrf();
            $body = $this->jsonBody();
            $toStatus = trim((string)($body['to'] ?? $body['status'] ?? $body['toStatus'] ?? $body['to_status'] ?? ''));
            if ($toStatus === '') {
                $this->error('missing_status', 400);
            }
            $record = $this->service()->transition(
                $ctx['domain'],
                $ctx['table'],
                $ctx['identity'],
                $toStatus,
                (string)($user['username'] ?? 'system'),
                $this->currentRoles($user),
                $ctx['scope'],
                $ctx['expected_row_version']
            );
            $this->auditLog('generic_crud_transition', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id'], 'identity' => $ctx['identity'], 'to' => $toStatus], (string)($user['username'] ?? ''));
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'id' => $ctx['id'],
                'identity' => $ctx['identity'],
                'scope' => $ctx['scope'],
                'concurrency' => [
                    'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                    'value' => $record['row_version'] ?? null,
                    'expected' => $ctx['expected_row_version'],
                    'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                ],
            ]);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_transition_failed');
        }
    }
}
