-- ============================================================================
-- Migration: 057_tooling_lifecycle_management.sql
-- Description: Tool crib, regrind, preset, and fixture lifecycle expansion.
-- Dependencies: 012_calibration_equipment.sql, 039_cnc_program_management.sql
-- Rollback: DROP TABLE fixture_maintenance_logs, fixture_master,
--           tooling_calibration_links, tooling_kit_items, tooling_kits,
--           tooling_regrind_cycles, tooling_life_measurements,
--           tooling_life_limits, tooling_crib_transactions,
--           tooling_locations, tooling_presets, tooling_components,
--           tooling_assemblies, tooling_families CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tooling_families (
    tooling_family_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_code                  VARCHAR(50)     NOT NULL UNIQUE,
    family_name                  VARCHAR(200)    NOT NULL,
    family_type                  VARCHAR(20)     NOT NULL
                                 CHECK (family_type IN ('cutting_tool', 'holder', 'insert', 'fixture')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_assemblies (
    tooling_assembly_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_code                VARCHAR(80)     NOT NULL UNIQUE,
    tooling_family_id            UUID            REFERENCES tooling_families(tooling_family_id),
    tool_id                      VARCHAR(50)     REFERENCES tools(tool_id),
    setup_id                     UUID            REFERENCES setup_sheets(setup_id),
    assembly_status              VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (assembly_status IN ('active', 'retired', 'rework')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_components (
    tooling_component_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tooling_assembly_id          UUID            NOT NULL REFERENCES tooling_assemblies(tooling_assembly_id) ON DELETE CASCADE,
    component_code               VARCHAR(80)     NOT NULL,
    tool_id                      VARCHAR(50)     REFERENCES tools(tool_id),
    component_type               VARCHAR(20)     NOT NULL
                                 CHECK (component_type IN ('tool', 'holder', 'insert', 'screw', 'adapter')),
    quantity                     NUMERIC(14,2)   DEFAULT 1,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (tooling_assembly_id, component_code)
);

CREATE TABLE IF NOT EXISTS tooling_presets (
    tooling_preset_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    preset_number                VARCHAR(80)     NOT NULL UNIQUE,
    tool_id                      VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    preset_length                NUMERIC(12,4),
    preset_diameter              NUMERIC(12,4),
    measured_by                  UUID            REFERENCES users(user_id),
    measured_at                  TIMESTAMPTZ,
    preset_status                VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (preset_status IN ('active', 'superseded', 'void')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_locations (
    tooling_location_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_code                VARCHAR(80)     NOT NULL UNIQUE,
    location_type                VARCHAR(20)     NOT NULL
                                 CHECK (location_type IN ('crib', 'machine', 'preset', 'inspection', 'regrind_vendor')),
    description                  VARCHAR(200),
    is_active                    BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_crib_transactions (
    tooling_crib_transaction_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id                      VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    tooling_location_id          UUID            REFERENCES tooling_locations(tooling_location_id),
    transaction_type             VARCHAR(20)     NOT NULL
                                 CHECK (transaction_type IN ('issue', 'return', 'transfer', 'scrap', 'regrind_send', 'regrind_receive')),
    quantity                     NUMERIC(14,2)   NOT NULL DEFAULT 0,
    job_number                   VARCHAR(50),
    performed_by                 UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tooling_crib_txn_tool ON tooling_crib_transactions (tool_id);

CREATE TABLE IF NOT EXISTS tooling_life_limits (
    tooling_life_limit_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id                      VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    limit_type                   VARCHAR(20)     NOT NULL
                                 CHECK (limit_type IN ('minutes', 'parts', 'wear', 'regrinds')),
    warning_limit                NUMERIC(14,4),
    shutdown_limit               NUMERIC(14,4),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (tool_id, limit_type)
);

CREATE TABLE IF NOT EXISTS tooling_life_measurements (
    tooling_life_measurement_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id                      VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    measurement_type             VARCHAR(20)     NOT NULL
                                 CHECK (measurement_type IN ('usage', 'wear', 'diameter', 'length')),
    measurement_value            NUMERIC(14,4)   NOT NULL,
    measured_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    source_type                  VARCHAR(20)     NOT NULL DEFAULT 'manual'
                                 CHECK (source_type IN ('manual', 'machine', 'presetter')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tooling_life_measure_tool ON tooling_life_measurements (tool_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS tooling_regrind_cycles (
    tooling_regrind_cycle_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id                      VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    sent_date                    DATE,
    returned_date                DATE,
    cycle_number                 INT             NOT NULL,
    regrind_cost                 NUMERIC(14,2),
    cycle_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (cycle_status IN ('open', 'completed', 'scrapped')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (tool_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS tooling_kits (
    tooling_kit_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_code                     VARCHAR(80)     NOT NULL UNIQUE,
    kit_name                     VARCHAR(200)    NOT NULL,
    job_number                   VARCHAR(50),
    operation_seq                INT,
    kit_status                   VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (kit_status IN ('planned', 'issued', 'returned', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_kit_items (
    tooling_kit_item_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tooling_kit_id               UUID            NOT NULL REFERENCES tooling_kits(tooling_kit_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    tool_id                      VARCHAR(50)     REFERENCES tools(tool_id),
    tooling_assembly_id          UUID            REFERENCES tooling_assemblies(tooling_assembly_id),
    quantity_required            NUMERIC(14,2)   DEFAULT 1,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (tooling_kit_id, line_number)
);

CREATE TABLE IF NOT EXISTS tooling_calibration_links (
    tooling_calibration_link_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id                      VARCHAR(50)     REFERENCES tools(tool_id),
    equipment_id                 VARCHAR(50)     REFERENCES equipment(equipment_id),
    calibration_record_id        UUID            REFERENCES calibration_records(cal_id),
    link_type                    VARCHAR(20)     NOT NULL
                                 CHECK (link_type IN ('presetter', 'gage', 'fixture', 'adapter')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixture_master (
    fixture_id                   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixture_code                 VARCHAR(80)     NOT NULL UNIQUE,
    fixture_name                 VARCHAR(200)    NOT NULL,
    tooling_family_id            UUID            REFERENCES tooling_families(tooling_family_id),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    maintenance_interval_days    INT,
    fixture_status               VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (fixture_status IN ('active', 'maintenance', 'retired')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixture_maintenance_logs (
    fixture_maintenance_log_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixture_id                   UUID            NOT NULL REFERENCES fixture_master(fixture_id) ON DELETE CASCADE,
    maintenance_date             DATE            NOT NULL,
    maintenance_type             VARCHAR(20)     NOT NULL
                                 CHECK (maintenance_type IN ('inspection', 'repair', 'cleaning', 'calibration')),
    performed_by                 UUID            REFERENCES users(user_id),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
