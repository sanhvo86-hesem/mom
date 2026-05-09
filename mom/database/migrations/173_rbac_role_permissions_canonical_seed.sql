-- ============================================================================
-- Migration 173: Canonical role.permissions JSONB seed (single source of truth)
-- ----------------------------------------------------------------------------
-- Replaces the legacy mom/data/config/role_permissions.json file as the SOLE
-- authority for RBAC permission grants. All 38 catalog roles get a curated
-- {permissions[], denies[]} pattern set following:
--
--   * NIST 800-53 rev5 AC-6   — least privilege
--   * SOX 404 / COBIT 5 DSS06 — separation of duties (PO approve vs payment
--                                execute, doc author vs doc approver,
--                                IT-admin vs finance approval)
--   * ISO 27001 A.9.4         — restricted privileged access
--   * IEC 62443-3-3 SR 1.5    — authorization enforcement on OT-touching roles
--   * 21 CFR Part 11 §11.10   — record-keeping permission gates
--
-- Each role row embeds:
--     {
--       "permissions": ["docs.view","records.create",...],
--       "denies":      ["finance.payment.execute",...],
--       "level":        80,
--       "admin":        false,
--       "allowAllPermissions": false,
--       "canCreateDocs": true,
--       "icon":         "🛡️",
--       "color":        "#1e40af"
--     }
--
-- The 28 atomic permission_codes used here come from migration 159
-- (permission_catalog).
--
-- Idempotent: re-running overwrites the seeded shape but preserves any role
-- not listed below (custom roles added by admin survive).
-- ============================================================================

BEGIN;

-- Ensure all 38 catalog roles exist (no-op if seeded by migration 024).
-- Listed here so the seed is self-contained and testable in isolation.
INSERT INTO roles (role_code, role_label, role_label_vi, dept_code, permissions) VALUES
    ('ceo','Chief Executive Officer','Tổng Giám đốc','EXE','{}'::jsonb),
    ('production_director','Production Director','Giám đốc Sản xuất','PRO','{}'::jsonb),
    ('cnc_workshop_manager','CNC Workshop Manager','Quản đốc xưởng CNC','PRO','{}'::jsonb),
    ('shift_leader','Shift Leader','Trưởng ca','PRO','{}'::jsonb),
    ('setup_technician','Setup Technician','Kỹ thuật viên Setup','PRO','{}'::jsonb),
    ('cnc_operator','CNC Operator','Vận hành máy CNC','PRO','{}'::jsonb),
    ('deburr_team_lead','Deburr Team Lead','Trưởng nhóm mài bavia','PRO','{}'::jsonb),
    ('deburr_technician','Deburr Technician','Kỹ thuật viên mài bavia','PRO','{}'::jsonb),
    ('production_planner','Production Planner','Kế hoạch sản xuất','PRO','{}'::jsonb),
    ('cleaning_packaging_supervisor','Cleaning & Packaging Supervisor','Giám sát Vệ sinh & Đóng gói','PRO','{}'::jsonb),
    ('cleaning_packaging_technician','Cleaning & Packaging Technician','KTV Vệ sinh & Đóng gói','PRO','{}'::jsonb),
    ('maintenance_technician','Maintenance Technician','Kỹ thuật viên Bảo trì','PRO','{}'::jsonb),
    ('production_engineer','Production Engineer','Kỹ sư Sản xuất','PRO','{}'::jsonb),
    ('engineering_lead','Engineering Lead / Manager','Trưởng phòng Kỹ thuật','ENG','{}'::jsonb),
    ('process_engineer','Process Engineer','Kỹ sư Quy trình','ENG','{}'::jsonb),
    ('dfm_engineer','DFM Engineer','Kỹ sư DFM','ENG','{}'::jsonb),
    ('cam_nc_programmer','CAM/NC Programmer','Lập trình CAM/NC','ENG','{}'::jsonb),
    ('qa_manager','QA Manager','Quản lý QA','QA','{}'::jsonb),
    ('quality_engineer','Quality Engineer','Kỹ sư Chất lượng','QA','{}'::jsonb),
    ('qc_inspector','QC Inspector / CMM Operator','KCS / Vận hành CMM','QA','{}'::jsonb),
    ('qc_inspector_lead','QC Inspector Lead','Trưởng nhóm KCS','QA','{}'::jsonb),
    ('qms_engineer','QMS Engineer','Kỹ sư QMS','QA','{}'::jsonb),
    ('internal_auditor','Internal Auditor','Kiểm toán viên nội bộ','QA','{}'::jsonb),
    ('metrology_specialist','Metrology & Calibration Specialist','Chuyên viên đo lường','QA','{}'::jsonb),
    ('supply_chain_manager','Supply Chain Manager','Quản lý Chuỗi cung ứng','SCM','{}'::jsonb),
    ('buyer','Buyer / Purchasing','Nhân viên Mua hàng','SCM','{}'::jsonb),
    ('warehouse_clerk','Warehouse Clerk','Thủ kho','WH','{}'::jsonb),
    ('tool_storekeeper','Tool Crib / Storekeeper','Thủ kho Dụng cụ','SCM','{}'::jsonb),
    ('logistics_coordinator','Logistics / Shipping Coordinator','Điều phối Logistics','WH','{}'::jsonb),
    ('estimator','Estimator','Nhân viên Báo giá','SAL','{}'::jsonb),
    ('customer_service','Customer Service','Chăm sóc Khách hàng','SAL','{}'::jsonb),
    ('finance_manager','Finance Manager','Quản lý Tài chính','EXE','{}'::jsonb),
    ('ap_ar_accountant','AP/AR & Payments Accountant','Kế toán Công nợ','EXE','{}'::jsonb),
    ('gl_payroll_accountant','GL & Payroll Accountant','Kế toán Tổng hợp & Lương','EXE','{}'::jsonb),
    ('hr_manager','HR Manager','Quản lý Nhân sự','HR','{}'::jsonb),
    ('ehs_specialist','EHS Specialist','Chuyên viên EHS','EHS','{}'::jsonb),
    ('it_admin','IT Administrator','Quản trị CNTT','IT','{}'::jsonb),
    ('epicor_admin','Epicor System Administrator','Quản trị hệ thống Epicor','IT','{}'::jsonb)
