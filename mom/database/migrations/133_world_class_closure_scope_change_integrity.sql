-- ============================================================================
-- Migration 133: World-class closure scope and change integrity hardening
-- ============================================================================
-- Purpose:
--   Close residual P1 audit gaps for scoped 5M obligations, released change-order
--   signature validation, released document/form immutability, and periodic
--   evaluation waiver signature proof.
-- ============================================================================

BEGIN;

-- 1) Validate released change orders cannot remain released without signature
--    proof and a release-package hash.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM plm_change_orders
        WHERE status = 'released'
          AND (release_signature_event_id IS NULL OR release_package_hash_sha256 IS NULL)
    ) THEN
        RAISE EXCEPTION 'plm_change_orders_release_signature_unvalidated_rows_block_constraint';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_plm_change_orders_release_signature'
    ) THEN
        ALTER TABLE plm_change_orders
            ADD CONSTRAINT chk_plm_change_orders_release_signature
            CHECK (
                status <> 'released'
                OR (
                    release_signature_event_id IS NOT NULL
                    AND release_package_hash_sha256 IS NOT NULL
                )
            );
    ELSE
        ALTER TABLE plm_change_orders
            VALIDATE CONSTRAINT chk_plm_change_orders_release_signature;
    END IF;
END $$;

-- 2) Scope 5M obligations by company/legal entity/plant/site so one plant cannot
--    satisfy or contaminate another plant's traceability gate.
ALTER TABLE traceability_5m_obligations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40);

ALTER TABLE traceability_5m_obligations
    DROP CONSTRAINT IF EXISTS traceability_5m_obligations_operation_class_object_type_object_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_traceability_5m_obligations_scoped
    ON traceability_5m_obligations (
        operation_class,
        object_type,
        object_id,
        (COALESCE(org_company_code::text, '')),
        (COALESCE(org_legal_entity_code::text, '')),
        (COALESCE(org_plant_id::text, '')),
        (COALESCE(org_site_id::text, ''))
    );

-- 3) Released/terminal document and form-control records are immutable at the DB
--    contract layer for content/hash/schema/render-policy fields.
CREATE OR REPLACE FUNCTION prevent_released_document_form_control_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'doc_revisions'
           AND OLD.lifecycle_state IN ('released', 'superseded', 'obsolete', 'withdrawn') THEN
            RAISE EXCEPTION 'released_doc_revision_delete_blocked';
        END IF;
        IF TG_TABLE_NAME = 'frm_template_revisions'
           AND OLD.lifecycle_state IN ('released', 'superseded', 'obsolete', 'withdrawn') THEN
            RAISE EXCEPTION 'released_form_template_revision_delete_blocked';
        END IF;
        IF TG_TABLE_NAME = 'frm_schema_versions'
           AND OLD.lifecycle_state IN ('released', 'superseded', 'withdrawn') THEN
            RAISE EXCEPTION 'released_form_schema_version_delete_blocked';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_TABLE_NAME = 'doc_revisions'
       AND OLD.lifecycle_state IN ('released', 'superseded', 'obsolete', 'withdrawn')
       AND (
           NEW.doc_family_id IS DISTINCT FROM OLD.doc_family_id
           OR NEW.revision_label IS DISTINCT FROM OLD.revision_label
           OR NEW.revision_sequence IS DISTINCT FROM OLD.revision_sequence
           OR NEW.source_change_order_id IS DISTINCT FROM OLD.source_change_order_id
           OR NEW.canonical_payload IS DISTINCT FROM OLD.canonical_payload
           OR NEW.readable_snapshot_uri IS DISTINCT FROM OLD.readable_snapshot_uri
           OR NEW.manifest_hash_sha256 IS DISTINCT FROM OLD.manifest_hash_sha256
           OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
           OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
           OR NEW.released_at IS DISTINCT FROM OLD.released_at
           OR NEW.superseded_by_revision_id IS DISTINCT FROM OLD.superseded_by_revision_id
           OR NEW.metadata IS DISTINCT FROM OLD.metadata
       ) THEN
        RAISE EXCEPTION 'released_doc_revision_immutable';
    END IF;

    IF TG_TABLE_NAME = 'frm_template_revisions'
       AND OLD.lifecycle_state IN ('released', 'superseded', 'obsolete', 'withdrawn')
       AND (
           NEW.frm_family_id IS DISTINCT FROM OLD.frm_family_id
           OR NEW.template_revision IS DISTINCT FROM OLD.template_revision
           OR NEW.revision_sequence IS DISTINCT FROM OLD.revision_sequence
           OR NEW.source_doc_revision_id IS DISTINCT FROM OLD.source_doc_revision_id
           OR NEW.source_change_order_id IS DISTINCT FROM OLD.source_change_order_id
           OR NEW.template_storage_uri IS DISTINCT FROM OLD.template_storage_uri
           OR NEW.template_checksum_sha256 IS DISTINCT FROM OLD.template_checksum_sha256
           OR NEW.naming_policy IS DISTINCT FROM OLD.naming_policy
           OR NEW.issuance_policy IS DISTINCT FROM OLD.issuance_policy
           OR NEW.manifest_hash_sha256 IS DISTINCT FROM OLD.manifest_hash_sha256
           OR NEW.released_at IS DISTINCT FROM OLD.released_at
           OR NEW.metadata IS DISTINCT FROM OLD.metadata
       ) THEN
        RAISE EXCEPTION 'released_form_template_revision_immutable';
    END IF;

    IF TG_TABLE_NAME = 'frm_schema_versions'
       AND OLD.lifecycle_state IN ('released', 'superseded', 'withdrawn')
       AND (
           NEW.frm_template_revision_id IS DISTINCT FROM OLD.frm_template_revision_id
           OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
           OR NEW.schema_sequence IS DISTINCT FROM OLD.schema_sequence
           OR NEW.json_schema IS DISTINCT FROM OLD.json_schema
           OR NEW.canonicalization_rules IS DISTINCT FROM OLD.canonicalization_rules
           OR NEW.validation_rules IS DISTINCT FROM OLD.validation_rules
           OR NEW.render_profile IS DISTINCT FROM OLD.render_profile
           OR NEW.source_change_order_id IS DISTINCT FROM OLD.source_change_order_id
           OR NEW.metadata IS DISTINCT FROM OLD.metadata
       ) THEN
        RAISE EXCEPTION 'released_form_schema_version_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doc_revisions_released_immutable ON doc_revisions;
