# MDA Definition Of Done

A domain is done only when:

1. PostgreSQL is the authoritative transactional store or a governed bridge is explicitly time-boxed.
2. All governed mutations use command APIs with idempotency, audit, evidence, and outbox.
3. Workflow/status authority is generated from one source.
4. Released records are immutable and history is snapshot-safe.
5. Reconciliation, rollback, and restore evidence exist.
6. Projection surfaces are read-only and re-anchor for mutation.
7. Critical simulations and red-team checks pass.
8. No open P0/P1 controlled gaps remain.
