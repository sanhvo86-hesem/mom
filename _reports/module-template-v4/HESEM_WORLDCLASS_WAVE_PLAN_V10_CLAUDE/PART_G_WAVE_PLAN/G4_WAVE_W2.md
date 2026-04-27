# G4 — Wave W2: Governed Record Factory

```
wave_id:        W2
wave_name:      Governed Record Factory
predecessor:    W1
successor:      W3
calendar:       4-8 weeks
team_size:      6-8 FTE
investment:     ~$300K
```

---

## 1. Goal

Build the reusable Authoritative Record Shell (AR) factory: tabbed
shell template (Overview / Detail / History / Activity / Linked /
Evidence / Signatures), audit + evidence + signature placeholder
integration. Every authoritative root gets a consistent record shell.

---

## 2. Entry criteria

```
[ ] W1 READY
[ ] Slice factory operational
[ ] WCAG 2.2 AA gate active
[ ] Per-pack overlay scaffolding present
```

---

## 3. Exit criteria

```
[ ] AR shell template operational (works for new records;
    per F5)
[ ] Audit tab pattern (calls E6.2)
[ ] Evidence tab pattern (calls E8.2)
[ ] Signature tab pattern (calls E7.5)
[ ] Workflow / Activity tab (calls E3.3)
[ ] Linked-records tab pattern
[ ] Master data roots (ITEM, IREV, BOM, ROUTE) reach L4
    (read-only)
[ ] Equipment + MDevice (measurement device) reach L4
[ ] Banner-state pattern (degraded / partial-access / live)
[ ] Per-tenant theme override per ADR-0009 Graphics Authority
```

---

## 4. Work packages

```
WP-W2-01 AR shell template with 7 tabs
WP-W2-02 Audit tab implementation (E6.2 binding)
WP-W2-03 Evidence tab (E8.2 binding)
WP-W2-04 Signature tab (E7.5 binding)
WP-W2-05 Activity tab (E3.3 binding)
WP-W2-06 Linked-records tab pattern
WP-W2-07 Master data roots at L4: ITEM, IREV, BOM, ROUTE
WP-W2-08 Equipment + MDEV at L4
WP-W2-09 Per-tenant theme override per ADR-0009
WP-W2-10 Banner state UI per ADR-0001 + AR pattern
WP-W2-11 Field-level redaction per role + per pack
WP-W2-12 Per-pack overlay sections in AR
```

---

## 5. Quality gates (per I1 W2 cumulative)

```
G-W2-1   AR shell pattern across surfaces
G-W2-2   F11 a11y gate per AR
G-W2-3   Visual regression for AR shell baseline
G-W2-4   Per-pack overlay manifest verified
```

---

## 6. Evidence emitted

```
- AR validation pack (EC-1) IQ + OQ
- Per-master-data root validation (EC-1)
- Banner state UI test (EC-1)
- Per-tenant theme override evidence (EC-22)
```

---

## 7. KPIs

```
- AR render p95 < 250ms (per F5 target)
- Per-tab freshness per E5 §2.10 within target
- F11 a11y compliance per AR (target 0 serious / critical)
- Master data root coverage (target 100% W1 set + extend)
```

---

## 8. Dependencies

```
PRE                              W1 READY
POST                             W3 (workspace projection cutover);
                                W4 (binding deepening); W5 (mutation)
```

---

## 9. Risks

```
R-W2-01 AR shell pattern doesn't generalize across all 95 roots
        Mitigation: per F0 + F5 contract;
        per ADR-0009 design tokens scoped
R-W2-02 Per-tab freshness lag confuses users
        Mitigation: per E5 §2.10 freshness banner;
        per F5 banner state pattern
R-W2-03 Per-tenant theme override bypasses Graphics Authority
        Mitigation: per ADR-0009 CI gate;
        validation pack VP-graphics-authority
R-W2-04 Field-level redaction per role broken by AR refactor
        Mitigation: per B6 + I7 §9; per-AR test
```

---

## 10. Per-pack overlay

```
PHARMA J1                        AR overlay sections for EBR /
                                 APR / Stability / Deviation
                                 (preview)
AUTO J2                          PPAP element AR sections
AERO J3                          FAI characteristic AR sections
MD J4                            DHF AR sections
FOOD J5                          HACCP plan AR sections
```

---

## 11. Decision phrases

```
W2_RECORD_FACTORY_READY
W2_RECORD_FACTORY_PASS_WITH_WARNINGS
W2_RECORD_FACTORY_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- F0 + F5 — pattern catalog + AR shell
- F11 — accessibility
- E3 + E5 + E6 + E7 + E8 — APIs bound
- M3 — root catalog
- M5 — SLOs
- I1 — wave gates

---

## 13. Decision phrase

```
G4_WAVE_W2_BASELINE_LOCKED
NEXT: G5_WAVE_W3.md
```
