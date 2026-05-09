-- ============================================================================
-- Migration 166: effective document scope + acknowledgement (21 CFR Part 11)
-- ----------------------------------------------------------------------------
-- The admin "Tài liệu hiệu lực" tab needs more than `documents.status='effective'`:
--   1. Effective period (from / until) so a document can be scheduled for
--      release and auto-retired.
--   2. Effective scope JSONB (which plants / depts / roles the doc is in
--      force for) — drives RLS-aware filtering on the portal.
--   3. Acknowledgement tracking — ISO 9001 §7.5.3 / 21 CFR Part 11 §11.10(d) /
--      AS9100 §7.5.3 require evidence that affected personnel have read the
--      controlled document.
--   4. Linkage to retention policy (introduced in migration 168) so the same
--      document object owns its full life-cycle.
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend documents
-- ---------------------------------------------------------------------------
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS effective_from           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS effective_until          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS effective_scope          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS acknowledgement_required BOOLEAN         NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acknowledgement_due_days SMALLINT,
    ADD COLUMN IF NOT EXISTS retention_policy_code    VARCHAR(40),
    ADD COLUMN IF NOT EXISTS legal_hold_active        BOOLEAN         NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS supersedes_doc_id        VARCHAR(120),
    ADD COLUMN IF NOT EXISTS superseded_by_doc_id     VARCHAR(120);

COMMENT ON COLUMN documents.effective_from IS 'When the document becomes effective (controlled-issue date).';
COMMENT ON COLUMN documents.effective_until IS 'When the document expires (NULL = indefinite until retired).';
COMMENT ON COLUMN documents.effective_scope IS 'Scope envelope: {plant_ids:[…], dept_codes:[…], role_codes:[…], geo_country_codes:[…]}. Empty {} means global.';
COMMENT ON COLUMN documents.acknowledgement_required IS 'TRUE if affected users must acknowledge they read this document (21 CFR Part 11 §11.10(d)).';
COMMENT ON COLUMN documents.acknowledgement_due_days IS 'Calendar days from effective_from for users to acknowledge before being flagged non-compliant.';
COMMENT ON COLUMN documents.retention_policy_code IS 'FK to retention_policy.policy_code; drives end-of-life disposal flow.';
COMMENT ON COLUMN documents.legal_hold_active IS 'TRUE while a legal hold prevents retention disposal. Set/cleared by retention_legal_hold trigger.';

CREATE INDEX IF NOT EXISTS idx_documents_effective_window
    ON documents(effective_from, effective_until)
    WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_documents_ack_required
    ON documents(doc_id) WHERE acknowledgement_required = TRUE AND status = 'approved';
CREATE INDEX IF NOT EXISTS idx_documents_legal_hold
    ON documents(doc_id) WHERE legal_hold_active = TRUE;

-- ---------------------------------------------------------------------------
-- 2. document_acknowledgement (per user × doc_revision)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_acknowledgement (
    ack_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id                  VARCHAR(120)    NOT NULL,
    doc_revision            VARCHAR(20)     NOT NULL,
    user_id                 UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    acknowledged_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    ip_address              INET,
    user_agent              TEXT,
    signature_method        VARCHAR(30)     NOT NULL DEFAULT 'session_signed'
                            CHECK (signature_method IN ('session_signed','password_reauth','mfa_reauth','wet_signature_scan','external_id_provider')),
    signature_hash          TEXT,
    signature_kid           VARCHAR(50),
    mfa_challenge_id        UUID            REFERENCES mfa_challenge(challenge_id),
    aal_achieved            SMALLINT,
    affirmation_text        TEXT,
    affirmation_text_vi     TEXT,
    quiz_answers            JSONB,
    revoked_at              TIMESTAMPTZ,
    revoked_by              UUID            REFERENCES users(user_id),
    revoke_reason           TEXT,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    UNIQUE (doc_id, doc_revision, user_id)
);

COMMENT ON TABLE document_acknowledgement IS 'Per-user-per-revision document acknowledgement (21 CFR Part 11 §11.10(d) / AS9100 §7.5.3 / ISO 9001 §7.5.3).';
COMMENT ON COLUMN document_acknowledgement.signature_method IS 'How the affirmation was authenticated (session, password reauth, MFA reauth, wet scan, external IdP).';
COMMENT ON COLUMN document_acknowledgement.signature_hash IS 'HMAC over (user_id || doc_id || doc_revision || acknowledged_at || ip) using signature_kid.';
COMMENT ON COLUMN document_acknowledgement.affirmation_text IS 'Exact text the user attested to (legally binding wording snapshot).';
COMMENT ON COLUMN document_acknowledgement.quiz_answers IS 'Optional comprehension-quiz answers JSONB — proves understanding, not just sign-off.';

CREATE INDEX IF NOT EXISTS idx_doc_ack_user ON document_acknowledgement(user_id, acknowledged_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_ack_doc ON document_acknowledgement(doc_id, doc_revision) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_ack_pending ON document_acknowledgement(doc_id) WHERE acknowledged_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. View: documents currently in force for a (plant, dept, role) tuple
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_documents_in_force AS
    SELECT
        d.doc_id,
        d.doc_type,
        d.doc_category,
        d.title,
        d.title_vi,
        d.current_rev,
        d.dept_code,
        d.owner_role,
        d.iso_clause,
        d.as9100_clause,
        d.effective_from,
        d.effective_until,
        d.effective_scope,
        d.acknowledgement_required,
        d.acknowledgement_due_days,
        d.retention_policy_code,
        d.legal_hold_active,
        d.org_company_code,
        d.org_plant_id,
        d.row_version,
        d.created_at,
        d.updated_at
    FROM documents d
    WHERE d.status = 'approved'
      AND (d.effective_from IS NULL OR d.effective_from <= now())
      AND (d.effective_until IS NULL OR d.effective_until > now())
      AND d.superseded_by_doc_id IS NULL;

COMMENT ON VIEW v_documents_in_force IS 'Documents currently in force (effective + within window + not superseded). / Tai lieu dang hieu luc.';

-- ---------------------------------------------------------------------------
-- 4. View: per-user pending acknowledgements (workspace inbox)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_document_pending_acknowledgement AS
    SELECT
        u.user_id,
        u.username,
        u.dept_code,
        u.primary_role_id,
        d.doc_id,
        d.doc_type,
        d.title,
        d.title_vi,
        d.current_rev,
        d.effective_from,
        (d.effective_from + (COALESCE(d.acknowledgement_due_days, 14) || ' days')::interval) AS due_at,
        CASE
            WHEN now() > d.effective_from + (COALESCE(d.acknowledgement_due_days, 14) || ' days')::interval THEN 'overdue'
            WHEN now() > d.effective_from + ((COALESCE(d.acknowledgement_due_days, 14) / 2) || ' days')::interval THEN 'due_soon'
            ELSE 'on_track'
        END AS due_state
    FROM users u
    CROSS JOIN documents d
    LEFT JOIN document_acknowledgement a
        ON a.doc_id = d.doc_id AND a.doc_revision = d.current_rev AND a.user_id = u.user_id AND a.revoked_at IS NULL
    WHERE u.status = 'active'
      AND d.status = 'approved'
      AND d.acknowledgement_required = TRUE
      AND (d.effective_from IS NULL OR d.effective_from <= now())
      AND (d.effective_until IS NULL OR d.effective_until > now())
      AND d.superseded_by_doc_id IS NULL
      AND a.ack_id IS NULL
      -- Scope: include user only if effective_scope is empty (global) or matches user's dept/plant
      AND (
          d.effective_scope = '{}'::jsonb
          OR (d.effective_scope ? 'dept_codes' AND (d.effective_scope->'dept_codes') @> to_jsonb(u.dept_code::text))
          OR (d.effective_scope ? 'plant_ids' AND u.metadata ? 'plant_id' AND (d.effective_scope->'plant_ids') @> (u.metadata->'plant_id'))
      );

COMMENT ON VIEW v_document_pending_acknowledgement IS 'Per-user in-scope effective documents lacking acknowledgement (with due_at + due_state).';

-- ---------------------------------------------------------------------------
-- 5. Trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_doc_ack_set_updated_at') THEN
        CREATE TRIGGER trg_doc_ack_set_updated_at
            BEFORE UPDATE ON document_acknowledgement
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_document_pending_acknowledgement;
--   DROP VIEW IF EXISTS v_documents_in_force;
--   DROP TABLE IF EXISTS document_acknowledgement;
--   ALTER TABLE documents
--     DROP COLUMN IF EXISTS effective_from,
--     DROP COLUMN IF EXISTS effective_until,
--     DROP COLUMN IF EXISTS effective_scope,
--     DROP COLUMN IF EXISTS acknowledgement_required,
--     DROP COLUMN IF EXISTS acknowledgement_due_days,
--     DROP COLUMN IF EXISTS retention_policy_code,
--     DROP COLUMN IF EXISTS legal_hold_active,
--     DROP COLUMN IF EXISTS supersedes_doc_id,
--     DROP COLUMN IF EXISTS superseded_by_doc_id;
--   COMMIT;
