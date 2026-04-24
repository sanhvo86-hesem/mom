-- ============================================================================
-- Migration 155: DCC — Consolidation (Role catalog, Revision table, Filename link)
-- ============================================================================
-- Purpose:
--   Close the gap between the legacy JSON stores (state.json / manifest.json /
--   docs_custom.json) and the DCC control plane introduced by migration 150.
--   Prior to this migration the renderer ribbon showed values seeded once by
--   `mom/tools/dcc-batch/migrate.php` (hardcoded 'V0', 'QA', 'CEO') and never
--   updated by the approve/release workflow. This migration introduces the
--   structures needed to drive every UI surface from the database:
--
--     • dcc_role_catalog         — replaces hardcoded owner/approver lists in
--                                  02-state-auth-ui.js (`['QA/QMS','Production',
--                                  …]`, `['Tổng Giám Đốc','QMR',…]`).
--     • dcc_doc_type_catalog     — replaces hardcoded DOC_TYPES list in
--                                  48-eqms-documents.js.
--     • dcc_document_revision    — immutable per-release row capturing the
--                                  authoritative history (revision + effective
--                                  date + approver + signature + content hash
--                                  + filename at the time of release).
--                                  dcc_document_revision_history stays as the
--                                  state-transition audit log; dcc_document_revision
--                                  stores the released bodies themselves.
--     • dcc_document_header      — gains filename / filesystem_path /
--                                  filename_checksum columns to anchor the
--                                  filename↔DB contract.
--     • dcc_document_header_label — seeded with additional keys used by the
--                                  viewer header (status, doc_type, title).
--
--   After this migration, `DocumentControlService::release()` must INSERT a
--   row into dcc_document_revision and flip prior `is_current` to FALSE.
--   The legacy `DocumentController::approve()` path will be bridged to DCC
--   in the same tranche (PHP code change, not SQL).
--
-- Standards:
--   ISO 9001:2015 §7.5 • AS9100D §7.5 • IATF 16949 §7.5
--   FDA 21 CFR Part 820.40 (Document Controls)
--   FDA 21 CFR Part 11    (Electronic Records / Signatures)
--
-- Safety:
--   Additive only. All DDL guarded with IF NOT EXISTS. All seed data
--   guarded with ON CONFLICT DO NOTHING. No destructive writes.
--
-- Rollback (reverse order):
--   DROP TABLE IF EXISTS
--     dcc_document_revision,
--     dcc_doc_type_catalog,
--     dcc_role_catalog
--   CASCADE;
--   ALTER TABLE dcc_document_header
--     DROP COLUMN IF EXISTS filename,
--     DROP COLUMN IF EXISTS filesystem_path,
--     DROP COLUMN IF EXISTS filename_checksum;
--
-- Author: HESEM QMS Module — DCC consolidation sprint
-- Date:   2026-04-24
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — dcc_role_catalog
-- Source of truth for the owner / approver dropdowns. Single-role invariant
-- is enforced by the same regex the header table uses, so a catalog entry
-- cannot accidentally introduce `QA/QMS` or `CEO, MD` into the system.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_role_catalog (
    role_code        VARCHAR(40)  PRIMARY KEY,
    label_vi         VARCHAR(120) NOT NULL,
    label_en         VARCHAR(120) NOT NULL,
    role_class       VARCHAR(20)  NOT NULL,
    description      TEXT,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order       SMALLINT     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_dcc_role_single
        CHECK (role_code !~ '[/,;|]' AND position(' ' in role_code) = 0),
    CONSTRAINT ck_dcc_role_class
        CHECK (role_class IN ('owner', 'approver', 'both'))
);

CREATE INDEX IF NOT EXISTS idx_dcc_role_class
    ON dcc_role_catalog (role_class, sort_order)
    WHERE is_active = TRUE;

COMMENT ON TABLE  dcc_role_catalog
    IS 'DCC: registry of owner / approver role codes. Source of truth for dropdowns. Single-role invariant enforced at DB level.';
COMMENT ON COLUMN dcc_role_catalog.role_class
    IS 'owner | approver | both. Filters which dropdown a role appears in.';

DROP TRIGGER IF EXISTS trg_dcc_role_touch ON dcc_role_catalog;
CREATE TRIGGER trg_dcc_role_touch
    BEFORE UPDATE ON dcc_role_catalog
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

-- Seed: HESEM canonical role set (no multi-role strings; "QA/QMS" is split
-- into two separate entries 'QA' and 'QMS'; the portal picker displays the
-- localized label which may read "QA / QMS" but the stored role_code is
-- always single-token).
INSERT INTO dcc_role_catalog
    (role_code, label_vi,                         label_en,                         role_class, sort_order)
