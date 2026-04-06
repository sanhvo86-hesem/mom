-- ============================================================================
-- HESEM CANONICAL ERP + MES + eQMS 7-LAYER BLUEPRINT
-- ----------------------------------------------------------------------------
-- Purpose:
--   Executable backbone DDL for the canonical enterprise model described in
--   docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md
--
-- Scope:
--   Core backbone only. Extension packs (APS, WMS, lab, supplier quality,
--   service, CRM, treasury, EHS, tooling, DPP) remain cataloged in the
--   architecture document and should be added in subsequent migration waves.
--
-- Standards Basis:
--   ISA-95, SAP Business Partner + inspection lot patterns,
--   Oracle work definitions / work orders,
--   Microsoft Dynamics production + quality order patterns,
--   FDA QMSR / Part 11 / complaint file expectations.
--
-- Intended Use:
--   1. Reference blueprint for future numbered migrations
--   2. Greenfield canonical environment
--   3. Architecture alignment and crosswalk against current HESEM schema
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FOUNDATION + CROSS-CUTTING GOVERNANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_enterprise (
    enterprise_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code          VARCHAR(40) NOT NULL UNIQUE,
    enterprise_name          VARCHAR(255) NOT NULL,
    home_currency_code       VARCHAR(10) NOT NULL DEFAULT 'VND',
    base_timezone            VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_company (
    company_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id            UUID NOT NULL REFERENCES org_enterprise(enterprise_id),
    company_code             VARCHAR(40) NOT NULL UNIQUE,
    legal_name               VARCHAR(255) NOT NULL,
    registration_country_code VARCHAR(10) NOT NULL DEFAULT 'VN',
    functional_currency_code VARCHAR(10) NOT NULL DEFAULT 'VND',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_site (
    site_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID NOT NULL REFERENCES org_company(company_id),
    site_code                VARCHAR(40) NOT NULL UNIQUE,
    site_name                VARCHAR(255) NOT NULL,
    site_type                VARCHAR(50) NOT NULL DEFAULT 'manufacturing',
    timezone                 VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_plant (
    plant_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id                  UUID NOT NULL REFERENCES org_site(site_id),
    plant_code               VARCHAR(40) NOT NULL UNIQUE,
    plant_name               VARCHAR(255) NOT NULL,
    plant_type               VARCHAR(50) NOT NULL DEFAULT 'machining',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_warehouse (
    warehouse_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    warehouse_code           VARCHAR(40) NOT NULL UNIQUE,
    warehouse_name           VARCHAR(255) NOT NULL,
    warehouse_type           VARCHAR(50) NOT NULL DEFAULT 'stock',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_work_center (
    work_center_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    work_center_code         VARCHAR(40) NOT NULL UNIQUE,
    work_center_name         VARCHAR(255) NOT NULL,
    capacity_uom_code        VARCHAR(20) NOT NULL DEFAULT 'MIN',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_work_unit (
    work_unit_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id           UUID NOT NULL REFERENCES org_work_center(work_center_id),
    work_unit_code           VARCHAR(60) NOT NULL UNIQUE,
    work_unit_name           VARCHAR(255) NOT NULL,
    equipment_class          VARCHAR(80),
    serial_number            VARCHAR(120),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party (
    party_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code               VARCHAR(60) NOT NULL UNIQUE,
    party_type               VARCHAR(40) NOT NULL,
    display_name             VARCHAR(255) NOT NULL,
    tax_registration_no      VARCHAR(80),
    country_code             VARCHAR(10),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_role (
    party_role_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    role_code                VARCHAR(60) NOT NULL,
    scope_entity_name        VARCHAR(60),
    scope_entity_id          UUID,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (party_id, role_code, scope_entity_name, scope_entity_id)
);

CREATE TABLE IF NOT EXISTS party_site (
    party_site_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    site_role_code           VARCHAR(40) NOT NULL,
    site_name                VARCHAR(255) NOT NULL,
    address_line_1           VARCHAR(255),
    address_line_2           VARCHAR(255),
    city_name                VARCHAR(120),
    state_name               VARCHAR(120),
    postal_code              VARCHAR(40),
    country_code             VARCHAR(10),
    is_default               BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_contact (
    party_contact_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    party_site_id            UUID REFERENCES party_site(party_site_id),
    contact_name             VARCHAR(255) NOT NULL,
    contact_role_code        VARCHAR(40),
    email_address            VARCHAR(255),
    phone_number             VARCHAR(80),
    is_primary               BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uom (
    uom_code                 VARCHAR(20) PRIMARY KEY,
    uom_name                 VARCHAR(120) NOT NULL,
    uom_category             VARCHAR(40) NOT NULL,
    base_uom_code            VARCHAR(20),
    conversion_factor        NUMERIC(18,8) NOT NULL DEFAULT 1,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS calendar (
    calendar_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_code            VARCHAR(40) NOT NULL UNIQUE,
    calendar_name            VARCHAR(255) NOT NULL,
    timezone                 VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id              UUID NOT NULL REFERENCES calendar(calendar_id),
    shift_code               VARCHAR(20) NOT NULL,
    shift_name               VARCHAR(120) NOT NULL,
    start_time               TIME NOT NULL,
    end_time                 TIME NOT NULL,
    crosses_midnight         BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (calendar_id, shift_code)
);

CREATE TABLE IF NOT EXISTS reason_code (
    reason_code_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_domain            VARCHAR(40) NOT NULL,
    reason_code              VARCHAR(40) NOT NULL,
    reason_name              VARCHAR(255) NOT NULL,
    severity_code            VARCHAR(30),
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reason_domain, reason_code)
);

CREATE TABLE IF NOT EXISTS status_code (
    status_code_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_domain            VARCHAR(40) NOT NULL,
    status_code              VARCHAR(40) NOT NULL,
    status_name              VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    is_terminal              BOOLEAN NOT NULL DEFAULT false,
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (status_domain, status_code)
);

CREATE TABLE IF NOT EXISTS electronic_signature (
    electronic_signature_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signed_by_party_id       UUID REFERENCES party(party_id),
    signature_meaning        VARCHAR(120) NOT NULL,
    signature_status         VARCHAR(30) NOT NULL DEFAULT 'applied',
    hash_value               TEXT NOT NULL,
    provider_name            VARCHAR(120),
    signed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS approval (
    approval_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    approval_step_code       VARCHAR(60) NOT NULL,
    approver_party_id        UUID REFERENCES party(party_id),
    decision_code            VARCHAR(30),
    comment_text             TEXT,
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id),
    decided_at               TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS attachment (
    attachment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    attachment_type          VARCHAR(40) NOT NULL DEFAULT 'file',
    file_name                VARCHAR(255) NOT NULL,
    storage_uri              TEXT NOT NULL,
    checksum_sha256          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MASTER DATA
-- ============================================================================

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

-- ============================================================================
-- ENGINEERING / MANUFACTURING DEFINITION
-- ============================================================================

CREATE TABLE IF NOT EXISTS bom (
    bom_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_code                 VARCHAR(80) NOT NULL UNIQUE,
    parent_item_revision_id  UUID NOT NULL REFERENCES item_revision(item_revision_id),
    bom_type                 VARCHAR(30) NOT NULL DEFAULT 'manufacturing',
    alternate_code           VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_version (
    bom_version_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id                   UUID NOT NULL REFERENCES bom(bom_id),
    version_code             VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    UNIQUE (bom_id, version_code)
);

CREATE TABLE IF NOT EXISTS bom_line (
    bom_line_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_version_id           UUID NOT NULL REFERENCES bom_version(bom_version_id),
    component_item_revision_id UUID NOT NULL REFERENCES item_revision(item_revision_id),
    sequence_no              INTEGER NOT NULL,
    qty_per                  NUMERIC(18,6) NOT NULL,
    issue_method             VARCHAR(30) NOT NULL DEFAULT 'backflush',
    scrap_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 0,
    UNIQUE (bom_version_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS bom_substitute (
    bom_substitute_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_line_id              UUID NOT NULL REFERENCES bom_line(bom_line_id),
    substitute_item_revision_id UUID NOT NULL REFERENCES item_revision(item_revision_id),
    priority_no              INTEGER NOT NULL DEFAULT 1,
    quantity_factor          NUMERIC(18,6) NOT NULL DEFAULT 1.0,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS work_definition (
    work_definition_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_code     VARCHAR(80) NOT NULL UNIQUE,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    definition_type          VARCHAR(30) NOT NULL DEFAULT 'routing',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_definition_version (
    work_definition_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_id       UUID NOT NULL REFERENCES work_definition(work_definition_id),
    version_code             VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    UNIQUE (work_definition_id, version_code)
);

CREATE TABLE IF NOT EXISTS operation (
    operation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_version_id UUID NOT NULL REFERENCES work_definition_version(work_definition_version_id),
    operation_code           VARCHAR(60) NOT NULL,
    operation_name           VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL,
    standard_setup_minutes   NUMERIC(18,4) NOT NULL DEFAULT 0,
    standard_run_minutes     NUMERIC(18,4) NOT NULL DEFAULT 0,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (work_definition_version_id, operation_code)
);

CREATE TABLE IF NOT EXISTS operation_resource (
    operation_resource_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    resource_type            VARCHAR(30) NOT NULL,
    work_center_id           UUID REFERENCES org_work_center(work_center_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    setup_minutes            NUMERIC(18,4) NOT NULL DEFAULT 0,
    run_minutes_per_unit     NUMERIC(18,6) NOT NULL DEFAULT 0,
    crew_size                NUMERIC(9,2) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS operation_material (
    operation_material_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    issue_method             VARCHAR(30) NOT NULL DEFAULT 'backflush',
    quantity_per             NUMERIC(18,6) NOT NULL,
    scrap_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operation_output (
    operation_output_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    output_type              VARCHAR(30) NOT NULL DEFAULT 'primary',
    yield_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS work_instruction (
    work_instruction_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    instruction_code         VARCHAR(80) NOT NULL,
    instruction_title        VARCHAR(255) NOT NULL,
    document_revision_id     UUID,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    is_mandatory             BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (operation_id, instruction_code)
);

-- ============================================================================
-- PLANNING / ERP ORCHESTRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS demand (
    demand_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_source            VARCHAR(30) NOT NULL,
    source_document_no       VARCHAR(80),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    required_date            TIMESTAMPTZ NOT NULL,
    demand_qty               NUMERIC(18,6) NOT NULL,
    priority_code            VARCHAR(30) NOT NULL DEFAULT 'normal',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS forecast (
    forecast_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    customer_party_id        UUID REFERENCES party(party_id),
    period_start             DATE NOT NULL,
    period_end               DATE NOT NULL,
    forecast_qty             NUMERIC(18,6) NOT NULL,
    confidence_pct           NUMERIC(5,2),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS sales_order (
    sales_order_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_no           VARCHAR(80) NOT NULL UNIQUE,
    customer_party_id        UUID NOT NULL REFERENCES party(party_id),
    order_date               TIMESTAMPTZ NOT NULL DEFAULT now(),
    requested_ship_date      TIMESTAMPTZ,
    promise_date             TIMESTAMPTZ,
    currency_code            VARCHAR(10) NOT NULL DEFAULT 'VND',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS sales_order_line (
    sales_order_line_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id           UUID NOT NULL REFERENCES sales_order(sales_order_id),
    line_no                  INTEGER NOT NULL,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    ordered_qty              NUMERIC(18,6) NOT NULL,
    requested_ship_date      TIMESTAMPTZ,
    promised_ship_date       TIMESTAMPTZ,
    unit_price               NUMERIC(18,6),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    UNIQUE (sales_order_id, line_no)
);

CREATE TABLE IF NOT EXISTS purchase_order (
    purchase_order_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_no        VARCHAR(80) NOT NULL UNIQUE,
    supplier_party_id        UUID NOT NULL REFERENCES party(party_id),
    order_date               TIMESTAMPTZ NOT NULL DEFAULT now(),
    requested_receipt_date   TIMESTAMPTZ,
    currency_code            VARCHAR(10) NOT NULL DEFAULT 'VND',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS purchase_order_line (
    purchase_order_line_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id        UUID NOT NULL REFERENCES purchase_order(purchase_order_id),
    line_no                  INTEGER NOT NULL,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    ordered_qty              NUMERIC(18,6) NOT NULL,
    requested_receipt_date   TIMESTAMPTZ,
    unit_price               NUMERIC(18,6),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    UNIQUE (purchase_order_id, line_no)
);

CREATE TABLE IF NOT EXISTS production_order (
    production_order_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_no      VARCHAR(80) NOT NULL UNIQUE,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    planned_qty              NUMERIC(18,6) NOT NULL,
    planned_start_at         TIMESTAMPTZ,
    planned_end_at           TIMESTAMPTZ,
    release_state            VARCHAR(30) NOT NULL DEFAULT 'planned',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS mrp_signal (
    mrp_signal_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    signal_type              VARCHAR(40) NOT NULL,
    source_entity_name       VARCHAR(80),
    source_entity_id         UUID,
    shortage_qty             NUMERIC(18,6),
    due_at                   TIMESTAMPTZ,
    priority_code            VARCHAR(30) NOT NULL DEFAULT 'normal',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS planned_supply (
    planned_supply_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrp_signal_id            UUID REFERENCES mrp_signal(mrp_signal_id),
    supply_type              VARCHAR(30) NOT NULL,
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    planned_qty              NUMERIC(18,6) NOT NULL,
    planned_start_at         TIMESTAMPTZ,
    planned_end_at           TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS allocation (
    allocation_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_entity_name       VARCHAR(80) NOT NULL,
    supply_entity_id         UUID NOT NULL,
    demand_entity_name       VARCHAR(80) NOT NULL,
    demand_entity_id         UUID NOT NULL,
    item_revision_id         UUID REFERENCES item_revision(item_revision_id),
    allocated_qty            NUMERIC(18,6) NOT NULL,
    allocated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pegging (
    pegging_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_entity_name       VARCHAR(80) NOT NULL,
    parent_entity_id         UUID NOT NULL,
    child_entity_name        VARCHAR(80) NOT NULL,
    child_entity_id          UUID NOT NULL,
    item_revision_id         UUID REFERENCES item_revision(item_revision_id),
    pegged_qty               NUMERIC(18,6) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_order_bom_snapshot (
    production_order_bom_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    bom_version_id           UUID REFERENCES bom_version(bom_version_id),
    snapshot_json            JSONB NOT NULL,
    frozen_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_order_route_snapshot (
    production_order_route_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    work_definition_version_id UUID REFERENCES work_definition_version(work_definition_version_id),
    snapshot_json            JSONB NOT NULL,
    frozen_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MES / SHOP FLOOR EXECUTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_order (
    work_order_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_no            VARCHAR(80) NOT NULL UNIQUE,
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    operation_id             UUID REFERENCES operation(operation_id),
    planned_qty              NUMERIC(18,6) NOT NULL,
    release_state            VARCHAR(30) NOT NULL DEFAULT 'planned',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS job (
    job_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_no                   VARCHAR(80) NOT NULL UNIQUE,
    work_order_id            UUID NOT NULL REFERENCES work_order(work_order_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    planned_start_at         TIMESTAMPTZ,
    planned_end_at           TIMESTAMPTZ,
    current_state            VARCHAR(30) NOT NULL DEFAULT 'queued',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS track_in (
    track_in_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    tracked_by_party_id      UUID REFERENCES party(party_id),
    tracked_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS track_out (
    track_out_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    good_qty                 NUMERIC(18,6) NOT NULL DEFAULT 0,
    reject_qty               NUMERIC(18,6) NOT NULL DEFAULT 0,
    tracked_by_party_id      UUID REFERENCES party(party_id),
    tracked_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pause_resume (
    pause_resume_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    action_code              VARCHAR(20) NOT NULL,
    reason_code              VARCHAR(60),
    acted_by_party_id        UUID REFERENCES party(party_id),
    acted_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_queue (
    dispatch_queue_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id           UUID NOT NULL REFERENCES org_work_center(work_center_id),
    queue_date               DATE NOT NULL,
    dispatch_sequence        INTEGER NOT NULL,
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    dispatch_rule            VARCHAR(40) NOT NULL DEFAULT 'fifo',
    frozen_flag              BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (work_center_id, queue_date, dispatch_sequence)
);

CREATE TABLE IF NOT EXISTS job_event (
    job_event_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    event_type               VARCHAR(40) NOT NULL,
    operator_party_id        UUID REFERENCES party(party_id),
    event_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_value_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_system            VARCHAR(40) NOT NULL DEFAULT 'MES'
);

CREATE TABLE IF NOT EXISTS machine_event (
    machine_event_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    event_type               VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30) NOT NULL DEFAULT 'info',
    event_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason_code              VARCHAR(60),
    payload_json             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS downtime_event (
    downtime_event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    production_order_id      UUID REFERENCES production_order(production_order_id),
    reason_code              VARCHAR(60),
    started_at               TIMESTAMPTZ NOT NULL,
    ended_at                 TIMESTAMPTZ,
    duration_minutes         NUMERIC(18,2)
);

CREATE TABLE IF NOT EXISTS alarm_event (
    alarm_event_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    alarm_code               VARCHAR(80) NOT NULL,
    severity_code            VARCHAR(30),
    alarm_state              VARCHAR(30) NOT NULL DEFAULT 'active',
    occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    cleared_at               TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS process_param_capture (
    process_param_capture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    operation_id             UUID REFERENCES operation(operation_id),
    param_code               VARCHAR(80) NOT NULL,
    param_value_text         TEXT,
    param_value_num          NUMERIC(18,6),
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor_capture (
    labor_capture_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    labor_minutes            NUMERIC(18,2) NOT NULL,
    labor_type               VARCHAR(30) NOT NULL DEFAULT 'direct',
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_usage (
    tool_usage_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    tool_code                VARCHAR(80) NOT NULL,
    usage_cycles             INTEGER,
    usage_minutes            NUMERIC(18,2),
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_consumption (
    material_consumption_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    lot_no                   VARCHAR(120),
    serial_no                VARCHAR(120),
    consumed_qty             NUMERIC(18,6) NOT NULL,
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    consumed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_completion (
    production_completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    output_lot_no            VARCHAR(120),
    output_serial_no         VARCHAR(120),
    good_qty                 NUMERIC(18,6) NOT NULL DEFAULT 0,
    reject_qty               NUMERIC(18,6) NOT NULL DEFAULT 0,
    reported_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'reported'
);

CREATE TABLE IF NOT EXISTS scrap (
    scrap_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    job_id                   UUID REFERENCES job(job_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    lot_no                   VARCHAR(120),
    serial_no                VARCHAR(120),
    scrap_qty                NUMERIC(18,6) NOT NULL,
    reason_code              VARCHAR(60),
    scrapped_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rework (
    rework_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    job_id                   UUID REFERENCES job(job_id),
    source_entity_name       VARCHAR(80),
    source_entity_id         UUID,
    reason_code              VARCHAR(60),
    rework_status            VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genealogy_link (
    genealogy_link_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID REFERENCES production_order(production_order_id),
    parent_lot_no            VARCHAR(120),
    child_lot_no             VARCHAR(120),
    parent_serial_no         VARCHAR(120),
    child_serial_no          VARCHAR(120),
    link_type                VARCHAR(40) NOT NULL DEFAULT 'consume_to_output',
    linked_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INVENTORY / COST / TRACEABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS lot (
    lot_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_no                   VARCHAR(120) NOT NULL UNIQUE,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    lot_status               VARCHAR(30) NOT NULL DEFAULT 'active',
    manufacture_date         DATE,
    expiry_date              DATE,
    supplier_party_id        UUID REFERENCES party(party_id),
    genealogy_state          VARCHAR(30) NOT NULL DEFAULT 'tracked'
);

CREATE TABLE IF NOT EXISTS serial (
    serial_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no                VARCHAR(120) NOT NULL UNIQUE,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    serial_status            VARCHAR(30) NOT NULL DEFAULT 'active',
    parent_lot_id            UUID REFERENCES lot(lot_id),
    genealogy_state          VARCHAR(30) NOT NULL DEFAULT 'tracked'
);

CREATE TABLE IF NOT EXISTS container (
    container_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_code           VARCHAR(80) NOT NULL UNIQUE,
    container_type           VARCHAR(40) NOT NULL,
    parent_container_id      UUID REFERENCES container(container_id),
    current_warehouse_id     UUID REFERENCES org_warehouse(warehouse_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS inventory_ledger (
    inventory_ledger_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    warehouse_id             UUID REFERENCES org_warehouse(warehouse_id),
    lot_id                   UUID REFERENCES lot(lot_id),
    serial_id                UUID REFERENCES serial(serial_id),
    movement_type            VARCHAR(40) NOT NULL,
    qty_delta                NUMERIC(18,6) NOT NULL,
    reference_entity_name    VARCHAR(80),
    reference_entity_id      UUID,
    movement_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_balance_snapshot (
    inventory_balance_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    warehouse_id             UUID REFERENCES org_warehouse(warehouse_id),
    lot_id                   UUID REFERENCES lot(lot_id),
    serial_id                UUID REFERENCES serial(serial_id),
    on_hand_qty              NUMERIC(18,6) NOT NULL DEFAULT 0,
    allocated_qty            NUMERIC(18,6) NOT NULL DEFAULT 0,
    available_qty            NUMERIC(18,6) NOT NULL DEFAULT 0,
    snapshot_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_balance (
    location_balance_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_site_id             UUID NOT NULL REFERENCES item_site(item_site_id),
    warehouse_id             UUID REFERENCES org_warehouse(warehouse_id),
    container_id             UUID REFERENCES container(container_id),
    lot_id                   UUID REFERENCES lot(lot_id),
    serial_id                UUID REFERENCES serial(serial_id),
    on_hand_qty              NUMERIC(18,6) NOT NULL DEFAULT 0,
    reserved_qty             NUMERIC(18,6) NOT NULL DEFAULT 0,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_ledger (
    cost_ledger_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_object_type         VARCHAR(40) NOT NULL,
    cost_object_id           UUID NOT NULL,
    cost_element_code        VARCHAR(40) NOT NULL,
    cost_amount              NUMERIC(18,6) NOT NULL,
    currency_code            VARCHAR(10) NOT NULL DEFAULT 'VND',
    reference_entity_name    VARCHAR(80),
    reference_entity_id      UUID,
    posting_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wip_ledger (
    wip_ledger_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    stage_code               VARCHAR(40) NOT NULL,
    quantity_delta           NUMERIC(18,6) NOT NULL,
    amount_delta             NUMERIC(18,6),
    posting_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- eQMS / COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inspection_plan (
    inspection_plan_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    plan_code                VARCHAR(80) NOT NULL,
    plan_type                VARCHAR(40) NOT NULL,
    revision_code            VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (item_revision_id, plan_code, revision_code)
);

CREATE TABLE IF NOT EXISTS inspection_characteristic (
    inspection_characteristic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_plan_id       UUID NOT NULL REFERENCES inspection_plan(inspection_plan_id),
    characteristic_code      VARCHAR(80) NOT NULL,
    characteristic_name      VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    target_value_text        TEXT,
    lower_spec_limit         NUMERIC(18,6),
    upper_spec_limit         NUMERIC(18,6),
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    is_critical              BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (inspection_plan_id, characteristic_code)
);

CREATE TABLE IF NOT EXISTS inspection_lot (
    inspection_lot_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_lot_no        VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID,
    item_revision_id         UUID REFERENCES item_revision(item_revision_id),
    lot_id                   UUID REFERENCES lot(lot_id),
    serial_id                UUID REFERENCES serial(serial_id),
    inspection_status        VARCHAR(30) NOT NULL DEFAULT 'open',
    severity_code            VARCHAR(30),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_result (
    inspection_result_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_lot_id        UUID NOT NULL REFERENCES inspection_lot(inspection_lot_id),
    inspection_characteristic_id UUID REFERENCES inspection_characteristic(inspection_characteristic_id),
    characteristic_code      VARCHAR(80) NOT NULL,
    result_value_text        TEXT,
    result_value_num         NUMERIC(18,6),
    disposition_code         VARCHAR(40),
    recorded_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_order (
    quality_order_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_order_no         VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID,
    case_type                VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30),
    owner_party_id           UUID REFERENCES party(party_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_case_link (
    quality_case_link_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_order_id         UUID NOT NULL REFERENCES quality_order(quality_order_id),
    linked_entity_name       VARCHAR(80) NOT NULL,
    linked_entity_id         UUID NOT NULL,
    relationship_code        VARCHAR(40) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nonconformance (
    nonconformance_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonconformance_no        VARCHAR(80) NOT NULL UNIQUE,
    quality_order_id         UUID REFERENCES quality_order(quality_order_id),
    source_type              VARCHAR(40),
    source_id                UUID,
    containment_action       TEXT,
    disposition_code         VARCHAR(40),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deviation (
    deviation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deviation_no             VARCHAR(80) NOT NULL UNIQUE,
    source_type              VARCHAR(40),
    source_id                UUID,
    reason_code              VARCHAR(60),
    disposition_code         VARCHAR(40),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capa (
    capa_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_no                  VARCHAR(80) NOT NULL UNIQUE,
    source_case_name         VARCHAR(40) NOT NULL,
    source_case_id           UUID NOT NULL,
    root_cause_method        VARCHAR(40),
    effectiveness_due_date   DATE,
    owner_party_id           UUID REFERENCES party(party_id),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_no             VARCHAR(80) NOT NULL UNIQUE,
    customer_party_id        UUID REFERENCES party(party_id),
    reported_item_revision_id UUID REFERENCES item_revision(item_revision_id),
    reported_lot_id          UUID REFERENCES lot(lot_id),
    reported_serial_id       UUID REFERENCES serial(serial_id),
    complaint_text           TEXT NOT NULL,
    severity_code            VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document (
    document_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no              VARCHAR(80) NOT NULL UNIQUE,
    document_type            VARCHAR(40) NOT NULL,
    title_text               VARCHAR(255) NOT NULL,
    owner_party_id           UUID REFERENCES party(party_id),
    lifecycle_state          VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_revision (
    document_revision_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id              UUID NOT NULL REFERENCES document(document_id),
    revision_code            VARCHAR(40) NOT NULL,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    checksum_sha256          TEXT,
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id),
    UNIQUE (document_id, revision_code)
);

CREATE TABLE IF NOT EXISTS change_control (
    change_control_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_control_no        VARCHAR(80) NOT NULL UNIQUE,
    change_type              VARCHAR(40) NOT NULL,
    source_document_revision_id UUID REFERENCES document_revision(document_revision_id),
    impact_summary           TEXT,
    risk_summary             TEXT,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_program (
    audit_program_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_program_code       VARCHAR(80) NOT NULL UNIQUE,
    program_name             VARCHAR(255) NOT NULL,
    scope_text               TEXT,
    frequency_code           VARCHAR(30),
    owner_party_id           UUID REFERENCES party(party_id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit (
    audit_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_program_id         UUID REFERENCES audit_program(audit_program_id),
    audit_no                 VARCHAR(80) NOT NULL UNIQUE,
    audit_type               VARCHAR(40) NOT NULL,
    auditee_party_id         UUID REFERENCES party(party_id),
    scheduled_start_at       TIMESTAMPTZ,
    scheduled_end_at         TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'planned',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finding (
    finding_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id                 UUID NOT NULL REFERENCES audit(audit_id),
    finding_no               VARCHAR(80) NOT NULL,
    finding_type             VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30),
    finding_text             TEXT NOT NULL,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (audit_id, finding_no)
);

CREATE TABLE IF NOT EXISTS competency (
    competency_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competency_code          VARCHAR(80) NOT NULL UNIQUE,
    competency_name          VARCHAR(255) NOT NULL,
    competency_type          VARCHAR(40) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_matrix (
    training_matrix_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code                VARCHAR(40) NOT NULL,
    document_id              UUID REFERENCES document(document_id),
    competency_id            UUID REFERENCES competency(competency_id),
    required_flag            BOOLEAN NOT NULL DEFAULT true,
    refresh_cycle_days       INTEGER,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_record (
    training_record_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    training_matrix_id       UUID REFERENCES training_matrix(training_matrix_id),
    completed_at             TIMESTAMPTZ,
    expiry_at                TIMESTAMPTZ,
    score_value              NUMERIC(9,2),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'assigned',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_quality_case (
    supplier_quality_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_party_id        UUID NOT NULL REFERENCES party(party_id),
    source_type              VARCHAR(40) NOT NULL,
    source_id                UUID NOT NULL,
    issue_code               VARCHAR(40),
    severity_code            VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_register (
    risk_register_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_code                VARCHAR(80) NOT NULL UNIQUE,
    risk_domain              VARCHAR(40) NOT NULL,
    source_entity_name       VARCHAR(80),
    source_entity_id         UUID,
    severity_code            VARCHAR(30),
    occurrence_code          VARCHAR(30),
    detection_code           VARCHAR(30),
    mitigation_text          TEXT,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_trail (
    audit_trail_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    action_code              VARCHAR(40) NOT NULL,
    old_payload              JSONB,
    new_payload              JSONB,
    acted_by_party_id        UUID REFERENCES party(party_id),
    acted_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_work_instruction_document_revision'
    ) THEN
        ALTER TABLE work_instruction
            ADD CONSTRAINT fk_work_instruction_document_revision
            FOREIGN KEY (document_revision_id)
            REFERENCES document_revision(document_revision_id);
    END IF;
END $$;

COMMIT;
