# G9 — Wave W6: MES / OT Foundation

```
wave_id:        W6
wave_name:      MES / OT Foundation
predecessor:    W4.5 (parallel with W5)
successor:      W7
calendar:       8-12 weeks
team_size:      12-14 FTE
investment:     ~$1.0M
```

---

## 1. Goal

Build MES execution foundation: connected worker PWA, edge gateway,
OEE event ingestion, SPC engine, calibration management, FMEA
workshop. OT-IT bridge online. Per ISA-95 + ISA-88 + ISA-101.

---

## 2. Entry criteria

```
[ ] W4.5 READY (OTG cutover; in parallel with W5)
[ ] OT zone planning per IEC 62443 baseline
```

---

## 3. Exit criteria

```
[ ] Edge gateway prototype deployed at one reference site
[ ] OT zone map + conduit policy operational
[ ] OT write path with 6-prerequisite enforcement (per D3 §7
    eligibility + per H1 §4 invariants)
[ ] Connected worker PWA with offline-tolerance (4-hour budget)
[ ] PackML state machine + OEE event ingestion live
[ ] SPC engine with Western Electric + Nelson rules
[ ] Calibration management with traceability chain + OOT
    propagation (per D9 §6 canonical)
[ ] FMEA workshop UI per AIAG-VDA 2019
[ ] OEE dashboard live for one reference equipment
[ ] IEC 62443 SL-2 baseline; SL-3 for regulated tenants
[ ] Per-pack overlay scaffolding (Pharma cleaning;
    Auto LPA; Aero NDT; Food HACCP CCP; MD sterilizer)
```

---

## 4. Work packages

```
WP-W6-01 Edge gateway appliance (single-site prototype)
WP-W6-02 OT zone map + conduit policy
WP-W6-03 OT write path enforcer (6 prerequisites per D3 §7)
WP-W6-04 PackML state machine + OEE ingestion
WP-W6-05 Connected worker PWA (offline + sync; per F1 edge UI)
WP-W6-06 SPC engine + control charts
WP-W6-07 Calibration management + OOT review propagation
WP-W6-08 FMEA workshop (per AIAG-VDA 2019)
WP-W6-09 8 OT runbooks authored (per I3 RB-INC)
WP-W6-10 IEC 62443 SL-2 baseline (per I7)
WP-W6-11 SL-3 path for regulated tenants
WP-W6-12 Andon Tower DL-04 live data (per F2)
WP-W6-13 Schedule Attainment DL-05 live (per F2)
```

---

## 5. Quality gates

```
G-W6-1   Audit chain + OTG axiom (continuing)
G-W6-2   Per-edge connection security (per IEC 62443)
G-W6-3   Connected worker offline-replay tested
G-W6-4   SPC rule engine validation
G-W6-5   Calibration OOT propagation per D9 §6
G-W6-6   Per-pack overlay scaffolding verified
```

---

## 6. Evidence emitted

```
- Edge gateway IQ + OQ (EC-1)
- OT zone map (EC-10)
- 8 OT runbooks (EC-10)
- SPC engine validation (EC-1)
- Per-equipment calibration cycle (EC-12)
- IEC 62443 SL-2 evidence (EC-22)
```

---

## 7. KPIs

```
- Edge gateway uptime per site (per SLO-21)
- OEE telemetry freshness < 30s (per SLO-16)
- SPC out-of-control detection latency (target < 1 cycle)
- Connected worker offline tolerance (target 4 hours)
- Calibration OOT propagation accuracy = 100%
- Per IEC 62443 SL maturity
```

---

## 8. Dependencies

```
PRE                              W4.5 READY
POST                             W7 (AI shadow per L2 features
                                consuming OT data); W10 (per pack
                                GA); W12 (sovereign / FIPS)
```

---

## 9. Risks

```
R-W6-01 Edge gateway compromised (cyber attack vector)
        Mitigation: per IEC 62443 + I7;
        per ISA/IEC 62443-3-3 system requirements
R-W6-02 PWA offline-replay drops events
        Mitigation: per local buffer + retry;
        per RB-INC-003
R-W6-03 SPC false positives overwhelm operators
        Mitigation: tunable rule pack; per L2 §11 anti-noise
R-W6-04 Calibration OOT scope under-estimated
        Mitigation: per D9 §6 enumerated rules
R-W6-05 OT zone breach (IT/OT boundary)
        Mitigation: per IEC 62443; SL-2 baseline
R-W6-06 PackML adoption complexity
        Mitigation: per ISA-88 + per pack contract
```

---

## 10. Per-pack overlay

```
PHARMA J1                        cleaning validation cycle
                                 ingestion; EM excursion ingestion
                                 (sterile pre-W10)
AUTO J2                          LPA cycle ingestion;
                                 SPC for special characteristics
AERO J3                          NDT (non-destructive testing)
                                 ingestion;
                                 service-life-limited part
                                 ingestion
MD J4                            sterilizer cycle (per ISO 11135 /
                                 11137 / 17665) ingestion
FOOD J5                          HACCP CCP monitoring real-time
                                 (per J5 §3 SM-CCP-MONITOR)
```

---

## 11. Decision phrases

```
W6_MES_OT_FOUNDATION_READY
W6_MES_OT_FOUNDATION_PASS_WITH_WARNINGS
W6_MES_OT_FOUNDATION_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ISA-95 + ISA-88 + ISA-101 — substrate
- C6 — shopfloor / MES domain
- D3 §7 — eligibility canonical
- D9 §6 — OOT propagation
- E15 — edge integration
- F4 + F6 — connected worker UI + Andon
- I7 — IEC 62443
- L2 — AI features per L2 (AI-04 predictive; AI-09 anomaly)
- M5 — SLO-16 + SLO-21

---

## 13. Decision phrase

```
G9_WAVE_W6_BASELINE_LOCKED
NEXT: G10_WAVE_W6_5.md
```
