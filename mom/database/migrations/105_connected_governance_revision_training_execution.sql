-- ============================================================================
-- Migration 105: Connected Revision Training Execution Governance
-- ============================================================================
-- Purpose:
--   Add an authoritative controlled-revision rollout, training-obligation, and
--   execution-entitlement ledger slice. The slice connects released process /
--   document / inspection revisions to site rollout state, qualification proof,
--   and execution gate decisions.
--
-- Data safety:
--   Additive migration only. Existing document, training, execution, event, and
--   trusted-release-record tables are not modified.
--
-- Rollback:
--   DROP TABLE IF EXISTS eqms_execution_entitlement_decision,
--   eqms_training_obligation, eqms_controlled_revision_rollout CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eqms_controlled_revision_rollout (
    rollout_id                    VARCHAR(120) PRIMARY KEY,
    controlled_revision_key       VARCHAR(180) NOT NULL,
    revision_type                 VARCHAR(80)  NOT NULL,
    revision_id                   VARCHAR(160) NOT NULL,
    revision_version              VARCHAR(80)  NOT NULL,
    document_revision_id          VARCHAR(160),
    inspection_plan_id            VARCHAR(160),
    control_plan_id               VARCHAR(160),
    work_instruction_id           VARCHAR(160),
    change_control_id             VARCHAR(160),

    operation_id                  VARCHAR(120),
    operation_seq                 VARCHAR(40),
    work_center_id                VARCHAR(80),
    machine_id                    VARCHAR(80),
    part_number                   VARCHAR(120),
    part_revision                 VARCHAR(80),
    role_code                     VARCHAR(80),
    required_qualification_type   VARCHAR(80),
    required_qualification_code   VARCHAR(120),
    min_proficiency               INTEGER NOT NULL DEFAULT 0,

    rollout_state                 VARCHAR(30) NOT NULL
        CHECK (rollout_state IN ('planned', 'pending_training', 'active', 'blocked', 'superseded', 'retired')),
    effective_from                TIMESTAMPTZ NOT NULL,
    effective_to                  TIMESTAMPTZ,
    released_at                   TIMESTAMPTZ NOT NULL,
    released_by                   VARCHAR(120),

    enterprise_id                 VARCHAR(80),
    company_id                    VARCHAR(80),
    site_id                       VARCHAR(80),
    plant_id                      VARCHAR(80),
    org_company_code              VARCHAR(30),
    org_legal_entity_code         VARCHAR(30),
    org_plant_id                  VARCHAR(30),
    org_site_id                   VARCHAR(30),

    payload_schema_version        VARCHAR(40) NOT NULL DEFAULT 'connected_governance.v1',
    source_system                 VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id              VARCHAR(160),
    metadata                      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version                   BIGINT NOT NULL DEFAULT 1,
    UNIQUE (
        controlled_revision_key,
        revision_type,
        org_company_code,
        org_legal_entity_code,
        org_plant_id,
        org_site_id,
        operation_seq,
        work_center_id,
        part_number,
        part_revision,
        effective_from
    )
);

CREATE INDEX IF NOT EXISTS idx_eqms_cgov_rollout_revision
    ON eqms_controlled_revision_rollout (revision_type, revision_id, revision_version, rollout_state);

CREATE INDEX IF NOT EXISTS idx_eqms_cgov_rollout_scope
    ON eqms_controlled_revision_rollout (org_company_code, org_legal_entity_code, org_plant_id, org_site_id, rollout_state);

CREATE INDEX IF NOT EXISTS idx_eqms_cgov_rollout_execution_match
    ON eqms_controlled_revision_rollout (operation_seq, work_center_id, machine_id, part_number, part_revision, rollout_state);

CREATE INDEX IF NOT EXISTS idx_eqms_cgov_rollout_effectivity
    ON eqms_controlled_revision_rollout (effective_from, effective_to);

