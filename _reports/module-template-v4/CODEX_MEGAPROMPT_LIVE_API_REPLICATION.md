# CODEX MEGAPROMPT — Live API Toggle Replication (CAPA + CDOC + INSP + BREL + ECO)

> Approval: `Proceed with live API toggle replication for governed records.`
> Branch: `codex/live-api-toggle-replication-phase3`
> **Run AFTER Slice 8 ECO merged. Replicates the NQCASE live-api pattern (ADR-0011) to 5 more EQMS-backed slices.**

---

## ROLE & CONTEXT

You are Codex local. The NQCASE live-api toggle was proven in Phase 2 (commit `0761c181`). Now replicate that pattern to **5 more governed records** (CAPA, CDOC, INSP, BREL, ECO) so all Phase A slices support the opt-in fixture↔live cutover.

Backend EQMS plural aliases for all 5 are already merged (Stream C.1 commit `d21d6462`):
- `/api/v1/capas/{id}` ← EqmsCapaController
- `/api/v1/controlled-documents/{id}` ← EqmsDocumentsController
- `/api/v1/inspections/{id}` ← EqmsInspectionController
- `/api/v1/batch-releases/{id}` ← EqmsBatchReleaseController
- `/api/v1/engineering-changes/{id}` ← EqmsEngineeringChangeController

**Pre-production**. Read-only. Mutation buttons remain disabled in both modes. Default OFF for all 5 toggles.

## REFERENCE: NQCASE PATTERN

Read existing implementation:
```bash
grep -nE "fetchLiveNonconformance|adaptLiveNcToFixtureShape|HMV4_LIVE_API_ENABLED|readLiveApiFlag" mom/scripts/portal/70-module-template-v4-hydration.js | head -10
cat docs/adr/0011-live-api-toggle-mechanism.md
cat tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html
cat tests/e2e/module-template-v4-live-api.spec.ts
```

You will replicate this exactly with one extension: a **single shared adapter** that handles all 6 governed records (NQCASE + 5 new) instead of 6 copy-paste functions.

## PRE-FLIGHT

```bash
git fetch origin && git checkout main && git pull --ff-only
git status --short  # Expected empty
# Verify NQCASE live api in place
grep -c "HMV4_LIVE_API_ENABLED\|fetchLiveNonconformance" mom/scripts/portal/70-module-template-v4-hydration.js  # Expected: > 0
# Verify all 5 record shells exist
grep -cE "renderCapaRecord|renderCdocRecord|renderInspRecord|renderBrelRecord|renderEcoRecord" mom/scripts/portal/73-module-template-v4-renderers.js  # Expected: 5
# Verify EQMS aliases exist
grep -cE "/api/v1/(capas|controlled-documents|inspections|batch-releases|engineering-changes)" mom/api/routes/rest-routes.php  # Expected: 5+
git checkout -b codex/live-api-toggle-replication-phase3
```

If fail → `LIVE_API_REPLICATION_PREFLIGHT_FAIL_<reason>`.

## ALLOWED

```text
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/73-module-template-v4-renderers.js (only fixture-shape exposure if needed)
tests/e2e/module-template-v4-live-api.spec.ts (extend)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-live-mode.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-live-mode.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-live-mode.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-live-mode.html (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-eco-live-mode.html (NEW)
docs/adr/0012-live-api-replication-pattern.md (NEW)
_reports/module-template-v4/S_LIVE_API_REPLICATION_REPORT.md (NEW)
```

## FORBIDDEN

```text
mom/portal.html (no live mode default in committed file)
mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/qms-data/**, mom/api/**
HMV4_PREVIEW_ENABLED=true in any committed file
HMV4_LIVE_API_ENABLED=true in mom/portal.html
Mutation: NO POST/PATCH/DELETE in live-mode adapter
```

## STEP 1 — Refactor to shared adapter (ADR-0012 pattern)

In `mom/scripts/portal/70-module-template-v4-hydration.js`, replace the per-resource fetch functions with a **resource registry**:

```js
// Live API toggle (ADR-0011 + ADR-0012)
var HMV4_LIVE_RESOURCE_REGISTRY = {
  'nonconformance-cases': {
    canonicalPath: '/api/v1/nonconformance-cases',
    fixtureGlobal: 'HMV4_NONCONFORMANCE_CASE_FIXTURE',
    adapt: function(live){
      // existing adaptLiveNcToFixtureShape inlined
      if(!live) return null;
      return {
        recordId: live.id || live.record_id || live.code,
        rootCode: 'NQCASE',
        title: live.title || live.summary,
        subtype: live.subtype || live.kind,
        status: live.state || live.status,
        severity: live.severity,
        state: 'live',
        freshness: 'live_current',
        owner: (live.owner && (live.owner.name || live.owner)) || null,
        source: live.source,
        part: live.part_number || live.part,
        lot: live.lot,
        workOrder: live.work_order_id || live.workOrder,
        stateMessage: 'Live API mode. Read-only display.',
        lifecycle: live.lifecycle || []
      };
    }
  },
  'capas': {
    canonicalPath: '/api/v1/capas',
    fixtureGlobal: 'HMV4_CAPA_RECORD_FIXTURE',
    adapt: function(live){
      if(!live) return null;
      return {
        recordId: live.id || live.code,
        rootCode: 'CAPA',
        title: live.title || live.summary,
        severity: live.severity,
        state: live.state || 'live',
        freshness: 'live_current',
        owner: (live.owner && (live.owner.name || live.owner)) || null,
        dueDate: live.due_date || live.dueDate,
        linkedNcId: live.linked_nc_id || live.linkedNcId,
        stateMessage: 'Live API mode. Read-only display.',
        lifecycle: live.lifecycle || [],
        rootCauses: live.root_causes || live.rootCauses || [],
        actionPlan: live.action_plan || live.actionPlan || [],
        verifications: live.verifications || [],
        effectivenessChecks: live.effectiveness_checks || [],
        relatedRecords: live.related_records || []
      };
    }
  },
  'controlled-documents': {
    canonicalPath: '/api/v1/controlled-documents',
    fixtureGlobal: 'HMV4_CDOC_RECORD_FIXTURE',
    adapt: function(live){
      if(!live) return null;
      return {
        recordId: live.id || live.code,
        rootCode: 'CDOC',
        docCode: live.doc_code || live.docCode,
        title: live.title,
        category: live.category,
        classification: live.classification,
        state: live.state || 'live',
        currentRevision: live.current_revision || live.currentRevision,
        effectiveDate: live.effective_date || live.effectiveDate,
        owner: (live.owner && (live.owner.name || live.owner)) || null,
        contentSummary: live.content_summary || live.contentSummary,
        freshness: 'live_current',
        stateMessage: 'Live API mode. Read-only display.',
        lifecycle: live.lifecycle || [],
        revisions: live.revisions || [],
        controlledCopies: live.controlled_copies || live.controlledCopies || [],
        effectivity: live.effectivity || {},
        relatedRecords: live.related_records || []
      };
    }
  },
  'inspections': {
    canonicalPath: '/api/v1/inspections',
    fixtureGlobal: 'HMV4_INSP_RECORD_FIXTURE',
    adapt: function(live){
      if(!live) return null;
      return {
        recordId: live.id || live.code,
        rootCode: 'INSP',
        title: live.title,
        inspectionSubtype: live.subtype || live.inspection_subtype,
        state: live.state || 'live',
        severity: live.severity,
        workOrderId: live.work_order_id,
        lotId: live.lot_id,
        partNumber: live.part_number,
        supplier: live.supplier,
        freshness: 'live_current',
        stateMessage: 'Live API mode. Read-only display.',
        lifecycle: live.lifecycle || [],
        characteristics: live.characteristics || [],
        sampleResults: live.sample_results || live.sampleResults || [],
        nonconformanceFlags: live.nc_flags || live.nonconformanceFlags || [],
        evidence: live.evidence || [],
        relatedRecords: live.related_records || []
      };
    }
  },
  'batch-releases': {
    canonicalPath: '/api/v1/batch-releases',
    fixtureGlobal: 'HMV4_BREL_RECORD_FIXTURE',
    adapt: function(live){
      if(!live) return null;
      return {
        recordId: live.id || live.code,
        rootCode: 'BREL',
        title: live.title,
        batchId: live.batch_id || live.batchId,
        productCode: live.product_code,
        lotId: live.lot_id,
        manufacturedAt: live.manufactured_at,
        manufactureLine: live.manufacture_line,
        state: live.state || 'live',
        releaseDecision: live.release_decision || live.releaseDecision || 'pending',
        freshness: 'live_current',
        stateMessage: 'Live API mode. 2-person e-sign required for release.',
        lifecycle: live.lifecycle || [],
        approvers: live.approvers || [],
        releasePackage: live.release_package || {},
        qualityEvidence: live.quality_evidence || {},
        genealogyRoot: live.genealogy_root,
        shipmentReadiness: live.shipment_readiness || {},
        relatedRecords: live.related_records || []
      };
    }
  },
  'engineering-changes': {
    canonicalPath: '/api/v1/engineering-changes',
    fixtureGlobal: 'HMV4_ECO_RECORD_FIXTURE',
    adapt: function(live){
      if(!live) return null;
      return {
        recordId: live.id || live.code,
        rootCode: 'ECO',
        title: live.title,
        changeType: live.change_type,
        changeReason: live.change_reason,
        state: live.state || 'live',
        severity: live.severity,
        proposer: live.proposer,
        approver: live.approver,
        freshness: 'live_current',
        stateMessage: 'Live API mode. Read-only display.',
        lifecycle: live.lifecycle || [],
        changeScope: live.change_scope || {},
        impactAssessment: live.impact_assessment || {},
        implementationPlan: live.implementation_plan || {},
        trainingImpact: live.training_impact || {},
        relatedRecords: live.related_records || []
      };
    }
  }
};

function fetchLiveResource(resourceFamily, recordId){
  var def = HMV4_LIVE_RESOURCE_REGISTRY[resourceFamily];
  if(!def || !recordId) return Promise.reject(new Error('unsupported resource: '+resourceFamily));
  return fetch(def.canonicalPath + '/' + encodeURIComponent(recordId), {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  }).then(function(res){
    if(!res.ok) throw new Error('live api status '+res.status);
    return res.json();
  }).then(function(payload){
    return (payload && payload.data) ? payload.data : payload;
  });
}

window.Hmv4LiveApi = Object.assign(window.Hmv4LiveApi || {}, {
  enabled: readLiveApiFlag,
  registry: HMV4_LIVE_RESOURCE_REGISTRY,
  fetchResource: fetchLiveResource
});
```

