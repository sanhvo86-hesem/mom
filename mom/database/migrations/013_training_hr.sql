-- Migration: 013_training_hr.sql
-- Description: Training and HR tables - employees, training_records, skills_matrix, employee_certifications
-- Dependencies: 002_core_system.sql, 005_record_management.sql
-- Rollback: DROP TABLE employee_certifications, skills_matrix, training_records, employees CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- employees / Nhan vien (17 vars from personnel)
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
    employee_id         VARCHAR(20)     PRIMARY KEY,
    employee_name       VARCHAR(150)    NOT NULL,
    user_id_code        VARCHAR(50),
    user_id             UUID            REFERENCES users(user_id),
    role_code           VARCHAR(50),
    role_label          VARCHAR(150),
    dept_code           dept_code       REFERENCES departments(dept_code),
    shift               shift_code,
    supervisor_name     VARCHAR(150),
    hire_date           DATE,
    termination_date    DATE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE employees IS 'Employee master. Maps personnel variables. / Du lieu nhan vien.';

-- ---------------------------------------------------------------------------
-- training_records / Ho so dao tao (10 vars from training)
-- ---------------------------------------------------------------------------
CREATE TABLE training_records (
    training_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    training_event_id   VARCHAR(50),
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    training_topic      VARCHAR(300)    NOT NULL,
    training_type       training_type_enum NOT NULL,
    trainer             VARCHAR(150),
    trainee_id          VARCHAR(20)     REFERENCES employees(employee_id),
    assessment_result   VARCHAR(20)     CHECK (assessment_result IN ('Pass', 'Fail', 'Conditional', 'N/A')),
    assessment_score    NUMERIC(5,2),
    competence_level    VARCHAR(50),
    completion_date     DATE,
    training_hours      NUMERIC(6,2),
    certification_body  VARCHAR(200),
    certification_expiry DATE,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE training_records IS 'Training records with competency. Maps training variables. / Ho so dao tao voi nang luc.';

-- ---------------------------------------------------------------------------
-- skills_matrix / Ma tran ky nang
-- ---------------------------------------------------------------------------
CREATE TABLE skills_matrix (
    skill_matrix_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    skill_code      VARCHAR(50)     NOT NULL,
    skill_name      VARCHAR(200)    NOT NULL,
    competence_level INT            NOT NULL CHECK (competence_level BETWEEN 0 AND 5),
    assessed_date   DATE            NOT NULL,
    assessed_by     UUID            REFERENCES users(user_id),
    expiry_date     DATE,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (employee_id, skill_code)
);
COMMENT ON TABLE skills_matrix IS 'Employee x skill x competence level. / Ma tran nhan vien x ky nang x muc nang luc.';

-- ---------------------------------------------------------------------------
-- employee_certifications / Chung chi nhan vien
-- ---------------------------------------------------------------------------
CREATE TABLE employee_certifications (
    cert_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    certification_name VARCHAR(200) NOT NULL,
    certification_body VARCHAR(200),
    issue_date      DATE            NOT NULL,
    expiry_date     DATE,
    certificate_number VARCHAR(100),
    status          VARCHAR(20)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE employee_certifications IS 'Employee certifications with expiry. / Chung chi nhan vien voi han.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS employee_certifications CASCADE;
-- DROP TABLE IF EXISTS skills_matrix CASCADE;
-- DROP TABLE IF EXISTS training_records CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
