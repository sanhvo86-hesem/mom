# S19 Nonconformance Second Slice QA Report

## Summary

Nonconformance Case Record Shell second-slice QA completed for the HMV4 development/prototype surface.

The slice remains:

```text
read-only
fixture-backed
authoritative record-shell focused
no current portal navigation switch
no backend API implementation
no mom/qms-data registry promotion
no workflow mutation
no disposition approval execution
no CAPA creation or closure
no e-sign challenge execution
```

Decision:

```text
NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING
```

This report does not start third-slice planning.

## Branch and working tree

Repo root:

```text
/Users/a10/Documents/mom
```

Branch:

```text
codex/second-slice-planning-from-dispatch-qa
```

Baseline:

```text
9289ef89 Harden dispatch board projection QA fixtures
```

Phase A classification:

| Group | Status |
|---|---|
| Dispatch first-slice baseline | Present in committed branch history. |
| S18 Nonconformance second-slice changes | Present as uncommitted HMV4-only working-tree diff. |
| unrelated changes | None after branch realignment. |

The S18 diff was re-applied to the correct branch from existing commit `c42914d5` with `git cherry-pick --no-commit`, then unstaged. No commit was created.

Working tree at QA:

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

## Current portal safety

Fixture production-load guard:

```text
PASS no fixture production load
```

Forbidden/current portal diff guard:

```text
PASS forbidden/current portal diff
```

No changes were made to:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

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

## JSON fixture result

All JSON files under `tests/fixtures/module-template-v4` parsed successfully.

Result:

```text
PASS json tests/fixtures/module-template-v4/**/*.json
```

## E2E result

Command:

```bash
cd tests/e2e
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules
```

Install result:

```text
PASS added 3 packages, audited 4 packages, 0 vulnerabilities
```

Test result:

```text
PASS 23 passed
```

Cleanup:

```text
PASS node_modules removed
```

Warnings:

```text
Node printed NO_COLOR/FORCE_COLOR warnings.
PHP built-in server logged existing unauthenticated 401 responses for current portal API smoke requests.
```

The warnings did not fail E2E and are consistent with prior isolated harness runs.

## Record-shell authority checks

Verified by E2E and static inspection:

```text
route parses as AR
/ops/records/nonconformance-cases/NC-001?tab=overview renders in fixture smoke
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="nonconformance-cases"
data-root-code="NQCASE"
data-record-id="NC-001"
data-query-tab reflects selected tab
```

Allowed tabs covered:

```text
overview
investigation
evidence
related
audit
signatures
```

The renderer keeps generic record-shell behavior for non-Nonconformance record families.

## Read-only / no-mutation checks

No live workflow mutation was added.

No backend fetch/XHR was added by the Nonconformance renderer. Static grep over the renderer, bridge, E2E specs, Nonconformance fixture JSON, and fixture pages found no:

```text
fetch(
XMLHttpRequest
/api/v1/nonconformance
```

The broader required grep found `/api/v1/nonconformance-cases` only in fixture registry YAML, not in runtime JS or fixture page execution paths.

Disposition, CAPA, and e-sign are disabled/read-only only:

```text
data-hmv4-mutation-intent="nqcase-approve-disposition"
data-hmv4-mutation-intent="nqcase-create-capa"
data-hmv4-mutation-intent="nqcase-esign"
```

Visible explanations are rendered:

```text
Approval is unavailable from this read-only prototype.
CAPA creation and closure are out of scope.
E-sign challenge execution is out of scope.
```

## Bridge alias checks

Verified by E2E and static inspection:

```text
ncr without explicit record context does not invent NC record IDs
ncr with explicit record context maps to /ops/records/nonconformance-cases/{record_id}?tab={tab}
unknown alias remains unmapped_needs_decision
```

Bridge policy for context-backed `ncr`:

```text
redirect_record_context_only
```

Unknown aliases remain:

```text
unmapped_needs_decision
```

## Fixture coverage

Fixture coverage report:

```text
_reports/module-template-v4/S19_NONCONFORMANCE_FIXTURE_COVERAGE_REPORT.md
```

Confirmed coverage:

```text
overview tab
investigation tab
evidence tab
related tab
audit tab
signatures tab
conflict state
partial-access state
degraded state
read-only disposition posture
read-only CAPA posture
read-only e-sign posture
```

## Accessibility and keyboard checks

Verified by E2E/static inspection:

```text
record shell renders accessible h1 identity heading
tabs use role="tablist", role="tab", role="tabpanel"
selected tabs expose aria-selected
tab panels use aria-labelledby
disabled mutation-looking controls are buttons, not links
disabled controls expose visible explanatory text
conflict/degraded/partial-access states are visible text, not color-only
links and buttons use their native semantics
```

Existing keyboard E2E verifies tablist/tabs are present for record-shell fixtures. Nonconformance-specific E2E verifies tab selection and visible panel content for all required tabs.

## Rollback procedure

Rollback procedure generated:

```text
_reports/module-template-v4/S19_NONCONFORMANCE_ROLLBACK_PROCEDURE.md
```

It covers:

```text
second-slice-only working-tree rollback
commit-level rollback if later committed
fixture cleanup
current portal safety verification
forbidden/current portal diff verification
Dispatch Board first-slice preservation
```

## Commit plan

Commit plan generated:

```text
_reports/module-template-v4/S19_NONCONFORMANCE_COMMIT_PLAN.md
```

Recommended single commit:

```text
feat(module-template): add nonconformance record-shell prototype
```

No commit was created.

## Fixes applied, if any

No QA stabilization code fix was required.

Pre-QA alignment was performed because the required branch was clean and missing the S18 implementation diff. The existing S18 implementation commit `c42914d5` was applied with `git cherry-pick --no-commit` to restore the expected V19 validation state without creating a commit.

## Remaining warnings

The slice is still development/prototype only and fixture-backed.

The E2E runner remains isolated under `tests/e2e` and depends on reinstalling Playwright packages for each clean run.

PHP built-in server smoke logs existing unauthenticated 401 responses from current portal API calls.

S19 reports live under ignored `_reports/` unless the user later approves tracked QA report persistence.

## Blockers

No V19 QA blocker remains.

## Decision

```text
NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING
```
