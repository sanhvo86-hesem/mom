# E6 — Audit API

```
api_family:     Audit Trail
owner_role:     Compliance Lead
scope:          Audit event retrieval; chain integrity verification;
                Merkle proof for specific events
```

---

## 1. Purpose

The Audit API exposes the audit trail (per B6 C1 audit chain). It is
how compliance teams, auditors, and regulatory inspectors retrieve
audit evidence on demand.

---

## 2. Endpoints

### E6.1 — Audit event by id

**Purpose**: Retrieve a single audit event by id.

**Audience**: Compliance team, audit pack generator.

### E6.2 — Audit events for a record

**Purpose**: Retrieve all audit events for a specific record.

**Pagination**: cursor-based.

**Audience**: Record Shell UI (audit tab), audit pack generator.

### E6.3 — Audit events for a principal

**Purpose**: Retrieve all audit events involving a specific principal
(e.g., "what did user X do in the last 30 days?").

**Audience**: Compliance team, security operations.

### E6.4 — Audit events for a tenant over a period

**Purpose**: Retrieve audit events for an entire tenant within a date
range.

**Audience**: Audit pack generator, compliance reporting.

**Performance**: Long-running operation pattern (E13) for large queries.

### E6.5 — Chain integrity verification

**Purpose**: Verify that the audit chain has not been tampered with by
recomputing the Merkle root for a specific date and comparing against
the stored anchor.

**Audience**: Compliance team, integrity audit jobs, external auditors.

### E6.6 — Merkle proof for an event

**Purpose**: Given an audit event id, return the Merkle proof linking
that event to the daily-anchored Merkle root. (Cryptographic proof of
inclusion.)

**Audience**: Regulatory inspector tools, customer-side verification
tools.

### E6.7 — Audit chain anchor history

**Purpose**: Retrieve all daily Merkle root anchors with timestamps and
signatures.

**Audience**: Compliance team, integrity audit.

### E6.8 — RFC 3161 timestamp lookup (for regulated tenants)

**Purpose**: Retrieve the RFC 3161 external timestamp for a daily
anchor (when external timestamping is enabled per the customer's
regulated tenant).

---

## 3. Authentication and authorization

Authenticated session required. Tenant scope enforced.

Some endpoints (E6.5, E6.6, E6.7) require Compliance role or higher.

---

## 4. Cache

Audit events are immutable (append-only). Caching is straightforward:
once retrieved, an event can be cached indefinitely (it never changes).

---

## 5. Failure modes

```
- auth/unauthorized                  401
- auth/forbidden                    403
- audit/integrity-violation-detected 503 (chain break)
- rate-limit/exceeded                429 (for high-volume queries)
```

---

## 6. Wave target

L4 by W0.5 (basic event retrieval); L5 by W4.5 (after OTG cutover);
external timestamping by W8.

---

## 7. Decision phrase

```
E6_AUDIT_API_BASELINE_LOCKED
NEXT: E7_ESIGNATURE_API.md
```
