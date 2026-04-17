-- Migration 137: EQMS Schema Drift Reconciliation
-- Registers 3 previously-untracked EQMS tables and adds 29 columns
-- that were added post-migration-136 via ALTER TABLE outside migrations.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Generated: 2026-04-16

-- ── Part 1: Register Previously-Unmanaged Tables ────────────────────────────

CREATE TABLE IF NOT EXISTS eqms_quality_tower_snapshots (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    snapshot_at     timestamptz NOT NULL DEFAULT now(),
    open_ncr_count  integer              DEFAULT 0,
    open_capa_count integer              DEFAULT 0,
    overdue_actions jsonb                DEFAULT '{}'::jsonb,
    kpi_data        jsonb                DEFAULT '{}'::jsonb,
    created_by      text,
    created_at      timestamptz          DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS eqms_supplier_quality_agreements (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    agreement_title text,
    supplier_id     uuid,
    review_date     date,
    status          text                 DEFAULT 'active'::text,
    created_at      timestamptz          DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS genealogy_threads (
    thread_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
    lot_id         text,
    product_id     text,
    work_order_id  text,
    frozen         boolean              DEFAULT false,
    notes          text,
    status         text                 DEFAULT 'active'::text,
    version        integer              DEFAULT 1,
    created_at     timestamptz          DEFAULT now(),
    created_by     text,
    updated_at     timestamptz          DEFAULT now(),
    frozen_by      text,
    frozen_at      timestamptz,
    PRIMARY KEY (thread_id)
);

-- ── Part 2: Add Missing Columns to Existing EQMS Tables ─────────────────────

-- eqms_complaints (5 columns)
ALTER TABLE eqms_complaints ADD COLUMN IF NOT EXISTS updated_at            timestamptz DEFAULT now();
ALTER TABLE eqms_complaints ADD COLUMN IF NOT EXISTS resolution_date       date;
ALTER TABLE eqms_complaints ADD COLUMN IF NOT EXISTS updated_by            text;
ALTER TABLE eqms_complaints ADD COLUMN IF NOT EXISTS investigation_summary text;
ALTER TABLE eqms_complaints ADD COLUMN IF NOT EXISTS closure_reason        text;

-- eqms_deviations (4 columns)
ALTER TABLE eqms_deviations ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();
ALTER TABLE eqms_deviations ADD COLUMN IF NOT EXISTS updated_by       text;
ALTER TABLE eqms_deviations ADD COLUMN IF NOT EXISTS containment_date date;
ALTER TABLE eqms_deviations ADD COLUMN IF NOT EXISTS closure_reason   text;

-- eqms_ncr_records (2 columns)
ALTER TABLE eqms_ncr_records ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE eqms_ncr_records ADD COLUMN IF NOT EXISTS due_date    date;

-- eqms_capa_records (3 columns)
ALTER TABLE eqms_capa_records ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();
ALTER TABLE eqms_capa_records ADD COLUMN IF NOT EXISTS target_close_date date;
ALTER TABLE eqms_capa_records ADD COLUMN IF NOT EXISTS owner_user_id     text;

-- eqms_change_controls (1 column)
ALTER TABLE eqms_change_controls ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- eqms_documents (2 columns)
ALTER TABLE eqms_documents ADD COLUMN IF NOT EXISTS checked_out_by  varchar(120);
ALTER TABLE eqms_documents ADD COLUMN IF NOT EXISTS checked_out_at  timestamptz;

-- eqms_training_curricula (4 columns)
ALTER TABLE eqms_training_curricula ADD COLUMN IF NOT EXISTS description               text;
ALTER TABLE eqms_training_curricula ADD COLUMN IF NOT EXISTS qualification_requirements text;
ALTER TABLE eqms_training_curricula ADD COLUMN IF NOT EXISTS validity_period_months    integer;
ALTER TABLE eqms_training_curricula ADD COLUMN IF NOT EXISTS recurrence_months         integer;

-- eqms_training_records (3 columns)
ALTER TABLE eqms_training_records ADD COLUMN IF NOT EXISTS duration_hours numeric;
ALTER TABLE eqms_training_records ADD COLUMN IF NOT EXISTS course_name   text;
ALTER TABLE eqms_training_records ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- eqms_audit_findings (3 columns)
ALTER TABLE eqms_audit_findings ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE eqms_audit_findings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE eqms_audit_findings ADD COLUMN IF NOT EXISTS version     integer     DEFAULT 1;

-- eqms_scars (3 columns)
ALTER TABLE eqms_scars ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE eqms_scars ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE eqms_scars ADD COLUMN IF NOT EXISTS title      text;

-- eqms_calibration_records (3 columns)
ALTER TABLE eqms_calibration_records ADD COLUMN IF NOT EXISTS instrument_name      text;
ALTER TABLE eqms_calibration_records ADD COLUMN IF NOT EXISTS responsible_user_id  text;
ALTER TABLE eqms_calibration_records ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();

-- eqms_field_actions (3 columns)
ALTER TABLE eqms_field_actions ADD COLUMN IF NOT EXISTS title                  text;
ALTER TABLE eqms_field_actions ADD COLUMN IF NOT EXISTS target_completion_date date;
ALTER TABLE eqms_field_actions ADD COLUMN IF NOT EXISTS owner_user_id          text;
