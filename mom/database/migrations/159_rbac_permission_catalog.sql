-- ============================================================================
-- Migration 159: permission_catalog — atomic permission codes (RBAC catalogue)
-- ----------------------------------------------------------------------------
-- Establishes a single source of truth for every "atomic" permission code
-- the application can grant. Replaces the magic-string permissions scattered
-- across role_permissions.json + JS (canEditDocs, canCreateDocs, …) with a
-- typed, audit-grade catalogue.
--
-- Design references
--   * NIST 800-162 — ABAC: permission as (subject × action × resource)
--   * SAP S/4HANA Authorization Object — activity_code (01/02/03/06/16/…)
--   * Oracle Fusion Apps — Privilege as the smallest grant unit (Job → Duty
--     → Privilege; this table represents Privileges)
--   * NIST 800-63B — required_aal_level so dangerous permissions can demand
--     a specific Authenticator Assurance Level.
--
-- Idempotent: re-running has no effect once the table + seed exist.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS permission_catalog (
    permission_code         VARCHAR(80)     PRIMARY KEY,
    module_code             VARCHAR(50),
    activity_code           VARCHAR(20),
    label                   VARCHAR(200)    NOT NULL,
    label_vi                VARCHAR(200),
    description             TEXT,
    description_vi          TEXT,
    is_dangerous            BOOLEAN         NOT NULL DEFAULT FALSE,
    requires_reason         BOOLEAN         NOT NULL DEFAULT FALSE,
    required_aal_level      SMALLINT        NOT NULL DEFAULT 1
                            CHECK (required_aal_level BETWEEN 1 AND 3),
    sod_tags                TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    compliance_refs         TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    sort_order              INTEGER         NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
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

COMMENT ON TABLE permission_catalog IS 'RBAC atomic permission catalogue (NIST 800-162 / SAP authorization-object compatible). / Danh muc quyen nguyen tu RBAC.';
COMMENT ON COLUMN permission_catalog.activity_code IS 'SAP-style activity code: 01=create, 02=update, 03=display, 06=delete, 16=execute, 78=approve, 95=export.';
COMMENT ON COLUMN permission_catalog.required_aal_level IS 'NIST 800-63B Authenticator Assurance Level required to exercise this permission (1=password, 2=2FA, 3=hardware FIDO2).';
COMMENT ON COLUMN permission_catalog.sod_tags IS 'Free-form tags used by role_sod_conflict.check_query to flag separation-of-duties violations.';

CREATE INDEX IF NOT EXISTS idx_permission_catalog_module ON permission_catalog(module_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_permission_catalog_activity ON permission_catalog(activity_code);
CREATE INDEX IF NOT EXISTS idx_permission_catalog_dangerous ON permission_catalog(is_dangerous) WHERE is_dangerous = TRUE;

-- updated_at trigger ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_permission_catalog_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_permission_catalog_set_updated_at
            BEFORE UPDATE ON permission_catalog
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    -- set_updated_at() helper not yet present; skip silently.
    NULL;
END$$;

-- Seed: import the legacy magic-string permissions from role_permissions.json
-- into the catalogue so the importer has stable codes to map to.
INSERT INTO permission_catalog (permission_code, module_code, activity_code, label, label_vi, description, description_vi, is_dangerous, required_aal_level, sort_order)
VALUES
    ('docs.view',       'docs',    '03', 'View controlled documents',     'Xem tai lieu kiem soat',          'Read access to QMS controlled documents.',                'Quyen doc tai lieu kiem soat QMS.',                                FALSE, 1,  10),
    ('docs.create',     'docs',    '01', 'Create controlled documents',   'Tao tai lieu kiem soat',          'Author new SOP/WI/Form drafts.',                          'Soan thao SOP/WI/Form moi.',                                       FALSE, 2,  20),
    ('docs.edit',       'docs',    '02', 'Edit controlled documents',     'Sua tai lieu kiem soat',          'Edit existing controlled-document drafts.',               'Sua ban thao tai lieu kiem soat.',                                 FALSE, 2,  30),
    ('docs.approve',    'docs',    '78', 'Approve controlled documents',  'Duyet tai lieu kiem soat',        'Approve a document for release per DCC.',                 'Duyet phat hanh tai lieu theo DCC.',                               TRUE,  2,  40),
    ('docs.retire',     'docs',    '95', 'Retire / supersede documents',  'Thu hoi / thay the tai lieu',     'Retire a document version and supersede it.',             'Thu hoi/thay the phien ban tai lieu.',                             TRUE,  2,  50),
    ('records.view',    'records', '03', 'View QMS records',              'Xem ho so QMS',                   'Read FRM-* and run-time evidence records.',               'Doc ho so FRM-* va bang chung van hanh.',                          FALSE, 1, 110),
    ('records.create',  'records', '01', 'Create QMS records',            'Tao ho so QMS',                   'Submit a new FRM-* record.',                              'Tao ho so FRM-* moi.',                                             FALSE, 1, 120),
    ('records.export',  'records', '95', 'Export QMS records',            'Xuat ho so QMS',                  'Export records to Excel/CSV.',                            'Xuat ho so ra Excel/CSV.',                                         TRUE,  2, 130),
    ('users.view',      'users',   '03', 'View user roster',              'Xem danh sach nguoi dung',        'Read access to the user list.',                           'Doc danh sach nguoi dung.',                                        FALSE, 1, 210),
    ('users.create',    'users',   '01', 'Create user',                   'Tao nguoi dung',                  'Provision a new user account.',                           'Cap moi tai khoan nguoi dung.',                                    TRUE,  2, 220),
    ('users.edit',      'users',   '02', 'Edit user',                     'Sua nguoi dung',                  'Update profile, dept, role of an existing user.',         'Cap nhat ho so/phong ban/vai tro cua nguoi dung.',                 TRUE,  2, 230),
    ('users.disable',   'users',   '06', 'Disable / offboard user',       'Khoa / ngung su dung',            'Disable a user account or initiate offboarding.',         'Khoa hoac khoi tao quy trinh nghi viec cua nguoi dung.',           TRUE,  2, 240),
    ('users.reset_pw',  'users',   '02', 'Reset user password',           'Reset mat khau nguoi dung',       'Force-reset the password of another user.',               'Reset mat khau cua nguoi dung khac.',                              TRUE,  2, 250),
    ('users.export',    'users',   '95', 'Export user roster',            'Xuat danh sach nguoi dung',       'Export the user roster to Excel/CSV.',                    'Xuat danh sach nguoi dung ra Excel/CSV.',                          TRUE,  2, 260),
    ('rbac.role.view',  'rbac',    '03', 'View roles',                    'Xem vai tro',                     'Read access to the role catalogue.',                      'Doc danh muc vai tro.',                                            FALSE, 2, 310),
    ('rbac.role.edit',  'rbac',    '02', 'Edit role permissions',         'Sua quyen vai tro',               'Edit role-permission matrix.',                            'Sua ma tran phan quyen vai tro.',                                  TRUE,  2, 320),
    ('rbac.module.edit','rbac',    '02', 'Edit module permissions',       'Sua phan quyen module',           'Edit module access matrix.',                              'Sua ma tran truy cap module.',                                     TRUE,  2, 330),
    ('rbac.doc.grant',  'rbac',    '02', 'Grant document permissions',    'Cap phan quyen tai lieu',         'Grant per-doc/per-user document access.',                 'Cap phan quyen tai lieu cap nhan-tai lieu.',                       TRUE,  2, 340),
    ('rbac.sod.edit',   'rbac',    '02', 'Edit SoD matrix',               'Sua ma tran tach trach nhiem',    'Edit Separation-of-Duties conflict matrix.',              'Sua ma tran xung dot tach trach nhiem.',                           TRUE,  3, 350),
    ('rbac.review.run', 'rbac',    '16', 'Run access review campaign',    'Chay danh gia phan quyen',        'Initiate a periodic access-review attestation cycle.',    'Khoi tao chu ky danh gia phan quyen dinh ky.',                     FALSE, 2, 360),
    ('mfa.policy.edit', 'mfa',     '02', 'Edit MFA policy',               'Sua chinh sach MFA',              'Edit per-role MFA policy.',                               'Sua chinh sach MFA theo vai tro.',                                 TRUE,  3, 410),
    ('mfa.factor.revoke','mfa',    '06', 'Revoke MFA factor',             'Thu hoi yeu to MFA',              'Revoke a single MFA factor of a user.',                   'Thu hoi mot yeu to MFA cua nguoi dung.',                           TRUE,  3, 420),
    ('mfa.factor.reset','mfa',     '06', 'Reset all MFA factors',         'Reset toan bo MFA',               'Reset every MFA factor of a user (force re-enroll).',     'Reset toan bo yeu to MFA cua nguoi dung (buoc ghi danh lai).',     TRUE,  3, 430),
    ('audit.view',      'audit',   '03', 'View audit trail',              'Xem nhat ky kiem tra',            'Read access to the system audit trail.',                  'Doc nhat ky kiem tra he thong.',                                   FALSE, 2, 510),
    ('audit.export',    'audit',   '95', 'Export audit trail',            'Xuat nhat ky kiem tra',           'Export audit events for external review.',                'Xuat nhat ky kiem tra cho danh gia ben ngoai.',                    TRUE,  2, 520),
    ('admin.backend',   'system',  '16', 'Access admin backend',          'Truy cap admin backend',          'Access the admin / governance back-office area.',         'Truy cap khu vuc quan tri / governance.',                          TRUE,  2, 610),
    ('finance.po.approve','finance','78','Approve purchase order',        'Duyet don mua hang',              'Approve a PO above threshold.',                           'Duyet don mua hang vuot nguong.',                                  TRUE,  2, 710),
    ('finance.payment.execute','finance','16','Execute payment',          'Thuc hien thanh toan',            'Initiate a vendor payment transfer.',                     'Khoi tao chuyen khoan thanh toan nha cung cap.',                   TRUE,  3, 720)
ON CONFLICT (permission_code) DO NOTHING;

-- SoD seed tags so 162_role_sod_conflict can detect classic conflicts.
UPDATE permission_catalog SET sod_tags = ARRAY['create_po']        WHERE permission_code = 'docs.create' AND module_code='finance';
UPDATE permission_catalog SET sod_tags = ARRAY['approve_po']       WHERE permission_code = 'finance.po.approve';
UPDATE permission_catalog SET sod_tags = ARRAY['execute_payment']  WHERE permission_code = 'finance.payment.execute';
UPDATE permission_catalog SET sod_tags = ARRAY['author_doc']       WHERE permission_code IN ('docs.create','docs.edit');
UPDATE permission_catalog SET sod_tags = ARRAY['approve_doc']      WHERE permission_code = 'docs.approve';

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP TABLE IF EXISTS permission_catalog;
--   COMMIT;
