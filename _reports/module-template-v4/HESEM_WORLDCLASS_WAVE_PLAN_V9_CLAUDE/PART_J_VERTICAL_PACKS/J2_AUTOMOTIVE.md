# J2 — Automotive Vertical Pack

```
pack_id:        Automotive
owner_role:     Automotive Lead with Quality Engineer
wave_target:    W10 (preview); W11 GA
sources:        IATF 16949:2016 + Sanctioned Interpretations,
                AIAG-VDA FMEA 2019, AIAG APQP 2nd, AIAG PPAP 4th,
                AIAG MSA 4th, AIAG SPC 2nd, VDA 6.3, VDA 6.5,
                ISO 26262:2018, ISO 21434:2021, Automotive SPICE
                v4.0, CQI-9/11/12/15/17/23/27, IATF Customer-Specific
                Requirements (Ford Q1, GM BIQS, Stellantis, Toyota,
                VW Formel Q, BMW, Hyundai HKMC SQ), IMDS
```

The Automotive pack inherits the rigor of the OEM supplier
ecosystem: planned quality (APQP), submission discipline (PPAP),
process control (SPC + CQI), problem solving (8D), customer-specific
overlays (CSR per OEM). The pack scales from Tier-N supplier through
OEM; HESEM does not target OEM-prime processes (powertrain
calibration, vehicle assembly) but does target component, sub-system,
and module suppliers.

---

## 1. Pack scope and supplier-tier taxonomy

```
TIER     SCOPE                                  PACK FOCUS
Tier-N   raw material / bulk components          ISO 9001 + AIAG/VDA
                                                 baseline; CQI special
                                                 process where applic
Tier-3   sub-component / specialty processor      IATF 16949 likely;
                                                 CQI heavy
Tier-2   module / sub-system supplier             IATF 16949 + per OEM
                                                 CSRs; PPAP active
Tier-1   system supplier                          IATF 16949 + multi-OEM
                                                 CSRs; full APQP + PPAP
                                                 + SPC; warranty
Aftermarket / Service Parts                      per OEM service
                                                 specifications
Heavy Truck / Off-Highway                        AS/SAE-equivalent +
                                                 specialty
EV / Battery / Electronics                       ISO 26262 + ASPICE +
                                                 cybersecurity 21434
Body / Trim / Interior                            CSR-heavy; cleanliness
                                                 (VDA 19) where applic
```

Tenant declares tier; pack enables only relevant overlays.

---

## 2. Authoritative roots (new in pack)

```
APQP Project                       per part / per program
APQP Phase Advance Decision         per phase × per project
PSW (Part Submission Warrant)      per part × per OEM
PPAP Submission                    per part × per submission level
PPAP Element Set                    18 standard elements per AIAG PPAP
Control Plan                       per part × per characteristic
Gauge R&R Study                    per gauge × per characteristic
Initial Sample Inspection Report    per part
Special Process Certification       per CQI process
Annual Layout Inspection            per part × per year
Warranty Claim                      per VIN × per claim
Field Return                        per VIN × per part
Customer-Specific Requirement       per OEM × per program
                                    (linked rule pack)
LPA Plan                           per facility
LPA Audit Run                      per cycle (operator → senior mgmt)
8D Investigation                    per problem
SCAR (Supplier Corrective Action)  per supplier × per problem
EDI Transaction                    per partner × per doc-set
DFMEA                              per design / system
PFMEA                              per process
PFD (Process Flow Diagram)         per process
Cleanliness Specification           per VDA 19 (where applicable)
Production Trial Run               per program × per cycle
Customer Notification of Deviation   per OEM × per condition
IMDS Submission                    per part × per material composition
ISIR (Initial Sample Inspection    per OEM (Ford-style)
   Report)
Reliability Demonstration Plan       per program (where required)
Software FMEA / FMEDA              per ISO 26262 (E/E only)
HARA (Hazard Analysis + Risk       per ISO 26262
   Assessment)
ASIL Allocation                    per ISO 26262
Cybersecurity Threat Model         per ISO 21434 (E/E)
```

