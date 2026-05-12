-- ============================================================================
-- Migration 176: Promote deployment foundation documents
-- ============================================================================
-- Purpose:   Move WI-105, WI-106, ANNEX-114 from draft → approved and
--            POL-QMS-002 from draft → released so that the operations
--            deployment program (Triển khai vận hành) can launch its W0
--            pre-flight (2026-05-16) and W1 announcement (2026-05-23).
--
-- Background:
--   • QMS-MAN-001 is already approved (effective_date 2026-05-07, V4.0).
--   • POL-QMS-001 is already released (effective_date 2026-04-13, V0).
--   • The remaining 4 foundation documents are still draft per the bootstrap
--     seed in their HTML files. The deployment module's W0/W1 gates cannot
--     close without these docs being effective.
--
-- Effective dates:
--   • WI-105 / WI-106 / ANNEX-114 → 2026-05-16 (W0 pre-flight)
--   • POL-QMS-002                  → 2026-05-23 (W1 announcement)
--
-- Safety:
--   • Idempotent — uses doc_code WHERE clause; re-running has no effect once
--     the rows are at the target state.
--   • Updates dcc_document_header.updated_at via trigger; no schema change.
--   • Inserts a revision row into dcc_document_revision when the table exists,
--     so the audit trail captures the V0 → V1.0 bump.
--
-- Author: Operations deployment program rebuild
-- Date:   2026-05-12
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Promote WI-105, WI-106, ANNEX-114 to 'approved' (V0 → V1.0, eff 2026-05-16)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dcc_document_header
SET    status         = 'approved',
       revision       = 'V1.0',
       effective_date = DATE '2026-05-16',
       updated_at     = now()
WHERE  doc_code IN ('WI-105', 'WI-106', 'ANNEX-114')
  AND  status = 'draft';

-- ─────────────────────────────────────────────────────────────────────────────
-- Promote POL-QMS-002 to 'released' (V0 → V1.0, eff 2026-05-23)
-- Quality objectives must be released — policy-tier documents require the
-- 'released' status (not just 'approved') for ISO 9001 §5.2 evidence.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dcc_document_header
SET    status         = 'released',
       revision       = 'V1.0',
       effective_date = DATE '2026-05-23',
       updated_at     = now()
WHERE  doc_code = 'POL-QMS-002'
  AND  status = 'draft';

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit trail row in dcc_document_revision if that table exists
-- (silently skipped on environments where the table has not been provisioned).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'dcc_document_revision') THEN
        INSERT INTO dcc_document_revision (doc_code, revision, update_type, effective_date, approved_at, approved_by, note)
        SELECT  d,
                'V1.0',
                'major',
                eff,
                now(),
                'deploy_program_migration_176',
                'Promoted from draft for operations deployment W0/W1 launch.'
        FROM (VALUES
            ('WI-105',     DATE '2026-05-16'),
            ('WI-106',     DATE '2026-05-16'),
            ('ANNEX-114',  DATE '2026-05-16'),
            ('POL-QMS-002',DATE '2026-05-23')
        ) AS s(d, eff)
        WHERE NOT EXISTS (
            -- Idempotency: skip if ANY V1.0 row exists for the doc, regardless
            -- of which actor created it. The table enforces a UNIQUE constraint
            -- on (doc_code, revision); a narrower predicate would re-attempt
            -- the insert and fail when a different actor already filled it in.
            SELECT 1 FROM dcc_document_revision r
            WHERE  r.doc_code = s.d
              AND  r.revision = 'V1.0'
        );
    END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sanity check — emit a notice so the operator running the migration can
-- confirm 4 rows changed (or 0 if already promoted).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE n INTEGER;
BEGIN
    SELECT COUNT(*) INTO n FROM dcc_document_header
    WHERE doc_code IN ('WI-105', 'WI-106', 'ANNEX-114', 'POL-QMS-002')
      AND status IN ('approved', 'released')
      AND effective_date IN (DATE '2026-05-16', DATE '2026-05-23');
    RAISE NOTICE 'Migration 176: % of 4 foundation documents now at target state.', n;
END$$;

COMMIT;
