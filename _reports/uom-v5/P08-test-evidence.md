# P08 Test Evidence

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

```text
php -l modified P08 PHP files
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'ContextualConversionP08|ContextualConversionPlanner|Density|Potency|Packaging|ItemUom|Uom'
PASS: 164 tests, 386 assertions, 2 skipped.
```

```text
grep -R "density_based\|potency_assay\|packaging_policy" mom/api/services/Uom mom/database/migrations mom/tests/Unit/Uom
REVIEWED: contextual categories are now routed by services, migration context schema, and P08 tests.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS: index regeneration completed; migrations count 240.
```

```text
git diff --check
PASS.
```

```text
composer --working-dir=mom run check
WARN: PHPStan passed; full PHPUnit failed at KpiEngineAuthorityRegistryTest.php:81, asserting 148 is identical to 142.
```

Test evidence result: PASS_WITH_WARNINGS.
