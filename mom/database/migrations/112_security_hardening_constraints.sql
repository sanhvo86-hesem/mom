-- ============================================================================
-- Migration 112: Security Hardening - Missing NOT NULL Constraints (defensive)
-- ============================================================================
-- Purpose:
--   Add NOT NULL constraints on critical columns to enforce data integrity.
--   Uses a defensive helper that skips any column that does not exist in the
--   live schema or that still contains NULL values (safe for partial schemas).
-- ============================================================================

BEGIN;

-- Defensive helper: set NOT NULL only when (a) column exists and (b) has no NULLs
CREATE OR REPLACE FUNCTION _m112_safe_set_not_null(p_table text, p_col text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_count bigint;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_col
    ) THEN RETURN; END IF;
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I IS NULL', p_table, p_col) INTO v_count;
    IF v_count > 0 THEN
        RAISE NOTICE 'Skipping %.%: % NULL rows', p_table, p_col, v_count;
        RETURN;
    END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', p_table, p_col);
END;
$$;

-- User and authentication
SELECT _m112_safe_set_not_null('users', 'email');
SELECT _m112_safe_set_not_null('users', 'employee_id');
SELECT _m112_safe_set_not_null('users', 'created_at');
SELECT _m112_safe_set_not_null('users', 'updated_at');
SELECT _m112_safe_set_not_null('sessions', 'user_id');
SELECT _m112_safe_set_not_null('sessions', 'created_at');
SELECT _m112_safe_set_not_null('sessions', 'expires_at');

-- Document management
SELECT _m112_safe_set_not_null('documents', 'doc_id');
SELECT _m112_safe_set_not_null('documents', 'created_at');
SELECT _m112_safe_set_not_null('documents', 'updated_at');
SELECT _m112_safe_set_not_null('document_versions', 'doc_id');
SELECT _m112_safe_set_not_null('document_versions', 'version_number');
SELECT _m112_safe_set_not_null('document_versions', 'created_at');

-- Form management
SELECT _m112_safe_set_not_null('form_entries', 'form_code');
SELECT _m112_safe_set_not_null('form_entries', 'form_version');
SELECT _m112_safe_set_not_null('form_entries', 'created_at');
SELECT _m112_safe_set_not_null('form_attachments', 'entry_id');
SELECT _m112_safe_set_not_null('form_attachments', 'created_at');

-- Record management
SELECT _m112_safe_set_not_null('records', 'record_id');
SELECT _m112_safe_set_not_null('records', 'record_type');
SELECT _m112_safe_set_not_null('records', 'created_at');
SELECT _m112_safe_set_not_null('records', 'updated_at');

-- Item master
SELECT _m112_safe_set_not_null('items', 'item_id');
SELECT _m112_safe_set_not_null('items', 'item_description');
SELECT _m112_safe_set_not_null('items', 'item_status');
SELECT _m112_safe_set_not_null('items', 'created_at');
SELECT _m112_safe_set_not_null('items', 'updated_at');
SELECT _m112_safe_set_not_null('item_revisions', 'item_id');
SELECT _m112_safe_set_not_null('item_revisions', 'created_at');

-- BOM
SELECT _m112_safe_set_not_null('bill_of_materials', 'bom_id');
SELECT _m112_safe_set_not_null('bill_of_materials', 'parent_item_id');
SELECT _m112_safe_set_not_null('bill_of_materials', 'bom_status');
SELECT _m112_safe_set_not_null('bill_of_materials', 'created_at');
SELECT _m112_safe_set_not_null('bom_components', 'bom_id');
SELECT _m112_safe_set_not_null('bom_components', 'bom_revision');
SELECT _m112_safe_set_not_null('bom_components', 'component_item_id');
SELECT _m112_safe_set_not_null('bom_components', 'quantity');
SELECT _m112_safe_set_not_null('bom_components', 'created_at');

-- Work center and routing
SELECT _m112_safe_set_not_null('work_centers', 'work_center_id');
SELECT _m112_safe_set_not_null('work_centers', 'work_center_name');
SELECT _m112_safe_set_not_null('work_centers', 'created_at');
SELECT _m112_safe_set_not_null('routings', 'routing_id');
SELECT _m112_safe_set_not_null('routings', 'item_id');
SELECT _m112_safe_set_not_null('routings', 'created_at');
SELECT _m112_safe_set_not_null('routing_operations', 'routing_id');
SELECT _m112_safe_set_not_null('routing_operations', 'routing_revision');
SELECT _m112_safe_set_not_null('routing_operations', 'operation_sequence');
SELECT _m112_safe_set_not_null('routing_operations', 'created_at');

