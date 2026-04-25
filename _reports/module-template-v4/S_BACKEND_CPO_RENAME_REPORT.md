# Stream C.3 — CPO Canonical Path Rename: Implementation Report

**Date:** 2026-04-26
**Branch:** `codex/backend-cpo-rename`
**Stream:** C.3 — CPO Canonical Path Rename
**ADR:** ADR-0008
**Status:** PASS — READY FOR REVIEW

---

## Summary

Added canonical `/api/v1/customer-purchase-orders` routes delegating to the existing
`CustomerPurchaseOrderController` methods. Legacy `/api/v1/commercial/customer-purchase-orders`
paths now emit 301 redirects to the canonical paths.

This is additive only. No business logic changed. No controller methods modified.
PUT update verb intentionally absent (deferred per ADR rationale — legacy never had it).

---

## Pre-flight

| Check | Result |
|-------|--------|
| Controller exists (`CustomerPurchaseOrderController.php`) | ✅ |
| Branch created from `main` | ✅ `codex/backend-cpo-rename` |
| PHP syntax check — controller + routes | ✅ |
| Forbidden file guard (HMV4 files, portal.html, etc.) | ✅ none touched |

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `mom/api/controllers/CustomerPurchaseOrderController.php` | Additive | Added 4 redirect methods + private `redirectToCanonicalCpoPath()` |
| `mom/api/routes/rest-routes.php` | Additive | Canonical routes + legacy → redirect route wiring |
| `mom/api/openapi.yaml` | Additive + annotate | Canonical path entries; legacy entries marked `deprecated: true` |
| `mom/data/registry/endpoint-catalog.json` | Additive + annotate | 4 canonical entries added; 4 legacy entries marked `deprecated` with `redirect_301` |
| `mom/data/registry/endpoint-catalog-index.json` | Additive + annotate | 4 canonical rows added; 4 legacy rows marked `deprecated` |
| `mom/tests/contract/CpoRenameTest.php` | New | 12 contract tests: canonical routes, legacy redirect routes, 301 Location headers |

---

## Controller Methods Added (Additive Only)

```php
// Redirect helpers — additive, delegate to emptyResponse(301, ['Location' => ...])
public function redirectLegacyListCustomerPurchaseOrders(): never
public function redirectLegacyGetCustomerPurchaseOrder(): never
public function redirectLegacyCreateCustomerPurchaseOrder(): never
public function redirectLegacyTransitionCustomerPurchaseOrder(): never
private function redirectToCanonicalCpoPath(string $target): never
```

No existing methods modified.

---

## Route Changes

### Legacy paths (now emit 301)

| Method | Legacy Path | Handler |
|--------|-------------|---------|
| GET | `/api/v1/commercial/customer-purchase-orders` | `redirectLegacyListCustomerPurchaseOrders` |
| POST | `/api/v1/commercial/customer-purchase-orders` | `redirectLegacyCreateCustomerPurchaseOrder` |
| GET | `/api/v1/commercial/customer-purchase-orders/{customerPoId}` | `redirectLegacyGetCustomerPurchaseOrder` |
| POST | `/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition` | `redirectLegacyTransitionCustomerPurchaseOrder` |

### Canonical paths (new, functional)

| Method | Canonical Path | Handler |
|--------|---------------|---------|
| GET | `/api/v1/customer-purchase-orders` | `listPurchaseOrders` |
| POST | `/api/v1/customer-purchase-orders` | `createPurchaseOrder` |
| GET | `/api/v1/customer-purchase-orders/{customerPoId}` | `getPurchaseOrder` |
| POST | `/api/v1/customer-purchase-orders/{customerPoId}:transition` | `transitionPurchaseOrder` |

---

## Quality Gates

| Gate | Result |
|------|--------|
| PHP syntax check `CustomerPurchaseOrderController.php` | ✅ PASS |
| PHP syntax check `rest-routes.php` | ✅ PASS |
| OpenAPI YAML valid (python3 yaml parse + PHP structural check) | ✅ PASS |
| Endpoint catalog JSON valid (python3 json.load) | ✅ PASS |
| `CpoRenameTest` — 12 tests, 48 assertions | ✅ PASS |
| Full contract suite — 108 tests, 477 assertions (Streams C.1, C.2, C.3) | ✅ PASS |
| Forbidden file guard | ✅ No HMV4/forbidden files touched |
| PUT update verb absent | ✅ Correctly omitted per ADR |

---

## Redirect Behavior Verified

| Handler | Input | 301 Location |
|---------|-------|-------------|
| `redirectLegacyListCustomerPurchaseOrders` | — | `/api/v1/customer-purchase-orders` |
| `redirectLegacyCreateCustomerPurchaseOrder` | — | `/api/v1/customer-purchase-orders` |
| `redirectLegacyGetCustomerPurchaseOrder` | `customerPoId=CPO-2026-001` | `/api/v1/customer-purchase-orders/CPO-2026-001` |
| `redirectLegacyTransitionCustomerPurchaseOrder` | `customerPoId=CPO-2026-001` | `/api/v1/customer-purchase-orders/CPO-2026-001:transition` |

---

## Non-changes (confirmed)

- No business logic in `CustomerPurchaseOrderController` changed
- No frontend files touched
- No forbidden files touched
- No database schema changes
- No PUT verb added

---

## Decision

```
CPO_RENAME_PASS_READY_FOR_REVIEW
```
