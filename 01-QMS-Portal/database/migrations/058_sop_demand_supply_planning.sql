-- ============================================================================
-- Migration: 058_sop_demand_supply_planning.sql
-- Description: S&OP, demand shaping, replenishment policy, and inventory buffers.
-- Dependencies: 047_advanced_planning_scheduling.sql, 009_inventory.sql
-- Rollback: DROP TABLE inventory_buffer_profiles,
--           supply_replenishment_policies, demand_history_buckets,
--           demand_classifications, sop_action_items, sop_meeting_cycles,
--           sop_scenario_assumptions, sop_inventory_policies,
--           sop_supply_consensus, sop_demand_consensus,
--           sop_plan_versions, sop_plans CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS sop_plans (
    sop_plan_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code                    VARCHAR(80)     NOT NULL UNIQUE,
    plan_horizon_start           DATE            NOT NULL,
    plan_horizon_end             DATE            NOT NULL,
    owner_id                     UUID            REFERENCES users(user_id),
    plan_status                  VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (plan_status IN ('draft', 'review', 'approved', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_plan_versions (
    sop_plan_version_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_plan_id                  UUID            NOT NULL REFERENCES sop_plans(sop_plan_id) ON DELETE CASCADE,
    version_number               INT             NOT NULL,
    scenario_label               VARCHAR(100),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (sop_plan_id, version_number)
);

CREATE TABLE IF NOT EXISTS sop_demand_consensus (
    sop_demand_consensus_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_plan_version_id          UUID            NOT NULL REFERENCES sop_plan_versions(sop_plan_version_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    demand_period                DATE            NOT NULL,
    baseline_qty                 NUMERIC(14,2)   DEFAULT 0,
    consensus_qty                NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (sop_plan_version_id, item_id, customer_id, demand_period)
);

CREATE TABLE IF NOT EXISTS sop_supply_consensus (
    sop_supply_consensus_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_plan_version_id          UUID            NOT NULL REFERENCES sop_plan_versions(sop_plan_version_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    supply_period                DATE            NOT NULL,
    planned_supply_qty           NUMERIC(14,2)   DEFAULT 0,
    constrained_supply_qty       NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (sop_plan_version_id, item_id, work_center_id, supply_period)
);

CREATE TABLE IF NOT EXISTS sop_inventory_policies (
    sop_inventory_policy_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    policy_type                  VARCHAR(20)     NOT NULL
                                 CHECK (policy_type IN ('min_max', 'target_days', 'safety_stock', 'decoupling')),
    target_inventory_qty         NUMERIC(14,2),
    min_inventory_qty            NUMERIC(14,2),
    max_inventory_qty            NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (item_id, warehouse_id, policy_type)
);

CREATE TABLE IF NOT EXISTS sop_scenario_assumptions (
    sop_scenario_assumption_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_plan_version_id          UUID            NOT NULL REFERENCES sop_plan_versions(sop_plan_version_id) ON DELETE CASCADE,
    assumption_category          VARCHAR(30)     NOT NULL
                                 CHECK (assumption_category IN ('demand', 'capacity', 'supplier', 'inventory', 'cost')),
    assumption_key               VARCHAR(80)     NOT NULL,
    assumption_value             VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (sop_plan_version_id, assumption_category, assumption_key)
);

CREATE TABLE IF NOT EXISTS sop_meeting_cycles (
    sop_meeting_cycle_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_plan_id                  UUID            NOT NULL REFERENCES sop_plans(sop_plan_id) ON DELETE CASCADE,
    meeting_date                 DATE            NOT NULL,
    meeting_stage                VARCHAR(20)     NOT NULL
                                 CHECK (meeting_stage IN ('data_review', 'demand_review', 'supply_review', 'executive')),
    facilitator_id               UUID            REFERENCES users(user_id),
    meeting_notes                TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_action_items (
    sop_action_item_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_meeting_cycle_id         UUID            NOT NULL REFERENCES sop_meeting_cycles(sop_meeting_cycle_id) ON DELETE CASCADE,
    action_owner_id              UUID            REFERENCES users(user_id),
    action_summary               VARCHAR(300)    NOT NULL,
    due_date                     DATE,
    action_status                VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (action_status IN ('open', 'in_progress', 'closed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demand_classifications (
    demand_classification_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    classification_code          VARCHAR(30)     NOT NULL,
    intermittency_index          NUMERIC(10,4),
    variability_index            NUMERIC(10,4),
    planning_method              VARCHAR(30),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (item_id, classification_code)
);

CREATE TABLE IF NOT EXISTS demand_history_buckets (
    demand_history_bucket_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    demand_period                DATE            NOT NULL,
    shipped_qty                  NUMERIC(14,2)   DEFAULT 0,
    booked_qty                   NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (item_id, customer_id, demand_period)
);

CREATE TABLE IF NOT EXISTS supply_replenishment_policies (
    supply_replenishment_policy_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    replenishment_mode           VARCHAR(20)     NOT NULL
                                 CHECK (replenishment_mode IN ('mrp', 'kanban', 'vmi', 'reorder_point')),
    review_cycle_days            INT,
    order_multiple               NUMERIC(14,2),
    preferred_supplier_id        VARCHAR(50)     REFERENCES vendors(vendor_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (item_id, warehouse_id, replenishment_mode)
);

CREATE TABLE IF NOT EXISTS inventory_buffer_profiles (
    inventory_buffer_profile_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    buffer_code                  VARCHAR(50)     NOT NULL UNIQUE,
    item_group                   VARCHAR(50),
    replenishment_mode           VARCHAR(20),
    red_zone_qty                 NUMERIC(14,2),
    yellow_zone_qty              NUMERIC(14,2),
    green_zone_qty               NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
