# J4 — Medical Device Vertical Pack

```
pack_id:        Medical Device
owner_role:     Med Device Lead with Compliance Lead, PRRC
wave_target:    W10 (preview); W11 GA
sources:        21 CFR Part 820 (transitioning to QMSR per 2024 final
                rule, full effect 2026), 21 CFR Part 803, 821, 830,
                EU MDR 2017/745, EU IVDR 2017/746, ISO 13485:2016,
                ISO 14971:2019 + ISO/TR 24971, ISO 14155:2020,
                ISO 10993 series, ISO 11607, IEC 62304:2006+A1:2015,
                IEC 82304-1, IEC 81001-5-1, IEC 62366-1:2015,
                IMDRF SaMD framework, FDA Premarket Cyber 2023,
                FDA AI/ML SaMD Action Plan, EU MDCG guidances,
                ISO/IEC 27799 (health PII), HL7 FHIR (where IVD)
```

The Med Device pack carries the strictest patient-impact discipline,
the deepest software-as-medical-device risk model, post-market
surveillance feedback, and the most regulator-sensitive vigilance
reporting windows. The pack scales across class I (low) through
class III (highest, e.g. implantable cardiac) with risk-proportional
controls.

---

## 1. Pack scope and class taxonomy

```
EU CLASS           SCOPE                                  PACK FOCUS
Class I             non-invasive, low risk                 self-declaration;
                                                            technical file
Class IIa           medium risk; short term                 NB sample audit
Class IIb           medium-high; longer term                NB design dossier
Class III           high risk; implantable / sustaining     full design exam +
                                                            clinical eval
US CLASS
Class I             general controls                       510(k)-exempt mostly
Class II            special controls                       510(k)
Class III           PMA + extensive clinical                PMA
SaMD CATEGORY (IMDRF)
A-D                 by significance × healthcare situation   risk-prop validation
IVD CLASSES (EU IVDR)
A-D                 by performance + risk                    NB scope
SUB-VERTICALS
Active implantable                                          Class III heavy
SaMD (software as medical device)                           IEC 62304 + IMDRF
SiMD (software in medical device)                           IEC 62304 + parent
Active diagnostic                                            IVDR
Sterile single-use                                           ISO 11607 packaging
Combination product (drug-device)                            21 CFR Part 4
Custom-made                                                   per MDR Art 52 §8
Class III Implant (Annex VIII Rule 8)                        15-year retention
                                                            specific
```

---

## 2. Authoritative roots (new in pack)

```
DHF (Design History File)              per device family / variant
DHR (Device History Record)             per device unit (or batch where allowed)
DMR (Device Master Record)              per device family
UDI (Unique Device Identifier)         per device-id × per production-id
                                        per ISO/IEC 15459
GUDID (US) / EUDAMED (EU) submission   per device
Vigilance Report (US MDR / EU MIR)     per incident / serious incident
PSUR (Periodic Safety Update Report)    per device (high-risk)
PMS Plan + PMS Report                    per device
PMCF / PMPF                              per device (clinical follow-up;
                                        EU MDR Art 83 / IVDR Art 70)
Risk Management File (ISO 14971)         per device
Risk Management Plan                     per device
Risk Management Report                    per device
Risk Acceptability Policy                 tenant-level (per H1 §5)
IFU (Instructions for Use)                per device × per language
Labelling Master                          per device
Clinical Evaluation Report (CER)          per device
Clinical Investigation Plan (CIP)         per study
Software Configuration Item               per software item × IEC 62304 class
SOUP / OTSS Register                      per device's third-party software
SBOM                                      per software release
Cyber Risk Management Plan                per device (FDA cyber + IEC 81001-5-1)
Verification + Validation Evidence         per requirement / per protocol
Design Input + Design Output               linked DHF artifacts
Design Review                              per stage
Design Verification                        per requirement
Design Validation                          summative
Design Transfer Record                      design → production
Production Process Validation               per process
Process Performance Qualification           per process
Special Process Validation                  e.g. sterilization, packaging
Sterilization Validation                    per ISO 11135 (EO) / 11137 (radn)
                                            / 17665 (steam)
Packaging Validation                        per ISO 11607
Biocompatibility Evaluation                  per ISO 10993
Usability Engineering File (UEF)             per IEC 62366
Service Record                                per device × per service event
Customer Complaint                            per customer × per device
Field Safety Corrective Action (FSCA)        per action × affected fleet
Field Safety Notice (FSN)                     per FSCA
Notified Body Engagement                       per cycle
PRRC (Person Responsible for                  per tenant
   Regulatory Compliance) Record
Authorized Representative Record               EU AR per tenant
Importer / Distributor Record                  EU economic operators
```

