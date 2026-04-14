-- ============================================================================
-- Migration 112: Security Hardening - Missing NOT NULL and UNIQUE Constraints
-- ============================================================================
-- Purpose:
--   Add missing NOT NULL and UNIQUE constraints on critical columns
--   to enforce data integrity and prevent invalid states.
-- ============================================================================

BEGIN;

-- User and authentication constraints
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE roles ALTER COLUMN role_name SET NOT NULL;
ALTER TABLE roles ALTER COLUMN created_at SET NOT NULL;

-- Session management constraints
ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN expires_at SET NOT NULL;

-- Document constraints
ALTER TABLE documents ALTER COLUMN doc_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE document_versions ALTER COLUMN doc_id SET NOT NULL;
ALTER TABLE document_versions ALTER COLUMN version_number SET NOT NULL;
ALTER TABLE document_versions ALTER COLUMN created_at SET NOT NULL;

-- Form management constraints
ALTER TABLE form_entries ALTER COLUMN form_code SET NOT NULL;
ALTER TABLE form_entries ALTER COLUMN form_version SET NOT NULL;
ALTER TABLE form_entries ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE form_attachments ALTER COLUMN entry_id SET NOT NULL;
ALTER TABLE form_attachments ALTER COLUMN created_at SET NOT NULL;

-- Record management constraints
ALTER TABLE records ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE records ALTER COLUMN record_type SET NOT NULL;
ALTER TABLE records ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE records ALTER COLUMN updated_at SET NOT NULL;

-- Item master constraints
ALTER TABLE items ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE items ALTER COLUMN item_description SET NOT NULL;
ALTER TABLE items ALTER COLUMN item_status SET NOT NULL;
ALTER TABLE items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE items ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE item_revisions ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE item_revisions ALTER COLUMN revision_level SET NOT NULL;
ALTER TABLE item_revisions ALTER COLUMN created_at SET NOT NULL;

-- BOM constraints
ALTER TABLE bill_of_materials ALTER COLUMN bom_id SET NOT NULL;
ALTER TABLE bill_of_materials ALTER COLUMN parent_item_id SET NOT NULL;
ALTER TABLE bill_of_materials ALTER COLUMN bom_status SET NOT NULL;
ALTER TABLE bill_of_materials ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE bom_components ALTER COLUMN bom_id SET NOT NULL;
ALTER TABLE bom_components ALTER COLUMN bom_revision SET NOT NULL;
ALTER TABLE bom_components ALTER COLUMN component_item_id SET NOT NULL;
ALTER TABLE bom_components ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE bom_components ALTER COLUMN created_at SET NOT NULL;

-- Work center and routing constraints
ALTER TABLE work_centers ALTER COLUMN work_center_id SET NOT NULL;
ALTER TABLE work_centers ALTER COLUMN work_center_name SET NOT NULL;
ALTER TABLE work_centers ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE routings ALTER COLUMN routing_id SET NOT NULL;
ALTER TABLE routings ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE routings ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE routing_operations ALTER COLUMN routing_id SET NOT NULL;
ALTER TABLE routing_operations ALTER COLUMN routing_revision SET NOT NULL;
ALTER TABLE routing_operations ALTER COLUMN operation_sequence SET NOT NULL;
ALTER TABLE routing_operations ALTER COLUMN created_at SET NOT NULL;

-- Customer and sales constraints
ALTER TABLE customers ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN customer_name SET NOT NULL;
ALTER TABLE customers ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE customers ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE sales_orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE sales_orders ALTER COLUMN order_date SET NOT NULL;
ALTER TABLE sales_orders ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE sales_order_lines ALTER COLUMN sales_order_id SET NOT NULL;
ALTER TABLE sales_order_lines ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE sales_order_lines ALTER COLUMN order_quantity SET NOT NULL;
ALTER TABLE sales_order_lines ALTER COLUMN created_at SET NOT NULL;

-- Vendor and procurement constraints
ALTER TABLE vendors ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN vendor_name SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE vendor_ratings ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE vendor_ratings ALTER COLUMN rating_date SET NOT NULL;
ALTER TABLE vendor_ratings ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE purchase_orders ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN po_date SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE purchase_order_lines ALTER COLUMN po_id SET NOT NULL;
ALTER TABLE purchase_order_lines ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE purchase_order_lines ALTER COLUMN po_quantity SET NOT NULL;
ALTER TABLE purchase_order_lines ALTER COLUMN created_at SET NOT NULL;

-- Warehouse and inventory constraints
ALTER TABLE warehouses ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN warehouse_name SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE inventory_locations ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE inventory_locations ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE inventory_locations ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE inventory_locations ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE lot_master ALTER COLUMN lot_number SET NOT NULL;
ALTER TABLE lot_master ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE lot_master ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE serial_master ALTER COLUMN serial_number SET NOT NULL;
ALTER TABLE serial_master ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE serial_master ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE inventory_transactions ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE inventory_transactions ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE inventory_transactions ALTER COLUMN txn_type SET NOT NULL;
ALTER TABLE inventory_transactions ALTER COLUMN recorded_at SET NOT NULL;

-- Job order constraints
ALTER TABLE job_orders ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE job_orders ALTER COLUMN job_qty SET NOT NULL;
ALTER TABLE job_orders ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE job_operations ALTER COLUMN job_order_id SET NOT NULL;
ALTER TABLE job_operations ALTER COLUMN operation_seq SET NOT NULL;
ALTER TABLE job_operations ALTER COLUMN created_at SET NOT NULL;

