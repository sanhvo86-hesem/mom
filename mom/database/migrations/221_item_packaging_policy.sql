-- Migration 221: Item Packaging Policy (packaging ratios are item-context, not global units)
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS item_packaging_policy (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                 VARCHAR(64) NOT NULL,
    site_id                 VARCHAR(64),
    supplier_id             VARCHAR(64),
    customer_id             VARCHAR(64),
    -- Tier definitions (quantities expressed in item inventory_unit)
    inner_pack_label        VARCHAR(64),
    inner_pack_label_vi     VARCHAR(64),
    inner_pack_qty          NUMERIC(20,6),
    outer_pack_label        VARCHAR(64),
    outer_pack_label_vi     VARCHAR(64),
    outer_pack_qty          NUMERIC(20,6),
    pallet_label            VARCHAR(64),
    pallet_label_vi         VARCHAR(64),
    pallet_qty              NUMERIC(20,6),
    -- Physical dimensions of outer pack (for logistics calculations)
    outer_pack_weight_kg    NUMERIC(12,4),
    outer_pack_length_mm    NUMERIC(12,2),
    outer_pack_width_mm     NUMERIC(12,2),
    outer_pack_height_mm    NUMERIC(12,2),
    -- Effectivity
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    -- Governance
    approved_by             UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    created_by              UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pack_context UNIQUE(item_id, site_id, supplier_id, customer_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ipp_item ON item_packaging_policy(item_id);
CREATE INDEX IF NOT EXISTS idx_ipp_item_site ON item_packaging_policy(item_id, site_id);
