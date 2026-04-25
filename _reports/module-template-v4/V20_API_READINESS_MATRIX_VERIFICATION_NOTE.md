# V20 API Readiness Matrix — Verification Note

## Summary

The original `PARALLEL_RESEARCH_API_READINESS_MATRIX.md` (referenced by
ADR-0007 and ADR-0008) was generated without reading the codebase. This
note records corrections applied after spot-checking each row against
`mom/api/routes/*.php` and the EQMS controllers on branch
`codex/second-slice-planning-from-dispatch-qa`.

**Phase A sequencing (Slice 3 TRAIN → Slice 4 CAPA → Slice 5 CDOC) is
unaffected** — the YELLOW verdict for these EQMS roots holds under the
matrix rubric (full backend, non-canonical path), and the underlying
state machines plus electronic-signature integration are confirmed real
in code.

**Phase C scope shrinks**: three roots previously called RED have
partial backends and are actually YELLOW. The greenfield list contracts
from {QUO, PO, IREV, PREC, LOT, MWO} to {PO, IREV, LOT}.

The bridge-alias strategy in §C of the matrix and ADR-0008's 7-module
alias plan are both feasible; the registration idiom matches
`rest-routes.php`.

## Rubric reminder

- **GREEN** = canonical Step-3 path resolves directly, CRUD + transitions wired
- **YELLOW** = backend exists but at a non-canonical path, or lifecycle gaps
- **RED** = no backend implementation

A full state machine plus esign at `/api/v1/eqms/<root>` is YELLOW, not
GREEN, until the plural alias from ADR-0008 lands. This is the rubric
the original matrix used; verdicts in this note follow the same rule.

## Verdict changes

| Root | Original | Corrected | Reason |
|---|---|---|---|
| QUO | RED | YELLOW | Full CRUD + `convert-to-SO` action exists at `mom/api/routes/rest-routes.php:201-205` (`/api/quotes`, non-canonical path). Matrix claim "Legacy quote_* actions only. No REST" is incorrect. |
| PREC | RED | YELLOW | `eqms_purchase_receipts` table exists with `workflow_state` per contracts map. Shimmed via `/api/suppliers/incoming` (`mom/api/routes/rest-routes.php:194-195`) which writes through `SupplierController::createIncoming`. No canonical `/api/v1/purchase-receipts` yet. |
| MWO | RED | YELLOW | `eqms_maintenance_work_orders` table + workflow exist (per contracts map under `maintenance_ehs.maintenance-work-orders`). Read-only exposure via VPS observability; no CRUD REST. |

## Description corrections (verdict unchanged)

| Root | Matrix said | Code says | Note |
|---|---|---|---|
| CPO | "(singular path issue)" | `/api/v1/commercial/customer-purchase-orders` is **plural** at `mom/api/routes/rest-routes.php:108-111`. The gap is the `/commercial/` namespace, not singular form. | If Step 3 accepts `/api/v1/commercial/<plural>` as canonical, CPO is GREEN; otherwise YELLOW pending namespace flattening. |
| DISP | "Action shim (`dispatch_*`) on DispatchController; no REST" | Both exist: 11 `dispatch_*` action keys at `mom/api/routes/operations-routes.php:214-224`, plus REST readiness probe at `operations-routes.php:335` (`/api/planning/dispatch-readiness`). | Matrix description partially correct (action shims do exist). For Slice 9 (DISP full lifecycle), the action keys are the source of truth for the existing state machine — formalizing REST means re-exposing those handlers, not net-new logic. |
| WO | "partial legacy" | Only POST `/api/orders/work` and PUT `/api/orders/work/{woNumber}` at `mom/api/routes/rest-routes.php:172-173`. No GET list, no GET detail. | Confirms "partial" is right. Slice 8 (WO) needs at least LIST + GET/{id} added before fixture cutover. |
| INSP | "split iqc + inprocess" | Confirmed split: IQC and IPQC each have full state machine + esign in `mom/api/routes/eqms-quality-routes.php`. | ADR-0008 §"Inspection unification" already plans the canonical merge under `/api/v1/inspections` with subtype discriminator. |

## EQMS plural-alias sprint — confirmed scope

ADR-0008 commits to adding plural aliases for 7 modules. Code-level
confirmation that each backend is production-grade:

| Root | Singular path | State machine | Esign required | Verdict on alias readiness |
|---|---|---|---|---|
| NQCASE | `/api/v1/eqms/ncr` | draft → contain → investigate → mrb_review → disposition_set → rework_in_progress → closed | yes (per `EqmsBaseController::requireSignature`) | Alias-ready |
| CAPA | `/api/v1/eqms/capa` | draft → initiated → analysis → action_planning → pending_approval → approved → implementation → effectiveness_review → closed | yes | Alias-ready |
| CDOC | `/api/v1/eqms/documents` | draft → checked_out → review → pending_approval → approved → released → superseded → obsolete | yes (approve, release, supersede, obsolete) | Alias-ready |
| BREL | `/api/v1/eqms/batch-release` | initiated → data_aggregated → exceptions_reviewed → hold | approved → shipped | yes (approve-release, market-ship) | Alias-ready |
| ECO | `/api/v1/eqms/engineering-change` | draft → review → CCB → approved → implemented → verified → closed | yes | Alias-ready |
| TRAIN | `/api/v1/eqms/training` | assigned → in_progress → completed → effectiveness_review → verified → expired | yes | Alias-ready (matrix + curricula endpoints confirmed) |
| INSP | `/api/v1/mes/quality/iqc` + `/inprocess` | per-subtype state machines exist | yes | Alias **plus** unification needed (subtype discriminator per ADR-0008) |

