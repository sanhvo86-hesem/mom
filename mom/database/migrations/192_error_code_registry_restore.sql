-- ============================================================================
-- Migration 192: Error Code Registry — restore the missing migration file
-- ============================================================================
-- Purpose:
--   The error_code_registry table exists on the live DB (created by an earlier
--   migration named 188_error_code_registry which has been lost from the
--   repo). 33 production rows depend on it. The deploy gate flagged the
--   table as "unmanaged" until commit 7ef9fdc4 registered it in
--   table-registry.json — but the migration file itself was still missing,
--   so a fresh-install path (developer mac, staging) could not create the
--   table.
--
--   This migration restores the schema declaration verbatim from the live
--   DB so any clean clone of the repo can stand up the same shape. The
--   live DB row (188_error_code_registry) remains in schema_migrations as
--   the historical applied marker; this 192 file simply re-asserts the
--   structure idempotently (CREATE TABLE IF NOT EXISTS / ALTER … IF NOT
--   EXISTS / INSERT ON CONFLICT DO NOTHING) so:
--
--     • On the live VPS (table already present): runner records this row
--       in schema_migrations, no DDL actually runs, 33 existing rows
--       remain untouched.
--     • On a fresh dev DB: table is created with the correct shape and
--       seeded with the 6 canonical USR-/AUTH- codes the modules call
--       /api/v1/error-codes/{code} for.
--
-- Bilingual error catalogue
-- ─────────────────────────
--   Every module under mom/api/controllers fetches user-facing error
--   messages by calling GET /api/v1/error-codes/{code}. That endpoint
--   reads from this table — so the row schema needs to stay in lock-step
--   with what ErrorCodeRegistryController returns. Adding a new field
--   here requires a parallel update to the controller's projection.
--
-- Standards: ISO 9001 §7.5.3 (control of documented information),
-- ISO 27001 A.12.4 (logging — error messages are operator-visible),
-- 21 CFR Part 11 §11.10 (audit trail — every active code's mutation is
-- logged via audit_events).
-- Date: 2026-05-20
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS error_code_registry (
    code            VARCHAR(30)  PRIMARY KEY,
    domain          VARCHAR(30)  NOT NULL,
    http_status     SMALLINT     NOT NULL DEFAULT 400,
    title_vi        VARCHAR(200) NOT NULL,
    title_en        VARCHAR(200),
    description_vi  TEXT,
    hint_vi         VARCHAR(500),
    severity        VARCHAR(20)  NOT NULL DEFAULT 'error',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT error_code_registry_severity_check
        CHECK (severity IN ('error', 'warning', 'info'))
);

CREATE INDEX IF NOT EXISTS idx_ecr_active
    ON error_code_registry (is_active)
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ecr_domain
    ON error_code_registry (domain);

COMMENT ON TABLE error_code_registry
    IS 'Bilingual error code catalogue. Every API controller fetches user-facing error messages by code from this table; admin manages entries in the IAM Console Error Codes tab.';
COMMENT ON COLUMN error_code_registry.code
    IS 'Stable machine identifier of the form DOMAIN-NNN (e.g. USR-001, AUTH-002). Never re-used after retirement.';
COMMENT ON COLUMN error_code_registry.severity
    IS 'error / warning / info — drives UI tone (toast colour, dismissibility).';
COMMENT ON COLUMN error_code_registry.is_active
    IS 'When FALSE the code is retained for audit but no longer surfaced to API callers; lookups return 410 Gone.';

-- Touch trigger so updated_at auto-refreshes.
DROP TRIGGER IF EXISTS trg_error_code_registry_touch ON error_code_registry;
CREATE TRIGGER trg_error_code_registry_touch
    BEFORE UPDATE ON error_code_registry
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

-- Seed the canonical codes a fresh dev clone needs to render login + admin
-- screens without errors. Production already has 33 rows including these
-- six and 27 more; ON CONFLICT keeps them intact.
INSERT INTO error_code_registry (code, domain, http_status, title_vi, title_en, description_vi, hint_vi, severity) VALUES
  ('USR-001', 'user',   400, 'Thiếu tên tài khoản',                  'Missing username',         'Yêu cầu chưa kèm tên tài khoản cần thiết.',          'Hãy nhập tên tài khoản trước khi gửi.',                       'warning'),
  ('USR-002', 'user',   400, 'Tên tài khoản không hợp lệ',           'Invalid username',         'Tên tài khoản chứa ký tự không cho phép.',           'Chỉ dùng chữ cái, chữ số, dấu chấm và gạch dưới.',           'warning'),
  ('USR-003', 'user',   404, 'Không tìm thấy người dùng',            'User not found',           'Tên tài khoản không tồn tại trong hệ thống.',         'Kiểm tra lại tên tài khoản hoặc nhờ admin tạo mới.',          'warning'),
  ('AUTH-001','auth',   401, 'Phiên đăng nhập đã hết hạn',           'Session expired',          'Token phiên đã quá hạn hoặc bị thu hồi.',            'Đăng nhập lại để tiếp tục.',                                  'warning'),
  ('AUTH-002','auth',   403, 'Không đủ quyền truy cập',              'Forbidden',                'Vai trò hiện tại không có quyền thực hiện thao tác.', 'Liên hệ admin nếu bạn cần quyền này.',                         'error'),
  ('SYS-001', 'system', 500, 'Lỗi máy chủ',                          'Internal server error',    'Lỗi không lường trước trên máy chủ.',                'Thử lại sau ít phút; báo admin nếu lỗi lặp lại.',             'error')
ON CONFLICT (code) DO NOTHING;

COMMIT;
