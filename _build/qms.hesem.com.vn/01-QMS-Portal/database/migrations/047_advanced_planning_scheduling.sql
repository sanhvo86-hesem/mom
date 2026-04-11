-- ============================================================================
-- Migration: 047_advanced_planning_scheduling.sql
-- Description: Finite-capacity APS expansion aligned to SAP IBP and Epicor APS.
-- Dependencies: 010_production.sql, 041_ai_predictive_quality_aps.sql,
--               044_shift_calendar.sql
-- Rollback: DROP TABLE aps_planning_horizons, aps_kpi_snapshots,
--           aps_pegging_links, aps_setup_matrices, aps_material_availability,
--           aps_schedule_conflicts, aps_schedule_blocks,
--           aps_constraint_resources, aps_capacity_buckets,
--           aps_demand_forecast_lines, aps_demand_forecasts,
--           aps_planning_scenarios CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS aps_planning_scenarios (
    aps_scenario_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_name                VARCHAR(150)    NOT NULL,
    base_scenario_id             UUID            REFERENCES aps_planning_scenarios(aps_scenario_id),
    scenario_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (scenario_status IN ('draft', 'published', 'archived')),
    is_baseline                  BOOLEAN         NOT NULL DEFAULT FALSE,
    locked_until                 TIMESTAMPTZ,
    snapshot_at                  TIMESTAMPTZ,
    created_by                   UUID            REFERENCES users(user_id),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (scenario_name)
);
CREATE INDEX IF NOT EXISTS idx_aps_scenarios_status ON aps_planning_scenarios (scenario_status);

