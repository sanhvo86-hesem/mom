-- ============================================================================
-- Migration 108: World-Class Control Plane Execution Layer
-- ============================================================================
-- Purpose:
--   Turn the eQMS/MOM/PLM target architecture into executable control-plane
--   infrastructure. This migration is additive and assumes the canonical
--   spine from migration 106 remains the business authority.
--
-- Non-negotiable semantics:
--   - SharePoint remains publication/read-only only.
--   - Commands, not generic CRUD, are the mutation authority.
--   - Final evidence is package-centric.
--   - Post-release changes require exact released change authority.
--   - Genealogy projections are derived from authoritative records/events.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Wave 0: repo/source promotion discipline
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS release_manifests (
    release_manifest_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_ref              TEXT NOT NULL UNIQUE,
    source_commit_sha        TEXT NOT NULL,
    source_tree_hash_sha256  CHAR(64) NOT NULL,
    artifact_manifest        JSONB NOT NULL DEFAULT '{}'::jsonb,
    artifact_manifest_hash_sha256 CHAR(64) NOT NULL,
    promotion_scope          TEXT NOT NULL DEFAULT 'controlled_source'
        CHECK (promotion_scope IN ('controlled_source', 'runtime_config', 'schema_registry', 'publication_bundle')),
    manifest_state           TEXT NOT NULL DEFAULT 'draft'
        CHECK (manifest_state IN ('draft', 'reviewed', 'approved', 'promoted', 'rejected', 'superseded')),
    created_by               UUID REFERENCES users(user_id),
    reviewed_by              UUID REFERENCES users(user_id),
    approved_by              UUID REFERENCES users(user_id),
    signature_event_id       UUID,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at              TIMESTAMPTZ,
    approved_at              TIMESTAMPTZ,
    promoted_at              TIMESTAMPTZ,
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version              BIGINT NOT NULL DEFAULT 1,
    CHECK (manifest_state NOT IN ('approved', 'promoted') OR signature_event_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS promotion_receipts (
    promotion_receipt_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_manifest_id      UUID NOT NULL REFERENCES release_manifests(release_manifest_id),
    environment_code         TEXT NOT NULL,
    deployed_commit_sha      TEXT NOT NULL,
    deployed_manifest_hash_sha256 CHAR(64) NOT NULL,
    runtime_config_hash_sha256 CHAR(64),
    promotion_state          TEXT NOT NULL DEFAULT 'pending'
        CHECK (promotion_state IN ('pending', 'succeeded', 'failed', 'rolled_back')),
    promoted_by              UUID REFERENCES users(user_id),
    promoted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    receipt_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_code             TEXT,
    failure_message          TEXT,
    UNIQUE (release_manifest_id, environment_code)
);

CREATE TABLE IF NOT EXISTS reverse_sync_intakes (
    reverse_sync_intake_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intake_source            TEXT NOT NULL,
    source_uri               TEXT NOT NULL,
    source_hash_sha256       CHAR(64) NOT NULL,
    intake_class             TEXT NOT NULL
        CHECK (intake_class IN ('external_reference', 'operator_upload', 'm365_publication_receipt', 'vendor_package', 'break_glass')),
    disposition_state        TEXT NOT NULL DEFAULT 'quarantined'
        CHECK (disposition_state IN ('quarantined', 'accepted', 'rejected', 'superseded')),
    accepted_record_type     TEXT,
    accepted_record_id       TEXT,
    accepted_by              UUID REFERENCES users(user_id),
    accepted_at              TIMESTAMPTZ,
    reason                   TEXT,
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_boundary_violations (
    source_boundary_violation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path                     TEXT NOT NULL,
    violation_type           TEXT NOT NULL
        CHECK (violation_type IN ('runtime_artifact', 'generated_report', 'browser_output', 'prompt_file', 'deleted_archive', 'publication_output', 'unknown')),
    severity                 TEXT NOT NULL DEFAULT 'P1'
        CHECK (severity IN ('P0', 'P1', 'P2')),
    detection_source         TEXT NOT NULL DEFAULT 'repo_boundary_scanner',
    detected_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at              TIMESTAMPTZ,
    resolution_note          TEXT,
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (path, violation_type, resolved_at)
);

-- --------------------------------------------------------------------------
-- Wave 1: command authority, object registry, transition event store
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eqms_command_ledger (
    eqms_command_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_name             TEXT NOT NULL,
    command_version          INT NOT NULL DEFAULT 1 CHECK (command_version > 0),
    command_state            TEXT NOT NULL DEFAULT 'accepted'
        CHECK (command_state IN ('accepted', 'replayed', 'succeeded', 'failed', 'rejected')),
    idempotency_key          TEXT NOT NULL,
    actor_user_id            UUID REFERENCES users(user_id),
    actor_ref                TEXT,
    scope_key                TEXT NOT NULL,
    scope_key_hash_sha256    CHAR(64) NOT NULL,
    request_hash_sha256      CHAR(64) NOT NULL,
    response_hash_sha256     CHAR(64),
    correlation_id           TEXT,
    causation_id             TEXT,
    authority_context        JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code               TEXT,
    error_message            TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at             TIMESTAMPTZ,
    CHECK (actor_user_id IS NOT NULL OR NULLIF(trim(actor_ref), '') IS NOT NULL),
    UNIQUE (command_name, idempotency_key),
    UNIQUE (scope_key_hash_sha256, request_hash_sha256)
);

CREATE TABLE IF NOT EXISTS control_plane_object_registry (
    object_type              TEXT NOT NULL,
    object_id                TEXT NOT NULL,
    authoritative_table      TEXT NOT NULL,
    lifecycle_state          TEXT NOT NULL,
    current_version_id       TEXT,
    source_change_order_id   UUID REFERENCES plm_change_orders(plm_change_order_id),
    immutable_after_state    TEXT,
    retention_state          TEXT NOT NULL DEFAULT 'not_locked'
        CHECK (retention_state IN ('not_locked', 'retained', 'legal_hold', 'disposition_due', 'disposed')),
    publication_state        TEXT,
    row_version              BIGINT NOT NULL DEFAULT 1,
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (object_type, object_id)
);

CREATE TABLE IF NOT EXISTS state_transition_events (
    state_transition_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine                  TEXT NOT NULL,
    object_type              TEXT NOT NULL,
    object_id                TEXT NOT NULL,
    from_state               TEXT NOT NULL,
    to_state                 TEXT NOT NULL,
    guard_result             JSONB NOT NULL DEFAULT '{}'::jsonb,
    emitted_events           JSONB NOT NULL DEFAULT '[]'::jsonb,
    side_effects             JSONB NOT NULL DEFAULT '[]'::jsonb,
    command_id               UUID REFERENCES eqms_command_ledger(eqms_command_id),
    actor_user_id            UUID REFERENCES users(user_id),
    actor_ref                TEXT,
    occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_hash_sha256        CHAR(64) NOT NULL,
    prev_event_hash_sha256   CHAR(64),
    CHECK (actor_user_id IS NOT NULL OR NULLIF(trim(actor_ref), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_state_transition_events_object
    ON state_transition_events (object_type, object_id, occurred_at DESC);

-- Reconcile the 106 canonical outbox with handler/lease fields required by
-- publication, audit-pack, training, and genealogy workers.
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS handler_key TEXT;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS lease_owner TEXT;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS leased_until TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dead_letter_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_outbox_events_dedupe_key
    ON outbox_events (dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_events_handler_ready
    ON outbox_events (handler_key, outbox_state, next_attempt_at, occurred_at);

-- --------------------------------------------------------------------------
-- Wave 2: issuance, validation, duplicate detection, online runtime
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS submission_validation_results (
    submission_validation_result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frm_submission_attempt_id UUID NOT NULL REFERENCES frm_submission_attempts(frm_submission_attempt_id) ON DELETE CASCADE,
    validation_state          TEXT NOT NULL
        CHECK (validation_state IN ('passed', 'failed', 'warning', 'quarantined')),
    schema_version_id         UUID REFERENCES frm_schema_versions(frm_schema_version_id),
    validator_version         TEXT NOT NULL DEFAULT 'submission_validator.v1',
    canonical_payload_hash_sha256 CHAR(64),
    original_artifact_hash_sha256 CHAR(64),
    validation_summary        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (frm_submission_attempt_id, validator_version)
);

CREATE TABLE IF NOT EXISTS submission_validation_errors (
    submission_validation_error_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_validation_result_id UUID NOT NULL REFERENCES submission_validation_results(submission_validation_result_id) ON DELETE CASCADE,
    severity                  TEXT NOT NULL CHECK (severity IN ('blocker', 'error', 'warning', 'info')),
    error_code                TEXT NOT NULL,
    field_path                TEXT,
    message                   TEXT NOT NULL,
    remediation_hint          TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS duplicate_detection_fingerprints (
    duplicate_detection_fingerprint_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_scope          TEXT NOT NULL CHECK (fingerprint_scope IN ('issuance', 'form_family', 'subject', 'global')),
    fingerprint_type           TEXT NOT NULL CHECK (fingerprint_type IN ('artifact_hash', 'canonical_payload_hash', 'business_key')),
    fingerprint_value_sha256   CHAR(64) NOT NULL,
    frm_submission_attempt_id  UUID REFERENCES frm_submission_attempts(frm_submission_attempt_id),
    evidence_record_id         UUID REFERENCES evidence_records(evidence_record_id),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fingerprint_scope, fingerprint_type, fingerprint_value_sha256)
);

CREATE TABLE IF NOT EXISTS online_form_sessions (
    online_form_session_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frm_issuance_id            UUID NOT NULL REFERENCES frm_issuances(frm_issuance_id),
    session_state              TEXT NOT NULL DEFAULT 'draft'
        CHECK (session_state IN ('draft', 'validating', 'ready_to_finalize', 'finalized', 'cancelled', 'expired')),
    draft_payload              JSONB NOT NULL DEFAULT '{}'::jsonb,
    draft_payload_hash_sha256  CHAR(64),
    locked_payload_hash_sha256 CHAR(64),
    row_version                BIGINT NOT NULL DEFAULT 1,
    created_by                 UUID REFERENCES users(user_id),
    finalized_by               UUID REFERENCES users(user_id),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_at               TIMESTAMPTZ,
    CHECK (session_state <> 'finalized' OR locked_payload_hash_sha256 IS NOT NULL)
);

-- --------------------------------------------------------------------------
-- Wave 3: effectivity, WIP disposition, training/read acknowledgement gates
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS effectivity_conflicts (
    effectivity_conflict_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id        UUID REFERENCES plm_change_orders(plm_change_order_id),
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    conflict_type              TEXT NOT NULL
        CHECK (conflict_type IN ('overlap', 'gap', 'wip_collision', 'training_incomplete', 'read_ack_incomplete', 'obsolete_reference')),
    conflict_state             TEXT NOT NULL DEFAULT 'open'
        CHECK (conflict_state IN ('open', 'accepted_risk', 'resolved', 'cancelled')),
    conflict_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_by                UUID REFERENCES users(user_id),
    resolved_at                TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wip_dispositions (
    wip_disposition_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plm_change_order_id        UUID NOT NULL REFERENCES plm_change_orders(plm_change_order_id),
    wip_object_type            TEXT NOT NULL CHECK (wip_object_type IN ('work_order', 'job_order', 'lot', 'serial', 'purchase_order', 'inventory_lot')),
    wip_object_id              TEXT NOT NULL,
    disposition                TEXT NOT NULL CHECK (disposition IN ('use_as_is', 'rework', 'scrap', 'hold', 'convert_to_new_revision', 'ship_under_deviation')),
    disposition_state          TEXT NOT NULL DEFAULT 'planned'
        CHECK (disposition_state IN ('planned', 'approved', 'executed', 'waived', 'cancelled')),
    evidence_record_id         UUID REFERENCES evidence_records(evidence_record_id),
    approved_by                UUID REFERENCES users(user_id),
    approved_at                TIMESTAMPTZ,
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (plm_change_order_id, wip_object_type, wip_object_id)
);

CREATE TABLE IF NOT EXISTS training_gate_decisions (
    training_gate_decision_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    gate_scope                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    gate_state                 TEXT NOT NULL DEFAULT 'pending'
        CHECK (gate_state IN ('pending', 'complete', 'blocked', 'waived')),
    required_training          JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_training           JSONB NOT NULL DEFAULT '[]'::jsonb,
    waiver_signature_event_id  UUID,
    decided_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (object_type, object_id, gate_scope)
);

CREATE TABLE IF NOT EXISTS read_ack_gate_decisions (
    read_ack_gate_decision_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    gate_scope                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    gate_state                 TEXT NOT NULL DEFAULT 'pending'
        CHECK (gate_state IN ('pending', 'complete', 'blocked', 'waived')),
    required_doc_revisions     JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_acknowledgements   JSONB NOT NULL DEFAULT '[]'::jsonb,
    waiver_signature_event_id  UUID,
    decided_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (object_type, object_id, gate_scope)
);

-- --------------------------------------------------------------------------
-- Wave 4: publication attempts, receipts, immutable storage, audit packs
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS publication_attempts (
    publication_attempt_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_publication_id    UUID NOT NULL REFERENCES evidence_publications(evidence_publication_id) ON DELETE CASCADE,
    attempt_no                 INT NOT NULL CHECK (attempt_no > 0),
    attempt_state              TEXT NOT NULL DEFAULT 'started'
        CHECK (attempt_state IN ('started', 'succeeded', 'failed', 'dead_letter')),
    request_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code                 TEXT,
    error_message              TEXT,
    started_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at               TIMESTAMPTZ,
    UNIQUE (evidence_publication_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS publication_receipts (
    publication_receipt_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_publication_id    UUID NOT NULL REFERENCES evidence_publications(evidence_publication_id) ON DELETE CASCADE,
    target_type                TEXT NOT NULL CHECK (target_type IN ('sharepoint_graph', 'external_index', 'cache')),
    target_uri                 TEXT NOT NULL,
    target_hash_sha256         CHAR(64) NOT NULL,
    source_package_hash_sha256 CHAR(64) NOT NULL,
    receipt_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at                TIMESTAMPTZ,
    UNIQUE (evidence_publication_id, target_uri)
);

CREATE TABLE IF NOT EXISTS immutable_storage_objects (
    immutable_storage_object_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_adapter            TEXT NOT NULL,
    storage_uri                TEXT NOT NULL UNIQUE,
    object_hash_sha256         CHAR(64) NOT NULL,
    object_size_bytes          BIGINT NOT NULL CHECK (object_size_bytes >= 0),
    retention_mode             TEXT NOT NULL DEFAULT 'none'
        CHECK (retention_mode IN ('none', 'governance', 'compliance', 'legal_hold')),
    retain_until               TIMESTAMPTZ,
    object_lock_receipt        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_pack_exports (
    audit_pack_export_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    export_scope               TEXT NOT NULL CHECK (export_scope IN ('evidence_record', 'change_order', 'job', 'lot', 'serial', 'document_revision', 'periodic_evaluation')),
    scope_ref                  TEXT NOT NULL,
    export_state               TEXT NOT NULL DEFAULT 'queued'
        CHECK (export_state IN ('queued', 'building', 'ready', 'failed', 'expired')),
    requested_by               UUID REFERENCES users(user_id),
    requested_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at               TIMESTAMPTZ,
    package_uri                TEXT,
    package_hash_sha256        CHAR(64),
    manifest_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code                 TEXT,
    error_message              TEXT,
    CHECK (export_state <> 'ready' OR (package_uri IS NOT NULL AND package_hash_sha256 IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS legal_holds (
    legal_hold_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    hold_reference             TEXT NOT NULL,
    hold_state                 TEXT NOT NULL DEFAULT 'active'
        CHECK (hold_state IN ('active', 'released')),
    applied_by                 UUID REFERENCES users(user_id),
    applied_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_by                UUID REFERENCES users(user_id),
    released_at                TIMESTAMPTZ,
    reason                     TEXT NOT NULL,
    UNIQUE (object_type, object_id, hold_reference)
);

-- --------------------------------------------------------------------------
-- Wave 5: genealogy and digital-thread projections
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS genealogy_nodes (
    genealogy_node_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type                  TEXT NOT NULL
        CHECK (node_type IN ('job', 'work_order', 'operation', 'lot', 'serial', 'material', 'equipment', 'tool', 'personnel', 'document_revision', 'evidence_record', 'evidence_version', 'change_order', 'nonconformance', 'shipment')),
    node_ref                   TEXT NOT NULL,
    canonical_label            TEXT,
    lifecycle_state            TEXT,
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (node_type, node_ref)
);

CREATE TABLE IF NOT EXISTS genealogy_edges (
    genealogy_edge_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_node_id               UUID NOT NULL REFERENCES genealogy_nodes(genealogy_node_id) ON DELETE CASCADE,
    to_node_id                 UUID NOT NULL REFERENCES genealogy_nodes(genealogy_node_id) ON DELETE CASCADE,
    edge_type                  TEXT NOT NULL
        CHECK (edge_type IN ('consumed', 'produced', 'executed_by', 'used_equipment', 'used_tool', 'documented_by', 'evidenced_by', 'authorized_by_change', 'supersedes', 'reworked_from', 'shipped_as')),
    event_time                 TIMESTAMPTZ,
    evidence_record_id         UUID REFERENCES evidence_records(evidence_record_id),
    source_event_id            TEXT,
    metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (from_node_id, to_node_id, edge_type, source_event_id)
);

CREATE TABLE IF NOT EXISTS as_manufactured_snapshots (
    as_manufactured_snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_type               TEXT NOT NULL CHECK (subject_type IN ('job', 'work_order', 'lot', 'serial', 'shipment')),
    subject_ref                TEXT NOT NULL,
    snapshot_state             TEXT NOT NULL DEFAULT 'current'
        CHECK (snapshot_state IN ('current', 'superseded', 'voided')),
    snapshot_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_hash_sha256       CHAR(64) NOT NULL,
    built_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    evidence_record_id         UUID REFERENCES evidence_records(evidence_record_id),
    UNIQUE (subject_type, subject_ref, snapshot_hash_sha256)
);

CREATE TABLE IF NOT EXISTS traceability_exceptions (
    traceability_exception_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_type             TEXT NOT NULL
        CHECK (exception_type IN ('missing_genealogy_link', 'orphan_evidence', 'stale_document_reference', 'unauthorized_change_reference', 'incomplete_5m_context')),
    object_type                TEXT NOT NULL,
    object_id                  TEXT NOT NULL,
    exception_state            TEXT NOT NULL DEFAULT 'open'
        CHECK (exception_state IN ('open', 'accepted_risk', 'resolved', 'cancelled')),
    severity                   TEXT NOT NULL DEFAULT 'P1' CHECK (severity IN ('P0', 'P1', 'P2')),
    details                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at                TIMESTAMPTZ
);

-- Governance scope columns keep control-plane projections compatible with the
-- enterprise registry contract even when the projection is derived.
ALTER TABLE submission_validation_results
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE submission_validation_errors
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE duplicate_detection_fingerprints
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE source_boundary_violations
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE training_gate_decisions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE read_ack_gate_decisions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE immutable_storage_objects
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE genealogy_nodes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE genealogy_edges
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE as_manufactured_snapshots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE traceability_exceptions
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(80) NOT NULL DEFAULT 'mom.control_plane',
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payload_schema_version VARCHAR(80) NOT NULL DEFAULT 'control_plane_projection.v1',
    ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

COMMIT;
