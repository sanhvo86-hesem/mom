-- ============================================================================
-- Migration 032: Order Management World-Class Foundations
-- Commercial-to-Execution orchestration for ERP + MES + eQMS alignment
-- ============================================================================

BEGIN;

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS default_incoterm_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS default_payment_term_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS default_shipping_method_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS default_promise_policy_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS export_control_profile VARCHAR(50),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS order_class VARCHAR(30) DEFAULT 'make_to_order',
    ADD COLUMN IF NOT EXISTS customer_site_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ship_to_site_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS requested_date DATE,
    ADD COLUMN IF NOT EXISTS promise_date DATE,
    ADD COLUMN IF NOT EXISTS internal_commit_date DATE,
    ADD COLUMN IF NOT EXISTS incoterm_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_term_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS shipping_method_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contract_review_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) DEFAULT 'planning',
    ADD COLUMN IF NOT EXISTS credit_hold_flag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS engineering_hold_flag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS quality_hold_flag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shipping_hold_flag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS export_control_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS certificate_of_conformance_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS certificate_of_analysis_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS packing_spec_code VARCHAR(80),
    ADD COLUMN IF NOT EXISTS label_spec_code VARCHAR(80);

ALTER TABLE sales_order_lines
    ADD COLUMN IF NOT EXISTS part_revision VARCHAR(30),
    ADD COLUMN IF NOT EXISTS job_strategy VARCHAR(30) DEFAULT 'mto',
    ADD COLUMN IF NOT EXISTS routing_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS bom_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS control_plan_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS inspection_plan_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS traveler_template_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS outside_processing_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE job_orders
    ADD COLUMN IF NOT EXISTS release_target_date DATE,
    ADD COLUMN IF NOT EXISTS promise_date DATE,
    ADD COLUMN IF NOT EXISTS bom_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS control_plan_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS inspection_plan_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS traveler_template_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS engineering_release_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS material_readiness_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS quality_plan_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS source_inspection_status VARCHAR(30) DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS outside_processing_status VARCHAR(30) DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS launch_readiness_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS traceability_profile_code VARCHAR(50);

