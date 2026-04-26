# H1 — Regulatory Landscape

```
chapter_purpose: comprehensive view of which regulations apply to
                 which customers, which HESEM components serve them,
                 which evidence proves conformance, and which roles
                 are accountable per regulation
owner_role:      Compliance Lead with Vertical Pack Leads
sources:         FDA CDER/CBER/CDRH guidances, EU EMA Q&As,
                 ICH Final Guidelines, ISO/IEC catalog,
                 IATF Sanctioned Interpretations, AS9100D handbook,
                 NIST AI RMF 1.0, EU AI Act Annex III,
                 WHO TRS 957/992
```

This chapter is the canonical map of the regulatory universe HESEM
operates inside. It exists once here; every other chapter cites it
rather than re-stating which clause applies. When an auditor asks
"how does HESEM satisfy 21 CFR 11.10(e)?" the trail starts here →
points to the implementing chapter (B6 / E7 / H4) → points to the
evidence class (per H4) → resolvable via E8 (Evidence API).

---

## 1. The four-layer regulatory model

HESEM treats regulation as four superimposed layers. Every customer
is the union of layers that apply to them.

```
Layer 1   Cross-vertical baseline   ISO 9001, ISO 27001, GDPR, accessibility
Layer 2   Vertical core             21 CFR 211, MDR, IATF 16949, AS9100D, FSMA
Layer 3   Sub-vertical or grade     sterile (Annex 1), high-risk MD class III,
                                    safety-critical auto (ISO 26262 ASIL D),
                                    aerospace defense (ITAR + CMMC)
Layer 4   Customer-specific         supplier quality manual, brand standard,
                                    proprietary CSR (customer-specific
                                    requirements)
```

A real Pharma sterile-injectable customer = L1 (ISO 9001 + ISO 27001
+ GDPR) + L2 (21 CFR 210/211 + ICH Q7/Q9/Q10) + L3 (Annex 1 sterile
+ Annex 16 QP + Annex 11 computerised) + L4 (their internal SOPs +
brand standard).

HESEM is built so L1+L2 are baseline (everyone gets them), L3 is
opt-in per vertical pack toggle, L4 is configurable per tenant
without touching code.

---

## 2. Per-vertical regulatory inventory

### 2.1 Pharmaceutical (drug substance + drug product)

```
US (FDA / cGMP)
  21 CFR Part 11        Electronic records and electronic signatures
  21 CFR Part 210       Current good manufacturing practice (general)
  21 CFR Part 211       cGMP for finished pharmaceuticals
  21 CFR Part 212       cGMP for PET drugs
  21 CFR Part 314       NDA / ANDA approvals + post-market reporting
  21 CFR Part 600-680   Biologics
  21 CFR Part 606       cGMP for blood / blood components
  21 CFR Part 803       MDR for combination products
  21 CFR Part 314.80    Field Alert Reports + MedWatch
  21 CFR Part 207       Establishment registration + drug listing
  DSCSA                 Drug Supply Chain Security Act (track + trace)
  PMDA + ICH cited      via Part 211 §211.84 acceptance criteria
EU (EMA)
  EU GMP Vol 4 Part I   GMP for finished medicinal products
  EU GMP Vol 4 Part II  GMP for active substances
  EU GMP Annex 1        Manufacture of sterile medicinal products
  EU GMP Annex 11       Computerised systems
  EU GMP Annex 13       Investigational medicinal products
  EU GMP Annex 15       Qualification + Validation
  EU GMP Annex 16       Certification by QP and batch release
  EudraLex Vol 4 Annex 17  Real Time Release Testing
  EudraLex Vol 4 Annex 21  Importation of medicinal products
  EU FMD                Falsified Medicines Directive (serialization)
ICH (global)
  ICH Q1A(R2)           Stability testing
  ICH Q2(R2)            Validation of analytical procedures
  ICH Q3                Impurities
  ICH Q5                Quality of biotech products
  ICH Q6A/B             Specifications + acceptance criteria
  ICH Q7                GMP for APIs
  ICH Q8(R2)            Pharmaceutical development (QbD)
  ICH Q9(R1)            Quality risk management
  ICH Q10               Pharmaceutical quality system
  ICH Q11               Development + manufacture of drug substance
  ICH Q12               Lifecycle management
  ICH Q13               Continuous manufacturing
  ICH Q14               Analytical procedure development
  ICH E2B(R3)           Adverse event reporting
WHO
  WHO TRS 957           PQS pharmaceutical quality system
  WHO TRS 992           Good data and record management
Other
  PIC/S Annex 1, 11 (mirrors EU GMP for non-EU regulators)
  Health Canada Division 2 GMPs
  ANVISA Brazil RDC 658 (mirrors WHO + EU GMP)
```

