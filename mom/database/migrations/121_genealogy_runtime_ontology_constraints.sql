-- ============================================================================
-- Migration 121: Genealogy Runtime Ontology Constraint Alignment
-- ============================================================================
-- Purpose:
--   Align DB CHECK constraints with GenealogyGraphService::nodeType(). Runtime
--   already accepts the expanded MOM/MES/EQMS/PLM ontology; persistence must not
--   reject valid canonical graph nodes.
--
-- Rollback:
--   Re-apply the narrower constraints from migration 108 only after confirming
--   no rows use expanded node or snapshot subject types.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'genealogy_nodes'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%node_type%'
    LOOP
        EXECUTE format('ALTER TABLE genealogy_nodes DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE genealogy_nodes
    ADD CONSTRAINT chk_genealogy_nodes_node_type_world_class
    CHECK (node_type IN (
        'job',
        'work_order',
        'job_order',
        'operation',
        'work_center',
        'lot',
        'batch',
        'serial',
        'material',
        'equipment',
        'tool',
        'personnel',
        'method',
        'measurement',
        'process',
        'routing',
        'setup_sheet',
        'inspection_plan',
        'inspection_result',
        'nc_program',
        'cnc_program',
        'document_revision',
        'form_template',
        'form_schema',
        'evidence_record',
        'evidence_version',
        'change_request',
        'change_order',
        'nonconformance',
        'deviation',
        'capa',
        'shipment',
        'supplier_lot',
        'customer_order'
    ));

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'as_manufactured_snapshots'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%subject_type%'
    LOOP
        EXECUTE format('ALTER TABLE as_manufactured_snapshots DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE as_manufactured_snapshots
    ADD CONSTRAINT chk_as_manufactured_snapshots_subject_type_world_class
    CHECK (subject_type IN (
        'job',
        'work_order',
        'job_order',
        'operation',
        'work_center',
        'lot',
        'batch',
        'serial',
        'material',
        'equipment',
        'tool',
        'personnel',
        'method',
        'measurement',
        'process',
        'routing',
        'setup_sheet',
        'inspection_plan',
        'inspection_result',
        'nc_program',
        'cnc_program',
        'document_revision',
        'form_template',
        'form_schema',
        'evidence_record',
        'evidence_version',
        'change_request',
        'change_order',
        'nonconformance',
        'deviation',
        'capa',
        'shipment',
        'supplier_lot',
        'customer_order'
    ));

COMMENT ON CONSTRAINT chk_genealogy_nodes_node_type_world_class ON genealogy_nodes
    IS 'Must match GenealogyGraphService::nodeType() expanded MOM/MES/EQMS/PLM ontology.';

COMMENT ON CONSTRAINT chk_as_manufactured_snapshots_subject_type_world_class ON as_manufactured_snapshots
    IS 'Allows expanded digital-thread subjects; service-level snapshot breadth may remain narrower until productized.';

COMMIT;
