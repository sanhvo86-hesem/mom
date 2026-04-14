# World-Class Gap Scorecard

Audited branch: `codex/worldclass-reaudit-20260415-055057`

Date: 2026-04-15

Scale: 0 means absent or unsafe. 5 means benchmark-class, governed, tested, and ready for enterprise manufacturing use.

| category | before | after | target next | what changed in this pass |
|---|---:|---:|---:|---|
| Execution truth integrity | 3.2 | 3.5 | 4.2 | JSON compatibility authority remains staged; dispatch lifecycle now rejects redispatch of started/terminal targets and generic JO/WO/EQMS updates reject uncontrolled fields. |
| Transaction model / event history | 3.5 | 3.8 | 4.4 | Dispatch events remain append-only and mobile task assignment/start/completion now has a task event journal. |
| Planning-to-execution consistency | 3.2 | 4.0 | 4.2 | JO/WO updates use allowlists, SO dates are validated, orphan order holds are rejected, WO creation rejects terminal parent JOs and now validates/inherits parent JO plant/site/routing/operation context, order schedule aliases remain routed to scheduling owner, and schedule slot overlap checks are enforced in both DB and JSON paths. |
| Quality / EQMS integration | 3.1 | 3.9 | 4.3 | Exception updates cannot bypass lifecycle fields; canonical evidence finalization is role/org scoped and requires signature events; replay identity reaches inspection capture. |
| Inspection/SPC rigor | 3.2 | 3.5 | 4.2 | First-piece/mobile inspection remains governed; replay identity is preserved; ad hoc SPC remains non-authoritative analysis. |
| Workforce qualification / authorization | 3.0 | 3.3 | 4.2 | Conflict override scope is narrowed; dispatch-report skill matching remains staged. |
| Reason-code governance | 3.6 | 3.7 | 4.3 | Mobile task completion now requires a structured reason code for fail/partial/scrap outcomes. |
| Digital thread continuity | 3.2 | 3.8 | 4.4 | WO contracts carry plant/site/setup/CNC hooks; CNC program/version records now persist plant/site/work-center/operation/revision/inspection context; setup sheets default draft and strict dispatch rejects unreleased setup context. |
| Traceability / genealogy | 3.1 | 3.4 | 4.3 | Migration 121 aligns `genealogy_nodes` and `as_manufactured_snapshots` constraints with runtime ontology. |
| Multi-site / plant / site / work-center semantics | 3.0 | 3.2 | 4.0 | WO creation/update and dispatch/mobile payloads preserve plant/site context more consistently. |
| Interoperability readiness | 3.1 | 3.3 | 4.2 | MTConnect XML parsing no longer expands entities and rejects DOCTYPE/ENTITY payloads. |
| AI / copilot architecture quality | 3.3 | 4.65 | 4.7 | Legacy AI reads now require AI read roles, feedback requires feedback/write roles, schedule metrics and JSON prediction fallback are plant-scoped, conversation fallback reads validate ID/owner, NLQ uses a shared user/hour throttle, scheduled ETL is org-scoped/fail-closed, and AI schedule apply/PM routes are explicitly advisory-only. |
| OT/IT security and governance | 3.2 | 4.3 | 4.5 | AI read/write surfaces, AI schedule advisory boundaries, evidence finalization/read scoping, XML parsing, exception lifecycle updates, order hold event audit, and mobile conflict overrides are hardened. |
| Reliability / idempotency / offline resilience | 3.4 | 4.35 | 4.4 | Evidence replay key contract is aligned; mobile task events and inspection replay identity are preserved; DB and JSON schedule writes share conflict guards; online mobile clock-in, clock-out, and completion support same-key replay; mobile queue/default overview dates use the factory calendar; missing queue-index buckets rebuild from source; manufacturing-event fallback append keeps idempotency/hash-chain checks while avoiding full in-memory retention. |
| Performance / scalability | 3.0 | 3.45 | 4.1 | Mobile operator queue retrieval uses a derived operator/date index that now fails open to source reconstruction on cache misses, and file-backed manufacturing-event append scans duplicate/hash context without retaining the whole ledger. Broader mobile/offline and dashboard indexes remain staged. |
| Developer architecture / maintainability | 3.3 | 3.9 | 4.3 | Added root branch/cleanup rules, six audit artifacts, targeted regression tests, current-branch provenance, and focused service tests. |

## Confirmed defects and disposition

| hypothesis | severity | disposition |
|---|---|---|
| H1 execution truth file-backed/ambiguous | P1 | Confirmed. Safe remediation is staged bridge documentation and tests; full DB-primary cutover deferred. |
| H2 mutable snapshot risk | P1 | Partially confirmed. Event journals exist; JSON production log remains compatibility snapshot/read model. |
| H3 weak lifecycle constraints | P2 | Partially confirmed. Core workflow strong; hold release and schedule alias drift fixed here. Broad release governance remains staged. |
| H4 validation weakness | P2 | Mostly refuted for dispatch/report. Additional AI/NLQ, evidence, and planner schedule-slot validation was hardened. |
| H5 repeated scans/I/O | P2 | Refuted for dispatch operator retrieval, confirmed for broader mobile JSON queues and quality sidecars. Mobile index missing-bucket false-empty behavior is fixed; broader quality/CNC scan paths remain staged. |
| H6 unsafe assignment/authorization | P2 | Mostly refuted for reporting; cross-operator read scope remains staged. Role gates hardened for AI, FMEA, and overrides. |
| H7 reason-code governance missing | P2 | Mostly refuted for shopfloor, partially confirmed for EQMS exceptions. Deferred to exception service unification. |
| H8 qualification controls weak | P2 | Partially confirmed. Mobile qualification gate exists; dispatch-report operation-skill policy deferred. |
| H9 inspection gating weak | P2 | Partially refuted. Mobile first-piece gate exists; OQC/shipment JSON gate deferred. |
| H10 digital-thread hooks incomplete | P1 | Confirmed for CNC program/setup master authority; execution payload links exist. |
| H11 source-of-truth drift | P1 | Confirmed across JSON/DB/projection layers; documented and bounded. |
| H12 AI detached/unsafe | P1 | Fixed for NLQ/RCA security, AI schedule apply/PM advisory boundaries, schedule-write conflict symmetry, shared NLQ throttling, and scheduled ETL org scoping. Full semantic copilot schema registry remains deferred. |
| H13 OT/IT controls weak | P1 | Fixed high-risk AI/evidence/override gaps; full 62443 program remains future governance. |
| H14 prior prompt debt unfinished | P1 | Closed safe items: AGENTS, docs, AI CSRF, NLQ runtime, AI comments, MIME spoof, COPQ config, role normalization, WO context coherence, mobile index miss, overview date alignment, and AI ETL scoping. Structural DB-primary/EQMS/CNC cutovers remain staged. |
| H15 duplicate/naming/storage drift | P2 | Confirmed. JSON compatibility, DB bridge, legacy sidecars, and projections coexist. This pass tightened source-of-truth docs and rejected orphan holds/redispatches that could create conflicting operational records. |
| H16 tests too narrow | P2 | Confirmed. Focused tests cover dispatch/service behavior and this pass adds WO context and mobile index coverage; DB-primary/EQMS/CNC cutovers still need broader tests. |
