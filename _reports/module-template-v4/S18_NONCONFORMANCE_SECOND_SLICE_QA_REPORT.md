# S18 Nonconformance Second Slice QA Report

## Summary

V18 Nonconformance Case Record Shell second-slice QA executed on the correct
base branch. The slice remains a development/prototype, read-only,
fixture-backed authoritative record shell. All 23 Playwright E2E tests pass.
All static safety guards pass. The current portal remains inert by default.
No forbidden file was modified. `74-module-template-v4-fixtures.js` is not
loaded in `mom/portal.html`.

Decision:

```text
NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING
```

## Branch and working tree

Repo root:

```text
/Users/a10/Documents/mom
```

QA branch:

```text
codex/second-slice-planning-from-dispatch-qa
```

QA HEAD:

```text
2eb6a7aa Add nonconformance record shell routing and fixtures
```

Branch ancestry:

```text
2eb6a7aa Add nonconformance record shell routing and fixtures        <- V18 NC slice (Slice 2)
9289ef89 Harden dispatch board projection QA fixtures                 <- V14 dispatch QA hardening
a5f4d3c7 Add dispatch board prototype slice fixtures and tests        <- V13 dispatch impl (Slice 1)
383f3327 test(module-template): fix v4 fixture asset paths
57788196 feat(module-template): add v4 portal prototype assets
```

Working tree was clean throughout the QA run. Only the post-QA artifact
(this file under `_reports/module-template-v4/`) is added by QA itself.

## Files validated

Runtime bridge/renderer:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
```

E2E specs (4 files, all spec types):

```text
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4-keyboard.spec.ts
tests/e2e/module-template-v4-accessibility.spec.ts
```

Fixture pages (9 NC + dispatch baseline):

```text
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-investigation.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-evidence.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-related.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-audit.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-signatures.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-conflict.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-partial-access.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-degraded.html
```

Fixture data:

```text
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
```

## Static safety guards

| Guard | Result |
|---|---|
| Node syntax `70-module-template-v4-hydration.js` | PASS |
| Node syntax `71-module-template-v4-routes.js` | PASS |
| Node syntax `72-module-template-v4-bridge.js` | PASS |
| Node syntax `73-module-template-v4-renderers.js` | PASS |
| Node syntax `74-module-template-v4-fixtures.js` | PASS |
| JSON parse — all 11 files under `tests/fixtures/module-template-v4/` | PASS |
| Forbidden diff (portal.main.css, eqms-suite.css, density-darkmode.css, 01/02/40 JS) | PASS |
| Fixture production-load grep (`74-module-template-v4-fixtures` in `mom/portal.html`) | PASS no production load |
| Portal feature flag inert defaults (`HMV4_PREVIEW_ENABLED=false`, `HMV4_FIXTURE_MODE=false`, `HMV4_DISABLE_MUTATION_LAUNCHERS=true`) | PASS |

JSON files validated:

```text
PASS json a11y-fixtures.json
PASS json bridge-fixtures.json
PASS json dispatch-board-fixtures.json
PASS json nonconformance-case-fixtures.json
PASS json record-fixtures.json
PASS json registries/routes/hmv4-route-registry.json
PASS json route-fixtures.json
PASS json screenshot-matrix.json
PASS json shell-fixtures.json
PASS json state-fixtures.json
PASS json workspace-fixtures.json
```

## Playwright E2E result

Command sequence:

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright install chromium  # already cached
./node_modules/.bin/playwright test --project=chromium --reporter=list
rm -rf node_modules
```

Browser: chromium-headless-shell v1217 (Chrome Headless Shell 147.0.7727.15).
Web server: PHP 8.x built-in (`php -S 127.0.0.1:8091 -t ../..`).

Result:

```text
23 passed (10.8s)
```

Specs covered:

- module-template-v4.spec.ts (preview smoke + NC tab cases)
- module-template-v4-bridge.spec.ts (alias + ncr context-backed mapping)
- module-template-v4-keyboard.spec.ts (focus-visible, tablist navigation)
- module-template-v4-accessibility.spec.ts (region naming, status text)

NC-specific assertions verified:

- `/ops/records/nonconformance-cases/NC-001?tab=overview` parses as `AR`.
- `data-route-class="AR"` rendered.
- `data-authority-class="authoritative"` rendered.
- `data-resource-family="nonconformance-cases"` rendered.
- `data-root-code="NQCASE"` rendered.
- `data-record-id="NC-001"` rendered.
- Tab query persists across overview / investigation / evidence / related / audit / signatures.
- Conflict fixture renders visible degraded posture.
- Partial-access fixture renders visible access limitation text.
- Degraded fixture renders without enabling mutation.
- `ncr` bridge does not invent record IDs without explicit context.
- `ncr` with explicit `record_id` maps to canonical AR route.
- Unknown alias remains `unmapped_needs_decision`.
- Disposition / CAPA / e-sign controls rendered as disabled with
  `data-hmv4-mutation-intent` attributes only; no live mutation triggered.

Cleanup:

```text
PASS node_modules removed after run
```

## Read-only / no-mutation verification

The Nonconformance record shell renders:

- Identity header (record id, title, subtype, status, severity).
- Lifecycle strip.
- Tab strip with `role="tablist"` and 6 tabs (overview, investigation,
  evidence, related, audit, signatures).
- Tab panels for the 6 tabs, all read-only placeholders.
- Disabled mutation-intent buttons:

```text
data-hmv4-mutation-intent="nqcase-approve-disposition"
data-hmv4-mutation-intent="nqcase-create-capa"
data-hmv4-mutation-intent="nqcase-esign"
```

No live workflow mutation, backend XHR, disposition approval, CAPA
creation/closure, or e-sign challenge execution was performed in any test.

## Bridge alias verification

`ncr` bridge behavior:

- Without explicit record context: `unmapped_needs_decision` (does not
  invent a fake `NC-...` id).
- With explicit `record_id` context (e.g., `NC-001`): maps to
  `/ops/records/nonconformance-cases/NC-001?tab=overview`.
- Unknown aliases: `unmapped_needs_decision`.

Other bridge aliases (`dispatch`, `deviations`) verified intact and
unchanged from V14 baseline.

## Current portal regression smoke

The current portal smoke remains inert by default:

- `mom/portal.html` does not render `#hmv4-ops-shell` by default.
- `window.Hmv4Fixtures` is absent by default.
- `window.HMV4_FIXTURE_MODE` evaluates `false` by default.
- `window.HMV4_PREVIEW_ENABLED` evaluates `false` by default.
- `window.HMV4_DISABLE_MUTATION_LAUNCHERS` evaluates `true` by default.
- `74-module-template-v4-fixtures.js` is never loaded in production
  portal.html.

No current portal navigation switch or production NC replacement was
performed.

## Accessibility checks

Verified during E2E and via static review:

- `<nav>` for breadcrumb has accessible name.
- Tab strip uses `role="tablist"` with `aria-label="Nonconformance case details"`.
- Each tab uses `role="tab"` with `aria-selected` reflecting current tab.
- Each tab panel uses `role="tabpanel"` with `aria-labelledby` linking to its tab.
- Keyboard left/right tab movement supported by hydration adapter.
- Status / severity text is rendered as visible text, not color-only.
- Skip link remains in template.
- Focus-visible styles preserved across buttons, nav links, tabs.

## Rollback verification

Second-slice rollback remains v4-scoped. Per
`_reports/module-template-v4/S14_DISPATCH_FIRST_SLICE_ROLLBACK_PROCEDURE.md`,
disabling the slice is safe via:

1. Feature-flag disable (already inert by default in `mom/portal.html`).
2. `git revert 2eb6a7aa` for the V18 NC slice commit only.
3. Dispatch Board (Slice 1) remains untouched.
4. No forbidden file was diffed; no current portal navigation was switched.

The V18 commit `2eb6a7aa` modifies only:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-*.html
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
```

A single `git revert 2eb6a7aa` cleanly rolls back the second slice without
affecting Slice 1 or the current portal posture.

## Remaining warnings

- E2E harness remains isolated under `tests/e2e/` and is not part of a
  repo-level CI pipeline. CI integration is a future hardening item.
- PHP built-in server logs unauthenticated 401 responses for legacy portal
  API requests during smoke. They did not block HMV4 tests and were not
  introduced by this slice.
- The slice is fixture-backed and development/prototype only. It does not
  exercise live backend API behavior, production registry promotion, or
  workflow mutation.
- `_reports/` is `.gitignore`'d by default; this report is local until a
  report-persistence policy decision is enforced (see
  `REPORT_PERSISTENCE_DECISION.md`).

## Blockers

None for moving to limited Slice 3 (Wave 1 next slice) planning.

Implementation of Slice 3 must wait for explicit user approval via a new
planning prompt analogous to V15 / V16.

## Decision

```text
NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING
```
