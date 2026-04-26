# E8 — Evidence API

```
api_family:     Evidence Records
owner_role:     Compliance Lead
scope:          Evidence record retrieve, attach, validate;
                WORM lifecycle management
```

---

## 1. Purpose

The Evidence API exposes evidence records (per B6 C1, C10, and C11).
Evidence records include validation evidence (IQ/OQ/PQ), signatures,
telemetry samples, transaction records, rollback rehearsal records,
retraining records, red-team reports, audit anchors, and fallback logs.

Evidence is mostly attached to authoritative records; this API retrieves
and verifies it.

---

## 2. Endpoints

### E8.1 — Retrieve evidence by id

**Purpose**: Retrieve a single evidence record.

**Audience**: Audit pack generator, regulatory inspector, validation
team.

### E8.2 — List evidence for a record

**Purpose**: Retrieve all evidence records for a specific authoritative
record.

**Audience**: Record Shell UI, audit pack generator.

### E8.3 — Filter evidence by class

**Purpose**: Filter evidence records by class (validation, signature,
telemetry, transaction, rollback, retraining, red-team, audit_anchor,
fallback).

### E8.4 — Verify evidence integrity

**Purpose**: Verify an evidence record's hash and signature against the
stored values.

### E8.5 — Attach new evidence

**Purpose**: Attach a new evidence record to a target authoritative
record.

**Audience**: Validation team, ML team (for retraining records),
security team (for red-team reports), inspection workflow.

### E8.6 — Query evidence freshness

**Purpose**: Given a target record, return the freshness of each
required evidence class (per A18 axiom; per validation policy windows).

**Audience**: Compliance dashboards, BREL release evidence chain check.

### E8.7 — WORM retention status

**Purpose**: Verify evidence is in WORM media and per its declared
retention class.

**Audience**: Compliance team, integrity audit job.

---

## 3. Authentication and authorization

Authenticated session required. Some evidence is restricted (e.g.,
red-team reports) by role.

---

## 4. Failure modes

```
- auth/unauthorized                401
- auth/forbidden                   403
- validation/state-stale            451
- validation/evidence-missing       451
- audit/integrity-violation-detected 503
- retention/policy-violation        409
```

---

## 5. Wave target

L4 by W2 (substrate); L5 by W3.

---

## 6. Decision phrase

```
E8_EVIDENCE_API_BASELINE_LOCKED
NEXT: E9_AI_ADVISORY_API.md
```
