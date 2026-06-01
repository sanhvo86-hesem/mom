-- P52: Resource readiness runtime closure for WO/MES governed commands.

BEGIN;

CREATE TABLE IF NOT EXISTS resource_readiness_evidence_state (
    evidence_state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_ref TEXT NOT NULL,
    operation_ref TEXT,
    command_scope TEXT NOT NULL DEFAULT '*',
    evidence_key TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_ref TEXT NOT NULL,
    readiness_status TEXT NOT NULL
        CHECK (readiness_status IN ('valid', 'missing', 'expired', 'held', 'incompatible', 'unauthorized', 'stale', 'blocked')),
    evidence_hash_sha256 CHAR(64) NOT NULL,
    source_authority TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    operator_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_order_ref, operation_ref, command_scope, evidence_key, resource_ref)
);

CREATE INDEX IF NOT EXISTS idx_resource_readiness_evidence_lookup
    ON resource_readiness_evidence_state (work_order_ref, operation_ref, command_scope, evidence_key, readiness_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS resource_readiness_snapshot (
    readiness_snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_name TEXT NOT NULL,
    work_order_ref TEXT NOT NULL,
    job_ref TEXT,
    operation_ref TEXT,
    actor_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('allow', 'block')),
    readiness_hash_sha256 CHAR(64) NOT NULL,
    required_evidence_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    operator_reason_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (command_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_resource_readiness_snapshot_wo
    ON resource_readiness_snapshot (work_order_ref, operation_ref, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_readiness_snapshot_decision
    ON resource_readiness_snapshot (decision, command_name, created_at DESC);

DROP TRIGGER IF EXISTS trg_resource_readiness_snapshot_immutable_update ON resource_readiness_snapshot;
CREATE TRIGGER trg_resource_readiness_snapshot_immutable_update
    BEFORE UPDATE ON resource_readiness_snapshot
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_resource_readiness_snapshot_immutable_delete ON resource_readiness_snapshot;
CREATE TRIGGER trg_resource_readiness_snapshot_immutable_delete
    BEFORE DELETE ON resource_readiness_snapshot
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

COMMIT;
