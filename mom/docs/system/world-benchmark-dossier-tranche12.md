# World Benchmark Dossier - Tranche 12

Date: 2026-04-14

## Source policy

The benchmark refresh used official sources from standards bodies, regulators, and vendors whenever available. Agent 3 records a source-policy limitation: Critical Manufacturing, ETQ, and MasterControl official domains are not in the root AGENTS allowlist, but the tranche explicitly required those official vendor families. No repository content was sent externally.

## Standards baseline

| Global standard requirement | Repo current verified state | Repo claimed but unproven state | Gap to close | Closed in this run |
|---|---|---|---|---|
| ISA-95 / IEC 62264: explicit enterprise/control boundary and planning/execution separation. Sources: `isa.org` ISA-95 pages. | Local docs and selected services preserve execution-truth boundaries, but this is not a full verified Level 3 / Level 4 exchange model. | Broad ISA-95 alignment claims are unproven where runtime registry artifacts are absent. | Keep execution truth in service paths and make generated registry artifacts match code reality. | Partly: false-green docs corrected; no broad ISA-95 completion claim. |
| NIST SP 800-82 Rev. 3: OT-aware segmentation, monitoring, recovery, and safety-conscious security. Source: NIST SP 800-82 Rev. 3. | No direct machine-control behavior was added. Local health/fallback signals are more explicit. | Full OT readiness remains unproven without deployed segmentation, recovery evidence, and OT runbook proof. | Add operational probes and OT deployment controls without adding machine-control behavior. | Partly: logging, queue, audit, and trace proof improved; OT readiness remains unproven. |
| NIST SSDF: secure development practices, provenance, verification, and vulnerability handling as lifecycle. Source: NIST SP 800-218 / SSDF. | Branch isolation, pass-1/pass-2 audit, regression tests, and code-reviewable docs are used in this tranche. | Full SSDF program evidence is not proven by this repo slice alone. | Tie release gates to current artifacts and eliminate false-green docs. | Partly: false claims corrected and tests added. |
| FDA 21 CFR Part 11 scope/application: scoped regulated records, signature linkage, audit trail integrity, retention. Source: FDA Part 11 scope/application guidance. | Trusted release records and audit services exist; legacy audit split is now visible/degraded when enabled. | Full Part 11 compliance remains unproven without scope decisions and validation evidence. | Define regulated-record scope and keep audit/signature authority single and probeable. | Partly: legacy audit split visibility fixed. |
| OpenTelemetry: traces, metrics, logs, baggage, and context propagation share a context model. Source: OpenTelemetry spec pages. | `SliceObservability` emits OTel-inspired trace/correlation/request IDs and now resets per request. | Full OTel SDK-native instrumentation, propagator inject/extract behavior, baggage, and cross-signal correlation remain unproven. | Adopt or bridge to standard context propagation and cross-signal correlation. | Partly: request-scoped local context fixed; OTel compliance is not claimed. |

## Vendor benchmark matrix

| Vendor family | Global vendor table-stakes capability | Global differentiator | Repo current verified state | Repo claimed but unproven state | Gap to close | Closed in this run |
|---|---|---|---|---|---|---|
| SAP Digital Manufacturing | MOM/MES execution, dispatch/monitoring, labor, work instructions, quality-aware production. | Closed-loop planning, SAP BTP coordination, skills/certification integration, analytics. | Dispatch/mobile/release/training services and docs exist; mobile override governance is hardened. | SAP-class unified operator cockpit and live resource orchestration are unproven. | Runtime workforce and closed-loop dispatch/planning authority. | No new SAP-class feature; reliability proof improved. |
| Siemens Opcenter APS | BOM planning, MTO/MTS planning, finite-capacity order scheduling. | Deep multi-constraint scheduling and what-if planning. | Planning scenario service and order snapshot governance exist. | Solver-class APS optimization is unproven. | Productized finite-capacity optimization loop. | No. |
| Siemens Opcenter Quality | Inspection plans, SPC, incoming inspection, supplier quality, FAI/PPAP. | Drawing/model-derived plans, supplier portal collaboration, closed-loop quality. | APQP/PPAP service, supplier quality docs, trusted release records exist. | SPC and supplier portal depth are unproven. | Connect inspection -> NCR/CAPA/SPC and supplier workflows. | No broad EQMS feature; docs remain honest. |
| Critical Manufacturing | Enterprise manufacturing data platform, canonical model, event-centric data, genealogy. | Canonical data model across sites and genealogy explorer / production history. | Manufacturing event backbone, genealogy services, production history read model, trusted release packet exist. | Enterprise data platform and graphical genealogy explorer are unproven. | Restore registry artifacts and consolidate authority modes. | Partly: queue/event proof and docs improved. |
| ETQ Reliance | PPAP, receiving inspection, SCAR, supplier rating, supply chain quality. | Broad eQMS suite and supplier quality analytics. | Supplier quality, APQP/PPAP, receiving/traceability docs exist. | Unified ETQ-style suite and quality data lake are unproven. | Supplier portal and closed-loop supplier quality runtime. | No. |
| MasterControl | Document control, training, CAPA, audits, production/release records. | Connected change-to-training-to-execution and eBR/eDHR. | Connected governance, training obligations, trusted release record service exist. | Automatic change-triggered training sequencing and full eBR/eDHR UX are unproven. | Change-control -> training -> execution enforcement at runtime. | No broad feature; audit truth improved. |

## Highest-leverage gap chosen

The coordinator chose observability / proof-layer hardening as the highest-leverage new improvement after local code-fixable inherited defects were addressed, because it reduces false confidence in local health, audit evidence, queue fallback recovery, and incident correlation without broad framework rewrite. This does not establish full OT readiness or OpenTelemetry compliance.

Implemented:

- Loki health now stays unverified until a successful push proves availability.
- Slice observability can create a fresh request context and API boot invokes it.
- File queue fallback now records retry attempts, dead-letters poison messages, and reports reconciliation-required health.
- Legacy audit file sink is visible in health and degrades readiness when enabled.

## Sources

- https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- https://csrc.nist.gov/pubs/sp/800/82/r3/final
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://csrc.nist.gov/projects/ssdf
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- https://opentelemetry.io/docs/specs/otel/
- https://opentelemetry.io/docs/concepts/signals/
- https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- https://help.sap.com/doc/5796094639494b0d8524485c77e71a1b/latest/en-US/SAP_DMC_Operations_Guide_enUS.pdf
- https://help.sap.com/doc/13c9f83611f94a5ab2c94f23cacfc217/latest/en-US/SAP_DMC_FSD_enUS.pdf
- https://static.sw.cdn.siemens.com/siemens-disw-assets/public/51YxjmmJUynYnLYQD4yVGB/en-US/Siemens%20SW%20Production%20planning%20in%20a%20complex%20supply%20chain%20E-Book.pdf
- https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/
- https://www.etq.com/app/uploads/2025/04/HEXAGON-ETQ-Reliance_overview-Broch-12P-US-EN-3.25.pdf
- https://www.mastercontrol.com/compliance/iso9001
