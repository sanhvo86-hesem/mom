-- Migration 138: EQMS Performance Indexes
-- Adds missing indexes to fix slow queries identified in PHP-FPM slow log
-- (eqms_supplier_audits_query and eqms_supplier_audits_metrics taking 5-6s).
-- All CREATE INDEX statements use IF NOT EXISTS for idempotency.
-- Generated: 2026-04-16

-- ── eqms_supplier_audits ─────────────────────────────────────────────────────
-- Metrics queries filter only by status (not vendor_id) — current composite
-- index (vendor_id, status) cannot be used for status-only scans.
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_audits_status
    ON eqms_supplier_audits (status, created_at DESC);

-- Year-to-date closed audits query: WHERE status='closed' AND actual_end >= ...
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_audits_closed_ytd
    ON eqms_supplier_audits (status, actual_end DESC)
    WHERE status = 'closed';

-- Listing / search sorting by planned_date
CREATE INDEX IF NOT EXISTS idx_eqms_supplier_audits_planned
    ON eqms_supplier_audits (planned_date DESC NULLS LAST);

-- ── eqms_scars ───────────────────────────────────────────────────────────────
-- Overdue SCAR query: WHERE status NOT IN ('closed') AND response_due_date < now()
CREATE INDEX IF NOT EXISTS idx_eqms_scars_overdue
    ON eqms_scars (response_due_date)
    WHERE status NOT IN ('closed');

-- Critical SCARs: WHERE priority='critical' AND status != 'closed'
CREATE INDEX IF NOT EXISTS idx_eqms_scars_priority_status
    ON eqms_scars (priority, status);

-- Closed YTD: WHERE status='closed' AND closed_at >= date_trunc('year',now())
CREATE INDEX IF NOT EXISTS idx_eqms_scars_closed_ytd
    ON eqms_scars (status, closed_at DESC)
    WHERE status = 'closed';

-- ── eqms_audits ──────────────────────────────────────────────────────────────
-- Status-only count queries (planned/scheduled overdue, in_progress, closed YTD)
CREATE INDEX IF NOT EXISTS idx_eqms_audits_status
    ON eqms_audits (status, planned_date);

CREATE INDEX IF NOT EXISTS idx_eqms_audits_closed_ytd
    ON eqms_audits (status, actual_end DESC)
    WHERE status = 'closed';

-- ── eqms_complaints ──────────────────────────────────────────────────────────
-- Quality tower and dashboard count: WHERE severity='critical' AND status NOT IN (...)
CREATE INDEX IF NOT EXISTS idx_eqms_complaints_severity_status
    ON eqms_complaints (severity, status);

-- ── eqms_deviations ──────────────────────────────────────────────────────────
-- Dashboard count: WHERE batch_id IS NOT NULL AND status NOT IN (...)
CREATE INDEX IF NOT EXISTS idx_eqms_deviations_batch_open
    ON eqms_deviations (batch_id)
    WHERE batch_id IS NOT NULL AND status NOT IN ('closed', 'voided');

-- ── eqms_training_records ─────────────────────────────────────────────────────
-- Dashboard: COUNT by status (completed/verified vs not expired/waived)
CREATE INDEX IF NOT EXISTS idx_eqms_training_records_status
    ON eqms_training_records (status);

-- ── eqms_capa_records ────────────────────────────────────────────────────────
-- Dashboard open CAPAs (already has idx_eqms_capa_open partial index)
-- Add overdue index: WHERE target_close_date < now() AND status NOT IN (closed)
CREATE INDEX IF NOT EXISTS idx_eqms_capa_overdue
    ON eqms_capa_records (target_close_date)
    WHERE target_close_date IS NOT NULL
      AND status NOT IN ('closed', 'cancelled');

-- ── eqms_lab_investigations ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eqms_lab_investigations_status
    ON eqms_lab_investigations (status, created_at DESC);

-- ── eqms_validation_projects ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eqms_validation_projects_status
    ON eqms_validation_projects (status, created_at DESC);

-- ── eqms_field_actions ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eqms_field_actions_status
    ON eqms_field_actions (status, created_at DESC);

-- ── eqms_risk_register ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eqms_risk_register_status
    ON eqms_risk_register (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eqms_risk_register_severity
    ON eqms_risk_register (severity_level, status);