---

## 3. State machines (pack-specific)

```
SM-APQP (5 phases per AIAG)
  Phase 1 plan + define program → Phase 2 product design + dev →
  Phase 3 process design + dev → Phase 4 product + process validation →
  Phase 5 feedback / corrective action / continuous improvement
  Phase advance gated by deliverable evidence + signed signoff
  Hard couplings: SM-7 doc effectivity; SM-3 WO; SM-6 CAPA

SM-PPAP
  draft → element-collection → internal-review → submitted →
  customer-review → approved | rejected | interim-approval
  18 elements: design record; engineering change docs; customer
   approvals; DFMEA; PFD; PFMEA; control plan; MSA; dimensional;
   material/performance; ISIR; process capability; qualified lab
   docs; appearance approval; PSW; bulk material PSW (where applic);
   sample products; checking aids; CSR-specific records
  Submission level: 1 (warrant only) → 5 (full)
  Hard couplings: customer EDI; SM-7 doc effectivity

SM-LPA
  per cycle: planned → operator-audit → supervisor-audit →
  manager-audit → senior-mgmt-audit → period-closed
  Each layer has a sample plan; findings open CAPAs per H8

SM-8D
  D1 team → D2 problem → D3 containment → D4 root cause →
  D5 permanent corrective → D6 implement → D7 prevent recurrence →
  D8 recognize team
  D2-D7 mandatory for Major; D1+D8 for Critical (often customer
  required)
  Hard couplings: D6 CAPA + (where customer-driven) customer EDI

SM-PRR (Production Trial Run)
  pre-trial → run → measure → analyze → release → post-trial
  Verifies process capability before production volume
  Hard couplings: PFMEA + Control Plan effective

SM-WARRANTY
  intake → triage → root-cause → resolution → cost-allocation →
  closed
  Hard couplings: 8D where appropriate; customer EDI for warranty
                   reporting

SM-ISO 26262 (E/E only; subset of pack)
  per safety lifecycle: concept → product dev → after release
  ASIL allocation drives validation depth (per H2 + ARP-style)
```

---

## 4. Per-OEM CSR overlays

```
FORD Q1                            Q1 elements; FAA (Field Action
                                   Authorization); MS-C (Material
                                   Specification - Component); SREA
GM BIQS                            BIQS levels 1-10; problem-solving
                                   discipline; supplier-portal sync
STELLANTIS                          Stellantis Quality Manual; Stellantis
                                   PPAP variant
TOYOTA                              Toyota CRT (containment); 7-step
                                   problem solving; TPS-aligned
VW FORMEL Q                         FQ-Skills; FQ-Capability; VDA 6.3
                                   alignment
BMW VDA-aligned                     supplier portal; specific PPAP
                                   variant
HYUNDAI/KIA HKMC SQ                 SQ-Mark; specific layered audit
NISSAN                               Nissan-specific PPAP; ASES
HONDA                                HOSS criteria
TESLA                                Tesla-specific quality requirements
                                   (lighter footprint, faster cycle)
RIVIAN, LUCID, NEW EV               EV-specific requirements
                                   (safety + cyber heavy)
```

CSR overlay = parameterized rule pack per OEM × per program × per
part. Updates flow through H7 + customer notification.

---

## 5. Workflows (per Part D instantiation)

