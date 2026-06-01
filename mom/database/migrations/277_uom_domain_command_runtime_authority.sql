-- P46 repair: direct UOM runtime authority evidence for governed domain commands.

BEGIN;

CREATE TABLE IF NOT EXISTS domain_command_uom_measurement (
    measurement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_name TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    quantity_role TEXT NOT NULL DEFAULT 'primary',
    actor_id TEXT NOT NULL,
    item_id TEXT,
    work_order_ref TEXT,
    operation_ref TEXT,
    source_aggregate_type TEXT NOT NULL DEFAULT 'domain_command',
    source_aggregate_id TEXT NOT NULL,
    slot TEXT,
    context_code TEXT,
    input_magnitude TEXT NOT NULL,
    input_unit_code TEXT NOT NULL,
    input_raw_unit TEXT,
    target_unit_code TEXT NOT NULL,
    converted_magnitude TEXT NOT NULL,
    conversion_result_hash_sha256 CHAR(64) NOT NULL,
    measval_hash_sha256 CHAR(64) NOT NULL,
    uom_authority TEXT NOT NULL DEFAULT 'uom_runtime_authority',
    conversion_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (command_name, idempotency_key, quantity_role)
);

CREATE INDEX IF NOT EXISTS idx_domain_command_uom_measurement_command
    ON domain_command_uom_measurement (command_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_command_uom_measurement_aggregate
    ON domain_command_uom_measurement (source_aggregate_type, source_aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_command_uom_measurement_item
    ON domain_command_uom_measurement (item_id, target_unit_code, created_at DESC);

DROP TRIGGER IF EXISTS trg_domain_command_uom_measurement_immutable_update ON domain_command_uom_measurement;
CREATE TRIGGER trg_domain_command_uom_measurement_immutable_update
    BEFORE UPDATE ON domain_command_uom_measurement
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_domain_command_uom_measurement_immutable_delete ON domain_command_uom_measurement;
CREATE TRIGGER trg_domain_command_uom_measurement_immutable_delete
    BEFORE DELETE ON domain_command_uom_measurement
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

COMMIT;
