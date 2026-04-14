<?php
declare(strict_types=1);

namespace MOM\Api\Services;

final class CanonicalManufacturingSpineService
{
    /** @var array<string, int> */
    private array $metrics = [
        'model_probe' => 0,
        'validation_failure' => 0,
    ];

    /** @var array<string, mixed>|null */
    private ?array $tableRegistry = null;

    public function __construct(
        private readonly string $baseDir,
        ?array $tableRegistry = null,
    ) {
        $this->tableRegistry = $tableRegistry;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function definitions(): array
    {
        return [
            'org_company' => [
                'label' => 'Organization company',
                'canonical_table' => 'org_company',
                'canonical_key_fields' => ['company_code'],
                'record_id_field' => 'company_id',
                'org_scope_fields' => ['enterprise_id'],
                'source_authority' => self::authority('foundation_governance', 'MOM canonical foundation', 'canonical_owner'),
                'relations' => [
                    ['field' => 'enterprise_id', 'target_table' => 'org_enterprise', 'target_field' => 'enterprise_id', 'relationship' => 'belongs_to_enterprise'],
                ],
            ],
            'legal_entity' => [
                'label' => 'Legal entity',
                'canonical_table' => 'org_legal_entities',
                'canonical_key_fields' => ['legal_entity_code'],
                'record_id_field' => 'legal_entity_code',
                'org_scope_fields' => ['company_code'],
                'source_authority' => self::authority('enterprise_governance', 'MOM governance uplift', 'canonical_owner'),
                'relations' => [
                    ['field' => 'company_code', 'target_table' => 'org_companies', 'target_field' => 'company_code', 'relationship' => 'belongs_to_company_code'],
                ],
            ],
            'site' => [
                'label' => 'Manufacturing site',
                'canonical_table' => 'org_site',
                'canonical_key_fields' => ['site_code'],
                'record_id_field' => 'site_id',
                'org_scope_fields' => ['company_id'],
                'source_authority' => self::authority('foundation_governance', 'MOM canonical foundation', 'canonical_owner'),
                'relations' => [
                    ['field' => 'company_id', 'target_table' => 'org_company', 'target_field' => 'company_id', 'relationship' => 'belongs_to_company'],
                ],
            ],
            'plant' => [
                'label' => 'Manufacturing plant',
                'canonical_table' => 'org_plant',
                'canonical_key_fields' => ['plant_code'],
                'record_id_field' => 'plant_id',
                'org_scope_fields' => ['site_id'],
                'source_authority' => self::authority('foundation_governance', 'MOM canonical foundation', 'canonical_owner'),
                'relations' => [
                    ['field' => 'site_id', 'target_table' => 'org_site', 'target_field' => 'site_id', 'relationship' => 'belongs_to_site'],
                ],
            ],
            'work_center' => [
                'label' => 'Work center',
                'canonical_table' => 'org_work_center',
                'canonical_key_fields' => ['work_center_code'],
                'record_id_field' => 'work_center_id',
                'org_scope_fields' => ['plant_id'],
                'source_authority' => self::authority('foundation_governance', 'MOM canonical foundation', 'canonical_owner'),
                'relations' => [
                    ['field' => 'plant_id', 'target_table' => 'org_plant', 'target_field' => 'plant_id', 'relationship' => 'belongs_to_plant'],
                ],
            ],
            'line_or_cell' => [
                'label' => 'Line or cell work unit',
                'canonical_table' => 'org_work_unit',
                'canonical_key_fields' => ['work_unit_code'],
                'record_id_field' => 'work_unit_id',
                'org_scope_fields' => ['work_center_id'],
                'source_authority' => self::authority('foundation_governance', 'MOM canonical foundation', 'canonical_owner'),
                'relations' => [
                    ['field' => 'work_center_id', 'target_table' => 'org_work_center', 'target_field' => 'work_center_id', 'relationship' => 'belongs_to_work_center'],
                ],
            ],
            'equipment_machine' => [
                'label' => 'Equipment or machine',
                'canonical_table' => 'mes_equipment_extended',
                'canonical_key_fields' => ['equipment_id'],
                'record_id_field' => 'equipment_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('mes_execution', 'equipment master plus MES equipment extension', 'authority_partial'),
                'relations' => [
                    ['field' => 'equipment_id', 'target_table' => 'equipment', 'target_field' => 'equipment_id', 'relationship' => 'extends_equipment_master'],
                    ['field' => 'work_center_id', 'target_table' => 'work_centers', 'target_field' => 'work_center_id', 'relationship' => 'assigned_to_work_center'],
                ],
            ],
            'item_part' => [
                'label' => 'Item or part',
                'canonical_table' => 'item',
                'canonical_key_fields' => ['item_code'],
                'record_id_field' => 'item_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('master_data', 'canonical item master', 'canonical_owner'),
                'relations' => [],
            ],
            'item_revision' => [
                'label' => 'Item revision',
                'canonical_table' => 'item_revision',
                'canonical_key_fields' => ['item_id', 'revision_code'],
                'record_id_field' => 'item_revision_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('master_data', 'canonical item revision master', 'canonical_owner'),
                'relations' => [
                    ['field' => 'item_id', 'target_table' => 'item', 'target_field' => 'item_id', 'relationship' => 'revision_of_item'],
                ],
            ],
            'material_lot' => [
                'label' => 'Material lot',
                'canonical_table' => 'lot',
                'canonical_key_fields' => ['lot_no'],
                'record_id_field' => 'lot_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('traceability_serialization', 'canonical inventory traceability', 'canonical_owner'),
                'relations' => [
                    ['field' => 'item_revision_id', 'target_table' => 'item_revision', 'target_field' => 'item_revision_id', 'relationship' => 'lot_of_revision'],
                ],
            ],
            'serial_identity' => [
                'label' => 'Serial identity',
                'canonical_table' => 'serial',
                'canonical_key_fields' => ['serial_no'],
                'record_id_field' => 'serial_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('traceability_serialization', 'canonical inventory traceability', 'canonical_owner'),
                'relations' => [
                    ['field' => 'item_revision_id', 'target_table' => 'item_revision', 'target_field' => 'item_revision_id', 'relationship' => 'serial_of_revision'],
                    ['field' => 'parent_lot_id', 'target_table' => 'lot', 'target_field' => 'lot_id', 'relationship' => 'belongs_to_lot'],
                ],
            ],
            'sales_order' => [
                'label' => 'Sales order',
                'canonical_table' => 'sales_order',
                'canonical_key_fields' => ['sales_order_no'],
                'record_id_field' => 'sales_order_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('planning_orchestration', 'ERP order orchestration', 'canonical_owner'),
                'relations' => [
                    ['field' => 'customer_party_id', 'target_table' => 'party', 'target_field' => 'party_id', 'relationship' => 'sold_to_party'],
                ],
            ],
            'job_order' => [
                'label' => 'Job or production order',
                'canonical_table' => 'production_order',
                'canonical_key_fields' => ['production_order_no'],
                'record_id_field' => 'production_order_id',
                'org_scope_fields' => ['plant_id'],
                'source_authority' => self::authority('planning_orchestration', 'ERP/MOM production orchestration', 'canonical_owner'),
                'relations' => [
                    ['field' => 'item_revision_id', 'target_table' => 'item_revision', 'target_field' => 'item_revision_id', 'relationship' => 'builds_revision'],
                    ['field' => 'plant_id', 'target_table' => 'org_plant', 'target_field' => 'plant_id', 'relationship' => 'planned_in_plant'],
                ],
            ],
            'work_order' => [
                'label' => 'Work order',
                'canonical_table' => 'work_order',
                'canonical_key_fields' => ['work_order_no'],
                'record_id_field' => 'work_order_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('mes_execution', 'canonical MES execution spine', 'canonical_owner'),
                'relations' => [
                    ['field' => 'production_order_id', 'target_table' => 'production_order', 'target_field' => 'production_order_id', 'relationship' => 'executes_production_order'],
                    ['field' => 'operation_id', 'target_table' => 'operation', 'target_field' => 'operation_id', 'relationship' => 'executes_operation'],
                ],
            ],
            'operation' => [
                'label' => 'Manufacturing operation',
                'canonical_table' => 'operation',
                'canonical_key_fields' => ['work_definition_version_id', 'operation_code'],
                'record_id_field' => 'operation_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('engineering_definition', 'canonical routing/work definition', 'canonical_owner'),
                'relations' => [
                    ['field' => 'work_definition_version_id', 'target_table' => 'work_definition_version', 'target_field' => 'work_definition_version_id', 'relationship' => 'operation_in_work_definition_version'],
                ],
            ],
            'inspection_execution' => [
                'label' => 'Inspection execution',
                'canonical_table' => 'inspection_lot',
                'canonical_key_fields' => ['inspection_lot_no'],
                'record_id_field' => 'inspection_lot_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('eqms_compliance', 'canonical inspection lot execution', 'canonical_owner'),
                'relations' => [
                    ['field' => 'item_revision_id', 'target_table' => 'item_revision', 'target_field' => 'item_revision_id', 'relationship' => 'inspects_revision'],
                    ['field' => 'lot_id', 'target_table' => 'lot', 'target_field' => 'lot_id', 'relationship' => 'inspects_lot'],
                    ['field' => 'serial_id', 'target_table' => 'serial', 'target_field' => 'serial_id', 'relationship' => 'inspects_serial'],
                ],
            ],
            'evidence_attachment' => [
                'label' => 'Evidence attachment',
                'canonical_table' => 'attachment',
                'canonical_key_fields' => ['attachment_id'],
                'record_id_field' => 'attachment_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('foundation_governance', 'controlled attachment backbone', 'canonical_owner'),
                'relations' => [],
            ],
            'employee' => [
                'label' => 'Employee identity',
                'canonical_table' => 'employees',
                'canonical_key_fields' => ['employee_id'],
                'record_id_field' => 'employee_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('training_hr', 'legacy employee master with HCM extension', 'authority_partial'),
                'relations' => [],
            ],
            'qualification_requirement' => [
                'label' => 'Qualification requirement',
                'canonical_table' => 'training_matrix',
                'canonical_key_fields' => ['role_code', 'competency_id'],
                'record_id_field' => 'training_matrix_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('eqms_compliance', 'training matrix and competency control', 'canonical_owner'),
                'relations' => [
                    ['field' => 'competency_id', 'target_table' => 'competency', 'target_field' => 'competency_id', 'relationship' => 'requires_competency'],
                    ['field' => 'document_id', 'target_table' => 'document', 'target_field' => 'document_id', 'relationship' => 'requires_controlled_document_training'],
                ],
            ],
            'certification_evidence' => [
                'label' => 'Certification evidence',
                'canonical_table' => 'employee_certifications',
                'canonical_key_fields' => ['employee_id', 'certification_name'],
                'record_id_field' => 'cert_id',
                'org_scope_fields' => ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'],
                'source_authority' => self::authority('training_hr', 'employee certification evidence', 'canonical_owner'),
                'relations' => [
                    ['field' => 'employee_id', 'target_table' => 'employees', 'target_field' => 'employee_id', 'relationship' => 'certifies_employee'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function model(): array
    {
        return [
            'generated_at' => gmdate(DATE_ATOM),
            'definition_count' => count(self::definitions()),
            'definitions' => self::definitions(),
            'relations' => $this->relationMap(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validate(): array
    {
        $definitions = self::definitions();
        $registry = $this->registryTables();
        $errors = [];
        $warnings = [];
        $claimedKeys = [];

        foreach ($definitions as $entityKey => $definition) {
            $table = (string)($definition['canonical_table'] ?? '');
            $columns = (array)($registry[$table]['columns'] ?? []);
            if ($table === '' || !isset($registry[$table])) {
                $errors[] = "{$entityKey}:missing_canonical_table:{$table}";
                continue;
            }

            $keyFields = (array)($definition['canonical_key_fields'] ?? []);
            if ($keyFields === []) {
                $errors[] = "{$entityKey}:missing_canonical_key_strategy";
            }
            $claim = $table . ':' . implode('+', $keyFields);
            if (isset($claimedKeys[$claim])) {
                $errors[] = "{$entityKey}:duplicate_canonical_key_claim:{$claim}";
            }
            $claimedKeys[$claim] = $entityKey;

            foreach (array_merge($keyFields, [(string)($definition['record_id_field'] ?? '')]) as $field) {
                if ($field !== '' && !isset($columns[$field])) {
                    $errors[] = "{$entityKey}:missing_identity_field:{$table}.{$field}";
                }
            }

            $scopeFields = (array)($definition['org_scope_fields'] ?? []);
            if ($scopeFields === []) {
                $errors[] = "{$entityKey}:missing_org_scope_strategy";
            }
            foreach ($scopeFields as $field) {
                if (!isset($columns[$field])) {
                    $warnings[] = "{$entityKey}:scope_field_not_on_table:{$table}.{$field}";
                }
            }

            $authority = (array)($definition['source_authority'] ?? []);
            foreach (['system_of_record', 'source_system', 'authority_state'] as $field) {
                if (trim((string)($authority[$field] ?? '')) === '') {
                    $errors[] = "{$entityKey}:missing_authority_metadata:{$field}";
                }
            }

            foreach ((array)($definition['relations'] ?? []) as $relation) {
                $field = (string)($relation['field'] ?? '');
                $targetTable = (string)($relation['target_table'] ?? '');
                $targetField = (string)($relation['target_field'] ?? '');
                if ($field !== '' && !isset($columns[$field])) {
                    $errors[] = "{$entityKey}:missing_relation_field:{$table}.{$field}";
                }
                if ($targetTable !== '' && !isset($registry[$targetTable])) {
                    $errors[] = "{$entityKey}:missing_relation_target_table:{$targetTable}";
                    continue;
                }
                if ($targetTable !== '' && $targetField !== '' && !isset($registry[$targetTable]['columns'][$targetField])) {
                    $errors[] = "{$entityKey}:missing_relation_target_field:{$targetTable}.{$targetField}";
                }
            }
        }

        if ($errors !== []) {
            $this->metrics['validation_failure']++;
        }

        return [
            'ok' => $errors === [],
            'definition_count' => count($definitions),
            'error_count' => count($errors),
            'warning_count' => count($warnings),
            'errors' => $errors,
            'warnings' => $warnings,
            'validated_at' => gmdate(DATE_ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        $this->metrics['model_probe']++;
        $validation = $this->validate();

        return [
            'slice' => 'canonical_manufacturing_spine',
            'backend' => 'registry',
            'primary_backend' => 'registry',
            'readiness_state' => $validation['ok'] ? 'authoritative_ready' : 'degraded',
            'authority_mode' => $validation['ok'] ? 'registry_primary' : 'degraded',
            'authoritative' => (bool)$validation['ok'],
            'definition_count' => $validation['definition_count'],
            'critical_identity_count' => count(self::definitions()),
            'validation' => $validation,
            'metrics' => $this->metrics,
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    public function relationMap(): array
    {
        $relations = [];
        foreach (self::definitions() as $entityKey => $definition) {
            foreach ((array)($definition['relations'] ?? []) as $relation) {
                $relations[] = [
                    'source_entity' => $entityKey,
                    'source_table' => (string)$definition['canonical_table'],
                    'field' => (string)($relation['field'] ?? ''),
                    'target_table' => (string)($relation['target_table'] ?? ''),
                    'target_field' => (string)($relation['target_field'] ?? ''),
                    'relationship' => (string)($relation['relationship'] ?? ''),
                ];
            }
        }
        return $relations;
    }

    /**
     * @return array<string, mixed>
     */
    private static function authority(string $systemOfRecord, string $sourceSystem, string $state): array
    {
        return [
            'system_of_record' => $systemOfRecord,
            'source_system' => $sourceSystem,
            'authority_state' => $state,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function registryTables(): array
    {
        if ($this->tableRegistry !== null) {
            return (array)($this->tableRegistry['tables'] ?? $this->tableRegistry);
        }

        $baseDir = rtrim($this->baseDir, '/');
        $path = $baseDir . '/data/registry/table-registry.json';
        if (!is_file($path) || !$this->isUsableTableRegistryPath($path)) {
            $path = $baseDir . '/contracts/table-registry.json';
        }
        if (!is_file($path)) {
            return [];
        }
        $decoded = json_decode((string)file_get_contents($path), true);
        $this->tableRegistry = is_array($decoded) ? $decoded : [];
        return (array)($this->tableRegistry['tables'] ?? []);
    }

    private function isUsableTableRegistryPath(string $path): bool
    {
        $raw = @file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return false;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return false;
        }

        $tables = is_array($decoded['tables'] ?? null) ? $decoded['tables'] : [];
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
}

if (!class_exists('MOM\\Services\\CanonicalManufacturingSpineService', false)) {
    class_alias(CanonicalManufacturingSpineService::class, 'MOM\\Services\\CanonicalManufacturingSpineService');
}
