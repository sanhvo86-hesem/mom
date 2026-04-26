# AI Model Card — Template V8

```yaml
model_card:
  feature_id: <e.g., NC_SIM_CLUSTER>
  model_name: <e.g., nc-similarity-bert-v1>
  model_version: <semver>
  trained_at: <ISO 8601>
  framework: <PyTorch + sentence-transformers / TensorFlow / JAX / etc.>
  hosted_at: <internal endpoint>

intended_use:
  description: <1-paragraph; what is the AI used for>
  intended_users: [<role list>]
  out_of_scope:
    - <use 1>
    - <use 2>
  banned_per_RULE_2: <yes if matches BD-N; no otherwise>
  reference_RULE_2_BD_id: <BD-1..BD-8 if applicable>

training_data:
  sources:
    - <source 1>
    - <source 2>
  size: <count of examples>
  locales: [<en-US: 60%, vi-VN: 35%, etc>]
  bias_audit_summary: <summary>
  consent_basis: <legal basis per GDPR / per regulated context>
  privacy_review: <DPIA reference>

evaluation:
  holdout_size: <count>
  metrics:
    <metric_1>: <value>
    <metric_2>: <value>
  bias_metrics:
    per_locale_accuracy:
      en-US: <value>
      vi-VN: <value>
    locale_disparity_pct: <value>

risk_class:
  nist_rmf_tier: <1-3>
  eu_ai_act_class: <minimal | limited | high>

monitoring:
  drift_check_cadence: <weekly>
  accuracy_check_cadence: <monthly>
  abstain_rate_threshold: <pct>
  red_team_cadence: <quarterly>

governance:
  owner_role: <ML Engineering>
  approver_role: <AI Lead + Compliance Lead>
  approval_record_id: <ADR-V8-NNNN>
  
deployment_history:
  - version: <semver>
    deployed_at: <ISO>
    deployed_by: <principal>
    status: <shadow | canary | production | retired>

owasp_llm_top_10_status: (per file 19 §7)
  LLM01_prompt_injection: PASS | FAIL
  LLM02_insecure_output: PASS | FAIL
  LLM03_training_poisoning: PASS | FAIL
  LLM04_DoS: PASS | FAIL
  LLM05_supply_chain: PASS | FAIL
  LLM06_sensitive_disclosure: PASS | FAIL
  LLM07_insecure_plugin: N/A (HESEM has no plugin)
  LLM08_excessive_agency: PASS (RULE-2 enforced)
  LLM09_overreliance: PASS | FAIL
  LLM10_model_theft: PASS | FAIL
```
