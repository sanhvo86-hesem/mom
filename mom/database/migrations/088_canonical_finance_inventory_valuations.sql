-- ============================================================================
-- Migration: 088_canonical_finance_inventory_valuations.sql
-- Description: Canonical inventory valuation projection for finance and cost
--              visibility across item/site snapshots.
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql
-- Rollback: DROP TABLE inventory_valuations CASCADE;
-- Standards: Inventory costing projection, finance visibility, valuation reconciliation
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_valuations (
    inventory_valuation_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id           UUID            NOT NULL REFERENCES item(item_id),
    org_site_id                 UUID            NOT NULL REFERENCES org_site(site_id),
    valuation_date              DATE            NOT NULL,
    valuation_method            VARCHAR(30)     NOT NULL
                                 CHECK (valuation_method IN ('standard', 'moving_average', 'fifo', 'actual')),
    quantity_on_hand            NUMERIC(18,6)   NOT NULL DEFAULT 0,
    unit_cost_base              NUMERIC(18,6)   NOT NULL DEFAULT 0,
    inventory_value_base        NUMERIC(18,6)   NOT NULL DEFAULT 0,
    currency_code               VARCHAR(10)     NOT NULL DEFAULT 'VND',
    cost_component_json         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    snapshot_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code            VARCHAR(40),
    org_legal_entity_code       VARCHAR(40),
    org_plant_id                UUID            REFERENCES org_plant(plant_id),
    source_system               VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id            VARCHAR(120),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version      VARCHAR(30)     NOT NULL DEFAULT '1.0',
    UNIQUE (inventory_item_id, org_site_id, valuation_date, valuation_method)
);
COMMENT ON TABLE inventory_valuations IS 'Projection-grade inventory valuation snapshots per item, site, date, and valuation method.';
CREATE INDEX IF NOT EXISTS idx_inventory_valuations_item ON inventory_valuations (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_valuations_site_date ON inventory_valuations (org_site_id, valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_valuations_snapshot ON inventory_valuations (snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_valuations_scope ON inventory_valuations (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_inventory_valuations_lineage ON inventory_valuations (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_inventory_valuations_row_version ON inventory_valuations;
CREATE TRIGGER trg_inventory_valuations_row_version BEFORE UPDATE ON inventory_valuations FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
