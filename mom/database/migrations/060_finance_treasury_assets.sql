-- ============================================================================
-- Migration: 060_finance_treasury_assets.sql
-- Description: Advanced finance covering costing, budget, treasury, and assets.
-- Dependencies: 015_finance.sql, 051_finance_trade_multicurrency.sql
-- Rollback: DROP TABLE fin_revenue_schedules, fin_tax_jurisdictions,
--           fin_intercompany_pairs, fin_bank_reconciliations,
--           fin_cash_transactions, fin_cash_accounts,
--           fin_asset_depreciation, fin_fixed_assets,
--           fin_budget_lines, fin_budget_versions,
--           fin_standard_cost_rollups, fin_cost_versions CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS fin_cost_versions (
    fin_cost_version_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_code                 VARCHAR(50)     NOT NULL UNIQUE,
    version_name                 VARCHAR(150)    NOT NULL,
    effective_date               DATE,
    is_frozen                    BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_standard_cost_rollups (
    fin_standard_cost_rollup_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_cost_version_id          UUID            NOT NULL REFERENCES fin_cost_versions(fin_cost_version_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    material_cost                NUMERIC(14,2)   DEFAULT 0,
    labor_cost                   NUMERIC(14,2)   DEFAULT 0,
    overhead_cost                NUMERIC(14,2)   DEFAULT 0,
    subcontract_cost             NUMERIC(14,2)   DEFAULT 0,
    total_standard_cost          NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (fin_cost_version_id, item_id)
);

CREATE TABLE IF NOT EXISTS fin_budget_versions (
    fin_budget_version_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_code                  VARCHAR(50)     NOT NULL UNIQUE,
    budget_year                  INT             NOT NULL,
    version_name                 VARCHAR(150),
    fin_ledger_id                UUID            REFERENCES fin_multi_book_ledgers(fin_ledger_id),
    budget_status                VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (budget_status IN ('draft', 'approved', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_budget_lines (
    fin_budget_line_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_budget_version_id        UUID            NOT NULL REFERENCES fin_budget_versions(fin_budget_version_id) ON DELETE CASCADE,
    account_code                 VARCHAR(50)     NOT NULL,
    cost_center                  VARCHAR(50),
    budget_period                DATE            NOT NULL,
    budget_amount                NUMERIC(14,2)   NOT NULL,
    actual_amount                NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_fixed_assets (
    fin_fixed_asset_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_number                 VARCHAR(80)     NOT NULL UNIQUE,
    asset_description            VARCHAR(300)    NOT NULL,
    asset_class                  VARCHAR(50),
    acquisition_date             DATE,
    acquisition_cost             NUMERIC(14,2),
    useful_life_months           INT,
    salvage_value                NUMERIC(14,2),
    currency_code                CHAR(3)         REFERENCES fin_currencies(currency_code),
    asset_status                 VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (asset_status IN ('active', 'disposed', 'construction_in_progress')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_asset_depreciation (
    fin_asset_depreciation_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_fixed_asset_id           UUID            NOT NULL REFERENCES fin_fixed_assets(fin_fixed_asset_id) ON DELETE CASCADE,
    depreciation_period          DATE            NOT NULL,
    depreciation_amount          NUMERIC(14,2)   NOT NULL,
    accumulated_depreciation     NUMERIC(14,2)   DEFAULT 0,
    nbv_amount                   NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (fin_fixed_asset_id, depreciation_period)
);

CREATE TABLE IF NOT EXISTS fin_cash_accounts (
    fin_cash_account_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code                 VARCHAR(50)     NOT NULL UNIQUE,
    bank_name                    VARCHAR(200),
    account_number               VARCHAR(100),
    currency_code                CHAR(3)         REFERENCES fin_currencies(currency_code),
    current_balance              NUMERIC(14,2)   DEFAULT 0,
    account_status               VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (account_status IN ('active', 'inactive', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_cash_transactions (
    fin_cash_transaction_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_cash_account_id          UUID            NOT NULL REFERENCES fin_cash_accounts(fin_cash_account_id) ON DELETE CASCADE,
    transaction_date             DATE            NOT NULL,
    transaction_type             VARCHAR(20)     NOT NULL
                                 CHECK (transaction_type IN ('receipt', 'payment', 'transfer', 'fee', 'interest')),
    amount                       NUMERIC(14,2)   NOT NULL,
    source_reference             VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_bank_reconciliations (
    fin_bank_reconciliation_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_cash_account_id          UUID            NOT NULL REFERENCES fin_cash_accounts(fin_cash_account_id) ON DELETE CASCADE,
    reconciliation_period        DATE            NOT NULL,
    statement_balance            NUMERIC(14,2),
    book_balance                 NUMERIC(14,2),
    unreconciled_amount          NUMERIC(14,2),
    reconciliation_status        VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (reconciliation_status IN ('open', 'reconciled', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (fin_cash_account_id, reconciliation_period)
);

CREATE TABLE IF NOT EXISTS fin_intercompany_pairs (
    fin_intercompany_pair_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_entity_code           VARCHAR(50)     NOT NULL,
    buyer_entity_code            VARCHAR(50)     NOT NULL,
    fin_ledger_id                UUID            REFERENCES fin_multi_book_ledgers(fin_ledger_id),
    settlement_currency          CHAR(3)         REFERENCES fin_currencies(currency_code),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (seller_entity_code, buyer_entity_code)
);

CREATE TABLE IF NOT EXISTS fin_tax_jurisdictions (
    fin_tax_jurisdiction_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_code            VARCHAR(50)     NOT NULL UNIQUE,
    country_code                 CHAR(2)         NOT NULL,
    jurisdiction_name            VARCHAR(200)    NOT NULL,
    tax_type                     VARCHAR(30)     NOT NULL
                                 CHECK (tax_type IN ('vat', 'sales_tax', 'withholding', 'income_tax')),
    default_rate_pct             NUMERIC(6,3),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_revenue_schedules (
    fin_revenue_schedule_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_number              VARCHAR(80)     NOT NULL UNIQUE,
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    recognition_start_date       DATE,
    recognition_end_date         DATE,
    deferred_amount              NUMERIC(14,2),
    recognized_amount            NUMERIC(14,2)   DEFAULT 0,
    schedule_status              VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (schedule_status IN ('open', 'partially_recognized', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
