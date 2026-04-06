-- ============================================================================
-- Migration 073: Canonical Master Data Core
-- Description: Item, revision, site, attribute, specification, and lifecycle control policies
--              for lot/serial/shelf-life governance.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql
-- Rollback: DROP TABLE item_spec, item_attr, item_site, item_variant, item_revision,
--           item_class, item, shelf_life_policy, serial_policy, lot_policy CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS lot_policy (
    lot_policy_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code              VARCHAR(40) NOT NULL UNIQUE,
    lot_numbering_rule       VARCHAR(120) NOT NULL,
    shelf_life_days          INTEGER,
    genealogy_required       BOOLEAN NOT NULL DEFAULT true,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS serial_policy (
    serial_policy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code              VARCHAR(40) NOT NULL UNIQUE,
    serial_numbering_rule    VARCHAR(120) NOT NULL,
    serialization_point      VARCHAR(60) NOT NULL DEFAULT 'completion',
    uniqueness_scope         VARCHAR(40) NOT NULL DEFAULT 'enterprise',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS shelf_life_policy (
    shelf_life_policy_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code              VARCHAR(40) NOT NULL UNIQUE,
    total_shelf_life_days    INTEGER NOT NULL,
    retest_interval_days     INTEGER,
    quarantine_on_expiry     BOOLEAN NOT NULL DEFAULT true,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS item (
    item_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code                VARCHAR(80) NOT NULL UNIQUE,
    item_name                VARCHAR(255) NOT NULL,
    item_type                VARCHAR(40) NOT NULL,
    base_uom_code            VARCHAR(20) REFERENCES uom(uom_code),
    product_family_code      VARCHAR(60),
    lot_policy_id            UUID REFERENCES lot_policy(lot_policy_id),
    serial_policy_id         UUID REFERENCES serial_policy(serial_policy_id),
    shelf_life_policy_id     UUID REFERENCES shelf_life_policy(shelf_life_policy_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_class (
    item_class_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code               VARCHAR(60) NOT NULL UNIQUE,
    class_name               VARCHAR(255) NOT NULL,
    parent_class_id          UUID REFERENCES item_class(item_class_id),
    lifecycle_type           VARCHAR(40),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_revision (
    item_revision_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                  UUID NOT NULL REFERENCES item(item_id),
    revision_code            VARCHAR(40) NOT NULL,
    lifecycle_state          VARCHAR(30) NOT NULL DEFAULT 'draft',
    drawing_reference        VARCHAR(120),
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    UNIQUE (item_id, revision_code)
);

CREATE TABLE IF NOT EXISTS item_variant (
    item_variant_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    variant_code             VARCHAR(80) NOT NULL,
    variant_name             VARCHAR(255) NOT NULL,
    option_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default               BOOLEAN NOT NULL DEFAULT false,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_revision_id, variant_code)
);

CREATE TABLE IF NOT EXISTS item_site (
    item_site_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                  UUID NOT NULL REFERENCES item(item_id),
    site_id                  UUID NOT NULL REFERENCES org_site(site_id),
    planner_code             VARCHAR(60),
    procurement_type         VARCHAR(30) NOT NULL DEFAULT 'make_or_buy',
    default_warehouse_id     UUID REFERENCES org_warehouse(warehouse_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (item_id, site_id)
);

CREATE TABLE IF NOT EXISTS item_attr (
    item_attr_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                  UUID NOT NULL REFERENCES item(item_id),
    attr_name                VARCHAR(80) NOT NULL,
    attr_type                VARCHAR(30) NOT NULL DEFAULT 'text',
    attr_value_text          TEXT,
    attr_value_num           NUMERIC(18,6),
    attr_value_bool          BOOLEAN,
    attr_value_json          JSONB,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_id, attr_name)
);

CREATE TABLE IF NOT EXISTS item_spec (
    item_spec_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    spec_code                VARCHAR(60) NOT NULL,
    spec_name                VARCHAR(255) NOT NULL,
    spec_type                VARCHAR(40) NOT NULL,
    target_value_text        TEXT,
    lower_limit_num          NUMERIC(18,6),
    upper_limit_num          NUMERIC(18,6),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (item_revision_id, spec_code)
);

COMMIT;
