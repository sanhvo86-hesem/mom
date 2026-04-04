-- ============================================================================
-- HESEM MES DATABASE SCHEMA SPECIFICATION
-- He thong Thuc thi San xuat HESEM - Dac ta Schema Co so Du lieu
-- ============================================================================
-- Version : 1.0.0
-- Date    : 2026-03-29
-- Standard: ISA-95 / ISA-88 / SEMI E10 / MTConnect / AS9100D
-- Design  : TimescaleDB hypertables for time-series, PostgreSQL for relational
-- Context : CNC precision machining (5-axis mills, lathes, mill-turns, CMMs)
-- Customer: Lam Research (semiconductor equipment)
-- ERP     : Epicor Kinetic
-- ============================================================================
--
-- ARCHITECTURE DECISION RECORD:
--
-- Storage Tier Strategy:
--   Tier 1 (PostgreSQL) : Master data, transactional data, quality records
--                         ~103 existing QMS tables + ~45 new MES relational tables
--   Tier 2 (TimescaleDB): Machine telemetry, sensor data, state events
--                         ~12 hypertables with compression + retention policies
--   Tier 3 (Archive)    : Cold storage for raw telemetry older than 90 days
--                         Compressed chunks moved to S3-compatible storage
--
-- Event Streaming:
--   PostgreSQL LISTEN/NOTIFY for low-latency internal events (<100 machines)
--   NATS or Redis Streams if scaling beyond single-site
--   pg_partman for automated partition management
--
-- Data Retention Policies:
--   Raw telemetry (1-second): 90 days hot, then compressed
--   Aggregated telemetry (1-minute): 2 years
--   Aggregated telemetry (1-hour): 7 years (AS9100 retention)
--   State events: 7 years uncompressed
--   Quality/traceability: 30 years (aerospace lifetime)
--   Production transactions: 10 years
--
-- Integration Points with Existing QMS Portal (schema.sql):
--   equipment         -> mes_equipment_extended (1:1 extension)
--   work_centers      -> mes_machine_assignments (link machines to WCs)
--   job_orders        -> mes_job_execution (real-time execution tracking)
--   job_operations    -> mes_operation_execution (operation-level tracking)
--   labor_transactions-> mes_operator_sessions (real-time clock data)
--   inspection_results-> mes_inline_measurements (real-time SPC feed)
--   spc_data          -> mes_spc_realtime (sub-second SPC streaming)
--   tools             -> mes_tool_life_events (real-time tool life)
--   maintenance_work_orders -> mes_downtime_events (auto-generated)
--   production_schedule -> mes_dispatch_queue (live dispatch)
--   lot_master        -> mes_material_genealogy (full traceability)
--   serial_master     -> mes_serial_genealogy (per-unit traceability)
-- ============================================================================

-- ============================================================================
-- EXTENSIONS REQUIRED (in addition to schema.sql extensions)
-- ============================================================================
-- TimescaleDB must be installed for hypertable support:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
--
-- For LISTEN/NOTIFY event streaming, no extension needed (built-in).
-- For pg_partman automated partition management:
-- CREATE EXTENSION IF NOT EXISTS pg_partman;

-- ============================================================================
-- SECTION MES-0: ADDITIONAL ENUM TYPES FOR MES
-- Phan MES-0: Cac kieu ENUM bo sung cho MES
-- ============================================================================

-- SEMI E10 Equipment States / Trang thai thiet bi theo SEMI E10
CREATE TYPE semi_e10_state AS ENUM (
    'PRODUCTIVE',           -- Dang san xuat
    'STANDBY',              -- San sang cho
    'ENGINEERING',          -- Ky thuat/thu nghiem
    'SCHEDULED_DOWN',       -- Ngung theo ke hoach
    'UNSCHEDULED_DOWN',     -- Ngung ngoai ke hoach
    'NON_SCHEDULED'         -- Ngoai lich trinh
);

-- SEMI E10 Sub-States for Productive / Trang thai phu khi san xuat
CREATE TYPE productive_substate AS ENUM (
    'REGULAR_PRODUCTION',   -- San xuat binh thuong
    'REWORK',               -- Lam lai
    'ENGINEERING_RUN',      -- Chay thu ky thuat
    'WORK_FOR_OTHERS'       -- Lam cho don vi khac
);

-- SEMI E10 Sub-States for Standby / Trang thai phu khi san sang
CREATE TYPE standby_substate AS ENUM (
    'NO_OPERATOR',          -- Khong co nguoi van hanh
    'NO_MATERIAL',          -- Khong co vat lieu
    'NO_TOOLING',           -- Khong co dao cu
    'NO_PROGRAM',           -- Khong co chuong trinh
    'QUALITY_HOLD',         -- Giu cho chat luong
    'CHANGEOVER',           -- Chuyen doi
    'WAITING_APPROVAL'      -- Cho phe duyet
);

-- SEMI E10 Sub-States for Unscheduled Down / Trang thai phu khi ngung ngoai ke hoach
CREATE TYPE unsched_down_substate AS ENUM (
    'MECHANICAL_FAILURE',   -- Hong co khi
    'ELECTRICAL_FAILURE',   -- Hong dien
    'SOFTWARE_FAILURE',     -- Loi phan mem
    'TOOLING_FAILURE',      -- Hong dao cu
    'COOLANT_ISSUE',        -- Van de nuoc lam mat
    'AIR_PRESSURE',         -- Ap suat khi
    'SPINDLE_ALARM',        -- Bao dong truc chinh
    'AXIS_ALARM',           -- Bao dong truc
    'OTHER_FAILURE'         -- Hong khac
);

-- Machine execution mode / Che do thuc thi may
CREATE TYPE machine_exec_mode AS ENUM (
    'AUTOMATIC',            -- Tu dong
    'MANUAL',               -- Thu cong
    'MDI',                  -- Manual Data Input
    'JOG',                  -- Di chuyen tung buoc
    'REFERENCE',            -- Tham chieu/home
    'EDIT'                  -- Chinh sua
);

-- MES event severity / Muc nghiem trong su kien MES
CREATE TYPE mes_event_severity AS ENUM ('INFO', 'WARNING', 'ALARM', 'CRITICAL', 'EMERGENCY');

-- Cycle phase / Giai doan chu ky
CREATE TYPE cycle_phase AS ENUM (
    'SETUP',                -- Cai dat
    'FIRST_PIECE',          -- San pham dau tien
    'PRODUCTION_RUN',       -- Chay san xuat
    'LAST_PIECE',           -- San pham cuoi
    'TEARDOWN'              -- Thao go
);

-- OEE loss category (TPM six big losses) / Danh muc ton that OEE
CREATE TYPE oee_loss_category AS ENUM (
    'EQUIPMENT_FAILURE',        -- Hong thiet bi
    'SETUP_ADJUSTMENT',         -- Cai dat va dieu chinh
    'IDLING_MINOR_STOPS',       -- Ngung ngan va cho
    'REDUCED_SPEED',            -- Giam toc do
    'PROCESS_DEFECTS',          -- Loi quy trinh
    'REDUCED_YIELD'             -- Hieu suat giam
);

-- Material consumption type / Loai tieu thu vat lieu
CREATE TYPE material_consumption_type AS ENUM (
    'ISSUED',           -- Xuat kho
    'CONSUMED',         -- Tieu thu
    'RETURNED',         -- Tra lai
    'SCRAPPED',         -- Phe pham
    'ADJUSTED'          -- Dieu chinh
);

-- Dispatch priority / Muc uu tien dieu do
CREATE TYPE dispatch_priority AS ENUM (
    'AOG',              -- Aircraft On Ground (khong tau bay nam dat)
    'HOT',              -- Nong
    'RUSH',             -- Gap
    'STANDARD',         -- Tieu chuan
    'LOW'               -- Thap
);


-- ============================================================================
-- SECTION MES-1: ISA-95 EQUIPMENT HIERARCHY
-- Phan MES-1: Phan cap Thiet bi theo ISA-95
-- ============================================================================
-- ISA-95 levels: Enterprise > Site > Area > Work Center > Work Unit (Machine)
-- The existing schema.sql has: equipment, work_centers
-- We extend with the full hierarchy and machine-specific attributes.

