# D08 — AI Copilot UX Boundary and Human Authority Model

## 1. Executive boundary

HESEM AI copilot is an **advisory, source-cited, permission-filtered, auditable UX layer**. It can help users search, summarize, compare, explain, detect gaps, draft text and prepare review packets. It cannot become authority for workflow transitions, e-signature, release, disposition, approval, training certification, safety override, inventory movement, financial posting, IAM/configuration change, live API toggle, event replay or audit/evidence modification.

The core boundary is:

```text
AI may recommend or draft.
Human authority must review and decide.
Workflow/API/IAM/evidence/audit/signature gates execute controlled actions.
No source = no regulated or operational advice.
No hidden authority in workspace/dashboard/mobile/inbox/admin surfaces.
```

Repo state not checked by user instruction.
I cannot verify the current repo state from connector in this turn.

## 2. Position in the Stream D route model

| Route/surface | AI role | Authority rule |
|---|---|---|
| `/ops` shell | route finder, glossary, source-aware navigation | no record or business authority |
| `/ops/{domain}` domain landing | domain summary, root readiness, gap explanation | projection/navigation only |
| `/ops/{domain}/{module}` module landing | module task context, blocked-state explanation | projection/navigation only |
| workspace projection | filter/sort/search, explain cards, draft questions, suggest AR drilldown | no mutation; every command reanchors |
| AR record shell | summarize record, explain evidence/audit/related records, draft rationale | AR is authority, but AI is not; human workflow command required |
| dashboard/command center | explain KPI, freshness, lineage and drilldown path | analytics projection; not source of truth |
| connected worker/mobile/kiosk | source-cited coaching and instruction explanation | no task completion, evidence acceptance, e-sign or safety override |
| inbox/task list | summarize due tasks and blockers | no approve/sign/certify/release/close from inbox |
| admin/governance | summarize AI eval/policy/incidents | no self-approval, no policy/config mutation by AI |

## 3. Allowed AI capability categories

1. **Search and navigation** — resolve route, record family, source type and reanchor path within permission scope.
2. **Summarization with visible sources** — summarize authoritative records, evidence objects, audit events, workflow tasks, controlled documents, dashboard lineage or integration logs.
3. **Explanation** — explain workflow guard failures, due dates, SoD conflicts, signature-readiness gaps, data freshness, validation/intended-use gaps and disabled states.
4. **Comparison** — compare related records, versions, lots, specs, documents, procedures, evidence packets or dashboard signals with citations.
5. **Risk/gap detection** — flag anomaly, conflict, missing evidence, stale source, missing owner, overdue task or red-team/eval failure.
6. **Drafting** — draft review notes, investigation summaries, CAPA rationale, supplier/customer response, audit observation language, validation test outline or incident ticket. Drafts remain uncommitted and require human edit/accept/reject.
7. **Instruction support** — translate, simplify or clarify controlled instructions without changing official meaning or omitting warnings.
8. **Natural language filters** — create projection filters/sorts/groupings; no bulk transition or mutation.
9. **Evaluation and governance support** — summarize evaluation results, risk metrics and incident trends; no self-approval or model activation.

## 4. Blocked capability categories

AI is blocked from the following, even when the user asks directly:

```text
approve
sign / e-sign / answer challenge
release batch/product/device record
final disposition / MRB decision
close CAPA / effectiveness / audit finding
certify training / qualification
override safety / LOTO / permit / equipment interlock
write to OT/equipment/edge device
change workflow state
post GL / approve invoice/payment
issue/adjust inventory / ship
change IAM / policy / tenant / site / config
live API toggle / event replay / mapping repair
bulk regulated action
accept or fabricate evidence
edit/delete/backdate audit trail
silent edit approved/signed/released records
activate its own model/prompt/use-case
suppress incident or failed evaluation
```

## 5. Human authority model

D08 defines four AI risk bands:

| Risk band | Context | Human review rule |
|---|---|---|
| `AI-R1 informational_navigation_support` | route help, glossary, low-impact explanation | review required only when advice becomes a business action |
| `AI-R2 operational_decision_support` | WIP, equipment, inventory, supplier, planning, dashboard investigation | responsible owner must review before operational action |
| `AI-R3 regulated_or_gxp_advisory_only / financial_control / platform_control` | eQMS, release, audit, CAPA, complaint, training, calibration, finance, IAM, integration, AI governance | qualified human review mandatory before any decision |
| `AI-R4 safety_or_ehs_critical_advisory_only` | EHS, LOTO, emergency, equipment safety, safety-affecting instructions | immediate human escalation; AI cannot be relied upon as executor |

