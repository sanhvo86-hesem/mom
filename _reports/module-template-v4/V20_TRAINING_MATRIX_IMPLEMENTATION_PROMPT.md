# V20_CODEX_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_PROMPT.md

## 1. Purpose

Paste this into Codex local AFTER all 4 are true:

1. V19 QA returned `NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING`
2. V20 planning prompt has been executed and 7 V20 artifacts approved
3. Wave 1 sequencing roadmap reviewed (Slice 3 = TRAIN)
4. User explicitly says: `Proceed with Training Matrix Workspace third-slice prototype implementation.`

This is development/prototype work only. The HESEM MOM/MES/eQMS system
is not production yet.

## 2. Codex role

```text
You are in local repo sanhvo86-hesem/mom.

You are implementing the approved Training Matrix Workspace third-slice
prototype.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not execute training certification mutation.
Do not implement training completion submit/acknowledge.
Do not execute e-sign challenge.
```

## 3. Required base

Branch:

```text
codex/training-matrix-third-slice-from-nc-qa
```

Created from:

```text
codex/second-slice-planning-from-dispatch-qa
```

Verify HEAD includes commits:

```text
567e365b docs(module-template-v4): track Slice 1+2 QA evidence and V20 plan
2eb6a7aa Add nonconformance record shell routing and fixtures
9289ef89 Harden dispatch board projection QA fixtures
```

If not on the correct branch base, stop and ask.

## 4. Target route and posture

```text
/ops/people-skill-ehs/training-competency/matrix
```

Required posture rendered by `73-module-template-v4-renderers.js`:

```text
data-route-class="WS"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
```

Optional subject filters (fixture-only):

```text
?team=<team_id>
?role=<role_code>
?qualification=<qual_code>
?status=qualified|expiring|expired|in_training|not_required
```

## 5. Allowed files

Allowed:

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/**
_reports/module-template-v4/S20_*.md
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

## 6. Required render behavior

Implement `renderTrainingMatrixWorkspace(route)` in
`73-module-template-v4-renderers.js`:

- Workspace shell with breadcrumb, identity header, projection metadata
- Matrix grid:
  - rows = operators (10-30 in fixture)
  - columns = qualifications (5-10 in fixture)
  - cells = status enum: qualified / expiring (≤30d) / expired / in_training / not_required
- Status cells use visible text + color (no color-only)
- Filter chips displayed and reflect URL state (no submit-mutation)
- Re-anchor messaging: "This is a read-only projection. Open record detail
  for action."
- Record-open links route to `/ops/records/training-records/{id}?tab=overview`
- Disabled mutation controls if any "issue qualification" or "schedule
  training" link present, with `data-hmv4-mutation-intent` only

Required fixture states:

- happy current
- empty (no operators in scope)
- conflict (offline edit collision)
- partial-access (some columns/rows masked)
- degraded (stale data warning)

## 7. Safe bridge alias behavior (no changes from V18)

`training` alias in `72-module-template-v4-bridge.js`:

- Without subject context: maps to canonical workspace route (existing)
- With explicit `record_id` context: redirects to AR record route
- Unknown alias: `unmapped_needs_decision`

The bridge code change for V20 should be minimal — only add if context
disambiguation requires.

## 8. Required fixtures

Create:

```text
tests/fixtures/module-template-v4/training-matrix-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
```

`training-matrix-fixtures.json` schema:

```json
{
  "version": "0.1",
  "authorityClass": "projection",
  "resourceFamily": "training-records",
  "rootCode": "TRAIN",
  "operators": [
    { "id": "OP-1001", "name": "Nguyen Van A", "team": "T-MOLD", "role": "MOLD_OP" }
  ],
  "qualifications": [
    { "code": "QUAL_INJ_BASIC", "name": "Injection Molding Basics", "renewMonths": 12 }
  ],
  "matrix": [
    { "operatorId": "OP-1001", "qualificationCode": "QUAL_INJ_BASIC", "status": "qualified", "lastCertifiedAt": "2025-12-15", "expiresAt": "2026-12-15", "evidenceLink": null }
  ],
  "states": {
    "empty": { "operators": [], "matrix": [] },
    "conflict": { "stateMessage": "Offline edit detected; reconcile in record." },
    "partial_access": { "limitations": ["Some operators are masked for current role."] },
    "degraded": { "freshness": "fixture_stale", "stateMessage": "Stale projection. Refresh from authority." }
  }
}
```

## 9. Required E2E

Add tests to `tests/e2e/module-template-v4.spec.ts` and
`tests/e2e/module-template-v4-bridge.spec.ts`:

- route parses as `WS`
- shell has `data-authority-class="projection"`
- shell has `data-requires-reanchor="true"`
- matrix renders rows × columns with status cells
- empty fixture renders empty-state copy
- conflict fixture renders visible conflict
- partial-access fixture renders visible limitation
- degraded fixture renders without enabling mutation
- record-open link routes to `/ops/records/training-records/{id}?tab=overview`
- bridge alias `training` continues to resolve canonically
- unknown alias remains `unmapped_needs_decision`
- current portal remains inert by default
- `74-module-template-v4-fixtures.js` remains absent from `mom/portal.html`

Total: extend existing 23 tests by ~10 → target 33 passing tests.

## 10. Required checks

```bash
# In tests/e2e
cd tests/e2e
npm install --no-package-lock
npm run test:hmv4 -- --project=chromium
rm -rf node_modules

# From repo root
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js

grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"

git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden diff" || echo "PASS forbidden diff"
```

Graphics Authority compliance check:

```bash
grep -nE '#[0-9a-fA-F]{3,8}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v "^.*://" | grep -v "^.*//.*"
# Expect: zero matches in V20 additions
```

## 11. Rollback constraints

Third-slice rollback v4-scoped only:

```bash
git checkout -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  mom/scripts/portal/72-module-template-v4-bridge.js \
  tests/e2e/module-template-v4*.spec.ts

rm -f tests/fixtures/module-template-v4/training-matrix-fixtures.json
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix-*.html
```

Do not remove Slice 1 (Dispatch) or Slice 2 (Nonconformance) files.

## 12. Required output

Generate:

```text
S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md
```

Sections:

```text
## Summary
## Branch and working tree
## Files changed
## Training matrix route behavior
## Workspace projection authority checks
## Read-only / no-mutation checks
## Bridge alias checks
## Fixture coverage
## E2E result
## JS syntax result
## JSON fixture result
## Current portal safety result
## Forbidden diff result
## Graphics Authority compliance result
## Rollback notes
## Remaining warnings
## Decision
```

Decision must be one of:

```text
TRAINING_MATRIX_THIRD_SLICE_PASS_READY_FOR_QA
TRAINING_MATRIX_THIRD_SLICE_PASS_WITH_WARNINGS
TRAINING_MATRIX_THIRD_SLICE_FAIL_BLOCK_NEXT
```

## 13. Non-production wording

Use:

```text
development/prototype
current portal safety
pre-production readiness
third-slice prototype
limited Wave 1 implementation
```

Avoid:

```text
production go-live
production cutover
production release
validated production system
```
