-- ============================================================================
-- HESEM MOM - Runtime Identifier and State Contract Alignment
-- ============================================================================
-- Purpose:
--   Align authority schema with actual runtime contracts for MES records whose
--   public identifiers are generated as stable alphanumeric document IDs by the
--   backend/API layer.  Keep strict typing where it represents a true controlled
--   value set, but do not coerce business IDs into UUIDs when the system already
--   uses readable immutable IDs.
--
-- Data safety:
--   All changes are type-widening or additive.  Existing values are preserved.
-- ============================================================================

ALTER TABLE departments
    ALTER COLUMN color TYPE VARCHAR(64) USING color::text;

ALTER TYPE material_consumption_type ADD VALUE IF NOT EXISTS 'VERIFY';

ALTER TABLE mes_material_consumption
    ALTER COLUMN consumption_id TYPE VARCHAR(80) USING consumption_id::text;

ALTER TABLE mes_genealogy_operations
    DROP CONSTRAINT IF EXISTS mes_genealogy_operations_genealogy_id_fkey;

ALTER TABLE mes_part_genealogy
    ALTER COLUMN genealogy_id TYPE VARCHAR(80) USING genealogy_id::text;

ALTER TABLE mes_genealogy_operations
    ALTER COLUMN genealogy_id TYPE VARCHAR(80) USING genealogy_id::text;

ALTER TABLE mes_genealogy_operations
    ADD CONSTRAINT mes_genealogy_operations_genealogy_id_fkey
    FOREIGN KEY (genealogy_id) REFERENCES mes_part_genealogy(genealogy_id);

ALTER TABLE mes_shift_handover
    ALTER COLUMN handover_id TYPE VARCHAR(80) USING handover_id::text,
    ALTER COLUMN machine_state TYPE VARCHAR(40) USING machine_state::text;

ALTER TABLE mes_shift_handover
    DROP CONSTRAINT IF EXISTS chk_mes_shift_handover_machine_state_runtime;

ALTER TABLE mes_shift_handover
    ADD CONSTRAINT chk_mes_shift_handover_machine_state_runtime
    CHECK (
        machine_state IS NULL
        OR lower(machine_state) IN (
            'running',
            'setup',
            'inspection',
            'on_hold',
            'down',
            'idle',
            'maintenance',
            'offline',
            'productive',
            'standby',
            'engineering',
            'scheduled_down',
            'unscheduled_down',
            'non_scheduled'
        )
    );

