-- ============================================================================
-- Migration: 084_execution_quality_projection.sql
-- Description: Manufacturing work-order execution, IPQC containment, and
--              stock-balance projection foundations.
-- Dependencies: 009_inventory.sql, 010_production.sql, 011_quality.sql,
--               012_calibration_equipment.sql, 070_enterprise_governance_uplift.sql
-- Rollback: DROP TABLE ipqc_inspection_results, ipqc_inspections,
--           stock_balances, work_orders CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number            VARCHAR(50)     NOT NULL UNIQUE,
    work_order_status            VARCHAR(30)     NOT NULL DEFAULT 'draft'
                                 CHECK (work_order_status IN ('draft', 'planned', 'released', 'in_production', 'quality_hold', 'closed', 'cancelled')),
    job_order_id                 UUID            NOT NULL REFERENCES job_orders(job_order_id),
    job_op_id                    UUID            REFERENCES job_operations(job_op_id),
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    equipment_id                 VARCHAR(50)     REFERENCES equipment(equipment_id),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    operation_seq                INT,
    traveler_number              VARCHAR(80),
    release_gate_status          VARCHAR(30)     NOT NULL DEFAULT 'pending'
                                 CHECK (release_gate_status IN ('pending', 'ready', 'blocked', 'released')),
    planned_start_at             TIMESTAMPTZ,
    planned_end_at               TIMESTAMPTZ,
    actual_start_at              TIMESTAMPTZ,
    actual_end_at                TIMESTAMPTZ,
    planned_qty                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    completed_qty                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    scrap_qty                    NUMERIC(14,2)   NOT NULL DEFAULT 0,
    rework_qty                   NUMERIC(14,2)   NOT NULL DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (work_order_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_job ON work_orders (job_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders (equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_scope ON work_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_lineage ON work_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_work_orders_row_version ON work_orders;
CREATE TRIGGER trg_work_orders_row_version BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS ipqc_inspections (
    ipqc_inspection_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipqc_number                  VARCHAR(50)     NOT NULL UNIQUE,
    inspection_status            VARCHAR(30)     NOT NULL DEFAULT 'queued'
                                 CHECK (inspection_status IN ('queued', 'in_progress', 'accepted', 'rejected', 'reinspect', 'closed')),
    work_order_id                UUID            REFERENCES work_orders(work_order_id),
    job_op_id                    UUID            REFERENCES job_operations(job_op_id),
    inspection_plan_id           UUID            REFERENCES inspection_plans(plan_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    inspector_id                 UUID            REFERENCES users(user_id),
    queued_at                    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    started_at                   TIMESTAMPTZ,
    completed_at                 TIMESTAMPTZ,
    disposition_code             VARCHAR(50),
    quarantine_required          BOOLEAN         NOT NULL DEFAULT FALSE,
    ncr_reference                VARCHAR(50),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_ipqc_inspections_status ON ipqc_inspections (inspection_status);
CREATE INDEX IF NOT EXISTS idx_ipqc_inspections_work_order ON ipqc_inspections (work_order_id);
CREATE INDEX IF NOT EXISTS idx_ipqc_inspections_job_op ON ipqc_inspections (job_op_id);
CREATE INDEX IF NOT EXISTS idx_ipqc_inspections_scope ON ipqc_inspections (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_ipqc_inspections_lineage ON ipqc_inspections (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_ipqc_inspections_row_version ON ipqc_inspections;
CREATE TRIGGER trg_ipqc_inspections_row_version BEFORE UPDATE ON ipqc_inspections FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS ipqc_inspection_results (
    ipqc_inspection_result_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipqc_inspection_id           UUID            NOT NULL REFERENCES ipqc_inspections(ipqc_inspection_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    characteristic               VARCHAR(200)    NOT NULL,
    nominal_value                NUMERIC(14,6),
    upper_spec_limit             NUMERIC(14,6),
    lower_spec_limit             NUMERIC(14,6),
    actual_value                 NUMERIC(14,6),
    pass_fail                    VARCHAR(10)     CHECK (pass_fail IN ('pass', 'fail')),
    defect_code                  VARCHAR(50),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (ipqc_inspection_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_ipqc_results_pass_fail ON ipqc_inspection_results (pass_fail);
DROP TRIGGER IF EXISTS trg_ipqc_inspection_results_row_version ON ipqc_inspection_results;
CREATE TRIGGER trg_ipqc_inspection_results_row_version BEFORE UPDATE ON ipqc_inspection_results FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS stock_balances (
    stock_balance_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id            VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    warehouse_id                 VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    location_id                  VARCHAR(50)     REFERENCES inventory_locations(location_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100),
    stock_snapshot_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    qty_on_hand                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_available                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_allocated                NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_quarantined              NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_in_inspection            NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_on_order                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    source_txn_recorded_at       TIMESTAMPTZ,
    snapshot_reason              VARCHAR(30)     NOT NULL DEFAULT 'reconciliation'
                                 CHECK (snapshot_reason IN ('cycle_count', 'receipt', 'issue', 'transfer', 'adjustment', 'reconciliation')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_stock_balances_item ON stock_balances (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_warehouse ON stock_balances (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_snapshot ON stock_balances (stock_snapshot_at);
CREATE INDEX IF NOT EXISTS idx_stock_balances_scope ON stock_balances (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_lineage ON stock_balances (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_stock_balances_row_version ON stock_balances;
CREATE TRIGGER trg_stock_balances_row_version BEFORE UPDATE ON stock_balances FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
