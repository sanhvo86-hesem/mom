-- ============================================================================
-- Migration 091: Runtime Governance Continuity
-- Adds missing governance, organization-scope, lineage, and optimistic-locking
-- columns to runtime tables that cannot inherit scope through a governed parent.
-- Safe posture: additive columns only; no data deletion, no table rewrites beyond
-- PostgreSQL default handling for new metadata columns.
-- ============================================================================

BEGIN;

-- allocation
ALTER TABLE allocation
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_allocation_lineage ON allocation (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allocation_org_scope ON allocation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_allocation_row_version ON allocation;
CREATE TRIGGER trg_allocation_row_version BEFORE UPDATE ON allocation FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- allocation_events
ALTER TABLE allocation_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_allocation_events_lineage ON allocation_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allocation_events_org_scope ON allocation_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_allocation_events_row_version ON allocation_events;
CREATE TRIGGER trg_allocation_events_row_version BEFORE UPDATE ON allocation_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- approval
ALTER TABLE approval
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_approval_lineage ON approval (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_org_scope ON approval (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_approval_row_version ON approval;
CREATE TRIGGER trg_approval_row_version BEFORE UPDATE ON approval FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- attachment
ALTER TABLE attachment
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_attachment_lineage ON attachment (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachment_org_scope ON attachment (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_attachment_row_version ON attachment;
CREATE TRIGGER trg_attachment_row_version BEFORE UPDATE ON attachment FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audit
ALTER TABLE audit
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_audit_lineage ON audit (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_org_scope ON audit (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audit_row_version ON audit;
CREATE TRIGGER trg_audit_row_version BEFORE UPDATE ON audit FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audit_program
ALTER TABLE audit_program
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_audit_program_lineage ON audit_program (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_program_org_scope ON audit_program (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audit_program_row_version ON audit_program;
CREATE TRIGGER trg_audit_program_row_version BEFORE UPDATE ON audit_program FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- audit_trail
ALTER TABLE audit_trail
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_audit_trail_lineage ON audit_trail (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_scope ON audit_trail (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_audit_trail_row_version ON audit_trail;
CREATE TRIGGER trg_audit_trail_row_version BEFORE UPDATE ON audit_trail FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bom
ALTER TABLE bom
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_bom_lineage ON bom (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bom_org_scope ON bom (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bom_row_version ON bom;
CREATE TRIGGER trg_bom_row_version BEFORE UPDATE ON bom FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bom_line
ALTER TABLE bom_line
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_bom_line_lineage ON bom_line (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bom_line_org_scope ON bom_line (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bom_line_row_version ON bom_line;
CREATE TRIGGER trg_bom_line_row_version BEFORE UPDATE ON bom_line FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bom_substitute
ALTER TABLE bom_substitute
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_bom_substitute_lineage ON bom_substitute (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bom_substitute_org_scope ON bom_substitute (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bom_substitute_row_version ON bom_substitute;
CREATE TRIGGER trg_bom_substitute_row_version BEFORE UPDATE ON bom_substitute FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- bom_version
ALTER TABLE bom_version
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_bom_version_lineage ON bom_version (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bom_version_org_scope ON bom_version (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_bom_version_row_version ON bom_version;
CREATE TRIGGER trg_bom_version_row_version BEFORE UPDATE ON bom_version FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- calendar
ALTER TABLE calendar
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_calendar_lineage ON calendar (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_org_scope ON calendar (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_calendar_row_version ON calendar;
CREATE TRIGGER trg_calendar_row_version BEFORE UPDATE ON calendar FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- capa
ALTER TABLE capa
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_capa_lineage ON capa (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capa_org_scope ON capa (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_capa_row_version ON capa;
CREATE TRIGGER trg_capa_row_version BEFORE UPDATE ON capa FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- capacity_snapshots
ALTER TABLE capacity_snapshots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_lineage ON capacity_snapshots (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_org_scope ON capacity_snapshots (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_capacity_snapshots_row_version ON capacity_snapshots;
CREATE TRIGGER trg_capacity_snapshots_row_version BEFORE UPDATE ON capacity_snapshots FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- change_control
ALTER TABLE change_control
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_change_control_lineage ON change_control (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_control_org_scope ON change_control (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_change_control_row_version ON change_control;
CREATE TRIGGER trg_change_control_row_version BEFORE UPDATE ON change_control FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- competency
ALTER TABLE competency
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_competency_lineage ON competency (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_competency_org_scope ON competency (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_competency_row_version ON competency;
CREATE TRIGGER trg_competency_row_version BEFORE UPDATE ON competency FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- complaint
ALTER TABLE complaint
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_complaint_lineage ON complaint (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complaint_org_scope ON complaint (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_complaint_row_version ON complaint;
CREATE TRIGGER trg_complaint_row_version BEFORE UPDATE ON complaint FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- cost_ledger
ALTER TABLE cost_ledger
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_cost_ledger_lineage ON cost_ledger (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_ledger_org_scope ON cost_ledger (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_cost_ledger_row_version ON cost_ledger;
CREATE TRIGGER trg_cost_ledger_row_version BEFORE UPDATE ON cost_ledger FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- data_archival_runs
ALTER TABLE data_archival_runs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_data_archival_runs_lineage ON data_archival_runs (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_archival_runs_org_scope ON data_archival_runs (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_data_archival_runs_row_version ON data_archival_runs;
CREATE TRIGGER trg_data_archival_runs_row_version BEFORE UPDATE ON data_archival_runs FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- demand
ALTER TABLE demand
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_demand_lineage ON demand (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demand_org_scope ON demand (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_demand_row_version ON demand;
CREATE TRIGGER trg_demand_row_version BEFORE UPDATE ON demand FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- deviation
ALTER TABLE deviation
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_deviation_lineage ON deviation (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deviation_org_scope ON deviation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_deviation_row_version ON deviation;
CREATE TRIGGER trg_deviation_row_version BEFORE UPDATE ON deviation FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- document
ALTER TABLE document
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_document_lineage ON document (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_org_scope ON document (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_document_row_version ON document;
CREATE TRIGGER trg_document_row_version BEFORE UPDATE ON document FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- document_revision
ALTER TABLE document_revision
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_document_revision_lineage ON document_revision (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_revision_org_scope ON document_revision (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_document_revision_row_version ON document_revision;
CREATE TRIGGER trg_document_revision_row_version BEFORE UPDATE ON document_revision FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- ehs_ppe_requirements
ALTER TABLE ehs_ppe_requirements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_ehs_ppe_requirements_lineage ON ehs_ppe_requirements (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_ppe_requirements_org_scope ON ehs_ppe_requirements (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_ehs_ppe_requirements_row_version ON ehs_ppe_requirements;
CREATE TRIGGER trg_ehs_ppe_requirements_row_version BEFORE UPDATE ON ehs_ppe_requirements FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- electronic_signature
ALTER TABLE electronic_signature
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_electronic_signature_lineage ON electronic_signature (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_electronic_signature_org_scope ON electronic_signature (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_electronic_signature_row_version ON electronic_signature;
CREATE TRIGGER trg_electronic_signature_row_version BEFORE UPDATE ON electronic_signature FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- electronic_signatures
ALTER TABLE electronic_signatures
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_lineage ON electronic_signatures (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_org_scope ON electronic_signatures (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_electronic_signatures_row_version ON electronic_signatures;
CREATE TRIGGER trg_electronic_signatures_row_version BEFORE UPDATE ON electronic_signatures FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_budget_lines
ALTER TABLE fin_budget_lines
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_fin_budget_lines_lineage ON fin_budget_lines (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_budget_lines_org_scope ON fin_budget_lines (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_budget_lines_row_version ON fin_budget_lines;
CREATE TRIGGER trg_fin_budget_lines_row_version BEFORE UPDATE ON fin_budget_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- fin_cost_versions
ALTER TABLE fin_cost_versions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_fin_cost_versions_lineage ON fin_cost_versions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_cost_versions_org_scope ON fin_cost_versions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_fin_cost_versions_row_version ON fin_cost_versions;
CREATE TRIGGER trg_fin_cost_versions_row_version BEFORE UPDATE ON fin_cost_versions FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- finding
ALTER TABLE finding
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_finding_lineage ON finding (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_org_scope ON finding (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_finding_row_version ON finding;
CREATE TRIGGER trg_finding_row_version BEFORE UPDATE ON finding FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- forecast
ALTER TABLE forecast
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_forecast_lineage ON forecast (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forecast_org_scope ON forecast (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_forecast_row_version ON forecast;
CREATE TRIGGER trg_forecast_row_version BEFORE UPDATE ON forecast FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- form_drafts
ALTER TABLE form_drafts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_form_drafts_lineage ON form_drafts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_drafts_org_scope ON form_drafts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_form_drafts_row_version ON form_drafts;
CREATE TRIGGER trg_form_drafts_row_version BEFORE UPDATE ON form_drafts FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- genealogy_link
ALTER TABLE genealogy_link
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_genealogy_link_lineage ON genealogy_link (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genealogy_link_org_scope ON genealogy_link (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_genealogy_link_row_version ON genealogy_link;
CREATE TRIGGER trg_genealogy_link_row_version BEFORE UPDATE ON genealogy_link FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inspection_characteristic
ALTER TABLE inspection_characteristic
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_inspection_characteristic_lineage ON inspection_characteristic (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_characteristic_org_scope ON inspection_characteristic (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inspection_characteristic_row_version ON inspection_characteristic;
CREATE TRIGGER trg_inspection_characteristic_row_version BEFORE UPDATE ON inspection_characteristic FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inspection_lot
ALTER TABLE inspection_lot
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_inspection_lot_lineage ON inspection_lot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_lot_org_scope ON inspection_lot (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inspection_lot_row_version ON inspection_lot;
CREATE TRIGGER trg_inspection_lot_row_version BEFORE UPDATE ON inspection_lot FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inspection_plan
ALTER TABLE inspection_plan
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_inspection_plan_lineage ON inspection_plan (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_plan_org_scope ON inspection_plan (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inspection_plan_row_version ON inspection_plan;
CREATE TRIGGER trg_inspection_plan_row_version BEFORE UPDATE ON inspection_plan FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- inspection_result
ALTER TABLE inspection_result
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_inspection_result_lineage ON inspection_result (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_result_org_scope ON inspection_result (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_inspection_result_row_version ON inspection_result;
CREATE TRIGGER trg_inspection_result_row_version BEFORE UPDATE ON inspection_result FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- integration_monitors
ALTER TABLE integration_monitors
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_integration_monitors_lineage ON integration_monitors (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_monitors_org_scope ON integration_monitors (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_integration_monitors_row_version ON integration_monitors;
CREATE TRIGGER trg_integration_monitors_row_version BEFORE UPDATE ON integration_monitors FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item
ALTER TABLE item
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_lineage ON item (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_org_scope ON item (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_row_version ON item;
CREATE TRIGGER trg_item_row_version BEFORE UPDATE ON item FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item_attr
ALTER TABLE item_attr
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_attr_lineage ON item_attr (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_attr_org_scope ON item_attr (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_attr_row_version ON item_attr;
CREATE TRIGGER trg_item_attr_row_version BEFORE UPDATE ON item_attr FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item_class
ALTER TABLE item_class
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_class_lineage ON item_class (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_class_org_scope ON item_class (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_class_row_version ON item_class;
CREATE TRIGGER trg_item_class_row_version BEFORE UPDATE ON item_class FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item_revision
ALTER TABLE item_revision
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_revision_lineage ON item_revision (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_revision_org_scope ON item_revision (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_revision_row_version ON item_revision;
CREATE TRIGGER trg_item_revision_row_version BEFORE UPDATE ON item_revision FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item_spec
ALTER TABLE item_spec
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_spec_lineage ON item_spec (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_spec_org_scope ON item_spec (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_spec_row_version ON item_spec;
CREATE TRIGGER trg_item_spec_row_version BEFORE UPDATE ON item_spec FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- item_variant
ALTER TABLE item_variant
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_item_variant_lineage ON item_variant (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_variant_org_scope ON item_variant (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_item_variant_row_version ON item_variant;
CREATE TRIGGER trg_item_variant_row_version BEFORE UPDATE ON item_variant FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- job_event
ALTER TABLE job_event
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_job_event_lineage ON job_event (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_event_org_scope ON job_event (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_job_event_row_version ON job_event;
CREATE TRIGGER trg_job_event_row_version BEFORE UPDATE ON job_event FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- labor_capture
ALTER TABLE labor_capture
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_labor_capture_lineage ON labor_capture (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_labor_capture_org_scope ON labor_capture (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_labor_capture_row_version ON labor_capture;
CREATE TRIGGER trg_labor_capture_row_version BEFORE UPDATE ON labor_capture FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lot
ALTER TABLE lot
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_lot_lineage ON lot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lot_org_scope ON lot (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lot_row_version ON lot;
CREATE TRIGGER trg_lot_row_version BEFORE UPDATE ON lot FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- lot_policy
ALTER TABLE lot_policy
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_lot_policy_lineage ON lot_policy (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lot_policy_org_scope ON lot_policy (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_lot_policy_row_version ON lot_policy;
CREATE TRIGGER trg_lot_policy_row_version BEFORE UPDATE ON lot_policy FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- master_data_store
ALTER TABLE master_data_store
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_master_data_store_lineage ON master_data_store (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_master_data_store_org_scope ON master_data_store (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_master_data_store_row_version ON master_data_store;
CREATE TRIGGER trg_master_data_store_row_version BEFORE UPDATE ON master_data_store FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- material_consumption
ALTER TABLE material_consumption
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_material_consumption_lineage ON material_consumption (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_consumption_org_scope ON material_consumption (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_material_consumption_row_version ON material_consumption;
CREATE TRIGGER trg_material_consumption_row_version BEFORE UPDATE ON material_consumption FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- material_cost_templates
ALTER TABLE material_cost_templates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_material_cost_templates_lineage ON material_cost_templates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_cost_templates_org_scope ON material_cost_templates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_material_cost_templates_row_version ON material_cost_templates;
CREATE TRIGGER trg_material_cost_templates_row_version BEFORE UPDATE ON material_cost_templates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_form_series
ALTER TABLE mdm_form_series
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mdm_form_series_lineage ON mdm_form_series (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_form_series_org_scope ON mdm_form_series (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_form_series_row_version ON mdm_form_series;
CREATE TRIGGER trg_mdm_form_series_row_version BEFORE UPDATE ON mdm_form_series FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_incoterms
ALTER TABLE mdm_incoterms
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mdm_incoterms_lineage ON mdm_incoterms (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_incoterms_org_scope ON mdm_incoterms (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_incoterms_row_version ON mdm_incoterms;
CREATE TRIGGER trg_mdm_incoterms_row_version BEFORE UPDATE ON mdm_incoterms FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_payment_terms
ALTER TABLE mdm_payment_terms
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mdm_payment_terms_lineage ON mdm_payment_terms (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_payment_terms_org_scope ON mdm_payment_terms (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_payment_terms_row_version ON mdm_payment_terms;
CREATE TRIGGER trg_mdm_payment_terms_row_version BEFORE UPDATE ON mdm_payment_terms FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_promise_policies
ALTER TABLE mdm_promise_policies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mdm_promise_policies_lineage ON mdm_promise_policies (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_promise_policies_org_scope ON mdm_promise_policies (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_promise_policies_row_version ON mdm_promise_policies;
CREATE TRIGGER trg_mdm_promise_policies_row_version BEFORE UPDATE ON mdm_promise_policies FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mdm_shipping_methods
ALTER TABLE mdm_shipping_methods
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mdm_shipping_methods_lineage ON mdm_shipping_methods (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdm_shipping_methods_org_scope ON mdm_shipping_methods (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mdm_shipping_methods_row_version ON mdm_shipping_methods;
CREATE TRIGGER trg_mdm_shipping_methods_row_version BEFORE UPDATE ON mdm_shipping_methods FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_cycle_events
ALTER TABLE mes_cycle_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_cycle_events_lineage ON mes_cycle_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_cycle_events_org_scope ON mes_cycle_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_cycle_events_row_version ON mes_cycle_events;
CREATE TRIGGER trg_mes_cycle_events_row_version BEFORE UPDATE ON mes_cycle_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_downtime_events
ALTER TABLE mes_downtime_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_downtime_events_lineage ON mes_downtime_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_downtime_events_org_scope ON mes_downtime_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_downtime_events_row_version ON mes_downtime_events;
CREATE TRIGGER trg_mes_downtime_events_row_version BEFORE UPDATE ON mes_downtime_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_energy_snapshots
ALTER TABLE mes_energy_snapshots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_energy_snapshots_lineage ON mes_energy_snapshots (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_energy_snapshots_org_scope ON mes_energy_snapshots (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_energy_snapshots_row_version ON mes_energy_snapshots;
CREATE TRIGGER trg_mes_energy_snapshots_row_version BEFORE UPDATE ON mes_energy_snapshots FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_fixture_assignments
ALTER TABLE mes_fixture_assignments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_fixture_assignments_lineage ON mes_fixture_assignments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_fixture_assignments_org_scope ON mes_fixture_assignments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_fixture_assignments_row_version ON mes_fixture_assignments;
CREATE TRIGGER trg_mes_fixture_assignments_row_version BEFORE UPDATE ON mes_fixture_assignments FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_machine_state_events
ALTER TABLE mes_machine_state_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_machine_state_events_lineage ON mes_machine_state_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_machine_state_events_org_scope ON mes_machine_state_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_machine_state_events_row_version ON mes_machine_state_events;
CREATE TRIGGER trg_mes_machine_state_events_row_version BEFORE UPDATE ON mes_machine_state_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_oee_loss_events
ALTER TABLE mes_oee_loss_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_oee_loss_events_lineage ON mes_oee_loss_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_oee_loss_events_org_scope ON mes_oee_loss_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_oee_loss_events_row_version ON mes_oee_loss_events;
CREATE TRIGGER trg_mes_oee_loss_events_row_version BEFORE UPDATE ON mes_oee_loss_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_program_events
ALTER TABLE mes_program_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_program_events_lineage ON mes_program_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_program_events_org_scope ON mes_program_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_program_events_row_version ON mes_program_events;
CREATE TRIGGER trg_mes_program_events_row_version BEFORE UPDATE ON mes_program_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mes_tool_life_events
ALTER TABLE mes_tool_life_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mes_tool_life_events_lineage ON mes_tool_life_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_tool_life_events_org_scope ON mes_tool_life_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mes_tool_life_events_row_version ON mes_tool_life_events;
CREATE TRIGGER trg_mes_tool_life_events_row_version BEFORE UPDATE ON mes_tool_life_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- mrp_signal
ALTER TABLE mrp_signal
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_mrp_signal_lineage ON mrp_signal (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mrp_signal_org_scope ON mrp_signal (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_mrp_signal_row_version ON mrp_signal;
CREATE TRIGGER trg_mrp_signal_row_version BEFORE UPDATE ON mrp_signal FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- nonconformance
ALTER TABLE nonconformance
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_nonconformance_lineage ON nonconformance (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nonconformance_org_scope ON nonconformance (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_nonconformance_row_version ON nonconformance;
CREATE TRIGGER trg_nonconformance_row_version BEFORE UPDATE ON nonconformance FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- operation
ALTER TABLE operation
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_operation_lineage ON operation (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operation_org_scope ON operation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_operation_row_version ON operation;
CREATE TRIGGER trg_operation_row_version BEFORE UPDATE ON operation FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- operation_material
ALTER TABLE operation_material
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_operation_material_lineage ON operation_material (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operation_material_org_scope ON operation_material (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_operation_material_row_version ON operation_material;
CREATE TRIGGER trg_operation_material_row_version BEFORE UPDATE ON operation_material FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- operation_output
ALTER TABLE operation_output
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_operation_output_lineage ON operation_output (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operation_output_org_scope ON operation_output (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_operation_output_row_version ON operation_output;
CREATE TRIGGER trg_operation_output_row_version BEFORE UPDATE ON operation_output FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- order_collaboration_events
ALTER TABLE order_collaboration_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_order_collaboration_events_lineage ON order_collaboration_events (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_collaboration_events_org_scope ON order_collaboration_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_order_collaboration_events_row_version ON order_collaboration_events;
CREATE TRIGGER trg_order_collaboration_events_row_version BEFORE UPDATE ON order_collaboration_events FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- party
ALTER TABLE party
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_party_lineage ON party (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_org_scope ON party (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_party_row_version ON party;
CREATE TRIGGER trg_party_row_version BEFORE UPDATE ON party FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- party_contact
ALTER TABLE party_contact
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_party_contact_lineage ON party_contact (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_contact_org_scope ON party_contact (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_party_contact_row_version ON party_contact;
CREATE TRIGGER trg_party_contact_row_version BEFORE UPDATE ON party_contact FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- party_role
ALTER TABLE party_role
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_party_role_lineage ON party_role (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_role_org_scope ON party_role (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_party_role_row_version ON party_role;
CREATE TRIGGER trg_party_role_row_version BEFORE UPDATE ON party_role FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- party_site
ALTER TABLE party_site
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_party_site_lineage ON party_site (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_site_org_scope ON party_site (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_party_site_row_version ON party_site;
CREATE TRIGGER trg_party_site_row_version BEFORE UPDATE ON party_site FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pause_resume
ALTER TABLE pause_resume
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_pause_resume_lineage ON pause_resume (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pause_resume_org_scope ON pause_resume (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pause_resume_row_version ON pause_resume;
CREATE TRIGGER trg_pause_resume_row_version BEFORE UPDATE ON pause_resume FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- pegging
ALTER TABLE pegging
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_pegging_lineage ON pegging (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pegging_org_scope ON pegging (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_pegging_row_version ON pegging;
CREATE TRIGGER trg_pegging_row_version BEFORE UPDATE ON pegging FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- planned_supply
ALTER TABLE planned_supply
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_planned_supply_lineage ON planned_supply (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_planned_supply_org_scope ON planned_supply (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_planned_supply_row_version ON planned_supply;
CREATE TRIGGER trg_planned_supply_row_version BEFORE UPDATE ON planned_supply FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- process_param_capture
ALTER TABLE process_param_capture
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_process_param_capture_lineage ON process_param_capture (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_process_param_capture_org_scope ON process_param_capture (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_process_param_capture_row_version ON process_param_capture;
CREATE TRIGGER trg_process_param_capture_row_version BEFORE UPDATE ON process_param_capture FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- production_completion
ALTER TABLE production_completion
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_production_completion_lineage ON production_completion (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_completion_org_scope ON production_completion (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_production_completion_row_version ON production_completion;
CREATE TRIGGER trg_production_completion_row_version BEFORE UPDATE ON production_completion FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- purchase_order
ALTER TABLE purchase_order
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_purchase_order_lineage ON purchase_order (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_scope ON purchase_order (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_purchase_order_row_version ON purchase_order;
CREATE TRIGGER trg_purchase_order_row_version BEFORE UPDATE ON purchase_order FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- purchase_order_line
ALTER TABLE purchase_order_line
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_lineage ON purchase_order_line (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_org_scope ON purchase_order_line (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_purchase_order_line_row_version ON purchase_order_line;
CREATE TRIGGER trg_purchase_order_line_row_version BEFORE UPDATE ON purchase_order_line FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- qual_certificate_templates
ALTER TABLE qual_certificate_templates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_qual_certificate_templates_lineage ON qual_certificate_templates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qual_certificate_templates_org_scope ON qual_certificate_templates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_qual_certificate_templates_row_version ON qual_certificate_templates;
CREATE TRIGGER trg_qual_certificate_templates_row_version BEFORE UPDATE ON qual_certificate_templates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- quality_case_link
ALTER TABLE quality_case_link
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_quality_case_link_lineage ON quality_case_link (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_case_link_org_scope ON quality_case_link (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_quality_case_link_row_version ON quality_case_link;
CREATE TRIGGER trg_quality_case_link_row_version BEFORE UPDATE ON quality_case_link FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- quality_order
ALTER TABLE quality_order
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_quality_order_lineage ON quality_order (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_order_org_scope ON quality_order (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_quality_order_row_version ON quality_order;
CREATE TRIGGER trg_quality_order_row_version BEFORE UPDATE ON quality_order FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- reason_code
ALTER TABLE reason_code
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_reason_code_lineage ON reason_code (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reason_code_org_scope ON reason_code (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_reason_code_row_version ON reason_code;
CREATE TRIGGER trg_reason_code_row_version BEFORE UPDATE ON reason_code FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- rework
ALTER TABLE rework
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_rework_lineage ON rework (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rework_org_scope ON rework (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_rework_row_version ON rework;
CREATE TRIGGER trg_rework_row_version BEFORE UPDATE ON rework FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sales_order
ALTER TABLE sales_order
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_sales_order_lineage ON sales_order (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_order_org_scope ON sales_order (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sales_order_row_version ON sales_order;
CREATE TRIGGER trg_sales_order_row_version BEFORE UPDATE ON sales_order FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- sales_order_line
ALTER TABLE sales_order_line
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_sales_order_line_lineage ON sales_order_line (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_order_line_org_scope ON sales_order_line (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_sales_order_line_row_version ON sales_order_line;
CREATE TRIGGER trg_sales_order_line_row_version BEFORE UPDATE ON sales_order_line FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- scrap
ALTER TABLE scrap
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_scrap_lineage ON scrap (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scrap_org_scope ON scrap (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_scrap_row_version ON scrap;
CREATE TRIGGER trg_scrap_row_version BEFORE UPDATE ON scrap FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- serial
ALTER TABLE serial
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_serial_lineage ON serial (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serial_org_scope ON serial (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_serial_row_version ON serial;
CREATE TRIGGER trg_serial_row_version BEFORE UPDATE ON serial FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- serial_policy
ALTER TABLE serial_policy
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_serial_policy_lineage ON serial_policy (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serial_policy_org_scope ON serial_policy (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_serial_policy_row_version ON serial_policy;
CREATE TRIGGER trg_serial_policy_row_version BEFORE UPDATE ON serial_policy FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shelf_life_policy
ALTER TABLE shelf_life_policy
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_shelf_life_policy_lineage ON shelf_life_policy (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shelf_life_policy_org_scope ON shelf_life_policy (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shelf_life_policy_row_version ON shelf_life_policy;
CREATE TRIGGER trg_shelf_life_policy_row_version BEFORE UPDATE ON shelf_life_policy FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- shift
ALTER TABLE shift
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_shift_lineage ON shift (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_org_scope ON shift (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_shift_row_version ON shift;
CREATE TRIGGER trg_shift_row_version BEFORE UPDATE ON shift FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- status_code
ALTER TABLE status_code
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_status_code_lineage ON status_code (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_status_code_org_scope ON status_code (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_status_code_row_version ON status_code;
CREATE TRIGGER trg_status_code_row_version BEFORE UPDATE ON status_code FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- supplier_quality_case
ALTER TABLE supplier_quality_case
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_supplier_quality_case_lineage ON supplier_quality_case (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_quality_case_org_scope ON supplier_quality_case (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_supplier_quality_case_row_version ON supplier_quality_case;
CREATE TRIGGER trg_supplier_quality_case_row_version BEFORE UPDATE ON supplier_quality_case FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- trace_label_templates
ALTER TABLE trace_label_templates
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_trace_label_templates_lineage ON trace_label_templates (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_label_templates_org_scope ON trace_label_templates (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_trace_label_templates_row_version ON trace_label_templates;
CREATE TRIGGER trg_trace_label_templates_row_version BEFORE UPDATE ON trace_label_templates FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- track_out
ALTER TABLE track_out
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_track_out_lineage ON track_out (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_out_org_scope ON track_out (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_track_out_row_version ON track_out;
CREATE TRIGGER trg_track_out_row_version BEFORE UPDATE ON track_out FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- training_matrix
ALTER TABLE training_matrix
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_training_matrix_lineage ON training_matrix (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_matrix_org_scope ON training_matrix (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_training_matrix_row_version ON training_matrix;
CREATE TRIGGER trg_training_matrix_row_version BEFORE UPDATE ON training_matrix FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- training_record
ALTER TABLE training_record
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_training_record_lineage ON training_record (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_record_org_scope ON training_record (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_training_record_row_version ON training_record;
CREATE TRIGGER trg_training_record_row_version BEFORE UPDATE ON training_record FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- uom
ALTER TABLE uom
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_uom_lineage ON uom (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uom_org_scope ON uom (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_uom_row_version ON uom;
CREATE TRIGGER trg_uom_row_version BEFORE UPDATE ON uom FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- wip_ledger
ALTER TABLE wip_ledger
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_wip_ledger_lineage ON wip_ledger (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wip_ledger_org_scope ON wip_ledger (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_wip_ledger_row_version ON wip_ledger;
CREATE TRIGGER trg_wip_ledger_row_version BEFORE UPDATE ON wip_ledger FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- work_definition_version
ALTER TABLE work_definition_version
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_work_definition_version_lineage ON work_definition_version (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_definition_version_org_scope ON work_definition_version (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_work_definition_version_row_version ON work_definition_version;
CREATE TRIGGER trg_work_definition_version_row_version BEFORE UPDATE ON work_definition_version FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- work_instruction
ALTER TABLE work_instruction
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_work_instruction_lineage ON work_instruction (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_instruction_org_scope ON work_instruction (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_work_instruction_row_version ON work_instruction;
CREATE TRIGGER trg_work_instruction_row_version BEFORE UPDATE ON work_instruction FOR EACH ROW EXECUTE FUNCTION set_row_version();

-- work_order
ALTER TABLE work_order
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_work_order_lineage ON work_order (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_order_org_scope ON work_order (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_work_order_row_version ON work_order;
CREATE TRIGGER trg_work_order_row_version BEFORE UPDATE ON work_order FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
