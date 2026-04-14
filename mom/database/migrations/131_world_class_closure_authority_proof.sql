-- World-class closure: authoritative release ceremonies and gate proof.
--
-- Adds narrowly scoped proof columns/tables required by the closure audit:
-- document controlled-import receipts, training gate signature/evidence proof,
-- and indexes used by audit-pack export retrieval.

BEGIN;

CREATE TABLE IF NOT EXISTS controlled_import_receipts (
    controlled_import_receipt_id TEXT PRIMARY KEY,
    imported_object_type TEXT NOT NULL,
    imported_object_id TEXT,
    receipt_state TEXT NOT NULL DEFAULT 'accepted'
        CHECK (receipt_state IN ('draft', 'accepted', 'rejected', 'voided')),
    source_system TEXT NOT NULL DEFAULT 'controlled_import',
    manifest_hash_sha256 CHAR(64) NOT NULL,
    imported_by_ref TEXT NOT NULL,
    accepted_at TIMESTAMPTZ,
    source_change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version BIGINT NOT NULL DEFAULT 1,
    CHECK (receipt_state <> 'accepted' OR accepted_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_controlled_import_receipts_object
    ON controlled_import_receipts (imported_object_type, imported_object_id, receipt_state);

ALTER TABLE plm_change_training_requirements
    ADD COLUMN IF NOT EXISTS satisfaction_signature_event_id UUID REFERENCES signature_events(signature_event_id),
    ADD COLUMN IF NOT EXISTS waiver_signature_event_id UUID REFERENCES signature_events(signature_event_id),
    ADD COLUMN IF NOT EXISTS training_evidence_record_id UUID REFERENCES evidence_records(evidence_record_id),
    ADD COLUMN IF NOT EXISTS source_training_record_id TEXT;

ALTER TABLE plm_change_training_requirements
    DROP CONSTRAINT IF EXISTS ck_plm_change_training_authoritative_completion;

ALTER TABLE plm_change_training_requirements
    ADD CONSTRAINT ck_plm_change_training_authoritative_completion
    CHECK (
        requirement_state NOT IN ('satisfied', 'waived')
        OR satisfaction_signature_event_id IS NOT NULL
        OR waiver_signature_event_id IS NOT NULL
        OR training_evidence_record_id IS NOT NULL
        OR NULLIF(trim(source_training_record_id), '') IS NOT NULL
        OR NULLIF(trim(COALESCE(metadata ->> 'authoritative_training_decision_id', '')), '') IS NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_audit_pack_exports_scope_lookup
    ON audit_pack_exports (export_scope, scope_ref, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_pack_exports_package_hash
    ON audit_pack_exports (package_hash_sha256)
    WHERE package_hash_sha256 IS NOT NULL;

COMMIT;
