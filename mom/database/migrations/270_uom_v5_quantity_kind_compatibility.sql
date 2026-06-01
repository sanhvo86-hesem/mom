-- ============================================================================
-- 270_uom_v5_quantity_kind_compatibility.sql
-- HESEM UoM V5 P07: semantic compatibility and quantity-kind guard.
--
-- Posture: development/prototype -> pre-production readiness candidate.
-- ============================================================================

BEGIN;

ALTER TABLE uom_quantity_kind
    ADD COLUMN IF NOT EXISTS semantic_parent VARCHAR(64) REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS measurement_family VARCHAR(64),
    ADD COLUMN IF NOT EXISTS allowed_unit_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low','medium','high','regulated')),
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('draft','active','deprecated','retired'));

COMMENT ON COLUMN uom_quantity_kind.semantic_parent IS
    'P07 semantic parent used for human review. It is not an automatic cross-kind conversion grant.';
COMMENT ON COLUMN uom_quantity_kind.measurement_family IS
    'P07 semantic family such as physical, temperature, dimensionless, concentration, procedure_defined, logarithmic.';
COMMENT ON COLUMN uom_quantity_kind.allowed_unit_codes IS
    'P07 projection of active catalog units for audit/review; conversion authority remains uom_unit_catalog plus rules.';
COMMENT ON COLUMN uom_quantity_kind.risk_level IS
    'P07 highest inherited risk from units or semantic kind.';
COMMENT ON COLUMN uom_quantity_kind.lifecycle_status IS
    'P07 lifecycle for quantity-kind registry governance.';

UPDATE uom_quantity_kind
   SET semantic_parent = COALESCE(semantic_parent, parent_kind_code),
       measurement_family = COALESCE(
           measurement_family,
           CASE
               WHEN kind_code IN ('ThermodynamicTemperature','TemperatureDifference') THEN 'temperature'
               WHEN kind_code IN ('Molarity','MassConcentration','NumberConcentration','ConcentrationPercentage') THEN 'concentration'
               WHEN kind_code IN ('PotencyUnit','ArbitraryUnit') THEN 'procedure_defined'
               WHEN kind_code IN ('pH','LogarithmicRatio') THEN 'logarithmic'
               WHEN is_dimensionless THEN 'dimensionless'
               ELSE 'physical'
           END
       ),
       allowed_unit_codes = COALESCE((
           SELECT jsonb_agg(u.canonical_code ORDER BY u.canonical_code)
             FROM uom_unit_catalog u
            WHERE u.quantity_kind_code = uom_quantity_kind.kind_code
              AND u.lifecycle_status = 'active'
       ), '[]'::jsonb),
       risk_level = CASE
           WHEN EXISTS (
               SELECT 1 FROM uom_unit_catalog u
                WHERE u.quantity_kind_code = uom_quantity_kind.kind_code
                  AND u.risk_level = 'regulated'
           ) THEN 'regulated'
           WHEN kind_code IN ('pH','PotencyUnit','ArbitraryUnit') THEN 'high'
           WHEN EXISTS (
               SELECT 1 FROM uom_unit_catalog u
                WHERE u.quantity_kind_code = uom_quantity_kind.kind_code
                  AND u.risk_level = 'high'
           ) THEN 'high'
           WHEN EXISTS (
               SELECT 1 FROM uom_unit_catalog u
                WHERE u.quantity_kind_code = uom_quantity_kind.kind_code
                  AND u.risk_level = 'medium'
           ) THEN 'medium'
           ELSE risk_level
       END,
       lifecycle_status = COALESCE(lifecycle_status, 'active');

CREATE TABLE IF NOT EXISTS uom_quantity_kind_compatibility (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_kind            VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    to_kind              VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code) ON DELETE RESTRICT,
    compatibility_type   VARCHAR(64) NOT NULL,
    allowed              BOOLEAN NOT NULL DEFAULT false,
    condition_schema     JSONB NOT NULL DEFAULT '{}'::jsonb,
    owner_role           VARCHAR(64) NOT NULL DEFAULT 'UOM_STEWARD',
    approval_status      VARCHAR(24) NOT NULL DEFAULT 'draft'
                         CHECK (approval_status IN ('draft','pending_review','active','retired','rejected')),
    risk_level           VARCHAR(20) NOT NULL DEFAULT 'medium'
                         CHECK (risk_level IN ('low','medium','high','regulated')),
    remediation_path     TEXT NOT NULL DEFAULT 'Use the business-correct quantity kind; do not rely on same dimension vectors.',
    effective_from       DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to         DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_uom_qkind_compat_window UNIQUE(from_kind, to_kind, effective_from),
    CONSTRAINT chk_uom_qkind_compat_window CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT chk_uom_qkind_compat_no_self CHECK (from_kind <> to_kind)
);

CREATE INDEX IF NOT EXISTS idx_uom_qkind_compat_pair
    ON uom_quantity_kind_compatibility(from_kind, to_kind, approval_status);
CREATE INDEX IF NOT EXISTS idx_uom_qkind_compat_effective
    ON uom_quantity_kind_compatibility(effective_from, effective_to);

COMMENT ON TABLE uom_quantity_kind_compatibility IS
    'P07 explicit semantic compatibility matrix. Same dimension is never sufficient authority for cross-kind conversion.';

