-- World-class closure hardening: e-signature ceremony, deterministic audit
-- sequencing, and server-authoritative 5M policy rules.

BEGIN;

ALTER TABLE signature_events
    ADD COLUMN IF NOT EXISTS auth_challenge_id TEXT,
    ADD COLUMN IF NOT EXISTS auth_method TEXT,
    ADD COLUMN IF NOT EXISTS auth_result_hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS signer_identity_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS displayed_record_hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS signature_manifestation TEXT;

ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS aggregate_sequence BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_events_aggregate_sequence
    ON audit_events (aggregate_type, aggregate_id, aggregate_sequence)
    WHERE aggregate_sequence IS NOT NULL;

CREATE TABLE IF NOT EXISTS traceability_5m_policy_rules (
    traceability_5m_policy_rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_class       TEXT NOT NULL,
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL DEFAULT '*',
    material_required     BOOLEAN NOT NULL DEFAULT TRUE,
    machine_required      BOOLEAN NOT NULL DEFAULT TRUE,
    method_required       BOOLEAN NOT NULL DEFAULT TRUE,
    measurement_required  BOOLEAN NOT NULL DEFAULT TRUE,
    manpower_required     BOOLEAN NOT NULL DEFAULT TRUE,
    policy_source         TEXT NOT NULL CHECK (policy_source IN ('traceability_5m_policy_rules', 'control_plan', 'operation_policy', 'approved_waiver')),
    policy_state          TEXT NOT NULL DEFAULT 'active' CHECK (policy_state IN ('draft', 'active', 'superseded', 'withdrawn')),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    effective_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to          TIMESTAMPTZ,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    CHECK (policy_state <> 'active' OR source_change_order_id IS NOT NULL),
    UNIQUE (operation_class, object_type, object_id, effective_from),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_traceability_5m_policy_lookup
    ON traceability_5m_policy_rules (operation_class, object_type, object_id, policy_state, effective_from DESC);

COMMIT;
