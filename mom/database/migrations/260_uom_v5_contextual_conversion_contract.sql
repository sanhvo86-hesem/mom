-- ============================================================================
-- 260_uom_v5_contextual_conversion_contract.sql
-- HESEM UoM V5 P08: density, potency, and packaging contextual contracts.
--
-- Posture: development/prototype -> pre-production readiness candidate.
-- ============================================================================

BEGIN;

ALTER TABLE material_density_registry
    ADD COLUMN IF NOT EXISTS item_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS material_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_method VARCHAR(128),
    ADD COLUMN IF NOT EXISTS evidence_ref TEXT,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(24) NOT NULL DEFAULT 'active'
        CHECK (approval_status IN ('draft','pending_review','active','retired','rejected'));

CREATE INDEX IF NOT EXISTS idx_mdr_item_effective
    ON material_density_registry(item_id, effective_from, effective_to)
    WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mdr_material_lot_effective
    ON material_density_registry(material_id, lot_id, effective_from, effective_to)
    WHERE material_id IS NOT NULL;

ALTER TABLE item_packaging_policy
    ADD COLUMN IF NOT EXISTS packaging_level VARCHAR(24),
    ADD COLUMN IF NOT EXISTS count_per_parent NUMERIC(20,6),
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('draft','pending_review','active','retired','rejected')),
    ADD COLUMN IF NOT EXISTS evidence_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_ipp_context_effective_status
    ON item_packaging_policy(item_id, site_id, supplier_id, customer_id, effective_from, effective_to, lifecycle_status);

CREATE TABLE IF NOT EXISTS uom_potency_assay_registry (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_code      VARCHAR(64) NOT NULL,
    assay_method        VARCHAR(128) NOT NULL,
    potency_value       NUMERIC(38,20) NOT NULL,
    potency_unit        VARCHAR(64) NOT NULL,
    lot_id              VARCHAR(64) NOT NULL,
    certificate_ref     TEXT NOT NULL,
    expiry_date         DATE NOT NULL,
    approved_by         UUID REFERENCES users(user_id) ON DELETE RESTRICT,
    approved_at         TIMESTAMPTZ,
    lifecycle_status    VARCHAR(24) NOT NULL DEFAULT 'pending_review'
                        CHECK (lifecycle_status IN ('draft','pending_review','active','retired','rejected')),
    effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_uom_potency_effective_window CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT chk_uom_potency_positive CHECK (potency_value > 0)
);

CREATE INDEX IF NOT EXISTS idx_uom_potency_lot_effective
    ON uom_potency_assay_registry(substance_code, lot_id, assay_method, effective_from, effective_to, lifecycle_status);

INSERT INTO uom_unit_catalog
    (canonical_code, ucum_code, display_symbol, display_name_en, display_name_vi,
     quantity_kind_code, si_base, si_factor, si_offset, is_affine,
     lifecycle_status, source_tag, risk_level)
VALUES
    ('IU',  '{IU}',  'IU',  'international unit', 'IU', 'PotencyUnit', false, NULL, 0, false, 'active', 'HESEM_CUSTOM', 'high'),
    ('EA',  '{ea}',  'EA',  'each', 'each', 'CountOrQuantity', false, 1, 0, false, 'active', 'HESEM_CUSTOM', 'medium'),
    ('BOX', '{box}', 'BOX', 'box', 'box', 'CountOrQuantity', false, NULL, 0, false, 'active', 'HESEM_CUSTOM', 'medium')
ON CONFLICT (canonical_code) DO UPDATE
   SET quantity_kind_code = EXCLUDED.quantity_kind_code,
       si_factor = EXCLUDED.si_factor,
       lifecycle_status = EXCLUDED.lifecycle_status,
       risk_level = EXCLUDED.risk_level,
       updated_at = now();

UPDATE uom_conversion_rule
   SET context_required = true,
       context_schema = CASE category
           WHEN 'density_based' THEN jsonb_build_object(
               'required', jsonb_build_array('item_id_or_material_id', 'density_value_or_registry', 'source_method', 'evidence_ref'),
               'optional', jsonb_build_array('temperature_c', 'pressure_pa', 'lot_id', 'batch_id', 'effective_date')
           )
           WHEN 'potency_assay' THEN jsonb_build_object(
               'required', jsonb_build_array('substance', 'assay_method', 'potency_value', 'potency_unit', 'lot_id', 'certificate_ref', 'expiry_date', 'approved_by')
           )
           WHEN 'packaging_policy' THEN jsonb_build_object(
               'required', jsonb_build_array('item_id', 'packaging_level'),
               'optional', jsonb_build_array('site_id', 'supplier_id', 'customer_id', 'effective_date')
           )
           ELSE context_schema
       END
 WHERE category IN ('density_based','potency_assay','packaging_policy');

COMMIT;

-- Rollback:
--   BEGIN;
--   DELETE FROM uom_unit_catalog WHERE canonical_code IN ('IU','EA','BOX');
--   DROP TABLE IF EXISTS uom_potency_assay_registry;
--   DROP INDEX IF EXISTS idx_ipp_context_effective_status;
--   ALTER TABLE item_packaging_policy
--       DROP COLUMN IF EXISTS evidence_ref,
--       DROP COLUMN IF EXISTS lifecycle_status,
--       DROP COLUMN IF EXISTS count_per_parent,
--       DROP COLUMN IF EXISTS packaging_level;
--   DROP INDEX IF EXISTS idx_mdr_material_lot_effective;
--   DROP INDEX IF EXISTS idx_mdr_item_effective;
--   ALTER TABLE material_density_registry
--       DROP COLUMN IF EXISTS approval_status,
--       DROP COLUMN IF EXISTS evidence_ref,
--       DROP COLUMN IF EXISTS source_method,
--       DROP COLUMN IF EXISTS material_id,
--       DROP COLUMN IF EXISTS item_id;
--   COMMIT;
