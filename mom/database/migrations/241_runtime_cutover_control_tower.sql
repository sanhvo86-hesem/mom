-- ============================================================================
-- Migration 241: Runtime cutover control tower evidence
-- ============================================================================
-- Purpose:
--   Physical anchors for JSON -> PostgreSQL cutover rehearsal, drift evidence,
--   fallback incidents, restore-drill checksums and domain wave gates.
--
-- Data safety:
--   Additive migration only. It does not change active DataLayer mode and does
--   not promote any domain to PostgreSQL primary/only by itself.
--
-- Rollback:
--   DROP TABLE IF EXISTS runtime_cutover_wave_gate,
--     runtime_restore_drill_evidence, runtime_cutover_fallback_incident,
--     runtime_cutover_collection_probe, runtime_cutover_rehearsal_run CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS runtime_cutover_rehearsal_run (
    runtime_cutover_rehearsal_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_scope                        VARCHAR(80) NOT NULL,
    target_mode                      VARCHAR(30) NOT NULL
        CHECK (target_mode IN ('JSON_ONLY', 'SHADOW_WRITE', 'POSTGRES_PRIMARY', 'POSTGRES_ONLY')),
    run_state                        VARCHAR(30) NOT NULL DEFAULT 'planned'
        CHECK (run_state IN ('planned', 'running', 'passed', 'blocked', 'failed', 'rolled_back')),
    mode_summary                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    blocker_count                    INT NOT NULL DEFAULT 0,
    drift_blocker_count              INT NOT NULL DEFAULT 0,
    fallback_incident_count          INT NOT NULL DEFAULT 0,
    restore_drill_state              VARCHAR(30) NOT NULL DEFAULT 'not_run'
        CHECK (restore_drill_state IN ('not_run', 'passed', 'blocked', 'failed')),
    human_export_path                TEXT,
    evidence_hash_sha256             CHAR(64),
    started_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at                     TIMESTAMPTZ,
    metadata                         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_runtime_cutover_run_scope
    ON runtime_cutover_rehearsal_run (run_scope, target_mode, run_state, started_at);

CREATE TABLE IF NOT EXISTS runtime_cutover_collection_probe (
    runtime_cutover_collection_probe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runtime_cutover_rehearsal_run_id    UUID REFERENCES runtime_cutover_rehearsal_run(runtime_cutover_rehearsal_run_id) ON DELETE CASCADE,
    domain_code                         VARCHAR(80) NOT NULL,
    collection_key                      VARCHAR(120) NOT NULL,
    record_key_field                    VARCHAR(120),
    json_count                          INT NOT NULL DEFAULT 0,
    postgres_count                      INT NOT NULL DEFAULT 0,
    missing_in_postgres_count           INT NOT NULL DEFAULT 0,
    missing_in_json_count               INT NOT NULL DEFAULT 0,
    mismatch_count                      INT NOT NULL DEFAULT 0,
    duplicate_key_count                 INT NOT NULL DEFAULT 0,
    unkeyed_collection                  BOOLEAN NOT NULL DEFAULT false,
    probe_state                         VARCHAR(30) NOT NULL DEFAULT 'unknown'
        CHECK (probe_state IN ('passed', 'blocked', 'warning', 'unknown')),
    sample_diff                         JSONB NOT NULL DEFAULT '[]'::jsonb,
    probe_hash_sha256                   CHAR(64) NOT NULL,
    probed_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (runtime_cutover_rehearsal_run_id, domain_code, collection_key)
);

CREATE INDEX IF NOT EXISTS idx_runtime_cutover_collection_state
    ON runtime_cutover_collection_probe (domain_code, collection_key, probe_state);

CREATE TABLE IF NOT EXISTS runtime_cutover_fallback_incident (
    runtime_cutover_fallback_incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runtime_cutover_rehearsal_run_id     UUID REFERENCES runtime_cutover_rehearsal_run(runtime_cutover_rehearsal_run_id) ON DELETE SET NULL,
    domain_code                          VARCHAR(80),
    collection_key                       VARCHAR(120),
    target_mode                          VARCHAR(30) NOT NULL,
    read_source                          VARCHAR(80) NOT NULL,
    fallback_used                        BOOLEAN NOT NULL DEFAULT true,
    fallback_error                       TEXT,
    incident_state                       VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (incident_state IN ('open', 'acknowledged', 'resolved', 'waived')),
    incident_hash_sha256                 CHAR(64) NOT NULL,
    occurred_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_runtime_cutover_fallback_incident_hash
    ON runtime_cutover_fallback_incident (incident_hash_sha256);

CREATE TABLE IF NOT EXISTS runtime_restore_drill_evidence (
    runtime_restore_drill_evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runtime_cutover_rehearsal_run_id  UUID REFERENCES runtime_cutover_rehearsal_run(runtime_cutover_rehearsal_run_id) ON DELETE SET NULL,
    drill_scope                       VARCHAR(80) NOT NULL,
    backup_ref                        VARCHAR(160) NOT NULL,
    restore_target_ref                VARCHAR(160) NOT NULL,
    expected_checksum_sha256          CHAR(64),
    actual_checksum_sha256            CHAR(64),
    checksum_state                    VARCHAR(30) NOT NULL DEFAULT 'not_checked'
        CHECK (checksum_state IN ('not_checked', 'match', 'mismatch', 'missing')),
    restored_record_count             INT NOT NULL DEFAULT 0,
    source_record_count               INT NOT NULL DEFAULT 0,
    evidence_hash_sha256              CHAR(64) NOT NULL,
    drilled_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                          JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_runtime_restore_drill_scope
    ON runtime_restore_drill_evidence (drill_scope, checksum_state, drilled_at);

CREATE TABLE IF NOT EXISTS runtime_cutover_wave_gate (
    runtime_cutover_wave_gate_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_code                        VARCHAR(60) NOT NULL,
    domain_code                      VARCHAR(80) NOT NULL,
    target_mode                      VARCHAR(30) NOT NULL
        CHECK (target_mode IN ('SHADOW_WRITE', 'POSTGRES_PRIMARY', 'POSTGRES_ONLY')),
    gate_state                       VARCHAR(30) NOT NULL DEFAULT 'blocked'
        CHECK (gate_state IN ('ready', 'blocked', 'waived')),
    blocker_refs                     JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_rehearsal_run_id            UUID REFERENCES runtime_cutover_rehearsal_run(runtime_cutover_rehearsal_run_id) ON DELETE SET NULL,
    evidence_hash_sha256             CHAR(64),
    evaluated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                         JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (wave_code, domain_code, target_mode)
);

COMMENT ON TABLE runtime_cutover_rehearsal_run IS
    'Operator-visible rehearsal header for JSON to PostgreSQL migration/cutover gates.';

COMMENT ON TABLE runtime_cutover_fallback_incident IS
    'Fallback-read incidents that block POSTGRES_ONLY and must be reviewed before cutover.';

COMMENT ON TABLE runtime_restore_drill_evidence IS
    'Restore drill checksum evidence. Any mismatch blocks PostgreSQL-only promotion.';

COMMIT;
