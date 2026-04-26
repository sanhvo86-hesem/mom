# M2 — Domain Models

```
chapter_purpose: bounded-context map per Domain-Driven Design;
                 ownership rules, cross-domain reference, replication
                 strategy, anti-corruption layer policy
owner_role:      Domain Leads (one per domain) with Plan Editor
sources:         Domain-Driven Design (Evans 2003 + reds Vernon 2013),
                 ISA-95 functional hierarchy, Microservices boundary
                 patterns
```

The 14 bounded contexts of HESEM. Each context owns a coherent set
of authoritative roots (per M3) and a coherent ubiquitous language.
Cross-context interaction passes through explicit interfaces (APIs +
events) — never through shared schema.

---

## 1. Domain map (per Part C chapters)

```
ID    DOMAIN                   OWNS                                       PART_C
1     Commercial                Quote, Sales Order, Customer PO,           C1
                               Forecast, Customer master,
                               Customer Contract, RMA
2     Engineering                Item, BOM, Routing, Spec, ECO, DFMEA,     C2
                               PFMEA, DHF (MD), HARA (Auto)
3     Planning                  MPS, MRP, Demand Plan, Capacity Plan,      C3
                               APQP Project (Auto), AS9145 (Aero)
4     Procurement                PO, Supplier, Supplier Qualification,    C4
                               PPAP (Auto), NADCAP cert (Aero),
                               FSVP (Food), SCAR
5     Inventory                  Lot, Serial, Bin, Stock Move,             C5
                               Adjustment, DSCSA Transaction (Pharma),
                               FSMA §204 KDE/CTE (Food),
                               ITAR Item Control (Aero)
6     Shopfloor / MES            WO, Operation, Yield, SPC,                 C6
                               EBR (Pharma), LPA (Auto), HACCP (Food),
                               FAI (Aero); SCADA + Edge Gateway
7     Quality / eQMS             NC, CAPA, Doc, Audit, Inspection,         C7
                               Disposition, Batch Release, Vigilance,
                               PSUR, Risk File
8     Traceability                Lot Genealogy, Serial, UDI (MD),         C8
                               DSCSA + EU FMD (Pharma)
9     Maintenance                Asset, PM Plan, MWO, Calibration,         C9
                               Service Bulletin Compliance (Aero)
10    Workforce                  Person, Skill, Training, Schedule,        C10
                               Aseptic Personnel Qualification (Pharma),
                               PCQI (Food), ITAR Person-of-Record (Aero)
11    Finance                    Cost Center, GL, Cost Roll                C11
12    Integration                Connector, Subscription, Event,           C12
                               EDI (Auto), DSCSA partner (Pharma),
                               EUDAMED / GUDID (MD), EPCIS, SAS connector
13    Analytics / AI             KPI, Score, Advisory, Model, Override,    C13
                               Drift, Retraining
14    Core Platform              Tenant, Role, Identity, Auth Event,       C14
                               Audit Event, Audit Anchor, Pseudonymization
                               Key, Hold Record, ROPA, DPA, Sub-Processor
```

---

## 2. Bounded-context rules

```
SINGLE OWNERSHIP             every authoritative root belongs to one
                             domain. Other domains reference; never own.

NO SHARED MUTABLE STATE       domains do not write into each other's
                             tables. Cross-domain effect is via:
                             - explicit API call (per E0..E15)
                             - workflow event (per B7 saga)
                             - CDC (B8 outbound replication of read
                               models)

UBIQUITOUS LANGUAGE           per domain; per Part C; cited via M1
                             (glossary). Same word can mean different
                             things in different domains; explicit
                             translation at boundary (anti-corruption
                             layer).

ANTI-CORRUPTION LAYER        boundary mapping isolates each domain
                             from changes in others. Engineering's
                             "Item" maps to Inventory's "Item" via
                             explicit translator that absorbs
                             schema difference.

EVENT-DRIVEN INTEGRATION     state changes emit events; consumers
                             react; no synchronous coupling beyond
                             RPC where contract demands.

REGULATED-DOMAIN BOUNDARIES   regulatory ownership concentrated in
                             Quality (C7); other domains contribute
                             evidence + state but do not own the
                             regulated decision (per L1 boundary).
```

---

## 3. Cross-domain reference data

Several entities are referenced by every domain but authored once:

```
ENTITY              AUTHORING DOMAIN     CONSUMERS
Item                Engineering (C2)      Procurement, Inventory,
                                          Shopfloor, Quality, Trace
Lot                 Inventory (C5)        Shopfloor, Quality, Trace,
                                          Maintenance
Serial              Inventory + Trace      Shopfloor, Quality
Person              Workforce (C10)        every domain (signers,
                                          actors)
Role                Core (C14)             every domain (auth)
Tenant              Core (C14)             every domain (isolation)
Cost Center         Finance (C11)         Procurement, Shopfloor
Asset               Maintenance (C9)      Shopfloor, Quality, Trace
Spec                Engineering (C2)      Quality (inspection plans),
                                          Procurement (incoming spec)
Document            Quality (C7)           every domain (effective SOPs)
Customer            Commercial (C1)       Quality (complaint),
                                          Trace (recall)
Supplier            Procurement (C4)      Quality (SCAR),
                                          Inventory (receipts),
                                          Trace (genealogy)
```

