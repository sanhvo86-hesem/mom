# P07 Rollback Plan

Prompt: P07
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Code Rollback

- Revert `mom/api/services/Uom/QuantityKindService.php`.
- Revert `mom/api/services/Uom/UomException.php`.
- Revert `mom/api/services/Uom/ConversionEngine.php`.
- Revert `mom/api/controllers/UomController.php`.
- Remove `mom/tests/Unit/Uom/QuantityKindCompatibilityP07Test.php`.
- Regenerate AI indexes after rollback.

## Schema Rollback

Use the rollback section embedded in migration 259:

```sql
BEGIN;
DELETE FROM uom_conversion_rule
 WHERE rule_code = 'UOMCONV-TDIFF-DELTADEGF-DELTAK-v1' AND version = 1;
DELETE FROM uom_unit_catalog WHERE canonical_code = 'DeltaDegF';
DROP TABLE IF EXISTS uom_quantity_kind_compatibility;
ALTER TABLE uom_quantity_kind
    DROP COLUMN IF EXISTS lifecycle_status,
    DROP COLUMN IF EXISTS risk_level,
    DROP COLUMN IF EXISTS allowed_unit_codes,
    DROP COLUMN IF EXISTS measurement_family,
    DROP COLUMN IF EXISTS semantic_parent;
COMMIT;
```

## Data Safety

- Migration 259 is additive. It does not modify measurement history.
- Compatibility deny rows are governance metadata only.
- The new DeltaDegF rule is `pending_review`; rollback does not remove active conversion authority.

## Verification After Rollback

- `php -l` changed PHP files.
- `composer --working-dir=mom run test -- --filter 'QuantityKind|Compatibility|Uom'`.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`.
