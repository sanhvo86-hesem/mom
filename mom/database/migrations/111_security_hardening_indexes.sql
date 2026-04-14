-- ============================================================================
-- Migration 111: Security Hardening - Missing Foreign Key Indexes
-- ============================================================================
-- Purpose:
--   Add missing indexes on foreign key columns to improve query performance
--   and prevent full table scans on common join operations.
--   Critical for performance on large tables with high cardinality foreign keys.
-- ============================================================================

BEGIN;

-- User relationship indexes
CREATE INDEX IF NOT EXISTS idx_users_primary_role_id ON users(primary_role_id);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON audit_events(actor_id);

-- Document and form indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON document_versions(doc_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_version_id ON document_embeddings(version_id);
CREATE INDEX IF NOT EXISTS idx_document_distribution_version_id ON document_distribution(version_id);
CREATE INDEX IF NOT EXISTS idx_document_distribution_user_id ON document_distribution(user_id);
CREATE INDEX IF NOT EXISTS idx_form_entries_form_code_version ON form_entries(form_code, form_version);
CREATE INDEX IF NOT EXISTS idx_form_attachments_entry_id ON form_attachments(entry_id);

-- Record management indexes
CREATE INDEX IF NOT EXISTS idx_record_links_parent_record_id ON record_links(parent_record_id);
CREATE INDEX IF NOT EXISTS idx_record_links_child_record_id ON record_links(child_record_id);

-- Item and BOM indexes
CREATE INDEX IF NOT EXISTS idx_items_substitute_item_id ON items(substitute_item_id);
CREATE INDEX IF NOT EXISTS idx_items_preferred_vendor_id ON items(preferred_vendor_id);
CREATE INDEX IF NOT EXISTS idx_item_revisions_item_id ON item_revisions(item_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_bom_id_revision ON bom_components(bom_id, bom_revision);
CREATE INDEX IF NOT EXISTS idx_bom_components_component_item_id ON bom_components(component_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_substitute_item_id ON bom_components(substitute_component_id);

-- Routing indexes
CREATE INDEX IF NOT EXISTS idx_routing_operations_routing_id_revision ON routing_operations(routing_id, routing_revision);
CREATE INDEX IF NOT EXISTS idx_routing_operations_work_center_id ON routing_operations(work_center_id);
CREATE INDEX IF NOT EXISTS idx_routing_operations_subcontract_vendor_id ON routing_operations(subcontract_vendor_id);

-- Customer and sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_sales_order_id ON sales_order_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_item_id ON sales_order_lines(item_id);

-- Vendor and procurement indexes
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor_id ON vendor_ratings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po_id ON purchase_order_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_item_id ON purchase_order_lines(item_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_locations_warehouse_id ON inventory_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_item_id ON inventory_locations(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_vendor_id ON inventory_locations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_id ON inventory_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_location_id ON inventory_transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);

-- Job and labor indexes
CREATE INDEX IF NOT EXISTS idx_job_orders_item_id ON job_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_customer_id ON job_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_job_order_id ON job_operations(job_order_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_work_center_id ON job_operations(work_center_id);

-- Production and inspection indexes
CREATE INDEX IF NOT EXISTS idx_production_schedule_work_center_id ON production_schedule(work_center_id);
CREATE INDEX IF NOT EXISTS idx_inspection_plans_item_id ON inspection_plans(item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_plan_id ON inspection_results(plan_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_record_id ON inspection_results(record_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_item_id ON inspection_results(item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_inspector_id ON inspection_results(inspector_id);

-- Quality management indexes
CREATE INDEX IF NOT EXISTS idx_spc_data_item_id ON spc_data(item_id);
CREATE INDEX IF NOT EXISTS idx_ncr_records_record_id ON ncr_records(record_id);
CREATE INDEX IF NOT EXISTS idx_capa_records_record_id ON capa_records(record_id);
CREATE INDEX IF NOT EXISTS idx_capa_records_source_ncr_id ON capa_records(source_ncr_id);
CREATE INDEX IF NOT EXISTS idx_fai_records_record_id ON fai_records(record_id);
CREATE INDEX IF NOT EXISTS idx_fai_characteristics_fai_id ON fai_characteristics(fai_id);

-- Certificate indexes
CREATE INDEX IF NOT EXISTS idx_certificates_item_id ON certificates(item_id);
CREATE INDEX IF NOT EXISTS idx_certificates_customer_id ON certificates(customer_id);

-- NPI and EHS indexes
CREATE INDEX IF NOT EXISTS idx_npi_projects_item_id ON npi_projects(item_id);
CREATE INDEX IF NOT EXISTS idx_npi_projects_customer_id ON npi_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_ehs_incidents_record_id ON ehs_incidents(record_id);
CREATE INDEX IF NOT EXISTS idx_contamination_checks_item_id ON contamination_checks(item_id);
CREATE INDEX IF NOT EXISTS idx_contamination_checks_inspector_id ON contamination_checks(inspector_id);

-- Engineering change indexes
CREATE INDEX IF NOT EXISTS idx_engineering_change_requests_item_id ON engineering_change_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_engineering_change_requests_linked_record_id ON engineering_change_requests(linked_record_id);

-- Equipment and calibration indexes
CREATE INDEX IF NOT EXISTS idx_calibration_records_equipment_id ON calibration_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_equipment_id ON maintenance_work_orders(equipment_id);

-- Tool indexes
CREATE INDEX IF NOT EXISTS idx_tools_tool_vendor_id ON tools(tool_vendor_id);
CREATE INDEX IF NOT EXISTS idx_tools_regrind_vendor_id ON tools(regrind_vendor_id);
CREATE INDEX IF NOT EXISTS idx_tool_transactions_tool_id ON tool_transactions(tool_id);

-- Employee and training indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_training_records_record_id ON training_records(record_id);
CREATE INDEX IF NOT EXISTS idx_training_records_trainee_id ON training_records(trainee_id);
CREATE INDEX IF NOT EXISTS idx_skills_matrix_employee_id ON skills_matrix(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee_id ON employee_certifications(employee_id);

-- Audit and compliance indexes
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_id ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_actions_finding_id ON audit_actions(finding_id);
CREATE INDEX IF NOT EXISTS idx_audit_actions_capa_record_id ON audit_actions(capa_record_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_record_id ON risk_register(record_id);
CREATE INDEX IF NOT EXISTS idx_improvement_projects_record_id ON improvement_projects(record_id);
CREATE INDEX IF NOT EXISTS idx_management_reviews_record_id ON management_reviews(record_id);

-- Cost management indexes
CREATE INDEX IF NOT EXISTS idx_cost_elements_item_id ON cost_elements(item_id);

-- Shipment and logistics indexes
CREATE INDEX IF NOT EXISTS idx_shipments_sales_order_id ON shipments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_shipment_id ON packages(shipment_id);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_item_id ON compliance(item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_customer_id ON compliance(customer_id);

-- Control plane indexes
CREATE INDEX IF NOT EXISTS idx_governed_route_registry_org_company ON governed_route_registry(org_company_code);
CREATE INDEX IF NOT EXISTS idx_governed_route_registry_org_plant ON governed_route_registry(org_plant_id);
CREATE INDEX IF NOT EXISTS idx_governed_route_registry_org_site ON governed_route_registry(org_site_id);

CREATE INDEX IF NOT EXISTS idx_control_plane_command_handlers_org_company ON control_plane_command_handlers(org_company_code);
CREATE INDEX IF NOT EXISTS idx_control_plane_command_handlers_org_plant ON control_plane_command_handlers(org_plant_id);
CREATE INDEX IF NOT EXISTS idx_control_plane_command_handlers_org_site ON control_plane_command_handlers(org_site_id);

CREATE INDEX IF NOT EXISTS idx_periodic_evaluations_assigned_user_id ON periodic_evaluations(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_periodic_evaluations_integrity_digest_id ON periodic_evaluations(integrity_digest_id);
CREATE INDEX IF NOT EXISTS idx_periodic_evaluations_audit_pack_export_id ON periodic_evaluations(audit_pack_export_id);

CREATE INDEX IF NOT EXISTS idx_emergency_change_controls_plm_change_order_id ON emergency_change_controls(plm_change_order_id);
CREATE INDEX IF NOT EXISTS idx_emergency_change_controls_declared_by ON emergency_change_controls(declared_by);
CREATE INDEX IF NOT EXISTS idx_emergency_change_controls_normalized_by ON emergency_change_controls(normalized_by);

CREATE INDEX IF NOT EXISTS idx_rollback_requirements_plm_change_order_id ON rollback_requirements(plm_change_order_id);
CREATE INDEX IF NOT EXISTS idx_rollback_requirements_execution_evidence_record_id ON rollback_requirements(execution_evidence_record_id);
CREATE INDEX IF NOT EXISTS idx_rollback_requirements_approved_by ON rollback_requirements(approved_by);

CREATE INDEX IF NOT EXISTS idx_genealogy_edge_facts_evidence_record_id ON genealogy_edge_facts(evidence_record_id);
CREATE INDEX IF NOT EXISTS idx_genealogy_edge_facts_change_order_id ON genealogy_edge_facts(change_order_id);

-- JSONB query indexes for common patterns
CREATE INDEX IF NOT EXISTS idx_evidence_records_metadata_gin ON evidence_records USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_control_plane_command_handlers_required_role_set_gin ON control_plane_command_handlers USING GIN (required_role_set);
CREATE INDEX IF NOT EXISTS idx_control_plane_command_handlers_emitted_event_types_gin ON control_plane_command_handlers USING GIN (emitted_event_types);
CREATE INDEX IF NOT EXISTS idx_genealogy_edge_facts_metadata_gin ON genealogy_edge_facts USING GIN (metadata);

-- Multi-column indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_type_recorded ON audit_events(actor_id, event_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_item ON inventory_transactions(warehouse_id, item_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_so_item ON sales_order_lines(sales_order_id, item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po_item ON purchase_order_lines(po_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_item_created ON inspection_results(item_id, recorded_at DESC);

COMMIT;
