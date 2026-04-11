-- ============================================================================
-- Migration 075: Canonical Planning and ERP Orchestration
-- Description: Demand, forecast, sales, purchasing, MRP, planned supply, allocation, pegging,
--              and production snapshots.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql,
--               074_canonical_engineering_definition.sql
-- Rollback: DROP TABLE production_order_route_snapshot, production_order_bom_snapshot,
--           pegging, allocation, planned_supply, mrp_signal, production_order,
--           purchase_order_line, purchase_order, sales_order_line, sales_order, forecast,
--           demand CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

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

COMMIT;
