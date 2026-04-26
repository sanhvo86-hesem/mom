# J1 — Pharmaceutical Vertical Pack

```
pack_id:        Pharma
owner_role:     Pharma Lead with Compliance Lead, QP / Designated Person
wave_target:    W10 (sterile-injectable preview); W11 GA
sources:        21 CFR 210/211/11/207/314/803, EU GMP Annex 1-21,
                ICH Q1A-Q14 + E2B(R3), WHO TRS 957/992, DSCSA
                21 USC 360eee, EU FMD Regulation 2016/161, USP
                <1058> equipment qualification, ASTM E2500-13,
                PIC/S Annex 11, ISO 14644 cleanrooms
```

The Pharma pack is the regulatory-densest vertical HESEM serves. It
brings the largest evidence surface, the most stringent retention,
the widest jurisdictional scope, and the strictest signing
discipline. Every other vertical pack reuses parts of Pharma's
substrate (e-sig, audit chain, validation) extended for its own
needs.

---

## 1. Pack scope and sub-vertical taxonomy

```
SUB-VERTICAL                      ADDS (over baseline Pharma)
Active Pharmaceutical Ingredient   ICH Q7 GMP for APIs; impurity
(API)                              limits; specs per ICH Q3A/B/C/D
Drug Product, Solid Oral           ICH Q1A stability; dissolution;
                                   uniformity per 21 CFR 211.110
Drug Product, Sterile Injectable    EU GMP Annex 1 (2022 revision)
                                   contamination control strategy;
                                   environmental monitoring;
                                   media fill; visible particulate
Drug Product, Inhalation             USP <601> aerodynamic
Drug Product, Topical                 dosage uniformity
Biologics                            21 CFR 600-680; potency assay;
                                     potency stability
Cell + Gene Therapy                   21 CFR 1271; viability;
                                     real-time release
Investigational (IMP)                EU GMP Annex 13; expanded access
                                     log
PET (positron emission tomography)   21 CFR 212
OTC                                  per FDA monograph
Compounded                            USP <795>/<797>/<800>;
                                     restrictive controls
Veterinary                            21 CFR 514
Combination products                  21 CFR Part 4 + applicable
                                     device portion
DSCSA participant (manufacturer,     supply-chain serialization;
re-packager, wholesaler, dispenser)  TI/TH/TS exchange; lot-level →
                                     unit-level transition
EU FMD participant                   2D barcode + safety features +
                                     EMVS connection
```

Sub-vertical is a tenant attribute (per H1 §5); the pack adapts
based on it. Multiple sub-verticals per tenant supported.

---

## 2. Authoritative roots (new in pack)

```
ROOT                              OWNER     STATE MACHINE / REF
APR (Annual Product Review)        Pharma    SM-APR new (draft → reviewed
                                              → approved → published)
Manufacturing Deviation            Pharma    SM-DEV new (open → investigated
                                              → CAPA-linked → closed)
Master Batch Record (MBR)           Eng       SM-7 doc lifecycle; effectivity
                                              gates SM-10
Executed Batch Record (EBR)          MES       SM-10 batch release
QC Sample                            QC        SM-INSP-QC new
Stability Study                       Pharma    SM-STAB new (planned →
                                              executing → on-going → closed)
Stability Pull                        QC        per pull point
ICSR (E2B R3)                        Safety    SM-ICSR new
DSCSA Transaction Set (TI/TH/TS)    Logistics SM-DSCSA new
Serialized Unit                      Logistics per UDI / SGTIN / GS1
QP Declaration                       Compliance per Annex 16; signed
QP Pre-release Pack                  Compliance pre-release evidence pack
Cleaning Validation Cycle             Eng       SM-CLEANING-V new
Environmental Monitoring (EM) Run    Pharma    per area × per shift
Media Fill                            Pharma    per line × per period
Water System Monitoring               Eng       per loop × per sample
HVAC Qualification                    Eng       per area × per cycle
Personnel Qualification (Aseptic)     Workforce per role × per cycle
Pharmacovigilance Case                Safety    PV case lifecycle
Recall Decision (Class I/II/III)      Compliance SM-11 instantiated
Field Alert Report (FAR)              Compliance per 21 CFR 314.81
Periodic Adverse Drug Experience       Compliance per 21 CFR 314.80
   Report (PADER)
Risk Evaluation + Mitigation Strategy  Compliance per FDAAA 901
   (REMS)
Investigational Drug Distribution     Logistics per IND
Master Cell Bank                      Eng       per bank with stability
Working Cell Bank                     Eng       per bank with stability
```

Each root inherits baseline platform features (audit chain, e-sig,
WORM, validation lifecycle) plus pack-specific overlays.

---

