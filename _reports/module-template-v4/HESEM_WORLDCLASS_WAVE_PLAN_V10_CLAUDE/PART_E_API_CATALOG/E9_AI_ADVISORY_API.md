# E9 — AI Advisory API  ·  V10 Deep-Upgrade

```
api_family:      AI Advisory
owner_role:      AI Lead with Compliance Lead
scope:           Per-feature inference invocation; advisory rendering;
                 override capture; governance ledger; model card + red-team
                 retrieval; sub-processor routing; cost envelope enforcement;
                 per-tenant kill switch; PCCP envelope governance (MD);
                 RAG citation discipline (G1-G10); banned-decision attempt log;
                 per-pack overlay J1..J5
sources:         NIST AI RMF 1.0 GOVERN/MAP/MEASURE/MANAGE; NIST AI 600-1
                 GenAI Profile; EU AI Act Art 13 (transparency) + Art 14
                 (human oversight) + Art 9 (risk management); FDA AI/ML SaMD
                 Action Plan (2021) + PCCP Guidance (2023); OWASP LLM Top 10
                 (2024 v1.1); MITRE ATLAS Tactic Catalog v2; OpenAPI 3.1.1;
                 AsyncAPI 3.0; CloudEvents 1.0; RFC 9457
```

The AI Advisory API is the runtime gateway for all 32 AI features cataloged
in L2. No AI inference occurs outside this surface. Every invocation passes
through the triple defense (L1 §4) — CI-time banned-decision guard, runtime
RPC permission check, offline audit sweep — before any sub-processor call is
authorized. Advisory output is non-binding; all decisions remain with human
principals. Override capture (EC-24 per H4) and advisory emit (EC-23) are
mandatory on every invocation.

---

## 1. Purpose and scope

### 1.1 In scope

- Per-feature inference invocation for all 32 L2 features
- Advisory rendering envelope (text, structured, RAG-cited)
- Override capture with reason (human overrides AI advisory)
- Decision record retrieval and advisory history
- Per-feature KPI surface (accuracy, override rate, model drift)
- Model card retrieval per feature (EU AI Act Art 13)
- Red-team report retrieval (MITRE ATLAS + OWASP LLM Top 10)
- Per-tenant feature toggle (enable / disable per L2 §9)
- Per-tenant kill switch (immediate halt of feature class)
- Banned-decision attempt log (L1 §4 trip log)
- Sub-processor routing visibility and security event integration
- Cost envelope enforcement per SLO-18 (L2 §9)
- PCCP envelope governance for MD AI features (L3 §6)
- RAG citation discipline per L2 §3 at API surface (G1-G10)

### 1.2 Out of scope

- Authority decision (E2) — AI advises, E2 commits
- Record persistence (E4) — advisory is an artifact, not a record mutation
- Workflow commit (E3)
- AI training pipeline (offline; governed by AI governance board)
- AI red-team execution (offline; results surfaced via §2.7)
- Sub-processor onboarding (per L2 §8)
- AI model lifecycle stage promotion (offline governance)

### 1.3 L1 §4 triple defense at API surface

Every invocation at `POST /v1/ai/feature/{feature_id}/invoke` passes through three guard layers in sequence before any inference:

| Layer | When | Mechanism | Failure action |
|---|---|---|---|
| **D1 — CI-time** | At deploy | Static analysis: `feature_id` mapped against banned-decision registry (L1 §4 + E2); any feature touching BD scope rejected | Deployment blocked |
| **D2 — Runtime RPC** | Per request | Server checks `feature_id` against current banned-decision set + caller role RACI + tenant kill-switch state | `403 BANNED_DECISION` or `503 KILL_SWITCH` returned; attempt logged |
| **D3 — Offline audit** | Nightly | Sweep of AI invocation log against banned-decision registry; anomaly flagged for review | SEV-2 incident; AI Lead notified |

D1 and D2 are synchronous and blocking. D3 is asynchronous and retroactive. All three layers are required — D1 prevents deployment of misconfigured features, D2 catches runtime misuse, D3 catches adversarial or model-drift induced violations.

---

## 2. Endpoint contracts

### 2.1 Invoke advisory feature

```
PATH        POST /v1/ai/feature/{feature_id}/invoke
AUTH        Bearer; AAL1 minimum; feature-specific RACI per L2 catalog
```

**Path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `feature_id` | string | Yes | L2 feature identifier (e.g., `AI-01`, `AI-18`) |

**Request body `application/json`:**

```jsonc
{
  "input_refs": {
    "root_kind": "NQCASE",
    "root_id":   "nqc-uuid",
    "related_ids": ["capa-uuid", "lot-uuid"]   /* optional additional context */
  },
  "context": {
    "workspace_id": "ws-uuid",
    "surface": "record_shell_tab_ai",
    "tenant_locale": "en-US",
    "regulation_profile": "FDA_21CFR820"
  },
  "caller_role": "QA Engineer",
  "pack_tag": "J4",                              /* null = base feature */
  "idempotency_key": "idem-uuid",
  "cost_budget_override": null                   /* null = use tenant default */
}
```

**Triple-defense pre-flight (D2 layer):**

1. Check `feature_id` ∈ allowed features for tenant.
2. Check tenant kill-switch state for feature class.
3. Check `feature_id` not in banned-decision registry.
4. Check caller role has L2 RACI invoke permission.
5. Check cost envelope: estimated token cost ≤ remaining daily budget (SLO-18).

On any check failure: return immediately with appropriate error; emit banned-attempt log (§2.10).

**Response 200 `application/json`:**

```jsonc
{
  "invocation_id": "inv-uuid",
  "feature_id": "AI-05",
  "feature_name": "CAPA Root Cause Classifier",
  "advisory": {
    "format": "STRUCTURED",
    "content": {
      "probable_root_causes": [
        { "category": "PROCESS", "description": "Inadequate incoming inspection procedure", "confidence": 0.82 },
        { "category": "TRAINING", "description": "Operator retraining gap", "confidence": 0.65 }
      ],
      "recommended_actions": ["Review SOP-102", "Schedule retraining for Shift B"],
      "confidence_overall": 0.79,
      "uncertainty_flag": false
    },
    "rag_citations": [
      {
        "citation_id": "G1",
        "source": "NCR-2024-0041",
        "excerpt": "Similar defect pattern observed in batch 2024-Q2",
        "relevance_score": 0.91,
        "source_type": "INTERNAL_RECORD"
      }
    ],
    "advisory_hash": "sha256:...",
    "model_version": "hesem-ai-v3.2.1",
    "sub_processor": "AZURE_OPENAI_EU",
    "inference_ms": 1240
  },
  "governance": {
    "advisory_is_binding": false,
    "human_decision_required": true,
    "override_endpoint": "/v1/ai/invocations/inv-uuid/override",
    "ec_23_emitted": true,
    "cost_tokens_used": 1840,
    "cost_budget_remaining_day": 98160
  },
  "pccp_applicable": false,
  "expires_at": "2025-11-14T17:00:00Z"      /* advisory stale after 8h */
}
```

**Mandatory evidence emit:** `EC-23 advisory_record` on every successful invocation. `EC-24 override_record` emitted by §2.2 when human overrides.

