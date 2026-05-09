-- ============================================================================
-- Migration 161: document_permission_grant — per-doc ACL with grant/deny
-- ----------------------------------------------------------------------------
-- Replaces mom/api/config/user_doc_overrides JSON blob with a normalized,
-- audit-grade per-document grant/deny table.
--
-- Subject can be a user, role, or department. doc_pattern accepts:
--   * an exact doc_code  ("qms-man-001")
--   * a glob              ("sop-*", "wi-7??-*")
--   * a label  "all_documents", "all_sops", "all_qms", "all_finance"
--
-- effect = 'deny' takes precedence over effect = 'grant' anywhere — matches
-- the deny-overrides-grant convention used by AWS IAM, Azure RBAC, and
-- Google IAM with deny policies.
--
-- Idempotent.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS document_permission_grant (
    grant_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_type            VARCHAR(20)     NOT NULL
                            CHECK (subject_type IN ('user','role','dept')),
    subject_id              VARCHAR(100)    NOT NULL,
    doc_pattern             VARCHAR(200)    NOT NULL,
    action                  VARCHAR(40)     NOT NULL
                            CHECK (action IN ('view','edit','approve','export','print','retire','delegate')),
    effect                  VARCHAR(10)     NOT NULL DEFAULT 'grant'
                            CHECK (effect IN ('grant','deny')),
    reason                  TEXT,
    expires_at              TIMESTAMPTZ,
    granted_by              UUID            REFERENCES users(user_id),
    granted_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ,
    revoked_by              UUID            REFERENCES users(user_id),
    revoke_reason           TEXT,
    is_emergency            BOOLEAN         NOT NULL DEFAULT FALSE,
    compliance_refs         TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
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
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID
);

COMMENT ON TABLE document_permission_grant IS 'Per-doc grant/deny ACL (subject × doc_pattern × action × effect). / ACL tai lieu cap nhan: chu the x mau tai lieu x hanh dong x hieu luc.';
COMMENT ON COLUMN document_permission_grant.subject_id IS 'username when subject_type=user, role_code when role, dept_code when dept.';
COMMENT ON COLUMN document_permission_grant.doc_pattern IS 'Exact doc_code, glob (sop-*), or label keyword (all_documents/all_sops/all_qms/all_finance).';
COMMENT ON COLUMN document_permission_grant.effect IS 'deny takes precedence over grant globally (AWS IAM convention).';
COMMENT ON COLUMN document_permission_grant.is_emergency IS 'TRUE when this grant was issued via break-glass workflow — flagged in access reviews.';

CREATE INDEX IF NOT EXISTS idx_doc_perm_subject ON document_permission_grant(subject_type, subject_id) WHERE deleted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_pattern ON document_permission_grant(doc_pattern) WHERE deleted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_active ON document_permission_grant(subject_type, action, effect, expires_at) WHERE deleted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_emergency ON document_permission_grant(is_emergency) WHERE is_emergency = TRUE AND deleted_at IS NULL;

-- updated_at trigger ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_doc_perm_grant_set_updated_at') THEN
        CREATE TRIGGER trg_doc_perm_grant_set_updated_at
            BEFORE UPDATE ON document_permission_grant
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- Audit-required check: if reason is empty for a dangerous action+effect
-- combination, raise. Use a CHECK + trigger so policy can evolve.
-- ---------------------------------------------------------------------------
ALTER TABLE document_permission_grant
    ADD CONSTRAINT doc_perm_grant_reason_required_for_emergency
    CHECK (NOT is_emergency OR (reason IS NOT NULL AND char_length(reason) >= 10));

-- ---------------------------------------------------------------------------
-- View: effective document grants (no view-of-view-of-view; computed once)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_document_permission_grant_active AS
    SELECT
        grant_id,
        subject_type,
        subject_id,
        doc_pattern,
        action,
        effect,
        reason,
        expires_at,
        granted_by,
        granted_at,
        is_emergency,
        org_company_code,
        org_plant_id
    FROM document_permission_grant
    WHERE deleted_at IS NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now());

COMMENT ON VIEW v_document_permission_grant_active IS 'Active (non-deleted, non-revoked, non-expired) document grants. / Phan quyen tai lieu dang hieu luc.';

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_document_permission_grant_active;
--   DROP TABLE IF EXISTS document_permission_grant;
--   COMMIT;
