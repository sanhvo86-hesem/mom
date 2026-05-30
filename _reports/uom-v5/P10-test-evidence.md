# P10 Test Evidence

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

```text
php -l mom/api/routes/uom-routes.php
php -l mom/api/controllers/UomController.php
php -l mom/tests/Unit/Uom/UomApiContractP10Test.php
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'UomApiContractP10|Uom.*Api|ProblemDetails|OpenApi'
PASS: 7 tests, 176 assertions.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS: regenerated .ai index files.
```

```text
git diff --check
PASS.
```

```text
composer --working-dir=mom run check
WARN: PHPStan passed; full PHPUnit failed at KpiEngineAuthorityRegistryTest.php:81, asserting 148 is identical to 142.
Suite result: 853 tests, 4756 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
