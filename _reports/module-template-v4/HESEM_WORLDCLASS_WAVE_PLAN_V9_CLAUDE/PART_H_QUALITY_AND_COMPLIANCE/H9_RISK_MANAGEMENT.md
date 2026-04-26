# H9 — Risk Management

```
chapter_purpose: ICH Q9 quality risk management for pharma; ISO 14971
                 for med device; AIAG-VDA FMEA for automotive;
                 cross-vertical risk register
owner_role:      Quality Lead with Vertical Pack Leads
```

---

## 1. Risk frameworks per vertical

```
Pharma:        ICH Q9(R1) Quality Risk Management (2023)
Med Device:    ISO 14971:2019 Medical Device Risk Management
Automotive:    AIAG-VDA FMEA Handbook 2019 (replacing legacy RPN-only)
Aerospace:     ARP 4761 Safety Assessment + ISO 31000
General:       ISO 31000 (general risk management)
```

---

## 2. Risk register per HESEM customer

Each customer maintains their own risk register. HESEM's platform-side
risk register is in PART_M5.

Per-customer risk register includes:
- Process risks (per FMEA, HACCP, hazard analysis)
- Product risks (per ISO 14971 risk file for med device)
- Operational risks (supplier dependency, equipment failure, etc.)
- Compliance risks (regulator update, certification expiry)
- Cybersecurity risks (per IEC 62443, OWASP)

---

## 3. Risk severity scoring

Per AIAG-VDA 2019 Action Priority methodology (replacing RPN-only):
- Severity (1-10)
- Occurrence (1-10)
- Detection (1-10)
- Action Priority (H/M/L per AIAG-VDA lookup table)

ISO 14971 risk acceptability framework for med device:
- Severity × probability matrix
- Tolerable risk threshold per customer policy

---

## 4. Periodic risk review

Per H6 periodic review cadence. Risk register updates flow into:
- CAPA actions (when risk increases)
- Resource allocation
- Training programs
- Equipment investment

---

## 5. Decision phrase

```
H9_RISK_MANAGEMENT_BASELINE_LOCKED
PART_H_COMPLETE
NEXT: PART_I_OPERATIONS/I0_PART_I_OVERVIEW.md
```
