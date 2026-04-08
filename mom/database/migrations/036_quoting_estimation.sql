-- ============================================================================
-- Migration: 036_quoting_estimation.sql
-- Description: Quoting and estimation - quotes, quote lines, material costs,
--              machine rates
-- Dependencies: 007_customers_sales.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE quote_history, machine_rate_cards,
--           material_cost_templates, quote_lines, quotes CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE quote_status_enum AS ENUM (
        'draft', 'internal_review', 'sent', 'revised', 'accepted',
        'rejected', 'expired', 'converted'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- quotes / Bao gia
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
    quote_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number            VARCHAR(50)     UNIQUE,
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    customer_rfq_reference  VARCHAR(100),
    status                  quote_status_enum DEFAULT 'draft',
    version                 INT             DEFAULT 1,
    quote_date              DATE,
    validity_days           INT             DEFAULT 30,
    expiry_date             DATE,
    currency                VARCHAR(3)      DEFAULT 'VND',
    total_material_cost     NUMERIC(14,2)   DEFAULT 0,
    total_labor_cost        NUMERIC(14,2)   DEFAULT 0,
    total_tooling_cost      NUMERIC(14,2)   DEFAULT 0,
    total_outside_processing NUMERIC(14,2)  DEFAULT 0,
    total_overhead          NUMERIC(14,2)   DEFAULT 0,
    subtotal                NUMERIC(14,2)   DEFAULT 0,
    margin_percent          NUMERIC(5,2),
    margin_amount           NUMERIC(14,2),
    total_price             NUMERIC(14,2),
    notes                   TEXT,
    terms_conditions        TEXT,
    prepared_by             UUID            REFERENCES users(user_id),
    reviewed_by             UUID            REFERENCES users(user_id),
    approved_by             UUID            REFERENCES users(user_id),
    converted_so_number     VARCHAR(50),
    win_loss_reason         TEXT,
    competitor_info         TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE quotes IS 'Customer quotations with cost breakdown / Bao gia khach hang voi phan tich chi phi';

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes (quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_expiry ON quotes (expiry_date);

-- ============================================================================
-- quote_lines / Dong bao gia
-- ============================================================================
CREATE TABLE IF NOT EXISTS quote_lines (
    line_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id                UUID            NOT NULL REFERENCES quotes(quote_id) ON DELETE CASCADE,
    line_number             INT,
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    part_description        VARCHAR(500),
    qty                     NUMERIC(12,2)   NOT NULL,
    unit_of_measure         VARCHAR(20)     DEFAULT 'EA',
    material_type           VARCHAR(100),
    raw_stock_dimensions    VARCHAR(200),
    raw_weight_kg           NUMERIC(10,3),
    finished_weight_kg      NUMERIC(10,3),
    buy_to_fly_ratio        NUMERIC(5,2),
    material_cost_per_unit  NUMERIC(14,4),
    setup_time_minutes      NUMERIC(10,2),
    cycle_time_minutes      NUMERIC(10,2),
    num_operations          INT             DEFAULT 1,
    machine_type            VARCHAR(100),
    machine_rate_per_hour   NUMERIC(10,2),
    labor_cost_per_unit     NUMERIC(14,4),
    tooling_cost            NUMERIC(14,2)   DEFAULT 0,
    fixture_cost            NUMERIC(14,2)   DEFAULT 0,
    outside_processing_cost NUMERIC(14,4)   DEFAULT 0,
    overhead_rate_percent   NUMERIC(5,2)    DEFAULT 15,
    unit_cost               NUMERIC(14,4),
    unit_price              NUMERIC(14,4),
    line_total              NUMERIC(14,2),
    lead_time_days          INT,
    special_requirements    TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE quote_lines IS 'Individual line items within a quote / Cac dong san pham trong bao gia';

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_item ON quote_lines (item_id);

-- ============================================================================
-- material_cost_templates / Mau chi phi vat lieu
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_cost_templates (
    template_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_type           VARCHAR(100)    NOT NULL,
    material_grade          VARCHAR(100),
    form_factor             VARCHAR(50),
    unit_cost               NUMERIC(14,4)   NOT NULL,
    cost_unit               VARCHAR(20)     DEFAULT 'kg',
    density_kg_per_cm3      NUMERIC(8,5),
    typical_buy_to_fly      NUMERIC(5,2),
    supplier_id             VARCHAR(50),
    last_updated            DATE,
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (material_type, material_grade, form_factor)
);
COMMENT ON TABLE material_cost_templates IS 'Material cost reference templates for quoting / Mau tham chieu chi phi vat lieu cho bao gia';

CREATE INDEX IF NOT EXISTS idx_material_cost_templates_type ON material_cost_templates (material_type);
CREATE INDEX IF NOT EXISTS idx_material_cost_templates_grade ON material_cost_templates (material_grade);

-- ============================================================================
-- machine_rate_cards / Bang gia may
-- ============================================================================
CREATE TABLE IF NOT EXISTS machine_rate_cards (
    rate_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_type            VARCHAR(100)    NOT NULL,
    machine_category        VARCHAR(50),
    setup_rate_per_hour     NUMERIC(10,2)   NOT NULL,
    run_rate_per_hour       NUMERIC(10,2)   NOT NULL,
    overhead_rate_percent   NUMERIC(5,2)    DEFAULT 15,
    effective_from          DATE            NOT NULL,
    effective_to            DATE,
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (machine_type, effective_from)
);
COMMENT ON TABLE machine_rate_cards IS 'Machine hourly rate cards for cost estimation / Bang gia may theo gio cho uoc tinh chi phi';

CREATE INDEX IF NOT EXISTS idx_machine_rate_cards_type ON machine_rate_cards (machine_type);
CREATE INDEX IF NOT EXISTS idx_machine_rate_cards_effective ON machine_rate_cards (effective_from, effective_to);

-- ============================================================================
-- quote_history / Lich su bao gia
-- ============================================================================
CREATE TABLE IF NOT EXISTS quote_history (
    history_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id                UUID            NOT NULL REFERENCES quotes(quote_id),
    version                 INT,
    action                  VARCHAR(50),
    changed_by              UUID            REFERENCES users(user_id),
    changed_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    previous_values         JSONB,
    new_values              JSONB,
    reason                  TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb
);
COMMENT ON TABLE quote_history IS 'Quote revision and change history / Lich su chinh sua va thay doi bao gia';

CREATE INDEX IF NOT EXISTS idx_quote_history_quote ON quote_history (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_version ON quote_history (quote_id, version);
CREATE INDEX IF NOT EXISTS idx_quote_history_date ON quote_history (changed_at);

COMMIT;
