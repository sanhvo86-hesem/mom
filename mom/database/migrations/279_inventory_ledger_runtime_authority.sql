-- P54: Inventory, lot, serial, genealogy, WIP, and cost ledger runtime authority closure.

BEGIN;

ALTER TABLE inventory_ledger
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS ledger_line_role TEXT NOT NULL DEFAULT 'primary',
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT,
    ADD COLUMN IF NOT EXISTS quantity_uom TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_ledger_command_idem_line
    ON inventory_ledger (source_command_name, idempotency_key, ledger_line_role)
    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL;

ALTER TABLE wip_ledger
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS ledger_line_role TEXT NOT NULL DEFAULT 'primary',
    ADD COLUMN IF NOT EXISTS uom_measurement_id TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wip_ledger_command_idem_line
    ON wip_ledger (source_command_name, idempotency_key, ledger_line_role)
    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL;

ALTER TABLE cost_ledger
    ADD COLUMN IF NOT EXISTS source_command_name TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS ledger_line_role TEXT NOT NULL DEFAULT 'primary',
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_ledger_command_idem_line
    ON cost_ledger (source_command_name, idempotency_key, ledger_line_role)
    WHERE idempotency_key IS NOT NULL AND source_command_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory_reconciliation_run (
    reconciliation_run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_code TEXT NOT NULL,
    run_status TEXT NOT NULL DEFAULT 'running'
        CHECK (run_status IN ('running', 'pass', 'mismatch', 'failed')),
    ledger_hash_sha256 CHAR(64) NOT NULL,
    mismatch_count INTEGER NOT NULL DEFAULT 0,
    started_by TEXT NOT NULL,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (period_code, idempotency_key)
);

CREATE TABLE IF NOT EXISTS inventory_reconciliation_mismatch (
    mismatch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_run_id UUID NOT NULL REFERENCES inventory_reconciliation_run(reconciliation_run_id) ON DELETE CASCADE,
    mismatch_type TEXT NOT NULL,
    item_site_id TEXT,
    warehouse_id TEXT,
    lot_ref TEXT,
    serial_ref TEXT,
    ledger_qty NUMERIC(18,6),
    projection_qty NUMERIC(18,6),
    delta_qty NUMERIC(18,6),
    severity TEXT NOT NULL DEFAULT 'major'
        CHECK (severity IN ('minor', 'major', 'critical')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_period_close (
    inventory_period_close_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_code TEXT NOT NULL UNIQUE,
    close_status TEXT NOT NULL DEFAULT 'blocked'
        CHECK (close_status IN ('blocked', 'closed', 'reopened')),
    reconciliation_run_id UUID REFERENCES inventory_reconciliation_run(reconciliation_run_id),
    closed_by TEXT,
    signature_event_id UUID REFERENCES signature_events(signature_event_id),
    evidence_hash_sha256 CHAR(64),
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_recall_trace_export (
    recall_trace_export_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('lot', 'serial', 'container', 'work_order', 'shipment')),
    subject_ref TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('forward', 'backward', 'both')),
    trace_hash_sha256 CHAR(64) NOT NULL,
    exported_by TEXT NOT NULL,
    idempotency_key TEXT,
    trace_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subject_type, subject_ref, direction, idempotency_key)
);

CREATE OR REPLACE FUNCTION hesem_inventory_projection_write_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF COALESCE(current_setting('hesem.inventory_projection_writer', TRUE), '0') <> '1' THEN
        RAISE EXCEPTION 'ledger_only_projection: direct mutation is disabled for inventory projection table %', TG_TABLE_NAME
            USING ERRCODE = '42501',
                  DETAIL = 'Write inventory_ledger/wip_ledger/cost_ledger through InventoryCommandHandler, then refresh projections with an authorized projection writer.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY['stock_balances', 'inventory_balance_snapshot', 'location_balance']
    LOOP
        IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_inventory_projection_write_guard ON %I', v_table);
            EXECUTE format(
                'CREATE TRIGGER trg_inventory_projection_write_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hesem_inventory_projection_write_guard()',
                v_table
            );
        END IF;
    END LOOP;
END;
$$;

INSERT INTO governed_entity_registry (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_ledger', 'governed_root', 'domain_command_required', '["ReceiveInventoryCommand","PutawayInventoryCommand","MoveInventoryCommand","IssueMaterialToWorkOrderCommand","SplitLotCommand","MergeLotCommand","CompleteToStockCommand","ScrapInventoryCommand","ReworkInventoryCommand","AdjustInventoryWithApprovalCommand","PostInventoryLedgerTransactionCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'wip_ledger', 'governed_root', 'domain_command_required', '["IssueMaterialToWorkOrderCommand","CompleteToStockCommand","ScrapInventoryCommand","ReworkInventoryCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'finance', 'cost_ledger', 'governed_root', 'domain_command_required', '["IssueMaterialToWorkOrderCommand","CompleteToStockCommand","ScrapInventoryCommand","AdjustInventoryWithApprovalCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'stock_balances', 'projection_record', 'read_only_projection', '[]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_balance_snapshot', 'projection_record', 'read_only_projection', '[]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'location_balance', 'projection_record', 'read_only_projection', '[]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'genealogy_edge_facts', 'governed_root', 'domain_command_required', '["ReceiveInventoryCommand","IssueMaterialToWorkOrderCommand","SplitLotCommand","MergeLotCommand","CompleteToStockCommand","ScrapInventoryCommand","ExportRecallTraceCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_reconciliation_run', 'governed_root', 'domain_command_required', '["RunInventoryReconciliationCommand","CloseInventoryPeriodCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_reconciliation_mismatch', 'governed_root', 'domain_command_required', '["RunInventoryReconciliationCommand","CloseInventoryPeriodCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'inventory', 'inventory_period_close', 'governed_root', 'domain_command_required', '["CloseInventoryPeriodCommand"]'::jsonb),
    ('inventory_lot_serial_ledger', 'traceability_serialization', 'inventory_recall_trace_export', 'evidence_record', 'domain_command_required', '["ExportRecallTraceCommand"]'::jsonb)
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
         WHERE root_code = 'inventory_lot_serial_ledger'
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

WITH policy_seed(command_name, root, risk_class, signature_required, meanings) AS (
    VALUES
        ('AdjustInventoryWithApprovalCommand', 'inventory_ledger', 'critical', TRUE, ARRAY['inventory_adjustment_approval']::TEXT[]),
        ('CloseInventoryPeriodCommand', 'inventory_period_close', 'critical', TRUE, ARRAY['inventory_period_close']::TEXT[])
)
INSERT INTO regulated_action_policy
    (command_name, root, risk_class, signature_required, allowed_signature_meanings,
     sod_required, reauth_required, evidence_required, retention_days, validation_status,
     policy_hash_sha256, metadata)
SELECT
    command_name,
    root,
    risk_class,
    signature_required,
    to_jsonb(meanings),
    TRUE,
    TRUE,
    TRUE,
    3650,
    'pre_production_candidate',
    encode(digest(command_name || '|' || root || '|' || risk_class || '|' || signature_required::text || '|' || meanings::text, 'sha256'), 'hex'),
    jsonb_build_object('authority', 'P54 InventoryCommandHandler', 'posture', 'pre_production_candidate')
FROM policy_seed
ON CONFLICT (command_name) DO UPDATE SET
    root = EXCLUDED.root,
    risk_class = EXCLUDED.risk_class,
    signature_required = EXCLUDED.signature_required,
    allowed_signature_meanings = EXCLUDED.allowed_signature_meanings,
    policy_hash_sha256 = EXCLUDED.policy_hash_sha256,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
