# P15 Test Evidence

Prompt: P15
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P15 commit: 89b07a7cce1eb279a63cd03c08e419e37f4cf240
Decision token: UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY

```text
grep -R "qty\|quantity\|weight\|length\|temperature\|pressure\|tolerance\|potency" mom/database mom/api mom/data 2>/dev/null | head -500 || true
PASS: sampled 500 lines and created scan classification.
```

```text
php -l mom/tests/Unit/Uom/UomBackfillVerticalP15Test.php
PASS: no syntax errors.
```

```text
php -r 'json_decode(...)'
PASS: P15 registry/report/sample JSON decode.
```

```text
test -s _reports/uom-v5/P15-backfill-risk-register.md
PASS.
```

```text
composer --working-dir=mom run test -- --filter 'UomBackfillVerticalP15|Backfill|Vertical|Uom'
PASS: 176 tests, 660 assertions, 1 skipped.
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
Suite result: 881 tests, 5081 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
