# UPGRADE PROMPT PACK 3 — Backend Alignment

**Stream**: C (Backend alignment — parallel with Streams A/B/D/E)
**Goal**: Bridge backend canonical paths so HMV4 fixture→live cutover is unblocked
**Total prompts**: 4 (parallel — different scopes, can run in different sessions)

These prompts target backend PHP code. They require a Codex session with
PHP awareness and authority to modify `mom/api/`. Each prompt is its own
branch and PR.

---

## Errata applied 2026-04-25

The original C1, C3, C4 prompts contained method-name and path errors
against the live codebase. They were corrected inline on this date.
For the full audit trail and rationale, see
[UPGRADE_PROMPT_PACK_3_CORRECTION_NOTE.md](UPGRADE_PROMPT_PACK_3_CORRECTION_NOTE.md).

Summary of inline changes:
- **C1**: `query` flagged as a new wrapper method (Q1 below); `comments_list`/
  `comments_create` collapsed to single `comments`; `attachments_list`/
  `attachments_create` collapsed to single `attachments`; `action_<verb>`
  snake_case → `action<Verb>` camelCase; `PUT` update verb → `PATCH`;
  EQMS-controllers forbidden constraint relaxed to permit additive
  GET-list wrapper methods only.
- **C2**: path params corrected from `{id}` to `{soNumber}`/`{joNumber}`/
  `{woNumber}` to match live routes; `OrderController::transition` does
  NOT auto-derive type from URL (it reads `order_type` from JSON body
  and accepts `so`/`jo`/`wo` not `sales`/`job`/`work`), so 3 new thin
  wrapper methods added (`transitionSalesOrder`, `transitionJobOrder`,
  `transitionWorkOrder`) plus `listWorkOrders`, `getWorkOrderDetail`
  which were missing; OrderController forbidden constraint relaxed
  the same way as C1.
- **C3**: all four method names corrected to actual controller methods
  (`listPurchaseOrders`, `getPurchaseOrder`, `createPurchaseOrder`,
  `transitionPurchaseOrder`); PUT update line removed because the
  controller has no `update*` method (escalated as separate work item);
  path param `{id}` → `{customerPoId}` to match the live route.
- **C4**: archive paths fixed from
  `/tmp/hesem-archive/extracted_HESEM_MOM_V18_*/all_artifacts/STEP{2,3}_*_MASTER.md`
  to `/tmp/hesem-archive/asset {2,3}/STEP{2,3}_*_MASTER.md`; explicit
  bail-out guard added when paths are missing.

Open policy questions for the operator (do not paste blindly):
1. **Q1 (C1)**: confirm scope expansion — adding `query()` wrappers on the
   7 EQMS controllers is additive (no existing logic changes), but
   contradicts the original "do not modify EQMS controllers" rule.
   Alternative: keep controllers untouched and ship `POST /api/v1/<plural>/query`
   → `search` instead of `GET /api/v1/<plural>` → `query`. The frozen-token
   contract favors GET; pick option A unless you want to revisit Step 3.
2. **Q2 (C3)**: PUT update on customer-purchase-orders is dropped from
   the alias scope. Schedule a separate task to add `updatePurchaseOrder()`
   if frontend needs it.
3. **Q3 (C4)**: archive path `/tmp/hesem-archive/asset {2,3}/` is on the
   developer's local machine. Either ensure these are present before
   running C4, or vendor STEP2/STEP3 master excerpts into the repo.

---

## C1 — EQMS Plural-Form REST Aliases 🟢 (parallel with C2, C3, C4, Streams A/B/D/E)

### When to run
After Slice 3 planning approval (so frontend slice 3+ knows live API is coming).

### User must say
```
Proceed with EQMS plural-form REST alias backend work.
```

### Background
Per `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md`,
6+ Wave 1 EQMS roots have full backends but use SINGULAR form
(`/api/v1/eqms/ncr`, `/api/v1/eqms/capa`, etc.). Step 3 frozen API
tokens use PLURAL form (`/api/v1/nonconformance-cases`, `/api/v1/capas`).

This prompt adds plural-form REST aliases that delegate to the existing
controllers. Zero new business logic; minimum risk.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are adding plural-form REST aliases for EQMS resources, so the
HMV4 frontend can use Step 3 frozen canonical paths.

