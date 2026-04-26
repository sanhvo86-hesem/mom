# G4 — Wave W2: Governed Record Factory

```
wave_id:        W2
wave_name:      Governed Record Factory
predecessor:    W1
successor:      W3
calendar:       4-8 weeks
team_size:      6-8 FTE
```

---

## 1. Goal

Build the reusable Authoritative Record Shell (AR) factory: tabbed
shell template (Overview, Detail, History, Activity, Linked, Evidence,
Signatures), audit / evidence / signature placeholder integration. With
this, every authoritative root gets a consistent record shell.

---

## 2. Entry criteria

W1 READY.

---

## 3. Exit criteria

```
[ ] AR shell template operational (works for new records)
[ ] Audit tab pattern (calls E6.2 Audit API)
[ ] Evidence tab pattern (calls E8.2 Evidence API)
[ ] Signature tab pattern (calls E7.5 Signature history)
[ ] Workflow / Activity tab (calls E3.3 Transition history)
[ ] Linked records tab pattern
[ ] Master data roots (ITEM, IREV, BOM, ROUTE) reach L4 (read-only)
[ ] Equipment, MDEV (measurement device) reach L4
```

---

## 4. Work packages

```
WP-W2-01 AR shell template with tabs
WP-W2-02 Audit tab implementation
WP-W2-03 Evidence tab implementation
WP-W2-04 Signature tab implementation
WP-W2-05 Activity tab implementation
WP-W2-06 Linked-records tab pattern
WP-W2-07 Master data roots (ITEM, IREV, BOM, ROUTE) at L4
WP-W2-08 Equipment + MDEV at L4
WP-W2-09 Per-tenant theme override for AR (graphics authority)
```

---

## 5. Decision phrases

```
W2_RECORD_FACTORY_READY
W2_RECORD_FACTORY_PASS_WITH_WARNINGS
W2_RECORD_FACTORY_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G4_WAVE_W2_BASELINE_LOCKED
NEXT: G5_WAVE_W3.md
```
