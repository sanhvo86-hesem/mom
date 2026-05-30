-- ============================================================================
-- Migration 255: Graphics Authority — Module Master component-scoped tokens
-- ============================================================================
-- Purpose:   Register 5 component-scoped visual tokens that back the Module
--            Master "Properties" dock knobs which were previously LIVE NO-OPS
--            because the value was hardcoded inside an orders-v3.css component
--            class (not inline HTML, so the v3-G19..G24 inline-binding pass
--            could not reach them). Scoped + delivered as slice v3-G25.
--
--            Token            CSS variable            Was (no-op dock target)
--            ---------------- ----------------------- -----------------------------
--            kpi.valueSize    --o3-kpi-value-size     --o3-font-size-2xl (class read 3xl)
--            chip.paddingX    --o3-chip-pad-x         --o3-space-sm  (class hardcoded 10px)
--            chip.fontSize    --o3-chip-font-size     --o3-font-size-xs (class hardcoded 12px)
--            chip.fontWeight  --o3-chip-font-weight   --o3-font-weight-medium (class hardcoded 500)
--            table.cellSize   --o3-table-cell-size    --o3-font-size-md (class read sm)
--
--            Each default equals the EXACT prior rendered value, so binding the
--            class to the new var is a zero-regression change. The new vars are
--            deliberately NOT aliased to the shared font/space ramp — that
--            coupling is what made the dock confusing (editing chip padding
--            would have moved table/panel spacing). One knob ↔ one component.
--
-- Authority enforcement:
--   - Upholds the migration 213 invariant: "every --o3-* CSS variable in
--     orders-v3.css traces back to a row here." These 5 new vars are added to
--     orders-v3.css :root and registered below.
--   - The dock writes these vars via the cssvar (`_vn`) direct-setProperty
--     path; the catalog row is the SSOT registration + future POSTGRES_PRIMARY
--     authority, not the runtime delivery mechanism.
--
-- Mode:      JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY safe. Idempotent:
--            token INSERTs are ON CONFLICT DO NOTHING; contract upserts merge
--            (DISTINCT) into the existing overridable_tokens array, so re-runs
--            and "ran before 213 landed" both converge.
--
-- Depends on: 213 (creates graphics_token_catalog v3 token set + v3.* contracts)
--             148 (creates the catalog + contract tables)
--
-- Date:      2026-05-30
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Component-scoped tokens
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, component_scope, value_type,
   min_numeric, max_numeric, step_numeric, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('components.kpi.valueSize', '--o3-kpi-value-size', 'component', 'typography', 'heading', 'kpi',
   'px', 16, 36, 1, 'px',
   '28px', '28px', '28px',
   'KPI tile primary value font-size (.o3-kpi__value). Dedicated so the Module Master "Cỡ giá trị" knob drives only the KPI value, decoupled from the global 3xl ramp it used to borrow.',
   ARRAY['v3','kpi','typography','module-master']),

  ('components.chip.paddingX', '--o3-chip-pad-x', 'component', 'spacing', 'inset', 'chip',
   'px', 4, 20, 1, 'px',
   '10px', '10px', '10px',
   'Chip horizontal padding (.o3-chip). Was a literal 0 10px; dedicated token makes the "Padding ngang" knob live without coupling to the master spacing ramp.',
   ARRAY['v3','chip','spacing','module-master']),

  ('components.chip.fontSize', '--o3-chip-font-size', 'component', 'typography', 'body', 'chip',
   'px', 9, 14, 1, 'px',
   '12px', '12px', '12px',
   'Chip label font-size (.o3-chip). Was a literal 12px; dedicated token makes the "Cỡ chữ chip" knob live.',
   ARRAY['v3','chip','typography','module-master']),

  ('components.chip.fontWeight', '--o3-chip-font-weight', 'component', 'typography', 'body', 'chip',
   'unitless', 400, 800, 100, NULL,
   '500', '500', '500',
   'Chip label font-weight (.o3-chip). Was a literal 500; dedicated token makes the "Độ đậm" knob live without re-weighting every other medium-weight label.',
   ARRAY['v3','chip','typography','module-master']),

  ('components.table.cellFontSize', '--o3-table-cell-size', 'component', 'typography', 'body', 'table',
   'px', 10, 18, 1, 'px',
   '12px', '12px', '12px',
   'Data table cell font-size (.o3-table). Was --o3-font-size-sm; dedicated token makes the "Cỡ chữ cell" knob live (the dock targeted --o3-font-size-md, which nothing read).',
   ARRAY['v3','table','typography','module-master'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend the v3 component contracts' overridable_tokens whitelist.
-- Merge-append (DISTINCT) so this is idempotent and survives whether the
-- 213 contracts already exist (normal case) or not (minimal insert).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_component_contract
  (component_key, display_name_en, display_name_vi, overridable_tokens, preview_scene_key, is_operator_visible)
VALUES
  ('v3.kpi',  'V3 KPI tile', 'Ô KPI v3', ARRAY['components.kpi.valueSize'], 'v3.kpi', TRUE),
  ('v3.chip', 'V3 Chip',     'Chip v3',  ARRAY['components.chip.paddingX','components.chip.fontSize','components.chip.fontWeight'], 'v3.chip', TRUE),
  ('v3.table','V3 Table',    'Bảng v3',  ARRAY['components.table.cellFontSize'], 'v3.table', TRUE)
ON CONFLICT (component_key) DO UPDATE
  SET overridable_tokens = (
        SELECT array_agg(DISTINCT tok ORDER BY tok)
        FROM unnest(graphics_component_contract.overridable_tokens || EXCLUDED.overridable_tokens) AS tok
      ),
      updated_at = NOW();

COMMIT;
