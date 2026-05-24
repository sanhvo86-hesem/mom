-- ============================================================================
-- Migration 197: Enforce one live assignment per employee-position pair
-- ============================================================================
--
-- Background:
--   Migration 188 enforces "one active primary per employee", but it still
--   allowed the same employee to hold the same hcm_position_id twice: once as
--   primary (AUTH_JSON/admin_user_upsert) and again as concurrent/acting/etc.
--   The user edit modal renders hcm_employee_position_assignments, so this
--   appeared as the main title duplicated in the "kiem nhiem" list.
--
-- Invariant:
--   For every live assignment row:
--     assignment_status = 'active'
--     AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
--   there may be only one row per (employee_id, hcm_position_id).
--
-- Rollback:
--   DROP TRIGGER trg_hcm_emp_pos_assign_unique_live_position
--     ON hcm_employee_position_assignments;
--   DROP FUNCTION fn_hcm_emp_pos_assign_unique_live_position();
--   DROP INDEX uq_hcm_emp_pos_assign_one_open_live_position;
-- ============================================================================

BEGIN;

-- 1. Data heal: keep one live row per employee-position. A primary row wins;
-- otherwise keep the newest row and end the rest.
WITH ranked AS (
    SELECT
        hcm_assignment_id,
        ROW_NUMBER() OVER (
            PARTITION BY employee_id, hcm_position_id
            ORDER BY
                CASE WHEN is_primary = TRUE OR assignment_type = 'primary' THEN 0 ELSE 1 END,
                updated_at DESC,
                created_at DESC,
                hcm_assignment_id
        ) AS rn
    FROM hcm_employee_position_assignments
    WHERE assignment_status = 'active'
      AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
)
UPDATE hcm_employee_position_assignments AS a
   SET assignment_status = 'ended',
       effective_to = COALESCE(a.effective_to, CURRENT_DATE),
       metadata = COALESCE(a.metadata, '{}'::jsonb)
           || jsonb_build_object(
               'ended_by', 'migration_197_duplicate_live_position',
               'ended_at', to_jsonb(now())
           ),
       updated_at = now()
  FROM ranked r
 WHERE a.hcm_assignment_id = r.hcm_assignment_id
   AND r.rn > 1;

-- 2. Strong guard for the common live/open-ended case. Future-dated end rows
-- are protected by the trigger below because CURRENT_DATE is not immutable and
-- therefore cannot be used in a complete partial unique index predicate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hcm_emp_pos_assign_one_open_live_position
    ON hcm_employee_position_assignments (employee_id, hcm_position_id)
    WHERE assignment_status = 'active'
      AND effective_to IS NULL;

COMMENT ON INDEX uq_hcm_emp_pos_assign_one_open_live_position IS
'SSOT invariant: one open-ended active assignment per employee-position pair. '
'Trigger trg_hcm_emp_pos_assign_unique_live_position also handles future-dated '
'effective_to rows and cross-writer promotion from concurrent to primary.';

-- 3. Trigger guard: when a live row is inserted/promoted, end other live rows
-- for the same employee-position. If a primary already exists, block adding the
-- same position as a non-primary appointment.
CREATE OR REPLACE FUNCTION fn_hcm_emp_pos_assign_unique_live_position()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existing_primary_id UUID;
BEGIN
    IF NEW.assignment_status IS DISTINCT FROM 'active' THEN
        RETURN NEW;
    END IF;

    IF NEW.effective_to IS NOT NULL AND NEW.effective_to <= CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    SELECT hcm_assignment_id
      INTO existing_primary_id
      FROM hcm_employee_position_assignments
     WHERE employee_id = NEW.employee_id
       AND hcm_position_id = NEW.hcm_position_id
       AND hcm_assignment_id IS DISTINCT FROM NEW.hcm_assignment_id
       AND assignment_status = 'active'
       AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
       AND (is_primary = TRUE OR assignment_type = 'primary')
     ORDER BY updated_at DESC, created_at DESC, hcm_assignment_id
     LIMIT 1;

    IF existing_primary_id IS NOT NULL
       AND NEW.is_primary IS DISTINCT FROM TRUE
       AND NEW.assignment_type IS DISTINCT FROM 'primary' THEN
        RAISE EXCEPTION 'duplicate_active_position_assignment'
            USING ERRCODE = '23505',
                  DETAIL = 'employee_id=' || NEW.employee_id || ', hcm_position_id=' || NEW.hcm_position_id,
                  HINT = 'End the existing primary assignment before adding the same position as a secondary appointment.';
    END IF;

    UPDATE hcm_employee_position_assignments
       SET assignment_status = 'ended',
           effective_to = COALESCE(effective_to, CURRENT_DATE),
           metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object(
                   'ended_by', 'trg_unique_live_position',
                   'ended_for', NEW.hcm_assignment_id,
                   'ended_at', to_jsonb(now())
               ),
           updated_at = now()
     WHERE employee_id = NEW.employee_id
       AND hcm_position_id = NEW.hcm_position_id
       AND hcm_assignment_id IS DISTINCT FROM NEW.hcm_assignment_id
       AND assignment_status = 'active'
       AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
       AND NOT (
           assignment_type IS NOT DISTINCT FROM NEW.assignment_type
           AND source_system IS NOT DISTINCT FROM NEW.source_system
           AND source_record_id IS NOT DISTINCT FROM NEW.source_record_id
       );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_hcm_emp_pos_assign_unique_live_position() IS
'Prevents the same employee-position pair from being live twice across AUTH_JSON, '
'ADMIN_USER_MODAL, ADMIN_ORG_CONSOLE, and other writers. Primary promotion wins; '
'secondary insertion over an existing primary is rejected.';

DROP TRIGGER IF EXISTS trg_hcm_emp_pos_assign_unique_live_position
    ON hcm_employee_position_assignments;

CREATE TRIGGER trg_hcm_emp_pos_assign_unique_live_position
    BEFORE INSERT OR UPDATE OF employee_id, hcm_position_id, assignment_status, effective_to, is_primary, assignment_type
    ON hcm_employee_position_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_hcm_emp_pos_assign_unique_live_position();

COMMIT;
