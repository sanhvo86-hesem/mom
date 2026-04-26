# 11_AI_ENGINEERING_PLAYBOOK.md

## Purpose

GPT Pro V4 §07 (W7-W9 wave packs) names "AI/ML platform" and "5 production ML features". V4 lists model types but does not specify the engineering substance of MLOps, RAG (retrieval-augmented generation), evaluation, safety, or governance.

V5 produces the AI engineering playbook for HESEM, anchored to:

- NIST AI Risk Management Framework 1.0 (RMF) + Generative AI Profile (NIST AI 600-1)
- ISO/IEC 42001:2023 (AI management system)
- ISO/IEC 23894:2023 (AI risk management)
- ISO/IEC 25059:2023 (AI quality model)
- EU AI Act (Regulation EU 2024/1689)
- OECD AI Principles
- IEEE 7000 series (ethical AI)
- MITRE ATLAS (adversarial threat model)
- OWASP Top 10 for LLM Applications (2024)
- OWASP Top 10 for Machine Learning (2023)
- Google Model Cards / Datasheets for Datasets
- Anthropic Responsible Scaling Policy
- Open Science: MLflow, Weights & Biases, Hugging Face

---

## Section 1 — Scope of AI in HESEM

### 1.1 What HESEM does NOT do

Per master thesis §5 RULE-2 + file 02 axiom A7:

```text
NEVER: AI autonomously
  - releases a lot
  - approves a disposition
  - closes a CAPA
  - releases a CDOC
  - approves an ECO
  - certifies training as complete
  - qualifies a supplier
  - decides a recall or field action
```

These are the **8 banned regulated decisions**, FROZEN by AI Governance.

### 1.2 What HESEM does

AI advisory features (no autonomous regulated action):

```text
NC similarity clustering            (group similar defects)
CAPA root-cause candidate ranking   (suggest investigation paths)
CDOC suggested reviewer             (route to right SME)
Predictive maintenance              (recommend MWO scheduling)
Complaint NLP classification        (defect mode + product family)
Document text extraction            (extract data from uploaded forms)
Anomaly detection                   (flag outlier measurements)
Forecast demand                     (advisory only; planner decides)
Generative drafting                 (CAPA initial draft, SOP draft)
RAG-powered SOP search              (intelligent docs lookup)
```

All advisory; humans decide.

### 1.3 The risk taxonomy (NIST RMF + EU AI Act)

| HESEM AI feature | NIST tier | EU AI Act class | Special obligations |
|---|---|---|---|
| NC similarity cluster | Tier 2 | Limited risk | Override capture |
| CAPA root-cause rank | Tier 2 | Limited risk | Override capture + bias audit |
| CDOC reviewer suggest | Tier 1 | Minimal | None beyond default |
| Predictive maintenance | Tier 2 | Limited | False-positive cost analysis |
| Complaint NLP classify | Tier 2 | Limited | Multi-language fairness check |
| Doc text extraction | Tier 2 | Limited | Confidence threshold + human verify |
| Anomaly detection | Tier 2 | Limited | False-alarm rate SLO |
| Demand forecast | Tier 1 | Minimal | None beyond default |
| Generative drafting | Tier 3 | Limited (potentially) | Hallucination check + factual grounding |
| RAG SOP search | Tier 2 | Limited | Citation + grounding |

V5 ADR-0178: Per-feature risk classification per NIST RMF + EU AI Act + decision-record obligation.

---

## Section 2 — MLOps stack

### 2.1 Components

```text
Feature store               online (Redis) + offline (Postgres + parquet)
Model registry              MLflow or simple S3 + manifest table
Training pipeline           Airflow / Argo Workflows / Prefect
Inference service           FastAPI per model; Triton if GPU
Model monitoring            data drift + concept drift + performance drift
Model release pipeline      shadow → canary → production
Evaluation harness          per-feature golden test set + automated eval
Decision logging            every advisory call → ai_advisory_annotation
```

### 2.2 Feature store

