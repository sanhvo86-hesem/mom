# M1 — Glossary (V10)

```
chapter_id:     M1
version:        V10
chapter_purpose: every term defined once; cited from everywhere;
                 HESEM-specific meaning takes precedence; see-also
                 notes where colloquial meaning differs
owner_role:     Plan Editor + Domain Leads (one per domain)
cross_refs:     All parts (M1 is the authoritative vocabulary)
```

Terms are alphabetical within category. Per-term structure:
**Term** — Definition (1-3 sentences). *See also:* related terms.
*Ref:* canonical chapter(s).

---

## 1. Authority and Audit Terms

**Anchor** — Cryptographic digest of a day's audit events, stored externally (blockchain or immutable log service) for tamper-evidence. The anchor allows verification that no audit record was altered after close of business. *Ref:* B6 C1; H5.

**Audit Artifact** — Any record generated as evidence of a regulated activity, stored immutably and classified under H4 EC-1..EC-38. Audit artifacts are not editable after finalization; correction is a new artifact referencing the original. *See also:* Evidence Artifact. *Ref:* H4.

**Audit Chain** — The daily Merkle-anchored sequence of all authority-ledger mutations for a given root entity. The chain provides cryptographic continuity: any tampering with an intermediate record breaks the chain from that point forward. *Ref:* B6 C1.

**Audit Event** — A single atomic mutation record emitted to the Authority Ledger: who, when, what changed, from what value, to what value, with what justification. *Ref:* B6 C1.

**Authority Ledger** — The append-only log of all mutations to authoritative roots. The primary authoritative record; all read models are derived from it. *Ref:* B6 C1.

**Banned Decision (BD-N)** — One of 36 categories of regulated decision that HESEM AI is permanently prohibited from making autonomously. The N index is stable; BD-1 is lot release, BD-2 is nonconformance disposition, etc. *See also:* L1 §1; human authority boundary. *Ref:* L1.

**BD-1** — Lot or batch release (final disposition for distribution). Human authority always required. *Ref:* L1 §1.

**BD-2** — Nonconformance disposition (accept-as-is, rework, scrap, RTV). Human authority always required. *Ref:* L1 §1.

**BD-3** — CAPA effectiveness determination and closure. *Ref:* L1 §1.

**BD-4** — Document effectivity approval (controlled document release). *Ref:* L1 §1.

**BD-5** — Engineering change order approval with regulatory impact. *Ref:* L1 §1.

**BD-6** — Training qualification certification for regulated operations. *Ref:* L1 §1.

**BD-7** — Supplier qualification or disqualification decision. *Ref:* L1 §1.

**BD-8** — Recall initiation or recall scope modification. *Ref:* L1 §1.

**BD-9** — Qualified Person (QP) batch certification declaration (Pharma). *Ref:* L1 §1.

**BD-15** — Person Responsible for Regulatory Compliance (PRRC) declaration (Medical Device). *Ref:* L1 §1.

**BD-24** — ITAR person-of-record access grant (Aerospace). *Ref:* L1 §1.

**BD-31** — Sub-processor addition to DPA-governed data processing. *Ref:* L1 §1; I7.

**BD-32** — Tenant data region pinning change. *Ref:* L1 §1; I8.

**BD-33** — Tenant provisioning or deprovisioning. *Ref:* L1 §1; I8.

**BD-34** — Retention class assignment for a data category. *Ref:* L1 §1; H5.

**BD-35** — Audit chain anchor publication (cryptographic finalization). *Ref:* L1 §1; B6.

**BD-36** — AI model deployment to tenant production (for advisory use). *Ref:* L1 §1; L3.

**Chain Break** — Condition where the cryptographic continuity of the audit chain cannot be verified, indicating possible tampering. Chain break triggers a security incident per I3. *Ref:* B6 C1; H5.

**Compensating Action** — A domain action that reverses the effect of a prior action in a saga workflow. Compensating actions are idempotent and must themselves be audited. *See also:* Saga. *Ref:* B7.

**e-Signature** — An electronic signature compliant with 21 CFR Part 11 (US) or EU Annex 11 (EU): meaning, date, time, signatory identity, and system context captured and immutably stored. *Ref:* E7.

**Evidence Artifact** — Any record stored under H4 taxonomy and used to demonstrate regulatory compliance. Evidence artifacts have a defined retention class (per H5) and a defined evidence class (EC-1..EC-38). *See also:* Audit Artifact. *Ref:* H4.

**Evidence Class (EC-N)** — One of 38 categories of evidence artifact in H4 taxonomy. EC-1 = e-signature; EC-2 = override record; EC-3 = operation log; EC-4 = transaction record; ... EC-38 = cross-domain composite evidence. *Ref:* H4.

**Governance Ledger** — The log of all AI-assisted artifacts in HESEM, per L3 §3. Each entry records: artifact ID, model used, task class (L5 T1-T15), decision phrase, human reviewer, and outcome. *Ref:* L3.

**Immutable Audit Log** — The storage tier for audit events: append-only; no UPDATE or DELETE permitted at database level; WORM policy enforced at storage layer. *See also:* WORM. *Ref:* B6 C1; H5.

**OTG** — One-Time Guarantee (also: Operational Truth Graph). The substrate that ensures each authority-ledger mutation is written exactly once, anchored cryptographically, and accessible for verification by downstream consumers. *Ref:* B6 C2.

**Override Record** — An audit artifact (EC-2) recording that a human user explicitly disagreed with an AI advisory and made a different decision. Override records feed AI calibration and regulatory audit defense. *See also:* BD-N. *Ref:* L1 §1; L3.

