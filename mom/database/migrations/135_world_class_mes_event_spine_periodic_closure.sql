-- ============================================================================
-- Migration 135: World-Class MES Event Spine and Periodic Evaluation Closure
-- ============================================================================
-- Purpose:
--   Close second re-audit P1 gaps:
--   - Periodic evaluations need first-class org partitioning, terminal-row
--     immutability, and append-only closure proof.
--   - MTConnect/OPC-UA style machine ingestion needs a real append-only raw
--     event spine plus deterministic production derivation ledger.
-- ============================================================================

BEGIN;

-- 1) Periodic evaluation scope must be schema-enforced, not hidden in JSON.
ALTER TABLE periodic_evaluations
    ADD COLUMN IF NOT EXISTS org_id TEXT;

UPDATE periodic_evaluations
SET org_id = COALESCE(NULLIF(org_id, ''), NULLIF(result_payload->>'org_id', ''), 'default-org')
WHERE org_id IS NULL OR org_id = '';

ALTER TABLE periodic_evaluations
    ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE periodic_evaluations
    DROP CONSTRAINT IF EXISTS periodic_evaluations_evaluation_scope_scope_ref_due_at_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_periodic_evaluations_org_scope_due
    ON periodic_evaluations (org_id, evaluation_scope, scope_ref, due_at);

CREATE INDEX IF NOT EXISTS idx_periodic_evaluations_org_state_due
    ON periodic_evaluations (org_id, evaluation_state, due_at);

CREATE TABLE IF NOT EXISTS periodic_evaluation_closure_events (
    periodic_evaluation_closure_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periodic_evaluation_id UUID NOT NULL REFERENCES periodic_evaluations(periodic_evaluation_id),
    org_id TEXT NOT NULL,
    terminal_state TEXT NOT NULL CHECK (terminal_state IN ('passed', 'failed', 'waived')),
    closure_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    closure_payload_hash_sha256 TEXT NOT NULL CHECK (closure_payload_hash_sha256 ~ '^[a-f0-9]{64}$'),
    integrity_digest_id UUID REFERENCES integrity_digests(integrity_digest_id),
    audit_pack_export_id UUID REFERENCES audit_pack_exports(audit_pack_export_id),
    waiver_signature_event_id UUID REFERENCES signature_events(signature_event_id),
    actor_ref TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (periodic_evaluation_id, terminal_state, closure_payload_hash_sha256)
);

CREATE OR REPLACE FUNCTION prevent_closed_periodic_evaluation_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.evaluation_state IN ('passed', 'failed', 'waived') THEN
            RAISE EXCEPTION 'closed_periodic_evaluation_is_immutable';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.evaluation_state IN ('passed', 'failed', 'waived') THEN
        RAISE EXCEPTION 'closed_periodic_evaluation_is_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_periodic_evaluations_closed_immutable ON periodic_evaluations;
CREATE TRIGGER trg_periodic_evaluations_closed_immutable
    BEFORE UPDATE ON periodic_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_periodic_evaluation_mutation();

DROP TRIGGER IF EXISTS trg_periodic_evaluations_closed_delete_immutable ON periodic_evaluations;
CREATE TRIGGER trg_periodic_evaluations_closed_delete_immutable
    BEFORE DELETE ON periodic_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_periodic_evaluation_mutation();

CREATE OR REPLACE FUNCTION prevent_append_only_mes_spine_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'mes_event_spine_is_append_only';
END;
$$ LANGUAGE plpgsql;

-- 2) Raw machine event command target for RecordMachineEvent.
CREATE TABLE IF NOT EXISTS machine_raw_events (
    machine_raw_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adapter_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    quality_code TEXT NOT NULL DEFAULT 'unknown'
        CHECK (quality_code IN ('good', 'questionable', 'unavailable', 'bad', 'unknown')),
    sequence_no TEXT,
    replay_key TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    raw_payload_hash_sha256 TEXT NOT NULL CHECK (raw_payload_hash_sha256 ~ '^[a-f0-9]{64}$'),
    source_system TEXT NOT NULL DEFAULT 'mom.mes.machine_event_spine',
    source_record_id TEXT,
    org_company_code TEXT,
    org_legal_entity_code TEXT,
    org_plant_id TEXT,
    org_site_id TEXT,
    payload_schema_version TEXT NOT NULL DEFAULT 'mes_machine_raw_event.v1',
    row_version INTEGER NOT NULL DEFAULT 1,
    actor_ref TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (adapter_id, replay_key)
);

