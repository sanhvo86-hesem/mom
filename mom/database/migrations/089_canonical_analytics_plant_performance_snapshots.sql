-- ============================================================================
-- Migration: 089_canonical_analytics_plant_performance_snapshots.sql
-- Description: Canonical plant-performance projection snapshots for site-level
--              OEE, throughput, quality, and safety visibility.
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql
-- Rollback: DROP TABLE plant_performance_snapshots CASCADE;
-- Standards: Lean KPI management, OEE, auto-audit snapshots, continuous improvement
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS plant_performance_snapshots (
    plant_performance_snapshot_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    org_site_id                 UUID            NOT NULL REFERENCES org_site(site_id),
    org_plant_id                UUID            REFERENCES org_plant(plant_id),
    snapshot_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    snapshot_grain              VARCHAR(20)     NOT NULL DEFAULT 'daily'
                                 CHECK (snapshot_grain IN ('shift', 'daily', 'weekly', 'monthly')),
    planned_minutes             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    runtime_minutes             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    downtime_minutes            NUMERIC(12,2)   NOT NULL DEFAULT 0,
    output_qty                  NUMERIC(18,6)   NOT NULL DEFAULT 0,
    good_qty                    NUMERIC(18,6)   NOT NULL DEFAULT 0,
    scrap_qty                   NUMERIC(18,6)   NOT NULL DEFAULT 0,
    availability_pct            NUMERIC(6,2),
    performance_pct             NUMERIC(6,2),
    quality_pct                 NUMERIC(6,2),
    oee_pct                     NUMERIC(6,2),
    customer_otd_pct            NUMERIC(6,2),
    ncr_count                   INT             NOT NULL DEFAULT 0,
    safety_observations         INT             NOT NULL DEFAULT 0,
    energy_kwh                  NUMERIC(18,3),
    metadata                    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code            VARCHAR(40),
    org_legal_entity_code       VARCHAR(40),
    source_system               VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id            VARCHAR(120),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version      VARCHAR(30)     NOT NULL DEFAULT '1.0',
    UNIQUE (org_site_id, snapshot_at, snapshot_grain)
);
COMMENT ON TABLE plant_performance_snapshots IS 'Projection-grade plant performance snapshots used for lean KPI review, gate control, and continuous improvement.';
CREATE INDEX IF NOT EXISTS idx_plant_performance_site_snapshot ON plant_performance_snapshots (org_site_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_performance_plant_snapshot ON plant_performance_snapshots (org_plant_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_performance_oee ON plant_performance_snapshots (oee_pct);
CREATE INDEX IF NOT EXISTS idx_plant_performance_lineage ON plant_performance_snapshots (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_plant_performance_snapshots_row_version ON plant_performance_snapshots;
CREATE TRIGGER trg_plant_performance_snapshots_row_version BEFORE UPDATE ON plant_performance_snapshots FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
