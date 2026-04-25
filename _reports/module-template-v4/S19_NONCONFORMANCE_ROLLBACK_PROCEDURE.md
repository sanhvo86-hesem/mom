# S19 Nonconformance Rollback Procedure

## Summary

This rollback procedure is scoped to the Nonconformance Case Record Shell second slice only.

Do not remove Dispatch Board first-slice files unless rolling back the entire HMV4 prototype branch.

## Second-slice-only Working Tree Rollback

Use this when the second slice is still uncommitted:

```bash
git checkout -- \
  mom/scripts/portal/72-module-template-v4-bridge.js \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  tests/e2e/module-template-v4-bridge.spec.ts \
  tests/e2e/module-template-v4.spec.ts \
  tests/fixtures/module-template-v4/record-fixtures.json \
  tests/fixtures/module-template-v4/route-fixtures.json

rm -f tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
rm -f tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-*.html
```

## Commit-level Rollback

Use this only after a second-slice commit exists:

```bash
git revert <nonconformance-second-slice-commit>
```

Recommended commit subject if committed as one unit:

```text
feat(module-template): add nonconformance record-shell prototype
```

## Current Portal Safety Verification

After rollback, verify that the fixture loader is still not production-loaded:

```bash
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
```

Verify no forbidden/current portal files are part of the diff:

```bash
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden/current portal diff" || echo "PASS forbidden/current portal diff"
```

## Verification After Rollback

Expected after second-slice-only rollback:

```text
Nonconformance fixture JSON removed
authoritative-record-shell-nc-*.html fixture pages removed
bridge/renderers/spec/fixture registry files restored to pre-second-slice state
Dispatch Board first-slice files retained
mom/portal.html unchanged
74-module-template-v4-fixtures.js not production-loaded
```

## Scope Guard

This procedure must not remove:

```text
tests/e2e/package.json
tests/e2e/playwright.config.ts
Dispatch Board fixture pages
Dispatch Board renderer behavior
HMV4 portal integration files
```

## Decision

```text
ROLLBACK_PROCEDURE_READY
```
