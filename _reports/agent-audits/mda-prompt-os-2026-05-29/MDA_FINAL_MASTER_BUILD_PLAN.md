# MDA Final Master Build Plan

## Architecture

The platform converges on PostgreSQL authority, domain command mutation, generated workflow/status authority, append-only audit/evidence/outbox, frozen execution snapshots, and projection-only workspaces.

## Delivery waves

1. Wave 0: authority freeze, generic CRUD hard stop, status authority generator, drift tooling.
2. Wave 1: party, identity link, item, item revision, site/spec backbone.
3. Wave 2: equipment, tooling, qualification, signal trust model.
4. Wave 3: engineering release package and package member immutability.
5. Wave 4: command/API envelope, idempotency, outbox, problem details, audit/e-sign spine.
6. Wave 5: quality holds, inventory ledger, genealogy, MES readiness and execution gates.
7. Wave 6: migration cutover by domain with rehearsed rollback.
8. Wave 7: observability, simulation automation, red-team closure.

## Non-negotiables

- no hidden authority
- no direct balance mutation
- no direct status patch
- no AI autonomous governed action
- no `POSTGRES_ONLY` switch without restore drill and zero blocker drift
