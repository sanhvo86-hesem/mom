-- ============================================================================
-- Migration 181: Drop employees identity columns (final, with registry support)
-- ============================================================================
--
-- Closes the user-identity SSOT cleanup. The schema-authority generator
-- bugs that blocked the earlier attempt (migration 179) were fixed in the
-- same commit (audit_event_chain domain mapping in
-- generate-table-architecture.mjs + business_contract_bundle invalid
-- relationship refs in the DCC contract.json). canonical_publication_
-- orchestrator.py now runs 27/27 PASS.
--
-- After this migration:
--   - employees holds only operator-runtime metadata (employee_id,
--     user_id, dept_code, shift, supervisor_name, hire_date,
--     termination_date, is_active, metadata). No identity duplication.
--   - v_user_canonical is the single read source for identity.
--   - check_user_identity_drift() returns rows by dept_code drift or
--     orphan status (role-code drift now structurally impossible).
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_employees_role_drift_audit ON employees;
DROP FUNCTION IF EXISTS fn_employees_role_drift_audit();

ALTER TABLE employees
    DROP COLUMN IF EXISTS employee_name,
    DROP COLUMN IF EXISTS role_code,
    DROP COLUMN IF EXISTS role_label;

COMMENT ON TABLE employees IS
'Operator runtime projection (FK-only to users via user_id). Identity '
'(full_name, role) moved to v_user_canonical in migration 181. The '
'remaining metadata JSONB column will retire when operator runtime '
'tags migrate to users.metadata.';

DROP FUNCTION IF EXISTS check_user_identity_drift();

CREATE FUNCTION check_user_identity_drift()
RETURNS TABLE (
    username text,
    drift_kind text,
    detail text
)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(e.user_id_code, e.employee_id)::text AS username,
        'orphan_employees_row'::text AS drift_kind,
        ('employees.employee_id=' || e.employee_id || ' has no live users row')::text AS detail
    FROM employees e
    LEFT JOIN users u ON u.user_id = e.user_id AND u.deleted_at IS NULL
    WHERE e.is_active IS TRUE
      AND u.user_id IS NULL

    UNION ALL

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
'Returns rows where employees projection diverges from identity SSOT. '
'Role-code drift impossible after migration 181 dropped the column.';

COMMIT;
