# S18 Nonconformance Second Slice Implementation Report

## Summary

Implemented the approved development/prototype second slice for the HMV4 Nonconformance Case Record Shell.

The slice is read-only, fixture-backed, and scoped to the authoritative record-shell route:

```text
/ops/records/nonconformance-cases/NC-001?tab=overview
```

No production/current navigation switch was made. No backend API endpoint was added. No `mom/qms-data` registry promotion was performed. Disposition, CAPA, workflow mutation, and e-sign execution remain disabled/read-only posture only.

## Branch and working tree

Current branch:

```text
codex/second-slice-planning-from-dispatch-qa
```

Baseline commit:

```text
9289ef89 Harden dispatch board projection QA fixtures
```

Working tree contains only V18 HMV4 second-slice changes at report time:

```text
 M mom/scripts/portal/72-module-template-v4-bridge.js
 M mom/scripts/portal/73-module-template-v4-renderers.js
 M tests/e2e/module-template-v4-bridge.spec.ts
 M tests/e2e/module-template-v4.spec.ts
 M tests/fixtures/module-template-v4/record-fixtures.json
 M tests/fixtures/module-template-v4/route-fixtures.json
?? tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-audit.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-conflict.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-degraded.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-evidence.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-investigation.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-partial-access.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-related.html
?? tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-signatures.html
```

`_reports/` is ignored by repo policy, so this report may not appear in `git status --short`.

## Files changed

Runtime bridge/renderers:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
```

E2E specs:

```text
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
```

Fixtures:

```text
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
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

No forbidden file was modified.

## Nonconformance route behavior

The target route is covered as an AR record-shell route:

```text
/ops/records/nonconformance-cases/NC-001?tab=overview
```

Expected posture is rendered with:

```text
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="nonconformance-cases"
data-root-code="NQCASE"
data-record-id="NC-001"
data-query-tab="overview"
```

Allowed tab fixtures are implemented for:

```text
overview
investigation
evidence
related
audit
signatures
```

Unknown or unsupported tab input normalizes to `overview`.

## Record shell authority checks

The Nonconformance renderer adds a dedicated read-only authoritative shell for `nonconformance-cases`.

Coverage includes:

```text
identity header
record id and title
subtype/status/severity metadata
lifecycle strip
overview tab
investigation placeholder
evidence placeholder
related records placeholder
audit placeholder
signatures placeholder
conflict fixture state
degraded fixture state
partial-access fixture state
```

The generic record renderer remains available for non-Nonconformance record families.

## Read-only / no-mutation checks

Disposition, CAPA, and e-sign posture is rendered as disabled/read-only explanatory controls only.

Mutation-looking controls use disabled buttons with explicit intent metadata:

```text
data-hmv4-mutation-intent="nqcase-approve-disposition"
data-hmv4-mutation-intent="nqcase-create-capa"
data-hmv4-mutation-intent="nqcase-esign"
```

No live workflow mutation, backend fetch, XHR, disposition approval, CAPA creation/closure, or e-sign challenge execution was added.

## Bridge alias checks

`ncr` bridge behavior is constrained:

```text
ncr without explicit record context does not invent NC record IDs
ncr with explicit record context may map to /ops/records/nonconformance-cases/{record_id}?tab={tab}
unknown aliases remain unmapped_needs_decision
```

The context-backed behavior is covered by E2E for `NC-001`.

## Fixture coverage

Required fixture JSON was added:

```text
tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
```

Required fixture pages were added as a full set rather than parametrizing one page, because the visual/E2E matrix needs stable URLs for each tab and degraded state.

Covered pages:

```text
authoritative-record-shell-nc-overview.html
authoritative-record-shell-nc-investigation.html
authoritative-record-shell-nc-evidence.html
authoritative-record-shell-nc-related.html
authoritative-record-shell-nc-audit.html
authoritative-record-shell-nc-signatures.html
authoritative-record-shell-nc-conflict.html
authoritative-record-shell-nc-partial-access.html
authoritative-record-shell-nc-degraded.html
```

Route and record fixture registries were extended under `tests/fixtures/module-template-v4/` only.

## E2E result

Command:

```bash
cd tests/e2e
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules
```

Result:

```text
23 passed
```

Warnings observed:

```text
NO_COLOR ignored because FORCE_COLOR is set
PHP built-in server returned expected unauthenticated 401s for existing portal API smoke requests
```

`tests/e2e/node_modules` was removed after the run.

## JS syntax result

Command:

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

## JSON fixture result

Command:

```bash
python3 - <<'PY'
import json, pathlib, sys
for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
    try:
        json.loads(p.read_text())
        print('PASS json', p)
    except Exception as e:
        print('FAIL json', p, e)
        sys.exit(1)
PY
```

Result:

```text
PASS json for all module-template-v4 fixture JSON files
```

## Current portal safety result

Fixture loader production-load check:

```text
PASS no fixture production load
```

`mom/portal.html` was not modified.

## Forbidden diff result

Forbidden diff guard:

```text
PASS forbidden diff
```

No changes were made to:

```text
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/portal.html
```

## Rollback notes

Second-slice-only rollback is v4-scoped:

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

Do not remove Dispatch Board first-slice files unless rolling back the entire HMV4 prototype branch.

Current portal integration rollback remains unchanged from earlier HMV4 procedure and is not required for this second slice because `mom/portal.html` was not touched.

## Remaining warnings

E2E still depends on the isolated Playwright harness under `tests/e2e`.

The slice is fixture-backed and development/prototype only. It does not prove live backend API behavior, production registry promotion, or workflow execution.

PHP built-in server logs unauthenticated 401s for existing portal API requests during smoke. They did not block the HMV4 tests and were not introduced by this slice.

## Decision

```text
NONCONFORMANCE_SECOND_SLICE_PASS_READY_FOR_QA
```
