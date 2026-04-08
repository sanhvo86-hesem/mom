-- ============================================================================
-- Migration: 038_customer_portal.sql
-- Description: Customer-facing portal - external users, sessions, access tokens,
--              order views, document access
-- Dependencies: 007_customers_sales.sql, 003_document_management.sql
-- Rollback: DROP TABLE portal_document_access, portal_complaint_submissions,
--           portal_order_views, portal_access_tokens, portal_sessions,
--           portal_users CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE portal_user_status_enum AS ENUM (
        'active', 'inactive', 'pending_verification', 'locked'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE portal_access_level_enum AS ENUM (
        'view_orders', 'view_documents', 'submit_complaints',
        'download_certs', 'full_access'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- portal_users / Nguoi dung cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_users (
    portal_user_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    email                   VARCHAR(255)    UNIQUE NOT NULL,
    display_name            VARCHAR(200),
    password_hash           VARCHAR(255),
    status                  portal_user_status_enum DEFAULT 'pending_verification',
    access_level            portal_access_level_enum DEFAULT 'view_orders',
    last_login_at           TIMESTAMPTZ,
    login_count             INT             DEFAULT 0,
    email_verified          BOOLEAN         DEFAULT FALSE,
    verification_token      VARCHAR(255),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE portal_users IS 'External customer portal users / Nguoi dung cong khach hang ben ngoai';

CREATE INDEX IF NOT EXISTS idx_portal_users_customer ON portal_users (customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users (email);
CREATE INDEX IF NOT EXISTS idx_portal_users_status ON portal_users (status);

-- ============================================================================
-- portal_sessions / Phien dang nhap cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_sessions (
    session_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id          UUID            NOT NULL REFERENCES portal_users(portal_user_id),
    session_token           VARCHAR(255)    UNIQUE,
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    expires_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE portal_sessions IS 'External user sessions / Phien dang nhap nguoi dung ben ngoai';

CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON portal_sessions (portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions (expires_at);

-- ============================================================================
-- portal_access_tokens / Token truy cap API cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_access_tokens (
    token_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id          UUID            NOT NULL REFERENCES portal_users(portal_user_id),
    token_hash              VARCHAR(255)    NOT NULL,
    token_name              VARCHAR(100),
    scopes                  JSONB           DEFAULT '[]'::jsonb,
    expires_at              TIMESTAMPTZ,
    last_used_at            TIMESTAMPTZ,
    is_active               BOOLEAN         DEFAULT TRUE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE portal_access_tokens IS 'API tokens for external integrations / Token API cho tich hop ben ngoai';

CREATE INDEX IF NOT EXISTS idx_portal_tokens_user ON portal_access_tokens (portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_active ON portal_access_tokens (is_active);

-- ============================================================================
-- portal_order_views / Quyen xem don hang cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_order_views (
    view_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id          UUID            NOT NULL REFERENCES portal_users(portal_user_id),
    sales_order_id          UUID            NOT NULL REFERENCES sales_orders(sales_order_id),
    granted_by              UUID            REFERENCES users(user_id),
    granted_at              TIMESTAMPTZ     DEFAULT now(),
    revoked_at              TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb
);
COMMENT ON TABLE portal_order_views IS 'Track which orders external users can see / Theo doi don hang nguoi dung ben ngoai duoc xem';

CREATE INDEX IF NOT EXISTS idx_portal_order_views_user ON portal_order_views (portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_order_views_order ON portal_order_views (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_portal_order_views_granted ON portal_order_views (granted_at);

-- ============================================================================
-- portal_complaint_submissions / Gui khieu nai tu cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_complaint_submissions (
    submission_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id          UUID            NOT NULL REFERENCES portal_users(portal_user_id),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    subject                 VARCHAR(500),
    description             TEXT,
    affected_order_ref      VARCHAR(100),
    affected_part_ref       VARCHAR(100),
    attachments             JSONB           DEFAULT '[]'::jsonb,
    status                  VARCHAR(30)     DEFAULT 'submitted',
    internal_complaint_id   UUID,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE portal_complaint_submissions IS 'External complaint intake from customer portal / Tiep nhan khieu nai ben ngoai tu cong khach hang';

CREATE INDEX IF NOT EXISTS idx_portal_complaints_user ON portal_complaint_submissions (portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_complaints_customer ON portal_complaint_submissions (customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_complaints_status ON portal_complaint_submissions (status);
CREATE INDEX IF NOT EXISTS idx_portal_complaints_internal ON portal_complaint_submissions (internal_complaint_id);

-- ============================================================================
-- portal_document_access / Quyen truy cap tai lieu cong khach hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_document_access (
    access_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id          UUID            NOT NULL REFERENCES portal_users(portal_user_id),
    document_type           VARCHAR(50)     NOT NULL,
    document_reference      VARCHAR(200),
    sales_order_ref         VARCHAR(50),
    downloaded_at           TIMESTAMPTZ,
    download_count          INT             DEFAULT 0,
    granted_by              UUID            REFERENCES users(user_id),
    granted_at              TIMESTAMPTZ     DEFAULT now(),
    expires_at              TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb
);
COMMENT ON TABLE portal_document_access IS 'Which documents external users can download / Tai lieu nguoi dung ben ngoai duoc tai xuong';

CREATE INDEX IF NOT EXISTS idx_portal_doc_access_user ON portal_document_access (portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_doc_access_type ON portal_document_access (document_type);
CREATE INDEX IF NOT EXISTS idx_portal_doc_access_order ON portal_document_access (sales_order_ref);
CREATE INDEX IF NOT EXISTS idx_portal_doc_access_expires ON portal_document_access (expires_at);

COMMIT;
