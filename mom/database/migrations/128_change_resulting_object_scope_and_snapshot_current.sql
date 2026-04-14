-- ============================================================================
-- Migration 127: Change resulting-object scope and as-manufactured current guard
-- ============================================================================
-- Purpose:
--   Close two data-integrity gaps left after the initial control-plane cutover:
--   1) resulting objects must always be tied to a canonical affected object;
--   2) an as-manufactured subject must have at most one current snapshot.
-- ============================================================================

BEGIN;

UPDATE plm_change_resulting_objects ro
SET affected_object_id = ao.plm_change_affected_object_id
FROM plm_change_affected_objects ao
WHERE ro.affected_object_id IS NULL
  AND ao.plm_change_order_id = ro.plm_change_order_id
  AND lower(ao.object_type) = lower(ro.object_type)
  AND ao.object_id = ro.object_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM plm_change_resulting_objects
        WHERE affected_object_id IS NULL
    ) THEN
        RAISE EXCEPTION 'plm_change_resulting_objects contains orphan rows; backfill affected_object_id before applying migration 127';
    END IF;
END $$;

ALTER TABLE plm_change_resulting_objects
    ALTER COLUMN affected_object_id SET NOT NULL;

ALTER TABLE effectivity_conflicts
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ux_effectivity_conflicts_idempotency_key
    ON effectivity_conflicts (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

WITH ranked AS (
    SELECT
        as_manufactured_snapshot_id,
        row_number() OVER (
            PARTITION BY subject_type, subject_ref
            ORDER BY built_at DESC, as_manufactured_snapshot_id DESC
        ) AS rn
    FROM as_manufactured_snapshots
    WHERE snapshot_state = 'current'
)
UPDATE as_manufactured_snapshots s
SET snapshot_state = 'superseded',
    built_at = now(),
    row_version = row_version + 1
FROM ranked r
WHERE s.as_manufactured_snapshot_id = r.as_manufactured_snapshot_id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_as_manufactured_snapshots_one_current
    ON as_manufactured_snapshots (subject_type, subject_ref)
    WHERE snapshot_state = 'current';

COMMIT;
