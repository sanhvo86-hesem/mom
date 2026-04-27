# A4 — Standards & Regulatory Scope

This chapter names every international standard, regulation, and reference
framework HESEM honors. The list is exhaustive for V9. Any standard not
listed here is not part of HESEM's compliance posture and will not appear
in V9 plans, audit packs, or commitment documents.

The list has 18 primary standards plus per-vertical-pack standards.

---

## 1. Foundation standards (apply to all HESEM customers)

### S-01 — ISA-95 / IEC 62264 (Enterprise-Control System Integration)

Defines the boundary between Enterprise (ERP) and Manufacturing
Operations (MOM/MES). Establishes the four-level model: Level 4
Enterprise/ERP, Level 3 MOM/MES, Level 2 Control/SCADA/PLC, Level 1
Sensors/Instruments, Level 0 Physical Process. HESEM owns Levels 4
and 3, mediates Level 3 to Level 2 via the Edge Gateway, and
integrates with but does not own Levels 2, 1, 0.

HESEM honors this standard by:
- Architecting per the four-level model.
- Routing all OT writes through the Edge Gateway (PART_I description).
- Refusing direct PLC writes from the HESEM core.

### S-02 — ISA-88 / IEC 61512 (Batch Control)

Defines the recipe hierarchy (general → site → master → control →
executed) and the procedure model (procedure → unit procedure →
operation → phase) for batch manufacturing. Required for Pharma,
specialty chemical, and food-batch manufacturing.

HESEM honors this standard by:
- Modeling recipes per ISA-88 (described in PART_C / Pharma pack PART_J).
- Capturing executed batch records per the standard's data model.
- Ensuring batch records are immutable post-completion.

### S-03 — 21 CFR Part 11 (FDA — Electronic Records / Electronic Signatures)

US regulation for electronic records and electronic signatures in
FDA-regulated industries. Requires:
- Validation of computerized systems
- Audit trails that are tamper-evident
- Electronic signatures with signer identity, signature meaning, and
  the signed record clearly bound
- Hybrid systems (paper + electronic) controlled equivalently

HESEM honors this regulation by:
- Building the audit chain (PART_B / PART_H description).
- Capturing electronic signatures with printed signer name (snapshot at
  time of signing), signature meaning, datetime, and the canonical
  state hash of the signed record.
- Refusing hybrid systems by default; HESEM is fully electronic.

### S-04 — EU GMP Annex 11 (Computerised Systems)

European Union Good Manufacturing Practice regulation specific to
computerised systems. Requires risk-based validation, audit trails,
change control, periodic review, and incident management.

HESEM honors this regulation by:
- Producing system inventory per system module (PART_H description).
- Implementing change control via Engineering Change Order workflow.
- Producing periodic review evidence bi-annually minimum.
- Capturing incidents and integrating with CAPA program.

### S-05 — GAMP 5 Second Edition (2022) (ISPE Validation Methodology)

International Society for Pharmaceutical Engineering's validation
guidance, second edition published 2022. Defines five categorization
levels for software (Cat 1 infrastructure, Cat 3 commercial off-the-
shelf, Cat 4 configured, Cat 5 custom), and the V-model lifecycle.
Emphasizes risk-based validation and "critical thinking" over
checkbox compliance.

HESEM honors this standard by:
- Self-categorizing as GAMP 5 Cat 5 (custom) at the platform level.
- Customer instances of HESEM are GAMP 5 Cat 4 (configured).
- Offering Customer Validation Leverage Pack to reduce customer
  validation effort by leveraging HESEM-side validation evidence.

### S-06 — ISA / IEC 62443 (OT Cybersecurity)

International standard for industrial automation and control systems
cybersecurity. Defines Security Levels (SL-1 to SL-4), zones, and
conduits. SL-2 baseline for HESEM; SL-3 for regulated verticals.

HESEM honors this standard by:
- Implementing a Zone Map per industrial reference site (PART_I).
- Routing OT writes only through Conduits with mTLS, signed commands,
  and dual-control approval.
- Refusing direct HESEM-to-PLC commands without Edge Gateway mediation.

### S-07 — OWASP ASVS 5.0 (Application Security Verification Standard)

OWASP standard for application security verification. Defines three
levels: L1 (basic), L2 (verified), L3 (advanced). HESEM commits to L2
baseline, L3 for regulated tenants and aerospace ITAR.

HESEM honors this standard by:
- Producing per-tenant ASVS attestation (PART_I description).
- Implementing all 14 ASVS categories (V1 Architecture through V14
  Configuration).
- Quarterly review of attestation status.

### S-08 — OWASP API Security Top 10 (2023)

OWASP's top-10 list of API-specific security risks. HESEM honors by
specifying per-route mitigation against each risk:

```
API1 Broken Object Level Authorization      → tenant + RLS + ABAC
API2 Broken Authentication                   → OIDC + MFA + session mgmt
API3 Broken Object Property Level Auth       → field-level masking per role
API4 Unrestricted Resource Consumption       → rate limit + quota + complexity bound
API5 Broken Function Level Authorization     → policy directive + obligation check
API6 Unrestricted Access to Sensitive Flows  → e-sign on flows; replay protection
API7 Server Side Request Forgery             → SSRF allow-list; outbound audit
API8 Security Misconfiguration               → CIS benchmark; secret manager
API9 Improper Inventory Management           → API version registry; sunset policy
API10 Unsafe Consumption of APIs             → request validation; SSRF denies
```

### S-09 — OpenAPI 3.1.1 (API Contract Specification)

The current OpenAPI specification (Linux Foundation, January 2024).
HESEM uses OpenAPI 3.1.1 for all REST API contracts.

HESEM honors this standard by:
- Authoring an OpenAPI 3.1.1 contract per resource family (PART_E).
- Validating contracts in CI against the OpenAPI 3.1.1 schema.
- Detecting backward-incompatible changes via openapi-diff.
- Versioning contracts with semantic versioning.

### S-10 — RFC 9457 (Problem Details for HTTP APIs)

IETF standard for HTTP error response envelopes. Replaces RFC 7807
(deprecated). Defines a structured JSON error format with type URI,
title, status, detail, and instance.

HESEM honors this standard by:
- Defining a 62-entry problem registry (PART_E / PART_M).
- Returning RFC 9457 envelopes for every error path.
- Stable type URIs that never change semantically.

### S-11 — OpenTelemetry (Observability Semantic Conventions 1.27+)

Cloud Native Computing Foundation's standard for distributed tracing,
metrics, and logs. HESEM uses OpenTelemetry SDK in every service.

HESEM honors this standard by:
- Emitting OpenTelemetry-conformant traces, metrics, and logs.
- Using semantic conventions for resource attributes and span names.
- Routing all telemetry through OpenTelemetry Collector.

### S-12 — WCAG 2.2 Level AA (W3C Web Content Accessibility Guidelines)

W3C standard for web accessibility. Level AA is the legal requirement
in EU and Canada and the de-facto requirement in the US for B2B
software.

HESEM honors this standard by:
- axe-core continuous integration gate on every UI render.
- Manual screen reader testing per release.
- Annual third-party accessibility audit.

### S-13 — NIST AI Risk Management Framework 1.0 + Generative AI Profile (NIST AI 600-1)

National Institute of Standards and Technology's framework for AI risk
management. HESEM uses NIST AI RMF tiers (1, 2, 3) per AI feature.

HESEM honors this standard by:
- Authoring a NIST AI RMF risk profile per AI feature (PART_L).
- Refusing AI features outside the framework's controls.
- Quarterly NIST AI RMF profile review per feature.

### S-14 — DORA (DevOps Research and Assessment) — Accelerate Metrics

The four key metrics from "Accelerate" (Forsgren, Humble, Kim 2018):
deployment frequency, lead time for change, change failure rate, mean
time to restore. HESEM commits to Elite tier on these metrics from
Wave 8 onward.

### S-15 — ISO/IEC 27001:2022 (Information Security Management System)

International standard for information security management. HESEM
pursues ISO 27001 certification by Wave 13 (post-Wave 12 release
candidate).

### S-16 — ISO 14971:2019 (Medical Device Risk Management)

International standard for risk management in medical device
manufacturing. Required for Med Device vertical pack customers.

HESEM honors this standard by:
- Implementing the ISO 14971 risk file engine (PART_J Med Device).
- Linking nonconformance and complaint data to risk file review.

### S-17 — NIST SP 800-171 / CMMC 2.0 (DoD Controlled Unclassified Information)

US Department of Defense requirement for handling Controlled
Unclassified Information from defense contractors. CMMC 2.0 has
three levels (Foundational, Advanced, Expert).

HESEM honors this standard by:
- Per-tenant CMMC 2.0 control evidence pack (PART_J Aerospace).
- CUI handling with field-level marking, encryption, and access logging.

### S-18 — FDA Computer Software Assurance (CSA, 2022 draft guidance)

FDA's risk-based validation guidance, replacing exhaustive checkbox
validation with focused risk-based validation. HESEM uses CSA-aligned
tiered validation (HIGH, MEDIUM, LOW) per function.

---

## 2. Per-vertical-pack standards

### Pharma vertical pack

