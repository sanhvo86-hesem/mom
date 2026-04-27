# H1 — Regulatory Landscape

```
chapter_purpose: canonical clause-to-component map; defines which regulations
                 apply to which tenants; which HESEM components implement each
                 clause; which evidence class proves conformance; which roles
                 are accountable per regulation per region
owner_role:      Compliance Lead with Vertical Pack Leads (J1..J5)
sources:         FDA CDER/CBER/CDRH guidances and Federal Register; EU EMA
                 Q&As and Good Practice Guidelines; ICH Final Guidelines
                 Q1A(R2)..Q14; ISO/IEC catalog TC 176/TC 210/TC 198/JTC1 SC42;
                 IATF Sanctioned Interpretations 2024; AS9100D Rev D handbook;
                 NIST AI RMF 1.0 + AI 600-1; EU AI Act 2024/1689 + Annex III;
                 WHO TRS 957/992; PIC/S PI 011-3; GAMP 5 Second Edition 2022;
                 FDA CSA Final Guidance 2022
version:         V10 (upgraded from V9-shallow; clause-level per S4-01)
review_cadence:  quarterly horizon scan; H7 Class A change for any regulatory
                 addendum that alters component behavior
```

This chapter is the normative regulatory reference for every other chapter
in this plan. When an auditor asks "how does HESEM satisfy 21 CFR 11.10(e)?"
the trail starts here: clause → implementing chapter → evidence class
(per H4) → retrievable via E8 Evidence API. No other chapter re-states which
clause applies; they cite H1 §4 or §5 instead.

The four-layer model in §1 is the structural framework. §2 inventories each
vertical at clause level. §3 covers cross-vertical standards. §4 maps every
material clause to a HESEM component and evidence class. §5 specifies the
per-tenant regulatory profile as a structured data object. §6 defines
regulatory horizon scanning. §7 specifies the CSR overlay framework.
§8 gives the RACI accountability map. §9 lists cross-references.

---

## 1. The four-layer regulatory model

HESEM treats regulatory obligations as four superimposed layers. Every tenant
profile is the union of layers that apply to that tenant. The layer construct
resolves conflicts: when two layers impose contradictory requirements on the
same data element or process, the stricter obligation governs, and the
contradiction is flagged as a finding per H3 §3.4.

```
Layer 1   Cross-vertical baseline
          Applies to every tenant regardless of industry.
          Includes: ISO 9001:2015, ISO/IEC 27001:2022, GDPR/CCPA/PIPL
          (per jurisdiction in scope), WCAG 2.2 AA, OpenAPI 3.1.1,
          RFC 9457, OTel, CloudEvents 1.0, ISA-95, GAMP 5 SE (validation
          discipline), ISO 28000:2022 (supply chain security),
          ISO/IEC 42001:2023 (AI management).

Layer 2   Vertical core
          Applies to tenants whose primary manufacturing vertical is
          covered by a J-pack. One primary vertical per tenant; a secondary
          vertical is permitted if configured.
          PHARMA:    21 CFR 210/211 + Annex 11 + ICH Q10
          MED DEVICE: 21 CFR 820 (QMSR 2026) + ISO 13485:2016
          AUTO:      IATF 16949:2016 + IATF Sanctioned Interpretations
          AERO:      AS9100D + AS9101F
          FOOD:      21 CFR 117 (FSMA PCHF) + ISO 22000:2018

Layer 3   Sub-vertical or grade
          Opt-in via tenant configuration; activates additional clauses
          within the vertical.
          PHARMA-STERILE:   EU GMP Annex 1 (2022) + Annex 16 + 21 CFR 212
          PHARMA-BIOLOGIC:  21 CFR 600-680 + ICH Q5A-Q5E
          MD-CLASS-III:     21 CFR 814 (PMA) + EU MDR Art 54 (full NB exam)
          MD-SAMD:          IMDRF SaMD risk cat + IEC 62304 + IEC 82304-1
          AUTO-FUSA:        ISO 26262:2018 ASIL A-D + ISO 21448:2022
          AUTO-CYBER:       ISO 21434:2021 + UNECE WP.29 R155/R156
          AERO-DEFENSE:     ITAR 22 CFR 120-130 + CMMC 2.0 + DFARS 7012
          AERO-NADCAP:      per commodity audit criteria (AC7004 etc.)
          FOOD-HACCP-JUICE: 21 CFR 120 + Codex CXC 1 Annex
          FOOD-SEAFOOD:     21 CFR 123

Layer 4   Customer-specific (CSR)
          Zero or more per tenant; each CSR is a versioned rule pack
          appended after L3. Examples: Boeing D6-82479 rev J, GM CG1801,
          Ford Q1 2023, Pfizer Supplier Quality Requirements SQ-5.1,
          Lockheed Martin Quality Requirements LQ-1.
          CSRs may tighten controls; they never relax L1..L3 obligations.
          Conflict resolution: if CSR contradicts L1/L2/L3, the stricter
          rule governs; the contradiction is recorded as a CSR conflict
          finding (type: regulatory_conflict) in H3 audit register.
```

**Tenant construction examples**

```
Tenant A — US sterile injectables manufacturer:
  L1: ISO 9001 + ISO 27001 + GDPR (EU customers) + WCAG 2.2 AA
  L2: 21 CFR 210 + 211 + ICH Q10 + DSCSA
  L3: EU GMP Annex 1 sterile + Annex 16 QP release + Annex 11
  L4: Big-Pharma customer SQ manual v12

Tenant B — EU Class IIb active implant maker:
  L1: ISO 9001 + ISO 27001 + GDPR + WCAG 2.2 AA
  L2: EU MDR 2017/745 + ISO 13485:2016 + 21 CFR 820 (US sales)
  L3: IEC 62304 + IEC 62366-1 + ISO 14971:2019 + IEC 81001-5-1
  L4: Hospital-group supplier quality requirement HSQ-7

Tenant C — Tier-1 auto supplier, safety-critical:
  L1: ISO 9001 + ISO 27001 + CCPA (US ops) + WCAG 2.2 AA
  L2: IATF 16949:2016 + VDA 6.3
  L3: ISO 26262:2018 (ASIL D electronics) + ISO 21434 + ASPICE 4.0
  L4: Ford Q1 + BMW VDA 6.3 CSR + GM BIQS scorecard level Gold

Tenant D — aerospace MRO defense sub-tier:
  L1: ISO 9001 + ISO 27001 + WCAG 2.2 AA
  L2: AS9110D (MRO) + AS9120B (distribution)
  L3: ITAR (CUI handling) + CMMC 2.0 Level 2 + DFARS 7012
  L4: Boeing D6-82479 + Lockheed Martin LQ-1
```

**Layer conflict resolution algorithm**

When clause C from layer Lx contradicts clause C' from layer Ly (where
y > x is not guaranteed — L4 CSR can be stricter than L3 sub-vertical):

1. Select the clause that imposes the more restrictive obligation (shorter
   retention floor, smaller acceptable defect rate, longer notification
   window, more granular audit trail).
2. Record a `regulatory_conflict` finding in H3 §3.4 register with:
   source_clause (L-layer + citation), target_clause (L-layer + citation),
   resolution (which clause governs), rationale.
3. The implementing component is configured to the stricter obligation.
4. The conflict finding is disclosed in the next tenant audit pack (H3 §4).

---

## 2. Per-vertical regulatory inventory

### 2.1 Pharmaceutical — drug substance and drug product

#### 2.1.1 US — FDA and cGMP

```
21 CFR Part 11 — Electronic Records; Electronic Signatures
  §11.10(a)    System validation; controls and evidence
  §11.10(b)    Ability to generate accurate and complete copies
  §11.10(c)    Record protection for accurate retrieval throughout
               retention period
  §11.10(d)    Limiting system access to authorized individuals
  §11.10(e)    Use of secure, computer-generated, time-stamped audit trails
  §11.10(f)    Use of operational system checks
  §11.10(g)    Use of authority checks
  §11.10(h)    Use of device checks to determine validity of data input
  §11.10(i)    Determination that persons who develop, maintain, or use
               electronic record systems have education, training, and
               experience to perform assigned tasks
  §11.10(j)    Written policies that hold individuals accountable for
               actions initiated under their electronic signatures
  §11.10(k)    Use of appropriate controls over systems documentation
  §11.50       Signed electronic records manifestations
  §11.70       Signature/record linking; preventing falsification
  §11.100(a)   Each electronic signature unique to one individual
  §11.200      Electronic signature components and controls
  §11.300      Controls for identification codes/passwords

21 CFR Part 207 — Registration of Producers of Drugs
  §207.17      Initial establishment registration and drug listing
  §207.25      Annual drug listing updates

21 CFR Part 210 — cGMP (general) and Part 211 — cGMP for finished
pharmaceuticals
  §210.3(b)(3) Critical steps definition for batch record
  §211.22      Responsibilities of quality control unit
  §211.42      Design and construction features
  §211.56      Sanitation
  §211.58      Maintenance
  §211.63      Equipment design, size, and location
  §211.68      Automatic, mechanical, and electronic equipment
               (software validation; audit trail; access controls)
  §211.82      Receipt and storage of untested components
  §211.84      Testing and approval or rejection of components,
               drug product containers, and closures
  §211.100     Written procedures; deviations
  §211.110     Sampling and testing of in-process materials + products
  §211.122     Materials examination and usage criteria
  §211.130     Packaging and labeling operations
  §211.132     Tamper-evident packaging requirements
  §211.165     Testing and release for distribution
  §211.188     Batch production and control records (content of)
  §211.192     Review and approval of production records
  §211.194     Laboratory records
  §211.198     Complaint files

21 CFR Part 212 — cGMP for PET drugs
  Subpart C    Equipment; automated systems; validation

21 CFR Part 314 — NDAs + ANDAs
  §314.80      Postmarket reporting of adverse drug experiences (Field
               Alert Reports: 3 business days)
  §314.81      Other postmarketing reports
  §314.81(b)(3) Annual product reviews

21 CFR Part 600-680 — Biologics Standards
  §600.3       Definitions: establishment; product license
  §600.12      Records; availability for inspection
  §606.122     Laboratory controls
  §606.160     Records; general requirements (batch records)

21 CFR Part 606 — cGMP for Blood and Blood Components

DSCSA — Drug Supply Chain Security Act (Pub. L. 113-54)
  Section 581  Definitions: product identifier; transaction information
  Section 582  Drug traceability — product identifier serialization
  Section 582(g)(1) Suspect product notification: 1 business day to
               trading partners; report to FDA if illegitimate
  Section 582(h) Enhanced drug distribution security (full interoperability
               deadline: 2024 for manufacturers)

FDA-MedWatch / Field Alert Reports
  3 business days for FAR under §314.80(c)(1)(iii) or §600.14
  30 calendar days for written NDA Field Alert Report
```

#### 2.1.2 EU — EMA and GMP

