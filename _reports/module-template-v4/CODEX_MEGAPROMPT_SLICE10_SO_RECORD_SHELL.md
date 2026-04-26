# CODEX MEGAPROMPT — Slice 10 SO Record Shell (DIFFERENTIAL)

> Approval: `Proceed with SO Record Shell tenth-slice prototype implementation.`
> Branch: `codex/slice-10-so-from-jo-qa`
> **Run AFTER Slice 9 JO merged into main.**

---

## DIFFERENTIAL FROM JO SLICE 9

Mirror `CODEX_MEGAPROMPT_SLICE9_JO_RECORD_SHELL.md` with these substitutions:

| Slot | JO | SO |
|---|---|---|
| Root code | JO | SO |
| Resource family | job-orders | sales-orders |
| Frozen route | `/ops/records/job-orders/JO-2026-014` | `/ops/records/sales-orders/SO-2026-088` |
| Renderer fn | `renderJoRecord`/`renderJoPanel` | `renderSoRecord`/`renderSoPanel` |
| Fixture JSON | `job-order-record-fixtures.json` | `sales-order-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-jo-` | `authoritative-record-shell-so-` |
| Bridge alias | `jo`, `job-order` | `so`, `sales-order` |
| Container class | `hmv4-record-shell--jo` | `hmv4-record-shell--so` |
| Data attr root | `data-hmv4-jo-record` | `data-hmv4-so-record` |
| Backend canonical path | `/api/v1/job-orders` | `/api/v1/sales-orders` |
| Live registry global | `HMV4_JO_RECORD_FIXTURE` | `HMV4_SO_RECORD_FIXTURE` |

## SO-SPECIFIC CONTRACT

### Tabs (7 — sales-order specific)
```text
overview | line-items | linked-job-orders | shipment-allocation | invoicing | related | audit
```

### Lifecycle states
```text
draft → confirmed → released → fulfilling → completed
                                         ↘ cancelled
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="so-confirm"
data-hmv4-mutation-intent="so-release"
data-hmv4-mutation-intent="so-spawn-job-order"
data-hmv4-mutation-intent="so-allocate-shipment"
data-hmv4-mutation-intent="so-invoice"
data-hmv4-mutation-intent="so-cancel"
data-hmv4-mutation-intent="so-complete"
```

### SO record shape

```js
record = {
  recordId,                              // SO-2026-088
  rootCode: 'SO',
  title,
  salesOrderNumber, customerCode, customerName, customerOrderRef,
  state, severity,
  orderDate, requestedShipDate, confirmedShipDate, actualShipDate,
  totalValue, currency,
  owner, salesNotes,
  lineItems: [{
    line, productCode, description, quantityOrdered, quantityShipped,
    unitPrice, lineTotal, requestedDate
  }],
  linkedJobOrders: [{ id, productCode, quantity, state }],
  shipmentAllocation: [{ shipmentId, lineRef, quantity, status, plannedDate }],
  invoicing: { invoiced, invoiceIds: [...], paid, paymentTerms },
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## SO-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "sales-orders",
  "rootCode": "SO",
  "records": {
    "SO-2026-088": {
      "recordId": "SO-2026-088", "rootCode": "SO",
      "title": "Sales order SO-2026-088 (CUST-100, $250K)",
      "salesOrderNumber": "SO-2026-088",
      "customerCode": "CUST-100", "customerName": "Acme Industrial Corp.",
      "customerOrderRef": "PO-ACME-2026-Q2-014",
      "state": "fulfilling", "severity": "low",
      "orderDate": "2026-04-01",
      "requestedShipDate": "2026-04-30",
      "confirmedShipDate": "2026-05-02",
      "actualShipDate": null,
      "totalValue": 250000, "currency": "USD",
      "owner": "Sales Manager",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype SO shell. Mutation outside fixture.",
      "lifecycle": [["draft","complete"],["confirmed","complete"],["released","complete"],["fulfilling","current"],["completed","locked"]],
      "lineItems": [
        { "line": 1, "productCode": "PN-2042", "description": "Widget Assembly Rev B", "quantityOrdered": 5000, "quantityShipped": 0, "unitPrice": 50.00, "lineTotal": 250000, "requestedDate": "2026-04-30" }
      ],
      "linkedJobOrders": [
        { "id": "JO-2026-014", "productCode": "PN-2042", "quantity": 5000, "state": "executing" }
      ],
      "shipmentAllocation": [
        { "shipmentId": "SHIP-2026-031", "lineRef": 1, "quantity": 2000, "status": "planned", "plannedDate": "2026-04-30" },
        { "shipmentId": "SHIP-2026-032", "lineRef": 1, "quantity": 3000, "status": "planned", "plannedDate": "2026-05-02" }
      ],
      "invoicing": { "invoiced": 0, "invoiceIds": [], "paid": 0, "paymentTerms": "Net 30" },
      "relatedRecords": [
        { "resourceFamily": "customer-purchase-orders", "recordId": "CPO-2026-077", "label": "CPO-2026-077 customer purchase order" },
        { "resourceFamily": "job-orders", "recordId": "JO-2026-014", "label": "JO-2026-014 spawned for fulfillment" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: customer ship date was changed offline." },
    "partial_access": { "stateMessage": "Partial-access fixture.", "limitations": ["Customer name masked.", "Total value masked.", "Payment terms masked."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture." }
  }
}
```

## FIXTURE PAGES (10)

```text
authoritative-record-shell-so-overview.html
authoritative-record-shell-so-line-items.html
authoritative-record-shell-so-linked-job-orders.html
authoritative-record-shell-so-shipment-allocation.html
authoritative-record-shell-so-invoicing.html
authoritative-record-shell-so-related.html
authoritative-record-shell-so-audit.html
authoritative-record-shell-so-conflict.html
authoritative-record-shell-so-partial-access.html
authoritative-record-shell-so-degraded.html
authoritative-record-shell-so-live-mode.html  (only if HMV4_LIVE_RESOURCE_REGISTRY exists)
```

## SPECIAL E2E

```ts
test('SO linked-job-orders tab links to JO record', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-linked-job-orders.html');
  await expect(page.locator('a[href*="records/job-orders/JO-2026-014"]')).toBeVisible();
});

test('SO line-items shows quantity progression', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-line-items.html');
  await expect(page.locator('[data-hmv4-so-panel="line-items"] table tbody tr')).toHaveCount(1);
});
```

## EVERYTHING ELSE — same as JO Slice 9

## DECISION

```text
SO_SLICE10_PASS_READY_FOR_QA
SO_SLICE10_PASS_WITH_WARNINGS
SO_SLICE10_FAIL_BLOCK_NEXT
```
