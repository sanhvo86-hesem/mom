-- ============================================================================
-- Migration: 046_plant_maintenance_cmms.sql
-- Description: Advanced plant maintenance / CMMS expansion aligned to
--              SAP PM and Epicor maintenance management patterns.
-- Dependencies: 012_calibration_equipment.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE pm_maintenance_budgets, pm_reliability_metrics,
--           pm_equipment_counters, pm_condition_monitoring,
--           pm_condition_thresholds, pm_failure_history, pm_failure_codes,
--           pm_spare_parts_inventory, pm_work_order_parts,
--           pm_work_order_operations, pm_work_orders,
--           pm_maintenance_plan_items, pm_maintenance_plans,
--           pm_equipment_master, pm_functional_locations CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pm_functional_locations (
    functional_location_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_code               VARCHAR(80)     NOT NULL UNIQUE,
    parent_location_id          UUID            REFERENCES pm_functional_locations(functional_location_id),
    plant_code                  VARCHAR(30),
    building_code               VARCHAR(30),
    bay_code                    VARCHAR(30),
    position_code               VARCHAR(30),
    description                 VARCHAR(300)    NOT NULL,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'retired')),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_func_locations_parent ON pm_functional_locations (parent_location_id);
CREATE INDEX IF NOT EXISTS idx_pm_func_locations_status ON pm_functional_locations (status);

CREATE TABLE IF NOT EXISTS pm_equipment_master (
    pm_equipment_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL UNIQUE REFERENCES equipment(equipment_id),
    equipment_number            VARCHAR(80)     NOT NULL UNIQUE,
    description                 VARCHAR(300)    NOT NULL,
    serial_number               VARCHAR(120),
    manufacturer                VARCHAR(150),
    model_number                VARCHAR(120),
    install_date                DATE,
    warranty_expiry             DATE,
    criticality                 VARCHAR(10)     DEFAULT 'B'
                                CHECK (criticality IN ('A', 'B', 'C')),
    functional_location_id      UUID            REFERENCES pm_functional_locations(functional_location_id),
    cost_center                 VARCHAR(50),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'decommissioned')),
    replacement_value           NUMERIC(14,2),
    image_url                   VARCHAR(1000),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_equipment_location ON pm_equipment_master (functional_location_id);
CREATE INDEX IF NOT EXISTS idx_pm_equipment_criticality ON pm_equipment_master (criticality);

