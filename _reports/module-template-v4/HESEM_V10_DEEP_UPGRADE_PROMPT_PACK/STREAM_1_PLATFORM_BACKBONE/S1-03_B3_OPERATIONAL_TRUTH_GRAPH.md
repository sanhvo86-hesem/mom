# S1-03 — B3 Operational Truth Graph (Deep Upgrade)

```
prompt_id:        S1-03
stream:           1
sequence:         3 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline:
   PART_B_ARCHITECTURE_MASTER/B3_OPERATIONAL_TRUTH_GRAPH.md
3. V9 cross-references:
   B1, B2 (just-upgraded), B6 C2, B7, B8, M2, M3
4. Standards / patterns:
   - Event sourcing + CQRS
   - Outbox pattern
   - Materialized view discipline
   - W3C RDF / SHACL (for predicate vocabulary inspiration)
   - Datalog rule formalisms (for axiom expression)
   - Saga + TCC patterns
   - 21 CFR 11.10(b) accurate copies + (c) record protection
   - EU GMP Annex 11 §9 audit trails
```

## Deliverable

Upgrade in place:
```
PART_B_ARCHITECTURE_MASTER/B3_OPERATIONAL_TRUTH_GRAPH.md
```

## Depth requirements

The OTG is the relational substrate that joins authoritative roots
into a navigable graph. Per state machine + per workflow + per
recall + per audit query, OTG is consulted. Spec it end-to-end.