### 2.2 Medical Device

```
US (FDA)
  21 CFR Part 820         Quality System Regulation (transitioning to
                          QMSR per 2024 final rule, full effect 2026)
  21 CFR Part 821         Medical device tracking
  21 CFR Part 830         UDI
  21 CFR Part 803         Medical device reporting
  21 CFR Part 806         Reports of corrections + removals
  21 CFR Part 807         Establishment registration + listing
  21 CFR Part 11          Electronic records + signatures
EU
  EU MDR 2017/745         Medical devices (active since May 2021)
  EU IVDR 2017/746        In-vitro diagnostics (active since May 2022)
ISO
  ISO 13485:2016         Medical device QMS
  ISO 14971:2019         Risk management
  ISO 14155:2020         Clinical investigation
  ISO 10993 series       Biological evaluation
  ISO 11607              Sterile barrier packaging
Software / Software-as-Medical-Device
  IEC 62304:2006+A1:2015  Software lifecycle
  IEC 82304-1            Health software
  ISO/TR 80002-1         Validation of software for medical device QMS
  IEC 62366-1:2015       Usability engineering
  IMDRF SaMD framework   Risk categorization
Cybersecurity
  FDA Premarket Cyber Guidance 2023
  FDA Postmarket Cyber Guidance 2016 (revision pending)
  IEC 81001-5-1          Health software security lifecycle
```

### 2.3 Automotive

```
QMS
  IATF 16949:2016        Automotive QMS (built on ISO 9001:2015)
  IATF Sanctioned Interpretations (live updates)
Customer-specific (top OEMs all publish CSRs)
  Ford CQ-9000           Ford supplier QMS
  GM BIQS                Built-in Quality Supply
  Stellantis CSR
  Toyota TS16949 supplements
  VW Formel Q
  BMW VDA 6.3 supplements
  Hyundai HKMC SQ
Methodology (VDA + AIAG)
  AIAG-VDA FMEA 2019     Failure mode + effects analysis
  VDA 6.3                Process audit
  VDA 6.5                Product audit
  AIAG MSA 4th           Measurement systems analysis
  AIAG SPC 2nd           Statistical process control
  AIAG APQP 2nd          Advanced product quality planning
  AIAG PPAP 4th          Production part approval process
  AIAG CQI-9             Heat treat system assessment
  AIAG CQI-11            Plating system assessment
  AIAG CQI-12            Coating system assessment
  AIAG CQI-15            Welding system assessment
  AIAG CQI-17            Soldering system assessment
  AIAG CQI-23            Molding system assessment
  AIAG CQI-27            Casting system assessment
Functional safety
  ISO 26262:2018         Road vehicles functional safety
  ISO 21448:2022         SOTIF safety of intended functionality
  ISO 21434:2021         Road vehicle cybersecurity
Software process
  Automotive SPICE 4.0
  ISO/IEC 33020          Process capability
Cleanliness
  VDA 19.1               Inspection of technical cleanliness
  VDA 19.2               Technical cleanliness in assembly
```

### 2.4 Aerospace and Defense

