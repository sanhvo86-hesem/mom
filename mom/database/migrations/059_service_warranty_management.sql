-- ============================================================================
-- Migration: 059_service_warranty_management.sql
-- Description: Installed base, service contracts, warranty, and service execution.
-- Dependencies: 007_customers_sales.sql, 017_subcontracting_rma.sql
-- Rollback: DROP TABLE svc_service_kpi_snapshots, svc_customer_assets,
--           svc_field_visit_reports, svc_service_parts,
--           svc_service_work_order_lines, svc_service_work_orders,
--           svc_service_requests, svc_return_authorizations,
--           svc_warranty_claims, svc_contract_lines,
--           svc_service_contracts, svc_installed_base CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS svc_installed_base (
    svc_installed_base_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    installed_base_number        VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    installation_date            DATE,
    install_location             VARCHAR(200),
    lifecycle_status             VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (lifecycle_status IN ('active', 'inactive', 'retired')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_service_contracts (
    svc_service_contract_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number              VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    start_date                   DATE,
    end_date                     DATE,
    service_level                VARCHAR(50),
    annual_value                 NUMERIC(14,2),
    contract_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (contract_status IN ('draft', 'active', 'expired', 'terminated')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_contract_lines (
    svc_contract_line_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    svc_service_contract_id      UUID            NOT NULL REFERENCES svc_service_contracts(svc_service_contract_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    svc_installed_base_id        UUID            REFERENCES svc_installed_base(svc_installed_base_id),
    coverage_type                VARCHAR(30)     NOT NULL
                                 CHECK (coverage_type IN ('parts', 'labor', 'onsite', 'preventive')),
    response_time_hours          NUMERIC(10,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (svc_service_contract_id, line_number)
);

CREATE TABLE IF NOT EXISTS svc_warranty_claims (
    svc_warranty_claim_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number                 VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    svc_installed_base_id        UUID            REFERENCES svc_installed_base(svc_installed_base_id),
    claim_date                   DATE            NOT NULL,
    claim_amount                 NUMERIC(14,2),
    failure_summary              TEXT,
    claim_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (claim_status IN ('open', 'approved', 'rejected', 'settled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_return_authorizations (
    svc_return_authorization_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    authorization_number         VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    rma_id                       UUID            REFERENCES rma_orders(rma_id),
    reason_code                  VARCHAR(50),
    authorization_date           DATE,
    authorization_status         VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (authorization_status IN ('open', 'received', 'closed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_service_requests (
    svc_service_request_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number               VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    svc_installed_base_id        UUID            REFERENCES svc_installed_base(svc_installed_base_id),
    request_type                 VARCHAR(30)     NOT NULL
                                 CHECK (request_type IN ('repair', 'maintenance', 'calibration', 'support')),
    request_date                 DATE            NOT NULL,
    requested_start_date         DATE,
    request_status               VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (request_status IN ('open', 'scheduled', 'in_progress', 'closed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_service_work_orders (
    svc_service_work_order_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_work_order_number    VARCHAR(80)     NOT NULL UNIQUE,
    svc_service_request_id       UUID            REFERENCES svc_service_requests(svc_service_request_id),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    assigned_to                  UUID            REFERENCES users(user_id),
    planned_start                TIMESTAMPTZ,
    planned_end                  TIMESTAMPTZ,
    actual_start                 TIMESTAMPTZ,
    actual_end                   TIMESTAMPTZ,
    work_order_status            VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (work_order_status IN ('planned', 'released', 'in_progress', 'completed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_service_work_order_lines (
    svc_service_work_order_line_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    svc_service_work_order_id    UUID            NOT NULL REFERENCES svc_service_work_orders(svc_service_work_order_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    line_type                    VARCHAR(20)     NOT NULL
                                 CHECK (line_type IN ('labor', 'part', 'travel', 'diagnostic')),
    description                  VARCHAR(300),
    quantity                     NUMERIC(14,2)   DEFAULT 0,
    unit_cost                    NUMERIC(14,4),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (svc_service_work_order_id, line_number)
);

CREATE TABLE IF NOT EXISTS svc_service_parts (
    svc_service_part_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    svc_service_work_order_id    UUID            NOT NULL REFERENCES svc_service_work_orders(svc_service_work_order_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    quantity_issued              NUMERIC(14,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_field_visit_reports (
    svc_field_visit_report_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    svc_service_work_order_id    UUID            NOT NULL REFERENCES svc_service_work_orders(svc_service_work_order_id) ON DELETE CASCADE,
    visit_date                   DATE            NOT NULL,
    service_engineer_id          UUID            REFERENCES users(user_id),
    findings_summary             TEXT,
    customer_signoff_name        VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_customer_assets (
    svc_customer_asset_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                  VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    asset_tag                    VARCHAR(80)     NOT NULL UNIQUE,
    asset_description            VARCHAR(300),
    serial_number                VARCHAR(100),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive', 'retired')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS svc_service_kpi_snapshots (
    svc_service_kpi_snapshot_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_period              DATE            NOT NULL,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    response_time_hours          NUMERIC(12,2),
    first_time_fix_pct           NUMERIC(6,2),
    warranty_cost                NUMERIC(14,2),
    open_service_request_count   INT             DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (snapshot_period, customer_id)
);

COMMIT;
