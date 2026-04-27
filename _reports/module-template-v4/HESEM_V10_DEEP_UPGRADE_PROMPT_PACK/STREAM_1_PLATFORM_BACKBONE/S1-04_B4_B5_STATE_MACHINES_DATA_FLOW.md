# S1-04 — B4 State Machine Network + B5 Data Flow / Lineage

```
prompt_id:        S1-04
stream:           1
sequence:         4 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline:
   PART_B_ARCHITECTURE_MASTER/B4_STATE_MACHINE_NETWORK.md
   PART_B_ARCHITECTURE_MASTER/B5_DATA_FLOW_AND_LINEAGE.md
3. Cross-references:
   B1, B2, B3 (just-upgraded), B6 C1+C2, B7 (deployment),
   D1..D14 (state machines per workflow),
   M3 (roots), M4 (state machine directory)
4. Standards:
   - UML state machine spec
   - Saga + TCC patterns (Garcia-Molina; Pat Helland)
   - Outbox pattern; event-sourcing
   - W3C PROV-DM (data lineage model)
   - ISA-95 functional hierarchy (information flow)
   - 21 CFR Part 11 §11.10(e) audit trail
   - GAMP 5 traceability requirements
```

## Deliverable

Upgrade in place:
```
PART_B_ARCHITECTURE_MASTER/B4_STATE_MACHINE_NETWORK.md
PART_B_ARCHITECTURE_MASTER/B5_DATA_FLOW_AND_LINEAGE.md
```

## Depth requirements — B4 State Machine Network

```
1.  State machine inventory
    All 14 core SMs (SM-1..SM-14 per M4) + all pack-specific
    SMs (≥ 30 per M4). Per SM:
    - Owner domain
    - Tier classification (T1/T2/T3 per H9)
    - Banned-decision touchpoints (per L1)
    - Sub-state hierarchy

2.  Per-SM canonical transition table
    Every SM gets a complete transition table. Per row:
    - source state
    - event (named action)
    - guards (every guard explicit; not "validation passes")
    - target state
    - side-effects (cascade emits)
    - evidence emit (per H4 EC class)
    - SLO target
    - per-pack overlay

    SM-1 Order Lifecycle (already 7 states; expand to 12+ if
    realistic) — full table.
    SM-2 Procurement (6 → 8+) — full table.
    SM-3 Work Order (7 → 10+) — full table.
    SM-4 Inspection Receipt (5 → 8+) — full table.
    SM-5 Disposition (4 → 6+ incl MRB sub-state) — full table.
    SM-6 NC/CAPA (8 → 10+) — full table.
    SM-7 Document Lifecycle (6 → 8+) — full table.
    SM-8 Training Qualification (5 → 7+) — full table.
    SM-9 Maintenance + SM-CALIB — full table.
    SM-10 Batch Release (4 → 6+) — full table.
    SM-11 Recall (5 → 7+) — full table.
    SM-12 Audit Finding (5 → 7+) — full table.
    SM-13 Risk Assessment (4 → 6+) — full table.
    SM-14 Validation Lifecycle (6 → 9+) — full table.

3.  Hard couplings (cascade)
    Every cross-SM cascade documented:
    - Source SM transition
    - Target SM transition triggered
    - Cascade timing (synchronous vs eventual)
    - Cascade failure mode (saga compensation)
    - Cross-tenant prohibition

4.  Soft couplings (advisory)
    Same documentation level.

5.  Saga discipline
    Per multi-SM transaction: TCC pattern; compensation per step;
    saga ledger; saga timeout; manual recovery path.

6.  Banned-decision SMs per L1
    For SM-1, SM-5, SM-6, SM-7, SM-10, SM-11, SM-12, etc.,
    explicit banned-decision touchpoints + L1 §4 triple-defense
    integration.

7.  Per-pack overlay (J1..J5)
    Pack-specific SMs: ≥ 30 (per M4). Brief per-pack list with
    cross-reference to J{N}.

8.  Cross-references: M4 directory; D-workflows; B7 deployment;
    L1 banned decisions; H4 evidence emit.
```