**SLO:** p50 < 2s, p95 < 8s (per SLO-14). Streaming response via AsyncAPI 3.0 SSE for long-inference features (AI-21, AI-31) — first token within 3s, full response within 30s.

**Rate limit:** Per-feature configurable; default 60 invoke/min per tenant. Burst allowance 120 for 30s.

---

### 2.2 Capture human override

```
PATH        POST /v1/ai/invocations/{invocation_id}/override
AUTH        Bearer; same or higher AAL as originating invocation
```

**Request body:**

```jsonc
{
  "override_decision": "REJECT_ADVISORY",  /* ACCEPT | REJECT_ADVISORY | MODIFY_ADVISORY */
  "override_reason": "Root cause analysis does not account for supplier change in Q3",
  "override_action_taken": "Manual root cause: supplier material substitution",
  "override_by_role": "Senior QA Engineer",
  "override_signature_ref": "sig-uuid"     /* E7 e-signature if BD-level decision */
}
```

**Response 200:**

```jsonc
{
  "override_id": "ov-uuid",
  "invocation_id": "inv-uuid",
  "feature_id": "AI-05",
  "override_recorded_at": "2025-11-14T10:15:00Z",
  "ec_24_emitted": true,
  "governance_ledger_updated": true,
  "override_rate_updated": true   /* updates per-feature KPI */
}
```

**Override audit chain:** EC-24 event links `invocation_id → override_id → decision_ref`. This chain is immutable and included in audit pack exports.

---

### 2.3 Retrieve advisory record

```
PATH        GET /v1/ai/invocations/{invocation_id}
AUTH        Bearer; AAL1; role must match original invoke RACI or Compliance role
```

**Response 200:** Full invocation record: input refs, advisory content, rag_citations, governance block, sub_processor, EC-23 link, override record if present.

**SLO:** p95 < 250ms.

---

### 2.4 List advisory history for record

```
PATH        GET /v1/ai/invocations/record/{root_kind}/{root_id}
AUTH        Bearer; AAL1; tenant RLS
```

**Query parameters:** `feature_id` filter, `date_from`, `date_to`, `has_override` boolean, cursor pagination (limit 50, max 200).

**Response 200:** Paginated list of invocation summaries: `invocation_id`, `feature_id`, `feature_name`, `invoked_at`, `advisory_confidence_overall`, `has_override`, `override_type`.

**Use case:** Record-shell AI tab (F5-equivalent) surfaces full advisory history with override outcomes — enables auditor to see AI-human decision interaction chain.

**SLO:** p95 < 350ms.

---

### 2.5 Per-feature KPI surface

```
PATH        GET /v1/ai/features/{feature_id}/kpi
AUTH        Bearer; AI Lead or Compliance Lead role; AAL1
```

**Response 200:**

```jsonc
{
  "feature_id": "AI-05",
  "feature_name": "CAPA Root Cause Classifier",
  "kpi_window": "rolling_30d",
  "invocation_count": 842,
  "advisory_accept_rate": 0.73,
  "override_rate": 0.27,
  "override_reason_top3": [
    { "category": "CONTEXT_MISSING", "count": 112 },
    { "category": "DOMAIN_EXPERT_DISAGREEMENT", "count": 89 },
    { "category": "REGULATORY_CONSTRAINT", "count": 26 }
  ],
  "confidence_distribution": {
    "p50": 0.78,
    "p25": 0.61,
    "p75": 0.89
  },
  "model_drift_score": 0.04,         /* 0 = no drift; > 0.15 triggers alert */
  "drift_alert_active": false,
  "cost_tokens_30d": 1840000,
  "cost_usd_estimate_30d": 55.20,
  "slo_14_breach_count": 2,
  "slo_18_breach_count": 0,
  "last_red_team_date": "2025-10-01",
  "pccp_version": null               /* non-null for MD AI features */
}
```

**SLO:** p95 < 500ms. Data sourced from pre-aggregated analytics (refreshed hourly).

---

### 2.6 Model card retrieval

```
PATH        GET /v1/ai/features/{feature_id}/model-card
AUTH        Bearer; AAL1; any authenticated role
```

Provides EU AI Act Art 13 (transparency) mandatory disclosure. Model card format aligned to Hugging Face Model Card specification + FDA AI/ML PCCP structure.

**Response 200 `application/json`:**

```jsonc
{
  "feature_id": "AI-05",
  "model_id": "hesem-ai-rc-classifier-v3",
  "model_card_version": "2025-09",
  "intended_use": "Advisory root cause classification for nonconformance records. Not binding. Requires human expert review before action.",
  "out_of_scope_uses": ["Autonomous decision making", "Regulatory submissions without human review"],
  "training_data_summary": "Historical NC records from tenant-anonymized corpus; date range 2019-2024; N=142,000",
  "known_limitations": [
    "Lower accuracy for novel failure modes not in training set (confidence floor ~0.4)",
    "Biased toward English-language input; non-English entries should be translated pre-invoke"
  ],
  "performance_metrics": {
    "accuracy_internal_test": 0.81,
    "precision": 0.78,
    "recall": 0.83,
    "f1": 0.80
  },
  "fairness_evaluation": "Evaluated across industry verticals; no statistically significant disparity across J1-J5 packs",
  "robustness_red_team_summary": "Last red-team: 2025-10-01; 0 critical findings; 3 medium findings remediated",
  "sub_processor": "AZURE_OPENAI_EU",
  "sub_processor_dpa_ref": "DPA-AZURE-2025-03",
  "eu_ai_act_risk_class": "MINIMAL",
  "pccp_ref": null,
  "last_updated": "2025-11-01"
}
```

**Rate limit:** 60 req/min. **SLO:** p95 < 300ms.

---

### 2.7 Red-team report retrieval

```
PATH        GET /v1/ai/features/{feature_id}/red-team-report
AUTH        Bearer; AI Lead or Security role; AAL2
```

Returns structured red-team report per MITRE ATLAS tactic catalog and OWASP LLM Top 10 (2024 v1.1).

**Response 200:**

```jsonc
{
  "feature_id": "AI-05",
  "report_date": "2025-10-01",
  "report_id": "rt-uuid",
  "conducted_by": "External: SecurAI Partners",
  "atlas_tactics_tested": [
    "AML.TA0001 (ML Model Access)",
    "AML.TA0006 (Exfiltration via ML inference)",
    "AML.TA0007 (Impact: model corruption)"
  ],
  "owasp_llm_tested": ["LLM01 Prompt Injection", "LLM02 Insecure Output Handling", "LLM06 Sensitive Information Disclosure"],
  "findings": [
    {
      "finding_id": "RT-05-001",
      "severity": "MEDIUM",
      "tactic": "LLM01",
      "description": "Multi-shot prompt injection could steer root cause toward attacker-controlled category",
      "remediation": "Input sanitization layer added; max prompt token limit enforced",
      "status": "REMEDIATED",
      "remediation_evidence_ref": "EC-33/ev-uuid-rt-05-001"
    }
  ],
  "overall_risk_rating": "LOW",
  "next_red_team_due": "2026-04-01"
}
```

**Rate limit:** 20 req/min. **SLO:** p95 < 500ms.

---

### 2.8 Per-tenant feature toggle

