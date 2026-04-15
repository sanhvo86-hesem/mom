-- ============================================================================
-- Migration 136: EQMS World-Class Surface Tables
-- ============================================================================
-- Purpose:
--   Add the new tables required for the world-class EQMS expansion in MOM v4.0.
--   Covers: cross-cutting infrastructure (comments, attachments, record-links,
--   signatures, export jobs), plus net-new modules: formal change controls,
--   deviations (expanded), customer complaints (eqms surface), NCR (eqms surface),
--   CAPA (eqms surface), documents (eqms surface), training (eqms surface),
--   audits (eqms surface), supplier quality profiles, quality agreements,
--   supplier audits, SCARs, risk register, MSA studies, lab investigations,
--   batch release, validation projects, field actions, and SPC extensions.
--
-- Dependencies:
--   078_canonical_eqms_compliance_backbone.sql  (document, nonconformance, capa, audit, training, complaint)
--   101_eqms_control_plane_foundation.sql        (audit_events, e-sig, domain_outbox_events)
--
-- Data safety: Additive only. All statements use IF NOT EXISTS / DO NOTHING.
--
-- Rollback (reverse order):
--   DROP TABLE eqms_spc_violation_acks, eqms_field_actions, eqms_batch_release,
--   eqms_validation_executions, eqms_validation_protocols, eqms_validation_requirements,
--   eqms_validation_projects, eqms_lab_investigations, eqms_msa_records,
--   eqms_calibration_records, eqms_risks_controls, eqms_risk_register,
--   eqms_scars, eqms_supplier_audits, eqms_supplier_qualification_events,
--   eqms_quality_agreements, eqms_supplier_profiles, eqms_audit_findings,
--   eqms_audits, eqms_training_matrix, eqms_training_curricula, eqms_training_records,
--   eqms_document_acknowledgements, eqms_controlled_copies, eqms_documents,
--   eqms_capa_records, eqms_ncr_records, eqms_engineering_changes,
--   eqms_change_controls, eqms_deviations, eqms_complaints,
--   eqms_export_jobs, eqms_signatures, eqms_record_links, eqms_attachments,
--   eqms_comments CASCADE;
-- ============================================================================

BEGIN;

