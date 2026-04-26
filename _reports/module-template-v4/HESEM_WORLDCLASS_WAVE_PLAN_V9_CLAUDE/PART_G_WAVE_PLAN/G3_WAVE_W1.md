# G3 — Wave W1: HMV4 Foundation Productization

```
wave_id:        W1
wave_name:      HMV4 Foundation Productization (Slice Factory)
predecessor:    W0.5
successor:      W2
calendar:       8-12 weeks
team_size:      5-7 FTE
```

---

## 1. Goal

Convert the slice prototype mechanics from Phase 2 into a repeatable
slice factory: templates, route parser, WS / AR conventions, fixture
patterns, QA harness, and rollback discipline. With this in place,
new slices can be created predictably.

---

## 2. Entry criteria

W0.5 ACCEPTED.

---

## 3. Exit criteria

```
[ ] Slice factory operational (templates work for new slices)
[ ] Route parser with WS / AR / SH / DL / ML / AC / NRD / SFW classes
[ ] Fixture pattern documented and templated
[ ] Visual regression gates stable across browsers
[ ] Rollback scripts per slice
[ ] First 18 Wave-1 roots backfilled to OTG (Stage 1 of OTG migration)
[ ] Per-slice maturity coordinate reported
```

---

## 4. Work packages

```
WP-W1-01  Slice factory template (per V7-V8 carry-forward)
WP-W1-02  Route parser + 9 surface classes
WP-W1-03  Fixture template per resource family
WP-W1-04  QA harness per slice (node check + JSON parse + forbidden diff
           + portal test + E2E + visual regression + axe-core)
WP-W1-05  Rollback runbook per slice
WP-W1-06  18 Wave-1 roots OTG backfill
WP-W1-07  HMV4 Slices 1-12 reach L3 (current-portal-safe E2E baseline)
WP-W1-08  Slice maturity coordinate reporting
```

---

## 5. Decision phrases

```
W1_SLICE_FACTORY_READY
W1_SLICE_FACTORY_PASS_WITH_WARNINGS
W1_SLICE_FACTORY_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G3_WAVE_W1_BASELINE_LOCKED
NEXT: G4_WAVE_W2.md
```
