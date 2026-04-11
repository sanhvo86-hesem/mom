-- ============================================================================
-- Migration 092: Risk Register Contract Alignment
-- Replays the additive risk_register contract fields that were introduced into
-- the 078 source after some runtime databases had already recorded 078 as
-- applied. This keeps the immutable migration ledger truthful without editing
-- history or requiring destructive table rebuilds.
--
-- Safety: additive columns, idempotent backfill, no deletes, no PK replacement.
-- Rollback: Manual rollback only if every dependent API/registry contract has
-- been superseded; dropping these columns would remove audit/risk context.
-- ============================================================================

BEGIN;

ALTER TABLE risk_register
    ADD COLUMN IF NOT EXISTS risk_register_id UUID,
    ADD COLUMN IF NOT EXISTS risk_domain VARCHAR(40),
    ADD COLUMN IF NOT EXISTS source_entity_name VARCHAR(80),
    ADD COLUMN IF NOT EXISTS source_entity_id UUID,
    ADD COLUMN IF NOT EXISTS severity_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS occurrence_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS detection_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS mitigation_text TEXT,
    ADD COLUMN IF NOT EXISTS status_code VARCHAR(30) NOT NULL DEFAULT 'open';

UPDATE risk_register
SET risk_register_id = COALESCE(risk_register_id, gen_random_uuid()),
    risk_domain = COALESCE(
        risk_domain,
        CASE risk_category::text
            WHEN 'Quality' THEN 'quality'
            WHEN 'Delivery' THEN 'delivery'
            WHEN 'Safety' THEN 'safety'
            WHEN 'Financial' THEN 'financial'
            WHEN 'Regulatory' THEN 'regulatory'
            WHEN 'Supplier' THEN 'supplier'
            WHEN 'Technology' THEN 'technology'
            WHEN 'Human Resource' THEN 'people'
            ELSE 'quality'
        END
    ),
    mitigation_text = COALESCE(mitigation_text, mitigation_action),
    severity_code = COALESCE(
        severity_code,
        CASE
            WHEN impact >= 5 THEN 'critical'
            WHEN impact = 4 THEN 'high'
            WHEN impact = 3 THEN 'medium'
            ELSE 'low'
        END
    ),
    occurrence_code = COALESCE(
        occurrence_code,
        CASE
            WHEN likelihood >= 5 THEN 'frequent'
            WHEN likelihood = 4 THEN 'high'
            WHEN likelihood = 3 THEN 'medium'
            WHEN likelihood = 2 THEN 'low'
            ELSE 'rare'
        END
    ),
    detection_code = COALESCE(
        detection_code,
        CASE residual_risk::text
            WHEN 'Critical' THEN 'weak'
            WHEN 'High' THEN 'weak'
            WHEN 'Medium' THEN 'moderate'
            WHEN 'Low' THEN 'strong'
            ELSE 'unrated'
        END
    )
WHERE risk_register_id IS NULL
   OR risk_domain IS NULL
   OR mitigation_text IS NULL
   OR severity_code IS NULL
   OR occurrence_code IS NULL
   OR detection_code IS NULL;

ALTER TABLE risk_register
    ALTER COLUMN risk_register_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN risk_register_id SET NOT NULL,
    ALTER COLUMN risk_domain SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_register_canonical_id ON risk_register (risk_register_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_status_code ON risk_register (status_code);
CREATE INDEX IF NOT EXISTS idx_risk_register_domain ON risk_register (risk_domain);

COMMIT;
