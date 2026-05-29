-- ============================================================================
-- Migration 238: Resource Readiness And MES Runtime Event Spine
-- ============================================================================
-- Purpose:
--   Add command-time readiness snapshots and an append-only MES runtime event
--   spine for WO release/start, material issue, NC verification, and quality
--   containment decisions.
--
-- Data safety:
--   Additive migration only. Existing MES event, job, material, machine, and
--   quality tables are not mutated.
--
-- Rollback:
--   DROP TABLE IF EXISTS mes_runtime_event_spine CASCADE;
--   DROP TABLE IF EXISTS resource_readiness_snapshot CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS resource_readiness_snapshot (
    resource_readiness_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name                   VARCHAR(120) NOT NULL,
    readiness_scope                VARCHAR(60)  NOT NULL DEFAULT 'work_order_start'
        CHECK (readiness_scope IN (
            'work_order_release',
            'work_order_start',
            'job_start',
            'track_in',
            'material_issue',
            'tool_load',
            'program_verify',
            'inspection_record',
            'operation_complete'
        )),
    readiness_state                VARCHAR(30)  NOT NULL
        CHECK (readiness_state IN ('ready', 'blocked', 'not_applicable')),
    work_order_ref                 VARCHAR(160),
    job_ref                        VARCHAR(160),
    operation_ref                  VARCHAR(160),
    work_center_ref                VARCHAR(160),
    machine_ref                    VARCHAR(160),
    operator_ref                   VARCHAR(160),
    material_lot_ref               VARCHAR(160),
    tool_refs                      JSONB NOT NULL DEFAULT '[]'::jsonb,
    gage_refs                      JSONB NOT NULL DEFAULT '[]'::jsonb,
    engineering_package_ref        VARCHAR(160),
    engineering_package_hash_sha256 CHAR(64)
        CHECK (engineering_package_hash_sha256 IS NULL OR engineering_package_hash_sha256 ~ '^[a-f0-9]{64}$'),
    nc_program_ref                 VARCHAR(160),
    expected_nc_checksum_sha256    CHAR(64)
        CHECK (expected_nc_checksum_sha256 IS NULL OR expected_nc_checksum_sha256 ~ '^[a-f0-9]{64}$'),
    actual_nc_checksum_sha256      CHAR(64)
        CHECK (actual_nc_checksum_sha256 IS NULL OR actual_nc_checksum_sha256 ~ '^[a-f0-9]{64}$'),
    blocker_codes                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    gate_results                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_hold_refs              JSONB NOT NULL DEFAULT '[]'::jsonb,
    snapshot_hash_sha256           CHAR(64) NOT NULL CHECK (snapshot_hash_sha256 ~ '^[a-f0-9]{64}$'),
    evaluated_by                   VARCHAR(160),
    evaluated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    command_correlation_id         VARCHAR(160),
    idempotency_key                VARCHAR(255),
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_resource_readiness_wo
    ON resource_readiness_snapshot (work_order_ref, evaluated_at DESC)
    WHERE work_order_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_readiness_machine
    ON resource_readiness_snapshot (machine_ref, evaluated_at DESC)
    WHERE machine_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_readiness_material_lot
    ON resource_readiness_snapshot (material_lot_ref, evaluated_at DESC)
    WHERE material_lot_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_readiness_state
    ON resource_readiness_snapshot (readiness_state, evaluated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_resource_readiness_idempotency
    ON resource_readiness_snapshot (command_name, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS mes_runtime_event_spine (
    mes_runtime_event_spine_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type                     VARCHAR(80) NOT NULL
        CHECK (event_type IN (
            'resource.readiness_evaluated',
            'work_order.released',
            'job.started',
            'operation.track_in',
            'material.issued',
            'tool.loaded',
            'nc_program.verified',
            'inspection.recorded',
            'quality.containment_required',
            'operation.completed',
            'machine.event_recorded'
        )),
    event_state                    VARCHAR(30) NOT NULL DEFAULT 'recorded'
        CHECK (event_state IN ('recorded', 'blocked', 'planned', 'replayed')),
    event_hash_sha256              CHAR(64) NOT NULL UNIQUE CHECK (event_hash_sha256 ~ '^[a-f0-9]{64}$'),
    previous_event_hash_sha256     CHAR(64) CHECK (previous_event_hash_sha256 IS NULL OR previous_event_hash_sha256 ~ '^[a-f0-9]{64}$'),
    resource_readiness_snapshot_id UUID REFERENCES resource_readiness_snapshot(resource_readiness_snapshot_id),
    work_order_ref                 VARCHAR(160),
    job_ref                        VARCHAR(160),
    operation_ref                  VARCHAR(160),
    work_center_ref                VARCHAR(160),
    machine_ref                    VARCHAR(160),
    operator_ref                   VARCHAR(160),
    material_lot_ref               VARCHAR(160),
    tool_ref                       VARCHAR(160),
    nc_program_ref                 VARCHAR(160),
    inspection_ref                 VARCHAR(160),
    quality_case_ref               VARCHAR(160),
    source_system                  VARCHAR(80) NOT NULL DEFAULT 'mom',
    source_aggregate_type          VARCHAR(80) NOT NULL,
    source_aggregate_ref           VARCHAR(160) NOT NULL,
    occurred_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    command_correlation_id         VARCHAR(160),
    idempotency_key                VARCHAR(255),
    payload                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mes_runtime_event_idempotency
    ON mes_runtime_event_spine (source_system, source_aggregate_type, source_aggregate_ref, event_type, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_runtime_event_wo
    ON mes_runtime_event_spine (work_order_ref, occurred_at DESC)
    WHERE work_order_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_runtime_event_quality
    ON mes_runtime_event_spine (quality_case_ref, occurred_at DESC)
    WHERE quality_case_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_runtime_event_machine
    ON mes_runtime_event_spine (machine_ref, occurred_at DESC)
    WHERE machine_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_runtime_event_material_lot
    ON mes_runtime_event_spine (material_lot_ref, occurred_at DESC)
    WHERE material_lot_ref IS NOT NULL;

COMMENT ON TABLE resource_readiness_snapshot IS
    'Command-time immutable readiness decision snapshot for WO release/start and MES runtime gates.';

COMMENT ON TABLE mes_runtime_event_spine IS
    'Append-only MES runtime event spine for readiness, start, material, tool, program, inspection and containment events.';

COMMIT;
