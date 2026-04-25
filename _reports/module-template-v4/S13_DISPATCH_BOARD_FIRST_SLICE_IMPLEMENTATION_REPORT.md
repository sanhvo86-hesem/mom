# S13 Dispatch Board First-Slice Implementation Report

## Summary

Implemented the approved Dispatch Board Workspace first slice as a development/prototype HMV4 projection surface.

This implementation is read-only, fixture-backed, bridge-safe, and does not perform production cutover. It does not modify `mom/portal.html`, does not load `74-module-template-v4-fixtures.js` in the portal, does not create backend APIs, and does not promote registries to `mom/qms-data`.

Decision:

```text
DISPATCH_FIRST_SLICE_PASS_READY_FOR_QA
```

## Branch and working tree

Repo root:

```text
/Users/a10/Documents/mom
```

Branch:

```text
codex/module-template-v4-step10-5-hardening
```

The branch was already a `codex/...` branch, so no new branch was created.

The working tree already contained Step 10.5 fixture hardening and V12 E2E bootstrap changes before this slice. Those existing changes were preserved.

Generated `tests/e2e/node_modules/` was removed after verification. No `tests/e2e/package-lock.json` was created.

## Files changed

V13 dispatch-slice changes:

```text
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-accessibility.spec.ts
tests/e2e/module-template-v4-keyboard.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/fixtures/module-template-v4/dispatch-board-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-board.html
tests/fixtures/module-template-v4/pages/workspace-dashboard.html
```

Pre-existing dirty files from Step 10.5 remain in the working tree under:

```text
tests/fixtures/module-template-v4/pages/*.html
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/pages/unknown-alias.html
```

V12 E2E harness files remain untracked source additions:

```text
tests/e2e/package.json
tests/e2e/playwright.config.ts
tests/e2e/README.md
```

## Dispatch board route behavior

Approved route:

```text
/ops/planning-scheduling/dispatch-board/board
```

Verified by E2E route parser check:

```text
routeClass: WS
domain: planning-scheduling
module: dispatch-board
workspace_family: board
query.view: default
rejectedQuery: []
```

Fixture pages updated:

```text
tests/fixtures/module-template-v4/pages/workspace-board.html
tests/fixtures/module-template-v4/pages/workspace-dashboard.html
```

The dispatch board renderer reads fixture projection data from:

```text
window.HMV4_DISPATCH_BOARD_PROJECTION
```

The fixture pages export this variable before HMV4 hydration runs.

## Bridge alias behavior

Existing bridge alias remains:

```text
dispatch -> /ops/planning-scheduling/dispatch-board/board
policy: redirect_then_deprecate
```

E2E coverage confirms:

- `dispatch` resolves to the canonical dispatch board workspace route;
- unknown aliases return `unmapped_needs_decision`;
- unknown alias URL remains `null`;
- no invented canonical route is created for unknown aliases.

## Projection / anti-authority checks

Rendered dispatch board workspace includes:

```text
data-authority-class="projection"
data-requires-reanchor="true"
data-hmv4-dispatch-board
```

Anti-authority behavior:

- board cards are `article` elements, not command anchors;
- record opening is an explicit link to `/ops/records/dispatch-targets/{id}?tab=overview`;
- mutation controls are disabled buttons;
- disabled mutation controls carry `data-hmv4-mutation-intent`;
- re-anchor messaging is visible through `role="status"` feedback blocks;
- no live dispatch mutation path was added.

## E2E result

Dependency install:

```bash
cd tests/e2e
npm install --no-package-lock
```

Result:

```text
PASS
added 3 packages, audited 4 packages, 0 vulnerabilities
```

Required command:

```bash
cd tests/e2e
npm run test:hmv4 -- --project=chromium
```

First run result:

```text
7 passed, 3 failed
```

Cause:

```text
Fixture timing issue. The HMV4 shell clears document.body during hydration, so inline dispatch JSON was removed before the renderer could read it.
```

Fix:

```text
Fixture pages now copy dispatch fixture JSON into window.HMV4_DISPATCH_BOARD_PROJECTION before hydration.
```

Final run result:

```text
PASS
10 passed (6.9s)
```

Observed non-blocking warnings:

- Node reported `NO_COLOR` ignored because `FORCE_COLOR` is set.
- PHP built-in server returned expected unauthenticated `401` responses for existing portal API calls during current portal smoke.

## JS syntax result

Command set:

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
```

Result:

```text
PASS node syntax 70-74
```

## Current portal safety result

Current portal smoke is covered by the HMV4 Playwright suite:

```text
/mom/portal.html
```

The smoke check confirms:

- `#hmv4-ops-shell` is absent by default;
- `window.Hmv4Fixtures` is absent;
- `window.HMV4_FIXTURE_MODE` is false.

## Forbidden diff result

Forbidden diff guard:

```text
PASS forbidden diff
```

No forbidden files were modified:

```text
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## Fixture production-load result

Fixture loader check:

```text
PASS no fixture production load
```

`74-module-template-v4-fixtures.js` remains excluded from `mom/portal.html`.

## Rollback notes

Slice rollback can be done by reverting the V13 dispatch-slice changes in:

```text
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/dispatch-board-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-board.html
tests/fixtures/module-template-v4/pages/workspace-dashboard.html
```

Portal integration rollback remains unchanged from prior reports:

```bash
git checkout 57788196^ -- mom/portal.html
grep -n "module-template-v4" mom/portal.html && echo "FAIL portal still integrated" || echo "PASS portal integration removed"
```

For a committed dispatch-slice rollback:

```bash
git revert <dispatch-first-slice-commit>
```

## Remaining warnings

- This is still development/prototype work, not production cutover.
- The working tree contains prior uncommitted Step 10.5 fixture hardening and V12 E2E harness changes.
- E2E dependencies are not vendored; run `npm install --no-package-lock` from `tests/e2e` before execution when `node_modules/` is absent.
- The browser server is PHP's built-in local server and does not prove production web-server parity.

## Decision

```text
DISPATCH_FIRST_SLICE_PASS_READY_FOR_QA
```
