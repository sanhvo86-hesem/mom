# G14 — Wave W10: Vertical Packs

```
wave_id:        W10
wave_name:      Vertical Packs (Pharma + Auto + Aero + Med Device + Food)
predecessor:    W9
successor:      W11
calendar:       16-26 weeks (longest single wave; per-pack streams)
team_size:      14-18 FTE (per-vertical streams)
```

---

## 1. Goal

Package the vertical-specific extensions: Pharma (PART_J1), Automotive
(PART_J2), Aerospace (PART_J3), Medical Device (PART_J4), Food
(PART_J5). Each pack is independent and can be delivered in parallel
streams.

---

## 2. Entry criteria

W9 READY.

---

## 3. Per-pack work packages (streams)

### Pharma stream (8-10 weeks)
```
WP-W10-PH-01  Annual Product Review generator
WP-W10-PH-02  Manufacturing Deviation workflow
WP-W10-PH-03  Master + Executed Batch Record (MBR / EBR)
WP-W10-PH-04  Two-person e-signature on regulated transitions
WP-W10-PH-05  DSCSA serialization + EPCIS event exchange
WP-W10-PH-06  ICH E2B(R3) ICSR submission
WP-W10-PH-07  Stability program (study + pull + OOT alerts)
WP-W10-PH-08  Pharma audit pack (FDA inspection ready)
WP-W10-PH-09  EU GMP Annex 1 sterile sub-pack (optional)
```

### Automotive stream (6-8 weeks)
```
WP-W10-AU-01  APQP state machine + phase gates
WP-W10-AU-02  PPAP submission generator (18 elements)
WP-W10-AU-03  PFMEA ↔ Control Plan linkage + auto SPC enrollment
WP-W10-AU-04  CSR repository per OEM (Ford, GM, etc.)
WP-W10-AU-05  8D problem-solving workflow
WP-W10-AU-06  LPA + Annual Layout Inspection
WP-W10-AU-07  EDI ANSI X12 + EDIFACT integration
WP-W10-AU-08  Special process certs (CQI series)
```

### Aerospace stream (8-12 weeks)
```
WP-W10-AE-01  AS9102 Rev C FAI generator + bubble drawings
WP-W10-AE-02  NADCAP cert tracking + alerts
WP-W10-AE-03  Counterfeit-parts workflow + GIDEP reporting
WP-W10-AE-04  CMMC 2.0 control evidence pack per tenant
WP-W10-AE-05  ITAR access control + person-of-record verification
WP-W10-AE-06  DO-178C SCI tracking + tooling integration
WP-W10-AE-07  Service-life record + alerts
```

### Medical Device stream (6 weeks; if customer demand)
```
WP-W10-MD-01  ISO 14971 risk file engine
WP-W10-MD-02  21 CFR Part 803 MDR reportability + submission
WP-W10-MD-03  EU MDR Article 87 MIR submission
WP-W10-MD-04  UDI generator + GUDID / EUDAMED integration
WP-W10-MD-05  Design History File (DHF)
WP-W10-MD-06  Device History Record (DHR)
```

### Food stream (4-6 weeks; if customer demand)
```
WP-W10-FO-01  HACCP plan workflow
WP-W10-FO-02  PCQI record (Preventive Controls Qualified Individual)
WP-W10-FO-03  FSMA Section 204 traceability
WP-W10-FO-04  Allergen control
WP-W10-FO-05  Reportable Food Registry submission
```

---

## 4. Exit criteria

```
[ ] At least one vertical pack reaches L7 (productized)
[ ] Per-pack regulatory submission tested (e.g., DSCSA test event,
     PPAP submission, AS9102 generator output)
[ ] Per-pack audit pack export operational
[ ] Per-pack documentation: vertical-pack admin guide
```

A wave PASS does not require all 5 packs at L7; one pack at L7 plus
others at L4 or L5 is acceptable.

---

## 5. Decision phrases

```
W10_VERTICAL_PACKS_READY                  (all selected packs at target)
W10_VERTICAL_PACKS_PASS_WITH_GAPS         (most packs ready)
W10_VERTICAL_PACKS_PARTIAL_NEEDS_CONTINUATION
W10_VERTICAL_PACKS_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G14_WAVE_W10_BASELINE_LOCKED
NEXT: G15_WAVE_W11.md
```
