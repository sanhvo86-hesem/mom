-- ============================================================================
-- Migration 150: DCC — Document Change Control
-- ============================================================================
-- Purpose:
--   Canonical backend for the *Document* version-control workflow (DCC),
--   distinct from the *Engineering Change Control* workflow (ECC = plm_change_*).
--
--   DCC governs QMS controlled information: Manual, Policy, SOP, WI, Form,
--   Annex, Department Handbook, Job Description, Training Matrix, etc.
--   ECC governs parts/BOMs/items/routings (handled by plm_change_orders).
--
--   DCC introduces:
--     • dcc_document_header_label   — i18n-aware registry of header labels
--                                     (ID, Rev, Eff, Owner, Appr) so the
--                                     frontend header renderer never hardcodes
--                                     a Vietnamese string. Labels are looked
--                                     up by label_key + locale.
--     • dcc_document_header         — flattened per-document header projection
--                                     consumed by the portal renderer
--                                     (/api/v1/dcc/documents/{code}/header).
--                                     Source of truth; no hardcode in HTML.
--     • dcc_document_change_request — DCR: formal request to edit or supersede
--                                     a QMS document. Distinct from plm_change_requests
--                                     to prevent ECC / DCC conflation.
--     • dcc_document_change_notice  — DCN: approved change notice that
--                                     authorises a new revision to be released.
--     • dcc_document_revision_history — append-only log of every revision
--                                     transition (draft → review → approved →
--                                     released → superseded → obsolete) for
--                                     FDA 21 CFR Part 11 audit evidence.
--
--   The existing eqms_documents + eqms_document_family + eqms_document_revision
--   tables (migrations 102, 136, 141) remain authoritative for regulated QMS
--   records. DCC tables reference eqms_documents.doc_id when available and
--   fall back to VARCHAR doc_code for legacy HTML-backed documents that have
--   not yet been migrated into eqms_documents.
--
-- Standards:
--   • ISO 9001:2015 §7.5 Documented Information (Document Control)
--   • AS9100D §7.5
--   • FDA 21 CFR Part 820.40 (Document Controls)
--   • FDA 21 CFR Part 11 (Electronic Records / Electronic Signatures)
--
-- Safety:
--   Additive only. All DDL guarded with IF NOT EXISTS. All seed data guarded
--   with ON CONFLICT DO NOTHING. No destructive writes to existing tables.
--
-- Rollback (reverse order):
--   DROP TABLE IF EXISTS
--     dcc_document_revision_history,
--     dcc_document_change_notice,
--     dcc_document_change_request,
--     dcc_document_header,
--     dcc_document_header_label
--   CASCADE;
--
-- Author: HESEM QMS Module — DCC sprint
-- Date:   2026-04-22
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — dcc_document_header_label
-- i18n registry so the frontend renderer never hardcodes a Vietnamese
-- string (e.g. "Ngày hiệu lực"). The renderer issues
--   GET /api/v1/dcc/labels?locale=en
-- and receives {ID, Rev, Eff, Owner, Appr, ...}.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_header_label (
    label_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    label_key        VARCHAR(40)  NOT NULL,          -- e.g. 'doc_id', 'revision', 'effective_date'
    locale           VARCHAR(10)  NOT NULL,          -- BCP-47 (en, vi, en-US)
    short_label      VARCHAR(24)  NOT NULL,          -- compact header text ("ID", "Rev", "Eff")
    long_label       VARCHAR(120) NOT NULL,          -- full label ("Document ID", "Effective date")
    help_text        TEXT,                           -- tooltip for admins
    sort_order       SMALLINT     NOT NULL DEFAULT 0,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (label_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_dcc_label_locale
    ON dcc_document_header_label (locale, sort_order)
    WHERE is_active = TRUE;

COMMENT ON TABLE  dcc_document_header_label
    IS 'DCC: i18n registry for document header labels consumed by the portal header renderer. No hardcode allowed.';
COMMENT ON COLUMN dcc_document_header_label.short_label
    IS 'Compact label shown in the header ribbon (budget: ≤5 chars). Overflow-safe.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — dcc_document_header
-- Per-document header projection. Every HTML document's top ribbon
-- (ID | Rev | Eff | Owner | Appr) reads from this table via
-- /api/v1/dcc/documents/{doc_code}/header. One row per controlled document.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_header (
    header_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code           VARCHAR(80)  NOT NULL UNIQUE,    -- canonical human code (e.g. QMS-MAN-001)
    eqms_doc_id        UUID,                            -- FK to eqms_documents.doc_id when migrated; nullable for legacy
    title              VARCHAR(512) NOT NULL,
    subtitle           VARCHAR(512),                    -- secondary line shown under the title
    doc_type           VARCHAR(40)  NOT NULL,           -- MAN / POL / SOP / WI / FRM / ANNEX / JD / DEPT / ORG / REF / TRN
    revision           VARCHAR(20)  NOT NULL DEFAULT 'V0',    -- currently-effective revision label
    effective_date     DATE         NOT NULL,           -- currently-effective date (ISO)
    owner_role_code    VARCHAR(40)  NOT NULL,           -- SINGLE owner role (e.g. QMR, QA, CEO). DCC forbids dual-owner.
    approver_role_code VARCHAR(40)  NOT NULL,           -- SINGLE approver role (e.g. CEO, MD)
    iso_clause         VARCHAR(60),                     -- e.g. 'ISO 9001:2026 §4.2'
    status             VARCHAR(30)  NOT NULL DEFAULT 'draft',
                                                        -- draft | in_review | approved | released | superseded | obsolete
    locale_default     VARCHAR(10)  NOT NULL DEFAULT 'en',
    metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by         VARCHAR(120) NOT NULL DEFAULT 'system',
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by         VARCHAR(120) NOT NULL DEFAULT 'system',
    CONSTRAINT ck_dcc_header_owner_single
        CHECK (owner_role_code !~ '[/,;|]' AND position(' ' in owner_role_code) = 0),
    CONSTRAINT ck_dcc_header_approver_single
        CHECK (approver_role_code !~ '[/,;|]' AND position(' ' in approver_role_code) = 0),
    CONSTRAINT ck_dcc_header_status
        CHECK (status IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete')),
    CONSTRAINT ck_dcc_header_revision
        CHECK (revision ~ '^V[0-9]+(\.[0-9]+)?$')
);

CREATE INDEX IF NOT EXISTS idx_dcc_header_doc_code
    ON dcc_document_header (doc_code);

CREATE INDEX IF NOT EXISTS idx_dcc_header_doc_type_status
    ON dcc_document_header (doc_type, status);

CREATE INDEX IF NOT EXISTS idx_dcc_header_effective_date
    ON dcc_document_header (effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_dcc_header_owner_role
    ON dcc_document_header (owner_role_code);

COMMENT ON TABLE  dcc_document_header
    IS 'DCC: canonical header projection for every controlled QMS document. Consumed by portal header renderer. HTML MUST NOT hardcode these values.';
COMMENT ON COLUMN dcc_document_header.owner_role_code
    IS 'SINGLE owner role code. Multiple owners are explicitly forbidden by ck_dcc_header_owner_single.';
COMMENT ON COLUMN dcc_document_header.revision
    IS 'Revision label (V0, V1, V1.1, V2.0 ...). Constrained to pattern V<major>[.<minor>].';
COMMENT ON COLUMN dcc_document_header.effective_date
    IS 'Date the current revision becomes effective. Append-only history kept in dcc_document_revision_history.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3 — dcc_document_change_request  (DCR)
-- Formal request to create/edit/supersede a DCC document. The author records
-- impact, reason, affected clauses; reviewer + approver authorise issuance.
-- Distinct from plm_change_requests to prevent ECC / DCC conflation.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_change_request (
    dcr_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dcr_number         VARCHAR(40)  NOT NULL UNIQUE,    -- e.g. DCR-2026-0041
    doc_code           VARCHAR(80)  NOT NULL REFERENCES dcc_document_header(doc_code) ON UPDATE CASCADE,
    change_type        VARCHAR(30)  NOT NULL,           -- create | revise | supersede | obsolete
    requested_revision VARCHAR(20)  NOT NULL,           -- proposed next revision label
    reason             TEXT         NOT NULL,
    impact_assessment  TEXT,
    linked_ecr         VARCHAR(40),                     -- optional link to an ECC ECR/ECO number
    requested_by       VARCHAR(120) NOT NULL,
    requested_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewer_role_code VARCHAR(40),
    reviewer_party_id  VARCHAR(120),
    reviewed_at        TIMESTAMPTZ,
    approver_role_code VARCHAR(40),
    approver_party_id  VARCHAR(120),
    approved_at        TIMESTAMPTZ,
    target_effective_date DATE,
    status             VARCHAR(30)  NOT NULL DEFAULT 'submitted',
    rejection_reason   TEXT,
    metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_dcc_dcr_change_type
        CHECK (change_type IN ('create', 'revise', 'supersede', 'obsolete')),
    CONSTRAINT ck_dcc_dcr_status
        CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'cancelled', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_dcc_dcr_doc_code
    ON dcc_document_change_request (doc_code, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcc_dcr_status
    ON dcc_document_change_request (status, requested_at DESC);

COMMENT ON TABLE dcc_document_change_request
    IS 'DCC: formal Document Change Request. Distinct from plm_change_requests (ECC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4 — dcc_document_change_notice  (DCN)
-- Approved change notice authorising a new revision release. Enforces the
-- DCC-side equivalent of plm_change_orders, but scoped to documents only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_change_notice (
    dcn_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dcn_number         VARCHAR(40)  NOT NULL UNIQUE,    -- e.g. DCN-2026-0017
    dcr_id             UUID         NOT NULL REFERENCES dcc_document_change_request(dcr_id),
    doc_code           VARCHAR(80)  NOT NULL REFERENCES dcc_document_header(doc_code) ON UPDATE CASCADE,
    from_revision      VARCHAR(20),
    to_revision        VARCHAR(20)  NOT NULL,
    effective_date     DATE         NOT NULL,
    release_authority  VARCHAR(40)  NOT NULL,           -- single role code of signer
    signature_event_id UUID,                            -- FK to eqms_electronic_signature_event (if present)
    manifest_hash_sha256 VARCHAR(128),
    status             VARCHAR(30)  NOT NULL DEFAULT 'issued',
    issued_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_dcc_dcn_status
        CHECK (status IN ('issued', 'released', 'cancelled', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_dcc_dcn_doc_code
    ON dcc_document_change_notice (doc_code, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcc_dcn_dcr
    ON dcc_document_change_notice (dcr_id);

COMMENT ON TABLE dcc_document_change_notice
    IS 'DCC: Document Change Notice. Authorises release of a new revision following an approved DCR.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5 — dcc_document_revision_history
-- Append-only log of every state transition for FDA 21 CFR Part 11 evidence.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_revision_history (
    history_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code           VARCHAR(80)  NOT NULL,
    revision           VARCHAR(20)  NOT NULL,
    previous_revision  VARCHAR(20),
    from_status        VARCHAR(30),
    to_status          VARCHAR(30)  NOT NULL,
    effective_date     DATE,
    actor_party_id     VARCHAR(120) NOT NULL,
    actor_role_code    VARCHAR(40),
    dcr_id             UUID,
    dcn_id             UUID,
    note               TEXT,
    recorded_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_dcc_history_transition
        CHECK (to_status IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete'))
);

CREATE INDEX IF NOT EXISTS idx_dcc_history_doc_code
    ON dcc_document_revision_history (doc_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcc_history_dcr
    ON dcc_document_revision_history (dcr_id)
    WHERE dcr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dcc_history_dcn
    ON dcc_document_revision_history (dcn_id)
    WHERE dcn_id IS NOT NULL;

COMMENT ON TABLE dcc_document_revision_history
    IS 'DCC: append-only revision lifecycle history. Immutable; do not UPDATE or DELETE rows.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6 — Seed default label registry (English + Vietnamese)
-- English short labels are the primary default per the DCC spec:
-- ID / Rev / Eff / Owner / Appr. Vietnamese long labels preserved for admin UI.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO dcc_document_header_label
    (label_key,      locale, short_label, long_label,        help_text,                                        sort_order)
VALUES
    ('doc_id',       'en',   'ID',        'Document ID',     'Canonical document code (e.g. QMS-MAN-001).',   10),
    ('revision',     'en',   'Rev',       'Revision',        'Currently effective revision label.',           20),
    ('effective_date','en',  'Eff',       'Effective date',  'Date the current revision takes effect.',       30),
    ('owner',        'en',   'Owner',     'Owner',           'Single role accountable for the document.',     40),
    ('approver',     'en',   'Appr',      'Approved by',     'Single role that signed the release.',          50),
    ('iso_clause',   'en',   'ISO',       'ISO clause',      'Primary ISO / AS / IATF clause reference.',     60),
    ('doc_id',       'vi',   'ID',        'Mã tài liệu',     'Mã tài liệu (vd. QMS-MAN-001).',                 10),
    ('revision',     'vi',   'Rev',       'Phiên bản',       'Phiên bản hiệu lực hiện tại.',                   20),
    ('effective_date','vi',  'Eff',       'Ngày hiệu lực',   'Ngày phiên bản này có hiệu lực.',                30),
    ('owner',        'vi',   'Owner',     'Chủ sở hữu',      'Một vai trò chịu trách nhiệm duy nhất.',          40),
    ('approver',     'vi',   'Appr',      'Phê duyệt',       'Một vai trò ký phê duyệt duy nhất.',              50),
    ('iso_clause',   'vi',   'ISO',       'Điều khoản ISO',  'Điều khoản ISO/AS/IATF tham chiếu chính.',        60)
ON CONFLICT (label_key, locale) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 7 — updated_at trigger for dcc_document_header and label registry
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION dcc_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dcc_header_touch ON dcc_document_header;
CREATE TRIGGER trg_dcc_header_touch
    BEFORE UPDATE ON dcc_document_header
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

DROP TRIGGER IF EXISTS trg_dcc_label_touch ON dcc_document_header_label;
CREATE TRIGGER trg_dcc_label_touch
    BEFORE UPDATE ON dcc_document_header_label
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 8 — Immutable append-only guard on revision history
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION dcc_history_forbid_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'dcc_document_revision_history is append-only; % forbidden', TG_OP
        USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dcc_history_immutable_upd ON dcc_document_revision_history;
CREATE TRIGGER trg_dcc_history_immutable_upd
    BEFORE UPDATE ON dcc_document_revision_history
    FOR EACH ROW EXECUTE FUNCTION dcc_history_forbid_mutation();

DROP TRIGGER IF EXISTS trg_dcc_history_immutable_del ON dcc_document_revision_history;
CREATE TRIGGER trg_dcc_history_immutable_del
    BEFORE DELETE ON dcc_document_revision_history
    FOR EACH ROW EXECUTE FUNCTION dcc_history_forbid_mutation();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 9 — Migration audit summary
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_labels INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_labels FROM dcc_document_header_label WHERE is_active = TRUE;
    RAISE NOTICE '[Migration 150] DCC tables created; % active header labels seeded.', v_labels;
END;
$$;

COMMIT;
