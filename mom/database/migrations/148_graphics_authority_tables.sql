-- ============================================================================
-- Migration 148: Graphics Control Plane — DB Authority Tables
-- ============================================================================
-- Purpose:   Move every hardcoded graphic parameter (colors, typography,
--            spacing, components, effects) out of the JSON file and into a
--            versioned, auditable relational authority. This migration is the
--            foundation of the "no-hardcode" rule: every UI module resolves
--            visual parameters through graphics_design_tokens, never through
--            inline literals.
--
-- Patterns:  Inspired by SAP Theme Designer (global/semantic/control layers),
--            Microsoft Fluent 2 (token-by-reference chain, Light/Dark/HC
--            triad), Salesforce SLDS (component override whitelist),
--            Material 3 (dynamic ramp from seed), Atlassian Design Tokens.
--
-- Mode:      Compatible with DataLayer SHADOW_WRITE → POSTGRES_PRIMARY ladder.
--            Canonical authority is mom/data/config/design-system-config.json
--            during JSON_ONLY; shadow-written to these tables once SHADOW_WRITE
--            is active; POSTGRES_PRIMARY reads from these tables and falls back
--            to JSON on error.
--
-- Standards: WCAG 2.2 AA/AAA, ISA-95 operator/supervisor role separation,
--            IATF 16949 §7.1.5 (documented visual standard evidence).
--
-- Author:    Graphics Control Plane rebuild
-- Date:      2026-04-18
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: graphics_token_catalog
-- Registry of every design token the platform exposes. Each row is one
-- admin-tunable parameter (color, font size, spacing, radius, etc.).
-- Layer taxonomy follows SAP/Fluent: global → semantic → component.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_token_catalog (
    token_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    token_key           VARCHAR(200) NOT NULL UNIQUE,     -- dot-path: brand.primary, components.btn.paddingX
    css_variable        VARCHAR(120),                      -- --brand-primary, --btn-padding-x (nullable for pure state tokens)
    layer               VARCHAR(20)  NOT NULL,            -- global | semantic | component
    family              VARCHAR(60)  NOT NULL,            -- color | typography | spacing | sizing | effect | motion | shadow | radius | opacity | state
    subfamily           VARCHAR(80),                      -- brand | status | surface | text | border | heading | body | ...
    component_scope     VARCHAR(80),                      -- NULL for shared tokens; 'btn', 'table', 'card' for component tokens
    value_type          VARCHAR(20)  NOT NULL,            -- hex | rgba | px | rem | em | unitless | keyword | shadow-expr | easing-expr
    min_numeric         NUMERIC,                          -- for numeric tokens: slider min
    max_numeric         NUMERIC,                          -- slider max
    step_numeric        NUMERIC,                          -- slider step
    unit                VARCHAR(8),                       -- px / rem / em / % / ms / s (null for colors/keywords)
    allowed_keywords    TEXT[],                           -- enum of allowed keyword values (e.g. ['none','uppercase','capitalize'])
    default_light       TEXT,                             -- default value for light mode
    default_dark        TEXT,                             -- default value for dark mode (may equal light if neutral)
    default_high_contrast TEXT,                           -- mandatory WCAG AAA value (Fluent rule: every token has HC fallback)
    default_print       TEXT,                             -- print-mode override (for PDF/ISO reports)
    alias_of            VARCHAR(200),                     -- if this is an alias token, points to the canonical token_key
    wcag_min_contrast   NUMERIC(4,2),                     -- minimum contrast vs its paired surface (4.5 for text, 3.0 for large)
    wcag_pair_token     VARCHAR(200),                     -- the surface/foreground token this must contrast against
    description         TEXT,
    tags                TEXT[],                           -- ['brand','status','dashboard','operator-station']
    is_deprecated       BOOLEAN      NOT NULL DEFAULT FALSE,
    deprecation_note    TEXT,
    source_authority    VARCHAR(120) NOT NULL DEFAULT 'design-system-config.json',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by          VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_graphics_token_catalog_layer     ON graphics_token_catalog(layer);
CREATE INDEX IF NOT EXISTS idx_graphics_token_catalog_family    ON graphics_token_catalog(family);
CREATE INDEX IF NOT EXISTS idx_graphics_token_catalog_component ON graphics_token_catalog(component_scope);
CREATE INDEX IF NOT EXISTS idx_graphics_token_catalog_css_var   ON graphics_token_catalog(css_variable);

COMMENT ON TABLE  graphics_token_catalog IS 'Registry of every design token; one row = one admin-tunable visual parameter. No UI module is permitted to hardcode a value in place of a token_key lookup.';
COMMENT ON COLUMN graphics_token_catalog.default_high_contrast IS 'Mandatory per Fluent 2: every token must have a WCAG AAA high-contrast fallback.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: graphics_token_value
-- The *effective* value of each token, scoped by tenant/role/environment/
-- theme-variant. This is what the runtime reads.
-- Scope hierarchy (most specific wins):
--   per-role > per-environment > per-tenant > organization-default
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_token_value (
    value_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    token_key           VARCHAR(200) NOT NULL REFERENCES graphics_token_catalog(token_key) ON UPDATE CASCADE ON DELETE CASCADE,
    scope_type          VARCHAR(30)  NOT NULL,            -- organization | tenant | environment | role | user
    scope_id            VARCHAR(120) NOT NULL DEFAULT 'default',
    color_mode          VARCHAR(20)  NOT NULL DEFAULT 'light',  -- light | dark | high-contrast | print | andon | colorblind-*
    value               TEXT         NOT NULL,
    draft_value         TEXT,                             -- staged change not yet committed (SAP Save vs Publish)
    is_published        BOOLEAN      NOT NULL DEFAULT TRUE,
    published_at        TIMESTAMPTZ,
    published_by        VARCHAR(120),
    version             INTEGER      NOT NULL DEFAULT 1,
    rollout_id          UUID,                             -- links to graphics_rollout.rollout_id when staged via rollout
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_graphics_token_value_scope UNIQUE (token_key, scope_type, scope_id, color_mode)
);

CREATE INDEX IF NOT EXISTS idx_graphics_token_value_scope       ON graphics_token_value(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_graphics_token_value_color_mode  ON graphics_token_value(color_mode);
CREATE INDEX IF NOT EXISTS idx_graphics_token_value_rollout     ON graphics_token_value(rollout_id);

COMMENT ON TABLE graphics_token_value IS 'Effective (and staged) values for every token across scope + color mode. Scope most-specific-wins resolution: user > role > environment > tenant > organization default.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: graphics_component_contract
-- Per-component whitelist of overridable tokens (SLDS hook model). A UI
-- component declares which tokens it consumes; admin UI may only expose
-- those tokens for editing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_component_contract (
    contract_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    component_key       VARCHAR(80)  NOT NULL UNIQUE,     -- btn | table | card | badge | modal | flow | isoBox | kpi | ...
    display_name_en     VARCHAR(120) NOT NULL,
    display_name_vi     VARCHAR(120) NOT NULL,
    description         TEXT,
    overridable_tokens  TEXT[]       NOT NULL DEFAULT '{}',    -- array of token_key the admin UI may tune for this component
    inherits_from       VARCHAR(80),                       -- parent component (e.g. 'primaryBtn' inherits from 'btn')
    preview_scene_key   VARCHAR(80),                       -- which PreviewScenes.components.* renders this
    is_operator_visible BOOLEAN      NOT NULL DEFAULT FALSE,-- can operator role see it (vs admin-only)
    a11y_requirements   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_component_contract IS 'Per-component whitelist of tokens exposed to admin tuning (SLDS Theming Hooks model). Prevents free-for-all CSS.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: graphics_preview_scene
-- Registry of replayable preview scenes (SAP sample-page iframe model).
-- Each scene renders a gallery of components with the currently staged tokens
-- so the admin can simulate before committing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_preview_scene (
    scene_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_key           VARCHAR(80)  NOT NULL UNIQUE,     -- typography.family | color.brand | components.button | ...
    category            VARCHAR(40)  NOT NULL,            -- typography | color | layout | effects | components | dashboard
    display_name_en     VARCHAR(160) NOT NULL,
    display_name_vi     VARCHAR(160) NOT NULL,
    description         TEXT,
    renderer            VARCHAR(80)  NOT NULL,            -- JS function key under window.PreviewScenes.*
    tokens_observed     TEXT[]       NOT NULL DEFAULT '{}',    -- tokens this scene depends on (for reactivity)
    projection_mode     VARCHAR(20)  DEFAULT 'desktop',   -- desktop | tablet | mobile | andon-4k
    colorblind_filter   VARCHAR(40),                       -- none | deuteranopia | protanopia | tritanopia | achromatopsia
    sort_order          INTEGER      NOT NULL DEFAULT 100,
    is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graphics_preview_scene_category ON graphics_preview_scene(category);

COMMENT ON TABLE graphics_preview_scene IS 'Replayable preview scenes (SAP sample-page model). Every edit widget opens at least one scene as simulation before commit.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: graphics_simulation_run
-- Every "Preview before commit" click logs a simulation run. This is the
-- evidence trail for "every edit has a preview" requirement.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_simulation_run (
    run_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    run_label           VARCHAR(200),
    initiated_by        VARCHAR(120),
    initiated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    staged_changes      JSONB        NOT NULL DEFAULT '{}'::jsonb,   -- token_key → {from, to}
    scope_type          VARCHAR(30)  NOT NULL DEFAULT 'organization',
    scope_id            VARCHAR(120) NOT NULL DEFAULT 'default',
    color_mode          VARCHAR(20)  NOT NULL DEFAULT 'light',
    scenes_rendered     TEXT[]       NOT NULL DEFAULT '{}',
    wcag_report         JSONB,                            -- contrast pass/fail per token pair
    colorblind_reports  JSONB,                            -- per filter: any pair that became indistinguishable
    screen_reader_findings JSONB,                         -- AXE-core findings on the gallery
    outcome             VARCHAR(20)  NOT NULL DEFAULT 'reviewed',     -- reviewed | committed | discarded | failed-gates
    committed_rollout_id UUID,
    notes               TEXT,
    expires_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_graphics_simulation_run_initiator ON graphics_simulation_run(initiated_by);
CREATE INDEX IF NOT EXISTS idx_graphics_simulation_run_outcome   ON graphics_simulation_run(outcome);

COMMENT ON TABLE graphics_simulation_run IS 'Evidence trail: every edit widget stages changes and runs one simulation_run before committing. Enforces the "preview-before-commit" rule.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: graphics_rollout_scope
-- Rollout orchestration: draft → stage → canary → apply → rollback.
-- Mirrors SAP Save/Publish/Activate split with retain-previous rollback.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_rollout_scope (
    rollout_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rollout_label       VARCHAR(200) NOT NULL,
    description         TEXT,
    state               VARCHAR(30)  NOT NULL DEFAULT 'draft',     -- draft | staged | canary | applied | rolled-back | superseded
    scope_mode          VARCHAR(40)  NOT NULL,                      -- preview-only | canary-module-group | canary-domain | environment-stage | global-apply
    scope_targets       JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- {modules:[], domains:[], environments:[], roles:[]}
    changeset           JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- token_key → {from, to, color_mode}
    prior_snapshot      JSONB,                                       -- snapshot of prior values for 1-click rollback
    canary_percentage   NUMERIC(5,2),
    staged_by           VARCHAR(120),
    staged_at           TIMESTAMPTZ,
    approved_by         VARCHAR(120),
    approved_at         TIMESTAMPTZ,
    applied_at          TIMESTAMPTZ,
    rolled_back_by      VARCHAR(120),
    rolled_back_at      TIMESTAMPTZ,
    simulation_run_id   UUID         REFERENCES graphics_simulation_run(run_id) ON DELETE SET NULL,
    waiver_id           UUID,
    wcag_gate_status    VARCHAR(20)  NOT NULL DEFAULT 'pending',    -- pending | pass | fail | waived
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graphics_rollout_state ON graphics_rollout_scope(state);

COMMENT ON TABLE graphics_rollout_scope IS 'Rollout orchestration. SAP Save/Publish/Activate split with retain-previous rollback. Every canary/apply attaches a simulation_run for evidence.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: graphics_theme_schedule
-- Shift-scheduled theme swaps (Andon Day / Night / Maintenance-Amber).
-- Missing from SAP/Fluent/Siemens — a genuine differentiator for MES.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_theme_schedule (
    schedule_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_name       VARCHAR(120) NOT NULL UNIQUE,
    description         TEXT,
    trigger_type        VARCHAR(30)  NOT NULL,                      -- shift | time-of-day | event | manual
    trigger_config      JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- {shift:'A', startTime:'06:00', endTime:'14:00', daysOfWeek:[1,2,3,4,5]}
    target_color_mode   VARCHAR(20)  NOT NULL,                      -- light | dark | andon | maintenance-amber | high-contrast
    scope_type          VARCHAR(30)  NOT NULL DEFAULT 'tenant',
    scope_id            VARCHAR(120) NOT NULL DEFAULT 'default',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    priority            INTEGER      NOT NULL DEFAULT 100,
    applies_to_roles    TEXT[],
    next_fire_at        TIMESTAMPTZ,
    last_fired_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_theme_schedule IS 'Shift-scheduled theme swap (Andon Day/Night/Maintenance-Amber). Manufacturing-specific differentiator.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: graphics_saved_experiment
-- Named A/B theme drafts (SAP retain-previous model extended).
-- Admins can save a named experiment, diff against production, promote.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_saved_experiment (
    experiment_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_key      VARCHAR(160) NOT NULL UNIQUE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    base_ref            VARCHAR(120) NOT NULL DEFAULT 'production',  -- production | experiment:<key>
    changeset           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    tags                TEXT[],
    owner               VARCHAR(120),
    is_archived         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_saved_experiment IS 'Named A/B theme draft slots. Diff + promote + archive.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: graphics_wcag_check
-- Materialized WCAG contrast + colorblind indistinguishability report per
-- rollout. Gates publish per Fluent "every token has HC fallback" rule.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_wcag_check (
    check_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rollout_id          UUID         REFERENCES graphics_rollout_scope(rollout_id) ON DELETE CASCADE,
    simulation_run_id   UUID         REFERENCES graphics_simulation_run(run_id)    ON DELETE SET NULL,
    token_key           VARCHAR(200) NOT NULL,
    paired_token_key    VARCHAR(200),
    color_mode          VARCHAR(20)  NOT NULL,
    contrast_ratio      NUMERIC(5,2),
    wcag_level          VARCHAR(10),             -- AA | AAA | FAIL
    is_large_text       BOOLEAN      NOT NULL DEFAULT FALSE,
    colorblind_indistinguishable JSONB,          -- {deuteranopia:bool, protanopia:bool, tritanopia:bool}
    blocker             BOOLEAN      NOT NULL DEFAULT FALSE,
    waiver_id           UUID,
    checked_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graphics_wcag_check_rollout ON graphics_wcag_check(rollout_id);
CREATE INDEX IF NOT EXISTS idx_graphics_wcag_check_blocker ON graphics_wcag_check(blocker);

COMMENT ON TABLE graphics_wcag_check IS 'WCAG 2.2 contrast + colorblind check per token pair per rollout. Any blocker=true prevents apply unless waived.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: graphics_module_binding
-- Which UI modules consume which tokens. Populated by a static scanner (grep
-- of portal scripts for GraphicsAuthority.tokens.read('x')). Used by impact
-- analysis: "if I change color.brand.primary, which modules are affected?"
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_module_binding (
    binding_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key          VARCHAR(120) NOT NULL,            -- e.g. '14-mes-control-center', '10-eqms-form-runtime'
    token_key           VARCHAR(200) NOT NULL REFERENCES graphics_token_catalog(token_key) ON UPDATE CASCADE ON DELETE CASCADE,
    binding_type        VARCHAR(30)  NOT NULL,            -- css-variable | direct-read | preview-only
    source_location     VARCHAR(300),                      -- file:line for traceability
    observed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_graphics_module_binding UNIQUE (module_key, token_key, binding_type)
);

CREATE INDEX IF NOT EXISTS idx_graphics_module_binding_token  ON graphics_module_binding(token_key);
CREATE INDEX IF NOT EXISTS idx_graphics_module_binding_module ON graphics_module_binding(module_key);

COMMENT ON TABLE graphics_module_binding IS 'Scanner-populated: which module consumes which token. Drives impact analysis when a token changes.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA — migrate the 56+ hardcoded values into DB
-- ═══════════════════════════════════════════════════════════════════════════
-- All values sourced from mom/data/config/design-system-config.json as of
-- 2026-04-18. Any future change to this seed must be done through a new
-- migration, never by editing inline literals.
-- ---------------------------------------------------------------------------

-- ── Global brand tokens ────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, default_high_contrast, default_print, description, tags) VALUES
('brand.primary',       '--brand-primary',       'global', 'color', 'brand', 'hex', '#1565c0', '#1e88e5', '#0033a0', '#000000', 'Primary brand color',            ARRAY['brand']),
('brand.light',         '--brand-light',         'global', 'color', 'brand', 'hex', '#1e88e5', '#42a5f5', '#0055cc', '#333333', 'Brand light variant',            ARRAY['brand']),
('brand.dark',          '--brand-dark',          'global', 'color', 'brand', 'hex', '#0c2d48', '#0a1e32', '#000a1a', '#000000', 'Brand dark variant',             ARRAY['brand']),
('brand.darkest',       '--brand-darkest',       'global', 'color', 'brand', 'hex', '#0a1e32', '#050d18', '#000000', '#000000', 'Brand darkest variant',          ARRAY['brand']),
('brand.accent',        '--brand-accent',        'global', 'color', 'brand', 'hex', '#f9a825', '#fbbf24', '#ff9900', '#000000', 'Brand accent color',             ARRAY['brand']),
('brand.accentLight',   '--brand-accent-light',  'global', 'color', 'brand', 'hex', '#fdd835', '#fde047', '#ffcc00', '#333333', 'Brand accent light variant',     ARRAY['brand']),
('brand.sidebarBg',     '--brand-sidebar-bg',    'semantic','color','surface','hex', '#0c2d48', '#0a1628', '#000000', '#ffffff', 'Sidebar background anchor',     ARRAY['brand','surface'])
ON CONFLICT (token_key) DO NOTHING;

-- ── Status colors (light) ──────────────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, default_high_contrast, default_print, wcag_min_contrast, wcag_pair_token, description) VALUES
('status.success.light', '--status-success',  'semantic','color','status','hex','#16a34a','#22c55e','#008800','#006600',3.0,'colorsLight.bgSurface','Success state color'),
('status.error.light',   '--status-error',    'semantic','color','status','hex','#dc2626','#f87171','#cc0000','#990000',4.5,'colorsLight.bgSurface','Error state color'),
('status.warning.light', '--status-warning',  'semantic','color','status','hex','#d97706','#fbbf24','#cc6600','#663300',3.0,'colorsLight.bgSurface','Warning state color'),
('status.info.light',    '--status-info',     'semantic','color','status','hex','#2563eb','#60a5fa','#0033cc','#003399',4.5,'colorsLight.bgSurface','Info state color'),
('status.purple.light',  '--status-purple',   'semantic','color','status','hex','#7c3aed','#a78bfa','#5500cc','#330066',4.5,'colorsLight.bgSurface','Purple accent status'),
('status.cyan.light',    '--status-cyan',     'semantic','color','status','hex','#0891b2','#22d3ee','#006688','#003344',3.0,'colorsLight.bgSurface','Cyan accent status (non-text; WCAG non-text contrast 3:1 applies)')
ON CONFLICT (token_key) DO NOTHING;

-- ── Light mode surfaces ────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, default_high_contrast, default_print, description) VALUES
('colorsLight.bgPage',       '--bg-page',        'semantic','color','surface','hex','#f8fafc','#0f172a','#ffffff','#ffffff','Page background'),
('colorsLight.bgSurface',    '--bg-surface',     'semantic','color','surface','hex','#ffffff','#1e293b','#ffffff','#ffffff','Primary surface'),
('colorsLight.bgSurfaceAlt', '--bg-surface-alt', 'semantic','color','surface','hex','#f1f5f9','#162032','#f0f0f0','#fafafa','Alt surface'),
('colorsLight.bgHeader',     '--bg-header',      'semantic','color','surface','hex','#ffffff','#1e293b','#ffffff','#ffffff','Header surface'),
('colorsLight.bgModal',      '--bg-modal',       'semantic','color','surface','hex','#ffffff','#1e293b','#ffffff','#ffffff','Modal surface'),
('colorsLight.bgHover',      '--bg-hover',       'semantic','color','surface','hex','#f8fafc','#263348','#eeeeee','#f5f5f5','Hover surface'),
('colorsLight.textPrimary',  '--text-primary',   'semantic','color','text',   'hex','#1e293b','#f1f5f9','#000000','#000000','Primary text'),
('colorsLight.textSecondary','--text-secondary', 'semantic','color','text',   'hex','#64748b','#94a3b8','#333333','#333333','Secondary text'),
('colorsLight.textTertiary', '--text-tertiary',  'semantic','color','text',   'hex','#94a3b8','#64748b','#444444','#555555','Tertiary text'),
('colorsLight.textLink',     '--text-link',      'semantic','color','text',   'hex','#1565c0','#60a5fa','#0033a0','#0000cc','Link text'),
('colorsLight.textInverse',  '--text-inverse',   'semantic','color','text',   'hex','#ffffff','#0f172a','#ffffff','#ffffff','Inverse text'),
('colorsLight.border',       '--border-default', 'semantic','color','border', 'hex','#e2e8f0','#334155','#000000','#999999','Default border'),
('colorsLight.borderFocus',  '--border-focus',   'semantic','color','border', 'hex','#1565c0','#60a5fa','#0033a0','#000000','Focus border'),
('colorsLight.borderError',  '--border-error',   'semantic','color','border', 'hex','#dc2626','#f87171','#cc0000','#990000','Error border'),
('colorsLight.borderSuccess','--border-success', 'semantic','color','border', 'hex','#16a34a','#22c55e','#008800','#006600','Success border')
ON CONFLICT (token_key) DO NOTHING;

-- ── Typography (font stacks) ───────────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, default_high_contrast, description) VALUES
('typography.display.family', '--font-display', 'semantic','typography','display','keyword',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
 'Display / Hero font stack'),
('typography.heading.family', '--font-heading', 'semantic','typography','heading','keyword',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
 'Heading font stack'),
('typography.body.family',    '--font-body',    'semantic','typography','body',   'keyword',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
 'Body font stack'),
('typography.label.family',   '--font-label',   'semantic','typography','label',  'keyword',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '-apple-system, "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif',
 '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
 'Label / Caption font stack'),
('typography.mono.family',    '--font-mono',    'semantic','typography','mono',   'keyword',
 '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace',
 '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace',
 '"JetBrains Mono", "Fira Code", Consolas, monospace',
 'Monospace font stack')
ON CONFLICT (token_key) DO NOTHING;

-- ── Typography weights & modifiers ─────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description) VALUES
('typography.display.weight', '--font-display-weight', 'semantic','typography','display','unitless',100,900,100,'700','700','900','Display weight'),
('typography.heading.weight', '--font-heading-weight', 'semantic','typography','heading','unitless',100,900,100,'600','600','800','Heading weight'),
('typography.body.weight',    '--font-body-weight',    'semantic','typography','body',   'unitless',100,900,100,'400','400','500','Body weight'),
('typography.label.weight',   '--font-label-weight',   'semantic','typography','label',  'unitless',100,900,100,'600','600','800','Label weight')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, unit, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description) VALUES
('fontScale.xs',  '--font-xs',  'global','typography','scale','px','px',8, 48,1,'11','11','13','Extra small'),
('fontScale.sm',  '--font-sm',  'global','typography','scale','px','px',8, 48,1,'13','13','15','Small'),
('fontScale.base','--font-base','global','typography','scale','px','px',8, 48,1,'14','14','16','Base'),
('fontScale.md',  '--font-md',  'global','typography','scale','px','px',8, 48,1,'16','16','18','Medium'),
('fontScale.lg',  '--font-lg',  'global','typography','scale','px','px',8, 48,1,'18','18','20','Large'),
('fontScale.xl',  '--font-xl',  'global','typography','scale','px','px',8, 48,1,'20','20','22','Extra large'),
('fontScale.2xl', '--font-2xl', 'global','typography','scale','px','px',8, 64,1,'24','24','26','2x large'),
('fontScale.3xl', '--font-3xl', 'global','typography','scale','px','px',8, 96,1,'32','32','36','3x large')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description) VALUES
('lineHeight.tight',   '--leading-tight',   'global','typography','line-height','unitless',1.0,3.0,0.05,'1.25','1.25','1.5','Tight line-height'),
('lineHeight.normal',  '--leading-normal',  'global','typography','line-height','unitless',1.0,3.0,0.05,'1.5','1.5','1.75','Normal line-height'),
('lineHeight.relaxed', '--leading-relaxed', 'global','typography','line-height','unitless',1.0,3.0,0.05,'1.75','1.75','2.0','Relaxed line-height')
ON CONFLICT (token_key) DO NOTHING;

-- ── Layout dimensions ──────────────────────────────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, unit, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description) VALUES
('layout.sidebarW',        '--sidebar-w',         'global','sizing','layout','px','px',180,480,4,'260','260','300','Sidebar width expanded'),
('layout.sidebarCollapsed','--sidebar-collapsed', 'global','sizing','layout','px','px',40,120, 4, '56', '56', '72','Sidebar width collapsed'),
('layout.headerH',         '--header-h',          'global','sizing','layout','px','px',40,120, 4, '52', '52', '64','Header height'),
('layout.contentMaxW',     '--content-max-w',     'global','sizing','layout','px','px',960,2400,20,'1400','1400','1400','Content max width'),
('layout.modalMaxW',       '--modal-max-w',       'global','sizing','layout','px','px',480,1600,20,'800','800','800','Modal max width'),
('layout.modalSmMaxW',     '--modal-sm-max-w',    'global','sizing','layout','px','px',320,960, 20,'480','480','480','Small modal max width')
ON CONFLICT (token_key) DO NOTHING;

-- ── Effects (focus, selection, motion, opacity) ────────────────────────────
INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, unit, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description) VALUES
('effects.focusRingWidth', '--focus-ring-width',  'global','effect','focus',    'px','px', 0,  8, 1, '3',   '3',   '4',   'Focus ring width'),
('effects.focusRingOffset','--focus-ring-offset', 'global','effect','focus',    'px','px', 0,  8, 1, '0',   '0',   '2',   'Focus ring offset'),
('effects.scrollbarWidth', '--scrollbar-width',   'global','effect','scrollbar','px','px', 0, 24, 1, '8',   '8',  '14',   'Scrollbar width'),
('effects.scrollbarRadius','--scrollbar-radius',  'global','effect','scrollbar','px','px', 0, 12, 1, '4',   '4',   '0',   'Scrollbar radius'),
('effects.motionFast',     '--motion-fast',       'global','motion','duration', 'ms','ms', 0,500,10, '100', '100','0',   'Motion fast duration'),
('effects.motionNormal',   '--motion-normal',     'global','motion','duration', 'ms','ms', 0,800,10, '150', '150','0',   'Motion normal duration'),
('effects.motionSlow',     '--motion-slow',       'global','motion','duration', 'ms','ms', 0,1200,10,'250', '250','0',   'Motion slow duration'),
('effects.motionSpring',   '--motion-spring',     'global','motion','duration', 'ms','ms', 0,1600,10,'300', '300','0',   'Motion spring duration'),
('effects.opacityHover',   '--opacity-hover',     'global','opacity','state',   'unitless',NULL,0,1,0.01,'0.06','0.06','0.2','Hover overlay opacity'),
('effects.opacityPressed', '--opacity-pressed',   'global','opacity','state',   'unitless',NULL,0,1,0.01,'0.1', '0.1', '0.3','Pressed overlay opacity'),
('effects.opacitySelected','--opacity-selected',  'global','opacity','state',   'unitless',NULL,0,1,0.01,'0.08','0.08','0.25','Selected overlay opacity'),
('effects.opacityDisabled','--opacity-disabled',  'global','opacity','state',   'unitless',NULL,0,1,0.01,'0.4', '0.4', '0.35','Disabled overlay opacity'),
('effects.opacityMuted',   '--opacity-muted',     'global','opacity','state',   'unitless',NULL,0,1,0.01,'0.6', '0.6', '0.5', 'Muted overlay opacity')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, default_high_contrast, description) VALUES
('effects.focusRingColor', '--focus-ring-color', 'semantic','color','focus',    'rgba','rgba(21,101,192,0.12)','rgba(96,165,250,0.22)','rgba(0,51,160,0.6)','Focus ring color'),
('effects.selectionBg',    '--selection-bg',     'semantic','color','selection','hex', '#3b82f6','#60a5fa','#0033a0','Text selection background'),
('effects.selectionColor', '--selection-color',  'semantic','color','selection','hex', '#ffffff','#ffffff','#ffffff','Text selection foreground'),
('effects.caretColor',     '--caret-color',      'semantic','color','caret',    'hex', '#1565c0','#60a5fa','#000000','Caret color'),
('effects.placeholderColor','--placeholder-color','semantic','color','placeholder','hex','#94a3b8','#64748b','#555555','Placeholder color'),
('effects.scrollbarTrack', '--scrollbar-track',  'semantic','color','scrollbar','hex', '#f1f5f9','#162032','#ffffff','Scrollbar track color'),
('effects.scrollbarThumb', '--scrollbar-thumb',  'semantic','color','scrollbar','hex', '#cbd5e1','#475569','#000000','Scrollbar thumb color'),
('effects.shadowXs',       '--shadow-xs',        'semantic','shadow','card',    'shadow-expr','0 1px 3px rgba(12,45,72,.04)','0 1px 3px rgba(0,0,0,.3)','none','Extra-small shadow'),
('effects.shadowLg',       '--shadow-lg',        'semantic','shadow','card',    'shadow-expr','0 18px 40px rgba(15,23,42,.14),0 8px 20px rgba(15,23,42,.09)','0 18px 40px rgba(0,0,0,.5),0 8px 20px rgba(0,0,0,.3)','none','Large shadow'),
('effects.shadowXl',       '--shadow-xl',        'semantic','shadow','modal',   'shadow-expr','0 24px 60px rgba(12,45,72,.16),0 12px 28px rgba(12,45,72,.08)','0 24px 60px rgba(0,0,0,.6),0 12px 28px rgba(0,0,0,.4)','none','Extra-large shadow'),
('effects.easingOut',      '--easing-out',       'global','motion','easing',    'easing-expr','cubic-bezier(0,0,0.2,1)','cubic-bezier(0,0,0.2,1)','linear','Ease-out curve'),
('effects.easingInOut',    '--easing-in-out',    'global','motion','easing',    'easing-expr','cubic-bezier(0.4,0,0.2,1)','cubic-bezier(0.4,0,0.2,1)','linear','Ease-in-out curve'),
('effects.easingSpring',   '--easing-spring',    'global','motion','easing',    'easing-expr','cubic-bezier(0.34,1.56,0.64,1)','cubic-bezier(0.34,1.56,0.64,1)','linear','Spring curve'),
('effects.easingSharp',    '--easing-sharp',     'global','motion','easing',    'easing-expr','cubic-bezier(0.2,0,0,1)','cubic-bezier(0.2,0,0,1)','linear','Sharp curve')
ON CONFLICT (token_key) DO NOTHING;

