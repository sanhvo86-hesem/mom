-- ============================================================================
-- Migration: 067_outsource_supplier_execution.sql
-- Description: Detailed outsource/subcontract execution and recovery controls.
-- Dependencies: 017_subcontracting_rma.sql, 056_supplier_relationship_management.sql
-- Rollback: DROP TABLE osc_supplier_portal_documents,
--           osc_supplier_recovery_claims, osc_supplier_chargebacks,
--           osc_supplier_score_trends, osc_supplier_nonconformances,
--           osc_supplier_receipts, osc_supplier_shipment_notices,
--           osc_supplier_capacity_reservations, osc_dispatch_batch_lines,
--           osc_dispatch_batches, osc_subcontract_operations,
--           osc_subcontract_plans CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS osc_subcontract_plans (
    osc_subcontract_plan_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number                  VARCHAR(80)     NOT NULL UNIQUE,
    subcontract_order_id         UUID            REFERENCES subcontract_orders(subcontract_id),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    plan_status                  VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (plan_status IN ('planned', 'released', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_subcontract_operations (
    osc_subcontract_operation_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    osc_subcontract_plan_id      UUID            NOT NULL REFERENCES osc_subcontract_plans(osc_subcontract_plan_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    process_code                 VARCHAR(80),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    planned_qty                  NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (osc_subcontract_plan_id, line_number)
);

CREATE TABLE IF NOT EXISTS osc_dispatch_batches (
    osc_dispatch_batch_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_batch_number        VARCHAR(80)     NOT NULL UNIQUE,
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    dispatch_date                DATE,
    batch_status                 VARCHAR(20)     NOT NULL DEFAULT 'planned'
                                 CHECK (batch_status IN ('planned', 'dispatched', 'received', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_dispatch_batch_lines (
    osc_dispatch_batch_line_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    osc_dispatch_batch_id        UUID            NOT NULL REFERENCES osc_dispatch_batches(osc_dispatch_batch_id) ON DELETE CASCADE,
    line_number                  INT             NOT NULL,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    quantity                     NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (osc_dispatch_batch_id, line_number)
);

CREATE TABLE IF NOT EXISTS osc_supplier_capacity_reservations (
    osc_supplier_capacity_reservation_id UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    reservation_period           DATE            NOT NULL,
    reserved_hours               NUMERIC(12,2),
    reserved_qty                 NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_shipment_notices (
    osc_supplier_shipment_notice_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    notice_number                VARCHAR(80)     NOT NULL UNIQUE,
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    osc_dispatch_batch_id        UUID            REFERENCES osc_dispatch_batches(osc_dispatch_batch_id),
    ship_date                    DATE,
    eta_date                     DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_receipts (
    osc_supplier_receipt_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number               VARCHAR(80)     NOT NULL UNIQUE,
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    subcontract_receipt_id       UUID            REFERENCES subcontract_receipts(receipt_id),
    receipt_date                 DATE,
    receipt_status               VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (receipt_status IN ('open', 'accepted', 'rejected', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_nonconformances (
    osc_supplier_nonconformance_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    record_reference             VARCHAR(80),
    issue_date                   DATE,
    issue_summary                TEXT,
    issue_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (issue_status IN ('open', 'contained', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_score_trends (
    osc_supplier_score_trend_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    score_period                 DATE            NOT NULL,
    delivery_score               NUMERIC(6,2),
    quality_score                NUMERIC(6,2),
    responsiveness_score         NUMERIC(6,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, score_period)
);

CREATE TABLE IF NOT EXISTS osc_supplier_chargebacks (
    osc_supplier_chargeback_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    chargeback_number            VARCHAR(80)     NOT NULL UNIQUE,
    chargeback_date              DATE,
    amount                       NUMERIC(14,2),
    chargeback_status            VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (chargeback_status IN ('open', 'agreed', 'recovered', 'waived')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_recovery_claims (
    osc_supplier_recovery_claim_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    claim_number                 VARCHAR(80)     NOT NULL UNIQUE,
    claim_date                   DATE,
    claimed_amount               NUMERIC(14,2),
    claim_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (claim_status IN ('open', 'accepted', 'settled', 'rejected')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osc_supplier_portal_documents (
    osc_supplier_portal_document_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id                    VARCHAR(50)     REFERENCES vendors(vendor_id),
    document_reference           VARCHAR(80)     NOT NULL,
    document_type                VARCHAR(30)     NOT NULL
                                 CHECK (document_type IN ('drawing', 'po', 'certificate', 'shipment_notice')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
