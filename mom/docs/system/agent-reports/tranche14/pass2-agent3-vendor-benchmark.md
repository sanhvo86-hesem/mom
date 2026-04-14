# Tranche 14 - Pass 2 Agent 3 Vendor Benchmark

Date: 2026-04-14

Scope note: I refreshed only official vendor sources when external refresh was needed. For ETQ, the current official pages now resolve to Octave Reliance; I used those current official URLs rather than stale legacy links. For Siemens Opcenter, several older deep links now redirect to current Siemens landing pages; I cite the current landing pages. No repository content was sent externally.

## Bottom Line

The tranche14 implementation materially improves truthfulness, proof hygiene, and authority separation in the repo. It does **not** materially improve product-level parity against SAP Digital Manufacturing, Siemens Opcenter APS, Siemens Opcenter Quality / QC / Supplier Quality, Critical Manufacturing, ETQ Reliance, or MasterControl.

The right reading is:

- stronger proof and lower false-confidence risk
- better bounded claims
- no new APS solver, supplier portal, enterprise data platform, SPC cockpit, or eBR/eDHR suite

That means the branch is more defensible, but it is still not vendor-class in the ways those suites are.

## Repo Evidence Re-Used

Local evidence for this pass came from current repo artifacts and tranche14 branch changes, especially:

