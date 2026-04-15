# EQMS World-Class Surface — Remaining Gaps Analysis
**Date:** 2026-04-15  
**Author:** HESEM MOM AI Architect  
**Status:** Post-implementation audit  
**Scope:** Deliverables 4 of 6 from `eqms-worldclass-research-and-endpoint-plan.md`

---

## What Was Delivered (v4.0 Surface)

| Layer | Item | Status |
|-------|------|--------|
| Routes | `eqms-quality-routes.php` — 21 modules, ~280 endpoints | ✅ |
| Base | `EqmsBaseController.php` — shared EQMS cross-cutting logic | ✅ |
| Controllers | 19 `Eqms*Controller.php` files | ✅ |
| Migration | `136_eqms_worldclass_surface.sql` — 30+ new tables | ✅ |
| OpenAPI | `openapi-eqms-worldclass.yaml` — supplement spec | ✅ |
| Wiring | `index.php` route loader updated | ✅ |

---

## Gap 1 — Services Layer: Direct SQL in Controllers

### Problem
Controllers (`EqmsBatchReleaseController`, `EqmsValidationController`, `EqmsLabInvestigationsController`, `EqmsRisksController`, `EqmsFieldActionsController`) contain inline PDO queries. This violates the project convention that business logic lives in `mom/api/services/` and controllers are thin HTTP adapters.

### Missing Service Classes
| Service | Domain | Responsible Controller(s) |
|---------|--------|--------------------------|
| `BatchReleaseService` | Batch release aggregation, lot certification, market ship gate | `EqmsBatchReleaseController` |
| `ValidationManagementService` | IQ/OQ/PQ protocol lifecycle, traceability matrix, GAMP 5 | `EqmsValidationController` |
| `FieldActionService` | FDA 806/21 CFR 806, EU MDR 89/85, recall urgency routing | `EqmsFieldActionsController` |
| `LabInvestigationService` | OOS/OOT 2-phase investigation, FDA OOS guidance 2006 | `EqmsLabInvestigationsController` |
| `QualityRiskService` | ISO 31000 / ICH Q9 risk register, residual risk acceptance | `EqmsRisksController` |
| `MsaService` | GR&R, ANOVA / X-bar-R study, NDC, %GR&R thresholds | `EqmsCalibrationController` |
| `SupplierAuditService` | Supplier audit lifecycle, SCAR 8D, CAR closure | `EqmsSupplierAuditsController` |
| `DeviationService` | Deviation classification, impact assessment, regulatory reporting | `EqmsDeviationController` |
| `ChangeControlService` | Multi-level approval routing, impact checklist gate, training impact | `EqmsChangeControlController` |
| `QualityTowerService` | Control-tower aggregate queries, KPI roll-ups, SLA breach detection | _(not yet created)_ |

### Resolution Path
Extract controller SQL logic into services. Prioritize `BatchReleaseService` and `ValidationManagementService` first — they have the highest regulatory exposure. Follow the `ExceptionService` pattern for dependency injection via lazy constructor.

---

## Gap 2 — Quality Control Tower (Aggregates) Controller

### Problem
The research document defines a `QualityControlTower` module with aggregate KPI endpoints:
- `GET /api/v1/eqms/quality-tower/dashboard` — cross-module open items, overdue records, SLA breach
- `GET /api/v1/eqms/quality-tower/metrics` — DPPM, FTY, Cpk trend, CAPA closure rate, on-time calibration %
- `GET /api/v1/eqms/quality-tower/overdue-actions` — all modules contributing to overdue actions
- `GET /api/v1/eqms/quality-tower/compliance-calendar` — upcoming audit dates, calibration due, training expirations
- `POST /api/v1/eqms/quality-tower/export` — cross-module management review pack

### Status
Routes registered in `eqms-quality-routes.php`, table `eqms_quality_tower_snapshots` created in migration 136, but `EqmsQualityTowerController.php` was **not created**. The controller class reference in the route file will cause a fatal 500 if the endpoint is hit.

### Resolution Path
Create `EqmsQualityTowerController.php` with aggregate queries against the `eqms_*` table set plus snapshot materialization into `eqms_quality_tower_snapshots`. Register a cron job via `CronCreate` to refresh hourly snapshots for SLA-sensitive dashboards.