```
QMS
  AS9100D                Aerospace QMS (built on ISO 9001:2015)
  AS9101F                Audit of QMS
  AS9102B/C              First Article Inspection
  AS9110D                MRO QMS
  AS9120B                Distributor QMS
  AS9145                 APQP + PPAP for aerospace
  AS13100                AESQ supplier quality requirements
US defense
  DFARS 252.204-7012     Safeguarding Covered Defense Information
  NIST SP 800-171 r2     Protecting Controlled Unclassified Information
  CMMC 2.0               Cybersecurity Maturity Model Certification
  ITAR                   International Traffic in Arms (22 CFR 120-130)
  EAR                    Export Administration Regulations (15 CFR 730)
US civil aviation
  14 CFR Part 21         Certification procedures
  14 CFR Part 25         Transport airplane airworthiness
  14 CFR Part 33         Aircraft engines
  14 CFR Part 43         Maintenance + alteration
  14 CFR Part 145        Repair stations
  AC 21-9                FAA conformity inspection
EU civil aviation
  EASA Part 21 Subpart G   Production organisation approval
  EASA Part 21 Subpart J   Design organisation approval
  EASA Part 145            Maintenance organisation approval
Software / hardware
  DO-178C                 Software DAL A-E
  DO-254                  Hardware DAL A-E
  DO-200B                 Aeronautical data
  DO-330                  Tool qualification
  ARP 4754A               System development
  ARP 4761                Safety assessment
  ARP 5580                Reliability program
  CMMI for development
Counterfeit
  AS5553                  Counterfeit electronic parts avoidance
  AS6174                  Counterfeit material avoidance (other than
                           electronic)
  GIDEP                   Government-Industry Data Exchange Program
NADCAP (Performance Review Institute)
  AC7004                  Quality system
  AC7102                  Heat treating
  AC7108                  Chemical processing
  AC7110                  Welding
  AC7114                  Coatings
  AC7116                  Surface enhancement
  AC7117                  Composites
  AC7118                  Conventional machining as a special process
  AC7121                  Sealants
  AC7126                  Materials testing labs
  AC7137                  Elastomer seals
Other
  MIL-STD-1916            DOD acceptance sampling
  MIL-STD-1629            Procedures for performing FMECA
  MIL-HDBK-217            Reliability prediction
```

### 2.5 Medical Device — sub-stratification

Risk classification drives validation depth:
```
EU MDR Class I            self-declaration, technical file
EU MDR Class IIa          Notified Body involvement (sample audit)
EU MDR Class IIb          NB design dossier review
EU MDR Class III          NB full design examination + clinical eval
US FDA Class I            general controls; mostly 510(k) exempt
US FDA Class II           special controls + 510(k)
US FDA Class III          PMA + extensive clinical
SaMD Class A-D (IMDRF)    significance × healthcare situation
```

### 2.6 Food

```
US
  21 CFR Part 117         Preventive controls for human food (FSMA)
  21 CFR Part 111         Dietary supplements GMP
  21 CFR Part 110         Current good manufacturing practice (legacy)
  21 CFR Part 113         Thermally processed low-acid foods (canned)
  21 CFR Part 114         Acidified foods
  21 CFR Part 120         HACCP juice
  21 CFR Part 123         Seafood HACCP
  21 CFR Part 507         Animal food preventive controls
  FSMA Foreign Supplier Verification
  FSMA Sanitary Transportation (Part 1.900)
  FSMA Intentional Adulteration (Part 121)
  FSMA Traceability (Part 1.1300, full effect 2026)
EU
  EU 178/2002             General Food Law
  EU 852/2004             Hygiene of foodstuffs
  EU 853/2004             Specific hygiene rules animal origin
  EU 396/2005             Pesticide residues
  EU 1169/2011            Food information to consumers
GFSI-recognized
  BRCGS Food Safety Issue 9
  SQF Edition 9
  FSSC 22000 v6
  IFS Food v8
ISO
  ISO 22000:2018          FSMS
  ISO 22002 series        PRP technical specifications
  ISO 22005               Traceability
Codex Alimentarius
  CXC 1                   General Principles of Food Hygiene + HACCP Annex
  CXC 36                  Hygienic harvesting and primary processing
```