- `mom/api/services/RuntimeAuthorityService.php`
- `mom/api/services/RegistryService.php`
- `mom/api/services/CanonicalManufacturingSpineService.php`
- `mom/api/controllers/HealthController.php`
- `mom/tools/registry/verify_publication_truth.py`
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `docs/architecture/canonical-shopfloor-execution-model.md`
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md`
- `docs/backend/EQMS_CONTROL_PLANE_CLOSURE_REGISTER.md`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ApqpPpapService.php`
- `mom/contracts/objects/planning_production--dispatch-lists/contract.json`
- `mom/contracts/event-index.json`
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html`
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html`
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`

## SAP Digital Manufacturing

**Table stakes**
- MOM execution platform.
- Planning-to-execution coordination.
- Work instructions, labor tracking, skills, and certification.
- S88 / S95 production-model support.

**Differentiators**
- Closed-loop resource planning.
- Workforce orchestration around production priorities.
- Cloud deployment on SAP Business Technology Platform.
- AI-guided KPIs and analytics.

**Repo match**
- `docs/architecture/canonical-shopfloor-execution-model.md` keeps dispatch execution truth separate from planning truth and preserves the dispatch/report join key.
- `mom/contracts/objects/planning_production--dispatch-lists/contract.json` models governed release, start, hold, complete, close, and cancel transitions.
- `mom/api/services/TrustedReleaseRecordService.php` strengthens provenance-aware release packaging and controlled evidence handling.
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` covers competence, certification, and assignment limits.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` freezes released job snapshot and controlled work-instruction context.

**Repo gaps**
- No live operator cockpit comparable to SAP DM resource orchestration.
- No runtime workforce integration equivalent to SAP SuccessFactors linkage.
- No closed-loop planning engine or top-floor to shop-floor orchestration depth.
- No productized embedded analytics stack at SAP DM breadth.

**Pass 2 assessment**
- Proof hygiene improved, but SAP DM parity did not.
- The branch is now safer to compare to SAP DM because it is less likely to overstate closure.
- The core SAP gap remains product breadth, not narrative quality.

**Official sources accessed 2026-04-14**
- [SAP Digital Manufacturing](https://www.sap.com/products/scm/digital-manufacturing.html)
- [SAP Digital Manufacturing features](https://www.sap.com/products/scm/digital-manufacturing/features.html)

## Siemens Opcenter APS

**Table stakes**
- Production planning and scheduling.
- BOM and material planning.
- MTO / MTS support.
- Detailed sequencing and scheduling.

**Differentiators**
- Finite-capacity scheduling.
- Long-term strategic planning, medium-term tactical planning, and detailed sequencing in one family.
- Constraint modeling and scenario comparison.
- Bottleneck detection and synchronization support.

**Repo match**
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` preserves frozen BOM / route snapshots per release.
- `mom/contracts/event-index.json` and `mom/contracts/command-index.json` preserve released / started / completed / held / dispatched lifecycle facts for planning-to-execution traceability.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` models demand, forecast, pegging, allocation, production order, and frozen release snapshots.
- `docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md` keeps planning as a governed layer, not a hidden execution authority.

**Repo gaps**
- No APS solver.
- No what-if optimization engine.
- No sequencer workspace.
- No finite-capacity scheduling loop proven in runtime code.

**Pass 2 assessment**
- No material movement on APS parity.
- The repo is more honest about being a governed planning shell, but it is still not an APS product.
- Any wording that suggests the repo now competes with APS on optimization would be an overclaim.

**Official sources accessed 2026-04-14**
- [Opcenter Advanced Planning and Scheduling](https://www.siemens.com/en-us/products/opcenter/advanced-planning-scheduling-aps/)
- [Preactor APS / Opcenter APS overview](https://www.sw.siemens.com/en-US/technology/preactor-aps/)

## Siemens Opcenter Quality / Quality Control / Supplier Quality

**Table stakes**
- Inspection-plan management.
- Incoming / production / outgoing inspection support.
- SPC.
- Nonconformance handling.
- Supplier quality and complaint management.

**Differentiators**
- Inspection-plan derivation from drawings or 3D models.
- Cloud QMS with closed-loop quality.
- Supplier assessment portal and complaint handling.
- APQP-oriented quality planning.

**Repo match**
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md` models NCR, CAPA, MRB, SCAR, OQC, IQC, holds, quarantine, and supplier-quality enforcement.
- `mom/api/services/ApqpPpapService.php` models APQP and PPAP gates.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier approval, scorecards, SCAR, and approved source control.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers receiving verification and traceability.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` and `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html` keep release, inspection, and quality reaction adjacent.

**Repo gaps**
- No verified native SPC cockpit.
- No automatic inspection-plan derivation from drawings or 3D models.
- No supplier portal at Opcenter Quality breadth.
- No single-suite quality cloud that closes every inspection / supplier / complaint loop in one runtime authority.

**Pass 2 assessment**
- The repo is materially better at quality-proof honesty, but not materially better at Opcenter Quality parity.
- The current branch still lacks the productized quality console and supplier portal that make the vendor family stand out.

**Official sources accessed 2026-04-14**
- [Opcenter X Quality cloud QMS](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms/)
- [Opcenter Quality family landing page](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms/)

## Critical Manufacturing

**Table stakes**
- Enterprise manufacturing data platform.
- Canonical data model across sites and MES versions.
- Event-centric capture and brokering.
- Genealogy / production history.

**Differentiators**
- Enterprise Data Platform framing.
- Canonical Data Model as a shared manufacturing language.
- Event-driven integration backbone.
- Multi-site standardization and enterprise-wide analytics.

**Repo match**
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` is the strongest local canonical model artifact and separates foundation, master, planning, MES, inventory, and eQMS layers.
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md` compares canonical write-model and projection-model boundaries.
- `mom/api/services/TrustedReleaseRecordService.php` strengthens provenance-aware release packaging and genealogy-aware evidence handling.
- `docs/backend/EQMS_CONTROL_PLANE_CLOSURE_REGISTER.md` and `docs/architecture/canonical-shopfloor-execution-model.md` both keep execution truth and derived projections separated.

**Repo gaps**
- No production enterprise data platform service.
- No canonical event ingestion / brokering layer.
- No productized genealogy explorer at Critical Manufacturing breadth.
- No proven multi-site event fabric with live cross-site analytics.

**Pass 2 assessment**
- The canonical model is more credible after tranche14 proof-layer work, but it is still a model, not an enterprise data platform.
- If the repo claims Critical Manufacturing parity, that would still be false confidence.

**Official sources accessed 2026-04-14**
- [The Data Platform for Manufacturers](https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/)
- [Genealogic](https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/)
- [Unified Namespace](https://www.criticalmanufacturing.com/mes-for-industry-4-0/unified-namespace/)

## ETQ Reliance

**Table stakes**
- Supply-chain quality management.
- PPAP, receiving and inspection, SCAR, supplier rating.
- Document control, training, audit management, CAPA, and change management.
- Connected eQMS workflows with a single source of truth.

**Differentiators**
- More than 40 ready-to-use applications.
- Document-control-triggered training.
- Codeless workflow configuration.
- Connected quality data across ERP, MES, PLM, CRM, and HR systems.

**Repo match**
- `mom/api/services/ApqpPpapService.php` covers APQP / PPAP gate behavior.
- `docs/backend/QUALITY_ENFORCEMENT_SPEC.md` covers supplier quality, SCAR, audit-readiness, CAPA, and document/training adjacency.
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html` covers supplier quality controls and scorecards.
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html` covers incoming verification and traceability.
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` gives the strongest local training backbone.

