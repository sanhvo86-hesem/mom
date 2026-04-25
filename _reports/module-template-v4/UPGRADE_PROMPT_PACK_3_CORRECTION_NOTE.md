# UPGRADE PROMPT PACK 3 — Correction Note

**Date**: 2026-04-25
**Author**: Claude Code (sanity-check pass)
**Target file**: `_reports/module-template-v4/UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md`
**Status**: Pack 3 prompts contain factual errors against the live codebase. Do **NOT** paste C1, C3, or C4 into Codex without applying the fixes below. C2 is largely correct.

---

## Why this note exists

Pack 3 was authored against an idealized backend surface. Verification against the actual repo (see `mom/api/controllers/Eqms*.php`, `mom/api/controllers/OrderController.php`, `mom/api/controllers/CustomerPurchaseOrderController.php`, `mom/api/routes/eqms-quality-routes.php`, `mom/api/routes/rest-routes.php`) reveals method-name and HTTP-verb mismatches that would cause Codex to write delegations to non-existent methods.

Same pattern as `V20_BRIDGE_ALIAS_POLICY_CORRECTION_NOTE.md`: the original pack stays intact for history; this note ships the corrected substitutions to apply at paste time.

---

## C1 — EQMS Plural-Form REST Aliases — ❌ HAS ERRORS

### Error 1: `query` method does not exist

Pack says: `GET /api/v1/nonconformance-cases → EqmsNcrController::query`

**Reality** (`grep -n "public function" mom/api/controllers/EqmsNcrController.php`):
- No `query` method on any of the 7 EQMS controllers (NCR, CAPA, Documents, Inspection, BatchRelease, EngineeringChange, Training).
- Closest analog is `search`, registered as `POST /api/v1/eqms/<resource>/query` — a POST-with-body search pattern, NOT a GET list.

**Fix options**:
- (a) Add new public `query()` methods on each controller that delegate to existing list-projection logic, then map `GET /api/v1/<plural>` → `query`. This is what Pack 3 implicitly requires.
- (b) Map `GET /api/v1/<plural>` to `search` (POST → GET adapter). Lower risk but breaks the POST-body filter pattern.
- (c) Keep the POST search shape: register `POST /api/v1/<plural>/query → search` instead of `GET /api/v1/<plural> → query`.

**Recommended**: (a) — add `query()` as a thin GET wrapper that converts query-string params into the `search` filter shape, so pagination/filter parity is preserved. Codex prompt must explicitly authorize creating these wrapper methods (currently the prompt forbids touching controllers).

### Error 2: `comments_list` / `comments_create` are wrong names

Pack says:
```
GET   /.../{id}/comments    → EqmsNcrController::comments_list
POST  /.../{id}/comments    → EqmsNcrController::comments_create
```

**Reality**: every EQMS controller exposes a single `comments()` method that handles both GET and POST internally (verified on NCR, CAPA, Documents, Inspection, BatchRelease, EngineeringChange, Training).

**Fix**: replace both `comments_list` and `comments_create` with `comments`.

### Error 3: `attachments_list` / `attachments_create` are wrong names

Same pattern as Error 2. Replace both with single method `attachments`.

### Error 4: `action_*` snake_case names are wrong

Pack says: `action_contain`, `action_investigate`, `action_close`, `action_reopen`.

**Reality**: methods are camelCase: `actionContain`, `actionInvestigate`, `actionClose`, `actionReopen` (verified on `EqmsNcrController.php:138-148` route registrations and `EqmsCapaController.php:855` / `EqmsEngineeringChangeController.php:488`).

**Fix**: replace `action_<verb>` with `action<Verb>` everywhere in C1.

### Error 5: HTTP verb for update is wrong

Pack says: `PUT /api/v1/nonconformance-cases/{id} → EqmsNcrController::update`

**Reality** (`mom/api/routes/eqms-quality-routes.php:124`): existing route is `PATCH`, not `PUT`. Method `update` exists; only the verb is wrong.

**Fix**: replace `PUT` with `PATCH` for all 7 EQMS update routes.

