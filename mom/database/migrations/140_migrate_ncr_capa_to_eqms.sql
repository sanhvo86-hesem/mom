-- ============================================================================
-- Migration 140: Migrate legacy NCR & CAPA records → EQMS v4.0 surface
-- ============================================================================
-- Safe:       INSERT … WHERE NOT EXISTS — idempotent, re-runnable
-- Direction:  ncr_records  → eqms_ncr_records
--             capa_records → eqms_capa_records
-- Source:     Legacy tables preserved (no DELETE); data is additive.
-- Author:     System — module-consolidation sprint 4
-- Date:       2026-04-17
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: ncr_records → eqms_ncr_records
-- ─────────────────────────────────────────────────────────────────────────────
-- Column mapping:
--   ncr_id            → ncr_id           (UUID, same value)
--   ncr_number        → ncr_number       (VARCHAR, same value)
--   defect_description→ title + description
--   severity (INT)    → severity (VARCHAR): ≥8=critical, 5-7=major, <5=minor
--   nonconformance_source→ source (VARCHAR)
--   job_number        → job_number
--   quantity_affected → qty_affected
--   containment_action→ containment_action
--   root_cause        → root_cause
--   disposition       → disposition (enum→varchar lowercase)
--   ncr_status        → status
--   created_at        → created_at + detected_at
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO eqms_ncr_records (
    ncr_id,
    ncr_number,
    title,
    description,
    severity,
    source,
    job_number,
    qty_affected,
    detected_at,
    containment_action,
    root_cause,
    disposition,
    status,
    version,
    created_at,
    created_by
)
SELECT
    n.ncr_id,
    n.ncr_number,
    -- title: first 512 chars of defect_description (NOT NULL)
    LEFT(COALESCE(n.defect_description, 'Migrated NCR'), 512),
    -- description: full defect_description (NOT NULL)
    COALESCE(n.defect_description, 'Migrated from legacy ncr_records'),
    -- severity: map INT 1-10 → categorical string
    CASE
        WHEN n.severity IS NULL          THEN 'minor'
        WHEN n.severity >= 8             THEN 'critical'
        WHEN n.severity >= 5             THEN 'major'
        ELSE                                  'minor'
    END,
    -- source: map nc_source_enum → eqms source values
    CASE n.nonconformance_source::text
        WHEN 'In-Process'       THEN 'production'
        WHEN 'Final Inspection' THEN 'production'
        WHEN 'Customer Return'  THEN 'customer'
        WHEN 'Incoming'         THEN 'receiving'
        WHEN 'Audit Finding'    THEN 'audit'
        WHEN 'Supplier'         THEN 'receiving'
        ELSE                         'production'
    END,
    n.job_number,
    n.quantity_affected,
    -- detected_at: use created_at as best approximation
    n.created_at,
    n.containment_action,
    n.root_cause,
    -- disposition: map ncr_disposition_enum → eqms disposition varchar
    CASE n.disposition::text
        WHEN 'Use As-Is'          THEN 'use_as_is'
        WHEN 'Rework'             THEN 'rework'
        WHEN 'Repair'             THEN 'repair'
        WHEN 'Scrap'              THEN 'scrap'
        WHEN 'Return to Supplier' THEN 'return_to_vendor'
        WHEN 'Concession'         THEN 'use_as_is'
        ELSE NULL
    END,
    -- status: map ncr_status_enum → EQMS state machine states
    -- draft/submitted/under_review/mrb_review/disposition_set/rework_in_progress/closed
    CASE n.ncr_status::text
        WHEN 'Open'                 THEN 'submitted'
        WHEN 'Contained'            THEN 'submitted'
        WHEN 'Under Investigation'  THEN 'under_review'
        WHEN 'CAPA Assigned'        THEN 'disposition_set'
        WHEN 'Closed'               THEN 'closed'
        WHEN 'Verified'             THEN 'closed'
        ELSE                             'submitted'
    END,
    1,
    n.created_at,
    'system_migration'
