-- Migration: 108_mobile_inspection_execution_bridge.sql
-- Description: Hardens mobile inspection capture as the Phase 1 quality bridge for manual CNC execution.
-- Dependencies: 042_fmea_apqp_control_plan_mobile.sql, 080_seed_master_data_from_json.sql
-- Rollback: DROP INDEX IF EXISTS idx_mobile_insp_metadata_thread; DROP INDEX IF EXISTS uq_mobile_insp_idempotency; DROP INDEX IF EXISTS uq_mobile_insp_client_capture;

BEGIN;

ALTER TABLE mobile_inspection_captures
    ADD COLUMN IF NOT EXISTS equipment_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS work_center_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS client_capture_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(200),
    ADD COLUMN IF NOT EXISTS inspection_fingerprint VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_insp_client_capture
    ON mobile_inspection_captures (operator_id, client_capture_id)
    WHERE client_capture_id IS NOT NULL AND client_capture_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_insp_idempotency
    ON mobile_inspection_captures (idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

CREATE INDEX IF NOT EXISTS idx_mobile_insp_metadata_thread
    ON mobile_inspection_captures (
        wo_number,
        operation_seq,
        capture_type,
        overall_result,
        work_center_id,
        equipment_id
    );

INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('blocking_reason_codes', 'BLK-MATL-WAIT', 'active', '{"reason_code":"BLK-MATL-WAIT","reason_name":"Material, fixture, or outsource lot not available","reason_name_vi":"Thiếu vật tư, đồ gá hoặc lô outsource","reason_group":"material","loss_class":"blocked","default_severity":"major","escalation_sla_minutes":30}'::jsonb),
  ('blocking_reason_codes', 'BLK-QUAL-HOLD', 'active', '{"reason_code":"BLK-QUAL-HOLD","reason_name":"Quality disposition, first-piece, or inspection release pending","reason_name_vi":"Chờ quyết định chất lượng, first-piece hoặc release kiểm tra","reason_group":"quality","loss_class":"blocked","default_severity":"major","escalation_sla_minutes":20}'::jsonb),
  ('blocking_reason_codes', 'BLK-ENG-CLARIFY', 'active', '{"reason_code":"BLK-ENG-CLARIFY","reason_name":"Engineering, drawing, setup, or CNC program clarification required","reason_name_vi":"Cần kỹ thuật làm rõ bản vẽ, setup hoặc chương trình CNC","reason_group":"engineering","loss_class":"blocked","default_severity":"major","escalation_sla_minutes":20}'::jsonb),
  ('blocking_reason_codes', 'BLK-OPERATOR-AUTH', 'active', '{"reason_code":"BLK-OPERATOR-AUTH","reason_name":"Qualified operator, certification, or supervisor authorization missing","reason_name_vi":"Thiếu thợ đủ năng lực, chứng nhận hoặc phê duyệt trưởng ca","reason_group":"labor","loss_class":"blocked","default_severity":"major","escalation_sla_minutes":15}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET status = EXCLUDED.status,
        data = EXCLUDED.data,
        updated_at = now();

COMMIT;
