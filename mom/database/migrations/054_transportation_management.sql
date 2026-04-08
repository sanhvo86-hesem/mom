-- ============================================================================
-- Migration: 054_transportation_management.sql
-- Description: Transportation management, freight audit, and export execution.
-- Dependencies: 016_shipping_compliance.sql, 007_customers_sales.sql
-- Rollback: DROP TABLE tms_delivery_events, tms_freight_audits,
--           tms_dangerous_goods, tms_export_screenings,
--           tms_customs_documents, tms_freight_quotes,
--           tms_shipment_lines, tms_shipments, tms_routes,
--           tms_carriers CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tms_carriers (
    tms_carrier_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_code                 VARCHAR(50)     NOT NULL UNIQUE,
    carrier_name                 VARCHAR(200)    NOT NULL,
    transport_mode               VARCHAR(20)     NOT NULL
                                 CHECK (transport_mode IN ('air', 'sea', 'road', 'courier', 'multimodal')),
    service_levels               JSONB           DEFAULT '[]'::jsonb,
    contact_name                 VARCHAR(200),
    phone                        VARCHAR(50),
    email                        VARCHAR(200),
    carrier_status               VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (carrier_status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tms_routes (
    tms_route_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_code                   VARCHAR(80)     NOT NULL UNIQUE,
    origin_country               CHAR(2),
    destination_country          CHAR(2),
    origin_port                  VARCHAR(100),
    destination_port             VARCHAR(100),
    default_tms_carrier_id       UUID            REFERENCES tms_carriers(tms_carrier_id),
    transit_days                 NUMERIC(10,2),
    incoterm_code                VARCHAR(20),
    route_status                 VARCHAR(20)     NOT NULL DEFAULT 'active'
                                 CHECK (route_status IN ('active', 'inactive')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tms_shipments (
    tms_shipment_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_number              VARCHAR(80)     NOT NULL UNIQUE,
    sales_order_id               UUID            REFERENCES sales_orders(sales_order_id),
    shipment_id                  UUID            REFERENCES shipments(shipment_id),
    tms_carrier_id               UUID            REFERENCES tms_carriers(tms_carrier_id),
    tms_route_id                 UUID            REFERENCES tms_routes(tms_route_id),
    ship_date                    DATE,
    delivery_due_date            DATE,
    freight_terms                VARCHAR(30),
    export_license_id            UUID            REFERENCES export_licenses(license_id),
    shipment_status              VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (shipment_status IN ('planned', 'booked', 'in_transit', 'delivered', 'cancelled')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_status ON tms_shipments (shipment_status);

CREATE TABLE IF NOT EXISTS tms_shipment_lines (
    tms_shipment_line_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    shipment_package_id          UUID            REFERENCES shipment_packages(package_id),
    quantity                     NUMERIC(14,2)   DEFAULT 0,
    gross_weight_kg              NUMERIC(12,2),
    net_weight_kg                NUMERIC(12,2),
    dangerous_goods_flag         BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (tms_shipment_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_tms_shipment_lines_item ON tms_shipment_lines (item_id);

CREATE TABLE IF NOT EXISTS tms_freight_quotes (
    tms_freight_quote_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            REFERENCES tms_shipments(tms_shipment_id),
    tms_carrier_id               UUID            REFERENCES tms_carriers(tms_carrier_id),
    quote_number                 VARCHAR(80)     NOT NULL UNIQUE,
    quoted_amount                NUMERIC(14,2)   NOT NULL,
    currency_code                VARCHAR(10)     DEFAULT 'USD',
    valid_until                  DATE,
    selected_flag                BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_freight_quote_selected ON tms_freight_quotes (selected_flag);

CREATE TABLE IF NOT EXISTS tms_customs_documents (
    tms_customs_document_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    document_type                VARCHAR(30)     NOT NULL
                                 CHECK (document_type IN ('commercial_invoice', 'packing_list', 'coo', 'export_declaration', 'air_waybill')),
    document_reference           VARCHAR(80)     NOT NULL,
    issue_date                   DATE,
    file_attachment_id           UUID            REFERENCES file_attachments(file_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_customs_doc_type ON tms_customs_documents (document_type);

CREATE TABLE IF NOT EXISTS tms_export_screenings (
    tms_export_screening_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    screening_scope              VARCHAR(30)     NOT NULL
                                 CHECK (screening_scope IN ('party', 'end_use', 'destination', 'license')),
    screening_result             VARCHAR(20)     NOT NULL
                                 CHECK (screening_result IN ('clear', 'hold', 'blocked')),
    screened_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    screened_by                  UUID            REFERENCES users(user_id),
    hit_reference                VARCHAR(100),
    notes                        TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_export_screen_result ON tms_export_screenings (screening_result);

CREATE TABLE IF NOT EXISTS tms_dangerous_goods (
    tms_dangerous_good_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    un_number                    VARCHAR(20),
    hazard_class                 VARCHAR(20),
    packing_group                VARCHAR(20),
    special_handling_instructions TEXT,
    emergency_contact            VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_dg_item ON tms_dangerous_goods (item_id);

CREATE TABLE IF NOT EXISTS tms_freight_audits (
    tms_freight_audit_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    audit_date                   DATE            NOT NULL,
    quoted_amount                NUMERIC(14,2),
    invoiced_amount              NUMERIC(14,2),
    variance_amount              NUMERIC(14,2),
    audit_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (audit_status IN ('open', 'approved', 'disputed', 'closed')),
    auditor_id                   UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_audit_status ON tms_freight_audits (audit_status);

CREATE TABLE IF NOT EXISTS tms_delivery_events (
    tms_delivery_event_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tms_shipment_id              UUID            NOT NULL REFERENCES tms_shipments(tms_shipment_id) ON DELETE CASCADE,
    event_code                   VARCHAR(50)     NOT NULL,
    event_description            VARCHAR(300),
    event_timestamp              TIMESTAMPTZ     NOT NULL,
    event_location               VARCHAR(200),
    exception_flag               BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_delivery_event_time ON tms_delivery_events (event_timestamp DESC);

COMMIT;
