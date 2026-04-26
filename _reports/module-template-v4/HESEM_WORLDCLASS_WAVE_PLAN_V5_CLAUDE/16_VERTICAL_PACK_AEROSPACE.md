# 16_VERTICAL_PACK_AEROSPACE.md

## Purpose

V5 vertical packs cover Pharma (file 14) and Automotive (file 15). This file covers aerospace and defense.

Standards:

- AS9100D (aerospace QMS, 2016)
- AS9101F (auditing aerospace QMS)
- AS9102B / Rev C (First Article Inspection, FAI)
- AS9110D (aerospace MRO maintenance)
- AS9120B (aerospace distributors)
- AS9145 (APQP / PPAP for aerospace)
- AS13100 (aero engine supply chain)
- NADCAP (National Aerospace and Defense Contractors Accreditation Program)
  - AC7004 (NDT), AC7108 (chemical processing), AC7110 (electronics),
    AC7114 (composites), AC7117 (welding), AC7121 (heat treating), etc.
- DFARS / NIST SP 800-171 / CMMC 2.0 (US DoD cyber)
- ITAR (International Traffic in Arms Regulations)
- EAR (Export Administration Regulations)
- 14 CFR Part 21 (FAA certification)
- 14 CFR Part 145 (FAA repair stations)
- EASA Part 21G/J (EU certification)
- DO-178C (aviation software)
- DO-254 (aviation hardware)
- ARP 4754A (aviation systems development)
- ARP 4761 (safety assessment)
- AS5553 (counterfeit electronic parts avoidance)
- AS6174 (counterfeit materiel avoidance)
- MIL-STD-1916 (DoD inspection sampling)

---

## Section 1 — Aerospace-specific data model

### 1.1 New authoritative roots

```text
AS9102_FAI         First Article Inspection (Form 1, 2, 3 per AS9102 Rev C)
NADCAP_CERT        NADCAP special process accreditation
COUNTERFEIT_CHECK  Counterfeit-parts detection record (AS5553/AS6174)
DPDR               Design Prevention Detection Record (FAA-required for safety-critical)
NCR_CRITICAL       Critical NC requiring CAR (Corrective Action Request)
ITAR_CONTROL       Export-controlled item registration
CMMC_ASSESSMENT    CMMC compliance assessment record
SOFTWARE_CONFIG_CONTROL  software config item per DO-178C
HARDWARE_CONFIG_CONTROL  hardware config item per DO-254
SAFETY_CASE        ARP 4754A / 4761 safety case
MRO_ENGINE_RECORD  engine maintenance record (Part 145)
SERVICE_LIFE_RECORD service-life-limited part history
QPL                Qualified Products List entry
QML                Qualified Manufacturers List entry
```

### 1.2 Edges

```text
AS9102_FAI —CERTIFIES→ ITEM (first article approved)
NADCAP_CERT —CERTIFIES→ EQUIPMENT, SPECIAL_PROCESS
COUNTERFEIT_CHECK —VERIFIES→ LOT (incoming)
DPDR —ANALYZES→ failure mode (per FAA design prevention)
ITAR_CONTROL —SCOPES→ ITEM, CDOC, DRAWING
CMMC_ASSESSMENT —COVERS→ HESEM tenant
MRO_ENGINE_RECORD —GENEALOGY→ component LRUs (line replaceable units)
SERVICE_LIFE_RECORD —TRACKS→ part across installations
```

V5 ADR-0251: Aerospace vertical pack new roots + edges.

---

## Section 2 — AS9102 Rev C FAI

### 2.1 FAI requirement

For each new part design, design change, or process change, perform FAI:

```text
- 100% feature inspection of first article
- Form 1: Part Number Accountability
- Form 2: Product Accountability  
- Form 3: Characteristic Accountability
```

### 2.2 Implementation

```text
AS9102_FAI:
  fai_id, part_number, drawing_revision, change_reason, 
  performed_at, performed_by, approved_by, approved_at,
  features[]: array of {
    characteristic_id, drawing_zone, nominal, tolerance, 
    measurement_value, conformance, gage_id, evidence_uri
  },
  forms_pdf_uri  (auto-generated AS9102 forms, signed)
```

### 2.3 Bubble drawing

V5 generates bubbled inspection drawings from CAD via integration:

```text
- imports STEP / IGES / native CAD
- annotates dimensions with bubble numbers
- exports to FAI Form 3
- one bubble per characteristic
```

V5 ADR-0252: AS9102 Rev C FAI generator + bubble-drawing integration.

---

## Section 3 — NADCAP special process accreditation

### 3.1 NADCAP scope

NADCAP-accredited special processes:

```text
NDT (Non-Destructive Testing): UT, RT, MT, PT, ET, VT
Heat Treating
Chemical Processing (anodize, plate, paint)
Welding
Brazing
Composites
Sealants
Materials Testing Lab
Coatings
Aerospace Quality Systems (general)
Electronics
Surface Enhancement
Conventional Machining (selected)
Non-Conventional Machining (EDM, ECM)
Heat Treating (selected commodity-specific)
Aerospace Distributors
```

