-- ============================================================================
-- Migration 143: EQMS Sprint 6A — Concessions, FAI Reports, Special Characteristics
-- ============================================================================
-- Purpose:   Add three IATF 16949 mandatory quality modules to the EQMS suite.
--            These modules were previously stubs with no tables or routes.
-- Standards: IATF 16949 §8.7 (concessions), §8.3.5 (FAI), §8.3.5.2 (SC)
-- Author:    System — module-consolidation sprint 6A
-- Date:      2026-04-17
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: eqms_concession_records
-- Material and process deviation/concession dispositions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_concession_records (
    concession_id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    concession_number           VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Classification
    concession_type             VARCHAR(40)  NOT NULL DEFAULT 'material',
    disposition                 VARCHAR(40)  NOT NULL DEFAULT 'use_as_is',

    -- Affected material / lot
    affected_part_number        VARCHAR(120),
    affected_part_revision      VARCHAR(40),
    affected_lot_number         VARCHAR(120),
    quantity_affected           NUMERIC(14,4),
    quantity_unit               VARCHAR(30),
    affected_process            VARCHAR(200),

    -- Source linkage
    source_ncr_id               UUID,
    source_ncr_number           VARCHAR(80),
    nonconformance_description  TEXT         NOT NULL DEFAULT '',

    -- Disposition details
    proposed_disposition        TEXT         NOT NULL DEFAULT '',
    disposition_rationale       TEXT         NOT NULL DEFAULT '',
    containment_action          TEXT,
    rework_instructions         TEXT,

    -- Customer approval
    customer_approval_required  BOOLEAN      NOT NULL DEFAULT FALSE,
    customer_id                 VARCHAR(120),
    customer_approval_ref       VARCHAR(200),
    customer_approval_date      DATE,
    customer_approver           VARCHAR(120),

    -- Engineering approval
    engineering_approved_by     VARCHAR(120),
    engineering_approved_at     TIMESTAMPTZ,

    -- Validity
    effective_date              DATE,
    expiry_date                 DATE,
    max_quantity                NUMERIC(14,4),
    quantity_used               NUMERIC(14,4) NOT NULL DEFAULT 0,

    -- Regulaory
    requires_ncr                BOOLEAN      NOT NULL DEFAULT FALSE,
    regulatory_notification_required BOOLEAN NOT NULL DEFAULT FALSE,
    regulatory_ref              VARCHAR(200),

    -- Signatures (e-sig references)
    submitted_by                VARCHAR(120),
    submitted_at                TIMESTAMPTZ,
    reviewed_by                 VARCHAR(120),
    reviewed_at                 TIMESTAMPTZ,
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    rejected_reason             TEXT,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_concession_status
    ON eqms_concession_records (status);
CREATE INDEX IF NOT EXISTS idx_concession_part
    ON eqms_concession_records (affected_part_number)
    WHERE affected_part_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concession_lot
    ON eqms_concession_records (affected_lot_number)
    WHERE affected_lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concession_ncr
    ON eqms_concession_records (source_ncr_id)
    WHERE source_ncr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concession_created
    ON eqms_concession_records (created_at DESC);

COMMENT ON TABLE eqms_concession_records
    IS 'IATF 16949 §8.7 — Material/process concession and deviation dispositions.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: eqms_fai_reports
-- First Article Inspection reports per AS9102B / IATF 16949 §8.3.5.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_fai_reports (
    fai_id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    fai_number                  VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Subject
    part_number                 VARCHAR(120) NOT NULL,
    part_revision               VARCHAR(40),
    part_description            VARCHAR(300),
    drawing_number              VARCHAR(120),
    drawing_revision            VARCHAR(40),

    -- Parties
    vendor_id                   VARCHAR(120),
    supplier_name               VARCHAR(200),
    customer_id                 VARCHAR(120),
    customer_name               VARCHAR(200),
    internal_part               BOOLEAN      NOT NULL DEFAULT TRUE,

    -- FAI classification
    fai_type                    VARCHAR(40)  NOT NULL DEFAULT 'full',
    fai_reason                  VARCHAR(200),
    previous_fai_id             UUID,
    ballooned_drawing_ref       VARCHAR(300),

    -- Inspection scope
    inspection_date             DATE,
    inspector                   VARCHAR(120),
    inspection_location         VARCHAR(200),
    characteristic_count        INTEGER      NOT NULL DEFAULT 0,
    pass_count                  INTEGER      NOT NULL DEFAULT 0,
    fail_count                  INTEGER      NOT NULL DEFAULT 0,
    open_discrepancy_count      INTEGER      NOT NULL DEFAULT 0,

    -- Result
    overall_result              VARCHAR(40),
    conditional_approval_ref    VARCHAR(200),

    -- PPAP linkage (AS9102B §1.1)
    ppap_level                  INTEGER,
    ppap_submission_id          UUID,

    -- Regulatory
    requires_esig               BOOLEAN      NOT NULL DEFAULT FALSE,
    regulatory_basis            VARCHAR(200),

    -- Approval chain
    submitted_by                VARCHAR(120),
    submitted_at                TIMESTAMPTZ,
    reviewed_by                 VARCHAR(120),
    reviewed_at                 TIMESTAMPTZ,
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    rejected_reason             TEXT,
    revision_required_notes     TEXT,

    -- Inline characteristic data (JSON for compact storage; detail rows in eqms_fai_characteristics)
    characteristics_summary     JSONB        NOT NULL DEFAULT '[]'::jsonb,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_fai_status
    ON eqms_fai_reports (status);
CREATE INDEX IF NOT EXISTS idx_fai_part
    ON eqms_fai_reports (part_number);
CREATE INDEX IF NOT EXISTS idx_fai_vendor
    ON eqms_fai_reports (vendor_id)
    WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fai_created
    ON eqms_fai_reports (created_at DESC);

COMMENT ON TABLE eqms_fai_reports
    IS 'IATF 16949 §8.3.5 / AS9102B — First Article Inspection reports.';

-- FAI characteristic line items (separate table for large FAI packages)
CREATE TABLE IF NOT EXISTS eqms_fai_characteristics (
    char_id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    fai_id                      UUID         NOT NULL REFERENCES eqms_fai_reports(fai_id) ON DELETE CASCADE,
    balloon_number              VARCHAR(20),
    characteristic_name         VARCHAR(300) NOT NULL,
    characteristic_type         VARCHAR(40),
    nominal_value               NUMERIC(18,6),
    tolerance_upper             NUMERIC(18,6),
    tolerance_lower             NUMERIC(18,6),
    unit_of_measure             VARCHAR(30),
    measurement_method          VARCHAR(200),
    measured_value              NUMERIC(18,6),
    measurement_tool_id         VARCHAR(120),
    result                      VARCHAR(20),
    discrepancy_notes           TEXT,
    sort_order                  INTEGER      NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fai_char_fai_id
    ON eqms_fai_characteristics (fai_id);

COMMENT ON TABLE eqms_fai_characteristics
    IS 'Line-item characteristic measurements for an FAI report (AS9102B Form 2/3).';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: eqms_special_characteristics
-- Key Product Characteristics (KPC/KCC/SC/CC) per IATF 16949 §8.3.5.2.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_special_characteristics (
    sc_id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sc_number                   VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Classification
    characteristic_type         VARCHAR(40)  NOT NULL DEFAULT 'SC',
    symbol                      VARCHAR(20),
    safety_critical             BOOLEAN      NOT NULL DEFAULT FALSE,
    regulatory_basis            VARCHAR(200),

    -- Subject
    part_number                 VARCHAR(120) NOT NULL,
    part_revision               VARCHAR(40),
    part_description            VARCHAR(300),
    process_name                VARCHAR(200),
    operation_number            VARCHAR(40),
    drawing_number              VARCHAR(120),
    balloon_number              VARCHAR(20),

    -- Specification
    characteristic_name         VARCHAR(300) NOT NULL,
    nominal_value               NUMERIC(18,6),
    tolerance_upper             NUMERIC(18,6),
    tolerance_lower             NUMERIC(18,6),
    unit_of_measure             VARCHAR(30),
    target_value                NUMERIC(18,6),

    -- Control requirements
    control_method              VARCHAR(200),
    measurement_system          VARCHAR(200),
    gage_id                     VARCHAR(120),
    measurement_frequency       VARCHAR(100),
    sample_size                 INTEGER,
    reaction_plan               TEXT,

    -- Capability requirements
    cpk_requirement             NUMERIC(6,3),
    ppk_requirement             NUMERIC(6,3),
    current_cpk                 NUMERIC(6,3),
    last_capability_study_date  DATE,

    -- Control plan linkage
    control_plan_id             UUID,
    control_plan_ref            VARCHAR(120),
    pfmea_id                    UUID,
    pfmea_ref                   VARCHAR(120),

    -- Customer requirement
    customer_id                 VARCHAR(120),
    customer_requirement_ref    VARCHAR(200),
    customer_symbol             VARCHAR(40),

    -- Approval chain
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    obsoleted_by                VARCHAR(120),
    obsoleted_at                TIMESTAMPTZ,
    obsolete_reason             TEXT,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_sc_status
    ON eqms_special_characteristics (status);
CREATE INDEX IF NOT EXISTS idx_sc_part
    ON eqms_special_characteristics (part_number);
CREATE INDEX IF NOT EXISTS idx_sc_type
    ON eqms_special_characteristics (characteristic_type);
CREATE INDEX IF NOT EXISTS idx_sc_safety_critical
    ON eqms_special_characteristics (safety_critical)
    WHERE safety_critical = TRUE;
CREATE INDEX IF NOT EXISTS idx_sc_created
    ON eqms_special_characteristics (created_at DESC);

COMMENT ON TABLE eqms_special_characteristics
    IS 'IATF 16949 §8.3.5.2 — Key Product/Control Characteristics (KPC/KCC/SC/CC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- MDM seed data: reference code sets for all three modules
-- ─────────────────────────────────────────────────────────────────────────────

-- Concession types
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.concession_type',
    'Concession Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 100, 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.concession_type', 'material',      'Material Concession', 10),
        ('eqms.concession_type', 'process',       'Process Deviation', 20),
        ('eqms.concession_type', 'design',        'Design Deviation', 30),
        ('eqms.concession_type', 'documentation', 'Documentation Waiver', 40),
        ('eqms.concession_type', 'other',         'Other', 99)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- Concession disposition
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.concession_disposition',
    'Concession Disposition',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 101, 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.concession_disposition', 'use_as_is',        'Use As-Is', 10),
        ('eqms.concession_disposition', 'rework',           'Rework', 20),
        ('eqms.concession_disposition', 'repair',           'Repair', 30),
        ('eqms.concession_disposition', 'sort',             'Sort/Screen', 40),
        ('eqms.concession_disposition', 'scrap',            'Scrap', 50),
        ('eqms.concession_disposition', 'return_to_vendor', 'Return to Vendor', 60),
        ('eqms.concession_disposition', 're_grade',         'Re-grade/Re-classify', 70),
        ('eqms.concession_disposition', 'pending',          'Pending Disposition', 80)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- FAI type
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.fai_type',
    'FAI Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 110, 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.fai_type', 'full',            'Full FAI', 10),
        ('eqms.fai_type', 'partial',         'Partial FAI', 20),
        ('eqms.fai_type', 're_fai',          'Re-FAI', 30),
        ('eqms.fai_type', 'delta_fai',       'Delta FAI', 40),
        ('eqms.fai_type', 'design_change',   'Design Change FAI', 50),
        ('eqms.fai_type', 'supplier_change', 'Supplier Change FAI', 60)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- FAI overall result
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.fai_result',
    'FAI Result',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 111, 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.fai_result', 'pass',                 'Pass', 10),
        ('eqms.fai_result', 'fail',                 'Fail', 20),
        ('eqms.fai_result', 'conditional_approval', 'Conditional Approval', 30),
        ('eqms.fai_result', 'pending',              'Pending', 40)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- Special characteristic type
INSERT INTO mdm_reference_codes (code_set, description, metadata)
VALUES (
    'eqms.sc_type',
    'Special Characteristic Type',
    jsonb_build_object('domain', 'eqms', 'is_active', true, 'sort_order', 120, 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
)
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

WITH seed(code_set, code_value, value_label, sort_order) AS (
    VALUES
        ('eqms.sc_type', 'KPC',   'Key Product Characteristic (KPC)', 10),
        ('eqms.sc_type', 'KCC',   'Key Control Characteristic (KCC)', 20),
        ('eqms.sc_type', 'SC',    'Special Characteristic (SC)', 30),
        ('eqms.sc_type', 'CC',    'Critical Characteristic (CC)', 40),
        ('eqms.sc_type', 'SL',    'Safety/Legal (SL)', 50),
        ('eqms.sc_type', 'other', 'Other', 99)
)
INSERT INTO mdm_reference_code_values (mdm_reference_code_id, code_value, value_label, sort_order, metadata)
SELECT c.mdm_reference_code_id, s.code_value, s.value_label, s.sort_order,
       jsonb_build_object('domain', 'eqms', 'seed_migration', '145_eqms_sprint6a_concessions_fai_sc')
FROM seed s
JOIN mdm_reference_codes c ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '[Migration 143] Sprint 6A: eqms_concession_records, eqms_fai_reports, eqms_fai_characteristics, eqms_special_characteristics created with indexes and MDM seed data.';
END;
$$;

COMMIT;
