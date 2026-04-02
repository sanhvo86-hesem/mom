-- ============================================================================
-- Migration: 049_hcm_workforce_management.sql
-- Description: Workforce, competency, payroll, and attendance expansion.
-- Dependencies: 013_training_hr.sql, 044_shift_calendar.sql, 003_document_management.sql
-- Rollback: DROP TABLE hcm_disciplinary_actions, hcm_payroll_lines,
--           hcm_payroll_runs, hcm_payroll_periods, hcm_leave_balances,
--           hcm_attendance_records, hcm_qualification_requirements,
--           hcm_employee_certifications, hcm_certifications,
--           hcm_employee_skills, hcm_skills_catalog, hcm_employees,
--           hcm_positions, hcm_org_units CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hcm_org_units (
    hcm_org_unit_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_unit_code                VARCHAR(50)     NOT NULL UNIQUE,
    parent_org_unit_id           UUID            REFERENCES hcm_org_units(hcm_org_unit_id),
    org_unit_name                VARCHAR(200)    NOT NULL,
    org_unit_type                VARCHAR(30)     NOT NULL
                                 CHECK (org_unit_type IN ('company', 'division', 'department', 'section', 'team')),
    manager_employee_id          VARCHAR(20)     REFERENCES employees(employee_id),
    cost_center                  VARCHAR(50),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_org_parent ON hcm_org_units (parent_org_unit_id);

CREATE TABLE IF NOT EXISTS hcm_positions (
    hcm_position_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_code                VARCHAR(50)     NOT NULL UNIQUE,
    position_title               VARCHAR(200)    NOT NULL,
    hcm_org_unit_id              UUID            REFERENCES hcm_org_units(hcm_org_unit_id),
    reports_to_position_id       UUID            REFERENCES hcm_positions(hcm_position_id),
    grade_code                   VARCHAR(30),
    employment_type              VARCHAR(20)     DEFAULT 'full_time'
                                 CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
    required_headcount           INT             DEFAULT 1,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_positions_org ON hcm_positions (hcm_org_unit_id);

CREATE TABLE IF NOT EXISTS hcm_employees (
    employee_id                  VARCHAR(20)     PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
    hcm_position_id              UUID            REFERENCES hcm_positions(hcm_position_id),
    hcm_org_unit_id              UUID            REFERENCES hcm_org_units(hcm_org_unit_id),
    hire_type                    VARCHAR(20)     DEFAULT 'direct'
                                 CHECK (hire_type IN ('direct', 'transfer', 'contract', 'temporary')),
    employment_status            VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (employment_status IN ('active', 'leave', 'suspended', 'terminated')),
    citizenship_country          CHAR(2),
    itar_access_approved         BOOLEAN         NOT NULL DEFAULT FALSE,
    emergency_contact_name       VARCHAR(200),
    emergency_contact_phone      VARCHAR(50),
    payroll_group                VARCHAR(50),
    default_shift_code           VARCHAR(20),
    labor_grade                  VARCHAR(30),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_employees_position ON hcm_employees (hcm_position_id);
CREATE INDEX IF NOT EXISTS idx_hcm_employees_status ON hcm_employees (employment_status);

CREATE TABLE IF NOT EXISTS hcm_skills_catalog (
    hcm_skill_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_code                   VARCHAR(50)     NOT NULL UNIQUE,
    skill_name                   VARCHAR(200)    NOT NULL,
    skill_category               VARCHAR(50),
    proficiency_scale_max        INT             NOT NULL DEFAULT 5,
    recertification_months       INT,
    evidence_required            BOOLEAN         NOT NULL DEFAULT FALSE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_skills_category ON hcm_skills_catalog (skill_category);

CREATE TABLE IF NOT EXISTS hcm_employee_skills (
    hcm_employee_skill_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    hcm_skill_id                 UUID            NOT NULL REFERENCES hcm_skills_catalog(hcm_skill_id),
    proficiency_level            INT             NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5),
    assessed_by                  UUID            REFERENCES users(user_id),
    assessed_date                DATE            NOT NULL,
    next_assessment_due          DATE,
    evidence_doc_id              VARCHAR(30)     REFERENCES documents(doc_id),
    is_current                   BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, hcm_skill_id)
);
CREATE INDEX IF NOT EXISTS idx_hcm_emp_skills_due ON hcm_employee_skills (next_assessment_due);

CREATE TABLE IF NOT EXISTS hcm_certifications (
    hcm_certification_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    certification_code           VARCHAR(50)     NOT NULL UNIQUE,
    certification_name           VARCHAR(200)    NOT NULL,
    issuing_body                 VARCHAR(200),
    default_validity_months      INT,
    renewal_training_required    BOOLEAN         NOT NULL DEFAULT FALSE,
    regulated_process_flag       BOOLEAN         NOT NULL DEFAULT FALSE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hcm_employee_certifications (
    hcm_employee_certification_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    hcm_certification_id         UUID            NOT NULL REFERENCES hcm_certifications(hcm_certification_id),
    certificate_number           VARCHAR(100),
    issued_date                  DATE            NOT NULL,
    expiry_date                  DATE,
    issuing_body                 VARCHAR(200),
    certification_status         VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (certification_status IN ('active', 'expired', 'suspended', 'revoked')),
    renewal_training_id          UUID            REFERENCES training_records(training_id),
    scanned_cert_doc_id          VARCHAR(30)     REFERENCES documents(doc_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, hcm_certification_id, certificate_number)
);
CREATE INDEX IF NOT EXISTS idx_hcm_emp_certs_expiry ON hcm_employee_certifications (expiry_date);

CREATE TABLE IF NOT EXISTS hcm_qualification_requirements (
    hcm_qualification_requirement_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type                  VARCHAR(20)     NOT NULL
                                 CHECK (entity_type IN ('operation', 'work_center', 'process')),
    entity_reference             VARCHAR(80)     NOT NULL,
    hcm_certification_id         UUID            REFERENCES hcm_certifications(hcm_certification_id),
    hcm_skill_id                 UUID            REFERENCES hcm_skills_catalog(hcm_skill_id),
    min_proficiency              INT             CHECK (min_proficiency BETWEEN 1 AND 5),
    is_mandatory                 BOOLEAN         NOT NULL DEFAULT TRUE,
    override_auth_level          VARCHAR(30),
    itar_required                BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_qual_req_entity ON hcm_qualification_requirements (entity_type, entity_reference);

CREATE TABLE IF NOT EXISTS hcm_attendance_records (
    hcm_attendance_record_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    attendance_date              DATE            NOT NULL,
    shift_code                   VARCHAR(20),
    clock_in_at                  TIMESTAMPTZ,
    clock_out_at                 TIMESTAMPTZ,
    hours_regular                NUMERIC(10,2)   DEFAULT 0,
    hours_overtime               NUMERIC(10,2)   DEFAULT 0,
    attendance_status            VARCHAR(20)     NOT NULL DEFAULT 'present'
                                 CHECK (attendance_status IN ('present', 'absent', 'leave', 'travel', 'holiday')),
    approved_by                  UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, attendance_date, shift_code)
);
CREATE INDEX IF NOT EXISTS idx_hcm_attendance_date ON hcm_attendance_records (attendance_date);

CREATE TABLE IF NOT EXISTS hcm_leave_balances (
    hcm_leave_balance_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    leave_year                   INT             NOT NULL,
    leave_type                   VARCHAR(30)     NOT NULL
                                 CHECK (leave_type IN ('annual', 'sick', 'training', 'unpaid', 'special')),
    accrued_days                 NUMERIC(10,2)   DEFAULT 0,
    used_days                    NUMERIC(10,2)   DEFAULT 0,
    remaining_days               NUMERIC(10,2)   DEFAULT 0,
    carry_forward_days           NUMERIC(10,2)   DEFAULT 0,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_year, leave_type)
);
CREATE INDEX IF NOT EXISTS idx_hcm_leave_year ON hcm_leave_balances (leave_year);

CREATE TABLE IF NOT EXISTS hcm_payroll_periods (
    hcm_payroll_period_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_group                VARCHAR(50)     NOT NULL,
    period_year                  INT             NOT NULL,
    period_number                INT             NOT NULL,
    period_start                 DATE            NOT NULL,
    period_end                   DATE            NOT NULL,
    pay_date                     DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'processing', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (payroll_group, period_year, period_number)
);
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_period_status ON hcm_payroll_periods (status);

CREATE TABLE IF NOT EXISTS hcm_payroll_runs (
    hcm_payroll_run_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    hcm_payroll_period_id        UUID            NOT NULL REFERENCES hcm_payroll_periods(hcm_payroll_period_id) ON DELETE CASCADE,
    run_number                   VARCHAR(80)     NOT NULL UNIQUE,
    gross_pay_total              NUMERIC(14,2)   DEFAULT 0,
    net_pay_total                NUMERIC(14,2)   DEFAULT 0,
    deduction_total              NUMERIC(14,2)   DEFAULT 0,
    tax_total                    NUMERIC(14,2)   DEFAULT 0,
    payroll_status               VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                 CHECK (payroll_status IN ('draft', 'approved', 'posted', 'void')),
    approved_by                  UUID            REFERENCES users(user_id),
    approved_at                  TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_run_status ON hcm_payroll_runs (payroll_status);

CREATE TABLE IF NOT EXISTS hcm_payroll_lines (
    hcm_payroll_line_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    hcm_payroll_run_id           UUID            NOT NULL REFERENCES hcm_payroll_runs(hcm_payroll_run_id) ON DELETE CASCADE,
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id),
    base_pay                     NUMERIC(14,2)   DEFAULT 0,
    overtime_pay                 NUMERIC(14,2)   DEFAULT 0,
    allowances_total             NUMERIC(14,2)   DEFAULT 0,
    deductions_total             NUMERIC(14,2)   DEFAULT 0,
    taxes_total                  NUMERIC(14,2)   DEFAULT 0,
    employer_cost_total          NUMERIC(14,2)   DEFAULT 0,
    net_pay                      NUMERIC(14,2)   DEFAULT 0,
    costing_reference            VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (hcm_payroll_run_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_lines_employee ON hcm_payroll_lines (employee_id);

CREATE TABLE IF NOT EXISTS hcm_disciplinary_actions (
    hcm_disciplinary_action_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id                  VARCHAR(20)     NOT NULL REFERENCES hcm_employees(employee_id) ON DELETE CASCADE,
    action_type                  VARCHAR(30)     NOT NULL
                                 CHECK (action_type IN ('warning', 'suspension', 'counseling', 'termination', 'training_reassignment')),
    related_record_id            VARCHAR(50)     REFERENCES records(record_id),
    action_date                  DATE            NOT NULL,
    effective_until              DATE,
    action_reason                TEXT            NOT NULL,
    issued_by                    UUID            REFERENCES users(user_id),
    evidence_doc_id              VARCHAR(30)     REFERENCES documents(doc_id),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'closed', 'appealed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcm_disc_employee ON hcm_disciplinary_actions (employee_id);
CREATE INDEX IF NOT EXISTS idx_hcm_disc_status ON hcm_disciplinary_actions (status);

COMMIT;
