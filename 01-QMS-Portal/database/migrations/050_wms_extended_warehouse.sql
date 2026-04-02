-- ============================================================================
-- Migration: 050_wms_extended_warehouse.sql
-- Description: Bin-level warehouse management system aligned to SAP EWM
--              and Epicor warehouse patterns.
-- Dependencies: 009_inventory.sql, 007_customers_sales.sql, 010_production.sql
-- Rollback: DROP TABLE wms_material_handling_units, wms_quarantine_holds,
--           wms_cycle_count_results, wms_cycle_count_plans, wms_wave_plans,
--           wms_pick_list_lines, wms_pick_lists, wms_putaway_rules,
--           wms_transfer_order_lines, wms_transfer_orders, wms_bin_contents,
--           wms_storage_bins, wms_zones CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS wms_zones (
    wms_zone_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id                 VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    zone_code                    VARCHAR(50)     NOT NULL,
    zone_name                    VARCHAR(150)    NOT NULL,
    zone_type                    VARCHAR(30)     NOT NULL
                                 CHECK (zone_type IN ('receiving', 'quarantine', 'mrb', 'itar', 'raw', 'wip', 'fg', 'shipping')),
    access_level                 VARCHAR(30),
    temperature_controlled       BOOLEAN         NOT NULL DEFAULT FALSE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (warehouse_id, zone_code)
);
CREATE INDEX IF NOT EXISTS idx_wms_zones_type ON wms_zones (zone_type);