## 3. State machines (pack-specific)

```
SM-APR
  draft → in-review → reviewed-by-QP → approved → published →
  next-cycle-opened
  Hard couplings: SM-7 doc lifecycle; SM-10 batch release evidence
                   feeds APR
  Triggers: scheduled annual; product life event (recall; significant
            CAPA; spec change)

SM-DEV (Deviation)
  open → triage → investigation → root-cause → impact-assessed →
  CAPA-linked → effectiveness-tracked → closed
  Hard couplings: SM-10 (deviation may block batch release);
                   SM-6 CAPA (always linked)
  Branches: planned-deviation (annex 15 §10) vs unplanned

SM-STAB (Stability Study)
  planned → committed → ongoing → expired
  Sub-state: per pull point: due → drawn → tested → reviewed →
              accepted | OOS | OOT
  Hard couplings: SM-10 cannot release if stability concerns;
                  SM-DEV when OOS / OOT
  ICH Q1A storage conditions enforced; trend analysis per ICH Q1E

SM-ICSR (Individual Case Safety Report)
  intake → triaged → seriousness-assessed → expectedness-assessed →
  causality-assessed → coded → submitted → followed-up → closed
  Hard couplings: H1 §3 reporting windows
  Branches: serious-expedited; serious-non-expedited; non-serious
            periodic; literature; spontaneous; solicited

SM-DSCSA
  per transaction step (manufacturer → repackager → wholesaler →
  dispenser → patient)
  TI / TH / TS exchanged at each step
  Suspect product handling: 3 business days notification per H1 §3

SM-CLEANING-V
  per cycle: planned → executing → analysed → accepted | failed
  Hard couplings: SM-10 cannot proceed without current cleaning
                  evidence
```

---

## 4. Workflows (per Part D instantiation)

```
D1 Order to Cash          standard plus DSCSA-aware shipment
                           validation; serialized vs lot-level routing
D2 Procurement to Pay      excipient + API + packaging supplier
                           qualification (extended H1)
D3 Plan to Produce          MBR effective + EM clean + line-status-OK
                           gate at dispatch
D4 Receive to Inspect       sample plan per ICH Q6; identity test;
                           certificate of analysis verification
D5 Inspect to Disposition   QC sample lifecycle; OOS / OOT investigation
                           per FDA OOS guidance
D6 NC to CAPA              deviation lifecycle (SM-DEV) feeds D6
D7 Document to Release     MBR / SOP / cleaning protocol effectivity;
                           per Annex 11 §10 + H7
D8 Train to Qualify         aseptic personnel + GxP-specific training;
                           re-qualification cycles
D9 Maintain to Restore      qualified equipment; calibration cycle;
                           cleaning state preservation
D10 Batch to Release         QP / Designated person sign-off; chain-
                           of-evidence (every component validated +
                           released + clean + monitored); CoA;
                           certificate of compliance
D11 Release to Trace         lot genealogy + DSCSA serialization;
                           recall simulation
D12 Complaint to Recall      ICSR + PV case + signal management;
                           class I/II/III decision
D13 Audit to Remediate       Pre-FDA / Pre-EMA inspection drill;
                           483 / Form 482 simulation
D14 Validate to Qualify      additional pharma-specific stages
                           (qualification of facility, utilities,
                           equipment, computerized, cleaning)
APR Cycle (pack-specific)    quarterly check-ins → annual review;
                           feeds review board
Stability Cycle (pack-spec)  per study × pull point → trend → action
PV Cycle (pack-spec)         signal detection → assessment → action
DSCSA Cycle (pack-spec)      TI exchange + verification + suspect
                           handling
```

---

## 5. APIs (pack-specific in addition to E0..E15)

```
EVR (Executed Batch Record) read API     E5 workspace projection
EVR mutation chain API                   E3 workflow
QP / DP release API                      E3 workflow + E7 e-sig
APR generation API                        E13 long-running operation
                                          (multi-week)
APR review API                             E5 + E7
Deviation lifecycle API                    E3 + E7
Stability study management API             E3 (long-running)
Stability pull schedule API                E13 + E10 notification
ICSR submission API                        E15 integration (E2B R3 to
                                          regulator)
DSCSA TI/TH/TS exchange API                E15 integration (EPCIS over
                                          AS2 / SFTP / cloud per
                                          partner)
DSCSA verification API (suspect product)   E15 + E3
Pharma audit pack export API                E8 + E13
Cleaning validation cycle API               E3
EM (environmental monitoring) ingestion     E15 + E3
Media fill cycle API                        E3
Recall decision API                          E3 + E7
FAR submission API                           E15
PADER submission API                         E15
Stability pull capture API                   E5 + E12 (file)
APR section drafting API                    E9 (AI advisory) + E5
PV case API                                 E3
```

