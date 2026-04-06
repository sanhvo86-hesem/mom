-- ============================================================================
-- Migration 078: Canonical eQMS and Compliance Backbone
-- Description: Inspection, quality case linkage, NCR/deviation/CAPA/complaints, controlled
--              documents, audits, training, supplier quality, risk, and audit trail.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql,
--               074_canonical_engineering_definition.sql,
--               075_canonical_planning_erp_orchestration.sql,
--               076_canonical_mes_execution_spine.sql,
--               077_canonical_inventory_cost_traceability.sql
-- Rollback: DROP TABLE audit_trail, risk_register, supplier_quality_case, training_record,
--           training_matrix, competency, finding, audit, audit_program, change_control,
--           document_revision, document, complaint, capa, deviation, nonconformance,
--           quality_case_link, quality_order, inspection_result, inspection_lot,
--           inspection_characteristic, inspection_plan CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS inspection_plan (
    inspection_plan_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    plan_code                VARCHAR(80) NOT NULL,
    plan_type                VARCHAR(40) NOT NULL,
    revision_code            VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (item_revision_id, plan_code, revision_code)
);

CREATE TABLE IF NOT EXISTS inspection_characteristic (
    inspection_characteristic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_plan_id       UUID NOT NULL REFERENCES inspection_plan(inspection_plan_id),
    characteristic_code      VARCHAR(80) NOT NULL,
    characteristic_name      VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    target_value_text        TEXT,
    lower_spec_limit         NUMERIC(18,6),
    upper_spec_limit         NUMERIC(18,6),
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    is_critical              BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (inspection_plan_id, characteristic_code)
);

