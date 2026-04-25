# Parallel Research: API Readiness Matrix for 18 Wave 1 Roots

**Generated**: 2026-04-25 (parallel research, no GPT Pro input)
**Purpose**: Backend gap analysis for slice migration sequencing.

## Executive Summary

Out of 18 Wave 1 roots:

- **GREEN** (fully ready, CRUD + transitions wired): **0**
- **YELLOW** (partial: exists but naming mismatch / lifecycle gaps / legacy path): **12**
- **RED** (zero implementation): **6**

The bulk of Wave 1 quality/EQMS roots already exist as `/api/v1/eqms/<root>` (singular, EQMS-namespaced). The Step 3 frozen API family tokens use plural form (e.g., `nonconformance-cases`, `capas`). Migration requires REST aliases on the backend. This is a 1-2 day backend task per root, not a full new implementation.

The 6 RED roots (QUO, PO, IREV, PREC, LOT, MWO) need full controller/service creation.

## A. Per-Root Readiness Matrix

| Root | Canonical Path (Step 3) | Existing Endpoints | Verdict | Migration Tasks |
|---|---|---|---|---|
| **QUO** | `/api/v1/quotations` | Legacy `quote_*` actions on QuoteController only. No REST. | **RED** | Create REST routes; map state machine; integrate quote→SO conversion |
| **CPO** | `/api/v1/customer-purchase-orders` | `/api/v1/commercial/customer-purchase-orders` (singular path issue) | **YELLOW** | Add canonical alias; ensure CRUD parity |
| **SO** | `/api/v1/sales-orders` | `/api/orders/sales/*` (legacy alias to OrderController) | **YELLOW** | Create canonical REST; deprecate legacy path |
| **PO** | `/api/v1/purchase-orders` | None | **RED** | Create PurchaseOrderController + full CRUD + state machine |
| **IREV** | `/api/v1/item-revisions` | Implicit in MasterDataController; no dedicated resource | **RED** | Create ItemRevisionController + ECM state machine |
| **ECO** | `/api/v1/engineering-changes` | `/api/v1/eqms/engineering-change` (singular, EQMS-grade) | **YELLOW** | Add plural alias |
| **JO** | `/api/v1/job-orders` | `/api/orders/jobs/*` (legacy) | **YELLOW** | Create canonical REST; deprecate legacy path |
| **WO** | `/api/v1/work-orders` | `/api/orders/work*` (partial legacy) | **YELLOW** | Add LIST + GET/{id}; integrate with DISP |
| **DISP** | `/api/v1/dispatch-targets` | Action shim (`dispatch_*`) on DispatchController; no REST | **YELLOW** | Formalize REST routes |
| **PREC** | `/api/v1/purchase-receipts` | None (shimmed via supplier-incoming) | **RED** | Create PurchaseReceiptController + 3-way match logic |
| **LOT** | `/api/v1/lots` | None (genealogy probe exists, no CRUD) | **RED** | Create LotController + genealogy graph builder |
| **INSP** | `/api/v1/inspections` | `/api/v1/mes/quality/iqc` + `/inprocess` (split) | **YELLOW** | Unify under canonical path; consolidate state machine |
| **NQCASE** | `/api/v1/nonconformance-cases` | `/api/v1/eqms/ncr` (full state machine + esign) | **YELLOW** | Add plural alias |
| **CAPA** | `/api/v1/capas` | `/api/v1/eqms/capa` (full state machine + esign) | **YELLOW** | Add plural alias |
| **BREL** | `/api/v1/batch-releases` | `/api/v1/eqms/batch-release` (full state machine + esign) | **YELLOW** | Add plural alias |
| **CDOC** | `/api/v1/controlled-documents` | `/api/v1/eqms/documents` (full state machine + esign) | **YELLOW** | Add plural alias |
| **TRAIN** | `/api/v1/training-records` | `/api/v1/eqms/training` (matrix, curricula, signatures) | **YELLOW** | Add plural alias; explicit state transitions |
| **MWO** | `/api/v1/maintenance-work-orders` | None (VPS observability only, no MWO domain) | **RED** | Create MaintenanceWorkOrderController + asset/labor integration |

