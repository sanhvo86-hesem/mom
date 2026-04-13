# Prior Prompt Remediation Log

Audited branch: `main`

Date: 2026-04-13

This log records prior deliverables from the Phase 1 CNC shopfloor execution prompts and the status after this pass.

## Completed from prior prompts

| deliverable | status | evidence |
|---|---|---|
| Inspect real execution, planning, analytics, and integration spines | Done | `docs/benchmark/world-class-gap-analysis.md` and `docs/architecture/canonical-execution-source-of-truth.md` now identify dispatch/mobile execution, planning/order stores, AI/advisory projections, DB bridges, and connectivity/master-data boundaries. |
| Preserve custom MVC and legacy fallback | Done | Changes extend existing controllers/services: `DispatchController`, `MobileController`, `ShopfloorExecutionService`, `MobileWorkQueueService`, `AiSchedulingController`. No router/framework rewrite. |
| Keep one Phase 1 execution truth path | Done | Dispatch/reporting remains through existing dispatch service path; mobile inspection is quality evidence capture; AI remains projection-only. |
| Add append-only or replay-safe execution evidence | Done for production/report and mobile inspection replay | Existing report/lifecycle event journals remain; mobile inspection now rejects divergent replays and returns existing facts for exact replay. |
| Add strict production-report validation | Done from earlier pass | `ShopfloorExecutionServiceTest` covers quantities, time consistency, reason codes, offline report idempotency, correction, target state, and first-piece gate. |
| Govern downtime/NG/rework reasons | Done | Existing downtime and defect catalogs are used by `ShopfloorExecutionService`. |
| Govern blocking reasons | Fixed now | Added `blocking_reason_codes` master data and migration seeds; removed blocking fallback to downtime catalog. |
| First-piece inspection gate | Fixed and hardened | Dispatch report gate exists; mobile first-piece capture now requires structured measurement evidence and validates result semantics. |
| Mobile inspection DB bridge | Fixed now | `MobileWorkQueueService` mirrors accepted captures to `mobile_inspection_captures`; migration `108_mobile_inspection_execution_bridge.sql` adds replay/context columns. |
| Offline inspection replay safety | Fixed now | Offline inspection uses client/idempotency/fingerprint matching; divergent replay is rejected. |
| AI feedback advisory write control | Fixed now | `AiSchedulingController::aiFeedbackSubmit()` requires CSRF and idempotency. |
| API-key write controls | Fixed now | API key create/revoke/JWT generation now require auth/admin and CSRF; revoke accepts route alias `keyId`. |
| Local storage first-write reliability | Fixed now | `LocalStorageDriver` creates directories before realpath validation and rejects absolute/traversal paths. |
| Required docs under requested names | Fixed now | Added `canonical-execution-source-of-truth.md`, `prior-prompt-remediation-log.md`, and `shopfloor-execution-contracts.md`; updated benchmark doc. |

## Partially completed or staged

| deliverable | current status | blocker / reason |
|---|---|---|
| Full DB-primary dispatch and production reporting | Staged | JSON compatibility remains live authority because the application still depends on legacy fallback and file-backed flows. DB bridge is the safe migration path. |
| Full ERP release/hold governance tied to dispatch edit rules | Staged | Order/planning truth is still split across JSON and DB-backed concepts; broad release governance requires a dedicated planning migration. |
| Full skill/certification matching on dispatch report submission | Staged | Mobile task start uses qualification gate, but dispatch report matching needs governed machine-operation-skill policy data. |
| Full NCR/CAPA/SPC workflow enforcement | Staged | First-piece and inspection capture are now linked, but nonconformance disposition/CAPA/SPC enforcement needs EQMS workflow integration. |
| Full genealogy edge emission from every report | Staged | Trace-ready fields exist, but serial/lot/traveler edge policy needs product/lot/operation governance before automatic edge creation. |
| AI projection unification | Fixed for Phase 1 ETL, staged for full copilot registry | AI predictions are DB-first with JSON fallback, recommendation records are explicitly advisory/pending, and `AiDataEtlService` now exposes `shopfloor_execution` features from accepted MOM/MES execution facts. A full semantic copilot registry remains a later analytics migration. |
| MTConnect/OPC UA runtime ingestion | Staged | Phase 1 is human-input-first. This patch preserves machine/equipment/timestamp semantics but does not ingest or command machines. |

## Completed incorrectly or superficially before this pass

| item | defect | correction |
|---|---|---|
| Blocking reason normalization | Blocking could fall back to downtime catalog, blurring loss semantics. | Introduced explicit blocker catalog and validation. |
| First-piece mobile capture | Capture could be accepted with no structured measurement evidence. | First-piece capture now requires measurements and normalized result. |
| Offline mobile inspection sync | Replay could append duplicate facts or accept conflicting data under the same client token. | Replay now returns the existing fact or rejects conflict. |
| AI feedback endpoint | Advisory feedback write lacked CSRF/idempotency consistency. | Added CSRF and idempotency wrapper. |
| Required documentation names | Previous docs existed under related names but not all requested names. | Added exact required documents and updated the benchmark doc. |

## Still blocked by evidence

- DB-primary execution cutover is blocked by legacy fallback dependency and large existing file-backed surface area.
- Full qualification enforcement is blocked by missing governed machine/operation/skill policy for dispatch reports.
- Full genealogy automation is blocked by unresolved serial/lot/traveler edge semantics.
- Full EQMS enforcement is blocked by the need to connect inspection results to NCR, disposition, CAPA, and SPC workflows.
- Full AI/copilot grounding is blocked by fragmented advisory stores and should follow execution-source reconciliation.
