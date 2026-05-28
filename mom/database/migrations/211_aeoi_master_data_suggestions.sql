-- ============================================================================
-- Migration 211: AEOI master-data suggestion queue
-- ============================================================================
-- Purpose:
--   Replace AeoiAutoCreateService's "write directly to master-data.json"
--   behaviour (GPT Pro audit P0-06) with a suggestion queue that humans
--   review before any record lands in the master data SSOT.
--
--   Before: AI extracts new customer/part → row appears in master-data.json
--           immediately, marked source='aeoi'. Risk: one mis-read PO
--           character creates a permanent ghost record.
--   After:  AI extracts new customer/part → row appears in
--           aeoi_master_data_suggestion with status='suggested'. QC opens
--           the case, accepts/rejects/edits the suggestion, then the
--           accepted ones are applied to master-data.json by a separate
--           explicit admin action.
--
--   Note: this migration ONLY adds the table. The AeoiAutoCreateService
--   refactor + admin UI tab come in a follow-up code change.
--
-- Standards:
--   ISO 9001 §7.5 (control of documented information),
--   ISO 9001 §8.5 (production and service provision — supplier/part identity).
-- Date: 2026-05-28
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS aeoi_master_data_suggestion (
    id                   BIGSERIAL    PRIMARY KEY,
    case_id              BIGINT       NOT NULL
        REFERENCES email_intake_case(id) ON DELETE CASCADE,
    suggestion_type      VARCHAR(20)  NOT NULL,
    suggested_key        VARCHAR(200) NOT NULL,
    suggested_payload    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    source               VARCHAR(40)  NOT NULL,
    source_evidence      JSONB,
    status               VARCHAR(20)  NOT NULL DEFAULT 'suggested',
    review_reason        TEXT,
    applied_target_id    VARCHAR(200),
    created_by           VARCHAR(120),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewed_by          VARCHAR(120),
    reviewed_at          TIMESTAMPTZ,
    applied_at           TIMESTAMPTZ,
    CONSTRAINT ck_aeoi_suggestion_type
        CHECK (suggestion_type IN ('customer', 'part', 'revision', 'ship_to')),
    CONSTRAINT ck_aeoi_suggestion_status
        CHECK (status IN ('suggested', 'approved', 'rejected', 'applied', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_aeoi_suggestion_case
    ON aeoi_master_data_suggestion(case_id);
CREATE INDEX IF NOT EXISTS idx_aeoi_suggestion_status
    ON aeoi_master_data_suggestion(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aeoi_suggestion_type_key
    ON aeoi_master_data_suggestion(suggestion_type, lower(suggested_key));

COMMENT ON TABLE aeoi_master_data_suggestion
    IS 'Pending master-data records extracted from AEOI cases. Humans review and explicitly accept before anything lands in master-data.json. Replaces direct auto-create per GPT Pro audit P0-06.';
COMMENT ON COLUMN aeoi_master_data_suggestion.suggestion_type
    IS 'customer | part | revision | ship_to';
COMMENT ON COLUMN aeoi_master_data_suggestion.suggested_key
    IS 'Primary identifier the AI extracted (customer_id, part_number, revision_number).';
COMMENT ON COLUMN aeoi_master_data_suggestion.status
    IS 'suggested = waiting review. approved = reviewer ok but not yet written. rejected = QC said no. applied = written to master-data.json. superseded = newer suggestion replaced this one.';
COMMENT ON COLUMN aeoi_master_data_suggestion.applied_target_id
    IS 'After status=applied, the final id in master-data.json (might differ from suggested_key if reviewer edited).';

-- Config flag: allow legacy direct auto-create in DEV environments only.
-- Production never writes master-data from LLM extraction.

INSERT INTO email_intake_config (
    id, enabled, poll_interval_minutes, last_poll_at, next_poll_at
) VALUES (DEFAULT, FALSE, 120, NULL, NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE email_intake_config
    ADD COLUMN IF NOT EXISTS aeoi_auto_create_master_data_dev_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN email_intake_config.aeoi_auto_create_master_data_dev_only
    IS 'When TRUE, AeoiAutoCreateService writes directly to master-data.json (legacy/dev behaviour). When FALSE (default), missing customer/part rows generate aeoi_master_data_suggestion rows instead. Production MUST stay FALSE per GPT Pro audit P0-06.';

COMMIT;
