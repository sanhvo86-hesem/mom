# Tranche 13 - Agent 3 Vendor Benchmark

Date: 2026-04-14

Scope note: official vendor sources were used whenever possible. Critical Manufacturing, ETQ, and MasterControl are outside the root AGENTS allowlist for this repo, so their official domains were used only because this tranche explicitly required vendor benchmark refresh. That is a policy conflict worth stating, not hiding.

## Executive Summary

- SAP Digital Manufacturing is strongest on MOM execution, workforce coordination, guided work instructions, and closed-loop resource planning.
- Siemens Opcenter APS is strongest on finite-capacity planning, sequencing, and long/medium/detailed scheduling.
- Siemens Opcenter Quality is strongest on inspection plan management, SPC, nonconformance handling, and supplier quality.
- Critical Manufacturing is strongest on enterprise data platform, canonical data model, event-centric manufacturing data, and genealogy/history.
- ETQ Reliance is strongest on supply chain quality, PPAP, receiving and inspection, SCAR, supplier rating, audit, document control, training, and CAPA.
- MasterControl is strongest on document control, training, CAPA, audit, production records, and connected closed-loop quality.

## SAP Digital Manufacturing

**Table stakes**
- MOM execution with shop-floor visibility and coordination with planning/logistics.
- Work instructions, labor capture, and execution control.
- Skills and certification tracking.
- Analytics and KPI visibility.

**Differentiators**
- Cloud deployment on SAP BTP.
- Closed-loop resource planning and dispatch/monitoring.
- Top-floor to shop-floor coordination.
- Embedded analytics and AI-guided KPIs.

**Repo matches**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` controls competence, certification, and assignment limits.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` freezes the released job snapshot and controlled work instructions.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` covers controlled release and handoff.
- `mom/api/services/TrustedReleaseRecordService.php` assembles provenance-aware release packets with canonical genealogy projection.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines the planning, execution, inventory, and compliance spine.

**Repo gaps**
- No live operator cockpit comparable to SAP DM resource orchestration.
- No runtime workforce integration equivalent to SAP SuccessFactors linkage.
- No proven embedded analytics stack or closed-loop planning engine at SAP DM depth.

**False parity risks**
- The repo has strong release and training evidence, but that is not the same as SAP DM-class shop-floor orchestration.
- `TrustedReleaseRecordService` and the SOP docs should not be read as proving a production-grade digital manufacturing cockpit.

**Official sources**
- [SAP Digital Manufacturing product page](https://www.sap.com/products/scm/digital-manufacturing.html)
- [SAP Digital Manufacturing features](https://www.sap.com/products/scm/digital-manufacturing/features.html)
- [SAP Digital Manufacturing operations guide](https://help.sap.com/doc/5796094639494b0d8524485c77e71a1b/latest/en-US/SAP_DMC_Operations_Guide_enUS.pdf)
- [SAP Digital Manufacturing feature scope description](https://help.sap.com/doc/13c9f83611f94a5ab2c94f23cacfc217/latest/en-US/SAP_DMC_FSD_enUS.pdf)

## Siemens Opcenter APS

**Table stakes**
- Production planning and scheduling.
- BOM planning and material planning.
- MTO and MTS support.
- Detailed sequencing and what-if planning.

**Differentiators**
- Finite-capacity scheduling.
- Long-term strategic planning, medium-term tactical planning, and detailed sequencing in one family.
- Constraint modeling and bottleneck awareness.
- Production synchronization across supply chain and shop floor.

**Repo matches**
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` freezes BOM/route snapshots per order.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines demand, forecast, allocation, pegging, and production order snapshots.
- `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md` explicitly separates planning authority from runtime projections.

**Repo gaps**
- No APS solver.
- No sequencer workspace or what-if optimization engine.
- No productized finite-capacity scheduling loop.

**False parity risks**
- Released snapshots and planning tables are not equivalent to an APS engine.
- This repo can claim governed planning foundations; it cannot claim Opcenter APS parity.

