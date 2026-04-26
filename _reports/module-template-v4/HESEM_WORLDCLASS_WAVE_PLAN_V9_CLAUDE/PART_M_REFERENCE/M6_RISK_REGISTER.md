# M6 — Risk Register

```
chapter_purpose: top program-level risks with owner, mitigation, status
owner_role:      Head of Engineering (the user) with Compliance Lead
```

The risk register is reviewed monthly. Each risk has an owner, a
likelihood-impact rating, a mitigation plan, and a current status.

---

## 1. Strategic risks

```
R-S1   Vertical pack scope creep            HIGH
       Mitigation: pack-by-pack release per J0; freeze pack scope before W10
R-S2   Pre-production posture violated      HIGH
       Mitigation: ADR-0001 frozen; CI grep blocks "production go-live"
R-S3   Single founder dependency            MEDIUM
       Mitigation: documented decisions in V9 + ADRs; cross-training
R-S4   Underfunded validation discipline    HIGH
       Mitigation: H2 lifecycle + CS-B continuous validation stream
```

---

## 2. Architectural risks

```
R-A1   OTG axiom violation in production    HIGH
       Mitigation: RB-INC-005 runbook; daily axiom check in CS-B
R-A2   Audit chain anchor failure           HIGH
       Mitigation: SLO-5 = 100%; RB-INC-004 runbook
R-A3   Tenant boundary breach               CRITICAL
       Mitigation: SLO-19 = 0; row-level isolation tested per B6 C5
R-A4   Schema drift between RFC 9457 docs   MEDIUM
       Mitigation: SLO-21 = 0; CI schema check
R-A5   Materialized view fall behind        MEDIUM
       Mitigation: SLO-14 = 60s; replay tooling per B6 C2
```

---

## 3. AI-specific risks

```
R-AI-1  AI commits a banned decision        CRITICAL
        Mitigation: triple defense per L1 §6 (CI + runtime + offline)
R-AI-2  Hallucinated citation               HIGH
        Mitigation: RAG grounding required per L2 §3
R-AI-3  Bias in training data               HIGH
        Mitigation: red-team probe per L4 §4; quarterly review per L3
R-AI-4  Acceptance rate drift               MEDIUM
        Mitigation: KPI drift detection per L3 §4; retraining cycle
R-AI-5  Model supply chain compromise       HIGH
        Mitigation: signed dependencies per L4 §3 LLM05
```

---

## 4. Compliance risks

```
R-C1  Audit failure                         HIGH
      Mitigation: H3 audit program; quarterly internal audit
R-C2  Validation gap (CSA / GAMP 5)         HIGH
      Mitigation: D14 lifecycle + CS-B; risk-based per H9
R-C3  Retention policy gap                  MEDIUM
      Mitigation: H5 + per-class retention table; WORM evidence
R-C4  CMMC / ITAR breach (Aerospace)        CRITICAL (when in pack)
      Mitigation: J3 §5 controls; US-only deployment for ITAR tenants
R-C5  HIPAA / 21 CFR 820 (Med Device)       CRITICAL (when in pack)
      Mitigation: J4 controls; tenant region pinning
```

---

## 5. Operational risks

```
R-O1  Major incident response too slow      MEDIUM
      Mitigation: I3 §1 SEV classification; quarterly game days
R-O2  DR / backup not exercised             HIGH
      Mitigation: I4 quarterly restore drill
R-O3  Capacity crunch / cost overrun        MEDIUM
      Mitigation: I5 capacity plan; I6 cost governance review monthly
R-O4  Key personnel attrition               MEDIUM
      Mitigation: documented decisions in V9 + ADRs; pair on critical work
```

---

## 6. Decision phrase

```
M6_RISK_REGISTER_BASELINE_LOCKED
NEXT: M7_DECISION_PHRASES.md
```