Do not change EQMS business logic.
You MAY add additive GET-list wrapper methods (named `query`) on the
seven EQMS controllers below — these wrappers MUST delegate to the
existing `search` projection and not introduce new query semantics.
Do not modify any other EQMS controller method.
Do not modify HMV4 frontend.
Do not change forbidden files.

Required base branch:
  codex/backend-eqms-aliases

Created from:
  origin/main

Allowed files:
  mom/api/routes/rest-routes.php
  mom/api/routes/eqms-quality-routes.php (only if needed for re-export)
  mom/api/openapi.yaml (update spec to reflect aliases)
  _reports/module-template-v4/S_BACKEND_EQMS_*.md
  mom/data/registry/endpoint-catalog.json (regenerate after route changes)
  mom/data/registry/endpoint-catalog-index.json
  mom/api/controllers/EqmsNcrController.php           (additive query() only)
  mom/api/controllers/EqmsCapaController.php          (additive query() only)
  mom/api/controllers/EqmsDocumentsController.php     (additive query() only)
  mom/api/controllers/EqmsInspectionController.php    (additive query() only)
  mom/api/controllers/EqmsBatchReleaseController.php  (additive query() only)
  mom/api/controllers/EqmsEngineeringChangeController.php (additive query() only)
  mom/api/controllers/EqmsTrainingController.php      (additive query() only)

Forbidden:
  Any HMV4 frontend file (mom/scripts/portal/7?-module-template-v4-*.js)
  Any forbidden file from CLAUDE.md
  Modifying any existing method on the EQMS controllers above (only
    adding a new `query()` is permitted)

Aliases to add (in mom/api/routes/rest-routes.php):

  Group: 'eqms-plural-aliases'

  Verified actual method names — do NOT change these without re-verifying
  against mom/api/controllers/Eqms*.php. The existing controllers expose
  `search` (POST-body filter) but no `query` (GET list); see Step 0.

  GET    /api/v1/nonconformance-cases                  → EqmsNcrController::query        (NEW wrapper)
  POST   /api/v1/nonconformance-cases                  → EqmsNcrController::create
  GET    /api/v1/nonconformance-cases/{id}             → EqmsNcrController::detail
  PATCH  /api/v1/nonconformance-cases/{id}             → EqmsNcrController::update
  GET    /api/v1/nonconformance-cases/{id}/audit       → EqmsNcrController::audit
  GET    /api/v1/nonconformance-cases/{id}/comments    → EqmsNcrController::comments
  POST   /api/v1/nonconformance-cases/{id}/comments    → EqmsNcrController::comments
  GET    /api/v1/nonconformance-cases/{id}/attachments → EqmsNcrController::attachments
  POST   /api/v1/nonconformance-cases/{id}/attachments → EqmsNcrController::attachments
  POST   /api/v1/nonconformance-cases/{id}:contain     → EqmsNcrController::actionContain
  POST   /api/v1/nonconformance-cases/{id}:investigate → EqmsNcrController::actionInvestigate
  POST   /api/v1/nonconformance-cases/{id}:close       → EqmsNcrController::actionClose
  POST   /api/v1/nonconformance-cases/{id}:reopen      → EqmsNcrController::actionReopen

  Same pattern for:
    /api/v1/capas              → EqmsCapaController
    /api/v1/controlled-documents → EqmsDocumentsController
    /api/v1/inspections         → EqmsInspectionController (handle iqc + inprocess unification)
    /api/v1/batch-releases     → EqmsBatchReleaseController
    /api/v1/engineering-changes → EqmsEngineeringChangeController
    /api/v1/training-records    → EqmsTrainingController

Total: 7 plural aliases × ~13 routes each = ~91 new route registrations.
Plus 7 new `query()` wrapper methods (one per EQMS controller).

Step 0: Add additive `query()` wrappers on the 7 EQMS controllers.

For each of EqmsNcrController, EqmsCapaController, EqmsDocumentsController,
EqmsInspectionController, EqmsBatchReleaseController,
EqmsEngineeringChangeController, EqmsTrainingController, add:

  /**
   * GET list wrapper. Delegates to existing search() projection by
   * mapping query-string filters into the search filter shape.
   * Pure delegation — no new query semantics.
   */
  public function query(): never
  {
      return $this->search();
  }

If `search()` reads its filters from POST body only, add a small
adapter that also accepts query-string params. Do NOT change the
filter dictionary or response shape.

Step 1: Inspect existing route file structure:

  cat mom/api/routes/rest-routes.php | head -50
  cat mom/api/routes/eqms-quality-routes.php | head -50

