# Tranche 12 - Agent 3 Vendor Benchmark

Date: 2026-04-14

Scope note: official vendor sources only. Critical Manufacturing, ETQ, and MasterControl are outside the repo root AGENTS allowlist, so they were used only because this tranche explicitly required official vendor sources. No repo content was sent externally.

## Executive Readout

- SAP Digital Manufacturing is strongest on shop-floor execution, resource orchestration, work instructions, skills/certification, analytics, and closed-loop planning.
- Siemens Opcenter APS is strongest on finite-capacity production planning, BOM planning, MTO/MTS planning, and multi-constraint scheduling.
- Siemens Opcenter Quality is strongest on inspection plan derivation, SPC, incoming inspection, supplier quality, and supplier portal collaboration.
- Critical Manufacturing is strongest on a MES-native enterprise data platform, canonical data model, event-centric manufacturing data, and genealogy / production history.
- ETQ Reliance is strongest on broad eQMS breadth, especially supply chain quality, PPAP, receiving/inspection, SCAR, supplier rating, CAPA, audit, document control, and training.
- MasterControl is strongest on connected quality and manufacturing excellence, especially document control, training automation, CAPA, audits, change control, and production records / EBR / eDHR.

## SAP Digital Manufacturing

**Table stakes**
- MOM/MES execution with shop-floor visibility.
- Coordination between planning, logistics, and execution.
- Work instructions, labor capture, and quality-aware production control.
- Skills and certification tracking for workforce assignment.

**Differentiators**
- Cloud deployment on SAP BTP with top-floor to shop-floor coordination.
- Closed-loop resource planning and dispatch/monitoring.
- SAP SuccessFactors integration for skills and certifications.
- Embedded analytics and AI-guided KPIs.

**Repo matches**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` covers competence, certification, and assignment limits.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` locks a released job snapshot and version-controlled work instructions.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` covers final release and controlled handoff.
- `mom/api/services/TrustedReleaseRecordService.php` assembles provenance-aware release packets with canonical genealogy projection.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines the execution, planning, and compliance spine.

**Repo gaps**
- No demonstrated SAP DM-class unified operator cockpit with live resource orchestration across planning, logistics, and execution.
- No runtime-level workforce service equivalent to SAP DM plus SuccessFactors integration.
- No evidence of a productized closed-loop execution planner or embedded analytics stack at SAP DM depth.

**Official sources**
- [SAP Digital Manufacturing operations guide](https://help.sap.com/doc/5796094639494b0d8524485c77e71a1b/latest/en-US/SAP_DMC_Operations_Guide_enUS.pdf)
- [SAP Digital Manufacturing feature scope description](https://help.sap.com/doc/13c9f83611f94a5ab2c94f23cacfc217/latest/en-US/SAP_DMC_FSD_enUS.pdf)
- [SAP Digital Manufacturing integration guide](https://help.sap.com/doc/f6b2ab2222794bebad4c0dcd33138e71/latest/en-US/SAP_DMC_Integration_Guide_enUS.pdf)
- [SAP Industry 4.0 PDF](https://assets.dm.ux.sap.com/nl-dsc-innovation-day/pdf/SAP_Industry_4.0.pdf)

## Siemens Opcenter APS

**Table stakes**
- Production planning and scheduling.
- BOM planning and material planning.
- Make-to-order and make-to-stock planning support.
- Finite-capacity sequencing and what-if planning.

**Differentiators**
- Deep finite-capacity scheduling and detailed sequencing.
- Constraint modeling, including additional resource-level targets.
- Long-term, tactical, and detailed planning in one APS family.
- Tight digital thread integration with MES, ERP, and supply chain systems.

**Repo matches**
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` freezes released BOM/route snapshots per order.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines planning objects such as demand, forecast, allocation, pegging, and production order snapshots.
- `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md` frames planning as a distinct authority layer.

**Repo gaps**
- No demonstrated APS solver, sequencer workspace, or what-if simulation engine.
- No productized finite-capacity optimization loop or planner workstation equivalent to Opcenter APS.
- Planning in repo is governed and snapshot-based, not yet an optimization product.

