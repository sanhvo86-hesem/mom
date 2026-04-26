# CODEX_MUTATION_GRADUATION_V8 — L4 → L5 Per-Mutation Stage 3 Graduation

```text
Per V8 file 01 §2 MAT-L4-to-L5 + V8 file 09 command bus + V8 file 18 approval workflow.

Inputs:
  ROOT_CODE
  TRANSITION_ID
  REGULATED_CLASSIFICATION (gxp / iatf / as9100 / itar / non_regulated)
  USER_APPROVAL_PHRASE = "Proceed with <ROOT> Stage 3 controlled mutation per ADR-XXXX"

Pre-flight:
  - L4 graduation already ratified for ROOT_CODE
  - state machine for ROOT defined in data/workflow_state_machines_v8.json
  - per-mutation ADR drafted and circulated

Required artifacts (per file 01 §MAT-L5):
  A1. command envelope for TRANSITION_ID (per schemas/command_envelope_v8.json)
  A2. WorkflowGuardMiddleware integration; guards declared in YAML
  A3. saga compensation definition at data/sagas/<root>_<transition>.yaml
  A4. per-mutation ADR signed at docs/adr/ADR-XXXX-<root>-<transition>.md
  A5. evidence_record_v8 wiring per file 16 §1
  A6. e-sign obligation table updated per validation_scope (factor_count, signers)
  A7. tests/v8/<root>/<transition>_test_pack covering T-L5-001..011

Tests (T-L5-001..011 per file 01):
  T1. Happy path
  T2. Guard failure → 422 + RFC 9457 + failed_guard_id
  T3. Missing e-sign → 401 + factor list (regulated only)
  T4. Stale validation evidence → 451 (regulated only)
  T5. Idempotent replay
  T6. Replay-mismatch → 409
  T7. Version conflict → 412
  T8. audit_event chain extension verified
  T9. workflow_event recorded with from/to/guards
  T10. OTG event published within 5s
  T11. Saga compensation: forced mid-saga failure → state restored

Performance budget:
  T-PERF-1: workflow_commit p95 < 500ms (file 24 SLO-V8-003)
  T-PERF-2: idempotency replay accuracy 1.00
  T-PERF-3: saga compensation success 1.00 (chaos)

Approval per file 18:
  decision_type = stage3_mutation_graduation
  authority_chain: [Domain Lead, Platform Lead, Compliance Lead]
  sla_hours: 168
  signers ≥ 3
  user_approval_phrase: "Proceed with <ROOT>.<TRANSITION_ID> Stage 3 controlled mutation per ADR-XXXX"

Stop rules:
  - SEV-0 if RULE-2 banned-decision attempt detected (file 19)
  - SEV-1 if audit chain break or tenant boundary leak
  - SEV-2 if saga compensation failure under chaos

Decision phrase:
  <ROOT>_<TRANSITION>_STAGE3_GRADUATED
  <ROOT>_<TRANSITION>_STAGE3_BLOCKED_<reason>

End.
```
