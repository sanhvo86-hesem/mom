-- V4 UOM consolidation: register UOM as a direct runtime authority, not an MDA bridge.

BEGIN;

INSERT INTO governed_entity_registry
    (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    (
        'uom_runtime_authority',
        'uom',
        'domain_command_uom_measurement',
        'evidence_record',
        'domain_command_required',
        '[
            "ReceiveInventoryCommand",
            "PutawayInventoryCommand",
            "MoveInventoryCommand",
            "IssueMaterialToWorkOrderCommand",
            "SplitLotCommand",
            "MergeLotCommand",
            "CompleteToStockCommand",
            "ScrapInventoryCommand",
            "ReworkInventoryCommand",
            "AdjustInventoryWithApprovalCommand",
            "PostInventoryLedgerTransactionCommand",
            "CompleteOperationCommand",
            "RecordInspectionResultCommand",
            "CostRollupCommand",
            "ShipmentPackCommand",
            "ToolPresetMeasurementCommand"
        ]'::jsonb
    )
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    classification = EXCLUDED.classification,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = NOW();

DO $$
BEGIN
    IF to_regclass('domain_command_uom_measurement') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_governed_generic_crud_guard ON domain_command_uom_measurement';
        EXECUTE 'CREATE TRIGGER trg_governed_generic_crud_guard BEFORE INSERT OR UPDATE OR DELETE ON domain_command_uom_measurement FOR EACH ROW EXECUTE FUNCTION hesem_governed_generic_crud_guard()';
    END IF;
END;
$$;

COMMIT;
