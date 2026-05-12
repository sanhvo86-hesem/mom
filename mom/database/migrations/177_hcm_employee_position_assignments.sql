-- ============================================================================
-- Migration: 177_hcm_employee_position_assignments.sql
-- Description: Multi-position HCM assignment bridge for user role/title linkage.
-- Dependencies: 049_hcm_workforce_management.sql, 070_enterprise_governance_uplift.sql
-- Rollback: DROP TABLE hcm_employee_position_assignments CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hcm_employee_position_assignments (
    hcm_assignment_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    hcm_position_id              UUID            NOT NULL REFERENCES hcm_positions(hcm_position_id) ON DELETE CASCADE,
    hcm_org_unit_id              UUID            NOT NULL REFERENCES hcm_org_units(hcm_org_unit_id),
    assignment_type              VARCHAR(30)     NOT NULL DEFAULT 'primary'
                                             CHECK (assignment_type IN ('primary', 'role', 'concurrent', 'acting', 'backup', 'temporary')),
    assignment_status            VARCHAR(20)     NOT NULL DEFAULT 'active'
                                             CHECK (assignment_status IN ('active', 'inactive', 'ended')),
    is_primary                   BOOLEAN         NOT NULL DEFAULT FALSE,
    fte_fraction                 NUMERIC(5,2)    NOT NULL DEFAULT 1.00 CHECK (fte_fraction > 0 AND fte_fraction <= 1.50),
    effective_from               DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to                 DATE,
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0',
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE hcm_employee_position_assignments IS 'Canonical HCM bridge for employees holding multiple positions or role-derived appointments.';
COMMENT ON COLUMN hcm_employee_position_assignments.assignment_type IS 'primary = core job title, role = permission/role-derived appointment, concurrent/acting/backup/temporary = secondary workforce appointment.';

CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_employee ON hcm_employee_position_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_position ON hcm_employee_position_assignments (hcm_position_id) WHERE assignment_status = 'active';
CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_unit ON hcm_employee_position_assignments (hcm_org_unit_id) WHERE assignment_status = 'active';
CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_status ON hcm_employee_position_assignments (assignment_status);
CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_lineage ON hcm_employee_position_assignments (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcm_emp_pos_assign_org_scope ON hcm_employee_position_assignments (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hcm_emp_pos_assign_active_source
    ON hcm_employee_position_assignments (employee_id, hcm_position_id, assignment_type, source_system, source_record_id)
    WHERE assignment_status = 'active';

DROP TRIGGER IF EXISTS trg_hcm_employee_position_assignments_row_version ON hcm_employee_position_assignments;
CREATE TRIGGER trg_hcm_employee_position_assignments_row_version
    BEFORE UPDATE ON hcm_employee_position_assignments
    FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
