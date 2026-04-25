# V20 Training Matrix File Change Plan

## Summary

This is a planning-only file change plan for the later Training Matrix third-slice prototype.

No implementation was performed during V20 planning.

## Allowed Implementation Families

Allowed for later implementation after explicit approval:

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/**
_reports/module-template-v4/**
```

Only if strictly needed and v4-scoped:

```text
mom/styles/module-template-v4.css
mom/templates/module-template-v4/module-template-v4.html
```

## Forbidden Files

Do not modify:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## Expected Later Implementation Touches

Renderer:

```text
Add renderTrainingMatrixWorkspace(route) in mom/scripts/portal/73-module-template-v4-renderers.js.
Route WS training-competency/matrix requests to the training matrix renderer.
Render projection attributes, matrix rows/cells, filters, empty/degraded/partial-access states, and re-anchor messaging.
```

Bridge:

```text
Keep existing training bridge canonical mapping unless explicit context disambiguation is required.
Do not weaken ncr alias policy.
Unknown aliases remain unmapped_needs_decision.
```

Fixtures:

```text
Add training-matrix-fixtures.json.
Add workspace-training-matrix*.html fixture pages.
Extend route fixture registry only under tests/fixtures/module-template-v4/.
Do not promote anything to mom/qms-data.
```

E2E:

```text
Extend tests/e2e/module-template-v4.spec.ts for route, projection shell, fixtures, keyboard/a11y, current portal safety.
Extend tests/e2e/module-template-v4-bridge.spec.ts for training alias and unknown alias behavior.
```

Reports:

```text
Generate S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md only during approved implementation.
```

## Regression Surface

```text
HMV4 renderer dispatching for WS routes
existing Dispatch Board workspace rendering
existing Nonconformance record shell rendering
bridge alias compatibility
fixture page asset paths from tests/fixtures/module-template-v4/pages/
current portal inert-by-default behavior
```

## Planning Decision

```text
FILE_CHANGE_PLAN_READY
```
