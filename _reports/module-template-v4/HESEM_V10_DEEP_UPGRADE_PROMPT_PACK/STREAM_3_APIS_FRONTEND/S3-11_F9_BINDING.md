# S3-11 — F9 Frontend↔Backend Binding (Standalone)

```
prompt_id: S3-11    stream: 3    sequence: 11 of 12    effort: ~80 min
```

## Pre-flight reading

```
1. S3-00 stream master
2. V9: F9_FRONTEND_BACKEND_BINDING.md
3. Cross-refs: All F0..F12; All E0..E15; ADR-0001 (pre-prod);
   ADR-0004 (forbidden files); ADR-0009 (Graphics Authority)
4. Standards: OpenAPI 3.1.1; AsyncAPI 3.0; CloudEvents 1.0;
   RFC 9457; HTTP semantics; WebSocket / SSE; ETag concurrency;
   HMV4 v4 fixture-mode discipline (per ADR-0004)
```

## Deliverable

```
PART_F_FRONTEND_CATALOG/F9_FRONTEND_BACKEND_BINDING.md
```

## Depth requirements

F9 is the substrate for every UI surface ↔ API contract. Spec
exhaustively:

```
1.  Per-pattern (SH/DL/ML/WS/AR/AC/Drawer/Wizard) backend
    binding contract:
    - Read paths (per E4 / E5 / E6 / E8)
    - Mutation paths (per E3 + per E7)
    - Subscription (per E5 §2.4 / per E15 §2.16)
    - LRO (per E13)
    - Bulk (per E11)
    - File (per E12)
    - AI advisory (per E9)
    - Notification (per E10)
    - Authority decision (per E2.8)

2.  Live mode vs fixture mode discipline (per ADR-0001 +
    ADR-0004)
    - Per-tenant feature flag HMV4_LIVE_API_<ROOT> (default off)
    - Per-route fixture adapter
    - Live-mode routing
    - Banner state propagation

3.  Per-tab freshness binding (per E5 §2.10 HEAD)
4.  Per-event subscription binding (CloudEvents 1.0 envelope;
    AsyncAPI 3.0 channel def)
5.  Concurrency UI flow (ETag mismatch → re-load → re-edit)
6.  Idempotency UI flow (per-mutation key generation; replay
    detection)
7.  Problem-detail UI rendering (per RFC 9457; cause chain;
    suggested action; retry where applic)
8.  AI advisory UI binding (per L1 §10 communication; per L2
    §6 confidence threshold; override capture per L1 §5)
9.  Authority decision UI (per E2.8 → button-enable / disable;
    per L1 banned-decision UI never offers AI auto-commit)
10. E-sig UI flow (per E7; manifestation per regulator + per
    language; binding per 21 CFR 11.70; multi-sig per quorum)
11. Cross-region UI (per region pinning; per-tenant customer
    portal variant)
12. Per-pack overlay binding (J1..J5 per pack)
13. Auditor / inspector portal scoping (per H3 §7)
14. Customer portal binding (CVLP per H2 §14)
15. Edge gateway local UI binding (per L9 OT layer)
16. Failure modes per binding pattern
17. KPIs (binding latency; per-pattern success rate)
```

## Required substance

≥ 7,000 words.

## Acceptance criteria

```
[ ] All 8 patterns × all 16 API families = matrix documented
[ ] Live vs fixture mode discipline per ADR-0001 + ADR-0004
[ ] All 17 binding aspects substantive
[ ] Per-pack overlay
[ ] Auditor + customer portal binding
[ ] Edge gateway L9 binding
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S3-11_F9_BINDING_DEEP_UPGRADE_COMPLETE
```

After: load `S3-12_F10_F11_F12.md`.
