# L3 — AI Lifecycle

```
chapter_purpose: governance of AI features from inception through retirement
owner_role:      AI Lead with Compliance Lead
```

---

## 1. Lifecycle stages

```
S1  Inception            problem statement, success metrics, risk class assigned
S2  Data assembly        training corpus curated, lineage captured, PII review
S3  Model build          model trained, validation set held out, model card drafted
S4  Internal red-team    adversarial probes, jailbreak attempts, OWASP LLM checks
S5  Limited deployment   shadow mode (predict but do not show); compare to humans
S6  Advisory deployment  shown with confidence badge, override capture, KPI tracking
S7  Steady state         monitored quarterly, retraining cycle, drift detection
S8  Deprecation          announced, disabled, evidence retained, replacement path
```

---

## 2. Stage gates

Each transition between stages requires:
- Documented evidence (data lineage, validation results, red-team report)
- Human reviewer sign-off (AI Lead + domain lead)
- Approval recorded in AI governance ledger (per L4 §2)

Tier-2 features additionally require Compliance Lead sign-off.
Tier-3 features (regulated decisions) are not permitted (per L1).

---

## 3. Model card contract

Every deployed model has a model card containing:
- Model id and version
- Intended use + out-of-scope use
- Training data summary (sources, license, PII review outcome)
- Performance metrics (precision, recall, F1, calibration)
- Bias and fairness assessment
- Known failure modes
- Override expectations (where humans typically disagree and why)
- Retirement / replacement plan

Model card is versioned with the model and exposed via Evidence API
(per E8) so customers can audit.

---

## 4. Drift detection

Per-feature monitoring:
- Input distribution drift (feature stats vs training reference)
- Output distribution drift (prediction stats vs reference)
- Acceptance rate drift (humans accepting advisories at lower rate)
- Concept drift (ground truth diverging from prediction)

Triggers retraining when threshold breached.

---

## 5. Retraining cycle

```
Cadence:           quarterly default; faster if drift triggered
Approval:          AI Lead + domain lead + Compliance for Tier-2
Validation:        held-out set + adversarial set + red-team report
Rollout:           shadow → 1% → 10% → 50% → 100% with KPI gates
Rollback:          automatic if KPI degrades > 5% from baseline
```

---

## 6. Decision phrase

```
L3_AI_LIFECYCLE_BASELINE_LOCKED
NEXT: L4_AI_RED_TEAM.md
```
