-- ============================================================================
-- Migration 160: modules_catalog + module_permission
-- ----------------------------------------------------------------------------
-- Replaces mom/api/config/module_access_config.json with a normalized
-- (role × module) CRUD/approve/export matrix.
--
-- modules_catalog       : the canonical list of frontend modules + their
--                         display tokens (icon, color, route_class).
-- module_permission     : per-role flags (view/create/update/delete/approve/
--                         export) and an ABAC `scope_jsonb` for advanced
--                         filters (dept_only, owner_only, plant=…).
--
-- Compatible with NIST 800-162 (ABAC) — module_permission.scope_jsonb is the
-- ABAC envelope, module_permission.can_* booleans are the RBAC envelope. UI
-- combines both.
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- modules_catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules_catalog (
    module_code             VARCHAR(50)     PRIMARY KEY,
    label                   VARCHAR(150)    NOT NULL,
    label_vi                VARCHAR(150),
    description             TEXT,
    description_vi          TEXT,
    icon_token              VARCHAR(80),
    color_token             VARCHAR(80),
    route_class             VARCHAR(50),
    parent_module_code      VARCHAR(50)     REFERENCES modules_catalog(module_code) ON DELETE SET NULL,
    sort_order              INTEGER         NOT NULL DEFAULT 0,
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

COMMENT ON TABLE modules_catalog IS 'Catalogue of frontend modules with display tokens. / Danh muc module frontend voi token hien thi.';
COMMENT ON COLUMN modules_catalog.icon_token IS 'graphics_token_catalog.token_key for the module icon.';
COMMENT ON COLUMN modules_catalog.color_token IS 'graphics_token_catalog.token_key for the module accent color.';
COMMENT ON COLUMN modules_catalog.route_class IS 'HMV4 route classification (workspace_projection / authoritative_record_shell / …).';

CREATE INDEX IF NOT EXISTS idx_modules_catalog_parent ON modules_catalog(parent_module_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_modules_catalog_active ON modules_catalog(is_active, sort_order) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- module_permission  (role × module → CRUD/approve/export + ABAC scope)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_permission (
    module_permission_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id                 UUID            NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    module_code             VARCHAR(50)     NOT NULL REFERENCES modules_catalog(module_code) ON DELETE CASCADE,
    can_view                BOOLEAN         NOT NULL DEFAULT FALSE,
    can_create              BOOLEAN         NOT NULL DEFAULT FALSE,
    can_update              BOOLEAN         NOT NULL DEFAULT FALSE,
    can_delete              BOOLEAN         NOT NULL DEFAULT FALSE,
    can_approve             BOOLEAN         NOT NULL DEFAULT FALSE,
    can_export              BOOLEAN         NOT NULL DEFAULT FALSE,
    scope                   JSONB           NOT NULL DEFAULT '{}'::jsonb,
    scope_explanation       TEXT,
    notes                   TEXT,
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
    UNIQUE (role_id, module_code, deleted_at)
);

COMMENT ON TABLE module_permission IS 'Per-role module CRUD/approve/export + ABAC scope. / Phan quyen module theo vai tro + scope ABAC.';
COMMENT ON COLUMN module_permission.scope IS 'ABAC scope envelope: {dept_only:bool, owner_only:bool, plant_ids:[…], doc_pattern:"…"}.';

CREATE INDEX IF NOT EXISTS idx_module_permission_role ON module_permission(role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_module_permission_module ON module_permission(module_code) WHERE deleted_at IS NULL;

-- updated_at triggers --------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_modules_catalog_set_updated_at') THEN
        CREATE TRIGGER trg_modules_catalog_set_updated_at
            BEFORE UPDATE ON modules_catalog
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_module_permission_set_updated_at') THEN
        CREATE TRIGGER trg_module_permission_set_updated_at
            BEFORE UPDATE ON module_permission
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- Seed modules_catalog from the live frontend MODULE_ACCESS_CONFIG list.
-- ---------------------------------------------------------------------------
INSERT INTO modules_catalog (module_code, label, label_vi, route_class, sort_order, is_active, is_system) VALUES
    ('dashboard',       'Dashboard',                'Bang dieu khien',          'workspace_projection',      10,  TRUE, FALSE),
    ('docs',            'Document Control',         'Kiem soat tai lieu',       'authoritative_record_shell',20,  TRUE, FALSE),
    ('forms',           'Forms & Records',          'Bieu mau & Ho so',         'authoritative_record_shell',30,  TRUE, FALSE),
    ('users',           'Users',                    'Nguoi dung',               'admin_governance',          40,  TRUE, TRUE),
    ('rbac',            'Roles & Permissions',      'Vai tro & Phan quyen',     'admin_governance',          50,  TRUE, TRUE),
    ('mfa',             'MFA Security',             'Bao mat MFA',              'admin_governance',          60,  TRUE, TRUE),
    ('audit',           'Audit Trail',              'Nhat ky kiem tra',         'admin_governance',          70,  TRUE, TRUE),
    ('eqms',            'EQMS Suite',               'EQMS Suite',               'workspace_projection',      80,  TRUE, FALSE),
    ('production',      'Production',               'San xuat',                 'workspace_projection',      90,  TRUE, FALSE),
    ('quality',         'Quality',                  'Chat luong',               'workspace_projection',     100,  TRUE, FALSE),
    ('inventory',       'Inventory',                'Kho',                      'workspace_projection',     110,  TRUE, FALSE),
    ('purchasing',      'Purchasing',               'Mua hang',                 'workspace_projection',     120,  TRUE, FALSE),
    ('finance',         'Finance',                  'Tai chinh',                'authoritative_record_shell',130, TRUE, FALSE),
    ('hr',              'HR & Org',                 'Nhan su & To chuc',        'admin_governance',         140,  TRUE, FALSE),
    ('training',        'Training',                 'Dao tao',                  'workspace_projection',     150,  TRUE, FALSE),
    ('analytics',       'Analytics',                'Phan tich',                'workspace_projection',     160,  TRUE, FALSE),
    ('schema_studio',   'Data Schema',              'Data Schema',              'admin_governance',         170,  TRUE, TRUE),
    ('infrastructure',  'VPS Infrastructure',       'Ha tang VPS',              'admin_governance',         180,  TRUE, TRUE),
    ('translation',     'Translation Module',       'Module Dich Thuat',        'admin_governance',         190,  TRUE, TRUE),
    ('ai_control',      'AI Control',               'Dieu khien AI',            'admin_governance',         200,  TRUE, TRUE)
ON CONFLICT (module_code) DO NOTHING;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP TABLE IF EXISTS module_permission;
--   DROP TABLE IF EXISTS modules_catalog;
--   COMMIT;
