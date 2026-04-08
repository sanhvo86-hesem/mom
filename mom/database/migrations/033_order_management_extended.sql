-- ============================================================================
-- Migration: 033_order_management_extended.sql
-- Description: Order management extensions - contract review, notes,
--              documents required, timeline events
-- Dependencies: 032_order_management_world_class_foundations.sql
-- Rollback: DROP TABLE order_timeline_events, order_documents_required,
--           order_notes, contract_review_items CASCADE;
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE contract_review_result_enum AS ENUM (
        'pending', 'approved', 'approved_with_conditions', 'rejected', 'not_applicable'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hold_type_enum AS ENUM (
        'credit', 'engineering', 'quality', 'shipping', 'material', 'customer_request'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE order_note_type_enum AS ENUM (
        'internal', 'customer_facing', 'engineering', 'quality', 'production'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE timeline_event_type_enum AS ENUM (
        'status_change', 'hold_set', 'hold_released', 'note_added',
        'document_attached', 'contract_reviewed', 'milestone', 'escalation'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- contract_review_items / Hang muc xem xet hop dong
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_review_items (
    review_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    so_number               VARCHAR(50)     NOT NULL,
    checklist_item_code     VARCHAR(50),
    checklist_item_label    VARCHAR(300),
    checklist_item_label_vi VARCHAR(300),
    result                  contract_review_result_enum DEFAULT 'pending',
    reviewer_id             UUID            REFERENCES users(user_id),
    reviewed_at             TIMESTAMPTZ,
    comments                TEXT,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE contract_review_items IS 'Contract review checklist items per sales order / Hang muc danh gia xem xet hop dong theo don hang';

CREATE INDEX IF NOT EXISTS idx_contract_review_items_so ON contract_review_items (so_number);
CREATE INDEX IF NOT EXISTS idx_contract_review_items_result ON contract_review_items (result);

-- ============================================================================
-- order_notes / Ghi chu don hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_notes (
    note_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type              VARCHAR(5)      NOT NULL CHECK (order_type IN ('so','jo','wo')),
    order_number            VARCHAR(50)     NOT NULL,
    note_type               order_note_type_enum DEFAULT 'internal',
    note_text               TEXT            NOT NULL,
    author_id               UUID            REFERENCES users(user_id),
    author_name             VARCHAR(150),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_notes IS 'Notes and comments per order / Ghi chu va binh luan theo don hang';

CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes (order_type, order_number);
CREATE INDEX IF NOT EXISTS idx_order_notes_type ON order_notes (note_type);

-- ============================================================================
-- order_documents_required / Tai lieu bat buoc theo don hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_documents_required (
    doc_req_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type              VARCHAR(5)      NOT NULL CHECK (order_type IN ('so','jo','wo')),
    order_number            VARCHAR(50)     NOT NULL,
    document_type           VARCHAR(50)     NOT NULL,
    required                BOOLEAN         DEFAULT TRUE,
    received                BOOLEAN         DEFAULT FALSE,
    received_at             TIMESTAMPTZ,
    received_by             UUID            REFERENCES users(user_id),
    file_reference          VARCHAR(500),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_documents_required IS 'Required documents per order (coc, coa, fai, ppap, test_report, material_cert, export_permit) / Tai lieu bat buoc theo don hang';

CREATE INDEX IF NOT EXISTS idx_order_documents_required_order ON order_documents_required (order_type, order_number);
CREATE INDEX IF NOT EXISTS idx_order_documents_required_type ON order_documents_required (document_type);

-- ============================================================================
-- order_timeline_events / Su kien dong thoi gian don hang
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_timeline_events (
    event_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_type              VARCHAR(5)      NOT NULL CHECK (order_type IN ('so','jo','wo')),
    order_number            VARCHAR(50)     NOT NULL,
    event_type              timeline_event_type_enum NOT NULL,
    event_label             VARCHAR(300),
    event_label_vi          VARCHAR(300),
    event_date              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    planned_date            DATE,
    actual_date             DATE,
    actor_id                UUID            REFERENCES users(user_id),
    actor_name              VARCHAR(150),
    details                 JSONB,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_timeline_events IS 'Timeline / Gantt events per order / Su kien dong thoi gian (Gantt) theo don hang';

CREATE INDEX IF NOT EXISTS idx_order_timeline_events_order ON order_timeline_events (order_type, order_number);
CREATE INDEX IF NOT EXISTS idx_order_timeline_events_date ON order_timeline_events (event_date);
CREATE INDEX IF NOT EXISTS idx_order_timeline_events_type ON order_timeline_events (event_type);

-- ============================================================================
-- ALTER existing tables
-- ============================================================================

-- sales_orders
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS contract_review_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contract_review_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS total_value NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS notes_count INT DEFAULT 0;

-- job_orders
ALTER TABLE job_orders
    ADD COLUMN IF NOT EXISTS actual_start_date DATE,
    ADD COLUMN IF NOT EXISTS actual_end_date DATE,
    ADD COLUMN IF NOT EXISTS yield_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS scrap_qty NUMERIC(12,2) DEFAULT 0;

-- job_operations
ALTER TABLE job_operations
    ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS planned_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS setup_time_actual NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS run_time_actual NUMERIC(10,2);

COMMIT;
