-- ============================================================================
-- Migration 167: portal display — widgets, layouts, per-(scope) preferences
-- ----------------------------------------------------------------------------
-- Replaces mom/api/config/portal_display_config.json with a normalized,
-- multi-tenant, RBAC-aware portal layout system.
--
-- Layout resolution priority (highest wins):
--     user → role → dept → plant → global
--
-- Each widget declares required permission keys (permission_catalog.permission_code);
-- the runtime hides widgets the user does not satisfy. This is the same
-- pattern used by ServiceNow Now Experience UI Builder, Salesforce Lightning
-- Layouts, and SAP Fiori Launchpad.
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. portal_widget_catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_widget_catalog (
    widget_code             VARCHAR(80)     PRIMARY KEY,
    label                   VARCHAR(150)    NOT NULL,
    label_vi                VARCHAR(150),
    description             TEXT,
    description_vi          TEXT,
    render_kind             VARCHAR(40)     NOT NULL DEFAULT 'card'
                            CHECK (render_kind IN ('card','chart','kpi_tile','list','timeline','iframe','quick_links','grid','banner','calendar','heatmap','custom')),
    icon_token              VARCHAR(200),
    color_token             VARCHAR(200),
    default_props           JSONB           NOT NULL DEFAULT '{}'::jsonb,
    required_permissions    TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    min_grid_cols           SMALLINT        NOT NULL DEFAULT 1,
    min_grid_rows           SMALLINT        NOT NULL DEFAULT 1,
    max_grid_cols           SMALLINT,
    max_grid_rows           SMALLINT,
    refresh_seconds         INTEGER         NOT NULL DEFAULT 60,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    is_system               BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID
);

COMMENT ON TABLE portal_widget_catalog IS 'Catalogue of portal widgets (RBAC-aware). / Catalog widget portal nhan biet RBAC.';
COMMENT ON COLUMN portal_widget_catalog.required_permissions IS 'Array of permission_catalog.permission_code values; user must hold ALL.';
COMMENT ON COLUMN portal_widget_catalog.render_kind IS 'How the frontend renders the widget shell.';

