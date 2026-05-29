-- Migration 226: UoM Subsystem Performance Indexes
-- Covers: uom_quantity_kind, uom_unit_catalog, uom_conversion_rule,
--         uom_external_code_map, uom_alias, uom_alias_quarantine,
--         item_uom_policy, item_packaging_policy,
--         material_density_registry, uom_rule_approval, uom_ai_advisory_log
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

-- ─── uom_quantity_kind ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomqk_parent ON uom_quantity_kind(parent_kind_code)
    WHERE parent_kind_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uomqk_dimension ON uom_quantity_kind(dimension_vector);
CREATE INDEX IF NOT EXISTS idx_uomqk_dimensionless ON uom_quantity_kind(is_dimensionless);
CREATE INDEX IF NOT EXISTS idx_uomqk_source ON uom_quantity_kind(source);

-- ─── uom_unit_catalog ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomuc_kind ON uom_unit_catalog(quantity_kind_code);
CREATE INDEX IF NOT EXISTS idx_uomuc_status ON uom_unit_catalog(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_uomuc_si_base ON uom_unit_catalog(si_base) WHERE si_base = true;
CREATE INDEX IF NOT EXISTS idx_uomuc_affine ON uom_unit_catalog(is_affine) WHERE is_affine = true;
CREATE INDEX IF NOT EXISTS idx_uomuc_risk ON uom_unit_catalog(risk_level);
-- ucum_code already has UNIQUE index from migration 215

-- ─── uom_rounding_policy ─────────────────────────────────────────────────────
-- policy_code already has UNIQUE index from migration 216 (PK is policy_code)

-- ─── uom_conversion_rule ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomcr_from_to ON uom_conversion_rule(from_unit_code, to_unit_code);
CREATE INDEX IF NOT EXISTS idx_uomcr_to_from ON uom_conversion_rule(to_unit_code, from_unit_code);
CREATE INDEX IF NOT EXISTS idx_uomcr_kind ON uom_conversion_rule(quantity_kind_code);
CREATE INDEX IF NOT EXISTS idx_uomcr_status ON uom_conversion_rule(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_uomcr_category ON uom_conversion_rule(category);
CREATE INDEX IF NOT EXISTS idx_uomcr_risk ON uom_conversion_rule(risk_level);
CREATE INDEX IF NOT EXISTS idx_uomcr_effective ON uom_conversion_rule(effective_from, effective_to)
    WHERE effective_to IS NOT NULL;
-- Partial index: active bidirectional rules — hot path for engine lookups
CREATE INDEX IF NOT EXISTS idx_uomcr_active_bidir ON uom_conversion_rule(from_unit_code, to_unit_code)
    WHERE lifecycle_status = 'approved' AND bidirectional = true;

-- ─── uom_external_code_map ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomecm_canonical ON uom_external_code_map(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uomecm_system ON uom_external_code_map(external_system);
CREATE INDEX IF NOT EXISTS idx_uomecm_numeric ON uom_external_code_map(external_numeric_id)
    WHERE external_numeric_id IS NOT NULL;
-- OPC UA lookup: numeric UnitId is primary key — partial index for fast match
CREATE INDEX IF NOT EXISTS idx_uomecm_opcua_numeric ON uom_external_code_map(external_numeric_id, canonical_code)
    WHERE external_system = 'OPC_UA';

-- ─── uom_alias ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomal_canonical ON uom_alias(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uomal_context ON uom_alias(context_scope);
CREATE INDEX IF NOT EXISTS idx_uomal_alias_lower ON uom_alias(lower(alias_code));
-- EDI lookup: supplier alias resolution
CREATE INDEX IF NOT EXISTS idx_uomal_supplier ON uom_alias(supplier_id, alias_code)
    WHERE supplier_id IS NOT NULL;

-- ─── uom_alias_quarantine ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uomaq_status ON uom_alias_quarantine(review_status);
CREATE INDEX IF NOT EXISTS idx_uomaq_submitted ON uom_alias_quarantine(submitted_at);
CREATE INDEX IF NOT EXISTS idx_uomaq_alias_lower ON uom_alias_quarantine(lower(alias_code));

-- ─── item_uom_policy ─────────────────────────────────────────────────────────
-- Already indexed by migration 220: idx_ituom_item, idx_ituom_item_site,
--   idx_ituom_status, idx_ituom_effective
-- Add: active policy fast lookup (item × status × date)
CREATE INDEX IF NOT EXISTS idx_ituom_active ON item_uom_policy(item_id, lifecycle_status, effective_from)
    WHERE lifecycle_status = 'active';
CREATE INDEX IF NOT EXISTS idx_ituom_site_active ON item_uom_policy(item_id, site_id, lifecycle_status)
    WHERE lifecycle_status = 'active' AND site_id IS NOT NULL;

-- ─── item_packaging_policy ───────────────────────────────────────────────────
-- Already indexed by migration 221: idx_ipp_item, idx_ipp_item_site
CREATE INDEX IF NOT EXISTS idx_ipp_effective ON item_packaging_policy(item_id, effective_from, effective_to);

-- ─── material_density_registry ───────────────────────────────────────────────
-- Already indexed by migration 222: idx_mdr_substance, idx_mdr_lot
CREATE INDEX IF NOT EXISTS idx_mdr_effective ON material_density_registry(substance_code, effective_from, effective_to);
-- Temperature/pressure lookup for density-based conversions
CREATE INDEX IF NOT EXISTS idx_mdr_substance_temp ON material_density_registry(substance_code, temperature_celsius);

-- ─── uom_rule_approval ───────────────────────────────────────────────────────
-- Already indexed by migration 225: idx_ura_rule, idx_ura_signer
CREATE INDEX IF NOT EXISTS idx_ura_approval_type ON uom_rule_approval(approval_type);
CREATE INDEX IF NOT EXISTS idx_ura_signed_at ON uom_rule_approval(signed_at);

-- ─── uom_ai_advisory_log ─────────────────────────────────────────────────────
-- Already indexed by migration 225: idx_uom_ai_type, idx_uom_ai_reviewed
CREATE INDEX IF NOT EXISTS idx_uom_ai_created ON uom_ai_advisory_log(created_at);
CREATE INDEX IF NOT EXISTS idx_uom_ai_model ON uom_ai_advisory_log(model_id);
-- Pending review queue: partial index for human review dashboard
CREATE INDEX IF NOT EXISTS idx_uom_ai_pending ON uom_ai_advisory_log(created_at)
    WHERE human_reviewed = false;
