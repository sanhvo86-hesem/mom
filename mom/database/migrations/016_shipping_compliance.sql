-- Migration: 016_shipping_compliance.sql
-- Description: Shipping and compliance tables - shipments, shipment_packages, compliance_records, export_licenses
-- Dependencies: 007_customers_sales.sql, 009_inventory.sql, 006_erp_master_data.sql
-- Rollback: DROP TABLE export_licenses, compliance_records, shipment_packages, shipments CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- shipments / Van chuyen (26 vars from erp_shipping_logistics)
-- ---------------------------------------------------------------------------
CREATE TABLE shipments (
    shipment_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_code       VARCHAR(50)     NOT NULL UNIQUE,
    shipment_status     shipment_status_enum NOT NULL DEFAULT 'planned',
    ship_date           DATE,
    delivery_date_est   DATE,
    delivery_date_actual DATE,
    carrier_id          VARCHAR(50),
    carrier_name        VARCHAR(150),
    carrier_service     VARCHAR(100),
    tracking_number     VARCHAR(200),
    waybill_number      VARCHAR(100),
    freight_charge      NUMERIC(12,2),
    freight_terms       freight_terms_enum,
    incoterms           VARCHAR(20),
    ship_from_warehouse VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    ship_to_address     TEXT,
    packing_list_number VARCHAR(100),
    coc_number          VARCHAR(100),
    num_packages        INT,
    total_weight        NUMERIC(10,2),
    total_volume        NUMERIC(10,2),
    hazmat_flag         BOOLEAN         NOT NULL DEFAULT FALSE,
    customs_declaration_number VARCHAR(100),
    export_license_number VARCHAR(100),
    itar_license        BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_destination VARCHAR(5),
    commercial_invoice_number VARCHAR(100),
    certificate_of_origin VARCHAR(100),
    special_packaging_req TEXT,
    -- Linked entities
    sales_order_id      UUID            REFERENCES sales_orders(sales_order_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shipments IS 'Shipment records. Maps erp_shipping_logistics + shipment variables. / Ho so van chuyen.';

-- ---------------------------------------------------------------------------
-- shipment_packages / Kien hang
-- ---------------------------------------------------------------------------
CREATE TABLE shipment_packages (
    package_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID            NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    package_number  INT             NOT NULL,
    sscc_barcode    VARCHAR(50),
    weight          NUMERIC(10,2),
    dimensions      VARCHAR(100),
    contents_desc   TEXT,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (shipment_id, package_number)
);
COMMENT ON TABLE shipment_packages IS 'Package-level detail for shipments. / Chi tiet kien hang.';

-- ---------------------------------------------------------------------------
-- compliance_records / Ho so tuan thu (15 vars from erp_compliance_regulatory)
-- ---------------------------------------------------------------------------
CREATE TABLE compliance_records (
    compliance_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_code     VARCHAR(50)     NOT NULL,
    regulation_name     VARCHAR(200)    NOT NULL,
    compliance_status   compliance_status_enum NOT NULL DEFAULT 'pending_review',
    jurisdiction        jurisdiction_enum,
    export_classification export_class_enum,
    eccn_number         VARCHAR(20),
    license_type        license_type_enum,
    license_number      VARCHAR(100),
    license_expiry      DATE,
    restricted_party_screen_date DATE,
    restricted_party_screen_result VARCHAR(50),
    dfars_compliant     BOOLEAN,
    buy_american_compliant BOOLEAN,
    specialty_metals_compliant BOOLEAN,
    prop65_warning_required BOOLEAN,
    -- Linked entity
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE compliance_records IS 'Regulatory compliance (ITAR/EAR/RoHS/DFARS). Maps erp_compliance_regulatory variables. / Tuan thu quy dinh.';

-- ---------------------------------------------------------------------------
-- export_licenses / Giay phep xuat khau
-- ---------------------------------------------------------------------------
CREATE TABLE export_licenses (
    license_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_number  VARCHAR(100)    NOT NULL UNIQUE,
    license_type    license_type_enum NOT NULL,
    classification  export_class_enum,
    item_id         VARCHAR(50)     REFERENCES items(item_id),
    customer_id     VARCHAR(50)     REFERENCES customers(customer_id),
    country         VARCHAR(5),
    issue_date      DATE,
    expiry_date     DATE,
    status          VARCHAR(30)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE export_licenses IS 'Export license tracking. / Theo doi giay phep xuat khau.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS export_licenses CASCADE;
-- DROP TABLE IF EXISTS compliance_records CASCADE;
-- DROP TABLE IF EXISTS shipment_packages CASCADE;
-- DROP TABLE IF EXISTS shipments CASCADE;
