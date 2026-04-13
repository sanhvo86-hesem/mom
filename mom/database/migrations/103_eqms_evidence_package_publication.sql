-- ============================================================================
-- Migration 103: eQMS Evidence Package, Publication, Retention, Integrity
-- ============================================================================
-- Purpose:
--   Promote evidence from single artifact uploads into immutable evidence
--   packages with original artifact, canonical payload, readable snapshot, and
--   hash/signature manifest. Publication is modeled as a replayable side effect.
--
-- Rollback:
--   DROP TABLE IF EXISTS eqms_integrity_exception, eqms_integrity_digest,
--   eqms_retention_lock, eqms_publication_event, eqms_publication_job,
--   eqms_publication_target, eqms_evidence_artifact, eqms_evidence_version,
--   eqms_evidence_manifest, eqms_evidence_record CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS eqms_evidence_record (
    evidence_record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_key       TEXT        NOT NULL UNIQUE,
    subject_type       TEXT        NOT NULL,
    subject_id         TEXT        NOT NULL,
    lifecycle_state    TEXT        NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'assembling', 'finalized', 'locked', 'superseded', 'voided')),
    current_version_id UUID,
    retention_class    TEXT,
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version        BIGINT      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_eqms_evidence_record_subject
    ON eqms_evidence_record (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS eqms_evidence_manifest (
    evidence_manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest_json        JSONB       NOT NULL,
    manifest_hash_sha256 CHAR(64)    NOT NULL UNIQUE,
    signed_by            UUID        REFERENCES users(user_id),
    signature_event_id   UUID        REFERENCES eqms_electronic_signature_event(signature_event_id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_eqms_evidence_manifest_immutable_update ON eqms_evidence_manifest;
CREATE TRIGGER trg_eqms_evidence_manifest_immutable_update
    BEFORE UPDATE ON eqms_evidence_manifest
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_eqms_evidence_manifest_immutable_delete ON eqms_evidence_manifest;
CREATE TRIGGER trg_eqms_evidence_manifest_immutable_delete
    BEFORE DELETE ON eqms_evidence_manifest
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

CREATE TABLE IF NOT EXISTS eqms_evidence_version (
    evidence_version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_record_id  UUID NOT NULL REFERENCES eqms_evidence_record(evidence_record_id),
    version_no          INT  NOT NULL CHECK (version_no > 0),
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    finalized_by        UUID REFERENCES users(user_id),
    finalized_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    evidence_manifest_id UUID NOT NULL REFERENCES eqms_evidence_manifest(evidence_manifest_id),
    package_hash_sha256 CHAR(64) NOT NULL,
    canonical_payload_hash_sha256 CHAR(64) NOT NULL,
    snapshot_hash_sha256 CHAR(64) NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (evidence_record_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_eqms_evidence_version_record
    ON eqms_evidence_version (evidence_record_id, version_no DESC);

DROP TRIGGER IF EXISTS trg_eqms_evidence_version_immutable_update ON eqms_evidence_version;
CREATE TRIGGER trg_eqms_evidence_version_immutable_update
    BEFORE UPDATE ON eqms_evidence_version
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_eqms_evidence_version_immutable_delete ON eqms_evidence_version;
CREATE TRIGGER trg_eqms_evidence_version_immutable_delete
    BEFORE DELETE ON eqms_evidence_version
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

CREATE TABLE IF NOT EXISTS eqms_evidence_artifact (
    evidence_artifact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_version_id  UUID NOT NULL REFERENCES eqms_evidence_version(evidence_version_id),
    artifact_role        TEXT NOT NULL
        CHECK (artifact_role IN ('original', 'canonical_payload', 'readable_snapshot', 'manifest', 'supporting_attachment')),
    storage_adapter      TEXT NOT NULL,
    storage_uri          TEXT NOT NULL,
    mime_type            TEXT,
    size_bytes           BIGINT,
    sha256               CHAR(64) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (evidence_version_id, artifact_role, sha256)
);

CREATE INDEX IF NOT EXISTS idx_eqms_evidence_artifact_version
    ON eqms_evidence_artifact (evidence_version_id, artifact_role);

DROP TRIGGER IF EXISTS trg_eqms_evidence_artifact_immutable_update ON eqms_evidence_artifact;
CREATE TRIGGER trg_eqms_evidence_artifact_immutable_update
    BEFORE UPDATE ON eqms_evidence_artifact
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_eqms_evidence_artifact_immutable_delete ON eqms_evidence_artifact;
CREATE TRIGGER trg_eqms_evidence_artifact_immutable_delete
    BEFORE DELETE ON eqms_evidence_artifact
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

ALTER TABLE eqms_evidence_record
    ADD CONSTRAINT fk_eqms_evidence_record_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES eqms_evidence_version(evidence_version_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS eqms_publication_target (
    publication_target_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_code           TEXT NOT NULL UNIQUE,
    target_type           TEXT NOT NULL CHECK (target_type IN ('sharepoint_graph', 'local_read_model', 'other')),
    authority_role        TEXT NOT NULL DEFAULT 'read_only_replica'
        CHECK (authority_role IN ('read_only_replica', 'cache', 'external_index')),
    config                JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eqms_publication_job (
    publication_job_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publication_target_id UUID NOT NULL REFERENCES eqms_publication_target(publication_target_id),
    source_object_type    TEXT NOT NULL,
    source_object_id      TEXT NOT NULL,
    evidence_version_id   UUID REFERENCES eqms_evidence_version(evidence_version_id),
    requested_by          UUID REFERENCES users(user_id),
    requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'published', 'failed', 'revoked', 'dead_letter')),
    attempts              INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at       TIMESTAMPTZ,
    published_uri         TEXT,
    published_hash_sha256 CHAR(64),
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_publication_job_status
    ON eqms_publication_job (status, next_attempt_at, requested_at);

CREATE TABLE IF NOT EXISTS eqms_publication_event (
    publication_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publication_job_id   UUID NOT NULL REFERENCES eqms_publication_job(publication_job_id) ON DELETE CASCADE,
    event_type           TEXT NOT NULL,
    event_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eqms_retention_lock (
    retention_lock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type       TEXT NOT NULL,
    object_id         TEXT NOT NULL,
    lock_type         TEXT NOT NULL CHECK (lock_type IN ('regulatory', 'litigation', 'quality_event', 'retention_schedule')),
    locked_until      TIMESTAMPTZ,
    reason            TEXT NOT NULL,
    created_by        UUID REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata          JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_retention_lock_object
    ON eqms_retention_lock (object_type, object_id);

CREATE TABLE IF NOT EXISTS eqms_integrity_digest (
    integrity_digest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type         TEXT NOT NULL,
    object_id           TEXT NOT NULL,
    digest_scope        TEXT NOT NULL CHECK (digest_scope IN ('record', 'version', 'artifact', 'manifest', 'audit_chain')),
    sha256              CHAR(64) NOT NULL,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at         TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'valid'
        CHECK (status IN ('valid', 'invalid', 'missing', 'exception_open')),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eqms_integrity_digest_object
    ON eqms_integrity_digest (object_type, object_id, digest_scope);

CREATE TABLE IF NOT EXISTS eqms_integrity_exception (
    integrity_exception_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrity_digest_id    UUID REFERENCES eqms_integrity_digest(integrity_digest_id),
    severity               TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    status                 TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'investigating', 'accepted_risk', 'corrected', 'closed')),
    reason                 TEXT,
    opened_by              UUID REFERENCES users(user_id),
    opened_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_by              UUID REFERENCES users(user_id),
    closed_at              TIMESTAMPTZ,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO eqms_publication_target (target_code, target_type, authority_role, config)
VALUES ('sharepoint-readonly', 'sharepoint_graph', 'read_only_replica', '{"direct_user_upload_allowed": false}'::jsonb)
ON CONFLICT (target_code) DO NOTHING;

COMMIT;
