-- ============================================================================
-- Migration 264: Align HESEM-family theme presets to the canonical brand
-- ============================================================================
-- Purpose:   Reconcile the theme-authority divergence found in the 2026-06-01
--            P1-P4 live audit (finding F5). The live portal default brand is
--            #0c4a6e (admin design-system-config), but the graphics_theme_preset
--            seed (migration 263) used #1565c0 for the HESEM-family presets.
--            Picking the "HESEM mặc định" preset therefore jumped the brand and
--            the global sidebar active text (#0c4a6e) could diverge from its
--            brand-soft fill (Lego authority) on preset switch.
--
--            Canonical HESEM brand (founder decision, 2026-06-01): #0c4a6e.
--            Re-point the HESEM-family presets (default / industrial-dense /
--            comfortable) to it. The intentionally-distinct presets — shop-floor
--            (#0f766e teal touch), violet (#7c3aed), slate (#334155) — are left
--            untouched.
--
--            Mirrors the runtime/PHP builtin fallbacks updated in the same change:
--            mom/scripts/portal/00bg-lego-theme.js (THEMES) and
--            mom/api/services/DesignTokenCatalogService.php (builtinThemePresets).
--
-- Safety:    Idempotent — only rewrites rows still holding the old seed brand.
--            Data-only UPDATE, no schema change. Re-runnable.
-- ============================================================================

UPDATE graphics_theme_preset
   SET brand = '#0c4a6e',
       updated_at = NOW()
 WHERE preset_key IN ('hesem-default', 'industrial-dense', 'comfortable')
   AND lower(brand) = '#1565c0';