Replication is one-directional per CDC (per B8). The authoring
domain owns truth; consuming domains hold a read-only mirror that
catches up via events.

---

## 4. Domain-to-state-machine map (per M4)

```
DOMAIN                  STATE MACHINES OWNED
Commercial               SM-1 (Order Lifecycle)
Engineering              SM-7 (Document Lifecycle)
Planning                 SM-APQP (Auto pack overlay)
Procurement              SM-2 (Procurement Lifecycle)
Inventory                -
Shopfloor / MES          SM-3 (Work Order Lifecycle)
Quality / eQMS           SM-4 + SM-5 + SM-6 + SM-10 + SM-11 + SM-12
                         + SM-13 + SM-14 + SM-DEV + SM-STAB +
                         SM-VIG + SM-PSUR + SM-FSCA + SM-CCP-MONITOR
Maintenance              SM-9
Workforce                SM-8 (Training Qualification)
```

---

## 5. Domain-to-API-family map (per Part E)

```
DOMAIN                  PRIMARY API FAMILIES
Commercial               E3 + E4 + E5 (workspace projection)
Engineering              E3 + E4 + E5
Planning                 E3 + E4 + E5
Procurement              E3 + E4 + E5 + E15 (EDI)
Inventory                E4 + E5
Shopfloor / MES          E3 + E4 + E5 + E15 (edge + SCADA)
Quality / eQMS           E3 + E4 + E5 + E7 (e-sig) + E8 (evidence)
Traceability             E4 + E5 + E11 (bulk; lookups)
Maintenance              E3 + E4 + E5
Workforce                E1 + E3 + E4 + E5
Finance                  E4 + E5
Integration              E15
Analytics / AI           E5 + E9 (advisory)
Core Platform            E1 + E2 + E6 (audit) + E14 (admin)
```

---

## 6. Domain-to-frontend-pattern map (per Part F)

```
DOMAIN                  PRIMARY PATTERNS
Commercial               DL + ML + WS + AR + AC + Wizard (quote/order)
Engineering              DL + ML + WS + AR (Item, BOM, Routing,
                         Spec, ECO) + Wizard
Planning                 DL + ML + WS + AR (APQP)
Procurement              DL + ML + WS + AR (PO, Supplier) + AC
Inventory                DL + ML + WS (Stock Move, Lot)
Shopfloor / MES          DL + ML + WS (Dispatch) + AR (WO, EBR, FAI,
                         CCP) + AC (real-time)
Quality / eQMS           DL + ML + WS + AR (NC, CAPA, Audit, Vigilance,
                         Risk) + AC + Wizard (Risk File, PSUR)
Traceability             ML + WS (genealogy, recall)
Maintenance              DL + ML + WS + AR (MWO, PM, Calibration)
Workforce                DL + ML + WS + AR (Person, Skill, Training)
Finance                  DL + ML + WS
Integration              ML + WS (Connector, Subscription)
Analytics / AI           DL + WS (KPI, AI advisories everywhere)
Core Platform            DL + ML + AR (Tenant, Role, Identity)
```

---

## 7. Per-pack domain overlays (per Part J)

```
PACK         DOMAINS HEAVILY EXTENDED
Pharma (J1)   Quality (EBR + APR + Stability + Vigilance + DSCSA);
              Shopfloor (cleaning + EM); Workforce (aseptic
              qualification)
Auto (J2)     Procurement (PPAP + supplier); Quality (LPA + 8D);
              Engineering (DFMEA + PFMEA); Planning (APQP)
Aero (J3)     Quality (FAI + counterfeit); Procurement (NADCAP);
              Workforce (ITAR person-of-record); Maintenance
              (service-life + AD/SB)
MD (J4)        Engineering (DHF + DMR + IEC 62304 + cyber);
              Quality (Vigilance + PSUR + FSCA + Risk File);
              Maintenance (calibration + service)
Food (J5)      Quality (HACCP + FSMA Part 117 + EMP); Procurement
              (FSVP); Trace (FSMA §204 + recall)
```

---

## 8. Domain RACI shorthand

```
Each domain has a Domain Lead + per-Part-C area of expertise.
Cross-domain decisions go to Engineering Lead (architecture) or
Quality Lead (regulated impact) or Compliance Lead (regulatory
impact) or Founder (strategic).

Per-state-machine + per-workflow ownership documented in
Part D (workflows) and per Part C (domain).
```

---

## 9. Decision phrase

```
M2_DOMAIN_MODELS_BASELINE_LOCKED
NEXT: M3_ROOT_CATALOG.md
```
