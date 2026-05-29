-- Migration 220: Item UoM Policy (ITUOM) — per-item/site/supplier/customer context
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS item_uom_policy (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                 VARCHAR(64) NOT NULL,
    site_id                 VARCHAR(64),
    supplier_id             VARCHAR(64),
    customer_id             VARCHAR(64),
    context_code            VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    -- Five canonical unit slots
    inventory_unit_code     VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    purchase_unit_code      VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    sales_unit_code         VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    recipe_unit_code        VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    qc_unit_code            VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    -- Optional conversion rule overrides per slot
    inv_to_purchase_rule_id UUID REFERENCES uom_conversion_rule(id) ON DELETE SET NULL,
    inv_to_sales_rule_id    UUID REFERENCES uom_conversion_rule(id) ON DELETE SET NULL,
    inv_to_recipe_rule_id   UUID REFERENCES uom_conversion_rule(id) ON DELETE SET NULL,
    inv_to_qc_rule_id       UUID REFERENCES uom_conversion_rule(id) ON DELETE SET NULL,
    -- Minimum quantities
    min_purchase_qty        NUMERIC(20,6),
    min_sales_qty           NUMERIC(20,6),
    -- Lot and serial tracking
    lot_tracking_unit       VARCHAR(64) REFERENCES uom_unit_catalog(canonical_code) ON DELETE SET NULL,
    serial_tracking         BOOLEAN NOT NULL DEFAULT false,
    -- Effectivity
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    -- Governance
    version                 INTEGER NOT NULL DEFAULT 1,
    lifecycle_status        VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (lifecycle_status IN ('draft','active','superseded','retired')),
    approved_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes                   TEXT,
    CONSTRAINT uq_ituom_context UNIQUE(item_id, site_id, supplier_id, customer_id, context_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ituom_item ON item_uom_policy(item_id);
CREATE INDEX IF NOT EXISTS idx_ituom_item_site ON item_uom_policy(item_id, site_id);
CREATE INDEX IF NOT EXISTS idx_ituom_status ON item_uom_policy(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_ituom_effective ON item_uom_policy(effective_from, effective_to);
