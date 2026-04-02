-- ============================================================================
-- Migration: 065_commercial_contract_pricing.sql
-- Description: Contracts, pricing, rebates, and commercial policy controls.
-- Dependencies: 007_customers_sales.sql, 036_quoting_estimation.sql
-- Rollback: DROP TABLE com_contract_amendments, com_order_promises,
--           com_customer_scorecards, com_credit_profiles,
--           com_payment_terms_profiles, com_incoterms_profiles,
--           com_rebate_accruals, com_rebate_programs,
--           com_price_list_lines, com_price_lists,
--           com_contract_lines, com_contracts CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS com_contracts (
    com_contract_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number              VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    contract_type                VARCHAR(30)     NOT NULL
                                 CHECK (contract_type IN ('master', 'price_agreement', 'ltc', 'nda')),
    start_date                   DATE,
    end_date                     DATE,
    contract_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (contract_status IN ('draft', 'active', 'expired', 'terminated')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_contract_lines (
    com_contract_line_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    com_contract_id              UUID            NOT NULL REFERENCES com_contracts(com_contract_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    committed_qty                NUMERIC(14,2),
    agreed_price                 NUMERIC(14,4),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (com_contract_id, line_number)
);

CREATE TABLE IF NOT EXISTS com_price_lists (
    com_price_list_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_code              VARCHAR(50)     NOT NULL UNIQUE,
    price_list_name              VARCHAR(200)    NOT NULL,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    effective_from               DATE,
    effective_to                 DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_price_list_lines (
    com_price_list_line_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    com_price_list_id            UUID            NOT NULL REFERENCES com_price_lists(com_price_list_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    min_qty                      NUMERIC(14,2),
    unit_price                   NUMERIC(14,4),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_rebate_programs (
    com_rebate_program_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rebate_code                  VARCHAR(50)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    rebate_type                  VARCHAR(20)     NOT NULL
                                 CHECK (rebate_type IN ('volume', 'growth', 'annual')),
    rebate_rate_pct              NUMERIC(6,3),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_rebate_accruals (
    com_rebate_accrual_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    com_rebate_program_id        UUID            NOT NULL REFERENCES com_rebate_programs(com_rebate_program_id) ON DELETE CASCADE,
    accrual_period               DATE            NOT NULL,
    accrual_amount               NUMERIC(14,2)   NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (com_rebate_program_id, accrual_period)
);

CREATE TABLE IF NOT EXISTS com_incoterms_profiles (
    com_incoterm_profile_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    incoterm_code                VARCHAR(10)     NOT NULL UNIQUE,
    responsibility_summary       VARCHAR(300),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_payment_terms_profiles (
    com_payment_term_profile_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_term_code            VARCHAR(50)     NOT NULL UNIQUE,
    days_due                     INT,
    discount_days                INT,
    discount_pct                 NUMERIC(6,3),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_credit_profiles (
    com_credit_profile_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                  VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    credit_limit                 NUMERIC(14,2),
    credit_status                VARCHAR(20)     NOT NULL DEFAULT 'approved'
                                 CHECK (credit_status IN ('approved', 'hold', 'review')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (customer_id)
);

CREATE TABLE IF NOT EXISTS com_customer_scorecards (
    com_customer_scorecard_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    scorecard_period             DATE            NOT NULL,
    revenue_amount               NUMERIC(14,2),
    margin_pct                   NUMERIC(6,2),
    on_time_payment_pct          NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (customer_id, scorecard_period)
);

CREATE TABLE IF NOT EXISTS com_order_promises (
    com_order_promise_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    promise_date                 DATE,
    promised_by                  UUID            REFERENCES users(user_id),
    promise_status               VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (promise_status IN ('open', 'met', 'missed', 'revised')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_contract_amendments (
    com_contract_amendment_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    com_contract_id              UUID            NOT NULL REFERENCES com_contracts(com_contract_id) ON DELETE CASCADE,
    amendment_number             VARCHAR(80)     NOT NULL UNIQUE,
    amendment_date               DATE,
    amendment_summary            TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