FROM ncr_records n
WHERE NOT EXISTS (
    SELECT 1 FROM eqms_ncr_records e WHERE e.ncr_id = n.ncr_id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: capa_records → eqms_capa_records
-- ─────────────────────────────────────────────────────────────────────────────
-- Column mapping:
--   capa_id           → capa_id           (UUID, same value)
--   record_id         → capa_number       (VARCHAR, existing formatted ID)
--   corrective_action → title + description (combined)
--   preventive_action → description suffix
--   source_ncr_id     → source_type='ncr', source_id=resolved ncr_id UUID
--   root_cause_method → root_cause_method (enum→varchar lowercase)
--   root_cause        → root_cause_description
--   corrective+preventive → action_plan (JSONB array)
--   target_date       → due_date
--   capa_status       → status
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO eqms_capa_records (
    capa_id,
    capa_number,
    title,
    description,
    source_type,
    source_id,
    severity,
    root_cause_method,
    root_cause_description,
    action_plan,
    due_date,
    status,
    version,
    created_at,
    created_by
)
SELECT
    c.capa_id,
    -- capa_number: use record_id (already unique formatted string), fallback to generated
    COALESCE(
        NULLIF(TRIM(c.record_id), ''),
        'CAPA-MIG-' || TO_CHAR(c.created_at, 'YYYYMMDD') || '-' || SUBSTR(c.capa_id::text, 1, 8)
    ),
    -- title: first 512 chars of corrective_action or root_cause
    LEFT(COALESCE(
        NULLIF(TRIM(c.corrective_action), ''),
        NULLIF(TRIM(c.root_cause), ''),
        'Legacy CAPA'
    ), 512),
    -- description: combine corrective + preventive actions
    CASE
        WHEN c.corrective_action IS NOT NULL AND c.preventive_action IS NOT NULL
            THEN c.corrective_action || E'\n\n[Hành động phòng ngừa / Preventive Action]\n' || c.preventive_action
        WHEN c.corrective_action IS NOT NULL THEN c.corrective_action
        WHEN c.preventive_action IS NOT NULL THEN c.preventive_action
        ELSE 'Migrated from legacy capa_records'
    END,
    -- source_type
    CASE WHEN c.source_ncr_id IS NOT NULL THEN 'ncr' ELSE 'other' END,
    -- source_id: resolve ncr UUID from ncr_number FK
    n.ncr_id,
    -- severity: legacy CAPA has no severity → default minor
    'minor',
    -- root_cause_method: map enum → eqms values (5why, fishbone, fault_tree, other)
    CASE c.root_cause_method::text
        WHEN '5-Why'    THEN '5why'
        WHEN 'Fishbone' THEN 'fishbone'
        WHEN 'FTA'      THEN 'fault_tree'
        ELSE                 'other'
    END,
    c.root_cause,
    -- action_plan: JSONB array from corrective + preventive action fields
    COALESCE(
        (
            SELECT jsonb_agg(item)
            FROM (
                SELECT jsonb_build_object(
                    'desc',        c.corrective_action,
                    'responsible', 'migrated',
                    'due_date',    c.target_date::text,
                    'status',      CASE WHEN c.completion_date IS NOT NULL THEN 'completed' ELSE 'open' END
                ) AS item
                WHERE c.corrective_action IS NOT NULL
                UNION ALL
                SELECT jsonb_build_object(
                    'desc',        c.preventive_action,
                    'responsible', 'migrated',
                    'due_date',    c.target_date::text,
                    'status',      CASE WHEN c.completion_date IS NOT NULL THEN 'completed' ELSE 'open' END
                ) AS item
                WHERE c.preventive_action IS NOT NULL
            ) sub
        ),
        '[]'::jsonb
    ),
    c.target_date,
    -- status: map capa_status_enum → EQMS CAPA state machine
    -- draft/initiated/analysis/action_planning/pending_approval/approved/implementation/effectiveness_review/closed/cancelled
    CASE c.capa_status::text
        WHEN 'Open'                 THEN 'initiated'
        WHEN 'In Progress'          THEN 'analysis'
        WHEN 'Implemented'          THEN 'implementation'
        WHEN 'Verification Pending' THEN 'effectiveness_review'
        WHEN 'Closed Effective'     THEN 'closed'
        WHEN 'Closed Not Effective' THEN 'closed'
        ELSE                             'initiated'
    END,
    1,
    c.created_at,
    'system_migration'
FROM capa_records c
LEFT JOIN ncr_records n ON n.ncr_number = c.source_ncr_id
WHERE NOT EXISTS (
    SELECT 1 FROM eqms_capa_records e WHERE e.capa_id = c.capa_id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Update eqms_ncr_records.linked_capa_id for migrated NCRs
-- Links NCR → CAPA now that both sets are in eqms tables
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE eqms_ncr_records enr
SET linked_capa_id = ecr.capa_id
FROM eqms_capa_records ecr
JOIN ncr_records leg_ncr ON leg_ncr.ncr_id = enr.ncr_id
JOIN capa_records leg_capa ON leg_capa.capa_id = ecr.capa_id
    AND leg_capa.source_ncr_id = leg_ncr.ncr_number
WHERE enr.linked_capa_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: Migration audit log
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_ncr_migrated  INTEGER;
    v_capa_migrated INTEGER;
    v_ncr_total     INTEGER;
    v_capa_total    INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ncr_total  FROM ncr_records;
    SELECT COUNT(*) INTO v_capa_total FROM capa_records;
    SELECT COUNT(*) INTO v_ncr_migrated  FROM eqms_ncr_records  WHERE created_by = 'system_migration';
    SELECT COUNT(*) INTO v_capa_migrated FROM eqms_capa_records WHERE created_by = 'system_migration';
    RAISE NOTICE '[Migration 140] NCR:  %/% rows migrated to eqms_ncr_records',  v_ncr_migrated,  v_ncr_total;
    RAISE NOTICE '[Migration 140] CAPA: %/% rows migrated to eqms_capa_records', v_capa_migrated, v_capa_total;
END;
$$;

COMMIT;
