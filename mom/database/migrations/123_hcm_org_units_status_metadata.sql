-- ============================================================================
-- Migration 123: HCM org-units status and metadata alignment
-- ============================================================================
-- Purpose:
--   Add `status` and `metadata` columns to hcm_org_units so the table matches
--   the contracts/table-registry.json definition.  Without these columns the
--   GenericCrudService builds a SELECT that references them and the query fails,
--   causing the HCM org catalog to report generic_list_failed in the admin panel.
--
-- Data safety:
--   Additive migration only.  IF NOT EXISTS / DEFAULT guards ensure this is
--   safe to re-run against a schema that already has the columns.
--
-- Rollback:
--   ALTER TABLE hcm_org_units DROP COLUMN IF EXISTS status;
--   ALTER TABLE hcm_org_units DROP COLUMN IF EXISTS metadata;
-- ============================================================================

BEGIN;

ALTER TABLE hcm_org_units
    ADD COLUMN IF NOT EXISTS status   VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    ADD COLUMN IF NOT EXISTS metadata JSONB       NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_hcm_org_units_status ON hcm_org_units (status);

COMMIT;
