# J3 — Aerospace Vertical Pack

```
pack_id:        Aerospace
owner_role:     Aerospace Lead with Compliance Lead
wave_target:    W10 (preview); W11 GA
sources:        AS9100D / AS9101F / AS9102B+C / AS9110D / AS9120B,
                AS9145, AS13100, AS5553 / AS6174, NADCAP series
                (AC7004 + per-process), DO-178C / DO-254 / DO-330,
                ARP 4754A / 4761, MIL-STD-1916, 14 CFR Part 21 +
                Part 145, EASA Part 21G/J + Part 145, DFARS, NIST
                SP 800-171 r2, CMMC 2.0, ITAR (22 CFR 120-130),
                EAR (15 CFR 730-774), GIDEP procedures
```

The Aerospace pack carries the highest design-assurance discipline
(DO-178C DAL A, DO-254 DAL A) plus US export-control overhead
(ITAR/EAR), counterfeit-parts vigilance (AS5553/6174 + GIDEP), and
NADCAP-accredited special processes. The pack ships with US-only
deployment for ITAR-controlled tenants.

---

## 1. Pack scope and sub-vertical

```
SUB-VERTICAL                       ADDS
Civil Airframe / Engine             14 CFR Part 21 + EASA Part 21J / 21G;
                                    AS9100D
Civil MRO                            14 CFR Part 145 + EASA Part 145;
                                    AS9110D
Distributor                          AS9120B (purchasing + traceability)
Defense (US)                          DFARS 252.204-7012 + NIST 800-171 +
                                    CMMC; ITAR / EAR
Defense (NATO)                        per partner-nation requirements
Space (commercial)                    NASA / FAA AST + ECSS where
                                    applicable
Space (defense)                       per program (often classified)
Software-heavy (avionics)             DO-178C DAL A-E
Hardware-heavy (avionics)             DO-254 DAL A-E
Tier-N component / processor          AS9100D + NADCAP for special
                                    processes
First-tier system / structure         full scope incl. APQP-equiv
                                    AS9145
```

---

## 2. Authoritative roots (new in pack)

```
AS9102 First Article Inspection (FAI)   per part × per revision
DPDR (Design Prevention + Detection)    FAA-required design assurance
NADCAP Special Process Certification    per process × per facility
Counterfeit-parts Risk Assessment        per part × per supplier
Counterfeit-parts Investigation          per discovered instance
GIDEP Submission                          per suspect counterfeit
ITAR Item Control                          per controlled item × per access
ITAR Person-of-Record                      per person × per scope
EAR Classification                         per item ECCN
CUI (Controlled Unclassified Info)        marked + access-logged
CMMC Assessment Record                    per cycle
DO-178C Software Configuration Item        per software item × DAL
DO-254 Hardware Configuration Item         per hardware item × DAL
DO-178C Software Lifecycle Data            traceability per artifact
ARP 4754A System Development Data           system-level safety
ARP 4761 Safety Assessment                  FHA + PSSA + SSA + FTA + FMECA
                                            + CCA artifacts
AS9145 APQP Project (aerospace)            per program
AS9145 PPAP Equivalent                     per part / element set
Service-Life-Limited Part Record           per part × per S/N
QPL / QML Registry                          qualified products list / mfg
                                            list participation
Engine Maintenance Record (Part 145)        per engine × per service event
Airworthiness Directive Compliance          per AD × per fleet / aircraft
Service Bulletin Compliance                 per SB × per fleet / aircraft
RAID Log (Risks/Assumptions/Issues/Deps)    per program (industry std)
SCAR (Aerospace Supplier Corrective)        per supplier event
Material Traceability Chain                 lot → heat → coil; per AS9120B
Cyber Plan + SBOM                            per system per DO-326A / -355
                                            (where applicable)
Production Approval Holder Record           per FAA POA / EASA POA
```

---

## 3. State machines (pack-specific)

```
SM-FAI (AS9102 First Article Inspection)
  initiated → bubbled-drawing → measurements-collected →
  reviewed → accepted | rejected
  Hard couplings: SM-7 doc effectivity (drawing); SM-INSP per
                   characteristic; SM-3 WO

SM-NADCAP-CERT
  applied → audit-scheduled → audited → findings → response →
  approved | conditional | failed
  Cycle: typ 24 months; conditional re-audit window
  Hard couplings: blocks production for affected special process
                   if expired

SM-COUNTERFEIT
  alert → quarantine → investigation → confirmed-or-cleared →
  GIDEP-submission (if confirmed) → impact-assessment → CAPA
  Hard couplings: SM-6; may trigger SM-11 recall

SM-ITAR-ACCESS
  request → person-of-record-verified → scope-defined → granted →
  used (logged) → re-evaluated | revoked
  Hard couplings: per-jurisdiction; deemed-export rules

SM-DO-178C SCI
  per software item: planning → development → verification →
  configuration → quality → certification-liaison → in-service
  DAL drives objective coverage (A-E)

SM-DO-254 HCI
  per hardware item: planning → conceptual design → detailed
  design → implementation → verification → in-service

SM-AD (Airworthiness Directive)
  issued → received → applicability → compliance-plan →
  executed → verified → reported

SM-AS9145 APQP (aerospace APQP)
  similar to J2 SM-APQP but with aerospace-specific gates
  (e.g., FAI gate; counterfeit avoidance gate)
```

