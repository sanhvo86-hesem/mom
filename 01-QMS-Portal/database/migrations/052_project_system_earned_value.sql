-- ============================================================================
-- Migration: 052_project_system_earned_value.sql
-- Description: Extended project system with WBS, EVM, and milestone billing.
-- Dependencies: 018_projects_kpi.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE prj_billing_milestones, prj_change_requests,
--           prj_risk_register, prj_earned_value_snapshots,
--           prj_cost_collections, prj_time_entries,
--           prj_resource_assignments, prj_milestones, prj_wbs_elements,
--           prj_projects CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS prj_projects (
    prj_project_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code                 VARCHAR(80)     NOT NULL UNIQUE,
    legacy_project_id            UUID            REFERENCES projects(project_id),
    project_name                 VARCHAR(300)    NOT NULL,
    project_type                 VARCHAR(30)     NOT NULL
                                 CHECK (project_type IN ('npi', 'tooling', 'capex', 'customer_development', 'facility')),
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    project_manager_id           UUID            REFERENCES users(user_id),
    start_date_planned           DATE,
    finish_date_planned          DATE,
    start_date_actual            DATE,
    finish_date_actual           DATE,
    baseline_budget              NUMERIC(14,2),
    current_budget               NUMERIC(14,2),
    project_status               VARCHAR(20)     NOT NULL DEFAULT 'proposed'
                                 CHECK (project_status IN ('proposed', 'approved', 'active', 'on_hold', 'closed', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prj_projects_status ON prj_projects (project_status);

CREATE TABLE IF NOT EXISTS prj_wbs_elements (
    prj_wbs_element_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_project_id               UUID            NOT NULL REFERENCES prj_projects(prj_project_id) ON DELETE CASCADE,
    parent_prj_wbs_element_id    UUID            REFERENCES prj_wbs_elements(prj_wbs_element_id),
    wbs_code                     VARCHAR(80)     NOT NULL,
    wbs_name                     VARCHAR(300)    NOT NULL,
    wbs_type                     VARCHAR(20)     NOT NULL
                                 CHECK (wbs_type IN ('phase', 'work_package', 'activity')),
    planned_start                DATE,
    planned_finish               DATE,
    actual_start                 DATE,
    actual_finish                DATE,
    planned_value                NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (prj_project_id, wbs_code)
);
CREATE INDEX IF NOT EXISTS idx_prj_wbs_parent ON prj_wbs_elements (parent_prj_wbs_element_id);

CREATE TABLE IF NOT EXISTS prj_milestones (
    prj_milestone_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_project_id               UUID            NOT NULL REFERENCES prj_projects(prj_project_id) ON DELETE CASCADE,
    prj_wbs_element_id           UUID            REFERENCES prj_wbs_elements(prj_wbs_element_id),
    milestone_code               VARCHAR(50)     NOT NULL,
    milestone_name               VARCHAR(200)    NOT NULL,
    planned_date                 DATE,
    actual_date                  DATE,
    customer_gate                VARCHAR(100),
    milestone_status             VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                 CHECK (milestone_status IN ('pending', 'completed', 'late', 'waived')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (prj_project_id, milestone_code)
);
CREATE INDEX IF NOT EXISTS idx_prj_milestone_status ON prj_milestones (milestone_status);

CREATE TABLE IF NOT EXISTS prj_resource_assignments (
    prj_resource_assignment_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_wbs_element_id           UUID            NOT NULL REFERENCES prj_wbs_elements(prj_wbs_element_id) ON DELETE CASCADE,
    resource_type                VARCHAR(20)     NOT NULL
                                 CHECK (resource_type IN ('employee', 'machine', 'tool', 'supplier')),
    resource_reference           VARCHAR(80)     NOT NULL,
    planned_hours                NUMERIC(12,2)   DEFAULT 0,
    actual_hours                 NUMERIC(12,2)   DEFAULT 0,
    allocation_pct               NUMERIC(6,2)    DEFAULT 100,
    start_date                   DATE,
    finish_date                  DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prj_resource_ref ON prj_resource_assignments (resource_type, resource_reference);

CREATE TABLE IF NOT EXISTS prj_time_entries (
    prj_time_entry_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_wbs_element_id           UUID            NOT NULL REFERENCES prj_wbs_elements(prj_wbs_element_id) ON DELETE CASCADE,
    employee_id                  VARCHAR(20)     REFERENCES employees(employee_id),
    work_date                    DATE            NOT NULL,
    hours_booked                 NUMERIC(10,2)   NOT NULL DEFAULT 0,
    labor_rate                   NUMERIC(12,4),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prj_time_entry_date ON prj_time_entries (work_date);

CREATE TABLE IF NOT EXISTS prj_cost_collections (
    prj_cost_collection_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_wbs_element_id           UUID            NOT NULL REFERENCES prj_wbs_elements(prj_wbs_element_id) ON DELETE CASCADE,
    cost_type                    VARCHAR(20)     NOT NULL
                                 CHECK (cost_type IN ('labor', 'material', 'subcontract', 'overhead', 'travel')),
    cost_reference               VARCHAR(80),
    posting_date                 DATE            NOT NULL,
    amount                       NUMERIC(14,2)   NOT NULL,
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prj_cost_posting ON prj_cost_collections (posting_date);

CREATE TABLE IF NOT EXISTS prj_earned_value_snapshots (
    prj_earned_value_snapshot_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_wbs_element_id           UUID            NOT NULL REFERENCES prj_wbs_elements(prj_wbs_element_id) ON DELETE CASCADE,
    snapshot_date                DATE            NOT NULL,
    planned_value                NUMERIC(14,2)   DEFAULT 0,
    earned_value                 NUMERIC(14,2)   DEFAULT 0,
    actual_cost                  NUMERIC(14,2)   DEFAULT 0,
    spi_index                    NUMERIC(10,4),
    cpi_index                    NUMERIC(10,4),
    estimate_at_completion       NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (prj_wbs_element_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_prj_evm_snapshot ON prj_earned_value_snapshots (snapshot_date);

CREATE TABLE IF NOT EXISTS prj_risk_register (
    prj_risk_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_project_id               UUID            NOT NULL REFERENCES prj_projects(prj_project_id) ON DELETE CASCADE,
    prj_wbs_element_id           UUID            REFERENCES prj_wbs_elements(prj_wbs_element_id),
    risk_code                    VARCHAR(50)     NOT NULL,
    risk_description             TEXT            NOT NULL,
    probability_pct              NUMERIC(6,2),
    impact_cost                  NUMERIC(14,2),
    impact_days                  NUMERIC(10,2),
    mitigation_plan              TEXT,
    risk_owner_id                UUID            REFERENCES users(user_id),
    risk_status                  VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (risk_status IN ('open', 'mitigated', 'closed', 'realized')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (prj_project_id, risk_code)
);
CREATE INDEX IF NOT EXISTS idx_prj_risk_status ON prj_risk_register (risk_status);

CREATE TABLE IF NOT EXISTS prj_change_requests (
    prj_change_request_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_project_id               UUID            NOT NULL REFERENCES prj_projects(prj_project_id) ON DELETE CASCADE,
    request_number               VARCHAR(80)     NOT NULL UNIQUE,
    request_type                 VARCHAR(20)     NOT NULL
                                 CHECK (request_type IN ('scope', 'schedule', 'cost', 'resource')),
    change_summary               TEXT            NOT NULL,
    requested_by                 UUID            REFERENCES users(user_id),
    requested_at                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    impact_cost                  NUMERIC(14,2),
    impact_days                  NUMERIC(10,2),
    approval_status              VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prj_change_status ON prj_change_requests (approval_status);

CREATE TABLE IF NOT EXISTS prj_billing_milestones (
    prj_billing_milestone_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    prj_project_id               UUID            NOT NULL REFERENCES prj_projects(prj_project_id) ON DELETE CASCADE,
    prj_milestone_id             UUID            REFERENCES prj_milestones(prj_milestone_id),
    billing_code                 VARCHAR(50)     NOT NULL,
    billing_description          VARCHAR(300),
    billing_amount               NUMERIC(14,2)   NOT NULL,
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    invoice_status               VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (invoice_status IN ('planned', 'ready', 'invoiced', 'paid', 'waived')),
    invoice_reference            VARCHAR(80),
    due_date                     DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (prj_project_id, billing_code)
);
CREATE INDEX IF NOT EXISTS idx_prj_billing_status ON prj_billing_milestones (invoice_status);

COMMIT;
