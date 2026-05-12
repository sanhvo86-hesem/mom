-- ============================================================================
-- Migration 174: Data / Source-Code Isolation Foundation
-- ----------------------------------------------------------------------------
-- Implements the executable contract described in ADR-0013.
--
-- Adds three pieces of permanent infrastructure that let the runtime
-- distinguish "code" (immutable, shipped via git) from "data" (mutable,
-- lives in PostgreSQL forever):
--
--   1. data_collection_state
--      Per-collection cutover mode. The runtime IdentityRepository (and any
--      future repository pattern) reads this on every request to decide
--      whether reads come from JSON files or from PostgreSQL. Mode flips are
--      operational acts, not deploys.
--
--   2. audit_event_chain
--      Hash-chained, append-only audit log. Each row commits to the previous
--      row's SHA-256, producing a tamper-evident chain that satisfies
--      21 CFR Part 11 §11.10(e) and ISO 27001 A.8.2.3. Trigger
--      audit_event_chain_link_tg() enforces the chain on INSERT.
--
--   3. data_collection_drift
--      One row per detected divergence between the JSON file and PostgreSQL
--      during SHADOW_WRITE / POSTGRES_PRIMARY phases. This is how operators
--      know whether the cutover is safe to advance.
--
-- Standards alignment:
--   * 21 CFR Part 11 §11.10(e)        — audit-trail integrity
--   * ISO 27001:2022 A.8.2.3          — information classification
--   * NIST SP 800-53 rev5 AU-10       — non-repudiation
--   * GDPR Art. 32                    — security of processing
--   * 12-Factor §III (config), §VI (processes)
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. data_collection_state — cutover mode per logical collection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_collection_state (
    collection_key       VARCHAR(80)   PRIMARY KEY,
    mode                 VARCHAR(24)   NOT NULL
                         CHECK (mode IN (
                             'json_only',
                             'shadow_write',
                             'postgres_primary',
                             'postgres_only'
                         )),
    json_path            TEXT,                    -- relative to mom/data/ (NULL once postgres_only)
    postgres_table       TEXT          NOT NULL,
    description          TEXT,
    last_verified_at     TIMESTAMPTZ,
    last_verified_sha256 CHAR(64),
    last_drift_at        TIMESTAMPTZ,
    drift_count          INTEGER       NOT NULL DEFAULT 0,
    advanced_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    advanced_by          VARCHAR(150),
    advance_change_ref   VARCHAR(120),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  data_collection_state IS 'Per-collection Strangler-Fig cutover mode (ADR-0013). / Trang thai chuyen tiep cua tung tap du lieu.';
COMMENT ON COLUMN data_collection_state.mode IS 'json_only -> shadow_write -> postgres_primary -> postgres_only';
COMMENT ON COLUMN data_collection_state.last_verified_sha256 IS 'SHA-256 of canonical JSON projection at last verify run.';

-- Seed the seven collections in scope for Wave-1 cutover.
INSERT INTO data_collection_state (
    collection_key, mode, json_path, postgres_table, description
) VALUES
    ('users',                 'shadow_write', 'config/users.json',                  'users',
     'Identity store. Already shadow-written by AuthUserShadowSyncService.'),
    ('roles',                 'shadow_write', 'config/role_permissions.json',       'roles',
     'Role catalog with JSONB permissions (migration 173 seed).'),
    ('role_permissions',      'shadow_write', 'config/role_permissions.json',       'roles',
     'Legacy projection; same source as roles.permissions JSONB.'),
    ('user_doc_overrides',    'json_only',    'config/user_doc_overrides.json',     'user_doc_overrides',
     'Per-user document visibility override.'),
    ('portal_role_docs',      'json_only',    'config/portal_role_docs.json',       'portal_role_docs',
     'Role-to-document mapping for portal sidebar.'),
    ('module_access_config',  'json_only',    'config/module_access_config.json',   'module_access_config',
     'Module visibility per role.'),
    ('dcc_documents',         'json_only',    'docs/**/*.html',                     'dcc_document_body',
     'Controlled QMS HTML documents — Phase 2.')
ON CONFLICT (collection_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_data_collection_state_mode
    ON data_collection_state (mode);

-- ---------------------------------------------------------------------------
-- 2. audit_event_chain — tamper-evident, hash-chained audit log
-- ---------------------------------------------------------------------------
-- Sits ALONGSIDE the existing partitioned audit_events table. We do not
-- replace audit_events because (a) rewriting hundreds of writers is a
-- separate project and (b) audit_event_chain has stricter integrity rules
-- (no UPDATE, hash-link trigger) that would conflict with existing
-- "soft fixes" on audit_events.
--
-- Use audit_event_chain for any data-isolation-relevant event: cutover
-- mode flips, drift detection, backfill runs, JSON file deletions.
-- Future migrations may MOVE classes of events from audit_events to
-- audit_event_chain.
CREATE TABLE IF NOT EXISTS audit_event_chain (
    chain_id        BIGSERIAL     PRIMARY KEY,
    event_id        UUID          NOT NULL DEFAULT uuid_generate_v4(),
    event_type      VARCHAR(80)   NOT NULL,
    aggregate_type  VARCHAR(80)   NOT NULL,
    aggregate_id    TEXT          NOT NULL,
    actor_id        UUID,
    actor_name      VARCHAR(150),
    payload         JSONB         NOT NULL DEFAULT '{}'::jsonb,
    metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,
    ip_address      INET,
    recorded_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    prev_sha256     CHAR(64)      NOT NULL,
    row_sha256      CHAR(64)      NOT NULL,
    -- Lock the chain: cannot be updated, only inserted.
    UNIQUE (event_id)
);

COMMENT ON TABLE  audit_event_chain IS 'Tamper-evident hash-linked audit log. 21 CFR Part 11 §11.10(e) compliant.';
COMMENT ON COLUMN audit_event_chain.prev_sha256 IS 'Hash of the previous row, or 64 zeros for the genesis row.';
COMMENT ON COLUMN audit_event_chain.row_sha256  IS 'sha256(prev_sha256 || event_id || event_type || aggregate_id || payload || recorded_at).';

CREATE INDEX IF NOT EXISTS idx_audit_event_chain_recorded_at
    ON audit_event_chain (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_chain_aggregate
    ON audit_event_chain (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_chain_event_type
    ON audit_event_chain (event_type, recorded_at DESC);

-- 2a. Hash-link trigger ------------------------------------------------------
-- BEFORE INSERT: compute prev_sha256 from the latest existing row, then
-- compute row_sha256 over the canonical fields. Caller may NOT supply
-- prev_sha256 / row_sha256 — they are always recomputed.
CREATE OR REPLACE FUNCTION audit_event_chain_link_tg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_prev   CHAR(64);
    v_canon  TEXT;
BEGIN
    -- Latest row by chain_id (BIGSERIAL is monotonic per session; combined
    -- with the BEFORE INSERT trigger this serializes correctly).
    SELECT row_sha256 INTO v_prev
      FROM audit_event_chain
     ORDER BY chain_id DESC
     LIMIT 1
       FOR UPDATE;
    IF v_prev IS NULL THEN
        v_prev := repeat('0', 64);
    END IF;
    NEW.prev_sha256 := v_prev;

    -- Canonical hash input. JSONB is normalized to text via the standard
    -- ::text cast (which is deterministic for jsonb → key order is the
    -- internal binary order, identical across rows with the same keys).
    v_canon := v_prev
            || '|' || NEW.event_id::text
            || '|' || NEW.event_type
            || '|' || NEW.aggregate_type
            || '|' || NEW.aggregate_id
            || '|' || (NEW.payload)::text
            || '|' || to_char(NEW.recorded_at AT TIME ZONE 'UTC',
                              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    NEW.row_sha256 := encode(digest(v_canon, 'sha256'), 'hex');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_event_chain_link ON audit_event_chain;
CREATE TRIGGER audit_event_chain_link
    BEFORE INSERT ON audit_event_chain
    FOR EACH ROW
    EXECUTE FUNCTION audit_event_chain_link_tg();

-- 2b. Lock-down: forbid UPDATE / DELETE on audit_event_chain ----------------
-- Implemented via trigger rather than role grants because the application
-- connects as a single role today.
CREATE OR REPLACE FUNCTION audit_event_chain_immutable_tg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_event_chain is append-only; % rejected on chain_id=%',
        TG_OP, COALESCE(OLD.chain_id, NEW.chain_id);
END;
$$;

DROP TRIGGER IF EXISTS audit_event_chain_no_update ON audit_event_chain;
CREATE TRIGGER audit_event_chain_no_update
    BEFORE UPDATE ON audit_event_chain
    FOR EACH ROW
    EXECUTE FUNCTION audit_event_chain_immutable_tg();

DROP TRIGGER IF EXISTS audit_event_chain_no_delete ON audit_event_chain;
CREATE TRIGGER audit_event_chain_no_delete
    BEFORE DELETE ON audit_event_chain
    FOR EACH ROW
    EXECUTE FUNCTION audit_event_chain_immutable_tg();

-- 2c. Verifier function ------------------------------------------------------
-- Walks the chain, recomputes each row's hash, returns the chain_id of the
-- first broken row (or NULL if intact). Operators run this nightly.
CREATE OR REPLACE FUNCTION audit_event_chain_verify(
    p_from_chain_id BIGINT DEFAULT 0
) RETURNS TABLE (
    broken_at_chain_id BIGINT,
    expected_prev      CHAR(64),
    actual_prev        CHAR(64),
    expected_row_hash  CHAR(64),
    actual_row_hash    CHAR(64)
)
LANGUAGE plpgsql
AS $$
DECLARE
    r          audit_event_chain%ROWTYPE;
    v_prev     CHAR(64) := repeat('0', 64);
    v_canon    TEXT;
    v_recompute CHAR(64);
BEGIN
    FOR r IN
        SELECT * FROM audit_event_chain
         WHERE chain_id > p_from_chain_id
         ORDER BY chain_id ASC
    LOOP
        v_canon := v_prev
                || '|' || r.event_id::text
                || '|' || r.event_type
                || '|' || r.aggregate_type
                || '|' || r.aggregate_id
                || '|' || (r.payload)::text
                || '|' || to_char(r.recorded_at AT TIME ZONE 'UTC',
                                  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
        v_recompute := encode(digest(v_canon, 'sha256'), 'hex');
        IF r.prev_sha256 <> v_prev OR r.row_sha256 <> v_recompute THEN
            broken_at_chain_id := r.chain_id;
            expected_prev      := v_prev;
            actual_prev        := r.prev_sha256;
            expected_row_hash  := v_recompute;
            actual_row_hash    := r.row_sha256;
            RETURN NEXT;
            RETURN;
        END IF;
        v_prev := r.row_sha256;
    END LOOP;
    -- No break: emit nothing.
    RETURN;
END;
$$;

COMMENT ON FUNCTION audit_event_chain_verify(BIGINT)
    IS 'Walk audit_event_chain and return the first broken row, or no rows if chain intact.';

-- ---------------------------------------------------------------------------
-- 3. data_collection_drift — divergence log between JSON and PostgreSQL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_collection_drift (
    drift_id        BIGSERIAL     PRIMARY KEY,
    collection_key  VARCHAR(80)   NOT NULL REFERENCES data_collection_state(collection_key),
    detected_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    detector        VARCHAR(80)   NOT NULL,                  -- 'IdentityRepository', 'cli:drift-scan', etc.
    record_key      VARCHAR(200),                            -- e.g. username
    json_sha256     CHAR(64),
    pg_sha256       CHAR(64),
    direction       VARCHAR(20)   NOT NULL
                    CHECK (direction IN ('json_only', 'pg_only', 'mismatch')),
    diff_summary    JSONB         NOT NULL DEFAULT '{}'::jsonb,
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(150),
    resolution      VARCHAR(40),                              -- 'pg_won', 'json_won', 'manual_merge'
    resolution_note TEXT
);

COMMENT ON TABLE data_collection_drift IS 'JSON-vs-PostgreSQL divergences detected during SHADOW_WRITE / POSTGRES_PRIMARY phases.';

CREATE INDEX IF NOT EXISTS idx_data_collection_drift_unresolved
    ON data_collection_drift (collection_key, detected_at DESC)
    WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Helper view: cutover dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_data_isolation_dashboard AS
SELECT
    s.collection_key,
    s.mode,
    s.postgres_table,
    s.last_verified_at,
    s.last_drift_at,
    s.drift_count,
    (SELECT COUNT(*)
       FROM data_collection_drift d
      WHERE d.collection_key = s.collection_key
        AND d.resolved_at IS NULL)             AS open_drift_count,
    s.advanced_at,
    s.advanced_by,
    s.advance_change_ref
FROM data_collection_state s
ORDER BY
    CASE s.mode
        WHEN 'json_only'         THEN 0
        WHEN 'shadow_write'      THEN 1
        WHEN 'postgres_primary'  THEN 2
        WHEN 'postgres_only'     THEN 3
    END,
    s.collection_key;

COMMENT ON VIEW v_data_isolation_dashboard IS 'Operator dashboard for ADR-0013 cutover progress.';

-- ---------------------------------------------------------------------------
-- 5. updated_at maintenance trigger for data_collection_state
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION data_collection_state_touch_tg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS data_collection_state_touch ON data_collection_state;
CREATE TRIGGER data_collection_state_touch
    BEFORE UPDATE ON data_collection_state
    FOR EACH ROW
    EXECUTE FUNCTION data_collection_state_touch_tg();

COMMIT;

-- Rollback:
-- DROP VIEW   IF EXISTS v_data_isolation_dashboard;
-- DROP TABLE  IF EXISTS data_collection_drift;
-- DROP TRIGGER IF EXISTS audit_event_chain_no_delete ON audit_event_chain;
-- DROP TRIGGER IF EXISTS audit_event_chain_no_update ON audit_event_chain;
-- DROP TRIGGER IF EXISTS audit_event_chain_link     ON audit_event_chain;
-- DROP FUNCTION IF EXISTS audit_event_chain_verify(BIGINT);
-- DROP FUNCTION IF EXISTS audit_event_chain_immutable_tg();
-- DROP FUNCTION IF EXISTS audit_event_chain_link_tg();
-- DROP TABLE  IF EXISTS audit_event_chain;
-- DROP TRIGGER IF EXISTS data_collection_state_touch ON data_collection_state;
-- DROP FUNCTION IF EXISTS data_collection_state_touch_tg();
-- DROP TABLE  IF EXISTS data_collection_state;
