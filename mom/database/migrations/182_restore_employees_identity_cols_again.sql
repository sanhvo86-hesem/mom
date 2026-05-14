-- ============================================================================
-- Migration 182: Restore employees identity cols (rollback of 181, attempt 2)
-- ============================================================================
--
-- This is the SECOND time we've attempted to drop employees.employee_name /
-- role_code / role_label and the SECOND time we've had to roll back.
-- Migrations 179→180 was the first cycle. 181→182 is the second.
--
-- Root cause this time: mom/tools/registry/generate-table-architecture.mjs
-- parses migration SQL but does NOT honor `ALTER TABLE DROP COLUMN`
-- statements. The parser only sees the original `CREATE TABLE` from
-- migration 002_core_system.sql and emits a 28-column employees in
-- mom/data/registry/table-registry.json. The live DB has 25 columns
-- after migration 181. DataSchemaService.buildConnectionSummary then
-- flags employees as a structural drift (28-col registry vs 25-col DB),
-- and deploy.sh's smoke check fails.
--
-- Fixing this for real requires enhancing generate-table-architecture.mjs
-- to apply ALTER TABLE DROP COLUMN / ADD COLUMN / ALTER COLUMN TYPE
-- statements during migration replay so the parsed schema reflects the
-- final state, not just the initial CREATE TABLE state. That's a
-- meaningful parser change tracked in .ai/USER_IDENTITY_FUTURE_STACK.md
-- as Phase 4 prerequisite.
--
-- Until then we leave the columns physically present but enforce SSOT
-- through:
--   1. AuthUserShadowSyncService is the only legal writer (CI guard
--      blocks alternative writers).
--   2. trg_employees_role_drift_audit (re-installed below) raises
--      audit_events on any divergence between employees.role_code and
--      users.primary_role_id → roles.role_code.
--   3. v_user_canonical is the documented read source; new code must
--      not JOIN users + employees manually.
--   4. check_user_identity_drift() returns the current divergence count.
--
-- This is functionally equivalent to migration 180. Names are different
-- so schema_migrations tracks them as separate operations and the
-- registry history is preserved.
-- ============================================================================

BEGIN;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS role_code     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS role_label    VARCHAR(150);

-- Backfill from canonical view so restored columns are consistent.
UPDATE employees e
   SET employee_name = v.full_name,
       role_code     = v.role_code,
       role_label    = v.role_label
  FROM v_user_canonical v
 WHERE v.user_id = e.user_id
   AND (e.employee_name IS NULL OR e.role_code IS NULL OR e.role_label IS NULL);

-- Operator-only rows with no users counterpart need a placeholder so the
-- NOT NULL constraint on employee_name can be re-imposed.
UPDATE employees
   SET employee_name = 'Operator ' || employee_id
 WHERE employee_name IS NULL;

ALTER TABLE employees
    ALTER COLUMN employee_name SET NOT NULL;

-- Re-install drift-detection trigger.
CREATE OR REPLACE FUNCTION fn_employees_role_drift_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_authoritative_role text;
BEGIN
    SELECT r.role_code
      INTO v_authoritative_role
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.primary_role_id
     WHERE u.user_id = NEW.user_id
       AND u.deleted_at IS NULL;

    IF v_authoritative_role IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.role_code IS DISTINCT FROM v_authoritative_role THEN
        INSERT INTO audit_events (
            event_type, aggregate_type, aggregate_id,
            payload, metadata, recorded_at
        ) VALUES (
            'employees_role_drift_detected', 'employee', NEW.employee_id,
            jsonb_build_object(
                'employee_id', NEW.employee_id,
                'user_id', NEW.user_id,
                'attempted_role_code', NEW.role_code,
                'authoritative_role_code', v_authoritative_role,
                'operation', TG_OP
            ),
            jsonb_build_object('source', 'fn_employees_role_drift_audit', 'migration', '182'),
            NOW()
        );

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

-- Restore the migration-178 shape of check_user_identity_drift so the
-- function signature stays consistent with the public contract.
DROP FUNCTION IF EXISTS check_user_identity_drift();

CREATE FUNCTION check_user_identity_drift()
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

COMMENT ON TABLE employees IS
'Employee runtime projection. Identity columns are dual-written from '
'users by AuthUserShadowSyncService; read via v_user_canonical. The '
'physical column drop attempted by migrations 179 and 181 was rolled '
'back via 180 and this migration respectively, because '
'generate-table-architecture.mjs does not honor ALTER TABLE DROP COLUMN. '
'See .ai/USER_IDENTITY_FUTURE_STACK.md Phase 4.';

COMMIT;