---

## Gap 3 — Quality Agreements (External Partner Collaboration)

### Problem
`eqms-quality-routes.php` routes `/api/v1/eqms/quality-agreements/*` to `EqmsSuppliersController` (via agreement-prefixed methods). These methods were added to `EqmsSuppliersController` but cover only the basic CRUD/query. The following are not implemented:

- `POST /api/v1/eqms/quality-agreements/{id}/actions/acknowledge` — partner acknowledgement of agreement terms
- `POST /api/v1/eqms/quality-agreements/{id}/actions/expire` — agreement expiration with renewal prompt
- Partner-facing read scope (agreements shared with external accounts)

### Resolution Path
Extend `EqmsSuppliersController` with `agreementActionAcknowledge()` and `agreementActionExpire()` methods following existing `disqualify` / `approve-qualification` patterns.

---

## Gap 4 — `.ai/` Index Not Updated

### Problem
`repo-map.json`, `route-map.json`, `symbols.json`, and `contracts-map.json` are all stale. They were generated before this session and do not reflect:
- 19 new `Eqms*Controller` classes
- ~280 new routes
- 30+ new `eqms_*` tables from migration 136
- New `EqmsBaseController` abstract class

Future AI sessions and the `generate.php` tooling will have outdated lookup data.

### Resolution Path
```bash
cd /Users/a10/Documents/mom
composer --working-dir=mom run ai:index
# or
php tools/scripts/ai-index/generate.php --verbose
```
Run after each significant surface change. The `.ai/module-summaries/quality-improvement.md` has been manually updated in this session — it will not be overwritten by re-indexing.

---

## Gap 5 — EqmsControlPlaneController Cross-Module Orchestration

### Problem
`EqmsControlPlaneController` (EQMS v3.0 control plane) manages approval groups, compliance gates, and evidence vaults but has no awareness of the 19 new v4.0 module controllers. Specifically:

- `ComplianceGateService` has no gate definitions for: Batch Release → Market Ship, Validation Protocol → Execution, Field Action → Launch
- `EvidenceVaultService` is not invoked from the new EQMS controllers on regulated state transitions
- `ApprovalGroupController` approval routing is not connected to `EqmsChangeControlController` multi-level approval routes

### Resolution Path
Wire `EqmsBaseController::requireElectronicSignature()` to call `EvidenceVaultService::storeSignatureEvidence()` rather than direct DB insert. Extend `ComplianceGateService` with gate configurations for the three new regulated gates above.

---

## Gap 6 — Formal Test Coverage

### Problem
No `mom/tests/` unit or integration tests exist for any of the 19 new EQMS controllers, the base controller's cross-cutting methods, or the migration 136 schema. (See `EQMS_WORLDCLASS_TEST_PLAN.md` for the full test plan.)

---

## Gap 7 — OpenAPI Supplement Registration

### Problem
`openapi-eqms-worldclass.yaml` is a standalone supplement spec but is not yet linked from the primary `openapi.yaml` as an `$ref` or linked via the API gateway config. Tooling that reads only `openapi.yaml` for route validation will miss the new endpoints.

### Resolution Path
Add a reference or import path in `openapi.yaml` under the servers / paths merge strategy, or configure the API validation middleware to load both specs. If using a single spec approach, merge via:
```bash
php tools/scripts/merge-openapi.php openapi.yaml openapi-eqms-worldclass.yaml > openapi-merged.yaml
```

---

## Priority Matrix

| Gap | Regulatory Risk | Breakage Risk | Effort | Priority |
|-----|----------------|---------------|--------|----------|
| Gap 2 — Tower Controller missing | None | HIGH (500 on route hit) | Medium | P0 |
| Gap 1 — Services layer missing | Medium | Medium (works, not layered) | High | P1 |
| Gap 4 — AI index stale | None | Low (agent confusion) | 5 min | P1 |
| Gap 5 — Control plane wiring | Medium | Low | Medium | P2 |
| Gap 3 — QA acknowledgement | Low | Low | Low | P2 |
| Gap 7 — OpenAPI merge | None | Low | Low | P2 |
| Gap 6 — Test coverage | High (audit evidence) | None | High | P2 |