CREATE TABLE IF NOT EXISTS wms_storage_bins (
    wms_storage_bin_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wms_zone_id                  UUID            NOT NULL REFERENCES wms_zones(wms_zone_id) ON DELETE CASCADE,
    warehouse_id                 VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    bin_code                     VARCHAR(80)     NOT NULL UNIQUE,
    aisle                        VARCHAR(20),
    bay                          VARCHAR(20),
    level_code                   VARCHAR(20),
    position_code                VARCHAR(20),
    barcode                      VARCHAR(120),
    max_weight_kg                NUMERIC(12,2),
    max_volume_m3                NUMERIC(12,4),
    bin_type                     VARCHAR(20)     DEFAULT 'rack'
                                 CHECK (bin_type IN ('rack', 'floor', 'cantilever', 'staging')),
    is_active                    BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_bins_zone ON wms_storage_bins (wms_zone_id);
CREATE INDEX IF NOT EXISTS idx_wms_bins_barcode ON wms_storage_bins (barcode);

CREATE TABLE IF NOT EXISTS wms_bin_contents (
    wms_bin_content_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wms_storage_bin_id           UUID            NOT NULL REFERENCES wms_storage_bins(wms_storage_bin_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    qty_on_hand                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_allocated                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    unit_of_measure              VARCHAR(20)     DEFAULT 'EA',
    content_status               VARCHAR(20)     NOT NULL DEFAULT 'available'
                                 CHECK (content_status IN ('available', 'allocated', 'blocked', 'qc_hold')),
    last_count_date              DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_bin_content_item ON wms_bin_contents (item_id);
CREATE INDEX IF NOT EXISTS idx_wms_bin_content_status ON wms_bin_contents (content_status);

CREATE TABLE IF NOT EXISTS wms_transfer_orders (
    wms_transfer_order_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_order_number        VARCHAR(80)     NOT NULL UNIQUE,
    from_wms_storage_bin_id      UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    to_wms_storage_bin_id        UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    reason_code                  VARCHAR(30)     NOT NULL
                                 CHECK (reason_code IN ('putaway', 'pick', 'replenish', 'reclass', 'quarantine', 'cycle_count')),
    priority                     INT             DEFAULT 50,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'in_progress', 'confirmed', 'cancelled')),
    requested_by                 UUID            REFERENCES users(user_id),
    confirmed_by                 UUID            REFERENCES users(user_id),
    confirmed_at                 TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_to_status ON wms_transfer_orders (status);

CREATE TABLE IF NOT EXISTS wms_transfer_order_lines (
    wms_transfer_order_line_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wms_transfer_order_id        UUID            NOT NULL REFERENCES wms_transfer_orders(wms_transfer_order_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    requested_qty                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    moved_qty                    NUMERIC(14,2)   DEFAULT 0,
    source_content_id            UUID            REFERENCES wms_bin_contents(wms_bin_content_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (wms_transfer_order_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_wms_to_lines_item ON wms_transfer_order_lines (item_id);

CREATE TABLE IF NOT EXISTS wms_putaway_rules (
    wms_putaway_rule_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_group                   VARCHAR(50),
    material_type                VARCHAR(100),
    preferred_wms_zone_id        UUID            REFERENCES wms_zones(wms_zone_id),
    strategy                     VARCHAR(20)     NOT NULL DEFAULT 'fifo'
                                 CHECK (strategy IN ('fifo', 'fefo', 'closest_empty', 'same_lot', 'fixed_bin')),
    max_stack_height             NUMERIC(12,2),
    requires_itar_zone           BOOLEAN         NOT NULL DEFAULT FALSE,
    priority_order               INT             DEFAULT 50,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_putaway_group ON wms_putaway_rules (item_group, material_type);

CREATE TABLE IF NOT EXISTS wms_pick_lists (
    wms_pick_list_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pick_list_number             VARCHAR(80)     NOT NULL UNIQUE,
    pick_type                    VARCHAR(20)     NOT NULL
                                 CHECK (pick_type IN ('job_kit', 'shipment', 'wave', 'replenishment')),
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    job_number                   VARCHAR(50)     REFERENCES job_orders(job_number),
    wms_wave_plan_id             UUID,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    requested_ship_date          DATE,
    picker_id                    UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_pick_lists_status ON wms_pick_lists (status);

CREATE TABLE IF NOT EXISTS wms_pick_list_lines (
    wms_pick_list_line_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wms_pick_list_id             UUID            NOT NULL REFERENCES wms_pick_lists(wms_pick_list_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    suggested_wms_storage_bin_id UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    actual_wms_storage_bin_id    UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    requested_qty                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    picked_qty                   NUMERIC(14,2)   DEFAULT 0,
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (wms_pick_list_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_wms_pick_lines_item ON wms_pick_list_lines (item_id);

CREATE TABLE IF NOT EXISTS wms_wave_plans (
    wms_wave_plan_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wave_number                  VARCHAR(80)     NOT NULL UNIQUE,
    warehouse_id                 VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    wave_date                    DATE            NOT NULL,
    release_time                 TIMESTAMPTZ,
    priority_rule                VARCHAR(30),
    order_count                  INT             DEFAULT 0,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (status IN ('planned', 'released', 'completed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_wave_date ON wms_wave_plans (wave_date);

DO $$ BEGIN
    ALTER TABLE wms_pick_lists
        ADD CONSTRAINT fk_wms_pick_lists_wave
        FOREIGN KEY (wms_wave_plan_id) REFERENCES wms_wave_plans(wms_wave_plan_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wms_cycle_count_plans (
    wms_cycle_count_plan_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number                  VARCHAR(80)     NOT NULL UNIQUE,
    warehouse_id                 VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    wms_zone_id                  UUID            REFERENCES wms_zones(wms_zone_id),
    abc_class                    VARCHAR(10),
    frequency_days               INT             NOT NULL DEFAULT 30,
    next_count_date              DATE,
    owner_id                     UUID            REFERENCES users(user_id),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'paused', 'completed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_count_plan_next ON wms_cycle_count_plans (next_count_date);

CREATE TABLE IF NOT EXISTS wms_cycle_count_results (
    wms_cycle_count_result_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    wms_cycle_count_plan_id      UUID            NOT NULL REFERENCES wms_cycle_count_plans(wms_cycle_count_plan_id) ON DELETE CASCADE,
    wms_storage_bin_id           UUID            NOT NULL REFERENCES wms_storage_bins(wms_storage_bin_id),
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    system_qty                   NUMERIC(14,2)   NOT NULL DEFAULT 0,
    counted_qty                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    variance_qty                 NUMERIC(14,2)   GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    adjuster_id                  UUID            REFERENCES users(user_id),
    adjustment_posted            BOOLEAN         NOT NULL DEFAULT FALSE,
    approved_by                  UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_count_result_bin ON wms_cycle_count_results (wms_storage_bin_id);

CREATE TABLE IF NOT EXISTS wms_quarantine_holds (
    wms_quarantine_hold_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    wms_storage_bin_id           UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    hold_reason                  VARCHAR(30)     NOT NULL
                                 CHECK (hold_reason IN ('incoming_reject', 'shelf_life', 'itar_review', 'mrb', 'customer_return')),
    held_qty                     NUMERIC(14,2)   NOT NULL DEFAULT 0,
    release_authority_id         UUID            REFERENCES users(user_id),
    released_at                  TIMESTAMPTZ,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'released', 'scrapped')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_quarantine_status ON wms_quarantine_holds (status);

CREATE TABLE IF NOT EXISTS wms_material_handling_units (
    wms_handling_unit_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    handling_unit_code           VARCHAR(80)     NOT NULL UNIQUE,
    parent_wms_handling_unit_id  UUID            REFERENCES wms_material_handling_units(wms_handling_unit_id),
    handling_unit_type           VARCHAR(20)     NOT NULL
                                 CHECK (handling_unit_type IN ('pallet', 'container', 'tote', 'carton')),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    current_wms_storage_bin_id   UUID            REFERENCES wms_storage_bins(wms_storage_bin_id),
    gross_weight_kg              NUMERIC(12,2),
    max_weight_kg                NUMERIC(12,2),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'shipped', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_hu_parent ON wms_material_handling_units (parent_wms_handling_unit_id);

COMMIT;