VALUES
    ('QA',        'QA — Đảm bảo chất lượng',        'QA — Quality Assurance',           'both',      10),
    ('QMS',       'QMS — Quản lý hệ thống chất lượng','QMS — Quality Management System', 'both',      11),
    ('QMR',       'QMR — Đại diện lãnh đạo chất lượng','QMR — Quality Management Rep',  'approver',  12),
    ('QC',        'QC — Kiểm soát chất lượng',      'QC — Quality Control',             'owner',     13),
    ('CEO',       'Tổng Giám Đốc',                  'Chief Executive Officer',           'approver',  20),
    ('MD',        'Giám Đốc Điều Hành',             'Managing Director',                 'approver',  21),
    ('GM',        'General Manager',                'General Manager',                   'approver',  22),
    ('COO',       'Giám Đốc Vận Hành',              'Chief Operating Officer',           'approver',  23),
    ('PROD',      'Sản xuất',                       'Production',                        'owner',     30),
    ('ENG',       'Kỹ thuật',                       'Engineering',                       'owner',     31),
    ('MAINT',     'Bảo trì',                        'Maintenance',                       'owner',     32),
    ('WH',        'Kho',                            'Warehouse',                         'owner',     33),
    ('PLAN',      'Kế hoạch',                       'Planning',                          'owner',     34),
    ('PUR',       'Mua hàng',                       'Purchasing',                        'owner',     35),
    ('SAL',       'Kinh doanh',                     'Sales',                             'owner',     36),
    ('HR',        'Nhân sự',                        'Human Resources',                   'owner',     37),
    ('FIN',       'Tài chính',                      'Finance',                           'owner',     38),
    ('IT',        'Công nghệ thông tin',            'Information Technology',            'owner',     39),
    ('EHS',       'An toàn & Môi trường',           'Environment, Health & Safety',      'owner',     40),
    ('DC',        'Kiểm soát tài liệu',             'Document Control',                  'owner',     41)