---

## 3. State machines (pack-specific)

```
SM-DHF (Design History File)
  initiated → planning → designing → verifying → validating →
  transferring → maintaining → retired
  Hard couplings: SM-7 doc; SM-INSP for verification;
                  ISO 14971 risk file linked at each stage

SM-DHR (Device History Record)
  per-device-unit: opened → manufactured → tested → packaged →
  released → distributed → in-service → retired
  21 CFR 820.184 elements: dates of manufacture, quantity, primary
  identification label, acceptance records

SM-VIGILANCE
  intake → triage → seriousness-assess → reportability-decide →
  submitted → followed-up → trend-eval → closed
  Hard couplings: H1 §3 windows (24h death, 30d serious)
  Branches: serious-incident; serious-public-health; near-miss
  EU MDR vigilance + US MDR

SM-PSUR
  per period: data-collection → trending → benefit-risk-update →
  drafted → reviewed → submitted → reviewed-by-NB
  Cycle: high-risk annually; lower 2-year

SM-CYBER (FDA cyber + IEC 81001-5-1)
  threat-model → control-design → SBOM → vulnerability-monitor →
  patch → CVD (Coordinated Vulnerability Disclosure) lifecycle
  Hard couplings: FDA Premarket Cyber + Postmarket Cyber

SM-SAMD (IEC 62304 software lifecycle)
  per software class A/B/C: planning → req → arch → detail-design →
  unit → integration → system → release → maintenance
  IEC 62304 hazardous-situation analysis

SM-FSCA (Field Safety Corrective Action)
  identified → planned → notified → executed → effectiveness →
  closed
  Hard couplings: FSN + recall (per H1 §3 + D12)

SM-CLIN (Clinical Evaluation)
  planned → conducting → analyzing → drafting CER → reviewed →
  approved → updated (cycle)
  Hard couplings: PMS data feedback
```

---

## 4. Per-pack workflows

```
D1 Order to Cash       UDI placed at shipment; serialized
                       handoff
D2 Procurement to Pay   biocompatible material qualification
                       (ISO 10993); single-use per ISO 11607
D3 Plan to Produce      DHF effective + UDI plan in place
D4 Receive to Inspect    incoming spec per ISO 13485
D5 Inspect to Disposition  segregate non-conforming;
                       NC may trigger DHF impact
D6 NC to CAPA           CAPA + design-feedback to risk file
                       (post-market loop)
D7 Document to Release   DHF / DMR / IFU effectivity;
                       label master version
D8 Train to Qualify      device-specific operator training;
                       cleanroom personnel where applic
D9 Maintain to Restore   service of in-field devices;
                       calibration of test equipment
D10 Batch to Release      DHR completion gate; UDI applied;
                       PRRC sign-off (EU MDR);
                       qualified person where applic
D11 Release to Trace      UDI traceability + GUDID / EUDAMED
                       submitted; lot → device unit
D12 Complaint to Recall    FSCA / FSN lifecycle; recall;
                       vigilance reporting
D13 Audit to Remediate    NB surveillance + FDA inspection;
                       MDSAP (where applicable)
D14 Validate to Qualify   special process validation;
                       sterilization + packaging;
                       cleanroom; software (IEC 62304)
DHF Cycle (pack)         design control lifecycle
PSUR Cycle (pack)        per period
PMS Cycle (pack)         continuous; feeds risk file + CER
PMCF Cycle (pack)        clinical follow-up per MDR
Vigilance Cycle (pack)   per incident
Cyber Cycle (pack)       per CVE / KEV; per CVD
FSCA Cycle (pack)        per action
SaMD Cycle (pack)        IEC 62304 lifecycle
Risk File Cycle (pack)   continuous per ISO 14971
```

---

## 5. APIs (pack-specific)

