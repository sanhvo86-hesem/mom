-- ============================================================================
-- Migration 109: Control Plane Cutover Hardening
-- ============================================================================
-- Purpose:
--   Close second-pass re-audit gaps without removing legacy tables abruptly.
--   This migration adds executable cutover ledgers for governed route blocking,
--   command handlers, periodic evaluation, emergency/rollback change control,
--   and expanded genealogy facts.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS governed_route_registry (
    governed_route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_company_code TEXT,
    org_legal_entity_code TEXT,
    org_plant_id UUID,
    org_site_id UUID,
    route_pattern TEXT NOT NULL,
    http_method TEXT NOT NULL DEFAULT '*',
    object_type TEXT NOT NULL,
    mutation_class TEXT NOT NULL
        CHECK (mutation_class IN ('create', 'update', 'delete', 'transition', 'finalize', 'amend', 'publish', 'release', 'import')),
    required_command_name TEXT NOT NULL,
    route_state TEXT NOT NULL DEFAULT 'blocked'
        CHECK (route_state IN ('blocked', 'compat_read_only', 'command_authoritative', 'retired')),
    legacy_owner TEXT,
    sunset_at TIMESTAMPTZ,
    source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    source_record_id TEXT,
    payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    row_version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (route_pattern, http_method, mutation_class)
);

CREATE TABLE IF NOT EXISTS legacy_authority_sunset (
    legacy_authority_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_company_code TEXT,
    org_legal_entity_code TEXT,
    org_plant_id UUID,
    org_site_id UUID,
    legacy_surface TEXT NOT NULL UNIQUE,
    legacy_storage TEXT NOT NULL,
    replacement_service TEXT NOT NULL,
    replacement_table_set JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_mode TEXT NOT NULL DEFAULT 'read_only_compatibility'
        CHECK (allowed_mode IN ('read_only_compatibility', 'import_only', 'blocked', 'retired')),
    sunset_state TEXT NOT NULL DEFAULT 'active'
        CHECK (sunset_state IN ('active', 'migration_in_progress', 'sunset_complete', 'exception')),
    owner TEXT NOT NULL DEFAULT 'platform',
    sunset_due_at TIMESTAMPTZ,
    exception_reason TEXT,
    source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    source_record_id TEXT,
    payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    row_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_plane_command_handlers (
    command_handler_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_company_code TEXT,
    org_legal_entity_code TEXT,
    org_plant_id UUID,
    org_site_id UUID,
    command_name TEXT NOT NULL,
    handler_key TEXT NOT NULL,
    handler_state TEXT NOT NULL DEFAULT 'active'
        CHECK (handler_state IN ('active', 'paused', 'retired')),
    required_role_set JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_guard_set JSONB NOT NULL DEFAULT '[]'::jsonb,
    emitted_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    idempotency_scope TEXT NOT NULL DEFAULT 'command_name',
    source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    source_record_id TEXT,
    payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    row_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (command_name, handler_key)
);

ALTER TABLE eqms_command_ledger ADD COLUMN IF NOT EXISTS handler_key TEXT;
ALTER TABLE eqms_command_ledger ADD COLUMN IF NOT EXISTS governed_route_id UUID REFERENCES governed_route_registry(governed_route_id);
ALTER TABLE eqms_command_ledger ADD COLUMN IF NOT EXISTS completion_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_eqms_command_ledger_handler_state
    ON eqms_command_ledger (handler_key, command_state, created_at DESC);

CREATE TABLE IF NOT EXISTS periodic_evaluations (
    periodic_evaluation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_scope TEXT NOT NULL
        CHECK (evaluation_scope IN ('evidence_record', 'change_order', 'document_revision', 'publication', 'genealogy_graph', 'system_integrity')),
    scope_ref TEXT NOT NULL,
    evaluation_state TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (evaluation_state IN ('scheduled', 'in_progress', 'passed', 'failed', 'overdue', 'waived')),
    due_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_role TEXT,
    assigned_user_id UUID REFERENCES users(user_id),
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    integrity_digest_id UUID REFERENCES integrity_digests(integrity_digest_id),
    audit_pack_export_id UUID REFERENCES audit_pack_exports(audit_pack_export_id),
    waiver_signature_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (evaluation_scope, scope_ref, due_at)
);

CREATE TABLE IF NOT EXISTS emergency_change_controls (
    emergency_change_control_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id),
    emergency_state TEXT NOT NULL DEFAULT 'declared'
        CHECK (emergency_state IN ('declared', 'approved_for_use', 'contained', 'normalized', 'rejected', 'rolled_back')),
    declared_reason TEXT NOT NULL,
    risk_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_followup_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    declared_by UUID REFERENCES users(user_id),
    declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    normalized_by UUID REFERENCES users(user_id),
    normalized_at TIMESTAMPTZ,
    signature_event_id UUID,
    CHECK (emergency_state NOT IN ('approved_for_use', 'normalized') OR signature_event_id IS NOT NULL),
    UNIQUE (plm_change_order_id)
);

CREATE TABLE IF NOT EXISTS rollback_requirements (
    rollback_requirement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id),
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    rollback_state TEXT NOT NULL DEFAULT 'required'
        CHECK (rollback_state IN ('required', 'planned', 'approved', 'executed', 'waived', 'not_required')),
    rollback_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_evidence_record_id UUID REFERENCES evidence_records(evidence_record_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    waiver_signature_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plm_change_order_id, object_type, object_id)
);

