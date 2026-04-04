-- Migration: 020_indexes.sql
-- Description: ALL indexes - B-tree, GIN, GiST, trigram, ivfflat across all tables
-- Dependencies: 002-019 (all table migrations)
-- Rollback: DROP all indexes listed below (see rollback section at end)

BEGIN;

-- ============================================================================
-- CORE SYSTEM INDEXES (002)
-- ============================================================================
CREATE INDEX idx_roles_code ON roles (role_code);
CREATE INDEX idx_roles_dept ON roles (dept_code);

CREATE INDEX idx_users_dept ON users (dept_code);
CREATE INDEX idx_users_employee ON users (employee_id);
CREATE INDEX idx_users_status ON users (status);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE INDEX idx_audit_events_type ON audit_events (event_type, recorded_at);
CREATE INDEX idx_audit_events_aggregate ON audit_events (aggregate_type, aggregate_id, recorded_at);
CREATE INDEX idx_audit_events_actor ON audit_events (actor_id, recorded_at);
CREATE INDEX idx_audit_events_payload ON audit_events USING GIN (payload);

-- ============================================================================
-- DOCUMENT MANAGEMENT INDEXES (003)
-- ============================================================================
CREATE INDEX idx_documents_type ON documents (doc_type);
CREATE INDEX idx_documents_dept ON documents (dept_code);
CREATE INDEX idx_documents_status ON documents (status);
CREATE INDEX idx_documents_meta ON documents USING GIN (metadata);

CREATE INDEX idx_docver_doc ON document_versions (doc_id);
CREATE INDEX idx_docver_valid ON document_versions (valid_from, valid_to);

CREATE INDEX idx_docemb_version ON document_embeddings (version_id);
CREATE INDEX idx_docemb_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_docdist_version ON document_distribution (version_id);
CREATE INDEX idx_docdist_user ON document_distribution (user_id);

-- ============================================================================
-- FORM SYSTEM INDEXES (004)
-- ============================================================================
CREATE INDEX idx_formschema_dept ON form_schemas (dept_code);

CREATE INDEX idx_formentries_form ON form_entries (form_code);
CREATE INDEX idx_formentries_wf ON form_entries (workflow_state);
CREATE INDEX idx_formentries_data ON form_entries USING GIN (data);

CREATE INDEX idx_formatt_entry ON form_attachments (entry_id);

-- ============================================================================
-- RECORD MANAGEMENT INDEXES (005)
-- ============================================================================
CREATE INDEX idx_records_type ON records (record_type);
CREATE INDEX idx_records_dept ON records (dept_code);
CREATE INDEX idx_records_status ON records (status);
CREATE INDEX idx_records_due ON records (due_date) WHERE status NOT IN ('closed', 'cancelled');
CREATE INDEX idx_records_data ON records USING GIN (data);
CREATE INDEX idx_records_source ON records (source_record) WHERE source_record IS NOT NULL;

CREATE INDEX idx_reclinks_parent ON record_links (parent_record_id);
CREATE INDEX idx_reclinks_child ON record_links (child_record_id);

-- ============================================================================
-- ERP MASTER DATA INDEXES (006)
-- ============================================================================
CREATE INDEX idx_items_status ON items (item_status);
CREATE INDEX idx_items_drawing ON items (drawing_number, drawing_revision);
CREATE INDEX idx_items_customer_pn ON items (customer_part_number) WHERE customer_part_number IS NOT NULL;
CREATE INDEX idx_items_meta ON items USING GIN (metadata);

CREATE INDEX idx_bomcomp_bom ON bom_components (bom_id, bom_revision);
CREATE INDEX idx_bomcomp_item ON bom_components (component_item_id);

CREATE INDEX idx_rtgops_routing ON routing_operations (routing_id, routing_revision);
CREATE INDEX idx_rtgops_wc ON routing_operations (work_center_id);

-- ============================================================================
-- CUSTOMER & SALES INDEXES (007)
-- ============================================================================
CREATE INDEX idx_customers_type ON customers (customer_type);
CREATE INDEX idx_customers_industry ON customers (industry_code);

CREATE INDEX idx_so_customer ON sales_orders (customer_id);
CREATE INDEX idx_so_status ON sales_orders (so_status);
CREATE INDEX idx_so_cupo ON sales_orders (customer_po_number);

CREATE INDEX idx_solines_item ON sales_order_lines (item_id);

-- ============================================================================
-- VENDOR & PURCHASING INDEXES (008)
-- ============================================================================
CREATE INDEX idx_vendors_status ON vendors (vendor_status);
CREATE INDEX idx_vendors_type ON vendors (vendor_type);
CREATE INDEX idx_vendors_rating ON vendors (vendor_rating_grade);

