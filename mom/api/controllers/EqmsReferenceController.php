<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use Throwable;

/**
 * Read-only EQMS reference data endpoint.
 *
 * This controller intentionally whitelists every source table/column. It does
 * not provide local option fallbacks; missing values must be fixed in the
 * system DB/reference-code governance path.
 */
final class EqmsReferenceController extends EqmsBaseController
{
    /** @var array<string, array<string, mixed>> */
    private const ENTITY_SOURCES = [
        'customers' => [
            'table' => 'customers',
            'value' => 'customer_id',
            'label' => "COALESCE(NULLIF(customer_name_vi, ''), customer_name, customer_id)",
            'search' => ['customer_id', 'customer_name', 'customer_name_vi'],
            'order' => 'customer_name',
            'meta' => "jsonb_build_object('status', customer_status, 'type', customer_type::text)",
        ],
        'suppliers' => [
            'table' => 'vendors',
            'value' => 'vendor_id',
            'label' => "COALESCE(NULLIF(vendor_name_vi, ''), vendor_name, vendor_id)",
            'search' => ['vendor_id', 'vendor_name', 'vendor_name_vi'],
            'order' => 'vendor_name',
            'meta' => "jsonb_build_object('status', vendor_status::text, 'type', vendor_type::text)",
        ],
        'vendors' => [
            'alias' => 'suppliers',
        ],
        'departments' => [
            'table' => 'departments',
            'value' => 'dept_code',
            'label' => "COALESCE(NULLIF(label_vi, ''), label, dept_code)",
            'search' => ['dept_code', 'label', 'label_vi'],
            'order' => 'label',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('active', is_active)",
        ],
        'roles' => [
            'table' => 'roles',
            'value' => 'role_code',
            'label' => "COALESCE(NULLIF(role_label_vi, ''), role_label, role_code)",
            'search' => ['role_code', 'role_label', 'role_label_vi', 'dept_code'],
            'order' => 'role_label',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('dept_code', dept_code, 'active', is_active)",
        ],
        'sites' => [
            'table' => 'mes_sites',
            'value' => 'site_id',
            'label' => "COALESCE(NULLIF(site_name_vi, ''), site_name, site_id)",
            'search' => ['site_id', 'site_name', 'site_name_vi'],
            'order' => 'site_name',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('timezone', timezone)",
        ],
        'areas' => [
            'table' => 'mes_areas',
            'value' => 'area_id',
            'label' => "COALESCE(NULLIF(area_name_vi, ''), area_name, area_id)",
            'search' => ['area_id', 'area_name', 'area_name_vi', 'area_type', 'site_id'],
            'order' => 'area_name',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('site_id', site_id, 'area_type', area_type)",
        ],
        'mes_areas' => [
            'alias' => 'areas',
        ],
        'plants' => [
            'table' => 'org_plants',
            'value' => 'plant_id',
            'label' => "COALESCE(NULLIF(plant_name_vi, ''), plant_name, plant_id)",
            'search' => ['plant_id', 'plant_name', 'plant_name_vi', 'site_id'],
            'order' => 'plant_name',
            'where' => "plant_status = 'active'",
            'meta' => "jsonb_build_object('site_id', site_id, 'status', plant_status)",
        ],
        'lots' => [
            'table' => 'lot_master',
            'value' => 'lot_number',
            'label' => "lot_number || ' - ' || item_id",
            'search' => ['lot_number', 'item_id', 'batch_number', 'vendor_lot_number', 'vendor_id'],
            'order' => 'created_at DESC, lot_number',
            'meta' => "jsonb_build_object('item_id', item_id, 'batch_number', batch_number, 'vendor_id', vendor_id, 'status', conformance_status::text)",
        ],
        'lot_master' => [
            'alias' => 'lots',
        ],
        'items' => [
            'table' => 'items',
            'value' => 'item_id',
            'label' => "item_id || ' - ' || COALESCE(NULLIF(description_vi, ''), description)",
            'search' => ['item_id', 'description', 'description_vi', 'item_group', 'customer_part_number', 'manufacturer_part_number'],
            'order' => 'item_id',
            'meta' => "jsonb_build_object('status', item_status::text, 'type', item_type::text, 'uom', uom)",
        ],
        'work_centers' => [
            'table' => 'work_centers',
            'value' => 'work_center_id',
            'label' => "COALESCE(NULLIF(work_center_name_vi, ''), work_center_name, work_center_id)",
            'search' => ['work_center_id', 'work_center_name', 'work_center_name_vi', 'department_id'],
            'order' => 'work_center_name',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('department_id', department_id, 'type', work_center_type::text)",
        ],
        'warehouses' => [
            'table' => 'warehouses',
            'value' => 'warehouse_id',
            'label' => "COALESCE(NULLIF(warehouse_name_vi, ''), warehouse_name, warehouse_id)",
            'search' => ['warehouse_id', 'warehouse_name', 'warehouse_name_vi', 'location'],
            'order' => 'warehouse_name',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('location', location)",
        ],
        'inventory_locations' => [
            'table' => 'inventory_locations',
            'value' => 'location_id',
            'label' => "location_id || COALESCE(' / ' || NULLIF(warehouse_id, ''), '')",
            'search' => ['location_id', 'warehouse_id', 'bin_location', 'zone_code', 'rack'],
            'order' => 'warehouse_id, location_id',
            'where' => 'is_active IS TRUE',
            'meta' => "jsonb_build_object('warehouse_id', warehouse_id, 'zone_code', zone_code, 'rack', rack)",
        ],
        'users' => [
            'table' => 'users',
            'value' => 'username',
            'label' => "COALESCE(NULLIF(full_name_vi, ''), full_name, username)",
            'search' => ['username', 'employee_id', 'email', 'full_name', 'full_name_vi', 'dept_code'],
            'order' => 'full_name',
            'where' => "status = 'active'",
            'meta' => "jsonb_build_object('employee_id', employee_id, 'dept_code', dept_code, 'email', email)",
        ],
        'documents' => [
            'table' => 'eqms_documents',
            'value' => 'doc_id::text',
            'label' => "doc_number || ' - ' || title",
            'search' => ['doc_number', 'title', 'document_type', 'department', 'owner'],
            'order' => 'doc_number',
            'meta' => "jsonb_build_object('type', document_type, 'department', department, 'status', status)",
        ],
        'change_controls' => [
            'table' => 'eqms_change_controls',
            'value' => 'change_control_id::text',
            'label' => "change_control_number || ' - ' || title",
            'search' => ['change_control_number', 'title', 'change_type', 'status'],
            'order' => 'created_at DESC, change_control_number',
            'meta' => "jsonb_build_object('type', change_type, 'status', status)",
        ],
        'capa_records' => [
            'table' => 'eqms_capa_records',
            'value' => 'capa_id::text',
            'label' => "capa_number || ' - ' || title",
            'search' => ['capa_number', 'title', 'source_type', 'status'],
            'order' => 'created_at DESC, capa_number',
            'meta' => "jsonb_build_object('source_type', source_type, 'status', status)",
        ],
        'deviations' => [
            'table' => 'eqms_deviations',
            'value' => 'deviation_id::text',
            'label' => "deviation_number || ' - ' || title",
            'search' => ['deviation_number', 'title', 'department', 'status'],
            'order' => 'created_at DESC, deviation_number',
            'meta' => "jsonb_build_object('department', department, 'status', status)",
        ],
        'ncr_records' => [
            'table' => 'eqms_ncr_records',
            'value' => 'ncr_id::text',
            'label' => "ncr_number || ' - ' || title",
            'search' => ['ncr_number', 'title', 'lot_number', 'job_number', 'status'],
            'order' => 'created_at DESC, ncr_number',
            'meta' => "jsonb_build_object('lot_number', lot_number, 'status', status)",
        ],
        'complaints' => [
            'table' => 'eqms_complaints',
            'value' => 'complaint_id::text',
            'label' => "complaint_number || ' - ' || subject",
            'search' => ['complaint_number', 'subject', 'customer_name', 'affected_lot_number', 'status'],
            'order' => 'created_at DESC, complaint_number',
            'meta' => "jsonb_build_object('customer_name', customer_name, 'status', status)",
        ],
        'audits' => [
            'table' => 'eqms_audits',
            'value' => 'audit_id::text',
            'label' => "audit_number || COALESCE(' - ' || NULLIF(scope, ''), '')",
            'search' => ['audit_number', 'scope', 'audit_type', 'standard_ref', 'auditee_dept', 'status'],
            'order' => 'planned_date DESC NULLS LAST, audit_number',
            'meta' => "jsonb_build_object('audit_type', audit_type, 'standard_ref', standard_ref, 'status', status)",
        ],
    ];

