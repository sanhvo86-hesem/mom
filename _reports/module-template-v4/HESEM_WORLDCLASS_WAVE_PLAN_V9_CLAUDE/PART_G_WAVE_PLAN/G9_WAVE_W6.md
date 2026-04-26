# G9 — Wave W6: MES / OT Foundation

```
wave_id:        W6
wave_name:      MES / OT Foundation
predecessor:    W4.5 (parallel with W5)
successor:      W7
calendar:       8-12 weeks
team_size:      12-14 FTE
```

---

## 1. Goal

Build the MES execution foundation: connected worker PWA, edge gateway,
OEE event ingestion, SPC engine, calibration management, FMEA workshop.
This wave brings the OT-IT bridge online.

---

## 2. Entry criteria

W5 READY (or in parallel; per the wave DAG, W5 and W6 can parallel after
W4.5).

---

## 3. Exit criteria

```
[ ] Edge gateway prototype deployed at one reference site
[ ] OT zone map + conduit policy operational
[ ] OT write path with 6-prerequisite enforcement
[ ] Connected worker PWA with offline-tolerance (4-hour budget)
[ ] PackML state machine + OEE event ingestion live
[ ] SPC engine with Western Electric / Nelson rules
[ ] Calibration management with traceability chain + OOT propagation
[ ] FMEA workshop UI functional
[ ] OEE dashboard live for one reference equipment
```

---

## 4. Work packages

```
WP-W6-01 Edge gateway appliance (single-site prototype)
WP-W6-02 OT zone map + conduit policy
WP-W6-03 OT write path enforcer (6 prerequisites)
WP-W6-04 PackML state machine + OEE ingestion
WP-W6-05 Connected worker PWA (offline + sync)
WP-W6-06 SPC engine + control charts
WP-W6-07 Calibration management + OOT review propagation
WP-W6-08 FMEA workshop with AIAG-VDA action priority
WP-W6-09 8 OT runbooks authored
WP-W6-10 IEC 62443 SL-2 baseline; SL-3 for regulated tenants
```

---

## 5. Decision phrases

```
W6_MES_OT_FOUNDATION_READY
W6_MES_OT_FOUNDATION_PASS_WITH_WARNINGS
W6_MES_OT_FOUNDATION_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G9_WAVE_W6_BASELINE_LOCKED
NEXT: G10_WAVE_W6_5.md
```
