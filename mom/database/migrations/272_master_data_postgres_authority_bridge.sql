-- P45 V4 runtime closure: PostgreSQL authoritative bridge for governed master data.

ALTER TABLE master_data_store
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS record_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_master_data_store_entity_status
    ON master_data_store (entity_type, status);

CREATE TABLE IF NOT EXISTS master_data_history_event (
    event_id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(160) NOT NULL,
    action_name VARCHAR(80) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by VARCHAR(120),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_master_data_history_entity
    ON master_data_history_event (entity_type, entity_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS master_data_pending_change (
    pending_id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(160) NOT NULL,
    requested_by VARCHAR(120),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_master_data_pending_entity
    ON master_data_pending_change (entity_type, entity_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS master_data_archive_store (
    archive_id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(160) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'obsolete',
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_by VARCHAR(120),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_master_data_archive_entity
    ON master_data_archive_store (entity_type, entity_id, archived_at DESC);

CREATE TABLE IF NOT EXISTS master_data_fallback_telemetry (
    fallback_id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entity_type VARCHAR(80) NOT NULL,
    reason VARCHAR(120) NOT NULL,
    mode VARCHAR(40) NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS master_data_drift_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ok BOOLEAN NOT NULL DEFAULT FALSE,
    missing_in_postgres_total INTEGER NOT NULL DEFAULT 0,
    missing_in_json_total INTEGER NOT NULL DEFAULT 0,
    hash_mismatch_total INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION hesem_master_data_store_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.record_hash := encode(digest(COALESCE(NEW.data::text, '{}'), 'sha256'), 'hex');
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'digest') THEN
        DROP TRIGGER IF EXISTS trg_master_data_store_hash ON master_data_store;
        CREATE TRIGGER trg_master_data_store_hash
        BEFORE INSERT OR UPDATE ON master_data_store
        FOR EACH ROW EXECUTE FUNCTION hesem_master_data_store_hash();
    END IF;
END;
$$;
