# E11 — Bulk Operation API

```
api_family:     Bulk Operations
owner_role:     API Lead
scope:          Bulk import / export; bulk command submission
```

---

## 1. Purpose

The Bulk Operation API supports operations that touch many records at
once: bulk import (e.g., master data migration during onboarding),
bulk export (e.g., audit pack data extraction), and bulk command
submission (e.g., reassign 1000 NCs from one owner to another).

---

## 2. Endpoints

### E11.1 — Bulk import

**Purpose**: Submit a batch of records for import (typically during
customer onboarding's P4 Master Data Migration phase).

**Audience**: Customer Success / Implementation team during onboarding.

**Request**: NDJSON file or paginated JSON; per-record validation.

**Result**: Per-record status (succeeded, failed-with-reason).

**Idempotency**: idempotency-key per batch; per-record idempotency-key
in payload.

### E11.2 — Bulk export

**Purpose**: Export records for analytic, migration, or audit purposes.

**Audience**: Customer Success, Analytics, audit pack export.

**Performance**: Long-running operation pattern (E13).

### E11.3 — Bulk command submission

**Purpose**: Submit many similar commands as a batch (e.g., reassign
NCs, mark-inactive a list of items).

**Failure modes**: Per-command success/failure with HTTP 207
Multi-Status.

### E11.4 — Bulk import status

**Purpose**: Check status of a long-running import.

### E11.5 — Bulk export status

**Purpose**: Check status of a long-running export; download URL when
ready.

---

## 3. Authentication and authorization

Authenticated session required. Bulk operations typically require
elevated role (data migration role, admin role).

---

## 4. Idempotency

Critical. Bulk operations are the highest-risk for inadvertent
duplication. Per-batch and per-record idempotency-key required.

---

## 5. Failure modes

```
- auth/unauthorized          401
- auth/forbidden             403
- idempotency/required       400
- contract/schema-violation  422 (batch malformed)
- rate-limit/exceeded        429
```

Per-record errors returned in HTTP 207 Multi-Status with per-record
problem-detail.

---

## 6. Wave target

L4 by W4 (read bulk export); L5 by W5 (write bulk command).

---

## 7. Decision phrase

```
E11_BULK_OPERATION_API_BASELINE_LOCKED
NEXT: E12_FILE_UPLOAD_API.md
```
