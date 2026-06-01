-- P53: Canonical quality hold and eQMS transaction chain runtime closure.

BEGIN;

CREATE TABLE IF NOT EXISTS quality_hold (
    hold_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hold_number TEXT NOT NULL UNIQUE,
    hold_status TEXT NOT NULL DEFAULT 'active'
        CHECK (hold_status IN ('active', 'released', 'voided')),
    hold_scope TEXT NOT NULL DEFAULT 'quality'
        CHECK (hold_scope IN ('iqc', 'ipqc', 'oqc', 'fai', 'final', 'other', 'supplier', 'customer', 'quality')),
    severity TEXT NOT NULL DEFAULT 'major'
        CHECK (severity IN ('minor', 'major', 'critical')),
    reason_code TEXT NOT NULL,
    operator_message TEXT NOT NULL,
    created_by TEXT NOT NULL,
    released_by TEXT,
    released_at TIMESTAMPTZ,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_hold_active
    ON quality_hold (hold_status, hold_scope, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS quality_hold_subject (
    hold_subject_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hold_id UUID NOT NULL REFERENCES quality_hold(hold_id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL
        CHECK (subject_type IN ('lot', 'serial', 'container', 'wip', 'work_order', 'job', 'operation', 'shipment', 'supplier', 'customer', 'item', 'equipment', 'tool')),
    subject_ref TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'held_subject',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hold_id, subject_type, subject_ref)
);

CREATE INDEX IF NOT EXISTS idx_quality_hold_subject_lookup
    ON quality_hold_subject (subject_type, subject_ref, hold_id);

CREATE TABLE IF NOT EXISTS quality_hold_source (
    hold_source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hold_id UUID NOT NULL REFERENCES quality_hold(hold_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    source_command_name TEXT,
    source_idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hold_id, source_type, source_ref)
);

CREATE TABLE IF NOT EXISTS quality_hold_release (
    release_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hold_id UUID NOT NULL REFERENCES quality_hold(hold_id),
    release_reason TEXT NOT NULL,
    released_by TEXT NOT NULL,
    signature_event_id UUID REFERENCES signature_events(signature_event_id),
    evidence_hash_sha256 CHAR(64) NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hold_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS quality_inspection_result_runtime (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id TEXT NOT NULL,
    work_order_ref TEXT,
    operation_ref TEXT,
    item_id TEXT,
    lot_ref TEXT,
    serial_ref TEXT,
    shipment_ref TEXT,
    supplier_ref TEXT,
    customer_ref TEXT,
    inspection_stage TEXT NOT NULL DEFAULT 'ipqc'
        CHECK (inspection_stage IN ('iqc', 'ipqc', 'oqc', 'fai', 'final', 'other')),
    result_status TEXT NOT NULL
        CHECK (result_status IN ('pass', 'fail', 'conditional')),
    measured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    uom_measurement_id TEXT,
    actor_id TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (inspection_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS quality_order_runtime (
    quality_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quality_order_number TEXT NOT NULL UNIQUE,
    source_result_id UUID REFERENCES quality_inspection_result_runtime(result_id),
    order_type TEXT NOT NULL
        CHECK (order_type IN ('iqc', 'ipqc', 'oqc', 'complaint', 'supplier_quality', 'internal_quality')),
    order_status TEXT NOT NULL DEFAULT 'open'
        CHECK (order_status IN ('open', 'in_review', 'closed', 'voided')),
    source_ref TEXT NOT NULL,
    created_by TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_nonconformance_runtime (
    ncr_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ncr_number TEXT NOT NULL UNIQUE,
    quality_order_id UUID REFERENCES quality_order_runtime(quality_order_id),
    hold_id UUID REFERENCES quality_hold(hold_id),
    source_result_id UUID REFERENCES quality_inspection_result_runtime(result_id),
    severity TEXT NOT NULL DEFAULT 'major'
        CHECK (severity IN ('minor', 'major', 'critical')),
    defect_code TEXT,
    source_stage TEXT NOT NULL,
    disposition_status TEXT NOT NULL DEFAULT 'pending_mrb'
        CHECK (disposition_status IN ('pending_mrb', 'use_as_is', 'rework', 'scrap', 'return_to_supplier', 'closed')),
    created_by TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mrb_disposition_runtime (
    disposition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ncr_id UUID REFERENCES quality_nonconformance_runtime(ncr_id),
    hold_id UUID REFERENCES quality_hold(hold_id),
    disposition_type TEXT NOT NULL
        CHECK (disposition_type IN ('use_as_is', 'rework', 'scrap', 'return_to_supplier', 'sort', 'deviation')),
    disposition_status TEXT NOT NULL DEFAULT 'approved'
        CHECK (disposition_status IN ('draft', 'approved', 'rejected', 'voided')),
    customer_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    customer_approval_ref TEXT,
    actor_id TEXT NOT NULL,
    signature_event_id UUID REFERENCES signature_events(signature_event_id),
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ncr_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS quality_case_trace_link (
    trace_link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_type TEXT NOT NULL
        CHECK (case_type IN ('quality_hold', 'quality_order', 'ncr', 'mrb', 'capa', 'scar', 'complaint')),
    case_id TEXT NOT NULL,
    related_type TEXT NOT NULL,
    related_ref TEXT NOT NULL,
    relationship TEXT NOT NULL,
    source_authority TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (case_type, case_id, related_type, related_ref, relationship)
);

CREATE INDEX IF NOT EXISTS idx_quality_case_trace_case
    ON quality_case_trace_link (case_type, case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_case_trace_related
    ON quality_case_trace_link (related_type, related_ref, created_at DESC);

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, allowed_commands)
VALUES
    ('quality_hold_ncr_capa', 'quality_management', 'quality_hold', '["ApplyQualityHoldCommand","ReleaseQualityHoldCommand","RecordInspectionResultCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_hold_subject', '["ApplyQualityHoldCommand","ReleaseQualityHoldCommand","RecordInspectionResultCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_hold_source', '["ApplyQualityHoldCommand","ReleaseQualityHoldCommand","RecordInspectionResultCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_hold_release', '["ReleaseQualityHoldCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_inspection_result_runtime', '["RecordInspectionResultCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_order_runtime', '["RecordInspectionResultCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_nonconformance_runtime', '["RecordInspectionResultCommand","RecordMrbDispositionCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'mrb_disposition_runtime', '["RecordMrbDispositionCommand"]'::jsonb),
    ('quality_hold_ncr_capa', 'quality_management', 'quality_case_trace_link', '["RecordInspectionResultCommand","ApplyQualityHoldCommand","RecordMrbDispositionCommand"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = NOW();

WITH policy_seed(command_name, root, risk_class, signature_required, meanings) AS (
    VALUES
        ('RecordMrbDispositionCommand', 'material_review_board', 'critical', TRUE, ARRAY['mrb_disposition']::TEXT[])
)
INSERT INTO regulated_action_policy
    (command_name, root, risk_class, signature_required, allowed_signature_meanings,
     sod_required, reauth_required, evidence_required, retention_days, validation_status,
     policy_hash_sha256, metadata)
SELECT
    command_name,
    root,
    risk_class,
    signature_required,
    to_jsonb(meanings),
    TRUE,
    TRUE,
    TRUE,
    3650,
    'pre_production_candidate',
    encode(digest(command_name || '|' || root || '|' || risk_class || '|' || signature_required::text || '|' || meanings::text, 'sha256'), 'hex'),
    jsonb_build_object('authority', 'P53 QualityHoldService', 'posture', 'pre_production_candidate')
FROM policy_seed
ON CONFLICT (command_name) DO UPDATE SET
    root = EXCLUDED.root,
    risk_class = EXCLUDED.risk_class,
    signature_required = EXCLUDED.signature_required,
    allowed_signature_meanings = EXCLUDED.allowed_signature_meanings,
    policy_hash_sha256 = EXCLUDED.policy_hash_sha256,
    metadata = EXCLUDED.metadata,
    updated_at = now();

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT table_name
          FROM governed_entity_registry
         WHERE root_code = 'quality_hold_ncr_capa'
           AND table_name IN (
               'quality_hold',
               'quality_hold_subject',
               'quality_hold_source',
               'quality_hold_release',
               'quality_inspection_result_runtime',
               'quality_order_runtime',
               'quality_nonconformance_runtime',
               'mrb_disposition_runtime',
               'quality_case_trace_link'
           )
           AND active = TRUE
         ORDER BY table_name
    LOOP
        IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_governed_generic_crud_guard ON %I', v_table);
            EXECUTE format(
                'CREATE TRIGGER trg_governed_generic_crud_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hesem_governed_generic_crud_guard()',
                v_table
            );
        END IF;
    END LOOP;
END;
$$;

COMMIT;