```
DHF lifecycle API                     E3 + E7
DHR API                                E3 + E5 + E7 (PRRC sign-off)
DMR API                                E3 + E7
UDI generator                          E3 + E13
GUDID / EUDAMED submission API         E15 (FDA / EU)
Vigilance reportability API             E3 + E15 (MIR / MDR)
PSUR generation API                     E13 + E5
Risk file engine API                    E3 + E5
Risk control verification API            E3
Clinical evaluation API                  E3 + E5
PMS data ingestion                        E15 (sources: complaints,
                                         literature, social, registry)
PMCF / PMPF API                            E3
SaMD / IEC 62304 lifecycle API             E3
SOUP / OTSS register API                    E3 + E15 (CVE / KEV feed)
SBOM management                              E3 + E15
Cyber CVD lifecycle API                       E3 + E15
FSCA / FSN lifecycle API                       E3 + E15
NB engagement API                              E15
PRRC + AR + Importer + Distributor records    E3
Special process validation API                  E3 + E13 (long-running)
Sterilization validation API                    E3
Packaging validation API                        E3
Biocompatibility evaluation API                 E3
Usability engineering file API                  E3
```

---

## 6. UI surfaces

```
DHF Workspace + AR Shell             stage-by-stage; design input/
                                     output linkage; design review
                                     panels; risk traceability
DHR Workspace                         per-unit assembly; UDI capture;
                                     acceptance test linkage
DMR Workspace                         master record per family
UDI Generation Workspace              issuing-agency selection (GS1
                                     / HIBCC / ICCBBA); production-id
                                     management
Vigilance Report Workspace            intake; reportability decision
                                     (BD-15 advisory by AI-19);
                                     submission per regulator
PSUR Workspace                         period definition; data
                                     ingestion; benefit-risk;
                                     drafting (AI-21 advisory)
Risk File Workspace                    severity × probability matrix;
                                     ISO 14971 v2019 acceptability
                                     framework; risk control linkage;
                                     residual evaluation
PMS / PMCF Workspace                   data sources; trending;
                                     feedback to risk file + CER
Clinical Evaluation Workspace          CER drafting (AI-21 advisory);
                                     literature search; clinical
                                     investigation linkage
SaMD / IEC 62304 Workspace              software class A/B/C; lifecycle
                                     stages; hazardous situations
Cyber Workspace                          SBOM; SOUP register; CVE
                                     monitoring; CVD lifecycle;
                                     patch tracking
FSCA / FSN Workspace                     action planning; affected
                                     fleet identification;
                                     notification drafting
NB Engagement Workspace                  per cycle; submission tracking;
                                     audit findings + responses
Med Device Audit Pack Wizard             FDA / NB inspection-ready;
                                     MDSAP if applic
PRRC Console                              per-tenant; their decisions
                                     (BD-15) aggregated
Usability Engineering Workspace            per IEC 62366; user research;
                                     formative + summative testing
```

---

## 7. Pack discipline

```
ISO 14971:2019 risk acceptability      tenant-level policy; matrix
   policy                                applied uniformly across
                                       device portfolio
PRRC sign-off (EU MDR Art 15)            mandatory at vigilance,
                                       reportability, FSCA, batch
                                       release per protocol
21 CFR Part 11 e-signature                 on all regulated transitions
US MDR 30-day window                       per H1 §3
EU MDR vigilance windows                    24h death; 2 days serious-
                                       public-health; 15 days
                                       serious incident
UDI / GUDID / EUDAMED                       at first market placement
PSUR cadence per risk class                 high-risk annual; lower 2-yr
PMS feedback loop                            mandatory; demonstrable in
                                       audit
Cybersecurity (FDA + IEC 81001-5-1)         premarket cyber + postmarket
                                       cyber + CVD process
Class III implant 15-year retention          per Annex IX Rule 8
SaMD risk discipline                          IMDRF Class A-D drives
                                       validation depth + cyber +
                                       AI/ML PCCP if applicable
Sterilization validation cycle                ISO 11135 / 11137 / 17665
                                       per process; revalidation
                                       cycle
Packaging validation                          ISO 11607 per package
                                       system
Biocompatibility evaluation                    ISO 10993 cycle per
                                       contact path
Usability engineering                          IEC 62366 cycle per device
                                       + risk-driven validation
Notified Body engagement                       per cycle (typ 5-year for
                                       cert)
Authorized Representative + Importer           per economic operator;
   + Distributor records                       traceability
MDSAP (where applicable)                       single audit for multi-
                                       jurisdiction
2-person e-sig on PRRC decisions               per BD-13..BD-16
Clinical evaluation update                      per significant data
                                       change
```

