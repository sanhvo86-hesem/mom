-- ============================================================================
-- Migration 102: eQMS Document and Form Control
-- ============================================================================
-- Purpose:
--   Add record-centric document and form lifecycle tables. Existing document
--   files, form_schemas, form_entries, allocations, and form workflow JSON
--   remain compatibility sources until their command services cut over.
--
-- Rollback:
--   DROP TABLE IF EXISTS eqms_form_record_version, eqms_form_record,
--   eqms_form_submission_attempt, eqms_form_issuance, eqms_form_schema_version,
--   eqms_form_template_revision, eqms_form_family, eqms_document_read_ack,
--   eqms_document_distribution, eqms_document_effectivity,
--   eqms_document_revision, eqms_document_family CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eqms_document_family (
    document_family_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_code           TEXT        NOT NULL UNIQUE,
    doc_type           TEXT        NOT NULL CHECK (doc_type IN ('SOP', 'WI', 'ANNEX', 'FRM', 'SPEC', 'POLICY', 'OTHER')),
    title              TEXT        NOT NULL,
    process_area       TEXT,
    owner_user_id      UUID        REFERENCES users(user_id),
    status             TEXT        NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'retired')),
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version        BIGINT      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eqms_document_revision (
    document_revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_family_id   UUID        NOT NULL REFERENCES eqms_document_family(document_family_id),
    revision             TEXT        NOT NULL,
    lifecycle_state      TEXT        NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete', 'withdrawn')),
    source_change_order_id UUID      REFERENCES plm_change_orders(plm_change_order_id),
    effective_from       TIMESTAMPTZ,
    effective_to         TIMESTAMPTZ,
    approved_by          UUID        REFERENCES users(user_id),
    approved_at          TIMESTAMPTZ,
    released_at          TIMESTAMPTZ,
    canonical_payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    readable_snapshot_artifact_id UUID,
    manifest_id          UUID,
    metadata             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version          BIGINT      NOT NULL DEFAULT 1,
    UNIQUE (document_family_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_eqms_doc_revision_state
    ON eqms_document_revision (lifecycle_state, released_at DESC);

CREATE TABLE IF NOT EXISTS eqms_document_effectivity (
    document_effectivity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_revision_id    UUID NOT NULL REFERENCES eqms_document_revision(document_revision_id) ON DELETE CASCADE,
    effectivity_type        TEXT NOT NULL CHECK (effectivity_type IN ('date', 'site', 'plant', 'product', 'lot', 'serial', 'order', 'role')),
    effectivity_value       JSONB NOT NULL,
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    source_system           VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id        VARCHAR(160),
    payload_schema_version  VARCHAR(30) NOT NULL DEFAULT '1.0',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version             BIGINT      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_eqms_doc_effectivity_revision
    ON eqms_document_effectivity (document_revision_id);

CREATE TABLE IF NOT EXISTS eqms_document_distribution (
    document_distribution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_revision_id     UUID NOT NULL REFERENCES eqms_document_revision(document_revision_id) ON DELETE CASCADE,
    audience_type            TEXT NOT NULL CHECK (audience_type IN ('user', 'role', 'department', 'site')),
    audience_ref             TEXT NOT NULL,
    required_ack             BOOLEAN NOT NULL DEFAULT FALSE,
    org_company_code         VARCHAR(30),
    org_legal_entity_code    VARCHAR(30),
    org_plant_id             VARCHAR(30),
    org_site_id              VARCHAR(30),
    source_system            VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id         VARCHAR(160),
    payload_schema_version   VARCHAR(30) NOT NULL DEFAULT '1.0',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version              BIGINT      NOT NULL DEFAULT 1,
    UNIQUE (document_revision_id, audience_type, audience_ref)
);

CREATE TABLE IF NOT EXISTS eqms_document_read_ack (
    document_read_ack_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_revision_id UUID NOT NULL REFERENCES eqms_document_revision(document_revision_id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(user_id),
    acknowledged_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature_event_id   UUID REFERENCES eqms_electronic_signature_event(signature_event_id),
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (document_revision_id, user_id)
);

CREATE TABLE IF NOT EXISTS eqms_form_family (
    form_family_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_code      TEXT        NOT NULL UNIQUE,
    title          TEXT        NOT NULL,
    owner_area     TEXT,
    status         TEXT        NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'retired')),
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version    BIGINT      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eqms_form_template_revision (
    form_template_revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_family_id            UUID NOT NULL REFERENCES eqms_form_family(form_family_id),
    revision                  TEXT NOT NULL,
    lifecycle_state           TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete')),
    source_document_revision_id UUID REFERENCES eqms_document_revision(document_revision_id),
    source_change_order_id    UUID REFERENCES plm_change_orders(plm_change_order_id),
    template_artifact_id      UUID,
    template_checksum_sha256  CHAR(64) NOT NULL,
    released_at               TIMESTAMPTZ,
    manifest_id               UUID,
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version               BIGINT NOT NULL DEFAULT 1,
    UNIQUE (form_family_id, revision)
);

CREATE TABLE IF NOT EXISTS eqms_form_schema_version (
    form_schema_version_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_template_revision_id  UUID NOT NULL REFERENCES eqms_form_template_revision(form_template_revision_id) ON DELETE CASCADE,
    schema_version             TEXT NOT NULL,
    json_schema                JSONB NOT NULL,
    canonicalization_rules     JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_rules           JSONB NOT NULL DEFAULT '{}'::jsonb,
    org_company_code           VARCHAR(30),
    org_legal_entity_code      VARCHAR(30),
    org_plant_id               VARCHAR(30),
    org_site_id                VARCHAR(30),
    source_system              VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id           VARCHAR(160),
    payload_schema_version     VARCHAR(30) NOT NULL DEFAULT '1.0',
    status                     TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'released', 'superseded')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version                BIGINT      NOT NULL DEFAULT 1,
    UNIQUE (form_template_revision_id, schema_version)
);

CREATE TABLE IF NOT EXISTS eqms_form_issuance (
    form_issuance_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id          TEXT NOT NULL UNIQUE,
    record_id              TEXT NOT NULL,
    form_template_revision_id UUID NOT NULL REFERENCES eqms_form_template_revision(form_template_revision_id),
    form_schema_version_id UUID NOT NULL REFERENCES eqms_form_schema_version(form_schema_version_id),
    issued_to              UUID REFERENCES users(user_id),
    issued_for_context     JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_mode          TEXT NOT NULL CHECK (delivery_mode IN ('online', 'offline_excel')),
    issued_artifact_id     UUID,
    issuance_manifest_id   UUID,
    status                 TEXT NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'downloaded', 'submitted', 'accepted', 'rejected', 'voided', 'expired')),
    issued_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at             TIMESTAMPTZ,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version            BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_eqms_form_issuance_record
    ON eqms_form_issuance (record_id, status);

CREATE TABLE IF NOT EXISTS eqms_form_submission_attempt (
    form_submission_attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_issuance_id           UUID NOT NULL REFERENCES eqms_form_issuance(form_issuance_id),
    attempt_no                 INT NOT NULL CHECK (attempt_no > 0),
    submitted_by               UUID REFERENCES users(user_id),
    submitted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    original_artifact_id       UUID,
    parsed_payload             JSONB,
    validation_status          TEXT NOT NULL DEFAULT 'received'
        CHECK (validation_status IN ('received', 'parsing', 'validating', 'valid', 'invalid', 'duplicate', 'quarantined')),
    validation_errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
    idempotency_key            TEXT,
    file_hash_sha256           CHAR(64),
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (form_issuance_id, attempt_no),
    UNIQUE (form_issuance_id, file_hash_sha256)
);

CREATE TABLE IF NOT EXISTS eqms_form_record (
    form_record_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id          TEXT NOT NULL UNIQUE,
    form_family_id     UUID REFERENCES eqms_form_family(form_family_id),
    current_version_id UUID,
    lifecycle_state    TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'finalized', 'locked', 'amending', 'superseded', 'voided')),
    created_from_issuance_id UUID REFERENCES eqms_form_issuance(form_issuance_id),
    org_company_code   VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id       VARCHAR(30),
    org_site_id        VARCHAR(30),
    source_system      VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id   VARCHAR(160),
    metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version        BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eqms_form_record_version (
    form_record_version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_record_id         UUID NOT NULL REFERENCES eqms_form_record(form_record_id),
    version_no             INT NOT NULL CHECK (version_no > 0),
    amendment_no           INT NOT NULL DEFAULT 0 CHECK (amendment_no >= 0),
    source_attempt_id      UUID REFERENCES eqms_form_submission_attempt(form_submission_attempt_id),
    canonical_payload      JSONB NOT NULL,
    readable_snapshot_artifact_id UUID NOT NULL,
    evidence_version_id    UUID NOT NULL,
    finalized_by           UUID REFERENCES users(user_id),
    finalized_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_order_id        UUID REFERENCES plm_change_orders(plm_change_order_id),
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (form_record_id, version_no)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_eqms_form_record_current_version'
    ) THEN
        ALTER TABLE eqms_form_record
            ADD CONSTRAINT fk_eqms_form_record_current_version
            FOREIGN KEY (current_version_id)
            REFERENCES eqms_form_record_version(form_record_version_id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

COMMIT;