ON CONFLICT (role_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — dcc_doc_type_catalog
-- Source of truth for the document-type dropdown. Each row pairs with a
-- filename-family regex and sensible defaults for owner/approver, so new
-- documents inherit a correct baseline instead of the hardcoded QA/CEO.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_doc_type_catalog (
    doc_type              VARCHAR(40)  PRIMARY KEY,
    label_vi              VARCHAR(120) NOT NULL,
    label_en              VARCHAR(120) NOT NULL,
    family_pattern        VARCHAR(120) NOT NULL,
    default_owner_role    VARCHAR(40)  REFERENCES dcc_role_catalog(role_code),
    default_approver_role VARCHAR(40)  REFERENCES dcc_role_catalog(role_code),
    sort_order            SMALLINT     NOT NULL DEFAULT 0,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcc_doc_type_active
    ON dcc_doc_type_catalog (sort_order)
    WHERE is_active = TRUE;

COMMENT ON TABLE dcc_doc_type_catalog
    IS 'DCC: registry of document types (MAN, POL, SOP, WI, …). Drives the type dropdown and defaulting of owner/approver for new documents.';

DROP TRIGGER IF EXISTS trg_dcc_doc_type_touch ON dcc_doc_type_catalog;
CREATE TRIGGER trg_dcc_doc_type_touch
    BEFORE UPDATE ON dcc_doc_type_catalog
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

INSERT INTO dcc_doc_type_catalog
    (doc_type, label_vi,                 label_en,               family_pattern,       default_owner_role, default_approver_role, sort_order)
VALUES
    ('MAN',   'Sổ tay',                   'Manual',                '^qms-man-\d+',       'QMS',   'CEO', 10),
    ('POL',   'Chính sách',               'Policy',                '^pol-',              'QMS',   'CEO', 20),
    ('SOP',   'Quy trình',                'Standard Operating Procedure', '^sop-\d+',   'QA',    'QMR', 30),
    ('WI',    'Hướng dẫn công việc',      'Work Instruction',      '^wi-\d+',            'PROD',  'QA',  40),
    ('FRM',   'Biểu mẫu',                 'Form',                  '^frm-',              'QA',    'QA',  50),
    ('ANNEX', 'Phụ lục',                  'Annex',                 '^annex-',            'QMS',   'QMR', 60),
    ('JD',    'Mô tả công việc',          'Job Description',       '^jd-',               'HR',    'CEO', 70),
    ('DEPT',  'Cẩm nang phòng ban',       'Department Handbook',   '^dept-',             'HR',    'CEO', 80),
    ('ORG',   'Sơ đồ tổ chức',            'Organisation Chart',    '^(org|raci|authority)-', 'HR', 'CEO', 90),
    ('REF',   'Tham chiếu',               'Reference',             '^ref-',              'DC',    'QMR', 100),
    ('TRN',   'Đào tạo',                  'Training',              '^trn-',              'HR',    'QMR', 110)
ON CONFLICT (doc_type) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3 — dcc_document_header: filename anchor columns
-- These columns bind every header row to a single file on disk. Unique index
-- on filename prevents a rename from creating a duplicate header row silently.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE dcc_document_header
    ADD COLUMN IF NOT EXISTS filename          VARCHAR(200);

ALTER TABLE dcc_document_header
    ADD COLUMN IF NOT EXISTS filesystem_path   VARCHAR(400);

ALTER TABLE dcc_document_header
    ADD COLUMN IF NOT EXISTS filename_checksum VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dcc_header_filename
    ON dcc_document_header (filename)
    WHERE filename IS NOT NULL;

COMMENT ON COLUMN dcc_document_header.filename
    IS 'Current filesystem basename (e.g. qms-man-001-qms-manual.html). Filename is master for code + slug; this column keeps DB aware of the current name so `rename_doc` can assert filename uniqueness without scanning disk.';
COMMENT ON COLUMN dcc_document_header.filesystem_path
    IS 'Current path relative to repo root (e.g. mom/docs/system/qms-man-001-qms-manual.html).';
COMMENT ON COLUMN dcc_document_header.filename_checksum
    IS 'sha256 of the filename at last observation. Used by audit.php to detect drift between scan cache and DB.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4 — dcc_document_revision
-- One row per released revision. This is the immutable body-level history,
-- distinct from dcc_document_revision_history (which is the state-transition
-- log). Here we capture: what content was released, when, by whom, under
-- which DCN, with which signature, and which was current at the time.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dcc_document_revision (
    revision_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code           VARCHAR(80)  NOT NULL REFERENCES dcc_document_header(doc_code) ON UPDATE CASCADE,
    revision           VARCHAR(20)  NOT NULL,
    update_type        VARCHAR(10)  NOT NULL DEFAULT 'minor',
    effective_date     DATE         NOT NULL,
    content_sha256     VARCHAR(64),
    content_path       VARCHAR(400),
    filename           VARCHAR(200),
    dcr_id             UUID         REFERENCES dcc_document_change_request(dcr_id),
    dcn_id             UUID         REFERENCES dcc_document_change_notice(dcn_id),
    approved_by        VARCHAR(120) NOT NULL,
    approved_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    released_by        VARCHAR(120),
    released_at        TIMESTAMPTZ,
    signature_event_id UUID,
    superseded_by      UUID         REFERENCES dcc_document_revision(revision_id),
    is_current         BOOLEAN      NOT NULL DEFAULT FALSE,
    note               TEXT,
    metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_dcc_revision_pattern
        CHECK (revision ~ '^V[0-9]+(\.[0-9]+)?$'),
    CONSTRAINT ck_dcc_revision_update_type
        CHECK (update_type IN ('major', 'minor', 'patch')),
    CONSTRAINT uq_dcc_revision_doc_rev
        UNIQUE (doc_code, revision)
);

-- Only one "current" revision per document.
CREATE UNIQUE INDEX IF NOT EXISTS ux_dcc_revision_is_current
    ON dcc_document_revision (doc_code)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_dcc_revision_doc_released
    ON dcc_document_revision (doc_code, released_at DESC)
    WHERE released_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcc_revision_dcn
    ON dcc_document_revision (dcn_id)
    WHERE dcn_id IS NOT NULL;

COMMENT ON TABLE  dcc_document_revision
    IS 'DCC: immutable per-revision record. One row per approved/released revision. is_current flips on release; prior row flips to FALSE. Paired with dcc_document_revision_history (state-transition log).';
COMMENT ON COLUMN dcc_document_revision.content_sha256
    IS 'sha256 of the released HTML at the moment of release. Evidence for FDA 21 CFR Part 11 §11.10(e) integrity checks.';
COMMENT ON COLUMN dcc_document_revision.signature_event_id
    IS 'FK to eqms_electronic_signature_event when electronic signature is captured (Part 11 §11.70).';

-- Append-only guard on body-critical fields. Small mutable surface allowed
-- for is_current and superseded_by — those are flipped by release() /
-- supersede() workflows — but the history-defining fields cannot change.
CREATE OR REPLACE FUNCTION dcc_revision_forbid_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.doc_code          IS DISTINCT FROM OLD.doc_code          THEN
        RAISE EXCEPTION 'dcc_document_revision.doc_code is immutable';
    END IF;
    IF NEW.revision          IS DISTINCT FROM OLD.revision          THEN
        RAISE EXCEPTION 'dcc_document_revision.revision is immutable';
    END IF;
    IF NEW.content_sha256    IS DISTINCT FROM OLD.content_sha256
       AND OLD.content_sha256 IS NOT NULL THEN
        RAISE EXCEPTION 'dcc_document_revision.content_sha256 is immutable once set';
    END IF;
    IF NEW.approved_by       IS DISTINCT FROM OLD.approved_by
       AND OLD.approved_by    IS NOT NULL THEN
        RAISE EXCEPTION 'dcc_document_revision.approved_by is immutable once set';
    END IF;
    IF NEW.approved_at       IS DISTINCT FROM OLD.approved_at
       AND OLD.approved_at    IS NOT NULL THEN
        RAISE EXCEPTION 'dcc_document_revision.approved_at is immutable once set';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dcc_revision_immutable ON dcc_document_revision;
CREATE TRIGGER trg_dcc_revision_immutable
    BEFORE UPDATE ON dcc_document_revision
    FOR EACH ROW EXECUTE FUNCTION dcc_revision_forbid_mutation();

-- DELETE forbidden outright — Part 11 append-only.
CREATE OR REPLACE FUNCTION dcc_revision_forbid_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'dcc_document_revision is append-only; DELETE forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dcc_revision_no_delete ON dcc_document_revision;
CREATE TRIGGER trg_dcc_revision_no_delete
    BEFORE DELETE ON dcc_document_revision
    FOR EACH ROW EXECUTE FUNCTION dcc_revision_forbid_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5 — FK constraint on owner / approver role codes
-- Upgrade the header table to reference the role catalog. Header rows
-- previously persisted free-text role codes; the regex CHECK still stops
-- multi-role strings, but referencing the catalog means a typo ('QAA') or a
-- retired role ('PQM') can no longer leak into a header row.
--
-- Deferred: the ALTER is NOT VALID so existing rows are accepted as-is.
-- A follow-up script (validated after backfill) will run VALIDATE CONSTRAINT.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_dcc_header_owner_role'
    ) THEN
        ALTER TABLE dcc_document_header
            ADD CONSTRAINT fk_dcc_header_owner_role
            FOREIGN KEY (owner_role_code) REFERENCES dcc_role_catalog(role_code)
            NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_dcc_header_approver_role'
    ) THEN
        ALTER TABLE dcc_document_header
            ADD CONSTRAINT fk_dcc_header_approver_role
            FOREIGN KEY (approver_role_code) REFERENCES dcc_role_catalog(role_code)
            NOT VALID;
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6 — Extend dcc_document_header_label with additional keys
-- The viewer ribbon needs title / status / doc_type strings, which the
-- original seed in migration 150 did not cover. Legacy frontend used
-- `T('gd')`, `T('owner')`, etc.; those go away once the labels live here.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO dcc_document_header_label
    (label_key,    locale, short_label, long_label,              help_text,                                           sort_order)
