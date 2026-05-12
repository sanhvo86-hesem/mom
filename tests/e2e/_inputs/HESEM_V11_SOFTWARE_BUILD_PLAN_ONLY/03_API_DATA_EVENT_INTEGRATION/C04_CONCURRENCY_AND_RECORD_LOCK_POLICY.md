# C04 — Concurrency and Record Lock Policy

Generated: 2026-04-27T01:17:34.748888+00:00

## Scope and posture

This policy is planning-only. It defines concurrency, record-lock, released-record, integration conflict, and offline replay behavior for HESEM API planning catalogs C02/C03. It creates no schema, DDL, SQL, controller, service, OpenAPI YAML/JSON, or executable test artifact.

## Concurrency model

HESEM uses a layered concurrency model in planning terms:

| Layer | Purpose | Required planning marker | Problem family |
|---|---|---|---|
| Optimistic record version | Prevent lost updates and stale UI commands | record version or equivalent authority snapshot marker | `concurrency.version_mismatch` |
| Workflow state token | Prevent transitions from stale state/action rail | current state, workflow definition/version, allowed action set | `workflow.state_conflict`, `workflow.forbidden_transition` |
| Evidence/e-sign version | Prevent approval/signature on changed evidence set | evidence reference/hash/version, signature meaning, signer and challenge context | `evidence.missing_required`, `signature.required`, `signature.challenge_failed` |
| Effectivity/revision version | Prevent overlapping BOM/route/control-plan/master-data applicability | effectivity scope, revision, supersession target, date/lot/serial/site/customer/equipment range | `concurrency.effectivity_conflict` |
| Business lock | Prevent conflicting work during approval/release/integration/reconciliation/safety hold | lock class, lock owner, lock reason, lock visibility, expiry/escalation plan | `concurrency.record_locked` |
| OT/edge freshness | Prevent use of stale equipment/material/operation signals | signal source, freshness window, source timestamp/sequence, gateway status | `offline.stale_signal`, `ot.safety_interlock` |
| Integration source version | Prevent external overwrite of newer internal authority | source system id, source event id, source object version/timestamp, mapping version | `integration.external_authority_conflict` |

## Lock classes

| Lock class | Applies to | Owner | Frontend behavior | Backend decision | Stop rule |
|---|---|---|---|---|---|
| Edit lock | active edit/revision/correction session | Root Owner | show lock banner; disable conflicting edit/submit | reject or queue according to policy | block if lock owner/expiry/escalation undefined |
| Workflow approval lock | review/approval/signature in progress | Workflow Owner + Compliance Owner | disable creator/parallel approver actions | reject conflicting workflow command | block if approval can be overwritten silently |
| Release/immutability lock | released/closed/approved records | Release Owner + Compliance Owner | fields read-only; only revise/void/correct if authorized | reject direct update | block in-place mutation of released record |
| Evidence/signature lock | evidence set under review/signature challenge | Evidence/E-sign Owner | modal/panel shows current evidence/signature context | reject changed evidence/signature mismatch | block signature if evidence can change unnoticed |
| Integration reconciliation lock | external conflict/quarantine/replay apply pending | Integration Owner + Data Authority Owner | show reconciliation drawer; disable apply until decision | quarantine or route to owner | block direct external authority overwrite |
| Safety/OT interlock lock | equipment/material/operator/safety hold | MES/OT Owner + Safety Owner | critical safety banner; disable operation command | deny command; no automatic override | block if safety interlock is not evaluated |
| Validation/change-control lock | regulated feature/change awaiting validation package | Validation Owner | validation blocker banner | hold mutation/activation | block regulated mutation without validation package |
| Audit/legal hold | records under audit, retention, investigation or recall hold | Compliance Owner | show hold status when visible; disable destructive actions | reject delete/void unless governed correction path | block silent deletion or audit trail mutation |

## Released and regulated record policy

Released, closed, approved, signed or validation-significant records are immutable for direct update. A later correction must use a governed command such as revise, void, supersede, correction, recall, release-hold, or equivalent root-specific command. The correction command must carry reason, evidence, authorization, SoD/qualification where required, idempotency identity, current version, and audit/evidence/event effects. C04 problem family: `regulated.released_record_immutable`.

## Frontend concurrency behavior

Every stale or locked mutation must be visible to the user before resubmission:

- record header shows current/stale/locked state;
- action rail disables stale commands and states why;
- workflow guard checklist shows missing guard/evidence/signature/state requirements;
- conflict modal offers refresh/compare/reconciliation, not blind retry;
- offline queue shows pending/quarantined/conflict/rejected states;
- integration drawer shows source/current comparison and authority owner decision path;
- signature modal shows exact record version, evidence set, meaning and signer authority.

## Backend planning decision order

1. Authenticate and authorize actor/function/object/property.
2. Confirm canonical root and authority record.
3. Validate idempotency key/replay identity.
4. Evaluate current state, workflow definition, command guard, SoD, qualification, evidence, signature and reason.
5. Evaluate version/effectivity/lock/source/OT freshness preconditions.
6. If any precondition fails, return the appropriate C04 problem family and do not mutate authority.
7. If all pass, apply the controlled mutation and record audit/evidence/event effects per C05/C06.

## Integration and offline reconciliation

External and offline changes can be accepted only as proposals until authority, state, source trust, replay identity and concurrency checks pass. When conflict exists, HESEM must preserve both the external/offline payload snapshot and current authority state for human reconciliation. No hidden last-write-wins behavior is allowed.

## Stop rules

- Block mutation if no version/state/effectivity/freshness marker is captured.
- Block released-record direct update.
- Block e-sign/approval if evidence can change without invalidating the signature context.
- Block offline auto-apply for safety/material/equipment/release/regulatory commands until C08.
- Block external direct overwrite of authoritative root records.
- Block lock implementation if frontend cannot display lock class, safe reason and allowed next action.

## Current C04 decision

C04 sets the policy but does not assert current repo implementation. B workflow details, D screen details, C05 authority ledger, C06 event catalog and C08 offline policy remain downstream gates.
