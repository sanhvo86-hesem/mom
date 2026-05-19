-- ============================================================================
-- Migration 189: Translation Review Module — post-translation QC by Haiku
-- ============================================================================
-- Purpose:
--   After the machine translator (Claude Opus / NLLB / Argos) writes the
--   English locale artifact for a DCC document, an automated reviewer
--   (Claude Haiku 4.5) reads source VN + translated EN paragraph-by-paragraph
--   and emits a JSON report flagging defects. This migration adds:
--     1. translation_review_run    — ledger of every reviewer call
--     2. translation_routing extra columns:
--          system_prompt_override  — per-tier / per-doc system prompt
--          reviewer_enabled        — opt-in flip per routing rule
--          reviewer_provider       — separate model for reviewer
--          reviewer_model
--     3. dcc_document_locale_variant.last_review_outcome
--          fast lookup for admin "Translated Docs" tab badge.
--
-- Design contract:
--   - Reviewer runs AFTER translation_quality_gate passes. It is an
--     additional layer, not a replacement.
--   - Reviewer outcome ∈ {pass, advisory, fail}:
--       pass     → variant state unchanged (machine_preview or higher)
--       advisory → variant.metadata.review_advisory populated, state unchanged
--       fail     → variant flipped back to 'blocked', admin sees red badge
--   - Re-translate loop is OUT OF SCOPE for this migration. Operator
--     clicks "Retranslate" manually in the admin UI after reading the issues.
--
-- Standards:
--   ISO 9001 §7.5 (control of documented information),
--   ISO 9001 §8.6 (release of products and services — verification),
--   ISO 27001 A.12.4 (logging and monitoring).
-- Date: 2026-05-20
-- ============================================================================

BEGIN;

-- ── 1. Review run ledger ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS translation_review_run (
    review_id            BIGSERIAL    PRIMARY KEY,
    doc_code             VARCHAR(80)  NOT NULL,
    locale_code          VARCHAR(20)  NOT NULL DEFAULT 'en',
    variant_id           BIGINT,
    source_revision      VARCHAR(40),
    source_hash_sha256   VARCHAR(80),
    reviewer_provider    VARCHAR(40)  NOT NULL DEFAULT 'claude_cli',
    reviewer_model       VARCHAR(120) NOT NULL DEFAULT 'haiku-4-5',
    outcome              VARCHAR(20)  NOT NULL,
    paragraphs_reviewed  INT          NOT NULL DEFAULT 0,
    issues_critical      INT          NOT NULL DEFAULT 0,
    issues_advisory      INT          NOT NULL DEFAULT 0,
    summary              TEXT,
    issues_jsonb         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    usage_input_tokens   INT,
    usage_output_tokens  INT,
    usage_cached_tokens  INT,
    duration_ms          INT,
    error_message        TEXT,
    iteration_num        INT          NOT NULL DEFAULT 1,
    triggered_by         VARCHAR(120),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_translation_review_outcome
        CHECK (outcome IN ('pass', 'advisory', 'fail', 'error', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_translation_review_doc_time
    ON translation_review_run(doc_code, locale_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_translation_review_outcome
    ON translation_review_run(outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_translation_review_variant
    ON translation_review_run(variant_id, created_at DESC);

COMMENT ON TABLE translation_review_run
    IS 'Ledger of post-translation reviewer calls (Haiku 4.5). One row per review attempt per variant revision. Outcome drives the admin badge + whether the variant flips to blocked.';
COMMENT ON COLUMN translation_review_run.issues_jsonb
    IS 'Array of {segment, severity, category, vi_excerpt, en_excerpt, explanation, suggestion}. Max 25 issues per row (reviewer-enforced).';
COMMENT ON COLUMN translation_review_run.iteration_num
    IS 'Increments if the same source_hash is re-translated and re-reviewed (future re-translate loop).';

-- ── 2. Routing-level reviewer + prompt override ─────────────────────────────

ALTER TABLE translation_routing
    ADD COLUMN IF NOT EXISTS system_prompt_override TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS reviewer_provider VARCHAR(40),
    ADD COLUMN IF NOT EXISTS reviewer_model VARCHAR(120);

COMMENT ON COLUMN translation_routing.system_prompt_override
    IS 'Optional per-rule override of mom/data/config/translator-system-prompt.md. NULL = use the file. Useful for tier-specific or doc-specific prompt customization.';
COMMENT ON COLUMN translation_routing.reviewer_enabled
    IS 'When true, post-translation reviewer (Haiku) runs after the translator artifact is written. Default true.';
COMMENT ON COLUMN translation_routing.reviewer_provider
    IS 'Provider key for the reviewer. Defaults to claude_cli. Future: separate provider entries.';
COMMENT ON COLUMN translation_routing.reviewer_model
    IS 'Model id for reviewer. Default haiku-4-5. Override per rule e.g. sonnet-4-6 or opus.';

-- ── 3. Fast review-outcome lookup on the variant table ──────────────────────

ALTER TABLE dcc_document_locale_variant
    ADD COLUMN IF NOT EXISTS last_review_outcome VARCHAR(20),
    ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_review_issues_critical INT,
    ADD COLUMN IF NOT EXISTS last_review_issues_advisory INT,
    ADD COLUMN IF NOT EXISTS last_review_id BIGINT REFERENCES translation_review_run(review_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_locale_variant_review_outcome
    ON dcc_document_locale_variant(last_review_outcome)
    WHERE last_review_outcome IS NOT NULL;

COMMENT ON COLUMN dcc_document_locale_variant.last_review_outcome
    IS 'Cached most-recent reviewer outcome for fast badge rendering in admin UI. Updated by DocumentLocaleAutomationService after each reviewer call. Detailed issues live in translation_review_run.';

-- ── 4. Default reviewer routing seed (global) ───────────────────────────────
--
-- The reviewer_provider/reviewer_model columns on translation_routing are
-- optional overrides. The PHP service resolves the active reviewer via:
--   1. rule-level reviewer_provider/reviewer_model (set per routing rule)
--   2. fallback to env DCC_REVIEWER_MODEL (set by ops)
--   3. fallback to hardcoded 'claude_cli' / 'haiku-4-5'
--
-- No seed row is strictly required, but if a global_default rule exists
-- we attach the reviewer defaults so the admin UI shows the chain clearly.

UPDATE translation_routing
SET reviewer_enabled = TRUE,
    reviewer_provider = COALESCE(reviewer_provider, 'claude_cli'),
    reviewer_model = COALESCE(reviewer_model, 'haiku-4-5')
WHERE scope_type = 'global_default';

COMMIT;