VALUES
    ('title',       'en',  'Title',     'Document title',        'Full human-readable title.',                         5),
    ('title',       'vi',  'Tên',       'Tên tài liệu',          'Tên đầy đủ của tài liệu.',                            5),
    ('status',      'en',  'Status',    'Status',                'Lifecycle state.',                                   70),
    ('status',      'vi',  'TT',        'Trạng thái',            'Trạng thái chu kỳ sống.',                             70),
    ('doc_type',    'en',  'Type',      'Document type',         'Category (MAN, SOP, WI, …).',                        80),
    ('doc_type',    'vi',  'Loại',      'Loại tài liệu',         'Phân loại tài liệu.',                                 80),
    ('update_type', 'en',  'Change',    'Change type',           'Major / minor / patch update.',                      85),
    ('update_type', 'vi',  'Thay đổi',  'Loại thay đổi',         'Major / minor / patch.',                              85)
ON CONFLICT (label_key, locale) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 7 — Post-migration audit summary
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_roles      INTEGER;
    v_doc_types  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_roles     FROM dcc_role_catalog     WHERE is_active = TRUE;
    SELECT COUNT(*) INTO v_doc_types FROM dcc_doc_type_catalog WHERE is_active = TRUE;
    RAISE NOTICE '[Migration 155] % active roles, % active doc types seeded.', v_roles, v_doc_types;
END;
$$;

COMMIT;
