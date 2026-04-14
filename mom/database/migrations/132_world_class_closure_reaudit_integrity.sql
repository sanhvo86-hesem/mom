-- ============================================================================
-- Migration 132: World-class closure re-audit integrity hardening
-- ============================================================================
-- Purpose:
--   Close the remaining P1 findings from the April 2026 closure re-audit:
--   1) e-signature rows must be relationally tied to consumed challenges;
--   2) explicit field authorization tokens are one-shot service authorities.
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_signature_events_auth_challenge_id
    ON signature_events (auth_challenge_id)
    WHERE auth_challenge_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_signature_events_auth_challenge'
    ) THEN
        ALTER TABLE signature_events
            ADD CONSTRAINT fk_signature_events_auth_challenge
            FOREIGN KEY (auth_challenge_id)
            REFERENCES e_signature_auth_challenges (auth_challenge_id)
            DEFERRABLE INITIALLY IMMEDIATE
            NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eqms_field_change_authorization_unconsumed
    ON eqms_field_change_authorization (
        plm_change_order_id,
        lower(object_type),
        object_id,
        field_path,
        authorized_effect,
        authorized_from DESC
    )
    WHERE consumed_at IS NULL;

COMMENT ON CONSTRAINT fk_signature_events_auth_challenge ON signature_events IS
    'Part 11 closure control: every signature event carrying an auth_challenge_id must link to a recorded e-signature challenge.';

COMMENT ON INDEX idx_eqms_field_change_authorization_unconsumed IS
    'Lookup index for one-shot explicit field authorization tokens; service consumes matching rows atomically before allowing governed edits.';

COMMIT;
