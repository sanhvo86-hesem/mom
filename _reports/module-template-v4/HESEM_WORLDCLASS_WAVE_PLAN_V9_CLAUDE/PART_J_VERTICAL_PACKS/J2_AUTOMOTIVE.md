# J2 — Automotive Vertical Pack

```
pack_id:        Automotive
owner_role:     Automotive Lead with Quality Engineer
wave_target:    W10
```

---

## 1. New roots

```
APQP                          Advanced Product Quality Planning project
PSW                           Part Submission Warrant
PPAP                          Production Part Approval Process submission
Control Plan                  per characteristic
Gauge R&R Study               per AIAG MSA 4th
Initial Sample Inspection     PPAP Form
Special Process Cert          per CQI series (CQI-9, 11, 12, 15, 17, 23, 27)
Annual Layout Inspection
Warranty Claim
Field Return
Requirement Link              per-OEM CSR (Ford Q1, GM BIQS, etc.)
LPA Plan + LPA Audit Run     Layered Process Audit per IATF 16949
8D Investigation              automotive problem-solving
```

---

## 2. Per-pack workflows

```
APQP project lifecycle (5 phases)
PPAP submission (18 elements)
LPA cycle (4 layers: operator/sup/mgmt/sr-mgmt)
Annual Layout Inspection
8D problem-solving (D1-D8)
Customer EDI exchange (850, 856, 810, 860, 862, 865, 997)
SCAR (procurement supplier corrective action)
```

---

## 3. Per-pack APIs

```
PPAP submission generator (E13 long-running)
APQP phase advancement
Control Plan management
GR&R study lifecycle
Customer EDI engine (E15.8)
Special process cert tracking
Warranty claim ingestion
8D workflow
LPA audit submission
```

---

## 4. Per-pack UI surfaces

```
APQP Workspace + Project Detail
PPAP Submission Wizard (18-element)
Control Plan Workspace
GR&R Workspace
Special Process Cert Workspace
Warranty / Field Return Workspace
LPA Audit Workspace
8D Investigation Workspace
EDI Transaction Viewer
```

---

## 5. Per-pack discipline

```
- 2-person e-signature on APQP phase advancement
- PPAP submission level (1-5; default Level 3)
- AIAG-VDA 2019 action priority (replacing legacy RPN-only)
- Special characteristics taxonomy (CC / SC / KPC / KCC) auto-enrolled in SPC
- IMDS material data declaration
```

---

## 6. Standards governing

Per H1 §1 Automotive list:
IATF 16949, VDA 6.3, VDA 6.5, AIAG-VDA FMEA 2019, AIAG MSA 4th, AIAG SPC,
AIAG APQP, AIAG PPAP 4th, ISO 26262 (E/E), ASPICE, CQI series.

---

## 7. Audit pack contents

```
- IATF 16949 conformance evidence
- ISO 9001 conformance evidence
- Per-customer CSR evidence
- LPA records (12 months)
- Internal audit records
- Management review minutes
- CAPA log
- Supplier monitoring + scorecards
- Customer scorecard
- COPQ trend
- Annual layout inspection results
- Special process certifications
- PPAP submissions
```

---

## 8. Decision phrase

```
J2_AUTOMOTIVE_BASELINE_LOCKED
NEXT: J3_AEROSPACE.md
```
