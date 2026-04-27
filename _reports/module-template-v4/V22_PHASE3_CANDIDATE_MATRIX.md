# V22 Phase 3 Candidate Matrix

Date: 2026-04-25
Input decision: `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING`

## Boundary

This matrix is planning-only. It does not approve implementation, current portal navigation changes, fixture registry promotion, default live API, or new backend APIs.

| candidate | purpose | source-of-truth boundary | likely files when approved | primary risks | required evidence before implementation |
|---|---|---|---|---|---|
| Slice 5 CDOC governed document record shell | Read-only controlled document record view | DCC service/database paths remain document-control authority | HMV4 fixtures/pages/specs; renderer/bridge only if existing shell gaps require it | DCC authority confusion; stale document metadata; accidental edit affordances | Route contract; fixture contract; disabled mutation map; fallback/degraded states; E2E/axe/visual plan |
| Slice 6 INSP inspection record / lot shell | Read-only inspection evidence and lot status view | Inspection disposition and measurement writes remain governed EQMS/MES paths | HMV4 fixtures/pages/specs; no measurement write API | Blurring inspection record versus inspection lot; SPC display interpreted as disposition authority | Authority split; measurement display contract; no-mutation controls; traceability links; E2E/axe/visual plan |
| Slice 7 BREL batch release packet shell | Read-only release packet aggregation | Release approval, e-signature, and disposition remain governed workflow authority | HMV4 fixtures/pages/specs; packet read-model contract | Aggregator mistaken for release authority; missing exception context | Evidence source map; readiness states; exception taxonomy; disabled release controls; degraded-state coverage |
| Slice 8 ECO engineering change record shell | Read-only change record and affected-object view | Item/revision/CNC program/routing/document release writes remain governed change-control paths | HMV4 fixtures/pages/specs; affected-object fixture contract | Digital-thread drift; unauthorized change approval affordances | ECR/ECO route contract; affected object contract; approval controls disabled; conflict/partial-access coverage |
| Live API toggle replication to CAPA | Extend ADR-0011 opt-in live read pattern to CAPA | CAPA workflow execution remains governed EQMS authority | Hydration adapter tests and focused live-mode fixture/spec | Default live behavior; fallback masking auth/error issues; mutation leakage | CAPA endpoint/read contract; fixture fallback; auth/error fallback; static no-mutation evidence |
| CI matrix hardening | Make browser and visual checks predictable without hiding drift | CI reports are gates/evidence, not operational authority | CI workflow/spec/reporting changes only after approved plan | Excess runtime; flaky baselines; artifact churn; unclear update policy | Runtime budget; browser gate policy; artifact retention; snapshot update rules; failure taxonomy |

## Candidate Readiness

| candidate | planning readiness | implementation readiness |
|---|---:|---:|
| CI matrix hardening | HIGH | HOLD FOR APPROVAL |
| CAPA live API replication | HIGH | HOLD FOR APPROVAL |
| CDOC shell | MEDIUM | HOLD FOR APPROVAL |
| INSP shell | MEDIUM | HOLD FOR APPROVAL |
| ECO shell | MEDIUM | HOLD FOR APPROVAL |
| BREL shell | MEDIUM | HOLD FOR APPROVAL |

## Decision

Proceed only to Phase 3 planning prompts. Do not start a new slice from this matrix.
