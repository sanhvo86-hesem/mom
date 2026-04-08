CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_row_version()
RETURNS trigger AS $$
BEGIN
    NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL DEFAULT 'Benchmark User'
);

CREATE TABLE IF NOT EXISTS org_companies (
    company_code VARCHAR(30) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS org_legal_entities (
    legal_entity_code VARCHAR(30) PRIMARY KEY,
    legal_entity_name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS org_plants (
    plant_id VARCHAR(30) PRIMARY KEY,
    plant_name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS mes_sites (
    site_id VARCHAR(30) PRIMARY KEY,
    site_name VARCHAR(150) NOT NULL
);

INSERT INTO org_companies (company_code, company_name)
VALUES ('HESEM', 'HESEM Holdings')
ON CONFLICT (company_code) DO NOTHING;

INSERT INTO org_legal_entities (legal_entity_code, legal_entity_name)
VALUES ('VN01', 'HESEM Vietnam')
ON CONFLICT (legal_entity_code) DO NOTHING;

INSERT INTO org_plants (plant_id, plant_name)
VALUES ('PLANT01', 'Primary Plant')
ON CONFLICT (plant_id) DO NOTHING;

INSERT INTO mes_sites (site_id, site_name)
VALUES ('SITE01', 'Primary Site')
ON CONFLICT (site_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS aps_planning_scenarios (
    aps_scenario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_name VARCHAR(150) NOT NULL,
    base_scenario_id UUID REFERENCES aps_planning_scenarios(aps_scenario_id),
    scenario_status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (scenario_status IN ('draft', 'published', 'archived')),
    is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until TIMESTAMPTZ,
    snapshot_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(user_id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    source_record_id VARCHAR(120),
    row_version BIGINT NOT NULL DEFAULT 1,
    payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    UNIQUE (scenario_name)
);
CREATE INDEX IF NOT EXISTS idx_aps_scenarios_status ON aps_planning_scenarios (scenario_status);
CREATE INDEX IF NOT EXISTS idx_aps_planning_scenarios_lineage ON aps_planning_scenarios (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_planning_scenarios_org_scope ON aps_planning_scenarios (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_planning_scenarios_row_version ON aps_planning_scenarios;
CREATE TRIGGER trg_aps_planning_scenarios_row_version BEFORE UPDATE ON aps_planning_scenarios FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS aps_demand_forecasts (
    aps_forecast_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id UUID NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    customer_id VARCHAR(50),
    item_id VARCHAR(50),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    forecast_qty NUMERIC(14, 2) NOT NULL DEFAULT 0,
    actual_qty NUMERIC(14, 2),
    confidence_pct NUMERIC(5, 2),
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('edi', 'manual', 'ai', 'mps')),
    planner_id UUID REFERENCES users(user_id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    source_record_id VARCHAR(120),
    row_version BIGINT NOT NULL DEFAULT 1,
    payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_aps_forecasts_scenario ON aps_demand_forecasts (aps_scenario_id);
CREATE INDEX IF NOT EXISTS idx_aps_forecasts_item_period ON aps_demand_forecasts (item_id, period_start);
CREATE INDEX IF NOT EXISTS idx_aps_demand_forecasts_lineage ON aps_demand_forecasts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_demand_forecasts_org_scope ON aps_demand_forecasts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_demand_forecasts_row_version ON aps_demand_forecasts;
CREATE TRIGGER trg_aps_demand_forecasts_row_version BEFORE UPDATE ON aps_demand_forecasts FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS aps_schedule_blocks (
    aps_schedule_block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aps_scenario_id UUID NOT NULL REFERENCES aps_planning_scenarios(aps_scenario_id) ON DELETE CASCADE,
    job_number VARCHAR(50),
    operation_id UUID,
    resource_type VARCHAR(20) NOT NULL
        CHECK (resource_type IN ('machine', 'operator', 'tool', 'work_center')),
    resource_id VARCHAR(80) NOT NULL,
    planned_start TIMESTAMPTZ NOT NULL,
    planned_end TIMESTAMPTZ NOT NULL,
    setup_minutes NUMERIC(12, 2) DEFAULT 0,
    run_minutes NUMERIC(12, 2) DEFAULT 0,
    block_status VARCHAR(20) NOT NULL DEFAULT 'planned'
        CHECK (block_status IN ('planned', 'firm', 'released', 'completed')),
    sequence_position INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    org_company_code VARCHAR(30) REFERENCES org_companies(company_code),
    org_legal_entity_code VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id VARCHAR(30) REFERENCES org_plants(plant_id),
    org_site_id VARCHAR(30) REFERENCES mes_sites(site_id),
    source_system VARCHAR(40) NOT NULL DEFAULT 'QMS',
    source_record_id VARCHAR(120),
    row_version BIGINT NOT NULL DEFAULT 1,
    payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_aps_blocks_resource ON aps_schedule_blocks (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_aps_blocks_start ON aps_schedule_blocks (planned_start);
CREATE INDEX IF NOT EXISTS idx_aps_schedule_blocks_lineage ON aps_schedule_blocks (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_schedule_blocks_org_scope ON aps_schedule_blocks (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
DROP TRIGGER IF EXISTS trg_aps_schedule_blocks_row_version ON aps_schedule_blocks;
CREATE TRIGGER trg_aps_schedule_blocks_row_version BEFORE UPDATE ON aps_schedule_blocks FOR EACH ROW EXECUTE FUNCTION set_row_version();
