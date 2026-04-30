# V21 Phase 2 Integration Review Report

## Decision

`PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING`

## Review Type

Gate review only. This is not a new feature slice, not a production release, not a validated-system claim, and not a go-live/cutover activity.

## Current Commit

- Branch: `codex/v21-phase2-local-replay-20260429`
- Commit: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`
- `origin/main`: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`

## Summary

- A clean sibling worktree was created because the primary `main` checkout was dirty before review.
- Static HMV4 script syntax checks passed for scripts 70 through 74.
- Production portal fixture-load guard passed: `mom/portal.html` does not load script 74.
- Fixture JSON parse passed across `tests/fixtures/module-template-v4`.
- Live API default safety passed static grep: enabled live API appeared only in opt-in fixture pages.
- Focused transactional REST C2 PHPUnit tests passed: `36 tests, 153 assertions`.
- Backend analyse/test/check did not pass cleanly because of broader PHPStan EQMS debt and a DCC fallback-title PHPUnit failure.
- Chromium E2E could not launch because the Playwright Chromium executable is missing locally.
- No source render was reviewed, so no Chromium snapshot repair was performed or authorized.

## Evidence Classification

| Evidence Area | Status | Notes |
|---|---|---|
| Static guards | PASS | `node --check` passed for 70-74. |
| Portal fixture safety | PASS | `PASS no fixture production load`. |
| Fixture JSON parse | PASS | All HMV4 fixture JSON parsed. |
| Backend analyse/test/check | FAIL | PHPStan 20 errors; PHPUnit 1 DCC failure; focused C2 passed. |
| Playwright Chromium full suite | BLOCKED | `CHROMIUM_EXIT=1`; missing Chromium headless shell. |
| CAPA Slice 4 | WARN | Historical pass with warnings; current Chromium proof blocked. |
| NQCASE live API toggle | WARN | Static opt-in safety passes; focused runtime proof blocked. |
| Transactional REST C2 | WARN | Focused contracts pass; broader backend gates fail. |
| Cross-browser/Chromium | WARN | Environment-blocked, not confirmed current visual drift. |

## Repairs Required Before Stage F

1. Install the matching Playwright Chromium browser and rerun full Chromium E2E.
2. If Chromium reaches rendering and visual drift appears, review source render before requesting any snapshot refresh.
3. Triage or formally classify the 20 PHPStan errors and the DCC `DocumentHeaderServiceFallbackTest` failure.

## Stage F Unlock

NO.

Only `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING` unlocks Stage F. This replay did not meet that threshold.