```
PATH        PUT /v1/ai/tenant/{tenant_id}/features/{feature_id}/toggle
AUTH        Bearer; AAL2; AI Lead or Tenant Admin role
```

**Request body:**

```jsonc
{
  "enabled": false,
  "reason": "Pending red-team remediation for AI-18",
  "effective_from": "2025-11-14T12:00:00Z",
  "effective_to": null          /* null = indefinite */
}
```

**Response 200:** Toggle state confirmed; active invocations not interrupted but new invocations return `503 FEATURE_DISABLED`. Toggle change emitted as EC-22 admin audit event.

**Rate limit:** 10 req/min.

---

### 2.9 Per-tenant kill switch

```
PATH        POST /v1/ai/tenant/{tenant_id}/kill-switch
AUTH        Bearer; AAL3 (hardware token); AI Lead + Compliance Lead dual-sign
```

**Kill switch scope:**

| Scope | Effect |
|---|---|
| `class:advisory` | All advisory features halted |
| `class:generative` | All LLM generative features halted (AI-21, AI-31, AI-32) |
| `feature:{feature_id}` | Single feature halted |
| `all` | All AI features halted tenant-wide |

**Request body:**

```jsonc
{
  "scope": "class:generative",
  "reason": "EU AI Act Art 14 human oversight concern raised by Compliance",
  "initiated_by_role": "Compliance Lead",
  "cosign_by": "compliance-lead-uuid",
  "cosign_token": "aak3-token-ref"
}
```

**Response 200:** Kill switch applied within 5 seconds across all edge nodes. Active SSE streams terminated. In-flight invocations return 503. Kill switch state persisted to Redis + DB; survives node restart.

**Lift kill switch:**

```
DELETE /v1/ai/tenant/{tenant_id}/kill-switch/{kill_switch_id}
       Requires same AAL3 dual-sign. Reason required.
```

**Audit emit:** `EC-22 kill_switch_event` (activate + lift) with dual-sign evidence refs.

---

### 2.10 Banned-decision attempt log

```
PATH        GET /v1/ai/banned-attempts
AUTH        Bearer; AI Lead or Compliance Lead; AAL2
```

**Query parameters:** `feature_id`, `tenant_id`, `from`, `to`, cursor pagination.

**Response 200:** Paginated list of D2 defense trips: `attempt_id`, `feature_id`, `banned_rule`, `caller_id`, `caller_role`, `attempted_at`, `ip_address`, `request_hash`.

**Purpose:** Evidence that the L1 §4 triple defense is operational. Required for FDA AI/ML SaMD audit trail and EU AI Act Art 9 risk management documentation.

**Retention:** 7 years per COMPLIANCE WORM (class EC-22 subtype `banned_attempt`).

**SLO:** p95 < 400ms.

---

### 2.11 Sub-processor routing visibility

```
PATH        GET /v1/ai/sub-processors
AUTH        Bearer; AI Lead or Compliance Lead; AAL1
```

**Response 200:**

```jsonc
{
  "sub_processors": [
    {
      "id": "AZURE_OPENAI_EU",
      "name": "Azure OpenAI Service (EU West)",
      "region": "EU",
      "data_residency": "EEA",
      "dpa_ref": "DPA-AZURE-2025-03",
      "dpa_expiry": "2027-03-01",
      "features_routed": ["AI-01", "AI-02", "AI-03", "AI-04", "AI-05"],
      "security_event_webhook": "https://hesem-siem.internal/azure-openai-events",
      "last_security_event": "2025-10-15T03:00:00Z",
      "soc2_report_ref": "SOC2-AZURE-2025-H1",
      "status": "ACTIVE"
    },
    {
      "id": "BEDROCK_US",
      "name": "AWS Bedrock (US East)",
      "region": "US",
      "data_residency": "US",
      "dpa_ref": "DPA-AWS-2025-01",
      "features_routed": ["AI-06", "AI-07"],
      "status": "ACTIVE"
    }
  ]
}
```

**Security event integration per H1 §3 windows:**

Sub-processors publish security events to HESEM SIEM via webhook. Integration windows:

- **Detection window:** Security event must reach HESEM SIEM within 4 hours of occurrence (SLO-22 per M5).
- **Response window:** HESEM must acknowledge sub-processor security event within 24 hours.
- **Escalation window:** If sub-processor cannot confirm remediation within 72 hours → kill switch triggered per §2.9.

**SLO:** p95 < 300ms.

---

### 2.12 PCCP envelope governance (Medical Device)

```
PATH        GET /v1/ai/features/{feature_id}/pccp
AUTH        Bearer; Regulatory Affairs or AI Lead; AAL1
APPLICABLE  J4 Medical Device features only; EU AI Act SaMD + FDA PCCP
```

**PCCP** (Predetermined Change Control Plan) governs model updates without requiring new 510(k)/PMA submission.

**Response 200:**

```jsonc
{
  "feature_id": "AI-19",
  "feature_name": "Adverse Event Vigilance Classifier",
  "pccp_version": "v2.1",
  "pccp_submission_ref": "FDA-PCCP-2025-0044",
  "pccp_approved_by": "FDA CDRH",
  "pccp_approved_date": "2025-06-01",
  "allowed_modifications": [
    {
      "modification_type": "RETRAINING",
      "trigger": "Drift score > 0.15 OR 90-day scheduled",
      "boundary": "Training data addition only; no architecture change",
      "validation_required": "Internal validation + hold-out test; performance delta < 3%",
      "notification_required": false,
      "submission_required": false
    },
    {
      "modification_type": "ARCHITECTURE_CHANGE",
      "trigger": "Approved by AI Lead + Regulatory Affairs",
      "boundary": "Major version increment",
      "validation_required": "Full validation study",
      "notification_required": true,
      "submission_required": true,
      "submission_type": "510k_supplement"
    }
  ],
  "current_model_version": "hesem-ai-vc-v2.3.1",
  "current_model_within_pccp": true,
  "drift_score_current": 0.06,
  "next_validation_due": "2026-02-01",
  "ec_24_required_on_architecture_change": true
}
```

**PCCP change lifecycle:** Any model update goes through `POST /v1/ai/features/{feature_id}/pccp/propose-change` → Regulatory Affairs review → AI Lead approval → model deployment. Each step emits EC-24 with the BD-level e-signature requirement (BD-26 per E7).

---

## 2b. Extended endpoint detail

### 2b.1 Invoke advisory — streaming mode (SSE)

Long-inference features (AI-21 APR drafting, AI-31 Audit Pack drafting, AI-32 PSUR drafting) support Server-Sent Events streaming. Clients include `Accept: text/event-stream` in the invoke request.

**SSE event stream protocol:**

```
event: advisory_start
data: {"invocation_id": "inv-uuid", "feature_id": "AI-21", "estimated_tokens": 4200}

event: advisory_chunk
data: {"chunk_index": 1, "text": "Annual Product Quality Review — Draft\n\n## 1. Product Overview\n"}

event: advisory_chunk
data: {"chunk_index": 2, "text": "Product: Paracetamol 500mg Tablets (INN: paracetamol)\nSite: Plant A — Manufacturing License MFG-EU-0044\n"}

/* ... additional chunks ... */

event: advisory_complete
data: {
  "invocation_id": "inv-uuid",
  "total_tokens": 4180,
  "rag_citations": [ /* ... */ ],
  "advisory_hash": "sha256:...",
  "ec_23_emitted": true,
  "cost_tokens_used": 4180,
  "advisory_is_binding": false,
  "draft_marker": "ADVISORY_DRAFT — QP review and e-signature required before submission"
}

event: error
data: {"error_code": "BUDGET_EXHAUSTED", "message": "Daily generative token budget exhausted"}
```