CREATE TRIGGER trg_doc_revisions_released_immutable
    BEFORE UPDATE ON doc_revisions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

DROP TRIGGER IF EXISTS trg_doc_revisions_released_delete_immutable ON doc_revisions;
CREATE TRIGGER trg_doc_revisions_released_delete_immutable
    BEFORE DELETE ON doc_revisions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

DROP TRIGGER IF EXISTS trg_frm_template_revisions_released_immutable ON frm_template_revisions;
CREATE TRIGGER trg_frm_template_revisions_released_immutable
    BEFORE UPDATE ON frm_template_revisions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

DROP TRIGGER IF EXISTS trg_frm_template_revisions_released_delete_immutable ON frm_template_revisions;
CREATE TRIGGER trg_frm_template_revisions_released_delete_immutable
    BEFORE DELETE ON frm_template_revisions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

DROP TRIGGER IF EXISTS trg_frm_schema_versions_released_immutable ON frm_schema_versions;
CREATE TRIGGER trg_frm_schema_versions_released_immutable
    BEFORE UPDATE ON frm_schema_versions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

DROP TRIGGER IF EXISTS trg_frm_schema_versions_released_delete_immutable ON frm_schema_versions;
CREATE TRIGGER trg_frm_schema_versions_released_delete_immutable
    BEFORE DELETE ON frm_schema_versions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_released_document_form_control_mutation();

-- 4) Periodic evaluation waivers must reference a real e-signature event.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_periodic_evaluations_waiver_signature_event'
    ) THEN
        ALTER TABLE periodic_evaluations
            ADD CONSTRAINT fk_periodic_evaluations_waiver_signature_event
            FOREIGN KEY (waiver_signature_event_id)
            REFERENCES signature_events(signature_event_id);
    END IF;
END $$;

-- 5) Register the digest worker as a governed background job pattern. Runtime
--    scheduling still owns exact cadence, but the handler key is now controlled.
INSERT INTO background_jobs (job_type, job_state, priority, payload, idempotency_key)
VALUES (
    'audit.integrity_digest.daily',
    'queued',
    50,
    '{"handler_key":"audit.integrity_digest.daily","scopes":[{}],"authority":"migration_133_world_class_closure","worker":"IntegrityDigestWorker"}'::jsonb,
    'system|audit.integrity_digest.daily|registry'
)
ON CONFLICT (idempotency_key) DO UPDATE
SET payload = EXCLUDED.payload,
    updated_at = now();

COMMIT;
