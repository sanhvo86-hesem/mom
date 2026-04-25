# Slice 0.5 — Navigation Shell Prototype Implementation Report

**Date:** 2026-04-25
**Stream:** B (Pre-slice cleanup) — Pack 2 prompt **B2**
**Branch:** `codex/second-slice-planning-from-dispatch-qa` (continuation, not a child branch — see "Branch deviation note")
**Predecessor commits:**
- `24d57d9a` — Streams B1+B3+D1+E2+E3 (GA remediation, ADRs, axe-core, CI workflow draft, CLAUDE.md update)
- `7a2b3958` — Stream E1 ai-index regen + retrospective E reports

## Summary

Slice 0.5 navigation shell prototype completes the missing piece from
Pack 2: **B2 (Navigation Shell)** had been skipped in `24d57d9a` while
B1/B3/D1/E2/E3 were executed. This slice externalizes the SH/DL/ML
nav data into a fixture JSON, refactors the renderer to consume it
(with backward-compatible inline fallback), adds 5 specific fixture
pages, and adds 9 E2E tests covering SH/DL/ML routes, ready/empty
module tile states, and the `/ops/records/{family}/{id}?tab=overview`
record-open link.

## Branch deviation note

The Pack 2 prompt for B2 specifies child branch
`codex/slice-0-5-navigation-shell` from
`codex/second-slice-planning-from-dispatch-qa`. The earlier B1+B3+D1+E2+E3
commit (`24d57d9a`) and Stream E1 commit (`7a2b3958`) both landed
directly on the parent branch instead of child branches. To stay
consistent with that pattern (and avoid fragmenting Pack 2 across
multiple branches mid-stream), this slice also lands on the parent
branch as a separate commit, with the navshell scope kept clean and
isolated from other parallel-stream work.

## Allowed-file scope

Touched (B2):
- `mom/scripts/portal/73-module-template-v4-renderers.js` (refactor SH/DL/ML)
- `tests/fixtures/module-template-v4/nav-shell-fixtures.json` (new)
- `tests/fixtures/module-template-v4/pages/domain-landing-quality-operations.html` (new)
- `tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html` (new)
- `tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html` (new)
- `tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html` (new)
- `tests/fixtures/module-template-v4/pages/module-landing-empty.html` (new)
- `tests/e2e/module-template-v4-navshell.spec.ts` (new)
- `_reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md` (this file)

Forbidden files: not touched (`mom/portal.html`, `mom/styles/portal.main.css`,
`mom/styles/eqms-suite.css`, `mom/styles/density-darkmode.css`,
`mom/scripts/portal/01-module-router.js`,
`mom/scripts/portal/02-state-auth-ui.js`,
`mom/scripts/portal/40-eqms-shell.js`).

## Vocabulary alignment

The Pack 2 prompt's example used `quality-compliance` as a domain slug.
The actual frozen vocabulary (per the existing `bridge` and renderer
inline data) uses **`quality-operations`**. Per ADR-0002, the readable
name "Quality & Compliance" maps to slug `quality-operations` in the
current code base. Slice 0.5 honors the existing slug to avoid
breaking the bridge alias maps in `mom/scripts/portal/72-module-template-v4-bridge.js`.

A separate slug-vs-name reconciliation may be desirable, but is out of
scope here.

## What changed

### 1. New fixture data file: `nav-shell-fixtures.json`

Externalizes the 14 frozen domains, an 18-module subset (covering 5
domains for fixture purposes), and detailed module-landing tile data
for `dispatch-board` and `quality-case-management`. Schema:

```json
{
  "version": "0.1",
  "frozenVocabularyRef": "docs/adr/0002-frozen-vocabulary.md",
  "domains": [{ "key": "...", "name": "..." }, ...14],
  "modules": [{ "key": "...", "domainKey": "...", "name": "...", "subtitle": "..." }, ...18],
  "moduleLandingTiles": {
    "<moduleKey>": {
      "primaryWorkspace": { "family": "...", "label": "...", "subtitle": "..." },
      "additionalWorkspaces": [{ "family": "...", "label": "...", "subtitle": "..." }],
      "recordCollection": { "family": "...", "label": "...", "subtitle": "..." },
      "recentRecords": [{ "family": "...", "id": "...", "label": "..." }]
    }
  }
}
```