### 3.2 Implementation

```text
NADCAP_CERT:
  cert_id, process_code (e.g., AC7114), accreditation_date, 
  expiration_date, scope_description, audit_findings[], 
  major_finding_count, minor_finding_count, status, certificate_uri

edges:
  NADCAP_CERT —CERTIFIES→ EQUIPMENT (or PROCESS)
  NADCAP_CERT —SUPERSEDED_BY→ NADCAP_CERT (new cycle)
```

### 3.3 Re-accreditation cadence

NADCAP cycle is typically 2-year for general; some commodities differ. V5 alerts 90 days before expiration.

V5 ADR-0253: NADCAP cert tracking + re-accreditation alerts.

---

## Section 4 — Counterfeit-parts avoidance (AS5553 / AS6174)

### 4.1 Detection requirements

For incoming materials and electronic parts:

```text
- supplier vetting (qualified supplier list per QPL/QML)
- traceability documentation (full chain custody)
- incoming inspection (visual, dimensional, electrical, X-ray)
- sample destructive testing (selected)
- counterfeit mitigation plan
- CMU (Counterfeit Mitigation per Unit) for high-risk
```

### 4.2 Implementation

```text
COUNTERFEIT_CHECK:
  check_id, lot_id, supplier_id, check_methods[], 
  external_lab_results, conclusion (accepted, rejected, suspect),
  evidence_uris[]

edges:
  COUNTERFEIT_CHECK —VERIFIES→ LOT
  COUNTERFEIT_CHECK —REJECTS→ LOT (if counterfeit confirmed)
  COUNTERFEIT_CHECK —TRIGGERS→ NC, SCAR (if rejected)
```

### 4.3 GIDEP (Government-Industry Data Exchange Program)

For US government contracts, submit suspect counterfeit reports to GIDEP within 60 days.

V5 ADR-0254: Counterfeit-parts workflow + GIDEP reporting integration.

---

## Section 5 — DFARS / NIST 800-171 / CMMC 2.0

### 5.1 CMMC 2.0 levels

```text
Level 1: Foundational (basic cyber hygiene; 17 NIST 800-171 controls)
Level 2: Advanced (NIST 800-171 + 110 controls)
Level 3: Expert (NIST 800-172 + advanced)
```

### 5.2 HESEM contribution

V5 produces evidence for CMMC controls that overlap with platform substrate:

```text
3.1.x  Access control                    → L1 + RBAC + MFA evidence
3.3.x  Audit and accountability          → audit chain + retention
3.4.x  Configuration management          → ECO + change control
3.5.x  Identification and authentication → Keycloak + MFA
3.6.x  Incident response                 → incident management
3.7.x  Maintenance                       → maintenance workflow
3.8.x  Media protection                  → backup + WORM
3.9.x  Personnel security                → training + clearance
3.10.x Physical protection               → out of HESEM scope
3.11.x Risk assessment                   → risk register
3.12.x Security assessment               → audit + monitoring
3.13.x System and communications         → mTLS + segmentation
3.14.x System and information integrity  → audit chain + integrity job
```

V5 ADR-0255: CMMC 2.0 control evidence mapping per HESEM substrate.

### 5.3 Controlled unclassified information (CUI) handling

```text
- CUI marking at field level
- CUI export blocking (no DSAR export of CUI without authorization)
- CUI access logged with reason
- CUI at rest encrypted (FIPS 140-3 validated)
- CUI in transit via TLS 1.3 + FIPS-validated cipher suites
```

V5 ADR-0256: CUI handling rules + per-field marking.

---

## Section 6 — ITAR / Export control

### 6.1 Export-controlled items

```text
ITAR_CONTROL:
  item_id, ECCN (or USML category), classification_date,
  authorized_recipients[], jurisdictions[],
  expiration_date
```

### 6.2 Access control

```text
- ITAR-controlled items access restricted to US persons (per CFR 22 Part 120)
- access denial returns problem-detail 'regulatory.jurisdiction-mismatch'
- access attempts logged + reviewed monthly
- nationality verification at user onboarding (where applicable)
```

V5 ADR-0257: ITAR access control + person-of-record verification.

### 6.3 Cross-border data flow

```text
- ITAR data must not leave authorized jurisdiction
- HESEM cloud deployment per tenant declares jurisdiction
- multi-region deployments verify ITAR-controlled data stays in-region
```

---

## Section 7 — DO-178C software / DO-254 hardware

### 7.1 Design Assurance Levels (DAL)

```text
DAL A: Catastrophic failure condition (e.g., flight control)
DAL B: Hazardous
DAL C: Major
DAL D: Minor
DAL E: No safety effect
```

### 7.2 Implementation per software config item

