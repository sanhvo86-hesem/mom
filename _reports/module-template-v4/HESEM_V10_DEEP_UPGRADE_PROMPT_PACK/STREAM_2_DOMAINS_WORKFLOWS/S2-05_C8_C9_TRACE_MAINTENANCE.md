# S2-05 — C8 Traceability + C9 Maintenance

```
prompt_id:        S2-05
stream:           2
sequence:         5 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: C8_TRACEABILITY_GENEALOGY.md, C9_MAINTENANCE_EHS.md
3. Cross-refs: D9 (Maintain to Restore), D11 (Release to
   Trace), D12 (Recall), B3 (OTG genealogy), J1-J5 packs,
   E15 (DSCSA + UDI + §204 + GIDEP integrations)
4. Standards: 14 CFR Part 145 (Aero MRO); FAA Form 8130-3 RTS;
   ISO/IEC 17025 (calibration labs); USP <1058>; ASTM E2500;
   AIAG MSA 4th; DSCSA + EU FMD + UDI; FSMA §204; AS9120B
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C8_TRACEABILITY_GENEALOGY.md
PART_C_DOMAIN_CAPABILITIES/C9_MAINTENANCE_EHS.md
```

## Depth requirements — C8

Resource families:
```
Lot Genealogy Edge; BREL (Batch Release); Recall Record;
Release Packet; Genealogy Snapshot; Serial; UDI (MD); DSCSA
Transaction Set + Serialized Unit (Pharma); EU FMD Pack-Level
Decommissioning (Pharma); FSMA §204 KDE/CTE (Food); Aero S/N
+ Service-Life-Limited Trace (Aero); Auto Per-VIN Trace (Auto)
```

Capabilities (≥ 10):
```
- Lot Genealogy Edge automatic creation per OPER complete
- mv_otg_genealogy_upstream materialized view
- BREL workflow with full evidence chain
- Recall scope identification (forward + backward genealogy)
- Release Packet generator + signed bundle
- DSCSA TI/TH/TS exchange (Pharma)
- EU FMD pack-level decommissioning
- UDI generation + GUDID + EUDAMED submission (MD)
- FSMA §204 KDE/CTE capture (Food)
- Per-VIN traceability (Auto Tier-1)
```

## Depth requirements — C9

Resource families:
```
Asset; Asset Class; PM Plan; PM Cycle; MWO; Calibration Record;
Calibration Master; Equipment Qualification (IQ/OQ/PQ); Spare
Part; Asset State; Tooling Record; Service Bulletin Compliance
(Aero); Airworthiness Directive Compliance (Aero); Engine
Maintenance Record (Aero Part 145); Service-Life-Limited Part
Replacement (Aero); Cleaning Validation Cycle (Pharma);
Sterilizer Cycle (MD); Pasteurizer Cycle (Food); Thermal
Process Validation (Food LACF); EHS Incident; LOTO Procedure
```

Capabilities (≥ 12):
```
- PM Schedule Lifecycle
- MWO Authoring + Dispatch (per D9 SM-9)
- Calibration Cycle (per ISO/IEC 17025)
- OOT Impact Handling (canonical per D9 §6)
- IQ/OQ/PQ Equipment Qualification (per H2 + per USP <1058>)
- Predictive Maintenance Integration (AI-04 advisory)
- Spare-Part Demand → D2 cycle
- LOTO Procedure (per OSHA 1910.147)
- AD/SB Compliance (Aero per BD-25)
- Service-Life-Limited Tracking (Aero)
- Sterilizer Revalidation Cycle (MD)
- Thermal Process Validation Cycle (Food LACF)
```

## Required substance

C8: ≥ 4,500 words; C9: ≥ 4,500 words

## Acceptance criteria

```
[ ] All resource families enumerated
[ ] ≥ 10 C8 capabilities; ≥ 12 C9 capabilities
[ ] Genealogy depth-20 query spec
[ ] OOT impact canonical per D9 §6
[ ] Per-pack overlay (J1..J5)
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S2-05_C8_C9_TRACE_MAINTENANCE_DEEP_UPGRADE_COMPLETE
```

After: load `S2-06_C10_C11_WORKFORCE_FINANCE.md`.
