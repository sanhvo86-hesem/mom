# G14 — Wave W10: Vertical Packs

```
wave_id:        W10
wave_name:      Vertical Packs (Pharma + Auto + Aero + MD + Food)
predecessor:    W9
successor:      W11
calendar:       16-26 weeks (longest single wave; per-pack streams)
team_size:      14-18 FTE (per-vertical parallel streams)
investment:     ~$2.5M (largest investment wave;
                vertical specialization)
```

---

## 1. Goal

Package the vertical-specific extensions: Pharma (J1), Auto (J2),
Aero (J3), Med Device (J4), Food (J5). Each pack independent +
delivered in parallel streams. Per-pack regulator submission
tested, per-pack audit pack operational, per-pack AI features GA.

---

## 2. Entry criteria

```
[ ] W9 READY (validation + compliance closure)
[ ] AI advisory mainstream features live (per W7)
[ ] Audit pack export at L4 (per W7)
[ ] First customer pilot tenant identified per pack
[ ] Per-pack regulator account onboarded (FDA / EMA / NB / etc.)
```

---

## 3. Per-pack work packages

### 3.1 Pharma stream (8-10 weeks)

```
WP-W10-PH-01  APR generator (per J1; AI-21 advisory)
WP-W10-PH-02  Manufacturing Deviation workflow (SM-DEV)
WP-W10-PH-03  Master + Executed Batch Record (MBR / EBR)
WP-W10-PH-04  Two-person e-sig on regulated transitions
              (BD-1, BD-9..BD-12 per L1 §3)
WP-W10-PH-05  DSCSA serialization + EPCIS event exchange
              (per E15 §2.9)
WP-W10-PH-06  ICH E2B(R3) ICSR submission (per E15 §2.13)
WP-W10-PH-07  Stability program (study + pull + OOT alerts;
              SM-STAB)
WP-W10-PH-08  Pharma audit pack (FDA inspection ready;
              per H3 §4 + J1 §10)
WP-W10-PH-09  EU GMP Annex 1 sterile sub-pack (where
              tenant scope demands; EM, media fill,
              cleaning val)
WP-W10-PH-10  EU FMD pack-level decommissioning
              (per E15 §2.9)
WP-W10-PH-11  AI-21 APR drafting + per Pharma overlay
WP-W10-PH-12  AI-32 periodic review brief generator
```

### 3.2 Automotive stream (6-8 weeks)

```
WP-W10-AU-01  APQP state machine + phase gates (SM-APQP)
WP-W10-AU-02  PPAP submission generator (18-element;
              SM-PPAP; per BD-17)
WP-W10-AU-03  PFMEA ↔ Control Plan linkage + auto SPC
              enrollment for special characteristics
WP-W10-AU-04  CSR repository per OEM (Ford / GM / Stellantis
              / Toyota / VW / BMW / Hyundai / Tesla / etc.)
WP-W10-AU-05  8D problem-solving workflow (SM-8D)
WP-W10-AU-06  LPA + Annual Layout Inspection (SM-LPA)
WP-W10-AU-07  EDI ANSI X12 + EDIFACT (per E15 §2.8)
WP-W10-AU-08  Special process certs (CQI-9/11/12/15/17/23/27)
WP-W10-AU-09  IMDS material data submission
WP-W10-AU-10  ISO 26262 / ASPICE evidence (where E/E)
WP-W10-AU-11  AI-12 yield-loss driver ranking
              (Auto overlay)
```

### 3.3 Aerospace stream (8-12 weeks)

```
WP-W10-AE-01  AS9102 Rev C FAI generator + bubble drawings
              (SM-FAI; per BD-20)
WP-W10-AE-02  NADCAP cert tracking + alerts (SM-NADCAP-CERT)
WP-W10-AE-03  Counterfeit-parts workflow (SM-COUNTERFEIT;
              per BD-21) + GIDEP reporting (per E15 §2.11
              + per BD-22)
WP-W10-AE-04  CMMC 2.0 control evidence pack per tenant
              (per J3 §5)
WP-W10-AE-05  ITAR access control + person-of-record
              verification (SM-ITAR-ACCESS; per BD-24)
WP-W10-AE-06  DO-178C SCI tracking (SM-DO-178C SCI)
WP-W10-AE-07  DO-254 HCI tracking (SM-DO-254 HCI)
WP-W10-AE-08  Service-life-limited record + alerts
WP-W10-AE-09  AD / SB compliance (SM-AD; per BD-25)
WP-W10-AE-10  AS9120B distributor traceability
              (where tenant scope)
WP-W10-AE-11  AI-18 counterfeit risk indicator
WP-W10-AE-12  US-only deployment for ITAR tenants
              (per B6 C5 + I4 §5)
```

### 3.4 Medical Device stream (6 weeks)

```
WP-W10-MD-01  ISO 14971 risk file engine (per H9)
WP-W10-MD-02  21 CFR 803 MDR reportability + submission
              (SM-VIG; per BD-15) + AI-19 advisory
WP-W10-MD-03  EU MDR Art 87 MIR submission
WP-W10-MD-04  UDI generator + GUDID + EUDAMED integration
              (per E15 §2.10)
WP-W10-MD-05  Design History File (DHF; SM-DHF)
WP-W10-MD-06  Device History Record (DHR; SM-DHR)
WP-W10-MD-07  PSUR generation (SM-PSUR; per BD-14;
              AI-21 advisory)
WP-W10-MD-08  IEC 62304 software lifecycle (SM-SAMD)
WP-W10-MD-09  IEC 81001-5-1 cyber lifecycle (SM-CYBER)
WP-W10-MD-10  PRRC signature path (per BD-13..BD-16)
WP-W10-MD-11  Class III 15-year retention (per H5)
```