    /** @var array<string, string> */
    private const KEY_ALIASES = [
        'customer' => 'customers',
        'customer_id' => 'customers',
        'customer_name' => 'customers',
        'customer_destination' => 'customers',
        'supplier' => 'suppliers',
        'supplier_id' => 'suppliers',
        'vendor' => 'suppliers',
        'vendor_id' => 'suppliers',
        'department' => 'departments',
        'department_id' => 'departments',
        'dept_code' => 'departments',
        'auditee_dept' => 'departments',
        'role' => 'roles',
        'role_code' => 'roles',
        'owner_role' => 'roles',
        'reviewer_role' => 'roles',
        'site' => 'sites',
        'site_id' => 'sites',
        'area' => 'areas',
        'area_id' => 'areas',
        'plant' => 'plants',
        'plant_id' => 'plants',
        'lot' => 'lots',
        'lot_number' => 'lots',
        'affected_lot_number' => 'lots',
        'batch' => 'lots',
        'batch_number' => 'lots',
        'batch_id' => 'lots',
        'item' => 'items',
        'item_id' => 'items',
        'material' => 'items',
        'material_id' => 'items',
        'part' => 'items',
        'part_number' => 'items',
        'product' => 'items',
        'product_id' => 'items',
        'product_name' => 'items',
        'affected_product_id' => 'items',
        'work_center' => 'work_centers',
        'work_center_id' => 'work_centers',
        'warehouse' => 'warehouses',
        'warehouse_id' => 'warehouses',
        'location' => 'inventory_locations',
        'location_id' => 'inventory_locations',
        'owner' => 'users',
        'assigned_to' => 'users',
        'responsible_party' => 'users',
        'lead_auditor' => 'users',
        'approver' => 'users',
        'employee_id' => 'users',
        'document_id' => 'documents',
        'doc_id' => 'documents',
        'change_control_id' => 'change_controls',
        'linked_change_control_id' => 'change_controls',
        'capa_id' => 'capa_records',
        'linked_capa_id' => 'capa_records',
        'deviation_id' => 'deviations',
        'ncr_id' => 'ncr_records',
        'complaint_id' => 'complaints',
        'audit_id' => 'audits',
        'source_event_id' => 'source_records',
        'source_id' => 'source_records',
        'standard' => 'eqms.standard_ref',
        'release_type' => 'eqms.release_type',
        'action_type' => 'eqms.action_type',
        'type' => 'eqms.type',
        'status' => 'eqms.status',
        'severity' => 'eqms.severity',
        'priority' => 'eqms.priority',
        'source' => 'eqms.source_type',
        'source_type' => 'eqms.source_type',
        'source_event_type' => 'eqms.source_type',
        'change_type' => 'eqms.change_type',
        'change_category' => 'eqms.change_category',
        'deviation_type' => 'eqms.deviation_type',
        'document_type' => 'eqms.document_type',
        'doc_type' => 'eqms.document_type',
        'audit_type' => 'eqms.audit_type',
        'standard_ref' => 'eqms.standard_ref',
        'risk_level' => 'eqms.risk_level',
        'risk_tier' => 'eqms.risk_level',
        'overall_risk' => 'eqms.risk_level',
        'disposition' => 'eqms.disposition',
        'training_type' => 'eqms.training_type',
        'category' => 'eqms.category',
        'classification' => 'eqms.classification',
        'nc_type' => 'eqms.nc_type',
        'defect_type' => 'eqms.defect_type',
        'detection_method' => 'eqms.detection_method',
        'detection_point' => 'eqms.detection_point',
        'regulatory_impact' => 'eqms.regulatory_impact',
        'regulatory_notification' => 'eqms.boolean',
        'regulatory_notification_required' => 'eqms.boolean',
        'conc_regulatory_notification' => 'eqms.boolean',
        'conc_batch_impact' => 'eqms.boolean',
        'containment_needed' => 'eqms.boolean',
        'new_action_evidence' => 'eqms.boolean',
        'has_exceptions' => 'eqms.boolean',
        'escalated' => 'eqms.boolean',
        'p1_assignable_cause_found' => 'eqms.boolean',
        'p1_calculation_verified' => 'eqms.boolean',
        'p1_equipment_verified' => 'eqms.boolean',
        'p1_method_followed' => 'eqms.boolean',
        'p1_sample_integrity' => 'eqms.boolean',
        'overdue' => 'eqms.boolean',
        'overdue_only' => 'eqms.overdue_filter',
        'due_status' => 'eqms.due_status',
        'matrix_status' => 'eqms.training_matrix_status',
        'control_status' => 'eqms.control_status',
        'outcome' => 'eqms.outcome',
        'effectiveness' => 'eqms.effectiveness',
        'strategic_classification' => 'eqms.strategic_classification',
        'checklist_template' => 'eqms.checklist_template',
        'validation_type' => 'eqms.validation_type',
        'req_priority' => 'eqms.requirement_priority',
        'requirement_priority' => 'eqms.requirement_priority',
        'req_type' => 'eqms.requirement_type',
        'requirement_type' => 'eqms.requirement_type',
        'exec_status' => 'eqms.execution_status',
        'execution_status' => 'eqms.execution_status',
        'health_hazard_classification' => 'eqms.hazard_class',
        'hazard_class' => 'eqms.hazard_class',
        'urgency' => 'eqms.urgency',
        'level' => 'eqms.capability_level',
        'capability_level' => 'eqms.capability_level',
        'equipment_type' => 'eqms.equipment_type',
        'fmea_type' => 'eqms.fmea_type',
        'response_method' => 'eqms.response_method',
        'rt_type' => 'eqms.rt_type',
        'study_type' => 'eqms.study_type',
        'format' => 'eqms.format',
        'decision' => 'eqms.decision',
        'vote' => 'eqms.vote',
        'impact' => 'eqms.impact',
        'quality_status' => 'eqms.quality_status',
    ];