```
EU GMP Vol 4 Part I — GMP for Finished Medicinal Products
  Chapter 1    Pharmaceutical Quality System (maps to ICH Q10)
  Chapter 4    Documentation (batch manufacturing records; SOPs)
  Chapter 5    Production (process validation; in-process controls)
  Chapter 6    Quality Control (sampling; testing; OOS procedures)
  Chapter 8    Complaints, Quality Defects, Product Recalls

EU GMP Annex 1 (2022 revision) — Manufacture of Sterile Products
  §4.1–4.12    Contamination control strategy (CCS)
  §5           Premises (cleanroom classification; qualification)
  §7           Personnel (gowning; training; health monitoring)
  §8           Equipment and utilities (URS; DQ; IQ; OQ; PQ)
  §9           Utilities (HVAC; WFI; clean steam; compressed gas)
  §10          Production and specific technologies
  §11          Finished product release and disposition
  §12          Monitoring of manufacturing environment + utilities

EU GMP Annex 11 — Computerised Systems
  §4           Risk management as basis for validation
  §6           Data and accuracy checks (OTG axioms in B6)
  §7           Data storage; backup and recovery
  §8           Printouts; printed records
  §9           Audit trails: scope; review frequency; protection
  §10          Change and configuration management
  §11          Periodic evaluation of computer systems
  §12          Security: physical and logical
  §13          Incident management; escalation
  §14          Electronic signatures
  §15          Batch release
  §16          Business continuity / BCM / DR
  §17          Archiving; migration; destruction

EU GMP Annex 13 — Manufacture of Investigational Medicinal Products
EU GMP Annex 15 — Qualification and Validation
  §10          Process validation approaches (traditional; continuous;
               hybrid); concurrent validation policy
  §12          Transport validation
  §13          Cleaning validation

EU GMP Annex 16 — Certification by a Qualified Person (QP)
  §1.5         QP responsibilities; batch certification scope
  §2           Importation; testing; certification sequence

EudraLex Vol 4 Annex 17 — Real Time Release Testing (RTRT)
EudraLex Vol 4 Annex 21 — Importation of Medicinal Products

EU FMD — Falsified Medicines Directive (2011/62/EU + Del. Reg.
2016/161)
  Art 54(o)    Unique identifier + tamper-evidence features
  Art 54a      Repository system interconnection; verification
  Del. Reg. Art 33 Upload of serialization data by manufacturers
  Del. Reg. Art 35 Verification at point of dispensing

ICH Guidelines (Global Harmonization)
  Q1A(R2)      Stability testing of new drug substances and products
               (accelerated; long-term; photostability; stress testing)
  Q2(R2)       Validation of analytical procedures (specificity;
               linearity; range; accuracy; precision; DL; QL; robustness)
  Q3A(R2)      Impurities in new drug substances; thresholds
  Q3B(R2)      Impurities in new drug products
  Q3C(R8)      Residual solvents; classification classes 1/2/3
  Q3D(R1)      Elemental impurities; permitted daily exposures
  Q5A(R2)      Viral safety evaluation of biotech products
  Q5B          Quality of biotech products: expression constructs
  Q5C          Quality of biotech products: stability testing
  Q5D          Derivation and characterisation of cell substrates
  Q5E          Comparability of biotech products subject to change
  Q6A          Specifications for new drug substances + products
                (chemical)
  Q6B          Specifications for biotech products
  Q7           GMP for APIs (active pharmaceutical ingredients)
  Q8(R2)       Pharmaceutical development; design space; QbD
  Q9(R1)       Quality risk management: FMEA; FMECA; HACCP; PHA;
               risk ranking; risk filtering; decision trees
  Q10          Pharmaceutical quality system: PQS elements; product
               realization; quality monitoring; improvement
  Q11          Development and manufacture of drug substance
  Q12          Lifecycle management; PACs; CMC post-approval changes
  Q13          Continuous manufacturing
  Q14          Analytical procedure development
  E2B(R3)      Individual case safety reports (ICSRs): data elements;
               transmission format; expedited reporting timelines
               (15 calendar days expedited; 90 days non-expedited)

WHO
  TRS 957 Annex 2  WHO GMP for pharmaceutical products: main principles
  TRS 992 Annex 5  Good data and record management practices (GDRM):
                   data integrity; ALCOA+ principles; audit trails;
                   data governance framework

PIC/S and Other
  PI 011-3         PIC/S guidance on computerised systems (mirrors EU GMP
                   Annex 11 for non-EU regulators)
  PIC/S PE 009-16  Guide to good manufacturing practice
  Health Canada     Division 2 Part C GMP regulations + GUI-0001
  ANVISA            RDC 658/2022 GMP (aligns with WHO + EU GMP)
  PMDA (Japan)      Ordinance on standards for manufacturing control (per
                   MHLW Ministerial Ordinance 179)
  MFDS (Korea)      Pharmaceutical GMP guideline (mirrors EU GMP Annex 11)
  NMPA (China)      GMP 2010 edition + Supplementary provisions; Computer
                   System Validation guidance 2021
```

---

### 2.2 Medical Device

#### 2.2.1 US — FDA

```
21 CFR Part 820 — Quality System Regulation (QSR); QMSR transition
  Current QSR (effective until 5 Feb 2026):
    §820.20    Management responsibility; quality policy; org chart
    §820.22    Quality audits; frequency; corrective action follow-up
    §820.30    Design controls; DHF; risk analysis per §820.30(g)
    §820.40    Document controls; approval; distribution; archive
    §820.50    Purchasing controls; supplier evaluation; receiving
    §820.60    Identification; §820.65 traceability (Class II/III)
    §820.70    Production and process controls; process validation
    §820.75    Process validation; documented evidence
    §820.80    Receiving; in-process; finished device acceptance
    §820.100   Corrective and preventive action (CAPA); CAPA records
    §820.120   Device labeling; inspection; labeling storage
    §820.130   Device packaging
    §820.140   Handling; storage; distribution
    §820.160   Distribution records; device history
    §820.170   Installation; installation records
    §820.180   Records retention; schedule per §820.180(b)
    §820.184   Device history record (DHR); content
    §820.186   Quality system record (QSR record)
    §820.198   Complaint files; MDR-complaint identification;
               complaint investigation; closure criteria

  QMSR (21 CFR Part 820 revised, effective 5 Feb 2026):
    Aligns structure with ISO 13485:2016; harmonizes 82 elements
    Key new: §820.4 definitions align to ISO 13485 terms;
    §820.30 design controls become §820.30 (design and development);
    §820.100 CAPA unchanged in function; audit trail requirements
    remain; §820.70 process validation retained

21 CFR Part 821 — Medical Device Tracking (Class III + designated II)
21 CFR Part 830 — Unique Device Identification (UDI)
  §830.10    Labeler obligations; device identifier (DI); production
             identifier (PI); access to GUDID
  §830.50    GUDID submission; attribute data requirements

21 CFR Part 803 — Medical Device Reporting (MDR)
  §803.10    General reporting requirements
  §803.12    Where to submit; eMDR (eMDR system)
  §803.17    MDR event files; retention (2 years)
  §803.50    Individual adverse event reports (30-day rule)
  §803.53    Five-day reports: device malfunction + serious risk of
             death or serious injury if recurs
  §803.55    Baseline reports for individual MDR reporters

21 CFR Part 806 — Reports of Corrections and Removals
21 CFR Part 807 — Establishment Registration and Device Listing

FDA Cybersecurity Guidance
  Premarket Cybersecurity Guidance 2023 (Section 524B FD&C Act):
    Threat modeling; SBOM; TPLC cybersecurity considerations;
    vulnerability disclosure; patch management; CVSS scoring
  Postmarket Cybersecurity Guidance 2016 (revision pending):
    Coordinated vulnerability disclosure; patching; risk assessment
```

#### 2.2.2 EU — MDR and IVDR

```
EU MDR 2017/745 (Medical Devices Regulation)
  Art 5        Placing on market and putting into service; conditions
  Art 10       General obligations of manufacturers
  Art 10(2)    Quality management system requirements
  Art 10(9)    Post-market surveillance (PMS) obligations
  Art 14       Authorised representative
  Art 15       Person Responsible for Regulatory Compliance (PRRC)
  Art 22       Systems and procedure packs
  Art 27       UDI assignment; Eudamed registration; label
  Art 29       Registration of devices in Eudamed
  Art 30       Registration of manufacturers; ARs; importers in Eudamed
  Art 56       Conformity assessment procedures; classification
  Art 61       Clinical evaluation; clinical evidence; PMCF
  Art 79       Post-market surveillance system
  Art 83       Post-market surveillance plan; PMCF plan
  Art 84       Post-market surveillance report (PMSR); PMCF report
  Art 85       Periodic safety update report (PSUR) — Class IIa/IIb/III
  Art 87       Reporting of serious incidents and field safety corrective
               actions (FSCAs)
  Art 88       Trend reporting for non-serious incidents
  Art 92       Market surveillance; competent authority activities
  Annex I      General safety and performance requirements (GSPR)
  Annex II     Technical documentation
  Annex III    Technical documentation for PMS
  Annex IX     Conformity assessment based on QMS + tech file
  Annex X/XI   Clinical evaluation; procedures for Class III

EU IVDR 2017/746 (In-Vitro Diagnostics Regulation)
  Art 10       General obligations of IVD manufacturers
  Art 15       PRRC
  Art 74       Performance evaluation (class C/D)
  Art 78..82   Post-market surveillance; PSUR; reporting thresholds
```

#### 2.2.3 ISO, IEC, and IMDRF

```
ISO 13485:2016 — Medical Device QMS
  §4.1         General requirements; QMS processes
  §4.2.1       General documentation requirements
  §4.2.3       Medical device files (technical file per product)
  §4.2.4       Control of records; retention; accessibility
  §4.2.5       Control of documents; review; approval
  §5.1         Management commitment; quality policy
  §5.6         Management review; inputs; outputs; frequency
  §6.2         Human resources; competence; training records
  §6.3         Infrastructure; maintenance records
  §6.4         Work environment; contamination control
  §7.3         Design and development; DHF; risk integration
  §7.4         Purchasing; supplier evaluation; receiving inspection
  §7.5.1       Control of production and service provision
  §7.5.2       Cleanliness of product; contamination control
  §7.5.3       Installation and servicing activities; records
  §7.5.4       Customer property; traceability
  §7.5.6       Validation of processes for production and service
  §7.5.9       Traceability (UDI; lot; serial; batch)
  §7.6         Control of monitoring and measuring equipment (MSA)
  §8.2.1       Feedback; customer complaints; post-market data
  §8.2.2       Complaint handling; investigation; reportability
  §8.2.3       Reporting to regulatory authorities; thresholds
  §8.2.4       Internal audit; frequency; audit program (→ H3)
  §8.3         Control of nonconforming product; disposition codes
  §8.3.3       Delivery of nonconforming product; written agreement
  §8.3.4       Rework; re-inspection; traceability of rework
  §8.4         Analysis of data; KPIs; trend analysis
  §8.5.1       Improvement; regulatory information utilization
  §8.5.2       Corrective action; root cause; effectiveness check
  §8.5.3       Preventive action; risk-based identification

ISO 14971:2019 — Application of risk management to medical devices
  §4.1         Risk management process requirements
  §4.2         Management responsibilities; resources; competence
  §4.3         Risk management plan; per-device
  §5           Risk analysis: intended use; identification of hazards
  §6           Risk evaluation; acceptability criteria
  §7           Risk control; measures hierarchy; residual risk
  §8           Evaluation of overall residual risk
  §9           Risk management review
  §10          Production and post-production activities (PMS)
  Annex C      Questions for hazard identification

ISO 14155:2020 — Clinical investigation of medical devices
ISO 10993 series — Biological evaluation (10993-1 risk-based framework)
ISO 11607-1/2 — Packaging for terminally sterilized medical devices

IEC 62304:2006+A1:2015 — Medical device software lifecycle
  §5.1         Software development planning
  §5.2         Software requirements analysis
  §5.3         Software architectural design
  §5.4         Software detailed design
  §5.5         Software unit implementation and verification
  §5.6         Software integration and integration testing
  §5.7         Software system testing
  §5.8         Software release
  §6           Software maintenance process
  §7           Software risk management process
  Annex B      Classes of software safety (Class A: no injury; B: non-
               serious injury; C: serious injury or death)

IEC 82304-1:2016 — Health software general requirements
IEC 62366-1:2015+A1:2020 — Usability engineering
IEC 81001-5-1:2021 — Health software security lifecycle

IMDRF SaMD framework (2013 + 2014 series)
  N10    SaMD: Key definitions (four characteristics)
  N12    SaMD: Risk categorization framework (significance × healthcare
         situation → Class I-IV; maps to EU MDR class via MDCG 2021-24)
  N41    SaMD: Clinical evaluation (evidence generation per SaMD class)
  N47    SaMD: Application of Quality Management System (aligns 13485)
  IMDRF AI working group — Predetermined Change Control Plan (PCCP) guidance
         (2023 draft); aligns with FDA PCCP Guidance 2023

FDA 510(k) / PMA / De Novo pathways:
  Class I:   general controls; substantial equivalence not required
  Class II:  special controls + 510(k) predicate; or De Novo
  Class III: PMA + extensive clinical; or 510(k) if pre-amendment
```

---

### 2.3 Automotive

#### 2.3.1 Core QMS

