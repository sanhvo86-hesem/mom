<?php
declare(strict_types=1);
namespace MOM\Api\Services;

use RuntimeException;

/**
 * RegistryService — Backend centralized data layer.
 *
 * Mirrors the frontend HmRegistry singleton (00a-registry-service.js).
 * ALL PHP services should read status labels, field definitions, workflow
 * states, validation rules, and formulas through this service — never
 * hardcode them locally.
 *
 * Usage:
 *   $reg = new RegistryService($dataDir);
 *   $info = $reg->status('ncr_status', 'draft');
 *   $wf   = $reg->workflow('ncr');
 *   $ok   = $reg->canTransition('ncr', 'draft', 'submitted', ['quality_engineer']);
 */
class RegistryService
{
    private string $registryDir;
    private string $controlledRegistryDir;

    /** @var array<string, array> Per-request in-memory cache */
    private array $cache = [];

    public function __construct(string $dataDir)
    {
        $this->registryDir = rtrim($dataDir, '/\\') . '/registry';
        $this->controlledRegistryDir = dirname(__DIR__, 2) . '/contracts';
    }

    /* ── Loading ──────────────────────────────────────────────────────── */

    /**
     * Load a registry JSON file (cached per-request).
     */
    private function load(string $name): array
    {
        if (isset($this->cache[$name])) {
            return $this->cache[$name];
        }

        if ($name === 'data-fields') {
            return $this->cache[$name] = $this->loadDataFieldsRegistry();
        }

        $runtimeRegistry = $this->readJsonFile($this->registryDir . '/' . $name . '.json');
        if ($runtimeRegistry !== [] && ($name !== 'table-registry' || $this->isUsableTableRegistry($runtimeRegistry))) {
            return $this->cache[$name] = $runtimeRegistry;
        }

        $controlledRegistry = $this->readJsonFile($this->controlledRegistryDir . '/' . $name . '.json');
        if ($controlledRegistry !== []) {
            return $this->cache[$name] = $controlledRegistry;
        }

        if ($name === 'endpoint-catalog') {
            return $this->cache[$name] = $this->buildEndpointCatalogFromTableRegistry();
        }

        return $this->cache[$name] = [];
    }