    /** @var array<string, list<array{0: string, 1: string}>> */
    private const DISTINCT_SOURCES = [
        'eqms.status' => [
            ['eqms_complaints', 'status'],
            ['eqms_deviations', 'status'],
            ['eqms_ncr_records', 'status'],
            ['eqms_capa_records', 'status'],
            ['eqms_change_controls', 'status'],
            ['eqms_engineering_changes', 'status'],
            ['eqms_documents', 'status'],
            ['eqms_training_curricula', 'status'],
            ['eqms_training_records', 'status'],
            ['eqms_audits', 'status'],
            ['eqms_supplier_profiles', 'qualification_status'],
            ['eqms_quality_agreements', 'status'],
            ['eqms_batch_release', 'status'],
            ['eqms_field_actions', 'status'],
        ],
        'eqms.severity' => [
            ['eqms_complaints', 'severity'],
            ['eqms_deviations', 'severity'],
            ['eqms_ncr_records', 'severity'],
            ['eqms_capa_records', 'severity'],
        ],
        'eqms.priority' => [
            ['eqms_complaints', 'priority'],
        ],
        'eqms.source' => [
            ['eqms_complaints', 'source'],
            ['eqms_ncr_records', 'source'],
            ['eqms_capa_records', 'source_type'],
        ],
        'eqms.source_type' => [
            ['eqms_complaints', 'source'],
            ['eqms_ncr_records', 'source'],
            ['eqms_capa_records', 'source_type'],
        ],
        'eqms.change_type' => [
            ['eqms_change_controls', 'change_type'],
            ['eqms_engineering_changes', 'change_category'],
        ],
        'eqms.change_category' => [
            ['eqms_change_controls', 'change_category'],
            ['eqms_engineering_changes', 'change_category'],
        ],
        'eqms.deviation_type' => [
            ['eqms_deviations', 'deviation_type'],
        ],
        'eqms.document_type' => [
            ['eqms_documents', 'document_type'],
        ],
        'eqms.audit_type' => [
            ['eqms_audits', 'audit_type'],
        ],
        'eqms.standard_ref' => [
            ['eqms_audits', 'standard_ref'],
        ],
        'eqms.risk_level' => [
            ['eqms_change_controls', 'risk_level'],
            ['eqms_supplier_profiles', 'risk_tier'],
        ],
        'eqms.disposition' => [
            ['eqms_ncr_records', 'disposition'],
        ],
        'eqms.training_type' => [
            ['eqms_training_records', 'training_type'],
        ],
        'eqms.category' => [
            ['eqms_complaints', 'category'],
            ['eqms_audit_findings', 'category'],
        ],
        'eqms.release_type' => [
            ['eqms_batch_release', 'release_type'],
        ],
        'eqms.action_type' => [
            ['eqms_field_actions', 'action_type'],
        ],
    ];

