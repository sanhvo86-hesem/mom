-- ============================================================================
-- Migration: 042_fmea_apqp_control_plan_mobile.sql
-- Description: FMEA (AIAG/VDA 2019), APQP/PPAP (AS9145/AS13100),
--              Control Plans, Mobile Shop Floor
-- Dependencies: 011_quality.sql, 010_production.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE mobile_inspection_captures, mobile_time_entries,
--           mobile_work_queue, ppap_submissions, apqp_gate_reviews,
--           apqp_projects, control_plan_characteristics, control_plans,
--           fmea_revisions, fmea_actions, fmea_failure_modes,
--           fmea_records CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE fmea_type_enum AS ENUM (
        'design', 'process', 'system', 'msf', 'supplemental'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE fmea_status_enum AS ENUM (
        'draft', 'in_analysis', 'reviewed', 'approved', 'active', 'superseded'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE action_priority_enum AS ENUM (
        'high', 'medium', 'low'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE failure_effect_severity_enum AS ENUM (
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE control_plan_type_enum AS ENUM (
        'prototype', 'pre_launch', 'production'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE control_method_enum AS ENUM (
        'visual', 'gage', 'cmm', 'spc', 'attribute', 'functional_test',
        'ndt', 'destructive', 'automated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reaction_plan_type_enum AS ENUM (
        'stop_production', 'segregate', 'notify_supervisor', 'adjust_process',
        '100_percent_inspection', 'containment'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE apqp_phase_enum AS ENUM (
        'phase1_planning', 'phase2_product_design', 'phase3_process_design',
        'phase4_validation', 'phase5_production'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE apqp_gate_status_enum AS ENUM (
        'not_started', 'in_progress', 'pending_review', 'approved',
        'conditional', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ppap_element_status_enum AS ENUM (
        'not_required', 'pending', 'submitted', 'approved', 'rejected', 'interim'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ppap_submission_level_enum AS ENUM (
        'level1', 'level2', 'level3', 'level4', 'level5'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mobile_task_type_enum AS ENUM (
        'clock_in', 'clock_out', 'first_piece', 'in_process_inspection',
        'final_inspection', 'material_move', 'tool_request', 'ncr_report',
        'setup_complete', 'operation_complete'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mobile_task_status_enum AS ENUM (
        'pending', 'in_progress', 'completed', 'skipped', 'blocked'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FMEA SECTION
-- ============================================================================

-- ============================================================================
-- fmea_records / Ho so FMEA (Phan tich sai hong va tac dong)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fmea_records (
    fmea_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fmea_number             VARCHAR(50)     UNIQUE,
    fmea_type               fmea_type_enum  NOT NULL,
    status                  fmea_status_enum DEFAULT 'draft',
    title                   VARCHAR(500)    NOT NULL,
    title_vi                VARCHAR(500),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    process_name            VARCHAR(300),
    process_step            VARCHAR(200),
    team_lead               UUID            REFERENCES users(user_id),
    team_members            JSONB           DEFAULT '[]'::jsonb,
    scope                   TEXT,
    boundary_diagram_ref    VARCHAR(200),
    revision                INT             DEFAULT 1,
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    linked_control_plan_id  UUID,
    linked_npi_id           VARCHAR(50),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fmea_records IS 'FMEA header records (DFMEA/PFMEA per AIAG/VDA 2019) / Ho so FMEA (Phan tich sai hong va tac dong theo AIAG/VDA 2019)';

CREATE INDEX IF NOT EXISTS idx_fmea_records_type ON fmea_records (fmea_type);
CREATE INDEX IF NOT EXISTS idx_fmea_records_status ON fmea_records (status);
CREATE INDEX IF NOT EXISTS idx_fmea_records_item ON fmea_records (item_id);
CREATE INDEX IF NOT EXISTS idx_fmea_records_team_lead ON fmea_records (team_lead);
CREATE INDEX IF NOT EXISTS idx_fmea_records_npi ON fmea_records (linked_npi_id);

-- ============================================================================
-- fmea_failure_modes / Cac che do sai hong FMEA
-- ============================================================================
CREATE TABLE IF NOT EXISTS fmea_failure_modes (
    failure_mode_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fmea_id                 UUID            NOT NULL REFERENCES fmea_records(fmea_id) ON DELETE CASCADE,
    sequence                INT             NOT NULL,
    process_step            VARCHAR(200),
    process_function        VARCHAR(500),
    process_function_vi     VARCHAR(500),
    failure_mode            VARCHAR(500)    NOT NULL,
    failure_mode_vi         VARCHAR(500),
    failure_effect          VARCHAR(500),
    failure_effect_vi       VARCHAR(500),
    failure_cause           VARCHAR(500),
    failure_cause_vi        VARCHAR(500),
    severity                INT             NOT NULL CHECK (severity BETWEEN 1 AND 10),
    occurrence              INT             NOT NULL CHECK (occurrence BETWEEN 1 AND 10),
    detection               INT             NOT NULL CHECK (detection BETWEEN 1 AND 10),
    rpn                     INT             GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    action_priority         action_priority_enum,
    current_prevention_control TEXT,
    current_detection_control  TEXT,
    classification          VARCHAR(20),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fmea_failure_modes IS 'FMEA failure modes with S/O/D ratings and action priority / Cac che do sai hong FMEA voi danh gia S/O/D va muc uu tien hanh dong';

CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_fmea ON fmea_failure_modes (fmea_id);
CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_priority ON fmea_failure_modes (action_priority);
CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_severity ON fmea_failure_modes (severity);
CREATE INDEX IF NOT EXISTS idx_fmea_failure_modes_rpn ON fmea_failure_modes (rpn);

-- ============================================================================
-- fmea_actions / Hanh dong khac phuc FMEA
-- ============================================================================
CREATE TABLE IF NOT EXISTS fmea_actions (
    action_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    failure_mode_id         UUID            NOT NULL REFERENCES fmea_failure_modes(failure_mode_id) ON DELETE CASCADE,
    action_description      TEXT            NOT NULL,
    action_description_vi   TEXT,
    responsible_person      UUID            REFERENCES users(user_id),
    target_date             DATE,
    completion_date         DATE,
    status                  VARCHAR(30)     DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    new_severity            INT             CHECK (new_severity IS NULL OR new_severity BETWEEN 1 AND 10),
    new_occurrence          INT             CHECK (new_occurrence IS NULL OR new_occurrence BETWEEN 1 AND 10),
    new_detection           INT             CHECK (new_detection IS NULL OR new_detection BETWEEN 1 AND 10),
    new_rpn                 INT             GENERATED ALWAYS AS (
                                COALESCE(new_severity, 1) * COALESCE(new_occurrence, 1) * COALESCE(new_detection, 1)
                            ) STORED,
    new_action_priority     action_priority_enum,
    effectiveness_verified  BOOLEAN         DEFAULT FALSE,
    verified_by             UUID            REFERENCES users(user_id),
    verified_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fmea_actions IS 'Recommended/completed actions per FMEA failure mode (optimization step) / Hanh dong khac phuc theo tung che do sai hong FMEA (buoc toi uu hoa)';

CREATE INDEX IF NOT EXISTS idx_fmea_actions_fm ON fmea_actions (failure_mode_id);
CREATE INDEX IF NOT EXISTS idx_fmea_actions_status ON fmea_actions (status);
CREATE INDEX IF NOT EXISTS idx_fmea_actions_responsible ON fmea_actions (responsible_person);
CREATE INDEX IF NOT EXISTS idx_fmea_actions_target ON fmea_actions (target_date);

-- ============================================================================
-- fmea_revisions / Lich su phien ban FMEA
-- ============================================================================
CREATE TABLE IF NOT EXISTS fmea_revisions (
    revision_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fmea_id                 UUID            NOT NULL REFERENCES fmea_records(fmea_id) ON DELETE CASCADE,
    revision_number         INT             NOT NULL,
    changed_by              UUID            REFERENCES users(user_id),
    change_description      TEXT,
    snapshot                JSONB,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fmea_revisions IS 'FMEA revision history with full snapshots / Lich su phien ban FMEA voi ban chup du lieu day du';

CREATE INDEX IF NOT EXISTS idx_fmea_revisions_fmea ON fmea_revisions (fmea_id);
CREATE INDEX IF NOT EXISTS idx_fmea_revisions_number ON fmea_revisions (fmea_id, revision_number);

-- ============================================================================
-- CONTROL PLAN SECTION
-- ============================================================================

-- ============================================================================
-- control_plans / Ke hoach kiem soat
-- ============================================================================
CREATE TABLE IF NOT EXISTS control_plans (
    control_plan_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number             VARCHAR(50)     UNIQUE,
    plan_type               control_plan_type_enum DEFAULT 'production',
    title                   VARCHAR(500),
    title_vi                VARCHAR(500),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    revision                INT             DEFAULT 1,
    status                  VARCHAR(30)     DEFAULT 'draft',
    linked_fmea_id          UUID            REFERENCES fmea_records(fmea_id),
    linked_pfmea_number     VARCHAR(50),
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    effective_date          DATE,
    superseded_date         DATE,
    customer_approval_required BOOLEAN      DEFAULT FALSE,
    customer_approved       BOOLEAN         DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE control_plans IS 'Control Plan header (prototype/pre-launch/production) / Ke hoach kiem soat (mau thu/truoc san xuat/san xuat)';

CREATE INDEX IF NOT EXISTS idx_control_plans_item ON control_plans (item_id);
CREATE INDEX IF NOT EXISTS idx_control_plans_type ON control_plans (plan_type);
CREATE INDEX IF NOT EXISTS idx_control_plans_status ON control_plans (status);
CREATE INDEX IF NOT EXISTS idx_control_plans_fmea ON control_plans (linked_fmea_id);
CREATE INDEX IF NOT EXISTS idx_control_plans_effective ON control_plans (effective_date);

-- ============================================================================
-- control_plan_characteristics / Dac tinh ke hoach kiem soat
-- ============================================================================
CREATE TABLE IF NOT EXISTS control_plan_characteristics (
    characteristic_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_plan_id         UUID            NOT NULL REFERENCES control_plans(control_plan_id) ON DELETE CASCADE,
    sequence                INT             NOT NULL,
    process_step            VARCHAR(200),
    process_name            VARCHAR(300),
    machine_device          VARCHAR(200),
    characteristic_name     VARCHAR(300)    NOT NULL,
    characteristic_name_vi  VARCHAR(300),
    classification          VARCHAR(20),
    product_spec            VARCHAR(200),
    process_spec            VARCHAR(200),
    evaluation_method       control_method_enum,
    sample_size             VARCHAR(50),
    sample_frequency        VARCHAR(100),
    control_method          TEXT,
    reaction_plan           reaction_plan_type_enum,
    reaction_plan_detail    TEXT,
    responsible_role        VARCHAR(100),
    linked_failure_mode_id  UUID            REFERENCES fmea_failure_modes(failure_mode_id),
    linked_inspection_plan_id UUID          REFERENCES inspection_plans(plan_id),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE control_plan_characteristics IS 'Individual characteristics/steps within a control plan / Cac dac tinh/buoc rieng le trong ke hoach kiem soat';

CREATE INDEX IF NOT EXISTS idx_cp_chars_plan ON control_plan_characteristics (control_plan_id);
CREATE INDEX IF NOT EXISTS idx_cp_chars_classification ON control_plan_characteristics (classification);
CREATE INDEX IF NOT EXISTS idx_cp_chars_method ON control_plan_characteristics (evaluation_method);
CREATE INDEX IF NOT EXISTS idx_cp_chars_fm ON control_plan_characteristics (linked_failure_mode_id);

-- ============================================================================
-- APQP / PPAP SECTION
-- ============================================================================

-- ============================================================================
-- apqp_projects / Du an APQP (Ke hoach chat luong san pham tien trien)
-- ============================================================================
CREATE TABLE IF NOT EXISTS apqp_projects (
    apqp_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    apqp_number             VARCHAR(50)     UNIQUE,
    title                   VARCHAR(500),
    title_vi                VARCHAR(500),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    npi_id                  VARCHAR(50),
    current_phase           apqp_phase_enum DEFAULT 'phase1_planning',
    overall_status          apqp_gate_status_enum DEFAULT 'not_started',
    project_lead            UUID            REFERENCES users(user_id),
    team_members            JSONB           DEFAULT '[]'::jsonb,
    target_ppap_date        DATE,
    actual_ppap_date        DATE,
    ppap_submission_level   ppap_submission_level_enum DEFAULT 'level3',
    linked_fmea_id          UUID            REFERENCES fmea_records(fmea_id),
    linked_control_plan_id  UUID            REFERENCES control_plans(control_plan_id),
    linked_so_number        VARCHAR(50),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE apqp_projects IS 'APQP project master (AS9145 Advanced Product Quality Planning) / Du an APQP (Ke hoach chat luong san pham tien trien theo AS9145)';

CREATE INDEX IF NOT EXISTS idx_apqp_projects_item ON apqp_projects (item_id);
CREATE INDEX IF NOT EXISTS idx_apqp_projects_customer ON apqp_projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_apqp_projects_phase ON apqp_projects (current_phase);
CREATE INDEX IF NOT EXISTS idx_apqp_projects_status ON apqp_projects (overall_status);
CREATE INDEX IF NOT EXISTS idx_apqp_projects_lead ON apqp_projects (project_lead);
CREATE INDEX IF NOT EXISTS idx_apqp_projects_ppap_date ON apqp_projects (target_ppap_date);

-- ============================================================================
-- apqp_gate_reviews / Danh gia cong giai doan APQP
-- ============================================================================
CREATE TABLE IF NOT EXISTS apqp_gate_reviews (
    gate_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    apqp_id                 UUID            NOT NULL REFERENCES apqp_projects(apqp_id) ON DELETE CASCADE,
    phase                   apqp_phase_enum NOT NULL,
    gate_number             INT             NOT NULL CHECK (gate_number BETWEEN 1 AND 5),
    review_date             DATE,
    status                  apqp_gate_status_enum DEFAULT 'not_started',
    reviewers               JSONB           DEFAULT '[]'::jsonb,
    deliverables_status     JSONB           DEFAULT '{}'::jsonb,
    conditions              TEXT,
    action_items            JSONB           DEFAULT '[]'::jsonb,
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    meeting_minutes         TEXT,
    evidence_refs           JSONB           DEFAULT '[]'::jsonb,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (apqp_id, phase)
);
COMMENT ON TABLE apqp_gate_reviews IS 'APQP phase gate review records / Bien ban danh gia cong giai doan APQP';

CREATE INDEX IF NOT EXISTS idx_apqp_gates_project ON apqp_gate_reviews (apqp_id);
CREATE INDEX IF NOT EXISTS idx_apqp_gates_phase ON apqp_gate_reviews (phase);
CREATE INDEX IF NOT EXISTS idx_apqp_gates_status ON apqp_gate_reviews (status);
CREATE INDEX IF NOT EXISTS idx_apqp_gates_date ON apqp_gate_reviews (review_date);

-- ============================================================================
-- ppap_submissions / Ho so nop PPAP
-- ============================================================================
CREATE TABLE IF NOT EXISTS ppap_submissions (
    submission_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    apqp_id                 UUID            REFERENCES apqp_projects(apqp_id),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    submission_level        ppap_submission_level_enum,
    submission_date         DATE,
    overall_status          ppap_element_status_enum DEFAULT 'pending',
    customer_response       VARCHAR(30),
    customer_response_date  DATE,
    elements                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    psw_number              VARCHAR(50),
    psw_signed_by           VARCHAR(200),
    psw_signed_date         DATE,
    interim_approval_expiry DATE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ppap_submissions IS 'PPAP element tracking per submission (AS9145) / Theo doi thanh phan PPAP theo lan nop (AS9145)';

CREATE INDEX IF NOT EXISTS idx_ppap_submissions_apqp ON ppap_submissions (apqp_id);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_item ON ppap_submissions (item_id);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_customer ON ppap_submissions (customer_id);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_status ON ppap_submissions (overall_status);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_date ON ppap_submissions (submission_date);

-- ============================================================================
-- MOBILE SHOP FLOOR SECTION
-- ============================================================================

-- ============================================================================
-- mobile_work_queue / Hang doi cong viec di dong
-- ============================================================================
CREATE TABLE IF NOT EXISTS mobile_work_queue (
    queue_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id             VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    wo_number               VARCHAR(50),
    jo_number               VARCHAR(50),
    operation_seq           INT,
    task_type               mobile_task_type_enum NOT NULL,
    task_status             mobile_task_status_enum DEFAULT 'pending',
    priority                INT             DEFAULT 50,
    assigned_at             TIMESTAMPTZ     DEFAULT now(),
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    machine_id              VARCHAR(50),
    work_center_id          VARCHAR(30),
    estimated_minutes       NUMERIC(10,2),
    actual_minutes          NUMERIC(10,2),
    notes                   TEXT,
    offline_created         BOOLEAN         DEFAULT FALSE,
    sync_status             VARCHAR(20)     DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_sync', 'conflict')),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mobile_work_queue IS 'Operator mobile work queue (daily tasks) / Hang doi cong viec di dong cua cong nhan (nhiem vu hang ngay)';

CREATE INDEX IF NOT EXISTS idx_mobile_wq_operator ON mobile_work_queue (operator_id);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_status ON mobile_work_queue (task_status);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_type ON mobile_work_queue (task_type);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_wo ON mobile_work_queue (wo_number);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_machine ON mobile_work_queue (machine_id);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_sync ON mobile_work_queue (sync_status);
CREATE INDEX IF NOT EXISTS idx_mobile_wq_assigned ON mobile_work_queue (assigned_at);

-- ============================================================================
-- mobile_time_entries / Cham cong di dong
-- ============================================================================
CREATE TABLE IF NOT EXISTS mobile_time_entries (
    entry_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id             VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    wo_number               VARCHAR(50),
    jo_number               VARCHAR(50),
    operation_seq           INT,
    machine_id              VARCHAR(50),
    entry_type              VARCHAR(10)     NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out')),
    entry_time              TIMESTAMPTZ     NOT NULL,
    duration_minutes        NUMERIC(10,2),
    labor_type              VARCHAR(20)     DEFAULT 'run' CHECK (labor_type IN ('setup', 'run', 'rework', 'inspection', 'indirect', 'idle')),
    quantity_completed      INT,
    quantity_scrap          INT,
    offline_created         BOOLEAN         DEFAULT FALSE,
    sync_status             VARCHAR(20)     DEFAULT 'synced',
    device_id               VARCHAR(100),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mobile_time_entries IS 'Mobile time clock entries (clock-in/out per WO operation) / Cham cong di dong (vao/ra theo tung cong doan WO)';

CREATE INDEX IF NOT EXISTS idx_mobile_time_operator ON mobile_time_entries (operator_id);
CREATE INDEX IF NOT EXISTS idx_mobile_time_type ON mobile_time_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_mobile_time_wo ON mobile_time_entries (wo_number);
CREATE INDEX IF NOT EXISTS idx_mobile_time_machine ON mobile_time_entries (machine_id);
CREATE INDEX IF NOT EXISTS idx_mobile_time_sync ON mobile_time_entries (sync_status);
CREATE INDEX IF NOT EXISTS idx_mobile_time_entry ON mobile_time_entries (entry_time);

-- ============================================================================
-- mobile_inspection_captures / Thu thap kiem tra di dong
-- ============================================================================
CREATE TABLE IF NOT EXISTS mobile_inspection_captures (
    capture_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id             VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    wo_number               VARCHAR(50),
    jo_number               VARCHAR(50),
    operation_seq           INT,
    capture_type            VARCHAR(30)     NOT NULL CHECK (capture_type IN ('first_piece', 'in_process', 'final', 'receiving')),
    inspection_plan_id      UUID            REFERENCES inspection_plans(plan_id),
    measurements            JSONB           NOT NULL DEFAULT '[]'::jsonb,
    overall_result          VARCHAR(12)     CHECK (overall_result IN ('pass', 'fail', 'conditional')),
    photos                  JSONB           DEFAULT '[]'::jsonb,
    notes                   TEXT,
    inspector_id            VARCHAR(20),
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    linked_ncr_id           VARCHAR(50),
    offline_created         BOOLEAN         DEFAULT FALSE,
    sync_status             VARCHAR(20)     DEFAULT 'synced',
    device_id               VARCHAR(100),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mobile_inspection_captures IS 'First-piece and in-process inspection captures from tablet / Thu thap kiem tra dau tien va trong qua trinh tu may tinh bang';

CREATE INDEX IF NOT EXISTS idx_mobile_insp_operator ON mobile_inspection_captures (operator_id);
CREATE INDEX IF NOT EXISTS idx_mobile_insp_type ON mobile_inspection_captures (capture_type);
CREATE INDEX IF NOT EXISTS idx_mobile_insp_wo ON mobile_inspection_captures (wo_number);
CREATE INDEX IF NOT EXISTS idx_mobile_insp_result ON mobile_inspection_captures (overall_result);
CREATE INDEX IF NOT EXISTS idx_mobile_insp_plan ON mobile_inspection_captures (inspection_plan_id);
CREATE INDEX IF NOT EXISTS idx_mobile_insp_sync ON mobile_inspection_captures (sync_status);

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS fmea_failure_mode_id UUID REFERENCES fmea_failure_modes(failure_mode_id);
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS linked_control_plan_id UUID REFERENCES control_plans(control_plan_id);

CREATE INDEX IF NOT EXISTS idx_ncr_fmea_fm ON ncr_records (fmea_failure_mode_id);
CREATE INDEX IF NOT EXISTS idx_ncr_control_plan ON ncr_records (linked_control_plan_id);

-- ============================================================================
-- ADD DEFERRED FK (fmea_records -> control_plans, now that both exist)
-- ============================================================================

ALTER TABLE fmea_records
    ADD CONSTRAINT fk_fmea_control_plan
    FOREIGN KEY (linked_control_plan_id) REFERENCES control_plans(control_plan_id);

COMMIT;
