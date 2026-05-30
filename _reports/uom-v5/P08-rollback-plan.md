# P08 Rollback Plan

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Code Rollback

- Revert `ConversionEngine.php`, `ContextualConversionPlanner.php`, `DensityContextualConverter.php`, `ItemUomPolicyService.php`, `MeasurementValueFactory.php`, and `UomController.php`.
- Remove `PotencyContextualConverter.php`, `PackagingContextualConverter.php`, and `ContextualConversionP08Test.php`.
- Regenerate AI indexes.

## Schema Rollback

Use the rollback section embedded in migration 260:

```sql
BEGIN;
DELETE FROM uom_unit_catalog WHERE canonical_code IN ('IU','EA','BOX');
DROP TABLE IF EXISTS uom_potency_assay_registry;
DROP INDEX IF EXISTS idx_ipp_context_effective_status;
ALTER TABLE item_packaging_policy
    DROP COLUMN IF EXISTS evidence_ref,
    DROP COLUMN IF EXISTS lifecycle_status,
    DROP COLUMN IF EXISTS count_per_parent,
    DROP COLUMN IF EXISTS packaging_level;
DROP INDEX IF EXISTS idx_mdr_material_lot_effective;
DROP INDEX IF EXISTS idx_mdr_item_effective;
ALTER TABLE material_density_registry
    DROP COLUMN IF EXISTS approval_status,
    DROP COLUMN IF EXISTS evidence_ref,
    DROP COLUMN IF EXISTS source_method,
    DROP COLUMN IF EXISTS material_id,
    DROP COLUMN IF EXISTS item_id;
COMMIT;
```

## Verification After Rollback

- `composer --working-dir=mom run test -- --filter 'Density|Potency|Packaging|ItemUom|Uom'`.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`.