CREATE INDEX IF NOT EXISTS idx_machine_raw_events_source_time
    ON machine_raw_events (source_node_id, source_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_machine_raw_events_scope_time
    ON machine_raw_events (org_plant_id, org_site_id, source_timestamp DESC);

DROP TRIGGER IF EXISTS trg_machine_raw_events_append_only_update ON machine_raw_events;
CREATE TRIGGER trg_machine_raw_events_append_only_update
    BEFORE UPDATE ON machine_raw_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_append_only_mes_spine_mutation();

DROP TRIGGER IF EXISTS trg_machine_raw_events_append_only_delete ON machine_raw_events;
CREATE TRIGGER trg_machine_raw_events_append_only_delete
    BEFORE DELETE ON machine_raw_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_append_only_mes_spine_mutation();

-- 3) Derived production event command target for DeriveProductionEvent.
CREATE TABLE IF NOT EXISTS production_derived_events (
    production_derived_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_raw_event_id UUID NOT NULL REFERENCES machine_raw_events(machine_raw_event_id),
    derivation_profile_id TEXT NOT NULL,
    derived_event_type TEXT NOT NULL
        CHECK (derived_event_type IN ('cycle', 'downtime', 'alarm', 'oee_sample', 'state_transition', 'quality_signal')),
    event_time TIMESTAMPTZ NOT NULL,
    replay_key TEXT NOT NULL,
    work_center_id TEXT,
    machine_id TEXT,
    work_order_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload_hash_sha256 TEXT NOT NULL CHECK (payload_hash_sha256 ~ '^[a-f0-9]{64}$'),
    actor_ref TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (machine_raw_event_id, derivation_profile_id, derived_event_type, replay_key)
);

CREATE INDEX IF NOT EXISTS idx_production_derived_events_time
    ON production_derived_events (machine_id, event_time DESC);

DROP TRIGGER IF EXISTS trg_production_derived_events_append_only_update ON production_derived_events;
CREATE TRIGGER trg_production_derived_events_append_only_update
    BEFORE UPDATE ON production_derived_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_append_only_mes_spine_mutation();

DROP TRIGGER IF EXISTS trg_production_derived_events_append_only_delete ON production_derived_events;
CREATE TRIGGER trg_production_derived_events_append_only_delete
    BEFORE DELETE ON production_derived_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_append_only_mes_spine_mutation();

INSERT INTO control_plane_command_handlers
    (command_name, handler_key, handler_state, required_role_set, required_guard_set, emitted_event_types)
VALUES
    (
        'RecordMachineEvent',
        'mes.machine_event_spine.record_raw_event',
        'active',
        '["machine_connector","mes_gateway","admin"]'::jsonb,
        '["adapter_identity","source_timestamp","replay_key"]'::jsonb,
        '["machine.raw_event_recorded"]'::jsonb
    ),
    (
        'DeriveProductionEvent',
        'mes.machine_event_spine.derive_production_event',
        'active',
        '["mes_event_worker","admin"]'::jsonb,
        '["raw_event_exists","profile_active","idempotent_derivation"]'::jsonb,
        '["mes.production_event_derived"]'::jsonb
    )
ON CONFLICT (command_name, handler_key) DO UPDATE
SET handler_state = EXCLUDED.handler_state,
    required_role_set = EXCLUDED.required_role_set,
    required_guard_set = EXCLUDED.required_guard_set,
    emitted_event_types = EXCLUDED.emitted_event_types,
    updated_at = now();

COMMIT;
