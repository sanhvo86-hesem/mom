# CODEX MEGAPROMPT — Slice 4 CAPA Record Shell

> Paste into Codex local. Codex creates branch `codex/slice-4-capa-from-train-qa`,
> implements Slice 4 (CAPA root, AR governed-quality), and produces a report.
>
> Approval phrase: `Proceed with CAPA Record Shell fourth-slice prototype implementation.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are implementing **Slice 4 = CAPA Record Shell** (CAPA root, AR authoritative governed-quality class). Mirror the NQCASE Slice 2 pattern; CAPA is structurally similar but with different lifecycle (start-analysis → record-root-cause → action-plan → assign-action → submit-approval → submit-verification → record-effectiveness → close/cancel).

**State as of merge into main**:
- main HEAD: `2af773e8 fix(portal): restore cache-bust v=20260425g`
- Slice 1 DISP done (renderDispatchBoardWorkspace)
- Slice 2 NQCASE done (renderNonconformanceRecord)
- Slice 3 TRAIN done (renderTrainingMatrixWorkspace)
- Slice 0.5 nav shell done (renderShellHome/DomainLanding/ModuleLanding)
- 111/111 E2E passing

This is **development/prototype** only. Use wording per ADR-0001.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT switch current portal navigation.
Do NOT implement backend APIs (Slice 4 stays fixture-only).
Do NOT promote fixture registries.
Do NOT execute approval mutation, verification mutation, or e-sign challenge.
Do NOT modify forbidden files (per ADR-0004).
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify Slice 1+2+3 + nav shell already on main
grep -cE "renderDispatchBoardWorkspace|renderNonconformanceRecord|renderTrainingMatrixWorkspace|renderShellHome" mom/scripts/portal/73-module-template-v4-renderers.js
# Expected: >= 4

# Verify NQCASE fixture pattern (your reference)
ls tests/fixtures/module-template-v4/nonconformance-case-fixtures.json \
   tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html
# Expected: both exist

# Branch
git checkout -b codex/slice-4-capa-from-train-qa
```

If any check fails, return `CAPA_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4-axe.spec.ts (extend page list)
tests/e2e/module-template-v4-visual.spec.ts (auto-discovers — no edit)
tests/fixtures/module-template-v4/capa-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-overview.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-analysis.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-actions.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-verification.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-effectiveness.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-related.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-audit.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-signatures.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-conflict.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-partial-access.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-degraded.html (NEW)
_reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md (NEW)
```

## FORBIDDEN

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
/ops/records/capas/CAPA-001?tab=overview
```

### Required render attributes

```text
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="capas"
data-root-code="CAPA"
data-record-id="CAPA-001"
data-query-tab="<tab>"
```

### CAPA tabs (8 tabs — more than NQCASE because CAPA lifecycle is richer)

```text
overview | analysis | actions | verification | effectiveness | related | audit | signatures
```

### CAPA lifecycle (per Step 2 workflow master)

```text
draft → analysis → action-planning → execution → verification → effectiveness → closed
                                                                             ↘ cancelled
```

States to render in lifecycle strip:
- draft
- analysis
- action-planning
- execution
- verification
- effectiveness
- closed (or cancelled — terminal)

### Disabled mutation intents (per ADR-0010 anti-fabrication)

```text
data-hmv4-mutation-intent="capa-start-analysis"
data-hmv4-mutation-intent="capa-record-root-cause"
data-hmv4-mutation-intent="capa-add-action-plan"
data-hmv4-mutation-intent="capa-assign-action"
data-hmv4-mutation-intent="capa-submit-approval"
data-hmv4-mutation-intent="capa-submit-verification"
data-hmv4-mutation-intent="capa-record-effectiveness"
data-hmv4-mutation-intent="capa-close"
data-hmv4-mutation-intent="capa-cancel"
data-hmv4-mutation-intent="capa-esign"
```

All buttons disabled. Visible explanatory text required.

## STEP 1 — Read NQCASE pattern (your reference)

```bash
grep -nE "function renderNonconformanceRecord|function renderNcPanel|nonconformanceTabs" mom/scripts/portal/73-module-template-v4-renderers.js | head -10