-- ── Cross-cutting EQMS Infrastructure ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_comments (
    comment_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      VARCHAR(60) NOT NULL,
    entity_id        UUID        NOT NULL,
    text             TEXT        NOT NULL,
    author           VARCHAR(120) NOT NULL,
    is_internal      BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_comments_entity ON eqms_comments (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eqms_attachments (
    attachment_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      VARCHAR(60) NOT NULL,
    entity_id        UUID        NOT NULL,
    filename         VARCHAR(512) NOT NULL,
    storage_ref      TEXT        NOT NULL,
    mime_type        VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes       BIGINT      NOT NULL DEFAULT 0,
    uploaded_by      VARCHAR(120) NOT NULL,
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_attachments_entity ON eqms_attachments (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS eqms_record_links (
    link_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type      VARCHAR(60) NOT NULL,
    source_id        UUID        NOT NULL,
    target_type      VARCHAR(60) NOT NULL,
    target_id        UUID        NOT NULL,
    relationship_type VARCHAR(80) NOT NULL DEFAULT 'related',
    linked_by        VARCHAR(120) NOT NULL,
    linked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_eqms_record_links_source ON eqms_record_links (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_eqms_record_links_target ON eqms_record_links (target_type, target_id);

CREATE TABLE IF NOT EXISTS eqms_signatures (
    signature_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      VARCHAR(60) NOT NULL,
    entity_id        UUID        NOT NULL,
    signer           VARCHAR(120) NOT NULL,
    signing_role     VARCHAR(120),
    reason           TEXT        NOT NULL,
    signed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address       INET
);
CREATE INDEX IF NOT EXISTS idx_eqms_signatures_entity ON eqms_signatures (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS eqms_export_jobs (
    job_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module           VARCHAR(80) NOT NULL,
    entity_id        UUID,
    format           VARCHAR(20) NOT NULL DEFAULT 'pdf',
    requested_by     VARCHAR(120) NOT NULL,
    requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at     TIMESTAMPTZ,
    download_url     TEXT,
    status           VARCHAR(30) NOT NULL DEFAULT 'queued',
    job_params       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    error_message    TEXT
);
CREATE INDEX IF NOT EXISTS idx_eqms_export_jobs_status ON eqms_export_jobs (status, requested_at DESC);

-- ── Customer Complaints (EQMS surface) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_complaints (
    complaint_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number     VARCHAR(80) NOT NULL UNIQUE,
    customer_id          UUID,
    customer_name        VARCHAR(255),
    source               VARCHAR(60) NOT NULL DEFAULT 'customer',   -- customer/field/distributor/internal
    severity             VARCHAR(30) NOT NULL DEFAULT 'minor',       -- minor/major/critical
    category             VARCHAR(80),
    subject              VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    affected_product_id  UUID,
    affected_lot_number  VARCHAR(120),
    affected_qty         NUMERIC(18,4),
    received_date        DATE        NOT NULL,
    assigned_to          VARCHAR(120),
    department           VARCHAR(80),
    priority             VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date             DATE,
    containment_action   TEXT,
    root_cause           TEXT,
    corrective_action    TEXT,
    preventive_action    TEXT,
    customer_response    TEXT,
    response_sent_at     TIMESTAMPTZ,
    linked_capa_id       UUID,
    linked_field_action_id UUID,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    -- 8D fields
    d1_team              JSONB,
    d2_problem           TEXT,
    d3_containment       TEXT,
    d4_root_cause        TEXT,
    d5_corrective        TEXT,
    d6_implementation    TEXT,
    d7_preventive        TEXT,
    d8_recognition       TEXT,
    --
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_complaints_status   ON eqms_complaints (status, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_complaints_customer ON eqms_complaints (customer_id);

-- ── Deviations / Quality Events ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_deviations (
    deviation_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    deviation_number     VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    severity             VARCHAR(30) NOT NULL DEFAULT 'minor',
    deviation_type       VARCHAR(30) NOT NULL DEFAULT 'unplanned',  -- planned/unplanned/emergency
    department           VARCHAR(80),
    affected_process     VARCHAR(255),
    batch_id             UUID,                                       -- optional batch linkage
    batch_number         VARCHAR(120),
    detected_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    detected_by          VARCHAR(120),
    containment_action   TEXT,
    investigation_summary TEXT,
    root_cause           TEXT,
    linked_capa_id       UUID,
    linked_change_control_id UUID,
    voided_reason        TEXT,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_deviations_status ON eqms_deviations (status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_deviations_batch  ON eqms_deviations (batch_id) WHERE batch_id IS NOT NULL;

-- ── NCR Records (EQMS world-class surface) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_ncr_records (
    ncr_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ncr_number           VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    severity             VARCHAR(30) NOT NULL DEFAULT 'minor',
    source               VARCHAR(60) NOT NULL DEFAULT 'production',  -- production/receiving/customer/audit/process
    item_id              UUID,
    job_number           VARCHAR(80),
    lot_number           VARCHAR(120),
    qty_affected         NUMERIC(18,4),
    detected_by          VARCHAR(120),
    detected_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    containment_action   TEXT,
    root_cause           TEXT,
    disposition          VARCHAR(40),                                 -- rework/repair/use_as_is/return_to_vendor/scrap
    disposition_reason   TEXT,
    engineering_justification TEXT,
    mrb_decision         JSONB,
    assigned_to          VARCHAR(120),
    linked_capa_id       UUID,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_ncr_records_status ON eqms_ncr_records (status, detected_at DESC);

-- ── CAPA Records (EQMS world-class surface) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_capa_records (
    capa_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_number          VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    source_type          VARCHAR(60) NOT NULL DEFAULT 'other',       -- ncr/complaint/audit/deviation/spc/other
    source_id            UUID,
    severity             VARCHAR(30) NOT NULL DEFAULT 'minor',
    root_cause_method    VARCHAR(60),                                 -- 5why/fishbone/fault_tree/other
    root_cause_description TEXT,
    action_plan          JSONB       NOT NULL DEFAULT '[]'::jsonb,   -- array of {desc, responsible, due_date, status}
    assigned_to          VARCHAR(120),
    due_date             DATE,
    effectiveness_criteria TEXT,
    effectiveness_result TEXT,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    verification_evidence TEXT,
    cancelled_reason     TEXT,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_capa_records_status    ON eqms_capa_records (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_capa_records_source    ON eqms_capa_records (source_type, source_id) WHERE source_id IS NOT NULL;

-- ── Formal Change Controls ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_change_controls (
    change_control_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    change_control_number VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    change_type          VARCHAR(60) NOT NULL DEFAULT 'process',     -- quality/regulatory/process/product/system/facility
    change_category      VARCHAR(30) NOT NULL DEFAULT 'minor',       -- major/minor/administrative
    justification        TEXT,
    risk_level           VARCHAR(20),                                 -- high/medium/low
    impact_assessment    JSONB,
    approval_route       JSONB       NOT NULL DEFAULT '[]'::jsonb,   -- [{user_id, role, required}]
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    implementation_plan  TEXT,
    implementation_date  DATE,
    linked_document_ids  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    training_impact_ids  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    effectiveness_criteria TEXT,
    effectiveness_result TEXT,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_change_controls_status ON eqms_change_controls (status, created_at DESC);

-- ── Engineering Changes (EQMS world-class surface) ───────────────────────────

CREATE TABLE IF NOT EXISTS eqms_engineering_changes (
    ec_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ec_number            VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    description          TEXT        NOT NULL,
    change_category      VARCHAR(60) NOT NULL DEFAULT 'process',     -- design/material/process/tooling/supplier
    reason               TEXT,
    affected_parts       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    affected_bom_ids     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    affected_docs        JSONB       NOT NULL DEFAULT '[]'::jsonb,
    assessment_notes     TEXT,
    assessor             VARCHAR(120),
    assessed_at          TIMESTAMPTZ,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    implementation_notes TEXT,
    effective_date       DATE,
    cancellation_reason  TEXT,
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_engineering_changes_status ON eqms_engineering_changes (status, created_at DESC);

-- ── Documents (QualityDocs-grade EQMS surface) ───────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_documents (
    doc_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_number           VARCHAR(80) NOT NULL UNIQUE,
    title                VARCHAR(512) NOT NULL,
    document_type        VARCHAR(60) NOT NULL DEFAULT 'SOP',         -- SOP/WI/form/policy/spec/record
    department           VARCHAR(80),
    owner                VARCHAR(120),
    revision_code        VARCHAR(20) NOT NULL DEFAULT '00',
    effective_date       DATE,
    expiry_date          DATE,
    storage_ref          TEXT,
    template_id          UUID,
    acknowledgement_required BOOLEAN NOT NULL DEFAULT false,
    content_hash         VARCHAR(128),
    checked_out_by       VARCHAR(120),
    checked_out_at       TIMESTAMPTZ,
    released_by          VARCHAR(120),
    released_at          TIMESTAMPTZ,
    superseded_by        UUID,
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_documents_status      ON eqms_documents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_documents_type_dept   ON eqms_documents (document_type, department);

CREATE TABLE IF NOT EXISTS eqms_controlled_copies (
    copy_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id               UUID        NOT NULL REFERENCES eqms_documents(doc_id),
    copy_number          VARCHAR(80) NOT NULL,
    revision_code        VARCHAR(20) NOT NULL,
    issued_to            VARCHAR(120),
    issued_location      VARCHAR(255),
    issued_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_by            VARCHAR(120),
    retrieved_at         TIMESTAMPTZ,
    status               VARCHAR(30) NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_eqms_controlled_copies_doc ON eqms_controlled_copies (doc_id);

CREATE TABLE IF NOT EXISTS eqms_document_acknowledgements (
    ack_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id               UUID        NOT NULL REFERENCES eqms_documents(doc_id),
    employee_id          VARCHAR(120) NOT NULL,
    employee_name        VARCHAR(255),
    required_by          DATE,
    acknowledged_at      TIMESTAMPTZ,
    acknowledgement_method VARCHAR(60) DEFAULT 'portal',
    status               VARCHAR(30) NOT NULL DEFAULT 'pending',
    UNIQUE (doc_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_eqms_doc_acks_doc      ON eqms_document_acknowledgements (doc_id);
CREATE INDEX IF NOT EXISTS idx_eqms_doc_acks_employee ON eqms_document_acknowledgements (employee_id, status);

-- ── Training & Competency (EQMS world-class surface) ─────────────────────────

CREATE TABLE IF NOT EXISTS eqms_training_curricula (
    curriculum_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_name      VARCHAR(255) NOT NULL,
    department           VARCHAR(80),
    applicable_roles     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    effective_date       DATE,
    doc_ids              JSONB       NOT NULL DEFAULT '[]'::jsonb,
    renewal_interval_days INTEGER,
    status               VARCHAR(30) NOT NULL DEFAULT 'active',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eqms_training_records (
    training_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    training_number      VARCHAR(80) NOT NULL UNIQUE,
    employee_id          VARCHAR(120) NOT NULL,
    employee_name        VARCHAR(255),
    curriculum_id        UUID        REFERENCES eqms_training_curricula(curriculum_id),
    document_id          UUID        REFERENCES eqms_documents(doc_id),
    document_revision    VARCHAR(20),
    training_type        VARCHAR(60) NOT NULL DEFAULT 'read_and_sign', -- read_and_sign/instructor_led/online/on_the_job/exam
    assigned_by          VARCHAR(120),
    assigned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date             DATE,
    completed_at         TIMESTAMPTZ,
    completion_method    VARCHAR(80),
    assessment_score     NUMERIC(5,2),
    assessment_passed    BOOLEAN,
    effectiveness_criteria TEXT,
    effectiveness_result TEXT,
    waiver_reason        TEXT,
    waiver_approved_by   VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'assigned',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_training_records_employee   ON eqms_training_records (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_eqms_training_records_curriculum ON eqms_training_records (curriculum_id);
CREATE INDEX IF NOT EXISTS idx_eqms_training_records_due        ON eqms_training_records (due_date) WHERE status NOT IN ('completed','verified','expired','waived');

CREATE TABLE IF NOT EXISTS eqms_training_matrix (
    matrix_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          VARCHAR(120) NOT NULL,
    curriculum_id        UUID        NOT NULL REFERENCES eqms_training_curricula(curriculum_id),
    required             BOOLEAN     NOT NULL DEFAULT true,
    completion_status    VARCHAR(30) NOT NULL DEFAULT 'not_started',
    last_completed_at    TIMESTAMPTZ,
    next_due_at          TIMESTAMPTZ,
    UNIQUE (employee_id, curriculum_id)
);
CREATE INDEX IF NOT EXISTS idx_eqms_training_matrix_employee ON eqms_training_matrix (employee_id);

-- ── Audit Management (EQMS world-class surface) ──────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_audits (
    audit_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_number         VARCHAR(80) NOT NULL UNIQUE,
    audit_type           VARCHAR(30) NOT NULL DEFAULT 'internal',    -- internal/external/supplier/regulatory
    scope                TEXT,
    standard_ref         VARCHAR(80),                                 -- ISO9001/AS9100/IATF/FDA/custom
    lead_auditor         VARCHAR(120),
    team_members         JSONB       NOT NULL DEFAULT '[]'::jsonb,
    auditee_dept         VARCHAR(80),
    planned_date         DATE,
    actual_start         TIMESTAMPTZ,
    actual_end           TIMESTAMPTZ,
    audit_report_ref     TEXT,
    status               VARCHAR(40) NOT NULL DEFAULT 'planned',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_audits_status ON eqms_audits (status, planned_date DESC);

CREATE TABLE IF NOT EXISTS eqms_audit_findings (
    finding_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id             UUID        NOT NULL REFERENCES eqms_audits(audit_id),
    finding_number       VARCHAR(20) NOT NULL,
    category             VARCHAR(30) NOT NULL DEFAULT 'minor',       -- major/minor/observation/opportunity
    description          TEXT        NOT NULL,
    clause_reference     VARCHAR(120),
    evidence             TEXT,
    response_required_by DATE,
    responsible_party    VARCHAR(120),
    response             TEXT,
    response_by          VARCHAR(120),
    closed_at            TIMESTAMPTZ,
    status               VARCHAR(30) NOT NULL DEFAULT 'open',
    UNIQUE (audit_id, finding_number)
);
CREATE INDEX IF NOT EXISTS idx_eqms_audit_findings_audit  ON eqms_audit_findings (audit_id, status);

-- ── Supplier Quality Network ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_supplier_profiles (
    supplier_profile_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id            UUID        NOT NULL UNIQUE,
    qualification_status VARCHAR(30) NOT NULL DEFAULT 'under_review', -- qualified/conditional/disqualified/under_review
    qualification_date   DATE,
    requalification_due  DATE,
    risk_tier            VARCHAR(20) NOT NULL DEFAULT 'medium',       -- high/medium/low
    approved_categories  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    quality_agreement_ids JSONB      NOT NULL DEFAULT '[]'::jsonb,
    notes                TEXT,
    disqualification_reason TEXT,
    version              INTEGER     NOT NULL DEFAULT 1,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by           VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_profiles_status ON eqms_supplier_profiles (qualification_status);

CREATE TABLE IF NOT EXISTS eqms_supplier_qualification_events (
    event_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_profile_id  UUID        NOT NULL REFERENCES eqms_supplier_profiles(supplier_profile_id),
    event_type           VARCHAR(60) NOT NULL,                        -- qualified/disqualified/requalified
    event_date           DATE        NOT NULL,
    recorded_by          VARCHAR(120),
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_qual_events ON eqms_supplier_qualification_events (supplier_profile_id, event_date DESC);

CREATE TABLE IF NOT EXISTS eqms_quality_agreements (
    agreement_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_number     VARCHAR(80) NOT NULL UNIQUE,
    vendor_id            UUID        NOT NULL,
    title                VARCHAR(512) NOT NULL,
    effective_date       DATE        NOT NULL,
    expiry_date          DATE,
    scope                TEXT,
    key_requirements     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    signed_by_supplier   VARCHAR(120),
    signed_at_supplier   DATE,
    signed_by_us         VARCHAR(120),
    signed_at_us         DATE,
    document_ref         TEXT,
    status               VARCHAR(30) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS idx_eqms_quality_agreements_vendor ON eqms_quality_agreements (vendor_id);

-- ── Supplier Audits + SCAR ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_supplier_audits (
    supplier_audit_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_audit_number VARCHAR(80) NOT NULL UNIQUE,
    vendor_id            UUID        NOT NULL,
    audit_scope          TEXT,
    audit_type           VARCHAR(30) NOT NULL DEFAULT 'onsite',       -- onsite/remote/document
    lead_auditor         VARCHAR(120),
    planned_date         DATE,
    actual_start         TIMESTAMPTZ,
    actual_end           TIMESTAMPTZ,
    finding_count        INTEGER     NOT NULL DEFAULT 0,
    scar_ids             JSONB       NOT NULL DEFAULT '[]'::jsonb,
    status               VARCHAR(40) NOT NULL DEFAULT 'planned',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_audits_vendor ON eqms_supplier_audits (vendor_id, status);

CREATE TABLE IF NOT EXISTS eqms_scars (
    scar_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    scar_number          VARCHAR(80) NOT NULL UNIQUE,
    vendor_id            UUID        NOT NULL,
    supplier_audit_id    UUID        REFERENCES eqms_supplier_audits(supplier_audit_id),
    description          TEXT        NOT NULL,
    priority             VARCHAR(20) NOT NULL DEFAULT 'major',        -- critical/major/minor
    root_cause           TEXT,
    corrective_action_plan TEXT,
    implementation_date  DATE,
    verification_evidence TEXT,
    effectiveness_result TEXT,
    assigned_to          VARCHAR(120),
    assigned_at          TIMESTAMPTZ,
    response_due_date    DATE,
    closed_at            TIMESTAMPTZ,
    status               VARCHAR(40) NOT NULL DEFAULT 'issued',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_scars_vendor ON eqms_scars (vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_eqms_scars_audit  ON eqms_scars (supplier_audit_id) WHERE supplier_audit_id IS NOT NULL;

-- ── Quality Risk Register ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_risk_register (
    risk_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_number          VARCHAR(80) NOT NULL UNIQUE,
    risk_title           VARCHAR(512) NOT NULL,
    risk_description     TEXT,
    risk_category        VARCHAR(60) NOT NULL DEFAULT 'process',     -- product/process/supplier/regulatory/system
    likelihood           SMALLINT    NOT NULL DEFAULT 1 CHECK (likelihood BETWEEN 1 AND 5),
    severity             SMALLINT    NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    risk_score           SMALLINT    GENERATED ALWAYS AS (likelihood * severity) STORED,
    residual_risk_score  SMALLINT,
    accepted_by          VARCHAR(120),
    accepted_at          TIMESTAMPTZ,
    acceptance_rationale TEXT,
    review_due           DATE,
    status               VARCHAR(40) NOT NULL DEFAULT 'identified',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_risk_register_status   ON eqms_risk_register (status, risk_score DESC);

CREATE TABLE IF NOT EXISTS eqms_risks_controls (
    control_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id              UUID        NOT NULL REFERENCES eqms_risk_register(risk_id),
    control_description  TEXT        NOT NULL,
    control_type         VARCHAR(30) NOT NULL DEFAULT 'preventive',  -- preventive/detective/corrective
    responsible          VARCHAR(120),
    due_date             DATE,
    verification_evidence TEXT,
    effective            BOOLEAN,
    verified_by          VARCHAR(120),
    verified_at          TIMESTAMPTZ,
    status               VARCHAR(30) NOT NULL DEFAULT 'planned',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_risks_controls_risk ON eqms_risks_controls (risk_id);

-- ── MSA Studies ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_msa_records (
    msa_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    msa_number           VARCHAR(80) NOT NULL UNIQUE,
    equipment_id         UUID,
    equipment_name       VARCHAR(255),
    study_type           VARCHAR(60) NOT NULL DEFAULT 'gauge_rr',    -- gauge_rr/linearity/bias/stability
    operator_count       INTEGER,
    part_count           INTEGER,
    repeat_count         INTEGER,
    results              JSONB       NOT NULL DEFAULT '{}'::jsonb,
    grr_percent          NUMERIC(8,4),
    ndc_count            INTEGER,
    passed               BOOLEAN,
    approval_threshold_grr NUMERIC(8,4) NOT NULL DEFAULT 30.0,
    conducted_by         VARCHAR(120),
    conducted_at         TIMESTAMPTZ,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS idx_eqms_msa_records_status ON eqms_msa_records (status);

-- ── Calibration Records (EQMS world-class surface) ───────────────────────────

CREATE TABLE IF NOT EXISTS eqms_calibration_records (
    calibration_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    calibration_number   VARCHAR(80) NOT NULL UNIQUE,
    equipment_id         UUID,
    equipment_name       VARCHAR(255) NOT NULL,
    calibration_standard VARCHAR(255),
    calibration_procedure VARCHAR(255),
    performed_by         VARCHAR(120),
    lab_ref              VARCHAR(120),
    calibration_date     DATE,
    next_due_date        DATE,
    results              JSONB       NOT NULL DEFAULT '{}'::jsonb,
    pass_fail            BOOLEAN,
    oot_declared         BOOLEAN     NOT NULL DEFAULT false,
    oot_reason           TEXT,
    reviewed_by          VARCHAR(120),
    reviewed_at          TIMESTAMPTZ,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    certificate_ref      TEXT,
    status               VARCHAR(40) NOT NULL DEFAULT 'scheduled',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS idx_eqms_calibration_equipment ON eqms_calibration_records (equipment_id);
CREATE INDEX IF NOT EXISTS idx_eqms_calibration_status    ON eqms_calibration_records (status, next_due_date ASC);

-- ── Lab Investigations (OOS / OOT) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_lab_investigations (
    investigation_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_number VARCHAR(80) NOT NULL UNIQUE,
    investigation_type   VARCHAR(10) NOT NULL DEFAULT 'OOS' CHECK (investigation_type IN ('OOS','OOT')),
    product_id           UUID,
    lot_number           VARCHAR(120),
    test_name            VARCHAR(255),
    specification        TEXT,
    actual_result        TEXT,
    lab_error_identified BOOLEAN,
    phase1_conclusion    TEXT,
    phase2_required      BOOLEAN     NOT NULL DEFAULT false,
    phase1_notes         TEXT,
    phase2_notes         TEXT,
    retest_results       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    resample_results     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    root_cause           TEXT,
    final_conclusion     TEXT,
    capa_id              UUID,
    closed_by            VARCHAR(120),
    closed_at            TIMESTAMPTZ,
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_lab_investigations_status ON eqms_lab_investigations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_lab_investigations_lot    ON eqms_lab_investigations (lot_number) WHERE lot_number IS NOT NULL;

-- ── Batch Release ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_batch_release (
    batch_release_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_release_number VARCHAR(80) NOT NULL UNIQUE,
    lot_id               UUID,
    product_id           UUID,
    batch_number         VARCHAR(120),
    release_type         VARCHAR(30) NOT NULL DEFAULT 'standard',    -- standard/expedited/conditional
    manufacture_date     DATE,
    expiry_date          DATE,
    release_package      JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- assembled evidence snapshot
    exceptions           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    exception_dispositions JSONB     NOT NULL DEFAULT '[]'::jsonb,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    hold_reason          TEXT,
    market_ship_authorization TEXT,
    shipped_by           VARCHAR(120),
    shipped_at           TIMESTAMPTZ,
    status               VARCHAR(40) NOT NULL DEFAULT 'initiated',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_batch_release_status  ON eqms_batch_release (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_batch_release_lot     ON eqms_batch_release (lot_id) WHERE lot_id IS NOT NULL;

-- ── Validation Management ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_validation_projects (
    project_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number       VARCHAR(80) NOT NULL UNIQUE,
    project_name         VARCHAR(512) NOT NULL,
    validation_type      VARCHAR(60) NOT NULL DEFAULT 'process',     -- CSV/CQV/process/equipment/cleaning
    system_name          VARCHAR(255),
    risk_category        VARCHAR(20) NOT NULL DEFAULT 'medium',      -- high/medium/low
    status               VARCHAR(40) NOT NULL DEFAULT 'planning',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS eqms_validation_requirements (
    requirement_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID        NOT NULL REFERENCES eqms_validation_projects(project_id),
    req_number           VARCHAR(40) NOT NULL,
    description          TEXT        NOT NULL,
    acceptance_criteria  TEXT,
    category             VARCHAR(10) NOT NULL DEFAULT 'URS' CHECK (category IN ('URS','FS','DS','CS')),
    UNIQUE (project_id, req_number)
);
CREATE INDEX IF NOT EXISTS idx_eqms_validation_reqs_project ON eqms_validation_requirements (project_id);

CREATE TABLE IF NOT EXISTS eqms_validation_protocols (
    protocol_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID        NOT NULL REFERENCES eqms_validation_projects(project_id),
    protocol_number      VARCHAR(80) NOT NULL UNIQUE,
    protocol_type        VARCHAR(10) NOT NULL DEFAULT 'IQ' CHECK (protocol_type IN ('IQ','OQ','PQ','DQ')),
    description          TEXT,
    approved_by          VARCHAR(120),
    approved_at          TIMESTAMPTZ,
    status               VARCHAR(30) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_validation_protocols_project ON eqms_validation_protocols (project_id);

CREATE TABLE IF NOT EXISTS eqms_validation_executions (
    execution_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id          UUID        NOT NULL REFERENCES eqms_validation_protocols(protocol_id),
    step_number          INTEGER     NOT NULL,
    step_description     TEXT        NOT NULL,
    expected_result      TEXT,
    actual_result        TEXT,
    pass_fail            BOOLEAN,
    executed_by          VARCHAR(120),
    executed_at          TIMESTAMPTZ,
    deviation_notes      TEXT,
    summary              TEXT,
    overall_conclusion   TEXT,
    status               VARCHAR(30) NOT NULL DEFAULT 'pending',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (protocol_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_eqms_validation_executions_protocol ON eqms_validation_executions (protocol_id);

-- ── Field Actions / Recall / Product Surveillance ────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_field_actions (
    field_action_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    field_action_number  VARCHAR(80) NOT NULL UNIQUE,
    action_type          VARCHAR(40) NOT NULL DEFAULT 'investigation', -- recall/field_safety_notice/advisory/investigation
    classification       VARCHAR(30) NOT NULL DEFAULT 'voluntary',    -- voluntary/mandatory
    affected_products    JSONB       NOT NULL DEFAULT '[]'::jsonb,
    affected_lot_ids     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    customer_notification_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation_summary   TEXT,
    action_plan          TEXT,
    launch_date          TIMESTAMPTZ,
    regulatory_notification_date DATE,
    notification_method  VARCHAR(80),
    notification_content TEXT,
    effectiveness_criteria TEXT,
    effectiveness_result TEXT,
    closure_rationale    TEXT,
    closed_at            TIMESTAMPTZ,
    closed_by            VARCHAR(120),
    status               VARCHAR(40) NOT NULL DEFAULT 'draft',
    version              INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           VARCHAR(120) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eqms_field_actions_status ON eqms_field_actions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqms_field_actions_type   ON eqms_field_actions (action_type);

-- ── SPC Violation Acknowledgements (extending existing spc tables) ────────────

CREATE TABLE IF NOT EXISTS eqms_spc_violation_acks (
    ack_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id             UUID        NOT NULL,
    observation_id       UUID        NOT NULL,
    acknowledgement_reason TEXT      NOT NULL,
    action_taken         TEXT,
    acknowledged_by      VARCHAR(120) NOT NULL,
    acknowledged_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    linked_deviation_id  UUID,
    UNIQUE (chart_id, observation_id)
);
CREATE INDEX IF NOT EXISTS idx_eqms_spc_acks_chart ON eqms_spc_violation_acks (chart_id);

-- ── Performance: partial indexes for common dashboard queries ─────────────────

CREATE INDEX IF NOT EXISTS idx_eqms_complaints_open  ON eqms_complaints  (received_date DESC) WHERE status NOT IN ('closed');
CREATE INDEX IF NOT EXISTS idx_eqms_deviations_open  ON eqms_deviations  (detected_at  DESC) WHERE status NOT IN ('closed','voided');
CREATE INDEX IF NOT EXISTS idx_eqms_ncr_open          ON eqms_ncr_records (detected_at  DESC) WHERE status NOT IN ('closed');
CREATE INDEX IF NOT EXISTS idx_eqms_capa_open         ON eqms_capa_records(created_at   DESC) WHERE status NOT IN ('closed','cancelled');
CREATE INDEX IF NOT EXISTS idx_eqms_lab_open          ON eqms_lab_investigations(created_at DESC) WHERE status NOT IN ('closed');
CREATE INDEX IF NOT EXISTS idx_eqms_batch_pending     ON eqms_batch_release(created_at  DESC) WHERE status NOT IN ('shipped');
CREATE INDEX IF NOT EXISTS idx_eqms_risks_open        ON eqms_risk_register (risk_score DESC) WHERE status NOT IN ('closed','accepted');

COMMIT;