**Saga** — A pattern for distributed, long-running workflows that span multiple aggregate roots. Each step is compensatable; the saga coordinator tracks state and triggers compensation on failure. *Ref:* B7.

**Tombstone** — A soft-delete marker preserving audit chain continuity for a deleted entity. The tombstone records who deleted what and when; the audit chain from before the tombstone remains intact. *Ref:* B6 C8.

**WORM** — Write-Once-Read-Many. A storage policy enforced at the object-storage or database layer that prevents modification or deletion of audit artifacts during their retention period. *Ref:* H5.

---

## 2. Workflow and State Terms

**Aggregate Root** — A DDD term for the root entity of an aggregate: the single authoritative owner of a set of related entities. All mutations to entities within the aggregate go through the root. *See also:* Authoritative Root. *Ref:* B6 C1; M3.

**Authoritative Root** — HESEM's term for an entity that owns a regulated decision, is governed by the OTG audit chain, and appears in the M3 root catalog. *See also:* Aggregate Root. *Ref:* M3.

**Batch** — A defined quantity of material processed under uniform conditions in a single manufacturing run. Pharma and Food packs use batch as the primary production unit (vs. lot in discrete manufacturing). *See also:* Lot. *Ref:* J1; J5.

**Bounded Context** — A DDD boundary within which a ubiquitous language is coherent and consistent. Each HESEM domain (C1-C14) defines one bounded context. *See also:* Domain. *Ref:* M2.

**CDC** — Change Data Capture. A mechanism that captures every INSERT/UPDATE/DELETE from the Authority Ledger and streams changes to downstream consumers (read models, integration, analytics). *Ref:* B8.

**Closed-Loop Workflow** — A workflow that cannot be marked complete until all dependent sub-workflows (e.g., CAPA items) are closed. CAPA loops through NC, through corrective action, through effectiveness review. *Ref:* C7; SM-6.

**Control Point** — A workflow gate at which a regulated decision must be made before the workflow can proceed. Control points always require human authority (per L1). *Ref:* B7; L1.

**Couplings** — Explicit links between state machines: hard couplings block state transition until the linked machine reaches a required state; soft couplings notify but do not block. *Ref:* B7.

**Decommissioning Event** — For Pharma/EU FMD: the act of scanning and deactivating a unique pack identifier at point of dispense. *Ref:* J1; C8.

**Dispatch** — Release of a Work Order to the shopfloor for execution. Dispatch transitions WO from PLANNED to IN_PROGRESS and triggers edge gateway data collection activation. *Ref:* D3; SM-3.

**Disposition** — The regulated decision following inspection or nonconformance review: accept-as-is, rework, scrap, or return-to-vendor. Disposition is BD-2 and requires human authority. *See also:* BD-2. *Ref:* D5; SM-5.

**Domain** — One of HESEM's 14 bounded contexts (C1-C14), each owning a coherent set of authoritative roots and a ubiquitous language. *Ref:* M2; Part C.

**Effectivity** — The time window during which a document revision or spec revision is the active version. Document effectivity is governed by SM-7 and requires controlled release (BD-4). *Ref:* D7; SM-7.

**Fulfillment** — The process of picking, packing, and shipping material against a Sales Order. In HESEM, fulfillment generates traceability artifacts (lot/serial consumed, DSCSA events for Pharma). *Ref:* C1; C5; C8.

**Hold** — A system-wide or domain-specific stop placed on a lot, item, or supplier preventing use until released. Holds are authoritative root events and are audit-trailed. *Ref:* B6 C5; SM-HOLD.

**Idempotency Key** — A client-supplied token that ensures a given operation is executed at most once, even if the client retries. Required for all saga steps and all mutation API endpoints. *Ref:* B7; E0.

**Lot** — A quantity of material traceable as a unit through production, inspection, and delivery. In regulated environments, lots are the primary traceability unit; each lot has a genealogy chain. *See also:* Batch. *Ref:* C5; C8.

**Lot Genealogy** — The parent-child lineage tree for lots: which input lots were consumed to produce which output lots. Genealogy chains are maintained per FSMA §204, DSCSA, and internal recall procedures. *Ref:* C5; C8; D11.

**Materialized View** — A denormalized projection over the Authority Ledger, maintained by CDC, used for list queries and dashboards. Materialized views are eventually consistent; regulated decisions always read from the Authority Ledger directly. *Ref:* B6 C3; B8.

**MPS** — Master Production Schedule. The time-phased plan for which items will be produced, in what quantities, and when. MPS drives MRP. *Ref:* C3; D3.

**MRP** — Material Requirements Planning. The calculation that explodes MPS demand through the BOM to determine component requirements and generate planned purchase orders and work orders. *Ref:* C3; D3.

**Read Model** — A projection of authoritative data optimized for read operations (list pages, dashboards, search). Read models are derived from Authority Ledger mutations via CDC; they are never authoritative. *See also:* Materialized View. *Ref:* B8.

**RTM** — Requirements Traceability Matrix. A mapping from User Requirement Specifications (URS) through functional specifications to test cases to test results, used to demonstrate validation coverage. *Ref:* D14; H2.

**Saga Coordinator** — The system component that tracks the state of a multi-step saga, determines which step to execute next, and triggers compensation on failure. *Ref:* B7.

**State Machine** — A formal definition of an authoritative root's lifecycle: allowed states, allowed transitions, trigger conditions, and guard conditions. State machines are documented in M4. *Ref:* M4.

**Throughput** — In MES context: the rate at which production operations are completed at a workcell or line, expressed as units per hour. *Ref:* C6; D3.

**URS** — User Requirement Specification. The validated, approved statement of what a regulated system must do. URS is the root of the RTM traceability chain. *Ref:* D14; H2.

