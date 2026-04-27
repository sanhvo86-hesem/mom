# PART_G — WAVE PLAN — Overview

Part G describes the phased delivery sequence: 14 sequential waves
(W0 → W14) plus 2 continuous parallel streams (CS-A Continuous Security,
CS-B Continuous Validation).

This Part is the answer to "when does each capability arrive?"

---

## 1. The 14 sequential waves + 2 continuous streams

```
W0     Phase 2 Integration Review and Repair
W0.5   Platform Substrate Hardening
W1     HMV4 Foundation Productization (slice factory)
W2     Governed Record Factory
W3     eQMS + Workforce + Maintenance Core
W4     Live Read-Only API Graduation
W4.5   Operational Truth Graph Native Cutover
W5     Core Transactional ERP / MOM
W6     MES / OT Foundation
W6.5   AI Advisory Controlled Rollout
W7     Digital Thread / Genealogy / Release
W8     Analytics + Improvement + Reliability
W9     Security + Validation + Compliance
W10    Vertical Packs (Pharma, Auto, Aero, Med Device, Food)
W11    Customer Pilot / Pre-Production Readiness
W12    Release Candidate / Scale Operating Model
W13    Multi-Region + Multi-Jurisdictional Operations
W14    Continuous Improvement Operating Loop

CS-A   Continuous Security stream (from W0.5, never pauses)
CS-B   Continuous Validation stream (from W0.5, never pauses)
```

Plus this overview: 21 chapters total in Part G.

---

## 2. Per-wave chapter shape

Every wave chapter follows the same shape:

```
1.  Wave identity (id, name, predecessor, successor)
2.  Goal (the wave's specific scope and outcome)
3.  Entry criteria (what must be true to begin)
4.  Exit criteria (what must be true to declare PASS)
5.  Work packages (the deliverables — references to Part C
     capabilities and Part B substrates)
6.  Cross-domain coordination
7.  Standards / regulatory considerations
8.  Risks specific to this wave
9.  Decision phrases (PASS / PASS_WITH_WARNINGS / FAIL_BLOCK_NEXT)
10. Calendar estimate
11. Team composition (per PART_K)
12. Dependency on prior waves
13. Decision phrase
```

---

## 3. Wave-gate discipline (per V3 RULE-5)

```
- No wave begins until predecessor PASS or PASS_WITH_WARNINGS
   (unless explicit ratification by the user)
- Each wave produces eight standard artifacts (per V3 RULE-4):
  - Implementation report
  - QA report
  - Rollback procedure
  - Fixture coverage report
  - E2E result summary
  - Forbidden diff result
  - Current portal safety statement
  - Decision phrase
```

V9 carries this discipline forward.

---

## 4. The wave dependency graph

V9 file 06 (B6 cross-cutting concerns) describes the layered architecture
context. The wave dependency graph is:

```
W0 → W0.5 → W1 → W2 → W3 → W4 → W4.5 → W5 + W6 (parallel) →
W7 → W8 → W9 → W10 → W11 → W12 → W13 → W14

Continuous streams CS-A and CS-B run from W0.5 onward, never pausing.
```

Most edges are hard-block (predecessor must PASS). W5 and W6 are
parallel after W4.5 (per the DAG).

---

## 5. Calendar estimate

Critical path total: 82-148 calendar weeks (~19-34 months) from
program start through W14.

Per V5 file 19 §1.4 (sensitivity-analyzed): full team 12-18 months;
solo with AI augmentation 24-32 months. Honest reading.

---

## 6. The two continuous streams

```
CS-A Continuous Security
   Daily:    SBOM scan + dep CVE scan + secret scan
   Weekly:   red-team prompt-injection drill + tenant boundary fuzzing
   Monthly:  vulnerability remediation review
   Quarterly: tabletop incident drill + threat-model refresh
   Annually: 3rd-party penetration test + ISO 27001 audit

CS-B Continuous Validation
   Daily:    audit-chain anchor verification + integrity job
   Weekly:   validation-evidence freshness alarm scan
   Monthly:  ML drift detection + retraining trigger evaluation
   Quarterly: periodic review per Annex 11 + ICH Q10 management review
   Annually: APR per pharma + IATF surveillance + FDA inspection drill
```

These streams are non-optional. They never pause.

---

## 7. Decision phrases per wave (per V3 RULE-7 naming)

Each wave has up to four standard decision phrases:

```
WAVE_<N>_<SCOPE>_PASS_READY_FOR_WAVE_<N+1>
WAVE_<N>_<SCOPE>_PASS_WITH_WARNINGS
WAVE_<N>_<SCOPE>_FAIL_BLOCK_NEXT
WAVE_<N>_<SCOPE>_BLOCKED_<SPECIFIC_REASON>
```

---

## 8. Reading order

```
G0  this overview                          (3 min)
G1-G18  per-wave chapters                  (10 min each = 3 hours)
G19 CS-A Continuous Security stream        (10 min)
G20 CS-B Continuous Validation stream      (10 min)
```

Total: ~3.5 hours for full Part G absorption.

---

## 9. Decision phrase

```
PART_G_OVERVIEW_BASELINE_LOCKED
NEXT: G1_WAVE_W0.md
```