```text
online (Redis):     low-latency feature lookup at inference time
                    p95 < 5ms; key = (entity_id, feature_name)
offline (Postgres + parquet snapshots):
                    historical feature values for training
                    point-in-time correctness preserved
```

V5 ADR-0179: Feature store online/offline split; parity tests prevent training-serving skew.

### 2.3 Model registry

Per registered model:

```text
- name
- version (semver)
- artifact location (S3 URI)
- training_run_id (links to training metadata)
- hyperparameters
- training data version (link to feature snapshot)
- metrics (train + validation + test)
- bias metrics (per protected attribute)
- model card (Google-style)
- NIST RMF profile
- EU AI Act class
- deployment_status (registered / shadow / canary / production / retired)
- deployment_history
- approver (human)
- approval_audit_event_id
```

### 2.4 Training pipeline

```text
1. data extraction       → feature snapshot from offline store at training-time T
2. preprocessing         → feature engineering + transformation
3. training              → model.fit(X_train, y_train)
4. validation            → metrics on holdout
5. bias audit            → per-protected-attribute metrics
6. model card draft      → auto-generate from training metadata
7. registration          → model registry insert
8. human approval        → ML engineer reviews; lead approves
9. shadow deployment     → run alongside current production, no user impact
10. canary               → 1% traffic; monitor SLOs
11. production           → 100% traffic
12. monitoring           → drift + performance dashboards
13. retraining trigger   → drift threshold OR scheduled OR manual
```

V5 ADR-0180: Mandatory shadow + canary phases; 100% rollout requires manual approval.

---

## Section 3 — Inference engineering

### 3.1 Service design

```text
- FastAPI per model (Python)
- async API (uvicorn)
- per-model rate limit
- per-tenant quota
- request body schema validated
- response includes: prediction, confidence, model_name, model_version, trained_at, span_id
- decision logged to ai_advisory_annotation OTG node
```

### 3.2 Latency SLOs

```text
real-time advisory (e.g., NC similarity):     p95 < 200ms
near-real-time (e.g., predictive maint):      p95 < 1s
batch (e.g., demand forecast):                async; result in 5min
```

### 3.3 Degradation policy

```text
When inference unavailable (model down, network, etc.):
  - return 503 problem-detail 'ai/advisory-not-available'
  - never silently return a default
  - never hallucinate a "no advice" pretense
  - UI shows: "AI advisor unavailable; please proceed with human judgment"
```

V5 ADR-0181: Inference degradation policy: visible failure, never silent default.

### 3.4 Confidence thresholds

```text
high confidence (≥ 0.85):    show advisory prominently
medium (0.6-0.85):           show advisory with confidence badge
low (< 0.6):                 do not show; log as "no recommendation"
```

V5 ADR-0182: Per-feature confidence threshold with rationale.

---

## Section 4 — Drift detection

### 4.1 Three drift types

```text
Data drift          input distribution shifts (e.g., new defect modes appear)
Concept drift       relationship X→y changes (e.g., process recipe change)
Performance drift   model accuracy degrades on labeled holdout
```

### 4.2 Detection methods

```text
data drift:        KS test, Population Stability Index (PSI), KL divergence
concept drift:     accuracy on labeled feedback; per-cohort accuracy
performance drift: rolling AUROC / MAE / F1
```

### 4.3 Action thresholds

```text
PSI > 0.25         on input feature → retrain candidate
accuracy drop > 5% from baseline    → on-call alert; consider rollback
class imbalance shift > 30%         → investigate
```

V5 ADR-0183: Per-model drift thresholds + action playbook.

---

## Section 5 — Evaluation harness

### 5.1 Golden test set

For every ML feature, maintain:

```text
- 100-1000 labeled examples (input → expected output)
- versioned (git-tracked)
- regression-tested per release
- diversity audit (covers edge cases, multilingual, etc.)
```

### 5.2 Eval metrics

