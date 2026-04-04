-- Migration: 007_customers_sales.sql
-- Description: Customer and sales tables - customers, sales_orders, sales_order_lines
-- Dependencies: 006_erp_master_data.sql
-- Rollback: DROP TABLE sales_order_lines, sales_orders, customers CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- customers / Khach hang (33 vars from erp_customer_master)
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id         VARCHAR(50)     PRIMARY KEY,
    customer_name       VARCHAR(200)    NOT NULL,
    customer_name_vi    VARCHAR(200),
    customer_type       customer_type_enum,
    customer_status     VARCHAR(30)     NOT NULL DEFAULT 'active',
    customer_since_date DATE,
    primary_contact     VARCHAR(150),
    contact_email       VARCHAR(255),
    contact_phone       VARCHAR(50),
    billing_address_id  VARCHAR(50),
    shipping_address_id VARCHAR(50),
    credit_limit        NUMERIC(14,2),
    credit_terms        VARCHAR(100),
    payment_terms       VARCHAR(50),
    currency_default    VARCHAR(3)      DEFAULT 'USD',
    tax_exempt          BOOLEAN         NOT NULL DEFAULT FALSE,
    tax_exempt_cert     VARCHAR(100),
    industry_code       industry_code_enum,
    quality_requirements TEXT,
    customer_spec_list  TEXT,
    approved_process_list TEXT,
    packing_requirements TEXT,
    labeling_requirements TEXT,
    shipping_instructions TEXT,
    required_certifications TEXT,
    source_inspection_flag BOOLEAN      NOT NULL DEFAULT FALSE,
    fai_required_flag   BOOLEAN         NOT NULL DEFAULT FALSE,
    customer_portal_url TEXT,
    edi_capable         BOOLEAN         NOT NULL DEFAULT FALSE,
    customer_rating     VARCHAR(20),
    territory_code      VARCHAR(20),
    sales_rep_id        VARCHAR(50),
    account_manager     VARCHAR(150),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers IS 'ERP Customer Master. Maps 33 erp_customer_master variables. / Du lieu chinh khach hang ERP.';

-- ---------------------------------------------------------------------------
-- sales_orders / Don hang ban (40 vars from erp_sales_order)
-- ---------------------------------------------------------------------------
CREATE TABLE sales_orders (
    sales_order_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_number  VARCHAR(50)     NOT NULL UNIQUE,
    so_status           so_status_enum  NOT NULL DEFAULT 'open',
    customer_id         VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    customer_po_number  VARCHAR(100),
    customer_po_line    VARCHAR(50),
    ship_to_address_id  VARCHAR(50),
    bill_to_address_id  VARCHAR(50),
    order_date          DATE            NOT NULL,
    requested_date      DATE,
    promise_date        DATE,
    scheduled_ship_date DATE,
    actual_ship_date    DATE,
    currency_code       VARCHAR(3)      DEFAULT 'USD',
    exchange_rate       NUMERIC(10,6)   DEFAULT 1.0,
    freight_terms       VARCHAR(50),
    shipping_method     VARCHAR(100),
    priority_code       so_priority_enum DEFAULT 'standard',
    credit_status       VARCHAR(30),
    sales_rep_id        VARCHAR(50),
    territory_code      VARCHAR(20),
    project_id          VARCHAR(50),
    contract_id         VARCHAR(50),
    blanket_order_ref   VARCHAR(50),
    release_number      VARCHAR(20),
    customer_revision   VARCHAR(50),
    customer_spec_requirements TEXT,
    export_license_required BOOLEAN     NOT NULL DEFAULT FALSE,
    end_use_certificate BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE sales_orders IS 'ERP Sales Orders. Maps erp_sales_order variables. / Don hang ban ERP.';

-- ---------------------------------------------------------------------------
-- sales_order_lines / Dong don hang ban
-- ---------------------------------------------------------------------------
CREATE TABLE sales_order_lines (
    so_line_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id  UUID            NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    line_number     INT             NOT NULL,
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty       NUMERIC(12,2)   NOT NULL,
    shipped_qty     NUMERIC(12,2)   DEFAULT 0,
    remaining_qty   NUMERIC(12,2),
    unit_price      NUMERIC(14,4)   NOT NULL,
    extended_price  NUMERIC(14,2),
    discount_pct    NUMERIC(5,2)    DEFAULT 0,
    tax_code        VARCHAR(20),
    tax_amount      NUMERIC(12,2)   DEFAULT 0,
    commission_pct  NUMERIC(5,2)    DEFAULT 0,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (sales_order_id, line_number)
);
COMMENT ON TABLE sales_order_lines IS 'Sales order line items. / Dong chi tiet don hang ban.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS sales_order_lines CASCADE;
-- DROP TABLE IF EXISTS sales_orders CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