All 7 are safe targets for Phase A / Phase B slices. None requires
backend logic change beyond route registration (and INSP unification).

## Spine endpoint refinements

Matrix entries that were imprecise but not flipped:

| Family | Matrix said | Refinement |
|---|---|---|
| electronic-signature-challenge | "Implicit in signature workflows" | Explicit endpoint `/api/v1/eqms/signature-challenges` at `mom/api/routes/eqms-control-plane-routes.php:41`. Status YES (matrix already had YES). |
| audit-packs | "Async export jobs" | Confirmed: `/api/v1/eqms/audit-packs/manifest` and `/export` at `eqms-control-plane-routes.php:45-46`. |
| genealogy-edge-facts | YES | Endpoint `/api/v1/eqms/genealogy/facts` at `eqms-control-plane-routes.php:48`. |
| genealogy-graphs | YES | `/api/v1/eqms/genealogy/as-manufactured` at `eqms-control-plane-routes.php:50`. |
| work-inbox | "/mobile_my_queue exists" | Not located on this branch. Likely removed or never landed. Confirmed MISSING. |

## Bridge-alias feasibility

The proposed idiom in §C of the matrix:

```php
$router->get('/api/v1/nonconformance-cases', [EqmsNcrController::class, 'query']);
```

is close to the actual `rest-routes.php` style but uses the wrong
signature. The file consistently uses positional class + method
(not array tuple):

```php
$router->get('/api/v1/finance/credit-memos', FinanceController::class, 'listCreditMemos');
```

When ADR-0008 implementation lands, the alias registrations should
follow the positional form to match the rest of the file. This is
purely a cosmetic correction to the matrix's example code.

## Sequencing impact

| Phase | Original plan | After verification |
|---|---|---|
| Phase A (Slices 3-5) | TRAIN, CAPA, CDOC | Unchanged. All three confirmed alias-ready. |
| Phase B (Slices 6-9) | SO, JO, WO, DISP | Unchanged. WO confirmed needs read-side (LIST + GET) added before fixture cutover. DISP has 11 action keys to formalize, not greenfield. |
| Phase C (Slices 10+) | QUO, PO, IREV, PREC, LOT, MWO | **Shrinks.** True greenfields: PO, IREV, LOT. Reformat-not-greenfield: QUO (existing `/api/quotes` REST), PREC (existing `/api/suppliers/incoming` shim + table), MWO (existing table + observability read). |

## Confidence gaps

Items not fully verified in this pass:

- **Quote → SO conversion semantics**: confirmed `/api/quotes/{id}/convert` route exists; did not trace `QuoteController::convertToSo` to verify it produces a real Sales Order vs. stub. Worth checking before Slice 10 (QUO) plan.
- **PREC purchase-receipt workflow state transitions**: contracts map declares `workflow=true` but transition methods on the receipt domain were not traced to a controller method. Worth checking before any PREC slice plan.
- **MWO data layer**: table existence verified via contracts map only, not by direct SQL inspection. Confirm `eqms_maintenance_work_orders` columns and workflow state values before any MWO slice plan.
- **Esign challenge/issue lifecycle**: `requireSignature` enforced in `EqmsBaseController:220-266` confirmed; the upstream challenge-issue flow in `EqmsSignatureService` was not read end-to-end.

Closing each gap is one targeted file read, not a structural unknown.

## Cross-references

- Source matrix: `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md`
- Companion ADRs: ADR-0007 (fixture-first), ADR-0008 (EQMS plural aliases), ADR-0010 (bridge alias policy)
- Companion correction note: `V20_BRIDGE_ALIAS_POLICY_CORRECTION_NOTE.md`
- Code anchors:
  - `mom/api/routes/rest-routes.php:108-111` (CPO)
  - `mom/api/routes/rest-routes.php:164-178` (Orders SO/JO/WO)
  - `mom/api/routes/rest-routes.php:194-195` (PREC shim)
  - `mom/api/routes/rest-routes.php:201-205` (QUO)
  - `mom/api/routes/operations-routes.php:214-224` (DISP action keys)
  - `mom/api/routes/operations-routes.php:335` (DISP readiness REST)
  - `mom/api/routes/eqms-quality-routes.php:119-148` (NQCASE)
  - `mom/api/routes/eqms-quality-routes.php:153-180` (CAPA)
  - `mom/api/routes/eqms-quality-routes.php:481-515` (CDOC)
  - `mom/api/routes/eqms-quality-routes.php:617-644` (BREL)
  - `mom/api/routes/eqms-quality-routes.php:248-280` (ECO)
  - `mom/api/routes/eqms-quality-routes.php:559-596` (TRAIN)
  - `mom/api/routes/eqms-control-plane-routes.php:41,45-46,48,50` (spine families)

## History

- 2026-04-25: Verification pass against codebase (this note). Three RED→YELLOW
  upgrades, two description corrections, one bridge-alias example syntax fix.
