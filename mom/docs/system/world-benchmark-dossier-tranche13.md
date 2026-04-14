# World Benchmark Dossier Tranche 13

Date: 2026-04-14

Sources are the official source lists captured in the Agent 2 and Agent 3 reports. The OpenTelemetry, Critical Manufacturing, ETQ, and MasterControl official domains are explicit tranche-required source exceptions relative to the root AGENTS allowlist; their use is recorded rather than hidden.

## Standards matrix

| GLOBAL STANDARD REQUIREMENT | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
|---|---|---|---|---|
| ISA-95 / IEC 62264: explicit enterprise-control boundary and Level 3 / Level 4 exchange discipline. Source: ISA official ISA-95 page. | Services and docs separate ERP/MOM/MES/EQMS authority in many areas. | Full ISA-95 conformance remains unproven because runtime registry publication is not aligned. | Keep execution truth in runtime service paths and align registry proof with runtime lookup. | Pending implementation. |
| NIST SP 800-82 Rev. 3: OT security must preserve safety, reliability, availability, and industrial topology constraints. Source: NIST SP 800-82 Rev. 3. | No direct machine-control behavior was added; local readiness proof improved in tranche 12. | OT readiness remains unproven without deployment segmentation/recovery/runbook evidence. | Keep health signals honest and avoid OT readiness claims from local app checks alone. | Pending doc tightening. |
| NIST SSDF: secure development is a lifecycle with planned practices, verification, and release evidence. Source: NIST SP 800-218 / SSDF. | Branch isolation, two-pass audits, tests, and reviewable evidence are used in this tranche. | Full SSDF program compliance is unproven. | Make source-control hygiene and generated artifact reproducibility part of the proof. | Pending implementation. |
| FDA 21 CFR Part 11 scope/application: regulated electronic records/signatures require documented scope, audit trail, retention, access controls, and signature linkage. Source: FDA Part 11 scope/application guidance. | Trusted record and audit services exist; legacy audit split is visible. | Full Part 11 compliance remains unproven without regulated-record scope and validation evidence. | Avoid treating release/training artifacts as Part 11 proof without scope decisions. | Pending doc tightening. |
| OpenTelemetry: traces, metrics, logs, baggage, and context propagation share context with propagator inject/extract behavior. Source: OpenTelemetry official docs. | `SliceObservability` is request-scoped and OTel-inspired. | Full OTel SDK/collector/propagator implementation is unproven. | Keep local observability proof honest; do not claim OTel compliance. | Pending doc tightening. |

## Vendor matrix

| GLOBAL VENDOR TABLE-STAKES CAPABILITY | GLOBAL DIFFERENTIATOR | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
|---|---|---|---|---|---|
| SAP Digital Manufacturing: MOM execution, dispatch/monitoring, labor, skills, work instructions, top-floor/shop-floor coordination. | SAP BTP cloud MOM, closed-loop resource planning, analytics/AI-assisted operations. | Training, release records, provenance, and governed execution foundations exist. | SAP DM-class cockpit, workforce integration, and closed-loop planning are unproven. | Do not overclaim; improve runtime proof before cockpit claims. | Pending doc tightening. |
| Siemens Opcenter APS: BOM planning, MTO/MTS, order-based multi-constraint scheduling. | Finite-capacity planning, sequencing, what-if optimization. | Planning snapshots and governed release baselines exist. | APS solver and sequencer parity are unproven. | Keep APS claims to foundations unless an optimizer is implemented. | Not closed. |
| Siemens Quality / QC / Supplier Quality: inspection plans, SPC, FSI/FAI/PPAP, supplier quality, closed-loop quality. | Supplier portals, inspection-plan management, cloud QMS workflows. | Supplier control, receiving inspection, NCR/CAPA adjacency, APQP/PPAP services exist. | Full Siemens quality cloud parity and supplier portal depth are unproven. | Continue quality invariants without false parity. | Not closed. |
| Critical Manufacturing: enterprise data platform, canonical model across sites, event-centric data, genealogy/history. | Canonical Data Model, Unified Namespace, enterprise manufacturing data platform. | Canonical contracts, event backbone, genealogy/read models exist. | Live enterprise data platform, event broker, and full genealogy explorer are unproven. | Align runtime registry proof and event history authority. | Partly targeted by registry alignment. |
| ETQ: PPAP, receiving inspection, SCAR, supplier rating, supply chain quality. | Integrated supply-chain quality suite and supplier collaboration. | Supplier policy, SCAR/PPAP/receiving controls and quality records exist. | ETQ-class suite cohesion, portal workflows, and supplier collaboration depth are unproven. | Keep explicit gaps; avoid suite parity claims. | Not closed. |
| MasterControl: document control, training, CAPA, audits, production/release records. | Connected quality events can launch training and production-record workflows. | Document/training/release evidence and governance services exist. | Full connected closed-loop quality and eBR/eDHR workflow depth are unproven. | Improve connected governance only after registry/hygiene blockers are clean. | Not closed. |

## Highest-leverage gap selected

The selected tranche 13 gap is registry authority alignment plus repo hygiene proof. It is higher leverage than a new product feature because every downstream authority claim depends on one reproducible runtime registry path and a clean source tree.