**Workflow Event** — An asynchronous message emitted by a domain when a state transition occurs in one of its roots. Workflow events enable cross-domain choreography without synchronous coupling. *Ref:* B7; B8.

---

## 3. AI and Quality Terms

**Acceptance Rate** — The percentage of AI advisory outputs that a human user accepted (applied the recommendation) versus overrode or ignored. Tracked per model, per feature, per tenant; feeds model performance review. *Ref:* L2; L3.

**Advisory** — An AI output that recommends an action or flags a condition for human review, but does not autonomously execute any regulated action. All HESEM AI outputs are advisory (per L1). *Ref:* L1; L2.

**AI Governance Ledger** — *See:* Governance Ledger. *Ref:* L3.

**Banned Decision** — *See:* BD-N (above). *Ref:* L1.

**Calibration (AI)** — The alignment between a model's stated confidence scores and the realized accuracy of its outputs. A well-calibrated model that says "90% confident" is correct approximately 90% of the time. *Ref:* L3.

**Concept Drift** — The condition where the statistical relationship between model inputs and the correct output has changed over time, causing model performance to degrade. Detected by drift monitoring per L3 §5. *Ref:* L3.

**Confidence Threshold** — The minimum model output confidence required for HESEM to display an AI advisory to a human user. Below threshold, the advisory is suppressed. Thresholds are tenant-configurable within guardrails set by AI team. *Ref:* L2.

**Data Drift** — A change in the statistical distribution of model inputs (features) over time, which may precede concept drift or indicate changed operational conditions. *See also:* Concept Drift. *Ref:* L3.

**Drift Detection** — Automated monitoring of AI model input/output distributions against baseline. Drift triggers retraining consideration per L3 §5. *Ref:* L3.

**Feature Store** — The centralized repository of ML features (computed from operational data) used for model training and inference. Managed by ML Platform team. *Ref:* L2; K5 §3.4.

**FMEA** — Failure Mode and Effects Analysis. A systematic approach to identifying and prioritizing potential failure modes in a product or process. HESEM supports DFMEA (design) and PFMEA (process) for Auto pack and similar structured risk analysis for other packs. *Ref:* C2; J2.

**Hallucination** — An AI model output that asserts a fact not grounded in the provided context or training data. HESEM AI is prohibited from producing uncited output in regulated domains; citation is mandatory per L2 §4. *Ref:* L2.

**Human Authority Boundary** — The principle that humans, not AI systems, make regulated decisions in HESEM. The boundary is defined by the BD-1..BD-36 banned decision list. *See also:* BD-N. *Ref:* L1.

**Inference Cost** — The computational cost (CPU, GPU, tokens) of running an AI model on a given input. Inference cost is metered per L2 §9 and billed as a usage component per K1 §6. *Ref:* L2; K1.

**Kill Switch** — An administrator-controlled mechanism to immediately disable a specific AI feature for all tenants or a specific tenant. Kill switches are pre-production tested and tested in L4 red-team exercises. *Ref:* L4.

**Model Card** — A structured documentation artifact for an AI model deployed in HESEM, per L3 §3. Contains: model purpose, training data description, performance metrics, bias evaluation, limitations, and prohibited uses. *Ref:* L3.

**Model Lifecycle** — The governed sequence of stages for an AI model in HESEM: development → evaluation → staging → production → monitoring → retraining/retirement. Each stage has defined quality gates per L3. *Ref:* L3.

**Override Record** — *See above in Authority and Audit Terms.* *Ref:* L1; L3.

**PCCP** — Predetermined Change Control Plan. An FDA regulatory framework for medical devices using AI/ML that allows defined types of model changes without a new 510(k) submission, provided the changes stay within pre-approved bounds. *Ref:* J4; L3.

**RAG** — Retrieval-Augmented Generation. An AI architecture where the model retrieves relevant documents before generating output, enabling accurate citation and reducing hallucination risk. HESEM uses RAG for regulatory text summarization and PSUR drafting. *Ref:* L2.

**Red-Team Probe** — An adversarial test input designed to discover AI model behavior at edge cases, boundary conditions, or under manipulation. Red-team exercises are conducted quarterly per L4. *Ref:* L4.

**Retraining Decision** — The regulated decision (BD-36) to deploy a new model version to tenant production. Retraining decisions require human sign-off by the AI Lead and are logged in the governance ledger. *Ref:* L3; BD-36.

**SPC** — Statistical Process Control. Monitoring of a production process using control charts to detect statistically significant deviations from normal variation before they produce defects. HESEM MES supports SPC with configurable control chart types (X-bar/R, CUSUM, EWMA). *Ref:* C6; D5.

**Sub-Processor (AI)** — A third-party AI service (e.g., OpenAI, Anthropic, AWS Bedrock) used by HESEM to provide AI advisory features. Sub-processor selection and governance is per I7 §8 and L2 §8. *Ref:* I7; L2.

**T1-T15 Task Classes** — The 15 categories of AI-assisted work defined in L5, each with allowed and forbidden files, reading list, and decision phrase pattern. *Ref:* L5.

**Triple-Defense** — The three-layer enforcement of the human authority boundary at BD-N boundaries: UI (advisory-only label + no auto-execute button), API (server rejects any request to execute a BD decision without a human-generated token), and audit (every BD boundary event is logged regardless of outcome). *Ref:* L1 §3.

---

## 4. Compliance and Validation Terms

**21 CFR Part 11** — US FDA regulation governing electronic records and electronic signatures in regulated industries. Requires: access controls, audit trails, e-signatures with meaning and date, system validation. *Ref:* J1; E7; H2.