CREATE INDEX idx_vendorratings_vendor ON vendor_ratings (vendor_id);

CREATE INDEX idx_po_vendor ON purchase_orders (vendor_id);
CREATE INDEX idx_po_status ON purchase_orders (po_status);

CREATE INDEX idx_polines_item ON purchase_order_lines (item_id);

-- ============================================================================
-- INVENTORY INDEXES (009)
-- ============================================================================
CREATE INDEX idx_invloc_wh ON inventory_locations (warehouse_id);

CREATE INDEX idx_lotmaster_item ON lot_master (item_id);

CREATE INDEX idx_serialmaster_item ON serial_master (item_id);

CREATE INDEX idx_invtxn_item ON inventory_transactions (item_id, recorded_at);
CREATE INDEX idx_invtxn_lot ON inventory_transactions (lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX idx_invtxn_wh ON inventory_transactions (warehouse_id, recorded_at);

-- ============================================================================
-- PRODUCTION INDEXES (010)
-- ============================================================================
CREATE INDEX idx_jo_status ON job_orders (job_status);
CREATE INDEX idx_jo_item ON job_orders (item_id);
CREATE INDEX idx_jo_customer ON job_orders (customer_id);
CREATE INDEX idx_jo_dates ON job_orders (end_date_planned) WHERE job_status NOT IN ('completed', 'closed');

CREATE INDEX idx_jobops_job ON job_operations (job_order_id);
CREATE INDEX idx_jobops_wc ON job_operations (work_center_id);

CREATE INDEX idx_labortxn_emp ON labor_transactions (employee_id, recorded_at);
CREATE INDEX idx_labortxn_job ON labor_transactions (job_number, recorded_at);

CREATE INDEX idx_prodsched_job ON production_schedule (job_number);
CREATE INDEX idx_prodsched_wc ON production_schedule (work_center_id);
CREATE INDEX idx_prodsched_dates ON production_schedule (scheduled_start, scheduled_end);

-- ============================================================================
-- QUALITY INDEXES (011)
-- ============================================================================
CREATE INDEX idx_inspresult_job ON inspection_results (job_number);
CREATE INDEX idx_inspresult_item ON inspection_results (item_id);
CREATE INDEX idx_inspresult_record ON inspection_results (record_id) WHERE record_id IS NOT NULL;

CREATE INDEX idx_spc_item ON spc_data (item_id, characteristic, recorded_at);

CREATE INDEX idx_ncr_status ON ncr_records (ncr_status);
CREATE INDEX idx_ncr_defect ON ncr_records (defect_type);

CREATE INDEX idx_capa_status ON capa_records (capa_status);

CREATE INDEX idx_faichar_fai ON fai_characteristics (fai_id);

CREATE INDEX idx_certs_job ON certificates (job_number);
CREATE INDEX idx_certs_type ON certificates (certificate_type);

-- ============================================================================
-- CALIBRATION & EQUIPMENT INDEXES (012)
-- ============================================================================
CREATE INDEX idx_equip_type ON equipment (equipment_type);
CREATE INDEX idx_equip_cal_due ON equipment (calibration_due) WHERE calibration_due IS NOT NULL;
CREATE INDEX idx_equip_pm_next ON equipment (pm_next_date) WHERE pm_next_date IS NOT NULL;

CREATE INDEX idx_calrec_equip ON calibration_records (equipment_id);
CREATE INDEX idx_calrec_due ON calibration_records (next_due);

CREATE INDEX idx_maintwo_equip ON maintenance_work_orders (equipment_id);
CREATE INDEX idx_maintwo_status ON maintenance_work_orders (wo_status);

CREATE INDEX idx_tools_type ON tools (tool_type);
CREATE INDEX idx_tools_location ON tools (tool_location);

CREATE INDEX idx_tooltxn_tool ON tool_transactions (tool_id, recorded_at);

-- ============================================================================
-- TRAINING & HR INDEXES (013)
-- ============================================================================
CREATE INDEX idx_emp_dept ON employees (dept_code);
CREATE INDEX idx_emp_active ON employees (is_active);

CREATE INDEX idx_training_trainee ON training_records (trainee_id);
CREATE INDEX idx_training_topic ON training_records (training_topic);
CREATE INDEX idx_training_expiry ON training_records (certification_expiry) WHERE certification_expiry IS NOT NULL;

CREATE INDEX idx_skills_emp ON skills_matrix (employee_id);

CREATE INDEX idx_empcert_emp ON employee_certifications (employee_id);
CREATE INDEX idx_empcert_expiry ON employee_certifications (expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================================================
-- AUDIT & RISK INDEXES (014)
-- ============================================================================
CREATE INDEX idx_audits_type ON audits (audit_type);
CREATE INDEX idx_audits_date ON audits (audit_date);

CREATE INDEX idx_audfind_audit ON audit_findings (audit_id);

CREATE INDEX idx_audactions_finding ON audit_actions (finding_id);

CREATE INDEX idx_risk_level ON risk_register (risk_level);
CREATE INDEX idx_risk_category ON risk_register (risk_category);

-- ============================================================================
-- FINANCE INDEXES (015)
-- ============================================================================
CREATE INDEX idx_costelm_item ON cost_elements (item_id);

CREATE INDEX idx_jobcost_job ON job_costing (job_number);

CREATE INDEX idx_gltxn_account ON gl_transactions (gl_account_number, posting_date);
CREATE INDEX idx_gltxn_period ON gl_transactions (fiscal_year, fiscal_period);

CREATE INDEX idx_apar_status ON ap_ar_invoices (payment_status);
CREATE INDEX idx_apar_due ON ap_ar_invoices (due_date) WHERE payment_status NOT IN ('paid');
CREATE INDEX idx_apar_type ON ap_ar_invoices (ledger_type);

-- ============================================================================
-- SHIPPING & COMPLIANCE INDEXES (016)
-- ============================================================================
CREATE INDEX idx_ship_status ON shipments (shipment_status);
CREATE INDEX idx_ship_date ON shipments (ship_date);
CREATE INDEX idx_ship_tracking ON shipments (tracking_number) WHERE tracking_number IS NOT NULL;

CREATE INDEX idx_compliance_status ON compliance_records (compliance_status);

-- ============================================================================
-- SUBCONTRACTING & RMA INDEXES (017)
-- ============================================================================
CREATE INDEX idx_subcon_vendor ON subcontract_orders (vendor_id);

CREATE INDEX idx_rma_customer ON rma_orders (customer_id);
CREATE INDEX idx_rma_status ON rma_orders (rma_status);

-- ============================================================================
-- PROJECTS & KPI INDEXES (018)
-- ============================================================================
CREATE INDEX idx_proj_status ON projects (project_status);

CREATE INDEX idx_kpisnap_kpi ON kpi_snapshots (kpi_id, period_start);
CREATE INDEX idx_kpisnap_period ON kpi_snapshots (period_start, period_end);

CREATE INDEX idx_mrp_item ON mrp_planned_orders (item_id);
CREATE INDEX idx_mrp_status ON mrp_planned_orders (mrp_status);

-- ============================================================================
-- SYSTEM TABLE INDEXES (019)
-- ============================================================================
CREATE INDEX idx_varreg_category ON variable_registry (category);

CREATE INDEX idx_notif_user ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX idx_fileatt_entity ON file_attachments (entity_type, entity_id);

CREATE INDEX idx_tags_entity ON tags (entity_type, entity_id);
CREATE INDEX idx_tags_name ON tags (tag_name);

CREATE INDEX idx_comments_entity ON comments (entity_type, entity_id, created_at);

CREATE INDEX idx_wfinst_entity ON workflow_instances (entity_type, entity_id);
CREATE INDEX idx_wfinst_state ON workflow_instances (current_state);

-- ============================================================================
-- ADDITIONAL INDEXES: Trigram and JSONB path indexes
-- ============================================================================

-- Full-text search on document titles
CREATE INDEX idx_doc_title_trgm ON documents USING GIN (title gin_trgm_ops);
CREATE INDEX idx_doc_title_vi_trgm ON documents USING GIN (title_vi gin_trgm_ops);

-- Full-text search on item descriptions
CREATE INDEX idx_item_desc_trgm ON items USING GIN (description gin_trgm_ops);

-- JSONB path indexes for common queries
CREATE INDEX idx_records_data_job ON records USING GIN ((data -> 'job_number'));
CREATE INDEX idx_records_data_part ON records USING GIN ((data -> 'part_number'));

-- Composite indexes for dashboard queries
CREATE INDEX idx_jo_status_dates ON job_orders (job_status, end_date_planned, customer_id);
CREATE INDEX idx_so_status_dates ON sales_orders (so_status, promise_date, customer_id);

COMMIT;

-- Rollback: DROP INDEX IF EXISTS idx_so_status_dates, idx_jo_status_dates, ... (all indexes listed above);
-- Note: Dropping tables in other migration rollbacks will automatically drop their indexes.
