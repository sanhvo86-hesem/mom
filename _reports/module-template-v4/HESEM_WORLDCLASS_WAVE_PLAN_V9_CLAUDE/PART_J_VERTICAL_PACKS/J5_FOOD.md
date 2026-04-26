# J5 — Food Vertical Pack

```
pack_id:        Food
owner_role:     Food Lead with Compliance Lead
wave_target:    W10 (preview); W11 GA
sources:        21 CFR Part 117 (FSMA Preventive Controls Human),
                Part 111 (dietary supplements), Part 113 + 114
                (LACF + acidified), Part 120 + 123 (juice + seafood
                HACCP), Part 507 (animal food), Part 1.1300 (FSMA
                §204 traceability, full effect Jan 2026), Part 121
                (intentional adulteration), Part 1.900 (sanitary
                transportation), FSMA Foreign Supplier Verification,
                EU 178/2002 + 852/2004 + 853/2004 + 1169/2011 +
                396/2005, Codex Alimentarius CXC 1 + CXC 36,
                ISO 22000:2018 + ISO 22002 + ISO 22005,
                BRCGS Food Safety v9, SQF Edition 9, FSSC 22000 v6,
                IFS Food v8
```

The Food pack carries the FSMA-driven preventive controls discipline,
HACCP-anchored hazard analysis, allergen control, foreign supplier
verification, and the new FSMA §204 traceability with electronic
record requirements (full effect 2026). The pack scales across
manufacturer / processor / packer / holder / shipper / receiver /
importer roles.

---

## 1. Pack scope and sub-vertical

```
SUB-VERTICAL                       PACK FOCUS
Human food (general)                FSMA Part 117 + HACCP
Dietary supplements                  FSMA Part 111
Low-Acid Canned + Acidified          FSMA Part 113 + 114; thermal process
Juice (HACCP-mandated)               FSMA Part 120
Seafood (HACCP-mandated)             FSMA Part 123
Animal food                          FSMA Part 507
Foreign-supplier importer             FSMA FSVP
Food contact substance / packaging   per FDA + EU framework
Beverage                              per process; HACCP
Bakery                                allergen-heavy
Dairy                                  Pasteurization rules + Grade A
                                      PMO
Meat / poultry (USDA jurisdiction)    USDA-FSIS HACCP (separate from
                                      FDA jurisdiction; partial overlap)
Egg                                    USDA / FDA per product
Infant formula                         21 CFR 106 + 107
GFSI-certified                         BRCGS / SQF / FSSC 22000 / IFS
                                      cert evidence
Codex / multi-jurisdiction             EU + ISO 22000 + national
```

---

## 2. Authoritative roots (new in pack)

```
HACCP Plan                          per facility × per process line
HACCP Team Charter                   per facility
Food Safety Plan (FSMA Part 117)     per facility (broader than HACCP)
PCQI Record (Preventive Controls     per qualified individual
   Qualified Individual)
Hazard Analysis                      per process step × per hazard
Critical Control Point (CCP)         per identified CCP
Critical Limit                        per CCP × per parameter
CCP Monitoring Record                 per CCP × per shift × per check
Corrective Action Record              per CCP excursion
Allergen Control Plan                  per facility
Allergen Cross-Contact Risk             per shared line
Sanitation Plan                          per facility (master)
Sanitation Record                        per shift × per area
Pest Control Plan + Service Record       per facility × per service
SSOP (Standard Sanitation OP)            per area × per task
Foreign Supplier Verification             per supplier × per food
FSVP Hazard Analysis                       per supplier
FSMA §204 KDE / CTE Record                  Key Data Element / Critical
                                            Tracking Event per traceability
                                            lot per high-risk food
Recall Plan                                  per facility
Mock Recall Run                              per cycle
Recall Decision (Class I/II/III)            per recall (cross-link D12)
Reportable Food Registry Submission           per RFR event
Sanitary Transport Record                      per shipment
Intentional Adulteration Vulnerability         per facility
   Assessment (FSMA Part 121)
Food Defense Plan                                per facility
Environmental Monitoring (EMP)                   per facility × per zone
   (Listeria + Salmonella + pathogens)
Process Authority Letter (LACF)                  per process × per recipe
Thermal Process Validation                       per process × per product
Pasteurization Record                            per Grade A (dairy)
Water Activity / pH Record                        per recipe (acidified)
Allergen Verification (post-cleanup)               per shared line cleanup
Customer / Brand Specification                     per customer × per product
GFSI Certification                                  per facility × per cycle
EU EFSA / National food authority                   per submission
   submission
USDA-FSIS HACCP                                       (where USDA jurisdiction;
                                                     pack overlay)
```

