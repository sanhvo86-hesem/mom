# P03 Adversarial Critique

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

## Critique

- Metrologist: The repair does not prove category formulas. It only ensures the right rule version and effective window can be selected. P05 must validate affine/log/contextual categories.
- MES architect: `contextHash` is present in the cache key, but caller propagation is optional today. P08/P12 must supply meaningful context hashes for density/packaging/site policy.
- eQMS auditor: Approval evidence now reads the right rule version but manifest human approval remains weak. P04 must close that before any regulated claim.
- Security engineer: Cache invalidation deletes deterministic no-context current-date keys, not every possible as-of/context key. That is acceptable for P03 with TTL risk logged, but P13 should design stronger invalidation.
- Data migration lead: Historical replay now has better `asOf` support, but no historical backfill should use it until P15 classifies source evidence.
- UI accessibility reviewer: UI still calls live API; P11 must keep workspace projection safe.
- SRE: v5 cache key is stronger, but Redis key pattern delete is still absent. P13 must assess multi-node invalidation.
- Customer implementation lead: Legacy `approved` remains supported. This is deliberate compatibility, not target-state approval policy.

## Decision

No additional P03 repair is required before P04. Remaining critiques are outside P03 scope and tracked.
