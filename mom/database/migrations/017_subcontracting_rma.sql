-- Migration: 017_subcontracting_rma.sql
-- Description: Subcontracting and RMA tables - subcontract_orders, subcontract_receipts, rma_orders
-- Dependencies: 008_vendors_purchasing.sql, 006_erp_master_data.sql, 007_customers_sales.sql
-- Rollback: DROP TABLE rma_orders, subcontract_receipts, subcontract_orders CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- subcontract_orders / Don gia cong ngoai (18 vars from erp_subcontracting)
-- ---------------------------------------------------------------------------
CREATE TABLE subcontract_orders (
    subcontract_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcontract_po_number VARCHAR(50)   NOT NULL UNIQUE,
    subcontract_type    subcontract_type_enum NOT NULL,
    subcontract_process subcontract_process_enum NOT NULL,
    subcontract_spec    TEXT,
    vendor_id           VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    job_number          VARCHAR(50),
    ship_out_date       DATE,
    ship_out_qty        NUMERIC(12,2),
    expected_return_date DATE,
    actual_return_date  DATE,
    return_qty_good     NUMERIC(12,2),
    return_qty_reject   NUMERIC(12,2),
    unit_cost           NUMERIC(14,4),
    nadcap_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    nadcap_accreditation VARCHAR(100),
    coc_received        BOOLEAN         NOT NULL DEFAULT FALSE,
    test_report_received BOOLEAN        NOT NULL DEFAULT FALSE,
    turnaround_days_target INT,
    turnaround_days_actual INT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE subcontract_orders IS 'Subcontracting orders. Maps 18 erp_subcontracting variables. / Don gia cong ngoai.';

-- ---------------------------------------------------------------------------
-- subcontract_receipts / Nhan hang gia cong ngoai
-- ---------------------------------------------------------------------------
CREATE TABLE subcontract_receipts (
    receipt_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcontract_id  UUID            NOT NULL REFERENCES subcontract_orders(subcontract_id),
    received_date   DATE            NOT NULL,
    qty_received    NUMERIC(12,2)   NOT NULL,
    qty_accepted    NUMERIC(12,2),
    qty_rejected    NUMERIC(12,2),
    coc_received    BOOLEAN         DEFAULT FALSE,
    inspection_result VARCHAR(20),
    ncr_reference   VARCHAR(50),
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE subcontract_receipts IS 'Subcontract return tracking with quality results. / Theo doi nhan hang gia cong voi ket qua chat luong.';

-- ---------------------------------------------------------------------------
-- rma_orders / Lenh RMA (17 vars from erp_warranty_rma)
-- ---------------------------------------------------------------------------
CREATE TABLE rma_orders (
    rma_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rma_number          VARCHAR(50)     NOT NULL UNIQUE,
    rma_status          rma_status_enum NOT NULL DEFAULT 'requested',
    rma_type            rma_type_enum   NOT NULL DEFAULT 'non_warranty',
    customer_id         VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    original_so_number  VARCHAR(50),
    return_date         DATE,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    serial_number       VARCHAR(100),
    qty_returned        NUMERIC(12,2),
    failure_description TEXT,
    disposition         rma_disposition_enum,
    warranty_start_date DATE,
    warranty_end_date   DATE,
    repair_cost         NUMERIC(12,2),
    credit_amount       NUMERIC(12,2),
    linked_ncr_number   VARCHAR(50),
    linked_capa_number  VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE rma_orders IS 'RMA/Warranty records. Maps 17 erp_warranty_rma variables. / Ho so RMA/Bao hanh.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS rma_orders CASCADE;
-- DROP TABLE IF EXISTS subcontract_receipts CASCADE;
-- DROP TABLE IF EXISTS subcontract_orders CASCADE;