### 2.7 Cross-vertical (applies everywhere)

```
Quality
  ISO 9001:2015           General QMS
  ISO 19011:2018          Audit guidelines
Information Security
  ISO/IEC 27001:2022      ISMS
  ISO/IEC 27002:2022      Controls
  ISO/IEC 27017:2015      Cloud-specific controls
  ISO/IEC 27018:2019      PII in public cloud
  ISO/IEC 27701:2019      PIMS extension to 27001
  SOC 2 (AICPA)           Security/Availability/Confidentiality/Privacy/
                           Processing Integrity
IT Service Management
  ISO/IEC 20000-1:2018    SMS
AI governance
  NIST AI RMF 1.0         AI risk management
  NIST AI 600-1           Generative AI profile
  ISO/IEC 42001:2023      AI management system
  ISO/IEC 23894:2023      AI risk management
  ISO/IEC 25059:2023      AI quality model
  ISO/IEC 5259 series     AI data quality
  EU AI Act 2024/1689     prohibited / high-risk / GPAI
  EU AI Act Annex III     high-risk use case list
Privacy
  GDPR (EU 2016/679)      EU data protection
  UK GDPR + DPA 2018
  CCPA / CPRA (US-CA)
  PIPEDA (Canada)
  LGPD (Brazil)
  PIPL (China)
  PDPA (Singapore, Thailand variants)
Accessibility
  WCAG 2.2 Level AA       web content accessibility (W3C)
  EN 301 549              EU public sector accessibility
  ADA / Section 508 (US)
  EAA (EU 2019/882, effective June 2025)
Software contracts
  OpenAPI 3.1.1
  RFC 9457 Problem Details (replaces RFC 7807)
  JSON Schema 2020-12
  OpenTelemetry semantic conventions
  Cloud Events 1.0
Industrial cybersecurity
  ISA/IEC 62443 series
  NIST SP 800-82 r3       OT security guide
  IEC 62443-4-1           secure product development
  IEC 62443-3-3           system security requirements
ERP-MOM-MES standards
  ISA-95 / IEC 62264      Enterprise-control integration
  ISA-88 / IEC 61512      Batch control
  ISA-101                 HMI design (operator-effective UIs)
  ISA-106                 Procedural automation
  Mimosa CCOM             Common conceptual object model (asset)
Validation discipline
  GAMP 5 Second Edition (2022)
  FDA CSA 2022 Final Guidance
  PI 011-3 PIC/S          Computerised systems validation
  ICH Q9(R1)              Risk-based validation
  PDA TR-78               Patch + change control
  ASTM E2500              Specification + design + verification
Supply chain
  ISO 28000:2022          Supply chain security
  C-TPAT                  US CBP partnership
  AEO                     EU authorised economic operator
```

---

## 3. Per-jurisdiction regulator and notification map

```
US        FDA (drug/device/food, multiple centers: CDER/CBER/CDRH/CFSAN)
          USDA-FSIS (meat/poultry/eggs)
          NIST (cyber baselines)
          NHTSA (auto safety)
          FAA (aviation)
          DoD (CMMC/DFARS)
          OSHA (worker safety)
          EPA (chemicals + waste)
          ATF (alcohol/tobacco/firearms when applicable)
          Customs and Border Protection (import)
EU        EMA + national competent authorities (drug)
          Notified Bodies designated under MDR/IVDR (device)
          EFSA (food risk assessment)
          ECHA (chemicals)
          EASA (aviation)
          ENISA (cyber)
          ESMA (financial when applicable)
          National data protection authorities (GDPR)
          AI Act competent authorities (per Member State, designation
          ongoing through 2025-2026)
JP        PMDA (drug+device), MHLW (food/cosmetics)
KR        MFDS (drug+device+food)
CN        NMPA (drug+device), SAMR (food+general)
IN        CDSCO (drug+device), FSSAI (food)
AU/NZ     TGA / Medsafe / FSANZ
BR        ANVISA (drug+device+food)
CA        Health Canada (drug+device), CFIA (food)
LATAM     COFEPRIS (Mexico), INVIMA (Colombia)
MENA      SFDA (Saudi), MOH (UAE)
RU        Roszdravnadzor + Rospotrebnadzor (note: trade-restricted)
GLOBAL    ICH (drug), GHTF/IMDRF (device), Codex (food), ICAO (aviation)
```

