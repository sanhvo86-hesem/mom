-- ============================================================================
-- Migration: 184_cnc_milling_turning_org_chart_titles.sql
-- Description: Standardize CNC Milling/Turning org-chart titles and seed the
--              CNC Turning workshop branch to match the Milling structure.
-- Dependencies: 049_hcm_workforce_management.sql, 177_hcm_employee_position_assignments.sql
-- Rollback:
--   Data migration. Restore titles/assignments from pre-migration backup if needed.
-- ============================================================================

BEGIN;

-- Keep the shop-floor org units explicit under the Production division while
-- preserving Vietnamese display names and adding international English labels.
WITH production AS (
    SELECT hcm_org_unit_id
      FROM hcm_org_units
     WHERE org_unit_code = 'PRO'
     LIMIT 1
),
seed_units AS (
    SELECT *
      FROM (VALUES
        ('MILL',  'Phòng Phay CNC', 'CNC Milling Workshop', '#ef4444'),
        ('LATHE', 'Phòng Tiện CNC', 'CNC Turning Workshop', '#0891b2')
      ) AS v(org_unit_code, org_unit_name, label_en, color)
)
INSERT INTO hcm_org_units (
    org_unit_code,
    parent_org_unit_id,
    org_unit_name,
    org_unit_type,
    status,
    metadata,
    source_record_id
)
SELECT
    s.org_unit_code,
    p.hcm_org_unit_id,
    s.org_unit_name,
    'department',
    'active',
    jsonb_build_object(
        'label_en', s.label_en,
        'color', s.color,
        'catalog_source', 'cnc_org_chart_standard'
    ),
    s.org_unit_code
  FROM seed_units s
 CROSS JOIN production p
ON CONFLICT (org_unit_code) DO UPDATE SET
    parent_org_unit_id = EXCLUDED.parent_org_unit_id,
    org_unit_name = EXCLUDED.org_unit_name,
    org_unit_type = EXCLUDED.org_unit_type,
    status = 'active',
    metadata = COALESCE(hcm_org_units.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    source_record_id = EXCLUDED.source_record_id,
    updated_at = now();

-- Milling branch: keep existing IDs/assignments stable, but replace local
-- phrasing with internationally recognizable CNC workshop titles.
WITH refs AS (
    SELECT
        (SELECT hcm_org_unit_id FROM hcm_org_units WHERE org_unit_code = 'MILL' LIMIT 1) AS mill_unit_id,
        (SELECT hcm_position_id FROM hcm_positions WHERE position_code = 'PRODUCTION_DIRECTOR' LIMIT 1) AS production_director_id
),
milling_manager AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'CNC_WORKSHOP_MANAGER',
        'CNC Milling Workshop Manager',
        refs.mill_unit_id,
        refs.production_director_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'MILL',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 2784, 'y', 816))
        ),
        'CNC_WORKSHOP_MANAGER'
      FROM refs
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = GREATEST(1, hcm_positions.required_headcount),
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
),
milling_deputy AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'DMILL',
        'Deputy CNC Milling Workshop Manager',
        refs.mill_unit_id,
        milling_manager.hcm_position_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'MILL',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 2784, 'y', 984))
        ),
        'DMILL'
      FROM refs
     CROSS JOIN milling_manager
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = EXCLUDED.required_headcount,
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
),
milling_shift AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'SHIFT_LEADER',
        'CNC Milling Shift Leader',
        refs.mill_unit_id,
        milling_deputy.hcm_position_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'MILL',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 2784, 'y', 1152))
        ),
        'SHIFT_LEADER'
      FROM refs
     CROSS JOIN milling_deputy
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = EXCLUDED.required_headcount,
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
)
INSERT INTO hcm_positions (
    position_code,
    position_title,
    hcm_org_unit_id,
    reports_to_position_id,
    required_headcount,
    employment_type,
    status,
    metadata,
    source_record_id
)
SELECT
    v.position_code,
    v.position_title,
    refs.mill_unit_id,
    milling_shift.hcm_position_id,
    v.required_headcount,
    'full_time',
    'active',
    jsonb_build_object(
        'dept_code', 'MILL',
        'catalog_source', 'cnc_org_chart_standard',
        'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', v.layout_x, 'y', v.layout_y))
    ),
    v.position_code
  FROM refs
 CROSS JOIN milling_shift
 CROSS JOIN (VALUES
    ('CNC_OPERATOR',      'CNC Milling Machinist',        35, 2616, 1320),
    ('SETUP_TECHNICIAN', 'CNC Milling Setup Technician',  1, 2928, 1320)
 ) AS v(position_code, position_title, required_headcount, layout_x, layout_y)
