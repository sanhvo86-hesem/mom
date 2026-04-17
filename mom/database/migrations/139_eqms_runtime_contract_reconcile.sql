-- Migration 139: EQMS runtime contract reconciliation
-- Aligns EQMS portal/controller workflow fields with the governed PostgreSQL schema.
-- Idempotent: all ALTER statements use IF NOT EXISTS where supported.

-- IQC workflow states/results used by EqmsInspectionController.
ALTER TYPE incoming_insp_status_enum ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE incoming_insp_status_enum ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE incoming_insp_status_enum ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE incoming_insp_status_enum ADD VALUE IF NOT EXISTS 'voided';

ALTER TYPE incoming_insp_result_enum ADD VALUE IF NOT EXISTS 'pass';
ALTER TYPE incoming_insp_result_enum ADD VALUE IF NOT EXISTS 'fail';
ALTER TYPE incoming_insp_result_enum ADD VALUE IF NOT EXISTS 'conditional';

ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS inspector text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS accepted_by text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS rejected_by text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS hold_reason text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE incoming_inspections ADD COLUMN IF NOT EXISTS voided_at timestamptz;

-- In-process inspection workflow surface used by the MES quality tab.
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS work_order_id text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS operation_code text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS status varchar(40) NOT NULL DEFAULT 'pending';
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS measurement_values jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS nc_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS nc_description text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS accepted_by text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS rejected_by text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE inspection_lot ADD COLUMN IF NOT EXISTS hold_reason text;

CREATE INDEX IF NOT EXISTS idx_inspection_lot_status_runtime ON inspection_lot (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_lot_work_order_runtime ON inspection_lot (work_order_id) WHERE work_order_id IS NOT NULL;

-- Standalone quality-agreement workspace lifecycle metadata.
ALTER TABLE eqms_quality_agreements ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE eqms_quality_agreements ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE eqms_quality_agreements ADD COLUMN IF NOT EXISTS acknowledged_by text;
ALTER TABLE eqms_quality_agreements ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_eqms_quality_agreements_status_runtime ON eqms_quality_agreements (status, expiry_date);

-- Governance metadata required by the Data Schema authority panel for EQMS tables.
CREATE OR REPLACE FUNCTION set_row_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name text;
    safe_name text;
BEGIN
    FOR table_name IN
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name LIKE 'eqms\_%' ESCAPE '\'
    LOOP
        safe_name := left(regexp_replace(table_name, '[^a-zA-Z0-9_]', '_', 'g'), 45);

        EXECUTE format(
            'ALTER TABLE %I
                ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
                ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
                ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
                ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
                ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT ''QMS'',
                ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
                ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT ''1.0''',
            table_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %I (source_system, source_record_id) WHERE source_record_id IS NOT NULL',
            'idx_' || safe_name || '_lineage',
            table_name
        );
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %I (org_company_code, org_legal_entity_code, org_plant_id, org_site_id)',
            'idx_' || safe_name || '_org_scope',
            table_name
        );
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_' || safe_name || '_row_version', table_name);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_row_version()',
            'trg_' || safe_name || '_row_version',
            table_name
        );
    END LOOP;
END $$;
