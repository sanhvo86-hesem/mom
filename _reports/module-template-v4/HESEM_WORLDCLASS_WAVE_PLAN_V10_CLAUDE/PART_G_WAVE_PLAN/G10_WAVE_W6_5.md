# G10 — Wave W6.5: AI Advisory Controlled Rollout

```
wave_id:        W6.5
wave_name:      AI Advisory Controlled Rollout
predecessor:    W6
successor:      W7
calendar:       3-4 weeks
team_size:      12-14 FTE
investment:     ~$300K
```

---

## 1. Goal

Roll out first 3-5 AI advisory features under L0..L5 discipline.
All advisory; never autonomous. L1 banned-decisions enforcement
active. Per L3 lifecycle: shadow → 1% → 10% → 50% → 100%. Per L4
red-team baseline.

---

## 2. Entry criteria

```
[ ] W6 READY (MES + OT)
[ ] AI risk package ratified per H9
[ ] Banned-decision triple defense active per L1 §4
[ ] AI governance ledger operational
```

---

## 3. Exit criteria

```
[ ] AI Decision Record schema operational (per H4 EC-23,
    EC-24, EC-25)
[ ] Per-feature NIST AI RMF risk profile published (per L2 §2)
[ ] Per-feature model card published (per L3 §3)
[ ] Acceptance-rate KPI dashboard active (DL-14; per L2 §6)
[ ] L1 banned-decision triple defense verified;
    0 attempts in production (per SLO-22)
[ ] Quarterly red-team protocol initiated (per L4 §1)
[ ] First 3 AI advisory features live:
    - AI-01 NC similarity clustering (Tier-2)
    - AI-02 CAPA root-cause candidate ranking (Tier-2)
    - AI-03 CDOC suggested reviewer (Tier-1)
[ ] Per L3 §1 stages traversed; signed gates per L3 §2
[ ] Override capture mandatory per L1 §5
[ ] Per-tenant kill switch live (per L4 §6)
```

---

## 4. Work packages

```
WP-W6.5-01 AI Decision Record schema + persistence (per H4)
WP-W6.5-02 Per-feature model card publication (per L3 §3)
WP-W6.5-03 Acceptance-rate KPI dashboard (DL-14)
WP-W6.5-04 RULE-2 CI test + runtime guard active (per L1 §4)
WP-W6.5-05 Per-feature NIST AI RMF profile (per L2 §2)
WP-W6.5-06 First 3 features deployed shadow → canary → prod
            (per L3 §1 S5 → S6)
WP-W6.5-07 Quarterly red-team drill (first quarter; per L4)
WP-W6.5-08 Override-capture flow per L1 §5
WP-W6.5-09 Kill switch per L4 §6
WP-W6.5-10 Per-tenant feature toggle (per L2 §8 + I8)
WP-W6.5-11 Banned-decision attempt log (per L1 §7 + per E9
            §2.10)
WP-W6.5-12 Sub-processor onboarding (per L2 §8 + I8)
```

---

## 5. Quality gates

```
G-W6.5-1  AI advisory shadow-mode evidence (per L3 S5)
G-W6.5-2  Per-feature model card current
G-W6.5-3  L1 triple defense verified (CI + runtime + offline)
G-W6.5-4  Override-capture mandatory tested
G-W6.5-5  Kill switch tested
G-W6.5-6  Per-feature confidence calibration baseline
G-W6.5-7  AI ledger operational
```

---

## 6. Evidence emitted

```
- Per-feature model card (EC-23)
- Per-feature red-team report (EC-7)
- Advisory render baseline (EC-25)
- Override pattern baseline (EC-24)
- Banned-decision attempt log = 0 (per SLO-22)
- Kill switch test evidence (EC-22)
```

---

## 7. KPIs

```
- AI advisory p95 < 200ms (Tier-1) / < 2s (Tier-2 LLM)
  (per SLO-14)
- Acceptance rate per feature (target band per L2 §6)
- Override rate per feature (target band)
- Abstention rate per feature (target band)
- Calibration delta (target |delta| < 0.05)
- Banned-decision attempts (target 0; per SLO-22)
- Per-feature cost vs envelope (per L2 §9 + SLO-18)
- Sub-processor security incidents = 0
```

---

## 8. Dependencies

```
PRE                              W6 READY (MES);
                                AI governance ledger active
POST                             W7 (mainstream AI rollout);
                                W10 (per-pack AI overlay);
                                W12 (PCCP for MD AI)
```

---

## 9. Risks

```
R-W6.5-01 Banned-decision bypass attempt detected
          Mitigation: per L1 §4 triple defense;
          SEV-1 if detected; per L4 red-team
R-W6.5-02 Sub-processor outage during shadow
          Mitigation: per L2 §2 on_failure_behavior;
          per E9 §10 FM3
R-W6.5-03 Acceptance rate too low (no value)
          Mitigation: per L3 §4 drift; retraining
R-W6.5-04 Hallucination in prod (rare in W6.5; mostly
          shadow)
          Mitigation: per L4 §3 SEV-1; kill switch
R-W6.5-05 Cost envelope breach early
          Mitigation: per L2 §9; cost-aware routing
R-W6.5-06 Override-capture friction backlash
          Mitigation: per L1 §6 calibration;
          UX iteration
R-W6.5-07 Cross-tenant inference attempt
          Mitigation: per B6 C5; SEV-1
```

---

## 10. Per-pack overlay

```
PHARMA J1                        AI-01 NC clustering for
                                 Pharma deviation; AI-02 CAPA
                                 ranking
AUTO J2                          AI-13 RCA suggestion for 8D
                                 (later wave)
AERO J3                          AI-18 counterfeit indicator
                                 (W10 GA)
MD J4                            (W10 GA: AI-19 vigilance
                                 reportability)
FOOD J5                          AI-09 anomaly detection for
                                 SPC integration
```

---

## 11. Decision phrases

```
W6_5_AI_ADVISORY_READY
W6_5_AI_ADVISORY_PASS_WITH_WARNINGS
W6_5_AI_ADVISORY_FAIL_BLOCK_NEXT
W6_5_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT (any L1 §1 violation)
```

---

## 12. Cross-references

- L0..L5 — AI discipline canonical
- E9 — AI advisory API
- H4 — AI evidence classes
- H9 — AI risk
- I7 — sub-processor onboarding
- I8 — tenant feature toggle
- M5 — SLO-14, SLO-18, SLO-22

---

## 13. Decision phrase

```
G10_WAVE_W6_5_BASELINE_LOCKED
NEXT: G11_WAVE_W7.md
```