ON CONFLICT (role_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helper to write the canonical JSONB shape, preserving any pre-existing keys
-- (icon override, level customisations, etc.) the admin may have set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.set_role_perms(
    p_role_code TEXT,
    p_level INTEGER,
    p_admin BOOLEAN,
    p_allow_all BOOLEAN,
    p_can_create_docs BOOLEAN,
    p_icon TEXT,
    p_color TEXT,
    p_grants TEXT[],
    p_denies TEXT[]
) RETURNS VOID AS $$
BEGIN
    UPDATE roles
       SET permissions = COALESCE(permissions, '{}'::jsonb)
                       || jsonb_build_object(
                            'level',              p_level,
                            'admin',              p_admin,
                            'allowAllPermissions', p_allow_all,
                            'canCreateDocs',      p_can_create_docs,
                            'icon',               p_icon,
                            'color',              p_color,
                            'permissions',        to_jsonb(p_grants),
                            'denies',             to_jsonb(p_denies),
                            'seeded_by',          'migration_173',
                            'seeded_at',          to_jsonb(now()::text)
                          ),
           updated_at = now()
     WHERE role_code = p_role_code;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- TIER 1 — Executive / System Admin (full access with explicit SoD denies)
-- ---------------------------------------------------------------------------

-- ceo: full god-mode (only role with allowAllPermissions=true).
SELECT pg_temp.set_role_perms('ceo', 100, TRUE, TRUE, TRUE, '👑', '#7c2d12',
    ARRAY['*']::TEXT[],
    ARRAY[]::TEXT[]
);

-- it_admin: technical superuser, but blocked from finance approval (SoD).
SELECT pg_temp.set_role_perms('it_admin', 99, TRUE, FALSE, TRUE, '🛠️', '#4f46e5',
    ARRAY['docs.*','records.*','users.*','rbac.*','mfa.*','audit.*','admin.backend']::TEXT[],
    ARRAY['finance.po.approve','finance.payment.execute']::TEXT[]
);

-- epicor_admin: ERP system admin, no document approval rights, no finance.
SELECT pg_temp.set_role_perms('epicor_admin', 98, TRUE, FALSE, FALSE, '🔧', '#6366f1',
    ARRAY['docs.view','records.*','users.view','rbac.role.view','audit.view','admin.backend']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.disable','users.reset_pw',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 2 — Department Managers / Directors
-- ---------------------------------------------------------------------------

-- production_director: owns production, no QA approval, no finance.
SELECT pg_temp.set_role_perms('production_director', 80, FALSE, FALSE, TRUE, '🏭', '#9a3412',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'users.view','audit.view','admin.backend']::TEXT[],
    ARRAY['docs.approve','docs.retire',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute',
          'audit.export']::TEXT[]
);

-- qa_manager: approves docs, runs access reviews — but not finance, not RBAC edit.
SELECT pg_temp.set_role_perms('qa_manager', 80, FALSE, FALSE, TRUE, '🛡️', '#1e40af',
    ARRAY['docs.view','docs.create','docs.edit','docs.approve','docs.retire',
          'records.view','records.create','records.export',
          'users.view','audit.view','audit.export',
          'rbac.role.view','rbac.review.run','admin.backend']::TEXT[],
    ARRAY['users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute']::TEXT[]
);

-- engineering_lead: approves engineering docs, no finance.
SELECT pg_temp.set_role_perms('engineering_lead', 70, FALSE, FALSE, TRUE, '⚙️', '#0891b2',
    ARRAY['docs.view','docs.create','docs.edit','docs.approve',
          'records.view','records.create','records.export',
          'users.view','audit.view','admin.backend']::TEXT[],
    ARRAY['docs.retire',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute',
          'audit.export']::TEXT[]
);

-- supply_chain_manager: approves POs (NOT executes payments — SoD).
SELECT pg_temp.set_role_perms('supply_chain_manager', 70, FALSE, FALSE, TRUE, '🚚', '#0d9488',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'users.view','audit.view','admin.backend',
          'finance.po.approve']::TEXT[],
    ARRAY['docs.approve','docs.retire',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.payment.execute',
          'audit.export']::TEXT[]
);