**21 CFR Part 820** — US FDA Quality System Regulation for medical devices (now aligned with ISO 13485). Governs design controls, production and process controls, corrective and preventive action, etc. *Ref:* J4; C2; C7.

**Annex 11** — EU GMP Annex 11: Computerised Systems. The EU equivalent of 21 CFR Part 11 for pharmaceutical manufacturing. Governs system validation, data integrity, e-signatures, and audit trails. *Ref:* J1; H2.

**APR** — Annual Product Review (also: Product Quality Review). A regulated Pharma requirement (EU GMP Chapter 1) to review product quality data annually and confirm the manufacturing process is consistent and appropriate. *Ref:* J1; C7; SM-APR.

**AS9100** — The aerospace quality management system standard (based on ISO 9001 with aerospace-specific requirements). HESEM J3 Aerospace pack supports AS9100 Rev D. *Ref:* J3.

**CAPA** — Corrective Action and Preventive Action. A systematic process for investigating quality problems (corrective) and preventing future occurrence (preventive). CAPA is BD-3 at effectiveness closure. *Ref:* C7; SM-6; BD-3.

**CSA** — Computer Software Assurance. FDA 2022 guidance recommending risk-based approach to software validation, emphasizing testing of software behavior and outcomes rather than prescriptive validation protocol execution. *Ref:* H2.

**CVLP** — Customer Validation Leverage Pack. HESEM's per-release package of validation evidence (RTM extracts, test results, risk deltas, SBOM) delivered to regulated tenants to reduce their own validation burden. *Ref:* H2 §14; K5 §7.2.

**DSCSA** — Drug Supply Chain Security Act (US). Requires pharmaceutical manufacturers, distributors, and dispensers to track and trace drug products through the supply chain using serialized identifiers. *Ref:* J1; C5; C8.

**EU MDR** — EU Medical Device Regulation (2017/745). The EU regulation governing medical device market access, including post-market surveillance, vigilance reporting, and notified body certification. *Ref:* J4; C7.

**EU FMD** — Falsified Medicines Directive (EU 2011/62/EC). Requires serialization and decommissioning of prescription medicines at point of dispense, implemented via the European Medicines Verification System (EMVS). *Ref:* J1; C8.

**FDA** — Food and Drug Administration (US). The regulatory authority for pharmaceutical products (CDER/CBER), medical devices (CDRB), and food safety (CFSAN) in the United States. *Ref:* J1; J4; J5.

**FSCA** — Field Safety Corrective Action. A regulated Medical Device activity to reduce risk associated with an in-market device, including recalls, modifications, and safety notices. FSCA is governed by SM-FSCA. *Ref:* J4; C7.

**FSMA** — Food Safety Modernization Act (US, 2011). A comprehensive food safety law requiring preventive controls, traceability, and food defense. HESEM J5 Food pack supports FSMA Part 117 (preventive controls) and §204 (traceability). *Ref:* J5; C5.

**FSVP** — Foreign Supplier Verification Program (FSMA). Requires US importers to verify that food imported from foreign suppliers meets US safety standards. *Ref:* J5; C4.

**GAMP 5** — Good Automated Manufacturing Practice version 5 (ISPE). The industry guideline for pharmaceutical computer system validation, categorizing systems from Category 1 (infrastructure) to Category 5 (configured/custom). *Ref:* H2.

**GxP** — Abbreviation for the family of Good Practice regulations (GMP, GLP, GCP, GDP, GPP). "GxP" is used when a statement applies to all regulated practices without specifying which. *Ref:* J1; H2.

**HACCP** — Hazard Analysis and Critical Control Points. A food safety management approach that identifies biological, chemical, and physical hazards in production and defines Critical Control Points where hazards can be prevented, eliminated, or reduced. *Ref:* J5; C6.

**IATF 16949** — The automotive quality management system standard (based on ISO 9001 with IATF-specific requirements for the automotive supply chain). HESEM J2 Auto pack supports IATF 16949. *Ref:* J2.

**IEC 62304** — International standard for medical device software lifecycle processes. Classifies software into safety classes (A, B, C) and requires corresponding levels of software development rigor. *Ref:* J4; C2.

**IQ** — Installation Qualification. The documented verification that a system is installed correctly in its intended environment, with all hardware, software, and utilities meeting specification. *Ref:* D14; H2.

**ISO 13485** — International standard for quality management systems specific to medical device manufacturers. *Ref:* J4.

**ISO 14971** — International standard for risk management applied to medical devices. Defines the risk management process: hazard identification, risk estimation, risk evaluation, risk control, residual risk evaluation. *Ref:* J4; C7.

**ITAR** — International Traffic in Arms Regulations (US). US export control regulations governing defense articles and defense services. HESEM J3 Aerospace pack includes ITAR data access controls and person-of-record tracking. *Ref:* J3; C10; BD-24.

**Notified Body (NB)** — A European conformity assessment body designated by EU member states to assess medical device compliance with EU MDR and IVDR. *Ref:* J4; C7.

**OQ** — Operational Qualification. The documented verification that a validated system operates correctly throughout its anticipated operating range. *Ref:* D14; H2.

**PCQI** — Preventive Controls Qualified Individual. An FDA FSMA requirement for food facilities to have at least one person trained in preventive controls who is responsible for the facility's food safety plan. *Ref:* J5; C10.

**Periodic Review** — A scheduled review of a validated system to confirm it remains in a controlled state (hardware/software unchanged; specifications current; no drift from validated configuration). Required by GAMP 5 and CSA guidance. *Ref:* H2; H6.

**PMS** — Post-Market Surveillance. The ongoing collection and analysis of in-market device performance data required by EU MDR and FDA. *Ref:* J4; C7.

