-- ============================================================================
-- Migration: 048_plm_change_control.sql
-- Description: Product lifecycle management tables for ECR/ECO, configuration,
--              requirements traceability, design reviews, and deviations.
-- Dependencies: 006_erp_master_data.sql, 003_document_management.sql,
--               011_quality.sql
-- Rollback: DROP TABLE plm_obsolescence_tracking, plm_deviation_permits,
--           plm_design_reviews, plm_test_results, plm_test_plans,
--           plm_requirement_traces, plm_requirements,
--           plm_product_configurations, plm_change_review_board,
--           plm_change_order_lines, plm_change_orders,
--           plm_change_requests CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS plm_change_requests (
    plm_change_request_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_number        VARCHAR(80)     NOT NULL UNIQUE,
    request_type                 VARCHAR(30)     NOT NULL
                                 CHECK (request_type IN ('ecr', 'customer_change', 'supplier_change', 'internal')),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    current_revision             VARCHAR(20),
    title                        VARCHAR(300)    NOT NULL,
    problem_statement            TEXT,
    proposed_solution            TEXT,
    impact_summary               TEXT,
    priority                     VARCHAR(20)     DEFAULT 'medium'
                                 CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'implemented')),
    requested_by                 UUID            REFERENCES users(user_id),
    requested_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    target_effective_date        DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_cr_item ON plm_change_requests (item_id);
CREATE INDEX IF NOT EXISTS idx_plm_cr_status ON plm_change_requests (status);

CREATE TABLE IF NOT EXISTS plm_change_orders (
    plm_change_order_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_order_number          VARCHAR(80)     NOT NULL UNIQUE,
    plm_change_request_id        UUID            REFERENCES plm_change_requests(plm_change_request_id),
    order_type                   VARCHAR(30)     NOT NULL
                                 CHECK (order_type IN ('eco', 'ecn', 'temporary_deviation', 'document_update')),
    title                        VARCHAR(300)    NOT NULL,
    effectivity_type             VARCHAR(30)     DEFAULT 'date'
                                 CHECK (effectivity_type IN ('date', 'serial', 'lot')),
    effective_from_date          DATE,
    effective_to_date            DATE,
    serial_effective_from        VARCHAR(100),
    serial_effective_to          VARCHAR(100),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'in_review', 'approved', 'released', 'closed', 'cancelled')),
    owner_id                     UUID            REFERENCES users(user_id),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    implementation_due_date      DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_co_status ON plm_change_orders (status);
CREATE INDEX IF NOT EXISTS idx_plm_co_request ON plm_change_orders (plm_change_request_id);

