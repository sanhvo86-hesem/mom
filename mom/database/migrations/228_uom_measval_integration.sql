-- =============================================================================
-- Migration 228: UoM MEASVAL Integration — Quality & MES measurement bridge
-- =============================================================================
-- Extends inspection_results and mes_inline_measurements with auditable
-- MEASVAL envelopes. Adds uom_measurement_thread for cross-record linkage.
-- Safe to run on existing data — all new columns are nullable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend inspection_results with MEASVAL envelope + canonical unit
-- ---------------------------------------------------------------------------
ALTER TABLE inspection_results
    ADD COLUMN IF NOT EXISTS canonical_unit_code  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS measval_envelope      JSONB,
    ADD COLUMN IF NOT EXISTS display_unit_code     VARCHAR(30),
    ADD COLUMN IF NOT EXISTS display_value         NUMERIC(18,6),
    ADD COLUMN IF NOT EXISTS measval_version       SMALLINT DEFAULT 1;

COMMENT ON COLUMN inspection_results.canonical_unit_code IS
    'Resolved HESEM canonical unit code (from measurement_unit enum).';
COMMENT ON COLUMN inspection_results.measval_envelope IS
    'Full MEASVAL evidence envelope (JSON) — sha256 audit hash inside.';
COMMENT ON COLUMN inspection_results.display_unit_code IS
    'Converted display unit requested by reporting context.';
COMMENT ON COLUMN inspection_results.display_value IS
    'Converted value in display_unit_code (rounded per rounding policy).';

-- ---------------------------------------------------------------------------
-- 2. Extend mes_inline_measurements with MEASVAL envelope
-- ---------------------------------------------------------------------------
ALTER TABLE mes_inline_measurements
    ADD COLUMN IF NOT EXISTS canonical_unit_code  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS measval_envelope      JSONB,
    ADD COLUMN IF NOT EXISTS display_unit_code     VARCHAR(30),
    ADD COLUMN IF NOT EXISTS display_value         NUMERIC(18,6);

COMMENT ON COLUMN mes_inline_measurements.measval_envelope IS
    'Full MEASVAL evidence envelope for traceability digital thread.';

-- ---------------------------------------------------------------------------
-- 3. UoM Measurement Thread — cross-record digital linkage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uom_measurement_thread (
    thread_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table        VARCHAR(50)     NOT NULL,  -- 'inspection_results' | 'mes_inline_measurements'
    source_id           TEXT            NOT NULL,  -- result_id (UUID) or measurement_id (bigint)
    audit_hash          CHAR(64)        NOT NULL,  -- SHA-256 from MEASVAL envelope
    from_unit_code      VARCHAR(30)     NOT NULL,
    to_unit_code        VARCHAR(30),
    magnitude_input     TEXT            NOT NULL,  -- exact BCMath string
    magnitude_result    TEXT,
    rule_code           VARCHAR(50),
    rule_version        SMALLINT,
    rounding_policy     VARCHAR(40),
    context_code        VARCHAR(20),               -- 'QC' | 'SPC' | 'MES' | 'LIMS'
    item_id             VARCHAR(50),
    job_number          VARCHAR(50),
    operation_seq       INT,
    characteristic      VARCHAR(300),
    inspector_id        UUID,
    ai_advisory_flag    BOOLEAN         NOT NULL DEFAULT FALSE,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umthread_source
    ON uom_measurement_thread (source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_umthread_item
    ON uom_measurement_thread (item_id, recorded_at DESC) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_umthread_job
    ON uom_measurement_thread (job_number, operation_seq) WHERE job_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_umthread_hash
    ON uom_measurement_thread (audit_hash);
CREATE INDEX IF NOT EXISTS idx_umthread_rule
    ON uom_measurement_thread (rule_code) WHERE rule_code IS NOT NULL;

COMMENT ON TABLE uom_measurement_thread IS
    'Digital thread for QC/MES measurements: links source records to MEASVAL envelopes and conversion audit hashes.';

-- ---------------------------------------------------------------------------
-- 4. measurement_unit enum → canonical_unit_code lookup seed
-- ---------------------------------------------------------------------------
-- The measurement_unit PG enum ('mm', 'in', 'deg', 'Ra', 'HRC', 'HRB') maps
-- to canonical UoM codes in uom_unit_catalog via uom_alias with context_scope='SYSTEM'.
-- Seeds below ensure resolution without hitting quarantine on first contact.
INSERT INTO uom_alias (alias_string, canonical_code, context_scope, context_id,
                        lifecycle_status, created_by)
VALUES
    -- Linear / dimensional
    ('mm',    'MM',    'SYSTEM', 'HESEM_QC', 'active', 'seed'),
    ('in',    'IN',    'SYSTEM', 'HESEM_QC', 'active', 'seed'),
    -- Angular
    ('deg',   'DEG',   'SYSTEM', 'HESEM_QC', 'active', 'seed'),
    -- Surface roughness — Ra (arithmetic mean deviation); no SI conversion
    ('Ra',    'RA_UM', 'SYSTEM', 'HESEM_QC', 'active', 'seed'),
    -- Hardness scales — dimensionless ratio quantities
    ('HRC',   'HRC',   'SYSTEM', 'HESEM_QC', 'active', 'seed'),
    ('HRB',   'HRB',   'SYSTEM', 'HESEM_QC', 'active', 'seed')
ON CONFLICT (alias_string, context_scope, COALESCE(context_id, ''))
DO NOTHING;

-- Ra surface roughness and Rockwell hardness as dimensionless catalog entries
-- (these are metrological quantities without SI dimension; no conversion rule)
INSERT INTO uom_unit_catalog (canonical_code, ucum_code, display_label_en, display_label_vi,
                               quantity_kind_code, si_factor, si_offset, is_si_base,
                               is_conversion_blocked, lifecycle_status)
VALUES
    ('RA_UM',  '{Ra}',  'Roughness Ra (µm)', 'Độ nhám Ra (µm)',
     'SurfaceRoughness', '1', '0', FALSE, FALSE, 'active'),
    ('HRC',    '{HRC}', 'Rockwell C hardness', 'Độ cứng Rockwell C',
     'Hardness', '1', '0', FALSE, TRUE, 'active'),
    ('HRB',    '{HRB}', 'Rockwell B hardness', 'Độ cứng Rockwell B',
     'Hardness', '1', '0', FALSE, TRUE, 'active')
ON CONFLICT (canonical_code) DO NOTHING;

INSERT INTO uom_quantity_kind (kind_code, label_en, label_vi, dimension_vector,
                                is_dimensionless, allows_negative, lifecycle_status)
VALUES
    ('SurfaceRoughness', 'Surface Roughness', 'Độ nhám bề mặt',
     'M0L1T0I0Θ0N0J0',   -- length dimension (Ra is a linear deviation)
     FALSE, FALSE, 'active'),
    ('Hardness', 'Hardness (Rockwell)', 'Độ cứng (Rockwell)',
     'M0L0T0I0Θ0N0J0',   -- dimensionless ratio
     TRUE, FALSE, 'active')
ON CONFLICT (kind_code) DO NOTHING;
