# C06 — Command Bus Operating Model

## 1. Purpose

C06 defines the planning-only event catalog, command bus operating model and notification routing posture for HESEM. It converts the C01 API grammar, C02/C03 endpoint catalogs, C04 problem/authz/idempotency/concurrency policy and C05 authority ledger into a governed event/command operating model.

This package does **not** create executable code, DDL, OpenAPI, AsyncAPI, event schema, topic configuration, controller, service, consumer or notification rule. It is a planning contract.

## 2. Source posture

- Project posture: development/prototype/pre-production-readiness planning.
- Root/event baseline: V10 event catalog plus C05 authority ledger.
- Command/API baseline: C02 Wave 1/dependency commands and C03 remaining-root command backlog.
- Policy baseline: C04 problem details, authorization, idempotency and concurrency policy.
- GitHub repo `mom`: intentionally skipped per explicit user instruction; no current implementation state is asserted.

## 3. Non-negotiable command bus rule

A HESEM authority mutation may only happen through a governed command path. A workspace, projection, integration adapter, notification action, AI advisory output or telemetry event cannot mutate an authoritative root directly.

```text
receive command
-> authenticate actor/system
-> authorize tenant/site/object/property/action
-> check idempotency key
-> check optimistic concurrency / record version / guard snapshot
-> evaluate workflow guard and evidence prerequisites
-> challenge/sign only when signature meaning and signer authority are defined
-> apply exactly one authority mutation at the authoritative root
-> write audit/evidence/signature links
-> emit domain/audit/integration/notification/telemetry events
-> invalidate projections and route notifications
```

## 4. Command envelope as planning concept only

Every command must carry these conceptual fields. This is prose, not schema.

| Field family | Required planning meaning | Stop rule |
|---|---|---|
| Identity | command id, root code, canonical target code, record id or create intent | block if target authority root is ambiguous |
| Actor/context | actor or service principal, tenant, site, route/surface, client/app context | block if workspace acts as hidden authority |
| Idempotency | idempotency key, request fingerprint, replay window | block if duplicate command can repeat mutation |
| Concurrency | record version, workflow guard snapshot, effectivity/revision where applicable | block if stale state can overwrite authority |
| Intent | command name, intended meaning, reason, source action, target transition | block if reason/signature meaning is missing where required |
| Evidence | evidence refs, guard evidence, relationship/effectivity proof | block regulated/release-impacting completion event if required evidence is missing |
| Signature | signature required flag, signer authority, signature meaning, challenge result | block e-sign if meaning/manifestation/linking is missing |
| Observability | correlation id, causation id, trace context, route/adapter tags | block event publication if correlation/causation is missing |
| Outcome | completed, guard_failed, rejected, superseded/voided/corrected when applicable | failed command must not emit completed event |

## 5. Event taxonomy

| Event type | Meaning | Replay posture | Examples |
|---|---|---|---|
| domain_event | Business/root occurrence after authority command/system signal | replay allowed only for projections/timeline/analytics; never as fresh command | `nqcase.disposition_approved.completed`, `wo.release.completed` |
| audit_event | Attempt, guard, evidence, signature or policy event that must preserve accountability | replay into audit/timeline only | `capa.close.guard_failed`, `capa.signature_completed` |
| notification_event | Task, escalation, user-facing event or problem route | replay only into notification projection with dedup; avoid push storms | `capa.notification_escalated`, `nqcase.problem_raised` |
| integration_event | Inbound/outbound external event or publishable state change | replay only with C07 idempotent receiver/source-of-truth policy | `lot.integration_received`, `so.integration_published` |
| telemetry_event | Operational event used for SRE/API/consumer monitoring | no business state replay | `wo.dispatch.rejected`, `wo.projection_invalidated` |

## 6. Producer and consumer ownership

Every event row must have:

- producer owner: Root Owner, Workflow Owner, Evidence/e-Sign Owner, Integration Owner or SRE Owner;
- consumer owner: frontend timeline, notification route, projection/read model, digital-thread graph, integration adapter or telemetry dashboard;
- audit/evidence owner where event affects regulated, release, disposition, signature or external-source decisions.

An event with no consumer/internal reason is an orphan and is blocked.

## 7. Command outcome model

For every C02/C03 command, C06 creates three planning outcomes:

1. `<root>.<command>.completed` — emitted only after authoritative mutation, audit/evidence/signature and projection invalidation are complete.
2. `<root>.<command>.guard_failed` — emitted when workflow/evidence/state/signature guard blocks mutation; never creates authority state.
3. `<root>.<command>.rejected` — emitted when receive/authz/idempotency/concurrency/problem-detail gate rejects the command; telemetry/audit only.

## 8. Ordering policy

- Per record/root event stream ordering is required for lifecycle, evidence, signature and release-impacting events.
- Cross-root ordering is correlation/saga ordering only; no global total order is assumed.
- Integration ordering depends on source-system sequence where available; otherwise C07 must define reconciliation and conflict review.
- Notification ordering follows the latest visible record state, not the order in which push messages arrive.

## 9. Replay policy

Replay is allowed for read models, timelines, digital-thread projections, notification projections and analytics only when replay cannot create a new authority mutation. Command replay is prohibited; compensation/revision/void/correction requires a new explicit command with audit, reason and guard evidence.

## 10. Notification routing rule

Notifications are projections of events. They cannot create authority, bypass guard, bypass object/property authorization or disclose redacted data. C06 defines routing families; D/C10 must bind exact screen/action-inbox/modal/copy.

## 11. Integration publish rule

External publish/apply is conditional until C07. Integration events require:

- source-of-truth decision;
- consumer/channel owner;
- idempotent receiver/dedup policy;
- privacy/redaction decision;
- payload fingerprint/claim-check policy;
- replay window and conflict handling.

## 12. Stop rules

- Do not emit a completed event for a failed/rejected command.
- Do not publish a regulated decision event without required evidence/signature meaning/signer authority/audit link.
- Do not replay an event as a command.
- Do not let a workspace/projection/notification/integration adapter become hidden authority.
- Do not create external event publication without C07 integration authority and conflict policy.
- Do not use telemetry/log events as business truth.
- Do not implement duplicate alias-root event stores until alias canonicalization is approved.

## 13. Outputs generated

- `C06_EVENT_CATALOG.csv` — main event catalog with domain/audit/notification/integration/telemetry event classes.
- `C06_EVENT_TO_WORKFLOW_API_BINDING.csv` — command/API/endpoint to event outcome binding.
- `C06_NOTIFICATION_ROUTING_MATRIX.csv` — recipient, escalation, suppression and routing matrix.
- `C06_EVENT_RETENTION_AND_REPLAY_POLICY.md` — event retention/replay/order/dedup policy.
- `C06_GAP_DECISION_AND_REPAIR_PLAN.csv` — safe-forward gap decisions.
- `C06_SELF_AUDIT.md` — coverage score and repair actions.