INSERT INTO uom_quantity_kind_compatibility (
    from_kind, to_kind, compatibility_type, allowed, owner_role,
    approval_status, risk_level, remediation_path, effective_from
)
SELECT v.from_kind, v.to_kind, v.compatibility_type, false, 'UOM_STEWARD',
       'active', v.risk_level, v.remediation_path, DATE '2026-01-01'
  FROM (VALUES
    ('Energy','Torque','same_dimension_semantic_trap','high','Energy and torque share M1L2T-2 but represent different business semantics; create an explicit engineering procedure before any cross-kind use.'),
    ('Torque','Energy','same_dimension_semantic_trap','high','Torque and energy share M1L2T-2 but represent different business semantics; create an explicit engineering procedure before any cross-kind use.'),
    ('ThermodynamicTemperature','TemperatureDifference','absolute_vs_delta_temperature','high','Use absolute temperature units for state values and temperature-difference units for deltas.'),
    ('TemperatureDifference','ThermodynamicTemperature','absolute_vs_delta_temperature','high','Use temperature-difference units for deltas and absolute temperature units for state values.'),
    ('YieldPercentage','ConcentrationPercentage','dimensionless_subtype_trap','medium','Yield percent is not concentration percent; use the correct measurement context and quantity kind.'),
    ('ConcentrationPercentage','YieldPercentage','dimensionless_subtype_trap','medium','Concentration percent is not yield percent; use the correct measurement context and quantity kind.'),
    ('YieldPercentage','ScrapRate','dimensionless_subtype_trap','medium','Yield and scrap are separate operational semantics even when both display as percent.'),
    ('ScrapRate','YieldPercentage','dimensionless_subtype_trap','medium','Scrap and yield are separate operational semantics even when both display as percent.'),
    ('OEEScore','YieldPercentage','dimensionless_subtype_trap','medium','OEE and yield are separate manufacturing KPIs.'),
    ('YieldPercentage','OEEScore','dimensionless_subtype_trap','medium','Yield and OEE are separate manufacturing KPIs.'),
    ('pH','Molarity','logarithmic_requires_chemistry_handler','high','pH cannot convert to hydrogen concentration without an explicit logarithmic chemistry handler.'),
    ('Molarity','pH','logarithmic_requires_chemistry_handler','high','Hydrogen concentration cannot convert to pH without an explicit logarithmic chemistry handler.')
  ) AS v(from_kind, to_kind, compatibility_type, risk_level, remediation_path)
 WHERE EXISTS (SELECT 1 FROM uom_quantity_kind q WHERE q.kind_code = v.from_kind)
   AND EXISTS (SELECT 1 FROM uom_quantity_kind q WHERE q.kind_code = v.to_kind)
ON CONFLICT (from_kind, to_kind, effective_from) DO UPDATE
   SET compatibility_type = EXCLUDED.compatibility_type,
       allowed = false,
       owner_role = EXCLUDED.owner_role,
       approval_status = EXCLUDED.approval_status,
       risk_level = EXCLUDED.risk_level,
       remediation_path = EXCLUDED.remediation_path,
       updated_at = now();

INSERT INTO uom_unit_catalog
    (canonical_code, ucum_code, display_symbol, display_name_en, display_name_vi,
     quantity_kind_code, si_base, si_factor, si_offset, is_affine,
     lifecycle_status, source_tag, risk_level)
VALUES
    ('DeltaDegF', '[degF]{diff}', 'delta degF', 'degree Fahrenheit difference', 'chenh lech do F',
     'TemperatureDifference', false, 0.55555555555555555556, 0, false,
     'active', 'UCUM', 'medium')
ON CONFLICT (canonical_code) DO UPDATE
   SET quantity_kind_code = EXCLUDED.quantity_kind_code,
       si_factor = EXCLUDED.si_factor,
       si_offset = EXCLUDED.si_offset,
       is_affine = false,
       lifecycle_status = EXCLUDED.lifecycle_status,
       risk_level = EXCLUDED.risk_level,
       updated_at = now();

INSERT INTO uom_conversion_rule
    (rule_code, version, from_unit_code, to_unit_code, quantity_kind_code,
     category, factor, offset_value, factor_source, factor_exact,
     rounding_policy_id, bidirectional, effective_from, lifecycle_status, risk_level,
     standard_library_manifest_id)
SELECT
    'UOMCONV-TDIFF-DELTADEGF-DELTAK-v1',
    1,
    'DeltaDegF',
    'DeltaK',
    'TemperatureDifference',
    'exact_linear',
    0.55555555555555555556,
    0,
    'ITS-90/BIPM: Fahrenheit temperature interval equals 5/9 kelvin interval',
    true,
    'ROUND_HALF_EVEN',
    true,
    DATE '2026-01-01',
    'pending_review',
    'medium',
    NULL
ON CONFLICT (rule_code, version) DO UPDATE
   SET factor = EXCLUDED.factor,
       factor_exact = EXCLUDED.factor_exact,
       lifecycle_status = 'pending_review',
       risk_level = EXCLUDED.risk_level;

COMMIT;

-- Rollback:
--   BEGIN;
--   DELETE FROM uom_conversion_rule
--    WHERE rule_code = 'UOMCONV-TDIFF-DELTADEGF-DELTAK-v1' AND version = 1;
--   DELETE FROM uom_unit_catalog WHERE canonical_code = 'DeltaDegF';
--   DROP TABLE IF EXISTS uom_quantity_kind_compatibility;
--   ALTER TABLE uom_quantity_kind
--       DROP COLUMN IF EXISTS lifecycle_status,
--       DROP COLUMN IF EXISTS risk_level,
--       DROP COLUMN IF EXISTS allowed_unit_codes,
--       DROP COLUMN IF EXISTS measurement_family,
--       DROP COLUMN IF EXISTS semantic_parent;
--   COMMIT;
