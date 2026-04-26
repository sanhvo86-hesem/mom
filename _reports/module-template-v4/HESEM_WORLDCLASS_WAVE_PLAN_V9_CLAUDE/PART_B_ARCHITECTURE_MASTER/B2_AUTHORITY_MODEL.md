# B2 — Authority Model

This chapter describes the Authority Model — the rules that govern who can
change what in HESEM. The Authority Model is the foundation of HESEM's
trust posture. Without it, regulatory audit fails, customer trust fails,
and the platform fails.

The Authority Model is built around two constructs: the **Authority
Ledger** (the registry of authority rules per root) and the **Workflow
Mutation Command Bus** (the pathway every mutation must travel). Both are
described in detail below.

---

## 1. Why HESEM has an Authority Model

In a typical enterprise software stack, authority is implicit. A user with
"admin" role can perform many actions across many domains. There is no
explicit registry of which actions are permitted, on which records, by
which roles, with which obligations.

This creates problems:
- A regulator asking "show me the policy that allowed user X to release
  this lot" gets an opaque answer ("the user was admin").
- An auditor asking "who can release CDOCs?" gets a manual answer
  (someone has to inspect the role definitions).
- An engineer designing a new mutation has no clear contract for what
  authority is required.
- An AI advisory feature has no enforced boundary preventing it from
  attempting a regulated mutation.

The Authority Model addresses all four problems by making authority
explicit, queryable, and enforced.

---

## 2. The Authority Ledger

The Authority Ledger is HESEM's authoritative registry of authority rules.
For every root in HESEM (95 roots as listed in PART_M2), there is at
least one Authority Ledger entry that specifies:

- **Which root the entry governs** (by root code, e.g., NQCASE, BREL, CDOC)
- **Which resource family** the root corresponds to in URL and API paths
- **Which authority class** the root has (authoritative, projection,
  dependency, platform, or vertical)
- **Which commands are permitted** on the root (e.g., for NQCASE: open,
  dispose, close, link to CAPA, reassign)
- **Which surfaces are forbidden** to mutate this root (typically
  workspaces are forbidden; only authoritative record shells and action
  consoles may issue commands)
- **Which guard requirements** must be satisfied before any command
  succeeds (the policy directives that apply, the workflow state that
  must hold, the evidence that must exist, the e-signature obligations,
  the data validations)
- **Which audit requirements** must be captured for every committed
  mutation (the before-state, after-state, actor, reason, timestamp,
  correlation identifier)
- **Which rollback model** applies (compensating command, revert,
  no-reversal, or custom)
- **Which maturity level** the root currently holds (L0 through L7;
  see PART_C and the Slice Maturity Cube)
- **Which validation scope** applies (regulated for FDA-GxP, regulated
  for IATF, regulated for AS9100, regulated for ITAR, regulated for
  medical device, regulated for food, or non-regulated)
