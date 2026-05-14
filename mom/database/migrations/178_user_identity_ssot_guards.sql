-- ============================================================================
-- Migration 178: User Identity SSOT Guards
-- ============================================================================
--
-- Closes the audited SSOT gap between `users` and `employees` tables:
--
-- Before: `employees` table stored full_name, role_code, role_label, dept_code
-- duplicated from `users` (joined via user_id). 6 users had drifted roles
-- in production (canh.nguyen, duyen.doan, quan.tran, thi.le, tu.vu, vinh.do)
-- because `AuthUserShadowSyncService::syncUser()` writes to both tables but
-- some legacy code path mutated `employees` directly, breaking the invariant
-- that `employees.role_code = roles.role_code(users.primary_role_id)`.
--
-- After:
--   1. A canonical read VIEW (`v_user_canonical`) joins users → roles →
--      hcm_employees so every consumer of "employee + user" info reads from
--      ONE place. Application code should migrate from `SELECT FROM employees`
--      to `SELECT FROM v_user_canonical`.
--
--   2. A drift-detection TRIGGER on `employees` raises a WARNING and writes
--      an audit_events row whenever `employees.role_code` is set to a value
--      that diverges from `roles.role_code(users.primary_role_id)`. This
--      surfaces future drift immediately instead of silently rotting for
--      months as happened with the 6 users above.
--
--   3. A scheduled INVARIANT CHECK function (`check_user_identity_drift()`)
--      returns the current divergence count. Can be polled by ops dashboards.
--
-- This migration is FORWARD-COMPATIBLE: it does NOT drop the duplicated
-- columns from `employees` (would break `mom/api.php:5046` operator counter
-- and `mom/database/DataLayer.php:2244` employee projection). The column
-- drop is left as a future migration once those readers are rewritten to
-- use the canonical view.
--
-- Author: SSOT cleanup pass triggered by user request 2026-05-14.
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Canonical read VIEW for user identity
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_canonical AS
SELECT
    u.user_id,
    u.employee_id,
    u.username,
    u.email,
    u.full_name,
    u.full_name_vi,
    u.dept_code,
    r.role_code            AS role_code,
    r.role_label_vi        AS role_label,
    u.status               AS user_status,
    u.mfa_enabled,
    u.shift,
    u.portal_language,
    u.last_login_at,
    he.hcm_position_id,
    he.hcm_org_unit_id,
    he.employment_status,
    he.hire_type,
    he.payroll_group,
    he.labor_grade,
    u.row_version,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN roles r          ON r.role_id     = u.primary_role_id
LEFT JOIN hcm_employees he ON he.employee_id = u.employee_id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW v_user_canonical IS
'Canonical read source for combined user + hcm employment data. Joins users '
'(write-primary identity, synced from mom/data/config/users.json) with roles '
'(RBAC SSOT per migration 173) and hcm_employees (HR-specific fields only, '
'no identity duplication). New application code MUST read from this view '
'instead of joining users + employees manually.';

-- -----------------------------------------------------------------------------
-- 2. Drift-detection TRIGGER on employees
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_employees_role_drift_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_authoritative_role text;
BEGIN
    -- Find the authoritative role for this user via users.primary_role_id → roles.role_code
    SELECT r.role_code
      INTO v_authoritative_role
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.primary_role_id
     WHERE u.user_id = NEW.user_id
       AND u.deleted_at IS NULL;

    -- No matching active user → can't compare, allow the write (FK enforces existence)
    IF v_authoritative_role IS NULL THEN
        RETURN NEW;
    END IF;

    -- Drift detected: NEW.role_code disagrees with users.primary_role_id resolution
    IF NEW.role_code IS DISTINCT FROM v_authoritative_role THEN
        -- Write an audit_events row so the drift is observable in oncall dashboards
        INSERT INTO audit_events (
            event_type,
            aggregate_type,
            aggregate_id,
            payload,
            metadata,
            recorded_at
        ) VALUES (
            'employees_role_drift_detected',
            'employee',
            NEW.employee_id,
            jsonb_build_object(
                'employee_id', NEW.employee_id,
                'user_id', NEW.user_id,
                'attempted_role_code', NEW.role_code,
                'authoritative_role_code', v_authoritative_role,
                'operation', TG_OP
            ),
            jsonb_build_object(
                'source', 'fn_employees_role_drift_audit',
                'migration', '178'
            ),
            NOW()
        );

        -- Emit a server-log warning so the next deploy run / oncall sees it
        RAISE WARNING
            'employees role drift on employee_id=% — attempted=% authoritative=% (via users.primary_role_id)',
            NEW.employee_id, NEW.role_code, v_authoritative_role;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_role_drift_audit ON employees;
CREATE TRIGGER trg_employees_role_drift_audit
AFTER INSERT OR UPDATE OF role_code ON employees
FOR EACH ROW
EXECUTE FUNCTION fn_employees_role_drift_audit();

COMMENT ON FUNCTION fn_employees_role_drift_audit() IS
'Triggered AFTER INSERT/UPDATE of employees.role_code. If the new value '
'disagrees with users.primary_role_id → roles.role_code, writes an '
'audit_events row (event_type=employees_role_drift_detected) and emits a '
'server WARNING. Does NOT block the write — observability only — so we '
'can surface drift without breaking the AuthUserShadowSyncService write path.';

-- -----------------------------------------------------------------------------
-- 3. Invariant-check helper for ops polling
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_user_identity_drift()
RETURNS TABLE (
    username text,
    authoritative_role text,
    drifted_employees_role text
)
LANGUAGE sql
AS $$
    SELECT
        u.username::text,
        r.role_code::text  AS authoritative_role,
        e.role_code::text  AS drifted_employees_role
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.user_id
    LEFT JOIN roles r     ON r.role_id  = u.primary_role_id
    WHERE u.deleted_at IS NULL
      AND r.role_code IS DISTINCT FROM e.role_code
    ORDER BY u.username;
$$;

COMMENT ON FUNCTION check_user_identity_drift() IS
'Returns current drift between employees.role_code and the authoritative '
'role derived from users.primary_role_id. Empty result = clean state. Ops '
'can poll this from a Grafana/health endpoint to alert on drift.';

COMMIT;

-- Verification (run after migration applies):
--   SELECT COUNT(*) FROM check_user_identity_drift();  -- should be 0
--   SELECT * FROM v_user_canonical LIMIT 3;
