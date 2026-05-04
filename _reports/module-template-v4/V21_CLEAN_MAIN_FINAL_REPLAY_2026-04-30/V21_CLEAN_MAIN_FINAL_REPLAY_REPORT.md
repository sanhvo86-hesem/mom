# V21 Clean Main Final Replay Report

Generated: 2026-04-30

## Decision

`PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING`

## Scope

This was a V21 clean-main integration replay and blocker repair. Stage F was not started. No new module, slice, route, workflow authority, e-sign behavior, AI autonomy, production claim, cutover claim, release claim, or validated-system claim was created.

## Checkout

- Replay worktree: `/Users/a10/Documents/mom-v21-clean-main-replay`
- Replay branch: `codex/v21-clean-main-replay-20260430`
- Base before DCC repair: `7260a7d517603031265c18227ecf5c1d26aabc6e`
- `origin/main` at replay: `7260a7d517603031265c18227ecf5c1d26aabc6e`
- Branch source: created from `origin/main`

## Repair Applied

The current-main replay initially failed on:

```text
MOM\Tests\Unit\Services\DocumentHeaderServiceFallbackTest::testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle
Expected: QMS Manual
Actual: QMS-MAN-001
```

The repair is limited to `mom/api/services/DocumentControl/DocumentHeaderService.php`.

Root cause: the transitional DCC header fallback did not read the current legacy catalog shapes consistently. It only consumed `docs_custom.json` when the top-level JSON was a list, but the repo stores custom docs under the `docs` key; it also did not use existing DCC bootstrap seeds from controlled HTML when no catalog row exists for a document such as `QMS-MAN-001`.

Fix: the service now reads `scan_cache.json`, `docs_custom.local.json`, and `docs_custom.json` through the same `docs`-aware row loader, then falls back to controlled-document DCC bootstrap metadata. DB values still win unless the DB title is blank or just the canonical doc code.

## Final Gate Results After Repair

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused DCC fallback PHPUnit | PASS | `OK (2 tests, 5 assertions)`. |
| HMV4 JS syntax 70-74 | PASS | All five `node --check` commands exited 0. |
| Portal fixture production-load guard | PASS | `PASS no fixture production load`. |
| Forbidden/current portal diff guard | PASS | `PASS forbidden/current portal diff`. |
| Fixture JSON parse | PASS | All JSON fixtures under `tests/fixtures/module-template-v4` parsed. |
| PHPStan analyse | PASS | `[OK] No errors`. |
| PHPUnit full suite | PASS | 572 tests, 4903 assertions, 1 skipped. |
| Composer check | PASS | PHPStan and PHPUnit passed. |
| Transactional REST C2 | PASS | `OK (36 tests, 153 assertions)`. |
| Playwright Chromium full suite | PASS | `491 passed (3.1m)`, `CHROMIUM_EXIT=0`. |
| AI index regeneration | PASS | `php tools/scripts/ai-index/generate.php --verbose` completed after escalated rerun. |

## Stage F

The V21 gate blocker is cleared on the clean replay branch. Stage F was not started by this work.
