-- ============================================================================
-- Migration 104: eQMS Change Authority and Field Governance
-- ============================================================================
-- Purpose:
--   Extend the existing PLM change-control backbone with executable authority
--   rules for post-release object/field/effectivity changes.
--
-- Rollback:
--   DROP TABLE IF EXISTS eqms_field_change_authorization,
--   eqms_field_governance_rule, eqms_change_resulting_object,
--   eqms_change_affected_object CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eqms_change_affected_object (
    change_affected_object_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id       UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    object_type               TEXT NOT NULL,
    object_id                 TEXT NOT NULL,
    object_revision           TEXT,
    affected_fields           TEXT[] NOT NULL DEFAULT '{}',
    allowed_effect            TEXT NOT NULL
        CHECK (allowed_effect IN ('create', 'revise', 'obsolete', 'replace', 'amend', 'deviation', 'metadata_update')),
    effectivity_rule          JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_required     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_change_affected_object_lookup
    ON eqms_change_affected_object (object_type, object_id, plm_change_order_id);

CREATE INDEX IF NOT EXISTS idx_eqms_change_affected_object_fields
    ON eqms_change_affected_object USING GIN (affected_fields);

CREATE TABLE IF NOT EXISTS eqms_change_resulting_object (
    change_resulting_object_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id        UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    resulting_revision         TEXT,
    result_role                TEXT NOT NULL
        CHECK (result_role IN ('new_revision', 'replacement', 'superseding_record', 'published_record')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_change_resulting_object_lookup
    ON eqms_change_resulting_object (object_type, object_id, plm_change_order_id);

CREATE TABLE IF NOT EXISTS eqms_field_governance_rule (
    field_governance_rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type              TEXT NOT NULL,
    field_path               TEXT NOT NULL,
    lifecycle_state          TEXT NOT NULL,
    governance_class         TEXT NOT NULL
        CHECK (governance_class IN ('free_edit', 'controlled', 'post_release_locked', 'never_editable')),
    change_required          BOOLEAN NOT NULL DEFAULT FALSE,
    signature_required       BOOLEAN NOT NULL DEFAULT FALSE,
    warn_only                BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    org_company_code         VARCHAR(30),
    org_legal_entity_code    VARCHAR(30),
    org_plant_id             VARCHAR(30),
    org_site_id              VARCHAR(30),
    source_system            VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id         VARCHAR(160),
    payload_schema_version   VARCHAR(30) NOT NULL DEFAULT '1.0',
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version              BIGINT NOT NULL DEFAULT 1,
    UNIQUE (object_type, field_path, lifecycle_state, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_eqms_field_governance_lookup
    ON eqms_field_governance_rule (object_type, field_path, lifecycle_state, effective_from, effective_to);

CREATE UNIQUE INDEX IF NOT EXISTS ux_eqms_field_governance_active_rule
    ON eqms_field_governance_rule (object_type, field_path, lifecycle_state)
    WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS eqms_field_change_authorization (
    field_change_authorization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id           UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id),
    object_type                   TEXT NOT NULL,
    object_id                     TEXT NOT NULL,
    field_path                    TEXT NOT NULL,
    authorized_effect             TEXT NOT NULL,
    authorized_from               TIMESTAMPTZ NOT NULL DEFAULT now(),
    authorized_to                 TIMESTAMPTZ,
    consumed_at                   TIMESTAMPTZ,
    consumed_by                   UUID REFERENCES users(user_id),
    metadata                      JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_field_change_authorization_lookup
    ON eqms_field_change_authorization (object_type, object_id, field_path, authorized_from, authorized_to);

-- Seed the highest-risk order fields already flagged by OrderWorkflowService.
INSERT INTO eqms_field_governance_rule (
    object_type, field_path, lifecycle_state, governance_class,
    change_required, signature_required, warn_only, effective_from, metadata
)
VALUES
    ('jo', 'part_revision', 'released', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'part_revision', 'active', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'material_spec', 'released', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'material_spec', 'active', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'routing_id', 'released', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'routing_id', 'active', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'part_revision', 'running', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'material_spec', 'running', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'routing_id', 'running', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'part_revision', 'inspection', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'material_spec', 'inspection', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('jo', 'routing_id', 'inspection', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "order_ecr_fields"}'::jsonb),
    ('document_revision', '*', 'released', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "document_release_lock"}'::jsonb),
    ('form_record', '*', 'locked', 'post_release_locked', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "form_record_lock"}'::jsonb),
    ('evidence_record', '*', 'locked', 'never_editable', true, true, false, '2026-01-01T00:00:00Z', '{"seed": "evidence_lock"}'::jsonb)
ON CONFLICT (object_type, field_path, lifecycle_state) WHERE effective_to IS NULL
DO UPDATE SET
    governance_class = EXCLUDED.governance_class,
    change_required = EXCLUDED.change_required,
    signature_required = EXCLUDED.signature_required,
    warn_only = EXCLUDED.warn_only,
    metadata = eqms_field_governance_rule.metadata || EXCLUDED.metadata;

COMMIT;