```
21 CFR Part 211 (US drug current Good Manufacturing Practice)
21 CFR Part 210 (general drug GMP)
ICH Q7 (Active Pharmaceutical Ingredients GMP)
ICH Q9(R1) (Quality Risk Management, 2023 revision)
ICH Q10 (Pharmaceutical Quality System)
ICH Q12 (Lifecycle Management)
ICH Q14 (Analytical Procedure Development, 2023)
EU GMP Annex 1 (Sterile Manufacturing, 2023 revision)
EU GMP Annex 13 (Investigational Medicinal Products)
EU GMP Annex 15 (Qualification & Validation)
EU GMP Annex 16 (Qualified Person Certification of Batches)
WHO TRS 957 / 992 (good manufacturing practices)
ISO 14644 (Cleanrooms)
USP <1058> (Analytical Instrument Qualification)
ICH E2B(R3) (ICSR Safety Reports)
DSCSA (US Drug Supply Chain Security Act)
```

Full description in PART_J / Pharma chapter.

### Automotive vertical pack

```
IATF 16949:2016 (Automotive Quality Management System)
VDA 6.3 (Process Audit; German automotive industry)
VDA 6.5 (Product Audit)
AIAG-VDA FMEA Handbook 2019
AIAG MSA 4th Edition (Measurement System Analysis)
AIAG SPC 2nd Edition
AIAG APQP 2nd Edition (Advanced Product Quality Planning)
AIAG PPAP 4th Edition (Production Part Approval Process)
ISO 26262 (Functional Safety, Automotive — for E/E components)
ASPICE (Automotive SPICE for software process)
CQI series (CQI-9 heat treat, CQI-11 plating, CQI-12 coating, CQI-15
welding, CQI-17 soldering, CQI-23 molding, CQI-27 casting)
VDA 19.1 / 19.2 (Technical Cleanliness)
IPC-A-610 (Electronics Acceptability)
```

Full description in PART_J / Automotive chapter.

### Aerospace vertical pack

```
AS9100D (Aerospace Quality Management System)
AS9101F (Auditing Aerospace QMS)
AS9102B / Rev C (First Article Inspection)
AS9110D (Aerospace MRO Maintenance)
AS9120B (Aerospace Distributors)
AS9145 (APQP / PPAP for Aerospace)
AS13100 (Aero Engine Supply Chain)
NADCAP series (National Aerospace and Defense Contractors Accreditation Program)
DFARS / NIST SP 800-171 / CMMC 2.0 (US DoD Cyber)
ITAR (International Traffic in Arms Regulations)
EAR (Export Administration Regulations)
14 CFR Part 21 (FAA Certification)
14 CFR Part 145 (FAA Repair Stations)
EASA Part 21G/J (EU Certification)
DO-178C (Aviation Software)
DO-254 (Aviation Hardware)
ARP 4754A (Aviation Systems Development)
ARP 4761 (Safety Assessment)
AS5553 (Counterfeit Electronic Parts Avoidance)
AS6174 (Counterfeit Materiel Avoidance)
MIL-STD-1916 (DoD Inspection Sampling)
```

Full description in PART_J / Aerospace chapter.

### Medical Device vertical pack

```
21 CFR Part 820 (US FDA Quality System Regulation)
ISO 13485:2016 (Medical Device Quality Management System)
EU MDR (Medical Device Regulation 2017/745)
EU IVDR (In Vitro Diagnostic Regulation 2017/746)
ISO 14971:2019 (Medical Device Risk Management)
IEC 62304 (Medical Device Software Lifecycle)
21 CFR Part 803 (Medical Device Reporting)
Article 87 EU MDR (Manufacturer Incident Report)
UDI rules (Unique Device Identification per FDA / EU MDR)
```

Full description in PART_J / Med Device chapter.

### Food vertical pack

```
21 CFR Part 117 (FSMA Preventive Controls)
21 CFR Part 111 (Dietary Supplements)
HACCP (Hazard Analysis Critical Control Points)
FSMA Section 204 (Traceability for high-risk foods)
GFSI-recognized standards (BRCGS, SQF, FSSC 22000, IFS Food)
```

Full description in PART_J / Food chapter.

---

## 3. Reference frameworks (informative, not commitments)

These frameworks inform the design but are not formal compliance commitments:

```
- Team Topologies (Skelton & Pais, 2019) — informs PART_K team structure
- Domain-Driven Design (Eric Evans) — informs PART_C domain separation
- Continuous Delivery (Humble & Farley) — informs PART_I deployment
- Site Reliability Engineering (Beyer et al, Google SRE Book) — informs PART_I
- The Phoenix Project / The Unicorn Project (Gene Kim) — informs PART_K culture
- The Toyota Production System (Ohno) — informs PART_C MES discipline
- Lean Software Development (Poppendieck) — informs PART_G wave sequencing
```

---

## 4. The standards crosswalk

PART_M7 (standards directory) contains the full crosswalk: per-standard,
which Part of V9 honors it, which capability implements it, which audit
artifact proves it. This master cross-reference is the single source of
truth for standards-to-plan linkage.

---

## 5. Decision phrase

```
A4_STANDARDS_REGULATORY_SCOPE_BASELINE_LOCKED
NEXT: A5_NORTH_STAR_AND_SUCCESS_METRICS.md
```
