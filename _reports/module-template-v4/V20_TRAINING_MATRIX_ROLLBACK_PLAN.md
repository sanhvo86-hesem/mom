# V20 Training Matrix Rollback Plan

## Summary

This rollback plan is for the later Training Matrix third-slice prototype only.

Do not remove Dispatch Board first-slice files.
Do not remove Nonconformance second-slice files.

## Feature Flag Disable Defaults

Current HMV4 default safety posture remains:

```text
window.HMV4_PREVIEW_ENABLED = false
window.HMV4_FIXTURE_MODE = false
window.HMV4_DISABLE_MUTATION_LAUNCHERS = true
```

The third slice must stay inert unless preview/fixture conditions are explicitly enabled by the existing HMV4 harness.

## Third-slice-only Working Tree Revert

If the later implementation is uncommitted:

```bash
git checkout -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  mom/scripts/portal/72-module-template-v4-bridge.js \
  tests/e2e/module-template-v4*.spec.ts

rm -f tests/fixtures/module-template-v4/training-matrix-fixtures.json
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
```

If route/record fixture registries are extended during implementation, restore only the Training Matrix entries while preserving Dispatch and Nonconformance entries.

## Commit-level Revert

If committed:

```bash
git revert <training-matrix-third-slice-commit>
```

Candidate commit subject:

```text
feat(module-template): add training matrix workspace prototype
```

## Verification Commands

```bash
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"

git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden diff" || echo "PASS forbidden diff"

node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
```

## Scope Guard

Rollback must not remove:

```text
Dispatch Board first-slice fixture pages/data/E2E
Nonconformance second-slice fixture pages/data/E2E
HMV4 portal integration
isolated E2E harness
```

## Decision

```text
ROLLBACK_PLAN_READY
```