---

## 3. State machines (pack-specific)

```
SM-CCP-MONITOR
  per CCP per shift: scheduled-monitor → measured → in-spec → next
                                         |
                                         out-of-spec → corrective
                                         action → product hold →
                                         disposition decision
                                         (rework / destroy / release-with-
                                         deviation per Process Authority)
  Hard couplings: SM-DEV-style; release blocked for affected lot
                  until disposition

SM-FSVP
  per supplier: hazard-analyzed → verification-activity-defined →
  verifications-conducted → reviewed → re-evaluation
  Cycle: re-eval per change in hazard / supplier / regulatory

SM-FSMA-204
  per CTE per high-risk food: harvest / cool / pack / ship-receive /
  transform → KDEs captured → exchanged with trading partner →
  retained 2 years

SM-RECALL
  per recall: trigger → classification → execution → effectiveness →
  closure (cross-link D12 + SM-11)

SM-EMP (Environmental Monitoring)
  per zone × per cycle: sample-scheduled → drawn → tested →
  pathogen-detected? → routine | excursion → investigation →
  CAPA-linked

SM-MOCK-RECALL
  per cycle (annual minimum): planned → traced → reconciliation →
  evidence captured → close

SM-IA-VA (Intentional Adulteration Vulnerability Assessment)
  per facility × cycle: actionable-process-step identified →
  vulnerability assessed → mitigation strategy → verified
```

---

## 4. Per-pack workflows

```
D1 Order to Cash       allergen disclosure on label;
                       FSMA STT (Sanitary Transportation)
                       compliance for cold-chain
D2 Procurement to Pay   FSVP supplier verification;
                       country-of-origin
D3 Plan to Produce      HACCP plan effective + sanitation pre-op
                       check + allergen scheduling
D4 Receive to Inspect    FSVP receiving verification;
                       temperature on receipt
D5 Inspect to Disposition  CCP excursion handling;
                       hold/release/destroy per Process
                       Authority where applic
D6 NC to CAPA           HACCP-driven; allergen-contact incidents
D7 Document to Release   HACCP plan / SSOPs / labels effectivity;
                       allergen statement currency
D8 Train to Qualify      HACCP team qualification; PCQI;
                       allergen awareness; sanitation
D9 Maintain to Restore   sanitary equipment maintenance;
                       calibration of CCP instruments
D10 Batch to Release      lot release per Food Safety Plan;
                       allergen verification post-cleanup
D11 Release to Trace      FSMA §204 KDE/CTE for high-risk foods;
                       lot genealogy
D12 Complaint to Recall    consumer complaint → adulteration risk
                       → recall classification (I / II / III)
D13 Audit to Remediate    FDA inspection (FSVI) + GFSI-cert
                       + customer audit
D14 Validate to Qualify   thermal process validation; cleanroom
                       (where applic); EMP system
HACCP Cycle (pack)        plan + monitoring + verification +
                       reanalysis (annual + on-trigger)
PCQI Activity (pack)      ongoing per Part 117
FSVP Cycle (pack)         per supplier × per food × per cycle
Allergen Cycle (pack)     planning + monitoring + verification
Recall + Mock Recall (pack) annual mock + per real
EMP Cycle (pack)           per zone × per cycle
RFR Cycle (pack)            per event
IA Cycle (pack)             per facility × per cycle
GFSI Cycle (pack)            per cert cycle
USDA-FSIS Cycle (where applic) per inspection
```

