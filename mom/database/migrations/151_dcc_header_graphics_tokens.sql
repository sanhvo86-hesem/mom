-- ============================================================================
-- Migration 151: DCC Header — Graphics Authority tokens
-- ============================================================================
-- Purpose:
--   Register every visual parameter used by the DCC header renderer
--   (mom/scripts/portal/11-dcc-header-renderer.js + mom/styles/dcc-header.css)
--   with the Graphics Authority (graphics_token_catalog) so NOTHING is
--   hardcoded in CSS/JS. All spacing, colors, font-sizes, weights, and
--   separator widths come from this catalog via --dcc-* CSS variables.
--
--   Core invariant:
--     gap(label ↔ value)  ==  gap(value ↔ separator '|')
--   Both sides of the separator get the same `--dcc-cell-gap` token, which
--   prevents the overflow-onto-next-line issue reported for the v2.0 layout.
--
--   Five functional zones on the header:
--     ID  ➜  Rev  ➜  Eff  ➜  Owner  ➜  Appr
--   Each zone respects the same gap/padding/separator tokens.
--
-- Standards: ISO 9241-112 (presentation of information), WCAG 2.2 AA contrast.
-- Safety:    Additive only. ON CONFLICT DO NOTHING guards on every insert.
-- Date:      2026-04-22
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — Register the DCC header token keys
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO graphics_token_catalog
    (token_key,                       css_variable,            layer,    family,      subfamily, value_type, unit, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description)
VALUES
    ('dcc.header.padding.y',          '--dcc-pad-y',           'component','spacing','dcc_header','dimension','px',  0,   32, 1,  '8',      '8',      '10',    'Vertical padding inside each header cell.'),
    ('dcc.header.padding.x',          '--dcc-pad-x',           'component','spacing','dcc_header','dimension','px',  0,   40, 1, '12',     '12',     '14',    'Horizontal padding inside each header cell.'),
    ('dcc.header.cell.gap',           '--dcc-cell-gap',        'component','spacing','dcc_header','dimension','px',  0,   24, 1,  '6',      '6',      '8',    'Gap between label, value, and separator pipe. Applied uniformly on both sides of the separator to prevent overflow.'),
    ('dcc.header.separator.width',    '--dcc-sep-width',       'component','spacing','dcc_header','dimension','px',  0,    4, 1,  '1',      '1',      '2',    'Thickness of the vertical separator pipe between header cells.'),
    ('dcc.header.row.min_height',     '--dcc-row-min-height',  'component','spacing','dcc_header','dimension','px', 28,   64, 1, '36',     '36',     '40',    'Minimum height of a header row; guarantees no vertical overflow for a single-line cell.'),
    ('dcc.header.label.max_width',    '--dcc-label-max-width', 'component','spacing','dcc_header','dimension','px', 24,  120, 1, '64',     '64',     '72',    'Maximum width of the short-label slot; keeps labels from pushing the value onto a second line.'),
    ('dcc.header.owner.max_width',    '--dcc-owner-max-width', 'component','spacing','dcc_header','dimension','px', 48,  280, 1,'120',    '120',    '140',    'Maximum width of the single-owner badge (dual owner explicitly forbidden).')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog
    (token_key,                       css_variable,            layer,    family,       subfamily, value_type, unit, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description)
VALUES
    ('dcc.header.label.font_size',    '--dcc-label-font-size', 'component','typography','dcc_header','dimension','px', 10,  16, 1, '11',     '11',     '12',    'Font size for the short label (ID / Rev / Eff / Owner / Appr).'),
    ('dcc.header.value.font_size',    '--dcc-value-font-size', 'component','typography','dcc_header','dimension','px', 11,  18, 1, '12',     '12',     '13',    'Font size for the value segment.'),
    ('dcc.header.code.font_size',     '--dcc-code-font-size',  'component','typography','dcc_header','dimension','px', 11,  18, 1, '12',     '12',     '13',    'Font size for the document-code badge.')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog
    (token_key,                        css_variable,            layer,    family,       subfamily, value_type, min_numeric, max_numeric, step_numeric, default_light, default_dark, default_high_contrast, description)
VALUES
    ('dcc.header.label.font_weight',   '--dcc-label-weight',    'component','typography','dcc_header','unitless', 100, 900, 100, '600', '600', '700', 'Weight of the short label text.'),
    ('dcc.header.value.font_weight',   '--dcc-value-weight',    'component','typography','dcc_header','unitless', 100, 900, 100, '500', '500', '600', 'Weight of the value segment text.'),
    ('dcc.header.code.font_weight',    '--dcc-code-weight',     'component','typography','dcc_header','unitless', 100, 900, 100, '700', '700', '800', 'Weight of the document-code badge.')
