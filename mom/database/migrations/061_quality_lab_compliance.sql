-- ============================================================================
-- Migration: 061_quality_lab_compliance.sql
-- Description: Advanced laboratory, compliance, and effectiveness management.
-- Dependencies: 011_quality.sql, 003_document_management.sql, 035_supplier_quality_management.sql
-- Rollback: DROP TABLE qual_first_article_packages,
--           qual_effectiveness_reviews, qual_root_cause_sessions,
--           qual_containment_actions, qual_escape_events,
--           qual_customer_requirements, qual_audit_programs,
--           qual_compliance_evidence, qual_compliance_obligations,
--           qual_certificate_revisions, qual_certificate_templates,
--           qual_sample_batches, qual_sample_plans, qual_lab_equipment,
--           qual_test_labs, qual_test_methods CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS qual_test_methods (
    qual_test_method_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_code                  VARCHAR(50)     NOT NULL UNIQUE,
    method_name                  VARCHAR(200)    NOT NULL,
    method_category              VARCHAR(30)     NOT NULL
                                 CHECK (method_category IN ('dimensional', 'material', 'functional', 'chemical', 'visual')),
    standard_reference           VARCHAR(100),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_test_labs (
    qual_test_lab_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_code                     VARCHAR(50)     NOT NULL UNIQUE,
    lab_name                     VARCHAR(200)    NOT NULL,
    lab_type                     VARCHAR(20)     NOT NULL
                                 CHECK (lab_type IN ('internal', 'external')),
    accreditation_reference      VARCHAR(100),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_lab_equipment (
    qual_lab_equipment_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    qual_test_lab_id             UUID            NOT NULL REFERENCES qual_test_labs(qual_test_lab_id) ON DELETE CASCADE,
    equipment_id                 VARCHAR(50)     REFERENCES equipment(equipment_id),
    equipment_code               VARCHAR(80),
    qualification_due_date       DATE,
    status                       VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive', 'under_calibration')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_sample_plans (
    qual_sample_plan_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_plan_code             VARCHAR(50)     NOT NULL UNIQUE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    qual_test_method_id          UUID            REFERENCES qual_test_methods(qual_test_method_id),
    sample_size                  INT,
    acceptance_number            INT,
    rejection_number             INT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_sample_batches (
    qual_sample_batch_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    qual_sample_plan_id          UUID            NOT NULL REFERENCES qual_sample_plans(qual_sample_plan_id) ON DELETE CASCADE,
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    batch_reference              VARCHAR(80)     NOT NULL,
    sample_date                  DATE            NOT NULL,
    sample_status                VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (sample_status IN ('open', 'tested', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_certificate_templates (
    qual_certificate_template_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_code                VARCHAR(50)     NOT NULL UNIQUE,
    certificate_type             VARCHAR(30)     NOT NULL
                                 CHECK (certificate_type IN ('coc', 'coa', 'test_report', 'fai')),
    template_name                VARCHAR(200)    NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_certificate_revisions (
    qual_certificate_revision_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    qual_certificate_template_id UUID            NOT NULL REFERENCES qual_certificate_templates(qual_certificate_template_id) ON DELETE CASCADE,
    revision_code                VARCHAR(20)     NOT NULL,
    document_id                  VARCHAR(30)     REFERENCES documents(doc_id),
    effective_date               DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (qual_certificate_template_id, revision_code)
);

CREATE TABLE IF NOT EXISTS qual_compliance_obligations (
    qual_compliance_obligation_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    obligation_code               VARCHAR(80)     NOT NULL UNIQUE,
    obligation_source             VARCHAR(30)     NOT NULL
                                  CHECK (obligation_source IN ('customer', 'regulatory', 'standard', 'internal')),
    obligation_title              VARCHAR(300)    NOT NULL,
    owner_id                      UUID            REFERENCES users(user_id),
    due_frequency                 VARCHAR(30),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_compliance_evidence (
    qual_compliance_evidence_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    qual_compliance_obligation_id UUID            NOT NULL REFERENCES qual_compliance_obligations(qual_compliance_obligation_id) ON DELETE CASCADE,
    evidence_reference            VARCHAR(80)     NOT NULL,
    evidence_type                 VARCHAR(30)     NOT NULL
                                  CHECK (evidence_type IN ('document', 'record', 'audit', 'test_result')),
    document_id                   VARCHAR(30)     REFERENCES documents(doc_id),
    record_id                     VARCHAR(50)     REFERENCES records(record_id),
    evidence_date                 DATE,
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_audit_programs (
    qual_audit_program_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_code                  VARCHAR(50)     NOT NULL UNIQUE,
    program_scope                 VARCHAR(100),
    frequency_months              INT,
    owner_id                      UUID            REFERENCES users(user_id),
    status                        VARCHAR(20)     NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'inactive')),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_customer_requirements (
    qual_customer_requirement_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                   VARCHAR(50)     REFERENCES customers(customer_id),
    requirement_code              VARCHAR(80)     NOT NULL UNIQUE,
    requirement_title             VARCHAR(300)    NOT NULL,
    requirement_text              TEXT,
    revision_code                 VARCHAR(20),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_escape_events (
    qual_escape_event_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    escape_number                 VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                   VARCHAR(50)     REFERENCES customers(customer_id),
    item_id                       VARCHAR(50)     REFERENCES items(item_id),
    escape_date                   DATE            NOT NULL,
    escape_summary                TEXT            NOT NULL,
    containment_status            VARCHAR(20)     NOT NULL DEFAULT 'open'
                                  CHECK (containment_status IN ('open', 'contained', 'closed')),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_containment_actions (
    qual_containment_action_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    qual_escape_event_id          UUID            NOT NULL REFERENCES qual_escape_events(qual_escape_event_id) ON DELETE CASCADE,
    action_owner_id               UUID            REFERENCES users(user_id),
    action_summary                VARCHAR(300)    NOT NULL,
    due_date                      DATE,
    status                        VARCHAR(20)     NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'completed', 'cancelled')),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_root_cause_sessions (
    qual_root_cause_session_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number                VARCHAR(80)     NOT NULL UNIQUE,
    related_record_id             VARCHAR(50)     REFERENCES records(record_id),
    methodology                   VARCHAR(30)     NOT NULL
                                  CHECK (methodology IN ('5why', '8d', 'ishikawa', 'fault_tree')),
    facilitator_id                UUID            REFERENCES users(user_id),
    session_date                  DATE,
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_effectiveness_reviews (
    qual_effectiveness_review_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    related_record_id             VARCHAR(50)     REFERENCES records(record_id),
    review_date                   DATE            NOT NULL,
    reviewer_id                   UUID            REFERENCES users(user_id),
    review_result                 VARCHAR(20)     NOT NULL
                                  CHECK (review_result IN ('effective', 'partially_effective', 'ineffective')),
    notes                         TEXT,
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qual_first_article_packages (
    qual_first_article_package_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_number                VARCHAR(80)     NOT NULL UNIQUE,
    fai_id                        UUID            REFERENCES fai_records(fai_id),
    item_id                       VARCHAR(50)     REFERENCES items(item_id),
    package_status                VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                  CHECK (package_status IN ('draft', 'submitted', 'approved', 'rejected')),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