CREATE TABLE IF NOT EXISTS plm_change_order_lines (
    plm_change_order_line_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id          UUID            NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    affected_type                VARCHAR(20)     NOT NULL
                                 CHECK (affected_type IN ('item', 'bom', 'routing', 'document', 'inspection_plan')),
    affected_reference           VARCHAR(100)    NOT NULL,
    disposition                  VARCHAR(20)     NOT NULL DEFAULT 'revise'
                                 CHECK (disposition IN ('revise', 'replace', 'obsolete', 'reference_only')),
    from_revision                VARCHAR(20),
    to_revision                  VARCHAR(20),
    implementation_owner_id      UUID            REFERENCES users(user_id),
    implementation_status        VARCHAR(20)     DEFAULT 'open'
                                 CHECK (implementation_status IN ('open', 'in_progress', 'completed', 'waived')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (plm_change_order_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_plm_co_lines_ref ON plm_change_order_lines (affected_type, affected_reference);

CREATE TABLE IF NOT EXISTS plm_change_review_board (
    plm_change_review_board_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id          UUID            NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    reviewer_id                  UUID            NOT NULL REFERENCES users(user_id),
    board_role                   VARCHAR(50),
    vote_result                  VARCHAR(20)     DEFAULT 'pending'
                                 CHECK (vote_result IN ('pending', 'approved', 'approved_with_action', 'rejected')),
    vote_notes                   TEXT,
    voted_at                     TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (plm_change_order_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_plm_crb_vote ON plm_change_review_board (vote_result);

CREATE TABLE IF NOT EXISTS plm_product_configurations (
    plm_product_configuration_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    configuration_code           VARCHAR(80)     NOT NULL UNIQUE,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    configuration_status         VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (configuration_status IN ('draft', 'active', 'superseded', 'obsolete')),
    configuration_rules          JSONB           DEFAULT '{}'::jsonb,
    serial_effective_from        VARCHAR(100),
    serial_effective_to          VARCHAR(100),
    revision_code                VARCHAR(20),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_config_item ON plm_product_configurations (item_id);

CREATE TABLE IF NOT EXISTS plm_requirements (
    plm_requirement_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_code             VARCHAR(80)     NOT NULL UNIQUE,
    requirement_source           VARCHAR(30)     NOT NULL
                                 CHECK (requirement_source IN ('customer', 'regulatory', 'internal', 'industry')),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    title                        VARCHAR(300)    NOT NULL,
    requirement_text             TEXT            NOT NULL,
    verification_method          VARCHAR(50),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('draft', 'active', 'retired')),
    owner_id                     UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_requirements_item ON plm_requirements (item_id);

CREATE TABLE IF NOT EXISTS plm_requirement_traces (
    plm_requirement_trace_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_requirement_id           UUID            NOT NULL REFERENCES plm_requirements(plm_requirement_id) ON DELETE CASCADE,
    trace_type                   VARCHAR(20)     NOT NULL
                                 CHECK (trace_type IN ('design', 'test', 'inspection', 'evidence', 'document')),
    trace_reference              VARCHAR(100)    NOT NULL,
    trace_status                 VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (trace_status IN ('planned', 'in_progress', 'verified', 'failed')),
    evidence_doc_id              VARCHAR(30)     REFERENCES documents(doc_id),
    linked_record_id             VARCHAR(50)     REFERENCES records(record_id),
    verified_by                  UUID            REFERENCES users(user_id),
    verified_at                  TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_req_traces_req ON plm_requirement_traces (plm_requirement_id);

CREATE TABLE IF NOT EXISTS plm_test_plans (
    plm_test_plan_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_plan_number             VARCHAR(80)     NOT NULL UNIQUE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    plm_requirement_id           UUID            REFERENCES plm_requirements(plm_requirement_id),
    test_objective               VARCHAR(300)    NOT NULL,
    acceptance_criteria          TEXT,
    sample_size                  INT,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'approved', 'active', 'retired')),
    owner_id                     UUID            REFERENCES users(user_id),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_test_plans_item ON plm_test_plans (item_id);

CREATE TABLE IF NOT EXISTS plm_test_results (
    plm_test_result_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_test_plan_id             UUID            NOT NULL REFERENCES plm_test_plans(plm_test_plan_id) ON DELETE CASCADE,
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    executed_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    executed_by                  UUID            REFERENCES users(user_id),
    result_status                VARCHAR(20)     NOT NULL
                                 CHECK (result_status IN ('pass', 'fail', 'conditional', 'waived')),
    result_summary               TEXT,
    evidence_doc_id              VARCHAR(30)     REFERENCES documents(doc_id),
    ncr_id                       VARCHAR(50)     REFERENCES records(record_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_test_results_plan ON plm_test_results (plm_test_plan_id);
CREATE INDEX IF NOT EXISTS idx_plm_test_results_status ON plm_test_results (result_status);

CREATE TABLE IF NOT EXISTS plm_design_reviews (
    plm_design_review_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_number                VARCHAR(80)     NOT NULL UNIQUE,
    review_type                  VARCHAR(20)     NOT NULL
                                 CHECK (review_type IN ('pdr', 'cdr', 'trr', 'production_readiness')),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    review_date                  DATE            NOT NULL,
    chairperson_id               UUID            REFERENCES users(user_id),
    attendees                    JSONB           DEFAULT '[]'::jsonb,
    decision_result              VARCHAR(20)     DEFAULT 'pending'
                                 CHECK (decision_result IN ('pending', 'approved', 'approved_with_action', 'rejected')),
    action_item_summary          TEXT,
    evidence_doc_id              VARCHAR(30)     REFERENCES documents(doc_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_design_review_date ON plm_design_reviews (review_date);

CREATE TABLE IF NOT EXISTS plm_deviation_permits (
    plm_deviation_permit_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    deviation_number             VARCHAR(80)     NOT NULL UNIQUE,
    permit_type                  VARCHAR(20)     NOT NULL
                                 CHECK (permit_type IN ('deviation', 'concession', 'waiver')),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    affected_revision            VARCHAR(20),
    deviation_description        TEXT            NOT NULL,
    customer_approval_ref        VARCHAR(100),
    requested_by                 UUID            REFERENCES users(user_id),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    effective_from               DATE,
    effective_to                 DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'submitted', 'approved', 'expired', 'rejected')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plm_dev_item ON plm_deviation_permits (item_id);
CREATE INDEX IF NOT EXISTS idx_plm_dev_status ON plm_deviation_permits (status);

CREATE TABLE IF NOT EXISTS plm_obsolescence_tracking (
    plm_obsolescence_tracking_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    manufacturer_part_number     VARCHAR(100),
    lifecycle_status             VARCHAR(30)     NOT NULL
                                 CHECK (lifecycle_status IN ('active', 'nrnd', 'ltb', 'obsolete')),
    notice_date                  DATE,
    last_time_buy_date           DATE,
    approved_last_buy_qty        NUMERIC(14,2),
    approved_alternate_item_id   VARCHAR(50)     REFERENCES items(item_id),
    risk_level                   VARCHAR(20)     DEFAULT 'medium'
                                 CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    owner_id                     UUID            REFERENCES users(user_id),
    mitigation_plan              TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (item_id, manufacturer_part_number)
);
CREATE INDEX IF NOT EXISTS idx_plm_obsolete_status ON plm_obsolescence_tracking (lifecycle_status);

COMMIT;
