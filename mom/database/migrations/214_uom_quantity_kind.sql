-- Migration 214: UoM Quantity Kind registry
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_quantity_kind (
    kind_code            VARCHAR(64) PRIMARY KEY,
    parent_kind_code     VARCHAR(64) REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    qudt_uri             VARCHAR(256),
    dimension_vector     CHAR(32) NOT NULL,
    label_en             VARCHAR(128) NOT NULL,
    label_vi             VARCHAR(128) NOT NULL,
    is_dimensionless     BOOLEAN NOT NULL DEFAULT false,
    allows_cross_kind    BOOLEAN NOT NULL DEFAULT false,
    source               VARCHAR(32) NOT NULL CHECK (source IN ('QUDT','BIPM','HESEM_CUSTOM','ISO')),
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uom_qkind_parent ON uom_quantity_kind(parent_kind_code);
CREATE INDEX IF NOT EXISTS idx_uom_qkind_dim ON uom_quantity_kind(dimension_vector);
