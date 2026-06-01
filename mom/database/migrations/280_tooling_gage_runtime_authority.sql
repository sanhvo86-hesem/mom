-- P55: Tooling, fixture, gage, preset, OOT, and breakage runtime authority closure.

BEGIN;

CREATE TABLE IF NOT EXISTS tooling_runtime_state (
    tool_id TEXT PRIMARY KEY,
    tool_status TEXT NOT NULL DEFAULT 'active'
        CHECK (tool_status IN ('active', 'blocked', 'broken', 'obsolete', 'maintenance', 'retired')),
    assembly_id TEXT,
    assembly_status TEXT NOT NULL DEFAULT 'active'
        CHECK (assembly_status IN ('active', 'blocked', 'obsolete', 'maintenance', 'retired')),
    component_status TEXT NOT NULL DEFAULT 'active'
        CHECK (component_status IN ('active', 'blocked', 'obsolete', 'missing')),
    preset_status TEXT NOT NULL DEFAULT 'approved'
        CHECK (preset_status IN ('approved', 'pending', 'expired', 'void')),
    calibration_status TEXT NOT NULL DEFAULT 'valid'
        CHECK (calibration_status IN ('valid', 'expired', 'oot', 'not_required')),
    life_count NUMERIC(18,6) NOT NULL DEFAULT 0,
    warning_limit NUMERIC(18,6),
    stop_limit NUMERIC(18,6),
    allowed_machine_family TEXT,
    compatible_item_id TEXT,
    last_preset_id TEXT,
    last_event_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gage_runtime_state (
    gage_id TEXT PRIMARY KEY,
    gage_status TEXT NOT NULL DEFAULT 'active'
        CHECK (gage_status IN ('active', 'blocked', 'oot', 'retired')),
    calibration_status TEXT NOT NULL DEFAULT 'valid'
        CHECK (calibration_status IN ('valid', 'expired', 'oot')),
    msa_status TEXT NOT NULL DEFAULT 'acceptable'
        CHECK (msa_status IN ('acceptable', 'marginal', 'unacceptable', 'not_required')),
    calibration_due_at TIMESTAMPTZ,
    last_calibration_record_id TEXT,
    open_oot_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tooling_breakage_event (
    breakage_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id TEXT NOT NULL,
    work_order_ref TEXT,
    operation_ref TEXT,
    equipment_id TEXT,
    detected_piece_no INTEGER,
    last_good_piece_no INTEGER,
    suspect_from_piece_no INTEGER,
    suspect_to_piece_no INTEGER,
    containment_required BOOLEAN NOT NULL DEFAULT TRUE,
    reported_by TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tool_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS tooling_breakage_containment (
    containment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breakage_event_id UUID NOT NULL REFERENCES tooling_breakage_event(breakage_event_id) ON DELETE CASCADE,
    hold_id UUID,
    ncr_id UUID,
    subject_type TEXT NOT NULL,
    subject_ref TEXT NOT NULL,
    suspect_window JSONB NOT NULL DEFAULT '{}'::jsonb,
    containment_status TEXT NOT NULL DEFAULT 'open'
        CHECK (containment_status IN ('open', 'released', 'voided')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (breakage_event_id, subject_type, subject_ref)
);

CREATE TABLE IF NOT EXISTS gage_oot_investigation_runtime (
    oot_runtime_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gage_id TEXT NOT NULL,
    oot_status TEXT NOT NULL DEFAULT 'open'
        CHECK (oot_status IN ('open', 'containment', 'risk_assessed', 'closed', 'voided')),
    discovery_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_good_at TIMESTAMPTZ,
    affected_from TIMESTAMPTZ,
    affected_to TIMESTAMPTZ,
    impacted_measurement_count INTEGER NOT NULL DEFAULT 0,
    risk_assessment TEXT,
    hold_id UUID,
    ncr_id UUID,
    reported_by TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (gage_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tooling_runtime_state_status
    ON tooling_runtime_state (tool_status, preset_status, calibration_status);

CREATE INDEX IF NOT EXISTS idx_gage_runtime_state_status
    ON gage_runtime_state (gage_status, calibration_status, msa_status);

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    ('tooling_gage_runtime', 'tooling', 'tooling_runtime_state', 'governed_root', 'domain_command_required', '["LoadToolCommand","StartJobCommand","CompleteOperationCommand","ReportToolBreakageCommand","RecordToolUsageCommand"]'::jsonb),
    ('tooling_gage_runtime', 'quality_management', 'gage_runtime_state', 'governed_root', 'domain_command_required', '["RecordInspectionResultCommand","GageOOTInvestigationCommand"]'::jsonb),
    ('tooling_gage_runtime', 'mes_execution', 'tooling_breakage_event', 'event_record', 'domain_command_required', '["ReportToolBreakageCommand"]'::jsonb),
    ('tooling_gage_runtime', 'quality_management', 'tooling_breakage_containment', 'evidence_record', 'domain_command_required', '["ReportToolBreakageCommand"]'::jsonb),
    ('tooling_gage_runtime', 'quality_management', 'gage_oot_investigation_runtime', 'event_record', 'domain_command_required', '["GageOOTInvestigationCommand"]'::jsonb),
    ('tooling_gage_runtime', 'mes_execution', 'mes_tool_life_events', 'event_record', 'domain_command_required', '["LoadToolCommand","CompleteOperationCommand","ReportToolBreakageCommand","RecordToolUsageCommand"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    classification = EXCLUDED.classification,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = now();

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT table_name
          FROM governed_entity_registry
         WHERE root_code = 'tooling_gage_runtime'
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

WITH policy_seed(command_name, root, risk_class, signature_required, meanings) AS (
    VALUES
        ('ReportToolBreakageCommand', 'tooling_breakage', 'critical', TRUE, ARRAY['tool_breakage_report']::TEXT[]),
        ('GageOOTInvestigationCommand', 'gage_oot_investigation', 'critical', TRUE, ARRAY['gage_oot_investigation']::TEXT[])
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
    jsonb_build_object('authority', 'P55 ToolingCommandHandler', 'posture', 'pre_production_candidate')
FROM policy_seed
ON CONFLICT (command_name) DO UPDATE SET
    root = EXCLUDED.root,
    risk_class = EXCLUDED.risk_class,
    signature_required = EXCLUDED.signature_required,
    allowed_signature_meanings = EXCLUDED.allowed_signature_meanings,
    policy_hash_sha256 = EXCLUDED.policy_hash_sha256,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
