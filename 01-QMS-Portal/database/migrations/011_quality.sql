-- Migration: 011_quality.sql
-- Description: Quality tables - inspection_plans, inspection_results, spc_data, ncr_records, capa_records, fai_records, fai_characteristics, certificates, npi_projects, ehs_incidents, contamination_checks, engineering_change_requests
-- Dependencies: 005_record_management.sql, 006_erp_master_data.sql, 007_customers_sales.sql
-- Rollback: DROP TABLE engineering_change_requests, contamination_checks, ehs_incidents, npi_projects, certificates, fai_characteristics, fai_records, capa_records, ncr_records, spc_data, inspection_results, inspection_plans CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- inspection_plans / Ke hoach kiem tra (21 vars from erp_quality_extended)
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_plans (
    plan_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_plan_id  VARCHAR(50)     NOT NULL UNIQUE,
    inspection_type     insp_type_erp   NOT NULL,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    sampling_plan       sampling_plan_enum DEFAULT 'aql',
    sampling_standard   sampling_standard_enum DEFAULT 'ansi_z14',
    aql_level           VARCHAR(20),
    accept_number       INT,
    reject_number       INT,
    sample_size         INT,
    test_method         TEXT,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_plans IS 'Inspection plan definitions. Maps erp_quality_extended variables. / Dinh nghia ke hoach kiem tra.';

-- ---------------------------------------------------------------------------
-- inspection_results / Ket qua kiem tra (22 vars from quality_inspection)
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_results (
    result_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id             UUID            REFERENCES inspection_plans(plan_id),
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    operation_seq       INT,
    inspector_id        UUID            REFERENCES users(user_id),
    characteristic      VARCHAR(200)    NOT NULL,
    characteristic_designator char_designator DEFAULT 'Standard',
    characteristic_type char_type_enum,
    ctq_flag            BOOLEAN         NOT NULL DEFAULT FALSE,
    kpc_flag            BOOLEAN         NOT NULL DEFAULT FALSE,
    nominal             NUMERIC(14,6),
    usl                 NUMERIC(14,6),
    lsl                 NUMERIC(14,6),
    tolerance           VARCHAR(50),
    actual_value        NUMERIC(14,6),
    measurement_unit    measurement_unit,
    measurement_method  VARCHAR(100),
    pass_fail           VARCHAR(4)      CHECK (pass_fail IN ('PASS', 'FAIL')),
    sample_size         INT,
    defects_found       INT             DEFAULT 0,
    lot_disposition     lot_disposition_enum,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_results IS 'Inspection measurement results. Maps quality_inspection variables. / Ket qua do kiem tra.';

-- ---------------------------------------------------------------------------
-- spc_data / Du lieu SPC
-- ---------------------------------------------------------------------------
CREATE TABLE spc_data (
    spc_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    characteristic      VARCHAR(200)    NOT NULL,
    chart_type          spc_chart_type_enum DEFAULT 'xbar_r',
    job_number          VARCHAR(50),
    operation_seq       INT,
    subgroup_number     INT,
    sample_value        NUMERIC(14,6),
    x_bar               NUMERIC(14,6),
    range_r             NUMERIC(14,6),
    sigma               NUMERIC(14,6),
    cpk                 NUMERIC(8,4),
    cp                  NUMERIC(8,4),
    ppk                 NUMERIC(8,4),
    process_sigma       NUMERIC(8,4),
    ucl                 NUMERIC(14,6),
    lcl                 NUMERIC(14,6),
    centerline          NUMERIC(14,6),
    out_of_control      BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE spc_data IS 'SPC control chart data points. / Du lieu bieu do kiem soat SPC.';

-- ---------------------------------------------------------------------------
-- ncr_records / Ho so NCR (19 vars from ncr_capa)
-- ---------------------------------------------------------------------------
CREATE TABLE ncr_records (
    ncr_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    ncr_number          VARCHAR(50)     NOT NULL UNIQUE,
    defect_type         defect_type_enum,
    defect_description  TEXT            NOT NULL,
    disposition         ncr_disposition_enum,
    root_cause          TEXT,
    root_cause_method   root_cause_method_enum,
    containment_action  TEXT,
    nonconformance_source nc_source_enum,
    severity            INT             CHECK (severity BETWEEN 1 AND 10),
    occurrence          INT             CHECK (occurrence BETWEEN 1 AND 10),
    detection           INT             CHECK (detection BETWEEN 1 AND 10),
    rpn                 INT             GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    ncr_status          ncr_status_enum NOT NULL DEFAULT 'Open',
    -- Job context
    job_number          VARCHAR(50),
    part_number         VARCHAR(100),
    part_rev            VARCHAR(20),
    customer            VARCHAR(200),
    quantity_affected   NUMERIC(12,2),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ncr_records IS 'Detailed NCR records with S/O/D/RPN. Maps ncr_capa variables. / Ho so NCR chi tiet voi S/O/D/RPN.';

-- ---------------------------------------------------------------------------
-- capa_records / Ho so CAPA
-- ---------------------------------------------------------------------------
CREATE TABLE capa_records (
    capa_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    source_ncr_id       VARCHAR(50)     REFERENCES ncr_records(ncr_number),
    corrective_action   TEXT,
    preventive_action   TEXT,
    root_cause          TEXT,
    root_cause_method   root_cause_method_enum,
    verification_result VARCHAR(20)     CHECK (verification_result IN ('Effective', 'Not Effective', 'Pending')),
    target_date         DATE,
    completion_date     DATE,
    capa_status         capa_status_enum NOT NULL DEFAULT 'Open',
    action_owner        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE capa_records IS 'CAPA records. Maps ncr_capa variables. / Ho so hanh dong khac phuc phong ngua.';

-- ---------------------------------------------------------------------------
-- fai_records / Ho so FAI (10 vars from fai)
-- ---------------------------------------------------------------------------
CREATE TABLE fai_records (
    fai_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    fai_number          VARCHAR(50)     NOT NULL UNIQUE,
    fai_type            fai_type_enum   NOT NULL DEFAULT 'Full',
    fai_reason          fai_reason_enum NOT NULL,
    fai_form_number     VARCHAR(10)     CHECK (fai_form_number IN ('Form 1', 'Form 2', 'Form 3')),
    fai_overall_result  VARCHAR(20)     CHECK (fai_overall_result IN ('Approved', 'Conditional', 'Rejected')),
    -- Job context
    part_number         VARCHAR(100)    NOT NULL,
    part_rev            VARCHAR(20),
    job_number          VARCHAR(50),
    customer            VARCHAR(200),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fai_records IS 'AS9102 FAI records (Form 1/2/3). Maps fai variables. / Ho so FAI theo AS9102.';

-- ---------------------------------------------------------------------------
-- fai_characteristics / Dac tinh FAI (balloon-level data)
-- ---------------------------------------------------------------------------
CREATE TABLE fai_characteristics (
    fai_char_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fai_id              UUID            NOT NULL REFERENCES fai_records(fai_id) ON DELETE CASCADE,
    balloon_number      INT             NOT NULL,
    design_requirement  TEXT            NOT NULL,
    actual_result       TEXT,
    conformance         VARCHAR(2)      CHECK (conformance IN ('C', 'NC')),
    measurement_data    TEXT,
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE fai_characteristics IS 'FAI characteristic-level measurement data. / Du lieu do dac tinh FAI.';

-- ---------------------------------------------------------------------------
-- certificates / Chung chi
-- ---------------------------------------------------------------------------
CREATE TABLE certificates (
    certificate_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_type    cert_type_enum  NOT NULL,
    certificate_number  VARCHAR(100)    NOT NULL,
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    lot_number          VARCHAR(100),
    issue_date          DATE            NOT NULL,
    issued_by           UUID            REFERENCES users(user_id),
    file_path           TEXT,
    content_hash        VARCHAR(128),
    ppap_level          INT,
    ppap_status         VARCHAR(30),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE certificates IS 'CoC, CoF, material certs, test reports, FAI certs. / Cac loai chung chi.';

-- ---------------------------------------------------------------------------
-- npi_projects / Du an san pham moi (16 vars from erp_npi)
-- ---------------------------------------------------------------------------
CREATE TABLE npi_projects (
    npi_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    npi_project_id      VARCHAR(50)     NOT NULL UNIQUE,
    npi_phase           npi_phase_enum  NOT NULL DEFAULT 'concept',
    npi_gate            npi_gate_enum,
    gate_review_date    DATE,
    gate_status         gate_status_enum,
    pfmea_id            VARCHAR(50),
    pfmea_rpn_max       INT,
    control_plan_id     VARCHAR(50),
    ppap_submission_date DATE,
    run_at_rate_date    DATE,
    run_at_rate_result  TEXT,
    initial_cpk         NUMERIC(8,4),
    initial_ppk         NUMERIC(8,4),
    prototype_qty       INT,
    pilot_lot_number    VARCHAR(100),
    first_production_date DATE,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE npi_projects IS 'NPI projects with APQP/PPAP gate tracking. Maps erp_npi variables. / Du an NPI voi theo doi cong APQP/PPAP.';

-- ---------------------------------------------------------------------------
-- ehs_incidents / Su co EHS
-- ---------------------------------------------------------------------------
CREATE TABLE ehs_incidents (
    incident_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_code       VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    incident_type       incident_type_enum NOT NULL,
    incident_location   VARCHAR(200),
    incident_description TEXT           NOT NULL,
    corrective_action   TEXT,
    reported_by         UUID            REFERENCES users(user_id),
    incident_date       TIMESTAMPTZ     NOT NULL,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ehs_incidents IS 'EHS incident records. Maps ehs variables. / Ho so su co an toan.';

-- ---------------------------------------------------------------------------
-- contamination_checks / Kiem tra nhiem ban va FOD
-- ---------------------------------------------------------------------------
CREATE TABLE contamination_checks (
    check_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    cleanliness_level   cleanliness_level_enum,
    fod_check_result    VARCHAR(4)      CHECK (fod_check_result IN ('Pass', 'Fail')),
    contamination_type  contamination_type_enum,
    cleaning_method     cleaning_method_enum,
    packaging_material  VARCHAR(200),
    inspector_id        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE contamination_checks IS 'Contamination and FOD checks. Maps contamination_fod variables. / Kiem tra nhiem ban va FOD.';

-- ---------------------------------------------------------------------------
-- engineering_change_requests / Yeu cau thay doi ky thuat (11 vars from engineering)
-- ---------------------------------------------------------------------------
CREATE TABLE engineering_change_requests (
    ecr_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ecr_number          VARCHAR(30)     NOT NULL UNIQUE,
    ecr_status          ecr_status_enum NOT NULL DEFAULT 'Draft',
    ecr_type            VARCHAR(50),    -- design/process/material/tooling/documentation
    change_description  TEXT,
    change_reason       TEXT,
    revision_from       VARCHAR(20),
    revision_to         VARCHAR(20),
    impact_assessment   TEXT,
    affected_documents  JSONB           DEFAULT '[]',
    cam_program_id      VARCHAR(50),
    baseline_version    VARCHAR(20),
    department          dept_code,
    requested_by        UUID            REFERENCES users(user_id),
    approved_by         UUID            REFERENCES users(user_id),
    item_id             UUID            REFERENCES items(item_id),
    linked_record_id    UUID            REFERENCES records(record_id),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     DEFAULT now(),
    valid_to            TIMESTAMPTZ     DEFAULT 'infinity',
    created_at          TIMESTAMPTZ     DEFAULT now(),
    updated_at          TIMESTAMPTZ     DEFAULT now()
);
COMMENT ON TABLE engineering_change_requests IS 'Engineering change requests (ECR). Maps engineering variables. / Yeu cau thay doi ky thuat.';
COMMENT ON COLUMN engineering_change_requests.ecr_number IS 'Unique ECR identifier, format ECR-{YYYY}-{NNN}. / Ma ECR duy nhat.';
COMMENT ON COLUMN engineering_change_requests.ecr_status IS 'Current ECR lifecycle status. / Trang thai vong doi ECR hien tai.';
COMMENT ON COLUMN engineering_change_requests.ecr_type IS 'Type of change: design, process, material, tooling, documentation. / Loai thay doi.';
COMMENT ON COLUMN engineering_change_requests.impact_assessment IS 'Assessment of change impact on processes, tooling, documentation. / Danh gia tac dong thay doi.';
COMMENT ON COLUMN engineering_change_requests.affected_documents IS 'JSONB array of document IDs affected by this change. / Mang JSONB cac tai lieu bi anh huong.';
COMMENT ON COLUMN engineering_change_requests.cam_program_id IS 'Engineering baseline program identifier per Pattern 3 naming. / Ma chuong trinh CAM theo quy tac P3.';
COMMENT ON COLUMN engineering_change_requests.baseline_version IS 'Version number for engineering baseline files. / So phien ban co so ky thuat.';
CREATE INDEX idx_ecr_status ON engineering_change_requests (ecr_status);
CREATE INDEX idx_ecr_number ON engineering_change_requests (ecr_number);
CREATE INDEX idx_ecr_department ON engineering_change_requests (department);
CREATE INDEX idx_ecr_item ON engineering_change_requests (item_id);
CREATE INDEX idx_ecr_requested_by ON engineering_change_requests (requested_by);
CREATE INDEX idx_ecr_valid_range ON engineering_change_requests USING gist (tstzrange(valid_from, valid_to));

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS contamination_checks CASCADE;
-- DROP TABLE IF EXISTS ehs_incidents CASCADE;
-- DROP TABLE IF EXISTS npi_projects CASCADE;
-- DROP TABLE IF EXISTS certificates CASCADE;
-- DROP TABLE IF EXISTS fai_characteristics CASCADE;
-- DROP TABLE IF EXISTS fai_records CASCADE;
-- DROP TABLE IF EXISTS capa_records CASCADE;
-- DROP TABLE IF EXISTS ncr_records CASCADE;
-- DROP TABLE IF EXISTS spc_data CASCADE;
-- DROP TABLE IF EXISTS inspection_results CASCADE;
-- DROP TABLE IF EXISTS inspection_plans CASCADE;
