-- ============================================================================
-- Migration 239: Tooling, Gage, OOT And MSA Runtime Gates
-- ============================================================================
-- Purpose:
--   Add command-time authority targets for tool life stop policy, machine
--   compatibility, tool breakage suspect windows, gage MSA gates, and OOT
--   impacted-product scope.
--
-- Data safety:
--   Additive migration only. Existing tooling, calibration, MES and quality
--   tables are not mutated.
--
-- Rollback:
--   DROP TABLE IF EXISTS gage_oot_impact_scope CASCADE;
--   DROP TABLE IF EXISTS gage_msa_gate_policy CASCADE;
--   DROP TABLE IF EXISTS tool_breakage_suspect_window CASCADE;
--   DROP TABLE IF EXISTS tooling_machine_compatibility_rule CASCADE;
--   DROP TABLE IF EXISTS tooling_life_runtime_policy CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tooling_life_runtime_policy (
    tooling_life_runtime_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_ref                       VARCHAR(120) NOT NULL,
    tooling_assembly_ref           VARCHAR(120),
    policy_basis                   VARCHAR(30) NOT NULL
        CHECK (policy_basis IN ('parts', 'minutes', 'wear', 'percent_remaining')),
    warning_threshold              NUMERIC(18,6),
    stop_threshold                 NUMERIC(18,6) NOT NULL,
    policy_status                  VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (policy_status IN ('draft', 'active', 'superseded', 'retired')),
    effective_from                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                   TIMESTAMPTZ,
    approved_by                    VARCHAR(160),
    approved_at                    TIMESTAMPTZ,
    policy_hash_sha256             CHAR(64) NOT NULL CHECK (policy_hash_sha256 ~ '^[a-f0-9]{64}$'),
    metadata                       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tooling_life_runtime_policy_active
    ON tooling_life_runtime_policy (tool_ref, policy_basis)
    WHERE policy_status = 'active' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS tooling_machine_compatibility_rule (
    tooling_machine_compatibility_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_ref                              VARCHAR(120),
    tooling_assembly_ref                  VARCHAR(120),
    machine_family_code                   VARCHAR(120),
    equipment_ref                         VARCHAR(120),
    operation_ref                         VARCHAR(120),
    compatibility_status                  VARCHAR(30) NOT NULL DEFAULT 'approved'
        CHECK (compatibility_status IN ('draft', 'approved', 'blocked', 'superseded', 'retired')),
    effective_from                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                          TIMESTAMPTZ,
    approved_by                           VARCHAR(160),
    approved_at                           TIMESTAMPTZ,
    rule_hash_sha256                      CHAR(64) NOT NULL CHECK (rule_hash_sha256 ~ '^[a-f0-9]{64}$'),
    metadata                              JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (tool_ref IS NOT NULL OR tooling_assembly_ref IS NOT NULL),
    CHECK (machine_family_code IS NOT NULL OR equipment_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tooling_machine_compat_tool
    ON tooling_machine_compatibility_rule (tool_ref, compatibility_status)
    WHERE tool_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tooling_machine_compat_assembly
    ON tooling_machine_compatibility_rule (tooling_assembly_ref, compatibility_status)
    WHERE tooling_assembly_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS tool_breakage_suspect_window (
    tool_breakage_suspect_window_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breakage_event_ref              VARCHAR(160) NOT NULL,
    tool_ref                        VARCHAR(120) NOT NULL,
    tooling_assembly_ref            VARCHAR(120),
    equipment_ref                   VARCHAR(120),
    work_order_ref                  VARCHAR(160),
    job_ref                         VARCHAR(160),
    operation_ref                   VARCHAR(160),
    last_good_event_ref             VARCHAR(160),
    last_good_at                    TIMESTAMPTZ NOT NULL,
    breakage_at                     TIMESTAMPTZ NOT NULL,
    affected_work_order_refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_lot_refs               JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_serial_refs            JSONB NOT NULL DEFAULT '[]'::jsonb,
    containment_required            BOOLEAN NOT NULL DEFAULT true,
    quality_case_ref                VARCHAR(160),
    suspect_window_status           VARCHAR(30) NOT NULL DEFAULT 'containment_required'
        CHECK (suspect_window_status IN ('containment_required', 'under_review', 'released', 'scrapped', 'closed')),
    window_hash_sha256              CHAR(64) NOT NULL CHECK (window_hash_sha256 ~ '^[a-f0-9]{64}$'),
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (breakage_at >= last_good_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tool_breakage_suspect_window_event
    ON tool_breakage_suspect_window (breakage_event_ref);

CREATE INDEX IF NOT EXISTS idx_tool_breakage_suspect_window_tool
    ON tool_breakage_suspect_window (tool_ref, breakage_at DESC);

CREATE TABLE IF NOT EXISTS gage_msa_gate_policy (
    gage_msa_gate_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gage_ref                VARCHAR(120) NOT NULL,
    characteristic_ref      VARCHAR(160),
    measurement_system_ref  VARCHAR(160),
    max_grr_percent         NUMERIC(8,4) NOT NULL DEFAULT 30.0,
    min_ndc                 INTEGER NOT NULL DEFAULT 5,
    policy_status           VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (policy_status IN ('draft', 'active', 'superseded', 'retired')),
    effective_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to            TIMESTAMPTZ,
    approved_by             VARCHAR(160),
    approved_at             TIMESTAMPTZ,
    policy_hash_sha256      CHAR(64) NOT NULL CHECK (policy_hash_sha256 ~ '^[a-f0-9]{64}$'),
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (max_grr_percent > 0),
    CHECK (min_ndc >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gage_msa_gate_policy_active
    ON gage_msa_gate_policy (gage_ref, COALESCE(characteristic_ref, '*'), COALESCE(measurement_system_ref, '*'))
    WHERE policy_status = 'active' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS gage_oot_impact_scope (
    gage_oot_impact_scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oot_ref                  VARCHAR(160) NOT NULL,
    calibration_ref          VARCHAR(160),
    gage_ref                 VARCHAR(120) NOT NULL,
    last_known_good_at       TIMESTAMPTZ NOT NULL,
    oot_discovered_at        TIMESTAMPTZ NOT NULL,
    affected_work_order_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_lot_refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_serial_refs     JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_shipment_refs   JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_customer_refs   JSONB NOT NULL DEFAULT '[]'::jsonb,
    wip_containment_required BOOLEAN NOT NULL DEFAULT true,
    shipment_review_required BOOLEAN NOT NULL DEFAULT false,
    quality_case_ref         VARCHAR(160),
    impact_status            VARCHAR(30) NOT NULL DEFAULT 'containment_required'
        CHECK (impact_status IN ('containment_required', 'under_review', 'reinspection', 'customer_review', 'released', 'closed')),
    impact_hash_sha256       CHAR(64) NOT NULL CHECK (impact_hash_sha256 ~ '^[a-f0-9]{64}$'),
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (oot_discovered_at >= last_known_good_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gage_oot_impact_scope_ref
    ON gage_oot_impact_scope (oot_ref);

CREATE INDEX IF NOT EXISTS idx_gage_oot_impact_scope_gage
    ON gage_oot_impact_scope (gage_ref, oot_discovered_at DESC);

COMMENT ON TABLE tooling_life_runtime_policy IS
    'Runtime authority target for tool life stop/warning thresholds used by release/start gates.';

COMMENT ON TABLE tooling_machine_compatibility_rule IS
    'Runtime authority target for tool or assembly compatibility with machine family/equipment/operation.';

COMMENT ON TABLE tool_breakage_suspect_window IS
    'Containment window from last good checkpoint to detected tool breakage.';

COMMENT ON TABLE gage_msa_gate_policy IS
    'Runtime CTQ measurement gate policy for MSA/Gage R&R acceptability.';

COMMENT ON TABLE gage_oot_impact_scope IS
    'OOT impact scope for affected WIP, lots, serials, shipments and customer review.';

COMMIT;
