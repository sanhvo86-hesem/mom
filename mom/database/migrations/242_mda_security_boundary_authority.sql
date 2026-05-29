-- ============================================================================
-- Migration 242: MDA security boundary authority anchors
-- ============================================================================
-- Purpose:
--   Physical policy/evidence anchors for P39 authorization, field redaction,
--   SoD exception lifecycle, AI action firewall and OT signal trust decisions.
--
-- Data safety:
--   Additive migration only. It does not grant any permission and does not
--   change active authorization behavior by itself.
--
-- Rollback:
--   DROP TABLE IF EXISTS mda_security_boundary_decision,
--     mda_ai_action_firewall_event, mda_ot_signal_trust_policy,
--     mda_sod_exception_authority, mda_field_redaction_policy,
--     mda_security_boundary_policy CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mda_security_boundary_policy (
    mda_security_boundary_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code                     VARCHAR(100) NOT NULL UNIQUE,
    policy_type                     VARCHAR(40) NOT NULL
        CHECK (policy_type IN ('authorization', 'field_redaction', 'sod', 'ai_firewall', 'ot_trust', 'reauth')),
    governed_root_code              VARCHAR(80),
    command_name                    VARCHAR(120),
    default_decision                VARCHAR(20) NOT NULL DEFAULT 'deny'
        CHECK (default_decision IN ('allow', 'deny', 'stepup')),
    required_aal                    INT NOT NULL DEFAULT 1 CHECK (required_aal BETWEEN 1 AND 3),
    policy_payload                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_state                    VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (policy_state IN ('draft', 'active', 'retired')),
    effective_from                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                    TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                      VARCHAR(120),
    row_version                     INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_mda_security_boundary_policy_type
    ON mda_security_boundary_policy (policy_type, policy_state, governed_root_code);

CREATE TABLE IF NOT EXISTS mda_field_redaction_policy (
    mda_field_redaction_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code                   VARCHAR(100) NOT NULL,
    resource_kind                 VARCHAR(100) NOT NULL,
    field_name                    VARCHAR(120) NOT NULL,
    redaction_class               VARCHAR(40) NOT NULL
        CHECK (redaction_class IN ('pii', 'credential', 'financial', 'quality_sensitive', 'customer_sensitive', 'supplier_sensitive', 'ot_sensitive')),
    visible_role_codes            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    mask_strategy                 VARCHAR(40) NOT NULL DEFAULT 'mask'
        CHECK (mask_strategy IN ('mask', 'omit', 'hash', 'last4')),
    policy_state                  VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (policy_state IN ('draft', 'active', 'retired')),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_kind, field_name, policy_code)
);

CREATE TABLE IF NOT EXISTS mda_sod_exception_authority (
    mda_sod_exception_authority_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_code                 VARCHAR(100) NOT NULL UNIQUE,
    command_name                   VARCHAR(120) NOT NULL,
    requester_ref                  VARCHAR(120) NOT NULL,
    approver_ref                   VARCHAR(120) NOT NULL,
    reason                         TEXT NOT NULL,
    approved_by                    VARCHAR(120) NOT NULL,
    approved_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at                     TIMESTAMPTZ NOT NULL,
    exception_state                VARCHAR(30) NOT NULL DEFAULT 'approved'
        CHECK (exception_state IN ('draft', 'approved', 'expired', 'revoked', 'used')),
    evidence_hash_sha256           CHAR(64) NOT NULL,
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_sod_exception_active
    ON mda_sod_exception_authority (command_name, requester_ref, approver_ref, exception_state, expires_at);

CREATE TABLE IF NOT EXISTS mda_ot_signal_trust_policy (
    mda_ot_signal_trust_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adapter_code                  VARCHAR(100) NOT NULL,
    signal_tag                    VARCHAR(160) NOT NULL,
    semantic_name                 VARCHAR(160) NOT NULL,
    approved_checksum_sha256      CHAR(64) NOT NULL,
    approved_by                   VARCHAR(120) NOT NULL,
    approved_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    policy_state                  VARCHAR(30) NOT NULL DEFAULT 'approved'
        CHECK (policy_state IN ('draft', 'approved', 'suspended', 'retired')),
    metadata                      JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (adapter_code, signal_tag, semantic_name)
);

CREATE TABLE IF NOT EXISTS mda_ai_action_firewall_event (
    mda_ai_action_firewall_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_ref                       VARCHAR(120) NOT NULL,
    requested_command               VARCHAR(120) NOT NULL,
    requested_action_class          VARCHAR(40) NOT NULL,
    firewall_decision               VARCHAR(20) NOT NULL
        CHECK (firewall_decision IN ('refused', 'proposal_only', 'allowed_read')),
    reason_code                     VARCHAR(80) NOT NULL,
    evidence_hash_sha256            CHAR(64) NOT NULL,
    occurred_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_ai_firewall_event_command
    ON mda_ai_action_firewall_event (requested_command, firewall_decision, occurred_at);

CREATE TABLE IF NOT EXISTS mda_security_boundary_decision (
    mda_security_boundary_decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_scope                    VARCHAR(80) NOT NULL,
    actor_ref                         VARCHAR(120),
    resource_kind                     VARCHAR(100),
    resource_ref                      VARCHAR(160),
    command_name                      VARCHAR(120),
    decision                          VARCHAR(20) NOT NULL
        CHECK (decision IN ('allow', 'deny', 'stepup', 'refuse', 'redact')),
    reason_code                       VARCHAR(100) NOT NULL,
    evidence_hash_sha256              CHAR(64) NOT NULL,
    decided_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                          JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_security_boundary_decision_scope
    ON mda_security_boundary_decision (decision_scope, decision, decided_at);

COMMENT ON TABLE mda_ai_action_firewall_event IS
    'AI advisory boundary evidence. AI may propose but cannot approve, release, sign, post or mutate governed records.';

COMMENT ON TABLE mda_ot_signal_trust_policy IS
    'Approved OT adapter signal tag semantics and checksum policy. Unapproved tag map changes cannot change manufacturing meaning.';

COMMIT;