---

## 4. Per-pack workflows

```
D1 Order to Cash                AS9120B traceability for distributor
                                 sub-vertical
D2 Procurement to Pay            AS5553 / AS6174 counterfeit avoidance
                                 plan; QPL / QML preference
D3 Plan to Produce               AS9145 phase-gated; FAI required at
                                 first piece per revision
D4 Receive to Inspect            counterfeit risk screen per supplier;
                                 GIDEP cross-check
D5 Inspect to Disposition        per characteristic vs spec; AS9102
                                 bubble-trace
D6 NC to CAPA                    8D-style; aerospace cycle times
D7 Document to Release           drawing + spec + cert effectivity;
                                 per ECO with FAI re-trigger
D8 Train to Qualify              special-process operator certification;
                                 ITAR access training; re-qual cycles
D9 Maintain to Restore           Part 145 engine service; service-life-
                                 limited part replacement
D10 Batch to Release              lot → heat → coil traceability;
                                 per AS9100D §8.5 product preservation
D11 Release to Trace              5-year traceability per part;
                                 service-life-limited tracking
D12 Complaint to Recall           airworthiness implications; FAA / EASA
                                 reporting per H1 §3
D13 Audit to Remediate            AS9100 surveillance + NADCAP cycle +
                                 customer audits + DCMA (defense)
D14 Validate to Qualify           aerospace-specific (FAI = qualification
                                 anchor; DAL-driven validation depth)
AS9102 FAI Cycle (pack)          per part × per revision; bubbled drawing
NADCAP Cycle (pack)               per process × per cycle
Counterfeit Cycle (pack)          continuous risk assessment + per-event
                                 investigation
ITAR Access Cycle (pack)          per person × per item
DO-178C / DO-254 Cycle             per software / hardware lifecycle
AD / SB Compliance Cycle           per AD/SB issued × per fleet
GIDEP Submission Cycle             per suspect counterfeit (60-day window
                                 for US gov)
APQP-Aero / PPAP-Aero (AS9145)    per part × per program
```

---

## 5. APIs (pack-specific)

```
AS9102 FAI generator + bubble drawing API   E13 long-running (parse
                                             drawing, bubble characteristics,
                                             generate forms 1/2/3)
NADCAP cert lifecycle API                    E3 + E10 (expiration alerts)
Counterfeit screen API                        E3 + E15 (GIDEP search)
GIDEP submission API                          E15 (US gov portal)
DO-178C SCI tracking API                       E3
DO-254 HCI tracking API                       E3
ARP 4754A / 4761 safety case API              E3
Service-life-limited part record API           E3 + E10 (alerts)
ITAR enforcement API                            E3 + B6 region pinning;
                                             per-tenant US-only
CMMC evidence pack export API                   E8 + E13
EAR classification API                          E3
AS9145 APQP API                                 E3 + E7
AS9145 PPAP-equivalent API                       E13
Material traceability API                        E5 + E8
AD / SB compliance API                            E3 + E10
Engine maintenance record API (Part 145)         E3
SBOM management (DO-326A / -355)                  E3 + E15
```

---

## 6. UI surfaces

```
AS9102 FAI Workspace                bubble drawing renderer + form
                                    1/2/3; characteristic-by-character
                                    measurement entry
NADCAP Cert Workspace                cert + findings + expiration alerts
                                    per process
Counterfeit Check Workspace           supplier risk + part risk +
                                    investigation flow + GIDEP draft
DO-178C SCI Workspace                  per item; objective coverage by
                                    DAL; planning + verification +
                                    config + lifecycle data trace
DO-254 HCI Workspace                   similar for hardware
Service-Life Record Workspace          per S/N; remaining life;
                                    inspection cycle; replacement
                                    alert
ITAR Access Audit Workspace            per person × per item; scope;
                                    re-evaluation
CMMC Evidence Workspace                per cycle; SoA; gap analysis;
                                    self-assessment
Aerospace Audit Pack Wizard            FAA/EASA inspection-ready
ARP 4761 Safety Workspace              FHA + PSSA + SSA + FTA + FMECA
                                    + CCA
AD Compliance Console                   per AD; fleet impact;
                                    compliance plan; reporting
SB Compliance Console                   per SB
Engine Maintenance Workspace            per engine; per service event;
                                    Part 145
Distributor Traceability Console         per AS9120B; lot → heat → coil
                                    traceability viewer
GIDEP Drafting Workspace                drafting + 60-day window
                                    countdown
```

---

## 7. Pack discipline