Notification timing windows HESEM must support:

```
FDA MDR (death)                        24 hours awareness; 30 days written
FDA MDR (serious injury)               30 days written
EU MDR Vigilance (serious incident)    15 days; 2 days serious public health
EU GMP product quality complaint       per QP; falsified medicines: same day
DSCSA suspect product                  3 business days notify FDA
21 CFR 314.80 Field Alert Report       3 business days
GIDEP suspect counterfeit              60 days for US gov contracts
DSCSA illegitimate product             1 business day notify trading partners
FSMA Reportable Food Registry          24 hours
GDPR breach notification               72 hours awareness
EU NIS2 incident                       early warning 24h, full 72h, final 1m
```

---

## 4. HESEM component-to-regulation mapping (canonical)

This table is normative. When implementing a regulatory clause, the
implementing chapter must satisfy what is listed here. Reverse: when
auditors ask "where is this clause implemented" they get the chapter.

```
Regulation clause                     HESEM home               Evidence (per H4)
21 CFR 11.10(a) validation            B6 cross-cutting + H2    validation
21 CFR 11.10(b) accurate copies       E8 evidence API + H4     evidence_artifact
21 CFR 11.10(c) record protection     B6 audit chain + H5      audit_anchor
21 CFR 11.10(d) limited access        B6 RBAC/ABAC + I7        access_audit
21 CFR 11.10(e) audit trail           B6 C1 audit chain        audit_anchor + transaction
21 CFR 11.10(f) operational checks    B7 state machines        transaction
21 CFR 11.10(g) authority checks      B6 RBAC + L1 (AI BD)     access_audit
21 CFR 11.10(h) device checks         C6 edge gateway + B8     telemetry
21 CFR 11.10(i) training              D8 train-to-qualify      training
21 CFR 11.10(j) accountability policy C7 doc lifecycle         signature + doc_record
21 CFR 11.10(k) doc controls          D7 document lifecycle    doc_record + signature
21 CFR 11.50 manifestations of sigs   E7 e-sig API             signature
21 CFR 11.70 sig-record linking       E7 + B6 OTG axiom        signature
21 CFR 11.100 general sig req         E7 e-sig API             signature
21 CFR 11.200 e-sig components        E7 e-sig API             signature
21 CFR 11.300 controls for ID codes   I7 + B6 secrets          access_audit
EU GMP Annex 11 §4 validation         H2 validation lifecycle  validation
EU GMP Annex 11 §6 accuracy checks    B6 OTG axioms            transaction
EU GMP Annex 11 §7 data storage       B6 + H5 retention        retention
EU GMP Annex 11 §8 printouts          E8 + F4 record print     evidence_artifact
EU GMP Annex 11 §9 audit trails       B6 C1 audit chain        audit_anchor
EU GMP Annex 11 §10 change control    H7 change control        change_record
EU GMP Annex 11 §11 periodic eval     H6 periodic review       periodic_review
EU GMP Annex 11 §12 security          I7 security operations   access_audit
EU GMP Annex 11 §13 incident mgmt     I3 incident response     incident_record
EU GMP Annex 11 §14 e-signatures      E7 e-sig API             signature
EU GMP Annex 11 §15 batch release     D10 batch-to-release     batch_release
EU GMP Annex 11 §16 BCM               I4 DR + backup           dr_drill
EU GMP Annex 11 §17 archiving         H5 retention             retention
ISO 13485 4.1 QMS                     B0..B9 architecture      n/a (substrate)
ISO 13485 4.2.4 control of records    B6 + H5                  audit_anchor
ISO 13485 4.2.5 control of documents  D7                       doc_record
ISO 13485 7.5.6 validation processes  H2                       validation
ISO 13485 8.2.1 feedback              D12 complaint            complaint_record
ISO 13485 8.2.2 complaint handling    D12                      complaint_record
ISO 13485 8.2.3 reporting to authority  D12 + per H1 §3 windows reportable_event
ISO 13485 8.2.4 internal audit        H3 audit program         audit_record
ISO 13485 8.3 nonconforming product   D5 + D6                  nc_record
ISO 13485 8.5 improvement / CAPA      D6 + H8                  capa_record
ISO 14971 risk file                   H9 + per-product folder  risk_record
IATF 16949 7.5.3.2.1 record retention H5                       retention
IATF 16949 8.3.4.4 product approval (PPAP)  J2 pack            ppap_record
IATF 16949 9.1.1.1 process monitoring C6 SPC                   spc_record
IATF 16949 10.2.3 problem solving (8D) D6                      capa_record + 8D fields
AS9100D 8.5.1.3 production control    C6 + D3                  wo_record
AS9100D 8.5.1.4 doc compliance        D7                       doc_record
AS9100D 8.5.1.5 verification of work  C6 first-piece           inspection_record
AS9100D 8.7 control of nonconforming  D5 disposition           nc_record
AS9100D 9.1.1 monitoring + measurement B9                     telemetry
NIST AI RMF MAP                       L0..L5 + per feature card model_card
NIST AI RMF MEASURE                   L4 red-team              redteam
NIST AI RMF MANAGE                    L1 + override capture    override_record
EU AI Act Art 9 risk management       L3 + H9                  ai_risk_record
EU AI Act Art 10 data + governance    L3 §2 + L3 model card    data_lineage
EU AI Act Art 11 technical doc        L3 model card            model_card
EU AI Act Art 12 record-keeping       L4 + B6 audit chain      audit_anchor
EU AI Act Art 13 transparency         F catalog: confidence    advisory_render
EU AI Act Art 14 human oversight      L1 banned decisions      override_record
EU AI Act Art 15 accuracy + robust    L3 KPI + L4 red-team     redteam
GDPR Art 5 principles                 B6 C5 tenant + H5        retention
GDPR Art 17 right to erasure          B6 + H5 (with WORM excl) erasure_record
GDPR Art 25 data protection by design B6 + I7                  privacy_record
GDPR Art 30 records of processing     I8 tenant ops            ropa_record
GDPR Art 32 security of processing    I7 + B6 cross-cutting    security_record
GDPR Art 33-34 breach notification    I3 + per H1 §3 windows   incident_record
WCAG 2.2 AA                           F10 accessibility        a11y_audit
ISA-95 functional hierarchy           B1 layer map             n/a (architecture)
ISA-95 production performance         C6 + B9 KPI              kpi_record
ISA-88 batch control                  C7 + D10                 batch_release
GAMP 5 V-model                        H2 validation lifecycle  validation
GAMP 5 risk-based testing             H2 + H9                  validation
FDA CSA critical thinking             H2 + per change          change_record
DSCSA serial + lot                    C8 traceability          serial_record
EU FMD                                C8 + D11                 serial_record
ITAR / EAR export control             J3 §5 + B6 C5 region     access_audit
CMMC 2.0                              I7 + J3 §5               cmmc_evidence
HIPAA / HITRUST                       I7 + B6 C5 isolation     phi_audit
SOC 2 trust services                  H3 + I7                  audit_record
```