ON CONFLICT (token_key) DO NOTHING;

INSERT INTO graphics_token_catalog
    (token_key,                        css_variable,            layer,    family,  subfamily, value_type, default_light, default_dark, default_high_contrast, default_print, description)
VALUES
    ('dcc.header.bg',                  '--dcc-bg',              'component','color','dcc_header','hex', '#f8fafc', '#1e293b', '#ffffff', '#ffffff', 'Header container background.'),
    ('dcc.header.border',              '--dcc-border',          'component','color','dcc_header','hex', '#f9a825', '#fbbf24', '#000000', '#333333', 'Top accent border under the title.'),
    ('dcc.header.separator.color',     '--dcc-sep-color',       'component','color','dcc_header','hex', '#e2e8f0', '#334155', '#000000', '#888888', 'Separator pipe color.'),
    ('dcc.header.label.color',         '--dcc-label-color',     'component','color','dcc_header','hex', '#64748b', '#94a3b8', '#222222', '#333333', 'Short-label text color.'),
    ('dcc.header.value.color',         '--dcc-value-color',     'component','color','dcc_header','hex', '#0f172a', '#f1f5f9', '#000000', '#000000', 'Value text color.'),
    ('dcc.header.code.bg',             '--dcc-code-bg',         'component','color','dcc_header','hex', '#ffffff', '#0f172a', '#ffffff', '#ffffff', 'Document-code badge background.'),
    ('dcc.header.code.border',         '--dcc-code-border',     'component','color','dcc_header','hex', '#dbe4ec', '#334155', '#000000', '#999999', 'Document-code badge border.'),
    ('dcc.header.owner.bg',            '--dcc-owner-bg',        'component','color','dcc_header','hex', '#f1f5f9', '#0f172a', '#ffffff', '#ffffff', 'Owner / approver role badge background.'),
    ('dcc.header.owner.border',        '--dcc-owner-border',    'component','color','dcc_header','hex', '#dbe4ec', '#334155', '#000000', '#999999', 'Owner / approver role badge border.')
ON CONFLICT (token_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — Register the DCC header as a graphics component contract
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO graphics_component_contract
    (component_key, display_name_en, display_name_vi, description, overridable_tokens)
VALUES
    ('dcc.header',
     'DCC Document Header',
     'Tiêu đề tài liệu DCC',
     'Header ribbon rendered atop every controlled QMS document by the portal. Reads tokens live from Graphics Authority; no hardcoded values permitted.',
     ARRAY[
        'dcc.header.padding.y',
        'dcc.header.padding.x',
        'dcc.header.cell.gap',
        'dcc.header.separator.width',
        'dcc.header.row.min_height',
        'dcc.header.label.max_width',
        'dcc.header.owner.max_width',
        'dcc.header.label.font_size',
        'dcc.header.value.font_size',
        'dcc.header.code.font_size',
        'dcc.header.label.font_weight',
        'dcc.header.value.font_weight',
        'dcc.header.code.font_weight',
        'dcc.header.bg',
        'dcc.header.border',
        'dcc.header.separator.color',
        'dcc.header.label.color',
        'dcc.header.value.color',
        'dcc.header.code.bg',
        'dcc.header.code.border',
        'dcc.header.owner.bg',
        'dcc.header.owner.border'
     ])
ON CONFLICT (component_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3 — Seed organization-default published token values so CSS variables
-- resolve immediately (otherwise --dcc-* would be undefined on first render).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO graphics_token_value
    (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT c.token_key, 'organization', 'default', 'light', COALESCE(c.default_light, ''),
       TRUE, now(), 'migration:151', 1
FROM graphics_token_catalog c
WHERE c.token_key LIKE 'dcc.header.%'
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

INSERT INTO graphics_token_value
    (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT c.token_key, 'organization', 'default', 'dark', COALESCE(c.default_dark, ''),
       TRUE, now(), 'migration:151', 1
FROM graphics_token_catalog c
WHERE c.token_key LIKE 'dcc.header.%'
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

INSERT INTO graphics_token_value
    (token_key, scope_type, scope_id, color_mode, value, is_published, published_at, published_by, version)
SELECT c.token_key, 'organization', 'default', 'high_contrast', COALESCE(c.default_high_contrast, ''),
       TRUE, now(), 'migration:151', 1
FROM graphics_token_catalog c
WHERE c.token_key LIKE 'dcc.header.%'
ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4 — Audit summary
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_tokens INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tokens FROM graphics_token_catalog WHERE token_key LIKE 'dcc.header.%';
    RAISE NOTICE '[Migration 151] DCC header tokens registered: %', v_tokens;
END;
$$;

COMMIT;