Step 2: Add a new group block in rest-routes.php at the appropriate
section. Use existing pattern as reference. Note path-segment for
GET routes uses positional params; colon-action for POST verbs:

  // ─────────────────────────────────────────────────────────────
  // EQMS plural-form REST aliases
  // Frontend Step 3 canonical paths delegate to existing EQMS
  // controllers (which use singular form internally).
  // ─────────────────────────────────────────────────────────────
  $router->get  ('/api/v1/nonconformance-cases',                  EqmsNcrController::class, 'query');
  $router->post ('/api/v1/nonconformance-cases',                  EqmsNcrController::class, 'create');
  $router->get  ('/api/v1/nonconformance-cases/{id}',             EqmsNcrController::class, 'detail');
  $router->patch('/api/v1/nonconformance-cases/{id}',             EqmsNcrController::class, 'update');
  $router->post ('/api/v1/nonconformance-cases/{id}:contain',     EqmsNcrController::class, 'actionContain');
  // ... etc.

Step 3: Validate aliases produce identical responses.

For each alias, run:
  curl -s 'http://127.0.0.1:8090/api/v1/eqms/ncr/query' -X POST -d '{"limit":1}' | jq -c '.[0].id'
  curl -s 'http://127.0.0.1:8090/api/v1/nonconformance-cases?limit=1' | jq -c '.[0].id'
  # Should return same id (the new GET wrapper must produce the same
  # row order and shape as the legacy POST search).

If responses differ, investigate (controller method may need slight
adaptation for the alias context).

Step 4: Update mom/api/openapi.yaml to add plural paths as alternative
endpoints. Use 'externalDocs' or 'description' to indicate canonical.

Step 5: Regenerate endpoint catalog:
  composer --working-dir=mom run ai:index
  OR
  php tools/scripts/ai-index/generate.php --verbose

Step 6: Run existing PHPUnit suite to confirm no regression:
  cd mom
  ./vendor/bin/phpunit --testdox

Step 7: Add a new contract test (optional but recommended):

  mom/tests/contract/EqmsPluralAliasTest.php
  
  Asserts that GET /api/v1/nonconformance-cases returns same shape as
  GET /api/v1/eqms/ncr.

Generate report:
  _reports/module-template-v4/S_BACKEND_EQMS_ALIASES_REPORT.md

Sections:
  ## Summary
  ## Aliases added (count + list)
  ## Validation: alias vs canonical response equivalence
  ## OpenAPI spec updated
  ## Endpoint catalog regenerated
  ## PHPUnit regression result
  ## New contract test (if added)
  ## Rollback notes
  ## Decision

Decision phrase output (one of):
  EQMS_ALIASES_PASS_READY_FOR_REVIEW
  EQMS_ALIASES_PASS_WITH_WARNINGS
  EQMS_ALIASES_FAIL_BLOCK_NEXT
