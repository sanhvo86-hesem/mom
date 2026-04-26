# CODEX MEGAPROMPT — Slice 9 JO Record Shell (Transactional Phase B Start)

> Approval: `Proceed with JO Record Shell ninth-slice prototype implementation.`
> Branch: `codex/slice-9-jo-from-eco-qa`
> **First Phase B transactional slice. Uses backend C.2 plural REST aliases.**

---

## ROLE & CONTEXT

You are Codex local on `sanhvo86-hesem/mom`. Phase A quality stream complete (Slices 0.5+1+2+3+4+5+6+7+8 = 9 surfaces). Backend Stream C.1 (EQMS plural aliases), C.2 (transactional REST), C.3 (CPO rename) all merged. Live API toggle proven on NQCASE (ADR-0011) and replicated to governed roots (ADR-0012).

You are implementing **Slice 9 = JO Record Shell** (JO root, AR transactional class). This is the FIRST Phase B transactional slice. Pattern differs from quality slices: JO is operational/scheduling (not governed-quality), lifecycle is shorter (released → executing → completed), but with rich operational details (work-order spawning, dispatch readiness, material consumption).

**JO is the parent of WO**: each Job Order spawns Work Orders. The shell must show this hierarchy.

**Pre-production**. No mutation. Mutation buttons disabled. Forbidden file list per ADR-0004.

## PRE-FLIGHT

```bash
git fetch origin && git checkout main && git pull --ff-only
git status --short  # Expected empty

# Verify Phase A renderers all present
grep -cE "renderNonconformanceRecord|renderCapaRecord|renderCdocRecord|renderInspRecord|renderBrelRecord" mom/scripts/portal/73-module-template-v4-renderers.js
# Expected: >= 5

# Verify backend C.2 alias exists
grep -c "/api/v1/job-orders" mom/api/routes/rest-routes.php
# Expected: > 0

# Branch
git checkout -b codex/slice-9-jo-from-eco-qa
```

If fail → `JO_PREFLIGHT_FAIL_<reason>`.

