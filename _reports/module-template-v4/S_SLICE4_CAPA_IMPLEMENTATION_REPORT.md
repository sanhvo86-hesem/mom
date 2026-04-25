# S Slice 4 CAPA Implementation Report

## Summary

Implemented the approved development/prototype Slice 4 for the HMV4 CAPA Record Shell.

The slice is read-only, fixture-backed, and scoped to the authoritative record-shell route:

```text
/ops/records/capas/CAPA-001?tab=overview
```

No current portal navigation switch was made. No backend API endpoint was added. No fixture registry was promoted. Approval, verification, effectiveness, close/cancel, action assignment, and e-sign execution remain disabled/read-only posture only.

## Branch and working tree

Current branch:

```text
codex/slice-4-capa-from-train-qa
```

The branch was recreated from `main` before final validation so it does not carry the unrelated `codex/live-api-toggle-nqcase` commit.

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
tests/e2e/module-template-v4-axe.spec.ts
```

Fixtures and visual baselines:

```text
tests/fixtures/module-template-v4/capa-record-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-*.html
tests/e2e/module-template-v4-visual.spec.ts-snapshots/authoritative-record-shell-capa-*-chromium.png
```

The visual refresh also regenerated existing nav-shell baselines required for the final Chromium visual suite to pass.

## CAPA route behavior

The target route is covered as an AR record-shell route:

```text
/ops/records/capas/CAPA-001?tab=overview
```

Expected posture is rendered with:

```text
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="capas"
data-root-code="CAPA"
data-record-id="CAPA-001"
data-query-tab="<tab>"
```

Implemented CAPA tabs:

```text
overview
analysis
actions
verification
effectiveness
related
audit
signatures
```

Lifecycle strip covers:

```text
draft
analysis
action-planning
execution
verification
effectiveness
closed
```

## Read-only / no-mutation checks

All CAPA mutation-looking controls are disabled and carry explicit mutation intent metadata:

```text
capa-start-analysis
capa-record-root-cause
capa-add-action-plan
capa-assign-action
capa-submit-approval
capa-submit-verification
capa-record-effectiveness
capa-close
capa-cancel
capa-esign
```

No live mutation, backend fetch, approval mutation, verification mutation, close/cancel mutation, or e-sign challenge execution was added.

## Bridge alias checks

`capa` bridge behavior is context constrained:

```text
capa without explicit record context maps only to module landing
capa with explicit record context maps to /ops/records/capas/{record_id}?tab={tab}
unknown aliases remain unmapped_needs_decision
```

The context-backed behavior is covered by E2E for `CAPA-001`.

## Fixture coverage

Required fixture JSON was added:

```text
tests/fixtures/module-template-v4/capa-record-fixtures.json
```

Covered fixture pages:

```text
authoritative-record-shell-capa-overview.html
authoritative-record-shell-capa-analysis.html
authoritative-record-shell-capa-actions.html
authoritative-record-shell-capa-verification.html
authoritative-record-shell-capa-effectiveness.html
authoritative-record-shell-capa-related.html
authoritative-record-shell-capa-audit.html
authoritative-record-shell-capa-signatures.html
authoritative-record-shell-capa-conflict.html
authoritative-record-shell-capa-partial-access.html
authoritative-record-shell-capa-degraded.html
```

Route and record fixture registries were extended under `tests/fixtures/module-template-v4/` only.

## E2E result

Command:

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
rm -rf node_modules
cd ../..
```

Result:

```text
155 passed
```

Warnings observed:

```text
NO_COLOR ignored because FORCE_COLOR is set
An old reused PHP server on port 8091 had to be killed before the final successful run
```

`tests/e2e/node_modules` was removed after the final run.

## Static guard results

JS syntax:

```text
PASS node --check mom/scripts/portal/73-module-template-v4-renderers.js
PASS node --check mom/scripts/portal/72-module-template-v4-bridge.js
```

Current portal safety:

```text
PASS no fixture production load
```

Forbidden diff:

```text
PASS forbidden diff
```

Hex color guard:

```text
PASS no hex in JS
```

CAPA visual baseline count:

```text
11 CAPA PNG snapshots present
```

## Forbidden files

No changes were made to:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/**
mom/api/**
```

## Remaining warnings

The performance spec regenerated `_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-25.md`; it is not part of this Slice 4 commit.

The slice is fixture-backed and development/prototype only. It does not prove live backend API behavior, production registry promotion, or governed workflow execution.

## Decision

```text
CAPA_SLICE4_PASS_WITH_WARNINGS
```
