# MDA V3 Root Evidence Pack Template

Use one copy per root when a later prompt claims a maturity increase.

## Header

```text
root_code:
canonical_name:
owner_prompt:
target_maturity:
repo_commit:
runtime_environment:
decision_token:
```

## Required Evidence

| Evidence Class | Required Path Or Output | Status |
|---|---|---|
| Source truth | Root ledger row and contract package path | pending |
| Table evidence | Migration path and table/constraint proof | pending |
| Service evidence | Service class and authority probe output | pending |
| Command evidence | Command handler path and DTO/envelope | pending |
| API evidence | Route and OpenAPI/problem-details contract | pending |
| Workflow/status evidence | Generated status source and parity check | pending |
| Audit/evidence evidence | Audit record and evidence package proof | pending |
| Outbox evidence | Outbox write and replay behavior | pending |
| E-sign applicability | Signature meaning, record hash, SoD, and re-auth proof or not_applicable rationale | pending |
| Test evidence | Focused unit/integration/smoke output | pending |
| Simulation evidence | Scenario runner output with pass/fail IDs | pending |
| Reconciliation evidence | Drift or ledger reconciliation output | pending |
| Rollback/retry evidence | Idempotency, retry, rollback, or restore proof | pending |
| Telemetry evidence | Metric/log/trace/alert path and owner | pending |
| Red-team evidence | Adversarial review and repair closure | pending |

## Maturity Decision

```text
previous_maturity:
requested_maturity:
approved_maturity:
blocked_by:
controlled_gaps:
next_recheck:
```

## No-Guess Statement

If any required evidence is absent, mark `MISSING_EVIDENCE` and keep or lower the maturity score. Do not infer runtime authority from schemas, registries, generated docs, dashboards, projections, or narrative simulations.