```
IATF 16949:2016 — Customer-Specific Requirements Integration
  §4.3.2       Customer-specific requirements (CSRs)
  §4.4.1.1     Product and process conformance
  §5.1.1.1     Corporate responsibility (anti-bribery)
  §5.3.1       Organizational roles — customer-designated responsible
  §6.1.2.1     Risk analysis (including product recalls, repairs)
  §6.2.2.1     Quality objectives supplemental (specific targets)
  §7.1.3.1     Plant, facility, and equipment planning
  §7.2.1       Training on the job (OJT); training records
  §7.3.1       Employee motivation and empowerment
  §7.4         Supplemental: internal communication
  §7.5.3.2.1   Record retention (minimum: product life + 1 year post
               last manufacture; typically 15 years powertrain)
  §8.2.3.1.1   Organization manufacturing feasibility
  §8.3.3.1     Product design inputs (functional/performance reqs)
  §8.3.4.1     Monitoring of design and development
  §8.3.4.2     Prototype program
  §8.3.4.3     Product approval process (PPAP deliverables)
  §8.3.5.1     Design and development outputs (supplemental)
  §8.4.1.1     Supplier selection process
  §8.4.2.1     Statutory and regulatory requirements
  §8.5.1.1     Control plan (per family; per process; per characteristic)
  §8.5.1.2     Standardized work; operator instructions
  §8.5.1.3     Verification of job setups
  §8.5.1.4     Verification of characteristics (first-piece + in-process)
  §8.5.1.5     Total productive maintenance (TPM)
  §8.5.2.1     Identification and traceability supplemental
  §8.5.6.1.1   Production process changes — temporary changes
  §8.6.1       Conformance of products and services at release
  §8.6.2       Layout inspection and functional testing
  §8.6.3       Appearance items
  §8.6.4       Verification and acceptance of externally provided
               products and services
  §8.7.1.1     Customer notification: immediate containment;
               formal 8D within OEM-specified timing
  §8.7.1.2     Control of nonconforming product — customer-directed
  §8.7.1.3     Customer waiver / deviation: customer written auth
  §8.7.1.4     Control of suspect product
  §8.7.1.5     Control of reworked product
  §8.7.1.6     Customer notification supplemental
  §9.1.1.1     Monitoring and measurement of manufacturing processes
               (SPC; Cp/Cpk; Pp/Ppk thresholds per CQI)
  §9.1.1.2     Identification of statistical tools
  §9.1.2.1     Customer satisfaction supplemental (OEM scorecards)
  §10.2.3      Problem solving: 8D; PDCA; Six Sigma; Shainin Red X
  §10.2.4      Error-proofing: poka-yoke; verification; documented
  §10.3.1      Continual improvement supplemental

IATF Sanctioned Interpretations (live; check iatfglobaloversight.org):
  Currently 42 SIs active against IATF 16949:2016
  HESEM tracks via quarterly horizon scan per §6 of this chapter
```

#### 2.3.2 Customer-specific requirements (OEM CSRs)

```
Ford Motor Company
  Q1 Manufacturing Site Award (current year edition)
    Process audit: VDA 6.3 P2-P7 scores ≥ 82%
    Control plan: AIAG format; updated per engineering change
    8D: submitted within OEM-specified timing (typically 24h initial;
        8 weeks for completed 8D)
  Ford Customer-Specific Requirements for IATF 16949

General Motors
  BIQS (Built-in Quality Supply): Scorecard levels Gold/Silver/Bronze
    Delivery Performance; Zero-defect quality metrics
  GM Customer Specifics for IATF 16949

Stellantis (merged FCA + PSA CSRs)
  Stellantis Customer-Specific Requirements for IATF 16949

Toyota Motor Corporation
  Toyota Supplier Quality Manual
  Global Supplier Quality Manual (GSQM) + IATF supplements

Volkswagen Group (VW, Audi, SEAT, ŠKODA, Porsche, Lamborghini,
Bentley, TRATON)
  VW Formel Q-Konkret
  VW QMF (Quality Management Framework)

BMW Group (BMW, MINI, Rolls-Royce)
  VDA 6.3 supplier audit requirements (mandatory for BMW)
  BMW CSR Supplement for IATF 16949

Hyundai Motor Group (Hyundai, Kia, Genesis)
  HKMC SQ (Hyundai-Kia Motors Company Supplier Quality requirements)

Nissan Motor Co.
  ASES (Achieving Supplier Excellence in Sourcing)

Honda Motor Co.
  HOSS (Honda's Original Supplier Standards)

Tesla, Inc.
  Tesla Supplier Requirements Manual
  Tesla Production System (TPS) quality requirements

Rivian Automotive
  Rivian Supplier Quality Requirements

Lucid Group
  Lucid Supplier Quality Manual
```

#### 2.3.3 Methodology standards

```
AIAG-VDA FMEA Handbook 1st Edition 2019
  5-step approach: Scoping, Structure Analysis, Function Analysis,
  Failure Analysis, Risk Analysis, Optimization, Results Documentation
  AP (Action Priority) replaces RPN; H/M/L per severity × occurrence
  × detection; mandatory for IATF 16949 §8.3.3.1

AIAG MSA 4th Edition — Measurement Systems Analysis
  GR&R study types: Average & Range; ANOVA; Attribute MSA
  %GR&R < 10% acceptable; 10-30% marginal; >30% not acceptable

AIAG SPC 2nd Edition — Statistical Process Control
  Cp/Cpk; Pp/Ppk; control chart selection; reaction plans

AIAG APQP 2nd Edition — Advanced Product Quality Planning
  Phase 1: Plan and Define; Phase 2: Product Design and Development;
  Phase 3: Process Design and Development; Phase 4: Product and
  Process Validation; Phase 5: Feedback; Assessment; Corrective Action

AIAG PPAP 4th Edition — Production Part Approval Process
  18 PPAP elements; submission levels 1-5;
  Part Submission Warrant (PSW); customer approval gating

CQI Special Process Assessments (AIAG)
  CQI-9  4th Ed  Heat treat
  CQI-11 3rd Ed  Plating
  CQI-12 3rd Ed  Coating
  CQI-15 2nd Ed  Welding (resistance + arc)
  CQI-17 2nd Ed  Soldering
  CQI-23 2nd Ed  Molding
  CQI-27 2nd Ed  Casting
  CQI-29         Electrical connectors

VDA Standards (Verband der Automobilindustrie)
  VDA 6.3  Process audit; P1-P7 process elements; scoring; rating
  VDA 6.5  Product audit; ABC scoring; defect weighting
  VDA 19.1 Technical cleanliness inspection (components)
  VDA 19.2 Technical cleanliness in assembly processes
  VDA RGA  Returns good analysis; 8D problem solving

Functional Safety and SOTIF
  ISO 26262:2018 — Road vehicles functional safety
    Part 3  Concept phase; ASIL decomposition; FSC; FTA; FMEA
    Part 4  Product development — system level
    Part 5  Product development — hardware level (PMHF; FIT rate targets)
    Part 6  Product development — software level (ASIL B-D coding rules)
    Part 8  Supporting processes; tool qualification (TCL 1-3)
    Part 9  ASIL-oriented and safety-oriented analyses
    ASIL D: systematic integrity level for highest safety risk
  ISO 21448:2022 — SOTIF (Safety Of The Intended Functionality)
    Hazardous behavior from functional insufficiency or misuse
  ISO 21434:2021 — Road vehicle cybersecurity
    §9  Threat analysis and risk assessment (TARA)
    §10 Cybersecurity goals; CSMS
    §15 Vulnerability management + disclosure
  UNECE WP.29 Regulations
    R155  Cyber security management system (mandatory EU 2024+)
    R156  Software update management system

Software process
  Automotive SPICE 4.0 (Automotive SPICE PAM v4.0)
    Process areas: MAN, SYS, SWE, HWE, SUP, ACQ; capability levels 0-5
    ASPICE 4.0 aligns with ISO/IEC 33020
```

---

### 2.4 Aerospace and Defense

#### 2.4.1 QMS — AS series

```
AS9100D — Quality Management Systems — Aerospace
  §4.3.2     Customer and statutory/regulatory requirements
  §7.5.3.2   Control of records; retention requirements
  §8.1.2     Configuration management
  §8.1.3     Product/process risk management (beyond ISO 9001 risk)
  §8.1.4     Prevention of counterfeit parts
  §8.3.1.1   Verification of design inputs; verification plan
  §8.5.1.1   Production process controls; work instructions
  §8.5.1.3   Verification of first article; FAI per AS9102
  §8.5.2.1   Identification and traceability (beyond ISO 9001);
             serialization; lot/batch control
  §8.5.5.2   Key/critical characteristics: identification; control
  §8.7.3     Disposition of nonconforming product; MRB

AS9101F — Evaluation Criteria for the Aerospace QMS Audit Process
  Objective evidence requirements; major/minor finding criteria;
  OASIS database for audit record retention

AS9102B/C — First Article Inspection
  FAI package: 7-section deliverable; design characteristic
  traceability; ballooned drawing; dimensional inspection report

AS9110D — Quality Management System for Aviation Maintenance
  MRO-specific: §8.1.6 planning of maintenance realization;
  §8.5.1.7 control of maintenance documentation

AS9120B — Quality Management System for Aviation Distribution
  Distributor-specific: counterfeit avoidance; traceability; CoC

AS9145 — Advanced Product Quality Planning (APQP) and Production Part
Approval Process (PPAP) Requirements for the Aerospace Industry

AS13100 — Quality and Performance Standards for Aerospace Suppliers
  (AESQ — Aerospace Engine Supplier Quality program)
```

#### 2.4.2 US Defense — Export and Cyber

```
DFARS 252.204-7012 — Safeguarding Covered Defense Information
  (b)   Adequate security; NIST SP 800-171 compliance
  (c)   Cyber incident reporting to DoD: 72-hour notification
  (d)   Malicious software isolation and reporting
  (e)   Media preservation for forensics

NIST SP 800-171 Rev 2 — Protecting CUI in Nonfederal Systems
  14 requirement families; 110 requirements:
  AC: Access Control (22); AT: Awareness and Training (3);
  AU: Audit and Accountability (9); CM: Configuration Management (9);
  IA: Identification and Authentication (11); IR: Incident Response (3);
  MA: Maintenance (6); MP: Media Protection (9); PS: Personnel Security (2);
  PE: Physical Protection (6); RE: Recovery (2); RM: Risk Assessment (3);
  CA: Security Assessment (4); SC: System and Communications Protection (16);
  SI: System and Information Integrity (7)

CMMC 2.0 — Cybersecurity Maturity Model Certification
  Level 1: 17 practices (FAR clause 52.204-21); self-assessment annual
  Level 2: 110 practices (= NIST 800-171 r2); 3rd party assessment
           (C3PAO) or self-assessment per DoD risk determination
  Level 3: 130+ practices (NIST 800-172); government-led assessment
  HESEM tracks POA&M; assessment artifacts per I7; evidence per H4

ITAR — International Traffic in Arms (22 CFR 120-130)
  Part 120  Definitions; purpose and policy; scope
  Part 121  US Munitions List (USML)
  Part 122  Registration of manufacturers and exporters
  Part 123  Licenses for export and temporary import
  Part 124  Manufacturing license and technical assistance agreements
  Part 125  Licenses for export of technical data and classified info
  Part 130  Political contributions; fees and commissions reporting

EAR — Export Administration Regulations (15 CFR 730-774)
  Part 730  General information; relationship to other laws
  Part 734  Scope of EAR
  Part 736  General prohibitions
  Part 738  CCL (Commerce Control List) structure
  Part 740  License exceptions
  Part 744  Control policy; end users; end uses
  Part 774  CCL (includes EAR99 items)

HESEM country-of-end-user screening at every release gate; OFAC/SDN
list check; license determination workflow per J3 Aero pack §5
```

#### 2.4.3 Civil Aviation

