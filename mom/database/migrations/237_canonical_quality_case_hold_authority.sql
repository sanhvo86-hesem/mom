-- ============================================================================
-- Migration 237: Canonical Quality Case Hold Authority
-- ============================================================================
-- Purpose:
--   Add the canonical quality hold, trigger, and trace spine used by P33 so
--   shipment, putaway, issue, WIP, OQC, NCR, MRB, CAPA, complaint, and SCAR
--   checks can read one governed quality-case authority.
--
-- Data safety:
--   Additive migration. Existing legacy JSON/legacy quality lanes are not
--   modified. Domain command handlers are still required before runtime-ready
--   claims.
--
-- Rollback:
--   DROP TABLE IF EXISTS quality_case_trace_link CASCADE;
--   DROP TABLE IF EXISTS quality_order_trigger_ledger CASCADE;
--   DROP TABLE IF EXISTS quality_holds CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS quality_holds (
    quality_hold_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_number                     VARCHAR(80) UNIQUE,
    subject_type                    VARCHAR(60) NOT NULL,
    subject_ref                     TEXT NOT NULL,
    hold_scope                      VARCHAR(40) NOT NULL DEFAULT 'quality'
        CHECK (hold_scope IN ('quality', 'supplier_quality', 'customer_quality', 'calibration_oot', 'tooling', 'inventory', 'shipment', 'wip')),
    hold_reason_code                VARCHAR(80) NOT NULL,
    severity_code                   VARCHAR(30) NOT NULL DEFAULT 'major'
        CHECK (severity_code IN ('minor', 'major', 'critical', 'safety')),
    source_type                     VARCHAR(60) NOT NULL,
    source_ref                      TEXT NOT NULL,
    quality_order_id                UUID REFERENCES quality_order(quality_order_id),
    nonconformance_id               UUID REFERENCES nonconformance(nonconformance_id),
    legacy_ncr_ref                  TEXT,
    hold_status                     VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (hold_status IN ('active', 'released', 'voided', 'superseded')),
    placed_by_ref                   TEXT,
    placed_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    release_reason                  TEXT,
    released_by_ref                 TEXT,
    released_at                     TIMESTAMPTZ,
    release_signature_link_id       UUID REFERENCES regulated_command_signature_event_link(regulated_command_signature_event_link_id),
    disposition_ref                 TEXT,
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version                     BIGINT NOT NULL DEFAULT 1,
    CHECK (length(trim(subject_type)) > 0),
    CHECK (length(trim(subject_ref)) > 0),
    CHECK (length(trim(source_type)) > 0),
    CHECK (length(trim(source_ref)) > 0),
    CHECK (hold_status <> 'released' OR (released_at IS NOT NULL AND release_reason IS NOT NULL)),
    CHECK (hold_status <> 'released' OR release_signature_link_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_quality_holds_subject_status
    ON quality_holds (subject_type, subject_ref, hold_status);

CREATE INDEX IF NOT EXISTS idx_quality_holds_source
    ON quality_holds (source_type, source_ref);

CREATE UNIQUE INDEX IF NOT EXISTS ux_quality_holds_active_subject_source
    ON quality_holds (subject_type, subject_ref, source_type, source_ref)
    WHERE hold_status = 'active';

CREATE TABLE IF NOT EXISTS quality_order_trigger_ledger (
    quality_order_trigger_ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type                    VARCHAR(60) NOT NULL,
    source_type                     VARCHAR(60) NOT NULL,
    source_ref                      TEXT NOT NULL,
    trigger_hash_sha256             CHAR(64) NOT NULL,
    quality_order_id                UUID NOT NULL REFERENCES quality_order(quality_order_id),
    nonconformance_id               UUID REFERENCES nonconformance(nonconformance_id),
    capa_id                         UUID REFERENCES capa(capa_id),
    scar_ref                        TEXT,
    trigger_state                   VARCHAR(30) NOT NULL DEFAULT 'created'
        CHECK (trigger_state IN ('created', 'linked', 'voided')),
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (trigger_hash_sha256 ~ '^[a-f0-9]{64}$'),
    UNIQUE (trigger_type, source_type, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_quality_order_trigger_ledger_order
    ON quality_order_trigger_ledger (quality_order_id, trigger_state);

CREATE TABLE IF NOT EXISTS quality_case_trace_link (
    quality_case_trace_link_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_order_id                UUID REFERENCES quality_order(quality_order_id),
    case_ref_type                   VARCHAR(60) NOT NULL,
    case_ref                        TEXT NOT NULL,
    trace_entity_type               VARCHAR(60) NOT NULL,
    trace_entity_ref                TEXT NOT NULL,
    relationship_code               VARCHAR(60) NOT NULL,
    evidence_hash_sha256            CHAR(64),
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (length(trim(case_ref_type)) > 0),
    CHECK (length(trim(case_ref)) > 0),
    CHECK (length(trim(trace_entity_type)) > 0),
    CHECK (length(trim(trace_entity_ref)) > 0),
    CHECK (evidence_hash_sha256 IS NULL OR evidence_hash_sha256 ~ '^[a-f0-9]{64}$'),
    UNIQUE (case_ref_type, case_ref, trace_entity_type, trace_entity_ref, relationship_code)
);

CREATE INDEX IF NOT EXISTS idx_quality_case_trace_link_case
    ON quality_case_trace_link (case_ref_type, case_ref);

CREATE INDEX IF NOT EXISTS idx_quality_case_trace_link_trace
    ON quality_case_trace_link (trace_entity_type, trace_entity_ref);

INSERT INTO regulated_command_policy (
    command_name,
    governed_root_code,
    workflow_id,
    status_set_key,
    required_signature_meaning,
    required_signature_action,
    metadata
) VALUES
    ('QualityMrbDisposition.ApproveUseAsIs', 'MDA-QUALITY-CASE', 'wf_mrb', 'mrb_status', 'mrb_use_as_is_disposition_approval', 'mrb_use_as_is_disposition', '{"prompt":"P33","source":"runtime_upgrade"}'::jsonb),
    ('QualityCase.CapaApprove', 'MDA-QUALITY-CASE', 'wf_capa', 'capa_status', 'capa_approval', 'capa_approval', '{"prompt":"P33","source":"runtime_upgrade"}'::jsonb),
    ('SupplierScar.IssueCritical', 'MDA-QUALITY-CASE', 'wf_scar_record', 'scar_status', 'critical_scar_issue_approval', 'critical_scar_issue_approval', '{"prompt":"P33","source":"runtime_upgrade"}'::jsonb),
    ('Complaint.Close', 'MDA-QUALITY-CASE', 'wf_complaint', 'complaint_status', 'complaint_closure_approval', 'complaint_closure_approval', '{"prompt":"P33","source":"runtime_upgrade"}'::jsonb)
ON CONFLICT (command_name) DO UPDATE SET
    governed_root_code = EXCLUDED.governed_root_code,
    workflow_id = EXCLUDED.workflow_id,
    status_set_key = EXCLUDED.status_set_key,
    required_signature_meaning = EXCLUDED.required_signature_meaning,
    required_signature_action = EXCLUDED.required_signature_action,
    updated_at = now();

INSERT INTO regulated_command_policy_step (
    regulated_command_policy_id,
    step_code,
    step_sequence,
    approver_role_code,
    signature_meaning,
    required_evidence
)
SELECT p.regulated_command_policy_id,
       'quality_approval',
       1,
       'qa_manager',
       p.required_signature_meaning,
       '["quality_case_trace","signed_record_hash","consumed_reauth_challenge","authoritative_audit_store"]'::jsonb
FROM regulated_command_policy p
WHERE p.command_name IN ('QualityMrbDisposition.ApproveUseAsIs', 'QualityCase.CapaApprove', 'SupplierScar.IssueCritical', 'Complaint.Close')
ON CONFLICT (regulated_command_policy_id, step_code) DO UPDATE SET
    approver_role_code = EXCLUDED.approver_role_code,
    signature_meaning = EXCLUDED.signature_meaning,
    required_evidence = EXCLUDED.required_evidence,
    updated_at = now();

COMMIT;