### Error 6: Action URL pattern decision is undocumented

Pack uses Step 3 frozen colon-action pattern: `POST /api/v1/.../{id}:contain`.
Existing controllers register path-segment pattern: `POST /api/v1/eqms/.../{id}/actions/contain`.

The colon-action delegation should still work because the controller method name (`actionContain`) is what matters, not the route shape. But the C1 prompt should explicitly state: **register colon-action routes that delegate to the same controller methods used by the legacy `/actions/<verb>` routes**. Otherwise Codex may believe it needs to introduce new methods.

### Corrected C1 alias table (minimum viable)

| Method | Plural path (canonical) | Controller method |
|---|---|---|
| GET | `/api/v1/nonconformance-cases` | NEW `query()` (or POST-body `search` via adapter) |
| POST | `/api/v1/nonconformance-cases` | `create` |
| GET | `/api/v1/nonconformance-cases/{id}` | `detail` |
| **PATCH** | `/api/v1/nonconformance-cases/{id}` | `update` |
| GET | `/api/v1/nonconformance-cases/{id}/audit` | `audit` |
| GET | `/api/v1/nonconformance-cases/{id}/comments` | `comments` |
| POST | `/api/v1/nonconformance-cases/{id}/comments` | `comments` |
| GET | `/api/v1/nonconformance-cases/{id}/attachments` | `attachments` |
| POST | `/api/v1/nonconformance-cases/{id}/attachments` | `attachments` |
| POST | `/api/v1/nonconformance-cases/{id}:contain` | `actionContain` |
| POST | `/api/v1/nonconformance-cases/{id}:investigate` | `actionInvestigate` |
| POST | `/api/v1/nonconformance-cases/{id}:close` | `actionClose` |
| POST | `/api/v1/nonconformance-cases/{id}:reopen` | `actionReopen` |

Same pattern for the other 6 EQMS controllers (CAPA, Documents, Inspection, BatchRelease, EngineeringChange, Training). Each ships ~13 routes; total ~91 — count is unchanged.

---

## C2 — Transactional REST Formalization — ❌ HAS ERRORS

Verified on `mom/api/controllers/OrderController.php` and route files:

| Pack says | Method exists? |
|---|---|
| `listSalesOrders` | ✅ line 474 |
| `getSalesOrderDetail` | ✅ line 535 |
| `createSalesOrder` | ✅ line 767 |
| `updateSalesOrder` | ✅ line 834 |
| `listJobOrders` | ✅ line 574 |
| `getJobOrderDetail` | ✅ line 629 |
| `createJobOrder` | ✅ line 893 |
| `updateJobOrder` | ✅ line 953 |
| `createWorkOrder` | ✅ line 1001 |
| `updateWorkOrder` | ✅ line 1067 |
| `transition` | ✅ line 1116 — but body-driven (see below) |
| `listWorkOrders` | ❌ MISSING |
| `getWorkOrderDetail` | ❌ MISSING |

### Error 1: Path params are wrong

Pack uses `{id}` for sales-orders, job-orders, work-orders. **Reality**: existing legacy routes (`mom/api/routes/rest-routes.php:164-173`) use `{soNumber}`, `{joNumber}`, `{woNumber}`. Controller methods read these names from route context — using `{id}` returns `null` for the lookup.

### Error 2: `transition` cannot delegate from `{id}:transition` directly

Pack says: `POST /api/v1/sales-orders/{id}:transition → OrderController::transition (with type=sales)`.

**Reality** (`OrderController.php:1116-1156`):
- `transition()` reads `order_type`, `order_id`, `target_status` from JSON body — NOT from URL.
- `order_type` is validated against `['so','jo','wo']` (line 1130). The pack's `type=sales|job|work` would fail validation.
- The URL `{id}` segment is unused unless a wrapper writes it back into `order_id`.

**Fix**: add 3 new thin wrapper methods on `OrderController` that derive `order_type` from the path and forward `order_id` from the URL into the body, then call the existing `transition()`. These are additive; no business logic change.

