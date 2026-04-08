-- ============================================================================
-- Migration 031
-- World-class MES foundations: DPP, energy intensity, and real-time costing
-- ============================================================================

CREATE TABLE IF NOT EXISTS mes_dpp_passports (
    dpp_id               VARCHAR(80)     PRIMARY KEY,
    genealogy_id         VARCHAR(80),
    job_number           VARCHAR(50)     NOT NULL,
    item_id              VARCHAR(50)     NOT NULL,
    part_rev             VARCHAR(20),
    serial_number        VARCHAR(100),
    lot_number           VARCHAR(100),
    passport_status      VARCHAR(30)     NOT NULL DEFAULT 'draft',
    qr_code              VARCHAR(200),
    passport_url         TEXT,
    origin_country       CHAR(2),
    material_composition JSONB           DEFAULT '[]',
    recycled_content_pct NUMERIC(6,2),
    carbon_footprint_kg_co2e NUMERIC(12,4),
    energy_consumption_kwh NUMERIC(12,4),
    recycling_info       TEXT,
    metadata             JSONB           DEFAULT '{}',
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mes_dpp_job ON mes_dpp_passports (job_number);
CREATE INDEX IF NOT EXISTS idx_mes_dpp_item ON mes_dpp_passports (item_id, part_rev);

CREATE TABLE IF NOT EXISTS mes_energy_snapshots (
    energy_snapshot_id   VARCHAR(80)     PRIMARY KEY,
    equipment_id         VARCHAR(50)     NOT NULL,
    work_center_id       VARCHAR(50),
    work_order_number    VARCHAR(50),
    shift_code           VARCHAR(20),
    captured_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    power_kw             NUMERIC(12,4),
    energy_kwh           NUMERIC(12,4),
    good_qty             INT             DEFAULT 0,
    scrap_qty            INT             DEFAULT 0,
    energy_per_unit_kwh  NUMERIC(12,4),
    target_energy_per_unit_kwh NUMERIC(12,4),
    source_type          VARCHAR(30)     DEFAULT 'manual_bridge',
    metadata             JSONB           DEFAULT '{}',
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mes_energy_equipment_ts ON mes_energy_snapshots (equipment_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mes_energy_wo ON mes_energy_snapshots (work_order_number, captured_at DESC);

CREATE TABLE IF NOT EXISTS mes_cost_tracking (
    cost_id              VARCHAR(80)     PRIMARY KEY,
    work_order_number    VARCHAR(50)     NOT NULL,
    job_number           VARCHAR(50),
    equipment_id         VARCHAR(50),
    work_center_id       VARCHAR(50),
    item_id              VARCHAR(50),
    part_rev             VARCHAR(20),
    captured_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    cost_status          VARCHAR(30)     NOT NULL DEFAULT 'draft',
    standard_cost_total  NUMERIC(14,2),
    actual_cost_total    NUMERIC(14,2),
    material_cost        NUMERIC(14,2),
    labor_cost           NUMERIC(14,2),
    energy_cost          NUMERIC(14,2),
    overhead_cost        NUMERIC(14,2),
    good_qty             INT             DEFAULT 0,
    scrap_qty            INT             DEFAULT 0,
    cost_per_good_unit   NUMERIC(14,4),
    variance_pct         NUMERIC(8,2),
    variance_threshold_pct NUMERIC(8,2) DEFAULT 15.0,
    metadata             JSONB           DEFAULT '{}',
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mes_cost_wo ON mes_cost_tracking (work_order_number);
CREATE INDEX IF NOT EXISTS idx_mes_cost_status ON mes_cost_tracking (cost_status, captured_at DESC);
