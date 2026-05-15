-- ============================================================================
-- Migration 185: Authorization decision log (auth_decision_event)
-- ----------------------------------------------------------------------------
-- Introduces a dedicated, partitioned, append-only log for every authorization
-- decision rendered by AuthorizationKernel (PDP). Sits alongside audit_events:
--
--   * audit_events       — business mutations ("user X created user Y")
--   * auth_decision_event — authorization outcomes ("HR Manager DENIED
--                          users.create with reason=no_grant")
--
-- Separation is deliberate (NIST SP 800-53 AU-2 + AU-3 — events of authorization
-- decisions are auditable independently of the business event they gate).
-- Filling this table is what lets the matrix admin diagnose "why was role X
-- forbidden from action Y" without grepping PHP source.
--
-- Rationale:
--   * 21 CFR Part 11 §11.10(d,e)  — limit access to authorized individuals,
--                                    record AAL2 step-up evidence.
--   * ISO 27001 A.9.4 / A.12.4    — privileged access logging.
--   * NIST SP 800-53 AC-3, AC-6   — access enforcement, least privilege.
--
-- Compatible with both POSTGRES_PRIMARY and JSON_ONLY modes — kernel silently
-- skips logging when DB unavailable, decision result is unaffected.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS auth_decision_event (
    decision_id      BIGSERIAL,
    occurred_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    user_id          UUID,
    actor_username   VARCHAR(80),
    subject_role     VARCHAR(60),
    subject_roles    TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    permission_code  VARCHAR(80)     NOT NULL,
    route_action     VARCHAR(120),
    resource_kind    VARCHAR(40),
    resource_id      TEXT,
    decision         VARCHAR(16)     NOT NULL
                     CHECK (decision IN ('allow', 'deny', 'stepup')),
    reason_code      VARCHAR(40)     NOT NULL,
    current_aal      SMALLINT,
    required_aal     SMALLINT,
    matched_grant    TEXT,
    matched_deny     TEXT,
    request_id       UUID,
    ip_addr          INET,
    user_agent       TEXT,
    extra            JSONB           NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (decision_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

COMMENT ON TABLE auth_decision_event IS
    'Append-only authorization decision log (PDP audit). One row per allow/deny/stepup decision.';

-- Quarterly partitions covering 2026Q2..2027Q4 + default.
CREATE TABLE IF NOT EXISTS auth_decision_event_2026_q2 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2026_q3 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2026_q4 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2027_q1 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2027_q2 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2027_q3 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_2027_q4 PARTITION OF auth_decision_event
    FOR VALUES FROM ('2027-10-01') TO ('2028-01-01');
CREATE TABLE IF NOT EXISTS auth_decision_event_default PARTITION OF auth_decision_event DEFAULT;

-- Indexes (created on the parent, propagate to partitions).
CREATE INDEX IF NOT EXISTS idx_auth_decision_user_time
    ON auth_decision_event (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_decision_perm_decision_time
    ON auth_decision_event (permission_code, decision, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_decision_role_decision_time
    ON auth_decision_event (subject_role, decision, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_decision_deny_only_time
    ON auth_decision_event (occurred_at DESC)
    WHERE decision = 'deny';

COMMIT;

-- ============================================================================
-- Rollback (manual):
--   BEGIN;
--   DROP TABLE IF EXISTS
--       auth_decision_event_2026_q2,
--       auth_decision_event_2026_q3,
--       auth_decision_event_2026_q4,
--       auth_decision_event_2027_q1,
--       auth_decision_event_2027_q2,
--       auth_decision_event_2027_q3,
--       auth_decision_event_2027_q4,
--       auth_decision_event_default CASCADE;
--   DROP TABLE IF EXISTS auth_decision_event CASCADE;
--   COMMIT;
-- ============================================================================
