-- ============================================================================
-- Migration 234: Engineering Release Package Authority
-- Description: Physical EngineeringReleasePackage root, member hash/effectivity,
--              approval hooks, SO/JO/WO binding, and WO frozen package snapshot
--              for MDA V3 P30.
-- Dependencies: 048_plm_change_control.sql,
--               072_canonical_foundation_governance.sql,
--               073_canonical_master_data_core.sql,
--               074_canonical_engineering_definition.sql,
--               076_canonical_mes_execution_spine.sql,
--               078_canonical_eqms_compliance_backbone.sql,
--               084_execution_quality_projection.sql,
--               232_party_identity_link_authority.sql,
--               233_item_revision_profile_authority.sql
-- Rollback: DROP TABLE work_order_engineering_package_snapshot,
--           engineering_release_package_binding,
--           engineering_release_package_approval,
--           engineering_release_package_member,
--           engineering_release_package CASCADE;
-- Standards: ISA-95/IEC 62264 manufacturing definition package, immutable
--            released engineering baseline, 21 CFR Part 11 signature hooks.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS engineering_release_package (
    engineering_release_package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_number                 VARCHAR(100) NOT NULL UNIQUE,
    package_revision               VARCHAR(40) NOT NULL DEFAULT '1',
    package_type                   VARCHAR(40) NOT NULL DEFAULT 'manufacturing_release'
                                   CHECK (package_type IN ('manufacturing_release', 'prototype_release', 'deviation_release', 'customer_specific_release')),
    item_revision_id               UUID NOT NULL REFERENCES item_revision(item_revision_id),
    site_id                        UUID REFERENCES org_site(site_id),
    plm_change_order_id            UUID REFERENCES plm_change_orders(plm_change_order_id),
    package_status                 VARCHAR(30) NOT NULL DEFAULT 'draft'
                                   CHECK (package_status IN ('draft', 'validated', 'approved', 'released', 'superseded', 'withdrawn', 'blocked')),
    effective_from                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                   TIMESTAMPTZ,
    package_hash_sha256            CHAR(64),
    member_manifest_hash_sha256    CHAR(64),
    released_by_party_id           UUID REFERENCES party(party_id),
    released_at                    TIMESTAMPTZ,
    superseded_by_package_id       UUID REFERENCES engineering_release_package(engineering_release_package_id),
    withdrawn_reason               TEXT,
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id            UUID REFERENCES party(party_id),
    approved_by_party_id           UUID REFERENCES party(party_id),
    approved_at                    TIMESTAMPTZ,
    row_version                    INTEGER NOT NULL DEFAULT 1,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE engineering_release_package IS
'Physical authority root for the released engineering baseline consumed by SO/JO/WO release and MES readiness. Members carry hashes and effectivity; released members are immutable.';

CREATE INDEX IF NOT EXISTS idx_erpkg_item_status
    ON engineering_release_package (item_revision_id, package_status, effective_from DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_erpkg_one_current_released
    ON engineering_release_package (item_revision_id, (COALESCE(site_id::text, '')))
    WHERE package_status = 'released' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS engineering_release_package_member (
    engineering_release_package_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineering_release_package_id        UUID NOT NULL REFERENCES engineering_release_package(engineering_release_package_id) ON DELETE CASCADE,
    member_type                           VARCHAR(50) NOT NULL
                                          CHECK (member_type IN ('item_revision', 'bom_version', 'work_definition_version', 'control_plan', 'inspection_plan', 'nc_program', 'work_instruction', 'tooling_requirement', 'customer_approval', 'supplier_approval', 'other')),
    member_record_table                   VARCHAR(100) NOT NULL,
    member_record_id                      TEXT NOT NULL,
    member_version_code                   VARCHAR(80),
    member_hash_sha256                    CHAR(64) NOT NULL,
    member_status                         VARCHAR(30) NOT NULL DEFAULT 'active'
                                          CHECK (member_status IN ('draft', 'active', 'approved', 'released', 'superseded', 'withdrawn', 'blocked')),
    required_for_release                  BOOLEAN NOT NULL DEFAULT true,
    effective_from                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                          TIMESTAMPTZ,
    dependency_role                       VARCHAR(60),
    metadata                              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id                   UUID REFERENCES party(party_id),
    row_version                           INTEGER NOT NULL DEFAULT 1,
    created_at                            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from),
    UNIQUE (engineering_release_package_id, member_type, member_record_table, member_record_id)
);

COMMENT ON TABLE engineering_release_package_member IS
'Immutable member list for BOM, routing/work definition, control plan, inspection plan, NC program, work instruction, tooling, customer approval, and supplier approval evidence.';

CREATE INDEX IF NOT EXISTS idx_erpkg_member_type_status
    ON engineering_release_package_member (engineering_release_package_id, member_type, member_status);

CREATE TABLE IF NOT EXISTS engineering_release_package_approval (
    engineering_release_package_approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineering_release_package_id          UUID NOT NULL REFERENCES engineering_release_package(engineering_release_package_id) ON DELETE CASCADE,
    approval_type                           VARCHAR(40) NOT NULL
                                            CHECK (approval_type IN ('engineering', 'quality', 'customer', 'supplier', 'tooling', 'regulatory', 'waiver')),
    approval_status                         VARCHAR(30) NOT NULL DEFAULT 'pending'
                                            CHECK (approval_status IN ('pending', 'approved', 'conditional', 'rejected', 'withdrawn', 'expired')),
    approval_source_table                   VARCHAR(100),
    approval_source_id                      TEXT,
    approved_by_party_id                    UUID REFERENCES party(party_id),
    approved_at                             TIMESTAMPTZ,
    expires_at                              TIMESTAMPTZ,
    signature_record_id                     UUID,
    signature_meaning                       VARCHAR(120),
    record_hash_sha256                      CHAR(64),
    metadata                                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE engineering_release_package_approval IS
'Approval and e-sign hook table. P32 owns final e-sign validation, re-auth, SoD, and signature-record linkage.';

CREATE INDEX IF NOT EXISTS idx_erpkg_approval_status
    ON engineering_release_package_approval (engineering_release_package_id, approval_type, approval_status);

CREATE TABLE IF NOT EXISTS engineering_release_package_binding (
    engineering_release_package_binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineering_release_package_id         UUID NOT NULL REFERENCES engineering_release_package(engineering_release_package_id),
    bound_entity_type                      VARCHAR(40) NOT NULL
                                           CHECK (bound_entity_type IN ('sales_order', 'job_order', 'work_order', 'production_order')),
    bound_entity_id                        TEXT NOT NULL,
    binding_status                         VARCHAR(30) NOT NULL DEFAULT 'active'
                                           CHECK (binding_status IN ('active', 'superseded', 'withdrawn', 'blocked')),
    package_hash_sha256                    CHAR(64) NOT NULL,
    member_manifest_hash_sha256            CHAR(64) NOT NULL,
    bound_at                               TIMESTAMPTZ NOT NULL DEFAULT now(),
    bound_by_party_id                      UUID REFERENCES party(party_id),
    metadata                               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE engineering_release_package_binding IS
'SO/JO/WO/production-order binding to the exact engineering package hash used for release decisions.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_erpkg_binding_one_active
    ON engineering_release_package_binding (bound_entity_type, bound_entity_id)
    WHERE binding_status = 'active';

CREATE TABLE IF NOT EXISTS work_order_engineering_package_snapshot (
    work_order_engineering_package_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id                              UUID REFERENCES work_order(work_order_id),
    legacy_work_order_id                       UUID REFERENCES work_orders(work_order_id),
    engineering_release_package_id             UUID NOT NULL REFERENCES engineering_release_package(engineering_release_package_id),
    package_hash_sha256                        CHAR(64) NOT NULL,
    member_manifest_hash_sha256                CHAR(64) NOT NULL,
    member_manifest_json                       JSONB NOT NULL,
    frozen_at                                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    frozen_by_party_id                         UUID REFERENCES party(party_id),
    freeze_reason                              VARCHAR(80) NOT NULL DEFAULT 'work_order_release',
    metadata                                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (work_order_id IS NOT NULL OR legacy_work_order_id IS NOT NULL)
);

COMMENT ON TABLE work_order_engineering_package_snapshot IS
'Frozen WO engineering package snapshot. Running work must not be silently redirected to newer BOM/routing/inspection/NC definitions.';

CREATE INDEX IF NOT EXISTS idx_wo_erpkg_snapshot_pkg
    ON work_order_engineering_package_snapshot (engineering_release_package_id, frozen_at DESC);

CREATE OR REPLACE FUNCTION fn_engineering_release_package_block_released_core_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.package_status IN ('released', 'superseded', 'withdrawn')
       AND (
            NEW.item_revision_id IS DISTINCT FROM OLD.item_revision_id
         OR NEW.site_id IS DISTINCT FROM OLD.site_id
         OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
         OR NEW.package_hash_sha256 IS DISTINCT FROM OLD.package_hash_sha256
         OR NEW.member_manifest_hash_sha256 IS DISTINCT FROM OLD.member_manifest_hash_sha256
       ) THEN
        RAISE EXCEPTION 'released_engineering_package_immutable'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engineering_release_package_block_released_core_edit ON engineering_release_package;
CREATE TRIGGER trg_engineering_release_package_block_released_core_edit
BEFORE UPDATE ON engineering_release_package
FOR EACH ROW
EXECUTE FUNCTION fn_engineering_release_package_block_released_core_edit();

CREATE OR REPLACE FUNCTION fn_engineering_release_package_block_released_child_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_package_id uuid;
    v_package_status text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_package_id := OLD.engineering_release_package_id;
    ELSE
        v_package_id := NEW.engineering_release_package_id;
    END IF;

    SELECT package_status
      INTO v_package_status
      FROM engineering_release_package
     WHERE engineering_release_package_id = v_package_id;

    IF v_package_status IN ('released', 'superseded', 'withdrawn') THEN
        RAISE EXCEPTION 'released_engineering_package_children_immutable'
            USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erpkg_member_block_released_child_edit ON engineering_release_package_member;
CREATE TRIGGER trg_erpkg_member_block_released_child_edit
BEFORE INSERT OR UPDATE OR DELETE ON engineering_release_package_member
FOR EACH ROW
EXECUTE FUNCTION fn_engineering_release_package_block_released_child_edit();

DROP TRIGGER IF EXISTS trg_erpkg_approval_block_released_child_edit ON engineering_release_package_approval;
CREATE TRIGGER trg_erpkg_approval_block_released_child_edit
BEFORE INSERT OR UPDATE OR DELETE ON engineering_release_package_approval
FOR EACH ROW
EXECUTE FUNCTION fn_engineering_release_package_block_released_child_edit();

COMMIT;