```text
classification:    precision, recall, F1, AUROC, confusion matrix
ranking:           NDCG, MAP, MRR
clustering:        silhouette, Davies-Bouldin, Adjusted Rand
regression:        MAE, RMSE, MAPE
time-series:       MASE, sMAPE
NLP generation:    BLEU, ROUGE, BERTScore, faithfulness
```

### 5.3 Bias eval

```text
per protected attribute (locale, gender if known, plant location):
  - prediction rate per group
  - false-positive rate per group
  - false-negative rate per group
  - statistical parity difference
  - equalized-odds violation
```

V5 ADR-0184: Bias eval mandatory per release; failure threshold = pipeline block.

---

## Section 6 — Generative AI / LLM features

### 6.1 LLM scope in HESEM

```text
- generative drafting (CAPA initial draft, SOP draft, complaint response template)
- RAG-powered SOP search (intelligent doc lookup)
- summarization (audit trail summary)
- translation (en ↔ vi ↔ ja ↔ zh, etc.)
- entity extraction (extract dates, lot codes from free text)
```

### 6.2 LLM choice

```text
managed:        Anthropic Claude API, OpenAI, Google Gemini
open-source:    Llama, Mistral, Qwen self-hosted
RAG-only:       embeddings via sentence-transformers + pgvector
```

V5 ADR-0185: LLM provider strategy: API for prototyping; self-host for production GxP scope.

### 6.3 RAG architecture

```text
1. corpus ingestion:
   - controlled documents (CDOC) + SOPs
   - per-tenant scope
   - chunking strategy: per-section + sliding-window
   - embedding model: e.g., bge-large or open-source equivalent
   - vector index: pgvector (Postgres) or dedicated (Qdrant, Weaviate)

2. query path:
   - user query → embedding
   - similarity search → top-k chunks (k=5-10)
   - rerank (optional)
   - assembled context + query → LLM
   - LLM response includes citations

3. citation grounding:
   - response must cite chunks
   - citations must trace back to authoritative_root CDOC
   - ungrounded claims → response rejected; "no answer found" returned
```

V5 ADR-0186: RAG citation discipline: every claim grounded; ungrounded responses rejected.

### 6.4 Prompt safety

```text
- system prompt locked per release (signed manifest)
- user prompt validated (length limit, no injection patterns)
- no chain-of-prompts that bypass safety guards
- no PII echoing in responses
- no recommendations of regulated actions (RULE-2)
```

V5 ADR-0187: System prompt versioning + signing; OWASP LLM Top 10 controls.

### 6.5 Hallucination mitigation

```text
- always RAG-grounded in HESEM corpus (no out-of-corpus generation)
- confidence threshold per claim
- factual-claim verification step (model evaluates own claim against citation)
- abstain rate metric: prefer "I don't know" over hallucination
```

### 6.6 OWASP LLM Top 10 controls

```text
LLM01 Prompt Injection         input validation; system prompt locked; isolation
LLM02 Insecure Output Handling output schema validation; downstream sanitization
LLM03 Training Data Poisoning  controlled corpus; supply-chain audit
LLM04 Model DoS                rate limit per principal; query complexity bound
LLM05 Supply Chain             SBOM for model + libraries; weight signing
LLM06 Sensitive Info Disclosure PII detection in input/output; redaction
LLM07 Insecure Plugin Design   HESEM has no plugin escapes; LLM is sandboxed
LLM08 Excessive Agency         RULE-2 enforcement; LLM never commits transitions
LLM09 Overreliance             confidence + abstain; human approval explicit
LLM10 Model Theft              weight access controlled; rate-limited inference
```

V5 ADR-0188: OWASP LLM Top 10 control matrix per feature.

---

## Section 7 — AI advisory governance pipeline

### 7.1 Per-call decision log

