<?php

declare(strict_types=1);

namespace HESEM\QMS\Database;

use RuntimeException;

/**
 * Runtime JSON -> PostgreSQL shadow sync for governed stores that are still
 * operationally driven by JSON in the portal runtime.
 */
final class RuntimeShadowSync
{
    private Connection $db;

    public function __construct(Connection $db)
    {
        $this->db = $db;
    }

    public function syncMasterDataStore(array $store): void
    {
        $this->db->transactional(function () use ($store): void {
            $this->syncCustomers((array)($store['customers'] ?? []));
            $this->syncVendors((array)($store['suppliers'] ?? []));
            $this->syncItems((array)($store['parts'] ?? []));
            $this->syncItemRevisions((array)($store['revisions'] ?? []));
            $this->syncWorkCenters((array)($store['work_centers'] ?? []));
            $this->syncEquipment((array)($store['machines'] ?? []), (array)($store['work_centers'] ?? []));
            $this->syncTools((array)($store['tooling_assets'] ?? []));
            $this->syncCapaRegistry((array)($store['capas'] ?? []));
            $this->syncEmployees((array)($store['operators'] ?? []));
            $this->syncNcReleasePackages((array)($store['nc_program_releases'] ?? []));
            $this->syncConnectivityAdapters((array)($store['mes_connectivity_adapters'] ?? []));
            $this->syncAlarmCatalog((array)($store['mes_alarm_catalog'] ?? []));
            $this->syncAlarmPlaybooks((array)($store['mes_alarm_playbooks'] ?? []));
            $this->syncToolAssemblies((array)($store['tool_assemblies'] ?? []));
            $this->syncVariableMirror('runtime_nc_program_release', (array)($store['nc_program_releases'] ?? []), 'program_id', 'release_title');
            $this->syncVariableMirror('runtime_downtime_reason', (array)($store['downtime_reason_codes'] ?? []), 'reason_code', 'reason_name');
            $this->syncVariableMirror('runtime_downtime_resolution', (array)($store['downtime_resolution_codes'] ?? []), 'resolution_code', 'resolution_name');
        });
    }

    public function syncOrdersStore(array $store): void
    {
        $this->db->transactional(function () use ($store): void {
            $formLinks = (array)($store['form_links'] ?? []);
            $this->syncSalesOrders((array)($store['sales_orders'] ?? []), $formLinks);
            $this->syncJobOrders((array)($store['job_orders'] ?? []), $formLinks);
            $this->syncWorkOrders((array)($store['work_orders'] ?? []), (array)($store['job_orders'] ?? []), (array)($store['sales_orders'] ?? []), $formLinks);
        });
    }

    public function syncMesRuntimeStore(array $store, array $orders = [], array $master = []): void
    {
        $this->db->transactional(function () use ($store, $orders, $master): void {
            $this->syncToolRuntime((array)($store['tooling_status'] ?? []));
            $this->syncConnectorAndSignals(
                (array)($store['connector_feeds'] ?? []),
                (array)($store['machine_signals'] ?? []),
                (array)($master['machines'] ?? [])
            );
            $this->syncConnectivityEvents((array)($store['mes_connectivity_events'] ?? []));
            $this->syncMachineAlarmRuntime((array)($store['machine_alarm_events'] ?? []));
            $this->syncNcDownloadReceipts((array)($store['nc_download_receipts'] ?? []));
            $this->syncToolPresetOffsets((array)($store['mes_tool_preset_offsets'] ?? []));
            $this->syncMaterialConsumption((array)($store['material_consumption'] ?? []));
            $this->syncPartGenealogy((array)($store['part_genealogy'] ?? []));
            $this->syncShiftHandover((array)($store['shift_handover'] ?? []));
            $this->syncProgressReports((array)($store['progress_reports'] ?? []), (array)($orders['work_orders'] ?? []));
            $this->syncDowntimeEvents((array)($store['downtime_events'] ?? []));
            $this->syncMaintenanceRequests((array)($store['maintenance_requests'] ?? []));
        });
    }

    private function syncCustomers(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $customerId = trim((string)($row['customer_id'] ?? ''));
            $customerName = trim((string)($row['customer_name'] ?? ''));
            if ($customerId === '' || $customerName === '') {
                continue;
            }
            $this->upsert('customers', [
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_name_vi' => trim((string)($row['customer_name_vi'] ?? $customerName)),
                'customer_type' => $this->mapCustomerType((string)($row['customer_type'] ?? '')),
                'customer_status' => strtolower(trim((string)($row['status'] ?? 'active'))),
                'primary_contact' => trim((string)($row['contact_name'] ?? '')),
                'contact_email' => trim((string)($row['contact_email'] ?? '')),
                'contact_phone' => trim((string)($row['contact_phone'] ?? '')),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['customer_id'], ['metadata']);
        }
    }

    private function syncVendors(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $vendorId = trim((string)($row['supplier_id'] ?? ''));
            $vendorName = trim((string)($row['supplier_name'] ?? ''));
            if ($vendorId === '' || $vendorName === '') {
                continue;
            }
            $this->upsert('vendors', [
                'vendor_id' => $vendorId,
                'vendor_name' => $vendorName,
                'vendor_name_vi' => trim((string)($row['supplier_name_vi'] ?? $vendorName)),
                'vendor_type' => $this->mapVendorType((string)($row['supplier_type'] ?? '')),
                'vendor_status' => $this->mapVendorStatus((string)($row['status'] ?? 'pending')),
                'primary_contact' => trim((string)($row['contact_name'] ?? '')),
                'contact_email' => trim((string)($row['contact_email'] ?? '')),
                'contact_phone' => trim((string)($row['contact_phone'] ?? '')),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['vendor_id'], ['metadata']);
        }
    }

    private function syncItems(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $itemId = trim((string)($row['part_number'] ?? ''));
            if ($itemId === '') {
                continue;
            }
            $description = trim((string)($row['part_description'] ?? $itemId));
            $this->upsert('items', [
                'item_id' => $itemId,
                'description' => $description,
                'description_vi' => trim((string)($row['part_description_vi'] ?? $description)),
                'item_status' => $this->mapItemStatus((string)($row['status'] ?? 'active')),
                'preferred_vendor_id' => trim((string)($row['preferred_supplier_id'] ?? '')) ?: null,
                'customer_part_number' => trim((string)($row['customer_part_number'] ?? '')) ?: null,
                'drawing_revision' => trim((string)($row['part_revision'] ?? '')) ?: null,
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['item_id'], ['metadata']);
        }
    }