### 3.5 Food stream (4-6 weeks)

```
WP-W10-FO-01  HACCP plan workflow + per Codex 7 principles
WP-W10-FO-02  PCQI activity log
WP-W10-FO-03  FSMA §204 KDE/CTE traceability
              (per E15 §2.12)
WP-W10-FO-04  Allergen control plan + verification
WP-W10-FO-05  Reportable Food Registry submission
WP-W10-FO-06  FSVP supplier verification (per J5 §2)
WP-W10-FO-07  EMP (Environmental Monitoring) for RTE
WP-W10-FO-08  CCP monitoring console (real-time;
              SM-CCP-MONITOR)
WP-W10-FO-09  Mock-recall workflow (annual; SM-MOCK-RECALL)
WP-W10-FO-10  Sanitary transport per FSMA Part 1.900
WP-W10-FO-11  Process Authority letter management (LACF)
```

---

## 4. Exit criteria

```
[ ] At least one vertical pack reaches L7 (productized)
[ ] Per-pack regulator submission tested (DSCSA event;
    PPAP submission; AS9102 output; UDI submission;
    FSMA §204 KDE)
[ ] Per-pack audit pack export operational + signed
[ ] Per-pack documentation (admin guide;
    customer-onboarding guide;
    CVLP supplement)
[ ] Per-pack banned-decision extensions verified
    (BD-9..BD-28 per L1 §3)
[ ] Per-pack red-team probe completed (per L4)
[ ] Per-pack KPI dashboards live
[ ] Per-pack AI features GA (per L2 + L3)
```

A wave PASS does not require all 5 packs at L7; one pack at L7
plus others at L4 / L5 is acceptable.

---

## 5. Quality gates (per I1 W10)

```
G-W10-1   Per-vertical-pack-specific gates
G-W10-2   Per-pack regulator submission tested
G-W10-3   Per-pack audit pack signed
G-W10-4   Per-pack red-team posture acceptable
G-W10-5   Per-pack BD-extension triple defense
G-W10-6   Per-pack AI feature ramp KPIs in target band
G-W10-7   Per-pack training (per pack qualifications) live
G-W10-8   Per-pack documentation reviewed
```

---

## 6. Evidence emitted

```
- Per-pack validation pack (EC-1)
- Per-pack audit pack signed bundle
- Per-pack regulator submission evidence
- Per-pack red-team report (EC-7)
- Per-pack AI feature deployment (EC-23)
- Per-pack KPI baseline
- Per-pack training records (EC-11)
```

---

## 7. KPIs

```
- Per-pack regulator submission acceptance rate
- Per-pack audit pack export SLA (per SLO-15)
- Per-pack AI feature acceptance rate (per L2 §6)
- Per-pack BD-extension attempt log = 0 (per SLO-22
  extended)
- Per-pack training compliance 100% (regulated roles)
- Per-pack first-tenant CSAT
- Per-pack mock-recall trace time (Food: ≤ 4h)
```

---

## 8. Dependencies

```
PRE                              W9 READY (validation + compliance);
                                AI mainstream live (W7)
POST                             W11 (pack expansion + customer
                                success scale);
                                W12 (ISO 13485 cert for MD);
                                W13 (multi-region for global packs)
```

---

## 9. Risks

```
R-W10-01 Pharma DSCSA partner integration delays
         Mitigation: per E15 §2.9; per K3 partner
R-W10-02 Auto OEM CSR overlay conflicts with regulator floor
         Mitigation: per H1 §7 stricter wins; per H3 audit
R-W10-03 Aero ITAR / CMMC tenant onboarding lengthy
         Mitigation: per J3 §11; per K5; per W12 §
R-W10-04 MD vigilance reportability AI-19 false-negative
         Mitigation: per L4 SEV-2+; PRRC oversight
R-W10-05 Food §204 enforcement deadline (Jan 2026)
         pressure
         Mitigation: per J5 §10; per CSM proactive
R-W10-06 Per-pack AI feature cost runaway
         Mitigation: per L2 §9; per I6
R-W10-07 Multi-pack tenant complexity (one tenant uses 3
         packs)
         Mitigation: per H1 §1 four-layer model;
         per pack overlays orthogonal
R-W10-08 Per-pack red-team finding SEV-1
         Mitigation: per L4 §4 remediation; gate ramp
```

---

## 10. Decision phrases

```
W10_VERTICAL_PACKS_READY                (all selected packs at target)
W10_VERTICAL_PACKS_PASS_WITH_GAPS         (most packs ready)
W10_VERTICAL_PACKS_PARTIAL_NEEDS_CONTINUATION
W10_VERTICAL_PACKS_FAIL_BLOCK_NEXT
```

---

## 11. Cross-references

- J0..J5 — vertical pack canonical
- H1 §2 — per-pack regulatory inventory
- L1 §3 — banned-decision pack extensions
- L2 — AI features per pack
- E15 §2.9..§2.14 — per-pack integrations
- M3 — per-pack roots
- M4 — per-pack state machines

---

## 12. Decision phrase

```
G14_WAVE_W10_BASELINE_LOCKED
NEXT: G15_WAVE_W11.md
```
