-- Migration: 045_oqc_packing_outsource.sql
-- Description: OQC (Outgoing Quality Control), packing lists, outsource UI support
-- Dependencies: 011_quality.sql, 016_shipping_compliance.sql, 017_subcontracting_rma.sql
-- Rollback: DROP TABLE packing_list_items, packing_lists, oqc_inspections CASCADE;

BEGIN;

-- ============================================================================
-- oqc_inspections / Kiểm tra chất lượng đầu ra (OQC / Final Inspection)
-- ============================================================================
DO $$ BEGIN CREATE TYPE oqc_result_enum AS ENUM ('pass', 'fail', 'conditional', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE oqc_type_enum AS ENUM ('final_inspection', 'oqc_sampling', 'customer_witness', 'source_inspection'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS oqc_inspections (
    oqc_id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    oqc_number              VARCHAR(50)     NOT NULL UNIQUE,
    oqc_type                oqc_type_enum   NOT NULL DEFAULT 'final_inspection',
    so_number               VARCHAR(50),
    jo_number               VARCHAR(50),
    wo_number               VARCHAR(50),
    item_id                 VARCHAR(50),
    lot_number              VARCHAR(100),
    serial_numbers          JSONB           DEFAULT '[]'::jsonb,
    qty_inspected           INT             NOT NULL DEFAULT 0,
    qty_accepted            INT             DEFAULT 0,
    qty_rejected            INT             DEFAULT 0,
    result                  oqc_result_enum DEFAULT 'pending',
    inspector_id            UUID            REFERENCES users(user_id),
    inspection_date         DATE,
    inspection_plan_ref     VARCHAR(50),
    measurements            JSONB           DEFAULT '[]'::jsonb,
    photos                  JSONB           DEFAULT '[]'::jsonb,
    ncr_reference           VARCHAR(50),
    customer_witness_required BOOLEAN       DEFAULT FALSE,
    customer_witness_name   VARCHAR(200),
    customer_witness_date   DATE,
    notes                   TEXT,
    approved_by             UUID            REFERENCES users(user_id),
    approved_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE oqc_inspections IS 'Outgoing Quality Control / Final Inspection records. / Hồ sơ kiểm tra chất lượng đầu ra / kiểm tra cuối.';

CREATE INDEX IF NOT EXISTS idx_oqc_so ON oqc_inspections (so_number);
CREATE INDEX IF NOT EXISTS idx_oqc_jo ON oqc_inspections (jo_number);
CREATE INDEX IF NOT EXISTS idx_oqc_result ON oqc_inspections (result);
CREATE INDEX IF NOT EXISTS idx_oqc_date ON oqc_inspections (inspection_date);
CREATE INDEX IF NOT EXISTS idx_oqc_item ON oqc_inspections (item_id);

-- ============================================================================
-- packing_lists / Phiếu đóng gói
-- ============================================================================
DO $$ BEGIN CREATE TYPE packing_status_enum AS ENUM ('draft', 'packed', 'verified', 'shipped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS packing_lists (
    packing_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    packing_number          VARCHAR(50)     NOT NULL UNIQUE,
    so_number               VARCHAR(50)     NOT NULL,
    shipment_id             UUID,
    customer_id             VARCHAR(50),
    customer_name           VARCHAR(200),
    status                  packing_status_enum DEFAULT 'draft',
    packing_date            DATE,
    ship_date               DATE,
    tracking_number         VARCHAR(200),
    carrier                 VARCHAR(100),
    total_packages          INT             DEFAULT 1,
    total_weight_kg         NUMERIC(10,2),
    special_packaging_notes TEXT,
    coc_reference           VARCHAR(100),
    packed_by               VARCHAR(50),
    verified_by             UUID            REFERENCES users(user_id),
    verified_at             TIMESTAMPTZ,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE packing_lists IS 'Packing list header per shipment. / Phiếu đóng gói cho mỗi lần giao hàng.';

CREATE INDEX IF NOT EXISTS idx_packing_so ON packing_lists (so_number);
CREATE INDEX IF NOT EXISTS idx_packing_status ON packing_lists (status);
CREATE INDEX IF NOT EXISTS idx_packing_date ON packing_lists (packing_date);

-- ============================================================================
-- packing_list_items / Chi tiết phiếu đóng gói
-- ============================================================================
CREATE TABLE IF NOT EXISTS packing_list_items (
    item_line_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    packing_id              UUID            NOT NULL REFERENCES packing_lists(packing_id) ON DELETE CASCADE,
    line_number             INT             NOT NULL,
    item_id                 VARCHAR(50),
    part_description        VARCHAR(500),
    jo_number               VARCHAR(50),
    wo_number               VARCHAR(50),
    quantity                INT             NOT NULL DEFAULT 0,
    unit_of_measure         VARCHAR(20)     DEFAULT 'EA',
    serial_numbers          JSONB           DEFAULT '[]'::jsonb,
    lot_number              VARCHAR(100),
    net_weight_kg           NUMERIC(10,2),
    package_number          INT             DEFAULT 1,
    notes                   TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE packing_list_items IS 'Packing list line items. / Chi tiết dòng phiếu đóng gói.';

CREATE INDEX IF NOT EXISTS idx_packing_item_packing ON packing_list_items (packing_id);
CREATE INDEX IF NOT EXISTS idx_packing_item_jo ON packing_list_items (jo_number);

COMMIT;
