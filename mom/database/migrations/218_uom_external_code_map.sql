-- Migration 218: UoM External Code Mapping (UNECE, OPC UA, EDI, Lab)
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_external_code_map (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_code       VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    external_system      VARCHAR(64) NOT NULL,
    external_code        VARCHAR(64) NOT NULL,
    external_numeric_id  INTEGER,
    confidence           VARCHAR(20) NOT NULL CHECK (confidence IN ('VERIFIED','INFERRED','GAP')),
    source_document      VARCHAR(256) NOT NULL,
    ambiguity_note       TEXT,
    approved_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ext_system_code UNIQUE(external_system, external_code)
);

CREATE INDEX IF NOT EXISTS idx_uom_ext_canonical ON uom_external_code_map(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uom_ext_system ON uom_external_code_map(external_system);
CREATE INDEX IF NOT EXISTS idx_uom_ext_numeric ON uom_external_code_map(external_numeric_id) WHERE external_numeric_id IS NOT NULL;
