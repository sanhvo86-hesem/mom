-- GPT Pro Top-30 closure: item and item-revision domain commands are runtime authority.
-- This migration adds fail-closed immutability for released item revisions
-- without creating parallel identity or master-data tables.

BEGIN;

CREATE OR REPLACE FUNCTION prevent_released_item_revision_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lifecycle_state = 'released' THEN
        IF NEW.item_revision_id IS DISTINCT FROM OLD.item_revision_id
           OR NEW.item_id IS DISTINCT FROM OLD.item_id
           OR NEW.revision_code IS DISTINCT FROM OLD.revision_code
           OR NEW.drawing_reference IS DISTINCT FROM OLD.drawing_reference
           OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
           OR NEW.approval_state IS DISTINCT FROM OLD.approval_state THEN
            RAISE EXCEPTION 'released_item_revision_immutable'
                USING ERRCODE = '45000',
                      DETAIL = 'Released item revisions can only move through governed supersede/obsolete command paths.';
        END IF;

        IF NEW.lifecycle_state IS DISTINCT FROM OLD.lifecycle_state
           AND NEW.lifecycle_state NOT IN ('superseded','obsolete') THEN
            RAISE EXCEPTION 'released_item_revision_immutable'
                USING ERRCODE = '45000',
                      DETAIL = 'Released item revision lifecycle mutation requires a governed domain command.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_released_item_revision_mutation ON item_revision;
CREATE TRIGGER trg_prevent_released_item_revision_mutation
    BEFORE UPDATE ON item_revision
    FOR EACH ROW EXECUTE FUNCTION prevent_released_item_revision_mutation();

INSERT INTO governed_entity_registry
    (root_code, domain_code, table_name, classification, generic_mutation_policy, allowed_commands)
VALUES
    ('master_data_item_revision', 'master_data', 'item', 'governed_root', 'domain_command_required', '["CreateItemCommand","CreateItemRevisionCommand","ReleaseItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'item_revision', 'governed_root', 'domain_command_required', '["CreateItemRevisionCommand","ReleaseItemRevisionCommand"]'::jsonb),
    ('master_data_item_revision', 'master_data', 'master_data_store', 'governed_root', 'domain_command_required', '["CreateItemCommand","CreateItemRevisionCommand","ReleaseItemRevisionCommand"]'::jsonb)
ON CONFLICT (root_code, table_name) DO UPDATE SET
    domain_code = EXCLUDED.domain_code,
    classification = EXCLUDED.classification,
    generic_mutation_policy = EXCLUDED.generic_mutation_policy,
    allowed_commands = EXCLUDED.allowed_commands,
    active = TRUE,
    updated_at = NOW();

COMMIT;