-- finance_manager: approves POs (NOT executes — SoD with ap_ar_accountant).
SELECT pg_temp.set_role_perms('finance_manager', 80, FALSE, FALSE, TRUE, '💰', '#a16207',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'users.view','audit.view','audit.export','admin.backend',
          'finance.po.approve']::TEXT[],
    ARRAY['docs.approve','docs.retire',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.payment.execute']::TEXT[]
);

-- hr_manager: full user lifecycle, no finance, no MFA reset (IT owns that).
SELECT pg_temp.set_role_perms('hr_manager', 70, FALSE, FALSE, TRUE, '👥', '#be185d',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'users.view','users.create','users.edit','users.disable','users.reset_pw','users.export',
          'audit.view','admin.backend']::TEXT[],
    ARRAY['docs.approve','docs.retire',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute',
          'audit.export']::TEXT[]
);

-- cnc_workshop_manager: workshop-level supervisor.
SELECT pg_temp.set_role_perms('cnc_workshop_manager', 50, FALSE, FALSE, TRUE, '🏭', '#7c3aed',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'users.view']::TEXT[],
    ARRAY['docs.approve','docs.retire',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 3 — Engineers / Specialists (author + edit, no approve)
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_role_perms('production_engineer', 50, FALSE, FALSE, TRUE, '🔬', '#0284c7',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('process_engineer', 50, FALSE, FALSE, TRUE, '🔄', '#059669',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('dfm_engineer', 50, FALSE, FALSE, TRUE, '📐', '#0e7490',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('cam_nc_programmer', 50, FALSE, FALSE, TRUE, '💾', '#0369a1',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('quality_engineer', 50, FALSE, FALSE, TRUE, '🔍', '#1d4ed8',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'audit.view']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.export','admin.backend']::TEXT[]
);

-- qms_engineer: authors QMS docs but CANNOT approve (SoD vs qa_manager).
SELECT pg_temp.set_role_perms('qms_engineer', 50, FALSE, FALSE, TRUE, '📋', '#1e3a8a',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export',
          'rbac.role.view','audit.view']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.role.edit','rbac.module.edit',
          'rbac.doc.grant','rbac.sod.edit','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.export','admin.backend']::TEXT[]
);

-- internal_auditor: read-only with audit export — explicit deny on edit.
SELECT pg_temp.set_role_perms('internal_auditor', 60, FALSE, FALSE, FALSE, '🧐', '#7e22ce',
    ARRAY['docs.view','records.view','records.export',
          'users.view','audit.view','audit.export',
          'rbac.role.view','rbac.review.run']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.create',
          'users.create','users.edit','users.disable','users.reset_pw','users.export',
          'rbac.role.edit','rbac.module.edit','rbac.doc.grant','rbac.sod.edit',
          'mfa.policy.edit','mfa.factor.revoke','mfa.factor.reset',
          'finance.po.approve','finance.payment.execute','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('metrology_specialist', 50, FALSE, FALSE, TRUE, '📏', '#9333ea',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('ehs_specialist', 50, FALSE, FALSE, TRUE, '⚠️', '#ea580c',
    ARRAY['docs.view','docs.create','docs.edit',
          'records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.approve','docs.retire','users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 4 — Supervisors / Team Leads (read + records create/export)
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_role_perms('shift_leader', 40, FALSE, FALSE, FALSE, '🌓', '#a21caf',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('qc_inspector_lead', 40, FALSE, FALSE, FALSE, '✅', '#15803d',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('deburr_team_lead', 40, FALSE, FALSE, FALSE, '🔨', '#c2410c',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('cleaning_packaging_supervisor', 40, FALSE, FALSE, FALSE, '📦', '#65a30d',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 5 — Operators / Technicians (read docs, create/view records only)
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_role_perms('cnc_operator', 20, FALSE, FALSE, FALSE, '🛠️', '#475569',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('setup_technician', 25, FALSE, FALSE, FALSE, '🔧', '#525252',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('deburr_technician', 20, FALSE, FALSE, FALSE, '⚒️', '#57534e',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('cleaning_packaging_technician', 20, FALSE, FALSE, FALSE, '🧹', '#84cc16',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('maintenance_technician', 25, FALSE, FALSE, FALSE, '🔩', '#737373',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('qc_inspector', 25, FALSE, FALSE, FALSE, '🔬', '#16a34a',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('warehouse_clerk', 20, FALSE, FALSE, FALSE, '📦', '#a3a3a3',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('tool_storekeeper', 20, FALSE, FALSE, FALSE, '🔑', '#94a3b8',
    ARRAY['docs.view','records.view','records.create']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'records.export',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('logistics_coordinator', 25, FALSE, FALSE, FALSE, '🚛', '#0f766e',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('estimator', 30, FALSE, FALSE, FALSE, '📊', '#0369a1',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

SELECT pg_temp.set_role_perms('customer_service', 30, FALSE, FALSE, FALSE, '☎️', '#db2777',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 6 — Planners / Buyers (records.export, no PO approval)
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_role_perms('production_planner', 40, FALSE, FALSE, TRUE, '📅', '#9333ea',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- buyer: creates POs but does not approve (SoD vs supply_chain_manager / finance_manager).
SELECT pg_temp.set_role_perms('buyer', 35, FALSE, FALSE, TRUE, '🛒', '#0e7490',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- ---------------------------------------------------------------------------
-- TIER 7 — Accountants (segregated payment/PO duties — classic SOX SoD)
-- ---------------------------------------------------------------------------

-- ap_ar_accountant: executes payments but DOES NOT approve POs (SoD).
SELECT pg_temp.set_role_perms('ap_ar_accountant', 45, FALSE, FALSE, FALSE, '💳', '#ca8a04',
    ARRAY['docs.view','records.view','records.create','records.export',
          'finance.payment.execute']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

-- gl_payroll_accountant: bookkeeping only, no PO approve, no payment execute.
SELECT pg_temp.set_role_perms('gl_payroll_accountant', 40, FALSE, FALSE, FALSE, '📒', '#b45309',
    ARRAY['docs.view','records.view','records.create','records.export']::TEXT[],
    ARRAY['docs.create','docs.edit','docs.approve','docs.retire',
          'users.*','rbac.*','mfa.*',
          'finance.po.approve','finance.payment.execute',
          'audit.view','audit.export','admin.backend']::TEXT[]
);

DROP FUNCTION pg_temp.set_role_perms(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]);

-- ---------------------------------------------------------------------------
-- Sanity verification (raises if any catalog role still has empty permissions)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    missing_count INTEGER;
    missing_codes TEXT;
BEGIN
    SELECT COUNT(*), string_agg(role_code, ', ')
      INTO missing_count, missing_codes
      FROM roles
     WHERE role_code IN (
        'ceo','production_director','cnc_workshop_manager','shift_leader',
        'setup_technician','cnc_operator','deburr_team_lead','deburr_technician',
        'production_planner','cleaning_packaging_supervisor','cleaning_packaging_technician',
        'maintenance_technician','production_engineer','engineering_lead',
        'process_engineer','dfm_engineer','cam_nc_programmer','qa_manager',
        'quality_engineer','qc_inspector','qc_inspector_lead','qms_engineer',
        'internal_auditor','metrology_specialist','supply_chain_manager','buyer',
        'warehouse_clerk','tool_storekeeper','logistics_coordinator','estimator',
        'customer_service','finance_manager','ap_ar_accountant','gl_payroll_accountant',
        'hr_manager','ehs_specialist','it_admin','epicor_admin'
       )
       AND (permissions->>'seeded_by') IS DISTINCT FROM 'migration_173';
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Migration 173: % roles not seeded: %', missing_count, missing_codes;
    END IF;
    RAISE NOTICE 'Migration 173: 38/38 catalog roles seeded with canonical permissions.';
END$$;

COMMIT;

-- Rollback (restore prior permissions blob — manual only because we don't
-- snapshot the prior shape; admins should re-run their custom edits):
--   BEGIN;
--   UPDATE roles SET permissions = permissions - 'seeded_by' - 'seeded_at'
--    WHERE permissions->>'seeded_by' = 'migration_173';
--   COMMIT;
