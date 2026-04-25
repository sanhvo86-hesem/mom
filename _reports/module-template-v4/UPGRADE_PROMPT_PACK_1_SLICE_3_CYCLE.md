# UPGRADE PROMPT PACK 1 — Slice 3 Training Matrix Cycle

**Stream**: A (Slice cycle — sequential within slice, parallel with Streams B/C/D/E)
**Slice**: 3 (Training Matrix Workspace)
**Pattern**: WS workspace projection (`/ops/people-skill-ehs/training-competency/matrix`)
**Authority**: projection, requires re-anchor
**Backend**: YELLOW-EQMS (`/api/v1/eqms/training` exists; needs plural alias `/api/v1/training-records`)
**Total prompts**: 4 (sequential)

---

## A1 — V20 Planning Prompt 🔴 (depends on Slice 2 V19 QA pass)

### When to run
After V19 QA returns `NONCONFORMANCE_QA_PASS_READY_FOR_THIRD_SLICE_PLANNING`.

### User must say
```
Proceed with V20 Training Matrix planning prompt.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are preparing Slice 3 planning artifacts for the Training Matrix
workspace prototype. You are NOT implementing the slice. You are NOT
approving the slice.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not execute training mutation, certification mutation, e-sign mutation.
Do not change forbidden files.

Required base branch:
  codex/second-slice-planning-from-dispatch-qa

If not on this branch, stop and ask. Verify HEAD ancestor includes:
  5f538cce docs(module-template-v4): add parallel strategic research and Wave 1 roadmap
  567e365b docs(module-template-v4): track Slice 1+2 QA evidence and V20 plan
  2eb6a7aa Add nonconformance record shell routing and fixtures
  9289ef89 Harden dispatch board projection QA fixtures

Create a new working branch from the above:
  codex/slice-3-train-from-nc-qa

Pre-flight checks (must all PASS):
  git branch --show-current
  git status --short
  git log --oneline -5

Frozen target route:
  /ops/people-skill-ehs/training-competency/matrix

Required posture (rendered by 73-module-template-v4-renderers.js when V21 lands):
  data-route-class="WS"
  data-authority-class="projection"
  data-resource-family="training-records"
  data-root-code="TRAIN"
  data-requires-reanchor="true"

Allowed planning files (write only under):
  _reports/module-template-v4/S20_TRAINING_MATRIX_*.md

Forbidden:
  mom/scripts/portal/72-module-template-v4-bridge.js
  mom/scripts/portal/73-module-template-v4-renderers.js
  tests/e2e/module-template-v4*.spec.ts
  tests/fixtures/module-template-v4/**
  mom/styles/module-template-v4*.css
  mom/templates/module-template-v4/**
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js

Generate exactly 7 planning artifacts under _reports/module-template-v4/:

1. S20_TRAINING_MATRIX_BRANCH_BASE_VERIFICATION_REPORT.md
   Sections:
   - Current branch
   - HEAD commit hash + message
   - Slice 1 (a5f4d3c7) and Slice 2 (2eb6a7aa) ancestor verification
   - E2E harness presence under tests/e2e/
   - Working tree cleanliness
   - Forbidden diff guard PASS/FAIL
   - Fixture production-load guard PASS/FAIL
   - Decision: GO or NO-GO

2. S20_TRAINING_MATRIX_SCOPE_CONTRACT.md
   Sections:
   - Route grammar (WS class)
   - Authority class (projection)
   - Resource family (training-records)
   - Root code (TRAIN)
   - Subject filters supported (?team= ?role= ?qualification= ?status=)
   - Status enum: qualified | expiring | expired | in_training | not_required
   - Projection columns: operator_id, operator_name, role, team,
     qualification_code, qualification_name, status, last_certified_at,
     expires_at, evidence_link
   - Out of scope: certification mutation, training completion mutation,
     e-sign or acknowledgement mutation, backend API changes,
     mom/qms-data registry promotion, current portal navigation switch
   - No-mutation rules: any "issue qualification" or "schedule training"
     control must be disabled with data-hmv4-mutation-intent only

3. S20_TRAINING_MATRIX_FILE_CHANGE_PLAN.md
   Sections:
   - Allowed file families
   - Only-if-strictly-needed paths
   - Forbidden files (full list)
   - Expected implementation touches:
     - Add renderTrainingMatrixWorkspace(route) to 73-module-template-v4-renderers.js
     - Bridge alias 'training' should already map cleanly; only add if context disambiguation requires
     - E2E spec touches in module-template-v4.spec.ts and -bridge.spec.ts
     - Fixture additions

4. S20_TRAINING_MATRIX_FIXTURE_AND_E2E_PLAN.md
   Sections:
   - Required fixtures (5 page files + 1 JSON)
   - Required E2E checks (route parses as WS, projection authority
     attrs, matrix render, 4 fixture states, mutation absent, bridge,
     unknown alias, current portal inert, 74 absent)
   - Total target: extend existing 23 tests by ~10 → 33 passing tests

5. S20_TRAINING_MATRIX_ROLLBACK_PLAN.md
   Sections:
   - Feature-flag disable defaults
   - Third-slice-only revert paths
   - Commit-level revert candidate
   - Fixture cleanup
   - Verification commands

6. S20_TRAINING_MATRIX_IMPLEMENTATION_PROMPT_DRAFT.md
   Mirror of V18 implementation prompt structure, adapted to TRAIN.
   Approval phrase: "Proceed with Training Matrix Workspace third-slice
   prototype implementation."

7. S20_TRAINING_MATRIX_GO_NO_GO.md
   Sections:
   - Go conditions checklist
   - Decision phrase

Required pre-flight commands:
  node --check mom/scripts/portal/70-module-template-v4-hydration.js
  node --check mom/scripts/portal/71-module-template-v4-routes.js
  node --check mom/scripts/portal/72-module-template-v4-bridge.js
  node --check mom/scripts/portal/73-module-template-v4-renderers.js
  node --check mom/scripts/portal/74-module-template-v4-fixtures.js
  grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS no fixture production load"
  git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden" || echo "PASS forbidden diff"

Non-production wording:
  Use: development/prototype, current portal safety, pre-production readiness
  Avoid: production go-live, production cutover, production release

Decision phrase output (one of):
  TRAIN_PLANNING_READY_FOR_APPROVAL
  TRAIN_PLANNING_BLOCKED_NEEDS_USER_DECISION
  TRAIN_PLANNING_FAIL_BLOCK_NEXT
```

