# M2 — Domain Models

```
chapter_purpose: index of all 14 bounded contexts and their authoritative roots
owner_role:      Domain Leads (one per domain) with Plan Editor
```

---

## 1. Domain map

```
1   Commercial               C1   Quote, Customer Order, Forecast
2   Engineering              C2   Item, BOM, Routing, Spec, ECO
3   Planning                 C3   MPS, MRP, Demand, Schedule
4   Procurement              C4   PO, Supplier, Inspection, RTV
5   Inventory                C5   Item, Lot, Bin, Move, Adjustment
6   Shopfloor / MES          C6   WO, Operation, Dispatch, Yield
7   Quality / eQMS           C7   NC, CAPA, Doc, Audit, Inspection
8   Traceability             C8   Lot Genealogy, Serial, Genealogy Chain
9   Maintenance              C9   Asset, MWO, PM, Calibration
10  Workforce                C10  Person, Skill, Training, Schedule
11  Finance                  C11  Cost Center, GL, Cost Roll
12  Integration              C12  Connector, Event, Subscription
13  Analytics / AI           C13  KPI, Score, Advisory, Model
14  Core Platform            C14  Tenant, Role, Identity, Audit
```

---

## 2. Bounded context rules

- **Single ownership**: each authoritative root is owned by exactly
  one domain. Cross-domain reads pass through APIs (per E0..E15).
- **No shared mutable state**: domains do not write into each other's
  tables; they emit events.
- **Reference data is replicated**: read-only mirrors of cross-domain
  reference data (e.g. Item across Engineering, Inventory, Procurement)
  are synced via CDC (per B8).

---

## 3. Cross-domain shared concepts

```
Item               authored in Engineering (C2); referenced everywhere
Lot                authored in Inventory (C5); referenced in MES, Quality, Trace
Person             authored in Workforce (C10); referenced everywhere for sigs
Tenant             authored in Core (C14); referenced for isolation
Cost Center        authored in Finance (C11); referenced for cost roll-ups
```

---

## 4. Decision phrase

```
M2_DOMAIN_MODELS_BASELINE_LOCKED
NEXT: M3_ROOT_CATALOG.md
```