**Official sources**
- [Production planning in a complex supply chain](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/51YxjmmJUynYnLYQD4yVGB/en-US/Siemens%20SW%20Production%20planning%20in%20a%20complex%20supply%20chain%20E-Book.pdf)
- [What`s new in Opcenter APS 2304](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/4LThJGql1ue6mJNHAUcQhG/en-US/Siemens%20SW%20What%E2%80%99s%20new%20in%20Opcenter%20APS%202304%20Fact%20Sheet.pdf)

## Siemens Opcenter Quality / Quality Control / Supplier Quality

**Table stakes**
- Inspection plan management.
- Incoming goods inspection.
- SPC and nonconformance handling.
- Supplier quality, supplier rating, and supplier portal collaboration.

**Differentiators**
- Automatic inspection-plan derivation from drawings or 3D models.
- Supplier assessment portal with objective ratings and delivery-updated criteria.
- Supplier complaints workflow with portal-based 8D collaboration.
- Closed-loop quality with quality data spanning inspection, deviation, and supplier issues.

**Repo matches**
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier approval, scorecards, and SCAR.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving verification, traceability, and counterfeit prevention.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` covers final inspection and controlled release.
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` exists as the internal NCR/CAPA reaction backbone.
- `mom/api/services/ApqpPpapService.php` covers APQP phase gates and PPAP submissions.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` defines inspection plan, inspection lot, nonconformance, deviation, CAPA, and supplier quality case tables.

**Repo gaps**
- No demonstrated automatic inspection-plan derivation from drawings or 3D models.
- No native supplier portal workflow equivalent to Opcenter Quality portal collaboration.
- SPC appears in forms/docs, but not as a proven unified quality analytics cockpit at vendor depth.

**Official sources**
- [Siemens Opcenter quality overview PDF](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/a5HILP7Or9pSAA3t2GSya/en-US/TAC_937.002_US_FS_Siemens%20SW%20Opcenter.pdf)
- [Qualitatsmanagement 4.0 webinar PDF](https://www.plm.automation.siemens.com/media/global/de/Webinar-%20Qualit%C3%A4tsmanagement%204.0%20im%20Produktlebenszyklus_tcm53-95030.pdf)
- [Siemens production planning in a complex supply chain PDF](https://static.sw.cdn.siemens.com/siemens-disw-assets/public/51YxjmmJUynYnLYQD4yVGB/en-US/Siemens%20SW%20Production%20planning%20in%20a%20complex%20supply%20chain%20E-Book.pdf)

## Critical Manufacturing

**Table stakes**
- Enterprise data platform for manufacturing data.
- Canonical data model across plants and MES versions.
- Event ingestion, brokering, storage, and analytics.
- Genealogy and production history at scale.

**Differentiators**
- MES-native data platform with a governed enterprise data platform layer.
- Canonical Data Model standardizing manufacturing events across sites and MES versions.
- Graphical Genealogy Explorer for root-cause isolation.
- Event-centric data architecture built for real-time and AI use cases.

**Repo matches**
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` is a strong canonical model for planning, MES, inventory, and eQMS.
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md` explicitly frames canonical write-model vs runtime/projection separation.
- `mom/api/services/TrustedReleaseRecordService.php` uses production history, event hashes, deterministic ordering, and canonical genealogy projection.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` and `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` preserve traceability from receipt through shipment.

**Repo gaps**
- No production enterprise data platform implementation with event brokering, canonical event ingestion, or multi-site standardized event store.
- No graphical genealogy explorer / production-history analysis layer at product level.
- Canonical data model exists in architecture docs, but not as a platform service with Critical Manufacturing-style breadth.

**Official sources**
- [Critical Manufacturing Genealogic](https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/)
- [Critical Manufacturing industrial equipment page](https://www.criticalmanufacturing.com/industries/industrial-equipment-manufacturing/)
- [Critical Manufacturing welcome book PDF](https://www.criticalmanufacturing.com/wp-content/uploads/2021/11/Welcome-Book-2021.pdf)
- [Critical Manufacturing documentation portal](https://help.criticalmanufacturing.com/userguide/)
- [OData Access to Data Sets PDF](https://help.criticalmanufacturing.com/tutorials/modules/iot-data-platform/odataaccess/odataaccess.pdf)

## ETQ Reliance

**Table stakes**
- Supply chain quality management.
- PPAP, receiving and inspection, SCAR, and supplier rating.
- Document control, audit management, CAPA, and change management.
- Nonconformance and quality event management across the QMS.

**Differentiators**
- Broad eQMS application breadth in one platform.
- Supplier scorecards and supplier-quality workflows.
- PPAP, receiving, SCAR, and supplier-rating depth.
- Quality data lake / analytics positioning for enterprise quality intelligence.

**Repo matches**
- `mom/api/services/ApqpPpapService.php` directly models APQP and PPAP gates.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier rating, SCAR, and supplier approval.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving inspection and supplier-material traceability.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` and `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` cover release, NCR, and CAPA adjacency.
- `mom/api/services/TrustedReleaseRecordService.php` is a strong release/evidence/provenance anchor.

**Repo gaps**
- No unified ETQ-style eQMS platform with one suite shell and supplier portal.
- Cross-module automation exists in policy/docs, but not as a productized end-to-end quality cloud.
- No demonstrated quality-data-lake equivalent for analytics and supplier intelligence.

**Source-policy limitation**
- ETQ official domains are outside the root AGENTS allowlist, but they were used because this tranche explicitly required official vendor sources.

**Official sources**
- [ETQ supply chain quality PDF](https://blog.etq.com/hubfs/ETQ%20Overall%20Leader%20Report.pdf)
- [ETQ quality shop floor to top floor PDF](https://www.etq.com/app/uploads/2025/09/HEXAGON_ETQ-Guide%20to%20navigating%20regulatory%20-WP-12P-Letter-EN.pdf)
- [ETQ Reliance brochure PDF](https://www.etq.com/app/uploads/2025/04/HEXAGON-ETQ-Reliance_overview-Broch-12P-US-EN-3.25.pdf)
- [ETQ advanced QMS PDF](https://blog.etq.com/hubfs/Advanced%20QMS%20For%20Dummies.pdf)

## MasterControl

**Table stakes**
- Document control and revision management.
- Training management and verification.
- CAPA, audits, and change control.
- Production records, electronic batch records, and electronic device history records.

**Differentiators**
- Change control, training, audit, CAPA, and document control are tightly connected in one quality stack.
- MasterControl Manufacturing Excellence centers on paperless, error-reducing production records.
- Training is positioned as a managed, auditable response to documented process and document updates.

**Repo matches**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` is a strong training and certification backbone.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` provides revision-controlled release baselines and controlled versioning.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` captures controlled release and batch/shipment evidence.
- `mom/api/services/TrustedReleaseRecordService.php` acts like a provenance-aware trusted release record service.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` includes document revision, change control, audit, competency, training matrix, and training record objects.
- `mom/api/services/ApqpPpapService.php` adds regulated project and submission control that aligns with connected quality execution.

**Repo gaps**
- No unified MasterControl-style platform for document control, training, CAPA, audit, and production records with a single connected suite.
- No demonstrated automatic training sequencing or change-triggered training task orchestration in runtime code.
- No fully integrated eBR/eDHR authoring and review-by-exception experience at vendor depth.

**Source-policy limitation**
- MasterControl official domains are outside the root AGENTS allowlist, but they were used because this tranche explicitly required official vendor sources.

**Official sources**
- [MasterControl ISO 9001 compliance page](https://www.mastercontrol.com/compliance/iso9001)
- [MasterControl learning services PDF](https://courses.mastercontrol.com/resources/Guide_to_Learning_Services.pdf)

## Cross-Vendor Synthesis

- The repo is strongest where the benchmark vendors overlap on regulated execution truth: release records, training and certification, supplier control, traceability, CAPA adjacency, and canonical data structures.
- The biggest vendor-class gaps are APS optimization, native supplier portal workflows, enterprise data platform / genealogy explorer depth, and unified eQMS suite cohesion.
- The best current repo advantage is not a single vendor clone. It is a composite backbone: canonical schema, release provenance, training governance, supplier traceability, and regulated evidence handling.

## Evidence Anchors In Repo

- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ApqpPpapService.php`
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md`
- `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html`
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`
