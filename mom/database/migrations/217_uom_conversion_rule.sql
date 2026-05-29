-- Migration 217: UoM Conversion Rule (versioned, governed)
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_conversion_rule (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code            VARCHAR(128) NOT NULL,
    version              INTEGER NOT NULL DEFAULT 1,
    from_unit_code       VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    to_unit_code         VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    quantity_kind_code   VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    category             VARCHAR(32) NOT NULL CHECK (category IN (
                             'exact_linear','defined_linear','approximate_linear',
                             'affine','logarithmic','derived_expression',
                             'dimensionless_strict','ratio','density_based',
                             'potency_assay','packaging_policy','arbitrary','device_display'
                         )),
    factor               NUMERIC(38,20),
    offset_value         NUMERIC(38,20) DEFAULT 0,
    formula_expression   TEXT,
    factor_source        VARCHAR(256) NOT NULL,
    factor_exact         BOOLEAN NOT NULL DEFAULT false,
    precision_digits     SMALLINT NOT NULL DEFAULT 12,
    rounding_policy_id   VARCHAR(64) NOT NULL REFERENCES uom_rounding_policy(policy_id),
    context_required     BOOLEAN NOT NULL DEFAULT false,
    context_schema       JSONB,
    bidirectional        BOOLEAN NOT NULL DEFAULT true,
    effective_from       DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to         DATE,
    lifecycle_status     VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (lifecycle_status IN ('draft','review','approved','deprecated')),
    approved_by          UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    esign_manifest_hash  VARCHAR(256),
    risk_level           VARCHAR(20) NOT NULL DEFAULT 'low'
                         CHECK (risk_level IN ('low','medium','high','regulated')),
    created_by           UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes                TEXT,
    CONSTRAINT uq_rule_version UNIQUE(rule_code, version),
    CONSTRAINT chk_rule_approved CHECK (
        lifecycle_status != 'approved' OR approved_by IS NOT NULL
    ),
    CONSTRAINT chk_linear_has_factor CHECK (
        category NOT IN ('exact_linear','defined_linear','approximate_linear') OR factor IS NOT NULL
    ),
    CONSTRAINT chk_affine_has_factor CHECK (
        category != 'affine' OR (factor IS NOT NULL AND offset_value IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_uomconv_from_to ON uom_conversion_rule(from_unit_code, to_unit_code);
CREATE INDEX IF NOT EXISTS idx_uomconv_status ON uom_conversion_rule(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_uomconv_kind ON uom_conversion_rule(quantity_kind_code);
CREATE INDEX IF NOT EXISTS idx_uomconv_effective ON uom_conversion_rule(effective_from, effective_to);
