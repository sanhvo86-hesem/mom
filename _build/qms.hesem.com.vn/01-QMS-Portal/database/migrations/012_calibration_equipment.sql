-- Migration: 012_calibration_equipment.sql
-- Description: Calibration and equipment tables - equipment, calibration_records, maintenance_work_orders, tools, tool_transactions
-- Dependencies: 002_core_system.sql, 008_vendors_purchasing.sql
-- Rollback: DROP TABLE tool_transactions, tools, maintenance_work_orders, calibration_records, equipment CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- equipment / Thiet bi (13 equipment + 41 erp_maintenance_cmms vars)
-- ---------------------------------------------------------------------------
CREATE TABLE equipment (
    equipment_id        VARCHAR(50)     PRIMARY KEY,
    equipment_name      VARCHAR(200)    NOT NULL,
    equipment_type      equip_type_maint,
    machine_type        machine_type_enum,
    asset_type          asset_type_enum,
    equipment_serial    VARCHAR(100),
    equipment_location  VARCHAR(200),
    manufacturer        VARCHAR(150),
    model_number        VARCHAR(100),
    resource_group      VARCHAR(50),
    department_id       dept_code       REFERENCES departments(dept_code),
    installation_date   DATE,
    warranty_expiry     DATE,
    criticality_rating  criticality_rating,
    -- Maintenance fields
    mtbf_hours          NUMERIC(10,2),
    mttr_hours          NUMERIC(10,2),
    pm_frequency        pm_frequency_enum,
    pm_last_date        DATE,
    pm_next_date        DATE,
    pm_checklist_id     VARCHAR(50),
    condition_monitoring_type VARCHAR(100),
    -- Calibration fields
    calibration_due     DATE,
    calibration_interval_days INT,
    -- Status
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE equipment IS 'Equipment master with maintenance/calibration fields. Maps equipment + erp_maintenance_cmms variables. / Du lieu thiet bi voi truong bao tri/hieu chuan.';

-- ---------------------------------------------------------------------------
-- calibration_records / Ho so hieu chuan (13 vars from calibration)
-- ---------------------------------------------------------------------------
CREATE TABLE calibration_records (
    cal_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    calibration_id      VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    calibration_date    DATE            NOT NULL,
    next_due            DATE            NOT NULL,
    calibration_interval INT,           -- in days
    calibration_result  cal_result_enum NOT NULL,
    uncertainty         VARCHAR(100),
    standard_used       VARCHAR(200),
    cal_standard        VARCHAR(200),
    calibration_location cal_location_enum DEFAULT 'In-house',
    grr_result          NUMERIC(6,2),
    grr_status          grr_status_enum,
    performed_by        UUID            REFERENCES users(user_id),
    certificate_path    TEXT,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE calibration_records IS 'Calibration records with GR&R. Maps calibration variables. / Ho so hieu chuan voi GR&R.';

-- ---------------------------------------------------------------------------
-- maintenance_work_orders / Lenh bao tri
-- ---------------------------------------------------------------------------
CREATE TABLE maintenance_work_orders (
    maint_wo_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id       VARCHAR(50)     NOT NULL UNIQUE,
    wo_type             maint_wo_type   NOT NULL,
    wo_status           maint_wo_status NOT NULL DEFAULT 'requested',
    equipment_id        VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    priority            maint_priority  DEFAULT 'normal',
    failure_code        VARCHAR(50),
    failure_mode        VARCHAR(200),
    cause_code          VARCHAR(50),
    remedy_code         VARCHAR(50),
    requested_by        UUID            REFERENCES users(user_id),
    assigned_to         UUID            REFERENCES users(user_id),
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    actual_start        TIMESTAMPTZ,
    actual_end          TIMESTAMPTZ,
    downtime_hours      NUMERIC(8,2),
    labor_hours         NUMERIC(8,2),
    parts_cost          NUMERIC(12,2),
    labor_cost          NUMERIC(12,2),
    total_cost          NUMERIC(12,2),
    -- Condition monitoring
    vibration_level     NUMERIC(8,2),
    temperature_reading NUMERIC(8,2),
    oil_analysis_result VARCHAR(100),
    spare_part_id       VARCHAR(50),
    spare_part_qty      INT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE maintenance_work_orders IS 'Maintenance work orders (PM, CM, predictive). Maps erp_maintenance_cmms variables. / Lenh bao tri.';

-- ---------------------------------------------------------------------------
-- tools / Dao cu (35 vars from erp_tool_management)
-- ---------------------------------------------------------------------------
CREATE TABLE tools (
    tool_id             VARCHAR(50)     PRIMARY KEY,
    tool_description    VARCHAR(300)    NOT NULL,
    tool_type           tool_type_enum,
    tool_material       tool_material_enum,
    tool_diameter       NUMERIC(10,4),
    tool_length         NUMERIC(10,4),
    tool_flutes         INT,
    tool_coating        tool_coating_enum,
    tool_holder_id      VARCHAR(50),
    tool_holder_type    tool_holder_type_enum,
    tool_life_minutes   INT,
    tool_life_remaining_pct NUMERIC(5,2),
    tool_life_parts_count INT,
    tool_life_total_parts INT,
    tool_preset_length  NUMERIC(10,4),
    tool_preset_diameter NUMERIC(10,4),
    tool_offset_length  NUMERIC(10,4),
    tool_offset_diameter NUMERIC(10,4),
    tool_wear_offset    NUMERIC(10,4),
    tool_breakage_detected BOOLEAN      NOT NULL DEFAULT FALSE,
    tool_location       tool_location_enum DEFAULT 'crib',
    tool_crib_location  VARCHAR(50),
    tool_cost           NUMERIC(12,2),
    tool_vendor_id      VARCHAR(50)     REFERENCES vendors(vendor_id),
    tool_reorder_point  INT,
    tool_reorder_qty    INT,
    tool_on_hand_qty    INT             DEFAULT 0,
    regrind_count       INT             DEFAULT 0,
    max_regrind_count   INT,
    regrind_vendor_id   VARCHAR(50),
    regrind_cost        NUMERIC(10,2),
    associated_operations TEXT,
    associated_machines TEXT,
    tool_group_id       VARCHAR(50),
    catalog_number      VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE tools IS 'Tool management. Maps 35 erp_tool_management variables. / Quan ly dao cu.';

-- ---------------------------------------------------------------------------
-- tool_transactions / Giao dich dao cu
-- ---------------------------------------------------------------------------
CREATE TABLE tool_transactions (
    txn_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    txn_type        VARCHAR(30)     NOT NULL,  -- issue, return, regrind, scrap, transfer
    from_location   tool_location_enum,
    to_location     tool_location_enum,
    machine_id      VARCHAR(50),
    job_number      VARCHAR(50),
    performed_by    UUID            REFERENCES users(user_id),
    notes           TEXT,
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE tool_transactions IS 'Tool issue, return, regrind, scrap transactions. / Giao dich dao cu.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS tool_transactions CASCADE;
-- DROP TABLE IF EXISTS tools CASCADE;
-- DROP TABLE IF EXISTS maintenance_work_orders CASCADE;
-- DROP TABLE IF EXISTS calibration_records CASCADE;
-- DROP TABLE IF EXISTS equipment CASCADE;
