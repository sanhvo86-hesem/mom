# S14 Dispatch First Slice Rollback Procedure

## H1. Dispatch-Slice-Only Rollback

For the current uncommitted V14 QA changes only:

```bash
git checkout -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  tests/e2e/module-template-v4.spec.ts \
  tests/e2e/module-template-v4-accessibility.spec.ts \
  tests/fixtures/module-template-v4/dispatch-board-fixtures.json \
  tests/fixtures/module-template-v4/route-fixtures.json

rm -f \
  tests/fixtures/module-template-v4/pages/workspace-board-empty.html \
  tests/fixtures/module-template-v4/pages/workspace-board-degraded.html
```

For the committed dispatch first-slice work, review commit grouping first. On this branch, dispatch implementation is currently consolidated in `a5f4d3c7`. A path-targeted rollback may be used if only dispatch slice files should be reverted:

```bash
git checkout a5f4d3c7^ -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  tests/e2e/module-template-v4*.spec.ts \
  tests/fixtures/module-template-v4/dispatch-board-fixtures.json \
  tests/fixtures/module-template-v4/pages/workspace-board.html \
  tests/fixtures/module-template-v4/pages/workspace-dashboard.html
```

If V14-added fixture pages have been committed, also remove:

```bash
rm -f \
  tests/fixtures/module-template-v4/pages/workspace-board-empty.html \
  tests/fixtures/module-template-v4/pages/workspace-board-degraded.html
```

## H2. Commit-Level Rollback

If the dispatch first slice has a dedicated commit:

```bash
git revert <dispatch-first-slice-commit>
```

On the current branch, candidate commit `a5f4d3c7` includes dispatch first-slice work but also appears to consolidate Step 10.5 fixture hardening and V12 E2E harness work. Review the diff before a full revert if the desired rollback is dispatch-only.

## H3. Portal Integration Rollback Remains Unchanged

Portal integration rollback continues to use the Step 9 pre-patch parent:

```bash
git checkout 57788196^ -- mom/portal.html
grep -n "module-template-v4" mom/portal.html && echo "FAIL portal still integrated" || echo "PASS portal integration removed"
```

This removes HMV4 portal integration only. It does not remove v4 files, fixtures, or E2E harness files.

## H4. Feature-Flag Disable

Keep HMV4 inert by retaining:

```text
window.HMV4_PREVIEW_ENABLED = false
window.HMV4_FIXTURE_MODE = false
window.HMV4_DISABLE_MUTATION_LAUNCHERS = true
```

Do not production-load:

```text
74-module-template-v4-fixtures.js
```

## Verification Commands

```bash
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"

git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js' && echo "FAIL forbidden diff" || echo "PASS forbidden diff"

node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js

cd tests/e2e
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules
```

