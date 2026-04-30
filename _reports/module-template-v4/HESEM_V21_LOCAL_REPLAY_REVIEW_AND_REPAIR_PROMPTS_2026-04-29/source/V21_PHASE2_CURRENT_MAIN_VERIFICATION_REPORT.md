# V21 Phase 2 Current Main Verification Report

Local replay directory: `_reports/module-template-v4/V21_LOCAL_REPLAY_2026-04-29/`

## Scope

This was a local current-main integration review only. It did not start a new slice, did not enable live API by default, did not modify `mom/portal.html`, did not load fixture script 74 in the production portal, and did not promote fixture data to `mom/qms-data`.

## Repository State

Primary checkout:
- Path: `/Users/a10/Documents/mom`
- Branch: `main`
- HEAD: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`
- `origin/main`: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`
- Dirty before review: yes

Dirty primary checkout files recorded before isolation:
- `mom/api/controllers/DocumentControlController.php`
- `mom/api/routes/dcc-routes.php`
- `mom/api/services/DocumentControl/DocumentLocaleAutomationService.php`
- `mom/scripts/portal/02-state-auth-ui.js`
- `tools/scripts/translation/dcc_argos_vi_to_en.py`
- `tools/scripts/translation/dcc_locale_backfill.php`
- untracked local pack and helper files

Review worktree:
- Path: `/Users/a10/Documents/mom-v21-phase2-local-replay-20260429`
- Branch: `codex/v21-phase2-local-replay-20260429`
- HEAD: `d555d0d5a7c16df083d1a7e173b9ad97a9402e45`
- Base: exact clean `HEAD` from current `main`
- Worktree state before report output: clean

The sibling worktree was used because the primary checkout was already dirty and included a forbidden portal file modification outside this V21 replay.

## Existing Report Presence

All requested historical reports were present:
- `_reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md`
- `_reports/module-template-v4/V21_PHASE2_STREAM_STATUS_MATRIX.md`
- `_reports/module-template-v4/V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md`
- `_reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_PLAN.md`
- `_reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md`
- `_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md`
- `_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md`
- `_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md`

## Current Local Replay Result

Static and portal safety checks passed on the clean worktree. Backend gates and Chromium E2E did not pass cleanly:
- PHPStan: failed with 20 existing EQMS controller issues.
- PHPUnit: failed with 1 DCC `DocumentHeaderServiceFallbackTest` assertion.
- Transactional REST focused contracts: passed, `36 tests, 153 assertions`.
- Playwright Chromium: blocked by missing local Chromium headless shell, not by reviewed visual drift.

## Verification Decision Impact

Current `main` is known and controlled in the review worktree, but the local replay cannot unlock Stage F because required validation is incomplete or failing:
- Chromium replay is environment-blocked by missing Playwright browser executable.
- Backend analyse/test/check is not clean.

Decision carried into the integration report:

`PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING`