### Corrected C2 route table

| Method | Canonical path | Controller method |
|---|---|---|
| GET | `/api/v1/sales-orders` | `listSalesOrders` |
| GET | `/api/v1/sales-orders/{soNumber}` | `getSalesOrderDetail` |
| POST | `/api/v1/sales-orders` | `createSalesOrder` |
| PUT | `/api/v1/sales-orders/{soNumber}` | `updateSalesOrder` |
| POST | `/api/v1/sales-orders/{soNumber}:transition` | `transitionSalesOrder` (NEW wrapper, sets `order_type=so`) |
| GET | `/api/v1/job-orders` | `listJobOrders` |
| GET | `/api/v1/job-orders/{joNumber}` | `getJobOrderDetail` |
| POST | `/api/v1/job-orders` | `createJobOrder` |
| PUT | `/api/v1/job-orders/{joNumber}` | `updateJobOrder` |
| POST | `/api/v1/job-orders/{joNumber}:transition` | `transitionJobOrder` (NEW wrapper, sets `order_type=jo`) |
| GET | `/api/v1/work-orders` | `listWorkOrders` (NEW) |
| GET | `/api/v1/work-orders/{woNumber}` | `getWorkOrderDetail` (NEW) |
| POST | `/api/v1/work-orders` | `createWorkOrder` |
| PUT | `/api/v1/work-orders/{woNumber}` | `updateWorkOrder` |
| POST | `/api/v1/work-orders/{woNumber}:transition` | `transitionWorkOrder` (NEW wrapper, sets `order_type=wo`) |

C2's "no logic change on OrderController" rule must be relaxed (same as C1) to permit the 5 additive methods above.

---

## C3 — CPO Canonical Path Rename — ❌ HAS ERRORS

### Error 1: All four method names are wrong

Verified on `mom/api/controllers/CustomerPurchaseOrderController.php`:

| Pack says | Actual method |
|---|---|
| `query` | `listPurchaseOrders` (line 235) |
| `detail` | `getPurchaseOrder` (line 264) |
| `create` | `createPurchaseOrder` (line 294) |
| `update` | **does not exist** |
| `transition` | `transitionPurchaseOrder` (line 321) |

### Error 2: PUT update has nothing to delegate to

