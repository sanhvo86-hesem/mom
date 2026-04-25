# S19 Nonconformance Commit Plan

## Summary

Do not commit unless explicitly approved by the user.

The recommended grouping is one focused HMV4 second-slice commit, because the runtime renderer/bridge changes, fixtures, and E2E assertions are tightly coupled and were validated together.

## Recommended Commit

```text
feat(module-template): add nonconformance record-shell prototype
```

Include:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4.spec.ts
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-*.html
```

Rationale:

```text
The renderer, safe ncr bridge behavior, fixture records, route contexts, and E2E coverage form one prototype slice.
```

## Optional Split

If review prefers smaller commits:

```text
commit 1: feat(module-template): add nonconformance record renderer and bridge
commit 2: test(module-template): add nonconformance fixtures and e2e coverage
```

Commit 1 would include:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
```

Commit 2 would include:

```text
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4.spec.ts
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-*.html
```

## Files Not To Include

Do not include generated local dependencies:

```text
tests/e2e/node_modules/
```

Do not include ignored local reports unless the user explicitly requests tracked QA report persistence:

```text
_reports/module-template-v4/S19_*.md
```

Do not include forbidden/current portal files:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## Pre-commit Gates

Run before any approved commit:

```bash
cd tests/e2e
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules

cd ../..
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden/current portal diff" || echo "PASS forbidden/current portal diff"
```

## Decision

```text
COMMIT_PLAN_READY_NO_COMMIT_CREATED
```
