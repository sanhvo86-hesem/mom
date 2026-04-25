# UPGRADE PROMPT PACK 3 — Backend Alignment

**Stream**: C (Backend alignment — parallel with Streams A/B/D/E)
**Goal**: Bridge backend canonical paths so HMV4 fixture→live cutover is unblocked
**Total prompts**: 4 (parallel — different scopes, can run in different sessions)

These prompts target backend PHP code. They require a Codex session with
PHP awareness and authority to modify `mom/api/`. Each prompt is its own
branch and PR.

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
Do not modify EQMS controllers (they're correct as-is).
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

Forbidden:
  Any HMV4 frontend file (mom/scripts/portal/7?-module-template-v4-*.js)
  Any forbidden file from CLAUDE.md
  Existing EQMS controllers (do not modify)

Aliases to add (in mom/api/routes/rest-routes.php):

  Group: 'eqms-plural-aliases'
  
  GET    /api/v1/nonconformance-cases               → EqmsNcrController::query
  POST   /api/v1/nonconformance-cases               → EqmsNcrController::create
  GET    /api/v1/nonconformance-cases/{id}          → EqmsNcrController::detail
  PUT    /api/v1/nonconformance-cases/{id}          → EqmsNcrController::update
  GET    /api/v1/nonconformance-cases/{id}/audit    → EqmsNcrController::audit
  GET    /api/v1/nonconformance-cases/{id}/comments → EqmsNcrController::comments_list
  POST   /api/v1/nonconformance-cases/{id}/comments → EqmsNcrController::comments_create
  GET    /api/v1/nonconformance-cases/{id}/attachments → EqmsNcrController::attachments_list
  POST   /api/v1/nonconformance-cases/{id}/attachments → EqmsNcrController::attachments_create
  POST   /api/v1/nonconformance-cases/{id}:contain  → EqmsNcrController::action_contain
  POST   /api/v1/nonconformance-cases/{id}:investigate → EqmsNcrController::action_investigate
  POST   /api/v1/nonconformance-cases/{id}:close    → EqmsNcrController::action_close
  POST   /api/v1/nonconformance-cases/{id}:reopen   → EqmsNcrController::action_reopen

  Same pattern for:
    /api/v1/capas              → EqmsCapaController
    /api/v1/controlled-documents → EqmsDocumentsController
    /api/v1/inspections         → EqmsInspectionController (handle iqc + inprocess unification)
    /api/v1/batch-releases     → EqmsBatchReleaseController
    /api/v1/engineering-changes → EqmsEngineeringChangeController
    /api/v1/training-records    → EqmsTrainingController

Total: 7 plural aliases × ~13 routes each = ~91 new route registrations.

Step 1: Inspect existing route file structure:

  cat mom/api/routes/rest-routes.php | head -50
  cat mom/api/routes/eqms-quality-routes.php | head -50

Step 2: Add a new group block in rest-routes.php at the appropriate
section. Use existing pattern as reference:

  // ─────────────────────────────────────────────────────────────
  // EQMS plural-form REST aliases
  // Frontend Step 3 canonical paths delegate to existing EQMS
  // controllers (which use singular form internally).
  // ─────────────────────────────────────────────────────────────
  $router->get('/api/v1/nonconformance-cases', [EqmsNcrController::class, 'query']);
  ...

Step 3: Validate aliases produce identical responses.

For each alias, run:
  curl -s 'http://127.0.0.1:8090/api/v1/eqms/ncr?limit=1' | jq -c '.[0].id'
  curl -s 'http://127.0.0.1:8090/api/v1/nonconformance-cases?limit=1' | jq -c '.[0].id'
  # Should return same id

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
  mom/api/controllers/OrderController.php (no business logic change)
  Any HMV4 frontend file
  Any forbidden file from CLAUDE.md

Routes to add (canonical):

  GET    /api/v1/sales-orders                  → OrderController::listSalesOrders
  GET    /api/v1/sales-orders/{id}             → OrderController::getSalesOrderDetail
  POST   /api/v1/sales-orders                  → OrderController::createSalesOrder
  PUT    /api/v1/sales-orders/{id}             → OrderController::updateSalesOrder
  POST   /api/v1/sales-orders/{id}:transition  → OrderController::transition (with type=sales)

  GET    /api/v1/job-orders                    → OrderController::listJobOrders
  GET    /api/v1/job-orders/{id}               → OrderController::getJobOrderDetail
  POST   /api/v1/job-orders                    → OrderController::createJobOrder
  PUT    /api/v1/job-orders/{id}               → OrderController::updateJobOrder
  POST   /api/v1/job-orders/{id}:transition    → OrderController::transition (with type=job)

  GET    /api/v1/work-orders                   → OrderController::listWorkOrders (add if missing)
  GET    /api/v1/work-orders/{id}              → OrderController::getWorkOrderDetail (add if missing)
  POST   /api/v1/work-orders                   → OrderController::createWorkOrder
  PUT    /api/v1/work-orders/{id}              → OrderController::updateWorkOrder
  POST   /api/v1/work-orders/{id}:transition   → OrderController::transition (with type=work)

Note: WO list/detail may not exist on OrderController. If missing, add
minimal pass-through methods that wrap existing query/projection logic.

Legacy redirects to add (in core-routes.php, return 301 with Location header):

  /api/orders/sales         → /api/v1/sales-orders
  /api/orders/sales/{id}    → /api/v1/sales-orders/{id}
  /api/orders/jobs          → /api/v1/job-orders
  /api/orders/jobs/{id}     → /api/v1/job-orders/{id}
  /api/orders/work          → /api/v1/work-orders
  /api/orders/work/{id}     → /api/v1/work-orders/{id}

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

Step 1: Add canonical routes in rest-routes.php:

  GET    /api/v1/customer-purchase-orders             → CustomerPurchaseOrderController::query
  GET    /api/v1/customer-purchase-orders/{id}        → CustomerPurchaseOrderController::detail
  POST   /api/v1/customer-purchase-orders             → CustomerPurchaseOrderController::create
  PUT    /api/v1/customer-purchase-orders/{id}        → CustomerPurchaseOrderController::update
  POST   /api/v1/customer-purchase-orders/{id}:transition → CustomerPurchaseOrderController::transition

Step 2: Add 301 redirects from legacy /commercial/ paths:

  /api/v1/commercial/customer-purchase-orders        → /api/v1/customer-purchase-orders
  /api/v1/commercial/customer-purchase-orders/{id}   → /api/v1/customer-purchase-orders/{id}

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
  /tmp/hesem-archive/extracted_HESEM_MOM_V18_*/all_artifacts/STEP2_WORKFLOW_MASTER.md

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
  /tmp/hesem-archive/extracted_HESEM_MOM_V18_*/all_artifacts/STEP3_API_MASTER.md

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
