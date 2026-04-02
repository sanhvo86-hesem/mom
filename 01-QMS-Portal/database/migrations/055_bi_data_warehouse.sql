-- ============================================================================
-- Migration: 055_bi_data_warehouse.sql
-- Description: Core manufacturing data warehouse dimensions and facts.
-- Dependencies: 006_erp_master_data.sql, 007_customers_sales.sql,
--               008_vendors_purchasing.sql, 012_calibration_equipment.sql
-- Rollback: DROP TABLE dw_kpi_scorecards, dw_etl_runs, dw_fact_financial,
--           dw_fact_delivery, dw_fact_quality, dw_fact_production,
--           dw_employee_dim, dw_machine_dim, dw_supplier_dim,
--           dw_item_dim, dw_customer_dim, dw_time_dim CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dw_time_dim (
    date_key                     INT             PRIMARY KEY,
    calendar_date                DATE            NOT NULL UNIQUE,
    day_of_week                  INT             NOT NULL,
    day_name                     VARCHAR(20)     NOT NULL,
    week_of_year                 INT             NOT NULL,
    month_number                 INT             NOT NULL,
    month_name                   VARCHAR(20)     NOT NULL,
    quarter_number               INT             NOT NULL,
    year_number                  INT             NOT NULL,
    is_weekend                   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_holiday                   BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dw_customer_dim (
    dw_customer_key              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    customer_code                VARCHAR(80),
    customer_name                VARCHAR(200)    NOT NULL,
    country_code                 CHAR(2),
    industry_segment             VARCHAR(100),
    customer_status              VARCHAR(20),
    effective_from               DATE,
    effective_to                 DATE,
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_customer_current ON dw_customer_dim (is_current);

CREATE TABLE IF NOT EXISTS dw_item_dim (
    dw_item_key                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    item_code                    VARCHAR(80),
    item_description             VARCHAR(300)    NOT NULL,
    item_group                   VARCHAR(50),
    material_type                VARCHAR(100),
    abc_class                    VARCHAR(10),
    make_buy_code                VARCHAR(20),
    effective_from               DATE,
    effective_to                 DATE,
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_item_current ON dw_item_dim (is_current);

CREATE TABLE IF NOT EXISTS dw_supplier_dim (
    dw_supplier_key              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    vendor_code                  VARCHAR(80),
    vendor_name                  VARCHAR(200)    NOT NULL,
    country_code                 CHAR(2),
    supplier_category            VARCHAR(100),
    supplier_status              VARCHAR(20),
    effective_from               DATE,
    effective_to                 DATE,
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_supplier_current ON dw_supplier_dim (is_current);

CREATE TABLE IF NOT EXISTS dw_machine_dim (
    dw_machine_key               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id                 VARCHAR(50)     REFERENCES equipment(equipment_id),
    machine_code                 VARCHAR(80),
    machine_name                 VARCHAR(200)    NOT NULL,
    machine_type                 VARCHAR(100),
    work_center_id               VARCHAR(30)     REFERENCES work_centers(work_center_id),
    criticality                  VARCHAR(10),
    effective_from               DATE,
    effective_to                 DATE,
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_machine_current ON dw_machine_dim (is_current);

CREATE TABLE IF NOT EXISTS dw_employee_dim (
    dw_employee_key              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     REFERENCES employees(employee_id),
    employee_name                VARCHAR(200)    NOT NULL,
    dept_code                    VARCHAR(30),
    role_code                    VARCHAR(50),
    shift_code                   VARCHAR(20),
    employment_status            VARCHAR(20),
    effective_from               DATE,
    effective_to                 DATE,
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_employee_current ON dw_employee_dim (is_current);

CREATE TABLE IF NOT EXISTS dw_fact_production (
    dw_fact_production_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_key                     INT             REFERENCES dw_time_dim(date_key),
    dw_item_key                  UUID            REFERENCES dw_item_dim(dw_item_key),
    dw_machine_key               UUID            REFERENCES dw_machine_dim(dw_machine_key),
    job_number                   VARCHAR(50),
    work_order_number            VARCHAR(50),
    good_qty                     NUMERIC(14,2)   DEFAULT 0,
    scrap_qty                    NUMERIC(14,2)   DEFAULT 0,
    setup_minutes                NUMERIC(12,2)   DEFAULT 0,
    run_minutes                  NUMERIC(12,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_fact_prod_date ON dw_fact_production (date_key);

CREATE TABLE IF NOT EXISTS dw_fact_quality (
    dw_fact_quality_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_key                     INT             REFERENCES dw_time_dim(date_key),
    dw_item_key                  UUID            REFERENCES dw_item_dim(dw_item_key),
    dw_customer_key              UUID            REFERENCES dw_customer_dim(dw_customer_key),
    ncr_reference                VARCHAR(80),
    inspection_reference         VARCHAR(80),
    defect_qty                   NUMERIC(14,2)   DEFAULT 0,
    defect_cost                  NUMERIC(14,2)   DEFAULT 0,
    ppm_value                    NUMERIC(14,4),
    first_pass_yield_pct         NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_fact_quality_date ON dw_fact_quality (date_key);

CREATE TABLE IF NOT EXISTS dw_fact_delivery (
    dw_fact_delivery_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_key                     INT             REFERENCES dw_time_dim(date_key),
    dw_customer_key              UUID            REFERENCES dw_customer_dim(dw_customer_key),
    sales_order_number           VARCHAR(80),
    shipment_number              VARCHAR(80),
    shipped_qty                  NUMERIC(14,2)   DEFAULT 0,
    on_time_flag                 BOOLEAN         NOT NULL DEFAULT FALSE,
    days_late                    NUMERIC(10,2),
    freight_cost                 NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_fact_delivery_date ON dw_fact_delivery (date_key);

CREATE TABLE IF NOT EXISTS dw_fact_financial (
    dw_fact_financial_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_key                     INT             REFERENCES dw_time_dim(date_key),
    dw_customer_key              UUID            REFERENCES dw_customer_dim(dw_customer_key),
    dw_supplier_key              UUID            REFERENCES dw_supplier_dim(dw_supplier_key),
    ledger_code                  VARCHAR(50),
    account_code                 VARCHAR(50),
    transaction_reference        VARCHAR(80),
    revenue_amount               NUMERIC(14,2)   DEFAULT 0,
    cost_amount                  NUMERIC(14,2)   DEFAULT 0,
    margin_amount                NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_fact_financial_date ON dw_fact_financial (date_key);

CREATE TABLE IF NOT EXISTS dw_etl_runs (
    dw_etl_run_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_name                VARCHAR(100)    NOT NULL,
    run_started_at               TIMESTAMPTZ     NOT NULL,
    run_finished_at              TIMESTAMPTZ,
    source_watermark             TIMESTAMPTZ,
    rows_inserted                INT             DEFAULT 0,
    rows_updated                 INT             DEFAULT 0,
    run_status                   VARCHAR(20)     NOT NULL DEFAULT 'running'
                                 CHECK (run_status IN ('running', 'completed', 'failed')),
    error_message                TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dw_etl_status ON dw_etl_runs (run_status);

CREATE TABLE IF NOT EXISTS dw_kpi_scorecards (
    dw_kpi_scorecard_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    scorecard_period             DATE            NOT NULL,
    scorecard_scope              VARCHAR(30)     NOT NULL
                                 CHECK (scorecard_scope IN ('plant', 'customer', 'supplier', 'program', 'work_center')),
    scope_reference              VARCHAR(80),
    otd_pct                      NUMERIC(6,2),
    ppm_value                    NUMERIC(14,4),
    oee_pct                      NUMERIC(6,2),
    inventory_turns              NUMERIC(10,2),
    gross_margin_pct             NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (scorecard_period, scorecard_scope, scope_reference)
);
CREATE INDEX IF NOT EXISTS idx_dw_scorecard_period ON dw_kpi_scorecards (scorecard_period DESC);

COMMIT;