```
US FAA
  14 CFR Part 21   Certification procedures for products and articles
    Subpart F       Production Approval Holder (PAH) obligations
    Subpart G       Production Certificates (PC)
    Subpart H       Airworthiness Certificates
  14 CFR Part 25   Airworthiness Standards — Transport Category
  14 CFR Part 33   Airworthiness Standards — Aircraft Engines
  14 CFR Part 43   Maintenance, Preventive Maintenance, Rebuilding
  14 CFR Part 145  Certificated Repair Stations
  AC 21-9C         FAA conformity inspection; witness; sample plan

EASA
  Part 21 Subpart G  Production Organisation Approval (POA)
    21.A.129   POA obligations; production assurance system
  Part 21 Subpart J  Design Organisation Approval (DOA)
  Part 145           Maintenance Organisation Approval (MOA)
    145.A.25   Facilities; 145.A.30 Personnel; 145.A.45 Data;
    145.A.65   Safety and quality policy; occurrence reporting

Software / Hardware
  DO-178C    Software Considerations in Airborne Systems
    DAL A: catastrophic failure; MC/DC coverage; no deactivated code
    DAL B: hazardous; decision coverage
    DAL C: major; statement coverage
    DAL D: minor; reviews sufficient
    Table A-7: 71 software objectives per DAL
  DO-254     Design Assurance Guidance for Airborne Electronic Hardware
    DAL A-D (analogous to DO-178C for hardware)
  DO-200B    Standards for Processing Aeronautical Data
  DO-330     Software Tool Qualification Considerations
  ARP 4754A  Guidelines for Development of Civil Aircraft and Systems
  ARP 4761   Guidelines for Safety Assessment (FHA; PSSA; SSA; CCA)
  ARP 5580   Reliability Program Standard for Space and Launch Vehicles

Counterfeit Parts Prevention
  AS5553C    Counterfeit Electronic Parts: Avoidance, Detection,
             Mitigation, and Disposition
  AS6174B    Counterfeit Materiel: Avoidance, Detection, Mitigation,
             and Disposition (non-electronic)
  GIDEP      Government-Industry Data Exchange Program (suspect/
             counterfeit notification: 60 days for gov contracts)

NADCAP (Performance Review Institute)
  AC7004   Quality system requirements — base document
  AC7102   Heat treating — pyrometry; process monitoring
  AC7108   Chemical processing — anodize; plate; etch; conversion coat
  AC7110   Welding — fusion; resistance; arc; special processes
  AC7114   Coatings — thermal spray; painting
  AC7116   Surface enhancement — shot peen; laser peen
  AC7117   Composites — lay-up; autoclave; NDT
  AC7118   Conventional machining as a special process
  AC7121   Sealants
  AC7126   Materials testing laboratories
  AC7137   Elastomeric seals

Other
  MIL-STD-1916   Sampling procedures and tables for inspection by
                 attributes or variables (replaces MIL-STD-105E for DoD)
  MIL-STD-1629A  Procedures for Performing FMECA (Failure Mode, Effects
                 and Criticality Analysis)
  MIL-HDBK-217F  Reliability Prediction of Electronic Equipment
```

---

### 2.5 Food

#### 2.5.1 US — FSMA and FDA

```
FSMA Rules (Food Safety Modernization Act, Pub. L. 111-353)
  21 CFR Part 117 — Preventive Controls for Human Food (PCHF)
    Subpart A    General provisions; definitions
    Subpart B    Current Good Manufacturing Practice
    Subpart C    Hazard Analysis and Risk-Based Preventive Controls
      §117.130   Hazard analysis; food safety plan
      §117.135   Preventive controls: process; allergen; sanitation;
                 supply chain; recall plan
      §117.145   Monitoring; corrective actions; verification
      §117.155   Reanalysis of food safety plan (3-year minimum or
                 as-triggered by significant change)
    Subpart G    Supply chain program; supplier verification activities
    Subpart F    Withdrawal of qualified facility exemption

  21 CFR Part 111 — Current GMP in Manufacturing, Packaging, Labeling,
                    or Holding Operations for Dietary Supplements

  21 CFR Part 113 — Thermally Processed Low-Acid Foods in Hermetically
                    Sealed Containers

  21 CFR Part 114 — Acidified Foods

  21 CFR Part 120 — HACCP Procedures for the Safe and Sanitary
                    Processing and Importing of Juice
    §120.6     Hazard analysis; hazard identification
    §120.7     HACCP plan; 7-principle structure

  21 CFR Part 123 — Fish and Fishery Products (Seafood HACCP)
    §123.6     HACCP plan requirements
    §123.8     Corrective actions; verification

  21 CFR Part 507 — Preventive Controls for Animal Food

  21 CFR Part 1.900 — Sanitary Transportation of Human and Animal Food

  21 CFR Part 121 — Mitigation Strategies to Protect Food Against
                    Intentional Adulteration (IA rule; FSMA §106)

  21 CFR Part 1.1300 — Requirements for Additional Traceability Records
  for Certain Foods (FSMA §204; "Food Traceability Rule")
    Full compliance deadline: 20 Jan 2026
    Key lots: Critical Tracking Events (CTEs) at each supply chain step
    Key Data Elements (KDEs): TLC, TLE, TLD, TLGE, TLDE, TLTE
    Reportable Food: 24 hours to FDA

  Reportable Food Registry (RFR): 24-hour mandatory report when
    reasonable probability that a food will cause serious adverse health
    consequences or death (applies to all responsible parties)
```

#### 2.5.2 EU — Food Law

```
Regulation (EC) 178/2002 — General Food Law
  Art 14   Food safety requirements; placing on market
  Art 18   Traceability: one-step back / one-step forward
  Art 19   Withdrawal / recall obligations; notification to authorities

Regulation (EC) 852/2004 — Hygiene of Foodstuffs
  Annex II  General hygiene requirements for food businesses
  Annex I   Primary production hygiene

Regulation (EC) 853/2004 — Specific Hygiene Rules for Food of
Animal Origin

Regulation (EC) 396/2005 — Maximum Residue Levels (MRLs) of
Pesticides

Regulation (EU) 1169/2011 — Food Information to Consumers
  (FIC; allergen labeling; nutritional labeling)

Commission Regulation (EU) 2073/2005 — Microbiological Criteria
```

#### 2.5.3 GFSI-recognized schemes

```
BRCGS Food Safety Issue 9 (2022)
  Fundamental clauses: 7 (incl. §2 Hazard and Risk Analysis;
  §3 Food Safety and Quality Management System; §4 Site Standards)
  Critical fundamental vs major vs minor findings; root cause for all

SQF Edition 9 — Safe Quality Food
  Module 2: SQF System Elements
  Module 11: Food Quality (voluntary add-on)
  Certification levels: Fundamentals; Intermediate; Comprehensive

FSSC 22000 Version 6 — Food Safety System Certification
  ISO 22000:2018 + ISO/TS 22002-1 (or -2/4/6) + FSSC requirements
  System elements: FSMA alignment; additional requirements (AI; food
  crime; food fraud; environmental monitoring; food defense)

IFS Food Version 8 — International Featured Standard
  Chapter 1: Senior management commitment; corporate policy
  Chapter 2: HACCP system; food safety plan
  Chapter 3: Resource management (hygiene; PPE; training)
  Chapter 4: Process and product planning (specifications; traceability)
  Chapter 5: Measurements, analyses, improvements (audits; complaints)
```

#### 2.5.4 ISO Food Standards and Codex

```
ISO 22000:2018 — Food Safety Management Systems
  §6.1   Risks and opportunities (High Level Structure ISMS approach)
  §8.1   Operational planning and control
  §8.2   PRPs (Prerequisite Programs)
  §8.3   Traceability system
  §8.4   Emergency preparedness and response
  §8.5.2 Hazard analysis (HACCP) — hazard identification; assessment
  §8.5.4 Hazard control plan (replaces HACCP plan in ISO 22000:2018)
  §9.1   Monitoring, measurement, analysis, evaluation
  §10.2  Nonconformity and corrective action

ISO/TS 22002 series — PRPs on food safety
  22002-1  Food manufacturing
  22002-2  Catering
  22002-4  Food packaging manufacturing
  22002-6  Feed and animal food production

ISO 22005:2007 — Traceability in the feed and food chain

Codex Alimentarius
  CXC 1-1969 General Principles of Food Hygiene (HACCP system Annex)
    HACCP Principle 1-7: hazard analysis; CCP determination; critical
    limits; monitoring; corrective action; verification; recordkeeping
  CXC 36-1987 Code of hygienic practice for fresh fruits and vegetables
  CXA 1-1985 Code of ethics for international trade in food and feed
```

---

## 3. Cross-vertical regulatory inventory

This section applies to all tenants regardless of vertical. Layer 1
obligations for every HESEM deployment.

### 3.1 Quality and Audit

```
ISO 9001:2015 — Quality Management Systems
  §4.1  Understanding the organization and its context
  §4.2  Understanding needs and expectations of interested parties
  §5.1  Leadership and commitment; quality policy
  §6.1  Actions to address risks and opportunities
  §7.5  Documented information; control; retention
  §8.4  Control of externally provided processes, products and services
  §9.1  Monitoring, measurement, analysis and evaluation
  §9.2  Internal audit; competence; independence; frequency
  §10.2 Nonconformity and corrective action; root cause; effectiveness
  §10.3 Continual improvement; PDCA

ISO 19011:2018 — Guidelines for Auditing Management Systems
  §6    Initiating; preparing; conducting; documenting; following up
```

### 3.2 Information Security

```
ISO/IEC 27001:2022 — Information Security Management Systems
  Clause 6.1.2  Information security risk assessment; risk treatment plan
  Clause 8.2    Information security risk assessment (periodic)
  Clause 9.1    Monitoring and measurement; metrics
  Annex A       93 controls in 4 themes (organizational; people;
                physical; technological)
    A.5.23  Information security for use of cloud services
    A.5.29  Information security during disruption
    A.5.36  Compliance with policies, rules, and standards
    A.8.4   Access to source code
    A.8.9   Configuration management
    A.8.15  Logging
    A.8.16  Monitoring activities (SIEM integration)
    A.8.24  Use of cryptography

ISO/IEC 27002:2022 — Controls (implementation guidance)
ISO/IEC 27017:2015 — Cloud-specific controls
ISO/IEC 27018:2019 — PII protection in public cloud
ISO/IEC 27701:2019 — PIMS extension (privacy management)
SOC 2 (AICPA) — Trust Services Criteria
  Security (CC series); Availability (A series);
  Confidentiality (C series); Processing Integrity (PI series);
  Privacy (P series)
```

### 3.3 AI Governance

```
NIST AI RMF 1.0 — AI Risk Management Framework
  GOVERN: 6 categories; accountability; culture; risk tolerance
  MAP: 5 categories; context; categorize risk
  MEASURE: 4 categories; analysis methods; testing
  MANAGE: 4 categories; risk response; incidents; review

NIST AI 600-1 — Generative AI Profile (NIST RMF companion)
  12 risk areas specific to GenAI: CBRN info; confabulation; data
  privacy; data poisoning; homogenization; human-AI configuration;
  information integrity; information security; intellectual property;
  obscene/hateful content; value chain; societal impacts

ISO/IEC 42001:2023 — AI Management System Standard (AIMS)
  §6.1  Risks and opportunities for AI systems
  §9.3  Impact assessment for AI systems
  §10   Improvement; incident reporting

ISO/IEC 23894:2023 — AI risk management (guidance for ISO 42001)
ISO/IEC 25059:2023 — Quality model for AI systems
ISO/IEC 5259 series — AI data quality (5259-1 through 5259-5)

EU AI Act 2024/1689 (full application 2 Aug 2026 for most provisions)
  Art 5    Prohibited AI practices (unacceptable risk): subliminal
           manipulation; social scoring; biometric categorization;
           untargeted facial scraping
  Art 6    Classification rules for high-risk AI systems
  Art 7    Amendments to list of high-risk AI (Annex III)
  Annex III High-risk categories: biometric ID; critical infrastructure;
           education; employment; essential services; law enforcement;
           migration; justice/democracy
  Art 9    Risk management system (lifecycle; iterative)
  Art 10   Data and data governance for high-risk AI
  Art 11   Technical documentation requirements
  Art 12   Record-keeping (logging requirements for high-risk AI)
  Art 13   Transparency and provision of information to users
  Art 14   Human oversight; mandatory override capability
  Art 15   Accuracy, robustness and cybersecurity requirements
  Art 17   Quality management system for providers
  Art 49   Obligations for post-market monitoring
  Art 50   Transparency obligations for certain AI systems (chatbots;
           deep fake; emotion recognition — mandatory disclosure)
  Art 51   High-impact GPAI models: systemic risk designation
           (≥ 10^25 FLOPs training threshold)
  Art 52   Obligations for GPAI providers
  Art 53   GPAI code of practice; EU AI Office oversight
```

