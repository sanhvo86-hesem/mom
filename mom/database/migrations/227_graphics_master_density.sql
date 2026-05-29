-- ============================================================================
-- Migration 227: Master density tokens — consolidate spacing + radius scales
-- ============================================================================
-- Purpose:   HESEM SSOT density rule (2026-05-29, user mandate):
--            "có 1 ô duy nhất điều chỉnh khe hở giữa các đối tượng …
--             tối đa là hai hoặc ít" — ONE control to adjust gaps,
--            max 2 sizes.
--
-- Research:  Aligned with Linear (single --space-base: 8px), iOS HIG
--            (8pt grid), Material 3 (4dp baseline), Bloomberg Terminal
--            (single density multiplier), SAP Fiori (compact mode is
--            ONE switch that scales every gap).
--
-- Outcome:
--   Spacing:
--     - space.master     = 8px   ← used for 99% of gaps. Adjust THIS one
--                                   value to compress/expand the whole UI.
--     - space.section    = 12px  ← only for top-level section dividers,
--                                   used sparingly.
--     - spacing.xs/sm/md/lg/xl/2xl/3xl ← aliased to one of the two above
--                                          for back-compat; deprecated.
--   Radius:
--     - radius.master    = 4px   ← all controls (buttons, chips, inputs).
--     - radius.card      = 8px   ← only cards, panels, KPI tiles, drawers.
--     - radius.pill      = 999px ← special purpose, kept.
--     - radius.sm/md/lg  ← aliased; deprecated.
--   Scrollbar:
--     - scrollbarThumb default flipped from purple/grey to brand amber
--       (brand.accent = #f9a825). User asked for the orange palette and
--       it matches HESEM's industrial brand.
--
-- Date:      2026-05-29
-- ============================================================================

BEGIN;

-- ── 1. Spacing master tokens ────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type, unit,
   min_numeric, max_numeric, step_numeric,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('space.master',  '--o3-space',         'global', 'spacing', 'master',
   'px', 'px', 4, 16, 2,
   '8px', '8px', '8px',
   'MASTER spacing — 99% of gaps in the UI derive from this one value. Compressing this value compresses the whole UI proportionally. SAP/Linear/iOS standard.',
   ARRAY['v3','spacing','master','density']),
  ('space.section', '--o3-space-section', 'global', 'spacing', 'master',
   'px', 'px', 8, 24, 2,
   '12px', '12px', '12px',
   'SECTION spacing — used ONLY for top-level section dividers (between panels). Use master for everything else.',
   ARRAY['v3','spacing','section','density'])
ON CONFLICT (token_key) DO UPDATE
  SET css_variable   = EXCLUDED.css_variable,
      default_light  = EXCLUDED.default_light,
      default_dark   = EXCLUDED.default_dark,
      default_high_contrast = EXCLUDED.default_high_contrast,
      description    = EXCLUDED.description,
      tags           = EXCLUDED.tags;

-- ── 2. Deprecate the 7-level spacing scale by aliasing ─────────────────────
UPDATE graphics_token_catalog
   SET alias_of = 'space.master',
       is_deprecated = TRUE,
       deprecation_note = 'Use space.master. The 7-level scale (xs/sm/md/lg/xl/2xl/3xl) was over-engineered; consolidated 2026-05-29.'
 WHERE token_key IN ('spacing.xs','spacing.sm','spacing.md','spacing.lg','spacing.xl');

UPDATE graphics_token_catalog
   SET alias_of = 'space.section',
       is_deprecated = TRUE,
       deprecation_note = 'Use space.section. The 7-level scale was consolidated 2026-05-29.'
 WHERE token_key IN ('spacing.2xl','spacing.3xl');

-- ── 3. Radius master tokens ────────────────────────────────────────────────
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type, unit,
   min_numeric, max_numeric, step_numeric,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('radius.master', '--o3-radius',      'global', 'radius', 'master',
   'px', 'px', 0, 12, 1,
   '4px', '4px', '4px',
   'MASTER radius — every interactive control (button, chip, input, tab) uses this single value. Adjust to round/sharpen the whole UI at once.',
   ARRAY['v3','radius','master','density']),
  ('radius.card',   '--o3-radius-card', 'global', 'radius', 'master',
   'px', 'px', 0, 16, 1,
   '8px', '8px', '8px',
   'CARD radius — used ONLY by cards, panels, KPI tiles, drawers. Controls visual rhythm at the container level.',
   ARRAY['v3','radius','card','density'])
ON CONFLICT (token_key) DO UPDATE
  SET css_variable   = EXCLUDED.css_variable,
      default_light  = EXCLUDED.default_light,
      default_dark   = EXCLUDED.default_dark,
      default_high_contrast = EXCLUDED.default_high_contrast,
      description    = EXCLUDED.description,
      tags           = EXCLUDED.tags;

-- ── 4. Deprecate the 3-level radius scale (keep .pill — special purpose) ──
UPDATE graphics_token_catalog
   SET alias_of = 'radius.master',
       is_deprecated = TRUE,
       deprecation_note = 'Use radius.master. The 3-level radius scale (sm/md/lg) was consolidated 2026-05-29.'
 WHERE token_key IN ('radius.sm','radius.md');

UPDATE graphics_token_catalog
   SET alias_of = 'radius.card',
       is_deprecated = TRUE,
       deprecation_note = 'Use radius.card. The 3-level radius scale was consolidated 2026-05-29.'
 WHERE token_key = 'radius.lg';
-- radius.pill stays as-is — it's not part of the master scale.

-- ── 5. Scrollbar — flip from purple/grey to HESEM brand amber ──────────────
-- Use the actual registered keys: effects.scrollbarThumb / Track
UPDATE graphics_token_catalog
   SET default_light = '#f9a825',
       default_dark  = '#fdd835',
       default_high_contrast = '#ff9900',
       description = 'Scrollbar thumb — HESEM amber by default (2026-05-29). Tunable per org.'
 WHERE token_key = 'effects.scrollbarThumb';

UPDATE graphics_token_catalog
   SET default_light = '#fef3c7',
       default_dark  = '#78350f',
       default_high_contrast = '#ffd9a0',
       description = 'Scrollbar track — soft amber by default (2026-05-29).'
 WHERE token_key = 'effects.scrollbarTrack';

-- ── 6. Rewrite v3.* component contracts to reference master tokens ─────────
UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'space.master','space.section','radius.master',
     'brand.primary','brand.primaryHover',
     'status.success.light','status.danger.light',
     'colorsLight.textOnBrand','colorsLight.borderSubtle','colorsLight.borderStrong'
   ]
 WHERE component_key = 'v3.button';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'space.master','space.section',
     'brand.primary','colorsLight.textPrimary','colorsLight.textSecondary',
     'colorsLight.borderSubtle'
   ]
 WHERE component_key = 'v3.tab';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'space.master','space.section','radius.card',
     'colorsLight.bgSurface','colorsLight.borderSubtle',
     'colorsLight.textPrimary','colorsLight.textTertiary',
     'brand.primary','status.success.light','status.warning.light','status.danger.light','status.info.light'
   ]
 WHERE component_key = 'v3.kpi';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'space.master','radius.master',
     'status.success.soft','status.warning.soft','status.danger.soft','status.info.soft','status.neutral.soft',
     'status.success.light','status.warning.light','status.danger.light','status.info.light','status.neutral.light'
   ]
 WHERE component_key = 'v3.chip';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'space.master','space.section','radius.card',
     'colorsLight.bgSurfaceAlt','colorsLight.borderSubtle',
     'colorsLight.textPrimary','colorsLight.textTertiary'
   ]
 WHERE component_key = 'v3.table';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'space.master','space.section','radius.card',
     'colorsLight.bgSurface','colorsLight.borderSubtle'
   ]
 WHERE component_key = 'v3.drawer';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'space.master','radius.card',
     'colorsLight.bgSurface','colorsLight.borderSubtle'
   ]
 WHERE component_key = 'v3.toolbar';

COMMIT;
