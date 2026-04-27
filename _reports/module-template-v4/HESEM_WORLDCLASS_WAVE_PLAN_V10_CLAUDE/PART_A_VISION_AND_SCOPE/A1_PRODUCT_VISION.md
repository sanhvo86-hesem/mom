# A1 — Product Vision & Problem Statement

This chapter says what HESEM is, what problem it solves, and why the world
needs another piece of manufacturing software. Every later chapter derives
from the answers here.

---

## 1. The problem

A typical mid-market manufacturer has the following IT footprint:

- An **ERP** for finance, demand planning, and master data
  (often SAP S/4 HANA, Oracle EBS, Microsoft Dynamics, Infor, or SAP B1)
- A **MOM/MES** for plant execution
  (often Siemens Opcenter, Rockwell Plex, Dassault DELMIA, Aveva, or in-house)
- An **eQMS** for regulated quality
  (often MasterControl, ETQ Reliance, Veeva Vault QMS, Sparta TrackWise,
  Arena Quality, or in-house spreadsheets)
- A **PLM** for engineering data
  (often PTC Windchill, Siemens Teamcenter, Dassault ENOVIA, or Arena PLM)
- A **CMMS / EAM** for maintenance
  (often IBM Maximo, IFS, Aveva APM, or in-house)
- A **WMS / TMS** for warehouse and transport
  (often Manhattan, Blue Yonder, Oracle WMS, or in-house)
- A **CRM** for customer relationships
  (often Salesforce, Microsoft Dynamics 365 CRM, or HubSpot)
- An **analytics stack** for insight
  (often Snowflake, Databricks, Power BI, Tableau, or Palantir)
- A **document control system** for regulated docs
  (often SharePoint with custom workflow, or part of MasterControl / ETQ)
- A **training system** for workforce
  (often Cornerstone, SAP SuccessFactors, or in-house)

Each system has its own data model, its own user interface, its own access
control, its own audit log, its own validation evidence, its own integration
contracts. A regulated manufacturer running this stack must:

- Maintain integration points (typically 15-40 between these systems)
- Reconcile data inconsistencies daily
- Validate each system against its applicable regulations
- Train users on multiple UIs
- Pay multiple vendors with multi-year commitments
- Re-validate after every vendor upgrade

The total cost of ownership for a mid-market manufacturer running this stack
ranges from $2 million to $10 million per year (including license, hosting,
integration, validation, training, and support). The cost of integration
errors (wrong inventory counts, missed quality holds, late shipments)
typically adds another 5-10% of revenue as cost of poor quality.

This is the problem HESEM addresses.

---

## 2. The vision in one sentence

HESEM is an integrated Operations Operating Platform that replaces five to
ten separate manufacturing-software vendors with one authority-disciplined,
contract-first, evidence-first, AI-aware system covering ERP, MOM, MES,
eQMS, Digital Thread, and analytics for regulated and non-regulated
manufacturers.

---

## 3. The vision in five paragraphs

**Paragraph 1 — Authority discipline.** HESEM is built on the principle
that every change to a system-of-record root flows through an explicit
Authority Ledger and Workflow Command Bus. There are no hidden state changes
anywhere in the system. Workspaces never mutate; they project. Records are
authoritative. Mutations are commands. AI is advisory. This discipline is
inviolable. It is the foundation of regulated trust and the basis on which
every other capability in HESEM rests.

**Paragraph 2 — Evidence first.** Every mutation in HESEM produces an audit
event, a workflow event, and (for regulated mutations) an evidence record
with retention and write-once-read-many storage. The audit chain is hash
linked and daily anchored. This means HESEM customers, when audited by the
FDA, EMA, IATF, NADCAP, or any other regulator, can produce the full
evidence chain on demand within 24 hours and prove that no record has been
tampered with since its creation.

**Paragraph 3 — Contract first.** No live API endpoint exists in HESEM
without a written contract describing purpose, audience, request, success
result, and every failure mode. Contracts are versioned. Breaking changes
require major version bumps with deprecation periods. The same discipline
applies to events, data products, and workflows. HESEM customers integrating
with HESEM never have to reverse-engineer behavior; the contract is the
documentation.