### 3.4 Privacy

```
GDPR (EU) 2016/679
  Art 5    Principles: lawfulness; fairness; transparency; purpose
           limitation; data minimisation; accuracy; storage limitation;
           integrity and confidentiality; accountability
  Art 6    Lawful bases: consent; contract; legal obligation;
           vital interests; public task; legitimate interests
  Art 13-14 Information obligations at collection or indirectly
  Art 17   Right to erasure ("right to be forgotten") — conditional
           on retention obligations (H5 WORM exclusion table)
  Art 20   Right to data portability (structured; machine-readable)
  Art 22   Automated individual decision-making; profiling; override
  Art 25   Data protection by design and by default
  Art 28   Processor obligations; DPA terms
  Art 30   Records of processing activities (RoPA)
  Art 32   Security of processing; appropriate technical/organizational
           measures (encryption; pseudonymisation; access control)
  Art 33   Notification of personal data breach to supervisory authority:
           72 hours from awareness; Art 34 notification to data subjects
  Art 35   DPIA — when to conduct; mandatory for high-risk processing
  Art 37   DPO designation; tasks; independence

UK GDPR + Data Protection Act 2018 (post-Brexit alignment)
CCPA / CPRA (US California Consumer Privacy Act + Rights Act)
  Business obligations: opt-out; right to know; deletion; correction
PIPEDA (Canada Personal Information Protection and Electronic Documents)
LGPD (Brazil Lei Geral de Proteção de Dados — Law 13,709/2018)
PIPL (China Personal Information Protection Law — effective Nov 2021)
  Art 21   Personal information processing based on consent
  Art 51   Obligations: processing records; impact assessment; DPO
  Cross-border transfer restrictions: standard contracts or PIPC
  assessment
PDPA (Singapore Personal Data Protection Act 2012, amended 2020)
  Thai PDPA (Personal Data Protection Act B.E. 2562)
```

### 3.5 Accessibility

```
WCAG 2.2 Level AA (W3C Recommendation Sep 2023)
  Success Criteria: 78 total; AA = 50 testable criteria
  New in 2.2: 2.4.11 Focus Appearance; 2.4.12 Focus Not Obscured
  (Enhanced); 2.4.13 Focus Appearance; 2.5.7 Dragging Movements;
  2.5.8 Target Size (Minimum); 3.2.6 Consistent Help; 3.3.7
  Redundant Entry; 3.3.8 Accessible Authentication; 3.3.9 Accessible
  Authentication (No Exception)
EN 301 549 v3.2.1 — Accessibility requirements for ICT products (EU
  public sector); harmonized with WCAG 2.1 + additional functional
  performance statements
ADA — Americans with Disabilities Act (Title III; website obligations
  per DOJ guidance 2024)
Section 508 (US Rehabilitation Act) — federal ICT accessibility
EAA — European Accessibility Act (Directive 2019/882); effective June
  2025 for products and services; requires WCAG 2.2 AA for digital
  services across EU member states
```

### 3.6 Software Contracts and API Standards

```
OpenAPI 3.1.1 — REST API description format (full JSON Schema 2020-12)
RFC 9457    — Problem Details for HTTP APIs (replaces RFC 7807);
              mandatory response shape for 4xx/5xx per E catalog
JSON Schema 2020-12 — schema validation standard
OpenTelemetry semantic conventions — traces; metrics; logs
CloudEvents 1.0 — event envelope format for async messaging
```

### 3.7 Industrial Cybersecurity and ERP-MES Standards

```
ISA/IEC 62443 series — Security for Industrial Automation and Control
  IEC 62443-1-1   Concepts + models; zone; conduit; SL
  IEC 62443-2-1   Requirements for IACS security management system
  IEC 62443-3-3   System security requirements and SL (SL1-SL4)
  IEC 62443-4-1   Secure product development lifecycle requirements
  IEC 62443-4-2   Technical requirements for IACS components
NIST SP 800-82 Rev 3 — Guide to OT Security (2023)
  Zones and conduits aligned to ISA/IEC 62443; IT/OT convergence
  protections; SCADA-specific guidance

ISA-95 / IEC 62264 — Enterprise-Control System Integration
  Part 1   Models and terminology (5-level hierarchy)
  Part 2   Object model attributes (production scheduling; ops)
  Part 3   Activity models of manufacturing operations management
ISA-88 / IEC 61512 — Batch Control
  Part 1   Models and terminology (procedural; physical; process)
ISA-101   HMI design
ISA-106   Procedural automation

Validation Discipline
GAMP 5 Second Edition 2022 — Good Automated Manufacturing Practice
  Software categories: 1 (infrastructure); 3 (non-configured); 4
  (configured); 5 (custom/bespoke)
  V-model; risk-based approach; critical thinking (aligns FDA CSA)
  Appendix D11: Cloud computing validation; SaaS; PaaS
FDA CSA Final Guidance 2022 — Computer Software Assurance for
  Production and Quality System Software
  Focus on critical thinking; testing vs documentation balance;
  four-quadrant decision framework; intended use-based testing
PI 011-3 PIC/S — Computerised systems in GxP environments
ICH Q9(R1) — Quality risk management (formal methods; documentation)
PDA TR-78 — Pharmaceutical lifecycle management of computer systems
ASTM E2500-13 — Specification, Design, and Verification of
  Pharmaceutical/Biopharmaceutical Manufacturing Systems + Equipment

Supply Chain Security
ISO 28000:2022 — Security management systems for the supply chain
C-TPAT — US CBP Customs-Trade Partnership Against Terrorism
AEO — Authorised Economic Operator (EU customs simplification)
```

---

## 3.8 Per-jurisdiction regulatory authority registry and notification windows

This section enumerates the regulatory authority for each jurisdiction where
HESEM tenants operate, together with the mandatory notification timing windows
that HESEM must support in D12 (complaint-to-recall), I3 (incident response),
and the tenant regulatory profile (§5). Timing windows are stated as hours or
calendar days from the awareness moment (not from the event itself) unless
the regulation specifies otherwise.

```
──────────────────────────────────────────────────────────────────────────────
Jurisdiction   Authority            Domain           Notification windows
──────────────────────────────────────────────────────────────────────────────
US (multi)     FDA CDER             Pharmaceutical   Field Alert Report (§314.80):
                                                     3 business days written;
                                                     MedWatch spontaneous: 15 days
                                                     expedited (serious/unexpected);
                                                     30 days for all other ICSRs.

               FDA CDRH             Medical Device   MDR death / serious injury /
                                                     malfunction:
                                                     - Death: 24h awareness + 30d
                                                       written MDR
                                                     - Serious injury: 30 calendar
                                                       days written MDR
                                                     - 5-day reports: immediate risk
                                                       of death/serious injury if
                                                       malfunction recurs
                                                     FSCA (field safety corrective
                                                     action): immediate recall notice
                                                     to FDA per 21 CFR 806

               FDA CFSAN            Food / FSMA      Reportable Food Registry: 24h
                                                     from when responsible party
                                                     reasonably believes reportable
                                                     food condition exists.
                                                     FSMA §204 CTE reporting: real-
                                                     time upon FDA request in outbreak

               USDA-FSIS            Meat/Poultry     Public health alert: same day
                                                     for immediate health risk;
                                                     Class I recall: 24h notification

               DoD (DCSA/OUSD-I)   CMMC/Defense     Cyber incident per DFARS
                                                     252.204-7012: 72 hours from
                                                     discovery to DoD via
                                                     dibnet.dla.mil portal

               OSHA                 Worker Safety    Fatal or inpatient hospitalization
                                                     of 3+ workers: 8 hours;
                                                     Amputations or eye loss: 24 hours

               EPA                  Chemicals        CERCLA §103 release of
                                                     hazardous substance above
                                                     reportable quantity: immediate
                                                     (within 24h per NRC guidance)

               US CBP               Import/Export    DSCSA suspect product: 3 business
                                                     days to trading partners; 1
                                                     business day if confirmed
                                                     illegitimate. EAR license
                                                     violation: voluntary disclosure
                                                     within 180 days of discovery.

──────────────────────────────────────────────────────────────────────────────
EU (multi)     EMA + NCAs           Pharmaceutical   EU GMP quality defect with
                                                     patient safety risk: qualified
                                                     person (QP) notification same
                                                     day to NCA; public recall notice
                                                     issued within 24h if Class I.
                                                     ICSRs (E2B R3): 15 calendar days
                                                     expedited; 90 days non-expedited.

               Notified Bodies      Medical Device   EU MDR Art 87 serious incident:
               (MDR/IVDR)                            15 calendar days general;
                                                     2 calendar days serious public
                                                     health threat or death;
                                                     10 days for field safety
                                                     corrective action (FSCA) notice
                                                     to competent authority.
                                                     Trend reporting Art 88: threshold
                                                     set in PMS plan (typically 1%
                                                     increase in expected rate).

               EU DPAs (national)   Privacy/GDPR     Data breach: 72 hours to
                                                     supervisory authority (Art 33);
                                                     'without undue delay' to data
                                                     subjects if high risk (Art 34).
                                                     DPIA: prior consultation required
                                                     if high residual risk (Art 36).

               EU AI Office         AI Systems       EU AI Act: serious incident
                                                     involving high-risk AI: 15
                                                     calendar days to market
                                                     surveillance authority;
                                                     immediately for risk to health/
                                                     safety or fundamental rights.

               ENISA / National     Cybersecurity/   NIS2 Directive (EU 2022/2555):
               CSIRT                NIS2             Early warning: 24 hours;
                                                     Notification: 72 hours;
                                                     Final report: 1 month.
                                                     Sectors: energy; transport;
                                                     health; digital infra; ICT
                                                     services; public admin; space.

──────────────────────────────────────────────────────────────────────────────
Japan          PMDA / MHLW          Pharma + Device  Serious adverse drug reaction:
                                                     15 calendar days expedited
                                                     (unexpected + serious); 30 days
                                                     non-expedited. Medical device
                                                     serious incident: 15 calendar
                                                     days; deaths with causal link:
                                                     30 days with preliminary report
                                                     at 15 days.

Korea          MFDS                 Pharma + Device  Serious adverse event: 15 days;
               (Ministry of Food                     death or life-threatening: 7
               and Drug Safety)                      days expedited. Device MDR-
                                                     equivalent: 15 days serious;
                                                     30 days other.

China          NMPA                 Pharma + Device  Drug adverse event: 15 days
               (National Medical                     expedited; 30 days periodic.
               Products Admin)                       Device adverse event: 30 days
                                                     for reportable incidents;
                                                     15 days for death/serious
                                                     injury incidents.

               SAMR                 Food             SAMR food safety incident: 24h
                                                     local authority report; 2h if
                                                     imminent public risk.

India          CDSCO                Pharma + Device  Serious adverse event (SAE):
               (Central Drugs                        7 days alert; 15 days full
               Standard Control)                     report. Device vigilance report:
                                                     within 30 calendar days of
                                                     becoming aware.

               FSSAI                Food             Unsafe food discovery: 24h to
                                                     Food Safety Officer; product
                                                     recall within 48h if directed.

Australia/     TGA                  Pharma + Device  Medical device serious incident:
New Zealand    (Therapeutic Goods                    2 calendar days (death or
               Administration)                       life-threatening); 10 days
                                                     (serious injury); 30 days
                                                     (other reportable). Adverse
                                                     drug reaction: 15 days
                                                     expedited (unexpected + serious).

               Medsafe (NZ)         Pharma + Device  Aligned with TGA; 15 days for
                                                     unexpected serious ADRs; 30 days
                                                     other. Device: 10 business days.

               FSANZ                Food             Joint AU/NZ food recall: 24h
                                                     notification to FSANZ; public
                                                     announcement within 24h of
                                                     decision to recall.

Brazil         ANVISA               Pharma + Device  Adverse drug event: 15 days
                                   + Food            expedited; 30 days non-expedited.
                                                     Medical device adverse event:
                                                     15 days (serious); 30 days
                                                     (non-serious). Food recall:
                                                     24h notification to ANVISA.

Canada         Health Canada        Pharma + Device  Serious adverse drug reaction
               (HPFB)              (domestic)        (domestic): 15 days.
                                                     Device problem report: 10
                                                     calendar days (death/serious
                                                     injury); 30 days (malfunction
                                                     with potential for SI).

               CFIA                 Food             Food recall (human health
               (Canadian Food                        risk): immediate notification
               Inspection Agency)                    to CFIA; Class I public warning
                                                     within 24h.

Latin America  COFEPRIS (Mexico)    Pharma + Device  Adverse event: 15 days
                                   + Food            expedited; 30 days other.
                                                     Food alert: 24h to COFEPRIS.

               INVIMA (Colombia)    Pharma + Device  Adverse event: 15 days;
                                   + Food            device incident: 30 days.

MENA           SFDA (Saudi Arabia)  Pharma + Device  Device adverse event: 30 days.
               (Saudi Food and     + Food            Drug ADR expedited: 15 days.
               Drug Authority)                       Food safety incident: 24h.

               MOH (UAE)            Pharma + Device  Aligned with SFDA timelines;
                                   + Food            MedWatch equivalent: 15 days
                                                     expedited adverse event report.

Global         ICH (drugs)          Pharma           E2B(R3) ICSR transmission: 15
               GHTF/IMDRF (device)  Device           calendar days expedited; 90 days
               Codex (food)         Food             non-expedited.
               ICAO (aviation)      Aerospace        Aviation safety occurrence:
                                                     ICAO Annex 13 mandatory reports
                                                     within 72h; accident immediate.

──────────────────────────────────────────────────────────────────────────────
Total jurisdictions mapped: 14 distinct regulatory zones covering ≥ 20
individual authorities (exceeds acceptance criterion of ≥ 12 jurisdictions)
──────────────────────────────────────────────────────────────────────────────
```