cat tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
cat tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html
```

You will mirror this structure for CAPA. Same shape, different vocabulary, different lifecycle states.

## STEP 2 — Implement `renderCapaRecord(route)`

Add to `73-module-template-v4-renderers.js`:

```js
var capaTabs = ['overview','analysis','actions','verification','effectiveness','related','audit','signatures'];

function normaliseCapaTab(tab){
  return capaTabs.indexOf(tab) >= 0 ? tab : 'overview';
}

function renderCapaPanel(tab, record){
  var capaActions = (record.actionPlan || []);
  var rootCauses = (record.rootCauses || []);
  var verifications = (record.verifications || []);
  var effectivenessChecks = (record.effectivenessChecks || []);

  if(tab === 'overview'){
    return '<h2>Overview</h2>' +
      '<p>'+esc(record.summary || 'CAPA opened from upstream NQCASE. Read-only overview fixture.')+'</p>' +
      '<dl class="hmv4-meta-grid">' +
        '<dt>Linked NC</dt><dd>'+esc(record.linkedNcId || '—')+'</dd>' +
        '<dt>Severity</dt><dd>'+esc(record.severity || '—')+'</dd>' +
        '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>' +
        '<dt>Due date</dt><dd>'+esc(record.dueDate || '—')+'</dd>' +
      '</dl>';
  }
  if(tab === 'analysis'){
    if(rootCauses.length === 0){
      return '<h2>Root cause analysis</h2><p class="hmv4-text-2">No root causes recorded. Read-only placeholder.</p>';
    }
    return '<h2>Root cause analysis</h2><ul class="hmv4-list">' +
      rootCauses.map(function(rc){return '<li><strong>'+esc(rc.category)+'</strong>: '+esc(rc.text)+'</li>';}).join('') +
      '</ul>';
  }
  if(tab === 'actions'){
    if(capaActions.length === 0){
      return '<h2>Action plan</h2><p class="hmv4-text-2">No actions planned. Read-only placeholder.</p>';
    }
    return '<h2>Action plan</h2><table class="hmv4-data-table"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>' +
      capaActions.map(function(a){return '<tr><td>'+esc(a.title)+'</td><td>'+esc(a.owner)+'</td><td>'+esc(a.dueDate)+'</td><td>'+esc(a.status)+'</td></tr>';}).join('') +
      '</tbody></table>';
  }
  if(tab === 'verification'){
    if(verifications.length === 0){
      return '<h2>Verification</h2><p class="hmv4-text-2">No verifications recorded. Read-only placeholder.</p>';
    }
    return '<h2>Verification</h2><ul class="hmv4-list">' +
      verifications.map(function(v){return '<li>'+esc(v.summary)+' &mdash; '+esc(v.verifiedBy)+' on '+esc(v.verifiedAt)+'</li>';}).join('') +
      '</ul>';
  }
  if(tab === 'effectiveness'){
    if(effectivenessChecks.length === 0){
      return '<h2>Effectiveness check</h2><p class="hmv4-text-2">No effectiveness checks recorded. Read-only placeholder.</p>';
    }
    return '<h2>Effectiveness check</h2><ul class="hmv4-list">' +
      effectivenessChecks.map(function(e){return '<li>'+esc(e.summary)+' &mdash; result: '+esc(e.result)+'</li>';}).join('') +
      '</ul>';
  }
  if(tab === 'related'){
    var related = record.relatedRecords || [];
    if(related.length === 0){
      return '<h2>Related records</h2><p class="hmv4-text-2">No related records. Read-only placeholder.</p>';
    }
    return '<h2>Related records</h2><ul class="hmv4-list">' +
      related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('') +
      '</ul>';
  }
  if(tab === 'audit'){
    return '<h2>Audit trail</h2><p class="hmv4-text-2">Read-only placeholder. Audit events surface in production via /api/v1/capas/{id}/audit.</p>';
  }
  if(tab === 'signatures'){
    return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder. e-Signatures (21 CFR Part 11) surface in production via /api/v1/electronic-signatures.</p>';
  }
  return '<p>Unknown tab.</p>';
}