ON CONFLICT (position_code) DO UPDATE SET
    position_title = EXCLUDED.position_title,
    hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
    reports_to_position_id = EXCLUDED.reports_to_position_id,
    required_headcount = EXCLUDED.required_headcount,
    employment_type = EXCLUDED.employment_type,
    status = 'active',
    metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    source_record_id = EXCLUDED.source_record_id,
    updated_at = now();

-- Turning branch: mirror the Milling hierarchy with process-specific titles.
WITH refs AS (
    SELECT
        (SELECT hcm_org_unit_id FROM hcm_org_units WHERE org_unit_code = 'LATHE' LIMIT 1) AS turning_unit_id,
        (SELECT hcm_position_id FROM hcm_positions WHERE position_code = 'PRODUCTION_DIRECTOR' LIMIT 1) AS production_director_id,
        GREATEST(1, (
            SELECT count(*)::int
              FROM users
             WHERE metadata->'role_source'->>'excel_role' = 'Production (Lathe)'
        )) AS turning_operator_headcount
),
turning_manager AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'LATHE WORKSHOP MANAGER',
        'CNC Turning Workshop Manager',
        refs.turning_unit_id,
        refs.production_director_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'LATHE',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 3288, 'y', 816))
        ),
        'LATHE WORKSHOP MANAGER'
      FROM refs
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = EXCLUDED.required_headcount,
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
),
turning_deputy AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'CNC_TURNING_DEPUTY_MANAGER',
        'Deputy CNC Turning Workshop Manager',
        refs.turning_unit_id,
        turning_manager.hcm_position_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'LATHE',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 3288, 'y', 984))
        ),
        'CNC_TURNING_DEPUTY_MANAGER'
      FROM refs
     CROSS JOIN turning_manager
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = EXCLUDED.required_headcount,
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
),
turning_shift AS (
    INSERT INTO hcm_positions (
        position_code,
        position_title,
        hcm_org_unit_id,
        reports_to_position_id,
        required_headcount,
        employment_type,
        status,
        metadata,
        source_record_id
    )
    SELECT
        'CNC_TURNING_SHIFT_LEADER',
        'CNC Turning Shift Leader',
        refs.turning_unit_id,
        turning_deputy.hcm_position_id,
        1,
        'full_time',
        'active',
        jsonb_build_object(
            'dept_code', 'LATHE',
            'catalog_source', 'cnc_org_chart_standard',
            'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', 3288, 'y', 1152))
        ),
        'CNC_TURNING_SHIFT_LEADER'
      FROM refs
     CROSS JOIN turning_deputy
    ON CONFLICT (position_code) DO UPDATE SET
        position_title = EXCLUDED.position_title,
        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
        reports_to_position_id = EXCLUDED.reports_to_position_id,
        required_headcount = EXCLUDED.required_headcount,
        employment_type = EXCLUDED.employment_type,
        status = 'active',
        metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        source_record_id = EXCLUDED.source_record_id,
        updated_at = now()
    RETURNING hcm_position_id
)
INSERT INTO hcm_positions (
    position_code,
    position_title,
    hcm_org_unit_id,
    reports_to_position_id,
    required_headcount,
    employment_type,
    status,
    metadata,
    source_record_id
)
SELECT
    v.position_code,
    v.position_title,
    refs.turning_unit_id,
    turning_shift.hcm_position_id,
    CASE WHEN v.position_code = 'CNC_TURNING_MACHINIST'
         THEN refs.turning_operator_headcount
         ELSE v.required_headcount
    END,
    'full_time',
    'active',
    jsonb_build_object(
        'dept_code', 'LATHE',
        'catalog_source', 'cnc_org_chart_standard',
        'org_chart_layout', jsonb_build_object('TB', jsonb_build_object('x', v.layout_x, 'y', v.layout_y))
    ),
    v.position_code
  FROM refs
 CROSS JOIN turning_shift
 CROSS JOIN (VALUES
    ('CNC_TURNING_MACHINIST',        'CNC Turning Machinist',        1, 3120, 1320),
    ('CNC_TURNING_SETUP_TECHNICIAN', 'CNC Turning Setup Technician', 1, 3440, 1320)
 ) AS v(position_code, position_title, required_headcount, layout_x, layout_y)
