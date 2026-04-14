# Global World-Class Benchmark Refresh

Audited branch: `codex/worldclass-reaudit-20260414-102059`

Date: 2026-04-14

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
| [Microsoft Factory Operations Agent](https://learn.microsoft.com/en-us/industry/release-plan/2025wave1/cloud-manufacturing/factory-operations-agent-copilot-studio) | Natural-language access and agentic assistance over manufacturing data. | Copilot/NLQ must be CSRF/role guarded and grounded in governed read models. |
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
- This remediation pass closed additional safe gaps: AI model/dashboard read access is now role-scoped, model internals are admin-only, AI dashboard MTTA is plant-scoped, generic EQMS exception updates cannot mutate lifecycle fields, JO/WO updates use explicit allowlists, and genealogy DB constraints now match the runtime ontology.
