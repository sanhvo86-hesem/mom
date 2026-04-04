-- Migration: 043_production_dispatch_shift_targets.sql
-- Description: Production dispatch enhancements - shift targets, production output tracking, operator performance
-- Dependencies: 041_ai_predictive_quality_aps.sql, 042_fmea_apqp_control_plan_mobile.sql
-- Rollback: DROP TABLE shift_production_log, shift_targets CASCADE; DROP TYPE IF EXISTS shift_code_enum;

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN CREATE TYPE shift_code_enum AS ENUM ('morning', 'afternoon', 'night'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- shift_targets / Dinh muc san xuat theo ca
-- Stores: how many pieces each WO should produce per shift on each machine
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_targets (
    target_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wo_number               VARCHAR(50)     NOT NULL,
    jo_number               VARCHAR(50),
    item_id                 VARCHAR(50),
    item_description        VARCHAR(500),
    machine_id              VARCHAR(50)     NOT NULL,
    operator_id             VARCHAR(20),
    shift_date              DATE            NOT NULL,
    shift_code              shift_code_enum NOT NULL DEFAULT 'morning',
    -- Timing per piece
    cycle_time_minutes      NUMERIC(10,2)   NOT NULL DEFAULT 0,
    setup_time_minutes      NUMERIC(10,2)   DEFAULT 0,
    -- Shift capacity
    shift_duration_minutes  NUMERIC(10,2)   DEFAULT 480,
    -- Target quantity = (shift_duration - setup_time) / cycle_time
    target_quantity         INT             NOT NULL DEFAULT 0,
    -- Priority for dispatch ordering
    priority                INT             DEFAULT 50,
    dispatch_sequence       INT             DEFAULT 1,
    -- Status
    status                  VARCHAR(20)     DEFAULT 'planned'
                            CHECK (status IN ('planned', 'dispatched', 'in_progress', 'completed', 'cancelled')),
    dispatched_at           TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    -- Notes
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_by              VARCHAR(50),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shift_targets IS 'Shift production targets per WO per machine. Defines how many pieces to produce each shift. / Dinh muc san xuat theo ca cho moi WO tren moi may.';

CREATE INDEX IF NOT EXISTS idx_shift_targets_wo ON shift_targets (wo_number);
CREATE INDEX IF NOT EXISTS idx_shift_targets_machine ON shift_targets (machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_targets_operator ON shift_targets (operator_id);
CREATE INDEX IF NOT EXISTS idx_shift_targets_date ON shift_targets (shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_targets_shift ON shift_targets (shift_code);
CREATE INDEX IF NOT EXISTS idx_shift_targets_status ON shift_targets (status);

-- ============================================================================
-- shift_production_log / Nhat ky san xuat theo ca
-- Operator reports actual output at end of shift (or during shift)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_production_log (
    log_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id               UUID            REFERENCES shift_targets(target_id),
    wo_number               VARCHAR(50)     NOT NULL,
    jo_number               VARCHAR(50),
    machine_id              VARCHAR(50)     NOT NULL,
    operator_id             VARCHAR(20)     NOT NULL,
    shift_date              DATE            NOT NULL,
    shift_code              shift_code_enum NOT NULL,
    -- Actual output
    quantity_good           INT             NOT NULL DEFAULT 0,
    quantity_ng             INT             NOT NULL DEFAULT 0,
    quantity_rework         INT             NOT NULL DEFAULT 0,
    quantity_total          INT             GENERATED ALWAYS AS (quantity_good + quantity_ng + quantity_rework) STORED,
    -- Time tracking
    actual_start            TIMESTAMPTZ,
    actual_end              TIMESTAMPTZ,
    actual_setup_minutes    NUMERIC(10,2)   DEFAULT 0,
    actual_run_minutes      NUMERIC(10,2)   DEFAULT 0,
    actual_idle_minutes     NUMERIC(10,2)   DEFAULT 0,
    actual_cycle_time_avg   NUMERIC(10,2),
    -- Performance metrics (auto-calculated or entered)
    target_quantity         INT             DEFAULT 0,
    achievement_pct         NUMERIC(5,2)    GENERATED ALWAYS AS (
        CASE WHEN target_quantity > 0 THEN ROUND((quantity_good::NUMERIC / target_quantity) * 100, 2) ELSE 0 END
    ) STORED,
    ng_rate_pct             NUMERIC(5,2)    GENERATED ALWAYS AS (
        CASE WHEN (quantity_good + quantity_ng + quantity_rework) > 0
             THEN ROUND((quantity_ng::NUMERIC / (quantity_good + quantity_ng + quantity_rework)) * 100, 2)
             ELSE 0 END
    ) STORED,
    -- NG detail (defect breakdown)
    ng_details              JSONB           DEFAULT '[]'::jsonb,
    -- Operator notes
    notes                   TEXT,
    issues_encountered      TEXT,
    -- Offline/sync
    offline_created         BOOLEAN         DEFAULT FALSE,
    sync_status             VARCHAR(20)     DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_sync', 'conflict')),
    device_id               VARCHAR(100),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shift_production_log IS 'Actual production output per shift. Operators report qty good, NG, rework at end of shift. / Nhat ky san luong thuc te theo ca. Cong nhan bao cao so luong tot, NG, lam lai cuoi ca.';

CREATE INDEX IF NOT EXISTS idx_shift_log_target ON shift_production_log (target_id);
CREATE INDEX IF NOT EXISTS idx_shift_log_wo ON shift_production_log (wo_number);
CREATE INDEX IF NOT EXISTS idx_shift_log_machine ON shift_production_log (machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_log_operator ON shift_production_log (operator_id);
CREATE INDEX IF NOT EXISTS idx_shift_log_date ON shift_production_log (shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_log_shift ON shift_production_log (shift_code);
CREATE INDEX IF NOT EXISTS idx_shift_log_sync ON shift_production_log (sync_status);

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS shift_production_log CASCADE;
-- DROP TABLE IF EXISTS shift_targets CASCADE;
-- DROP TYPE IF EXISTS shift_code_enum;
