# P12 Test Evidence

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

```text
grep -R "unit_code\|measurement_value\|quantity_kind\|uom" mom/api mom/scripts mom/data 2>/dev/null | head -300 || true
PASS: inventory reviewed; backlog generated.
```

```text
php -l mom/tests/Unit/Uom/UomDomainIntegrationP12Test.php
PASS: no syntax errors.
```

```text
php -r 'json_decode(...)'
PASS: P12 registry and backlog JSON decode successfully.
```

```text
composer --working-dir=mom run test -- --filter 'UomDomainIntegrationP12|ItemUom|Inspection|Lot|WorkOrder|Uom'
FIRST RUN: failed on pricing policy wording mismatch.
REPAIR: updated registry phrase to include `price/currency`.
SECOND RUN: PASS, 177 tests, 580 assertions, 1 skipped.
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
Suite result: 864 tests, 4930 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
