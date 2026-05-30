# P09 Test Evidence

Prompt: P09
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

```text
php -l modified P09 PHP files
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'MeasurementValueP09|MeasurementValue|Measval|DigitalThread|Uom'
PASS: 147 tests, 330 assertions, 1 skipped.
```

```text
grep -R "temperature\|weight\|length\|qty\|quantity\|measurement" mom/data mom/scripts mom/api | head -200
REVIEWED: backlog created in P09-naked-number-backlog.json.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS.
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