CREATE TABLE IF NOT EXISTS eqms_training_obligation (
    training_obligation_id        VARCHAR(120) PRIMARY KEY,
    rollout_id                    VARCHAR(120) NOT NULL REFERENCES eqms_controlled_revision_rollout(rollout_id) ON DELETE CASCADE,
    obligation_key                VARCHAR(220) NOT NULL UNIQUE,
    controlled_revision_key       VARCHAR(180) NOT NULL,
    revision_type                 VARCHAR(80) NOT NULL,
    revision_id                   VARCHAR(160) NOT NULL,
    revision_version              VARCHAR(80) NOT NULL,
    audience_role                 VARCHAR(80),
    qualification_type            VARCHAR(80) NOT NULL,
    qualification_code            VARCHAR(120) NOT NULL,
    min_proficiency               INTEGER NOT NULL DEFAULT 0,
    obligation_state              VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (obligation_state IN ('open', 'satisfied', 'expired', 'superseded', 'cancelled')),
    due_at                        TIMESTAMPTZ,
    satisfied_at                  TIMESTAMPTZ,
    superseded_at                 TIMESTAMPTZ,

    enterprise_id                 VARCHAR(80),
    company_id                    VARCHAR(80),
    site_id                       VARCHAR(80),
    plant_id                      VARCHAR(80),
    org_company_code              VARCHAR(30),
    org_legal_entity_code         VARCHAR(30),
    org_plant_id                  VARCHAR(30),
    org_site_id                   VARCHAR(30),

    source_system                 VARCHAR(80) NOT NULL DEFAULT 'connected_governance',
    source_record_id              VARCHAR(160),
    metadata                      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version                   BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_eqms_training_obligation_rollout
    ON eqms_training_obligation (rollout_id, obligation_state);

CREATE INDEX IF NOT EXISTS idx_eqms_training_obligation_scope
    ON eqms_training_obligation (org_company_code, org_legal_entity_code, org_plant_id, org_site_id, obligation_state);

CREATE INDEX IF NOT EXISTS idx_eqms_training_obligation_qualification
    ON eqms_training_obligation (qualification_type, qualification_code, audience_role, obligation_state);

CREATE TABLE IF NOT EXISTS eqms_execution_entitlement_decision (
    decision_id                   VARCHAR(120) PRIMARY KEY,
    decision_key                  VARCHAR(180) NOT NULL UNIQUE,
    decision_fingerprint_hash     CHAR(64) NOT NULL,
    action                        VARCHAR(120) NOT NULL,
    actor_id                      VARCHAR(120) NOT NULL,
    allowed                       BOOLEAN NOT NULL DEFAULT FALSE,
    reason_code                   VARCHAR(80) NOT NULL,
    message                       TEXT,
    rollout_id                    VARCHAR(120),
    training_obligation_id        VARCHAR(120),
    qualification_assertion_id    VARCHAR(160),
    assertion_state               VARCHAR(80),
    target_aggregate_type         VARCHAR(80) NOT NULL DEFAULT 'work_order',
    target_aggregate_id           VARCHAR(160) NOT NULL,
    wo_number                     VARCHAR(80),
    jo_number                     VARCHAR(80),
    operation_seq                 VARCHAR(40),
    work_center_id                VARCHAR(80),
    machine_id                    VARCHAR(80),
    part_number                   VARCHAR(120),
    part_revision                 VARCHAR(80),
    active_revision               JSONB NOT NULL DEFAULT '{}'::jsonb,
    training_obligation           JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualification_assertion       JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_payload              JSONB NOT NULL DEFAULT '{}'::jsonb,

    enterprise_id                 VARCHAR(80),
    company_id                    VARCHAR(80),
    site_id                       VARCHAR(80),
    plant_id                      VARCHAR(80),
    org_company_code              VARCHAR(30),
    org_legal_entity_code         VARCHAR(30),
    org_plant_id                  VARCHAR(30),
    org_site_id                   VARCHAR(30),

    correlation_id                VARCHAR(120),
    request_id                    VARCHAR(120),
    traceparent                   VARCHAR(255),
    source_system                 VARCHAR(80) NOT NULL DEFAULT 'connected_governance',
    source_record_id              VARCHAR(160),
    payload_schema_version        VARCHAR(40) NOT NULL DEFAULT 'connected_governance_decision.v1',
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version                   BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_eqms_entitlement_decision_target
    ON eqms_execution_entitlement_decision (target_aggregate_type, target_aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eqms_entitlement_decision_scope
    ON eqms_execution_entitlement_decision (org_company_code, org_legal_entity_code, org_plant_id, org_site_id, allowed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eqms_entitlement_decision_rollout
    ON eqms_execution_entitlement_decision (rollout_id, allowed, reason_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eqms_entitlement_decision_payload
    ON eqms_execution_entitlement_decision USING GIN (decision_payload);

COMMENT ON TABLE eqms_controlled_revision_rollout IS
    'Site-scoped controlled revision rollout authority connecting released documents/process/inspection revisions to execution sites.';

COMMENT ON TABLE eqms_training_obligation IS
    'Training and qualification obligations generated from controlled revision releases.';

COMMENT ON TABLE eqms_execution_entitlement_decision IS
    'Append-only execution entitlement decisions proving whether an actor could execute against active revision and qualification state.';

COMMIT;
