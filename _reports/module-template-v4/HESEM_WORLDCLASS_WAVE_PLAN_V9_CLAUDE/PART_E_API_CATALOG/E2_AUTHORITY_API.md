# E2 — Authority API

```
api_family:     Authority Ledger
owner_role:     Platform Lead
scope:          Read access to Authority Ledger entries; admin lookup
```

---

## 1. Purpose

The Authority API provides read access to the Authority Ledger (B2). It
is consulted by the Workflow Mutation Command Bus on every command;
also by UI surfaces (to determine which actions to enable / disable);
also by audit pack generators (to document the authority chain).

---

## 2. Endpoints

### E2.1 — Active entry lookup by root

**Purpose**: Given a root code (and tenant), return the active Authority
Ledger entry.

**Audience**: Command Bus, UI surfaces, audit pack generator.

**Idempotency**: read-only; cacheable per L1 cache TTL (60 seconds).

### E2.2 — Active entry list (per resource family / per authority class)

**Purpose**: Browse active entries, filtered by resource family or
authority class.

**Audience**: Admin tools, audit pack generator.

### E2.3 — History lookup

**Purpose**: Retrieve all Authority Ledger entries for a root including
superseded historical entries.

**Audience**: Audit pack generator, regulatory inspector tools.

### E2.4 — Entry validation (verify signature, axioms)

**Purpose**: Validate that an entry's signature is correct and that its
axioms hold.

**Audience**: Integrity audit jobs, admin tools.

### E2.5 — Entry creation (admin / governance)

**Purpose**: Create a new Authority Ledger entry through the governance
workflow (engineering change order, signed approval, then ratification).

**Audience**: Platform Lead, Compliance Lead, Domain Architects.

**Idempotency**: idempotency-key required.

**Authority required**: requires user_approval_phrase per V3 RULE-8.

### E2.6 — Entry supersession

**Purpose**: Mark an existing entry as superseded by a new entry.

**Audience**: Same as E2.5.

### E2.7 — Cross-tenant lookup (system-only)

**Purpose**: Look up entries across tenants (system-level only;
restricted to platform).

**Authority required**: hesem-system tenant context.

---

## 3. Authentication and authorization

All endpoints require authenticated session. Most endpoints are read-
mostly; only E2.5, E2.6, E2.7 require elevated authority.

Per-tenant scoping: tenant_id from JWT claim.

---

## 4. Cache and freshness

E2.1, E2.2 (active lookups): cached at L1 with 60-second TTL.

E2.3 (history): not cached (low query volume).

E2.4 (validation): cached per validation cycle.

---

## 5. Failure modes

```
- auth/unauthorized              401
- auth/forbidden                 403 (when entry not in tenant scope)
- workflow/state-machine-not-found 404 (for unknown root_code)
- contract/schema-violation       422 (entry malformed)
- audit/integrity-violation-detected 503 (signature does not verify)
```

---

## 6. Wave target

L4 by W0.5; L7 by W12.

---

## 7. Decision phrase

```
E2_AUTHORITY_API_BASELINE_LOCKED
NEXT: E3_WORKFLOW_API.md
```
