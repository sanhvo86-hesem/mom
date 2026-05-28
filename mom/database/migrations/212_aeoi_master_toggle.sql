-- ============================================================================
-- Migration 212: AEOI master ON/OFF toggle
-- ============================================================================
-- Purpose:
--   Add a single boolean column to email_intake_config that lets an admin
--   pause the entire AI Order Intake module without deleting any settings.
--   When OFF:
--     - ScheduledJobs::runEmailInboxPoll() skips all IMAP polling and
--       returns status='skipped' with reason='master_disabled'.
--     - Orders > AI Intake Queue tab in the frontend shows a "Module
--       paused — enable in Admin → AI Order Intake Settings" banner and
--       disables all approval/commit actions.
--     - Existing cases in the queue stay readable (history is never
--       hidden) but operators cannot mutate them until master is back ON.
--   This is the kill-switch the AI Ops lead reaches for when an upstream
--   provider degrades (Anthropic rate-limit, Ollama OOM, Gmail IMAP down)
--   so the rest of the production line isn't impacted by retried failures.
--
-- Design notes:
--   - Default TRUE on existing installs so this migration is a no-op for
--     anyone whose AEOI module is currently enabled and working.
--   - On a fresh install the row is created with master_enabled=TRUE in
--     the existing config bootstrap.
--   - The flag is independent of email_intake_config.enabled (the
--     polling cron toggle that was there before). 'enabled' controls
--     whether the cron job is scheduled at all; 'aeoi_master_enabled' is
--     the runtime kill-switch that overrides per-mailbox enabled flags.
--
-- Standards:
--   ISO 9001 §6.1 (actions to address risks — system-wide pause is a
--   recognised risk-control), §8.5 (control of production — operator
--   must be able to pause the AI extraction line without touching
--   downstream order data).
-- Date: 2026-05-28
-- ============================================================================

BEGIN;

ALTER TABLE email_intake_config
    ADD COLUMN IF NOT EXISTS aeoi_master_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN email_intake_config.aeoi_master_enabled
    IS 'Master kill-switch for the entire AI Order Intake module. When FALSE: ScheduledJobs skip polling, frontend disables operator actions, existing data stays visible. Independent of email_intake_config.enabled (which controls cron scheduling).';

-- Ensure the singleton config row exists (idempotent).
INSERT INTO email_intake_config (
    id, enabled, poll_interval_minutes, last_poll_at, next_poll_at,
    aeoi_master_enabled
) VALUES (
    DEFAULT, FALSE, 120, NULL, NULL, TRUE
)
ON CONFLICT DO NOTHING;

-- Backfill any pre-existing row that was created before this column existed.
UPDATE email_intake_config
   SET aeoi_master_enabled = TRUE
 WHERE aeoi_master_enabled IS NULL;

COMMIT;
