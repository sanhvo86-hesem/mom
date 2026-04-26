# G1 — Wave W0: Phase 2 Integration Review and Repair

```
wave_id:        W0
wave_name:      Phase 2 Integration Review and Repair
predecessor:    Phase 2 streams (current state)
successor:      W0.5
calendar:       1-2 weeks
team_size:      4-5 FTE
```

---

## 1. Goal

Stop drift. Verify current main branch is at expected HEAD with all
expected reports. Repair Cross-browser / Chromium baseline blocker.
Classify Phase 2 PASS_WITH_WARNINGS streams (must_fix_now / schedule /
accept).

This wave does not add features. It hardens the foundation before V9's
larger waves begin.

---

## 2. Entry criteria

```
[ ] Repository at expected HEAD
[ ] Phase 2 stream reports archived under _reports/module-template-v4/
[ ] Working tree clean before W0 work begins
```

---

## 3. Exit criteria

```
[ ] Cross-browser visual regression GREEN on chromium baseline
[ ] All PASS_WITH_WARNINGS classified
[ ] Forbidden file diff guard PASS
[ ] HMV4_PREVIEW_ENABLED defaults preserved (false)
[ ] CI advisory pipeline GREEN on main
[ ] V21 integration review report written
[ ] Decision phrase emitted
```

---

## 4. Work packages

```
WP-W0-01 Repair Phase 2 cross-browser regression
WP-W0-02 Classify Phase 2 PASS_WITH_WARNINGS streams
WP-W0-03 Re-baseline forbidden-file diff guard
WP-W0-04 Re-confirm HMV4_PREVIEW_ENABLED=false in mom/portal.html
WP-W0-05 Lock conventions (.ai/CONVENTIONS.md) at v1.0
WP-W0-06 Re-confirm CI advisory pipeline GREEN on main
WP-W0-07 Author V21 Phase 2 integration review report
```

---

## 5. Decision phrases

```
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
PHASE2_INTEGRATION_PASS_WITH_WARNINGS
PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
```

---

## 6. Risks

R-W0-01 Cross-browser baseline cannot be repaired in time → blocks all
subsequent waves.

R-W0-02 Discovery of unrepairable regression in HMV4 prototype → may
require larger redesign.

---

## 7. Decision phrase

```
G1_WAVE_W0_BASELINE_LOCKED
NEXT: G2_WAVE_W0_5.md
```
