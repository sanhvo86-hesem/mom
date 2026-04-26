# M3 — Root Catalog

```
chapter_purpose: every authoritative root listed once with owner + state machine
owner_role:      Plan Editor with Domain Leads
```

The 95 authoritative roots distributed across the 14 domains. Each
root has a single owning domain and (where applicable) a state
machine reference (per M4).

---

## 1. Wave 1 roots (18) — HMV4 program

```
DISP    Dispatch Board                   Shopfloor      WS pattern
NQCASE  Nonconformance Case              Quality        AR pattern, SM-6
TRAIN   Training Matrix                  Workforce      WS pattern
CAPA    Corrective/Preventive Action     Quality        AR, SM-6
CDOC    Controlled Document              Quality        AR, SM-7
INSP    Inspection                       Quality        AR, SM-4 / SM-5
BREL    Batch Release                    Quality        AR, SM-10
ECO     Engineering Change Order         Engineering    AR, SM-7
JO      Job Order                        Shopfloor      AR, SM-1
SO      Sales Order                      Commercial     AR, SM-1
WO      Work Order                       Shopfloor      AR, SM-3
CPO     Customer PO                      Commercial     AR, SM-1
PO      Purchase Order                   Procurement    AR, SM-2
QUO     Quote                            Commercial     AR
PREC    Procurement Receipt              Procurement    AR, SM-4
LOT     Lot                              Inventory      AR
IREV    Inspection Review                Quality        AR, SM-5
MWO     Maintenance Work Order           Maintenance    AR, SM-9
```

---

## 2. Other major roots (selected; full list per Part C chapters)

```
Customer Order         C1
Forecast               C1
Item                   C2
BOM                    C2
Routing                C2
Spec                   C2
MPS Schedule           C3
MRP Action             C3
Supplier               C4
Bin                    C5
Stock Move             C5
Adjustment             C5
Operation              C6
Yield Record           C6
Audit Finding          C7
Doc Review             C7
Lot Genealogy Chain    C8
Serial                 C8
Asset                  C9
PM Plan                C9
Calibration Record     C9
Person                 C10
Skill                  C10
Training Record        C10
Cost Center            C11
GL Posting             C11
Cost Roll              C11
Connector              C12
Subscription           C12
KPI Snapshot           C13
Advisory               C13
Model                  C13
Tenant                 C14
Role                   C14
Identity               C14
Audit Event            C14
... per Part C
```

---

## 3. Roots per state machine

See M4 for the inverse index (state machine → roots it governs).

---

## 4. Decision phrase

```
M3_ROOT_CATALOG_BASELINE_LOCKED
NEXT: M4_STATE_MACHINE_DIRECTORY.md
```
