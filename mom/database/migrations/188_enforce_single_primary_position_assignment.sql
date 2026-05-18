-- ============================================================================
-- Migration 188: Enforce single-primary invariant for hcm_employee_position_assignments
-- ============================================================================
--
-- Background:
--   Migration 177 created hcm_employee_position_assignments with `is_primary BOOLEAN`
--   but no constraint preventing >1 active primary per employee. Three writers
--   (AUTH_JSON sync, ADMIN_ORG_CONSOLE, ADMIN_USER_MODAL) each set is_primary=TRUE
--   independently. In production this caused presentation drift between the three
--   admin sidebars (User edit, Position edit, Org chart) because the org chart
--   shows every assignee regardless of primary/concurrent, while user edit modal
--   reads the primary flag — different rows could be marked primary at different
--   times by different writers.
--
-- Invariant enforced by this migration:
--   For each (employee_id) at most ONE row with
--     is_primary = TRUE AND assignment_status = 'active'
--   exists. This is the SSOT for "this employee's primary appointment".
--   Concurrent / acting / backup / temporary appointments coexist with
--   is_primary = FALSE.
--
-- Mechanism:
--   1. Data heal (idempotent): for each employee with >1 active primary, keep
--      the row with highest precedence (ADMIN_ORG_CONSOLE > ADMIN_USER_MODAL
--      > AUTH_JSON > others), tiebreak by most recent updated_at. Demote
--      losers to is_primary=FALSE, assignment_type='concurrent'.
--   2. Partial unique index uq_one_primary_per_employee.
--   3. BEFORE trigger that auto-demotes other primaries when a new row is
--      promoted (any writer). Atomicity: trigger demotes OLD primaries in
--      the same statement that promotes the NEW one — no race window where
--      two primaries coexist.
--
-- Forward compatibility:
--   • Existing AuthUserShadowSyncService writes are unchanged — the trigger
--     transparently demotes any older primary when AUTH_JSON sync promotes
--     a different position.
--   • Frontend org console reads via S.employeesByPosition (mirror of this
--     table) automatically reflects the invariant on next refresh.
--
-- Rollback:
--   DROP TRIGGER trg_hcm_emp_pos_assign_single_primary
--     ON hcm_employee_position_assignments;
--   DROP FUNCTION fn_hcm_emp_pos_assign_demote_other_primaries();
--   DROP INDEX uq_one_primary_per_employee;
--
-- Author: SSOT consistency pass for chức danh sidebar drift, 2026-05-18.
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Data heal — keep ONE active primary per employee, demote the rest.
-- -----------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        hcm_assignment_id,
        employee_id,
        ROW_NUMBER() OVER (
            PARTITION BY employee_id
            ORDER BY
                CASE source_system
                    WHEN 'ADMIN_ORG_CONSOLE' THEN 1
                    WHEN 'ADMIN_USER_MODAL'  THEN 2
                    WHEN 'AUTH_JSON'         THEN 3
                    ELSE 4
                END,
                updated_at DESC,
                created_at DESC,
                hcm_assignment_id
        ) AS rn
    FROM hcm_employee_position_assignments
    WHERE is_primary = TRUE
      AND assignment_status = 'active'
)
UPDATE hcm_employee_position_assignments AS a
   SET is_primary      = FALSE,
       assignment_type = CASE WHEN a.assignment_type = 'primary'
                              THEN 'concurrent'
                              ELSE a.assignment_type END,
       metadata        = COALESCE(a.metadata, '{}'::jsonb)
                          || jsonb_build_object(
                                'demoted_by', 'migration_188',
                                'demoted_at', to_jsonb(now())
                             ),
       updated_at      = now()
  FROM ranked r
 WHERE a.hcm_assignment_id = r.hcm_assignment_id
   AND r.rn > 1;

-- -----------------------------------------------------------------------------
-- 2. Partial unique index — enforces the invariant at DB level.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_primary_per_employee
    ON hcm_employee_position_assignments (employee_id)
    WHERE is_primary = TRUE
      AND assignment_status = 'active';

COMMENT ON INDEX uq_one_primary_per_employee IS
'SSOT invariant: each employee has at most ONE active primary position assignment. '
'Enforced together with trg_hcm_emp_pos_assign_single_primary which auto-demotes '
'the previous primary when a new one is promoted. See migration 188.';

-- -----------------------------------------------------------------------------
-- 3. BEFORE trigger — auto-demote other primaries when a row is promoted.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_hcm_emp_pos_assign_demote_other_primaries()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only act when the row being written claims primary + active.
    IF NEW.is_primary IS DISTINCT FROM TRUE THEN
        RETURN NEW;
    END IF;
    IF NEW.assignment_status IS DISTINCT FROM 'active' THEN
        RETURN NEW;
    END IF;

    -- Demote any OTHER active primary for the same employee. We rewrite both
    -- is_primary and assignment_type so the legacy reader convention
    -- (assignment_type='primary' implies primary) stays consistent.
    UPDATE hcm_employee_position_assignments
       SET is_primary      = FALSE,
           assignment_type = CASE WHEN assignment_type = 'primary'
                                  THEN 'concurrent'
                                  ELSE assignment_type END,
           metadata        = COALESCE(metadata, '{}'::jsonb)
                              || jsonb_build_object(
                                    'demoted_by',  'trg_single_primary',
                                    'demoted_at',  to_jsonb(now()),
                                    'demoted_for', NEW.hcm_assignment_id
                                 ),
           updated_at      = now()
     WHERE employee_id        = NEW.employee_id
       AND hcm_assignment_id  IS DISTINCT FROM NEW.hcm_assignment_id
       AND is_primary         = TRUE
       AND assignment_status  = 'active';

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_hcm_emp_pos_assign_demote_other_primaries() IS
'Auto-demote other active primary assignments for the same employee when a row '
'is promoted to (is_primary=TRUE, assignment_status=active). Keeps the partial '
'unique index uq_one_primary_per_employee from ever blocking a legitimate '
'promote. Writer-agnostic: AUTH_JSON sync, ADMIN_ORG_CONSOLE, ADMIN_USER_MODAL '
'all benefit. See migration 188.';

DROP TRIGGER IF EXISTS trg_hcm_emp_pos_assign_single_primary
    ON hcm_employee_position_assignments;

CREATE TRIGGER trg_hcm_emp_pos_assign_single_primary
    BEFORE INSERT OR UPDATE OF is_primary, assignment_status, assignment_type
    ON hcm_employee_position_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_hcm_emp_pos_assign_demote_other_primaries();

COMMIT;
