-- ============================================================================
-- Migration 093: Runtime observed contract columns
-- ============================================================================
-- Purpose:
--   Promote columns that already exist in the operational runtime database into
--   the schema authority so Data Schema reports real runtime contracts rather
--   than treating live, used columns as ungoverned extras.
--
-- No-data-loss rule:
--   Only additive ALTER TABLE operations, metadata/default backfill, and
--   non-destructive compatibility indexes are used here. Existing primary keys
--   and production data are not rewritten.
-- ============================================================================

-- Audit idempotency / deduplication hash observed in the operational audit path.
ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS source_event_hash TEXT;

DO $$
DECLARE
    audit_events_is_partitioned BOOLEAN := FALSE;
BEGIN
    SELECT c.relkind = 'p'
    INTO audit_events_is_partitioned
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_events';

    IF NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE n.nspname = 'public'
          AND t.relname = 'audit_events'
          AND i.indisunique
          AND i.indpred IS NULL
        GROUP BY i.indexrelid
        HAVING string_agg(a.attname, ',' ORDER BY k.ordinality) = 'source_event_hash'
            OR string_agg(a.attname, ',' ORDER BY k.ordinality) = 'source_event_hash,recorded_at'
    ) THEN
        IF audit_events_is_partitioned THEN
            CREATE UNIQUE INDEX ux_audit_events_source_event_hash_recorded_at
                ON audit_events (source_event_hash, recorded_at);
        ELSE
            CREATE UNIQUE INDEX ux_audit_events_source_event_hash
                ON audit_events (source_event_hash)
                WHERE source_event_hash IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Role metadata is used by the admin bootstrap/runtime authorization layer.
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Runtime bitemporal/audit stamps observed on access-control mappings.
ALTER TABLE user_roles
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Runtime revision stamps used by item revision screens and sync logic.
ALTER TABLE item_revisions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- MES event tables retain ingestion/update timestamps for replay safety.
ALTER TABLE mes_connectivity_events
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_downtime_events
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_equipment_extended
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_erp_reconciliation_exceptions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_erp_sync_runs
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_machine_alarms
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_material_consumption
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_operation_execution
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE mes_shift_handover
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE job_operations
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep the legacy runtime identifier visible as an alternate key while the
-- canonical registry key remains variable_id.
ALTER TABLE variable_registry
    ADD COLUMN IF NOT EXISTS variable_registry_id UUID,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE variable_registry
SET variable_registry_id = variable_id
WHERE variable_registry_id IS NULL;

ALTER TABLE variable_registry
    ALTER COLUMN variable_registry_id SET DEFAULT uuid_generate_v4(),
    ALTER COLUMN variable_registry_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_variable_registry_legacy_id
    ON variable_registry (variable_registry_id);
