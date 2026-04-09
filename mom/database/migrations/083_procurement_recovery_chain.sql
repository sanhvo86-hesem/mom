-- ============================================================================
-- Migration: 083_procurement_recovery_chain.sql
-- Description: First-class procurement recovery objects for requisition, ASN,
--              receiving, AP matching, and governed receipt correction.
-- Dependencies: 008_vendors_purchasing.sql, 009_inventory.sql, 010_production.sql,
--               070_enterprise_governance_uplift.sql
-- Rollback: DROP TABLE ap_invoice_lines, ap_invoices, purchase_receipt_correction_lines,
--           purchase_receipt_corrections, purchase_receipt_lines, purchase_receipts,
--           supplier_asn_lines, supplier_asns, purchase_requisition_lines,
--           purchase_requisitions CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS purchase_requisitions (
    purchase_requisition_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_number           VARCHAR(50)     NOT NULL UNIQUE,
    requisition_status           VARCHAR(30)     NOT NULL DEFAULT 'draft'
                                 CHECK (requisition_status IN ('draft', 'submitted', 'approved', 'sourced', 'cancelled')),
    request_type                 VARCHAR(30)     NOT NULL DEFAULT 'material'
                                 CHECK (request_type IN ('material', 'tooling', 'service', 'subcontract', 'expedite')),
    request_date                 DATE            NOT NULL DEFAULT CURRENT_DATE,
    need_by_date                 DATE,
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    job_order_id                 UUID            REFERENCES job_orders(job_order_id),
    requested_by                 UUID            REFERENCES users(user_id),
    approved_by                  UUID            REFERENCES users(user_id),
    sourcing_owner_id            UUID            REFERENCES users(user_id),
    reason_code                  VARCHAR(50),
    requester_notes              TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions (requisition_status);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_vendor ON purchase_requisitions (vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_job ON purchase_requisitions (job_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_scope ON purchase_requisitions (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_lineage ON purchase_requisitions (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_purchase_requisitions_row_version ON purchase_requisitions;
CREATE TRIGGER trg_purchase_requisitions_row_version BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
    purchase_requisition_line_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_requisition_id      UUID            NOT NULL REFERENCES purchase_requisitions(purchase_requisition_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    requested_qty                NUMERIC(14,2)   NOT NULL,
    approved_qty                 NUMERIC(14,2),
    uom                          VARCHAR(20)     NOT NULL DEFAULT 'EA',
    required_on                  DATE,
    preferred_supplier_id        VARCHAR(50)     REFERENCES vendors(vendor_id),
    required_operation_seq       INT,
    line_notes                   TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (purchase_requisition_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_lines_item ON purchase_requisition_lines (item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_lines_supplier ON purchase_requisition_lines (preferred_supplier_id);
DROP TRIGGER IF EXISTS trg_purchase_requisition_lines_row_version ON purchase_requisition_lines;
CREATE TRIGGER trg_purchase_requisition_lines_row_version BEFORE UPDATE ON purchase_requisition_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS supplier_asns (
    supplier_asn_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    asn_number                   VARCHAR(50)     NOT NULL UNIQUE,
    asn_status                   VARCHAR(30)     NOT NULL DEFAULT 'planned'
                                 CHECK (asn_status IN ('planned', 'confirmed', 'receiving', 'received', 'discrepant', 'closed', 'cancelled')),
    po_id                        UUID            NOT NULL REFERENCES purchase_orders(po_id),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    ship_date                    DATE,
    expected_arrival_date        DATE,
    received_date                DATE,
    carrier_name                 VARCHAR(120),
    bill_of_lading_number        VARCHAR(120),
    tracking_number              VARCHAR(120),
    discrepancy_summary          TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_supplier_asns_status ON supplier_asns (asn_status);
CREATE INDEX IF NOT EXISTS idx_supplier_asns_po ON supplier_asns (po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asns_vendor ON supplier_asns (vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asns_scope ON supplier_asns (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asns_lineage ON supplier_asns (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supplier_asns_row_version ON supplier_asns;
CREATE TRIGGER trg_supplier_asns_row_version BEFORE UPDATE ON supplier_asns FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS supplier_asn_lines (
    supplier_asn_line_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_asn_id              UUID            NOT NULL REFERENCES supplier_asns(supplier_asn_id) ON DELETE CASCADE,
    po_line_id                   UUID            REFERENCES purchase_order_lines(po_line_id),
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    expected_qty                 NUMERIC(14,2)   NOT NULL,
    received_qty                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    discrepant_qty               NUMERIC(14,2)   NOT NULL DEFAULT 0,
    vendor_lot_number            VARCHAR(100),
    serial_numbers               JSONB           DEFAULT '[]'::jsonb,
    disposition_notes            TEXT,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (supplier_asn_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_supplier_asn_lines_item ON supplier_asn_lines (item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asn_lines_po_line ON supplier_asn_lines (po_line_id);
DROP TRIGGER IF EXISTS trg_supplier_asn_lines_row_version ON supplier_asn_lines;
CREATE TRIGGER trg_supplier_asn_lines_row_version BEFORE UPDATE ON supplier_asn_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS purchase_receipts (
    purchase_receipt_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number               VARCHAR(50)     NOT NULL UNIQUE,
    receipt_status               VARCHAR(30)     NOT NULL DEFAULT 'received'
                                 CHECK (receipt_status IN ('received', 'under_iqc', 'accepted', 'quarantined', 'putaway', 'closed', 'reversed')),
    po_id                        UUID            NOT NULL REFERENCES purchase_orders(po_id),
    supplier_asn_id              UUID            REFERENCES supplier_asns(supplier_asn_id),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    warehouse_id                 VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    receipt_date                 TIMESTAMPTZ     NOT NULL DEFAULT now(),
    received_by                  UUID            REFERENCES users(user_id),
    iqc_required                 BOOLEAN         NOT NULL DEFAULT TRUE,
    iqc_hold_reason              VARCHAR(200),
    reversal_reason_code         VARCHAR(50),
    reversed_at                  TIMESTAMPTZ,
    reversed_by                  UUID            REFERENCES users(user_id),
    related_invoice_ref          VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_status ON purchase_receipts (receipt_status);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po ON purchase_receipts (po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_asn ON purchase_receipts (supplier_asn_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_vendor ON purchase_receipts (vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_scope ON purchase_receipts (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_lineage ON purchase_receipts (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_purchase_receipts_row_version ON purchase_receipts;
CREATE TRIGGER trg_purchase_receipts_row_version BEFORE UPDATE ON purchase_receipts FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS purchase_receipt_lines (
    purchase_receipt_line_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_receipt_id          UUID            NOT NULL REFERENCES purchase_receipts(purchase_receipt_id) ON DELETE CASCADE,
    po_line_id                   UUID            REFERENCES purchase_order_lines(po_line_id),
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    location_id                  VARCHAR(50)     REFERENCES inventory_locations(location_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_numbers               JSONB           DEFAULT '[]'::jsonb,
    qty_received                 NUMERIC(14,2)   NOT NULL,
    qty_accepted                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_rejected                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    qty_putaway                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    hold_status                  VARCHAR(30)     NOT NULL DEFAULT 'open'
                                 CHECK (hold_status IN ('open', 'released', 'quarantined', 'returned')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (purchase_receipt_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_item ON purchase_receipt_lines (item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_po_line ON purchase_receipt_lines (po_line_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_hold ON purchase_receipt_lines (hold_status);
DROP TRIGGER IF EXISTS trg_purchase_receipt_lines_row_version ON purchase_receipt_lines;
CREATE TRIGGER trg_purchase_receipt_lines_row_version BEFORE UPDATE ON purchase_receipt_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS ap_invoices (
    ap_invoice_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number               VARCHAR(50)     NOT NULL UNIQUE,
    invoice_status               VARCHAR(30)     NOT NULL DEFAULT 'draft'
                                 CHECK (invoice_status IN ('draft', 'matched', 'on_hold', 'posted', 'partially_paid', 'paid', 'voided', 'closed')),
    vendor_id                    VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    po_id                        UUID            REFERENCES purchase_orders(po_id),
    purchase_receipt_id          UUID            REFERENCES purchase_receipts(purchase_receipt_id),
    invoice_date                 DATE            NOT NULL,
    posting_date                 DATE,
    due_date                     DATE,
    currency_code                VARCHAR(10)     NOT NULL DEFAULT 'USD',
    invoice_amount               NUMERIC(14,2)   NOT NULL DEFAULT 0,
    matched_amount               NUMERIC(14,2)   NOT NULL DEFAULT 0,
    hold_reason                  VARCHAR(200),
    period_close_code            VARCHAR(20),
    dispute_status               VARCHAR(20)     NOT NULL DEFAULT 'none'
                                 CHECK (dispute_status IN ('none', 'open', 'resolved')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    org_company_code             VARCHAR(30)     REFERENCES org_companies(company_code),
    org_legal_entity_code        VARCHAR(30)     REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                 VARCHAR(30)     REFERENCES org_plants(plant_id),
    org_site_id                  VARCHAR(30)     REFERENCES mes_sites(site_id),
    source_system                VARCHAR(40)     NOT NULL DEFAULT 'QMS',
    source_record_id             VARCHAR(120),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    payload_schema_version       VARCHAR(30)     NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_status ON ap_invoices (invoice_status);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_vendor ON ap_invoices (vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_receipt ON ap_invoices (purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_scope ON ap_invoices (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_lineage ON ap_invoices (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_ap_invoices_row_version ON ap_invoices;
CREATE TRIGGER trg_ap_invoices_row_version BEFORE UPDATE ON ap_invoices FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS ap_invoice_lines (
    ap_invoice_line_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    ap_invoice_id                UUID            NOT NULL REFERENCES ap_invoices(ap_invoice_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    purchase_receipt_line_id     UUID            REFERENCES purchase_receipt_lines(purchase_receipt_line_id),
    qty_invoiced                 NUMERIC(14,2)   NOT NULL DEFAULT 0,
    unit_price                   NUMERIC(14,4)   NOT NULL DEFAULT 0,
    line_amount                  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    three_way_match_status       VARCHAR(30)     NOT NULL DEFAULT 'pending'
                                 CHECK (three_way_match_status IN ('pending', 'matched', 'variance', 'blocked')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    row_version                  BIGINT          NOT NULL DEFAULT 1,
    UNIQUE (ap_invoice_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_ap_invoice_lines_item ON ap_invoice_lines (item_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoice_lines_receipt_line ON ap_invoice_lines (purchase_receipt_line_id);
DROP TRIGGER IF EXISTS trg_ap_invoice_lines_row_version ON ap_invoice_lines;
CREATE TRIGGER trg_ap_invoice_lines_row_version BEFORE UPDATE ON ap_invoice_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS purchase_receipt_corrections (
    purchase_receipt_correction_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    correction_number              VARCHAR(50)   NOT NULL UNIQUE,
    correction_status              VARCHAR(30)   NOT NULL DEFAULT 'draft'
                                   CHECK (correction_status IN ('draft', 'submitted', 'approved', 'posted', 'voided')),
    purchase_receipt_id            UUID          NOT NULL REFERENCES purchase_receipts(purchase_receipt_id),
    ap_invoice_id                  UUID          REFERENCES ap_invoices(ap_invoice_id),
    correction_type                VARCHAR(30)   NOT NULL
                                   CHECK (correction_type IN ('quantity', 'price', 'damage', 'return_to_supplier', 'invoice_mismatch', 'putaway_reversal')),
    correction_reason              TEXT          NOT NULL,
    supplier_notification_status   VARCHAR(30)   NOT NULL DEFAULT 'pending'
                                   CHECK (supplier_notification_status IN ('pending', 'sent', 'acknowledged')),
    financial_hold_required        BOOLEAN       NOT NULL DEFAULT FALSE,
    requested_by                   UUID          REFERENCES users(user_id),
    approved_by                    UUID          REFERENCES users(user_id),
    posted_by                      UUID          REFERENCES users(user_id),
    reconciled_at                  TIMESTAMPTZ,
    metadata                       JSONB         DEFAULT '{}'::jsonb,
    created_at                     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    org_company_code               VARCHAR(30)   REFERENCES org_companies(company_code),
    org_legal_entity_code          VARCHAR(30)   REFERENCES org_legal_entities(legal_entity_code),
    org_plant_id                   VARCHAR(30)   REFERENCES org_plants(plant_id),
    org_site_id                    VARCHAR(30)   REFERENCES mes_sites(site_id),
    source_system                  VARCHAR(40)   NOT NULL DEFAULT 'QMS',
    source_record_id               VARCHAR(120),
    row_version                    BIGINT        NOT NULL DEFAULT 1,
    payload_schema_version         VARCHAR(30)   NOT NULL DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_corrections_status ON purchase_receipt_corrections (correction_status);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_corrections_receipt ON purchase_receipt_corrections (purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_corrections_invoice ON purchase_receipt_corrections (ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_corrections_scope ON purchase_receipt_corrections (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_corrections_lineage ON purchase_receipt_corrections (source_system, source_record_id) WHERE source_record_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_purchase_receipt_corrections_row_version ON purchase_receipt_corrections;
CREATE TRIGGER trg_purchase_receipt_corrections_row_version BEFORE UPDATE ON purchase_receipt_corrections FOR EACH ROW EXECUTE FUNCTION set_row_version();

CREATE TABLE IF NOT EXISTS purchase_receipt_correction_lines (
    purchase_receipt_correction_line_id UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_receipt_correction_id      UUID     NOT NULL REFERENCES purchase_receipt_corrections(purchase_receipt_correction_id) ON DELETE CASCADE,
    purchase_receipt_line_id            UUID     REFERENCES purchase_receipt_lines(purchase_receipt_line_id),
    line_number                         INT      NOT NULL,
    item_id                             VARCHAR(50) REFERENCES items(item_id),
    qty_delta                           NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_cost_delta                     NUMERIC(14,4) NOT NULL DEFAULT 0,
    inventory_action                    VARCHAR(30)   NOT NULL DEFAULT 'none'
                                        CHECK (inventory_action IN ('none', 'reverse_transaction', 'quarantine', 'return_to_supplier', 'reclassify')),
    disposition_status                  VARCHAR(30)   NOT NULL DEFAULT 'pending'
                                        CHECK (disposition_status IN ('pending', 'completed', 'waived')),
    metadata                            JSONB         DEFAULT '{}'::jsonb,
    created_at                          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at                          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    row_version                         BIGINT        NOT NULL DEFAULT 1,
    UNIQUE (purchase_receipt_correction_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_correction_lines_item ON purchase_receipt_correction_lines (item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_correction_lines_receipt_line ON purchase_receipt_correction_lines (purchase_receipt_line_id);
DROP TRIGGER IF EXISTS trg_purchase_receipt_correction_lines_row_version ON purchase_receipt_correction_lines;
CREATE TRIGGER trg_purchase_receipt_correction_lines_row_version BEFORE UPDATE ON purchase_receipt_correction_lines FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMIT;
