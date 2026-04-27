# S2-03 — C5 Inventory + C6 Shopfloor / MES

```
prompt_id:        S2-03
stream:           2
sequence:         3 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: C5_INVENTORY_LOGISTICS.md, C6_SHOPFLOOR_MES.md
3. Cross-refs: D3 (Plan to Produce), D4 (Receive to Inspect),
   D11 (Release to Trace), M3, M4 (SM-3 WO), J1-J5 packs
4. Standards: ISA-95 + ISA-88; OPC-UA + MQTT for SCADA;
   PackML for OT state; AIAG SPC 2nd; per-pack
   (DSCSA + EU FMD + UDI + FSMA §204 + Aero S/N + ITAR);
   IEC 62443 for OT cyber
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C5_INVENTORY_LOGISTICS.md
PART_C_DOMAIN_CAPABILITIES/C6_SHOPFLOOR_MES.md
```

## Depth requirements — C5

Resource families:
```
Item (cross-ref C2); Lot; Serial; Bin/Location; Stock Move;
Adjustment; Cycle Count; Cycle Count Variance; Reservation;
Quarantine State; Concession-Released Lot Flag; DSCSA Transaction
+ Serialized Unit (Pharma); EU FMD Pack-Level Decommissioning
(Pharma); FSMA §204 KDE/CTE (Food high-risk); Material
Traceability Chain (Aero per AS9120B); ITAR Item Control (Aero);
EAR Item Classification (Aero); UDI per Device (MD)
```

Capabilities (≥ 12):
```
- Lot/Serial Lifecycle + Genealogy Edge Creation
- Bin / Location / Zone Management (per ISA-95)
- Stock Move + Adjustment + Cycle Count
- Reservation + Allocation (FEFO; per pack)
- Quarantine State Management
- Concession-Release Flag Propagation
- DSCSA TI/TH/TS Capture + Exchange (Pharma per E15.9)
- EU FMD Decommissioning at Dispense (Pharma)
- UDI Capture per Device-Unit (MD per E15.10)
- FSMA §204 KDE/CTE Capture (Food per E15.12)
- AS9120B Lot → Heat → Coil Traceability (Aero)
- ITAR / EAR Item Control (Aero per J3)
```

## Depth requirements — C6

Resource families:
```
WO; WO Operation (sub-record); WO Step; Operation; Yield Record;
SPC Chart; SPC Sample; First-Piece Inspection; Edge Gateway;
Edge Gateway Site; SCADA Connection; Workcell + Workcell State;
EBR (Pharma); Cleaning Validation Cycle (Pharma); EM Run
(Pharma sterile); Media Fill Run (Pharma); LPA Run (Auto);
LPA Plan (Auto); FAI Record (Aero); Service-Life-Limited Part
Record (Aero); Engine Maintenance Record (Aero Part 145);
HACCP Plan + CCP Monitoring Record (Food); Allergen Control
Plan (Food); Sanitation Record (Food); Process Authority
Letter (Food LACF); Pasteurization Record (Food Grade A)
```

Capabilities (≥ 18):
```
- WO Lifecycle (SM-3 transitions)
- Eligibility Resolver (per D3 §7 — canonical gate)
- Operation Step Execution + Per-Step Evidence
- Yield + Scrap Capture
- SPC Engine (Western Electric + Nelson rules)
- First-Piece Inspection Cycle
- Edge Gateway Lifecycle
- SCADA Integration (OPC-UA + MQTT)
- PackML State Machine
- Connected Worker PWA + Offline Tolerance
- EBR per Batch (Pharma SM-10 + per ISA-88)
- Cleaning Validation Cycle (Pharma per SM-CLEANING-V)
- EM (Environmental Monitoring) per Zone (Pharma sterile)
- Media Fill Cycle (Pharma per Annex 1)
- LPA Cycle per Layer (Auto SM-LPA)
- AS9102 First Article (Aero SM-FAI)
- Service-Life-Limited Part Tracking (Aero)
- HACCP CCP Monitoring Real-Time (Food SM-CCP-MONITOR)
- Sanitation Pre-op + Operational + Post-op (Food)
- Sterilization Cycle (MD per ISO 11135/11137/17665)
```

## Required substance

C5: ≥ 4,000 words
C6: ≥ 5,500 words (densest non-Quality domain)

## Acceptance criteria

```
[ ] Resource families enumerated per pack overlays
[ ] ≥ 12 C5 capabilities; ≥ 18 C6 capabilities
[ ] Eligibility Resolver canonical gate fully spec
[ ] DSCSA + UDI + §204 + AS9120B integration spec
[ ] EM + media fill + cleaning val + LPA + FAI + HACCP CCP per
    pack
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S2-03_C5_C6_INVENTORY_SHOPFLOOR_DEEP_UPGRADE_COMPLETE
```

After: load `S2-04_C7_QUALITY_EQMS.md`.
