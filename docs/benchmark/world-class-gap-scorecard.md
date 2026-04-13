# World-Class Gap Scorecard

Audited branch: `main`

Date: 2026-04-14

Scale: 0 means absent or unsafe. 5 means benchmark-class, governed, tested, and ready for enterprise manufacturing use.

| category | before | after | target next | what changed in this pass |
|---|---:|---:|---:|---|
| Execution truth integrity | 3.2 | 3.3 | 4.2 | Documented JSON compatibility authority and DB bridge limits; no unsafe DB cutover. |
| Transaction model / event history | 3.5 | 3.5 | 4.4 | Confirmed append-only report/dispatch event model remains; mutable snapshots are documented as read models. |
| Planning-to-execution consistency | 3.2 | 3.3 | 4.2 | FMEA and override role checks now use canonical role normalization; hold/schedule alias drift remains staged. |
| Quality / EQMS integration | 3.1 | 3.3 | 4.3 | Evidence upload MIME validation hardened; FMEA access control tightened; canonical exception/OQC drift remains staged. |
| Inspection/SPC rigor | 3.2 | 3.2 | 4.2 | First-piece/mobile inspection gates remain in place; OQC JSON compatibility gate remains a known gap. |
| Workforce qualification / authorization | 3.0 | 3.2 | 4.2 | Operational overrides and FMEA now respect canonical/elevated roles; dispatch-report skill matching remains staged. |
| Reason-code governance | 3.6 | 3.6 | 4.3 | Reason code separation remains in shopfloor execution; quality exception reason registry remains staged. |
| Digital thread continuity | 3.2 | 3.2 | 4.4 | Execution preserves operation/revision/CNC/setup/inspection references; CNC master authority still needs DB bridge/cutover. |
| Traceability / genealogy | 3.1 | 3.1 | 4.3 | Traceability read model remains separated from authority; automatic edge emission remains staged. |
| Multi-site / plant / site / work-center semantics | 3.0 | 3.0 | 4.0 | Existing payloads preserve plant/site/work-center; cross-operator/site membership still needs stronger policy. |
| Interoperability readiness | 3.1 | 3.1 | 4.2 | MTConnect/OPC UA-friendly machine/timestamp semantics preserved; no runtime connectivity expansion. |
| AI / copilot architecture quality | 3.3 | 3.8 | 4.5 | NLQ and RCA POSTs require CSRF; NLQ is role-scoped and audited; prompt schema matches canonical prediction enums; migration 110 fixes advisory comments. |
| OT/IT security and governance | 3.2 | 3.6 | 4.5 | AI write-like surfaces hardened; evidence MIME spoof fallback closed; override role gate aligned with real roles. |
| Reliability / idempotency / offline resilience | 3.4 | 3.5 | 4.3 | AI feedback idempotency remains; NLQ transaction order fixed for PostgreSQL; full mobile queue indexing remains staged. |
| Performance / scalability | 3.0 | 3.0 | 4.1 | No broad performance refactor; mobile JSON full-scan path remains a staged risk for 50+ machines. |
| Developer architecture / maintainability | 3.3 | 3.6 | 4.3 | Added root `AGENTS.md`, required docs, targeted tests, and removed speculative COPQ TODO by adding configurable rates. |

## Confirmed defects and disposition

| hypothesis | severity | disposition |
|---|---|---|
| H1 execution truth file-backed/ambiguous | P1 | Confirmed. Safe remediation is staged bridge documentation and tests; full DB-primary cutover deferred. |
| H2 mutable snapshot risk | P1 | Partially confirmed. Event journals exist; JSON production log remains compatibility snapshot/read model. |
| H3 weak lifecycle constraints | P2 | Partially confirmed. Core workflow strong; hold/schedule alias paths remain staged. |
| H4 validation weakness | P2 | Mostly refuted for dispatch/report. Additional AI/NLQ and evidence validation was hardened. |
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
