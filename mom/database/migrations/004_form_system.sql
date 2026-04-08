-- Migration: 004_form_system.sql
-- Description: Form system tables - form_schemas, form_entries, form_attachments
-- Dependencies: 002_core_system.sql
-- Rollback: DROP TABLE form_attachments, form_entries, form_schemas CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- form_schemas / Dinh nghia bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_schemas (
    form_code       VARCHAR(20)     NOT NULL,  -- e.g., FRM-631
    version         INT             NOT NULL DEFAULT 1,
    title           VARCHAR(300)    NOT NULL,
    title_vi        VARCHAR(300),
    dept_code       dept_code       REFERENCES departments(dept_code),
    json_schema     JSONB           NOT NULL,      -- JSON Schema definition
    ui_schema       JSONB           DEFAULT '{}',  -- UI rendering hints
    delivery_mode   delivery_mode_enum NOT NULL DEFAULT 'online_form',
    form_pack       form_pack_enum,
    status          doc_status      NOT NULL DEFAULT 'draft',
    sha256          VARCHAR(64),
    decision_score  NUMERIC(5,2),
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (form_code, version)
);
COMMENT ON TABLE form_schemas IS 'Form schema definitions with JSON Schema. / Dinh nghia schema bieu mau voi JSON Schema.';

-- ---------------------------------------------------------------------------
-- form_entries / Du lieu bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_entries (
    entry_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_code       VARCHAR(20)     NOT NULL,
    form_version    INT             NOT NULL DEFAULT 1,
    data            JSONB           NOT NULL DEFAULT '{}',
    submitted_by    UUID            REFERENCES users(user_id),
    workflow_state  workflow_status  NOT NULL DEFAULT 'draft',
    approved_by     UUID            REFERENCES users(user_id),
    approved_date   TIMESTAMPTZ,
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    FOREIGN KEY (form_code, form_version) REFERENCES form_schemas(form_code, version)
);
COMMENT ON TABLE form_entries IS 'Form data submissions with workflow state. / Du lieu gui bieu mau voi trang thai quy trinh.';

-- ---------------------------------------------------------------------------
-- form_attachments / Tep dinh kem bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_attachments (
    attachment_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID            NOT NULL REFERENCES form_entries(entry_id) ON DELETE CASCADE,
    file_name       VARCHAR(500)    NOT NULL,
    file_path       TEXT            NOT NULL,
    file_hash       VARCHAR(128)    NOT NULL,  -- SHA-512
    file_size       BIGINT          NOT NULL,
    mime_type       VARCHAR(255),
    uploaded_by     UUID            REFERENCES users(user_id),
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE form_attachments IS 'File attachments for form entries. / Tep dinh kem cho du lieu bieu mau.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS form_attachments CASCADE;
-- DROP TABLE IF EXISTS form_entries CASCADE;
-- DROP TABLE IF EXISTS form_schemas CASCADE;
