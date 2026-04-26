# 09 — V8 Command Bus Normative

```text
purpose:        Bind V7 §10 Workflow Mutation Command Bus prose to JSON Schema + middleware
predecessor:    V7 §10 (V7_WORKFLOW_MUTATION_COMMAND_BUS.md)
v8_advance:     Schema + middleware + idempotency + ETag + saga + linter for forbidden patterns
work_package:   WP-V8-CMD (5 work packages)
owner:          Backend Lead + Platform Lead
estimate:       6 engineering-weeks
```

---

## 1. Command envelope JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hesem.io/schemas/command_envelope_v8.json",
  "title": "CommandEnvelopeV8",
  "type": "object",
  "required": [
    "command_id","idempotency_key","tenant_id","root_code","resource_family",
    "record_id","command_type","actor_id","actor_kind","actor_role",
    "intended_meaning","correlation_id","client_context","sent_at"
  ],
  "properties": {
    "command_id":          {"type":"string","format":"uuid","description":"UUIDv7 for ordering"},
    "idempotency_key":     {"type":"string","minLength":32,"maxLength":128,
                            "description":"derived: tenant_id:actor_id:root_code:record_id:command_type:sha256(payload)"},
    "tenant_id":           {"type":"string","format":"uuid"},
    "root_code":           {"type":"string","pattern":"^[A-Z][A-Z0-9_-]{1,15}$"},
    "resource_family":     {"type":"string"},
    "record_id":           {"type":"string","format":"uuid","description":"target authoritative_root id; or 'NEW' for create commands"},
    "command_type":        {"type":"string","pattern":"^[A-Z][A-Z0-9_]+_[A-Z][A-Z0-9_]+$",
                            "description":"e.g. NQCASE_OPEN, BREL_APPROVE_RELEASE"},
    "actor_id":            {"type":"string","format":"uuid"},
    "actor_kind":          {"enum":["user","service_principal","ai_advisory","system"]},
    "actor_role":          {"type":"string"},
    "intended_meaning":    {"type":"string","minLength":3,"maxLength":200,
                            "description":"semantic signature: 'approval','disposition_concession','release', etc."},
    "precondition_etag":   {"type":"string","pattern":"^W/\"[a-f0-9]{64}\"$",
                            "description":"required for non-CREATE commands"},
    "payload":             {"type":"object","description":"command-type-specific payload validated against per-type schema"},
    "evidence_refs":       {"type":"array","items":{"type":"string","format":"uuid"}},
    "signature_required":  {"type":"boolean","default":false},
    "signature_envelope":  {"$ref":"#/$defs/SignatureEnvelope"},
    "client_context":      {"type":"object",
                            "required":["surface_class","route","ip","user_agent"],
                            "properties":{
                              "surface_class":{"enum":["WS","SH","DL","ML","AC","AR","ERD","NRD","SFW"]},
                              "route":{"type":"string"},
                              "ip":{"type":"string"},
                              "user_agent":{"type":"string"}}},
    "correlation_id":      {"type":"string"},
    "trace_parent":        {"type":"string","description":"W3C traceparent"},
    "sent_at":             {"type":"string","format":"date-time"}
  },
  "$defs": {
    "SignatureEnvelope": {
      "type":"object",
      "required":["signers"],
      "properties":{
        "signers":{
          "type":"array","minItems":1,"maxItems":3,
          "items":{
            "type":"object",
            "required":["principal_id","printed_name_snapshot","signature_meaning","factor_records","signed_at"],
            "properties":{
              "principal_id":{"type":"string","format":"uuid"},
              "printed_name_snapshot":{"type":"string"},
              "signature_meaning":{"type":"string"},
              "factor_records":{"type":"array","items":{"type":"object",
                "required":["factor","verified_at"],
                "properties":{"factor":{"enum":["password","totp","u2f","hsm_smart_card","biometric"]},
                              "verified_at":{"type":"string","format":"date-time"}}}},
              "signed_at":{"type":"string","format":"date-time"}}}},
        "record_canonical_state_hash":{"type":"string","pattern":"^[a-f0-9]{64}$"},
        "session_token_id":{"type":"string"}
      }
    }
  }
}
```

---

## 2. Idempotency-key construction algorithm

```text
function build_idempotency_key(envelope) {
  let hash_input = canonical_json(envelope.payload);  // RFC 8785 JCS
  let payload_sha = sha256(hash_input);
  return `${envelope.tenant_id}:${envelope.actor_id}:${envelope.root_code}:${envelope.record_id}:${envelope.command_type}:${payload_sha}`;
}
```

Replay window: 24 hours.
Collision detection: server checks if existing replay row has same hash → return stored response; different hash → 409 idempotency.replay_mismatch.

---

## 3. Lifecycle stages (V7 carry-forward + V8 middleware bindings)

| # | Stage | V8 middleware module | Failure → problem-detail |
|---|---|---|---|
| 1 | Receive | CommandReceiveMiddleware (schema-validate, authn) | server.internal_error / auth.unauthorized |
| 2 | Authorize | PolicyEngineMiddleware (calls /decide) | auth.forbidden / policy.not_published |
| 3 | Guard | WorkflowGuardMiddleware (state machine + evidence + eligibility) | workflow.guard_failure |
| 4 | Sign (if obligated) | EsignChallengeMiddleware (factors + meaning + snapshot) | esign.factor_required / esign.session_expired |
| 5 | Apply | TransactionalApplyMiddleware (single DB tx) | concurrency.version_conflict / workflow.invariant_violation |
| 6 | Emit | EventEmitMiddleware (audit, workflow, OTG, notify, outbox) | (async; emits SEV-2 if outbox lag > 60s) |
| 7 | Rollback (if needed) | SagaCompensationOrchestrator | (only invoked on saga failure) |

Each middleware emits OTel spans `cmd.<stage>` with attributes including command_id, command_type, decision.

---

## 4. Six forbidden patterns (V7 §10 line 53-58 + V8 enforcement)

| # | Pattern | V8 enforcement |
|---|---|---|
| 1 | Direct WS mutation | LINT-V8-002 (file 13) + MutationGuardMiddleware (file 02 INV-1) + e2e test v8-ws-no-mutation.spec.ts |
| 2 | API without workflow guard | INV-3 detection + WorkflowGuardMiddleware required for L≥5 |
| 3 | E-sign without meaning/snapshot | INV-5 schema check on SignatureEnvelope (record_canonical_state_hash mandatory when signature_meaning='approval') |
| 4 | Endpoint without RFC 9457 | INV-3 + ProblemDetailMiddleware default |
| 5 | State change without audit/event/evidence | INV-4 (axiom A4) + EventEmitMiddleware mandatory |
| 6 | AI tool calling mutation without approval | INV-6 (axiom A7) + actor_kind != 'ai_advisory' for any L≥5 command |

---

## 5. Compensation patterns (saga)

```yaml
saga_definition_format: data/sagas/<root>_<command_type>.yaml
saga_definition_example: |
  saga_id: nqcase_dispose_compensation
  steps:
    - id: 1
      forward: NQCASE_DISPOSE_REJECT
      compensate: NQCASE_REOPEN
    - id: 2
      forward: LOT_QUARANTINE_HOLD
      compensate: LOT_QUARANTINE_RELEASE
    - id: 3
      forward: CAPA_AUTO_CREATE
      compensate: CAPA_VOID
  
saga_orchestrator: SagaOrchestratorService (V5 file 05 W5.2 carry-forward)
saga_state_table: saga_log_v8 with (saga_id, step, status, started_at, completed_at)
chaos_test: tests/v8/chaos/test_saga_compensation.py — random 5% failure midflight
```

---

## 6. Work packages

```yaml
WP-V8-CMD-1: Command envelope schema + ReceiveMiddleware                  (1 wk)
WP-V8-CMD-2: Idempotency replay table + middleware                         (1 wk)
WP-V8-CMD-3: WorkflowGuardMiddleware + state-machine engine                (1.5 wk)
WP-V8-CMD-4: EsignChallengeMiddleware + factor records                     (1 wk)
WP-V8-CMD-5: SagaOrchestratorService + chaos test harness                  (1.5 wk)
total: 6 wk
```

---

## 7. Decision phrase

```text
V8_COMMAND_BUS_NORMATIVE_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-CMD-1..5
NEXT_FILE: 10_V8_WORKFLOW_STATE_MACHINE_LIBRARY.md
```