-- Labor transaction constraints
ALTER TABLE labor_transactions ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE labor_transactions ALTER COLUMN recorded_at SET NOT NULL;

-- Production schedule constraints
ALTER TABLE production_schedule ALTER COLUMN created_at SET NOT NULL;

-- Inspection plan constraints
ALTER TABLE inspection_plans ALTER COLUMN inspection_plan_id SET NOT NULL;
ALTER TABLE inspection_plans ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE inspection_results ALTER COLUMN created_at SET NOT NULL;

-- SPC data constraints
ALTER TABLE spc_data ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE spc_data ALTER COLUMN created_at SET NOT NULL;

-- Quality control constraints (NCR, CAPA, FAI)
ALTER TABLE ncr_records ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE ncr_records ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE capa_records ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE capa_records ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE fai_records ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE fai_records ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE fai_characteristics ALTER COLUMN fai_id SET NOT NULL;
ALTER TABLE fai_characteristics ALTER COLUMN characteristic_name SET NOT NULL;
ALTER TABLE fai_characteristics ALTER COLUMN created_at SET NOT NULL;

-- Certificate constraints
ALTER TABLE certificates ALTER COLUMN created_at SET NOT NULL;

-- NPI project constraints
ALTER TABLE npi_projects ALTER COLUMN created_at SET NOT NULL;

-- EHS incident constraints
ALTER TABLE ehs_incidents ALTER COLUMN created_at SET NOT NULL;

-- Contamination check constraints
ALTER TABLE contamination_checks ALTER COLUMN created_at SET NOT NULL;

-- Engineering change constraints
ALTER TABLE engineering_change_requests ALTER COLUMN ecr_number SET NOT NULL;
ALTER TABLE engineering_change_requests ALTER COLUMN created_at SET NOT NULL;

-- Equipment constraints
ALTER TABLE equipment ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN equipment_name SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN created_at SET NOT NULL;

-- Calibration constraints
ALTER TABLE calibration_records ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE calibration_records ALTER COLUMN calibration_date SET NOT NULL;
ALTER TABLE calibration_records ALTER COLUMN created_at SET NOT NULL;

-- Maintenance work order constraints
ALTER TABLE maintenance_work_orders ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE maintenance_work_orders ALTER COLUMN work_order_id SET NOT NULL;
ALTER TABLE maintenance_work_orders ALTER COLUMN created_at SET NOT NULL;

-- Tool management constraints
ALTER TABLE tools ALTER COLUMN tool_id SET NOT NULL;
ALTER TABLE tools ALTER COLUMN tool_name SET NOT NULL;
ALTER TABLE tools ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE tool_transactions ALTER COLUMN tool_id SET NOT NULL;
ALTER TABLE tool_transactions ALTER COLUMN txn_type SET NOT NULL;
ALTER TABLE tool_transactions ALTER COLUMN created_at SET NOT NULL;

-- Employee constraints
ALTER TABLE employees ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE employees ALTER COLUMN employee_name SET NOT NULL;
ALTER TABLE employees ALTER COLUMN created_at SET NOT NULL;

-- Training constraints
ALTER TABLE training_records ALTER COLUMN created_at SET NOT NULL;

-- Skills matrix constraints
ALTER TABLE skills_matrix ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE skills_matrix ALTER COLUMN skill_name SET NOT NULL;
ALTER TABLE skills_matrix ALTER COLUMN created_at SET NOT NULL;

-- Employee certification constraints
ALTER TABLE employee_certifications ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE employee_certifications ALTER COLUMN certification_name SET NOT NULL;
ALTER TABLE employee_certifications ALTER COLUMN created_at SET NOT NULL;

-- Audit management constraints
ALTER TABLE audits ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE audit_findings ALTER COLUMN audit_id SET NOT NULL;
ALTER TABLE audit_findings ALTER COLUMN finding_description SET NOT NULL;
ALTER TABLE audit_findings ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE audit_actions ALTER COLUMN finding_id SET NOT NULL;
ALTER TABLE audit_actions ALTER COLUMN action_description SET NOT NULL;
ALTER TABLE audit_actions ALTER COLUMN created_at SET NOT NULL;

-- Risk register constraints
ALTER TABLE risk_register ALTER COLUMN risk_description SET NOT NULL;
ALTER TABLE risk_register ALTER COLUMN created_at SET NOT NULL;

-- Improvement project constraints
ALTER TABLE improvement_projects ALTER COLUMN created_at SET NOT NULL;

-- Management review constraints
ALTER TABLE management_reviews ALTER COLUMN created_at SET NOT NULL;

-- Cost element constraints
ALTER TABLE cost_elements ALTER COLUMN cost_type SET NOT NULL;
ALTER TABLE cost_elements ALTER COLUMN created_at SET NOT NULL;

-- Shipment constraints
ALTER TABLE shipments ALTER COLUMN created_at SET NOT NULL;

-- Package constraints
ALTER TABLE packages ALTER COLUMN shipment_id SET NOT NULL;
ALTER TABLE packages ALTER COLUMN created_at SET NOT NULL;

-- Compliance constraints
ALTER TABLE compliance ALTER COLUMN created_at SET NOT NULL;

-- ============================================================================
-- Note on future ENUM columns:
-- ============================================================================
-- Future migrations should use CHECK constraints instead of PostgreSQL ENUM types.
-- Example pattern:
--   status VARCHAR(50) CHECK (status IN ('draft','active','closed'))
-- This allows adding new enumeration values via migration without locking tables.
-- ENUM types cannot be modified without ALTER TYPE which locks the table.

COMMIT;
