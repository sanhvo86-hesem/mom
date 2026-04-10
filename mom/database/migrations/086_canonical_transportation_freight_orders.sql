-- ============================================================================
-- Migration: 086_canonical_transportation_freight_orders.sql
-- Description: Canonical freight-order lifecycle and stop sequencing for
--              tender-to-close transportation control.
-- Dependencies: 016_shipping_compliance.sql, 054_transportation_management.sql,
--               070_enterprise_governance_uplift.sql, 072_canonical_foundation_governance.sql
-- Rollback: DROP TABLE freight_order_stops, freight_orders CASCADE;
-- Standards: TMS tender-book-close control, gate release, transport traceability
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS freight_orders (
    freight_order_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    freight_order_number        VARCHAR(80)     NOT NULL UNIQUE,
    freight_status              VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (freight_status IN ('planned', 'tendered', 'booked', 'in_transit', 'delivered', 'closed', 'cancelled')),
    shipment_id                 UUID            NOT NULL REFERENCES shipments(shipment_id),
    tms_shipment_id             UUID            REFERENCES tms_shipments(tms_shipment_id),
    carrier_party_id            UUID            REFERENCES party(party_id),
    transport_mode              VARCHAR(20)     NOT NULL DEFAULT 'road'
                                 CHECK (transport_mode IN ('air', 'sea', 'road', 'courier', 'multimodal')),
    service_level               VARCHAR(40),
    booking_reference           VARCHAR(120),
    tracking_reference          VARCHAR(120),
    incoterm_code               VARCHAR(20),
    route_summary               TEXT,
    tender_deadline             TIMESTAMPTZ,
    tendered_at                 TIMESTAMPTZ,
    booked_at                   TIMESTAMPTZ,
    departed_at                 TIMESTAMPTZ,
    delivered_at                TIMESTAMPTZ,
    closed_at                   TIMESTAMPTZ,
    currency_code               VARCHAR(10)     NOT NULL DEFAULT 'USD',
    quoted_amount               NUMERIC(14,2),
    booked_amount               NUMERIC(14,2),
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code            VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code       VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                 VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system               VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id            VARCHAR(120),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version      VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
COMMENT ON TABLE freight_orders IS 'Canonical freight-order control object bridging customer shipments, carrier booking, and transport closure.';
CREATE INDEX IF NOT EXISTS idx_freight_orders_status ON freight_orders (freight_status);
CREATE INDEX IF NOT EXISTS idx_freight_orders_shipment ON freight_orders (shipment_id);
CREATE INDEX IF NOT EXISTS idx_freight_orders_tms_shipment ON freight_orders (tms_shipment_id);
CREATE INDEX IF NOT EXISTS idx_freight_orders_scope ON freight_orders (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_freight_orders_lineage ON freight_orders (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_freight_orders_row_version ON freight_orders;
CREATE TRIGGER trg_freight_orders_row_version BEFORE UPDATE ON freight_orders FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS freight_order_stops (
    freight_order_stop_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    freight_order_id            UUID            NOT NULL REFERENCES freight_orders(freight_order_id) ON DELETE CASCADE,
    stop_sequence               INT             NOT NULL,
    stop_kind                   VARCHAR(20)     NOT NULL
                                 CHECK (stop_kind IN ('pickup', 'linehaul', 'customs', 'handoff', 'delivery')),
    location_name               VARCHAR(200)    NOT NULL,
    country_code                CHAR(2),
    arrival_window_start        TIMESTAMPTZ,
    arrival_window_end          TIMESTAMPTZ,
    actual_arrival_at           TIMESTAMPTZ,
    actual_departure_at         TIMESTAMPTZ,
    contact_name                VARCHAR(200),
    contact_phone               VARCHAR(50),
    stop_notes                  TEXT,
    metadata                    JSONB           DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                 BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (freight_order_id, stop_sequence)
);
COMMENT ON TABLE freight_order_stops IS 'Sequenced pickup, handoff, customs, and delivery stops for a canonical freight order.';
CREATE INDEX IF NOT EXISTS idx_freight_order_stops_kind ON freight_order_stops (stop_kind);
DROP TRIGGER IF EXISTS trg_freight_order_stops_row_version ON freight_order_stops;
CREATE TRIGGER trg_freight_order_stops_row_version BEFORE UPDATE ON freight_order_stops FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
