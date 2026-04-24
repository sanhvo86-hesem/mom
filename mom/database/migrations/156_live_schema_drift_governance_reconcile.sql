BEGIN;

-- Migration 156: Live schema drift + governance metadata reconciliation
-- Purpose:
--   Align the migration authority with the live PostgreSQL contract currently
--   reported by Admin Metadata Studio, then close actionable direct-scope
--   governance metadata gaps for late EQMS, DCC, graphics and genealogy tables.

ALTER TABLE fmea_records
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE eqms_export_jobs
    ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

ALTER TABLE eqms_training_records
    ALTER COLUMN duration_hours TYPE NUMERIC(5,2) USING duration_hours::NUMERIC(5,2);

ALTER TABLE dcc_doc_type_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_change_notice
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_change_request
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_header
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_header_label
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_locale_variant
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_revision
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_document_revision_history
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE dcc_role_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_aml_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_attachments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_audit_findings
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_audits
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_calibration_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_capa_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_change_controls
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_comments
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_concession_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_controlled_copies
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_csat_surveys
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_deviations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_document_acknowledgements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_documents
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_engineering_changes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_export_jobs
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_fai_characteristics
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_fai_reports
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_field_actions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_lessons_learned
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_msa_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_quality_tower_snapshots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_record_links
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_risk_register
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_risks_controls
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_sampling_plans
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_signatures
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_spc_violation_acks
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_special_characteristics
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_supplier_qualification_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_training_curricula
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_training_matrix
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_training_records
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_validation_executions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_validation_projects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_validation_protocols
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_validation_requirements
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE eqms_warranty_claims
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_component_contract
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_contrast_check
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_module_binding
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_preview_scene
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_qa_gate_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_qa_gate_result
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_regulated_entity
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_rollout_scope
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_saved_experiment
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_simulation_run
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_template_zone_binding
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_theme_schedule
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_token_catalog
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_token_value
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_token_version
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE graphics_wcag_check
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

ALTER TABLE genealogy_threads
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';

COMMIT;
