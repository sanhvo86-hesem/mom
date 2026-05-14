-- ============================================================================
-- Migration 180: Restore employees identity columns (rollback of 179)
-- ============================================================================
--
-- Migration 179 dropped `employees.employee_name / role_code / role_label`
-- but the schema-authority registry deeply tracks those columns in:
--   - mom/data/registry/table-columns.json
--   - mom/data/registry/data-fields-part1.json
--   - mom/data/registry/data-fields-part2.json
--   - mom/data/registry/domain-field-packs.json
--   - mom/data/registry/endpoint-catalog.json
--   - mom/data/registry/relation-map.json
--   - mom/data/registry/system-contract-runtime-projections.json
--
-- Updating all of these requires running canonical_publication_orchestrator.py
-- which currently fails in our environment. Rather than ship a registry in
-- an inconsistent state, this migration restores the three columns so the
-- live DB matches the registry authority once again. The SSOT enforcement
-- comes from the OTHER artifacts of this cleanup pass:
--
--   1. .ai/USER_IDENTITY_SSOT.md — authoritative policy
--   2. mom/tools/release/check_user_identity_ssot.php — CI guard (active)
--   3. v_user_canonical view (migration 178) — canonical read source
--   4. trg_employees_role_drift_audit (re-installed below) — drift detector
--   5. Default-role SSOT constant DEFAULT_NEW_USER_ROLE
--   6. The 6 reconciled drift users (canh.nguyen, duyen.doan, quan.tran,
--      thi.le, tu.vu, vinh.do) — drift count remains 0.
--
-- Column drop is deferred until the registry authority cycle can be run
-- cleanly. AuthUserShadowSyncService::syncUser() is restored to write the
-- three columns from the same source the view derives from, so values
-- stay synchronized.
-- ============================================================================

BEGIN;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS role_code     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS role_label    VARCHAR(150);

-- Backfill from the canonical view so the restored columns are consistent
-- with the SSOT immediately, not stale.
UPDATE employees e
   SET employee_name = v.full_name,
       role_code     = v.role_code,
       role_label    = v.role_label
  FROM v_user_canonical v
 WHERE v.user_id = e.user_id;

-- The pre-179 schema had employee_name NOT NULL. Re-impose it once all
-- backfilled rows are filled, but tolerate the (small) operator-only rows
-- that have no users counterpart by giving them a placeholder. Migration
-- 179 surfaced 4 such rows (OPR-001, OPR-014, QC-002, MNT-001) in
-- check_user_identity_drift(); these are non-portal MES operators.
UPDATE employees
   SET employee_name = 'Operator ' || employee_id
 WHERE employee_name IS NULL;

ALTER TABLE employees
    ALTER COLUMN employee_name SET NOT NULL;

-- Restore the drift-detection trigger that 179 dropped — it remains useful.
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
            jsonb_build_object('source', 'fn_employees_role_drift_audit', 'migration', '180'),
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

-- Restore the check_user_identity_drift function to its original signature
-- (matches migration 178 form so we don't keep flipping the contract).
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

COMMIT;
