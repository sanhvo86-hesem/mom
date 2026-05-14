-- ============================================================================
-- Migration 183: Drop employees identity cols (now that parser honors it)
-- ============================================================================
--
-- Closes the user-identity SSOT cleanup once and for all. Previous attempts
-- (179 dropped → 180 restored, 181 dropped → 182 restored) were rolled back
-- because mom/tools/registry/generate-table-architecture.mjs did not honor
-- ALTER TABLE DROP COLUMN — the registry kept the 28-col shape while the
-- live DB had 25 cols, triggering structural_drift in DataSchemaService.
--
-- That parser was enhanced in this commit (parseAlterTableStatement now
-- handles DROP COLUMN, SET NOT NULL, DROP NOT NULL in addition to ADD
-- COLUMN / ALTER COLUMN TYPE), so this drop will finally stick across the
-- whole pipeline: live DB, schema.sql replay, table-registry.json,
-- data-fields-*.json, schema-authority-summary, DataSchemaService smoke.
--
-- After this migration: employees has 25 columns (no identity duplication).
-- v_user_canonical is the single read source for identity.
-- check_user_identity_drift() detects only dept_code drift or orphan rows.
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
'(full_name, role) moved to v_user_canonical in migration 183. The '
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
'Role-code drift impossible after migration 183 dropped the column.';

COMMIT;
