-- ============================================================================
-- Migration 129: Change release authorization integrity
-- ============================================================================
-- Purpose:
--   Make released change orders and resulting-object links fail closed at the
--   database contract layer, not only in service code.
-- ============================================================================

BEGIN;

ALTER TABLE plm_change_orders
    ADD COLUMN IF NOT EXISTS release_signature_event_id UUID REFERENCES signature_events(signature_event_id),
    ADD COLUMN IF NOT EXISTS release_package_hash_sha256 CHAR(64);

ALTER TABLE genealogy_edge_facts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40);

ALTER TABLE frm_submission_attempts
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_by_ref TEXT,
    ADD COLUMN IF NOT EXISTS acceptance_signature_event_id UUID REFERENCES signature_events(signature_event_id);

DO $$
BEGIN
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
            ) NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_plm_change_affected_objects_order_id_pair'
    ) THEN
        ALTER TABLE plm_change_affected_objects
            ADD CONSTRAINT uq_plm_change_affected_objects_order_id_pair
            UNIQUE (plm_change_order_id, plm_change_affected_object_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_plm_change_resulting_objects_same_order_affected'
    ) THEN
        ALTER TABLE plm_change_resulting_objects
            ADD CONSTRAINT fk_plm_change_resulting_objects_same_order_affected
            FOREIGN KEY (plm_change_order_id, affected_object_id)
            REFERENCES plm_change_affected_objects (plm_change_order_id, plm_change_affected_object_id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

DROP INDEX IF EXISTS ux_as_manufactured_snapshots_one_current;

CREATE UNIQUE INDEX IF NOT EXISTS ux_as_manufactured_snapshots_one_current_scoped
    ON as_manufactured_snapshots (
        subject_type,
        subject_ref,
        COALESCE(org_company_code, ''),
        COALESCE(org_legal_entity_code, ''),
        COALESCE(org_plant_id, ''),
        COALESCE(org_site_id, '')
    )
    WHERE snapshot_state = 'current';

COMMIT;