    /**
     * @param array<string, mixed> $registry
     */
    private function isUsableTableRegistry(array $registry): bool
    {
        $tables = is_array($registry['tables'] ?? null) ? $registry['tables'] : [];
        if ($tables === []) {
            return false;
        }

        foreach ($tables as $table) {
            if (!is_array($table)) {
                continue;
            }
            if (trim((string)($table['domain'] ?? '')) !== '' && !empty($table['columns']) && is_array($table['columns'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildEndpointCatalogFromTableRegistry(): array
    {
        $tableRegistry = $this->load('table-registry');
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        $endpoints = [];
        $generatedAt = gmdate('c');

        foreach ($tables as $tableName => $tableMeta) {
            if (!is_string($tableName) || !is_array($tableMeta)) {
                continue;
            }

            $domain = strtolower(trim((string)($tableMeta['domain'] ?? 'default')));
            $safeTable = strtolower(trim($tableName));
            if (!preg_match('/^[a-z0-9_]+$/', $domain) || !preg_match('/^[a-z0-9_]+$/', $safeTable)) {
                continue;
            }

            $primaryKey = $tableMeta['primaryKey'] ?? null;
            $primaryKeyFields = is_array($primaryKey)
                ? array_values(array_filter(array_map(static fn($value): string => trim((string)$value), $primaryKey), static fn(string $value): bool => $value !== ''))
                : (trim((string)$primaryKey) !== '' ? [trim((string)$primaryKey)] : []);
            $actions = [
                'list' => ['handler' => 'listRecords', 'method' => 'GET', 'kind' => 'read'],
                'create' => ['handler' => 'createRecord', 'method' => 'POST', 'kind' => 'create'],
            ];
            if ($primaryKeyFields !== []) {
                $actions['detail'] = ['handler' => 'getDetail', 'method' => 'GET', 'kind' => 'read'];
                $actions['update'] = ['handler' => 'updateRecord', 'method' => 'POST', 'kind' => 'update'];
                $actions['delete'] = ['handler' => 'deleteRecord', 'method' => 'POST', 'kind' => 'delete'];
            }
            if ($primaryKeyFields !== [] && trim((string)($tableMeta['statusColumn'] ?? '')) !== '') {
                $actions['transition'] = ['handler' => 'transitionRecord', 'method' => 'POST', 'kind' => 'transition'];
            }

            foreach ($actions as $action => $spec) {
                $key = $domain . '.' . $safeTable . '.' . $action;
                $endpoints[$key] = [
                    'label' => $key,
                    'labelEn' => $key,
                    'module' => $domain,
                    'moduleEn' => $domain,
                    'method' => $spec['method'],
                    'kind' => $spec['kind'],
                    'domain' => $domain,
                    'entity' => $safeTable,
                    'path' => 'api/index.php?action=' . $key,
                    'controller' => 'GenericCrudController',
                    'handler' => $spec['handler'],
                    'field_count' => count((array)($tableMeta['columns'] ?? [])),
                    'security' => [
                        'auth_required' => true,
                        'csrf_required' => true,
                        'permission_keys' => $this->generatedEndpointPermissionKeys($domain, $safeTable, (string)$spec['kind']),
                    ],
                    'workflow' => [
                        'execution_mode' => 'registry_backed_generic_crud',
                        'generic_runtime_safe' => true,
                    ],
                    'capabilities' => [
                        'deletion' => [
                            'mode' => $action === 'delete' ? 'governed_generic_delete' : 'not_applicable',
                        ],
                    ],
                    'source' => 'contracts/table-registry.generated_endpoint_catalog_fallback',
                ];
            }
        }

        return [
            '_meta' => [
                'generatedAt' => $generatedAt,
                'source' => 'contracts/table-registry.json',
                'fallback' => true,
                'endpointCount' => count($endpoints),
            ],
            'endpoints' => $endpoints,
        ];
    }

    /**
     * @return list<string>
     */
    private function generatedEndpointPermissionKeys(string $domain, string $table, string $kind): array
    {
        $action = in_array($kind, ['list', 'detail', 'read'], true) ? 'read' : $kind;

        return [strtolower($domain . '.' . $table . '.' . $action)];
    }

    /**
     * Read a JSON registry file into an array, returning [] on failure.
     */
    private function readJsonFile(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }

        $raw = @file_get_contents($file);
        if ($raw === false) {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Merge split data-fields parts into one in-memory registry.
     */
    private function loadDataFieldsRegistry(): array
    {
        $index = $this->readJsonFile($this->registryDir . '/data-fields.json');
        if ($index === []) {
            return [];
        }

        $parts = $index['parts'] ?? ($index['_meta']['parts'] ?? []);
        if (!is_array($parts) || $parts === []) {
            return $index;
        }

        $merged = $index;
        foreach ($parts as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }

            // SECURITY FIX (INF-006): Validate file path to prevent path traversal
            $fullPath = realpath($this->registryDir . '/' . $file);
            if ($fullPath === false || !str_starts_with($fullPath, realpath($this->registryDir))) {
                continue; // Skip invalid paths
            }

            $payload = $this->readJsonFile($fullPath);
            foreach ($payload as $key => $value) {
                if ($key === '_meta') {
                    continue;
                }
                $merged[$key] = $value;
            }
        }

        return $merged;
    }

    /**
     * Load one split data-fields part. Keeping this separate lets endpoint-level
     * field lookups avoid decoding every generated data-fields registry part.
     */
    private function loadDataFieldsPart(string $file): array
    {
        $file = basename(trim($file));
        if ($file === '') {
            return [];
        }

        $cacheKey = 'data-fields-part:' . $file;
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        return $this->cache[$cacheKey] = $this->readJsonFile($this->registryDir . '/' . $file);
    }

    /**
     * Return field definitions for a single endpoint without materializing the
     * full split data-fields registry. The split index carries domain hints, so
     * most lookups decode only the relevant part.
     *
     * @return array<int, array<string, mixed>>|null
     */
    private function dataFieldsForEndpoint(string $endpoint): ?array
    {
        $endpoint = trim($endpoint);
        if ($endpoint === '') {
            return null;
        }

        $cacheKey = 'data-fields-endpoint:' . $endpoint;
        if (array_key_exists($cacheKey, $this->cache)) {
            /** @var array<int, array<string, mixed>>|null $cached */
            $cached = $this->cache[$cacheKey];
            return $cached;
        }

        $index = $this->readJsonFile($this->registryDir . '/data-fields.json');
        $parts = $index['parts'] ?? ($index['_meta']['parts'] ?? []);
        if (!is_array($parts) || $parts === []) {
            $fields = is_array($index[$endpoint] ?? null) ? $index[$endpoint] : null;
            $this->cache[$cacheKey] = $fields;
            return $fields;
        }

        $domain = strtolower(strtok($endpoint, '.') ?: '');
        $preferred = [];
        $fallback = [];
        foreach ($parts as $part) {
            if (!is_array($part)) {
                continue;
            }
            $domains = array_map(
                static fn($value): string => strtolower(trim((string)$value)),
                (array)($part['domains'] ?? [])
            );
            if ($domain !== '' && in_array($domain, $domains, true)) {
                $preferred[] = $part;
            } else {
                $fallback[] = $part;
            }
        }

        foreach (array_merge($preferred, $fallback) as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            // SECURITY FIX (INF-006): Validate filename to prevent path traversal in loadDataFieldsPart
            $file = basename($file); // Use only the filename, reject directory traversal
            if ($file === '') {
                continue;
            }
            $payload = $this->loadDataFieldsPart($file);
            if (is_array($payload[$endpoint] ?? null)) {
                $this->cache[$cacheKey] = $payload[$endpoint];
                return $payload[$endpoint];
            }
        }

        $this->cache[$cacheKey] = null;
        return null;
    }

    /**
     * Flush cache (call after admin update to a registry file).
     */
    public function flush(?string $registryName = null): void
    {
        if ($registryName !== null) {
            unset($this->cache[$registryName]);
        } else {
            $this->cache = [];
        }
    }

    /**
     * Return the raw registry payload for callers that need the full document.
     */
    public function raw(string $name): array
    {
        return $this->load($name);
    }

    /* ── Status API ───────────────────────────────────────────────────── */

    /**
     * Get status metadata for a specific value.
     *
     * @return array{value:string, label:string, labelEn:string, color:string, icon:string}
     */
    public function status(string $setKey, string $value): array
    {
        $opts = $this->load('status-options');
        $fallback = ['value' => $value, 'label' => $value, 'labelEn' => $value, 'color' => '#6b7280', 'icon' => ''];

        if (!isset($opts[$setKey]['options']) || !is_array($opts[$setKey]['options'])) {
            return $fallback;
        }

        foreach ($opts[$setKey]['options'] as $opt) {
            if (($opt['value'] ?? '') === $value) {
                return $opt;
            }
        }

        return $fallback;
    }

    /**
     * Get all options for a status set.
     *
     * @return array<int, array{value:string, label:string, labelEn:string, color:string}>
     */
    public function statusSet(string $setKey): array
    {
        $opts = $this->load('status-options');
        return $opts[$setKey]['options'] ?? [];
    }

    /**
     * Get all status set keys.
     *
     * @return string[]
     */
    public function statusSetKeys(): array
    {
        $opts = $this->load('status-options');
        return array_values(array_filter(array_keys($opts), fn(string $k) => $k !== '_meta'));
    }

    /* ── Field API ────────────────────────────────────────────────────── */

    /**
     * Get field definitions for an API endpoint.
     *
     * @return array<int, array{key:string, label:string, labelEn:string, type:string, required:bool}>|null
     */
    public function fields(string $endpoint): ?array
    {
        return $this->dataFieldsForEndpoint($endpoint);
    }

    /**
     * Get a single field definition.
     */
    public function field(string $endpoint, string $fieldKey): ?array
    {
        $list = $this->fields($endpoint);
        if ($list === null) return null;

        foreach ($list as $f) {
            if (($f['key'] ?? '') === $fieldKey) return $f;
        }
        return null;
    }

    /**
     * Get all field types.
     */
    public function fieldTypes(): array
    {
        return $this->load('field-types');
    }

    /* ── Workflow API ──────────────────────────────────────────────────── */

    /**
     * Get workflow definition for an entity type.
     */
    public function workflow(string $entityType): ?array
    {
        $wf = $this->load('workflow-library');
        $wf = $wf['workflows'] ?? $wf;
        $key = strtolower($entityType);

        if (isset($wf[$key])) return $wf[$key];
        if (isset($wf['wf_' . $key])) return $wf['wf_' . $key];

        // Search by entity field
        foreach ($wf as $w) {
            if (is_array($w) && ($w['entity'] ?? '') === $key) return $w;
        }
        return null;
    }

    /**
     * Get a workflow by exact workflow ID.
     */
    public function workflowById(string $workflowId): ?array
    {
        $wf = $this->load('workflow-library');
        $wf = $wf['workflows'] ?? $wf;
        return is_array($wf[$workflowId] ?? null) ? $wf[$workflowId] : null;
    }

    /**
     * Get workflow states for an entity.
     *
     * @return string[]
     */
    public function workflowStates(string $entityType): array
    {
        $wf = $this->workflow($entityType);
        return $wf['states'] ?? [];
    }

    /**
     * Check if a transition is allowed.
     *
     * @return array{allowed:bool, reason:string}
     */
    public function canTransition(string $entityType, string $fromState, string $toState, array $userRoles = []): array
    {
        $wf = $this->workflow($entityType);
        if ($wf === null) {
            return ['allowed' => false, 'reason' => 'Workflow not found: ' . $entityType];
        }

        $lifecycleMode = strtolower(trim((string)($wf['lifecycleMode'] ?? '')));
        if ($lifecycleMode === 'generic_status_only') {
            if ($fromState === $toState) {
                return ['allowed' => false, 'reason' => 'Target state must differ from current state'];
            }

            $statusSet = trim((string)($wf['statusSet'] ?? ''));
            $allowedStates = array_values(array_filter(array_map(
                static fn(array $option): string => (string)$option['value'],
                $this->statusSet($statusSet)
            )));

            if ($allowedStates !== [] && !in_array($toState, $allowedStates, true)) {
                return ['allowed' => false, 'reason' => 'Invalid target state for status set: ' . $statusSet];
            }

            return ['allowed' => true, 'reason' => ''];
        }

        $transitions = $wf['transitions'] ?? [];
        $trans = null;

        // Array format: [{ from, to, guards, ... }]
        if (array_is_list($transitions)) {
            foreach ($transitions as $t) {
                if (($t['from'] ?? '') === $fromState && ($t['to'] ?? '') === $toState) {
                    $trans = $t;
                    break;
                }
            }
        }
        // Object format: { from_state: { to_state: {...} } }
        elseif (isset($transitions[$fromState][$toState])) {
            $trans = $transitions[$fromState][$toState];
        }

        if ($trans === null) {
            return ['allowed' => false, 'reason' => "Invalid transition: {$fromState} → {$toState}"];
        }

        // Check role guards
        foreach ($trans['guards'] ?? [] as $guard) {
            if (($guard['type'] ?? '') === 'role' && !empty($guard['roles'])) {
                $hasRole = !empty(array_intersect($guard['roles'], $userRoles));
                if (!$hasRole) {
                    return ['allowed' => false, 'reason' => 'Required role: ' . implode(', ', $guard['roles'])];
                }
            }
        }

        return ['allowed' => true, 'reason' => ''];
    }

    /**
     * Get available transitions from a state.
     *
     * @return array<int, array{to:string, label:string, allowed:bool, reason:string}>
     */
    public function availableTransitions(string $entityType, string $fromState, array $userRoles = []): array
    {
        $wf = $this->workflow($entityType);
        if ($wf === null) return [];

        $lifecycleMode = strtolower(trim((string)($wf['lifecycleMode'] ?? '')));
        if ($lifecycleMode === 'generic_status_only') {
            $statusSet = trim((string)($wf['statusSet'] ?? ''));
            $result = [];
            foreach ($this->statusSet($statusSet) as $option) {
                if (!is_array($option)) {
                    continue;
                }
                $toState = (string)($option['value'] ?? '');
                if ($toState === '' || $toState === $fromState) {
                    continue;
                }
                $check = $this->canTransition($entityType, $fromState, $toState, $userRoles);
                $result[] = [
                    'to' => $toState,
                    'label' => $option['label'] ?? $toState,
                    'labelEn' => $option['labelEn'] ?? $option['label'] ?? $toState,
                    'allowed' => $check['allowed'],
                    'reason' => $check['reason'],
                ];
            }
            return $result;
        }

        $transitions = $wf['transitions'] ?? [];
        $result = [];

        if (array_is_list($transitions)) {
            foreach ($transitions as $t) {
                if (($t['from'] ?? '') !== $fromState) continue;
                $check = $this->canTransition($entityType, $fromState, $t['to'], $userRoles);
                $result[] = [
                    'to'      => $t['to'],
                    'label'   => $t['label'] ?? $t['to'],
                    'labelEn' => $t['labelEn'] ?? $t['label'] ?? $t['to'],
                    'allowed' => $check['allowed'],
                    'reason'  => $check['reason'],
                ];
            }
        } elseif (isset($transitions[$fromState]) && is_array($transitions[$fromState])) {
            foreach ($transitions[$fromState] as $toState => $t) {
                $check = $this->canTransition($entityType, $fromState, $toState, $userRoles);
                $result[] = [
                    'to'      => $toState,
                    'label'   => $t['label'] ?? $toState,
                    'labelEn' => $t['labelEn'] ?? $t['label'] ?? $toState,
                    'allowed' => $check['allowed'],
                    'reason'  => $check['reason'],
                ];
            }
        }

        return $result;
    }

    /* ── Validation API ───────────────────────────────────────────────── */

    /**
     * Validate a field value against registry rules.
     *
     * @return array{valid:bool, message:string, severity:string}
     */
    public function validate(string $entity, string $field, mixed $value): array
    {
        $rules = $this->load('validation-rules');
        $ruleList = array_is_list($rules) ? $rules : ($rules['rules'] ?? []);

        foreach ($ruleList as $rule) {
            if (($rule['entity'] ?? '') !== $entity || ($rule['field'] ?? '') !== $field) continue;

            $p = $rule['params'] ?? [];
            $fail = false;

            switch ($rule['type'] ?? '') {
                case 'required':
                    if ($value === null || $value === '' || (is_array($value) && empty($value))) $fail = true;
                    break;
                case 'minLength':
                    if (is_string($value) && mb_strlen($value) < ($p['min'] ?? 0)) $fail = true;
                    break;
                case 'maxLength':
                    if (is_string($value) && mb_strlen($value) > ($p['max'] ?? PHP_INT_MAX)) $fail = true;
                    break;
                case 'range':
                    $num = is_numeric($value) ? (float)$value : null;
                    if ($num === null || $num < ($p['min'] ?? -PHP_FLOAT_MAX) || $num > ($p['max'] ?? PHP_FLOAT_MAX)) $fail = true;
                    break;
                case 'pattern':
                    if (isset($p['regex']) && is_string($value)) {
                        if (!@preg_match('/' . $p['regex'] . '/', $value)) $fail = true;
                    }
                    break;
                case 'enum':
                    if (isset($p['values']) && !in_array($value, $p['values'], true)) $fail = true;
                    break;
            }

            if ($fail) {
                return [
                    'valid'    => false,
                    'message'  => $rule['message'] ?? "Field {$field} is invalid",
                    'messageEn'=> $rule['messageEn'] ?? "Field {$field} is invalid",
                    'severity' => $rule['severity'] ?? 'error',
                ];
            }
        }

        return ['valid' => true, 'message' => '', 'severity' => 'info'];
    }

    /* ── Formula API ──────────────────────────────────────────────────── */

    /**
     * Get formula definition.
     */
    public function formula(string $formulaId): ?array
    {
        $formulas = $this->load('computed-formulas');

        if (array_is_list($formulas)) {
            foreach ($formulas as $f) {
                if (($f['formulaId'] ?? $f['id'] ?? '') === $formulaId) return $f;
            }
            return null;
        }

        return $formulas[$formulaId] ?? null;
    }

    /**
     * Get all formulas, optionally filtered by category.
     */
    public function formulas(?string $category = null): array
    {
        $f = $this->load('computed-formulas');
        $list = array_is_list($f) ? $f : array_values(array_filter($f, fn($v) => is_array($v)));

        if ($category !== null) {
            return array_values(array_filter($list, fn(array $item) => ($item['category'] ?? '') === $category));
        }
        return $list;
    }

    /**
     * Get endpoint catalog list.
     *
     * @return array<int, array<string, mixed>>
     */
    public function endpointCatalog(): array
    {
        $catalog = $this->load('endpoint-catalog');
        if (array_is_list($catalog)) {
            return $catalog;
        }

        if (isset($catalog['endpoints']) && is_array($catalog['endpoints'])) {
            return array_values($catalog['endpoints']);
        }

        return array_values(array_filter($catalog, static fn($value, $key) => $key !== '_meta' && is_array($value), ARRAY_FILTER_USE_BOTH));
    }

    /**
     * Get a single endpoint definition by action key.
     */
    public function endpoint(string $action): ?array
    {
        $catalog = $this->load('endpoint-catalog');
        if (isset($catalog['endpoints'][$action]) && is_array($catalog['endpoints'][$action])) {
            return $catalog['endpoints'][$action];
        }

        return is_array($catalog[$action] ?? null) ? $catalog[$action] : null;
    }

    /**
     * Get workflow runtime metadata for a transition endpoint.
     *
     * @return array<string, mixed>
     */
    public function transitionRuntime(string $domain, string $tableName): array
    {
        $action = strtolower(trim($domain)) . '.' . strtolower(trim($tableName)) . '.transition';
        $endpoint = $this->endpoint($action);
        if (!is_array($endpoint)) {
            return [];
        }

        $runtime = $endpoint['capabilities']['workflow_runtime']
            ?? $endpoint['workflow']['runtime']
            ?? [];

        return is_array($runtime) ? $runtime : [];
    }

    /**
     * Get the frontend foundation catalog or a single entity contract.
     *
     * @return array<string, mixed>
     */
    public function frontendFoundation(?string $entityKey = null): array
    {
        $catalog = $this->load('frontend-foundation-catalog');
        if (!is_array($catalog)) {
            return [];
        }

        if ($entityKey === null || trim($entityKey) === '') {
            return $catalog;
        }

        $entities = $catalog['entities'] ?? [];
        if (!is_array($entities)) {
            return [];
        }

        $normalized = strtolower(trim($entityKey));
        $contract = $entities[$normalized] ?? null;

        return is_array($contract) ? $contract : [];
    }

    /**
     * Get the frontend foundation contract for a specific table.
     *
     * @return array<string, mixed>
     */
    public function frontendFoundationEntity(string $domain, string $tableName): array
    {
        $entityKey = strtolower(trim($domain)) . '.' . strtolower(trim($tableName));
        return $this->frontendFoundation($entityKey);
    }

    /**
     * Get the runtime access policy, optionally narrowed to a domain or table.
     *
     * @return array<string, mixed>
     */
    public function runtimeAccessPolicy(?string $domain = null, ?string $tableName = null): array
    {
        $policy = $this->load('runtime-access-policy');
        if (!is_array($policy)) {
            return [];
        }

        if ($tableName !== null && trim($tableName) !== '') {
            $tables = $policy['tables'] ?? [];
            $normalized = strtolower(trim($tableName));
            $override = $tables[$normalized] ?? null;
            return is_array($override) ? $override : [];
        }

        if ($domain !== null && trim($domain) !== '') {
            $domains = $policy['domains'] ?? [];
            $normalized = strtolower(trim($domain));
            $domainPolicy = $domains[$normalized] ?? null;
            return is_array($domainPolicy) ? $domainPolicy : [];
        }

        return $policy;
    }

    /**
     * Get the registry quality report including publishability metadata.
     *
     * @return array<string, mixed>
     */
    public function qualityReport(): array
    {
        $report = $this->load('registry-quality-report');
        return is_array($report) ? $report : [];
    }

    /* ── Domain Packs API ─────────────────────────────────────────────── */

    /**
     * Get domain field packs.
     */
    public function packs(?string $module = null): array
    {
        $p = $this->load('domain-field-packs');
        $list = array_is_list($p) ? $p : ($p['packs'] ?? array_values(array_filter($p, fn($v) => is_array($v))));

        if ($module !== null) {
            return array_values(array_filter($list, fn(array $pack) => ($pack['module'] ?? '') === $module));
        }
        return $list;
    }

    /* ── Relations API ────────────────────────────────────────────────── */

    /**
     * Get entity relations.
     */
    public function relations(?string $entity = null): array
    {
        $r = $this->load('relation-map');
        $list = array_is_list($r) ? $r : ($r['relations'] ?? $r['edges'] ?? []);

        if ($entity !== null) {
            return array_values(array_filter($list, function (array $rel) use ($entity) {
                return ($rel['from']['entity'] ?? '') === $entity
                    || ($rel['to']['entity'] ?? '') === $entity;
            }));
        }
        return $list;
    }
}
