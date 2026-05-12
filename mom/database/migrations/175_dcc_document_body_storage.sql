-- ============================================================================
-- Migration 175: DCC document body storage (Phase 2 of ADR-0013)
-- ----------------------------------------------------------------------------
-- Until now `dcc_document_header` (migration 150) holds metadata only —
-- the HTML body lives in mom/docs/**/*.html on the filesystem, in the same
-- git working tree as the source code. That co-location is what creates
-- the data-loss risk on `git reset --hard` and `rsync` failures during
-- deploy.
--
-- This migration adds the **content** home: an append-only, versioned,
-- content-addressed storage table for HTML document bodies. Every save
-- (draft / review / approved / released / superseded) inserts a new
-- row; rows are immutable. The currently-effective body for each
-- document × locale is exposed by view dcc_document_body_current.
--
-- Standards:
--   * 21 CFR Part 820.40                — Document Controls (versioned)
--   * 21 CFR Part 11 §11.10(b)(c)(e)    — verifiable copies + integrity
--   * ISO 9001:2015 §7.5                — Documented Information
--   * AS9100D §7.5                      — change control
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. dcc_document_body — append-only HTML storage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dcc_document_body (
    body_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code          VARCHAR(80)  NOT NULL,
    revision          VARCHAR(20)  NOT NULL,
    status            VARCHAR(30)  NOT NULL,
    locale            VARCHAR(10)  NOT NULL DEFAULT 'vi',
    body_html         TEXT         NOT NULL,
    body_sha256       CHAR(64)     NOT NULL,
    body_size         INTEGER      NOT NULL,
    source_path       TEXT,                              -- relative path the body was imported from (mom/docs/...), nullable when authored directly in DB
    metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        VARCHAR(150) NOT NULL DEFAULT 'system',
    change_ref        VARCHAR(120),
    -- Integrity
    CONSTRAINT ck_dcc_body_sha256_format
        CHECK (body_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_dcc_body_revision_format
        CHECK (revision ~ '^V[0-9]+(\.[0-9]+)?$' OR revision ~ '^[0-9]+(\.[0-9]+)?$'),
    CONSTRAINT ck_dcc_body_status
        CHECK (status IN ('draft','in_review','approved','released','superseded','obsolete')),
    -- One canonical row per (doc, rev, status, locale). A new save with the
    -- same coordinates means "supersede previous"; older rows are kept by
    -- bumping revision instead.
    CONSTRAINT uq_dcc_body_coords
        UNIQUE (doc_code, revision, status, locale)
);

COMMENT ON TABLE  dcc_document_body  IS 'Append-only versioned content store for DCC documents. Filesystem mom/docs/** is a derived projection.';
COMMENT ON COLUMN dcc_document_body.body_sha256 IS 'sha256(body_html) — content-addressed integrity check.';
COMMENT ON COLUMN dcc_document_body.source_path IS 'Filesystem path (relative to repo root) the body was imported from, if any.';

CREATE INDEX IF NOT EXISTS idx_dcc_body_doc_code
    ON dcc_document_body (doc_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcc_body_status
    ON dcc_document_body (doc_code, status);
CREATE INDEX IF NOT EXISTS idx_dcc_body_sha256
    ON dcc_document_body (body_sha256);

-- ---------------------------------------------------------------------------
-- 2. Append-only enforcement: forbid UPDATE / DELETE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dcc_document_body_immutable_tg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'dcc_document_body is append-only; % rejected on body_id=%',
        TG_OP, COALESCE(OLD.body_id, NEW.body_id);
END;
$$;

DROP TRIGGER IF EXISTS dcc_document_body_no_update ON dcc_document_body;
CREATE TRIGGER dcc_document_body_no_update
    BEFORE UPDATE ON dcc_document_body
    FOR EACH ROW
    EXECUTE FUNCTION dcc_document_body_immutable_tg();

DROP TRIGGER IF EXISTS dcc_document_body_no_delete ON dcc_document_body;
CREATE TRIGGER dcc_document_body_no_delete
    BEFORE DELETE ON dcc_document_body
    FOR EACH ROW
    EXECUTE FUNCTION dcc_document_body_immutable_tg();

-- ---------------------------------------------------------------------------
-- 3. Sha256 verification trigger
-- ---------------------------------------------------------------------------
-- Defence-in-depth: even if a buggy caller passes a wrong body_sha256, the
-- DB recomputes and rejects mismatches.
CREATE OR REPLACE FUNCTION dcc_document_body_verify_sha_tg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expected CHAR(64);
BEGIN
    v_expected := encode(digest(NEW.body_html, 'sha256'), 'hex');
    IF NEW.body_sha256 <> v_expected THEN
        RAISE EXCEPTION 'dcc_document_body sha256 mismatch: expected=% got=%',
            v_expected, NEW.body_sha256;
    END IF;
    NEW.body_size := length(NEW.body_html);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dcc_document_body_verify_sha ON dcc_document_body;
CREATE TRIGGER dcc_document_body_verify_sha
    BEFORE INSERT ON dcc_document_body
    FOR EACH ROW
    EXECUTE FUNCTION dcc_document_body_verify_sha_tg();

-- ---------------------------------------------------------------------------
-- 4. Currently-effective body view
-- ---------------------------------------------------------------------------
-- For each (doc_code, locale), expose the highest-priority status:
--   released > approved > in_review > draft > superseded > obsolete
-- and within the same status, the latest by created_at.
CREATE OR REPLACE VIEW dcc_document_body_current AS
SELECT b.*
  FROM dcc_document_body b
  JOIN (
        SELECT doc_code, locale, body_id
          FROM (
                SELECT
                    doc_code, locale, body_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY doc_code, locale
                        ORDER BY
                            CASE status
                                WHEN 'released'    THEN 0
                                WHEN 'approved'    THEN 1
                                WHEN 'in_review'   THEN 2
                                WHEN 'draft'       THEN 3
                                WHEN 'superseded'  THEN 4
                                WHEN 'obsolete'    THEN 5
                                ELSE                    6
                            END,
                            created_at DESC
                    ) AS rn
                  FROM dcc_document_body
               ) ranked
         WHERE rn = 1
       ) winners
       ON winners.body_id = b.body_id;

COMMENT ON VIEW dcc_document_body_current IS 'One row per (doc_code, locale) — the body that should currently render in portal.';

-- ---------------------------------------------------------------------------
-- 5. Header integrity link
-- ---------------------------------------------------------------------------
-- Add a column to dcc_document_header that records the sha256 of the body
-- corresponding to the currently-released revision. If header.revision and
-- (selected body row).revision diverge, a portal CI gate fails the build.
ALTER TABLE dcc_document_header
    ADD COLUMN IF NOT EXISTS released_body_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS released_body_id     UUID,
    ADD COLUMN IF NOT EXISTS released_at          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dcc_header_released_body
    ON dcc_document_header (released_body_id)
    WHERE released_body_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. data_collection_state seed advance + drift counter
-- ---------------------------------------------------------------------------
-- Now that the storage exists, mark the dcc_documents collection ready to
-- accept shadow writes. Operators flip the mode to 'shadow_write' once
-- backfill is verified (see runbook Phase 2 §3).
UPDATE data_collection_state
   SET postgres_table = 'dcc_document_body',
       description    = 'Controlled QMS HTML documents. Body now stored in dcc_document_body (migration 175). Filesystem mom/docs/** retained as cache during cutover.'
 WHERE collection_key = 'dcc_documents';

COMMIT;

-- Rollback:
-- DROP VIEW    IF EXISTS dcc_document_body_current;
-- ALTER TABLE  dcc_document_header
--   DROP COLUMN IF EXISTS released_body_sha256,
--   DROP COLUMN IF EXISTS released_body_id,
--   DROP COLUMN IF EXISTS released_at;
-- DROP TRIGGER IF EXISTS dcc_document_body_verify_sha ON dcc_document_body;
-- DROP TRIGGER IF EXISTS dcc_document_body_no_delete  ON dcc_document_body;
-- DROP TRIGGER IF EXISTS dcc_document_body_no_update  ON dcc_document_body;
-- DROP FUNCTION IF EXISTS dcc_document_body_verify_sha_tg();
-- DROP FUNCTION IF EXISTS dcc_document_body_immutable_tg();
-- DROP TABLE IF EXISTS dcc_document_body;