**PQ** — Performance Qualification. The documented verification that a validated system consistently performs as intended under real-world operational conditions. *Ref:* D14; H2.

**PRRC** — Person Responsible for Regulatory Compliance. An EU MDR role (Article 15) responsible for ensuring that medical devices placed on the EU market comply with EU MDR. PRRC declaration is BD-15. *Ref:* J4; BD-15.

**PSUR** — Periodic Safety Update Report (Medical Device: EU MDR Art. 86). A scheduled post-market surveillance summary report submitted to regulatory authorities. HESEM AI assists with PSUR drafting (advisory only). *Ref:* J4; C7.

**QP** — Qualified Person. An EU-regulated individual responsible for certifying that each batch of pharmaceutical product meets specification before release for sale. QP declaration is BD-9. *Ref:* J1; BD-9.

**RTM** — *See above in Workflow and State Terms.* *Ref:* D14; H2.

**SCAR** — Supplier Corrective Action Request. A formal request to a supplier to investigate and correct a quality deficiency. *Ref:* C4; C7.

**SOC 2** — Service Organization Control 2 report. An auditor's report on a service organization's controls relevant to security, availability, processing integrity, confidentiality, and privacy (AICPA Trust Services Criteria). *Ref:* I7; K3.

**Validation Lifecycle** — The sequence: URS → functional specification → design specification → IQ → OQ → PQ → periodic review → change control → re-validation. *Ref:* H2.

**V-Model** — The validation methodology shape: requirements and design activities on the left leg, corresponding testing activities on the right leg, joined at the build/implementation. GAMP 5 uses a V-model approach. *Ref:* H2.

---

## 5. Operations and Infrastructure Terms

**Blue-Green Deployment** — A deployment pattern that maintains two identical production environments (blue and green), alternating which is live. Allows instant rollback by switching traffic back to the prior environment. *Ref:* I1; I4.

**Burn Rate** — Monthly cash expenditure. Used in K4 to model runway and raise timing. *Ref:* K4.

**CAC** — Customer Acquisition Cost. The total sales and marketing cost to acquire one new customer. *See also:* LTV. *Ref:* K4 §9.

**CDC** — *See above in Workflow and State Terms.*

**CFR** — Change Failure Rate. DORA metric: the percentage of deployments that result in a production incident requiring rollback or hotfix within 24 hours. *Ref:* I1; K5 §10.

**COGS** — Cost of Goods Sold. In SaaS, approximately equals infrastructure cost + customer success cost + implementation cost directly attributable to revenue. *Ref:* K4.

**DORA** — DevOps Research and Assessment. Four metrics (deployment frequency, lead time for change, change failure rate, MTTR) used to assess software delivery performance. HESEM targets Elite tier. *Ref:* I1; K5 §10.

**DR** — Disaster Recovery. The process and infrastructure for restoring service after a catastrophic failure. HESEM DR is defined per I4; RTO and RPO targets are per M5. *Ref:* I4; M5.

**Edge Gateway** — The shopfloor hardware device that collects machine and sensor data and forwards it to HESEM MES over a secured connection. Each site has one or more edge gateways per a site configuration root. *Ref:* C6; I6.

**FIPS 140-2** — Federal Information Processing Standard for cryptographic modules. Required for ITAR and US government data handling; relevant to J3 Aerospace sovereign tier. *Ref:* J3; I7.

**Game Day** — A scheduled drill simulating a disaster recovery or incident scenario to test team readiness, tooling, and documentation. Conducted quarterly per I3. *Ref:* I3.

**Idempotency Key** — *See above in Workflow and State Terms.* *Ref:* B7; E0.

**IDP** — Internal Developer Platform. The set of self-service tools, infrastructure, and pipelines that stream teams consume to build, test, and deploy services without per-request coordination with the platform team. *Ref:* K5 §4.

**ISA-95** — ANSI/ISA-95 international standard defining the interface between enterprise systems (ERP) and manufacturing systems (MES). HESEM's MES architecture follows ISA-95 Levels 1-4. *Ref:* C6.

**Lead Time (DORA)** — DORA metric: the time from a code commit being merged to that commit running in production. Elite target: < 1h P50. *Ref:* I1; K5 §10.

**LTV** — Lifetime Value (of a customer). The present value of the revenue a customer generates over the duration of the relationship, net of service cost. *See also:* CAC. *Ref:* K4 §9.

**Magic Number** — GTM efficiency metric: net new ARR in a quarter divided by prior quarter sales and marketing spend. Target ≥ 0.75. *Ref:* K4 §9.

**MTTR** — Mean Time to Restore (or: Mean Time to Recovery). DORA metric: the average time to restore service after a production incident. Elite target: < 1h P50. *Ref:* I3; K5 §10.

**Multi-Tenancy** — The architecture where a single application instance serves multiple customer organizations (tenants), with data and configuration isolated per tenant. HESEM is multi-tenant; isolation is at the PostgreSQL schema or database level per I8. *Ref:* B6 C5; I8.

**NRR** — Net Revenue Retention. Trailing 12-month ARR from existing customers (including expansion, contraction, and churn) divided by ARR from those same customers 12 months ago. Target ≥ 110% (Pro), ≥ 115% (Enterprise). *Ref:* K4; K2.

**OEE** — Overall Equipment Effectiveness. Shopfloor KPI combining availability, performance, and quality rates. HESEM MES computes OEE per workcell and per shift. *Ref:* C6.

**OTel** — OpenTelemetry. The open-source observability framework for distributed systems, providing APIs for traces, metrics, and logs. HESEM uses OTel as the primary telemetry standard. *Ref:* I3.

**p95 Latency** — The API response time at the 95th percentile. Used in SLO targets: e.g., "p95 < 800ms" means 95% of requests complete within 800ms. *Ref:* M5.

