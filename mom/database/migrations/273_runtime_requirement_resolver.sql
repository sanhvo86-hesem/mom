-- P47 Runtime Requirement Resolver and fail-closed gate context builder.
-- Defines policy and snapshot anchors. Command handlers must resolve policy
-- from these rows (or stronger domain services) and must not trust caller
-- require_* flags as final operational truth.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS runtime_requirement_policy (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_scope VARCHAR(64) NOT NULL,
    command_name VARCHAR(128) NOT NULL,
    evidence_class VARCHAR(96) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    precedence INTEGER NOT NULL DEFAULT 0,
    match_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_authority VARCHAR(128) NOT NULL,
    operator_message TEXT,
    problem_code VARCHAR(96) NOT NULL DEFAULT 'missing_required_evidence',
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('draft','active','superseded','retired')),
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT runtime_requirement_policy_effective_window
        CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_runtime_req_policy_command
    ON runtime_requirement_policy (command_name, lifecycle_status, precedence DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_req_policy_match
    ON runtime_requirement_policy USING GIN (match_criteria);

CREATE INDEX IF NOT EXISTS idx_runtime_req_policy_evidence
    ON runtime_requirement_policy (evidence_class, required);

CREATE TABLE IF NOT EXISTS runtime_requirement_snapshot (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name VARCHAR(128) NOT NULL,
    target_ref VARCHAR(160),
    gate_state VARCHAR(32) NOT NULL CHECK (gate_state IN ('ready','blocked')),
    requirements_snapshot_hash CHAR(64) NOT NULL,
    requirement_payload JSONB NOT NULL,
    candidate_evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_authorities JSONB NOT NULL DEFAULT '[]'::jsonb,
    correlation_id VARCHAR(128),
    request_id VARCHAR(128),
    actor_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_req_snapshot_hash
    ON runtime_requirement_snapshot (requirements_snapshot_hash);

CREATE INDEX IF NOT EXISTS idx_runtime_req_snapshot_command
    ON runtime_requirement_snapshot (command_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_req_snapshot_blocked
    ON runtime_requirement_snapshot (command_name, created_at DESC)
    WHERE gate_state = 'blocked';

COMMENT ON TABLE runtime_requirement_policy IS
    'Authoritative runtime requirement policy rows. Caller require_* fields are not authoritative.';

COMMENT ON TABLE runtime_requirement_snapshot IS
    'Immutable gate context snapshot evidence for governed command execution.';
