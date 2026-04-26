# CODEX MEGAPROMPT — Slice 12 CPO Record Shell (DIFFERENTIAL)

> Approval: `Proceed with CPO Record Shell twelfth-slice prototype implementation.`
> Branch: `codex/slice-12-cpo-from-wo-qa`
> **Run AFTER Slice 11 WO merged into main. CLOSES Phase B transactional stream.**

---

## DIFFERENTIAL FROM JO SLICE 9

Mirror JO megaprompt with these substitutions:

| Slot | JO | CPO |
|---|---|---|
| Root code | JO | CPO |
| Resource family | job-orders | customer-purchase-orders |
| Frozen route | `/ops/records/job-orders/JO-...` | `/ops/records/customer-purchase-orders/CPO-2026-077` |
| Renderer fn | `renderJoRecord` | `renderCpoRecord` |
| Fixture JSON | `job-order-record-fixtures.json` | `customer-purchase-order-record-fixtures.json` |
| Fixture page prefix | `authoritative-record-shell-jo-` | `authoritative-record-shell-cpo-` |
| Bridge alias | `jo`, `job-order` | `cpo`, `customer-po` |
| Backend canonical | `/api/v1/job-orders` | `/api/v1/customer-purchase-orders` (Stream C.3) |
| Live registry global | `HMV4_JO_RECORD_FIXTURE` | `HMV4_CPO_RECORD_FIXTURE` |

**Note**: CPO uses backend C.3 alias. Verify it's merged:
```bash
grep -c "/api/v1/customer-purchase-orders" mom/api/routes/rest-routes.php
```

## CPO-SPECIFIC CONTRACT

CPO is the **inbound** customer commitment (vs SO which is the outbound order acknowledgment). CPO captures: customer's PO number, terms, expected delivery, our acknowledgment.

### Tabs (7 — commercial-commitment specific)
```text
overview | line-items | terms-and-conditions | linked-sales-orders | acknowledgment | related | audit
```

### Lifecycle states
```text
received → reviewing → acknowledged → fulfilled
                                  ↘ rejected
```

### Disabled mutation intents
```text
data-hmv4-mutation-intent="cpo-acknowledge"
data-hmv4-mutation-intent="cpo-reject"
data-hmv4-mutation-intent="cpo-spawn-sales-order"
data-hmv4-mutation-intent="cpo-amend"
```

### CPO record shape

```js
record = {
  recordId,                              // CPO-2026-077
  rootCode: 'CPO',
  title,
  customerPoNumber,                      // customer's PO# (their identifier)
  customerCode, customerName, customerOrderRef,
  state, severity,
  receivedDate, requestedDeliveryDate, acknowledgedDate,
  totalValue, currency,
  paymentTerms, deliveryTerms,           // T&C
  owner,
  lineItems: [{ line, productCode, description, quantity, unitPrice, lineTotal, requestedDate }],
  termsAndConditions: { paymentTerms, deliveryTerms, warrantyTerms, qualityRequirements, customClauses },
  linkedSalesOrders: [{ id, productCode, quantity, state }],   // SOs spawned from this CPO
  acknowledgment: {
    acknowledgedAt, acknowledgedBy, customerSignedAt,
    deviationsFromCustomerPo: []
  },
  relatedRecords, freshness, stateMessage, lifecycle
}
```

## CPO-SPECIFIC FIXTURE STARTER

