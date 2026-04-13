-- ============================================================================
-- Migration 097: Idempotency Replay Ledger
-- ============================================================================
-- Purpose:
--   Promote mutation idempotency replay state from volatile/file-backed stores
--   into a PostgreSQL authoritative ledger. The application uses this table
--   whenever the existing PostgreSQL mode is enabled.
--
-- Data safety:
--   Additive migration only. Existing file-backed replay records remain on disk
--   for compatibility/forensics but are not imported automatically because their
--   TTL-bound semantics are request-local and safe to expire naturally.
--
-- Rollback:
--   DROP TABLE IF EXISTS idempotency_replay_ledger CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS idempotency_replay_ledger (
    ledger_id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_key          VARCHAR(255) NOT NULL,
    idempotency_key    VARCHAR(255) NOT NULL,
    fingerprint_hash   CHAR(64)     NOT NULL,
    status             VARCHAR(32)  NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'failed')),
    status_code        INT,
    response_payload   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    lock_owner         VARCHAR(80),
    error_class        TEXT,
    error_message      TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ  NOT NULL,
    UNIQUE (scope_key, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_replay_status
    ON idempotency_replay_ledger (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_replay_expires
    ON idempotency_replay_ledger (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_replay_scope
    ON idempotency_replay_ledger (scope_key);

COMMENT ON TABLE idempotency_replay_ledger IS
    'Authoritative mutation idempotency replay ledger for DB-enabled runtime.';

COMMENT ON COLUMN idempotency_replay_ledger.scope_key IS
    'Mutation scope, normally domain/table/action/business identity.';

COMMENT ON COLUMN idempotency_replay_ledger.idempotency_key IS
    'Client key or derived retry-window key supplied by the API idempotency resolver.';

COMMENT ON COLUMN idempotency_replay_ledger.fingerprint_hash IS
    'SHA-256 hash of the normalized request fingerprint.';

COMMENT ON COLUMN idempotency_replay_ledger.lock_owner IS
    'Transient owner token for the process that claimed in-progress execution.';

COMMIT;
