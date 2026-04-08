-- Migration: 014_audit_risk.sql
-- Description: Audit and risk tables - audits, audit_findings, audit_actions, risk_register, improvement_projects, management_reviews
-- Dependencies: 002_core_system.sql, 005_record_management.sql
-- Rollback: DROP TABLE management_reviews, improvement_projects, risk_register, audit_actions, audit_findings, audits CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- audits / Danh gia (11 vars from audit)
-- ---------------------------------------------------------------------------
CREATE TABLE audits (
    audit_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_code          VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    audit_type          audit_type_enum NOT NULL,
    audit_scope         TEXT            NOT NULL,
    audit_date          DATE            NOT NULL,
    lead_auditor        UUID            REFERENCES users(user_id),
    audit_team          TEXT,
    audit_score         NUMERIC(5,2),
    audit_conclusion    audit_conclusion_enum,
    next_audit_date     DATE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE audits IS 'Audit records (internal, external, supplier, LPA). Maps audit variables. / Ho so danh gia.';

-- ---------------------------------------------------------------------------
-- audit_findings / Phat hien danh gia
-- ---------------------------------------------------------------------------
CREATE TABLE audit_findings (
    finding_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id            UUID            NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
    finding_type        finding_type_enum NOT NULL,
    finding_grade       finding_grade_enum,
    clause_reference    VARCHAR(100),
    finding_description TEXT            NOT NULL,
    evidence            TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_findings IS 'Audit finding details. / Chi tiet phat hien danh gia.';

-- ---------------------------------------------------------------------------
-- audit_actions / Hanh dong khac phuc danh gia
-- ---------------------------------------------------------------------------
CREATE TABLE audit_actions (
    action_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id          UUID            NOT NULL REFERENCES audit_findings(finding_id) ON DELETE CASCADE,
    capa_record_id      VARCHAR(50)     REFERENCES records(record_id),
    action_description  TEXT            NOT NULL,
    responsible         UUID            REFERENCES users(user_id),
    target_date         DATE,
    completion_date     DATE,
    status              VARCHAR(30)     DEFAULT 'open',
    verification_notes  TEXT,
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE audit_actions IS 'Corrective actions linked to audit findings. / Hanh dong khac phuc lien ket phat hien danh gia.';

-- ---------------------------------------------------------------------------
-- risk_register / So rui ro (10 vars from risk)
-- ---------------------------------------------------------------------------
CREATE TABLE risk_register (
    risk_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_code           VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    risk_category       risk_category_enum NOT NULL,
    risk_description    TEXT            NOT NULL,
    likelihood          INT             NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
    impact              INT             NOT NULL CHECK (impact BETWEEN 1 AND 5),
    risk_level          risk_level_enum NOT NULL,
    mitigation_action   TEXT,
    residual_risk       risk_level_enum,
    risk_owner          UUID            REFERENCES users(user_id),
    review_period       VARCHAR(50),
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE risk_register IS 'Risk register per ISO 9001 clause 6.1. Maps risk variables. / So rui ro theo ISO 9001 dieu 6.1.';

-- ---------------------------------------------------------------------------
-- improvement_projects / Du an cai tien (7 vars from improvement)
-- ---------------------------------------------------------------------------
CREATE TABLE improvement_projects (
    improvement_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    improvement_code    VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    project_title       VARCHAR(300)    NOT NULL,
    sponsor             VARCHAR(150),
    target_kpi          VARCHAR(100),
    baseline_value      VARCHAR(100),
    target_value        VARCHAR(100),
    improvement_status  improvement_status_enum NOT NULL DEFAULT 'Plan',
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE improvement_projects IS 'Continual improvement projects (PDCA). Maps improvement variables. / Du an cai tien lien tuc (PDCA).';

-- ---------------------------------------------------------------------------
-- management_reviews / Xem xet cua lanh dao (4 vars from management_review)
-- ---------------------------------------------------------------------------
CREATE TABLE management_reviews (
    mr_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_code             VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    review_period       VARCHAR(50)     NOT NULL,
    review_date         DATE            NOT NULL,
    attendees           TEXT,
    agenda_items        JSONB           DEFAULT '[]',
    action_items        JSONB           DEFAULT '[]',
    next_review_date    DATE,
    minutes_path        TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE management_reviews IS 'Management review records per ISO 9001 9.3. Maps management_review variables. / Ho so xem xet cua lanh dao.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS management_reviews CASCADE;
-- DROP TABLE IF EXISTS improvement_projects CASCADE;
-- DROP TABLE IF EXISTS risk_register CASCADE;
-- DROP TABLE IF EXISTS audit_actions CASCADE;
-- DROP TABLE IF EXISTS audit_findings CASCADE;
-- DROP TABLE IF EXISTS audits CASCADE;
