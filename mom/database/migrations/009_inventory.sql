-- Migration: 009_inventory.sql
-- Description: Inventory tables - warehouses, inventory_locations, inventory_transactions, lot_master, serial_master
-- Dependencies: 006_erp_master_data.sql, 008_vendors_purchasing.sql
-- Rollback: DROP TABLE inventory_transactions, serial_master, lot_master, inventory_locations, warehouses CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- warehouses / Kho
-- ---------------------------------------------------------------------------
CREATE TABLE warehouses (
    warehouse_id    VARCHAR(30)     PRIMARY KEY,
    warehouse_name  VARCHAR(150)    NOT NULL,
    warehouse_name_vi VARCHAR(150),
    location        VARCHAR(300),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE warehouses IS 'Warehouse definitions. / Dinh nghia kho.';

-- ---------------------------------------------------------------------------
-- inventory_locations / Vi tri kho
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_locations (
    location_id     VARCHAR(50)     PRIMARY KEY,
    warehouse_id    VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    bin_location    VARCHAR(50),
    zone_code       VARCHAR(20),
    rack            VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE inventory_locations IS 'Bin/zone/rack locations within warehouses. / Vi tri thung/khu vuc/ke trong kho.';

-- ---------------------------------------------------------------------------
-- lot_master / Ho so lo
-- ---------------------------------------------------------------------------
CREATE TABLE lot_master (
    lot_number          VARCHAR(100)    PRIMARY KEY,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    heat_number         VARCHAR(100),
    batch_number        VARCHAR(100),
    vendor_lot_number   VARCHAR(100),
    vendor_id           VARCHAR(50)     REFERENCES vendors(vendor_id),
    received_date       DATE,
    expiration_date     DATE,
    coc_number          VARCHAR(100),
    material_cert_number VARCHAR(100),
    country_of_origin   VARCHAR(5),
    conformance_status  inv_conformance_enum DEFAULT 'in_inspection',
    dmr_number          VARCHAR(50),
    po_reference        VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lot_master IS 'Lot genealogy with material certs. / Ho so lo voi chung nhan vat lieu.';

-- ---------------------------------------------------------------------------
-- serial_master / Ho so serial
-- ---------------------------------------------------------------------------
CREATE TABLE serial_master (
    serial_number   VARCHAR(100)    PRIMARY KEY,
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number      VARCHAR(100)    REFERENCES lot_master(lot_number),
    status          VARCHAR(30)     DEFAULT 'active',
    location_id     VARCHAR(50)     REFERENCES inventory_locations(location_id),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE serial_master IS 'Serial number tracking. / Theo doi so serial.';

-- ---------------------------------------------------------------------------
-- inventory_transactions / Giao dich ton kho (40 vars from erp_inventory)
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
    txn_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id        VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    location_id         VARCHAR(50)     REFERENCES inventory_locations(location_id),
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number          VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number       VARCHAR(100),
    stock_type          stock_type_enum NOT NULL DEFAULT 'raw',
    txn_type            VARCHAR(30)     NOT NULL,  -- receipt, issue, transfer, adjust
    qty_change          NUMERIC(12,2)   NOT NULL,
    qty_on_hand         NUMERIC(12,2),
    qty_available       NUMERIC(12,2),
    qty_allocated       NUMERIC(12,2),
    qty_on_order        NUMERIC(12,2),
    qty_in_transit      NUMERIC(12,2),
    qty_in_inspection   NUMERIC(12,2),
    qty_quarantined     NUMERIC(12,2),
    qty_reserved        NUMERIC(12,2),
    unit_cost_avg       NUMERIC(14,4),
    unit_cost_std       NUMERIC(14,4),
    unit_cost_fifo      NUMERIC(14,4),
    unit_cost_lifo      NUMERIC(14,4),
    unit_cost_last      NUMERIC(14,4),
    inventory_value     NUMERIC(14,2),
    abc_classification  abc_class_enum,
    cycle_count_class   VARCHAR(10),
    reference_type      VARCHAR(50),   -- PO, JO, SO, TRANSFER
    reference_id        VARCHAR(50),
    performed_by        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE inventory_transactions IS 'Inventory transactions with lot/serial tracking. Maps erp_inventory variables. / Giao dich ton kho voi theo doi lo/serial.';

CREATE TABLE inv_txn_2026_h1 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE inv_txn_2026_h2 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
CREATE TABLE inv_txn_2027_h1 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2027-01-01') TO ('2027-07-01');
CREATE TABLE inv_txn_default PARTITION OF inventory_transactions DEFAULT;

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS inv_txn_2026_h1, inv_txn_2026_h2, inv_txn_2027_h1, inv_txn_default CASCADE;
-- DROP TABLE IF EXISTS inventory_transactions CASCADE;
-- DROP TABLE IF EXISTS serial_master CASCADE;
-- DROP TABLE IF EXISTS lot_master CASCADE;
-- DROP TABLE IF EXISTS inventory_locations CASCADE;
-- DROP TABLE IF EXISTS warehouses CASCADE;
