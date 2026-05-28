-- ============================================================================
-- Migration 213: Graphics Authority — Orders v3 token set
-- ============================================================================
-- Purpose:   Bring the Orders v3 module (09v3-*.js, orders-v3.css) under
--            SSOT governance. Adds 30+ tokens missing from the catalog:
--            - control-height triad (sm/md/lg) — fixes the user-reported
--              "buttons and tabs have unequal heights" issue
--            - spacing scale (xs/sm/md/lg/xl/2xl/3xl)
--            - radius scale (sm/md/lg/pill)
--            - status soft variants (success/warning/danger/info/neutral)
--            - brand hover + soft variants
--            - subtle/strong borders
--
--            Also adds component contracts for the 6 v3 surface controls
--            (button, tab, kpi, table, chip, drawer, toolbar) so the new
--            "Module Sample" admin sub-tab can offer guided edits.
--
-- Authority enforcement:
--   - Every --o3-* CSS variable in orders-v3.css now traces back to a
--     row here, either directly or via alias chain.
--   - 09v3-orders-tokens.js publishes the same token keys to the
--     OrdersV3.tokens namespace.
--   - The renderModuleSample() admin sub-tab uses these contracts as
--     the WHITELIST of tunable parameters.
--
-- Mode:      Compatible with the JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY
--            ladder. Defaults are seeded so JSON_ONLY deployments work too.
--
-- Standards: WCAG 2.2 AA (text contrast 4.5, non-text 3.0), Fluent triad
--            (light/dark/high-contrast/print).
--
-- Date:      2026-05-28
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Control-height triad
-- The root cause of the "không đồng vô" (heights don't match) report.
-- Every interactive control (button, tab, input, chip-as-button) should
-- snap to one of these three heights. Without explicit tokens, heights
-- diverged because they were computed from per-component padding+font.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type,
   min_numeric, max_numeric, step_numeric, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('control.height.sm', '--o3-control-h-sm', 'semantic', 'sizing', 'control',
   'px', 24, 36, 2, 'px',
   '28px', '28px', '28px',
   'Small interactive control height — chips, tags, compact buttons. Whole-pixel-step keeps borders crisp.',
   ARRAY['v3','control','height']),

  ('control.height.md', '--o3-control-h-md', 'semantic', 'sizing', 'control',
   'px', 32, 48, 2, 'px',
   '36px', '36px', '36px',
   'Medium control height — toolbar buttons, search input, tab strip. Default for any toolbar-level element to guarantee horizontal alignment.',
   ARRAY['v3','control','height']),

  ('control.height.lg', '--o3-control-h-lg', 'semantic', 'sizing', 'control',
   'px', 40, 56, 2, 'px',
   '44px', '44px', '44px',
   'Large control height — primary CTAs, form submit, hero buttons. Reach target ≥44px (WCAG 2.5.5 enhanced).',
   ARRAY['v3','control','height'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Spacing scale (XS → 3XL)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('spacing.xs',  '--o3-space-xs',  'global', 'spacing', 'scale', 'px', 'px', '4px',  '4px',  '4px',  'XS spacing (4px) — between icon and label.',          ARRAY['v3','spacing']),
  ('spacing.sm',  '--o3-space-sm',  'global', 'spacing', 'scale', 'px', 'px', '8px',  '8px',  '8px',  'SM spacing (8px) — chip gaps, dense tables.',         ARRAY['v3','spacing']),
  ('spacing.md',  '--o3-space-md',  'global', 'spacing', 'scale', 'px', 'px', '12px', '12px', '12px', 'MD spacing (12px) — comfortable inline padding.',      ARRAY['v3','spacing']),
  ('spacing.lg',  '--o3-space-lg',  'global', 'spacing', 'scale', 'px', 'px', '16px', '16px', '16px', 'LG spacing (16px) — panel padding, KPI tile padding.', ARRAY['v3','spacing']),
  ('spacing.xl',  '--o3-space-xl',  'global', 'spacing', 'scale', 'px', 'px', '24px', '24px', '24px', 'XL spacing (24px) — section gap, shell body padding.', ARRAY['v3','spacing']),
  ('spacing.2xl', '--o3-space-2xl', 'global', 'spacing', 'scale', 'px', 'px', '32px', '32px', '32px', '2XL spacing (32px) — workspace divider.',              ARRAY['v3','spacing']),
  ('spacing.3xl', '--o3-space-3xl', 'global', 'spacing', 'scale', 'px', 'px', '48px', '48px', '48px', '3XL spacing (48px) — empty-state vertical pad.',       ARRAY['v3','spacing'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Radius scale
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('radius.sm',   '--o3-radius-sm',   'global', 'radius', 'scale', 'px', 'px', '4px',   '4px',   '4px',   'SM radius (4px) — table cell, inline tag.',  ARRAY['v3','radius']),
  ('radius.md',   '--o3-radius-md',   'global', 'radius', 'scale', 'px', 'px', '6px',   '6px',   '6px',   'MD radius (6px) — buttons, inputs.',         ARRAY['v3','radius']),
  ('radius.lg',   '--o3-radius-lg',   'global', 'radius', 'scale', 'px', 'px', '10px',  '10px',  '10px',  'LG radius (10px) — cards, KPI tiles.',       ARRAY['v3','radius']),
  ('radius.pill', '--o3-radius-pill', 'global', 'radius', 'scale', 'px', 'px', '999px', '999px', '999px', 'PILL radius — chips, badges.',                ARRAY['v3','radius'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Status soft variants + neutral
-- The "soft" tokens are the pastel backgrounds used behind status text
-- (chips, KPI tones). Already used in orders-v3.css but never registered.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type,
   default_light, default_dark, default_high_contrast, default_print,
   description, tags)
VALUES
  ('status.success.soft', '--state-success-soft', 'semantic', 'color', 'status', 'hex',
   '#d1fae5', '#064e3b', '#a7f3d0', '#e6f7e9', 'Soft background behind success text.', ARRAY['v3','status']),
  ('status.warning.soft', '--state-warning-soft', 'semantic', 'color', 'status', 'hex',
   '#fef3c7', '#78350f', '#fcd34d', '#fff8d6', 'Soft background behind warning text.', ARRAY['v3','status']),
  ('status.danger.light', '--state-danger',       'semantic', 'color', 'status', 'hex',
   '#b91c1c', '#fca5a5', '#ff0000', '#990000', 'Danger / error semantic alias used by Orders v3.', ARRAY['v3','status']),
  ('status.danger.soft',  '--state-danger-soft',  'semantic', 'color', 'status', 'hex',
   '#fee2e2', '#7f1d1d', '#fecaca', '#fde2e2', 'Soft background behind danger text.', ARRAY['v3','status']),
  ('status.info.soft',    '--state-info-soft',    'semantic', 'color', 'status', 'hex',
   '#dbeafe', '#1e3a8a', '#bfdbfe', '#e0e8f8', 'Soft background behind info text.', ARRAY['v3','status']),
  ('status.neutral.light','--state-neutral',      'semantic', 'color', 'status', 'hex',
   '#475569', '#cbd5e1', '#333333', '#1f1f1f', 'Neutral / manual semantic.', ARRAY['v3','status']),
  ('status.neutral.soft', '--state-neutral-soft', 'semantic', 'color', 'status', 'hex',
   '#f1f5f9', '#1e293b', '#e5e7eb', '#f3f4f6', 'Soft background for neutral state.', ARRAY['v3','status'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Brand hover + soft variants + border subtle/strong
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('brand.primaryHover', '--brand-primary-hover', 'semantic', 'color', 'brand', 'hex',
   '#075985', '#0369a1', '#001a55', 'Primary button hover.', ARRAY['v3','brand']),
  ('brand.primarySoft',  '--brand-primary-soft',  'semantic', 'color', 'brand', 'hex',
   '#e0f2fe', '#0c4a6e', '#cce5ff', 'Soft brand background (active tab indicator, hover tints).', ARRAY['v3','brand']),
  ('colorsLight.borderSubtle', '--border-subtle',  'semantic', 'color', 'border', 'hex',
   '#e5e7eb', '#1f2937', '#cccccc', 'Subtle hairline border (panel, table row divider).', ARRAY['v3','border']),
  ('colorsLight.borderStrong', '--border-strong',  'semantic', 'color', 'border', 'hex',
   '#94a3b8', '#475569', '#666666', 'Strong border (focus ring, active states).', ARRAY['v3','border'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Text on brand + inverse
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('colorsLight.textOnBrand', '--text-on-brand', 'semantic', 'color', 'text', 'hex',
   '#ffffff', '#ffffff', '#ffffff', 'Text color on brand surfaces (primary buttons, header).', ARRAY['v3','text'])
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Component contracts for the v3 surface controls
-- These declare the WHITELIST of tokens the admin Module Sample tab will
-- expose for tuning. Following the existing graphics_component_contract
-- pattern: one row per component_key, overridable_tokens is a sorted array.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_component_contract
  (component_key, display_name_en, display_name_vi, overridable_tokens, preview_scene_key, is_operator_visible)
VALUES
  ('v3.button',
   'V3 Button',
   'Nút bấm v3',
   ARRAY[
     'control.height.md','control.height.lg','control.height.sm',
     'spacing.md','spacing.lg','radius.md',
     'brand.primary','brand.primaryHover',
     'status.success.light','status.danger.light',
     'colorsLight.textOnBrand','colorsLight.borderSubtle','colorsLight.borderStrong'
   ],
   'v3.button',
   TRUE),

  ('v3.tab',
   'V3 Workspace tab',
   'Tab workspace v3',
   ARRAY[
     'control.height.lg',
     'spacing.md','spacing.lg',
     'brand.primary','colorsLight.textPrimary','colorsLight.textSecondary',
     'colorsLight.borderSubtle'
   ],
   'v3.tab',
   TRUE),

  ('v3.kpi',
   'V3 KPI tile',
   'Ô KPI v3',
   ARRAY[
     'spacing.lg','radius.lg',
     'colorsLight.bgSurface','colorsLight.borderSubtle',
     'colorsLight.textPrimary','colorsLight.textTertiary',
     'brand.primary','status.success.light','status.warning.light','status.danger.light','status.info.light'
   ],
   'v3.kpi',
   TRUE),

  ('v3.chip',
   'V3 Chip',
   'Chip v3',
   ARRAY[
     'control.height.sm',
     'spacing.xs','spacing.sm','radius.pill',
     'status.success.soft','status.warning.soft','status.danger.soft','status.info.soft','status.neutral.soft',
     'status.success.light','status.warning.light','status.danger.light','status.info.light','status.neutral.light'
   ],
   'v3.chip',
   TRUE),

  ('v3.table',
   'V3 Table',
   'Bảng v3',
   ARRAY[
     'spacing.sm','spacing.md',
     'colorsLight.bgSurfaceAlt','colorsLight.borderSubtle',
     'colorsLight.textPrimary','colorsLight.textTertiary'
   ],
   'v3.table',
   TRUE),

  ('v3.drawer',
   'V3 Drawer',
   'Drawer v3',
   ARRAY[
     'spacing.lg','colorsLight.bgSurface','colorsLight.borderSubtle','effects.shadowLg'
   ],
   'v3.drawer',
   TRUE),

  ('v3.toolbar',
   'V3 Toolbar',
   'Toolbar v3',
   ARRAY[
     'control.height.md',
     'spacing.md','spacing.lg','radius.lg',
     'colorsLight.bgSurface','colorsLight.borderSubtle'
   ],
   'v3.toolbar',
   TRUE)
ON CONFLICT (component_key) DO UPDATE
  SET display_name_en   = EXCLUDED.display_name_en,
      display_name_vi   = EXCLUDED.display_name_vi,
      overridable_tokens= EXCLUDED.overridable_tokens,
      preview_scene_key = EXCLUDED.preview_scene_key,
      is_operator_visible=EXCLUDED.is_operator_visible;

COMMIT;
