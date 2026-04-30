# V21 Backend Gate Repair Diff Summary

Decision: `V21_BACKEND_GATE_REPAIR_PASS_READY_FOR_FINAL_UNLOCK_AUDIT`

## Source Files Changed

- `mom/api/controllers/EqmsAmlController.php`
- `mom/api/controllers/EqmsCsatController.php`
- `mom/api/controllers/EqmsEventsController.php`
- `mom/api/controllers/EqmsFaiController.php`
- `mom/api/controllers/EqmsLessonsLearnedController.php`
- `mom/api/controllers/EqmsSamplingPlansController.php`

No frontend current-portal forbidden file was edited by this repair.

## Repair Mapping

| File | V21 blocker | Repair |
|---|---|---|
| `EqmsAmlController.php` | Redundant `$_GET ?? []` | Kept JSON-body plus query merge semantics and used `$_GET` directly. |
| `EqmsCsatController.php` | Unused `SURVEY_METHODS` | Used the existing contract constant to validate `survey_method` during create. |
| `EqmsEventsController.php` | Undefined `isLoggedIn()` | Switched to inherited `requireAuth()` pattern already used by event-stream controllers. |
| `EqmsEventsController.php` | Array property access on pub/sub message | Read `kind`, `payload`, and `channel` via array keys. |
| `EqmsEventsController.php` | Unused SSE helper after auth repair | Removed now-dead `sendSseError()` helper. |
| `EqmsFaiController.php` | Always-true ternary | Parsed `internal_part` with boolean validation before building SQL condition. |
| `EqmsLessonsLearnedController.php` | `compact()` undefined variables | Returned the already-computed metric keys explicitly. |
| `EqmsLessonsLearnedController.php` | `never` action methods not provably terminating | Declared `doTransition()` as `never`, matching its `success()` response path. |
| `EqmsSamplingPlansController.php` | Unused `SAMPLING_TYPES` | Used the existing contract constant to validate `sampling_type` during create. |
| `EqmsSamplingPlansController.php` | Redundant `$_GET ?? []` | Kept JSON-body plus query merge semantics and used `$_GET` directly. |

## DCC Fallback Test

The previously reported PHPUnit failure in `DocumentHeaderServiceFallbackTest::testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle` was not reproducible on the current branch state:

```text
OK (2 tests, 5 assertions)
```

No DCC header service or DCC standard weakening was performed.

## Validation Summary

- PHP syntax for touched controllers: PASS
- `composer --working-dir=mom run analyse`: PASS
- `composer --working-dir=mom run test`: PASS with 1 skipped test
- `composer --working-dir=mom run check`: PASS with 1 skipped test
- Transactional REST focused PHPUnit: PASS
- V21 HMV4 static guards: PASS
- Portal fixture production-load guard: PASS
- Full Chromium replay: PASS, `491 passed`, `CHROMIUM_EXIT=0`

## Out Of Scope

- No new API route
- No new workflow authority
- No new e-sign behavior
- No new AI autonomy
- No Stage F instantiation
- No snapshot update
- No production, cutover, release, certification, or validated-system claim
