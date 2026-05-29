<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\GenericCrudService;
use MOM\Api\Services\IdempotencyService;
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
    private const MUTATION_KINDS = ['create', 'update', 'delete', 'transition'];

    private const RUNTIME_POLICY_HARD_DENY = [
        'audit_events' => ['update', 'delete'],
    ];

    private const DOMAIN_COMMAND_REQUIRED_DOMAINS = [
        'sales',
        'commercial_contracts',
        'production',
        'mes_execution',
        'inventory',
        'warehouse_management',
        'purchasing',
        'supplier_relationship',
        'quality_management',
        'quality_lab',
        'finance',
        'finance_extended',
        'finance_treasury',
        'master_data',
        'master_data_governance',
        'mfg_engineering',
        'traceability_serialization',
        'digital_product_passport',
        'plant_maintenance',
        'calibration_equipment',
        'shipping_compliance',
        'trade_compliance',
        'document_control',
        'evidence_vault',
        'record_system',
        'audit_risk',
    ];

    private const DOMAIN_COMMAND_REQUIRED_TABLES = [
        'sales_orders',
        'sales_order',
        'sales_order_line',
        'quotes',
        'quote',
        'job_orders',
        'job_order',
        'work_orders',
        'work_order',
        'purchase_orders',
        'purchase_order',
        'purchase_order_lines',
        'ap_invoices',
        'ap_invoice_lines',
        'inventory_transactions',
        'inventory_ledger',
        'inventory_balance_snapshot',
        'location_balance',
        'wip_ledger',
        'kpi_definitions',
        'stock_balances',
        'material_consumption',
        'mes_material_consumption',
        'uom',
        'uom_conversion_authority',
        'mdm_uom_conversions',
        'item',
        'items',
        'item_revision',
        'item_revisions',
        'item_site',
        'item_spec',
        'bom',
        'bill_of_materials',
        'bom_version',
        'bom_line',
        'routing_operations',
        'routings',
        'work_definition',
        'work_definition_version',
        'control_plans',
        'inspection_plans',
        'engineering_release_package',
        'engineering_release_packages',
        'inspection_lot',
        'inspection_result',
        'incoming_inspections',
        'quality_order',
        'quality_holds',
        'wms_quarantine_holds',
        'ncr_records',
        'nonconformance',
        'ncr',
        'capa',
        'capa_records',
        'scar',
        'scar_records',
        'complaint',
        'customer_complaints',
        'material_review_board',
        'approved_supplier_list',
        'supplier_scorecards',
        'lot',
        'lot_master',
        'serial',
        'serial_master',
        'genealogy_link',
        'genealogy_edges',
        'genealogy_nodes',
        'dpp_passports',
        'work_centers',
        'equipment',
        'pm_equipment_master',
        'maintenance_work_orders',
        'pm_work_orders',
        'calibration_records',
        'tools',
        'fixture_master',
        'tooling_assemblies',
        'tooling_life_measurements',
        'mes_tool_life_events',
        'mes_tool_assemblies',
        'mes_nc_release_packages',
        'mes_operational_event_ledger',
        'mes_job_execution',
        'mes_operation_execution',
        'state_transition_events',
        'workflow_instances',
        'approval',
        'mdm_approval_policies',
        'period_closes',
        'backdate_exceptions',
        'electronic_signature',
        'electronic_signatures',
        'signature_events',
        'eqms_electronic_signature_event',
        'audit_trail',
    ];

    private const DEFAULT_AUTHENTICATED_READ_DENY_DOMAINS = [
        'core_system',
        'training_hr',
        'hcm_workforce',
        'quality_management',
        'document_control',
        'evidence_vault',
        'sales',
        'production',
        'mes_execution',
        'finance',
        'finance_extended',
        'finance_treasury',
    ];

    private ?GenericCrudService $service = null;
    private ?IdempotencyService $idempotencyService = null;
    private ?array $runtimeAccessPolicy = null;
    private ?array $governedEntityRegistry = null;
    private ?array $governedEntityTableIndex = null;

    private function service(): GenericCrudService
    {
        if ($this->service === null) {
            $this->service = new GenericCrudService($this->dataDir);
        }

        return $this->service;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
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

    private function governedEntityRegistry(): array
    {
        if ($this->governedEntityRegistry === null) {
            $path = $this->rootDir . '/mom/contracts/governed-entities.json';
            $payload = $this->readJsonFile($path) ?? [];
            $this->governedEntityRegistry = is_array($payload) ? $payload : [];
        }

        return $this->governedEntityRegistry;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function governedEntityTableIndex(): array
    {
        if ($this->governedEntityTableIndex !== null) {
            return $this->governedEntityTableIndex;
        }

        $index = [];
        $registry = $this->governedEntityRegistry();
        $entities = is_array($registry['entities'] ?? null) ? $registry['entities'] : [];
        foreach ($entities as $entity) {
            if (!is_array($entity)) {
                continue;
            }

            $actions = array_map(
                static fn($action): string => strtolower(trim((string)$action)),
                (array)($entity['forbidden_generic_actions'] ?? [])
            );
            $actions = array_values(array_unique(array_filter($actions)));
            foreach ((array)($entity['table_names'] ?? []) as $tableName) {
                $table = strtolower(trim((string)$tableName));
                if ($table === '') {
                    continue;
                }

                $index[$table] = [
                    'source' => 'governed_entity_registry',
                    'root_code' => (string)($entity['root_code'] ?? ''),
                    'canonical_name' => (string)($entity['canonical_name'] ?? ''),
                    'owner_domain' => (string)($entity['owner_domain'] ?? ''),
                    'required_command_service' => (string)($entity['required_command_service'] ?? ''),
                    'forbidden_generic_actions' => $actions,
                    'severity' => (string)($entity['severity'] ?? 'P1'),
                ];
            }
        }

        return $this->governedEntityTableIndex = $index;
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
        return $this->userHasAnyRole($user, array_merge(admin_roles(), ['it_admin', 'ceo', 'hr_manager']));
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
                foreach ($matches[0] as $token) {
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

    private function parseIdempotencyKeyToken(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            throw new RuntimeException('Invalid idempotency key token');
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            throw new RuntimeException('Invalid idempotency key token');
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{key:string, key_source:string, mode:string}|null
     */
    private function explicitIdempotencyKey(array $body): ?array
    {
        $dataBody = is_array($body['data'] ?? null) ? (array)$body['data'] : [];
        $candidates = [
            ['source' => 'header:Idempotency-Key', 'value' => $this->requestHeader('Idempotency-Key')],
            ['source' => 'query:idempotency_key', 'value' => $this->query('idempotency_key')],
            ['source' => 'query:idempotencyKey', 'value' => $this->query('idempotencyKey')],
            ['source' => 'query:request_id', 'value' => $this->query('request_id')],
            ['source' => 'query:requestId', 'value' => $this->query('requestId')],
            ['source' => 'body:idempotency_key', 'value' => $body['idempotency_key'] ?? null],
            ['source' => 'body:idempotencyKey', 'value' => $body['idempotencyKey'] ?? null],
            ['source' => 'body:request_id', 'value' => $body['request_id'] ?? null],
            ['source' => 'body:requestId', 'value' => $body['requestId'] ?? null],
            ['source' => 'body.data:idempotency_key', 'value' => $dataBody['idempotency_key'] ?? null],
            ['source' => 'body.data:idempotencyKey', 'value' => $dataBody['idempotencyKey'] ?? null],
            ['source' => 'body.data:request_id', 'value' => $dataBody['request_id'] ?? null],
            ['source' => 'body.data:requestId', 'value' => $dataBody['requestId'] ?? null],
        ];

        foreach ($candidates as $candidate) {
            $key = $this->parseIdempotencyKeyToken($candidate['value']);
            if ($key === null) {
                continue;
            }

            return [
                'key' => $key,
                'key_source' => (string)$candidate['source'],
                'mode' => 'client_token',
            ];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $payload
     * @return array<string, mixed>|null
     */
    private function createPrimaryKeyIdentityPayload(array $tableMeta, array $payload): ?array
    {
        $pk = $this->primaryKeyMeta($tableMeta);
        if ($pk['fields'] === []) {
            return null;
        }

        $identity = [];
        foreach ($pk['fields'] as $field) {
            if (!array_key_exists($field, $payload) || !is_scalar($payload[$field])) {
                return null;
            }
            $value = trim((string)$payload[$field]);
            if ($value === '') {
                return null;
            }
            $identity[$field] = $value;
        }

        return $identity;
    }

    /**
     * @param array<string, mixed> $tableMeta
     * @param array<string, mixed> $payload
     * @return array<string, mixed>|null
     */
    private function createRequiredUniqueIdentityPayload(array $tableMeta, array $payload): ?array
    {
        $columns = (array)($tableMeta['columns'] ?? []);
        if ($columns === []) {
            return null;
        }

        $identity = [];
        foreach ($columns as $field => $meta) {
            if (!is_array($meta) || ($meta['unique'] ?? false) !== true || ($meta['required'] ?? false) !== true) {
                continue;
            }
            if (!array_key_exists($field, $payload) || !is_scalar($payload[$field])) {
                continue;
            }
            $value = trim((string)$payload[$field]);
            if ($value === '') {
                continue;
            }
            $identity[$field] = $value;
        }

        return $identity === [] ? null : $identity;
    }

    /**
     * @param array<string, mixed> $ctx
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private function createPayloadRetryWindowDescriptor(array $ctx, array $payload, array $user): array
    {
        $scopeIdentity = is_array($ctx['scope'] ?? null) ? (array)$ctx['scope'] : [];
        $retryWindowSeconds = $this->idempotency()->retryWindowSeconds();
        $derivation = [
            'kind' => 'create',
            'domain' => $ctx['domain'],
            'table' => $ctx['table'],
            'scope' => $scopeIdentity,
            'payload' => $payload,
        ];

        return [
            'scope_key' => implode('|', ['generic_crud', 'create', (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
            'key' => 'drv-create-window-' . hash('sha256', json_encode($derivation, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:payload_retry_window',
            'mode' => 'derived_payload_window',
            'kind' => 'create',
            'domain' => $ctx['domain'],
            'table' => $ctx['table'],
            'user_id' => (string)($user['username'] ?? 'system'),
            'ttl_seconds' => $retryWindowSeconds,
            'fingerprint' => $derivation,
        ];
    }

    /**
     * @param array<string, mixed> $ctx
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>|null
     */
    private function mutationIdentityRetryWindowDescriptor(string $kind, array $ctx, array $payload, array $user, ?string $toStatus = null): ?array
    {
        $identity = is_array($ctx['identity'] ?? null) ? (array)$ctx['identity'] : [];
        if ($identity === []) {
            return null;
        }

        $scopeIdentity = is_array($ctx['scope'] ?? null) ? (array)$ctx['scope'] : [];
        $retryWindowSeconds = $this->idempotency()->retryWindowSeconds();
        $derivation = [
            'kind' => $kind,
            'domain' => $ctx['domain'],
            'table' => $ctx['table'],
            'identity' => $identity,
            'scope' => $scopeIdentity,
            'payload' => $payload,
            'to_status' => $toStatus,
        ];

        return [
            'scope_key' => implode('|', ['generic_crud', $kind, (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
            'key' => 'drv-' . $kind . '-window-' . hash('sha256', json_encode($derivation, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:identity_payload_retry_window',
            'mode' => 'derived_identity_window',
            'kind' => $kind,
            'domain' => $ctx['domain'],
            'table' => $ctx['table'],
            'user_id' => (string)($user['username'] ?? 'system'),
            'ttl_seconds' => $retryWindowSeconds,
            'fingerprint' => $derivation,
        ];
    }

    /**
     * @param array<string, mixed> $ctx
     * @param array<string, mixed> $body
     * @param array<string, mixed> $user
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function resolveMutationIdempotency(string $kind, array $ctx, array $body, array $user, array $payload = [], ?string $toStatus = null): array
    {
        $base = [
            'supported' => in_array($kind, ['create', 'update', 'delete', 'transition'], true),
            'applied' => false,
            'mode' => null,
            'key_source' => null,
            'safe_retry_requires_client_key' => $kind === 'create',
            'accepted_headers' => ['Idempotency-Key'],
            'accepted_query_params' => ['request_id', 'requestId', 'idempotency_key', 'idempotencyKey'],
            'accepted_body_fields' => ['request_id', 'requestId', 'idempotency_key', 'idempotencyKey'],
            'descriptor' => null,
        ];

        if ($base['supported'] !== true || !$this->idempotency()->isEnabled()) {
            return $base;
        }

        $explicit = $this->explicitIdempotencyKey($body);
        if ($explicit !== null) {
            return array_merge($base, [
                'applied' => true,
                'mode' => $explicit['mode'],
                'key_source' => $explicit['key_source'],
                'safe_retry_requires_client_key' => false,
                'descriptor' => [
                    'scope_key' => implode('|', ['generic_crud', $kind, (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
                    'key' => $explicit['key'],
                    'key_source' => $explicit['key_source'],
                    'mode' => $explicit['mode'],
                    'kind' => $kind,
                    'domain' => $ctx['domain'],
                    'table' => $ctx['table'],
                    'user_id' => (string)($user['username'] ?? 'system'),
                    'fingerprint' => [
                        'kind' => $kind,
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'identity' => $ctx['identity'] ?? [],
                        'scope' => $ctx['scope'] ?? [],
                        'payload' => $payload,
                        'to_status' => $toStatus,
                        'expected_row_version' => $ctx['expected_row_version'] ?? null,
                    ],
                ],
            ]);
        }

        if ($kind === 'create') {
            $scopeIdentity = $ctx['scope'] ?? [];
            $identity = $this->createPrimaryKeyIdentityPayload((array)$ctx['tableMeta'], $payload);
            if ($identity !== null) {
                return array_merge($base, [
                    'applied' => true,
                    'mode' => 'derived_identity',
                    'key_source' => 'derived:primary_key_payload',
                    'safe_retry_requires_client_key' => false,
                    'descriptor' => [
                        'scope_key' => implode('|', ['generic_crud', $kind, (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
                        'key' => 'drv-create-' . hash('sha256', json_encode([
                            'domain' => $ctx['domain'],
                            'table' => $ctx['table'],
                            'scope' => $scopeIdentity,
                            'identity' => $identity,
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
                        'key_source' => 'derived:primary_key_payload',
                        'mode' => 'derived_identity',
                        'kind' => $kind,
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'user_id' => (string)($user['username'] ?? 'system'),
                        'fingerprint' => [
                            'kind' => $kind,
                            'domain' => $ctx['domain'],
                            'table' => $ctx['table'],
                            'identity' => $identity,
                            'scope' => $scopeIdentity,
                            'payload' => $payload,
                        ],
                    ],
                ]);
            }

            $uniqueIdentity = $this->createRequiredUniqueIdentityPayload((array)$ctx['tableMeta'], $payload);
            if ($uniqueIdentity !== null) {
                return array_merge($base, [
                    'applied' => true,
                    'mode' => 'derived_unique_fields',
                    'key_source' => 'derived:required_unique_fields',
                    'safe_retry_requires_client_key' => false,
                    'descriptor' => [
                        'scope_key' => implode('|', ['generic_crud', $kind, (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
                        'key' => 'drv-create-' . hash('sha256', json_encode([
                            'domain' => $ctx['domain'],
                            'table' => $ctx['table'],
                            'scope' => $scopeIdentity,
                            'identity' => $uniqueIdentity,
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
                        'key_source' => 'derived:required_unique_fields',
                        'mode' => 'derived_unique_fields',
                        'kind' => $kind,
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'user_id' => (string)($user['username'] ?? 'system'),
                        'fingerprint' => [
                            'kind' => $kind,
                            'domain' => $ctx['domain'],
                            'table' => $ctx['table'],
                            'identity' => $uniqueIdentity,
                            'scope' => $scopeIdentity,
                            'payload' => $payload,
                        ],
                    ],
                ]);
            }

            return array_merge($base, [
                'applied' => true,
                'mode' => 'derived_payload_window',
                'key_source' => 'derived:payload_retry_window',
                'safe_retry_requires_client_key' => false,
                'retry_window_seconds' => $this->idempotency()->retryWindowSeconds(),
                'descriptor' => $this->createPayloadRetryWindowDescriptor($ctx, $payload, $user),
            ]);
        }

        $expectedVersion = $ctx['expected_row_version'] ?? null;
        if ($kind === 'transition' && $toStatus === null) {
            return $base;
        }
        if ($expectedVersion !== null) {
            return array_merge($base, [
                'applied' => true,
                'mode' => 'derived_concurrency',
                'key_source' => 'derived:identity_row_version_payload',
                'safe_retry_requires_client_key' => false,
                'descriptor' => [
                    'scope_key' => implode('|', ['generic_crud', $kind, (string)$ctx['domain'], (string)$ctx['table'], (string)($user['username'] ?? 'system')]),
                    'key' => 'drv-' . $kind . '-' . hash('sha256', json_encode([
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'identity' => $ctx['identity'] ?? [],
                        'scope' => $ctx['scope'] ?? [],
                        'payload' => $payload,
                        'to_status' => $toStatus,
                        'expected_row_version' => $expectedVersion,
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
                    'key_source' => 'derived:identity_row_version_payload',
                    'mode' => 'derived_concurrency',
                    'kind' => $kind,
                    'domain' => $ctx['domain'],
                    'table' => $ctx['table'],
                    'user_id' => (string)($user['username'] ?? 'system'),
                    'fingerprint' => [
                        'kind' => $kind,
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'identity' => $ctx['identity'] ?? [],
                        'scope' => $ctx['scope'] ?? [],
                        'payload' => $payload,
                        'to_status' => $toStatus,
                        'expected_row_version' => $expectedVersion,
                    ],
                ],
            ]);
        }

        $retryWindowDescriptor = $this->mutationIdentityRetryWindowDescriptor($kind, $ctx, $payload, $user, $toStatus);
        if ($retryWindowDescriptor === null) {
            return $base;
        }

        return array_merge($base, [
            'applied' => true,
            'mode' => 'derived_identity_window',
            'key_source' => 'derived:identity_payload_retry_window',
            'safe_retry_requires_client_key' => false,
            'retry_window_seconds' => $this->idempotency()->retryWindowSeconds(),
            'descriptor' => $retryWindowDescriptor,
        ]);
    }

    /**
     * @param array<string, mixed> $spec
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}
     */
    private function runMutationWithIdempotency(array $spec, callable $operation): array
    {
        if (($spec['applied'] ?? false) !== true || !is_array($spec['descriptor'] ?? null)) {
            $result = $operation();
            return [
                'status_code' => max(200, (int)($result['status_code'] ?? 200)),
                'payload' => is_array($result['payload'] ?? null) ? (array)$result['payload'] : [],
                'replayed' => false,
                'stored_at' => '',
            ];
        }

        return $this->idempotency()->execute((array)$spec['descriptor'], $operation);
    }

    /**
     * @param array<string, mixed> $spec
     * @param array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string} $execution
     * @return array<string, mixed>
     */
    private function idempotencyResponseMeta(array $spec, array $execution): array
    {
        return [
            'supported' => (bool)($spec['supported'] ?? false),
            'applied' => (bool)($spec['applied'] ?? false),
            'replayed' => (bool)($execution['replayed'] ?? false),
            'mode' => $spec['mode'] ?? null,
            'key_source' => $spec['key_source'] ?? null,
            'safe_retry_requires_client_key' => (bool)($spec['safe_retry_requires_client_key'] ?? false),
            'storage' => (bool)($spec['applied'] ?? false) ? 'server_persisted_success_response' : null,
            'stored_at' => $execution['stored_at'] ?? '',
            'retry_window_seconds' => $spec['retry_window_seconds'] ?? (($spec['descriptor']['ttl_seconds'] ?? null) ?: null),
            'accepted_headers' => (array)($spec['accepted_headers'] ?? []),
            'accepted_query_params' => (array)($spec['accepted_query_params'] ?? []),
            'accepted_body_fields' => (array)($spec['accepted_body_fields'] ?? []),
        ];
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
        // Generic CRUD endpoints follow the canonical dynamic permission pattern.
        // Avoid loading the full endpoint catalog here because the generated asset
        // is large and can create avoidable memory pressure on routine reads.
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
     * @return array<string, mixed>
     */
    private function runtimePolicyMatch(array $ctx): array
    {
        $policy = $this->runtimeAccessPolicy();
        $table = strtolower(trim((string)($ctx['table'] ?? '')));
        $domain = strtolower(trim((string)($ctx['domain'] ?? '')));

        $matches = [
            'table' => is_array($policy['tables'][$table] ?? null) ? $policy['tables'][$table] : null,
            'domain' => is_array($policy['domains'][$domain] ?? null) ? $policy['domains'][$domain] : null,
            'defaults' => is_array($policy['defaults'] ?? null) ? $policy['defaults'] : null,
        ];

        foreach ($matches as $source => $scope) {
            if (is_array($scope)) {
                return [
                    'source' => $source,
                    'scope' => $scope,
                ];
            }
        }

        return [
            'source' => 'none',
            'scope' => [],
        ];
    }

    /**
     * @param array<string, mixed> $ctx
     * @return array<string, mixed>
     */
    private function runtimePolicyScope(array $ctx): array
    {
        return (array)($this->runtimePolicyMatch($ctx)['scope'] ?? []);
    }

    /**
     * @param array<int, string>|null $policyRoles
     */
    private function isAuthenticatedOnlyPolicy(?array $policyRoles): bool
    {
        return is_array($policyRoles)
            && count($policyRoles) === 1
            && strtolower(trim((string)$policyRoles[0])) === 'authenticated';
    }

    /**
     * @param array<string, mixed> $ctx
     * @param array<int, string>|null $policyRoles
     */
    private function shouldDenyDefaultAuthenticatedRead(array $ctx, ?array $policyRoles): bool
    {
        $kind = strtolower(trim((string)($ctx['kind'] ?? '')));
        if (!in_array($kind, ['list', 'detail'], true) || !$this->isAuthenticatedOnlyPolicy($policyRoles)) {
            return false;
        }

        $policySource = strtolower(trim((string)($this->runtimePolicyMatch($ctx)['source'] ?? 'none')));
        if (in_array($policySource, ['table', 'none'], true)) {
            return false;
        }

        $domain = strtolower(trim((string)($ctx['domain'] ?? '')));
        if (in_array($domain, self::DEFAULT_AUTHENTICATED_READ_DENY_DOMAINS, true)) {
            return true;
        }

        $tableMeta = is_array($ctx['tableMeta'] ?? null) ? (array)$ctx['tableMeta'] : [];
        if ($this->tableScopeFields($tableMeta) === []) {
            return true;
        }

        return trim((string)($tableMeta['statusColumn'] ?? '')) !== ''
            || trim((string)($tableMeta['workflowId'] ?? '')) !== '';
    }

    /**
     * @param array<string, mixed> $ctx
     */
    private function requiresDomainCommand(array $ctx): bool
    {
        $kind = strtolower(trim((string)($ctx['kind'] ?? '')));
        if (!in_array($kind, self::MUTATION_KINDS, true)) {
            return false;
        }

        if ($this->governedEntityPolicyForContext($ctx) !== null) {
            return true;
        }

        $scope = $this->runtimePolicyScope($ctx);
        $genericMutation = strtolower(trim((string)($scope['genericMutation'] ?? $scope['generic_mutation'] ?? '')));
        if (in_array($genericMutation, ['allow', 'allowed', 'generic_allowed'], true)) {
            return false;
        }
        if (in_array($genericMutation, ['deny', 'blocked', 'domain_command_required'], true)) {
            return true;
        }

        $domain = strtolower(trim((string)($ctx['domain'] ?? '')));
        $table = strtolower(trim((string)($ctx['table'] ?? '')));
        if (in_array($domain, self::DOMAIN_COMMAND_REQUIRED_DOMAINS, true)) {
            return true;
        }
        if (in_array($table, self::DOMAIN_COMMAND_REQUIRED_TABLES, true)) {
            return true;
        }

        $tableMeta = is_array($ctx['tableMeta'] ?? null) ? (array)$ctx['tableMeta'] : [];
        $statusColumn = trim((string)($tableMeta['statusColumn'] ?? ''));
        $workflowId = trim((string)($tableMeta['workflowId'] ?? ''));

        return $statusColumn !== '' || $workflowId !== '';
    }

    /**
     * @param array<string, mixed> $ctx
     * @return array<string, mixed>|null
     */
    private function governedEntityPolicyForContext(array $ctx): ?array
    {
        $kind = strtolower(trim((string)($ctx['kind'] ?? '')));
        if (!in_array($kind, self::MUTATION_KINDS, true)) {
            return null;
        }

        $table = strtolower(trim((string)($ctx['table'] ?? '')));
        if ($table === '') {
            return null;
        }

        $policy = $this->governedEntityTableIndex()[$table] ?? null;
        if (!is_array($policy)) {
            return null;
        }

        $actions = (array)($policy['forbidden_generic_actions'] ?? []);
        if (in_array('*', $actions, true) || in_array($kind, $actions, true)) {
            return $policy;
        }

        return null;
    }

    /**
     * @param array<string, mixed> $user
     */
    private function governedGenericMutationOverrideEnabled(array $user): bool
    {
        $configured = strtolower(trim((string)(getenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION') ?: '')));
        if ($configured !== 'break_glass_for_migration_only') {
            return false;
        }

        $roles = array_map('strval', (array)($user['roles'] ?? []));
        $role = trim((string)($user['role'] ?? ''));
        if ($role !== '') {
            $roles[] = $role;
        }

        $isAdmin = in_array('admin', $roles, true) || in_array('it_admin', $roles, true);
        if (!$isAdmin) {
            return false;
        }

        $overrideHeader = trim((string)($this->requestHeader('X-HESEM-Internal-Generic-Override') ?? ''));
        $releaseManifest = trim((string)($this->requestHeader('X-HESEM-Release-Manifest') ?? ''));
        $commandId = trim((string)($this->requestHeader('X-HESEM-Command-Id') ?? ''));

        return $overrideHeader === 'domain-command-backfill'
            && preg_match('/^REL-[A-Z0-9._:-]+$/', $releaseManifest) === 1
            && preg_match('/^[a-f0-9-]{36}$/i', $commandId) === 1;
    }

    /**
     * @param array<string, mixed> $ctx
     * @param array<string, mixed> $user
     * @param array<string, mixed> $boundary
     */
    private function emitGovernedGenericMutationTelemetry(array $ctx, array $user, array $boundary, string $outcome): void
    {
        $roles = array_values(array_filter(array_map('strval', (array)($user['roles'] ?? []))));
        $role = trim((string)($user['role'] ?? ''));
        if ($role !== '') {
            $roles[] = $role;
        }

        $event = [
            'event' => 'governed_generic_mutation_boundary',
            'outcome' => $outcome,
            'domain' => (string)($ctx['domain'] ?? ''),
            'table' => (string)($ctx['table'] ?? ''),
            'kind' => (string)($ctx['kind'] ?? ''),
            'boundary_source' => (string)($boundary['source'] ?? 'legacy_or_runtime_policy'),
            'root_code' => (string)($boundary['root_code'] ?? ''),
            'severity' => (string)($boundary['severity'] ?? ''),
            'roles' => array_values(array_unique($roles)),
        ];

        $encoded = json_encode($event, JSON_UNESCAPED_SLASHES);
        if (is_string($encoded)) {
            error_log('[hesem.runtime_authority] ' . $encoded);
        }
    }

    /**
     * @param array<string, mixed> $ctx
     */
    private function enforceDomainCommandBoundary(array $ctx, array $user): void
    {
        if (!$this->requiresDomainCommand($ctx)) {
            return;
        }

        $boundary = $this->governedEntityPolicyForContext($ctx) ?? [
            'source' => 'legacy_or_runtime_policy',
            'root_code' => '',
            'severity' => '',
        ];

        if ($this->governedGenericMutationOverrideEnabled($user)) {
            $this->emitGovernedGenericMutationTelemetry($ctx, $user, $boundary, 'break_glass_allowed');
            return;
        }

        $this->emitGovernedGenericMutationTelemetry($ctx, $user, $boundary, 'denied');
        $this->error('domain_command_required', 409, 'Generic CRUD mutation is disabled for governed runtime domains. Use a dedicated process command API so business gates, transaction boundaries, idempotency, ledger posting, audit, and evidence are enforced.', [
            'domain' => (string)($ctx['domain'] ?? ''),
            'table' => (string)($ctx['table'] ?? ''),
            'kind' => (string)($ctx['kind'] ?? ''),
            'policy' => 'frontend_must_not_call_raw_runtime_mutations_for_governed_domains',
            'boundary_source' => (string)($boundary['source'] ?? 'legacy_or_runtime_policy'),
            'root_code' => (string)($boundary['root_code'] ?? ''),
        ]);
    }

    /**
     * @param array<string, mixed> $ctx
     */
    private function enforceRuntimePermission(array $user, array $ctx): void
    {
        $permissions = $this->runtimePermissionKeys($ctx);
        $policyRoles = $this->runtimeAccessRoles($ctx);

        $table = strtolower(trim((string)($ctx['table'] ?? '')));
        $kind = strtolower(trim((string)($ctx['kind'] ?? '')));
        if (in_array($kind, self::RUNTIME_POLICY_HARD_DENY[$table] ?? [], true)) {
            $this->error('forbidden', 403, 'Operation disabled by runtime access policy', [
                'permission_keys' => $permissions,
                'policy' => 'runtime_policy_hard_deny',
            ]);
        }

        if ($policyRoles === []) {
            $this->error('forbidden', 403, 'Operation disabled by runtime access policy', [
                'permission_keys' => $permissions,
            ]);
        }

        if (user_is_admin($user)) {
            $this->enforceDomainCommandBoundary($ctx, $user);
            return;
        }

        if ((bool)($ctx['tableMeta']['supportTable'] ?? false)) {
            $this->error('forbidden', 403);
        }

        if ($this->userPermissionMatrixConfigured($user)) {
            $this->requireAnyPermission($user, $permissions, false);
            $this->enforceDomainCommandBoundary($ctx, $user);
            return;
        }

        if ($policyRoles !== null) {
            if (in_array('authenticated', $policyRoles, true)) {
                if ($this->shouldDenyDefaultAuthenticatedRead($ctx, $policyRoles)) {
                    $this->error('forbidden', 403, 'Default authenticated generic read is disabled for sensitive runtime data. Add an explicit runtime policy or permission-matrix grant.', [
                        'policy' => 'default_authenticated_read_denied',
                        'permission_keys' => $permissions,
                        'domain' => (string)($ctx['domain'] ?? ''),
                        'table' => (string)($ctx['table'] ?? ''),
                    ]);
                }
                $this->enforceDomainCommandBoundary($ctx, $user);
                return;
            }
            if ($policyRoles !== [] && $this->userHasAnyRole($user, $policyRoles)) {
                $this->enforceDomainCommandBoundary($ctx, $user);
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
            $idempotency = $this->resolveMutationIdempotency('create', $ctx, $body, $user, $payload);
            $execution = $this->runMutationWithIdempotency($idempotency, function () use ($ctx, $payload, $user): array {
                $record = $this->service()->create(
                    $ctx['domain'],
                    $ctx['table'],
                    $payload,
                    (string)($user['username'] ?? 'system'),
                    $ctx['scope']
                );
                $this->auditLog('generic_crud_create', ['domain' => $ctx['domain'], 'table' => $ctx['table']], (string)($user['username'] ?? ''));
                return [
                    'status_code' => 201,
                    'payload' => [
                        'record' => $record,
                        'domain' => $ctx['domain'],
                        'table' => $ctx['table'],
                        'scope' => $ctx['scope'],
                        'concurrency' => [
                            'field' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])) ? 'row_version' : null,
                            'value' => $record['row_version'] ?? null,
                            'optimistic' => array_key_exists('row_version', (array)($ctx['tableMeta']['columns'] ?? [])),
                        ],
                    ],
                ];
            });
            $response = $execution['payload'];
            $response['idempotency'] = $this->idempotencyResponseMeta($idempotency, $execution);
            $record = is_array($response['record'] ?? null) ? (array)$response['record'] : [];
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success($response, (int)$execution['status_code']);
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
            $idempotency = $this->resolveMutationIdempotency('update', $ctx, $body, $user, $payload);
            $execution = $this->runMutationWithIdempotency($idempotency, function () use ($ctx, $payload, $user): array {
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
                return [
                    'status_code' => 200,
                    'payload' => [
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
                    ],
                ];
            });
            $response = $execution['payload'];
            $response['idempotency'] = $this->idempotencyResponseMeta($idempotency, $execution);
            $record = is_array($response['record'] ?? null) ? (array)$response['record'] : [];
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success($response, (int)$execution['status_code']);
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
            $body = $this->jsonBody();
            $idempotency = $this->resolveMutationIdempotency('delete', $ctx, $body, $user, $body);
            $execution = $this->runMutationWithIdempotency($idempotency, function () use ($ctx, $user): array {
                $record = $this->service()->delete(
                    $ctx['domain'],
                    $ctx['table'],
                    $ctx['identity'],
                    $ctx['scope'],
                    $ctx['expected_row_version'],
                    (string)($user['username'] ?? 'system')
                );
                $this->auditLog('generic_crud_delete', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id'], 'identity' => $ctx['identity']], (string)($user['username'] ?? ''));
                return [
                    'status_code' => 200,
                    'payload' => [
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
                    ],
                ];
            });
            $response = $execution['payload'];
            $response['idempotency'] = $this->idempotencyResponseMeta($idempotency, $execution);
            $this->success($response, (int)$execution['status_code']);
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
            $idempotency = $this->resolveMutationIdempotency('transition', $ctx, $body, $user, $body, $toStatus);
            $execution = $this->runMutationWithIdempotency($idempotency, function () use ($ctx, $toStatus, $user): array {
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
                return [
                    'status_code' => 200,
                    'payload' => [
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
                    ],
                ];
            });
            $response = $execution['payload'];
            $response['idempotency'] = $this->idempotencyResponseMeta($idempotency, $execution);
            $record = is_array($response['record'] ?? null) ? (array)$response['record'] : [];
            $this->emitConcurrencyHeaders($ctx['tableMeta'], $record);
            $this->success($response, (int)$execution['status_code']);
        } catch (Throwable $e) {
            $this->handleCrudFailure($e, 'generic_transition_failed');
        }
    }
}
