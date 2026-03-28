-- Migration: 015_finance.sql
-- Description: Finance tables - cost_elements, job_costing, gl_transactions, ap_ar_invoices
-- Dependencies: 006_erp_master_data.sql, 002_core_system.sql
-- Rollback: DROP TABLE ap_ar_invoices, gl_transactions, job_costing, cost_elements CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- cost_elements / Yeu to chi phi (32 vars from erp_costing)
-- ---------------------------------------------------------------------------
CREATE TABLE cost_elements (
    cost_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_element        VARCHAR(100)    NOT NULL,
    cost_type           cost_type_enum  NOT NULL DEFAULT 'standard',
    cost_method         cost_method_enum DEFAULT 'standard',
    cost_group          cost_group_enum,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    std_material_cost   NUMERIC(14,4),
    std_labor_cost      NUMERIC(14,4),
    std_overhead_cost   NUMERIC(14,4),
    std_subcontract_cost NUMERIC(14,4),
    std_burden_cost     NUMERIC(14,4),
    std_total_cost      NUMERIC(14,4),
    actual_material_cost NUMERIC(14,4),
    actual_labor_cost   NUMERIC(14,4),
    actual_overhead_cost NUMERIC(14,4),
    actual_subcontract_cost NUMERIC(14,4),
    actual_total_cost   NUMERIC(14,4),
    variance_material   NUMERIC(14,4),
    variance_labor      NUMERIC(14,4),
    variance_overhead   NUMERIC(14,4),
    variance_total      NUMERIC(14,4),
    variance_type       variance_type_enum,
    overhead_rate_labor_pct NUMERIC(6,2),
    overhead_rate_machine_pct NUMERIC(6,2),
    burden_rate         NUMERIC(10,2),
    scrap_allowance_pct NUMERIC(5,2),
    yield_adjustment    NUMERIC(10,4),
    cost_roll_date      DATE,
    frozen_cost_date    DATE,
    gl_account          VARCHAR(50),
    cost_center         VARCHAR(50),
    profit_center       VARCHAR(50),
    cost_revision       VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE cost_elements IS 'Cost element definitions. Maps 32 erp_costing variables. / Dinh nghia yeu to chi phi.';

-- ---------------------------------------------------------------------------
-- job_costing / Chi phi theo lenh san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE job_costing (
    job_cost_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number      VARCHAR(50)     NOT NULL,
    material_cost   NUMERIC(14,2)   DEFAULT 0,
    labor_cost      NUMERIC(14,2)   DEFAULT 0,
    overhead_cost   NUMERIC(14,2)   DEFAULT 0,
    subcontract_cost NUMERIC(14,2)  DEFAULT 0,
    outsource_cost  NUMERIC(14,2)   DEFAULT 0,
    total_cost      NUMERIC(14,2)   GENERATED ALWAYS AS
        (material_cost + labor_cost + overhead_cost + subcontract_cost + outsource_cost) STORED,
    snapshot_date   DATE            NOT NULL,
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE job_costing IS 'Job-level cost accumulation. Maps finance variables. / Tich luy chi phi theo lenh.';

-- ---------------------------------------------------------------------------
-- gl_transactions / Giao dich ke toan (27 vars from erp_gl_finance)
-- ---------------------------------------------------------------------------
CREATE TABLE gl_transactions (
    gl_txn_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    gl_account_number   VARCHAR(30)     NOT NULL,
    gl_account_name     VARCHAR(200),
    gl_account_type     gl_account_type,
    journal_entry_id    VARCHAR(50),
    posting_date        DATE            NOT NULL,
    fiscal_year         INT             NOT NULL,
    fiscal_period       INT             NOT NULL,
    debit_amount        NUMERIC(14,2)   DEFAULT 0,
    credit_amount       NUMERIC(14,2)   DEFAULT 0,
    currency_code       VARCHAR(3)      DEFAULT 'VND',
    cost_center         VARCHAR(50),
    profit_center       VARCHAR(50),
    project_id          VARCHAR(50),
    job_number          VARCHAR(50),
    department_id       dept_code,
    transaction_type    VARCHAR(50),
    reference_number    VARCHAR(100),
    batch_number        VARCHAR(50),
    posted_by           UUID            REFERENCES users(user_id),
    approved_by         UUID            REFERENCES users(user_id),
    intercompany_flag   BOOLEAN         NOT NULL DEFAULT FALSE,
    consolidation_code  VARCHAR(20),
    budget_code         VARCHAR(30),
    budget_amount       NUMERIC(14,2),
    actual_amount       NUMERIC(14,2),
    variance_amount     NUMERIC(14,2),
    encumbrance_amount  NUMERIC(14,2),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE gl_transactions IS 'GL journal entries. Maps 27 erp_gl_finance variables. / But toan ke toan.';

-- ---------------------------------------------------------------------------
-- ap_ar_invoices / Hoa don phai tra/phai thu (20 vars from erp_ap_ar)
-- ---------------------------------------------------------------------------
CREATE TABLE ap_ar_invoices (
    invoice_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number      VARCHAR(50)     NOT NULL,
    invoice_date        DATE            NOT NULL,
    invoice_type        invoice_type_enum NOT NULL DEFAULT 'standard',
    ledger_type         VARCHAR(2)      NOT NULL CHECK (ledger_type IN ('AP', 'AR')),
    vendor_or_customer_id VARCHAR(50)   NOT NULL,
    po_reference        VARCHAR(50),
    so_reference        VARCHAR(50),
    line_amount         NUMERIC(14,2)   NOT NULL,
    tax_amount          NUMERIC(12,2)   DEFAULT 0,
    total_amount        NUMERIC(14,2)   NOT NULL,
    currency_code       VARCHAR(3)      DEFAULT 'VND',
    payment_terms       VARCHAR(50),
    due_date            DATE,
    discount_date       DATE,
    discount_amount     NUMERIC(12,2),
    payment_status      payment_status_enum NOT NULL DEFAULT 'open',
    payment_date        DATE,
    payment_method      VARCHAR(50),
    payment_reference   VARCHAR(100),
    aging_bucket        aging_bucket_enum,
    three_way_match_status match_status_enum,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ap_ar_invoices IS 'AP/AR invoices. Maps 20 erp_ap_ar variables. / Hoa don phai tra/phai thu.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS ap_ar_invoices CASCADE;
-- DROP TABLE IF EXISTS gl_transactions CASCADE;
-- DROP TABLE IF EXISTS job_costing CASCADE;
-- DROP TABLE IF EXISTS cost_elements CASCADE;
