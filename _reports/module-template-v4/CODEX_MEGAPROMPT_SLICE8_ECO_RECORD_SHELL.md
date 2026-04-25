# CODEX MEGAPROMPT — Slice 8 ECO Record Shell (DIFFERENTIAL)

> Approval: `Proceed with ECO Record Shell eighth-slice prototype implementation.`
> Branch: `codex/slice-8-eco-from-brel-qa`
> **Run AFTER Slice 7 BREL merged into main.**

---

## DIFFERENTIAL

Mirror CDOC megaprompt with these substitutions:

| Slot | CDOC | ECO |
|---|---|---|
| Root code | CDOC | ECO |
| Resource family | controlled-documents | engineering-changes |
| Frozen route | `/ops/records/controlled-documents/CDOC-001` | `/ops/records/engineering-changes/ECO-2026-014` |
| Renderer fn | `renderCdocRecord` | `renderEcoRecord` |
| Fixture JSON | `cdoc-record-fixtures.json` | `engineering-change-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-cdoc-` | `authoritative-record-shell-eco-` |
| Bridge alias | `cdoc` | `eco` (or `change-control`) |
| Container class | `hmv4-record-shell--cdoc` | `hmv4-record-shell--eco` |
| Data attr root | `data-hmv4-cdoc-record` | `data-hmv4-eco-record` |

## ECO-SPECIFIC CONTRACT

### Tabs (8 — change-control specific)
```text
overview | change-scope | impact-assessment | implementation-plan | training-impact | related | audit | signatures
```

### Lifecycle states
```text
proposed → impact-assessment → CCB-review → approved → implementation → verification → closed
                                                                                     ↘ rejected
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="eco-submit-impact-assessment"
data-hmv4-mutation-intent="eco-submit-to-ccb"
data-hmv4-mutation-intent="eco-ccb-approve"
data-hmv4-mutation-intent="eco-ccb-reject"
data-hmv4-mutation-intent="eco-start-implementation"
data-hmv4-mutation-intent="eco-verify-implementation"
data-hmv4-mutation-intent="eco-close"
data-hmv4-mutation-intent="eco-esign"
```

### ECO record shape

```js
record = {
  recordId,                     // ECO-2026-014
  rootCode: 'ECO',
  title,
  changeType,                   // process|product|equipment|document
  changeReason,                 // continuous-improvement|nonconformance-driven|regulatory|customer-request
  state, severity,
  proposer, approver,
  changeScope: {
    affectedItems: [...],       // ITEM revisions affected
    affectedDocuments: [...],   // CDOCs affected
    affectedProcesses: [...]
  },
  impactAssessment: {
    qualityImpact, costImpact, scheduleImpact,
    regulatoryImpact, validationImpact,
    summary
  },
  implementationPlan: {
    targetEffectiveDate,
    phases: [{phase, owner, dueDate, status}]
  },
  trainingImpact: {
    requiredTraining: [...],
    affectedRoles: [...],
    trainingRecords: [...]      // links to TRAIN
  },
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## ECO-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "engineering-changes",
  "rootCode": "ECO",
  "records": {
    "ECO-2026-014": {
      "recordId": "ECO-2026-014",
      "rootCode": "ECO",
      "title": "Update PQ acceptance criteria per FDA guidance 2026",
      "changeType": "document",
      "changeReason": "regulatory",
      "state": "implementation",
      "severity": "major",
      "proposer": "Quality Manager",
      "approver": "VP Quality + CCB",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype. CCB approval cycle outside fixture.",
      "lifecycle": [
        ["proposed","complete"],["impact-assessment","complete"],
        ["CCB-review","complete"],["approved","complete"],
        ["implementation","current"],["verification","pending"],["closed","locked"]
      ],
      "changeScope": {
        "affectedItems": [],
        "affectedDocuments": [
          { "docCode": "qms-sop-100", "fromRev": "A", "toRev": "B" }
        ],
        "affectedProcesses": ["Process Validation"]
      },
      "impactAssessment": {
        "qualityImpact": "high — adds new acceptance criterion",
        "costImpact": "low — documentation only",
        "scheduleImpact": "30 days for retraining",
        "regulatoryImpact": "REQUIRED — FDA guidance compliance",
        "validationImpact": "re-validation NOT required (clarification, not new criterion)",
        "summary": "FDA 2026 guidance clarifies PQ acceptance. Update SOP to mirror language. Retrain affected roles."
      },
      "implementationPlan": {
        "targetEffectiveDate": "2026-01-15",
        "phases": [
          { "phase": "Document update", "owner": "QA Director", "dueDate": "2025-12-15", "status": "complete" },
          { "phase": "Training rollout", "owner": "Training Lead", "dueDate": "2026-01-10", "status": "complete" },
          { "phase": "Effective date go-live", "owner": "QA Director", "dueDate": "2026-01-15", "status": "in-progress" },
          { "phase": "60-day verification", "owner": "QA Director", "dueDate": "2026-03-15", "status": "planned" }
        ]
      },
      "trainingImpact": {
        "requiredTraining": [{ "code": "QUAL_PV_2026", "name": "Process Validation per 2026 FDA guidance" }],
        "affectedRoles": ["Process Engineer", "Validation Engineer", "QC Inspector"],
        "trainingRecords": [
          { "id": "TR-7050", "operatorId": "OP-1004", "status": "completed" },
          { "id": "TR-7051", "operatorId": "OP-1007", "status": "in_progress" }
        ]
      },
      "relatedRecords": [
        { "resourceFamily": "controlled-documents", "recordId": "CDOC-001", "label": "qms-sop-100 Rev B (driven by this ECO)" },
        { "resourceFamily": "training-records", "recordId": "TR-7050", "label": "TR-7050 PV training" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: CCB review reopened." },
    "partial_access": { "stateMessage": "Partial-access fixture. Some CCB members masked.", "limitations": ["CCB member identities masked.", "Cost-impact details masked for current role."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture." }
  }
}
```

## FIXTURE PAGES (11)

```text
authoritative-record-shell-eco-overview.html
authoritative-record-shell-eco-change-scope.html
authoritative-record-shell-eco-impact-assessment.html
authoritative-record-shell-eco-implementation-plan.html
authoritative-record-shell-eco-training-impact.html
authoritative-record-shell-eco-related.html
authoritative-record-shell-eco-audit.html
authoritative-record-shell-eco-signatures.html
authoritative-record-shell-eco-conflict.html
authoritative-record-shell-eco-partial-access.html
authoritative-record-shell-eco-degraded.html
```

## SPECIAL E2E

```ts
test('ECO change-scope links affected CDOC versions', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-eco-change-scope.html');
  await expect(page.locator('text=qms-sop-100')).toBeVisible();
});

test('ECO training-impact links to TR records', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-eco-training-impact.html');
  await expect(page.locator('a[href*="records/training-records/TR-7050"]')).toBeVisible();
});
```

## EVERYTHING ELSE — same as CDOC Slice 5

## DECISION

```text
ECO_SLICE8_PASS_READY_FOR_QA
ECO_SLICE8_PASS_WITH_WARNINGS
ECO_SLICE8_FAIL_BLOCK_NEXT
```

## After Slice 8: Phase A complete

When ECO merges, **Phase A quality stream is COMPLETE**: 6 of 18 Wave 1 roots have authoritative record shells (DISP+NQCASE+TRAIN+CAPA+CDOC+INSP+BREL+ECO actually = 8 with DISP workspace). Time to assess: replicate live API toggle to all of them, then start Phase B (transactional JO/SO/WO/CPO).
