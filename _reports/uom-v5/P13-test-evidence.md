# P13 Test Evidence

Prompt: P13
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P13 commit: 52843a8248e10dbac5fee56ae280972ae272c96f
Decision token: UOM_V5_P13_ENTERPRISE_OPERABILITY_LOCKED

```text
grep -R "trace_id\|span\|metric\|redis\|cache" mom/api/services/Uom mom/api/controllers 2>/dev/null || true
PASS: existing trace/cache/metric evidence reviewed.
```

```text
php -l mom/api/services/Uom/UcumParser.php
php -l mom/tests/Unit/Uom/UomOperabilityP13Test.php
PASS: no syntax errors.
```

```text
php -r 'json_decode(...)'
PASS: P13 operability registry decodes successfully.
```

```text
composer --working-dir=mom run test -- --filter 'Security|Auth|Uom|Fuzz|Telemetry'
WARN: broad prompt-suggested filter selected KpiEngineAuthorityRegistryTest because Auth matches Authority; failure is the existing KPI count drift.
```

```text
composer --working-dir=mom run test -- --filter 'UomOperabilityP13'
PASS: 6 tests, 30 assertions.
```

```text
php -r 'require "vendor/autoload.php"; ... DecimalString::parse(...) ...'
PASS: decimal_parse_ms p50=0.000542 p95=0.000584 p99=0.000625 n=500.
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
Suite result: 870 tests, 4960 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
