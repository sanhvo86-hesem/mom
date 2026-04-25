# V20 Training Matrix Fixture And E2E Plan

## Summary

This plan defines fixture and E2E coverage for the Training Matrix third-slice prototype.

The later implementation must remain read-only, fixture-backed, and current-portal safe.

## Proposed Fixtures

```text
tests/fixtures/module-template-v4/training-matrix-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
```

Optional if the implementation needs explicit conflict state coverage:

```text
tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
```

## Fixture Data Requirements

`training-matrix-fixtures.json` should include:

```text
version
authorityClass = projection
resourceFamily = training-records
rootCode = TRAIN
operators
roles
qualifications
matrix cells
states: empty, degraded, partial_access, optional conflict
```

Matrix cell fields:

```text
operator
role
qualification
status
last_certified_at
expires_at
evidence_link
training_record_id
```

Status values:

```text
qualified
expiring
expired
in_training
not_required
```

## Required E2E Checks

Route and shell:

```text
route parses as WS
shell has data-authority-class="projection"
shell has data-requires-reanchor="true"
shell has data-resource-family="training-records"
shell has data-root-code="TRAIN"
supported fixture-only filters reflect in display state
```

Matrix:

```text
matrix renders operator rows and qualification cells
status text is visible and not color-only
evidence links are links, not buttons
record-open links route to /ops/records/training-records/{id}?tab=overview
```

Fixture states:

```text
empty fixture renders empty-state copy without enabling mutation
degraded fixture renders degraded/stale posture
partial-access fixture renders limitation text
optional conflict fixture renders visible conflict text
```

No mutation:

```text
mutation-looking controls absent or disabled
disabled controls carry data-hmv4-mutation-intent
disabled controls show visible re-anchor/read-only explanation
no backend fetch/XHR is introduced by the renderer
```

Bridge/current portal:

```text
bridge alias training resolves canonically
unknown alias remains unmapped_needs_decision
current portal remains inert by default
74-module-template-v4-fixtures.js remains absent from mom/portal.html
```

Accessibility and keyboard:

```text
workspace region has an accessible name
matrix exposes headings or equivalent labels
links are keyboard reachable
disabled buttons are disabled buttons
status and degraded/partial-access messages are visible text
focus-visible styling remains available
```

## Suggested Commands For Later Implementation

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
```

## Decision

```text
FIXTURE_AND_E2E_PLAN_READY
```
