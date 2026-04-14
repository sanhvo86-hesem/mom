-- ============================================================================
-- Migration 106: eQMS World-Class Control Plane Spine
-- ============================================================================
-- Purpose:
--   Add exact, unambiguous control-plane tables for document control, form
--   control, evidence control, change authority, publication, retention, outbox,
--   and audit integrity. This is additive and coexists with the eqms_* tables
--   introduced in migrations 101-105 while command services migrate to the new
--   canonical names.
--
-- Non-negotiable semantics:
--   - SharePoint is publication/read-only only.
--   - Offline Excel is an issued carrier, not source of truth.
--   - Final evidence versions/artifacts/signature events are append-only.
--   - Post-release edits must point at released change authority.
--
-- Rollback:
--   DROP TABLE IF EXISTS retention_locks, integrity_exceptions,
--   integrity_digests, background_jobs, outbox_events, field_governance_rules,
--   plm_change_effectiveness_reviews, plm_change_verifications,
--   plm_change_training_requirements, plm_change_effectivities,
--   plm_change_resulting_objects, plm_change_affected_objects,
--   signature_events, evidence_publications, evidence_artifacts,
--   evidence_versions, evidence_records, frm_submission_attempts,
--   frm_issuances, frm_schema_versions, frm_template_revisions, frm_families,
--   doc_read_acknowledgements, doc_distributions, doc_effectivities,
--   doc_revisions, doc_families CASCADE;
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Document Control
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS doc_families (
    doc_family_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_code               TEXT NOT NULL UNIQUE,
    doc_type               TEXT NOT NULL CHECK (doc_type IN ('SOP', 'WI', 'ANNEX', 'FRM', 'SPEC', 'POLICY', 'OTHER')),
    title                  TEXT NOT NULL,
    process_area           TEXT,
    owner_user_id          UUID REFERENCES users(user_id),
    family_state           TEXT NOT NULL DEFAULT 'active'
        CHECK (family_state IN ('active', 'inactive', 'retired')),
    source_system          VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'doc_family.v1',
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS doc_revisions (
    doc_revision_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_family_id          UUID NOT NULL REFERENCES doc_families(doc_family_id),
    revision_label         TEXT NOT NULL,
    revision_sequence      INT NOT NULL CHECK (revision_sequence > 0),
    lifecycle_state        TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete', 'withdrawn')),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    canonical_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    readable_snapshot_uri  TEXT,
    manifest_hash_sha256   CHAR(64),
    approved_by            UUID REFERENCES users(user_id),
    approved_at            TIMESTAMPTZ,
    released_at            TIMESTAMPTZ,
    superseded_by_revision_id UUID REFERENCES doc_revisions(doc_revision_id),
    idempotency_key        TEXT,
    source_system          VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1,
    UNIQUE (doc_family_id, revision_label),
    UNIQUE (doc_family_id, revision_sequence),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_doc_revisions_state
    ON doc_revisions (lifecycle_state, released_at DESC);

CREATE TABLE IF NOT EXISTS doc_effectivities (
    doc_effectivity_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_revision_id        UUID NOT NULL REFERENCES doc_revisions(doc_revision_id) ON DELETE CASCADE,
    effectivity_type       TEXT NOT NULL CHECK (effectivity_type IN ('date', 'site', 'plant', 'product', 'lot', 'serial', 'order', 'role')),
    effectivity_scope      JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from         TIMESTAMPTZ NOT NULL,
    effective_to           TIMESTAMPTZ,
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    source_system          VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_doc_effectivities_revision
    ON doc_effectivities (doc_revision_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS doc_distributions (
    doc_distribution_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_revision_id        UUID NOT NULL REFERENCES doc_revisions(doc_revision_id) ON DELETE CASCADE,
    audience_type          TEXT NOT NULL CHECK (audience_type IN ('user', 'role', 'department', 'site', 'plant')),
    audience_ref           TEXT NOT NULL,
    distribution_state     TEXT NOT NULL DEFAULT 'pending'
        CHECK (distribution_state IN ('pending', 'distributed', 'ack_required', 'complete', 'superseded', 'withdrawn')),
    read_ack_required      BOOLEAN NOT NULL DEFAULT FALSE,
    distributed_at         TIMESTAMPTZ,
    idempotency_key        TEXT,
    org_company_code       VARCHAR(30),
    org_legal_entity_code  VARCHAR(30),
    org_plant_id           VARCHAR(30),
    org_site_id            VARCHAR(30),
    source_system          VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'doc_distribution.v1',
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1,
    UNIQUE (doc_revision_id, audience_type, audience_ref),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS doc_read_acknowledgements (
    doc_read_acknowledgement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_revision_id        UUID NOT NULL REFERENCES doc_revisions(doc_revision_id) ON DELETE CASCADE,
    audience_user_id       UUID REFERENCES users(user_id),
    actor_ref              TEXT,
    acknowledged_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature_event_id     UUID,
    acknowledgement_hash_sha256 CHAR(64) NOT NULL,
    idempotency_key        TEXT,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (audience_user_id IS NOT NULL OR NULLIF(trim(actor_ref), '') IS NOT NULL),
    UNIQUE (doc_revision_id, audience_user_id),
    UNIQUE (doc_revision_id, actor_ref),
    UNIQUE (idempotency_key)
);

-- --------------------------------------------------------------------------
-- Form and Template Control
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS frm_families (
    frm_family_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_code              TEXT NOT NULL UNIQUE,
    title                  TEXT NOT NULL,
    owner_area             TEXT,
    family_state           TEXT NOT NULL DEFAULT 'active'
        CHECK (family_state IN ('active', 'inactive', 'retired')),
    source_document_family_id UUID REFERENCES doc_families(doc_family_id),
    org_company_code       VARCHAR(30),
    org_legal_entity_code  VARCHAR(30),
    org_plant_id           VARCHAR(30),
    org_site_id            VARCHAR(30),
    source_system          VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id       VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'frm_family.v1',
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS frm_template_revisions (
    frm_template_revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frm_family_id          UUID NOT NULL REFERENCES frm_families(frm_family_id),
    template_revision      TEXT NOT NULL,
    revision_sequence      INT NOT NULL CHECK (revision_sequence > 0),
    lifecycle_state        TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete', 'withdrawn')),
    source_doc_revision_id UUID REFERENCES doc_revisions(doc_revision_id),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    template_storage_uri   TEXT,
    template_checksum_sha256 CHAR(64) NOT NULL,
    naming_policy          JSONB NOT NULL DEFAULT '{}'::jsonb,
    issuance_policy        JSONB NOT NULL DEFAULT '{}'::jsonb,
    released_at            TIMESTAMPTZ,
    manifest_hash_sha256   CHAR(64),
    idempotency_key        TEXT,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1,
    UNIQUE (frm_family_id, template_revision),
    UNIQUE (frm_family_id, revision_sequence),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS frm_schema_versions (
    frm_schema_version_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frm_template_revision_id UUID NOT NULL REFERENCES frm_template_revisions(frm_template_revision_id) ON DELETE CASCADE,
    schema_version         TEXT NOT NULL,
    schema_sequence        INT NOT NULL CHECK (schema_sequence > 0),
    lifecycle_state        TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'approved', 'released', 'superseded', 'withdrawn')),
    json_schema            JSONB NOT NULL,
    canonicalization_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_rules       JSONB NOT NULL DEFAULT '{}'::jsonb,
    render_profile         JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    idempotency_key        TEXT,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1,
    UNIQUE (frm_template_revision_id, schema_version),
    UNIQUE (frm_template_revision_id, schema_sequence),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS frm_issuances (
    frm_issuance_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id          TEXT NOT NULL UNIQUE,
    issued_record_id       TEXT NOT NULL,
    frm_template_revision_id UUID NOT NULL REFERENCES frm_template_revisions(frm_template_revision_id),
    frm_schema_version_id  UUID NOT NULL REFERENCES frm_schema_versions(frm_schema_version_id),
    issuance_no            INT NOT NULL DEFAULT 1 CHECK (issuance_no > 0),
    delivery_mode          TEXT NOT NULL CHECK (delivery_mode IN ('online', 'offline_excel')),
    issuance_state         TEXT NOT NULL DEFAULT 'issued'
        CHECK (issuance_state IN ('draft', 'issued', 'downloaded', 'in_progress', 'submitted', 'accepted', 'rejected', 'voided', 'expired', 'superseded')),
    issued_to_user_id      UUID REFERENCES users(user_id),
    issued_to_ref          TEXT,
    issued_for_context     JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_artifact_uri    TEXT,
    issuance_manifest_hash_sha256 CHAR(64),
    expires_at             TIMESTAMPTZ,
    idempotency_key        TEXT,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version            BIGINT NOT NULL DEFAULT 1,
    CHECK (issued_to_user_id IS NOT NULL OR NULLIF(trim(issued_to_ref), '') IS NOT NULL),
    UNIQUE (issued_record_id, issuance_no),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_frm_issuances_state
    ON frm_issuances (issuance_state, delivery_mode, updated_at DESC);

CREATE TABLE IF NOT EXISTS frm_submission_attempts (
    frm_submission_attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frm_issuance_id       UUID NOT NULL REFERENCES frm_issuances(frm_issuance_id),
    attempt_no            INT NOT NULL CHECK (attempt_no > 0),
    attempt_state         TEXT NOT NULL DEFAULT 'received'
        CHECK (attempt_state IN ('received', 'parsing', 'validating', 'valid', 'invalid', 'duplicate', 'quarantined', 'accepted', 'rejected')),
    submitted_by_user_id  UUID REFERENCES users(user_id),
    submitted_by_ref      TEXT,
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    original_artifact_uri TEXT,
    original_hash_sha256  CHAR(64),
    parsed_payload        JSONB,
    validation_errors     JSONB NOT NULL DEFAULT '[]'::jsonb,
    duplicate_of_attempt_id UUID REFERENCES frm_submission_attempts(frm_submission_attempt_id),
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (frm_issuance_id, attempt_no),
    UNIQUE (frm_issuance_id, original_hash_sha256),
    UNIQUE (idempotency_key)
);

-- --------------------------------------------------------------------------
-- Evidence Control
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evidence_records (
    evidence_record_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_key          TEXT NOT NULL UNIQUE,
    subject_type          TEXT NOT NULL,
    subject_id            TEXT NOT NULL,
    record_state          TEXT NOT NULL DEFAULT 'open'
        CHECK (record_state IN ('open', 'under_review', 'finalized', 'superseded', 'voided', 'retained', 'legal_hold')),
    current_version_id    UUID,
    retention_class       TEXT,
    source_issuance_id    UUID REFERENCES frm_issuances(frm_issuance_id),
    source_attempt_id     UUID REFERENCES frm_submission_attempts(frm_submission_attempt_id),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    CHECK (record_state IN ('open', 'under_review') OR current_version_id IS NOT NULL),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_evidence_records_subject
    ON evidence_records (subject_type, subject_id, record_state);

CREATE TABLE IF NOT EXISTS evidence_versions (
    evidence_version_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_record_id    UUID NOT NULL REFERENCES evidence_records(evidence_record_id),
    version_no            INT NOT NULL CHECK (version_no > 0),
    version_state         TEXT NOT NULL DEFAULT 'draft'
        CHECK (version_state IN ('draft', 'validating', 'ready_for_review', 'locked', 'superseded', 'voided')),
    amendment_no          INT NOT NULL DEFAULT 0 CHECK (amendment_no >= 0),
    source_version_id     UUID REFERENCES evidence_versions(evidence_version_id),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    canonical_payload     JSONB NOT NULL,
    package_hash_sha256   CHAR(64),
    manifest_hash_sha256  CHAR(64),
    canonical_payload_hash_sha256 CHAR(64),
    readable_snapshot_hash_sha256 CHAR(64),
    finalized_by_user_id  UUID REFERENCES users(user_id),
    finalized_at          TIMESTAMPTZ,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    CHECK (
        version_state IN ('draft', 'validating')
        OR (
            package_hash_sha256 IS NOT NULL
            AND manifest_hash_sha256 IS NOT NULL
            AND canonical_payload_hash_sha256 IS NOT NULL
            AND readable_snapshot_hash_sha256 IS NOT NULL
        )
    ),
    CHECK (version_state NOT IN ('locked', 'superseded', 'voided') OR finalized_at IS NOT NULL),
    UNIQUE (evidence_record_id, version_no),
    UNIQUE (package_hash_sha256),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
    evidence_artifact_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_version_id   UUID NOT NULL REFERENCES evidence_versions(evidence_version_id) ON DELETE CASCADE,
    artifact_role         TEXT NOT NULL
        CHECK (artifact_role IN ('original', 'canonical_payload', 'readable_snapshot', 'hash_signature_manifest', 'publication_receipt', 'supporting_attachment')),
    storage_adapter       TEXT NOT NULL,
    storage_uri           TEXT NOT NULL,
    mime_type             TEXT,
    size_bytes            BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
    sha256                CHAR(64) NOT NULL,
    is_required_for_final BOOLEAN NOT NULL DEFAULT TRUE,
    idempotency_key       TEXT,
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'evidence_artifact.v1',
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (evidence_version_id, artifact_role, sha256),
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_evidence_artifacts_single_package_role
    ON evidence_artifacts (evidence_version_id, artifact_role)
    WHERE artifact_role IN ('original', 'canonical_payload', 'readable_snapshot', 'hash_signature_manifest');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_evidence_records_current_version') THEN
        ALTER TABLE evidence_records
            ADD CONSTRAINT fk_evidence_records_current_version
            FOREIGN KEY (current_version_id)
            REFERENCES evidence_versions(evidence_version_id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS evidence_publications (
    evidence_publication_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_version_id   UUID NOT NULL REFERENCES evidence_versions(evidence_version_id),
    publication_target    TEXT NOT NULL DEFAULT 'sharepoint_graph',
    publication_state     TEXT NOT NULL DEFAULT 'pending'
        CHECK (publication_state IN ('pending', 'queued', 'publishing', 'published', 'failed', 'retry_scheduled', 'dead_letter', 'withdrawn', 'superseded')),
    authority_role        TEXT NOT NULL DEFAULT 'read_only_replica'
        CHECK (authority_role IN ('read_only_replica', 'external_index', 'cache')),
    target_uri            TEXT,
    target_item_id        TEXT,
    source_package_hash_sha256 CHAR(64) NOT NULL,
    source_manifest_hash_sha256 CHAR(64) NOT NULL,
    published_hash_sha256 CHAR(64),
    attempt_count         INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at       TIMESTAMPTZ,
    last_error_code       TEXT,
    last_error_message    TEXT,
    publication_receipt   JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key       TEXT,
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'evidence_publication.v1',
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    CHECK (
        publication_state <> 'published'
        OR (
            published_hash_sha256 IS NOT NULL
            AND publication_receipt <> '{}'::jsonb
            AND (target_uri IS NOT NULL OR target_item_id IS NOT NULL)
        )
    ),
    CHECK (publication_state NOT IN ('failed', 'retry_scheduled', 'dead_letter') OR last_error_code IS NOT NULL),
    UNIQUE (evidence_version_id, publication_target),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS signature_events (
    signature_event_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signed_object_type    TEXT NOT NULL,
    signed_object_id      TEXT NOT NULL,
    signed_object_version TEXT,
    signer_user_id        UUID REFERENCES users(user_id),
    signer_ref            TEXT,
    signer_role           TEXT,
    signature_meaning     TEXT NOT NULL,
    signature_state       TEXT NOT NULL DEFAULT 'applied'
        CHECK (signature_state IN ('applied', 'rejected', 'voided')),
    signed_payload_hash_sha256 CHAR(64) NOT NULL,
    signature_hash_sha256 CHAR(64) NOT NULL,
    signed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (signer_user_id IS NOT NULL OR NULLIF(trim(signer_ref), '') IS NOT NULL),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS e_signature_auth_challenges (
    auth_challenge_id TEXT PRIMARY KEY,
    signer_user_id UUID REFERENCES users(user_id),
    signer_ref TEXT,
    session_id TEXT,
    org_id TEXT,
    signature_action TEXT NOT NULL DEFAULT 'evidence_finalize',
    signed_payload_hash_sha256 CHAR(64) NOT NULL,
    displayed_record_hash_sha256 CHAR(64) NOT NULL,
    challenge_state TEXT NOT NULL DEFAULT 'issued'
        CHECK (challenge_state IN ('issued', 'consumed', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    consumed_by_user_id UUID REFERENCES users(user_id),
    consumed_by_ref TEXT,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version BIGINT NOT NULL DEFAULT 1,
    CHECK (signer_user_id IS NOT NULL OR NULLIF(trim(signer_ref), '') IS NOT NULL),
    CHECK (challenge_state <> 'consumed' OR consumed_at IS NOT NULL),
    UNIQUE (idempotency_key)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_doc_read_ack_signature_event') THEN
        ALTER TABLE doc_read_acknowledgements
            ADD CONSTRAINT fk_doc_read_ack_signature_event
            FOREIGN KEY (signature_event_id)
            REFERENCES signature_events(signature_event_id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- Change Authority
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plm_change_affected_objects (
    plm_change_affected_object_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_request_id UUID REFERENCES plm_change_requests(plm_change_request_id) ON DELETE CASCADE,
    plm_change_order_id   UUID REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    object_revision       TEXT,
    affected_fields       TEXT[] NOT NULL DEFAULT '{}',
    requested_effect      TEXT NOT NULL
        CHECK (requested_effect IN ('create', 'revise', 'release', 'supersede', 'withdraw', 'obsolete', 'replace', 'amend', 'deviation', 'metadata_update', 'training_update', 'publication_update', 'deploy_controlled_source', 'run_controlled_migration', 'reload_controlled_runtime')),
    disposition           TEXT NOT NULL DEFAULT 'pending'
        CHECK (disposition IN ('pending', 'accepted', 'rejected', 'deferred', 'cancelled')),
    effectivity_rule      JSONB NOT NULL DEFAULT '{}'::jsonb,
    wip_disposition       JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    CHECK (plm_change_request_id IS NOT NULL OR plm_change_order_id IS NOT NULL),
    UNIQUE (plm_change_order_id, object_type, object_id, object_revision, requested_effect),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_plm_change_affected_objects_lookup
    ON plm_change_affected_objects (object_type, object_id, plm_change_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_plm_change_affected_objects_order_scope
    ON plm_change_affected_objects (
        plm_change_order_id,
        object_type,
        object_id,
        COALESCE(object_revision, ''),
        requested_effect
    )
    WHERE plm_change_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS plm_change_resulting_objects (
    plm_change_resulting_object_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id   UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    affected_object_id    UUID REFERENCES plm_change_affected_objects(plm_change_affected_object_id),
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    resulting_revision    TEXT,
    result_role           TEXT NOT NULL
        CHECK (result_role IN ('new_revision', 'replacement', 'superseding_record', 'published_record', 'training_release', 'configuration_item')),
    release_state         TEXT NOT NULL DEFAULT 'planned'
        CHECK (release_state IN ('planned', 'ready', 'released', 'blocked', 'withdrawn', 'superseded')),
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (plm_change_order_id, object_type, object_id, result_role),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS plm_change_effectivities (
    plm_change_effectivity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id   UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    effectivity_type      TEXT NOT NULL CHECK (effectivity_type IN ('date', 'site', 'plant', 'product', 'lot', 'serial', 'order', 'role')),
    effectivity_scope     JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from        TIMESTAMPTZ NOT NULL,
    effective_to          TIMESTAMPTZ,
    release_impact        TEXT NOT NULL DEFAULT 'prospective'
        CHECK (release_impact IN ('prospective', 'retroactive', 'wip_hold', 'wip_rework', 'ship_hold', 'no_impact')),
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS plm_change_training_requirements (
    plm_change_training_requirement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id   UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    audience_type         TEXT NOT NULL CHECK (audience_type IN ('user', 'role', 'department', 'site', 'plant')),
    audience_ref          TEXT NOT NULL,
    training_requirement_type TEXT NOT NULL CHECK (training_requirement_type IN ('read_ack', 'qualification', 'training_course', 'practical_assessment')),
    due_before_effective  BOOLEAN NOT NULL DEFAULT TRUE,
    requirement_state     TEXT NOT NULL DEFAULT 'open'
        CHECK (requirement_state IN ('open', 'satisfied', 'waived', 'expired', 'superseded', 'cancelled')),
    due_at                TIMESTAMPTZ,
    satisfied_at          TIMESTAMPTZ,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (plm_change_order_id, object_type, object_id, audience_type, audience_ref, training_requirement_type),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS plm_change_verifications (
    plm_change_verification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id   UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    verification_type     TEXT NOT NULL CHECK (verification_type IN ('implementation', 'document_release', 'training_complete', 'publication_complete', 'process_validation', 'first_article', 'audit')),
    verification_state    TEXT NOT NULL DEFAULT 'planned'
        CHECK (verification_state IN ('planned', 'in_progress', 'passed', 'failed', 'waived', 'blocked', 'cancelled')),
    object_type           TEXT,
    object_id             TEXT,
    evidence_record_id    UUID REFERENCES evidence_records(evidence_record_id),
    verified_by_user_id   UUID REFERENCES users(user_id),
    verified_at           TIMESTAMPTZ,
    failure_reason        TEXT,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS plm_change_effectiveness_reviews (
    plm_change_effectiveness_review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id   UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id) ON DELETE CASCADE,
    review_state          TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (review_state IN ('scheduled', 'due', 'in_review', 'effective', 'ineffective', 'overdue', 'cancelled')),
    review_due_at         TIMESTAMPTZ NOT NULL,
    reviewed_by_user_id   UUID REFERENCES users(user_id),
    reviewed_at           TIMESTAMPTZ,
    effectiveness_result  JSONB NOT NULL DEFAULT '{}'::jsonb,
    followup_required     BOOLEAN NOT NULL DEFAULT FALSE,
    followup_object_type  TEXT,
    followup_object_id    TEXT,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (plm_change_order_id, review_due_at),
    UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS field_governance_rules (
    field_governance_rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type           TEXT NOT NULL,
    field_path            TEXT NOT NULL,
    lifecycle_state       TEXT NOT NULL,
    governance_class      TEXT NOT NULL
        CHECK (governance_class IN ('free_edit', 'controlled', 'post_release_locked', 'never_editable')),
    allowed_effects       TEXT[] NOT NULL DEFAULT '{}',
    change_required       BOOLEAN NOT NULL DEFAULT FALSE,
    signature_required    BOOLEAN NOT NULL DEFAULT FALSE,
    effectivity_required  BOOLEAN NOT NULL DEFAULT FALSE,
    policy_expression     JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to          TIMESTAMPTZ,
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'field_governance_rule.v1',
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (object_type, field_path, lifecycle_state, effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_field_governance_rules_active
    ON field_governance_rules (object_type, field_path, lifecycle_state)
    WHERE effective_to IS NULL;

-- --------------------------------------------------------------------------
-- Outbox, Background Jobs, Audit Integrity, Retention
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outbox_events (
    outbox_event_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type        TEXT NOT NULL,
    aggregate_id          TEXT NOT NULL,
    event_type            TEXT NOT NULL,
    event_version         INT NOT NULL DEFAULT 1 CHECK (event_version > 0),
    payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
    outbox_state          TEXT NOT NULL DEFAULT 'pending'
        CHECK (outbox_state IN ('pending', 'processing', 'done', 'failed', 'retry_scheduled', 'dead_letter', 'cancelled')),
    idempotency_key       TEXT,
    correlation_id        TEXT,
    causation_id          TEXT,
    attempt_count         INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at       TIMESTAMPTZ,
    last_error_code       TEXT,
    last_error_message    TEXT,
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'outbox_event.v1',
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_ready
    ON outbox_events (outbox_state, next_attempt_at, occurred_at);

CREATE TABLE IF NOT EXISTS background_jobs (
    background_job_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type              TEXT NOT NULL,
    job_state             TEXT NOT NULL DEFAULT 'queued'
        CHECK (job_state IN ('queued', 'running', 'succeeded', 'failed', 'retry_scheduled', 'dead_letter', 'cancelled')),
    priority              INT NOT NULL DEFAULT 100,
    payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key       TEXT,
    correlation_id        TEXT,
    attempt_count         INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts          INT NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    available_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_by             TEXT,
    locked_at             TIMESTAMPTZ,
    last_error_code       TEXT,
    last_error_message    TEXT,
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'background_job.v1',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_ready
    ON background_jobs (job_state, available_at, priority);

CREATE TABLE IF NOT EXISTS integrity_digests (
    integrity_digest_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digest_scope          TEXT NOT NULL CHECK (digest_scope IN ('daily', 'record', 'version', 'artifact', 'manifest', 'audit_chain', 'publication')),
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    digest_algorithm      TEXT NOT NULL DEFAULT 'sha256',
    digest_value          CHAR(64) NOT NULL,
    source_high_watermark TEXT,
    computed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at           TIMESTAMPTZ,
    digest_state          TEXT NOT NULL DEFAULT 'valid'
        CHECK (digest_state IN ('valid', 'invalid', 'missing', 'exception_open', 'superseded')),
    org_company_code      VARCHAR(30),
    org_legal_entity_code VARCHAR(30),
    org_plant_id          VARCHAR(30),
    org_site_id           VARCHAR(30),
    source_system         VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_record_id      VARCHAR(160),
    payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'integrity_digest.v1',
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (digest_scope, object_type, object_id, computed_at)
);

CREATE TABLE IF NOT EXISTS integrity_exceptions (
    integrity_exception_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrity_digest_id   UUID REFERENCES integrity_digests(integrity_digest_id),
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    severity              TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    exception_state       TEXT NOT NULL DEFAULT 'open'
        CHECK (exception_state IN ('open', 'investigating', 'accepted_risk', 'corrected', 'closed')),
    reason_code           TEXT NOT NULL,
    description           TEXT,
    opened_by_user_id     UUID REFERENCES users(user_id),
    opened_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_by_user_id     UUID REFERENCES users(user_id),
    closed_at             TIMESTAMPTZ,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS retention_locks (
    retention_lock_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type           TEXT NOT NULL,
    object_id             TEXT NOT NULL,
    lock_type             TEXT NOT NULL CHECK (lock_type IN ('regulatory', 'legal_hold', 'quality_event', 'retention_schedule', 'customer_contract')),
    lock_state            TEXT NOT NULL DEFAULT 'active'
        CHECK (lock_state IN ('active', 'released', 'superseded')),
    locked_until          TIMESTAMPTZ,
    disposition_after     TEXT NOT NULL DEFAULT 'review'
        CHECK (disposition_after IN ('review', 'archive', 'destroy_if_allowed')),
    reason                TEXT NOT NULL,
    created_by_user_id    UUID REFERENCES users(user_id),
    released_by_user_id   UUID REFERENCES users(user_id),
    released_at           TIMESTAMPTZ,
    idempotency_key       TEXT,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version           BIGINT NOT NULL DEFAULT 1,
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_retention_locks_active
    ON retention_locks (object_type, object_id, lock_type)
    WHERE lock_state = 'active';

-- Append-only protection for final record artifacts and integrity evidence.
CREATE OR REPLACE FUNCTION eqms_prevent_final_evidence_version_content_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.version_state IN ('locked', 'superseded', 'voided') THEN
            RAISE EXCEPTION 'Final evidence versions are immutable and cannot be deleted';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.version_state IN ('locked', 'superseded', 'voided') THEN
        IF OLD.version_state = 'locked' AND NEW.version_state NOT IN ('locked', 'superseded', 'voided') THEN
            RAISE EXCEPTION 'Locked evidence versions cannot return to editable states';
        END IF;

        IF OLD.version_state IN ('superseded', 'voided') AND NEW.version_state IS DISTINCT FROM OLD.version_state THEN
            RAISE EXCEPTION 'Terminal evidence version state cannot be changed';
        END IF;

        IF NEW.evidence_record_id IS DISTINCT FROM OLD.evidence_record_id
            OR NEW.version_no IS DISTINCT FROM OLD.version_no
            OR NEW.amendment_no IS DISTINCT FROM OLD.amendment_no
            OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
            OR NEW.source_change_order_id IS DISTINCT FROM OLD.source_change_order_id
            OR NEW.canonical_payload IS DISTINCT FROM OLD.canonical_payload
            OR NEW.package_hash_sha256 IS DISTINCT FROM OLD.package_hash_sha256
            OR NEW.manifest_hash_sha256 IS DISTINCT FROM OLD.manifest_hash_sha256
            OR NEW.canonical_payload_hash_sha256 IS DISTINCT FROM OLD.canonical_payload_hash_sha256
            OR NEW.readable_snapshot_hash_sha256 IS DISTINCT FROM OLD.readable_snapshot_hash_sha256
            OR NEW.finalized_by_user_id IS DISTINCT FROM OLD.finalized_by_user_id
            OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
            OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
            RAISE EXCEPTION 'Final evidence version content is immutable';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signature_events_immutable_update ON signature_events;
CREATE TRIGGER trg_signature_events_immutable_update
    BEFORE UPDATE ON signature_events
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_signature_events_immutable_delete ON signature_events;
CREATE TRIGGER trg_signature_events_immutable_delete
    BEFORE DELETE ON signature_events
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_evidence_versions_immutable_update ON evidence_versions;
CREATE TRIGGER trg_evidence_versions_immutable_update
    BEFORE UPDATE ON evidence_versions
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_final_evidence_version_content_change();

DROP TRIGGER IF EXISTS trg_evidence_versions_immutable_delete ON evidence_versions;
CREATE TRIGGER trg_evidence_versions_immutable_delete
    BEFORE DELETE ON evidence_versions
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_final_evidence_version_content_change();

DROP TRIGGER IF EXISTS trg_evidence_artifacts_immutable_update ON evidence_artifacts;
CREATE TRIGGER trg_evidence_artifacts_immutable_update
    BEFORE UPDATE ON evidence_artifacts
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_evidence_artifacts_immutable_delete ON evidence_artifacts;
CREATE TRIGGER trg_evidence_artifacts_immutable_delete
    BEFORE DELETE ON evidence_artifacts
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DO $$
DECLARE
    governed_table TEXT;
BEGIN
    FOREACH governed_table IN ARRAY ARRAY[
        'doc_families',
        'doc_revisions',
        'doc_effectivities',
        'doc_distributions',
        'frm_families',
        'frm_template_revisions',
        'frm_schema_versions',
        'frm_issuances',
        'frm_submission_attempts',
        'evidence_records',
        'evidence_versions',
        'evidence_artifacts',
        'evidence_publications',
        'plm_change_affected_objects',
        'plm_change_resulting_objects',
        'plm_change_effectivities',
        'plm_change_training_requirements',
        'plm_change_verifications',
        'plm_change_effectiveness_reviews',
        'field_governance_rules',
        'outbox_events',
        'background_jobs',
        'integrity_digests',
        'integrity_exceptions',
        'retention_locks'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_' || governed_table || '_row_version', governed_table);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_row_version()',
            'trg_' || governed_table || '_row_version',
            governed_table
        );
    END LOOP;
END $$;

COMMIT;
