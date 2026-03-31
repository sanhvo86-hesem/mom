-- ============================================================================
-- Migration: 034_exception_management.sql
-- Description: Exception management - complaints, MRB, deviations,
--              concessions, COPQ, escalation
-- Dependencies: 011_quality.sql, 005_record_management.sql
-- Rollback: DROP TABLE escalation_log, escalation_rules, copq_ledger,
--           concessions, deviations, material_review_board,
--           customer_complaints CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE complaint_source_enum AS ENUM (
        'customer_call', 'email', 'portal', 'field_report', 'audit', 'regulatory', 'warranty_claim'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_severity_enum AS ENUM (
        'minor', 'major', 'critical', 'safety'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status_enum AS ENUM (
        'new', 'acknowledged', 'investigating', 'containment', 'root_cause',
        'corrective_action', 'verification', 'closed', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mrb_disposition_enum AS ENUM (
        'use_as_is', 'rework', 'scrap', 'return_to_supplier', 'sort_and_segregate', 'concession_required'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mrb_status_enum AS ENUM (
        'pending_review', 'in_session', 'disposition_decided', 'action_in_progress', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE deviation_type_enum AS ENUM (
        'process', 'material', 'design', 'documentation', 'tooling', 'measurement'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE deviation_status_enum AS ENUM (
        'requested', 'under_review', 'approved', 'rejected', 'expired', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE concession_type_enum AS ENUM (
        'dimensional', 'material', 'surface_finish', 'cosmetic', 'functional', 'documentation'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE concession_status_enum AS ENUM (
        'requested', 'internal_review', 'customer_approval_pending', 'approved', 'rejected', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE copq_category_enum AS ENUM (
        'prevention', 'appraisal', 'internal_failure', 'external_failure'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE escalation_level_enum AS ENUM (
        'L1_supervisor', 'L2_manager', 'L3_director', 'L4_executive'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- customer_complaints / Khieu nai khach hang (8D format)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_complaints (
    complaint_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number        VARCHAR(50)     UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    source                  complaint_source_enum,
    severity                complaint_severity_enum,
    status                  complaint_status_enum DEFAULT 'new',
    subject                 VARCHAR(500),
    description             TEXT,
    affected_so_number      VARCHAR(50),
    affected_part_id        VARCHAR(50),
    affected_qty            NUMERIC(12,2),
    received_date           DATE            NOT NULL,
    acknowledged_date       DATE,
    target_close_date       DATE,
    actual_close_date       DATE,
    assigned_to             UUID            REFERENCES users(user_id),
    d1_team_members         JSONB,
    d2_problem_description  TEXT,
    d3_containment_actions  TEXT,
    d4_root_cause           TEXT,
    d5_corrective_actions   TEXT,
    d6_implementation       TEXT,
    d7_preventive_actions   TEXT,
    d8_closure_notes        TEXT,
    linked_ncr_id           VARCHAR(50),
    linked_capa_id          VARCHAR(50),
    copq_total              NUMERIC(14,2)   DEFAULT 0,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE customer_complaints IS 'Customer complaints with 8D methodology / Khieu nai khach hang theo phuong phap 8D';

CREATE INDEX IF NOT EXISTS idx_customer_complaints_status ON customer_complaints (status);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_customer ON customer_complaints (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_severity ON customer_complaints (severity);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_dates ON customer_complaints (received_date, target_close_date);

-- ============================================================================
-- material_review_board / Hoi dong xem xet vat lieu (MRB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_review_board (
    mrb_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrb_number              VARCHAR(50)     UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    ncr_id                  VARCHAR(50),
    status                  mrb_status_enum DEFAULT 'pending_review',
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    job_number              VARCHAR(50),
    lot_number              VARCHAR(100),
    serial_numbers          JSONB,
    qty_affected            NUMERIC(12,2),
    disposition             mrb_disposition_enum,
    disposition_reason       TEXT,
    disposition_conditions  TEXT,
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    rework_instructions     TEXT,
    rework_completed        BOOLEAN         DEFAULT FALSE,
    scrap_qty               NUMERIC(12,2)   DEFAULT 0,
    scrap_cost              NUMERIC(14,2)   DEFAULT 0,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE material_review_board IS 'Material Review Board dispositions / Quyet dinh cua Hoi dong xem xet vat lieu';

CREATE INDEX IF NOT EXISTS idx_mrb_status ON material_review_board (status);
CREATE INDEX IF NOT EXISTS idx_mrb_ncr ON material_review_board (ncr_id);
CREATE INDEX IF NOT EXISTS idx_mrb_item ON material_review_board (item_id);

-- ============================================================================
-- deviations / Sai lech (cho phep)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deviations (
    deviation_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    deviation_number        VARCHAR(50)     UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    deviation_type          deviation_type_enum,
    status                  deviation_status_enum DEFAULT 'requested',
    title                   VARCHAR(500),
    description             TEXT,
    justification           TEXT,
    risk_assessment         TEXT,
    affected_items          JSONB,
    affected_operations     JSONB,
    requested_by            UUID            REFERENCES users(user_id),
    approved_by             UUID            REFERENCES users(user_id),
    valid_from              DATE,
    valid_to                DATE,
    max_qty                 NUMERIC(12,2),
    actual_qty_used         NUMERIC(12,2)   DEFAULT 0,
    linked_so_number        VARCHAR(50),
    linked_jo_number        VARCHAR(50),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE deviations IS 'Approved deviations from standard process / Sai lech duoc phe duyet khoi quy trinh chuan';

CREATE INDEX IF NOT EXISTS idx_deviations_status ON deviations (status);
CREATE INDEX IF NOT EXISTS idx_deviations_type ON deviations (deviation_type);
CREATE INDEX IF NOT EXISTS idx_deviations_dates ON deviations (valid_from, valid_to);

-- ============================================================================
-- concessions / Nhuong bo (chap nhan sai lech)
-- ============================================================================
CREATE TABLE IF NOT EXISTS concessions (
    concession_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    concession_number       VARCHAR(50)     UNIQUE,
    record_id               VARCHAR(50)     REFERENCES records(record_id),
    concession_type         concession_type_enum,
    status                  concession_status_enum DEFAULT 'requested',
    title                   VARCHAR(500),
    description             TEXT,
    nonconformance_detail   TEXT,
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    customer_contact        VARCHAR(200),
    customer_response       TEXT,
    customer_approved_date  DATE,
    internal_approved_by    UUID            REFERENCES users(user_id),
    internal_approved_at    TIMESTAMPTZ,
    affected_so_number      VARCHAR(50),
    affected_part_id        VARCHAR(50),
    affected_qty            NUMERIC(12,2),
    disposition_instructions TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE concessions IS 'Customer concessions for nonconforming material / Nhuong bo khach hang cho vat lieu khong phu hop';

CREATE INDEX IF NOT EXISTS idx_concessions_status ON concessions (status);
CREATE INDEX IF NOT EXISTS idx_concessions_customer ON concessions (customer_id);
CREATE INDEX IF NOT EXISTS idx_concessions_so ON concessions (affected_so_number);

-- ============================================================================
-- copq_ledger / So chi phi chat luong kem (COPQ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS copq_ledger (
    copq_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    copq_category           copq_category_enum NOT NULL,
    source_type             VARCHAR(30)     NOT NULL,
    source_id               VARCHAR(50),
    description             TEXT,
    amount                  NUMERIC(14,2)   NOT NULL,
    currency                VARCHAR(3)      DEFAULT 'VND',
    cost_center             VARCHAR(50),
    department              dept_code,
    period                  VARCHAR(7)      NOT NULL,
    item_id                 VARCHAR(50),
    job_number              VARCHAR(50),
    vendor_id               VARCHAR(50),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    recorded_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    recorded_by             UUID            REFERENCES users(user_id)
);
COMMENT ON TABLE copq_ledger IS 'Cost of Poor Quality ledger (prevention, appraisal, internal/external failure) / So chi phi chat luong kem';

CREATE INDEX IF NOT EXISTS idx_copq_ledger_category ON copq_ledger (copq_category);
CREATE INDEX IF NOT EXISTS idx_copq_ledger_period ON copq_ledger (period);
CREATE INDEX IF NOT EXISTS idx_copq_ledger_source ON copq_ledger (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_copq_ledger_department ON copq_ledger (department);

-- ============================================================================
-- escalation_rules / Quy tac leo thang
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
    rule_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name               VARCHAR(200),
    rule_name_vi            VARCHAR(200),
    entity_type             VARCHAR(30)     NOT NULL,
    trigger_condition       VARCHAR(50)     NOT NULL,
    trigger_value           VARCHAR(50),
    escalation_level        escalation_level_enum,
    notify_roles            JSONB,
    notify_users            JSONB,
    auto_escalate           BOOLEAN         DEFAULT TRUE,
    is_active               BOOLEAN         DEFAULT TRUE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE escalation_rules IS 'Escalation rules for NCR, complaints, CAPA, SCAR / Quy tac leo thang cho NCR, khieu nai, CAPA, SCAR';

CREATE INDEX IF NOT EXISTS idx_escalation_rules_entity ON escalation_rules (entity_type, is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_trigger ON escalation_rules (trigger_condition);

-- ============================================================================
-- escalation_log / Nhat ky leo thang
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_log (
    log_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id                 UUID            REFERENCES escalation_rules(rule_id),
    entity_type             VARCHAR(30),
    entity_id               VARCHAR(50),
    escalation_level        escalation_level_enum,
    reason                  TEXT,
    escalated_by            UUID            REFERENCES users(user_id),
    notified_users          JSONB,
    acknowledged_at         TIMESTAMPTZ,
    acknowledged_by         UUID            REFERENCES users(user_id),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE escalation_log IS 'Escalation event log / Nhat ky su kien leo thang';

CREATE INDEX IF NOT EXISTS idx_escalation_log_entity ON escalation_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_escalation_log_level ON escalation_log (escalation_level);
CREATE INDEX IF NOT EXISTS idx_escalation_log_created ON escalation_log (created_at);

COMMIT;
