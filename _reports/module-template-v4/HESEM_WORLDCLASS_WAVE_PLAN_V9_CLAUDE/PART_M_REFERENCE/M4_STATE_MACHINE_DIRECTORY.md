# M4 — State Machine Directory

```
chapter_purpose: index of all 14 state machines, their states, transitions, couplings
owner_role:      Plan Editor with Domain Leads (per affected domain)
```

The 14 state machines that govern HESEM-regulated transitions. Defined
in B7 (architecture); cited from D1..D14 (workflows). Couplings are
hard (cascade) or soft (advisory). Tier-3 (regulated) decisions require
human approval (per L1).

---

## 1. State machine summary table

```
SM     Name                       Owner Domain    Workflow    States  Tier
SM-1   Order Lifecycle            Commercial      D1          7       Tier-2
SM-2   Procurement Lifecycle      Procurement     D2          6       Tier-2
SM-3   Work Order Lifecycle       Shopfloor       D3          7       Tier-2
SM-4   Inspection Receipt         Quality         D4          5       Tier-2
SM-5   Disposition Decision       Quality         D5          4       Tier-3
SM-6   NC / CAPA Lifecycle        Quality         D6          8       Tier-3
SM-7   Document Lifecycle         Quality         D7          6       Tier-3
SM-8   Training Qualification     Workforce       D8          5       Tier-2
SM-9   Maintenance Order          Maintenance     D9          6       Tier-2
SM-10  Batch Release              Quality         D10         4       Tier-3
SM-11  Recall                     Quality         D12         5       Tier-3
SM-12  Audit Finding              Quality         D13         5       Tier-2
SM-13  Risk Assessment            Quality         H9          4       Tier-3
SM-14  Validation Lifecycle       Quality         D14         6       Tier-3
```

---

## 2. Hard couplings (cascade)

```
SM-1 → SM-3        order release dispatches work orders
SM-3 → SM-4        WO complete triggers final inspection
SM-4 → SM-5        inspection result drives disposition
SM-5 → SM-6        non-acceptance opens NC case
SM-6 → SM-12       findings can spawn audit follow-up
SM-7 → SM-1        doc effectivity gates order release
SM-8 → SM-3        person training gates WO sign-off
SM-9 → SM-3        asset down blocks dependent WO
SM-10 → SM-1       batch release gates customer shipment
SM-11 → SM-12      recall produces formal audit finding
SM-13 → SM-14      risk decision drives validation depth
SM-14 → SM-7       validation status gates doc effectivity
```

---

## 3. Soft couplings (advisory)

```
SM-3 → SM-9        WO yield drop suggests asset PM
SM-4 → SM-2        receipt rejects affect supplier scorecard
SM-6 → SM-9        repeat NCs suggest PM cycle change
SM-12 → SM-7       audit finding may trigger doc revision
```

---

## 4. State machine reference (B7 contains full transition tables)

This chapter is an index. Full state-by-state transition tables, guard
conditions, and event payload schemas live in:
- B7 §3 (transition tables)
- D1..D14 (workflow narratives)

---

## 5. Decision phrase

```
M4_STATE_MACHINE_DIRECTORY_BASELINE_LOCKED
NEXT: M5_SLO_DIRECTORY.md
```
