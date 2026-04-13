-- Migration: 107_phase1_shopfloor_execution_bridge.sql
-- Description: Transactional PostgreSQL bridge for Phase 1 CNC dispatch execution facts.
-- Dependencies: 043_production_dispatch_shift_targets.sql, 070_enterprise_governance_uplift.sql, 079_foundation_governance_contract_hardening.sql
-- Rollback: DROP TABLE IF EXISTS shift_dispatch_execution_events CASCADE; DROP TABLE IF EXISTS shift_production_report_events CASCADE;

BEGIN;

INSERT INTO source_system_registry (
    source_system,
    source_system_name,
    source_system_name_vi,
    source_system_category,
    ownership_team,
    synchronization_mode,
    trust_level,
    source_status,
    metadata
) VALUES (
    'mom.dispatch',
    'MOM Dispatch Manual Execution',
    'Thuc thi thu cong MOM Dispatch',
    'mes',
    'manufacturing_platform',
    'event_driven',
    'system_of_record',
    'active',
    '{"phase":"phase1_cnc_manual_input","ot_boundary":"manual_capture_no_machine_control"}'::jsonb
) ON CONFLICT (source_system) DO NOTHING;

ALTER TABLE shift_targets
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'mom.dispatch',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'phase1_dispatch_target.v1';

ALTER TABLE shift_production_log
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(40) NOT NULL DEFAULT 'mom.dispatch',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(40) NOT NULL DEFAULT 'phase1_dispatch_production_log.v1',
    ADD COLUMN IF NOT EXISTS execution_event_type VARCHAR(30) NOT NULL DEFAULT 'progress',
    ADD COLUMN IF NOT EXISTS report_mode VARCHAR(30) NOT NULL DEFAULT 'snapshot',
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(200),
    ADD COLUMN IF NOT EXISTS report_fingerprint VARCHAR(128),
    ADD COLUMN IF NOT EXISTS client_report_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_production_log_source
    ON shift_production_log (source_system, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_production_log_idempotency
    ON shift_production_log (source_system, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_production_log_scope
    ON shift_production_log (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_targets_source
    ON shift_targets (source_system, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_targets_phase1_scope
    ON shift_targets (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);

CREATE TABLE IF NOT EXISTS shift_production_report_events (
    production_report_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system              VARCHAR(40)  NOT NULL DEFAULT 'mom.dispatch',
    source_event_id            VARCHAR(120) NOT NULL,
    target_source_record_id    VARCHAR(120) NOT NULL,
    log_source_record_id       VARCHAR(120),
    event_type                 VARCHAR(80)  NOT NULL,
    execution_event_type       VARCHAR(30)  NOT NULL DEFAULT 'progress',
    report_mode                VARCHAR(30)  NOT NULL DEFAULT 'snapshot',
    idempotency_key            VARCHAR(200),
    report_fingerprint         VARCHAR(128),
    occurred_at                TIMESTAMPTZ,
    recorded_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload                    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload_schema_version     VARCHAR(40) NOT NULL DEFAULT 'phase1_shopfloor_execution_event.v1',
    UNIQUE (source_system, source_event_id)
);

ALTER TABLE shift_production_report_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_shift_report_events_target
    ON shift_production_report_events (source_system, target_source_record_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_shift_report_events_scope
    ON shift_production_report_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);

CREATE INDEX IF NOT EXISTS idx_shift_report_events_lineage
    ON shift_production_report_events (source_system, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_report_events_log
    ON shift_production_report_events (source_system, log_source_record_id);

CREATE INDEX IF NOT EXISTS idx_shift_report_events_idempotency
    ON shift_production_report_events (source_system, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_report_events_payload
    ON shift_production_report_events USING GIN (payload);

DROP TRIGGER IF EXISTS trg_shift_report_events_row_version ON shift_production_report_events;
CREATE TRIGGER trg_shift_report_events_row_version
    BEFORE UPDATE ON shift_production_report_events
    FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMENT ON TABLE shift_production_report_events IS
    'Append-only manual shopfloor production report events mirrored from dispatch/production_report_events.json.';

CREATE TABLE IF NOT EXISTS shift_dispatch_execution_events (
    dispatch_execution_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system              VARCHAR(40)  NOT NULL DEFAULT 'mom.dispatch',
    source_event_id            VARCHAR(120) NOT NULL,
    target_source_record_id    VARCHAR(120),
    event_type                 VARCHAR(80)  NOT NULL,
    target_status              VARCHAR(40),
    execution_state            VARCHAR(40),
    actor_id                   VARCHAR(80),
    occurred_at                TIMESTAMPTZ,
    recorded_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload                    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload_schema_version     VARCHAR(60) NOT NULL DEFAULT 'phase1_dispatch_execution_event.v1',
    UNIQUE (source_system, source_event_id)
);

ALTER TABLE shift_dispatch_execution_events
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_shift_dispatch_execution_events_target
    ON shift_dispatch_execution_events (source_system, target_source_record_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_shift_dispatch_execution_events_scope
    ON shift_dispatch_execution_events (org_company_code, org_legal_entity_code, org_plant_id, org_site_id);

CREATE INDEX IF NOT EXISTS idx_shift_dispatch_execution_events_lineage
    ON shift_dispatch_execution_events (source_system, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_dispatch_execution_events_type
    ON shift_dispatch_execution_events (source_system, event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_shift_dispatch_execution_events_payload
    ON shift_dispatch_execution_events USING GIN (payload);

DROP TRIGGER IF EXISTS trg_shift_dispatch_execution_events_row_version ON shift_dispatch_execution_events;
CREATE TRIGGER trg_shift_dispatch_execution_events_row_version
    BEFORE UPDATE ON shift_dispatch_execution_events
    FOR EACH ROW EXECUTE FUNCTION set_row_version();

COMMENT ON TABLE shift_dispatch_execution_events IS
    'Append-only dispatch target lifecycle and production-reference events mirrored from dispatch/execution_events.json.';

COMMIT;
