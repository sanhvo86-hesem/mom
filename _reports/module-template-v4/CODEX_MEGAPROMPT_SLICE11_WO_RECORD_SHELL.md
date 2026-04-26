# CODEX MEGAPROMPT — Slice 11 WO Record Shell (DIFFERENTIAL)

> Approval: `Proceed with WO Record Shell eleventh-slice prototype implementation.`
> Branch: `codex/slice-11-wo-from-so-qa`
> **Run AFTER Slice 10 SO merged into main.**

---

## DIFFERENTIAL FROM JO SLICE 9

Mirror JO megaprompt with these substitutions:

| Slot | JO | WO |
|---|---|---|
| Root code | JO | WO |
| Resource family | job-orders | work-orders |
| Frozen route | `/ops/records/job-orders/JO-...` | `/ops/records/work-orders/WO-3013` |
| Renderer fn | `renderJoRecord` | `renderWoRecord` |
| Fixture JSON | `job-order-record-fixtures.json` | `work-order-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-jo-` | `authoritative-record-shell-wo-` |
| Bridge alias | `jo`, `job-order` | `wo`, `work-order` |
| Backend canonical | `/api/v1/job-orders` | `/api/v1/work-orders` |
| Live registry global | `HMV4_JO_RECORD_FIXTURE` | `HMV4_WO_RECORD_FIXTURE` |

## WO-SPECIFIC CONTRACT

WO is the leaf operational unit (children of JO). Highly granular: single operation on a specific equipment in a specific time window.

### Tabs (8 — execution-focused)
```text
overview | operation-detail | resource-allocation | execution-log | inspections | dispatch-status | related | audit
```

### Lifecycle states
```text
planned → released → ready → executing → paused → completed
                                                ↘ scrapped
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="wo-release"
data-hmv4-mutation-intent="wo-mark-ready"
data-hmv4-mutation-intent="wo-start-execution"
data-hmv4-mutation-intent="wo-pause"
data-hmv4-mutation-intent="wo-resume"
data-hmv4-mutation-intent="wo-record-completion"
data-hmv4-mutation-intent="wo-record-scrap"
data-hmv4-mutation-intent="wo-cancel"
```

### WO record shape

