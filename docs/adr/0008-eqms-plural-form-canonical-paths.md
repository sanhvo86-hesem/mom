# ADR 0008: EQMS plural-form canonical paths

## Status

Accepted (2026-04-25)

## Context

The repo's EQMS controllers use **singular form** REST paths:

- `/api/v1/eqms/ncr` (Nonconformance Report)
- `/api/v1/eqms/capa`
- `/api/v1/eqms/documents`
- `/api/v1/eqms/batch-release`
- `/api/v1/eqms/engineering-change`
- `/api/v1/eqms/training`
- `/api/v1/eqms/iqc` and `/inprocess` (split inspection types)

Step 3 frozen API family tokens use **plural form** (`nonconformance-cases`,
`capas`, `controlled-documents`, `batch-releases`, `engineering-changes`,
`training-records`, `inspections`). These are the canonical paths for
HMV4 frontend integration.

Without alignment, frontend HMV4 slices cannot integrate with live
EQMS backends without per-slice URL rewriting. Renaming the existing
EQMS controller paths would break legacy callers (PHP code,
integrations, third-party tools).

## Decision

Add **plural-form REST aliases** that delegate to existing EQMS
controllers. The singular paths remain available; the plural paths
become the canonical form.

### Aliases (Sprint 1 backend work)

```php
// In mom/api/routes/rest-routes.php

GET    /api/v1/nonconformance-cases               → EqmsNcrController::query
POST   /api/v1/nonconformance-cases               → EqmsNcrController::create
GET    /api/v1/nonconformance-cases/{id}          → EqmsNcrController::detail
... (same pattern for all CRUD + actions)

// Repeat for:
//   /api/v1/capas
//   /api/v1/controlled-documents
//   /api/v1/inspections           (unifies iqc + inprocess)
//   /api/v1/batch-releases
//   /api/v1/engineering-changes
//   /api/v1/training-records
```

Total: ~91 new route registrations across 7 EQMS roots (CRUD + audit +
comments + attachments + relationships + signatures + actions).

### No business logic change

Aliases are pure delegations. No method change in EQMS controllers.
Same response shape, same auth checks, same audit trail.

### Compatibility

| State | Singular path | Plural path |
|---|---|---|
| Today | live | not exists |
| After this ADR | live (kept_as_alias) | live (canonical) |
| Future (post-cutover ADR) | redirect_then_deprecate (301 → plural) | live |

### Inspection unification

The split `/api/v1/mes/quality/iqc` + `/inprocess` consolidates under
`/api/v1/inspections`. The canonical inspection family handles
subtypes (incoming, first_piece, in_process, final, return_to_service)
via a `subtype` query param or path discriminator.

## Consequences

### Positive
- Frontend HMV4 slices can integrate canonical paths
- Legacy callers unaffected
- OpenAPI spec mirrors Step 3 family tokens

### Negative
- Twice as many route registrations to maintain (until deprecation)
- Per-controller method may need slight context adjustment for alias
- Inspection unification requires state machine handling for 5 subtypes

### Neutral
- Future ADR will deprecate singular paths after frontend fully
  migrated to plural

## Alternatives Considered

### Alternative 1: Rename EQMS singular to plural
Direct rename. Rejected: breaks all legacy callers; high blast radius.

### Alternative 2: Frontend uses singular paths
Update Step 3 spec to match implementation. Rejected: violates Step 3
frozen vocabulary; goes against industry convention (REST plural form);
introduces drift from API design rules.

### Alternative 3: API gateway translation
Use a gateway to translate URLs. Rejected: extra infrastructure; latency;
no per-call benefit over PHP-level alias.

## References

- `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md`
- `_reports/module-template-v4/UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md` C1
- `STEP3_API_MASTER.md`
- `mom/api/openapi.yaml` and `mom/api/openapi-eqms-worldclass.yaml`
- ADR 0007 Fixture-first development

## History

- 2026-04-25: Proposed and Accepted
- 2026-MM-DD: (Future) Sprint 1 backend implementation lands
- 2026-MM-DD: (Future) Singular-path deprecation ADR