## STEP 2 — Generic live-mode dispatcher

In the hydration adapter where AR records are dispatched, replace the NQCASE-specific block with:

```js
if(route.routeClass === 'AR' && route.params && readLiveApiFlag()){
  var resourceFamily = route.params.resource_family;
  var recordId = route.params.record_id;
  var def = HMV4_LIVE_RESOURCE_REGISTRY[resourceFamily];

  if(def){
    content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--loading" '+
      'data-hmv4-live-api-loading="true" data-hmv4-resource-family="'+resourceFamily+'" data-hmv4-record-id="'+recordId+'">'+
      '<p>Loading from '+def.canonicalPath+'/'+recordId+'…</p></article>';

    fetchLiveResource(resourceFamily, recordId)
      .then(function(live){
        var adapted = def.adapt(live);
        var fixturePayload = {};
        fixturePayload.records = {};
        fixturePayload.records[recordId] = adapted;
        window[def.fixtureGlobal] = fixturePayload;
        var html = window.Hmv4Renderers.renderRoute(route);
        content.innerHTML = html;
        // Mark as live
        content.querySelectorAll('[data-hmv4-'+resourceFamily.replace('-','')+'-record], [data-hmv4-nonconformance-record], [data-hmv4-capa-record], [data-hmv4-cdoc-record], [data-hmv4-insp-record], [data-hmv4-brel-record], [data-hmv4-eco-record]').forEach(function(root){
          root.setAttribute('data-hmv4-source', 'live-api');
          root.setAttribute('data-fixture-state', 'live');
        });
      })
      .catch(function(err){
        content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--error" '+
          'data-hmv4-live-api-error="true" data-hmv4-resource-family="'+resourceFamily+'" data-hmv4-record-id="'+recordId+'">'+
          '<header class="hmv4-record-identity"><h1 class="hmv4-record-title">'+recordId+' &mdash; live API unavailable</h1></header>'+
          '<p class="hmv4-feedback" data-feedback-state="warning" role="status">Live API unavailable: '+
          (err && err.message ? String(err.message) : 'unknown')+'. Refresh to retry, or remove ?hmv4-live-api=1.</p>'+
          '</article>';
      });
    return;
  }
}
```

## STEP 3 — Create 5 live-mode fixture pages

Mirror `authoritative-record-shell-nc-live-mode.html` for each new resource family. Each page:
- Sets `<body data-hmv4-live-api="true">`
- Provides route fixture metadata with `params.resource_family` and `params.record_id`
- Sets `window.HMV4_LIVE_API_ENABLED = true`
- Does NOT bundle any record fixture JSON (live mode fetches)
- Loads HMV4 scripts in standard order

Files:
- `authoritative-record-shell-capa-live-mode.html` (CAPA-001)
- `authoritative-record-shell-cdoc-live-mode.html` (CDOC-001)
- `authoritative-record-shell-insp-live-mode.html` (INSP-001)
- `authoritative-record-shell-brel-live-mode.html` (BREL-001)
- `authoritative-record-shell-eco-live-mode.html` (ECO-2026-014)

## STEP 4 — Extend E2E spec

Add to `tests/e2e/module-template-v4-live-api.spec.ts`:

