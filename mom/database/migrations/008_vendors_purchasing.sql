-- Migration: 008_vendors_purchasing.sql
-- Description: Vendor and purchasing tables - vendors, purchase_orders, purchase_order_lines, vendor_ratings
-- Dependencies: 006_erp_master_data.sql
-- Rollback: DROP TABLE purchase_order_lines, purchase_orders, vendor_ratings, vendors CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- vendors / Nha cung cap (37 vars from erp_vendor_master)
-- ---------------------------------------------------------------------------
CREATE TABLE vendors (
    vendor_id               VARCHAR(50)     PRIMARY KEY,
    vendor_name             VARCHAR(200)    NOT NULL,
    vendor_name_vi          VARCHAR(200),
    vendor_type             vendor_type_enum,
    vendor_status           vendor_status_enum NOT NULL DEFAULT 'pending',
    vendor_rating_score     NUMERIC(5,2),
    vendor_rating_grade     vendor_rating_grade,
    primary_contact         VARCHAR(150),
    contact_email           VARCHAR(255),
    contact_phone           VARCHAR(50),
    address_line1           VARCHAR(300),
    address_line2           VARCHAR(300),
    city                    VARCHAR(100),
    state_province          VARCHAR(100),
    postal_code             VARCHAR(20),
    country                 VARCHAR(5),
    payment_terms_default   VARCHAR(50),
    currency_default        VARCHAR(3)      DEFAULT 'USD',
    tax_id                  VARCHAR(50),
    duns_number             VARCHAR(20),
    cage_code               VARCHAR(10),
    approved_process_list   TEXT,
    certification_list      TEXT,
    certification_expiry    DATE,
    last_audit_date         DATE,
    next_audit_due          DATE,
    approved_part_list      TEXT,
    lead_time_avg_days      INT,
    on_time_delivery_pct    NUMERIC(5,2),
    quality_rejection_pct   NUMERIC(5,2),
    corrective_action_count INT             DEFAULT 0,
    scar_open_count         INT             DEFAULT 0,
    risk_level              risk_level_enum DEFAULT 'Low',
    single_source_flag      BOOLEAN         NOT NULL DEFAULT FALSE,
    minority_owned          BOOLEAN         NOT NULL DEFAULT FALSE,
    small_business          BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_manufacture  VARCHAR(5),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE vendors IS 'ERP Vendor Master. Maps 37 erp_vendor_master variables. / Du lieu chinh nha cung cap ERP.';

-- ---------------------------------------------------------------------------
-- vendor_ratings / Lich su danh gia nha cung cap
-- ---------------------------------------------------------------------------
CREATE TABLE vendor_ratings (
    rating_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id       VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    rating_score    NUMERIC(5,2)    NOT NULL,
    rating_grade    vendor_rating_grade,
    otd_pct         NUMERIC(5,2),
    quality_pct     NUMERIC(5,2),
    scar_count      INT             DEFAULT 0,
    notes           TEXT,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE vendor_ratings IS 'Historical vendor rating snapshots. / Lich su danh gia nha cung cap.';

-- ---------------------------------------------------------------------------
-- purchase_orders / Don dat hang mua (39 vars from erp_purchase_order)
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    po_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number           VARCHAR(50)     NOT NULL UNIQUE,
    po_status           po_status_enum  NOT NULL DEFAULT 'draft',
    vendor_id           VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    vendor_contact      VARCHAR(150),
    po_type             po_type_enum    NOT NULL DEFAULT 'standard',
    po_date             DATE            NOT NULL,
    need_by_date        DATE,
    promise_date        DATE,
    currency_code       VARCHAR(3)      DEFAULT 'USD',
    payment_terms       VARCHAR(50),
    incoterms           VARCHAR(20),
    fob_point           VARCHAR(50),
    ship_via            VARCHAR(100),
    buyer_id            VARCHAR(50),
    approved_by         UUID            REFERENCES users(user_id),
    approval_date       DATE,
    requisition_id      VARCHAR(50),
    rfq_id              VARCHAR(50),
    vendor_quote_ref    VARCHAR(100),
    blanket_po_ref      VARCHAR(50),
    release_number      VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE purchase_orders IS 'ERP Purchase Orders. Maps erp_purchase_order variables. / Don dat hang mua ERP.';

-- ---------------------------------------------------------------------------
-- purchase_order_lines / Dong don dat hang mua
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_order_lines (
    po_line_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id               UUID            NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    line_number         INT             NOT NULL,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    received_qty        NUMERIC(12,2)   DEFAULT 0,
    rejected_qty        NUMERIC(12,2)   DEFAULT 0,
    remaining_qty       NUMERIC(12,2),
    unit_cost           NUMERIC(14,4)   NOT NULL,
    extended_cost       NUMERIC(14,2),
    lot_number_vendor   VARCHAR(100),
    coc_required        BOOLEAN         NOT NULL DEFAULT FALSE,
    material_cert_required BOOLEAN      NOT NULL DEFAULT FALSE,
    test_report_required BOOLEAN        NOT NULL DEFAULT FALSE,
    source_inspection_required BOOLEAN  NOT NULL DEFAULT FALSE,
    incoming_inspection_plan VARCHAR(100),
    landed_cost         NUMERIC(14,2),
    duty_pct            NUMERIC(5,2)    DEFAULT 0,
    freight_cost        NUMERIC(12,2)   DEFAULT 0,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (po_id, line_number)
);
COMMENT ON TABLE purchase_order_lines IS 'PO line items. / Dong chi tiet don dat hang mua.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS purchase_order_lines CASCADE;
-- DROP TABLE IF EXISTS purchase_orders CASCADE;
-- DROP TABLE IF EXISTS vendor_ratings CASCADE;
-- DROP TABLE IF EXISTS vendors CASCADE;