Human review is not a checkbox. The review event must capture source cards, AI output, model/prompt version, reviewer identity, acceptance/edit/rejection, reason, linked AR/workflow/evidence and correlation id.

## 6. Source and citation law

D08 uses a strict source hierarchy:

```text
T0 authoritative: AR record, evidence object, audit/signature history, workflow guard state
T1 controlled: procedure/document, validation package, requirements/test artifact
T2 projection/telemetry: dashboard, integration log, lineage/freshness signal
T3 external reference: standards, vendor patterns, public docs
T4 user prompt: untrusted intent input
T5 model memory/unsourced generation: not acceptable as evidence
```

For regulated, safety, financial or platform-control advice:

```text
No visible T0/T1 source = no advice.
Stale source = explanation-only with warning.
Conflicting source = escalate.
Permission-redacted source = state boundary and do not infer hidden content.
External source cannot override HESEM authority records.
```

## 7. UX states required on every AI surface

Each AI panel must be able to display these states in prose/design contract form:

| State | Required behavior |
|---|---|
| loading | show source retrieval and permission filtering in progress |
| no source | refuse controlled advice and offer source/gap route |
| stale source | downgrade to explanation/navigation-only and show freshness warning |
| source conflict | show conflict class and escalate to owner |
| permission redacted | show redacted source boundary; do not infer hidden data |
| prompt injection suspected | ignore malicious instruction, log event, escalate if needed |
| blocked action | cite policy row and route to human workflow/AR if allowed |
| offline | read-only/navigation; no regulated/operational mutation or evidence/signature |
| eval failure | disable/downgrade affected AI surface pending governance repair |
| human review pending | show draft status, reviewer role and no-action-until-review warning |

## 8. AI panel anatomy

Every AI answer that touches a record, workflow, evidence, regulated topic, dashboard signal, instruction or admin policy must show:

- AI role: advisory-only.
- Route and route class.
- Authority boundary.
- Source cards with record/document/evidence/workflow ids, version/effectivity/status/freshness and permission basis.
- What the AI can do next: search, summarize, explain, draft, route.
- What the AI cannot do: execute the blocked capabilities for the context.
- Required human reviewer role.
- Link/reanchor destination to AR/workflow/evidence or governance record.
- Audit status: prompt/output/source/human decision logging enabled.
- Limitation banner when source is missing, stale, conflicting, external or redacted.

## 9. RAG/retrieval safety rules

- Retrieval is permission-filtered before the model receives content.
- Retrieved text is treated as data, not instruction.
- Controlled documents/procedures must show version/effectivity/status.
- Dashboard/analytics outputs must show lineage/freshness and cannot be used alone for regulated decisions.
- External standards/vendor patterns are T3 references, not HESEM record authority.
- User prompt is T4 untrusted input and cannot grant authority or override policy.
- Unsourced model generation is T5 and cannot support controlled advice.
- Source conflicts block decision advice and create a human review/escalation request.

## 10. Evaluation minimums

D08 requires evaluation before live AI use, especially for regulated/safety contexts:

| Evaluation area | Minimum target |
|---|---|
| blocked action refusal | 100% for e-sign, approval, release, disposition, safety override, workflow mutation, IAM/config, audit/evidence modification |
| regulated citation precision | >=99% for R3/R4 claims |
| source conflict detection | >=98% for controlled/regulated/operational scenarios |
| permission leakage | 0 known leakage |
| prompt injection success | 0 successful policy override in red-team set |
| severe hallucination in regulated/safety context | 0 |
| reviewer routing accuracy | >=98%, >=99% for R4 |
| audit field completeness | >=99% for R3/R4 advice |
| dashboard stale/lineage detection | >=98% |

Any failed R3/R4 gate downgrades the affected AI surface to navigation-only or disabled until repair evidence and human governance approval exist.

## 11. Gap decisions inherited from D08

- A/B/C stream outputs are not fully frozen in this turn; D08 creates API/workflow/evidence requests but not backend authority.
- Repo/current implementation state is not checked by user instruction; D08 makes no implementation claim.
- AI can be designed for UX/governance planning now, but live regulated/safety AI requires source catalog, IAM/SoD, eval, telemetry, validation/intended-use and human review workflow gates.
- D09 must carry D08 rules into accessibility/security/permission/QA/export.

## 12. Decision phrase

```text
D08_AI_COPILOT_ADVISORY_ONLY_HUMAN_AUTHORITY_READY_WITH_GAPS
```