Each API inherits idempotency, ABAC, RFC 9457 problem details,
audit chain (per E0).

---

## 6. UI surfaces (per Part F instantiation)

```
EBR Workspace + AR Shell      heaviest regulated UI; per ISA-88 PFC;
                               per-step e-signature; per-step
                               photo / sample evidence; "challenge"
                               handling on alarms
APR Workspace                   draft + review + approve; sourced from
                               D10 telemetry + D5 disposition + D6
                               CAPA + D9 maintenance + stability
QP Pre-Release Workspace         single-pane chain-of-evidence: every
                               component verified before release
                               click; banner if any component
                               degraded
Deviation Workspace              full lifecycle SM-DEV; AI-assisted
                               root cause (AI-13)
QC Sample Workspace               sampling + chain-of-custody + test
                               assignment + result entry + retest
Stability Study Workspace         protocol + storage + pull schedule;
                               trend visualization; OOS handling
DSCSA Transaction Workspace       inbound / outbound TI / TH; suspect
                               handling; verification flow
ICSR Submission Workspace         intake → assessment → submission;
                               regulator-specific format export
Pharma Audit Pack Wizard          FDA inspection-ready; pre-staged
                               by H3
Cleaning Validation Workspace     protocol + execution + sampling +
                               results; gates SM-10
EM (Environmental Monitoring)     real-time per area; alert handling;
   Workspace                      trend per shift
Media Fill Workspace               line × period; risk assessment
Water System Monitoring             daily chemistry + microbial
   Workspace
Recall Decision Console           class assessment; impact
                               estimation; FDA notification
                               drafting (advisory; per H1 §3)
FAR Submission Workspace            per 21 CFR 314.81; 3-day window
PV Signal Console                  signal detection KPIs;
                               disproportionality analysis (advisory);
                               case clustering
```

---

## 7. Pack discipline (canonical)

```
DISCIPLINE                                ENFORCEMENT
2-person e-sig on banned set + Pharma     E7 quorum check (per BD-1,
extensions BD-9..BD-12                     BD-9..BD-12)
QP signature for Annex 16 release          per tenant QP role; mandatory
                                          for EU release
US Designated Person for Pharma audit       per tenant config
21 CFR 11.10(j) accountability               role-acknowledgement at
                                          login + at sign
Mandatory reason-for-change on every          per E3 mutate; rejected
mutation                                       without
Validation chain at release                  every component (MBR,
                                          equipment, cleaning, EM,
                                          training) gates SM-10
Backdating beyond 24h requires e-sig +        per E7; logged in audit
explicit reason                                chain
WORM permanent for batch records              per H5 perpetual + GxP
                                          minimum 25 yr; per Member
                                          State extends
APR cadence enforcement                       calendar runs;
                                          missed cadence escalates
                                          per H6
Annex 1 contamination control strategy         tenant-specific CCS
                                          authoritative root;
                                          referenced in MBR + cleaning
Aseptic personnel re-qualification             per cycle; expired
                                          qualification blocks line
                                          access
Stability protocol immutability                stability studies are
                                          long-lived; pulls cannot
                                          deviate from published plan
Recall simulation                              quarterly per tenant;
                                          evidence retained
DSCSA suspect product handling                 3 business day window;
                                          escalation if missed
EU FMD verification                             per dispensing event;
                                          decommissioning logged
ICH Q12 lifecycle management                    established conditions
                                          + reporting categories
                                          recognized
PIC/S inspection harmonization                 PIC/S inspection compatible
```

---

## 8. Standards instantiation depth

Per H1 §2.1 Pharma list, this pack realizes the controls each
clause demands. Notable mappings:

```
21 CFR 211.180(e) APR                  APR root + cycle workflow
21 CFR 211.184 component records       Procurement (D2) + receipt (D4)
                                       + sampling (D5)
21 CFR 211.188 batch production        MBR + EBR roots + D10
21 CFR 211.192 production review       D5 + D10; lot review pre-release
21 CFR 211.194 lab records             QC Sample root; results retention
21 CFR 211.198 complaints              D12 complaint workflow
21 CFR 211.204 returned drugs          D5 disposition (return path)
21 CFR 211.110 in-process controls     EBR step controls; SPC
EU GMP Annex 1 §4-9 (sterile)          EM Workspace + Media Fill +
                                       Cleaning Validation
EU GMP Annex 11 §4-17                  per H1 §4 mapping; pack adds
                                       EBR workspace specifics
EU GMP Annex 16 §1-3                   QP Pre-Release Workspace;
                                       QP Declaration root
ICH Q1A/Q1E stability                  Stability Study + trend
ICH Q7 §2-19 (API)                      pack overlay if API tenant
ICH Q9 risk management                 H9 instantiation
ICH Q10 PQS                            QMS overlay
ICH Q12 lifecycle                      ECs + reporting category
ICH E2B(R3) ICSR                       ICSR root + integration
DSCSA                                  DSCSA Transaction + Serialized
                                       Unit roots
EU FMD                                 Serialized Unit + EMVS
```

