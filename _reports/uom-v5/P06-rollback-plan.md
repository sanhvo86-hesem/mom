# P06 Rollback Plan

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Code Rollback

- Revert `mom/api/services/Uom/UomAliasResolutionService.php`.
- Revert `mom/api/controllers/UomController.php`.
- Remove `mom/api/services/Uom/UcumParser.php`.
- Remove P06 unit tests under `mom/tests/Unit/Uom/`.
- Regenerate AI indexes if rollback changes tracked symbols/routes.

## Schema Rollback

Use the rollback section embedded in migration 258:

```sql
BEGIN;
DROP INDEX IF EXISTS idx_uom_quarantine_trace_id;
ALTER TABLE uom_alias_quarantine
    DROP COLUMN IF EXISTS trace_id,
    DROP COLUMN IF EXISTS reason,
    DROP COLUMN IF EXISTS candidates,
    DROP COLUMN IF EXISTS source_system,
    DROP COLUMN IF EXISTS normalized_alias;
COMMIT;
```

## Data Safety

- Migration 258 is additive and keeps existing quarantine rows intact.
- Rolling back columns removes P06 remediation metadata; export pending quarantine rows first if they were created after deployment.

## Verification After Rollback

- `php -l` changed PHP files.
- `composer --working-dir=mom run test -- --filter 'Uom|Alias|External'`.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`.
