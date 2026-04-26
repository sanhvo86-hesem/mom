# G10 — Wave W6.5: AI Advisory Controlled Rollout

```
wave_id:        W6.5
wave_name:      AI Advisory Controlled Rollout
predecessor:    W6
successor:      W7
calendar:       3-4 weeks
team_size:      12-14 FTE
```

---

## 1. Goal

Roll out the first 3-5 AI advisory features under the AI Discipline
(per PART_L). All advisory; never autonomous. RULE-2 banned-decisions
enforcement active.

---

## 2. Entry criteria

W6 READY. AI risk package ratified.

---

## 3. Exit criteria

```
[ ] AI Decision Record schema operational
[ ] Per-feature NIST AI RMF risk profile published
[ ] Per-feature model card published
[ ] Acceptance-rate KPI dashboard active
[ ] RULE-2 enforcement: 0 banned-decision attempts in production
[ ] Quarterly red-team protocol initiated
[ ] First 3 AI advisory features live:
    - NC similarity clustering
    - CAPA root-cause candidate ranking
    - CDOC suggested reviewer
```

---

## 4. Work packages

```
WP-W6.5-01 AI Decision Record schema + persistence
WP-W6.5-02 Per-feature model card publication
WP-W6.5-03 Acceptance-rate KPI dashboard
WP-W6.5-04 RULE-2 CI test active + runtime guard active
WP-W6.5-05 Per-feature NIST AI RMF risk profile
WP-W6.5-06 First 3 AI advisory features deployed (shadow → canary →
            production with manual approval)
WP-W6.5-07 Quarterly red-team protocol drilled (first quarter)
```

---

## 5. Decision phrases

```
W6_5_AI_ADVISORY_READY
W6_5_AI_ADVISORY_PASS_WITH_WARNINGS
W6_5_AI_ADVISORY_FAIL_BLOCK_NEXT
W6_5_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT  (any RULE-2 violation halts)
```

---

## 6. Decision phrase

```
G10_WAVE_W6_5_BASELINE_LOCKED
NEXT: G11_WAVE_W7.md
```
