# Prior Prompt Remediation Log

Audited branch: `codex/worldclass-reaudit-20260414-102059`

Date: 2026-04-14

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
| AI NLQ and RCA write-like surface control | Fixed now | `aiNlQuery()` is role-scoped, CSRF-protected, audited, and read-only; `aiRcaAnalyze()` now requires CSRF. |
| AI NLQ PostgreSQL runtime safety | Fixed now | `NaturalLanguageQueryService::executeSafeQuery()` begins a read-only transaction before `SET LOCAL statement_timeout`. |
| AI prediction schema grounding | Fixed now | NLQ prompt uses the same prediction types as `AiPredictionPipeline`; migration `110_ai_advisory_boundary_comments.sql` replaces legacy autonomous-action comments with advisory-boundary comments. |
| Planning schedule compatibility aliases | Fixed now | Legacy `order_schedule_*`, `order_capacity_heatmap`, and `order_promise_suggest` action aliases now route to the existing `AiSchedulingController` schedule handlers instead of non-existent `OrderController` methods. |
| Planner schedule slot validation | Fixed now | Schedule slot create/update now validate `YYYY-MM-DD` dates, `HH:MM` times, same-day time order, and controlled priority values before writing DB or JSON fallback stores. |
| Order hold release governance | Fixed now | `OrderController::releaseHold()` now derives the held order type and requires the corresponding `so_write`, `jo_write`, or `wo_write` permission before mutating the hold. |
| Evidence upload validation | Fixed now | `EvidenceVaultService` validates server-side size and byte-detected MIME; extension fallback cannot override concrete dangerous MIME content. |
| Operational override role governance | Fixed now | `OperationalOverrideController` keeps permission gating and now uses canonical elevated roles through `userHasAnyRole()`. |
| FMEA role governance | Fixed now | `FmeaController` uses migrated roles and quality/engineering/production buckets instead of a single unmigrated role string. |
| COPQ cost-rate configurability | Fixed now | `CopqEngine` reads optional `copq_cost_rates` from exception policy config and falls back to safe defaults. |
| API-key write controls | Fixed now | API key create/revoke/JWT generation now require auth/admin and CSRF; revoke accepts route alias `keyId`. |
| Local storage first-write reliability | Fixed now | `LocalStorageDriver` creates directories before realpath validation and rejects absolute/traversal paths. |
| Required docs under requested names | Fixed now | Added `canonical-execution-source-of-truth.md`, `prior-prompt-remediation-log.md`, and `shopfloor-execution-contracts.md`; updated benchmark doc. |
| Six-agent global reaudit artifacts | Fixed now | Added `docs/audits/agent1-benchmark.md` through `agent6-ai-security.md` with current finding dispositions. |
| AI model/dashboard read governance | Fixed now | `aiModelList()` and `aiDashboard()` require AI read access; non-admin model list output redacts config, metadata, and training source. |
| EQMS generic update lifecycle bypass | Fixed now | Exception update routes now use field allowlists and reject lifecycle/status fields through generic update. |
| JO/WO generic update field drift | Fixed now | `OrderController` now rejects unknown JO/WO update fields before workflow validation and validates WO schedule window order. |
| Evidence replay-key contract drift | Fixed now | `EvidenceController` idempotency keys now follow the 16-128 character platform token contract without colon separators. |
| Mobile task completion data quality | Fixed now | Mobile completion rejects scrap greater than completed quantity and requires a reason code for fail/partial/scrap outcomes. |
| Genealogy runtime/DB ontology drift | Fixed now | Migration `121_genealogy_runtime_ontology_constraints.sql` aligns DB checks with `GenealogyGraphService::nodeType()`. |

## Partially completed or staged

