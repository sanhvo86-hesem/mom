# E3 — Workflow API

```
api_family:     Workflow & Command Bus
owner_role:     Workflow Lead (Platform Lead)
scope:          Submitting commands; querying state machines; transition history
```

---

## 1. Purpose

The Workflow API is the public face of the Workflow Mutation Command
Bus (B2). Every authoritative mutation in HESEM goes through this API
family. Every state machine transition is initiated here.

---

## 2. Endpoints

### E3.1 — Submit command

**Purpose**: Submit a typed command to mutate a root.

**Audience**: UI clients (after a user action), service principals (for
machine-driven operations like CDC-derived events that require workflow
side-effects).

**Request**: Command envelope (per B2 description) — actor identity,
target root, target record, command type, intended meaning, optional
payload, optional evidence references, optional signature envelope, the
client context (surface class, route, IP, user agent), and the
correlation identifier.

**Success**: Transition result with the new state, new ETag, the
audit_event id, and (for regulated mutations) the e-signature record id.

**Failure modes**:
- workflow/transition-not-permitted (state machine forbids)
- workflow/guard-failure (one or more guards failed)
- workflow/invariant-violation (domain invariant)
- esign/factor-required (e-signature obligation not met)
- concurrency/version-conflict (ETag mismatch)
- idempotency/replay-mismatch (key conflict)
- ai/banned-decision-attempted (AI tried banned decision)
- tenant/boundary-violation (cross-tenant attempt)

**Idempotency**: required (Idempotency-Key header).

**Concurrency**: ETag required for non-create commands.

### E3.2 — State machine introspection

**Purpose**: Given a state machine identifier, return its definition
(states, transitions, guards, obligations, emits).

**Audience**: UI clients (to render workflow visualizations), audit pack
generator, validation tooling.

### E3.3 — State machine transition history

**Purpose**: Per record, return the history of transitions (the
workflow event log).

**Audience**: Record shell UI, audit pack generator.

### E3.4 — Guard preview

**Purpose**: Given a candidate command, evaluate its guards without
executing the command. Returns "would-pass" or "would-fail with reasons."

**Audience**: UI clients (to disable buttons that would fail);
investigation tools.

**Idempotency**: read-only.

### E3.5 — Saga compensation initiation (admin)

**Purpose**: Initiate compensation of a previously committed saga.

**Audience**: Operations team handling exceptional rollback.

### E3.6 — Workflow event subscription

**Purpose**: Subscribe to workflow events for a tenant (or a resource
family), via webhook or AsyncAPI.

**Audience**: External systems wanting to react to HESEM events.

---

## 3. Authentication and authorization

E3.1 (submit command) requires authenticated session and per-command
authorization via E1.7 (the /can endpoint). E3.2 to E3.6 require
authenticated session with per-endpoint role checks.

---

## 4. Idempotency, ETag, concurrency

- E3.1: Idempotency-Key required; ETag required (If-Match) for
  non-create commands.
- E3.2 to E3.4: read-only.
- E3.5: idempotency required.

---

## 5. Failure modes (full list)

The Workflow API is the most likely API to return problem-detail
responses. Common types include all transition-related, all e-signature-
related, all concurrency-related, all idempotency-related, and certain
AI / tenant / validation types.

The full list is in PART_M (problem registry); the ones above are the
ones most relevant to E3.

---

## 6. Wave target

L4 by W0.5 for read endpoints (E3.2, E3.3, E3.4); L5 by W4 for E3.6
subscription; L5 by W5 for E3.1 (submit command, beginning Stage 3
mutation graduation per V3 RULE-1 and RULE-8).

---

## 7. Performance budget

- E3.1 (submit command): p95 < 500 ms
- E3.2 (state machine introspection): p95 < 100 ms
- E3.3 (transition history): p95 < 200 ms
- E3.4 (guard preview): p95 < 200 ms

---

## 8. Decision phrase

```
E3_WORKFLOW_API_BASELINE_LOCKED
NEXT: E4_RECORD_API_PER_DOMAIN.md
```