-- ── Component contracts (per-component overridable token whitelists) ───────
INSERT INTO graphics_component_contract (component_key, display_name_en, display_name_vi, overridable_tokens, preview_scene_key, is_operator_visible) VALUES
('btn',        'Button',         'Nút bấm',       ARRAY['components.btn.paddingX','components.btn.paddingY','components.btn.gap','components.btn.borderWidth','components.btn.minWidth','components.btn.letterSpacing','components.btn.fontWeight'], 'components.button',    TRUE),
('tab',        'Tab',            'Tab',           ARRAY['components.tab.paddingY','components.tab.paddingX','components.tab.radius','components.tab.fontSize','components.tab.gap','components.tab.borderWidth','components.tab.fontWeight','components.tab.activeIndicator'], 'components.tab',    TRUE),
('table',      'Table',          'Bảng dữ liệu', ARRAY['components.table.borderWidth','components.table.headerFontWeight','components.table.headerLetterSpacing','components.table.headerBg','components.table.stripeBg','components.table.stripeAltBg'], 'components.table',   TRUE),
('card',       'Card',           'Thẻ',           ARRAY['components.card.borderWidth','components.card.headerPadding','components.card.bodyPadding','components.card.headerBg'], 'components.card',   TRUE),
('badge',      'Badge',          'Huy hiệu',     ARRAY['components.badge.letterSpacing','components.badge.borderWidth','components.badge.minWidth','components.badge.fontWeight'], 'components.badge',   TRUE),
('input',      'Input',          'Ô nhập',       ARRAY['components.input.paddingY','components.input.borderWidth','components.input.bg'], 'components.input',  TRUE),
('modal',      'Modal',          'Hộp thoại',    ARRAY['components.modal.radius','components.modal.padding','components.modal.headerPadding'], 'components.modal',   FALSE),
('flow',       'Flowchart',      'Lưu đồ',       ARRAY['components.flow.nodeBg','components.flow.nodeBorderW','components.flow.nodeBorderColor','components.flow.nodeRadius','components.flow.nodePadding','components.flow.connectorColor','components.flow.connectorWidth','components.flow.arrowSize'], 'components.flow', FALSE),
('isoBox',     'ISO Box',        'Hộp ISO',      ARRAY['components.isoBox.bg','components.isoBox.borderW','components.isoBox.radius','components.isoBox.headerBg','components.isoBox.headerPadding','components.isoBox.bodyPadding','components.isoBox.fontSize'], 'components.isoBox', FALSE),
('isoNote',    'ISO Note',       'Ghi chú ISO',  ARRAY['components.isoNote.iconSize','components.isoNote.fontSize','components.isoNote.bg','components.isoNote.borderColor','components.isoNote.borderLeftColor','components.isoNote.borderLeftW','components.isoNote.radius','components.isoNote.padding'], 'components.isoNote', FALSE),
('kpi',        'KPI Card',       'Thẻ KPI',      ARRAY['components.kpi.borderWidth','components.kpi.iconSize','components.kpi.trendFontSize'], 'components.kpi',     TRUE),
('tooltip',    'Tooltip',        'Chú thích nổi', ARRAY['components.tooltip.bg','components.tooltip.color','components.tooltip.paddingY','components.tooltip.paddingX','components.tooltip.radius','components.tooltip.fontSize','components.tooltip.maxWidth'], 'components.tooltip', FALSE),
('dropdown',   'Dropdown',       'Menu thả',      ARRAY['components.dropdown.radius','components.dropdown.itemPadding','components.dropdown.itemFontSize','components.dropdown.hoverBg'], 'components.dropdown', FALSE),
('nav',        'Navigation',     'Điều hướng',   ARRAY['components.nav.height','components.nav.fontSize','components.nav.iconSize','components.nav.gap','components.nav.radius'], 'components.nav',    TRUE),
('pagination', 'Pagination',     'Phân trang',   ARRAY['components.pagination.btnSize','components.pagination.radius','components.pagination.fontSize','components.pagination.gap'], 'components.pagination', TRUE),
('progress',   'Progress Bar',   'Thanh tiến độ',ARRAY['components.progress.height','components.progress.radius','components.progress.bg'], 'components.progress', TRUE),
('empty',      'Empty State',    'Trạng thái rỗng',ARRAY['components.empty.iconSize','components.empty.iconOpacity','components.empty.titleFontSize','components.empty.descFontSize'], 'components.empty', FALSE),
('field',      'Form Field',     'Trường biểu mẫu',ARRAY['components.field.gap','components.field.labelGap','components.field.groupGap','components.field.helperFontSize'], 'components.field', TRUE),
('breadcrumb', 'Breadcrumb',     'Đường dẫn',    ARRAY['components.breadcrumb.fontSize','components.breadcrumb.gap','components.breadcrumb.color','components.breadcrumb.activeColor'], 'components.breadcrumb', TRUE)
ON CONFLICT (component_key) DO NOTHING;

