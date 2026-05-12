# D07 — Signature, Evidence, Audit Panel Model

## Status and boundary

```text
MODE: planning-only
ROUTE_AUTHORITY: authoritative record shell only
WORKSPACE_DASHBOARD_INBOX: projection/reanchor only
PRODUCTION_CLAIM: none
VALIDATION_CLAIM: none
REPO_STATE: not checked by user instruction
```

This model applies to every D07 regulated screen contract and inherits D01 route grammar, D03 AR shell tabs, D04 workspace authority prevention, D05 mobile/kiosk offline rules and D06 dashboard projection rules.

## Panel stack inside an authoritative record shell

Every GxP/eQMS AR shell must expose these regulated panels:

1. **Authority header** — root code, record id, title, state, owner, site/tenant, version/effectivity, stale/offline/permission warnings.
2. **Workflow task/due panel** — task owner, due date, SLA class, escalation chain, blocked/ready state and missing prerequisites.
3. **Evidence guard panel** — required evidence checklist, evidence object refs, retention/integrity metadata, source and owner.
4. **Audit trail panel** — time-sequenced creation/change/transition/comment/export/signature events.
5. **Signature challenge panel** — signature meaning, signer role, reason, identity challenge, SoD status and linked record summary.
6. **Related record graph** — upstream/downstream authoritative records, blockers, repeated issues and open impact cards.
7. **Impact assessment region** — required impact questions, affected owners, not-applicable rationale and evidence links.
8. **Verification/effectiveness/readiness region** — plan, objective evidence, independent review, acceptance and follow-up schedule.
9. **Packet export/readiness region** — inspection/validation/release packet index, source links, gap status and export permission.

## Signature rules

A signature affordance must remain disabled until all of these are true:

```text
record is opened in AR route, not workspace/dashboard/inbox
current actor is authenticated and eligible for signer role
signature meaning is explicit and selected by workflow policy
signature reason/comment is captured when required
signature is linked to exact root_code, record_id, route, state transition, evidence set and timestamp
SoD check passes
record version is current and not stale/offline
required evidence and impact cards are complete
challenge mechanism is available
problem details contract exists
```

### Signature meaning catalog

| Area | Required signature meanings |
|---|---|
| Document control | authorship, technical review, quality approval, release/effective approval, retirement approval |
| Training | learner attestation, trainer assessment, qualification certification, retraining waiver approval |
| Nonconformance/deviation/MRB | containment approval, disposition responsibility, investigation closure, deviation approval, MRB decision |
| CAPA | CAPA plan approval, action completion responsibility, verification approval, effectiveness acceptance, closure approval |
| Change control | impact assessment approval, change approval, implementation verification, effective-date release, rollback/void approval |
| Audit | audit plan approval, finding issuance, response acceptance, closure verification, inspection package approval |
| Complaint | complaint intake review, reportability decision, investigation closure, customer response approval |
| Supplier SCAR | supplier containment acknowledgement, supplier corrective plan acceptance, internal closure approval, supplier risk status approval |
| Batch/eBR/eDHR/release | record review, exception closure, QA release/reject responsibility, archive package approval |
| Metrology/equipment | calibration review, release-to-service approval, out-of-tolerance impact approval |
| Validation package | intended-use approval, GxP impact approval, protocol approval, test report acceptance, validation report approval, pre-production-readiness acceptance |

### Forbidden signature patterns

```text
blank signature button
bulk signature from workspace/dashboard/inbox
signature while offline/stale
signature without meaning/reason/linkage
signature by support/admin role without business role
self-approval where SoD requires independence
signature on projection instead of authoritative record
signature that can be removed from the signed record context
```

## Evidence rules

Evidence is not a loose attachment. Every evidence object or evidence reference must carry at least:

```text
evidence_id
root_code
record_id
evidence_type
source and capture method
owner / creator / approver where applicable
created_at and effective_at if applicable
retention rule
integrity hash or external immutable reference
visibility / confidentiality class
version or revision
related workflow transition / guard
site / tenant / product / lot / serial context when applicable
```

Evidence panel states:

| State | Meaning | UX behavior |
|---|---|---|
| required_missing | workflow guard requires evidence that is absent | transition/signature disabled; show owner and due date |
| candidate_attached | evidence candidate exists but not accepted by evidence policy | show pending review; no transition unless policy allows |
| accepted | evidence object/reference is accepted and linked | allow next guard check if all other prerequisites pass |
| stale_or_superseded | evidence no longer matches current version/context | require revalidation/re-attachment/review |
| integrity_problem | evidence hash/reference/linkage cannot be verified | block transition and escalate |
| permission_masked | actor cannot see full evidence content | show existence/status without leaking content; business transition may still require eligible reviewer |

## Audit rules

Audit panel must show at minimum:

```text
actor
role
site / tenant
route
record id
record version/effectivity
prior state/value and new state/value when applicable
reason/comment
correlation id
source surface: AR, workspace reanchor, inbox, mobile, kiosk, dashboard drilldown, integration
linked evidence refs
linked signature refs and meaning
problem details emitted
```

Audit trail is read/export only. The UI cannot edit, delete or reorder audit events.

## SoD and permission rules

- Creator/preparer cannot be sole final approver where the area requires independent review.
- Operator/executor can provide evidence but cannot be QA release signer where independence is required.
- CAPA owner cannot be sole effectiveness verifier.
- Supplier actor cannot close internal SCAR.
- Document author cannot be final quality release approver.
- Training learner cannot certify self except explicit self-attestation policy.
- Support/admin permission cannot grant business approval/signature authority.
- Site/tenant/product/customer/supplier boundaries are enforced before record content and actions are shown.

## Problem and disabled states

Use visible disabled reasons and problem summaries. Core problem codes:

```text
access.denied
offline.not_allowed
stale_projection
workflow.transition_not_allowed
evidence.required
evidence.integrity_problem
signature.meaning_missing
signature.challenge_unavailable
sod.conflict
impact.required_open
owner.tbd
validation.scope_missing
version.conflict
record.locked
problem.rfc9457_summary
```

## Offline / mobile / kiosk boundary

- Offline regulated UX is read-only/stale by default.
- No offline e-sign, evidence acceptance, release, disposition, CAPA closure, validation approval or policy/config change.
- Kiosk/shared station must bind the actor for each regulated task and must not reuse station identity as signer identity.
- Scan-first can resolve context but cannot execute a regulated command without AR workflow/evidence/signature/IAM gate.

## Export / packet readiness

Packet export must include:

```text
source AR links
record state and version/effectivity
evidence index with retention/integrity metadata
audit trail summary and event export reference
signature manifestations and linked records
impact assessment decisions and not-applicable rationales
open gaps/deviations/overdue tasks
permission/export policy and export timestamp
```

## Stop rules

- Stop if any eQMS UX screen behaves like a normal form without regulated panels.
- Stop if signature lacks explicit meaning, signer identity, timestamp, reason/context and record linkage.
- Stop if evidence can be accepted without evidence object metadata/retention/integrity/linkage.
- Stop if audit trail is hidden, editable or unavailable for regulated transitions.
- Stop if workspace/dashboard/inbox/mobile/kiosk becomes hidden authority.
- Stop if validation packet uses production/validated-live-system wording.