---

## 9. Pack deployment

```
WAVE  ITEM
W6    Pre-pack platform readiness verified (audit chain, e-sig, WORM,
       validation lifecycle, evidence taxonomy)
W7    AI feature shadow-mode for Pharma-relevant: AI-09 anomaly,
       AI-13 RCA Whys, AI-21 APR drafting (later)
W8    Roots scaffolded: EBR + Deviation + QC Sample + Stability
W9    APIs + workflows for D10 + D5 (Pharma overlay)
W10   Sterile sub-vertical preview (Annex 1 + EM + Media Fill)
W11   Pack GA: DSCSA, ICSR, APR, FAR, recall workflow
W11   Customer-side validation pack delivery for first design partners
W12   Optimization + cycle 2 roots (PV signal mgmt + REMS where applicable)
```

Pre-W10, the pack is opt-in for design partners under enhanced
support; post-GA, available to all Pharma tenants.

---

## 10. Audit pack contents (Pharma-specific addition to H3 §4)

```
- Validation Master Plan (current)
- IQ/OQ/PQ records per equipment + per system + per facility
- 24-month sample EBR set (selected by inspector)
- 24-month deviation log + investigation evidence
- 24-month complaint log + responses
- 24-month CAPA log + effectiveness
- Last 3 APRs per product
- Stability program summary + per-study data
- Personnel training records (GxP-specific)
- Equipment qualification + calibration log
- Cleaning validation evidence
- Environmental monitoring (sterile only) summary + alert handling
- Water system monitoring summary
- HVAC qualification
- Aseptic personnel qualification log
- Media fill records
- Supplier qualification (excipient + API + packaging)
- DSCSA event log + suspect handling
- EU FMD activity (where applicable)
- PV signal management summary
- ICSR submission + responses
- Recall simulation evidence
- Computerized system inventory + IT change log
- 21 CFR 11 compliance attestation
- EU GMP Annex 11 self-inspection
```

24-hour SLA on inspector-requested export per H3 §4. Pre-staged
nightly + delta build.

---

## 11. Pack KPIs

```
- Right-First-Time release rate (target ≥ 98%)
- Deviation count per million units (downward trend)
- Mean deviation cycle time
- CAPA effectiveness pass rate
- OOS rate
- Annex 16 / QP release p95 time
- DSCSA suspect product window adherence
- ICSR SLA adherence (7-day / 15-day)
- APR cycle adherence
- EM excursion rate (sterile)
- Recall avoidance evidence
- Stability OOT rate
- Media fill failure rate
```

---

## 12. Failure modes

```
FM1   QP signature without chain-of-evidence
      Recovery: B6 axiom rejects; SM-10 cannot proceed; H8 CAPA on
              UI clarity

FM2   APR cycle missed (annual deadline passed)
      Recovery: SEV-2; FDA risk; per H6 escalation

FM3   DSCSA suspect product window missed
      Recovery: SEV-1; regulatory exposure; per H1 §3 + I3

FM4   Cleaning validation expired before SM-10
      Recovery: gate stops batch release; H8 CAPA + cleaning re-cycle

FM5   Aseptic personnel qualification expired
      Recovery: line access blocked; supervisor re-assignment;
              H8 CAPA on training discipline

FM6   ICSR submission late (E2B R3)
      Recovery: per H1 §3 windows; SEV per delay; H8 CAPA + regulator
              communication

FM7   APR section drafting (AI-21) hallucinates
      Recovery: per L4 SEV-3; reviewer rejects; advisory hidden until
              fix
```

---

## 13. Cross-references

- H1 §2.1 — Pharma regulatory inventory
- H2 — validation lifecycle (extra Pharma stages per §11 above)
- H3 — audit pack
- H4..H9 — generic; this pack overlays
- L1 — banned decisions BD-9..BD-12 (Pharma extension)
- L2 — AI features overlay (AI-09, AI-13, AI-21, AI-32)
- D10 — batch-to-release workflow
- E15 — DSCSA / FMD / E2B integration
- M3 — root catalog includes Pharma-specific roots
- M9 — cross-reference

---

## 14. Decision phrase

```
J1_PHARMACEUTICAL_BASELINE_LOCKED
NEXT: J2_AUTOMOTIVE.md
```