**RabbitMQ** — The message broker used in HESEM for event-driven integration between services and for saga coordinator messaging. *Ref:* B7; B8; I6.

**Redis** — The in-memory cache used in HESEM for session management, rate limiting, idempotency key deduplication, and feature flag evaluation. *Ref:* B6 C7; I6.

**Region Pinning** — A tenant configuration that restricts data processing to a specific geographic region. Required for EU GDPR data residency, ITAR sovereign requirements, and Vietnamese PDPD compliance. Region pinning change is BD-32. *Ref:* I8; BD-32.

**Replica Lag** — The delay between a write on the primary database server and that write being replicated to the read replica. Replica lag is monitored per I3; queries requiring fresh data must read from primary. *Ref:* I3.

**RPO** — Recovery Point Objective. The maximum acceptable data loss in a disaster recovery event, expressed as time (e.g., "RPO = 1 hour" means no more than 1 hour of data may be lost). *Ref:* I4; M5.

**RTO** — Recovery Time Objective. The maximum acceptable time to restore service after a disaster recovery event. *Ref:* I4; M5.

**SCADA** — Supervisory Control and Data Acquisition. Industrial control systems that monitor and control manufacturing equipment. HESEM integrates with SCADA via edge gateways per C6. *Ref:* C6.

**SLO** — Service Level Objective. A specific target metric for a service (e.g., "availability ≥ 99.9%"). SLOs are defined in M5 and enforced via monitoring per I3. *See also:* SLA. *Ref:* M5; I3.

**SLA** — Service Level Agreement. The commercial commitment to a customer about service performance, derived from SLOs with agreed remedies (credits) for violations. Per-tier SLA targets are in K1 §3. *See also:* SLO. *Ref:* K1; M5.

**Sovereign Tier** — A HESEM deployment tier for customers requiring air-gapped or country-specific cloud infrastructure (ITAR, EU data sovereignty, Vietnamese PDPD). Sovereign tier is the fifth tier per K1. *Ref:* K1; I8.

**Sub-Processor** — A third-party that processes personal data on behalf of HESEM in the course of delivering the service. Sub-processors are listed in the DPA and governed per I7 §8. Adding a sub-processor is BD-31. *Ref:* I7; BD-31.

**Tenant** — An isolated customer instance in HESEM. Each tenant has its own data schema, configuration, regulatory profile, and user set. *Ref:* B6 C5; I8.

**Uptime** — The proportion of time a service is available to tenants, expressed as a percentage. HESEM uptime targets are 99.5% (Core), 99.9% (Pro), 99.95% (Enterprise/Sovereign). *Ref:* K1 §3; M5.

---

## 6. Frontend and UX Terms

**AC** — Action Console. A HESEM frontend pattern (per F5) for high-cadence action-oriented interfaces such as lot disposition queues, inspection queues, and bulk approval workflows. *Ref:* F5.

**AR** — Authoritative Record shell. A HESEM frontend pattern (per F4) for individual entity detail views where regulated decisions are made and audit trail is visible. All Wave 1 roots use AR pattern. *Ref:* F4.

**Axe** — The accessibility testing library (axe-core / axe-playwright) used in HESEM's E2E test suite to enforce WCAG 2.1 AA compliance. *Ref:* tests/e2e/module-template-v4-axe.spec.ts.

**Bridge** — In HMV4 (module-template-v4), the bridge layer (`72-module-template-v4-bridge.js`) that connects the HMV4 prototype to the existing portal's service layer, event bus, and navigation system without modifying forbidden files. *Ref:* ADR-0004; mom/scripts/portal/72-module-template-v4-bridge.js.

**Component Contract** — A declaration of which visual tokens a UI component is allowed to override via GraphicsAuthority. Components may only use tokens declared in their contract. *Ref:* CLAUDE.md Graphics Authority.

**DL** — Dashboard Landing. A HESEM frontend pattern (per F1) for domain entry-point pages with summary KPIs, activity feeds, and navigation to lists. *Ref:* F1.

**ERD** — Entity Record Drawer. A HESEM frontend sub-pattern (per F6) for displaying related entity details in a side drawer without full navigation. *Ref:* F6.

**Feature Flag** — A runtime configuration switch that enables or disables a feature without a code deployment. HMV4 features are feature-flagged INERT by default per ADR-0001. *Ref:* ADR-0001; B6 C7.

**Fixture** — A pre-loaded JSON or HTML file used in pre-production HMV4 testing to supply realistic data without live API calls. Fixtures are never loaded by `mom/portal.html` per ADR-0004. *Ref:* ADR-0004; tests/fixtures/module-template-v4/.

**GraphicsAuthority** — The HESEM system for managing all visual design tokens (colors, spacing, typography, motion). All UI modules must read visual parameters through GraphicsAuthority; no hardcoded values permitted. *Ref:* CLAUDE.md; ADR-0009.

**HMV4** — HESEM Module Version 4 (module-template-v4). The pre-production frontend redesign program using slice-based architecture. *Ref:* CLAUDE.md; ADR-0001.

**ML** — Module List. A HESEM frontend pattern (per F2) for list/search views of a root entity type with filtering, sorting, and bulk operations. *Ref:* F2.

**NRD** — Non-modal Record Dialog. A HESEM frontend sub-pattern (per F7) for lightweight record creation or edit workflows that do not require full-page navigation. *Ref:* F7.

**Pattern** — A canonical visual and interaction template for a category of HESEM screens (DL, ML, WS, AR, AC, ERD, NRD, SFW). Patterns ensure consistency and reduce the cognitive load of users who work across domains. *Ref:* Part F.

