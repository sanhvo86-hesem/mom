-- Migration: 005_record_management.sql
-- Description: Record management tables - record_counters, records, record_links
-- Dependencies: 002_core_system.sql
-- Rollback: DROP TABLE record_links, records, record_counters CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- record_counters / Bo dem ho so
-- ---------------------------------------------------------------------------
CREATE TABLE record_counters (
    record_type     record_type_enum NOT NULL,
    fiscal_year     INT              NOT NULL,
    last_number     INT              NOT NULL DEFAULT 0,
    counter_digits  SMALLINT         NOT NULL DEFAULT 3,
    PRIMARY KEY (record_type, fiscal_year)
);
COMMENT ON TABLE record_counters IS 'Auto-increment counters for record ID generation. / Bo dem tu dong cho tao ma ho so.';

-- ---------------------------------------------------------------------------
-- records / Ho so (generic record registry)
-- ---------------------------------------------------------------------------
CREATE TABLE records (
    record_id       VARCHAR(50)     PRIMARY KEY,  -- e.g., NCR-2026-001
    record_type     record_type_enum NOT NULL,
    dept_code       dept_code       NOT NULL REFERENCES departments(dept_code),
    status          record_status   NOT NULL DEFAULT 'open',
    title           VARCHAR(500),
    data            JSONB           NOT NULL DEFAULT '{}',
    created_by      UUID            REFERENCES users(user_id),
    assigned_to     UUID            REFERENCES users(user_id),
    due_date        DATE,
    closed_date     DATE,
    form_code       VARCHAR(20),
    source_record   VARCHAR(50),          -- parent record reference
    capa_link       VARCHAR(50),          -- linked CAPA record
    sharepoint_path TEXT,
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE records IS 'Universal record registry for all record types. / So dang ky ho so tong hop cho tat ca loai.';

-- ---------------------------------------------------------------------------
-- record_links / Lien ket ho so
-- ---------------------------------------------------------------------------
CREATE TABLE record_links (
    link_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_record_id VARCHAR(50)    NOT NULL REFERENCES records(record_id),
    child_record_id  VARCHAR(50)    NOT NULL REFERENCES records(record_id),
    link_type       VARCHAR(50)     NOT NULL DEFAULT 'related',
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CHECK (parent_record_id <> child_record_id),
    UNIQUE (parent_record_id, child_record_id, link_type)
);
COMMENT ON TABLE record_links IS 'Links between records (NCR->CAPA, AUD->NCR, etc.). / Lien ket giua cac ho so.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS record_links CASCADE;
-- DROP TABLE IF EXISTS records CASCADE;
-- DROP TABLE IF EXISTS record_counters CASCADE;
