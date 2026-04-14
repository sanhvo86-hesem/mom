# World-Class Gap Scorecard

Audited branch: `codex/worldclass-reaudit-20260414-102059`

Date: 2026-04-14

Scale: 0 means absent or unsafe. 5 means benchmark-class, governed, tested, and ready for enterprise manufacturing use.

| category | before | after | target next | what changed in this pass |
|---|---:|---:|---:|---|
| Execution truth integrity | 3.2 | 3.4 | 4.2 | JSON compatibility authority remains staged, but generic JO/WO and EQMS updates now reject uncontrolled fields. |
| Transaction model / event history | 3.5 | 3.6 | 4.4 | Genealogy ontology constraints now match runtime graph types; event/snapshot separation remains explicit. |
| Planning-to-execution consistency | 3.2 | 3.6 | 4.2 | JO/WO updates use allowlists, WO schedule windows reject end-before-start, and order schedule aliases remain routed to scheduling owner. |
| Quality / EQMS integration | 3.1 | 3.5 | 4.3 | Exception updates cannot bypass lifecycle fields; evidence idempotency aligns with platform replay contract. |
| Inspection/SPC rigor | 3.2 | 3.3 | 4.2 | First-piece/mobile inspection remains governed; ad hoc SPC is documented as non-authoritative analysis. |
| Workforce qualification / authorization | 3.0 | 3.3 | 4.2 | Conflict override scope is narrowed; dispatch-report skill matching remains staged. |
| Reason-code governance | 3.6 | 3.7 | 4.3 | Mobile task completion now requires a structured reason code for fail/partial/scrap outcomes. |
| Digital thread continuity | 3.2 | 3.4 | 4.4 | WO contracts carry added plant/site/setup/CNC version hooks and genealogy DB constraints match runtime types. |
| Traceability / genealogy | 3.1 | 3.4 | 4.3 | Migration 121 aligns `genealogy_nodes` and `as_manufactured_snapshots` constraints with runtime ontology. |
| Multi-site / plant / site / work-center semantics | 3.0 | 3.2 | 4.0 | WO creation/update and dispatch/mobile payloads preserve plant/site context more consistently. |
| Interoperability readiness | 3.1 | 3.1 | 4.2 | MTConnect/OPC UA-friendly machine/timestamp semantics preserved; no runtime connectivity expansion. |
| AI / copilot architecture quality | 3.3 | 4.0 | 4.5 | AI model list/dashboard now require AI read roles, model internals are admin-only, and MTTA metrics are plant-scoped. |
| OT/IT security and governance | 3.2 | 3.9 | 4.5 | AI read/write surfaces, evidence idempotency, exception lifecycle updates, and mobile conflict overrides are hardened. |
| Reliability / idempotency / offline resilience | 3.4 | 3.6 | 4.3 | Evidence replay key contract is aligned; online mobile idempotency and indexed queues remain staged. |
| Performance / scalability | 3.0 | 3.0 | 4.1 | No broad performance refactor; mobile JSON full-scan path remains a staged risk for 50+ machines. |
| Developer architecture / maintainability | 3.3 | 3.8 | 4.3 | Added root branch/cleanup rules, six audit artifacts, targeted regression tests, and current-branch provenance. |

## Confirmed defects and disposition

| hypothesis | severity | disposition |
|---|---|---|
| H1 execution truth file-backed/ambiguous | P1 | Confirmed. Safe remediation is staged bridge documentation and tests; full DB-primary cutover deferred. |
| H2 mutable snapshot risk | P1 | Partially confirmed. Event journals exist; JSON production log remains compatibility snapshot/read model. |
| H3 weak lifecycle constraints | P2 | Partially confirmed. Core workflow strong; hold release and schedule alias drift fixed here. Broad release governance remains staged. |
| H4 validation weakness | P2 | Mostly refuted for dispatch/report. Additional AI/NLQ, evidence, and planner schedule-slot validation was hardened. |
| H5 repeated scans/I/O | P2 | Refuted for dispatch operator retrieval, confirmed for broader mobile JSON queues. Deferred to indexed mobile read model. |
| H6 unsafe assignment/authorization | P2 | Mostly refuted for reporting; cross-operator read scope remains staged. Role gates hardened for AI, FMEA, and overrides. |
| H7 reason-code governance missing | P2 | Mostly refuted for shopfloor, partially confirmed for EQMS exceptions. Deferred to exception service unification. |
| H8 qualification controls weak | P2 | Partially confirmed. Mobile qualification gate exists; dispatch-report operation-skill policy deferred. |
| H9 inspection gating weak | P2 | Partially refuted. Mobile first-piece gate exists; OQC/shipment JSON gate deferred. |
| H10 digital-thread hooks incomplete | P1 | Confirmed for CNC program/setup master authority; execution payload links exist. |
| H11 source-of-truth drift | P1 | Confirmed across JSON/DB/projection layers; documented and bounded. |
| H12 AI detached/unsafe | P1 | Fixed for NLQ/RCA security and schema drift; full semantic copilot registry deferred. |
| H13 OT/IT controls weak | P1 | Fixed high-risk AI/evidence/override gaps; full 62443 program remains future governance. |
| H14 prior prompt debt unfinished | P1 | Closed safe items: AGENTS, docs, AI CSRF, NLQ runtime, AI comments, MIME spoof, COPQ config, role normalization. Structural DB-primary/EQMS/CNC cutovers remain staged. |
