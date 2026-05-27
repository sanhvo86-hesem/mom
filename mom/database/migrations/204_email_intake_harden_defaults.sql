-- ============================================================================
-- Migration 204: AEOI — Harden config defaults for production safety
-- ============================================================================
-- Purpose:
--   Phase 1 of AEOI (migration 203) shipped with permissive defaults intended
--   for development convenience. Before any real AI-driven SO/JO/WO commit
--   path is wired in, raise the default confidence threshold, default
--   auto_create_mode to review_queue, and ensure the singleton row reflects
--   the safer values. The CHECK constraint on auto_create_mode in migration
--   203 already restricts to draft / confirmed / review_queue — we keep that
--   range but flip the runtime default.
--
-- Standards:
--   ISO 9001 §8.2 (determination of requirements before commitment),
--   SOX §302 (management oversight of automated commercial entries).
-- Date: 2026-05-27
-- ============================================================================

BEGIN;

-- 1. Update column DEFAULTs so future inserts pick the safe values.
ALTER TABLE email_intake_config
    ALTER COLUMN confidence_threshold SET DEFAULT 0.95;

ALTER TABLE email_intake_config
    ALTER COLUMN auto_create_mode     SET DEFAULT 'review_queue';

-- 2. Patch the singleton row only when it still has the original Phase 1
--    permissive values (do not stomp values an admin has already tightened).
UPDATE email_intake_config
   SET confidence_threshold = 0.95,
       updated_at           = NOW(),
       updated_by           = 'system.migration_204'
 WHERE id = 1
   AND confidence_threshold = 0.75;

UPDATE email_intake_config
   SET auto_create_mode = 'review_queue',
       updated_at       = NOW(),
       updated_by       = 'system.migration_204'
 WHERE id = 1
   AND auto_create_mode = 'draft';

-- 3. Disable auto_cascade_jo unconditionally — JO creation from a customer
--    email is never safe until SO has cleared engineering_ready/in_production
--    via the existing OrderService gate. Admin can still re-enable per row
--    if they explicitly need it for testing, but production starts off.
UPDATE email_intake_config
   SET auto_cascade_jo = false,
       updated_at      = NOW(),
       updated_by      = 'system.migration_204'
 WHERE id = 1
   AND auto_cascade_jo = true;

-- 4. Force allowlist_enforcement = 'strict' when it was 'off'. The 'off'
--    mode bypasses the entire sender allowlist and is only acceptable in
--    dev mode where a banner clearly tells the operator it is on.
UPDATE email_intake_config
   SET allowlist_enforcement = 'strict',
       updated_at             = NOW(),
       updated_by             = 'system.migration_204'
 WHERE id = 1
   AND allowlist_enforcement = 'off';

COMMIT;