ON CONFLICT (position_code) DO UPDATE SET
    position_title = EXCLUDED.position_title,
    hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
    reports_to_position_id = EXCLUDED.reports_to_position_id,
    required_headcount = EXCLUDED.required_headcount,
    employment_type = EXCLUDED.employment_type,
    status = 'active',
    metadata = COALESCE(hcm_positions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    source_record_id = EXCLUDED.source_record_id,
    updated_at = now();

-- Move Production (Lathe) users out of the generic MILL operator position
-- through the assignment table. The ended CNC_OPERATOR row blocks stale
-- users/hcm_employees fallbacks from resurrecting the old pair in the chart.
DO $$
DECLARE
    v_mill_operator_id UUID;
    v_turning_operator_id UUID;
    v_turning_unit_id UUID;
    v_employee RECORD;
BEGIN
    SELECT hcm_position_id
      INTO v_mill_operator_id
      FROM hcm_positions
     WHERE position_code = 'CNC_OPERATOR'
     LIMIT 1;

    SELECT hcm_position_id, hcm_org_unit_id
      INTO v_turning_operator_id, v_turning_unit_id
      FROM hcm_positions
     WHERE position_code = 'CNC_TURNING_MACHINIST'
     LIMIT 1;

    IF v_mill_operator_id IS NULL OR v_turning_operator_id IS NULL OR v_turning_unit_id IS NULL THEN
        RAISE EXCEPTION 'CNC turning operator migration prerequisites missing';
    END IF;

    FOR v_employee IN
        SELECT u.employee_id
          FROM users u
          JOIN hcm_employees h ON h.employee_id = u.employee_id
         WHERE u.deleted_at IS NULL
           AND COALESCE(u.status, 'active') <> 'inactive'
           AND u.metadata->'role_source'->>'excel_role' = 'Production (Lathe)'
    LOOP
        UPDATE hcm_employee_position_assignments
           SET assignment_status = 'ended',
               is_primary = false,
               effective_to = COALESCE(effective_to, CURRENT_DATE),
               updated_at = now(),
               metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('ended_by_migration', '184_cnc_milling_turning_org_chart_titles')
         WHERE employee_id = v_employee.employee_id
           AND hcm_position_id = v_mill_operator_id
           AND assignment_status = 'active';

        IF NOT EXISTS (
            SELECT 1
              FROM hcm_employee_position_assignments
             WHERE employee_id = v_employee.employee_id
               AND hcm_position_id = v_mill_operator_id
        ) THEN
            INSERT INTO hcm_employee_position_assignments (
                employee_id,
                hcm_position_id,
                hcm_org_unit_id,
                assignment_type,
                assignment_status,
                is_primary,
                fte_fraction,
                effective_from,
                effective_to,
                source_system,
                source_record_id,
                metadata
            ) VALUES (
                v_employee.employee_id,
                v_mill_operator_id,
                (SELECT hcm_org_unit_id FROM hcm_positions WHERE hcm_position_id = v_mill_operator_id),
                'primary',
                'ended',
                false,
                1.00,
                CURRENT_DATE,
                CURRENT_DATE,
                'QMS',
                '184-lathe-old-milling-operator-' || v_employee.employee_id,
                jsonb_build_object('fallback_blocker', true, 'reason', 'Production (Lathe) moved to CNC Turning Machinist')
            );
        END IF;

        IF EXISTS (
            SELECT 1
              FROM hcm_employee_position_assignments
             WHERE employee_id = v_employee.employee_id
               AND hcm_position_id = v_turning_operator_id
               AND assignment_status = 'active'
        ) THEN
            UPDATE hcm_employee_position_assignments
               SET hcm_org_unit_id = v_turning_unit_id,
                   assignment_type = 'primary',
                   is_primary = true,
                   effective_to = NULL,
                   updated_at = now(),
                   metadata = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object('aligned_by_migration', '184_cnc_milling_turning_org_chart_titles')
             WHERE employee_id = v_employee.employee_id
               AND hcm_position_id = v_turning_operator_id
               AND assignment_status = 'active';
        ELSE
            INSERT INTO hcm_employee_position_assignments (
                employee_id,
                hcm_position_id,
                hcm_org_unit_id,
                assignment_type,
                assignment_status,
                is_primary,
                fte_fraction,
                effective_from,
                source_system,
                source_record_id,
                metadata
            ) VALUES (
                v_employee.employee_id,
                v_turning_operator_id,
                v_turning_unit_id,
                'primary',
                'active',
                true,
                1.00,
                CURRENT_DATE,
                'QMS',
                '184-lathe-turning-operator-' || v_employee.employee_id,
                jsonb_build_object('assignment_source', 'users.metadata.role_source.excel_role=Production (Lathe)')
            );
        END IF;
    END LOOP;
END $$;

-- Align the sample leadership assignments shown on the org chart:
-- Huỳnh Minh Quan owns CNC Turning Workshop Manager; Nguyễn Quốc Tuấn owns the
-- CNC Milling Shift Leader node.
DO $$
DECLARE
    v_huynh_employee_id VARCHAR(20);
    v_tuan_employee_id VARCHAR(20);
    v_mill_shift_id UUID;
    v_mill_shift_unit_id UUID;
    v_turning_manager_id UUID;
    v_turning_manager_unit_id UUID;
BEGIN
    SELECT employee_id INTO v_huynh_employee_id FROM users WHERE username = 'quan.huynh' LIMIT 1;
    SELECT employee_id INTO v_tuan_employee_id FROM users WHERE username = 'tuan.nguyen' LIMIT 1;

    SELECT hcm_position_id, hcm_org_unit_id
      INTO v_mill_shift_id, v_mill_shift_unit_id
      FROM hcm_positions
     WHERE position_code = 'SHIFT_LEADER'
     LIMIT 1;

    SELECT hcm_position_id, hcm_org_unit_id
      INTO v_turning_manager_id, v_turning_manager_unit_id
      FROM hcm_positions
     WHERE position_code = 'LATHE WORKSHOP MANAGER'
     LIMIT 1;

    IF v_huynh_employee_id IS NOT NULL AND v_mill_shift_id IS NOT NULL THEN
        UPDATE hcm_employee_position_assignments
           SET assignment_status = 'ended',
               is_primary = false,
               effective_to = COALESCE(effective_to, CURRENT_DATE),
               updated_at = now(),
               metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('ended_by_migration', '184_cnc_milling_turning_org_chart_titles')
         WHERE employee_id = v_huynh_employee_id
           AND hcm_position_id = v_mill_shift_id
           AND assignment_status = 'active';

        IF NOT EXISTS (
            SELECT 1 FROM hcm_employee_position_assignments
             WHERE employee_id = v_huynh_employee_id
               AND hcm_position_id = v_mill_shift_id
        ) THEN
            INSERT INTO hcm_employee_position_assignments (
                employee_id,
                hcm_position_id,
                hcm_org_unit_id,
                assignment_type,
                assignment_status,
                is_primary,
                fte_fraction,
                effective_from,
                effective_to,
                source_system,
                source_record_id,
                metadata
            ) VALUES (
                v_huynh_employee_id,
                v_mill_shift_id,
                v_mill_shift_unit_id,
                'primary',
                'ended',
                false,
                1.00,
                CURRENT_DATE,
                CURRENT_DATE,
                'QMS',
                '184-huynh-old-milling-shift',
                jsonb_build_object('fallback_blocker', true, 'reason', 'Huynh assigned to CNC Turning Workshop Manager')
            );
        END IF;
    END IF;

    IF v_tuan_employee_id IS NOT NULL AND v_turning_manager_id IS NOT NULL THEN
        UPDATE hcm_employee_position_assignments
           SET assignment_status = 'ended',
               is_primary = false,
               effective_to = COALESCE(effective_to, CURRENT_DATE),
               updated_at = now(),
               metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('ended_by_migration', '184_cnc_milling_turning_org_chart_titles')
         WHERE employee_id = v_tuan_employee_id
           AND hcm_position_id = v_turning_manager_id
           AND assignment_status = 'active';
    END IF;

    IF v_huynh_employee_id IS NOT NULL AND v_turning_manager_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
              FROM hcm_employee_position_assignments
             WHERE employee_id = v_huynh_employee_id
               AND hcm_position_id = v_turning_manager_id
               AND assignment_status = 'active'
        ) THEN
            UPDATE hcm_employee_position_assignments
               SET hcm_org_unit_id = v_turning_manager_unit_id,
                   assignment_type = 'primary',
                   is_primary = true,
                   effective_to = NULL,
                   updated_at = now(),
                   metadata = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object('aligned_by_migration', '184_cnc_milling_turning_org_chart_titles')
             WHERE employee_id = v_huynh_employee_id
               AND hcm_position_id = v_turning_manager_id
               AND assignment_status = 'active';
        ELSE
            INSERT INTO hcm_employee_position_assignments (
                employee_id,
                hcm_position_id,
                hcm_org_unit_id,
                assignment_type,
                assignment_status,
                is_primary,
                fte_fraction,
                effective_from,
                source_system,
                source_record_id,
                metadata
            ) VALUES (
                v_huynh_employee_id,
                v_turning_manager_id,
                v_turning_manager_unit_id,
                'primary',
                'active',
                true,
                1.00,
                CURRENT_DATE,
                'QMS',
                '184-huynh-turning-manager',
                jsonb_build_object('assignment_source', 'org_chart_standard')
            );
        END IF;
    END IF;

    IF v_tuan_employee_id IS NOT NULL AND v_mill_shift_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
              FROM hcm_employee_position_assignments
             WHERE employee_id = v_tuan_employee_id
               AND hcm_position_id = v_mill_shift_id
               AND assignment_status = 'active'
        ) THEN
            UPDATE hcm_employee_position_assignments
               SET hcm_org_unit_id = v_mill_shift_unit_id,
                   assignment_type = 'primary',
                   is_primary = true,
                   effective_to = NULL,
                   updated_at = now(),
                   metadata = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object('aligned_by_migration', '184_cnc_milling_turning_org_chart_titles')
             WHERE employee_id = v_tuan_employee_id
               AND hcm_position_id = v_mill_shift_id
               AND assignment_status = 'active';
        ELSE
            INSERT INTO hcm_employee_position_assignments (
                employee_id,
                hcm_position_id,
                hcm_org_unit_id,
                assignment_type,
                assignment_status,
                is_primary,
                fte_fraction,
                effective_from,
                source_system,
                source_record_id,
                metadata
            ) VALUES (
                v_tuan_employee_id,
                v_mill_shift_id,
                v_mill_shift_unit_id,
                'primary',
                'active',
                true,
                1.00,
                CURRENT_DATE,
                'QMS',
                '184-tuan-milling-shift-leader',
                jsonb_build_object('assignment_source', 'org_chart_standard')
            );
        END IF;
    END IF;
END $$;

COMMIT;
