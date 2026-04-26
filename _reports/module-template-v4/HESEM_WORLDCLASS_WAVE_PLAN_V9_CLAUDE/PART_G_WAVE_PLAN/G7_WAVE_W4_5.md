# G7 — Wave W4.5: Operational Truth Graph Native Cutover

```
wave_id:        W4.5
wave_name:      OTG Native Cutover
predecessor:    W4
successor:      W5
calendar:       3-4 weeks
team_size:      8-9 FTE
```

---

## 1. Goal

Turn the OTG from a shadow data store into the canonical reporting
source. Workspace projections begin serving from OTG-derived materialized
views (B5). Audit chain anchored daily. Integrity job zero-violation
nights.

---

## 2. Entry criteria

W4 READY.

---

## 3. Exit criteria

```
[ ] CDC pipeline live (Postgres logical decoding)
[ ] OTG event lag p95 < 5 seconds
[ ] All 7 mandatory materialized views populated (B3)
[ ] Drift = 0 across all materialized views
[ ] Integrity job (axioms A1-A18) zero violations 7 consecutive nights
[ ] Audit chain anchor cron 7 consecutive nights PASS
[ ] All workspaces serve from OTG projection (not direct queries)
```

---

## 4. Work packages

```
WP-W4.5-01 CDC consumer service (Postgres pgoutput)
WP-W4.5-02 Materialized view registry + refresh strategy
WP-W4.5-03 Workspace projection cutover (each workspace switches from
            direct query to projection)
WP-W4.5-04 Audit chain anchor cron operational with 7-day clean window
WP-W4.5-05 Integrity job axioms A1-A18 nightly
WP-W4.5-06 RFC 3161 timestamping connector (optional; pilot for one
            regulated tenant)
```

---

## 5. Decision phrases

```
W4_5_OTG_NATIVE_READY
W4_5_OTG_NATIVE_PASS_WITH_WARNINGS
W4_5_OTG_NATIVE_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G7_WAVE_W4_5_BASELINE_LOCKED
NEXT: G8_WAVE_W5.md
```
