-- Migration: 019_system_tables.sql
-- Description: System tables - variable_registry, naming_patterns, notifications, file_attachments, tags, comments, workflow_definitions, workflow_instances
-- Dependencies: 002_core_system.sql
-- Rollback: DROP TABLE workflow_instances, workflow_definitions, comments, tags, file_attachments, notifications, naming_patterns, variable_registry CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- variable_registry / Dang ky bien
-- ---------------------------------------------------------------------------
CREATE TABLE variable_registry (
    variable_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    category        VARCHAR(100)    NOT NULL,
    key             VARCHAR(100)    NOT NULL,
    label           VARCHAR(300)    NOT NULL,
    label_vi        VARCHAR(300),
    data_type       VARCHAR(30)     NOT NULL,
    enum_values     JSONB,
    validation      TEXT,
    format          VARCHAR(100),
    example         TEXT,
    required        BOOLEAN         NOT NULL DEFAULT FALSE,
    source          VARCHAR(50),
    used_in         TEXT[],
    description     TEXT,
    UNIQUE (category, key)
);
COMMENT ON TABLE variable_registry IS 'Mirror of variable_library.json for DB-level validation. / Ban sao variable_library.json cho xac thuc DB.';

-- ---------------------------------------------------------------------------
-- naming_patterns / Quy tac dat ten (17 vars from naming_pattern)
-- ---------------------------------------------------------------------------
CREATE TABLE naming_patterns (
    pattern_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name    VARCHAR(10)     NOT NULL,      -- P1, P2, P3, P4, P5, P6
    description     TEXT            NOT NULL,
    template        TEXT            NOT NULL,
    example         TEXT,
    scope           VARCHAR(100),
    applicable_to   TEXT[],
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (pattern_name)
);
COMMENT ON TABLE naming_patterns IS 'P1-P6 naming rules from naming standard. / Quy tac dat ten P1-P6.';

-- ---------------------------------------------------------------------------
-- notifications / Thong bao
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(300)    NOT NULL,
    body            TEXT,
    link            TEXT,
    category        VARCHAR(50),       -- approval, overdue, alert, info
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    read_at         TIMESTAMPTZ
);
COMMENT ON TABLE notifications IS 'User notifications. / Thong bao nguoi dung.';

-- ---------------------------------------------------------------------------
-- file_attachments / Tep dinh kem chung
-- ---------------------------------------------------------------------------
CREATE TABLE file_attachments (
    file_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,      -- record, document, equipment, etc.
    entity_id       TEXT            NOT NULL,
    file_name       VARCHAR(500)    NOT NULL,
    file_path       TEXT            NOT NULL,
    file_hash       VARCHAR(128)    NOT NULL,      -- SHA-256
    file_size       BIGINT          NOT NULL,
    mime_type       VARCHAR(255),
    uploaded_by     UUID            REFERENCES users(user_id),
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE file_attachments IS 'Generic file storage with SHA-256 hash. / Luu tru tep chung voi SHA-256.';

-- ---------------------------------------------------------------------------
-- tags / Nhan (polymorphic)
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
    tag_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    tag_name        VARCHAR(100)    NOT NULL,
    created_by      UUID            REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id, tag_name)
);
COMMENT ON TABLE tags IS 'Polymorphic tagging system. / He thong gan nhan da hinh.';

-- ---------------------------------------------------------------------------
-- comments / Binh luan (polymorphic)
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
    comment_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    parent_id       UUID            REFERENCES comments(comment_id),
    body            TEXT            NOT NULL,
    author_id       UUID            NOT NULL REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE comments IS 'Polymorphic comments on any record. / Binh luan da hinh tren bat ky ho so nao.';

-- ---------------------------------------------------------------------------
-- workflow_definitions / Dinh nghia quy trinh
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_definitions (
    workflow_def_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_name   VARCHAR(200)    NOT NULL UNIQUE,
    description     TEXT,
    states          JSONB           NOT NULL,   -- array of state objects
    transitions     JSONB           NOT NULL,   -- array of transition objects
    initial_state   VARCHAR(50)     NOT NULL,
    final_states    TEXT[]          NOT NULL,
    entity_type     VARCHAR(50)     NOT NULL,   -- record, document, form_entry
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_definitions IS 'State machine definitions for approval flows. / Dinh nghia may trang thai cho luong phe duyet.';

-- ---------------------------------------------------------------------------
-- workflow_instances / Phien ban quy trinh
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_instances (
    instance_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_def_id UUID            NOT NULL REFERENCES workflow_definitions(workflow_def_id),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    current_state   VARCHAR(50)     NOT NULL,
    history         JSONB           DEFAULT '[]',  -- array of state transition events
    assigned_to     UUID            REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_instances IS 'Active workflow state tracking. / Theo doi trang thai quy trinh hoat dong.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS workflow_instances CASCADE;
-- DROP TABLE IF EXISTS workflow_definitions CASCADE;
-- DROP TABLE IF EXISTS comments CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;
-- DROP TABLE IF EXISTS file_attachments CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS naming_patterns CASCADE;
-- DROP TABLE IF EXISTS variable_registry CASCADE;
