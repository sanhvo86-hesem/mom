# V21 Phase 2 Integration Review Report

Date: 2026-04-25
Worktree: `/Users/a10/Documents/mom-phase2-integration-review`
Review branch: `codex/phase2-integration-review`

## Summary

Current `main` contains the expected Phase 2 reports and landed streams after `554e28b4`. Static guards passed, fixture JSON parses, current portal safety holds, and the full Chromium E2E reality check passed on current main.

The older Stream D.4 report still records `CROSS_BROWSER_FAIL_BLOCK_NEXT`, but its listed Chromium visual drift is no longer reproducible on current `main`. No Chromium snapshot repair was executed.

## Current main HEAD

```text
5f6376bb test(module-template-v4): add live mode chromium baseline
```

`main`, `origin/main`, and `origin/HEAD` were aligned at this commit during verification.

## Phase 2 stream status matrix

Detailed matrix: `_reports/module-template-v4/V21_PHASE2_STREAM_STATUS_MATRIX.md`

| stream | current integration status | next action |
|---|---|---|
| CAPA Slice 4 | Passed with warnings | Keep as landed; do not reimplement. Carry live API replication only into Phase 3 planning. |
| Live API NQCASE | Passed with warnings | Keep opt-in only; use ADR-0011 pattern for future slices. |
| Transactional REST C2 | Passed with warnings | Keep focused C2 paths; separate broader PHPStan/PHPUnit debt from this review. |
| Cross-browser D4 | Historical report says fail; current Chromium evidence passes | Treat D4 Chromium blocker as superseded by current-main evidence. No repair now. |

## Static guard results

Detailed evidence: `_reports/module-template-v4/V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md`

| Guard | Result |
|---|---:|
| `node --check mom/scripts/portal/70-module-template-v4-hydration.js` | PASS |
| `node --check mom/scripts/portal/71-module-template-v4-routes.js` | PASS |
| `node --check mom/scripts/portal/72-module-template-v4-bridge.js` | PASS |
| `node --check mom/scripts/portal/73-module-template-v4-renderers.js` | PASS |
| `node --check mom/scripts/portal/74-module-template-v4-fixtures.js` | PASS |
| `mom/portal.html` fixture production load guard | PASS |
| forbidden/current portal diff guard | PASS |
| fixture JSON parse sweep | PASS |

## Full Chromium E2E result

Command:

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
CHROMIUM_EXIT=$?
rm -rf node_modules
cd ../..
```

Result:

```text
159 passed
CHROMIUM_EXIT=0
```

Classification:

```text
No visual baseline drift observed.
No functional regression observed.
No a11y failure observed.
No live-api-only failure observed.
No backend unavailable warning observed.
```

Warnings:

```text
NO_COLOR ignored because FORCE_COLOR is set
```

The performance spec rewrote `_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-25.md` during the run with local machine timings. That self-generated timing side effect was not retained, so this branch stays scoped to the V21 integration review reports.

`tests/e2e/node_modules` was removed after the run.

## Cross-browser blocker status

Repair plan: `_reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_PLAN.md`

Stream D.4 listed eight failing Chromium visual pages:

```text
domain-landing-quality-operations.html
domain-landing-shopfloor-execution.html
domain-landing.html
module-landing-dispatch-board.html
module-landing-empty.html
module-landing-quality-case-management.html
module-landing.html
shell-home.html
```

Current-main Chromium E2E passed these pages. The D4 blocker is therefore stale against current `main` and should not block Phase 3 planning.

No snapshot update was run. No source repair was needed.

## CAPA Slice 4 follow-up decision

Keep CAPA Slice 4 as landed development/prototype work. It is read-only, fixture-backed, and explicitly not a governed workflow execution path yet.

Follow-up belongs in Phase 3 planning: replicate the opt-in live API toggle pattern to CAPA only after the target read contract and fallback behavior are specified.

## Live API toggle follow-up decision

Keep NQCASE live API off by default. The opt-in mechanisms are acceptable for development/prototype validation:

```text
?hmv4-live-api=1
data-hmv4-live-api="true"
window.HMV4_LIVE_API_ENABLED=true
```

Do not enable live API globally or by default in current portal safety posture.

## Backend REST C2 follow-up decision

Keep the already-merged canonical transactional REST C2 routes. Do not add new backend APIs in this integration review.

Broader PHPStan and full PHPUnit blockers documented by the C2 report should be handled as separate backend quality debt, not hidden inside Phase 2 integration closure.

## Recommended next branch/PR actions

1. Keep `codex/phase2-integration-review` as the report branch for this review.
2. Do not run Chromium snapshot repair on current main unless future drift is reproduced.
3. Open Phase 3 as planning-only work first, with separate branches per shell/read-model candidate.
4. Keep CI matrix hardening separate from business shell slices so browser-support risk stays visible.
5. Preserve current portal safety: no fixture registry promotion to `mom/qms-data`, no default live API, no current navigation switch.

## Phase 3 readiness

Phase 2 is ready for Phase 3 planning based on current-main evidence:

- Expected Phase 2 reports exist.
- Static guards pass.
- Full Chromium E2E passes.
- Cross-browser D4 Chromium blocker is stale against current main.
- CAPA/NQCASE/C2 warnings are follow-up planning inputs, not current integration blockers.

This is pre-production readiness for planning, not an operational release or deployment event.

Phase 3 planning artifacts prepared:

```text
_reports/module-template-v4/V21_PHASE3_PLANNING_PACKAGE.md
_reports/module-template-v4/V22_PHASE3_CANDIDATE_MATRIX.md
_reports/module-template-v4/V22_PHASE3_RECOMMENDED_SEQUENCE.md
_reports/module-template-v4/V22_PHASE3_SLICE5_CDOC_SCOPE.md
_reports/module-template-v4/V22_PHASE3_SLICE6_INSP_SCOPE.md
_reports/module-template-v4/V22_PHASE3_SLICE7_BREL_SCOPE.md
_reports/module-template-v4/V22_PHASE3_SLICE8_ECO_SCOPE.md
_reports/module-template-v4/V22_PHASE3_LIVE_API_REPLICATION_PLAN.md
_reports/module-template-v4/V22_PHASE3_CI_MATRIX_HARDENING_SCOPE.md
_reports/module-template-v4/V22_PHASE3_IMPLEMENTATION_PROMPT_DRAFTS.md
```

## Decision

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```