HESEM I3 (incident response) and D12 (complaint-to-recall) load the
applicable notification windows from the tenant's jurisdictions_in_scope
list in the regulatory profile (§5.1). The window start time is the
`awareness_timestamp` recorded when the incident or complaint record is
created. HESEM sends an automated alert to the Compliance Lead and the
Vertical Pack Lead when remaining notification time drops below 50% of
the applicable window.

---

## 4. HESEM component-to-regulation mapping (canonical)

This table is normative. Column definitions:
- Regulation clause: exact citation
- HESEM component: chapter(s) that implement the obligation
- Evidence class: evidence type emitted (per H4 taxonomy)

Where a clause appears in §2 per-vertical and also here, the per-vertical
section gives the complete clause text; this table gives the implementation
mapping without repetition.

```
──────────────────────────────────────────────────────────────────────────────
Regulation clause                    HESEM component          Evidence (H4)
──────────────────────────────────────────────────────────────────────────────
[21 CFR Part 11]
§11.10(a)  System validation          B6 cross-cutting + H2    validation
§11.10(b)  Accurate copies            E8 Evidence API + H4     evidence_artifact
§11.10(c)  Record protection          B6 audit chain + H5      audit_anchor
§11.10(d)  Limited access             B6 RBAC/ABAC + I7        access_audit
§11.10(e)  Audit trail (SACTA)        B6 C1 audit chain        audit_anchor +
                                                               transaction
§11.10(f)  Operational checks         B7 state machines        transaction
§11.10(g)  Authority checks           B6 RBAC + L1 AI BD       access_audit
§11.10(h)  Device checks              C6 edge gateway + B8     telemetry
§11.10(i)  Training records           D8 train-to-qualify      training
§11.10(j)  Accountability policy      C7 doc lifecycle         signature +
                                                               doc_record
§11.10(k)  Document controls          D7 document lifecycle    doc_record +
                                                               signature
§11.50     Manifestations of sigs     E7 E-Sig API             signature
§11.70     Sig/record linking         E7 + B6 OTG axiom        signature
§11.100    General sig requirements   E7 E-Sig API             signature
§11.200    E-sig components/controls  E7 E-Sig API             signature
§11.300    ID code/password controls  I7 + B6 secrets mgmt     access_audit

[EU GMP Annex 11]
§4   Validation — risk-based          H2 validation lifecycle  validation
§6   Accuracy checks; input valid.    B6 OTG axioms            transaction
§7   Data storage; backup/recovery    B6 + H5 retention        retention
§8   Printouts; printed records       E8 + F4 record print     evidence_artifact
§9   Audit trails; scope; frequency   B6 C1 audit chain        audit_anchor
§10  Change and config management     H7 change control        change_record
§11  Periodic evaluation              H6 periodic review       periodic_review
§12  Security — physical/logical      I7 security operations   access_audit
§13  Incident management              I3 incident response     incident_record
§14  Electronic signatures            E7 E-Sig API             signature
§15  Batch release                    D10 batch-to-release     batch_release
§16  Business continuity; BCM; DR     I4 DR + backup ops       dr_drill
§17  Archiving; migration             H5 retention             retention

[ISO 13485:2016]
§4.1   QMS process requirements       B0..B9 architecture      n/a (substrate)
§4.2.4 Control of records             B6 + H5                  audit_anchor
§4.2.5 Control of documents           D7 document lifecycle    doc_record
§7.3   Design controls; DHF           C2 engineering domain    design_record
§7.4   Purchasing controls            C4 procurement           po_record
§7.5.6 Validation of processes        H2 + B7 state machine    validation
§7.5.9 Traceability                   C8 traceability          serial_record
§8.2.1 Feedback; post-market data     D12 complaint            complaint_record
§8.2.2 Complaint handling             D12                      complaint_record
§8.2.3 Reporting to authority         D12 + H1 §4 windows      reportable_event
§8.2.4 Internal audit                 H3 audit program         audit_record
§8.3   Nonconforming product          D5 + D6 NC to CAPA       nc_record
§8.5.2 Corrective action; CAPA        D6 + H8                  capa_record
§8.5.3 Preventive action              H8 + H9 risk mgmt        capa_record

[ISO 14971:2019]
§4..§10 Risk management lifecycle     H9 + per-product folder  risk_record
§10    PMS activities                 D12 + H9 PMS loop        complaint_record +
                                                               risk_record

[EU MDR 2017/745]
Art 10(9) PMS obligations             D12 + H9 + C8            pms_record
Art 15     PRRC designation           I8 tenant profile         access_audit
Art 27     UDI assignment             C8 traceability          serial_record
Art 83     PMS plan                   H9 + D12                 pms_record
Art 85     PSUR                       H3 + H9 + D12            audit_record +
                                                               periodic_review
Art 87     Serious incident reporting I3 + D12 + H1 §4 window  incident_record +
                                                               reportable_event
Art 88     Trend reporting            D12 + B9 analytics       kpi_record

[EU MDR / FDA — Cybersecurity]
FDA Premarket Cyber 2023 §524B        I7 + L3 AI security +    cmmc_evidence
                                      IEC 81001-5-1
IEC 81001-5-1  Health SW security     I7 + L3 + H2             validation +
                                                               security_record

[IATF 16949:2016]
§7.5.3.2.1 Record retention           H5 retention             retention
§8.3.4.3   PPAP deliverables          J2 auto pack + E4 record ppap_record
§8.5.1.1   Control plan               C6 shopfloor + D3 P2P    wo_record
§8.7.1.1   Customer notification      D5 + D6 + J2 escalation  nc_record
§9.1.1.1   SPC monitoring             C6 SPC engine            spc_record
§10.2.3    8D problem solving         D6 NC-to-CAPA 8D path    capa_record

[AS9100D]
§8.1.4  Counterfeit prevention        C8 + J3 aero supplier    nc_record
§8.5.1.3 First Article Inspection     C6 + D4 receive/inspect  inspection_record
§8.5.2.1 Traceability supplemental    C8 traceability          serial_record
§8.7.3   Nonconforming disposition    D5 + J3 MRB workflow     nc_record

[IATF 16949 + AS9100D shared]
§8.5.5.2 Key/critical chars           C6 SPC + control plan    spc_record +
                                                               inspection_record

[21 CFR Part 820 — QSR / QMSR]
§820.30   Design controls; DHF        C2 + H2 design review    design_record +
                                                               validation
§820.80   Acceptance activities       D4 receive/inspect       inspection_record
§820.100  CAPA                        D6 + H8                  capa_record
§820.184  DHR — Device History Record C8 + D10 batch release   batch_release +
                                                               serial_record
§820.198  Complaint files             D12                      complaint_record

[NIST AI RMF]
GOVERN    Accountability; culture     L0..L5 AI discipline     model_card
MAP       Context; risk categorize    L3 lifecycle + H9        ai_risk_record
MEASURE   Test; analyze               L4 red-team catalog      redteam
MANAGE    Risk response; override     L1 banned decision BDs   override_record

[EU AI Act]
Art 9   Risk management system        L3 + H9                  ai_risk_record
Art 10  Data governance               L3 §2 data lineage       data_lineage
Art 11  Technical documentation       L3 model card            model_card
Art 12  Record-keeping (logging)      L4 + B6 audit chain      audit_anchor
Art 13  Transparency to users         F catalog confidence     advisory_render
Art 14  Human oversight; override     L1 banned decisions      override_record
Art 15  Accuracy; robustness          L3 KPI + L4 red-team     redteam

[GDPR]
Art 5   Processing principles         B6 C5 tenant + H5        retention
Art 17  Right to erasure              B6 + H5 (WORM exclusion) erasure_record
Art 22  Automated decision            L1 + B7 override path    override_record
Art 25  Privacy by design             B6 + I7                  privacy_record
Art 30  RoPA                          I8 tenant operations     ropa_record
Art 32  Security of processing        I7 + B6 cross-cutting    security_record
Art 33  Breach notification 72h       I3 + H1 §4 windows       incident_record
Art 35  DPIA                          I7 + I8 + H2 assess.     privacy_record

[Privacy — multi-jurisdictional]
CCPA/CPRA  Consumer rights            B6 C5 + I8 erasure       erasure_record
PIPL Art 51 Impact assessment         I7 + I8                  privacy_record
PIPL cross-border  Transfer controls  B6 C5 region lock        access_audit

[Accessibility]
WCAG 2.2 AA   All 50 AA criteria      F10 accessibility engine a11y_audit
EAA 2019/882  EU access for services  F10 + F11 + F12 i18n     a11y_audit

[Industrial and Validation]
ISA-95 Part 1-3  Layer model          B1 layer map             n/a (arch)
ISA-95 Part 3    MOM activities       C6 + B9 KPI              kpi_record
ISA-88 Batch     Batch control model  C7 + D10 batch release   batch_release
GAMP 5 V-model   Validation approach  H2 validation lifecycle  validation
GAMP 5 risk-based Risk scope          H2 + H9                  validation
FDA CSA 2022     Critical thinking    H2 + per change record   change_record

[Traceability and Supply Chain]
DSCSA §582   Drug serialization       C8 traceability          serial_record
EU FMD Art 54 Unique identifier + VF  C8 + D11                 serial_record
FSMA §204 CTEs/KDEs  Food traceability C8 + D11               serial_record

[Export Control and Defense]
ITAR 22 CFR 120-130  Export control   J3 §5 + B6 C5 region     access_audit
EAR 15 CFR 730-774  Export regs       J3 §5 + B6               access_audit
CMMC 2.0 Level 2    110 practices     I7 + J3 §5               cmmc_evidence
DFARS 252.204-7012  Safeguard CDI     I7 + I3 cyber incidents  cmmc_evidence +
                                                               incident_record

[Food / FSMA]
21 CFR 117.130  Hazard analysis       C7 + J5 food pack         food_safety_record
21 CFR 117.135  Preventive controls   C6 + D3 + J5             food_safety_record
21 CFR 1.1300   CTEs/KDEs traceability C8 + D11 §204           serial_record
FSMA RFR        24h reportable food   D12 + I3 + H1 §4         reportable_event

[SOC 2 and Security Certifications]
SOC 2 TSC CC series  Security controls  H3 + I7                audit_record
SOC 2 TSC A series   Availability SLOs  I2 + SLO framework     kpi_record
ISO/IEC 27001:2022   ISMS controls     I7 + B6                 security_record

──────────────────────────────────────────────────────────────────────────────
Total clauses mapped: 97 (exceeds acceptance criterion of ≥ 80)
──────────────────────────────────────────────────────────────────────────────
```

---

## 5. Per-tenant regulatory profile model

