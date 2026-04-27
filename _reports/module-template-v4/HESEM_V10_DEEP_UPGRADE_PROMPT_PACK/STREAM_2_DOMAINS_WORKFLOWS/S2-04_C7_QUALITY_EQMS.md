# S2-04 — C7 Quality / eQMS (Standalone)

```
prompt_id:        S2-04
stream:           2
sequence:         4 of 14
estimated_effort: ~80 minutes (DENSEST DOMAIN; alone)
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: C7_QUALITY_IMPROVEMENT.md (V9 already 373 lines but
   needs significant deepening)
3. Cross-refs: D5 (disposition), D6 (NC to CAPA), D7 (Doc to
   Release), D10 (Batch Release), D12 (Recall), D13 (Audit),
   D14 (Validate to Qualify); H1..H9 entire compliance Part;
   J1-J5 packs (Quality is heaviest in Pharma + MD); L1
   banned decisions (BD-1..BD-8 mostly Quality); L2 AI advisory
4. Standards: 21 CFR 211 + 820 + 11; EU GMP Annex 11/15/16/1;
   ISO 13485:2016; ISO 14971:2019; IATF 16949 §10.2.3 (8D);
   AS9100D §8.7 + §10.2; FSMA Part 117; ICH Q9 Q10 Q12;
   FDA OOS guidance; FDA Foreign Inspection Process;
   EU MDR vigilance; PIC/S inspection
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C7_QUALITY_IMPROVEMENT.md
```

## Depth requirements

C7 is the densest domain. Resource families (≥ 30 inc. pack
overlays):

```
NC (NQCASE); CAPA; 8D Investigation (Auto); Audit Finding; Audit
Plan; Audit Run; Doc Review; Doc Effectivity; Inspection (IQC +
IPC + FQC + IPQC); Inspection Plan; Inspection Sample Plan;
Disposition; Batch Release (BREL); QP Declaration (Pharma);
PRRC Decision (MD); APR (Pharma); Stability Study + Stability
Pull (Pharma); Deviation (Pharma SM-DEV); Vigilance Report
(MD; SM-VIG); PSUR (MD; SM-PSUR); PMS Plan + Report (MD);
Clinical Evaluation Report (MD); ICSR (Pharma; SM-ICSR);
Risk Management File (per ISO 14971); Risk Acceptability
Policy; Risk Record (per H9); Customer Complaint
(SM-CMPLT); Recall Decision (SM-11); FSCA (MD; SM-FSCA);
Field Alert Report (Pharma); Reportable Food Registry (Food);
Mock Recall Run (Food); Validation Master Plan; Validation
Pack (per H2 §7); Cleaning Validation (Pharma); Annual Layout
Inspection (Auto); Counterfeit Investigation (Aero;
SM-COUNTERFEIT); HACCP Plan (Food); CCP Monitoring (Food);
Allergen Control (Food); MRB Decision Record (multi-party
disposition)
```

Per family: full entity + SM + lifecycle + APIs + UI + edges +
failure modes + KPIs.

Capabilities (≥ 25):

```
- NC Authoring + Triage (per BD-2 disposition)
- CAPA Lifecycle (per BD-3; per H8)
- 8D Investigation (per IATF 10.2.3)
- Internal Audit Program
- External Audit Coordination
- Doc Review Cycle
- Inspection Plan Authoring (per spec; per supplier)
- IQC + IPC + FQC + IPQC Execution
- Disposition Decision (BD-2; SM-5 + MRB)
- Batch Release (BD-1; per D10; SM-10; QP / PRRC)
- APR Generation (per Pharma; per BD-9)
- PSUR Generation (per MD; per BD-14)
- Stability Program (Pharma; SM-STAB)
- Deviation Cycle (Pharma; SM-DEV)
- Vigilance Reportability + Submission (MD; per BD-15)
- ICSR Submission (Pharma; per E15.13)
- Risk Management File (per ISO 14971)
- Customer Complaint Cycle
- Recall Decision + Execution (per BD-8; SM-11)
- FSCA Cycle (MD)
- Mock Recall (Food + per pack; annual)
- Validation Master Plan (per H2)
- Cleaning Validation Cycle (Pharma)
- HACCP Plan Authoring + Reanalysis (Food per BD-26)
- CCP Monitoring Real-Time (Food)
- MRB (Material Review Board) workflow (D5 §5)
- AI Advisory Integration (per L2 features in Quality)
- Audit Pack Export (per H3 §4)
- Annual Periodic Review (per H6 + Annex 11 §11)
```

State machines documented (per M4):
- SM-4 Inspection Receipt (full table)
- SM-5 Disposition (full table; BD-2)
- SM-6 NC/CAPA (full table; BD-3)
- SM-7 Document (full table; BD-4)
- SM-10 Batch Release (full table; BD-1)
- SM-11 Recall (full table; BD-8)
- SM-12 Audit Finding (full table; BD-12 close)
- SM-13 Risk Assessment (full table)
- SM-14 Validation Lifecycle (full table)
- SM-DEV (Pharma)
- SM-STAB (Pharma)
- SM-ICSR (Pharma)
- SM-VIG (MD)
- SM-PSUR (MD)
- SM-FSCA (MD)
- SM-CCP-MONITOR (Food)
- SM-COUNTERFEIT (Aero)
- SM-FAI (Aero)
- SM-PPAP (Auto)
- SM-LPA (Auto)
- SM-8D (Auto)

## Required substance

≥ 10,000 words. C7 is the densest domain in V10.

## Acceptance criteria

```
[ ] All ≥ 30 resource families enumerated
[ ] All ≥ 21 state machines fully tabled (canonical + pack)
[ ] ≥ 25 capabilities documented
[ ] All BD-1..BD-8 + BD-9..BD-12 + BD-13..BD-16 + BD-17..BD-19
    + BD-20..BD-25 + BD-26..BD-28 callouts referenced
[ ] Per-pack overlay substantive (J1..J5)
[ ] AI advisory integration (per L2)
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
[ ] Length ≥ 10,000 words
```

## Decision phrase

```
S2-04_C7_QUALITY_EQMS_DEEP_UPGRADE_COMPLETE
```

After: load `S2-05_C8_C9_TRACE_MAINTENANCE.md`.
