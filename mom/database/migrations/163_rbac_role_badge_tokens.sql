-- ============================================================================
-- Migration 163: role badge tokens (Graphics Authority link, no-hardcode rule)
-- ----------------------------------------------------------------------------
-- Removes the last visual hardcode for roles.
--
-- Strategy
--   * Colors  → graphics_token_catalog (legitimate design tokens, dark-mode
--               aware, WCAG contrast tracked).
--   * Emojis  → roles.icon_emoji direct column (emojis are content, not
--               styling tokens — keeping them in graphics_token_catalog
--               would violate its layer/family taxonomy).
--   * Rank    → roles.rank_level (0=executive … 5=external).
--   * Admin   → roles.is_admin_tier (replaces hardcoded admin_roles() list).
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add columns to roles
-- ---------------------------------------------------------------------------
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS icon_emoji              VARCHAR(10),
    ADD COLUMN IF NOT EXISTS badge_color_token       VARCHAR(200),
    ADD COLUMN IF NOT EXISTS badge_dark_color_token  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS rank_level              SMALLINT,
    ADD COLUMN IF NOT EXISTS is_admin_tier           BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN roles.icon_emoji IS 'Emoji shown as the role badge icon (content, not a design token).';
COMMENT ON COLUMN roles.badge_color_token IS 'graphics_token_catalog.token_key for the role badge color (light theme).';
COMMENT ON COLUMN roles.badge_dark_color_token IS 'graphics_token_catalog.token_key for the role badge color (dark theme variant; usually same key — dark value handled by token).';
COMMENT ON COLUMN roles.rank_level IS 'Role rank: 0=executive, 1=director, 2=manager, 3=lead, 4=operator, 5=external.';
COMMENT ON COLUMN roles.is_admin_tier IS 'TRUE if role grants admin-tier access (replaces hardcoded admin_roles() list in api.php).';

-- ---------------------------------------------------------------------------
-- 2. Seed graphics_token_catalog with role-badge color tokens.
--    Uses the actual schema: layer/family/subfamily/value_type required NOT NULL.
-- ---------------------------------------------------------------------------
INSERT INTO graphics_token_catalog
    (token_key, css_variable, layer, family, subfamily, value_type, default_light, default_dark, description, source_authority)
VALUES
    ('semantic.color.role.executive',     '--role-executive',     'semantic', 'color', 'role-badge', 'hex', '#7c3aed', '#a78bfa', 'Role badge color: executive / CEO',                'rbac-migration-163'),
    ('semantic.color.role.production',    '--role-production',    'semantic', 'color', 'role-badge', 'hex', '#059669', '#34d399', 'Role badge color: production',                     'rbac-migration-163'),
    ('semantic.color.role.cnc',           '--role-cnc',           'semantic', 'color', 'role-badge', 'hex', '#0891b2', '#22d3ee', 'Role badge color: CNC operator',                   'rbac-migration-163'),
    ('semantic.color.role.engineering',   '--role-engineering',   'semantic', 'color', 'role-badge', 'hex', '#0369a1', '#38bdf8', 'Role badge color: engineering',                    'rbac-migration-163'),
    ('semantic.color.role.quality',       '--role-quality',       'semantic', 'color', 'role-badge', 'hex', '#dc2626', '#f87171', 'Role badge color: quality / QA',                   'rbac-migration-163'),
    ('semantic.color.role.audit',         '--role-audit',         'semantic', 'color', 'role-badge', 'hex', '#b91c1c', '#fca5a5', 'Role badge color: audit / internal auditor',      'rbac-migration-163'),
    ('semantic.color.role.supply_chain',  '--role-supply-chain',  'semantic', 'color', 'role-badge', 'hex', '#84cc16', '#a3e635', 'Role badge color: supply chain',                   'rbac-migration-163'),
    ('semantic.color.role.finance',       '--role-finance',       'semantic', 'color', 'role-badge', 'hex', '#9333ea', '#c084fc', 'Role badge color: finance',                        'rbac-migration-163'),
    ('semantic.color.role.hr',            '--role-hr',            'semantic', 'color', 'role-badge', 'hex', '#a21caf', '#e879f9', 'Role badge color: HR',                             'rbac-migration-163'),
    ('semantic.color.role.it',            '--role-it',            'semantic', 'color', 'role-badge', 'hex', '#475569', '#94a3b8', 'Role badge color: IT admin',                       'rbac-migration-163'),
    ('semantic.color.role.qms',           '--role-qms',           'semantic', 'color', 'role-badge', 'hex', '#d97706', '#fbbf24', 'Role badge color: QMS engineer',                   'rbac-migration-163'),
    ('semantic.color.role.sales',         '--role-sales',         'semantic', 'color', 'role-badge', 'hex', '#0d9488', '#5eead4', 'Role badge color: sales / customer service',       'rbac-migration-163'),
    ('semantic.color.role.warehouse',     '--role-warehouse',     'semantic', 'color', 'role-badge', 'hex', '#65a30d', '#bef264', 'Role badge color: warehouse',                      'rbac-migration-163'),
    ('semantic.color.role.maintenance',   '--role-maintenance',   'semantic', 'color', 'role-badge', 'hex', '#92400e', '#fdba74', 'Role badge color: maintenance',                    'rbac-migration-163'),
    ('semantic.color.role.ehs',           '--role-ehs',           'semantic', 'color', 'role-badge', 'hex', '#16a34a', '#4ade80', 'Role badge color: EHS specialist',                 'rbac-migration-163'),
    ('semantic.color.role.default',       '--role-default',       'semantic', 'color', 'role-badge', 'hex', '#6366f1', '#a5b4fc', 'Role badge color: default fallback',               'rbac-migration-163')
