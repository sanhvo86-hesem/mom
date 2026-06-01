-- ============================================================================
-- 258_uom_v5_alias_quarantine_contract.sql
-- HESEM UoM V5 P06: structured alias quarantine contract.
--
-- Posture: development/prototype -> pre-production readiness candidate.
-- ============================================================================

BEGIN;

ALTER TABLE uom_alias_quarantine
    ADD COLUMN IF NOT EXISTS normalized_alias VARCHAR(128),
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(64),
    ADD COLUMN IF NOT EXISTS candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(80),
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(128);

COMMENT ON COLUMN uom_alias_quarantine.normalized_alias IS
    'P06 normalized alias after whitespace/source-system policy; case is preserved unless the external standard requires uppercase.';
COMMENT ON COLUMN uom_alias_quarantine.source_system IS
    'P06 source system such as SYSTEM, SUPPLIER, UNECE_REC20, EDI_6411, OPC_UA.';
COMMENT ON COLUMN uom_alias_quarantine.candidates IS
    'P06 candidate-only list for ambiguous aliases. Never authority to auto-create a canonical mapping.';
COMMENT ON COLUMN uom_alias_quarantine.reason IS
    'P06 quarantine reason: AMBIGUOUS_ALIAS, UNKNOWN_ALIAS, UNKNOWN_OPC_UA_ENGINEERING_UNIT_ID, etc.';
COMMENT ON COLUMN uom_alias_quarantine.trace_id IS
    'P06 request trace identifier used by API/UI remediation workflows.';

CREATE INDEX IF NOT EXISTS idx_uom_quarantine_trace_id
    ON uom_alias_quarantine(trace_id)
    WHERE trace_id IS NOT NULL;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP INDEX IF EXISTS idx_uom_quarantine_trace_id;
--   ALTER TABLE uom_alias_quarantine
--       DROP COLUMN IF EXISTS trace_id,
--       DROP COLUMN IF EXISTS reason,
--       DROP COLUMN IF EXISTS candidates,
--       DROP COLUMN IF EXISTS source_system,
--       DROP COLUMN IF EXISTS normalized_alias;
--   COMMIT;
