-- ============================================================================
-- Migration 101: eQMS Control Plane Foundation
-- ============================================================================
-- Purpose:
--   Add the append-only control-plane primitives needed for governed commands,
--   audit hash verification, electronic signatures, and domain outbox events.
--
-- Data safety:
--   Additive migration. Existing legacy routes and JSON stores keep working.
--
-- Rollback:
--   DROP TABLE IF EXISTS domain_outbox_events, eqms_electronic_signature_event CASCADE;
--   DROP FUNCTION IF EXISTS eqms_prevent_update_delete() CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Align the audit table with AuditTrail.php. These columns are added to the
-- partitioned parent so existing/future partitions inherit the contract.
ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS esig_reason TEXT,
    ADD COLUMN IF NOT EXISTS prev_hash CHAR(64),
    ADD COLUMN IF NOT EXISTS event_hash CHAR(64),
    ADD COLUMN IF NOT EXISTS esig JSONB,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT,
    ADD COLUMN IF NOT EXISTS command_id TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_events_event_hash
    ON audit_events (event_hash, recorded_at)
    WHERE event_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_events_correlation
    ON audit_events (correlation_id, recorded_at)
    WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION eqms_prevent_update_delete()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'eqms immutable record cannot be updated or deleted: %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_events_immutable_update ON audit_events;
CREATE TRIGGER trg_audit_events_immutable_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_audit_events_immutable_delete ON audit_events;
CREATE TRIGGER trg_audit_events_immutable_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

CREATE TABLE IF NOT EXISTS domain_outbox_events (
    domain_outbox_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type         TEXT        NOT NULL,
    aggregate_id           TEXT        NOT NULL,
    event_type             TEXT        NOT NULL,
    payload                JSONB       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                 TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'done', 'failed', 'dead_letter')),
    attempts               INT         NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at        TIMESTAMPTZ,
    last_attempt_at        TIMESTAMPTZ,
    idempotency_key        TEXT,
    correlation_id         TEXT,
    org_company_code       VARCHAR(30),
    org_legal_entity_code  VARCHAR(30),
    org_plant_id           VARCHAR(30),
    org_site_id            VARCHAR(30),
    source_system          VARCHAR(80)  NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    payload_schema_version VARCHAR(30)  NOT NULL DEFAULT '1.0',
    error_class            TEXT,
    error_message          TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_domain_outbox_pending
    ON domain_outbox_events (status, next_attempt_at, occurred_at);

CREATE INDEX IF NOT EXISTS idx_domain_outbox_aggregate
    ON domain_outbox_events (aggregate_type, aggregate_id, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_domain_outbox_idempotency
    ON domain_outbox_events (aggregate_type, aggregate_id, event_type, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS eqms_electronic_signature_event (
    signature_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signer_user_id     UUID        REFERENCES users(user_id),
    signer_identifier  TEXT        NOT NULL,
    meaning            TEXT        NOT NULL CHECK (length(trim(meaning)) > 0),
    reason             TEXT        NOT NULL CHECK (length(trim(reason)) > 0),
    object_type        TEXT        NOT NULL,
    object_id          TEXT        NOT NULL,
    object_version     TEXT,
    record_hash_sha256 CHAR(64)    NOT NULL,
    manifest_hash_sha256 CHAR(64),
    reauth_method      TEXT,
    reauth_reference   TEXT,
    ip_address         INET,
    session_id         UUID,
    signature_hash_sha256 CHAR(64) NOT NULL,
    signed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_esig_object
    ON eqms_electronic_signature_event (object_type, object_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_eqms_esig_signer
    ON eqms_electronic_signature_event (signer_identifier, signed_at DESC);

DROP TRIGGER IF EXISTS trg_eqms_esig_immutable_update ON eqms_electronic_signature_event;
CREATE TRIGGER trg_eqms_esig_immutable_update
    BEFORE UPDATE ON eqms_electronic_signature_event
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_eqms_esig_immutable_delete ON eqms_electronic_signature_event;
CREATE TRIGGER trg_eqms_esig_immutable_delete
    BEFORE DELETE ON eqms_electronic_signature_event
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

COMMIT;