---

## 5. Per-tenant regulatory configuration

A tenant's regulatory profile is captured at onboarding and is itself
an authoritative record (per B7 state machine, gated by Tier-3
regulated change). Once locked, changes flow through H7 change
control with re-validation per H2.

Configuration variables:
- Vertical pack(s) enabled
- Sub-vertical risk class (e.g. MD class IIb, Pharma sterile)
- Jurisdictions in scope (drives reporting windows + retention floors)
- Customer-specific requirements appended (per L4 layer)
- Region pinning (drives data residency per B6 C5)
- Validation depth tier (per H2 risk-based decision)

The configuration is referenced by every regulated workflow (per
PART_D) so the same workflow takes a different path for a US Pharma
tenant vs an EU Med Device tenant.

---

## 6. Regulatory horizon scanning

Quarterly review obligations per the Compliance Lead:

```
FDA Federal Register notices
EMA scientific guidelines + Q&As
ICH new step-2 / step-4 documents
ISO standards under development (TC 176, TC 210, TC 198, JTC 1/SC 42)
IATF Sanctioned Interpretations
SAE aerospace ballots (G-19/G-21 committees)
EU AI Office implementing acts + delegated acts
Evolving state privacy laws (US: CO/VA/UT/CT etc.)
Emerging crypto requirements (NIST PQC migration)
Codex Alimentarius working groups
```