**SSE reconnect:** If SSE connection drops mid-stream, client reconnects with `Last-Event-ID` header set to last received `chunk_index`. Server resumes from next chunk (chunks buffered for 60 seconds). If buffer expired, client must reinvoke.

**SSE rate limit:** 5 concurrent SSE streams per tenant. 6th stream returns `429 TOO_MANY_STREAMS`.

**AsyncAPI 3.0 channel:** `hesem.ai.advisory.stream/{tenant_id}/{invocation_id}` — also available as WebSocket (RFC 6455) for client environments that do not support SSE.

---

### 2b.2 Invoke advisory — batch mode (LRO)

When invoking AI features across a large set of records (e.g., AI-11 demand anomaly detection across 5,000 SKUs), batch mode is supported via LRO.

```
PATH        POST /v1/ai/feature/{feature_id}/invoke-batch
AUTH        Bearer; AAL2; AI Lead or authorized role per L2 RACI
```

**Request body:**

```jsonc
{
  "input_batch": [
    { "root_kind": "SKU", "root_id": "sku-001" },
    { "root_kind": "SKU", "root_id": "sku-002" }
    /* ... up to 1,000 records per batch job */
  ],
  "pack_tag": "J2",
  "cost_budget_override": null,
  "idempotency_key": "batch-idem-uuid"
}
```

**Response 202 (LRO):**

```jsonc
{
  "job_id": "batch-job-uuid",
  "feature_id": "AI-11",
  "input_count": 1000,
  "estimated_completion": "2025-11-14T10:30:00Z",
  "estimated_tokens": 180000,
  "_links": { "status": "/v1/lro/batch-job-uuid" }
}
```

**LRO completion:** Results available at `/v1/ai/batch/{job_id}/results` — paginated cursor list of per-record advisory summaries. Each advisory emits EC-23. Failed items listed in `failed_items[]` with error code.

**Batch cost control:** If mid-batch token budget exhaustion occurs, job is paused and status set to `PAUSED_BUDGET`. Remaining records not processed. Job can be resumed after budget reset.

---

### 2b.3 Advisory expiry and refresh

Advisory records have a TTL defined per feature class:

| Feature class | Advisory TTL | Rationale |
|---|---|---|
| Root cause / classification | 8 hours | Data may change as investigation progresses |
| Demand / planning | 24 hours | Demand signals updated daily |
| Generative drafts (AI-21, AI-31) | 4 hours | Source records evolve rapidly during review cycle |
| Security / red-team (AI-18, AI-30) | 1 hour | Security posture changes rapidly |
| Traceability / recall (AI-20) | 2 hours | Lot data critical to recall scope |

Expired advisories return `410 Gone` on retrieve (§2.3). Fresh invocation required. Expired advisory is retained in audit log for 7 years (EC-23 WORM, GOVERNANCE mode).

**Stale citation detection (G8):** On retrieve, server checks all `rag_citations` against source record `updated_at`. If any source record was modified after advisory was issued, `stale_citation_detected: true` is returned in the advisory metadata and caller is prompted to re-invoke.

---

### 2b.4 Advisory governance ledger

All invocations feed a per-tenant per-feature governance ledger. Ledger is queryable:

```
GET /v1/ai/governance-ledger?feature_id=AI-05&from=2025-11-01&to=2025-11-30
```

**Response:** Paginated ledger entries: `invocation_id`, `invoked_at`, `invoked_by`, `advisory_confidence`, `had_override`, `override_reason_category`, `ec_23_ref`, `ec_24_ref`. Used by Compliance Lead for monthly AI governance review required per EU AI Act Art 9 §3 risk management documentation.

**Governance ledger export:** `POST /v1/ai/governance-ledger/export` → LRO; output signed CSV or JSON; required input for FDA AI/ML SaMD PCCP annual report for J4 scope.

---

## 3. L2 feature catalog cross-reference (32 features)

All 32 L2 AI features are addressable via this API. Feature classes:

| Class | Feature IDs | Domain | Invoke role |
|---|---|---|---|
| Root Cause & Quality | AI-01..AI-07 | Quality (C7) | QA Engineer |
| Planning & Demand | AI-08..AI-11 | Planning (C3) | Planner |
| Inventory & Logistics | AI-12..AI-14 | Inventory (C5) | Inventory Manager |
| Supplier & Procurement | AI-15..AI-17 | Procurement (C4) | Procurement Lead |
| Security & Red-Team | AI-18, AI-30..AI-32 | Core (C14) | Security Lead |
| Pharmacovigilance & Vigilance | AI-19, AI-21 | Regulatory (C7+J1+J4) | Regulatory Affairs |
| Traceability & Recall | AI-20, AI-22..AI-24 | Traceability (C8) | QA + Logistics |
| Maintenance & EHS | AI-25..AI-27 | Maintenance (C9) | Maintenance Eng |
| Finance & Cost | AI-28..AI-29 | Finance (C11) | Finance Controller |

**Key features by pack relevance:**

| Feature ID | Name | Pack | Regulated output |
|---|---|---|---|
| AI-05 | CAPA Root Cause Classifier | Base | EC-23 advisory |
| AI-06 | CAPA Effectiveness Predictor | Base | EC-23 advisory |
| AI-11 | Demand Anomaly Detector | Base | EC-23 advisory |
| AI-18 | Counterfeit Detection Classifier | J3 Aero | EC-23 + EC-30 |
| AI-19 | Adverse Event Vigilance Classifier | J4 MD | EC-23 + PCCP |
| AI-20 | Recall Scope Estimator | J1/J4 | EC-23 advisory |
| AI-21 | APR / PSUR Drafting Assistant | J1/J4 | EC-23 (draft only) |
| AI-31 | Audit Pack Drafting Assistant | Base | EC-23 (draft only) |

**AI-21 and AI-31 advisory boundary:** These features produce draft text (APR, PSUR, Audit Pack narrative). Advisory output is always marked `ADVISORY_DRAFT` — it is never submitted without human expert review and formal approval via E7 e-signature chain. PCCP applies to AI-21 for J4 scope.

### 3.1 Full L2 feature registry (32 features)

Detailed registry of all 32 L2 AI features, aligned to the 14 capability domains:

| Feature ID | Name | Domain | Input records | Advisory type | Regulatory constraint |
|---|---|---|---|---|---|
| AI-01 | NC Duplicate Detector | C7 Quality | NQCASE | Structured: similarity score, duplicate list | None |
| AI-02 | NC Severity Classifier | C7 Quality | NQCASE | Structured: severity, risk tier | EU MDR Art.87 for J4 |
| AI-03 | NC Disposition Recommender | C7 Quality | NQCASE | Structured: disposition options, confidence | 21 CFR 820.90 |
| AI-04 | Inspection Defect Classifier | C7 Quality | INSP, JO | Structured: defect class, zone | AS9100D §8.5 |
| AI-05 | CAPA Root Cause Classifier | C7 Quality | NQCASE, CAPA | Structured: root cause categories | IATF 16949 §10.2 |
| AI-06 | CAPA Effectiveness Predictor | C7 Quality | CAPA | Structured: effectiveness probability | 21 CFR 820.100 |
| AI-07 | SPC Anomaly Detector | C7 Quality | JO (process data) | Structured: anomaly signal, zone rule | IATF 16949 §9.1 |
| AI-08 | Demand Forecast (base) | C3 Planning | SKU, SO | Structured: demand forecast + CI | IATF §8.2 for J2 |
| AI-09 | Lead Time Predictor | C3 Planning | PO, SKU | Structured: lead time estimate + risk | None |
| AI-10 | Capacity Constraint Identifier | C3 Planning | WO, JO | Structured: bottleneck + severity | None |
| AI-11 | Demand Anomaly Detector | C3 Planning | SKU, SO | Structured: anomaly flag + cause hypothesis | None |
| AI-12 | Inventory Reorder Advisor | C5 Inventory | SKU, WH | Structured: reorder point + quantity | None |
| AI-13 | Obsolescence Risk Predictor | C5 Inventory | SKU | Structured: obsolescence score | AS5553A for J3 |
| AI-14 | Warehouse Slotting Optimizer | C5 Inventory | WH, SKU | Structured: slot assignments | None |
| AI-15 | Supplier Risk Scorer | C4 Procurement | PREC, PO | Structured: risk score + risk factors | ISO 13485 §7.4 |
| AI-16 | Spend Anomaly Detector | C4 Procurement | PO | Structured: anomaly flag + reason | None |
| AI-17 | Supplier Delivery Predictor | C4 Procurement | PO, PREC | Structured: predicted delivery date + CI | None |
| AI-18 | Counterfeit Detection Classifier | C8 Traceability (J3) | LOT, INSP | Structured: risk score + ITAR flag | AS5553A + ITAR |
| AI-19 | Adverse Event Vigilance Classifier | C7 Quality (J4) | Complaint | Structured: MDR reportability + deadline | EU MDR Art.87 + PCCP |
| AI-20 | Recall Scope Estimator | C8 Traceability | LOT, EC-10 | Structured: scope + lot list | FSMA §204 + EU MDR |
| AI-21 | APR / PSUR Drafting Assistant | C7 Quality (J1/J4) | BREL, CAPA, batch | Text: draft narrative | EU GMP Annex 11 + MDR Art.86 + PCCP (J4) |
| AI-22 | DSCSA Chain Verifier | C8 Traceability (J1) | LOT | Structured: chain status | DSCSA §582 |
| AI-23 | Traceability Gap Identifier | C8 Traceability | LOT | Structured: gap list + severity | FSMA §204 |
| AI-24 | Lot Genealogy Reconstructor | C8 Traceability | LOT | Structured: genealogy tree | FSMA §204 |
| AI-25 | Predictive Maintenance Advisor | C9 Maintenance | WO (PM) | Structured: failure probability + days-to-failure | None |
| AI-26 | EHS Incident Pattern Recognizer | C9 Maintenance | MWO, EHS events | Structured: pattern + risk tier | OSHA / EU REACH |
| AI-27 | PM Schedule Optimizer | C9 Maintenance | WO, asset | Structured: optimized schedule | None |
| AI-28 | Budget Variance Explainer | C11 Finance | Budget vs actuals | Text: variance narrative | None |
| AI-29 | Cost Anomaly Detector | C11 Finance | JO, PO | Structured: anomaly + amount | None |
| AI-30 | Security Threat Classifier | C14 Core | SIEM events | Structured: threat class + severity | SOC 2 + ITAR |
| AI-31 | Audit Pack Drafting Assistant | C14 Core / C7 | Audit evidence | Text: draft narrative sections | EU AI Act Art 13; AS9100D |
| AI-32 | Regulatory Submission Checker | C7/C14 (J4) | Regulatory dossier | Structured: checklist completeness + gaps | EU MDR Annex II + PCCP |

---

## 4. RAG citation discipline (G1-G10)

Per L2 §3, all generative and RAG-enabled features MUST apply the following citation rules at the API surface:

| Rule | Requirement | API enforcement |
|---|---|---|
| G1 | Every advisory referencing a record MUST include citation | `rag_citations[]` non-empty when content references records |
| G2 | Citation must include source type (internal record / external standard / training corpus) | `source_type` field required |
| G3 | Relevance score must accompany citation | `relevance_score` float [0.0, 1.0] required |
| G4 | Citations with `relevance_score < 0.5` must be flagged as weak | `weak_citation: true` added automatically |
| G5 | AI-21 and AI-31 drafts must cite every factual claim | Validation at inference layer; drafts with uncited claims blocked |
| G6 | No citation may reference data outside tenant scope | RLS enforced at retrieval layer; cross-tenant citation impossible |
| G7 | Citation must include document version if applicable | `doc_version` field included for controlled documents |
| G8 | Citation staleness warning if source record modified after advisory | `stale_citation: true` if source record `updated_at` > `invocation_at` |
| G9 | Maximum 20 citations per advisory (prevents hallucination hiding) | Server truncates at 20; `citations_truncated: true` flagged |
| G10 | Zero-citation generative output must declare absence | `rag_citations: []` with `no_citation_reason: "TRAINING_DATA_ONLY"` |

---

## 5. Per-pack overlays (J1..J5)

### J1 — Pharmaceutical

**AI-21 APR Drafting:** Feature generates draft Annual Product Quality Review (APQR) narrative from eBR summaries, deviation records, CAPA data, and SPC outputs. Advisory marked `DRAFT — QP review required`. QP must e-sign (BD-3 e-sig) before submission. AI-21 citations must include all referenced batch records (G1 rule).

**AI-20 Recall Scope Estimator:** J1 pack adds `inn_name`, `batch_range`, `distribution_country_list` to advisory output. Scope estimate includes pharmacovigilance signal integration (EC-23 cross-link to pharmacovigilance DB).

**Freshness SLO override:** AI-21 advisory expires after 4 hours for J1 scope (vs default 8 hours) — APQR data is time-sensitive.

**AI-22 DSCSA Chain Verifier (J1):** Verifies Drug Supply Chain Security Act §582 chain for prescription drug lots. Advisory checks: product identifier (NDC + lot + expiry + serial), transaction history chain completeness, trading partner verification status. Output includes `dscsa_chain_status`, `trading_partner_verified`, `saleable_returns_check`. Chain failure triggers lot quarantine recommendation and pharmacovigilance notification. Advisory expires after 1 hour for J1 scope — DSCSA chain status changes rapidly during distribution.

**AI-06 CAPA Effectiveness with APQR integration (J1):** Effectiveness predictor integrates: APQR trend analysis, batch-level defect frequency over 12-month rolling window, Cpk delta pre/post CAPA. Output includes `apqr_cohort_ref` and `repeat_defect_risk_score` for J1 scope. Advisory cites the APQR source record (G1 rule enforced) and flags if the CAPA was previously classified as effective in a prior APQR cycle but defect recurred.

---

