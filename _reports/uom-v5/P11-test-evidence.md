# P11 Test Evidence

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

```text
node --check mom/scripts/portal/80-uom-control-center.js
node --check mom/scripts/portal/81-uom-quantity-widget.js
PASS.
```

```text
php -l mom/tests/Unit/Uom/UomUiProjectionP11Test.php
PASS: no syntax errors.
```

```text
composer --working-dir=mom run test -- --filter 'UomUiProjectionP11|Uom.*Ui|QuantityWidget|ControlCenter'
PASS: 14 tests, 78 assertions.
```

```text
npm --prefix mom test -- uom || true
CONTROLLED_GAP: /Users/a10/Documents/mom/mom/package.json does not exist.
```

```text
grep -R "data-authority-class\|data-route-class" mom/scripts mom/portal.html | grep -i uom
PASS: projection markers found in 80-uom-control-center.js and 81-uom-quantity-widget.js.
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
Suite result: 859 tests, 4799 assertions, 1 failure, 2 skipped.
```

Test evidence result: PASS_WITH_WARNINGS.