## ALLOWED

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/70-module-template-v4-hydration.js (only to register JO in HMV4_LIVE_RESOURCE_REGISTRY if exists)
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4-axe.spec.ts (extend list)
tests/e2e/module-template-v4-live-api.spec.ts (only to add JO live-mode test if registry exists)
tests/fixtures/module-template-v4/job-order-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-*.html (NEW × 9)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-live-mode.html (NEW)
_reports/module-template-v4/S_SLICE9_JO_IMPLEMENTATION_REPORT.md (NEW)
```

## FORBIDDEN

```text
mom/portal.html
mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/qms-data/**, mom/api/**
HMV4_PREVIEW_ENABLED=true / HMV4_LIVE_API_ENABLED=true in mom/portal.html
```

## TARGET CONTRACT

### Route
```text
/ops/records/job-orders/JO-2026-014?tab=overview
```

### Required attributes on `[data-hmv4-jo-record]`
```text
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="job-orders"
data-root-code="JO"
data-record-id="JO-2026-014"
data-query-tab="<tab>"
```

### JO tabs (7 — transactional/operational specific)
```text
overview | dispatch-readiness | spawned-work-orders | material-consumption | progress | related | audit
```

(No signatures tab in transactional; less compliance-heavy than governed-quality.)

### JO lifecycle states
```text
draft → released → executing → completed
                            ↘ on-hold → executing | cancelled
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="jo-release"
data-hmv4-mutation-intent="jo-spawn-work-order"
data-hmv4-mutation-intent="jo-place-on-hold"
data-hmv4-mutation-intent="jo-resume"
data-hmv4-mutation-intent="jo-cancel"
data-hmv4-mutation-intent="jo-complete"
```

### JO record shape

```js
record = {
  recordId,                       // JO-2026-014
  rootCode: 'JO',
  title,
  jobNumber, customerOrderRef,    // links upstream
  state, severity,                // typically severity=low for JOs
  productCode, quantityOrdered, quantityCompleted,
  scheduledStart, scheduledEnd, actualStart, actualEnd,
  owner, plannerNotes,
  dispatchReadiness: {
    materialReady, equipmentReady, operatorReady,
    blockedBy: [...]
  },
  spawnedWorkOrders: [{ id, operation, scheduledStart, scheduledEnd, state }],
  materialConsumption: [{ itemCode, plannedQty, actualQty, lot }],
  progressMetrics: { completionPct, scrapRate, downtimePct },
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## STEP 1 — Reference existing pattern

Read CDOC renderer as primary template (already on main):
```bash
sed -n '/function renderCdocRecord/,/^  }$/p' mom/scripts/portal/73-module-template-v4-renderers.js | head -120
cat tests/fixtures/module-template-v4/cdoc-record-fixtures.json
```

JO is NOT governed-content like CDOC, but the renderer pattern (tabs, mutation toolbar, fixture state overlay, panel switch) is identical. Mirror that pattern with JO-specific data shape.

## STEP 2 — Implement `renderJoRecord(route)` and `renderJoPanel(tab, record)`

Add to `73-module-template-v4-renderers.js`:

```js
var joTabs = ['overview','dispatch-readiness','spawned-work-orders','material-consumption','progress','related','audit'];

function normaliseJoTab(tab){ return joTabs.indexOf(tab) >= 0 ? tab : 'overview'; }

function renderJoPanel(tab, record){
  if(tab === 'overview') {
    return '<h2>Overview</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Job number</dt><dd>'+esc(record.jobNumber || '—')+'</dd>'+
        '<dt>Customer order</dt><dd>'+esc(record.customerOrderRef || '—')+'</dd>'+
        '<dt>Product</dt><dd>'+esc(record.productCode || '—')+'</dd>'+
        '<dt>Quantity</dt><dd>'+esc((record.quantityCompleted || 0)+' / '+(record.quantityOrdered || 0))+'</dd>'+
        '<dt>Scheduled</dt><dd>'+esc(record.scheduledStart || '—')+' &rarr; '+esc(record.scheduledEnd || '—')+'</dd>'+
        '<dt>Actual</dt><dd>'+esc(record.actualStart || '—')+' &rarr; '+esc(record.actualEnd || 'in-progress')+'</dd>'+
        '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
      '</dl>'+
      (record.plannerNotes ? '<h3>Planner notes</h3><p>'+esc(record.plannerNotes)+'</p>' : '');
  }
  if(tab === 'dispatch-readiness') {
    var d = record.dispatchReadiness || {};
    var blockedBy = (d.blockedBy || []);
    return '<h2>Dispatch readiness</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Material</dt><dd data-hmv4-readiness="'+(d.materialReady ? 'ready' : 'blocked')+'">'+(d.materialReady ? 'Ready' : 'Blocked')+'</dd>'+
        '<dt>Equipment</dt><dd data-hmv4-readiness="'+(d.equipmentReady ? 'ready' : 'blocked')+'">'+(d.equipmentReady ? 'Ready' : 'Blocked')+'</dd>'+
        '<dt>Operator</dt><dd data-hmv4-readiness="'+(d.operatorReady ? 'ready' : 'blocked')+'">'+(d.operatorReady ? 'Ready' : 'Blocked')+'</dd>'+
      '</dl>'+
      (blockedBy.length === 0 ? '<p class="hmv4-text-2">No blockers.</p>' :
        '<h3>Blocked by</h3><ul class="hmv4-list">'+blockedBy.map(function(b){return '<li>'+esc(b)+'</li>';}).join('')+'</ul>');
  }
  if(tab === 'spawned-work-orders') {
    var wos = record.spawnedWorkOrders || [];
    if(wos.length === 0) return '<h2>Spawned work orders</h2><p class="hmv4-text-2">No WOs spawned yet.</p>';
    return '<h2>Spawned work orders</h2>'+
      '<table class="hmv4-data-table"><thead><tr><th>WO ID</th><th>Operation</th><th>Scheduled</th><th>State</th></tr></thead><tbody>'+
      wos.map(function(w){return '<tr><td><a href="/ops/records/work-orders/'+esc(w.id)+'?tab=overview" data-hmv4-record-open="work-orders" data-hmv4-record-id="'+esc(w.id)+'">'+esc(w.id)+'</a></td><td>'+esc(w.operation)+'</td><td>'+esc(w.scheduledStart || '')+' → '+esc(w.scheduledEnd || '')+'</td><td>'+esc(w.state)+'</td></tr>';}).join('')+
      '</tbody></table>';
  }
  if(tab === 'material-consumption') {
    var mc = record.materialConsumption || [];
    if(mc.length === 0) return '<h2>Material consumption</h2><p class="hmv4-text-2">No materials recorded.</p>';
    return '<h2>Material consumption</h2>'+
      '<table class="hmv4-data-table"><thead><tr><th>Item</th><th>Planned</th><th>Actual</th><th>Lot</th></tr></thead><tbody>'+
      mc.map(function(m){return '<tr><td>'+esc(m.itemCode)+'</td><td>'+esc(m.plannedQty)+'</td><td>'+esc(m.actualQty)+'</td><td><a href="/ops/records/lots/'+esc(m.lot || '')+'?tab=overview" data-hmv4-record-open="lots" data-hmv4-record-id="'+esc(m.lot || '')+'">'+esc(m.lot || '—')+'</a></td></tr>';}).join('')+
      '</tbody></table>';
  }
  if(tab === 'progress') {
    var p = record.progressMetrics || {};
    return '<h2>Progress metrics</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Completion</dt><dd>'+esc((p.completionPct || 0)+'%')+'</dd>'+
        '<dt>Scrap rate</dt><dd>'+esc((p.scrapRate || 0)+'%')+'</dd>'+
        '<dt>Downtime</dt><dd>'+esc((p.downtimePct || 0)+'%')+'</dd>'+
      '</dl>';
  }
  if(tab === 'related') {
    var rel = record.relatedRecords || [];
    if(rel.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
    return '<h2>Related records</h2><ul class="hmv4-list">'+
      rel.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview">'+esc(r.label)+'</a></li>';}).join('')+
      '</ul>';
  }
  if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/job-orders/{id}/audit (when audit endpoint added in Phase B follow-up).</p>';
  return '<p>Unknown tab.</p>';
}

function renderJoRecord(route){
  var p = route.params || {};
  var q = route.query || {};
  var tab = normaliseJoTab(q.tab || 'overview');
  var recordId = p.record_id || 'JO-2026-014';

  var fixture = window.HMV4_JO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-jo-record-fixture]') || {};
  var records = fixture.records || {};
  var record = records[recordId] || {
    recordId: recordId, rootCode: 'JO',
    title: 'Job order JO-2026-014 (PN-2042 Rev B, Qty 5000)',
    jobNumber: 'JO-2026-014', customerOrderRef: 'CPO-2026-077',
    productCode: 'PN-2042', quantityOrdered: 5000, quantityCompleted: 3200,
    state: 'executing',
    scheduledStart: '2026-04-15', scheduledEnd: '2026-04-30',
    actualStart: '2026-04-15', actualEnd: null,
    owner: 'Production Planner',
    freshness: 'fixture_current',
    stateMessage: 'Read-only prototype JO shell. Mutation outside fixture.',
    lifecycle: [['draft','complete'],['released','complete'],['executing','current'],['completed','locked']],
    dispatchReadiness: { materialReady: true, equipmentReady: true, operatorReady: true, blockedBy: [] },
    spawnedWorkOrders: [],
    materialConsumption: [],
    progressMetrics: { completionPct: 64, scrapRate: 0.8, downtimePct: 3.2 },
    relatedRecords: []
  };
  record.rootCode = 'JO'; record.recordId = recordId;

  var state = (q.state || record.state || 'executing');
  var stateOverlay = (fixture.states || {})[state] || null;
  var freshness = (stateOverlay && stateOverlay.freshness) || record.freshness || 'fixture_current';
  var stateMessage = (stateOverlay && stateOverlay.stateMessage) || record.stateMessage || '';
  var partialAccessLimitations = (stateOverlay && stateOverlay.limitations) || [];

  var head = '<header class="hmv4-record-identity">'+
    '<h1 class="hmv4-record-title">'+esc(record.jobNumber || recordId)+' &mdash; '+esc(record.title)+'</h1>'+
    '<dl class="hmv4-meta-grid">'+
      '<dt>State</dt><dd>'+esc(record.state || state)+'</dd>'+
      '<dt>Product</dt><dd>'+esc(record.productCode || '—')+'</dd>'+
      '<dt>Qty</dt><dd>'+esc((record.quantityCompleted || 0)+' / '+(record.quantityOrdered || 0))+'</dd>'+
      '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
    '</dl>'+
    (stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status">'+esc(stateMessage)+'</p>' : '')+
  '</header>';

  var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" aria-label="JO lifecycle">'+
    (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1])+'">'+esc(s[0])+'</li>';}).join('')+
  '</ol>';

  var partialNotice = (state === 'partial_access' && partialAccessLimitations.length)
    ? '<section class="hmv4-feedback" data-feedback-state="warning" data-hmv4-jo-partial><p>Partial access:</p><ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
    : '';

  var disabled = '<section class="hmv4-toolbar" aria-label="Disabled launchers" data-hmv4-jo-launchers>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="jo-release">Release</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="jo-spawn-work-order">Spawn WO</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="jo-place-on-hold">Place on hold</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="jo-complete">Complete</button>'+
    '<span class="hmv4-feedback" data-feedback-state="warning" role="note">Mutation actions disabled in this read-only prototype.</span>'+
  '</section>';

  return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--jo" data-hmv4-jo-record data-route-class="AR" data-resource-family="job-orders" data-root-code="JO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
    head + lifecycleStrip + partialNotice + disabled +
    '<div class="hmv4-tablist" role="tablist" aria-label="Job order details">'+joTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
    joTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-jo-panel="'+esc(t)+'">'+renderJoPanel(t, record)+'</section>';}).join('')+
  '</article>';
}
```

Wire dispatch + expose:
```js
if(p && p.resource_family === 'job-orders') return renderJoRecord(route);
window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, { renderJoRecord: renderJoRecord });
```

## STEP 3 — Bridge alias `jo` (or `job-order`)

Verify in `72-module-template-v4-bridge.js`. Add if missing:
```js
'job-order': u('ML', { domain: 'planning-scheduling', module: 'job-orders' }),
jo: u('ML', { domain: 'planning-scheduling', module: 'job-orders' }),

// Context-backed
if((key === 'jo' || key === 'job-order') && recordId){
  return { policy: 'redirect_record_context_only',
    url: u('AR', { resource_family: 'job-orders', record_id: recordId }, { tab: (context && context.tab) || 'overview' }) };
}
```

## STEP 4 — Register JO in HMV4_LIVE_RESOURCE_REGISTRY (if exists)

Check whether ADR-0012 registry has been merged:
```bash
grep -n "HMV4_LIVE_RESOURCE_REGISTRY" mom/scripts/portal/70-module-template-v4-hydration.js | head -3
```

If yes, add JO entry:
```js
'job-orders': {
  canonicalPath: '/api/v1/job-orders',
  fixtureGlobal: 'HMV4_JO_RECORD_FIXTURE',
  adapt: function(live){
    if(!live) return null;
    return {
      recordId: live.id || live.code || live.job_number || live.jobNumber,
      rootCode: 'JO',
      title: live.title || live.summary || ('Job ' + (live.job_number || live.id)),
      jobNumber: live.job_number || live.jobNumber,
      customerOrderRef: live.customer_order_ref || live.customerOrderRef,
      productCode: live.product_code,
      quantityOrdered: live.quantity_ordered || live.quantityOrdered,
      quantityCompleted: live.quantity_completed || live.quantityCompleted,
      state: live.state || 'live',
      scheduledStart: live.scheduled_start, scheduledEnd: live.scheduled_end,
      actualStart: live.actual_start, actualEnd: live.actual_end,
      owner: (live.owner && (live.owner.name || live.owner)) || null,
      freshness: 'live_current',
      stateMessage: 'Live API mode. Read-only display.',
      lifecycle: live.lifecycle || [],
      dispatchReadiness: live.dispatch_readiness || {},
      spawnedWorkOrders: live.spawned_work_orders || [],
      materialConsumption: live.material_consumption || [],
      progressMetrics: live.progress_metrics || {},
      relatedRecords: live.related_records || []
    };
  }
}
```

If registry doesn't exist yet (Live API replication still pending), skip this step and document in report — JO live-mode will be wired when registry lands.

## STEP 5 — Fixture JSON

Create `tests/fixtures/module-template-v4/job-order-record-fixtures.json`:

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "job-orders",
  "rootCode": "JO",
  "records": {
    "JO-2026-014": {
      "recordId": "JO-2026-014", "rootCode": "JO",
      "title": "Job order JO-2026-014 (PN-2042 Rev B, Qty 5000)",
      "jobNumber": "JO-2026-014", "customerOrderRef": "CPO-2026-077",
      "productCode": "PN-2042", "quantityOrdered": 5000, "quantityCompleted": 3200,
      "state": "executing",
      "scheduledStart": "2026-04-15", "scheduledEnd": "2026-04-30",
      "actualStart": "2026-04-15", "actualEnd": null,
      "owner": "Production Planner",
      "plannerNotes": "Customer expedite. Run on Line 1 morning shift.",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype JO shell. Mutation outside fixture.",
      "lifecycle": [["draft","complete"],["released","complete"],["executing","current"],["completed","locked"]],
      "dispatchReadiness": {
        "materialReady": true, "equipmentReady": true, "operatorReady": true,
        "blockedBy": []
      },
      "spawnedWorkOrders": [
        { "id": "WO-3011", "operation": "Injection molding OP-10", "scheduledStart": "2026-04-15", "scheduledEnd": "2026-04-22", "state": "completed" },
        { "id": "WO-3012", "operation": "CNC OP-20", "scheduledStart": "2026-04-22", "scheduledEnd": "2026-04-25", "state": "completed" },
        { "id": "WO-3013", "operation": "First-piece OP-30", "scheduledStart": "2026-04-25", "scheduledEnd": "2026-04-26", "state": "executing" },
        { "id": "WO-3014", "operation": "Final assembly OP-40", "scheduledStart": "2026-04-26", "scheduledEnd": "2026-04-30", "state": "planned" }
      ],
      "materialConsumption": [
        { "itemCode": "PN-2042-RAW", "plannedQty": 5500, "actualQty": 5320, "lot": "LOT-2026-04" },
        { "itemCode": "PN-2042-PACK", "plannedQty": 5000, "actualQty": 3200, "lot": "LOT-PACK-2026-Q2" }
      ],
      "progressMetrics": { "completionPct": 64, "scrapRate": 0.8, "downtimePct": 3.2 },
      "relatedRecords": [
        { "resourceFamily": "customer-purchase-orders", "recordId": "CPO-2026-077", "label": "CPO-2026-077 customer order" },
        { "resourceFamily": "lots", "recordId": "LOT-2026-04", "label": "LOT-2026-04 raw material" },
        { "resourceFamily": "inspections", "recordId": "INSP-001", "label": "INSP-001 first-piece on WO-3013" },
        { "resourceFamily": "nonconformance-cases", "recordId": "NC-001", "label": "NC-001 dimensional NC on OP-30" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: another planner edited the schedule offline." },
    "partial_access": { "stateMessage": "Partial-access fixture.", "limitations": ["Material lots masked for cross-team operators.", "Customer order ref masked for current role."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture. Reload before scheduling decisions." }
  }
}
```

## STEP 6 — 9 fixture pages

Files (mirror CDOC pattern):
```text
authoritative-record-shell-jo-overview.html
authoritative-record-shell-jo-dispatch-readiness.html
authoritative-record-shell-jo-spawned-work-orders.html
authoritative-record-shell-jo-material-consumption.html
authoritative-record-shell-jo-progress.html
authoritative-record-shell-jo-related.html
authoritative-record-shell-jo-audit.html
authoritative-record-shell-jo-conflict.html
authoritative-record-shell-jo-partial-access.html
authoritative-record-shell-jo-degraded.html
authoritative-record-shell-jo-live-mode.html  (only if HMV4_LIVE_RESOURCE_REGISTRY exists)
```

Each inlines the fixture JSON and sets `window.HMV4_JO_RECORD_FIXTURE`.

## STEP 7 — E2E tests

Extend `module-template-v4.spec.ts`:
```ts
test('renders JO overview tab', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-overview.html');
  const root = page.locator('[data-hmv4-jo-record]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-route-class', 'AR');
  await expect(root).toHaveAttribute('data-resource-family', 'job-orders');
  await expect(root).toHaveAttribute('data-root-code', 'JO');
});

for (const tab of ['dispatch-readiness','spawned-work-orders','material-consumption','progress','related','audit']) {
  test(`renders JO ${tab} tab`, async ({ page }) => {
    await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-${tab}.html`);
    await expect(page.locator(`[data-hmv4-jo-panel="${tab}"]:not([hidden])`)).toBeVisible();
  });
}

test('JO spawned-work-orders tab links to WO records', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-spawned-work-orders.html');
  await expect(page.locator('a[href*="records/work-orders/WO-3011"]')).toBeVisible();
});

test('JO conflict state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-conflict.html');
  await expect(page.locator('[data-hmv4-jo-record]')).toHaveAttribute('data-fixture-state', 'conflict');
});

test('JO partial access', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-partial-access.html');
  await expect(page.locator('[data-hmv4-jo-partial]')).toBeVisible();
});

test('JO degraded no mutation', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-degraded.html');
  await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
});
```

Bridge spec:
```ts
test('jo bridge maps to AR with record context', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=jo&record_id=JO-2026-014');
  await expect(page.locator('[data-hmv4-bridge-result]')).toContainText('records/job-orders/JO-2026-014');
});
```

If live-api registry exists, add JO live-mode test mirroring NQCASE pattern.

## STEP 8 — Visual baselines (chromium + firefox + webkit)

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright test --project=chromium --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=firefox --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=webkit --update-snapshots module-template-v4-visual.spec.ts
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
rm -rf node_modules
```

## STEP 9 — All gates

```bash
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/70-module-template-v4-hydration.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS"
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden"
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v '//' && echo "FAIL hex" || echo "PASS no hex"
```

## STEP 10 — Commit

```bash
git add mom/scripts/portal/72-module-template-v4-bridge.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        mom/scripts/portal/70-module-template-v4-hydration.js \
        tests/e2e/module-template-v4*.spec.ts \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/ \
        tests/fixtures/module-template-v4/job-order-record-fixtures.json \
        tests/fixtures/module-template-v4/route-fixtures.json \
        tests/fixtures/module-template-v4/record-fixtures.json \
        tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-*.html \
        _reports/module-template-v4/S_SLICE9_JO_IMPLEMENTATION_REPORT.md

git commit -m "feat(module-template): add JO record shell prototype (Slice 9 — Phase B start)

First Phase B transactional slice. JO root, AR class.
7 tabs: overview, dispatch-readiness, spawned-work-orders,
material-consumption, progress, related, audit.

Mirrors CDOC pattern with transactional/operational shape:
job number + customer order ref, dispatch readiness flags,
spawned work-orders hierarchy, material consumption with lot
links, progress metrics. Bridge alias 'jo' constrained.

Wires JO into HMV4_LIVE_RESOURCE_REGISTRY when present.
Visual baselines for chromium + firefox + webkit."

git push -u origin codex/slice-9-jo-from-eco-qa
```

## DECISION

```text
JO_SLICE9_PASS_READY_FOR_QA
JO_SLICE9_PASS_WITH_WARNINGS
JO_SLICE9_FAIL_BLOCK_NEXT
```
