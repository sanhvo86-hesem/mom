# Tranche 14 - Agent 3 Vendor Benchmark

Date: 2026-04-14

Scope note: official vendor sources were used for the benchmark refresh. Critical Manufacturing, ETQ, and MasterControl are outside the root AGENTS allowlist for this repo, so their official domains were used only because this tranche explicitly required current vendor-source refresh. That is a task-required official-source exception, and no repository content was sent externally.

## Executive Summary

- SAP Digital Manufacturing remains the strongest reference for MOM execution, workforce coordination, shop-floor/top-floor orchestration, and governed work execution.
- Siemens Opcenter APS remains the strongest reference for finite-capacity planning, long/medium/detailed scheduling, BOM/MTO/MTS planning, and scenario-driven sequencing.
- Siemens Opcenter Quality / Quality Control / Supplier Quality remains the strongest reference for inspection-plan generation, SPC, nonconformance control, and supplier-quality workflows.
- Critical Manufacturing remains the strongest reference for enterprise data platform thinking, canonical data model standardization, event-centric manufacturing data, and genealogy / production history.
- ETQ Reliance remains the strongest reference for connected eQMS breadth, supply-chain quality, document control, training, audit, CAPA, and change-management workflows.
- MasterControl remains the strongest reference for document control, training-triggered governance, CAPA, audits, production records, and review-by-exception manufacturing records.

## Repo Evidence Used

Local evidence was taken from current repo artifacts only, including:

- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `docs/architecture/canonical-shopfloor-execution-model.md`
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md`
- `docs/backend/EQMS_CONTROL_PLANE_CLOSURE_REGISTER.md`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ApqpPpapService.php`
- `mom/contracts/objects/planning_production--dispatch-lists/contract.json`
- `mom/contracts/event-index.json`
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md`
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html`
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html`
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`

## SAP Digital Manufacturing

**Table stakes**
- MOM platform with shop-floor execution and operational coordination.
- Work instructions, labor tracking, skills, and certification governance.
- Execution aligned to planning and logistics.
- S88 / S95 production model support.

**Differentiators**
- Closed-loop resource planning.
- Workforce coordination around production priorities.
- Cloud deployment on SAP Business Technology Platform.
- AI-guided KPIs and analytics.

**Repo capabilities that match**
- `docs/architecture/canonical-shopfloor-execution-model.md` keeps execution truth separate from planning truth and preserves the dispatch/report join key.
- `mom/contracts/objects/planning_production--dispatch-lists/contract.json` defines governed dispatch release, start, hold, complete, close, and cancel transitions.
- `mom/api/services/TrustedReleaseRecordService.php` shows provenance-aware release packaging and controlled evidence handling.
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` covers competence, certification, and assignment limits.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` freezes the released job snapshot and controlled work-instruction context.

**Repo gaps that remain**
- No live operator cockpit comparable to SAP DM resource orchestration.
- No runtime workforce integration equivalent to SAP SuccessFactors linkage.
- No proven closed-loop planning engine or top-floor to shop-floor orchestration depth.
- No productized embedded analytics stack at SAP DM breadth.

