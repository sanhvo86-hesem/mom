-- Migration 215: UoM Unit Catalog
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_unit_catalog (
    canonical_code       VARCHAR(64) PRIMARY KEY,
    ucum_code            VARCHAR(64) NOT NULL,
    qudt_uri             VARCHAR(256),
    display_symbol       VARCHAR(32) NOT NULL,
    display_name_en      VARCHAR(128) NOT NULL,
    display_name_vi      VARCHAR(128) NOT NULL,
    quantity_kind_code   VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    si_base              BOOLEAN NOT NULL DEFAULT false,
    si_factor            NUMERIC(38,20),
    si_offset            NUMERIC(38,20) DEFAULT 0,
    is_affine            BOOLEAN NOT NULL DEFAULT false,
    lifecycle_status     VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (lifecycle_status IN ('draft','active','deprecated','retired')),
    owner_role           VARCHAR(64) NOT NULL DEFAULT 'UOM_STEWARD',
    source_tag           VARCHAR(32) NOT NULL
                         CHECK (source_tag IN ('BIPM','UCUM','QUDT','UNECE','ISO','HESEM_CUSTOM','OPC_UA','LAB')),
    risk_level           VARCHAR(20) NOT NULL DEFAULT 'low'
                         CHECK (risk_level IN ('low','medium','high','regulated')),
    approved_at          TIMESTAMPTZ,
    approved_by          UUID REFERENCES users(user_id) ON DELETE SET NULL,
    retired_at           TIMESTAMPTZ,
    retired_reason       TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ucum_code UNIQUE(ucum_code)
);

CREATE INDEX IF NOT EXISTS idx_uom_unit_kind ON uom_unit_catalog(quantity_kind_code);
CREATE INDEX IF NOT EXISTS idx_uom_unit_status ON uom_unit_catalog(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_uom_unit_source ON uom_unit_catalog(source_tag);