**Pre-Production Posture** — The HESEM policy that all HMV4 surfaces are development/prototype grade, feature-flagged inert by default, and not described as production-ready in any communication. *Ref:* ADR-0001.

**SFW** — Sub-Flow Wizard. A HESEM frontend pattern (per F8) for multi-step regulated workflow completion (e.g., CAPA closure, batch release sign-off). *Ref:* F8.

**SH** — Shell layer. The HESEM frontend shell (per F0) that provides navigation, authentication context, and the module loading frame. The shell is managed by forbidden files (portal.html, 01-module-router.js); HMV4 modules must not modify it. *Ref:* F0; ADR-0004.

**Slice** — In HMV4, one root entity × one frontend pattern. The smallest independently deliverable unit of the HMV4 program. *Ref:* ADR-0005; CLAUDE.md.

**WS** — Workspace Projection. A HESEM frontend pattern (per F3) for operational work surfaces (Dispatch Board, Training Matrix, analytics dashboards) with real-time or near-real-time data updates. *Ref:* F3.

---

## 7. Per-Pack Specific Terms (J1–J5)

### J1 Pharma Pack

**Aseptic Processing** — The manufacture of sterile drug products by assembling components in a sterile environment without terminal sterilization. Requires Environmental Monitoring (EM) runs. *Ref:* J1; C6.

**Cleaning Validation** — The documented proof that a pharmaceutical manufacturing equipment cleaning procedure consistently removes residues of a prior product, cleaning agents, and microbiological contaminants to an acceptable level. *Ref:* J1; C6.

**Deviation** — An unplanned departure from an approved process or procedure in pharmaceutical manufacturing. Deviations are categorized (critical, major, minor) and must be investigated and closed per SM-DEV. *Ref:* J1; C7.

**EBR** — Electronic Batch Record. The paperless batch manufacturing record that captures each production step, operator, material lot, yield, and process parameter for a pharmaceutical batch. EBR is governed by SM-10 and is a prerequisite for batch release. *Ref:* J1; C6.

**Environmental Monitoring (EM)** — Systematic sampling and testing of the manufacturing environment (air, surfaces, personnel) for microbial contamination in sterile pharmaceutical manufacturing. *Ref:* J1; C6.

**GxP** — *See above in Compliance and Validation Terms.*

**ICSR** — Individual Case Safety Report. A pharmacovigilance report for an adverse drug reaction submitted to regulatory authorities (EMA, FDA). HESEM supports ICSR generation for Pharma pack. *Ref:* J1; C7.

**Media Fill** — A microbiological simulation of aseptic fill/finish using a sterile growth medium instead of product, to validate that the process and environment do not introduce contamination. *Ref:* J1; C6.

**QP Declaration** — The Qualified Person's certification that a pharmaceutical batch meets specification and may be released for sale (EU). BD-9. *Ref:* J1; BD-9.

**Stability Study** — A regulated pharmaceutical program that monitors product quality attributes over time under defined storage conditions to establish shelf life. *Ref:* J1; C7; SM-STAB.

### J2 Auto Pack

**8D Investigation** — A structured problem-solving methodology (8 Disciplines) used in the automotive industry for root cause analysis and corrective action, typically triggered by a supplier or customer quality defect. *Ref:* J2; C7.

**APQP** — Advanced Product Quality Planning. An automotive structured product development process (AIAG APQP manual) with defined phases and deliverables. Governed by SM-APQP. *Ref:* J2; C3.

**CSR** — Customer Specific Requirements. Quality requirements added by an automotive OEM or Tier-1 supplier on top of IATF 16949 that suppliers must flow down. *Ref:* J2; C1.

**LPA** — Layered Process Audit. A structured audit approach in automotive manufacturing where supervisors, managers, and plant leaders regularly audit key process parameters on the shop floor. *Ref:* J2; C6.

**PPAP** — Production Part Approval Process. An automotive industry process for suppliers to demonstrate that they can consistently produce a part meeting customer requirements, using 18 defined elements. *Ref:* J2; C4.

**PSW** — Part Submission Warrant. The cover document for a PPAP submission, signed by both supplier and customer to confirm approval. *Ref:* J2; C4.

### J3 Aerospace Pack

**AD/SB Compliance** — Airworthiness Directive and Service Bulletin compliance tracking. Aircraft operators and maintenance organizations are required to track and implement ADs (mandatory) and applicable SBs (recommended). *Ref:* J3; C9.

**CMMC** — Cybersecurity Maturity Model Certification. A US DoD framework for cybersecurity requirements for contractors handling Controlled Unclassified Information (CUI). Relevant to ITAR-regulated tenants. *Ref:* J3; I7.

**FAI** — First Article Inspection. AS9102 standard: a comprehensive inspection of the first production article to verify conformance to design documentation before production quantities are manufactured. *Ref:* J3; C6.

**GIDEP** — Government-Industry Data Exchange Program. A US government program for sharing technical information about parts, materials, and processes including failure data and counterfeit alerts. HESEM supports GIDEP submission (BD-22) for J3 tenants. *Ref:* J3; C4.

**NADCAP** — National Aerospace and Defense Contractors Accreditation Program. Industry-managed accreditation program for special processes in aerospace manufacturing (heat treatment, NDT, chemical processing). *Ref:* J3; C4.

**QPL/QML** — Qualified Products/Manufacturers List. Government-maintained lists of products/manufacturers approved for defense use. *Ref:* J3; C4.

### J4 Medical Device Pack

**DHF** — Design History File. FDA 21 CFR Part 820 requirement: the compilation of records that describes the design history of a finished device. *Ref:* J4; C2.

