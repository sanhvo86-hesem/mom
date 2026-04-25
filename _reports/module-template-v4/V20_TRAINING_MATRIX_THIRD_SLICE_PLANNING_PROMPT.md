# V20_CODEX_TRAINING_MATRIX_THIRD_SLICE_PLANNING_PROMPT.md

## 1. Purpose

Paste this prompt into Codex local after V19 QA returned:

```text
NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING
```

This prompt prepares the third-slice **planning** artifacts only. It does
not implement anything. Approval and implementation are separate steps.

This is development/prototype work only. The HESEM MOM/MES/eQMS system is
not production yet.

## 2. Codex role

```text
You are in local repo sanhvo86-hesem/mom.

You are preparing third-slice planning artifacts.
You are NOT implementing the third slice.
You are NOT approving the third slice.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not execute workflow mutation.
Do not change forbidden files.
```

## 3. Required base

Work from the second-slice planning base, now containing the V18 NC commit:

```text
codex/second-slice-planning-from-dispatch-qa
```

Verify HEAD includes:

```text
2eb6a7aa Add nonconformance record shell routing and fixtures
9289ef89 Harden dispatch board projection QA fixtures
```

If not, stop and ask.

## 4. Third-slice candidate decision

Per S16 candidate scoring matrix, the recommended third slice is:

```text
Training Matrix / Qualification Workspace — read-only projection workspace prototype
```

Rationale (locked in S16):

- Diversifies from Dispatch (workspace projection, different pattern)
  and from Nonconformance (authoritative record shell).
- Existing HMV4 bridge already maps `training` to
  `/ops/people-skill-ehs/training-competency`. Frozen Step 4 grammar
  remains unchanged.
- Compliance risk is medium — qualification matrix is read-only friendly
  and safe to render fixture-only.
- Operational value is high — qualification readiness is observed daily
  by shopfloor planners.
- Required fixture depth is moderate — operator × qualification matrix
  with status states (qualified, expiring, expired, in-training, not-required).

Alternates (do not pick unless explicit override):

```text
Genealogy Explorer Workspace (3.7) — alternate, requires deeper graph fixtures
Maintenance / Asset Readiness Workspace (3.4) — defer, bridge maturity weaker
Batch Release Packet (3.5) — defer, signature-heavy, too compliance-loaded for slice 3
```

## 5. Target route

```text
/ops/people-skill-ehs/training-competency/matrix
```

Required posture:

```text
data-route-class="WS"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
```

Subject filters supported by the projection (fixture-only):

```text
?team=<team_id>            optional
?role=<role_code>          optional
?qualification=<qual_code> optional
?status=qualified|expiring|expired|in_training|not_required
```

## 6. Allowed planning files

Allowed (planning artifacts only):

```text
_reports/module-template-v4/V20_TRAINING_MATRIX_*.md
_reports/module-template-v4/S20_TRAINING_MATRIX_*.md
```

Do NOT modify yet:

```text
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/**
mom/styles/module-template-v4*.css
mom/templates/module-template-v4/**
```

Forbidden (always):

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## 7. Required planning artifacts

Generate the following Markdown artifacts under
`_reports/module-template-v4/`:

### 7.1 V20_TRAINING_MATRIX_BRANCH_BASE_VERIFICATION_REPORT.md

Content:

- current branch
- HEAD commit hash and message
- Slice 1 (`a5f4d3c7`) and Slice 2 (`2eb6a7aa`) ancestor verification
- E2E harness presence under `tests/e2e/`
- Working tree cleanliness
- Forbidden diff guard
- Fixture production-load guard
- Go/no-go for third-slice planning

### 7.2 V20_TRAINING_MATRIX_SCOPE_CONTRACT.md

Content:

- Route grammar (WS class)
- Authority class
- Resource family
- Root code
- Subject filters supported
- Projection columns: operator, role, qualification, status, last_certified_at,
  expires_at, evidence_link
- Status states with color/text rendering rules
- Out of scope: certification mutation, training completion mutation,
  e-sign or acknowledgement mutation, backend API changes,
  current portal navigation switch
- No-mutation rules: any "issue qualification" or "schedule training" link
  must render as disabled with `data-hmv4-mutation-intent` only

### 7.3 V20_TRAINING_MATRIX_FILE_CHANGE_PLAN.md

Content:

- Allowed file families for implementation
- Only-if-strictly-needed v4-scoped paths
- Forbidden files
- Expected implementation touches
- Renderer extension scope: add `renderTrainingMatrixWorkspace(route)`
- Bridge extension scope: ensure `training` alias maps cleanly
- E2E spec touches: extend `module-template-v4.spec.ts` and
  `module-template-v4-bridge.spec.ts`
- Fixture additions

### 7.4 V20_TRAINING_MATRIX_FIXTURE_AND_E2E_PLAN.md

Required fixtures (proposed):

```text
tests/fixtures/module-template-v4/training-matrix-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
```

Required E2E checks:

- route parses as `WS`
- shell has `data-authority-class="projection"`
- shell has `data-requires-reanchor="true"`
- matrix renders rows (operators) × cells (qualification statuses)
- empty fixture renders empty-state copy without enabling mutation
- degraded fixture renders degraded posture
- partial-access fixture renders limitation text
- mutation-looking controls absent or disabled with
  `data-hmv4-mutation-intent`
- record-open links route to
  `/ops/records/training-records/{id}?tab=overview`
- bridge alias `training` continues to resolve canonically
- unknown alias remains `unmapped_needs_decision`
- current portal remains inert by default
- `74-module-template-v4-fixtures.js` remains absent from
  `mom/portal.html`

### 7.5 V20_TRAINING_MATRIX_ROLLBACK_PLAN.md

Content:

- Feature-flag disable defaults
- Third-slice-only revert (do not touch Slice 1 dispatch board files,
  do not touch Slice 2 Nonconformance files)
- Commit-level revert candidate
- Fixture cleanup
- Verification commands (no fixture production load, forbidden diff guard)

### 7.6 V20_TRAINING_MATRIX_IMPLEMENTATION_PROMPT.md

Draft only, not executed. Mirror the V18 implementation prompt structure
adapted to Training Matrix. Approval phrase to be:

```text
Proceed with Training Matrix Workspace third-slice prototype implementation.
```

### 7.7 V20_TRAINING_MATRIX_GO_NO_GO.md

Content:

- Go conditions
- Decision phrase

```text
V20_PLANNING_READY_FOR_THIRD_SLICE_APPROVAL
```

## 8. Required checks

From repo root:

```bash
git branch --show-current
git status --short
git log --oneline -5
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden diff" || echo "PASS forbidden diff"
```

## 9. Non-production wording

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

## 10. Decision phrase

After all 7 planning artifacts are written, return:

```text
V20_PLANNING_READY_FOR_THIRD_SLICE_APPROVAL
```

If any blocker is found, return one of:

```text
V20_PLANNING_BLOCKED_NEEDS_USER_DECISION
V20_PLANNING_FAIL_BLOCK_NEXT
```
