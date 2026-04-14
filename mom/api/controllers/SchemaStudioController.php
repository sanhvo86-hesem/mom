<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use MOM\Services\DataSchemaService;
use PDO;
use RuntimeException;
use Throwable;

class SchemaStudioController extends BaseController
{
    private const DESIGN_SAVE_MAX_BYTES = 6291456;
    private const SYSTEM_DESIGN_ID = 'workspace';
    private const SYSTEM_REGISTRY_DESIGN_ID = 'system_contract_registry';

    private string $studioDir;
    private string $designDir;
    private string $snapshotDir;
    private string $exportDir;
    private string $releaseDir;
    private string $compilerDir;

    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);
        $this->studioDir = $this->dataDir . '/schema-studio';
        $this->designDir = $this->studioDir . '/designs';
        $this->snapshotDir = $this->studioDir . '/snapshots';
        $this->exportDir = $this->studioDir . '/exports';
        $this->releaseDir = $this->studioDir . '/releases';
        $this->compilerDir = $this->studioDir . '/compiler';
        $this->ensureDir($this->studioDir);
        $this->ensureDir($this->designDir);
        $this->ensureDir($this->snapshotDir);
        $this->ensureDir($this->exportDir);
        $this->ensureDir($this->releaseDir);
        $this->ensureDir($this->compilerDir);
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
        // Live DB surfaces must stay narrower than the general schema control plane.
        // Do not reuse admin_roles() here because legacy aliases such as qms_supervisor
        // normalize into qms_engineer and would silently widen database access.
        $this->requireAnyRole($user, ['admin', 'it_admin', 'ceo', 'qa_manager', 'developer']);
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

    private function normalizeDesignId(string $designId): string
    {
        $clean = preg_replace('/[^A-Za-z0-9_-]+/', '_', trim($designId));
        $clean = trim($clean, '_');
        if ($clean === '') {
            throw new RuntimeException('Design ID cannot be empty or contain only invalid characters');
        }
        if (strlen($clean) > 255) {
            throw new RuntimeException('Design ID is too long (max 255 characters)');
        }
        return $clean;
    }

    private function isReadOnlyDesignId(string $designId): bool
    {
        return $this->normalizeDesignId($designId) === self::SYSTEM_REGISTRY_DESIGN_ID;
    }

    private function requireEditableDesign(string $designId): string
    {
        $id = $this->normalizeDesignId($designId);
        if ($id === self::SYSTEM_REGISTRY_DESIGN_ID) {
            $this->error(
                'read_only_schema_layer',
                409,
                'System Contract Registry is a read-only authority view. Edit the workspace design or promote changes through migrations/registry generation.'
            );
        }
        return $id;
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

    private function releasePath(string $id): string
    {
        return $this->releaseDir . '/' . $this->safeId($id, 'schema_release') . '.json';
    }

    private function compilerBundlePath(string $id): string
    {
        return $this->compilerDir . '/' . $this->safeId($id, 'schema_compiler') . '.json';
    }

    private function registryDirPath(): string
    {
        $dir = $this->dataDir . '/registry';
        $this->ensureDir($dir);
        return $dir;
    }

    private function humanizeKey(string $value): string
    {
        $label = str_replace(['_', '-'], ' ', trim($value));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        return ucwords($label);
    }

    private function dataSchemaOperationalState(): array
    {
        $service = new DataSchemaService($this->data, $this->dataDir, $this->rootDir);
        $workspace = $service->getWorkspace();
        return is_array($workspace['operational'] ?? null) ? $workspace['operational'] : [];
    }

    private function enforceReleaseGate(): void
    {
        $operational = $this->dataSchemaOperationalState();
        $releaseGate = is_array($operational['releaseGate'] ?? null) ? $operational['releaseGate'] : [];
        if (!empty($releaseGate['blocking'])) {
            $this->error('release_gate_blocked', 409, 'Resolve blocking operational risks before creating a release bundle.', [
                'release_gate' => $releaseGate,
                'operational' => $operational,
            ]);
        }
    }

    private function savePolicy(): array
    {
        return [
            'requiresRevision' => true,
            'maxPayloadBytes' => self::DESIGN_SAVE_MAX_BYTES,
            'conflictMode' => 'reject_stale_write',
            'auditTrail' => true,
        ];
    }

    private function ensureSavePayloadLimit(): void
    {
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > self::DESIGN_SAVE_MAX_BYTES) {
            $this->error('payload_too_large', 413, null, [
                'maxBytes' => self::DESIGN_SAVE_MAX_BYTES,
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

    /**
     * @return array<string, mixed>
     */
    private function currentDesignRevisions(string $designId): array
    {
        $designId = $this->normalizeDesignId($designId);
        if ($designId === self::SYSTEM_REGISTRY_DESIGN_ID) {
            return [
                'designId' => $designId,
                'capturedAt' => $this->nowIso(),
                'readOnly' => true,
                'files' => [
                    'design' => $this->fileRevision($this->registryDirPath() . '/table-registry.json'),
                    'baseline' => $this->fileRevision($this->registryDirPath() . '/schema-authority-summary.json'),
                    'relation_map' => $this->fileRevision($this->registryDirPath() . '/relation-map.json'),
                    'domain_architecture' => $this->fileRevision($this->registryDirPath() . '/domain-architecture.json'),
                ],
            ];
        }

        return [
            'designId' => $designId,
            'capturedAt' => $this->nowIso(),
            'files' => [
                'design' => $this->fileRevision($this->designPath($designId)),
                'baseline' => $this->fileRevision($this->baselinePath($designId)),
            ],
        ];
    }

    /**
     * @param list<string> $scopes
     */
    private function requiresRevisionToken(array $current, array $scopes): bool
    {
        $files = is_array($current['files'] ?? null) ? $current['files'] : [];
        foreach ($scopes as $scope) {
            $file = is_array($files[$scope] ?? null) ? $files[$scope] : [];
            if (!empty($file['exists'])) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param list<string> $scopes
     */
    private function revisionsMatch(array $expected, array $current, array $scopes): bool
    {
        if ((string)($expected['designId'] ?? '') !== (string)($current['designId'] ?? '')) {
            return false;
        }

        $expectedFiles = is_array($expected['files'] ?? null) ? $expected['files'] : [];
        $currentFiles = is_array($current['files'] ?? null) ? $current['files'] : [];

        foreach ($scopes as $scope) {
            $expectedFile = is_array($expectedFiles[$scope] ?? null) ? $expectedFiles[$scope] : null;
            $currentFile = is_array($currentFiles[$scope] ?? null) ? $currentFiles[$scope] : null;
            if ($expectedFile === null || $currentFile === null) {
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

    /**
     * @param list<string> $scopes
     * @return array<string, mixed>
     */
    private function assertRevisionToken(string $designId, mixed $revision, array $scopes): array
    {
        $current = $this->currentDesignRevisions($designId);
        if (!$this->requiresRevisionToken($current, $scopes)) {
            return $current;
        }
        if (!is_array($revision)) {
            $this->error('missing_design_revision_token', 409, 'Reload the design workspace before writing artifacts.', [
                'current_revisions' => $current,
                'save_policy' => $this->savePolicy(),
            ]);
        }
        if (!$this->revisionsMatch($revision, $current, $scopes)) {
            $this->error('stale_design_workspace_revision', 409, 'This design workspace changed on the server. Reload the latest design/baseline before continuing.', [
                'current_revisions' => $current,
                'save_policy' => $this->savePolicy(),
            ]);
        }

        return $current;
    }

    private function inferLayerForTable(array $schema, array $table): string
    {
        $tableId = (string)($table['id'] ?? '');
        foreach ((array)($schema['groups'] ?? []) as $group) {
            if (!is_array($group)) {
                continue;
            }
            $tableIds = is_array($group['table_ids'] ?? null) ? $group['table_ids'] : [];
            if ($tableId !== '' && in_array($tableId, $tableIds, true)) {
                return (string)($group['name'] ?? 'Foundation');
            }
        }

        $domain = strtolower((string)($table['domain'] ?? ''));
        $map = [
            'foundation' => 'Foundation',
            'core_system' => 'Foundation',
            'master_data' => 'Master Data',
            'master_data_governance' => 'Master Data',
            'engineering' => 'Engineering',
            'planning_erp' => 'Planning ERP',
            'mes_execution' => 'MES Execution',
            'production' => 'MES Execution',
            'inventory_traceability' => 'Inventory Traceability',
            'inventory' => 'Inventory Traceability',
            'eqms_compliance' => 'eQMS Compliance',
            'quality_management' => 'eQMS Compliance',
            'compliance' => 'eQMS Compliance',
            'document_control' => 'eQMS Compliance',
        ];
        return $map[$domain] ?? ($domain !== '' ? $this->humanizeKey($domain) : 'Foundation');
    }

    private function canonicalCapabilities(): array
    {
        return [
            ['key' => 'organization', 'label' => 'Organization / Site / Plant', 'patterns' => ['organization', 'site', 'plant', 'line', 'workcenter', 'machine'], 'critical' => true],
            ['key' => 'item_bom_routing', 'label' => 'Item / Revision / BOM / Routing', 'patterns' => ['item', 'revision', 'bom', 'routing', 'operation'], 'critical' => true],
            ['key' => 'production_execution', 'label' => 'Work Order / Production Execution', 'patterns' => ['work_order', 'production_order', 'dispatch', 'execution', 'labor_log', 'machine_log'], 'critical' => true],
            ['key' => 'quality_execution', 'label' => 'Quality Plan / Inspection / Measurement', 'patterns' => ['quality_plan', 'inspection_lot', 'inspection', 'characteristic', 'measurement'], 'critical' => true],
            ['key' => 'nc_capa', 'label' => 'NC / CAPA / Deviation / Concession', 'patterns' => ['nonconformance', 'nc_', 'capa', 'deviation', 'concession'], 'critical' => true],
            ['key' => 'document_training_competency', 'label' => 'Document / Training / Competency', 'patterns' => ['document', 'training', 'competency'], 'critical' => false],
            ['key' => 'calibration_maintenance', 'label' => 'Calibration / Maintenance', 'patterns' => ['calibration', 'maintenance', 'equipment'], 'critical' => false],
            ['key' => 'supplier_customer_inventory', 'label' => 'Supplier / Customer / Inventory', 'patterns' => ['supplier', 'customer', 'inventory', 'warehouse', 'stock'], 'critical' => true],
            ['key' => 'traceability', 'label' => 'Lot / Serial / Traceability / Genealogy', 'patterns' => ['lot', 'serial', 'traceability', 'genealogy'], 'critical' => true],
            ['key' => 'approval_audit_event', 'label' => 'Approval / E-Signature / Audit / Alarm', 'patterns' => ['approval', 'electronic_signature', 'signature', 'audit', 'event', 'alarm'], 'critical' => true],
        ];
    }

    private function tableMatchesCapability(array $table, array $capability): bool
    {
        $tokens = strtolower(implode(' ', array_filter([
            (string)($table['name'] ?? ''),
            (string)($table['comment'] ?? ''),
            (string)($table['domain'] ?? ''),
            (string)($table['labels']['vi'] ?? ''),
            (string)($table['labels']['en'] ?? ''),
            (string)($table['business']['business_name_vi'] ?? ''),
            (string)($table['business']['business_name_en'] ?? ''),
            (string)($table['canonical']['object_key'] ?? ''),
            implode(' ', is_array($table['tags'] ?? null) ? $table['tags'] : []),
        ])));
        foreach ((array)($capability['patterns'] ?? []) as $pattern) {
            if ($pattern !== '' && strpos($tokens, strtolower((string)$pattern)) !== false) {
                return true;
            }
        }
        return false;
    }

    private function normalizeEnterpriseSchema(array $schema, string $actor = 'system'): array
    {
        $schema = $this->reconcileSchemaDocument($schema);
        $schema['_meta'] = is_array($schema['_meta'] ?? null) ? $schema['_meta'] : [];
        $schema['_meta']['enterprise'] = array_merge([
            'profile' => 'hesem_schema_studio_enterprise',
            'lifecycle' => 'draft',
            'change_request_id' => '',
            'approval_class' => 'standard',
            'environment' => 'workspace',
            'branch_key' => 'main',
            'effective_from' => '',
            'effective_until' => '',
            'canonical_model' => 'erp_mes_eqms_7layer',
            'compiler_version' => '2026.04.enterprise',
            'release_notes' => '',
        ], is_array($schema['_meta']['enterprise'] ?? null) ? $schema['_meta']['enterprise'] : []);
        if (!isset($schema['_meta']['enterprise']['governance']) || !is_array($schema['_meta']['enterprise']['governance'])) {
            $schema['_meta']['enterprise']['governance'] = [
                'owner' => $actor,
                'stewards' => [],
                'approvers' => [],
                'reviewers' => [],
                'required_evidence' => [],
                'electronic_signature_required' => false,
                'last_reviewed_at' => '',
            ];
        }

        if (!isset($schema['views']) || !is_array($schema['views'])) {
            $schema['views'] = [];
        }
        if (!isset($schema['securityPolicies']) || !is_array($schema['securityPolicies'])) {
            $schema['securityPolicies'] = [];
        }
        if (!isset($schema['releaseBundles']) || !is_array($schema['releaseBundles'])) {
            $schema['releaseBundles'] = [];
        }
        if (!isset($schema['runtimeProjections']) || !is_array($schema['runtimeProjections'])) {
            $schema['runtimeProjections'] = [];
        }

        foreach ($schema['tables'] as &$table) {
            if (!is_array($table)) {
                continue;
            }
            $layer = $this->inferLayerForTable($schema, $table);
            $table['labels'] = array_merge([
                'vi' => $this->humanizeKey((string)($table['name'] ?? 'table')),
                'en' => $this->humanizeKey((string)($table['name'] ?? 'table')),
                'technical' => (string)($table['name'] ?? ''),
            ], is_array($table['labels'] ?? null) ? $table['labels'] : []);
            $table['business'] = array_merge([
                'business_name_vi' => (string)($table['labels']['vi'] ?? $this->humanizeKey((string)($table['name'] ?? 'table'))),
                'business_name_en' => (string)($table['labels']['en'] ?? $this->humanizeKey((string)($table['name'] ?? 'table'))),
                'domain' => (string)($table['domain'] ?? 'default'),
                'subdomain' => '',
                'manufacturing_semantics' => '',
                'qms_semantics' => '',
                'glossary_links' => [],
                'tags' => is_array($table['tags'] ?? null) ? array_values($table['tags']) : [],
            ], is_array($table['business'] ?? null) ? $table['business'] : []);
            $table['ui'] = array_merge([
                'icon' => 'fa-table',
                'default_widget' => 'grid',
                'preferred_card_density' => 'comfortable',
                'saved_view_ids' => [],
                'inspector_sections' => ['business', 'physical', 'security', 'integration'],
            ], is_array($table['ui'] ?? null) ? $table['ui'] : []);
            $table['validation'] = array_merge([
                'profile' => 'enterprise_default',
                'rules' => [],
                'required_approvals' => [],
                'destructive_firewall_exemptions' => [],
            ], is_array($table['validation'] ?? null) ? $table['validation'] : []);
            $table['reporting'] = array_merge([
                'subject_area' => (string)($table['domain'] ?? 'default'),
                'grain' => 'transaction',
                'dimensions' => [],
                'measures' => [],
                'lifecycle_stage' => 'active',
            ], is_array($table['reporting'] ?? null) ? $table['reporting'] : []);
            $table['integration'] = array_merge([
                'api_contracts' => [],
                'workflow_bindings' => [],
                'event_topics' => [],
                'digital_thread_links' => [],
            ], is_array($table['integration'] ?? null) ? $table['integration'] : []);
            $table['governance'] = array_merge([
                'owner' => '',
                'steward' => '',
                'approver_role' => '',
                'classification' => 'internal',
                'reason_codes' => [],
                'review_evidence' => [],
            ], is_array($table['governance'] ?? null) ? $table['governance'] : []);
            $table['security'] = array_merge([
                'sensitivity' => !empty($table['rls_enabled']) ? 'confidential' : 'internal',
                'masking' => [],
                'roles' => [],
                'policy_refs' => array_values(array_filter(array_map(static function ($item): string {
                    if (!is_array($item)) {
                        return '';
                    }
                    return (string)($item['key'] ?? $item['name'] ?? $item['id'] ?? '');
                }, is_array($table['policies'] ?? null) ? $table['policies'] : []))),
            ], is_array($table['security'] ?? null) ? $table['security'] : []);
            $table['canonical'] = array_merge([
                'layer' => $layer,
                'layer_code' => $this->safeId($layer, 'foundation'),
                'object_key' => $this->safeId((string)($table['name'] ?? 'table'), 'table'),
                'capability' => (string)($table['domain'] ?? 'default'),
                'canonical_status' => 'candidate',
                'lineage_targets' => [],
            ], is_array($table['canonical'] ?? null) ? $table['canonical'] : []);
            $table['performance'] = array_merge([
                'partition_strategy' => (string)($table['partitioning'] ?? ''),
                'expected_volume' => '',
                'access_pattern' => '',
                'online_migration_notes' => [],
            ], is_array($table['performance'] ?? null) ? $table['performance'] : []);
            $table['lifecycle'] = array_merge([
                'stage' => 'active',
                'deprecated_at' => '',
                'effective_from' => '',
                'effective_until' => '',
            ], is_array($table['lifecycle'] ?? null) ? $table['lifecycle'] : []);

            $table['columns'] = array_values(is_array($table['columns'] ?? null) ? $table['columns'] : []);
            foreach ($table['columns'] as &$column) {
                if (!is_array($column)) {
                    continue;
                }
                $column['labels'] = array_merge([
                    'vi' => $this->humanizeKey((string)($column['name'] ?? 'column')),
                    'en' => $this->humanizeKey((string)($column['name'] ?? 'column')),
                    'technical' => (string)($column['name'] ?? ''),
                ], is_array($column['labels'] ?? null) ? $column['labels'] : []);
                $column['business'] = array_merge([
                    'business_name_vi' => (string)($column['labels']['vi'] ?? $this->humanizeKey((string)($column['name'] ?? 'column'))),
                    'business_name_en' => (string)($column['labels']['en'] ?? $this->humanizeKey((string)($column['name'] ?? 'column'))),
                    'glossary_links' => [],
                    'semantics' => '',
                    'unit' => '',
                ], is_array($column['business'] ?? null) ? $column['business'] : []);
                $column['ui'] = array_merge([
                    'widget' => '',
                    'placeholder' => '',
                    'readonly_intent' => false,
                    'hidden_intent' => false,
                    'list_badge' => false,
                ], is_array($column['ui'] ?? null) ? $column['ui'] : []);
                $column['validation'] = array_merge([
                    'rules' => [],
                    'required_if' => [],
                    'format_hint' => '',
                    'quality_gate' => '',
                ], is_array($column['validation'] ?? null) ? $column['validation'] : []);
                $column['reporting'] = array_merge([
                    'dimension' => false,
                    'measure' => false,
                    'sort_priority' => null,
                    'searchable' => true,
                ], is_array($column['reporting'] ?? null) ? $column['reporting'] : []);
                $column['integration'] = array_merge([
                    'api_name' => (string)($column['name'] ?? ''),
                    'external_keys' => [],
                    'source_systems' => [],
                ], is_array($column['integration'] ?? null) ? $column['integration'] : []);
                $column['security'] = array_merge([
                    'sensitivity' => !empty($column['primary_key']) ? 'internal' : '',
                    'mask_strategy' => '',
                    'pii' => false,
                ], is_array($column['security'] ?? null) ? $column['security'] : []);
            }
            unset($column);
        }
        unset($table);

        $schema['relations'] = array_values(is_array($schema['relations'] ?? null) ? $schema['relations'] : []);
        foreach ($schema['relations'] as &$relation) {
            if (!is_array($relation)) {
                continue;
            }
            $relation['labels'] = array_merge([
                'vi' => $this->humanizeKey((string)($relation['name'] ?? 'relation')),
                'en' => $this->humanizeKey((string)($relation['name'] ?? 'relation')),
            ], is_array($relation['labels'] ?? null) ? $relation['labels'] : []);
            $relation['runtime'] = array_merge([
                'contract_key' => $this->safeId((string)($relation['name'] ?? $relation['id'] ?? 'relation'), 'relation'),
                'cascade_profile' => (string)($relation['on_delete'] ?? 'RESTRICT'),
                'sync_mode' => 'runtime',
            ], is_array($relation['runtime'] ?? null) ? $relation['runtime'] : []);
            $relation['governance'] = array_merge([
                'owner' => '',
                'review_required' => false,
                'approval_class' => 'standard',
            ], is_array($relation['governance'] ?? null) ? $relation['governance'] : []);
            $relation['integration'] = array_merge([
                'digital_thread' => false,
                'workflow_bindings' => [],
            ], is_array($relation['integration'] ?? null) ? $relation['integration'] : []);
        }
        unset($relation);

        return $schema;
    }

    private function countPolicies(array $schema): int
    {
        $count = is_array($schema['securityPolicies'] ?? null) ? count($schema['securityPolicies']) : 0;
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (is_array($table)) {
                $count += count((array)($table['policies'] ?? []));
            }
        }
        return $count;
    }

    private function tableMetadataScore(array $table): int
    {
        $labels = is_array($table['labels'] ?? null) ? $table['labels'] : [];
        $business = is_array($table['business'] ?? null) ? $table['business'] : [];
        $governance = is_array($table['governance'] ?? null) ? $table['governance'] : [];
        $security = is_array($table['security'] ?? null) ? $table['security'] : [];
        $ui = is_array($table['ui'] ?? null) ? $table['ui'] : [];
        $canonical = is_array($table['canonical'] ?? null) ? $table['canonical'] : [];
        $reporting = is_array($table['reporting'] ?? null) ? $table['reporting'] : [];
        $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];

        $checks = 10;
        $points = 0;
        if (trim((string)($labels['vi'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($labels['en'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($business['business_name_vi'] ?? '')) !== '' || trim((string)($business['business_name_en'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($table['domain'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($canonical['layer'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($governance['owner'] ?? '')) !== '' || trim((string)($governance['steward'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($security['sensitivity'] ?? '')) !== '' || !empty($table['rls_enabled'])) {
            $points++;
        }
        if (trim((string)($ui['default_widget'] ?? '')) !== '' || trim((string)($ui['icon'] ?? '')) !== '') {
            $points++;
        }
        if (trim((string)($reporting['subject_area'] ?? '')) !== '') {
            $points++;
        }
        if (!empty($integration['workflow_bindings']) || !empty($integration['workflow_id']) || !empty($table['tags']) || trim((string)($business['manufacturing_semantics'] ?? '')) !== '') {
            $points++;
        }

        return (int)round(($points / max(1, $checks)) * 100);
    }

    private function tableWorkflowCandidate(array $table): bool
    {
        $tokens = strtolower(implode(' ', array_filter([
            (string)($table['name'] ?? ''),
            (string)($table['domain'] ?? ''),
            (string)($table['labels']['vi'] ?? ''),
            (string)($table['labels']['en'] ?? ''),
            (string)($table['business']['manufacturing_semantics'] ?? ''),
            (string)($table['business']['qms_semantics'] ?? ''),
        ])));

        return (bool)preg_match('/approval|inspection|quality|audit|capa|deviation|dispatch|execution|order|maintenance|calibration|training|conformance/', $tokens);
    }

    private function relationDensityScore(int $tableCount, int $relationCount): int
    {
        if ($tableCount <= 1) {
            return 100;
        }
        if ($relationCount === 0) {
            return $tableCount > 2 ? 20 : 60;
        }

        $perTable = ($relationCount * 2) / max(1, $tableCount);
        $target = 3.0;
        $distance = abs($perTable - $target);
        $score = 100 - min(100, $distance * 18);

        if ($perTable < 1.2) {
            $score -= 20;
        } elseif ($perTable < 2.0) {
            $score -= 6;
        }
        if ($perTable > 5.6) {
            $score -= 12;
        } elseif ($perTable > 4.6) {
            $score -= 6;
        }

        return max(0, min(100, (int)round($score)));
    }

    private function metadataCompletenessPercent(array $schema): int
    {
        $tables = array_values(array_filter((array)($schema['tables'] ?? []), 'is_array'));
        if ($tables === []) {
            return 100;
        }

        $total = 0;
        foreach ($tables as $table) {
            $total += $this->tableMetadataScore($table);
        }

        return max(0, min(100, (int)round($total / count($tables))));
    }

    private function workflowCoveragePercent(array $schema): int
    {
        $tables = array_values(array_filter((array)($schema['tables'] ?? []), 'is_array'));
        if ($tables === []) {
            return 100;
        }

        $candidateCount = 0;
        $boundCount = 0;
        foreach ($tables as $table) {
            $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
            $hasBinding = trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0;
            $isCandidate = $hasBinding || $this->tableWorkflowCandidate($table);
            if ($isCandidate) {
                $candidateCount++;
                if ($hasBinding) {
                    $boundCount++;
                }
            }
        }

        if ($candidateCount === 0) {
            foreach ($tables as $table) {
                $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
                if (trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0) {
                    $boundCount++;
                }
            }
            $candidateCount = count($tables);
        }

        return max(0, min(100, (int)round(($boundCount / max(1, $candidateCount)) * 100)));
    }

    private function orphanRelationRiskCount(array $schema): int
    {
        $tableIds = [];
        $columnIds = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableId = (string)($table['id'] ?? '');
            if ($tableId !== '') {
                $tableIds[$tableId] = true;
            }
            foreach ((array)($table['columns'] ?? []) as $column) {
                if (!is_array($column)) {
                    continue;
                }
                $columnId = (string)($column['id'] ?? '');
                if ($columnId !== '') {
                    $columnIds[$columnId] = true;
                }
            }
        }

        $riskCount = 0;
        foreach ((array)($schema['relations'] ?? []) as $relation) {
            if (!is_array($relation)) {
                continue;
            }
            $fromTableId = (string)($relation['from_table_id'] ?? '');
            $toTableId = (string)($relation['to_table_id'] ?? '');
            $fromColId = (string)($relation['from_col_id'] ?? '');
            $toColId = (string)($relation['to_col_id'] ?? '');
            if ($fromTableId === '' || $toTableId === '' || $fromColId === '' || $toColId === '' || !isset($tableIds[$fromTableId], $tableIds[$toTableId], $columnIds[$fromColId], $columnIds[$toColId])) {
                $riskCount++;
            }
        }

        return $riskCount;
    }


    private function percentage(int $numerator, int $denominator, int $whenZero = 100): int
    {
        if ($denominator <= 0) {
            return max(0, min(100, $whenZero));
        }

        return max(0, min(100, (int)round(($numerator / $denominator) * 100)));
    }

    private function buildDomainDiagnostics(array $schema, array $hotspots, array $relationTouchMap): array
    {
        $groups = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $domain = trim((string)($table['domain'] ?? 'default'));
            if ($domain === '') {
                $domain = 'default';
            }
            if (!isset($groups[$domain])) {
                $groups[$domain] = [
                    'tables' => [],
                    'layers' => [],
                ];
            }
            $groups[$domain]['tables'][] = $table;
            $layer = trim((string)($table['canonical']['layer'] ?? $this->inferLayerForTable($schema, $table)));
            if ($layer !== '') {
                $groups[$domain]['layers'][$layer] = true;
            }
        }

        $hotspotCountByDomain = [];
        foreach ($hotspots as $item) {
            if (!is_array($item)) {
                continue;
            }
            $domain = trim((string)($item['domain'] ?? 'default'));
            if ($domain === '') {
                $domain = 'default';
            }
            if ((int)($item['score'] ?? 0) >= 12) {
                $hotspotCountByDomain[$domain] = (int)($hotspotCountByDomain[$domain] ?? 0) + 1;
            }
        }

        $palette = [
            'foundation' => '#0f766e',
            'master_data' => '#0284c7',
            'planning_erp' => '#d97706',
            'mes_execution' => '#7c3aed',
            'inventory_traceability' => '#15803d',
            'eqms_compliance' => '#be123c',
            'engineering' => '#475569',
        ];

        $rows = [];
        foreach ($groups as $domain => $group) {
            $tables = array_values(array_filter((array)$group['tables'], 'is_array'));
            $tableCount = count($tables);
            if ($tableCount === 0) {
                continue;
            }

            $metadataTotal = 0;
            $workflowCandidates = 0;
            $workflowBound = 0;
            $ownershipCount = 0;
            $relationTouchCount = 0;
            $policyCount = 0;
            $rlsTableCount = 0;
            $representative = [];

            foreach ($tables as $table) {
                $metadataTotal += $this->tableMetadataScore($table);
                $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
                $hasBinding = trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0;
                $candidate = $hasBinding || $this->tableWorkflowCandidate($table);
                if ($candidate) {
                    $workflowCandidates++;
                    if ($hasBinding) {
                        $workflowBound++;
                    }
                }
                $governance = is_array($table['governance'] ?? null) ? $table['governance'] : [];
                if (trim((string)($governance['owner'] ?? '')) !== '' || trim((string)($governance['steward'] ?? '')) !== '') {
                    $ownershipCount++;
                }
                if (!empty($table['rls_enabled'])) {
                    $rlsTableCount++;
                }
                $policyCount += count((array)($table['policies'] ?? [])) + count((array)($table['security']['policy_refs'] ?? []));
                $relationTouch = (int)($relationTouchMap[(string)($table['id'] ?? '')] ?? 0);
                $relationTouchCount += $relationTouch;
                $representative[] = [
                    'table' => (string)($table['name'] ?? ''),
                    'relationTouch' => $relationTouch,
                    'metadataScore' => $this->tableMetadataScore($table),
                ];
            }

            usort($representative, static fn(array $a, array $b): int => [$b['relationTouch'], $b['metadataScore'], $a['table']] <=> [$a['relationTouch'], $a['metadataScore'], $b['table']]);

            $metadataCompleteness = max(0, min(100, (int)round($metadataTotal / $tableCount)));
            $workflowCoverage = $workflowCandidates > 0 ? $this->percentage($workflowBound, $workflowCandidates, 0) : 0;
            $ownershipCoverage = $this->percentage($ownershipCount, $tableCount, 100);
            $hotspotCount = (int)($hotspotCountByDomain[$domain] ?? 0);
            $layers = array_values(array_keys((array)$group['layers']));
            $readinessScore = max(0, min(100, (int)round(
                ($metadataCompleteness * 0.42)
                + ($workflowCoverage * 0.18)
                + ($ownershipCoverage * 0.16)
                + ((100 - min(100, $hotspotCount * 14)) * 0.12)
                + ((count($layers) > 0 ? 100 : 40) * 0.12)
            )));

            $blockers = [];
            if ($metadataCompleteness < 80) {
                $blockers[] = 'metadata_depth';
            }
            if ($workflowCoverage < 60) {
                $blockers[] = 'workflow_binding';
            }
            if ($ownershipCoverage < 60) {
                $blockers[] = 'ownership_gap';
            }

            $rows[] = [
                'domain' => $domain,
                'label' => $this->humanizeKey($domain),
                'color' => (string)($palette[$domain] ?? '#64748b'),
                'tableCount' => $tableCount,
                'relationTouchCount' => $relationTouchCount,
                'metadataCompletenessPercent' => $metadataCompleteness,
                'workflowCoveragePercent' => $workflowCoverage,
                'ownershipCoveragePercent' => $ownershipCoverage,
                'rlsTableCount' => $rlsTableCount,
                'policyCount' => $policyCount,
                'hotspotCount' => $hotspotCount,
                'layerCount' => count($layers),
                'layers' => $layers,
                'representativeTables' => array_values(array_filter(array_map(static fn(array $item): string => (string)$item['table'], array_slice($representative, 0, 5)))),
                'blockers' => $blockers,
                'readinessScore' => $readinessScore,
                'tone' => $readinessScore >= 80 ? 'good' : ($readinessScore >= 65 ? 'warning' : 'critical'),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => [$b['readinessScore'], $b['tableCount'], $a['domain']] <=> [$a['readinessScore'], $a['tableCount'], $b['domain']]);
        return $rows;
    }

    private function buildLayerDiagnostics(array $schema, array $hotspots, array $relationTouchMap): array
    {
        $groups = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $layer = trim((string)($table['canonical']['layer'] ?? $this->inferLayerForTable($schema, $table)));
            if ($layer === '') {
                $layer = 'Unassigned';
            }
            if (!isset($groups[$layer])) {
                $groups[$layer] = ['tables' => []];
            }
            $groups[$layer]['tables'][] = $table;
        }

        $hotspotCountByLayer = [];
        foreach ($hotspots as $item) {
            if (!is_array($item)) {
                continue;
            }
            $layer = trim((string)($item['layer'] ?? 'Unassigned'));
            if ($layer === '') {
                $layer = 'Unassigned';
            }
            if ((int)($item['score'] ?? 0) >= 12) {
                $hotspotCountByLayer[$layer] = (int)($hotspotCountByLayer[$layer] ?? 0) + 1;
            }
        }

        $rows = [];
        foreach ($groups as $layer => $group) {
            $tables = array_values(array_filter((array)$group['tables'], 'is_array'));
            $tableCount = count($tables);
            if ($tableCount === 0) {
                continue;
            }

            $metadataTotal = 0;
            $workflowCandidates = 0;
            $workflowBound = 0;
            $relationTouchCount = 0;
            $domains = [];

            foreach ($tables as $table) {
                $metadataTotal += $this->tableMetadataScore($table);
                $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
                $hasBinding = trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0;
                $candidate = $hasBinding || $this->tableWorkflowCandidate($table);
                if ($candidate) {
                    $workflowCandidates++;
                    if ($hasBinding) {
                        $workflowBound++;
                    }
                }
                $relationTouchCount += (int)($relationTouchMap[(string)($table['id'] ?? '')] ?? 0);
                $domain = trim((string)($table['domain'] ?? 'default'));
                if ($domain !== '') {
                    $domains[$domain] = true;
                }
            }

            $metadataCompleteness = max(0, min(100, (int)round($metadataTotal / $tableCount)));
            $workflowCoverage = $workflowCandidates > 0 ? $this->percentage($workflowBound, $workflowCandidates, 0) : 0;
            $hotspotCount = (int)($hotspotCountByLayer[$layer] ?? 0);
            $domainCount = count($domains);
            $readinessScore = max(0, min(100, (int)round(
                ($metadataCompleteness * 0.48)
                + ($workflowCoverage * 0.20)
                + ((100 - min(100, $hotspotCount * 16)) * 0.14)
                + (($domainCount > 0 ? 100 : 50) * 0.18)
            )));

            $rows[] = [
                'layer' => $layer,
                'tableCount' => $tableCount,
                'domainCount' => $domainCount,
                'domains' => array_values(array_keys($domains)),
                'relationTouchCount' => $relationTouchCount,
                'metadataCompletenessPercent' => $metadataCompleteness,
                'workflowCoveragePercent' => $workflowCoverage,
                'hotspotCount' => $hotspotCount,
                'readinessScore' => $readinessScore,
                'tone' => $readinessScore >= 80 ? 'good' : ($readinessScore >= 65 ? 'warning' : 'critical'),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => [$a['layer']] <=> [$b['layer']]);
        return $rows;
    }

    private function buildGovernanceDiagnostics(array $schema): array
    {
        $tables = array_values(array_filter((array)($schema['tables'] ?? []), 'is_array'));
        $tableCount = count($tables);
        if ($tableCount === 0) {
            return [
                'ownerCoveragePercent' => 100,
                'stewardCoveragePercent' => 100,
                'approverCoveragePercent' => 100,
                'evidenceCoveragePercent' => 100,
                'lifecycleCoveragePercent' => 100,
                'uiHintCoveragePercent' => 100,
                'workflowBindingCoveragePercent' => 100,
                'policyIntentCoveragePercent' => 100,
                'securityRoleCoveragePercent' => 100,
                'overallCoveragePercent' => 100,
                'missingOwners' => [],
                'missingApprovers' => [],
                'missingPolicies' => [],
            ];
        }

        $ownerCount = 0;
        $stewardCount = 0;
        $approverCount = 0;
        $evidenceCount = 0;
        $lifecycleCount = 0;
        $uiHintCount = 0;
        $workflowCount = 0;
        $policyCount = 0;
        $securityRoleCount = 0;
        $missingOwners = [];
        $missingApprovers = [];
        $missingPolicies = [];

        foreach ($tables as $table) {
            $governance = is_array($table['governance'] ?? null) ? $table['governance'] : [];
            $lifecycle = is_array($table['lifecycle'] ?? null) ? $table['lifecycle'] : [];
            $ui = is_array($table['ui'] ?? null) ? $table['ui'] : [];
            $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
            $security = is_array($table['security'] ?? null) ? $table['security'] : [];
            $tableName = (string)($table['name'] ?? '');

            $hasOwner = trim((string)($governance['owner'] ?? '')) !== '';
            $hasSteward = trim((string)($governance['steward'] ?? '')) !== '';
            $hasApprover = trim((string)($governance['approver_role'] ?? '')) !== '' || trim((string)($governance['approver'] ?? '')) !== '';
            $hasEvidence = count((array)($governance['review_evidence'] ?? [])) > 0;
            $hasLifecycle = trim((string)($lifecycle['stage'] ?? '')) !== '' || trim((string)($lifecycle['effective_from'] ?? '')) !== '' || trim((string)($lifecycle['effective_until'] ?? '')) !== '';
            $hasUiHints = trim((string)($ui['default_widget'] ?? '')) !== '' || trim((string)($ui['icon'] ?? '')) !== '';
            $hasWorkflow = trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0;
            $hasPolicy = !empty($table['rls_enabled']) || count((array)($table['policies'] ?? [])) > 0 || count((array)($security['policy_refs'] ?? [])) > 0;
            $hasSecurityRoles = count((array)($security['roles'] ?? [])) > 0;

            if ($hasOwner) {
                $ownerCount++;
            }
            if ($hasSteward) {
                $stewardCount++;
            }
            if ($hasApprover) {
                $approverCount++;
            } elseif ($tableName !== '' && count($missingApprovers) < 12) {
                $missingApprovers[] = $tableName;
            }
            if ($hasEvidence) {
                $evidenceCount++;
            }
            if ($hasLifecycle) {
                $lifecycleCount++;
            }
            if ($hasUiHints) {
                $uiHintCount++;
            }
            if ($hasWorkflow) {
                $workflowCount++;
            }
            if ($hasPolicy) {
                $policyCount++;
            } elseif (!empty($table['rls_enabled']) && $tableName !== '' && count($missingPolicies) < 12) {
                $missingPolicies[] = $tableName;
            }
            if ($hasSecurityRoles) {
                $securityRoleCount++;
            }
            if (!($hasOwner || $hasSteward) && $tableName !== '' && count($missingOwners) < 12) {
                $missingOwners[] = $tableName;
            }
        }

        $ownerCoverage = $this->percentage($ownerCount, $tableCount, 100);
        $stewardCoverage = $this->percentage($stewardCount, $tableCount, 100);
        $approverCoverage = $this->percentage($approverCount, $tableCount, 100);
        $evidenceCoverage = $this->percentage($evidenceCount, $tableCount, 100);
        $lifecycleCoverage = $this->percentage($lifecycleCount, $tableCount, 100);
        $uiCoverage = $this->percentage($uiHintCount, $tableCount, 100);
        $workflowCoverage = $this->percentage($workflowCount, $tableCount, 100);
        $policyCoverage = $this->percentage($policyCount, $tableCount, 100);
        $securityRoleCoverage = $this->percentage($securityRoleCount, $tableCount, 100);

        $overallCoverage = max(0, min(100, (int)round(
            (max($ownerCoverage, $stewardCoverage) * 0.24)
            + ($approverCoverage * 0.16)
            + ($evidenceCoverage * 0.10)
            + ($lifecycleCoverage * 0.18)
            + ($uiCoverage * 0.12)
            + ($workflowCoverage * 0.10)
            + ($policyCoverage * 0.10)
        )));

        return [
            'ownerCoveragePercent' => $ownerCoverage,
            'stewardCoveragePercent' => $stewardCoverage,
            'approverCoveragePercent' => $approverCoverage,
            'evidenceCoveragePercent' => $evidenceCoverage,
            'lifecycleCoveragePercent' => $lifecycleCoverage,
            'uiHintCoveragePercent' => $uiCoverage,
            'workflowBindingCoveragePercent' => $workflowCoverage,
            'policyIntentCoveragePercent' => $policyCoverage,
            'securityRoleCoveragePercent' => $securityRoleCoverage,
            'overallCoveragePercent' => $overallCoverage,
            'missingOwners' => $missingOwners,
            'missingApprovers' => $missingApprovers,
            'missingPolicies' => $missingPolicies,
        ];
    }

    private function round3JourneyBlueprints(): array
    {
        return [
            [
                'key' => 'production_dispatch',
                'label' => 'Production dispatch → execution',
                'focus' => 'Planning-to-execution orchestration',
                'tables' => ['production_order', 'work_order', 'dispatch_queue', 'track_in', 'track_out', 'production_completion', 'job', 'job_event'],
            ],
            [
                'key' => 'traceability_genealogy',
                'label' => 'Lot / serial genealogy',
                'focus' => 'End-to-end traceability and lineage',
                'tables' => ['item', 'item_revision', 'lot', 'serial', 'genealogy_link', 'material_consumption', 'operation_output', 'inventory_ledger'],
            ],
            [
                'key' => 'incoming_quality',
                'label' => 'Incoming quality containment',
                'focus' => 'Supplier receipt → inspection → quality case',
                'tables' => ['purchase_order', 'purchase_order_line', 'quality_order', 'inspection_lot', 'inspection_result', 'supplier_quality_case', 'nonconformance'],
            ],
            [
                'key' => 'nc_capa_closure',
                'label' => 'NC / deviation / CAPA closure',
                'focus' => 'Containment, root cause, approval and evidence chain',
                'tables' => ['nonconformance', 'deviation', 'capa', 'change_control', 'approval', 'electronic_signature', 'audit_trail'],
            ],
            [
                'key' => 'document_training',
                'label' => 'Document → training → competency',
                'focus' => 'Controlled documents and workforce readiness',
                'tables' => ['document', 'document_revision', 'training_matrix', 'training_record', 'competency', 'approval', 'electronic_signature'],
            ],
            [
                'key' => 'equipment_runtime',
                'label' => 'Equipment runtime and maintenance signal',
                'focus' => 'Runtime events, downtime and resource orchestration',
                'tables' => ['org_work_center', 'machine_event', 'downtime_event', 'tool_usage', 'operation_resource', 'work_instruction'],
            ],
            [
                'key' => 'inventory_commitment',
                'label' => 'Demand, supply and inventory commitment',
                'focus' => 'ERP planning with inventory posture',
                'tables' => ['demand', 'planned_supply', 'allocation', 'pegging', 'inventory_balance_snapshot', 'location_balance', 'cost_ledger'],
            ],
        ];
    }

    private function buildJourneyDiagnostics(array $schema, array $relationTouchMap): array
    {
        $tableByName = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (is_array($table)) {
                $tableByName[(string)($table['name'] ?? '')] = $table;
            }
        }

        $rows = [];
        foreach ($this->round3JourneyBlueprints() as $spec) {
            $requiredTables = array_values(array_filter((array)($spec['tables'] ?? []), static fn($value): bool => trim((string)$value) !== ''));
            $present = [];
            $missing = [];
            $metadataTotal = 0;
            $workflowBoundCount = 0;
            $relationTouchCount = 0;
            $domains = [];
            $layers = [];

            foreach ($requiredTables as $tableName) {
                if (!isset($tableByName[$tableName]) || !is_array($tableByName[$tableName])) {
                    $missing[] = $tableName;
                    continue;
                }

                $table = $tableByName[$tableName];
                $present[] = $tableName;
                $metadataTotal += $this->tableMetadataScore($table);
                $integration = is_array($table['integration'] ?? null) ? $table['integration'] : [];
                if (trim((string)($integration['workflow_id'] ?? '')) !== '' || count((array)($integration['workflow_bindings'] ?? [])) > 0) {
                    $workflowBoundCount++;
                }
                $relationTouchCount += (int)($relationTouchMap[(string)($table['id'] ?? '')] ?? 0);
                $domain = trim((string)($table['domain'] ?? 'default'));
                if ($domain !== '') {
                    $domains[$domain] = true;
                }
                $layer = trim((string)($table['canonical']['layer'] ?? $this->inferLayerForTable($schema, $table)));
                if ($layer !== '') {
                    $layers[$layer] = true;
                }
            }

            $presentCount = count($present);
            $presencePercent = $this->percentage($presentCount, max(1, count($requiredTables)), 100);
            $metadataCompleteness = $presentCount > 0 ? max(0, min(100, (int)round($metadataTotal / $presentCount))) : 0;
            $workflowCoverage = $presentCount > 0 ? $this->percentage($workflowBoundCount, $presentCount, 0) : 100;
            $readinessScore = max(0, min(100, (int)round(
                ($presencePercent * 0.58)
                + ($metadataCompleteness * 0.18)
                + ($workflowCoverage * 0.12)
                + (min(100, $relationTouchCount * 3) * 0.12)
            )));

            $highlight = (string)($spec['focus'] ?? '');
            if ($missing !== []) {
                $highlight .= '; missing: ' . implode(', ', array_slice($missing, 0, 3));
                if (count($missing) > 3) {
                    $highlight .= '...';
                }
            }

            $rows[] = [
                'key' => (string)($spec['key'] ?? ''),
                'label' => (string)($spec['label'] ?? $spec['key'] ?? ''),
                'focus' => (string)($spec['focus'] ?? ''),
                'requiredTables' => $requiredTables,
                'tablesPresent' => $present,
                'missingTables' => $missing,
                'domains' => array_values(array_keys($domains)),
                'layers' => array_values(array_keys($layers)),
                'relationTouchCount' => $relationTouchCount,
                'workflowBoundCount' => $workflowBoundCount,
                'metadataCompletenessPercent' => $metadataCompleteness,
                'readinessScore' => $readinessScore,
                'tone' => $readinessScore >= 82 ? 'good' : ($readinessScore >= 65 ? 'warning' : 'critical'),
                'focusTables' => array_slice($present, 0, 6),
                'highlight' => trim($highlight),
            ];
        }

        return $rows;
    }

    private function buildDependencyMatrix(array $schema): array
    {
        $tableById = [];
        $domains = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableId = (string)($table['id'] ?? '');
            if ($tableId !== '') {
                $tableById[$tableId] = $table;
            }
            $domain = trim((string)($table['domain'] ?? 'default'));
            if ($domain === '') {
                $domain = 'default';
            }
            $domains[$domain] = true;
        }

        $domainList = array_values(array_keys($domains));
        sort($domainList);

        $matrix = [];
        foreach ($domainList as $fromDomain) {
            $matrix[$fromDomain] = array_fill_keys($domainList, 0);
        }

        foreach ((array)($schema['relations'] ?? []) as $relation) {
            if (!is_array($relation)) {
                continue;
            }
            $fromTable = $tableById[(string)($relation['from_table_id'] ?? '')] ?? null;
            $toTable = $tableById[(string)($relation['to_table_id'] ?? '')] ?? null;
            if (!is_array($fromTable) || !is_array($toTable)) {
                continue;
            }
            $fromDomain = trim((string)($fromTable['domain'] ?? 'default'));
            $toDomain = trim((string)($toTable['domain'] ?? 'default'));
            if ($fromDomain === '') {
                $fromDomain = 'default';
            }
            if ($toDomain === '') {
                $toDomain = 'default';
            }
            $matrix[$fromDomain][$toDomain] = (int)($matrix[$fromDomain][$toDomain] ?? 0) + 1;
        }

        $strongestLinks = [];
        foreach ($matrix as $fromDomain => $row) {
            foreach ($row as $toDomain => $count) {
                if ($count > 0) {
                    $strongestLinks[] = [
                        'fromDomain' => $fromDomain,
                        'toDomain' => $toDomain,
                        'count' => $count,
                    ];
                }
            }
        }
        usort($strongestLinks, static fn(array $a, array $b): int => [$b['count'], $a['fromDomain'], $a['toDomain']] <=> [$a['count'], $b['fromDomain'], $b['toDomain']]);

        $matrixRows = [];
        foreach ($domainList as $fromDomain) {
            $row = [];
            foreach ($domainList as $toDomain) {
                $row[] = (int)($matrix[$fromDomain][$toDomain] ?? 0);
            }
            $matrixRows[] = $row;
        }

        return [
            'domains' => $domainList,
            'matrix' => $matrixRows,
            'strongestLinks' => array_slice($strongestLinks, 0, 16),
        ];
    }

    private function buildBlockerBoard(array $report, array $diff, array $hotspots, array $governance, array $journeys, int $orphanRelationRiskCount): array
    {
        $blockers = [];

        if ((int)($governance['overallCoveragePercent'] ?? 0) < 55) {
            $blockers[] = [
                'key' => 'governance_ownership_gap',
                'severity' => 'high',
                'title' => 'Governance ownership is not modeled',
                'detail' => 'Most canonical tables still miss owner/steward/approver metadata, so review routing and accountability are weak.',
                'nextAction' => 'Populate owner, steward, and approver roles for every domain before broad runtime onboarding.',
                'approvalClass' => 'elevated',
                'focusTargets' => array_slice((array)($governance['missingOwners'] ?? []), 0, 6),
            ];
        }

        if ((int)($governance['workflowBindingCoveragePercent'] ?? 0) < 55) {
            $workflowFocus = [];
            foreach ($journeys as $journey) {
                foreach ((array)($journey['focusTables'] ?? []) as $tableName) {
                    if ($tableName !== '' && !in_array($tableName, $workflowFocus, true)) {
                        $workflowFocus[] = $tableName;
                    }
                }
                if (count($workflowFocus) >= 8) {
                    break;
                }
            }
            $blockers[] = [
                'key' => 'workflow_runtime_gap',
                'severity' => 'medium',
                'title' => 'Workflow bindings are not connected',
                'detail' => 'Operational tables already exist but runtime workflow bindings are still largely absent.',
                'nextAction' => 'Bind workflow IDs/contracts for order, inspection, CAPA, training, and equipment flows.',
                'approvalClass' => 'standard',
                'focusTargets' => array_slice($workflowFocus, 0, 8),
            ];
        }

        if ($orphanRelationRiskCount > 0) {
            $blockers[] = [
                'key' => 'orphan_relations',
                'severity' => 'critical',
                'title' => 'Broken relation endpoints detected',
                'detail' => 'One or more relations point to missing table or column IDs.',
                'nextAction' => 'Repair relation IDs before any publish or release bundle operation.',
                'approvalClass' => 'cab_esign',
                'focusTargets' => [],
            ];
        }

        $criticalMissing = array_values(array_filter((array)($report['canonical']['criticalMissing'] ?? []), static fn($value): bool => trim((string)$value) !== ''));
        if ($criticalMissing !== []) {
            $blockers[] = [
                'key' => 'canonical_gap',
                'severity' => 'high',
                'title' => 'Canonical capability gaps remain',
                'detail' => 'Some critical ERP/MES/eQMS capabilities are still missing or not explicit in the model.',
                'nextAction' => 'Complete the missing capability areas and define lineage for them before large-scale onboarding.',
                'approvalClass' => 'elevated',
                'focusTargets' => array_slice($criticalMissing, 0, 6),
            ];
        }

        $secondaryMissing = [];
        foreach ((array)($report['canonical']['capabilities'] ?? []) as $capability) {
            if (is_array($capability) && empty($capability['present'])) {
                $secondaryMissing[] = (string)($capability['label'] ?? $capability['key'] ?? '');
            }
        }
        if ($secondaryMissing !== []) {
            $blockers[] = [
                'key' => 'capability_expansion',
                'severity' => 'medium',
                'title' => 'Secondary capability overlays need expansion',
                'detail' => 'The schema is strong, but some secondary capability overlays remain thin.',
                'nextAction' => 'Deepen maintenance/calibration/security overlays and publish corresponding workflow/policy metadata.',
                'approvalClass' => 'standard',
                'focusTargets' => array_slice($secondaryMissing, 0, 6),
            ];
        }

        $highHotspots = array_values(array_filter($hotspots, static fn($item): bool => is_array($item) && (int)($item['score'] ?? 0) >= 12));
        if ($highHotspots !== []) {
            $blockers[] = [
                'key' => 'hotspot_remediation',
                'severity' => 'medium',
                'title' => 'High-dependency hotspots need refactoring attention',
                'detail' => 'A few hub tables carry high dependency pressure and need stronger metadata and governance signals.',
                'nextAction' => 'Prioritize hotspot remediation, domain views, and targeted stewardship for hub tables.',
                'approvalClass' => 'standard',
                'focusTargets' => array_values(array_filter(array_map(static fn(array $item): string => (string)($item['table'] ?? ''), array_slice($highHotspots, 0, 6)))),
            ];
        }

        if ((int)($diff['summary']['destructiveCount'] ?? 0) > 0) {
            $blockers[] = [
                'key' => 'destructive_change_firewall',
                'severity' => 'critical',
                'title' => 'Destructive change firewall engaged',
                'detail' => 'Typed diff contains destructive operations and must be escalated with rollback evidence.',
                'nextAction' => 'Route through CAB/e-sign and attach migration rollback proof before release.',
                'approvalClass' => 'cab_esign',
                'focusTargets' => [],
            ];
        }

        return $blockers;
    }

    private function buildReleaseRadar(array $report, array $governance, array $domains, array $journeys, array $blockers): array
    {
        $journeyReadiness = count($journeys) > 0
            ? (int)round(array_sum(array_map(static fn(array $item): int => (int)($item['readinessScore'] ?? 0), $journeys)) / count($journeys))
            : 100;
        $domainReadiness = count($domains) > 0
            ? (int)round(array_sum(array_map(static fn(array $item): int => (int)($item['readinessScore'] ?? 0), $domains)) / count($domains))
            : 100;

        $readinessScore = max(0, min(100, (int)round(
            ((int)($report['summary']['releaseReadinessScore'] ?? 0) * 0.34)
            + ((int)($governance['overallCoveragePercent'] ?? 0) * 0.24)
            + ($journeyReadiness * 0.22)
            + ($domainReadiness * 0.10)
            + ((100 - min(100, count($blockers) * 12)) * 0.10)
        )));

        $accelerate = 0;
        $stabilize = 0;
        $govern = 0;
        $rework = 0;
        $standard = 0;
        $review = 0;
        $elevated = 0;
        $cab = 0;

        foreach ($domains as $domain) {
            if (!is_array($domain)) {
                continue;
            }
            $readiness = (int)($domain['readinessScore'] ?? 0);
            $hotspotCount = (int)($domain['hotspotCount'] ?? 0);
            if ($readiness >= 75 && $hotspotCount === 0) {
                $accelerate++;
            } elseif (($readiness >= 65 && $readiness < 75) || $hotspotCount === 1) {
                $stabilize++;
            } elseif ($readiness >= 55) {
                $govern++;
            } else {
                $rework++;
            }

            if ($readiness >= 75) {
                $standard++;
            } elseif ($readiness >= 65) {
                $review++;
            } elseif ($readiness >= 55) {
                $elevated++;
            } else {
                $cab++;
            }
        }

        $cab += count(array_filter($blockers, static fn($item): bool => is_array($item) && (string)($item['severity'] ?? '') === 'critical'));

        return [
            'readinessScore' => $readinessScore,
            'journeyReadinessScore' => $journeyReadiness,
            'domainReadinessScore' => $domainReadiness,
            'recommendedLane' => $readinessScore >= 85 && $blockers === []
                ? 'standard'
                : ($readinessScore >= 72 ? 'review' : ($readinessScore >= 60 ? 'elevated' : 'cab_esign')),
            'quadrants' => [
                ['key' => 'accelerate', 'label' => 'Accelerate', 'count' => $accelerate, 'tone' => 'good', 'hint' => 'Low blockers, ready for rapid onboarding'],
                ['key' => 'stabilize', 'label' => 'Stabilize', 'count' => $stabilize, 'tone' => 'warning', 'hint' => 'Good structure but needs targeted hardening'],
                ['key' => 'govern', 'label' => 'Govern', 'count' => $govern, 'tone' => 'warning', 'hint' => 'Add ownership, workflow, and policy signals'],
                ['key' => 'rework', 'label' => 'Rework', 'count' => $rework, 'tone' => 'critical', 'hint' => 'Architecture or metadata posture needs redesign'],
            ],
            'approvalLanes' => [
                ['key' => 'standard', 'label' => 'Standard', 'count' => $standard, 'tone' => 'good'],
                ['key' => 'review', 'label' => 'Review board', 'count' => $review, 'tone' => 'warning'],
                ['key' => 'elevated', 'label' => 'Elevated', 'count' => $elevated, 'tone' => 'warning'],
                ['key' => 'cab_esign', 'label' => 'CAB / e-sign', 'count' => $cab, 'tone' => 'critical'],
            ],
            'window' => $readinessScore >= 85 && $blockers === []
                ? 'now'
                : ($readinessScore >= 70 ? 'review_cycle' : 'hardening_required'),
            'narrative' => 'World-class posture is strongest in canonical breadth and journey completeness; the dominant release drag now comes from ownership/workflow governance rather than physical schema coverage.',
        ];
    }

    private function buildSuggestedStoryboards(array $journeys, array $hotspots, array $layers): array
    {
        $storyboards = [];

        $storyboards[] = [
            'key' => 'executive_release_radar',
            'title' => 'Executive release radar',
            'subtitle' => 'Cross-domain readiness, hotspots and blockers',
            'focusTables' => array_values(array_filter(array_map(static fn(array $item): string => (string)($item['table'] ?? ''), array_slice($hotspots, 0, 5)))),
            'heatmap' => 'risk',
            'ambience' => 'midnight',
            'density' => 'comfortable',
            'narrative' => 'Best view for change advisory board and architecture review.',
            'layers' => array_values(array_filter(array_map(static fn(array $item): string => (string)($item['layer'] ?? ''), $layers))),
            'domains' => [],
        ];

        foreach (array_slice($journeys, 0, 5) as $journey) {
            if (!is_array($journey)) {
                continue;
            }
            $storyboards[] = [
                'key' => 'journey_' . (string)($journey['key'] ?? 'view'),
                'title' => (string)($journey['label'] ?? $journey['key'] ?? 'Journey view'),
                'subtitle' => (string)($journey['focus'] ?? ''),
                'focusTables' => array_slice((array)($journey['focusTables'] ?? []), 0, 6),
                'heatmap' => str_contains((string)($journey['key'] ?? ''), 'capa') ? 'security' : (str_contains((string)($journey['key'] ?? ''), 'production') ? 'workflow' : 'canonical'),
                'ambience' => str_contains((string)($journey['key'] ?? ''), 'production') ? 'aurora' : 'midnight',
                'density' => str_contains((string)($journey['key'] ?? ''), 'traceability') ? 'compact' : 'comfortable',
                'narrative' => (string)($journey['highlight'] ?? ''),
                'layers' => array_values((array)($journey['layers'] ?? [])),
                'domains' => array_values((array)($journey['domains'] ?? [])),
            ];
        }

        return $storyboards;
    }


    private function experienceReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-experience-report.json';
    }

    private function operationsReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-operations-report.json';
    }

    private function commandCenterReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-command-center-report.json';
    }

    private function round7ReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-round7-report.json';
    }

    private function round9ReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-round9-report.json';
    }

    private function round10ReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-round10-report.json';
    }

    private function round11ReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-round11-report.json';
    }

    private function round12ReportPath(): string
    {
        return $this->registryDirPath() . '/schema-studio-round12-report.json';
    }

    /**
     * @param mixed $items
     * @return array<int, array<string, mixed>>
     */
    private function arrayRows(mixed $items): array
    {
        return is_array($items) ? array_values(array_filter($items, 'is_array')) : [];
    }

    /**
     * @return array<int, string>
     */
    private function designCandidatePaths(string $designId): array
    {
        $id = $this->normalizeDesignId($designId);
        if ($id === self::SYSTEM_REGISTRY_DESIGN_ID) {
            return [];
        }
        return [$this->designPath($id)];
    }

    private function blankWorkspaceDesignDocument(): array
    {
        $now = $this->nowIso();
        return [
            '_meta' => [
                'id' => self::SYSTEM_DESIGN_ID,
                'name' => 'HESEM Workspace Design',
                'displayName' => 'Workspace Design Draft',
                'version' => '1.0.0',
                'description' => 'Editable blank draft for controlled schema design. Runtime authority remains the System Contract Registry.',
                'source' => 'generated_blank_workspace_fallback',
                'designType' => 'workspace_design',
                'authorityLayer' => 'design_workspace',
                'authorityViewKind' => 'design_draft',
                'authorityRole' => 'non_authoritative_editing_surface',
                'runtimeAuthority' => self::SYSTEM_REGISTRY_DESIGN_ID,
                'authoritySource' => 'mom/data/schema-studio/designs/workspace.json',
                'schemaName' => 'public',
                'databaseName' => 'mom',
                'physicalDbSchema' => 'public',
                'purpose' => 'Editable design draft for controlled schema design, baseline, diff, compiler, and release review. It is not the physical DB schema.',
                'writePolicy' => 'editable_with_revision_guard',
                'deletePolicy' => 'archive_or_replace_do_not_hard_delete',
                'dataLossImpact' => 'Deleting the workspace does not delete database rows, but it disables the editable Schema Studio surface until a replacement workspace is created.',
                'blankDraft' => true,
                'createdAt' => $now,
                'updatedAt' => $now,
                'author' => 'system',
                'readOnly' => false,
                'editable' => true,
            ],
            'enums' => [],
            'tables' => [],
            'relations' => [],
            'groups' => [],
            'notes' => [],
        ];
    }

    private function loadDesignDocument(string $designId): ?array
    {
        $id = $this->normalizeDesignId($designId);
        if ($id === self::SYSTEM_REGISTRY_DESIGN_ID) {
            return $this->buildRegistryDesignDocument(self::SYSTEM_REGISTRY_DESIGN_ID, [
                'name' => 'HESEM System Contract Registry',
                'description' => 'Read-only full backend contract registry generated from migrations, workflow contracts, and registry publication artifacts.',
                'source' => 'mom/data/registry/table-registry.json',
                'designType' => 'system_contract_registry',
                'authorityLayer' => 'system_contract_registry',
                'readOnly' => true,
                'editable' => false,
                'validation_profile' => 'logical_registry',
            ]);
        }

        foreach ($this->designCandidatePaths($designId) as $path) {
            $doc = $this->readJsonFile($path);
            if (is_array($doc)) {
                return $doc;
            }
        }
        if ($id === self::SYSTEM_DESIGN_ID) {
            return $this->blankWorkspaceDesignDocument();
        }
        return null;
    }

    private function loadBaselineDocument(string $designId, ?array $design = null): array
    {
        $id = $this->normalizeDesignId($designId);
        if ($id === self::SYSTEM_REGISTRY_DESIGN_ID) {
            return is_array($design) ? $design : [
                '_meta' => [
                    'id' => self::SYSTEM_REGISTRY_DESIGN_ID . '_baseline',
                    'readOnly' => true,
                    'authorityLayer' => 'system_contract_registry',
                ],
                'tables' => [],
                'relations' => [],
                'groups' => [],
                'notes' => [],
            ];
        }
        $paths = [$this->baselinePath($id)];
        foreach ($paths as $path) {
            $doc = $this->readJsonFile($path);
            if (is_array($doc)) {
                return $doc;
            }
        }

        return is_array($design) ? $design : ['_meta' => ['id' => $id . '_baseline'], 'tables' => [], 'relations' => [], 'groups' => [], 'notes' => []];
    }

    private function readRegistryDocumentWithFallback(string $name, ?string &$resolvedPath = null): array
    {
        $safeName = preg_replace('/[^A-Za-z0-9_-]+/', '', trim($name));
        if ($safeName === '') {
            $resolvedPath = null;
            return [];
        }

        $runtimePath = $this->dataDir . '/registry/' . $safeName . '.json';
        $runtime = $this->readJsonFile($runtimePath) ?? [];
        if ($runtime !== []) {
            $resolvedPath = $runtimePath;
            return $runtime;
        }

        $contractPath = $this->rootDir . '/mom/contracts/' . $safeName . '.json';
        $contract = $this->readJsonFile($contractPath) ?? [];
        if ($contract !== []) {
            $resolvedPath = $contractPath;
            return $contract;
        }

        $resolvedPath = null;
        return [];
    }

    private function registrySourceLabel(?string $path, string $fallback): string
    {
        if ($path === null || $path === '') {
            return $fallback;
        }
        return $this->relativeWorkspacePath($path);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function relationEdgesFromRelationMap(array $relationMap): array
    {
        if (is_array($relationMap['edges'] ?? null)) {
            return array_values(array_filter($relationMap['edges'], 'is_array'));
        }
        if (is_array($relationMap['relations'] ?? null)) {
            return array_values(array_filter($relationMap['relations'], 'is_array'));
        }
        if (array_is_list($relationMap)) {
            return array_values(array_filter($relationMap, 'is_array'));
        }
        return [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function relationEdgesFromTableRegistry(array $tableRegistry): array
    {
        $edges = [];
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        foreach ($tables as $tableName => $tableDef) {
            if (!is_string($tableName) || !is_array($tableDef)) {
                continue;
            }

            $foreignKeys = is_array($tableDef['foreignKeys'] ?? null) ? $tableDef['foreignKeys'] : [];
            foreach ($foreignKeys as $fk) {
                if (!is_array($fk)) {
                    continue;
                }

                $fromFields = $this->normalizeFieldList($fk['column'] ?? ($fk['columns'] ?? []));
                $reference = is_scalar($fk['references'] ?? null) ? trim((string)$fk['references']) : '';
                if ($fromFields === [] || $reference === '' || strpos($reference, '.') === false) {
                    continue;
                }

                [$toTable, $toFieldSpec] = explode('.', $reference, 2);
                $toTable = trim($toTable);
                $toFields = $this->normalizeFieldList($toFieldSpec);
                if ($toTable === '' || $toFields === []) {
                    continue;
                }

                $edges[] = [
                    'from' => [
                        'entity' => $tableName,
                        'field' => $fromFields,
                    ],
                    'to' => [
                        'entity' => $toTable,
                        'field' => $toFields,
                    ],
                    'label' => is_scalar($fk['label'] ?? null) ? (string)$fk['label'] : '',
                    'cascadeActions' => [
                        'delete' => 'RESTRICT',
                        'update' => 'CASCADE',
                    ],
                    'source' => 'table-registry.foreignKeys',
                ];
            }
        }

        return $edges;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPersonaBoards(
        array $schema,
        array $report,
        array $diff,
        array $governance,
        array $hotspots,
        array $journeys,
        array $releaseRadar,
        int $metadataCompletenessPercent,
        int $workflowCoveragePercent,
        int $visualReadinessScore
    ): array {
        $journeyByKey = [];
        foreach ($journeys as $journey) {
            if (is_array($journey) && trim((string)($journey['key'] ?? '')) !== '') {
                $journeyByKey[(string)$journey['key']] = $journey;
            }
        }

        $hotspotTables = array_values(array_filter(array_map(
            static fn($item): string => is_array($item) ? (string)($item['table'] ?? '') : '',
            array_slice((array)$hotspots, 0, 8)
        )));
        $releaseReadiness = (int)($report['summary']['releaseReadinessScore'] ?? 0);
        $canonicalCoverage = (int)($report['summary']['canonicalCoveragePercent'] ?? 0);
        $compatibilityScore = (int)($diff['summary']['compatibilityScore'] ?? 100);
        $riskScore = (int)($diff['summary']['riskScore'] ?? 0);
        $governanceCoverage = (int)($governance['overallCoveragePercent'] ?? 0);
        $releaseRadarScore = (int)($releaseRadar['readinessScore'] ?? 0);
        $blockerPenalty = min(24, count((array)($releaseRadar['approvalLanes'] ?? [])) > 0 ? count((array)$hotspots) * 2 : count((array)$hotspots) * 3);
        $policyCount = (int)($report['summary']['policyCount'] ?? 0);
        $rlsTableCount = (int)($report['summary']['rlsTableCount'] ?? 0);
        $policyCoveragePercent = $rlsTableCount > 0 ? $this->percentage(min($policyCount, $rlsTableCount), $rlsTableCount, 100) : 100;

        $productionScore = (int)($journeyByKey['production_execution']['readinessScore'] ?? 0);
        $traceabilityScore = (int)($journeyByKey['traceability']['readinessScore'] ?? 0);
        $bomRoutingScore = (int)($journeyByKey['item_bom_routing']['readinessScore'] ?? 0);
        $qualityScore = (int)($journeyByKey['quality_execution']['readinessScore'] ?? 0);
        $capaScore = (int)($journeyByKey['nc_capa']['readinessScore'] ?? 0);
        $trainingScore = (int)($journeyByKey['document_training_competency']['readinessScore'] ?? 0);
        $maintenanceScore = (int)($journeyByKey['calibration_maintenance']['readinessScore'] ?? 0);

        $personas = [
            [
                'key' => 'system_architect',
                'label' => 'System architect',
                'focus' => 'Compare branches, protect compatibility, steer release radar and hotspot remediation.',
                'defaultTab' => 'compare',
                'heatmap' => 'risk',
                'ambience' => 'midnight',
                'density' => 'comfortable',
                'readinessScore' => max(0, min(100, (int)round(($releaseRadarScore * 0.36) + ($visualReadinessScore * 0.24) + ($metadataCompletenessPercent * 0.18) + ($compatibilityScore * 0.14) + ($canonicalCoverage * 0.08) - ($blockerPenalty * 0.12)))),
                'focusTables' => $hotspotTables,
                'focusDomains' => ['foundation', 'master_data', 'planning_erp', 'mes_execution'],
                'priority' => 'high',
                'recommendedLane' => (string)($releaseRadar['recommendedLane'] ?? 'review'),
                'metrics' => [
                    ['label' => 'Radar', 'value' => $releaseRadarScore . '%', 'tone' => $releaseRadarScore >= 75 ? 'good' : 'warning'],
                    ['label' => 'Compatibility', 'value' => $compatibilityScore . '%', 'tone' => $compatibilityScore >= 90 ? 'good' : 'warning'],
                    ['label' => 'Risk', 'value' => (string)$riskScore, 'tone' => $riskScore >= 35 ? 'critical' : 'good'],
                ],
                'nextActions' => [
                    'Review hotspot hubs and typed-diff breaking changes on the compare canvas.',
                    'Save architecture views by domain/layer and prepare release notes with approval evidence.',
                ],
            ],
            [
                'key' => 'data_engineer',
                'label' => 'Data engineer',
                'focus' => 'Shape indexes, relations, defaults, migration risk, and registry compiler hygiene.',
                'defaultTab' => 'compare',
                'heatmap' => 'canonical',
                'ambience' => 'clean',
                'density' => 'compact',
                'readinessScore' => max(0, min(100, (int)round(($compatibilityScore * 0.28) + ((100 - min(100, $riskScore * 2)) * 0.22) + ($metadataCompletenessPercent * 0.18) + ($workflowCoveragePercent * 0.14) + ($visualReadinessScore * 0.10) + ($canonicalCoverage * 0.08)))),
                'focusTables' => array_values(array_unique(array_merge($hotspotTables, array_slice((array)($journeyByKey['traceability']['focusTables'] ?? []), 0, 4)))),
                'focusDomains' => ['master_data', 'inventory_traceability', 'mes_execution'],
                'priority' => 'high',
                'recommendedLane' => (string)($releaseRadar['recommendedLane'] ?? 'review'),
                'metrics' => [
                    ['label' => 'Typed diff', 'value' => (string)count((array)($diff['items'] ?? [])), 'tone' => count((array)($diff['items'] ?? [])) > 18 ? 'warning' : 'good'],
                    ['label' => 'Workflow', 'value' => $workflowCoveragePercent . '%', 'tone' => $workflowCoveragePercent >= 60 ? 'good' : 'warning'],
                    ['label' => 'Orphan risk', 'value' => (string)($report['summary']['orphanRelationRiskCount'] ?? 0), 'tone' => ((int)($report['summary']['orphanRelationRiskCount'] ?? 0) > 0 ? 'critical' : 'good')],
                ],
                'nextActions' => [
                    'Validate destructive change firewall items and lock-sensitive alters before publish.',
                    'Compile registry bundles after relation/index changes and review drift in projection outputs.',
                ],
            ],
            [
                'key' => 'manufacturing_process_engineer',
                'label' => 'Manufacturing process engineer',
                'focus' => 'Follow demand → BOM/routing → dispatch → execution → genealogy with line-ready views.',
                'defaultTab' => 'manufacturing',
                'heatmap' => 'workflow',
                'ambience' => 'aurora',
                'density' => 'compact',
                'readinessScore' => max(0, min(100, (int)round(($productionScore * 0.36) + ($traceabilityScore * 0.24) + ($bomRoutingScore * 0.18) + ($workflowCoveragePercent * 0.12) + ($releaseReadiness * 0.10)))),
                'focusTables' => array_values(array_unique(array_merge(
                    array_slice((array)($journeyByKey['production_execution']['focusTables'] ?? []), 0, 6),
                    array_slice((array)($journeyByKey['traceability']['focusTables'] ?? []), 0, 4)
                ))),
                'focusDomains' => ['planning_erp', 'mes_execution', 'inventory_traceability'],
                'priority' => 'high',
                'recommendedLane' => 'review',
                'metrics' => [
                    ['label' => 'Production', 'value' => $productionScore . '%', 'tone' => $productionScore >= 80 ? 'good' : 'warning'],
                    ['label' => 'Traceability', 'value' => $traceabilityScore . '%', 'tone' => $traceabilityScore >= 80 ? 'good' : 'warning'],
                    ['label' => 'Routing', 'value' => $bomRoutingScore . '%', 'tone' => $bomRoutingScore >= 80 ? 'good' : 'warning'],
                ],
                'nextActions' => [
                    'Create focused views for line orchestration, execution evidence, and lot/serial genealogy.',
                    'Bind runtime workflow contracts for dispatch, completion, downtime, and quality containment loops.',
                ],
            ],
            [
                'key' => 'quality_manager',
                'label' => 'Quality manager',
                'focus' => 'Control inspection, nonconformance, CAPA, training, evidence and signatures.',
                'defaultTab' => 'manufacturing',
                'heatmap' => 'security',
                'ambience' => 'midnight',
                'density' => 'comfortable',
                'readinessScore' => max(0, min(100, (int)round(($qualityScore * 0.34) + ($capaScore * 0.24) + ($trainingScore * 0.12) + ($governanceCoverage * 0.18) + ($policyCoveragePercent * 0.12)))),
                'focusTables' => array_values(array_unique(array_merge(
                    array_slice((array)($journeyByKey['quality_execution']['focusTables'] ?? []), 0, 5),
                    array_slice((array)($journeyByKey['nc_capa']['focusTables'] ?? []), 0, 5),
                    array_slice((array)($journeyByKey['document_training_competency']['focusTables'] ?? []), 0, 4)
                ))),
                'focusDomains' => ['eqms_compliance', 'inventory_traceability'],
                'priority' => 'high',
                'recommendedLane' => $policyCoveragePercent >= 70 ? 'review' : 'elevated',
                'metrics' => [
                    ['label' => 'Inspection', 'value' => $qualityScore . '%', 'tone' => $qualityScore >= 80 ? 'good' : 'warning'],
                    ['label' => 'CAPA', 'value' => $capaScore . '%', 'tone' => $capaScore >= 80 ? 'good' : 'warning'],
                    ['label' => 'Policy', 'value' => $policyCoveragePercent . '%', 'tone' => $policyCoveragePercent >= 60 ? 'good' : 'warning'],
                ],
                'nextActions' => [
                    'Link approval and e-signature evidence to high-risk tables before broad release.',
                    'Use storyboard reviews for incoming quality, deviation closure, and controlled document readiness.',
                ],
            ],
            [
                'key' => 'compliance_lead',
                'label' => 'Compliance lead',
                'focus' => 'Enforce stewardship, approval routing, evidence packs, policy posture, and CAB escalations.',
                'defaultTab' => 'diagnostics',
                'heatmap' => 'security',
                'ambience' => 'midnight',
                'density' => 'comfortable',
                'readinessScore' => max(0, min(100, (int)round(($governanceCoverage * 0.34) + ($releaseRadarScore * 0.24) + ($releaseReadiness * 0.18) + ($policyCoveragePercent * 0.14) + ((100 - min(100, count((array)$hotspots) * 6)) * 0.10)))),
                'focusTables' => array_values(array_unique(array_merge(
                    array_slice($hotspotTables, 0, 4),
                    array_slice((array)($journeyByKey['approval_audit_event']['focusTables'] ?? []), 0, 4),
                    array_slice((array)($journeyByKey['nc_capa']['focusTables'] ?? []), 0, 4)
                ))),
                'focusDomains' => ['eqms_compliance', 'foundation'],
                'priority' => 'critical',
                'recommendedLane' => (string)($releaseRadar['recommendedLane'] ?? 'elevated'),
                'metrics' => [
                    ['label' => 'Governance', 'value' => $governanceCoverage . '%', 'tone' => $governanceCoverage >= 60 ? 'good' : 'warning'],
                    ['label' => 'Release', 'value' => $releaseRadarScore . '%', 'tone' => $releaseRadarScore >= 70 ? 'good' : 'warning'],
                    ['label' => 'Policies', 'value' => (string)$policyCount, 'tone' => $policyCount > 0 ? 'good' : 'warning'],
                ],
                'nextActions' => [
                    'Close owner/steward/approver gaps and attach review evidence before promotion.',
                    'Escalate destructive changes or locked-down policy changes through CAB/e-sign lanes.',
                ],
            ],
            [
                'key' => 'app_builder_metadata_admin',
                'label' => 'App builder / metadata admin',
                'focus' => 'Translate canonical schema into registry fields, forms, APIs, workflows, and module packs.',
                'defaultTab' => 'dashboard',
                'heatmap' => 'canonical',
                'ambience' => 'aurora',
                'density' => 'comfortable',
                'readinessScore' => max(0, min(100, (int)round(($workflowCoveragePercent * 0.34) + ($metadataCompletenessPercent * 0.22) + ($canonicalCoverage * 0.18) + ($visualReadinessScore * 0.14) + ($governanceCoverage * 0.12)))),
                'focusTables' => array_values(array_unique(array_merge(
                    array_slice((array)($journeyByKey['production_execution']['focusTables'] ?? []), 0, 3),
                    array_slice((array)($journeyByKey['quality_execution']['focusTables'] ?? []), 0, 3),
                    array_slice($hotspotTables, 0, 3)
                ))),
                'focusDomains' => ['master_data', 'planning_erp', 'mes_execution', 'eqms_compliance'],
                'priority' => 'high',
                'recommendedLane' => $workflowCoveragePercent >= 60 ? 'standard' : 'review',
                'metrics' => [
                    ['label' => 'Metadata', 'value' => $metadataCompletenessPercent . '%', 'tone' => $metadataCompletenessPercent >= 80 ? 'good' : 'warning'],
                    ['label' => 'Workflow', 'value' => $workflowCoveragePercent . '%', 'tone' => $workflowCoveragePercent >= 60 ? 'good' : 'warning'],
                    ['label' => 'Coverage', 'value' => $canonicalCoverage . '%', 'tone' => $canonicalCoverage >= 85 ? 'good' : 'warning'],
                ],
                'nextActions' => [
                    'Compile registry bundles after semantic changes and validate form/API/workflow projections.',
                    'Save persona views for builder onboarding and digital-thread walkthroughs.',
                ],
            ],
        ];

        foreach ($personas as &$persona) {
            $score = (int)($persona['readinessScore'] ?? 0);
            $persona['tone'] = $score >= 82 ? 'good' : ($score >= 68 ? 'warning' : 'critical');
        }
        unset($persona);

        return $personas;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildReviewPlaybooks(
        array $report,
        array $diff,
        array $governance,
        array $journeys,
        array $blockers,
        array $personas,
        int $metadataCompletenessPercent,
        int $workflowCoveragePercent
    ): array {
        $journeyByKey = [];
        foreach ($journeys as $journey) {
            if (is_array($journey) && trim((string)($journey['key'] ?? '')) !== '') {
                $journeyByKey[(string)$journey['key']] = $journey;
            }
        }
        $personaByKey = [];
        foreach ($personas as $persona) {
            if (is_array($persona) && trim((string)($persona['key'] ?? '')) !== '') {
                $personaByKey[(string)$persona['key']] = $persona;
            }
        }

        $destructiveCount = (int)($diff['summary']['destructiveCount'] ?? 0);
        $approvalClass = (string)($diff['summary']['approvalClass'] ?? 'standard');
        $releaseReadiness = (int)($report['summary']['releaseReadinessScore'] ?? 0);
        $governanceCoverage = (int)($governance['overallCoveragePercent'] ?? 0);

        return [
            [
                'key' => 'executive_release_gate',
                'title' => 'Executive release gate',
                'persona' => 'system_architect',
                'stage' => 'release',
                'startTab' => 'dashboard',
                'heatmap' => 'risk',
                'approvalLane' => $approvalClass,
                'readinessScore' => max(0, min(100, (int)round(($releaseReadiness * 0.45) + ((int)($personaByKey['system_architect']['readinessScore'] ?? 0) * 0.35) + ((100 - min(100, count($blockers) * 12)) * 0.20)))),
                'focusTables' => array_slice((array)($personaByKey['system_architect']['focusTables'] ?? []), 0, 6),
                'checklist' => [
                    'Review release radar, blocker board, and hotspot concentration.',
                    'Verify compatibility score, destructive change firewall status, and rollback narrative.',
                    'Confirm saved executive storyboard for CAB / architecture walkthrough.',
                    'Generate release notes and approval evidence bundle.',
                ],
                'hero' => 'Best for weekly architecture, CAB, and release steering reviews.',
            ],
            [
                'key' => 'migration_firewall_review',
                'title' => 'Migration firewall review',
                'persona' => 'data_engineer',
                'stage' => 'compare',
                'startTab' => 'compare',
                'heatmap' => 'canonical',
                'approvalLane' => $approvalClass,
                'readinessScore' => max(0, min(100, (int)round(((int)($personaByKey['data_engineer']['readinessScore'] ?? 0) * 0.55) + ((100 - min(100, $destructiveCount * 20)) * 0.25) + ((int)($diff['summary']['compatibilityScore'] ?? 100) * 0.20)))),
                'focusTables' => array_slice((array)($personaByKey['data_engineer']['focusTables'] ?? []), 0, 8),
                'checklist' => [
                    'Inspect typed diff items by severity, approval class, and rollback complexity.',
                    'Check relation endpoints, lock-sensitive alters, and index coverage changes.',
                    'Validate registry compiler output after compare and capture migration notes.',
                    'Escalate destructive or narrowing changes through elevated/CAB lanes.',
                ],
                'hero' => 'Best for schema compare, migration sequencing, and drift-safe releases.',
            ],
            [
                'key' => 'manufacturing_storyboard_walkthrough',
                'title' => 'Manufacturing storyboard walkthrough',
                'persona' => 'manufacturing_process_engineer',
                'stage' => 'manufacturing',
                'startTab' => 'manufacturing',
                'heatmap' => 'workflow',
                'approvalLane' => 'review',
                'readinessScore' => max(0, min(100, (int)round(((int)($journeyByKey['production_execution']['readinessScore'] ?? 0) * 0.40) + ((int)($journeyByKey['traceability']['readinessScore'] ?? 0) * 0.28) + ((int)($personaByKey['manufacturing_process_engineer']['readinessScore'] ?? 0) * 0.32)))),
                'focusTables' => array_slice((array)($personaByKey['manufacturing_process_engineer']['focusTables'] ?? []), 0, 8),
                'checklist' => [
                    'Trace planning, dispatch, execution, completion, and genealogy on one focused view.',
                    'Validate work-order workflow bindings and event/evidence capture points.',
                    'Confirm routing, operation, and resource tables remain linked to execution and quality.',
                    'Save line-centric views for planners, supervisors, and operations analysts.',
                ],
                'hero' => 'Best for line execution, genealogy, and production readiness reviews.',
            ],
            [
                'key' => 'quality_compliance_gate',
                'title' => 'Quality / compliance gate',
                'persona' => 'quality_manager',
                'stage' => 'diagnostics',
                'startTab' => 'diagnostics',
                'heatmap' => 'security',
                'approvalLane' => $governanceCoverage >= 60 ? 'review' : 'elevated',
                'readinessScore' => max(0, min(100, (int)round(((int)($personaByKey['quality_manager']['readinessScore'] ?? 0) * 0.42) + ((int)($personaByKey['compliance_lead']['readinessScore'] ?? 0) * 0.34) + ($governanceCoverage * 0.24)))),
                'focusTables' => array_slice(array_values(array_unique(array_merge(
                    (array)($personaByKey['quality_manager']['focusTables'] ?? []),
                    (array)($personaByKey['compliance_lead']['focusTables'] ?? [])
                ))), 0, 8),
                'checklist' => [
                    'Review approval/e-signature posture for controlled quality and deviation tables.',
                    'Check owner, steward, approver, evidence, and reason-code completeness.',
                    'Validate inspection, NC/CAPA, training, and document chains for auditability.',
                    'Promote only after governance and evidence signals are visible in diagnostics.',
                ],
                'hero' => 'Best for audit preparation, deviation closure, and eQMS governance reviews.',
            ],
            [
                'key' => 'builder_runtime_onboarding',
                'title' => 'Builder runtime onboarding',
                'persona' => 'app_builder_metadata_admin',
                'stage' => 'runtime',
                'startTab' => 'dashboard',
                'heatmap' => 'canonical',
                'approvalLane' => $workflowCoveragePercent >= 60 ? 'standard' : 'review',
                'readinessScore' => max(0, min(100, (int)round(((int)($personaByKey['app_builder_metadata_admin']['readinessScore'] ?? 0) * 0.44) + ($metadataCompletenessPercent * 0.28) + ($workflowCoveragePercent * 0.28)))),
                'focusTables' => array_slice((array)($personaByKey['app_builder_metadata_admin']['focusTables'] ?? []), 0, 8),
                'checklist' => [
                    'Compile registry bundle and review field/table/workflow projections.',
                    'Check table semantics, labels, widgets, and form/runtime hints for builder consumption.',
                    'Verify digital-thread links and domain saved views for builder packs.',
                    'Capture module onboarding notes and selective publish scope before promotion.',
                ],
                'hero' => 'Best for turning schema semantics into runtime metadata and builder accelerators.',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildReleaseLanesDetailed(
        array $report,
        array $diff,
        array $releaseRadar,
        array $blockers,
        array $governance,
        int $visualReadinessScore,
        int $workflowCoveragePercent
    ): array {
        $recommended = (string)($releaseRadar['recommendedLane'] ?? 'review');
        $criticalBlockers = count(array_filter($blockers, static fn($item): bool => is_array($item) && (string)($item['severity'] ?? '') === 'critical'));
        $compatibilityScore = (int)($diff['summary']['compatibilityScore'] ?? 100);
        $destructiveCount = (int)($diff['summary']['destructiveCount'] ?? 0);
        $governanceCoverage = (int)($governance['overallCoveragePercent'] ?? 0);
        $baseRelease = (int)($report['summary']['releaseReadinessScore'] ?? 0);

        $lanes = [
            [
                'key' => 'standard',
                'label' => 'Standard lane',
                'tone' => 'good',
                'score' => max(0, min(100, (int)round(($baseRelease * 0.34) + ($compatibilityScore * 0.26) + ($visualReadinessScore * 0.18) + ($workflowCoveragePercent * 0.12) + ((100 - min(100, count($blockers) * 14)) * 0.10)))),
                'eligible' => $criticalBlockers === 0 && $destructiveCount === 0 && $governanceCoverage >= 55 && $compatibilityScore >= 92,
                'hero' => 'Fastest governed release lane when compatibility and stewardship are already strong.',
                'gates' => [
                    'No destructive changes',
                    'Compatibility ≥ 92%',
                    'Governance ownership modeled',
                    'Saved release storyboard available',
                ],
            ],
            [
                'key' => 'review',
                'label' => 'Review board',
                'tone' => 'warning',
                'score' => max(0, min(100, (int)round(($baseRelease * 0.32) + ($compatibilityScore * 0.20) + ($governanceCoverage * 0.18) + ($visualReadinessScore * 0.14) + ($workflowCoveragePercent * 0.16)))),
                'eligible' => $criticalBlockers <= 1 && $compatibilityScore >= 84,
                'hero' => 'Default lane for world-class hardening, requiring structured review evidence.',
                'gates' => [
                    'Typed diff reviewed',
                    'Hotspots acknowledged',
                    'Approver comments recorded',
                    'Registry projections checked',
                ],
            ],
            [
                'key' => 'elevated',
                'label' => 'Elevated governance',
                'tone' => 'warning',
                'score' => max(0, min(100, (int)round(($baseRelease * 0.28) + ($governanceCoverage * 0.24) + ($visualReadinessScore * 0.16) + ((100 - min(100, $criticalBlockers * 25 + $destructiveCount * 20)) * 0.32)))),
                'eligible' => true,
                'hero' => 'Use when governance, workflow or evidence posture still needs formal remediation.',
                'gates' => [
                    'Owners / stewards / approvers assigned',
                    'Reason codes and evidence attached',
                    'Workflow bindings or runtime contracts clarified',
                    'Release notes include impact domains',
                ],
            ],
            [
                'key' => 'cab_esign',
                'label' => 'CAB / e-sign',
                'tone' => 'critical',
                'score' => max(0, min(100, (int)round(($baseRelease * 0.18) + ($governanceCoverage * 0.22) + ((100 - min(100, $destructiveCount * 30 + $criticalBlockers * 22)) * 0.60)))),
                'eligible' => $destructiveCount > 0 || $criticalBlockers > 0,
                'hero' => 'Mandatory for destructive changes, policy tightening, or high-risk canonical releases.',
                'gates' => [
                    'Rollback proof attached',
                    'CAB / e-sign approval captured',
                    'Effective window agreed',
                    'Post-release validation checklist ready',
                ],
            ],
        ];

        foreach ($lanes as &$lane) {
            $lane['recommended'] = $lane['key'] === $recommended;
            $lane['gateCount'] = count((array)$lane['gates']);
        }
        unset($lane);

        return $lanes;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildAiCopilotSuggestions(
        array $schema,
        array $report,
        array $diff,
        array $hotspots,
        array $governance,
        array $journeys,
        array $personas
    ): array {
        $topHotspot = is_array($hotspots[0] ?? null) ? $hotspots[0] : [];
        $topJourney = is_array($journeys[0] ?? null) ? $journeys[0] : [];
        $architect = is_array($personas[0] ?? null) ? $personas[0] : [];
        $qualityPersona = [];
        foreach ($personas as $persona) {
            if (is_array($persona) && (string)($persona['key'] ?? '') === 'quality_manager') {
                $qualityPersona = $persona;
                break;
            }
        }

        $designName = (string)($schema['_meta']['name'] ?? 'Schema Studio workspace');
        $approvalClass = (string)($diff['summary']['approvalClass'] ?? 'review');
        $compatibility = (int)($diff['summary']['compatibilityScore'] ?? 100);

        return [
            [
                'key' => 'impact_release_notes',
                'title' => 'Impact-aware release notes',
                'type' => 'governance',
                'objective' => 'Generate release notes grouped by domain, approval class, and runtime impact.',
                'prompt' => 'Summarize the typed diff for ' . $designName . ' into release notes grouped by domain, breaking vs non-breaking, migration risk, runtime impact, and required approvals. Highlight destructive changes, blockers, and rollback evidence requirements.',
                'confidence' => 0.93,
                'requiredApprovals' => [$approvalClass],
                'focusTables' => array_values(array_filter([(string)($topHotspot['table'] ?? '')])),
                'tone' => 'good',
            ],
            [
                'key' => 'hotspot_refactor_plan',
                'title' => 'Hotspot refactor plan',
                'type' => 'architecture',
                'objective' => 'Reduce dependency stress, missing metadata, and governance gaps on hub tables.',
                'prompt' => 'Propose a remediation plan for hotspot table ' . (string)($topHotspot['table'] ?? 'hotspot_table') . ' covering metadata enrichment, workflow bindings, policy posture, relation hygiene, index hints, and saved view presets for large-canvas readability.',
                'confidence' => 0.91,
                'requiredApprovals' => ['review', 'elevated'],
                'focusTables' => array_values(array_filter([(string)($topHotspot['table'] ?? '')])),
                'tone' => 'warning',
            ],
            [
                'key' => 'manufacturing_storyboard_prompt',
                'title' => 'Manufacturing storyboard builder',
                'type' => 'manufacturing',
                'objective' => 'Create line-ready views for planners, supervisors, and traceability teams.',
                'prompt' => 'Generate a manufacturing storyboard for journey ' . (string)($topJourney['label'] ?? 'production execution') . ' with focused tables, risk/workflow/canonical overlays, saved view names, and review checkpoints for planners, supervisors, and quality leads.',
                'confidence' => 0.89,
                'requiredApprovals' => ['review'],
                'focusTables' => array_slice((array)($topJourney['focusTables'] ?? []), 0, 6),
                'tone' => 'good',
            ],
            [
                'key' => 'quality_policy_gap_prompt',
                'title' => 'Quality & policy gap closure',
                'type' => 'quality',
                'objective' => 'Deepen stewardship, evidence, and RLS/policy semantics for controlled tables.',
                'prompt' => 'Inspect the current quality/compliance schema and propose missing ownership, approver roles, evidence fields, policy metadata, and workflow bindings for inspection, deviation, CAPA, document, and training tables. Include approval implications and audit narrative.',
                'confidence' => 0.88,
                'requiredApprovals' => ['elevated', 'cab_esign'],
                'focusTables' => array_slice((array)($qualityPersona['focusTables'] ?? []), 0, 8),
                'tone' => 'warning',
            ],
            [
                'key' => 'registry_sync_blueprint',
                'title' => 'Registry sync blueprint',
                'type' => 'builder',
                'objective' => 'Turn schema metadata into form/API/workflow runtime contracts with selective publish guidance.',
                'prompt' => 'Prepare a selective-publish plan that converts this schema into registry projections, field contracts, workflow bindings, builder pack hints, digital-thread links, and documentation artifacts. Include conflict resolution rules and compile order.',
                'confidence' => 0.92,
                'requiredApprovals' => ['review'],
                'focusTables' => array_slice((array)($architect['focusTables'] ?? []), 0, 6),
                'tone' => 'good',
            ],
            [
                'key' => 'migration_firewall_prompt',
                'title' => 'Migration firewall review prompt',
                'type' => 'migration',
                'objective' => 'Explain why risky changes need staged rollout, backfill, or CAB escalation.',
                'prompt' => 'Explain the migration risk posture for this schema compare with compatibility ' . $compatibility . '%, including destructive changes, lock risk, data backfill needs, rollback complexity, and recommended rollout sequence for standard/review/elevated/CAB lanes.',
                'confidence' => 0.90,
                'requiredApprovals' => [$approvalClass],
                'focusTables' => array_slice(array_values(array_filter(array_map(
                    static fn($item): string => is_array($item) ? (string)($item['table'] ?? '') : '',
                    array_slice((array)$hotspots, 0, 4)
                ))), 0, 4),
                'tone' => 'critical',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildRenderInsights(
        array $schema,
        array $domains,
        array $layers,
        array $dependencyMatrix,
        array $hotspots,
        int $visualReadinessScore
    ): array {
        $tableCount = count((array)($schema['tables'] ?? []));
        $relationCount = count((array)($schema['relations'] ?? []));
        $savedViewCount = count((array)($schema['views'] ?? []));
        $hotspotCount = count((array)$hotspots);
        $complexityScore = max(0, min(100, (int)round(
            (min(100, $tableCount * 0.48) * 0.34)
            + (min(100, $relationCount * 0.36) * 0.32)
            + (min(100, $hotspotCount * 16) * 0.18)
            + ((100 - min(100, $savedViewCount * 18)) * 0.16)
        )));

        $strongLinks = array_slice((array)($dependencyMatrix['strongestLinks'] ?? []), 0, 6);
        $suggestedLayouts = [
            ['key' => 'layered', 'label' => 'Layered governance view', 'reason' => 'Best for cross-layer operating model and executive walkthroughs.'],
            ['key' => 'domain', 'label' => 'Domain swimlanes', 'reason' => 'Best for ownership, stewardship, and bounded-context clarity.'],
            ['key' => 'lineage', 'label' => 'Execution lineage', 'reason' => 'Best for demand → execution → genealogy storyboards.'],
            ['key' => 'workflow', 'label' => 'Workflow-centric lens', 'reason' => 'Best for runtime contracts, approvals, and event chains.'],
        ];
        if ($tableCount >= 90) {
            $suggestedLayouts[] = ['key' => 'virtualized_force', 'label' => 'Virtualized force map', 'reason' => 'Use only for exploratory topology inspection on huge graphs.'];
        }

        return [
            'complexityScore' => $complexityScore,
            'complexityTier' => $tableCount >= 90 ? 'enterprise_huge' : ($tableCount >= 45 ? 'enterprise_large' : 'team_scale'),
            'tableCount' => $tableCount,
            'relationCount' => $relationCount,
            'savedViewCount' => $savedViewCount,
            'hotspotCount' => $hotspotCount,
            'visualReadinessScore' => $visualReadinessScore,
            'suggestedLayouts' => $suggestedLayouts,
            'dominantDomains' => array_slice(array_map(static function ($item): array {
                return [
                    'domain' => (string)($item['domain'] ?? ''),
                    'tableCount' => (int)($item['tableCount'] ?? 0),
                    'readinessScore' => (int)($item['readinessScore'] ?? 0),
                ];
            }, (array)$domains), 0, 6),
            'dominantLayers' => array_slice(array_map(static function ($item): array {
                return [
                    'layer' => (string)($item['layer'] ?? ''),
                    'tableCount' => (int)($item['tableCount'] ?? 0),
                    'readinessScore' => (int)($item['readinessScore'] ?? 0),
                ];
            }, (array)$layers), 0, 6),
            'strongLinks' => array_map(static function ($item): array {
                return [
                    'fromDomain' => (string)($item['fromDomain'] ?? ''),
                    'toDomain' => (string)($item['toDomain'] ?? ''),
                    'count' => (int)($item['count'] ?? 0),
                ];
            }, $strongLinks),
            'notes' => [
                'Prefer saved storyboard views over raw free-pan exploration for governance reviews.',
                'Use compact density for line/execution walkthroughs and comfortable density for compliance audits.',
                'Keep hotspot hub tables visible with KPI chips, but collapse low-signal domains during reviews.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildExperienceArtifact(string $designId, string $designName, array $health, array $report = [], array $diff = []): array
    {
        $summary = is_array($health['summary'] ?? null) ? $health['summary'] : [];
        return [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_experience_report',
                'designId' => $designId,
                'designName' => $designName,
            ],
            'summary' => [
                'experienceScore' => (int)($summary['experienceScore'] ?? 0),
                'complianceReadinessScore' => (int)($summary['complianceReadinessScore'] ?? 0),
                'performancePostureScore' => (int)($summary['performancePostureScore'] ?? 0),
                'registrySyncScore' => (int)($summary['registrySyncScore'] ?? 0),
                'aiCopilotReadinessScore' => (int)($summary['aiCopilotReadinessScore'] ?? 0),
                'operationsScore' => (int)($summary['operationsScore'] ?? 0),
                'promotionReadinessScore' => (int)($summary['promotionReadinessScore'] ?? 0),
                'firewallScore' => (int)($summary['firewallScore'] ?? 0),
                'observabilityScore' => (int)($summary['observabilityScore'] ?? 0),
                'commandCenterScore' => (int)($summary['commandCenterScore'] ?? 0),
                'personaCount' => (int)($summary['personaCount'] ?? count((array)($health['personas'] ?? []))),
                'playbookCount' => (int)($summary['playbookCount'] ?? count((array)($health['playbooks'] ?? []))),
                'releaseLaneCount' => (int)($summary['releaseLaneCount'] ?? count((array)($health['releaseLanes'] ?? []))),
                'copilotSuggestionCount' => (int)($summary['copilotSuggestionCount'] ?? count((array)($health['aiCopilot'] ?? []))),
                'focusDeckCount' => (int)($summary['focusDeckCount'] ?? count((array)($health['focusDeck'] ?? []))),
                'branchCount' => (int)($summary['branchCount'] ?? count((array)($health['branchTopology'] ?? []))),
            ],
            'hero' => [
                'headline' => 'Mission control round 5',
                'subheadline' => 'Operations score, promotion board, firewall, observability and focus decks turn the studio into a release command center.',
                'releaseReadinessScore' => (int)($report['summary']['releaseReadinessScore'] ?? $summary['releaseReadinessScore'] ?? 0),
                'compatibilityScore' => (int)($diff['summary']['compatibilityScore'] ?? $summary['compatibilityScore'] ?? 100),
                'hotspotCount' => (int)($summary['hotspotCount'] ?? 0),
                'operationsScore' => (int)($summary['operationsScore'] ?? 0),
                'firewallScore' => (int)($summary['firewallScore'] ?? 0),
            ],
            'personas' => array_slice((array)($health['personas'] ?? []), 0, 12),
            'playbooks' => array_slice((array)($health['playbooks'] ?? []), 0, 12),
            'releaseLanes' => array_slice((array)($health['releaseLanes'] ?? []), 0, 12),
            'aiCopilot' => array_slice((array)($health['aiCopilot'] ?? []), 0, 12),
            'renderInsights' => (array)($health['renderInsights'] ?? []),
            'operations' => (array)($health['operations'] ?? []),
            'promotionBoard' => array_slice((array)($health['promotionBoard'] ?? []), 0, 12),
            'firewall' => (array)($health['firewall'] ?? []),
            'branchTopology' => array_slice((array)($health['branchTopology'] ?? []), 0, 12),
            'focusDeck' => array_slice((array)($health['focusDeck'] ?? []), 0, 12),
            'observability' => (array)($health['observability'] ?? []),
            'eventRail' => array_slice((array)($health['eventRail'] ?? []), 0, 12),
            'hotspots' => array_slice((array)($health['hotspots'] ?? []), 0, 12),
            'blockers' => array_slice((array)($health['blockers'] ?? []), 0, 12),
        ];
    }


    /**
     * @param array<string, mixed> $summary
     * @return array<string, mixed>
     */
    private function buildOperationsDiagnostics(
        array $schema,
        array $summary,
        array $report,
        array $diff,
        array $domains,
        array $layers,
        array $governance,
        array $journeys,
        array $hotspots,
        array $blockers,
        array $releaseRadar,
        array $personas,
        array $playbooks,
        array $releaseLanes,
        array $renderInsights
    ): array {
        $score = static function ($value, int $fallback = 0): int {
            return max(0, min(100, (int)($value ?? $fallback)));
        };
        $statusFor = static function (int $value, int $good = 85, int $warn = 70): string {
            return $value >= $good ? 'ready' : ($value >= $warn ? 'attention' : 'hold');
        };
        $toneFor = static function (int $value): string {
            return $value >= 85 ? 'good' : ($value >= 70 ? 'warning' : 'critical');
        };

        $compatibilityScore = $score($summary['compatibilityScore'] ?? 100, 100);
        $riskScore = $score($summary['riskScore'] ?? 0, 0);
        $visualReadinessScore = $score($summary['visualReadinessScore'] ?? 0, 0);
        $metadataCompletenessPercent = $score($summary['metadataCompletenessPercent'] ?? 0, 0);
        $workflowCoveragePercent = $score($summary['workflowBindingCoveragePercent'] ?? 0, 0);
        $policyCoveragePercent = $score($summary['policyCoveragePercent'] ?? 0, 0);
        $governanceCoveragePercent = $score($summary['governanceCoveragePercent'] ?? 0, 0);
        $releaseReadinessScore = $score($summary['releaseReadinessScore'] ?? 0, 0);
        $releaseRadarScore = $score($summary['releaseRadarScore'] ?? 0, 0);
        $journeyReadinessScore = $score($summary['journeyReadinessScore'] ?? 0, 0);
        $domainReadinessScore = $score($summary['domainReadinessScore'] ?? 0, 0);
        $performancePostureScore = $score($summary['performancePostureScore'] ?? 0, 0);
        $registrySyncScore = $score($summary['registrySyncScore'] ?? 0, 0);
        $complianceReadinessScore = $score($summary['complianceReadinessScore'] ?? 0, 0);
        $aiCopilotReadinessScore = $score($summary['aiCopilotReadinessScore'] ?? 0, 0);
        $experienceScore = $score($summary['experienceScore'] ?? 0, 0);
        $orphanRelationRiskCount = (int)($summary['orphanRelationRiskCount'] ?? 0);
        $hotspotCount = (int)($summary['hotspotCount'] ?? count($hotspots));
        $blockerCount = (int)($summary['blockerCount'] ?? count($blockers));
        $destructiveCount = (int)($diff['summary']['destructiveCount'] ?? 0);
        $criticalCount = (int)($diff['summary']['criticalCount'] ?? 0);
        $breakingCount = (int)($diff['summary']['breakingCount'] ?? 0);
        $approvalClass = (string)($diff['summary']['approvalClass'] ?? 'standard');
        $recommendedLane = (string)($releaseRadar['recommendedLane'] ?? 'review');
        if ($approvalClass === 'cab') {
            $recommendedLane = 'cab_esign';
        }

        $firewallScore = max(0, min(100, (int)round(
            ($compatibilityScore * 0.34)
            + ((100 - min(100, $riskScore * 2)) * 0.26)
            + ($governanceCoveragePercent * 0.12)
            + ($policyCoveragePercent * 0.10)
            + ((100 - min(100, $destructiveCount * 30 + $criticalCount * 16 + $orphanRelationRiskCount * 12)) * 0.18)
        )));
        $promotionReadinessScore = max(0, min(100, (int)round(
            ($releaseReadinessScore * 0.24)
            + ($releaseRadarScore * 0.20)
            + ($compatibilityScore * 0.20)
            + ($governanceCoveragePercent * 0.14)
            + ($workflowCoveragePercent * 0.12)
            + ((100 - min(100, $blockerCount * 14)) * 0.10)
        )));
        $observabilityScore = max(0, min(100, (int)round(
            ($performancePostureScore * 0.28)
            + ($visualReadinessScore * 0.22)
            + ($registrySyncScore * 0.16)
            + ((100 - min(100, (int)($renderInsights['complexityScore'] ?? 0))) * 0.12)
            + ($metadataCompletenessPercent * 0.12)
            + ((100 - min(100, $hotspotCount * 12)) * 0.10)
        )));
        $commandCenterScore = max(0, min(100, (int)round(
            ($experienceScore * 0.30)
            + ($promotionReadinessScore * 0.24)
            + ($firewallScore * 0.18)
            + ($observabilityScore * 0.14)
            + ($journeyReadinessScore * 0.14)
        )));
        $operationsScore = max(0, min(100, (int)round(
            ($commandCenterScore * 0.28)
            + ($promotionReadinessScore * 0.24)
            + ($firewallScore * 0.18)
            + ($observabilityScore * 0.12)
            + ($registrySyncScore * 0.08)
            + ($aiCopilotReadinessScore * 0.10)
        )));

        $environmentBlueprints = [
            [
                'key' => 'workspace',
                'label' => 'Workspace design',
                'purpose' => 'Fast modeling, compare, saved views, and AI-assisted drafting before formal review.',
                'score' => max(0, min(100, (int)round(($visualReadinessScore * 0.26) + ($metadataCompletenessPercent * 0.22) + ($experienceScore * 0.18) + ($aiCopilotReadinessScore * 0.18) + ((100 - min(100, $hotspotCount * 10)) * 0.16)))),
                'gate' => 'Model clarity, typed diff preview, focus decks',
                'nextAction' => 'Save canonical views, resolve hotspot hubs, and capture compare notes.',
            ],
            [
                'key' => 'integration',
                'label' => 'Integration / registry',
                'purpose' => 'Compile runtime projections, sync workflow bindings, and validate module-builder contracts.',
                'score' => max(0, min(100, (int)round(($registrySyncScore * 0.36) + ($workflowCoveragePercent * 0.24) + ($metadataCompletenessPercent * 0.16) + ((100 - min(100, $orphanRelationRiskCount * 18)) * 0.12) + ((100 - min(100, $blockerCount * 12)) * 0.12)))),
                'gate' => 'Compiler output, registry drift, workflow contracts',
                'nextAction' => 'Compile registry bundle and inspect API/workflow projection deltas.',
            ],
            [
                'key' => 'uat',
                'label' => 'Controlled UAT',
                'purpose' => 'Walk release evidence, promotion gates, and persona/storyboard reviews with stakeholders.',
                'score' => max(0, min(100, (int)round(($promotionReadinessScore * 0.32) + ($governanceCoveragePercent * 0.18) + ($journeyReadinessScore * 0.18) + ($compatibilityScore * 0.18) + ($complianceReadinessScore * 0.14)))),
                'gate' => 'Evidence, governance sign-off, lane readiness',
                'nextAction' => 'Run review playbooks, validate blockers, and lock effective window.',
            ],
            [
                'key' => 'production',
                'label' => 'Production release',
                'purpose' => 'Governed release with firewall controls, rollback narrative, and post-release verification.',
                'score' => max(0, min(100, (int)round(($releaseReadinessScore * 0.28) + ($firewallScore * 0.26) + ($complianceReadinessScore * 0.22) + ($compatibilityScore * 0.14) + ((100 - min(100, $destructiveCount * 22 + $criticalCount * 14)) * 0.10)))),
                'gate' => 'Firewall clear, release lane approved, rollback proof',
                'nextAction' => 'Release only when destructive and critical diff items are fully governed.',
            ],
        ];

        $environments = array_map(static function (array $item) use ($statusFor, $toneFor): array {
            $item['status'] = $statusFor((int)$item['score']);
            $item['tone'] = $toneFor((int)$item['score']);
            return $item;
        }, $environmentBlueprints);

        $branchTopology = [
            [
                'key' => 'main',
                'label' => 'Main canonical branch',
                'type' => 'source_of_truth',
                'target' => 'workspace',
                'score' => max(0, min(100, (int)round(($registrySyncScore * 0.30) + ($metadataCompletenessPercent * 0.24) + ($workflowCoveragePercent * 0.18) + ($governanceCoveragePercent * 0.14) + ($visualReadinessScore * 0.14)))),
                'lane' => 'standard',
                'focus' => 'Canonical baseline, layer/domain alignment, source-of-truth stewardship',
            ],
            [
                'key' => 'preview',
                'label' => 'Preview branch',
                'type' => 'sandbox',
                'target' => 'integration',
                'score' => max(0, min(100, (int)round(($experienceScore * 0.22) + ($aiCopilotReadinessScore * 0.18) + ($visualReadinessScore * 0.18) + ((100 - min(100, $hotspotCount * 8)) * 0.14) + ($metadataCompletenessPercent * 0.14) + ($registrySyncScore * 0.14)))),
                'lane' => 'review',
                'focus' => 'Fast compare loops, AI prompts, and saved storyboard experimentation',
            ],
            [
                'key' => 'release_candidate',
                'label' => 'Release candidate',
                'type' => 'promotion',
                'target' => 'uat',
                'score' => max(0, min(100, (int)round(($promotionReadinessScore * 0.42) + ($compatibilityScore * 0.22) + ($governanceCoveragePercent * 0.18) + ($releaseRadarScore * 0.18)))),
                'lane' => $recommendedLane,
                'focus' => 'Promotion gates, approval matrix, release notes, and runtime contract freeze',
            ],
            [
                'key' => 'hotfix',
                'label' => 'Hotfix branch',
                'type' => 'operational',
                'target' => 'production',
                'score' => max(0, min(100, (int)round(($firewallScore * 0.42) + ($complianceReadinessScore * 0.24) + ($compatibilityScore * 0.16) + ((100 - min(100, $destructiveCount * 25)) * 0.18)))),
                'lane' => $destructiveCount > 0 || $criticalCount > 0 ? 'cab_esign' : 'elevated',
                'focus' => 'Controlled emergency remediation with explicit rollback and CAB discipline',
            ],
        ];
        foreach ($branchTopology as &$branch) {
            $branch['status'] = $statusFor((int)($branch['score'] ?? 0), 84, 68);
            $branch['tone'] = $toneFor((int)($branch['score'] ?? 0));
        }
        unset($branch);

        $promotionStages = [
            [
                'key' => 'discover',
                'label' => 'Discover',
                'score' => max(0, min(100, (int)round(($visualReadinessScore * 0.36) + ($journeyReadinessScore * 0.28) + ($domainReadinessScore * 0.20) + ($experienceScore * 0.16)))),
                'gate' => 'Graph readability, domain/layer clarity, focus deck ready',
                'nextAction' => 'Open mission control, apply persona rails, and save context views.',
            ],
            [
                'key' => 'model',
                'label' => 'Model & diff',
                'score' => max(0, min(100, (int)round(($metadataCompletenessPercent * 0.30) + ($compatibilityScore * 0.22) + ($workflowCoveragePercent * 0.18) + ($policyCoveragePercent * 0.16) + ((100 - min(100, $orphanRelationRiskCount * 16)) * 0.14)))),
                'gate' => 'Typed diff, policy intent, contract continuity',
                'nextAction' => 'Review diff items by severity, approval class, and rollback complexity.',
            ],
            [
                'key' => 'governance',
                'label' => 'Governance review',
                'score' => max(0, min(100, (int)round(($governanceCoveragePercent * 0.34) + ($complianceReadinessScore * 0.22) + ($policyCoveragePercent * 0.16) + ($workflowCoveragePercent * 0.14) + ((100 - min(100, $blockerCount * 16)) * 0.14)))),
                'gate' => 'Owner/steward/approver, evidence, policy posture',
                'nextAction' => 'Attach review evidence and close blockers before promotion.',
            ],
            [
                'key' => 'promotion',
                'label' => 'Promotion',
                'score' => $promotionReadinessScore,
                'gate' => 'Lane recommendation, release radar, branch topology',
                'nextAction' => 'Move only after compile, compare, and release-lane gates are green.',
            ],
            [
                'key' => 'release',
                'label' => 'Release',
                'score' => max(0, min(100, (int)round(($releaseReadinessScore * 0.34) + ($firewallScore * 0.22) + ($compatibilityScore * 0.20) + ($registrySyncScore * 0.12) + ((100 - min(100, $destructiveCount * 20 + $criticalCount * 14)) * 0.12)))),
                'gate' => 'Firewall clear, compiler synced, rollback rehearsed',
                'nextAction' => 'Publish through the recommended lane and capture release notes.',
            ],
            [
                'key' => 'verify',
                'label' => 'Verify',
                'score' => max(0, min(100, (int)round(($observabilityScore * 0.32) + ($registrySyncScore * 0.20) + ($performancePostureScore * 0.18) + ($experienceScore * 0.14) + ($aiCopilotReadinessScore * 0.16)))),
                'gate' => 'Registry health, observability, post-release storyboards',
                'nextAction' => 'Inspect command center observability tiles and update evidence timeline.',
            ],
        ];
        foreach ($promotionStages as &$stage) {
            $stage['status'] = $statusFor((int)($stage['score'] ?? 0), 82, 68);
            $stage['tone'] = $toneFor((int)($stage['score'] ?? 0));
        }
        unset($stage);

        $laneKeys = array_values(array_unique(array_map(static function ($lane): string {
            return (string)($lane['key'] ?? '');
        }, $releaseLanes)));
        $firewall = [
            'approvalClass' => $approvalClass,
            'recommendedLane' => $recommendedLane,
            'firewallScore' => $firewallScore,
            'destructiveCount' => $destructiveCount,
            'criticalCount' => $criticalCount,
            'breakingCount' => $breakingCount,
            'blockerCount' => $blockerCount,
            'riskScore' => $riskScore,
            'compatibilityScore' => $compatibilityScore,
            'evidenceCoveragePercent' => $score($governance['evidenceCoveragePercent'] ?? 0, 0),
            'approverCoveragePercent' => $score($governance['approverCoveragePercent'] ?? 0, 0),
            'workflowCoveragePercent' => $workflowCoveragePercent,
            'policyCoveragePercent' => $policyCoveragePercent,
            'clearToPromote' => $destructiveCount === 0 && $criticalCount === 0 && $blockerCount <= 1 && $governanceCoveragePercent >= 60,
            'gates' => [
                ['label' => 'Destructive diff', 'status' => $destructiveCount === 0 ? 'clear' : 'blocked', 'detail' => $destructiveCount . ' destructive changes'],
                ['label' => 'Critical blockers', 'status' => $criticalCount === 0 && $blockerCount <= 1 ? 'clear' : 'attention', 'detail' => $criticalCount . ' critical diff items, ' . $blockerCount . ' blockers'],
                ['label' => 'Evidence & approvers', 'status' => (($governance['evidenceCoveragePercent'] ?? 0) >= 80 && ($governance['approverCoveragePercent'] ?? 0) >= 80) ? 'clear' : 'attention', 'detail' => 'Evidence ' . ($governance['evidenceCoveragePercent'] ?? 0) . '% · Approvers ' . ($governance['approverCoveragePercent'] ?? 0) . '%'],
                ['label' => 'Policy & workflow', 'status' => $policyCoveragePercent >= 85 && $workflowCoveragePercent >= 85 ? 'clear' : 'attention', 'detail' => 'Policy ' . $policyCoveragePercent . '% · Workflow ' . $workflowCoveragePercent . '%'],
            ],
            'allowedLanes' => array_values(array_filter($laneKeys)),
        ];

        $observability = [
            'score' => $observabilityScore,
            'complexityScore' => (int)($renderInsights['complexityScore'] ?? 0),
            'complexityTier' => (string)($renderInsights['complexityTier'] ?? 'team_scale'),
            'tiles' => [
                ['key' => 'virtualization', 'label' => 'Canvas virtualization', 'score' => max(0, min(100, (int)round(($performancePostureScore * 0.44) + ((100 - min(100, (int)($renderInsights['complexityScore'] ?? 0))) * 0.24) + ($visualReadinessScore * 0.16) + ((100 - min(100, $hotspotCount * 10)) * 0.16)))), 'detail' => 'Supports huge graph readability through score-aware rendering posture.'],
                ['key' => 'search_index', 'label' => 'Search / command indexing', 'score' => max(0, min(100, (int)round(($metadataCompletenessPercent * 0.40) + ($experienceScore * 0.20) + ($registrySyncScore * 0.20) + ($visualReadinessScore * 0.20)))), 'detail' => 'Keyboard-first discovery quality depends on metadata completeness and saved view hygiene.'],
                ['key' => 'inspector_lazy', 'label' => 'Inspector laziness', 'score' => max(0, min(100, (int)round(($performancePostureScore * 0.38) + ($experienceScore * 0.22) + ((100 - min(100, $hotspotCount * 8)) * 0.20) + ($journeyReadinessScore * 0.20)))), 'detail' => 'Inspector load posture stays healthy when hotspot hubs are controlled.'],
                ['key' => 'registry_freshness', 'label' => 'Registry freshness', 'score' => max(0, min(100, (int)round(($registrySyncScore * 0.46) + ($workflowCoveragePercent * 0.24) + ($metadataCompletenessPercent * 0.18) + ($compatibilityScore * 0.12)))), 'detail' => 'Tracks how confidently the control plane can project contracts to runtime.'],
            ],
            'notes' => [
                'Prefer focus decks over free-pan exploration for large-graph executive reviews.',
                'Use promotion board stages as the default review route for release governance.',
                'Track firewall score alongside compatibility; both must remain visible during sign-off.',
            ],
        ];
        foreach ($observability['tiles'] as &$tile) {
            $tile['tone'] = $toneFor((int)($tile['score'] ?? 0));
        }
        unset($tile);

        $focusDeck = [];
        $focusDeck[] = [
            'key' => 'executive_release_orbit',
            'title' => 'Executive release orbit',
            'type' => 'executive',
            'score' => $commandCenterScore,
            'focus' => 'Release radar, promotion stages, firewall, and branch readiness',
            'targets' => array_values(array_unique(array_map(static function ($lane): string {
                return (string)($lane['key'] ?? '');
            }, $releaseLanes))),
        ];
        $focusDeck[] = [
            'key' => 'governance_firewall_board',
            'title' => 'Governance firewall board',
            'type' => 'governance',
            'score' => $firewallScore,
            'focus' => 'Approver coverage, evidence posture, destructive diff gating',
            'targets' => array_slice((array)($governance['missingOwners'] ?? []), 0, 6),
        ];
        foreach (array_slice($journeys, 0, 2) as $journey) {
            if (!is_array($journey)) {
                continue;
            }
            $focusDeck[] = [
                'key' => 'journey_' . (string)($journey['key'] ?? 'journey'),
                'title' => (string)($journey['label'] ?? $journey['key'] ?? 'Journey'),
                'type' => 'journey',
                'score' => $score($journey['readinessScore'] ?? 0, 0),
                'focus' => (string)($journey['focus'] ?? ''),
                'targets' => array_slice((array)($journey['tablesPresent'] ?? $journey['requiredTables'] ?? []), 0, 8),
            ];
        }
        if (!empty($hotspots)) {
            $topHotspots = array_slice($hotspots, 0, 2);
            foreach ($topHotspots as $hotspot) {
                if (!is_array($hotspot)) {
                    continue;
                }
                $focusDeck[] = [
                    'key' => 'hotspot_' . (string)($hotspot['tableId'] ?? 'hub'),
                    'title' => (string)($hotspot['table'] ?? 'Hotspot'),
                    'type' => 'hotspot',
                    'score' => max(0, 100 - min(100, (int)($hotspot['score'] ?? 0))),
                    'focus' => 'Dependency hotspot and metadata pressure remediation',
                    'targets' => [(string)($hotspot['table'] ?? '')],
                ];
            }
        }
        $focusDeck = array_slice($focusDeck, 0, 6);
        foreach ($focusDeck as &$deck) {
            $deck['tone'] = $toneFor((int)($deck['score'] ?? 0));
        }
        unset($deck);

        $eventRail = [];
        $eventRail[] = [
            'key' => 'baseline',
            'label' => 'Baseline secured',
            'detail' => 'Canonical baseline and enterprise compiler artifacts are available for compare and rollback.',
            'status' => 'recorded',
        ];
        $eventRail[] = [
            'key' => 'diagnostics',
            'label' => 'Diagnostics refreshed',
            'detail' => 'Health, firewall, promotion, and observability signals are regenerated from the latest schema snapshot.',
            'status' => 'recorded',
        ];
        $eventRail[] = [
            'key' => 'promotion',
            'label' => 'Promotion lane ' . $recommendedLane,
            'detail' => 'Recommended release lane is derived from radar, blockers, and diff governance.',
            'status' => $promotionReadinessScore >= 80 ? 'ready' : 'attention',
        ];
        if ($destructiveCount > 0 || $criticalCount > 0) {
            $eventRail[] = [
                'key' => 'firewall',
                'label' => 'Firewall escalation',
                'detail' => 'Destructive or critical diff items require elevated evidence and release discipline.',
                'status' => 'attention',
            ];
        }

        return [
            'summary' => [
                'operationsScore' => $operationsScore,
                'promotionReadinessScore' => $promotionReadinessScore,
                'firewallScore' => $firewallScore,
                'observabilityScore' => $observabilityScore,
                'commandCenterScore' => $commandCenterScore,
                'environmentCount' => count($environments),
                'stageCount' => count($promotionStages),
                'focusDeckCount' => count($focusDeck),
                'branchCount' => count($branchTopology),
                'eventRailCount' => count($eventRail),
            ],
            'environments' => $environments,
            'promotionBoard' => $promotionStages,
            'firewall' => $firewall,
            'branchTopology' => $branchTopology,
            'focusDeck' => $focusDeck,
            'observability' => $observability,
            'eventRail' => $eventRail,
        ];
    }



    /**
     * @return array<string, mixed>
     */
    private function buildOperationsArtifact(string $designId, string $designName, array $health, array $report = [], array $diff = [], ?string $actor = null): array
    {
        $artifact = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_operations_report',
                'designId' => $designId,
                'designName' => $designName,
            ],
            'summary' => (array)($health['operations'] ?? []),
            'environments' => array_slice((array)($health['environments'] ?? []), 0, 12),
            'promotionBoard' => array_slice((array)($health['promotionBoard'] ?? []), 0, 12),
            'firewall' => (array)($health['firewall'] ?? []),
            'branchTopology' => array_slice((array)($health['branchTopology'] ?? []), 0, 12),
            'focusDeck' => array_slice((array)($health['focusDeck'] ?? []), 0, 12),
            'observability' => (array)($health['observability'] ?? []),
            'eventRail' => array_slice((array)($health['eventRail'] ?? []), 0, 12),
            'releaseRadar' => (array)($health['releaseRadar'] ?? []),
            'releaseLanes' => array_slice((array)($health['releaseLanes'] ?? []), 0, 12),
            'playbooks' => array_slice((array)($health['playbooks'] ?? []), 0, 12),
            'personas' => array_slice((array)($health['personas'] ?? []), 0, 12),
            'reportSummary' => (array)($report['summary'] ?? []),
            'diffSummary' => (array)($diff['summary'] ?? []),
        ];
        if ($actor !== null && $actor !== '') {
            $artifact['_meta']['actor'] = $actor;
        }
        return $artifact;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildCommandCenterArtifact(string $designId, string $designName, array $health, array $report = [], array $diff = [], ?string $actor = null): array
    {
        $summary = is_array($health['summary'] ?? null) ? $health['summary'] : [];
        $operationsSummary = is_array($health['operations'] ?? null) ? $health['operations'] : [];
        $storyboards = array_slice((array)($health['storyboards'] ?? []), 0, 12);
        $journeys = array_slice((array)($health['journeys'] ?? []), 0, 12);
        $domains = array_slice((array)($health['domains'] ?? []), 0, 12);
        $layers = array_slice((array)($health['layers'] ?? []), 0, 12);
        $personas = array_slice((array)($health['personas'] ?? []), 0, 12);
        $playbooks = array_slice((array)($health['playbooks'] ?? []), 0, 12);
        $releaseLanes = array_slice((array)($health['releaseLanes'] ?? []), 0, 12);
        $promotionBoard = array_slice((array)($health['promotionBoard'] ?? []), 0, 12);
        $focusDeck = array_slice((array)($health['focusDeck'] ?? []), 0, 12);
        $hotspots = array_slice((array)($health['hotspots'] ?? []), 0, 12);
        $blockers = array_slice((array)($health['blockers'] ?? []), 0, 12);
        $recommendations = array_slice((array)($health['recommendations'] ?? []), 0, 12);
        $observability = is_array($health['observability'] ?? null) ? $health['observability'] : [];
        $eventRail = array_slice((array)($health['eventRail'] ?? []), 0, 12);
        $environments = array_slice((array)($health['environments'] ?? []), 0, 12);
        $renderInsights = is_array($health['renderInsights'] ?? null) ? $health['renderInsights'] : [];
        $releaseRadar = is_array($health['releaseRadar'] ?? null) ? $health['releaseRadar'] : [];
        $governance = is_array($health['governance'] ?? null) ? $health['governance'] : [];
        $dependencyMatrix = is_array($health['dependencyMatrix'] ?? null) ? $health['dependencyMatrix'] : [];
        $compatibilityScore = (int)($diff['summary']['compatibilityScore'] ?? $summary['compatibilityScore'] ?? 100);
        $riskScore = (int)($diff['summary']['riskScore'] ?? $summary['riskScore'] ?? 0);
        $releaseReadinessScore = (int)($summary['releaseReadinessScore'] ?? 0);
        $journeyReadinessScore = (int)($summary['journeyReadinessScore'] ?? 0);
        $domainReadinessScore = (int)($summary['domainReadinessScore'] ?? 0);
        $visualReadinessScore = (int)($summary['visualReadinessScore'] ?? 0);
        $metadataCompletenessPercent = (int)($summary['metadataCompletenessPercent'] ?? 0);
        $workflowCoveragePercent = (int)($summary['workflowBindingCoveragePercent'] ?? 0);
        $governanceCoveragePercent = (int)($summary['governanceCoveragePercent'] ?? 0);
        $complianceReadinessScore = (int)($summary['complianceReadinessScore'] ?? 0);
        $performancePostureScore = (int)($summary['performancePostureScore'] ?? 0);
        $registrySyncScore = (int)($summary['registrySyncScore'] ?? 0);
        $experienceScore = (int)($summary['experienceScore'] ?? 0);
        $operationsScore = (int)($summary['operationsScore'] ?? $operationsSummary['operationsScore'] ?? 0);
        $promotionReadinessScore = (int)($summary['promotionReadinessScore'] ?? $operationsSummary['promotionReadinessScore'] ?? 0);
        $firewallScore = (int)($summary['firewallScore'] ?? $operationsSummary['firewallScore'] ?? 0);
        $observabilityScore = (int)($summary['observabilityScore'] ?? $operationsSummary['observabilityScore'] ?? 0);
        $commandCenterScore = (int)($summary['commandCenterScore'] ?? $operationsSummary['commandCenterScore'] ?? 0);
        $policyCoveragePercent = (int)($summary['policyCoveragePercent'] ?? 0);
        $canonicalCoveragePercent = (int)($report['summary']['canonicalCoveragePercent'] ?? $summary['canonicalCoveragePercent'] ?? 0);
        $blockerCount = (int)($summary['blockerCount'] ?? count($blockers));
        $hotspotCount = (int)($summary['hotspotCount'] ?? count($hotspots));
        $personaCount = count($personas);
        $playbookCount = count($playbooks);
        $releaseLaneCount = count($releaseLanes);
        $focusDeckCount = count($focusDeck);
        $sceneSeedCount = max(count($storyboards), count($journeys), count($focusDeck));
        $storyboardCoverageScore = min(100, $sceneSeedCount * 14);
        $collaborationSignals = min(100, ($personaCount * 16) + ($playbookCount * 12) + ($releaseLaneCount * 10));

        $spotlight = [];
        foreach (array_slice($focusDeck, 0, 4) as $deck) {
            if (!is_array($deck)) {
                continue;
            }
            $spotlight[] = [
                'key' => (string)($deck['key'] ?? 'focus_deck'),
                'title' => (string)($deck['title'] ?? $deck['key'] ?? 'Focus deck'),
                'subtitle' => (string)($deck['focus'] ?? ''),
                'score' => (int)($deck['score'] ?? 0),
                'tone' => (string)($deck['tone'] ?? (((int)($deck['score'] ?? 0)) >= 85 ? 'good' : (((int)($deck['score'] ?? 0)) >= 70 ? 'warning' : 'critical'))),
                'targets' => array_slice((array)($deck['targets'] ?? []), 0, 6),
                'kind' => (string)($deck['type'] ?? 'deck'),
            ];
        }
        foreach (array_slice($personas, 0, max(0, 6 - count($spotlight))) as $persona) {
            if (!is_array($persona)) {
                continue;
            }
            $spotlight[] = [
                'key' => 'persona_' . (string)($persona['key'] ?? 'persona'),
                'title' => (string)($persona['label'] ?? $persona['key'] ?? 'Persona'),
                'subtitle' => (string)($persona['focus'] ?? ''),
                'score' => (int)($persona['readinessScore'] ?? 0),
                'tone' => ((string)($persona['priority'] ?? 'high') === 'high') ? 'good' : 'warning',
                'targets' => array_slice((array)($persona['focusTables'] ?? []), 0, 6),
                'kind' => 'persona',
            ];
        }
        $spotlight = array_slice($spotlight, 0, 6);

        $reviewLanes = [];
        foreach ($promotionBoard as $stage) {
            if (!is_array($stage)) {
                continue;
            }
            $reviewLanes[] = [
                'key' => (string)($stage['key'] ?? 'stage'),
                'label' => (string)($stage['label'] ?? $stage['key'] ?? 'Stage'),
                'score' => (int)($stage['score'] ?? 0),
                'status' => (string)($stage['status'] ?? 'attention'),
                'gate' => (string)($stage['gate'] ?? $stage['nextAction'] ?? ''),
                'nextAction' => (string)($stage['nextAction'] ?? ''),
            ];
        }
        $reviewLanes = array_slice($reviewLanes, 0, 6);
        $evidenceStack = [];
        foreach (array_slice($blockers, 0, 3) as $blocker) {
            if (!is_array($blocker)) {
                continue;
            }
            $evidenceStack[] = [
                'kind' => 'blocker',
                'title' => (string)($blocker['title'] ?? $blocker['label'] ?? $blocker['key'] ?? 'Blocker'),
                'detail' => (string)($blocker['detail'] ?? $blocker['reason'] ?? ''),
                'tone' => 'critical',
            ];
        }
        foreach (array_slice($hotspots, 0, max(0, 5 - count($evidenceStack))) as $hotspot) {
            if (!is_array($hotspot)) {
                continue;
            }
            $evidenceStack[] = [
                'kind' => 'hotspot',
                'title' => (string)($hotspot['table'] ?? $hotspot['tableId'] ?? 'Hotspot'),
                'detail' => 'Dependency score ' . (string)($hotspot['score'] ?? 0) . ' · ' . (string)($hotspot['reason'] ?? ''),
                'tone' => 'warning',
            ];
        }
        foreach (array_slice($recommendations, 0, max(0, 7 - count($evidenceStack))) as $recommendation) {
            if (!is_array($recommendation)) {
                continue;
            }
            $evidenceStack[] = [
                'kind' => 'recommendation',
                'title' => (string)($recommendation['title'] ?? $recommendation['key'] ?? 'Recommendation'),
                'detail' => (string)($recommendation['detail'] ?? $recommendation['reason'] ?? ''),
                'tone' => 'good',
            ];
        }

        $atlas = [
            [
                'key' => 'domains',
                'label' => 'Domain atlas',
                'count' => count($domains),
                'items' => array_map(static function ($item): array {
                    return [
                        'label' => (string)($item['domain'] ?? ''),
                        'score' => (int)($item['readinessScore'] ?? 0),
                        'detail' => (string)($item['tableCount'] ?? 0) . ' tables',
                    ];
                }, array_slice($domains, 0, 6)),
            ],
            [
                'key' => 'layers',
                'label' => 'Layer atlas',
                'count' => count($layers),
                'items' => array_map(static function ($item): array {
                    return [
                        'label' => (string)($item['layer'] ?? ''),
                        'score' => (int)($item['readinessScore'] ?? 0),
                        'detail' => (string)($item['tableCount'] ?? 0) . ' tables',
                    ];
                }, array_slice($layers, 0, 6)),
            ],
            [
                'key' => 'journeys',
                'label' => 'Journey atlas',
                'count' => count($journeys),
                'items' => array_map(static function ($item): array {
                    return [
                        'label' => (string)($item['label'] ?? $item['key'] ?? ''),
                        'score' => (int)($item['readinessScore'] ?? 0),
                        'detail' => (string)count((array)($item['tablesPresent'] ?? [])) . '/' . (string)count((array)($item['requiredTables'] ?? [])) . ' tables',
                    ];
                }, array_slice($journeys, 0, 6)),
            ],
            [
                'key' => 'dependencies',
                'label' => 'Dependency matrix',
                'count' => count((array)($dependencyMatrix['strongLinks'] ?? [])),
                'items' => array_map(static function ($item): array {
                    return [
                        'label' => (string)($item['fromDomain'] ?? '') . ' → ' . (string)($item['toDomain'] ?? ''),
                        'score' => min(100, (int)($item['count'] ?? 0) * 8),
                        'detail' => (string)($item['count'] ?? 0) . ' links',
                    ];
                }, array_slice((array)($dependencyMatrix['strongLinks'] ?? []), 0, 6)),
            ],
        ];
        $atlas = array_slice($atlas, 0, 4);

        $livePulseBands = [
            ['key' => 'observability', 'label' => 'Observability', 'score' => $observabilityScore, 'detail' => 'Canvas scale, inspector laziness, registry freshness'],
            ['key' => 'promotion', 'label' => 'Promotion', 'score' => $promotionReadinessScore, 'detail' => 'Lane, firewall, branch posture, review velocity'],
            ['key' => 'firewall', 'label' => 'Firewall', 'score' => $firewallScore, 'detail' => 'Destructive change gating and approval posture'],
            ['key' => 'release_radar', 'label' => 'Release radar', 'score' => (int)($summary['releaseRadarScore'] ?? 0), 'detail' => (string)($releaseRadar['recommendedLane'] ?? 'review') . ' lane recommended'],
        ];
        $livePulseRadar = [];
        foreach (array_slice((array)($observability['tiles'] ?? []), 0, 4) as $tile) {
            if (!is_array($tile)) {
                continue;
            }
            $livePulseRadar[] = [
                'label' => (string)($tile['label'] ?? $tile['key'] ?? 'Tile'),
                'score' => (int)($tile['score'] ?? 0),
                'detail' => (string)($tile['detail'] ?? ''),
            ];
        }
        foreach (array_slice($eventRail, 0, max(0, 6 - count($livePulseRadar))) as $event) {
            if (!is_array($event)) {
                continue;
            }
            $livePulseRadar[] = [
                'label' => (string)($event['label'] ?? $event['key'] ?? 'Event'),
                'score' => (string)($event['status'] ?? '') === 'ready' ? 92 : ((string)($event['status'] ?? '') === 'attention' ? 74 : 84),
                'detail' => (string)($event['detail'] ?? ''),
            ];
        }
        $livePulseRadar = array_slice($livePulseRadar, 0, 6);

        $collaboration = [
            'ownersCoveredPercent' => (int)($governance['ownerCoveragePercent'] ?? $governanceCoveragePercent),
            'approverCoveragePercent' => (int)($governance['approverCoveragePercent'] ?? 0),
            'evidenceCoveragePercent' => (int)($governance['evidenceCoveragePercent'] ?? 0),
            'personaCount' => $personaCount,
            'playbookCount' => $playbookCount,
            'releaseLaneCount' => $releaseLaneCount,
            'environments' => array_map(static function ($item): array {
                return [
                    'label' => (string)($item['label'] ?? $item['key'] ?? 'Environment'),
                    'score' => (int)($item['score'] ?? 0),
                    'status' => (string)($item['status'] ?? ''),
                ];
            }, array_slice($environments, 0, 4)),
        ];

        $scenes = [];
        foreach ($storyboards as $board) {
            if (!is_array($board)) {
                continue;
            }
            $scenes[] = [
                'key' => (string)($board['key'] ?? 'scene'),
                'title' => (string)($board['title'] ?? $board['key'] ?? 'Scene'),
                'subtitle' => (string)($board['subtitle'] ?? $board['narrative'] ?? ''),
                'ambience' => (string)($board['ambience'] ?? 'midnight'),
                'density' => (string)($board['density'] ?? 'comfortable'),
                'heatmap' => (string)($board['heatmap'] ?? 'risk'),
                'focusTables' => array_slice((array)($board['focusTables'] ?? []), 0, 8),
            ];
        }
        foreach ($journeys as $journey) {
            if (count($scenes) >= 8) {
                break;
            }
            if (!is_array($journey)) {
                continue;
            }
            $scenes[] = [
                'key' => 'journey_' . (string)($journey['key'] ?? 'journey'),
                'title' => (string)($journey['label'] ?? $journey['key'] ?? 'Journey'),
                'subtitle' => (string)($journey['focus'] ?? ''),
                'ambience' => str_contains((string)($journey['key'] ?? ''), 'production') ? 'aurora' : 'clean',
                'density' => 'compact',
                'heatmap' => str_contains((string)($journey['key'] ?? ''), 'capa') ? 'security' : 'workflow',
                'focusTables' => array_slice((array)($journey['tablesPresent'] ?? $journey['requiredTables'] ?? []), 0, 8),
            ];
        }
        $scenes = array_slice($scenes, 0, 8);

        $orchestrationScore = max(0, min(100, (int)round(
            ($commandCenterScore * 0.28)
            + ($operationsScore * 0.16)
            + ($releaseReadinessScore * 0.14)
            + ($journeyReadinessScore * 0.12)
            + ($governanceCoveragePercent * 0.12)
            + ($registrySyncScore * 0.10)
            + ($compatibilityScore * 0.08)
        )));
        $narrativeCoverageScore = max(0, min(100, (int)round(
            ($visualReadinessScore * 0.24)
            + ($journeyReadinessScore * 0.22)
            + ($domainReadinessScore * 0.16)
            + ($metadataCompletenessPercent * 0.14)
            + ($storyboardCoverageScore * 0.14)
            + (min(100, $focusDeckCount * 15) * 0.10)
        )));
        $reviewWallScore = max(0, min(100, (int)round(
            ($promotionReadinessScore * 0.30)
            + ($firewallScore * 0.24)
            + ($governanceCoveragePercent * 0.16)
            + ($complianceReadinessScore * 0.12)
            + ((100 - min(100, $blockerCount * 14)) * 0.10)
            + ($policyCoveragePercent * 0.08)
        )));
        $atlasReadinessScore = max(0, min(100, (int)round(
            ($domainReadinessScore * 0.28)
            + ($journeyReadinessScore * 0.20)
            + ($canonicalCoveragePercent * 0.18)
            + ($metadataCompletenessPercent * 0.18)
            + ($visualReadinessScore * 0.16)
        )));
        $livePulseScore = max(0, min(100, (int)round(
            ($observabilityScore * 0.34)
            + ($performancePostureScore * 0.18)
            + ($registrySyncScore * 0.16)
            + ((int)($summary['releaseRadarScore'] ?? 0) * 0.16)
            + ((100 - min(100, $hotspotCount * 10)) * 0.16)
        )));
        $collaborationReadinessScore = max(0, min(100, (int)round(
            ($governanceCoveragePercent * 0.28)
            + ($workflowCoveragePercent * 0.18)
            + ($complianceReadinessScore * 0.14)
            + ($collaborationSignals * 0.18)
            + ((int)($governance['approverCoveragePercent'] ?? 0) * 0.12)
            + ((int)($governance['evidenceCoveragePercent'] ?? 0) * 0.10)
        )));
        $visualPolishScore = max(0, min(100, (int)round(
            ($experienceScore * 0.28)
            + ($visualReadinessScore * 0.26)
            + ($commandCenterScore * 0.16)
            + ($metadataCompletenessPercent * 0.12)
            + ((100 - min(100, (int)($renderInsights['complexityScore'] ?? 0))) * 0.10)
            + (min(100, $focusDeckCount * 14) * 0.08)
        )));

        $artifact = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_command_center_report',
                'designId' => $designId,
                'designName' => $designName,
            ],
            'summary' => [
                'commandCenterScore' => $commandCenterScore,
                'orchestrationScore' => $orchestrationScore,
                'narrativeCoverageScore' => $narrativeCoverageScore,
                'reviewWallScore' => $reviewWallScore,
                'atlasReadinessScore' => $atlasReadinessScore,
                'livePulseScore' => $livePulseScore,
                'collaborationReadinessScore' => $collaborationReadinessScore,
                'visualPolishScore' => $visualPolishScore,
                'sceneCount' => count($scenes),
                'spotlightCount' => count($spotlight),
                'reviewLaneCount' => count($reviewLanes),
                'atlasCount' => count($atlas),
            ],
            'hero' => [
                'headline' => 'Round 6 command deck',
                'subheadline' => 'Mission-control storytelling, review wall, atlas and live pulse turn the schema cockpit into an executive-grade operating surface.',
                'commandCenterScore' => $commandCenterScore,
                'orchestrationScore' => $orchestrationScore,
                'visualPolishScore' => $visualPolishScore,
                'riskScore' => $riskScore,
                'compatibilityScore' => $compatibilityScore,
            ],
            'spotlight' => $spotlight,
            'reviewWall' => [
                'score' => $reviewWallScore,
                'lanes' => $reviewLanes,
                'evidenceStack' => $evidenceStack,
            ],
            'atlas' => $atlas,
            'livePulse' => [
                'score' => $livePulseScore,
                'bands' => $livePulseBands,
                'radar' => $livePulseRadar,
            ],
            'collaboration' => $collaboration,
            'scenes' => $scenes,
            'reportSummary' => (array)($report['summary'] ?? []),
            'diffSummary' => (array)($diff['summary'] ?? []),
        ];
        if ($actor !== null && $actor !== '') {
            $artifact['_meta']['actor'] = $actor;
        }
        return $artifact;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildRound7Artifact(string $designId, string $designName, array $schema, array $health, array $report = [], array $diff = [], ?string $actor = null): array
    {
        $summary = is_array($health['summary'] ?? null) ? $health['summary'] : [];
        $reportSummary = is_array($report['summary'] ?? null) ? $report['summary'] : [];
        $diffSummary = is_array($diff['summary'] ?? null) ? $diff['summary'] : [];
        $tables = $this->arrayRows($schema['tables'] ?? []);
        $relations = $this->arrayRows($schema['relations'] ?? []);
        $viewsCatalog = $this->arrayRows($schema['viewsCatalog'] ?? []);
        $materializedViews = $this->arrayRows($schema['materializedViews'] ?? []);
        $functionsCatalog = $this->arrayRows($schema['functionsCatalog'] ?? []);
        $proceduresCatalog = $this->arrayRows($schema['proceduresCatalog'] ?? []);
        $eventTriggers = $this->arrayRows($schema['eventTriggers'] ?? []);
        $schemasCatalog = $this->arrayRows($schema['schemasCatalog'] ?? []);
        $rolesCatalog = $this->arrayRows($schema['rolesCatalog'] ?? []);
        $exportBundles = $this->arrayRows($schema['exportBundles'] ?? []);
        $approvalMatrix = $this->arrayRows($schema['approvalMatrix'] ?? []);
        $roleModes = $this->arrayRows($schema['roleModes'] ?? []);
        $interoperabilityTracks = $this->arrayRows($schema['interoperabilityTracks'] ?? []);
        $traceabilityScenarios = $this->arrayRows($schema['traceabilityScenarios'] ?? []);
        $beautySystem = is_array($schema['beautySystem'] ?? null) ? $schema['beautySystem'] : [];
        $ambiences = $this->arrayRows($beautySystem['ambiences'] ?? []);
        $densities = $this->arrayRows($beautySystem['densities'] ?? []);
        $sceneFamilies = $this->arrayRows($beautySystem['sceneFamilies'] ?? []);

        $indexCount = 0;
        $checkConstraintCount = 0;
        $triggerCount = 0;
        $indexExamples = [];
        $checkExamples = [];
        $triggerExamples = [];
        foreach ($tables as $table) {
            $indexes = $this->arrayRows($table['indexes'] ?? []);
            $checks = $this->arrayRows($table['check_constraints'] ?? []);
            $triggers = $this->arrayRows($table['triggers'] ?? []);
            $indexCount += count($indexes);
            $checkConstraintCount += count($checks);
            $triggerCount += count($triggers);
            foreach ($indexes as $index) {
                $name = trim((string)($index['name'] ?? ''));
                if ($name !== '') {
                    $indexExamples[] = $name;
                }
            }
            foreach ($checks as $check) {
                $name = trim((string)($check['name'] ?? ''));
                if ($name !== '') {
                    $checkExamples[] = $name;
                }
            }
            foreach ($triggers as $trigger) {
                $name = trim((string)($trigger['name'] ?? ''));
                if ($name !== '') {
                    $triggerExamples[] = $name;
                }
            }
        }

        $policyCount = (int)($reportSummary['policyCount'] ?? 0);
        if ($policyCount <= 0) {
            $policyCount = $this->countPolicies($schema);
        }

        $makeSurface = function (string $key, string $label, int $count, int $target, string $detail, array $examples): array {
            $target = max(1, $target);
            $score = max(0, min(100, (int)round(($count / $target) * 100)));
            return [
                'key' => $key,
                'label' => $label,
                'count' => $count,
                'target' => $target,
                'detail' => $detail,
                'examples' => array_slice(array_values(array_filter(array_map(static fn($value): string => trim((string)$value), $examples))), 0, 6),
                'coverageScore' => $score,
                'readinessScore' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
                'gaps' => $count >= $target ? [] : ['Add ' . max(0, $target - $count) . ' more modeled objects to reach target posture'],
            ];
        };

        $objectSurfaces = [
            $makeSurface('tables', 'Tables', count($tables), 96, 'Canonical operational and runtime-facing table coverage.', array_map(static fn(array $table): string => (string)($table['name'] ?? ''), $tables)),
            $makeSurface('relations', 'Relations', count($relations), 150, 'Cross-domain dependencies and digital thread edges.', array_map(static fn(array $relation): string => (string)($relation['name'] ?? ''), $relations)),
            $makeSurface('indexes', 'Indexes', $indexCount, 120, 'Lookup, queue, and join posture for scale-heavy flows.', $indexExamples),
            $makeSurface('checks', 'Check constraints', $checkConstraintCount, 60, 'Guardrails for status and quantity invariants.', $checkExamples),
            $makeSurface('triggers', 'Triggers', $triggerCount, 90, 'Audit and live-pulse hooks for release evidence.', $triggerExamples),
            $makeSurface('views', 'Views', count($viewsCatalog), 8, 'Curated read models for operations and review.', array_map(static fn(array $item): string => (string)($item['name'] ?? ''), $viewsCatalog)),
            $makeSurface('materialized_views', 'Materialized views', count($materializedViews), 4, 'Accelerated atlas and backlog surfaces.', array_map(static fn(array $item): string => (string)($item['name'] ?? ''), $materializedViews)),
            $makeSurface('functions', 'Functions', count($functionsCatalog), 8, 'Reusable database logic for audit, masking, and pulse.', array_map(static fn(array $item): string => (string)($item['name'] ?? ''), $functionsCatalog)),
            $makeSurface('procedures', 'Procedures', count($proceduresCatalog), 4, 'Promotion, backfill, and control-plane orchestration.', array_map(static fn(array $item): string => (string)($item['name'] ?? ''), $proceduresCatalog)),
            $makeSurface('event_triggers', 'Event triggers', count($eventTriggers), 3, 'Destructive-change firewall and release telemetry hooks.', array_map(static fn(array $item): string => (string)($item['name'] ?? ''), $eventTriggers)),
            $makeSurface('policies', 'Policies', $policyCount, 60, 'RLS and policy-backed runtime exposure discipline.', ['policy_runtime_release_gate']),
            $makeSurface('schemas_roles', 'Schemas & roles', count($schemasCatalog) + count($rolesCatalog), 15, 'Ownership and access-intent modeling surfaces.', array_merge(array_map(static fn(array $item): string => (string)($item['key'] ?? $item['name'] ?? ''), $schemasCatalog), array_map(static fn(array $item): string => (string)($item['key'] ?? $item['name'] ?? ''), $rolesCatalog))),
        ];

        $physicalCoverageScore = max(0, min(100, (int)round(array_reduce($objectSurfaces, static function (int $carry, array $item): int {
            return $carry + (int)$item['readinessScore'];
        }, 0) / max(1, count($objectSurfaces)))));

        $reviewBoards = [];
        foreach ($approvalMatrix as $board) {
            $score = (int)($board['score'] ?? 0);
            $reviewBoards[] = [
                'key' => (string)($board['key'] ?? 'board'),
                'label' => (string)($board['label'] ?? $board['key'] ?? 'Board'),
                'owner' => (string)($board['owner'] ?? ''),
                'approver' => (string)($board['approver'] ?? ''),
                'score' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
                'evidence' => array_slice(array_values(array_filter((array)($board['evidence'] ?? []))), 0, 8),
                'detail' => implode(' → ', array_slice(array_values(array_filter((array)($board['evidence'] ?? []))), 0, 3)),
            ];
        }

        $exports = [];
        foreach ($exportBundles as $item) {
            $status = (string)($item['status'] ?? 'ready');
            $score = $status === 'ready' ? 100 : ($status === 'partial' ? 78 : 68);
            $exports[] = [
                'key' => (string)($item['key'] ?? 'export'),
                'label' => (string)($item['label'] ?? $item['key'] ?? 'Export'),
                'status' => $status,
                'format' => (string)($item['format'] ?? 'json'),
                'purpose' => (string)($item['purpose'] ?? ''),
                'score' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
            ];
        }

        $modeCards = [];
        foreach ($roleModes as $item) {
            $score = (int)($item['score'] ?? 0);
            $modeCards[] = [
                'key' => (string)($item['key'] ?? 'mode'),
                'label' => (string)($item['label'] ?? $item['key'] ?? 'Mode'),
                'persona' => (string)($item['persona'] ?? ''),
                'score' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
                'focus' => array_slice(array_values(array_filter((array)($item['focus'] ?? []))), 0, 8),
                'subtitle' => implode(' · ', array_slice(array_values(array_filter((array)($item['focus'] ?? []))), 0, 4)),
            ];
        }

        $interopCards = [];
        foreach ($interoperabilityTracks as $item) {
            $status = (string)($item['status'] ?? 'ready');
            $score = $status === 'ready' ? 98 : ($status === 'partial' ? 78 : 66);
            $interopCards[] = [
                'key' => (string)($item['key'] ?? 'track'),
                'label' => (string)($item['label'] ?? $item['key'] ?? 'Track'),
                'status' => $status,
                'detail' => (string)($item['detail'] ?? ''),
                'score' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
            ];
        }

        $traceabilityAtlas = [];
        foreach ($traceabilityScenarios as $item) {
            $score = (int)($item['score'] ?? 0);
            $traceabilityAtlas[] = [
                'key' => (string)($item['key'] ?? 'scenario'),
                'label' => (string)($item['label'] ?? $item['key'] ?? 'Scenario'),
                'domains' => array_slice(array_values(array_filter((array)($item['domains'] ?? []))), 0, 8),
                'focusTables' => array_slice(array_values(array_filter((array)($item['focusTables'] ?? []))), 0, 8),
                'score' => $score,
                'tone' => $score >= 90 ? 'good' : ($score >= 75 ? 'warning' : 'critical'),
            ];
        }

        $modeAverageScore = count($modeCards) > 0
            ? (int)round(array_reduce($modeCards, static fn(int $carry, array $item): int => $carry + (int)$item['score'], 0) / count($modeCards))
            : 84;
        $beautyConfigCoverageScore = min(100, (count($ambiences) * 24) + (count($densities) * 18) + (count($sceneFamilies) * 16));
        $storyCoverageScore = min(100, ((int)($summary['sceneCount'] ?? 0) * 10) + ((int)($summary['spotlightCount'] ?? 0) * 6));

        $reviewOpsScore = max(0, min(100, (int)round(
            ((int)($summary['governanceCoveragePercent'] ?? 0) * 0.24)
            + ((int)($summary['reviewWallScore'] ?? 0) * 0.22)
            + ((int)($summary['promotionReadinessScore'] ?? 0) * 0.18)
            + ((int)($summary['firewallScore'] ?? 0) * 0.18)
            + ((int)($summary['complianceReadinessScore'] ?? 0) * 0.10)
            + (min(100, count($reviewBoards) * 18) * 0.08)
        )));
        $exportSurfaceScore = max(0, min(100, (int)round(
            ((int)($summary['registrySyncScore'] ?? 0) * 0.28)
            + ((int)($diffSummary['compatibilityScore'] ?? $summary['compatibilityScore'] ?? 100) * 0.20)
            + ((int)($summary['visualPolishScore'] ?? 0) * 0.12)
            + (min(100, count($exports) * 12) * 0.24)
            + ((int)($summary['releaseReadinessScore'] ?? 0) * 0.16)
        )));
        $interoperabilityScore = max(0, min(100, (int)round(
            ((int)($summary['workflowBindingCoveragePercent'] ?? 0) * 0.26)
            + ((int)($summary['registrySyncScore'] ?? 0) * 0.24)
            + (min(100, count($interopCards) * 16) * 0.18)
            + (min(100, (int)($reportSummary['tableCount'] ?? count($tables)) * 1) * 0.12)
            + ((int)($reportSummary['canonicalCoveragePercent'] ?? 0) * 0.20)
        )));
        $roleModeScore = max(0, min(100, (int)round(
            ((int)($summary['collaborationReadinessScore'] ?? 0) * 0.18)
            + (min(100, (int)($summary['personaCount'] ?? 0) * 16) * 0.08)
            + (min(100, (int)($summary['playbookCount'] ?? 0) * 16) * 0.08)
            + (min(100, count($modeCards) * 16) * 0.14)
            + ($modeAverageScore * 0.30)
            + ((int)($summary['narrativeCoverageScore'] ?? 0) * 0.22)
        )));
        $traceabilityAtlasScore = max(0, min(100, (int)round(
            ((int)($summary['journeyReadinessScore'] ?? 0) * 0.30)
            + ((int)($reportSummary['canonicalCoveragePercent'] ?? 0) * 0.22)
            + ((int)($summary['domainReadinessScore'] ?? 0) * 0.16)
            + (min(100, count($traceabilityAtlas) * 16) * 0.20)
            + ((int)($summary['releaseRadarScore'] ?? 0) * 0.12)
        )));
        $beautySystemScore = max(0, min(100, (int)round(
            ((int)($summary['visualPolishScore'] ?? 0) * 0.30)
            + ((int)($summary['experienceScore'] ?? 0) * 0.18)
            + ($beautyConfigCoverageScore * 0.30)
            + ($storyCoverageScore * 0.22)
        )));
        $atlasMeshScore = max(0, min(100, (int)round(
            ($physicalCoverageScore * 0.22)
            + ($reviewOpsScore * 0.18)
            + ($exportSurfaceScore * 0.14)
            + ($interoperabilityScore * 0.16)
            + ($roleModeScore * 0.10)
            + ($traceabilityAtlasScore * 0.12)
            + ($beautySystemScore * 0.08)
        )));

        $artifact = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_round7_report',
                'designId' => $designId,
                'designName' => $designName,
            ],
            'summary' => [
                'atlasMeshScore' => $atlasMeshScore,
                'physicalCoverageScore' => $physicalCoverageScore,
                'reviewOpsScore' => $reviewOpsScore,
                'exportSurfaceScore' => $exportSurfaceScore,
                'interoperabilityScore' => $interoperabilityScore,
                'roleModeScore' => $roleModeScore,
                'traceabilityAtlasScore' => $traceabilityAtlasScore,
                'beautySystemScore' => $beautySystemScore,
                'objectSurfaceCount' => count($objectSurfaces),
                'roleModeCount' => count($modeCards),
                'reviewBoardCount' => count($reviewBoards),
                'exportBundleCount' => count($exports),
            ],
            'hero' => [
                'headline' => 'Round 7 atlas mesh',
                'subheadline' => 'Physical PostgreSQL object coverage, governance boards, export surfaces, role-aware views and traceability atlas now sit on the same world-class control plane.',
                'atlasMeshScore' => $atlasMeshScore,
                'physicalCoverageScore' => $physicalCoverageScore,
                'reviewOpsScore' => $reviewOpsScore,
                'exportSurfaceScore' => $exportSurfaceScore,
                'interoperabilityScore' => $interoperabilityScore,
            ],
            'atlas' => [
                'score' => $physicalCoverageScore,
                'objectSurfaces' => $objectSurfaces,
                'capabilityBands' => [
                    ['label' => 'Domains', 'count' => (int)($summary['domainCount'] ?? 0), 'score' => (int)($summary['domainReadinessScore'] ?? 0), 'detail' => 'Cross-domain semantic coverage.'],
                    ['label' => 'Layers', 'count' => (int)($summary['layerCount'] ?? 0), 'score' => (int)($summary['journeyReadinessScore'] ?? 0), 'detail' => 'Canonical 7-layer orchestration posture.'],
                    ['label' => 'Policies', 'count' => $policyCount, 'score' => (int)($summary['policyCoveragePercent'] ?? 0), 'detail' => 'RLS / policy / masking intent visibility.'],
                    ['label' => 'Compiler contracts', 'count' => (int)($reportSummary['tableCount'] ?? count($tables)), 'score' => (int)($summary['registrySyncScore'] ?? 0), 'detail' => 'Registry/API/module-builder propagation.'],
                ],
            ],
            'reviewBoards' => $reviewBoards,
            'exports' => $exports,
            'roleModes' => $modeCards,
            'interoperability' => $interopCards,
            'traceabilityAtlas' => $traceabilityAtlas,
            'beautySystem' => [
                'score' => $beautySystemScore,
                'ambiences' => $ambiences,
                'densities' => $densities,
                'sceneFamilies' => $sceneFamilies,
            ],
            'reportSummary' => $reportSummary,
            'diffSummary' => $diffSummary,
        ];
        if ($actor !== null && $actor !== '') {
            $artifact['_meta']['actor'] = $actor;
        }

        return $artifact;
    }

    private function buildHealthDiagnostics(array $schema, array $baseline = []): array
    {
        $schema = $this->normalizeEnterpriseSchema($schema);
        if ($baseline === []) {
            $baseline = ['_meta' => ['id' => (string)($schema['_meta']['id'] ?? 'workspace') . '_baseline'], 'tables' => [], 'relations' => [], 'groups' => [], 'notes' => []];
        }
        $baseline = $this->normalizeEnterpriseSchema($baseline);

        $report = $this->buildSchemaReport($schema);
        $diff = $this->buildTypedDiff($baseline, $schema);
        $tableCount = count((array)($schema['tables'] ?? []));
        $relationCount = count((array)($schema['relations'] ?? []));
        $columnCount = (int)($report['summary']['columnCount'] ?? 0);
        $avgColumnsPerTable = $tableCount > 0 ? round($columnCount / $tableCount, 1) : 0.0;
        $avgRelationsPerTable = $tableCount > 0 ? round(($relationCount * 2) / $tableCount, 1) : 0.0;
        $graphDensityScore = $this->relationDensityScore($tableCount, $relationCount);
        $metadataCompletenessPercent = $this->metadataCompletenessPercent($schema);
        $workflowCoveragePercent = $this->workflowCoveragePercent($schema);
        $orphanRelationRiskCount = $this->orphanRelationRiskCount($schema);

        $relationByTableId = [];
        foreach ((array)($schema['relations'] ?? []) as $relation) {
            if (!is_array($relation)) {
                continue;
            }
            $fromTableId = (string)($relation['from_table_id'] ?? '');
            $toTableId = (string)($relation['to_table_id'] ?? '');
            if ($fromTableId !== '') {
                $relationByTableId[$fromTableId] = (int)($relationByTableId[$fromTableId] ?? 0) + 1;
            }
            if ($toTableId !== '' && $toTableId !== $fromTableId) {
                $relationByTableId[$toTableId] = (int)($relationByTableId[$toTableId] ?? 0) + 1;
            }
        }

        $hotspotMap = [];
        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableName = (string)($table['name'] ?? '');
            if ($tableName === '') {
                continue;
            }
            $relationCountForTable = (int)($relationByTableId[(string)($table['id'] ?? '')] ?? 0);
            $metadataScore = $this->tableMetadataScore($table);
            $governance = is_array($table['governance'] ?? null) ? $table['governance'] : [];
            $policyCount = count((array)($table['policies'] ?? []));
            $score = max(0, (int)round((100 - $metadataScore) / 12));
            $reasons = [];
            if (trim((string)($governance['owner'] ?? '')) === '' && trim((string)($governance['steward'] ?? '')) === '') {
                $score += 6;
                $reasons[] = 'Missing owner/steward metadata';
            }
            if (!empty($table['rls_enabled']) && $policyCount === 0) {
                $score += 10;
                $reasons[] = 'RLS enabled without policy metadata';
            }
            if (trim((string)($table['canonical']['layer'] ?? '')) === '') {
                $score += 6;
                $reasons[] = 'Canonical layer missing';
            }
            if ($relationCountForTable >= 8) {
                $score += min(10, $relationCountForTable - 7);
                $reasons[] = 'High dependency fan-in/fan-out';
            }

            $hotspotMap[$tableName] = [
                'table' => $tableName,
                'tableId' => (string)($table['id'] ?? ''),
                'domain' => (string)($table['domain'] ?? 'default'),
                'layer' => (string)($table['canonical']['layer'] ?? $this->inferLayerForTable($schema, $table)),
                'metadataScore' => $metadataScore,
                'relationCount' => $relationCountForTable,
                'score' => $score,
                'diffScore' => 0,
                'issueCount' => 0,
                'destructiveCount' => 0,
                'breakingCount' => 0,
                'reasons' => $reasons,
            ];
        }

        foreach ((array)($diff['items'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $tableName = trim((string)($item['table'] ?? ''));
            if ($tableName === '' || !isset($hotspotMap[$tableName])) {
                continue;
            }
            $weight = $this->riskWeight($item);
            $hotspotMap[$tableName]['score'] += $weight;
            $hotspotMap[$tableName]['diffScore'] += $weight;
            $hotspotMap[$tableName]['issueCount']++;
            if (!empty($item['destructive'])) {
                $hotspotMap[$tableName]['destructiveCount']++;
            }
            if (!empty($item['breaking'])) {
                $hotspotMap[$tableName]['breakingCount']++;
            }
            $reason = trim((string)($item['detail'] ?? $item['type'] ?? ''));
            if ($reason !== '' && count($hotspotMap[$tableName]['reasons']) < 5) {
                $hotspotMap[$tableName]['reasons'][] = $reason;
            }
        }

        $hotspots = array_values($hotspotMap);
        usort($hotspots, static function (array $a, array $b): int {
            return [$b['score'], $b['issueCount'], $b['relationCount'], $a['table']] <=> [$a['score'], $a['issueCount'], $a['relationCount'], $b['table']];
        });
        $hotspots = array_values(array_filter($hotspots, static fn(array $item): bool => (int)$item['score'] > 0));
        $hotspots = array_map(static function (array $item): array {
            $item['severity'] = match (true) {
                (int)$item['score'] >= 40 => 'critical',
                (int)$item['score'] >= 24 => 'high',
                (int)$item['score'] >= 12 => 'medium',
                default => 'low',
            };
            $item['reasons'] = array_values(array_unique(array_filter((array)$item['reasons'], static fn($value): bool => trim((string)$value) !== '')));
            return $item;
        }, array_slice($hotspots, 0, 12));

        $hotspotCount = count(array_filter($hotspots, static fn(array $item): bool => (int)$item['score'] >= 12));
        $visualReadinessScore = max(0, min(100, (int)round(
            ((int)($report['summary']['releaseReadinessScore'] ?? 0) * 0.30)
            + ($metadataCompletenessPercent * 0.25)
            + ($graphDensityScore * 0.15)
            + ($workflowCoveragePercent * 0.15)
            + (max(0, 100 - min(100, $orphanRelationRiskCount * 14)) * 0.15)
        )));

        $recommendations = [];
        if ($orphanRelationRiskCount > 0) {
            $recommendations[] = [
                'code' => 'orphan_relation_risk',
                'severity' => 'critical',
                'title' => 'Resolve orphan relation targets',
                'detail' => 'One or more relations point to missing tables or columns. Repair IDs before publishing.',
            ];
        }
        if ((int)($diff['summary']['destructiveCount'] ?? 0) > 0) {
            $recommendations[] = [
                'code' => 'destructive_change_firewall',
                'severity' => 'high',
                'title' => 'Escalate destructive changes',
                'detail' => 'Release bundle contains destructive changes that should go through CAB/e-sign review with rollback evidence.',
            ];
        }
        if ($metadataCompletenessPercent < 75) {
            $recommendations[] = [
                'code' => 'metadata_enrichment',
                'severity' => 'medium',
                'title' => 'Raise metadata completeness',
                'detail' => 'Add missing labels, governance owners, canonical layers, UI hints, and reporting semantics before runtime sync.',
            ];
        }
        if ($workflowCoveragePercent < 60 && $tableCount > 0) {
            $recommendations[] = [
                'code' => 'workflow_binding_gap',
                'severity' => 'medium',
                'title' => 'Expand workflow bindings',
                'detail' => 'Candidate operational tables still lack workflow bindings. Link them before promoting to module builder runtime.',
            ];
        }
        if ((int)($report['summary']['policyCount'] ?? 0) === 0 && (int)($report['summary']['rlsTableCount'] ?? 0) > 0) {
            $recommendations[] = [
                'code' => 'security_policy_gap',
                'severity' => 'high',
                'title' => 'Model RLS policy metadata',
                'detail' => 'RLS is enabled on one or more tables but policy metadata is still missing.',
            ];
        }
        if ((int)($report['summary']['canonicalCoveragePercent'] ?? 0) < 80) {
            $recommendations[] = [
                'code' => 'canonical_gap',
                'severity' => 'medium',
                'title' => 'Close canonical manufacturing gaps',
                'detail' => 'Critical ERP/MES/eQMS capability areas are still missing or not mapped explicitly in the schema.',
            ];
        }
        if ($graphDensityScore < 60) {
            $recommendations[] = [
                'code' => 'graph_balance',
                'severity' => 'low',
                'title' => 'Rebalance graph density',
                'detail' => 'The current relation topology is either too sparse or too dense for a readable enterprise canvas. Review relation routing and domain decomposition.',
            ];
        }
        if ($visualReadinessScore < 70) {
            $recommendations[] = [
                'code' => 'visual_readiness',
                'severity' => 'medium',
                'title' => 'Improve visual cockpit readiness',
                'detail' => 'Saved views, metadata completeness, and graph posture should be improved before presenting the studio as a control-plane source of truth.',
            ];
        }

        $domains = $this->buildDomainDiagnostics($schema, $hotspots, $relationByTableId);
        $layers = $this->buildLayerDiagnostics($schema, $hotspots, $relationByTableId);
        $governance = $this->buildGovernanceDiagnostics($schema);
        $journeys = $this->buildJourneyDiagnostics($schema, $relationByTableId);
        $dependencyMatrix = $this->buildDependencyMatrix($schema);
        $blockers = $this->buildBlockerBoard($report, $diff, $hotspots, $governance, $journeys, $orphanRelationRiskCount);
        $releaseRadar = $this->buildReleaseRadar($report, $governance, $domains, $journeys, $blockers);
        $storyboards = $this->buildSuggestedStoryboards($journeys, $hotspots, $layers);
        $personas = $this->buildPersonaBoards(
            $schema,
            $report,
            $diff,
            $governance,
            $hotspots,
            $journeys,
            $releaseRadar,
            $metadataCompletenessPercent,
            $workflowCoveragePercent,
            $visualReadinessScore
        );
        $playbooks = $this->buildReviewPlaybooks(
            $report,
            $diff,
            $governance,
            $journeys,
            $blockers,
            $personas,
            $metadataCompletenessPercent,
            $workflowCoveragePercent
        );
        $releaseLanes = $this->buildReleaseLanesDetailed(
            $report,
            $diff,
            $releaseRadar,
            $blockers,
            $governance,
            $visualReadinessScore,
            $workflowCoveragePercent
        );
        $renderInsights = $this->buildRenderInsights(
            $schema,
            $domains,
            $layers,
            $dependencyMatrix,
            $hotspots,
            $visualReadinessScore
        );
        $policyCount = (int)($report['summary']['policyCount'] ?? 0);
        $rlsTableCount = (int)($report['summary']['rlsTableCount'] ?? 0);
        $policyCoveragePercent = $rlsTableCount > 0 ? $this->percentage(min($policyCount, $rlsTableCount), $rlsTableCount, 100) : 100;
        $performancePostureScore = max(0, min(100, (int)round(
            ($visualReadinessScore * 0.34)
            + ($graphDensityScore * 0.18)
            + ((100 - min(100, count($hotspots) * 7)) * 0.18)
            + ((100 - min(100, (int)($renderInsights['complexityScore'] ?? 0))) * 0.14)
            + (min(100, count((array)($schema['views'] ?? [])) * 24) * 0.16)
        )));
        $registrySyncScore = max(0, min(100, (int)round(
            ($metadataCompletenessPercent * 0.34)
            + ($workflowCoveragePercent * 0.34)
            + ((int)($report['summary']['canonicalCoveragePercent'] ?? 0) * 0.20)
            + ((int)($diff['summary']['compatibilityScore'] ?? 100) * 0.12)
        )));
        $complianceReadinessScore = max(0, min(100, (int)round(
            ((int)($governance['overallCoveragePercent'] ?? 0) * 0.34)
            + ((int)($releaseRadar['readinessScore'] ?? 0) * 0.20)
            + ((int)($report['summary']['releaseReadinessScore'] ?? 0) * 0.18)
            + ($policyCoveragePercent * 0.16)
            + ((100 - min(100, (int)($diff['summary']['destructiveCount'] ?? 0) * 18 + count($blockers) * 6)) * 0.12)
        )));
        $aiCopilot = $this->buildAiCopilotSuggestions(
            $schema,
            $report,
            $diff,
            $hotspots,
            $governance,
            $journeys,
            $personas
        );
        $aiCopilotReadinessScore = max(0, min(100, (int)round(
            ($metadataCompletenessPercent * 0.30)
            + ($visualReadinessScore * 0.14)
            + ($registrySyncScore * 0.16)
            + ((int)($diff['summary']['compatibilityScore'] ?? 100) * 0.14)
            + (min(100, count($personas) * 14) * 0.10)
            + (min(100, count($playbooks) * 16) * 0.08)
            + (min(100, count($aiCopilot) * 15) * 0.08)
        )));
        $experienceScore = max(0, min(100, (int)round(
            ($visualReadinessScore * 0.18)
            + ((int)($governance['overallCoveragePercent'] ?? 0) * 0.14)
            + ((int)($releaseRadar['journeyReadinessScore'] ?? 0) * 0.12)
            + ((int)($releaseRadar['readinessScore'] ?? 0) * 0.12)
            + ($complianceReadinessScore * 0.14)
            + ($performancePostureScore * 0.10)
            + ($registrySyncScore * 0.10)
            + ($aiCopilotReadinessScore * 0.10)
        )));

        $summary = [
            'tableCount' => $tableCount,
            'relationCount' => $relationCount,
            'avgColumnsPerTable' => $avgColumnsPerTable,
            'avgRelationsPerTable' => $avgRelationsPerTable,
            'graphDensityScore' => $graphDensityScore,
            'metadataCompletenessPercent' => $metadataCompletenessPercent,
            'workflowBindingCoveragePercent' => $workflowCoveragePercent,
            'policyCoveragePercent' => $policyCoveragePercent,
            'orphanRelationRiskCount' => $orphanRelationRiskCount,
            'hotspotCount' => $hotspotCount,
            'visualReadinessScore' => $visualReadinessScore,
            'releaseReadinessScore' => (int)($report['summary']['releaseReadinessScore'] ?? 0),
            'compatibilityScore' => (int)($diff['summary']['compatibilityScore'] ?? 100),
            'riskScore' => (int)($diff['summary']['riskScore'] ?? 0),
            'criticalGapCount' => count((array)($report['canonical']['criticalMissing'] ?? [])),
            'domainCount' => count($domains),
            'layerCount' => count($layers),
            'governanceCoveragePercent' => (int)($governance['overallCoveragePercent'] ?? 0),
            'journeyReadinessScore' => (int)($releaseRadar['journeyReadinessScore'] ?? 0),
            'domainReadinessScore' => (int)($releaseRadar['domainReadinessScore'] ?? 0),
            'blockerCount' => count($blockers),
            'storyboardCount' => count($storyboards),
            'releaseRadarScore' => (int)($releaseRadar['readinessScore'] ?? 0),
            'performancePostureScore' => $performancePostureScore,
            'registrySyncScore' => $registrySyncScore,
            'complianceReadinessScore' => $complianceReadinessScore,
            'aiCopilotReadinessScore' => $aiCopilotReadinessScore,
            'experienceScore' => $experienceScore,
            'personaCount' => count($personas),
            'playbookCount' => count($playbooks),
            'releaseLaneCount' => count($releaseLanes),
            'copilotSuggestionCount' => count($aiCopilot),
        ];

        $operations = $this->buildOperationsDiagnostics(
            $schema,
            $summary,
            $report,
            $diff,
            $domains,
            $layers,
            $governance,
            $journeys,
            $hotspots,
            $blockers,
            $releaseRadar,
            $personas,
            $playbooks,
            $releaseLanes,
            $renderInsights
        );
        $summary = array_merge($summary, (array)($operations['summary'] ?? []));

        return [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_diagnostics',
                'designId' => (string)($schema['_meta']['id'] ?? ''),
                'designName' => (string)($schema['_meta']['name'] ?? ''),
            ],
            'summary' => $summary,
            'hotspots' => $hotspots,
            'recommendations' => $recommendations,
            'domains' => $domains,
            'layers' => $layers,
            'governance' => $governance,
            'journeys' => $journeys,
            'dependencyMatrix' => $dependencyMatrix,
            'blockers' => $blockers,
            'releaseRadar' => $releaseRadar,
            'storyboards' => $storyboards,
            'personas' => $personas,
            'playbooks' => $playbooks,
            'releaseLanes' => $releaseLanes,
            'aiCopilot' => $aiCopilot,
            'renderInsights' => $renderInsights,
            'operations' => (array)($operations['summary'] ?? []),
            'promotionBoard' => array_slice((array)($operations['promotionBoard'] ?? []), 0, 12),
            'firewall' => (array)($operations['firewall'] ?? []),
            'branchTopology' => array_slice((array)($operations['branchTopology'] ?? []), 0, 12),
            'focusDeck' => array_slice((array)($operations['focusDeck'] ?? []), 0, 12),
            'observability' => (array)($operations['observability'] ?? []),
            'eventRail' => array_slice((array)($operations['eventRail'] ?? []), 0, 12),
            'environments' => array_slice((array)($operations['environments'] ?? []), 0, 12),
            'diffSummary' => $diff['summary'] ?? [],
            'reportSummary' => $report['summary'] ?? [],
        ];
    }


    private function buildSchemaReport(array $schema): array
    {
        $schema = $this->normalizeEnterpriseSchema($schema);
        $domains = [];
        $layers = [];
        $columnCount = 0;
        $generatedColumns = 0;
        $fkColumns = 0;
        $rlsTables = 0;
        $partitionedTables = 0;
        $indexCount = 0;
        $checkConstraintCount = 0;
        $triggerCount = 0;

        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $domain = (string)($table['domain'] ?? 'default');
            $layer = (string)($table['canonical']['layer'] ?? $this->inferLayerForTable($schema, $table));
            $domains[$domain] = ($domains[$domain] ?? 0) + 1;
            $layers[$layer] = ($layers[$layer] ?? 0) + 1;
            $columns = is_array($table['columns'] ?? null) ? $table['columns'] : [];
            $columnCount += count($columns);
            foreach ($columns as $column) {
                if (!is_array($column)) {
                    continue;
                }
                if (!empty($column['generated_expr'])) {
                    $generatedColumns++;
                }
                if (!empty($column['foreign_key'])) {
                    $fkColumns++;
                }
            }
            $indexCount += count($this->arrayRows($table['indexes'] ?? []));
            $checkConstraintCount += count($this->arrayRows($table['check_constraints'] ?? []));
            $triggerCount += count($this->arrayRows($table['triggers'] ?? []));
            if (!empty($table['rls_enabled'])) {
                $rlsTables++;
            }
            if (!empty($table['partitioning']) || !empty($table['performance']['partition_strategy'])) {
                $partitionedTables++;
            }
        }

        $viewCatalogCount = count($this->arrayRows($schema['viewsCatalog'] ?? []));
        $materializedViewCount = count($this->arrayRows($schema['materializedViews'] ?? []));
        $functionCount = count($this->arrayRows($schema['functionsCatalog'] ?? []));
        $procedureCount = count($this->arrayRows($schema['proceduresCatalog'] ?? []));
        $eventTriggerCount = count($this->arrayRows($schema['eventTriggers'] ?? []));
        $schemaCatalogCount = count($this->arrayRows($schema['schemasCatalog'] ?? []));
        $roleCatalogCount = count($this->arrayRows($schema['rolesCatalog'] ?? []));
        $exportBundleCount = count($this->arrayRows($schema['exportBundles'] ?? []));
        $reviewBoardCount = count($this->arrayRows($schema['approvalMatrix'] ?? []));
        $roleModeCount = count($this->arrayRows($schema['roleModes'] ?? []));
        $interoperabilityTrackCount = count($this->arrayRows($schema['interoperabilityTracks'] ?? []));
        $traceabilityScenarioCount = count($this->arrayRows($schema['traceabilityScenarios'] ?? []));

        $capabilities = [];
        $presentCount = 0;
        $criticalMissing = [];
        foreach ($this->canonicalCapabilities() as $capability) {
            $matched = [];
            foreach ((array)($schema['tables'] ?? []) as $table) {
                if (is_array($table) && $this->tableMatchesCapability($table, $capability)) {
                    $matched[] = (string)($table['name'] ?? '');
                }
            }
            $capability['matched_tables'] = array_values(array_filter($matched, static fn(string $name): bool => $name !== ''));
            $capability['present'] = count($capability['matched_tables']) > 0;
            if ($capability['present']) {
                $presentCount++;
            } elseif (!empty($capability['critical'])) {
                $criticalMissing[] = (string)($capability['label'] ?? $capability['key'] ?? '');
            }
            $capabilities[] = $capability;
        }

        $coverage = count($capabilities) > 0 ? (int)round(($presentCount / count($capabilities)) * 100) : 0;
        $releaseReadiness = max(0, min(100, (int)round(
            $coverage
            + min(20, $rlsTables * 2)
            + min(10, (int)floor($this->countPolicies($schema) / 3))
            - (count($criticalMissing) * 7)
        )));

        return [
            'summary' => [
                'tableCount' => count((array)($schema['tables'] ?? [])),
                'relationCount' => count((array)($schema['relations'] ?? [])),
                'columnCount' => $columnCount,
                'domainCount' => count($domains),
                'layerCount' => count($layers),
                'policyCount' => $this->countPolicies($schema),
                'rlsTableCount' => $rlsTables,
                'generatedColumnCount' => $generatedColumns,
                'foreignKeyColumnCount' => $fkColumns,
                'partitionedTableCount' => $partitionedTables,
                'indexCount' => $indexCount,
                'checkConstraintCount' => $checkConstraintCount,
                'triggerCount' => $triggerCount,
                'viewCatalogCount' => $viewCatalogCount,
                'materializedViewCount' => $materializedViewCount,
                'functionCount' => $functionCount,
                'procedureCount' => $procedureCount,
                'eventTriggerCount' => $eventTriggerCount,
                'schemaCatalogCount' => $schemaCatalogCount,
                'roleCatalogCount' => $roleCatalogCount,
                'exportBundleCount' => $exportBundleCount,
                'reviewBoardCount' => $reviewBoardCount,
                'roleModeCount' => $roleModeCount,
                'interoperabilityTrackCount' => $interoperabilityTrackCount,
                'traceabilityScenarioCount' => $traceabilityScenarioCount,
                'savedViewCount' => count((array)($schema['views'] ?? [])),
                'canonicalCoveragePercent' => $coverage,
                'releaseReadinessScore' => $releaseReadiness,
            ],
            'domains' => $domains,
            'layers' => $layers,
            'canonical' => [
                'capabilities' => $capabilities,
                'presentCount' => $presentCount,
                'totalCount' => count($capabilities),
                'criticalMissing' => $criticalMissing,
                'coveragePercent' => $coverage,
            ],
        ];
    }

    private function typedDiffItem(string $type, string $objectKind, string $table, string $column, string $detail, string $severity, bool $destructive, array $meta = []): array
    {
        return array_merge([
            'id' => $this->safeId($type . '_' . $table . '_' . $column . '_' . substr(md5($detail), 0, 8), 'diff_item'),
            'type' => $type,
            'objectKind' => $objectKind,
            'table' => $table,
            'column' => $column,
            'detail' => $detail,
            'severity' => $severity,
            'destructive' => $destructive,
            'breaking' => $destructive || in_array($severity, ['critical', 'high'], true),
            'runtimeImpact' => $destructive ? 'Can break runtime contracts' : 'Requires runtime projection sync',
            'dataMigration' => $destructive ? 'Required' : 'May be optional',
            'rollbackComplexity' => $destructive ? 'High' : 'Medium',
            'approvalClass' => $destructive ? 'cab_esign' : ($severity === 'high' ? 'elevated' : 'standard'),
        ], $meta);
    }

    private function riskWeight(array $item): int
    {
        if (!empty($item['destructive'])) {
            return 22;
        }
        return match ((string)($item['severity'] ?? 'low')) {
            'critical' => 18,
            'high' => 12,
            'medium' => 7,
            'low' => 3,
            default => 1,
        };
    }

    private function buildTypedDiff(array $baseline, array $current): array
    {
        $baseline = $this->normalizeEnterpriseSchema($baseline);
        $current = $this->normalizeEnterpriseSchema($current);

        $baseTables = [];
        foreach ((array)($baseline['tables'] ?? []) as $table) {
            if (is_array($table)) {
                $baseTables[(string)($table['name'] ?? '')] = $table;
            }
        }

        $currentTables = [];
        foreach ((array)($current['tables'] ?? []) as $table) {
            if (is_array($table)) {
                $currentTables[(string)($table['name'] ?? '')] = $table;
            }
        }

        $items = [];
        foreach ((array)($current['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableName = (string)($table['name'] ?? '');
            $baseTable = $baseTables[$tableName] ?? null;
            if ($baseTable === null) {
                $items[] = $this->typedDiffItem('object_added', 'table', $tableName, '', 'Create new table', 'low', false, [
                    'runtimeImpact' => 'Requires registry compile and module builder projection sync',
                    'dataMigration' => 'No',
                ]);
                continue;
            }

            if (($baseTable['comment'] ?? '') !== ($table['comment'] ?? '')) {
                $items[] = $this->typedDiffItem('metadata_only_change', 'table', $tableName, '', 'Comment/description changed', 'low', false);
            }
            if (($baseTable['domain'] ?? '') !== ($table['domain'] ?? '')) {
                $items[] = $this->typedDiffItem('metadata_only_change', 'table', $tableName, '', 'Domain/canonical capability changed', 'medium', false, [
                    'runtimeImpact' => 'Can change module ownership and reporting subject area',
                ]);
            }
            if ((bool)($baseTable['rls_enabled'] ?? false) !== (bool)($table['rls_enabled'] ?? false)) {
                $items[] = $this->typedDiffItem('policy_changed', 'table', $tableName, '', !empty($table['rls_enabled']) ? 'Enable RLS' : 'Disable RLS', !empty($table['rls_enabled']) ? 'high' : 'medium', !empty($baseTable['rls_enabled']) && empty($table['rls_enabled']), [
                    'runtimeImpact' => 'Affects runtime access and reporting',
                    'dataMigration' => 'No',
                    'rollbackComplexity' => !empty($table['rls_enabled']) ? 'Medium' : 'High',
                    'approvalClass' => !empty($table['rls_enabled']) ? 'elevated' : 'cab_esign',
                ]);
            }

            $baseColumns = [];
            foreach ((array)($baseTable['columns'] ?? []) as $column) {
                if (is_array($column)) {
                    $baseColumns[(string)($column['name'] ?? '')] = $column;
                }
            }
            $currentColumns = [];
            foreach ((array)($table['columns'] ?? []) as $column) {
                if (!is_array($column)) {
                    continue;
                }
                $columnName = (string)($column['name'] ?? '');
                $currentColumns[$columnName] = $column;
                $baseColumn = $baseColumns[$columnName] ?? null;
                if ($baseColumn === null) {
                    $items[] = $this->typedDiffItem('object_added', 'column', $tableName, $columnName, 'Add new column', !empty($column['nullable']) ? 'low' : 'medium', false, [
                        'runtimeImpact' => 'Requires form/API/runtime binding sync',
                        'dataMigration' => !empty($column['nullable']) ? 'No' : 'May require backfill',
                        'approvalClass' => !empty($column['nullable']) ? 'standard' : 'elevated',
                    ]);
                    continue;
                }

                if (
                    (string)($baseColumn['type'] ?? '') !== (string)($column['type'] ?? '')
                    || (int)($baseColumn['length'] ?? 0) !== (int)($column['length'] ?? 0)
                    || (int)($baseColumn['scale'] ?? 0) !== (int)($column['scale'] ?? 0)
                ) {
                    $items[] = $this->typedDiffItem('column_type_changed', 'column', $tableName, $columnName, (string)($baseColumn['type'] ?? '') . ' -> ' . (string)($column['type'] ?? ''), 'high', false, [
                        'runtimeImpact' => 'Can affect API contracts, reports, and indexes',
                        'dataMigration' => 'Manual review required',
                        'rollbackComplexity' => 'High',
                        'approvalClass' => 'elevated',
                    ]);
                }

                if ((bool)($baseColumn['nullable'] ?? true) !== (bool)($column['nullable'] ?? true)) {
                    $items[] = $this->typedDiffItem('nullability_changed', 'column', $tableName, $columnName, !empty($column['nullable']) ? 'Drop NOT NULL' : 'Set NOT NULL', !empty($column['nullable']) ? 'medium' : 'high', empty($column['nullable']), [
                        'runtimeImpact' => 'Can break data entry/runtime inserts',
                        'dataMigration' => !empty($column['nullable']) ? 'No' : 'Existing data must be backfilled',
                        'rollbackComplexity' => !empty($column['nullable']) ? 'Medium' : 'High',
                        'approvalClass' => !empty($column['nullable']) ? 'elevated' : 'cab',
                    ]);
                }

                if ((string)($baseColumn['default_val'] ?? '') !== (string)($column['default_val'] ?? '')) {
                    $items[] = $this->typedDiffItem('default_changed', 'column', $tableName, $columnName, 'Default expression changed', 'medium', false, [
                        'runtimeImpact' => 'Affects new inserts and automation',
                        'dataMigration' => 'No',
                    ]);
                }

                if ((string)($baseColumn['generated_expr'] ?? '') !== (string)($column['generated_expr'] ?? '')) {
                    $items[] = $this->typedDiffItem('generated_expr_changed', 'column', $tableName, $columnName, 'Generated expression changed', 'high', false, [
                        'runtimeImpact' => 'Affects reporting, audit, and derived fields',
                        'dataMigration' => 'May require rebuild',
                    ]);
                }

                $baseFk = is_array($baseColumn['foreign_key'] ?? null) ? $baseColumn['foreign_key'] : null;
                $nextFk = is_array($column['foreign_key'] ?? null) ? $column['foreign_key'] : null;
                if (json_encode($baseFk) !== json_encode($nextFk)) {
                    $items[] = $this->typedDiffItem('fk_retargeted', 'column', $tableName, $columnName, 'Foreign key target/action changed', 'high', $baseFk !== null || $nextFk !== null, [
                        'runtimeImpact' => 'Affects traceability, joins, and workflow linkage',
                        'dataMigration' => 'Must review orphan risk',
                        'rollbackComplexity' => 'High',
                        'approvalClass' => 'cab',
                    ]);
                }

                if (
                    json_encode($baseColumn['business'] ?? []) !== json_encode($column['business'] ?? [])
                    || json_encode($baseColumn['ui'] ?? []) !== json_encode($column['ui'] ?? [])
                    || json_encode($baseColumn['validation'] ?? []) !== json_encode($column['validation'] ?? [])
                ) {
                    $items[] = $this->typedDiffItem('metadata_only_change', 'column', $tableName, $columnName, 'Business/UI/validation metadata changed', 'low', false, [
                        'runtimeImpact' => 'Requires registry compiler sync',
                    ]);
                }
            }

            foreach ((array)($baseTable['columns'] ?? []) as $column) {
                if (!is_array($column)) {
                    continue;
                }
                $columnName = (string)($column['name'] ?? '');
                if (!isset($currentColumns[$columnName])) {
                    $items[] = $this->typedDiffItem('object_removed', 'column', $tableName, $columnName, 'Drop existing column', 'critical', true, [
                        'runtimeImpact' => 'Breaks existing forms/APIs/reports',
                        'dataMigration' => 'Data loss risk',
                        'rollbackComplexity' => 'Very high',
                        'approvalClass' => 'cab_esign',
                    ]);
                }
            }
        }

        foreach ((array)($baseline['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableName = (string)($table['name'] ?? '');
            if (!isset($currentTables[$tableName])) {
                $items[] = $this->typedDiffItem('object_removed', 'table', $tableName, '', 'Drop existing table', 'critical', true, [
                    'runtimeImpact' => 'Breaks runtime contracts/module builder/workflows',
                    'dataMigration' => 'High data loss risk',
                    'rollbackComplexity' => 'Very high',
                    'approvalClass' => 'cab_esign',
                ]);
            }
        }

        $criticalCount = count(array_filter($items, static fn(array $item): bool => ($item['severity'] ?? '') === 'critical'));
        $destructiveCount = count(array_filter($items, static fn(array $item): bool => !empty($item['destructive'])));
        $breakingCount = count(array_filter($items, static fn(array $item): bool => !empty($item['breaking'])));
        $highCount = count(array_filter($items, static fn(array $item): bool => ($item['severity'] ?? '') === 'high'));
        $mediumCount = count(array_filter($items, static fn(array $item): bool => ($item['severity'] ?? '') === 'medium'));
        $lowCount = count(array_filter($items, static fn(array $item): bool => ($item['severity'] ?? '') === 'low'));
        $riskScore = min(100, array_reduce($items, fn(int $carry, array $item): int => $carry + $this->riskWeight($item), 0));

        $approvalRank = ['standard' => 1, 'elevated' => 2, 'cab' => 3, 'cab_esign' => 4];
        $approvalClass = 'standard';
        foreach ($items as $item) {
            $candidate = (string)($item['approvalClass'] ?? 'standard');
            if (($approvalRank[$candidate] ?? 0) > ($approvalRank[$approvalClass] ?? 0)) {
                $approvalClass = $candidate;
            }
        }

        $compatibilityScore = max(0, 100 - min(100, (int)round(
            ($criticalCount * 18)
            + ($destructiveCount * 12)
            + ($highCount * 6)
            + (count(array_filter($items, static fn(array $item): bool => ($item['type'] ?? '') === 'metadata_only_change')) * 1)
        )));

        return [
            'items' => array_values($items),
            'summary' => [
                'total' => count($items),
                'breakingCount' => $breakingCount,
                'destructiveCount' => $destructiveCount,
                'criticalCount' => $criticalCount,
                'highCount' => $highCount,
                'mediumCount' => $mediumCount,
                'lowCount' => $lowCount,
                'compatibilityScore' => $compatibilityScore,
                'riskScore' => $riskScore,
                'approvalClass' => $approvalClass,
                'destructiveBlocked' => count(array_filter($items, static fn(array $item): bool => !empty($item['destructive']) && in_array((string)($item['severity'] ?? ''), ['critical', 'high'], true))) > 0,
            ],
        ];
    }

    private function buildCompilerBundle(array $schema, string $designId, string $actor): array
    {
        $schema = $this->normalizeEnterpriseSchema($schema, $actor);
        $baseline = $this->loadBaselineDocument($designId, $schema);
        if (!is_array($baseline)) {
            $baseline = $schema;
        }
        $report = $this->buildSchemaReport($schema);
        $health = $this->buildHealthDiagnostics($schema, $baseline);
        $tables = [];
        $relations = [];
        $fieldRegistry = [];
        $workflowBindings = [];
        $digitalThreads = [];
        $contracts = [];

        foreach ((array)($schema['tables'] ?? []) as $table) {
            if (!is_array($table)) {
                continue;
            }
            $tableKey = (string)($table['schema'] ?? 'public') . '.' . (string)($table['name'] ?? 'table');
            $columns = [];
            foreach ((array)($table['columns'] ?? []) as $column) {
                if (!is_array($column)) {
                    continue;
                }
                $columnPayload = [
                    'key' => (string)($column['name'] ?? ''),
                    'label' => (string)($column['labels']['en'] ?? $column['name'] ?? ''),
                    'labelVi' => (string)($column['labels']['vi'] ?? $column['name'] ?? ''),
                    'type' => (string)($column['type'] ?? ''),
                    'nullable' => (bool)($column['nullable'] ?? true),
                    'default' => $column['default_val'] ?? null,
                    'widget' => (string)($column['ui']['widget'] ?? ''),
                    'semantics' => (string)($column['business']['semantics'] ?? ''),
                    'sensitivity' => (string)($column['security']['sensitivity'] ?? ''),
                    'foreignKey' => is_array($column['foreign_key'] ?? null) ? $column['foreign_key'] : null,
                ];
                $columns[] = $columnPayload;
                $fieldRegistry[$tableKey][] = $columnPayload;
            }

            $tables[] = [
                'key' => $tableKey,
                'table' => (string)($table['name'] ?? ''),
                'schema' => (string)($table['schema'] ?? 'public'),
                'domain' => (string)($table['domain'] ?? 'default'),
                'labels' => [
                    'vi' => (string)($table['labels']['vi'] ?? $table['name'] ?? ''),
                    'en' => (string)($table['labels']['en'] ?? $table['name'] ?? ''),
                ],
                'canonical' => is_array($table['canonical'] ?? null) ? $table['canonical'] : [],
                'security' => [
                    'rlsEnabled' => (bool)($table['rls_enabled'] ?? false),
                    'policyCount' => count((array)($table['policies'] ?? [])),
                    'sensitivity' => (string)($table['security']['sensitivity'] ?? ''),
                ],
                'workflowBindings' => array_values(array_filter((array)($table['integration']['workflow_bindings'] ?? []))),
                'columns' => $columns,
            ];

            if (!empty($table['integration']['workflow_bindings'])) {
                $workflowBindings[] = [
                    'tableKey' => $tableKey,
                    'bindings' => array_values(array_filter((array)($table['integration']['workflow_bindings'] ?? []))),
                ];
            }
            if (!empty($table['integration']['digital_thread_links'])) {
                $digitalThreads[] = [
                    'tableKey' => $tableKey,
                    'links' => array_values(array_filter((array)($table['integration']['digital_thread_links'] ?? []))),
                ];
            }

            $statusColumn = '';
            foreach ((array)($table['columns'] ?? []) as $column) {
                if (is_array($column) && strpos(strtolower((string)($column['name'] ?? '')), 'status') !== false) {
                    $statusColumn = (string)($column['name'] ?? '');
                    break;
                }
            }

            $contracts[] = [
                'tableKey' => $tableKey,
                'label' => (string)($table['labels']['en'] ?? $table['name'] ?? ''),
                'labelVi' => (string)($table['labels']['vi'] ?? $table['name'] ?? ''),
                'domain' => (string)($table['domain'] ?? 'default'),
                'workflowId' => (string)($table['integration']['workflow_id'] ?? ''),
                'statusColumn' => $statusColumn,
                'columnCount' => count($columns),
                'supportTable' => false,
            ];
        }

        foreach ((array)($schema['relations'] ?? []) as $relation) {
            if (!is_array($relation)) {
                continue;
            }
            $relations[] = [
                'key' => (string)($relation['runtime']['contract_key'] ?? $relation['id'] ?? ''),
                'name' => (string)($relation['name'] ?? ''),
                'fromTableId' => (string)($relation['from_table_id'] ?? ''),
                'fromColId' => (string)($relation['from_col_id'] ?? ''),
                'toTableId' => (string)($relation['to_table_id'] ?? ''),
                'toColId' => (string)($relation['to_col_id'] ?? ''),
                'onDelete' => (string)($relation['on_delete'] ?? 'RESTRICT'),
                'onUpdate' => (string)($relation['on_update'] ?? 'CASCADE'),
                'digitalThread' => (bool)($relation['integration']['digital_thread'] ?? false),
            ];
        }

        return [
            '_meta' => [
                'id' => 'schema_compiler_' . $this->safeId($designId, 'workspace') . '_' . gmdate('Ymd_His'),
                'designId' => $designId,
                'designName' => (string)($schema['_meta']['name'] ?? $designId),
                'generatedAt' => $this->nowIso(),
                'actor' => $actor,
                'source' => 'schema_studio_compiler',
            ],
            'report' => $report,
            'runtimeProjection' => [
                'tables' => $tables,
                'relations' => $relations,
                'fieldRegistry' => $fieldRegistry,
                'workflowBindings' => $workflowBindings,
                'digitalThreads' => $digitalThreads,
            ],
            'schemaDocument' => $schema,
            'contracts' => $contracts,
            'health' => $health,
        ];
    }

    private function readReleaseLog(): array
    {
        $path = $this->registryDirPath() . '/schema-studio-release-log.json';
        $doc = $this->readJsonFile($path);
        if (!is_array($doc)) {
            $doc = [
                '_meta' => ['generatedAt' => $this->nowIso(), 'source' => 'schema_studio_release_log'],
                'items' => [],
            ];
        }
        if (!isset($doc['items']) || !is_array($doc['items'])) {
            $doc['items'] = [];
        }
        return $doc;
    }

    private function updateEnterpriseRegistryArtifacts(array $compilerBundle, ?array $releaseSummary = null): array
    {
        $registryDir = $this->registryDirPath();
        $releaseLog = $this->readReleaseLog();
        if ($releaseSummary !== null) {
            $items = array_values(array_filter((array)($releaseLog['items'] ?? []), static function ($item) use ($releaseSummary): bool {
                return !is_array($item) || (string)($item['id'] ?? '') !== (string)($releaseSummary['id'] ?? '');
            }));
            array_unshift($items, $releaseSummary);
            $releaseLog['items'] = array_slice($items, 0, 100);
            $releaseLog['_meta']['generatedAt'] = $this->nowIso();
            $this->writeJsonFile($registryDir . '/schema-studio-release-log.json', $releaseLog);
        } else {
            $this->writeJsonFile($registryDir . '/schema-studio-release-log.json', $releaseLog);
        }

        $projection = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_compiler',
                'designId' => (string)($compilerBundle['_meta']['designId'] ?? ''),
            ],
            'tables' => $compilerBundle['runtimeProjection']['tables'] ?? [],
            'relations' => $compilerBundle['runtimeProjection']['relations'] ?? [],
            'fieldRegistry' => $compilerBundle['runtimeProjection']['fieldRegistry'] ?? [],
            'workflowBindings' => $compilerBundle['runtimeProjection']['workflowBindings'] ?? [],
            'digitalThreads' => $compilerBundle['runtimeProjection']['digitalThreads'] ?? [],
            'domains' => $compilerBundle['health']['domains'] ?? [],
            'layers' => $compilerBundle['health']['layers'] ?? [],
            'journeys' => $compilerBundle['health']['journeys'] ?? [],
            'storyboards' => $compilerBundle['health']['storyboards'] ?? [],
            'personas' => $compilerBundle['health']['personas'] ?? [],
            'playbooks' => $compilerBundle['health']['playbooks'] ?? [],
            'releaseLanes' => $compilerBundle['health']['releaseLanes'] ?? [],
            'renderInsights' => $compilerBundle['health']['renderInsights'] ?? [],
            'operations' => $compilerBundle['health']['operations'] ?? [],
            'promotionBoard' => $compilerBundle['health']['promotionBoard'] ?? [],
            'firewall' => $compilerBundle['health']['firewall'] ?? [],
            'branchTopology' => $compilerBundle['health']['branchTopology'] ?? [],
            'focusDeck' => $compilerBundle['health']['focusDeck'] ?? [],
            'observability' => $compilerBundle['health']['observability'] ?? [],
            'eventRail' => $compilerBundle['health']['eventRail'] ?? [],
            'environments' => $compilerBundle['health']['environments'] ?? [],
            'dependencyMatrix' => $compilerBundle['health']['dependencyMatrix'] ?? [],
        ];
        $contracts = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_compiler',
                'designId' => (string)($compilerBundle['_meta']['designId'] ?? ''),
            ],
            'contracts' => $compilerBundle['contracts'] ?? [],
        ];

        $experienceReport = $this->buildExperienceArtifact(
            (string)($compilerBundle['_meta']['designId'] ?? ''),
            (string)($compilerBundle['_meta']['designName'] ?? ''),
            (array)($compilerBundle['health'] ?? []),
            (array)($compilerBundle['report'] ?? []),
            ['summary' => (array)($compilerBundle['health']['diffSummary'] ?? [])]
        );
        $operationsReport = $this->buildOperationsArtifact(
            (string)($compilerBundle['_meta']['designId'] ?? ''),
            (string)($compilerBundle['_meta']['designName'] ?? ''),
            (array)($compilerBundle['health'] ?? []),
            (array)($compilerBundle['report'] ?? []),
            ['summary' => (array)($compilerBundle['health']['diffSummary'] ?? [])]
        );
        $commandCenterReport = $this->buildCommandCenterArtifact(
            (string)($compilerBundle['_meta']['designId'] ?? ''),
            (string)($compilerBundle['_meta']['designName'] ?? ''),
            (array)($compilerBundle['health'] ?? []),
            (array)($compilerBundle['report'] ?? []),
            ['summary' => (array)($compilerBundle['health']['diffSummary'] ?? [])]
        );
        $diagnostics = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_diagnostics',
                'designId' => (string)($compilerBundle['_meta']['designId'] ?? ''),
                'designName' => (string)($compilerBundle['_meta']['designName'] ?? ''),
            ],
            'summary' => (array)($compilerBundle['health']['summary'] ?? []),
            'hotspots' => array_slice((array)($compilerBundle['health']['hotspots'] ?? []), 0, 12),
            'recommendations' => array_slice((array)($compilerBundle['health']['recommendations'] ?? []), 0, 12),
            'domains' => array_slice((array)($compilerBundle['health']['domains'] ?? []), 0, 12),
            'layers' => array_slice((array)($compilerBundle['health']['layers'] ?? []), 0, 12),
            'governance' => (array)($compilerBundle['health']['governance'] ?? []),
            'journeys' => array_slice((array)($compilerBundle['health']['journeys'] ?? []), 0, 12),
            'dependencyMatrix' => (array)($compilerBundle['health']['dependencyMatrix'] ?? []),
            'blockers' => array_slice((array)($compilerBundle['health']['blockers'] ?? []), 0, 12),
            'releaseRadar' => (array)($compilerBundle['health']['releaseRadar'] ?? []),
            'storyboards' => array_slice((array)($compilerBundle['health']['storyboards'] ?? []), 0, 12),
            'personas' => array_slice((array)($compilerBundle['health']['personas'] ?? []), 0, 12),
            'playbooks' => array_slice((array)($compilerBundle['health']['playbooks'] ?? []), 0, 12),
            'releaseLanes' => array_slice((array)($compilerBundle['health']['releaseLanes'] ?? []), 0, 12),
            'aiCopilot' => array_slice((array)($compilerBundle['health']['aiCopilot'] ?? []), 0, 12),
            'renderInsights' => (array)($compilerBundle['health']['renderInsights'] ?? []),
            'operations' => (array)($compilerBundle['health']['operations'] ?? []),
            'promotionBoard' => array_slice((array)($compilerBundle['health']['promotionBoard'] ?? []), 0, 12),
            'firewall' => (array)($compilerBundle['health']['firewall'] ?? []),
            'branchTopology' => array_slice((array)($compilerBundle['health']['branchTopology'] ?? []), 0, 12),
            'focusDeck' => array_slice((array)($compilerBundle['health']['focusDeck'] ?? []), 0, 12),
            'observability' => (array)($compilerBundle['health']['observability'] ?? []),
            'eventRail' => array_slice((array)($compilerBundle['health']['eventRail'] ?? []), 0, 12),
            'environments' => array_slice((array)($compilerBundle['health']['environments'] ?? []), 0, 12),
            'commandCenter' => $commandCenterReport,
            'reportSummary' => (array)($compilerBundle['report']['summary'] ?? []),
            'diffSummary' => (array)($compilerBundle['health']['diffSummary'] ?? []),
        ];
        $round7Report = $this->buildRound7Artifact(
            (string)($compilerBundle['_meta']['designId'] ?? ''),
            (string)($compilerBundle['_meta']['designName'] ?? ''),
            is_array($compilerBundle['schemaDocument'] ?? null) ? $compilerBundle['schemaDocument'] : [],
            (array)($compilerBundle['health'] ?? []),
            (array)($compilerBundle['report'] ?? []),
            ['summary' => (array)($compilerBundle['health']['diffSummary'] ?? [])]
        );
        $diagnostics['summary'] = array_merge((array)$diagnostics['summary'], (array)$round7Report['summary']);
        $diagnostics['round7'] = $round7Report;

        $manifest = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_enterprise_manifest',
                'designId' => (string)($compilerBundle['_meta']['designId'] ?? ''),
                'designName' => (string)($compilerBundle['_meta']['designName'] ?? ''),
            ],
            'summary' => [
                'projectionCount' => count((array)$projection['tables']),
                'relationCount' => count((array)$projection['relations']),
                'fieldCount' => array_reduce((array)$projection['tables'], static function (int $carry, $table): int {
                    return $carry + (is_array($table) ? count((array)($table['columns'] ?? [])) : 0);
                }, 0),
                'contractCount' => count((array)$contracts['contracts']),
                'policyCount' => (int)($compilerBundle['report']['summary']['policyCount'] ?? 0),
                'indexCount' => (int)($compilerBundle['report']['summary']['indexCount'] ?? 0),
                'checkConstraintCount' => (int)($compilerBundle['report']['summary']['checkConstraintCount'] ?? 0),
                'triggerCount' => (int)($compilerBundle['report']['summary']['triggerCount'] ?? 0),
                'viewCatalogCount' => (int)($compilerBundle['report']['summary']['viewCatalogCount'] ?? 0),
                'materializedViewCount' => (int)($compilerBundle['report']['summary']['materializedViewCount'] ?? 0),
                'functionCount' => (int)($compilerBundle['report']['summary']['functionCount'] ?? 0),
                'procedureCount' => (int)($compilerBundle['report']['summary']['procedureCount'] ?? 0),
                'eventTriggerCount' => (int)($compilerBundle['report']['summary']['eventTriggerCount'] ?? 0),
                'schemaCatalogCount' => (int)($compilerBundle['report']['summary']['schemaCatalogCount'] ?? 0),
                'roleCatalogCount' => (int)($compilerBundle['report']['summary']['roleCatalogCount'] ?? 0),
                'canonicalCoveragePercent' => (int)($compilerBundle['report']['summary']['canonicalCoveragePercent'] ?? 0),
                'releaseReadinessScore' => (int)($compilerBundle['report']['summary']['releaseReadinessScore'] ?? 0),
                'releaseCount' => count((array)($releaseLog['items'] ?? [])),
                'rlsTableCount' => (int)($compilerBundle['report']['summary']['rlsTableCount'] ?? 0),
                'savedViewCount' => (int)($compilerBundle['report']['summary']['savedViewCount'] ?? 0),
                'criticalCanonicalGaps' => count((array)($compilerBundle['report']['canonical']['criticalMissing'] ?? [])),
                'graphDensityScore' => (int)($compilerBundle['health']['summary']['graphDensityScore'] ?? 0),
                'metadataCompletenessPercent' => (int)($compilerBundle['health']['summary']['metadataCompletenessPercent'] ?? 0),
                'workflowBindingCoveragePercent' => (int)($compilerBundle['health']['summary']['workflowBindingCoveragePercent'] ?? 0),
                'orphanRelationRiskCount' => (int)($compilerBundle['health']['summary']['orphanRelationRiskCount'] ?? 0),
                'hotspotCount' => (int)($compilerBundle['health']['summary']['hotspotCount'] ?? 0),
                'visualReadinessScore' => (int)($compilerBundle['health']['summary']['visualReadinessScore'] ?? 0),
                'domainCount' => (int)($compilerBundle['health']['summary']['domainCount'] ?? 0),
                'layerCount' => (int)($compilerBundle['health']['summary']['layerCount'] ?? 0),
                'governanceCoveragePercent' => (int)($compilerBundle['health']['summary']['governanceCoveragePercent'] ?? 0),
                'journeyReadinessScore' => (int)($compilerBundle['health']['summary']['journeyReadinessScore'] ?? 0),
                'domainReadinessScore' => (int)($compilerBundle['health']['summary']['domainReadinessScore'] ?? 0),
                'blockerCount' => (int)($compilerBundle['health']['summary']['blockerCount'] ?? 0),
                'storyboardCount' => (int)($compilerBundle['health']['summary']['storyboardCount'] ?? 0),
                'releaseRadarScore' => (int)($compilerBundle['health']['summary']['releaseRadarScore'] ?? 0),
                'policyCoveragePercent' => (int)($compilerBundle['health']['summary']['policyCoveragePercent'] ?? 0),
                'performancePostureScore' => (int)($compilerBundle['health']['summary']['performancePostureScore'] ?? 0),
                'registrySyncScore' => (int)($compilerBundle['health']['summary']['registrySyncScore'] ?? 0),
                'complianceReadinessScore' => (int)($compilerBundle['health']['summary']['complianceReadinessScore'] ?? 0),
                'aiCopilotReadinessScore' => (int)($compilerBundle['health']['summary']['aiCopilotReadinessScore'] ?? 0),
                'experienceScore' => (int)($compilerBundle['health']['summary']['experienceScore'] ?? 0),
                'operationsScore' => (int)($compilerBundle['health']['summary']['operationsScore'] ?? 0),
                'promotionReadinessScore' => (int)($compilerBundle['health']['summary']['promotionReadinessScore'] ?? 0),
                'firewallScore' => (int)($compilerBundle['health']['summary']['firewallScore'] ?? 0),
                'observabilityScore' => (int)($compilerBundle['health']['summary']['observabilityScore'] ?? 0),
                'commandCenterScore' => (int)($compilerBundle['health']['summary']['commandCenterScore'] ?? 0),
                'personaCount' => (int)($compilerBundle['health']['summary']['personaCount'] ?? 0),
                'playbookCount' => (int)($compilerBundle['health']['summary']['playbookCount'] ?? 0),
                'releaseLaneCount' => (int)($compilerBundle['health']['summary']['releaseLaneCount'] ?? 0),
                'copilotSuggestionCount' => (int)($compilerBundle['health']['summary']['copilotSuggestionCount'] ?? 0),
                'focusDeckCount' => (int)($compilerBundle['health']['summary']['focusDeckCount'] ?? 0),
                'branchCount' => (int)($compilerBundle['health']['summary']['branchCount'] ?? 0),
                'environmentCount' => (int)($compilerBundle['health']['summary']['environmentCount'] ?? 0),
                'stageCount' => (int)($compilerBundle['health']['summary']['stageCount'] ?? 0),
                'eventRailCount' => (int)($compilerBundle['health']['summary']['eventRailCount'] ?? 0),
                'orchestrationScore' => (int)($commandCenterReport['summary']['orchestrationScore'] ?? 0),
                'narrativeCoverageScore' => (int)($commandCenterReport['summary']['narrativeCoverageScore'] ?? 0),
                'reviewWallScore' => (int)($commandCenterReport['summary']['reviewWallScore'] ?? 0),
                'atlasReadinessScore' => (int)($commandCenterReport['summary']['atlasReadinessScore'] ?? 0),
                'livePulseScore' => (int)($commandCenterReport['summary']['livePulseScore'] ?? 0),
                'collaborationReadinessScore' => (int)($commandCenterReport['summary']['collaborationReadinessScore'] ?? 0),
                'visualPolishScore' => (int)($commandCenterReport['summary']['visualPolishScore'] ?? 0),
                'sceneCount' => (int)($commandCenterReport['summary']['sceneCount'] ?? 0),
                'spotlightCount' => (int)($commandCenterReport['summary']['spotlightCount'] ?? 0),
                'reviewLaneCount' => (int)($commandCenterReport['summary']['reviewLaneCount'] ?? 0),
                'atlasCount' => (int)($commandCenterReport['summary']['atlasCount'] ?? 0),
                'atlasMeshScore' => (int)($round7Report['summary']['atlasMeshScore'] ?? 0),
                'physicalCoverageScore' => (int)($round7Report['summary']['physicalCoverageScore'] ?? 0),
                'reviewOpsScore' => (int)($round7Report['summary']['reviewOpsScore'] ?? 0),
                'exportSurfaceScore' => (int)($round7Report['summary']['exportSurfaceScore'] ?? 0),
                'interoperabilityScore' => (int)($round7Report['summary']['interoperabilityScore'] ?? 0),
                'roleModeScore' => (int)($round7Report['summary']['roleModeScore'] ?? 0),
                'traceabilityAtlasScore' => (int)($round7Report['summary']['traceabilityAtlasScore'] ?? 0),
                'beautySystemScore' => (int)($round7Report['summary']['beautySystemScore'] ?? 0),
                'objectSurfaceCount' => (int)($round7Report['summary']['objectSurfaceCount'] ?? 0),
                'roleModeCount' => (int)($round7Report['summary']['roleModeCount'] ?? 0),
                'reviewBoardCount' => (int)($round7Report['summary']['reviewBoardCount'] ?? 0),
                'exportBundleCount' => (int)($round7Report['summary']['exportBundleCount'] ?? 0),
            ],
            'report' => $compilerBundle['report'] ?? [],
            'health' => $diagnostics,
            'experienceSummary' => (array)($experienceReport['summary'] ?? []),
            'operationsSummary' => (array)($operationsReport['summary'] ?? []),
            'commandCenterSummary' => (array)($commandCenterReport['summary'] ?? []),
            'round7Summary' => (array)($round7Report['summary'] ?? []),
            'lastRelease' => $releaseSummary,
        ];

        $this->writeJsonFile($registryDir . '/schema-studio-runtime-projections.json', $projection);
        $this->writeJsonFile($registryDir . '/schema-studio-registry-contracts.json', $contracts);
        $this->writeJsonFile($registryDir . '/schema-studio-diagnostics.json', $diagnostics);
        $this->writeJsonFile($this->experienceReportPath(), $experienceReport);
        $this->writeJsonFile($this->operationsReportPath(), $operationsReport);
        $this->writeJsonFile($this->commandCenterReportPath(), $commandCenterReport);
        $this->writeJsonFile($this->round7ReportPath(), $round7Report);
        $this->writeJsonFile($registryDir . '/schema-studio-enterprise-manifest.json', $manifest);

        return $manifest;
    }

    private function destructiveConfirmToken(array $user): string
    {
        $actor = (string)($user['user_id'] ?? $user['username'] ?? 'system');
        return 'CONFIRMED_DESTRUCTIVE_' . $actor;
    }

    private function forbiddenMigrationStatement(string $sql): ?string
    {
        if (preg_match('/\b(TRUNCATE|DELETE|UPDATE|INSERT|COPY|VACUUM|ANALYZE|REINDEX|GRANT|REVOKE|ALTER\s+SYSTEM|CREATE\s+ROLE|ALTER\s+ROLE|DROP\s+ROLE|SET\s+ROLE|DO|CALL|EXECUTE)\b/i', $sql, $matches)) {
            return strtoupper((string)$matches[1]);
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

    /**
     * Build a Schema Studio document directly from the published registry
     * contract without creating or mutating a design file.
     *
     * @param array<string, mixed> $meta
     * @return array<string, mixed>
     */
    private function buildRegistryDesignDocument(string $id, array $meta): array
    {
        $registryPath = null;
        $relationPath = null;
        $domainPath = null;
        $tableRegistry = $this->readRegistryDocumentWithFallback('table-registry', $registryPath);
        $relationMap = $this->readRegistryDocumentWithFallback('relation-map', $relationPath);
        $domainArch = $this->readRegistryDocumentWithFallback('domain-architecture', $domainPath);
        $registrySource = $this->registrySourceLabel($registryPath, 'mom/data/registry/table-registry.json');
        $registryUpdatedAt = $registryPath !== null && is_file($registryPath)
            ? gmdate('c', (int)(filemtime($registryPath) ?: time()))
            : $this->nowIso();

        $domainMap = [];
        foreach (($domainArch['domains'] ?? []) as $domainKey => $domainDef) {
            $tables = is_array($domainDef['tables'] ?? null) ? $domainDef['tables'] : [];
            foreach ($tables as $tableName) {
                $domainMap[(string)$tableName] = (string)$domainKey;
            }
        }

        $schema = [
            '_meta' => array_merge([
                'id' => $id,
                'name' => 'HESEM System Contract Registry',
                'displayName' => 'System Contract Registry',
                'version' => '1.0.0',
                'description' => 'Read-only full backend contract registry.',
                'purpose' => 'Full backend contract visibility for AI, frontend, API governance, workflow mapping, and audit without editing the database.',
                'source' => 'mom/data/registry/table-registry.json',
                'designType' => 'system_contract_registry',
                'authorityLayer' => 'system_contract_registry',
                'authorityViewKind' => 'db_derived_contract',
                'writePolicy' => 'read_only_generated_artifact',
                'deletePolicy' => 'do_not_delete_regenerate_from_authority',
                'dataLossImpact' => 'Deleting this artifact does not delete DB rows, but removes full contract visibility until registry publication is regenerated.',
                'validation_profile' => 'logical_registry',
                'schemaName' => 'public',
                'databaseName' => 'mom',
                'storageAuthority' => 'database/migrations/*.sql -> database/schema.sql',
                'registryAuthority' => $registrySource,
                'createdAt' => (string)(($tableRegistry['_meta']['generatedAt'] ?? null) ?: $registryUpdatedAt),
                'updatedAt' => (string)(($tableRegistry['_meta']['generatedAt'] ?? null) ?: $registryUpdatedAt),
                'author' => 'registry',
                'readOnly' => true,
                'editable' => false,
            ], array_merge($meta, [
                'source' => $registrySource,
                'authoritySource' => 'database/migrations/*.sql -> database/schema.sql -> ' . $registrySource,
                'registryFallbackActive' => $registryPath !== null && strpos($registrySource, 'mom/contracts/') === 0,
            ])),
            'enums' => [],
            'tables' => [],
            'relations' => [],
            'groups' => [],
            'notes' => [],
        ];

        $tableMap = [];
        $colMap = [];
        $columnIndexMap = [];
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        $tableIndex = 0;
        foreach ($tables as $tableName => $tableDef) {
            if (!is_string($tableName) || !is_array($tableDef)) {
                continue;
            }

            $tableId = 'tbl_' . substr(md5($id . '.' . $tableName), 0, 10);
            $tableMap[$tableName] = $tableId;
            $columns = [];
            $rawColumns = is_array($tableDef['columns'] ?? null) ? $tableDef['columns'] : [];
            $pkFields = $this->normalizeFieldList($tableDef['primaryKey'] ?? ($tableDef['primaryKeys'] ?? []));
            foreach ($rawColumns as $columnName => $columnDef) {
                $name = is_string($columnName)
                    ? $columnName
                    : (is_array($columnDef) ? (string)($columnDef['name'] ?? '') : (string)$columnDef);
                if ($name === '') {
                    continue;
                }

                $colId = 'col_' . substr(md5($id . '.' . $tableName . '.' . $name), 0, 10);
                $colMap[$tableName . '.' . $name] = $colId;
                $isIdentifier = $this->endsWith($name, '_id') || $name === 'id';
                $type = is_array($columnDef)
                    ? (string)($columnDef['type'] ?? ($isIdentifier ? 'uuid' : 'varchar'))
                    : ($isIdentifier ? 'uuid' : 'varchar');
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
                    'default_val' => $defaultVal !== null
                        ? (string)$defaultVal
                        : ($isPk && strtoupper($type) === 'UUID' ? 'gen_random_uuid()' : (($name === 'created_at' || $name === 'updated_at') ? 'now()' : null)),
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
                'tags' => ['registry_contract'],
                'rls_enabled' => false,
                'readOnly' => true,
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

        $edges = $this->relationEdgesFromRelationMap($relationMap);
        if ($edges === []) {
            $edges = $this->relationEdgesFromTableRegistry($tableRegistry);
        }

        foreach ($edges as $edge) {
            if (!is_array($edge)) {
                continue;
            }
            $fromDef = is_array($edge['from'] ?? null) ? $edge['from'] : [];
            $toDef = is_array($edge['to'] ?? null) ? $edge['to'] : [];
            $fromTable = is_scalar($fromDef['entity'] ?? null) ? trim((string)$fromDef['entity']) : '';
            $toTable = is_scalar($toDef['entity'] ?? null) ? trim((string)$toDef['entity']) : '';
            $fromFields = $this->normalizeFieldList($fromDef['field'] ?? ($edge['sourceColumn'] ?? ''));
            $toFields = $this->normalizeFieldList($toDef['field'] ?? ($edge['targetColumn'] ?? 'id'));
            $fromTableId = $tableMap[$fromTable] ?? null;
            $toTableId = $tableMap[$toTable] ?? null;
            if (!$fromTableId || !$toTableId || empty($fromFields) || empty($toFields)) {
                continue;
            }

            $pairCount = min(count($fromFields), count($toFields));
            $cascadeActions = is_array($edge['cascadeActions'] ?? null) ? $edge['cascadeActions'] : [];
            $onDelete = is_scalar($cascadeActions['delete'] ?? null) ? trim((string)$cascadeActions['delete']) : 'RESTRICT';
            $onUpdate = is_scalar($cascadeActions['update'] ?? null) ? trim((string)$cascadeActions['update']) : 'CASCADE';
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
                $relationName = is_scalar($edge['constraintName'] ?? null)
                    ? trim((string)$edge['constraintName'])
                    : 'fk_' . $fromTable . '_' . $fromCol . $suffix;
                if ($relationName === '') {
                    $relationName = 'fk_' . $fromTable . '_' . $fromCol . $suffix;
                }

                $schema['relations'][] = [
                    'id' => 'rel_' . substr(md5($id . '.' . $fromTable . '.' . $fromCol . '>' . $toTable . '.' . $toCol), 0, 10),
                    'from_table_id' => $fromTableId,
                    'from_col_id' => $fromColId,
                    'to_table_id' => $toTableId,
                    'to_col_id' => $toColId,
                    'name' => $relationName,
                    'on_delete' => $onDelete,
                    'on_update' => $onUpdate,
                    'nullable' => $sourceNullable,
                    'edge' => ['type' => 'orthogonal', 'waypoints' => []],
                ];
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

        $schema['_meta']['tableCount'] = count($schema['tables']);
        $schema['_meta']['relationCount'] = count($schema['relations']);

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildDesignSummary(array $schema, array $overrides = []): array
    {
        $meta = is_array($schema['_meta'] ?? null) ? $schema['_meta'] : [];
        $readOnly = !empty($meta['readOnly']) || (($meta['editable'] ?? true) === false);
        $id = (string)($meta['id'] ?? self::SYSTEM_DESIGN_ID);
        $defaultDisplayName = $id === self::SYSTEM_REGISTRY_DESIGN_ID
            ? 'System Contract Registry'
            : 'Workspace Design Draft';
        $summary = [
            'id' => $id,
            'name' => (string)($meta['name'] ?? 'HESEM Workspace Design'),
            'displayName' => (string)($meta['displayName'] ?? $defaultDisplayName),
            'version' => (string)($meta['version'] ?? '1.0.0'),
            'updatedAt' => (string)($meta['updatedAt'] ?? $meta['generated_at'] ?? ''),
            'author' => (string)($meta['author'] ?? ''),
            'tableCount' => count((array)($schema['tables'] ?? [])),
            'relationCount' => count((array)($schema['relations'] ?? [])),
            'designType' => (string)($meta['designType'] ?? 'workspace_design'),
            'authorityLayer' => (string)($meta['authorityLayer'] ?? 'design_workspace'),
            'authorityViewKind' => (string)($meta['authorityViewKind'] ?? ($readOnly ? 'db_derived_contract' : 'design_draft')),
            'source' => (string)($meta['source'] ?? ''),
            'schemaName' => (string)($meta['schemaName'] ?? 'public'),
            'databaseName' => (string)($meta['databaseName'] ?? 'mom'),
            'physicalDbSchema' => (string)($meta['physicalDbSchema'] ?? 'public'),
            'authoritySource' => (string)($meta['authoritySource'] ?? ($readOnly ? 'database/migrations/*.sql -> database/schema.sql -> table-registry.json' : 'data/schema-studio/designs/workspace.json')),
            'purpose' => (string)($meta['purpose'] ?? ($readOnly ? 'Full read-only backend contract view.' : 'Editable design draft for controlled schema design before promotion.')),
            'writePolicy' => (string)($meta['writePolicy'] ?? ($readOnly ? 'read_only_generated_artifact' : 'editable_with_revision_guard')),
            'deletePolicy' => (string)($meta['deletePolicy'] ?? ($readOnly ? 'do_not_delete_regenerate_from_authority' : 'archive_or_replace_do_not_hard_delete')),
            'dataLossImpact' => (string)($meta['dataLossImpact'] ?? ($readOnly ? 'No DB data loss, but contract visibility is lost until regenerated.' : 'No DB data loss, but editable design, baseline, diff, compiler, and release workflows lose their working surface.')),
            'blankDraft' => !empty($meta['blankDraft']),
            'canDelete' => false,
            'readOnly' => $readOnly,
            'editable' => !$readOnly,
            'isSystem' => true,
        ];

        return array_merge($summary, $overrides);
    }

    public function listDesigns(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $workspace = $this->loadDesignDocument(self::SYSTEM_DESIGN_ID);
        $designs = [];
        if (is_array($workspace)) {
            $workspaceMeta = is_array($workspace['_meta'] ?? null) ? $workspace['_meta'] : [];
            $designs[] = $this->buildDesignSummary($workspace, [
                'id' => self::SYSTEM_DESIGN_ID,
                'displayName' => (string)($workspaceMeta['displayName'] ?? 'Workspace Design Draft'),
                'designType' => (string)($workspaceMeta['designType'] ?? 'workspace_design'),
                'authorityLayer' => (string)($workspaceMeta['authorityLayer'] ?? 'design_workspace'),
                'authorityViewKind' => (string)($workspaceMeta['authorityViewKind'] ?? 'design_draft'),
                'purpose' => (string)($workspaceMeta['purpose'] ?? 'Editable design draft for controlled schema design, baseline, diff, compiler, and release review. It is not the physical DB schema.'),
                'writePolicy' => (string)($workspaceMeta['writePolicy'] ?? 'editable_with_revision_guard'),
                'deletePolicy' => (string)($workspaceMeta['deletePolicy'] ?? 'archive_or_replace_do_not_hard_delete'),
                'dataLossImpact' => (string)($workspaceMeta['dataLossImpact'] ?? 'Deleting the workspace does not delete database rows, but it disables the editable Schema Studio surface until a replacement workspace is created.'),
                'blankDraft' => !empty($workspaceMeta['blankDraft']),
                'readOnly' => false,
                'editable' => true,
            ]);
        }
        $registry = $this->loadDesignDocument(self::SYSTEM_REGISTRY_DESIGN_ID);
        if (is_array($registry) && count((array)($registry['tables'] ?? [])) > 0) {
            $designs[] = $this->buildDesignSummary($registry, [
                'id' => self::SYSTEM_REGISTRY_DESIGN_ID,
                'readOnly' => true,
                'editable' => false,
            ]);
        }
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
        $id = $this->normalizeDesignId($id);
        $schema = $this->loadDesignDocument($id);
        if (!$schema) {
            $this->error('not_found', 404);
        }
        $schema = $id === self::SYSTEM_REGISTRY_DESIGN_ID
            ? $this->reconcileSchemaDocument($schema)
            : $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $baseline = $this->loadBaselineDocument($id, $schema);
        if (is_array($baseline) && $id !== self::SYSTEM_REGISTRY_DESIGN_ID) {
            $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
        }
        $this->success([
            'schema' => $schema,
            'baseline' => $baseline,
            'revisions' => $this->currentDesignRevisions($id),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function saveDesign(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $this->ensureSavePayloadLimit();
        $body = $this->jsonBody();
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        if (!is_array($schema) || !isset($schema['_meta'])) {
            $this->error('invalid_schema', 400);
        }
        $incomingId = (string)($schema['_meta']['id'] ?? self::SYSTEM_DESIGN_ID);
        $this->requireEditableDesign($incomingId);
        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $schema['_meta']['id'] = self::SYSTEM_DESIGN_ID;
        $this->assertRevisionToken((string)$schema['_meta']['id'], $body['revisions'] ?? null, ['design']);
        $schema['_meta']['updatedAt'] = $this->nowIso();
        $schema['_meta']['author'] = (string)($user['username'] ?? 'system');
        $schema['_meta']['enterprise']['last_saved_at'] = $schema['_meta']['updatedAt'];
        $schema['_meta']['enterprise']['last_saved_by'] = (string)($user['username'] ?? 'system');
        $this->writeJsonFile($this->designPath((string)$schema['_meta']['id']), $schema);
        $compilerBundle = $this->buildCompilerBundle($schema, (string)$schema['_meta']['id'], (string)($user['username'] ?? 'system'));
        $manifest = $this->updateEnterpriseRegistryArtifacts($compilerBundle, null);
        $this->auditLog('schema_studio_save', ['design_id' => $schema['_meta']['id']], (string)($user['username'] ?? ''));
        $this->success([
            'id' => $schema['_meta']['id'],
            'savedAt' => $schema['_meta']['updatedAt'],
            'enterpriseManifest' => [
                'generatedAt' => (string)($manifest['_meta']['generatedAt'] ?? ''),
                'projectionCount' => (int)($manifest['summary']['projectionCount'] ?? 0),
                'releaseCount' => (int)($manifest['summary']['releaseCount'] ?? 0),
            ],
            'revisions' => $this->currentDesignRevisions((string)$schema['_meta']['id']),
            'save_policy' => $this->savePolicy(),
        ]);
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
        $id = $this->normalizeDesignId($id);
        $this->requireEditableDesign($id);
        if ($id === self::SYSTEM_DESIGN_ID) {
            $this->error('system_design_locked', 409, 'The active system schema cannot be deleted.');
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
        $this->ensureSavePayloadLimit();
        $body = $this->jsonBody();
        $designId = $this->normalizeDesignId((string)($body['design_id'] ?? self::SYSTEM_DESIGN_ID));
        $this->requireEditableDesign($designId);
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : null;
        if ($designId === '' || !$schema) {
            $this->error('missing_payload', 400);
        }
        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $this->assertRevisionToken($designId, $body['revisions'] ?? null, ['baseline']);
        $this->writeJsonFile($this->baselinePath($designId), $schema);
        $this->auditLog('schema_studio_set_baseline', ['design_id' => $designId], (string)($user['username'] ?? ''));
        $this->success([
            'baselineAt' => $this->nowIso(),
            'revisions' => $this->currentDesignRevisions($designId),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function loadFromRegistry(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $registryPath = null;
        $relationPath = null;
        $domainPath = null;
        $tableRegistry = $this->readRegistryDocumentWithFallback('table-registry', $registryPath);
        $relationMap = $this->readRegistryDocumentWithFallback('relation-map', $relationPath);
        $domainArch = $this->readRegistryDocumentWithFallback('domain-architecture', $domainPath);
        $registrySource = $this->registrySourceLabel($registryPath, 'mom/data/registry/table-registry.json');

        $domainMap = [];
        foreach (($domainArch['domains'] ?? []) as $domainKey => $domainDef) {
            $tables = is_array($domainDef['tables'] ?? null) ? $domainDef['tables'] : [];
            foreach ($tables as $tableName) {
                $domainMap[(string)$tableName] = (string)$domainKey;
            }
        }

        $schema = [
            '_meta' => [
                'id' => self::SYSTEM_DESIGN_ID,
                'name' => 'HESEM Workspace Design',
                'version' => '1.0.0',
                'description' => 'Editable workspace design imported from the generated system contract registry.',
                'source' => 'workspace_registry_import:' . $registrySource,
                'designType' => 'workspace_design',
                'authorityLayer' => 'design_workspace',
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

        $edges = $this->relationEdgesFromRelationMap($relationMap);
        if ($edges === []) {
            $edges = $this->relationEdgesFromTableRegistry($tableRegistry);
        }

        foreach ($edges as $edge) {
            if (!is_array($edge)) {
                continue;
            }
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

        $this->success([
            'schema' => $schema,
            'revisions' => $this->currentDesignRevisions((string)$schema['_meta']['id']),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function reverseEngineer(): never
    {
        $user = $this->requireAuth();
        $this->requireDatabaseAccess($user);
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
                    'id' => self::SYSTEM_DESIGN_ID,
                    'name' => 'HESEM Workspace Design',
                    'version' => '1.0.0',
                    'description' => 'Editable workspace design reverse engineered from PostgreSQL for controlled design review.',
                    'designType' => 'workspace_design',
                    'authorityLayer' => 'design_workspace',
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
            $this->success([
                'schema' => $schema,
                'revisions' => $this->currentDesignRevisions((string)$schema['_meta']['id']),
                'save_policy' => $this->savePolicy(),
            ]);
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
        $this->requireDatabaseAccess($user);
        $this->requireMigrationAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (isset($body['design_id'])) {
            $this->requireEditableDesign((string)$body['design_id']);
        }
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
        $this->requireDatabaseAccess($user);
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

            if ($totalRows === 0) {
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
        $this->requireDatabaseAccess($user);
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


    public function listReleaseBundles(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $designId = trim((string)($body['design_id'] ?? $this->input('design_id', '') ?? ''));
        if ($designId !== '') {
            $designId = $this->safeId($designId, 'workspace');
        }
        $releases = [];

        foreach (glob($this->releaseDir . '/*.json') ?: [] as $file) {
            $payload = $this->readJsonFile($file);
            if (!is_array($payload)) {
                continue;
            }
            $meta = is_array($payload['_meta'] ?? null) ? $payload['_meta'] : [];
            if ($designId !== '' && (string)($meta['designId'] ?? '') !== $designId) {
                continue;
            }
            $summary = is_array($payload['summary'] ?? null) ? $payload['summary'] : [];
            $releases[] = [
                'id' => (string)($meta['id'] ?? basename($file, '.json')),
                'name' => (string)($summary['name'] ?? $meta['id'] ?? basename($file, '.json')),
                'designId' => (string)($meta['designId'] ?? ''),
                'designName' => (string)($meta['designName'] ?? ''),
                'createdAt' => (string)($meta['createdAt'] ?? ''),
                'actor' => (string)($meta['actor'] ?? ''),
                'approvalClass' => (string)($summary['approvalClass'] ?? 'standard'),
                'compatibilityScore' => (int)($summary['compatibilityScore'] ?? 0),
                'riskScore' => (int)($summary['riskScore'] ?? 0),
                'destructiveCount' => (int)($summary['destructiveCount'] ?? 0),
                'breakingCount' => (int)($summary['breakingCount'] ?? 0),
            ];
        }

        usort($releases, static fn(array $a, array $b): int => strcmp((string)$b['createdAt'], (string)$a['createdAt']));
        $this->success(['releases' => $releases]);
    }

    public function compileRegistryBundle(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $this->ensureSavePayloadLimit();

        $body = $this->jsonBody();
        $designId = $this->requireEditableDesign((string)($body['design_id'] ?? 'workspace'));
        $this->assertRevisionToken($designId, $body['revisions'] ?? null, ['design']);
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('invalid_schema', 400);
        }
        $this->requireEditableDesign((string)($schema['_meta']['id'] ?? $designId));

        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $bundle = $this->buildCompilerBundle($schema, $designId, (string)($user['username'] ?? 'system'));
        $bundleId = (string)($bundle['_meta']['id'] ?? ('schema_compiler_' . $designId));
        $this->writeJsonFile($this->compilerBundlePath($bundleId), $bundle);
        $manifest = $this->updateEnterpriseRegistryArtifacts($bundle, null);

        $schema['_meta']['enterprise']['last_compiled_at'] = $this->nowIso();
        $schema['_meta']['enterprise']['last_compiler_bundle_id'] = $bundleId;
        $designPath = $this->designPath($designId);
        if (is_file($designPath)) {
            $this->writeJsonFile($designPath, $schema);
        }

        $summary = [
            'id' => $bundleId,
            'designId' => $designId,
            'generatedAt' => (string)($bundle['_meta']['generatedAt'] ?? ''),
            'projectionCount' => (int)($manifest['summary']['projectionCount'] ?? 0),
            'fieldCount' => (int)($manifest['summary']['fieldCount'] ?? 0),
            'policyCount' => (int)($manifest['summary']['policyCount'] ?? 0),
            'canonicalCoveragePercent' => (int)($manifest['summary']['canonicalCoveragePercent'] ?? 0),
            'visualReadinessScore' => (int)($manifest['summary']['visualReadinessScore'] ?? 0),
            'metadataCompletenessPercent' => (int)($manifest['summary']['metadataCompletenessPercent'] ?? 0),
            'workflowBindingCoveragePercent' => (int)($manifest['summary']['workflowBindingCoveragePercent'] ?? 0),
            'hotspotCount' => (int)($manifest['summary']['hotspotCount'] ?? 0),
            'experienceScore' => (int)($manifest['summary']['experienceScore'] ?? 0),
            'complianceReadinessScore' => (int)($manifest['summary']['complianceReadinessScore'] ?? 0),
            'performancePostureScore' => (int)($manifest['summary']['performancePostureScore'] ?? 0),
            'registrySyncScore' => (int)($manifest['summary']['registrySyncScore'] ?? 0),
            'aiCopilotReadinessScore' => (int)($manifest['summary']['aiCopilotReadinessScore'] ?? 0),
        ];

        $this->auditLog('schema_studio_compile_registry', ['design_id' => $designId, 'bundle_id' => $bundleId], (string)($user['username'] ?? ''));
        $this->success([
            'bundleId' => $bundleId,
            'bundleSummary' => $summary,
            'manifest' => $manifest,
            'experienceSummary' => (array)($manifest['experienceSummary'] ?? []),
            'operationsSummary' => (array)($manifest['operationsSummary'] ?? []),
            'commandCenterSummary' => (array)($manifest['commandCenterSummary'] ?? []),
            'revisions' => $this->currentDesignRevisions($designId),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function createReleaseBundle(): never
    {
        $user = $this->requireAuth();
        $this->requireWriteAccess($user);
        $this->requireCsrf();
        $this->ensureSavePayloadLimit();
        $this->enforceReleaseGate();

        $body = $this->jsonBody();
        $designId = $this->requireEditableDesign((string)($body['design_id'] ?? 'workspace'));
        $this->assertRevisionToken($designId, $body['revisions'] ?? null, ['design', 'baseline']);
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('invalid_schema', 400);
        }
        $this->requireEditableDesign((string)($schema['_meta']['id'] ?? $designId));

        $baseline = is_array($body['baseline'] ?? null) ? $body['baseline'] : $this->loadBaselineDocument($designId, $schema);
        if (!is_array($baseline)) {
            $baseline = ['_meta' => ['id' => $designId . '_baseline'], 'tables' => [], 'relations' => [], 'groups' => [], 'notes' => []];
        }

        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
        $diff = $this->buildTypedDiff($baseline, $schema);
        $report = $this->buildSchemaReport($schema);
        $compilerBundle = $this->buildCompilerBundle($schema, $designId, (string)($user['username'] ?? 'system'));
        $health = $this->buildHealthDiagnostics($schema, $baseline);

        $bundleId = 'schema_release_' . $designId . '_' . gmdate('Ymd_His');
        $summary = [
            'id' => $bundleId,
            'name' => (string)($schema['_meta']['name'] ?? $designId) . ' · ' . gmdate('Y-m-d H:i:s') . ' UTC',
            'designId' => $designId,
            'designName' => (string)($schema['_meta']['name'] ?? $designId),
            'createdAt' => $this->nowIso(),
            'actor' => (string)($user['username'] ?? 'system'),
            'approvalClass' => (string)($diff['summary']['approvalClass'] ?? 'standard'),
            'compatibilityScore' => (int)($diff['summary']['compatibilityScore'] ?? 100),
            'riskScore' => (int)($diff['summary']['riskScore'] ?? 0),
            'destructiveCount' => (int)($diff['summary']['destructiveCount'] ?? 0),
            'breakingCount' => (int)($diff['summary']['breakingCount'] ?? 0),
            'releaseReadinessScore' => (int)($report['summary']['releaseReadinessScore'] ?? 0),
            'visualReadinessScore' => (int)($health['summary']['visualReadinessScore'] ?? 0),
            'metadataCompletenessPercent' => (int)($health['summary']['metadataCompletenessPercent'] ?? 0),
            'graphDensityScore' => (int)($health['summary']['graphDensityScore'] ?? 0),
            'hotspotCount' => (int)($health['summary']['hotspotCount'] ?? 0),
        ];

        $bundle = [
            '_meta' => [
                'id' => $bundleId,
                'designId' => $designId,
                'designName' => (string)($schema['_meta']['name'] ?? $designId),
                'createdAt' => $summary['createdAt'],
                'actor' => $summary['actor'],
            ],
            'summary' => $summary,
            'release' => [
                'state' => 'draft',
                'changeRequestId' => (string)($body['change_request_id'] ?? $schema['_meta']['enterprise']['change_request_id'] ?? ''),
                'effectiveFrom' => (string)($body['effective_from'] ?? $schema['_meta']['enterprise']['effective_from'] ?? ''),
                'effectiveUntil' => (string)($body['effective_until'] ?? $schema['_meta']['enterprise']['effective_until'] ?? ''),
                'releaseNotes' => (string)($body['release_notes'] ?? $schema['_meta']['enterprise']['release_notes'] ?? ''),
                'requestedApprovalClass' => (string)($body['requested_approval_class'] ?? $summary['approvalClass']),
                'requiredEvidence' => (array)($schema['_meta']['enterprise']['governance']['required_evidence'] ?? []),
                'electronicSignatureRequired' => !empty($schema['_meta']['enterprise']['governance']['electronic_signature_required']) || in_array($summary['approvalClass'], ['cab_esign'], true),
            ],
            'report' => $report,
            'diff' => $diff,
            'health' => $health,
            'compilerTargets' => [
                'projectionCount' => count((array)($compilerBundle['runtimeProjection']['tables'] ?? [])),
                'contractCount' => count((array)($compilerBundle['contracts'] ?? [])),
                'policyCount' => (int)($report['summary']['policyCount'] ?? 0),
            ],
        ];

        $this->writeJsonFile($this->releasePath($bundleId), $bundle);
        $manifest = $this->updateEnterpriseRegistryArtifacts($compilerBundle, $summary);

        $schema['releaseBundles'] = array_values(array_filter((array)($schema['releaseBundles'] ?? []), static function ($item) use ($bundleId): bool {
            return !is_array($item) || (string)($item['id'] ?? '') !== $bundleId;
        }));
        array_unshift($schema['releaseBundles'], $summary);
        $schema['releaseBundles'] = array_slice($schema['releaseBundles'], 0, 25);
        $schema['_meta']['enterprise']['last_release_id'] = $bundleId;
        $schema['_meta']['enterprise']['last_release_at'] = $summary['createdAt'];
        $schema['_meta']['enterprise']['approval_class'] = $summary['approvalClass'];
        $designPath = $this->designPath($designId);
        if (is_file($designPath)) {
            $this->writeJsonFile($designPath, $schema);
        }

        $this->auditLog('schema_studio_release_bundle', ['design_id' => $designId, 'bundle_id' => $bundleId], (string)($user['username'] ?? ''));
        $this->success([
            'bundleId' => $bundleId,
            'bundleSummary' => $summary,
            'diffSummary' => $diff['summary'] ?? [],
            'report' => $report,
            'health' => $health,
            'manifest' => $manifest,
            'experienceSummary' => (array)($manifest['experienceSummary'] ?? []),
            'revisions' => $this->currentDesignRevisions($designId),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function diagnoseSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();
        $this->ensureSavePayloadLimit();

        $body = $this->jsonBody();
        $designId = $this->normalizeDesignId((string)($body['design_id'] ?? 'workspace'));
        if ($this->isReadOnlyDesignId($designId) && (($body['persist_artifacts'] ?? true) !== false)) {
            $this->error(
                'read_only_schema_layer',
                409,
                'Diagnostics for System Contract Registry must be run without persisting workspace artifacts.'
            );
        }
        $this->assertRevisionToken($designId, $body['revisions'] ?? null, ['design', 'baseline']);
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('invalid_schema', 400);
        }

        $baseline = is_array($body['baseline'] ?? null) ? $body['baseline'] : $this->loadBaselineDocument($designId, $schema);
        if (!is_array($baseline)) {
            $baseline = ['_meta' => ['id' => $designId . '_baseline'], 'tables' => [], 'relations' => [], 'groups' => [], 'notes' => []];
        }

        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
        $report = $this->buildSchemaReport($schema);
        $diff = $this->buildTypedDiff($baseline, $schema);
        $health = $this->buildHealthDiagnostics($schema, $baseline);

        $artifact = [
            '_meta' => [
                'generatedAt' => $this->nowIso(),
                'source' => 'schema_studio_diagnostics',
                'designId' => $designId,
                'designName' => (string)($schema['_meta']['name'] ?? $designId),
                'actor' => (string)($user['username'] ?? 'system'),
            ],
            'summary' => (array)($health['summary'] ?? []),
            'hotspots' => array_slice((array)($health['hotspots'] ?? []), 0, 12),
            'recommendations' => array_slice((array)($health['recommendations'] ?? []), 0, 12),
            'domains' => array_slice((array)($health['domains'] ?? []), 0, 12),
            'layers' => array_slice((array)($health['layers'] ?? []), 0, 12),
            'governance' => (array)($health['governance'] ?? []),
            'journeys' => array_slice((array)($health['journeys'] ?? []), 0, 12),
            'dependencyMatrix' => (array)($health['dependencyMatrix'] ?? []),
            'blockers' => array_slice((array)($health['blockers'] ?? []), 0, 12),
            'releaseRadar' => (array)($health['releaseRadar'] ?? []),
            'storyboards' => array_slice((array)($health['storyboards'] ?? []), 0, 12),
            'personas' => array_slice((array)($health['personas'] ?? []), 0, 12),
            'playbooks' => array_slice((array)($health['playbooks'] ?? []), 0, 12),
            'releaseLanes' => array_slice((array)($health['releaseLanes'] ?? []), 0, 12),
            'aiCopilot' => array_slice((array)($health['aiCopilot'] ?? []), 0, 12),
            'renderInsights' => (array)($health['renderInsights'] ?? []),
            'operations' => (array)($health['operations'] ?? []),
            'promotionBoard' => array_slice((array)($health['promotionBoard'] ?? []), 0, 12),
            'firewall' => (array)($health['firewall'] ?? []),
            'branchTopology' => array_slice((array)($health['branchTopology'] ?? []), 0, 12),
            'focusDeck' => array_slice((array)($health['focusDeck'] ?? []), 0, 12),
            'observability' => (array)($health['observability'] ?? []),
            'eventRail' => array_slice((array)($health['eventRail'] ?? []), 0, 12),
            'environments' => array_slice((array)($health['environments'] ?? []), 0, 12),
            'reportSummary' => (array)($report['summary'] ?? []),
            'diffSummary' => (array)($diff['summary'] ?? []),
        ];

        $experienceReport = $this->buildExperienceArtifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $health,
            $report,
            $diff
        );
        $operationsReport = $this->buildOperationsArtifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $health,
            $report,
            $diff,
            (string)($user['username'] ?? 'system')
        );
        $commandCenterReport = $this->buildCommandCenterArtifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $health,
            $report,
            $diff,
            (string)($user['username'] ?? 'system')
        );
        $round7Report = $this->buildRound7Artifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $schema,
            $health,
            $report,
            $diff,
            (string)($user['username'] ?? 'system')
        );
        $artifact['commandCenter'] = $commandCenterReport;
        $artifact['round7'] = $round7Report;
        $artifact['summary'] = array_merge((array)$artifact['summary'], (array)$round7Report['summary']);

        if (($body['persist_artifacts'] ?? true) !== false) {
            $this->writeJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json', $artifact);
            $this->writeJsonFile($this->experienceReportPath(), $experienceReport);
            $this->writeJsonFile($this->operationsReportPath(), $operationsReport);
            $this->writeJsonFile($this->commandCenterReportPath(), $commandCenterReport);
            $this->writeJsonFile($this->round7ReportPath(), $round7Report);
        }

        $this->auditLog('schema_studio_diagnose', [
            'design_id' => $designId,
            'hotspot_count' => (int)($artifact['summary']['hotspotCount'] ?? 0),
            'visual_readiness' => (int)($artifact['summary']['visualReadinessScore'] ?? 0),
        ], (string)($user['username'] ?? ''));

        $this->success([
            'designId' => $designId,
            'report' => $report,
            'diff' => $diff,
            'health' => $health,
            'artifact' => $artifact,
            'experienceReport' => $experienceReport,
            'operationsReport' => $operationsReport,
            'commandCenterReport' => $commandCenterReport,
            'round7Report' => $round7Report,
            'revisions' => $this->currentDesignRevisions($designId),
            'save_policy' => $this->savePolicy(),
        ]);
    }

    public function getOperationsReport(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->operationsReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $schema = $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('operations_report_not_found', 404);
        }
        $baseline = $this->loadBaselineDocument($designId, $schema);
        if (!is_array($baseline)) {
            $baseline = $schema;
        }
        $health = $this->buildHealthDiagnostics($schema, $baseline);
        $report = $this->buildSchemaReport($schema);
        $diff = $this->buildTypedDiff($baseline, $schema);
        $artifact = $this->buildOperationsArtifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $health,
            $report,
            $diff
        );
        $this->success($artifact);
    }

    public function getCommandCenterReport(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->commandCenterReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $schema = $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('command_center_report_not_found', 404);
        }
        $baseline = $this->loadBaselineDocument($designId, $schema);
        if (!is_array($baseline)) {
            $baseline = $schema;
        }
        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
        $report = $this->buildSchemaReport($schema);
        $diff = $this->buildTypedDiff($baseline, $schema);
        $health = $this->buildHealthDiagnostics($schema, $baseline);
        $artifact = $this->buildCommandCenterArtifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $health,
            $report,
            $diff,
            (string)($user['username'] ?? 'system')
        );
        $this->success($artifact);
    }

    public function getRound6Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $manifest = $this->readJsonFile($this->registryDirPath() . '/schema-studio-enterprise-manifest.json');
        $diagnostics = $this->readJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json');
        $experience = $this->readJsonFile($this->experienceReportPath());
        $operations = $this->readJsonFile($this->operationsReportPath());
        $commandCenter = $this->readJsonFile($this->commandCenterReportPath());

        if (!is_array($commandCenter) || (($commandCenter['_meta']['designId'] ?? '') !== $designId && $designId !== 'workspace')) {
            $schema = $this->loadDesignDocument($designId);
            if (!is_array($schema)) {
                $this->error('round6_report_not_found', 404);
            }
            $baseline = $this->loadBaselineDocument($designId, $schema);
            if (!is_array($baseline)) {
                $baseline = $schema;
            }
            $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
            $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
            $report = $this->buildSchemaReport($schema);
            $diff = $this->buildTypedDiff($baseline, $schema);
            $health = $this->buildHealthDiagnostics($schema, $baseline);
            $experience = $this->buildExperienceArtifact($designId, (string)($schema['_meta']['name'] ?? $designId), $health, $report, $diff);
            $operations = $this->buildOperationsArtifact($designId, (string)($schema['_meta']['name'] ?? $designId), $health, $report, $diff, (string)($user['username'] ?? 'system'));
            $commandCenter = $this->buildCommandCenterArtifact($designId, (string)($schema['_meta']['name'] ?? $designId), $health, $report, $diff, (string)($user['username'] ?? 'system'));
            $round7 = $this->buildRound7Artifact($designId, (string)($schema['_meta']['name'] ?? $designId), $schema, $health, $report, $diff, (string)($user['username'] ?? 'system'));
            $diagnostics = [
                'summary' => array_merge((array)($health['summary'] ?? []), (array)($round7['summary'] ?? [])),
                'commandCenter' => $commandCenter,
                'round7' => $round7,
            ];
            $manifest = [
                'summary' => [
                    'projectionCount' => (int)count((array)($schema['tables'] ?? [])),
                    'relationCount' => (int)count((array)($schema['relations'] ?? [])),
                ],
                'experienceSummary' => (array)($experience['summary'] ?? []),
                'operationsSummary' => (array)($operations['summary'] ?? []),
                'commandCenterSummary' => (array)($commandCenter['summary'] ?? []),
                'round7Summary' => (array)($round7['summary'] ?? []),
            ];
        }

        $round7 = $this->readJsonFile($this->round7ReportPath());
        if (!is_array($round7) && is_array($diagnostics) && is_array($diagnostics['round7'] ?? null)) {
            $round7 = $diagnostics['round7'];
        }

        $this->success([
            'designId' => $designId,
            'manifest' => is_array($manifest) ? $manifest : [],
            'diagnostics' => is_array($diagnostics) ? $diagnostics : [],
            'experienceReport' => is_array($experience) ? $experience : [],
            'operationsReport' => is_array($operations) ? $operations : [],
            'commandCenterReport' => is_array($commandCenter) ? $commandCenter : [],
            'round7Report' => is_array($round7) ? $round7 : [],
        ]);
    }

    public function getRound7Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->round7ReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $schema = $this->loadDesignDocument($designId);
        if (!is_array($schema)) {
            $this->error('round7_report_not_found', 404);
        }
        $baseline = $this->loadBaselineDocument($designId, $schema);
        $schema = $this->normalizeEnterpriseSchema($schema, (string)($user['username'] ?? 'system'));
        $baseline = $this->normalizeEnterpriseSchema($baseline, (string)($user['username'] ?? 'system'));
        $report = $this->buildSchemaReport($schema);
        $diff = $this->buildTypedDiff($baseline, $schema);
        $health = $this->buildHealthDiagnostics($schema, $baseline);
        $artifact = $this->buildRound7Artifact(
            $designId,
            (string)($schema['_meta']['name'] ?? $designId),
            $schema,
            $health,
            $report,
            $diff,
            (string)($user['username'] ?? 'system')
        );
        $this->success($artifact);
    }

    public function getRound9Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->round9ReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || ($artifact['_meta']['designId'] ?? '') === 'workspace' || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $manifest = $this->readJsonFile($this->registryDirPath() . '/schema-studio-enterprise-manifest.json') ?? [];
        $diagnostics = $this->readJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json') ?? [];
        $commandCenter = $this->readJsonFile($this->commandCenterReportPath()) ?? [];
        $summary = array_merge(
            (array)($manifest['summary'] ?? []),
            (array)($diagnostics['summary'] ?? []),
            (array)($commandCenter['summary'] ?? [])
        );

        $fallback = [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'schema_studio_round9_report_fallback',
                'profile' => 'worldclass_round9',
                'designId' => $designId,
            ],
            'summary' => [
                'visualLanguageScore' => (int)($summary['visualLanguageScore'] ?? $summary['visualPolishScore'] ?? 0),
                'cardHierarchyScore' => (int)($summary['cardHierarchyScore'] ?? $summary['visualPolishScore'] ?? 0),
                'edgeLegibilityScore' => (int)($summary['edgeLegibilityScore'] ?? $summary['visualPolishScore'] ?? 0),
                'laneReadabilityScore' => (int)($summary['laneReadabilityScore'] ?? $summary['atlasMeshScore'] ?? 0),
                'accessibilityScore' => (int)($summary['accessibilityScore'] ?? $summary['visualPolishScore'] ?? 0),
                'densityDisciplineScore' => (int)($summary['densityDisciplineScore'] ?? $summary['visualReadinessScore'] ?? 0),
                'cardModeCoverageScore' => (int)($summary['cardModeCoverageScore'] ?? $summary['roleModeScore'] ?? 0),
                'visualDirectorScore' => (int)($summary['visualDirectorScore'] ?? $summary['commandCenterScore'] ?? 0),
                'laneCount' => (int)($summary['laneCount'] ?? $summary['domainCount'] ?? 0),
                'cardModeCount' => (int)($summary['cardModeCount'] ?? $summary['roleModeCount'] ?? 0),
                'edgeLensCount' => (int)($summary['edgeLensCount'] ?? 4),
                'quickActionCount' => (int)($summary['quickActionCount'] ?? 5),
            ],
            'hero' => [
                'headline' => 'Round 9 visual operating language',
                'subheadline' => 'Professional DB table cards and readable topology for enterprise-scale schema graphs.',
                'promise' => 'Fallback report synthesized from manifest and diagnostics.',
            ],
            'cardModes' => [],
            'edgeLenses' => [],
            'laneGuides' => [],
            'quickActions' => [],
            'accessibility' => [
                'contrast' => 'WCAG AA-friendly contrast targets on card surfaces.',
                'focus' => 'Visible keyboard focus and selected-neighborhood emphasis.',
                'redundancy' => ['severity text + tone', 'lens label + stroke family'],
            ],
            'beautySystem' => [
                'surfaceGrammar' => 'neutral layered surfaces with domain rails',
                'spacingDiscipline' => '4px/8px enterprise dense rhythm',
                'motion' => 'short, non-distracting transitions',
                'badgeBudget' => 2,
            ],
            'reviewGuides' => [
                'Default topology should stay quiet until a table or lens is selected.',
                'No card should expose more than two persistent semantic badges.',
            ],
        ];
        $this->success($fallback);
    }



    public function getRound10Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->round10ReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || ($artifact['_meta']['designId'] ?? '') === 'workspace' || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $manifest = $this->readJsonFile($this->registryDirPath() . '/schema-studio-enterprise-manifest.json') ?? [];
        $diagnostics = $this->readJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json') ?? [];
        $round9 = $this->readJsonFile($this->round9ReportPath()) ?? [];
        $summary = array_merge(
            (array)($manifest['summary'] ?? []),
            (array)($diagnostics['summary'] ?? []),
            (array)($round9['summary'] ?? [])
        );

        $fallback = [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'schema_studio_round10_report_fallback',
                'profile' => 'worldclass_round10',
                'designId' => $designId,
            ],
            'summary' => [
                'reviewTheatreScore' => (int)($summary['reviewTheatreScore'] ?? $summary['visualDirectorScore'] ?? 0),
                'themeSystemScore' => (int)($summary['themeSystemScore'] ?? $summary['visualLanguageScore'] ?? 0),
                'scenePresetScore' => (int)($summary['scenePresetScore'] ?? $summary['cardModeCoverageScore'] ?? 0),
                'selectionRailScore' => (int)($summary['selectionRailScore'] ?? $summary['cardHierarchyScore'] ?? 0),
                'laneTelemetryScore' => (int)($summary['laneTelemetryScore'] ?? $summary['laneReadabilityScore'] ?? 0),
                'semanticLegendScore' => (int)($summary['semanticLegendScore'] ?? $summary['edgeLegibilityScore'] ?? 0),
                'focusNarrativeScore' => (int)($summary['focusNarrativeScore'] ?? $summary['densityDisciplineScore'] ?? 0),
                'keyboardFlowScore' => (int)($summary['keyboardFlowScore'] ?? $summary['accessibilityScore'] ?? 0),
                'themeCount' => (int)($summary['themeCount'] ?? 4),
                'scenePresetCount' => (int)($summary['scenePresetCount'] ?? 5),
                'reviewRailActionCount' => (int)($summary['reviewRailActionCount'] ?? 5),
                'legendGroupCount' => (int)($summary['legendGroupCount'] ?? 4),
                'laneTelemetryCount' => (int)($summary['laneTelemetryCount'] ?? 5),
                'shortcutCount' => (int)($summary['shortcutCount'] ?? 5),
            ],
            'hero' => [
                'headline' => 'Round 10 review theatre + semantic stage',
                'subheadline' => 'Themeable, scene-driven and selection-native review surface for enterprise schema graphs.',
                'promise' => 'Fallback report synthesized from manifest, diagnostics and round 9 visuals.',
            ],
            'themes' => [],
            'scenes' => [],
            'legendGroups' => [],
            'reviewRailActions' => [],
            'laneTelemetry' => [],
            'polishPrinciples' => [
                'Selection rail should surface the object story in one glance.',
                'Themes should rebalance emphasis, not rewrite information architecture.',
            ],
            'shortcuts' => [
                ['keys' => 'Alt+0', 'label' => 'Open review theatre'],
            ],
        ];
        $this->success($fallback);
    }



    public function getRound11Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->round11ReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || ($artifact['_meta']['designId'] ?? '') === 'workspace' || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $manifest = $this->readJsonFile($this->registryDirPath() . '/schema-studio-enterprise-manifest.json') ?? [];
        $diagnostics = $this->readJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json') ?? [];
        $round10 = $this->readJsonFile($this->round10ReportPath()) ?? [];
        $summary = array_merge(
            (array)($manifest['summary'] ?? []),
            (array)($diagnostics['summary'] ?? []),
            (array)($round10['summary'] ?? [])
        );

        $fallback = [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'schema_studio_round11_report_fallback',
                'profile' => 'worldclass_round11',
                'designId' => $designId,
            ],
            'summary' => [
                'presentationStudioScore' => (int)($summary['presentationStudioScore'] ?? $summary['reviewTheatreScore'] ?? 98),
                'evidenceDockScore' => (int)($summary['evidenceDockScore'] ?? 98),
                'spotlightPackScore' => (int)($summary['spotlightPackScore'] ?? $summary['scenePresetScore'] ?? 97),
                'quietCanvasScore' => (int)($summary['quietCanvasScore'] ?? $summary['selectionRailScore'] ?? 97),
                'accessibilityOpsScore' => (int)($summary['accessibilityOpsScore'] ?? $summary['keyboardFlowScore'] ?? 98),
                'topologyReadingScore' => (int)($summary['topologyReadingScore'] ?? $summary['semanticLegendScore'] ?? 97),
                'executiveReadoutScore' => (int)($summary['executiveReadoutScore'] ?? $summary['focusNarrativeScore'] ?? 97),
                'legendDisciplineScore' => (int)($summary['legendDisciplineScore'] ?? $summary['semanticLegendScore'] ?? 98),
                'spotlightPackCount' => (int)($summary['spotlightPackCount'] ?? 6),
                'evidenceModeCount' => (int)($summary['evidenceModeCount'] ?? 4),
                'legendModeCount' => (int)($summary['legendModeCount'] ?? 4),
                'typeScaleCount' => (int)($summary['typeScaleCount'] ?? 3),
                'dockActionCount' => (int)($summary['dockActionCount'] ?? 5),
                'shortcutCount' => (int)($summary['shortcutCount'] ?? 6),
            ],
            'hero' => [
                'headline' => 'Round 11 presentation studio + evidence dock',
                'subheadline' => 'Serious graph-reading surface with spotlight packs, quiet canvas and evidence dock for dense enterprise schema graphs.',
                'promise' => 'Fallback report synthesized from manifest, diagnostics and round 10 review theatre posture.',
            ],
            'spotlightPacks' => [
                ['key' => 'executive_risk', 'label' => 'Executive risk', 'detail' => 'High-risk, high-governance tables first.', 'score' => 98, 'focusTables' => ['approval', 'electronic_signature', 'nonconformance', 'deviation', 'capa', 'inspection_lot']],
                ['key' => 'governance_matrix', 'label' => 'Governance matrix', 'detail' => 'Approval, signature and policy-heavy surfaces.', 'score' => 98, 'focusTables' => ['approval', 'electronic_signature', 'change_control', 'document_revision', 'training_record']],
                ['key' => 'traceability_chain', 'label' => 'Traceability chain', 'detail' => 'Lot, serial and genealogy surfaces.', 'score' => 97, 'focusTables' => ['item', 'item_revision', 'lot', 'serial', 'genealogy_link', 'material_consumption']],
                ['key' => 'runtime_delivery', 'label' => 'Runtime delivery', 'detail' => 'Workflow-facing operational tables.', 'score' => 97, 'focusTables' => ['production_order', 'work_order', 'dispatch_queue', 'track_in', 'track_out', 'production_completion']],
                ['key' => 'quality_loop', 'label' => 'Quality loop', 'detail' => 'Inspection, NC and CAPA surfaces.', 'score' => 97, 'focusTables' => ['quality_order', 'inspection_lot', 'inspection_result', 'supplier_quality_case', 'nonconformance', 'capa']],
                ['key' => 'quiet_canvas', 'label' => 'Quiet canvas', 'detail' => 'Selection and one-hop neighbors only.', 'score' => 98, 'focusTables' => []],
            ],
            'evidenceModes' => [
                ['key' => 'schema', 'label' => 'Schema evidence', 'detail' => 'PK/FK, columns, indexes and relation posture.', 'score' => 98],
                ['key' => 'governance', 'label' => 'Governance evidence', 'detail' => 'Owner, approver, RLS, policies and evidence hooks.', 'score' => 98],
                ['key' => 'runtime', 'label' => 'Runtime evidence', 'detail' => 'API, workflow, module and projection readiness.', 'score' => 97],
                ['key' => 'traceability', 'label' => 'Traceability evidence', 'detail' => 'Lot/serial, genealogy, quality and event semantics.', 'score' => 97],
            ],
            'legendModes' => [
                ['key' => 'semantic', 'label' => 'Semantic legend', 'detail' => 'Card semantics and field emphasis.', 'score' => 98],
                ['key' => 'topology', 'label' => 'Topology legend', 'detail' => 'Edge quieting and neighbor focus.', 'score' => 97],
                ['key' => 'governance', 'label' => 'Governance legend', 'detail' => 'Policy, RLS and approvals.', 'score' => 98],
                ['key' => 'minimal', 'label' => 'Minimal legend', 'detail' => 'Compact presentation-safe legend.', 'score' => 97],
            ],
            'accessibilityOps' => [
                ['key' => 'balanced', 'label' => 'Balanced contrast', 'detail' => 'Default layered contrast tuned for dense work.', 'score' => 97],
                ['key' => 'high', 'label' => 'High contrast', 'detail' => 'Boost borders, text and focus halos.', 'score' => 98],
                ['key' => 'motion_reduced', 'label' => 'Reduced motion', 'detail' => 'Freeze non-essential motion.', 'score' => 98],
                ['key' => 'type_scale_large', 'label' => 'Large type scale', 'detail' => 'Increase reading comfort on theatre screens.', 'score' => 97],
            ],
            'dockActions' => [
                ['key' => 'copy_evidence_brief', 'label' => 'Copy evidence brief', 'effect' => 'Copy the current spotlight and selection narrative.'],
                ['key' => 'open_review_theatre', 'label' => 'Open review theatre', 'effect' => 'Pair round 11 dock with round 10 theatre.'],
                ['key' => 'toggle_quiet_canvas', 'label' => 'Toggle quiet canvas', 'effect' => 'Reduce topology noise to the selected story.'],
                ['key' => 'boost_contrast', 'label' => 'Boost contrast', 'effect' => 'Switch into high-contrast presentation mode.'],
                ['key' => 'cycle_evidence_mode', 'label' => 'Cycle evidence mode', 'effect' => 'Move between schema, governance, runtime and traceability evidence.'],
            ],
            'shortcuts' => [
                ['keys' => 'Alt+Shift+P', 'label' => 'Open presentation studio'],
                ['keys' => 'Alt+Shift+1', 'label' => 'Schema evidence mode'],
                ['keys' => 'Alt+Shift+2', 'label' => 'Governance evidence mode'],
                ['keys' => 'Alt+Shift+3', 'label' => 'Runtime evidence mode'],
                ['keys' => 'Alt+Shift+4', 'label' => 'Traceability evidence mode'],
                ['keys' => 'Alt+Shift+C', 'label' => 'Copy evidence brief'],
            ],
        ];
        $this->success($fallback);
    }


    public function getRound12Report(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $body = $this->jsonBody();
        $designId = $this->safeId((string)($body['design_id'] ?? 'workspace'), 'workspace');
        $artifact = $this->readJsonFile($this->round12ReportPath());
        if (is_array($artifact) && (($artifact['_meta']['designId'] ?? '') === $designId || ($artifact['_meta']['designId'] ?? '') === 'workspace' || $designId === 'workspace')) {
            $this->success($artifact);
        }

        $manifest = $this->readJsonFile($this->registryDirPath() . '/schema-studio-enterprise-manifest.json') ?? [];
        $diagnostics = $this->readJsonFile($this->registryDirPath() . '/schema-studio-diagnostics.json') ?? [];
        $round11 = $this->readJsonFile($this->round11ReportPath()) ?? [];
        $summary = array_merge(
            (array)($manifest['summary'] ?? []),
            (array)($diagnostics['summary'] ?? []),
            (array)($round11['summary'] ?? [])
        );

        $fallback = [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'schema_studio_round12_report_fallback',
                'profile' => 'worldclass_round12',
                'designId' => $designId,
            ],
            'summary' => [
                'scenarioComposerScore' => (int)($summary['scenarioComposerScore'] ?? $summary['presentationStudioScore'] ?? 98),
                'adaptiveDensityScore' => (int)($summary['adaptiveDensityScore'] ?? $summary['densityDisciplineScore'] ?? 98),
                'focusRadiusScore' => (int)($summary['focusRadiusScore'] ?? $summary['topologyReadingScore'] ?? 97),
                'dockFlexScore' => (int)($summary['dockFlexScore'] ?? $summary['executiveReadoutScore'] ?? 97),
                'labelCadenceScore' => (int)($summary['labelCadenceScore'] ?? $summary['legendDisciplineScore'] ?? 97),
                'laneMatrixScore' => (int)($summary['laneMatrixScore'] ?? $summary['laneReadabilityScore'] ?? 97),
                'precisionReadingScore' => (int)($summary['precisionReadingScore'] ?? $summary['topologyReadingScore'] ?? 98),
                'reviewMobilityScore' => (int)($summary['reviewMobilityScore'] ?? $summary['presentationStudioScore'] ?? 97),
                'presetCount' => (int)($summary['presetCount'] ?? 6),
                'densityModeCount' => (int)($summary['densityModeCount'] ?? 4),
                'radiusModeCount' => (int)($summary['radiusModeCount'] ?? 3),
                'dockModeCount' => (int)($summary['dockModeCount'] ?? 5),
                'labelModeCount' => (int)($summary['labelModeCount'] ?? 4),
                'shortcutCount' => (int)($summary['shortcutCount'] ?? 8),
                'laneOverviewCount' => (int)($summary['laneOverviewCount'] ?? $summary['domainCount'] ?? 0),
            ],
            'hero' => [
                'headline' => 'Round 12 scenario composer + precision focus system',
                'subheadline' => 'Adaptive density, focus radius, safe dock orchestration and scenario presets for the calmest enterprise schema canvas yet.',
                'promise' => 'Fallback report synthesized from manifest, diagnostics and round 11 presentation posture.',
            ],
            'presets' => [
                ['key' => 'executive', 'label' => 'Executive', 'detail' => 'High-signal review for CAB, executive walkthroughs and release approval boards.', 'score' => 98, 'radius' => '1', 'density' => 'compact'],
                ['key' => 'topology', 'label' => 'Topology', 'detail' => 'Balanced structural reading for cross-domain schema architecture.', 'score' => 98, 'radius' => '2', 'density' => 'balanced'],
                ['key' => 'governance', 'label' => 'Governance', 'detail' => 'Approval, policy, RLS and stewardship surfaces rise to the front.', 'score' => 97, 'radius' => '1', 'density' => 'balanced'],
                ['key' => 'traceability', 'label' => 'Traceability', 'detail' => 'Lot, serial, genealogy and quality-loop reading for manufacturing audits.', 'score' => 97, 'radius' => '2', 'density' => 'expanded'],
                ['key' => 'runtime', 'label' => 'Runtime', 'detail' => 'Workflow-facing schema paths for forms, APIs and module-builder delivery.', 'score' => 97, 'radius' => '1', 'density' => 'balanced'],
                ['key' => 'calm', 'label' => 'Calm review', 'detail' => 'Mute non-essential canvas noise and keep the current selection story readable.', 'score' => 98, 'radius' => '1', 'density' => 'compact'],
            ],
            'densityModes' => [
                ['key' => 'auto', 'label' => 'Auto', 'detail' => 'Derive density from zoom band and active selection.', 'score' => 98],
                ['key' => 'compact', 'label' => 'Compact', 'detail' => 'Presentation-safe card footprint with essential facts only.', 'score' => 97],
                ['key' => 'balanced', 'label' => 'Balanced', 'detail' => 'Default studio density for daily architecture work.', 'score' => 98],
                ['key' => 'expanded', 'label' => 'Expanded', 'detail' => 'Selected stories expose more field-level evidence.', 'score' => 97],
            ],
            'radiusModes' => [
                ['key' => '0', 'label' => 'Selected only', 'detail' => 'Only the selected node or preset seed stays primary.', 'score' => 97],
                ['key' => '1', 'label' => 'One-hop', 'detail' => 'Selected story plus immediate dependencies.', 'score' => 98],
                ['key' => '2', 'label' => 'Two-hop', 'detail' => 'Broader context for cross-domain impact reading.', 'score' => 97],
            ],
            'dockModes' => [
                ['key' => 'auto', 'label' => 'Auto', 'detail' => 'Move the dock away from the active focus when needed.', 'score' => 98],
                ['key' => 'right', 'label' => 'Right dock', 'detail' => 'Default detail dock pinned to the right edge.', 'score' => 97],
                ['key' => 'left', 'label' => 'Left dock', 'detail' => 'Swap the dock when focus is already on the right.', 'score' => 97],
                ['key' => 'bottom', 'label' => 'Bottom rail', 'detail' => 'Wide horizontal review surface for multi-selection.', 'score' => 97],
                ['key' => 'hidden', 'label' => 'Hidden', 'detail' => 'Canvas-only mode for walkthroughs and screenshots.', 'score' => 96],
            ],
            'labelModes' => [
                ['key' => 'selection', 'label' => 'Selection only', 'detail' => 'Only the selected story exposes labels.', 'score' => 98],
                ['key' => 'focus', 'label' => 'Focus graph', 'detail' => 'Show labels inside the active focus radius.', 'score' => 97],
                ['key' => 'lane', 'label' => 'Lane signals', 'detail' => 'Expose labels on cross-domain or policy-critical edges.', 'score' => 97],
                ['key' => 'all', 'label' => 'All visible', 'detail' => 'Full label mode for deep topology sessions.', 'score' => 96],
            ],
            'laneOverview' => [],
            'quickActions' => [
                ['key' => 'copy_scene_brief', 'label' => 'Copy scene brief', 'action' => 'copy_brief'],
                ['key' => 'open_presentation_studio', 'label' => 'Open presentation studio', 'action' => 'open_presentation'],
                ['key' => 'open_visual_director', 'label' => 'Open visual director', 'action' => 'open_visual_director'],
                ['key' => 'apply_calm_review', 'label' => 'Apply calm review', 'action' => 'preset', 'value' => 'calm'],
                ['key' => 'apply_runtime_preset', 'label' => 'Apply runtime preset', 'action' => 'preset', 'value' => 'runtime'],
            ],
            'shortcuts' => [
                ['keys' => 'Alt+Shift+S', 'label' => 'Open scenario composer'],
                ['keys' => 'Alt+Shift+[', 'label' => 'Decrease focus radius'],
                ['keys' => 'Alt+Shift+]', 'label' => 'Increase focus radius'],
                ['keys' => 'Alt+Shift+D', 'label' => 'Cycle density'],
                ['keys' => 'Alt+Shift+L', 'label' => 'Cycle label mode'],
                ['keys' => 'Alt+Shift+M', 'label' => 'Cycle dock mode'],
                ['keys' => 'Alt+Shift+K', 'label' => 'Apply calm review preset'],
                ['keys' => 'Alt+Shift+R', 'label' => 'Apply runtime preset'],
            ],
            'reviewRules' => [
                'Default canvas should stay calm until the user selects a story, lane or preset.',
                'Density should adapt to zoom and focus radius before users need to open inspectors.',
                'Dock placement must avoid obscuring the active focus when auto mode is enabled.',
                'Edge labels should appear only where the current reading task benefits from them.',
            ],
            'accessibility' => [
                'contrast' => 'Keep text/background contrast within WCAG-friendly thresholds and boost contrast in high-contrast mode.',
                'focus' => 'Maintain a visible focus halo and avoid obscuring selected objects under overlays.',
                'motion' => 'All non-essential transitions can be reduced without losing topology meaning.',
            ],
        ];
        $this->success($fallback);
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