CREATE INDEX IF NOT EXISTS idx_portal_widget_active ON portal_widget_catalog(is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 2. portal_layout_template
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_layout_template (
    layout_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_code             VARCHAR(60)     NOT NULL,
    label                   VARCHAR(150)    NOT NULL,
    label_vi                VARCHAR(150),
    description             TEXT,
    scope_kind              VARCHAR(20)     NOT NULL
                            CHECK (scope_kind IN ('global','plant','dept','role','user')),
    scope_id                VARCHAR(120),
    grid_cols               SMALLINT        NOT NULL DEFAULT 12,
    grid_row_height_px      SMALLINT        NOT NULL DEFAULT 80,
    layout_json             JSONB           NOT NULL DEFAULT '[]'::jsonb,
    is_default              BOOLEAN         NOT NULL DEFAULT FALSE,
    valid_from              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_until             TIMESTAMPTZ,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID,
    UNIQUE (scope_kind, scope_id, layout_code, deleted_at)
);

COMMENT ON TABLE portal_layout_template IS 'Saved portal layout per scope (global / plant / dept / role / user).';
COMMENT ON COLUMN portal_layout_template.layout_json IS 'Array of {widget_code, x, y, w, h, props_override} entries — react-grid-layout compatible.';
COMMENT ON COLUMN portal_layout_template.scope_kind IS 'Resolution priority: user > role > dept > plant > global.';

CREATE INDEX IF NOT EXISTS idx_portal_layout_scope ON portal_layout_template(scope_kind, scope_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portal_layout_default ON portal_layout_template(scope_kind, is_default) WHERE is_default = TRUE AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. portal_layout_widget (normalized index of layout_json for queries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_layout_widget (
    layout_widget_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id               UUID            NOT NULL REFERENCES portal_layout_template(layout_id) ON DELETE CASCADE,
    widget_code             VARCHAR(80)     NOT NULL REFERENCES portal_widget_catalog(widget_code),
    grid_x                  SMALLINT        NOT NULL DEFAULT 0,
    grid_y                  SMALLINT        NOT NULL DEFAULT 0,
    grid_w                  SMALLINT        NOT NULL DEFAULT 4,
    grid_h                  SMALLINT        NOT NULL DEFAULT 2,
    sort_order              INTEGER         NOT NULL DEFAULT 0,
    props_override          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    is_pinned               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_visible              BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE portal_layout_widget IS 'Normalized index of widgets inside a portal_layout_template (denormalized in layout_json for hot-path).';

CREATE INDEX IF NOT EXISTS idx_portal_layout_widget_layout ON portal_layout_widget(layout_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_portal_layout_widget_widget ON portal_layout_widget(widget_code);

-- ---------------------------------------------------------------------------
-- 4. portal_display_preference (per-user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_display_preference (
    user_id                 UUID            PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    preferred_layout_id     UUID            REFERENCES portal_layout_template(layout_id) ON DELETE SET NULL,
    theme_token             VARCHAR(200),
    density                 VARCHAR(20)     NOT NULL DEFAULT 'comfortable'
                            CHECK (density IN ('compact','comfortable','cozy')),
    high_contrast           BOOLEAN         NOT NULL DEFAULT FALSE,
    reduce_motion           BOOLEAN         NOT NULL DEFAULT FALSE,
    locale                  VARCHAR(10)     NOT NULL DEFAULT 'vi',
    timezone                VARCHAR(50)     NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    date_format             VARCHAR(20)     NOT NULL DEFAULT 'YYYY-MM-DD',
    pinned_widgets          TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    hidden_widgets          TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE portal_display_preference IS 'Per-user portal display preferences (theme, density, locale, pinned widgets).';
COMMENT ON COLUMN portal_display_preference.theme_token IS 'graphics_token_catalog.token_key for the chosen palette (light / dark / brand-foo).';

-- ---------------------------------------------------------------------------
-- 5. View: effective layout for a user (resolves user > role > dept > plant > global)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_portal_effective_layout AS
    WITH user_scope AS (
        SELECT
            u.user_id,
            u.username,
            u.primary_role_id::text AS role_scope_id,
            r.role_code,
            u.dept_code::text       AS dept_scope_id,
            COALESCE(u.metadata->>'plant_id', NULL) AS plant_scope_id,
            p.preferred_layout_id
        FROM users u
        LEFT JOIN roles r ON r.role_id = u.primary_role_id
        LEFT JOIN portal_display_preference p ON p.user_id = u.user_id
    ),
    candidates AS (
        -- user-pinned override first
        SELECT us.user_id, lt.*, 1 AS priority
        FROM user_scope us
        JOIN portal_layout_template lt ON lt.layout_id = us.preferred_layout_id
        WHERE lt.deleted_at IS NULL
        UNION ALL
        -- role-scope
        SELECT us.user_id, lt.*, 2
        FROM user_scope us
        JOIN portal_layout_template lt ON lt.scope_kind = 'role' AND lt.scope_id = us.role_code AND lt.is_default = TRUE
        WHERE lt.deleted_at IS NULL AND lt.valid_from <= now() AND (lt.valid_until IS NULL OR lt.valid_until > now())
        UNION ALL
        -- dept-scope
        SELECT us.user_id, lt.*, 3
        FROM user_scope us
        JOIN portal_layout_template lt ON lt.scope_kind = 'dept' AND lt.scope_id = us.dept_scope_id AND lt.is_default = TRUE
        WHERE lt.deleted_at IS NULL AND lt.valid_from <= now() AND (lt.valid_until IS NULL OR lt.valid_until > now())
        UNION ALL
        -- plant-scope
        SELECT us.user_id, lt.*, 4
        FROM user_scope us
        JOIN portal_layout_template lt ON lt.scope_kind = 'plant' AND lt.scope_id = us.plant_scope_id AND lt.is_default = TRUE
        WHERE lt.deleted_at IS NULL AND lt.valid_from <= now() AND (lt.valid_until IS NULL OR lt.valid_until > now())
        UNION ALL
        -- global default
        SELECT us.user_id, lt.*, 5
        FROM user_scope us
        JOIN portal_layout_template lt ON lt.scope_kind = 'global' AND lt.is_default = TRUE
        WHERE lt.deleted_at IS NULL AND lt.valid_from <= now() AND (lt.valid_until IS NULL OR lt.valid_until > now())
    )
    SELECT DISTINCT ON (user_id) *
    FROM candidates
    ORDER BY user_id, priority;

COMMENT ON VIEW v_portal_effective_layout IS 'Resolves the effective portal layout per user (user > role > dept > plant > global priority).';

-- ---------------------------------------------------------------------------
-- 6. Triggers + seed
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_portal_widget_set_updated_at') THEN
        CREATE TRIGGER trg_portal_widget_set_updated_at
            BEFORE UPDATE ON portal_widget_catalog
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_portal_layout_set_updated_at') THEN
        CREATE TRIGGER trg_portal_layout_set_updated_at
            BEFORE UPDATE ON portal_layout_template
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- Seed widget catalogue (matches the existing portal home tiles).
INSERT INTO portal_widget_catalog (widget_code, label, label_vi, render_kind, refresh_seconds, required_permissions, default_props) VALUES
    ('kpi.otd',                'OTD — On-Time Delivery',                'OTD — Giao hang dung han',                  'kpi_tile',     300, ARRAY['records.view'], '{"target":95,"unit":"%"}'),
    ('kpi.fpy',                'FPY — First Pass Yield',                'FPY — Ty le dat lan dau',                   'kpi_tile',     300, ARRAY['records.view'], '{"target":98,"unit":"%"}'),
    ('kpi.copq',               'COPQ — Cost of Poor Quality',           'COPQ — Chi phi chat luong kem',             'kpi_tile',     900, ARRAY['records.view'], '{"target":2,"unit":"%"}'),
    ('kpi.ncr_open',           'NCR Open',                              'NCR dang mo',                                'kpi_tile',     180, ARRAY['records.view'], '{}'),
    ('kpi.iqc_pass',           'IQC Pass Rate',                         'Ty le dat IQC',                              'kpi_tile',     300, ARRAY['records.view'], '{"target":99,"unit":"%"}'),
    ('kpi.oee',                'OEE — Equipment Effectiveness',         'OEE — Hieu suat thiet bi',                  'kpi_tile',     300, ARRAY['records.view'], '{"target":85,"unit":"%"}'),
    ('lifecycle.gates',        'Order lifecycle G0->G7',                 'Vong doi don hang G0->G7',                  'timeline',     120, ARRAY['records.view'], '{}'),
    ('quicklinks.role',        'Quick links by role',                   'Truy cap nhanh theo vai tro',                'quick_links',   60, ARRAY[]::TEXT[],         '{}'),
    ('docs.pending_ack',       'Documents pending acknowledgement',     'Tai lieu chua xac nhan da doc',              'list',          90, ARRAY['docs.view'],     '{}'),
    ('docs.recent',            'Recently released documents',           'Tai lieu vua phat hanh',                    'list',         300, ARRAY['docs.view'],     '{}'),
    ('audit.recent',           'Recent audit events',                   'Hoat dong gan day',                          'timeline',     120, ARRAY['audit.view'],    '{}'),
    ('mfa.compliance',         'MFA compliance overview',               'Tinh trang tuan thu MFA',                   'kpi_tile',     600, ARRAY['mfa.policy.edit'],'{}'),
    ('access_review.progress', 'Access review progress',                'Tien do danh gia phan quyen',                'kpi_tile',     900, ARRAY['rbac.review.run'],'{}'),
    ('retention.due_soon',     'Documents due for retention disposal',  'Tai lieu sap den han luu giu',              'list',         3600, ARRAY['rbac.role.view'],'{}'),
    ('graphics.preview_log',   'Recent graphics simulation runs',       'Phien gia lap giao dien gan day',            'list',         600, ARRAY['admin.backend'],'{}')
ON CONFLICT (widget_code) DO NOTHING;

-- Seed default global layout
INSERT INTO portal_layout_template (layout_code, label, label_vi, scope_kind, scope_id, layout_json, is_default)
VALUES (
    'global_default',
    'Global default portal',
    'Bo cuc portal mac dinh toan he thong',
    'global',
    NULL,
    '[
        {"widget_code":"kpi.otd","x":0,"y":0,"w":2,"h":2},
        {"widget_code":"kpi.fpy","x":2,"y":0,"w":2,"h":2},
        {"widget_code":"kpi.copq","x":4,"y":0,"w":2,"h":2},
        {"widget_code":"kpi.ncr_open","x":6,"y":0,"w":2,"h":2},
        {"widget_code":"kpi.iqc_pass","x":8,"y":0,"w":2,"h":2},
        {"widget_code":"kpi.oee","x":10,"y":0,"w":2,"h":2},
        {"widget_code":"lifecycle.gates","x":0,"y":2,"w":12,"h":3},
        {"widget_code":"quicklinks.role","x":0,"y":5,"w":6,"h":4},
        {"widget_code":"docs.pending_ack","x":6,"y":5,"w":6,"h":4}
    ]'::jsonb,
    TRUE
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_portal_effective_layout;
--   DROP TABLE IF EXISTS portal_display_preference;
--   DROP TABLE IF EXISTS portal_layout_widget;
--   DROP TABLE IF EXISTS portal_layout_template;
--   DROP TABLE IF EXISTS portal_widget_catalog;
--   COMMIT;
