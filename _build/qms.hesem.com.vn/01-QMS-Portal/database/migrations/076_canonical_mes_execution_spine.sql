-- ============================================================================
-- Migration 076: Canonical MES Execution Spine
-- Description: Work orders, jobs, dispatch, machine/runtime events, labor capture, genealogy,
--              consumption, completion, scrap, and rework.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql,
--               074_canonical_engineering_definition.sql,
--               075_canonical_planning_erp_orchestration.sql
-- Rollback: DROP TABLE genealogy_link, rework, scrap, production_completion,
--           material_consumption, tool_usage, labor_capture, process_param_capture,
--           alarm_event, downtime_event, machine_event, job_event, dispatch_queue,
--           pause_resume, track_out, track_in, job, work_order CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS work_order (
    work_order_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_no            VARCHAR(80) NOT NULL UNIQUE,
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    operation_id             UUID REFERENCES operation(operation_id),
    planned_qty              NUMERIC(18,6) NOT NULL,
    release_state            VARCHAR(30) NOT NULL DEFAULT 'planned',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS job (
    job_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_no                   VARCHAR(80) NOT NULL UNIQUE,
    work_order_id            UUID NOT NULL REFERENCES work_order(work_order_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    planned_start_at         TIMESTAMPTZ,
    planned_end_at           TIMESTAMPTZ,
    current_state            VARCHAR(30) NOT NULL DEFAULT 'queued',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS track_in (
    track_in_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    tracked_by_party_id      UUID REFERENCES party(party_id),
    tracked_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS track_out (
    track_out_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    good_qty                 NUMERIC(18,6) NOT NULL DEFAULT 0,
    reject_qty               NUMERIC(18,6) NOT NULL DEFAULT 0,
    tracked_by_party_id      UUID REFERENCES party(party_id),
    tracked_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pause_resume (
    pause_resume_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    action_code              VARCHAR(20) NOT NULL,
    reason_code              VARCHAR(60),
    acted_by_party_id        UUID REFERENCES party(party_id),
    acted_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_queue (
    dispatch_queue_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id           UUID NOT NULL REFERENCES org_work_center(work_center_id),
    queue_date               DATE NOT NULL,
    dispatch_sequence        INTEGER NOT NULL,
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    dispatch_rule            VARCHAR(40) NOT NULL DEFAULT 'fifo',
    frozen_flag              BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (work_center_id, queue_date, dispatch_sequence)
);

CREATE TABLE IF NOT EXISTS job_event (
    job_event_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    event_type               VARCHAR(40) NOT NULL,
    operator_party_id        UUID REFERENCES party(party_id),
    event_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_value_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_system            VARCHAR(40) NOT NULL DEFAULT 'MES'
);

CREATE TABLE IF NOT EXISTS machine_event (
    machine_event_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    event_type               VARCHAR(40) NOT NULL,
    severity_code            VARCHAR(30) NOT NULL DEFAULT 'info',
    event_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason_code              VARCHAR(60),
    payload_json             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS downtime_event (
    downtime_event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    production_order_id      UUID REFERENCES production_order(production_order_id),
    reason_code              VARCHAR(60),
    started_at               TIMESTAMPTZ NOT NULL,
    ended_at                 TIMESTAMPTZ,
    duration_minutes         NUMERIC(18,2)
);

CREATE TABLE IF NOT EXISTS alarm_event (
    alarm_event_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_unit_id             UUID NOT NULL REFERENCES org_work_unit(work_unit_id),
    alarm_code               VARCHAR(80) NOT NULL,
    severity_code            VARCHAR(30),
    alarm_state              VARCHAR(30) NOT NULL DEFAULT 'active',
    occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    cleared_at               TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS process_param_capture (
    process_param_capture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    operation_id             UUID REFERENCES operation(operation_id),
    param_code               VARCHAR(80) NOT NULL,
    param_value_text         TEXT,
    param_value_num          NUMERIC(18,6),
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor_capture (
    labor_capture_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    labor_minutes            NUMERIC(18,2) NOT NULL,
    labor_type               VARCHAR(30) NOT NULL DEFAULT 'direct',
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_usage (
    tool_usage_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    tool_code                VARCHAR(80) NOT NULL,
    usage_cycles             INTEGER,
    usage_minutes            NUMERIC(18,2),
    captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_consumption (
    material_consumption_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    lot_no                   VARCHAR(120),
    serial_no                VARCHAR(120),
    consumed_qty             NUMERIC(18,6) NOT NULL,
    uom_code                 VARCHAR(20) REFERENCES uom(uom_code),
    consumed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_completion (
    production_completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                   UUID NOT NULL REFERENCES job(job_id),
    output_lot_no            VARCHAR(120),
    output_serial_no         VARCHAR(120),
    good_qty                 NUMERIC(18,6) NOT NULL DEFAULT 0,
    reject_qty               NUMERIC(18,6) NOT NULL DEFAULT 0,
    reported_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'reported'
);

CREATE TABLE IF NOT EXISTS scrap (
    scrap_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    job_id                   UUID REFERENCES job(job_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    lot_no                   VARCHAR(120),
    serial_no                VARCHAR(120),
    scrap_qty                NUMERIC(18,6) NOT NULL,
    reason_code              VARCHAR(60),
    scrapped_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rework (
    rework_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID NOT NULL REFERENCES production_order(production_order_id),
    job_id                   UUID REFERENCES job(job_id),
    source_entity_name       VARCHAR(80),
    source_entity_id         UUID,
    reason_code              VARCHAR(60),
    rework_status            VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genealogy_link (
    genealogy_link_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id      UUID REFERENCES production_order(production_order_id),
    parent_lot_no            VARCHAR(120),
    child_lot_no             VARCHAR(120),
    parent_serial_no         VARCHAR(120),
    child_serial_no          VARCHAR(120),
    link_type                VARCHAR(40) NOT NULL DEFAULT 'consume_to_output',
    linked_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