**DMR** — Device Master Record. The FDA 21 CFR Part 820 compilation of records that contains the procedures and specifications for a finished device. *Ref:* J4; C2.

**EUDAMED** — European Database on Medical Devices. The EU central database for medical device registration, clinical investigations, and vigilance data. HESEM supports EUDAMED registration for J4 tenants. *Ref:* J4; C12.

**GUDID** — Global Unique Device Identification Database (FDA). The US FDA database for medical device UDI data. HESEM supports GUDID submission for J4 tenants. *Ref:* J4; C8; C12.

**UDI** — Unique Device Identifier. A structured code placed on medical devices and their packaging to enable identification and traceability throughout the supply chain. Required by FDA (21 CFR Part 830) and EU MDR. *Ref:* J4; C8.

**Vigilance Report** — A medical device post-market vigilance report submitted to competent authorities when a device malfunction could lead to serious injury or death. Governed by SM-VIG in HESEM. *Ref:* J4; C7.

### J5 Food Pack

**CCP** — Critical Control Point. A step in the food production process where a control measure is applied to prevent, eliminate, or reduce a food safety hazard to an acceptable level. *Ref:* J5; C6.

**EMP** — Environmental Monitoring Program for food safety. Detects the presence of pathogens (Listeria, Salmonella) in the food production environment. *Ref:* J5; C6.

**HARPC** — Hazard Analysis and Risk-Based Preventive Controls. FSMA Part 117 framework for food facilities: identify hazards, implement preventive controls, monitor effectiveness. *Ref:* J5; C7.

**KDE/CTE** — Key Data Elements / Critical Tracking Events. FSMA §204 traceability rule: specific data points (lot codes, quantities, locations) that must be captured at defined points in the food supply chain. *Ref:* J5; C5; C8.

---

## 8. Commercial and GTM Terms

**ACV** — Annual Contract Value. The annualized value of a customer contract, excluding one-time implementation fees. Used for pipeline and cohort analysis. *Ref:* K1; K2.

**ARR** — Annual Recurring Revenue. The annualized value of all active subscription contracts. The primary SaaS revenue metric. *Ref:* K4.

**ARPU** — Average Revenue Per User (or per tenant). ACV divided by active tenants. Used for pricing tier modeling. *Ref:* K1; K4.

**GRR** — Gross Revenue Retention. The percentage of ARR from existing customers retained (excluding expansion). Target ≥ 95%. *Ref:* K4.

**ICP** — Ideal Customer Profile. A defined description of the customer type most likely to succeed with and expand on HESEM. Used to score and qualify pipeline. *Ref:* K2.

**Land-and-Expand** — The GTM motion of acquiring a customer on a limited scope (land), then growing ARR through additional users, modules, or packs (expand). The full HESEM motion is land-and-expand-multiply-deepen-recontract. *Ref:* K2.

**NPS** — Net Promoter Score. Customer loyalty metric: % promoters minus % detractors, from the question "How likely are you to recommend HESEM?" Target ≥ 50. *Ref:* K2; K5.

**OTE** — On-Target Earnings. The total compensation (base + commission) an AE earns at 100% of quota. *Ref:* K1 §18.

**Rule of 40** — A SaaS financial health metric: ARR growth rate + EBITDA margin (or FCF margin) should equal or exceed 40. *Ref:* K4 §6.2.

**TAM** — Technical Account Manager (in K5 context). Or: Total Addressable Market (in K2/K4 context). Context determines which meaning applies. *Ref:* K5 §9; K2 §3.

---

## 9. Security and Privacy Terms

**DPA** — Data Processing Agreement. A contract between HESEM (data processor) and the customer (data controller) governing how personal data is processed. DPA is a prerequisite for EU GDPR-regulated tenants. *Ref:* I7; C14.

**DPIA** — Data Protection Impact Assessment. A GDPR requirement to assess privacy risks of high-risk data processing activities before processing begins. *Ref:* I7; C14.

**GDPR** — General Data Protection Regulation (EU 2016/679). The EU data protection law governing the processing of personal data. HESEM maintains GDPR compliance for EU tenants via DPA, ROPA, DPIA, and erasure capability. *Ref:* I7; C14.

**mTLS** — Mutual TLS. A variant of TLS where both client and server authenticate using certificates. HESEM uses mTLS for service-to-service communication within the cluster. *Ref:* I7; K5 §4.

**PDPD** — Personal Data Protection Decree (Vietnam, Decree 13/2023/ND-CP). Vietnam's personal data protection regulation, analogous to GDPR. Requires data residency controls for Vietnamese tenant data. *Ref:* I7; C14.

**ROPA** — Record of Processing Activities. A GDPR Article 30 requirement documenting all personal data processing activities. *Ref:* I7; C14.

**SCIM** — System for Cross-domain Identity Management. A protocol for automating user provisioning and deprovisioning between identity providers and service providers. HESEM supports SCIM for Enterprise tenant SSO integration. *Ref:* I7; E1.

**SSO** — Single Sign-On. Authentication via a federated identity provider (SAML 2.0 or OIDC) rather than HESEM-local credentials. Enterprise tier requirement. *Ref:* E1; I7.

**WAF** — Web Application Firewall. A security control that inspects and filters HTTP/HTTPS traffic to protect against common web attacks (SQL injection, XSS, CSRF). *Ref:* I7.

**WebAuthn** — Web Authentication API. A W3C standard enabling passwordless authentication using hardware security keys or biometrics. Supported for HESEM Enterprise tier as a phishing-resistant MFA option. *Ref:* I7; E1.

---

## 10. Decision phrase

```
M1_GLOSSARY_V10_LOCKED
NEXT: M2_DOMAIN_MODELS.md
```