## Depth requirements — B5 Data Flow / Lineage

```
1.  Data lineage model (per W3C PROV-DM)
    - Entities (per M3 roots; per H4 evidence)
    - Activities (state-machine transitions; CDC events)
    - Agents (per E1 identity; per E2 authority)
    - wasGeneratedBy / wasDerivedFrom / wasAttributedTo edges
    - Per-tenant isolation

2.  Data flow path canonical
    Per major data class (authoritative root; evidence; telemetry;
    audit; integration; AI advisory):
    - Source (which actor / system / sensor)
    - Producer service (per L4)
    - Persistence (per L5)
    - CDC (per B8)
    - Projection (per E5)
    - Consumer (per L7 / L6)
    - Cross-region replication (where applic)
    - Cross-tenant boundary

3.  Data classification taxonomy
    - Authoritative (regulated)
    - Authoritative (general)
    - Projection (rebuildable)
    - Telemetry (tiered hot/warm/cold)
    - Audit (immutable; perpetual)
    - PII (tagged; redacted-by-default)
    - PHI (per HIPAA; subset of PII)
    - CUI (per NIST 800-171)
    - ITAR-controlled (per J3)
    - Sub-processor data (per L2 §8 + I8)

4.  Data lineage queries
    - "Which lot fed this batch?" (genealogy upstream)
    - "Which customers received this lot?" (genealogy downstream;
      recall scope per D12)
    - "Who edited this record at time T?" (audit query per E6)
    - "What data fed this advisory?" (AI lineage per L3 §2)
    - "Which approver signed at time T?" (signature query per E7)
    - Per query: SLO target; per E5 / E6 / E8 path

5.  Per-region data residency
    Per B6 C5 + per W13: how data flows respect region pinning;
    cross-region transfer rules; per ITAR / GDPR / Schrems II;
    sub-processor region constraints.

6.  PII flow control
    Per I7 §9: PII tagging; redaction-by-default; pseudonymization;
    erasure interaction with retention (per H5 §6).

7.  Failure modes
    - Lineage gap (regulator-relevant) — per RB-INC-017
    - Cross-region transfer attempt rejection
    - PII redaction failure — per RB-INC-018
    - CDC lineage event loss

8.  KPIs
    - Lineage gap count per period (target zero for regulated)
    - Cross-region transfer attempts blocked
    - PII redaction compliance

9.  Per-pack overlay
    PHARMA: DSCSA + EU FMD lineage
    AUTO: per-VIN lineage
    AERO: AS9120B lot → heat → coil; ITAR
    MD: UDI lineage
    FOOD: §204 KDE/CTE

10. Cross-references: B3 (OTG), B6 C5, B8 (CDC), C8 (trace),
    E6 (audit), I7 §9 (privacy), M3 + M4
```

## Required substance

B4: ≥ 5,000 words (transition tables substantive)
B5: ≥ 3,500 words

## Acceptance criteria

```
B4:
[ ] All 14 core SMs have full transition tables
[ ] ≥ 30 pack-specific SMs cross-referenced (per M4)
[ ] Hard couplings documented per pair
[ ] Soft couplings documented per pair
[ ] Saga discipline spec
[ ] Banned-decision integration per L1 §4
[ ] Per-pack overlay
[ ] All cross-references resolve

B5:
[ ] PROV-DM lineage model
[ ] Data flow path per data class
[ ] Data classification taxonomy
[ ] ≥ 5 lineage query patterns
[ ] Per-region residency spec
[ ] PII flow control
[ ] ≥ 4 failure modes
[ ] ≥ 3 KPIs
[ ] Per-pack overlay
[ ] All cross-references resolve

Both files:
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S1-04_B4_B5_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-05_B6_CROSS_CUTTING.md` next.
