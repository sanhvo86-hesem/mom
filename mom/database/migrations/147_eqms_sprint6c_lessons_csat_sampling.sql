-- ============================================================================
-- Migration 147: EQMS Sprint 6C — Lessons Learned, CSAT, Sampling Plans
-- ============================================================================
-- Purpose:   Create tables for 3 remaining stub EQMS modules.
-- Standards: ISO 9001:2015 §10.3 (lessons learned), IATF 16949 §9.1.2 (CSAT),
--            ANSI/ASQ Z1.4 / Z1.9 (sampling plans), IATF 16949 §8.6.2 (incoming)
-- Author:    System — module-consolidation sprint 6C
-- Date:      2026-04-17
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: eqms_lessons_learned
-- Knowledge capture from quality events, audits, and project reviews.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_lessons_learned (
    lesson_id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_number               VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Classification
    lesson_type                 VARCHAR(40)  NOT NULL DEFAULT 'corrective',
    category                    VARCHAR(100),
    source_type                 VARCHAR(60),
    source_id                   UUID,
    source_ref                  VARCHAR(200),

    -- Knowledge content
    what_happened               TEXT         NOT NULL DEFAULT '',
    root_cause_summary          TEXT,
    what_worked_well            TEXT,
    what_could_improve          TEXT,
    recommended_action          TEXT,
    action_taken                TEXT,
    prevention_mechanism        VARCHAR(300),

    -- Applicability
    applicable_processes        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    applicable_products         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    applicable_sites            JSONB        NOT NULL DEFAULT '[]'::jsonb,

    -- Impact
    cost_impact                 NUMERIC(14,2),
    time_impact_hours           NUMERIC(10,2),
    risk_reduction_score        INTEGER,

    -- Dissemination
    shared_with_team            BOOLEAN      NOT NULL DEFAULT FALSE,
    shared_date                 DATE,
    training_required           BOOLEAN      NOT NULL DEFAULT FALSE,
    training_completed          BOOLEAN      NOT NULL DEFAULT FALSE,
    knowledge_base_ref          VARCHAR(300),

    -- Approval
    reviewed_by                 VARCHAR(120),
    reviewed_at                 TIMESTAMPTZ,
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_ll_status
    ON eqms_lessons_learned (status);
CREATE INDEX IF NOT EXISTS idx_ll_type
    ON eqms_lessons_learned (lesson_type);
CREATE INDEX IF NOT EXISTS idx_ll_source
    ON eqms_lessons_learned (source_type, source_id)
    WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ll_created
    ON eqms_lessons_learned (created_at DESC);

COMMENT ON TABLE eqms_lessons_learned
    IS 'ISO 9001:2015 §10.3 — Lessons learned from quality events for continual improvement.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: eqms_csat_surveys
-- Customer Satisfaction survey campaigns and results.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_csat_surveys (
    survey_id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_number               VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Survey scope
    survey_type                 VARCHAR(40)  NOT NULL DEFAULT 'periodic',
    survey_period               VARCHAR(40),
    customer_id                 VARCHAR(120),
    customer_name               VARCHAR(300),
    survey_date                 DATE         NOT NULL,
    response_due_date           DATE,

    -- Survey instrument
    survey_method               VARCHAR(40)  NOT NULL DEFAULT 'questionnaire',
    questionnaire_ref           VARCHAR(300),
    evaluator                   VARCHAR(120),

    -- Results aggregate
    responses_sent              INTEGER      NOT NULL DEFAULT 0,
    responses_received          INTEGER      NOT NULL DEFAULT 0,
    overall_score               NUMERIC(5,2),
    score_scale                 VARCHAR(20)  NOT NULL DEFAULT '1-10',
    nps_score                   INTEGER,

    -- Category scores (JSONB array of {category, score, comments})
    category_scores             JSONB        NOT NULL DEFAULT '[]'::jsonb,

    -- Key findings
    strengths_summary           TEXT,
    improvement_areas           TEXT,
    customer_verbatim           TEXT,

    -- Actions
    action_required             BOOLEAN      NOT NULL DEFAULT FALSE,
    action_description          TEXT,
    linked_capa_id              UUID,
    linked_complaint_id         UUID,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_csat_status
    ON eqms_csat_surveys (status);
CREATE INDEX IF NOT EXISTS idx_csat_customer
    ON eqms_csat_surveys (customer_id)
    WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csat_date
    ON eqms_csat_surveys (survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_csat_score
    ON eqms_csat_surveys (overall_score)
    WHERE overall_score IS NOT NULL;

COMMENT ON TABLE eqms_csat_surveys
    IS 'IATF 16949 §9.1.2 — Customer Satisfaction surveys and monitoring.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: eqms_sampling_plans
-- AQL-based sampling plans per ANSI/ASQ Z1.4 and Z1.9.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_sampling_plans (
    plan_id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_number                 VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Plan scope
    plan_type                   VARCHAR(40)  NOT NULL DEFAULT 'incoming',
    part_number                 VARCHAR(120),
    part_revision               VARCHAR(40),
    vendor_id                   VARCHAR(120),
    process_name                VARCHAR(200),

    -- Standard
    standard                    VARCHAR(40)  NOT NULL DEFAULT 'ANSI_Z1.4',
    inspection_level            VARCHAR(20)  NOT NULL DEFAULT 'II',
    aql_critical                NUMERIC(5,3),
    aql_major                   NUMERIC(5,3),
    aql_minor                   NUMERIC(5,3),
    sampling_type               VARCHAR(20)  NOT NULL DEFAULT 'single',

    -- Decision rule
    lot_size_min                INTEGER,
    lot_size_max                INTEGER,
    sample_size                 INTEGER,
    sample_size_code            CHAR(2),
    accept_number               INTEGER,
    reject_number               INTEGER,

    -- Classification thresholds (for auto skip-lot)
    tightened_trigger_rejects   INTEGER      NOT NULL DEFAULT 2,
    reduced_trigger_accepts     INTEGER      NOT NULL DEFAULT 10,
    skip_lot_trigger_accepts    INTEGER      NOT NULL DEFAULT 20,

    -- Characteristic linkage
    linked_sc_ids               JSONB        NOT NULL DEFAULT '[]'::jsonb,

    -- Approval
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    effective_date              DATE,
    review_date                 DATE,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_sp_status
    ON eqms_sampling_plans (status);
CREATE INDEX IF NOT EXISTS idx_sp_part
    ON eqms_sampling_plans (part_number)
    WHERE part_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_vendor
    ON eqms_sampling_plans (vendor_id)
    WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_type
    ON eqms_sampling_plans (plan_type);
CREATE INDEX IF NOT EXISTS idx_sp_created
    ON eqms_sampling_plans (created_at DESC);

COMMENT ON TABLE eqms_sampling_plans
    IS 'ANSI/ASQ Z1.4/Z1.9 — AQL-based sampling plans for incoming, process, and final inspection.';

-- ─────────────────────────────────────────────────────────────────────────────
-- MDM seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- Lesson learned types
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.lesson_type',
    'Lesson Learned Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 150, 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.lesson_type', 'corrective',     'Corrective (What went wrong)', 10),
        ('eqms.lesson_type', 'preventive',     'Preventive (Potential risk)', 20),
        ('eqms.lesson_type', 'best_practice',  'Best Practice (What worked)', 30),
        ('eqms.lesson_type', 'process_change', 'Process Change', 40),
        ('eqms.lesson_type', 'design_change',  'Design/Engineering Change', 50),
        ('eqms.lesson_type', 'audit_finding',  'Audit Finding', 60)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- CSAT survey type
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.csat_survey_type',
    'CSAT Survey Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 160, 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.csat_survey_type', 'periodic',         'Periodic (Annual/Quarterly)', 10),
        ('eqms.csat_survey_type', 'post_delivery',    'Post-Delivery', 20),
        ('eqms.csat_survey_type', 'post_complaint',   'Post-Complaint Resolution', 30),
        ('eqms.csat_survey_type', 'project_closeout', 'Project Closeout', 40),
        ('eqms.csat_survey_type', 'ad_hoc',           'Ad Hoc', 99)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- Sampling plan types
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.sampling_plan_type',
    'Sampling Plan Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 170, 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.sampling_plan_type', 'incoming',   'Incoming (IQC)', 10),
        ('eqms.sampling_plan_type', 'in_process', 'In-Process', 20),
        ('eqms.sampling_plan_type', 'final',      'Final Inspection', 30),
        ('eqms.sampling_plan_type', 'outgoing',   'Outgoing / Pre-ship', 40),
        ('eqms.sampling_plan_type', 'skip_lot',   'Skip-Lot', 50)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '147_eqms_sprint6c_lessons_csat_sampling')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

DO $$
BEGIN
    RAISE NOTICE '[Migration 147] Sprint 6C: eqms_lessons_learned, eqms_csat_surveys, eqms_sampling_plans created.';
END;
$$;

COMMIT;