```
US-only deployment for ITAR tenants    region pinning (B6 C5);
                                       sub-processor list ITAR-clean;
                                       FIPS 140-3 cryptography
Person-of-record verification at        per ITAR; identity + nationality
   onboarding                           check; deemed-export rules
                                       enforced
CUI handling                            field-level marking; encryption;
                                       access logged + reviewed monthly;
                                       NIST 800-171 controls
FIPS 140-3                              validated cryptography for ITAR /
                                       CUI tenants
AS9100D conformance evidence            per cert cycle
NADCAP cycle (typ 24 months)             auto-alert at T-90; re-audit
                                       discipline
AS9102 FAI on first piece per revision   automatic gate at SM-3 WO
                                       (first piece) post-ECO
Counterfeit avoidance plan                tenant-specific; supplier-aware
GIDEP 60-day window                      countdown UI; SLA enforcement
DO-178C / DO-254 DAL                       per item; objective coverage
                                       checked
ARP 4761 safety case                       per system × per program
Material traceability lot → heat → coil   AS9120B; preserved across
                                       D11 + audit pack
Service-life-limited tracking              per S/N; field tracking;
                                       maintenance integration
DO-326A / -355 cyber                       SBOM + threat model + monitoring
                                       (where applicable)
NADCAP-aligned tooling                      audit pack export pre-staged
DCMA-friendly evidence                       defense subcontract evidence
                                       formatting
QP / Designated Person not used            aerospace uses QP-equivalent
                                       (chief inspector / DOA representative)
```

---

## 8. Pack KPIs

```
- AS9102 FAI first-time approval rate
- NADCAP cycle compliance
- Counterfeit incident rate (downward target zero)
- GIDEP submission window adherence
- Service-life-limited part on-time replacement
- ITAR access review compliance
- CMMC self-assessment readiness
- AD / SB compliance window adherence
- DO-178C / DO-254 objective coverage by DAL
- AS9100D surveillance audit findings
- 5-year traceability availability sample test
- COPQ trend per program
- Customer scorecard (per OEM / prime)
```

---

## 9. Audit pack contents (Aero-specific addition to H3 §4)

```
- AS9100D conformance package (cert + Sanctioned Interp updates)
- NADCAP audit findings + corrective actions (last cycle + current)
- Per-customer CSR evidence (Boeing D6-82479; Lockheed; Airbus
  Q-Clauses; Raytheon; etc.)
- Counterfeit mitigation plan + recent screens + investigations
- GIDEP submission record
- ITAR / EAR compliance attestation + access reviews
- CMMC level certification (where applicable; level 2 baseline)
- Service bulletin compliance log
- Airworthiness directive compliance log
- DO-178C SCI lifecycle data per software item
- DO-254 HCI lifecycle data per hardware item
- ARP 4754A / 4761 safety case per system
- AS9145 APQP records per program
- 5-year traceability per critical part (sample-based)
- Material traceability chain
- Special process certs (NADCAP) per process
- AS9102 FAI per part × per revision (sample-based for inspectors)
- Audit findings + CAPAs (last 36 mo)
- Cybersecurity (DO-326A/-355) evidence (where applicable)
- Production Approval Holder evidence
- Distributor AS9120B records (where applicable)
```

---

## 10. Failure modes

```
FM1   AS9102 FAI missed at first piece post-revision
      Recovery: SM-3 gate stops production; H8 CAPA on gate
              integrity; re-FAI

FM2   NADCAP cert expired
      Recovery: production blocked for affected special process;
              re-audit; customer notification

FM3   ITAR access granted without person-of-record verification
      Recovery: SEV-1 (export-control breach); access revoke;
              regulator notification per US gov; H8 systemic CAPA

FM4   GIDEP 60-day window missed
      Recovery: SEV-2; US gov contractual exposure; H8 CAPA

FM5   Service-life-limited part exceeded
      Recovery: airworthiness exposure; immediate aircraft
              grounding (where applicable); FAA / EASA reporting;
              H8 + reportable_event

FM6   AD / SB compliance window missed
      Recovery: airworthiness exposure; per FAA; H8 + report

FM7   Counterfeit confirmed (post-receipt)
      Recovery: quarantine; trace forward / backward; investigate;
              GIDEP submit; H1 §3 reporting; H8 + recall
              consideration

FM8   DAL allocation incorrect (DO-178C / DO-254)
      Recovery: re-allocation per ARP 4754A / 4761; downstream
              re-validation; H8 systemic
```

---

## 11. Cross-references

- H1 §2.4 — Aero regulatory inventory
- H2 — DAL drives validation depth
- H9 — ARP 4761 safety
- L1 — banned decisions BD-20..BD-25 (Aero extension)
- L2 — AI features overlay (AI-18 counterfeit indicator)
- L4 — red-team for ITAR boundary + counterfeit AI
- I7 — ITAR / CMMC controls
- I8 — US-only tenant operations for ITAR
- E15 — GIDEP integration
- M3 — root catalog includes Aero-specific roots
- M9 — cross-reference

---

## 12. Decision phrase

```
J3_AEROSPACE_BASELINE_LOCKED
NEXT: J4_MEDICAL_DEVICE.md
```