CREATE TABLE IF NOT EXISTS aps_demand_forecasts (
    aps_forecast_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    period_start                 DATE            NOT NULL,
    period_end                   DATE            NOT NULL,
    forecast_qty                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    actual_qty                   NUMERIC(14,2),
    confidence_pct               NUMERIC(5,2),
    source_type                  VARCHAR(20)     NOT NULL DEFAULT 'manual'
                                 CHECK (source_type IN ('edi', 'manual', 'ai', 'mps')),
    planner_id                   UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_forecasts_scenario ON aps_demand_forecasts (aps_scenario_id);
CREATE INDEX IF NOT EXISTS idx_aps_forecasts_item_period ON aps_demand_forecasts (item_id, period_start);

CREATE TABLE IF NOT EXISTS aps_demand_forecast_lines (
    aps_forecast_line_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_forecast_id              UUID            NOT NULL REFERENCES aps_demand_forecasts(aps_forecast_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    so_line_id                   UUID            REFERENCES sales_order_lines(so_line_id),
    requested_date               DATE,
    promised_date                DATE,
    forecast_qty                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    firmed_qty                   NUMERIC(14,2)   DEFAULT 0,
    allocation_priority          INT             DEFAULT 50,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (aps_forecast_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_aps_forecast_lines_request ON aps_demand_forecast_lines (requested_date);

CREATE TABLE IF NOT EXISTS aps_capacity_buckets (
    aps_capacity_bucket_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    work_center_id               VARCHAR(30)     NOT NULL REFERENCES work_centers(work_center_id),
    shift_code                   VARCHAR(20),
    bucket_date                  DATE            NOT NULL,
    available_minutes            NUMERIC(12,2)   NOT NULL DEFAULT 0,
    allocated_minutes            NUMERIC(12,2)   NOT NULL DEFAULT 0,
    efficiency_factor            NUMERIC(6,4)    DEFAULT 1.0,
    maintenance_blocked_minutes  NUMERIC(12,2)   DEFAULT 0,
    overtime_available_minutes   NUMERIC(12,2)   DEFAULT 0,
    crew_size                    INT             DEFAULT 1,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (aps_scenario_id, work_center_id, shift_code, bucket_date)
);
CREATE INDEX IF NOT EXISTS idx_aps_capacity_bucket_date ON aps_capacity_buckets (bucket_date);

CREATE TABLE IF NOT EXISTS aps_constraint_resources (
    aps_constraint_resource_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    resource_type                VARCHAR(20)     NOT NULL
                                 CHECK (resource_type IN ('machine', 'operator', 'tool', 'work_center')),
    resource_id                  VARCHAR(80)     NOT NULL,
    max_capacity_per_day         NUMERIC(12,2),
    is_bottleneck                BOOLEAN         NOT NULL DEFAULT FALSE,
    drum_buffer_rope_priority    INT             DEFAULT 50,
    alternate_resource_id        VARCHAR(80),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_constraints_resource ON aps_constraint_resources (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS aps_schedule_blocks (
    aps_schedule_block_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    job_number                   VARCHAR(50)     REFERENCES job_orders(job_number),
    operation_id                 UUID            REFERENCES job_operations(job_op_id),
    resource_type                VARCHAR(20)     NOT NULL
                                 CHECK (resource_type IN ('machine', 'operator', 'tool', 'work_center')),
    resource_id                  VARCHAR(80)     NOT NULL,
    planned_start                TIMESTAMPTZ     NOT NULL,
    planned_end                  TIMESTAMPTZ     NOT NULL,
    setup_minutes                NUMERIC(12,2)   DEFAULT 0,
    run_minutes                  NUMERIC(12,2)   DEFAULT 0,
    block_status                 VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (block_status IN ('planned', 'firm', 'released', 'completed')),
    sequence_position            INT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_blocks_resource ON aps_schedule_blocks (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_aps_blocks_start ON aps_schedule_blocks (planned_start);

CREATE TABLE IF NOT EXISTS aps_schedule_conflicts (
    aps_schedule_conflict_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    conflict_type                VARCHAR(30)     NOT NULL
                                 CHECK (conflict_type IN ('overload', 'material_shortage', 'tooling_clash', 'maintenance_window', 'missing_skill')),
    aps_schedule_block_id        UUID            REFERENCES aps_schedule_blocks(aps_schedule_block_id),
    resource_id                  VARCHAR(80),
    conflict_start               TIMESTAMPTZ,
    conflict_end                 TIMESTAMPTZ,
    severity                     VARCHAR(20)     DEFAULT 'warning'
                                 CHECK (severity IN ('info', 'warning', 'critical')),
    description                  TEXT,
    resolved_at                  TIMESTAMPTZ,
    resolved_by                  UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_conflicts_type ON aps_schedule_conflicts (conflict_type);
CREATE INDEX IF NOT EXISTS idx_aps_conflicts_resource ON aps_schedule_conflicts (resource_id);

CREATE TABLE IF NOT EXISTS aps_material_availability (
    aps_material_availability_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    bucket_date                  DATE            NOT NULL,
    qty_on_hand                  NUMERIC(14,2)   DEFAULT 0,
    qty_supply                   NUMERIC(14,2)   DEFAULT 0,
    qty_demand                   NUMERIC(14,2)   DEFAULT 0,
    projected_available_balance  NUMERIC(14,2)   DEFAULT 0,
    shortage_flag                BOOLEAN         NOT NULL DEFAULT FALSE,
    supply_source_summary        JSONB           DEFAULT '[]'::jsonb,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (aps_scenario_id, item_id, bucket_date)
);
CREATE INDEX IF NOT EXISTS idx_aps_mat_avail_shortage ON aps_material_availability (shortage_flag);

CREATE TABLE IF NOT EXISTS aps_setup_matrices (
    aps_setup_matrix_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    resource_id                  VARCHAR(80),
    from_part_family             VARCHAR(80)     NOT NULL,
    to_part_family               VARCHAR(80)     NOT NULL,
    setup_minutes                NUMERIC(12,2)   NOT NULL DEFAULT 0,
    tool_change_required         BOOLEAN         NOT NULL DEFAULT FALSE,
    fixture_change_required      BOOLEAN         NOT NULL DEFAULT FALSE,
    validated_date               DATE,
    validated_by                 UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (work_center_id, resource_id, from_part_family, to_part_family)
);
CREATE INDEX IF NOT EXISTS idx_aps_setup_matrix_resource ON aps_setup_matrices (resource_id);

CREATE TABLE IF NOT EXISTS aps_pegging_links (
    aps_pegging_link_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    demand_type                  VARCHAR(20)     NOT NULL
                                 CHECK (demand_type IN ('sales_order', 'forecast', 'project')),
    demand_reference             VARCHAR(80)     NOT NULL,
    supply_type                  VARCHAR(20)     NOT NULL
                                 CHECK (supply_type IN ('purchase_order', 'work_order', 'inventory', 'subcontract')),
    supply_reference             VARCHAR(80)     NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    pegged_qty                   NUMERIC(14,2)   NOT NULL DEFAULT 0,
    date_needed                  DATE,
    date_promised                DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_pegging_demand ON aps_pegging_links (demand_type, demand_reference);
CREATE INDEX IF NOT EXISTS idx_aps_pegging_supply ON aps_pegging_links (supply_type, supply_reference);

CREATE TABLE IF NOT EXISTS aps_kpi_snapshots (
    aps_kpi_snapshot_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id              UUID            NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    snapshot_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    on_time_delivery_pct         NUMERIC(6,2),
    utilization_pct              NUMERIC(6,2),
    wip_value                    NUMERIC(14,2),
    lead_time_days               NUMERIC(10,2),
    late_order_count             INT             DEFAULT 0,
    bottleneck_load_pct          NUMERIC(6,2),
    queue_hours                  NUMERIC(12,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aps_kpi_snapshot_at ON aps_kpi_snapshots (snapshot_at DESC);

CREATE TABLE IF NOT EXISTS aps_planning_horizons (
    aps_planning_horizon_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_group                VARCHAR(80)     NOT NULL,
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    frozen_days                  INT             NOT NULL DEFAULT 0,
    slushy_days                  INT             NOT NULL DEFAULT 0,
    free_days                    INT             NOT NULL DEFAULT 0,
    reschedule_tolerance_days    INT             DEFAULT 0,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (planner_group, work_center_id)
);
CREATE INDEX IF NOT EXISTS idx_aps_horizons_status ON aps_planning_horizons (status);

COMMIT;
