# S2-02 — C3 Planning + C4 Procurement

```
prompt_id:        S2-02
stream:           2
sequence:         2 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_2_DOMAINS_WORKFLOWS/S2-00_STREAM_MASTER.md
2. V9 baselines:
   PART_C_DOMAIN_CAPABILITIES/C3_PLANNING_PRODUCTION.md
   PART_C_DOMAIN_CAPABILITIES/C4_PROCUREMENT.md
3. Cross-references:
   D2 (P2P), D3 (P2P), M3 root catalog, M4 SM directory,
   J1 J2 J3 J4 J5 (per-pack: APQP/PPAP Auto; APQP-aero;
   FSVP food; DSCSA Pharma); E15 §2.8 (EDI); H8 (SCAR)
4. Standards:
   - ISA-95 functional hierarchy (planning levels)
   - APQP / PPAP / AS9145
   - AIAG MSA 4th + AIAG SPC 2nd
   - VDA 6.3 process audit
   - ICH Q10 (Pharma supply chain)
   - AS5553 / AS6174 (counterfeit)
   - FSMA FSVP (Food)
   - IATF 16949 §8.4 (procurement)
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C3_PLANNING_PRODUCTION.md
PART_C_DOMAIN_CAPABILITIES/C4_PROCUREMENT.md
```

## Depth requirements — C3 Planning

Resource families:
```
MPS Schedule; MRP Action; Demand; Supply Plan; Schedule;
Capacity Plan; APQP Project (Auto); APQP Phase Decision;
AS9145 APQP (Aero); Production Trial Run; Annual Layout
Inspection (Auto); Reliability Demonstration Plan;
Forecast Consumption Record
```

Capabilities (≥ 10):
```
- MPS Authoring + Feasibility Simulation
- MRP Engine (FEFO; per pack rules)
- Capacity Planning (rough-cut + detailed)
- Finite-Capacity Scheduling (sequence-aware; campaign mode)
- APQP Phase Management (Auto SM-APQP)
- AS9145 APQP Aero
- Demand Sensing + Forecast Consumption
- Production Trial Run
- Annual Layout Inspection (Auto)
- Per-pack scheduling overlay (campaign Pharma; allergen Food;
  ITAR segregation Aero; sterilization MD)
```

## Depth requirements — C4 Procurement

Resource families (full enumeration; per M3 + per pack):
```
PO; PO Line Item; Supplier; Supplier Site; Supplier Contact;
Supplier Qualification; Supplier Scorecard; SCAR; RTV; PREC
(Procurement Receipt); PSW (Auto); PPAP Submission (Auto);
ISIR (Auto); FSVP Hazard Analysis (Food); FSVP Verification
Activity (Food); NADCAP Cert Tracking (Aero); Counterfeit
Risk Assessment per Supplier (Aero); DSCSA Trading Partner
(Pharma); EU FMD Trading Partner (Pharma); Sub-Processor
Record (per L2 §8); Counterfeit Suspect Investigation (Aero)
```

Capabilities (≥ 15):
```
- Supplier Master Lifecycle
- Supplier Qualification (per BD-7; banned for AI per L1)
- Supplier Scorecard
- PO Authoring + Approval Routing
- 3-Way Match (per D2 §8)
- SCAR Cycle (per D6 + per supplier)
- PPAP Submission Cycle (Auto SM-PPAP; per BD-17)
- AS9120B Distributor Traceability (Aero)
- Counterfeit-Avoidance Plan + Per-Receipt Screen (Aero)
- GIDEP Submission (Aero per BD-22; per E15.11)
- DSCSA Trading Partner Onboarding (Pharma)
- EU FMD Partner Onboarding (Pharma)
- FSVP Hazard Analysis (Food; per FSMA Part 1)
- FSVP Verification Activity
- Sub-Processor Onboarding (per L2 §8 + I8 §6)
- NADCAP Cycle Tracking (Aero per AC7004 family)
```

## Required substance

C3: ≥ 4,000 words
C4: ≥ 4,500 words

## Acceptance criteria

```
[ ] All resource families enumerated
[ ] Each family: entity model + SM + APIs + UI + edges
[ ] ≥ 10 capabilities C3; ≥ 15 capabilities C4
[ ] Per-pack overlay substantive (J1..J5)
[ ] BD-7 supplier qualification banned-decision spec
[ ] DSCSA + FSVP + counterfeit + NADCAP + AS9145 + APQP all
    documented
[ ] Cross-references resolve
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S2-02_C3_C4_PLANNING_PROCUREMENT_DEEP_UPGRADE_COMPLETE
```

After emit: load `S2-03_C5_C6_INVENTORY_SHOPFLOOR.md` next.