CREATE TABLE IF NOT EXISTS inspection_lot (
    inspection_lot_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_lot_no        VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID,
    item_revision_id         UUID REFERENCES item_revision(item_revision_id),
    lot_id                   UUID REFERENCES lot(lot_id),
    serial_id                UUID REFERENCES serial(serial_id),
    inspection_status        VARCHAR(30) NOT NULL DEFAULT 'open',
    severity_code            VARCHAR(30),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_result (
    inspection_result_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_lot_id        UUID NOT NULL REFERENCES inspection_lot(inspection_lot_id),
    inspection_characteristic_id UUID REFERENCES inspection_characteristic(inspection_characteristic_id),
    characteristic_code      VARCHAR(80) NOT NULL,
    result_value_text        TEXT,
    result_value_num         NUMERIC(18,6),
    disposition_code         VARCHAR(40),
    recorded_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_order (
    quality_order_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_order_no         VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID,
    case_type                VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30),
    owner_party_id           UUID REFERENCES party(party_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_case_link (
    quality_case_link_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_order_id         UUID NOT NULL REFERENCES quality_order(quality_order_id),
    linked_entity_name       VARCHAR(80) NOT NULL,
    linked_entity_id         UUID NOT NULL,
    relationship_code        VARCHAR(40) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nonconformance (
    nonconformance_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonconformance_no        VARCHAR(80) NOT NULL UNIQUE,
    quality_order_id         UUID REFERENCES quality_order(quality_order_id),
    source_type              VARCHAR(40),
    source_id                UUID,
    containment_action       TEXT,
    disposition_code         VARCHAR(40),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deviation (
    deviation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deviation_no             VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40),
    source_id                UUID,
    reason_code              VARCHAR(60),
    disposition_code         VARCHAR(40),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capa (
    capa_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_no                  VARCHAR(80) NOT NULL UNIQUE,
    source_case_name         VARCHAR(40) NOT NULL,
    source_case_id           UUID NOT NULL,
    root_cause_method        VARCHAR(40),
    effectiveness_due_date   DATE,
    owner_party_id           UUID REFERENCES party(party_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_no             VARCHAR(80) NOT NULL UNIQUE,
    customer_party_id        UUID REFERENCES party(party_id),
    reported_item_revision_id UUID REFERENCES item_revision(item_revision_id),
    reported_lot_id          UUID REFERENCES lot(lot_id),
    reported_serial_id       UUID REFERENCES serial(serial_id),
    complaint_text           TEXT NOT NULL,
    severity_code            VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document (
    document_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no              VARCHAR(80) NOT NULL UNIQUE,
    document_type            VARCHAR(40) NOT NULL,
    title_text               VARCHAR(255) NOT NULL,
    owner_party_id           UUID REFERENCES party(party_id),
    lifecycle_state          VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_revision (
    document_revision_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id              UUID NOT NULL REFERENCES document(document_id),
    revision_code            VARCHAR(40) NOT NULL,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    checksum_sha256          TEXT,
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id),
    UNIQUE (document_id, revision_code)
);

CREATE TABLE IF NOT EXISTS change_control (
    change_control_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_control_no        VARCHAR(80) NOT NULL UNIQUE,
    change_type              VARCHAR(40) NOT NULL,
    source_document_revision_id UUID REFERENCES document_revision(document_revision_id),
    impact_summary           TEXT,
    risk_summary             TEXT,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_program (
    audit_program_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_program_code       VARCHAR(80) NOT NULL UNIQUE,
    program_name             VARCHAR(255) NOT NULL,
    scope_text               TEXT,
    frequency_code           VARCHAR(30),
    owner_party_id           UUID REFERENCES party(party_id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit (
    audit_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_program_id         UUID REFERENCES audit_program(audit_program_id),
    audit_no                 VARCHAR(80) NOT NULL UNIQUE,
    audit_type               VARCHAR(40) NOT NULL,
    auditee_party_id         UUID REFERENCES party(party_id),
    scheduled_start_at       TIMESTAMPTZ,
    scheduled_end_at         TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'planned',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finding (
    finding_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id                 UUID NOT NULL REFERENCES audit(audit_id),
    finding_no               VARCHAR(80) NOT NULL,
    finding_type             VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30),
    finding_text             TEXT NOT NULL,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (audit_id, finding_no)
);

CREATE TABLE IF NOT EXISTS competency (
    competency_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competency_code          VARCHAR(80) NOT NULL UNIQUE,
    competency_name          VARCHAR(255) NOT NULL,
    competency_type          VARCHAR(40) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_matrix (
    training_matrix_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code                VARCHAR(40) NOT NULL,
    document_id              UUID REFERENCES document(document_id),
    competency_id            UUID REFERENCES competency(competency_id),
    required_flag            BOOLEAN NOT NULL DEFAULT true,
    refresh_cycle_days       INTEGER,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_record (
    training_record_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    training_matrix_id       UUID REFERENCES training_matrix(training_matrix_id),
    completed_at             TIMESTAMPTZ,
    expiry_at                TIMESTAMPTZ,
    score_value              NUMERIC(9,2),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'assigned',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_quality_case (
    supplier_quality_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_party_id        UUID NOT NULL REFERENCES party(party_id),
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID NOT NULL,
    issue_code               VARCHAR(40),
    severity_code            VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_register (
    risk_register_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_code                VARCHAR(80) NOT NULL UNIQUE,
    risk_domain              VARCHAR(40) NOT NULL,
    source_entity_name       VARCHAR(80),
    source_entity_id         UUID,
    severity_code            VARCHAR(30),
    occurrence_code          VARCHAR(30),
    detection_code           VARCHAR(30),
    mitigation_text          TEXT,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_trail (
    audit_trail_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    action_code              VARCHAR(40) NOT NULL,
    old_payload              JSONB,
    new_payload              JSONB,
    acted_by_party_id        UUID REFERENCES party(party_id),
    acted_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_work_instruction_document_revision'
    ) THEN
        ALTER TABLE work_instruction
            ADD CONSTRAINT fk_work_instruction_document_revision
            FOREIGN KEY (document_revision_id)
            REFERENCES document_revision(document_revision_id);
    END IF;
END $$;

COMMIT;
