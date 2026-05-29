-- ============================================================================
-- Migration 232: Party Identity Link Authority
-- Description: Physical party/user bridge, party profile extensions, customer
--              item approvals, supplier process approvals, and replay-safe
--              party merge remap catalog for MDA V3 P28.
-- Dependencies: 001_extensions_and_types.sql, 072_canonical_foundation_governance.sql,
--               178_user_identity_ssot_guards.sql
-- Rollback: DROP TABLE party_merge_remap_catalog, supplier_process_approval_authority,
--           customer_item_approval_authority, party_profile_extension,
--           user_party_link CASCADE;
-- Standards: ISA-95 party/resource separation; regulated approvals require
--            command/e-sign evidence in later P31/P32 prompts.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS user_party_link (
    user_party_link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(user_id),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    link_type                VARCHAR(40) NOT NULL DEFAULT 'employee_identity',
    link_status              VARCHAR(30) NOT NULL DEFAULT 'active'
                             CHECK (link_status IN ('draft', 'active', 'suspended', 'revoked', 'inactive')),
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    source_system            VARCHAR(60) NOT NULL DEFAULT 'MDA_PARTY_IDENTITY',
    source_record_ref        VARCHAR(160),
    created_by_party_id      UUID REFERENCES party(party_id),
    approved_by_party_id     UUID REFERENCES party(party_id),
    approved_at              TIMESTAMPTZ,
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version              INTEGER NOT NULL DEFAULT 1,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE user_party_link IS
'Authoritative bridge between HESEM user identity and party master. Does not own user identity writes; users/hcm_employees remain under AuthUserShadowSyncService and v_user_canonical.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_party_link_active_user_type
    ON user_party_link (user_id, link_type)
    WHERE link_status = 'active' AND effective_to IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_party_link_active_party_type
    ON user_party_link (party_id, link_type)
    WHERE link_status = 'active' AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_party_link_party
    ON user_party_link (party_id, link_status, effective_from DESC);

CREATE TABLE IF NOT EXISTS party_profile_extension (
    party_profile_extension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                   UUID NOT NULL REFERENCES party(party_id),
    profile_type               VARCHAR(40) NOT NULL,
    profile_code               VARCHAR(80) NOT NULL,
    profile_status             VARCHAR(30) NOT NULL DEFAULT 'active'
                               CHECK (profile_status IN ('draft', 'active', 'suspended', 'blocked', 'inactive', 'obsolete')),
    effective_from             TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to               TIMESTAMPTZ,
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_party_id        UUID REFERENCES party(party_id),
    approved_by_party_id       UUID REFERENCES party(party_id),
    approved_at                TIMESTAMPTZ,
    row_version                INTEGER NOT NULL DEFAULT 1,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from),
    UNIQUE (party_id, profile_type, profile_code)
);

COMMENT ON TABLE party_profile_extension IS
'Typed party profile bridge for customer, supplier, employee, operator, and portal-party extensions without duplicating identity fields.';

CREATE INDEX IF NOT EXISTS idx_party_profile_extension_party
    ON party_profile_extension (party_id, profile_type, profile_status);

CREATE TABLE IF NOT EXISTS customer_item_approval_authority (
    customer_item_approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_party_id         UUID NOT NULL REFERENCES party(party_id),
    item_ref                  VARCHAR(120) NOT NULL,
    revision_ref              VARCHAR(120),
    approval_scope_code       VARCHAR(80) NOT NULL DEFAULT 'ship_to_customer',
    approval_status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                              CHECK (approval_status IN ('draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete')),
    effective_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to              TIMESTAMPTZ,
    condition_text            TEXT,
    evidence_record_id        UUID,
    approved_by_party_id      UUID REFERENCES party(party_id),
    approved_at               TIMESTAMPTZ,
    metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version               INTEGER NOT NULL DEFAULT 1,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE customer_item_approval_authority IS
'Physical customer-item approval scope used by contract, engineering release, and shipment gates. JSON customer_item_approvals are compatibility inputs only after P28.';

CREATE INDEX IF NOT EXISTS idx_customer_item_approval_active
    ON customer_item_approval_authority (customer_party_id, item_ref, revision_ref, approval_scope_code, approval_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_item_approval_one_active
    ON customer_item_approval_authority (customer_party_id, item_ref, COALESCE(revision_ref, ''), approval_scope_code)
    WHERE approval_status IN ('approved', 'conditional') AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS supplier_process_approval_authority (
    supplier_process_approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_party_id            UUID NOT NULL REFERENCES party(party_id),
    process_code                 VARCHAR(100) NOT NULL,
    item_ref                     VARCHAR(120),
    site_ref                     VARCHAR(120),
    approval_scope_code          VARCHAR(80) NOT NULL DEFAULT 'purchase_receive',
    approval_status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                                 CHECK (approval_status IN ('draft', 'approved', 'conditional', 'blocked', 'inactive', 'obsolete')),
    certificate_ref              VARCHAR(160),
    certificate_expires_on       DATE,
    effective_from               TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                 TIMESTAMPTZ,
    condition_text               TEXT,
    evidence_record_id           UUID,
    approved_by_party_id         UUID REFERENCES party(party_id),
    approved_at                  TIMESTAMPTZ,
    metadata                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version                  INTEGER NOT NULL DEFAULT 1,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE supplier_process_approval_authority IS
'Physical supplier/process approval authority used by PO, receiving, special-process, and supplier-quality gates.';

CREATE INDEX IF NOT EXISTS idx_supplier_process_approval_active
    ON supplier_process_approval_authority (supplier_party_id, process_code, item_ref, site_ref, approval_scope_code, approval_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_process_approval_one_active
    ON supplier_process_approval_authority (supplier_party_id, process_code, COALESCE(item_ref, ''), COALESCE(site_ref, ''), approval_scope_code)
    WHERE approval_status IN ('approved', 'conditional') AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS party_merge_remap_catalog (
    party_merge_remap_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merge_group_id           UUID NOT NULL DEFAULT gen_random_uuid(),
    losing_party_id          UUID NOT NULL REFERENCES party(party_id),
    surviving_party_id       UUID NOT NULL REFERENCES party(party_id),
    reference_table_name     VARCHAR(120) NOT NULL,
    reference_pk_json        JSONB NOT NULL,
    remap_action             VARCHAR(30) NOT NULL DEFAULT 'pending'
                             CHECK (remap_action IN ('pending', 'apply', 'skip', 'rollback')),
    remap_status             VARCHAR(30) NOT NULL DEFAULT 'planned'
                             CHECK (remap_status IN ('planned', 'blocked', 'applied', 'rolled_back', 'cancelled')),
    command_id               UUID,
    idempotency_key          VARCHAR(200),
    reviewed_by_party_id     UUID REFERENCES party(party_id),
    approved_by_party_id     UUID REFERENCES party(party_id),
    applied_at               TIMESTAMPTZ,
    rollback_ref             VARCHAR(160),
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (losing_party_id <> surviving_party_id)
);

COMMENT ON TABLE party_merge_remap_catalog IS
'Replay-safe remap catalog for party duplicate merge commands. Each affected SO, PO, NCR, CAPA, inventory, quality, or finance reference must be enumerated before a merge is applied.';

CREATE INDEX IF NOT EXISTS idx_party_merge_remap_group
    ON party_merge_remap_catalog (merge_group_id, remap_status, reference_table_name);

CREATE INDEX IF NOT EXISTS idx_party_merge_remap_losing_party
    ON party_merge_remap_catalog (losing_party_id, remap_status);

COMMIT;