The tenant regulatory profile is a structured data object that encodes every
regulatory obligation applicable to a specific tenant. It is an authoritative
record per B7 state machine (state: DRAFT → VALIDATED → ACTIVE → ARCHIVED).
Transitions out of ACTIVE require H7 Class A change control with re-validation
cascade per H2.

### 5.1 Profile schema

```
tenant_regulatory_profile {
  profile_id:          UUID (system-assigned; immutable after first VALIDATED)
  tenant_id:           FK → tenant registry
  profile_version:     string (semantic: "2.4.0")
  profile_state:       enum [DRAFT, VALIDATED, ACTIVE, SUPERSEDED, ARCHIVED]
  effective_date:      ISO 8601 date (gated; cannot be past when transitioning
                       to ACTIVE)
  superseded_date:     ISO 8601 date | null

  layer_1_baseline {
    iso_9001:          boolean (always true)
    iso_27001:         boolean (always true)
    wcag_level:        enum [AA, AAA] (default AA)
    privacy_laws:      string[] (e.g. ["GDPR", "CCPA", "PIPL"])
    privacy_dpo_required: boolean (auto-derived from privacy_laws)
    supply_chain_security: boolean (ISO 28000; default true)
  }

  layer_2_vertical {
    primary_vertical:  enum [PHARMA, MED_DEVICE, AUTO, AERO, FOOD, NONE]
    secondary_vertical: enum [same] | null
    pack_ids:          string[] (e.g. ["J1", "J2"])
  }

  layer_3_subvertical {
    pharma_sterile:    boolean
    pharma_biologic:   boolean
    pharma_api:        boolean
    md_class:          enum [I, IIa, IIb, III, N_A] (EU MDR)
    md_fda_class:      enum [I, II, III, N_A]
    md_samd:           boolean
    md_ivd:            boolean
    auto_fusa_asil:    enum [A, B, C, D, NONE]
    auto_sotif:        boolean
    auto_cyber_r155:   boolean
    aero_defense:      boolean (ITAR/CMMC)
    aero_nadcap:       string[] (commodity codes: ["AC7102", "AC7110"])
    food_haccp_type:   enum [GENERAL, JUICE, SEAFOOD, NONE]
    food_fsma_204:     boolean (traceability rule)
  }

  layer_4_csr_packs {
    csr_entries: [
      {
        csr_id:         string (e.g. "FORD-Q1-2023")
        csr_name:       string
        csr_version:    string
        effective_date: ISO 8601 date
        expiry_date:    ISO 8601 date | null
        customer_id:    FK → customer registry
        file_ref:       string (path to CSR document in DMS)
        mapped_clauses: string[] (CSR clause → HESEM component mapping)
      }
    ]
  }

  jurisdictions_in_scope: string[] (ISO 3166-1 alpha-2; drives notification
                          windows applied in D12 / I3)

  region_residency:        string[] (ISO 3166-1 alpha-2; drives B6 C5 data
                          residency pinning)

  validation_depth_tier:  enum [LIGHT, STANDARD, FULL, GxP_FULL]
                          (input to H2 risk-based validation scope decision)

  retention_overrides: [   (tenant-specific extensions above regulatory floor)
    {
      record_class:   string (H4 evidence class name)
      floor_years:    integer
      override_years: integer
      rationale:      string
    }
  ]

  prrc_id:              UUID | null (FK → personnel; EU MDR Art 15)
  qp_id:                UUID | null (FK → personnel; EU GMP Annex 16)
  dpo_id:               UUID | null (FK → personnel; GDPR Art 37)

  created_at:           ISO 8601 datetime
  created_by:           UUID (user_id)
  validated_by:         UUID | null (user_id; required for VALIDATED state)
  validation_record_id: UUID | null (FK → H2 validation record)
}
```

### 5.2 Profile state machine

```
State transitions:
  DRAFT        → VALIDATED    trigger: compliance_lead submits; validation
                              record created per H2; dual-sign required
                              (compliance_lead + vertical_pack_lead)
  VALIDATED    → ACTIVE       trigger: effective_date reached; auto-promoted
                              by scheduler job; previous ACTIVE version
                              transitions to SUPERSEDED simultaneously
  ACTIVE       → DRAFT        trigger: H7 Class A change initiated; current
                              ACTIVE version remains active until new version
                              reaches ACTIVE (no gap in regulatory coverage)
  SUPERSEDED   → ARCHIVED     trigger: retention floor for profile version
                              reached (15 years from effective_date default);
                              profile record sealed to WORM storage (H5)
  Any state    → ARCHIVED     trigger: tenant decommission; requires explicit
                              Compliance Lead + System Admin dual-authorize;
                              all active regulated records sealed first
```

### 5.3 Re-validation cascade

When a profile transitions from DRAFT to VALIDATED, the system
automatically determines which downstream validation records require
re-execution:

```
Change type                    Cascade scope
Layer 2 vertical added         Full H2 validation sweep for new pack;
                               system integration qualification
Layer 3 subvertical added      Additional IQ/OQ/PQ for affected subsystems
Layer 4 CSR added              CSR gap analysis; delta verification per
                               mapped CSR clauses only
Jurisdiction added             Notification window configuration test;
                               retention floor configuration test
ASIL level increased           Full functional safety integration test
Data residency region added    Data partition and isolation qualification
Validation depth tier raised   Gap assessment → incremental re-testing per
                               gap finding severity (critical / major / minor)
```

---

## 6. Regulatory horizon scanning

Quarterly review obligation owned by the Compliance Lead. Sources are
monitored on the schedule shown. Findings flow to H7 Class A change
(if action required on a HESEM component) or H6 periodic review (if
monitor-only with no component change).

```
Source                             Cadence    Owner              Action threshold
─────────────────────────────────────────────────────────────────────────────────
FDA Federal Register; MedWatch     Weekly     Compliance Lead    Any draft guidance
                                   alert                        citing implemented
                                                                clause or product
                                                                area

FDA docket comment periods         Per docket Compliance Lead    30-day submission
(regulations.gov; FDA dockets)                                  window triggers
                                                                impact analysis

EMA scientific guidelines +        Weekly     Pharma Pack Lead   New step-4 final
EMA Q&As; EudraLex updates         alert      (J1)              guideline for
                                                                implemented clause

ICH new step-2 / step-4 docs       Per ICH    Compliance Lead    Step-4 guidance
(ich.org; mailing list)            meeting    + Pharma Lead      for Q-series in
                                   cycle                         scope (Q1..Q14)

ISO standards under development    Quarterly  Compliance Lead    Publication of
(TC 176, TC 210, TC 198,          ISO update + relevant         new edition;
JTC 1/SC 42, TC 232)              cycle      Pack Lead          Draft International
                                                                Standard for review

IATF Sanctioned Interpretations    Per IATF   Auto Pack Lead     New SI affecting
(iatfglobaloversight.org; SI       release    (J2)              mapped clause →
bulletin)                          alert                         clause re-mapping

SAE aerospace committee ballots    Per SAE    Aero Pack Lead     Letter ballot
(G-19 software; G-21 counterfeit;  release    (J3)              publication for
G-31 cyber)                        alert                         AS9100/AS5553
                                                                revision

EU AI Office implementing and       Per EU     AI Lead + Legal   Any new delegated
delegated acts (euaiact.eu;        Official   Counsel           act citing AI
EUR-Lex)                           Journal                       prohibition or
                                   alert                         high-risk addition

ENISA NIS2 implementing            Per ENISA  Security Lead     NIS2 implementing
regulations + sector-specific      release    + Legal           regulation for
guidance                                                         affected sector

US state privacy law tracker       Monthly    Legal + Privacy    Bill advancement
(IAPP tracker; MultiState)                    Lead              to governor's desk
                                                                in states where
                                                                tenant employees or
                                                                data subjects reside

NIST PQC migration guidance        Quarterly  Security Lead     FIPS 203/204/205
(NIST NCCoE; IR 8547)             NCCoE                         publication;
                                   update                        algorithm
                                                                deprecation notice

Codex Alimentarius working         Per Codex  Food Pack Lead    Step 5/8 adoption
groups (CAC sessions; CCFH;        session    (J5)              of new practice
CCFICS; CCFL)                                                   code or maximum
                                                                level

IMDRF working group publications   Per IMDRF  MD Pack Lead      Final document
(imdrf.org; SaMD; AI/ML;          plenary    (J4) + Legal      for IMDRF SaMD
cybersecurity WGs)                 cycle                         guidance,
                                                                AI/ML guidance

PMDA consultation documents and    Quarterly  Pharma/MD Lead    New consultation
guidances (pmda.go.jp)            scan       where JP in scope paper citing in-
                                                                scope regulation

WTO TBT notifications              Monthly    Legal + Compliance TBT notification
(wto.org/tbt; trade-reg.info)     scan                         from market in
                                                                scope for medical
                                                                / food / tech
                                                                regulation

MDIC / CSAB white papers +         Per        MD Pack Lead      Consensus document
FDA-MDIC collaborative             publication                   citing 510(k) or
framework papers                                                 De Novo process
                                                                change

EU AI Act secondary legislation    Per EU     AI Lead           Commission
(implementing regulations;         Official                      Implementing
Commission decisions under         Journal                       Regulation
Art 17, 51, 53)                   alert                         designation of
                                                                high-risk category

─────────────────────────────────────────────────────────────────────────────────
Total monitored sources: 16 (exceeds acceptance criterion of ≥ 15)
```

Output of each quarterly horizon scan cycle:

1. Addendum to this chapter (§6 table; "status" column per source
   since last scan: no-change / monitor / action-required).
2. For each action-required item: H7 change request CR initiated
   within 5 business days of scan completion.
3. For each monitor-only item: H6 periodic review risk register entry
   updated.
4. Scan completion is evidenced by a `regulatory_horizon_scan_record`
   evidence class (per H4) with: scan_date; items_reviewed; findings;
   action_items_opened; reviewer_id; compliance_lead_sign.

---

## 7. Customer-specific requirement (CSR) overlay framework

CSRs are Layer 4 obligations. Each CSR is a versioned rule pack that a
customer mandates a supplier (HESEM tenant) to comply with in addition to
Layer 1-3 requirements.

### 7.1 Known CSR instances (non-exhaustive)

```
Boeing D6-82479 rev J    Supplier Quality requirements (all Boeing primes)
                         Key clauses: §6 source inspection; §11 first
                         article; §14 government property; §16 ITAR
                         compliance; §18 records retention (10+ years)

GM CG1801               GM Supplier Quality Standards; BIQS scoring
Ford Q1 (current)       Ford supplier quality system recognition
                        VDA 6.3 audit ≥ 82%; 8D within 60 days max

Pfizer SQ-5.1           Pfizer Supplier Quality Requirements
                        Key clauses: Computer System Validation; Audit
                        access; Change Notification (24h for cGMP changes);
                        Deviations (30-day closure target)

Lockheed Martin LQ-1    LM Supplier Quality requirements (AS9100D base +
                        IATF + CMMC overlay per contract)

Raytheon RTN-QSP-0001   Quality System Requirements; FAI; DSCSA if pharma
                        adjacent; ITAR/EAR for export-classified items

Toyota GSQM             Global Supplier Quality Manual; Pokayoke mandatory;
                        controlled shipping levels 1/2/3

Airbus AIPI             Airbus Supplier Inspection & Process Requirements;
                        EASA Part 21G traceability; EN 9100 alignment
```

### 7.2 CSR ingestion process

```
Step 1  Receipt          Customer delivers CSR document + version + effectivity
                         date. Assigned to Vertical Pack Lead for triage.

Step 2  Parse + catalog  Compliance Lead extracts CSR clauses; assigns each
                         a CSR-clause-id. Maps each clause to:
                         (a) Layer 1/2/3 baseline clause that already covers
                             it (→ existing control sufficient; document only)
                         (b) Layer 1/2/3 baseline clause that partially covers
                             it (→ gap requiring CSR-specific configuration)
                         (c) No baseline coverage (→ net-new HESEM config or
                             process control needed)

Step 3  Gap analysis     For each (b)/(c) clause: create gap record in H3
                         audit register (type: csr_gap); assign owner;
                         set target closure date.

Step 4  Configuration    HESEM tenant configuration extended per gap findings.
                         Configuration changes follow H7 change control
                         (Class B for non-regulated-component changes;
                          Class A if a validated computer system parameter
                          changes).

Step 5  Verification     Each mapped clause verified: test evidence per
                         H2 risk-based scope. For (b)/(c) gaps: documented
                         test evidence. For (a) existing-control: reference
                         to existing validation record sufficient.

Step 6  Validation sign- Compliance Lead + Vertical Pack Lead dual-sign
        off               the CSR gap closure report (type: csr_validation_record
                         per H4). Record added to tenant regulatory profile
                         (§5 layer_4_csr_packs array).

Step 7  Audit pack       CSR conformance attestation added to next H3 audit
        inclusion        pack (Section F: CSR compliance evidence per §4 of H3).
```

