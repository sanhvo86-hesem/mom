-- ============================================================================
-- Migration 285: graphics_token_value organization:default completeness backfill
-- ============================================================================
-- Purpose:   Module Studio P0.B2 (one-token-authority convergence). The runtime
--            authority read by GraphicsAuthority's snapshot is graphics_token_value
--            at scope organization:default. snapshotEffective() queries ONLY the
--            requested color_mode (no light fallback at the whole-map level) and
--            DesignTokenCatalogService::snapshotEffective falls back to the legacy
--            JSON config (design-system-config.json) only when that query returns
--            ZERO rows. The per-key GraphicsAuthority.tokens.read() fallback to
--            HmTheme.getDeep (JSON) fires whenever a token_key is absent from the
--            snapshot map.
--
--            Migration 148:511-533 seeded org:default values for every catalog
--            key that existed in April 2026. Later migrations (213/230/261-265,
--            DCC header tokens, rail accent, role colors, status soft variants,
--            master density/radius/control-height) ADDED catalog rows but never
--            re-ran the value backfill — so 40 governed catalog keys have a
--            light value of NULL (no graphics_token_value row), and dark /
--            high-contrast have matching gaps. Those keys silently fall through
--            to the JSON authority, defeating the single-token-authority goal.
--
--            Two defects fixed here:
--              1. 40 catalog keys with no org:default light value row (e.g.
--                 control.height.standard, radius.master, space.master,
--                 brand.primaryHover, semantic.color.role.*, status.*.soft),
--                 plus their dark / high-contrast / print gaps.
--              2. 22 dcc.header.* rows were seeded with color_mode 'high_contrast'
--                 (underscore) instead of the canonical 'high-contrast' (hyphen)
--                 used by DesignTokenCatalogService::COLOR_MODES and
--                 normalizeColorMode() — so they are UNREACHABLE by the snapshot
--                 (which normalizes to the hyphen form) and the high-contrast
--                 snapshot served stale/missing values.
--
-- Strategy:  (1) Normalize the malformed 'high_contrast' rows to 'high-contrast'
--            FIRST (only where no hyphen twin exists, so no unique-constraint
--            conflict and the original published metadata is preserved), then
--            (2) re-run the exact 148:511-533 backfill so EVERY active catalog
--            key gets an org:default value row for light / dark / high-contrast /
--            print, sourced from the catalog DEFAULTS (the DB authority itself —
--            no hand-typed values). After this migration the org:default scope is
--            a total mirror of the governed catalog, so snapshotEffective() never
--            returns an empty result in POSTGRES_* modes and the whole-map JSON
--            fallback becomes a cold-start / JSON_ONLY safety net only.
--
-- Safety:    Idempotent + additive. INSERT ... ON CONFLICT DO NOTHING never
--            overwrites an existing (correct) value; the normalize UPDATE is
--            guarded by NOT EXISTS so a second run is a no-op. No schema change,
--            no destructive reseed. Values come from graphics_token_catalog
--            default_* columns, already aligned to the SSOT by migrations
--            230/264/266 (control 32px, radius 4/8px, space 8/12px, brand
--            #0c4a6e). Visual risk: none today — the CSS (orders-v3.css) already
--            renders the canonical values; this only completes the DB token
--            authority that JS consumers of GraphicsAuthority.tokens.read read.
--            FK graphics_token_value.token_key -> graphics_token_catalog is
--            satisfied because every inserted key comes FROM the catalog.
-- ============================================================================

BEGIN;

-- 1. Normalize malformed 'high_contrast' (underscore) -> 'high-contrast' (hyphen)
--    so these rows become reachable by the snapshot. Guarded against the unique
--    constraint (token_key, scope_type, scope_id, color_mode): only flip rows
--    that do NOT already have a canonical hyphen twin.
UPDATE graphics_token_value v
   SET color_mode = 'high-contrast', updated_at = NOW()
 WHERE v.color_mode = 'high_contrast'
   AND NOT EXISTS (
        SELECT 1 FROM graphics_token_value h
         WHERE h.token_key  = v.token_key
           AND h.scope_type = v.scope_type
           AND h.scope_id   = v.scope_id
           AND h.color_mode = 'high-contrast'
   );

-- 2. Re-run the migration-148 org:default backfill so catalog keys added after
--    148 receive their value rows. ON CONFLICT DO NOTHING preserves any existing
--    (already-correct) value — this only fills the gaps.

-- 2a. light
INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'light', default_light, TRUE, NOW(), 'migration:285', 1
  FROM graphics_token_catalog
 WHERE is_deprecated = FALSE AND default_light IS NOT NULL
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

-- 2b. dark (coalesce to light when the catalog has no distinct dark default)
INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'dark', COALESCE(default_dark, default_light), TRUE, NOW(), 'migration:285', 1
  FROM graphics_token_catalog
 WHERE is_deprecated = FALSE AND (default_dark IS NOT NULL OR default_light IS NOT NULL)
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

-- 2c. high-contrast (coalesce to light when the catalog has no distinct HC default)
INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'high-contrast', COALESCE(default_high_contrast, default_light), TRUE, NOW(), 'migration:285', 1
  FROM graphics_token_catalog
 WHERE is_deprecated = FALSE AND (default_high_contrast IS NOT NULL OR default_light IS NOT NULL)
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

-- 2d. print (coalesce to light when the catalog has no distinct print default)
INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'print', COALESCE(default_print, default_light), TRUE, NOW(), 'migration:285', 1
  FROM graphics_token_catalog
 WHERE is_deprecated = FALSE AND (default_print IS NOT NULL OR default_light IS NOT NULL)
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

COMMIT;
