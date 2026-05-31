-- P57: Runtime authority telemetry and control tower evidence.

BEGIN;

CREATE TABLE IF NOT EXISTS mda_runtime_telemetry_event (
    telemetry_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    event_name TEXT NOT NULL,
    metric_value NUMERIC(20,6) NOT NULL DEFAULT 1,
    command_name TEXT,
    problem_code TEXT,
    outcome TEXT,
    source_authority TEXT NOT NULL DEFAULT 'MdaRuntimeTelemetryService',
    trace_id TEXT,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    redaction_class TEXT NOT NULL DEFAULT 'safe_dimensions_only'
        CHECK (redaction_class IN ('safe_dimensions_only', 'hashed_identifier', 'aggregate_only')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '730 days'),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_runtime_telemetry_metric_time
    ON mda_runtime_telemetry_event (metric_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_mda_runtime_telemetry_problem_time
    ON mda_runtime_telemetry_event (problem_code, occurred_at DESC)
    WHERE problem_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS mda_runtime_control_tower_snapshot (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_status TEXT NOT NULL DEFAULT 'pre_production_candidate'
        CHECK (snapshot_status IN ('pre_production_candidate', 'go', 'no_go', 'degraded', 'archived')),
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    metric_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
    p60_scorecard_input JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by TEXT NOT NULL DEFAULT 'MdaRuntimeTelemetryService',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mda_runtime_control_tower_snapshot_time
    ON mda_runtime_control_tower_snapshot (generated_at DESC);

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    ('mda_runtime_observability', 'integration_resilience', 'mda_runtime_telemetry_event', 'event_record', 'domain_command_required', '["RecordRuntimeTelemetryEvent"]'::jsonb),
    ('mda_runtime_observability', 'analytics', 'mda_runtime_control_tower_snapshot', 'projection_record', 'domain_command_required', '["GenerateRuntimeControlTowerSnapshot"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    classification = EXCLUDED.classification,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = now();

COMMIT;
