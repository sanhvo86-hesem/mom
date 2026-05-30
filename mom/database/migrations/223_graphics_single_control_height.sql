-- ============================================================================
-- Migration 223: Single standard control-height (consolidate triad)
-- (Originally drafted as 214; renumbered because 214–222 were taken
--  by the UoM/packaging migration family from a parallel session.)
-- ============================================================================
-- Purpose:   HESEM SSOT simplification rule (2026-05-28): keep ONE size
--            for interactive controls, not three. The previous triad
--            (control.height.sm / md / lg) introduced too many decisions
--            and led to inconsistent component height adoption.
--
--            New rule: every interactive control (button, tab, input,
--            chip-button, search) uses ONE token — control.height.standard
--            (36px). No "small" / "large" variants. If a component must
--            be denser or larger, propose a new token via Authority + run
--            simulation evidence, never one-off CSS.
--
-- Outcome:   - control.height.sm → DROP
--            - control.height.lg → DROP
--            - control.height.md → keep value, rename key to
--              `control.height.standard`, keep css-var --o3-control-h-md
--              alive for one release to avoid breaking the staging
--              orders-v3 stylesheet (will be replaced in the same PR).
--            - graphics_component_contract.overridable_tokens — every
--              v3.* contract that referenced sm/lg gets rewritten to
--              reference only .standard.
--
-- Date:      2026-05-28
-- ============================================================================

BEGIN;

-- 1. Drop the sm/lg rows. Use deprecation note in case anything still
--    queries them — DesignTokenCatalogService returns NULL gracefully.
DELETE FROM graphics_token_value WHERE token_key IN ('control.height.sm','control.height.lg');
DELETE FROM graphics_token_catalog WHERE token_key IN ('control.height.sm','control.height.lg');

-- 2. Add the new canonical row. We keep the md css-variable name so
--    existing CSS in orders-v3.css (--o3-control-h-md) keeps resolving
--    for one release; the next CSS push will rename it to
--    --o3-control-h-standard for clarity.
INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type,
   min_numeric, max_numeric, step_numeric, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('control.height.standard', '--o3-control-h-standard', 'semantic', 'sizing', 'control',
   'px', 28, 48, 2, 'px',
   '36px', '36px', '36px',
   'STANDARD control height — every interactive control (button, tab, input, chip-button, search) must use this. No "small"/"large" variants exist. To request a denser or larger size, propose a new token via Authority and run simulation evidence first.',
   ARRAY['v3','control','height','standard'])
ON CONFLICT (token_key) DO UPDATE
  SET css_variable   = EXCLUDED.css_variable,
      default_light  = EXCLUDED.default_light,
      default_dark   = EXCLUDED.default_dark,
      default_high_contrast = EXCLUDED.default_high_contrast,
      description    = EXCLUDED.description,
      tags           = EXCLUDED.tags;

-- 3. Update legacy control.height.md to alias the new standard so any
--    code still reading `.md` resolves to the same value.
UPDATE graphics_token_catalog
   SET alias_of = 'control.height.standard',
       description = 'DEPRECATED 2026-05-28: use control.height.standard. Kept for one release as a transitional alias.',
       is_deprecated = TRUE,
       deprecation_note = 'Replaced by control.height.standard. Update CSS references to --o3-control-h-standard.'
 WHERE token_key = 'control.height.md';

-- 4. Rewrite every v3.* component contract to reference only the
--    standard size — remove sm/lg from overridable_tokens, add standard.
UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'spacing.md','spacing.lg','radius.md',
     'brand.primary','brand.primaryHover',
     'status.success.light','status.danger.light',
     'colorsLight.textOnBrand','colorsLight.borderSubtle','colorsLight.borderStrong'
   ]
 WHERE component_key = 'v3.button';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'spacing.md','spacing.lg',
     'brand.primary','colorsLight.textPrimary','colorsLight.textSecondary',
     'colorsLight.borderSubtle'
   ]
 WHERE component_key = 'v3.tab';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'spacing.xs','spacing.sm','radius.pill',
     'status.success.soft','status.warning.soft','status.danger.soft','status.info.soft','status.neutral.soft',
     'status.success.light','status.warning.light','status.danger.light','status.info.light','status.neutral.light'
   ]
 WHERE component_key = 'v3.chip';

UPDATE graphics_component_contract
   SET overridable_tokens = ARRAY[
     'control.height.standard',
     'spacing.md','spacing.lg','radius.lg',
     'colorsLight.bgSurface','colorsLight.borderSubtle'
   ]
 WHERE component_key = 'v3.toolbar';

COMMIT;