| deliverable | current status | blocker / reason |
|---|---|---|
| Full DB-primary dispatch and production reporting | Staged | JSON compatibility remains live authority because the application still depends on legacy fallback and file-backed flows. DB bridge is the safe migration path. |
| Full ERP release/hold governance tied to dispatch edit rules | Staged after safe fixes | Hold release now checks source-order write permission and schedule aliases are corrected. Broad release governance still requires a dedicated planning migration because order/planning truth remains split across JSON and DB-backed concepts. |
| Full skill/certification matching on dispatch report submission | Staged | Mobile task start uses qualification gate, but dispatch report matching needs governed machine-operation-skill policy data. |
| Full NCR/CAPA/SPC workflow enforcement | Staged | First-piece and inspection capture are now linked, but nonconformance disposition/CAPA/SPC enforcement needs EQMS workflow integration. |
| Full genealogy edge emission from every report | Staged | Trace-ready fields exist, but serial/lot/traveler edge policy needs product/lot/operation governance before automatic edge creation. |
| AI projection unification | Fixed for Phase 1 ETL and NLQ safety, staged for full copilot registry | AI predictions are DB-first with JSON fallback, recommendation records are explicitly advisory/pending, `AiDataEtlService` exposes `shopfloor_execution`, and NLQ is now CSRF/role guarded. A full semantic copilot registry remains a later analytics migration. |
| MTConnect/OPC UA runtime ingestion | Staged | Phase 1 is human-input-first. This patch preserves machine/equipment/timestamp semantics but does not ingest or command machines. |

## Completed incorrectly or superficially before this pass

| item | defect | correction |
|---|---|---|
| Blocking reason normalization | Blocking could fall back to downtime catalog, blurring loss semantics. | Introduced explicit blocker catalog and validation. |
| First-piece mobile capture | Capture could be accepted with no structured measurement evidence. | First-piece capture now requires measurements and normalized result. |
| Offline mobile inspection sync | Replay could append duplicate facts or accept conflicting data under the same client token. | Replay now returns the existing fact or rejects conflict. |
| AI feedback endpoint | Advisory feedback write lacked CSRF/idempotency consistency. | Added CSRF and idempotency wrapper. |
| AI NLQ/RCA endpoints | NLQ POST wrote conversation history without CSRF or scoped roles; RCA POST lacked CSRF. | Added scoped role gate, CSRF, audit hash, and CSRF on RCA. |
| AI NLQ transaction order | `SET LOCAL statement_timeout` ran before `BEGIN TRANSACTION READ ONLY`, which is invalid for PostgreSQL transaction-local settings. | Transaction now begins first, then sets the local timeout. |
| Order schedule route drift | Compatibility aliases pointed to methods that do not exist on `OrderController`, creating hidden runtime failure risk. | Aliases now point at the existing scheduling controller handlers. |
| Schedule slot validation | Planner-entered schedule dates/times could reach the schedule store without strict format/range validation. | Added controller-level date, time-range, and priority validation before DB/JSON writes. |
| Hold release authorization | Hold release mutated a hold without deriving the held order permission first. | Release now requires matching source-order write permission before mutation and audits order context. |
| AI recommendation schema comments | Migration 099 described recommendation rows as automated actions. | Migration 110 clarifies advisory-only, human-review semantics without changing enum compatibility. |
| Evidence MIME validation | Extension fallback could allow an allowed filename extension to override disallowed byte-detected content. | Fallback now only applies to generic/ambiguous MIME detection. |
| Operational override elevated roles | Generic `manager/director/admin` gate could block real repository roles. | Replaced with canonical elevated role list plus `admin_roles()` and role migration. |
| FMEA authorization | Role gates used a single unmigrated `role` string. | Added migrated multi-role checks and role buckets. |
| COPQ configuration | A TODO documented hardcoded cost rates without remediation. | Added config-driven rates with defaults and tests. |
| Required documentation names | Previous docs existed under related names but not all requested names. | Added exact required documents and updated the benchmark doc. |

## Still blocked by evidence

- DB-primary execution cutover is blocked by legacy fallback dependency and large existing file-backed surface area.
- Full qualification enforcement is blocked by missing governed machine/operation/skill policy for dispatch reports.
- Full genealogy automation is blocked by unresolved serial/lot/traveler edge semantics.
- Full EQMS enforcement is blocked by the need to connect inspection results to NCR, disposition, CAPA, and SPC workflows.
- Full semantic AI/copilot grounding is blocked by fragmented execution, quality, CNC, and advisory stores and should follow source reconciliation. NLQ security/runtime/schema drift is fixed in this pass.
- Full DB-backed CNC program/setup-sheet authority remains blocked by required JSON-to-DB reconciliation and compatibility testing.
- Online mobile clock-in/task-completion idempotency and indexed mobile queue projections remain staged because they require a broader mobile replay-contract migration.
