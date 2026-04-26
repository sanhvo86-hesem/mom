# G1 — Wave W0: Phase 2 Integration Review and Repair

```
wave_id:        W0
wave_name:      Phase 2 Integration Review and Repair
predecessor:    Phase 2 streams (current state)
successor:      W0.5
calendar:       1-2 weeks
team_size:      4-5 FTE
investment:     ~$50K (small; foundation hardening)
```

---

## 1. Goal

Stop drift. Verify main branch is at expected HEAD with all expected
reports. Repair cross-browser / Chromium baseline blocker. Classify
Phase 2 PASS_WITH_WARNINGS streams (must_fix_now / schedule / accept).
Foundation-hardening wave; not feature-adding.

---

## 2. Entry criteria

```
[ ] Repository at expected HEAD per ADR-0002 vocabulary
[ ] Phase 2 stream reports archived under _reports/module-template-v4/
[ ] Working tree clean before W0 work begins
[ ] Pre-production posture per ADR-0001 verified
```

---

## 3. Exit criteria

```
[ ] Cross-browser visual regression GREEN on chromium baseline
[ ] All PASS_WITH_WARNINGS classified per V21 review
[ ] Forbidden file diff guard PASS (per ADR-0004)
[ ] HMV4_PREVIEW_ENABLED defaults preserved (false)
[ ] CI advisory pipeline GREEN on main
[ ] V21 integration review report written
[ ] G1 decision phrase emitted
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
WP-W0-08 Verify pre-production banner per ADR-0001
WP-W0-09 Re-confirm ADR-0009 Graphics Authority compliance baseline
```

---

## 5. Quality gates (per I1 W0 + W0.5 cumulative)

```
G-W0-1   Repo conventions verified (per .ai/CONVENTIONS.md)
G-W0-2   Pre-commit hooks active
G-W0-3   Secret scan clean
G-W0-4   Basic unit + lint + type
G-W0-5   Forbidden file diff guard
G-W0-6   Pre-production banner present
G-W0-7   Visual regression baseline (chromium)
```

---

## 6. Evidence emitted (per H4)

```
- W0 review_record (EC-22)
- HMV4 baseline test_run (EC-1)
- Anchor cycle continues (EC-8)
```

---

## 7. KPIs

```
- Cross-browser pass rate (target 100%)
- Forbidden-diff detection (target zero violations)
- Banner-presence check (target 100%)
- DORA metrics baseline establishment (per K5 §11)
```

---

## 8. Dependencies (pre + post)

```
PRE                              Phase 2 streams complete
                                (V20 integration prerequisites)
POST                             W0.5 (foundation discipline build-out)
```

---

## 9. Risks

```
R-W0-01 Cross-browser baseline cannot be repaired in time
        → blocks all subsequent waves
        Mitigation: targeted dev sprint; pen-tester engaged
R-W0-02 Discovery of unrepairable regression in HMV4 prototype
        → may require larger redesign
        Mitigation: per ADR-0004 forbidden file list preserved;
        scope to HMV4-allowed files only
R-W0-03 PASS_WITH_WARNINGS triage ambiguity
        Mitigation: per W0 decision phrase taxonomy clear
```

---

## 10. Decision phrases (per V9 W0)

```
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
PHASE2_INTEGRATION_PASS_WITH_WARNINGS
PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
```

---

## 11. Cross-references

- ADR-0001 — pre-production posture
- ADR-0002 — frozen vocabulary
- ADR-0004 — forbidden file list (HMV4 v4)
- ADR-0009 — Graphics Authority compliance
- I1 §2 — wave gate set (W0)
- L5 — pre-flight reading discipline
- M9 — cross-reference

---

## 12. Decision phrase

```
G1_WAVE_W0_BASELINE_LOCKED
NEXT: G2_WAVE_W0_5.md
```