```js
record = {
  recordId,                              // WO-3013
  rootCode: 'WO',
  title,
  parentJobOrder,                        // JO-2026-014
  state, severity,
  operation: {
    code, name, sequence,                // OP-30 First-piece, sequence 30
    workCenter, equipmentCode, equipmentName,
    setupTimeMin, runTimeMin
  },
  resourceAllocation: {
    operatorId, operatorName,
    equipmentId, equipmentBookedFrom, equipmentBookedTo,
    skillRequirements, qualifiedOperators
  },
  executionLog: [{ ts, event, operatorId, note }],
  inspections: [{ id, type, result, recordedAt }],   // links to INSP records
  dispatchStatus: {
    dispatchedAt, dispatchedBy, currentDispatchTarget, eta
  },
  scheduledStart, scheduledEnd, actualStart, actualEnd,
  quantityPlanned, quantityProduced, quantityScrap,
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## WO-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "work-orders",
  "rootCode": "WO",
  "records": {
    "WO-3013": {
      "recordId": "WO-3013", "rootCode": "WO",
      "title": "WO-3013 First-piece OP-30 on JO-2026-014",
      "parentJobOrder": "JO-2026-014",
      "state": "executing", "severity": "low",
      "operation": {
        "code": "OP-30", "name": "First-piece inspection", "sequence": 30,
        "workCenter": "WC-QC-01", "equipmentCode": "CMM-Z1", "equipmentName": "Zeiss Contura CMM",
        "setupTimeMin": 15, "runTimeMin": 45
      },
      "resourceAllocation": {
        "operatorId": "OP-1004", "operatorName": "Pham Thi D",
        "equipmentId": "CMM-Z1", "equipmentBookedFrom": "2026-04-25 14:00", "equipmentBookedTo": "2026-04-25 15:30",
        "skillRequirements": ["QUAL_FIRST_PIECE", "QUAL_QC_VISUAL"],
        "qualifiedOperators": ["OP-1004", "OP-1007"]
      },
      "scheduledStart": "2026-04-25", "scheduledEnd": "2026-04-26",
      "actualStart": "2026-04-25 14:05", "actualEnd": null,
      "quantityPlanned": 5, "quantityProduced": 3, "quantityScrap": 0,
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype WO shell.",
      "lifecycle": [["planned","complete"],["released","complete"],["ready","complete"],["executing","current"],["paused","locked"],["completed","locked"]],
      "executionLog": [
        { "ts": "2026-04-25 14:00", "event": "released", "operatorId": "OP-1004", "note": "WO released to OP-1004" },
        { "ts": "2026-04-25 14:05", "event": "started", "operatorId": "OP-1004", "note": "Setup begun" },
        { "ts": "2026-04-25 14:25", "event": "first-sample-measured", "operatorId": "OP-1004", "note": "Sample 1 PASS" }
      ],
      "inspections": [
        { "id": "INSP-001", "type": "first_piece", "result": "PASS_WITH_NOTE", "recordedAt": "2026-04-25 14:30" }
      ],
      "dispatchStatus": {
        "dispatchedAt": "2026-04-25 14:00",
        "dispatchedBy": "Production Planner",
        "currentDispatchTarget": "DISP-2026-1107",
        "eta": "2026-04-25 16:00"
      },
      "relatedRecords": [
        { "resourceFamily": "job-orders", "recordId": "JO-2026-014", "label": "JO-2026-014 parent job" },
        { "resourceFamily": "inspections", "recordId": "INSP-001", "label": "INSP-001 first-piece" },
        { "resourceFamily": "nonconformance-cases", "recordId": "NC-001", "label": "NC-001 escalated from this WO" },
        { "resourceFamily": "dispatch-targets", "recordId": "DISP-2026-1107", "label": "DISP-2026-1107 live dispatch" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: equipment booking changed by maintenance." },
    "partial_access": { "stateMessage": "Partial-access fixture.", "limitations": ["Operator name masked.", "Equipment booking masked."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture." }
  }
}
```

## FIXTURE PAGES (11)

```text
authoritative-record-shell-wo-overview.html
authoritative-record-shell-wo-operation-detail.html
authoritative-record-shell-wo-resource-allocation.html
authoritative-record-shell-wo-execution-log.html
authoritative-record-shell-wo-inspections.html
authoritative-record-shell-wo-dispatch-status.html
authoritative-record-shell-wo-related.html
authoritative-record-shell-wo-audit.html
authoritative-record-shell-wo-conflict.html
authoritative-record-shell-wo-partial-access.html
authoritative-record-shell-wo-degraded.html
authoritative-record-shell-wo-live-mode.html
```

## SPECIAL E2E

```ts
test('WO inspections tab links to INSP record', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-inspections.html');
  await expect(page.locator('a[href*="records/inspections/INSP-001"]')).toBeVisible();
});

test('WO related shows parent JO + dispatch target + escalated NC', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-related.html');
  await expect(page.locator('a[href*="records/job-orders/JO-2026-014"]')).toBeVisible();
  await expect(page.locator('a[href*="records/dispatch-targets/DISP-2026-1107"]')).toBeVisible();
  await expect(page.locator('a[href*="records/nonconformance-cases/NC-001"]')).toBeVisible();
});

test('WO execution-log preserves chronological order', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-execution-log.html');
  // Verify 3+ log entries visible in order
  await expect(page.locator('[data-hmv4-wo-panel="execution-log"] .hmv4-list li')).toHaveCount(3);
});
```

## EVERYTHING ELSE — same as JO Slice 9

## DECISION

```text
WO_SLICE11_PASS_READY_FOR_QA
WO_SLICE11_PASS_WITH_WARNINGS
WO_SLICE11_FAIL_BLOCK_NEXT
```
