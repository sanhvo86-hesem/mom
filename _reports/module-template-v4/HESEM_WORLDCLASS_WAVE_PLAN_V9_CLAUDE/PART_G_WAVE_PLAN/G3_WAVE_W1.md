# G3 — Wave W1: HMV4 Foundation Productization

```
wave_id:        W1
wave_name:      HMV4 Foundation Productization (Slice Factory)
predecessor:    W0.5
successor:      W2
calendar:       8-12 weeks
team_size:      5-7 FTE
investment:     ~$500K
```

---

## 1. Goal

Convert the slice prototype mechanics from Phase 2 into a repeatable
slice factory: templates, route parser, WS + AR conventions, fixture
patterns, QA harness, rollback discipline. New slices can then be
created predictably with consistent depth + governance.

---

## 2. Entry criteria

```
[ ] W0.5 ACCEPTED
[ ] Forbidden file list per ADR-0004 active
[ ] Pre-production banner per ADR-0001 active
```

---

## 3. Exit criteria

```
[ ] Slice factory operational (templates work for new slices)
[ ] Route parser with 9 surface classes (SH/DL/ML/WS/AR/AC/
    Drawer/Wizard/per F0)
[ ] Fixture pattern documented + templated per ADR-0004
[ ] Visual regression gates stable across browsers
[ ] Rollback scripts per slice
[ ] First 18 Wave-1 roots backfilled to OTG (Stage 1 of OTG
    migration)
[ ] Per-slice maturity coordinate reporting
[ ] WCAG 2.2 AA compliance per slice (per F11)
[ ] Per-pack overlay scaffolding present
```

---

## 4. Work packages

```
WP-W1-01  Slice factory template (per V7-V8 carry-forward;
          per HMV4 v4 baseline)
WP-W1-02  Route parser + 9 surface classes (per F0)
WP-W1-03  Fixture template per resource family (per ADR-0004
          fixture-only discipline)
WP-W1-04  QA harness per slice:
          - node syntax check (70-74)
          - JSON fixture parse (Python json.loads over
            tests/fixtures/module-template-v4/**/*.json)
          - forbidden diff guard
          - portal feature flag inert verification
          - E2E (Playwright; tri-browser)
          - visual regression
          - axe-core (per F11)
WP-W1-05  Rollback runbook per slice
WP-W1-06  18 Wave-1 roots OTG backfill (per Stage 1 of OTG
          migration; per ADR-0005 slice cycle)
WP-W1-07  HMV4 Slices 1-12 reach L3 (current-portal-safe E2E
          baseline)
WP-W1-08  Slice maturity coordinate reporting
WP-W1-09  Per-pack overlay scaffolding (J1..J5 baseline)
WP-W1-10  Per-tenant feature flag baseline (per E14 §2.3)
```

---

## 5. Quality gates (per I1 W1 cumulative)

```
G-W1-1   Visual regression baseline (cross-browser)
G-W1-2   WCAG 2.2 AA per F11 axe-core gate
G-W1-3   Tri-browser smoke (Chromium + Firefox + WebKit)
G-W1-4   Slice forbidden-diff guard active
G-W1-5   Slice maturity report per release
G-W1-6   Visual diff baseline per slice
```

---

## 6. Evidence emitted (per H4)

```
- Per-slice validation pack (EC-1) IQ + initial OQ
- Per-slice fixture inventory (EC-22)
- Per-slice E2E run (EC-1)
- Per-slice axe-core scan (EC-1)
- Per-slice visual regression baseline (EC-1)
```

---

## 7. KPIs

```
- Slice cycle time (planning → QA close) per ADR-0005
- Slice E2E pass rate (target 100%)
- Visual regression diff (target 0 unintended changes)
- WCAG 2.2 AA compliance per slice (target 100%)
- Per-tenant fixture-only verification (per ADR-0001)
- DORA: per-slice deploy frequency
```

---

## 8. Dependencies

```
PRE                              W0.5 ACCEPTED
POST                             W2 (record factory); W3 (workspace
                                projection cutover); W4 (binding
                                deepening)
```

---

## 9. Risks

```
R-W1-01 Slice factory not repeatable (slice 1-3 work; later
        slices break)
        Mitigation: per ADR-0005 cycle discipline; per HMV4
        QA harness mandatory
R-W1-02 Visual regression noise (false positives)
        Mitigation: per-tenant baseline; deterministic test
        data
R-W1-03 Fixture proliferation (fixture mode leaking to
        production)
        Mitigation: per ADR-0001; per ADR-0004 forbidden
        list scoping; CI check that 74-module-template-v4-
        fixtures.js never loaded by mom/portal.html
R-W1-04 OTG backfill data integrity issue (stage 1)
        Mitigation: per B6 mode ladder shadow-write phase
R-W1-05 WCAG regression
        Mitigation: per F11 CI gate
```

---

## 10. Per-pack overlay (scaffolding only)

```
PHARMA J1                        slice scaffolding for EBR /
                                 deviation surfaces (J1 W10
                                 GA target)
AUTO J2                          APQP / PPAP scaffolding
AERO J3                          FAI / NADCAP scaffolding
MD J4                            DHF / vigilance scaffolding
FOOD J5                          HACCP / CCP scaffolding
```

---

## 11. Decision phrases

```
W1_SLICE_FACTORY_READY
W1_SLICE_FACTORY_PASS_WITH_WARNINGS
W1_SLICE_FACTORY_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ADR-0004 — forbidden file list
- ADR-0005 — slice cycle
- F0..F12 — surface patterns
- E5 — workspace projection consumers
- H2 — validation per slice
- I1 — wave gates
- M5 — SLO baselines

---

## 13. Decision phrase

```
G3_WAVE_W1_BASELINE_LOCKED
NEXT: G4_WAVE_W2.md
```
