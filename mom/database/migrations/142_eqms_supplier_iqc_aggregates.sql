-- ============================================================================
-- Migration 142: Add IQC Quality Aggregates to EQMS Supplier Profiles
-- ============================================================================
-- Purpose:   Expose Incoming Quality Control (IQC) metrics on the EQMS
--            supplier surface without migrating granular records.
--            The legacy incoming_inspections table (M035/M139) remains the
--            source of truth; these columns are derived aggregates.
-- Strategy:  Additive columns + trigger for real-time sync + backfill.
-- Source:    incoming_inspections → eqms_supplier_profiles (IQC columns only)
-- Author:    System — module-consolidation sprint 5B
-- Date:      2026-04-17
--
-- Type note: incoming_inspections.vendor_id is VARCHAR(50) (M035).
--            eqms_supplier_profiles.vendor_id is UUID (M136).
--            Join uses sp.vendor_id::text = ii.vendor_id throughout.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Add IQC aggregate columns to eqms_supplier_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE eqms_supplier_profiles
    ADD COLUMN IF NOT EXISTS iqc_sample_count_ytd     INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iqc_defect_count_ytd     INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iqc_reject_rate_ytd      NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iqc_avg_defects_per_lot  NUMERIC(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iqc_quality_level        VARCHAR(20)  NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS iqc_last_inspection_date DATE,
    ADD COLUMN IF NOT EXISTS iqc_last_result          VARCHAR(40),
    ADD COLUMN IF NOT EXISTS iqc_certifications_required JSONB     NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN eqms_supplier_profiles.iqc_sample_count_ytd
    IS 'Count of incoming inspection lots inspected in the current calendar year.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_defect_count_ytd
    IS 'Total defects found across all lots in the current calendar year.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_reject_rate_ytd
    IS 'Percent of lots rejected (result=reject) YTD — used for skip-lot classification.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_avg_defects_per_lot
    IS 'Average defects per lot inspected YTD.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_quality_level
    IS 'Derived inspection intensity: normal|tightened|reduced|skip.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_last_inspection_date
    IS 'Date of the most recent completed incoming inspection for this supplier.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_last_result
    IS 'Result of the most recent completed incoming inspection.';
COMMENT ON COLUMN eqms_supplier_profiles.iqc_certifications_required
    IS 'Required documentation flags: {"coc": bool, "material_cert": bool, "test_report": bool}.';

-- Index for quality level queries (e.g. find all tightened suppliers)
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_iqc_level
    ON eqms_supplier_profiles (iqc_quality_level)
    WHERE iqc_quality_level <> 'normal';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Trigger function — sync IQC aggregates on inspection change
-- ─────────────────────────────────────────────────────────────────────────────
-- Fires AFTER INSERT OR UPDATE on incoming_inspections.
-- Recalculates YTD metrics for the affected vendor and updates the profile.
-- Handles vendor_id type mismatch: incoming.vendor_id VARCHAR(50) ↔ UUID.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_supplier_iqc_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_id    TEXT;
    v_ytd_start    TIMESTAMPTZ;
    v_sample_count INTEGER;
    v_defect_count INTEGER;
    v_reject_count INTEGER;
    v_reject_rate  NUMERIC(5,2);
    v_avg_defects  NUMERIC(8,2);
    v_quality_lvl  VARCHAR(20);
    v_last_date    DATE;
    v_last_result  VARCHAR(40);
BEGIN
    v_vendor_id := NEW.vendor_id;
    v_ytd_start := date_trunc('year', now());

    -- Calculate YTD aggregates for this vendor
    SELECT
        COUNT(*)::INTEGER,
        COALESCE(SUM(defects_found), 0)::INTEGER,
        COUNT(*) FILTER (WHERE result::text = 'reject')::INTEGER
    INTO
        v_sample_count, v_defect_count, v_reject_count
    FROM incoming_inspections
    WHERE vendor_id = v_vendor_id
      AND created_at >= v_ytd_start;

    -- Reject rate (0 if no samples)
    v_reject_rate := CASE
        WHEN v_sample_count > 0 THEN ROUND((v_reject_count::NUMERIC / v_sample_count) * 100, 2)
        ELSE 0
    END;

    -- Average defects per lot
    v_avg_defects := CASE
        WHEN v_sample_count > 0 THEN ROUND(v_defect_count::NUMERIC / v_sample_count, 2)
        ELSE 0
    END;

    -- Quality level classification:
    --   reject_rate > 10%                    → tightened
    --   reject_rate 5-10% OR avg_defects > 2 → tightened
    --   sample_count >= 20 AND rate < 1%     → reduced
    --   sample_count >= 50 AND rate = 0      → skip
    --   otherwise                            → normal
    v_quality_lvl := CASE
        WHEN v_reject_rate > 10                                   THEN 'tightened'
        WHEN v_reject_rate >= 5  OR v_avg_defects > 2            THEN 'tightened'
        WHEN v_sample_count >= 50 AND v_reject_rate = 0           THEN 'skip'
        WHEN v_sample_count >= 20 AND v_reject_rate < 1           THEN 'reduced'
        ELSE                                                           'normal'
    END;

    -- Most recent inspection date and result for this vendor
    SELECT received_date, result::text
    INTO v_last_date, v_last_result
    FROM incoming_inspections
    WHERE vendor_id = v_vendor_id
    ORDER BY received_date DESC, created_at DESC
    LIMIT 1;

    -- Update the EQMS supplier profile (join via vendor_id type cast)
    UPDATE eqms_supplier_profiles sp
    SET
        iqc_sample_count_ytd    = v_sample_count,
        iqc_defect_count_ytd    = v_defect_count,
        iqc_reject_rate_ytd     = v_reject_rate,
        iqc_avg_defects_per_lot = v_avg_defects,
        iqc_quality_level       = v_quality_lvl,
        iqc_last_inspection_date = v_last_date,
        iqc_last_result         = v_last_result,
        updated_at              = now()
    WHERE sp.vendor_id::text = v_vendor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to incoming_inspections table
DROP TRIGGER IF EXISTS trg_sync_supplier_iqc ON incoming_inspections;
CREATE TRIGGER trg_sync_supplier_iqc
    AFTER INSERT OR UPDATE ON incoming_inspections
    FOR EACH ROW
    EXECUTE FUNCTION sync_supplier_iqc_aggregates();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Backfill IQC aggregates from existing incoming_inspections data
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE eqms_supplier_profiles sp
SET
    iqc_sample_count_ytd = agg.sample_count,
    iqc_defect_count_ytd = agg.defect_count,
    iqc_reject_rate_ytd  = CASE
        WHEN agg.sample_count > 0
            THEN ROUND((agg.reject_count::NUMERIC / agg.sample_count) * 100, 2)
        ELSE 0
    END,
    iqc_avg_defects_per_lot = CASE
        WHEN agg.sample_count > 0
            THEN ROUND(agg.defect_count::NUMERIC / agg.sample_count, 2)
        ELSE 0
    END,
    iqc_quality_level = CASE
        WHEN agg.sample_count = 0                                                THEN 'normal'
        WHEN (agg.reject_count::NUMERIC / agg.sample_count) > 0.10              THEN 'tightened'
        WHEN (agg.reject_count::NUMERIC / agg.sample_count) >= 0.05
             OR (agg.defect_count::NUMERIC / agg.sample_count) > 2              THEN 'tightened'
        WHEN agg.sample_count >= 50
             AND agg.reject_count = 0                                            THEN 'skip'
        WHEN agg.sample_count >= 20
             AND (agg.reject_count::NUMERIC / agg.sample_count) < 0.01          THEN 'reduced'
        ELSE                                                                          'normal'
    END,
    iqc_last_inspection_date = last_insp.received_date,
    iqc_last_result          = last_insp.result_text,
    updated_at               = now()
FROM (
    SELECT
        vendor_id,
        COUNT(*)::INTEGER                                               AS sample_count,
        COALESCE(SUM(defects_found), 0)::INTEGER                       AS defect_count,
        COUNT(*) FILTER (WHERE result::text = 'reject')::INTEGER       AS reject_count
    FROM incoming_inspections
    WHERE created_at >= date_trunc('year', now())
    GROUP BY vendor_id
) agg
-- Most recent inspection per vendor
LEFT JOIN LATERAL (
    SELECT received_date, result::text AS result_text
    FROM incoming_inspections ii2
    WHERE ii2.vendor_id = agg.vendor_id
    ORDER BY received_date DESC, created_at DESC
    LIMIT 1
) last_insp ON TRUE
WHERE sp.vendor_id::text = agg.vendor_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: Register IQC sub-resource routes in eqms-quality-routes
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Route file changes are applied via eqms-quality-routes.php (Sprint 5B-routes).
-- This comment documents the intended new routes:
--   GET  /api/v1/eqms/suppliers/{id}/iqc          → iqcSummary() (profile aggregates)
--   POST /api/v1/eqms/suppliers/{id}/iqc/query    → iqcHistory() (inspection list)
-- These methods are added to EqmsSuppliersController in the route registration phase.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5: Audit log
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_updated  INTEGER;
    v_total    INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total  FROM eqms_supplier_profiles;
    SELECT COUNT(*) INTO v_updated FROM eqms_supplier_profiles WHERE iqc_sample_count_ytd > 0;
    RAISE NOTICE '[Migration 142] IQC aggregates: % supplier profiles updated from incoming_inspections (% total profiles)',
        v_updated, v_total;
END;
$$;

COMMIT;
