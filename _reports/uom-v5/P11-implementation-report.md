# P11 Implementation Report

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED
Posture: development/prototype -> pre-production readiness candidate only.

## Scope

REPO_EVIDENCE: P11 was limited to portal UI scripts, UI-focused tests, regenerated AI index, and reports. No backend mutation path, schema migration, or production runtime call was added.

## File Inventory Before/After

Before:

- REPO_EVIDENCE: `mom/scripts/portal/80-uom-control-center.js` directly fetched UoM APIs and allowed calculator interaction without a required quantity-kind/source binding.
- REPO_EVIDENCE: `mom/scripts/portal/81-uom-quantity-widget.js` bound magnitude and unit but did not expose quantity-kind/source/context in `getValue()`.
- REPO_EVIDENCE: alias ambiguity had no widget quarantine workflow.
- REPO_EVIDENCE: no P11 UI projection static regression test existed.

After:

- REPO_EVIDENCE: both scripts mark UoM UI as `data-authority-class="projection"` and `data-route-class="workspace-projection"`.
- REPO_EVIDENCE: fixture mode is default; live API is explicit opt-in through `window.UOM_LIVE_API_ENABLED === true` or `localStorage.uom_live_api=1`.
- REPO_EVIDENCE: calculator submit is disabled until magnitude, quantity kind, source unit, target unit, and source system are present.
- REPO_EVIDENCE: quantity widget returns magnitude, canonical unit, quantity kind, source system, context, MEASVAL, validity, and errors.
- REPO_EVIDENCE: external alias input resolves through `/api/v1/uom/aliases/resolve` when live and uses fixture quarantine otherwise; ambiguous `M` is never auto-mapped.
- REPO_EVIDENCE: unit loading filters by kind/item/site/policy and disabled units carry tooltip reasons.
- REPO_EVIDENCE: Vietnamese labels and ARIA feedback/focus affordances were strengthened.

## Diff Summary

- `mom/scripts/portal/80-uom-control-center.js`: added fixture-default API wrapper, projection metadata, required quantity-kind/source fields, disabled-submit validation, safe fixture conversion, and alias quarantine copy.
- `mom/scripts/portal/81-uom-quantity-widget.js`: added fixture data, live opt-in wrapper, quantity-kind/source/context state, alias quarantine flow, unit filtering/disabled reasons, validation, ARIA invalidation, and original/normalized display feedback.
- `mom/tests/Unit/Uom/UomUiProjectionP11Test.php`: added static tests for projection, fixture default, naked-number guard, binding, alias quarantine, unit filtering, and accessibility markers.
- `.ai/*`: regenerated index files.

## Acceptance Gates

- TEST_EVIDENCE: `node --check` passes for both UoM portal scripts.
- TEST_EVIDENCE: focused PHPUnit UI contract test passes.
- TEST_EVIDENCE: projection metadata grep returns both UoM scripts.
- TEST_EVIDENCE: PHPStan passes with 0 errors.
- TEST_EVIDENCE: `git diff --check` passes.
- CONTROLLED_GAP: `npm --prefix mom test -- uom` is unavailable because `mom/package.json` does not exist.
- CONTROLLED_GAP: full `composer check` remains red because of the existing KPI registry count drift.

## Residual Risk Ledger

- CONTROLLED_GAP: UI runtime visual/browser verification is not available through an existing JS test harness in this repo.
- CONTROLLED_GAP: domain-wide form replacement of naked quantity fields is deferred to P12/P15.
- CONTROLLED_GAP: live HTTP permission/idempotency behavior remains governed by P10/backend routes, not by P11 UI code.
