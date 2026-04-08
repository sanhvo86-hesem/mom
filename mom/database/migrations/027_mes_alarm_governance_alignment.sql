-- ============================================================================
-- Migration 027: Align mes_machine_alarms with governed MES runtime
-- Muc tieu: Bo sung cac cot ACK / escalation / WO context de shadow-sync va
--           runtime governance khong bi lech khi bat PostgreSQL.
-- ============================================================================

ALTER TABLE mes_machine_alarms
    ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(20),
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalation_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS escalated_by VARCHAR(20),
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS related_job_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_malm_ack
    ON mes_machine_alarms (equipment_id, acknowledged_at DESC);

CREATE INDEX IF NOT EXISTS idx_malm_job
    ON mes_machine_alarms (related_job_number, alarm_time DESC)
    WHERE related_job_number IS NOT NULL;
