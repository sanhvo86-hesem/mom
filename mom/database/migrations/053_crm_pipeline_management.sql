-- ============================================================================
-- Migration: 053_crm_pipeline_management.sql
-- Description: CRM account, lead, opportunity, and forecast expansion.
-- Dependencies: 007_customers_sales.sql, 036_quoting_estimation.sql
-- Rollback: DROP TABLE crm_forecasts, crm_customer_touchpoints,
--           crm_quotes_pipeline, crm_campaigns, crm_activities,
--           crm_opportunity_lines, crm_opportunities, crm_leads,
--           crm_contacts, crm_accounts CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS crm_accounts (
    crm_account_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    account_number               VARCHAR(80)     NOT NULL UNIQUE,
    account_name                 VARCHAR(200)    NOT NULL,
    account_type                 VARCHAR(20)     NOT NULL DEFAULT 'customer'
                                 CHECK (account_type IN ('customer', 'prospect', 'partner', 'distributor')),
    industry_segment             VARCHAR(100),
    territory_code               VARCHAR(50),
    owner_id                     UUID            REFERENCES users(user_id),
    account_status               VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (account_status IN ('active', 'inactive', 'prospect')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_accounts (account_status);

CREATE TABLE IF NOT EXISTS crm_contacts (
    crm_contact_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_account_id               UUID            NOT NULL REFERENCES crm_accounts(crm_account_id) ON DELETE CASCADE,
    contact_name                 VARCHAR(200)    NOT NULL,
    job_title                    VARCHAR(150),
    email                        VARCHAR(200),
    phone                        VARCHAR(50),
    mobile                       VARCHAR(50),
    contact_role                 VARCHAR(50),
    is_primary                   BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts (crm_account_id);

CREATE TABLE IF NOT EXISTS crm_leads (
    crm_lead_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_number                  VARCHAR(80)     NOT NULL UNIQUE,
    lead_source                  VARCHAR(30)     NOT NULL
                                 CHECK (lead_source IN ('website', 'referral', 'trade_show', 'customer', 'campaign')),
    company_name                 VARCHAR(200)    NOT NULL,
    contact_name                 VARCHAR(200),
    email                        VARCHAR(200),
    phone                        VARCHAR(50),
    estimated_annual_value       NUMERIC(14,2),
    owner_id                     UUID            REFERENCES users(user_id),
    lead_status                  VARCHAR(20)     NOT NULL DEFAULT 'new'
                                 CHECK (lead_status IN ('new', 'qualified', 'disqualified', 'converted')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads (lead_status);

CREATE TABLE IF NOT EXISTS crm_opportunities (
    crm_opportunity_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_number           VARCHAR(80)     NOT NULL UNIQUE,
    crm_account_id               UUID            REFERENCES crm_accounts(crm_account_id),
    crm_lead_id                  UUID            REFERENCES crm_leads(crm_lead_id),
    opportunity_name             VARCHAR(300)    NOT NULL,
    stage_code                   VARCHAR(30)     NOT NULL
                                 CHECK (stage_code IN ('identify', 'qualify', 'quote', 'negotiate', 'award', 'lost')),
    close_probability_pct        NUMERIC(6,2),
    expected_close_date          DATE,
    estimated_value              NUMERIC(14,2),
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    owner_id                     UUID            REFERENCES users(user_id),
    loss_reason                  VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage ON crm_opportunities (stage_code);

CREATE TABLE IF NOT EXISTS crm_opportunity_lines (
    crm_opportunity_line_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_opportunity_id           UUID            NOT NULL REFERENCES crm_opportunities(crm_opportunity_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    description                  VARCHAR(300),
    annual_volume_estimate       NUMERIC(14,2),
    unit_price_target            NUMERIC(14,4),
    awarded_quote_id             UUID            REFERENCES quotes(quote_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (crm_opportunity_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_crm_opp_line_item ON crm_opportunity_lines (item_id);

CREATE TABLE IF NOT EXISTS crm_activities (
    crm_activity_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_account_id               UUID            REFERENCES crm_accounts(crm_account_id),
    crm_contact_id               UUID            REFERENCES crm_contacts(crm_contact_id),
    crm_opportunity_id           UUID            REFERENCES crm_opportunities(crm_opportunity_id),
    activity_type                VARCHAR(20)     NOT NULL
                                 CHECK (activity_type IN ('call', 'meeting', 'email', 'visit', 'task')),
    subject                      VARCHAR(300)    NOT NULL,
    scheduled_at                 TIMESTAMPTZ,
    completed_at                 TIMESTAMPTZ,
    owner_id                     UUID            REFERENCES users(user_id),
    activity_status              VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (activity_status IN ('open', 'completed', 'cancelled')),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_activity_owner ON crm_activities (owner_id);

CREATE TABLE IF NOT EXISTS crm_campaigns (
    crm_campaign_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code                VARCHAR(80)     NOT NULL UNIQUE,
    campaign_name                VARCHAR(200)    NOT NULL,
    campaign_type                VARCHAR(30)     NOT NULL
                                 CHECK (campaign_type IN ('email', 'trade_show', 'customer_visit', 'digital', 'partner')),
    start_date                   DATE,
    end_date                     DATE,
    budget_amount                NUMERIC(14,2),
    owner_id                     UUID            REFERENCES users(user_id),
    campaign_status              VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (campaign_status IN ('planned', 'active', 'completed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_status ON crm_campaigns (campaign_status);

CREATE TABLE IF NOT EXISTS crm_quotes_pipeline (
    crm_quote_pipeline_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_opportunity_id           UUID            NOT NULL REFERENCES crm_opportunities(crm_opportunity_id) ON DELETE CASCADE,
    quote_id                     UUID            REFERENCES quotes(quote_id),
    quote_version                INT             DEFAULT 1,
    submission_date              DATE,
    submitted_value              NUMERIC(14,2),
    commercial_status            VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (commercial_status IN ('draft', 'submitted', 'revised', 'won', 'lost')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_pipeline_status ON crm_quotes_pipeline (commercial_status);

CREATE TABLE IF NOT EXISTS crm_customer_touchpoints (
    crm_customer_touchpoint_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_account_id               UUID            NOT NULL REFERENCES crm_accounts(crm_account_id) ON DELETE CASCADE,
    touchpoint_date              DATE            NOT NULL,
    touchpoint_channel           VARCHAR(20)     NOT NULL
                                 CHECK (touchpoint_channel IN ('call', 'meeting', 'email', 'visit', 'support')),
    sentiment_score              NUMERIC(6,2),
    next_action                  VARCHAR(300),
    owner_id                     UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_touchpoint_date ON crm_customer_touchpoints (touchpoint_date);

CREATE TABLE IF NOT EXISTS crm_forecasts (
    crm_forecast_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    forecast_period              DATE            NOT NULL,
    owner_id                     UUID            REFERENCES users(user_id),
    crm_account_id               UUID            REFERENCES crm_accounts(crm_account_id),
    committed_value              NUMERIC(14,2)   DEFAULT 0,
    best_case_value              NUMERIC(14,2)   DEFAULT 0,
    pipeline_value               NUMERIC(14,2)   DEFAULT 0,
    forecast_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (forecast_status IN ('draft', 'submitted', 'approved')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (forecast_period, owner_id, crm_account_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_forecast_status ON crm_forecasts (forecast_status);

COMMIT;
