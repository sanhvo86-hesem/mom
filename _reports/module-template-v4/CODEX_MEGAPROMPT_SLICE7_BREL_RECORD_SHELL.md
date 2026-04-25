# CODEX MEGAPROMPT — Slice 7 BREL Record Shell (DIFFERENTIAL)

> Approval: `Proceed with BREL Record Shell seventh-slice prototype implementation.`
> Branch: `codex/slice-7-brel-from-insp-qa`
> **Run AFTER Slice 6 INSP merged into main.**

---

## DIFFERENTIAL

Mirror CDOC megaprompt with these substitutions:

| Slot | CDOC | BREL |
|---|---|---|
| Root code | CDOC | BREL |
| Resource family | controlled-documents | batch-releases |
| Frozen route | `/ops/records/controlled-documents/CDOC-001` | `/ops/records/batch-releases/BREL-001` |
| Renderer fn | `renderCdocRecord` | `renderBrelRecord` |
| Fixture JSON | `cdoc-record-fixtures.json` | `batch-release-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-cdoc-` | `authoritative-record-shell-brel-` |
| Bridge alias | `cdoc` | `brel` (or `release`) |
| Container class | `hmv4-record-shell--cdoc` | `hmv4-record-shell--brel` |
| Data attr root | `data-hmv4-cdoc-record` | `data-hmv4-brel-record` |

## BREL-SPECIFIC CONTRACT

### Tabs (8 — release-specific)
```text
overview | release-package | quality-evidence | genealogy | shipment-readiness | related | audit | signatures
```

### Lifecycle states (per Step 2 BREL — release authority root)
```text
draft → evidence-collection → review → release-approved → market-ship-ready
                                                      ↘ on-hold
                                                      ↘ rejected
```

BREL is the highest-stakes governed-quality root because it gates physical product release. Lifecycle is signature-heavy.

### Disabled mutation intents (10 — most of any slice)
```text
data-hmv4-mutation-intent="brel-collect-evidence"
data-hmv4-mutation-intent="brel-submit-for-review"
data-hmv4-mutation-intent="brel-approve-release"
data-hmv4-mutation-intent="brel-reject"
data-hmv4-mutation-intent="brel-place-on-hold"
data-hmv4-mutation-intent="brel-release-from-hold"
data-hmv4-mutation-intent="brel-market-ship"
data-hmv4-mutation-intent="brel-recall"
data-hmv4-mutation-intent="brel-esign-2person"
data-hmv4-mutation-intent="brel-esign"
```

ALL DISABLED. BREL is the slice where mutation control is most strict.

### BREL record shape

```js
record = {
  recordId, rootCode: 'BREL', title,
  batchId, productCode, lotId, manufacturedAt, manufactureLine,
  state, releaseDecision,                 // pending|approved|rejected|on-hold|released|recalled
  approvers: [{role, name, decision, signedAt}],   // 2-person rule applied
  releasePackage: {
    inspectionRecords: [...],
    nonconformanceCases: [...],
    capaRecords: [...],
    cdocVersions: [...],
    deviations: [...]
  },
  qualityEvidence: { coa, batchRecord, validationCertificate },
  genealogyRoot,                           // root genealogy graph node ref
  shipmentReadiness: { quantityAvailable, allocatedTo, blockedBy },
  freshness, stateMessage, lifecycle, relatedRecords
}
```