ALTER TABLE job_operations
    ADD COLUMN IF NOT EXISTS dispatch_priority VARCHAR(20) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS quality_gate_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS first_piece_status VARCHAR(30) DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS handover_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS serial_lot_trace_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS connector_last_heartbeat_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS customer_sites (
    site_id                   VARCHAR(50) PRIMARY KEY,
    customer_id               VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    site_name                 VARCHAR(255) NOT NULL,
    country_code              VARCHAR(10),
    default_incoterm_code     VARCHAR(20),
    default_payment_term_code VARCHAR(30),
    default_shipping_method_code VARCHAR(50),
    certificate_of_conformance_required BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_of_analysis_required BOOLEAN NOT NULL DEFAULT FALSE,
    export_control_required   BOOLEAN NOT NULL DEFAULT FALSE,
    packing_spec_code         VARCHAR(80),
    label_spec_code           VARCHAR(80),
    site_status               VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_sites_customer ON customer_sites (customer_id, site_status);

CREATE TABLE IF NOT EXISTS commercial_accounts (
    account_id                VARCHAR(60) PRIMARY KEY,
    customer_id               VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    account_owner             VARCHAR(80),
    order_coordinator_role    VARCHAR(80),
    promise_policy_code       VARCHAR(50),
    currency_code             VARCHAR(10),
    account_status            VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_customer ON commercial_accounts (customer_id, account_status);

CREATE TABLE IF NOT EXISTS order_holds (
    hold_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type                VARCHAR(10) NOT NULL,
    order_number              VARCHAR(80) NOT NULL,
    hold_category             VARCHAR(40) NOT NULL,
    hold_reason               TEXT,
    owner_role                VARCHAR(80),
    hold_status               VARCHAR(30) NOT NULL DEFAULT 'open',
    opened_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at               TIMESTAMPTZ,
    metadata                  JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_order_holds_order ON order_holds (order_type, order_number, hold_status);

CREATE TABLE IF NOT EXISTS order_milestones (
    milestone_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type                VARCHAR(10) NOT NULL,
    order_number              VARCHAR(80) NOT NULL,
    milestone_code            VARCHAR(50) NOT NULL,
    milestone_title           VARCHAR(255) NOT NULL,
    milestone_sequence        INT NOT NULL DEFAULT 10,
    planned_at                TIMESTAMPTZ,
    actual_at                 TIMESTAMPTZ,
    milestone_status          VARCHAR(30) NOT NULL DEFAULT 'planned',
    owner_role                VARCHAR(80),
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_milestones_order ON order_milestones (order_type, order_number, milestone_sequence);

CREATE TABLE IF NOT EXISTS order_document_requirements (
    doc_requirement_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id            UUID REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    order_type                VARCHAR(10) NOT NULL,
    order_number              VARCHAR(80) NOT NULL,
    requirement_code          VARCHAR(50) NOT NULL,
    requirement_title         VARCHAR(255) NOT NULL,
    required_flag             BOOLEAN NOT NULL DEFAULT TRUE,
    requirement_status        VARCHAR(30) NOT NULL DEFAULT 'pending',
    owner_role                VARCHAR(80),
    due_at                    TIMESTAMPTZ,
    completed_at              TIMESTAMPTZ,
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_doc_requirements_order ON order_document_requirements (order_type, order_number, requirement_status);

CREATE TABLE IF NOT EXISTS job_release_gates (
    gate_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_order_id              UUID REFERENCES job_orders(job_order_id) ON DELETE CASCADE,
    work_order_number         VARCHAR(80),
    gate_code                 VARCHAR(50) NOT NULL,
    gate_title                VARCHAR(255) NOT NULL,
    gate_status               VARCHAR(30) NOT NULL DEFAULT 'pending',
    blocker_flag              BOOLEAN NOT NULL DEFAULT FALSE,
    governed_by_role          VARCHAR(80),
    due_at                    TIMESTAMPTZ,
    completed_at              TIMESTAMPTZ,
    evidence_record_id        VARCHAR(80),
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_release_gates_job ON job_release_gates (job_order_id, gate_status);

CREATE TABLE IF NOT EXISTS outside_processing_orders (
    osp_order_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id            UUID REFERENCES sales_orders(sales_order_id),
    job_order_id              UUID REFERENCES job_orders(job_order_id),
    supplier_id               VARCHAR(50),
    special_process_code      VARCHAR(80) NOT NULL,
    send_qty                  NUMERIC(12,2),
    return_qty                NUMERIC(12,2),
    promised_back_date        DATE,
    actual_back_date          DATE,
    cert_requirement_status   VARCHAR(30) DEFAULT 'pending',
    osp_status                VARCHAR(30) NOT NULL DEFAULT 'planned',
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_osp_job_status ON outside_processing_orders (job_order_id, osp_status);

CREATE TABLE IF NOT EXISTS shipment_releases (
    shipment_release_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id            UUID NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    release_number            VARCHAR(50) NOT NULL,
    ship_to_site_code         VARCHAR(50),
    warehouse_id              VARCHAR(50),
    shipping_method_code      VARCHAR(50),
    incoterm_code             VARCHAR(20),
    planned_ship_date         DATE,
    actual_ship_date          DATE,
    packlist_status           VARCHAR(30) DEFAULT 'pending',
    coc_status                VARCHAR(30) DEFAULT 'pending',
    coa_status                VARCHAR(30) DEFAULT 'pending',
    customs_status            VARCHAR(30) DEFAULT 'not_required',
    shipment_status           VARCHAR(30) NOT NULL DEFAULT 'planning',
    tracking_number           VARCHAR(100),
    metadata                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sales_order_id, release_number)
);
CREATE INDEX IF NOT EXISTS idx_shipment_releases_so_status ON shipment_releases (sales_order_id, shipment_status);

CREATE TABLE IF NOT EXISTS order_collaboration_events (
    event_id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type                VARCHAR(10) NOT NULL,
    order_number              VARCHAR(80) NOT NULL,
    lane_code                 VARCHAR(40) NOT NULL,
    event_code                VARCHAR(50) NOT NULL,
    event_status              VARCHAR(30) NOT NULL DEFAULT 'open',
    owner_role                VARCHAR(80),
    source_system             VARCHAR(40) DEFAULT 'QMS',
    happened_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at                    TIMESTAMPTZ,
    payload                   JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_collaboration_events_order ON order_collaboration_events (order_type, order_number, event_status);

COMMIT;