```python
# Pseudo-code
def call_advisory(feature_id, request, principal):
    audit_log = {
        'feature_id': feature_id,
        'model_name': model.name,
        'model_version': model.version,
        'trained_at': model.trained_at,
        'principal_id': principal.id,
        'tenant_id': principal.tenant_id,
        'request': request,
        'occurred_at': now(),
        'span_id': current_trace_span_id(),
    }
    response = model.predict(request)
    audit_log['response'] = response
    audit_log['confidence'] = response.confidence
    audit_log['authority_class'] = 'ai_advisory_annotation'
    persist_otg_node(audit_log)
    return response
```

### 7.2 Override capture

When the user accepts/rejects/modifies the advisory:

```python
def record_human_decision(advisory_id, decision, override_reason=None):
    persist_ai_advisory_decision({
        'advisory_id': advisory_id,
        'principal_id': principal.id,
        'decision': decision,    # 'accepted', 'rejected', 'modified'
        'override_reason': override_reason,
        'decided_at': now(),
    })
```

### 7.3 Acceptance-rate KPI

Per model, track:

```text
- acceptance rate (% accepted / total advisory)
- override rate (% rejected or modified)
- per-cohort acceptance (by tenant, by role, by domain)
```

V5 ADR-0189: Acceptance-rate KPI as proxy for model usefulness; below threshold → review trigger.

---

## Section 8 — RULE-2 enforcement (CI + runtime)

### 8.1 CI test

```python
# tests/ai_governance/test_rule2_enforcement.py
def test_no_advisory_commits_banned_decision():
    # Static analysis: scan workflow.transition handlers for advisory-as-input
    handlers = scan_transition_handlers()
    for h in handlers:
        for input_class in h.input_classes:
            assert input_class != 'ai_advisory_annotation', \
                f"Handler {h.transition_id} accepts ai_advisory_annotation as input"

def test_no_otg_committed_edge_from_advisory():
    rows = db.execute("""
        SELECT id FROM otg_edge
        WHERE predicate = 'COMMITTED'
          AND subject_node_id IN (
            SELECT id FROM otg_node WHERE authority_class = 'ai_advisory_annotation'
          )
    """).fetchall()
    assert len(rows) == 0, "Found AI advisory with COMMITTED edge (axiom A7 violation)"
```

### 8.2 Runtime guard

```python
def commit_transition(transition_id, principal_id, ...):
    if is_ai_advisory_principal(principal_id):
        raise BannedDecisionError(
            'AI advisory cannot commit a transition (RULE-2 violation)'
        )
    ...
```

### 8.3 Logging

Every attempted RULE-2 violation logged + alerted.

V5 ADR-0190: RULE-2 enforcement at compile time (CI) + runtime (guard).

---

## Section 9 — AI safety incidents

### 9.1 Incident types

```text
- AI advisory accepted by human, but advisory was wrong → harm
- AI advisory triggered an erroneous action chain
- AI generated unsafe content (PII leak, regulated info)
- AI decision was bypassed by intentional misuse
- Drift caused model to silently degrade
```

### 9.2 Response

```text
1. detect (drift alert, complaint, audit)
2. triage (severity, scope, customer impact)
3. contain (rollback model OR disable feature)
4. communicate (customers, regulators if material)
5. root-cause (why did the model fail; why did the human accept)
6. remediate (retrain, retrain data audit, system prompt update)
7. report (NIST AI RMF 'incident' record; ISO 42001 management review)
```

V5 ADR-0191: AI incident response runbook.

---

## Section 10 — AI documentation

### 10.1 Model card (per model)

```yaml
model_card:
  name: nc-similarity-bert-v1
  version: 1.0.3
  trained_at: 2026-04-14
  task: NC similarity clustering (advisory)
  intended_use: "advisory clustering of similar NCs to suggest grouping; never auto-merge"
  intended_users: "QA engineers, NC reviewers"
  out_of_scope:
    - "automated NC merging"
    - "regulatory disposition decisions"
  training_data:
    sources: ["HESEM internal NC corpus (anonymized), 2023-2025"]
    size: "120,000 NCs across 8 tenants"
    bias_audit: "balanced across product families; English+Vietnamese coverage"
  evaluation:
    holdout_size: 5000
    metrics:
      cluster_purity: 0.78
      adjusted_rand_index: 0.65
      precision_at_k=5: 0.83
  bias_metrics:
    per_locale_accuracy:
      en-US: 0.85
      vi-VN: 0.79
    locale_disparity: 7%
  risk_class:
    nist_tier: 2
    eu_ai_act_class: limited_risk
  monitoring:
    drift_check: weekly PSI on input features
    accuracy_check: monthly via labeled feedback sample
    abstain_rate: 12%
  governance:
    owner: ML Engineering
    approver: VP Quality + ML Lead
    approval_record: AUDIT-2026-04-15-0042
```

