# CODEX MEGAPROMPT — Slice 6 INSP Record Shell (DIFFERENTIAL)

> Approval: `Proceed with INSP Record Shell sixth-slice prototype implementation.`
> Branch: `codex/slice-6-insp-from-cdoc-qa`
> **Run AFTER Slice 5 CDOC merged into main.**

---

## DIFFERENTIAL FROM CDOC SLICE 5

This slice **mirrors `CODEX_MEGAPROMPT_SLICE5_CDOC_RECORD_SHELL.md`** with these substitutions:

| Slot | CDOC | INSP |
|---|---|---|
| Root code | CDOC | INSP |
| Resource family | controlled-documents | inspections |
| Frozen route | `/ops/records/controlled-documents/CDOC-001` | `/ops/records/inspections/INSP-001` |
| Renderer fn | `renderCdocRecord`/`renderCdocPanel` | `renderInspRecord`/`renderInspPanel` |
| Fixture JSON | `cdoc-record-fixtures.json` | `inspection-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-cdoc-` | `authoritative-record-shell-insp-` |
| Bridge alias | `cdoc` | `insp` (or `iqc` for legacy alias support) |
| Branch | `codex/slice-5-cdoc-from-capa-qa` | `codex/slice-6-insp-from-cdoc-qa` |
| Container class | `hmv4-record-shell--cdoc` | `hmv4-record-shell--insp` |
| Data attr root | `data-hmv4-cdoc-record` | `data-hmv4-insp-record` |
| Panel attr | `data-hmv4-cdoc-panel` | `data-hmv4-insp-panel` |
| Launchers attr | `data-hmv4-cdoc-launchers` | `data-hmv4-insp-launchers` |
| Partial attr | `data-hmv4-cdoc-partial` | `data-hmv4-insp-partial` |

## INSP-SPECIFIC CONTRACT

### Tabs (7 — different from CDOC)
```text
overview | sample-results | nonconformance-flags | evidence | related | audit | signatures
```

### Lifecycle states (per Step 2 INSP normalised: 5 subtypes incoming/first_piece/in_process/final/return_to_service)
```text
draft → in-progress → completed → reviewed → closed
                                          ↘ flagged-nc (escalates to NQCASE)
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="insp-record-result"
data-hmv4-mutation-intent="insp-flag-nonconformance"
data-hmv4-mutation-intent="insp-submit-review"
data-hmv4-mutation-intent="insp-close"
data-hmv4-mutation-intent="insp-esign"
```

### INSP-specific record shape

```js
record = {
  recordId, rootCode: 'INSP', title,
  inspectionSubtype,  // incoming|first_piece|in_process|final|return_to_service
  state, severity,
  workOrderId, lotId, partNumber, supplier,
  characteristics: [{name, target, tolerance, sampleSize}],     // overview
  sampleResults: [{characteristic, samples: [{value, judgment}], result}], // sample-results
  nonconformanceFlags: [{characteristic, severity, escalatedToNcId}], // nonconformance-flags
  evidence: [{type, label, link}],                              // evidence
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## RENDERER STUB

```js
var inspTabs = ['overview','sample-results','nonconformance-flags','evidence','related','audit','signatures'];

function normaliseInspTab(tab){ return inspTabs.indexOf(tab) >= 0 ? tab : 'overview'; }