## BREL-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "batch-releases",
  "rootCode": "BREL",
  "records": {
    "BREL-001": {
      "recordId": "BREL-001",
      "rootCode": "BREL",
      "title": "Batch BX-2026-04 release packet",
      "batchId": "BX-2026-04",
      "productCode": "PN-2042",
      "lotId": "LOT-2026-04",
      "manufacturedAt": "2026-04-15",
      "manufactureLine": "Line 1",
      "state": "review",
      "releaseDecision": "pending",
      "freshness": "fixture_current",
      "stateMessage": "Read-only release packet. 2-person e-sign required for actual release.",
      "lifecycle": [
        ["draft","complete"],["evidence-collection","complete"],["review","current"],
        ["release-approved","pending"],["market-ship-ready","locked"],
        ["on-hold","locked"],["rejected","locked"]
      ],
      "approvers": [
        { "role": "QA Director", "name": "Dr. Tran", "decision": "pending", "signedAt": null },
        { "role": "Plant Manager", "name": "Mr. Le", "decision": "pending", "signedAt": null }
      ],
      "releasePackage": {
        "inspectionRecords": [{"id":"INSP-001","result":"PASS_WITH_NOTE"}],
        "nonconformanceCases": [{"id":"NC-001","disposition":"use-as-is"}],
        "capaRecords": [{"id":"CAPA-001","status":"in-progress"}],
        "cdocVersions": [{"docCode":"qms-sop-100","rev":"B"}],
        "deviations": []
      },
      "qualityEvidence": {
        "coa": { "id": "COA-2026-04-001", "issuedAt": "2026-04-22" },
        "batchRecord": { "id": "BR-2026-04-001", "complete": true },
        "validationCertificate": { "id": "VAL-2025-12-LINE1", "validUntil": "2026-12-15" }
      },
      "genealogyRoot": "GEN-LOT-2026-04",
      "shipmentReadiness": {
        "quantityAvailable": 5000,
        "allocatedTo": [{"customer":"CUST-100","quantity":2000}],
        "blockedBy": ["CAPA-001 verification pending"]
      },
      "relatedRecords": [
        { "resourceFamily": "lots", "recordId": "LOT-2026-04", "label": "LOT-2026-04 (genealogy root)" },
        { "resourceFamily": "inspections", "recordId": "INSP-001", "label": "INSP-001" },
        { "resourceFamily": "nonconformance-cases", "recordId": "NC-001", "label": "NC-001" },
        { "resourceFamily": "capas", "recordId": "CAPA-001", "label": "CAPA-001" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: parallel review session detected." },
    "partial_access": { "stateMessage": "Partial-access fixture. Approvers and shipment allocations masked.", "limitations": ["Approver names masked.", "Customer allocations masked.", "Quality evidence references masked."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture. Reload from authority before approving." }
  }
}
```

## FIXTURE PAGES (11)

```text
authoritative-record-shell-brel-overview.html
authoritative-record-shell-brel-release-package.html
authoritative-record-shell-brel-quality-evidence.html
authoritative-record-shell-brel-genealogy.html
authoritative-record-shell-brel-shipment-readiness.html
authoritative-record-shell-brel-related.html
authoritative-record-shell-brel-audit.html
authoritative-record-shell-brel-signatures.html
authoritative-record-shell-brel-conflict.html
authoritative-record-shell-brel-partial-access.html
authoritative-record-shell-brel-degraded.html
```

## SPECIAL E2E ASSERTIONS

```ts
test('BREL signatures tab shows 2-person rule status', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-signatures.html');
  // Both approvers visible in pending state
  const approvers = page.locator('[data-hmv4-brel-approver]');
  await expect(approvers).toHaveCount(2);
});

test('BREL release-package tab links to all evidence records', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-release-package.html');
  // Should link to INSP-001, NC-001, CAPA-001
  await expect(page.locator('a[href*="records/inspections/INSP-001"]')).toBeVisible();
  await expect(page.locator('a[href*="records/nonconformance-cases/NC-001"]')).toBeVisible();
  await expect(page.locator('a[href*="records/capas/CAPA-001"]')).toBeVisible();
});

test('BREL ALL mutation intents disabled (release safety)', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-overview.html');
  await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  // Specifically check the high-stakes ones
  for (const intent of ['brel-approve-release','brel-market-ship','brel-recall','brel-esign-2person']) {
    await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"]`)).toHaveAttribute('disabled', '');
  }
});
```

## EVERYTHING ELSE — same as CDOC Slice 5

## DECISION

```text
BREL_SLICE7_PASS_READY_FOR_QA
BREL_SLICE7_PASS_WITH_WARNINGS
BREL_SLICE7_FAIL_BLOCK_NEXT
```
