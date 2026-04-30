# V21 Environment Repair And Chromium Replay Report

Run date: 2026-04-30T07:10:25+0700  
Requested report directory date: 2026-04-29  
Decision: `V21_CHROMIUM_REPLAY_PASS_BACKEND_REPAIRS_STILL_REQUIRED`

## Scope

This was a development/prototype, pre-production readiness replay only. It did not start a new slice, did not instantiate Stage F, did not change application source, and did not update snapshots.

## Repository State

- Primary checkout: `/Users/a10/Documents/mom`
- Replay worktree: `/Users/a10/Documents/mom-v21-env-replay-20260429`
- Replay branch: `codex/v21-env-replay-20260429`
- Commit under test: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`
- `origin/main`: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`

The primary checkout was dirty before replay, including a modified forbidden/current-portal file `mom/scripts/portal/02-state-auth-ui.js`. To avoid overwriting or interpreting unrelated local work as V21 evidence, the replay was executed in a clean sibling worktree pinned to the same commit. The requested report bundle is copied back to the primary checkout after generation.

## Environment Repair

The previous blocker was a missing local Playwright Chromium headless shell cache. The following repair was performed under `tests/e2e`:

- `npm install --no-package-lock`: PASS
- `npx playwright install chromium`: PASS
- Playwright version observed: `1.59.1`
- Chromium headless shell now present at `/Users/a10/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell`

## Static Safety Replay

- `node --check` for HMV4 scripts `70` through `74`: PASS
- `mom/portal.html` fixture production-load guard: PASS, `74-module-template-v4-fixtures.js` is not loaded
- Forbidden diff guard in clean replay worktree: PASS
- Fixture JSON parse under `tests/fixtures/module-template-v4`: PASS

## Chromium Replay

- Command: `PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list`
- Result: PASS
- Summary: `491 passed (2.8m)`
- Exit: `CHROMIUM_EXIT=0`
- Visual/baseline evidence: no rendered visual diff reproduced
- Focused diagnosis: not run because the full Chromium project passed
- Snapshot refresh: not run

The Playwright performance spec generated `_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-30.md` as a local side effect in the replay worktree. It was removed from the requested output bundle because this prompt only approved the V21 environment replay report files.

## Remaining Non-Chromium Blockers

The previous V21 report still has unresolved backend gate findings:

- `composer --working-dir=mom run analyse`: previously failed with existing EQMS PHPStan errors
- `composer --working-dir=mom run test`: previously failed in `DocumentHeaderServiceFallbackTest`
- `composer --working-dir=mom run check`: previously failed at analyse

These were not repaired or rerun by this prompt. Therefore Stage F remains locked even though the Chromium environment blocker is cleared.

## Final Decision

`V21_CHROMIUM_REPLAY_PASS_BACKEND_REPAIRS_STILL_REQUIRED`
