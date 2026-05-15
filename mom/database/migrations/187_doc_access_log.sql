-- ============================================================================
-- Migration 187: Document access log for real usage KPI
-- ----------------------------------------------------------------------------
-- Server-side event log for actual document openings. Drill/self-test traffic is
-- retained but marked is_real=false so adoption KPIs are not inflated by
-- rehearsal activity.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS doc_access_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    doc_code VARCHAR(64) NOT NULL,
    access_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(32) NOT NULL CHECK (source IN ('portal', 'qr', 'direct', 'api')),
    dept_id VARCHAR(8),
    role_code VARCHAR(16),
    is_real BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE doc_access_log IS
    'Append-only server log of controlled-document access, used for real behavior adoption KPIs.';
COMMENT ON COLUMN doc_access_log.is_real IS
    'False for drill mode or rehearsal access so training drills do not distort real-usage metrics.';

CREATE INDEX IF NOT EXISTS idx_doc_access_user_time
    ON doc_access_log(user_id, access_at);

CREATE INDEX IF NOT EXISTS idx_doc_access_doc_time
    ON doc_access_log(doc_code, access_at);

COMMIT;

-- ============================================================================
-- Rollback (manual):
--   BEGIN;
--   DROP TABLE IF EXISTS doc_access_log CASCADE;
--   COMMIT;
-- ============================================================================
