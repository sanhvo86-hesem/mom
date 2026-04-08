-- ============================================================================
-- Migration: 040_digital_product_passport.sql
-- Description: Digital Product Passport (DPP) - passports, lifecycle events,
--              access control
-- Dependencies: 006_erp_master_data.sql, 009_inventory.sql, 011_quality.sql
-- Rollback: DROP TABLE passport_access_log, passport_events,
--           product_passports CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE passport_status_enum AS ENUM (
        'draft', 'active', 'shipped', 'in_service', 'end_of_life', 'recalled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE passport_event_type_enum AS ENUM (
        'material_received', 'machining_started', 'machining_completed',
        'heat_treatment', 'surface_treatment', 'inspection_passed',
        'inspection_failed', 'rework', 'fai_completed', 'certified',
        'shipped', 'installed', 'field_service', 'recalled', 'scrapped'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- product_passports / Ho chieu san pham so
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_passports (
    passport_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_number         VARCHAR(50)     UNIQUE,
    item_id                 VARCHAR(50)     REFERENCES items(item_id),
    serial_number           VARCHAR(100)    REFERENCES serial_master(serial_number),
    lot_number              VARCHAR(100),
    job_number              VARCHAR(50),
    sales_order_ref         VARCHAR(50),
    customer_id             VARCHAR(50)     REFERENCES customers(customer_id),
    status                  passport_status_enum DEFAULT 'draft',
    qr_code_data            TEXT,
    material_cert_ref       VARCHAR(200),
    material_heat_number    VARCHAR(100),
    material_lot_number     VARCHAR(100),
    material_supplier       VARCHAR(200),
    manufacturing_start_date DATE,
    manufacturing_end_date  DATE,
    final_inspection_date   DATE,
    ship_date               DATE,
    fai_reference           VARCHAR(50),
    coc_reference           VARCHAR(50),
    coa_reference           VARCHAR(50),
    test_report_references  JSONB           DEFAULT '[]'::jsonb,
    total_machining_time_minutes  NUMERIC(10,2),
    total_inspection_time_minutes NUMERIC(10,2),
    operations_completed    JSONB           DEFAULT '[]'::jsonb,
    nonconformances         JSONB           DEFAULT '[]'::jsonb,
    deviations              JSONB           DEFAULT '[]'::jsonb,
    concessions             JSONB           DEFAULT '[]'::jsonb,
    carbon_footprint_kg     NUMERIC(10,3),
    energy_consumed_kwh     NUMERIC(10,2),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_passports IS 'Digital Product Passport per serialized part / Ho chieu san pham so theo so serial';

CREATE INDEX IF NOT EXISTS idx_product_passports_number ON product_passports (passport_number);
CREATE INDEX IF NOT EXISTS idx_product_passports_item ON product_passports (item_id);
CREATE INDEX IF NOT EXISTS idx_product_passports_serial ON product_passports (serial_number);
CREATE INDEX IF NOT EXISTS idx_product_passports_customer ON product_passports (customer_id);
CREATE INDEX IF NOT EXISTS idx_product_passports_status ON product_passports (status);
CREATE INDEX IF NOT EXISTS idx_product_passports_job ON product_passports (job_number);
CREATE INDEX IF NOT EXISTS idx_product_passports_so ON product_passports (sales_order_ref);

-- ============================================================================
-- passport_events / Su kien vong doi ho chieu san pham
-- ============================================================================
CREATE TABLE IF NOT EXISTS passport_events (
    event_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_id             UUID            NOT NULL REFERENCES product_passports(passport_id) ON DELETE CASCADE,
    event_type              passport_event_type_enum NOT NULL,
    event_date              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    description             TEXT,
    description_vi          TEXT,
    operator_id             VARCHAR(20),
    machine_id              VARCHAR(50),
    work_center_id          VARCHAR(30),
    operation_seq           INT,
    measurement_data        JSONB,
    photos                  JSONB           DEFAULT '[]'::jsonb,
    documents               JSONB           DEFAULT '[]'::jsonb,
    location                VARCHAR(200),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE passport_events IS 'Lifecycle events for product passport / Su kien vong doi cho ho chieu san pham';

CREATE INDEX IF NOT EXISTS idx_passport_events_passport ON passport_events (passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_events_type ON passport_events (event_type);
CREATE INDEX IF NOT EXISTS idx_passport_events_date ON passport_events (event_date);
CREATE INDEX IF NOT EXISTS idx_passport_events_operator ON passport_events (operator_id);
CREATE INDEX IF NOT EXISTS idx_passport_events_machine ON passport_events (machine_id);

-- ============================================================================
-- passport_access_log / Nhat ky truy cap ho chieu san pham
-- ============================================================================
CREATE TABLE IF NOT EXISTS passport_access_log (
    access_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_id             UUID            NOT NULL REFERENCES product_passports(passport_id) ON DELETE CASCADE,
    accessed_by             VARCHAR(200),
    access_type             VARCHAR(30)     NOT NULL,
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    accessed_at             TIMESTAMPTZ     DEFAULT now()
);
COMMENT ON TABLE passport_access_log IS 'Access log for product passports (qr_scan, portal_view, api_query, customer_portal, audit) / Nhat ky truy cap ho chieu san pham';

CREATE INDEX IF NOT EXISTS idx_passport_access_passport ON passport_access_log (passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_access_type ON passport_access_log (access_type);
CREATE INDEX IF NOT EXISTS idx_passport_access_at ON passport_access_log (accessed_at);
CREATE INDEX IF NOT EXISTS idx_passport_access_by ON passport_access_log (accessed_by);

COMMIT;
