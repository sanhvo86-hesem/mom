# S2-06 — C10 Workforce + C11 Finance

```
prompt_id:        S2-06
stream:           2
sequence:         6 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: C10_WORKFORCE_TRAINING.md, C11_FINANCE.md
3. Cross-refs: D8 (Train to Qualify); D3 §7 (eligibility);
   I8 §1 (onboarding); E1 (identity); J1-J5 (per-pack roles)
4. Standards: 21 CFR 211.25 (qualified personnel; Pharma);
   ISO 13485 §6.2 (competency); IATF 16949 §7.2; AS9100D §7.2;
   FSMA Part 117 §117.4 (PCQI); EU GMP Annex 1 (aseptic);
   GAAP / IFRS for cost accounting
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C10_WORKFORCE_TRAINING.md
PART_C_DOMAIN_CAPABILITIES/C11_FINANCE.md
```

## Depth requirements — C10

Resource families:
```
Person; Skill; Training Plan; Training Course; Training Record;
Competency Matrix; Competency Assessment; Schedule; Shift;
Aseptic Personnel Qualification (Pharma); HACCP Team Charter
(Food); PCQI Record (Food); ITAR Person-of-Record (Aero);
NADCAP Auditor Cert (Aero); LPA Auditor Cert (Auto); 8D Lead
Cert (Auto); QP / Designated Person Record (Pharma);
PRRC / AR / Importer Record (MD); DPO Record (per GDPR Art 37)
```

Capabilities (≥ 12):
```
- Person Master + Onboarding (per E1 + I8)
- Competency Matrix Authoring + Maintenance
- Skill Catalog Management
- Training Course Authoring + Approval
- Training Assignment (per D8 + per D7 §7 trigger)
- Eligibility Resolver Integration (per D3 §7)
- Certification with E-Sig (per BD-6; per L1)
- Recertification Cycle (per pack frequency)
- Aseptic Annual Requalification (Pharma)
- ITAR Person-of-Record Verification (Aero per J3 §5)
- PCQI Appointment + Activity Log (Food)
- HACCP Team Charter (Food)
```

## Depth requirements — C11

Resource families:
```
Cost Center; GL Account; GL Posting; Cost Roll; Standard Cost;
Actual Cost; WIP Cost; Variance; Inventory Valuation; COPQ;
Tax / Sales-Tax Record; Currency Conversion Record;
Withholding Tax Record (per jurisdiction)
```

Capabilities (≥ 8):
```
- Cost Center Master Lifecycle
- Standard Cost Authoring + Effectivity
- Actual Cost Capture per WO
- WIP Cost Roll
- Variance Analysis (price; usage; efficiency)
- Inventory Valuation (FIFO; LIFO; Weighted Avg)
- COPQ Reporting (per H8 + per D6 cycle)
- GL Posting + Audit Trail (per H4 EC-22)
```

## Required substance

C10: ≥ 4,000 words; C11: ≥ 3,500 words

## Acceptance criteria

```
[ ] All resource families enumerated
[ ] ≥ 12 C10 capabilities; ≥ 8 C11 capabilities
[ ] BD-6 certification banned-decision spec
[ ] Per-pack overlay substantive (aseptic Pharma; PCQI Food;
    ITAR Aero; PRRC MD; per-OEM Auto)
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S2-06_C10_C11_WORKFORCE_FINANCE_DEEP_UPGRADE_COMPLETE
```

After: load `S2-07_D1_ORDER_TO_CASH.md`.
