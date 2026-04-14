-- ============================================================================
-- Migration 130: Genealogy scope identity and production 5M gate closure
-- ============================================================================
-- Purpose:
--   Close the remaining MES/genealogy P1 gaps from the final closure audit:
--   1) node, edge-fact, replay, and cycle identity must be scoped;
--   2) as-manufactured snapshot hash identity must be scoped;
--   3) shopfloor acceptance must have a database contract for 5M gate evidence.
-- ============================================================================

BEGIN;

ALTER TABLE genealogy_edge_facts
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40);

ALTER TABLE genealogy_nodes
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40);

ALTER TABLE as_manufactured_snapshots
    ADD COLUMN IF NOT EXISTS org_company_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_legal_entity_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_plant_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS org_site_id VARCHAR(40);

ALTER TABLE shift_production_log
    ADD COLUMN IF NOT EXISTS traceability_5m_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS traceability_5m_gate_state TEXT GENERATED ALWAYS AS (traceability_5m_gate ->> 'gate_state') STORED,
    ADD COLUMN IF NOT EXISTS traceability_5m_waiver_signature_event_id UUID REFERENCES signature_events(signature_event_id);

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'genealogy_edge_facts'::regclass
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) LIKE '%edge_fact_type%'
          AND pg_get_constraintdef(c.oid) LIKE '%source_event_id%'
    LOOP
        EXECUTE format('ALTER TABLE genealogy_edge_facts DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE genealogy_nodes
    DROP CONSTRAINT IF EXISTS genealogy_nodes_node_type_node_ref_key;

ALTER TABLE as_manufactured_snapshots
    DROP CONSTRAINT IF EXISTS as_manufactured_snapshots_subject_type_subject_ref_snapshot_hash_sha256_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_genealogy_edge_facts_scope_source
    ON genealogy_edge_facts (
        edge_fact_type,
        from_object_type,
        from_object_id,
        to_object_type,
        to_object_id,
        source_event_id,
        (COALESCE(org_company_code, '')),
        (COALESCE(org_legal_entity_code, '')),
        (COALESCE(org_plant_id, '')),
        (COALESCE(org_site_id, ''))
    );

CREATE UNIQUE INDEX IF NOT EXISTS ux_genealogy_nodes_scope_identity
    ON genealogy_nodes (
        node_type,
        node_ref,
        (COALESCE(org_company_code, '')),
        (COALESCE(org_legal_entity_code, '')),
        (COALESCE(org_plant_id, '')),
        (COALESCE(org_site_id, ''))
    );

CREATE UNIQUE INDEX IF NOT EXISTS ux_as_manufactured_snapshots_scope_hash
    ON as_manufactured_snapshots (
        subject_type,
        subject_ref,
        snapshot_hash_sha256,
        (COALESCE(org_company_code, '')),
        (COALESCE(org_legal_entity_code, '')),
        (COALESCE(org_plant_id, '')),
        (COALESCE(org_site_id, ''))
    );

DROP INDEX IF EXISTS ux_as_manufactured_snapshots_one_current;

CREATE UNIQUE INDEX IF NOT EXISTS ux_as_manufactured_snapshots_one_current_scoped
    ON as_manufactured_snapshots (
        subject_type,
        subject_ref,
        (COALESCE(org_company_code, '')),
        (COALESCE(org_legal_entity_code, '')),
        (COALESCE(org_plant_id, '')),
        (COALESCE(org_site_id, ''))
    )
    WHERE snapshot_state = 'current';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_shift_production_log_traceability_5m_gate'
    ) THEN
        ALTER TABLE shift_production_log
            ADD CONSTRAINT chk_shift_production_log_traceability_5m_gate
            CHECK (
                traceability_5m_gate_state IN ('complete', 'waived', 'not_applicable')
                OR traceability_5m_waiver_signature_event_id IS NOT NULL
            ) NOT VALID;
    END IF;
END $$;

COMMENT ON INDEX ux_genealogy_edge_facts_scope_source IS
    'Scope-keyed genealogy fact replay identity; prevents cross-plant/site false conflicts.';

COMMENT ON INDEX ux_genealogy_nodes_scope_identity IS
    'Scope-keyed genealogy node identity for reused lot/order/material refs across plants/sites.';

COMMENT ON INDEX ux_as_manufactured_snapshots_scope_hash IS
    'Scope-keyed as-manufactured snapshot hash identity.';

COMMIT;
