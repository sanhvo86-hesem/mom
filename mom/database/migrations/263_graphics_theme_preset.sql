-- ============================================================================
-- Migration 263: Graphics Authority — Theme Preset registry (DB-backed themes)
-- ============================================================================
-- Purpose:   Promote the 6 hardcoded LegoTheme presets (00bg-lego-theme.js) into
--            a governed DB table so admins can CREATE / EDIT / SAVE named theme
--            templates, and modules reference one by preset_key
--            (module schema.config.theme). Editing a preset ripples to every
--            module that references it.
--
--            A "theme preset" is a brand seed + the master density/radius/control
--            knobs (the locked HESEM standard: gap 8px, OUTER radius 8px cấp-1,
--            INNER radius 4px cấp-2/3, control-height 32px) plus an optional
--            free-form token `overrides` bag. This is the THEME axis — distinct
--            from the layout-template registry (graphics_template_*) and the L3/L4
--            block/archetype registries.
--
--            Runtime SSOT  : mom/scripts/portal/00bg-lego-theme.js (LegoTheme)
--            Read/Write API: GraphicsGovernanceController theme-preset actions
--            Consumers     : Module Builder theme picker; runtime applyTheme().
--
--            Layer map:
--              L1 graphics_token_catalog      (token primitives)
--              L2 graphics_component_contract (per-component overridable tokens)
--              L3 graphics_block_contract     (reusable blocks)
--              L4 graphics_module_archetype   (module shells)
--              ── graphics_theme_preset       (named THEME bundles)  <-- here
--
-- Mode:      JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY safe. Idempotent:
--            CREATE TABLE IF NOT EXISTS; seed INSERTs ON CONFLICT merge. Seeds
--            insert with status='published' directly (no CHECK-ordering trap).
--
-- Depends on: 148 (graphics_* authority tables)
--
-- Date:      2026-05-31
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS graphics_theme_preset (
    preset_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_key          VARCHAR(80)  NOT NULL UNIQUE,         -- hesem-default | violet | <custom> …
    display_name_en     VARCHAR(120) NOT NULL,
    display_name_vi     VARCHAR(120) NOT NULL,
    brand               VARCHAR(20)  NOT NULL,                -- hex seed; OKLCH ramp derived client-side
    density_px          INTEGER      NOT NULL DEFAULT 8,      -- space.master (component gap)
    radius_outer_px     INTEGER      NOT NULL DEFAULT 8,      -- radius.card  (cấp 1 — containers)
    radius_inner_px     INTEGER      NOT NULL DEFAULT 4,      -- radius.master(cấp 2/3 — controls)
    control_h_px        INTEGER      NOT NULL DEFAULT 32,     -- control.height.standard
    frame_px            INTEGER      NOT NULL DEFAULT 8,      -- shell frame (gap-to-edge)
    overrides           JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- extra token_key → value
    scope_type          VARCHAR(30)  NOT NULL DEFAULT 'organization', -- organization|tenant|role|user|module
    scope_id            VARCHAR(120) NOT NULL DEFAULT 'default',
    base_ref            VARCHAR(80),                          -- inherit from another preset_key
    status              VARCHAR(20)  NOT NULL DEFAULT 'published', -- draft|review|published|deprecated
    is_default          BOOLEAN      NOT NULL DEFAULT FALSE,  -- the org default theme
    is_builtin          BOOLEAN      NOT NULL DEFAULT FALSE,  -- seeded; UI must not hard-delete
    sort_order          INTEGER      NOT NULL DEFAULT 100,
    created_by          VARCHAR(120),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_graphics_theme_preset_status CHECK (status IN ('draft','review','published','deprecated')),
    CONSTRAINT chk_graphics_theme_preset_scope  CHECK (scope_type IN ('organization','tenant','role','user','module')),
    CONSTRAINT chk_graphics_theme_preset_dims   CHECK (
        density_px BETWEEN 2 AND 24 AND
        radius_outer_px BETWEEN 0 AND 40 AND
        radius_inner_px BETWEEN 0 AND 32 AND
        control_h_px BETWEEN 24 AND 56 AND
        frame_px BETWEEN 0 AND 40
    )
);

CREATE INDEX IF NOT EXISTS idx_graphics_theme_preset_status ON graphics_theme_preset(status);
CREATE INDEX IF NOT EXISTS idx_graphics_theme_preset_scope  ON graphics_theme_preset(scope_type, scope_id);

COMMENT ON TABLE  graphics_theme_preset IS 'Named THEME presets (brand + master density/radius/control knobs + token overrides). Modules reference one via schema.config.theme; editing a preset ripples to all consumers. Runtime SSOT mirror: 00bg-lego-theme.js.';
COMMENT ON COLUMN graphics_theme_preset.radius_outer_px IS 'cấp 1 — container/card radius (HESEM standard default 8px).';
COMMENT ON COLUMN graphics_theme_preset.radius_inner_px IS 'cấp 2/3 — control/inner radius (HESEM standard default 4px).';
COMMENT ON COLUMN graphics_theme_preset.density_px IS 'space.master — default component gap (HESEM standard default 8px).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed the 6 built-in presets (mirror of LegoTheme.THEMES, with the two-level
-- radius: radius_outer = preset radius, radius_inner = half). hesem-default is
-- the org default and encodes the locked 8 / 8 / 4 standard. Builtins are
-- ON CONFLICT-merged so re-running the migration refreshes their values without
-- touching user-created presets.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO graphics_theme_preset
    (preset_key, display_name_en, display_name_vi, brand, density_px, radius_outer_px, radius_inner_px, control_h_px, frame_px, status, is_default, is_builtin, sort_order, created_by)
VALUES
    ('hesem-default',    'HESEM Default',     'HESEM mặc định', '#1565c0',  8,  8, 4, 32,  8, 'published', TRUE,  TRUE, 10, 'migration:263'),
    ('industrial-dense', 'Industrial Dense',  'Công nghiệp dày','#1565c0',  6,  4, 2, 28,  6, 'published', FALSE, TRUE, 20, 'migration:263'),
    ('comfortable',      'Comfortable',       'Thoáng',         '#1565c0', 12, 10, 5, 36, 12, 'published', FALSE, TRUE, 30, 'migration:263'),
    ('shop-floor',       'Shop-floor (touch)','Xưởng (cảm ứng)','#0f766e', 10,  8, 4, 44, 10, 'published', FALSE, TRUE, 40, 'migration:263'),
    ('violet',           'Violet',            'Tím',            '#7c3aed',  8,  8, 4, 32,  8, 'published', FALSE, TRUE, 50, 'migration:263'),
    ('slate',            'Slate',             'Xám đen',        '#334155',  8,  6, 3, 32,  8, 'published', FALSE, TRUE, 60, 'migration:263')
ON CONFLICT (preset_key) DO UPDATE SET
    display_name_en = EXCLUDED.display_name_en,
    display_name_vi = EXCLUDED.display_name_vi,
    brand           = EXCLUDED.brand,
    density_px      = EXCLUDED.density_px,
    radius_outer_px = EXCLUDED.radius_outer_px,
    radius_inner_px = EXCLUDED.radius_inner_px,
    control_h_px    = EXCLUDED.control_h_px,
    frame_px        = EXCLUDED.frame_px,
    is_builtin      = TRUE,
    updated_at      = NOW();

COMMIT;
