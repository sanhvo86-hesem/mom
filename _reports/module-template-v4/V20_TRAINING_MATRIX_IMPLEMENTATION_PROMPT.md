# V20 Training Matrix Implementation Prompt Draft

## Purpose

Use this prompt only after the user explicitly approves:

```text
Proceed with Training Matrix Workspace third-slice prototype implementation.
```

This implements a development/prototype third slice only. The HESEM MOM/MES/eQMS system is not production yet.

## Codex Role

```text
You are in local repo sanhvo86-hesem/mom.

You are implementing the approved Training Matrix Workspace third-slice prototype.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not execute training certification mutation.
Do not implement training completion submit/acknowledge.
Do not execute e-sign challenge.
```

## Required Base

Work from:

```text
codex/second-slice-planning-from-dispatch-qa
```

HEAD must include:

```text
567e365b docs(module-template-v4): track Slice 1+2 QA evidence and V20 plan
2eb6a7aa Add nonconformance record shell routing and fixtures
9289ef89 Harden dispatch board projection QA fixtures
```

If the branch/base is wrong or unrelated dirty runtime files exist, stop and report.

## Target Route And Posture

```text
/ops/people-skill-ehs/training-competency/matrix
```

Render required attributes:

```text
data-route-class="WS"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
```

Supported fixture-only filters:

```text
?team=<team_id>
?role=<role_code>
?qualification=<qual_code>
?status=qualified|expiring|expired|in_training|not_required
```

## Allowed Files

Allowed:

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

Forbidden:

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## Required Implementation Behavior

Implement only a read-only Training Matrix projection workspace.

Required renderer:

```text
renderTrainingMatrixWorkspace(route)
```

Required behavior:

```text
workspace shell with accessible heading and projection metadata
operator rows
qualification/status cells
visible status text for qualified, expiring, expired, in_training, not_required
fixture-only filter display
empty fixture state
degraded fixture state
partial-access fixture state
optional conflict fixture state if implementation includes it
record-open links to /ops/records/training-records/{id}?tab=overview
read-only/re-anchor messaging
no certification mutation
no training completion mutation
no acknowledgement mutation
no e-sign execution
no backend fetch/XHR
```

Mutation-looking controls, if any, must be disabled and carry only safe marker metadata:

```text
data-hmv4-mutation-intent
```

## Bridge Alias Behavior

`training` alias should resolve canonically to the Training Matrix workspace or existing module route according to the frozen route grammar.

Unknown aliases must remain:

```text
unmapped_needs_decision
```

Do not change `ncr` bridge policy:

```text
ncr without explicit record context must not invent a record ID.
context-backed ncr may route to an authoritative nonconformance record shell.
```

## Required Fixtures

Create/update:

```text
tests/fixtures/module-template-v4/training-matrix-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
```

Optional if implementing explicit conflict coverage:

```text
tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
```

## Required E2E Checks

Add/update checks for:

```text
route parses as WS
shell has data-authority-class="projection"
shell has data-requires-reanchor="true"
shell has data-resource-family="training-records"
shell has data-root-code="TRAIN"
matrix renders operator rows and qualification cells
status text is visible and not color-only
empty fixture renders empty-state copy without enabling mutation
degraded fixture renders degraded posture
partial-access fixture renders limitation text
mutation-looking controls absent or disabled with data-hmv4-mutation-intent
record-open links route to /ops/records/training-records/{id}?tab=overview
bridge alias training resolves canonically
unknown alias remains unmapped_needs_decision
current portal remains inert by default
74-module-template-v4-fixtures.js remains absent from mom/portal.html
```

## Required Checks

From `tests/e2e`:

```bash
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules
```

From repo root:

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js

grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"

git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden diff" || echo "PASS forbidden diff"

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

## Rollback

Third-slice-only rollback must be v4-scoped:

```bash
git checkout -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  mom/scripts/portal/72-module-template-v4-bridge.js \
  tests/e2e/module-template-v4*.spec.ts

rm -f tests/fixtures/module-template-v4/training-matrix-fixtures.json
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix*.html
```

Do not remove Dispatch Board or Nonconformance second-slice files.

## Required Output

Generate:

```text
S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md
```

Decision must be one of:

```text
TRAINING_MATRIX_THIRD_SLICE_PASS_READY_FOR_QA
TRAINING_MATRIX_THIRD_SLICE_PASS_WITH_WARNINGS
TRAINING_MATRIX_THIRD_SLICE_FAIL_BLOCK_NEXT
```

Do not start fourth-slice planning.