```text
SOFTWARE_CONFIG_CONTROL:
  sci_id, item_name, version, dal, requirements_doc_uri,
  design_doc_uri, source_code_uri, test_evidence_uri,
  test_coverage_metrics{statement, branch, MCDC},
  formal_methods_used[], certification_credit_claimed
```

### 7.3 Tooling

V5 integrates with aerospace software toolchains:

```text
- DOORS / Polarion for requirements traceability
- LDRA / VectorCAST for test coverage
- MathWorks Polyspace / Coverity for static analysis
- formal-methods tooling for higher DALs (Frama-C, SPARK, etc.)
```

V5 ADR-0258: DO-178C software config control with DAL-aware tooling integration.

---

## Section 8 — Service-life-limited parts

### 8.1 Tracking

```text
SERVICE_LIFE_RECORD:
  part_serial, part_number, install_date, install_aircraft_or_engine,
  installation_zone, removal_date, hours_at_install, cycles_at_install,
  hours_at_removal, cycles_at_removal, condition_at_removal,
  next_inspection_due, life_limit_hours, life_limit_cycles
  
edges:
  SERVICE_LIFE_RECORD —GENEALOGY→ SERVICE_LIFE_RECORD (movement)
  SERVICE_LIFE_RECORD —INSTALLED_ON→ asset (engine, aircraft tail number)
```

### 8.2 Alerts

```text
- 100 hours before life limit → schedule replacement
- 50 cycles before limit → schedule
- inspection due → notify maintenance
```

V5 ADR-0259: Service-life-limited part tracking + lifecycle alerts.

---

## Section 9 — Engine MRO (Part 145)

For engine maintenance, repair, overhaul providers:

```text
MRO_ENGINE_RECORD:
  engine_serial, customer_id, induction_date, work_scope[],
  modules_disassembled[], modules_replaced[], modules_returned_to_service[],
  test_run_results, RTS_certificate_number, return_date

modules treated as authoritative_roots with their own lifecycle
```

V5 ADR-0260: Part 145 engine MRO record + module-level genealogy.

---

## Section 10 — AS9100D conformance evidence

```text
- internal audits (annual + per-clause)
- management review (annual; required minutes + decisions)
- corrective action history (last 24 months)
- preventive action records
- nonconformity treatment records
- customer satisfaction monitoring
- supplier evaluation evidence
- training competence records
- calibration records (current; with traceability)
- design control records (per project)
- production planning records
- product traceability records (genealogy depth bound by safety)
- handling, storage, packaging records
- post-delivery activities (warranty, support)
```

V5 ADR-0261: AS9100D conformance evidence package.

---

## Section 11 — FAA / EASA certification interaction

For type certification + production certification:

```text
- design data submission to FAA (Type Certification)
- production certificate (Part 21G)
- delegation (DAR/DER) records
- conformity inspection records
- service bulletin issuance + tracking
- airworthiness directive compliance tracking
```

V5 ADR-0262: FAA / EASA certification interaction tracking.

---

## Section 12 — Audit pack (NADCAP + AS9100 + customer)

```text
- AS9100D conformance package (Section 10)
- NADCAP audit findings + corrective actions
- per-customer requirements compliance evidence
- counterfeit mitigation plan + recent checks
- ITAR / EAR compliance attestation
- CMMC level certification (if required)
- service bulletin compliance log
- airworthiness directive compliance log
- on-time delivery to customer + escape (defects to customer)
- 5-year traceability per critical part
```

V5 ADR-0263: Aerospace audit pack template.

---

## Section 13 — Performance metrics

```text
on-time delivery:                ≥ 98%
escapes (defects to customer):    < 50 PPM (target)
production yield (FPY):           ≥ 95% per process
cycle time per FAI:               < 40 hours
NCR closure cycle time:           < 30 days
NCR critical (CAR-required):      0 per quarter
counterfeit detection rate:       100% on incoming high-risk
NADCAP audit findings:            < 5 minor; 0 major
AS9100D internal audit:           100% clause coverage annually
```

---

## Section 14 — Cumulative ADRs

```text
ADR-0251  Aerospace vertical pack new roots + edges
ADR-0252  AS9102 Rev C FAI generator + bubble drawing
ADR-0253  NADCAP cert tracking + re-accreditation alerts
ADR-0254  Counterfeit-parts workflow + GIDEP reporting
ADR-0255  CMMC 2.0 control evidence mapping
ADR-0256  CUI handling + per-field marking
ADR-0257  ITAR access control + person-of-record verification
ADR-0258  DO-178C software config control + DAL-aware tooling
ADR-0259  Service-life-limited part tracking + alerts
ADR-0260  Part 145 engine MRO record + module genealogy
ADR-0261  AS9100D conformance evidence package
ADR-0262  FAA/EASA certification interaction tracking
ADR-0263  Aerospace audit pack template
```

---

## Decision phrase

```text
V5_AEROSPACE_VERTICAL_PACK_BASELINE_LOCKED
NEXT_FILE: 17_BUSINESS_AND_ECONOMIC_MODEL.md
```