function renderCapaRecord(route){
  var p = route.params || {};
  var q = route.query || {};
  var tab = normaliseCapaTab(q.tab || 'overview');
  var recordId = p.record_id || 'CAPA-001';

  var fixture = window.HMV4_CAPA_RECORD_FIXTURE || readJsonFixture('[data-hmv4-capa-record-fixture]') || {};
  var records = fixture.records || {};
  var record = records[recordId] || (function(){
    // Default record
    return {
      recordId: recordId,
      rootCode: 'CAPA',
      title: 'Operator training gap on operation OP-30',
      summary: 'CAPA opened from NC-001 dimensional issue. Containment complete; root cause analysis in progress.',
      severity: 'major',
      state: 'analysis',
      owner: 'Quality Engineer',
      dueDate: '2026-06-30',
      linkedNcId: 'NC-001',
      lifecycle: [
        ['draft','complete'],
        ['analysis','current'],
        ['action-planning','pending'],
        ['execution','locked'],
        ['verification','locked'],
        ['effectiveness','locked'],
        ['closed','locked']
      ],
      stateMessage: 'Read-only prototype shell. Governed CAPA actions must remain outside this fixture.',
      freshness: 'fixture_current',
      rootCauses: [],
      actionPlan: [],
      verifications: [],
      effectivenessChecks: [],
      relatedRecords: [{ resourceFamily: 'nonconformance-cases', recordId: 'NC-001', label: 'NC-001 dimensional NC' }]
    };
  })();
  record.rootCode = 'CAPA';
  record.recordId = recordId;

  var state = (q.state || record.state || 'analysis');
  var stateOverlay = (fixture.states || {})[state] || null;
  var freshness = (stateOverlay && stateOverlay.freshness) || record.freshness || 'fixture_current';
  var stateMessage = (stateOverlay && stateOverlay.stateMessage) || record.stateMessage || '';
  var partialAccessLimitations = (stateOverlay && stateOverlay.limitations) || [];

  var lifecycle = (record.lifecycle || []);

  var head =
    '<header class="hmv4-record-identity">' +
      '<h1 class="hmv4-record-title">'+esc(recordId)+' &mdash; '+esc(record.title)+'</h1>' +
      '<dl class="hmv4-meta-grid">' +
        '<dt>Severity</dt><dd>'+esc(record.severity || '')+'</dd>' +
        '<dt>State</dt><dd>'+esc(record.state || state)+'</dd>' +
        '<dt>Owner</dt><dd>'+esc(record.owner || '')+'</dd>' +
        '<dt>Linked NC</dt><dd>'+esc(record.linkedNcId || '—')+'</dd>' +
      '</dl>' +
      (stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status">'+esc(stateMessage)+'</p>' : '') +
    '</header>';

  var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" aria-label="CAPA lifecycle">' +
    lifecycle.map(function(s){return '<li data-state-class="'+esc(s[1])+'">'+esc(s[0])+'</li>';}).join('') +
    '</ol>';

  var partialAccessNotice = '';
  if(state === 'partial_access' && partialAccessLimitations.length){
    partialAccessNotice =
      '<section class="hmv4-feedback" data-feedback-state="warning" data-hmv4-capa-partial>' +
        '<p>Partial access:</p>' +
        '<ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>' +
      '</section>';
  }

  var disabledLaunchers =
    '<section class="hmv4-toolbar" aria-label="Disabled launchers" data-hmv4-capa-launchers>' +
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="capa-submit-approval">Submit for approval</button>' +
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="capa-submit-verification">Submit verification</button>' +
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="capa-close">Close CAPA</button>' +
      '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="capa-esign">e-Sign</button>' +
      '<span class="hmv4-feedback" data-feedback-state="warning" role="note">Mutation actions are disabled in this read-only prototype.</span>' +
    '</section>';

  return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--capa" data-hmv4-capa-record data-route-class="AR" data-resource-family="capas" data-root-code="CAPA" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">' +
    head + lifecycleStrip + partialAccessNotice + disabledLaunchers +
    '<div class="hmv4-tablist" role="tablist" aria-label="CAPA case details">' + capaTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('') + '</div>' +
    capaTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-capa-panel="'+esc(t)+'">'+renderCapaPanel(t, record)+'</section>';}).join('') +
  '</article>';
}
```

Wire into the AR record dispatch (similar to how NQCASE is dispatched):

```js
// inside renderRoute switch / record-shell dispatch
if(p && p.resource_family === 'nonconformance-cases') return renderNonconformanceRecord(route);
if(p && p.resource_family === 'capas') return renderCapaRecord(route);  // NEW
return renderGenericRecordShell(route);
```

Expose:
```js
window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, {
  renderCapaRecord: renderCapaRecord
});
```

## STEP 3 — Bridge alias `capa`

Open `72-module-template-v4-bridge.js`. Verify a `capa` alias exists (it should — added during Slice 2 patterns). If not, add:

```js
capa: u('ML', { domain: 'quality-compliance', module: 'capa' }),
```

For context-backed routing:

```js
if(key === 'capa' && recordId){
  return {
    policy: 'redirect_record_context_only',
    url: u('AR', { resource_family: 'capas', record_id: recordId }, { tab: (context && context.tab) || 'overview' })
  };
}
```

## STEP 4 — Create fixture JSON

Create `tests/fixtures/module-template-v4/capa-record-fixtures.json`:

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "capas",
  "rootCode": "CAPA",
  "records": {
    "CAPA-001": {
      "recordId": "CAPA-001",
      "rootCode": "CAPA",
      "title": "Operator training gap on operation OP-30",
      "summary": "CAPA opened from NC-001 dimensional issue. Containment complete; root cause analysis in progress.",
      "severity": "major",
      "state": "analysis",
      "owner": "Quality Engineer",
      "dueDate": "2026-06-30",
      "linkedNcId": "NC-001",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype shell. Governed CAPA actions must remain outside this fixture.",
      "lifecycle": [
        ["draft","complete"],
        ["analysis","current"],
        ["action-planning","pending"],
        ["execution","locked"],
        ["verification","locked"],
        ["effectiveness","locked"],
        ["closed","locked"]
      ],
      "rootCauses": [
        { "category": "Training", "text": "Operator OP-1002 had expired QUAL_INJ_BASIC certification." },
        { "category": "Process", "text": "Pre-shift competency check did not run on this date." }
      ],
      "actionPlan": [
        { "title": "Re-certify OP-1002", "owner": "Training Lead", "dueDate": "2026-05-15", "status": "in_progress" },
        { "title": "Add daily competency check to shift handoff", "owner": "Production Supervisor", "dueDate": "2026-05-30", "status": "planned" }
      ],
      "verifications": [],
      "effectivenessChecks": [],
      "relatedRecords": [
        { "resourceFamily": "nonconformance-cases", "recordId": "NC-001", "label": "NC-001 dimensional NC" },
        { "resourceFamily": "training-records", "recordId": "TR-7003", "label": "TR-7003 OP-1002 training certification" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict detected. Reconcile in the governed CAPA workflow." },
    "partial_access": { "stateMessage": "Partial-access fixture. Some action assignees masked.", "limitations": ["Action assignees are masked for cross-team operators.", "Verification details are masked for the current role."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded/offline fixture. Refresh from authority before acting." }
  }
}
```

