# Global World-Class Benchmark Refresh

Audited branch: `codex/worldclass-reaudit-20260415-055057`

Date: 2026-04-15

Scope: official-source benchmark deltas that directly affect this repository's ERP + MOM + MES + EQMS posture for CNC/discrete manufacturing.

## Official benchmark set

| source | material capability signal | repo implication |
|---|---|---|
| [SAP Digital Manufacturing](https://www.sap.com/products/scm/digital-manufacturing.html) | Cloud MES with S88/S95 production model, production execution, resource and labor visibility. | Dispatch worklists, operator assignment, shift targets, and qualification evidence must be governed execution data. |
| [Siemens Opcenter X Quality](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms.html) | Cloud QMS focus on inspection, nonconformance, quality process control, and traceability. | Inspection capture and NCR/CAPA adjacency must stay close to execution truth, not detached reporting. |
| [Dassault DELMIA Apriso Quality Control](https://www.3ds.com/products/delmia/apriso/quality-control) | Guided quality execution, quality integration with production, SPC, and controlled quality records. | Quality gating and evidence must use governed service paths and not ad hoc controller file mutation. |
| [AVEVA MES](https://www.aveva.com/en/products/manufacturing-execution-system/) | Manufacturing execution, performance visibility, OEE/loss insight, hybrid integration with enterprise systems. | Analytics must consume integrated canonical execution facts; AI projections must not become execution authority. |
| [Tulip Composable MES](https://tulip.co/solutions/composable-mes/) | Human-centric composable execution apps with open API and validation-ready thinking. | Preserve the custom MVC and extend contracts/services incrementally; do not rewrite into a monolith. |
| [Google Manufacturing Data Engine](https://docs.cloud.google.com/manufacturing-data-engine/docs/overview) | Factory data contextualization, standardized schemas, ISA-95 hierarchy support, analytics/ML use cases. | Keep a contextualization boundary between execution truth and derived AI/analytics features. |
| [Microsoft Factory Operations Agent](https://learn.microsoft.com/en-us/industry/manufacturing/whats-new) | Microsoft lists Factory Operations Agent and Manufacturing Data Solutions previews as deprecated on May 30, 2025. | Treat agent patterns as reference-only; NLQ/copilot must be grounded in governed read models and cannot become execution authority. |
| [ISA-95 / IEC 62264](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | Enterprise-control integration layers and explicit manufacturing interfaces. | Planning, execution, quality, analytics, and AI boundaries must remain explicit. |
| [MTConnect 2.5](https://docs.mtconnect.org/MBSD_MTConnect_Part_1_2-5-0.pdf) | Open machine information model and HTTP agent semantics for machine data. | Preserve stable machine/equipment IDs, timestamps, and event-style records now. |
| [OPC UA for Machinery](https://opcfoundation.org/markets-collaboration/opc-ua-for-machinery/) | Machinery companion specs for status, KPIs, and job/machine context. | Keep machine, work center, job, and operating context in execution payloads without commanding machines. |
| [NIST Digital Thread for Manufacturing](https://www.nist.gov/programs-projects/digital-thread-manufacturing) | Digital thread continuity across STEP/QIF/MTConnect/PMI/GUID-style identifiers. | Preserve revision, setup, CNC program, inspection, traveler, and genealogy references in execution contracts. |
| [ISA/IEC 62443](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) | IACS security lifecycle and OT/IT resilience. | Operational writes require least privilege, CSRF where browser/API write, auditability, replay safety, and no direct machine control. |

## Material refresh conclusions

- Execution truth must remain MOM/MES-owned. AI, analytics, scheduling suggestions, and copilot/NLQ features are advisory or read-only unless routed through governed human write paths.
- Append-only event journals plus derived snapshots remain the right staged model. Snapshots support dashboards and compatibility; event history supports audit, replay, corrections, and future analytics.
- EQMS cannot be a side module. First-piece/in-process/final inspection, evidence, nonconformance, and release packets must be linked to work order/operation/machine/operator context.
- CNC digital thread is the main remaining structural gap. Execution already preserves CNC references, but CNC program/setup-sheet authority is still file-backed while DB schema exists.
- Security gaps in AI/NLQ are high-leverage because natural-language query surfaces can expose broad manufacturing data and write conversation history.
- This remediation pass closed additional safe gaps: legacy AI read surfaces are role-scoped, feedback uses feedback/write roles, combined AI schedule metrics are plant-scoped, AI prediction JSON fallback no longer leaks blank-plant rows to scoped users, AI conversation fallback IDs are validated and owner-scoped, mobile task assignment/start/completion now has an event journal, canonical evidence finalization is role/org scoped and requires signature events, order holds append lifecycle events, CNC program/version records persist plant/site/work-center/operation/revision/inspection context, setup sheets default to draft, MTConnect XML parsing no longer expands entities, and WO creation rejects terminal parent JOs.
- Current re-audit fix: schedule slot create/update now uses the same overlap guard in DB and JSON fallback paths, and AI-named `ai_schedule_apply` / `ai_schedule_pm` routes now return advisory review/proposal responses instead of implying schedule or maintenance execution authority.
- Current 2026-04-15 re-audit fix: dispatch can only promote `planned` targets to `dispatched`; order holds now reject invalid order types and missing source orders before writing hold state; sales-order dates are format/bounds checked on create/update; NLQ hourly throttling moved from session-local counters to a shared per-user/hour file ledger; the manufacturing-event file fallback scans append context instead of retaining the full ledger in memory.
- Current 2026-04-15 05:50 re-audit fix: WO creation now validates/inherits parent JO plant/site/routing/operation context, mobile queue indexes rebuild on missing buckets, shopfloor overview uses factory-date bucketing, and scheduled AI ETL now requires explicit org scopes rather than attempting unscoped snapshots.

## 2026-04-15 six-workstream benchmark deltas

- Agent 1 confirmed the staged JSON-live/DB-bridge model remains the main benchmark gap. Safe remediation is bridge hardening plus explicit DB-primary promotion criteria, not a second execution model.
- Agent 2 confirmed planning still has JSON compatibility authority and found a WO context-coherence defect. This pass validates parent JO/operation context for WO creation.
- Agent 3 confirmed production snapshots remain compatibility read models and found a mobile derived-index false-empty risk. This pass treats missing buckets as cache misses and aligns overview dates to the factory calendar.
- Agent 4 confirmed legacy quality/SPC/NCR sidecars remain the EQMS gap, while the newer evidence/signature control plane is materially stronger. Full sidecar-to-canonical EQMS migration remains blocked by missing command-service ownership.
- Agent 5 confirmed CNC program/setup-sheet authority remains file-backed, but digital-thread fields and genealogy scope constraints are present. OPC UA remains readiness-only, not a live adapter.
- Agent 6 confirmed AI stays advisory and found a scheduled ETL org-scope mismatch. This pass makes the scheduler scoped/fail-closed instead of unscoped.
