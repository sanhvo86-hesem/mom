# S1-02 — B2 Authority Ledger (Deep Upgrade)

```
prompt_id:        S1-02
stream:           1
sequence:         2 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline:
   PART_B_ARCHITECTURE_MASTER/B2_AUTHORITY_MODEL.md
3. V9 cross-reference (read for context):
   PART_B_ARCHITECTURE_MASTER/B1_LAYERED_ARCHITECTURE.md (just-
     upgraded by S1-01)
   PART_B_ARCHITECTURE_MASTER/B6_CROSS_CUTTING_CONCERNS.md
   PART_E_API_CATALOG/E2_AUTHORITY_API.md
   PART_L_AI_DISCIPLINE/L1_HUMAN_AUTHORITY_BOUNDARY.md
   PART_M_REFERENCE/M3_ROOT_CATALOG.md
4. Standards:
   - 21 CFR Part 11 §11.10(c) record protection +
     §11.70 record-signature linking + §11.10(j) accountability
   - EU GMP Annex 11 §10 change control + §14 e-sig
   - NIST SP 800-162 ABAC; OASIS XACML
   - NIST SP 800-63 IAL/AAL identity proofing
   - 5-eyes / quorum patterns in regulated industries
   - Hash-chain + Merkle anchoring patterns
   - RFC 3161 timestamp protocol
```

## Deliverable

Upgrade in place:
```
_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
  PART_B_ARCHITECTURE_MASTER/B2_AUTHORITY_MODEL.md
```

## Depth requirements

The Authority Ledger is the substrate that proves WHO has authority
to do WHAT under WHICH conditions, and that every change to that
authority is recorded immutably. This chapter must spec it
end-to-end.

```
1.  Authority Ledger entity model (full schema in prose)
    - Authority Entry record fields (entry_id, scope, authority
      class, allow-list of actions, quorum policy, banned-decision
      flag, state-machine ref, effective_from, effective_to,
      supersession_ref, signers, signature_chain_hash, prior_entry
      ref, anchor_at, axiom_status_hash, revision counter, ...)
    - Per-field: semantic, constraint, PII flag, audit visibility
    - Indices: which lookup paths are hot; expected cardinality
    - Per-tenant partitioning model

2.  Authority class taxonomy
    Enumerate each authority class:
    - Tier-1 (regulated; banned-decision-touching)
    - Tier-2 (regulated; not banned-touching)
    - Tier-3 (advisory-mutation eligible by AI)
    - Tier-4 (system / automation)
    - Tier-5 (informational)
    Per class: who may assert; what guarantees; what proof bar;
    what evidence emit; what retention floor.

3.  Authority Ledger lifecycle
    Per state-machine transition (draft → reviewed → approved →
    effective → superseded → withdrawn → archived):
    state | event | guard | target | side-effect | evidence

4.  Quorum policy specification
    For every banned-decision (BD-1..BD-N + per-pack extensions
    per L1 §3), the quorum policy:
    - Roles required (at least one per role; or specific N)
    - AAL minimum per role (per NIST 800-63)
    - Hardware-token requirement (per ITAR / CMMC)
    - Reason-text minimum length per signer
    - Signature-binding hash algorithm
    - Cross-tenant prohibition

5.  Authority decision algorithm (E2.8 substrate)
    Pseudo-code in prose for the decide function:
    - Resolve identity → roles
    - Resolve action → required authority class
    - Resolve context (tenant, geo, time, device, pack)
    - Match identity ⇒ allow-list ⇒ deny / allow / needs-quorum
      / needs-step-up
    - Banned-decision pre-check (AI principal denied)
    - Cache decision with TTL + invalidation event
    - Emit access_audit (per H4)
    Edge cases (nested delegation; emergency over-ride; tenant-
    config-below-floor rejection; sub-processor boundary).

6.  Identity-to-authority binding
    How a user identity (per E1) becomes an authority assertion:
    - Per-tenant role assignment lifecycle
    - Per-attribute (device-posture; geo; time-of-day) ABAC
    - Per-AAL elevation
    - Person-of-record (ITAR) verification
    - Sub-processor service principals (per L2 §8)
    - Delegation rules (and what is non-delegable: banned set)

7.  Anchoring + integrity
    - Per-entry signature: signer + algorithm + key rotation
    - Per-entry hash chain: predecessor reference;
      monotonic continuity
    - Daily merkle anchor: scope; cron; failure = SLO-10 burn
    - RFC 3161 external timestamp (where regulated tenant)
    - External witness attestation (where contracted)
    - Re-anchor procedure on integrity violation
    - Cross-region anchor consistency (per W13)

8.  Tenant boundary
    - Cross-tenant authority queries forbidden (per B6 C5)
    - Per-tenant authority partitioning
    - Vendor-side authority (HESEM platform-wide; per E2.7
      system endpoint)

9.  Authority Ledger interaction with state machines
    For each Part-B state machine (SM-1..SM-14 + pack-specific
    per M4), how authority is consulted at each transition:
    - Pre-transition decide call
    - Quorum gathering during transition (where multi-sig)
    - Post-transition evidence emit
    - Cascade to dependent SMs

10. Authority Ledger interaction with audit chain (B6 C1)
    Every authority change is itself an audit event;
    audit chain anchors authority changes;
    cross-link mechanism

11. Authority Ledger interaction with OTG axioms (B6 C2)
    Which axioms enforce authority discipline:
    - Banned-decision principal axiom
    - Quorum sufficiency axiom
    - Self-signoff prevention axiom
    - Tenant boundary axiom
    Each axiom: definition; check expression in prose; failure
    behavior; daily verification.

12. Authority API integration (cross-link E2)
    The 10 endpoints in E2 each call into the Authority Ledger.
    Specify the exact integration per endpoint.

13. Failure modes catalog
    Concrete failures with concrete recovery:
    - Active entry not found (404)
    - Signature verify fails (SEV-1; per RB-INC-005)
    - Cross-tenant attempt (SEV-1; per B6 C5)
    - Banned-decision attempt (per L1 §4 triple defense)
    - Cache stale during supersession
    - Quorum policy below regulator floor
    - Anchor missed > 25h (per SLO-10)
    - PQC migration mid-flight key rotation
    - Sub-processor authority service outage

14. KPIs
    - decide() p95 latency (target SLO-1 < 20ms)
    - Active entry coverage (95 roots; per M3)
    - Authority change frequency
    - Cross-tenant attempt count (target 0; per SLO-19)
    - Banned-decision attempt count (target 0; per SLO-22)
    - Anchor lag (per SLO-10)

15. Per-pack overlay
    PHARMA: QP / Designated Person extensions; per BD-9..BD-12
    AUTO: per-OEM CSR signoff overlay; per BD-17..BD-19
    AERO: ITAR person-of-record; FIPS 140-3; per BD-20..BD-25
    MD: PRRC + AR + Importer; per BD-13..BD-16
    FOOD: PCQI + Process Authority; per BD-26..BD-28

16. Cross-references inter-Part
    Required: A4, B1, B6 C1+C2+C5, B7, E2, E7, H1 §4, H4, L1,
    L4 §5, M3, M5

17. Decision phrase
```

