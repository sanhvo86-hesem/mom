# MDA Authority Constitution

## Binding rules

1. PostgreSQL is the target transactional authority for governed master data, engineering definition, execution, quality, inventory, finance, and genealogy.
2. Domain command services are the only allowed mutation authority for governed lifecycle changes.
3. Generic CRUD may remain for read support and tightly controlled backfill only. It is not business authority.
4. JSON may exist only as `JSON_ONLY`, `SHADOW_WRITE`, `POSTGRES_PRIMARY`, import/export, cache, or legacy compatibility. JSON primary cannot be described as enterprise-ready.
5. Workflow/status values must come from a single canonical workflow/status authority. Schema presence alone is not evidence of runtime authority.
6. Released objects are immutable. Post-release changes require change control, revision, effectivity, or supersession.
7. Execution transactions must snapshot released master data and engineering records rather than re-reading mutable master records at completion time.
8. Every governed command requires idempotency, transaction boundary, audit trail, evidence hooks, deterministic error model, and outbox/event strategy.
9. e-signature is valid only when signer identity, timestamp, meaning, record binding, and SoD/re-auth checks are explicit.
10. AI, dashboards, registries, schema studio, workspace files, and generated artifacts are projections or design aids, never hidden mutation authority.

## No-guess policy

- Missing repo evidence must be recorded as `CONTROLLED_GAP`.
- Inference must be tagged and accompanied by verification action.
- Hidden authority, direct governed mutation, released-data mutability, or projection mutation forces `REPAIR_REQUIRED` or `BLOCKED_NO_GUESS`.

## Current constitutional reading of the repo

- `DataLayer` exposes migration modes, but many business paths still bypass it.
- `MasterDataService` is repository-bound yet defaults to `JsonMasterDataRepository`.
- `GenericCrudController` now blocks many governed mutations, but it is still a mitigation layer rather than a command-platform replacement.
- UOM/UOM conversion schema exists, but the current master-data runtime chain does not yet treat it as a governed operational authority slice.

