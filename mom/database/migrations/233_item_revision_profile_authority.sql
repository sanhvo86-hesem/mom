-- ============================================================================
-- Migration 233: Item Revision Profile Authority
-- Description: Deterministic item key bridge, site profile authority,
--              customer/supplier crossrefs, CTQ/CQA spec columns, and released
--              revision immutability guards for MDA V3 P29.
-- Dependencies: 072_canonical_foundation_governance.sql,
--               073_canonical_master_data_core.sql,
--               213_uom_measurement_authority.sql,
--               232_party_identity_link_authority.sql
-- Rollback: DROP TABLE item_supplier_crossref_authority,
--           item_customer_crossref_authority, item_site_profile_authority,
--           item_legacy_key_bridge CASCADE; DROP FUNCTION
--           fn_item_revision_block_released_direct_edit(),
--           fn_item_spec_block_released_revision_direct_edit() CASCADE;
-- Standards: ISA-95 material definition separation; released technical
--            revision immutability; UOM-backed release gates.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE item_revision
    ADD COLUMN IF NOT EXISTS supersedes_item_revision_id UUID REFERENCES item_revision(item_revision_id),
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_by_party_id UUID REFERENCES party(party_id),
    ADD COLUMN IF NOT EXISTS release_command_id UUID,
    ADD COLUMN IF NOT EXISTS release_hash TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE item_spec
    ADD COLUMN IF NOT EXISTS spec_revision VARCHAR(40) NOT NULL DEFAULT '1',
    ADD COLUMN IF NOT EXISTS criticality_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS is_ctq BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_cqa BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS uom_code VARCHAR(20) REFERENCES uom(uom_code),
    ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(160),
    ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS released_snapshot_hash TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS item_legacy_key_bridge (
    item_legacy_key_bridge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_item_id         UUID NOT NULL REFERENCES item(item_id),
    canonical_item_revision_id UUID REFERENCES item_revision(item_revision_id),
    legacy_system             VARCHAR(60) NOT NULL,
    legacy_table_name         VARCHAR(80) NOT NULL,
    legacy_item_key           VARCHAR(160) NOT NULL,
    legacy_revision_key       VARCHAR(160),
    bridge_status             VARCHAR(30) NOT NULL DEFAULT 'active'
                              CHECK (bridge_status IN ('active', 'superseded', 'blocked', 'archived')),
    effective_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to              TIMESTAMPTZ,
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from),
    UNIQUE (legacy_system, legacy_table_name, legacy_item_key, legacy_revision_key)
);

COMMENT ON TABLE item_legacy_key_bridge IS
'Deterministic bridge from legacy JSON/ERP item and revision keys to canonical item/item_revision UUIDs. Prevents runtime guessing between item/items and revision/item_revisions lanes.';

