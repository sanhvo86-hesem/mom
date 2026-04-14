-- ============================================================================
-- Migration 115: Add missing foreign key indexes for query performance
-- ============================================================================
-- Purpose:
--   These indexes were identified as missing in Round 6 security audit.
--   They improve performance of queries on foreign key columns and ensure
--   that cascading operations are efficient.
-- ============================================================================

BEGIN;

-- Foreign key indexes for MES release record tracking
CREATE INDEX IF NOT EXISTS idx_mes_release_record_target_aggregate_id
    ON mes_trusted_release_record (target_aggregate_id) WHERE target_aggregate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_release_record_correlation_id
    ON mes_trusted_release_record (correlation_id) WHERE correlation_id IS NOT NULL;

-- Foreign key index for AI feedback loops
CREATE INDEX IF NOT EXISTS idx_ai_feedback_loops_prediction_id
    ON ai_feedback_loops (prediction_id);

-- ============================================================================
-- Fix audit column FK ON DELETE behavior (alter constraints to SET NULL)
-- These are done via DROP CONSTRAINT / ADD CONSTRAINT since ALTER CONSTRAINT
-- doesn't support changing ON DELETE in PostgreSQL
-- ============================================================================

DO $$
DECLARE
    t TEXT;
    col TEXT;
    constraint_name TEXT;
    delete_rule TEXT;
BEGIN
    FOR t, col IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE column_name IN ('created_by', 'updated_by', 'deleted_by')
          AND table_schema = 'public'
          AND udt_name = 'uuid'
    LOOP
        -- Find existing constraint and its delete rule
        SELECT tc.constraint_name, rc.delete_rule INTO constraint_name, delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = t
          AND kcu.column_name = col
          AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;

        -- Only modify the constraint if it doesn't already have ON DELETE SET NULL
        IF constraint_name IS NOT NULL AND delete_rule != 'SET NULL' THEN
            -- Drop and re-add with ON DELETE SET NULL
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, constraint_name);
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(user_id) ON DELETE SET NULL',
                           t, constraint_name, col);
        END IF;
    END LOOP;
END $$;

COMMIT;
