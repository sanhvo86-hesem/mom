-- ============================================================================
-- Migration: 063_manufacturing_engineering_industrialization.sql
-- Description: Manufacturing engineering, standard work, and industrialization.
-- Dependencies: 006_erp_master_data.sql, 039_cnc_program_management.sql
-- Rollback: DROP TABLE eng_resource_group_members, eng_resource_groups,
--           eng_tooling_requirements, eng_process_validation,
--           eng_work_instruction_steps, eng_work_instructions,
--           eng_changeover_standards, eng_factory_calendar_days,
--           eng_factory_calendars, eng_capacity_models,
--           eng_line_balancing_studies, eng_time_standards,
--           eng_standard_operations, eng_process_families CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eng_process_families (
    eng_process_family_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_code                  VARCHAR(50)     NOT NULL UNIQUE,
    family_name                  VARCHAR(200)    NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_standard_operations (
    eng_standard_operation_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_code               VARCHAR(50)     NOT NULL UNIQUE,
    eng_process_family_id        UUID            REFERENCES eng_process_families(eng_process_family_id),
    operation_name               VARCHAR(200)    NOT NULL,
    default_work_center_id       VARCHAR(30)     REFERENCES work_centers(work_center_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_time_standards (
    eng_time_standard_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_standard_operation_id    UUID            REFERENCES eng_standard_operations(eng_standard_operation_id),
    standard_type                VARCHAR(20)     NOT NULL
                                 CHECK (standard_type IN ('setup', 'run', 'queue', 'move')),
    standard_minutes             NUMERIC(12,2)   NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_line_balancing_studies (
    eng_line_balancing_study_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_number                 VARCHAR(80)     NOT NULL UNIQUE,
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    study_date                   DATE,
    takt_time_minutes            NUMERIC(12,2),
    balance_efficiency_pct       NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_capacity_models (
    eng_capacity_model_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_code                   VARCHAR(80)     NOT NULL UNIQUE,
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    constraint_description       TEXT,
    available_hours_per_day      NUMERIC(12,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_factory_calendars (
    eng_factory_calendar_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_code                VARCHAR(50)     NOT NULL UNIQUE,
    calendar_name                VARCHAR(200)    NOT NULL,
    plant_code                   VARCHAR(30),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_factory_calendar_days (
    eng_factory_calendar_day_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_factory_calendar_id      UUID            NOT NULL REFERENCES eng_factory_calendars(eng_factory_calendar_id) ON DELETE CASCADE,
    calendar_date                DATE            NOT NULL,
    is_working_day               BOOLEAN         NOT NULL DEFAULT TRUE,
    available_minutes            NUMERIC(12,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (eng_factory_calendar_id, calendar_date)
);

CREATE TABLE IF NOT EXISTS eng_changeover_standards (
    eng_changeover_standard_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_family_code             VARCHAR(50),
    to_family_code               VARCHAR(50),
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    standard_minutes             NUMERIC(12,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_work_instructions (
    eng_work_instruction_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    instruction_code             VARCHAR(80)     NOT NULL UNIQUE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    routing_id                   VARCHAR(50),
    revision_code                VARCHAR(20),
    document_id                  VARCHAR(30)     REFERENCES documents(doc_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_work_instruction_steps (
    eng_work_instruction_step_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_work_instruction_id      UUID            NOT NULL REFERENCES eng_work_instructions(eng_work_instruction_id) ON DELETE CASCADE,
    step_number                  INT             NOT NULL,
    step_title                   VARCHAR(200),
    step_text                    TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (eng_work_instruction_id, step_number)
);

CREATE TABLE IF NOT EXISTS eng_process_validation (
    eng_process_validation_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_number            VARCHAR(80)     NOT NULL UNIQUE,
    process_code                 VARCHAR(80),
    validation_date              DATE,
    validation_result            VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                 CHECK (validation_result IN ('pending', 'approved', 'rejected')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_tooling_requirements (
    eng_tooling_requirement_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    operation_seq                INT,
    tool_id                      VARCHAR(50)     REFERENCES tools(tool_id),
    fixture_id                   UUID            REFERENCES fixture_master(fixture_id),
    quantity_required            NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_resource_groups (
    eng_resource_group_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_group_code          VARCHAR(50)     NOT NULL UNIQUE,
    resource_group_name          VARCHAR(200)    NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eng_resource_group_members (
    eng_resource_group_member_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_resource_group_id        UUID            NOT NULL REFERENCES eng_resource_groups(eng_resource_group_id) ON DELETE CASCADE,
    member_type                  VARCHAR(20)     NOT NULL
                                 CHECK (member_type IN ('machine', 'employee', 'tool')),
    member_reference             VARCHAR(80)     NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (eng_resource_group_id, member_type, member_reference)
);

COMMIT;