-- Customer and sales
SELECT _m112_safe_set_not_null('customers', 'customer_id');
SELECT _m112_safe_set_not_null('customers', 'customer_name');
SELECT _m112_safe_set_not_null('customers', 'created_at');
SELECT _m112_safe_set_not_null('customers', 'updated_at');
SELECT _m112_safe_set_not_null('sales_orders', 'customer_id');
SELECT _m112_safe_set_not_null('sales_orders', 'order_date');
SELECT _m112_safe_set_not_null('sales_orders', 'created_at');
SELECT _m112_safe_set_not_null('sales_order_lines', 'sales_order_id');
SELECT _m112_safe_set_not_null('sales_order_lines', 'item_id');
SELECT _m112_safe_set_not_null('sales_order_lines', 'order_quantity');
SELECT _m112_safe_set_not_null('sales_order_lines', 'created_at');

-- Vendor and procurement
SELECT _m112_safe_set_not_null('vendors', 'vendor_id');
SELECT _m112_safe_set_not_null('vendors', 'vendor_name');
SELECT _m112_safe_set_not_null('vendors', 'created_at');
SELECT _m112_safe_set_not_null('vendors', 'updated_at');
SELECT _m112_safe_set_not_null('vendor_ratings', 'vendor_id');
SELECT _m112_safe_set_not_null('vendor_ratings', 'rating_date');
SELECT _m112_safe_set_not_null('vendor_ratings', 'created_at');
SELECT _m112_safe_set_not_null('purchase_orders', 'vendor_id');
SELECT _m112_safe_set_not_null('purchase_orders', 'po_date');
SELECT _m112_safe_set_not_null('purchase_orders', 'created_at');
SELECT _m112_safe_set_not_null('purchase_order_lines', 'po_id');
SELECT _m112_safe_set_not_null('purchase_order_lines', 'item_id');
SELECT _m112_safe_set_not_null('purchase_order_lines', 'po_quantity');
SELECT _m112_safe_set_not_null('purchase_order_lines', 'created_at');

-- Warehouse and inventory
SELECT _m112_safe_set_not_null('warehouses', 'warehouse_id');
SELECT _m112_safe_set_not_null('warehouses', 'warehouse_name');
SELECT _m112_safe_set_not_null('warehouses', 'created_at');
SELECT _m112_safe_set_not_null('inventory_locations', 'location_id');
SELECT _m112_safe_set_not_null('inventory_locations', 'warehouse_id');
SELECT _m112_safe_set_not_null('lot_master', 'lot_number');
SELECT _m112_safe_set_not_null('lot_master', 'item_id');
SELECT _m112_safe_set_not_null('lot_master', 'created_at');
SELECT _m112_safe_set_not_null('serial_master', 'serial_number');
SELECT _m112_safe_set_not_null('serial_master', 'item_id');
SELECT _m112_safe_set_not_null('serial_master', 'created_at');
SELECT _m112_safe_set_not_null('inventory_transactions', 'warehouse_id');
SELECT _m112_safe_set_not_null('inventory_transactions', 'item_id');
SELECT _m112_safe_set_not_null('inventory_transactions', 'txn_type');
SELECT _m112_safe_set_not_null('inventory_transactions', 'recorded_at');

-- Job orders
SELECT _m112_safe_set_not_null('job_orders', 'item_id');
SELECT _m112_safe_set_not_null('job_orders', 'job_qty');
SELECT _m112_safe_set_not_null('job_orders', 'created_at');
SELECT _m112_safe_set_not_null('job_operations', 'job_order_id');
SELECT _m112_safe_set_not_null('job_operations', 'operation_seq');
SELECT _m112_safe_set_not_null('job_operations', 'created_at');
SELECT _m112_safe_set_not_null('labor_transactions', 'employee_id');
SELECT _m112_safe_set_not_null('labor_transactions', 'recorded_at');
SELECT _m112_safe_set_not_null('production_schedule', 'created_at');