-- ---------------------------------------------------------------------------
-- MES-1.1 mes_sites / Nha may (ISA-95 Level 2)
-- ---------------------------------------------------------------------------
-- Links to: enterprise is HESEM itself (single enterprise, implicit)
CREATE TABLE mes_sites (
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
COMMENT ON TABLE mes_sites IS 'ISA-95 Site level. Single site for HESEM initially. / Cap Nha may ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.2 mes_areas / Khu vuc san xuat (ISA-95 Level 3)
-- ---------------------------------------------------------------------------
CREATE TABLE mes_areas (
    area_id             VARCHAR(30)     PRIMARY KEY,
    area_name           VARCHAR(200)    NOT NULL,
    area_name_vi        VARCHAR(200),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_type           VARCHAR(50),    -- 'machining', 'inspection', 'assembly', 'shipping'
    floor_plan_path     TEXT,           -- SVG/PDF of area layout
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_areas IS 'ISA-95 Area level. Production areas within a site. / Cap Khu vuc ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.3 mes_equipment_extended / Mo rong thiet bi
-- ---------------------------------------------------------------------------
-- 1:1 extension of existing equipment table for MES-specific attributes
-- FK to equipment.equipment_id in schema.sql
CREATE TABLE mes_equipment_extended (
    equipment_id        VARCHAR(50)     PRIMARY KEY REFERENCES equipment(equipment_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    -- Machine identity
    machine_ip_address  INET,
    mtconnect_agent_url TEXT,           -- e.g., http://192.168.1.100:5000
    opc_ua_endpoint     TEXT,           -- e.g., opc.tcp://192.168.1.100:4840
    fanuc_focas_port    INT,            -- For Fanuc controllers
    controller_type     VARCHAR(100),   -- 'Fanuc 31i', 'Siemens 840D', 'Haas NGC', 'Mazak SmoothG'
    controller_version  VARCHAR(50),
    -- Machine capabilities
    num_axes            INT,            -- 3, 4, 5
    max_spindle_speed   INT,            -- RPM
    max_feed_rate       NUMERIC(10,2),  -- mm/min
    spindle_power_kw    NUMERIC(8,2),
    table_size_x_mm     NUMERIC(10,2),
    table_size_y_mm     NUMERIC(10,2),
    max_part_weight_kg  NUMERIC(10,2),
    tool_magazine_capacity INT,
    pallet_count        INT             DEFAULT 1,
    coolant_type        VARCHAR(50),    -- 'flood', 'mist', 'through_spindle', 'air'
    -- Digital twin
    cad_model_path      TEXT,           -- 3D model for digital twin visualization
    plc_tag_map         JSONB,          -- Mapping of PLC tags to MES signals
    -- Current state (denormalized for dashboard performance)
    current_e10_state   semi_e10_state  DEFAULT 'NON_SCHEDULED',
    current_program     VARCHAR(200),
    current_job_number  VARCHAR(50),
    current_operator_id VARCHAR(20),
    last_heartbeat_at   TIMESTAMPTZ,    -- From MTConnect/OPC-UA agent
    -- OEE rolling (updated by continuous aggregate or trigger)
    oee_current_shift   NUMERIC(5,2),
    oee_today           NUMERIC(5,2),
    oee_wtd             NUMERIC(5,2),
    oee_mtd             NUMERIC(5,2),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_equipment_extended IS 'MES extension of equipment master. 1:1 with equipment table. Holds connectivity, capabilities, digital twin, current state. / Mo rong MES cua bang equipment.';
CREATE INDEX idx_meseq_area ON mes_equipment_extended (area_id);
CREATE INDEX idx_meseq_wc ON mes_equipment_extended (work_center_id);
CREATE INDEX idx_meseq_state ON mes_equipment_extended (current_e10_state);
CREATE INDEX idx_meseq_heartbeat ON mes_equipment_extended (last_heartbeat_at);


-- ============================================================================
-- SECTION MES-2: MACHINE DATA COLLECTION (IoT / MTConnect / OPC-UA)
-- Phan MES-2: Thu thap Du lieu May (IoT / MTConnect / OPC-UA)
-- ============================================================================
-- These are TimescaleDB hypertables for high-volume time-series data.
-- Typical volume: ~50 machines x ~10 data points/sec = ~500 inserts/sec
-- = ~43M rows/day = ~1.3B rows/month

-- ---------------------------------------------------------------------------
-- MES-2.1 mes_machine_state_events / Su kien trang thai may
-- ---------------------------------------------------------------------------
-- Records every state transition per SEMI E10 model.
-- ~200-500 events/machine/day. Moderate volume.
CREATE TABLE mes_machine_state_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,  -- FK enforced at app layer for perf
    e10_state           semi_e10_state  NOT NULL,
    productive_sub      productive_substate,
    standby_sub         standby_substate,
    unsched_down_sub    unsched_down_substate,
    exec_mode           machine_exec_mode,
    reason_code         VARCHAR(50),    -- Maps to reason_code_enum or custom
    reason_text         VARCHAR(500),
    operator_id         VARCHAR(20),
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    shift_code          VARCHAR(5),
    duration_seconds    NUMERIC(12,2),  -- Filled when next event arrives (previous event duration)
    source              VARCHAR(30)     DEFAULT 'MTConnect', -- MTConnect, OPC-UA, Manual, Focas
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
-- Convert to TimescaleDB hypertable:
-- SELECT create_hypertable('mes_machine_state_events', 'event_time',
--     chunk_time_interval => INTERVAL '1 day');
-- Compression policy: compress chunks older than 7 days
-- SELECT add_compression_policy('mes_machine_state_events', INTERVAL '7 days');
-- Retention policy: drop raw data older than 2 years (aggregates kept longer)
-- SELECT add_retention_policy('mes_machine_state_events', INTERVAL '2 years');
COMMENT ON TABLE mes_machine_state_events IS 'SEMI E10 state transitions. TimescaleDB hypertable. / Chuyen doi trang thai SEMI E10.';
CREATE INDEX idx_mse_equip_time ON mes_machine_state_events (equipment_id, event_time DESC);
CREATE INDEX idx_mse_state ON mes_machine_state_events (e10_state, event_time DESC);
CREATE INDEX idx_mse_job ON mes_machine_state_events (job_number, event_time DESC)
    WHERE job_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-2.2 mes_machine_telemetry / Du lieu cam bien may
-- ---------------------------------------------------------------------------
-- High-frequency sensor data from MTConnect/OPC-UA/Focas.
-- Columns based on MTConnect standard data items for CNC.
-- ~10 readings/sec/machine for key parameters.
CREATE TABLE mes_machine_telemetry (
    ts                  TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    -- Spindle
    spindle_speed_rpm   NUMERIC(10,2),      -- S actual
    spindle_speed_cmd   NUMERIC(10,2),      -- S commanded
    spindle_load_pct    NUMERIC(6,2),       -- % of rated
    spindle_torque_nm   NUMERIC(10,2),
    spindle_power_kw    NUMERIC(8,2),
    spindle_temp_c      NUMERIC(6,2),
    -- Feed
    feed_rate_actual    NUMERIC(10,2),      -- mm/min actual
    feed_rate_cmd       NUMERIC(10,2),      -- mm/min commanded
    feed_override_pct   NUMERIC(6,2),       -- 0-200%
    rapid_override_pct  NUMERIC(6,2),
    -- Axis positions (for 5-axis mill)
    axis_x_pos          NUMERIC(12,6),      -- mm
    axis_y_pos          NUMERIC(12,6),
    axis_z_pos          NUMERIC(12,6),
    axis_a_pos          NUMERIC(10,4),      -- degrees (rotary)
    axis_c_pos          NUMERIC(10,4),      -- degrees (rotary)
    -- Axis loads
    axis_x_load_pct     NUMERIC(6,2),
    axis_y_load_pct     NUMERIC(6,2),
    axis_z_load_pct     NUMERIC(6,2),
    -- Coolant
    coolant_pressure_bar NUMERIC(8,2),
    coolant_flow_lpm    NUMERIC(8,2),
    coolant_temp_c      NUMERIC(6,2),
    coolant_concentration_pct NUMERIC(5,2),
    -- Environment
    ambient_temp_c      NUMERIC(6,2),
    machine_temp_c      NUMERIC(6,2),       -- Column/bed temperature
    vibration_mm_s      NUMERIC(8,4),       -- Overall vibration velocity
    -- Program context
    program_name        VARCHAR(200),
    program_block       VARCHAR(50),        -- Current N-block
    tool_number         INT,
    -- Execution
    parts_count_shift   INT,
    cycle_time_last_sec NUMERIC(10,2),
    -- Power
    total_power_kw      NUMERIC(8,2)
);
-- TimescaleDB hypertable with 1-day chunks:
-- SELECT create_hypertable('mes_machine_telemetry', 'ts',
--     chunk_time_interval => INTERVAL '1 day');
-- Compression after 24 hours:
-- SELECT add_compression_policy('mes_machine_telemetry', INTERVAL '1 day');
-- Retention: keep raw 90 days, then rely on continuous aggregates
-- SELECT add_retention_policy('mes_machine_telemetry', INTERVAL '90 days');
COMMENT ON TABLE mes_machine_telemetry IS 'High-frequency machine sensor data. TimescaleDB hypertable. ~10 rows/sec/machine. / Du lieu cam bien may tan so cao.';
CREATE INDEX idx_mtel_equip_ts ON mes_machine_telemetry (equipment_id, ts DESC);

-- ---------------------------------------------------------------------------
-- MES-2.3 mes_telemetry_1min / Tong hop do luong 1 phut
-- ---------------------------------------------------------------------------
-- TimescaleDB continuous aggregate: 1-minute rollups
-- CREATE MATERIALIZED VIEW mes_telemetry_1min
-- WITH (timescaledb.continuous) AS
-- SELECT
--     time_bucket('1 minute', ts) AS bucket,
--     equipment_id,
--     AVG(spindle_speed_rpm) AS avg_spindle_speed,
--     MAX(spindle_load_pct) AS max_spindle_load,
--     AVG(spindle_load_pct) AS avg_spindle_load,
--     AVG(feed_rate_actual) AS avg_feed_rate,
--     AVG(coolant_temp_c) AS avg_coolant_temp,
--     AVG(vibration_mm_s) AS avg_vibration,
--     MAX(vibration_mm_s) AS max_vibration,
--     AVG(total_power_kw) AS avg_power,
--     MAX(axis_x_load_pct) AS max_x_load,
--     MAX(axis_y_load_pct) AS max_y_load,
--     MAX(axis_z_load_pct) AS max_z_load,
--     COUNT(*) AS sample_count
-- FROM mes_machine_telemetry
-- GROUP BY bucket, equipment_id;
-- Retention: 2 years for 1-min aggregates
-- SELECT add_retention_policy('mes_telemetry_1min', INTERVAL '2 years');

-- ---------------------------------------------------------------------------
-- MES-2.4 mes_telemetry_1hr / Tong hop do luong 1 gio
-- ---------------------------------------------------------------------------
-- TimescaleDB continuous aggregate: 1-hour rollups for long-term trending
-- Retention: 7 years (AS9100 compliance)

-- ---------------------------------------------------------------------------
-- MES-2.5 mes_machine_alarms / Canh bao may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_machine_alarms (
    alarm_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    alarm_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    alarm_code          VARCHAR(50)     NOT NULL,   -- Controller alarm code (e.g., 'AL-0001')
    alarm_text          VARCHAR(500),               -- Controller alarm message
    alarm_severity      mes_event_severity NOT NULL DEFAULT 'ALARM',
    alarm_group         VARCHAR(50),                -- 'spindle', 'axis', 'coolant', 'tool', 'program', 'safety'
    axis_name           VARCHAR(10),                -- X, Y, Z, A, C if axis-specific
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
-- SELECT create_hypertable('mes_machine_alarms', 'alarm_time',
--     chunk_time_interval => INTERVAL '7 days');
-- SELECT add_compression_policy('mes_machine_alarms', INTERVAL '30 days');
-- SELECT add_retention_policy('mes_machine_alarms', INTERVAL '5 years');
COMMENT ON TABLE mes_machine_alarms IS 'Machine alarm/fault events. TimescaleDB hypertable. / Su kien canh bao/loi may.';
CREATE INDEX idx_malm_equip ON mes_machine_alarms (equipment_id, alarm_time DESC);
CREATE INDEX idx_malm_code ON mes_machine_alarms (alarm_code, alarm_time DESC);
CREATE INDEX idx_malm_active ON mes_machine_alarms (equipment_id)
    WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-2.6 mes_program_events / Su kien chuong trinh NC
-- ---------------------------------------------------------------------------
CREATE TABLE mes_program_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,   -- 'PROGRAM_START', 'PROGRAM_END', 'PROGRAM_STOP',
                                                    -- 'TOOL_CHANGE', 'M00_STOP', 'M01_STOP',
                                                    -- 'BLOCK_DELETE', 'PALLET_CHANGE'
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
-- SELECT create_hypertable('mes_program_events', 'event_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_program_events IS 'NC program execution events (start/stop/tool change). TimescaleDB hypertable. / Su kien thuc thi chuong trinh NC.';
CREATE INDEX idx_mpev_equip ON mes_program_events (equipment_id, event_time DESC);
CREATE INDEX idx_mpev_type ON mes_program_events (event_type, event_time DESC);


-- ============================================================================
-- SECTION MES-3: PRODUCTION EXECUTION
-- Phan MES-3: Thuc thi San xuat
-- ============================================================================
-- Real-time job/operation execution tracking that extends schema.sql
-- job_orders and job_operations tables.

-- ---------------------------------------------------------------------------
-- MES-3.1 mes_job_execution / Thuc thi lenh san xuat
-- ---------------------------------------------------------------------------
-- Real-time overlay on job_orders. One row per job, updated frequently.
CREATE TABLE mes_job_execution (
    job_exec_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL UNIQUE,  -- FK to job_orders.job_number
    -- Execution timestamps (more granular than ERP)
    first_setup_start   TIMESTAMPTZ,
    first_piece_complete TIMESTAMPTZ,
    last_piece_complete TIMESTAMPTZ,
    job_closed_at       TIMESTAMPTZ,
    -- Real-time counters
    total_good_qty      NUMERIC(12,2)   DEFAULT 0,
    total_scrap_qty     NUMERIC(12,2)   DEFAULT 0,
    total_rework_qty    NUMERIC(12,2)   DEFAULT 0,
    -- Time accumulation (seconds)
    total_setup_time_sec NUMERIC(12,2)  DEFAULT 0,
    total_run_time_sec  NUMERIC(12,2)   DEFAULT 0,
    total_idle_time_sec NUMERIC(12,2)   DEFAULT 0,
    total_down_time_sec NUMERIC(12,2)   DEFAULT 0,
    -- Calculated fields
    avg_cycle_time_sec  NUMERIC(10,2),
    target_cycle_time_sec NUMERIC(10,2),
    cycle_time_std_dev  NUMERIC(10,4),
    -- Current state
    current_operation_seq INT,
    current_equipment_id VARCHAR(50),
    is_on_hold          BOOLEAN         DEFAULT FALSE,
    hold_reason         TEXT,
    -- Traceability
    material_lots_used  TEXT[],         -- Array of lot numbers consumed
    operator_ids        TEXT[],         -- Array of all operators who worked on this job
    machines_used       TEXT[],         -- Array of all machine IDs used
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_job_execution IS 'Real-time job execution overlay. Updated by shop floor events. / Lop thuc thi lenh san xuat thoi gian thuc.';
CREATE INDEX idx_mjexec_active ON mes_job_execution (job_number)
    WHERE job_closed_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-3.2 mes_operation_execution / Thuc thi cong doan
-- ---------------------------------------------------------------------------
-- Real-time tracking per operation per job. Extends job_operations.
CREATE TABLE mes_operation_execution (
    op_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    -- Timestamps
    queue_entry_at      TIMESTAMPTZ,    -- When job arrived at machine queue
    setup_start_at      TIMESTAMPTZ,
    setup_end_at        TIMESTAMPTZ,
    run_start_at        TIMESTAMPTZ,
    first_piece_at      TIMESTAMPTZ,
    last_piece_at       TIMESTAMPTZ,
    teardown_start_at   TIMESTAMPTZ,
    teardown_end_at     TIMESTAMPTZ,
    -- Quantities
    qty_started         NUMERIC(12,2)   DEFAULT 0,
    qty_good            NUMERIC(12,2)   DEFAULT 0,
    qty_scrap           NUMERIC(12,2)   DEFAULT 0,
    qty_rework          NUMERIC(12,2)   DEFAULT 0,
    -- Times (seconds)
    setup_time_actual   NUMERIC(10,2),
    run_time_actual     NUMERIC(10,2),
    teardown_time_actual NUMERIC(10,2),
    idle_time_total     NUMERIC(10,2),
    down_time_total     NUMERIC(10,2),
    -- Cycle data
    avg_cycle_time_sec  NUMERIC(10,2),
    min_cycle_time_sec  NUMERIC(10,2),
    max_cycle_time_sec  NUMERIC(10,2),
    std_cycle_time_sec  NUMERIC(10,4),
    target_cycle_time_sec NUMERIC(10,2),
    -- OEE at operation level
    oee_availability    NUMERIC(5,4),   -- 0.0000 to 1.0000
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    -- Operator and program
    operator_id         VARCHAR(20),
    program_name        VARCHAR(200),
    program_revision    VARCHAR(20),
    -- Status
    phase               cycle_phase     DEFAULT 'SETUP',
    is_complete         BOOLEAN         DEFAULT FALSE,
    scrap_reason_codes  JSONB           DEFAULT '[]', -- [{code, qty, note}]
    rework_reason_codes JSONB           DEFAULT '[]',
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (job_number, operation_seq, equipment_id)
);
COMMENT ON TABLE mes_operation_execution IS 'Real-time operation execution with cycle times and OEE. / Thuc thi cong doan thoi gian thuc voi thoi gian chu ky va OEE.';
CREATE INDEX idx_mopexec_job ON mes_operation_execution (job_number, operation_seq);
CREATE INDEX idx_mopexec_equip ON mes_operation_execution (equipment_id)
    WHERE is_complete = FALSE;
CREATE INDEX idx_mopexec_active ON mes_operation_execution (equipment_id, updated_at DESC)
    WHERE is_complete = FALSE;

-- ---------------------------------------------------------------------------
-- MES-3.3 mes_cycle_events / Su kien chu ky san xuat
-- ---------------------------------------------------------------------------
-- One row per part per operation. Critical for cycle time analysis and traceability.
-- For a shop producing ~500 parts/day across 50 machines, ~500 rows/day.
CREATE TABLE mes_cycle_events (
    cycle_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    cycle_end_time      TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_sequence       INT,            -- Which part in this operation run (1, 2, 3...)
    serial_number       VARCHAR(100),   -- If serialized
    lot_number          VARCHAR(100),   -- If lot-tracked
    -- Timing
    cycle_start_time    TIMESTAMPTZ     NOT NULL,
    cycle_time_sec      NUMERIC(10,2)   NOT NULL,
    chip_to_chip_sec    NUMERIC(10,2),  -- Cutting time only (excludes tool changes)
    -- Context
    program_name        VARCHAR(200),
    tool_list_used      INT[],          -- Array of tool numbers used in this cycle
    operator_id         VARCHAR(20),
    -- Quality result
    pass_fail           VARCHAR(4)      CHECK (pass_fail IN ('PASS', 'FAIL', 'HOLD')),
    scrap_reason_code   VARCHAR(50),
    rework_reason_code  VARCHAR(50),
    -- Material
    material_lot_number VARCHAR(100),
    material_heat_number VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (cycle_id, cycle_end_time)
);
-- SELECT create_hypertable('mes_cycle_events', 'cycle_end_time',
--     chunk_time_interval => INTERVAL '7 days');
-- SELECT add_compression_policy('mes_cycle_events', INTERVAL '30 days');
-- Retain forever for AS9100 traceability (or archive after 7 years)
COMMENT ON TABLE mes_cycle_events IS 'Per-part cycle event for traceability and cycle time analysis. TimescaleDB hypertable. / Su kien chu ky tung san pham.';
CREATE INDEX idx_mcyc_equip ON mes_cycle_events (equipment_id, cycle_end_time DESC);
CREATE INDEX idx_mcyc_job ON mes_cycle_events (job_number, operation_seq, cycle_end_time DESC);
CREATE INDEX idx_mcyc_serial ON mes_cycle_events (serial_number, cycle_end_time DESC)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mcyc_lot ON mes_cycle_events (lot_number, cycle_end_time DESC)
    WHERE lot_number IS NOT NULL;


-- ============================================================================
-- SECTION MES-4: OEE CALCULATION
-- Phan MES-4: Tinh toan OEE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-4.1 mes_oee_loss_events / Su kien ton that OEE
-- ---------------------------------------------------------------------------
-- Every time segment where capacity is lost, categorized by TPM six big losses.
CREATE TABLE mes_oee_loss_events (
    loss_id             BIGINT          GENERATED ALWAYS AS IDENTITY,
    loss_time           TIMESTAMPTZ     NOT NULL,  -- Start of loss period
    equipment_id        VARCHAR(50)     NOT NULL,
    loss_category       oee_loss_category NOT NULL,
    loss_reason_code    VARCHAR(50),
    loss_reason_text    VARCHAR(500),
    duration_seconds    NUMERIC(10,2)   NOT NULL,
    lost_units          NUMERIC(10,2),  -- Theoretical units that could have been produced
    shift_code          VARCHAR(5),
    job_number          VARCHAR(50),
    operation_seq       INT,
    operator_id         VARCHAR(20),
    source_event_id     BIGINT,         -- Reference to mes_machine_state_events.event_id
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (loss_id, loss_time)
);
-- SELECT create_hypertable('mes_oee_loss_events', 'loss_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_oee_loss_events IS 'OEE loss tracking by TPM six big losses. TimescaleDB hypertable. / Theo doi ton that OEE theo 6 ton that lon TPM.';
CREATE INDEX idx_moee_equip ON mes_oee_loss_events (equipment_id, loss_time DESC);
CREATE INDEX idx_moee_cat ON mes_oee_loss_events (loss_category, loss_time DESC);

-- ---------------------------------------------------------------------------
-- MES-4.2 mes_oee_snapshots / Anh chup OEE
-- ---------------------------------------------------------------------------
-- Pre-calculated OEE per machine per shift. Updated at shift end.
-- ~50 machines x 3 shifts = 150 rows/day. Small volume.
CREATE TABLE mes_oee_snapshots (
    snapshot_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    snapshot_date       DATE            NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL,
    -- Availability
    planned_production_time_sec NUMERIC(12,2) NOT NULL,
    actual_run_time_sec NUMERIC(12,2)   NOT NULL,
    downtime_sec        NUMERIC(12,2)   DEFAULT 0,
    setup_time_sec      NUMERIC(12,2)   DEFAULT 0,
    availability        NUMERIC(5,4)    NOT NULL,   -- 0.0000 to 1.0000
    -- Performance
    ideal_cycle_time_sec NUMERIC(10,2),
    total_pieces        NUMERIC(12,2)   DEFAULT 0,
    performance         NUMERIC(5,4)    NOT NULL,
    -- Quality
    good_pieces         NUMERIC(12,2)   DEFAULT 0,
    defect_pieces       NUMERIC(12,2)   DEFAULT 0,
    rework_pieces       NUMERIC(12,2)   DEFAULT 0,
    quality             NUMERIC(5,4)    NOT NULL,
    -- OEE
    oee                 NUMERIC(5,4)    GENERATED ALWAYS AS (availability * performance * quality) STORED,
    -- Context
    primary_job_number  VARCHAR(50),    -- Main job run during this shift
    operator_ids        TEXT[],
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, snapshot_date, shift_code)
);
COMMENT ON TABLE mes_oee_snapshots IS 'Pre-calculated OEE per machine per shift for KPI dashboards. / OEE tinh san theo may theo ca.';
CREATE INDEX idx_moees_equip_date ON mes_oee_snapshots (equipment_id, snapshot_date DESC);
CREATE INDEX idx_moees_oee ON mes_oee_snapshots (oee, snapshot_date DESC);


-- ============================================================================
-- SECTION MES-5: QUALITY DATA (Real-Time SPC Integration)
-- Phan MES-5: Du lieu Chat luong (Tich hop SPC Thoi gian thuc)
-- ============================================================================
-- Extends existing spc_data, inspection_results tables in schema.sql

-- ---------------------------------------------------------------------------
-- MES-5.1 mes_inline_measurements / Do luong trong quy trinh
-- ---------------------------------------------------------------------------
-- In-process measurements taken on the machine or at inline gages.
-- CMM auto-import, manual gage entry, touch probe results.
CREATE TABLE mes_inline_measurements (
    measurement_id      BIGINT          GENERATED ALWAYS AS IDENTITY,
    measured_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,  -- Machine or CMM that measured
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_number         VARCHAR(100)    NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    part_sequence       INT,            -- Which part in the run
    -- Characteristic
    characteristic_id   VARCHAR(100)    NOT NULL,  -- Balloon number or char ID
    characteristic_name VARCHAR(300),
    char_type           char_type_enum,
    char_designator     char_designator DEFAULT 'Standard',
    -- Specification
    nominal             NUMERIC(14,6),
    usl                 NUMERIC(14,6),  -- Upper Specification Limit
    lsl                 NUMERIC(14,6),  -- Lower Specification Limit
    unit                measurement_unit,
    -- Measured value
    measured_value      NUMERIC(14,6)   NOT NULL,
    deviation           NUMERIC(14,6),  -- measured_value - nominal
    -- Result
    conformance         VARCHAR(2)      NOT NULL CHECK (conformance IN ('C', 'NC')),
    -- Source
    measurement_source  VARCHAR(50),    -- 'CMM', 'Touch_Probe', 'Manual_Gage', 'Vision', 'Laser'
    gage_id             VARCHAR(50),    -- FK to equipment for the gage
    measuring_program   VARCHAR(200),   -- CMM program name
    operator_id         VARCHAR(20),
    -- SPC linkage
    spc_subgroup        INT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (measurement_id, measured_at)
);
-- SELECT create_hypertable('mes_inline_measurements', 'measured_at',
--     chunk_time_interval => INTERVAL '7 days');
-- Retain for 30 years (AS9100 traceability for aerospace parts)
COMMENT ON TABLE mes_inline_measurements IS 'In-process measurements from CMM, probes, gages. TimescaleDB hypertable. AS9100 30-year retention. / Do luong trong quy trinh.';
CREATE INDEX idx_mimeas_equip ON mes_inline_measurements (equipment_id, measured_at DESC);
CREATE INDEX idx_mimeas_job ON mes_inline_measurements (job_number, operation_seq, measured_at DESC);
CREATE INDEX idx_mimeas_char ON mes_inline_measurements (characteristic_id, measured_at DESC);
CREATE INDEX idx_mimeas_serial ON mes_inline_measurements (serial_number, measured_at DESC)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mimeas_nc ON mes_inline_measurements (measured_at DESC)
    WHERE conformance = 'NC';

-- ---------------------------------------------------------------------------
-- MES-5.2 mes_spc_control_limits / Gioi han kiem soat SPC
-- ---------------------------------------------------------------------------
-- Control limit definitions per characteristic per item.
-- Relatively static data, updated when new SPC studies are completed.
CREATE TABLE mes_spc_control_limits (
    limit_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    characteristic_id   VARCHAR(100)    NOT NULL,
    chart_type          spc_chart_type_enum NOT NULL DEFAULT 'xbar_r',
    subgroup_size       INT             NOT NULL DEFAULT 5,
    -- Control limits
    ucl_xbar            NUMERIC(14,6),
    lcl_xbar            NUMERIC(14,6),
    cl_xbar             NUMERIC(14,6),  -- Centerline
    ucl_range           NUMERIC(14,6),
    lcl_range           NUMERIC(14,6),
    cl_range            NUMERIC(14,6),
    -- Process capability
    cp                  NUMERIC(8,4),
    cpk                 NUMERIC(8,4),
    pp                  NUMERIC(8,4),
    ppk                 NUMERIC(8,4),
    process_sigma       NUMERIC(8,4),
    -- Study info
    study_date          DATE,
    sample_count        INT,
    calculated_by       UUID,
    approved_by         UUID,
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    UNIQUE (item_id, characteristic_id) WHERE (is_current = TRUE)
);
COMMENT ON TABLE mes_spc_control_limits IS 'SPC control limit definitions per characteristic. / Dinh nghia gioi han kiem soat SPC.';
CREATE INDEX idx_mspc_item ON mes_spc_control_limits (item_id, characteristic_id);

-- ---------------------------------------------------------------------------
-- MES-5.3 mes_spc_violations / Vi pham SPC
-- ---------------------------------------------------------------------------
-- SPC rule violations detected in real-time (Western Electric rules, etc.)
CREATE TABLE mes_spc_violations (
    violation_id        BIGINT          GENERATED ALWAYS AS IDENTITY,
    detected_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    characteristic_id   VARCHAR(100)    NOT NULL,
    job_number          VARCHAR(50),
    -- Violation details
    rule_violated       VARCHAR(50)     NOT NULL,   -- 'BEYOND_UCL', 'BEYOND_LCL', 'RUN_7', 'TREND_7',
                                                    -- '2_OF_3_ZONE_A', '4_OF_5_ZONE_B', '8_SAME_SIDE'
    violation_value     NUMERIC(14,6),
    control_limit_hit   VARCHAR(10),    -- 'UCL', 'LCL', 'ZONE_A', 'ZONE_B'
    -- Response
    acknowledged        BOOLEAN         DEFAULT FALSE,
    acknowledged_by     VARCHAR(20),
    acknowledged_at     TIMESTAMPTZ,
    corrective_action   TEXT,
    ncr_generated       BOOLEAN         DEFAULT FALSE,
    ncr_number          VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (violation_id, detected_at)
);
-- SELECT create_hypertable('mes_spc_violations', 'detected_at',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_spc_violations IS 'Real-time SPC rule violations. / Vi pham quy tac SPC thoi gian thuc.';
CREATE INDEX idx_mspcv_equip ON mes_spc_violations (equipment_id, detected_at DESC);
CREATE INDEX idx_mspcv_item ON mes_spc_violations (item_id, characteristic_id, detected_at DESC);


-- ============================================================================
-- SECTION MES-6: LABOR & OPERATOR
-- Phan MES-6: Lao dong & Nguoi van hanh
-- ============================================================================
-- Extends existing labor_transactions, employees, skills_matrix in schema.sql

-- ---------------------------------------------------------------------------
-- MES-6.1 mes_operator_sessions / Phien lam viec nguoi van hanh
-- ---------------------------------------------------------------------------
-- Real-time operator clock-in/out per machine. More granular than ERP labor_transactions.
CREATE TABLE mes_operator_sessions (
    session_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,  -- FK to employees
    equipment_id        VARCHAR(50)     NOT NULL,  -- Which machine
    shift_code          VARCHAR(5)      NOT NULL,
    -- Timestamps
    login_at            TIMESTAMPTZ     NOT NULL,
    logout_at           TIMESTAMPTZ,
    -- Job context (can change during session via job transitions)
    initial_job_number  VARCHAR(50),
    -- Badge/auth
    login_method        VARCHAR(30)     DEFAULT 'badge', -- badge, password, biometric
    -- Summary (updated on logout)
    total_duration_sec  NUMERIC(10,2),
    productive_sec      NUMERIC(10,2),
    idle_sec            NUMERIC(10,2),
    -- Sync with ERP
    erp_labor_txn_ids   UUID[],        -- Array of labor_transactions.labor_txn_id synced
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_operator_sessions IS 'Real-time operator sessions per machine. Feeds ERP labor_transactions on close. / Phien nguoi van hanh thoi gian thuc.';
CREATE INDEX idx_mopsess_emp ON mes_operator_sessions (employee_id, login_at DESC);
CREATE INDEX idx_mopsess_equip ON mes_operator_sessions (equipment_id, login_at DESC);
CREATE INDEX idx_mopsess_active ON mes_operator_sessions (equipment_id)
    WHERE logout_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-6.2 mes_operator_qualifications / Nang luc nguoi van hanh
-- ---------------------------------------------------------------------------
-- Which operators are qualified to run which machines/operations.
-- Links to skills_matrix in schema.sql.
CREATE TABLE mes_operator_qualifications (
    qual_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,  -- FK to employees
    qualification_type  VARCHAR(50)     NOT NULL,  -- 'machine', 'operation', 'process', 'inspection'
    qualification_code  VARCHAR(50)     NOT NULL,  -- machine_id, operation_code, or process code
    qualification_level VARCHAR(20)     DEFAULT 'qualified', -- 'trainee', 'qualified', 'expert'
    certified_date      DATE,
    expiry_date         DATE,
    certified_by        VARCHAR(20),
    training_record_id  UUID,           -- FK to training_records
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (employee_id, qualification_type, qualification_code)
);
COMMENT ON TABLE mes_operator_qualifications IS 'Operator qualification matrix for machine/operation assignments. / Ma tran nang luc nguoi van hanh.';
CREATE INDEX idx_moqal_emp ON mes_operator_qualifications (employee_id);
CREATE INDEX idx_moqal_code ON mes_operator_qualifications (qualification_type, qualification_code);
CREATE INDEX idx_moqal_expiry ON mes_operator_qualifications (expiry_date)
    WHERE expiry_date IS NOT NULL AND is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-6.3 mes_shift_handover / Ban giao ca
-- ---------------------------------------------------------------------------
CREATE TABLE mes_shift_handover (
    handover_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    handover_date       DATE            NOT NULL,
    shift_from          VARCHAR(5)      NOT NULL,
    shift_to            VARCHAR(5)      NOT NULL,
    operator_from       VARCHAR(20)     NOT NULL,
    operator_to         VARCHAR(20),    -- NULL if next shift hasn't arrived
    -- Status at handover
    job_in_progress     VARCHAR(50),
    operation_in_progress INT,
    parts_completed     NUMERIC(10,2),
    machine_state       semi_e10_state,
    -- Notes
    issues_noted        TEXT,
    pending_actions     TEXT,
    quality_alerts      TEXT,
    tooling_status      TEXT,
    -- Acknowledgment
    acknowledged_at     TIMESTAMPTZ,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shift_handover IS 'Shift handover log per machine. / Nhat ky ban giao ca theo may.';
CREATE INDEX idx_mshh_equip ON mes_shift_handover (equipment_id, handover_date DESC);


-- ============================================================================
-- SECTION MES-7: MATERIAL & WIP TRACKING
-- Phan MES-7: Theo doi Vat lieu & WIP
-- ============================================================================
-- Extends lot_master, serial_master, inventory_transactions in schema.sql

-- ---------------------------------------------------------------------------
-- MES-7.1 mes_material_consumption / Tieu thu vat lieu
-- ---------------------------------------------------------------------------
-- Tracks material issued to and consumed at each operation.
CREATE TABLE mes_material_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50),
    -- Material identification
    item_id             VARCHAR(50)     NOT NULL,  -- FK to items
    lot_number          VARCHAR(100),
    heat_number         VARCHAR(100),
    material_cert_number VARCHAR(100),
    -- Quantities
    consumption_type    material_consumption_type NOT NULL DEFAULT 'CONSUMED',
    qty_consumed        NUMERIC(12,4)   NOT NULL,
    qty_uom             VARCHAR(10)     NOT NULL DEFAULT 'EA',
    -- Traceability
    warehouse_id        VARCHAR(30),
    location_id         VARCHAR(50),
    operator_id         VARCHAR(20),
    -- ERP sync
    erp_inv_txn_id      UUID,          -- FK to inventory_transactions
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_material_consumption IS 'Material consumption tracking per operation for genealogy. / Theo doi tieu thu vat lieu theo cong doan.';
CREATE INDEX idx_mmcons_job ON mes_material_consumption (job_number, operation_seq);
CREATE INDEX idx_mmcons_lot ON mes_material_consumption (lot_number)
    WHERE lot_number IS NOT NULL;
CREATE INDEX idx_mmcons_heat ON mes_material_consumption (heat_number)
    WHERE heat_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.2 mes_wip_location / Vi tri WIP
-- ---------------------------------------------------------------------------
-- Real-time WIP location tracking on the shop floor.
CREATE TABLE mes_wip_location (
    tracking_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    -- Current location
    current_area_id     VARCHAR(30),    -- FK to mes_areas
    current_equipment_id VARCHAR(50),
    current_operation_seq INT,
    current_status      VARCHAR(30)     DEFAULT 'IN_QUEUE',  -- IN_QUEUE, IN_PROCESS, AWAITING_INSPECTION,
                                                             -- IN_INSPECTION, AWAITING_MOVE, ON_HOLD
    -- Move history stored via mes_wip_movements
    qty_at_location     NUMERIC(12,2)   DEFAULT 0,
    arrived_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_wip_location IS 'Real-time WIP location on shop floor. / Vi tri WIP thoi gian thuc tren san xuat.';
CREATE INDEX idx_mwiploc_job ON mes_wip_location (job_number);
CREATE INDEX idx_mwiploc_area ON mes_wip_location (current_area_id);
CREATE INDEX idx_mwiploc_equip ON mes_wip_location (current_equipment_id)
    WHERE current_equipment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.3 mes_wip_movements / Di chuyen WIP
-- ---------------------------------------------------------------------------
-- Audit trail of every WIP movement between locations/operations.
CREATE TABLE mes_wip_movements (
    movement_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    moved_at            TIMESTAMPTZ     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    qty_moved           NUMERIC(12,2)   NOT NULL,
    -- From
    from_area_id        VARCHAR(30),
    from_equipment_id   VARCHAR(50),
    from_operation_seq  INT,
    -- To
    to_area_id          VARCHAR(30),
    to_equipment_id     VARCHAR(50),
    to_operation_seq    INT,
    -- Context
    moved_by            VARCHAR(20),
    move_reason         VARCHAR(100),   -- 'normal_flow', 'rework', 'hold_release', 'expedite'
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (movement_id, moved_at)
);
-- SELECT create_hypertable('mes_wip_movements', 'moved_at',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_wip_movements IS 'WIP movement audit trail. TimescaleDB hypertable. / Nhat ky di chuyen WIP.';
CREATE INDEX idx_mwipmov_job ON mes_wip_movements (job_number, moved_at DESC);


-- ============================================================================
-- SECTION MES-8: TOOLING & FIXTURES (Real-Time)
-- Phan MES-8: Dao cu & Do ga (Thoi gian thuc)
-- ============================================================================
-- Extends tools, tool_transactions in schema.sql

-- ---------------------------------------------------------------------------
-- MES-8.1 mes_tool_life_events / Su kien tuoi tho dao cu
-- ---------------------------------------------------------------------------
-- Every tool usage event: load, unload, breakage, life reached.
CREATE TABLE mes_tool_life_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    tool_id             VARCHAR(50)     NOT NULL,   -- FK to tools
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,   -- 'TOOL_LOAD', 'TOOL_UNLOAD', 'TOOL_CHANGE',
                                                    -- 'LIFE_WARNING', 'LIFE_EXPIRED', 'BREAKAGE',
                                                    -- 'WEAR_OFFSET_UPDATE'
    -- Tool position
    magazine_position   INT,
    -- Life data at event time
    life_count_at_event INT,           -- Parts machined with this tool
    life_time_at_event_min NUMERIC(10,2), -- Minutes of cutting time
    life_remaining_pct  NUMERIC(5,2),
    -- Wear data
    wear_offset_length  NUMERIC(10,4),  -- mm
    wear_offset_diameter NUMERIC(10,4), -- mm
    -- Context
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    operator_id         VARCHAR(20),
    -- Breakage info
    breakage_detected_by VARCHAR(30),   -- 'sensor', 'operator', 'tool_setter'
    breakage_action     VARCHAR(50),    -- 'replaced', 'parts_quarantined'
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
-- SELECT create_hypertable('mes_tool_life_events', 'event_time',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_tool_life_events IS 'Real-time tool life events. TimescaleDB hypertable. / Su kien tuoi tho dao cu thoi gian thuc.';
CREATE INDEX idx_mtle_tool ON mes_tool_life_events (tool_id, event_time DESC);
CREATE INDEX idx_mtle_equip ON mes_tool_life_events (equipment_id, event_time DESC);
CREATE INDEX idx_mtle_breakage ON mes_tool_life_events (event_time DESC)
    WHERE event_type = 'BREAKAGE';

-- ---------------------------------------------------------------------------
-- MES-8.2 mes_fixture_assignments / Phan cong do ga
-- ---------------------------------------------------------------------------
CREATE TABLE mes_fixture_assignments (
    assignment_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id          VARCHAR(50)     NOT NULL,   -- FK to equipment (fixture type)
    equipment_id        VARCHAR(50)     NOT NULL,   -- Machine assigned to
    job_number          VARCHAR(50),
    operation_seq       INT,
    -- Timestamps
    assigned_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    released_at         TIMESTAMPTZ,
    -- Status
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    setup_verified      BOOLEAN         DEFAULT FALSE,
    setup_verified_by   VARCHAR(20),
    setup_verified_at   TIMESTAMPTZ,
    -- Fixture condition
    usage_count         INT             DEFAULT 0,
    max_usage_count     INT,
    last_inspection_date DATE,
    next_inspection_date DATE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_fixture_assignments IS 'Fixture assignment tracking per machine per job. / Theo doi phan cong do ga.';
CREATE INDEX idx_mfixt_fixture ON mes_fixture_assignments (fixture_id);
CREATE INDEX idx_mfixt_equip ON mes_fixture_assignments (equipment_id)
    WHERE is_active = TRUE;
CREATE INDEX idx_mfixt_job ON mes_fixture_assignments (job_number)
    WHERE job_number IS NOT NULL;


-- ============================================================================
-- SECTION MES-9: SCHEDULING & DISPATCH
-- Phan MES-9: Lap lich & Dieu do
-- ============================================================================
-- Extends production_schedule in schema.sql with live dispatch capability

-- ---------------------------------------------------------------------------
-- MES-9.1 mes_dispatch_queue / Hang doi dieu do
-- ---------------------------------------------------------------------------
-- Live dispatch queue per machine. Operators see this on their HMI.
CREATE TABLE mes_dispatch_queue (
    queue_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    -- Job/operation
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    -- Priority
    dispatch_priority   dispatch_priority NOT NULL DEFAULT 'STANDARD',
    sequence_in_queue   INT             NOT NULL,
    -- Schedule
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    est_setup_minutes   NUMERIC(8,2),
    est_run_minutes     NUMERIC(8,2),
    qty_to_produce      NUMERIC(12,2)   NOT NULL,
    -- Status
    queue_status        VARCHAR(30)     DEFAULT 'QUEUED',  -- QUEUED, READY, IN_PROGRESS, COMPLETE, SKIPPED
    -- Constraints
    material_available  BOOLEAN         DEFAULT FALSE,
    tooling_available   BOOLEAN         DEFAULT FALSE,
    fixture_available   BOOLEAN         DEFAULT FALSE,
    operator_qualified  BOOLEAN         DEFAULT FALSE,
    all_constraints_met BOOLEAN         GENERATED ALWAYS AS (
        material_available AND tooling_available AND fixture_available AND operator_qualified
    ) STORED,
    -- Notes
    planner_notes       TEXT,
    -- Source
    source_schedule_id  UUID,           -- FK to production_schedule
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, job_number, operation_seq)
);
COMMENT ON TABLE mes_dispatch_queue IS 'Live dispatch queue per machine. Operators see next jobs. / Hang doi dieu do thoi gian thuc theo may.';
CREATE INDEX idx_mdq_equip ON mes_dispatch_queue (equipment_id, sequence_in_queue)
    WHERE queue_status IN ('QUEUED', 'READY');
CREATE INDEX idx_mdq_priority ON mes_dispatch_queue (dispatch_priority, sequence_in_queue);
CREATE INDEX idx_mdq_constraints ON mes_dispatch_queue (equipment_id)
    WHERE all_constraints_met = FALSE AND queue_status = 'QUEUED';


-- ============================================================================
-- SECTION MES-10: MAINTENANCE INTEGRATION (CMMS)
-- Phan MES-10: Tich hop Bao tri (CMMS)
-- ============================================================================
-- Extends maintenance_work_orders, equipment in schema.sql

-- ---------------------------------------------------------------------------
-- MES-10.1 mes_downtime_events / Su kien ngung may
-- ---------------------------------------------------------------------------
-- Every machine downtime event, auto-detected or manually entered.
-- Links to maintenance_work_orders when WO is created.
CREATE TABLE mes_downtime_events (
    downtime_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    start_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    end_time            TIMESTAMPTZ,    -- NULL while still down
    duration_seconds    NUMERIC(12,2),
    -- Classification
    is_planned          BOOLEAN         NOT NULL DEFAULT FALSE,
    downtime_category   VARCHAR(50),    -- 'mechanical', 'electrical', 'tooling', 'program',
                                        -- 'quality_hold', 'material_wait', 'no_operator',
                                        -- 'changeover', 'planned_maintenance', 'break'
    reason_code         VARCHAR(50),
    reason_text         VARCHAR(500),
    -- Failure data (for unplanned)
    failure_code        VARCHAR(50),
    failure_mode        VARCHAR(200),
    root_cause_code     VARCHAR(50),
    -- Impact
    jobs_affected       TEXT[],
    estimated_loss_units NUMERIC(10,2),
    -- Resolution
    resolved_by         VARCHAR(20),
    resolution_action   TEXT,
    -- Links
    maint_wo_id         UUID,           -- FK to maintenance_work_orders when WO generated
    state_event_id      BIGINT,         -- FK to mes_machine_state_events
    -- Source
    detection_method    VARCHAR(30)     DEFAULT 'automatic', -- automatic, manual, alarm
    operator_id         VARCHAR(20),
    shift_code          VARCHAR(5),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (downtime_id, start_time)
);
-- SELECT create_hypertable('mes_downtime_events', 'start_time',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_downtime_events IS 'Machine downtime events for MTBF/MTTR calculation. TimescaleDB hypertable. / Su kien ngung may de tinh MTBF/MTTR.';
CREATE INDEX idx_mdt_equip ON mes_downtime_events (equipment_id, start_time DESC);
CREATE INDEX idx_mdt_active ON mes_downtime_events (equipment_id)
    WHERE end_time IS NULL;
CREATE INDEX idx_mdt_category ON mes_downtime_events (downtime_category, start_time DESC);
CREATE INDEX idx_mdt_failure ON mes_downtime_events (failure_code, start_time DESC)
    WHERE failure_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-10.2 mes_pm_execution / Thuc thi bao tri phong ngua
-- ---------------------------------------------------------------------------
-- PM task execution tracking (supplements maintenance_work_orders with checklist data)
CREATE TABLE mes_pm_execution (
    pm_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,   -- FK to maintenance_work_orders
    equipment_id        VARCHAR(50)     NOT NULL,
    -- Checklist items
    checklist_items     JSONB           NOT NULL DEFAULT '[]',
    -- Example: [{"item": "Check spindle runout", "result": "0.003mm", "status": "PASS"},
    --           {"item": "Inspect way covers", "result": "Torn left side", "status": "FAIL"}]
    all_items_pass      BOOLEAN,
    -- Meter readings
    spindle_hours       NUMERIC(12,2),
    axis_total_distance_km NUMERIC(12,2),
    coolant_concentration_pct NUMERIC(5,2),
    -- Next PM calculation
    pm_interval_hours   NUMERIC(10,2),
    next_pm_due_date    DATE,
    next_pm_due_hours   NUMERIC(12,2),
    -- Sign-off
    performed_by        VARCHAR(20)     NOT NULL,
    verified_by         VARCHAR(20),
    performed_at        TIMESTAMPTZ     NOT NULL,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_pm_execution IS 'PM execution with checklist and meter readings. / Thuc thi PM voi danh sach kiem tra va so dong ho.';
CREATE INDEX idx_mpmex_equip ON mes_pm_execution (equipment_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- MES-10.3 mes_spare_parts_consumption / Tieu thu phu tung
-- ---------------------------------------------------------------------------
CREATE TABLE mes_spare_parts_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,  -- FK to maintenance_work_orders
    equipment_id        VARCHAR(50)     NOT NULL,
    spare_part_id       VARCHAR(50)     NOT NULL,  -- FK to items
    qty_consumed        NUMERIC(10,2)   NOT NULL,
    unit_cost           NUMERIC(12,2),
    total_cost          NUMERIC(12,2),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    consumed_by         VARCHAR(20),
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_spare_parts_consumption IS 'Spare parts consumed during maintenance. / Phu tung tieu thu khi bao tri.';
CREATE INDEX idx_mspc_equip ON mes_spare_parts_consumption (equipment_id);
CREATE INDEX idx_mspc_part ON mes_spare_parts_consumption (spare_part_id);


-- ============================================================================
-- SECTION MES-11: TRACEABILITY & GENEALOGY (AS9100)
-- Phan MES-11: Truy xuat & Gia he (AS9100)
-- ============================================================================
-- Full part genealogy: which machine, tool, material, operator, program
-- for every part at every operation. Required for AS9100D aerospace.
-- Retention: 30+ years.

-- ---------------------------------------------------------------------------
-- MES-11.1 mes_part_genealogy / Gia he san pham
-- ---------------------------------------------------------------------------
-- Master genealogy record per serialized part or lot.
-- One row per serial (or lot if not serialized).
CREATE TABLE mes_part_genealogy (
    genealogy_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Part identification
    job_number          VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),   -- For serialized parts
    lot_number          VARCHAR(100),   -- For lot-tracked parts
    -- Summary fields for quick lookup
    customer_id         VARCHAR(50),
    sales_order_ref     VARCHAR(50),
    -- Material traceability
    raw_material_item_id VARCHAR(50),
    raw_material_lot    VARCHAR(100),
    raw_material_heat   VARCHAR(100),
    material_cert_ref   VARCHAR(200),   -- Material test report / mill cert reference
    material_spec       VARCHAR(200),   -- e.g., 'AMS 5643' (17-4PH), 'AMS 4928' (Ti-6Al-4V)
    -- Manufacturing summary
    operations_completed INT,
    total_operations    INT,
    first_operation_date TIMESTAMPTZ,
    last_operation_date TIMESTAMPTZ,
    -- Quality summary
    all_inspections_pass BOOLEAN,
    fai_number          VARCHAR(50),
    certificate_of_conformance VARCHAR(100),
    -- Status
    final_disposition   VARCHAR(30),    -- 'SHIPPED', 'SCRAPPED', 'REWORK', 'ON_HOLD'
    ship_date           DATE,
    shipment_id         UUID,           -- FK to shipments
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_part_genealogy IS 'Master genealogy per serial/lot. AS9100 30-year retention. / Gia he chinh theo so seri/lo.';
CREATE UNIQUE INDEX idx_mpgen_serial ON mes_part_genealogy (serial_number)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mpgen_lot ON mes_part_genealogy (lot_number)
    WHERE lot_number IS NOT NULL;
CREATE INDEX idx_mpgen_job ON mes_part_genealogy (job_number);
CREATE INDEX idx_mpgen_item ON mes_part_genealogy (item_id, part_rev);
CREATE INDEX idx_mpgen_material ON mes_part_genealogy (raw_material_heat)
    WHERE raw_material_heat IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-11.2 mes_genealogy_operations / Cong doan gia he
-- ---------------------------------------------------------------------------
-- Per-operation detail for each genealogy record.
-- "What happened to this part at each step?"
CREATE TABLE mes_genealogy_operations (
    gen_op_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    genealogy_id        UUID            NOT NULL REFERENCES mes_part_genealogy(genealogy_id),
    operation_seq       INT             NOT NULL,
    operation_code      VARCHAR(30),
    operation_desc      VARCHAR(300),
    -- Equipment
    equipment_id        VARCHAR(50)     NOT NULL,
    equipment_name      VARCHAR(200),
    -- Program
    nc_program_name     VARCHAR(200),
    nc_program_revision VARCHAR(20),
    -- Operator
    operator_id         VARCHAR(20)     NOT NULL,
    operator_name       VARCHAR(150),
    -- Timing
    started_at          TIMESTAMPTZ     NOT NULL,
    completed_at        TIMESTAMPTZ,
    setup_time_sec      NUMERIC(10,2),
    cycle_time_sec      NUMERIC(10,2),
    -- Tooling used
    tools_used          JSONB           DEFAULT '[]',  -- [{tool_id, tool_number, life_at_use}]
    fixture_id          VARCHAR(50),
    -- Material consumed at this operation
    materials_consumed  JSONB           DEFAULT '[]',  -- [{item_id, lot, heat, qty}]
    -- Quality at this operation
    inspection_result   VARCHAR(10),    -- 'PASS', 'FAIL', 'NOT_INSPECTED'
    measurements        JSONB           DEFAULT '[]',  -- [{char_id, nominal, measured, usl, lsl, result}]
    ncr_numbers         TEXT[],
    -- Process parameters snapshot
    process_params      JSONB           DEFAULT '{}',  -- {avg_spindle_load, max_vibration, coolant_temp}
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_genealogy_operations IS 'Per-operation genealogy detail. Full traceability per part per step. / Chi tiet gia he theo cong doan.';
CREATE INDEX idx_mgenop_gen ON mes_genealogy_operations (genealogy_id, operation_seq);
CREATE INDEX idx_mgenop_equip ON mes_genealogy_operations (equipment_id, started_at DESC);
CREATE INDEX idx_mgenop_operator ON mes_genealogy_operations (operator_id, started_at DESC);


-- ============================================================================
-- SECTION MES-12: DIGITAL TWIN & REAL-TIME DASHBOARD
-- Phan MES-12: Song sinh Ky thuat so & Bang dieu khien Thoi gian thuc
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-12.1 mes_machine_snapshot / Anh chup trang thai may (denormalized)
-- ---------------------------------------------------------------------------
-- Denormalized current state of every machine for dashboard rendering.
-- Updated every few seconds via triggers or application logic.
-- This avoids expensive JOINs for real-time dashboards.
CREATE TABLE mes_machine_snapshot (
    equipment_id        VARCHAR(50)     PRIMARY KEY,
    -- SEMI E10 state
    e10_state           semi_e10_state  NOT NULL DEFAULT 'NON_SCHEDULED',
    e10_substate        VARCHAR(50),
    state_since         TIMESTAMPTZ,
    state_duration_sec  NUMERIC(10,2),
    -- Current job
    job_number          VARCHAR(50),
    part_number         VARCHAR(100),
    customer_name       VARCHAR(200),
    operation_seq       INT,
    operation_desc      VARCHAR(300),
    qty_required        NUMERIC(12,2),
    qty_completed       NUMERIC(12,2),
    qty_remaining       NUMERIC(12,2),
    -- Cycle
    program_name        VARCHAR(200),
    current_tool_number INT,
    cycle_time_target_sec NUMERIC(10,2),
    cycle_time_last_sec NUMERIC(10,2),
    cycle_time_avg_sec  NUMERIC(10,2),
    est_completion_time TIMESTAMPTZ,
    -- Operator
    operator_id         VARCHAR(20),
    operator_name       VARCHAR(150),
    -- OEE (current shift)
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    -- Shift counters
    parts_good_shift    INT             DEFAULT 0,
    parts_scrap_shift   INT             DEFAULT 0,
    parts_rework_shift  INT             DEFAULT 0,
    -- Alarms
    active_alarm_count  INT             DEFAULT 0,
    highest_alarm_severity mes_event_severity,
    -- Machine health
    spindle_load_pct    NUMERIC(6,2),
    coolant_temp_c      NUMERIC(6,2),
    vibration_mm_s      NUMERIC(8,4),
    -- Next in queue
    next_job_number     VARCHAR(50),
    next_part_number    VARCHAR(100),
    -- Timestamps
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    heartbeat_age_sec   NUMERIC(10,2)
);
COMMENT ON TABLE mes_machine_snapshot IS 'Denormalized machine state for real-time dashboard. Updated every few seconds. / Trang thai may tong hop cho bang dieu khien.';

-- ---------------------------------------------------------------------------
-- MES-12.2 mes_shop_floor_layout / Bo tri mat bang san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE mes_shop_floor_layout (
    layout_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    layout_name         VARCHAR(200)    NOT NULL,
    layout_version      INT             NOT NULL DEFAULT 1,
    -- SVG-based layout
    svg_content         TEXT,           -- SVG markup with machine position placeholders
    -- Machine positions for rendering
    machine_positions   JSONB           NOT NULL DEFAULT '[]',
    -- Example: [{"equipment_id": "MC-001", "x": 150, "y": 200, "rotation": 0, "width": 80, "height": 60}]
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shop_floor_layout IS 'Shop floor SVG layout for digital twin visualization. / Bo tri mat bang cho hinh anh song sinh.';


-- ============================================================================
-- SECTION MES-13: KPI & ANALYTICS EXTENSIONS
-- Phan MES-13: Mo rong KPI & Phan tich
-- ============================================================================
-- Extends kpi_definitions, kpi_snapshots in schema.sql

-- ---------------------------------------------------------------------------
-- MES-13.1 mes_production_kpi_daily / KPI san xuat hang ngay
-- ---------------------------------------------------------------------------
-- Daily roll-up of production KPIs per machine, per area, and plant-wide.
CREATE TABLE mes_production_kpi_daily (
    kpi_date            DATE            NOT NULL,
    dimension_type      VARCHAR(20)     NOT NULL,   -- 'machine', 'area', 'plant'
    dimension_id        VARCHAR(50)     NOT NULL,   -- equipment_id, area_id, or 'PLANT'
    shift_code          VARCHAR(5),     -- NULL for full-day aggregate
    -- Volume
    total_parts_produced NUMERIC(12,2),
    total_parts_good    NUMERIC(12,2),
    total_parts_scrap   NUMERIC(12,2),
    total_parts_rework  NUMERIC(12,2),
    -- OEE
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    -- Time utilization (seconds)
    planned_time_sec    NUMERIC(12,2),
    productive_time_sec NUMERIC(12,2),
    setup_time_sec      NUMERIC(12,2),
    downtime_sec        NUMERIC(12,2),
    idle_time_sec       NUMERIC(12,2),
    -- Throughput
    parts_per_hour      NUMERIC(8,2),
    -- Scrap rate
    scrap_rate_pct      NUMERIC(5,2),
    -- Cost (if available)
    est_cost_per_part   NUMERIC(12,4),
    -- Top loss reasons (denormalized for dashboard)
    top_downtime_reasons JSONB          DEFAULT '[]',  -- [{reason, minutes, count}]
    top_scrap_reasons   JSONB           DEFAULT '[]',  -- [{reason, qty}]
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (kpi_date, dimension_type, dimension_id, COALESCE(shift_code, 'ALL'))
);
COMMENT ON TABLE mes_production_kpi_daily IS 'Daily production KPI roll-ups by machine/area/plant. / Tong hop KPI san xuat hang ngay.';
CREATE INDEX idx_mpkpi_dim ON mes_production_kpi_daily (dimension_type, dimension_id, kpi_date DESC);
CREATE INDEX idx_mpkpi_oee ON mes_production_kpi_daily (oee_overall, kpi_date DESC);

-- ---------------------------------------------------------------------------
-- MES-13.2 mes_on_time_delivery / Giao hang dung hen
-- ---------------------------------------------------------------------------
-- Tracks on-time delivery performance per job/order.
CREATE TABLE mes_on_time_delivery (
    otd_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    sales_order_ref     VARCHAR(50),
    customer_id         VARCHAR(50),
    item_id             VARCHAR(50),
    qty_ordered         NUMERIC(12,2),
    qty_shipped         NUMERIC(12,2),
    -- Dates
    customer_request_date DATE          NOT NULL,
    promised_date       DATE            NOT NULL,
    actual_ship_date    DATE,
    -- OTD calculation
    days_early_late     INT,            -- Negative = early, positive = late
    is_on_time          BOOLEAN,
    -- Root cause if late
    late_reason_code    VARCHAR(50),
    late_reason_text    TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_on_time_delivery IS 'On-time delivery tracking per job. / Theo doi giao hang dung hen.';
CREATE INDEX idx_motd_customer ON mes_on_time_delivery (customer_id, actual_ship_date DESC);
CREATE INDEX idx_motd_late ON mes_on_time_delivery (is_on_time, actual_ship_date DESC)
    WHERE is_on_time = FALSE;


-- ============================================================================
-- SECTION MES-14: ERP INTEGRATION STAGING
-- Phan MES-14: Khu vuc tich hop ERP
-- ============================================================================
-- Staging tables for bi-directional Epicor Kinetic integration.

-- ---------------------------------------------------------------------------
-- MES-14.1 mes_erp_inbound_queue / Hang doi du lieu tu ERP
-- ---------------------------------------------------------------------------
-- Jobs, schedules, BOMs, routings synced from Epicor to MES.
CREATE TABLE mes_erp_inbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    received_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,  -- 'job_order', 'schedule', 'item', 'bom', 'routing'
    entity_id           VARCHAR(100)    NOT NULL,
    action              VARCHAR(20)     NOT NULL,  -- 'create', 'update', 'delete', 'release'
    payload             JSONB           NOT NULL,
    -- Processing
    processed_at        TIMESTAMPTZ,
    process_status      VARCHAR(20)     DEFAULT 'PENDING', -- PENDING, PROCESSING, SUCCESS, ERROR
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_inbound_queue IS 'Inbound queue for Epicor -> MES data sync. / Hang doi du lieu tu Epicor sang MES.';
CREATE INDEX idx_meiq_status ON mes_erp_inbound_queue (process_status, received_at)
    WHERE process_status != 'SUCCESS';

-- ---------------------------------------------------------------------------
-- MES-14.2 mes_erp_outbound_queue / Hang doi du lieu len ERP
-- ---------------------------------------------------------------------------
-- Labor, quantities, scrap, downtime synced from MES to Epicor.
CREATE TABLE mes_erp_outbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,  -- 'labor_report', 'qty_complete', 'scrap_report',
                                                    -- 'downtime', 'material_issue'
    entity_id           VARCHAR(100)    NOT NULL,
    payload             JSONB           NOT NULL,
    -- Processing
    sent_at             TIMESTAMPTZ,
    send_status         VARCHAR(20)     DEFAULT 'PENDING', -- PENDING, SENDING, SUCCESS, ERROR
    erp_response        JSONB,
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_outbound_queue IS 'Outbound queue for MES -> Epicor data sync. / Hang doi du lieu tu MES sang Epicor.';
CREATE INDEX idx_meoq_status ON mes_erp_outbound_queue (send_status, created_at)
    WHERE send_status != 'SUCCESS';


-- ============================================================================
-- SECTION MES-15: NOTIFICATION CHANNELS & EVENT BUS
-- Phan MES-15: Kenh Thong bao & Bus Su kien
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-15.1 mes_event_subscriptions / Dang ky su kien
-- ---------------------------------------------------------------------------
-- Configures which events trigger which notifications to which roles/users.
CREATE TABLE mes_event_subscriptions (
    subscription_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          VARCHAR(100)    NOT NULL,   -- 'MACHINE_DOWN', 'SPC_VIOLATION', 'TOOL_BREAKAGE',
                                                    -- 'JOB_COMPLETE', 'QUALITY_HOLD', 'PM_DUE'
    equipment_filter    VARCHAR(50),    -- NULL = all machines, specific = one machine
    area_filter         VARCHAR(30),    -- NULL = all areas
    severity_min        mes_event_severity DEFAULT 'INFO',
    -- Target
    notify_user_id      UUID,           -- FK to users
    notify_role_code    VARCHAR(50),    -- Or notify all users with this role
    -- Channel
    channel             VARCHAR(30)     NOT NULL DEFAULT 'app', -- 'app', 'email', 'sms', 'andon'
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_event_subscriptions IS 'Event subscription rules for MES notifications. / Quy tac dang ky su kien cho thong bao MES.';
CREATE INDEX idx_mesub_event ON mes_event_subscriptions (event_type)
    WHERE is_active = TRUE;


-- ============================================================================
-- SECTION MES-16: VIEWS FOR COMMON QUERIES
-- Phan MES-16: View cho cac truy van thuong dung
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-16.1 Active machines with current state
-- ---------------------------------------------------------------------------
-- CREATE VIEW v_mes_active_machines AS
-- SELECT
--     e.equipment_id,
--     e.equipment_name,
--     e.equipment_type,
--     ex.area_id,
--     a.area_name,
--     ex.current_e10_state,
--     snap.job_number,
--     snap.part_number,
--     snap.operator_name,
--     snap.oee_overall,
--     snap.parts_good_shift,
--     snap.active_alarm_count,
--     snap.last_updated
-- FROM equipment e
-- JOIN mes_equipment_extended ex ON e.equipment_id = ex.equipment_id
-- LEFT JOIN mes_machine_snapshot snap ON e.equipment_id = snap.equipment_id
-- LEFT JOIN mes_areas a ON ex.area_id = a.area_id
-- WHERE e.is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-16.2 Current dispatch queue (next 5 jobs per machine)
-- ---------------------------------------------------------------------------
-- CREATE VIEW v_mes_dispatch_board AS
-- SELECT
--     dq.equipment_id,
--     e.equipment_name,
--     dq.sequence_in_queue,
--     dq.job_number,
--     jo.item_id,
--     i.item_description,
--     dq.operation_seq,
--     dq.dispatch_priority,
--     dq.qty_to_produce,
--     dq.scheduled_start,
--     dq.all_constraints_met,
--     dq.queue_status
-- FROM mes_dispatch_queue dq
-- JOIN equipment e ON dq.equipment_id = e.equipment_id
-- LEFT JOIN job_orders jo ON dq.job_number = jo.job_number
-- LEFT JOIN items i ON jo.item_id = i.item_id
-- WHERE dq.queue_status IN ('QUEUED', 'READY', 'IN_PROGRESS')
-- ORDER BY dq.equipment_id, dq.sequence_in_queue;

-- ---------------------------------------------------------------------------
-- MES-16.3 OEE Pareto by machine (current month)
-- ---------------------------------------------------------------------------
-- CREATE VIEW v_mes_oee_pareto_mtd AS
-- SELECT
--     equipment_id,
--     AVG(oee) AS avg_oee,
--     AVG(availability) AS avg_availability,
--     AVG(performance) AS avg_performance,
--     AVG(quality) AS avg_quality,
--     COUNT(*) AS shift_count
-- FROM mes_oee_snapshots
-- WHERE snapshot_date >= date_trunc('month', CURRENT_DATE)
-- GROUP BY equipment_id
-- ORDER BY avg_oee ASC;

-- ---------------------------------------------------------------------------
-- MES-16.4 Part traceability lookup
-- ---------------------------------------------------------------------------
-- CREATE VIEW v_mes_part_trace AS
-- SELECT
--     g.serial_number,
--     g.lot_number,
--     g.item_id,
--     g.part_rev,
--     g.raw_material_heat,
--     g.material_spec,
--     go2.operation_seq,
--     go2.operation_desc,
--     go2.equipment_id,
--     go2.operator_id,
--     go2.nc_program_name,
--     go2.started_at,
--     go2.completed_at,
--     go2.cycle_time_sec,
--     go2.inspection_result,
--     go2.tools_used,
--     go2.process_params
-- FROM mes_part_genealogy g
-- JOIN mes_genealogy_operations go2 ON g.genealogy_id = go2.genealogy_id
-- ORDER BY g.serial_number, go2.operation_seq;


-- ============================================================================
-- SECTION MES-17: POSTGRESQL LISTEN/NOTIFY CHANNELS
-- Phan MES-17: Kenh LISTEN/NOTIFY PostgreSQL
-- ============================================================================
-- For real-time event streaming within the MES application layer.
-- Application subscribes to these channels via pg_listen.

-- Channel definitions (implemented via application-layer triggers):
--
-- mes_machine_state_change  : Fired on INSERT to mes_machine_state_events
--   Payload: {"equipment_id": "MC-001", "state": "UNSCHEDULED_DOWN", "reason": "Spindle alarm"}
--
-- mes_alarm_triggered       : Fired on INSERT to mes_machine_alarms WHERE severity >= 'ALARM'
--   Payload: {"equipment_id": "MC-001", "alarm_code": "AL-0150", "text": "Spindle overload"}
--
-- mes_spc_violation         : Fired on INSERT to mes_spc_violations
--   Payload: {"equipment_id": "CMM-01", "item_id": "P-1234", "rule": "BEYOND_UCL"}
--
-- mes_job_complete          : Fired when mes_operation_execution.is_complete = TRUE (last op)
--   Payload: {"job_number": "J-2026-0123", "equipment_id": "MC-005"}
--
-- mes_tool_breakage         : Fired on INSERT to mes_tool_life_events WHERE event_type = 'BREAKAGE'
--   Payload: {"tool_id": "T-001", "equipment_id": "MC-003", "job": "J-2026-0100"}
--
-- mes_downtime_started      : Fired on INSERT to mes_downtime_events
--   Payload: {"equipment_id": "MC-007", "category": "mechanical", "reason": "Spindle bearing"}
--
-- mes_dispatch_update       : Fired on INSERT/UPDATE to mes_dispatch_queue
--   Payload: {"equipment_id": "MC-001", "action": "QUEUE_CHANGED"}


-- ============================================================================
-- SECTION MES-18: TRIGGER FUNCTIONS
-- Phan MES-18: Ham Trigger
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-18.1 Auto-calculate state duration on new state event
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION fn_mes_calc_state_duration()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     UPDATE mes_machine_state_events
--     SET duration_seconds = EXTRACT(EPOCH FROM NEW.event_time - event_time)
--     WHERE equipment_id = NEW.equipment_id
--       AND event_time = (
--           SELECT MAX(event_time)
--           FROM mes_machine_state_events
--           WHERE equipment_id = NEW.equipment_id
--             AND event_time < NEW.event_time
--       );
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_mes_state_duration
-- AFTER INSERT ON mes_machine_state_events
-- FOR EACH ROW EXECUTE FUNCTION fn_mes_calc_state_duration();

-- ---------------------------------------------------------------------------
-- MES-18.2 Auto-update machine snapshot on state change
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION fn_mes_update_snapshot()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     UPDATE mes_machine_snapshot
--     SET e10_state = NEW.e10_state,
--         e10_substate = COALESCE(NEW.productive_sub::TEXT, NEW.standby_sub::TEXT,
--                                 NEW.unsched_down_sub::TEXT),
--         state_since = NEW.event_time,
--         last_updated = now()
--     WHERE equipment_id = NEW.equipment_id;
--     -- NOTIFY for real-time dashboard
--     PERFORM pg_notify('mes_machine_state_change',
--         json_build_object(
--             'equipment_id', NEW.equipment_id,
--             'state', NEW.e10_state,
--             'reason', NEW.reason_text
--         )::TEXT
--     );
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_mes_snapshot_update
-- AFTER INSERT ON mes_machine_state_events
-- FOR EACH ROW EXECUTE FUNCTION fn_mes_update_snapshot();

-- ---------------------------------------------------------------------------
-- MES-18.3 Auto-generate downtime event from state transition
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION fn_mes_auto_downtime()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.e10_state IN ('UNSCHEDULED_DOWN', 'SCHEDULED_DOWN') THEN
--         INSERT INTO mes_downtime_events (
--             start_time, equipment_id, is_planned,
--             downtime_category, reason_code, reason_text,
--             operator_id, shift_code, detection_method
--         ) VALUES (
--             NEW.event_time, NEW.equipment_id,
--             (NEW.e10_state = 'SCHEDULED_DOWN'),
--             COALESCE(NEW.unsched_down_sub::TEXT, 'unknown'),
--             NEW.reason_code, NEW.reason_text,
--             NEW.operator_id, NEW.shift_code, NEW.source
--         );
--     END IF;
--     -- Close previous downtime if machine is now productive or standby
--     IF NEW.e10_state IN ('PRODUCTIVE', 'STANDBY', 'ENGINEERING') THEN
--         UPDATE mes_downtime_events
--         SET end_time = NEW.event_time,
--             duration_seconds = EXTRACT(EPOCH FROM NEW.event_time - start_time)
--         WHERE equipment_id = NEW.equipment_id
--           AND end_time IS NULL;
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;


-- ============================================================================
-- TABLE COUNT SUMMARY
-- ============================================================================
-- New MES tables: 30
--   Relational (PostgreSQL):        18
--   Time-series (TimescaleDB):       12 (hypertables + continuous aggregates)
--
-- Existing QMS tables referenced:   103 (from schema.sql)
-- Total system tables:              133
--
-- TimescaleDB Hypertables:
--   mes_machine_state_events     (1-day chunks, compress 7d, retain 2y)
--   mes_machine_telemetry        (1-day chunks, compress 1d, retain 90d)
--   mes_machine_alarms           (7-day chunks, compress 30d, retain 5y)
--   mes_program_events           (7-day chunks, compress 30d, retain 5y)
--   mes_cycle_events             (7-day chunks, compress 30d, retain forever)
--   mes_oee_loss_events          (7-day chunks, compress 30d, retain 5y)
--   mes_inline_measurements      (7-day chunks, compress 30d, retain forever)
--   mes_spc_violations           (30-day chunks, compress 90d, retain 10y)
--   mes_downtime_events          (30-day chunks, compress 90d, retain 10y)
--   mes_tool_life_events         (30-day chunks, compress 90d, retain 7y)
--   mes_wip_movements            (30-day chunks, compress 90d, retain 5y)
--
-- Continuous Aggregates:
--   mes_telemetry_1min           (retain 2 years)
--   mes_telemetry_1hr            (retain 7 years, AS9100)
--
-- LISTEN/NOTIFY Channels: 7
--   mes_machine_state_change, mes_alarm_triggered, mes_spc_violation,
--   mes_job_complete, mes_tool_breakage, mes_downtime_started, mes_dispatch_update

-- ============================================================================
-- DATA FLOW DIAGRAM (TEXT)
-- ============================================================================
--
-- EPICOR KINETIC ERP                    MES DATABASE                      SHOP FLOOR
-- ==================                    ============                      ==========
--
-- job_orders ---------> mes_erp_inbound_queue ------> mes_dispatch_queue --> Operator HMI
-- production_schedule -> mes_erp_inbound_queue ------> mes_dispatch_queue
-- items, routings ----> mes_erp_inbound_queue
--
-- <--- mes_erp_outbound_queue <------ mes_operation_execution            <-- Badge scan
-- <--- labor_transactions     <------ mes_operator_sessions              <-- Machine data
-- <--- job_orders (qty)       <------ mes_cycle_events                   <-- MTConnect
-- <--- inventory_transactions <------ mes_material_consumption           <-- OPC-UA
--
-- QUALITY FLOW:
-- inspection_plans ---> mes_spc_control_limits
-- <--- inspection_results <--- mes_inline_measurements <--- CMM/Touch Probe
-- <--- spc_data           <--- mes_spc_violations
-- <--- ncr_records        <--- SPC rule violations (auto-NCR)
--
-- MAINTENANCE FLOW:
-- equipment ---------> mes_equipment_extended
-- <--- maintenance_work_orders <--- mes_downtime_events (auto-WO on alarm)
-- <--- mes_pm_execution -------> calibration_records
--
-- TRACEABILITY FLOW:
-- mes_part_genealogy <--- mes_genealogy_operations <--- mes_cycle_events
--                    <--- mes_material_consumption
--                    <--- mes_inline_measurements
--                    <--- mes_tool_life_events
--                    ---> certificates (CoC generation)
--                    ---> shipments

-- ============================================================================
-- END OF MES DATABASE SCHEMA SPECIFICATION
-- ============================================================================
