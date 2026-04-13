-- ============================================================================
-- Migration 098: Canonical Manufacturing Event Backbone
-- ============================================================================
-- Purpose:
--   Add an immutable operational event ledger that can carry production,
--   inspection, NCR/CAPA, evidence, approval, and genealogy relation events
--   through one canonical digital-thread read model.
--
-- Data safety:
--   Additive migration only. Existing event/audit/passport/genealogy tables are
--   not modified and can be progressively projected into this ledger later.
--
-- Rollback:
--   DROP TABLE IF EXISTS mes_operational_event_ledger CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mes_operational_event_ledger (
    event_id                    VARCHAR(120) PRIMARY KEY,
    event_type                  VARCHAR(80)  NOT NULL
        CHECK (event_type IN (
            'order.work_execution',
            'quality.inspection',
            'quality.ncr_capa_linkage',
            'evidence.attachment',
            'approval.decision',
            'trace.genealogy_relation'
        )),
    event_category              VARCHAR(40)  NOT NULL
        CHECK (event_category IN ('order', 'quality', 'evidence', 'approval', 'trace')),
    event_version               VARCHAR(20)  NOT NULL DEFAULT '1.0',
    payload_schema_version      VARCHAR(30)  NOT NULL DEFAULT '1.0',
    fingerprint_hash            CHAR(64)     NOT NULL,
    event_hash                  CHAR(64)     NOT NULL UNIQUE,
    previous_event_hash         CHAR(64),

    correlation_id              VARCHAR(120) NOT NULL,
    request_id                  VARCHAR(120),
    causation_event_id          VARCHAR(120),
    traceparent                 VARCHAR(255),

    enterprise_id               VARCHAR(80),
    company_id                  VARCHAR(80),
    site_id                     VARCHAR(80),
    plant_id                    VARCHAR(80),
    org_company_code            VARCHAR(30),
    org_legal_entity_code       VARCHAR(30),
    org_plant_id                VARCHAR(30),
    org_site_id                 VARCHAR(30),
    work_center_id              VARCHAR(80),

    source_system               VARCHAR(80)  NOT NULL DEFAULT 'mom',
    source_aggregate_type       VARCHAR(80)  NOT NULL,
    source_aggregate_id         VARCHAR(160) NOT NULL,
    source_event_id             VARCHAR(160),
    source_record_id            VARCHAR(160),

    so_number                   VARCHAR(80),
    jo_number                   VARCHAR(80),
    wo_number                   VARCHAR(80),
    operation_seq               VARCHAR(40),
    part_number                 VARCHAR(120),
    part_revision               VARCHAR(80),
    lot_number                  VARCHAR(120),
    serial_number               VARCHAR(120),
    parent_lot_number           VARCHAR(120),
    parent_serial_number        VARCHAR(120),
    child_lot_number            VARCHAR(120),
    child_serial_number         VARCHAR(120),

    inspection_id               VARCHAR(120),
    ncr_id                      VARCHAR(120),
    capa_id                     VARCHAR(120),
    scar_id                     VARCHAR(120),
    evidence_id                 VARCHAR(120),
    approval_id                 VARCHAR(120),
    electronic_signature_id     VARCHAR(120),

    actor_id                    VARCHAR(120),
    actor_role                  VARCHAR(120),
    occurred_at                 TIMESTAMPTZ  NOT NULL,
    recorded_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    idempotency_key             VARCHAR(255),
    payload                     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    metadata                    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version                 BIGINT       NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mes_operational_event_idempotency
    ON mes_operational_event_ledger (
        source_system,
        source_aggregate_type,
        source_aggregate_id,
        event_type,
        idempotency_key
    )
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_timeline_wo
    ON mes_operational_event_ledger (wo_number, occurred_at, recorded_at)
    WHERE wo_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_timeline_quality
    ON mes_operational_event_ledger (ncr_id, capa_id, occurred_at, recorded_at)
    WHERE ncr_id IS NOT NULL OR capa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_evidence
    ON mes_operational_event_ledger (evidence_id, occurred_at)
    WHERE evidence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_genealogy_lot
    ON mes_operational_event_ledger (lot_number, serial_number, occurred_at)
    WHERE lot_number IS NOT NULL OR serial_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_correlation
    ON mes_operational_event_ledger (correlation_id, occurred_at, recorded_at);

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_scope
    ON mes_operational_event_ledger (enterprise_id, company_id, site_id, plant_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_org_scope
    ON mes_operational_event_ledger (org_company_code, org_legal_entity_code, org_plant_id, org_site_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_source_aggregate
    ON mes_operational_event_ledger (source_system, source_aggregate_type, source_aggregate_id, occurred_at, recorded_at);

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_payload
    ON mes_operational_event_ledger USING GIN (payload);

COMMENT ON TABLE mes_operational_event_ledger IS
    'Canonical immutable operational event ledger for manufacturing production history and digital-thread timeline queries.';

COMMENT ON COLUMN mes_operational_event_ledger.fingerprint_hash IS
    'SHA-256 hash of the normalized semantic event fingerprint used for idempotent replay/conflict detection.';

COMMENT ON COLUMN mes_operational_event_ledger.event_hash IS
    'SHA-256 hash over the immutable event row payload, excluding this column.';

COMMENT ON COLUMN mes_operational_event_ledger.previous_event_hash IS
    'Previous event hash for the same source aggregate, enabling aggregate-local history chain verification.';

COMMENT ON COLUMN mes_operational_event_ledger.correlation_id IS
    'Business/runtime correlation id used to stitch production, quality, evidence, and genealogy events.';

COMMIT;