**Official sources**
- [Opcenter Advanced Planning and Scheduling](https://plm.sw.siemens.com/en-US/opcenter/products/aps/advanced-scheduling/)
- [Production planning in a complex supply chain](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/51YxjmmJUynYnLYQD4yVGB/en-US/Siemens%20SW%20Production%20planning%20in%20a%20complex%20supply%20chain%20E-Book.pdf)
- [What`s new in Opcenter APS 2304](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/4LThJGql1ue6mJNHAUcQhG/en-US/Siemens%20SW%20What%E2%80%99s%20new%20in%20Opcenter%20APS%202304%20Fact%20Sheet.pdf)

## Siemens Opcenter Quality / QC / Supplier Quality

**Table stakes**
- Inspection plan management.
- Incoming goods inspection.
- SPC.
- Nonconformance handling and supplier quality control.

**Differentiators**
- Inspection planning for complex products and supplier networks.
- Cloud QMS with closed-loop quality and nonconformance handling.
- Supplier assessment portal / supplier quality workflows.
- APQP-oriented quality planning.

**Repo matches**
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier approval, scorecards, SCAR, and approved source control.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving verification and traceability.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` covers final inspection and shipment release.
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` provides NCR/CAPA adjacency.
- `mom/api/services/ApqpPpapService.php` models APQP and PPAP gates.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines inspection plan, inspection lot, nonconformance, deviation, CAPA, and supplier quality case entities.

**Repo gaps**
- No automatic inspection-plan derivation from drawings or 3D models.
- No native supplier portal workflow at Opcenter Quality depth.
- No verified unified SPC analytics cockpit.

**False parity risks**
- Supplier approval + receiving inspection + NCR/CAPA is good backbone coverage, but not Opcenter Quality parity.
- If this section is overstated, it would confuse governance scaffolding with a full quality cloud platform.

**Official sources**
- [Opcenter X Quality cloud QMS](https://plm.sw.siemens.com/en-US/opcenter/quality/)
- [Opcenter Control and Inspection Plan](https://plm.sw.siemens.com/en-US/products/opcenter/quality/inspection-plan-management/)
- [Opcenter Quality Control](https://plm.sw.siemens.com/en-us/products/opcenter/quality/quality-control/)
- [Opcenter Supplier Quality Management](https://plm.sw.siemens.com/en-US/products/opcenter/quality/supplier-assessment-portal/)

## Critical Manufacturing

**Table stakes**
- Enterprise manufacturing data platform.
- Canonical data model across sites and MES versions.
- Event-centric data capture and analytics.
- Genealogy and production history.

**Differentiators**
- Enterprise Data Platform with Canonical Data Model for standardized events.
- Unified Namespace support with pre-structured manufacturing events contextualized to ISA-95.
- Genealogic for production traceability and root-cause isolation.
- Strong positioning around multi-site analytics and centralized reporting.

**Repo matches**
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` is a solid canonical business model for planning, execution, inventory, and eQMS.
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md` frames canonical write-model versus read/projection model separation.
- `mom/api/services/TrustedReleaseRecordService.php` uses production history, deterministic ordering, event hashes, and canonical genealogy projection.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` and `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` preserve traceability through receipt and release.

**Repo gaps**
- No production enterprise data platform layer.
- No canonical event ingestion/brokering service.
- No graphical genealogy explorer or production-history analysis product.

**False parity risks**
- A strong canonical schema is not the same as a live MES data platform.
- The repo has architecture direction and provenance plumbing, not Critical Manufacturing platform breadth.

**Source-policy limitation**
- Critical Manufacturing official domains are outside the root AGENTS allowlist. They were used because this tranche explicitly required vendor sources and the repo instruction asked to mark policy conflicts rather than overclaim.

**Official sources**
- [Critical Manufacturing the data platform for manufacturers](https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/)
- [Critical Manufacturing Genealogic](https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/)
- [Critical Manufacturing canonical data model session](https://www.criticalmanufacturing.com/insights/mes-industry-4-0-summit/enterprise-data-platform-uns-powering-multi-site-analytics-with-a-canonical-data-model/)
- [Critical Manufacturing unified namespace](https://www.criticalmanufacturing.com/mes-for-industry-4-0/unified-namespace/)

## ETQ Reliance

**Table stakes**
- Supply chain quality management.
- PPAP, receiving and inspection, SCAR, supplier rating.
- Document control, training, audit management, CAPA, and change management.
- Closed-loop QMS workflows.

**Differentiators**
- 40-app cloud-native QMS positioning.
- Document control that automatically triggers training tasks for affected employees.
- Integrated document control, training, audit, CAPA, and change management.
- Strong supply chain quality module set for PPAP, receiving, SCAR, and supplier rating.

**Repo matches**
- `mom/api/services/ApqpPpapService.php` directly models APQP and PPAP gates.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier rating, SCAR, and approved source control.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving inspection and supplier-material traceability.
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` covers training and certification governance.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` and `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` cover release, NCR, and CAPA adjacency.
- `mom/api/services/TrustedReleaseRecordService.php` provides a trusted release/evidence spine.

**Repo gaps**
- No unified ETQ-style eQMS shell.
- No supplier portal collaboration or one-platform analytics layer.
- No automatic training notification engine tied to document revision changes in runtime code.

**False parity risks**
- The repo has separate but strong QMS building blocks; that is not the same as ETQ Reliance breadth.
- Document control, training, CAPA, and supplier workflows are partially covered, but not productized as one suite.

**Source-policy limitation**
- ETQ official domains are outside the root AGENTS allowlist. They were used because this tranche explicitly required official vendor sources.

**Official sources**
- [ETQ supply chain quality management](https://www.etq.com/supply-chain-quality/)
- [ETQ document control](https://www.etq.com/document-control/)
- [ETQ change management](https://www.etq.com/change-management/)
- [ETQ platform overview](https://www.etq.com/platform/)
- [ETQ CAPA](https://www.etq.com/corrective-action-management/)

## MasterControl

**Table stakes**
- Document control and revision management.
- Training management and verification.
- CAPA, audit, and change control.
- Production records, EBR/eDHR, and review-by-exception.

**Differentiators**
- Automatic document routing, approval, and training-task triggering on revision changes.
- Paperless manufacturing / Manufacturing Excellence positioning.
- Connected quality stack spanning document control, training, CAPA, audit, and production records.
- EBR/eDHR and batch-record execution with review-by-exception.

**Repo matches**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` is the strongest training backbone.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` provides controlled versioning and release baselines.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` captures controlled release and batch/shipment evidence.
- `mom/api/services/TrustedReleaseRecordService.php` is a provenance-aware trusted release record service.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` includes document revision, change control, audit, competency, training matrix, and training record objects.

**Repo gaps**
- No single MasterControl-style suite for document control, training, CAPA, audit, and production records.
- No demonstrated automatic training orchestration on document revision changes.
- No full eBR/eDHR authoring and review-by-exception product surface.

**False parity risks**
- The repo has credible evidence architecture, but not MasterControl suite cohesion.
- Training docs and controlled release records are a strong start; they are not proof of connected closed-loop quality at MasterControl depth.

**Source-policy limitation**
- MasterControl official domains are outside the root AGENTS allowlist. They were used because this tranche explicitly required official vendor sources.

**Official sources**
- [MasterControl document control software](https://www.mastercontrol.com/ppc/document-control-software/)
- [MasterControl document revision software](https://www.mastercontrol.com/quality/document-control-software/revision-management-software/)
- [MasterControl manufacturing](https://www.mastercontrol.com/manufacturing/)
- [MasterControl quality assurance training](https://www.mastercontrol.com/quality/quality-assurance/training/)
- [MasterControl manufacturing production records](https://www.mastercontrol.com/manufacturing/)
- [MasterControl audit management article](https://www.mastercontrol.com/library/quality/fda-483-audit/)
- [MasterControl change control article](https://www.mastercontrol.com/library/quality/change-control/)
- [MasterControl EBR event page](https://www.mastercontrol.com/events/virtual/manufacturing-with-mes-software-electronic-batch-records/)

## Cross-Vendor Synthesis

- The repo is strongest where vendor benchmarks overlap on regulated evidence: release records, training and certification, supplier control, traceability, CAPA adjacency, and canonical modeling.
- The largest remaining false-parity risks are APS optimization, supplier portal depth, enterprise data platform breadth, and unified eQMS suite cohesion.
- The pass should be read as a better benchmark map, not as a material capability leap.

## Final Verdict

- Stronger now: benchmark honesty, vendor-to-repo mapping clarity, and gap visibility.
- Still blocking true world-class positioning: no APS engine, no native supplier portal, no enterprise data platform, no geneaology explorer, and no single connected eQMS suite at vendor depth.
