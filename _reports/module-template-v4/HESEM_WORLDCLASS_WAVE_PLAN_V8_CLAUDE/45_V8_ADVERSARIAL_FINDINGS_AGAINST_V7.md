# 45 — V8 Adversarial Findings Against V7

```text
purpose:        Direct response to V7 §29 prompt (Claude Max adversarial review)
predecessor:    V7 §29 ("Find contradictions, missing gates, hidden authority, ...")
v8_advance:     Honest adversarial findings; binding map cross-reference
```

V7 §29 demanded: "Fatal blockers, High-risk gaps, Missing artifacts, Root-by-root maturity challenges, Standards-to-gates corrections, Wave sequencing corrections, V21 execution corrections, Recommended decision phrase."

V8 delivers.

---

## 1. Fatal blockers in V7 (none; structural)

V7 has **no fatal logic blockers**. The frame is internally consistent.

V7's biggest weakness is **specification depth**, not logical contradiction. This is not a fatal blocker — it is a calling for V8.

---

## 2. High-risk gaps in V7

```yaml
HRG-1 [V7 §10 line 58]: "AI tool calling mutation without approval" forbidden
  but NO mechanism specified to detect this at runtime
  V8 binding: file 19 §3 (CI test + AISurfaceGuardMiddleware)

HRG-2 [V7 §13 line 24-29]: OT write path requires "zone/conduit, hazard review, security review, fallback, manual override"
  but NO dual-control approval, NO automatic interlock check, NO 6-prerequisite enumeration
  V8 binding: file 15 §4 (6 prerequisites with mechanism)

HRG-3 [V7 §16 line 4]: AI requires "explicit human authority"
  but no schema for the authority record; no enforcement that decision is captured
  V8 binding: file 19 §2 (ai_decision_record_v8 schema)

HRG-4 [V7 §17 line 13]: "fixture/live mixup → grep guard + inert flags"
  but NO scanner specification, NO inert flag registry, NO testing harness
  V8 binding: files 13 + 14

HRG-5 [V7 §18 line 14]: "freshness SLO" defined as "expected latency"
  but no actual values given per data product
  V8 binding: file 20 §2 (per-DP freshness_sla)

HRG-6 [V7 §22]: workload estimates as "planning ranges" with "no team velocity data"
  no sensitivity analysis; no AI-augmentation factor
  V8 binding: file 30 (5 quantitative matrices + sensitivity)

HRG-7 [V7 §23 line 21]: "forbidden file" stop rule
  but forbidden file registry never specified in V7
  V8 binding: file 13 + schemas/forbidden_diff_v8.yaml

HRG-8 [V7 §28 line 21]: "explicit approval" required for forbidden-file changes
  but approval artifact, authority chain, SLA all undefined
  V8 binding: file 18 (approval workflow with 13 decision types)

HRG-9 [V7 §32]: "Idempotency_key" listed as guard for L5
  but no key construction algorithm, no collision detection, no replay window
  V8 binding: file 09 §2

HRG-10 [V7 §33]: 13 standards with checklist
  but no escalation path when PASS_WITH_WARNINGS owner misses deadline
  no cross-standard conflict resolution
  V8 binding: file 17 (cross-standard conflict resolution)

HRG-11 [V7 §38 hard cases]: 8 cases with prose decisions
  but no decision tree, no rollback procedure, no metrics
  V8 binding: file 36 (per-case decision tree + rollback + metrics)

HRG-12 [V7 entirely silent]: per-tenant cost SLA
  V8 binding: file 25 (cost-attribution + throttling)

HRG-13 [V7 entirely silent]: validation evidence feedback loop
  V8 binding: file 22

HRG-14 [V7 entirely silent]: spine deployment phasing per wave
  V8 binding: file 08

HRG-15 [V7 §13 line 22]: machine telemetry "is evidence, not authority"
  resolves authority conflict but leaves data quality SLA blank
  V8 binding: file 18 telemetry data quality + freshness alarms

HRG-16 [V7 §33 line ~]: residual risk "recorded" but not classified
  V8 binding: file 35 + AIAG-VDA AP framework
```

---

## 3. Missing artifacts in V7

```yaml
MA-1: Authority Ledger SQL DDL — V7 prose only; V8 file 04 §2
MA-2: OTG axiom set — V7 had 0; V5 had 14; V8 has 18
MA-3: Command envelope JSON Schema — V7 had partial; V8 full per file 09 §1
MA-4: Problem-detail registry — V7 listed 7; V8 has 62 per file 12
MA-5: Forbidden diff YAML — V7 named only; V8 ships per file 13
MA-6: Inert flag registry — V7 named only; V8 ships per file 14
MA-7: ot_zone_map per reference site — V7 named only; V8 file 15 §3
MA-8: AI banned-decisions data file — V7 listed 8; V8 codifies per file 19 §1
MA-9: ai_decision_record schema — V7 absent; V8 file 19 §2
MA-10: cross_root_deps DAG — V7 absent; V8 file 7 + data
MA-11: spine_phasing matrix — V7 listed 12 spines; V8 phases per wave
MA-12: workflow_state_machines library — V7 implicit; V8 file 10 + data
MA-13: evidence_record schema — V7 absent; V8 file 16 §1
MA-14: rtm_entry schema — V7 absent; V8 file 22 §3
MA-15: approval_record schema — V7 absent; V8 file 18 §1
MA-16: cost-attribution data product — V7 absent; V8 file 25 §1
MA-17: per-vertical pack DAG — V7 flat list; V8 file 21
MA-18: 5 quantitative matrices — V7 absent; V8 file 30
```

---

## 4. Root-by-root maturity challenges (V7 §36 §08)

V7 baseline maturity assignments are described as "planning evidence from source memory/V7 assessment" and "must be overwritten by V21/current repo verification before execution commitments."

V8 commitment: V21 Phase 2 verification (W0) **must** establish actual baseline from repo. Until V21 PASS, all V7 maturity baselines are aspirational.

V8 specific challenges:
- DISP at L3 baseline: realistic per V21 evidence
- NQCASE at L4 baseline: only if cross-browser PASS verified
- CAPA at L3 baseline: if all e2e specs current
- CDOC at L1: agree with V7 (planned)
- All vertical-pack roots at L0: agree (W10 work)

---

## 5. Standards-to-gates corrections

V7 §03 + §33 gates require "PASS_WITH_WARNINGS" classification but no escalation. V8 file 17 + 18 fix.

V7 missing 5 standards V8 adds: ISO 27001, ISO 14971, NIST 800-171, FDA CSA, ISA-101 (file 38).

---

## 6. Wave sequencing corrections

V7 W0-W12 linear list. V8 advances:

```text
+ W13 multi-region (V7 says "ongoing improvement" without scope)
+ W14 continuous loop (V7 absent)
+ CS-A continuous security from W0.5
+ CS-B continuous validation from W0.5
+ DAG (file 06) shows W5+W6 parallel after W4.5
+ wave dependency graph with hard_block / soft_block / parallel / feed_evidence edges
```

---

## 7. V21 execution corrections

V7 §27 lists 7 steps for V21 Phase 2. V8 confirms but adds:

```text
- step 0: verify INV-12 mechanism alive (V8 file 02)
- step 4 expansion: per-stream classification matrix template
- step 6 expansion: go/no-go criteria explicit (V8 file 27 W0 exit)
- step 7 expansion: V8 binding map review per slice planning
```

---

## 8. Recommended decision phrase

```text
V7_HONORED_AS_OPERATING_MODEL_FRAME
V8_PRODUCED_AS_BINDING_SUPERSET_OVER_V7
PROGRAM_DECISION: PROCEED_WITH_W0_PHASE2_INTEGRATION_REVIEW_PER_V8_FILE_27_W0
SECONDARY: REQUEST_GPT_PRO_V9_COUNTER_ITERATION_PER_V8_FILE_43
```

---

## 9. Final position

V7 is necessary. V8 is sufficient. Together they form a planning operating system that can survive engineering execution. Neither is the end. The next iteration (V9 from GPT Pro) is invited.

---

## 10. Decision phrase

```text
V8_ADVERSARIAL_FINDINGS_AGAINST_V7_BASELINE_LOCKED
NEXT_FILE: 46_V8_PACKAGE_MANIFEST.json (machine-readable)
```
