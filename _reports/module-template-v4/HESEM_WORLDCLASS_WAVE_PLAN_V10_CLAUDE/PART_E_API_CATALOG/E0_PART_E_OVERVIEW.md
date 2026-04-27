# PART_E — API CATALOG — Overview

Part E describes every API surface HESEM exposes. It is the
machine-facing edge of the platform. Where Part F describes UI surfaces
(the human-facing edge), Part E describes APIs (the machine-facing
edge).

This Part has 16 chapters: this overview plus 15 API family chapters.

---

## 1. The 15 API families

```
E1   Authentication & Identity API
E2   Authority API (Authority Ledger lookup)
E3   Workflow API (state machines, transitions)
E4   Record API per Domain (one chapter; references each domain's APIs)
E5   Workspace Projection API
E6   Audit API
E7   Electronic Signature API
E8   Evidence API
E9   AI Advisory API
E10  Notification API
E11  Bulk Operation API
E12  File Upload / Download API
E13  Long-Running Operation API
E14  Admin API
E15  Integration API (webhook subscription, CDC, partner connectors)
```

These groupings serve two purposes:
- They make API ownership clear (one lead per chapter).
- They expose patterns that recur across many endpoints (e.g.,
  problem-detail handling, idempotency, ETag management).

---

## 2. Per-chapter shape

Every API chapter follows the same shape:

```
1.  API family identity (name, owner role, scope)
2.  Purpose (what this API family enables)
3.  Endpoints (each endpoint described in plain language)
4.  Authentication and authorization expectations
5.  Idempotency requirements
6.  ETag / If-Match expectations
7.  Cache and freshness behavior
8.  Pagination
9.  Filter and sort capabilities
10. Bulk handling (when relevant)
11. Failure modes (which problem-detail types are returned)
12. Versioning and deprecation
13. Rate limits and quotas
14. Wave target
15. Decision phrase
```

---

## 3. Per-endpoint description format

Each endpoint within a chapter is described in plain language:

- **Endpoint name** (a short readable label, not a URL path)
- **HTTP method** (GET, POST, PATCH, DELETE)
- **Path pattern** (illustrative; actual paths follow PART_B7
  conventions)
- **Purpose** (one sentence)
- **Audience** (who calls this endpoint)
- **Request shape** (in plain words: what does the caller send)
- **Success result** (in plain words: what is returned on success)
- **Failure modes** (which problem-detail types are possible)
- **Authority required** (which permissions or e-signature)
- **Idempotency** (yes / no)
- **Concurrency** (ETag / If-Match required?)

This consistent shape makes endpoints comparable across chapters.

---

## 4. The API design principles (carried into every chapter)

```
P1   Contract first. No live API endpoint exists without a written
     contract.
P2   RFC 9457 problem details on every error.
P3   Per-route p95 latency budget.
P4   Idempotency-Key required on every mutation.
P5   ETag / If-Match on every mutation.
P6   Cursor pagination only (no offset pagination).
P7   Stable sort discipline on every list endpoint.
P8   Per-tenant rate limits.
P9   Versioning per route with major-version bumps for breaking changes.
P10  Per-route OpenTelemetry trace.
```

---

## 5. What Part E does NOT contain

Part E does NOT contain:

- OpenAPI YAML specifications (those will live in `mom/contracts/openapi/`
  when authored; Part E describes them in plain words)
- JSON Schema documents
- Code samples
- Specific implementation language

Part E is the API catalog at the planning level. The OpenAPI specs come
later, as engineering artifacts in the actual code repository.

---

## 6. Reading order within Part E

```
E0  this overview                        (3 min)
E1  Authentication & Identity API        (10 min)
E2  Authority API                        (5 min)
E3  Workflow API                         (12 min)
E4  Record API per Domain                (20 min — references all 14 domains)
E5  Workspace Projection API             (10 min)
E6  Audit API                            (8 min)
E7  Electronic Signature API              (10 min)
E8  Evidence API                         (8 min)
E9  AI Advisory API                      (10 min)
E10 Notification API                     (5 min)
E11 Bulk Operation API                   (8 min)
E12 File Upload / Download API           (8 min)
E13 Long-Running Operation API           (8 min)
E14 Admin API                            (10 min)
E15 Integration API                      (15 min)
```

Total: ~2.5 hours for full Part E absorption.

---

## 7. API ownership

Each API family has a single owner role.

| API family | Owner role |
|---|---|
| E1 Authentication | Identity Lead |
| E2 Authority | Platform Lead |
| E3 Workflow | Workflow Lead (Platform Lead) |
| E4 Record per Domain | Per-domain lead (15 domains) |
| E5 Workspace Projection | Per-domain lead |
| E6 Audit | Compliance Lead |
| E7 E-Signature | Compliance Lead |
| E8 Evidence | Compliance Lead |
| E9 AI Advisory | AI Lead |
| E10 Notification | Platform Lead |
| E11 Bulk | API Lead |
| E12 File Upload | Platform Lead |
| E13 Long-Running | API Lead |
| E14 Admin | Platform Lead |
| E15 Integration | API Lead |

API Lead has reviewer authority across all chapters.

---

## 8. Decision phrase

```
PART_E_OVERVIEW_BASELINE_LOCKED
NEXT: E1_AUTHENTICATION_IDENTITY_API.md
```
