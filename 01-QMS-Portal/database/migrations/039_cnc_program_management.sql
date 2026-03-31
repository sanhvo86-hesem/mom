-- ============================================================================
-- Migration: 039_cnc_program_management.sql
-- Description: CNC program management - programs, versions, approvals,
--              setup sheets
-- Dependencies: 006_erp_master_data.sql, 012_calibration_equipment.sql
-- Rollback: DROP TABLE setup_sheet_items, setup_sheets,
--           cnc_program_approvals, cnc_program_versions,
--           cnc_programs CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE cnc_program_status_enum AS ENUM (
        'draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE cnc_program_type_enum AS ENUM (
        'main', 'sub', 'probe', 'tool_path', 'post_processed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE cnc_approval_result_enum AS ENUM (
        'pending', 'approved', 'approved_with_conditions', 'rejected', 'recalled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE setup_sheet_status_enum AS ENUM (
        'draft', 'approved', 'released', 'superseded'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- cnc_programs / Chuong trinh CNC
-- ============================================================================
CREATE TABLE IF NOT EXISTS cnc_programs (
    program_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_number          VARCHAR(50)     UNIQUE,
    program_name            VARCHAR(300),
    program_type            cnc_program_type_enum DEFAULT 'main',
    status                  cnc_program_status_enum DEFAULT 'draft',
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    operation_seq           INT,
    machine_type            VARCHAR(100),
    machine_id              VARCHAR(50),
    controller_type         VARCHAR(100),
    cam_software            VARCHAR(100),
    cam_version             VARCHAR(50),
    current_version         INT             DEFAULT 1,
    file_path               VARCHAR(1000),
    file_hash_sha256        VARCHAR(64),
    cycle_time_minutes      NUMERIC(10,2),
    description             TEXT,
    notes                   TEXT,
    created_by              UUID            REFERENCES users(user_id),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE cnc_programs IS 'CNC program master records / Ban ghi chinh chuong trinh CNC';

CREATE INDEX IF NOT EXISTS idx_cnc_programs_number ON cnc_programs (program_number);
CREATE INDEX IF NOT EXISTS idx_cnc_programs_status ON cnc_programs (status);
CREATE INDEX IF NOT EXISTS idx_cnc_programs_item ON cnc_programs (item_id);
CREATE INDEX IF NOT EXISTS idx_cnc_programs_machine ON cnc_programs (machine_id);
CREATE INDEX IF NOT EXISTS idx_cnc_programs_type ON cnc_programs (program_type);

-- ============================================================================
-- cnc_program_versions / Phien ban chuong trinh CNC
-- ============================================================================
CREATE TABLE IF NOT EXISTS cnc_program_versions (
    version_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id              UUID            NOT NULL REFERENCES cnc_programs(program_id) ON DELETE CASCADE,
    version_number          INT             NOT NULL,
    file_path               VARCHAR(1000),
    file_hash_sha256        VARCHAR(64)     NOT NULL,
    file_size_bytes         BIGINT,
    cycle_time_minutes      NUMERIC(10,2),
    change_description      TEXT,
    change_reason           TEXT,
    created_by              UUID            REFERENCES users(user_id),
    validated_by            UUID            REFERENCES users(user_id),
    validated_at            TIMESTAMPTZ,
    first_piece_result      VARCHAR(30),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (program_id, version_number)
);
COMMENT ON TABLE cnc_program_versions IS 'CNC program version history / Lich su phien ban chuong trinh CNC';

CREATE INDEX IF NOT EXISTS idx_cnc_versions_program ON cnc_program_versions (program_id);
CREATE INDEX IF NOT EXISTS idx_cnc_versions_hash ON cnc_program_versions (file_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_cnc_versions_created ON cnc_program_versions (created_at);

-- ============================================================================
-- cnc_program_approvals / Phe duyet chuong trinh CNC
-- ============================================================================
CREATE TABLE IF NOT EXISTS cnc_program_approvals (
    approval_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id              UUID            NOT NULL REFERENCES cnc_programs(program_id),
    version_number          INT,
    approval_type           VARCHAR(30)     DEFAULT 'release',
    result                  cnc_approval_result_enum DEFAULT 'pending',
    reviewer_id             UUID            REFERENCES users(user_id),
    reviewed_at             TIMESTAMPTZ,
    conditions              TEXT,
    comments                TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE cnc_program_approvals IS 'CNC program approval workflow / Quy trinh phe duyet chuong trinh CNC';

CREATE INDEX IF NOT EXISTS idx_cnc_approvals_program ON cnc_program_approvals (program_id);
CREATE INDEX IF NOT EXISTS idx_cnc_approvals_result ON cnc_program_approvals (result);
CREATE INDEX IF NOT EXISTS idx_cnc_approvals_reviewer ON cnc_program_approvals (reviewer_id);

-- ============================================================================
-- setup_sheets / Phieu thiet lap may
-- ============================================================================
CREATE TABLE IF NOT EXISTS setup_sheets (
    setup_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    setup_number            VARCHAR(50)     UNIQUE,
    program_id              UUID            REFERENCES cnc_programs(program_id),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    operation_seq           INT,
    machine_id              VARCHAR(50),
    status                  setup_sheet_status_enum DEFAULT 'draft',
    version                 INT             DEFAULT 1,
    title                   VARCHAR(300),
    description             TEXT,
    photos                  JSONB           DEFAULT '[]'::jsonb,
    created_by              UUID            REFERENCES users(user_id),
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE setup_sheets IS 'Machine setup documentation / Tai lieu thiet lap may';

CREATE INDEX IF NOT EXISTS idx_setup_sheets_number ON setup_sheets (setup_number);
CREATE INDEX IF NOT EXISTS idx_setup_sheets_program ON setup_sheets (program_id);
CREATE INDEX IF NOT EXISTS idx_setup_sheets_item ON setup_sheets (item_id);
CREATE INDEX IF NOT EXISTS idx_setup_sheets_status ON setup_sheets (status);
CREATE INDEX IF NOT EXISTS idx_setup_sheets_machine ON setup_sheets (machine_id);

-- ============================================================================
-- setup_sheet_items / Chi tiet phieu thiet lap may
-- ============================================================================
CREATE TABLE IF NOT EXISTS setup_sheet_items (
    item_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    setup_id                UUID            NOT NULL REFERENCES setup_sheets(setup_id) ON DELETE CASCADE,
    item_type               VARCHAR(30)     NOT NULL,
    sequence                INT,
    description             TEXT,
    specification           TEXT,
    photo_url               VARCHAR(500),
    tool_id                 VARCHAR(50),
    fixture_id              VARCHAR(50),
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE setup_sheet_items IS 'Setup sheet detail items (tool, fixture, gage, instruction, safety) / Chi tiet phieu thiet lap (dao, do ga, duong kinh, huong dan, an toan)';

CREATE INDEX IF NOT EXISTS idx_setup_sheet_items_setup ON setup_sheet_items (setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_sheet_items_type ON setup_sheet_items (item_type);
CREATE INDEX IF NOT EXISTS idx_setup_sheet_items_seq ON setup_sheet_items (sequence);

COMMIT;
