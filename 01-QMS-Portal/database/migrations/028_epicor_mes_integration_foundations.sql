-- ============================================================================
-- MIGRATION 028: EPICOR MES INTEGRATION FOUNDATIONS
-- Date: 2026-03-30
-- Purpose: Govern sync cycles, reconciliation, and Epicor runtime observability
-- ============================================================================

CREATE TABLE IF NOT EXISTS mes_erp_sync_runs (
    sync_run_id          VARCHAR(80) PRIMARY KEY,
    integration_system   VARCHAR(80) NOT NULL DEFAULT 'Epicor Kinetic',
    sync_domain          VARCHAR(50) NOT NULL,
    sync_direction       VARCHAR(20) NOT NULL,
    transport_mode       VARCHAR(30) NOT NULL DEFAULT 'rest',
    sync_status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    started_at           TIMESTAMPTZ NOT NULL,
    completed_at         TIMESTAMPTZ,
    latency_ms           INT NOT NULL DEFAULT 0,
    records_received     INT NOT NULL DEFAULT 0,
    records_processed    INT NOT NULL DEFAULT 0,
    records_failed       INT NOT NULL DEFAULT 0,
    checkpoint_key       VARCHAR(120),
    checkpoint_value     TEXT,
    summary              TEXT,
    metadata             JSONB NOT NULL DEFAULT '{}',
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by           VARCHAR(80)
);
COMMENT ON TABLE mes_erp_sync_runs IS 'Governed Epicor sync cycle history. / Lich su chu ky dong bo Epicor co kiem soat.';
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_runs_domain ON mes_erp_sync_runs (sync_domain, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_runs_status ON mes_erp_sync_runs (sync_status, started_at DESC);

CREATE TABLE IF NOT EXISTS mes_erp_reconciliation_exceptions (
    reconciliation_id    VARCHAR(80) PRIMARY KEY,
    sync_domain          VARCHAR(50) NOT NULL,
    entity_type          VARCHAR(50) NOT NULL,
    entity_id            VARCHAR(120) NOT NULL,
    discrepancy_type     VARCHAR(50) NOT NULL,
    severity             VARCHAR(20) NOT NULL DEFAULT 'warning',
    expected_value       JSONB NOT NULL DEFAULT '{}',
    actual_value         JSONB NOT NULL DEFAULT '{}',
    difference_summary   TEXT,
    owner_role           VARCHAR(80),
    exception_status     VARCHAR(20) NOT NULL DEFAULT 'open',
    detected_at          TIMESTAMPTZ NOT NULL,
    resolved_at          TIMESTAMPTZ,
    metadata             JSONB NOT NULL DEFAULT '{}',
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by           VARCHAR(80)
);
COMMENT ON TABLE mes_erp_reconciliation_exceptions IS 'Governed MES/Epicor reconciliation exception register. / So dang ky sai lech doi soat MES va Epicor.';
CREATE INDEX IF NOT EXISTS idx_mes_erp_recon_status ON mes_erp_reconciliation_exceptions (exception_status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_mes_erp_recon_domain ON mes_erp_reconciliation_exceptions (sync_domain, detected_at DESC);
