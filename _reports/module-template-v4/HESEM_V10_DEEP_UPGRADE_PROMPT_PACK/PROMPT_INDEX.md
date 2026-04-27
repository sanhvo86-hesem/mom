# HESEM V10 Prompt Pack — Master Index

54 sub-prompts across 4 parallel streams + 3 consolidator prompts.

---

## Stream 1: Platform Backbone (9 sub-prompts)

```
S1-00  Stream Master
S1-01  B0 Overview + B1 Layered Architecture
S1-02  B2 Authority Ledger
S1-03  B3 Operational Truth Graph
S1-04  B4 State Machine Network + B5 Data Flow / Lineage
S1-05  B6 Cross-Cutting Concerns
S1-06  B7 Deployment Topology + B8 Integration Boundaries
S1-07  B9 Observability + Metrics
S1-08  C12 Integration + C13 Analytics-AI + C14 Core Platform
S1-09  E0 + E1 + E2 + E3 + E14 (core APIs)
```

---

## Stream 2: Domains + Workflows (14 sub-prompts)

```
S2-00  Stream Master
S2-01  C1 Commercial + C2 Engineering
S2-02  C3 Planning + C4 Procurement
S2-03  C5 Inventory + C6 Shopfloor / MES
S2-04  C7 Quality / eQMS (alone — biggest)
S2-05  C8 Traceability + C9 Maintenance
S2-06  C10 Workforce + C11 Finance
S2-07  D1 Order to Cash (alone — densest)
S2-08  D2 Procurement to Pay + D3 Plan to Produce
S2-09  D4 Receive to Inspect + D5 Inspect to Disposition
S2-10  D6 NC to CAPA + D7 Document to Release
S2-11  D8 Train to Qualify + D9 Maintain to Restore
S2-12  D10 Batch to Release (alone — densest regulated)
S2-13  D11 Release to Trace + D12 Complaint to Recall
S2-14  D13 Audit to Remediate + D14 Validate to Qualify
```

---

## Stream 3: APIs + Frontend (12 sub-prompts)

```
S3-00  Stream Master
S3-01  E4 Record per Domain (across 14 domains)
S3-02  E5 Workspace Projection + E6 Audit
S3-03  E7 E-Sig + E8 Evidence
S3-04  E9 AI Advisory
S3-05  E10 Notification + E11 Bulk + E12 File + E13 LRO
S3-06  E15 Integration
S3-07  F0 Overview + F1 Shell + F2 Dashboard
S3-08  F3 Module List + F4 Workspace
S3-09  F5 Authoritative Record Shell + F6 Action Console
S3-10  F7 Drawers + F8 Wizards
S3-11  F9 Frontend↔Backend Binding
S3-12  F10 Design + F11 Accessibility + F12 i18n
```

---

## Stream 4: Compliance + Ops + Verticals + Business + Reference (16 sub-prompts)

```
S4-00  Stream Master
S4-01  H1 Regulatory Landscape (alone)
S4-02  H2 Validation Lifecycle + H3 Audit Program
S4-03  H4 Evidence Taxonomy + H5 Retention/WORM
S4-04  H6 Periodic Review + H7 Change Control
S4-05  H8 CAPA + H9 Risk Management
S4-06  I1 Deploy + I2 Observability/SLO
S4-07  I3 Incident + I4 DR
S4-08  I5 Capacity + I6 Cost + I7 Security + I8 Tenant
S4-09  J1 Pharma (alone)
S4-10  J2 Auto + J3 Aero
S4-11  J4 MD + J5 Food
S4-12  L0..L5 AI Discipline (consolidated)
S4-13  K1 + K2 + K3 + K4 + K5 Business
S4-14  M1 Glossary + M2 Domain Models + M3 Root Catalog
S4-15  M4 SM Directory + M5 SLO Directory + M6 Risk Register
S4-16  M7 Decision Phrases + M8 Standards + M9 Bibliography
```

---

## Consolidator (3 sub-prompts)

```
C-00   Consolidator Master
C-01   Mid-Cycle Reconciliation (run after streams ~50% complete)
C-02   Final Integration (run after all streams complete)
C-03   V10 Release Notes + diff vs V9
```

---

## Run order

```
DAY 1            S1-01 + S2-01 + S3-01 + S4-01 (4 starters)
DAY 2-N          continue per stream until each stream done
                 (parallel)
~MID-CYCLE        run C-01 reconciliation (single stream)
~END               run C-02 + C-03 final (single stream)
```

Total wall time per worker (longest stream S4 = 16 prompts at
~80 min each) ≈ 21 hours focused work distributed.

## Decision phrase

```
PROMPT_INDEX_BASELINE_LOCKED
```
