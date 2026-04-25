# CODEX MEGAPROMPT — Slice 5 CDOC Record Shell (Governed-Content)

> Approval phrase: `Proceed with CDOC Record Shell fifth-slice prototype implementation.`
> Branch: `codex/slice-5-cdoc-from-capa-qa`

---

## ROLE & CONTEXT

You are Codex local on `sanhvo86-hesem/mom`. Slices 1-4 + nav shell + Phase 2 (live-api toggle for NQCASE, transactional REST C.2, cross-browser baselines) all merged on main. Backend EQMS plural alias `/api/v1/controlled-documents` exists from Stream C.1.

You are implementing **Slice 5 = CDOC Record Shell** (CDOC root, AR governed-content class). This is the FIRST governed-content record (vs governed-quality NQCASE/CAPA, governed-process Dispatch, qualification matrix TRAIN). The pattern adds **document-specific concepts**: revision history, controlled copies, effective date, supersession chain, related records.

**Pre-production**. No mutation. No `mom/qms-data` promotion. Forbidden file list per ADR-0004.

## PRE-FLIGHT

```bash
git fetch origin && git checkout main && git pull --ff-only
git status --short  # Expected empty
grep -c "renderCapaRecord\|renderNonconformanceRecord" mom/scripts/portal/73-module-template-v4-renderers.js  # Expected: >= 2
ls tests/fixtures/module-template-v4/capa-record-fixtures.json  # Reference template
git checkout -b codex/slice-5-cdoc-from-capa-qa
```

If fail → `CDOC_PREFLIGHT_FAIL_<reason>`.

