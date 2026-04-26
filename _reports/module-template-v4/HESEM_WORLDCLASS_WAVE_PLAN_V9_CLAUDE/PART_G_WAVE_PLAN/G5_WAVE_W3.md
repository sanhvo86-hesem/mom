# G5 — Wave W3: eQMS + Workforce + Maintenance Core

```
wave_id:        W3
wave_name:      eQMS + Workforce + Maintenance Core
predecessor:    W2
successor:      W4
calendar:       6-10 weeks
team_size:      10-12 FTE (3 parallel streams)
investment:     ~$700K
```

---

## 1. Goal

First heavily cross-domain wave. eQMS core to L3-L4 (NQCASE, CAPA,
CDOC, MRB, INSP); workforce core to L3-L4 (training, competency,
eligibility); maintenance core to L3 (MWO, calibration). This is
where regulated trust starts taking shape.

---

## 2. Entry criteria

```
[ ] W2 READY (AR shell pattern operational)
[ ] E-sig substrate live (E7 baseline)
[ ] Per-tenant theme override active
```

---

## 3. Exit criteria

```
[ ] NQCASE WS + AR at L4 (live read-only)
[ ] CAPA WS + AR at L4
[ ] CDOC WS + AR at L4
[ ] MRB WS + AC at L4
[ ] Inspection WS + AR at L4 (IQC + IPC + OQC)
[ ] Training (Course + Record + Matrix) at L4
[ ] Eligibility resolver functional (per D3 step 7)
[ ] MWO + Calibration + PM Schedule at L4
[ ] E-signature flow operational for regulated transitions
[ ] First two-person e-signatures (CAPA close, BREL approve
    where applicable; per L1 BD-1, BD-3)
[ ] Banned-decision triple defense active for BD-1..BD-8
[ ] Per-pack overlay scaffolding for J1..J5 in eQMS
```

---

## 4. Work packages

```
Stream 1 (Quality Lead):
  WP-W3-01 NQCASE WS+AR at L4 (HMV4 Slice 2 expanded)
  WP-W3-02 CAPA WS+AR at L4 (per H8 lifecycle)
  WP-W3-03 CDOC + ECO WS+AR at L4 (per D7 SM-7)
  WP-W3-04 MRB AC at L4 (per D5 SM-5 multi-party)
  WP-W3-05 Inspection (IQC + IPC + OQC) at L4 (per D4/D5)
  WP-W3-06 E-sig flow operational (per E7 §1-§3)
  WP-W3-07 Banned-decision triple defense active
           (BD-1..BD-8; per L1 §4)

Stream 2 (Workforce Lead with Quality Lead):
  WP-W3-08 Training Course + Record + Matrix at L4 (per D8)
  WP-W3-09 Eligibility resolver service operational
           (per D3 §7 step 7 canonical gate)
  WP-W3-10 ECO → Training assignment auto-flow (per D7 §7)
  WP-W3-11 Per-pack qualification overlay scaffold

Stream 3 (Maintenance Lead):
  WP-W3-12 MWO WS+AR at L4 (per D9 SM-9)
  WP-W3-13 Calibration WS+AR at L4 with OOT propagation
           (per D9 §6 canonical OOT impact handling)
  WP-W3-14 PM Schedule + cycle at L4
  WP-W3-15 Per-pack maintenance overlay (Aero AD/SB)
```

---

## 5. Quality gates

```
G-W3-1   E-sig flow per E7 obligations met
G-W3-2   Eligibility resolver gates dispatch (per D3 §7)
G-W3-3   Banned-decision triple defense verified
G-W3-4   Per-pack regulated mutation tested (where in scope)
G-W3-5   F11 a11y across new surfaces
G-W3-6   Per-tenant feature flag respected
G-W3-7   Audit chain anchored daily (continuing)
G-W3-8   Validation evidence freshness per H2 §13 active
```

---

## 6. Evidence emitted

```
- Per-workspace IQ + OQ (EC-1)
- Eligibility resolver IQ (EC-1)
- E-sig flow validation (EC-1 + EC-2)
- Banned-decision triple defense test (EC-7 / EC-22)
- Per-tenant fixture-mode-only verification
- Calibration cycle + OOT propagation IQ (EC-12 + EC-13)
```

---

## 7. KPIs

```
- E-sig p95 < 200ms challenge (per E7 §6)
- Eligibility resolver p95 < 100ms
- CAPA workspace p95 < 250ms
- Per-tenant feature flag respected (target 100%)
- BD-1..BD-8 attempt log = 0 (per SLO-22)
- Per-tab freshness within target (per F5)
- AI advisory baseline (W6.5 prep)
```

---

## 8. Dependencies

```
PRE                              W2 READY
POST                             W4 (workspace projection cutover);
                                W5 (mutation per ADR-0005);
                                W6 (MES); W6.5 (AI shadow)
```

---

## 9. Risks

```
R-W3-01 Eligibility resolver gates incorrectly (false negatives)
        Mitigation: per D3 §7 enumerated checks;
        per pack test scenarios
R-W3-02 E-sig binding broken (per 21 CFR 11.70)
        Mitigation: per E7 §2.3 binding hash mandatory
R-W3-03 Cross-domain cascade not properly atomic
        Mitigation: per saga compensation per B7
R-W3-04 Per-pack overlay creates UI bloat
        Mitigation: per F0 + per pack contract
R-W3-05 Calibration OOT impact mis-scoped (over- or under-)
        Mitigation: per D9 §6 canonical scope rules
R-W3-06 Training assignment flood post-CDOC release
        Mitigation: per D7 §7 + per E10 batch + digest
```

---

## 10. Per-pack overlay

```
PHARMA J1                        e-sig flow with QP signature
                                 path scaffold; deviation cycle
                                 prep
AUTO J2                          PPAP scaffolding; LPA cycle
AERO J3                          FAI workflow scaffold; ITAR
                                 person-of-record verification
MD J4                            vigilance reportability scaffold;
                                 PRRC signature path
FOOD J5                          HACCP CCP monitoring scaffold;
                                 PCQI training overlay
```

---

## 11. Decision phrases

```
W3_EQMS_CORE_READY
W3_EQMS_CORE_PASS_WITH_WARNINGS
W3_EQMS_CORE_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- D3 §7 — eligibility canonical
- D5/D6/D7 — workflow instantiation
- D9 §6 — OOT impact canonical
- D8 — training cycle
- E7 — e-sig canonical
- F4/F5/F6 — UI patterns
- H2/H4/H8 — quality + evidence + CAPA
- L1 §1 + §4 — banned decisions + triple defense
- M5 — SLO targets

---

## 13. Decision phrase

```
G5_WAVE_W3_BASELINE_LOCKED
NEXT: G6_WAVE_W4.md
```
