-- ============================================================================
-- Migration 025: MES — Manufacturing Execution System
-- He thong Thuc thi San xuat HESEM
-- ============================================================================
-- Date    : 2026-03-29
-- Standard: ISA-95 / ISA-88 / SEMI E10 / MTConnect / AS9100D
-- Scope   : New MES enum types, ALTER existing tables, 30 new MES tables,
--           MES indexes, views, trigger functions, seed data
-- Rollback: See ROLLBACK section at end of file
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: NEW ENUM TYPES FOR MES
-- ============================================================================

-- Equipment state (used on existing equipment table)
DO $$ BEGIN
    CREATE TYPE equipment_state_enum AS ENUM (
        'productive', 'standby', 'engineering', 'scheduled_down', 'unscheduled_down', 'non_scheduled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SEMI E10 Equipment States
DO $$ BEGIN
    CREATE TYPE semi_e10_state AS ENUM (
        'PRODUCTIVE', 'STANDBY', 'ENGINEERING', 'SCHEDULED_DOWN', 'UNSCHEDULED_DOWN', 'NON_SCHEDULED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SEMI E10 Sub-States for Productive
DO $$ BEGIN
    CREATE TYPE productive_substate AS ENUM (
        'REGULAR_PRODUCTION', 'REWORK', 'ENGINEERING_RUN', 'WORK_FOR_OTHERS'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SEMI E10 Sub-States for Standby
DO $$ BEGIN
    CREATE TYPE standby_substate AS ENUM (
        'NO_OPERATOR', 'NO_MATERIAL', 'NO_TOOLING', 'NO_PROGRAM',
        'QUALITY_HOLD', 'CHANGEOVER', 'WAITING_APPROVAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SEMI E10 Sub-States for Unscheduled Down
DO $$ BEGIN
    CREATE TYPE unsched_down_substate AS ENUM (
        'MECHANICAL_FAILURE', 'ELECTRICAL_FAILURE', 'SOFTWARE_FAILURE',
        'TOOLING_FAILURE', 'COOLANT_ISSUE', 'AIR_PRESSURE',
        'SPINDLE_ALARM', 'AXIS_ALARM', 'OTHER_FAILURE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Machine execution mode
DO $$ BEGIN
    CREATE TYPE machine_exec_mode AS ENUM (
        'AUTOMATIC', 'MANUAL', 'MDI', 'JOG', 'REFERENCE', 'EDIT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MES event severity
DO $$ BEGIN
    CREATE TYPE mes_event_severity AS ENUM ('INFO', 'WARNING', 'ALARM', 'CRITICAL', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cycle phase
DO $$ BEGIN
    CREATE TYPE cycle_phase AS ENUM (
        'SETUP', 'FIRST_PIECE', 'PRODUCTION_RUN', 'LAST_PIECE', 'TEARDOWN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- OEE loss category (TPM six big losses)
DO $$ BEGIN
    CREATE TYPE oee_loss_category AS ENUM (
        'EQUIPMENT_FAILURE', 'SETUP_ADJUSTMENT', 'IDLING_MINOR_STOPS',
        'REDUCED_SPEED', 'PROCESS_DEFECTS', 'REDUCED_YIELD'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Material consumption type
DO $$ BEGIN
    CREATE TYPE material_consumption_type AS ENUM (
        'ISSUED', 'CONSUMED', 'RETURNED', 'SCRAPPED', 'ADJUSTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Dispatch priority
DO $$ BEGIN
    CREATE TYPE dispatch_priority_enum AS ENUM (
        'AOG', 'HOT', 'RUSH', 'STANDARD', 'LOW'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART 2: ALTER EXISTING TABLES — Add MES columns
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 equipment — MES real-time & connectivity columns
-- ---------------------------------------------------------------------------
ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS machine_state equipment_state_enum DEFAULT 'non_scheduled',
    ADD COLUMN IF NOT EXISTS current_spindle_rpm NUMERIC(8,1),
    ADD COLUMN IF NOT EXISTS spindle_load_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS feed_override_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS current_program_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS current_tool_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS part_count_shift INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS heartbeat_sla_seconds INT DEFAULT 300,
    ADD COLUMN IF NOT EXISTS mtconnect_agent_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS opc_ua_endpoint VARCHAR(500),
    ADD COLUMN IF NOT EXISTS mqtt_topic VARCHAR(200),
    ADD COLUMN IF NOT EXISTS connector_type VARCHAR(30) DEFAULT 'manual_bridge',
    ADD COLUMN IF NOT EXISTS spindle_max_rpm NUMERIC(8,1),
    ADD COLUMN IF NOT EXISTS spindle_power_kw NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS spindle_taper VARCHAR(20),
    ADD COLUMN IF NOT EXISTS atc_capacity INT,
    ADD COLUMN IF NOT EXISTS probe_system_installed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS work_envelope_x_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS work_envelope_y_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS work_envelope_z_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS positioning_accuracy_microns NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS repeatability_microns NUMERIC(6,2);

-- ---------------------------------------------------------------------------
-- 2.2 job_operations — MES cycle/production tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE job_operations
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cycle_time_seconds INT,
    ADD COLUMN IF NOT EXISTS part_count_expected INT,
    ADD COLUMN IF NOT EXISTS part_count_actual INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS part_count_scrap INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS downtime_total_seconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_id_used VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tool_life_at_start NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS program_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS program_revision VARCHAR(20),
    ADD COLUMN IF NOT EXISTS setup_verified_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS setup_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_piece_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS first_piece_verified_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS first_piece_verified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2.3 labor_transactions — MES operator session columns
-- ---------------------------------------------------------------------------
ALTER TABLE labor_transactions
    ADD COLUMN IF NOT EXISTS login_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS logout_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS machine_id_assigned VARCHAR(50),
    ADD COLUMN IF NOT EXISTS downtime_reason_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS idle_seconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_change_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS program_change_count INT DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2.4 production_schedule — MES scheduling columns
-- ---------------------------------------------------------------------------
ALTER TABLE production_schedule
    ADD COLUMN IF NOT EXISTS actual_setup_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_setup_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_run_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_run_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS schedule_adherence_pct NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS changeover_time_planned NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS changeover_time_actual NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS material_wait_minutes INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS machine_conflict_flag BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS dispatch_priority INT DEFAULT 50;

-- ---------------------------------------------------------------------------
-- 2.5 tools — MES real-time tool tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS current_machine_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS current_spindle_position INT,
    ADD COLUMN IF NOT EXISTS last_mounted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tool_usage_minutes_total INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_usage_parts_total INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS edge_count INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS current_edge_index INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS vibration_signature JSONB,
    ADD COLUMN IF NOT EXISTS tool_preset_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tool_life_tracking_method VARCHAR(30) DEFAULT 'parts_count',
    ADD COLUMN IF NOT EXISTS tool_life_alert_threshold_pct NUMERIC(5,2) DEFAULT 80.0;

-- ---------------------------------------------------------------------------
-- 2.6 maintenance_work_orders — MES PM tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE maintenance_work_orders
    ADD COLUMN IF NOT EXISTS equipment_run_hours_at_creation NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pm_trigger_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS pm_trigger_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS next_pm_due_date DATE,
    ADD COLUMN IF NOT EXISTS next_pm_due_hours NUMERIC(10,2);


-- ============================================================================
-- PART 3: NEW MES TABLES (30 tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-1.1 mes_sites / Nha may (ISA-95 Level 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_sites (
    site_id             VARCHAR(30)     PRIMARY KEY,
    site_name           VARCHAR(200)    NOT NULL,
    site_name_vi        VARCHAR(200),
    site_address        TEXT,
    timezone            VARCHAR(50)     NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    gps_lat             NUMERIC(10,7),
    gps_lon             NUMERIC(10,7),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_sites IS 'ISA-95 Site level. / Cap Nha may ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.2 mes_areas / Khu vuc san xuat (ISA-95 Level 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_areas (
    area_id             VARCHAR(30)     PRIMARY KEY,
    area_name           VARCHAR(200)    NOT NULL,
    area_name_vi        VARCHAR(200),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_type           VARCHAR(50),
    floor_plan_path     TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_areas IS 'ISA-95 Area level. / Cap Khu vuc ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.3 mes_equipment_extended / Mo rong thiet bi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_equipment_extended (
    equipment_id        VARCHAR(50)     PRIMARY KEY REFERENCES equipment(equipment_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_ip_address  INET,
    mtconnect_agent_url TEXT,
    opc_ua_endpoint     TEXT,
    fanuc_focas_port    INT,
    controller_type     VARCHAR(100),
    controller_version  VARCHAR(50),
    num_axes            INT,
    max_spindle_speed   INT,
    max_feed_rate       NUMERIC(10,2),
    spindle_power_kw    NUMERIC(8,2),
    table_size_x_mm     NUMERIC(10,2),
    table_size_y_mm     NUMERIC(10,2),
    max_part_weight_kg  NUMERIC(10,2),
    tool_magazine_capacity INT,
    pallet_count        INT             DEFAULT 1,
    coolant_type        VARCHAR(50),
    cad_model_path      TEXT,
    plc_tag_map         JSONB,
    current_e10_state   semi_e10_state  DEFAULT 'NON_SCHEDULED',
    current_program     VARCHAR(200),
    current_job_number  VARCHAR(50),
    current_operator_id VARCHAR(20),
    last_heartbeat_at   TIMESTAMPTZ,
    oee_current_shift   NUMERIC(5,2),
    oee_today           NUMERIC(5,2),
    oee_wtd             NUMERIC(5,2),
    oee_mtd             NUMERIC(5,2),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_equipment_extended IS 'MES extension of equipment master. 1:1 with equipment table.';
CREATE INDEX IF NOT EXISTS idx_meseq_area ON mes_equipment_extended (area_id);
CREATE INDEX IF NOT EXISTS idx_meseq_wc ON mes_equipment_extended (work_center_id);
CREATE INDEX IF NOT EXISTS idx_meseq_state ON mes_equipment_extended (current_e10_state);
CREATE INDEX IF NOT EXISTS idx_meseq_heartbeat ON mes_equipment_extended (last_heartbeat_at);

-- ---------------------------------------------------------------------------
-- MES-2.1 mes_machine_state_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_machine_state_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    e10_state           semi_e10_state  NOT NULL,
    productive_sub      productive_substate,
    standby_sub         standby_substate,
    unsched_down_sub    unsched_down_substate,
    exec_mode           machine_exec_mode,
    reason_code         VARCHAR(50),
    reason_text         VARCHAR(500),
    operator_id         VARCHAR(20),
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    shift_code          VARCHAR(5),
    duration_seconds    NUMERIC(12,2),
    source              VARCHAR(30)     DEFAULT 'MTConnect',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
COMMENT ON TABLE mes_machine_state_events IS 'SEMI E10 state transitions. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mse_equip_time ON mes_machine_state_events (equipment_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mse_state ON mes_machine_state_events (e10_state, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mse_job ON mes_machine_state_events (job_number, event_time DESC)
    WHERE job_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-2.2 mes_machine_telemetry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_machine_telemetry (
    ts                  TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    spindle_speed_rpm   NUMERIC(10,2),
    spindle_speed_cmd   NUMERIC(10,2),
    spindle_load_pct    NUMERIC(6,2),
    spindle_torque_nm   NUMERIC(10,2),
    spindle_power_kw    NUMERIC(8,2),
    spindle_temp_c      NUMERIC(6,2),
    feed_rate_actual    NUMERIC(10,2),
    feed_rate_cmd       NUMERIC(10,2),
    feed_override_pct   NUMERIC(6,2),
    rapid_override_pct  NUMERIC(6,2),
    axis_x_pos          NUMERIC(12,6),
    axis_y_pos          NUMERIC(12,6),
    axis_z_pos          NUMERIC(12,6),
    axis_a_pos          NUMERIC(10,4),
    axis_c_pos          NUMERIC(10,4),
    axis_x_load_pct     NUMERIC(6,2),
    axis_y_load_pct     NUMERIC(6,2),
    axis_z_load_pct     NUMERIC(6,2),
    coolant_pressure_bar NUMERIC(8,2),
    coolant_flow_lpm    NUMERIC(8,2),
    coolant_temp_c      NUMERIC(6,2),
    coolant_concentration_pct NUMERIC(5,2),
    ambient_temp_c      NUMERIC(6,2),
    machine_temp_c      NUMERIC(6,2),
    vibration_mm_s      NUMERIC(8,4),
    program_name        VARCHAR(200),
    program_block       VARCHAR(50),
    tool_number         INT,
    parts_count_shift   INT,
    cycle_time_last_sec NUMERIC(10,2),
    total_power_kw      NUMERIC(8,2)
);
COMMENT ON TABLE mes_machine_telemetry IS 'High-frequency machine sensor data. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mtel_equip_ts ON mes_machine_telemetry (equipment_id, ts DESC);

-- ---------------------------------------------------------------------------
-- MES-2.5 mes_machine_alarms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_machine_alarms (
    alarm_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    alarm_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    alarm_code          VARCHAR(50)     NOT NULL,
    alarm_text          VARCHAR(500),
    alarm_severity      mes_event_severity NOT NULL DEFAULT 'ALARM',
    alarm_group         VARCHAR(50),
    axis_name           VARCHAR(10),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    cleared_at          TIMESTAMPTZ,
    cleared_by          VARCHAR(20),
    duration_seconds    NUMERIC(10,2),
    caused_downtime     BOOLEAN         DEFAULT FALSE,
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    operator_id         VARCHAR(20),
    source              VARCHAR(30)     DEFAULT 'MTConnect',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (alarm_id, alarm_time)
);
COMMENT ON TABLE mes_machine_alarms IS 'Machine alarm/fault events. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_malm_equip ON mes_machine_alarms (equipment_id, alarm_time DESC);
CREATE INDEX IF NOT EXISTS idx_malm_code ON mes_machine_alarms (alarm_code, alarm_time DESC);
CREATE INDEX IF NOT EXISTS idx_malm_active ON mes_machine_alarms (equipment_id) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-2.6 mes_program_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_program_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,
    program_name        VARCHAR(200),
    program_comment     VARCHAR(500),
    tool_number_from    INT,
    tool_number_to      INT,
    block_number        VARCHAR(50),
    job_number          VARCHAR(50),
    part_count_at_event INT,
    operator_id         VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
COMMENT ON TABLE mes_program_events IS 'NC program execution events. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mpev_equip ON mes_program_events (equipment_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mpev_type ON mes_program_events (event_type, event_time DESC);

-- ---------------------------------------------------------------------------
-- MES-3.1 mes_job_execution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_job_execution (
    job_exec_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL UNIQUE,
    first_setup_start   TIMESTAMPTZ,
    first_piece_complete TIMESTAMPTZ,
    last_piece_complete TIMESTAMPTZ,
    job_closed_at       TIMESTAMPTZ,
    total_good_qty      NUMERIC(12,2)   DEFAULT 0,
    total_scrap_qty     NUMERIC(12,2)   DEFAULT 0,
    total_rework_qty    NUMERIC(12,2)   DEFAULT 0,
    total_setup_time_sec NUMERIC(12,2)  DEFAULT 0,
    total_run_time_sec  NUMERIC(12,2)   DEFAULT 0,
    total_idle_time_sec NUMERIC(12,2)   DEFAULT 0,
    total_down_time_sec NUMERIC(12,2)   DEFAULT 0,
    avg_cycle_time_sec  NUMERIC(10,2),
    target_cycle_time_sec NUMERIC(10,2),
    cycle_time_std_dev  NUMERIC(10,4),
    current_operation_seq INT,
    current_equipment_id VARCHAR(50),
    is_on_hold          BOOLEAN         DEFAULT FALSE,
    hold_reason         TEXT,
    material_lots_used  TEXT[],
    operator_ids        TEXT[],
    machines_used       TEXT[],
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_job_execution IS 'Real-time job execution overlay.';
CREATE INDEX IF NOT EXISTS idx_mjexec_active ON mes_job_execution (job_number)
    WHERE job_closed_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-3.2 mes_operation_execution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_operation_execution (
    op_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    queue_entry_at      TIMESTAMPTZ,
    setup_start_at      TIMESTAMPTZ,
    setup_end_at        TIMESTAMPTZ,
    run_start_at        TIMESTAMPTZ,
    first_piece_at      TIMESTAMPTZ,
    last_piece_at       TIMESTAMPTZ,
    teardown_start_at   TIMESTAMPTZ,
    teardown_end_at     TIMESTAMPTZ,
    qty_started         NUMERIC(12,2)   DEFAULT 0,
    qty_good            NUMERIC(12,2)   DEFAULT 0,
    qty_scrap           NUMERIC(12,2)   DEFAULT 0,
    qty_rework          NUMERIC(12,2)   DEFAULT 0,
    setup_time_actual   NUMERIC(10,2),
    run_time_actual     NUMERIC(10,2),
    teardown_time_actual NUMERIC(10,2),
    idle_time_total     NUMERIC(10,2),
    down_time_total     NUMERIC(10,2),
    avg_cycle_time_sec  NUMERIC(10,2),
    min_cycle_time_sec  NUMERIC(10,2),
    max_cycle_time_sec  NUMERIC(10,2),
    std_cycle_time_sec  NUMERIC(10,4),
    target_cycle_time_sec NUMERIC(10,2),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    operator_id         VARCHAR(20),
    program_name        VARCHAR(200),
    program_revision    VARCHAR(20),
    phase               cycle_phase     DEFAULT 'SETUP',
    is_complete         BOOLEAN         DEFAULT FALSE,
    scrap_reason_codes  JSONB           DEFAULT '[]',
    rework_reason_codes JSONB           DEFAULT '[]',
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (job_number, operation_seq, equipment_id)
);
COMMENT ON TABLE mes_operation_execution IS 'Real-time operation execution with cycle times and OEE.';
CREATE INDEX IF NOT EXISTS idx_mopexec_job ON mes_operation_execution (job_number, operation_seq);
CREATE INDEX IF NOT EXISTS idx_mopexec_equip ON mes_operation_execution (equipment_id) WHERE is_complete = FALSE;
CREATE INDEX IF NOT EXISTS idx_mopexec_active ON mes_operation_execution (equipment_id, updated_at DESC) WHERE is_complete = FALSE;

-- ---------------------------------------------------------------------------
-- MES-3.3 mes_cycle_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_cycle_events (
    cycle_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    cycle_end_time      TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_sequence       INT,
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    cycle_start_time    TIMESTAMPTZ     NOT NULL,
    cycle_time_sec      NUMERIC(10,2)   NOT NULL,
    chip_to_chip_sec    NUMERIC(10,2),
    program_name        VARCHAR(200),
    tool_list_used      INT[],
    operator_id         VARCHAR(20),
    pass_fail           VARCHAR(4)      CHECK (pass_fail IN ('PASS', 'FAIL', 'HOLD')),
    scrap_reason_code   VARCHAR(50),
    rework_reason_code  VARCHAR(50),
    material_lot_number VARCHAR(100),
    material_heat_number VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (cycle_id, cycle_end_time)
);
COMMENT ON TABLE mes_cycle_events IS 'Per-part cycle event for traceability. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mcyc_equip ON mes_cycle_events (equipment_id, cycle_end_time DESC);
CREATE INDEX IF NOT EXISTS idx_mcyc_job ON mes_cycle_events (job_number, operation_seq, cycle_end_time DESC);
CREATE INDEX IF NOT EXISTS idx_mcyc_serial ON mes_cycle_events (serial_number, cycle_end_time DESC) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcyc_lot ON mes_cycle_events (lot_number, cycle_end_time DESC) WHERE lot_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-4.1 mes_oee_loss_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_oee_loss_events (
    loss_id             BIGINT          GENERATED ALWAYS AS IDENTITY,
    loss_time           TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    loss_category       oee_loss_category NOT NULL,
    loss_reason_code    VARCHAR(50),
    loss_reason_text    VARCHAR(500),
    duration_seconds    NUMERIC(10,2)   NOT NULL,
    lost_units          NUMERIC(10,2),
    shift_code          VARCHAR(5),
    job_number          VARCHAR(50),
    operation_seq       INT,
    operator_id         VARCHAR(20),
    source_event_id     BIGINT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (loss_id, loss_time)
);
COMMENT ON TABLE mes_oee_loss_events IS 'OEE loss tracking by TPM six big losses. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_moee_equip ON mes_oee_loss_events (equipment_id, loss_time DESC);
CREATE INDEX IF NOT EXISTS idx_moee_cat ON mes_oee_loss_events (loss_category, loss_time DESC);

-- ---------------------------------------------------------------------------
-- MES-4.2 mes_oee_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_oee_snapshots (
    snapshot_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    snapshot_date       DATE            NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL,
    planned_production_time_sec NUMERIC(12,2) NOT NULL,
    actual_run_time_sec NUMERIC(12,2)   NOT NULL,
    downtime_sec        NUMERIC(12,2)   DEFAULT 0,
    setup_time_sec      NUMERIC(12,2)   DEFAULT 0,
    availability        NUMERIC(5,4)    NOT NULL,
    ideal_cycle_time_sec NUMERIC(10,2),
    total_pieces        NUMERIC(12,2)   DEFAULT 0,
    performance         NUMERIC(5,4)    NOT NULL,
    good_pieces         NUMERIC(12,2)   DEFAULT 0,
    defect_pieces       NUMERIC(12,2)   DEFAULT 0,
    rework_pieces       NUMERIC(12,2)   DEFAULT 0,
    quality             NUMERIC(5,4)    NOT NULL,
    oee                 NUMERIC(5,4)    GENERATED ALWAYS AS (availability * performance * quality) STORED,
    primary_job_number  VARCHAR(50),
    operator_ids        TEXT[],
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, snapshot_date, shift_code)
);
COMMENT ON TABLE mes_oee_snapshots IS 'Pre-calculated OEE per machine per shift.';
CREATE INDEX IF NOT EXISTS idx_moees_equip_date ON mes_oee_snapshots (equipment_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_moees_oee ON mes_oee_snapshots (oee, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- MES-5.1 mes_inline_measurements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_inline_measurements (
    measurement_id      BIGINT          GENERATED ALWAYS AS IDENTITY,
    measured_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_number         VARCHAR(100)    NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    part_sequence       INT,
    characteristic_id   VARCHAR(100)    NOT NULL,
    characteristic_name VARCHAR(300),
    char_type           char_type_enum,
    char_designator     char_designator DEFAULT 'Standard',
    nominal             NUMERIC(14,6),
    usl                 NUMERIC(14,6),
    lsl                 NUMERIC(14,6),
    unit                measurement_unit,
    measured_value      NUMERIC(14,6)   NOT NULL,
    deviation           NUMERIC(14,6),
    conformance         VARCHAR(2)      NOT NULL CHECK (conformance IN ('C', 'NC')),
    measurement_source  VARCHAR(50),
    gage_id             VARCHAR(50),
    measuring_program   VARCHAR(200),
    operator_id         VARCHAR(20),
    spc_subgroup        INT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (measurement_id, measured_at)
);
COMMENT ON TABLE mes_inline_measurements IS 'In-process measurements. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mimeas_equip ON mes_inline_measurements (equipment_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mimeas_job ON mes_inline_measurements (job_number, operation_seq, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mimeas_char ON mes_inline_measurements (characteristic_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mimeas_serial ON mes_inline_measurements (serial_number, measured_at DESC) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mimeas_nc ON mes_inline_measurements (measured_at DESC) WHERE conformance = 'NC';

-- ---------------------------------------------------------------------------
-- MES-5.2 mes_spc_control_limits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_spc_control_limits (
    limit_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    characteristic_id   VARCHAR(100)    NOT NULL,
    chart_type          spc_chart_type_enum NOT NULL DEFAULT 'xbar_r',
    subgroup_size       INT             NOT NULL DEFAULT 5,
    ucl_xbar            NUMERIC(14,6),
    lcl_xbar            NUMERIC(14,6),
    cl_xbar             NUMERIC(14,6),
    ucl_range           NUMERIC(14,6),
    lcl_range           NUMERIC(14,6),
    cl_range            NUMERIC(14,6),
    cp                  NUMERIC(8,4),
    cpk                 NUMERIC(8,4),
    pp                  NUMERIC(8,4),
    ppk                 NUMERIC(8,4),
    process_sigma       NUMERIC(8,4),
    study_date          DATE,
    sample_count        INT,
    calculated_by       UUID,
    approved_by         UUID,
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ
);
COMMENT ON TABLE mes_spc_control_limits IS 'SPC control limit definitions per characteristic.';
CREATE UNIQUE INDEX IF NOT EXISTS idx_mspc_current_unique
    ON mes_spc_control_limits (item_id, characteristic_id)
    WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_mspc_item ON mes_spc_control_limits (item_id, characteristic_id);

-- ---------------------------------------------------------------------------
-- MES-5.3 mes_spc_violations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_spc_violations (
    violation_id        BIGINT          GENERATED ALWAYS AS IDENTITY,
    detected_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    characteristic_id   VARCHAR(100)    NOT NULL,
    job_number          VARCHAR(50),
    rule_violated       VARCHAR(50)     NOT NULL,
    violation_value     NUMERIC(14,6),
    control_limit_hit   VARCHAR(10),
    acknowledged        BOOLEAN         DEFAULT FALSE,
    acknowledged_by     VARCHAR(20),
    acknowledged_at     TIMESTAMPTZ,
    corrective_action   TEXT,
    ncr_generated       BOOLEAN         DEFAULT FALSE,
    ncr_number          VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (violation_id, detected_at)
);
COMMENT ON TABLE mes_spc_violations IS 'Real-time SPC rule violations.';
CREATE INDEX IF NOT EXISTS idx_mspcv_equip ON mes_spc_violations (equipment_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_mspcv_item ON mes_spc_violations (item_id, characteristic_id, detected_at DESC);

-- ---------------------------------------------------------------------------
-- MES-6.1 mes_operator_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_operator_sessions (
    session_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL,
    login_at            TIMESTAMPTZ     NOT NULL,
    logout_at           TIMESTAMPTZ,
    initial_job_number  VARCHAR(50),
    login_method        VARCHAR(30)     DEFAULT 'badge',
    total_duration_sec  NUMERIC(10,2),
    productive_sec      NUMERIC(10,2),
    idle_sec            NUMERIC(10,2),
    erp_labor_txn_ids   UUID[],
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_operator_sessions IS 'Real-time operator sessions per machine.';
CREATE INDEX IF NOT EXISTS idx_mopsess_emp ON mes_operator_sessions (employee_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_mopsess_equip ON mes_operator_sessions (equipment_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_mopsess_active ON mes_operator_sessions (equipment_id) WHERE logout_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-6.2 mes_operator_qualifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_operator_qualifications (
    qual_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,
    qualification_type  VARCHAR(50)     NOT NULL,
    qualification_code  VARCHAR(50)     NOT NULL,
    qualification_level VARCHAR(20)     DEFAULT 'qualified',
    certified_date      DATE,
    expiry_date         DATE,
    certified_by        VARCHAR(20),
    training_record_id  UUID,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (employee_id, qualification_type, qualification_code)
);
COMMENT ON TABLE mes_operator_qualifications IS 'Operator qualification matrix.';
CREATE INDEX IF NOT EXISTS idx_moqal_emp ON mes_operator_qualifications (employee_id);
CREATE INDEX IF NOT EXISTS idx_moqal_code ON mes_operator_qualifications (qualification_type, qualification_code);
CREATE INDEX IF NOT EXISTS idx_moqal_expiry ON mes_operator_qualifications (expiry_date) WHERE expiry_date IS NOT NULL AND is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-6.3 mes_shift_handover
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_shift_handover (
    handover_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    handover_date       DATE            NOT NULL,
    shift_from          VARCHAR(5)      NOT NULL,
    shift_to            VARCHAR(5)      NOT NULL,
    operator_from       VARCHAR(20)     NOT NULL,
    operator_to         VARCHAR(20),
    job_in_progress     VARCHAR(50),
    operation_in_progress INT,
    parts_completed     NUMERIC(10,2),
    machine_state       semi_e10_state,
    issues_noted        TEXT,
    pending_actions     TEXT,
    quality_alerts      TEXT,
    tooling_status      TEXT,
    acknowledged_at     TIMESTAMPTZ,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shift_handover IS 'Shift handover log per machine.';
CREATE INDEX IF NOT EXISTS idx_mshh_equip ON mes_shift_handover (equipment_id, handover_date DESC);

-- ---------------------------------------------------------------------------
-- MES-7.1 mes_material_consumption
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_material_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50),
    item_id             VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    heat_number         VARCHAR(100),
    material_cert_number VARCHAR(100),
    consumption_type    material_consumption_type NOT NULL DEFAULT 'CONSUMED',
    qty_consumed        NUMERIC(12,4)   NOT NULL,
    qty_uom             VARCHAR(10)     NOT NULL DEFAULT 'EA',
    warehouse_id        VARCHAR(30),
    location_id         VARCHAR(50),
    operator_id         VARCHAR(20),
    erp_inv_txn_id      UUID,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_material_consumption IS 'Material consumption tracking per operation.';
CREATE INDEX IF NOT EXISTS idx_mmcons_job ON mes_material_consumption (job_number, operation_seq);
CREATE INDEX IF NOT EXISTS idx_mmcons_lot ON mes_material_consumption (lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mmcons_heat ON mes_material_consumption (heat_number) WHERE heat_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.2 mes_wip_location
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_wip_location (
    tracking_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    current_area_id     VARCHAR(30),
    current_equipment_id VARCHAR(50),
    current_operation_seq INT,
    current_status      VARCHAR(30)     DEFAULT 'IN_QUEUE',
    qty_at_location     NUMERIC(12,2)   DEFAULT 0,
    arrived_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_wip_location IS 'Real-time WIP location on shop floor.';
CREATE INDEX IF NOT EXISTS idx_mwiploc_job ON mes_wip_location (job_number);
CREATE INDEX IF NOT EXISTS idx_mwiploc_area ON mes_wip_location (current_area_id);
CREATE INDEX IF NOT EXISTS idx_mwiploc_equip ON mes_wip_location (current_equipment_id) WHERE current_equipment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.3 mes_wip_movements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_wip_movements (
    movement_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    moved_at            TIMESTAMPTZ     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    qty_moved           NUMERIC(12,2)   NOT NULL,
    from_area_id        VARCHAR(30),
    from_equipment_id   VARCHAR(50),
    from_operation_seq  INT,
    to_area_id          VARCHAR(30),
    to_equipment_id     VARCHAR(50),
    to_operation_seq    INT,
    moved_by            VARCHAR(20),
    move_reason         VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (movement_id, moved_at)
);
COMMENT ON TABLE mes_wip_movements IS 'WIP movement audit trail. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mwipmov_job ON mes_wip_movements (job_number, moved_at DESC);

-- ---------------------------------------------------------------------------
-- MES-8.1 mes_tool_life_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_tool_life_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    tool_id             VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,
    magazine_position   INT,
    life_count_at_event INT,
    life_time_at_event_min NUMERIC(10,2),
    life_remaining_pct  NUMERIC(5,2),
    wear_offset_length  NUMERIC(10,4),
    wear_offset_diameter NUMERIC(10,4),
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    operator_id         VARCHAR(20),
    breakage_detected_by VARCHAR(30),
    breakage_action     VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
COMMENT ON TABLE mes_tool_life_events IS 'Real-time tool life events. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mtle_tool ON mes_tool_life_events (tool_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mtle_equip ON mes_tool_life_events (equipment_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mtle_breakage ON mes_tool_life_events (event_time DESC) WHERE event_type = 'BREAKAGE';

-- ---------------------------------------------------------------------------
-- MES-8.2 mes_fixture_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_fixture_assignments (
    assignment_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id          VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50),
    operation_seq       INT,
    assigned_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    released_at         TIMESTAMPTZ,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    setup_verified      BOOLEAN         DEFAULT FALSE,
    setup_verified_by   VARCHAR(20),
    setup_verified_at   TIMESTAMPTZ,
    usage_count         INT             DEFAULT 0,
    max_usage_count     INT,
    last_inspection_date DATE,
    next_inspection_date DATE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_fixture_assignments IS 'Fixture assignment tracking per machine per job.';
CREATE INDEX IF NOT EXISTS idx_mfixt_fixture ON mes_fixture_assignments (fixture_id);
CREATE INDEX IF NOT EXISTS idx_mfixt_equip ON mes_fixture_assignments (equipment_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mfixt_job ON mes_fixture_assignments (job_number) WHERE job_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-9.1 mes_dispatch_queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_dispatch_queue (
    queue_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    dispatch_priority   dispatch_priority_enum NOT NULL DEFAULT 'STANDARD',
    sequence_in_queue   INT             NOT NULL,
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    est_setup_minutes   NUMERIC(8,2),
    est_run_minutes     NUMERIC(8,2),
    qty_to_produce      NUMERIC(12,2)   NOT NULL,
    queue_status        VARCHAR(30)     DEFAULT 'QUEUED',
    material_available  BOOLEAN         DEFAULT FALSE,
    tooling_available   BOOLEAN         DEFAULT FALSE,
    fixture_available   BOOLEAN         DEFAULT FALSE,
    operator_qualified  BOOLEAN         DEFAULT FALSE,
    all_constraints_met BOOLEAN         GENERATED ALWAYS AS (
        material_available AND tooling_available AND fixture_available AND operator_qualified
    ) STORED,
    planner_notes       TEXT,
    source_schedule_id  UUID,
    priority_score      INT             DEFAULT 0,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, job_number, operation_seq)
);
COMMENT ON TABLE mes_dispatch_queue IS 'Live dispatch queue per machine.';
CREATE INDEX IF NOT EXISTS idx_mdq_equip ON mes_dispatch_queue (equipment_id, sequence_in_queue) WHERE queue_status IN ('QUEUED', 'READY');
CREATE INDEX IF NOT EXISTS idx_mdq_priority ON mes_dispatch_queue (dispatch_priority, sequence_in_queue);
CREATE INDEX IF NOT EXISTS idx_mdq_constraints ON mes_dispatch_queue (equipment_id) WHERE all_constraints_met = FALSE AND queue_status = 'QUEUED';

-- ---------------------------------------------------------------------------
-- MES-10.1 mes_downtime_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_downtime_events (
    downtime_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    start_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    end_time            TIMESTAMPTZ,
    duration_seconds    NUMERIC(12,2),
    is_planned          BOOLEAN         NOT NULL DEFAULT FALSE,
    downtime_category   VARCHAR(50),
    reason_code         VARCHAR(50),
    reason_text         VARCHAR(500),
    failure_code        VARCHAR(50),
    failure_mode        VARCHAR(200),
    root_cause_code     VARCHAR(50),
    jobs_affected       TEXT[],
    estimated_loss_units NUMERIC(10,2),
    resolved_by         VARCHAR(20),
    resolution_action   TEXT,
    maint_wo_id         UUID,
    state_event_id      BIGINT,
    detection_method    VARCHAR(30)     DEFAULT 'automatic',
    operator_id         VARCHAR(20),
    shift_code          VARCHAR(5),
    state_from          TEXT,
    state_to            TEXT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (downtime_id, start_time)
);
COMMENT ON TABLE mes_downtime_events IS 'Machine downtime events for MTBF/MTTR. TimescaleDB hypertable.';
CREATE INDEX IF NOT EXISTS idx_mdt_equip ON mes_downtime_events (equipment_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_mdt_active ON mes_downtime_events (equipment_id) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_mdt_category ON mes_downtime_events (downtime_category, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_mdt_failure ON mes_downtime_events (failure_code, start_time DESC) WHERE failure_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-10.2 mes_pm_execution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_pm_execution (
    pm_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    checklist_items     JSONB           NOT NULL DEFAULT '[]',
    all_items_pass      BOOLEAN,
    spindle_hours       NUMERIC(12,2),
    axis_total_distance_km NUMERIC(12,2),
    coolant_concentration_pct NUMERIC(5,2),
    pm_interval_hours   NUMERIC(10,2),
    next_pm_due_date    DATE,
    next_pm_due_hours   NUMERIC(12,2),
    performed_by        VARCHAR(20)     NOT NULL,
    verified_by         VARCHAR(20),
    performed_at        TIMESTAMPTZ     NOT NULL,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_pm_execution IS 'PM execution with checklist and meter readings.';
CREATE INDEX IF NOT EXISTS idx_mpmex_equip ON mes_pm_execution (equipment_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- MES-10.3 mes_spare_parts_consumption
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_spare_parts_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    spare_part_id       VARCHAR(50)     NOT NULL,
    qty_consumed        NUMERIC(10,2)   NOT NULL,
    unit_cost           NUMERIC(12,2),
    total_cost          NUMERIC(12,2),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    consumed_by         VARCHAR(20),
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_spare_parts_consumption IS 'Spare parts consumed during maintenance.';
CREATE INDEX IF NOT EXISTS idx_mspc_equip ON mes_spare_parts_consumption (equipment_id);
CREATE INDEX IF NOT EXISTS idx_mspc_part ON mes_spare_parts_consumption (spare_part_id);

-- ---------------------------------------------------------------------------
-- MES-11.1 mes_part_genealogy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_part_genealogy (
    genealogy_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    customer_id         VARCHAR(50),
    sales_order_ref     VARCHAR(50),
    raw_material_item_id VARCHAR(50),
    raw_material_lot    VARCHAR(100),
    raw_material_heat   VARCHAR(100),
    material_cert_ref   VARCHAR(200),
    material_spec       VARCHAR(200),
    operations_completed INT,
    total_operations    INT,
    first_operation_date TIMESTAMPTZ,
    last_operation_date TIMESTAMPTZ,
    all_inspections_pass BOOLEAN,
    fai_number          VARCHAR(50),
    certificate_of_conformance VARCHAR(100),
    final_disposition   VARCHAR(30),
    ship_date           DATE,
    shipment_id         UUID,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_part_genealogy IS 'Master genealogy per serial/lot. AS9100 30-year retention.';
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpgen_serial ON mes_part_genealogy (serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpgen_lot ON mes_part_genealogy (lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpgen_job ON mes_part_genealogy (job_number);
CREATE INDEX IF NOT EXISTS idx_mpgen_item ON mes_part_genealogy (item_id, part_rev);
CREATE INDEX IF NOT EXISTS idx_mpgen_material ON mes_part_genealogy (raw_material_heat) WHERE raw_material_heat IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-11.2 mes_genealogy_operations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_genealogy_operations (
    gen_op_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    genealogy_id        UUID            NOT NULL REFERENCES mes_part_genealogy(genealogy_id),
    operation_seq       INT             NOT NULL,
    operation_code      VARCHAR(30),
    operation_desc      VARCHAR(300),
    equipment_id        VARCHAR(50)     NOT NULL,
    equipment_name      VARCHAR(200),
    nc_program_name     VARCHAR(200),
    nc_program_revision VARCHAR(20),
    operator_id         VARCHAR(20)     NOT NULL,
    operator_name       VARCHAR(150),
    started_at          TIMESTAMPTZ     NOT NULL,
    completed_at        TIMESTAMPTZ,
    setup_time_sec      NUMERIC(10,2),
    cycle_time_sec      NUMERIC(10,2),
    tools_used          JSONB           DEFAULT '[]',
    fixture_id          VARCHAR(50),
    materials_consumed  JSONB           DEFAULT '[]',
    inspection_result   VARCHAR(10),
    measurements        JSONB           DEFAULT '[]',
    ncr_numbers         TEXT[],
    process_params      JSONB           DEFAULT '{}',
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_genealogy_operations IS 'Per-operation genealogy detail.';
CREATE INDEX IF NOT EXISTS idx_mgenop_gen ON mes_genealogy_operations (genealogy_id, operation_seq);
CREATE INDEX IF NOT EXISTS idx_mgenop_equip ON mes_genealogy_operations (equipment_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgenop_operator ON mes_genealogy_operations (operator_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- MES-12.1 mes_machine_snapshot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_machine_snapshot (
    equipment_id        VARCHAR(50)     PRIMARY KEY,
    e10_state           semi_e10_state  NOT NULL DEFAULT 'NON_SCHEDULED',
    e10_substate        VARCHAR(50),
    state_since         TIMESTAMPTZ,
    state_duration_sec  NUMERIC(10,2),
    job_number          VARCHAR(50),
    part_number         VARCHAR(100),
    customer_name       VARCHAR(200),
    operation_seq       INT,
    operation_desc      VARCHAR(300),
    qty_required        NUMERIC(12,2),
    qty_completed       NUMERIC(12,2),
    qty_remaining       NUMERIC(12,2),
    program_name        VARCHAR(200),
    current_tool_number INT,
    cycle_time_target_sec NUMERIC(10,2),
    cycle_time_last_sec NUMERIC(10,2),
    cycle_time_avg_sec  NUMERIC(10,2),
    est_completion_time TIMESTAMPTZ,
    operator_id         VARCHAR(20),
    operator_name       VARCHAR(150),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    parts_good_shift    INT             DEFAULT 0,
    parts_scrap_shift   INT             DEFAULT 0,
    parts_rework_shift  INT             DEFAULT 0,
    active_alarm_count  INT             DEFAULT 0,
    highest_alarm_severity mes_event_severity,
    spindle_load_pct    NUMERIC(6,2),
    coolant_temp_c      NUMERIC(6,2),
    vibration_mm_s      NUMERIC(8,4),
    next_job_number     VARCHAR(50),
    next_part_number    VARCHAR(100),
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    heartbeat_age_sec   NUMERIC(10,2)
);
COMMENT ON TABLE mes_machine_snapshot IS 'Denormalized machine state for real-time dashboard.';

-- ---------------------------------------------------------------------------
-- MES-12.2 mes_shop_floor_layout
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_shop_floor_layout (
    layout_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    layout_name         VARCHAR(200)    NOT NULL,
    layout_version      INT             NOT NULL DEFAULT 1,
    svg_content         TEXT,
    machine_positions   JSONB           NOT NULL DEFAULT '[]',
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shop_floor_layout IS 'Shop floor SVG layout for digital twin.';

-- ---------------------------------------------------------------------------
-- MES-13.1 mes_production_kpi_daily
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_production_kpi_daily (
    kpi_date            DATE            NOT NULL,
    dimension_type      VARCHAR(20)     NOT NULL,
    dimension_id        VARCHAR(50)     NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL DEFAULT 'ALL',
    total_parts_produced NUMERIC(12,2),
    total_parts_good    NUMERIC(12,2),
    total_parts_scrap   NUMERIC(12,2),
    total_parts_rework  NUMERIC(12,2),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    planned_time_sec    NUMERIC(12,2),
    productive_time_sec NUMERIC(12,2),
    setup_time_sec      NUMERIC(12,2),
    downtime_sec        NUMERIC(12,2),
    idle_time_sec       NUMERIC(12,2),
    parts_per_hour      NUMERIC(8,2),
    scrap_rate_pct      NUMERIC(5,2),
    est_cost_per_part   NUMERIC(12,4),
    top_downtime_reasons JSONB          DEFAULT '[]',
    top_scrap_reasons   JSONB           DEFAULT '[]',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (kpi_date, dimension_type, dimension_id, shift_code)
);
COMMENT ON TABLE mes_production_kpi_daily IS 'Daily production KPI roll-ups.';
CREATE INDEX IF NOT EXISTS idx_mpkpi_dim ON mes_production_kpi_daily (dimension_type, dimension_id, kpi_date DESC);
CREATE INDEX IF NOT EXISTS idx_mpkpi_oee ON mes_production_kpi_daily (oee_overall, kpi_date DESC);

-- ---------------------------------------------------------------------------
-- MES-13.2 mes_on_time_delivery
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_on_time_delivery (
    otd_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    sales_order_ref     VARCHAR(50),
    customer_id         VARCHAR(50),
    item_id             VARCHAR(50),
    qty_ordered         NUMERIC(12,2),
    qty_shipped         NUMERIC(12,2),
    customer_request_date DATE          NOT NULL,
    promised_date       DATE            NOT NULL,
    actual_ship_date    DATE,
    days_early_late     INT,
    is_on_time          BOOLEAN,
    late_reason_code    VARCHAR(50),
    late_reason_text    TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_on_time_delivery IS 'On-time delivery tracking per job.';
CREATE INDEX IF NOT EXISTS idx_motd_customer ON mes_on_time_delivery (customer_id, actual_ship_date DESC);
CREATE INDEX IF NOT EXISTS idx_motd_late ON mes_on_time_delivery (is_on_time, actual_ship_date DESC) WHERE is_on_time = FALSE;

-- ---------------------------------------------------------------------------
-- MES-14.1 mes_erp_inbound_queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_erp_inbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    received_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    action              VARCHAR(20)     NOT NULL,
    payload             JSONB           NOT NULL,
    processed_at        TIMESTAMPTZ,
    process_status      VARCHAR(20)     DEFAULT 'PENDING',
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_inbound_queue IS 'Inbound queue for Epicor -> MES data sync.';
CREATE INDEX IF NOT EXISTS idx_meiq_status ON mes_erp_inbound_queue (process_status, received_at) WHERE process_status != 'SUCCESS';

-- ---------------------------------------------------------------------------
-- MES-14.2 mes_erp_outbound_queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_erp_outbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    payload             JSONB           NOT NULL,
    sent_at             TIMESTAMPTZ,
    send_status         VARCHAR(20)     DEFAULT 'PENDING',
    erp_response        JSONB,
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_outbound_queue IS 'Outbound queue for MES -> Epicor data sync.';
CREATE INDEX IF NOT EXISTS idx_meoq_status ON mes_erp_outbound_queue (send_status, created_at) WHERE send_status != 'SUCCESS';

-- ---------------------------------------------------------------------------
-- MES-15.1 mes_event_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes_event_subscriptions (
    subscription_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          VARCHAR(100)    NOT NULL,
    equipment_filter    VARCHAR(50),
    area_filter         VARCHAR(30),
    severity_min        mes_event_severity DEFAULT 'INFO',
    notify_user_id      UUID,
    notify_role_code    VARCHAR(50),
    channel             VARCHAR(30)     NOT NULL DEFAULT 'app',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_event_subscriptions IS 'Event subscription rules for MES notifications.';
CREATE INDEX IF NOT EXISTS idx_mesub_event ON mes_event_subscriptions (event_type) WHERE is_active = TRUE;


-- ============================================================================
-- PART 4: MES INDEXES ON EXISTING TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_machine_state ON equipment(machine_state);
CREATE INDEX IF NOT EXISTS idx_equipment_last_signal ON equipment(last_signal_at);
CREATE INDEX IF NOT EXISTS idx_equipment_connector ON equipment(connector_type);
CREATE INDEX IF NOT EXISTS idx_job_ops_actual_times ON job_operations(actual_start_time, actual_end_time);
CREATE INDEX IF NOT EXISTS idx_job_ops_program ON job_operations(program_id);
CREATE INDEX IF NOT EXISTS idx_labor_machine ON labor_transactions(machine_id_assigned);
CREATE INDEX IF NOT EXISTS idx_schedule_dispatch ON production_schedule(dispatch_priority, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tools_machine ON tools(current_machine_id);
CREATE INDEX IF NOT EXISTS idx_tools_life ON tools(tool_life_remaining_pct);


-- ============================================================================
-- PART 5: MES VIEWS
-- ============================================================================

-- Live machine status view
CREATE OR REPLACE VIEW v_machine_status_live AS
SELECT e.equipment_id, e.equipment_name, e.machine_state,
       e.current_spindle_rpm, e.spindle_load_percent,
       e.current_program_id, e.current_tool_id,
       e.part_count_shift, e.last_signal_at,
       EXTRACT(EPOCH FROM (now() - e.last_signal_at)) AS signal_age_seconds,
       CASE WHEN EXTRACT(EPOCH FROM (now() - e.last_signal_at)) > e.heartbeat_sla_seconds
            THEN 'stale' ELSE 'live' END AS connection_status
FROM equipment e WHERE e.is_active = TRUE;

-- OEE summary view
CREATE OR REPLACE VIEW v_oee_current_shift AS
SELECT os.equipment_id AS machine_id, os.snapshot_date AS shift_date, os.shift_code AS shift_number,
       os.availability AS availability_pct, os.performance AS performance_pct,
       os.quality AS quality_pct, os.oee AS oee_pct,
       os.planned_production_time_sec / 3600.0 AS planned_hours,
       os.actual_run_time_sec / 3600.0 AS run_hours,
       os.downtime_sec / 3600.0 AS downtime_hours,
       os.total_pieces AS parts_produced,
       os.defect_pieces AS parts_scrapped
FROM mes_oee_snapshots os
WHERE os.snapshot_date = CURRENT_DATE
ORDER BY os.equipment_id;

-- Overdue PM view
CREATE OR REPLACE VIEW v_pm_overdue AS
SELECT e.equipment_id, e.equipment_name,
       mwo.scheduled_start, mwo.wo_type,
       CURRENT_DATE - mwo.scheduled_start::date AS days_overdue
FROM maintenance_work_orders mwo
JOIN equipment e ON e.equipment_id = mwo.equipment_id::varchar
WHERE mwo.wo_status IN ('requested','planned','scheduled')
  AND mwo.scheduled_start < now();

-- Active operator sessions
CREATE OR REPLACE VIEW v_active_operators AS
SELECT os.employee_id AS operator_id, u.full_name AS operator_name,
       os.equipment_id AS machine_id, e.equipment_name,
       os.login_at, os.shift_code,
       EXTRACT(EPOCH FROM (now() - os.login_at))/3600 AS hours_logged
FROM mes_operator_sessions os
JOIN users u ON u.employee_id = os.employee_id
LEFT JOIN equipment e ON e.equipment_id = os.equipment_id
WHERE os.logout_at IS NULL;

-- Dispatch queue view
CREATE OR REPLACE VIEW v_dispatch_queue AS
SELECT dq.*, jo.item_id, jo.order_qty, jo.pct_complete,
       e.equipment_name, e.machine_state
FROM mes_dispatch_queue dq
LEFT JOIN job_orders jo ON jo.job_number = dq.job_number
LEFT JOIN equipment e ON e.equipment_id = dq.equipment_id
WHERE dq.queue_status = 'QUEUED'
ORDER BY dq.priority_score DESC, dq.scheduled_start;


-- ============================================================================
-- PART 6: MES TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-create downtime event when machine state changes from productive
CREATE OR REPLACE FUNCTION fn_machine_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.machine_state = 'productive' AND NEW.machine_state != 'productive' THEN
    INSERT INTO mes_downtime_events (machine_id, start_time, state_from, state_to)
    VALUES (NEW.equipment_id, now(), OLD.machine_state::text, NEW.machine_state::text);
  END IF;
  IF OLD.machine_state != 'productive' AND NEW.machine_state = 'productive' THEN
    UPDATE mes_downtime_events
    SET end_time = now(), duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))
    WHERE machine_id = NEW.equipment_id AND end_time IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflict, then create
DROP TRIGGER IF EXISTS trg_machine_state_change ON equipment;
CREATE TRIGGER trg_machine_state_change
AFTER UPDATE OF machine_state ON equipment
FOR EACH ROW EXECUTE FUNCTION fn_machine_state_change();

-- Auto-decrement tool life on cycle complete
CREATE OR REPLACE FUNCTION fn_tool_life_decrement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tool_id_used IS NOT NULL AND NEW.part_count_actual > COALESCE(OLD.part_count_actual, 0) THEN
    UPDATE tools SET
      tool_life_parts_count = tool_life_parts_count + (NEW.part_count_actual - COALESCE(OLD.part_count_actual, 0)),
      tool_usage_parts_total = tool_usage_parts_total + (NEW.part_count_actual - COALESCE(OLD.part_count_actual, 0)),
      tool_life_remaining_pct = GREATEST(0, 100.0 - (tool_life_parts_count::numeric / NULLIF(tool_life_total_parts, 0) * 100))
    WHERE tool_id = NEW.tool_id_used;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tool_life_on_production ON job_operations;
CREATE TRIGGER trg_tool_life_on_production
AFTER UPDATE OF part_count_actual ON job_operations
FOR EACH ROW EXECUTE FUNCTION fn_tool_life_decrement();


-- ============================================================================
-- PART 7: MES SEED DATA
-- ============================================================================

-- Default HESEM site
INSERT INTO mes_sites (site_id, site_name, site_name_vi, site_address, timezone)
VALUES ('HESEM-HCM', 'HESEM Ho Chi Minh', 'HESEM Ho Chi Minh', 'Ho Chi Minh City, Vietnam', 'Asia/Ho_Chi_Minh')
ON CONFLICT (site_id) DO NOTHING;

-- Default production areas
INSERT INTO mes_areas (area_id, area_name, area_name_vi, site_id, area_type) VALUES
    ('AREA-5AX',   '5-Axis Machining',     'Gia cong 5 truc',        'HESEM-HCM', 'machining'),
    ('AREA-3AX',   '3-Axis Machining',     'Gia cong 3 truc',        'HESEM-HCM', 'machining'),
    ('AREA-TURN',  'CNC Turning',          'Tien CNC',               'HESEM-HCM', 'machining'),
    ('AREA-GRIND', 'Grinding',             'Mai',                     'HESEM-HCM', 'machining'),
    ('AREA-EDM',   'EDM',                  'EDM',                     'HESEM-HCM', 'machining'),
    ('AREA-INSP',  'Inspection / CMM',     'Kiem tra / CMM',          'HESEM-HCM', 'inspection'),
    ('AREA-DEBURR','Deburr & Finish',      'Mài bavia & Hoan thien', 'HESEM-HCM', 'assembly'),
    ('AREA-CLEAN', 'Cleaning & Packing',   'Ve sinh & Dong goi',     'HESEM-HCM', 'shipping')
ON CONFLICT (area_id) DO NOTHING;

-- Default MES event subscriptions
INSERT INTO mes_event_subscriptions (event_type, severity_min, notify_role_code, channel) VALUES
    ('MACHINE_DOWN',    'ALARM',    'cnc_workshop_manager',  'app'),
    ('MACHINE_DOWN',    'CRITICAL', 'production_director',   'app'),
    ('SPC_VIOLATION',   'WARNING',  'quality_engineer',      'app'),
    ('TOOL_BREAKAGE',   'ALARM',    'shift_leader',          'app'),
    ('QUALITY_HOLD',    'WARNING',  'qa_manager',            'app'),
    ('PM_DUE',          'INFO',     'maintenance_technician', 'app')
ON CONFLICT DO NOTHING;

-- MES KPI definitions
INSERT INTO kpi_definitions (metric_code, kpi_name, kpi_name_vi, unit, target, frequency) VALUES
    ('MTBF',   'Mean Time Between Failures',  'Thoi gian trung binh giua cac lan hong', 'hours', 500.0, 'monthly'),
    ('MTTR',   'Mean Time To Repair',         'Thoi gian trung binh de sua chua',       'hours', 2.0,   'monthly'),
    ('UTIL',   'Machine Utilization',          'Ty le su dung may',                      '%',     80.0,  'daily'),
    ('SETUP',  'Average Setup Time',           'Thoi gian setup trung binh',             'min',   45.0,  'weekly'),
    ('CYCLE-VAR', 'Cycle Time Variance',       'Do lech thoi gian chu ky',               '%',     5.0,   'daily')
ON CONFLICT DO NOTHING;


COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (manual, not auto-executed)
-- ============================================================================
-- To rollback this migration:
--
-- BEGIN;
--
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS trg_machine_state_change ON equipment;
-- DROP TRIGGER IF EXISTS trg_tool_life_on_production ON job_operations;
-- DROP FUNCTION IF EXISTS fn_machine_state_change();
-- DROP FUNCTION IF EXISTS fn_tool_life_decrement();
--
-- -- Drop views
-- DROP VIEW IF EXISTS v_dispatch_queue;
-- DROP VIEW IF EXISTS v_active_operators;
-- DROP VIEW IF EXISTS v_pm_overdue;
-- DROP VIEW IF EXISTS v_oee_current_shift;
-- DROP VIEW IF EXISTS v_machine_status_live;
--
-- -- Drop MES indexes on existing tables
-- DROP INDEX IF EXISTS idx_equipment_machine_state;
-- DROP INDEX IF EXISTS idx_equipment_last_signal;
-- DROP INDEX IF EXISTS idx_equipment_connector;
-- DROP INDEX IF EXISTS idx_job_ops_actual_times;
-- DROP INDEX IF EXISTS idx_job_ops_program;
-- DROP INDEX IF EXISTS idx_labor_machine;
-- DROP INDEX IF EXISTS idx_schedule_dispatch;
-- DROP INDEX IF EXISTS idx_tools_machine;
-- DROP INDEX IF EXISTS idx_tools_life;
--
-- -- Drop MES tables (reverse dependency order)
-- DROP TABLE IF EXISTS mes_event_subscriptions CASCADE;
-- DROP TABLE IF EXISTS mes_erp_outbound_queue CASCADE;
-- DROP TABLE IF EXISTS mes_erp_inbound_queue CASCADE;
-- DROP TABLE IF EXISTS mes_on_time_delivery CASCADE;
-- DROP TABLE IF EXISTS mes_production_kpi_daily CASCADE;
-- DROP TABLE IF EXISTS mes_shop_floor_layout CASCADE;
-- DROP TABLE IF EXISTS mes_machine_snapshot CASCADE;
-- DROP TABLE IF EXISTS mes_genealogy_operations CASCADE;
-- DROP TABLE IF EXISTS mes_part_genealogy CASCADE;
-- DROP TABLE IF EXISTS mes_spare_parts_consumption CASCADE;
-- DROP TABLE IF EXISTS mes_pm_execution CASCADE;
-- DROP TABLE IF EXISTS mes_downtime_events CASCADE;
-- DROP TABLE IF EXISTS mes_dispatch_queue CASCADE;
-- DROP TABLE IF EXISTS mes_fixture_assignments CASCADE;
-- DROP TABLE IF EXISTS mes_tool_life_events CASCADE;
-- DROP TABLE IF EXISTS mes_wip_movements CASCADE;
-- DROP TABLE IF EXISTS mes_wip_location CASCADE;
-- DROP TABLE IF EXISTS mes_material_consumption CASCADE;
-- DROP TABLE IF EXISTS mes_shift_handover CASCADE;
-- DROP TABLE IF EXISTS mes_operator_qualifications CASCADE;
-- DROP TABLE IF EXISTS mes_operator_sessions CASCADE;
-- DROP TABLE IF EXISTS mes_spc_violations CASCADE;
-- DROP TABLE IF EXISTS mes_spc_control_limits CASCADE;
-- DROP TABLE IF EXISTS mes_inline_measurements CASCADE;
-- DROP TABLE IF EXISTS mes_oee_snapshots CASCADE;
-- DROP TABLE IF EXISTS mes_oee_loss_events CASCADE;
-- DROP TABLE IF EXISTS mes_cycle_events CASCADE;
-- DROP TABLE IF EXISTS mes_operation_execution CASCADE;
-- DROP TABLE IF EXISTS mes_job_execution CASCADE;
-- DROP TABLE IF EXISTS mes_program_events CASCADE;
-- DROP TABLE IF EXISTS mes_machine_alarms CASCADE;
-- DROP TABLE IF EXISTS mes_machine_telemetry CASCADE;
-- DROP TABLE IF EXISTS mes_machine_state_events CASCADE;
-- DROP TABLE IF EXISTS mes_equipment_extended CASCADE;
-- DROP TABLE IF EXISTS mes_areas CASCADE;
-- DROP TABLE IF EXISTS mes_sites CASCADE;
--
-- -- Remove added columns from existing tables
-- ALTER TABLE equipment DROP COLUMN IF EXISTS machine_state,
--     DROP COLUMN IF EXISTS current_spindle_rpm, DROP COLUMN IF EXISTS spindle_load_percent,
--     DROP COLUMN IF EXISTS feed_override_percent, DROP COLUMN IF EXISTS current_program_id,
--     DROP COLUMN IF EXISTS current_tool_id, DROP COLUMN IF EXISTS part_count_shift,
--     DROP COLUMN IF EXISTS last_signal_at, DROP COLUMN IF EXISTS heartbeat_sla_seconds,
--     DROP COLUMN IF EXISTS mtconnect_agent_url, DROP COLUMN IF EXISTS opc_ua_endpoint,
--     DROP COLUMN IF EXISTS mqtt_topic, DROP COLUMN IF EXISTS connector_type,
--     DROP COLUMN IF EXISTS spindle_max_rpm, DROP COLUMN IF EXISTS spindle_power_kw,
--     DROP COLUMN IF EXISTS spindle_taper, DROP COLUMN IF EXISTS atc_capacity,
--     DROP COLUMN IF EXISTS probe_system_installed, DROP COLUMN IF EXISTS work_envelope_x_mm,
--     DROP COLUMN IF EXISTS work_envelope_y_mm, DROP COLUMN IF EXISTS work_envelope_z_mm,
--     DROP COLUMN IF EXISTS positioning_accuracy_microns, DROP COLUMN IF EXISTS repeatability_microns;
--
-- ALTER TABLE job_operations DROP COLUMN IF EXISTS actual_start_time,
--     DROP COLUMN IF EXISTS actual_end_time, DROP COLUMN IF EXISTS cycle_time_seconds,
--     DROP COLUMN IF EXISTS part_count_expected, DROP COLUMN IF EXISTS part_count_actual,
--     DROP COLUMN IF EXISTS part_count_scrap, DROP COLUMN IF EXISTS downtime_total_seconds,
--     DROP COLUMN IF EXISTS tool_id_used, DROP COLUMN IF EXISTS tool_life_at_start,
--     DROP COLUMN IF EXISTS program_id, DROP COLUMN IF EXISTS program_revision,
--     DROP COLUMN IF EXISTS setup_verified_by, DROP COLUMN IF EXISTS setup_verified_at,
--     DROP COLUMN IF EXISTS first_piece_verified, DROP COLUMN IF EXISTS first_piece_verified_by,
--     DROP COLUMN IF EXISTS first_piece_verified_at;
--
-- ALTER TABLE labor_transactions DROP COLUMN IF EXISTS login_timestamp,
--     DROP COLUMN IF EXISTS logout_timestamp, DROP COLUMN IF EXISTS machine_id_assigned,
--     DROP COLUMN IF EXISTS downtime_reason_code, DROP COLUMN IF EXISTS idle_seconds,
--     DROP COLUMN IF EXISTS tool_change_count, DROP COLUMN IF EXISTS program_change_count;
--
-- ALTER TABLE production_schedule DROP COLUMN IF EXISTS actual_setup_start,
--     DROP COLUMN IF EXISTS actual_setup_end, DROP COLUMN IF EXISTS actual_run_start,
--     DROP COLUMN IF EXISTS actual_run_end, DROP COLUMN IF EXISTS schedule_adherence_pct,
--     DROP COLUMN IF EXISTS changeover_time_planned, DROP COLUMN IF EXISTS changeover_time_actual,
--     DROP COLUMN IF EXISTS material_wait_minutes, DROP COLUMN IF EXISTS machine_conflict_flag,
--     DROP COLUMN IF EXISTS dispatch_priority;
--
-- ALTER TABLE tools DROP COLUMN IF EXISTS current_machine_id,
--     DROP COLUMN IF EXISTS current_spindle_position, DROP COLUMN IF EXISTS last_mounted_at,
--     DROP COLUMN IF EXISTS tool_usage_minutes_total, DROP COLUMN IF EXISTS tool_usage_parts_total,
--     DROP COLUMN IF EXISTS edge_count, DROP COLUMN IF EXISTS current_edge_index,
--     DROP COLUMN IF EXISTS vibration_signature, DROP COLUMN IF EXISTS tool_preset_verified_at,
--     DROP COLUMN IF EXISTS tool_life_tracking_method, DROP COLUMN IF EXISTS tool_life_alert_threshold_pct;
--
-- ALTER TABLE maintenance_work_orders DROP COLUMN IF EXISTS equipment_run_hours_at_creation,
--     DROP COLUMN IF EXISTS pm_trigger_type, DROP COLUMN IF EXISTS pm_trigger_value,
--     DROP COLUMN IF EXISTS next_pm_due_date, DROP COLUMN IF EXISTS next_pm_due_hours;
--
-- -- Drop MES enum types
-- DROP TYPE IF EXISTS dispatch_priority_enum;
-- DROP TYPE IF EXISTS material_consumption_type;
-- DROP TYPE IF EXISTS oee_loss_category;
-- DROP TYPE IF EXISTS cycle_phase;
-- DROP TYPE IF EXISTS mes_event_severity;
-- DROP TYPE IF EXISTS machine_exec_mode;
-- DROP TYPE IF EXISTS unsched_down_substate;
-- DROP TYPE IF EXISTS standby_substate;
-- DROP TYPE IF EXISTS productive_substate;
-- DROP TYPE IF EXISTS semi_e10_state;
-- DROP TYPE IF EXISTS equipment_state_enum;
--
-- COMMIT;
