# D01 Route Grammar and Authority Rules

## 0. Source and repo boundary

Repo state not checked by user instruction. I cannot verify the current repo state from connector in this turn.

D01 uses the uploaded/local planning sources only: project memory, V11 prompt pack D01, P0 baseline, V10 planning OS, and older V9/V8/V7/V6/V5 packages as secondary predecessor references through the P0 source stack. The P0 package previously contained a public GitHub web observation, but D01 does not use public GitHub for current implementation state.

## 1. Frozen canonical grammar

```text
/ops
/ops/{domain}
/ops/{domain}/{module}
/ops/{domain}/{module}/{workspace_family}
/ops/records/{resource_family}/{record_id}?tab=overview
```

D01 adds planning route families for module-level dashboards, inboxes and admin surfaces under the module route. These are not new authority roots:

```text
/ops/{domain}/{module}/dashboards/{dashboard_slug}
/ops/{domain}/{module}/inbox
/ops/{domain}/{module}/admin
```

These extension families remain subject to the same reanchor law: no hidden authority, no business mutation outside AR, no config mutation outside governed config/change-control authority.

## 2. Route class authority ledger

| Route class | Meaning | Authority class | Mutation allowed? | Reanchor rule |
|---|---|---|---|---|
| SH | Shell home | navigation shell projection | No | Open domain/module/record; commands must reanchor. |
| DL | Domain landing | domain projection | No | Alerts/actions open AC/WS/AR. |
| ML | Module landing | module projection | No | Surface selection only; commands reanchor. |
| AC | Authoritative collection/list/search | collection over root authority | No direct mutation; guarded create/import only after contract | Open AR before command. |
| WS | Workspace projection | projection, rebuildable/stale-aware | No | Always reanchor to AR for business command. |
| AR | Authoritative record shell | root authority from P0 | Yes, only via governed transition/API/evidence/signature policy | This is anchor; cross-root actions open target AR. |
| DASHBOARD | KPI/control tower/analytics | analytics/data-product projection | No | Drill to AR/AC/WS; no dashboard-driven decision authority. |
| INBOX | workflow task queue | task projection | No business mutation | Task opens AR action rail; signer challenge only in AR. |
| ADMIN | domain/module config admin | governed config surface | Only through config/change-control authority | Config mutation opens config/root AR and audit/evidence/signature packet. |

## 3. Authority invariants

1. **One canonical record authority per root/resource family.** Alias and duplicate candidates can be links, labels or shortcuts, not independent authority.
2. **Workspace is projection.** A WS row may expose readiness, blocked state and proposed next action, but never commits workflow state.
3. **AR owns commands.** A command is a workflow transition with actor, source state, target state, guard evidence, audit, signature policy, idempotency, problem details and rollback/void/revise policy.
4. **Collections are search/list/facet surfaces.** They can initiate a request only if the request opens an AR or governed command contract; otherwise action is disabled with reason.
5. **Dashboards are not release/disposition authority.** They may show signals and drilldown, but regulated or business decisions must occur in AR.
6. **Inbox is task projection.** Task assignment/claim may be a workflow-task command if separately contracted; root business transition still opens AR.
7. **Admin is controlled config.** Domain admin cannot change policy/config without version, workflow guard, audit/evidence/signature policy and rollback path.
8. **AI is advisory.** AI regions may summarize/score/explain but cannot decide regulated release, disposition, CAPA closure, e-sign, inventory movement or OT write.

## 4. Mapping algorithm

For every root from P0:

```text
root_code -> canonical_target_code -> domain_id/domain_slug -> module_slug -> resource_family
```

Generate:

```text
AC: /ops/{domain_slug}/{module_slug}/{resource_family}
WS: /ops/{domain_slug}/{module_slug}/{resource_family}-workspace
AR: /ops/records/{resource_family}/{record_id}?tab=overview
```

If `alias_duplicate_status != canonical`, the route must carry alias/duplicate warning and must not create duplicate workflow/API/evidence authority. If `canonical_target_code` is missing from the root code set, the route remains a gap until M02.

## 5. AR tabs, regions and action surfaces

Each AR must expose these regions as planning contract surfaces:

| Region | Purpose | API/workflow dependency | Stop rule |
|---|---|---|---|
| authority_header | identity, state, owner, version/effectivity, canonical target | RECORD_GET | Stop if record lacks canonical root/resource family. |
| action_rail | governed transition availability and disabled reasons | WORKFLOW_GET + transition command policy | Stop if action lacks transition row/guard. |
| overview_kpi_cards | readiness, risk, completion, aging | RECORD_SUMMARY | Stop if summary conflicts with authoritative state. |
| workflow_tab | state timeline and guard outcomes | WORKFLOW_HISTORY | Stop if audit/event relation absent. |
| evidence_tab | evidence required/missing/attached | EVIDENCE_LIST | Stop if transition needs evidence but evidence type absent. |
| signature_tab | signature requests/completions/meanings | SIGNATURE_LIST | Stop if signature meaning/audit link absent. |
| related_graph | upstream/downstream/digital-thread links | RELATED_RECORDS | Stop if relation duplicates authority. |
| audit_tab | actor/reason/timestamp/correlation/problem history | AUDIT_TRAIL | Stop if mutation lacks audit trace. |
| attachments_panel | linked files/evidence references | attachment/evidence boundary | Stop if unmanaged file becomes evidence. |
| event_timeline | emitted/consumed events and replay status | EVENT_LIST | Stop if event causes hidden mutation. |
| analytics_panel | record-level analytics projection | analytics/data product | Stop if analytics overwrites authority. |
| ai_advisory_sidebar | explanation/advice with confidence and source evidence | AI/advisory API and human boundary | Stop if AI executes decision. |
| packet_export_panel | export/release/audit packet preview | packet/evidence/audit APIs | Stop if packet omits required evidence. |
| comments_panel | contextual comments without authority mutation | comment/audit policy | Stop if comments become hidden approval. |

## 6. API dependency grammar

D01 does not create OpenAPI/JSON/YAML. It names API families needed by route class:

- Collection/search/facet/export for AC.
- Projection/read model/summary for WS and dashboards.
- Record/workflow/evidence/signature/audit/related/event/packet for AR.
- Workflow task/notification for inbox.
- IAM/policy/config/workflow-definition/audit/evidence/signature for admin.
- Route registry/session/IAM/notification/search for SH/DL/ML.

C10 must later bind these to approved C-stream endpoint contracts.

## 7. State contract grammar

Every route must define:

```text
loading
empty
error/problem
permission denied / route masked
disabled action with exact reason
stale projection
fallback/offline
```

No route is accepted if it has no loading/error/offline contract. Disabled actions must explain missing guard evidence, missing API contract, missing workflow binding, permission/SoD block, stale/offline block or missing signature meaning.

## 8. HMV4 safety carry-forward

D01 preserves HMV4 principles: additive, feature-flagged, rollback-safe, current-portal inert by default, fixture-backed first, live API opt-in only, and no business mutation unless fully contracted. Any future implementation handoff must still prove forbidden files and fixture loading rules separately; D01 makes no such repo claim.

## 9. Route policy matrix

The authoritative D01 route policy matrix is `D01_ROUTE_CLASS_POLICY.csv` with 506 rows and required columns from the D01 prompt.

## 10. Decision phrase

`D01_ROUTE_GRAMMAR_AUTHORITY_RULES_READY_WITH_API_WORKFLOW_GAPS`