```ts
const liveModePages = [
  { page: 'authoritative-record-shell-nc-live-mode.html', recordRoot: '[data-hmv4-nonconformance-record]' },     // existing
  { page: 'authoritative-record-shell-capa-live-mode.html', recordRoot: '[data-hmv4-capa-record]' },
  { page: 'authoritative-record-shell-cdoc-live-mode.html', recordRoot: '[data-hmv4-cdoc-record]' },
  { page: 'authoritative-record-shell-insp-live-mode.html', recordRoot: '[data-hmv4-insp-record]' },
  { page: 'authoritative-record-shell-brel-live-mode.html', recordRoot: '[data-hmv4-brel-record]' },
  { page: 'authoritative-record-shell-eco-live-mode.html', recordRoot: '[data-hmv4-eco-record]' },
];

for (const { page, recordRoot } of liveModePages) {
  test(`live mode ${page}: error fallback when backend 401`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${page}`);
    await pw.waitForFunction(
      () => !!document.querySelector('[data-hmv4-live-api-error="true"], [data-hmv4-source="live-api"]'),
      { timeout: 10_000 }
    );
    const errorVisible = await pw.locator('[data-hmv4-live-api-error="true"]').isVisible().catch(() => false);
    const liveVisible = await pw.locator('[data-hmv4-source="live-api"]').isVisible().catch(() => false);
    expect(errorVisible || liveVisible).toBeTruthy();
  });

  test(`live mode ${page}: never enables mutation`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${page}`);
    await pw.waitForFunction(
      () => !!document.querySelector('[data-hmv4-live-api-error="true"], [data-hmv4-source="live-api"]'),
      { timeout: 10_000 }
    );
    await expect(pw.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });
}
```

## STEP 5 — Author ADR-0012

Create `docs/adr/0012-live-api-replication-pattern.md`:

```markdown
# ADR 0012: Live API replication pattern (resource registry)

## Status
Accepted (2026-04-25)

## Context
ADR-0011 introduced live API toggle for NQCASE. As more EQMS-backed
slices land (CAPA, CDOC, INSP, BREL, ECO), copy-pasting per-resource
fetch+adapt functions accumulates 6× boilerplate. A single registry
keyed by resource family eliminates duplication.

## Decision
HMV4 hydration uses `HMV4_LIVE_RESOURCE_REGISTRY` keyed by resource
family. Each entry declares: `canonicalPath`, `fixtureGlobal`, `adapt(live)`.
Adding a new live-mode-supported root = adding one registry entry.

## Consequences
+ Single dispatcher for all live-mode routes
+ Consistent error fallback UI
+ ADR/governance overhead reduced
- Adapter functions per root still need maintenance as backend evolves
- Generic dispatcher must handle all rendering edge cases

## Alternatives
1. Per-root fetch+dispatch functions (rejected: 6× boilerplate)
2. Backend-side fixture-to-live shape harmonization (rejected: requires backend changes; out of frontend scope)

## References
- ADR-0011 NQCASE live API toggle (predecessor)
- mom/scripts/portal/70-module-template-v4-hydration.js
- _reports/module-template-v4/CODEX_MEGAPROMPT_LIVE_API_REPLICATION.md
```

## STEP 6 — Gates

```bash
# Standard E2E (fixture mode) — must STILL pass, no regression
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
EXIT=$?
rm -rf node_modules
cd ../..
[ $EXIT -eq 0 ] && echo "PASS standard E2E" || echo "FAIL standard E2E"

# Static
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js

# Forbidden
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden"

# No HMV4_LIVE_API_ENABLED=true in portal.html
grep -nE 'HMV4_LIVE_API_ENABLED\s*=\s*true' mom/portal.html && echo "REVIEW" || echo "PASS no live-api default in portal"
```

## STEP 7 — Commit

```bash
git add mom/scripts/portal/70-module-template-v4-hydration.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4-live-api.spec.ts \
        tests/fixtures/module-template-v4/pages/authoritative-record-shell-{capa,cdoc,insp,brel,eco}-live-mode.html \
        docs/adr/0012-live-api-replication-pattern.md \
        _reports/module-template-v4/S_LIVE_API_REPLICATION_REPORT.md

git commit -m "feat(hmv4): replicate live API toggle to CAPA/CDOC/INSP/BREL/ECO (ADR-0012)

Refactors NQCASE-specific live-mode fetch+adapt into a resource
registry. Adds 5 new resource entries: capas, controlled-documents,
inspections, batch-releases, engineering-changes. Each canonical
plural-form REST alias (Stream C.1) is consumed via the same
generic dispatcher.

Default mode still fixture. Mutation buttons remain disabled in both
modes. Per ADR-0012."

git push -u origin codex/live-api-toggle-replication-phase3
```

## DECISION

```text
LIVE_API_REPLICATION_PASS_READY_FOR_REVIEW
LIVE_API_REPLICATION_PASS_WITH_WARNINGS
LIVE_API_REPLICATION_FAIL_BLOCK_NEXT
```
