-- ============================================================================
-- Migration: 035_supplier_quality_management.sql
-- Description: Supplier quality - scorecards, incoming inspection, skip-lot,
--              ASL, SCAR, audits
-- Dependencies: 008_vendors_purchasing.sql, 011_quality.sql
-- Rollback: DROP TABLE supplier_audit_schedule, scar_records,
--           approved_supplier_list, skip_lot_tracking,
--           incoming_inspection_results, incoming_inspections,
--           supplier_scorecards CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE supplier_eval_type_enum AS ENUM (
        'initial', 'annual', 'event_driven', 're_qualification'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incoming_insp_result_enum AS ENUM (
        'accept', 'reject', 'conditional_accept', 'pending_mrb'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incoming_insp_status_enum AS ENUM (
        'pending', 'in_progress', 'completed', 'on_hold'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE skip_lot_level_enum AS ENUM (
        'normal', 'tightened', 'reduced', 'skip'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE asl_status_enum AS ENUM (
        'pending_eval', 'approved', 'conditional', 'suspended', 'removed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE scar_status_enum AS ENUM (
        'issued', 'acknowledged', 'root_cause_analysis', 'corrective_action',
        'verification', 'closed', 'overdue'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE scar_priority_enum AS ENUM (
        'low', 'medium', 'high', 'critical'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- supplier_scorecards / Bang diem nha cung cap
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_scorecards (
    scorecard_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    period                  VARCHAR(7),
    quality_score           NUMERIC(5,2),
    delivery_score          NUMERIC(5,2),
    cost_score              NUMERIC(5,2),
    compliance_score        NUMERIC(5,2),
    overall_score           NUMERIC(5,2),
    quality_weight          NUMERIC(3,2)    DEFAULT 0.40,
    delivery_weight         NUMERIC(3,2)    DEFAULT 0.30,
    cost_weight             NUMERIC(3,2)    DEFAULT 0.20,
    compliance_weight       NUMERIC(3,2)    DEFAULT 0.10,
    rating_grade            vendor_rating_grade,
    previous_grade          vendor_rating_grade,
    trend                   VARCHAR(20)     DEFAULT 'stable',
    lots_received           INT             DEFAULT 0,
    lots_rejected           INT             DEFAULT 0,
    on_time_deliveries      INT             DEFAULT 0,
    total_deliveries        INT             DEFAULT 0,
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE supplier_scorecards IS 'Supplier performance scorecards by period / Bang diem hieu suat nha cung cap theo ky';

CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_vendor ON supplier_scorecards (vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_period ON supplier_scorecards (period);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_grade ON supplier_scorecards (rating_grade);

-- ============================================================================
-- incoming_inspections / Kiem tra dau vao
-- ============================================================================
CREATE TABLE IF NOT EXISTS incoming_inspections (
    inspection_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number       VARCHAR(50)     UNIQUE,
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    po_number               VARCHAR(50),
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    lot_number              VARCHAR(100),
    received_date           DATE,
    qty_received            NUMERIC(12,2),
    status                  incoming_insp_status_enum DEFAULT 'pending',
    result                  incoming_insp_result_enum,
    inspector_id            UUID            REFERENCES users(user_id),
    inspection_plan_id      UUID            REFERENCES inspection_plans(plan_id),
    sampling_size           INT,
    defects_found           INT             DEFAULT 0,
    qty_accepted            NUMERIC(12,2),
    qty_rejected            NUMERIC(12,2),
    disposition             VARCHAR(50),
    ncr_reference           VARCHAR(50),
    mrb_reference           VARCHAR(50),
    skip_lot_applied        BOOLEAN         DEFAULT FALSE,
    material_cert_received  BOOLEAN         DEFAULT FALSE,
    material_cert_verified  BOOLEAN         DEFAULT FALSE,
    coc_received            BOOLEAN         DEFAULT FALSE,
    test_report_received    BOOLEAN         DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE incoming_inspections IS 'Incoming material inspections / Kiem tra vat lieu dau vao';

CREATE INDEX IF NOT EXISTS idx_incoming_inspections_vendor ON incoming_inspections (vendor_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_status ON incoming_inspections (status);
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_item ON incoming_inspections (item_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_po ON incoming_inspections (po_number);
CREATE INDEX IF NOT EXISTS idx_incoming_inspections_date ON incoming_inspections (received_date);

-- ============================================================================
-- incoming_inspection_results / Ket qua kiem tra dau vao
-- ============================================================================
CREATE TABLE IF NOT EXISTS incoming_inspection_results (
    result_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id           UUID            NOT NULL REFERENCES incoming_inspections(inspection_id),
    characteristic          VARCHAR(200),
    nominal                 NUMERIC(14,6),
    usl                     NUMERIC(14,6),
    lsl                     NUMERIC(14,6),
    actual_value            NUMERIC(14,6),
    pass_fail               VARCHAR(4)      CHECK (pass_fail IN ('PASS','FAIL')),
    measurement_method      VARCHAR(100),
    measurement_unit        measurement_unit,
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    recorded_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE incoming_inspection_results IS 'Individual measurement results for incoming inspections / Ket qua do luong chi tiet kiem tra dau vao';

CREATE INDEX IF NOT EXISTS idx_incoming_inspection_results_insp ON incoming_inspection_results (inspection_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inspection_results_pf ON incoming_inspection_results (pass_fail);

-- ============================================================================
-- skip_lot_tracking / Theo doi bo lot kiem tra
-- ============================================================================
CREATE TABLE IF NOT EXISTS skip_lot_tracking (
    skip_lot_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    item_id                 VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    current_level           skip_lot_level_enum DEFAULT 'normal',
    consecutive_accepted    INT             DEFAULT 0,
    consecutive_rejected    INT             DEFAULT 0,
    last_inspection_date    DATE,
    last_inspection_result  incoming_insp_result_enum,
    tightened_trigger_count INT             DEFAULT 2,
    normal_to_reduced_count INT             DEFAULT 10,
    reduced_to_skip_count   INT             DEFAULT 20,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, item_id)
);
COMMENT ON TABLE skip_lot_tracking IS 'Skip-lot / sampling level tracking per vendor-item pair / Theo doi muc do kiem tra bo lot theo cap nha cung cap - san pham';

CREATE INDEX IF NOT EXISTS idx_skip_lot_tracking_vendor ON skip_lot_tracking (vendor_id);
CREATE INDEX IF NOT EXISTS idx_skip_lot_tracking_level ON skip_lot_tracking (current_level);

-- ============================================================================
-- approved_supplier_list / Danh sach nha cung cap duoc phe duyet (ASL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS approved_supplier_list (
    asl_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    scope_description       TEXT,
    scope_processes         JSONB,
    asl_status              asl_status_enum DEFAULT 'pending_eval',
    eval_type               supplier_eval_type_enum,
    approved_date           DATE,
    expiry_date             DATE,
    last_audit_date         DATE,
    next_audit_date         DATE,
    certifications          JSONB,
    nadcap_accredited       BOOLEAN         DEFAULT FALSE,
    as9100_certified        BOOLEAN         DEFAULT FALSE,
    iso9001_certified       BOOLEAN         DEFAULT FALSE,
    conditions              TEXT,
    approved_by             UUID            REFERENCES users(user_id),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE approved_supplier_list IS 'Approved Supplier List with certification tracking / Danh sach nha cung cap duoc phe duyet voi theo doi chung nhan';

CREATE INDEX IF NOT EXISTS idx_asl_vendor ON approved_supplier_list (vendor_id);
CREATE INDEX IF NOT EXISTS idx_asl_status ON approved_supplier_list (asl_status);
CREATE INDEX IF NOT EXISTS idx_asl_expiry ON approved_supplier_list (expiry_date);

-- ============================================================================
-- scar_records / Ho so SCAR (Supplier Corrective Action Request)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scar_records (
    scar_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    scar_number             VARCHAR(50)     UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    status                  scar_status_enum DEFAULT 'issued',
    priority                scar_priority_enum DEFAULT 'medium',
    issue_date              DATE            NOT NULL,
    acknowledge_due_date    DATE,
    root_cause_due_date     DATE,
    corrective_due_date     DATE,
    verification_due_date   DATE,
    acknowledged_date       DATE,
    root_cause_submitted_date DATE,
    corrective_submitted_date DATE,
    verified_date           DATE,
    closed_date             DATE,
    problem_description     TEXT,
    affected_po_numbers     JSONB,
    affected_parts          JSONB,
    affected_qty            NUMERIC(12,2),
    root_cause_analysis     TEXT,
    corrective_action_plan  TEXT,
    preventive_actions      TEXT,
    verification_result     TEXT,
    verification_effective  BOOLEAN,
    assigned_to_vendor_contact VARCHAR(200),
    assigned_internal       UUID            REFERENCES users(user_id),
    linked_ncr_ids          JSONB,
    linked_incoming_ids     JSONB,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE scar_records IS 'Supplier Corrective Action Requests / Yeu cau hanh dong khac phuc nha cung cap';

CREATE INDEX IF NOT EXISTS idx_scar_records_vendor ON scar_records (vendor_id);
CREATE INDEX IF NOT EXISTS idx_scar_records_status ON scar_records (status);
CREATE INDEX IF NOT EXISTS idx_scar_records_priority ON scar_records (priority);
CREATE INDEX IF NOT EXISTS idx_scar_records_dates ON scar_records (issue_date, corrective_due_date);

-- ============================================================================
-- supplier_audit_schedule / Lich kiem toan nha cung cap
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_audit_schedule (
    audit_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id               VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    audit_type              supplier_eval_type_enum,
    planned_date            DATE,
    actual_date             DATE,
    status                  VARCHAR(30)     DEFAULT 'planned',
    lead_auditor            UUID            REFERENCES users(user_id),
    audit_team              JSONB,
    scope                   TEXT,
    findings_summary        TEXT,
    findings_count_major    INT             DEFAULT 0,
    findings_count_minor    INT             DEFAULT 0,
    findings_count_ofi      INT             DEFAULT 0,
    overall_result          VARCHAR(30),
    next_audit_date         DATE,
    report_reference        VARCHAR(200),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE supplier_audit_schedule IS 'Supplier audit schedule and results / Lich va ket qua kiem toan nha cung cap';

CREATE INDEX IF NOT EXISTS idx_supplier_audit_vendor ON supplier_audit_schedule (vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_audit_status ON supplier_audit_schedule (status);
CREATE INDEX IF NOT EXISTS idx_supplier_audit_dates ON supplier_audit_schedule (planned_date, actual_date);

COMMIT;