    public function options(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();
        $keys = $this->requestedKeys($body);
        if ($keys === []) {
            $this->error('missing_reference_keys', 400, 'Request must include one or more reference keys.');
        }

        $limit = (int)($this->input('limit', '100') ?? '100');
        if (isset($body['limit']) && is_scalar($body['limit'])) {
            $limit = (int)$body['limit'];
        }
        $limit = max(1, min(200, $limit));

        $search = trim((string)($this->input('q', $this->input('search', '')) ?? ''));
        if (isset($body['q']) && is_scalar($body['q'])) {
            $search = trim((string)$body['q']);
        } elseif (isset($body['search']) && is_scalar($body['search'])) {
            $search = trim((string)$body['search']);
        }

        $references = [];
        foreach ($keys as $key) {
            $canonical = $this->canonicalKey($key);
            try {
                $references[$key] = [
                    'key' => $canonical,
                    'ok' => true,
                    'source' => 'postgres',
                    'options' => $this->loadOptions($canonical, $search, $limit),
                ];
            } catch (Throwable $e) {
                $references[$key] = [
                    'key' => $canonical,
                    'ok' => false,
                    'source' => 'postgres',
                    'options' => [],
                    'error' => 'reference_load_failed',
                    'detail' => $e->getMessage(),
                ];
            }
        }

        $this->success([
            'references' => $references,
            'data' => $references,
            'count' => count($references),
        ]);
    }

