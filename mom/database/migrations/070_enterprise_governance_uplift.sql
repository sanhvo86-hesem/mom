-- ============================================================================
-- Migration 070: Enterprise Governance Uplift
-- Generated from table-registry to add organization scope, lineage, and
-- optimistic locking, retention, and integration governance foundations
-- across operational ERP + MES + eQMS tables.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS org_companies (
    company_code            VARCHAR(30) PRIMARY KEY,
    company_name            VARCHAR(255) NOT NULL,
    company_name_vi         VARCHAR(255),
    company_status          VARCHAR(30) NOT NULL DEFAULT 'active',
    default_currency_code   VARCHAR(10) DEFAULT 'VND',
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_legal_entities (
    legal_entity_code       VARCHAR(30) PRIMARY KEY,
    company_code            VARCHAR(30) NOT NULL REFERENCES org_companies(company_code),
    legal_entity_name       VARCHAR(255) NOT NULL,
    legal_entity_name_vi    VARCHAR(255),
    country_code            VARCHAR(10) DEFAULT 'VN',
    functional_currency_code VARCHAR(10) DEFAULT 'VND',
    legal_entity_status     VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_plants (
    plant_id                VARCHAR(30) PRIMARY KEY,
    legal_entity_code       VARCHAR(30) NOT NULL REFERENCES org_legal_entities(legal_entity_code),
    site_id                 VARCHAR(30) REFERENCES mes_sites(site_id),
    plant_name              VARCHAR(255) NOT NULL,
    plant_name_vi           VARCHAR(255),
    timezone                VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh',
    plant_status            VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_legal_entities_company ON org_legal_entities (company_code);
CREATE INDEX IF NOT EXISTS idx_org_plants_legal_entity ON org_plants (legal_entity_code);
CREATE INDEX IF NOT EXISTS idx_org_plants_site ON org_plants (site_id);

CREATE TABLE IF NOT EXISTS source_system_registry (
    source_system            VARCHAR(40) PRIMARY KEY,
    source_system_name       VARCHAR(255) NOT NULL,
    source_system_name_vi    VARCHAR(255),
    source_system_category   VARCHAR(80) NOT NULL,
    ownership_team           VARCHAR(120),
    synchronization_mode    VARCHAR(40) NOT NULL DEFAULT 'batch',
    trust_level             VARCHAR(40) NOT NULL DEFAULT 'verified',
    source_status           VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS retention_policies (
    policy_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retention_policy_code   VARCHAR(60) NOT NULL UNIQUE,
    policy_name             VARCHAR(255) NOT NULL,
    data_domain             VARCHAR(100) NOT NULL,
    table_name              VARCHAR(150) NOT NULL UNIQUE,
    retention_class         VARCHAR(60) NOT NULL,
    hot_retention_days      INTEGER NOT NULL DEFAULT 90,
    archive_retention_days  INTEGER,
    purge_after_days        INTEGER,
    archive_strategy       VARCHAR(60) NOT NULL DEFAULT 'partition_and_archive',
    storage_tier           VARCHAR(40) NOT NULL DEFAULT 'warm',
    legal_hold_allowed     BOOLEAN NOT NULL DEFAULT TRUE,
    policy_status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    owner_role              VARCHAR(120),
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS data_archival_runs (
    archive_run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id               UUID NOT NULL REFERENCES retention_policies(policy_id),
    table_name              VARCHAR(150) NOT NULL,
    archive_scope_start     TIMESTAMPTZ,
    archive_scope_end       TIMESTAMPTZ,
    candidate_row_count     BIGINT NOT NULL DEFAULT 0,
    archived_row_count      BIGINT NOT NULL DEFAULT 0,
    checksum_hash           VARCHAR(128),
    storage_tier           VARCHAR(40) NOT NULL DEFAULT 'archive',
    archive_status         VARCHAR(30) NOT NULL DEFAULT 'planned',
    metadata               JSONB DEFAULT '{}'::jsonb,
    started_at               TIMESTAMPTZ,
    completed_at             TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integration_monitors (
    integration_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_code        VARCHAR(60) NOT NULL UNIQUE,
    integration_name        VARCHAR(255) NOT NULL,
    source_system           VARCHAR(40) NOT NULL REFERENCES source_system_registry(source_system),
    target_system           VARCHAR(40) NOT NULL REFERENCES source_system_registry(source_system),
    integration_pattern    VARCHAR(40) NOT NULL DEFAULT 'event_driven',
    monitoring_status      VARCHAR(30) NOT NULL DEFAULT 'draft',
    severity_threshold     VARCHAR(30) NOT NULL DEFAULT 'major',
    reconciliation_sla_minutes INTEGER NOT NULL DEFAULT 60,
    owner_role              VARCHAR(120),
    last_health_check_at    TIMESTAMPTZ,
    last_success_at         TIMESTAMPTZ,
    last_failure_at         TIMESTAMPTZ,
    metadata                JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retention_policies_domain ON retention_policies (data_domain, policy_status);
CREATE INDEX IF NOT EXISTS idx_retention_policies_table ON retention_policies (table_name);
CREATE INDEX IF NOT EXISTS idx_data_archival_runs_policy ON data_archival_runs (policy_id, archive_status);
CREATE INDEX IF NOT EXISTS idx_integration_monitors_status ON integration_monitors (monitoring_status);
CREATE INDEX IF NOT EXISTS idx_integration_monitors_route ON integration_monitors (source_system, target_system);

INSERT INTO org_companies (company_code, company_name, company_name_vi, company_status, default_currency_code)
VALUES ('HESEM', 'HESEM', 'HESEM', 'active', 'VND')
ON CONFLICT (company_code) DO NOTHING;
INSERT INTO org_legal_entities (legal_entity_code, company_code, legal_entity_name, legal_entity_name_vi, country_code, functional_currency_code, legal_entity_status)
VALUES ('HESEM-VN', 'HESEM', 'HESEM Vietnam', 'HESEM Viet Nam', 'VN', 'VND', 'active')
ON CONFLICT (legal_entity_code) DO NOTHING;
INSERT INTO org_plants (plant_id, legal_entity_code, site_id, plant_name, plant_name_vi, timezone, plant_status)
VALUES ('HESEM-HCM-PLANT', 'HESEM-VN', 'HESEM-HCM', 'HESEM HCM Plant', 'Nha may HESEM HCM', 'Asia/Ho_Chi_Minh', 'active')
ON CONFLICT (plant_id) DO NOTHING;
INSERT INTO source_system_registry (source_system, source_system_name, source_system_name_vi, source_system_category, ownership_team, synchronization_mode, trust_level, source_status)
VALUES
    ('QMS', 'QMS Portal', 'Cong QMS', 'application', 'quality_platform', 'event_driven', 'system_of_record', 'active'),
    ('ERP', 'ERP Core', 'ERP Loi', 'erp', 'enterprise_platform', 'batch', 'system_of_record', 'active'),
    ('MES', 'MES Edge', 'MES Bien', 'mes', 'manufacturing_platform', 'event_driven', 'verified', 'active'),
    ('EQMS', 'Enterprise QMS', 'eQMS Doanh nghiep', 'quality', 'quality_platform', 'event_driven', 'verified', 'active')
ON CONFLICT (source_system) DO NOTHING;
INSERT INTO retention_policies (retention_policy_code, policy_name, data_domain, table_name, retention_class, hot_retention_days, archive_retention_days, purge_after_days, archive_strategy, storage_tier, legal_hold_allowed, policy_status, owner_role)
VALUES
    ('RET-MES-TELEMETRY', 'MES Telemetry Retention', 'mes_execution', 'mes_machine_telemetry', 'high_volume_event', 30, 365, 2555, 'partition_and_archive', 'hot', TRUE, 'active', 'manufacturing_data_governor'),
    ('RET-MES-SNAPSHOT', 'MES Snapshot Retention', 'mes_execution', 'mes_machine_snapshot', 'high_volume_snapshot', 30, 365, 1825, 'partition_and_archive', 'warm', TRUE, 'active', 'manufacturing_data_governor'),
    ('RET-TRACE-GENEALOGY', 'Genealogy Retention', 'traceability_serialization', 'mes_genealogy_operations', 'traceability_record', 180, 1825, NULL, 'archive_only', 'warm', TRUE, 'active', 'traceability_governor'),
    ('RET-WORKFLOW-STEP', 'Workflow Step Evidence Retention', 'system_infrastructure', 'workflow_step_data', 'workflow_evidence', 90, 1095, 3650, 'archive_only', 'warm', TRUE, 'active', 'platform_governor'),
    ('RET-LEAN-ANDON', 'Lean Andon Retention', 'lean_manufacturing', 'lean_andon_events', 'operational_event', 90, 730, 1825, 'partition_and_archive', 'warm', TRUE, 'active', 'lean_governor'),
    ('RET-CAPA-8D', 'CAPA 8D Structured Retention', 'quality_management', 'capa_8d_steps', 'quality_record', 365, 3650, NULL, 'archive_only', 'warm', TRUE, 'active', 'quality_data_steward')
ON CONFLICT (table_name) DO NOTHING;
INSERT INTO integration_monitors (integration_code, integration_name, source_system, target_system, integration_pattern, monitoring_status, severity_threshold, reconciliation_sla_minutes, owner_role)
VALUES
    ('INT-ERP-MES', 'ERP to MES Production Sync', 'ERP', 'MES', 'event_driven', 'active', 'major', 30, 'integration_owner'),
    ('INT-MES-EQMS', 'MES to eQMS Quality Event Sync', 'MES', 'EQMS', 'event_driven', 'active', 'critical', 15, 'quality_integration_owner'),
    ('INT-QMS-ERP', 'QMS to ERP Compliance Sync', 'QMS', 'ERP', 'batch', 'active', 'major', 60, 'enterprise_integration_owner')
ON CONFLICT (integration_code) DO NOTHING;

CREATE OR REPLACE FUNCTION set_row_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ap_ar_invoices
ALTER TABLE ap_ar_invoices
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ap_ar_invoices_lineage ON ap_ar_invoices (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ap_ar_invoices_org_scope ON ap_ar_invoices (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ap_ar_invoices_row_version ON ap_ar_invoices;
CREATE TRIGGER trg_ap_ar_invoices_row_version BEFORE UPDATE ON ap_ar_invoices FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- approved_supplier_list
ALTER TABLE approved_supplier_list
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_approved_supplier_list_lineage ON approved_supplier_list (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approved_supplier_list_org_scope ON approved_supplier_list (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_approved_supplier_list_row_version ON approved_supplier_list;
CREATE TRIGGER trg_approved_supplier_list_row_version BEFORE UPDATE ON approved_supplier_list FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- apqp_gate_reviews
ALTER TABLE apqp_gate_reviews
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_apqp_gate_reviews_lineage ON apqp_gate_reviews (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apqp_gate_reviews_org_scope ON apqp_gate_reviews (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_apqp_gate_reviews_row_version ON apqp_gate_reviews;
CREATE TRIGGER trg_apqp_gate_reviews_row_version BEFORE UPDATE ON apqp_gate_reviews FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- apqp_projects
ALTER TABLE apqp_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_apqp_projects_lineage ON apqp_projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apqp_projects_org_scope ON apqp_projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_apqp_projects_row_version ON apqp_projects;
CREATE TRIGGER trg_apqp_projects_row_version BEFORE UPDATE ON apqp_projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_capacity_buckets
ALTER TABLE aps_capacity_buckets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_capacity_buckets_lineage ON aps_capacity_buckets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_capacity_buckets_org_scope ON aps_capacity_buckets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_capacity_buckets_row_version ON aps_capacity_buckets;
CREATE TRIGGER trg_aps_capacity_buckets_row_version BEFORE UPDATE ON aps_capacity_buckets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_constraint_resources
ALTER TABLE aps_constraint_resources
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_constraint_resources_lineage ON aps_constraint_resources (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_constraint_resources_org_scope ON aps_constraint_resources (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_constraint_resources_row_version ON aps_constraint_resources;
CREATE TRIGGER trg_aps_constraint_resources_row_version BEFORE UPDATE ON aps_constraint_resources FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_demand_forecasts
ALTER TABLE aps_demand_forecasts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_demand_forecasts_lineage ON aps_demand_forecasts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_demand_forecasts_org_scope ON aps_demand_forecasts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_demand_forecasts_row_version ON aps_demand_forecasts;
CREATE TRIGGER trg_aps_demand_forecasts_row_version BEFORE UPDATE ON aps_demand_forecasts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_material_availability
ALTER TABLE aps_material_availability
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_material_availability_lineage ON aps_material_availability (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_material_availability_org_scope ON aps_material_availability (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_material_availability_row_version ON aps_material_availability;
CREATE TRIGGER trg_aps_material_availability_row_version BEFORE UPDATE ON aps_material_availability FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_planning_horizons
ALTER TABLE aps_planning_horizons
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_planning_horizons_lineage ON aps_planning_horizons (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_planning_horizons_org_scope ON aps_planning_horizons (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_planning_horizons_row_version ON aps_planning_horizons;
CREATE TRIGGER trg_aps_planning_horizons_row_version BEFORE UPDATE ON aps_planning_horizons FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_planning_scenarios
ALTER TABLE aps_planning_scenarios
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_planning_scenarios_lineage ON aps_planning_scenarios (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_planning_scenarios_org_scope ON aps_planning_scenarios (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_planning_scenarios_row_version ON aps_planning_scenarios;
CREATE TRIGGER trg_aps_planning_scenarios_row_version BEFORE UPDATE ON aps_planning_scenarios FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_schedule_blocks
ALTER TABLE aps_schedule_blocks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_schedule_blocks_lineage ON aps_schedule_blocks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_schedule_blocks_org_scope ON aps_schedule_blocks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_schedule_blocks_row_version ON aps_schedule_blocks;
CREATE TRIGGER trg_aps_schedule_blocks_row_version BEFORE UPDATE ON aps_schedule_blocks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_schedule_conflicts
ALTER TABLE aps_schedule_conflicts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_schedule_conflicts_lineage ON aps_schedule_conflicts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_schedule_conflicts_org_scope ON aps_schedule_conflicts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_schedule_conflicts_row_version ON aps_schedule_conflicts;
CREATE TRIGGER trg_aps_schedule_conflicts_row_version BEFORE UPDATE ON aps_schedule_conflicts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- aps_setup_matrices
ALTER TABLE aps_setup_matrices
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_aps_setup_matrices_lineage ON aps_setup_matrices (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_setup_matrices_org_scope ON aps_setup_matrices (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_setup_matrices_row_version ON aps_setup_matrices;
CREATE TRIGGER trg_aps_setup_matrices_row_version BEFORE UPDATE ON aps_setup_matrices FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audit_actions
ALTER TABLE audit_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_audit_actions_lineage ON audit_actions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_actions_org_scope ON audit_actions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audit_actions_row_version ON audit_actions;
CREATE TRIGGER trg_audit_actions_row_version BEFORE UPDATE ON audit_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audit_findings
ALTER TABLE audit_findings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_audit_findings_lineage ON audit_findings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_findings_org_scope ON audit_findings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audit_findings_row_version ON audit_findings;
CREATE TRIGGER trg_audit_findings_row_version BEFORE UPDATE ON audit_findings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audits
ALTER TABLE audits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_audits_lineage ON audits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audits_org_scope ON audits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audits_row_version ON audits;
CREATE TRIGGER trg_audits_row_version BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bill_of_materials
ALTER TABLE bill_of_materials
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_bill_of_materials_lineage ON bill_of_materials (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bill_of_materials_org_scope ON bill_of_materials (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bill_of_materials_row_version ON bill_of_materials;
CREATE TRIGGER trg_bill_of_materials_row_version BEFORE UPDATE ON bill_of_materials FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bom_components
ALTER TABLE bom_components
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_bom_components_lineage ON bom_components (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bom_components_org_scope ON bom_components (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bom_components_row_version ON bom_components;
CREATE TRIGGER trg_bom_components_row_version BEFORE UPDATE ON bom_components FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- calibration_grr_studies
ALTER TABLE calibration_grr_studies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_calibration_grr_studies_lineage ON calibration_grr_studies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calibration_grr_studies_org_scope ON calibration_grr_studies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_calibration_grr_studies_row_version ON calibration_grr_studies;
CREATE TRIGGER trg_calibration_grr_studies_row_version BEFORE UPDATE ON calibration_grr_studies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- calibration_oot_investigations
ALTER TABLE calibration_oot_investigations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_calibration_oot_investigations_lineage ON calibration_oot_investigations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calibration_oot_investigations_org_scope ON calibration_oot_investigations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_calibration_oot_investigations_row_version ON calibration_oot_investigations;
CREATE TRIGGER trg_calibration_oot_investigations_row_version BEFORE UPDATE ON calibration_oot_investigations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- calibration_records
ALTER TABLE calibration_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_calibration_records_lineage ON calibration_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calibration_records_org_scope ON calibration_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_calibration_records_row_version ON calibration_records;
CREATE TRIGGER trg_calibration_records_row_version BEFORE UPDATE ON calibration_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- capa_effectiveness_checks
ALTER TABLE capa_effectiveness_checks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_capa_effectiveness_checks_lineage ON capa_effectiveness_checks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capa_effectiveness_checks_org_scope ON capa_effectiveness_checks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_capa_effectiveness_checks_row_version ON capa_effectiveness_checks;
CREATE TRIGGER trg_capa_effectiveness_checks_row_version BEFORE UPDATE ON capa_effectiveness_checks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- capa_records
ALTER TABLE capa_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_capa_records_lineage ON capa_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capa_records_org_scope ON capa_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_capa_records_row_version ON capa_records;
CREATE TRIGGER trg_capa_records_row_version BEFORE UPDATE ON capa_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- certificates
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_certificates_lineage ON certificates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificates_org_scope ON certificates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_certificates_row_version ON certificates;
CREATE TRIGGER trg_certificates_row_version BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- cnc_program_approvals
ALTER TABLE cnc_program_approvals
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_cnc_program_approvals_lineage ON cnc_program_approvals (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cnc_program_approvals_org_scope ON cnc_program_approvals (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_cnc_program_approvals_row_version ON cnc_program_approvals;
CREATE TRIGGER trg_cnc_program_approvals_row_version BEFORE UPDATE ON cnc_program_approvals FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- cnc_programs
ALTER TABLE cnc_programs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_cnc_programs_lineage ON cnc_programs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cnc_programs_org_scope ON cnc_programs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_cnc_programs_row_version ON cnc_programs;
CREATE TRIGGER trg_cnc_programs_row_version BEFORE UPDATE ON cnc_programs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_contract_amendments
ALTER TABLE com_contract_amendments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_contract_amendments_lineage ON com_contract_amendments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_contract_amendments_org_scope ON com_contract_amendments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_contract_amendments_row_version ON com_contract_amendments;
CREATE TRIGGER trg_com_contract_amendments_row_version BEFORE UPDATE ON com_contract_amendments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_contracts
ALTER TABLE com_contracts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_contracts_lineage ON com_contracts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_contracts_org_scope ON com_contracts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_contracts_row_version ON com_contracts;
CREATE TRIGGER trg_com_contracts_row_version BEFORE UPDATE ON com_contracts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_credit_profiles
ALTER TABLE com_credit_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_credit_profiles_lineage ON com_credit_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_credit_profiles_org_scope ON com_credit_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_credit_profiles_row_version ON com_credit_profiles;
CREATE TRIGGER trg_com_credit_profiles_row_version BEFORE UPDATE ON com_credit_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_customer_scorecards
ALTER TABLE com_customer_scorecards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_customer_scorecards_lineage ON com_customer_scorecards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_customer_scorecards_org_scope ON com_customer_scorecards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_customer_scorecards_row_version ON com_customer_scorecards;
CREATE TRIGGER trg_com_customer_scorecards_row_version BEFORE UPDATE ON com_customer_scorecards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_incoterms_profiles
ALTER TABLE com_incoterms_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_incoterms_profiles_lineage ON com_incoterms_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_incoterms_profiles_org_scope ON com_incoterms_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_incoterms_profiles_row_version ON com_incoterms_profiles;
CREATE TRIGGER trg_com_incoterms_profiles_row_version BEFORE UPDATE ON com_incoterms_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_order_promises
ALTER TABLE com_order_promises
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_order_promises_lineage ON com_order_promises (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_order_promises_org_scope ON com_order_promises (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_order_promises_row_version ON com_order_promises;
CREATE TRIGGER trg_com_order_promises_row_version BEFORE UPDATE ON com_order_promises FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_payment_terms_profiles
ALTER TABLE com_payment_terms_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_payment_terms_profiles_lineage ON com_payment_terms_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_payment_terms_profiles_org_scope ON com_payment_terms_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_payment_terms_profiles_row_version ON com_payment_terms_profiles;
CREATE TRIGGER trg_com_payment_terms_profiles_row_version BEFORE UPDATE ON com_payment_terms_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_price_lists
ALTER TABLE com_price_lists
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_price_lists_lineage ON com_price_lists (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_price_lists_org_scope ON com_price_lists (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_price_lists_row_version ON com_price_lists;
CREATE TRIGGER trg_com_price_lists_row_version BEFORE UPDATE ON com_price_lists FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_rebate_accruals
ALTER TABLE com_rebate_accruals
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_rebate_accruals_lineage ON com_rebate_accruals (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_rebate_accruals_org_scope ON com_rebate_accruals (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_rebate_accruals_row_version ON com_rebate_accruals;
CREATE TRIGGER trg_com_rebate_accruals_row_version BEFORE UPDATE ON com_rebate_accruals FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- com_rebate_programs
ALTER TABLE com_rebate_programs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_com_rebate_programs_lineage ON com_rebate_programs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_com_rebate_programs_org_scope ON com_rebate_programs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_com_rebate_programs_row_version ON com_rebate_programs;
CREATE TRIGGER trg_com_rebate_programs_row_version BEFORE UPDATE ON com_rebate_programs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- comments
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_comments_lineage ON comments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_org_scope ON comments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_comments_row_version ON comments;
CREATE TRIGGER trg_comments_row_version BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- commercial_accounts
ALTER TABLE commercial_accounts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_lineage ON commercial_accounts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_org_scope ON commercial_accounts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_commercial_accounts_row_version ON commercial_accounts;
CREATE TRIGGER trg_commercial_accounts_row_version BEFORE UPDATE ON commercial_accounts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- compliance_records
ALTER TABLE compliance_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_compliance_records_lineage ON compliance_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_records_org_scope ON compliance_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_compliance_records_row_version ON compliance_records;
CREATE TRIGGER trg_compliance_records_row_version BEFORE UPDATE ON compliance_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- concessions
ALTER TABLE concessions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_concessions_lineage ON concessions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concessions_org_scope ON concessions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_concessions_row_version ON concessions;
CREATE TRIGGER trg_concessions_row_version BEFORE UPDATE ON concessions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- contamination_checks
ALTER TABLE contamination_checks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_contamination_checks_lineage ON contamination_checks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contamination_checks_org_scope ON contamination_checks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_contamination_checks_row_version ON contamination_checks;
CREATE TRIGGER trg_contamination_checks_row_version BEFORE UPDATE ON contamination_checks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- control_plan_characteristics
ALTER TABLE control_plan_characteristics
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_control_plan_characteristics_lineage ON control_plan_characteristics (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_plan_characteristics_org_scope ON control_plan_characteristics (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_control_plan_characteristics_row_version ON control_plan_characteristics;
CREATE TRIGGER trg_control_plan_characteristics_row_version BEFORE UPDATE ON control_plan_characteristics FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- control_plans
ALTER TABLE control_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_control_plans_lineage ON control_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_plans_org_scope ON control_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_control_plans_row_version ON control_plans;
CREATE TRIGGER trg_control_plans_row_version BEFORE UPDATE ON control_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- copq_ledger
ALTER TABLE copq_ledger
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_copq_ledger_lineage ON copq_ledger (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copq_ledger_org_scope ON copq_ledger (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_copq_ledger_row_version ON copq_ledger;
CREATE TRIGGER trg_copq_ledger_row_version BEFORE UPDATE ON copq_ledger FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- cost_elements
ALTER TABLE cost_elements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_cost_elements_lineage ON cost_elements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_elements_org_scope ON cost_elements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_cost_elements_row_version ON cost_elements;
CREATE TRIGGER trg_cost_elements_row_version BEFORE UPDATE ON cost_elements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_accounts
ALTER TABLE crm_accounts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_lineage ON crm_accounts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_org_scope ON crm_accounts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_accounts_row_version ON crm_accounts;
CREATE TRIGGER trg_crm_accounts_row_version BEFORE UPDATE ON crm_accounts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_activities
ALTER TABLE crm_activities
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_activities_lineage ON crm_activities (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_org_scope ON crm_activities (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_activities_row_version ON crm_activities;
CREATE TRIGGER trg_crm_activities_row_version BEFORE UPDATE ON crm_activities FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_campaigns
ALTER TABLE crm_campaigns
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_lineage ON crm_campaigns (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_org_scope ON crm_campaigns (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_campaigns_row_version ON crm_campaigns;
CREATE TRIGGER trg_crm_campaigns_row_version BEFORE UPDATE ON crm_campaigns FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_contacts
ALTER TABLE crm_contacts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lineage ON crm_contacts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_scope ON crm_contacts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_contacts_row_version ON crm_contacts;
CREATE TRIGGER trg_crm_contacts_row_version BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_customer_touchpoints
ALTER TABLE crm_customer_touchpoints
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_customer_touchpoints_lineage ON crm_customer_touchpoints (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_customer_touchpoints_org_scope ON crm_customer_touchpoints (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_customer_touchpoints_row_version ON crm_customer_touchpoints;
CREATE TRIGGER trg_crm_customer_touchpoints_row_version BEFORE UPDATE ON crm_customer_touchpoints FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_forecasts
ALTER TABLE crm_forecasts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_forecasts_lineage ON crm_forecasts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_forecasts_org_scope ON crm_forecasts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_forecasts_row_version ON crm_forecasts;
CREATE TRIGGER trg_crm_forecasts_row_version BEFORE UPDATE ON crm_forecasts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_leads
ALTER TABLE crm_leads
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_leads_lineage ON crm_leads (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_org_scope ON crm_leads (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_leads_row_version ON crm_leads;
CREATE TRIGGER trg_crm_leads_row_version BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_opportunities
ALTER TABLE crm_opportunities
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_lineage ON crm_opportunities (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_org_scope ON crm_opportunities (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_opportunities_row_version ON crm_opportunities;
CREATE TRIGGER trg_crm_opportunities_row_version BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- crm_quotes_pipeline
ALTER TABLE crm_quotes_pipeline
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_crm_quotes_pipeline_lineage ON crm_quotes_pipeline (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_quotes_pipeline_org_scope ON crm_quotes_pipeline (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_crm_quotes_pipeline_row_version ON crm_quotes_pipeline;
CREATE TRIGGER trg_crm_quotes_pipeline_row_version BEFORE UPDATE ON crm_quotes_pipeline FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- customer_complaints
ALTER TABLE customer_complaints
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_customer_complaints_lineage ON customer_complaints (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_complaints_org_scope ON customer_complaints (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_customer_complaints_row_version ON customer_complaints;
CREATE TRIGGER trg_customer_complaints_row_version BEFORE UPDATE ON customer_complaints FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- customer_sites
ALTER TABLE customer_sites
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_customer_sites_lineage ON customer_sites (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_sites_org_scope ON customer_sites (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_customer_sites_row_version ON customer_sites;
CREATE TRIGGER trg_customer_sites_row_version BEFORE UPDATE ON customer_sites FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- customers
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_customers_lineage ON customers (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_org_scope ON customers (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_customers_row_version ON customers;
CREATE TRIGGER trg_customers_row_version BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- demand_classifications
ALTER TABLE demand_classifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_demand_classifications_lineage ON demand_classifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demand_classifications_org_scope ON demand_classifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_demand_classifications_row_version ON demand_classifications;
CREATE TRIGGER trg_demand_classifications_row_version BEFORE UPDATE ON demand_classifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- demand_history_buckets
ALTER TABLE demand_history_buckets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_demand_history_buckets_lineage ON demand_history_buckets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demand_history_buckets_org_scope ON demand_history_buckets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_demand_history_buckets_row_version ON demand_history_buckets;
CREATE TRIGGER trg_demand_history_buckets_row_version BEFORE UPDATE ON demand_history_buckets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- departments
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_departments_lineage ON departments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_org_scope ON departments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_departments_row_version ON departments;
CREATE TRIGGER trg_departments_row_version BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- deviations
ALTER TABLE deviations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_deviations_lineage ON deviations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deviations_org_scope ON deviations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_deviations_row_version ON deviations;
CREATE TRIGGER trg_deviations_row_version BEFORE UPDATE ON deviations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- document_distribution
ALTER TABLE document_distribution
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_document_distribution_lineage ON document_distribution (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_distribution_org_scope ON document_distribution (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_document_distribution_row_version ON document_distribution;
CREATE TRIGGER trg_document_distribution_row_version BEFORE UPDATE ON document_distribution FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- document_embeddings
ALTER TABLE document_embeddings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_document_embeddings_lineage ON document_embeddings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_embeddings_org_scope ON document_embeddings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_document_embeddings_row_version ON document_embeddings;
CREATE TRIGGER trg_document_embeddings_row_version BEFORE UPDATE ON document_embeddings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- documents
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_documents_lineage ON documents (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_org_scope ON documents (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_documents_row_version ON documents;
CREATE TRIGGER trg_documents_row_version BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_contractors
ALTER TABLE ehs_contractors
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_contractors_lineage ON ehs_contractors (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_contractors_org_scope ON ehs_contractors (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_contractors_row_version ON ehs_contractors;
CREATE TRIGGER trg_ehs_contractors_row_version BEFORE UPDATE ON ehs_contractors FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_corrective_actions
ALTER TABLE ehs_corrective_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_corrective_actions_lineage ON ehs_corrective_actions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_corrective_actions_org_scope ON ehs_corrective_actions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_corrective_actions_row_version ON ehs_corrective_actions;
CREATE TRIGGER trg_ehs_corrective_actions_row_version BEFORE UPDATE ON ehs_corrective_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_emergency_drills
ALTER TABLE ehs_emergency_drills
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_emergency_drills_lineage ON ehs_emergency_drills (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_emergency_drills_org_scope ON ehs_emergency_drills (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_emergency_drills_row_version ON ehs_emergency_drills;
CREATE TRIGGER trg_ehs_emergency_drills_row_version BEFORE UPDATE ON ehs_emergency_drills FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_emissions_monitoring
ALTER TABLE ehs_emissions_monitoring
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_emissions_monitoring_lineage ON ehs_emissions_monitoring (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_emissions_monitoring_org_scope ON ehs_emissions_monitoring (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_emissions_monitoring_row_version ON ehs_emissions_monitoring;
CREATE TRIGGER trg_ehs_emissions_monitoring_row_version BEFORE UPDATE ON ehs_emissions_monitoring FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_energy_targets
ALTER TABLE ehs_energy_targets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_energy_targets_lineage ON ehs_energy_targets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_energy_targets_org_scope ON ehs_energy_targets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_energy_targets_row_version ON ehs_energy_targets;
CREATE TRIGGER trg_ehs_energy_targets_row_version BEFORE UPDATE ON ehs_energy_targets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_exposure_assessments
ALTER TABLE ehs_exposure_assessments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_exposure_assessments_lineage ON ehs_exposure_assessments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_exposure_assessments_org_scope ON ehs_exposure_assessments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_exposure_assessments_row_version ON ehs_exposure_assessments;
CREATE TRIGGER trg_ehs_exposure_assessments_row_version BEFORE UPDATE ON ehs_exposure_assessments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_hazardous_materials
ALTER TABLE ehs_hazardous_materials
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_hazardous_materials_lineage ON ehs_hazardous_materials (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_hazardous_materials_org_scope ON ehs_hazardous_materials (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_hazardous_materials_row_version ON ehs_hazardous_materials;
CREATE TRIGGER trg_ehs_hazardous_materials_row_version BEFORE UPDATE ON ehs_hazardous_materials FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_incidents
ALTER TABLE ehs_incidents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_incidents_lineage ON ehs_incidents (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_incidents_org_scope ON ehs_incidents (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_incidents_row_version ON ehs_incidents;
CREATE TRIGGER trg_ehs_incidents_row_version BEFORE UPDATE ON ehs_incidents FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_material_safety_data
ALTER TABLE ehs_material_safety_data
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_material_safety_data_lineage ON ehs_material_safety_data (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_material_safety_data_org_scope ON ehs_material_safety_data (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_material_safety_data_row_version ON ehs_material_safety_data;
CREATE TRIGGER trg_ehs_material_safety_data_row_version BEFORE UPDATE ON ehs_material_safety_data FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_permit_register
ALTER TABLE ehs_permit_register
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_permit_register_lineage ON ehs_permit_register (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_permit_register_org_scope ON ehs_permit_register (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_permit_register_row_version ON ehs_permit_register;
CREATE TRIGGER trg_ehs_permit_register_row_version BEFORE UPDATE ON ehs_permit_register FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_regulatory_submissions
ALTER TABLE ehs_regulatory_submissions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_regulatory_submissions_lineage ON ehs_regulatory_submissions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_regulatory_submissions_org_scope ON ehs_regulatory_submissions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_regulatory_submissions_row_version ON ehs_regulatory_submissions;
CREATE TRIGGER trg_ehs_regulatory_submissions_row_version BEFORE UPDATE ON ehs_regulatory_submissions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_sustainability_projects
ALTER TABLE ehs_sustainability_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_sustainability_projects_lineage ON ehs_sustainability_projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_sustainability_projects_org_scope ON ehs_sustainability_projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_sustainability_projects_row_version ON ehs_sustainability_projects;
CREATE TRIGGER trg_ehs_sustainability_projects_row_version BEFORE UPDATE ON ehs_sustainability_projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_training_matrix
ALTER TABLE ehs_training_matrix
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_training_matrix_lineage ON ehs_training_matrix (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_training_matrix_org_scope ON ehs_training_matrix (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_training_matrix_row_version ON ehs_training_matrix;
CREATE TRIGGER trg_ehs_training_matrix_row_version BEFORE UPDATE ON ehs_training_matrix FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_waste_shipments
ALTER TABLE ehs_waste_shipments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_waste_shipments_lineage ON ehs_waste_shipments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_waste_shipments_org_scope ON ehs_waste_shipments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_waste_shipments_row_version ON ehs_waste_shipments;
CREATE TRIGGER trg_ehs_waste_shipments_row_version BEFORE UPDATE ON ehs_waste_shipments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_waste_streams
ALTER TABLE ehs_waste_streams
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ehs_waste_streams_lineage ON ehs_waste_streams (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_waste_streams_org_scope ON ehs_waste_streams (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_waste_streams_row_version ON ehs_waste_streams;
CREATE TRIGGER trg_ehs_waste_streams_row_version BEFORE UPDATE ON ehs_waste_streams FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- employee_certifications
ALTER TABLE employee_certifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_lineage ON employee_certifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_org_scope ON employee_certifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_employee_certifications_row_version ON employee_certifications;
CREATE TRIGGER trg_employee_certifications_row_version BEFORE UPDATE ON employee_certifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- employees
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_employees_lineage ON employees (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_org_scope ON employees (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_employees_row_version ON employees;
CREATE TRIGGER trg_employees_row_version BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_capacity_models
ALTER TABLE eng_capacity_models
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_capacity_models_lineage ON eng_capacity_models (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_capacity_models_org_scope ON eng_capacity_models (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_capacity_models_row_version ON eng_capacity_models;
CREATE TRIGGER trg_eng_capacity_models_row_version BEFORE UPDATE ON eng_capacity_models FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_changeover_standards
ALTER TABLE eng_changeover_standards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_changeover_standards_lineage ON eng_changeover_standards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_changeover_standards_org_scope ON eng_changeover_standards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_changeover_standards_row_version ON eng_changeover_standards;
CREATE TRIGGER trg_eng_changeover_standards_row_version BEFORE UPDATE ON eng_changeover_standards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_factory_calendar_days
ALTER TABLE eng_factory_calendar_days
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_factory_calendar_days_lineage ON eng_factory_calendar_days (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_factory_calendar_days_org_scope ON eng_factory_calendar_days (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_factory_calendar_days_row_version ON eng_factory_calendar_days;
CREATE TRIGGER trg_eng_factory_calendar_days_row_version BEFORE UPDATE ON eng_factory_calendar_days FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_factory_calendars
ALTER TABLE eng_factory_calendars
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_factory_calendars_lineage ON eng_factory_calendars (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_factory_calendars_org_scope ON eng_factory_calendars (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_factory_calendars_row_version ON eng_factory_calendars;
CREATE TRIGGER trg_eng_factory_calendars_row_version BEFORE UPDATE ON eng_factory_calendars FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_line_balancing_studies
ALTER TABLE eng_line_balancing_studies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_line_balancing_studies_lineage ON eng_line_balancing_studies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_line_balancing_studies_org_scope ON eng_line_balancing_studies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_line_balancing_studies_row_version ON eng_line_balancing_studies;
CREATE TRIGGER trg_eng_line_balancing_studies_row_version BEFORE UPDATE ON eng_line_balancing_studies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_process_families
ALTER TABLE eng_process_families
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_process_families_lineage ON eng_process_families (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_process_families_org_scope ON eng_process_families (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_process_families_row_version ON eng_process_families;
CREATE TRIGGER trg_eng_process_families_row_version BEFORE UPDATE ON eng_process_families FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_process_validation
ALTER TABLE eng_process_validation
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_process_validation_lineage ON eng_process_validation (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_process_validation_org_scope ON eng_process_validation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_process_validation_row_version ON eng_process_validation;
CREATE TRIGGER trg_eng_process_validation_row_version BEFORE UPDATE ON eng_process_validation FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_resource_groups
ALTER TABLE eng_resource_groups
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_resource_groups_lineage ON eng_resource_groups (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_resource_groups_org_scope ON eng_resource_groups (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_resource_groups_row_version ON eng_resource_groups;
CREATE TRIGGER trg_eng_resource_groups_row_version BEFORE UPDATE ON eng_resource_groups FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_time_standards
ALTER TABLE eng_time_standards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_time_standards_lineage ON eng_time_standards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_time_standards_org_scope ON eng_time_standards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_time_standards_row_version ON eng_time_standards;
CREATE TRIGGER trg_eng_time_standards_row_version BEFORE UPDATE ON eng_time_standards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- eng_work_instructions
ALTER TABLE eng_work_instructions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_eng_work_instructions_lineage ON eng_work_instructions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eng_work_instructions_org_scope ON eng_work_instructions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_eng_work_instructions_row_version ON eng_work_instructions;
CREATE TRIGGER trg_eng_work_instructions_row_version BEFORE UPDATE ON eng_work_instructions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- engineering_change_requests
ALTER TABLE engineering_change_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_engineering_change_requests_lineage ON engineering_change_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engineering_change_requests_org_scope ON engineering_change_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_engineering_change_requests_row_version ON engineering_change_requests;
CREATE TRIGGER trg_engineering_change_requests_row_version BEFORE UPDATE ON engineering_change_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- equipment
ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_equipment_lineage ON equipment (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_org_scope ON equipment (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_equipment_row_version ON equipment;
CREATE TRIGGER trg_equipment_row_version BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- escalation_rules
ALTER TABLE escalation_rules
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_lineage ON escalation_rules (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_org_scope ON escalation_rules (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_escalation_rules_row_version ON escalation_rules;
CREATE TRIGGER trg_escalation_rules_row_version BEFORE UPDATE ON escalation_rules FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- evidence_chain_custody
ALTER TABLE evidence_chain_custody
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_evidence_chain_custody_lineage ON evidence_chain_custody (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_chain_custody_org_scope ON evidence_chain_custody (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_evidence_chain_custody_row_version ON evidence_chain_custody;
CREATE TRIGGER trg_evidence_chain_custody_row_version BEFORE UPDATE ON evidence_chain_custody FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- evidence_fts
ALTER TABLE evidence_fts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_evidence_fts_lineage ON evidence_fts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_fts_org_scope ON evidence_fts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_evidence_fts_row_version ON evidence_fts;
CREATE TRIGGER trg_evidence_fts_row_version BEFORE UPDATE ON evidence_fts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- evidence_vault
ALTER TABLE evidence_vault
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_evidence_vault_lineage ON evidence_vault (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_vault_org_scope ON evidence_vault (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_evidence_vault_row_version ON evidence_vault;
CREATE TRIGGER trg_evidence_vault_row_version BEFORE UPDATE ON evidence_vault FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- export_licenses
ALTER TABLE export_licenses
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_export_licenses_lineage ON export_licenses (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_export_licenses_org_scope ON export_licenses (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_export_licenses_row_version ON export_licenses;
CREATE TRIGGER trg_export_licenses_row_version BEFORE UPDATE ON export_licenses FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fai_characteristics
ALTER TABLE fai_characteristics
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fai_characteristics_lineage ON fai_characteristics (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fai_characteristics_org_scope ON fai_characteristics (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fai_characteristics_row_version ON fai_characteristics;
CREATE TRIGGER trg_fai_characteristics_row_version BEFORE UPDATE ON fai_characteristics FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fai_records
ALTER TABLE fai_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fai_records_lineage ON fai_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fai_records_org_scope ON fai_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fai_records_row_version ON fai_records;
CREATE TRIGGER trg_fai_records_row_version BEFORE UPDATE ON fai_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- file_attachments
ALTER TABLE file_attachments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_file_attachments_lineage ON file_attachments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_attachments_org_scope ON file_attachments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_file_attachments_row_version ON file_attachments;
CREATE TRIGGER trg_file_attachments_row_version BEFORE UPDATE ON file_attachments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_asset_depreciation
ALTER TABLE fin_asset_depreciation
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_asset_depreciation_lineage ON fin_asset_depreciation (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_asset_depreciation_org_scope ON fin_asset_depreciation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_asset_depreciation_row_version ON fin_asset_depreciation;
CREATE TRIGGER trg_fin_asset_depreciation_row_version BEFORE UPDATE ON fin_asset_depreciation FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_bank_reconciliations
ALTER TABLE fin_bank_reconciliations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_bank_reconciliations_lineage ON fin_bank_reconciliations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_bank_reconciliations_org_scope ON fin_bank_reconciliations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_bank_reconciliations_row_version ON fin_bank_reconciliations;
CREATE TRIGGER trg_fin_bank_reconciliations_row_version BEFORE UPDATE ON fin_bank_reconciliations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_cash_accounts
ALTER TABLE fin_cash_accounts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_cash_accounts_lineage ON fin_cash_accounts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_cash_accounts_org_scope ON fin_cash_accounts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_cash_accounts_row_version ON fin_cash_accounts;
CREATE TRIGGER trg_fin_cash_accounts_row_version BEFORE UPDATE ON fin_cash_accounts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_cash_transactions
ALTER TABLE fin_cash_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_cash_transactions_lineage ON fin_cash_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_cash_transactions_org_scope ON fin_cash_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_cash_transactions_row_version ON fin_cash_transactions;
CREATE TRIGGER trg_fin_cash_transactions_row_version BEFORE UPDATE ON fin_cash_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_country_tax_profiles
ALTER TABLE fin_country_tax_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_country_tax_profiles_lineage ON fin_country_tax_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_country_tax_profiles_org_scope ON fin_country_tax_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_country_tax_profiles_row_version ON fin_country_tax_profiles;
CREATE TRIGGER trg_fin_country_tax_profiles_row_version BEFORE UPDATE ON fin_country_tax_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_currencies
ALTER TABLE fin_currencies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_currencies_lineage ON fin_currencies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_currencies_org_scope ON fin_currencies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_currencies_row_version ON fin_currencies;
CREATE TRIGGER trg_fin_currencies_row_version BEFORE UPDATE ON fin_currencies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_customs_declarations
ALTER TABLE fin_customs_declarations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_customs_declarations_lineage ON fin_customs_declarations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_customs_declarations_org_scope ON fin_customs_declarations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_customs_declarations_row_version ON fin_customs_declarations;
CREATE TRIGGER trg_fin_customs_declarations_row_version BEFORE UPDATE ON fin_customs_declarations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_customs_tariff_codes
ALTER TABLE fin_customs_tariff_codes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_customs_tariff_codes_lineage ON fin_customs_tariff_codes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_customs_tariff_codes_org_scope ON fin_customs_tariff_codes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_customs_tariff_codes_row_version ON fin_customs_tariff_codes;
CREATE TRIGGER trg_fin_customs_tariff_codes_row_version BEFORE UPDATE ON fin_customs_tariff_codes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_exchange_rate_types
ALTER TABLE fin_exchange_rate_types
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_exchange_rate_types_lineage ON fin_exchange_rate_types (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_exchange_rate_types_org_scope ON fin_exchange_rate_types (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_exchange_rate_types_row_version ON fin_exchange_rate_types;
CREATE TRIGGER trg_fin_exchange_rate_types_row_version BEFORE UPDATE ON fin_exchange_rate_types FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_exchange_rates
ALTER TABLE fin_exchange_rates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_exchange_rates_lineage ON fin_exchange_rates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_exchange_rates_org_scope ON fin_exchange_rates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_exchange_rates_row_version ON fin_exchange_rates;
CREATE TRIGGER trg_fin_exchange_rates_row_version BEFORE UPDATE ON fin_exchange_rates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_fixed_assets
ALTER TABLE fin_fixed_assets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_fixed_assets_lineage ON fin_fixed_assets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_fixed_assets_org_scope ON fin_fixed_assets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_fixed_assets_row_version ON fin_fixed_assets;
CREATE TRIGGER trg_fin_fixed_assets_row_version BEFORE UPDATE ON fin_fixed_assets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_intercompany_pairs
ALTER TABLE fin_intercompany_pairs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_intercompany_pairs_lineage ON fin_intercompany_pairs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_intercompany_pairs_org_scope ON fin_intercompany_pairs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_intercompany_pairs_row_version ON fin_intercompany_pairs;
CREATE TRIGGER trg_fin_intercompany_pairs_row_version BEFORE UPDATE ON fin_intercompany_pairs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_lc_draw_requests
ALTER TABLE fin_lc_draw_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_lc_draw_requests_lineage ON fin_lc_draw_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_lc_draw_requests_org_scope ON fin_lc_draw_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_lc_draw_requests_row_version ON fin_lc_draw_requests;
CREATE TRIGGER trg_fin_lc_draw_requests_row_version BEFORE UPDATE ON fin_lc_draw_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_letters_of_credit
ALTER TABLE fin_letters_of_credit
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_letters_of_credit_lineage ON fin_letters_of_credit (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_letters_of_credit_org_scope ON fin_letters_of_credit (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_letters_of_credit_row_version ON fin_letters_of_credit;
CREATE TRIGGER trg_fin_letters_of_credit_row_version BEFORE UPDATE ON fin_letters_of_credit FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_multi_book_ledgers
ALTER TABLE fin_multi_book_ledgers
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_multi_book_ledgers_lineage ON fin_multi_book_ledgers (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_multi_book_ledgers_org_scope ON fin_multi_book_ledgers (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_multi_book_ledgers_row_version ON fin_multi_book_ledgers;
CREATE TRIGGER trg_fin_multi_book_ledgers_row_version BEFORE UPDATE ON fin_multi_book_ledgers FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_realized_fx_gains
ALTER TABLE fin_realized_fx_gains
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_realized_fx_gains_lineage ON fin_realized_fx_gains (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_realized_fx_gains_org_scope ON fin_realized_fx_gains (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_realized_fx_gains_row_version ON fin_realized_fx_gains;
CREATE TRIGGER trg_fin_realized_fx_gains_row_version BEFORE UPDATE ON fin_realized_fx_gains FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_revenue_schedules
ALTER TABLE fin_revenue_schedules
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_revenue_schedules_lineage ON fin_revenue_schedules (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_revenue_schedules_org_scope ON fin_revenue_schedules (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_revenue_schedules_row_version ON fin_revenue_schedules;
CREATE TRIGGER trg_fin_revenue_schedules_row_version BEFORE UPDATE ON fin_revenue_schedules FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_standard_cost_rollups
ALTER TABLE fin_standard_cost_rollups
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_standard_cost_rollups_lineage ON fin_standard_cost_rollups (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_standard_cost_rollups_org_scope ON fin_standard_cost_rollups (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_standard_cost_rollups_row_version ON fin_standard_cost_rollups;
CREATE TRIGGER trg_fin_standard_cost_rollups_row_version BEFORE UPDATE ON fin_standard_cost_rollups FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_tax_jurisdictions
ALTER TABLE fin_tax_jurisdictions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_tax_jurisdictions_lineage ON fin_tax_jurisdictions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tax_jurisdictions_org_scope ON fin_tax_jurisdictions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_tax_jurisdictions_row_version ON fin_tax_jurisdictions;
CREATE TRIGGER trg_fin_tax_jurisdictions_row_version BEFORE UPDATE ON fin_tax_jurisdictions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_withholding_tax_codes
ALTER TABLE fin_withholding_tax_codes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fin_withholding_tax_codes_lineage ON fin_withholding_tax_codes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_withholding_tax_codes_org_scope ON fin_withholding_tax_codes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_withholding_tax_codes_row_version ON fin_withholding_tax_codes;
CREATE TRIGGER trg_fin_withholding_tax_codes_row_version BEFORE UPDATE ON fin_withholding_tax_codes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fixture_master
ALTER TABLE fixture_master
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fixture_master_lineage ON fixture_master (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fixture_master_org_scope ON fixture_master (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fixture_master_row_version ON fixture_master;
CREATE TRIGGER trg_fixture_master_row_version BEFORE UPDATE ON fixture_master FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fmea_actions
ALTER TABLE fmea_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fmea_actions_lineage ON fmea_actions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fmea_actions_org_scope ON fmea_actions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fmea_actions_row_version ON fmea_actions;
CREATE TRIGGER trg_fmea_actions_row_version BEFORE UPDATE ON fmea_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fmea_failure_modes
ALTER TABLE fmea_failure_modes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_lineage ON fmea_failure_modes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_org_scope ON fmea_failure_modes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fmea_failure_modes_row_version ON fmea_failure_modes;
CREATE TRIGGER trg_fmea_failure_modes_row_version BEFORE UPDATE ON fmea_failure_modes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fmea_records
ALTER TABLE fmea_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_fmea_records_lineage ON fmea_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fmea_records_org_scope ON fmea_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fmea_records_row_version ON fmea_records;
CREATE TRIGGER trg_fmea_records_row_version BEFORE UPDATE ON fmea_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- form_attachments
ALTER TABLE form_attachments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_form_attachments_lineage ON form_attachments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_attachments_org_scope ON form_attachments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_form_attachments_row_version ON form_attachments;
CREATE TRIGGER trg_form_attachments_row_version BEFORE UPDATE ON form_attachments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- form_entries
ALTER TABLE form_entries
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_form_entries_lineage ON form_entries (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_entries_org_scope ON form_entries (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_form_entries_row_version ON form_entries;
CREATE TRIGGER trg_form_entries_row_version BEFORE UPDATE ON form_entries FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- form_schemas
ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_form_schemas_lineage ON form_schemas (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_schemas_org_scope ON form_schemas (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_form_schemas_row_version ON form_schemas;
CREATE TRIGGER trg_form_schemas_row_version BEFORE UPDATE ON form_schemas FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- gl_transactions
ALTER TABLE gl_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_gl_transactions_lineage ON gl_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_transactions_org_scope ON gl_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_gl_transactions_row_version ON gl_transactions;
CREATE TRIGGER trg_gl_transactions_row_version BEFORE UPDATE ON gl_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_attendance_records
ALTER TABLE hcm_attendance_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_attendance_records_lineage ON hcm_attendance_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_attendance_records_org_scope ON hcm_attendance_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_attendance_records_row_version ON hcm_attendance_records;
CREATE TRIGGER trg_hcm_attendance_records_row_version BEFORE UPDATE ON hcm_attendance_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_certifications
ALTER TABLE hcm_certifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_certifications_lineage ON hcm_certifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_certifications_org_scope ON hcm_certifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_certifications_row_version ON hcm_certifications;
CREATE TRIGGER trg_hcm_certifications_row_version BEFORE UPDATE ON hcm_certifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_disciplinary_actions
ALTER TABLE hcm_disciplinary_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_disciplinary_actions_lineage ON hcm_disciplinary_actions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_disciplinary_actions_org_scope ON hcm_disciplinary_actions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_disciplinary_actions_row_version ON hcm_disciplinary_actions;
CREATE TRIGGER trg_hcm_disciplinary_actions_row_version BEFORE UPDATE ON hcm_disciplinary_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_employee_certifications
ALTER TABLE hcm_employee_certifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_employee_certifications_lineage ON hcm_employee_certifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_employee_certifications_org_scope ON hcm_employee_certifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_employee_certifications_row_version ON hcm_employee_certifications;
CREATE TRIGGER trg_hcm_employee_certifications_row_version BEFORE UPDATE ON hcm_employee_certifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_employee_skills
ALTER TABLE hcm_employee_skills
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_employee_skills_lineage ON hcm_employee_skills (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_employee_skills_org_scope ON hcm_employee_skills (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_employee_skills_row_version ON hcm_employee_skills;
CREATE TRIGGER trg_hcm_employee_skills_row_version BEFORE UPDATE ON hcm_employee_skills FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_employees
ALTER TABLE hcm_employees
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_employees_lineage ON hcm_employees (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_employees_org_scope ON hcm_employees (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_employees_row_version ON hcm_employees;
CREATE TRIGGER trg_hcm_employees_row_version BEFORE UPDATE ON hcm_employees FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_leave_balances
ALTER TABLE hcm_leave_balances
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_leave_balances_lineage ON hcm_leave_balances (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_leave_balances_org_scope ON hcm_leave_balances (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_leave_balances_row_version ON hcm_leave_balances;
CREATE TRIGGER trg_hcm_leave_balances_row_version BEFORE UPDATE ON hcm_leave_balances FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_org_units
ALTER TABLE hcm_org_units
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_org_units_lineage ON hcm_org_units (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_org_units_org_scope ON hcm_org_units (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_org_units_row_version ON hcm_org_units;
CREATE TRIGGER trg_hcm_org_units_row_version BEFORE UPDATE ON hcm_org_units FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_payroll_periods
ALTER TABLE hcm_payroll_periods
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_periods_lineage ON hcm_payroll_periods (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_periods_org_scope ON hcm_payroll_periods (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_payroll_periods_row_version ON hcm_payroll_periods;
CREATE TRIGGER trg_hcm_payroll_periods_row_version BEFORE UPDATE ON hcm_payroll_periods FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_payroll_runs
ALTER TABLE hcm_payroll_runs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_runs_lineage ON hcm_payroll_runs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_runs_org_scope ON hcm_payroll_runs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_payroll_runs_row_version ON hcm_payroll_runs;
CREATE TRIGGER trg_hcm_payroll_runs_row_version BEFORE UPDATE ON hcm_payroll_runs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_positions
ALTER TABLE hcm_positions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_positions_lineage ON hcm_positions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_positions_org_scope ON hcm_positions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_positions_row_version ON hcm_positions;
CREATE TRIGGER trg_hcm_positions_row_version BEFORE UPDATE ON hcm_positions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- hcm_skills_catalog
ALTER TABLE hcm_skills_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_hcm_skills_catalog_lineage ON hcm_skills_catalog (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_skills_catalog_org_scope ON hcm_skills_catalog (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_hcm_skills_catalog_row_version ON hcm_skills_catalog;
CREATE TRIGGER trg_hcm_skills_catalog_row_version BEFORE UPDATE ON hcm_skills_catalog FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- improvement_projects
ALTER TABLE improvement_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_improvement_projects_lineage ON improvement_projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_improvement_projects_org_scope ON improvement_projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_improvement_projects_row_version ON improvement_projects;
CREATE TRIGGER trg_improvement_projects_row_version BEFORE UPDATE ON improvement_projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- incoming_inspections
ALTER TABLE incoming_inspections
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_lineage ON incoming_inspections (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_org_scope ON incoming_inspections (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_incoming_inspections_row_version ON incoming_inspections;
CREATE TRIGGER trg_incoming_inspections_row_version BEFORE UPDATE ON incoming_inspections FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inspection_plans
ALTER TABLE inspection_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_inspection_plans_lineage ON inspection_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_plans_org_scope ON inspection_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inspection_plans_row_version ON inspection_plans;
CREATE TRIGGER trg_inspection_plans_row_version BEFORE UPDATE ON inspection_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inventory_buffer_profiles
ALTER TABLE inventory_buffer_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_inventory_buffer_profiles_lineage ON inventory_buffer_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_buffer_profiles_org_scope ON inventory_buffer_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inventory_buffer_profiles_row_version ON inventory_buffer_profiles;
CREATE TRIGGER trg_inventory_buffer_profiles_row_version BEFORE UPDATE ON inventory_buffer_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inventory_locations
ALTER TABLE inventory_locations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_inventory_locations_lineage ON inventory_locations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_locations_org_scope ON inventory_locations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inventory_locations_row_version ON inventory_locations;
CREATE TRIGGER trg_inventory_locations_row_version BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inventory_transactions
ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_lineage ON inventory_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org_scope ON inventory_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inventory_transactions_row_version ON inventory_transactions;
CREATE TRIGGER trg_inventory_transactions_row_version BEFORE UPDATE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- items
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_items_lineage ON items (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_org_scope ON items (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_items_row_version ON items;
CREATE TRIGGER trg_items_row_version BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- job_costing
ALTER TABLE job_costing
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_job_costing_lineage ON job_costing (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_costing_org_scope ON job_costing (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_job_costing_row_version ON job_costing;
CREATE TRIGGER trg_job_costing_row_version BEFORE UPDATE ON job_costing FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- job_orders
ALTER TABLE job_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_job_orders_lineage ON job_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_orders_org_scope ON job_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_job_orders_row_version ON job_orders;
CREATE TRIGGER trg_job_orders_row_version BEFORE UPDATE ON job_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- job_release_gates
ALTER TABLE job_release_gates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_job_release_gates_lineage ON job_release_gates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_release_gates_org_scope ON job_release_gates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_job_release_gates_row_version ON job_release_gates;
CREATE TRIGGER trg_job_release_gates_row_version BEFORE UPDATE ON job_release_gates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- labor_transactions
ALTER TABLE labor_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_labor_transactions_lineage ON labor_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_labor_transactions_org_scope ON labor_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_labor_transactions_row_version ON labor_transactions;
CREATE TRIGGER trg_labor_transactions_row_version BEFORE UPDATE ON labor_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_5s_audits
ALTER TABLE lean_5s_audits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_5s_audits_lineage ON lean_5s_audits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_5s_audits_org_scope ON lean_5s_audits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_5s_audits_row_version ON lean_5s_audits;
CREATE TRIGGER trg_lean_5s_audits_row_version BEFORE UPDATE ON lean_5s_audits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_andon_events
ALTER TABLE lean_andon_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_andon_events_lineage ON lean_andon_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_andon_events_org_scope ON lean_andon_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_andon_events_row_version ON lean_andon_events;
CREATE TRIGGER trg_lean_andon_events_row_version BEFORE UPDATE ON lean_andon_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_gemba_walks
ALTER TABLE lean_gemba_walks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_gemba_walks_lineage ON lean_gemba_walks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_gemba_walks_org_scope ON lean_gemba_walks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_gemba_walks_row_version ON lean_gemba_walks;
CREATE TRIGGER trg_lean_gemba_walks_row_version BEFORE UPDATE ON lean_gemba_walks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_kaizen_events
ALTER TABLE lean_kaizen_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_kaizen_events_lineage ON lean_kaizen_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_kaizen_events_org_scope ON lean_kaizen_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_kaizen_events_row_version ON lean_kaizen_events;
CREATE TRIGGER trg_lean_kaizen_events_row_version BEFORE UPDATE ON lean_kaizen_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_qrqc_events
ALTER TABLE lean_qrqc_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_qrqc_events_lineage ON lean_qrqc_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_qrqc_events_org_scope ON lean_qrqc_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_qrqc_events_row_version ON lean_qrqc_events;
CREATE TRIGGER trg_lean_qrqc_events_row_version BEFORE UPDATE ON lean_qrqc_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_smed_events
ALTER TABLE lean_smed_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_smed_events_lineage ON lean_smed_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_smed_events_org_scope ON lean_smed_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_smed_events_row_version ON lean_smed_events;
CREATE TRIGGER trg_lean_smed_events_row_version BEFORE UPDATE ON lean_smed_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_tier_escalations
ALTER TABLE lean_tier_escalations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_tier_escalations_lineage ON lean_tier_escalations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_tier_escalations_org_scope ON lean_tier_escalations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_tier_escalations_row_version ON lean_tier_escalations;
CREATE TRIGGER trg_lean_tier_escalations_row_version BEFORE UPDATE ON lean_tier_escalations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lean_tier_meetings
ALTER TABLE lean_tier_meetings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lean_tier_meetings_lineage ON lean_tier_meetings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lean_tier_meetings_org_scope ON lean_tier_meetings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lean_tier_meetings_row_version ON lean_tier_meetings;
CREATE TRIGGER trg_lean_tier_meetings_row_version BEFORE UPDATE ON lean_tier_meetings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lot_master
ALTER TABLE lot_master
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_lot_master_lineage ON lot_master (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lot_master_org_scope ON lot_master (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lot_master_row_version ON lot_master;
CREATE TRIGGER trg_lot_master_row_version BEFORE UPDATE ON lot_master FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- machine_rate_cards
ALTER TABLE machine_rate_cards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_machine_rate_cards_lineage ON machine_rate_cards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_machine_rate_cards_org_scope ON machine_rate_cards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_machine_rate_cards_row_version ON machine_rate_cards;
CREATE TRIGGER trg_machine_rate_cards_row_version BEFORE UPDATE ON machine_rate_cards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- maintenance_work_orders
ALTER TABLE maintenance_work_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_lineage ON maintenance_work_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_org_scope ON maintenance_work_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_maintenance_work_orders_row_version ON maintenance_work_orders;
CREATE TRIGGER trg_maintenance_work_orders_row_version BEFORE UPDATE ON maintenance_work_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- management_reviews
ALTER TABLE management_reviews
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_management_reviews_lineage ON management_reviews (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_management_reviews_org_scope ON management_reviews (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_management_reviews_row_version ON management_reviews;
CREATE TRIGGER trg_management_reviews_row_version BEFORE UPDATE ON management_reviews FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- material_review_board
ALTER TABLE material_review_board
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_material_review_board_lineage ON material_review_board (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_review_board_org_scope ON material_review_board (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_material_review_board_row_version ON material_review_board;
CREATE TRIGGER trg_material_review_board_row_version BEFORE UPDATE ON material_review_board FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_approval_policies
ALTER TABLE mdm_approval_policies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_approval_policies_lineage ON mdm_approval_policies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_approval_policies_org_scope ON mdm_approval_policies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_approval_policies_row_version ON mdm_approval_policies;
CREATE TRIGGER trg_mdm_approval_policies_row_version BEFORE UPDATE ON mdm_approval_policies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_attribute_sets
ALTER TABLE mdm_attribute_sets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_attribute_sets_lineage ON mdm_attribute_sets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_attribute_sets_org_scope ON mdm_attribute_sets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_attribute_sets_row_version ON mdm_attribute_sets;
CREATE TRIGGER trg_mdm_attribute_sets_row_version BEFORE UPDATE ON mdm_attribute_sets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_attribute_values
ALTER TABLE mdm_attribute_values
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_attribute_values_lineage ON mdm_attribute_values (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_attribute_values_org_scope ON mdm_attribute_values (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_attribute_values_row_version ON mdm_attribute_values;
CREATE TRIGGER trg_mdm_attribute_values_row_version BEFORE UPDATE ON mdm_attribute_values FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_data_stewards
ALTER TABLE mdm_data_stewards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_data_stewards_lineage ON mdm_data_stewards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_data_stewards_org_scope ON mdm_data_stewards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_data_stewards_row_version ON mdm_data_stewards;
CREATE TRIGGER trg_mdm_data_stewards_row_version BEFORE UPDATE ON mdm_data_stewards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_duplicate_candidates
ALTER TABLE mdm_duplicate_candidates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_duplicate_candidates_lineage ON mdm_duplicate_candidates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_duplicate_candidates_org_scope ON mdm_duplicate_candidates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_duplicate_candidates_row_version ON mdm_duplicate_candidates;
CREATE TRIGGER trg_mdm_duplicate_candidates_row_version BEFORE UPDATE ON mdm_duplicate_candidates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_governance_issues
ALTER TABLE mdm_governance_issues
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_governance_issues_lineage ON mdm_governance_issues (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_governance_issues_org_scope ON mdm_governance_issues (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_governance_issues_row_version ON mdm_governance_issues;
CREATE TRIGGER trg_mdm_governance_issues_row_version BEFORE UPDATE ON mdm_governance_issues FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_item_classes
ALTER TABLE mdm_item_classes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_item_classes_lineage ON mdm_item_classes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_item_classes_org_scope ON mdm_item_classes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_item_classes_row_version ON mdm_item_classes;
CREATE TRIGGER trg_mdm_item_classes_row_version BEFORE UPDATE ON mdm_item_classes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_number_series
ALTER TABLE mdm_number_series
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_number_series_lineage ON mdm_number_series (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_number_series_org_scope ON mdm_number_series (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_number_series_row_version ON mdm_number_series;
CREATE TRIGGER trg_mdm_number_series_row_version BEFORE UPDATE ON mdm_number_series FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_reference_code_values
ALTER TABLE mdm_reference_code_values
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_reference_code_values_lineage ON mdm_reference_code_values (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_reference_code_values_org_scope ON mdm_reference_code_values (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_reference_code_values_row_version ON mdm_reference_code_values;
CREATE TRIGGER trg_mdm_reference_code_values_row_version BEFORE UPDATE ON mdm_reference_code_values FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_reference_codes
ALTER TABLE mdm_reference_codes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_reference_codes_lineage ON mdm_reference_codes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_reference_codes_org_scope ON mdm_reference_codes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_reference_codes_row_version ON mdm_reference_codes;
CREATE TRIGGER trg_mdm_reference_codes_row_version BEFORE UPDATE ON mdm_reference_codes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_site_parameters
ALTER TABLE mdm_site_parameters
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_site_parameters_lineage ON mdm_site_parameters (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_site_parameters_org_scope ON mdm_site_parameters (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_site_parameters_row_version ON mdm_site_parameters;
CREATE TRIGGER trg_mdm_site_parameters_row_version BEFORE UPDATE ON mdm_site_parameters FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_uom_conversions
ALTER TABLE mdm_uom_conversions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mdm_uom_conversions_lineage ON mdm_uom_conversions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_uom_conversions_org_scope ON mdm_uom_conversions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_uom_conversions_row_version ON mdm_uom_conversions;
CREATE TRIGGER trg_mdm_uom_conversions_row_version BEFORE UPDATE ON mdm_uom_conversions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_alarm_catalog
ALTER TABLE mes_alarm_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_alarm_catalog_lineage ON mes_alarm_catalog (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_alarm_catalog_org_scope ON mes_alarm_catalog (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_alarm_catalog_row_version ON mes_alarm_catalog;
CREATE TRIGGER trg_mes_alarm_catalog_row_version BEFORE UPDATE ON mes_alarm_catalog FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_alarm_playbooks
ALTER TABLE mes_alarm_playbooks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_alarm_playbooks_lineage ON mes_alarm_playbooks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_alarm_playbooks_org_scope ON mes_alarm_playbooks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_alarm_playbooks_row_version ON mes_alarm_playbooks;
CREATE TRIGGER trg_mes_alarm_playbooks_row_version BEFORE UPDATE ON mes_alarm_playbooks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_areas
ALTER TABLE mes_areas
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_areas_lineage ON mes_areas (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_areas_org_scope ON mes_areas (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_areas_row_version ON mes_areas;
CREATE TRIGGER trg_mes_areas_row_version BEFORE UPDATE ON mes_areas FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_connectivity_adapters
ALTER TABLE mes_connectivity_adapters
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_connectivity_adapters_lineage ON mes_connectivity_adapters (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_connectivity_adapters_org_scope ON mes_connectivity_adapters (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_connectivity_adapters_row_version ON mes_connectivity_adapters;
CREATE TRIGGER trg_mes_connectivity_adapters_row_version BEFORE UPDATE ON mes_connectivity_adapters FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_cost_tracking
ALTER TABLE mes_cost_tracking
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_cost_tracking_lineage ON mes_cost_tracking (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_cost_tracking_org_scope ON mes_cost_tracking (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_cost_tracking_row_version ON mes_cost_tracking;
CREATE TRIGGER trg_mes_cost_tracking_row_version BEFORE UPDATE ON mes_cost_tracking FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_dispatch_queue
ALTER TABLE mes_dispatch_queue
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_dispatch_queue_lineage ON mes_dispatch_queue (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_dispatch_queue_org_scope ON mes_dispatch_queue (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_dispatch_queue_row_version ON mes_dispatch_queue;
CREATE TRIGGER trg_mes_dispatch_queue_row_version BEFORE UPDATE ON mes_dispatch_queue FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_dpp_passports
ALTER TABLE mes_dpp_passports
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_dpp_passports_lineage ON mes_dpp_passports (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_dpp_passports_org_scope ON mes_dpp_passports (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_dpp_passports_row_version ON mes_dpp_passports;
CREATE TRIGGER trg_mes_dpp_passports_row_version BEFORE UPDATE ON mes_dpp_passports FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_equipment_extended
ALTER TABLE mes_equipment_extended
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_extended_lineage ON mes_equipment_extended (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_extended_org_scope ON mes_equipment_extended (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_equipment_extended_row_version ON mes_equipment_extended;
CREATE TRIGGER trg_mes_equipment_extended_row_version BEFORE UPDATE ON mes_equipment_extended FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_erp_inbound_queue
ALTER TABLE mes_erp_inbound_queue
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_erp_inbound_queue_lineage ON mes_erp_inbound_queue (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_erp_inbound_queue_org_scope ON mes_erp_inbound_queue (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_erp_inbound_queue_row_version ON mes_erp_inbound_queue;
CREATE TRIGGER trg_mes_erp_inbound_queue_row_version BEFORE UPDATE ON mes_erp_inbound_queue FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_erp_outbound_queue
ALTER TABLE mes_erp_outbound_queue
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_erp_outbound_queue_lineage ON mes_erp_outbound_queue (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_erp_outbound_queue_org_scope ON mes_erp_outbound_queue (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_erp_outbound_queue_row_version ON mes_erp_outbound_queue;
CREATE TRIGGER trg_mes_erp_outbound_queue_row_version BEFORE UPDATE ON mes_erp_outbound_queue FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_erp_reconciliation_exceptions
ALTER TABLE mes_erp_reconciliation_exceptions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_erp_reconciliation_exceptions_lineage ON mes_erp_reconciliation_exceptions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_erp_reconciliation_exceptions_org_scope ON mes_erp_reconciliation_exceptions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_erp_reconciliation_exceptions_row_version ON mes_erp_reconciliation_exceptions;
CREATE TRIGGER trg_mes_erp_reconciliation_exceptions_row_version BEFORE UPDATE ON mes_erp_reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_erp_sync_runs
ALTER TABLE mes_erp_sync_runs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_runs_lineage ON mes_erp_sync_runs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_runs_org_scope ON mes_erp_sync_runs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_erp_sync_runs_row_version ON mes_erp_sync_runs;
CREATE TRIGGER trg_mes_erp_sync_runs_row_version BEFORE UPDATE ON mes_erp_sync_runs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_event_subscriptions
ALTER TABLE mes_event_subscriptions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_event_subscriptions_lineage ON mes_event_subscriptions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_event_subscriptions_org_scope ON mes_event_subscriptions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_event_subscriptions_row_version ON mes_event_subscriptions;
CREATE TRIGGER trg_mes_event_subscriptions_row_version BEFORE UPDATE ON mes_event_subscriptions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_inline_measurements
ALTER TABLE mes_inline_measurements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_inline_measurements_lineage ON mes_inline_measurements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_inline_measurements_org_scope ON mes_inline_measurements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_inline_measurements_row_version ON mes_inline_measurements;
CREATE TRIGGER trg_mes_inline_measurements_row_version BEFORE UPDATE ON mes_inline_measurements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_job_execution
ALTER TABLE mes_job_execution
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_job_execution_lineage ON mes_job_execution (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_job_execution_org_scope ON mes_job_execution (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_job_execution_row_version ON mes_job_execution;
CREATE TRIGGER trg_mes_job_execution_row_version BEFORE UPDATE ON mes_job_execution FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_machine_alarms
ALTER TABLE mes_machine_alarms
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_machine_alarms_lineage ON mes_machine_alarms (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_machine_alarms_org_scope ON mes_machine_alarms (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_machine_alarms_row_version ON mes_machine_alarms;
CREATE TRIGGER trg_mes_machine_alarms_row_version BEFORE UPDATE ON mes_machine_alarms FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_machine_snapshot
ALTER TABLE mes_machine_snapshot
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_machine_snapshot_lineage ON mes_machine_snapshot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_machine_snapshot_org_scope ON mes_machine_snapshot (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_machine_snapshot_row_version ON mes_machine_snapshot;
CREATE TRIGGER trg_mes_machine_snapshot_row_version BEFORE UPDATE ON mes_machine_snapshot FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_machine_telemetry
ALTER TABLE mes_machine_telemetry
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_machine_telemetry_lineage ON mes_machine_telemetry (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_machine_telemetry_org_scope ON mes_machine_telemetry (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_machine_telemetry_row_version ON mes_machine_telemetry;
CREATE TRIGGER trg_mes_machine_telemetry_row_version BEFORE UPDATE ON mes_machine_telemetry FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_material_consumption
ALTER TABLE mes_material_consumption
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_material_consumption_lineage ON mes_material_consumption (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_material_consumption_org_scope ON mes_material_consumption (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_material_consumption_row_version ON mes_material_consumption;
CREATE TRIGGER trg_mes_material_consumption_row_version BEFORE UPDATE ON mes_material_consumption FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_nc_download_receipts
ALTER TABLE mes_nc_download_receipts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_nc_download_receipts_lineage ON mes_nc_download_receipts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_nc_download_receipts_org_scope ON mes_nc_download_receipts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_nc_download_receipts_row_version ON mes_nc_download_receipts;
CREATE TRIGGER trg_mes_nc_download_receipts_row_version BEFORE UPDATE ON mes_nc_download_receipts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_nc_release_packages
ALTER TABLE mes_nc_release_packages
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_nc_release_packages_lineage ON mes_nc_release_packages (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_nc_release_packages_org_scope ON mes_nc_release_packages (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_nc_release_packages_row_version ON mes_nc_release_packages;
CREATE TRIGGER trg_mes_nc_release_packages_row_version BEFORE UPDATE ON mes_nc_release_packages FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_on_time_delivery
ALTER TABLE mes_on_time_delivery
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_on_time_delivery_lineage ON mes_on_time_delivery (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_on_time_delivery_org_scope ON mes_on_time_delivery (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_on_time_delivery_row_version ON mes_on_time_delivery;
CREATE TRIGGER trg_mes_on_time_delivery_row_version BEFORE UPDATE ON mes_on_time_delivery FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_operation_execution
ALTER TABLE mes_operation_execution
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_operation_execution_lineage ON mes_operation_execution (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_operation_execution_org_scope ON mes_operation_execution (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_operation_execution_row_version ON mes_operation_execution;
CREATE TRIGGER trg_mes_operation_execution_row_version BEFORE UPDATE ON mes_operation_execution FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_operator_qualifications
ALTER TABLE mes_operator_qualifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_operator_qualifications_lineage ON mes_operator_qualifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_operator_qualifications_org_scope ON mes_operator_qualifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_operator_qualifications_row_version ON mes_operator_qualifications;
CREATE TRIGGER trg_mes_operator_qualifications_row_version BEFORE UPDATE ON mes_operator_qualifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_operator_sessions
ALTER TABLE mes_operator_sessions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_operator_sessions_lineage ON mes_operator_sessions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_operator_sessions_org_scope ON mes_operator_sessions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_operator_sessions_row_version ON mes_operator_sessions;
CREATE TRIGGER trg_mes_operator_sessions_row_version BEFORE UPDATE ON mes_operator_sessions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_part_genealogy
ALTER TABLE mes_part_genealogy
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_part_genealogy_lineage ON mes_part_genealogy (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_part_genealogy_org_scope ON mes_part_genealogy (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_part_genealogy_row_version ON mes_part_genealogy;
CREATE TRIGGER trg_mes_part_genealogy_row_version BEFORE UPDATE ON mes_part_genealogy FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_pm_execution
ALTER TABLE mes_pm_execution
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_pm_execution_lineage ON mes_pm_execution (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_pm_execution_org_scope ON mes_pm_execution (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_pm_execution_row_version ON mes_pm_execution;
CREATE TRIGGER trg_mes_pm_execution_row_version BEFORE UPDATE ON mes_pm_execution FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_production_kpi_daily
ALTER TABLE mes_production_kpi_daily
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_production_kpi_daily_lineage ON mes_production_kpi_daily (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_production_kpi_daily_org_scope ON mes_production_kpi_daily (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_production_kpi_daily_row_version ON mes_production_kpi_daily;
CREATE TRIGGER trg_mes_production_kpi_daily_row_version BEFORE UPDATE ON mes_production_kpi_daily FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_shift_handover
ALTER TABLE mes_shift_handover
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_shift_handover_lineage ON mes_shift_handover (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_shift_handover_org_scope ON mes_shift_handover (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_shift_handover_row_version ON mes_shift_handover;
CREATE TRIGGER trg_mes_shift_handover_row_version BEFORE UPDATE ON mes_shift_handover FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_shop_floor_layout
ALTER TABLE mes_shop_floor_layout
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_shop_floor_layout_lineage ON mes_shop_floor_layout (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_shop_floor_layout_org_scope ON mes_shop_floor_layout (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_shop_floor_layout_row_version ON mes_shop_floor_layout;
CREATE TRIGGER trg_mes_shop_floor_layout_row_version BEFORE UPDATE ON mes_shop_floor_layout FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_sites
ALTER TABLE mes_sites
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_sites_lineage ON mes_sites (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_sites_org_scope ON mes_sites (org_company_code, org_legal_entity_code, org_plant_id);
DROP TRIGGER IF EXISTS trg_mes_sites_row_version ON mes_sites;
CREATE TRIGGER trg_mes_sites_row_version BEFORE UPDATE ON mes_sites FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_spare_parts_consumption
ALTER TABLE mes_spare_parts_consumption
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_spare_parts_consumption_lineage ON mes_spare_parts_consumption (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_spare_parts_consumption_org_scope ON mes_spare_parts_consumption (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_spare_parts_consumption_row_version ON mes_spare_parts_consumption;
CREATE TRIGGER trg_mes_spare_parts_consumption_row_version BEFORE UPDATE ON mes_spare_parts_consumption FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_spc_control_limits
ALTER TABLE mes_spc_control_limits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_spc_control_limits_lineage ON mes_spc_control_limits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_spc_control_limits_org_scope ON mes_spc_control_limits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_spc_control_limits_row_version ON mes_spc_control_limits;
CREATE TRIGGER trg_mes_spc_control_limits_row_version BEFORE UPDATE ON mes_spc_control_limits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_spc_violations
ALTER TABLE mes_spc_violations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_spc_violations_lineage ON mes_spc_violations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_spc_violations_org_scope ON mes_spc_violations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_spc_violations_row_version ON mes_spc_violations;
CREATE TRIGGER trg_mes_spc_violations_row_version BEFORE UPDATE ON mes_spc_violations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_tool_assemblies
ALTER TABLE mes_tool_assemblies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_tool_assemblies_lineage ON mes_tool_assemblies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_tool_assemblies_org_scope ON mes_tool_assemblies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_tool_assemblies_row_version ON mes_tool_assemblies;
CREATE TRIGGER trg_mes_tool_assemblies_row_version BEFORE UPDATE ON mes_tool_assemblies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_tool_preset_offsets
ALTER TABLE mes_tool_preset_offsets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_tool_preset_offsets_lineage ON mes_tool_preset_offsets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_tool_preset_offsets_org_scope ON mes_tool_preset_offsets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_tool_preset_offsets_row_version ON mes_tool_preset_offsets;
CREATE TRIGGER trg_mes_tool_preset_offsets_row_version BEFORE UPDATE ON mes_tool_preset_offsets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_wip_location
ALTER TABLE mes_wip_location
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_wip_location_lineage ON mes_wip_location (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_wip_location_org_scope ON mes_wip_location (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_wip_location_row_version ON mes_wip_location;
CREATE TRIGGER trg_mes_wip_location_row_version BEFORE UPDATE ON mes_wip_location FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_wip_movements
ALTER TABLE mes_wip_movements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mes_wip_movements_lineage ON mes_wip_movements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_wip_movements_org_scope ON mes_wip_movements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_wip_movements_row_version ON mes_wip_movements;
CREATE TRIGGER trg_mes_wip_movements_row_version BEFORE UPDATE ON mes_wip_movements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mobile_inspection_captures
ALTER TABLE mobile_inspection_captures
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mobile_inspection_captures_lineage ON mobile_inspection_captures (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_inspection_captures_org_scope ON mobile_inspection_captures (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mobile_inspection_captures_row_version ON mobile_inspection_captures;
CREATE TRIGGER trg_mobile_inspection_captures_row_version BEFORE UPDATE ON mobile_inspection_captures FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mobile_time_entries
ALTER TABLE mobile_time_entries
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mobile_time_entries_lineage ON mobile_time_entries (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_time_entries_org_scope ON mobile_time_entries (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mobile_time_entries_row_version ON mobile_time_entries;
CREATE TRIGGER trg_mobile_time_entries_row_version BEFORE UPDATE ON mobile_time_entries FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mobile_work_queue
ALTER TABLE mobile_work_queue
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mobile_work_queue_lineage ON mobile_work_queue (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_work_queue_org_scope ON mobile_work_queue (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mobile_work_queue_row_version ON mobile_work_queue;
CREATE TRIGGER trg_mobile_work_queue_row_version BEFORE UPDATE ON mobile_work_queue FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mrp_planned_orders
ALTER TABLE mrp_planned_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_mrp_planned_orders_lineage ON mrp_planned_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mrp_planned_orders_org_scope ON mrp_planned_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mrp_planned_orders_row_version ON mrp_planned_orders;
CREATE TRIGGER trg_mrp_planned_orders_row_version BEFORE UPDATE ON mrp_planned_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- naming_patterns
ALTER TABLE naming_patterns
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_naming_patterns_lineage ON naming_patterns (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_naming_patterns_org_scope ON naming_patterns (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_naming_patterns_row_version ON naming_patterns;
CREATE TRIGGER trg_naming_patterns_row_version BEFORE UPDATE ON naming_patterns FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ncr_human_factors
ALTER TABLE ncr_human_factors
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ncr_human_factors_lineage ON ncr_human_factors (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ncr_human_factors_org_scope ON ncr_human_factors (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ncr_human_factors_row_version ON ncr_human_factors;
CREATE TRIGGER trg_ncr_human_factors_row_version BEFORE UPDATE ON ncr_human_factors FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ncr_mrb_decisions
ALTER TABLE ncr_mrb_decisions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ncr_mrb_decisions_lineage ON ncr_mrb_decisions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ncr_mrb_decisions_org_scope ON ncr_mrb_decisions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ncr_mrb_decisions_row_version ON ncr_mrb_decisions;
CREATE TRIGGER trg_ncr_mrb_decisions_row_version BEFORE UPDATE ON ncr_mrb_decisions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ncr_records
ALTER TABLE ncr_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ncr_records_lineage ON ncr_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ncr_records_org_scope ON ncr_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ncr_records_row_version ON ncr_records;
CREATE TRIGGER trg_ncr_records_row_version BEFORE UPDATE ON ncr_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- notifications
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_notifications_lineage ON notifications (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org_scope ON notifications (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_notifications_row_version ON notifications;
CREATE TRIGGER trg_notifications_row_version BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- npi_projects
ALTER TABLE npi_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_npi_projects_lineage ON npi_projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_npi_projects_org_scope ON npi_projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_npi_projects_row_version ON npi_projects;
CREATE TRIGGER trg_npi_projects_row_version BEFORE UPDATE ON npi_projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- oqc_inspections
ALTER TABLE oqc_inspections
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_oqc_inspections_lineage ON oqc_inspections (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oqc_inspections_org_scope ON oqc_inspections (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_oqc_inspections_row_version ON oqc_inspections;
CREATE TRIGGER trg_oqc_inspections_row_version BEFORE UPDATE ON oqc_inspections FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- order_documents_required
ALTER TABLE order_documents_required
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_order_documents_required_lineage ON order_documents_required (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_documents_required_org_scope ON order_documents_required (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_order_documents_required_row_version ON order_documents_required;
CREATE TRIGGER trg_order_documents_required_row_version BEFORE UPDATE ON order_documents_required FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- order_holds
ALTER TABLE order_holds
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_order_holds_lineage ON order_holds (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_holds_org_scope ON order_holds (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_order_holds_row_version ON order_holds;
CREATE TRIGGER trg_order_holds_row_version BEFORE UPDATE ON order_holds FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- order_milestones
ALTER TABLE order_milestones
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_order_milestones_lineage ON order_milestones (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_milestones_org_scope ON order_milestones (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_order_milestones_row_version ON order_milestones;
CREATE TRIGGER trg_order_milestones_row_version BEFORE UPDATE ON order_milestones FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- order_notes
ALTER TABLE order_notes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_order_notes_lineage ON order_notes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_notes_org_scope ON order_notes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_order_notes_row_version ON order_notes;
CREATE TRIGGER trg_order_notes_row_version BEFORE UPDATE ON order_notes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_dispatch_batches
ALTER TABLE osc_dispatch_batches
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_dispatch_batches_lineage ON osc_dispatch_batches (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_dispatch_batches_org_scope ON osc_dispatch_batches (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_dispatch_batches_row_version ON osc_dispatch_batches;
CREATE TRIGGER trg_osc_dispatch_batches_row_version BEFORE UPDATE ON osc_dispatch_batches FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_subcontract_plans
ALTER TABLE osc_subcontract_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_subcontract_plans_lineage ON osc_subcontract_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_subcontract_plans_org_scope ON osc_subcontract_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_subcontract_plans_row_version ON osc_subcontract_plans;
CREATE TRIGGER trg_osc_subcontract_plans_row_version BEFORE UPDATE ON osc_subcontract_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_capacity_reservations
ALTER TABLE osc_supplier_capacity_reservations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_capacity_reservations_lineage ON osc_supplier_capacity_reservations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_capacity_reservations_org_scope ON osc_supplier_capacity_reservations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_capacity_reservations_row_version ON osc_supplier_capacity_reservations;
CREATE TRIGGER trg_osc_supplier_capacity_reservations_row_version BEFORE UPDATE ON osc_supplier_capacity_reservations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_chargebacks
ALTER TABLE osc_supplier_chargebacks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_chargebacks_lineage ON osc_supplier_chargebacks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_chargebacks_org_scope ON osc_supplier_chargebacks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_chargebacks_row_version ON osc_supplier_chargebacks;
CREATE TRIGGER trg_osc_supplier_chargebacks_row_version BEFORE UPDATE ON osc_supplier_chargebacks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_nonconformances
ALTER TABLE osc_supplier_nonconformances
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_nonconformances_lineage ON osc_supplier_nonconformances (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_nonconformances_org_scope ON osc_supplier_nonconformances (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_nonconformances_row_version ON osc_supplier_nonconformances;
CREATE TRIGGER trg_osc_supplier_nonconformances_row_version BEFORE UPDATE ON osc_supplier_nonconformances FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_portal_documents
ALTER TABLE osc_supplier_portal_documents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_portal_documents_lineage ON osc_supplier_portal_documents (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_portal_documents_org_scope ON osc_supplier_portal_documents (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_portal_documents_row_version ON osc_supplier_portal_documents;
CREATE TRIGGER trg_osc_supplier_portal_documents_row_version BEFORE UPDATE ON osc_supplier_portal_documents FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_receipts
ALTER TABLE osc_supplier_receipts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_receipts_lineage ON osc_supplier_receipts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_receipts_org_scope ON osc_supplier_receipts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_receipts_row_version ON osc_supplier_receipts;
CREATE TRIGGER trg_osc_supplier_receipts_row_version BEFORE UPDATE ON osc_supplier_receipts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_recovery_claims
ALTER TABLE osc_supplier_recovery_claims
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_recovery_claims_lineage ON osc_supplier_recovery_claims (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_recovery_claims_org_scope ON osc_supplier_recovery_claims (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_recovery_claims_row_version ON osc_supplier_recovery_claims;
CREATE TRIGGER trg_osc_supplier_recovery_claims_row_version BEFORE UPDATE ON osc_supplier_recovery_claims FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_score_trends
ALTER TABLE osc_supplier_score_trends
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_score_trends_lineage ON osc_supplier_score_trends (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_score_trends_org_scope ON osc_supplier_score_trends (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_score_trends_row_version ON osc_supplier_score_trends;
CREATE TRIGGER trg_osc_supplier_score_trends_row_version BEFORE UPDATE ON osc_supplier_score_trends FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- osc_supplier_shipment_notices
ALTER TABLE osc_supplier_shipment_notices
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_shipment_notices_lineage ON osc_supplier_shipment_notices (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osc_supplier_shipment_notices_org_scope ON osc_supplier_shipment_notices (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_osc_supplier_shipment_notices_row_version ON osc_supplier_shipment_notices;
CREATE TRIGGER trg_osc_supplier_shipment_notices_row_version BEFORE UPDATE ON osc_supplier_shipment_notices FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- outside_processing_orders
ALTER TABLE outside_processing_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_outside_processing_orders_lineage ON outside_processing_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outside_processing_orders_org_scope ON outside_processing_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_outside_processing_orders_row_version ON outside_processing_orders;
CREATE TRIGGER trg_outside_processing_orders_row_version BEFORE UPDATE ON outside_processing_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- packing_lists
ALTER TABLE packing_lists
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_packing_lists_lineage ON packing_lists (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_packing_lists_org_scope ON packing_lists (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_packing_lists_row_version ON packing_lists;
CREATE TRIGGER trg_packing_lists_row_version BEFORE UPDATE ON packing_lists FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_change_orders
ALTER TABLE plm_change_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_change_orders_lineage ON plm_change_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_change_orders_org_scope ON plm_change_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_change_orders_row_version ON plm_change_orders;
CREATE TRIGGER trg_plm_change_orders_row_version BEFORE UPDATE ON plm_change_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_change_requests
ALTER TABLE plm_change_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_change_requests_lineage ON plm_change_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_change_requests_org_scope ON plm_change_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_change_requests_row_version ON plm_change_requests;
CREATE TRIGGER trg_plm_change_requests_row_version BEFORE UPDATE ON plm_change_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_change_review_board
ALTER TABLE plm_change_review_board
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_change_review_board_lineage ON plm_change_review_board (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_change_review_board_org_scope ON plm_change_review_board (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_change_review_board_row_version ON plm_change_review_board;
CREATE TRIGGER trg_plm_change_review_board_row_version BEFORE UPDATE ON plm_change_review_board FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_design_reviews
ALTER TABLE plm_design_reviews
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_design_reviews_lineage ON plm_design_reviews (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_design_reviews_org_scope ON plm_design_reviews (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_design_reviews_row_version ON plm_design_reviews;
CREATE TRIGGER trg_plm_design_reviews_row_version BEFORE UPDATE ON plm_design_reviews FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_deviation_permits
ALTER TABLE plm_deviation_permits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_deviation_permits_lineage ON plm_deviation_permits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_deviation_permits_org_scope ON plm_deviation_permits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_deviation_permits_row_version ON plm_deviation_permits;
CREATE TRIGGER trg_plm_deviation_permits_row_version BEFORE UPDATE ON plm_deviation_permits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_obsolescence_tracking
ALTER TABLE plm_obsolescence_tracking
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_obsolescence_tracking_lineage ON plm_obsolescence_tracking (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_obsolescence_tracking_org_scope ON plm_obsolescence_tracking (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_obsolescence_tracking_row_version ON plm_obsolescence_tracking;
CREATE TRIGGER trg_plm_obsolescence_tracking_row_version BEFORE UPDATE ON plm_obsolescence_tracking FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_product_configurations
ALTER TABLE plm_product_configurations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_product_configurations_lineage ON plm_product_configurations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_product_configurations_org_scope ON plm_product_configurations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_product_configurations_row_version ON plm_product_configurations;
CREATE TRIGGER trg_plm_product_configurations_row_version BEFORE UPDATE ON plm_product_configurations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_requirement_traces
ALTER TABLE plm_requirement_traces
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_requirement_traces_lineage ON plm_requirement_traces (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_requirement_traces_org_scope ON plm_requirement_traces (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_requirement_traces_row_version ON plm_requirement_traces;
CREATE TRIGGER trg_plm_requirement_traces_row_version BEFORE UPDATE ON plm_requirement_traces FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- plm_test_plans
ALTER TABLE plm_test_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_plm_test_plans_lineage ON plm_test_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plm_test_plans_org_scope ON plm_test_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_plm_test_plans_row_version ON plm_test_plans;
CREATE TRIGGER trg_plm_test_plans_row_version BEFORE UPDATE ON plm_test_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_condition_monitoring
ALTER TABLE pm_condition_monitoring
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_condition_monitoring_lineage ON pm_condition_monitoring (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_condition_monitoring_org_scope ON pm_condition_monitoring (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_condition_monitoring_row_version ON pm_condition_monitoring;
CREATE TRIGGER trg_pm_condition_monitoring_row_version BEFORE UPDATE ON pm_condition_monitoring FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_condition_thresholds
ALTER TABLE pm_condition_thresholds
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_condition_thresholds_lineage ON pm_condition_thresholds (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_condition_thresholds_org_scope ON pm_condition_thresholds (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_condition_thresholds_row_version ON pm_condition_thresholds;
CREATE TRIGGER trg_pm_condition_thresholds_row_version BEFORE UPDATE ON pm_condition_thresholds FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_equipment_counters
ALTER TABLE pm_equipment_counters
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_equipment_counters_lineage ON pm_equipment_counters (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_equipment_counters_org_scope ON pm_equipment_counters (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_equipment_counters_row_version ON pm_equipment_counters;
CREATE TRIGGER trg_pm_equipment_counters_row_version BEFORE UPDATE ON pm_equipment_counters FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_equipment_master
ALTER TABLE pm_equipment_master
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_equipment_master_lineage ON pm_equipment_master (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_equipment_master_org_scope ON pm_equipment_master (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_equipment_master_row_version ON pm_equipment_master;
CREATE TRIGGER trg_pm_equipment_master_row_version BEFORE UPDATE ON pm_equipment_master FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_failure_codes
ALTER TABLE pm_failure_codes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_failure_codes_lineage ON pm_failure_codes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_failure_codes_org_scope ON pm_failure_codes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_failure_codes_row_version ON pm_failure_codes;
CREATE TRIGGER trg_pm_failure_codes_row_version BEFORE UPDATE ON pm_failure_codes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_functional_locations
ALTER TABLE pm_functional_locations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_functional_locations_lineage ON pm_functional_locations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_functional_locations_org_scope ON pm_functional_locations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_functional_locations_row_version ON pm_functional_locations;
CREATE TRIGGER trg_pm_functional_locations_row_version BEFORE UPDATE ON pm_functional_locations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_maintenance_budgets
ALTER TABLE pm_maintenance_budgets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_maintenance_budgets_lineage ON pm_maintenance_budgets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_maintenance_budgets_org_scope ON pm_maintenance_budgets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_maintenance_budgets_row_version ON pm_maintenance_budgets;
CREATE TRIGGER trg_pm_maintenance_budgets_row_version BEFORE UPDATE ON pm_maintenance_budgets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_maintenance_plans
ALTER TABLE pm_maintenance_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_maintenance_plans_lineage ON pm_maintenance_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_maintenance_plans_org_scope ON pm_maintenance_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_maintenance_plans_row_version ON pm_maintenance_plans;
CREATE TRIGGER trg_pm_maintenance_plans_row_version BEFORE UPDATE ON pm_maintenance_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_reliability_metrics
ALTER TABLE pm_reliability_metrics
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_reliability_metrics_lineage ON pm_reliability_metrics (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_reliability_metrics_org_scope ON pm_reliability_metrics (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_reliability_metrics_row_version ON pm_reliability_metrics;
CREATE TRIGGER trg_pm_reliability_metrics_row_version BEFORE UPDATE ON pm_reliability_metrics FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_spare_parts_inventory
ALTER TABLE pm_spare_parts_inventory
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_spare_parts_inventory_lineage ON pm_spare_parts_inventory (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_spare_parts_inventory_org_scope ON pm_spare_parts_inventory (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_spare_parts_inventory_row_version ON pm_spare_parts_inventory;
CREATE TRIGGER trg_pm_spare_parts_inventory_row_version BEFORE UPDATE ON pm_spare_parts_inventory FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pm_work_orders
ALTER TABLE pm_work_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_lineage ON pm_work_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_org_scope ON pm_work_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pm_work_orders_row_version ON pm_work_orders;
CREATE TRIGGER trg_pm_work_orders_row_version BEFORE UPDATE ON pm_work_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_access_tokens
ALTER TABLE portal_access_tokens
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_lineage ON portal_access_tokens (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_org_scope ON portal_access_tokens (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_access_tokens_row_version ON portal_access_tokens;
CREATE TRIGGER trg_portal_access_tokens_row_version BEFORE UPDATE ON portal_access_tokens FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_complaint_submissions
ALTER TABLE portal_complaint_submissions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_complaint_submissions_lineage ON portal_complaint_submissions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_complaint_submissions_org_scope ON portal_complaint_submissions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_complaint_submissions_row_version ON portal_complaint_submissions;
CREATE TRIGGER trg_portal_complaint_submissions_row_version BEFORE UPDATE ON portal_complaint_submissions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_document_access
ALTER TABLE portal_document_access
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_document_access_lineage ON portal_document_access (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_document_access_org_scope ON portal_document_access (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_document_access_row_version ON portal_document_access;
CREATE TRIGGER trg_portal_document_access_row_version BEFORE UPDATE ON portal_document_access FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_order_views
ALTER TABLE portal_order_views
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_order_views_lineage ON portal_order_views (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_order_views_org_scope ON portal_order_views (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_order_views_row_version ON portal_order_views;
CREATE TRIGGER trg_portal_order_views_row_version BEFORE UPDATE ON portal_order_views FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_sessions
ALTER TABLE portal_sessions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_sessions_lineage ON portal_sessions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_sessions_org_scope ON portal_sessions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_sessions_row_version ON portal_sessions;
CREATE TRIGGER trg_portal_sessions_row_version BEFORE UPDATE ON portal_sessions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- portal_users
ALTER TABLE portal_users
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_portal_users_lineage ON portal_users (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_users_org_scope ON portal_users (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_portal_users_row_version ON portal_users;
CREATE TRIGGER trg_portal_users_row_version BEFORE UPDATE ON portal_users FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ppap_submissions
ALTER TABLE ppap_submissions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_lineage ON ppap_submissions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_org_scope ON ppap_submissions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ppap_submissions_row_version ON ppap_submissions;
CREATE TRIGGER trg_ppap_submissions_row_version BEFORE UPDATE ON ppap_submissions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prediction_models
ALTER TABLE prediction_models
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prediction_models_lineage ON prediction_models (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prediction_models_org_scope ON prediction_models (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prediction_models_row_version ON prediction_models;
CREATE TRIGGER trg_prediction_models_row_version BEFORE UPDATE ON prediction_models FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_billing_milestones
ALTER TABLE prj_billing_milestones
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_billing_milestones_lineage ON prj_billing_milestones (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_billing_milestones_org_scope ON prj_billing_milestones (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_billing_milestones_row_version ON prj_billing_milestones;
CREATE TRIGGER trg_prj_billing_milestones_row_version BEFORE UPDATE ON prj_billing_milestones FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_change_requests
ALTER TABLE prj_change_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_change_requests_lineage ON prj_change_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_change_requests_org_scope ON prj_change_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_change_requests_row_version ON prj_change_requests;
CREATE TRIGGER trg_prj_change_requests_row_version BEFORE UPDATE ON prj_change_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_cost_collections
ALTER TABLE prj_cost_collections
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_cost_collections_lineage ON prj_cost_collections (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_cost_collections_org_scope ON prj_cost_collections (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_cost_collections_row_version ON prj_cost_collections;
CREATE TRIGGER trg_prj_cost_collections_row_version BEFORE UPDATE ON prj_cost_collections FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_milestones
ALTER TABLE prj_milestones
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_milestones_lineage ON prj_milestones (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_milestones_org_scope ON prj_milestones (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_milestones_row_version ON prj_milestones;
CREATE TRIGGER trg_prj_milestones_row_version BEFORE UPDATE ON prj_milestones FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_projects
ALTER TABLE prj_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_projects_lineage ON prj_projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_projects_org_scope ON prj_projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_projects_row_version ON prj_projects;
CREATE TRIGGER trg_prj_projects_row_version BEFORE UPDATE ON prj_projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_risk_register
ALTER TABLE prj_risk_register
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_risk_register_lineage ON prj_risk_register (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_risk_register_org_scope ON prj_risk_register (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_risk_register_row_version ON prj_risk_register;
CREATE TRIGGER trg_prj_risk_register_row_version BEFORE UPDATE ON prj_risk_register FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_time_entries
ALTER TABLE prj_time_entries
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_time_entries_lineage ON prj_time_entries (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_time_entries_org_scope ON prj_time_entries (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_time_entries_row_version ON prj_time_entries;
CREATE TRIGGER trg_prj_time_entries_row_version BEFORE UPDATE ON prj_time_entries FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- prj_wbs_elements
ALTER TABLE prj_wbs_elements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_prj_wbs_elements_lineage ON prj_wbs_elements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prj_wbs_elements_org_scope ON prj_wbs_elements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_prj_wbs_elements_row_version ON prj_wbs_elements;
CREATE TRIGGER trg_prj_wbs_elements_row_version BEFORE UPDATE ON prj_wbs_elements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- product_passports
ALTER TABLE product_passports
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_product_passports_lineage ON product_passports (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_passports_org_scope ON product_passports (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_product_passports_row_version ON product_passports;
CREATE TRIGGER trg_product_passports_row_version BEFORE UPDATE ON product_passports FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- production_schedule
ALTER TABLE production_schedule
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_production_schedule_lineage ON production_schedule (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_schedule_org_scope ON production_schedule (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_production_schedule_row_version ON production_schedule;
CREATE TRIGGER trg_production_schedule_row_version BEFORE UPDATE ON production_schedule FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- production_schedule_slots
ALTER TABLE production_schedule_slots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_production_schedule_slots_lineage ON production_schedule_slots (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_schedule_slots_org_scope ON production_schedule_slots (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_production_schedule_slots_row_version ON production_schedule_slots;
CREATE TRIGGER trg_production_schedule_slots_row_version BEFORE UPDATE ON production_schedule_slots FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- project_milestones
ALTER TABLE project_milestones
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_project_milestones_lineage ON project_milestones (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_milestones_org_scope ON project_milestones (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_project_milestones_row_version ON project_milestones;
CREATE TRIGGER trg_project_milestones_row_version BEFORE UPDATE ON project_milestones FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- project_resources
ALTER TABLE project_resources
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_project_resources_lineage ON project_resources (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_resources_org_scope ON project_resources (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_project_resources_row_version ON project_resources;
CREATE TRIGGER trg_project_resources_row_version BEFORE UPDATE ON project_resources FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- projects
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_projects_lineage ON projects (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_org_scope ON projects (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_projects_row_version ON projects;
CREATE TRIGGER trg_projects_row_version BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- purchase_orders
ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_lineage ON purchase_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_scope ON purchase_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_purchase_orders_row_version ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_row_version BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_audit_programs
ALTER TABLE qual_audit_programs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_audit_programs_lineage ON qual_audit_programs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_audit_programs_org_scope ON qual_audit_programs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_audit_programs_row_version ON qual_audit_programs;
CREATE TRIGGER trg_qual_audit_programs_row_version BEFORE UPDATE ON qual_audit_programs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_compliance_obligations
ALTER TABLE qual_compliance_obligations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_compliance_obligations_lineage ON qual_compliance_obligations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_compliance_obligations_org_scope ON qual_compliance_obligations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_compliance_obligations_row_version ON qual_compliance_obligations;
CREATE TRIGGER trg_qual_compliance_obligations_row_version BEFORE UPDATE ON qual_compliance_obligations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_containment_actions
ALTER TABLE qual_containment_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_containment_actions_lineage ON qual_containment_actions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_containment_actions_org_scope ON qual_containment_actions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_containment_actions_row_version ON qual_containment_actions;
CREATE TRIGGER trg_qual_containment_actions_row_version BEFORE UPDATE ON qual_containment_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_effectiveness_reviews
ALTER TABLE qual_effectiveness_reviews
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_effectiveness_reviews_lineage ON qual_effectiveness_reviews (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_effectiveness_reviews_org_scope ON qual_effectiveness_reviews (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_effectiveness_reviews_row_version ON qual_effectiveness_reviews;
CREATE TRIGGER trg_qual_effectiveness_reviews_row_version BEFORE UPDATE ON qual_effectiveness_reviews FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_first_article_packages
ALTER TABLE qual_first_article_packages
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_first_article_packages_lineage ON qual_first_article_packages (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_first_article_packages_org_scope ON qual_first_article_packages (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_first_article_packages_row_version ON qual_first_article_packages;
CREATE TRIGGER trg_qual_first_article_packages_row_version BEFORE UPDATE ON qual_first_article_packages FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_lab_equipment
ALTER TABLE qual_lab_equipment
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_lab_equipment_lineage ON qual_lab_equipment (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_lab_equipment_org_scope ON qual_lab_equipment (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_lab_equipment_row_version ON qual_lab_equipment;
CREATE TRIGGER trg_qual_lab_equipment_row_version BEFORE UPDATE ON qual_lab_equipment FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_root_cause_sessions
ALTER TABLE qual_root_cause_sessions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_root_cause_sessions_lineage ON qual_root_cause_sessions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_root_cause_sessions_org_scope ON qual_root_cause_sessions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_root_cause_sessions_row_version ON qual_root_cause_sessions;
CREATE TRIGGER trg_qual_root_cause_sessions_row_version BEFORE UPDATE ON qual_root_cause_sessions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_sample_batches
ALTER TABLE qual_sample_batches
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_sample_batches_lineage ON qual_sample_batches (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_sample_batches_org_scope ON qual_sample_batches (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_sample_batches_row_version ON qual_sample_batches;
CREATE TRIGGER trg_qual_sample_batches_row_version BEFORE UPDATE ON qual_sample_batches FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_sample_plans
ALTER TABLE qual_sample_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_sample_plans_lineage ON qual_sample_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_sample_plans_org_scope ON qual_sample_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_sample_plans_row_version ON qual_sample_plans;
CREATE TRIGGER trg_qual_sample_plans_row_version BEFORE UPDATE ON qual_sample_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_test_labs
ALTER TABLE qual_test_labs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_test_labs_lineage ON qual_test_labs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_test_labs_org_scope ON qual_test_labs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_test_labs_row_version ON qual_test_labs;
CREATE TRIGGER trg_qual_test_labs_row_version BEFORE UPDATE ON qual_test_labs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_test_methods
ALTER TABLE qual_test_methods
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_qual_test_methods_lineage ON qual_test_methods (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_test_methods_org_scope ON qual_test_methods (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_test_methods_row_version ON qual_test_methods;
CREATE TRIGGER trg_qual_test_methods_row_version BEFORE UPDATE ON qual_test_methods FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- quality_predictions
ALTER TABLE quality_predictions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_quality_predictions_lineage ON quality_predictions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_predictions_org_scope ON quality_predictions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_quality_predictions_row_version ON quality_predictions;
CREATE TRIGGER trg_quality_predictions_row_version BEFORE UPDATE ON quality_predictions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- quotes
ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_quotes_lineage ON quotes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_org_scope ON quotes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_quotes_row_version ON quotes;
CREATE TRIGGER trg_quotes_row_version BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- record_counters
ALTER TABLE record_counters
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_record_counters_lineage ON record_counters (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_record_counters_org_scope ON record_counters (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_record_counters_row_version ON record_counters;
CREATE TRIGGER trg_record_counters_row_version BEFORE UPDATE ON record_counters FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- records
ALTER TABLE records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_records_lineage ON records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_records_org_scope ON records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_records_row_version ON records;
CREATE TRIGGER trg_records_row_version BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- risk_register
ALTER TABLE risk_register
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_risk_register_lineage ON risk_register (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_register_org_scope ON risk_register (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_risk_register_row_version ON risk_register;
CREATE TRIGGER trg_risk_register_row_version BEFORE UPDATE ON risk_register FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- rma_orders
ALTER TABLE rma_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_rma_orders_lineage ON rma_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rma_orders_org_scope ON rma_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_rma_orders_row_version ON rma_orders;
CREATE TRIGGER trg_rma_orders_row_version BEFORE UPDATE ON rma_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- roles
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_roles_lineage ON roles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roles_org_scope ON roles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_roles_row_version ON roles;
CREATE TRIGGER trg_roles_row_version BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- routings
ALTER TABLE routings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_routings_lineage ON routings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routings_org_scope ON routings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_routings_row_version ON routings;
CREATE TRIGGER trg_routings_row_version BEFORE UPDATE ON routings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sales_orders
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sales_orders_lineage ON sales_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_scope ON sales_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sales_orders_row_version ON sales_orders;
CREATE TRIGGER trg_sales_orders_row_version BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- scar_records
ALTER TABLE scar_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_scar_records_lineage ON scar_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scar_records_org_scope ON scar_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_scar_records_row_version ON scar_records;
CREATE TRIGGER trg_scar_records_row_version BEFORE UPDATE ON scar_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- schedule_conflicts
ALTER TABLE schedule_conflicts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_lineage ON schedule_conflicts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_org_scope ON schedule_conflicts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_schedule_conflicts_row_version ON schedule_conflicts;
CREATE TRIGGER trg_schedule_conflicts_row_version BEFORE UPDATE ON schedule_conflicts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- serial_master
ALTER TABLE serial_master
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_serial_master_lineage ON serial_master (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serial_master_org_scope ON serial_master (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_serial_master_row_version ON serial_master;
CREATE TRIGGER trg_serial_master_row_version BEFORE UPDATE ON serial_master FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sessions
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sessions_lineage ON sessions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_org_scope ON sessions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sessions_row_version ON sessions;
CREATE TRIGGER trg_sessions_row_version BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- setup_sheets
ALTER TABLE setup_sheets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_setup_sheets_lineage ON setup_sheets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_setup_sheets_org_scope ON setup_sheets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_setup_sheets_row_version ON setup_sheets;
CREATE TRIGGER trg_setup_sheets_row_version BEFORE UPDATE ON setup_sheets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shift_calendar_holidays
ALTER TABLE shift_calendar_holidays
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shift_calendar_holidays_lineage ON shift_calendar_holidays (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_calendar_holidays_org_scope ON shift_calendar_holidays (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shift_calendar_holidays_row_version ON shift_calendar_holidays;
CREATE TRIGGER trg_shift_calendar_holidays_row_version BEFORE UPDATE ON shift_calendar_holidays FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shift_definitions
ALTER TABLE shift_definitions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shift_definitions_lineage ON shift_definitions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_definitions_org_scope ON shift_definitions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shift_definitions_row_version ON shift_definitions;
CREATE TRIGGER trg_shift_definitions_row_version BEFORE UPDATE ON shift_definitions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shift_targets
ALTER TABLE shift_targets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shift_targets_lineage ON shift_targets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_targets_org_scope ON shift_targets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shift_targets_row_version ON shift_targets;
CREATE TRIGGER trg_shift_targets_row_version BEFORE UPDATE ON shift_targets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shipment_packages
ALTER TABLE shipment_packages
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shipment_packages_lineage ON shipment_packages (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_packages_org_scope ON shipment_packages (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shipment_packages_row_version ON shipment_packages;
CREATE TRIGGER trg_shipment_packages_row_version BEFORE UPDATE ON shipment_packages FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shipment_releases
ALTER TABLE shipment_releases
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shipment_releases_lineage ON shipment_releases (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_releases_org_scope ON shipment_releases (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shipment_releases_row_version ON shipment_releases;
CREATE TRIGGER trg_shipment_releases_row_version BEFORE UPDATE ON shipment_releases FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shipments
ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_shipments_lineage ON shipments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_org_scope ON shipments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shipments_row_version ON shipments;
CREATE TRIGGER trg_shipments_row_version BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- skills_matrix
ALTER TABLE skills_matrix
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_skills_matrix_lineage ON skills_matrix (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_matrix_org_scope ON skills_matrix (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_skills_matrix_row_version ON skills_matrix;
CREATE TRIGGER trg_skills_matrix_row_version BEFORE UPDATE ON skills_matrix FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- skip_lot_tracking
ALTER TABLE skip_lot_tracking
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_skip_lot_tracking_lineage ON skip_lot_tracking (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skip_lot_tracking_org_scope ON skip_lot_tracking (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_skip_lot_tracking_row_version ON skip_lot_tracking;
CREATE TRIGGER trg_skip_lot_tracking_row_version BEFORE UPDATE ON skip_lot_tracking FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_demand_consensus
ALTER TABLE sop_demand_consensus
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_demand_consensus_lineage ON sop_demand_consensus (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_demand_consensus_org_scope ON sop_demand_consensus (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_demand_consensus_row_version ON sop_demand_consensus;
CREATE TRIGGER trg_sop_demand_consensus_row_version BEFORE UPDATE ON sop_demand_consensus FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_inventory_policies
ALTER TABLE sop_inventory_policies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_inventory_policies_lineage ON sop_inventory_policies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_inventory_policies_org_scope ON sop_inventory_policies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_inventory_policies_row_version ON sop_inventory_policies;
CREATE TRIGGER trg_sop_inventory_policies_row_version BEFORE UPDATE ON sop_inventory_policies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_meeting_cycles
ALTER TABLE sop_meeting_cycles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_meeting_cycles_lineage ON sop_meeting_cycles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_meeting_cycles_org_scope ON sop_meeting_cycles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_meeting_cycles_row_version ON sop_meeting_cycles;
CREATE TRIGGER trg_sop_meeting_cycles_row_version BEFORE UPDATE ON sop_meeting_cycles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_plans
ALTER TABLE sop_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_plans_lineage ON sop_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_plans_org_scope ON sop_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_plans_row_version ON sop_plans;
CREATE TRIGGER trg_sop_plans_row_version BEFORE UPDATE ON sop_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_scenario_assumptions
ALTER TABLE sop_scenario_assumptions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_scenario_assumptions_lineage ON sop_scenario_assumptions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_scenario_assumptions_org_scope ON sop_scenario_assumptions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_scenario_assumptions_row_version ON sop_scenario_assumptions;
CREATE TRIGGER trg_sop_scenario_assumptions_row_version BEFORE UPDATE ON sop_scenario_assumptions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sop_supply_consensus
ALTER TABLE sop_supply_consensus
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_sop_supply_consensus_lineage ON sop_supply_consensus (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_supply_consensus_org_scope ON sop_supply_consensus (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sop_supply_consensus_row_version ON sop_supply_consensus;
CREATE TRIGGER trg_sop_supply_consensus_row_version BEFORE UPDATE ON sop_supply_consensus FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- spc_anomaly_rules
ALTER TABLE spc_anomaly_rules
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_spc_anomaly_rules_lineage ON spc_anomaly_rules (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spc_anomaly_rules_org_scope ON spc_anomaly_rules (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_spc_anomaly_rules_row_version ON spc_anomaly_rules;
CREATE TRIGGER trg_spc_anomaly_rules_row_version BEFORE UPDATE ON spc_anomaly_rules FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- spc_data
ALTER TABLE spc_data
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_spc_data_lineage ON spc_data (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spc_data_org_scope ON spc_data (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_spc_data_row_version ON spc_data;
CREATE TRIGGER trg_spc_data_row_version BEFORE UPDATE ON spc_data FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_bid_comparisons
ALTER TABLE srm_bid_comparisons
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_bid_comparisons_lineage ON srm_bid_comparisons (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_bid_comparisons_org_scope ON srm_bid_comparisons (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_bid_comparisons_row_version ON srm_bid_comparisons;
CREATE TRIGGER trg_srm_bid_comparisons_row_version BEFORE UPDATE ON srm_bid_comparisons FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_sourcing_bids
ALTER TABLE srm_sourcing_bids
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_sourcing_bids_lineage ON srm_sourcing_bids (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_sourcing_bids_org_scope ON srm_sourcing_bids (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_sourcing_bids_row_version ON srm_sourcing_bids;
CREATE TRIGGER trg_srm_sourcing_bids_row_version BEFORE UPDATE ON srm_sourcing_bids FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_action_requests
ALTER TABLE srm_supplier_action_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_action_requests_lineage ON srm_supplier_action_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_action_requests_org_scope ON srm_supplier_action_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_action_requests_row_version ON srm_supplier_action_requests;
CREATE TRIGGER trg_srm_supplier_action_requests_row_version BEFORE UPDATE ON srm_supplier_action_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_capabilities
ALTER TABLE srm_supplier_capabilities
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_capabilities_lineage ON srm_supplier_capabilities (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_capabilities_org_scope ON srm_supplier_capabilities (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_capabilities_row_version ON srm_supplier_capabilities;
CREATE TRIGGER trg_srm_supplier_capabilities_row_version BEFORE UPDATE ON srm_supplier_capabilities FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_capacity
ALTER TABLE srm_supplier_capacity
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_capacity_lineage ON srm_supplier_capacity (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_capacity_org_scope ON srm_supplier_capacity (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_capacity_row_version ON srm_supplier_capacity;
CREATE TRIGGER trg_srm_supplier_capacity_row_version BEFORE UPDATE ON srm_supplier_capacity FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_contracts
ALTER TABLE srm_supplier_contracts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_contracts_lineage ON srm_supplier_contracts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_contracts_org_scope ON srm_supplier_contracts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_contracts_row_version ON srm_supplier_contracts;
CREATE TRIGGER trg_srm_supplier_contracts_row_version BEFORE UPDATE ON srm_supplier_contracts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_development_plans
ALTER TABLE srm_supplier_development_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_development_plans_lineage ON srm_supplier_development_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_development_plans_org_scope ON srm_supplier_development_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_development_plans_row_version ON srm_supplier_development_plans;
CREATE TRIGGER trg_srm_supplier_development_plans_row_version BEFORE UPDATE ON srm_supplier_development_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_portal_messages
ALTER TABLE srm_supplier_portal_messages
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_portal_messages_lineage ON srm_supplier_portal_messages (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_portal_messages_org_scope ON srm_supplier_portal_messages (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_portal_messages_row_version ON srm_supplier_portal_messages;
CREATE TRIGGER trg_srm_supplier_portal_messages_row_version BEFORE UPDATE ON srm_supplier_portal_messages FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_portal_users
ALTER TABLE srm_supplier_portal_users
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_portal_users_lineage ON srm_supplier_portal_users (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_portal_users_org_scope ON srm_supplier_portal_users (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_portal_users_row_version ON srm_supplier_portal_users;
CREATE TRIGGER trg_srm_supplier_portal_users_row_version BEFORE UPDATE ON srm_supplier_portal_users FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_supplier_ppap_packages
ALTER TABLE srm_supplier_ppap_packages
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_ppap_packages_lineage ON srm_supplier_ppap_packages (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_ppap_packages_org_scope ON srm_supplier_ppap_packages (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_supplier_ppap_packages_row_version ON srm_supplier_ppap_packages;
CREATE TRIGGER trg_srm_supplier_ppap_packages_row_version BEFORE UPDATE ON srm_supplier_ppap_packages FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- srm_vendor_managed_inventory
ALTER TABLE srm_vendor_managed_inventory
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_srm_vendor_managed_inventory_lineage ON srm_vendor_managed_inventory (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_vendor_managed_inventory_org_scope ON srm_vendor_managed_inventory (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_srm_vendor_managed_inventory_row_version ON srm_vendor_managed_inventory;
CREATE TRIGGER trg_srm_vendor_managed_inventory_row_version BEFORE UPDATE ON srm_vendor_managed_inventory FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- subcontract_orders
ALTER TABLE subcontract_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_subcontract_orders_lineage ON subcontract_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subcontract_orders_org_scope ON subcontract_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_subcontract_orders_row_version ON subcontract_orders;
CREATE TRIGGER trg_subcontract_orders_row_version BEFORE UPDATE ON subcontract_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- subcontract_receipts
ALTER TABLE subcontract_receipts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_subcontract_receipts_lineage ON subcontract_receipts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subcontract_receipts_org_scope ON subcontract_receipts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_subcontract_receipts_row_version ON subcontract_receipts;
CREATE TRIGGER trg_subcontract_receipts_row_version BEFORE UPDATE ON subcontract_receipts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- supplier_audit_schedule
ALTER TABLE supplier_audit_schedule
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_supplier_audit_schedule_lineage ON supplier_audit_schedule (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_audit_schedule_org_scope ON supplier_audit_schedule (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_supplier_audit_schedule_row_version ON supplier_audit_schedule;
CREATE TRIGGER trg_supplier_audit_schedule_row_version BEFORE UPDATE ON supplier_audit_schedule FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- supplier_scorecards
ALTER TABLE supplier_scorecards
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_lineage ON supplier_scorecards (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_org_scope ON supplier_scorecards (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_supplier_scorecards_row_version ON supplier_scorecards;
CREATE TRIGGER trg_supplier_scorecards_row_version BEFORE UPDATE ON supplier_scorecards FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- supply_replenishment_policies
ALTER TABLE supply_replenishment_policies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_supply_replenishment_policies_lineage ON supply_replenishment_policies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supply_replenishment_policies_org_scope ON supply_replenishment_policies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_supply_replenishment_policies_row_version ON supply_replenishment_policies;
CREATE TRIGGER trg_supply_replenishment_policies_row_version BEFORE UPDATE ON supply_replenishment_policies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_customer_assets
ALTER TABLE svc_customer_assets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_customer_assets_lineage ON svc_customer_assets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_customer_assets_org_scope ON svc_customer_assets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_customer_assets_row_version ON svc_customer_assets;
CREATE TRIGGER trg_svc_customer_assets_row_version BEFORE UPDATE ON svc_customer_assets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_field_visit_reports
ALTER TABLE svc_field_visit_reports
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_field_visit_reports_lineage ON svc_field_visit_reports (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_field_visit_reports_org_scope ON svc_field_visit_reports (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_field_visit_reports_row_version ON svc_field_visit_reports;
CREATE TRIGGER trg_svc_field_visit_reports_row_version BEFORE UPDATE ON svc_field_visit_reports FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_installed_base
ALTER TABLE svc_installed_base
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_installed_base_lineage ON svc_installed_base (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_installed_base_org_scope ON svc_installed_base (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_installed_base_row_version ON svc_installed_base;
CREATE TRIGGER trg_svc_installed_base_row_version BEFORE UPDATE ON svc_installed_base FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_return_authorizations
ALTER TABLE svc_return_authorizations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_return_authorizations_lineage ON svc_return_authorizations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_return_authorizations_org_scope ON svc_return_authorizations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_return_authorizations_row_version ON svc_return_authorizations;
CREATE TRIGGER trg_svc_return_authorizations_row_version BEFORE UPDATE ON svc_return_authorizations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_service_contracts
ALTER TABLE svc_service_contracts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_service_contracts_lineage ON svc_service_contracts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_service_contracts_org_scope ON svc_service_contracts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_service_contracts_row_version ON svc_service_contracts;
CREATE TRIGGER trg_svc_service_contracts_row_version BEFORE UPDATE ON svc_service_contracts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_service_requests
ALTER TABLE svc_service_requests
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_service_requests_lineage ON svc_service_requests (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_service_requests_org_scope ON svc_service_requests (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_service_requests_row_version ON svc_service_requests;
CREATE TRIGGER trg_svc_service_requests_row_version BEFORE UPDATE ON svc_service_requests FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_service_work_orders
ALTER TABLE svc_service_work_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_service_work_orders_lineage ON svc_service_work_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_service_work_orders_org_scope ON svc_service_work_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_service_work_orders_row_version ON svc_service_work_orders;
CREATE TRIGGER trg_svc_service_work_orders_row_version BEFORE UPDATE ON svc_service_work_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- svc_warranty_claims
ALTER TABLE svc_warranty_claims
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_svc_warranty_claims_lineage ON svc_warranty_claims (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svc_warranty_claims_org_scope ON svc_warranty_claims (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_svc_warranty_claims_row_version ON svc_warranty_claims;
CREATE TRIGGER trg_svc_warranty_claims_row_version BEFORE UPDATE ON svc_warranty_claims FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tags
ALTER TABLE tags
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tags_lineage ON tags (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_org_scope ON tags (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tags_row_version ON tags;
CREATE TRIGGER trg_tags_row_version BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_carriers
ALTER TABLE tms_carriers
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_carriers_lineage ON tms_carriers (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_carriers_org_scope ON tms_carriers (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_carriers_row_version ON tms_carriers;
CREATE TRIGGER trg_tms_carriers_row_version BEFORE UPDATE ON tms_carriers FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_customs_documents
ALTER TABLE tms_customs_documents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_customs_documents_lineage ON tms_customs_documents (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_customs_documents_org_scope ON tms_customs_documents (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_customs_documents_row_version ON tms_customs_documents;
CREATE TRIGGER trg_tms_customs_documents_row_version BEFORE UPDATE ON tms_customs_documents FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_dangerous_goods
ALTER TABLE tms_dangerous_goods
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_dangerous_goods_lineage ON tms_dangerous_goods (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_dangerous_goods_org_scope ON tms_dangerous_goods (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_dangerous_goods_row_version ON tms_dangerous_goods;
CREATE TRIGGER trg_tms_dangerous_goods_row_version BEFORE UPDATE ON tms_dangerous_goods FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_export_screenings
ALTER TABLE tms_export_screenings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_export_screenings_lineage ON tms_export_screenings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_export_screenings_org_scope ON tms_export_screenings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_export_screenings_row_version ON tms_export_screenings;
CREATE TRIGGER trg_tms_export_screenings_row_version BEFORE UPDATE ON tms_export_screenings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_freight_audits
ALTER TABLE tms_freight_audits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_freight_audits_lineage ON tms_freight_audits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_freight_audits_org_scope ON tms_freight_audits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_freight_audits_row_version ON tms_freight_audits;
CREATE TRIGGER trg_tms_freight_audits_row_version BEFORE UPDATE ON tms_freight_audits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_freight_quotes
ALTER TABLE tms_freight_quotes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_freight_quotes_lineage ON tms_freight_quotes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_freight_quotes_org_scope ON tms_freight_quotes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_freight_quotes_row_version ON tms_freight_quotes;
CREATE TRIGGER trg_tms_freight_quotes_row_version BEFORE UPDATE ON tms_freight_quotes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_routes
ALTER TABLE tms_routes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_routes_lineage ON tms_routes (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_routes_org_scope ON tms_routes (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_routes_row_version ON tms_routes;
CREATE TRIGGER trg_tms_routes_row_version BEFORE UPDATE ON tms_routes FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tms_shipments
ALTER TABLE tms_shipments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tms_shipments_lineage ON tms_shipments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_shipments_org_scope ON tms_shipments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tms_shipments_row_version ON tms_shipments;
CREATE TRIGGER trg_tms_shipments_row_version BEFORE UPDATE ON tms_shipments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tool_transactions
ALTER TABLE tool_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tool_transactions_lineage ON tool_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tool_transactions_org_scope ON tool_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tool_transactions_row_version ON tool_transactions;
CREATE TRIGGER trg_tool_transactions_row_version BEFORE UPDATE ON tool_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_assemblies
ALTER TABLE tooling_assemblies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_assemblies_lineage ON tooling_assemblies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_assemblies_org_scope ON tooling_assemblies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_assemblies_row_version ON tooling_assemblies;
CREATE TRIGGER trg_tooling_assemblies_row_version BEFORE UPDATE ON tooling_assemblies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_components
ALTER TABLE tooling_components
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_components_lineage ON tooling_components (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_components_org_scope ON tooling_components (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_components_row_version ON tooling_components;
CREATE TRIGGER trg_tooling_components_row_version BEFORE UPDATE ON tooling_components FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_crib_transactions
ALTER TABLE tooling_crib_transactions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_crib_transactions_lineage ON tooling_crib_transactions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_crib_transactions_org_scope ON tooling_crib_transactions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_crib_transactions_row_version ON tooling_crib_transactions;
CREATE TRIGGER trg_tooling_crib_transactions_row_version BEFORE UPDATE ON tooling_crib_transactions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_families
ALTER TABLE tooling_families
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_families_lineage ON tooling_families (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_families_org_scope ON tooling_families (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_families_row_version ON tooling_families;
CREATE TRIGGER trg_tooling_families_row_version BEFORE UPDATE ON tooling_families FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_kits
ALTER TABLE tooling_kits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_kits_lineage ON tooling_kits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_kits_org_scope ON tooling_kits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_kits_row_version ON tooling_kits;
CREATE TRIGGER trg_tooling_kits_row_version BEFORE UPDATE ON tooling_kits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_life_limits
ALTER TABLE tooling_life_limits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_life_limits_lineage ON tooling_life_limits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_life_limits_org_scope ON tooling_life_limits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_life_limits_row_version ON tooling_life_limits;
CREATE TRIGGER trg_tooling_life_limits_row_version BEFORE UPDATE ON tooling_life_limits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_life_measurements
ALTER TABLE tooling_life_measurements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_life_measurements_lineage ON tooling_life_measurements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_life_measurements_org_scope ON tooling_life_measurements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_life_measurements_row_version ON tooling_life_measurements;
CREATE TRIGGER trg_tooling_life_measurements_row_version BEFORE UPDATE ON tooling_life_measurements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_locations
ALTER TABLE tooling_locations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_locations_lineage ON tooling_locations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_locations_org_scope ON tooling_locations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_locations_row_version ON tooling_locations;
CREATE TRIGGER trg_tooling_locations_row_version BEFORE UPDATE ON tooling_locations FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_presets
ALTER TABLE tooling_presets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_presets_lineage ON tooling_presets (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_presets_org_scope ON tooling_presets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_presets_row_version ON tooling_presets;
CREATE TRIGGER trg_tooling_presets_row_version BEFORE UPDATE ON tooling_presets FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tooling_regrind_cycles
ALTER TABLE tooling_regrind_cycles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tooling_regrind_cycles_lineage ON tooling_regrind_cycles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tooling_regrind_cycles_org_scope ON tooling_regrind_cycles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tooling_regrind_cycles_row_version ON tooling_regrind_cycles;
CREATE TRIGGER trg_tooling_regrind_cycles_row_version BEFORE UPDATE ON tooling_regrind_cycles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- tools
ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_tools_lineage ON tools (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tools_org_scope ON tools (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_tools_row_version ON tools;
CREATE TRIGGER trg_tools_row_version BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_genealogy_batches
ALTER TABLE trace_genealogy_batches
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_genealogy_batches_lineage ON trace_genealogy_batches (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_genealogy_batches_org_scope ON trace_genealogy_batches (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_genealogy_batches_row_version ON trace_genealogy_batches;
CREATE TRIGGER trg_trace_genealogy_batches_row_version BEFORE UPDATE ON trace_genealogy_batches FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_heat_lot_register
ALTER TABLE trace_heat_lot_register
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_heat_lot_register_lineage ON trace_heat_lot_register (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_heat_lot_register_org_scope ON trace_heat_lot_register (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_heat_lot_register_row_version ON trace_heat_lot_register;
CREATE TRIGGER trg_trace_heat_lot_register_row_version BEFORE UPDATE ON trace_heat_lot_register FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_job_travelers
ALTER TABLE trace_job_travelers
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_job_travelers_lineage ON trace_job_travelers (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_job_travelers_org_scope ON trace_job_travelers (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_job_travelers_row_version ON trace_job_travelers;
CREATE TRIGGER trg_trace_job_travelers_row_version BEFORE UPDATE ON trace_job_travelers FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_label_print_jobs
ALTER TABLE trace_label_print_jobs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_label_print_jobs_lineage ON trace_label_print_jobs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_label_print_jobs_org_scope ON trace_label_print_jobs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_label_print_jobs_row_version ON trace_label_print_jobs;
CREATE TRIGGER trg_trace_label_print_jobs_row_version BEFORE UPDATE ON trace_label_print_jobs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_material_certificates
ALTER TABLE trace_material_certificates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_material_certificates_lineage ON trace_material_certificates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_material_certificates_org_scope ON trace_material_certificates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_material_certificates_row_version ON trace_material_certificates;
CREATE TRIGGER trg_trace_material_certificates_row_version BEFORE UPDATE ON trace_material_certificates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_recall_campaigns
ALTER TABLE trace_recall_campaigns
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trace_recall_campaigns_lineage ON trace_recall_campaigns (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_recall_campaigns_org_scope ON trace_recall_campaigns (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_recall_campaigns_row_version ON trace_recall_campaigns;
CREATE TRIGGER trg_trace_recall_campaigns_row_version BEFORE UPDATE ON trace_recall_campaigns FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_broker_profiles
ALTER TABLE trade_broker_profiles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_broker_profiles_lineage ON trade_broker_profiles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_broker_profiles_org_scope ON trade_broker_profiles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_broker_profiles_row_version ON trade_broker_profiles;
CREATE TRIGGER trg_trade_broker_profiles_row_version BEFORE UPDATE ON trade_broker_profiles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_certificate_of_origin
ALTER TABLE trade_certificate_of_origin
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_certificate_of_origin_lineage ON trade_certificate_of_origin (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_certificate_of_origin_org_scope ON trade_certificate_of_origin (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_certificate_of_origin_row_version ON trade_certificate_of_origin;
CREATE TRIGGER trg_trade_certificate_of_origin_row_version BEFORE UPDATE ON trade_certificate_of_origin FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_compliance_audits
ALTER TABLE trade_compliance_audits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_compliance_audits_lineage ON trade_compliance_audits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_compliance_audits_org_scope ON trade_compliance_audits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_compliance_audits_row_version ON trade_compliance_audits;
CREATE TRIGGER trg_trade_compliance_audits_row_version BEFORE UPDATE ON trade_compliance_audits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_duty_drawbacks
ALTER TABLE trade_duty_drawbacks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_duty_drawbacks_lineage ON trade_duty_drawbacks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_duty_drawbacks_org_scope ON trade_duty_drawbacks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_duty_drawbacks_row_version ON trade_duty_drawbacks;
CREATE TRIGGER trg_trade_duty_drawbacks_row_version BEFORE UPDATE ON trade_duty_drawbacks FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_eccn_master
ALTER TABLE trade_eccn_master
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_eccn_master_lineage ON trade_eccn_master (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_eccn_master_org_scope ON trade_eccn_master (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_eccn_master_row_version ON trade_eccn_master;
CREATE TRIGGER trg_trade_eccn_master_row_version BEFORE UPDATE ON trade_eccn_master FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_end_use_certificates
ALTER TABLE trade_end_use_certificates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_end_use_certificates_lineage ON trade_end_use_certificates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_end_use_certificates_org_scope ON trade_end_use_certificates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_end_use_certificates_row_version ON trade_end_use_certificates;
CREATE TRIGGER trg_trade_end_use_certificates_row_version BEFORE UPDATE ON trade_end_use_certificates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_import_bonds
ALTER TABLE trade_import_bonds
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_import_bonds_lineage ON trade_import_bonds (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_import_bonds_org_scope ON trade_import_bonds (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_import_bonds_row_version ON trade_import_bonds;
CREATE TRIGGER trg_trade_import_bonds_row_version BEFORE UPDATE ON trade_import_bonds FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_license_exceptions
ALTER TABLE trade_license_exceptions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_license_exceptions_lineage ON trade_license_exceptions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_license_exceptions_org_scope ON trade_license_exceptions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_license_exceptions_row_version ON trade_license_exceptions;
CREATE TRIGGER trg_trade_license_exceptions_row_version BEFORE UPDATE ON trade_license_exceptions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_preference_programs
ALTER TABLE trade_preference_programs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_preference_programs_lineage ON trade_preference_programs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_preference_programs_org_scope ON trade_preference_programs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_preference_programs_row_version ON trade_preference_programs;
CREATE TRIGGER trg_trade_preference_programs_row_version BEFORE UPDATE ON trade_preference_programs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_restricted_party_lists
ALTER TABLE trade_restricted_party_lists
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_restricted_party_lists_lineage ON trade_restricted_party_lists (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_restricted_party_lists_org_scope ON trade_restricted_party_lists (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_restricted_party_lists_row_version ON trade_restricted_party_lists;
CREATE TRIGGER trg_trade_restricted_party_lists_row_version BEFORE UPDATE ON trade_restricted_party_lists FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trade_screening_hits
ALTER TABLE trade_screening_hits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_trade_screening_hits_lineage ON trade_screening_hits (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_screening_hits_org_scope ON trade_screening_hits (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trade_screening_hits_row_version ON trade_screening_hits;
CREATE TRIGGER trg_trade_screening_hits_row_version BEFORE UPDATE ON trade_screening_hits FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- training_records
ALTER TABLE training_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_training_records_lineage ON training_records (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_records_org_scope ON training_records (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_training_records_row_version ON training_records;
CREATE TRIGGER trg_training_records_row_version BEFORE UPDATE ON training_records FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- user_roles
ALTER TABLE user_roles
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_user_roles_lineage ON user_roles (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_org_scope ON user_roles (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_user_roles_row_version ON user_roles;
CREATE TRIGGER trg_user_roles_row_version BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_users_lineage ON users (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_scope ON users (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_users_row_version ON users;
CREATE TRIGGER trg_users_row_version BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- variable_registry
ALTER TABLE variable_registry
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_variable_registry_lineage ON variable_registry (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variable_registry_org_scope ON variable_registry (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_variable_registry_row_version ON variable_registry;
CREATE TRIGGER trg_variable_registry_row_version BEFORE UPDATE ON variable_registry FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- vendor_ratings
ALTER TABLE vendor_ratings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_lineage ON vendor_ratings (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_org_scope ON vendor_ratings (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_vendor_ratings_row_version ON vendor_ratings;
CREATE TRIGGER trg_vendor_ratings_row_version BEFORE UPDATE ON vendor_ratings FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- vendors
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_vendors_lineage ON vendors (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_org_scope ON vendors (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_vendors_row_version ON vendors;
CREATE TRIGGER trg_vendors_row_version BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- warehouses
ALTER TABLE warehouses
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_warehouses_lineage ON warehouses (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_org_scope ON warehouses (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_warehouses_row_version ON warehouses;
CREATE TRIGGER trg_warehouses_row_version BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_bin_contents
ALTER TABLE wms_bin_contents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_bin_contents_lineage ON wms_bin_contents (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_bin_contents_org_scope ON wms_bin_contents (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_bin_contents_row_version ON wms_bin_contents;
CREATE TRIGGER trg_wms_bin_contents_row_version BEFORE UPDATE ON wms_bin_contents FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_cycle_count_plans
ALTER TABLE wms_cycle_count_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_cycle_count_plans_lineage ON wms_cycle_count_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_cycle_count_plans_org_scope ON wms_cycle_count_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_cycle_count_plans_row_version ON wms_cycle_count_plans;
CREATE TRIGGER trg_wms_cycle_count_plans_row_version BEFORE UPDATE ON wms_cycle_count_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_material_handling_units
ALTER TABLE wms_material_handling_units
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_material_handling_units_lineage ON wms_material_handling_units (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_material_handling_units_org_scope ON wms_material_handling_units (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_material_handling_units_row_version ON wms_material_handling_units;
CREATE TRIGGER trg_wms_material_handling_units_row_version BEFORE UPDATE ON wms_material_handling_units FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_pick_lists
ALTER TABLE wms_pick_lists
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_pick_lists_lineage ON wms_pick_lists (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_pick_lists_org_scope ON wms_pick_lists (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_pick_lists_row_version ON wms_pick_lists;
CREATE TRIGGER trg_wms_pick_lists_row_version BEFORE UPDATE ON wms_pick_lists FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_putaway_rules
ALTER TABLE wms_putaway_rules
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_putaway_rules_lineage ON wms_putaway_rules (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_putaway_rules_org_scope ON wms_putaway_rules (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_putaway_rules_row_version ON wms_putaway_rules;
CREATE TRIGGER trg_wms_putaway_rules_row_version BEFORE UPDATE ON wms_putaway_rules FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_quarantine_holds
ALTER TABLE wms_quarantine_holds
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_quarantine_holds_lineage ON wms_quarantine_holds (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_quarantine_holds_org_scope ON wms_quarantine_holds (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_quarantine_holds_row_version ON wms_quarantine_holds;
CREATE TRIGGER trg_wms_quarantine_holds_row_version BEFORE UPDATE ON wms_quarantine_holds FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_storage_bins
ALTER TABLE wms_storage_bins
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_storage_bins_lineage ON wms_storage_bins (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_storage_bins_org_scope ON wms_storage_bins (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_storage_bins_row_version ON wms_storage_bins;
CREATE TRIGGER trg_wms_storage_bins_row_version BEFORE UPDATE ON wms_storage_bins FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_transfer_orders
ALTER TABLE wms_transfer_orders
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_transfer_orders_lineage ON wms_transfer_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_transfer_orders_org_scope ON wms_transfer_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_transfer_orders_row_version ON wms_transfer_orders;
CREATE TRIGGER trg_wms_transfer_orders_row_version BEFORE UPDATE ON wms_transfer_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_wave_plans
ALTER TABLE wms_wave_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_wave_plans_lineage ON wms_wave_plans (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_wave_plans_org_scope ON wms_wave_plans (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_wave_plans_row_version ON wms_wave_plans;
CREATE TRIGGER trg_wms_wave_plans_row_version BEFORE UPDATE ON wms_wave_plans FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wms_zones
ALTER TABLE wms_zones
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_wms_zones_lineage ON wms_zones (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_zones_org_scope ON wms_zones (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wms_zones_row_version ON wms_zones;
CREATE TRIGGER trg_wms_zones_row_version BEFORE UPDATE ON wms_zones FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- work_centers
ALTER TABLE work_centers
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_work_centers_lineage ON work_centers (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_centers_org_scope ON work_centers (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_work_centers_row_version ON work_centers;
CREATE TRIGGER trg_work_centers_row_version BEFORE UPDATE ON work_centers FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- workflow_definitions
ALTER TABLE workflow_definitions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_lineage ON workflow_definitions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org_scope ON workflow_definitions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_workflow_definitions_row_version ON workflow_definitions;
CREATE TRIGGER trg_workflow_definitions_row_version BEFORE UPDATE ON workflow_definitions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- workflow_instances
ALTER TABLE workflow_instances
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_lineage ON workflow_instances (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org_scope ON workflow_instances (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_workflow_instances_row_version ON workflow_instances;
CREATE TRIGGER trg_workflow_instances_row_version BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE OR REPLACE VIEW v_identity_user_employee_ssot AS
SELECT
    COALESCE(u.user_id, e.user_id) AS canonical_user_id,
    u.user_id,
    u.username,
    u.email,
    u.status AS user_status,
    u.employee_id AS user_employee_id,
    e.employee_id,
    e.employee_name,
    e.is_active AS employee_active,
    COALESCE(e.dept_code, u.dept_code) AS dept_code,
    COALESCE(e.shift, u.shift) AS shift,
    CASE
        WHEN u.user_id IS NULL THEN 'employee_without_user'
        WHEN e.employee_id IS NULL THEN 'user_without_employee'
        WHEN u.employee_id <> e.employee_id THEN 'link_mismatch'
        ELSE 'aligned'
    END AS ssot_alignment
FROM users u
FULL OUTER JOIN employees e
  ON e.user_id = u.user_id OR e.employee_id = u.employee_id;

CREATE OR REPLACE VIEW v_customer_account_ssot AS
SELECT
    c.customer_id,
    c.customer_name,
    c.customer_status,
    c.currency_default,
    c.default_payment_term_code,
    c.default_incoterm_code,
    ca.account_id,
    ca.account_status,
    ca.currency_code AS account_currency_code,
    ca.promise_policy_code,
    CASE
        WHEN ca.account_id IS NULL THEN 'customer_without_account_profile'
        ELSE 'aligned'
    END AS ssot_alignment
FROM customers c
LEFT JOIN commercial_accounts ca
  ON ca.customer_id = c.customer_id;

CREATE OR REPLACE VIEW v_supplier_qualification_ssot AS
SELECT
    v.vendor_id,
    v.vendor_name,
    v.vendor_status,
    v.vendor_rating_grade,
    asl.asl_id,
    asl.asl_status,
    asl.approved_date,
    asl.expiry_date,
    CASE
        WHEN asl.asl_id IS NULL THEN 'vendor_without_asl'
        ELSE 'aligned'
    END AS ssot_alignment
FROM vendors v
LEFT JOIN approved_supplier_list asl
  ON asl.vendor_id = v.vendor_id;

CREATE OR REPLACE VIEW v_retention_policy_coverage AS
SELECT
    rp.retention_policy_code,
    rp.table_name,
    rp.data_domain,
    rp.retention_class,
    rp.hot_retention_days,
    rp.archive_retention_days,
    rp.purge_after_days,
    rp.archive_strategy,
    rp.storage_tier,
    rp.policy_status
FROM retention_policies rp;

CREATE OR REPLACE VIEW v_integration_monitor_route AS
SELECT
    im.integration_code,
    im.integration_name,
    im.monitoring_status,
    im.integration_pattern,
    im.reconciliation_sla_minutes,
    ss.source_system_name AS source_system_name,
    ts.source_system_name AS target_system_name,
    im.last_health_check_at,
    im.last_success_at,
    im.last_failure_at
FROM integration_monitors im
JOIN source_system_registry ss
  ON ss.source_system = im.source_system
JOIN source_system_registry ts
  ON ts.source_system = im.target_system;

CREATE OR REPLACE VIEW v_quality_record_ssot AS
SELECT
    r.record_id,
    r.record_type,
    r.title AS record_title,
    r.status AS record_status,
    n.ncr_id,
    n.ncr_number,
    n.ncr_status,
    c.capa_id,
    c.capa_status,
    f.fai_id,
    f.fai_number,
    f.fai_overall_result,
    CASE
        WHEN n.ncr_id IS NOT NULL THEN 'ncr'
        WHEN c.capa_id IS NOT NULL THEN 'capa'
        WHEN f.fai_id IS NOT NULL THEN 'fai'
        ELSE 'record'
    END AS process_entity,
    COALESCE(n.ncr_status, c.capa_status, f.fai_overall_result, r.status) AS effective_status
FROM records r
LEFT JOIN ncr_records n ON n.record_id = r.record_id
LEFT JOIN capa_records c ON c.record_id = r.record_id
LEFT JOIN fai_records f ON f.record_id = r.record_id;

COMMIT;
