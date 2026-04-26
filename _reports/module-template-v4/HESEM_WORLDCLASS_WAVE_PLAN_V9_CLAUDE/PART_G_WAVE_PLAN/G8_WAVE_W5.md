# G8 — Wave W5: Core Transactional ERP / MOM

```
wave_id:        W5
wave_name:      Core Transactional ERP / MOM
predecessor:    W4.5
successor:      W6 (in parallel with W6.5 after partial)
calendar:       8-10 weeks
team_size:      12-14 FTE (multiple parallel streams)
```

---

## 1. Goal

Stage 3 mutation graduation across the core transactional surfaces:
SO, PO, JO, WO, INVTXN, SHIPMENT, INVOICE, COST. Per-mutation ADR
mandatory. Audit chain extended per mutation. Saga compensation tested.

This is where HESEM transitions from read-only platform to
authoritative-write platform.

---

## 2. Entry criteria

W4.5 READY.

---

## 3. Exit criteria

```
[ ] >= 10 transitions at L5 with per-mutation ADR
[ ] Idempotency replay accuracy = 1.00 across all transitions
[ ] If-Match concurrency tested in production-equivalent
[ ] Saga compensation 100% PASS in chaos test (1000-trial)
[ ] Workflow commit p95 < 500 ms
[ ] No silent failure modes
```

---

## 4. Work packages

```
WP-W5-01 SO_CONFIRM, SO_ALLOCATE, SO_CANCEL transitions at L5
WP-W5-02 PO_ISSUE, PO_ACK, PO_RECEIVE transitions at L5
WP-W5-03 JO_RELEASE, JO_COMPLETE, JO_CANCEL at L5
WP-W5-04 WO_DISPATCH, WO_PAUSE, WO_COMPLETE at L5
WP-W5-05 INVTXN_POST, INVTXN_REVERSE at L5
WP-W5-06 Saga compensation framework operational
WP-W5-07 Per-mutation ADR template (per V8 file 04 carry-forward)
```

---

## 5. Decision phrases

```
W5_TRANSACTIONAL_CORE_READY
W5_TRANSACTIONAL_CORE_PASS_WITH_WARNINGS
W5_TRANSACTIONAL_CORE_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G8_WAVE_W5_BASELINE_LOCKED
NEXT: G9_WAVE_W6.md
```