### Expected outputs
- 7 Markdown artifacts in `_reports/module-template-v4/`
- Decision phrase in console
- No code changes

### Estimated time
30-60 minutes Codex execution.

---

## A2 — V20 Approval Gate 🔴 (depends on A1)

### When to run
After A1 returns `TRAIN_PLANNING_READY_FOR_APPROVAL`.

### User reviews 7 S20 artifacts. If acceptable, user says

```
Approve V20 Training Matrix planning. Proceed with Training Matrix Workspace third-slice prototype implementation.
```

### No prompt to paste — this is a manual gate

The user reads the 7 artifacts. If anything looks wrong, the user requests revisions. If acceptable, the user says the approval phrase to unlock A3.

### Decision phrases
- `TRAIN_APPROVAL_READY_FOR_IMPLEMENTATION` — proceed
- `TRAIN_APPROVAL_NEEDS_REVISION` — go back to A1

---

## A3 — V21 Implementation Prompt 🔴 (depends on A2)

### When to run
After A2 returns `TRAIN_APPROVAL_READY_FOR_IMPLEMENTATION`.

### Prompt to paste into Codex local

Use the prompt already drafted at `_reports/module-template-v4/V20_TRAINING_MATRIX_IMPLEMENTATION_PROMPT.md`.

Quick excerpt:

```text
You are in local repo sanhvo86-hesem/mom.

You are implementing the approved Training Matrix Workspace
third-slice prototype.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not execute training certification mutation.
Do not implement training completion submit/acknowledge.
Do not execute e-sign challenge.

Required base:
  codex/slice-3-train-from-nc-qa

Allowed files:
  mom/scripts/portal/73-module-template-v4-renderers.js
  mom/scripts/portal/72-module-template-v4-bridge.js
  tests/e2e/module-template-v4*.spec.ts
  tests/fixtures/module-template-v4/**
  _reports/module-template-v4/S20_*.md

Only if strictly needed and v4-scoped:
  mom/styles/module-template-v4.css
  mom/templates/module-template-v4/module-template-v4.html

Forbidden:
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js

Implement renderTrainingMatrixWorkspace(route):
  - workspace shell with breadcrumb, identity header, projection metadata
  - matrix grid (rows = operators, columns = qualifications)
  - status enum cells (qualified, expiring, expired, in_training, not_required)
  - status visible text + color (no color-only)
  - filter chips reflect URL state (no submit-mutation)
  - re-anchor messaging
  - record-open links route to /ops/records/training-records/{id}?tab=overview
  - disabled mutation controls if any: data-hmv4-mutation-intent only

Required fixture states:
  - happy current
  - empty (no operators in scope)
  - conflict (offline edit collision)
  - partial-access (some columns/rows masked)
  - degraded (stale data warning)

Required fixtures:
  tests/fixtures/module-template-v4/training-matrix-fixtures.json
  tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
  tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
  tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
  tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
  tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html

Required E2E checks (extend module-template-v4.spec.ts and -bridge.spec.ts):
  - route parses as WS
  - shell has data-authority-class="projection"
  - shell has data-requires-reanchor="true"
  - matrix renders rows × columns with status cells
  - empty fixture renders empty-state copy
  - conflict fixture renders visible conflict
  - partial-access fixture renders visible limitation
  - degraded fixture renders without enabling mutation
  - record-open link routes to /ops/records/training-records/{id}?tab=overview
  - bridge alias 'training' resolves canonically
  - unknown alias remains unmapped_needs_decision
  - current portal inert by default
  - 74-module-template-v4-fixtures.js absent from mom/portal.html

Required checks:
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
  grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS no fixture production load"
  git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden" || echo "PASS forbidden diff"

Graphics Authority compliance check (must PASS):
  grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v "^.*//" | head -1 && echo "FAIL hex in JS" || echo "PASS no hex in JS"
  grep -nE '"\d+px"' mom/scripts/portal/73-module-template-v4-renderers.js | head -1 && echo "FAIL px in JS string" || echo "PASS no px in JS string"

Generate report:
  _reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md

Sections:
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

Decision phrase output (one of):
  TRAIN_IMPLEMENTATION_PASS_READY_FOR_QA
  TRAIN_IMPLEMENTATION_PASS_WITH_WARNINGS
  TRAIN_IMPLEMENTATION_FAIL_BLOCK_NEXT
```