CREATE TABLE IF NOT EXISTS pm_maintenance_plans (
    maintenance_plan_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number                 VARCHAR(80)     NOT NULL UNIQUE,
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    plan_type                   VARCHAR(30)     NOT NULL
                                CHECK (plan_type IN ('time_based', 'counter_based', 'condition_based')),
    frequency_value             NUMERIC(10,2),
    frequency_uom               VARCHAR(20),
    counter_name                VARCHAR(100),
    counter_threshold           NUMERIC(14,4),
    next_due_date               DATE,
    planner_id                  UUID            REFERENCES users(user_id),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'active'
                                CHECK (status IN ('draft', 'active', 'paused', 'retired')),
    auto_release_work_order     BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_plans_equipment ON pm_maintenance_plans (equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_status ON pm_maintenance_plans (status);

CREATE TABLE IF NOT EXISTS pm_maintenance_plan_items (
    maintenance_plan_item_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_plan_id         UUID            NOT NULL REFERENCES pm_maintenance_plans(maintenance_plan_id) ON DELETE CASCADE,
    line_number                 INT             NOT NULL,
    task_code                   VARCHAR(50),
    task_description            VARCHAR(500)    NOT NULL,
    standard_minutes            NUMERIC(10,2),
    required_skill_code         VARCHAR(50),
    spare_part_item_id          VARCHAR(50)     REFERENCES items(item_id),
    quantity_per                NUMERIC(12,2),
    instruction_ref             VARCHAR(100),
    is_mandatory                BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (maintenance_plan_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_pm_plan_items_part ON pm_maintenance_plan_items (spare_part_item_id);

CREATE TABLE IF NOT EXISTS pm_work_orders (
    pm_work_order_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number           VARCHAR(80)     NOT NULL UNIQUE,
    legacy_maint_wo_id          UUID            REFERENCES maintenance_work_orders(maint_wo_id),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    maintenance_plan_id         UUID            REFERENCES pm_maintenance_plans(maintenance_plan_id),
    work_order_type             VARCHAR(30)     NOT NULL
                                CHECK (work_order_type IN ('preventive', 'corrective', 'emergency', 'project', 'calibration')),
    priority                    INT             NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                CHECK (status IN ('planned', 'released', 'in_progress', 'completed', 'cancelled')),
    requested_by                UUID            REFERENCES users(user_id),
    assigned_to                 UUID            REFERENCES users(user_id),
    planned_start               TIMESTAMPTZ,
    planned_end                 TIMESTAMPTZ,
    actual_start                TIMESTAMPTZ,
    actual_end                  TIMESTAMPTZ,
    downtime_minutes            NUMERIC(10,2),
    total_cost                  NUMERIC(14,2),
    root_cause_summary          TEXT,
    closeout_notes              TEXT,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_equipment ON pm_work_orders (equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_status ON pm_work_orders (status);

CREATE TABLE IF NOT EXISTS pm_work_order_operations (
    pm_work_order_operation_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pm_work_order_id            UUID            NOT NULL REFERENCES pm_work_orders(pm_work_order_id) ON DELETE CASCADE,
    line_number                 INT             NOT NULL,
    operation_code              VARCHAR(50),
    description                 VARCHAR(500)    NOT NULL,
    labor_hours_planned         NUMERIC(10,2),
    labor_hours_actual          NUMERIC(10,2),
    instruction_text            TEXT,
    completed_by                UUID            REFERENCES users(user_id),
    completed_at                TIMESTAMPTZ,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'in_progress', 'completed', 'skipped')),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (pm_work_order_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_pm_wo_ops_status ON pm_work_order_operations (status);

CREATE TABLE IF NOT EXISTS pm_work_order_parts (
    pm_work_order_part_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pm_work_order_id            UUID            NOT NULL REFERENCES pm_work_orders(pm_work_order_id) ON DELETE CASCADE,
    item_id                     VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number                  VARCHAR(100)    REFERENCES lot_master(lot_number),
    quantity_issued             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    quantity_returned           NUMERIC(12,2)   NOT NULL DEFAULT 0,
    unit_cost                   NUMERIC(14,4),
    warehouse_id                VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    notes                       TEXT,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_wo_parts_wo ON pm_work_order_parts (pm_work_order_id);
CREATE INDEX IF NOT EXISTS idx_pm_wo_parts_item ON pm_work_order_parts (item_id);

CREATE TABLE IF NOT EXISTS pm_spare_parts_inventory (
    spare_inventory_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_class             VARCHAR(100),
    item_id                     VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    warehouse_id                VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    preferred_bin               VARCHAR(50),
    min_qty                     NUMERIC(12,2)   DEFAULT 0,
    max_qty                     NUMERIC(12,2)   DEFAULT 0,
    reorder_qty                 NUMERIC(12,2),
    lead_time_days              INT,
    preferred_vendor_id         VARCHAR(50)     REFERENCES vendors(vendor_id),
    critical_spare              BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_class, item_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_pm_spares_vendor ON pm_spare_parts_inventory (preferred_vendor_id);

CREATE TABLE IF NOT EXISTS pm_failure_codes (
    failure_code_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_failure_code_id      UUID            REFERENCES pm_failure_codes(failure_code_id),
    level_name                  VARCHAR(20)     NOT NULL
                                CHECK (level_name IN ('object', 'problem', 'cause', 'remedy')),
    failure_code                VARCHAR(50)     NOT NULL UNIQUE,
    description                 VARCHAR(300)    NOT NULL,
    equipment_class             VARCHAR(100),
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_failure_codes_parent ON pm_failure_codes (parent_failure_code_id);

CREATE TABLE IF NOT EXISTS pm_condition_thresholds (
    condition_threshold_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    sensor_type                 VARCHAR(50)     NOT NULL,
    warning_low                 NUMERIC(14,4),
    warning_high                NUMERIC(14,4),
    critical_low                NUMERIC(14,4),
    critical_high               NUMERIC(14,4),
    unit_of_measure             VARCHAR(20),
    auto_create_work_order      BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, sensor_type)
);
CREATE INDEX IF NOT EXISTS idx_pm_thresholds_sensor ON pm_condition_thresholds (sensor_type);

CREATE TABLE IF NOT EXISTS pm_failure_history (
    pm_failure_history_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    pm_work_order_id            UUID            REFERENCES pm_work_orders(pm_work_order_id),
    failure_code_id             UUID            REFERENCES pm_failure_codes(failure_code_id),
    event_started_at            TIMESTAMPTZ     NOT NULL,
    event_ended_at              TIMESTAMPTZ,
    downtime_minutes            NUMERIC(10,2),
    estimated_cost              NUMERIC(14,2),
    symptom_summary             TEXT,
    corrective_action           TEXT,
    recurrence_flag             BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_failure_history_equipment ON pm_failure_history (equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_failure_history_started ON pm_failure_history (event_started_at);

CREATE TABLE IF NOT EXISTS pm_condition_monitoring (
    pm_condition_monitoring_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    condition_threshold_id      UUID            REFERENCES pm_condition_thresholds(condition_threshold_id),
    sensor_type                 VARCHAR(50)     NOT NULL,
    reading_value               NUMERIC(14,4)   NOT NULL,
    unit_of_measure             VARCHAR(20),
    captured_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    is_alarm                    BOOLEAN         NOT NULL DEFAULT FALSE,
    source_type                 VARCHAR(30)     DEFAULT 'manual'
                                CHECK (source_type IN ('manual', 'iot', 'mtconnect', 'import')),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_condition_equipment_ts ON pm_condition_monitoring (equipment_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_condition_alarm ON pm_condition_monitoring (is_alarm);

CREATE TABLE IF NOT EXISTS pm_equipment_counters (
    pm_equipment_counter_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    counter_name                VARCHAR(100)    NOT NULL,
    counter_value               NUMERIC(18,4)   NOT NULL DEFAULT 0,
    unit_of_measure             VARCHAR(20),
    last_reset_at               TIMESTAMPTZ,
    last_capture_at             TIMESTAMPTZ,
    source_type                 VARCHAR(30)     DEFAULT 'manual'
                                CHECK (source_type IN ('manual', 'iot', 'mtconnect', 'derived')),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, counter_name)
);
CREATE INDEX IF NOT EXISTS idx_pm_counters_capture ON pm_equipment_counters (last_capture_at);

CREATE TABLE IF NOT EXISTS pm_reliability_metrics (
    pm_reliability_metric_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    period_start                DATE            NOT NULL,
    period_end                  DATE            NOT NULL,
    mtbf_hours                  NUMERIC(12,2),
    mttr_hours                  NUMERIC(12,2),
    oee_pct                     NUMERIC(6,2),
    availability_pct            NUMERIC(6,2),
    failure_count               INT             DEFAULT 0,
    planned_downtime_hours      NUMERIC(12,2),
    unplanned_downtime_hours    NUMERIC(12,2),
    maintenance_cost_total      NUMERIC(14,2),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_pm_reliability_period ON pm_reliability_metrics (period_start, period_end);

CREATE TABLE IF NOT EXISTS pm_maintenance_budgets (
    pm_maintenance_budget_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_year                 INT             NOT NULL,
    budget_month                INT             CHECK (budget_month BETWEEN 1 AND 12),
    cost_center                 VARCHAR(50),
    equipment_class             VARCHAR(100),
    budget_amount               NUMERIC(14,2)   NOT NULL,
    actual_amount               NUMERIC(14,2)   DEFAULT 0,
    currency_code               VARCHAR(10)     DEFAULT 'USD',
    owner_id                    UUID            REFERENCES users(user_id),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'approved', 'closed')),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (budget_year, budget_month, cost_center, equipment_class)
);
CREATE INDEX IF NOT EXISTS idx_pm_budgets_status ON pm_maintenance_budgets (status);

COMMIT;