---

## 8. Pack KPIs

```
- Vigilance reporting SLA adherence
- PSUR cycle adherence
- DHF maintenance currency
- UDI submission completeness
- PMS coverage per device
- PMCF / PMPF data sufficiency
- Cyber vulnerability time-to-patch
- SBOM currency
- FSCA effectiveness
- Notified Body audit findings
- MDSAP audit findings (where applic)
- Class III implant 15-yr retention attestation
- Sterilization cycle re-val adherence
- Packaging cycle re-val adherence
- Risk file currency
- Customer complaint trend
- Recall avoidance evidence
```

---

## 9. Audit pack contents (MD-specific addition to H3 §4)

```
- DHF + DMR per device family (sample)
- DHR per device unit (sample selected by inspector)
- Risk Management File per device
- Validation evidence per process + special process (sterilization,
  packaging, biocompatibility)
- Vigilance report log + responses
- UDI submission records (GUDID / EUDAMED)
- Notified Body audit records + responses
- Internal audit records
- CAPA log
- Training records (device-specific)
- Clinical Evaluation Report (CER) per device
- PMS plan + reports
- PMCF / PMPF per device
- PSUR per high-risk device
- SaMD evidence per IEC 62304 (software-heavy)
- Cyber posture: SBOM, SOUP, CVE monitoring, CVD lifecycle
- FSCA + FSN log
- PRRC decisions log (per BD-13..BD-16)
- AR / Importer / Distributor records
- MDSAP audit (if applic)
- Sterilization cycle validation
- Packaging validation per ISO 11607
- Usability evidence per IEC 62366
- Biocompatibility per ISO 10993
- Class III 15-year retention attestation (per Annex IX Rule 8)
```

---

## 10. Failure modes

```
FM1   Vigilance reporting window missed
      Recovery: SEV-1; per H1 §3; regulator awareness;
              H8 systemic CAPA on intake → submission flow

FM2   PSUR submission late
      Recovery: NB engagement; cert at risk; H8 + customer notice

FM3   UDI not assigned at first market placement
      Recovery: market hold; back-fill; H8 systemic

FM4   PMS data not fed into risk file
      Recovery: regulatory finding; H6 surfaced gap; H8 CAPA on
              feedback loop

FM5   Cyber vulnerability unpatched beyond window
      Recovery: per FDA postmarket cyber; CVD; FSN if applic; H8
              CAPA

FM6   Class III implant retention shorter than Annex IX Rule 8
      Recovery: H5 retention floor enforced; H7 governance;
              SEV-1 if any record at risk

FM7   PRRC signature absent on reportability decision
      Recovery: B6 axiom; submission blocked; H8 CAPA on UI

FM8   AI-19 false-negative on serious incident
      Recovery: per L4; SEV-2+ depending on impact;
              advisory hidden until fix; H8 CAPA on AI feature

FM9   Sterilization cycle revalidation overdue
      Recovery: production blocked; cycle revalidation; H8 CAPA

FM10  IEC 62304 SOUP register stale
      Recovery: cyber posture review; per H6; H8 CAPA on update
              discipline
```

---

## 11. Cross-references

- H1 §2.2 — Med Device regulatory inventory
- H2 — validation incl. sterilization + packaging + software
- H4 — DHF / DHR / vigilance / PSUR / FSCA classes
- H5 — Class III 15-year retention
- H8 — CAPA fed by vigilance + complaint
- H9 — ISO 14971 risk file
- L1 — banned decisions BD-13..BD-16 (MD extension)
- L2 — AI features overlay (AI-19 vigilance, AI-21 PSUR drafting)
- L3 — PCCP (Predetermined Change Control Plan) for AI/ML SaMD
- L4 — red-team for vigilance reportability AI
- D12 — complaint to recall (FSCA path)
- D14 — validation per IEC 62304 + ISO 11607 + ISO 11135 etc.
- E15 — GUDID / EUDAMED / FDA / NB integrations
- I7 — cyber per FDA + IEC 81001-5-1
- I8 — economic operator + multi-region
- M3 — root catalog includes MD-specific roots
- M9 — cross-reference

---

## 12. Decision phrase

```
J4_MEDICAL_DEVICE_BASELINE_LOCKED
NEXT: J5_FOOD.md
```