    private function syncItemRevisions(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $itemId = trim((string)($row['part_number'] ?? ''));
            $revision = trim((string)($row['revision'] ?? ''));
            if ($itemId === '' || $revision === '') {
                continue;
            }
            $this->upsert('item_revisions', [
                'item_id' => $itemId,
                'rev' => $revision,
                'change_type' => trim((string)($row['status'] ?? 'released')) ?: null,
                'description' => trim((string)($row['revision_id'] ?? ($itemId . ' ' . $revision))),
                'valid_from' => $this->parseTimestamp((string)($row['release_date'] ?? '')) ?? date(DATE_ATOM),
                'metadata' => $row,
            ], ['item_id', 'rev'], ['metadata']);
        }
    }

    private function syncWorkCenters(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $workCenterId = trim((string)($row['work_center_id'] ?? ''));
            $workCenterName = trim((string)($row['work_center_name'] ?? ''));
            if ($workCenterId === '' || $workCenterName === '') {
                continue;
            }
            $this->upsert('work_centers', [
                'work_center_id' => $workCenterId,
                'work_center_name' => $workCenterName,
                'work_center_name_vi' => trim((string)($row['work_center_name_vi'] ?? $workCenterName)),
                'work_center_type' => $this->mapWorkCenterType($row),
                'department_id' => $this->mapDept((string)($row['department'] ?? '')),
                'metadata' => $row,
                'is_active' => strtolower(trim((string)($row['status'] ?? 'active'))) !== 'inactive',
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['work_center_id'], ['metadata']);
        }
    }

    private function syncEquipment(array $rows, array $workCenters): void
    {
        $workCenterDeptMap = $this->workCenterDeptMap($workCenters);
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $equipmentId = trim((string)($row['machine_id'] ?? ''));
            $equipmentName = trim((string)($row['machine_name'] ?? ''));
            if ($equipmentId === '' || $equipmentName === '') {
                continue;
            }
            $workCenterId = trim((string)($row['work_center_id'] ?? ''));
            $deptCode = $workCenterDeptMap[$workCenterId] ?? $this->mapDept((string)($row['department'] ?? ''));

            $this->upsert('equipment', [
                'equipment_id' => $equipmentId,
                'equipment_name' => $equipmentName,
                'equipment_type' => $this->mapEquipmentType((string)($row['machine_type'] ?? '')),
                'machine_type' => $this->mapMachineType((string)($row['machine_type'] ?? '')),
                'asset_type' => 'MACH',
                'equipment_location' => trim((string)($row['location'] ?? '')) ?: null,
                'department_id' => $deptCode,
                'pm_last_date' => $this->parseDate((string)($row['last_pm_date'] ?? '')),
                'pm_next_date' => $this->parseDate((string)($row['next_pm_date'] ?? '')),
                'is_active' => strtolower(trim((string)($row['status'] ?? 'active'))) !== 'inactive',
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['equipment_id'], ['metadata']);

            $this->upsert('mes_equipment_extended', [
                'equipment_id' => $equipmentId,
                'work_center_id' => $workCenterId ?: null,
                'mtconnect_agent_url' => strtolower(trim((string)($row['connector_type'] ?? ''))) === 'mtconnect'
                    ? trim((string)($row['connector_endpoint'] ?? '')) ?: null
                    : null,
                'opc_ua_endpoint' => in_array(strtolower(trim((string)($row['connector_type'] ?? ''))), ['opcua', 'opc_ua'], true)
                    ? trim((string)($row['connector_endpoint'] ?? '')) ?: null
                    : null,
                'controller_type' => trim((string)($row['connector_name'] ?? '')) ?: null,
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['equipment_id'], ['metadata']);
        }
    }

    private function syncTools(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $toolId = trim((string)($row['tool_id'] ?? ''));
            if ($toolId === '') {
                continue;
            }
            $description = trim((string)($row['tool_name'] ?? $toolId));
            $this->upsert('tools', [
                'tool_id' => $toolId,
                'tool_description' => $description,
                'tool_type' => $this->mapToolType((string)($row['tool_type'] ?? ''), $description),
                'tool_life_minutes' => isset($row['tool_life_minutes']) ? (int)$row['tool_life_minutes'] : null,
                'tool_life_remaining_pct' => isset($row['tool_life_remaining_pct']) ? (float)$row['tool_life_remaining_pct'] : null,
                'tool_life_total_parts' => isset($row['tool_life_parts']) ? (int)$row['tool_life_parts'] : null,
                'tool_location' => $this->mapToolLocation((string)($row['tool_location'] ?? $row['status'] ?? 'crib')),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['tool_id'], ['metadata']);
        }
    }

    private function syncCapaRegistry(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $recordId = trim((string)($row['capa_number'] ?? ''));
            if ($recordId === '') {
                continue;
            }
            $status = strtolower(trim((string)($row['status'] ?? 'open')));
            $recordStatus = match ($status) {
                'closed', 'closed_effective', 'closed_not_effective' => 'closed',
                'in_progress', 'implemented', 'verification_pending' => 'in_progress',
                'on_hold' => 'on_hold',
                'cancelled' => 'cancelled',
                default => 'open',
            };
            $this->upsert('records', [
                'record_id' => $recordId,
                'record_type' => 'CAPA',
                'dept_code' => 'QA',
                'status' => $recordStatus,
                'title' => trim((string)($row['title'] ?? $recordId)),
                'data' => $row,
                'form_code' => 'FRM-641',
                'metadata' => [
                    'shadow_source' => 'master_data',
                    'customer_id' => (string)($row['customer_id'] ?? ''),
                    'part_number' => (string)($row['part_number'] ?? ''),
                ],
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['record_id'], ['data', 'metadata']);
        }
    }

    private function syncEmployees(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $employeeId = trim((string)($row['operator_id'] ?? ''));
            if ($employeeId === '') {
                continue;
            }
            $name = trim((string)($row['operator_name'] ?? $row['display_name'] ?? $employeeId));
            $this->upsert('employees', [
                'employee_id' => $employeeId,
                'employee_name' => $name,
                'user_id_code' => trim((string)($row['user_id'] ?? '')) ?: null,
                'role_code' => trim((string)($row['role_code'] ?? '')) ?: null,
                'role_label' => trim((string)($row['role_label'] ?? '')) ?: null,
                'dept_code' => $this->mapDept((string)($row['department'] ?? '')),
                'shift' => $this->safeEnum((string)($row['shift'] ?? ''), ['A', 'B', 'C'], null),
                'supervisor_name' => trim((string)($row['supervisor_name'] ?? '')) ?: null,
                'is_active' => strtolower(trim((string)($row['status'] ?? 'active'))) !== 'inactive',
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['employee_id'], ['metadata']);
        }
    }

    private function syncNcReleasePackages(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $programId = trim((string)($row['program_id'] ?? ''));
            if ($programId === '') {
                continue;
            }
            $packageId = trim((string)($row['package_id'] ?? $programId));
            $this->upsert('mes_nc_release_packages', [
                'package_id' => $packageId,
                'program_id' => $programId,
                'item_id' => trim((string)($row['part_number'] ?? '')) ?: null,
                'revision_code' => trim((string)($row['part_revision'] ?? '')) ?: null,
                'operation_seq' => isset($row['operation_number']) ? (int)$row['operation_number'] : null,
                'machine_family' => trim((string)($row['machine_type'] ?? '')) ?: null,
                'work_center_id' => trim((string)($row['work_center_id'] ?? '')) ?: null,
                'controller_program_name' => trim((string)($row['controller_program_name'] ?? $programId)) ?: null,
                'checksum_sha256' => trim((string)($row['checksum_sha256'] ?? $row['checksum'] ?? '')) ?: null,
                'release_manifest_version' => trim((string)($row['release_manifest_version'] ?? '')) ?: null,
                'released_by' => trim((string)($row['released_by'] ?? '')) ?: null,
                'released_at' => $this->parseTimestamp((string)($row['released_at'] ?? '')),
                'package_status' => strtolower(trim((string)($row['status'] ?? 'draft'))),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['package_id'], ['metadata']);
        }
    }

    private function syncConnectivityAdapters(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $adapterId = trim((string)($row['adapter_id'] ?? ''));
            if ($adapterId === '') {
                continue;
            }
            $this->upsert('mes_connectivity_adapters', [
                'adapter_id' => $adapterId,
                'equipment_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'adapter_name' => trim((string)($row['adapter_name'] ?? $adapterId)),
                'adapter_type' => strtolower(trim((string)($row['adapter_type'] ?? 'manual_bridge'))),
                'transport_protocol' => strtolower(trim((string)($row['transport_protocol'] ?? 'manual'))),
                'endpoint_url' => trim((string)($row['endpoint_url'] ?? '')) ?: null,
                'heartbeat_sla_seconds' => max(30, (int)($row['heartbeat_sla_seconds'] ?? 120)),
                'stale_after_seconds' => max(30, (int)($row['stale_after_seconds'] ?? $row['heartbeat_sla_seconds'] ?? 180)),
                'auth_mode' => trim((string)($row['auth_mode'] ?? 'service_account')) ?: null,
                'store_and_forward_enabled' => $this->safeBool($row['store_and_forward_enabled'] ?? true),
                'payload_schema_version' => trim((string)($row['payload_schema_version'] ?? '1.0')) ?: null,
                'adapter_status' => strtolower(trim((string)($row['status'] ?? 'active'))),
                'last_validated_at' => $this->parseTimestamp((string)($row['last_validated_at'] ?? '')),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['adapter_id'], ['metadata']);
        }
    }

    private function syncAlarmCatalog(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $alarmCode = trim((string)($row['alarm_code'] ?? ''));
            if ($alarmCode === '') {
                continue;
            }
            $this->upsert('mes_alarm_catalog', [
                'alarm_code' => $alarmCode,
                'controller_family' => trim((string)($row['controller_family'] ?? 'generic')) ?: 'generic',
                'alarm_group' => trim((string)($row['alarm_group'] ?? 'general')) ?: null,
                'alarm_title' => trim((string)($row['title'] ?? $alarmCode)),
                'alarm_title_vi' => trim((string)($row['title_vi'] ?? '')) ?: null,
                'default_severity' => strtoupper(trim((string)($row['severity_default'] ?? 'ALARM'))),
                'downtime_category_default' => trim((string)($row['downtime_category_default'] ?? '')) ?: null,
                'response_owner_role' => trim((string)($row['response_owner_role'] ?? '')) ?: null,
                'response_target_minutes' => isset($row['response_target_minutes']) ? (int)$row['response_target_minutes'] : null,
                'requires_lockout' => $this->safeBool($row['requires_lockout'] ?? false),
                'requires_maintenance' => $this->safeBool($row['requires_maintenance'] ?? true),
                'catalog_status' => strtolower(trim((string)($row['status'] ?? 'active'))),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['alarm_code'], ['metadata']);
        }
    }

    private function syncAlarmPlaybooks(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $playbookId = trim((string)($row['playbook_id'] ?? ''));
            if ($playbookId === '') {
                continue;
            }
            $steps = is_array($row['response_steps'] ?? null) ? array_values($row['response_steps']) : [];
            $this->upsert('mes_alarm_playbooks', [
                'playbook_id' => $playbookId,
                'alarm_code' => trim((string)($row['alarm_code'] ?? '')) ?: null,
                'playbook_title' => trim((string)($row['title'] ?? $playbookId)),
                'playbook_title_vi' => trim((string)($row['title_vi'] ?? '')) ?: null,
                'response_steps' => $steps,
                'escalation_role' => trim((string)($row['escalation_role'] ?? '')) ?: null,
                'response_target_minutes' => isset($row['response_target_minutes']) ? (int)$row['response_target_minutes'] : null,
                'playbook_status' => strtolower(trim((string)($row['status'] ?? 'active'))),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['playbook_id'], ['response_steps', 'metadata']);
        }
    }

    private function syncToolAssemblies(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $assemblyId = trim((string)($row['assembly_id'] ?? ''));
            if ($assemblyId === '') {
                continue;
            }
            $this->upsert('mes_tool_assemblies', [
                'assembly_id' => $assemblyId,
                'parent_tool_id' => trim((string)($row['parent_tool_id'] ?? '')) ?: null,
                'component_tool_id' => trim((string)($row['component_tool_id'] ?? '')) ?: null,
                'component_role' => trim((string)($row['component_role'] ?? 'component')) ?: 'component',
                'quantity_required' => isset($row['quantity_required']) ? (float)$row['quantity_required'] : 1,
                'effective_from' => $this->parseTimestamp((string)($row['effective_from'] ?? '')) ?? date(DATE_ATOM),
                'effective_to' => $this->parseTimestamp((string)($row['effective_to'] ?? '')),
                'assembly_status' => strtolower(trim((string)($row['status'] ?? 'active'))),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['assembly_id'], ['metadata']);
        }
    }

    private function syncSalesOrders(array $rows, array $formLinks): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $salesOrderNumber = trim((string)($row['so_number'] ?? ''));
            $customerId = trim((string)($row['customer_id'] ?? ''));
            if ($salesOrderNumber === '' || $customerId === '') {
                continue;
            }
            $metadata = $row;
            $metadata['linked_forms'] = $this->linkedFormsForOrder($formLinks, 'so', $salesOrderNumber);
            $this->upsert('sales_orders', [
                'sales_order_number' => $salesOrderNumber,
                'so_status' => $this->mapSoStatus((string)($row['status'] ?? 'open')),
                'customer_id' => $customerId,
                'customer_po_number' => trim((string)($row['customer_po'] ?? '')) ?: null,
                'order_date' => $this->parseDate((string)($row['order_date'] ?? '')) ?? date('Y-m-d'),
                'requested_date' => $this->parseDate((string)($row['due_date'] ?? '')),
                'promise_date' => $this->parseDate((string)($row['due_date'] ?? '')),
                'priority_code' => $this->mapSoPriority((string)($row['priority'] ?? 'standard')),
                'metadata' => $metadata,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['sales_order_number'], ['metadata']);
        }
    }

    private function syncJobOrders(array $rows, array $formLinks): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $jobNumber = trim((string)($row['jo_number'] ?? ''));
            $itemId = trim((string)($row['part_number'] ?? ''));
            if ($jobNumber === '' || $itemId === '') {
                continue;
            }
            $metadata = $row;
            $metadata['linked_forms'] = $this->linkedFormsForOrder($formLinks, 'jo', $jobNumber);
            $this->upsert('job_orders', [
                'job_number' => $jobNumber,
                'job_status' => $this->mapJobStatus((string)($row['status'] ?? 'planned')),
                'item_id' => $itemId,
                'order_qty' => isset($row['qty_ordered']) ? (float)$row['qty_ordered'] : 0,
                'customer_id' => trim((string)($row['customer_id'] ?? '')) ?: null,
                'sales_order_ref' => trim((string)($row['so_number'] ?? '')) ?: null,
                'start_date_planned' => $this->parseDate((string)($row['start_date'] ?? '')),
                'end_date_planned' => $this->parseDate((string)($row['due_date'] ?? '')),
                'routing_revision_used' => trim((string)($row['part_revision'] ?? '')) ?: null,
                'planner_code' => trim((string)($row['planner_code'] ?? '')) ?: null,
                'metadata' => $metadata,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['job_number'], ['metadata']);
        }
    }

    private function syncWorkOrders(array $rows, array $jobOrders, array $salesOrders, array $formLinks): void
    {
        $jobIndex = [];
        foreach ($jobOrders as $jobOrder) {
            if (!is_array($jobOrder)) {
                continue;
            }
            $jobNumber = trim((string)($jobOrder['jo_number'] ?? ''));
            if ($jobNumber !== '') {
                $jobIndex[$jobNumber] = $jobOrder;
            }
        }

        $soIndex = [];
        foreach ($salesOrders as $salesOrder) {
            if (!is_array($salesOrder)) {
                continue;
            }
            $soNumber = trim((string)($salesOrder['so_number'] ?? ''));
            if ($soNumber !== '') {
                $soIndex[$soNumber] = $salesOrder;
            }
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $woNumber = trim((string)($row['wo_number'] ?? ''));
            $jobNumber = trim((string)($row['jo_number'] ?? ''));
            $operationSeq = (int)($row['operation_number'] ?? 0);
            if ($woNumber === '' || $jobNumber === '' || $operationSeq <= 0) {
                continue;
            }
            $jobOrderId = $this->findJobOrderId($jobNumber);
            if ($jobOrderId === null) {
                continue;
            }
            $jobRow = $jobIndex[$jobNumber] ?? [];
            $salesRow = $soIndex[(string)($jobRow['so_number'] ?? '')] ?? [];
            $metadata = $row;
            $metadata['linked_forms'] = $this->linkedFormsForOrder($formLinks, 'wo', $woNumber);

            $this->upsert('job_operations', [
                'job_order_id' => $jobOrderId,
                'operation_seq' => $operationSeq,
                'operation_code' => 'OP' . str_pad((string)$operationSeq, 2, '0', STR_PAD_LEFT),
                'description' => trim((string)($row['operation_desc'] ?? ('Operation ' . $operationSeq))),
                'work_center_id' => trim((string)($row['work_center_id'] ?? '')) ?: null,
                'machine_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'setup_time_planned' => isset($row['setup_time_est']) ? (float)$row['setup_time_est'] : null,
                'setup_time_actual' => isset($row['setup_time_actual']) ? (float)$row['setup_time_actual'] : null,
                'run_time_planned' => isset($row['run_time_est']) ? (float)$row['run_time_est'] : null,
                'run_time_actual' => isset($row['run_time_actual']) ? (float)$row['run_time_actual'] : null,
                'qty_completed' => isset($row['qty_completed']) ? (float)$row['qty_completed'] : 0,
                'qty_scrapped' => isset($row['qty_scrap']) ? (float)$row['qty_scrap'] : 0,
                'status' => strtolower(trim((string)($row['status'] ?? 'pending'))),
                'started_at' => $this->parseTimestamp((string)($row['actual_start'] ?? '')),
                'metadata' => $metadata,
            ], ['job_order_id', 'operation_seq'], ['metadata']);

            $priority = $this->mapSoPriority((string)($salesRow['priority'] ?? 'standard'));
            $dispatchPriority = match ($priority) {
                'aog' => 'AOG',
                'hot' => 'HOT',
                'rush' => 'RUSH',
                default => 'STANDARD',
            };
            $qtyToProduce = isset($jobRow['qty_ordered']) ? (float)$jobRow['qty_ordered'] : (isset($row['qty_completed']) ? (float)$row['qty_completed'] : 0);
            $this->upsert('mes_dispatch_queue', [
                'equipment_id' => trim((string)($row['machine_id'] ?? '')),
                'job_number' => $jobNumber,
                'operation_seq' => $operationSeq,
                'dispatch_priority' => $dispatchPriority,
                'sequence_in_queue' => $operationSeq,
                'scheduled_start' => $this->parseTimestamp((string)($row['scheduled_start'] ?? '')),
                'scheduled_end' => $this->parseTimestamp((string)($row['scheduled_end'] ?? '')),
                'est_setup_minutes' => isset($row['setup_time_est']) ? (float)$row['setup_time_est'] : null,
                'est_run_minutes' => isset($row['run_time_est']) ? (float)$row['run_time_est'] : null,
                'qty_to_produce' => $qtyToProduce,
                'queue_status' => $this->mapQueueStatus((string)($row['status'] ?? 'scheduled')),
                'material_available' => true,
                'tooling_available' => trim((string)($row['nc_program_id'] ?? '')) !== '',
                'fixture_available' => trim((string)($row['fixture_id'] ?? '')) !== '',
                'operator_qualified' => trim((string)($row['operator_id'] ?? '')) !== '',
                'priority_score' => match ($dispatchPriority) {
                    'AOG' => 1000,
                    'HOT' => 800,
                    'RUSH' => 600,
                    default => 400,
                },
                'metadata' => array_merge($metadata, ['wo_number' => $woNumber]),
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['equipment_id', 'job_number', 'operation_seq'], ['metadata']);
        }
    }

    private function syncToolRuntime(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $toolId = trim((string)($row['tool_id'] ?? ''));
            if ($toolId === '') {
                continue;
            }
            $description = trim((string)($row['tool_name'] ?? $toolId));
            $metadata = $row;
            $metadata['shadow_source'] = 'mes_runtime';
            $this->upsert('tools', [
                'tool_id' => $toolId,
                'tool_description' => $description,
                'tool_type' => $this->mapToolType((string)($row['tool_type'] ?? ''), $description),
                'tool_life_minutes' => isset($row['life_limit_minutes']) ? (int)$row['life_limit_minutes'] : null,
                'tool_life_remaining_pct' => $this->calculateRemainingPct($row),
                'tool_life_parts_count' => isset($row['life_used_parts']) ? (int)$row['life_used_parts'] : null,
                'tool_life_total_parts' => isset($row['life_limit_parts']) ? (int)$row['life_limit_parts'] : null,
                'tool_offset_length' => isset($row['offset_delta_mm']) ? (float)$row['offset_delta_mm'] : null,
                'tool_breakage_detected' => strtolower(trim((string)($row['tool_status'] ?? ''))) === 'broken',
                'tool_location' => $this->mapToolLocation((string)($row['tool_status'] ?? '')),
                'metadata' => $metadata,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['tool_id'], ['metadata']);
        }
    }

    private function syncConnectorAndSignals(array $feeds, array $signals, array $machines): void
    {
        $machineIndex = [];
        foreach ($machines as $row) {
            if (!is_array($row)) {
                continue;
            }
            $machineId = trim((string)($row['machine_id'] ?? ''));
            if ($machineId !== '') {
                $machineIndex[$machineId] = $row;
            }
        }

        $feedIndex = [];
        foreach ($feeds as $feed) {
            if (!is_array($feed)) {
                continue;
            }
            $machineId = trim((string)($feed['machine_id'] ?? ''));
            if ($machineId !== '') {
                $feedIndex[$machineId] = $feed;
            }
        }

        $signalIndex = [];
        foreach ($signals as $signal) {
            if (!is_array($signal)) {
                continue;
            }
            $machineId = trim((string)($signal['machine_id'] ?? ''));
            if ($machineId !== '') {
                $signalIndex[$machineId] = $signal;
            }
        }

        foreach (array_unique(array_merge(array_keys($machineIndex), array_keys($feedIndex), array_keys($signalIndex))) as $machineId) {
            $machine = $machineIndex[$machineId] ?? [];
            $feed = $feedIndex[$machineId] ?? [];
            $signal = $signalIndex[$machineId] ?? [];
            $metadata = [
                'machine' => $machine,
                'connector_feed' => $feed,
                'machine_signal' => $signal,
            ];
            $connectorType = strtolower(trim((string)($feed['connector_type'] ?? $machine['connector_type'] ?? '')));
            $currentState = $this->mapE10State((string)($signal['machine_state'] ?? ''));

            $this->upsert('mes_equipment_extended', [
                'equipment_id' => $machineId,
                'work_center_id' => trim((string)($machine['work_center_id'] ?? $feed['work_center_id'] ?? '')) ?: null,
                'mtconnect_agent_url' => $connectorType === 'mtconnect'
                    ? trim((string)($feed['connector_endpoint'] ?? $machine['connector_endpoint'] ?? '')) ?: null
                    : null,
                'opc_ua_endpoint' => in_array($connectorType, ['opcua', 'opc_ua'], true)
                    ? trim((string)($feed['connector_endpoint'] ?? $machine['connector_endpoint'] ?? '')) ?: null
                    : null,
                'controller_type' => trim((string)($feed['connector_name'] ?? $machine['connector_name'] ?? '')) ?: null,
                'current_e10_state' => $currentState,
                'current_program' => trim((string)($signal['current_program_id'] ?? '')) ?: null,
                'current_job_number' => trim((string)($signal['wo_number'] ?? '')) ?: null,
                'current_operator_id' => trim((string)($signal['operator_id'] ?? '')) ?: null,
                'last_heartbeat_at' => $this->parseTimestamp((string)($signal['last_heartbeat_at'] ?? $feed['last_heartbeat_at'] ?? '')),
                'metadata' => $metadata,
                'updated_at' => $this->parseTimestamp((string)($signal['updated_at'] ?? $feed['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['equipment_id'], ['metadata']);
        }
    }

    private function syncProgressReports(array $rows, array $workOrders): void
    {
        $workOrderIndex = [];
        foreach ($workOrders as $row) {
            if (!is_array($row)) {
                continue;
            }
            $woNumber = trim((string)($row['wo_number'] ?? ''));
            if ($woNumber !== '') {
                $workOrderIndex[$woNumber] = $row;
            }
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $woNumber = trim((string)($row['wo_number'] ?? ''));
            $wo = $workOrderIndex[$woNumber] ?? null;
            if (!is_array($wo)) {
                continue;
            }
            $jobNumber = trim((string)($wo['jo_number'] ?? ''));
            $operationSeq = (int)($wo['operation_number'] ?? 0);
            $equipmentId = trim((string)($row['machine_id'] ?? $wo['machine_id'] ?? ''));
            if ($jobNumber === '' || $operationSeq <= 0 || $equipmentId === '') {
                continue;
            }

            $this->upsert('mes_operation_execution', [
                'job_number' => $jobNumber,
                'operation_seq' => $operationSeq,
                'equipment_id' => $equipmentId,
                'run_start_at' => $this->parseTimestamp((string)($wo['actual_start'] ?? '')),
                'last_piece_at' => $this->parseTimestamp((string)($row['reported_at'] ?? '')),
                'qty_good' => isset($row['qty_completed']) ? (float)$row['qty_completed'] : 0,
                'qty_scrap' => isset($row['qty_scrap']) ? (float)$row['qty_scrap'] : 0,
                'setup_time_actual' => isset($row['setup_time_actual']) ? (float)$row['setup_time_actual'] : null,
                'run_time_actual' => isset($row['run_time_actual']) ? (float)$row['run_time_actual'] : null,
                'operator_id' => trim((string)($row['operator_id'] ?? '')) ?: null,
                'program_name' => trim((string)($wo['nc_program_id'] ?? '')) ?: null,
                'phase' => $this->mapOperationPhase((string)($row['status'] ?? 'setup')),
                'is_complete' => in_array(strtolower(trim((string)($row['status'] ?? ''))), ['completed', 'closed'], true),
                'metadata' => array_merge($row, ['wo_number' => $woNumber]),
                'updated_at' => $this->parseTimestamp((string)($row['reported_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['job_number', 'operation_seq', 'equipment_id'], ['metadata']);
        }
    }

    private function syncDowntimeEvents(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $shadowId = trim((string)($row['downtime_id'] ?? ''));
            $equipmentId = trim((string)($row['machine_id'] ?? ''));
            $startTime = $this->parseTimestamp((string)($row['started_at'] ?? ''));
            if ($shadowId === '' || $equipmentId === '' || $startTime === null) {
                continue;
            }

            $payload = [
                'start_time' => $startTime,
                'equipment_id' => $equipmentId,
                'end_time' => $this->parseTimestamp((string)($row['ended_at'] ?? '')),
                'duration_seconds' => $this->calculateDurationSeconds($row),
                'is_planned' => $this->boolish($row['planned_flag'] ?? false),
                'downtime_category' => trim((string)($row['category'] ?? '')) ?: null,
                'reason_code' => trim((string)($row['reason_code'] ?? '')) ?: null,
                'reason_text' => trim((string)($row['reason'] ?? $row['note'] ?? '')) ?: null,
                'resolved_by' => trim((string)($row['resolved_by'] ?? '')) ?: null,
                'resolution_action' => trim((string)($row['resolution_note'] ?? '')) ?: null,
                'operator_id' => trim((string)($row['reported_by'] ?? '')) ?: null,
                'shift_code' => $this->safeEnum((string)($row['shift_code'] ?? ''), ['A', 'B', 'C'], null),
                'metadata' => array_merge($row, ['shadow_id' => $shadowId]),
            ];

            $existing = $this->findExistingDowntime($shadowId);
            if ($existing) {
                $payload['downtime_id'] = (int)$existing['downtime_id'];
                $payload['start_time'] = (string)$existing['start_time'];
                $this->upsert('mes_downtime_events', $payload, ['downtime_id', 'start_time'], ['metadata']);
                continue;
            }

            $columns = array_keys($payload);
            $params = [];
            $placeholders = [];
            foreach ($columns as $index => $column) {
                $param = ':d' . $index;
                if ($column === 'metadata') {
                    $params[$param] = json_encode($payload[$column], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $placeholders[] = $param . '::jsonb';
                    continue;
                }
                $params[$param] = $payload[$column];
                $placeholders[] = $param;
            }
            $sql = sprintf(
                'INSERT INTO mes_downtime_events (%s) VALUES (%s)',
                implode(', ', $columns),
                implode(', ', $placeholders),
            );
            $this->db->execute($sql, $params);
        }
    }

    private function syncMaintenanceRequests(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $requestId = trim((string)($row['request_id'] ?? ''));
            $equipmentId = trim((string)($row['machine_id'] ?? ''));
            if ($requestId === '' || $equipmentId === '') {
                continue;
            }
            $this->upsert('maintenance_work_orders', [
                'work_order_id' => $requestId,
                'wo_type' => $this->mapMaintType((string)($row['maintenance_type'] ?? 'corrective')),
                'wo_status' => $this->mapMaintStatus((string)($row['status'] ?? 'requested')),
                'equipment_id' => $equipmentId,
                'priority' => $this->mapMaintPriority((string)($row['priority'] ?? 'normal')),
                'scheduled_end' => $this->parseTimestamp((string)($row['due_date'] ?? '')),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? $row['requested_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['work_order_id'], ['metadata']);
        }
    }

    private function syncConnectivityEvents(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $eventId = trim((string)($row['adapter_event_id'] ?? ''));
            if ($eventId === '') {
                continue;
            }
            $this->upsert('mes_connectivity_events', [
                'adapter_event_id' => $eventId,
                'adapter_id' => trim((string)($row['adapter_id'] ?? '')) ?: null,
                'equipment_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'event_time' => $this->parseTimestamp((string)($row['event_time'] ?? '')) ?? date(DATE_ATOM),
                'event_type' => trim((string)($row['event_type'] ?? 'heartbeat')) ?: 'heartbeat',
                'severity' => strtoupper(trim((string)($row['severity'] ?? 'WARNING'))),
                'event_status' => strtolower(trim((string)($row['status'] ?? 'open'))),
                'message' => trim((string)($row['message'] ?? '')),
                'payload_excerpt' => is_array($row['payload_excerpt'] ?? null) ? $row['payload_excerpt'] : [],
                'acknowledged_by' => trim((string)($row['acknowledged_by'] ?? '')) ?: null,
                'acknowledged_at' => $this->parseTimestamp((string)($row['acknowledged_at'] ?? '')),
                'metadata' => $row,
                'recorded_by' => trim((string)($row['recorded_by'] ?? '')) ?: null,
                'recorded_at' => $this->parseTimestamp((string)($row['recorded_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['adapter_event_id'], ['payload_excerpt', 'metadata']);
        }
    }

    private function syncMachineAlarmRuntime(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $alarmTime = $this->parseTimestamp((string)($row['alarm_time'] ?? ''));
            $equipmentId = trim((string)($row['machine_id'] ?? ''));
            $alarmCode = trim((string)($row['alarm_code'] ?? ''));
            if ($alarmTime === null || $equipmentId === '' || $alarmCode === '') {
                continue;
            }
            $this->upsert('mes_machine_alarms', [
                'alarm_time' => $alarmTime,
                'equipment_id' => $equipmentId,
                'alarm_code' => $alarmCode,
                'alarm_text' => trim((string)($row['alarm_text'] ?? '')) ?: null,
                'alarm_severity' => strtoupper(trim((string)($row['severity'] ?? 'ALARM'))),
                'alarm_group' => trim((string)($row['alarm_group'] ?? '')) ?: null,
                'is_active' => $this->safeBool($row['active_flag'] ?? true),
                'is_acknowledged' => trim((string)($row['acknowledged_by'] ?? '')) !== '',
                'acknowledged_by' => trim((string)($row['acknowledged_by'] ?? '')) ?: null,
                'acknowledged_at' => $this->parseTimestamp((string)($row['acknowledged_at'] ?? '')),
                'escalation_status' => trim((string)($row['escalation_status'] ?? '')) ?: null,
                'escalated_by' => trim((string)($row['escalated_by'] ?? '')) ?: null,
                'escalated_at' => $this->parseTimestamp((string)($row['escalated_at'] ?? '')),
                'cleared_at' => $this->parseTimestamp((string)($row['cleared_at'] ?? '')),
                'cleared_by' => trim((string)($row['cleared_by'] ?? '')) ?: null,
                'related_job_number' => trim((string)($row['wo_number'] ?? '')) ?: null,
                'metadata' => $row,
            ], ['alarm_time', 'equipment_id', 'alarm_code'], ['metadata']);
        }
    }

    private function syncNcDownloadReceipts(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $receiptId = trim((string)($row['receipt_id'] ?? ''));
            if ($receiptId === '') {
                continue;
            }
            $this->upsert('mes_nc_download_receipts', [
                'receipt_id' => $receiptId,
                'package_id' => trim((string)($row['package_id'] ?? $row['program_id'] ?? '')) ?: null,
                'program_id' => trim((string)($row['program_id'] ?? '')) ?: null,
                'equipment_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'work_order_number' => trim((string)($row['wo_number'] ?? '')) ?: null,
                'downloaded_at' => $this->parseTimestamp((string)($row['downloaded_at'] ?? '')) ?? date(DATE_ATOM),
                'controller_program_name' => trim((string)($row['controller_program_name'] ?? '')) ?: null,
                'controller_checksum' => trim((string)($row['controller_checksum'] ?? '')) ?: null,
                'expected_checksum' => trim((string)($row['expected_checksum'] ?? '')) ?: null,
                'verified_match' => $this->safeBool($row['verified_match'] ?? false),
                'receipt_status' => strtolower(trim((string)($row['receipt_status'] ?? 'pending'))),
                'acknowledged_by' => trim((string)($row['acknowledged_by'] ?? '')) ?: null,
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['receipt_id'], ['metadata']);
        }
    }

    private function syncToolPresetOffsets(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $presetId = trim((string)($row['preset_id'] ?? ''));
            if ($presetId === '') {
                continue;
            }
            $this->upsert('mes_tool_preset_offsets', [
                'preset_id' => $presetId,
                'tool_id' => trim((string)($row['tool_id'] ?? '')) ?: null,
                'equipment_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'work_order_number' => trim((string)($row['wo_number'] ?? '')) ?: null,
                'offset_number' => trim((string)($row['offset_number'] ?? '')) ?: null,
                'preset_length_mm' => isset($row['preset_length_mm']) ? (float)$row['preset_length_mm'] : null,
                'preset_diameter_mm' => isset($row['preset_diameter_mm']) ? (float)$row['preset_diameter_mm'] : null,
                'wear_offset_mm' => isset($row['wear_offset_mm']) ? (float)$row['wear_offset_mm'] : null,
                'offset_drift_mm' => isset($row['offset_drift_mm']) ? (float)$row['offset_drift_mm'] : null,
                'measurement_source' => trim((string)($row['measurement_source'] ?? 'presetter')) ?: 'presetter',
                'measured_at' => $this->parseTimestamp((string)($row['measured_at'] ?? '')) ?? date(DATE_ATOM),
                'measured_by' => trim((string)($row['measured_by'] ?? '')) ?: null,
                'verified_status' => strtolower(trim((string)($row['verified_status'] ?? 'verified'))),
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['preset_id'], ['metadata']);
        }
    }

    private function syncMaterialConsumption(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $consumptionId = trim((string)($row['consumption_id'] ?? ''));
            $jobNumber = trim((string)($row['wo_number'] ?? '')) ?: trim((string)($row['job_number'] ?? ''));
            $itemId = trim((string)($row['part_number'] ?? $row['item_id'] ?? ''));
            if ($consumptionId === '' || $jobNumber === '' || $itemId === '') {
                continue;
            }
            $this->upsert('mes_material_consumption', [
                'consumption_id' => $consumptionId,
                'consumed_at' => $this->parseTimestamp((string)($row['consumed_at'] ?? '')) ?? date(DATE_ATOM),
                'job_number' => $jobNumber,
                'operation_seq' => (int)($row['operation_number'] ?? $row['operation_seq'] ?? 0),
                'equipment_id' => trim((string)($row['machine_id'] ?? '')) ?: null,
                'item_id' => $itemId,
                'lot_number' => trim((string)($row['lot_number'] ?? '')) ?: null,
                'heat_number' => trim((string)($row['heat_number'] ?? '')) ?: null,
                'material_cert_number' => trim((string)($row['material_cert_number'] ?? '')) ?: null,
                'consumption_type' => strtoupper(trim((string)($row['consumption_type'] ?? 'CONSUMED'))),
                'qty_consumed' => isset($row['qty_consumed']) ? (float)$row['qty_consumed'] : 0,
                'qty_uom' => trim((string)($row['qty_uom'] ?? 'EA')) ?: 'EA',
                'operator_id' => trim((string)($row['verified_by'] ?? $row['issued_by'] ?? '')) ?: null,
                'metadata' => $row,
                'created_at' => $this->parseTimestamp((string)($row['updated_at'] ?? $row['consumed_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['consumption_id'], ['metadata']);
        }
    }

    private function syncPartGenealogy(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $genealogyId = trim((string)($row['genealogy_id'] ?? ''));
            $jobNumber = trim((string)($row['wo_number'] ?? ''));
            $itemId = trim((string)($row['part_number'] ?? ''));
            if ($genealogyId === '' || $jobNumber === '' || $itemId === '') {
                continue;
            }
            $this->upsert('mes_part_genealogy', [
                'genealogy_id' => $genealogyId,
                'job_number' => $jobNumber,
                'item_id' => $itemId,
                'part_rev' => trim((string)($row['part_revision'] ?? '')) ?: null,
                'serial_number' => trim((string)($row['serial_number'] ?? '')) ?: null,
                'lot_number' => trim((string)($row['lot_number'] ?? '')) ?: null,
                'raw_material_lot' => trim((string)($row['material_lot_number'] ?? '')) ?: null,
                'raw_material_heat' => trim((string)($row['raw_material_heat'] ?? '')) ?: null,
                'operations_completed' => isset($row['completed_qty']) ? (int)$row['completed_qty'] : null,
                'metadata' => $row,
                'updated_at' => $this->parseTimestamp((string)($row['recorded_at'] ?? $row['updated_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['genealogy_id'], ['metadata']);
        }
    }

    private function syncShiftHandover(array $rows): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $handoverId = trim((string)($row['handover_id'] ?? ''));
            $equipmentId = trim((string)($row['machine_id'] ?? ''));
            $shiftFrom = trim((string)($row['shift_from'] ?? ''));
            $shiftTo = trim((string)($row['shift_to'] ?? ''));
            $operatorFrom = trim((string)($row['operator_from'] ?? ''));
            if ($handoverId === '' || $equipmentId === '' || $shiftFrom === '' || $shiftTo === '' || $operatorFrom === '') {
                continue;
            }
            $this->upsert('mes_shift_handover', [
                'handover_id' => $handoverId,
                'equipment_id' => $equipmentId,
                'handover_date' => $this->parseDate((string)($row['handover_date'] ?? '')),
                'shift_from' => $shiftFrom,
                'shift_to' => $shiftTo,
                'operator_from' => $operatorFrom,
                'operator_to' => trim((string)($row['operator_to'] ?? '')) ?: null,
                'job_in_progress' => trim((string)($row['wo_number'] ?? '')) ?: null,
                'operation_in_progress' => isset($row['operation_number']) ? (int)$row['operation_number'] : null,
                'parts_completed' => isset($row['parts_completed']) ? (float)$row['parts_completed'] : null,
                'machine_state' => trim((string)($row['machine_state'] ?? '')) ?: null,
                'issues_noted' => trim((string)($row['issues_noted'] ?? '')) ?: null,
                'pending_actions' => trim((string)($row['pending_actions'] ?? '')) ?: null,
                'quality_alerts' => trim((string)($row['quality_alerts'] ?? '')) ?: null,
                'tooling_status' => trim((string)($row['tooling_status'] ?? '')) ?: null,
                'acknowledged_at' => $this->parseTimestamp((string)($row['acknowledged_at'] ?? '')),
                'metadata' => $row,
                'created_at' => $this->parseTimestamp((string)($row['created_at'] ?? '')) ?? date(DATE_ATOM),
            ], ['handover_id'], ['metadata']);
        }
    }

    private function syncVariableMirror(string $category, array $rows, string $keyField, string $labelField): void
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $key = trim((string)($row[$keyField] ?? ''));
            if ($key === '') {
                continue;
            }
            $label = trim((string)($row[$labelField] ?? $key));
            $this->upsert('variable_registry', [
                'category' => $category,
                'key' => $key,
                'label' => $label,
                'label_vi' => trim((string)($row['label_vi'] ?? $row['reason_name_vi'] ?? $label)),
                'data_type' => 'json',
                'source' => 'runtime_shadow',
                'description' => substr($label, 0, 300),
                'example' => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'required' => false,
                'enum_values' => null,
                'used_in' => null,
                'validation' => null,
                'format' => null,
            ], ['category', 'key']);
        }
    }

    private function upsert(string $table, array $row, array $conflictColumns, array $jsonbColumns = []): void
    {
        if ($row === []) {
            return;
        }

        $columns = array_keys($row);
        $params = [];
        $placeholders = [];
        foreach ($columns as $index => $column) {
            $param = ':p' . $index;
            $value = $row[$column];
            if (in_array($column, $jsonbColumns, true) && $value !== null) {
                $params[$param] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $placeholders[] = $param . '::jsonb';
                continue;
            }
            $params[$param] = $value;
            $placeholders[] = $param;
        }

        $updates = [];
        foreach ($columns as $column) {
            if (in_array($column, $conflictColumns, true)) {
                continue;
            }
            $updates[] = $column . ' = EXCLUDED.' . $column;
        }
        if ($updates === []) {
            $updates[] = $conflictColumns[0] . ' = EXCLUDED.' . $conflictColumns[0];
        }

        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s',
            $table,
            implode(', ', $columns),
            implode(', ', $placeholders),
            implode(', ', $conflictColumns),
            implode(', ', $updates),
        );

        $this->db->execute($sql, $params);
    }

    private function findJobOrderId(string $jobNumber): ?string
    {
        $row = $this->db->queryOne(
            'SELECT job_order_id FROM job_orders WHERE job_number = :job_number',
            [':job_number' => $jobNumber],
        );
        return is_array($row) ? (string)($row['job_order_id'] ?? '') ?: null : null;
    }

    private function findExistingDowntime(string $shadowId): ?array
    {
        return $this->db->queryOne(
            "SELECT downtime_id, start_time
             FROM mes_downtime_events
             WHERE metadata->>'shadow_id' = :shadow_id
             ORDER BY start_time DESC
             LIMIT 1",
            [':shadow_id' => $shadowId],
        );
    }

    private function linkedFormsForOrder(array $formLinks, string $orderType, string $orderId): array
    {
        $matches = [];
        foreach ($formLinks as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row['order_type'] ?? '') !== $orderType) {
                continue;
            }
            if ((string)($row['order_id'] ?? '') !== $orderId) {
                continue;
            }
            $matches[] = $row;
        }
        return array_values($matches);
    }

    private function calculateRemainingPct(array $row): ?float
    {
        if (isset($row['tool_life_remaining_pct'])) {
            return (float)$row['tool_life_remaining_pct'];
        }
        $limitMinutes = isset($row['life_limit_minutes']) ? (float)$row['life_limit_minutes'] : 0.0;
        $usedMinutes = isset($row['life_used_minutes']) ? (float)$row['life_used_minutes'] : 0.0;
        if ($limitMinutes > 0) {
            return max(0.0, min(100.0, (1 - ($usedMinutes / $limitMinutes)) * 100));
        }
        $limitParts = isset($row['life_limit_parts']) ? (float)$row['life_limit_parts'] : 0.0;
        $usedParts = isset($row['life_used_parts']) ? (float)$row['life_used_parts'] : 0.0;
        if ($limitParts > 0) {
            return max(0.0, min(100.0, (1 - ($usedParts / $limitParts)) * 100));
        }
        return null;
    }

    private function calculateDurationSeconds(array $row): ?float
    {
        if (isset($row['duration_seconds'])) {
            return (float)$row['duration_seconds'];
        }
        if (isset($row['duration_minutes'])) {
            return (float)$row['duration_minutes'] * 60.0;
        }
        $start = $this->parseTimestamp((string)($row['started_at'] ?? ''));
        $end = $this->parseTimestamp((string)($row['ended_at'] ?? ''));
        if ($start !== null && $end !== null) {
            $delta = strtotime($end) - strtotime($start);
            return $delta >= 0 ? (float)$delta : null;
        }
        return null;
    }

    private function workCenterDeptMap(array $workCenters): array
    {
        $map = [];
        foreach ($workCenters as $row) {
            if (!is_array($row)) {
                continue;
            }
            $workCenterId = trim((string)($row['work_center_id'] ?? ''));
            if ($workCenterId === '') {
                continue;
            }
            $map[$workCenterId] = $this->mapDept((string)($row['department'] ?? ''));
        }
        return $map;
    }

    private function parseDate(?string $value): ?string
    {
        $value = trim((string)$value);
        if ($value === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
            return $value;
        }
        $timestamp = strtotime($value);
        return $timestamp === false ? null : date('Y-m-d', $timestamp);
    }

    private function parseTimestamp(?string $value): ?string
    {
        $value = trim((string)$value);
        if ($value === '') {
            return null;
        }
        $timestamp = strtotime($value);
        return $timestamp === false ? null : date(DATE_ATOM, $timestamp);
    }

    private function boolish(mixed $value, bool $default = false): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return ((float)$value) > 0;
        }
        $normalized = strtolower(trim((string)$value));
        if (in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'n', 'off'], true)) {
            return false;
        }
        return $default;
    }

    private function safeBool(mixed $value, bool $default = false): bool
    {
        return $this->boolish($value, $default);
    }

    private function safeArray(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }

    private function safeEnum(?string $value, array $allowed, ?string $default = null): ?string
    {
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            return $default;
        }
        foreach ($allowed as $candidate) {
            if (strtolower($candidate) === $normalized) {
                return $candidate;
            }
        }
        return $default;
    }

    private function mapCustomerType(?string $value): ?string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'oem' => 'oem',
            'tier 1', 'tier1' => 'tier1',
            'tier 2', 'tier2' => 'tier2',
            'distributor' => 'distributor',
            'government', 'gov' => 'government',
            'military', 'defense' => 'military',
            default => null,
        };
    }

    private function mapVendorType(?string $value): ?string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'material', 'raw_material', 'raw material' => 'material',
            'subcontract', 'special_process', 'special process' => 'subcontract',
            'service', 'calibration', 'maintenance' => 'service',
            'distributor' => 'distributor',
            'oem' => 'oem',
            default => null,
        };
    }

    private function mapVendorStatus(?string $value): ?string
    {
        return $this->safeEnum($value, ['approved', 'conditional', 'probation', 'disqualified', 'pending'], 'pending');
    }

    private function mapItemStatus(?string $value): string
    {
        return 'active';
    }

    private function mapDept(?string $value): ?string
    {
        $normalized = strtoupper(trim((string)$value));
        return in_array($normalized, ['QA', 'PRO', 'ENG', 'SCM', 'HR', 'EXE', 'SAL', 'WH', 'IT', 'EHS'], true) ? $normalized : null;
    }

    private function mapWorkCenterType(array $row): string
    {
        $processFamily = strtolower(trim((string)($row['process_family'] ?? '')));
        return match ($processFamily) {
            'inspection', 'cmm' => 'inspection',
            'maintenance', 'manual' => 'manual',
            'subcontract' => 'subcontract',
            default => 'machine',
        };
    }

    private function mapEquipmentType(?string $value): ?string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            '5-axis', '3-axis', 'mill', 'vmc' => 'cnc_mill',
            'lathe', 'turn', 'cnc lathe' => 'cnc_lathe',
            'grinder', 'grinding' => 'cnc_grinder',
            'edm' => 'edm',
            'cmm', 'inspection' => 'cmm',
            default => null,
        };
    }

    private function mapMachineType(?string $value): ?string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            '5-axis', '5 axis', '5-axis mill' => '5-Axis Mill',
            '3-axis', '3 axis', '3-axis mill', 'vmc' => '3-Axis Mill',
            'lathe', 'turn', 'cnc lathe' => 'CNC Lathe',
            'mill-turn', 'mill turn' => 'Mill-Turn',
            'edm' => 'EDM',
            'grinder', 'grinding' => 'Grinder',
            'cmm', 'inspection' => 'CMM',
            default => null,
        };
    }

    private function mapToolType(?string $value, ?string $toolName = null): ?string
    {
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '' && $toolName !== null) {
            $normalized = strtolower($toolName);
        }
        return match (true) {
            str_contains($normalized, 'endmill'), str_contains($normalized, 'end mill') => 'end_mill',
            str_contains($normalized, 'drill') => 'drill',
            str_contains($normalized, 'reamer') => 'reamer',
            str_contains($normalized, 'tap') => 'tap',
            str_contains($normalized, 'insert') => 'insert',
            str_contains($normalized, 'boring') => 'boring_bar',
            str_contains($normalized, 'face mill') => 'face_mill',
            str_contains($normalized, 'thread mill') => 'thread_mill',
            str_contains($normalized, 'slitting') => 'slitting_saw',
            default => 'special',
        };
    }

    private function mapToolLocation(?string $value): ?string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'loaded', 'machine' => 'machine',
            'presetter' => 'presetter',
            'regrind' => 'regrind',
            'scrap' => 'scrap',
            default => 'crib',
        };
    }

    private function mapSoStatus(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'confirmed', 'released' => 'released',
            'in_production', 'in production', 'active', 'running' => 'in_progress',
            'shipped' => 'shipped',
            'closed', 'complete', 'completed' => 'closed',
            'cancelled', 'canceled' => 'cancelled',
            default => 'open',
        };
    }

    private function mapSoPriority(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'aog', 'critical' => 'aog',
            'hot', 'high' => 'hot',
            'rush', 'urgent' => 'rush',
            default => 'standard',
        };
    }

    private function mapJobStatus(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'engineered' => 'engineered',
            'released' => 'released',
            'active', 'running', 'inspection' => 'active',
            'on_hold', 'hold' => 'on_hold',
            'completed', 'complete' => 'completed',
            'closed' => 'closed',
            default => 'planned',
        };
    }

    private function mapQueueStatus(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'ready', 'setup' => 'READY',
            'running', 'inspection' => 'IN_PROGRESS',
            'completed', 'closed' => 'DONE',
            'on_hold', 'hold' => 'HOLD',
            default => 'QUEUED',
        };
    }

    private function mapOperationPhase(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'inspection', 'first_piece', 'first piece' => 'FIRST_PIECE',
            'running', 'active', 'in_progress' => 'PRODUCTION_RUN',
            'completed', 'last_piece' => 'LAST_PIECE',
            'teardown' => 'TEARDOWN',
            default => 'SETUP',
        };
    }

    private function mapMaintType(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'preventive', 'pm' => 'preventive',
            'predictive' => 'predictive',
            'emergency' => 'emergency',
            'calibration' => 'calibration',
            'modification' => 'modification',
            default => 'corrective',
        };
    }

    private function mapMaintStatus(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'planned', 'approved' => 'planned',
            'scheduled' => 'scheduled',
            'in_progress', 'running', 'active' => 'in_progress',
            'completed', 'closed' => 'completed',
            'cancelled', 'canceled' => 'cancelled',
            default => 'requested',
        };
    }

    private function mapMaintPriority(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'emergency', 'critical' => 'emergency',
            'urgent', 'high' => 'urgent',
            'low' => 'low',
            default => 'normal',
        };
    }

    private function mapE10State(?string $value): string
    {
        $normalized = strtolower(trim((string)$value));
        return match ($normalized) {
            'running', 'production', 'inspection' => 'PRODUCTIVE',
            'setup', 'idle', 'waiting', 'ready' => 'STANDBY',
            'maintenance', 'pm' => 'SCHEDULED_DOWN',
            'down', 'alarm', 'fault', 'stopped' => 'UNSCHEDULED_DOWN',
            'engineering', 'debug' => 'ENGINEERING',
            default => 'NON_SCHEDULED',
        };
    }
}
