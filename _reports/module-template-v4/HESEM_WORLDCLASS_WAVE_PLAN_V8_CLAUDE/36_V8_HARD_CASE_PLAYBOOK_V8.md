# 36 — V8 Hard Case Playbook

```text
purpose:        Carry V7 §38 8 hard cases + add 8 V8-specific hard cases = 16 hard cases
predecessor:    V7 §38 (8 cases as concise table)
v8_advance:     Per-case decision tree + rollback + metrics + escalation
work_package:   WP-V8-HARD (1 governance WP)
owner:          Compliance Lead + Security Lead + AI Lead (joint)
estimate:       1 week initial + ongoing
```

---

## 1. V7 8 cases (carry-forward)

```text
HC-V8-01  AI recommends CAPA closure
HC-V8-02  Operator completes WO offline
HC-V8-03  Machine telemetry contradicts operator
HC-V8-04  Live API unavailable during HMV4 preview
HC-V8-05  E-sign for release
HC-V8-06  Lot recall traversal
HC-V8-07  OT write from MES
HC-V8-08  Data product shows KPI drift
```

V7 prose decisions kept; V8 adds decision tree + rollback per case (see `matrices/hard_case_playbook_v8.csv`).

---

## 2. V8-added 8 hard cases

```yaml
HC-V8-09 — Multi-region tenant requesting cross-region report
  decision: data residency rules apply; aggregate report only;
            individual records stay in source region
  rollback: revoke cross-region read token if geofenced

HC-V8-10 — AI advisory acceptance rate falls below 30%
  decision: pause feature; investigate model usefulness;
            do NOT lower confidence threshold without ADR
  metric: file 19 KPI-AI-001

HC-V8-11 — DR drill fails twice consecutive quarters
  decision: SEV-1 stop; halt new tenant onboarding;
            full SRE + executive review
  metric: file 24 SLO-V8-017

HC-V8-12 — Vertical pack regulatory update post-customer-go-live
  decision: customer notified within 30d;
            re-validation scoped per ICH Q9 risk;
            policy_directive superseded with effective_at + grace period

HC-V8-13 — Forbidden file changed via emergency hotfix
  decision: post-merge audit reverts within 1h;
            emergency change ADR within 7d;
            quarterly forbidden-list review

HC-V8-14 — Cross-tenant data leak detected in audit
  decision: SEV-0; halt operations on affected slice;
            forensics + customer notification within 72h (GDPR);
            corrective ADR + retesting

HC-V8-15 — Customer demands feature that violates V8 invariant
  decision: REJECT; do not lower invariant;
            offer alternate workflow OR scope adjustment;
            customer-side documentation of alternative

HC-V8-16 — V7 → V8 binding gap discovered post-release
  decision: log as risk R-V8-031;
            ADR-V8-BINDING-NNNN proposed within 14d;
            backport implementation in next release
```

---

## 3. Per-case decision tree format (sample)

```yaml
HC-V8-01 (AI recommends CAPA closure):
  trigger: capa.action_close request with actor.kind == 'ai_advisory'
  decision_tree:
    1. is actor.kind == 'ai_advisory' ? 
       yes → REJECT: 403 ai/banned-decision-attempted; SEV-0 alert
       no → continue
    2. has e_signature.factor_count >= 2 with valid signers ?
       no → 401 esign/two-person-required
       yes → continue
    3. has effectiveness_check evidence ?
       no → workflow.guard-failure (effectiveness_metric_threshold_met)
       yes → COMMIT
  rollback_path: file 09 §5 saga compensation
  metrics:
    - count of HC-V8-01 type 1 rejections (AI tried) → SEV-0 if >0
    - count of HC-V8-01 type 2 rejections (no e-sign) → user training opportunity
```

---

## 4. Decision phrase

```text
V8_HARD_CASE_PLAYBOOK_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-HARD-1
NEXT_FILE: 37_V8_VENDOR_BENCHMARK_DEEP_PLAYBOOK_V8.md
```
