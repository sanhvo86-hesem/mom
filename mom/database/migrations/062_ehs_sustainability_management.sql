-- ============================================================================
-- Migration: 062_ehs_sustainability_management.sql
-- Description: EHS, hazardous material, waste, emissions, and ESG expansion.
-- Dependencies: 011_quality.sql, 013_training_hr.sql
-- Rollback: DROP TABLE ehs_contractors, ehs_regulatory_submissions,
--           ehs_sustainability_projects, ehs_energy_targets,
--           ehs_emissions_monitoring, ehs_waste_shipments,
--           ehs_waste_streams, ehs_corrective_actions,
--           ehs_emergency_drills, ehs_training_matrix,
--           ehs_ppe_issue_logs, ehs_ppe_requirements,
--           ehs_exposure_assessments, ehs_material_safety_data,
--           ehs_hazardous_materials, ehs_permit_register CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ehs_permit_register (
    ehs_permit_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_number                VARCHAR(80)     NOT NULL UNIQUE,
    permit_type                  VARCHAR(30)     NOT NULL
                                 CHECK (permit_type IN ('environmental', 'fire', 'chemical', 'waste')),
    issuing_authority            VARCHAR(200),
    issue_date                   DATE,
    expiry_date                  DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'expired', 'suspended')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_hazardous_materials (
    ehs_hazardous_material_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_code                VARCHAR(80)     NOT NULL UNIQUE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    material_name                VARCHAR(200)    NOT NULL,
    hazard_class                 VARCHAR(50),
    storage_requirement          VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_material_safety_data (
    ehs_material_safety_data_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ehs_hazardous_material_id    UUID            NOT NULL REFERENCES ehs_hazardous_materials(ehs_hazardous_material_id) ON DELETE CASCADE,
    revision_code                VARCHAR(20)     NOT NULL,
    supplier_name                VARCHAR(200),
    issue_date                   DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (ehs_hazardous_material_id, revision_code)
);

CREATE TABLE IF NOT EXISTS ehs_exposure_assessments (
    ehs_exposure_assessment_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_code                    VARCHAR(80),
    substance_code               VARCHAR(80),
    assessment_date              DATE            NOT NULL,
    assessed_by                  UUID            REFERENCES users(user_id),
    exposure_level               NUMERIC(12,4),
    unit_of_measure              VARCHAR(20),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_ppe_requirements (
    ehs_ppe_requirement_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_code                    VARCHAR(80),
    process_code                 VARCHAR(80),
    ppe_type                     VARCHAR(80)     NOT NULL,
    mandatory_flag               BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_ppe_issue_logs (
    ehs_ppe_issue_log_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     REFERENCES employees(employee_id),
    ppe_type                     VARCHAR(80)     NOT NULL,
    issue_date                   DATE            NOT NULL,
    return_date                  DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_training_matrix (
    ehs_training_matrix_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code                    VARCHAR(50),
    training_topic               VARCHAR(200)    NOT NULL,
    recurrence_months            INT,
    mandatory_flag               BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_emergency_drills (
    ehs_emergency_drill_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_number                 VARCHAR(80)     NOT NULL UNIQUE,
    drill_type                   VARCHAR(30)     NOT NULL
                                 CHECK (drill_type IN ('fire', 'chemical_spill', 'earthquake', 'evacuation')),
    drill_date                   DATE            NOT NULL,
    coordinator_id               UUID            REFERENCES users(user_id),
    score_result                 NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_corrective_actions (
    ehs_corrective_action_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    related_incident_id          UUID            REFERENCES ehs_incidents(incident_id),
    action_owner_id              UUID            REFERENCES users(user_id),
    action_summary               VARCHAR(300)    NOT NULL,
    due_date                     DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'completed', 'overdue')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_waste_streams (
    ehs_waste_stream_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    waste_code                   VARCHAR(80)     NOT NULL UNIQUE,
    waste_name                   VARCHAR(200)    NOT NULL,
    hazardous_flag               BOOLEAN         NOT NULL DEFAULT FALSE,
    disposal_method              VARCHAR(100),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_waste_shipments (
    ehs_waste_shipment_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ehs_waste_stream_id          UUID            NOT NULL REFERENCES ehs_waste_streams(ehs_waste_stream_id) ON DELETE CASCADE,
    shipment_date                DATE            NOT NULL,
    quantity                     NUMERIC(14,2),
    disposal_vendor              VARCHAR(200),
    manifest_number              VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_emissions_monitoring (
    ehs_emissions_monitoring_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_code                  VARCHAR(80),
    reading_date                 DATE            NOT NULL,
    emission_type                VARCHAR(50),
    emission_value               NUMERIC(14,4),
    unit_of_measure              VARCHAR(20),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_energy_targets (
    ehs_energy_target_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_year                  INT             NOT NULL,
    target_scope                 VARCHAR(50),
    target_kwh                   NUMERIC(14,2),
    target_co2e                  NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (target_year, target_scope)
);

CREATE TABLE IF NOT EXISTS ehs_sustainability_projects (
    ehs_sustainability_project_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code                 VARCHAR(80)     NOT NULL UNIQUE,
    project_name                 VARCHAR(200)    NOT NULL,
    focus_area                   VARCHAR(50),
    target_saving_amount         NUMERIC(14,2),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_regulatory_submissions (
    ehs_regulatory_submission_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_number            VARCHAR(80)     NOT NULL UNIQUE,
    authority_name               VARCHAR(200),
    submission_type              VARCHAR(50),
    submission_date              DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehs_contractors (
    ehs_contractor_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_code              VARCHAR(80)     NOT NULL UNIQUE,
    contractor_name              VARCHAR(200)    NOT NULL,
    trade_type                   VARCHAR(100),
    approved_flag                BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