### J2 — Automotive

**AI-05 CAPA RCC with IATF overlay:** Advisory includes 8D report section draft if `pack_tag = J2`. Output block:

```jsonc
{
  "eight_d_draft": {
    "d3_containment": "Quarantine lot 2025-Q3 pending root cause confirmation",
    "d4_root_cause": "Supplier A material substitution (EC-25 ref: scar-uuid)",
    "d5_corrective": "Supplier corrective action per SCAR-2025-0044",
    "d6_verification": "SPC Cpk measurement required (target ≥ 1.33)"
  }
}
```

**AI-12 Customer Demand Forecast (IATF §8.2):** Advisory includes OEM-specific demand signal overlay when `pack_tag = J2`. Customer EDI feed reference included in citations (G2 source_type = `EXTERNAL_EDI`).

---

### J3 — Aerospace & Defense

**AI-18 Counterfeit Detection Classifier:** Detects suspect counterfeit electronic components using dimensional analysis + material spectroscopy advisory. Output includes:

```jsonc
{
  "counterfeit_risk_score": 0.87,
  "risk_class": "HIGH",
  "recommended_action": "Quarantine and escalate to Defense Logistics Agency",
  "as5553_compliance": "Documented per AS5553A §4.3",
  "itar_flag": true,
  "itar_controlled_output": true
}
```

`itar_controlled_output: true` means the advisory response is tagged as ITAR-controlled; non-cleared recipients receive a 451 response. EC-30 evidence emitted in addition to EC-23 for every AI-18 invocation.

**AI-31 Audit Pack Drafting (AS9100D):** Generates draft AS9100D §8.1 conformance narrative. NADCAP-specific sections included when `nadcap_scope: true` in context.

---

### J4 — Medical Device

**AI-19 Adverse Event Vigilance Classifier:** Classifies complaint records for MDR Article 87 reportability. Advisory output:

```jsonc
{
  "mdr_reportable": true,
  "mdr_confidence": 0.91,
  "mdr_article": "Art.87(1)",
  "reporting_deadline": "2025-11-29T00:00:00Z",  /* 15 days from complaint */
  "notified_body_ref": "TÜV SÜD-0123",
  "fsca_indicator": false,
  "pccp_version": "v2.1",
  "advisory_is_binding": false
}
```

PCCP applies (§2.12). Advisory is non-binding — Regulatory Affairs must confirm MDR submission. EC-24 required on confirmation.

**AI-21 PSUR Drafting:** Periodic Safety Update Report draft for MDR Article 86. Same QP-equivalent signature requirement: Regulatory Affairs Lead e-sign (BD-25 per E7) before PSUR submission.

---

### J3b — Aerospace & Defense additional features

**AI-30 Security Threat Classifier (C14 + J3):** In J3 scope, AI-30 is extended to classify supply-chain cyber threats against MIL-SPEC components (IC counterfeit detection cross-linked with AI-18). Security events classified include: unauthorized access to ITAR-controlled technical data, anomalous export data patterns, counterfeit component supply signals. Output:

```jsonc
{
  "threat_class": "SUPPLY_CHAIN_COUNTERFEIT",
  "mitre_atlas_tactic": "AML.TA0001",
  "severity": "HIGH",
  "itar_relevance": true,
  "recommended_action": "Escalate to DCSA counterintelligence liaison",
  "advisory_is_binding": false,
  "itar_controlled_output": true
}
```

**AI-32 Regulatory Submission Checker (J3 AS9100D):** Checks design dossier completeness for AS9100D first article inspection (FAI) against AS9102B checklist. Returns list of missing or non-conforming sections with NADCAP-specific additions when `nadcap_scope: true`. Advisory includes a completeness percentage and list of open action items before FAI sign-off.

---

### J4b — Medical Device additional features

**AI-32 Regulatory Submission Checker (EU MDR):** For J4 scope, AI-32 checks technical documentation completeness against EU MDR 2017/745 Annex II (Technical Documentation) and Annex III (Post-Market Surveillance). Output:

```jsonc
{
  "mdr_annex_ii_completeness": 0.87,
  "mdr_annex_iii_completeness": 0.72,
  "missing_sections": [
    { "section": "Annex III §1.4", "description": "PMCF plan not present or outdated > 24 months" },
    { "section": "Annex II §6.1", "description": "Clinical evaluation report: no reference to MDR CER guidance MDCG 2020-6" }
  ],
  "notified_body_submission_ready": false,
  "pccp_version": "v2.1",
  "advisory_is_binding": false
}
```

**AI-19 batch mode (post-market vigilance sweep):** J4 tenants run AI-19 in batch mode nightly against all open customer complaint records (§2b.2 batch invoke). Any complaint classified as MDR reportable with `confidence > 0.85` triggers an automated alert to Regulatory Affairs with a 24-hour acknowledgement SLO (SLO-22 variant for J4). Batch advisory EC-23 events are aggregated into the monthly PMCF summary report.

---

### J5 — Food Safety

**AI-20 Recall Scope Estimator (FSMA §204):** Advisory generates recall scope estimate using FSMA traceability lot codes (EC-10 EC-09). Output includes:

```jsonc
{
  "recall_scope_lots": ["TLC-2025-1009", "TLC-2025-1010"],
  "estimated_units_affected": 12400,
  "distribution_states": ["CA", "TX", "FL"],
  "fsma204_cte_coverage": "SHIPPING",
  "recall_class": "FDA_CLASS_II",
  "advisory_confidence": 0.84
}
```

Advisory must be confirmed by QA Director (BD-22 e-sig) before recall initiation. EC-23 cite includes all EC-09 and EC-10 records in scope.

**J5 AI-23 Traceability Gap Identifier:** Nightly batch sweep of lot records for FSMA §204 CTE/KDE completeness. Advisory identifies lots where Critical Tracking Event data is incomplete or where KDE values fail validation (e.g., missing `traceability_lot_code`, implausible quantity). Output delivered as a prioritized gap list to Supply Chain team. Gaps categorized as CRITICAL (lot cannot be located within 24h), HIGH (data incomplete but locatable), MEDIUM (data quality concerns).

**J5 freshness:** AI-24 Lot Genealogy Reconstructor advisory expires after 30 minutes for J5 scope (vs 8h default) — lot linkage data changes rapidly during active production.

---

## 5b. Cross-cutting conventions

### 5b.1 Advisory envelope standard

All advisory responses use a consistent top-level envelope regardless of feature ID:

```jsonc
{
  "invocation_id": "inv-uuid",
  "feature_id": "AI-05",
  "feature_name": "CAPA Root Cause Classifier",
  "advisory": { /* feature-specific content */ },
  "governance": {
    "advisory_is_binding": false,
    "human_decision_required": true,
    "override_endpoint": "/v1/ai/invocations/{invocation_id}/override",
    "ec_23_emitted": true,
    "cost_tokens_used": 1840,
    "cost_budget_remaining_day": 98160
  },
  "meta": {
    "request_id": "req-uuid",
    "tenant_id": "tenant-uuid",
    "api_version": "2025-11",
    "pack_tag": "J4",
    "locale": "en-US",
    "regulation_profile": "EU_MDR"
  },
  "expires_at": "2025-11-14T17:00:00Z"
}
```