## STEP 5 — Create 11 fixture pages

Mirror the NQCASE pattern. For each tab + each special state, create a page that loads the fixture inline and renders the matching state.

Pages:
- `authoritative-record-shell-capa-overview.html` (tab=overview, state=current)
- `authoritative-record-shell-capa-analysis.html` (tab=analysis)
- `authoritative-record-shell-capa-actions.html` (tab=actions)
- `authoritative-record-shell-capa-verification.html` (tab=verification)
- `authoritative-record-shell-capa-effectiveness.html` (tab=effectiveness)
- `authoritative-record-shell-capa-related.html` (tab=related)
- `authoritative-record-shell-capa-audit.html` (tab=audit)
- `authoritative-record-shell-capa-signatures.html` (tab=signatures)
- `authoritative-record-shell-capa-conflict.html` (state=conflict)
- `authoritative-record-shell-capa-partial-access.html` (state=partial_access)
- `authoritative-record-shell-capa-degraded.html` (state=degraded)

Read one NQCASE page first as the template:

```bash
cat tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html
```

Then duplicate the structure with `capa` replacing `nc` in the filename and fixture-key references, and adjusting the route path/params.

## STEP 6 — Update route + record fixture registries

Edit `tests/fixtures/module-template-v4/route-fixtures.json` to add CAPA route contexts (mirror the NC entries).

Edit `tests/fixtures/module-template-v4/record-fixtures.json` to add CAPA records (mirror NC entries).

## STEP 7 — Add E2E tests

