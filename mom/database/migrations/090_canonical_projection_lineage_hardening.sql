-- ============================================================================
-- Migration: 090_canonical_projection_lineage_hardening.sql
-- Description: Hardens projection and snapshot tables with lineage, scope, and
--              optimistic-audit fields so valuation and KPI read models remain
--              auditable and replay-safe.
-- Dependencies: 025_mes_tables.sql, 075_canonical_planning_erp_orchestration.sql,
--               077_canonical_inventory_cost_traceability.sql,
--               088_canonical_finance_inventory_valuations.sql,
--               089_canonical_analytics_plant_performance_snapshots.sql
-- Rollback: Manual rollback required for additive columns and indexes.
-- Standards: Inventory valuation, period close auditability, OEE lineage,
--            release snapshot traceability, continuous-improvement review
-- ============================================================================

BEGIN;

ALTER TABLE inventory_balance_snapshot
    ADD COLUMN IF NOT EXISTS org_site_id UUID REFERENCES org_site(site_id),
    ADD COLUMN IF NOT EXISTS org_plant_id UUID REFERENCES org_plant(plant_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'ERP',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
CREATE INDEX IF NOT EXISTS idx_inventory_balance_snapshot_scope ON inventory_balance_snapshot (org_site_id, org_plant_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_balance_snapshot_lineage ON inventory_balance_snapshot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_inventory_balance_snapshot_row_version ON inventory_balance_snapshot;
CREATE TRIGGER trg_inventory_balance_snapshot_row_version BEFORE UPDATE ON inventory_balance_snapshot FOR EACH ROW EXECUTE FUNCTION set_row_version();

ALTER TABLE production_order_bom_snapshot
    ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS org_site_id UUID REFERENCES org_site(site_id),
    ADD COLUMN IF NOT EXISTS org_plant_id UUID REFERENCES org_plant(plant_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'ERP',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
UPDATE production_order_bom_snapshot
SET snapshot_at = frozen_at
WHERE snapshot_at IS DISTINCT FROM frozen_at;
CREATE INDEX IF NOT EXISTS idx_production_order_bom_snapshot_scope ON production_order_bom_snapshot (org_site_id, org_plant_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_order_bom_snapshot_lineage ON production_order_bom_snapshot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_production_order_bom_snapshot_row_version ON production_order_bom_snapshot;
CREATE TRIGGER trg_production_order_bom_snapshot_row_version BEFORE UPDATE ON production_order_bom_snapshot FOR EACH ROW EXECUTE FUNCTION set_row_version();

ALTER TABLE production_order_route_snapshot
    ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS org_site_id UUID REFERENCES org_site(site_id),
    ADD COLUMN IF NOT EXISTS org_plant_id UUID REFERENCES org_plant(plant_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'ERP',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
UPDATE production_order_route_snapshot
SET snapshot_at = frozen_at
WHERE snapshot_at IS DISTINCT FROM frozen_at;
CREATE INDEX IF NOT EXISTS idx_production_order_route_snapshot_scope ON production_order_route_snapshot (org_site_id, org_plant_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_order_route_snapshot_lineage ON production_order_route_snapshot (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_production_order_route_snapshot_row_version ON production_order_route_snapshot;
CREATE TRIGGER trg_production_order_route_snapshot_row_version BEFORE UPDATE ON production_order_route_snapshot FOR EACH ROW EXECUTE FUNCTION set_row_version();

ALTER TABLE mes_oee_snapshots
    ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS org_site_id UUID REFERENCES org_site(site_id),
    ADD COLUMN IF NOT EXISTS org_plant_id UUID REFERENCES org_plant(plant_id),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'MES',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0';
UPDATE mes_oee_snapshots
SET snapshot_at = snapshot_date::timestamptz
WHERE snapshot_at IS DISTINCT FROM snapshot_date::timestamptz;
CREATE INDEX IF NOT EXISTS idx_mes_oee_snapshots_scope ON mes_oee_snapshots (org_site_id, org_plant_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_mes_oee_snapshots_lineage ON mes_oee_snapshots (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_mes_oee_snapshots_row_version ON mes_oee_snapshots;
CREATE TRIGGER trg_mes_oee_snapshots_row_version BEFORE UPDATE ON mes_oee_snapshots FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
