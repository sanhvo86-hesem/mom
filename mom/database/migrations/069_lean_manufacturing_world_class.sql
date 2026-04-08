-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 069: Lean Manufacturing & World-Class Quality Tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- New tables for lean manufacturing workflows (KAIZEN, QRQC, ANDON, 5S,
-- GEMBA, SMED, Tier Meeting) and enhanced quality tables (NCR MRB, CAPA 8D,
-- FAI AS9102 enhanced, Calibration OOT, Workflow step data capture).
--
-- Standards: AS9100D, AS9102 Rev C, ISO 17025, Toyota Production System,
--            Safran QRQC, AIAG 8D, ISA-95, TPM
--
-- @since 4.1.0
-- @date  2026-04-04

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: WORKFLOW STEP DATA CAPTURE
-- Required fields per workflow transition - links WorkflowEngine to structured data
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workflow_step_data (
    step_data_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type           VARCHAR(20)     NOT NULL,
    record_id               VARCHAR(50)     NOT NULL,
    step_name               VARCHAR(50)     NOT NULL,
    from_state              VARCHAR(50),
    to_state                VARCHAR(50)     NOT NULL,
    data_fields             JSONB           NOT NULL DEFAULT '{}',
    attachments             JSONB           DEFAULT '[]',
    captured_by             UUID            REFERENCES users(user_id),
    captured_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    signature_meaning       VARCHAR(30),
    signature_hash          VARCHAR(128),
    metadata                JSONB           DEFAULT '{}',
    UNIQUE (workflow_type, record_id, step_name, to_state)
);
COMMENT ON TABLE workflow_step_data IS 'Structured data captured at each workflow transition step. Links WorkflowEngine state changes to business data fields.';
CREATE INDEX IF NOT EXISTS idx_wsd_record ON workflow_step_data (record_id, workflow_type);
CREATE INDEX IF NOT EXISTS idx_wsd_step ON workflow_step_data (workflow_type, to_state);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: NCR ENHANCEMENTS - MRB & Human Factors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ncr_mrb_decisions (
    mrb_decision_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ncr_id                  UUID            NOT NULL REFERENCES ncr_records(ncr_id) ON DELETE CASCADE,
    mrb_date                DATE            NOT NULL,
    mrb_chairperson         UUID            REFERENCES users(user_id),
    mrb_members             JSONB           NOT NULL DEFAULT '[]',
    disposition_decision    VARCHAR(30)     NOT NULL
                            CHECK (disposition_decision IN ('use_as_is', 'rework', 'repair', 'scrap', 'return_to_vendor', 'regrade')),
    engineering_justification TEXT          NOT NULL,
    customer_concession_required BOOLEAN    NOT NULL DEFAULT false,
    customer_concession_number VARCHAR(50),
    customer_notified       BOOLEAN         NOT NULL DEFAULT false,
    customer_notification_date DATE,
    risk_assessment         TEXT,
    rework_instruction      TEXT,
    reinspection_required   BOOLEAN         NOT NULL DEFAULT true,
    affected_serial_numbers JSONB           DEFAULT '[]',
    affected_lot_numbers    JSONB           DEFAULT '[]',
    cost_impact             JSONB           DEFAULT '{}',
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ncr_mrb_decisions IS 'Material Review Board disposition decisions per AS9100D 8.7. Captures cross-functional review, customer concession, and engineering rationale.';

CREATE TABLE IF NOT EXISTS ncr_human_factors (
    human_factor_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ncr_id                  UUID            NOT NULL REFERENCES ncr_records(ncr_id) ON DELETE CASCADE,
    factor_category         VARCHAR(50)     NOT NULL
                            CHECK (factor_category IN (
                                'lack_of_communication', 'distraction', 'lack_of_resources',
                                'pressure', 'complacency', 'lack_of_teamwork', 'stress',
                                'lack_of_awareness', 'fatigue', 'lack_of_knowledge',
                                'lack_of_assertiveness', 'norms'
                            )),
    factor_description      TEXT            NOT NULL,
    contributing_level      VARCHAR(10)     NOT NULL CHECK (contributing_level IN ('primary', 'secondary', 'minor')),
    corrective_action       TEXT,
    assessed_by             UUID            REFERENCES users(user_id),
    assessed_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ncr_human_factors IS 'AS9100D human factors root cause analysis (the "Dirty Dozen"). Captures human element contributors to nonconformances.';
CREATE INDEX IF NOT EXISTS idx_nhf_ncr ON ncr_human_factors (ncr_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: CAPA 8D METHODOLOGY ENHANCEMENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS capa_8d_steps (
    step_id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id                 UUID            NOT NULL REFERENCES capa_records(capa_id) ON DELETE CASCADE,
    d_step                  VARCHAR(5)      NOT NULL
                            CHECK (d_step IN ('D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8')),
    step_status             VARCHAR(20)     NOT NULL DEFAULT 'open'
                            CHECK (step_status IN ('open', 'in_progress', 'completed', 'verified')),
    -- D0: Prepare
    emergency_response      TEXT,
    -- D1: Team
    team_leader             UUID            REFERENCES users(user_id),
    team_members            JSONB           DEFAULT '[]',
    -- D2: Problem Description
    is_is_not_analysis      JSONB           DEFAULT '{}',
    problem_statement       TEXT,
    -- D3: Interim Containment
    containment_actions     JSONB           DEFAULT '[]',
    containment_verified    BOOLEAN,
    -- D4: Root Cause
    root_cause_method       VARCHAR(30),
    root_cause_description  TEXT,
    escape_point            TEXT,
    human_factors           JSONB           DEFAULT '[]',
    -- D5: Permanent Corrective Actions
    corrective_actions      JSONB           DEFAULT '[]',
    risk_of_unintended_effects TEXT,
    -- D6: Implementation
    implementation_evidence JSONB           DEFAULT '[]',
    documents_updated       JSONB           DEFAULT '[]',
    training_completed      BOOLEAN,
    -- D7: Prevent Recurrence
    systemic_actions        TEXT,
    fmea_updated            BOOLEAN,
    control_plan_updated    BOOLEAN,
    horizontal_deployment   JSONB           DEFAULT '[]',
    lessons_learned         TEXT,
    -- D8: Close
    closure_summary         TEXT,
    team_recognition        TEXT,
    --
    completed_by            UUID            REFERENCES users(user_id),
    completed_at            TIMESTAMPTZ,
    verified_by             UUID            REFERENCES users(user_id),
    verified_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (capa_id, d_step)
);
COMMENT ON TABLE capa_8d_steps IS 'Structured 8D problem-solving methodology data per AIAG/AS13000. Each row stores data for one D-step of a CAPA.';
CREATE INDEX IF NOT EXISTS idx_c8d_capa ON capa_8d_steps (capa_id);

CREATE TABLE IF NOT EXISTS capa_effectiveness_checks (
    check_id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id                 UUID            NOT NULL REFERENCES capa_records(capa_id) ON DELETE CASCADE,
    check_interval_days     INT             NOT NULL CHECK (check_interval_days IN (30, 60, 90, 180, 365)),
    check_due_date          DATE            NOT NULL,
    check_actual_date       DATE,
    performed_by            UUID            REFERENCES users(user_id),
    check_method            VARCHAR(30)     NOT NULL
                            CHECK (check_method IN ('audit', 'data_review', 'process_check', 'spc_analysis', 'customer_feedback')),
    pass_fail_criteria      TEXT            NOT NULL,
    recurrence_check        BOOLEAN,
    sample_size             INT,
    data_source             VARCHAR(100),
    spc_within_limits       BOOLEAN,
    post_complaint_count    INT             DEFAULT 0,
    check_result            VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (check_result IN ('pending', 'pass', 'fail', 'inconclusive')),
    evidence_reference      TEXT,
    notes                   TEXT,
    reopen_required         BOOLEAN         DEFAULT false,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE capa_effectiveness_checks IS 'CAPA effectiveness verification at 30/60/90/180/365 day intervals per AS9100D 10.2. Tracks recurrence and objective evidence.';
CREATE INDEX IF NOT EXISTS idx_cec_capa ON capa_effectiveness_checks (capa_id);
CREATE INDEX IF NOT EXISTS idx_cec_due ON capa_effectiveness_checks (check_due_date) WHERE check_result = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: CALIBRATION OOT INVESTIGATION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calibration_oot_investigations (
    oot_id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    calibration_id          VARCHAR(50)     NOT NULL,
    equipment_id            VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    oot_discovery_date      DATE            NOT NULL,
    last_known_good_date    DATE            NOT NULL,
    oot_parameter           VARCHAR(100)    NOT NULL,
    oot_magnitude           NUMERIC(12,4)   NOT NULL,
    oot_direction           VARCHAR(10)     CHECK (oot_direction IN ('high', 'low', 'drift')),
    risk_assessment         TEXT            NOT NULL,
    affected_date_range     DATERANGE       NOT NULL,
    affected_work_orders    JSONB           DEFAULT '[]',
    affected_part_numbers   JSONB           DEFAULT '[]',
    products_reinspected    BOOLEAN         NOT NULL DEFAULT false,
    reinspection_results    JSONB           DEFAULT '{}',
    product_disposition     TEXT,
    recall_required         BOOLEAN         NOT NULL DEFAULT false,
    linked_ncr_id           UUID            REFERENCES ncr_records(ncr_id),
    investigation_conclusion TEXT           NOT NULL DEFAULT '',
    investigator_id         UUID            REFERENCES users(user_id),
    approved_by             UUID            REFERENCES users(user_id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'investigating', 'containment', 'closed')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE calibration_oot_investigations IS 'Out-of-Tolerance investigation records per ISO 17025. Tracks affected products, reinspection, and disposition.';

CREATE TABLE IF NOT EXISTS calibration_grr_studies (
    grr_id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id            VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    study_date              DATE            NOT NULL,
    study_type              VARCHAR(20)     NOT NULL CHECK (study_type IN ('crossed', 'nested')),
    specification_tolerance NUMERIC(12,6)   NOT NULL,
    num_operators           INT             NOT NULL DEFAULT 3,
    num_parts               INT             NOT NULL DEFAULT 10,
    num_trials              INT             NOT NULL DEFAULT 3,
    readings                JSONB           NOT NULL DEFAULT '[]',
    repeatability_ev_pct    NUMERIC(6,2),
    reproducibility_av_pct  NUMERIC(6,2),
    grr_pct                 NUMERIC(6,2)    NOT NULL,
    part_variation_pv_pct   NUMERIC(6,2),
    ndc                     INT,
    grr_result              VARCHAR(15)     NOT NULL
                            CHECK (grr_result IN ('acceptable', 'marginal', 'unacceptable')),
    performed_by            UUID            REFERENCES users(user_id),
    approved_by             UUID            REFERENCES users(user_id),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE calibration_grr_studies IS 'Gauge R&R (MSA) study results per AIAG MSA manual. Determines measurement system adequacy.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: LEAN MANUFACTURING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 5.1 KAIZEN / A3 Problem Solving ──

CREATE TABLE IF NOT EXISTS lean_kaizen_events (
    kaizen_id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    kaizen_number           VARCHAR(30)     NOT NULL UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    title                   VARCHAR(200)    NOT NULL,
    kaizen_type             VARCHAR(30)     NOT NULL
                            CHECK (kaizen_type IN ('point_kaizen', 'system_kaizen', 'flow_kaizen', 'kaikaku')),
    owner_id                UUID            NOT NULL REFERENCES users(user_id),
    mentor_coach_id         UUID            REFERENCES users(user_id),
    team_members            JSONB           DEFAULT '[]',
    status                  VARCHAR(30)     NOT NULL DEFAULT 'identified',
    area_work_center        VARCHAR(50),
    -- A3 Report Fields
    a3_background           TEXT,
    a3_current_condition    TEXT,
    a3_problem_statement    TEXT,
    a3_target_condition     TEXT,
    a3_root_cause           TEXT,
    a3_rca_method           VARCHAR(30)
                            CHECK (a3_rca_method IN ('5why', 'fishbone', 'pareto', 'fault_tree', 'is_is_not')),
    a3_countermeasures      JSONB           DEFAULT '[]',
    a3_implementation_plan  JSONB           DEFAULT '[]',
    a3_follow_up_results    TEXT,
    -- Metrics
    metric_name             VARCHAR(100),
    metric_baseline_value   NUMERIC(12,4),
    metric_target_value     NUMERIC(12,4),
    metric_actual_value     NUMERIC(12,4),
    improvement_pct         NUMERIC(6,2),
    cost_savings            NUMERIC(12,2)   DEFAULT 0,
    -- VSM fields
    vsm_before_lead_time    NUMERIC(10,2),
    vsm_after_lead_time     NUMERIC(10,2),
    -- Yokoten
    yokoten_areas           JSONB           DEFAULT '[]',
    yokoten_deployed        BOOLEAN         DEFAULT false,
    -- Dates
    date_initiated          DATE            NOT NULL DEFAULT CURRENT_DATE,
    target_close_date       DATE,
    actual_close_date       DATE,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_kaizen_events IS 'Kaizen (continuous improvement) events with A3 problem-solving structure. Supports point/system/flow kaizen and kaikaku.';
CREATE INDEX IF NOT EXISTS idx_lke_status ON lean_kaizen_events (status);
CREATE INDEX IF NOT EXISTS idx_lke_area ON lean_kaizen_events (area_work_center);

-- ── 5.2 QRQC (Quick Response Quality Control) ──

CREATE TABLE IF NOT EXISTS lean_qrqc_events (
    qrqc_id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    qrqc_number             VARCHAR(30)     NOT NULL UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    qrqc_level              VARCHAR(10)     NOT NULL
                            CHECK (qrqc_level IN ('L1_line', 'L2_workshop', 'L3_plant')),
    detection_date          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    detected_by             UUID            NOT NULL REFERENCES users(user_id),
    problem_description     TEXT            NOT NULL,
    affected_part_number    VARCHAR(50),
    affected_quantity       INT             DEFAULT 0,
    defect_type             VARCHAR(50),
    -- San Gen Shugi (3 Reals)
    real_part_verified      BOOLEAN         NOT NULL DEFAULT false,
    real_place_verified     BOOLEAN         NOT NULL DEFAULT false,
    real_data_collected     BOOLEAN         NOT NULL DEFAULT false,
    real_part_photos        JSONB           DEFAULT '[]',
    -- Actions
    immediate_reaction      TEXT,
    root_cause              TEXT,
    root_cause_method       VARCHAR(30)     CHECK (root_cause_method IN ('5why', 'ishikawa', 'is_is_not')),
    countermeasure          TEXT,
    lesson_learned          TEXT,
    -- Timing SLA
    time_to_contain_hours   NUMERIC(6,2),
    time_to_resolve_hours   NUMERIC(6,2),
    -- Escalation
    escalated_to_next       BOOLEAN         DEFAULT false,
    escalation_reason       TEXT,
    linked_ncr_id           UUID            REFERENCES ncr_records(ncr_id),
    linked_capa_id          UUID            REFERENCES capa_records(capa_id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'detected'
                            CHECK (status IN ('detected', 'san_gen_shugi', 'immediate_reaction', 'rca', 'countermeasure', 'verified', 'closed')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_qrqc_events IS 'Quick Response Quality Control events (Safran methodology). San Gen Shugi: go see real parts, at real place, with real data.';

-- ── 5.3 ANDON Digital Events ──

CREATE TABLE IF NOT EXISTS lean_andon_events (
    andon_id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_datetime        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    machine_id              VARCHAR(50),
    line_id                 VARCHAR(50),
    station_id              VARCHAR(50),
    triggered_by            UUID            NOT NULL REFERENCES users(user_id),
    andon_type              VARCHAR(20)     NOT NULL
                            CHECK (andon_type IN ('quality', 'equipment', 'material', 'safety', 'process', 'other')),
    andon_color             VARCHAR(10)     NOT NULL
                            CHECK (andon_color IN ('red', 'yellow', 'blue', 'white', 'green')),
    part_number             VARCHAR(50),
    work_order              VARCHAR(50),
    description             TEXT,
    -- Response tracking
    response_time_sec       INT,
    responder_id            UUID            REFERENCES users(user_id),
    responder_role          VARCHAR(30),
    resolution_time_sec     INT,
    line_stopped            BOOLEAN         NOT NULL DEFAULT false,
    line_stop_duration_sec  INT             DEFAULT 0,
    -- Escalation
    escalation_level        INT             NOT NULL DEFAULT 0
                            CHECK (escalation_level BETWEEN 0 AND 3),
    escalated_to            UUID            REFERENCES users(user_id),
    -- Resolution
    root_cause_code         VARCHAR(50),
    resolution_description  TEXT,
    linked_ncr_id           UUID            REFERENCES ncr_records(ncr_id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'triggered'
                            CHECK (status IN ('triggered', 'responding', 'escalated', 'resolved')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_andon_events IS 'Digital Andon system events. Tracks trigger, response SLA (5/15/30 min tiers), escalation, and resolution.';
CREATE INDEX IF NOT EXISTS idx_lae_machine ON lean_andon_events (machine_id, trigger_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_lae_status ON lean_andon_events (status) WHERE status != 'resolved';

-- ── 5.4 5S Workplace Audit ──

CREATE TABLE IF NOT EXISTS lean_5s_audits (
    audit_5s_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_number            VARCHAR(30)     NOT NULL UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    area_id                 VARCHAR(50)     NOT NULL,
    area_name               VARCHAR(100)    NOT NULL,
    auditor_id              UUID            NOT NULL REFERENCES users(user_id),
    audit_date              DATE            NOT NULL DEFAULT CURRENT_DATE,
    -- Scores (0-5 scale per item)
    sort_score              NUMERIC(3,1)    NOT NULL CHECK (sort_score BETWEEN 0 AND 5),
    set_in_order_score      NUMERIC(3,1)    NOT NULL CHECK (set_in_order_score BETWEEN 0 AND 5),
    shine_score             NUMERIC(3,1)    NOT NULL CHECK (shine_score BETWEEN 0 AND 5),
    standardize_score       NUMERIC(3,1)    NOT NULL CHECK (standardize_score BETWEEN 0 AND 5),
    sustain_score           NUMERIC(3,1)    NOT NULL CHECK (sustain_score BETWEEN 0 AND 5),
    safety_score            NUMERIC(3,1)    CHECK (safety_score BETWEEN 0 AND 5),
    total_score             NUMERIC(4,1)    GENERATED ALWAYS AS (sort_score + set_in_order_score + shine_score + standardize_score + sustain_score + COALESCE(safety_score, 0)) STORED,
    max_possible_score      NUMERIC(4,1)    GENERATED ALWAYS AS (CASE WHEN safety_score IS NOT NULL THEN 30.0 ELSE 25.0 END) STORED,
    score_percent           NUMERIC(5,2)    GENERATED ALWAYS AS (
        (sort_score + set_in_order_score + shine_score + standardize_score + sustain_score + COALESCE(safety_score, 0))
        / (CASE WHEN safety_score IS NOT NULL THEN 30.0 ELSE 25.0 END) * 100
    ) STORED,
    -- Findings
    findings                JSONB           DEFAULT '[]',
    corrective_actions      JSONB           DEFAULT '[]',
    photos                  JSONB           DEFAULT '[]',
    -- Trend
    previous_score_percent  NUMERIC(5,2),
    trend_direction         VARCHAR(10)     CHECK (trend_direction IN ('improving', 'stable', 'declining')),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'completed'
                            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'action_required', 'closed')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_5s_audits IS 'Digital 5S (or 6S with Safety) workplace audit records. Scores 0-5 per pillar with findings and corrective actions.';
CREATE INDEX IF NOT EXISTS idx_l5s_area ON lean_5s_audits (area_id, audit_date DESC);

-- ── 5.5 Gemba Walk ──

CREATE TABLE IF NOT EXISTS lean_gemba_walks (
    gemba_id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    walk_number             VARCHAR(30)     NOT NULL UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    walker_id               UUID            NOT NULL REFERENCES users(user_id),
    walk_date               DATE            NOT NULL DEFAULT CURRENT_DATE,
    walk_start              TIMESTAMPTZ,
    walk_end                TIMESTAMPTZ,
    duration_minutes        INT,
    areas_visited           JSONB           DEFAULT '[]',
    theme_focus             VARCHAR(20)     CHECK (theme_focus IN ('safety', 'quality', 'delivery', 'cost', 'morale', 'general')),
    observations            JSONB           NOT NULL DEFAULT '[]',
    positive_observations   INT             DEFAULT 0,
    improvement_observations INT            DEFAULT 0,
    safety_observations     INT             DEFAULT 0,
    actions_assigned        JSONB           DEFAULT '[]',
    actions_completed       INT             DEFAULT 0,
    actions_total           INT             DEFAULT 0,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'planned'
                            CHECK (status IN ('planned', 'walking', 'logged', 'actions_assigned', 'follow_up', 'closed')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_gemba_walks IS 'Digital Gemba walk records. Captures observations (Safety/Quality/5S/Flow) and assigns follow-up actions.';

-- ── 5.6 SMED (Setup Reduction) ──

CREATE TABLE IF NOT EXISTS lean_smed_events (
    smed_id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    smed_number             VARCHAR(30)     NOT NULL UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    machine_id              VARCHAR(50)     NOT NULL,
    from_part_number        VARCHAR(50),
    to_part_number          VARCHAR(50),
    -- Baseline
    baseline_setup_time_min NUMERIC(8,1)    NOT NULL,
    baseline_internal_min   NUMERIC(8,1),
    baseline_external_min   NUMERIC(8,1),
    baseline_video_uri      VARCHAR(500),
    -- SMED Steps
    step1_separation        JSONB           DEFAULT '{}',
    step2_conversion        JSONB           DEFAULT '{}',
    step3_streamlining      JSONB           DEFAULT '{}',
    -- Trial run
    trial_setup_time_min    NUMERIC(8,1),
    trial_internal_min      NUMERIC(8,1),
    trial_external_min      NUMERIC(8,1),
    -- Results
    final_setup_time_min    NUMERIC(8,1),
    reduction_pct           NUMERIC(5,2)    GENERATED ALWAYS AS (
        CASE WHEN baseline_setup_time_min > 0
             THEN ((baseline_setup_time_min - COALESCE(final_setup_time_min, baseline_setup_time_min)) / baseline_setup_time_min * 100)
             ELSE 0 END
    ) STORED,
    -- Standard work
    standard_work_created   BOOLEAN         DEFAULT false,
    operators_trained       JSONB           DEFAULT '[]',
    quick_change_fixtures   JSONB           DEFAULT '[]',
    -- Meta
    facilitator_id          UUID            REFERENCES users(user_id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'baseline_recorded'
                            CHECK (status IN ('baseline_recorded', 'separated', 'converted', 'streamlined', 'trial', 'standardized')),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_smed_events IS 'SMED (Single Minute Exchange of Die) setup reduction records. Tracks 5-step methodology from baseline to standardization.';

-- ── 5.7 Tier Meeting Escalations ──

CREATE TABLE IF NOT EXISTS lean_tier_meetings (
    meeting_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_date            DATE            NOT NULL DEFAULT CURRENT_DATE,
    tier_level              VARCHAR(10)     NOT NULL
                            CHECK (tier_level IN ('T1_cell', 'T2_value_stream', 'T3_plant', 'T4_executive')),
    area_id                 VARCHAR(50),
    facilitator_id          UUID            REFERENCES users(user_id),
    attendees               JSONB           DEFAULT '[]',
    shift_code              VARCHAR(10),
    -- SQDCM KPIs reviewed
    safety_status           VARCHAR(10)     CHECK (safety_status IN ('green', 'yellow', 'red')),
    quality_status          VARCHAR(10)     CHECK (quality_status IN ('green', 'yellow', 'red')),
    delivery_status         VARCHAR(10)     CHECK (delivery_status IN ('green', 'yellow', 'red')),
    cost_status             VARCHAR(10)     CHECK (cost_status IN ('green', 'yellow', 'red')),
    morale_status           VARCHAR(10)     CHECK (morale_status IN ('green', 'yellow', 'red')),
    -- Discussion items
    discussion_items        JSONB           DEFAULT '[]',
    action_items            JSONB           DEFAULT '[]',
    escalations_up          JSONB           DEFAULT '[]',
    deescalations_down      JSONB           DEFAULT '[]',
    -- Timing
    duration_minutes        INT,
    started_on_time         BOOLEAN,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_tier_meetings IS 'Tiered daily management meeting records (T1-T4). Tracks SQDCM KPI status, escalations, and action items.';
CREATE INDEX IF NOT EXISTS idx_ltm_date ON lean_tier_meetings (meeting_date DESC, tier_level);

CREATE TABLE IF NOT EXISTS lean_tier_escalations (
    escalation_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    source_meeting_id       UUID            REFERENCES lean_tier_meetings(meeting_id),
    source_tier             VARCHAR(10)     NOT NULL,
    target_tier             VARCHAR(10)     NOT NULL,
    escalated_by            UUID            NOT NULL REFERENCES users(user_id),
    issue_category          VARCHAR(10)     NOT NULL
                            CHECK (issue_category IN ('safety', 'quality', 'delivery', 'cost', 'morale')),
    issue_description       TEXT            NOT NULL,
    kpi_metric              VARCHAR(50),
    kpi_target              NUMERIC(12,4),
    kpi_actual              NUMERIC(12,4),
    days_open               INT             NOT NULL DEFAULT 0,
    owner_id                UUID            REFERENCES users(user_id),
    countermeasure          TEXT,
    target_resolution_date  DATE,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'escalated'
                            CHECK (status IN ('escalated', 'assigned', 'in_progress', 'resolved', 'deescalated')),
    resolution_notes        TEXT,
    resolved_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lean_tier_escalations IS 'Tier meeting escalation tracking. Issues flow up tiers until resolved, then de-escalate with countermeasures.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: FAI AS9102 ENHANCEMENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fai_trigger_log (
    trigger_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number             VARCHAR(50)     NOT NULL,
    trigger_type            VARCHAR(40)     NOT NULL
                            CHECK (trigger_type IN (
                                'new_part', 'design_change', 'process_change', 'tooling_change',
                                'material_change', 'supplier_change', 'production_lapse_24m',
                                'corrective_action_change', 'manufacturing_location_change'
                            )),
    fai_type_required       VARCHAR(10)     NOT NULL CHECK (fai_type_required IN ('full', 'partial')),
    trigger_reason          TEXT            NOT NULL,
    trigger_source          VARCHAR(50),
    linked_ecr_id           VARCHAR(50),
    linked_fai_id           UUID            REFERENCES fai_records(fai_id),
    evaluated_by            UUID            REFERENCES users(user_id),
    evaluated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'fai_initiated', 'waived', 'closed')),
    waiver_reason           TEXT,
    waiver_approved_by      UUID            REFERENCES users(user_id),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fai_trigger_log IS 'AS9102 FAI trigger detection and evaluation log. Tracks 9 trigger types with full/partial FAI determination.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: INDEXES AND COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Cross-reference views for dashboard queries
CREATE OR REPLACE VIEW v_lean_dashboard AS
SELECT
    'kaizen'::text AS event_type,
    kaizen_number AS event_number,
    title,
    status,
    owner_id,
    date_initiated AS event_date,
    metric_baseline_value AS baseline,
    metric_actual_value AS actual,
    improvement_pct,
    cost_savings
FROM lean_kaizen_events
WHERE status NOT IN ('closed', 'yokoten_deployed')

UNION ALL

SELECT
    'qrqc'::text,
    qrqc_number,
    problem_description,
    status,
    detected_by,
    detection_date::date,
    NULL, NULL, NULL, NULL
FROM lean_qrqc_events
WHERE status != 'closed'

UNION ALL

SELECT
    'andon'::text,
    andon_id::text,
    description,
    status,
    triggered_by,
    trigger_datetime::date,
    NULL, NULL, NULL, NULL
FROM lean_andon_events
WHERE status != 'resolved'
  AND trigger_datetime > now() - INTERVAL '24 hours';

COMMENT ON VIEW v_lean_dashboard IS 'Consolidated lean event dashboard showing active kaizen, QRQC, and andon events.';

COMMIT;