---

## 5. APIs (pack-specific)

```
HACCP plan management API           E3 + E7
CCP monitoring API                   E3 + E15 (instrument feeds)
PCQI activity log API                 E3
FSVP supplier verification API         E3 + E15
Foreign Supplier audit + cert log API   E3
FSMA §204 KDE/CTE exchange API         E15 (trading partners)
Reportable Food Registry submission API E15 (FDA)
Recall execution API                    E3 + E7
Mock recall run API                      E3 + E13
EMP scheduling + result API               E3 + E15
Sanitation cycle API                       E3
Pest control service API                    E15 (from contractor)
Allergen control + verification API           E3
Intentional adulteration vulnerability API   E3
Food defense plan API                          E3
Sanitary transport record API                  E15
Thermal process validation API                 E3 + E13
Pasteurization record API                       E15
Process Authority letter management              E3 + E10
Customer / brand specification API                E3 + E5
USDA-FSIS HACCP integration (where applic)         E15
GFSI cert evidence API                              E3 + E8
```

---

## 6. UI surfaces

```
HACCP Plan Workspace                team chartering; hazard analysis
                                     per step; CCP identification;
                                     critical limit + monitoring +
                                     corrective + verification +
                                     record-keeping per Codex 7
                                     principles
CCP Monitoring Workspace              real-time + manual entry;
                                     excursion banner; corrective
                                     action wizard; product hold
                                     integration
PCQI Activity Workspace                qualification + activity log
FSVP Supplier Workspace                hazard analysis + verification
                                     activity per supplier
Allergen Control Workspace             ingredient inventory; cross-
                                     contact risk; line scheduling;
                                     verification post-cleanup
Sanitation Workspace                   pre-op + operational +
                                     post-op; SSOP per area
Pest Control Workspace                 service record + finding
                                     follow-up
Recall Workspace                        classification (I/II/III);
                                     fleet identification;
                                     consumer notification drafting;
                                     effectiveness
Mock Recall Workspace                   annual cycle; performance
                                     against time-target
FSMA §204 Traceability Console           KDE/CTE explorer; lot trace
                                     forward + backward; high-risk
                                     food identifier
RFR Submission Workspace                 RFR event flow per FSMA
                                     §423
EMP Console                              per zone; pathogen trend;
                                     environmental swab heatmap
Allergen Verification Workspace           post-cleanup verification
                                     entry
Food Defense Workspace                    IA vulnerability assessment
                                     + mitigation
Sanitary Transport Workspace               temperature + cleanliness
                                     per shipment
Thermal Process Validation Workspace        per process × per recipe
Process Authority Letter Console            per recipe
Customer Spec Workspace                       per customer × per product
GFSI Cert Workspace                            per cycle
Food Audit Pack Wizard                        FDA / GFSI inspection-ready
USDA-FSIS HACCP Workspace (where applic)      USDA jurisdiction
                                              integration
```

---

## 7. Pack discipline

```
FSMA Part 117 preventive controls       hazard analysis + preventive
                                        controls (process / sanitation /
                                        allergen / supply-chain)
HACCP team requirement                   trained team; PCQI in scope
HACCP plan reanalysis                    annual + on-trigger
                                        (per Part 117 §117.170)
Recall plan testing                       annual mock recall + per
                                        real
Foreign supplier verification              per FSVP
High-risk food §204 traceability           KDE/CTE captured + retained
                                        2 years
Reportable Food Registry timing            24 hours (per H1 §3)
Sanitation pre-op + operational +          per SSOP
   post-op
Allergen control labelling                 per FALCPA + EU 1169/2011
Cleanroom / GMP (where applicable)         per process
Calibration of CCP instruments               cycle per critical limit
                                        criticality
EMP for ready-to-eat                         per Listeria control program;
                                        Codex annexes
Process Authority for LACF + acidified         per Part 113 + 114
Pasteurization (Grade A dairy)                  per PMO
GFSI cert + per-customer brand                  per audit cycle
   conformance
Country-of-origin labelling                      per applicable jurisdiction
USDA-FSIS coordination                            for meat/poultry/egg products
EU food information to consumer                   1169/2011
2-person e-sig on HACCP plan reauthorization      per BD-26
Recall classification                              per BD-27 (FSMA recall)
PCQI sign-off on Food Safety Plan                  per Part 117
```

