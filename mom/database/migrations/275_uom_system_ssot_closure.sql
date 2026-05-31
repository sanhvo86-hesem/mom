-- V4 UOM SSOT closure: every governed physical quantity points to UOM runtime evidence.

BEGIN;

ALTER TABLE cost_ledger
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT,
    ADD COLUMN IF NOT EXISTS quantity_magnitude NUMERIC(18,6),
    ADD COLUMN IF NOT EXISTS quantity_uom TEXT;

ALTER TABLE shipment_packages
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS ledger_line_role TEXT NOT NULL DEFAULT 'primary',
    ADD COLUMN IF NOT EXISTS item_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quantity NUMERIC(18,6),
    ADD COLUMN IF NOT EXISTS quantity_uom TEXT,
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_packages_command_idem_line
    ON shipment_packages (source_command_name, idempotency_key, ledger_line_role)
    WHERE source_command_name IS NOT NULL AND idempotency_key IS NOT NULL;

ALTER TABLE tooling_presets
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT,
    ADD COLUMN IF NOT EXISTS preset_length_uom TEXT,
    ADD COLUMN IF NOT EXISTS preset_diameter_uom TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tooling_presets_command_idem
    ON tooling_presets (source_command_name, idempotency_key)
    WHERE source_command_name IS NOT NULL AND idempotency_key IS NOT NULL;

ALTER TABLE tooling_life_measurements
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT,
    ADD COLUMN IF NOT EXISTS measurement_uom TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tooling_life_measurements_command_idem
    ON tooling_life_measurements (source_command_name, idempotency_key)
    WHERE source_command_name IS NOT NULL AND idempotency_key IS NOT NULL;

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    ('uom_runtime_authority', 'finance', 'cost_ledger', 'governed_root', 'domain_command_required', '["CostRollupCommand","IssueMaterialToWorkOrderCommand","CompleteToStockCommand","ScrapInventoryCommand","AdjustInventoryWithApprovalCommand"]'::jsonb),
    ('uom_runtime_authority', 'inventory_logistics', 'shipment_packages', 'governed_root', 'domain_command_required', '["ShipmentPackCommand"]'::jsonb),
    ('uom_runtime_authority', 'mes_execution', 'tooling_presets', 'governed_root', 'domain_command_required', '["ToolPresetMeasurementCommand"]'::jsonb),
    ('uom_runtime_authority', 'mes_execution', 'tooling_life_measurements', 'governed_root', 'domain_command_required', '["ToolPresetMeasurementCommand","CompleteOperationCommand"]'::jsonb),
    ('uom_runtime_authority', 'uom', 'uom_measurement_thread', 'evidence_record', 'domain_command_required', '["RecordInspectionResultCommand","ToolPresetMeasurementCommand"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    classification = EXCLUDED.classification,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = now();

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT table_name
          FROM governed_entity_registry
         WHERE root_code = 'uom_runtime_authority'
           AND active = TRUE
         ORDER BY table_name
    LOOP
        IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_governed_generic_crud_guard ON %I', v_table);
            EXECUTE format(
                'CREATE TRIGGER trg_governed_generic_crud_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hesem_governed_generic_crud_guard()',
                v_table
            );
        END IF;
    END LOOP;
END;
$$;

COMMIT;