-- Quality
SELECT _m112_safe_set_not_null('inspection_plans', 'inspection_plan_id');
SELECT _m112_safe_set_not_null('inspection_plans', 'created_at');
SELECT _m112_safe_set_not_null('inspection_results', 'recorded_at');
SELECT _m112_safe_set_not_null('spc_data', 'item_id');
SELECT _m112_safe_set_not_null('spc_data', 'created_at');
SELECT _m112_safe_set_not_null('ncr_records', 'record_id');
SELECT _m112_safe_set_not_null('ncr_records', 'created_at');
SELECT _m112_safe_set_not_null('capa_records', 'record_id');
SELECT _m112_safe_set_not_null('capa_records', 'created_at');
SELECT _m112_safe_set_not_null('fai_records', 'record_id');
SELECT _m112_safe_set_not_null('fai_records', 'created_at');
SELECT _m112_safe_set_not_null('fai_characteristics', 'fai_id');
SELECT _m112_safe_set_not_null('fai_characteristics', 'characteristic_name');
SELECT _m112_safe_set_not_null('fai_characteristics', 'created_at');
SELECT _m112_safe_set_not_null('certificates', 'created_at');
SELECT _m112_safe_set_not_null('npi_projects', 'created_at');
SELECT _m112_safe_set_not_null('ehs_incidents', 'created_at');
SELECT _m112_safe_set_not_null('contamination_checks', 'created_at');
SELECT _m112_safe_set_not_null('engineering_change_requests', 'ecr_number');
SELECT _m112_safe_set_not_null('engineering_change_requests', 'created_at');

-- Equipment and maintenance
SELECT _m112_safe_set_not_null('equipment', 'equipment_id');
SELECT _m112_safe_set_not_null('equipment', 'equipment_name');
SELECT _m112_safe_set_not_null('equipment', 'created_at');
SELECT _m112_safe_set_not_null('calibration_records', 'equipment_id');
SELECT _m112_safe_set_not_null('calibration_records', 'calibration_date');
SELECT _m112_safe_set_not_null('calibration_records', 'created_at');
SELECT _m112_safe_set_not_null('maintenance_work_orders', 'equipment_id');
SELECT _m112_safe_set_not_null('maintenance_work_orders', 'work_order_id');
SELECT _m112_safe_set_not_null('maintenance_work_orders', 'created_at');
SELECT _m112_safe_set_not_null('tools', 'tool_id');
SELECT _m112_safe_set_not_null('tools', 'tool_name');
SELECT _m112_safe_set_not_null('tools', 'created_at');
SELECT _m112_safe_set_not_null('tool_transactions', 'tool_id');
SELECT _m112_safe_set_not_null('tool_transactions', 'txn_type');
SELECT _m112_safe_set_not_null('tool_transactions', 'created_at');

-- HR
SELECT _m112_safe_set_not_null('employees', 'employee_id');
SELECT _m112_safe_set_not_null('employees', 'employee_name');
SELECT _m112_safe_set_not_null('employees', 'created_at');
SELECT _m112_safe_set_not_null('training_records', 'created_at');
SELECT _m112_safe_set_not_null('skills_matrix', 'employee_id');
SELECT _m112_safe_set_not_null('skills_matrix', 'skill_name');
SELECT _m112_safe_set_not_null('skills_matrix', 'created_at');
SELECT _m112_safe_set_not_null('employee_certifications', 'employee_id');
SELECT _m112_safe_set_not_null('employee_certifications', 'certification_name');
SELECT _m112_safe_set_not_null('employee_certifications', 'created_at');

-- Audit and compliance
SELECT _m112_safe_set_not_null('audits', 'created_at');
SELECT _m112_safe_set_not_null('audit_findings', 'audit_id');
SELECT _m112_safe_set_not_null('audit_findings', 'finding_description');
SELECT _m112_safe_set_not_null('audit_findings', 'created_at');
SELECT _m112_safe_set_not_null('audit_actions', 'finding_id');
SELECT _m112_safe_set_not_null('audit_actions', 'action_description');
SELECT _m112_safe_set_not_null('audit_actions', 'created_at');
SELECT _m112_safe_set_not_null('risk_register', 'risk_description');
SELECT _m112_safe_set_not_null('risk_register', 'created_at');
SELECT _m112_safe_set_not_null('improvement_projects', 'created_at');
SELECT _m112_safe_set_not_null('management_reviews', 'created_at');
SELECT _m112_safe_set_not_null('cost_elements', 'cost_type');
SELECT _m112_safe_set_not_null('cost_elements', 'created_at');
SELECT _m112_safe_set_not_null('shipments', 'created_at');
SELECT _m112_safe_set_not_null('packages', 'shipment_id');
SELECT _m112_safe_set_not_null('packages', 'created_at');
SELECT _m112_safe_set_not_null('compliance', 'created_at');

DROP FUNCTION IF EXISTS _m112_safe_set_not_null(text, text);

COMMIT;