**Paragraph 4 — Open standards.** HESEM honors 18 international standards
explicitly. ISA-95 and ISA-88 govern manufacturing operations. 21 CFR Part 11
and EU GMP Annex 11 govern electronic records and signatures in regulated
industries. GAMP 5 governs validation methodology. IEC 62443 governs OT
cybersecurity. OWASP ASVS governs application security. OpenAPI 3.1.1 and
RFC 9457 govern API contracts. OpenTelemetry governs observability. WCAG
2.2 AA governs accessibility. NIST AI RMF and the EU AI Act govern AI
governance. DORA governs delivery and reliability. ISO 27001 governs
information security management. ISO 14971 governs medical-device risk.
NIST SP 800-171 and CMMC 2.0 govern DoD CUI handling. FDA CSA governs
risk-based validation. HESEM is built on these standards, not in
opposition to them.

**Paragraph 5 — AI is advisory only.** HESEM uses AI to summarize, explain,
recommend, search, and retrieve. HESEM does not use AI to autonomously
release a lot, approve a disposition, close a CAPA, release a controlled
document, approve an engineering change, certify training, qualify a
supplier, or decide a recall. These eight regulated decisions remain in
human authority — always — and that boundary is enforced both at compile
time (CI tests scan command handlers) and at runtime (middleware rejects
mutations whose actor identity is an AI service principal). When a customer
asks "can your AI close my CAPAs for me?" HESEM answers "no, but it can
help your investigator do it faster and produce a stronger report."

---

## 4. The product the customer experiences

When a manufacturer adopts HESEM, the people who use it daily experience
the following:

- **Operators** on the shopfloor see a connected-worker app with their
  current work order, the operations sequence, the work instruction,
  the eligibility checks (training, equipment, material), and the step
  completion buttons. The app works offline for up to four hours and
  syncs on reconnect.

- **Quality inspectors** see an inspection workspace with the records to
  inspect today, the AQL sampling plans, the instrumentation eligibility,
  and the disposition workflow. When they raise a nonconformance, the
  case opens, the lot quarantines, and the CAPA candidates are
  pre-populated for review.

- **Quality engineers** see a CAPA workspace with their open cases, their
  effectiveness checks coming due, and the AI advisory that suggests root
  cause categories and similar prior cases. The engineer reads, agrees or
  disagrees, and acts. The AI does not act.

- **Document controllers** see a controlled-document workspace with
  documents in draft, in review, awaiting approval, released, or
  superseded. Engineering Change Orders are linked. Training assignments
  flow automatically when a document is released. Two-person electronic
  signature is captured per FDA 21 CFR Part 11 §11.50 and §11.70.

- **Production planners** see an MPS / MRP workspace with demand,
  capacity, and constraint analysis. They release jobs. The jobs flow
  to the shopfloor. The shopfloor reports back. Variance analysis is
  automatic.

- **Maintenance technicians** see their work orders, the scheduled
  preventive maintenance, the calibration windows, and the equipment
  status. They report completion. Calibration out-of-tolerance findings
  trigger automatic review of affected lots.

- **Quality directors** see the quality dashboard with first-pass yield,
  cost of poor quality, complaint trends, supplier scorecards, and CAPA
  effectiveness. They drill in. The data is consistent because it all
  comes from the same authority and the same audit trail.

- **Plant managers** see the OEE dashboard, the andon board, the schedule
  attainment, the day's quality posture, and the labor utilization. They
  walk the floor with confidence that the digital reflects the physical.

- **Regulatory affairs** see the audit-pack workspace. When the FDA, EMA,
  or notified body schedules an inspection, the affairs lead clicks
  "generate audit pack for FDA inspection," confirms the scope, and
  receives a signed bundle within 24 hours. The bundle contains
  validation master plan, IQ / OQ / PQ records, audit trails for sampled
  records, change control history, training records, risk assessment,
  incident log, periodic review, access control list, backup evidence,
  DR drill records, and penetration test reports — formatted for the
  specific regulator.

- **Executive leadership** see the platform health (SLO compliance, DORA
  metrics, cost per tenant, customer NPS) and the platform progress
  (capability maturity per domain, vertical pack readiness, customer
  pilot outcomes).

This is the product. Everything in V9 is in service of these experiences
being real.

---

## 5. What HESEM is not

HESEM is not:

- A general-purpose ERP for non-manufacturing industries (banking,
  healthcare delivery, retail e-commerce, government). HESEM is for
  manufacturers.

- A CAD or PLM replacement. HESEM integrates with PTC Windchill, Siemens
  Teamcenter, Dassault ENOVIA, and Arena PLM via documented connectors
  but does not redo their job.

- A general-purpose CRM. HESEM integrates with Salesforce, Microsoft
  Dynamics 365, and HubSpot via documented connectors. HESEM owns the
  customer record from the operations perspective (orders, complaints,
  shipments) but not the marketing or sales-pipeline perspective.

- A blockchain. HESEM uses cryptographic hash chains and (optionally) RFC
  3161 timestamping for audit-trail integrity. HESEM does not require a
  blockchain or a distributed-ledger system.

- A no-code platform. HESEM is configurable but configuration is governed
  by Engineering Change Order discipline. HESEM customers cannot bypass
  the workflow discipline by drag-and-drop.

- An autonomous decision system. HESEM AI is advisory. The eight banned
  regulated decisions never execute without human authority. This is by
  design and by the regulatory landscape; it is not a future feature.

- A monolith of closed protocols. HESEM uses OPC UA, Modbus, MQTT
  Sparkplug B, OpenAPI, RFC 9457, OpenTelemetry, Avro, and other open
  standards exclusively for integration.

---

## 6. The non-negotiable principles (carried into all later Parts)

```
P1   Authority is explicit. No hidden mutation.
P2   Evidence is mandatory. Every mutation produces audit, workflow, and
     evidence records.
P3   Contract first. No live API without written contract.
P4   Per-slice graduation. L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7.
     No skipping.
P5   Pre-production wording. "Production" only after Wave 8 cutover.
P6   Forbidden files protected. Specific files never modified except by ADR.
P7   Validation bidirectional. URS → RTM → IQ/OQ/PQ → maturity.
P8   Operations observable. OpenTelemetry everywhere.
P9   AI advisory only. Eight banned regulated decisions, always.
P10  Tenant isolation enforced. Row-level security plus middleware.
```

These ten principles pervade V9. Any deviation requires an ADR ratified by
the user.

---

## 7. The shape of the V9 plan in service of this vision

To realize this vision, V9 contains:

- An **architecture master plan** (PART_B) specifying the 8 layers and 12
  cross-cutting concerns and how they together implement the principles.

- A **capability catalog** (PART_C) listing the 105 capabilities across 14
  domains, each with a plain-language description.

- A **workflow catalog** (PART_D) listing the 14 end-to-end workflows that
  span multiple domains.

- An **API catalog** (PART_E) listing every endpoint with purpose,
  audience, request, success, and failure modes — described in plain
  language.

- A **frontend catalog** (PART_F) listing every UI surface with its
  purpose, the data it displays, the actions it offers, and which API
  endpoints back it.

- A **wave plan** (PART_G) sequencing the delivery in 14 waves plus 2
  continuous streams.

- A **quality and compliance posture** (PART_H) describing how
  regulatory, validation, audit, evidence, retention, periodic review,
  change control, CAPA, and risk management are handled.

- An **operations posture** (PART_I) describing deployment,
  observability, incident response, DR, capacity, cost, security ops,
  and tenant ops.

- **Vertical packs** (PART_J) for Pharma, Automotive, Aerospace, Medical
  Device, and Food.

- A **business model** (PART_K) describing pricing, GTM, partner
  ecosystem, funding, and customer success.

- An **AI discipline** (PART_L) describing AI governance, the AI feature
  catalog, the AI lifecycle, the AI red-team protocol, and the AI prompt
  discipline that humans use to engage AI productively.

- A **reference catalog** (PART_M) with glossary, root catalog, state
  machine directory, SLO directory, risk register, decision phrases,
  standards directory, and bibliography.

This is what V9 contains. The vision in this chapter is the reason V9 is
so comprehensive: building a platform of HESEM's scope without comprehensive
planning is how vendors end up with seven-figure professional services bills
to fix the integration and validation surprises later.

---

## 8. Decision phrase

```
A1_PRODUCT_VISION_BASELINE_LOCKED
NEXT: A2_TARGET_CUSTOMERS.md
```