function renderInspPanel(tab, record){
  if(tab === 'overview') {
    return '<h2>Overview</h2>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Subtype</dt><dd>'+esc(record.inspectionSubtype || '—')+'</dd>'+
        '<dt>Work order</dt><dd>'+esc(record.workOrderId || '—')+'</dd>'+
        '<dt>Lot</dt><dd>'+esc(record.lotId || '—')+'</dd>'+
        '<dt>Part</dt><dd>'+esc(record.partNumber || '—')+'</dd>'+
        '<dt>Supplier</dt><dd>'+esc(record.supplier || '—')+'</dd>'+
      '</dl>'+
      '<h3>Characteristics</h3>'+
      ((record.characteristics || []).length === 0
        ? '<p class="hmv4-text-2">No characteristics defined.</p>'
        : '<table class="hmv4-data-table"><thead><tr><th>Name</th><th>Target</th><th>Tolerance</th><th>Sample size</th></tr></thead><tbody>'+
          (record.characteristics || []).map(function(c){return '<tr><td>'+esc(c.name)+'</td><td>'+esc(c.target)+'</td><td>'+esc(c.tolerance)+'</td><td>'+esc(c.sampleSize)+'</td></tr>';}).join('')+
          '</tbody></table>');
  }
  if(tab === 'sample-results') {
    var results = record.sampleResults || [];
    if(results.length === 0) return '<h2>Sample results</h2><p class="hmv4-text-2">No sample results recorded.</p>';
    return '<h2>Sample results</h2>'+
      results.map(function(r){
        return '<section class="hmv4-card"><h3>'+esc(r.characteristic)+'</h3><p>Result: <strong>'+esc(r.result)+'</strong></p><table class="hmv4-data-table"><thead><tr><th>Sample #</th><th>Value</th><th>Judgment</th></tr></thead><tbody>'+
          (r.samples || []).map(function(s, i){return '<tr><td>'+(i+1)+'</td><td>'+esc(s.value)+'</td><td data-hmv4-status="'+esc(s.judgment)+'">'+esc(s.judgment)+'</td></tr>';}).join('')+
          '</tbody></table></section>';
      }).join('');
  }
  if(tab === 'nonconformance-flags') {
    var flags = record.nonconformanceFlags || [];
    if(flags.length === 0) return '<h2>Nonconformance flags</h2><p class="hmv4-text-2">No nonconformance flags raised.</p>';
    return '<h2>Nonconformance flags</h2><ul class="hmv4-list">'+
      flags.map(function(f){
        var ncLink = f.escalatedToNcId
          ? ' &mdash; <a href="/ops/records/nonconformance-cases/'+esc(f.escalatedToNcId)+'?tab=overview" data-hmv4-record-open="nonconformance-cases" data-hmv4-record-id="'+esc(f.escalatedToNcId)+'">'+esc(f.escalatedToNcId)+'</a>'
          : ' (not yet escalated)';
        return '<li><strong>'+esc(f.characteristic)+'</strong> ('+esc(f.severity)+')'+ncLink+'</li>';
      }).join('')+
      '</ul>';
  }
  if(tab === 'evidence') {
    var ev = record.evidence || [];
    if(ev.length === 0) return '<h2>Evidence</h2><p class="hmv4-text-2">No evidence attached.</p>';
    return '<h2>Evidence</h2><ul class="hmv4-list">'+
      ev.map(function(e){return '<li>'+esc(e.type)+': '+esc(e.label)+'</li>';}).join('')+
      '</ul>';
  }
  if(tab === 'related') {
    var rel = record.relatedRecords || [];
    if(rel.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
    return '<h2>Related records</h2><ul class="hmv4-list">'+
      rel.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview">'+esc(r.label)+'</a></li>';}).join('')+
      '</ul>';
  }
  if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder.</p>';
  if(tab === 'signatures') return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder.</p>';
  return '<p>Unknown tab.</p>';
}

function renderInspRecord(route){
  // Mirror renderCdocRecord structure with inspTabs, INSP attrs, fixture key window.HMV4_INSP_RECORD_FIXTURE,
  // dispatch when p.resource_family === 'inspections', wire into renderRoute, expose on window.Hmv4Renderers.
  // ... (follow CDOC implementation step-by-step, swapping CDOC→INSP labels, tabs, mutation intents)
}
```

## INSP-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "inspections",
  "rootCode": "INSP",
  "records": {
    "INSP-001": {
      "recordId": "INSP-001",
      "rootCode": "INSP",
      "title": "First-piece inspection on WO-3011 OP-30",
      "inspectionSubtype": "first_piece",
      "state": "completed",
      "severity": "minor",
      "workOrderId": "WO-3011",
      "lotId": "LOT-2026-04",
      "partNumber": "PN-2042 Rev B",
      "supplier": null,
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype. Mutation outside fixture.",
      "lifecycle": [["draft","complete"],["in-progress","complete"],["completed","current"],["reviewed","pending"],["closed","locked"]],
      "characteristics": [
        { "name": "Hole diameter", "target": "10.00 mm", "tolerance": "±0.02 mm", "sampleSize": 5 },
        { "name": "Surface roughness", "target": "Ra 1.6", "tolerance": "Ra ≤ 1.6", "sampleSize": 3 }
      ],
      "sampleResults": [
        { "characteristic": "Hole diameter", "result": "PASS", "samples": [
          { "value": "10.005 mm", "judgment": "pass" },
          { "value": "9.995 mm",  "judgment": "pass" },
          { "value": "10.010 mm", "judgment": "pass" },
          { "value": "9.990 mm",  "judgment": "pass" },
          { "value": "10.000 mm", "judgment": "pass" }
        ]},
        { "characteristic": "Surface roughness", "result": "FAIL", "samples": [
          { "value": "Ra 1.4", "judgment": "pass" },
          { "value": "Ra 1.5", "judgment": "pass" },
          { "value": "Ra 1.9", "judgment": "fail" }
        ]}
      ],
      "nonconformanceFlags": [
        { "characteristic": "Surface roughness", "severity": "minor", "escalatedToNcId": "NC-001" }
      ],
      "evidence": [
        { "type": "measurement-report", "label": "CMM report INSP-001-CMM" }
      ],
      "relatedRecords": [
        { "resourceFamily": "nonconformance-cases", "recordId": "NC-001", "label": "NC-001 (escalated)" },
        { "resourceFamily": "work-orders", "recordId": "WO-3011", "label": "WO-3011" },
        { "resourceFamily": "lots", "recordId": "LOT-2026-04", "label": "LOT-2026-04" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: result was edited offline." },
    "partial_access": { "stateMessage": "Partial-access fixture.", "limitations": ["Sample values masked for cross-team operators.", "Evidence links masked for current role."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture." }
  }
}
```

## FIXTURE PAGES (10 files — INSP doesn't have controlled-copies tab)

```text
authoritative-record-shell-insp-overview.html
authoritative-record-shell-insp-sample-results.html
authoritative-record-shell-insp-nonconformance-flags.html
authoritative-record-shell-insp-evidence.html
authoritative-record-shell-insp-related.html
authoritative-record-shell-insp-audit.html
authoritative-record-shell-insp-signatures.html
authoritative-record-shell-insp-conflict.html
authoritative-record-shell-insp-partial-access.html
authoritative-record-shell-insp-degraded.html
```

## E2E TESTS

Mirror CDOC tests with INSP attrs. Add NC-escalation test:

```ts
test('INSP nonconformance-flags tab links to escalated NC', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-nonconformance-flags.html');
  const ncLink = page.locator('[data-hmv4-record-open="nonconformance-cases"][data-hmv4-record-id="NC-001"]');
  await expect(ncLink).toBeVisible();
  await expect(ncLink).toHaveAttribute('href', /\/ops\/records\/nonconformance-cases\/NC-001/);
});
```

## EVERYTHING ELSE — SAME AS CDOC SLICE 5

- Pre-flight: same
- Allowed/forbidden files: same (substitute `insp` for `cdoc`)
- Bridge alias mapping: same shape
- Visual baselines: same multi-browser flow
- Gates: same
- Report structure: same
- Commit + push: same

## DECISION

```text
INSP_SLICE6_PASS_READY_FOR_QA
INSP_SLICE6_PASS_WITH_WARNINGS
INSP_SLICE6_FAIL_BLOCK_NEXT
```
