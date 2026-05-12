# C04 — Idempotency Policy

Generated: 2026-04-27T01:17:34.748888+00:00

## Scope

This policy applies to HESEM API planning surfaces from C01/C02/C03. It is planning-only and does not create controllers, schemas, OpenAPI YAML/JSON, DDL, SQL, code, or executable tests.

Inputs used:

- C01 API contract operating model and endpoint taxonomy.
- C02 Wave 1 + dependency endpoint catalog.
- C03 remaining root endpoint catalog.
- V10 problem details, evidence, e-sign, workflow, authority and root contract planning package.
- Project memory baseline for Wave 1 roots, dependency roots, route authority, no uncontrolled mutation, no API without contract, no workflow without guard evidence, no e-sign without meaning/audit, no AI without human authority boundary.
- GitHub repo `sanhvo86-hesem/mom` intentionally skipped per explicit user instruction. No current repo implementation state is asserted.

C02/C03 coverage observed in this run:

```text
endpoint_rows_total: 3749
root_codes_total: 145
mutation_or_planned_mutation_rows: 1391
read_query_internal_rows: 2358
unique_endpoint_categories: 127
```

## Idempotency classes

| Class | Applies to | Policy | Problem family |
|---|---|---|---|
| Safe read/query | collection search, facets, record get, workflow read, audit trail, event stream plan, metrics, AI advisory read | No command idempotency key required. Query request hash/cursor/snapshot may be used for telemetry, caching, and correlation only. Reads must not mutate authority. | `query.invalid`, `authorization.property_denied`, `integration.unavailable` |
| Controlled root command | `COMMAND_*` rows, workflow_command rows, domain command rows | Requires command identity scoped to tenant, site, root, record where applicable, command action, actor, payload intent, workflow state/version, and correlation. Exact replay returns recorded command status/outcome. Same key with materially different payload returns conflict. | `idempotency.missing_key`, `idempotency.key_conflict`, `idempotency.replay_detected` |
| Evidence command | evidence link/create association once execution is approved | Key binds evidence reference/hash, evidence type, root, record, actor, retention policy and record version. Evidence authority is not cloned by root service. | `evidence.missing_required`, `attachment.policy_blocked`, `idempotency.key_conflict` |
| Signature command | signature request/execution when approved | Key binds signer identity, signature meaning, root, record, workflow state/version, evidence set, reason and challenge context. A failed challenge never replays as success. | `signature.required`, `signature.challenge_failed`, `signature.meaning_missing` |
| External inbound integration | webhook/import/proposal/reconciliation | Replay identity is source system + source event id + source object id + payload hash + mapping version + tenant/site/root mapping. Untrusted payloads are quarantined/proposals, not authority. | `integration.payload_not_trusted`, `integration.external_authority_conflict`, `idempotency.key_conflict` |
| Outbound integration/event delivery | outbox, notification, partner handoff, data platform handoff | Domain command idempotency and event/outbox delivery idempotency are separate. Retrying event delivery must not re-run domain mutation. | `event.delivery_deferred`, `integration.unavailable` |
| Offline/edge replay | shopfloor capture, device sequence, OT/edge event, offline operator action | Replay identity includes device/source id, operator, site, equipment/workcenter, operation/material context, monotonic sequence where available, source timestamp, payload hash and root command intent. Conflicts go to reconciliation; no auto-apply for regulated, safety, material or release-affecting mutations until C08 approves policy. | `offline.replay_conflict`, `offline.stale_signal`, `ot.safety_interlock` |
| AI advisory to human action | recommendations, human accept/reject | AI recommendation id is not a command id. Human acceptance/rejection requires a new controlled command id, current record version, human authority and rationale. | `ai.authority_boundary`, `concurrency.version_mismatch` |

## Material payload difference rule

A replay is materially different if any of the following changes after the original key was recorded:

- root code, record id, command action, target workflow state, tenant, site or actor;
- payload fields that affect business state, evidence, signature, reason, quantity, status, disposition, release, effectivity or integration mapping;
- record/workflow/evidence/effectivity version where the command policy requires exact binding;
- signer identity, signature meaning, challenge context or SoD/qualification context;
- external source id, source event id, source object id, mapping version or payload hash;
- offline device sequence, equipment/material/operation context or source timestamp.

When a material difference exists, C04 requires `idempotency.key_conflict`; the frontend must show duplicate/conflict state and must not silently submit a second mutation.

## Decision order for unsafe mutation

1. Authenticate actor and bind tenant/site context.
2. Evaluate function-level authorization for the endpoint category/action.
3. Resolve canonical root/record authority and object-level authorization.
4. Evaluate property-level write authorization and payload validation.
5. Validate command identity/idempotency key or replay identity.
6. Evaluate workflow state/guard binding, SoD, qualification, evidence, reason and signature prerequisites.
7. Evaluate concurrency: current record version, workflow state token, evidence/effectivity/source version and lock state.
8. Apply mutation only if every gate passes.
9. Record audit/evidence/event planning effects according to C05/C06 once available.
10. Return recorded command status/outcome; duplicate exact replays return status, not duplicated side effects.

This order prevents idempotency from becoming a bypass around authorization, evidence, signature, state or safety checks.

## External integration and offline replay rules

External messages and offline replay items are not authority by arrival alone. They become authority only after source trust, mapping, replay identity, root owner policy, state/concurrency and authorization/evidence gates pass. If any gate fails, C04 requires quarantine, proposal, conflict or reconciliation state rather than direct mutation.

## Stop rules

- Block any unsafe mutation endpoint if it lacks command identity/replay identity policy.
- Block any retry path that can duplicate record creation, evidence link, e-sign, release, material movement, shopfloor result, notification handoff or external apply.
- Block any offline auto-apply for safety, material, equipment, released, regulated or signature-affecting records until C08 approves offline policy.
- Block any external integration apply that bypasses root authority owner and C05 data authority ledger.
- Block AI from executing authority mutation; human accept/reject must be a separate controlled command.

## Gap decisions

C04 does not block planning catalog progress because B/D/C05/C06/C08 are pending. It does block implementation/merge of mutation behavior until those gates are bound. The package records all gaps in `C04_GAP_DECISION_AND_REPAIR_PLAN.csv`.
