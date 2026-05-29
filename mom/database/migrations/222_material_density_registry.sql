-- Migration 222: Material Density Registry (for density-based volume↔mass conversions)
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS material_density_registry (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_code       VARCHAR(64) NOT NULL,
    substance_name_vi    VARCHAR(256) NOT NULL,
    substance_name_en    VARCHAR(256) NOT NULL,
    density_value        NUMERIC(20,8) NOT NULL,
    density_unit_code    VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    temperature_celsius  NUMERIC(6,2),
    pressure_pa          NUMERIC(12,2) DEFAULT 101325,
    density_source       VARCHAR(256) NOT NULL,
    lot_id               VARCHAR(64),
    method_code          VARCHAR(64),
    effective_from       DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to         DATE,
    approved_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mdr_substance ON material_density_registry(substance_code);
CREATE INDEX IF NOT EXISTS idx_mdr_lot ON material_density_registry(lot_id) WHERE lot_id IS NOT NULL;
