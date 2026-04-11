-- ============================================================================
-- HESEM MOM - Department Enum Operational Alignment
-- ============================================================================
-- Purpose:
--   Production DB contains live department codes FIN and GEN that were not
--   represented in the canonical dept_code enum.  Add them to the authority
--   enum so live data can be promoted without coercion loss or FK failure.
--
-- Data safety:
--   ADD VALUE is additive-only and does not rewrite or delete existing rows.
-- ============================================================================

ALTER TYPE dept_code ADD VALUE IF NOT EXISTS 'FIN';
ALTER TYPE dept_code ADD VALUE IF NOT EXISTS 'GEN';

