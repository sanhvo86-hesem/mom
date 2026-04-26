# G5 — Wave W3: eQMS + Workforce + Maintenance Core

```
wave_id:        W3
wave_name:      eQMS + Workforce + Maintenance Core
predecessor:    W2
successor:      W4
calendar:       6-10 weeks
team_size:      10-12 FTE (5 parallel streams)
```

---

## 1. Goal

The first heavily cross-domain wave. Bring the eQMS core to L3-L4
(NQCASE, CAPA, CDOC, MRB, INSP), the workforce core to L3-L4 (training,
competency, eligibility), the maintenance core to L3 (MWO, calibration).

This is where regulated trust starts to take shape.

---

## 2. Entry criteria

W2 READY.

---

## 3. Exit criteria

```
[ ] NQCASE workspace + record shell at L4 (live read-only)
[ ] CAPA workspace + record shell at L4
[ ] CDOC workspace + record shell at L4
[ ] MRB workspace at L4
[ ] Inspection workspace at L4
[ ] Training (course + record + matrix) at L4
[ ] Eligibility resolver functional
[ ] MWO + calibration workspaces at L4
[ ] E-signature flow operational for regulated transitions
[ ] First instances of two-person e-signature (CAPA close, BREL approve
     when applicable)
```

---

## 4. Work packages

The eQMS Core stream (parallel to Workforce stream and Maintenance
stream):

```
Stream 1 (Quality Lead):
  WP-W3-01 NQCASE at L4 (existing HMV4 Slice 2 → expanded)
  WP-W3-02 CAPA at L4 (existing slice → expanded)
  WP-W3-03 CDOC + ECO at L4
  WP-W3-04 MRB at L4
  WP-W3-05 Inspection (IQC + IPC + OQC) at L4
  WP-W3-06 E-signature flow operational

Stream 2 (HR Lead with Quality Lead):
  WP-W3-07 Training Course + Record + Matrix at L4
  WP-W3-08 Eligibility resolver service operational
  WP-W3-09 ECO → Training assignment auto-flow

Stream 3 (Maintenance Lead):
  WP-W3-10 MWO at L4
  WP-W3-11 Calibration at L4 with OOT propagation
  WP-W3-12 PM Schedule at L4
```

---

## 5. Decision phrases

```
W3_EQMS_CORE_READY
W3_EQMS_CORE_PASS_WITH_WARNINGS
W3_EQMS_CORE_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G5_WAVE_W3_BASELINE_LOCKED
NEXT: G6_WAVE_W4.md
```