**`advisory_is_binding: false` is hardcoded and cannot be overridden.** This is an architectural invariant, not a configuration option. Any advisory that presents itself as binding is a system error and must be rejected by the UI.

### 5b.2 Idempotency

All invoke endpoints accept `Idempotency-Key`. If an identical key is presented within 24 hours, the original advisory is returned without re-invoking the AI model. This prevents duplicate EC-23 emissions and duplicate token cost deductions. Idempotency key must be unique per input — use `UUID v4` generated client-side.

### 5b.3 Locale and language

The `context.tenant_locale` field controls the language of text-format advisory output (AI-21, AI-31, AI-32). Supported locales: `en-US`, `en-GB`, `de-DE`, `fr-FR`, `ja-JP`, `zh-CN`, `vi-VN`. Structured advisories (confidence scores, category codes) are locale-independent. RAG citations always reference source records in their original language; `excerpt` field language matches source record locale.

### 5b.4 ETag and caching

Advisory records (EC-23) are immutable after creation — `GET /v1/ai/invocations/{invocation_id}` returns `ETag: sha256:{advisory_hash}`. Clients use `If-None-Match` for repeat retrieval. `304 Not Modified` returned on ETag match. Advisory records must not be cached in shared caches (CDN) — all caching is client-side only (`Cache-Control: private, max-age=3600`).

---

## 6. Cost envelope enforcement (SLO-18)

**Token budget system:**

```
GET  /v1/ai/tenant/{tenant_id}/cost-budget
     → Returns daily/monthly token budget, consumed, remaining per sub-processor

POST /v1/ai/tenant/{tenant_id}/cost-budget
     → Updates budget (AI Lead + Finance Controller dual-sign; AAL2)
```

**SLO-18:** No AI feature invocation may proceed if the estimated token cost would exceed the remaining daily budget for the tenant. `429 BUDGET_EXHAUSTED` returned with `Retry-After` (next midnight UTC).

**Budget tiers per L2 §9:**

| Tier | Daily token budget | Applicable features |
|---|---|---|
| Standard | 500,000 tokens | AI-01..AI-17, AI-25..AI-29 |
| Generative | 200,000 tokens (separate pool) | AI-18, AI-21, AI-31, AI-32 |
| Red-Team | 50,000 tokens (separate pool; AI Lead only) | AI-30, AI-18 red-team mode |

Cost per-invocation estimated from feature average; deducted on completion. Estimation error > 20% logged and used to update feature average.

---

## 7. SLO summary

| Endpoint | p50 | p95 | SLO reference |
|---|---|---|---|
| §2.1 Invoke (standard) | < 1.5s | < 8s | SLO-14 |
| §2.1 Invoke (generative streaming — first token) | < 2s | < 5s | SLO-14 |
| §2.2 Override capture | < 150ms | < 400ms | — |
| §2.3 Retrieve advisory | < 80ms | < 250ms | — |
| §2.4 List history | < 150ms | < 350ms | — |
| §2.5 KPI surface | < 200ms | < 500ms | — |
| §2.6 Model card | < 100ms | < 300ms | — |
| §2.7 Red-team report | < 200ms | < 500ms | — |
| §2.8 Feature toggle | < 100ms | < 300ms | — |
| §2.9 Kill switch | < 5s (applied) | < 10s | — |
| §2.10 Banned attempt log | < 200ms | < 400ms | — |
| §2.11 Sub-processor routing | < 100ms | < 300ms | SLO-22 |
| §2.12 PCCP envelope | < 150ms | < 400ms | — |
| §2b.1 SSE first token | < 2s | < 5s | SLO-14 streaming |
| §2b.2 Batch LRO (1,000 records) | — | < 30 min | SLO-18 batch |
| §2b.4 Governance ledger | < 200ms | < 500ms | — |
| §3.2 Gate composition check | < 100ms | < 300ms | — |

**SLO escalation rules:**

- **SLO-14 breach (inference latency):** If p95 invoke latency exceeds 8s for any feature in a 15-minute window → SEV-3 alert; AI Lead investigates sub-processor latency. If breach persists > 30 minutes → SEV-2; consider sub-processor failover.
- **SLO-18 breach (budget exhaustion before EOD):** If any tenant exhausts daily budget before 16:00 local time → AI Lead + Finance Controller notified; budget increase approval workflow triggered.
- **SLO-22 breach (sub-processor event latency):** If security event from sub-processor received > 4h after occurrence → SEV-2 per H1 §3 window (see §8b.3).

**SLO exemptions:** Advisory invocations during kill-switch lift verification testing are exempt from SLO-14 (test mode flagged via `context.test_mode: true`). Test-mode invocations are rate-limited to 5/min and do not emit EC-23. PCCP validation study invocations (J4) are exempt from SLO-18 token budget limits and are billed to a separate regulatory budget pool approved by Finance Controller + Regulatory Affairs.

---

## 8. Observability

### 8.1 Prometheus metrics

```
hesem_ai_invocations_total{feature_id, tenant, result}
hesem_ai_invocation_duration_seconds{feature_id, sub_processor}
hesem_ai_override_rate{feature_id, tenant}
hesem_ai_model_drift_score{feature_id}
hesem_ai_banned_attempt_total{feature_id, rule, tenant}
hesem_ai_kill_switch_active{tenant, scope}
hesem_ai_cost_tokens_consumed_total{feature_id, sub_processor, tenant}
hesem_ai_budget_exhausted_total{tenant, feature_class}
hesem_ai_rag_citation_count{feature_id}
hesem_ai_pccp_drift_score{feature_id}
```

### 8.2 Alerts

| Alert | Condition | Severity |
|---|---|---|
| AI_DRIFT_HIGH | `hesem_ai_model_drift_score` > 0.15 | SEV-2 — initiate retraining |
| AI_OVERRIDE_SPIKE | Override rate > 50% for any feature in 1h window | SEV-3 — notify AI Lead |
| AI_BANNED_TRIP | Any `hesem_ai_banned_attempt_total` increment | SEV-2 — notify Compliance |
| AI_KILL_SWITCH | Any kill switch activated | SEV-1 — notify AI Lead + CISO |
| AI_BUDGET_90PCT | Daily token budget 90% consumed before 16:00 local | Warning |
| AI_PCCP_DRIFT | `hesem_ai_pccp_drift_score` > 0.15 for J4 feature | SEV-2 — PCCP boundary review |
| SUB_PROCESSOR_EVENT_LATE | Security event from sub-processor received > 4h after occurrence | SEV-2 — H1 §3 window breach |

---

## 8b. Operational runbook

### 8b.1 Kill switch activation (SEV-1)

1. Kill switch is triggered by AI Lead + Compliance Lead dual-sign at §2.9.
2. Within 5 seconds: Redis kill-switch key set tenant-wide; all edge nodes drain in-flight requests; new invocations return `503 KILL_SWITCH`.
3. Active SSE streams: terminated with `event: kill_switch` message.
4. Compliance Lead notified immediately. If EU AI Act Art 14 trigger: Notified Body notification may be required within 15 days.
5. Root cause investigation initiated: review banned-attempt log (§2.10), model drift score (§8.1), sub-processor security events (§2.11).
6. Kill switch lift requires same dual-sign with documented root cause + remediation evidence (EC-24 emitted).
7. Post-lift: 24-hour monitoring window with alert thresholds tightened (drift alert at 0.10, override rate alert at 30%).

