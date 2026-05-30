# P14 Test Evidence

Prompt: P14
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P14 commit: 93046b7c5d8dbba9af8f2824e268baeb4206833d
Decision token: UOM_V5_P14_VALIDATION_READY_PACKAGE_COMPLETE

```text
php -l mom/tests/Unit/Uom/UomValidationPackageP14Test.php
PASS: no syntax errors.
```

```text
test -s _reports/uom-v5/P14-traceability-matrix.csv
PASS.
```

```text
grep -R "signature_meaning\|audit\|traceability\|URS\|OQ\|PQ" _reports/uom-v5 mom/api/services/Uom 2>/dev/null | head -200 || true
PASS: evidence found across P14 validation package and UoM services.
```

```text
composer --working-dir=mom run test -- --filter 'UomValidationPackageP14'
FIRST RUN: failed because CSV files lacked package posture phrase.
REPAIR: added posture header to FMEA and traceability CSV.
SECOND RUN: PASS, 6 tests, 65 assertions.
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
rg -i forbidden regulated-runtime phrase over P14 validation artifacts
PASS: no matches.
```

```text
git diff --check
PASS.
```

```text
composer --working-dir=mom run check
WARN: PHPStan passed; full PHPUnit failed at KpiEngineAuthorityRegistryTest.php:81, asserting 148 is identical to 142.
Suite result: 876 tests, 5025 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