ON CONFLICT (token_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Seed default role assignments (icon emoji + token + rank + admin tier).
--    Uses UPDATE…WHERE so missing roles are silently skipped.
-- ---------------------------------------------------------------------------
UPDATE roles SET icon_emoji = '👔', badge_color_token = 'semantic.color.role.executive',     badge_dark_color_token = 'semantic.color.role.executive',     rank_level = 0, is_admin_tier = TRUE  WHERE role_code = 'ceo';
UPDATE roles SET icon_emoji = '🏭', badge_color_token = 'semantic.color.role.production',    badge_dark_color_token = 'semantic.color.role.production',    rank_level = 1, is_admin_tier = FALSE WHERE role_code = 'production_director';
UPDATE roles SET icon_emoji = '🏭', badge_color_token = 'semantic.color.role.production',    badge_dark_color_token = 'semantic.color.role.production',    rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'cnc_workshop_manager';
UPDATE roles SET icon_emoji = '🔩', badge_color_token = 'semantic.color.role.cnc',           badge_dark_color_token = 'semantic.color.role.cnc',           rank_level = 4, is_admin_tier = FALSE WHERE role_code = 'cnc_operator';
UPDATE roles SET icon_emoji = '⚙️', badge_color_token = 'semantic.color.role.engineering',   badge_dark_color_token = 'semantic.color.role.engineering',   rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'engineering_lead';
UPDATE roles SET icon_emoji = '🛡️', badge_color_token = 'semantic.color.role.quality',       badge_dark_color_token = 'semantic.color.role.quality',       rank_level = 2, is_admin_tier = TRUE  WHERE role_code = 'qa_manager';
UPDATE roles SET icon_emoji = '📊', badge_color_token = 'semantic.color.role.audit',         badge_dark_color_token = 'semantic.color.role.audit',         rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'internal_auditor';
UPDATE roles SET icon_emoji = '🛒', badge_color_token = 'semantic.color.role.supply_chain',  badge_dark_color_token = 'semantic.color.role.supply_chain',  rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'supply_chain_manager';
UPDATE roles SET icon_emoji = '🏦', badge_color_token = 'semantic.color.role.finance',       badge_dark_color_token = 'semantic.color.role.finance',       rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'finance_manager';
UPDATE roles SET icon_emoji = '👥', badge_color_token = 'semantic.color.role.hr',            badge_dark_color_token = 'semantic.color.role.hr',            rank_level = 2, is_admin_tier = FALSE WHERE role_code = 'hr_manager';
UPDATE roles SET icon_emoji = '🖥️', badge_color_token = 'semantic.color.role.it',            badge_dark_color_token = 'semantic.color.role.it',            rank_level = 2, is_admin_tier = TRUE  WHERE role_code = 'it_admin';
UPDATE roles SET icon_emoji = '📋', badge_color_token = 'semantic.color.role.qms',           badge_dark_color_token = 'semantic.color.role.qms',           rank_level = 3, is_admin_tier = TRUE  WHERE role_code = 'qms_engineer';
UPDATE roles SET icon_emoji = '📦', badge_color_token = 'semantic.color.role.warehouse',     badge_dark_color_token = 'semantic.color.role.warehouse',     rank_level = 4, is_admin_tier = FALSE WHERE role_code IN ('warehouse_clerk','tool_crib_storekeeper');
UPDATE roles SET icon_emoji = '🔧', badge_color_token = 'semantic.color.role.maintenance',   badge_dark_color_token = 'semantic.color.role.maintenance',   rank_level = 4, is_admin_tier = FALSE WHERE role_code = 'maintenance_technician';
UPDATE roles SET icon_emoji = '🦺', badge_color_token = 'semantic.color.role.ehs',           badge_dark_color_token = 'semantic.color.role.ehs',           rank_level = 3, is_admin_tier = FALSE WHERE role_code = 'ehs_specialist';
UPDATE roles SET icon_emoji = '🤝', badge_color_token = 'semantic.color.role.sales',         badge_dark_color_token = 'semantic.color.role.sales',         rank_level = 3, is_admin_tier = FALSE WHERE role_code IN ('estimator','customer_service','buyer_purchasing');

-- Anything still missing → default
UPDATE roles
   SET icon_emoji            = COALESCE(icon_emoji, '👤'),
       badge_color_token     = COALESCE(badge_color_token, 'semantic.color.role.default'),
       badge_dark_color_token= COALESCE(badge_dark_color_token, 'semantic.color.role.default'),
       rank_level            = COALESCE(rank_level, 5)
 WHERE icon_emoji IS NULL
    OR badge_color_token IS NULL
    OR badge_dark_color_token IS NULL
    OR rank_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_roles_admin_tier ON roles(is_admin_tier) WHERE is_admin_tier = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_roles_rank_level ON roles(rank_level) WHERE is_active = TRUE;

COMMIT;

-- Rollback:
--   BEGIN;
--   ALTER TABLE roles
--     DROP COLUMN IF EXISTS icon_emoji,
--     DROP COLUMN IF EXISTS badge_color_token,
--     DROP COLUMN IF EXISTS badge_dark_color_token,
--     DROP COLUMN IF EXISTS rank_level,
--     DROP COLUMN IF EXISTS is_admin_tier;
--   DELETE FROM graphics_token_catalog WHERE source_authority = 'rbac-migration-163';
--   COMMIT;
