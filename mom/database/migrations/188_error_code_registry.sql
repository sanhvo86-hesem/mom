-- ============================================================================
-- Migration 188: Error Code Registry — HISTORICAL RESTORATION
-- ============================================================================
-- Purpose
--   The original 188_error_code_registry.sql was deleted from the repo at an
--   unknown earlier commit, but the row 188_error_code_registry remained in
--   schema_migrations on the live VPS along with 33 production rows in
--   error_code_registry. Migration 192_error_code_registry_restore.sql was
--   added later as a forensic recovery so the schema could be recreated on
--   fresh clones, but it does NOT re-register at the 188 spot. As a result
--   the new check_migration_drift.php tool flagged 188 as a "ghost migration"
--   (DB applied + file missing).
--
--   This file closes the gap by restoring an idempotent CREATE-IF-NOT-EXISTS
--   declaration AT THE 188 NUMBER. On the live VPS (table already present,
--   188_error_code_registry already in schema_migrations) the runner records
--   this file as applied without re-running its DDL. On a fresh dev clone
--   the runner applies 188 first (creates table + seeds 6 canonical codes),
--   then 192 sees the table already exists and is a true no-op.
--
--   Content is intentionally identical to 192 so the historical "what the
--   188 file probably contained" question is moot — both files now describe
--   the same final shape, idempotently.
--
-- Standards: ISO 9001 §7.5.3 (control of documented information),
--            ISO 27001 A.12.4 (logging),
--            21 CFR Part 11 §11.10 (audit trail)
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

-- Touch trigger so updated_at auto-refreshes. The trigger function is created
-- by an earlier migration (095_touch_function).
DROP TRIGGER IF EXISTS trg_error_code_registry_touch ON error_code_registry;
CREATE TRIGGER trg_error_code_registry_touch
    BEFORE UPDATE ON error_code_registry
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

-- Seed canonical codes a fresh dev clone needs for login + admin screens.
-- Production already has 33 rows including these six; ON CONFLICT keeps them
-- intact regardless of whether 188 or 192 runs first.
INSERT INTO error_code_registry (code, domain, http_status, title_vi, title_en, description_vi, hint_vi, severity) VALUES
  ('USR-001', 'user',   400, 'Thiếu tên tài khoản',                  'Missing username',         'Yêu cầu chưa kèm tên tài khoản cần thiết.',          'Hãy nhập tên tài khoản trước khi gửi.',                       'warning'),
  ('USR-002', 'user',   400, 'Tên tài khoản không hợp lệ',           'Invalid username',         'Tên tài khoản chứa ký tự không cho phép.',           'Chỉ dùng chữ cái, chữ số, dấu chấm và gạch dưới.',           'warning'),
  ('USR-003', 'user',   404, 'Không tìm thấy người dùng',            'User not found',           'Tên tài khoản không tồn tại trong hệ thống.',         'Kiểm tra lại tên tài khoản hoặc nhờ admin tạo mới.',          'warning'),
  ('AUTH-001','auth',   401, 'Phiên đăng nhập đã hết hạn',           'Session expired',          'Token phiên đã quá hạn hoặc bị thu hồi.',            'Đăng nhập lại để tiếp tục.',                                  'warning'),
  ('AUTH-002','auth',   403, 'Không đủ quyền truy cập',              'Forbidden',                'Vai trò hiện tại không có quyền thực hiện thao tác.', 'Liên hệ admin nếu bạn cần quyền này.',                         'error'),
  ('SYS-001', 'system', 500, 'Lỗi máy chủ',                          'Internal server error',    'Lỗi không lường trước trên máy chủ.',                'Thử lại sau ít phút; báo admin nếu lỗi lặp lại.',             'error')
ON CONFLICT (code) DO NOTHING;

COMMIT;
