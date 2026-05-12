-- ============================================================================
-- Migration 172: disposal_event table + close-campaign columns
-- ----------------------------------------------------------------------------
-- Backs the new admin tab actions:
--   * POST /api/v1/retention/{recordId}:dispose   (chain-of-custody)
--   * POST /api/v1/access-review/campaigns/{id}:close
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- 1. disposal_event ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS disposal_event (
    id                 uuid                     PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id          varchar(120)             NOT NULL,
    actor_user_id      uuid,
    witness_user_id    uuid,
    method_used        varchar(40)              NOT NULL,
    location           text,
    notes              text                     NOT NULL,
    actor_reason       text,
    disposed_at        timestamptz              NOT NULL DEFAULT now(),
    row_version        integer                  NOT NULL DEFAULT 1,
    created_at         timestamptz              NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disposal_event_record_id ON disposal_event (record_id);
CREATE INDEX IF NOT EXISTS idx_disposal_event_disposed_at ON disposal_event (disposed_at DESC);

-- 2. access_review_campaign close columns ------------------------------------
ALTER TABLE access_review_campaign
    ADD COLUMN IF NOT EXISTS closed_at        timestamptz,
    ADD COLUMN IF NOT EXISTS close_reason     text,
    ADD COLUMN IF NOT EXISTS pending_at_close integer,
    ADD COLUMN IF NOT EXISTS row_version      integer NOT NULL DEFAULT 1;

COMMIT;