## ALLOWED

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-bridge.spec.ts
tests/e2e/module-template-v4-axe.spec.ts (extend list)
tests/fixtures/module-template-v4/cdoc-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-*.html (NEW × 11)
_reports/module-template-v4/S_SLICE5_CDOC_IMPLEMENTATION_REPORT.md (NEW)
```

## FORBIDDEN (per ADR-0004)

```text
mom/portal.html, mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css,
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js,
mom/qms-data/**, mom/api/**
```

## TARGET CONTRACT

### Route
```text
/ops/records/controlled-documents/CDOC-001?tab=overview
```

### Required attributes on `[data-hmv4-cdoc-record]`
```text
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="controlled-documents"
data-root-code="CDOC"
data-record-id="CDOC-001"
data-query-tab="<tab>"
```

### CDOC tabs (8 — different from CAPA/NQCASE because document-specific)
```text
overview | content | revisions | controlled-copies | effectivity | related | audit | signatures
```

### CDOC lifecycle states (per Step 2 workflow master)
```text
draft → in-review → approved → released → effective → superseded (terminal) | obsolete (terminal)
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="cdoc-submit-for-review"
data-hmv4-mutation-intent="cdoc-approve"
data-hmv4-mutation-intent="cdoc-release"
data-hmv4-mutation-intent="cdoc-supersede"
data-hmv4-mutation-intent="cdoc-obsolete"
data-hmv4-mutation-intent="cdoc-acknowledge-controlled-copy"
data-hmv4-mutation-intent="cdoc-esign"
```

## STEP 1 — Reference existing pattern

Read CAPA renderer as primary template:
```bash
sed -n '/function renderCapaRecord/,/^  }$/p' mom/scripts/portal/73-module-template-v4-renderers.js | head -120
sed -n '/function renderCapaPanel/,/^  }$/p' mom/scripts/portal/73-module-template-v4-renderers.js | head -80
cat tests/fixtures/module-template-v4/capa-record-fixtures.json
cat tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-overview.html
```

## STEP 2 — Implement `renderCdocRecord(route)` and `renderCdocPanel(tab, record)`

CDOC-specific data shape:
```js
record = {
  recordId, rootCode: 'CDOC', title, docCode,           // identity
  category,                                              // SOP|MAN|FRM|POL|SPEC|...
  classification,                                        // public|internal|confidential|restricted
  state,                                                 // draft|in-review|approved|released|effective|superseded|obsolete
  currentRevision, effectiveDate, supersededBy, supersedes,
  owner, approver, approvedAt, releasedAt,
  contentSummary,                                        // overview tab
  revisions: [{rev, date, summary, approver}],          // revisions tab
  controlledCopies: [{holder, location, copyId, acknowledgedAt}], // controlled-copies tab
  effectivity: {scope, sites, processes, validFrom, validTo},     // effectivity tab
  relatedRecords: [...],                                 // related tab
  freshness, stateMessage, lifecycle: [[name, state]]
}
```

Add the renderer (mirror CAPA structure):

```js
var cdocTabs = ['overview','content','revisions','controlled-copies','effectivity','related','audit','signatures'];

function normaliseCdocTab(tab){ return cdocTabs.indexOf(tab) >= 0 ? tab : 'overview'; }

function renderCdocPanel(tab, record){
  if(tab === 'overview') {
    return '<h2>Overview</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Doc code</dt><dd>'+esc(record.docCode || '—')+'</dd>'+
        '<dt>Category</dt><dd>'+esc(record.category || '—')+'</dd>'+
        '<dt>Classification</dt><dd>'+esc(record.classification || '—')+'</dd>'+
        '<dt>Current revision</dt><dd>'+esc(record.currentRevision || '—')+'</dd>'+
        '<dt>Effective date</dt><dd>'+esc(record.effectiveDate || '—')+'</dd>'+
        '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
      '</dl>'+
      '<p>'+esc(record.contentSummary || 'Read-only overview fixture.')+'</p>';
  }
  if(tab === 'content') {
    return '<h2>Content preview</h2>'+
      '<p class="hmv4-text-2">Document body rendering deferred to live integration. This fixture displays a placeholder.</p>'+
      '<div class="hmv4-card hmv4-card--document-preview">'+
        '<h3>'+esc(record.title || 'Document content')+'</h3>'+
        '<p>'+esc(record.contentSummary || '—')+'</p>'+
      '</div>';
  }
  if(tab === 'revisions') {
    var revs = (record.revisions || []);
    if(revs.length === 0) return '<h2>Revision history</h2><p class="hmv4-text-2">No revisions recorded.</p>';
    return '<h2>Revision history</h2>'+
      '<table class="hmv4-data-table"><thead><tr><th>Rev</th><th>Date</th><th>Summary</th><th>Approver</th></tr></thead><tbody>'+
      revs.map(function(r){return '<tr><td>'+esc(r.rev)+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.summary)+'</td><td>'+esc(r.approver)+'</td></tr>';}).join('')+
      '</tbody></table>';
  }
  if(tab === 'controlled-copies') {
    var copies = (record.controlledCopies || []);
    if(copies.length === 0) return '<h2>Controlled copies</h2><p class="hmv4-text-2">No controlled copies issued.</p>';
    return '<h2>Controlled copies</h2>'+
      '<table class="hmv4-data-table"><thead><tr><th>Copy ID</th><th>Holder</th><th>Location</th><th>Acknowledged</th></tr></thead><tbody>'+
      copies.map(function(c){return '<tr><td>'+esc(c.copyId)+'</td><td>'+esc(c.holder)+'</td><td>'+esc(c.location)+'</td><td>'+esc(c.acknowledgedAt || '—')+'</td></tr>';}).join('')+
      '</tbody></table>';
  }
  if(tab === 'effectivity') {
    var eff = record.effectivity || {};
    return '<h2>Effectivity scope</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Scope</dt><dd>'+esc(eff.scope || '—')+'</dd>'+
        '<dt>Sites</dt><dd>'+esc((eff.sites || []).join(', ') || '—')+'</dd>'+
        '<dt>Processes</dt><dd>'+esc((eff.processes || []).join(', ') || '—')+'</dd>'+
        '<dt>Valid from</dt><dd>'+esc(eff.validFrom || '—')+'</dd>'+
        '<dt>Valid to</dt><dd>'+esc(eff.validTo || '—')+'</dd>'+
      '</dl>';
  }
  if(tab === 'related') {
    var related = record.relatedRecords || [];
    if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
    return '<h2>Related records</h2><ul class="hmv4-list">'+
      related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('')+
      '</ul>';
  }
  if(tab === 'audit') return '<h2>Audit trail</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/controlled-documents/{id}/audit.</p>';
  if(tab === 'signatures') return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder. e-Signatures (21 CFR Part 11).</p>';
  return '<p>Unknown tab.</p>';
}

function renderCdocRecord(route){
  var p = route.params || {};
  var q = route.query || {};
  var tab = normaliseCdocTab(q.tab || 'overview');
  var recordId = p.record_id || 'CDOC-001';

  var fixture = window.HMV4_CDOC_RECORD_FIXTURE || readJsonFixture('[data-hmv4-cdoc-record-fixture]') || {};
  var records = fixture.records || {};
  var record = records[recordId] || {
    recordId: recordId, rootCode: 'CDOC',
    docCode: 'qms-sop-100', title: 'Process Validation SOP',
    category: 'SOP', classification: 'internal',
    state: 'effective', currentRevision: 'B',
    effectiveDate: '2026-01-15', owner: 'Quality Manager',
    contentSummary: 'Procedure for IQ/OQ/PQ validation of new manufacturing processes.',
    freshness: 'fixture_current',
    stateMessage: 'Read-only prototype. Document mutation must remain outside this fixture.',
    lifecycle: [['draft','complete'],['in-review','complete'],['approved','complete'],['released','complete'],['effective','current'],['superseded','locked'],['obsolete','locked']],
    revisions: [],
    controlledCopies: [],
    effectivity: {},
    relatedRecords: []
  };
  record.rootCode = 'CDOC'; record.recordId = recordId;

  var state = (q.state || record.state || 'effective');
  var stateOverlay = (fixture.states || {})[state] || null;
  var freshness = (stateOverlay && stateOverlay.freshness) || record.freshness || 'fixture_current';
  var stateMessage = (stateOverlay && stateOverlay.stateMessage) || record.stateMessage || '';
  var partialAccessLimitations = (stateOverlay && stateOverlay.limitations) || [];

  var head = '<header class="hmv4-record-identity">'+
    '<h1 class="hmv4-record-title">'+esc(record.docCode || recordId)+' &mdash; '+esc(record.title)+'</h1>'+
    '<dl class="hmv4-meta-grid">'+
      '<dt>Revision</dt><dd>'+esc(record.currentRevision || '')+'</dd>'+
      '<dt>State</dt><dd>'+esc(record.state || state)+'</dd>'+
      '<dt>Effective</dt><dd>'+esc(record.effectiveDate || '')+'</dd>'+
      '<dt>Owner</dt><dd>'+esc(record.owner || '')+'</dd>'+
    '</dl>'+
    (stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status">'+esc(stateMessage)+'</p>' : '')+
  '</header>';

  var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" aria-label="CDOC lifecycle">'+
    (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1])+'">'+esc(s[0])+'</li>';}).join('')+
  '</ol>';

  var partialNotice = (state === 'partial_access' && partialAccessLimitations.length)
    ? '<section class="hmv4-feedback" data-feedback-state="warning" data-hmv4-cdoc-partial><p>Partial access:</p><ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
    : '';

  var disabled = '<section class="hmv4-toolbar" aria-label="Disabled launchers" data-hmv4-cdoc-launchers>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="cdoc-submit-for-review">Submit for review</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="cdoc-approve">Approve</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="cdoc-release">Release</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="cdoc-supersede">Supersede</button>'+
    '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="cdoc-esign">e-Sign</button>'+
    '<span class="hmv4-feedback" data-feedback-state="warning" role="note">Mutation actions are disabled in this read-only prototype.</span>'+
  '</section>';

  return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--cdoc" data-hmv4-cdoc-record data-route-class="AR" data-resource-family="controlled-documents" data-root-code="CDOC" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
    head + lifecycleStrip + partialNotice + disabled +
    '<div class="hmv4-tablist" role="tablist" aria-label="Controlled document details">'+cdocTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
    cdocTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-cdoc-panel="'+esc(t)+'">'+renderCdocPanel(t, record)+'</section>';}).join('')+
  '</article>';
}
```

Wire into renderRoute (mirror CAPA dispatch):
```js
if(p && p.resource_family === 'controlled-documents') return renderCdocRecord(route);
```

Expose:
```js
window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, { renderCdocRecord: renderCdocRecord });
```

## STEP 3 — Bridge alias `cdoc`

Verify in `72-module-template-v4-bridge.js`. Add if missing:
```js
cdoc: u('ML', { domain: 'quality-compliance', module: 'controlled-documents' }),
```
Plus context-backed:
```js
if(key === 'cdoc' && recordId){
  return { policy: 'redirect_record_context_only',
    url: u('AR', { resource_family: 'controlled-documents', record_id: recordId }, { tab: (context && context.tab) || 'overview' }) };
}
```

## STEP 4 — Fixture JSON

Create `tests/fixtures/module-template-v4/cdoc-record-fixtures.json` mirroring CAPA pattern:

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "controlled-documents",
  "rootCode": "CDOC",
  "records": {
    "CDOC-001": {
      "recordId": "CDOC-001",
      "rootCode": "CDOC",
      "docCode": "qms-sop-100",
      "title": "Process Validation SOP",
      "category": "SOP",
      "classification": "internal",
      "state": "effective",
      "currentRevision": "B",
      "effectiveDate": "2026-01-15",
      "owner": "Quality Manager",
      "approver": "VP Quality",
      "approvedAt": "2026-01-10",
      "releasedAt": "2026-01-12",
      "contentSummary": "Procedure for IQ/OQ/PQ validation of new manufacturing processes. Applies to all production lines.",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype. Document mutation must remain outside this fixture.",
      "lifecycle": [
        ["draft","complete"],["in-review","complete"],["approved","complete"],
        ["released","complete"],["effective","current"],["superseded","locked"],["obsolete","locked"]
      ],
      "revisions": [
        { "rev": "A", "date": "2025-06-10", "summary": "Initial release", "approver": "VP Quality" },
        { "rev": "B", "date": "2026-01-10", "summary": "Updated PQ acceptance criteria per FDA guidance", "approver": "VP Quality" }
      ],
      "controlledCopies": [
        { "copyId": "CC-001", "holder": "Production Line 1 Supervisor", "location": "Line 1 control booth", "acknowledgedAt": "2026-01-15" },
        { "copyId": "CC-002", "holder": "Production Line 2 Supervisor", "location": "Line 2 control booth", "acknowledgedAt": "2026-01-15" },
        { "copyId": "CC-003", "holder": "QC Lab", "location": "QC Lab Wall", "acknowledgedAt": null }
      ],
      "effectivity": {
        "scope": "All production validation activities",
        "sites": ["Plant 1", "Plant 2"],
        "processes": ["Injection molding", "CNC machining", "Assembly"],
        "validFrom": "2026-01-15",
        "validTo": null
      },
      "relatedRecords": [
        { "resourceFamily": "engineering-changes", "recordId": "ECO-2026-014", "label": "ECO-2026-014 process update driving Rev B" },
        { "resourceFamily": "training-records", "recordId": "TR-7050", "label": "TR-7050 Process Validation training" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict detected. A newer revision is in review." },
    "partial_access": { "stateMessage": "Partial-access fixture. Some controlled-copy holders masked.", "limitations": ["Holder names masked for cross-site copies.", "Effectivity sites masked for current role."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded/offline fixture. Refresh from authority before acting." }
  }
}
```

## STEP 5 — 11 fixture pages

Use NQCASE/CAPA pattern. Files:
- `authoritative-record-shell-cdoc-overview.html`
- `authoritative-record-shell-cdoc-content.html`
- `authoritative-record-shell-cdoc-revisions.html`
- `authoritative-record-shell-cdoc-controlled-copies.html`
- `authoritative-record-shell-cdoc-effectivity.html`
- `authoritative-record-shell-cdoc-related.html`
- `authoritative-record-shell-cdoc-audit.html`
- `authoritative-record-shell-cdoc-signatures.html`
- `authoritative-record-shell-cdoc-conflict.html`
- `authoritative-record-shell-cdoc-partial-access.html`
- `authoritative-record-shell-cdoc-degraded.html`

Each inlines the fixture JSON and sets `window.HMV4_CDOC_RECORD_FIXTURE`.

## STEP 6 — E2E tests

Extend `tests/e2e/module-template-v4.spec.ts`:
```ts
test('renders CDOC overview tab', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-overview.html');
  const root = page.locator('[data-hmv4-cdoc-record]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-route-class', 'AR');
  await expect(root).toHaveAttribute('data-resource-family', 'controlled-documents');
  await expect(root).toHaveAttribute('data-root-code', 'CDOC');
});

for (const tab of ['content','revisions','controlled-copies','effectivity','related','audit','signatures']) {
  test(`renders CDOC ${tab} tab`, async ({ page }) => {
    await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-${tab}.html`);
    await expect(page.locator(`[data-hmv4-cdoc-panel="${tab}"]:not([hidden])`)).toBeVisible();
  });
}

test('CDOC conflict state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-conflict.html');
  await expect(page.locator('[data-hmv4-cdoc-record]')).toHaveAttribute('data-fixture-state', 'conflict');
});
test('CDOC partial access', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-partial-access.html');
  await expect(page.locator('[data-hmv4-cdoc-partial]')).toBeVisible();
});
test('CDOC degraded no mutation', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-degraded.html');
  await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
});
```

Extend bridge spec:
```ts
test('cdoc bridge maps to AR with record context', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/bridge-alias.html?alias=cdoc&record_id=CDOC-001');
  await expect(page.locator('[data-hmv4-bridge-result]')).toContainText('records/controlled-documents/CDOC-001');
});
```

Extend axe spec to add 11 new pages.

## STEP 7 — Visual baselines (chromium + firefox + webkit if browsers installed)

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright test --project=chromium --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=firefox --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=webkit --update-snapshots module-template-v4-visual.spec.ts
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
rm -rf node_modules
```

## STEP 8 — Gates

```bash
node --check mom/scripts/portal/73-module-template-v4-renderers.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS"
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden"
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v '//' && echo "FAIL hex" || echo "PASS no hex"
```

## STEP 9 — Generate report + commit

`_reports/module-template-v4/S_SLICE5_CDOC_IMPLEMENTATION_REPORT.md` mirroring CAPA report.

```bash
git add mom/scripts/portal/72-module-template-v4-bridge.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4*.spec.ts \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/ \
        tests/fixtures/module-template-v4/cdoc-record-fixtures.json \
        tests/fixtures/module-template-v4/route-fixtures.json \
        tests/fixtures/module-template-v4/record-fixtures.json \
        tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-*.html \
        _reports/module-template-v4/S_SLICE5_CDOC_IMPLEMENTATION_REPORT.md

git commit -m "feat(module-template): add CDOC record shell prototype (Slice 5)

Mirrors CAPA Slice 4 pattern adapted for governed-content (CDOC root).
8 tabs: overview/content/revisions/controlled-copies/effectivity/
related/audit/signatures. Document-specific concepts: revision
history, controlled-copy distribution, effectivity scope.

Bridge alias 'cdoc' constrained to context-backed mapping.
Visual baselines for chromium + firefox + webkit."

git push -u origin codex/slice-5-cdoc-from-capa-qa
```

## DECISION

```text
CDOC_SLICE5_PASS_READY_FOR_QA
CDOC_SLICE5_PASS_WITH_WARNINGS
CDOC_SLICE5_FAIL_BLOCK_NEXT
```
