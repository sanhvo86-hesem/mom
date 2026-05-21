-- Migration 196: kpi_manual_inputs — manual data-input surface for KPIs that
-- are not yet computed from a transaction stream (calculation_status =
-- staged_data_contract or manual). The KPI data-input API
-- (kpi_input_save / kpi_input_list) writes here; KpiEngine reads the latest
-- input per metric/period so a staged KPI shows a real value instead of an
-- empty result. The endpoints are wired and waiting for a future frontend
-- input module — no UI is built yet.
--
-- metric_code is the KPI canonical code from the KPI authority registry
-- (SSOT). It is intentionally NOT a foreign key to kpi_definitions: governance
-- KPIs are governed by the registry, not all of them have a kpi_definitions
-- row, and the registry is the single source of truth for which codes exist.
-- The API validates metric_code against the registry before insert.

CREATE TABLE IF NOT EXISTS kpi_manual_inputs (
    input_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_code         TEXT            NOT NULL,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    value               NUMERIC(16,4)   NOT NULL,
    unit                TEXT,
    breakdown           JSONB           NOT NULL DEFAULT '{}',
    evidence_reference  TEXT,
    input_status        TEXT            NOT NULL DEFAULT 'submitted'
                        CHECK (input_status IN ('draft', 'submitted', 'verified', 'superseded')),
    notes               TEXT,
    entered_by          TEXT            NOT NULL,
    entered_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    verified_by         TEXT,
    verified_at         TIMESTAMPTZ,
    metadata            JSONB           NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE kpi_manual_inputs IS
    'Manual KPI data points for staged/manual KPIs. metric_code = KPI registry canonical code (SSOT). / Du lieu KPI nhap tay cho KPI chua tinh tu dong.';

-- Latest-input lookup per metric + period (KpiEngine reads the most recent
-- non-superseded row).
CREATE INDEX IF NOT EXISTS idx_kpi_manual_inputs_lookup
    ON kpi_manual_inputs (metric_code, period_end DESC, entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_manual_inputs_period
    ON kpi_manual_inputs (period_start, period_end);