Extend `tests/e2e/module-template-v4.spec.ts`:

```ts
test('module-template-v4 preview smoke › renders CAPA overview tab', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-overview.html');
  const root = page.locator('[data-hmv4-capa-record]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-route-class', 'AR');
  await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
  await expect(root).toHaveAttribute('data-resource-family', 'capas');
  await expect(root).toHaveAttribute('data-root-code', 'CAPA');
  await expect(page.locator('[data-hmv4-capa-panel="overview"]:not([hidden])')).toBeVisible();
});

// Tabs
for (const tab of ['analysis','actions','verification','effectiveness','related','audit','signatures']) {
  test(`module-template-v4 preview smoke › renders CAPA ${tab} tab`, async ({ page }) => {
    await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-${tab}.html`);
    await expect(page.locator(`[data-hmv4-capa-panel="${tab}"]:not([hidden])`)).toBeVisible();
  });
}

// Fixture states
test('module-template-v4 preview smoke › CAPA conflict state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-conflict.html');
  await expect(page.locator('[data-hmv4-capa-record]')).toHaveAttribute('data-fixture-state', 'conflict');
});

test('module-template-v4 preview smoke › CAPA partial access', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-partial-access.html');
  await expect(page.locator('[data-hmv4-capa-partial]')).toBeVisible();
});

test('module-template-v4 preview smoke › CAPA degraded without enabling mutation', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-degraded.html');
  const enabled = page.locator('[data-hmv4-mutation-intent]:not([disabled])');
  await expect(enabled).toHaveCount(0);
});
```

Extend `tests/e2e/module-template-v4-axe.spec.ts` to include the 11 new pages.

Extend `tests/e2e/module-template-v4-bridge.spec.ts`:

```ts
test('bridge › capa with record_id maps to AR capas', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=capa&record_id=CAPA-001');
  await expect(page.locator('[data-hmv4-bridge-result]')).toContainText('records/capas/CAPA-001');
});

test('bridge › capa without record_id does not invent ID', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=capa');
  // Bridge should map to module landing OR unmapped — must not invent record id
  const result = page.locator('[data-hmv4-bridge-result]');
  await expect(result).not.toContainText(/records\/capas\/CAPA-/);
});
```

## STEP 8 — Run all gates

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
EXIT=$?
rm -rf node_modules
cd ../..

node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS no fixture production load"
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden diff"
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v '//' && echo "FAIL hex" || echo "PASS no hex in JS"
```

Expected E2E count: 111 (existing) + 12 (CAPA tests) ≈ 123 passing.

## STEP 9 — Visual baselines for new CAPA pages

The visual.spec.ts auto-discovers fixture pages. Run:

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright test --project=chromium --update-snapshots module-template-v4-visual.spec.ts
rm -rf node_modules
cd ../..
```

Verify 11 new PNG snapshots created under `tests/e2e/module-template-v4-visual.spec.ts-snapshots/`.

## STEP 10 — Generate report + commit

Create `_reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md` with sections matching S20 NC report style.

```bash
git add mom/scripts/portal/72-module-template-v4-bridge.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4*.spec.ts \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/ \
        tests/fixtures/module-template-v4/capa-record-fixtures.json \
        tests/fixtures/module-template-v4/route-fixtures.json \
        tests/fixtures/module-template-v4/record-fixtures.json \
        tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-*.html \
        _reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md

git commit -m "feat(module-template): add CAPA record shell prototype (Slice 4)

Mirrors NQCASE Slice 2 pattern adapted for CAPA root.
8 tabs (overview, analysis, actions, verification, effectiveness,
related, audit, signatures); fixture-backed; mutation disabled.

Bridge alias 'capa' constrained to context-backed mapping (ADR-0010).
Visual baselines added for 11 new fixture pages."

git push -u origin codex/slice-4-capa-from-train-qa
```

## ROLLBACK

```bash
git checkout main
git branch -D codex/slice-4-capa-from-train-qa
git push origin --delete codex/slice-4-capa-from-train-qa
```

Slices 0.5/1/2/3 untouched.

## DECISION PHRASE OUTPUT

```text
CAPA_SLICE4_PASS_READY_FOR_QA
CAPA_SLICE4_PASS_WITH_WARNINGS
CAPA_SLICE4_FAIL_BLOCK_NEXT
```