```
D1 Order to Cash       EDI 850 PO → 855 PO ack → 856 ASN → 810 invoice
                       → 820 payment; per-OEM EDI variants
D2 Procurement to Pay   supplier qualification per IATF requirements
                       (CQI special process verified for sub-tier)
D3 Plan to Produce      Control Plan effective + LPA current + special
                       characteristics monitored
D4 Receive to Inspect    incoming inspection per Control Plan; sample
                       plan per AIAG sampling
D5 Inspect to Disposition  SPC out-of-control investigation;
                       containment + sort
D6 NC to CAPA           8D-driven; D2-D7 mandatory
D7 Document to Release   Control Plan / FMEA / PFD revision per ECO
D8 Train to Qualify      job-specific qualification + LPA-trained
                       observers
D9 Maintain to Restore   TPM (Total Productive Maintenance) integration
D10 Batch to Release      lot-level approval; PPAP-effective gate
D11 Release to Trace      VIN-back traceability; serial-or-lot per part
D12 Complaint to Recall   warranty trend + 8D + recall classification
D13 Audit to Remediate    LPA self-audit + IATF-cert surveillance
D14 Validate to Qualify   APQP phase = validation lifecycle equivalent
APQP Cycle (pack)        5-phase project lifecycle
PPAP Cycle (pack)        18-element submission
LPA Cycle (pack)         per layer × per cadence
8D Cycle (pack)          per problem
Production Trial Run     pre-launch
Annual Layout Inspection annual per part
Customer EDI Cycle       continuous per partner
```

---

## 6. APIs (pack-specific)

```
APQP project + phase API                E3 + E7
PPAP submission generator               E13 long-running (assemble 18
                                         elements; validate completeness)
PPAP submission API                     E15 to OEM portal where applic
PSW signature API                       E7
Control Plan management                 E3 + E7
Gauge R&R study API                     E3
Special process cert API                E3
Annual Layout Inspection API            E3
Customer EDI engine                     E15 (850/855/856/810/820/860/
                                         862/865/997 per partner)
SCAR (supplier corrective action) API   E3 + E7
LPA submission API                       E3
8D workflow API                          E3 + E7
Warranty claim ingestion                 E15
Field return ingestion                   E15
IMDS submission                          E15
Customer Notification of Deviation API   E15 + E7 (BD-19)
DFMEA / PFMEA API                       E3 (with action priority)
HARA / ASIL API (E/E)                   E3 (ISO 26262)
```

---

## 7. UI surfaces

```
APQP Workspace + Project Detail         5 phases visible; deliverable
                                        completeness per phase; gate
                                        meeting prep
PPAP Submission Wizard (18-element)     guided assembly; level
                                        selection (1-5); pre-flight
                                        validation; signed PSW
                                        export
Control Plan Workspace                  per characteristic; CC/SC/
                                        KPC/KCC tagging; SPC linkage
                                        for special characteristics
GR&R Workspace                          study planning + execution +
                                        results
Special Process Cert Workspace          CQI per process (9: heat treat,
                                        11: plating, 12: coating,
                                        15: welding, 17: soldering,
                                        23: molding, 27: casting);
                                        cert renewal cycle
Warranty / Field Return Workspace       trend + cluster + cost
                                        allocation
LPA Audit Workspace                     per layer; mobile-friendly
                                        for shopfloor
8D Investigation Workspace              D1-D8 panels; AI-assisted
                                        (AI-13)
EDI Transaction Viewer                  per partner; transaction
                                        history; ack flow
DFMEA / PFMEA Workspace                 7-step approach; structure +
                                        function + failure +
                                        risk + optimization
HARA / ASIL Workspace (E/E)             ISO 26262 specific
Customer Notification of Deviation      drafting + approval (BD-19)
   Workspace
PPAP Cockpit per OEM                    OEM-specific layout +
                                        submission portal
```

---

## 8. Pack discipline

