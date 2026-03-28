-- Migration: 002_core_system.sql
-- Description: Core system tables - departments, users, roles, user_roles, sessions, audit_events (partitioned)
-- Dependencies: 001_extensions_and_types.sql
-- Rollback: DROP TABLE audit_events, sessions, user_roles, users, roles, departments CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- departments / Phong ban
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
    dept_code       dept_code       PRIMARY KEY,
    label           VARCHAR(100)    NOT NULL,
    label_vi        VARCHAR(100)    NOT NULL,
    icon            VARCHAR(10),
    color           VARCHAR(7),
    record_types    TEXT[],                         -- array of allowed record type codes
    form_series     INT[],                          -- array of form series numbers
    metadata        JSONB           DEFAULT '{}',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE departments IS 'Master department list (10 departments). / Danh sach phong ban (10 phong ban).';

-- ---------------------------------------------------------------------------
-- roles / Vai tro
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
    role_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code       VARCHAR(50)     NOT NULL UNIQUE,
    role_label      VARCHAR(150)    NOT NULL,
    role_label_vi   VARCHAR(150),
    dept_code       dept_code       REFERENCES departments(dept_code),
    permissions     JSONB           NOT NULL DEFAULT '{}',
    description     TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE roles IS 'Role definitions with JSONB permissions. / Dinh nghia vai tro voi quyen JSONB.';

-- ---------------------------------------------------------------------------
-- users / Nguoi dung
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    user_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL UNIQUE,
    username        VARCHAR(50)     NOT NULL UNIQUE,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    full_name       VARCHAR(150)    NOT NULL,
    full_name_vi    VARCHAR(150),
    password_hash   TEXT            NOT NULL,
    mfa_secret      TEXT,
    mfa_enabled     BOOLEAN         NOT NULL DEFAULT FALSE,
    dept_code       dept_code       REFERENCES departments(dept_code),
    primary_role_id UUID            REFERENCES roles(role_id),
    supervisor_id   UUID            REFERENCES users(user_id),
    shift           shift_code,
    portal_language portal_lang     NOT NULL DEFAULT 'vi',
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'locked', 'pending')),
    last_login_at   TIMESTAMPTZ,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'User accounts with MFA support. / Tai khoan nguoi dung voi ho tro MFA.';

-- ---------------------------------------------------------------------------
-- user_roles / Phan quyen nguoi dung
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id         UUID            NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    assigned_by     UUID            REFERENCES users(user_id),
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE user_roles IS 'Many-to-many user-role mapping (bitemporal). / Anh xa nguoi dung-vai tro nhieu-nhieu.';

-- ---------------------------------------------------------------------------
-- sessions / Phien lam viec
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    session_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash      TEXT            NOT NULL UNIQUE,
    csrf_token      TEXT            NOT NULL,
    mfa_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    ip_address      INET,
    user_agent      TEXT,
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_active_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ     NOT NULL,
    idle_timeout_s  INT             NOT NULL DEFAULT 1800
);
COMMENT ON TABLE sessions IS 'Session management with TOTP 2FA. / Quan ly phien voi TOTP 2FA.';

-- ---------------------------------------------------------------------------
-- audit_events / Su kien kiem tra (APPEND-ONLY, PARTITIONED)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
    event_id        UUID            NOT NULL DEFAULT uuid_generate_v4(),
    event_type      VARCHAR(100)    NOT NULL,
    aggregate_type  VARCHAR(100)    NOT NULL,
    aggregate_id    TEXT            NOT NULL,
    actor_id        UUID            REFERENCES users(user_id),
    actor_name      VARCHAR(150),
    payload         JSONB           NOT NULL DEFAULT '{}',
    metadata        JSONB           DEFAULT '{}',
    ip_address      INET,
    session_id      UUID,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, recorded_at)
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE audit_events IS 'Append-only event sourcing table. Partitioned by month. / Bang ghi su kien chi ghi them. Phan vung theo thang.';

-- Create partitions for 2026 and 2027
CREATE TABLE audit_events_2026_q1 PARTITION OF audit_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_events_2026_q2 PARTITION OF audit_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_events_2026_q3 PARTITION OF audit_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE audit_events_2026_q4 PARTITION OF audit_events
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE audit_events_2027_q1 PARTITION OF audit_events
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE audit_events_default PARTITION OF audit_events DEFAULT;

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS audit_events_2026_q1, audit_events_2026_q2, audit_events_2026_q3, audit_events_2026_q4, audit_events_2027_q1, audit_events_default CASCADE;
-- DROP TABLE IF EXISTS audit_events CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS user_roles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- DROP TABLE IF EXISTS departments CASCADE;
