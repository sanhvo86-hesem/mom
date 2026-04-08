-- ============================================================================
-- Migration: 066_traceability_serialization.sql
-- Description: Deep genealogy, traveler, labeling, and recall governance.
-- Dependencies: 009_inventory.sql, 010_production.sql, 016_shipping_compliance.sql
-- Rollback: DROP TABLE trace_recall_campaigns, trace_label_print_jobs,
--           trace_label_templates, trace_dispatch_events,
--           trace_job_traveler_steps, trace_job_travelers,
--           trace_heat_lot_register, trace_material_certificates,
--           trace_lot_attributes, trace_serial_events,
--           trace_genealogy_links, trace_genealogy_batches CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS trace_genealogy_batches (
    trace_genealogy_batch_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    genealogy_batch_number       VARCHAR(80)     NOT NULL UNIQUE,
    job_number                   VARCHAR(50)     REFERENCES job_orders(job_number),
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_genealogy_links (
    trace_genealogy_link_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_genealogy_batch_id     UUID            NOT NULL REFERENCES trace_genealogy_batches(trace_genealogy_batch_id) ON DELETE CASCADE,
    parent_reference             VARCHAR(80)     NOT NULL,
    child_reference              VARCHAR(80)     NOT NULL,
    link_type                    VARCHAR(20)     NOT NULL
                                 CHECK (link_type IN ('consumed', 'produced', 'split', 'merge')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_serial_events (
    trace_serial_event_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number                VARCHAR(100)    REFERENCES serial_master(serial_number),
    event_code                   VARCHAR(50)     NOT NULL,
    event_timestamp              TIMESTAMPTZ     NOT NULL,
    event_reference              VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_lot_attributes (
    trace_lot_attribute_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number                   VARCHAR(100)    NOT NULL REFERENCES lot_master(lot_number) ON DELETE CASCADE,
    attribute_name               VARCHAR(100)    NOT NULL,
    attribute_value              VARCHAR(300),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_material_certificates (
    trace_material_certificate_id UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number                   VARCHAR(100)    REFERENCES lot_master(lot_number),
    certificate_number           VARCHAR(80)     NOT NULL UNIQUE,
    certificate_type             VARCHAR(30)     NOT NULL
                                 CHECK (certificate_type IN ('coc', 'coa', 'mill_cert', 'rohs', 'reach')),
    supplier_id                  VARCHAR(50)     REFERENCES vendors(vendor_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_heat_lot_register (
    trace_heat_lot_register_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    heat_number                  VARCHAR(100)    NOT NULL UNIQUE,
    material_grade               VARCHAR(100),
    supplier_id                  VARCHAR(50)     REFERENCES vendors(vendor_id),
    received_date                DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_job_travelers (
    trace_job_traveler_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_number              VARCHAR(80)     NOT NULL UNIQUE,
    job_number                   VARCHAR(50)     REFERENCES job_orders(job_number),
    revision_code                VARCHAR(20),
    traveler_status              VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (traveler_status IN ('open', 'in_progress', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_job_traveler_steps (
    trace_job_traveler_step_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_job_traveler_id        UUID            NOT NULL REFERENCES trace_job_travelers(trace_job_traveler_id) ON DELETE CASCADE,
    step_number                  INT             NOT NULL,
    operation_reference          VARCHAR(80),
    completed_by                 UUID            REFERENCES users(user_id),
    completed_at                 TIMESTAMPTZ,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (trace_job_traveler_id, step_number)
);

CREATE TABLE IF NOT EXISTS trace_dispatch_events (
    trace_dispatch_event_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number                   VARCHAR(50)     REFERENCES job_orders(job_number),
    dispatch_timestamp           TIMESTAMPTZ     NOT NULL,
    from_work_center_id          VARCHAR(30)     REFERENCES work_centers(work_center_id),
    to_work_center_id            VARCHAR(30)     REFERENCES work_centers(work_center_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_label_templates (
    trace_label_template_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_code                VARCHAR(50)     NOT NULL UNIQUE,
    template_name                VARCHAR(200)    NOT NULL,
    template_scope               VARCHAR(20)     NOT NULL
                                 CHECK (template_scope IN ('item', 'lot', 'serial', 'shipment')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_label_print_jobs (
    trace_label_print_job_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_label_template_id      UUID            REFERENCES trace_label_templates(trace_label_template_id),
    print_reference              VARCHAR(80),
    quantity_printed             INT             DEFAULT 1,
    printed_by                   UUID            REFERENCES users(user_id),
    printed_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata                     JSONB           DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS trace_recall_campaigns (
    trace_recall_campaign_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    recall_number                VARCHAR(80)     NOT NULL UNIQUE,
    recall_date                  DATE,
    item_id                      VARCHAR(50)     REFERENCES items(item_id),
    recall_scope                 TEXT,
    recall_status                VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (recall_status IN ('open', 'contained', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
