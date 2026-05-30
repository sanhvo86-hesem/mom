-- ============================================================================
-- Migration 262: Graphics Authority — L4 Module Archetype (Lego-SSOT)
-- ============================================================================
-- Purpose:   Governance/audit mirror of the L4 Module Archetype Registry. An
--            archetype is a complete module shell: an arrangement of L3 blocks
--            into named zones (header/body/aside). Building a module = pick an
--            archetype, fill each zone with a block + slot data; ArchetypeKit
--            renders the whole surface.
--
--            Runtime SSOT  : mom/scripts/portal/00be-archetype-registry.js
--            Renderer      : window.ArchetypeKit.render (00bf-archetypekit.js)
--            Validation gate: mom/tools/release/check_graphics_archetype_registry.php
--            This table     : governance + audit + (future) per-tenant scoping.
--
--            Top of the Lego stack:
--              L1 graphics_token_catalog      (token primitives)
--              L2 graphics_component_contract (per-component overridable tokens)
--              L3 graphics_block_contract     (reusable blocks of components)
--              L4 graphics_module_archetype   (module shells of blocks)  <-- here
--
--            route_class maps to the HMV4 Wave-1 patterns (workspace-projection
--            / authoritative-record), so an HMV4 slice = an archetype instance.
--
-- Mode:      JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY safe. Idempotent:
--            CREATE TABLE IF NOT EXISTS; seed INSERTs ON CONFLICT merge.
--
-- Depends on: 148 (graphics_* authority tables), 261 (graphics_block_contract)
--
-- Date:      2026-05-31
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS graphics_module_archetype (
    archetype_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    archetype_key       VARCHAR(80)  NOT NULL UNIQUE,        -- workspace-projection | authoritative-record-shell | ...
    display_name_en     VARCHAR(120) NOT NULL,
    display_name_vi     VARCHAR(120) NOT NULL,
    route_class         VARCHAR(60)  NOT NULL,               -- HMV4 route class this archetype serves
    status              VARCHAR(20)  NOT NULL DEFAULT 'draft', -- draft | review | published | deprecated
    zones               JSONB        NOT NULL DEFAULT '{}'::jsonb, -- zone -> {block, required, desc}
    zone_order          TEXT[]       NOT NULL DEFAULT '{}',  -- body render order of non-shell zones
    required_blocks     TEXT[]       NOT NULL DEFAULT '{}',  -- L3 block_keys that must be present
    forbidden_patterns  TEXT[]       NOT NULL DEFAULT '{}',  -- anti-patterns the QA gate rejects
    a11y_contract       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    deprecation_note    TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_module_archetype IS
  'L4 Lego-SSOT module archetypes: complete module shells arranging L3 blocks into named zones. Governance/audit mirror of 00be-archetype-registry.js. Building a module = pick an archetype + fill zones, never hand-writing shell HTML.';

CREATE INDEX IF NOT EXISTS idx_graphics_module_archetype_route  ON graphics_module_archetype (route_class);
CREATE INDEX IF NOT EXISTS idx_graphics_module_archetype_status ON graphics_module_archetype (status);

INSERT INTO graphics_module_archetype
  (archetype_key, display_name_en, display_name_vi, route_class, status, zones, zone_order, required_blocks, forbidden_patterns, a11y_contract)
VALUES
  ('workspace-projection', 'Workspace projection', 'Phép chiếu workspace', 'workspace-projection', 'published',
   '{"shell":{"block":"shell.workspace","required":true},"kpis":{"block":"kpi.grid","required":false},"toolbar":{"block":"toolbar.filtered","required":false},"list":{"block":"table.data","required":true},"empty":{"block":"empty.state","required":false}}'::jsonb,
   ARRAY['kpis','toolbar','list'],
   ARRAY['shell.workspace','table.data'],
   ARRAY['hand-written table markup','inline toolbar HTML'],
   '{"landmark":"region per zone; single h-level for shell title"}'::jsonb),

  ('authoritative-record-shell', 'Authoritative record shell', 'Khung hồ sơ thẩm quyền', 'authoritative-record', 'published',
   '{"shell":{"block":"shell.workspace","required":true},"actions":{"block":"toolbar.filtered","required":false},"main":{"block":"panel.standard","required":true},"aside":{"block":"panel.standard","required":false},"empty":{"block":"empty.state","required":false}}'::jsonb,
   ARRAY['actions','main','aside'],
   ARRAY['shell.workspace','panel.standard'],
   ARRAY['hand-written panel markup'],
   '{"landmark":"main + complementary (aside); record title is the shell accessible name"}'::jsonb)
ON CONFLICT (archetype_key) DO UPDATE
  SET display_name_en    = EXCLUDED.display_name_en,
      display_name_vi    = EXCLUDED.display_name_vi,
      route_class        = EXCLUDED.route_class,
      status             = EXCLUDED.status,
      zones              = EXCLUDED.zones,
      zone_order         = EXCLUDED.zone_order,
      required_blocks    = EXCLUDED.required_blocks,
      forbidden_patterns = EXCLUDED.forbidden_patterns,
      a11y_contract      = EXCLUDED.a11y_contract,
      updated_at         = NOW();

COMMIT;