-- ── Preview scenes (SAP sample-page model) ─────────────────────────────────
INSERT INTO graphics_preview_scene (scene_key, category, display_name_en, display_name_vi, renderer, tokens_observed, sort_order, is_default) VALUES
('typography.family',      'typography','Typography Family',     'Họ phông chữ',      'typographyFamily',      ARRAY['typography.display.family','typography.heading.family','typography.body.family','typography.label.family','typography.mono.family'], 10, TRUE),
('typography.scale',       'typography','Typography Scale',      'Thang cỡ chữ',      'typographyScale',       ARRAY['fontScale.xs','fontScale.sm','fontScale.base','fontScale.md','fontScale.lg','fontScale.xl','fontScale.2xl','fontScale.3xl'], 20, TRUE),
('typography.lineHeight',  'typography','Line Height',           'Chiều cao dòng',    'typographyLineHeight',  ARRAY['lineHeight.tight','lineHeight.normal','lineHeight.relaxed'], 30, FALSE),
('color.brand',            'color',     'Brand Color Scene',     'Màu thương hiệu',   'colorBrand',            ARRAY['brand.primary','brand.light','brand.dark','brand.accent','brand.accentLight'], 40, TRUE),
('color.status',           'color',     'Status Color Scene',    'Màu trạng thái',    'colorStatus',           ARRAY['status.success.light','status.error.light','status.warning.light','status.info.light','status.purple.light','status.cyan.light'], 50, TRUE),
('color.surfaces',         'color',     'Surface Stack',         'Bề mặt',            'colorSurfaces',         ARRAY['colorsLight.bgPage','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.bgHeader','colorsLight.bgModal','colorsLight.bgHover'], 60, TRUE),
('layout.radius',          'layout',    'Radius Scale',          'Thang bo góc',      'layoutRadius',          ARRAY['layout.admin.panelRadius','layout.admin.surfaceRadius','layout.admin.nestedRadius'], 70, FALSE),
('layout.spacing',         'layout',    'Spacing Scale',         'Thang khoảng cách', 'layoutSpacing',         ARRAY['layout.admin.gapLg','layout.admin.gapMd','layout.admin.gapSm','layout.admin.panelPadding','layout.admin.cardPadding','layout.admin.rowPadding'], 80, FALSE),
('effects.motion',         'effects',   'Motion Scene',          'Chuyển động',       'effectsMotion',         ARRAY['effects.motionFast','effects.motionNormal','effects.motionSlow','effects.motionSpring','effects.easingOut','effects.easingInOut','effects.easingSpring','effects.easingSharp'], 90, FALSE),
('effects.focusRing',      'effects',   'Focus Ring Scene',      'Viền focus',        'effectsFocusRing',      ARRAY['effects.focusRingWidth','effects.focusRingOffset','effects.focusRingColor'], 100, FALSE),
('dashboard.andonProjection','dashboard','Andon 4K Projection',  'Chiếu Andon 4K',    'dashboardAndon',        ARRAY['colorsLight.bgPage','colorsLight.bgSurface','brand.primary','status.success.light','status.error.light','status.warning.light'], 110, FALSE),
('components.button',      'components','Button Gallery',        'Nút bấm',           'componentButton',       ARRAY['components.btn.paddingX','components.btn.paddingY','components.btn.borderWidth'], 200, TRUE),
('components.table',       'components','Table Gallery',         'Bảng',              'componentTable',        ARRAY['components.table.borderWidth','components.table.headerBg','components.table.stripeBg','components.table.stripeAltBg'], 210, TRUE),
('components.card',        'components','Card Gallery',          'Thẻ',               'componentCard',         ARRAY['components.card.borderWidth','components.card.headerPadding','components.card.bodyPadding'], 220, TRUE),
('components.kpi',         'components','KPI Card Gallery',      'Thẻ KPI',           'componentKpi',          ARRAY['components.kpi.borderWidth','components.kpi.iconSize','components.kpi.trendFontSize'], 230, TRUE),
('components.modal',       'components','Modal Gallery',         'Hộp thoại',         'componentModal',        ARRAY['components.modal.radius','components.modal.padding','components.modal.headerPadding'], 240, FALSE)
ON CONFLICT (scene_key) DO NOTHING;

