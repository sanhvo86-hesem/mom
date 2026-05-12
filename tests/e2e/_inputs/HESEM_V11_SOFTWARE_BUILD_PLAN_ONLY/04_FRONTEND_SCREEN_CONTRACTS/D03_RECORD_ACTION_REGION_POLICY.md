# D03 Record Action Region Policy

## 0. Decision phrase

```text
D03_ACTION_REGION_POLICY_READY_WITH_DISABLED_COMMAND_DEFAULT
```

## 1. Command rail principle

The action rail is an intent/readiness surface, not a permission to mutate. Every action must be one of: hidden by permission, visible-disabled due to missing workflow, visible-disabled due to missing API, visible-disabled due to missing evidence, visible-disabled due to missing signature, visible-disabled due to stale/offline, visible-disabled alias route, or enabled only after all gates pass.

## 2. Required binding per action

Every row in `D03_RECORD_ACTION_BINDING_REQUESTS.csv` binds root, route, workflow archetype, transition, state policy, required actor, guard evidence, API command family request, permission, evidence/signature/audit policy, rollback/void policy, problem families and stop-rule.

## 3. High-risk commands

| Command family | Default D03 status | Additional gate |
|---|---|---|
| approve/release/disposition/review/void | Disabled/planned | Evidence, signature meaning, SoD, audit, reason, version lock and rollback/void policy. |
| record_result/start/complete/hold/resume | Disabled/planned | Operation/equipment/operator qualification, OT/manual fallback if relevant, evidence capture policy. |
| enable/disable/policy/config/change_control | Disabled/planned | Admin/config authority, change control, rollback rehearsal and audit trail. |
| AI-suggested action | Advisory only | Human AR authority required; AI cannot execute controlled decision. |

## 4. Problem details families

D03 uses these problem families in prose/matrix form: authority.missing, workflow.transition_not_allowed, validation.field_invalid, evidence.required, signature.required, access.denied, idempotency.conflict, concurrency.version_conflict, integration.unavailable, ot.safety_interlock, regulated.validation_block, ai.authority_boundary.

## 5. Stop rules

- Stop if command is enabled without workflow guard evidence and command API contract.
- Stop if signature command has no signature meaning, record link, signer challenge and audit manifestation.
- Stop if evidence mutation has no metadata, retention, integrity and source boundary.
- Stop if alias/duplicate routes own separate commands.
- Stop if non-AR surfaces execute commands without reanchoring into AR.
- Stop if offline/stale state permits workflow/evidence/e-sign mutation.
