# E2E Runner Bootstrap Report

## Summary

Step 12 bootstrapped an isolated Playwright runner under `tests/e2e/` for the `module-template-v4` prototype. No Wave 1 migration was started, no production portal behavior was changed, and no forbidden production files were modified.

Decision:

```text
E2E_BOOTSTRAP_PASS_READY_FOR_FIRST_SLICE_APPROVAL
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

Working tree after bootstrap contains the new isolated E2E harness, local E2E spec adjustments, and existing Step 10.5 fixture-only route-context changes. Generated `tests/e2e/node_modules/` was removed after verification and is not part of the source delta.

Current tracked/untracked source deltas include:

```text
M  tests/e2e/module-template-v4-accessibility.spec.ts
M  tests/e2e/module-template-v4-keyboard.spec.ts
M  tests/e2e/module-template-v4.spec.ts
M  tests/fixtures/module-template-v4/pages/*.html
M  tests/fixtures/module-template-v4/route-fixtures.json
?? tests/e2e/README.md
?? tests/e2e/package.json
?? tests/e2e/playwright.config.ts
?? tests/fixtures/module-template-v4/pages/unknown-alias.html
```

## Files added or modified

Added:

```text
tests/e2e/package.json
tests/e2e/playwright.config.ts
tests/e2e/README.md
```

Updated E2E specs only:

```text
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-accessibility.spec.ts
tests/e2e/module-template-v4-keyboard.spec.ts
```

The spec updates were limited to runner/path assumptions:

- production portal smoke now verifies the portal remains inert and does not load fixture globals;
- HMV4 shell, accessibility, and keyboard assertions use fixture pages under `tests/fixtures/module-template-v4/pages/`;
- no production runtime, route grammar, bridge contract, or portal integration was changed.

## Runner option implemented

Implemented Option 2: isolated Playwright harness under `tests/e2e/`.

The runner is scoped to the E2E folder and does not add a root-level `package.json`.

Key behavior:

```text
testDir: tests/e2e
baseURL: http://127.0.0.1:8091
webServer: php -S 127.0.0.1:8091 -t ../..
portal URL available at: /mom/portal.html
fixture pages available at: /tests/fixtures/module-template-v4/pages/
```

## Install result

Command:

```bash
cd tests/e2e
npm install --no-package-lock
```

Result:

```text
PASS
added 3 packages, audited 4 packages, 0 vulnerabilities
```

No `package-lock.json` was created. `node_modules/` was removed after test execution so dependencies remain reinstallable rather than checked into the working tree.

## Browser install result

Command:

```bash
cd tests/e2e
npx playwright install --with-deps chromium
```

Result:

```text
PASS
Chromium browser assets installed in the local Playwright cache.
```

## Test execution result

Initial execution exposed two test-assumption issues, not production defects:

- direct `/ops/...` paths looped under the fallback PHP static server;
- production `portal.html` is intentionally inert by default, so `?hmv4=1` does not expose fixture shell markup.

The affected E2E specs were corrected to use production portal smoke for inert behavior and fixture pages for HMV4 visual/keyboard/accessibility coverage.

Final command:

```bash
cd tests/e2e
npm run test:hmv4 -- --project=chromium
```

Result:

```text
PASS
5 passed (3.0s)
```

Observed warnings:

- PHP static-server output included `401` responses for existing portal API requests during portal smoke.
- Node printed environment color warnings because `FORCE_COLOR` overrides `NO_COLOR`.

Neither warning failed the E2E run.

## Production safety recheck

Fixture production load check:

```text
PASS no fixture production load
```

Forbidden diff guard:

```text
PASS forbidden diff
```

Forbidden files remained untouched:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## JS syntax recheck

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

## Remaining warnings

- The runner depends on `npm install` from `tests/e2e/`; dependencies are not vendored.
- The repository still has existing Step 10.5 fixture-only changes pending in the working tree.
- Root-level JavaScript tooling remains intentionally absent.
- The browser smoke uses PHP's built-in server as a local test harness and does not prove production web-server parity.

## Blockers

No Step 12 blocker remains.

Step 11 implementation remains blocked until explicit first-slice approval. This bootstrap does not authorize or start Wave 1 migration.

## Decision

```text
E2E_BOOTSTRAP_PASS_READY_FOR_FIRST_SLICE_APPROVAL
```
