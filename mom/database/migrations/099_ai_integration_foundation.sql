-- ============================================================================
-- Migration: 099_ai_integration_foundation.sql
-- Description: AI Integration Foundation — chat conversations, feedback loops,
--              training datasets, extended machine telemetry, recommendation
--              action tracking for Phase 1B backend AI integration
-- Dependencies: 041_ai_predictive_quality_aps.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE ai_recommendation_actions, machine_telemetry_extended,
--           ai_training_datasets, ai_feedback_loops, ai_conversations CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ai_conversations / Lich su hoi thoai AI (giao dien truy van ngon ngu tu nhien)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    conversation_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ID nguoi dung / User identifier
    user_id                 UUID            NOT NULL,
    -- Loai ngu canh hoi thoai / Conversation context type
    context_type            VARCHAR(50)     NOT NULL DEFAULT 'production_query'
                            CHECK (context_type IN (
                                'production_query', 'ncr_analysis',
                                'scheduling', 'document_summary'
                            )),
    -- Danh sach tin nhan JSON / Message list as JSON array
    -- Format: [{role: 'user'|'assistant', content: string, timestamp: ISO8601}]
    messages                JSONB           NOT NULL DEFAULT '[]'::jsonb,
    -- Du lieu mo rong / Extended metadata
    metadata                JSONB           DEFAULT '{}'::jsonb,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80)     NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version             BIGINT          NOT NULL DEFAULT 1
);
COMMENT ON TABLE ai_conversations IS 'AI chat conversation history for NL query interface / Lich su hoi thoai AI cho giao dien truy van ngon ngu tu nhien';
COMMENT ON COLUMN ai_conversations.context_type IS 'Conversation context: production_query, ncr_analysis, scheduling, document_summary / Ngu canh hoi thoai';
COMMENT ON COLUMN ai_conversations.messages IS 'JSON array of messages [{role, content, timestamp}] / Mang JSON cac tin nhan';

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created
    ON ai_conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_context_created
    ON ai_conversations (context_type, created_at DESC);

-- ============================================================================
-- ai_feedback_loops / Vong phan hoi AI (phan hoi tu van hanh vien/quan ly)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_feedback_loops (
    feedback_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ID du doan lien quan / Related prediction identifier
    prediction_id           UUID            NOT NULL,
    -- ID nguoi phan hoi / User who provided feedback
    user_id                 UUID            NOT NULL,
    -- Loai phan hoi / Feedback classification
    feedback_type           VARCHAR(30)     NOT NULL
                            CHECK (feedback_type IN (
                                'correct', 'incorrect',
                                'partially_correct', 'not_applicable'
                            )),
    -- Dieu chinh do tin cay / Confidence score adjustment
    confidence_adjustment   NUMERIC(5,2)    DEFAULT 0,
    -- Ghi chu tu nguoi dung / User notes
    notes                   TEXT,
    -- Ket qua thuc te / Actual observed outcome
    actual_outcome          JSONB,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80)     NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version             BIGINT          NOT NULL DEFAULT 1
);
COMMENT ON TABLE ai_feedback_loops IS 'Operator/manager feedback on AI predictions / Phan hoi cua van hanh vien/quan ly ve du doan AI';
COMMENT ON COLUMN ai_feedback_loops.feedback_type IS 'Feedback type: correct, incorrect, partially_correct, not_applicable / Loai phan hoi';
COMMENT ON COLUMN ai_feedback_loops.confidence_adjustment IS 'Numeric adjustment to prediction confidence / Dieu chinh do tin cay du doan';

