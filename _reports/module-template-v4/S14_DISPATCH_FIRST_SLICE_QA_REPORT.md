# S14 Dispatch First Slice QA Report

## Summary

Dispatch Board first-slice development QA completed with local HMV4-only stabilization fixes.

The slice remains a read-only projection workspace. No production cutover was performed. No production navigation was switched. No live dispatch mutation, backend API, or production registry promotion was added.

Decision:

```text
DISPATCH_FIRST_SLICE_QA_PASS_READY_FOR_SECOND_SLICE_PLANNING
```

## Branch and Working Tree

Repo root:

```text
/Users/a10/Documents/mom
```

Branch:

```text
codex/module-template-v4-step10-5-hardening
```

Current branch head before V14 QA fixes:

```text
a5f4d3c7 Add dispatch board prototype slice fixtures and tests
```

V14 QA leaves an intentional dirty working tree with only HMV4 renderer, fixture, E2E, and report artifacts. No commit was created.

## Provenance / Commit Grouping

Existing branch history includes:

```text
a5f4d3c7 Add dispatch board prototype slice fixtures and tests
383f3327 test(module-template): fix v4 fixture asset paths
57788196 feat(module-template): add v4 portal prototype assets
4d894c08 test(module-template): add v4 registry fixtures
```

Classification:

| Group | Status |
|---|---|
| Step 10.5 fixture hardening | Present on branch, consolidated in existing committed work. |
| V12 E2E harness | Present on branch, consolidated in existing committed work. |
| V13 dispatch first-slice implementation | Present on branch, consolidated in `a5f4d3c7`. |
| V14 dispatch QA fixes | Uncommitted, local to allowed HMV4 renderer, fixture, E2E, and report paths. |
| Unrelated changes | None observed. |

See `S14_DISPATCH_FIRST_SLICE_COMMIT_PLAN.md` for recommended commit grouping.

## Development Safety Checks

Production fixture load guard:

```text
PASS no fixture production load
```

Forbidden diff guard:

```text
PASS forbidden diff
```

Node syntax checks:

```text
PASS node --check mom/scripts/portal/70-module-template-v4-hydration.js
PASS node --check mom/scripts/portal/71-module-template-v4-routes.js
PASS node --check mom/scripts/portal/72-module-template-v4-bridge.js
PASS node --check mom/scripts/portal/73-module-template-v4-renderers.js
PASS node --check mom/scripts/portal/74-module-template-v4-fixtures.js
```

Fixture JSON parse:

```text
PASS all tests/fixtures/module-template-v4/**/*.json
```

Post-test cleanup:

```text
PASS node_modules removed
```

## E2E Reproducibility

Install command:

```bash
cd tests/e2e
npm install --no-package-lock
```

Install result:

```text
PASS added 3 packages, audited 4 packages, 0 vulnerabilities
```

Test command:

```bash
npm run test:hmv4 -- --project=chromium
```

Test result after V14 QA fixes:

```text
PASS 12 passed (6.2s)
```

Observed warnings:

- Node emitted a non-blocking `NO_COLOR` ignored warning because `FORCE_COLOR` was set.
- PHP built-in server logged existing unauthenticated 401 responses and asset redirect noise during current portal smoke.

These warnings match the current portal smoke posture and did not block HMV4 fixture tests.

## Dispatch Fixture Coverage

V14 added explicit fixture coverage for:

- Empty dispatch board.
- Stale/degraded/offline dispatch board.

Already covered and rechecked:

- Happy dispatch board.
- Ready target.
- In-progress target.
- Blocked/hold target.
- Record-open link.
- Disabled mutation controls.
- Dispatch alias.
- Unknown alias.

See `S14_DISPATCH_FIRST_SLICE_FIXTURE_COVERAGE_REPORT.md` for the full matrix.

## Anti-Authority / Re-Anchor Checks

Verified by static grep and E2E:

- Dispatch board root has `data-authority-class="projection"`.
- Dispatch board root has `data-requires-reanchor="true"`.
- Dispatch board cards are rendered as articles, not command anchors.
- Mutation controls are disabled buttons with `data-hmv4-mutation-intent`.
- Empty board renders no mutation controls.
- Record-open links route to `/ops/records/dispatch-targets/{id}?tab=overview`.
- No live dispatch API call was added in the HMV4 dispatch renderer or fixtures.

## Accessibility and Keyboard Checks

Verified by E2E/static checks:

- Dispatch board section has accessible name `Dispatch board projection workspace`.
- Lanes expose `aria-label` values.
- Cards contain headings.
- Re-anchor and projection-state messages are visible text.
- Record-open links are keyboard reachable.
- Mutation controls remain disabled.
- Status text is not color-only; visible status strings include ready/running/blocked and projection state text.
- Existing focus-visible styling remains in the HMV4 CSS surface.

## Current Portal Regression Smoke

The current portal smoke remains inert by default:

- `/mom/portal.html` does not render `#hmv4-ops-shell` by default.
- `window.Hmv4Fixtures` is absent by default.
- `window.HMV4_FIXTURE_MODE` evaluates false by default.
- `74-module-template-v4-fixtures.js` is not production-loaded.

No current portal navigation switch or production dispatch replacement was performed.

## Rollback Procedure

Rollback procedure generated:

```text
_reports/module-template-v4/S14_DISPATCH_FIRST_SLICE_ROLLBACK_PROCEDURE.md
```

It covers:

- V14 uncommitted QA rollback.
- Dispatch-slice-only path rollback.
- Commit-level rollback.
- Portal integration rollback using `57788196^`.
- Feature-flag disable posture.
- Verification commands.

## Fixes Applied, If Any

Applied HMV4-local QA fixes:

- Added projection freshness/state metadata to `mom/scripts/portal/73-module-template-v4-renderers.js`.
- Added accessible region label to the dispatch board renderer.
- Added visible projection-state status text.
- Added `workspace-board-empty.html`.
- Added `workspace-board-degraded.html`.
- Added route fixture contexts for empty and degraded board states.
- Added dispatch fixture coverage index.
- Added E2E checks for empty and degraded dispatch board states.
- Added E2E accessibility assertion for dispatch board region name.

## Remaining Warnings

- E2E runner remains isolated under `tests/e2e`; it is not a root-level repo runner.
- Current portal smoke still emits existing PHP 401 responses during browser tests.
- Reports remain under ignored `_reports/` unless report-persistence policy changes.
- Existing branch history consolidates several logical phases in `a5f4d3c7`; commit grouping should be reviewed before merge or revert planning.

## Blockers

No blockers remain for limited second-slice planning.

Do not start the next module slice from this report. A separate approval prompt is still required.

## Decision

```text
DISPATCH_FIRST_SLICE_QA_PASS_READY_FOR_SECOND_SLICE_PLANNING
```