**Repo gaps**
- No unified ETQ-style eQMS suite shell.
- No built-in supplier portal / connected external collaboration workflow at ETQ breadth.
- No automatic training orchestration in runtime code when document revisions change.
- No single connected quality product surface combining document control, audit, CAPA, training, and supply-chain quality.

**Pass 2 assessment**
- Pass2 improved the repo’s credibility, but it did not create ETQ-scale connected quality.
- The current branch is still a governed quality backbone, not a full eQMS suite.
- A stale `etq.com` citation is itself a documentation hygiene problem now that the current official pages resolve to Octave Reliance.

**Official sources accessed 2026-04-14**
- [Reliance quality management software](https://www.octave.com/products/asset-performance-management/reliance)

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
- Digital production records / master production records in one suite.

**Repo match**
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html` is the strongest training-control backbone in the repo.
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html` provides controlled versioning and released-baseline behavior.
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` captures controlled release and shipment evidence.
- `mom/api/services/TrustedReleaseRecordService.php` provides provenance-aware trusted release packaging and evidence assembly.
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` includes document revision, change control, audit, competency, training matrix, and training record objects.

**Repo gaps**
- No single MasterControl-style suite for document control, training, CAPA, audit, and production records.
- No automatic training orchestration on document revision changes in runtime code.
- No full eBR/eDHR authoring and review-by-exception product surface.
- No productized manufacturing records cockpit comparable to MasterControl Manufacturing Excellence.

**Pass 2 assessment**
- The branch is more defensible about document and production-record governance, but that is still not MasterControl-class connected quality.
- No vendor-class workflow suite emerged from the implementation changes.
- Any claim of MasterControl parity would still be an overclaim.

**Official sources accessed 2026-04-14**
- [Document Control Software](https://www.mastercontrol.com/ppc/document-control-software/)
- [Quality Assurance Training](https://www.mastercontrol.com/quality/quality-assurance/training/)
- [Master Production Records Software](https://www.mastercontrol.com/manufacturing/production-records/)
- [Review by Exception](https://www.mastercontrol.com/manufacturing/review-by-exception/)
- [Manufacturing](https://www.mastercontrol.com/manufacturing/)
- [Guide to Learning Services PDF](https://courses.mastercontrol.com/resources/Guide_to_Learning_Services.pdf)

## Overclaims And Code-Fixable Defects

### Overclaims that should stay out of closure language

- Do not call the repo SAP DM-class just because dispatch, labor, skills, and release are governed.
- Do not call the repo APS-class just because planning snapshots and sequencing are constrained.
- Do not call the repo Opcenter Quality-class just because inspection, NCR/CAPA, and supplier quality are modeled.
- Do not call the repo Critical Manufacturing-class just because it has a canonical schema and genealogy projections.
- Do not call the repo ETQ-class just because it has quality, training, and supplier-quality controls.
- Do not call the repo MasterControl-class just because it has controlled release records and training governance.

### Code-fixable defects in this pass

- None in the vendor benchmark slice itself.
- The code changes improved proof and authority, but they did not add any missing vendor-family capability.
- The only fixable issue adjacent to this report is documentation hygiene: keep current official URLs current, especially where ETQ legacy domains now resolve to Octave Reliance and Siemens deep links redirect.

## Blockers

### External blockers

- No APS solver or optimization engine exists yet.
- No supplier portal or supplier-collaboration suite exists yet.
- No enterprise data platform service exists yet.
- No verified native SPC cockpit exists yet.
- No eBR/eDHR workflow suite exists yet.

### Product-scope blockers

- The repo still needs a decision on which vendor family is the next highest-leverage product gap to close.
- Until that decision exists, benchmark language must stay bounded and avoid pretending the current proof-layer improvements are equivalent to suite-level product parity.

## Final Verdict

The tranche14 implementation makes the repo more trustworthy, more auditable, and less prone to false closure claims. That is a real improvement. It also makes this benchmark more defensible because the repo now separates authority, projection, and publication truth more clearly.

What it does **not** do is close the product gap to the vendor families. The repo is still below world-class on:

- APS optimization
- supplier portal / connected quality depth
- enterprise data platform breadth
- native SPC cockpit depth
- eBR/eDHR manufacturing records

So the correct final read is:

- stronger truth layer: yes
- stronger world-class positioning: only modestly, and mainly by reducing overclaim risk
- actual vendor parity: no