### Expected outputs
- New renderer function `renderTrainingMatrixWorkspace`
- 5 new fixture page HTML
- 1 new fixture JSON
- ~10 new E2E tests
- 1 implementation report

### Estimated time
2-3 hours Codex execution.

---

## A4 — V22 QA Prompt 🔴 (depends on A3)

### When to run
After A3 returns `TRAIN_IMPLEMENTATION_PASS_READY_FOR_QA`.

### User says
```
Proceed with V22 Training Matrix QA.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are running QA on the V21 Training Matrix Workspace third-slice
implementation. You are NOT planning Slice 4. You are NOT modifying
production code beyond QA stabilization fixes.

Required base branch:
  codex/slice-3-train-from-nc-qa

Required base commit ancestor:
  <V21 implementation commit>

Pre-flight:
  git branch --show-current
  git status --short
  git log --oneline -5

Validate:
  - current portal remains inert by default;
  - no forbidden file diff;
  - 74 remains excluded from mom/portal.html;
  - JS syntax 70-74 passes;
  - JSON fixtures parse;
  - E2E test:hmv4 passes (target: 33+ tests);
  - Training Matrix workspace shell is projection / read-only;
  - all mutation-looking controls absent or disabled;
  - no certification, completion, or e-sign execution exists;
  - bridge alias 'training' continues to resolve canonically;
  - unknown alias remains unmapped_needs_decision;
  - rollback plan is v4-scoped.

Anti-authority / re-anchor checks (must all PASS):
  - matrix root has data-authority-class="projection"
  - matrix root has data-requires-reanchor="true"
  - matrix cells are read-only (not editable)
  - mutation controls are disabled buttons with data-hmv4-mutation-intent
  - record-open links route correctly

Accessibility checks (verified by E2E + static):
  - matrix has accessible name
  - rows expose role="row"
  - cells expose role="cell" or role="gridcell"
  - status text is visible (not color-only)
  - record-open links keyboard reachable
  - mutation controls remain disabled
  - focus-visible styling present

Current portal regression smoke (must all PASS):
  - /mom/portal.html does not render #hmv4-ops-shell by default
  - window.Hmv4Fixtures is absent by default
  - window.HMV4_FIXTURE_MODE evaluates false by default
  - 74-module-template-v4-fixtures.js not production-loaded

Generate:
  _reports/module-template-v4/S22_TRAINING_MATRIX_THIRD_SLICE_QA_REPORT.md

Sections:
  ## Summary
  ## Branch and working tree
  ## Files validated
  ## Static safety guards
  ## Playwright E2E result
  ## Read-only / no-mutation verification
  ## Bridge alias verification
  ## Current portal regression smoke
  ## Accessibility checks
  ## Rollback verification
  ## Remaining warnings
  ## Decision

Required commands:
  cd tests/e2e
  npm install --no-package-lock
  npm run test:hmv4 -- --project=chromium
  rm -rf node_modules

  (back to repo root)
  node --check mom/scripts/portal/70-module-template-v4-hydration.js
  node --check mom/scripts/portal/71-module-template-v4-routes.js
  node --check mom/scripts/portal/72-module-template-v4-bridge.js
  node --check mom/scripts/portal/73-module-template-v4-renderers.js
  node --check mom/scripts/portal/74-module-template-v4-fixtures.js

Decision phrase output (one of):
  TRAIN_QA_PASS_READY_FOR_FOURTH_SLICE_PLANNING
  TRAIN_QA_PASS_WITH_WARNINGS
  TRAIN_QA_FAIL_BLOCK_NEXT
```

### Expected outputs
- 33+ E2E tests pass
- 1 QA report
- Decision phrase

### Estimated time
30 minutes Codex execution.

---

## Summary of Pack 1 timing

| Step | Codex time | User time | Total elapsed |
|---|---|---|---|
| A1 plan | 30-60 min | 30 min review | 1-1.5 hr |
| A2 approval | 0 (manual) | 30 min | 30 min |
| A3 impl | 2-3 hr | 30 min review | 2.5-3.5 hr |
| A4 QA | 30 min | 15 min review | 45 min |
| **Total** | ~3-4 hr | ~1.5-2 hr | **~4-5 hours per slice** |

When Slice 3 QA passes, the user says one of:
- `Approve Slice 3 commit and push.` → Codex commits
- `Defer Slice 3 commit until backend alias lands.` → wait

Then loop back to A1 with Slice 4 (CAPA) using same pattern.