```json
{
  "version": "0.1",
  "authorityClass": "authoritative",
  "resourceFamily": "customer-purchase-orders",
  "rootCode": "CPO",
  "records": {
    "CPO-2026-077": {
      "recordId": "CPO-2026-077", "rootCode": "CPO",
      "title": "Customer PO from Acme Industrial (PO-ACME-2026-Q2-014)",
      "customerPoNumber": "PO-ACME-2026-Q2-014",
      "customerCode": "CUST-100", "customerName": "Acme Industrial Corp.",
      "state": "acknowledged", "severity": "low",
      "receivedDate": "2026-03-28",
      "requestedDeliveryDate": "2026-04-30",
      "acknowledgedDate": "2026-04-01",
      "totalValue": 250000, "currency": "USD",
      "paymentTerms": "Net 30",
      "deliveryTerms": "FOB Shipping Point",
      "owner": "Sales Manager",
      "freshness": "fixture_current",
      "stateMessage": "Read-only prototype CPO shell.",
      "lifecycle": [["received","complete"],["reviewing","complete"],["acknowledged","current"],["fulfilled","pending"]],
      "lineItems": [
        { "line": 1, "productCode": "PN-2042", "description": "Widget Assembly Rev B", "quantity": 5000, "unitPrice": 50.00, "lineTotal": 250000, "requestedDate": "2026-04-30" }
      ],
      "termsAndConditions": {
        "paymentTerms": "Net 30",
        "deliveryTerms": "FOB Shipping Point",
        "warrantyTerms": "12 months from delivery",
        "qualityRequirements": "ISO 9001 cert required; customer source inspection on first lot",
        "customClauses": ["Customer reserves right to cancel without penalty if delivery > 14 days late"]
      },
      "linkedSalesOrders": [
        { "id": "SO-2026-088", "productCode": "PN-2042", "quantity": 5000, "state": "fulfilling" }
      ],
      "acknowledgment": {
        "acknowledgedAt": "2026-04-01",
        "acknowledgedBy": "Sales Manager",
        "customerSignedAt": "2026-04-02",
        "deviationsFromCustomerPo": [
          { "field": "deliveryDate", "customerRequested": "2026-04-30", "weAcknowledged": "2026-05-02", "reason": "Production schedule capacity" }
        ]
      },
      "relatedRecords": [
        { "resourceFamily": "sales-orders", "recordId": "SO-2026-088", "label": "SO-2026-088 spawned for fulfillment" }
      ]
    }
  },
  "states": {
    "conflict":       { "freshness": "fixture_conflict", "stateMessage": "Conflict: customer amended PO offline." },
    "partial_access": { "stateMessage": "Partial-access fixture.", "limitations": ["Customer name masked.", "Total value masked.", "Custom clauses masked."] },
    "degraded":       { "freshness": "fixture_stale", "stateMessage": "Degraded fixture. Reload before acknowledgment." }
  }
}
```

## FIXTURE PAGES (10)

```text
authoritative-record-shell-cpo-overview.html
authoritative-record-shell-cpo-line-items.html
authoritative-record-shell-cpo-terms-and-conditions.html
authoritative-record-shell-cpo-linked-sales-orders.html
authoritative-record-shell-cpo-acknowledgment.html
authoritative-record-shell-cpo-related.html
authoritative-record-shell-cpo-audit.html
authoritative-record-shell-cpo-conflict.html
authoritative-record-shell-cpo-partial-access.html
authoritative-record-shell-cpo-degraded.html
authoritative-record-shell-cpo-live-mode.html
```

## SPECIAL E2E

```ts
test('CPO linked-sales-orders links to SO record', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-linked-sales-orders.html');
  await expect(page.locator('a[href*="records/sales-orders/SO-2026-088"]')).toBeVisible();
});

test('CPO acknowledgment shows deviations from customer PO', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-acknowledgment.html');
  await expect(page.locator('text=deliveryDate')).toBeVisible();
  await expect(page.locator('text=2026-05-02')).toBeVisible();
});

test('CPO terms-and-conditions shows custom clauses', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-terms-and-conditions.html');
  await expect(page.locator('text=cancel without penalty')).toBeVisible();
});

test('CPO partial-access masks total value', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-partial-access.html');
  await expect(page.locator('[data-hmv4-cpo-partial]')).toBeVisible();
});
```

## EVERYTHING ELSE — same as JO Slice 9

## After Slice 12: Phase B complete + 12 of 18 Wave 1 surfaces done

When CPO merges, **Phase B transactional stream is COMPLETE** (JO/SO/WO/CPO all have authoritative record shells with live-API readiness). Remaining: Phase C RED roots (QUO, PO, IREV, PREC, LOT, MWO) which need full backend creation BEFORE frontend slice can integrate live data.

## DECISION

```text
CPO_SLICE12_PASS_READY_FOR_QA
CPO_SLICE12_PASS_WITH_WARNINGS
CPO_SLICE12_FAIL_BLOCK_NEXT
```
