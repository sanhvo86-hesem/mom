# S2-01 — C1 Commercial-Customer + C2 Product-Engineering

```
prompt_id:        S2-01
stream:           2
sequence:         1 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_2_DOMAINS_WORKFLOWS/S2-00_STREAM_MASTER.md
2. V9 baselines:
   PART_C_DOMAIN_CAPABILITIES/C1_COMMERCIAL_CUSTOMER.md
   PART_C_DOMAIN_CAPABILITIES/C2_PRODUCT_ENGINEERING.md
3. Cross-references:
   M3 root catalog (C1 + C2 roots);
   M4 SM directory (SM-1 Order; SM-7 Doc lifecycle);
   D1 (Order to Cash); D7 (Document to Release);
   E4 (record API per domain); F4 + F5 (workspace + record);
   J2 + J3 (Auto + Aero per-pack overlay);
   J4 (MD DHF + DMR)
4. Standards:
   - 21 CFR 820.30 design controls (MD)
   - ISO 13485 §7.3 (design)
   - IATF 16949 §8.3 (design); AIAG-VDA FMEA 2019;
     AIAG APQP 2nd; AIAG PPAP 4th
   - AS9100D §8.3 (design); AS9145 (APQP-aero)
   - DO-178C / DO-254 (Aero E/E)
   - ISO 26262 (Auto E/E)
   - ICH Q12 (Pharma lifecycle); ICH Q14 (Pharma analytical)
   - DDD (Domain-Driven Design)
```

## Deliverable

```
PART_C_DOMAIN_CAPABILITIES/C1_COMMERCIAL_CUSTOMER.md
PART_C_DOMAIN_CAPABILITIES/C2_PRODUCT_ENGINEERING.md
```

## Depth requirements — C1 Commercial-Customer

Resource families (full enumeration; per M3):
```
Quote (QUO); Sales Order (SO); Customer PO (CPO); Customer Order
Forecast; Customer Order Schedule; Customer; Customer Site;
Customer Contact; Pricing Catalog; Pricing Override; Customer
Contract; Customer MSA; Customer Specific Requirement (CSR);
RMA; Sales Forecast; Demand Plan; Order Hold (Credit /
Engineering / Quality); Customer Concession Acceptance Record;
Customer Vigilance Contact (where MD applic); Customer DSCSA
Trading Partner (where Pharma)
```

Per family:
```
1. Entity model (full fields; semantics; constraints; PII flag)
2. SM (transition table per family; SM-1 for SO + CPO)
3. Lifecycle events
4. Per-pack overlay (Auto: per-OEM CSR; Aero: ITAR; MD:
   vigilance contact)
5. APIs (per E4)
6. Frontend surfaces (per F4 + F5)
7. Cross-domain edges
8. Failure modes
9. KPIs
```

Capabilities (≥ 12; concrete):
```
- Quote Authoring + Versioning
- SO Capture + Validation (incl. Credit Hold; Engineering Hold)
- Customer Master Lifecycle
- Pricing Engine (per-customer; per-tier; per-volume; per-CSR)
- Forecast Ingestion + Demand Planning
- Allocation Logic (FEFO; per pack)
- Order Hold Handling (credit; engineering; quality; recall)
- RMA Handling
- Customer Concession Workflow (linked to D5 + D7)
- Customer-Specific Requirement (CSR) Overlay (per H1 §7)
- Customer Portal (per F1)
- Customer Vigilance Contact Management (MD pack)
```

## Depth requirements — C2 Product-Engineering

Resource families (full enumeration):
```
Item; Item Family; Item Spec; BOM; BOM Component (sub-record);
Routing; Routing Operation (sub-record); Operation Step;
Drawing; Drawing Revision; ECO; ECO Affected Item; Spec; Spec
Revision; DFMEA; PFMEA; PFD; HARA / ASIL (Auto E/E); FMECA
(Aero per ARP 4761); System Development Data (ARP 4754A);
DHF (MD); DMR (MD); SOUP / OTSS Register (MD per IEC 62304);
Predetermined Change Control Plan PCCP (MD AI per L3 §6);
Cyber Threat Model + SBOM (per I7); Software Configuration
Item DO-178C SCI (Aero); Hardware Configuration Item DO-254
HCI (Aero); Counterfeit Risk Assessment per Item (Aero)
```

Per family same depth as C1.

Capabilities (≥ 15):
```
- Item Master Lifecycle + per-pack overlays
- BOM Authoring + Multi-Level + Effectivity
- Routing Authoring (per ISA-88; per workcell)
- Spec Authoring + Revision (per ECO)
- ECO Workflow (SM-7; per BD-5)
- DFMEA Authoring (per AIAG-VDA 2019)
- PFMEA Authoring (per AIAG-VDA 2019)
- HARA / ASIL (per ISO 26262 Auto E/E)
- DHF + DMR (MD per 21 CFR 820.30)
- IEC 62304 Software Lifecycle (MD)
- DO-178C / DO-254 lifecycle (Aero)
- ARP 4754A / 4761 safety case (Aero)
- Cyber Threat Model per Device (per I7 + L4)
- SOUP register per IEC 62304 (MD)
- Counterfeit Avoidance per AS5553 / AS6174 (Aero)
```

## Required substance

C1: ≥ 4,500 words
C2: ≥ 5,500 words (denser due to design controls)

## Acceptance criteria

```
[ ] All resource families enumerated (per M3)
[ ] Each family: entity model + SM + lifecycle + APIs + UI +
    cross-domain edges + failure + KPI
[ ] ≥ 12 capabilities in C1; ≥ 15 in C2
[ ] Per-pack overlay (J1..J5) substantive
[ ] Cross-references resolve
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S2-01_C1_C2_COMMERCIAL_ENGINEERING_DEEP_UPGRADE_COMPLETE
```

After emit: load `S2-02_C3_C4_PLANNING_PROCUREMENT.md` next.
