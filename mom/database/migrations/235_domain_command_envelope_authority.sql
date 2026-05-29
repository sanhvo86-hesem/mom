-- ============================================================================
-- Migration 235: Domain Command Envelope Authority
-- ============================================================================
-- Purpose:
--   Add the runtime command envelope audit spine used by governed domain
--   commands. The actual mutation still belongs to each domain command service;
--   this migration records command lifecycle, idempotency, problem detail and
--   outbox linkage without creating a parallel mutation authority.
--
-- Data safety:
--   Additive migration. Existing JSON/file compatibility modes keep working.
--
-- Rollback:
--   DROP TABLE IF EXISTS domain_command_outbox_link CASCADE;
--   DROP TABLE IF EXISTS domain_command_audit CASCADE;
--   DROP TABLE IF EXISTS domain_command_problem_type CASCADE;
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS domain_command_problem_type (
    problem_code        VARCHAR(120) PRIMARY KEY,
    type_uri            TEXT        NOT NULL,
    http_status         INT         NOT NULL CHECK (http_status BETWEEN 400 AND 599),
    title               TEXT        NOT NULL CHECK (length(trim(title)) > 0),
    retryable           BOOLEAN     NOT NULL DEFAULT false,
    authority_severity  VARCHAR(20) NOT NULL DEFAULT 'P1'
        CHECK (authority_severity IN ('P0', 'P1', 'P2', 'P3')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO domain_command_problem_type (
    problem_code,
    type_uri,
    http_status,
    title,
    retryable,
    authority_severity
) VALUES
    ('domain_command_envelope_invalid', 'https://qms.hesem.com.vn/problems/domain-command/envelope-invalid', 400, 'Domain command envelope is invalid', false, 'P1'),
    ('domain_command_handler_not_registered', 'https://qms.hesem.com.vn/problems/domain-command/handler-not-registered', 501, 'Domain command handler is not registered', false, 'P1'),
    ('idempotency_conflict', 'https://qms.hesem.com.vn/problems/domain-command/idempotency-conflict', 409, 'Idempotency key conflicts with a different command fingerprint', false, 'P1'),
    ('idempotency_in_progress', 'https://qms.hesem.com.vn/problems/domain-command/idempotency-in-progress', 409, 'Idempotent command is already in progress', true, 'P1'),
    ('domain_command_execution_failed', 'https://qms.hesem.com.vn/problems/domain-command/execution-failed', 500, 'Domain command execution failed', true, 'P1'),
    ('domain_command_openapi_missing', 'https://qms.hesem.com.vn/problems/domain-command/openapi-missing', 500, 'Domain command OpenAPI operation is missing', false, 'P1')
ON CONFLICT (problem_code) DO UPDATE SET
    type_uri = EXCLUDED.type_uri,
    http_status = EXCLUDED.http_status,
    title = EXCLUDED.title,
    retryable = EXCLUDED.retryable,
    authority_severity = EXCLUDED.authority_severity,
    updated_at = now();

CREATE TABLE IF NOT EXISTS domain_command_audit (
    domain_command_audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name            VARCHAR(120) NOT NULL,
    command_status          VARCHAR(30)  NOT NULL
        CHECK (command_status IN ('accepted', 'completed', 'replayed', 'failed', 'rejected')),
    idempotency_key         TEXT         NOT NULL,
    correlation_id          TEXT         NOT NULL,
    actor_user_id           TEXT,
    aggregate_type          TEXT,
    aggregate_id            TEXT,
    request_hash_sha256     CHAR(64)     NOT NULL,
    response_hash_sha256    CHAR(64),
    http_status             INT          NOT NULL CHECK (http_status BETWEEN 100 AND 599),
    problem_code            VARCHAR(120) REFERENCES domain_command_problem_type(problem_code),
    problem_type_uri        TEXT,
    retryable               BOOLEAN      NOT NULL DEFAULT false,
    replayed                BOOLEAN      NOT NULL DEFAULT false,
    outbox_status           VARCHAR(30)  NOT NULL DEFAULT 'not_applicable'
        CHECK (outbox_status IN ('not_applicable', 'pending', 'published', 'pending_retry', 'failed')),
    envelope_json           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    response_json           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    metadata                JSONB        NOT NULL DEFAULT '{}'::jsonb,
    started_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    row_version             BIGINT       NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_domain_command_idempotency
    ON domain_command_audit (command_name, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_domain_command_correlation
    ON domain_command_audit (correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_command_aggregate
    ON domain_command_audit (aggregate_type, aggregate_id, created_at DESC)
    WHERE aggregate_type IS NOT NULL AND aggregate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_domain_command_problem
    ON domain_command_audit (problem_code, created_at DESC)
    WHERE problem_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS domain_command_outbox_link (
    domain_command_outbox_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_command_audit_id       UUID NOT NULL REFERENCES domain_command_audit(domain_command_audit_id) ON DELETE CASCADE,
    domain_outbox_event_id        UUID REFERENCES domain_outbox_events(domain_outbox_event_id),
    link_status                   VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (link_status IN ('pending', 'published', 'pending_retry', 'failed')),
    link_error                    TEXT,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_command_outbox_link_command
    ON domain_command_outbox_link (domain_command_audit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_command_outbox_link_event
    ON domain_command_outbox_link (domain_outbox_event_id)
    WHERE domain_outbox_event_id IS NOT NULL;

COMMIT;