## B. Spine Endpoint Status

| Spine Family | Status | Notes |
|---|---|---|
| workflow-instances | PARTIAL | State tracked per resource; no global query |
| workflow-tasks | MISSING | No `/api/v1/workflow-tasks` |
| approval-groups | YES | `/api/v1/governance/approval-groups` full-featured |
| work-inbox | MISSING | `/mobile_my_queue` exists, no formal REST |
| record-annotations | PARTIAL | Comments sub-resource on regulated modules |
| attachments | YES | `/api/v1/governance/attachments/*` |
| evidence-records | PARTIAL | Legacy `/api/evidence`; no canonical v1 |
| electronic-signature-challenge | YES | Implicit in signature workflows |
| electronic-signature-issued | YES | Signatures sub-resource on regulated modules |
| audit-events | PARTIAL | `/audit` sub-resource per module; no global search |
| audit-packs | YES | Async export jobs |
| record-links | YES | Relationships sub-resource (link/unlink) |
| genealogy-edge-facts | YES | `/api/v1/mom/traceability/genealogy` |
| genealogy-graphs | YES | UnifiedEvidenceGraphService |
| notifications | PARTIAL | NotificationGateway exists; no REST |
| webhook-subscriptions | MISSING | Stream `/api/v1/eqms/events/stream` only |
| jobs (export/async) | PARTIAL | 202 + job_id pattern; no `/api/v1/jobs` query |

## C. Bridge Alias Strategy

For YELLOW roots, the **fastest path to live API integration** is to add a REST alias in `mom/api/routes/rest-routes.php`:

```php
$router->get('/api/v1/nonconformance-cases', [EqmsNcrController::class, 'query']);
$router->get('/api/v1/capas', [EqmsCapaController::class, 'query']);
$router->get('/api/v1/controlled-documents', [EqmsDocumentsController::class, 'query']);
// ... etc
```

This unblocks frontend HMV4 fixture→live cutover with **zero new business logic**.

## D. Wave 1 Backend Readiness Verdict

**Top 3 most-ready roots** (lowest cost to GREEN):
1. **NQCASE** — Just needs plural alias; full backend exists
2. **CAPA** — Just needs plural alias; full backend exists
3. **CDOC** — Just needs plural alias; full backend exists

**Top 3 most-blocked roots** (need full implementation):
1. **PO** — Procurement domain not built
2. **MWO** — Maintenance domain not built
3. **PREC** — Inbound logistics not built

**Recommendation for Slice 3+ sequencing:**

Phase A (Slices 3-5, low backend cost): Pick slices for YELLOW roots so a single backend alias unblocks live data:
- Slice 3: Training Matrix (TRAIN — has EQMS backend)
- Slice 4: CAPA workspace (CAPA — has EQMS backend)
- Slice 5: Document Control (CDOC — has EQMS backend)

Phase B (Slices 6-9, build legacy reformat): SO/JO/WO orders + dispatch
- Slice 6: Sales Order shell
- Slice 7: Job Order shell
- Slice 8: Work Order shell
- Slice 9: Dispatch full lifecycle

Phase C (Slices 10-15, full backend creation): RED roots
- Slice 10+: QUO, PO, IREV, PREC, LOT, MWO (each requires backend phase)

This sequencing maximizes value per slice while minimizing backend write-up cost.

## File References

- `/Users/a10/Documents/mom/mom/api/openapi.yaml`
- `/Users/a10/Documents/mom/mom/api/openapi-eqms-worldclass.yaml`
- `/Users/a10/Documents/mom/mom/api/routes/rest-routes.php`
- `/Users/a10/Documents/mom/mom/api/routes/core-routes.php`
- `/Users/a10/Documents/mom/mom/api/routes/eqms-quality-routes.php`
- `/Users/a10/Documents/mom/mom/api/controllers/`