## Anti-patterns (forbidden)

Same as Stream 1 master + specifically:
- "The Authority Ledger ensures security..." (definitional fluff)
- ASCII diagram of an entry without prose substance
- "Two-person e-sig is required" (without specifying
  WHICH two persons; FROM which set; UNDER which conditions)
- Treating "authority" and "authentication" as the same
- Skipping any banned-decision (BD-1..BD-N must each be addressed)

## Required substance

Minimum 6,000 words substantive output. Authority Ledger is the
single most-cited substrate in V10 — depth must reflect this.

## Cross-references that MUST appear

```
B1 §3 (layer L2 Authority);
B6 C1 (audit chain);
B6 C2 (OTG axioms);
B6 C5 (tenant boundary);
B7 (state-machine network);
E2 §2.1..§2.10;
E7 §2.5 (history) + §2.8 (revoke);
H1 §4 (clauses 21 CFR 11.10(c)/(e)/(g)/(j); Annex 11 §10/§14);
H4 EC-22 (access_audit) + EC-2 (signature) + EC-16 (change);
L1 §1 banned decisions; §3 pack extensions; §4 triple defense;
L4 §5 ledger;
M3 root catalog (95 roots; each with authority class);
M5 SLO-1 + SLO-10 + SLO-19 + SLO-22
```

## Acceptance criteria

```
[ ] Entity schema with every field documented
[ ] ≥ 5 authority classes enumerated with concrete proof bar
[ ] Lifecycle SM with full transition table
[ ] Quorum policy spec for every BD-1..BD-N + pack extensions
[ ] decide() algorithm in concrete pseudo-prose
[ ] Identity-to-authority binding spec
[ ] Anchoring + integrity spec (signature + hash chain + merkle
    + RFC 3161 + cross-region)
[ ] Tenant boundary discipline
[ ] Authority interaction with all 14 SMs (per M4)
[ ] Authority interaction with audit chain (B6 C1)
[ ] Authority interaction with OTG axioms (B6 C2)
[ ] Authority API integration (cross-link E2 endpoints)
[ ] ≥ 9 concrete failure modes with concrete recovery
[ ] ≥ 6 KPIs with concrete targets
[ ] Per-pack overlay (J1..J5 callouts)
[ ] All cross-references resolve to real chapters
[ ] Decision phrase emitted
[ ] Length ≥ 6,000 words
[ ] No marketing language
```

## Output

Write back to:
`_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/PART_B_ARCHITECTURE_MASTER/B2_AUTHORITY_MODEL.md`

## Decision phrase upon completion

```
S1-02_B2_AUTHORITY_LEDGER_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-03_B3_OPERATIONAL_TRUTH_GRAPH.md` next.