### 8b.2 Model drift response

1. Alert triggers when `hesem_ai_model_drift_score` > 0.15 (SEV-2).
2. AI Lead reviews KPI surface (§2.5): check override rate trend, confidence distribution shift, banned-attempt correlation.
3. For features within PCCP (J4 scope): check if drift is within PCCP-allowed retraining boundary (§2.12 `allowed_modifications[0]`).
4. If within PCCP boundary: initiate retraining pipeline; notify Regulatory Affairs. No submission required.
5. If drift exceeds PCCP boundary: pause feature via toggle (§2.8); initiate PCCP amendment via Regulatory Affairs + FDA notification.
6. For features outside PCCP scope: AI Lead can trigger retraining without regulatory notification.
7. Post-retraining: new model version deployed to staging; red-team run required before production promotion.
8. Evidence: EC-23 advisory accuracy comparison before/after; EC-24 for PCCP change sign-off.

### 8b.3 Sub-processor security event (H1 §3 window breach)

1. SIEM webhook receives sub-processor security event.
2. If event timestamp > 4 hours prior (SLO-22 H1 §3 window breach): SEV-2 auto-triggered; `AI_SUB_PROCESSOR_EVENT_LATE` alert fires.
3. Security Lead reviews event: classify as informational / elevated / critical.
4. If critical: initiate kill switch for affected sub-processor features (§2.9 scope = features routed to affected sub-processor).
5. Sub-processor contacted for incident report within 24 hours (per DPA SLA).
6. If sub-processor cannot confirm containment within 72 hours: kill switch remains active; alternative sub-processor routing considered.
7. Post-resolution: re-enable features; emit EC-22 incident closure with sub-processor response ref.

### 8b.4 PCCP boundary violation (J4 features)

1. Model version promoted that exceeds PCCP-allowed modification boundaries (architecture change without 510(k) supplement).
2. Detected by Regulatory Affairs review or automated PCCP version checker.
3. Immediate: revert to prior model version; toggle feature disabled (§2.8).
4. Regulatory Affairs initiates 510(k) supplement submission.
5. Feature remains disabled until FDA clearance received.
6. EC-24 emitted for: deployment of non-compliant version, revert, 510(k) submission, clearance receipt.
7. All affected advisory records (EC-23) from non-compliant version period flagged with `pccp_violation: true`; included in PCCP deviation report.

### 8b.5 RAG citation quality degradation

1. Alert: `rag_citation_count` drops below 1.0 average for RAG-enabled features (AI-21, AI-31).
2. Indicates retrieval pipeline degradation — relevant internal records not being found.
3. Investigate: check retrieval index freshness (vector embeddings may be stale if index rebuild missed).
4. Short-term: G10 compliance — advisories returned with `no_citation_reason: "RETRIEVAL_DEGRADED"`; human review mandatory before any action.
5. Long-term: trigger full index rebuild (ETL pipeline for RAG knowledge base).
6. EC-23 records during degraded period tagged `rag_degraded: true`; Compliance Lead notified.

---

## 8c. Security model

### 8c.1 Prompt injection defense (OWASP LLM01)

All user-supplied text fields in invoke request (`input_refs`, `context`) are sanitized at the API boundary:

1. Input tokenization: maximum 512 tokens of free-text context per field; truncate + flag `context_truncated: true`.
2. Role-play injection detection: regex + semantic filter blocks known injection patterns ("ignore previous instructions", "you are now").
3. System prompt isolation: user input never concatenated directly with system prompt; always passed as a separate message role.
4. Output validation: advisory content scanned for prompt-injection exfiltration patterns (unexpectedly long token sequences, base64 blobs); flagged and quarantined.
5. Detection emits: LLM01 injection attempt logged as EC-30 subtype `prompt_injection_attempt` for red-team evidence.

### 8c.2 Sensitive information disclosure defense (OWASP LLM06)

1. RAG retrieval layer enforces tenant RLS — cross-tenant record retrieval is architecturally impossible.
2. Advisory output scanned for patterns matching: IP addresses, personal health information (regex), API keys, credential patterns.
3. Matches quarantined; advisory returned with `pii_redacted: true`; redacted fragment replaced with `[REDACTED]`.
4. Redaction events emitted as EC-22 `pii_redaction` subtype.

### 8c.3 Model exfiltration defense (MITRE ATLAS AML.TA0006)

1. Invocation rate limits prevent model probing attacks (§2.1 rate limits).
2. Output field `model_version` is a human-readable version string, not model weights or architecture details.
3. Red-team mode invocations (AI-30) require AAL3 + AI Lead role — prevents adversarial probing via standard API.
4. Model card (§2.6) includes intended use but not training data raw records, architecture hyperparameters, or weight fingerprints.

---

## 8d. API versioning and lifecycle

**Current version:** `2025-11`. Expressed in `Accept: application/vnd.hesem.ai-advisory.v3+json`.

**Version history:**

| Version | Status | Notes |
|---|---|---|
| `2025-11` (v3) | Current | Full L2 32-feature support; PCCP envelope; SSE streaming; batch mode |
| `2025-04` (v2) | Deprecated — `Sunset: 2026-10-01` | Missing PCCP, batch mode, G8 stale citation |
| `2024-11` (v1) | Removed | Not supported |

**Deprecation notice period:** Minimum 12 months for AI Advisory API (shorter than Evidence API due to non-archival nature of advisory records). Deprecated version responses include `Sunset` header (RFC 8594) + `X-Deprecation-Notice` pointing to migration guide.

**Breaking change policy:** Feature IDs (AI-01..AI-32) are stable identifiers — never reassigned. Feature retirement requires 6-month advance notice via `Sunset` on `GET /v1/ai/features/{feature_id}/model-card`. Retired feature invocations return `410 Gone` with migration guidance. Breaking changes to advisory content schema (adding required fields to structured output) require version increment and 6-month parallel support of old schema — clients relying on structured advisory output for downstream automation must migrate within the parallel-support window. Text-format advisory content (AI-21, AI-31) is explicitly non-schema-versioned — clients must not parse free text; always use the structured `content` block where available.

---

## 9. Acceptance criteria

```
[x] Per-endpoint full contract for all 12 endpoints (§2.1..§2.12)
[x] All 32 L2 features cross-referenced with feature ID, class, domain, role (§3)
[x] L1 §4 triple defense at API surface: D1/D2/D3 fully specified (§1.3)
[x] RAG citation discipline G1-G10 at API surface (§4)
[x] PCCP envelope governance for MD AI features (§2.12)
[x] Sub-processor routing visibility with H1 §3 security event windows (§2.11)
[x] Per-pack overlay J1..J5 with feature-specific content (§5)
[x] Cost envelope per SLO-18 with budget tiers (§6)
[x] Cross-references resolve: L2 catalog, E2 (banned decisions), E7 (BD e-sig), H4 EC-23/24, M5 SLOs
[x] No marketing language
[x] Decision phrase emitted below
```

---

`S3-04_E9_AI_ADVISORY_DEEP_UPGRADE_COMPLETE`
