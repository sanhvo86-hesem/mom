-- ============================================================================
-- Migration 236: Regulated Command Evidence Policy
-- ============================================================================
-- Purpose:
--   Physicalize the runtime policy spine that binds governed commands to
--   workflow/status authority, approval steps, signature meaning, re-auth,
--   SoD, record hash, and authoritative audit requirements.
--
-- Data safety:
--   Additive migration. It does not register domain handlers or mutate
--   existing approvals/signature events.
--
-- Rollback:
--   DROP TABLE IF EXISTS regulated_command_signature_event_link CASCADE;
--   DROP TABLE IF EXISTS regulated_command_policy_step CASCADE;
--   DROP TABLE IF EXISTS regulated_command_policy CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS regulated_command_policy (
    regulated_command_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name                VARCHAR(120) NOT NULL UNIQUE,
    governed_root_code          VARCHAR(80)  NOT NULL,
    workflow_id                 VARCHAR(120),
    status_set_key              VARCHAR(120),
    required_signature_meaning  VARCHAR(120) NOT NULL,
    required_signature_action   VARCHAR(120) NOT NULL,
    require_reauth_challenge    BOOLEAN      NOT NULL DEFAULT true,
    require_authoritative_audit BOOLEAN      NOT NULL DEFAULT true,
    allow_self_approval         BOOLEAN      NOT NULL DEFAULT false,
    policy_state                VARCHAR(30)  NOT NULL DEFAULT 'active'
        CHECK (policy_state IN ('draft', 'active', 'retired')),
    effective_from              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    effective_to                TIMESTAMPTZ,
    metadata                    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    row_version                 BIGINT       NOT NULL DEFAULT 1,
    CHECK (length(trim(required_signature_meaning)) > 0),
    CHECK (length(trim(required_signature_action)) > 0),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_regulated_command_policy_root
    ON regulated_command_policy (governed_root_code, policy_state, effective_from);

CREATE TABLE IF NOT EXISTS regulated_command_policy_step (
    regulated_command_policy_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulated_command_policy_id      UUID NOT NULL REFERENCES regulated_command_policy(regulated_command_policy_id) ON DELETE CASCADE,
    step_code                        VARCHAR(80) NOT NULL,
    step_sequence                    INT NOT NULL CHECK (step_sequence > 0),
    approver_role_code               VARCHAR(120) NOT NULL,
    required                         BOOLEAN NOT NULL DEFAULT true,
    signature_meaning                VARCHAR(120),
    sod_rule_code                    VARCHAR(120) NOT NULL DEFAULT 'creator_approver_separation',
    same_actor_allowed               BOOLEAN NOT NULL DEFAULT false,
    required_evidence                JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata                         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (regulated_command_policy_id, step_code),
    UNIQUE (regulated_command_policy_id, step_sequence),
    CHECK (length(trim(step_code)) > 0),
    CHECK (length(trim(approver_role_code)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_regulated_command_policy_step_role
    ON regulated_command_policy_step (approver_role_code, required);

CREATE TABLE IF NOT EXISTS regulated_command_signature_event_link (
    regulated_command_signature_event_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulated_command_policy_id               UUID NOT NULL REFERENCES regulated_command_policy(regulated_command_policy_id),
    command_name                              VARCHAR(120) NOT NULL,
    aggregate_type                            TEXT,
    aggregate_id                              TEXT,
    signer_ref                                TEXT NOT NULL,
    creator_ref                               TEXT,
    signature_event_id                        UUID REFERENCES signature_events(signature_event_id),
    eqms_signature_event_id                   UUID REFERENCES eqms_electronic_signature_event(signature_event_id),
    auth_challenge_id                         TEXT REFERENCES e_signature_auth_challenges(auth_challenge_id),
    signature_meaning                         VARCHAR(120) NOT NULL,
    record_hash_sha256                        CHAR(64) NOT NULL,
    sod_exception_ref                         TEXT,
    linked_at                                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (length(trim(signature_meaning)) > 0),
    CHECK (record_hash_sha256 ~ '^[a-f0-9]{64}$'),
    CHECK (signature_event_id IS NOT NULL OR eqms_signature_event_id IS NOT NULL),
    CHECK (creator_ref IS NULL OR creator_ref <> signer_ref OR sod_exception_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_regulated_command_signature_link_command
    ON regulated_command_signature_event_link (command_name, aggregate_type, aggregate_id, linked_at DESC);

CREATE INDEX IF NOT EXISTS idx_regulated_command_signature_link_challenge
    ON regulated_command_signature_event_link (auth_challenge_id)
    WHERE auth_challenge_id IS NOT NULL;

INSERT INTO regulated_command_policy (
    command_name,
    governed_root_code,
    workflow_id,
    status_set_key,
    required_signature_meaning,
    required_signature_action,
    metadata
) VALUES
    ('EngineeringReleasePackage.Release', 'MDA-ENGINEERING-RELEASE', 'wf_engineering_release_package', 'engineering_release_package_status', 'engineering_package_release_approval', 'engineering_package_release', '{"prompt":"P32","source":"runtime_upgrade"}'::jsonb),
    ('ItemRevision.Release', 'MDA-ITEM-REVISION-SPEC', 'wf_item_revision_release', 'item_revision_status', 'item_revision_release_approval', 'item_revision_release', '{"prompt":"P32","source":"runtime_upgrade"}'::jsonb),
    ('QualityHold.Release', 'MDA-QUALITY-CASE', 'wf_quality_hold', 'quality_hold_status', 'quality_hold_release_approval', 'quality_hold_release', '{"prompt":"P32","source":"runtime_upgrade"}'::jsonb),
    ('PartyMerge.Apply', 'MDA-PARTY-IDENTITY', 'wf_party_merge', 'party_merge_status', 'party_merge_approval', 'party_merge_apply', '{"prompt":"P32","source":"runtime_upgrade"}'::jsonb)
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
       'approval',
       1,
       'qa_manager',
       p.required_signature_meaning,
       '["signed_record_hash","consumed_reauth_challenge","authoritative_audit_store"]'::jsonb
FROM regulated_command_policy p
WHERE p.command_name IN ('EngineeringReleasePackage.Release', 'ItemRevision.Release', 'QualityHold.Release', 'PartyMerge.Apply')
ON CONFLICT (regulated_command_policy_id, step_code) DO UPDATE SET
    approver_role_code = EXCLUDED.approver_role_code,
    signature_meaning = EXCLUDED.signature_meaning,
    required_evidence = EXCLUDED.required_evidence,
    updated_at = now();

COMMIT;
