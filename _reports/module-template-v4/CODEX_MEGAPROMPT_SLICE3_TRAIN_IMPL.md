# CODEX MEGAPROMPT — Slice 3 Training Matrix Workspace Implementation

> Paste the entire block below into Codex local. Codex will create branch
> `codex/slice-3-train-from-nc-qa`, implement Slice 3, and produce a report.
>
> If Codex asks for approval, paste:
> `Proceed with Training Matrix Workspace third-slice prototype implementation.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are implementing **Slice 3 = Training Matrix Workspace** (TRAIN root, WS workspace projection class) of the HESEM Operations Platform HMV4 prototype program.

This is **development/prototype work only**. The HESEM MOM/MES/eQMS system is not production yet. Use wording: `development/prototype`, `current portal safety`, `pre-production readiness`. Avoid: `production go-live`, `production cutover`, `production release`.

Slice 1 (DISP/Dispatch Board, WS) is committed at `9289ef89`. Slice 2 (NQCASE/Nonconformance, AR) is committed at `2eb6a7aa`. Strategic baseline + 5 prompt packs + 10 ADRs are committed at `24d57d9a` on `codex/second-slice-planning-from-dispatch-qa`.

V20 planning artifacts already exist in `_reports/module-template-v4/`:
- `V20_TRAINING_MATRIX_BRANCH_BASE_VERIFICATION_REPORT.md`
- `V20_TRAINING_MATRIX_SCOPE_CONTRACT.md`
- `V20_TRAINING_MATRIX_FILE_CHANGE_PLAN.md`
- `V20_TRAINING_MATRIX_FIXTURE_AND_E2E_PLAN.md`
- `V20_TRAINING_MATRIX_ROLLBACK_PLAN.md`
- `V20_TRAINING_MATRIX_GO_NO_GO.md` (decision: `SELECT Training Matrix as Slice 3`)
- `V20_TRAINING_MATRIX_IMPLEMENTATION_PROMPT.md` (this is the prompt source)
- `V20_BRIDGE_ALIAS_POLICY_CORRECTION_NOTE.md`

You may read these for additional context but do NOT re-do planning.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT switch current portal navigation.
Do NOT implement backend APIs.
Do NOT promote fixture registries to mom/qms-data.
Do NOT execute training certification mutation.
Do NOT implement training completion submit/acknowledge.
Do NOT execute e-sign challenge.
Do NOT modify forbidden files.
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
# Verify branch base
git fetch origin
git checkout codex/second-slice-planning-from-dispatch-qa
git pull --ff-only

# Verify ancestor commits exist
git log --oneline | grep -E "24d57d9a|2eb6a7aa|9289ef89|a5f4d3c7" | head -4
# Expected: 4 lines

# Verify clean working tree
git status --short
# Expected: empty

# Verify no forbidden file in working tree
ls mom/portal.html mom/styles/portal.main.css mom/scripts/portal/01-module-router.js
# Expected: all exist

# Verify HMV4 files exist
ls mom/scripts/portal/7?-module-template-v4-*.js
# Expected: 70-74 (5 files)

# Verify E2E harness present
ls tests/e2e/playwright.config.ts tests/e2e/package.json
# Expected: both exist

# Create slice branch
git checkout -b codex/slice-3-train-from-nc-qa
```

If any check fails, return:
```text
TRAINING_MATRIX_PREFLIGHT_FAIL_<reason>
```
and stop.

