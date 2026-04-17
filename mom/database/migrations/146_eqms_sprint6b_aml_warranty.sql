-- ============================================================================
-- Migration 146: EQMS Sprint 6B — Approved Manufacturer List (AML) + Warranty Claims
-- ============================================================================
-- Purpose:   Add two additional IATF 16949 required quality modules.
--            AML controls which suppliers/manufacturers are approved for each part.
--            Warranty Claims tracks field returns and customer warranty dispositions.
-- Standards: IATF 16949 §8.4.1 (AML), §8.7.1 (warranty/field returns)
-- Author:    System — module-consolidation sprint 6B
-- Date:      2026-04-17
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: eqms_aml_records
-- Approved Manufacturer / Approved Supplier List entries.
-- One row per (part_number, vendor_id) approval.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_aml_records (
    aml_id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    aml_number                  VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Approved item
    part_number                 VARCHAR(120) NOT NULL,
    part_revision               VARCHAR(40),
    part_description            VARCHAR(300),
    item_id                     UUID,
    commodity_code              VARCHAR(80),

    -- Approved manufacturer/supplier
    vendor_id                   VARCHAR(120) NOT NULL,
    manufacturer_name           VARCHAR(300),
    manufacturer_site           VARCHAR(300),
    manufacturer_part_number    VARCHAR(120),
    manufacturer_part_revision  VARCHAR(40),

    -- Approval scope
    approval_type               VARCHAR(40)  NOT NULL DEFAULT 'full',
    approval_basis              TEXT,
    qualification_standard      VARCHAR(200),
    customer_approved           BOOLEAN      NOT NULL DEFAULT FALSE,
    customer_id                 VARCHAR(120),
    customer_approval_ref       VARCHAR(200),

    -- Restrictions / conditions
    restricted                  BOOLEAN      NOT NULL DEFAULT FALSE,
    restrictions_notes          TEXT,
    max_annual_quantity         NUMERIC(14,4),
    max_quantity_unit            VARCHAR(30),

    -- Validity
    effective_date              DATE,
    expiry_date                 DATE,
    renewal_required            BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Qualification evidence
    qualification_fai_id        UUID,
    qualification_ppap_id       UUID,
    qualification_audit_id      UUID,

    -- Approval chain
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    blocked_by                  VARCHAR(120),
    blocked_at                  TIMESTAMPTZ,
    blocked_reason              TEXT,
    obsoleted_by                VARCHAR(120),
    obsoleted_at                TIMESTAMPTZ,

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'draft',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_aml_status
    ON eqms_aml_records (status);
CREATE INDEX IF NOT EXISTS idx_aml_part
    ON eqms_aml_records (part_number);
CREATE INDEX IF NOT EXISTS idx_aml_vendor
    ON eqms_aml_records (vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aml_part_vendor_active
    ON eqms_aml_records (part_number, vendor_id, status)
    WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_aml_created
    ON eqms_aml_records (created_at DESC);

COMMENT ON TABLE eqms_aml_records
    IS 'IATF 16949 §8.4.1 — Approved Manufacturer/Supplier List entries per part-vendor combination.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: eqms_warranty_claims
-- Customer warranty and field return claims.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_warranty_claims (
    claim_id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number                VARCHAR(80)  NOT NULL UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    description                 TEXT         NOT NULL DEFAULT '',

    -- Claim origin
    claim_type                  VARCHAR(40)  NOT NULL DEFAULT 'warranty',
    claim_source                VARCHAR(40)  NOT NULL DEFAULT 'customer',
    customer_id                 VARCHAR(120),
    customer_name               VARCHAR(300),
    customer_claim_ref          VARCHAR(200),
    claim_date                  DATE         NOT NULL,

    -- Failed item
    part_number                 VARCHAR(120),
    part_revision               VARCHAR(40),
    serial_number               VARCHAR(200),
    lot_number                  VARCHAR(120),
    quantity_claimed            NUMERIC(14,4),
    quantity_unit               VARCHAR(30),
    failure_description         TEXT         NOT NULL DEFAULT '',
    failure_mode                VARCHAR(200),
    failure_date                DATE,
    failure_mileage             INTEGER,
    vehicle_vin                 VARCHAR(50),

    -- Financial
    claim_amount                NUMERIC(14,2),
    claim_currency              CHAR(3)      DEFAULT 'USD',
    approved_amount             NUMERIC(14,2),
    debit_note_ref              VARCHAR(120),

    -- Disposition
    disposition                 VARCHAR(40),
    return_required             BOOLEAN      NOT NULL DEFAULT FALSE,
    return_tracking_number      VARCHAR(120),
    return_received_date        DATE,
    parts_returned              BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Root cause & containment
    root_cause_category         VARCHAR(100),
    root_cause_description      TEXT,
    containment_action          TEXT,
    corrective_action_ref       VARCHAR(200),
    linked_ncr_id               UUID,
    linked_capa_id              UUID,
    linked_scar_id              UUID,

    -- 8D linkage
    eight_d_ref                 VARCHAR(120),

    -- Closure
    closed_by                   VARCHAR(120),
    closed_at                   TIMESTAMPTZ,
    closure_notes               TEXT,
    customer_acceptance_ref     VARCHAR(200),

    -- Standard audit fields
    status                      VARCHAR(40)  NOT NULL DEFAULT 'open',
    version                     INTEGER      NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120) NOT NULL,
    updated_at                  TIMESTAMPTZ  DEFAULT now(),
    updated_by                  VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_warranty_status
    ON eqms_warranty_claims (status);
CREATE INDEX IF NOT EXISTS idx_warranty_customer
    ON eqms_warranty_claims (customer_id)
    WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_part
    ON eqms_warranty_claims (part_number)
    WHERE part_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_lot
    ON eqms_warranty_claims (lot_number)
    WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_created
    ON eqms_warranty_claims (created_at DESC);

COMMENT ON TABLE eqms_warranty_claims
    IS 'IATF 16949 §8.7.1 — Customer warranty and field return claims with 8D traceability.';

-- ─────────────────────────────────────────────────────────────────────────────
-- MDM seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- AML approval type
INSERT INTO mdm_reference_codes (code_set, display_name, is_active, sort_order)
VALUES ('eqms.aml_approval_type', 'AML Approval Type', TRUE, 130)
ON CONFLICT (code_set) DO NOTHING;

INSERT INTO mdm_reference_code_values (code_set, code_value, display_label, sort_order)
VALUES
    ('eqms.aml_approval_type', 'full',          'Full Approval',           10),
    ('eqms.aml_approval_type', 'conditional',   'Conditional Approval',    20),
    ('eqms.aml_approval_type', 'developmental', 'Developmental',           30),
    ('eqms.aml_approval_type', 'prototype',     'Prototype Only',          40)
ON CONFLICT DO NOTHING;

-- Warranty claim type
INSERT INTO mdm_reference_codes (code_set, display_name, is_active, sort_order)
VALUES ('eqms.warranty_claim_type', 'Warranty Claim Type', TRUE, 140)
ON CONFLICT (code_set) DO NOTHING;

INSERT INTO mdm_reference_code_values (code_set, code_value, display_label, sort_order)
VALUES
    ('eqms.warranty_claim_type', 'warranty',        'Warranty Claim',          10),
    ('eqms.warranty_claim_type', 'goodwill',        'Goodwill Adjustment',     20),
    ('eqms.warranty_claim_type', 'field_return',    'Field Return',            30),
    ('eqms.warranty_claim_type', 'recall',          'Product Recall',          40),
    ('eqms.warranty_claim_type', 'debit_note',      'Debit Note',              50)
ON CONFLICT DO NOTHING;

-- Warranty failure mode categories
INSERT INTO mdm_reference_codes (code_set, display_name, is_active, sort_order)
VALUES ('eqms.warranty_failure_mode', 'Warranty Failure Mode', TRUE, 141)
ON CONFLICT (code_set) DO NOTHING;

INSERT INTO mdm_reference_code_values (code_set, code_value, display_label, sort_order)
VALUES
    ('eqms.warranty_failure_mode', 'dimensional',      'Dimensional / Fit',       10),
    ('eqms.warranty_failure_mode', 'material',         'Material / Chemistry',    20),
    ('eqms.warranty_failure_mode', 'surface',          'Surface / Appearance',    30),
    ('eqms.warranty_failure_mode', 'functional',       'Functional Failure',      40),
    ('eqms.warranty_failure_mode', 'assembly',         'Assembly Error',          50),
    ('eqms.warranty_failure_mode', 'packaging',        'Packaging / Labeling',    60),
    ('eqms.warranty_failure_mode', 'unknown',          'Unknown',                 99)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '[Migration 146] Sprint 6B: eqms_aml_records and eqms_warranty_claims created with indexes and MDM seed data.';
END;
$$;

COMMIT;
