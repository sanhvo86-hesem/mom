-- Align PLM affected-object effect semantics with exact release authority
-- checks used by document/evidence/deployment services.

BEGIN;

ALTER TABLE plm_change_affected_objects
    DROP CONSTRAINT IF EXISTS plm_change_affected_objects_requested_effect_check;

ALTER TABLE plm_change_affected_objects
    ADD CONSTRAINT plm_change_affected_objects_requested_effect_check
    CHECK (requested_effect IN (
        'create',
        'revise',
        'release',
        'supersede',
        'withdraw',
        'obsolete',
        'replace',
        'amend',
        'deviation',
        'metadata_update',
        'training_update',
        'publication_update'
    ));

COMMIT;
