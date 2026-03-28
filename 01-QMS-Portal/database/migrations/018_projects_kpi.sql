-- Migration: 018_projects_kpi.sql
-- Description: Project management and KPI tables - projects, project_milestones, project_resources, kpi_definitions, kpi_snapshots, mrp_planned_orders
-- Dependencies: 002_core_system.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE mrp_planned_orders, kpi_snapshots, kpi_definitions, project_resources, project_milestones, projects CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- projects / Du an (15 vars from erp_project_management)
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
    project_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code        VARCHAR(50)     NOT NULL UNIQUE,
    project_name        VARCHAR(300)    NOT NULL,
    project_name_vi     VARCHAR(300),
    project_type        project_type_enum NOT NULL,
    project_status      project_status_enum NOT NULL DEFAULT 'proposed',
    project_manager     UUID            REFERENCES users(user_id),
    start_date_planned  DATE,
    end_date_planned    DATE,
    wbs_code            VARCHAR(50),
    budget_total        NUMERIC(14,2),
    actual_total        NUMERIC(14,2),
    pct_complete        NUMERIC(5,2)    DEFAULT 0,
    earned_value        NUMERIC(14,2),
    spi_index           NUMERIC(6,4),
    cpi_index           NUMERIC(6,4),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE projects IS 'Project management. Maps erp_project_management variables. / Quan ly du an.';

-- ---------------------------------------------------------------------------
-- project_milestones / Moc du an
-- ---------------------------------------------------------------------------
CREATE TABLE project_milestones (
    milestone_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID            NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    milestone_name  VARCHAR(300)    NOT NULL,
    planned_date    DATE,
    actual_date     DATE,
    status          VARCHAR(30)     DEFAULT 'pending',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE project_milestones IS 'Project milestones. / Moc du an.';

-- ---------------------------------------------------------------------------
-- project_resources / Nguon luc du an
-- ---------------------------------------------------------------------------
CREATE TABLE project_resources (
    resource_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID            NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id         UUID            REFERENCES users(user_id),
    role_desc       VARCHAR(200),
    allocation_pct  NUMERIC(5,2)    DEFAULT 100,
    start_date      DATE,
    end_date        DATE,
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE project_resources IS 'Project resource assignments. / Phan bo nguon luc du an.';

-- ---------------------------------------------------------------------------
-- kpi_definitions / Dinh nghia KPI (14 vars from kpi_metrics)
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_definitions (
    kpi_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_code         VARCHAR(50)     NOT NULL UNIQUE,
    kpi_name            VARCHAR(200)    NOT NULL,
    kpi_name_vi         VARCHAR(200),
    formula             TEXT,
    unit                VARCHAR(30),
    target              NUMERIC(12,4),
    threshold_green     NUMERIC(12,4),
    threshold_yellow    NUMERIC(12,4),
    dept_code           dept_code       REFERENCES departments(dept_code),
    frequency           VARCHAR(20)     DEFAULT 'monthly',
    metadata            JSONB           DEFAULT '{}',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE kpi_definitions IS 'KPI metric definitions. / Dinh nghia chi so KPI.';

-- ---------------------------------------------------------------------------
-- kpi_snapshots / Anh chup KPI
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_snapshots (
    snapshot_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id          UUID            NOT NULL REFERENCES kpi_definitions(kpi_id),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    actual_value    NUMERIC(12,4),
    target_value    NUMERIC(12,4),
    kpi_status      kpi_status_enum,
    -- Common KPI values
    on_time_delivery_rate       NUMERIC(5,2),
    customer_complaint_rate     NUMERIC(5,2),
    internal_reject_rate        NUMERIC(5,2),
    supplier_quality_index      NUMERIC(5,2),
    training_completion_rate    NUMERIC(5,2),
    capa_closure_rate           NUMERIC(5,2),
    calibration_compliance_rate NUMERIC(5,2),
    scrap_rate                  NUMERIC(5,2),
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE kpi_snapshots IS 'KPI periodic snapshots (OTD, DPMO, OEE, etc.). Maps kpi_metrics variables. / Anh chup KPI dinh ky.';

-- ---------------------------------------------------------------------------
-- mrp_planned_orders / Lenh ke hoach MRP (33 vars from erp_mrp_planning)
-- ---------------------------------------------------------------------------
CREATE TABLE mrp_planned_orders (
    planned_order_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    planned_order_code  VARCHAR(50)     NOT NULL UNIQUE,
    planned_order_type  planned_order_type NOT NULL,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    due_date            DATE            NOT NULL,
    start_date          DATE,
    release_date        DATE,
    planner_code        VARCHAR(20),
    mrp_status          mrp_status_enum NOT NULL DEFAULT 'planned',
    mrp_exception_code  VARCHAR(20),
    exception_message   TEXT,
    demand_source       demand_source_enum,
    demand_source_ref   VARCHAR(100),
    supply_source       VARCHAR(100),
    pegging_ref         VARCHAR(100),
    net_requirement     NUMERIC(12,2),
    gross_requirement   NUMERIC(12,2),
    projected_available NUMERIC(12,2),
    available_to_promise NUMERIC(12,2),
    capable_to_promise  NUMERIC(12,2),
    cumulative_lead_time INT,
    manufacturing_lead_time INT,
    purchasing_lead_time INT,
    inspection_lead_time INT,
    planning_fence_days INT,
    demand_fence_days   INT,
    lot_size_rule       lot_size_rule_enum DEFAULT 'lot_for_lot',
    lot_size_min        NUMERIC(12,2),
    lot_size_max        NUMERIC(12,2),
    lot_size_multiple   NUMERIC(12,2),
    safety_stock_method safety_stock_method_enum DEFAULT 'none',
    safety_lead_time_days INT,
    time_bucket         time_bucket_enum DEFAULT 'daily',
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mrp_planned_orders IS 'MRP planned orders. Maps 33 erp_mrp_planning variables. / Lenh ke hoach MRP.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS mrp_planned_orders CASCADE;
-- DROP TABLE IF EXISTS kpi_snapshots CASCADE;
-- DROP TABLE IF EXISTS kpi_definitions CASCADE;
-- DROP TABLE IF EXISTS project_resources CASCADE;
-- DROP TABLE IF EXISTS project_milestones CASCADE;
-- DROP TABLE IF EXISTS projects CASCADE;
