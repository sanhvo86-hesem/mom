-- P44 V4 runtime closure: Generic CRUD hard-stop for governed runtime roots.
-- The trigger is intentionally scoped to sessions that mark themselves as
-- Generic CRUD writers. Dedicated command services can set their own command
-- context in later prompts without being blocked by this Generic CRUD guard.

CREATE TABLE IF NOT EXISTS governed_entity_registry (
    registry_id BIGSERIAL PRIMARY KEY,
    root_code TEXT NOT NULL,
    domain_code TEXT NOT NULL,
    table_name TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT 'governed_root',
    generic_mutation_policy TEXT NOT NULL DEFAULT 'domain_command_required',
    allowed_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT governed_entity_registry_policy_ck
        CHECK (generic_mutation_policy IN ('domain_command_required', 'read_only_projection', 'import_staging_allowed')),
    CONSTRAINT governed_entity_registry_unique_root_table
        UNIQUE (root_code, table_name)
);

CREATE INDEX IF NOT EXISTS idx_governed_entity_registry_table_active
    ON governed_entity_registry (table_name)
    WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS generic_crud_denial_event (
    denial_id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    root_code TEXT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    sql_state TEXT NOT NULL DEFAULT '42501',
    actor_name TEXT NOT NULL DEFAULT CURRENT_USER,
    application_name TEXT NOT NULL DEFAULT CURRENT_SETTING('application_name', TRUE),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION hesem_governed_generic_crud_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_root_code TEXT;
    v_policy TEXT;
    v_commands JSONB;
BEGIN
    IF COALESCE(current_setting('hesem.generic_crud_context', TRUE), '0') <> '1' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    SELECT root_code, generic_mutation_policy, allowed_commands
      INTO v_root_code, v_policy, v_commands
      FROM governed_entity_registry
     WHERE table_name = TG_TABLE_NAME
       AND active = TRUE
     ORDER BY registry_id
     LIMIT 1;

    IF v_policy = 'domain_command_required'
       AND COALESCE(current_setting('hesem.generic_crud_break_glass', TRUE), '0') <> '1' THEN
        INSERT INTO generic_crud_denial_event (root_code, table_name, operation, detail)
        VALUES (
            v_root_code,
            TG_TABLE_NAME,
            TG_OP,
            jsonb_build_object(
                'problem_type', 'https://hesemeng.com/problems/domain-command-required',
                'allowed_commands', COALESCE(v_commands, '[]'::jsonb),
                'generic_crud_context', current_setting('hesem.generic_crud_context', TRUE)
            )
        );

        RAISE EXCEPTION 'domain_command_required: Generic CRUD mutation is disabled for governed table %', TG_TABLE_NAME
            USING ERRCODE = '42501',
                  DETAIL = 'Use the dedicated domain command service with idempotency, gates, audit/evidence, outbox, and transaction ownership.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, allowed_commands)
VALUES
    ('sales_order', 'sales', 'sales_orders', '["CreateSalesOrderCommand","ReviseSalesOrderCommand","ReleaseSalesOrderCommand","HoldSalesOrderCommand","CancelSalesOrderCommand"]'::jsonb),
    ('sales_order', 'sales', 'sales_order', '["CreateSalesOrderCommand","ReviseSalesOrderCommand","ReleaseSalesOrderCommand","HoldSalesOrderCommand","CancelSalesOrderCommand"]'::jsonb),
    ('sales_order', 'sales', 'sales_order_line', '["CreateSalesOrderCommand","ReviseSalesOrderCommand","ReleaseSalesOrderCommand"]'::jsonb),
    ('sales_order', 'sales', 'quotes', '["CreateSalesOrderCommand","ReviseSalesOrderCommand","ReleaseSalesOrderCommand"]'::jsonb),
    ('sales_order', 'sales', 'quote', '["CreateSalesOrderCommand","ReviseSalesOrderCommand","ReleaseSalesOrderCommand"]'::jsonb),
    ('job_order_work_order', 'production', 'job_orders', '["CreateJobOrderCommand","ReleaseJobOrderCommand","ReleaseWorkOrderCommand"]'::jsonb),
    ('job_order_work_order', 'production', 'job_order', '["CreateJobOrderCommand","ReleaseJobOrderCommand","ReleaseWorkOrderCommand"]'::jsonb),
    ('job_order_work_order', 'production', 'work_orders', '["ReleaseWorkOrderCommand","StartOperationCommand","ReportProductionCommand"]'::jsonb),
    ('job_order_work_order', 'production', 'work_order', '["ReleaseWorkOrderCommand","StartOperationCommand","ReportProductionCommand"]'::jsonb),
    ('job_order_work_order', 'mes_execution', 'material_consumption', '["IssueMaterialToWorkOrderCommand"]'::jsonb),
    ('job_order_work_order', 'mes_execution', 'mes_material_consumption', '["IssueMaterialToWorkOrderCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_transactions', '["ReceiveInventoryCommand","MoveInventoryCommand","IssueInventoryCommand","AdjustInventoryCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_ledger', '["ReceiveInventoryCommand","MoveInventoryCommand","IssueInventoryCommand","AdjustInventoryCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'stock_balances', '["AdjustInventoryCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'lot', '["CreateLotCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'serial', '["CreateSerialCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'genealogy_link', '["LinkGenealogyCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'dpp_passports', '["LinkGenealogyCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'inspection_lot', '["CreateQualityHoldCommand","ReleaseQualityHoldCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'inspection_result', '["CreateQualityHoldCommand","ReleaseQualityHoldCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'incoming_inspections', '["CreateQualityHoldCommand","ReleaseQualityHoldCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'ncr_records', '["CreateNcrCommand","DispositionMrbCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'nonconformance', '["CreateNcrCommand","DispositionMrbCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'ncr', '["CreateNcrCommand","DispositionMrbCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'capa', '["OpenCapaCommand","CloseCapaCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'capa_records', '["OpenCapaCommand","CloseCapaCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'supplier_relationship', 'scar', '["IssueScarCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'supplier_relationship', 'approved_supplier_list', '["IssueScarCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'supplier_relationship', 'supplier_scorecards', '["IssueScarCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'items', '["CreateItemCommand","ReviseItemCommand","ReleaseItemRevisionCommand","ArchiveItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'item', '["CreateItemCommand","ReviseItemCommand","ReleaseItemRevisionCommand","ArchiveItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'item_revision', '["CreateItemCommand","ReviseItemCommand","ReleaseItemRevisionCommand","ArchiveItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'item_revisions', '["CreateItemCommand","ReviseItemCommand","ReleaseItemRevisionCommand","ArchiveItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'part_numbers', '["CreateItemCommand","ReviseItemCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'part_revisions', '["ReviseItemCommand","ReleaseItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'materials', '["CreateItemCommand","ReviseItemCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'material_master', '["CreateItemCommand","ReviseItemCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'item_uom_policy', '["ReleaseUomPolicyCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'bom_library', '["CreateEngineeringPackageCommand","ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'routing_library', '["CreateEngineeringPackageCommand","ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'control_plans', '["CreateEngineeringPackageCommand","ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'inspection_plans', '["CreateEngineeringPackageCommand","ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'traveler_templates', '["CreateEngineeringPackageCommand","ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'nc_program_releases', '["ReleaseEngineeringPackageCommand"]'::jsonb),
    ('engineering_release_package', 'mfg_engineering', 'engineering_release_package', '["ReleaseEngineeringPackageCommand"]'::jsonb),
    ('equipment_readiness', 'plant_maintenance', 'work_centers', '["CreateEquipmentCommand","ReleaseEquipmentCommand","RecordMaintenanceCommand","BlockEquipmentCommand"]'::jsonb),
    ('equipment_readiness', 'plant_maintenance', 'machines', '["CreateEquipmentCommand","ReleaseEquipmentCommand","RecordMaintenanceCommand","BlockEquipmentCommand"]'::jsonb),
    ('equipment_readiness', 'plant_maintenance', 'equipment_assets', '["CreateEquipmentCommand","ReleaseEquipmentCommand","RecordMaintenanceCommand","BlockEquipmentCommand"]'::jsonb),
    ('equipment_readiness', 'plant_maintenance', 'maintenance_work_orders', '["RecordMaintenanceCommand"]'::jsonb),
    ('equipment_readiness', 'calibration_equipment', 'calibration_records', '["RecordCalibrationCommand"]'::jsonb),
    ('equipment_readiness', 'calibration_equipment', 'calibration_equipment', '["RecordCalibrationCommand"]'::jsonb),
    ('audit_evidence_esign', 'evidence_vault', 'electronic_signature', '["ApplyElectronicSignatureCommand"]'::jsonb),
    ('audit_evidence_esign', 'audit_risk', 'audit_trail', '["RecordAuditEventCommand"]'::jsonb),
    ('audit_evidence_esign', 'audit_risk', 'audit_events', '["RecordAuditEventCommand"]'::jsonb),
    ('audit_evidence_esign', 'evidence_vault', 'evidence_records', '["CaptureEvidenceCommand"]'::jsonb),
    ('audit_evidence_esign', 'document_control', 'dcc_document_revision', '["ApproveControlledRecordCommand"]'::jsonb),
    ('audit_evidence_esign', 'document_control', 'dcc_change_request', '["ApproveControlledRecordCommand"]'::jsonb),
    ('finance_ledger_period', 'finance', 'period_closes', '["ClosePeriodCommand"]'::jsonb),
    ('finance_ledger_period', 'finance', 'backdate_exceptions', '["ApproveBackdateExceptionCommand"]'::jsonb),
    ('finance_ledger_period', 'finance', 'ap_invoices', '["PostJournalCommand"]'::jsonb),
    ('finance_ledger_period', 'finance', 'ap_invoice_lines', '["PostJournalCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_quantity_kind', '["CreateUomUnitCommand","ApproveUomConversionRuleCommand","ReleaseUomPolicyCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_unit_catalog', '["CreateUomUnitCommand","ApproveUomConversionRuleCommand","ReleaseUomPolicyCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_conversion_rule', '["ApproveUomConversionRuleCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_rounding_policy', '["ReleaseUomPolicyCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_external_code_map', '["ReleaseUomPolicyCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_alias', '["QuarantineUomAliasCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_alias_quarantine', '["QuarantineUomAliasCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_rule_approval', '["ApproveUomConversionRuleCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_standard_library_manifest', '["ReleaseUomPolicyCommand"]'::jsonb),
    ('uom_measurement', 'uom', 'uom_measurement_thread', '["ReleaseUomPolicyCommand"]'::jsonb),
    ('kpi_definition', 'bi_datawarehouse', 'kpi_definitions', '["ProposeKpiDefinitionCommand","ApproveKpiDefinitionCommand","RetireKpiDefinitionCommand"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = NOW();

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT table_name
          FROM governed_entity_registry
         WHERE active = TRUE
         ORDER BY table_name
    LOOP
        IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_governed_generic_crud_guard ON %I', v_table);
            EXECUTE format(
                'CREATE TRIGGER trg_governed_generic_crud_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hesem_governed_generic_crud_guard()',
                v_table
            );
        END IF;
    END LOOP;
END;
$$;
