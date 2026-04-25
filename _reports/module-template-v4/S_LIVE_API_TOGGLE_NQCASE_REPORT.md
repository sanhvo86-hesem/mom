# Live API Toggle for NQCASE Report

## Summary
First live cutover experiment. NQCASE record shell now supports an opt-in fetch from `/api/v1/nonconformance-cases/{id}` (EQMS plural alias merged in commit `d21d6462`).

Default: fixture mode (unchanged).
Opt-in: `?hmv4-live-api=1`, `data-hmv4-live-api="true"`, or `window.HMV4_LIVE_API_ENABLED=true`.

## Branch and working tree
- Branch: `codex/live-api-toggle-nqcase`
- Base: `main` `554e28b4`
- Pre-existing untracked prompt/report files in `_reports/module-template-v4/` were preserved and not staged for this change.
- During validation, the shared worktree was moved briefly to `codex/backend-transactional-rest`; the live-toggle branch pointer was reset to the current `main` HEAD before staging this change.

## Files changed
- Count: 5 source/test/doc/report files plus one E2E package script update.
- `mom/scripts/portal/70-module-template-v4-hydration.js`
- `tests/e2e/module-template-v4-live-api.spec.ts`
- `tests/e2e/package.json`
- `tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html`
- `docs/adr/0011-live-api-toggle-mechanism.md`
- `_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md`

## Toggle mechanism verified
- `?hmv4-live-api=1` enables: YES (`module-template-v4-live-api.spec.ts`)
- `data-hmv4-live-api="true"` body attr enables: YES (`authoritative-record-shell-nc-live-mode.html`)
- Default OFF in `mom/portal.html`: YES
- `HMV4_PREVIEW_ENABLED` untouched: YES

## Live API integration verified
- GET `/api/v1/nonconformance-cases/{id}` called: YES (Playwright request capture saw `GET /api/v1/nonconformance-cases/NC-001`)
- Response shape adapted to fixture shape: YES
- Loading placeholder shown: YES
- Error fallback shown when backend returns 401/4xx/5xx/302 auth redirect: YES
- `data-hmv4-source="live-api"` set on success: IMPLEMENTED

## Mutation policy unchanged
- All mutation buttons disabled in both fixture and live mode: VERIFIED
- No POST/PATCH/DELETE calls in adapter: VERIFIED_STATIC

## E2E result
- `node --check mom/scripts/portal/70-module-template-v4-hydration.js`: PASS
- `node --check mom/scripts/portal/73-module-template-v4-renderers.js`: PASS
- `PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test module-template-v4-live-api.spec.ts --project=chromium --reporter=list`: PASS, 3/3
- Full Chromium module-template-v4 suite: FAIL_WITH_EXISTING_VISUAL_DRIFT, 115 passed / 20 failed.
- Full-suite failures were visual snapshot mismatches: 11 CAPA pages from concurrent CAPA slice work, 8 domain/module/shell pages with existing visual drift, and the new `authoritative-record-shell-nc-live-mode.html` page because no committed visual baseline exists for this new live-mode fixture.

## Per-slice rollout plan (per ADR-0011)
1. NQCASE - DONE in this slice after verification.
2. CAPA - follow-up slice.
3. CDOC - follow-up slice.
4. Training records - follow-up after projection-to-authority read contracts are stable.
5. Dispatch targets - follow-up only after write re-anchor policy is separately verified.

## Decision
LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS
