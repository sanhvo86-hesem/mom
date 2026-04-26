# 19 — V8 AI Authority Boundary

```text
purpose:        Bind V7 §16 AI advisory prose to enforcement mechanism + decision-record schema
predecessor:    V7 §16 + V5 file 11 + V3 RULE-2 (8 banned decisions)
v8_advance:     8 banned decisions codified + CI test + runtime guard + acceptance KPI + red-team protocol
work_package:   WP-V8-AI (5 work packages)
owner:          AI Lead + Compliance Lead
estimate:       ~7 engineering-weeks (W6.5 + W7)
```

---

## 1. The 8 banned decisions (V3 RULE-2 carry-forward)

`data/ai_banned_decisions_v8.json`:

```json
[
  {"id":"BD-1","decision":"release_a_lot","root":"BREL","transition":"approve_release"},
  {"id":"BD-2","decision":"approve_disposition","root":"NQCASE","transition":"dispose_*"},
  {"id":"BD-3","decision":"close_capa","root":"CAPA","transition":"action_close|effectiveness_check_pass"},
  {"id":"BD-4","decision":"release_controlled_document","root":"CDOC","transition":"release"},
  {"id":"BD-5","decision":"approve_eco","root":"ECO","transition":"approve"},
  {"id":"BD-6","decision":"certify_training","root":"TRAIN_RECORD","transition":"certify"},
  {"id":"BD-7","decision":"qualify_supplier","root":"SUP_QUAL","transition":"qualify_decide"},
  {"id":"BD-8","decision":"decide_recall_or_field_action","root":"RECALL","transition":"open|escalate"}
]
```

---

## 2. AI decision-record schema (per advisory call)

```json
{
  "$id":"https://hesem.io/schemas/ai_decision_record_v8.json",
  "type":"object",
  "required":["decision_id","feature_id","model_card_id","model_name","model_version","trained_at","tenant_id","principal_id","invoked_at","input_refs","output","confidence","abstain_flag"],
  "properties":{
    "decision_id":{"type":"string","format":"uuid"},
    "feature_id":{"type":"string"},
    "model_card_id":{"type":"string","format":"uuid"},
    "model_name":{"type":"string"},
    "model_version":{"type":"string"},
    "trained_at":{"type":"string","format":"date-time"},
    "tenant_id":{"type":"string","format":"uuid"},
    "principal_id":{"type":"string","format":"uuid"},
    "invoked_at":{"type":"string","format":"date-time"},
    "input_refs":{"type":"array","items":{"type":"string"}},
    "output":{"type":"object"},
    "confidence":{"type":"number","minimum":0,"maximum":1},
    "abstain_flag":{"type":"boolean"},
    "explanation":{"type":"string"},
    "human_decision_at":{"type":"string","format":"date-time"},
    "human_decision":{"enum":["accepted","rejected","modified","ignored"]},
    "override_reason":{"type":"string","maxLength":2000},
    "trace_parent":{"type":"string"}
  }
}
```

---

## 3. Enforcement (compile-time + runtime)

```yaml
ci_test_v8: tests/v8/ai-governance/test_rule2_enforcement.py
  test_no_advisory_commits_banned_decision:
    - scan all command handlers per data/ai_banned_decisions_v8.json
    - assert no handler accepts ai_advisory_annotation as authoritative input
    - assert no transition handler bypasses actor.kind check
  test_otg_no_committed_edge_from_advisory:
    - SELECT FROM otg_edge WHERE predicate='COMMITTED' AND subject is ai_advisory_annotation
    - assert empty

runtime_guard_v8:
  middleware: AISurfaceGuardMiddleware
  applies_to: every request to L≥5 mutation route
  rule: 
    if actor.kind == 'ai_service_principal' AND command_type IN banned_commands:
      → 403 problem-detail https://hesem.io/problems/ai/banned-decision-attempted
      → emit SEV-0 alert (program halt class)

quarterly_review:
  - authorize each AI feature still meets banned-decisions list
  - update list if regulated landscape changes
  - publish public statement quarterly
```

---

## 4. Acceptance-rate KPI

```yaml
KPI-AI-001: per-feature acceptance rate over 90d
  threshold:
    - acceptance_rate < 30%      → INVESTIGATE: model usefulness; abstain too aggressive
    - acceptance_rate ∈ [30, 95] → HEALTHY
    - acceptance_rate > 95%      → INVESTIGATE: rubber-stamping; calibration review
  source: mv_ai_advisory_acceptance (file 05 §6)
  freshness: hourly
```

---

## 5. Red-team protocol

```yaml
cadence: quarterly per AI feature in production
mandatory_categories:
  - prompt_injection (LLM features)
  - jailbreak (LLM features)
  - data_poisoning (training set audit)
  - exfiltration (output canary tests)
  - alignment (banned-decision attempt detection)
report_format: templates/AI_REDTEAM_REPORT_V8.md
findings:
  - SEV-0: feature blocked from production use until remediation
  - SEV-1: feature continues; mitigation deployed within 14d
  - SEV-2: documented; mitigation by next quarterly cycle
publication: customer-facing summary (without exploitation details)
```

---

## 6. Model card v8 schema

```yaml
required:
  - name, version, trained_at, framework
  - intended_use, intended_users, out_of_scope
  - training_data: { sources, size, locales, bias_audit_summary }
  - evaluation: { holdout_size, metrics_dict, bias_metrics_dict }
  - risk_class: { nist_rmf_tier (1-3), eu_ai_act_class }
  - monitoring: { drift_check_cadence, accuracy_check_cadence, abstain_rate_observed }
  - governance: { owner_role, approver_role, approval_record_id }
  - deployment_history: [ {version, deployed_at, status, retired_at?} ]
location: docs/ai-model-cards/<feature_id>/<model_name>/v<version>.md
```

---

## 7. OWASP LLM Top 10 controls (V5 file 11 §6.6 carry-forward)

For LLM-based features (RAG-SOP-search, generative-drafting):

```yaml
LLM01 prompt-injection: input validation; system prompt locked + signed; output schema validation
LLM02 insecure-output: schema validation downstream; sanitization before display
LLM03 training-poisoning: controlled corpus; supply-chain audit
LLM04 model-DoS: per-principal rate limit; query complexity bound
LLM05 supply-chain: SBOM for model + libs; weight signing
LLM06 sensitive-disclosure: PII detection input/output; redaction
LLM07 insecure-plugin: HESEM has no plugin escapes; LLM sandboxed
LLM08 excessive-agency: BD-1..BD-8 enforcement; LLM never commits
LLM09 overreliance: confidence + abstain; human approval explicit
LLM10 model-theft: weight access controlled; rate-limited inference
```

---

## 8. Work packages

```yaml
WP-V8-AI-1: Banned decisions enforcement (CI + runtime)            (1 wk, W0.5)
WP-V8-AI-2: AI decision-record schema + storage                    (1 wk, W6.5)
WP-V8-AI-3: Acceptance-rate KPI dashboard + alerting               (1 wk, W6.5)
WP-V8-AI-4: Red-team protocol + report template                    (1 wk, W7+ ongoing)
WP-V8-AI-5: Model card v8 + governance review process              (3 wk, W6.5+W7)
total: 7 wk
```

---

## 9. Decision phrase

```text
V8_AI_AUTHORITY_BOUNDARY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-AI-1..5
NEXT_FILE: 20_V8_DATA_PLATFORM_AND_LINEAGE.md
```