    /**
     * @param array<string, mixed>|array<int, mixed> $body
     * @return list<string>
     */
    private function requestedKeys(array $body): array
    {
        $raw = $body['keys'] ?? $this->input('keys', '');
        if (is_string($raw)) {
            $keys = preg_split('/[\s,]+/', $raw) ?: [];
        } elseif (is_array($raw)) {
            $keys = $raw;
        } elseif (is_scalar($raw)) {
            $keys = [(string)$raw];
        } else {
            $keys = [];
        }

        $clean = [];
        foreach ($keys as $key) {
            if (!is_scalar($key)) {
                continue;
            }
            $value = strtolower(trim((string)$key));
            if ($value !== '') {
                $clean[] = $value;
            }
        }

        return array_values(array_unique($clean));
    }

    private function canonicalKey(string $key): string
    {
        $key = strtolower(trim($key));
        $key = str_replace(['-', ' '], ['_', '_'], $key);
        if (isset(self::KEY_ALIASES[$key])) {
            return self::KEY_ALIASES[$key];
        }
        if (isset(self::ENTITY_SOURCES[$key]['alias'])) {
            return (string)self::ENTITY_SOURCES[$key]['alias'];
        }
        return $key;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadOptions(string $key, string $search, int $limit): array
    {
        $codeValues = $this->loadReferenceCodeValues($key, $search, $limit);
        if ($codeValues !== []) {
            return $codeValues;
        }

        if ($key === 'source_records') {
            return $this->loadSourceRecords($search, $limit);
        }

        if (isset(self::DISTINCT_SOURCES[$key])) {
            return $this->loadDistinctValues($key, $search, $limit);
        }

        if (str_starts_with($key, 'eqms.')) {
            return [];
        }

        if (!isset(self::ENTITY_SOURCES[$key])) {
            throw new \InvalidArgumentException("Unknown EQMS reference key '{$key}'.");
        }

        $source = self::ENTITY_SOURCES[$key];
        if (isset($source['alias'])) {
            return $this->loadOptions((string)$source['alias'], $search, $limit);
        }

        return $this->loadEntityOptions($key, $source, $search, $limit);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadReferenceCodeValues(string $key, string $search, int $limit): array
    {
        $where = 'c.code_set = :key';
        $params = [':key' => $key];
        if ($search !== '') {
            $where .= ' AND (v.code_value ILIKE :search OR v.value_label ILIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }

        $rows = $this->data->query(
            "SELECT v.code_value::text AS value,
                    v.value_label::text AS label,
                    jsonb_build_object('code_set', c.code_set, 'sort_order', v.sort_order) AS meta
             FROM mdm_reference_codes c
             JOIN mdm_reference_code_values v
               ON v.mdm_reference_code_id = c.mdm_reference_code_id
             WHERE {$where}
             ORDER BY v.sort_order NULLS LAST, v.value_label
             LIMIT {$limit}",
            $params
        ) ?? [];

        return $this->normalizeRows($rows, 'mdm_reference_code_values');
    }

    /**
     * @param array<string, mixed> $source
     * @return list<array<string, mixed>>
     */
    private function loadEntityOptions(string $key, array $source, string $search, int $limit): array
    {
        $table = (string)$source['table'];
        $value = (string)$source['value'];
        $label = (string)$source['label'];
        $meta = (string)($source['meta'] ?? "'{}'::jsonb");
        $where = [(string)($source['where'] ?? '1=1')];
        $params = [];

        if ($search !== '') {
            $searchParts = [];
            foreach ((array)($source['search'] ?? []) as $index => $column) {
                if (!is_string($column) || $column === '') {
                    continue;
                }
                $searchParts[] = "{$column}::text ILIKE :search";
            }
            if ($searchParts !== []) {
                $where[] = '(' . implode(' OR ', $searchParts) . ')';
                $params[':search'] = '%' . $search . '%';
            }
        }

        $order = (string)($source['order'] ?? 'label');
        $rows = $this->data->query(
            "SELECT ({$value})::text AS value,
                    ({$label})::text AS label,
                    {$meta} AS meta
             FROM {$table}
             WHERE " . implode(' AND ', $where) . "
             ORDER BY {$order}
             LIMIT {$limit}",
            $params
        ) ?? [];

        return $this->normalizeRows($rows, $table, $key);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadDistinctValues(string $key, string $search, int $limit): array
    {
        $selects = [];
        foreach (self::DISTINCT_SOURCES[$key] as [$table, $column]) {
            $selects[] = "SELECT {$column}::text AS value FROM {$table} WHERE {$column} IS NOT NULL AND {$column}::text <> ''";
        }

        $params = [];
        $where = 'value IS NOT NULL AND value <> \'\'';
        if ($search !== '') {
            $where .= ' AND value ILIKE :search';
            $params[':search'] = '%' . $search . '%';
        }

        $rows = $this->data->query(
            "SELECT DISTINCT value, value AS label, jsonb_build_object('code_set', :code_set) AS meta
             FROM (" . implode(' UNION ALL ', $selects) . ") src
             WHERE {$where}
             ORDER BY value
             LIMIT {$limit}",
            array_merge([':code_set' => $key], $params)
        ) ?? [];

        return $this->normalizeRows($rows, 'db_distinct', $key);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadSourceRecords(string $search, int $limit): array
    {
        $params = [];
        $where = '1=1';
        if ($search !== '') {
            $where = '(value ILIKE :search OR label ILIKE :search OR source_type ILIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }

        $rows = $this->data->query(
            "SELECT value,
                    label,
                    jsonb_build_object('source_type', source_type, 'status', status) AS meta
             FROM (
                SELECT complaint_id::text AS value,
                       complaint_number || ' - ' || subject AS label,
                       'complaint'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_complaints
                UNION ALL
                SELECT deviation_id::text AS value,
                       deviation_number || ' - ' || title AS label,
                       'deviation'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_deviations
                UNION ALL
                SELECT ncr_id::text AS value,
                       ncr_number || ' - ' || title AS label,
                       'ncr'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_ncr_records
                UNION ALL
                SELECT capa_id::text AS value,
                       capa_number || ' - ' || title AS label,
                       'capa'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_capa_records
                UNION ALL
                SELECT change_control_id::text AS value,
                       change_control_number || ' - ' || title AS label,
                       'change_control'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_change_controls
                UNION ALL
                SELECT audit_id::text AS value,
                       audit_number || COALESCE(' - ' || NULLIF(scope, ''), '') AS label,
                       'audit'::text AS source_type,
                       status::text AS status,
                       created_at
                  FROM eqms_audits
             ) records
             WHERE {$where}
             ORDER BY created_at DESC
             LIMIT {$limit}",
            $params
        ) ?? [];

        return $this->normalizeRows($rows, 'eqms_source_records', 'source_records');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function normalizeRows(array $rows, string $source, ?string $key = null): array
    {
        $options = [];
        foreach ($rows as $row) {
            $value = trim((string)($row['value'] ?? ''));
            if ($value === '') {
                continue;
            }
            $label = trim((string)($row['label'] ?? ''));
            $options[] = [
                'value' => $value,
                'label' => $label !== '' ? $label : $value,
                'source' => $source,
                'key' => $key,
                'meta' => $row['meta'] ?? null,
            ];
        }

        return $options;
    }
}