Output of horizon scan: addendum to this chapter + impact analysis
flowing into H7 change control (if action needed) or H6 periodic
review (if monitor only).

---

## 7. Customer-specific requirement (CSR) overlay

When a customer mandates extra controls (Boeing D6-82479, GM CG1801,
Pfizer SQ-1234), HESEM treats these as L4 overlays:

- Captured as parameterized rule pack per tenant
- Versioned; effectivity gated by D7 doc release
- Retention horizon = customer contract term + 10 yrs default
- Audit pack export (H3) includes CSR conformance attestation

CSR overlays may NOT relax baseline regulatory controls. If a CSR
contradicts FDA / EU / ISO baseline, the stricter rule wins; the
contradiction is flagged as a finding (H3) for resolution.

---

## 8. Regulatory accountability map (RACI)

```
Role                          Accountability scope
Compliance Lead               keeps this chapter current; owns horizon scan
Vertical Pack Lead (per pack) keeps J<pack> current; CSR overlay decisions
Quality Lead                  owns H2..H9; drives audit cycles (H3)
Security Lead                 owns I7, ISO 27001 / SOC 2 certifications
Privacy Lead (or Legal)       owns GDPR / CCPA / PIPL evidence
AI Lead                       owns L0..L5, EU AI Act + NIST AI RMF evidence
SRE Lead                      owns I3/I4, DR + incident reporting
Tenant Ops Lead               owns I8, per-tenant regulatory profile lifecycle
QP / Designated Lead          owns batch release per Annex 16 (Pharma tenants)
PRRC                          Person Responsible for Regulatory Compliance
                              under EU MDR Art 15 (MD tenants)
DPO                           Data Protection Officer where required by GDPR
```

The RACI is mirrored in OKR system; a failed audit on a clause is a
failure indexed to one of the above roles.

---

## 9. Cross-references

- H2 (validation lifecycle) — implements 11.10(a), Annex 11 §4, GAMP 5 V-model
- H3 (audit program) — implements 11.10(e) audit trail review + ISO 19011
- H4 (evidence taxonomy) — defines all classes shown in §4 above
- H5 (retention) — implements all retention floors cited in §3 windows
- H7 (change control) — every regulatory addendum flows here
- H8 (CAPA) — implements ISO 13485 8.5 + IATF 10.2.3
- H9 (risk management) — implements ISO 14971 + ICH Q9
- L1 (AI authority boundary) — implements EU AI Act Art 14
- J1..J5 — vertical-pack instantiation of L2/L3 layers
- M8 (standards directory) — alphabetical reverse-lookup
- M9 (cross-reference index)

---

## 10. Decision phrase

```
H1_REGULATORY_LANDSCAPE_BASELINE_LOCKED
NEXT: H2_VALIDATION_LIFECYCLE.md
```
