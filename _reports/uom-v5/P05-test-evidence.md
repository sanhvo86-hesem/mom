# P05 Test Evidence

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

```text
grep -R "floatval\|doubleval\|(float)\|is_nan\|INF" mom/api/services/Uom mom/api/controllers/UomController.php
PASS: no output.
```

```text
php -l modified P05 PHP files
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'ConversionEngineP05|DecimalString|Affine|ExactLinear|MeasurementEvidence|ContextualConversionPlanner'
PASS: 56 tests, 109 assertions.
```

```text
composer --working-dir=mom run test -- --filter 'Uom|Decimal|Conversion'
PASS: 117 tests, 227 assertions, 1 skipped.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
git diff --check
PASS.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS: index regeneration completed.
```

```text
composer --working-dir=mom run check
WARN: PHPStan passed; full PHPUnit failed at KpiEngineAuthorityRegistryTest.php:81, asserting 148 is identical to 142.
```

Test evidence result: PASS_WITH_WARNINGS.