```
2-person e-sig                       APQP phase advance, PPAP submit,
                                     PSW, CND
PPAP submission level                Level 1-5 per OEM × per part;
                                     default Level 3
AIAG-VDA 2019 Action Priority        replaces legacy RPN-only; AP
                                     lookup table canonical
Special characteristics taxonomy     CC (Critical Characteristic) /
                                     SC (Significant) / KPC (Key
                                     Product) / KCC (Key Control)
                                     auto-enrolled in SPC monitoring
IMDS material data                   per part composition; submission
                                     before PPAP
Layered audit cadence                operator daily / supervisor
                                     weekly / mgr monthly /
                                     sr-mgmt quarterly
Per-OEM EDI compliance                conformant to OEM EDI guide
SCAR window per OEM                   typically 24-72 h initial
                                     containment; 7 d D4; 30 d D7
Special process re-cert cadence       per CQI requirement (typ
                                     annual / 2-year)
Customer scorecard auto-mirror        ingest OEM scorecard;
                                     reconcile internal metrics
ISO 26262 ASIL discipline              per E/E component; cascades
                                     to validation depth + cyber
ISO 21434 cybersecurity               for E/E with TARA + threat
                                     model + monitoring
```

---

## 9. Pack KPIs

```
- PPAP first-time approval rate
- APQP on-schedule rate
- LPA finding closure rate
- Warranty PPM by program
- COPQ (Cost of Poor Quality) trend
- Customer scorecard color (Green/Yellow/Red)
- 8D cycle time D1-D8
- Special process cert compliance
- IMDS submission timeliness
- CND avoidance evidence (zero is target)
- Process capability (Cpk/Ppk) per characteristic
- Cleanliness conformance (VDA 19 where applic)
- ISO 26262 ASIL evidence completeness (E/E)
- Cyber posture per ISO 21434 (E/E)
```

---

## 10. Audit pack contents (Automotive-specific addition to H3 §4)

```
- IATF 16949 conformance evidence (cert + Sanctioned Interp updates)
- ISO 9001 conformance evidence
- Per-customer CSR conformance attestation
- 12-month LPA records (per layer × per cycle)
- Internal audit records (process / product / layered)
- Management review minutes (last 24mo)
- CAPA log + 8D investigations
- Supplier monitoring + scorecard
- Customer scorecard mirror
- COPQ trend (last 24mo)
- Annual layout inspection results
- Special process certifications + cert renewal evidence
- PPAP submissions per part
- Control Plan with revision history
- DFMEA / PFMEA with action priority
- MSA (Gauge R&R) records
- SPC charts per special characteristic
- Process capability summary
- Cleanliness program records (where applicable)
- IMDS submissions
- Customer EDI compliance evidence
- Warranty claim trend + analysis
- Field return analysis
- ISO 26262 evidence (E/E)
- ISO 21434 evidence (E/E)
- ASPICE evidence (software-heavy)
```

---

## 11. Failure modes

```
FM1   PPAP submission rejected by OEM
      Recovery: per-element root cause; resubmit; LPA on
              process; H8 CAPA

FM2   LPA cycle missed
      Recovery: H6 escalates; certification at risk;
              audit finding likely

FM3   Special process cert expired (CQI)
      Recovery: production blocked for affected lots;
              re-cert workflow + customer notification

FM4   IMDS submission late
      Recovery: PPAP gate stops; H8 CAPA on submission
              discipline

FM5   ASIL allocation incorrect (E/E)
      Recovery: HARA review + reallocation; downstream
              validation depth re-baselined

FM6   Cyber TARA finding (ISO 21434)
      Recovery: per L4 / I7; tenant + customer notification
              per cyber agreement
```

---

## 12. Cross-references

- H1 §2.3 — Auto regulatory inventory
- H8 — 8D mapped to CAPA
- H9 — AIAG-VDA FMEA Action Priority
- L1 — banned decisions BD-17..BD-19 (Auto extension)
- L2 — AI features overlay (AI-12 yield, AI-13 RCA, AI-25 schedule)
- D14 — APQP as validation lifecycle
- E15 — EDI integration
- M3 — root catalog includes Auto-specific roots
- M9 — cross-reference

---

## 13. Decision phrase

```
J2_AUTOMOTIVE_BASELINE_LOCKED
NEXT: J3_AEROSPACE.md
```
