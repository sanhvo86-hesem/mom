-- ============================================================================
-- Migration 100: Trusted Manufacturing Release Record Spine
-- ============================================================================
-- Purpose:
--   Add an authoritative release-grade production record packet table for
--   eDHR/eBR-style work-order/lot release decisions. The packet freezes
--   production history, quality, evidence, qualification, approval/signature,
--   release decision, retention, and record-copy metadata into a reproducible
--   structured record.
--
-- Data safety:
--   Additive migration only. Existing shipment, event, evidence, approval,
--   and genealogy tables are not modified.
--
-- Rollback:
--   DROP TABLE IF EXISTS mes_trusted_release_record CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mes_trusted_release_record (
    packet_id                   VARCHAR(120) PRIMARY KEY,
    packet_type                 VARCHAR(80)  NOT NULL DEFAULT 'trusted_manufacturing_release_record',
    payload_schema_version      VARCHAR(40)  NOT NULL DEFAULT 'release_packet.v1',
    packet_version              INTEGER      NOT NULL DEFAULT 1,
    packet_state                VARCHAR(30)  NOT NULL
        CHECK (packet_state IN ('draft', 'assembled', 'blocked', 'releasable', 'released', 'superseded', 'voided')),

    target_aggregate_type       VARCHAR(80)  NOT NULL,
    target_aggregate_id         VARCHAR(160) NOT NULL,
    so_number                   VARCHAR(80),
    jo_number                   VARCHAR(80),
    wo_number                   VARCHAR(80),
    operation_seq               VARCHAR(40),
    part_number                 VARCHAR(120),
    part_revision               VARCHAR(80),
    lot_number                  VARCHAR(120),
    serial_number               VARCHAR(120),

    enterprise_id               VARCHAR(80),
    company_id                  VARCHAR(80),
    site_id                     VARCHAR(80),
    plant_id                    VARCHAR(80),
    org_company_code            VARCHAR(30),
    org_legal_entity_code       VARCHAR(30),
    org_plant_id                VARCHAR(30),
    org_site_id                 VARCHAR(30),
    work_center_id              VARCHAR(80),

    history_packet_id           VARCHAR(120),
    packet_hash                 CHAR(64)     NOT NULL,
    packet_hash_algorithm       VARCHAR(30)  NOT NULL DEFAULT 'sha256',
    frozen_at                   TIMESTAMPTZ,
    released_at                 TIMESTAMPTZ,
    released_by                 VARCHAR(120),
    release_decision_code       VARCHAR(40),
    release_decision_reason     TEXT,

    blocker_count               INTEGER      NOT NULL DEFAULT 0,
    blocker_categories          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    canonical_identifiers       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    assertions                  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    packet_payload              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    provenance                  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    retention_metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    record_copy_metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    metrics_snapshot            JSONB        NOT NULL DEFAULT '{}'::jsonb,

    correlation_id              VARCHAR(120),
    request_id                  VARCHAR(120),
    traceparent                 VARCHAR(255),
    source_system               VARCHAR(80)  NOT NULL DEFAULT 'mom',
    source_record_id            VARCHAR(160),
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    row_version                 BIGINT       NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mes_release_record_released_hash
    ON mes_trusted_release_record (packet_id, packet_hash)
    WHERE packet_state = 'released';

CREATE INDEX IF NOT EXISTS idx_mes_release_record_target
    ON mes_trusted_release_record (target_aggregate_type, target_aggregate_id, packet_state);

CREATE INDEX IF NOT EXISTS idx_mes_release_record_work_order
    ON mes_trusted_release_record (wo_number, packet_state, updated_at DESC)
    WHERE wo_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_release_record_lot_serial
    ON mes_trusted_release_record (lot_number, serial_number, packet_state)
    WHERE lot_number IS NOT NULL OR serial_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_release_record_org_scope
    ON mes_trusted_release_record (org_company_code, org_legal_entity_code, org_plant_id, org_site_id, packet_state);

CREATE INDEX IF NOT EXISTS idx_mes_release_record_runtime_scope
    ON mes_trusted_release_record (enterprise_id, company_id, site_id, plant_id, packet_state);

CREATE INDEX IF NOT EXISTS idx_mes_release_record_payload
    ON mes_trusted_release_record USING GIN (packet_payload);

CREATE INDEX IF NOT EXISTS idx_mes_release_record_blockers
    ON mes_trusted_release_record USING GIN (blocker_categories);

COMMENT ON TABLE mes_trusted_release_record IS
    'Authoritative trusted manufacturing release record packet for eDHR/eBR-style controlled production release.';

COMMENT ON COLUMN mes_trusted_release_record.packet_hash IS
    'SHA-256 hash of the reproducible release packet basis used for record-copy and immutable release proof.';

COMMENT ON COLUMN mes_trusted_release_record.packet_payload IS
    'Structured release packet containing canonical identifiers, history sections, assertions, blockers, and release decision.';

COMMENT ON COLUMN mes_trusted_release_record.provenance IS
    'Ordered provenance timeline and source event hashes used to reproduce the release record.';

COMMIT;
