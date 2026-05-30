# P04 Test Evidence

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

## Commands

```text
php -l mom/api/services/Uom/UomStandardLibraryManifestService.php
PASS: No syntax errors detected.
```

```text
php -l mom/tests/Unit/Uom/UomStandardLibraryManifestTest.php
PASS: No syntax errors detected.
```

```text
composer --working-dir=mom run test -- --filter UomStandardLibraryManifest
PASS: 11 tests, 16 assertions.
```

```text
composer --working-dir=mom run test -- --filter 'UomStandardLibraryManifest|UomLifecycleResolution|Uom|Decimal|Conversion'
PASS: 110 tests, 194 assertions, 1 skipped.
```

```text
composer --working-dir=mom run analyse -- --memory-limit=1G
PASS: 0 errors.
```

```text
php mom/tools/release/check_user_identity_ssot.php
PASS: user identity ssot clean.
```

```text
php tools/scripts/ai-index/generate.php --verbose
PASS: repo-map, route-map, db-map, symbols, contracts-map regenerated.
```

```text
git diff --check
PASS.
```

```text
grep -R "first registered user\|first-user\|ORDER BY created_at ASC LIMIT 1\|transitional bridge" mom/database mom/api _reports/uom-v5
PASS_WITH_WARNINGS: historical migrations 224/231 and prior reports contain the pattern; P04 migration 257 does not add first registered user selection.
```

```text
composer --working-dir=mom run check
WARN: PHPStan passed; full PHPUnit failed at MOM\Tests\Unit\Services\KpiEngineAuthorityRegistryTest::testCatalogExposesDocumentAndBackendCoverage, asserting 148 is identical to 142.
```

## Coverage Notes

- TEST_EVIDENCE: P04-required simulations are now pinned in `UomStandardLibraryManifestTest`.
- TEST_EVIDENCE: Identity SSOT guard passes after service added `v_user_canonical` read and no identity writes.
- CONTROLLED_GAP: SQL migration was not applied to a live database in this prompt; validation is static plus unit/service-level.
