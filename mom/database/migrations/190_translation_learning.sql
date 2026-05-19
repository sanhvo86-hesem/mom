-- ============================================================================
-- Migration 190: Translation Learning — recurring-error memory for the engine
-- ============================================================================
-- Purpose:
--   The post-translation reviewer (Claude Haiku 4.5, migration 189) emits a
--   structured list of issues. We capture each issue as a row in
--   `translation_learning` so future translations of OTHER documents can
--   benefit from the corrections discovered in past runs.
--
--   Workflow:
--     1. Reviewer ends a run, writes translation_review_run.issues_jsonb.
--        TranslationLearningService.recordIssuesFromReview() walks the issues
--        and upserts a row per unique (vi_pattern, en_wrong_pattern, category)
--        triplet with status='auto' (NOT yet active).
--     2. Admin opens the "Learnings" tab in the translation admin module,
--        reviews each auto-captured row, and either:
--          - clicks Approve → status='approved' (row joins the active prompt
--            block); or
--          - clicks Disable → status='disabled' (kept for audit, never used).
--     3. Before every translate-or-review call, the active prompt block
--        (text rendered from approved rows) is loaded by the python adapters
--        and prepended to the user prompt so the LLM sees the do/don't pairs.
--        File path: mom/data/cache/translation-learning-block.md
--        Refreshed on every approve/disable mutation.
--
-- Design contract:
--   - Global scope (one shared knowledge base across all doc types). A future
--     migration may add a scope column if per-tier knowledge becomes useful.
--   - Deduplication key: sha256 of (lower(vi_pattern) || '|' || lower(category)).
--     `en_wrong_pattern` is informational, not part of the key, because the
--     same Vietnamese phrase can produce several wrong English variants and
--     we want a single learning row per VI cause.
--   - Status workflow: auto → approved | disabled. Approved is the ONLY
--     status that gets injected into prompts (per user decision 2026-05-20:
--     auto-capture should NOT auto-train, to avoid prompt pollution).
--   - hit_count counts every occurrence of the same VI pattern across docs,
--     to give admins a "promote this first" signal in the UI.
--
-- Standards:
--   ISO 9001 §7.5.3 (control of documented information — managed knowledge),
--   ISO 9001 §7.1.6 (organizational knowledge),
--   ISO 27001 A.12.4 (logging and monitoring).
-- Date: 2026-05-20
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS translation_learning (
    learning_id         BIGSERIAL    PRIMARY KEY,
    dedupe_hash         VARCHAR(64)  NOT NULL,
    vi_pattern          TEXT         NOT NULL,
    en_wrong_pattern    TEXT,
    en_correct          TEXT,
    category            VARCHAR(40)  NOT NULL,
    severity            VARCHAR(20)  NOT NULL DEFAULT 'advisory',
    explanation         TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'auto',
    hit_count           INT          NOT NULL DEFAULT 1,
    first_seen_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    doc_codes           JSONB        NOT NULL DEFAULT '[]'::jsonb,
    last_review_id      BIGINT       REFERENCES translation_review_run(review_id) ON DELETE SET NULL,
    created_by          VARCHAR(120),
    updated_by          VARCHAR(120),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notes               TEXT,
    CONSTRAINT ck_translation_learning_status
        CHECK (status IN ('auto', 'approved', 'disabled')),
    CONSTRAINT ck_translation_learning_severity
        CHECK (severity IN ('critical', 'advisory')),
    CONSTRAINT uq_translation_learning_dedupe
        UNIQUE (dedupe_hash)
);

CREATE INDEX IF NOT EXISTS idx_translation_learning_status_hits
    ON translation_learning(status, hit_count DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_translation_learning_category
    ON translation_learning(category, status);
CREATE INDEX IF NOT EXISTS idx_translation_learning_last_seen
    ON translation_learning(last_seen_at DESC);

COMMENT ON TABLE translation_learning
    IS 'Curated memory of recurring translation errors. Auto-populated from translation_review_run.issues_jsonb; admin approves the entries that should influence future translator + reviewer prompts.';
COMMENT ON COLUMN translation_learning.dedupe_hash
    IS 'sha256(lower(vi_pattern) || ''|'' || lower(category)). One VI cause = one row, even when it produces multiple wrong English variants.';
COMMENT ON COLUMN translation_learning.vi_pattern
    IS 'The Vietnamese excerpt that triggered the issue (canonical short form, ≤ 200 chars).';
COMMENT ON COLUMN translation_learning.en_wrong_pattern
    IS 'The wrong English output the translator produced. Informational only — the LLM is told NOT to produce this; key collisions ignore it.';
COMMENT ON COLUMN translation_learning.en_correct
    IS 'The reviewer''s suggested correct rendering. Used as the right-hand side of the "do this" rule.';
COMMENT ON COLUMN translation_learning.category
    IS 'Mirrors translation_review_run.issues[].category — vietnamese_residue, expanded_acronym, wrong_terminology, word_salad, …';
COMMENT ON COLUMN translation_learning.status
    IS 'auto = captured but inactive; approved = injected into translator+reviewer prompts; disabled = kept for audit, never used.';
COMMENT ON COLUMN translation_learning.hit_count
    IS 'Number of times this VI pattern has been seen across reviews. Higher counts surface first in the admin UI.';
COMMENT ON COLUMN translation_learning.doc_codes
    IS 'JSONB array of doc_codes where this pattern was observed (deduplicated, capped at 25 entries).';

-- Touch trigger so updated_at is automatic.
DROP TRIGGER IF EXISTS trg_translation_learning_touch ON translation_learning;
CREATE TRIGGER trg_translation_learning_touch
    BEFORE UPDATE ON translation_learning
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

COMMIT;
