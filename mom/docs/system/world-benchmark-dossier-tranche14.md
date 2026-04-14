# World Benchmark Dossier Tranche 14

Date: 2026-04-14  
Benchmark refresh sources: current official standards/regulatory/vendor sources captured by Agent 2 and Agent 3. Critical Manufacturing, ETQ, and MasterControl official domains were used because the tranche explicitly required those vendors; no repository content was sent externally.

## Standards Baseline

| GLOBAL STANDARD REQUIREMENT | GLOBAL VENDOR TABLE-STAKES CAPABILITY | GLOBAL DIFFERENTIATOR | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
|---|---|---|---|---|---|---|
| ISA-95 / IEC 62264: explicit enterprise-control integration, MOM/MES boundary, resource/site/work-center model. Sources: [ISA 2025 update](https://www.isa.org/news-press-releases/2025/april/update-to-isa-95-standard-addresses-integration-of), [ANSI/ISA-95.00.01-2025](https://www.isa.org/products/ansi-isa-95-00-01-2025-iec-62264-1-mod-enterprise). | MOM platforms separate planning, dispatch, execution, quality, and analytics authority. | Closed-loop top-floor to shop-floor coordination with clear command/read-model separation. | Runtime authority service reports mixed authority honestly; generic CRUD is guarded away from governed writes. | Full strict authority across all slices. | Retire or narrow compatibility fallback after migration/rollout. | Partially improved through truthfulness fixes only; not fully closed. |
| NIST SP 800-82 Rev. 3: OT security must address safety, reliability, performance, segmentation, incident response, recovery. Source: [NIST SP 800-82r3](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf). | Shop-floor integrations need least privilege, replay safety, safe adapter boundaries. | Deployed OT/IT evidence, recovery drills, and adapter hardening. | App layer avoids direct machine control; idempotency/dead-letter surfaces exist in several paths. | Live OT segmentation and recovery proof. | Environment proof outside repo. | Not closed; external blocker. |
| NIST SSDF: secure development is integrated across prepare/protect/produce/respond. Sources: [SP 800-218 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf), [CSRC page](https://csrc.nist.gov/pubs/sp/800/218/final). | Secure branch, review, test, evidence, dependency, and release discipline. | Reproducible release evidence and current validation proof. | Dedicated integration branch, helper worktrees, tests, and generated verifier gates are used. | Full CI/security pipeline execution in target environment. | Run full gated pipelines with dependencies/environment. | Partially closed locally; external CI proof remains unproven. |
| FDA 21 CFR Part 11 scope/application: determine predicate-rule scope, document applicability, enforce access, authority, audit trails, signatures, training, record retention. Source: [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application). | eQMS records bind record identity, signer identity, meaning, audit trail, and retention. | Validated electronic record/signature package. | Evidence finalization, signature, retention, and audit-pack services exist; audit-pack export now writes bundle and receipt. | Formal regulated validation scope and production validation evidence. | Compliance owner decision and validation package. | Durable audit-pack gap closed; Part 11 readiness not closed. |
| OpenTelemetry: traces, metrics, logs, resources, context propagation, inject/extract across boundaries. Sources: [OpenTelemetry spec](https://opentelemetry.io/docs/specs/otel/), [Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/). | Commands and queue hops carry correlation/trace context and export structured signals. | Live collector/exporter proof across process boundaries. | Custom trace/correlation/log envelopes exist; health truthfully treats unverified Loki as not ready. | Live collector/exporter and end-to-end propagation proof. | Target infrastructure validation. | Not closed; external blocker. |

## Vendor Benchmark Matrix

| GLOBAL STANDARD REQUIREMENT | GLOBAL VENDOR TABLE-STAKES CAPABILITY | GLOBAL DIFFERENTIATOR | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
|---|---|---|---|---|---|---|
| SAP Digital Manufacturing official benchmark: MOM execution, closed-loop planning, dispatch/monitoring, labor, skills/certifications, top-floor/shop-floor coordination. Sources: [SAP Digital Manufacturing](https://www.sap.com/products/scm/digital-manufacturing.html), [SAP Help](https://help.sap.com/docs/sap-digital-manufacturing). | Dispatch, execution monitoring, workforce and certification coordination. | Integrated SAP BTP execution/KPI/workforce orchestration. | Dispatch/reporting and qualification foundations exist; mobile task journaling is now safer. | SAP-level live operator cockpit and SuccessFactors-style workforce integration. | Product roadmap and UI/runtime breadth. | Only mobile execution proof strengthened; suite parity not closed. |
| Siemens Opcenter APS benchmark: BOM planning, MTO/MTS planning, order-based finite-capacity scheduling, constraint modeling. Source: [Siemens Opcenter APS](https://plm.sw.siemens.com/en-US/opcenter/advanced-planning-scheduling/). | Finite capacity and constraint-aware planning. | Scenario-driven optimizer with rich constraints. | PlanningScenarioService is deterministic finite-capacity v1/read-model oriented. | Full APS solver parity. | Product decision on solver scope and persistence authority. | Not closed. |
| Siemens Opcenter Quality / Quality Control / Supplier Quality benchmark: inspection plans, SPC, FSI/FAI/PPAP, supplier quality, closed-loop quality. Sources: [Siemens Opcenter Quality](https://plm.sw.siemens.com/en-US/opcenter/quality/), [Opcenter Quality Control](https://plm.sw.siemens.com/en-US/opcenter/quality-control/). | Inspection, nonconformance, supplier quality, PPAP. | Closed-loop quality analytics and integrated supplier workflows. | Inspection gates, APQP/PPAP services, SOPs, supplier controls, and evidence packages exist. | Full supplier-quality workflow parity and live SPC breadth. | Broader supplier/SPC implementation and evidence. | Audit-pack proof improved; full parity not closed. |
| Critical Manufacturing benchmark: enterprise data platform, canonical model across sites, event-centric data, genealogy/production history. Sources: official Critical Manufacturing product/data-platform/genealogy pages captured by Agent 3. | Canonical cross-site manufacturing data and genealogy. | Unified namespace and production-history analytics. | Canonical spine and genealogy graph are real but narrower than enterprise scope. | Complete enterprise canonical model and full event-to-edge coverage. | Expand canonical model and event taxonomy. | Not closed except source-label/proof drift. |
| ETQ Reliance benchmark: PPAP, receiving/inspection, SCAR, supplier rating, supply-chain quality, document/training/CAPA/audit. Sources: official ETQ Reliance platform, supply-chain quality, document, CAPA, change, training pages captured by Agent 3. | Connected eQMS and supplier quality workflows. | Broad closed-loop quality with supplier rating and SCAR. | SOPs and services cover parts of supplier control, CAPA adjacency, evidence, and change governance. | Full ETQ breadth and supplier workflow runtime proof. | Product roadmap and runtime implementation breadth. | Not closed. |
| MasterControl benchmark: document control, training, CAPA, audits, production/release records, training from document changes/CAPAs/production records, connected quality. Sources: official MasterControl document control, training, manufacturing/production records, review-by-exception, learning guide pages captured by Agent 3. | Connected document/training/CAPA/production record governance. | Review-by-exception and training launch from governed changes/records. | Document/change/training/evidence foundations exist; audit-pack export is now durable/retrievable. | Full MasterControl-style connected training and production record parity. | Runtime breadth and validation package. | Durable audit-pack slice closed; suite parity not closed. |

## Highest-Leverage Gap Selection

After closing inherited code-fixable backlog, the highest-leverage improvement selected for this run is durable audit-pack export. It was selected because it directly strengthens record trust, release evidence, Part 11-adjacent proof, and vendor eQMS benchmark alignment without a broad UI or architecture rewrite.

Closed in this run:

- retrievable audit-pack bundle;
- receipt artifact;
- self-hash readback verification;
- route-level retrieval surface;
- regression test for bundle/receipt/readback.
- finance org-scope hardening for period-close, backdate exception, and memo controls;
- AI scheduling read-scope fail-closed behavior;
- generated object contract action guidance from authored workflow commands;
- generated artifact freshness correction for downstream manifest-patching reports.

Still not closed:

- production immutable storage / WORM target;
- formal Part 11 validation scope;
- live OT/OpenTelemetry deployment proof;
- graphics publication release blocker disposition;
- registry/schema publication delta closure;
- full MasterControl/ETQ suite parity.
