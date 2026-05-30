# P03 Test Evidence

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

## Syntax

```text
php -l mom/api/services/Uom/ConversionRuleService.php
php -l mom/api/services/Uom/UomWorkflowService.php
php -l mom/api/services/Uom/UomImpactAnalysisService.php
php -l mom/api/services/Uom/UomDataQualityScanner.php
php -l mom/tests/Unit/Uom/UomLifecycleResolutionTest.php
Result: no syntax errors.
```

## Focused Tests

```text
composer --working-dir=mom run test -- --filter 'UomLifecycleResolution|Uom|Decimal|Conversion'
Result: OK, but some tests were skipped. Tests: 104, Assertions: 187, Skipped: 1.
```

## Static Analysis

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
Result: OK, no errors.
```

## Full Check

```text
composer --working-dir=mom run check
Result: PHPStan pass, PHPUnit fails in unrelated KPI test:
MOM\Tests\Unit\Services\KpiEngineAuthorityRegistryTest::testCatalogExposesDocumentAndBackendCoverage
Failed asserting that 148 is identical to 142.
Tests: 809, Assertions: 4604, Failures: 1, Skipped: 2.
```

## Grep Checks

```text
rg -n "uom_conversion_rule[^\n]*(rule_version)|r\.rule_version|SELECT [^\n]*rule_version" mom/api/services/Uom mom/tests/Unit/Uom mom/database/migrations/21[4-9]_*.sql mom/database/migrations/22[0-9]_*.sql mom/database/migrations/23[0-1]_*.sql
Result: remaining service hits use `version AS rule_version`; no `r.rule_version` join remains outside test assertion text.
```

```text
rg -n "lifecycle_status = 'approved'|uom:rule:\{from\}|uom:rule:\{from\}:\{to\}|CACHE_PREFIX = 'uom:rule:'" mom/api/services/Uom mom/api/controllers/UomController.php mom/database/migrations/226_uom_indexes.sql
Result: resolver old approved-only predicate removed; remaining approved-centric API/index items are assigned to P10 or migration history, and legacy cache prefix remains only for invalidation.
```

## AI Index

```text
php tools/scripts/ai-index/generate.php --verbose
Result: index regenerated successfully.
```
