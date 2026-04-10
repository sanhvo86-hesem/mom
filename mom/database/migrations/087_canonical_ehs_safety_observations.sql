-- ============================================================================
-- Migration: 087_canonical_ehs_safety_observations.sql
-- Description: Canonical safety-observation lifecycle and closure actions.
-- Dependencies: 011_quality.sql, 013_training_hr.sql, 070_enterprise_governance_uplift.sql
-- Rollback: DROP TABLE safety_observation_actions, safety_observations CASCADE;
-- Standards: EHS reporting, good-catch capture, corrective follow-up, closure audit
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS safety_observations (
    safety_observation_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    observation_number          VARCHAR(80)     NOT NULL UNIQUE,
    observation_status          VARCHAR(20)     NOT NULL DEFAULT 'logged'
                                 CHECK (observation_status IN ('logged', 'assigned', 'in_progress', 'closed', 'archived')),
    employee_id                 VARCHAR(20)     REFERENCES employees(employee_id),
    incident_id                 UUID            REFERENCES ehs_incidents(incident_id),
    observation_category        VARCHAR(30)     NOT NULL
                                 CHECK (observation_category IN ('unsafe_act', 'unsafe_condition', 'good_catch', 'five_s', 'ppe', 'ergonomics', 'environment')),
    severity_code               VARCHAR(20)     NOT NULL DEFAULT 'medium'
                                 CHECK (severity_code IN ('low', 'medium', 'high', 'critical')),
    observation_summary         TEXT            NOT NULL,
    immediate_containment       TEXT,
    assigned_to_employee_id     VARCHAR(20)     REFERENCES employees(employee_id),
    observed_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    due_date                    DATE,
    closed_at                   TIMESTAMPTZ,
    closure_notes               TEXT,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code            VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code       VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                 VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system               VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id            VARCHAR(120),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version      VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
COMMENT ON TABLE safety_observations IS 'Canonical safety observation and good-catch object with assignment, due-date, and closure control.';
CREATE INDEX IF NOT EXISTS idx_safety_observations_status ON safety_observations (observation_status);
CREATE INDEX IF NOT EXISTS idx_safety_observations_incident ON safety_observations (incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_observations_scope ON safety_observations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_safety_observations_lineage ON safety_observations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_safety_observations_row_version ON safety_observations;
CREATE TRIGGER trg_safety_observations_row_version BEFORE UPDATE ON safety_observations FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS safety_observation_actions (
    safety_observation_action_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    safety_observation_id       UUID            NOT NULL REFERENCES safety_observations(safety_observation_id) ON DELETE CASCADE,
    line_number                 INT             NOT NULL,
    action_summary              VARCHAR(300)    NOT NULL,
    action_owner_employee_id    VARCHAR(20)     REFERENCES employees(employee_id),
    due_date                    DATE,
    completed_at                TIMESTAMPTZ,
    verification_notes          TEXT,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (safety_observation_id, line_number)
);
COMMENT ON TABLE safety_observation_actions IS 'Child corrective and preventive actions linked to a safety observation.';
DROP TRIGGER IF EXISTS trg_safety_observation_actions_row_version ON safety_observation_actions;
CREATE TRIGGER trg_safety_observation_actions_row_version BEFORE UPDATE ON safety_observation_actions FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
