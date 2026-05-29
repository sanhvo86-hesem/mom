-- ============================================================================
-- Migration: 213_uom_measurement_authority.sql
-- Description: Canonical UOM and measurement conversion authority spine.
-- Dependencies: 064_master_data_governance.sql, 072_canonical_foundation_governance.sql
-- Rollback: DROP TABLE uom_conversion_authority CASCADE; ALTER TABLE uom DROP added columns manually if required.
-- ============================================================================

BEGIN;

ALTER TABLE uom
    ADD COLUMN IF NOT EXISTS dimension_code VARCHAR(40) NOT NULL DEFAULT 'count',
    ADD COLUMN IF NOT EXISTS measurement_system VARCHAR(40) NOT NULL DEFAULT 'enterprise',
    ADD COLUMN IF NOT EXISTS precision_scale INT NOT NULL DEFAULT 6 CHECK (precision_scale BETWEEN 0 AND 12),
    ADD COLUMN IF NOT EXISTS rounding_mode VARCHAR(20) NOT NULL DEFAULT 'half_up',
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(120),
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE uom
    DROP CONSTRAINT IF EXISTS chk_uom_rounding_mode,
    ADD CONSTRAINT chk_uom_rounding_mode
        CHECK (rounding_mode IN ('half_up', 'half_even', 'floor', 'ceil', 'truncate')),
    DROP CONSTRAINT IF EXISTS chk_uom_approval_status,
    ADD CONSTRAINT chk_uom_approval_status
        CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'retired'));

CREATE INDEX IF NOT EXISTS idx_uom_dimension_status
    ON uom (dimension_code, approval_status, status_code);

CREATE TABLE IF NOT EXISTS uom_conversion_authority (
    uom_conversion_authority_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_uom_code VARCHAR(20) NOT NULL REFERENCES uom(uom_code),
    to_uom_code VARCHAR(20) NOT NULL REFERENCES uom(uom_code),
    dimension_code VARCHAR(40) NOT NULL,
    scope_type VARCHAR(40) NOT NULL DEFAULT 'global',
    scope_ref VARCHAR(120) NOT NULL DEFAULT '*',
    numerator NUMERIC(30,12) NOT NULL CHECK (numerator > 0),
    denominator NUMERIC(30,12) NOT NULL DEFAULT 1 CHECK (denominator > 0),
    rounding_mode VARCHAR(20) NOT NULL DEFAULT 'half_up'
        CHECK (rounding_mode IN ('half_up', 'half_even', 'floor', 'ceil', 'truncate')),
    precision_scale INT NOT NULL DEFAULT 6 CHECK (precision_scale BETWEEN 0 AND 12),
    approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'retired')),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    effective_to TIMESTAMPTZ,
    packaging_policy_ref VARCHAR(120),
    created_by VARCHAR(120),
    approved_by VARCHAR(120),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version BIGINT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (from_uom_code <> to_uom_code),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_uom_conversion_authority_effective_start
    ON uom_conversion_authority (
        from_uom_code,
        to_uom_code,
        scope_type,
        scope_ref,
        effective_from
    )
    WHERE approval_status IN ('draft', 'pending_approval', 'approved');

CREATE INDEX IF NOT EXISTS idx_uom_conversion_authority_lookup
    ON uom_conversion_authority (
        from_uom_code,
        to_uom_code,
        scope_type,
        scope_ref,
        approval_status,
        effective_from,
        effective_to
    );

DROP TRIGGER IF EXISTS trg_uom_conversion_authority_row_version ON uom_conversion_authority;
CREATE TRIGGER trg_uom_conversion_authority_row_version
    BEFORE UPDATE ON uom_conversion_authority
    FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMENT ON TABLE uom_conversion_authority IS
    'Canonical UOM conversion authority. Legacy mdm_uom_conversions is compatibility input only.';
COMMENT ON COLUMN uom_conversion_authority.numerator IS
    'Conversion factor numerator. target_qty = source_qty * numerator / denominator before deterministic rounding.';
COMMENT ON COLUMN uom_conversion_authority.packaging_policy_ref IS
    'Required when an approved business policy permits cross-dimensional packaging conversion.';

INSERT INTO uom (
    uom_code,
    uom_name,
    uom_category,
    base_uom_code,
    conversion_factor,
    status_code,
    dimension_code,
    measurement_system,
    precision_scale,
    rounding_mode,
    approval_status,
    approved_at,
    approved_by
) VALUES
    ('PCS', 'Piece', 'count', 'PCS', 1, 'active', 'count', 'discrete', 0, 'half_up', 'approved', now(), 'migration_213'),
    ('EA', 'Each', 'count', 'PCS', 1, 'active', 'count', 'discrete', 0, 'half_up', 'approved', now(), 'migration_213'),
    ('BOX', 'Box', 'count', 'PCS', 1, 'active', 'count', 'packaging', 0, 'half_up', 'approved', now(), 'migration_213'),
    ('KG', 'Kilogram', 'mass', 'KG', 1, 'active', 'mass', 'metric', 6, 'half_up', 'approved', now(), 'migration_213'),
    ('G', 'Gram', 'mass', 'KG', 0.001, 'active', 'mass', 'metric', 6, 'half_up', 'approved', now(), 'migration_213'),
    ('MM', 'Millimeter', 'length', 'MM', 1, 'active', 'length', 'metric', 6, 'half_up', 'approved', now(), 'migration_213'),
    ('INCH', 'Inch', 'length', 'MM', 25.4, 'active', 'length', 'imperial', 6, 'half_up', 'approved', now(), 'migration_213')
ON CONFLICT (uom_code) DO UPDATE SET
    dimension_code = EXCLUDED.dimension_code,
    measurement_system = EXCLUDED.measurement_system,
    precision_scale = EXCLUDED.precision_scale,
    rounding_mode = EXCLUDED.rounding_mode,
    approval_status = CASE
        WHEN uom.approval_status IN ('draft', 'pending_approval') THEN uom.approval_status
        ELSE EXCLUDED.approval_status
    END;

INSERT INTO uom_conversion_authority (
    from_uom_code,
    to_uom_code,
    dimension_code,
    scope_type,
    scope_ref,
    numerator,
    denominator,
    rounding_mode,
    precision_scale,
    approval_status,
    approved_at,
    approved_by,
    metadata
) VALUES
    ('EA', 'PCS', 'count', 'global', '*', 1, 1, 'half_up', 0, 'approved', now(), 'migration_213', '{"seed":"canonical_identity"}'::jsonb),
    ('G', 'KG', 'mass', 'global', '*', 1, 1000, 'half_up', 6, 'approved', now(), 'migration_213', '{"seed":"metric_mass"}'::jsonb),
    ('INCH', 'MM', 'length', 'global', '*', 254, 10, 'half_up', 6, 'approved', now(), 'migration_213', '{"seed":"imperial_length"}'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;