CREATE TABLE IF NOT EXISTS genealogy_edge_facts (
    genealogy_edge_fact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_fact_type TEXT NOT NULL
        CHECK (edge_fact_type IN ('consume', 'produce', 'split', 'merge', 'rework', 'hold', 'release', 'quarantine', 'scrap', 'supersede', 'ship', 'inspect', 'measure')),
    from_object_type TEXT NOT NULL,
    from_object_id TEXT NOT NULL,
    to_object_type TEXT NOT NULL,
    to_object_id TEXT NOT NULL,
    quantity NUMERIC,
    uom TEXT,
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_at TIMESTAMPTZ,
    superseded_at TIMESTAMPTZ,
    evidence_record_id UUID REFERENCES evidence_records(evidence_record_id),
    change_order_id UUID REFERENCES plm_change_orders(plm_change_order_id),
    source_event_id TEXT,
    fact_state TEXT NOT NULL DEFAULT 'active'
        CHECK (fact_state IN ('active', 'superseded', 'voided')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (edge_fact_type, from_object_type, from_object_id, to_object_type, to_object_id, source_event_id)
);

CREATE TABLE IF NOT EXISTS traceability_5m_obligations (
    traceability_5m_obligation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_company_code TEXT,
    org_legal_entity_code TEXT,
    org_plant_id UUID,
    org_site_id UUID,
    operation_class TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    material_required BOOLEAN NOT NULL DEFAULT true,
    machine_required BOOLEAN NOT NULL DEFAULT true,
    method_required BOOLEAN NOT NULL DEFAULT true,
    measurement_required BOOLEAN NOT NULL DEFAULT true,
    manpower_required BOOLEAN NOT NULL DEFAULT true,
    gate_state TEXT NOT NULL DEFAULT 'pending'
        CHECK (gate_state IN ('pending', 'complete', 'blocked', 'waived')),
    missing_context JSONB NOT NULL DEFAULT '[]'::jsonb,
    waiver_signature_event_id UUID,
    decided_at TIMESTAMPTZ,
    source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    source_record_id TEXT,
    payload_schema_version TEXT NOT NULL DEFAULT 'traceability_5m_obligation.v1',
    row_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (operation_class, object_type, object_id)
);

ALTER TABLE governed_route_registry
    ADD COLUMN IF NOT EXISTS org_company_code TEXT,
    ADD COLUMN IF NOT EXISTS org_legal_entity_code TEXT,
    ADD COLUMN IF NOT EXISTS org_plant_id UUID,
    ADD COLUMN IF NOT EXISTS org_site_id UUID,
    ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE legacy_authority_sunset
    ADD COLUMN IF NOT EXISTS org_company_code TEXT,
    ADD COLUMN IF NOT EXISTS org_legal_entity_code TEXT,
    ADD COLUMN IF NOT EXISTS org_plant_id UUID,
    ADD COLUMN IF NOT EXISTS org_site_id UUID,
    ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE control_plane_command_handlers
    ADD COLUMN IF NOT EXISTS org_company_code TEXT,
    ADD COLUMN IF NOT EXISTS org_legal_entity_code TEXT,
    ADD COLUMN IF NOT EXISTS org_plant_id UUID,
    ADD COLUMN IF NOT EXISTS org_site_id UUID,
    ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS payload_schema_version TEXT NOT NULL DEFAULT 'control_plane_cutover.v1',
    ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE traceability_5m_obligations
    ADD COLUMN IF NOT EXISTS org_company_code TEXT,
    ADD COLUMN IF NOT EXISTS org_legal_entity_code TEXT,
    ADD COLUMN IF NOT EXISTS org_plant_id UUID,
    ADD COLUMN IF NOT EXISTS org_site_id UUID,
    ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS payload_schema_version TEXT NOT NULL DEFAULT 'traceability_5m_obligation.v1',
    ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE VIEW canonical_outbox_legacy_bridge AS
SELECT
    outbox_event_id AS legacy_event_id,
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    idempotency_key,
    correlation_id,
    outbox_state AS status,
    attempt_count AS attempts,
    occurred_at,
    updated_at
FROM outbox_events
WHERE payload_schema_version = 'legacy_domain_outbox_bridge.v1';

INSERT INTO legacy_authority_sunset
    (legacy_surface, legacy_storage, replacement_service, replacement_table_set, allowed_mode, owner)
VALUES
    ('EvidenceVaultService', 'data/evidence/vault.json|custody.json|links.json', 'EvidenceFinalizationService', '["evidence_records","evidence_versions","evidence_artifacts","signature_events"]'::jsonb, 'import_only', 'qms'),
    ('WorkflowEngine', 'data/workflows/*.json', 'ControlPlaneCommandService', '["eqms_command_ledger","state_transition_events","control_plane_object_registry"]'::jsonb, 'read_only_compatibility', 'platform'),
    ('FormController', 'form_control_registry.json|record_counters.json|online-forms/entries', 'FormIssuanceService|SubmissionAttemptService|EvidenceFinalizationService', '["frm_issuances","frm_submission_attempts","evidence_records","evidence_versions"]'::jsonb, 'read_only_compatibility', 'qms'),
    ('ProductPassportController', 'data/passports/*.json', 'GenealogyGraphService', '["genealogy_nodes","genealogy_edges","genealogy_edge_facts","as_manufactured_snapshots"]'::jsonb, 'read_only_compatibility', 'mes')
ON CONFLICT (legacy_surface) DO UPDATE
SET replacement_service = EXCLUDED.replacement_service,
    replacement_table_set = EXCLUDED.replacement_table_set,
    allowed_mode = EXCLUDED.allowed_mode,
    updated_at = now();

COMMIT;