- **What the intended use of the root is** (a one-paragraph statement
  describing the root's purpose for regulatory and audit reference)
- **What the forbidden uses are** (an explicit list of uses the root
  is not permitted for, to prevent scope creep)

In V9 plain-language form, this is the catalog. In implementation, this
becomes a data table that the runtime queries on every command.

---

## 3. How the Authority Ledger is consulted

When a user (human or service principal) submits a command (the only way
to mutate any root), the Workflow Mutation Command Bus performs this
sequence:

1. **Receive**. The Command Bus receives the command envelope through L7.
   The envelope carries the actor identity, the target root, the target
   record, the command type, the intended meaning, and the optional
   payload, evidence references, and signature envelope.

2. **Look up the Authority Ledger entry** for the target root and resource
   family. If no entry is active for the root in the actor's tenant
   scope, the command is rejected with a problem-detail of category
   "policy/decision-not-applicable."

3. **Verify the command type is in the entry's allowed_commands list.**
   If not, the command is rejected with "workflow/transition-not-permitted."

4. **Verify the actor's surface class is not in the entry's forbidden
   surfaces list.** If a workspace is attempting to mutate, this is
   rejected with "authority/workspace-cannot-mutate."

5. **Evaluate the entry's guard requirements.**
   - The policy directive list is consulted (L2).
   - The required workflow state is verified against L4.
   - The required evidence is verified against L5.
   - The e-signature obligations are checked (does the envelope carry
     the required signers and factor records).
   - The data validations are run.
   If any guard fails, the command is rejected with the appropriate
   problem-detail and the failed guard identifiers.

6. **Apply the mutation in a database transaction** (L4).

7. **Emit the audit event, workflow event, OTG event, and notification**
   per the entry's audit requirements.

8. **Return the success result** to L7 which serializes the response to
   the caller.

This sequence happens for every mutation. There are no shortcuts. There
is no mutation pathway that bypasses this sequence.

---

## 4. The Authority Ledger lifecycle

The Authority Ledger is not static. As HESEM evolves, new roots are added,
new commands are defined, new policy directives are published, new
maturity levels are achieved. Each of these is a change to the Authority
Ledger.

The lifecycle is:

```
Step 1.  An Engineering Change Order proposes a change to the Authority
         Ledger (e.g., adding a new command to NQCASE, raising NQCASE
         to maturity level 5, requiring two-person e-signature for
         CAPA close).
Step 2.  The relevant Domain Lead and Compliance Lead review.
Step 3.  An Architecture Decision Record is written documenting the
         change, the rationale, the consequences, and the rollback path.
Step 4.  The user approval phrase is received (per V3 RULE-8: "Proceed
         with <root> Stage N graduation per ADR-NNNN").
Step 5.  The new Authority Ledger entry is signed by the Platform Lead
         using the platform key.
Step 6.  The new entry's effective_at timestamp activates it; the prior
         entry is marked superseded.
Step 7.  The materialized active-entries view refreshes and the runtime
         picks up the new rules.
```

The Authority Ledger is therefore a slowly-changing record of slowly-
changing decisions about authority, not a fast-changing operational
record. Most entries change only at major wave gates.

---

## 5. The five authority classes

Every root in HESEM is classified into exactly one of five authority
classes. The class governs how the root behaves and what operations it
participates in.

### Class A — authoritative

Authoritative roots are the system of record. Every mutation flows through
them. They are the only place where authoritative state lives. Examples:
Sales Order, Purchase Order, Lot, Batch Release, Nonconformance Case,
CAPA, Controlled Document, Equipment, Calibration Record.

There are roughly 60 authoritative roots in HESEM.

### Class B — projection

Projection roots are read-only views materialized from authoritative
roots. They exist for performance (denormalization, pre-aggregation) or
for purpose (a workspace's specific shape). Projections are never
mutated; they are refreshed. Examples: Dispatch List, NQ Case Inbox,
Quality Trend Board, Quarantine View.

There are roughly 15 projection roots in HESEM.

### Class C — dependency

Dependency roots are referenced by authoritative roots but are managed
under their own discipline. Master data such as Item Master, Supplier
Master, Customer Master, Equipment, Measurement Device, User, Role —
these are dependencies on which other roots build. Mutations are
permitted but with their own discipline (often not regulated; sometimes
regulated when the dependency is GxP-classified, e.g., Equipment in
pharma).

There are roughly 8 dependency roots in HESEM.

### Class D — platform

Platform roots are infrastructure-level entities the platform itself
provides: API Gateway, Event Bus, Idempotency Service, Live API Toggle
Registry, IAM, Workflow Engine, Evidence Engine, Audit Engine,
Notification Service, Graphics Authority, Design System, Site Reliability
stack, Observability stack.

There are roughly 12 platform roots in HESEM.

### Class E — vertical

Vertical roots are specific to a vertical pack (Pharma, Auto, Aero, Med
Device, Food). They activate only when the corresponding pack is enabled
for a tenant. Examples: Annual Product Review (pharma), PPAP (automotive),
AS9102 First Article Inspection (aerospace), Device History Record
(medical device), HACCP Plan (food).

There are roughly 20+ vertical roots in HESEM.

Total across all classes: approximately 95 roots, which constitutes the
HESEM root catalog (PART_M2).

---

## 6. The eight authority discipline rules

Eight rules govern how the Authority Model is used. These are the
same rules described in PART_A1 §6 (non-negotiable principles), now
specifically applied to authority:

```
Rule 1.  Every authoritative root has at least one Authority Ledger entry.
         No root may be mutated without an active entry.

Rule 2.  Every Authority Ledger entry is signed by the Platform Lead.
         No entry is active without a verified signature.

Rule 3.  Workspaces never mutate. Only authoritative record shells (AR)
         and action consoles (AC) may submit mutation commands. This is
         enforced by the linter, by middleware, and by playwright tests.

Rule 4.  AI service principals never commit any of the eight banned
         regulated decisions. This is enforced by CI test, by runtime
         middleware, and by a nightly integrity check on the OTG.

Rule 5.  Every mutation produces an audit event. No exception. The audit
         event is hash-chained to the previous audit event, and the chain
         is daily-anchored.

Rule 6.  Every regulated mutation captures e-signature evidence per the
         entry's obligation. This includes signer printed name (snapshot
         at signing time), signature meaning, and the canonical state
         hash of the signed record.

Rule 7.  Every mutation honors optimistic-lock concurrency control. The
         caller passes an If-Match ETag; mismatch returns HTTP 412.

Rule 8.  Every mutation is idempotent. The caller passes an
         Idempotency-Key; replays return the original response.
```

These eight rules are inviolable. Any deviation requires an Architecture
Decision Record ratified by the user.

---

## 7. The 11 Authority Ledger axioms

Beyond the eight discipline rules, the Authority Ledger has 11 invariants
that must always hold. These are the truth conditions of the Authority
Ledger; if any axiom is violated, the Ledger is in an invalid state and
mutations dependent on it must halt.

```
A-AL-1  Every Authority Ledger entry references a canonical root_code
        present in the root catalog (PART_M2).

A-AL-2  For each (root_code, resource_family, authority_class, tenant_id)
        combination, at most one entry is active (superseded_at IS NULL).

A-AL-3  An entry's effective_at timestamp must be at or before the
        current time at promotion.

A-AL-4  An entry with maturity_level >= 5 (controlled mutation) must
        have a non-empty allowed_commands list and non-empty workflow
        guard requirements.

A-AL-5  An entry with regulated validation scope and maturity_level >= 5
        must have e-signature required with appropriate factor count
        per V3 RULE-2 and per FDA 21 CFR Part 11 §11.10.

A-AL-6  An entry of authority_class 'authoritative' must include in its
        forbidden surfaces list at least the workspace surface class
        for any related projection. (Workspaces never mutate.)

A-AL-7  An entry's signed_by must be a current authorized signer in the
        signer registry; the signature must verify against the entry's
        canonical JSON hash.

A-AL-8  Every command in an entry's allowed_commands list must exist in
        the command registry. No orphan commands.

A-AL-9  Every entry whose rollback_model is not 'no_reversal' must have
        a rollback_definition_uri pointing to a valid saga definition.

A-AL-10 Tenant_id IS NULL entries are system-level; cross-tenant edges
        between Authority Ledger entries are only permitted when the
        subject is system-level.

A-AL-11 A maturity_level transition by more than one step in a single
        signed entry is forbidden. Promotions go L0 to L1 to L2 to L3
        to L4 to L5 to L6 to L7 one step at a time. (Anti-skipping rule
        per V3 RULE-1.)
```

These axioms are checked online by triggers and offline by a nightly
integrity audit. Any axiom violation is a SEV-1 incident.

---

## 8. How the Authority Model serves customers and regulators

When a regulator asks "show me the authority that allows user X to close
this CAPA," HESEM answers in three steps:

1. The audit event for the CAPA close shows the Authority Ledger entry
   that was consulted.
2. That entry shows: which commands are permitted, which guards were
   evaluated, which signatures were captured, which evidence was
   referenced.
3. The chain of policy directives that constituted the entry's guard
   requirements is shown.

This audit-pack chain is generated automatically as part of the audit
pack export (PART_H + PART_J). The regulator reads it, verifies it, and
moves on.

When a customer asks "can your user X close my CDOC?", HESEM answers by
querying the Authority Ledger and the user's role assignments. The
answer is deterministic, traceable, and explainable.

When an engineer designs a new mutation, the engineer authors the
Authority Ledger entry as part of the slice scope contract (PART_C).
The runtime enforces what the entry declares.

---

## 9. The boundary with the AI Discipline

The Authority Model is the structural enforcement of the AI Discipline
described in PART_L. The AI Discipline says "AI never commits the eight
banned regulated decisions"; the Authority Model enforces this by:

- Refusing any command whose actor identity is an AI service principal
  for a banned-decision command type.
- Being checked at compile time (the CI test scans the command handler
  registry).
- Being checked at runtime (the middleware verifies actor.kind is not
  'ai_advisory').
- Being audited offline (a nightly integrity check on the OTG verifies
  no committed edge has an ai_advisory_annotation as subject).

This triple defense is described in PART_L. The Authority Model is the
structural piece.

---

## 10. Decision phrase

```
B2_AUTHORITY_MODEL_BASELINE_LOCKED
NEXT: B3_OPERATIONAL_TRUTH_GRAPH.md
```
