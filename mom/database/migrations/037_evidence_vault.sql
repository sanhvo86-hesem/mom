-- ============================================================================
-- Migration: 037_evidence_vault.sql
-- Description: Evidence vault with hash chain, custody tracking, linking,
--              full-text search
-- Dependencies: 005_record_management.sql
-- Rollback: DROP TABLE evidence_fts, evidence_links,
--           evidence_chain_custody, evidence_vault CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE evidence_type_enum AS ENUM (
        'photo', 'video', 'document', 'measurement_data', 'machine_log',
        'material_cert', 'test_report', 'coc', 'coa', 'scan', 'email', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE custody_action_enum AS ENUM (
        'uploaded', 'viewed', 'downloaded', 'transferred', 'linked',
        'unlinked', 'verified', 'flagged'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- evidence_vault / Kho bang chung
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_vault (
    evidence_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_number         VARCHAR(50)     UNIQUE,
    evidence_type           evidence_type_enum NOT NULL,
    title                   VARCHAR(500),
    description             TEXT,
    file_path               VARCHAR(1000),
    file_name               VARCHAR(255),
    file_size_bytes         BIGINT,
    mime_type               VARCHAR(100),
    file_hash_sha256        VARCHAR(64)     NOT NULL,
    previous_hash           VARCHAR(64),
    chain_hash              VARCHAR(64)     NOT NULL,
    chain_sequence          INT             NOT NULL,
    uploaded_by             UUID            REFERENCES users(user_id),
    uploaded_at             TIMESTAMPTZ     DEFAULT now(),
    tamper_detected         BOOLEAN         DEFAULT FALSE,
    retention_years         INT             DEFAULT 5,
    retention_expires_at    DATE,
    is_active               BOOLEAN         DEFAULT TRUE,
    tags                    JSONB           DEFAULT '[]'::jsonb,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE evidence_vault IS 'Tamper-evident evidence vault with hash chain integrity / Kho bang chung chong gia mao voi chuoi hash dam bao tinh toan ven';

CREATE INDEX IF NOT EXISTS idx_evidence_vault_type ON evidence_vault (evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_hash ON evidence_vault (file_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_chain_seq ON evidence_vault (chain_sequence);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_uploaded ON evidence_vault (uploaded_at);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_active ON evidence_vault (is_active);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_retention ON evidence_vault (retention_expires_at);

-- ============================================================================
-- evidence_chain_custody / Chuoi giam sat bang chung
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_chain_custody (
    custody_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id             UUID            NOT NULL REFERENCES evidence_vault(evidence_id) ON DELETE CASCADE,
    action                  custody_action_enum NOT NULL,
    actor_id                UUID            REFERENCES users(user_id),
    actor_name              VARCHAR(150),
    actor_ip                VARCHAR(45),
    reason                  TEXT,
    details                 JSONB,
    recorded_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE evidence_chain_custody IS 'Chain of custody log for evidence / Nhat ky chuoi giam sat bang chung';

CREATE INDEX IF NOT EXISTS idx_evidence_custody_evidence ON evidence_chain_custody (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_custody_action ON evidence_chain_custody (action);
CREATE INDEX IF NOT EXISTS idx_evidence_custody_actor ON evidence_chain_custody (actor_id);
CREATE INDEX IF NOT EXISTS idx_evidence_custody_recorded ON evidence_chain_custody (recorded_at);

-- ============================================================================
-- evidence_links / Lien ket bang chung
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_links (
    link_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id             UUID            NOT NULL REFERENCES evidence_vault(evidence_id) ON DELETE CASCADE,
    linked_entity_type      VARCHAR(30)     NOT NULL,
    linked_entity_id        VARCHAR(50)     NOT NULL,
    linked_by               UUID            REFERENCES users(user_id),
    linked_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    UNIQUE (evidence_id, linked_entity_type, linked_entity_id)
);
COMMENT ON TABLE evidence_links IS 'Links evidence to NCR, CAPA, complaint, SO, JO, WO, FAI, SCAR, MRB / Lien ket bang chung voi NCR, CAPA, khieu nai, don hang, FAI, SCAR, MRB';

CREATE INDEX IF NOT EXISTS idx_evidence_links_evidence ON evidence_links (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_entity ON evidence_links (linked_entity_type, linked_entity_id);

-- ============================================================================
-- evidence_fts / Tim kiem toan van bang chung
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_fts (
    fts_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id             UUID            NOT NULL REFERENCES evidence_vault(evidence_id) ON DELETE CASCADE UNIQUE,
    content_text            TEXT,
    content_tsvector        TSVECTOR,
    metadata_tsvector       TSVECTOR,
    combined_tsvector       TSVECTOR        GENERATED ALWAYS AS (
        coalesce(content_tsvector, ''::tsvector) || coalesce(metadata_tsvector, ''::tsvector)
    ) STORED,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE evidence_fts IS 'Full-text search index for evidence content / Chi muc tim kiem toan van cho noi dung bang chung';

CREATE INDEX IF NOT EXISTS idx_evidence_fts_combined ON evidence_fts USING GIN (combined_tsvector);
CREATE INDEX IF NOT EXISTS idx_evidence_fts_content ON evidence_fts USING GIN (content_tsvector);
CREATE INDEX IF NOT EXISTS idx_evidence_fts_evidence ON evidence_fts (evidence_id);

COMMIT;