## ALLOWED FILES (only these may be modified)

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4-keyboard.spec.ts
tests/e2e/module-template-v4-accessibility.spec.ts
tests/e2e/module-template-v4-axe.spec.ts
tests/fixtures/module-template-v4/training-matrix-fixtures.json (NEW)
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html (NEW)
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html (NEW)
tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html (NEW)
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html (NEW)
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html (NEW)
_reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md (NEW)
```

Only if strictly needed and v4-scoped (justify in report):
```text
mom/styles/module-template-v4.css
mom/templates/module-template-v4/module-template-v4.html
```

## FORBIDDEN (NEVER touch)

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

## TARGET CONTRACT

### Route

```text
/ops/people-skill-ehs/training-competency/matrix
```

The bridge alias `training` (already in `72-module-template-v4-bridge.js`) maps to this route. Confirm by grepping:

```bash
grep -n "training" mom/scripts/portal/72-module-template-v4-bridge.js
```

### Required render attributes (MUST appear on workspace root)

```text
data-route-class="WS"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
```

### Subject filter query params (fixture-only — NO backend call)

```text
?team=<team_id>
?role=<role_code>
?qualification=<qual_code>
?status=qualified|expiring|expired|in_training|not_required
```

### Status enum and visible-text rules

| Status | Visible text | Color hint (use semantic token, not raw color) |
|---|---|---|
| `qualified` | "Qualified" | success token |
| `expiring` | "Expiring (≤30d)" | warning token |
| `expired` | "Expired" | danger token |
| `in_training` | "In training" | info token |
| `not_required` | "Not required" | neutral text-3 token |

**Critical**: status MUST be visible TEXT, not color-only. Use existing tokens from `mom/styles/module-template-v4.tokens.css` (e.g., `var(--hmv4-success)`, `var(--hmv4-warning)`, `var(--hmv4-danger)`, `var(--hmv4-info)`, `var(--hmv4-text-3)`). NO hardcoded hex/rgba in JS or HTML.

## STEP 1 — Read existing renderer pattern

Open `mom/scripts/portal/73-module-template-v4-renderers.js`. Identify:

1. The dispatch-board renderer function (search for `renderDispatchBoardWorkspace` or similar).
2. The nonconformance record renderer (search for `renderNonconformanceRecord`).
3. The main `renderRoute(route)` switch — note where workspace classes dispatch.
4. The `applyShell(node)` helper.
5. The fixture-data helpers (`readJsonFixture`, `window.HMV4_*_FIXTURE`).

Use the SAME pattern. Do not invent a new architecture.

## STEP 2 — Implement `renderTrainingMatrixWorkspace(route)`

Add a function with this shape (real implementation, not pseudo):

```js
function renderTrainingMatrixWorkspace(route){
  var p = route.params || {};
  var q = route.query || {};
  var fixture = window.HMV4_TRAINING_MATRIX_FIXTURE || readJsonFixture('[data-hmv4-training-matrix-fixture]') || {};

  var state = (q.state || fixture.activeState || 'current');
  var stateNode = state === 'current' ? null : (fixture.states && fixture.states[state]) || null;
  var freshness = stateNode && stateNode.freshness ? stateNode.freshness : 'fixture_current';
  var stateMessage = stateNode && stateNode.stateMessage ? stateNode.stateMessage : '';

  var operators = (state === 'empty')
    ? []
    : (fixture.operators || []);
  var qualifications = (fixture.qualifications || []);
  var matrix = (state === 'empty')
    ? []
    : (fixture.matrix || []);

  // Apply optional subject filters from query
  var filteredOps = operators.filter(function(op){
    if(q.team && op.team !== q.team) return false;
    if(q.role && op.role !== q.role) return false;
    return true;
  });
  var visibleQuals = q.qualification
    ? qualifications.filter(function(qu){ return qu.code === q.qualification; })
    : qualifications;
  var statusFilter = q.status || null;

  // Status cell lookup
  function cellFor(opId, qualCode){
    for(var i=0;i<matrix.length;i++){
      var m = matrix[i];
      if(m.operatorId === opId && m.qualificationCode === qualCode) return m;
    }
    return null;
  }

  var STATUS_LABEL = {
    qualified: 'Qualified',
    expiring: 'Expiring (≤30d)',
    expired: 'Expired',
    in_training: 'In training',
    not_required: 'Not required'
  };
  var STATUS_TOKEN = {
    qualified: 'success',
    expiring: 'warning',
    expired: 'danger',
    in_training: 'info',
    not_required: 'neutral'
  };

  var partialAccessLimitations = (stateNode && stateNode.limitations) || [];

  var head =
    '<header class="hmv4-workspace-header" data-hmv4-training-matrix-head>'+
      '<h1 class="hmv4-workspace-title">Training matrix &mdash; operator qualification readiness</h1>'+
      '<p class="hmv4-workspace-subtitle">Read-only projection. Open a record to act.</p>'+
      (stateMessage ? '<p class="hmv4-workspace-state-message" role="status">'+esc(stateMessage)+'</p>' : '')+
    '</header>';

  var filterRow =
    '<section class="hmv4-toolbar" aria-label="Training matrix filters" data-hmv4-training-matrix-filters>'+
      filterChip('team', q.team)+
      filterChip('role', q.role)+
      filterChip('qualification', q.qualification)+
      filterChip('status', statusFilter)+
      '<span class="hmv4-feedback" data-feedback-state="bridge">Filters reflect URL state. Change filters by editing the URL; this projection does not submit.</span>'+
    '</section>';

  function filterChip(name, value){
    if(!value) return '';
    return '<span class="hmv4-card" data-hmv4-filter-chip data-filter-name="'+esc(name)+'">'+esc(name)+': '+esc(value)+'</span>';
  }

  var body;
  if(filteredOps.length === 0){
    body =
      '<section class="hmv4-feedback" data-feedback-state="bridge" data-hmv4-training-matrix-empty>'+
        '<p>No operators match the current scope. Adjust filters or open a record.</p>'+
      '</section>';
  } else {
    var head2 = '<thead><tr><th>Operator</th><th>Role</th><th>Team</th>'+
      visibleQuals.map(function(qu){return '<th>'+esc(qu.name)+'</th>';}).join('')+
      '</tr></thead>';
    var rows = filteredOps.map(function(op){
      var cells = visibleQuals.map(function(qu){
        var c = cellFor(op.id, qu.code);
        var status = c ? c.status : 'not_required';
        if(statusFilter && status !== statusFilter){
          return '<td data-label="'+esc(qu.name)+'" data-hmv4-status="filtered" class="hmv4-cell hmv4-cell--filtered"><span class="hmv4-text-3">&mdash;</span></td>';
        }
        var label = STATUS_LABEL[status] || status;
        var token = STATUS_TOKEN[status] || 'neutral';
        var expires = c && c.expiresAt ? ' (exp '+esc(c.expiresAt)+')' : '';
        var recordId = c && c.recordId ? c.recordId : null;
        var inner = recordId
          ? '<a class="hmv4-link" href="/ops/records/training-records/'+esc(recordId)+'?tab=overview" data-hmv4-record-open="training-records" data-hmv4-record-id="'+esc(recordId)+'">'+esc(label)+expires+'</a>'
          : '<span>'+esc(label)+expires+'</span>';
        return '<td data-label="'+esc(qu.name)+'" data-hmv4-status="'+esc(status)+'" data-hmv4-status-token="'+esc(token)+'" class="hmv4-cell hmv4-cell--status hmv4-status--'+esc(token)+'">'+inner+'</td>';
      }).join('');
      return '<tr data-hmv4-operator-id="'+esc(op.id)+'"><th scope="row">'+esc(op.name)+'</th><td>'+esc(op.role)+'</td><td>'+esc(op.team)+'</td>'+cells+'</tr>';
    }).join('');
    body = '<table class="hmv4-data-table hmv4-training-matrix" aria-label="Training matrix grid">'+head2+'<tbody>'+rows+'</tbody></table>';
  }

  var disabled =
    '<section class="hmv4-toolbar" aria-label="Disabled launchers" data-hmv4-training-matrix-launchers>'+
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="train-issue-qualification">Issue qualification</button>'+
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="train-schedule-training">Schedule training</button>'+
      '<span class="hmv4-feedback" data-feedback-state="warning" role="note">Mutation actions are disabled in this read-only projection. Open a record to act.</span>'+
    '</section>';

  var partialAccessNotice = '';
  if(state === 'partial_access' && partialAccessLimitations.length){
    partialAccessNotice =
      '<section class="hmv4-feedback" data-feedback-state="warning" data-hmv4-training-matrix-partial>'+
        '<p>Partial access:</p>'+
        '<ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>'+
      '</section>';
  }

  return '<section class="hmv4-workspace-shell hmv4-workspace-shell--training-matrix" data-hmv4-workspace="training-matrix" data-route-class="WS" data-authority-class="projection" data-resource-family="training-records" data-root-code="TRAIN" data-requires-reanchor="true" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
    head + filterRow + partialAccessNotice + body + disabled +
    '</section>';
}
```

Wire it into `renderRoute(route)`:

```js
// inside renderRoute switch / dispatch
if(route.routeClass === 'WS' && route.params && route.params.workspace_family === 'matrix' &&
   route.params.module === 'training-competency' && route.params.domain === 'people-skill-ehs'){
  return renderTrainingMatrixWorkspace(route);
}
```

If the existing dispatch table uses a different shape, follow that shape (look at how `renderDispatchBoardWorkspace` is registered).

Expose on `window.Hmv4Renderers`:
```js
window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, {
  renderTrainingMatrixWorkspace: renderTrainingMatrixWorkspace
});
```

## STEP 3 — Verify bridge alias

Open `mom/scripts/portal/72-module-template-v4-bridge.js`. The `training` alias should already exist mapping to `/ops/people-skill-ehs/training-competency`. Verify it leads cleanly to the new matrix workspace when given context.

If `training` alias is missing or maps to a different domain/module, ADD this entry only if no entry exists:

```js
training: u('ML', { domain: 'people-skill-ehs', module: 'training-competency' }),
```

Then for record-context handoff (consistency with `ncr` pattern):

```js
if(key === 'training' && recordId){
  return {
    policy: 'redirect_record_context_only',
    url: u('AR', { resource_family: 'training-records', record_id: recordId }, { tab: (context && context.tab) || 'overview' })
  };
}
```

If alias already correct, do not modify. Document in report.

## STEP 4 — Create fixture JSON

Create `tests/fixtures/module-template-v4/training-matrix-fixtures.json`:

```json
{
  "version": "0.1",
  "authorityClass": "projection",
  "resourceFamily": "training-records",
  "rootCode": "TRAIN",
  "operators": [
    { "id": "OP-1001", "name": "Nguyen Van A", "team": "T-MOLD", "role": "MOLD_OP" },
    { "id": "OP-1002", "name": "Tran Thi B", "team": "T-MOLD", "role": "MOLD_OP" },
    { "id": "OP-1003", "name": "Le Van C", "team": "T-CNC", "role": "CNC_OP" },
    { "id": "OP-1004", "name": "Pham Thi D", "team": "T-CNC", "role": "CNC_LEAD" },
    { "id": "OP-1005", "name": "Hoang Van E", "team": "T-ASSY", "role": "ASSY_OP" },
    { "id": "OP-1006", "name": "Vu Thi F", "team": "T-ASSY", "role": "ASSY_INSPECTOR" },
    { "id": "OP-1007", "name": "Dao Van G", "team": "T-QC", "role": "QC_INSPECTOR" }
  ],
  "qualifications": [
    { "code": "QUAL_INJ_BASIC",   "name": "Injection Molding Basics",      "renewMonths": 12 },
    { "code": "QUAL_CNC_BASIC",   "name": "CNC Operation Basics",          "renewMonths": 12 },
    { "code": "QUAL_ASSY_TIER1",  "name": "Assembly Tier 1",                "renewMonths": 24 },
    { "code": "QUAL_ASSY_TIER2",  "name": "Assembly Tier 2",                "renewMonths": 24 },
    { "code": "QUAL_QC_VISUAL",   "name": "QC Visual Inspection",           "renewMonths": 18 },
    { "code": "QUAL_FIRST_PIECE", "name": "First Piece Inspection (FPI)",   "renewMonths": 12 }
  ],
  "matrix": [
    { "operatorId": "OP-1001", "qualificationCode": "QUAL_INJ_BASIC",  "status": "qualified",   "lastCertifiedAt": "2025-12-15", "expiresAt": "2026-12-15", "recordId": "TR-7001" },
    { "operatorId": "OP-1001", "qualificationCode": "QUAL_FIRST_PIECE","status": "expiring",    "lastCertifiedAt": "2025-04-30", "expiresAt": "2026-04-30", "recordId": "TR-7002" },
    { "operatorId": "OP-1002", "qualificationCode": "QUAL_INJ_BASIC",  "status": "expired",     "lastCertifiedAt": "2024-10-10", "expiresAt": "2025-10-10", "recordId": "TR-7003" },
    { "operatorId": "OP-1003", "qualificationCode": "QUAL_CNC_BASIC",  "status": "qualified",   "lastCertifiedAt": "2025-09-01", "expiresAt": "2026-09-01", "recordId": "TR-7004" },
    { "operatorId": "OP-1004", "qualificationCode": "QUAL_CNC_BASIC",  "status": "qualified",   "lastCertifiedAt": "2025-09-01", "expiresAt": "2026-09-01", "recordId": "TR-7005" },
    { "operatorId": "OP-1005", "qualificationCode": "QUAL_ASSY_TIER1", "status": "qualified",   "lastCertifiedAt": "2025-06-20", "expiresAt": "2027-06-20", "recordId": "TR-7006" },
    { "operatorId": "OP-1005", "qualificationCode": "QUAL_ASSY_TIER2", "status": "in_training", "lastCertifiedAt": null,         "expiresAt": null,         "recordId": "TR-7007" },
    { "operatorId": "OP-1006", "qualificationCode": "QUAL_ASSY_TIER2", "status": "qualified",   "lastCertifiedAt": "2025-08-15", "expiresAt": "2027-08-15", "recordId": "TR-7008" },
    { "operatorId": "OP-1006", "qualificationCode": "QUAL_QC_VISUAL",  "status": "qualified",   "lastCertifiedAt": "2025-07-10", "expiresAt": "2027-01-10", "recordId": "TR-7009" },
    { "operatorId": "OP-1007", "qualificationCode": "QUAL_QC_VISUAL",  "status": "qualified",   "lastCertifiedAt": "2025-11-01", "expiresAt": "2027-05-01", "recordId": "TR-7010" },
    { "operatorId": "OP-1007", "qualificationCode": "QUAL_FIRST_PIECE","status": "qualified",   "lastCertifiedAt": "2025-10-15", "expiresAt": "2026-10-15", "recordId": "TR-7011" }
  ],
  "states": {
    "empty":          { "stateMessage": "No operators in scope. Adjust filters or load a different team." },
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict detected. Reconcile in the governed training record." },
    "partial_access": { "stateMessage": "Partial-access fixture. Some operators are masked for the current role.", "limitations": ["Operators in T-QC are masked for current role.", "Expiry dates are masked for cross-team operators."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded/offline fixture. Refresh from authority before acting." }
  }
}
```

## STEP 5 — Create 5 fixture pages

Use the EXACT pattern from existing fixture pages (e.g., `tests/fixtures/module-template-v4/pages/workspace-board.html`). Read one first:

```bash
cat tests/fixtures/module-template-v4/pages/workspace-board.html
```

Then create each new page with the same structure. The base template:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>HMV4 Training Matrix Fixture</title>
<link rel="stylesheet" href="../../../../mom/styles/module-template-v4.tokens.css">
<link rel="stylesheet" href="../../../../mom/styles/module-template-v4.css">
</head><body>
<div id="hmv4-fixture-root"></div>
<script type="application/json" data-hmv4-fixture-route>
{
  "fixtureId": "workspace-training-matrix-<STATE>",
  "path": "/ops/people-skill-ehs/training-competency/matrix",
  "routeClass": "WS",
  "params": { "domain": "people-skill-ehs", "module": "training-competency", "workspace_family": "matrix" },
  "query": { "state": "<STATE>" }
}
</script>
<script type="application/json" data-hmv4-training-matrix-fixture>
... full fixture JSON inline OR <script src> if pattern allows ...
</script>
<script>window.HMV4_TRAINING_MATRIX_FIXTURE = JSON.parse(document.querySelector('[data-hmv4-training-matrix-fixture]').textContent);</script>
<script src="../../../../mom/scripts/portal/74-module-template-v4-fixtures.js"></script>
<script src="../../../../mom/scripts/portal/71-module-template-v4-routes.js"></script>
<script src="../../../../mom/scripts/portal/72-module-template-v4-bridge.js"></script>
<script src="../../../../mom/scripts/portal/73-module-template-v4-renderers.js"></script>
<script src="../../../../mom/scripts/portal/70-module-template-v4-hydration.js"></script>
</body></html>
```

Generate the 5 pages with `<STATE>` = `current` (no query state), `empty`, `conflict`, `partial-access` (use `partial_access` as state value), `degraded`.

For the `current` page, use filename `workspace-training-matrix.html` (no suffix).

CRITICAL: For each page, include the full training-matrix-fixtures.json content inline in the `data-hmv4-training-matrix-fixture` script block. Set `activeState` in the inline JSON to match the page's state. Or set it via `window.HMV4_TRAINING_MATRIX_FIXTURE.activeState = '<STATE>'` after parse.

If embedding the full JSON 5× is too verbose, use a `<script src="../training-matrix-fixtures.json">` external load only if the existing dispatch fixture pages do that. Otherwise inline.

## STEP 6 — Update route fixture and record fixture

Edit `tests/fixtures/module-template-v4/route-fixtures.json` to add training-matrix route contexts. Pattern: look at how dispatch-board added entries.

Edit `tests/fixtures/module-template-v4/record-fixtures.json` to ensure training-records resource family has at least one entry for the bridge alias test.

## STEP 7 — Add E2E tests

### 7.1 Extend `tests/e2e/module-template-v4.spec.ts`

Add tests:

```ts
test('module-template-v4 preview smoke › renders training matrix workspace', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix.html');
  const root = page.locator('[data-hmv4-workspace="training-matrix"]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-route-class', 'WS');
  await expect(root).toHaveAttribute('data-authority-class', 'projection');
  await expect(root).toHaveAttribute('data-resource-family', 'training-records');
  await expect(root).toHaveAttribute('data-root-code', 'TRAIN');
  await expect(root).toHaveAttribute('data-requires-reanchor', 'true');
  await expect(page.locator('table.hmv4-training-matrix tbody tr')).toHaveCount(7);
});

test('module-template-v4 preview smoke › renders training matrix empty state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html');
  await expect(page.locator('[data-hmv4-training-matrix-empty]')).toBeVisible();
  await expect(page.locator('table.hmv4-training-matrix tbody tr')).toHaveCount(0);
});

test('module-template-v4 preview smoke › renders training matrix conflict state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html');
  const root = page.locator('[data-hmv4-workspace="training-matrix"]');
  await expect(root).toHaveAttribute('data-fixture-state', 'conflict');
  await expect(root).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
});

test('module-template-v4 preview smoke › renders training matrix partial-access', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html');
  await expect(page.locator('[data-hmv4-training-matrix-partial]')).toBeVisible();
  await expect(page.locator('[data-hmv4-training-matrix-partial] li').first()).toContainText('masked');
});

test('module-template-v4 preview smoke › renders training matrix degraded without enabling mutation', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html');
  const root = page.locator('[data-hmv4-workspace="training-matrix"]');
  await expect(root).toHaveAttribute('data-fixture-state', 'degraded');
  // No mutation buttons enabled
  const enabled = page.locator('[data-hmv4-mutation-intent]:not([disabled])');
  await expect(enabled).toHaveCount(0);
});
```

### 7.2 Extend `tests/e2e/module-template-v4-bridge.spec.ts`

Add training-alias test that verifies record-context routing:

```ts
test('bridge › training alias resolves canonically', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=training');
  // Expect bridge result mapped to /ops/people-skill-ehs/training-competency
  await expect(page.locator('[data-hmv4-bridge-result]')).toContainText('people-skill-ehs');
});

test('bridge › training with record_id maps to AR training-records', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=training&record_id=TR-7001');
  await expect(page.locator('[data-hmv4-bridge-result]')).toContainText('records/training-records/TR-7001');
});
```

(Adapt selectors to whatever the existing bridge-alias.html exposes.)

### 7.3 Extend `tests/e2e/module-template-v4-axe.spec.ts`

Add the 5 new pages to the `fixturePages` array. (Some are already added in the current branch — check first by reading the file.)

### 7.4 Extend keyboard / accessibility specs

Verify:
- Matrix table has accessible name
- Cells have data labels
- Record-open links keyboard-reachable
- Disabled buttons remain disabled with `aria-disabled="true"`

## STEP 8 — Run all gates

```bash
# JS syntax
for f in 70-module-template-v4-hydration 71-module-template-v4-routes \
         72-module-template-v4-bridge 73-module-template-v4-renderers \
         74-module-template-v4-fixtures; do
  node --check mom/scripts/portal/$f.js && echo "PASS $f"
done

# JSON parse
python3 -c "
import json, pathlib, sys
errs = 0
for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
    try: json.loads(p.read_text()); print('PASS', p.name)
    except Exception as e: errs += 1; print('FAIL', p, e)
sys.exit(0 if errs == 0 else 1)
"

# No fixture production load
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS no fixture production load"

# Forbidden diff
git diff --name-only origin/codex/second-slice-planning-from-dispatch-qa..HEAD | \
  grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && \
  echo "FAIL forbidden" || echo "PASS forbidden diff"

# Graphics Authority hex check on JS
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v '//' | head -1 && \
  echo "FAIL hex in JS" || echo "PASS no hex in JS"

# Graphics Authority px-in-string check
grep -nE '"[0-9]+px"' mom/scripts/portal/73-module-template-v4-renderers.js | head -1 && \
  echo "FAIL px in JS string" || echo "PASS no px in JS string"

# E2E
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
EXIT=$?
rm -rf node_modules
cd ../..
[ $EXIT -eq 0 ] && echo "PASS E2E" || echo "FAIL E2E"
```

Expected E2E count: 36 (existing) + ~7 (new training matrix tests) = ~43 passing tests.

## STEP 9 — Generate report

Create `_reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md` with sections:

```markdown
# S20 Training Matrix Third Slice Implementation Report

## Summary
## Branch and working tree
## Files changed
## Training matrix route behavior
## Workspace projection authority checks
## Read-only / no-mutation checks
## Bridge alias checks
## Fixture coverage
## E2E result (count + pass/fail)
## JS syntax result
## JSON fixture result
## Current portal safety result
## Forbidden diff result
## Graphics Authority compliance result
## Rollback notes
## Remaining warnings
## Decision
```

## STEP 10 — Commit

```bash
git add mom/scripts/portal/72-module-template-v4-bridge.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4*.spec.ts \
        tests/fixtures/module-template-v4/training-matrix-fixtures.json \
        tests/fixtures/module-template-v4/route-fixtures.json \
        tests/fixtures/module-template-v4/record-fixtures.json \
        tests/fixtures/module-template-v4/pages/workspace-training-matrix*.html \
        _reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md

git commit -m "feat(module-template): add training matrix workspace prototype (Slice 3)

Slice 3 = TRAIN root, WS workspace projection class.
Route /ops/people-skill-ehs/training-competency/matrix.
Fixture-backed; no live API; mutation controls disabled."

git push -u origin codex/slice-3-train-from-nc-qa
```

## ROLLBACK PROCEDURE (if needed)

```bash
# Revert this slice only
git checkout codex/second-slice-planning-from-dispatch-qa
git branch -D codex/slice-3-train-from-nc-qa

# Or after push:
git push origin --delete codex/slice-3-train-from-nc-qa
```

Slice 1 (DISP at 9289ef89) and Slice 2 (NQCASE at 2eb6a7aa) remain intact.

## DECISION PHRASE OUTPUT

Return ONE of:

```text
TRAINING_MATRIX_THIRD_SLICE_PASS_READY_FOR_QA
TRAINING_MATRIX_THIRD_SLICE_PASS_WITH_WARNINGS
TRAINING_MATRIX_THIRD_SLICE_FAIL_BLOCK_NEXT
```

Do NOT proceed to V22 QA — that is a separate prompt for a separate session.