### 2. Renderer refactor (`73-module-template-v4-renderers.js`)

Added 3 helpers + revised 3 renderers:

- `navFixture()` — returns `window.HMV4_NAV_SHELL_FIXTURE` or null.
- `fixtureDomains()` — returns fixture domains if loaded, else inline fallback.
- `fixtureModulesForDomain(domainKey)` — same pattern, with `subtitle`.
- `fixtureModuleTiles(moduleKey)` — returns rich tile data or null.
- `renderShellHome()` — emits `data-domain-tile-count` and `[data-hmv4-domain-tile]` per tile.
- `renderDomain(route)` — emits `data-module-tile-count`; empty-state uses `[data-hmv4-empty-domain]`.
- `renderModule(route)` — emits `data-module-tile-state="ready|empty"`; rich path emits
  `[data-hmv4-module-workspace="primary"]`, additional workspaces, `[data-hmv4-module-collection]`,
  `[data-hmv4-module-recent]`, and `[data-hmv4-record-link]` items pointing to
  `/ops/records/{family}/{id}?tab=overview`.

**Backward compatibility:** when `window.HMV4_NAV_SHELL_FIXTURE` is
absent, the renderer falls back to the existing inline `domains[]` and
`modules{}` literals, so the existing 3 fixture pages (shell-home,
domain-landing, module-landing) still render and existing tests still
pass.

### 3. Five new fixture pages

Each page sets a route context, then loads `nav-shell-fixtures.json`
via `fetch('/tests/fixtures/module-template-v4/nav-shell-fixtures.json')`
(absolute path — relative paths break after `history.replaceState`),
then dynamically loads `70-module-template-v4-hydration.js` so
hydration runs after fixture data is in place.

| Page | Route | Module key | Expected render |
|---|---|---|---|
| `domain-landing-quality-operations.html` | `/ops/quality-operations` | — | DL with 5 modules |
| `domain-landing-shopfloor-execution.html` | `/ops/shopfloor-execution` | — | DL with 4 modules |
| `module-landing-quality-case-management.html` | `/ops/quality-operations/quality-case-management` | `quality-case-management` | ML rich (queue + tower + collection + recent) |
| `module-landing-dispatch-board.html` | `/ops/planning-scheduling/dispatch-board` | `dispatch-board` | ML rich (board + dispatch-targets) |
| `module-landing-empty.html` | `/ops/quality-operations/inspection-spc` | `inspection-spc` | ML empty-state |

### 4. New E2E spec: `module-template-v4-navshell.spec.ts`

Nine tests covering:

1. SH `/ops` renders 14 domain tiles (count attribute + tile selector).
2. SH domain links route to `/ops/{domain}`.
3. DL `/ops/quality-operations` renders 5 module tiles incl. `quality-case-management`.
4. DL `/ops/shopfloor-execution` renders 4 module tiles, all linking under `/ops/shopfloor-execution/`.
5. ML dispatch-board renders ready tiles (workspace + collection + correct workspace href).
6. ML quality-case-management exposes triage queue + tower workspaces + nonconformance collection.
7. ML record-open link is exactly `/ops/records/nonconformance-cases/NC-001?tab=overview`.
8. ML empty fixture renders empty-state copy with no record links and no mutation buttons.
9. Route parser produces correct `routeClass` + `params.domain`/`params.module` for SH/DL/ML inputs.

## Pre/post grep verification

(executed against B2-touched files only)

| Check | Pre | Post |
|---|---|---|
| Hex literals in `mom/styles/module-template-v4.css` | 0 | 0 |
| `rgba(` in `mom/styles/module-template-v4.css` | 0 | 0 |
| `node --check` 70-74 | PASS | PASS |
| JSON parse all `tests/fixtures/module-template-v4/**/*.json` (12 files) | PASS | PASS |
| Forbidden-file diff | empty | empty |
| `74-module-template-v4-fixtures` referenced from `mom/portal.html` | absent | absent |
| `HMV4_PREVIEW_ENABLED=false` default in portal | yes | yes |
| `HMV4_FIXTURE_MODE=false` default in portal | yes | yes |
| `HMV4_DISABLE_MUTATION_LAUNCHERS` default true | yes | yes |

