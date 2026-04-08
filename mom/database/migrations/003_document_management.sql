-- Migration: 003_document_management.sql
-- Description: Document management tables - documents, document_versions, document_embeddings, document_distribution
-- Dependencies: 002_core_system.sql
-- Rollback: DROP TABLE document_distribution, document_embeddings, document_versions, documents CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- documents / Tai lieu
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
    doc_id          VARCHAR(30)     PRIMARY KEY,  -- e.g., SOP-606
    doc_type        doc_type_enum   NOT NULL,
    doc_category    doc_category_enum NOT NULL,
    title           VARCHAR(500)    NOT NULL,
    title_vi        VARCHAR(500),
    dept_code       dept_code       NOT NULL REFERENCES departments(dept_code),
    owner_role      VARCHAR(150),
    iso_clause      TEXT,
    as9100_clause   TEXT,
    current_rev     VARCHAR(20)     NOT NULL DEFAULT 'V1.0',
    status          doc_status      NOT NULL DEFAULT 'draft',
    control_status  control_status_enum NOT NULL DEFAULT 'DRAFT',
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE documents IS 'Master document register. / So dang ky tai lieu chinh.';

-- ---------------------------------------------------------------------------
-- document_versions / Phien ban tai lieu (BITEMPORAL)
-- ---------------------------------------------------------------------------
CREATE TABLE document_versions (
    version_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id          VARCHAR(30)     NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    rev             VARCHAR(20)     NOT NULL,
    effective_date  DATE            NOT NULL,
    author          VARCHAR(150)    NOT NULL,
    reviewer        VARCHAR(150),
    approver        VARCHAR(150),
    content_hash    VARCHAR(128),          -- SHA-512
    file_path       TEXT,
    sharepoint_url  TEXT,
    changelog       TEXT,
    -- Bitemporal columns
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,           -- NULL = currently valid
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (doc_id, rev)
);
COMMENT ON TABLE document_versions IS 'Bitemporal document version tracking. / Theo doi phien ban tai lieu hai chieu thoi gian.';

-- ---------------------------------------------------------------------------
-- document_embeddings / Nhung tai lieu (pgvector)
-- ---------------------------------------------------------------------------
CREATE TABLE document_embeddings (
    embedding_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id      UUID            NOT NULL REFERENCES document_versions(version_id) ON DELETE CASCADE,
    chunk_index     INT             NOT NULL,
    chunk_text      TEXT            NOT NULL,
    embedding       vector(1536)    NOT NULL,  -- OpenAI ada-002 compatible
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE document_embeddings IS 'Document embeddings for semantic search. / Nhung tai lieu cho tim kiem ngu nghia.';

-- ---------------------------------------------------------------------------
-- document_distribution / Phan phoi tai lieu
-- ---------------------------------------------------------------------------
CREATE TABLE document_distribution (
    distribution_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id      UUID            NOT NULL REFERENCES document_versions(version_id),
    user_id         UUID            NOT NULL REFERENCES users(user_id),
    distributed_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    method          VARCHAR(50)     DEFAULT 'portal'
);
COMMENT ON TABLE document_distribution IS 'Tracks who received which document version. / Theo doi ai da nhan phien ban tai lieu nao.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS document_distribution CASCADE;
-- DROP TABLE IF EXISTS document_embeddings CASCADE;
-- DROP TABLE IF EXISTS document_versions CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
