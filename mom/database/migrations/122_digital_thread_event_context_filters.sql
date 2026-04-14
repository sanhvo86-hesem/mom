-- Migration 122: Digital thread event context filters
--
-- Extends the canonical manufacturing event ledger so MES/MOM history queries
-- can filter by 5M and as-manufactured context without scraping payload JSON.

ALTER TABLE mes_operational_event_ledger
    ADD COLUMN IF NOT EXISTS equipment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS operator_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS tool_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS process_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS material_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS material_lot_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS material_batch_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS batch_number VARCHAR(120),
    ADD COLUMN IF NOT EXISTS routing_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS setup_sheet_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS inspection_plan_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS nc_program_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS cnc_program_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_equipment
    ON mes_operational_event_ledger (equipment_id, occurred_at, recorded_at)
    WHERE equipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_operator
    ON mes_operational_event_ledger (operator_id, occurred_at, recorded_at)
    WHERE operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_tool
    ON mes_operational_event_ledger (tool_id, occurred_at, recorded_at)
    WHERE tool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_process
    ON mes_operational_event_ledger (process_id, routing_id, occurred_at, recorded_at)
    WHERE process_id IS NOT NULL OR routing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_material_context
    ON mes_operational_event_ledger (material_id, material_lot_id, material_batch_id, occurred_at, recorded_at)
    WHERE material_id IS NOT NULL OR material_lot_id IS NOT NULL OR material_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mes_operational_event_control_plan_context
    ON mes_operational_event_ledger (setup_sheet_id, inspection_plan_id, nc_program_id, cnc_program_id, occurred_at)
    WHERE setup_sheet_id IS NOT NULL
       OR inspection_plan_id IS NOT NULL
       OR nc_program_id IS NOT NULL
       OR cnc_program_id IS NOT NULL;

COMMENT ON COLUMN mes_operational_event_ledger.equipment_id IS
    'Machine/equipment context used for as-manufactured 5M traceability.';
COMMENT ON COLUMN mes_operational_event_ledger.operator_id IS
    'Personnel/operator context used for as-manufactured 5M traceability.';
COMMENT ON COLUMN mes_operational_event_ledger.tool_id IS
    'Tooling context used for as-manufactured 5M traceability.';
COMMENT ON COLUMN mes_operational_event_ledger.process_id IS
    'Method/process context used for as-manufactured 5M traceability.';
COMMENT ON COLUMN mes_operational_event_ledger.material_lot_id IS
    'Material lot context used for genealogy and as-manufactured traceability.';
