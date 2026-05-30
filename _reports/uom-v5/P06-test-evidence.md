# P06 Test Evidence

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

```text
php -l modified P06 PHP files
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'Uom.*Alias|Ucum|External|P06'
PASS: 9 tests, 35 assertions.
```

```text
grep -R "alias.*default" mom/api/services/Uom
PASS: no output.
```

```text
composer --working-dir=mom run test -- --filter 'Uom|Alias|Ucum|External'
PASS: 133 tests, 308 assertions, 1 skipped.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS: index regeneration completed.
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
