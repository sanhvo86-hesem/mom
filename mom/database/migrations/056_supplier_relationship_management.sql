-- ============================================================================
-- Migration: 056_supplier_relationship_management.sql
-- Description: Strategic sourcing and supplier collaboration expansion.
-- Dependencies: 008_vendors_purchasing.sql, 035_supplier_quality_management.sql
-- Rollback: DROP TABLE srm_vendor_managed_inventory, srm_supplier_ppap_packages,
--           srm_supplier_development_plans, srm_supplier_action_requests,
--           srm_supplier_portal_messages, srm_supplier_portal_users,
--           srm_supplier_risk_events, srm_supplier_capacity,
--           srm_supplier_capabilities, srm_bid_comparisons,
--           srm_sourcing_bids, srm_sourcing_events,
--           srm_supplier_contract_lines, srm_supplier_contracts CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS srm_supplier_contracts (
    srm_supplier_contract_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number              VARCHAR(80)     NOT NULL UNIQUE,
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    contract_type                VARCHAR(30)     NOT NULL
                                 CHECK (contract_type IN ('blanket', 'pricing', 'consignment', 'quality', 'nda')),
    start_date                   DATE,
    end_date                     DATE,
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    contract_value               NUMERIC(14,2),
    contract_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (contract_status IN ('draft', 'active', 'expired', 'terminated')),
    owner_id                     UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_contract_lines (
    srm_supplier_contract_line_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    srm_supplier_contract_id     UUID            NOT NULL REFERENCES srm_supplier_contracts(srm_supplier_contract_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    price                        NUMERIC(14,4),
    minimum_order_qty            NUMERIC(14,2),
    lead_time_days               INT,
    service_level_pct            NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (srm_supplier_contract_id, line_number)
);

CREATE TABLE IF NOT EXISTS srm_sourcing_events (
    srm_sourcing_event_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_number                 VARCHAR(80)     NOT NULL UNIQUE,
    event_type                   VARCHAR(20)     NOT NULL
                                 CHECK (event_type IN ('rfq', 'rfi', 'auction', 'rebid')),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    start_date                   DATE,
    close_date                   DATE,
    owner_id                     UUID            REFERENCES users(user_id),
    event_status                 VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (event_status IN ('draft', 'open', 'evaluating', 'awarded', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_sourcing_bids (
    srm_sourcing_bid_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    srm_sourcing_event_id        UUID            NOT NULL REFERENCES srm_sourcing_events(srm_sourcing_event_id) ON DELETE CASCADE,
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    quoted_price                 NUMERIC(14,4),
    quoted_lead_time_days        INT,
    quoted_moq                   NUMERIC(14,2),
    quality_score                NUMERIC(6,2),
    bid_status                   VARCHAR(20)     NOT NULL DEFAULT 'submitted'
                                 CHECK (bid_status IN ('submitted', 'shortlisted', 'awarded', 'rejected')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (srm_sourcing_event_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS srm_bid_comparisons (
    srm_bid_comparison_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    srm_sourcing_event_id        UUID            NOT NULL REFERENCES srm_sourcing_events(srm_sourcing_event_id) ON DELETE CASCADE,
    comparison_date              DATE            NOT NULL,
    weighted_score_model         JSONB           DEFAULT '{}'::jsonb,
    recommended_vendor_id        VARCHAR(50)     REFERENCES vendors(vendor_id),
    approved_by                  UUID            REFERENCES users(user_id),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_capabilities (
    srm_supplier_capability_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    process_code                 VARCHAR(80)     NOT NULL,
    capability_description       VARCHAR(300),
    nadcap_certified             BOOLEAN         NOT NULL DEFAULT FALSE,
    min_lot_size                 NUMERIC(14,2),
    max_lot_size                 NUMERIC(14,2),
    approved_flag                BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, process_code)
);

CREATE TABLE IF NOT EXISTS srm_supplier_capacity (
    srm_supplier_capacity_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    capacity_period              DATE            NOT NULL,
    process_code                 VARCHAR(80),
    available_hours              NUMERIC(12,2),
    committed_hours              NUMERIC(12,2),
    available_qty                NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, capacity_period, process_code)
);

CREATE TABLE IF NOT EXISTS srm_supplier_risk_events (
    srm_supplier_risk_event_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    risk_date                    DATE            NOT NULL,
    risk_type                    VARCHAR(30)     NOT NULL
                                 CHECK (risk_type IN ('quality', 'delivery', 'financial', 'compliance', 'capacity')),
    severity                     VARCHAR(20)     NOT NULL
                                 CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    risk_summary                 TEXT            NOT NULL,
    mitigation_plan              TEXT,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'mitigated', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_portal_users (
    srm_supplier_portal_user_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    login_email                  VARCHAR(200)    NOT NULL UNIQUE,
    full_name                    VARCHAR(200)    NOT NULL,
    access_role                  VARCHAR(30)     NOT NULL
                                 CHECK (access_role IN ('admin', 'quality', 'planning', 'shipping')),
    last_login_at                TIMESTAMPTZ,
    is_active                    BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_portal_messages (
    srm_supplier_portal_message_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    srm_supplier_portal_user_id  UUID            REFERENCES srm_supplier_portal_users(srm_supplier_portal_user_id),
    message_subject              VARCHAR(300)    NOT NULL,
    message_body                 TEXT            NOT NULL,
    direction                    VARCHAR(20)     NOT NULL
                                 CHECK (direction IN ('outbound', 'inbound')),
    message_status               VARCHAR(20)     NOT NULL DEFAULT 'sent'
                                 CHECK (message_status IN ('draft', 'sent', 'received', 'archived')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_action_requests (
    srm_supplier_action_request_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    request_number               VARCHAR(80)     NOT NULL UNIQUE,
    request_type                 VARCHAR(30)     NOT NULL
                                 CHECK (request_type IN ('scar', 'capacity_update', 'document_request', 'containment')),
    due_date                     DATE,
    owner_id                     UUID            REFERENCES users(user_id),
    request_status               VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (request_status IN ('open', 'responded', 'overdue', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_development_plans (
    srm_supplier_development_plan_id UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    plan_number                  VARCHAR(80)     NOT NULL UNIQUE,
    focus_area                   VARCHAR(100),
    start_date                   DATE,
    target_date                  DATE,
    owner_id                     UUID            REFERENCES users(user_id),
    plan_status                  VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (plan_status IN ('open', 'in_progress', 'completed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_supplier_ppap_packages (
    srm_supplier_ppap_package_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    package_number               VARCHAR(80)     NOT NULL UNIQUE,
    submission_level             VARCHAR(20)
                                 CHECK (submission_level IN ('level1', 'level2', 'level3', 'level4', 'level5')),
    submission_date              DATE,
    approval_status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                 CHECK (approval_status IN ('pending', 'approved', 'rejected', 'interim')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srm_vendor_managed_inventory (
    srm_vmi_id                   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    min_qty                      NUMERIC(14,2)   DEFAULT 0,
    max_qty                      NUMERIC(14,2)   DEFAULT 0,
    current_qty                  NUMERIC(14,2)   DEFAULT 0,
    replenishment_lead_time_days INT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, item_id, warehouse_id)
);

COMMIT;