CREATE INDEX IF NOT EXISTS idx_item_legacy_bridge_canonical
    ON item_legacy_key_bridge (canonical_item_id, canonical_item_revision_id, bridge_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_legacy_bridge_unique_key
    ON item_legacy_key_bridge (legacy_system, legacy_table_name, legacy_item_key, (COALESCE(legacy_revision_key, '')));

CREATE TABLE IF NOT EXISTS item_site_profile_authority (
    item_site_profile_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID REFERENCES item_site(item_site_id),
    item_id                  UUID NOT NULL REFERENCES item(item_id),
    item_revision_id         UUID REFERENCES item_revision(item_revision_id),
    site_id                  UUID NOT NULL REFERENCES org_site(site_id),
    profile_type             VARCHAR(40) NOT NULL
                              CHECK (profile_type IN ('planning', 'procurement', 'storage', 'quality', 'cost')),
    profile_status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                              CHECK (profile_status IN ('draft', 'active', 'approved', 'blocked', 'inactive', 'obsolete')),
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    planner_code             VARCHAR(60),
    buyer_code               VARCHAR(60),
    default_warehouse_id     UUID REFERENCES org_warehouse(warehouse_id),
    quality_profile_code     VARCHAR(80),
    cost_profile_code        VARCHAR(80),
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id      UUID REFERENCES party(party_id),
    approved_by_party_id     UUID REFERENCES party(party_id),
    approved_at              TIMESTAMPTZ,
    row_version              INTEGER NOT NULL DEFAULT 1,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE item_site_profile_authority IS
'Site-scoped planning, procurement, storage, quality, and cost profiles. Enterprise item header must not own local operational settings.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_site_profile_one_active
    ON item_site_profile_authority (item_id, site_id, profile_type, (COALESCE(item_revision_id::text, '')))
    WHERE profile_status IN ('active', 'approved') AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS item_customer_crossref_authority (
    item_customer_crossref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_revision_id          UUID NOT NULL REFERENCES item_revision(item_revision_id),
    customer_party_id         UUID NOT NULL REFERENCES party(party_id),
    customer_part_number      VARCHAR(160) NOT NULL,
    customer_revision_code    VARCHAR(80),
    crossref_status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                               CHECK (crossref_status IN ('draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete')),
    effective_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to              TIMESTAMPTZ,
    customer_item_approval_id UUID REFERENCES customer_item_approval_authority(customer_item_approval_id),
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id       UUID REFERENCES party(party_id),
    approved_by_party_id      UUID REFERENCES party(party_id),
    approved_at               TIMESTAMPTZ,
    row_version               INTEGER NOT NULL DEFAULT 1,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE item_customer_crossref_authority IS
'Versioned/effective customer part and customer revision cross-reference tied to a canonical item revision.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_customer_crossref_active
    ON item_customer_crossref_authority (customer_party_id, customer_part_number, COALESCE(customer_revision_code, ''))
    WHERE crossref_status IN ('approved', 'conditional') AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS item_supplier_crossref_authority (
    item_supplier_crossref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                   UUID NOT NULL REFERENCES item(item_id),
    item_revision_id          UUID REFERENCES item_revision(item_revision_id),
    supplier_party_id         UUID NOT NULL REFERENCES party(party_id),
    supplier_part_number      VARCHAR(160) NOT NULL,
    supplier_revision_code    VARCHAR(80),
    manufacturer_part_number  VARCHAR(160),
    crossref_status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                               CHECK (crossref_status IN ('draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete')),
    effective_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to              TIMESTAMPTZ,
    supplier_process_approval_id UUID REFERENCES supplier_process_approval_authority(supplier_process_approval_id),
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id       UUID REFERENCES party(party_id),
    approved_by_party_id      UUID REFERENCES party(party_id),
    approved_at               TIMESTAMPTZ,
    row_version               INTEGER NOT NULL DEFAULT 1,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE item_supplier_crossref_authority IS
'Versioned/effective supplier item cross-reference tied to canonical item/revision and supplier-process approval evidence.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_supplier_crossref_active
    ON item_supplier_crossref_authority (supplier_party_id, supplier_part_number, COALESCE(supplier_revision_code, ''), item_id)
    WHERE crossref_status IN ('approved', 'conditional') AND effective_to IS NULL;

CREATE OR REPLACE FUNCTION fn_item_revision_block_released_direct_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.lifecycle_state IN ('released', 'active', 'production')
       AND (
            NEW.item_id IS DISTINCT FROM OLD.item_id
         OR NEW.revision_code IS DISTINCT FROM OLD.revision_code
         OR NEW.drawing_reference IS DISTINCT FROM OLD.drawing_reference
         OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
         OR NEW.release_hash IS DISTINCT FROM OLD.release_hash
       ) THEN
        RAISE EXCEPTION 'released_item_revision_immutable'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_item_revision_block_released_direct_edit ON item_revision;
CREATE TRIGGER trg_item_revision_block_released_direct_edit
BEFORE UPDATE ON item_revision
FOR EACH ROW
EXECUTE FUNCTION fn_item_revision_block_released_direct_edit();

CREATE OR REPLACE FUNCTION fn_item_spec_block_released_revision_direct_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_revision_state text;
    v_revision_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_revision_id := OLD.item_revision_id;
    ELSE
        v_revision_id := NEW.item_revision_id;
    END IF;
    SELECT lifecycle_state
      INTO v_revision_state
      FROM item_revision
     WHERE item_revision_id = v_revision_id;

    IF v_revision_state IN ('released', 'active', 'production') THEN
        RAISE EXCEPTION 'released_item_revision_spec_immutable'
            USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_item_spec_block_released_revision_direct_edit ON item_spec;
CREATE TRIGGER trg_item_spec_block_released_revision_direct_edit
BEFORE INSERT OR UPDATE OR DELETE ON item_spec
FOR EACH ROW
EXECUTE FUNCTION fn_item_spec_block_released_revision_direct_edit();

COMMIT;
