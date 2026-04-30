# V21 Backend Gate Repair Report

Run timestamp: 2026-04-30T11:23:55+0700  
Report directory date: 2026-04-29  
Branch: `codex/v21-backend-gate-repair-20260429`  
Commit base: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`  
Decision: `V21_BACKEND_GATE_REPAIR_PASS_READY_FOR_FINAL_UNLOCK_AUDIT`

## Scope

This was V21 backend gate repair only. It was not a new business slice, did not start Stage F, did not add routes, did not create workflow authority, did not add e-sign behavior, did not add AI autonomy, and did not make any production/cutover/validated-system claim.

## Starting State

The local checkout started on `main` at `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`, matching `origin/main`. It had unrelated dirty and untracked files before this prompt. The requested remediation branch was created from that HEAD:

```text
codex/v21-backend-gate-repair-20260429
```

Source edits were limited to the six EQMS controller files listed in the V21 PHPStan blocker set. No frontend forbidden/current portal file was edited.

## Backend Blocker Repair

PHPStan baseline reproduced the exact 20 errors from the V21 local replay. Repairs were narrow:

- Removed redundant `$_GET ?? []` patterns while preserving JSON-body plus query merge semantics.
- Used existing CSAT and sampling-plan enum constants for meaningful create-time validation.
- Replaced the undefined SSE `isLoggedIn()` call with inherited `requireAuth()`.
- Converted Predis pub/sub message access from object properties to array keys.
- Removed an SSE error helper that became unused after the auth repair.
- Parsed FAI `internal_part` filter as a boolean before building the SQL condition.
- Replaced undefined-variable `compact()` use with explicit metrics keys.
- Declared the lessons-learned transition helper as `never` to match its terminating response path.

## DCC Fallback Test Review

The known PHPUnit failure was checked directly:

```text
MOM\Tests\Unit\Services\DocumentHeaderServiceFallbackTest::testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle
```

Current result:

```text
OK (2 tests, 5 assertions)
```

Because the failure was not reproducible on the current branch state and full PHPUnit passed, no DCC service/test weakening was performed.

## Validation Results

| Gate | Result |
|---|---|
| PHP syntax, touched controllers | PASS |
| `composer --working-dir=mom run analyse` | PASS |
| `composer --working-dir=mom run test` | PASS, 572 tests, 4903 assertions, 1 skipped |
| `composer --working-dir=mom run check` | PASS, analyse plus PHPUnit |
| Transactional REST focused PHPUnit | PASS, 36 tests, 153 assertions |
| HMV4 node syntax guards 70-74 | PASS |
| Portal fixture production-load guard | PASS |
| Full Chromium replay | PASS, 491 passed, `CHROMIUM_EXIT=0` |

## Environment Notes

Two commands required sandbox escalation for environment reasons:

- PHPStan/Composer check needed a local PHPStan worker TCP socket.
- Playwright needed PHP's local web server to bind `127.0.0.1:8091`.

Both succeeded after escalation. The initial sandbox failures are environment permission failures, not backend or rendered-app failures.

## Remaining Action

Backend and Chromium gates are ready for the final V21 unlock audit prompt. This report does not unlock Stage F by itself.

Final decision:

```text
V21_BACKEND_GATE_REPAIR_PASS_READY_FOR_FINAL_UNLOCK_AUDIT
```