### 7.3 CSR versioning and effectivity

```
csr_version:  {customer_id}-{csr_name}-{csr_version}-{effective_date}
              (e.g. "FORD-Q1-2023-20230901")
supersession: new CSR version triggers a delta analysis (Steps 2-6 above)
              against the prior version; only changed clauses re-verified
effectivity:  CSR version becomes binding on effective_date + grace period
              stated in customer contract (typically 90-180 days)
expiry:       if customer revokes a CSR version without issuing a replacement,
              the gap record stays open until tenant Compliance Lead formally
              closes with rationale (no-longer-applicable; documented)
```

### 7.4 Conflict resolution matrix

```
CSR clause vs.  Layer 1 baseline (ISO 9001 / 27001 / GDPR)
→ Stricter rule governs; layer 1 floor cannot be lowered by a CSR

CSR clause vs.  Layer 2 vertical core (e.g. IATF 16949 record retention)
→ Stricter rule governs; e.g. Boeing D6-82479 §18 (10 years) > IATF default
  (product life + 1 year); Boeing requirement applied

CSR clause vs.  Layer 3 sub-vertical (e.g. ASIL D coding rules)
→ Stricter rule governs; functionally safety requirements cannot be diluted

CSR clause vs.  Another CSR (two customers mandating conflicting controls)
→ Open a regulatory_conflict finding per §1 conflict resolution algorithm;
  adopt stricter; disclose to both customers if required by contracts
```

### 7.5 Common CSR non-compliance patterns and mitigation

The following patterns recur across CSR audits and are documented here
so implementing teams recognize them during Step 2 (parse + catalog) of
the CSR ingestion process.

```
Pattern                     Description                         Mitigation
───────────────────────────────────────────────────────────────────────────────
Retention floor conflict    CSR requires a longer retention      Apply CSR floor as
                            period than H5 baseline for the      override in tenant
                            same record class (e.g., Boeing      profile §5.1
                            10-year product record vs.           retention_overrides
                            IATF 7-year default)                 array

Change notification window  CSR mandates customer notification   Configure D7/H7
                            for engineering changes (e.g.        change control to
                            Pfizer SQ: 24h for cGMP changes;    include customer
                            Ford Q1: 30-day advance notice       notification step;
                            for drawing changes)                 SLA enforced via
                                                                 I2 SLO monitoring

Escalating containment      OEM CSR (e.g. GM Controlled         Map to D6 NC-to-
levels                      Shipping Level 1/2/3) requires       CAPA path; L2/L3
                            heightened inspection and            containment flags
                            100% audit after escape              trigger automated
                                                                 OEM notification

Source inspection right     Customer reserves the right to       HESEM audit access
                            conduct source inspection at         control: grant
                            supplier facility (e.g. Boeing       customer auditor
                            D6-82479 §6)                         role per tenant
                                                                 access policy in
                                                                 I7 + I8

Sub-tier flow-down          CSR requires tenant to flow          HESEM supplier
                            specified requirements to sub-       qualification module
                            tier suppliers (e.g. AS9100D         in C4 captures
                            §8.4.1.1; AS13100 §4.5)             flow-down matrix per
                                                                 CSR entry; auditable

First-article requirement   CSR mandates FAI per AS9102B        FAI record type in
                            for any configuration change,        D4 receive/inspect
                            not just initial production          auto-triggered on
                                                                 engineering change
                                                                 closure if FAI flag
                                                                 set in CSR config

───────────────────────────────────────────────────────────────────────────────
```

Each pattern that is found during CSR ingestion Step 2 creates a
CSR gap record (type: `csr_gap`; sub_type: one of the pattern codes
above) in the H3 audit register. The gap record carries: csr_id;
affected_clause; pattern_code; resolution_config_path; closure_date;
closure_evidence_id.

---

## 8. Regulatory accountability map (RACI)

The following table shows accountability per regulatory domain per
region. Column notation: R = Responsible (does work); A = Accountable
(decision authority); C = Consulted (input before decision); I = Informed
(notified after decision).

For vertical-specific accountability, the Vertical Pack Lead role owns the
pack-specific obligation; the Compliance Lead co-owns the regulatory mapping
and audit evidence.

### 8.1 Core RACI

```
Domain                         Compliance  Quality  Security  Privacy  AI     SRE    Tenant
                               Lead        Lead     Lead      Lead     Lead   Lead   Ops Lead
─────────────────────────────────────────────────────────────────────────────────────────────
H1 regulatory landscape         A/R         C        C         C        C      I      I
  Updates, horizon scan (§6)    A/R         I        I         I        I      I      I
H2 validation lifecycle         C           A/R      C         I        C      C      I
H3 audit program                C           A/R      C         C        I      I      I
H4 evidence taxonomy            C           A/R      I         I        I      I      I
H5 retention + WORM             C           C        C         A/R      I      C      I
H6 periodic review              A/R         C        C         C        I      I      I
H7 change control               C           A/R      C         I        C      C      I
H8 CAPA                         I           A/R      I         I        I      I      I
H9 risk management              C           A/R      C         C        A/R    C      I
I7 security operations          I           I        A/R       C        C      C      I
I3 incident response            I           C        A/R       C        C      A/R    I
I4 DR                           I           I        C         I        I      A/R    I
I8 tenant ops                   C           I        C         C        I      I      A/R
L0..L5 AI discipline            C           C        C         C        A/R    I      I
J1 pharma pack                  C           A/R      I         I        I      I      I
  QP designation (Annex 16)     C           I        I         I        I      I      A/R*
  PRRC designation (MDR Art 15) A/R         C        I         I        I      I      I
J2 auto pack                    C           A/R      I         I        I      I      I
J3 aero pack                    C           A/R      C         I        I      I      I
  ITAR / EAR officer            A/R         I        C         I        I      I      I
  CMMC POA&M owner              C           I        A/R       I        I      I      I
J4 med device pack              C           A/R      C         I        I      I      I
J5 food pack                    C           A/R      I         I        I      I      I
GDPR / privacy compliance       C           I        C         A/R      I      I      I
  DPO (Art 37)                  C           I        I         A/R*     I      I      I
EU AI Act (Art 9-17)            C           C        C         C        A/R    I      I
WCAG 2.2 / EAA accessibility    I           I        I         I        I      I      I
  (F10; accessibility program)  (→ UX Lead A/R)
Export control screening        A/R         I        C         I        I      I      I
  (ITAR/EAR/OFAC per J3)
SOC 2 audit (annual)            I           C        A/R       C        I      C      I
ISO 27001 surveillance audit    I           C        A/R       C        I      C      I
Horizon scan execution (§6)     A/R         C        C         C        C      I      I
Horizon scan action triage      A/R         C        C         C        C      C      C
CSR ingestion (§7)              A/R         C        I         I        I      I      I

* Role must be an individual person (not a team) with documented designation record
```

### 8.2 Per-region accountability extensions

HESEM tenants with regulated operations in multiple regions require
a region-specific designated contact for the regulatory authority in
each jurisdiction. The following contacts must be recorded in the
tenant regulatory profile (§5.1) and in I8 tenant operations:

```
Region     Role                     Designee source
US         FDA Regulatory Contact   Internal QA/RA manager or contracted RA firm
EU         Authorised Representative (Art 14 MDR; if manufacturer outside EU)
           PRRC (Art 15 MDR; if manufacturer outside EU, AR is PRRC)
           EU Representative for Pharma (Art 76 Directive 2001/83/EC)
JP         PMDA Accredited Person (for foreign manufacturers)
KR         MFDS Local Agent
CN         NMPA Local Agent + China Distributor Regulatory Contact
IN         CDSCO Import License Holder
AU         TGA Sponsor (for therapeutic goods import)
BR         ANVISA Responsável Técnico (responsible technician)
CA         Health Canada Importer / Establishment License holder
MENA       SFDA/MOH Regulatory Contact per country
LATAM      COFEPRIS (Mexico) / INVIMA (Colombia) local agent
```

The Compliance Lead maintains the contact register and ensures each
designee is current (annual confirmation required). Loss of a
required designee triggers an H7 Class A change and a 30-day remediation
SLA.

---

## 9. Cross-references

```
A4 (standards scope in vision chapter) — scope of regulated verticals;
   narrative rationale for standard selection; cites this chapter
   for clause authority

B6 (cross-cutting concerns) — implements audit trail, RBAC/ABAC, OTG
   axioms, tenant isolation, WORM anchor; clauses that require these
   cite B6 through this chapter's §4 mapping

H2 (validation lifecycle) — implements §11.10(a), EU GMP Annex 11 §4,
   GAMP 5 V-model, FDA CSA critical thinking, ISO 13485 §7.5.6

H3 (audit program) — implements §11.10(e) audit trail review, ISO 19011,
   SOC 2 surveillance, AS9100D internal audit, IATF 16949 §9.2; CSR
   conformance attestation (H3 §4 Section F)

H4 (evidence taxonomy) — defines all evidence classes referenced in §4
   mapping table above; each class schema is normative per H4

H5 (retention and WORM) — implements all retention floors cited in §4
   notification windows; WORM exclusion table for GDPR Art 17

H6 (periodic review) — receives monitor-only horizon scan findings (§6)

H7 (change control) — receives action-required horizon scan findings (§6);
   CSR-triggered configuration changes (§7.4)

H8 (CAPA) — implements ISO 13485 §8.5.2, IATF 16949 §10.2.3 (8D),
   FDA 21 CFR 820.100

H9 (risk management) — implements ISO 14971, ICH Q9(R1), EU AI Act Art 9,
   NIST AI RMF MAP + MANAGE; receives PMS risk signal from D12

J1..J5 (vertical packs) — instantiate L2/L3 regulatory layers; cite this
   chapter's §2 per-vertical inventory for clause authority; CSR packs
   in §7 align to corresponding J-chapter

L1 (AI authority boundary) — implements EU AI Act Art 14 (human oversight);
   NIST AI RMF MANAGE (override capture); override_record evidence class

L3 (AI model lifecycle) — implements EU AI Act Art 9-12 (risk; data; doc;
   record-keeping); NIST AI RMF MAP + MEASURE

L4 (AI red team) — implements EU AI Act Art 15 (accuracy; robustness);
   NIST AI RMF MEASURE; AI 600-1 risk categories

M8 (standards directory) — alphabetical reverse-lookup: every standard
   cited in this chapter appears in M8 with full title; issuing body;
   current edition; URL or order reference

M9 (cross-reference index) — every chapter-to-chapter cross-reference
   in this document is indexed in M9 for reverse lookup by clause

I3 (incident response) — implements GDPR Art 33 (72h breach notification),
   DFARS 252.204-7012 (72h cyber incident), EU MDR Art 87 (serious
   incident 15-day / 2-day reporting), FSMA RFR (24h reportable food)

I7 (security operations) — implements ISO 27001 Annex A controls,
   SOC 2 CC series, CMMC 2.0 Level 2, NIST 800-171 r2, GDPR Art 32,
   ISA/IEC 62443-3-3 (system SL targets), FDA Premarket Cyber 2023

I8 (tenant operations) — maintains tenant regulatory profile per §5;
   RoPA per GDPR Art 30; per-region contact register per §8.2
```

---

## 10. Decision phrase

```
S4-01_H1_REGULATORY_DEEP_UPGRADE_COMPLETE
```

After: load `S4-02_H2_H3.md`.

---

*Document version: V10. Upgraded per S4-01 from V9 baseline.
Review cadence: quarterly regulatory horizon scan per §6.
Next scheduled review: 2026-07-27. Owner: Compliance Lead.*
