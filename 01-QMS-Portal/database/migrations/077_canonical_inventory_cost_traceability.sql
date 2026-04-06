-- ============================================================================
-- Migration 077: Canonical Inventory, Cost, and Traceability Backbone
-- Description: Ledger-first inventory, lot/serial/container traceability, location balances,
--              and WIP/cost ledgers.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql,
--               075_canonical_planning_erp_orchestration.sql,
--               076_canonical_mes_execution_spine.sql
-- Rollback: DROP TABLE wip_ledger, cost_ledger, location_balance, inventory_balance_snapshot,
--           inventory_ledger, container, serial, lot CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

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

COMMIT;
