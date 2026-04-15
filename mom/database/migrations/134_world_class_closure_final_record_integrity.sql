-- ============================================================================
-- Migration 134: World-class closure final record integrity hardening
-- ============================================================================
-- Purpose:
--   Close the remaining P1 control gaps from the 2026-04-15 re-audit:
--   1) regulated applied signatures must be backed by a full e-sign ceremony;
--   2) finalized evidence record headers must be immutable;
--   3) integrity digest evidence must be append-only;
--   4) active retention locks must not be mutated or deleted outside a future
--      governed disposition service.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM signature_events
        WHERE signature_state = 'applied'
          AND lower(replace(signature_meaning, ' ', '_')) IN (
              'evidence_finalize',
              'document_release',
              'document_read_acknowledgement',
              'form_submission_acceptance',
              'periodic_evaluation_waiver',
              'change_order_release',
              'verification_waiver'
          )
          AND (
              NULLIF(trim(COALESCE(auth_challenge_id, '')), '') IS NULL
              OR NULLIF(trim(COALESCE(auth_method, '')), '') IS NULL
              OR auth_result_hash_sha256 IS NULL
              OR signer_identity_snapshot = '{}'::jsonb
              OR displayed_record_hash_sha256 IS NULL
              OR NULLIF(trim(COALESCE(signature_manifestation, '')), '') IS NULL
          )
    ) THEN
        RAISE EXCEPTION 'signature_events_applied_regulated_ceremony_unvalidated_rows';
    END IF;
END $$;

ALTER TABLE signature_events
    DROP CONSTRAINT IF EXISTS chk_signature_events_applied_regulated_ceremony;

ALTER TABLE signature_events
    ADD CONSTRAINT chk_signature_events_applied_regulated_ceremony
    CHECK (
        signature_state <> 'applied'
        OR lower(replace(signature_meaning, ' ', '_')) NOT IN (
            'evidence_finalize',
            'document_release',
            'document_read_acknowledgement',
            'form_submission_acceptance',
            'periodic_evaluation_waiver',
            'change_order_release',
            'verification_waiver'
        )
        OR (
            NULLIF(trim(COALESCE(auth_challenge_id, '')), '') IS NOT NULL
            AND NULLIF(trim(COALESCE(auth_method, '')), '') IS NOT NULL
            AND auth_result_hash_sha256 IS NOT NULL
            AND signer_identity_snapshot <> '{}'::jsonb
            AND displayed_record_hash_sha256 IS NOT NULL
            AND NULLIF(trim(COALESCE(signature_manifestation, '')), '') IS NOT NULL
        )
    );

CREATE OR REPLACE FUNCTION prevent_final_evidence_record_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.record_state IN ('finalized', 'superseded', 'voided', 'retained', 'legal_hold') THEN
            RAISE EXCEPTION 'final_evidence_record_delete_blocked';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.record_state IN ('finalized', 'superseded', 'voided', 'retained', 'legal_hold')
       AND (
           NEW.evidence_key IS DISTINCT FROM OLD.evidence_key
           OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
           OR NEW.subject_id IS DISTINCT FROM OLD.subject_id
           OR NEW.source_issuance_id IS DISTINCT FROM OLD.source_issuance_id
           OR NEW.source_attempt_id IS DISTINCT FROM OLD.source_attempt_id
           OR NEW.current_version_id IS DISTINCT FROM OLD.current_version_id
           OR NEW.retention_class IS DISTINCT FROM OLD.retention_class
           OR NEW.metadata IS DISTINCT FROM OLD.metadata
       ) THEN
        RAISE EXCEPTION 'final_evidence_record_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evidence_records_final_immutable ON evidence_records;
CREATE TRIGGER trg_evidence_records_final_immutable
    BEFORE UPDATE ON evidence_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_final_evidence_record_mutation();

DROP TRIGGER IF EXISTS trg_evidence_records_final_delete_immutable ON evidence_records;
CREATE TRIGGER trg_evidence_records_final_delete_immutable
    BEFORE DELETE ON evidence_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_final_evidence_record_mutation();

CREATE OR REPLACE FUNCTION prevent_integrity_digest_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'integrity_digest_delete_blocked';
    END IF;
    RAISE EXCEPTION 'integrity_digest_immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integrity_digests_immutable ON integrity_digests;
CREATE TRIGGER trg_integrity_digests_immutable
    BEFORE UPDATE ON integrity_digests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_integrity_digest_mutation();

DROP TRIGGER IF EXISTS trg_integrity_digests_delete_immutable ON integrity_digests;
CREATE TRIGGER trg_integrity_digests_delete_immutable
    BEFORE DELETE ON integrity_digests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_integrity_digest_mutation();

CREATE OR REPLACE FUNCTION prevent_integrity_exception_identity_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'integrity_exception_delete_blocked';
    END IF;

    IF NEW.integrity_digest_id IS DISTINCT FROM OLD.integrity_digest_id
       OR NEW.object_type IS DISTINCT FROM OLD.object_type
       OR NEW.object_id IS DISTINCT FROM OLD.object_id
       OR NEW.severity IS DISTINCT FROM OLD.severity
       OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.opened_by_user_id IS DISTINCT FROM OLD.opened_by_user_id
       OR NEW.opened_at IS DISTINCT FROM OLD.opened_at THEN
        RAISE EXCEPTION 'integrity_exception_identity_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integrity_exceptions_identity_immutable ON integrity_exceptions;
CREATE TRIGGER trg_integrity_exceptions_identity_immutable
    BEFORE UPDATE ON integrity_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_integrity_exception_identity_mutation();

DROP TRIGGER IF EXISTS trg_integrity_exceptions_delete_immutable ON integrity_exceptions;
CREATE TRIGGER trg_integrity_exceptions_delete_immutable
    BEFORE DELETE ON integrity_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_integrity_exception_identity_mutation();

CREATE OR REPLACE FUNCTION prevent_active_retention_lock_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.lock_state = 'active' THEN
            RAISE EXCEPTION 'active_retention_lock_delete_blocked';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.lock_state = 'active' THEN
        RAISE EXCEPTION 'active_retention_lock_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_retention_locks_active_immutable ON retention_locks;
CREATE TRIGGER trg_retention_locks_active_immutable
    BEFORE UPDATE ON retention_locks
    FOR EACH ROW
    EXECUTE FUNCTION prevent_active_retention_lock_mutation();

DROP TRIGGER IF EXISTS trg_retention_locks_active_delete_immutable ON retention_locks;
CREATE TRIGGER trg_retention_locks_active_delete_immutable
    BEFORE DELETE ON retention_locks
    FOR EACH ROW
    EXECUTE FUNCTION prevent_active_retention_lock_mutation();

COMMENT ON CONSTRAINT chk_signature_events_applied_regulated_ceremony ON signature_events IS
    'Regulated applied signatures must include challenge, auth method, result hash, signer identity, displayed hash, and manifestation proof.';

COMMIT;