```
1.  OTG conceptual model
    - Nodes (per M3 root catalog; per resource family)
    - Edges (per relationship kind; directional)
    - Events (immutable; append-only; per transition)
    - Properties on nodes / edges
    - Per-tenant partitioning

2.  Predicate catalog (≥ 22 predicates)
    Each predicate documented:
    - Name (e.g., AUTHORED_BY; CONSUMED_LOT; SIGNED_BY;
      DISPOSITIONED_AS; RELEASED_BY; LINKS_PARENT_TO_CHILD;
      etc.)
    - Domain (subject node kind)
    - Range (object node kind)
    - Cardinality (1:1, 1:N, M:N)
    - Mutability (append-only vs once-only)
    - Tenant scope (always per-tenant)
    - Audit visibility
    - PII flag (where edges encode personal data)

3.  Axiom catalog (≥ 18 axioms)
    Each axiom documented:
    - ID (A1..A18+)
    - Name (e.g., NO_SELF_SIGN; NO_FUTURE_DATING;
      EVIDENCE_COMPOSITION_COMPLETE; NO_CYCLE_IN_GENEALOGY;
      QUORUM_SUFFICIENT; AI_NOT_BANNED_PRINCIPAL; etc.)
    - Formal statement (in prose; not formal-logic)
    - Why it matters (which regulator concern; which failure
      mode prevented)
    - When checked (at write; at read; at daily reconciliation)
    - Failure behavior (reject write; flag for review;
      SEV-1 incident)
    - Daily verification job + audit emit
    - Recovery path on detected violation
    - Cross-reference to L1 §4 if banned-decision related

4.  Materialized views catalog (≥ 7 mandatory MVs)
    Each MV:
    - View name
    - Source predicates / events
    - Refresh strategy (on-write CDC; periodic; on-demand)
    - Freshness SLO (SLO-5 < 5s)
    - Consumers (per workspace per F4)
    - Replay procedure (per RB-INC-001)
    - Per-tenant + per-region partitioning

5.  CDC integration (per B8)
    - Postgres pgoutput config
    - Outbox pattern for cross-service events
    - At-least-once delivery + consumer idempotency
    - Per-tenant routing
    - Cross-region replication

6.  Genealogy depth queries
    - Lot genealogy depth N (target depth 20 query < 1s)
    - Cycle prevention axiom (A14)
    - Multi-parent / multi-child relationships
    - Recall scope identification (forward + backward walk)

7.  Authority + signature anchoring
    - Per OTG event: signature reference (per E7)
    - Hash chain per node (predecessor → successor)
    - Daily merkle anchor (per B6 C1)

8.  Tenant boundary
    - OTG events tagged with tenant_id
    - Cross-tenant query rejected
    - Vendor-side OTG (platform telemetry; cross-tenant
      aggregation only at L8)

9.  Schema evolution
    - Adding predicate = H7 Class B
    - Adding axiom = H7 Class A (regulated impact)
    - Removing axiom (rare) = H7 Class A + Compliance signoff
    - Predicate cardinality change = H7 Class A
    - Backward compatibility (old events still valid; new
      consumers handle missing edges)

10. Performance
    - Write path: 1 transaction inserts node/edge/event +
      anchors hash; target < 50ms
    - Read path: per-MV; depth-N query target < 1s for N=20
    - Cardinality at scale: per M3 root catalog × per tenant ×
      lifecycle (estimate per M3 + I5)

11. Storage
    - Postgres relational (event + node + edge tables)
    - Optional graph view (read-only; via view layer)
    - WORM for regulated events (per H5)
    - Partitioning per tenant + per time window
    - Archival tier (per H5 retention)

12. Cross-region operations (per W13)
    - Anchor consistency across regions
    - Conflict resolution per saga
    - Per-region latency budget

13. Replay tooling
    - Replay from anchor checkpoint to rebuild MV
    - Replay scope (single MV; cross-MV; per tenant)
    - Replay timing per MV (target hours)

14. Failure modes
    - Axiom violation in production (SEV-1; RB-INC-005)
    - Anchor missed > 25h (SEV-1; RB-INC-004)
    - CDC consumer crash (RB-INC-001)
    - Predicate version mismatch
    - Cross-region split-brain (RB-DR-012)
    - Replay tool corruption

15. KPIs
    - SLO-5 freshness < 5s
    - SLO-6 axiom violations = 0 / 7d
    - SLO-10 anchor lag < 25h
    - SLO-13 CDC lag < 60s
    - Genealogy depth-20 query p95 < 1s
    - Per-tenant cross-tenant attempt = 0 / year (per SLO-19)

16. Per-pack overlay
    PHARMA: DSCSA partner exchange events; EU FMD pack-level
    AUTO: per-VIN traceability events; per-OEM EDI events
    AERO: AS9120B traceability lot → heat → coil edges;
          ITAR-segregated regions
    MD: UDI events; SOUP register events
    FOOD: §204 KDE/CTE events; sanitary transport events

17. Cross-references inter-Part
    A1, B1 §5 (L5), B2, B6 C1+C2+C5, B7 (state machines as OTG
    drivers), B8 (CDC), C8 (traceability), D11, E5 (workspace
    projection consumer), E6 (audit), H1 §4, H4, M3, M4, M5

18. Decision phrase
```

## Required substance

≥ 5,500 words. OTG is among the most-cited platform substrates;
depth must reflect this.

## Acceptance criteria

```
[ ] Entity model documented (nodes / edges / events / properties)
[ ] ≥ 22 predicates enumerated; each fully documented
[ ] ≥ 18 axioms enumerated; each fully documented
[ ] ≥ 7 mandatory MVs with refresh strategy
[ ] CDC integration (per B8)
[ ] Genealogy depth queries spec
[ ] Authority + signature anchoring spec
[ ] Tenant boundary discipline
[ ] Schema evolution governance
[ ] Performance targets per write/read
[ ] Storage strategy
[ ] Cross-region (W13)
[ ] Replay tooling
[ ] ≥ 8 failure modes with concrete recovery
[ ] ≥ 6 KPIs with concrete targets
[ ] Per-pack overlay
[ ] All cross-references resolve
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S1-03_B3_OPERATIONAL_TRUTH_GRAPH_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-04_B4_B5_STATE_MACHINES_DATA_FLOW.md` next.
