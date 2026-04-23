-- ============================================================================
-- Migration 152: DCC document locale variants and translation artifacts
-- ============================================================================
-- Purpose:
--   Introduce an authoritative locale layer for controlled QMS documents so
--   the portal can switch language without browser-side DOM translation.
--
-- Core rules:
--   - The canonical document body remains the Vietnamese source edited in the
--     existing controlled HTML file.
--   - Non-canonical locales (for example English) are stored as explicit
--     locale variants with their own metadata projection and optional artifact.
--   - The portal must render an artifact only when an artifact path exists and
--     the variant state allows publication. No Google Translate / live DOM
--     mutation is permitted.
--
-- Standards:
--   ISO 9001:2015 §7.5, AS9100D §7.5, FDA 21 CFR Part 11, FDA 21 CFR 820.40.
-- Date:
--   2026-04-23
-- ============================================================================

BEGIN;

ALTER TABLE dcc_document_header
    ALTER COLUMN locale_default SET DEFAULT 'vi';

CREATE TABLE IF NOT EXISTS dcc_document_locale_variant (
    locale_variant_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code               VARCHAR(80)   NOT NULL REFERENCES dcc_document_header(doc_code) ON UPDATE CASCADE ON DELETE CASCADE,
    locale                 VARCHAR(10)   NOT NULL,
    title                  VARCHAR(512),
    subtitle               VARCHAR(512),
    artifact_rel_path      VARCHAR(1024),
    artifact_source_revision VARCHAR(20),
    artifact_source_hash_sha256 VARCHAR(128),
    translation_state      VARCHAR(30)   NOT NULL DEFAULT 'machine_preview',
    translation_provider   VARCHAR(120),
    glossary_version       VARCHAR(80),
    engine_version         VARCHAR(80),
    reviewer_party_id      VARCHAR(120),
    reviewed_at            TIMESTAMPTZ,
    published_at           TIMESTAMPTZ,
    metadata               JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by             VARCHAR(120)  NOT NULL DEFAULT 'system',
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by             VARCHAR(120)  NOT NULL DEFAULT 'system',
    UNIQUE (doc_code, locale),
    CONSTRAINT ck_dcc_doc_locale_variant_state
        CHECK (translation_state IN (
            'machine_preview',
            'review_pending',
            'reviewed',
            'released',
            'superseded',
            'blocked'
        )),
    CONSTRAINT ck_dcc_doc_locale_variant_artifact_extension
        CHECK (
            artifact_rel_path IS NULL
            OR artifact_rel_path ~ '\.(html?|pdf|docx|xlsx|pptx)$'
        )
);

CREATE INDEX IF NOT EXISTS idx_dcc_doc_locale_variant_locale
    ON dcc_document_locale_variant (locale, translation_state, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_dcc_doc_locale_variant_doc
    ON dcc_document_locale_variant (doc_code, locale);

COMMENT ON TABLE dcc_document_locale_variant
    IS 'DCC: locale-specific document metadata and optional published artifact path. Browser live translation is forbidden; frontend must use these rows.';
COMMENT ON COLUMN dcc_document_locale_variant.artifact_rel_path
    IS 'Repository-relative path to the published locale artifact, typically a hidden sibling file such as _filename.en.html so the main scan excludes it.';
COMMENT ON COLUMN dcc_document_locale_variant.translation_state
    IS 'machine_preview | review_pending | reviewed | released | superseded | blocked. Only reviewed/released or explicitly allowed preview states should render.';
COMMENT ON COLUMN dcc_document_locale_variant.artifact_source_hash_sha256
    IS 'Hash of the canonical source content used to generate this locale artifact; used for drift detection and retranslate queues.';

DROP TRIGGER IF EXISTS trg_dcc_doc_locale_variant_touch ON dcc_document_locale_variant;
CREATE TRIGGER trg_dcc_doc_locale_variant_touch
    BEFORE UPDATE ON dcc_document_locale_variant
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

COMMIT;