---

## 8. Pack KPIs

```
- CCP monitoring completion rate (target 100%)
- CCP excursion count + trend
- HACCP plan reanalysis on-time
- Mock recall time-to-100% trace (target ≤ 4 hours)
- FSVP completion per supplier
- §204 KDE/CTE completeness
- Allergen verification compliance
- Sanitation pre-op pass rate
- Pest control finding cycle time
- Customer complaint trend (food safety subset)
- EMP excursion rate
- Recall avoidance evidence
- GFSI audit findings
```

---

## 9. Audit pack contents (Food-specific addition to H3 §4)

```
- Food Safety Plan (Part 117) + HACCP plan per line
- Hazard analysis + preventive controls
- CCP records (sample selected; full retention)
- PCQI activity log
- FSVP supplier verification records
- Recall plan + mock recall records (last 24mo)
- Allergen control records + verification post-cleanup
- Sanitation records (pre-op / operational / post-op; SSOPs)
- Pest control records
- Calibration records (critical instruments)
- Training records (HACCP / PCQI / allergen / sanitation)
- Reportable Food Registry submissions
- §204 KDE/CTE records (high-risk foods; 2-year retention)
- EMP records + pathogen trend
- Intentional adulteration VA + Food Defense Plan
- Sanitary transport records
- Thermal process validation per LACF / acidified
- Pasteurization records (Grade A dairy)
- Process Authority letters (LACF / acidified)
- Customer / brand specification conformance
- GFSI cert + last 2 audits + responses
- USDA-FSIS HACCP (where applicable)
- Country-of-origin records
```

---

## 10. Failure modes

```
FM1   CCP excursion not handled within shift
      Recovery: batch hold; investigate; corrective action;
              H8 CAPA on monitoring discipline

FM2   Mock recall fails to reach 100% trace within 4 hours
      Recovery: §204 readiness gap; H8 systemic CAPA;
              regulator awareness if real recall would fail

FM3   Reportable Food Registry submission late
      Recovery: SEV-1 (24h window); H1 §3 + I3; H8 CAPA

FM4   FSVP supplier verification skipped
      Recovery: receipt blocked; FSVP completion before lot
              acceptance; H8 CAPA

FM5   Allergen cross-contact verified post-incident
      Recovery: lot trace-forward; consumer-notice if shipped;
              recall consideration; H8 CAPA + supplier
              communication

FM6   §204 KDE/CTE incomplete (missing data point)
      Recovery: lot held until complete; H8 CAPA on data capture;
              regulator readiness gap

FM7   HACCP plan reanalysis missed annual due
      Recovery: H6 surfaces; SEV-2; H8 CAPA on reanalysis trigger

FM8   PCQI absent during regulated activity
      Recovery: activity blocked; oversight gap; H8 CAPA
```

---

## 11. Cross-references

- H1 §2.6 — Food regulatory inventory
- H2 — thermal process validation; EMP cycle
- H4 — fsma204_traceability + complaint_record + recall classes
- H5 — 2-year FSMA retention floor
- H8 — CAPA from CCP + complaints + audits
- H9 — HACCP hazard analysis as risk discipline
- L1 — banned decisions BD-26..BD-28 (Food extension)
- L2 — AI features overlay (AI-09 anomaly extended)
- D11 — FSMA §204 traceability
- D12 — recall workflow
- E15 — FDA RFR + USDA-FSIS integrations
- I7 — food defense (per FSMA Part 121)
- M3 — root catalog includes Food-specific roots
- M9 — cross-reference

---

## 12. Decision phrase

```
J5_FOOD_BASELINE_LOCKED
PART_J_DEEP_UPGRADE_COMPLETE
NEXT: PART_K_BUSINESS/K0_PART_K_OVERVIEW.md
```