-- ── Default rollout values (organization scope, light + dark + high-contrast) ──
INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'light', COALESCE(default_light,''), TRUE, NOW(), 'migration:148', 1
FROM graphics_token_catalog
WHERE default_light IS NOT NULL
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'dark', COALESCE(default_dark,''), TRUE, NOW(), 'migration:148', 1
FROM graphics_token_catalog
WHERE default_dark IS NOT NULL
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'high-contrast', COALESCE(default_high_contrast,''), TRUE, NOW(), 'migration:148', 1
FROM graphics_token_catalog
WHERE default_high_contrast IS NOT NULL
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT token_key, 'organization', 'default', 'print', COALESCE(default_print, default_light,''), TRUE, NOW(), 'migration:148', 1
FROM graphics_token_catalog
WHERE default_print IS NOT NULL OR default_light IS NOT NULL
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

-- ── Theme schedule seeds (Day / Night / Maintenance shifts) ────────────────
INSERT INTO graphics_theme_schedule (schedule_name, description, trigger_type, trigger_config, target_color_mode, scope_type, scope_id, priority) VALUES
('shift.day',         'Day-shift bright theme',      'shift', '{"shift":"A","startTime":"06:00","endTime":"14:00","daysOfWeek":[1,2,3,4,5,6]}'::jsonb, 'light',            'tenant','default', 100),
('shift.swing',       'Swing-shift balanced theme',  'shift', '{"shift":"B","startTime":"14:00","endTime":"22:00","daysOfWeek":[1,2,3,4,5,6]}'::jsonb, 'light',            'tenant','default', 100),
('shift.night',       'Night-shift dimmed theme',    'shift', '{"shift":"C","startTime":"22:00","endTime":"06:00","daysOfWeek":[1,2,3,4,5,6,7]}'::jsonb,'dark',             'tenant','default', 100),
('maintenance.amber', 'Maintenance amber overlay',   'event', '{"eventKey":"maintenance-window"}'::jsonb,                                                 'maintenance-amber','tenant','default', 150)
ON CONFLICT (schedule_name) DO NOTHING;

COMMIT;

-- ============================================================================
-- Migration 148 complete. Next steps:
-- 1. Backend: DesignTokenCatalogService.php reads these tables via DataLayer.
-- 2. Repository: writeDesignConfig() now also shadow-writes to graphics_token_value.
-- 3. Frontend: GraphicsAuthority.tokens.read() resolves values from these tables.
-- 4. Scanner: populate graphics_module_binding by grepping portal scripts for
--    GraphicsAuthority.tokens.read() calls.
-- ============================================================================