### 10.2 Datasheet (per dataset)

```yaml
datasheet:
  name: hesem_nc_corpus_2023_2025
  motivation: "Train NC similarity model"
  composition:
    - records: 250,000 NC events
    - tenants: 8
    - locales: en-US (60%), vi-VN (35%), ja-JP (5%)
  collection:
    - source: HESEM authoritative NC root, anonymized
    - period: 2023-01 to 2025-12
  preprocessing:
    - PII redaction (operator names, customer names)
    - text normalization (Unicode NFC)
    - locale tagging
  uses: "ML training; advisory inference"
  distribution: "internal only; no third-party share"
  maintenance:
    - owner: ML Engineering
    - update_cadence: quarterly
```

V5 ADR-0192: Model card + datasheet mandatory per release.

---

## Section 11 — Continuous improvement

```text
- weekly: drift check + retrain trigger evaluation
- monthly: per-feature performance report
- quarterly: full retrain consideration; model card update
- annually: NIST RMF profile review; ISO 42001 management review
```

---

## Section 12 — Edge AI (foreshadowing)

For low-latency edge inference (e.g., vision-based defect detection on the line):

```text
- model exported to ONNX / TFLite
- deployed to edge device (NVIDIA Jetson / Coral / etc.)
- decision logged locally; synced to HESEM core asynchronously
- model version pinned per validation
- model updates require requalification (per GAMP)
```

V5 ADR-0193: Edge AI deployment + qualification policy.

---

## Section 13 — AI cost engineering

```text
inference cost per call:
  - sentence embedding (small):           ~$0.0001
  - small classifier (BERT-base):         ~$0.0002
  - LLM API call (Claude Haiku):          ~$0.001 per request
  - LLM API call (Claude Sonnet):         ~$0.01 per request
  - self-hosted Llama 70B (GPU):          ~$0.005 per request

per-tenant budget (default):
  - $1000/month
  - rate-limited at $50/day
  - over-budget → degraded service, not silent failure
```

V5 ADR-0194: Per-tenant AI cost budget + degradation contract.

---

## Section 14 — Cumulative ADRs

```text
ADR-0178  Per-feature NIST RMF + EU AI Act risk classification
ADR-0179  Feature store online/offline split + parity tests
ADR-0180  Mandatory shadow + canary + manual approval for production
ADR-0181  Inference degradation visible, never silent
ADR-0182  Per-feature confidence thresholds
ADR-0183  Per-model drift thresholds + action playbook
ADR-0184  Bias eval mandatory per release
ADR-0185  LLM provider strategy: API for prototype; self-host for GxP
ADR-0186  RAG citation discipline
ADR-0187  System prompt versioning + signing; OWASP LLM Top 10 controls
ADR-0188  OWASP LLM Top 10 control matrix per feature
ADR-0189  Acceptance-rate KPI as model-usefulness proxy
ADR-0190  RULE-2 enforcement: CI + runtime
ADR-0191  AI incident response runbook
ADR-0192  Model card + datasheet mandatory
ADR-0193  Edge AI deployment + qualification
ADR-0194  Per-tenant AI cost budget + degradation
```

---

## Decision phrase

```text
V5_AI_ENGINEERING_PLAYBOOK_BASELINE_LOCKED
NEXT_FILE: 12_PLATFORM_ENGINEERING_AND_SRE.md
```
