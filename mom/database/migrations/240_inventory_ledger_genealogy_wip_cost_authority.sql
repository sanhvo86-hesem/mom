-- ============================================================================
-- Migration 240: Inventory ledger, genealogy, WIP and cost authority gates
-- ============================================================================
-- Purpose:
--   Close the P36 runtime-authority slice for inventory movements:
--   1) material movement commands have a domain packet for idempotency evidence;
--   2) WIP/cost/inventory posting plans can be reconciled as one ledger packet;
--   3) balance tables are guarded as projections, not mutation authority;
--   4) inventory reconciliation and recall evidence exports have physical anchors.
--
-- Data safety:
--   Additive migration plus projection guards. Projection rebuild commands must
--   SET LOCAL app.inventory_projection_refresh = 'on' before writing balances.
--   Raw table writes without that setting fail closed.
--
-- Rollback:
--   DROP TABLE IF EXISTS inventory_recall_evidence_export,
--     inventory_period_close_gate, inventory_reconciliation_discrepancy,
--     inventory_reconciliation_run, inventory_ledger_posting_packet,
--     inventory_ledger_command_packet CASCADE;
--   DROP FUNCTION IF EXISTS inventory_projection_mutation_guard();
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inventory_ledger_command_packet (
    inventory_ledger_command_packet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name                       VARCHAR(80) NOT NULL
        CHECK (command_name IN (
            'IssueMaterialToWorkOrder',
            'ReceivePurchaseOrder',
            'PutawayInventory',
            'TransferInventory',
            'AdjustInventory',
            'SplitLot',
            'MergeLot',
            'ProduceOutputLotSerial',
            'CompleteOperation',
            'PostInventoryCost',
            'RunInventoryReconciliation',
            'SimulateRecall'
        )),
    scope_key                          TEXT NOT NULL,
    scope_key_hash                     CHAR(64) GENERATED ALWAYS AS (encode(digest(scope_key, 'sha256'), 'hex')) STORED,
    idempotency_key                    VARCHAR(255) NOT NULL,
    request_hash_sha256                CHAR(64) NOT NULL,
    command_state                      VARCHAR(30) NOT NULL DEFAULT 'planned'
        CHECK (command_state IN ('planned', 'in_progress', 'posted', 'replayed', 'blocked', 'failed', 'reconciled')),
    actor_ref                          VARCHAR(120),
    correlation_id                     VARCHAR(120),
    evidence_record_id                 UUID,
    result_hash_sha256                 CHAR(64),
    failure_code                       VARCHAR(120),
    payload                            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at                       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_command_packet_scope_idempotency
    ON inventory_ledger_command_packet (scope_key_hash, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_inventory_command_packet_state
    ON inventory_ledger_command_packet (command_state, updated_at);

CREATE INDEX IF NOT EXISTS idx_inventory_command_packet_correlation
    ON inventory_ledger_command_packet (correlation_id)
    WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory_ledger_posting_packet (
    inventory_ledger_posting_packet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_ledger_command_packet_id UUID REFERENCES inventory_ledger_command_packet(inventory_ledger_command_packet_id),
    posting_kind                       VARCHAR(60) NOT NULL
        CHECK (posting_kind IN (
            'receipt',
            'putaway',
            'issue_to_wip',
            'transfer',
            'adjustment',
            'lot_split',
            'lot_merge',
            'completion',
            'scrap',
            'cost_post',
            'reconciliation_adjustment'
        )),
    source_aggregate_type              VARCHAR(80) NOT NULL,
    source_aggregate_ref               VARCHAR(160) NOT NULL,
    item_ref                           VARCHAR(120) NOT NULL,
    item_revision_ref                  VARCHAR(120),
    warehouse_ref                      VARCHAR(120),
    location_ref                       VARCHAR(120),
    lot_ref                            VARCHAR(120),
    serial_ref                         VARCHAR(120),
    container_ref                      VARCHAR(120),
    qty_delta                          NUMERIC(18,6),
    source_uom                         VARCHAR(40),
    normalized_qty_delta               NUMERIC(18,6),
    normalized_uom                     VARCHAR(40),
    unit_cost_amount                   NUMERIC(18,6),
    cost_amount                        NUMERIC(18,6),
    currency_code                      VARCHAR(10) NOT NULL DEFAULT 'VND',
    period_code                        VARCHAR(40),
    period_state                       VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (period_state IN ('open', 'closed', 'exception_approved')),
    posting_state                      VARCHAR(30) NOT NULL DEFAULT 'planned'
        CHECK (posting_state IN ('planned', 'posted', 'replayed', 'blocked', 'reconciled', 'reversed')),
    inventory_ledger_ref               UUID,
    wip_ledger_ref                     UUID,
    cost_ledger_ref                    UUID,
    genealogy_edge_fact_ref            UUID,
    occurred_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    posting_hash_sha256                CHAR(64) NOT NULL,
    metadata                           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_posting_packet_hash
    ON inventory_ledger_posting_packet (posting_hash_sha256);

CREATE INDEX IF NOT EXISTS idx_inventory_posting_packet_lot
    ON inventory_ledger_posting_packet (lot_ref, serial_ref, occurred_at)
    WHERE lot_ref IS NOT NULL OR serial_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_posting_packet_period
    ON inventory_ledger_posting_packet (period_code, period_state, posting_state);

CREATE TABLE IF NOT EXISTS inventory_reconciliation_run (
    inventory_reconciliation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_scope                       VARCHAR(80) NOT NULL,
    period_code                     VARCHAR(40),
    run_state                       VARCHAR(30) NOT NULL DEFAULT 'planned'
        CHECK (run_state IN ('planned', 'running', 'passed', 'failed', 'blocked_close')),
    ledger_hash_sha256              CHAR(64),
    projection_hash_sha256          CHAR(64),
    mismatch_count                  INT NOT NULL DEFAULT 0,
    blocks_period_close             BOOLEAN NOT NULL DEFAULT true,
    started_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at                    TIMESTAMPTZ,
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_inventory_reconciliation_run_period
    ON inventory_reconciliation_run (period_code, run_state, completed_at);

CREATE TABLE IF NOT EXISTS inventory_reconciliation_discrepancy (
    inventory_reconciliation_discrepancy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_reconciliation_run_id        UUID NOT NULL REFERENCES inventory_reconciliation_run(inventory_reconciliation_run_id) ON DELETE CASCADE,
    discrepancy_type                       VARCHAR(60) NOT NULL
        CHECK (discrepancy_type IN (
            'ledger_projection_delta',
            'lot_status_mismatch',
            'container_child_parity',
            'cost_wip_delta',
            'genealogy_gap'
        )),
    item_ref                               VARCHAR(120),
    lot_ref                                VARCHAR(120),
    serial_ref                             VARCHAR(120),
    container_ref                          VARCHAR(120),
    ledger_qty                             NUMERIC(18,6),
    projection_qty                         NUMERIC(18,6),
    delta_qty                              NUMERIC(18,6),
    severity_code                          VARCHAR(30) NOT NULL DEFAULT 'major'
        CHECK (severity_code IN ('minor', 'major', 'critical')),
    resolution_state                       VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (resolution_state IN ('open', 'under_review', 'resolved', 'accepted_exception')),
    metadata                               JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_inventory_reconciliation_discrepancy_run
    ON inventory_reconciliation_discrepancy (inventory_reconciliation_run_id, resolution_state, severity_code);

CREATE TABLE IF NOT EXISTS inventory_period_close_gate (
    inventory_period_close_gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_code                    VARCHAR(40) NOT NULL,
    ledger_scope                   VARCHAR(80) NOT NULL DEFAULT 'inventory',
    inventory_reconciliation_run_id UUID REFERENCES inventory_reconciliation_run(inventory_reconciliation_run_id),
    gate_state                     VARCHAR(30) NOT NULL DEFAULT 'blocked'
        CHECK (gate_state IN ('ready', 'blocked', 'waived')),
    block_reason_code              VARCHAR(120),
    evidence_record_id             UUID,
    signature_event_id             UUID,
    evaluated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (period_code, ledger_scope)
);

CREATE TABLE IF NOT EXISTS inventory_recall_evidence_export (
    inventory_recall_evidence_export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recall_scope_hash_sha256            CHAR(64) NOT NULL,
    search_criteria                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    backward_trace                      JSONB NOT NULL DEFAULT '[]'::jsonb,
    forward_trace                       JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_refs                       JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipment_refs                       JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_package_hash_sha256        CHAR(64) NOT NULL,
    export_state                        VARCHAR(30) NOT NULL DEFAULT 'generated'
        CHECK (export_state IN ('generated', 'reviewed', 'released', 'voided')),
    generated_by                        VARCHAR(120),
    generated_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_recall_export_scope_hash
    ON inventory_recall_evidence_export (recall_scope_hash_sha256, evidence_package_hash_sha256);

CREATE OR REPLACE FUNCTION inventory_projection_mutation_guard()
RETURNS trigger AS $$
BEGIN
    IF COALESCE(current_setting('app.inventory_projection_refresh', true), '') <> 'on' THEN
        RAISE EXCEPTION USING
            ERRCODE = '55000',
            MESSAGE = 'direct_inventory_projection_mutation_blocked',
            DETAIL = TG_TABLE_NAME || ' is projection-only; use InventoryLedgerAuthority command and projection refresh path.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.inventory_balance_snapshot') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_inventory_balance_snapshot_projection_guard ON inventory_balance_snapshot;
        CREATE TRIGGER trg_inventory_balance_snapshot_projection_guard
            BEFORE INSERT OR UPDATE OR DELETE ON inventory_balance_snapshot
            FOR EACH ROW EXECUTE FUNCTION inventory_projection_mutation_guard();
    END IF;

    IF to_regclass('public.location_balance') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_location_balance_projection_guard ON location_balance;
        CREATE TRIGGER trg_location_balance_projection_guard
            BEFORE INSERT OR UPDATE OR DELETE ON location_balance
            FOR EACH ROW EXECUTE FUNCTION inventory_projection_mutation_guard();
    END IF;

    IF to_regclass('public.stock_balances') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_stock_balances_projection_guard ON stock_balances;
        CREATE TRIGGER trg_stock_balances_projection_guard
            BEFORE INSERT OR UPDATE OR DELETE ON stock_balances
            FOR EACH ROW EXECUTE FUNCTION inventory_projection_mutation_guard();
    END IF;
END $$;

COMMENT ON TABLE inventory_ledger_command_packet IS
    'Domain inventory command packet: idempotency, request hash, actor, evidence, and outcome anchor before ledger posting.';

COMMENT ON TABLE inventory_ledger_posting_packet IS
    'Cross-ledger posting packet tying inventory, WIP, cost, and genealogy side effects to one command decision.';

COMMENT ON FUNCTION inventory_projection_mutation_guard() IS
    'Blocks direct writes to inventory balance projections unless a trusted projection refresh path sets app.inventory_projection_refresh=on.';

COMMIT;