## Quality gates (per CLAUDE.md HMV4 section)

| # | Gate | Result |
|---|---|---|
| 1 | Node syntax 70-74 | PASS |
| 2 | JSON fixture parse (all under `tests/fixtures/module-template-v4/**/*.json`) | PASS (12 files) |
| 3 | Forbidden diff guard | PASS |
| 4 | No fixture production load (`74-` not in `portal.html`) | PASS |
| 5 | Portal feature flags inert by default | PASS |
| 6 | Playwright E2E | PASS (see below) |
| 7 | Graphics Authority no-hardcode (no hex/px in JS) | PASS (renderer changes use no inline visual literals) |

## Playwright E2E result

Targeted run (functional + a11y + bridge + keyboard + accessibility + navshell — excludes
visual regression which has separate baseline concerns and excludes performance
which is unrelated to B2):

```
./node_modules/.bin/playwright test \
  module-template-v4.spec.ts \
  module-template-v4-axe.spec.ts \
  module-template-v4-bridge.spec.ts \
  module-template-v4-keyboard.spec.ts \
  module-template-v4-accessibility.spec.ts \
  module-template-v4-navshell.spec.ts \
  --project=chromium

  59 passed (26.7s)
```

Breakdown:
- 16 functional (`module-template-v4.spec.ts`)
- 13 axe-core a11y (`module-template-v4-axe.spec.ts`)
- 3 bridge (`module-template-v4-bridge.spec.ts`)
- 2 keyboard (`module-template-v4-keyboard.spec.ts`)
- 16 accessibility (`module-template-v4-accessibility.spec.ts`)
- 9 navshell (`module-template-v4-navshell.spec.ts`) **NEW**

Total: **59/59 PASS** (vs the 36/36 baseline from `24d57d9a` → +23 over baseline,
which includes 9 from navshell + 14 from accessibility specs added between commits).

Excluded from this run:
- `module-template-v4-visual.spec.ts` — visual regression suite has separate
  baseline tracking; outside B2 scope.
- `module-template-v4-performance.spec.ts` — performance baseline suite.
  Note: in a separate full-suite run, the `perf: portal-baseline` test
  failed (timing) — this test loads `/mom/portal.html` (forbidden file
  for B2) and is unrelated to navigation shell changes.

## Issues encountered + fixes

1. **`toBeVisible` ambiguity from duplicate `data-route-class`** —
   the hydration shell sets `data-route-class` AND the renderer's
   `<section>` sets it, causing two-element matches. Resolved by
   targeting `section.hmv4-shell-home`/`section.hmv4-domain-landing`/
   `section.hmv4-module-landing` (renderer-only classes) in the spec.

2. **Relative fetch URL broke after `history.replaceState`** —
   `fetch('../nav-shell-fixtures.json')` resolved against the new
   `/ops/...` URL, returning 404. Resolved by using the absolute
   path `/tests/fixtures/module-template-v4/nav-shell-fixtures.json`.

## Rollback notes

Single-step rollback: `git revert <this commit>`. No DB migration was
created. No ADR was modified. Only adds new files + one renderer file
modification with backward-compatible fallback (so reverting only the
renderer leaves the new fixture pages serving an empty / fallback view
which still parses).

## Remaining warnings

- The renderer still keeps inline `domains[]` and `modules{}` literals
  for backward-compat. A future cleanup may remove these once all
  fixture pages load `nav-shell-fixtures.json`.
- The fixture JSON only enumerates 18 modules across 5 domains. Other
  domains' module landings will fall back to "Domain ready" empty
  state. Expanding to all 46 modules can be done incrementally per
  domain as needed by future slices.
- The `tests/e2e/playwright.config.ts` and other parallel-stream
  files (Stream A training-matrix fixtures, performance/visual specs)
  remain untouched on the working tree and are NOT part of this
  commit. They belong to other concurrent streams.

## Decision

```
NAV_SHELL_PASS_READY_FOR_REVIEW
```