CREATE INDEX IF NOT EXISTS idx_ai_feedback_prediction_created
    ON ai_feedback_loops (prediction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_created
    ON ai_feedback_loops (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type
    ON ai_feedback_loops (feedback_type);

-- ============================================================================
-- ai_training_datasets / Bo du lieu huan luyen AI (ETL snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_training_datasets (
    dataset_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Ten bo du lieu / Dataset name
    dataset_name            VARCHAR(200)    NOT NULL,
    -- Loai mo hinh / Target model type
    model_type              VARCHAR(50)     NOT NULL,
    -- Truy van nguon du lieu / Source data query
    source_query            TEXT,
    -- So dong du lieu / Number of data rows
    row_count               INT             DEFAULT 0,
    -- Cac cot dac trung JSON / Feature columns as JSON array
    feature_columns         JSONB           DEFAULT '[]'::jsonb,
    -- Cot nhan / Label column name
    label_column            VARCHAR(100),
    -- Pham vi ngay bat dau / Date range start
    date_range_start        DATE,
    -- Pham vi ngay ket thuc / Date range end
    date_range_end          DATE,
    -- Duong dan file / File storage path
    file_path               VARCHAR(500),
    -- Trang thai chuan bi / Dataset preparation status
    status                  VARCHAR(30)     NOT NULL DEFAULT 'preparing'
                            CHECK (status IN (
                                'preparing', 'ready', 'training', 'archived'
                            )),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    -- Nguoi tao / Created by user
    created_by              UUID,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80)     NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             BIGINT          NOT NULL DEFAULT 1
);
COMMENT ON TABLE ai_training_datasets IS 'ETL snapshots for ML model training / Bo du lieu ETL cho huan luyen mo hinh ML';
COMMENT ON COLUMN ai_training_datasets.model_type IS 'Target model type for this dataset / Loai mo hinh muc tieu';
COMMENT ON COLUMN ai_training_datasets.status IS 'Dataset status: preparing, ready, training, archived / Trang thai bo du lieu';
COMMENT ON COLUMN ai_training_datasets.feature_columns IS 'JSON array of feature column names / Mang JSON ten cac cot dac trung';

CREATE INDEX IF NOT EXISTS idx_ai_training_model_status
    ON ai_training_datasets (model_type, status);
CREATE INDEX IF NOT EXISTS idx_ai_training_status_created
    ON ai_training_datasets (status, created_at DESC);

-- ============================================================================
-- machine_telemetry_extended / Du lieu cam bien may mo rong (cho ML)
-- ============================================================================
CREATE TABLE IF NOT EXISTS machine_telemetry_extended (
    telemetry_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ID may / Machine identifier
    machine_id              VARCHAR(50)     NOT NULL,
    -- Thoi diem ghi nhan / Sensor reading timestamp
    timestamp               TIMESTAMPTZ     NOT NULL,
    -- Rung dong truc X / Vibration axis X
    vibration_x             NUMERIC(10,4),
    -- Rung dong truc Y / Vibration axis Y
    vibration_y             NUMERIC(10,4),
    -- Rung dong truc Z / Vibration axis Z
    vibration_z             NUMERIC(10,4),
    -- Nhiet do truc chinh / Spindle temperature
    spindle_temperature     NUMERIC(8,2),
    -- Nhiet do dung dich lam mat / Coolant temperature
    coolant_temperature     NUMERIC(8,2),
    -- Tai truc chinh (%) / Spindle load percentage
    spindle_load_pct        NUMERIC(5,2),
    -- Toc do tien thuc te / Actual feed rate
    feed_rate_actual        NUMERIC(10,4),
    -- Toc do truc chinh thuc te / Actual spindle speed
    spindle_speed_actual    NUMERIC(10,2),
    -- Cong suat tieu thu (kW) / Power consumption in kilowatts
    power_consumption_kw    NUMERIC(8,3),
    -- ID dung cu / Tool identifier
    tool_id                 VARCHAR(50),
    -- Thu tu nguyen cong / Operation sequence number
    operation_seq           INT,
    -- So lenh san xuat / Work order number
    wo_number               VARCHAR(50),
    -- Du lieu mo rong / Extended metadata
    metadata                JSONB           DEFAULT '{}'::jsonb,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80)     NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             BIGINT          NOT NULL DEFAULT 1
);
COMMENT ON TABLE machine_telemetry_extended IS 'Extended machine sensor data for ML predictive models / Du lieu cam bien may mo rong cho mo hinh du doan ML';
COMMENT ON COLUMN machine_telemetry_extended.vibration_x IS 'Vibration reading axis X / Gia tri rung dong truc X';
COMMENT ON COLUMN machine_telemetry_extended.spindle_temperature IS 'Spindle temperature in Celsius / Nhiet do truc chinh (do C)';
COMMENT ON COLUMN machine_telemetry_extended.power_consumption_kw IS 'Power consumption in kilowatts / Cong suat tieu thu (kW)';

CREATE INDEX IF NOT EXISTS idx_telemetry_ext_machine_ts
    ON machine_telemetry_extended (machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_ext_tool_ts
    ON machine_telemetry_extended (tool_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_ext_wo_ts
    ON machine_telemetry_extended (wo_number, timestamp DESC);

-- ============================================================================
-- ai_recommendation_actions / Hanh dong tu dong tu du doan AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recommendation_actions (
    action_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ID du doan nguon / Source prediction identifier
    prediction_id           UUID            NOT NULL,
    -- Loai hanh dong / Action type classification
    action_type             VARCHAR(50)     NOT NULL
                            CHECK (action_type IN (
                                'auto_ncr', 'maintenance_request',
                                'schedule_adjustment', 'alert_sent',
                                'tool_change_order'
                            )),
    -- Du lieu hanh dong JSON / Action payload as JSON
    action_payload          JSONB           DEFAULT '{}'::jsonb,
    -- Trang thai thuc thi / Execution status
    status                  VARCHAR(30)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'executed', 'failed', 'cancelled'
                            )),
    -- Thoi diem thuc thi / Timestamp when action was executed
    executed_at             TIMESTAMPTZ,
    -- Ket qua thuc thi / Execution result
    result                  JSONB,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80)     NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version             BIGINT          NOT NULL DEFAULT 1
);
COMMENT ON TABLE ai_recommendation_actions IS 'Automated actions triggered by AI predictions / Hanh dong tu dong duoc kich hoat tu du doan AI';
COMMENT ON COLUMN ai_recommendation_actions.action_type IS 'Action type: auto_ncr, maintenance_request, schedule_adjustment, alert_sent, tool_change_order / Loai hanh dong';
COMMENT ON COLUMN ai_recommendation_actions.status IS 'Execution status: pending, executed, failed, cancelled / Trang thai thuc thi';

CREATE INDEX IF NOT EXISTS idx_ai_actions_prediction
    ON ai_recommendation_actions (prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status_created
    ON ai_recommendation_actions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_type_status
    ON ai_recommendation_actions (action_type, status);

COMMIT;