Pack prescribes `PUT /api/v1/customer-purchase-orders/{id} → ::update` but `CustomerPurchaseOrderController` has no `update` / `updatePurchaseOrder` method. Either drop the PUT route or add a new method on the controller (which contradicts the pack's "no logic change" forbidden constraint).

### Error 3: Path param name mismatch

Existing routes (`mom/api/routes/rest-routes.php:108-111`) use `{customerPoId}`. Pack uses `{id}`. The router can accept any param name, but the controller method reads `customerPoId` from the route context. If Codex registers `{id}` while the method expects `customerPoId`, the lookup will return null.

**Fix**: keep `{customerPoId}` (or update the controller to accept either, but that violates the "no logic change" rule).

### Corrected C3 alias table

| Method | Canonical path | Controller method |
|---|---|---|
| GET | `/api/v1/customer-purchase-orders` | `listPurchaseOrders` |
| GET | `/api/v1/customer-purchase-orders/{customerPoId}` | `getPurchaseOrder` |
| POST | `/api/v1/customer-purchase-orders` | `createPurchaseOrder` |
| ~~PUT~~ | DROP — no `update` method exists | — |
| POST | `/api/v1/customer-purchase-orders/{customerPoId}:transition` | `transitionPurchaseOrder` |

If PUT update is required for the frontend, add it as a separate work item (new controller method) and flag it as a logic change.

---

## C4 — RED Root Controllers Kickoff — ❌ ARCHIVE PATH ERROR

### Error: Step 1 / Step 2 archive paths are wrong

Pack says (Step 1 & Step 2):
```
/tmp/hesem-archive/extracted_HESEM_MOM_V18_*/all_artifacts/STEP2_WORKFLOW_MASTER.md
/tmp/hesem-archive/extracted_HESEM_MOM_V18_*/all_artifacts/STEP3_API_MASTER.md
```

**Reality**:
- `/tmp/hesem-archive/extracted_HESEM_MOM_V18_NONCONFORMANCE_IMPLEMENTATION_CODEX_PACKAGE/` contains only NCR-specific artifacts. No STEP2/STEP3 master files.
- STEP2/STEP3 masters DO exist, but at:
  - `/tmp/hesem-archive/asset 2/STEP2_WORKFLOW_MASTER.md` (most recent)
  - `/tmp/hesem-archive/asset 3/STEP3_API_MASTER.md` (most recent)
  - `/tmp/hesem-archive/HESEM_MOM_V6_ENTERPRISE_DELIVERY_CODEX_PACKAGE/all_artifacts/STEP{2,3}_*_MASTER.md` (older copies)

**Fix**: replace the C4 paths with:
```
/tmp/hesem-archive/asset 2/STEP2_WORKFLOW_MASTER.md
/tmp/hesem-archive/asset 3/STEP3_API_MASTER.md
```

…and also note this archive is on the developer's machine only, not in the repo — the prompt should bail out if the path is missing rather than silently proceeding.

### Concern: 6 RED roots in ~15 days is optimistic for greenfield controllers

Each RED root requires: migration + service + controller + routes + OpenAPI + contract test + unit test + state-machine logic per Step 2 schema. The 2–3 day estimate per root assumes Step 2/3 schemas are unambiguous and the workflow-instances/audit-events spines are already wired. Confirm both before kicking off.

---

## Summary table

| Prompt | Verdict | Action required before Codex paste |
|---|---|---|
| C1 EQMS aliases | ❌ Errors | Apply Errors 1–6 fixes; relax controller-forbidden rule to permit additive `query()` wrappers |
| C2 Transactional REST | ❌ Errors | Fix `{id}` → `{soNumber}`/`{joNumber}`/`{woNumber}`; add 3 transition wrappers + `listWorkOrders`/`getWorkOrderDetail`; relax controller-forbidden rule |
| C3 CPO rename | ❌ Errors | Apply method-name fixes; drop PUT or escalate as logic change |
| C4 RED roots | ❌ Path error | Fix archive paths; reconsider 2–3 day estimate per root |

**Update 2026-04-25 (later same day)**: All 4 prompts have now been patched inline in `UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md`. The fixes embed the correct substitutions and relax the controller-forbidden constraints where additive wrappers are required.

**Update 2026-04-25 (final)**: The three open policy questions have been resolved in the Errata banner of the patched pack:

- **Q1 → ADD `query()` wrappers** on the 7 EQMS controllers (preserves frozen Step 3 GET-list contract; cheaper than pivoting to POST search).
- **Q2 → DROP PUT update** on customer-purchase-orders permanently from C3 (legacy `/commercial/` route never had PUT either; schedule a separate ticket if frontend later needs edit).
- **Q3 → USE `/tmp/hesem-archive/asset {2,3}/`** with the existing bail-out guard (C4 won't run until after Slice 8; vendoring per-root excerpts is premature).

Pack 3 is now fully decision-locked. C1/C2/C3/C4 can be pasted verbatim.

---

## Decision

**Recommended next step**: apply the corrections inline to `UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md` so Codex can paste any C-prompt verbatim without per-paste mental fixups. Alternative is to leave the original pack untouched and require operators to read this note alongside it — higher cognitive load and risk of forgotten fixes.

**Outstanding questions for the user**:
1. Is creating new `query()` wrapper methods on EQMS controllers in scope for C1, or should the search-via-POST pattern be preserved (C1 maps `POST /api/v1/<plural>/search → search`)?
2. Should C3 keep the missing PUT update route as a TODO, or be expanded to add `updatePurchaseOrder()` on `CustomerPurchaseOrderController`?
3. Is the developer-machine archive at `/tmp/hesem-archive/asset {2,3}/` reliably present for C4 sessions, or should those master files be vendored into the repo?
