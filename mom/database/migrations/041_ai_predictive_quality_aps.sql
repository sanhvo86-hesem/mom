-- ============================================================================
-- Migration: 041_ai_predictive_quality_aps.sql
-- Description: AI Predictive Quality Engine + APS Lite scheduling -
--              predictions, ML model registry, SPC anomaly rules,
--              production schedule slots, conflicts, capacity snapshots
-- Dependencies: 006_erp_master_data.sql, 010_production.sql, 011_quality.sql
-- Rollback: DROP TABLE capacity_snapshots, schedule_conflicts,
--           production_schedule_slots, spc_anomaly_rules,
--           prediction_models, quality_predictions CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE prediction_type_enum AS ENUM (
        'tool_wear', 'defect_probability', 'spc_anomaly', 'process_drift', 'equipment_failure'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE prediction_severity_enum AS ENUM (
        'info', 'watch', 'warning', 'critical'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE prediction_status_enum AS ENUM (
        'active', 'acknowledged', 'resolved', 'false_positive', 'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE schedule_conflict_type_enum AS ENUM (
        'machine_overlap', 'operator_overlap', 'material_unavailable',
        'tooling_unavailable', 'maintenance_window'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- quality_predictions / Du doan chat luong AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS quality_predictions (
    prediction_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_type         prediction_type_enum NOT NULL,
    severity                prediction_severity_enum NOT NULL,
    status                  prediction_status_enum DEFAULT 'active',
    confidence_score        NUMERIC(5,2)    CHECK (confidence_score >= 0 AND confidence_score <= 100),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    job_number              VARCHAR(50),
    wo_number               VARCHAR(50),
    machine_id              VARCHAR(50),
    operator_id             VARCHAR(20),
    characteristic          VARCHAR(200),
    predicted_value         NUMERIC(14,6),
    threshold_value         NUMERIC(14,6),
    current_trend           VARCHAR(20)     CHECK (current_trend IN ('improving', 'stable', 'degrading')),
    data_points_used        INT,
    model_version           VARCHAR(50),
    recommendation          TEXT,
    recommendation_vi       TEXT,
    acknowledged_by         UUID            REFERENCES users(user_id),
    acknowledged_at         TIMESTAMPTZ,
    resolved_by             UUID            REFERENCES users(user_id),
    resolved_at             TIMESTAMPTZ,
    resolution_notes        TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at              TIMESTAMPTZ
);
COMMENT ON TABLE quality_predictions IS 'AI-generated quality predictions and alerts / Du doan chat luong tu AI va canh bao';

CREATE INDEX IF NOT EXISTS idx_quality_predictions_type ON quality_predictions (prediction_type);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_severity ON quality_predictions (severity);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_status ON quality_predictions (status);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_item ON quality_predictions (item_id);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_machine ON quality_predictions (machine_id);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_job ON quality_predictions (job_number);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_wo ON quality_predictions (wo_number);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_created ON quality_predictions (created_at);
CREATE INDEX IF NOT EXISTS idx_quality_predictions_expires ON quality_predictions (expires_at);

-- ============================================================================
-- prediction_models / Dang ky mo hinh ML
-- ============================================================================
CREATE TABLE IF NOT EXISTS prediction_models (
    model_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name              VARCHAR(200)    NOT NULL,
    model_type              prediction_type_enum NOT NULL,
    version                 VARCHAR(50)     NOT NULL,
    algorithm               VARCHAR(100),
    training_data_source    VARCHAR(200),
    training_samples        INT,
    accuracy_score          NUMERIC(5,2),
    precision_score         NUMERIC(5,2),
    recall_score            NUMERIC(5,2),
    is_active               BOOLEAN         DEFAULT FALSE,
    promoted_at             TIMESTAMPTZ,
    promoted_by             UUID            REFERENCES users(user_id),
    config                  JSONB           DEFAULT '{}'::jsonb,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE prediction_models IS 'ML model registry for predictive quality / Dang ky mo hinh hoc may cho du doan chat luong';

CREATE INDEX IF NOT EXISTS idx_prediction_models_type ON prediction_models (model_type);
CREATE INDEX IF NOT EXISTS idx_prediction_models_active ON prediction_models (is_active);
CREATE INDEX IF NOT EXISTS idx_prediction_models_algorithm ON prediction_models (algorithm);

-- ============================================================================
-- spc_anomaly_rules / Quy tac phat hien bat thuong SPC
-- ============================================================================
CREATE TABLE IF NOT EXISTS spc_anomaly_rules (
    rule_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name               VARCHAR(200)    NOT NULL,
    rule_name_vi            VARCHAR(200),
    rule_code               VARCHAR(30)     UNIQUE NOT NULL,
    description             TEXT,
    description_vi          TEXT,
    detection_logic         JSONB           DEFAULT '{}'::jsonb,
    severity                prediction_severity_enum DEFAULT 'warning',
    auto_ncr                BOOLEAN         DEFAULT FALSE,
    auto_notify_roles       JSONB           DEFAULT '[]'::jsonb,
    is_active               BOOLEAN         DEFAULT TRUE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE spc_anomaly_rules IS 'Configurable SPC anomaly detection rules (Western Electric, Nelson) / Quy tac phat hien bat thuong SPC (Western Electric, Nelson)';

CREATE INDEX IF NOT EXISTS idx_spc_anomaly_rules_code ON spc_anomaly_rules (rule_code);
CREATE INDEX IF NOT EXISTS idx_spc_anomaly_rules_active ON spc_anomaly_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_spc_anomaly_rules_severity ON spc_anomaly_rules (severity);

-- ============================================================================
-- production_schedule_slots / Khung lich trinh san xuat APS
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_schedule_slots (
    slot_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id              VARCHAR(50)     NOT NULL,
    wo_number               VARCHAR(50),
    jo_number               VARCHAR(50),
    slot_date               DATE            NOT NULL,
    start_time              TIME,
    end_time                TIME,
    shift                   VARCHAR(20),
    duration_minutes        NUMERIC(10,2),
    slot_type               VARCHAR(30)     DEFAULT 'production'
                            CHECK (slot_type IN ('production', 'setup', 'maintenance', 'idle', 'reserved')),
    operator_id             VARCHAR(20),
    priority                INT             DEFAULT 50,
    is_locked               BOOLEAN         DEFAULT FALSE,
    locked_by               UUID            REFERENCES users(user_id),
    locked_reason           TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (machine_id, slot_date, start_time)
);
COMMENT ON TABLE production_schedule_slots IS 'APS Lite scheduling slots per machine / Khung lich trinh san xuat APS theo may';

CREATE INDEX IF NOT EXISTS idx_schedule_slots_machine ON production_schedule_slots (machine_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_date ON production_schedule_slots (slot_date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_wo ON production_schedule_slots (wo_number);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_jo ON production_schedule_slots (jo_number);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_operator ON production_schedule_slots (operator_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_type ON production_schedule_slots (slot_type);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_locked ON production_schedule_slots (is_locked);

-- ============================================================================
-- schedule_conflicts / Xung dot lich trinh
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    conflict_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    conflict_type           schedule_conflict_type_enum NOT NULL,
    severity                VARCHAR(20)     DEFAULT 'warning',
    slot_id_a               UUID            REFERENCES production_schedule_slots(slot_id),
    slot_id_b               UUID            REFERENCES production_schedule_slots(slot_id),
    machine_id              VARCHAR(50),
    conflict_date           DATE,
    description             TEXT,
    description_vi          TEXT,
    resolved                BOOLEAN         DEFAULT FALSE,
    resolved_by             UUID            REFERENCES users(user_id),
    resolved_at             TIMESTAMPTZ,
    resolution_action       TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE schedule_conflicts IS 'Detected scheduling conflicts / Xung dot lich trinh duoc phat hien';

CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_type ON schedule_conflicts (conflict_type);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_slot_a ON schedule_conflicts (slot_id_a);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_slot_b ON schedule_conflicts (slot_id_b);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_machine ON schedule_conflicts (machine_id);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_date ON schedule_conflicts (conflict_date);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_resolved ON schedule_conflicts (resolved);

-- ============================================================================
-- capacity_snapshots / Anh chup cong suat hang ngay
-- ============================================================================
CREATE TABLE IF NOT EXISTS capacity_snapshots (
    snapshot_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id              VARCHAR(50)     NOT NULL,
    snapshot_date           DATE            NOT NULL,
    available_minutes       NUMERIC(10,2),
    scheduled_minutes       NUMERIC(10,2),
    actual_minutes          NUMERIC(10,2),
    utilization_pct         NUMERIC(5,2),
    setup_minutes           NUMERIC(10,2),
    idle_minutes            NUMERIC(10,2),
    maintenance_minutes     NUMERIC(10,2),
    downtime_minutes        NUMERIC(10,2),
    jobs_completed          INT             DEFAULT 0,
    parts_produced          INT             DEFAULT 0,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (machine_id, snapshot_date)
);
COMMENT ON TABLE capacity_snapshots IS 'Daily capacity utilization snapshots per machine / Anh chup cong suat su dung hang ngay theo may';

CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_machine ON capacity_snapshots (machine_id);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_date ON capacity_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_utilization ON capacity_snapshots (utilization_pct);

COMMIT;
