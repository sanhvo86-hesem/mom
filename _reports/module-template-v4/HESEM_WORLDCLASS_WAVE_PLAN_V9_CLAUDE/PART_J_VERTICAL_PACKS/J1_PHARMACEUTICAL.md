# J1 — Pharmaceutical Vertical Pack

```
pack_id:        Pharma
owner_role:     Pharma Lead with Compliance Lead
wave_target:    W10
```

---

## 1. New roots

```
Annual Product Review (APR)              per ICH Q7 §2.5 + 21 CFR 211.180(e)
Manufacturing Deviation                  per 21 CFR 211 + Annex 11
Master Batch Record + Executed Batch     per ISA-88 + 21 CFR 211.188
QC Sample
Stability Study + Stability Pull         per ICH Q1 stability program
Safety Report (ICSR) per E2B(R3)         per pharmacovigilance
DSCSA Transaction                         US drug supply chain security
Serialized Unit                           DSCSA aggregation + EPCIS
QP Declaration                            EU GMP Annex 16
```

---

## 2. Per-pack workflows

```
D10 Batch to Release      (the densest pharma workflow)
APR generation cycle       quarterly + annual review
Stability program          continuous OOS / OOT monitoring
ICSR submission            7-day expedited / 15-day expedited / periodic
DSCSA event exchange       per receipt / shipment / dispense / destruction
Recall (Class I-III)        per 21 CFR Part 7
```

---

## 3. Per-pack APIs

```
APR generation (long-running per E13)
DSCSA transaction publish (E15.9)
EPCIS event exchange
ICH E2B(R3) ICSR submission
Stability program management
Pharma audit pack export
```

---

## 4. Per-pack UI surfaces

```
EBR Workspace + Record Shell (heaviest regulated UI in HESEM)
APR Workspace
Deviation Workspace
QC Sample Workspace
Stability Study Workspace + Pull Schedule
DSCSA Transaction Workspace
ICSR Submission Workspace
Pharma Audit Pack Wizard (FDA inspection-ready)
```

---

## 5. Per-pack discipline

```
- 2-person e-signature on BREL approve_release, CAPA close, ECO approve
- Mandatory reason-for-change on every mutation
- Validation enforcement: every chain component validated before release
- Backdating beyond 24h requires e-signature + justification
- WORM permanent storage for batch records
- Extended retention: 1 year past expiration (US) or longer per ICH stability
```

---

## 6. Standards governing this pack

Per H1 §1 Pharma list. Headlines:
- 21 CFR Part 11, 210, 211, 314, 803
- EU GMP Annex 1, 11, 13, 15, 16
- ICH Q7, Q9, Q10, Q12, Q14, E2B(R3)
- WHO TRS 957 / 992
- DSCSA + EPCIS
- ISO 14644 (cleanrooms)
- USP <1058>

---

## 7. Audit pack contents

```
- Validation Master Plan
- IQ/OQ/PQ records
- 24-month batch records (sampled)
- 24-month deviation log
- 24-month complaint log
- 24-month CAPA log
- 3-year APRs
- Stability program summary
- Personnel training records
- Equipment qualification + calibration
- Cleaning validation
- Environmental monitoring (sterile only)
- Water system monitoring
- Supplier qualification
- DSCSA event log
```

24-hour SLA on inspector-requested export.

---

## 8. Decision phrase

```
J1_PHARMACEUTICAL_BASELINE_LOCKED
NEXT: J2_AUTOMOTIVE.md
```
