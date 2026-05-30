-- ============================================================================
-- Migration 261: Graphics Authority — L3 Block Contract (Lego-SSOT)
-- ============================================================================
-- Purpose:   Governance/audit mirror of the L3 Block Registry. A "block" is a
--            reusable cluster of L2 components (orders-v3 classes) with named
--            data "slots". Building a module = assembling published blocks and
--            filling slots, never hand-writing component HTML.
--
--            Runtime SSOT  : mom/data/config/graphics-block-registry.json
--            Renderer      : window.BlockKit.render (00bd-blockkit.js)
--            Validation gate: mom/tools/release/check_graphics_block_registry.php
--            This table     : governance + audit + (future) per-tenant scoping
--                             authority for the multi-tenant SaaS direction.
--
--            This is the L3 layer above:
--              L1 graphics_token_catalog   (token primitives)
--              L2 graphics_component_contract (per-component overridable tokens)
--            and below the planned L4 graphics_module_archetype (module shells).
--
-- Authority enforcement:
--   - Each row mirrors one block in the JSON registry. The JSON is the runtime
--     authority; this table is the SSOT-of-record for governance (who may use a
--     block, per-tenant overrides, deprecation), consistent with the migration
--     148 component-contract precedent.
--   - composed_of lists the L2 component_key/CSS classes the block assembles;
--     the gate proves each exists in orders-v3.css before a block may publish.
--
-- Mode:      JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY safe. Idempotent:
--            CREATE TABLE IF NOT EXISTS; seed INSERTs ON CONFLICT merge so
--            re-runs converge.
--
-- Depends on: 148 (creates the graphics_* authority tables + component_contract)
--
-- Date:      2026-05-30
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: graphics_block_contract — L3 reusable block registry (governance mirror)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graphics_block_contract (
    block_contract_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    block_key           VARCHAR(80)  NOT NULL UNIQUE,        -- toolbar.filtered | panel.standard | kpi.grid | ...
    display_name_en     VARCHAR(120) NOT NULL,
    display_name_vi     VARCHAR(120) NOT NULL,
    category            VARCHAR(40)  NOT NULL,               -- layout | display | feedback | navigation | input
    status              VARCHAR(20)  NOT NULL DEFAULT 'draft', -- draft | review | published | deprecated
    composed_of         TEXT[]       NOT NULL DEFAULT '{}',  -- L2 component classes assembled (orders-v3 .o3-… classes)
    root_class          VARCHAR(80),                         -- the block's wrapper class (∈ composed_of)
    slots               JSONB        NOT NULL DEFAULT '{}'::jsonb, -- named data holes: {filters, actions, title, ...}
    variant_axes        JSONB        NOT NULL DEFAULT '{}'::jsonb, -- allowed variants per axis
    required_tokens     TEXT[]       NOT NULL DEFAULT '{}',  -- token_keys the block reads (impact analysis)
    a11y_contract       JSONB        NOT NULL DEFAULT '{}'::jsonb, -- required role + keyboard contract
    preview_scene_key   VARCHAR(80),                         -- optional PreviewScenes binding
    deprecation_note    TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_block_contract IS
  'L3 Lego-SSOT block registry: reusable clusters of L2 components with named data slots. Governance/audit mirror of graphics-block-registry.json. Building a module = assembling published blocks, never hand-writing component HTML.';

CREATE INDEX IF NOT EXISTS idx_graphics_block_contract_category ON graphics_block_contract (category);
CREATE INDEX IF NOT EXISTS idx_graphics_block_contract_status   ON graphics_block_contract (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: the 6 launch blocks (mirror of graphics-block-registry.json).
-- ON CONFLICT updates the governed fields so JSON ↔ table stay convergent.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_block_contract
  (block_key, display_name_en, display_name_vi, category, status, composed_of, root_class, slots, variant_axes, required_tokens, a11y_contract)
VALUES
  ('toolbar.filtered', 'Filtered toolbar', 'Thanh công cụ có lọc', 'layout', 'published',
   ARRAY['o3-toolbar','o3-chip','o3-btn'], 'o3-toolbar',
   '{"filters":{"type":"chip[]"},"search":{"type":"bool|placeholder"},"actions":{"type":"button[]"},"title":{"type":"string"}}'::jsonb,
   '{"density":["standard"]}'::jsonb,
   ARRAY['control.height.standard','spacing.md','spacing.lg','radius.card'],
   '{"role":"toolbar"}'::jsonb),

  ('panel.standard', 'Standard panel', 'Panel chuẩn', 'layout', 'published',
   ARRAY['o3-panel','o3-btn'], 'o3-panel',
   '{"title":{"type":"string","required":true},"count":{"type":"string"},"actions":{"type":"button[]"},"body":{"type":"html","required":true},"flush":{"type":"bool"}}'::jsonb,
   '{"body":["padded","flush"]}'::jsonb,
   ARRAY['spacing.md','spacing.lg','radius.card','colorsLight.bgSurface','colorsLight.borderSubtle'],
   '{"role":"region"}'::jsonb),

  ('kpi.grid', 'KPI tile grid', 'Lưới ô KPI', 'display', 'published',
   ARRAY['o3-kpi-grid','o3-kpi'], 'o3-kpi-grid',
   '{"tiles":{"type":"kpi[]","required":true}}'::jsonb,
   '{"tone":["brand","success","warning","danger","info"]}'::jsonb,
   ARRAY['spacing.lg','radius.card','colorsLight.bgSurface','colorsLight.borderSubtle','brand.primary'],
   '{"role":"group"}'::jsonb),

  ('table.data', 'Data table', 'Bảng dữ liệu', 'display', 'published',
   ARRAY['o3-table-wrap','o3-table'], 'o3-table-wrap',
   '{"columns":{"type":"string[]","required":true},"rows":{"type":"cell[][]","required":true}}'::jsonb,
   '{"row":["default","clickable","selected"]}'::jsonb,
   ARRAY['spacing.sm','spacing.md','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','colorsLight.textPrimary'],
   '{"role":"table"}'::jsonb),

  ('empty.state', 'Empty state', 'Trạng thái rỗng', 'feedback', 'published',
   ARRAY['o3-empty'], 'o3-empty',
   '{"icon":{"type":"string"},"title":{"type":"string","required":true},"hint":{"type":"string"}}'::jsonb,
   '{}'::jsonb,
   ARRAY['spacing.lg','spacing.3xl','colorsLight.bgSurface','colorsLight.borderSubtle'],
   '{"role":"status"}'::jsonb),

  ('shell.workspace', 'Workspace shell', 'Khung workspace', 'navigation', 'published',
   ARRAY['o3-shell','o3-shell__topbar','o3-shell__tabs','o3-shell__tab','o3-shell__body'], 'o3-shell',
   '{"title":{"type":"string","required":true},"subtitle":{"type":"string"},"tabs":{"type":"tab[]"},"body":{"type":"html","required":true}}'::jsonb,
   '{}'::jsonb,
   ARRAY['control.height.standard','spacing.md','spacing.lg','brand.primary','colorsLight.borderSubtle'],
   '{"role":"region"}'::jsonb)
ON CONFLICT (block_key) DO UPDATE
  SET display_name_en = EXCLUDED.display_name_en,
      display_name_vi = EXCLUDED.display_name_vi,
      category        = EXCLUDED.category,
      status          = EXCLUDED.status,
      composed_of     = EXCLUDED.composed_of,
      root_class      = EXCLUDED.root_class,
      slots           = EXCLUDED.slots,
      variant_axes    = EXCLUDED.variant_axes,
      required_tokens = EXCLUDED.required_tokens,
      a11y_contract   = EXCLUDED.a11y_contract,
      updated_at      = NOW();

COMMIT;
