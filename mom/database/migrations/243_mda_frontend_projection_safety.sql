-- ============================================================================
-- Migration 243: MDA frontend projection safety and record shell anchors
-- ============================================================================
-- Purpose:
--   Physical anchors for P40 operator UX safety. Workspaces are projections,
--   authoritative records open through record shells, unsafe actions carry
--   disabled reasons, stale projections are visible, offline candidates never
--   mutate governed truth, and aliases cannot invent record identifiers.
--
-- Data safety:
--   Additive migration only. It does not change existing UI routes.
--
-- Rollback:
--   DROP TABLE IF EXISTS mda_frontend_action_guard_decision,
--     mda_offline_candidate_queue, mda_frontend_alias_resolution_policy,
--     mda_workspace_projection_freshness, mda_workspace_projection_policy,
--     mda_authoritative_record_shell_anchor CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mda_authoritative_record_shell_anchor (
    mda_authoritative_record_shell_anchor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governed_root_code                       VARCHAR(80) NOT NULL,
    canonical_record_id                      VARCHAR(160) NOT NULL,
    canonical_record_ref                     VARCHAR(260) NOT NULL,
    record_shell_route                       VARCHAR(300) NOT NULL,
    audit_panel_ref                          VARCHAR(260),
    evidence_panel_ref                       VARCHAR(260),
    command_surface_ref                      VARCHAR(260),
    shell_state                              VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (shell_state IN ('draft', 'active', 'retired')),
    metadata                                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (governed_root_code, canonical_record_id)
);

CREATE TABLE IF NOT EXISTS mda_workspace_projection_policy (
    mda_workspace_projection_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_key                       VARCHAR(120) NOT NULL UNIQUE,
    route_path                          VARCHAR(300) NOT NULL UNIQUE,
    governed_root_code                  VARCHAR(80),
    projection_source                   VARCHAR(160) NOT NULL,
    mutation_policy                     VARCHAR(40) NOT NULL DEFAULT 'disabled'
        CHECK (mutation_policy IN ('disabled', 'command_redirect_only')),
    max_age_seconds                     INT NOT NULL DEFAULT 300 CHECK (max_age_seconds > 0),
    reanchor_route_template             VARCHAR(300) NOT NULL,
    policy_state                        VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (policy_state IN ('draft', 'active', 'retired')),
    metadata                            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mda_workspace_projection_freshness (
    mda_workspace_projection_freshness_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_key                         VARCHAR(120) NOT NULL,
    projection_ref                        VARCHAR(260) NOT NULL,
    source_snapshot_hash_sha256           CHAR(64) NOT NULL,
    generated_at                          TIMESTAMPTZ NOT NULL,
    expires_at                            TIMESTAMPTZ NOT NULL,
    freshness_state                       VARCHAR(30) NOT NULL
        CHECK (freshness_state IN ('fresh', 'stale', 'expired', 'unknown')),
    metadata                              JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (workspace_key, projection_ref)
);

CREATE TABLE IF NOT EXISTS mda_frontend_alias_resolution_policy (
    mda_frontend_alias_resolution_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_key                               VARCHAR(160) NOT NULL UNIQUE,
    governed_root_code                      VARCHAR(80) NOT NULL,
    canonical_record_id                     VARCHAR(160) NOT NULL,
    alias_state                             VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (alias_state IN ('active', 'retired', 'blocked')),
    evidence_hash_sha256                    CHAR(64) NOT NULL,
    metadata                                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mda_offline_candidate_queue (
    mda_offline_candidate_queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_ref                  VARCHAR(160) NOT NULL UNIQUE,
    workspace_key                  VARCHAR(120) NOT NULL,
    actor_ref                      VARCHAR(120) NOT NULL,
    action_code                    VARCHAR(120) NOT NULL,
    canonical_record_ref           VARCHAR(260),
    payload_hash_sha256            CHAR(64) NOT NULL,
    queue_state                    VARCHAR(30) NOT NULL DEFAULT 'candidate_only'
        CHECK (queue_state IN ('candidate_only', 'ready_for_review', 'rejected', 'expired')),
    committed_to_authority         BOOLEAN NOT NULL DEFAULT FALSE CHECK (committed_to_authority = FALSE),
    queued_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mda_frontend_action_guard_decision (
    mda_frontend_action_guard_decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_path                            VARCHAR(300) NOT NULL,
    route_class                           VARCHAR(60) NOT NULL
        CHECK (route_class IN ('authoritative_record_shell', 'workspace_projection', 'unknown')),
    action_code                           VARCHAR(120) NOT NULL,
    decision                              VARCHAR(20) NOT NULL
        CHECK (decision IN ('allow', 'disable', 'queue_candidate', 'deny')),
    reason_code                           VARCHAR(100) NOT NULL,
    evidence_hash_sha256                  CHAR(64) NOT NULL,
    decided_at                            TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                              JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_frontend_guard_route_action
    ON mda_frontend_action_guard_decision (route_path, action_code, decision, decided_at);

COMMENT ON TABLE mda_workspace_projection_policy IS
    'Workspace routes are projection-only. Unsafe actions must be disabled or redirected to command authority with visible reasons.';

COMMENT ON TABLE mda_offline_candidate_queue IS
    'Offline operator inputs are candidates only and cannot be marked as committed authority truth in this table.';

COMMIT;
