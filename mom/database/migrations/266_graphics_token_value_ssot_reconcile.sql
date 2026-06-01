-- ============================================================================
-- Migration 266: Reconcile stale graphics_token_value rows with the SSOT
-- ============================================================================
-- Purpose:   The 2026-06-01 Module Studio P0.2 live audit (eqms.hesemeng.com)
--            found graphics_token_value — the effective runtime authority read
--            by GraphicsAuthority's snapshot — still holding pre-SSOT values,
--            even though migrations 223/227/230 already corrected the
--            graphics_token_catalog DEFAULTS. Those migrations updated catalog
--            defaults but never re-seeded the already-published token_value rows,
--            so the snapshot served stale values while the CSS (orders-v3.css)
--            rendered the canonical ones — a silent CSS-default vs token-value
--            divergence (JS consumers of GraphicsAuthority.tokens.read got the
--            wrong value).
--
--            Confirmed divergences (DB effective value -> SSOT):
--              brand.primary            #0c4f6e (typo of #0c4a6e) -> #0c4a6e
--              control.height.standard  24px -> 32px   (migration 230 single-size)
--              density.controlH         24px -> 32px   (migration 230)
--              space.section            8px  -> 12px   (migration 227 master density)
--
--            Also aligns the brand.primary catalog default_light (#1565c0, the
--            pre-264 seed from migration 148) to the canonical #0c4a6e so any new
--            scope inherits the correct brand. Distinct brand variants left
--            untouched (default_dark #1e88e5, high_contrast, print). The
--            deprecated control-height triad (sm/lg) and unrelated 24px tokens
--            (modal.padding / kpi.iconSize / field.groupGap) are intentionally
--            NOT changed.
--
-- Safety:    Idempotent + guarded — only rewrites rows still holding the stale
--            value (the WHERE clause makes a second run a no-op). Data-only
--            UPDATE, no schema change. Re-runnable. Visual risk low: the CSS
--            already renders the canonical values; this aligns the DB token
--            authority to match.
-- ============================================================================

-- 1. brand.primary: typo (#0c4f6e) / pre-264 seed (#1565c0) -> canonical #0c4a6e
UPDATE graphics_token_value
   SET value = '#0c4a6e', updated_at = NOW()
 WHERE token_key = 'brand.primary'
   AND lower(value) IN ('#0c4f6e', '#1565c0');

UPDATE graphics_token_value
   SET draft_value = '#0c4a6e', updated_at = NOW()
 WHERE token_key = 'brand.primary'
   AND draft_value IS NOT NULL
   AND lower(draft_value) IN ('#0c4f6e', '#1565c0');

UPDATE graphics_token_catalog
   SET default_light = '#0c4a6e'
 WHERE token_key = 'brand.primary'
   AND lower(default_light) IN ('#0c4f6e', '#1565c0');

-- 2. control height: 24px -> 32px (catalog already 32 via mig 230; token_value stale)
UPDATE graphics_token_value
   SET value = '32px', updated_at = NOW()
 WHERE token_key IN ('control.height.standard', 'density.controlH')
   AND value = '24px';

UPDATE graphics_token_value
   SET draft_value = '32px', updated_at = NOW()
 WHERE token_key IN ('control.height.standard', 'density.controlH')
   AND draft_value = '24px';

-- 3. section gap: 8px -> 12px (catalog already 12 via mig 227; token_value stale)
UPDATE graphics_token_value
   SET value = '12px', updated_at = NOW()
 WHERE token_key = 'space.section'
   AND value = '8px';

UPDATE graphics_token_value
   SET draft_value = '12px', updated_at = NOW()
 WHERE token_key = 'space.section'
   AND draft_value = '8px';
