-- ============================================================================
-- Migration 113: Add Audit Columns (created_by, updated_by, deleted_at)
-- ============================================================================
-- Purpose:
--   Add missing audit columns to tables that track record lifecycle.
--   Enables comprehensive audit trail for compliance and forensics.
--
-- Audit column pattern:
--   - created_by: UUID REFERENCES users(user_id) - who created the record
--   - created_at: TIMESTAMPTZ - when created (should already exist)
--   - updated_by: UUID REFERENCES users(user_id) - who last updated
--   - updated_at: TIMESTAMPTZ - when last updated (should already exist)
--   - deleted_by: UUID REFERENCES users(user_id) - who deleted (soft delete)
--   - deleted_at: TIMESTAMPTZ - when deleted (soft delete)
-- ============================================================================

BEGIN;

-- ============================================================================
-- User & Authentication Tables
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Document Management Tables
-- ============================================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE document_distribution ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE document_distribution ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE document_distribution ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Form Management Tables
-- ============================================================================

ALTER TABLE form_schemas ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE form_schemas ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE form_schemas ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE form_schemas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE form_attachments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE form_attachments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE form_attachments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Record Management Tables
-- ============================================================================

ALTER TABLE records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE record_links ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE record_links ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE record_links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE record_counters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE record_counters ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);

-- ============================================================================
-- Master Data Tables (Items, BOMs, Routings)
-- ============================================================================

ALTER TABLE items ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE item_revisions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE item_revisions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE item_revisions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE routings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Customer & Sales Tables
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Vendor & Procurement Tables
-- ============================================================================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE vendor_ratings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE vendor_ratings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE vendor_ratings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Inventory & Logistics Tables
-- ============================================================================

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE lot_master ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE lot_master ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE lot_master ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE lot_master ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE serial_master ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE serial_master ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE serial_master ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE serial_master ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Note: inventory_transactions has recorded_at not created_at, so we only add audit_actor_id if missing
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES users(user_id);

-- ============================================================================
-- Production & Job Tables
-- ============================================================================

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE job_operations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE job_operations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE job_operations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE job_operations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE labor_transactions ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES users(user_id);

ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Quality Management Tables
-- ============================================================================

ALTER TABLE inspection_plans ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_plans ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_plans ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE inspection_results ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_results ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_results ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE inspection_results ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE spc_data ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE spc_data ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE spc_data ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE fai_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE fai_records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE fai_records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE fai_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE fai_characteristics ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE fai_characteristics ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE fai_characteristics ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE fai_characteristics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE npi_projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE npi_projects ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE npi_projects ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE npi_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- EHS & Environment Tables
-- ============================================================================

ALTER TABLE ehs_incidents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE ehs_incidents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE ehs_incidents ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE ehs_incidents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE contamination_checks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE contamination_checks ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE contamination_checks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Engineering Change Tables
-- ============================================================================

ALTER TABLE engineering_change_requests ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE engineering_change_requests ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE engineering_change_requests ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE engineering_change_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Equipment & Maintenance Tables
-- ============================================================================

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE calibration_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE calibration_records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE calibration_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tools ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tool_transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE tool_transactions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE tool_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Human Resources & Training Tables
-- ============================================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE training_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE skills_matrix ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE skills_matrix ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE skills_matrix ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE skills_matrix ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Audit & Compliance Tables
-- ============================================================================

ALTER TABLE audits ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE audit_actions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE audit_actions ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE audit_actions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE audit_actions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE improvement_projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE improvement_projects ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE improvement_projects ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE improvement_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Financial & Cost Tables
-- ============================================================================

ALTER TABLE cost_elements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE cost_elements ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE cost_elements ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE cost_elements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Logistics & Shipment Tables
-- ============================================================================

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- packages table may not exist in all deployments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='packages') THEN
        EXECUTE 'ALTER TABLE packages ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE packages ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE packages ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE packages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;
END $$;

-- ============================================================================
-- Compliance & Traceability Tables
-- ============================================================================

-- compliance table may not exist in all deployments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance') THEN
        EXECUTE 'ALTER TABLE compliance ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE compliance ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE compliance ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(user_id)';
        EXECUTE 'ALTER TABLE compliance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;
END $$;

-- ============================================================================
-- Indexes for audit columns (enable efficient audit queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_updated_by ON users(updated_by);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_updated_by ON documents(updated_by);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);

CREATE INDEX IF NOT EXISTS idx_records_created_by ON records(created_by);
CREATE INDEX IF NOT EXISTS idx_records_updated_by ON records(updated_by);
CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);

CREATE INDEX IF NOT EXISTS idx_items_created_by ON items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_updated_by ON items(updated_by);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at);

CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON sales_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_orders_updated_by ON sales_orders(updated_by);
CREATE INDEX IF NOT EXISTS idx_sales_orders_deleted_at ON sales_orders(deleted_at);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_updated_by ON purchase_orders(updated_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at ON purchase_orders(deleted_at);

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON customers(updated_by);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_updated_by ON vendors(updated_by);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors(deleted_at);

CREATE INDEX IF NOT EXISTS idx_ncr_records_created_by ON ncr_records(created_by);
CREATE INDEX IF NOT EXISTS idx_ncr_records_deleted_at ON ncr_records(deleted_at);

CREATE INDEX IF NOT EXISTS idx_capa_records_created_by ON capa_records(created_by);
CREATE INDEX IF NOT EXISTS idx_capa_records_deleted_at ON capa_records(deleted_at);

COMMIT;