```

### Expected outputs
- ~91 new route registrations
- OpenAPI spec updated
- Endpoint catalog regenerated
- PHPUnit pass
- 1 backend report

### Estimated time
4-6 hours Codex execution (inspect, add, validate, test).

---

## C2 — Transactional REST Formalization 🟢 (parallel with C1, C3, C4)

### When to run
Before Slice 9 (JO).

### User must say
```
Proceed with transactional REST formalization (SO/JO/WO).
```

### Background
SO, JO, WO have legacy `/api/orders/*` paths. Step 3 frozen tokens are
plural under `/api/v1/sales-orders`, `/api/v1/job-orders`, `/api/v1/work-orders`.
This prompt adds canonical REST routes (delegating to existing
OrderController) and 301-redirects from legacy paths.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are formalizing canonical REST routes for sales-orders, job-orders,
work-orders. Backend logic exists in OrderController; this prompt only
adds canonical paths and 301 redirects from legacy paths.

Do not change OrderController business logic.
Do not change forbidden files.
Do not modify HMV4 frontend.

Required base branch:
  codex/backend-transactional-rest

Created from:
  origin/main

Allowed files:
  mom/api/routes/rest-routes.php
  mom/api/routes/core-routes.php (for legacy redirects)
  mom/api/openapi.yaml
  _reports/module-template-v4/S_BACKEND_TRANSACTIONAL_*.md
  mom/data/registry/endpoint-catalog.json (regenerate)

Forbidden:
  Modifying any existing method on OrderController.php (only adding
    `transitionSalesOrder`, `transitionJobOrder`, `transitionWorkOrder`,
    `listWorkOrders`, `getWorkOrderDetail` is permitted — these are
    additive wrappers around existing logic)
  Any HMV4 frontend file
  Any forbidden file from CLAUDE.md

Routes to add (canonical).

  Verified against mom/api/controllers/OrderController.php and
  mom/api/routes/rest-routes.php (lines 164-173). Path params on the
  legacy routes are `{soNumber}`, `{joNumber}`, `{woNumber}` — keep these
  same names on the canonical routes so the controller's body/path
  reading logic stays compatible.

  GET    /api/v1/sales-orders                          → OrderController::listSalesOrders
  GET    /api/v1/sales-orders/{soNumber}               → OrderController::getSalesOrderDetail
  POST   /api/v1/sales-orders                          → OrderController::createSalesOrder
  PUT    /api/v1/sales-orders/{soNumber}               → OrderController::updateSalesOrder
  POST   /api/v1/sales-orders/{soNumber}:transition    → OrderController::transitionSalesOrder    (NEW wrapper)

  GET    /api/v1/job-orders                            → OrderController::listJobOrders
  GET    /api/v1/job-orders/{joNumber}                 → OrderController::getJobOrderDetail
  POST   /api/v1/job-orders                            → OrderController::createJobOrder
  PUT    /api/v1/job-orders/{joNumber}                 → OrderController::updateJobOrder
  POST   /api/v1/job-orders/{joNumber}:transition      → OrderController::transitionJobOrder      (NEW wrapper)

  GET    /api/v1/work-orders                           → OrderController::listWorkOrders          (NEW)
  GET    /api/v1/work-orders/{woNumber}                → OrderController::getWorkOrderDetail      (NEW)
  POST   /api/v1/work-orders                           → OrderController::createWorkOrder
  PUT    /api/v1/work-orders/{woNumber}                → OrderController::updateWorkOrder
  POST   /api/v1/work-orders/{woNumber}:transition     → OrderController::transitionWorkOrder     (NEW wrapper)

Important: existing OrderController::transition (line 1116) reads
`order_type`/`order_id`/`target_status` from the JSON body and only
accepts order_type values `so`/`jo`/`wo` (NOT `sales`/`job`/`work`).
The colon-action canonical paths cannot delegate directly. Add three
new thin wrappers that derive `order_type` from the path and forward
to the existing transition() implementation:

  public function transitionSalesOrder(): never {
      $body = $this->jsonBody();
      $body['order_type'] = 'so';
      $body['order_id']   = $this->routeParam('soNumber') ?? ($body['order_id'] ?? '');
      $this->setJsonBody($body);
      return $this->transition();
  }
  // ...likewise transitionJobOrder ('jo'/joNumber), transitionWorkOrder ('wo'/woNumber)

These three new methods are additive (no logic change inside transition()).
listWorkOrders / getWorkOrderDetail are also new (pack acknowledged
they may be missing — verified missing as of 2026-04-25).

Update the Allowed-files section accordingly:

  mom/api/controllers/OrderController.php (additive — only the four NEW
    methods above; do NOT modify any existing method)

Legacy redirects to add (in core-routes.php, return 301 with Location header):

  /api/orders/sales                       → /api/v1/sales-orders
  /api/orders/sales/{soNumber}            → /api/v1/sales-orders/{soNumber}
  /api/orders/jobs                        → /api/v1/job-orders
  /api/orders/jobs/{joNumber}             → /api/v1/job-orders/{joNumber}
  /api/orders/work                        → /api/v1/work-orders
  /api/orders/work/{woNumber}             → /api/v1/work-orders/{woNumber}

Step 1-7 follow the same pattern as C1.

Step 7 (additional): contract test for legacy → canonical 301 redirect:

  mom/tests/contract/TransactionalLegacyRedirectTest.php
  
  Asserts that GET /api/orders/sales returns 301 with Location header
  pointing to /api/v1/sales-orders.

Generate:
  _reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md

Decision phrase output (one of):
  TRANSACTIONAL_REST_PASS_READY_FOR_REVIEW
  TRANSACTIONAL_REST_PASS_WITH_WARNINGS
  TRANSACTIONAL_REST_FAIL_BLOCK_NEXT
```

### Expected outputs
- ~15 canonical routes
- ~6 legacy redirects
- OpenAPI updated
- 1 contract test
- 1 backend report

### Estimated time
3-4 hours.

---

## C3 — CPO Canonical Path Rename 🟢 (parallel with C1, C2, C4)

### When to run
Before Slice 12 (CPO).

### User must say
```
Proceed with CPO canonical path rename.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are renaming CPO canonical path from
  /api/v1/commercial/customer-purchase-orders
to
  /api/v1/customer-purchase-orders
per Step 3 frozen path.

Required base branch:
  codex/backend-cpo-rename

Created from:
  origin/main

Allowed:
  mom/api/routes/rest-routes.php
  mom/api/openapi.yaml
  mom/data/registry/endpoint-catalog.json
  _reports/module-template-v4/S_BACKEND_CPO_*.md

Forbidden:
  CustomerPurchaseOrderController (no logic change)
  Any HMV4 frontend file

Step 1: Add canonical routes in rest-routes.php.

  Verified actual method names against
  mom/api/controllers/CustomerPurchaseOrderController.php (lines 235,
  264, 294, 321). Path param is `{customerPoId}` (verified at
  rest-routes.php:108-111) — do NOT change to `{id}` because the
  controller methods read `customerPoId` from the route context.

  GET   /api/v1/customer-purchase-orders                       → CustomerPurchaseOrderController::listPurchaseOrders
  GET   /api/v1/customer-purchase-orders/{customerPoId}        → CustomerPurchaseOrderController::getPurchaseOrder
  POST  /api/v1/customer-purchase-orders                       → CustomerPurchaseOrderController::createPurchaseOrder
  POST  /api/v1/customer-purchase-orders/{customerPoId}:transition → CustomerPurchaseOrderController::transitionPurchaseOrder

  PUT update intentionally omitted: CustomerPurchaseOrderController has
  no `update*` method as of 2026-04-25. Adding it would be a logic
  change and is out of scope for this rename. Track separately if the
  frontend requires PUT.

Step 2: Add 301 redirects from legacy /commercial/ paths:

  /api/v1/commercial/customer-purchase-orders                  → /api/v1/customer-purchase-orders
  /api/v1/commercial/customer-purchase-orders/{customerPoId}   → /api/v1/customer-purchase-orders/{customerPoId}

Step 3-5: Same as C1 (validate equivalence, update OpenAPI, regen
catalog, run PHPUnit).

Generate:
  _reports/module-template-v4/S_BACKEND_CPO_RENAME_REPORT.md

Decision phrase output (one of):
  CPO_RENAME_PASS_READY_FOR_REVIEW
  CPO_RENAME_PASS_WITH_WARNINGS
  CPO_RENAME_FAIL_BLOCK_NEXT
```

### Estimated time
1-2 hours.

---

## C4 — RED Root Controllers Kickoff 🔴 (depends on C1+C2 baseline; parallel with C3)

### When to run
After Slice 8 lands. RED roots (QUO, PO, IREV, PREC, LOT, MWO) need full backend creation.

### User must say (per root, sequentially)
```
Proceed with RED root <ROOT> controller kickoff.
```

### Background
6 RED roots have zero backend. This prompt is per-root and creates a
basic controller with CRUD + state machine skeleton. Each RED root is
its own ~2-3 day backend phase.

### Per-root prompt template

```text
You are in local repo sanhvo86-hesem/mom.

You are creating the backend controller for the <ROOT_CODE> root,
which currently has no implementation.

Do not change forbidden files.
Do not modify other backend controllers.

Required base branch:
  codex/backend-<root>-controller

Created from:
  origin/main

Allowed:
  mom/api/controllers/<RootName>Controller.php (create new)
  mom/api/services/<RootName>Service.php (create new)
  mom/api/routes/rest-routes.php (register routes)
  mom/api/openapi.yaml (add paths)
  mom/api/migrations/<NNN>_<root>_table.sql (if database table needed)
  mom/data/registry/endpoint-catalog.json
  _reports/module-template-v4/S_BACKEND_<ROOT>_*.md
  mom/tests/contract/<RootName>Test.php (new)
  mom/tests/unit/<RootName>ServiceTest.php (new)

Forbidden:
  Any other backend controller
  Any HMV4 frontend file
  Any forbidden file from CLAUDE.md

Step 1: Read Step 2 workflow schema for the root in:
  /tmp/hesem-archive/asset 2/STEP2_WORKFLOW_MASTER.md

  If this path does not exist on the local machine, STOP and report
  STEP2_ARCHIVE_MISSING. Do not proceed with assumptions about the
  state machine — incorrect state names cascade into broken contract
  tests and incorrect role permissions. Ask the operator to either
  restore /tmp/hesem-archive or vendor a STEP2_<ROOT>.md excerpt into
  _reports/module-template-v4/ before re-running.

Find the section for <ROOT_CODE> and extract:
  - canonical states
  - initial state
  - terminal states
  - allowed transitions
  - guards
  - role permissions
  - side effects
  - linked artifacts

Step 2: Read Step 3 API surface for the root in:
  /tmp/hesem-archive/asset 3/STEP3_API_MASTER.md

  Same bail-out rule: if missing, STOP and report STEP3_ARCHIVE_MISSING.

Find the section for <ROOT_CODE> and extract:
  - canonical resource path: /api/v1/<resource-family>
  - CRUD endpoints
  - transition endpoints
  - link/unlink endpoints
  - projection endpoints

Step 3: Create database migration if table doesn't exist:
  mom/api/migrations/<NNN>_<root>_table.sql

Schema must include:
  - id (uuid primary key)
  - created_at, updated_at, created_by, updated_by
  - state (text, indexed)
  - <root-specific fields per Step 2 schema>
  - workflow_instance_id (link to workflow-instances spine)
  - audit_chain_seq (link to audit-events spine)

Step 4: Create service class:
  mom/api/services/<RootName>Service.php

Implement:
  - query(filters, pagination)
  - getById(id)
  - create(payload)
  - update(id, payload)
  - applyTransition(id, action, evidence)
  - linkRecord(id, target_resource_family, target_id)

Wire in dependencies on existing spines (workflow-instances,
evidence-records, audit-events).

Step 5: Create controller class:
  mom/api/controllers/<RootName>Controller.php

Implement HTTP handlers that delegate to service.

Step 6: Register routes in rest-routes.php using same pattern as C1.

Step 7: Update OpenAPI:
  mom/api/openapi.yaml (add paths and schema)

Step 8: Regenerate endpoint catalog.

Step 9: Add contract test:
  mom/tests/contract/<RootName>Test.php

Asserts:
  - GET /api/v1/<resource-family> returns 200 with array
  - POST /api/v1/<resource-family> creates record
  - GET /api/v1/<resource-family>/{id} returns 200 with record
  - POST /api/v1/<resource-family>/{id}:transition with valid action transitions state
  - POST /api/v1/<resource-family>/{id}:transition with invalid guard returns 422

Step 10: Add unit test:
  mom/tests/unit/<RootName>ServiceTest.php

Asserts state machine logic per Step 2 schema (allowed transitions,
guards, terminal states).

Step 11: Run PHPUnit:
  cd mom && ./vendor/bin/phpunit

Generate:
  _reports/module-template-v4/S_BACKEND_<ROOT>_CONTROLLER_REPORT.md

Sections:
  ## Summary
  ## Step 2 schema reference
  ## Step 3 path reference
  ## Migration created
  ## Service class
  ## Controller class
  ## Routes registered
  ## OpenAPI updated
  ## Contract tests
  ## Unit tests
  ## PHPUnit result
  ## Decision

Decision phrase output (one of):
  <ROOT>_CONTROLLER_PASS_READY_FOR_REVIEW
  <ROOT>_CONTROLLER_PASS_WITH_WARNINGS
  <ROOT>_CONTROLLER_FAIL_BLOCK_NEXT
```

### Run order for RED roots

| Order | Root | Prerequisite | Estimated time |
|---:|---|---|---|
| 1 | QUO | C1 (workflow spine ready) | 2-3 days |
| 2 | PO | QUO (similar pattern) | 2-3 days |
| 3 | LOT | PO (genealogy spine) | 3-4 days |
| 4 | IREV | LOT (item-revisions link) | 2-3 days |
| 5 | PREC | LOT (lot creation downstream) | 2-3 days |
| 6 | MWO | (independent) | 2-3 days |

### Total Pack 3 timing (if backend SME serial)

| Step | Time |
|---|---|
| C1 EQMS aliases | 4-6 hr |
| C2 Transactional REST | 3-4 hr |
| C3 CPO rename | 1-2 hr |
| C4 RED roots (6 sequential) | ~15 days |
| **Total Phase A backend** (C1+C2+C3) | ~1.5 weeks |
| **Total Phase B/C backend** (C4) | ~3 weeks |

If 2 backend devs run C1+C2 parallel and C3 by another, total ~5 days for C1+C2+C3.
