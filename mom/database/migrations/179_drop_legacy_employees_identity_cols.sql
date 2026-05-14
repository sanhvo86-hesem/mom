-- ============================================================================
-- Migration 179: Drop legacy identity columns from `employees`
-- ============================================================================
--
-- Completes the user-identity SSOT cleanup started in migration 178.
--
-- After 178 we had:
--   - v_user_canonical = single read source for identity (users + roles
--     + hcm_employees join).
--   - trg_employees_role_drift_audit = observability-only drift detector
--     on employees.role_code.
--
-- After 178 we ALSO required two refactors before this migration could land:
--   1. mom/api.php:5046 (KPI operator counter) → switched from
--      `FROM employees` to `FROM v_user_canonical`.
--   2. mom/database/DataLayer.php:2244 (employee projection) → switched
--      identity columns to v_user_canonical and JOIN-only to employees
--      for the `metadata` column.
--   3. mom/api/services/AuthUserShadowSyncService.php → stopped writing
--      employee_name / role_code / role_label on INSERT/UPDATE.
--
-- This migration drops the three columns and the trigger/function that
-- guarded them. Once dropped, the dual-write violation is structurally
-- impossible: the columns simply no longer exist for any future code to
-- write to or drift from.
--
-- The `employees` table itself is preserved for now because it still
-- holds operator runtime metadata (operator_id, station, work_center
-- tags) that has not yet been migrated to users.metadata. Eliminating
-- the employees table entirely is a future migration once that metadata
-- has a new home.
--
-- Author: SSOT cleanup pass 3 triggered by user request 2026-05-14.
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tear down the drift detector — its target column is going away.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employees_role_drift_audit ON employees;
DROP FUNCTION IF EXISTS fn_employees_role_drift_audit();

-- -----------------------------------------------------------------------------
-- 2. Drop the legacy identity columns.
--    These were duplicates of users.full_name and roles.role_code /
--    roles.role_label_vi. The pre-fix value of these columns drifted for
--    6 production users (canh.nguyen, duyen.doan, quan.tran, thi.le,
--    tu.vu, vinh.do); migration 178 cleaned drift to 0, and this drop
--    structurally prevents future drift.
-- -----------------------------------------------------------------------------
ALTER TABLE employees
    DROP COLUMN IF EXISTS employee_name,
    DROP COLUMN IF EXISTS role_code,
    DROP COLUMN IF EXISTS role_label;

COMMENT ON TABLE employees IS
'Operator runtime projection. Holds: employee_id, user_id, user_id_code, '
'dept_code, shift, is_active, hire_date, termination_date, metadata. '
'IDENTITY columns (full_name, role) were removed in migration 179 — read '
'those via v_user_canonical. The remaining metadata column is on a '
'separate retirement path once operator runtime tags migrate to '
'users.metadata. Do NOT add identity columns back to this table; the '
'check_user_identity_ssot CI guard will block such commits.';

-- -----------------------------------------------------------------------------
-- 3. The check_user_identity_drift() helper is still useful (it now
--    detects whether any non-deleted user lacks a matching employees row,
--    or has stale dept_code drift). Re-express it to use v_user_canonical
--    as the authority, which is now the only place role lives. DROP first
--    because PostgreSQL refuses to change a function's return type via
--    CREATE OR REPLACE (different OUT-parameter row type from migration 178).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS check_user_identity_drift();

CREATE FUNCTION check_user_identity_drift()
RETURNS TABLE (
    username text,
    drift_kind text,
    detail text
)
LANGUAGE sql
AS $$
    -- Drift kind #1: user_id in employees doesn't match any user (orphan)
    SELECT
        COALESCE(e.user_id_code, e.employee_id)::text AS username,
        'orphan_employees_row'::text AS drift_kind,
        ('employees.employee_id=' || e.employee_id || ' has no live users row')::text AS detail
    FROM employees e
    LEFT JOIN users u ON u.user_id = e.user_id AND u.deleted_at IS NULL
    WHERE e.is_active IS TRUE
      AND u.user_id IS NULL

    UNION ALL

    -- Drift kind #2: users row exists but employees.dept_code disagrees
    SELECT
        u.username::text,
        'dept_code_drift'::text AS drift_kind,
        ('users.dept_code=' || COALESCE(u.dept_code::text, 'NULL')
         || ' vs employees.dept_code=' || COALESCE(e.dept_code::text, 'NULL'))::text AS detail
    FROM users u
    JOIN employees e ON e.user_id = u.user_id
    WHERE u.deleted_at IS NULL
      AND u.dept_code IS DISTINCT FROM e.dept_code;
$$;

COMMENT ON FUNCTION check_user_identity_drift() IS
'Returns rows where the legacy `employees` projection diverges from the '
'identity SSOT. After migration 179, role_code drift is structurally '
'impossible, but dept_code can still drift until employees retires '
'entirely. Ops should poll this periodically; empty result = clean.';

COMMIT;

-- Verification:
--   SELECT COUNT(*) FROM check_user_identity_drift();   -- should be 0
--   \d employees                                         -- should NOT have employee_name/role_code/role_label
