# Slice 9 JO Record Shell Implementation Report

## Decision

JO_SLICE9_PASS_READY_FOR_QA

## Scope

- Original branch: `codex/slice-9-jo-from-eco-qa`
- Quality-review branch: `codex/slice-9-jo-quality-review`
- Domain: `planning_production` / planning-scheduling record shell prototype
- Database tables: none read or written
- Production mutation: none. All JO mutation launchers are disabled.

## Implemented

- Added `renderJoRecord(route)` and `renderJoPanel(tab, record)` for `job-orders` AR routes.
- Added seven JO tabs: `overview`, `dispatch-readiness`, `spawned-work-orders`, `material-consumption`, `progress`, `related`, `audit`.
- Added required JO root attributes: `data-route-class="AR"`, `data-authority-class="authoritative"`, `data-resource-family="job-orders"`, `data-root-code="JO"`, `data-record-id`, and `data-query-tab`.
- Added disabled mutation intents: `jo-release`, `jo-spawn-work-order`, `jo-place-on-hold`, `jo-resume`, `jo-cancel`, `jo-complete`.
- Added JO fixture JSON and 10 non-live fixture pages covering 7 tabs plus conflict, partial-access, and degraded states.
- Tightened JO lifecycle coverage to include the transactional branch states `on-hold` and `cancelled`.
- Converted JO non-live fixture pages to inline `data-hmv4-jo-record-fixture` JSON, matching the CDOC fixture pattern.
- Added `jo` and `job-order` bridge aliases with context-only redirect to `/ops/records/job-orders/{id}`.
- Extended module-template v4 e2e, live-api, axe, and visual coverage for JO.

## Live API

`HMV4_LIVE_RESOURCE_REGISTRY` is present on the quality-review branch. JO is now registered with:

- `canonicalPath: /api/v1/job-orders`
- `fixtureGlobal: HMV4_JO_RECORD_FIXTURE`
- `recordAttr: data-hmv4-jo-record`
- Read-only live fixture page: `authoritative-record-shell-jo-live-mode.html`

The live adapter maps plural C.2 API fields into the JO record shell shape and keeps mutation disabled in fallback and live-rendered modes.

## Validation Evidence

- Preflight: `main` fast-forward pull clean; renderer presence count `15`; `/api/v1/job-orders` route count `5`.
- `node --check mom/scripts/portal/73-module-template-v4-renderers.js`: PASS.
- `node --check mom/scripts/portal/72-module-template-v4-bridge.js`: PASS.
- `node --check mom/scripts/portal/70-module-template-v4-hydration.js`: PASS.
- Fixture JSON parse check for JO, route, and record fixtures: PASS.
- `git diff --check`: PASS.
- Guard: `grep -n "74-module-template-v4-fixtures" mom/portal.html && echo FAIL || echo PASS`: PASS.
- Guard: forbidden portal/style/router diff check: PASS.
- Guard: renderer hex color scan: PASS no hex.
- Focused JO shell tests: `45 passed` across Chromium, Firefox, and WebKit.
- Focused JO bridge tests: `6 passed` across Chromium, Firefox, and WebKit.
- Focused JO live-api tests: `9 passed` across Chromium, Firefox, and WebKit.
- Focused JO axe tests: `11 passed` on Chromium, covering 10 fixture states plus live-mode.
- Focused JO visual update: `33 passed` across Chromium, Firefox, and WebKit.

## Warnings

- The shared `/Users/a10/Documents/mom` worktree changed branches and received WO edits during review. Remediation was moved to isolated worktree `/Users/a10/Documents/mom-slice9-jo-quality-review` to avoid overwriting concurrent work.
- Playwright validation used a temporary isolated config on port `8097` because port `8091` was already occupied by another active worktree test server.