**Current official sources accessed 2026-04-14**
- [SAP Digital Manufacturing](https://www.sap.com/products/scm/digital-manufacturing.html)
- [SAP Digital Manufacturing features](https://www.sap.com/products/scm/digital-manufacturing/features.html)

## Siemens Opcenter APS

**Table stakes**
- Production planning and scheduling.
- BOM planning and material planning.
- MTO / MTS support.
- Detailed sequencing and scheduling.

**Differentiators**
- Finite-capacity scheduling.
- Long-term strategic planning, medium-term tactical planning, and detailed sequencing in one family.
- Constraint modeling and scenario comparison.
- Planning / scheduling charts that support resource transparency and what-if evaluation.

**Repo capabilities that match**
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` preserves frozen BOM/route snapshots per release.
- `mom/contracts/objects/planning_production--dispatch-lists/contract.json` keeps dispatch authority separate from planning authority while still modeling governed execution sequencing.
- `mom/contracts/event-index.json` and `mom/contracts/command-index.json` capture released, started, completed, held, and dispatched lifecycle facts for planning-to-execution traceability.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` models demand, forecast, pegging, allocation, production order, and frozen release snapshots.
- `docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md` explicitly frames planning as a governed layer, not a hidden execution authority.

**Repo gaps that remain**
- No APS solver.
- No sequencer workspace or what-if optimization engine.
- No finite-capacity scheduling loop proven in runtime code.
- No productized constraint-resolution UI.

**Current official sources accessed 2026-04-14**
- [Opcenter Advanced Planning and Scheduling](https://plm.sw.siemens.com/en-US/opcenter/products/aps/advanced-scheduling/)
- [Preactor APS / Opcenter APS overview](https://www.sw.siemens.com/en-US/technology/preactor-aps/)

## Siemens Opcenter Quality / Quality Control / Supplier Quality

**Table stakes**
- Inspection plan management.
- Incoming / production / outgoing inspection support.
- SPC.
- Nonconformance handling.
- Supplier quality and complaint management.

**Differentiators**
- Inspection-plan derivation from drawings or 3D models.
- Cloud QMS with closed-loop quality.
- Supplier assessment portal and complaint handling.
- APQP-oriented quality planning.

**Repo capabilities that match**
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md` models NCR, CAPA, MRB, SCAR, OQC, IQC, holds, quarantine, and supplier-quality enforcement.
- `mom/api/services/ApqpPpapService.php` directly models APQP and PPAP gates.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier approval, scorecards, SCAR, and approved source control.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving verification and traceability.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` and `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` keep release, inspection, and quality reaction adjacent.

**Repo gaps that remain**
- No verified native SPC cockpit.
- No automatic inspection-plan derivation from drawings or 3D models.
- No supplier portal at Opcenter Quality breadth.
- No single-suite quality cloud that closes every inspection / supplier / complaint loop in one runtime authority.

**Current official sources accessed 2026-04-14**
- [Opcenter X Quality cloud QMS](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms/)
- [Opcenter X Quality Essentials](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms/essentials/)
- [Opcenter Control and Inspection Plan](https://plm.sw.siemens.com/en-US/products/opcenter/quality/inspection-plan-management/)
- [Opcenter Quality Control](https://www.siemens.com/en-us/products/opcenter/quality/quality-control/)
- [Opcenter Supplier Quality Management](https://plm.sw.siemens.com/en-US/products/opcenter/quality/supplier-assessment-portal/)

## Critical Manufacturing

**Table stakes**
- Enterprise manufacturing data platform.
- Canonical data model across sites and MES versions.
- Event-centric capture and brokering.
- Genealogy / production history.

**Differentiators**
- Enterprise Data Platform framing.
- Canonical Data Model as a shared manufacturing language.
- Event-brokering architecture for multi-consumer use.
- Multi-site standardization and enterprise-wide analytics.

**Repo capabilities that match**
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` is the strongest local canonical model artifact and separates foundation, master, planning, MES, inventory, and eQMS layers.
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md` explicitly compares canonical write-model and projection model boundaries.
- `mom/api/services/TrustedReleaseRecordService.php` uses provenance-aware release packaging and genealogy-aware evidence handling.
- `docs/backend/EQMS_CONTROL_PLANE_CLOSURE_REGISTER.md` and `docs/architecture/canonical-shopfloor-execution-model.md` both keep execution truth and derived projections separated.

**Repo gaps that remain**
- No production enterprise data platform service.
- No canonical event ingestion/brokering layer.
- No productized genealogy explorer at Critical Manufacturing breadth.
- No proven multi-site event fabric with live cross-site analytics.

**Current official sources accessed 2026-04-14**
- [The Data Platform for Manufacturers](https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/)
- [Genealogic](https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/)
- [Unified Namespace](https://www.criticalmanufacturing.com/mes-for-industry-4-0/unified-namespace/)

## ETQ Reliance

**Table stakes**
- Supply chain quality management.
- PPAP, receiving and inspection, SCAR, supplier rating.
- Document control, training, audit management, CAPA, and change management.
- Connected eQMS workflows with a single source of truth.

**Differentiators**
- 40+ application breadth.
- Document-control-triggered training.
- Codeless workflow configuration.
- Connected quality data across ERP, PLM, CRM, MES, and other systems.

**Repo capabilities that match**
- `mom/api/services/ApqpPpapService.php` covers APQP / PPAP gate behavior.
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md` covers supplier quality, SCAR, audit-readiness, CAPA, and document/training adjacency.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier quality controls and scorecards.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers incoming verification and traceability.
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` gives the strongest local training backbone.

**Repo gaps that remain**
- No unified ETQ-style eQMS suite shell.
- No built-in supplier portal / connected external collaboration workflow at ETQ breadth.
- No automatic training orchestration in runtime code when document revisions change.
- No single connected quality product surface combining document control, audit, CAPA, training, and supply-chain quality.

**Current official sources accessed 2026-04-14**
- [ETQ Reliance eQMS platform](https://www.etq.com/platform/)
- [ETQ document control](https://www.etq.com/document-control/)
- [ETQ supply chain quality management](https://www.etq.com/supply-chain-quality/)
- [ETQ change management](https://www.etq.com/change-management/)
- [ETQ CAPA](https://www.etq.com/corrective-action-management/)
- [ETQ training management data sheet](https://www.etq.com/app/uploads/2022/11/ETQ-Training-Management-Data-Sheet_111622_web.pdf)

## MasterControl

**Table stakes**
- Document control and revision management.
- Training management and verification.
- CAPA, audit, and change control.
- Production records, EBR/eDHR, and review-by-exception.

**Differentiators**
- Automatic training task triggering on document changes.
- Connected closed-loop quality across document control, training, CAPA, and audit.
- Review-by-exception manufacturing records.
- Digital production records / master manufacturing records in one suite.

**Repo capabilities that match**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` is the strongest training-control backbone in the repo.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` provides controlled versioning and released-baseline behavior.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` captures controlled release and shipment evidence.
- `mom/api/services/TrustedReleaseRecordService.php` provides provenance-aware trusted release packaging and evidence assembly.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` includes document revision, change control, audit, competency, training matrix, and training record objects.

**Repo gaps that remain**
- No single MasterControl-style suite for document control, training, CAPA, audit, and production records.
- No automatic training orchestration on document revision changes in runtime code.
- No full eBR/eDHR authoring and review-by-exception product surface.
- No productized manufacturing records cockpit comparable to MasterControl Manufacturing Excellence.

**Current official sources accessed 2026-04-14**
- [Document Control Software](https://www.mastercontrol.com/ppc/document-control-software/)
- [Quality Assurance Training](https://www.mastercontrol.com/quality/quality-assurance/training/)
- [Master Production Records Software](https://www.mastercontrol.com/manufacturing/production-records/)
- [Review by Exception](https://www.mastercontrol.com/manufacturing/review-by-exception/)
- [Manufacturing](https://www.mastercontrol.com/manufacturing/)
- [Guide to Learning Services PDF](https://courses.mastercontrol.com/resources/Guide_to_Learning_Services.pdf)

## Cross-Vendor Positioning

- The repo has credible governed planning, execution, quality, genealogy, and trusted-release scaffolding.
- It does not yet have SAP DM-grade shop-floor orchestration, Siemens APS-grade optimization, Siemens Quality-grade supplier/inspection UX, Critical Manufacturing-grade enterprise data platform breadth, ETQ-grade connected QMS breadth, or MasterControl-grade connected production-records workflow depth.
- The strongest local advantage is truthfulness: the architecture and control-plane docs now separate authority, snapshots, events, and projections more rigorously than the older tranche claims did.

## Bottom Line

This tranche14 refresh strengthens honesty and specificity, but the repo still sits below the vendor suites in product breadth. The clearest local wins are governed execution truth, canonical data modeling, and release/evidence rigor. The clearest remaining world-class gap is still suite-level productization around planning optimization, connected quality workflows, and enterprise data platform surfaces.
