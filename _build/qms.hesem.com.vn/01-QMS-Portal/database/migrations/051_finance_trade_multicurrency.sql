-- ============================================================================
-- Migration: 051_finance_trade_multicurrency.sql
-- Description: Multi-currency, customs, and trade finance foundations.
-- Dependencies: 015_finance.sql, 007_customers_sales.sql, 008_vendors_purchasing.sql
-- Rollback: DROP TABLE fin_country_tax_profiles, fin_realized_fx_gains,
--           fin_lc_draw_requests, fin_letters_of_credit,
--           fin_customs_declarations, fin_customs_tariff_codes,
--           fin_withholding_tax_codes, fin_multi_book_ledgers,
--           fin_exchange_rates, fin_exchange_rate_types,
--           fin_currencies CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS fin_currencies (
    currency_code                CHAR(3)         PRIMARY KEY,
    currency_name                VARCHAR(100)    NOT NULL,
    symbol                       VARCHAR(10),
    decimal_places               INT             NOT NULL DEFAULT 2,
    is_functional_default        BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active                    BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_exchange_rate_types (
    fin_exchange_rate_type_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_type_code               VARCHAR(30)     NOT NULL UNIQUE,
    rate_type_name               VARCHAR(100)    NOT NULL,
    description                  TEXT,
    is_active                    BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_exchange_rates (
    fin_exchange_rate_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency_code           CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    to_currency_code             CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    fin_exchange_rate_type_id    UUID            NOT NULL REFERENCES fin_exchange_rate_types(fin_exchange_rate_type_id),
    effective_date               DATE            NOT NULL,
    exchange_rate                NUMERIC(18,8)   NOT NULL,
    inverse_rate                 NUMERIC(18,8),
    source_type                  VARCHAR(20)     NOT NULL DEFAULT 'manual'
                                 CHECK (source_type IN ('central_bank', 'manual', 'api', 'contract')),
    is_locked                    BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (from_currency_code, to_currency_code, fin_exchange_rate_type_id, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_fin_fx_effective ON fin_exchange_rates (effective_date DESC);

CREATE TABLE IF NOT EXISTS fin_multi_book_ledgers (
    fin_ledger_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_code                  VARCHAR(50)     NOT NULL UNIQUE,
    ledger_name                  VARCHAR(150)    NOT NULL,
    currency_code                CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    accounting_standard          VARCHAR(30)     NOT NULL
                                 CHECK (accounting_standard IN ('VAS', 'IFRS', 'US_GAAP', 'local_tax')),
    is_primary                   BOOLEAN         NOT NULL DEFAULT FALSE,
    consolidation_entity         VARCHAR(100),
    fiscal_year_start_month      INT             NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_withholding_tax_codes (
    fin_withholding_tax_code_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_code                     VARCHAR(50)     NOT NULL UNIQUE,
    country_code                 CHAR(2)         NOT NULL,
    vendor_type                  VARCHAR(30),
    tax_rate_pct                 NUMERIC(6,3)    NOT NULL DEFAULT 0,
    threshold_amount             NUMERIC(14,2),
    certificate_required         BOOLEAN         NOT NULL DEFAULT FALSE,
    effective_from               DATE,
    effective_to                 DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_wht_country ON fin_withholding_tax_codes (country_code, vendor_type);

CREATE TABLE IF NOT EXISTS fin_customs_tariff_codes (
    fin_customs_tariff_code_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    hs_code                      VARCHAR(20)     NOT NULL UNIQUE,
    description                  VARCHAR(300)    NOT NULL,
    country_code                 CHAR(2),
    import_duty_pct              NUMERIC(6,3),
    export_duty_pct              NUMERIC(6,3),
    vat_pct                      NUMERIC(6,3),
    excise_pct                   NUMERIC(6,3),
    eccn_code                    VARCHAR(20),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_customs_declarations (
    fin_customs_declaration_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    declaration_number           VARCHAR(80)     NOT NULL UNIQUE,
    declaration_direction        VARCHAR(20)     NOT NULL
                                 CHECK (declaration_direction IN ('import', 'export')),
    customs_office               VARCHAR(120),
    fin_customs_tariff_code_id   UUID            REFERENCES fin_customs_tariff_codes(fin_customs_tariff_code_id),
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    purchase_order_id            UUID            REFERENCES purchase_orders(po_id),
    origin_country               CHAR(2),
    destination_country          CHAR(2),
    declared_value               NUMERIC(14,2),
    duty_amount                  NUMERIC(14,2),
    vat_amount                   NUMERIC(14,2),
    broker_name                  VARCHAR(200),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'submitted', 'cleared', 'held', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_customs_status ON fin_customs_declarations (status);

CREATE TABLE IF NOT EXISTS fin_letters_of_credit (
    fin_letter_of_credit_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    lc_number                    VARCHAR(80)     NOT NULL UNIQUE,
    issuing_bank                 VARCHAR(200)    NOT NULL,
    advising_bank                VARCHAR(200),
    beneficiary_customer_id      VARCHAR(50)     REFERENCES customers(customer_id),
    beneficiary_vendor_id        VARCHAR(50)     REFERENCES vendors(vendor_id),
    currency_code                CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    lc_amount                    NUMERIC(14,2)   NOT NULL,
    expiry_date                  DATE,
    latest_ship_date             DATE,
    tolerance_pct                NUMERIC(6,3),
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'issued', 'amended', 'drawn', 'expired', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_lc_status ON fin_letters_of_credit (status);

CREATE TABLE IF NOT EXISTS fin_lc_draw_requests (
    fin_lc_draw_request_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fin_letter_of_credit_id      UUID            NOT NULL REFERENCES fin_letters_of_credit(fin_letter_of_credit_id) ON DELETE CASCADE,
    draw_number                  VARCHAR(80)     NOT NULL UNIQUE,
    request_date                 DATE            NOT NULL,
    requested_amount             NUMERIC(14,2)   NOT NULL,
    approved_amount              NUMERIC(14,2),
    document_set                 JSONB           DEFAULT '[]'::jsonb,
    requested_by                 UUID            REFERENCES users(user_id),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_lc_draw_status ON fin_lc_draw_requests (status);

CREATE TABLE IF NOT EXISTS fin_realized_fx_gains (
    fin_realized_fx_gain_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_date                 DATE            NOT NULL,
    source_document_type         VARCHAR(30)     NOT NULL
                                 CHECK (source_document_type IN ('invoice', 'receipt', 'payment', 'revaluation')),
    source_document_reference    VARCHAR(80)     NOT NULL,
    from_currency_code           CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    to_currency_code             CHAR(3)         NOT NULL REFERENCES fin_currencies(currency_code),
    booked_rate                  NUMERIC(18,8),
    settled_rate                 NUMERIC(18,8),
    gain_loss_amount             NUMERIC(14,2)   NOT NULL,
    fin_ledger_id                UUID            REFERENCES fin_multi_book_ledgers(fin_ledger_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_fx_gain_posting ON fin_realized_fx_gains (posting_date DESC);

CREATE TABLE IF NOT EXISTS fin_country_tax_profiles (
    fin_country_tax_profile_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code                 CHAR(2)         NOT NULL UNIQUE,
    default_currency_code        CHAR(3)         REFERENCES fin_currencies(currency_code),
    vat_rate_pct                 NUMERIC(6,3),
    withholding_default_pct      NUMERIC(6,3),
    corporate_tax_pct            NUMERIC(6,3),
    filing_frequency             VARCHAR(20)
                                 CHECK (filing_frequency IN ('monthly', 'quarterly', 'annual')),
    registration_threshold       NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
