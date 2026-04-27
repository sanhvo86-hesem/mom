# PART_D — WORKFLOW CATALOG — Overview

Part D describes the 14 end-to-end workflows that span multiple domains
in HESEM. Where Part C describes capabilities (what each domain does),
Part D describes flows (how the domains work together to accomplish a
business outcome).

A workflow is the customer's perspective: "what does it look like when
we run an order through your system?" The answer is one or more Part D
chapters.

---

## 1. The 14 workflows

```
D1   Order to Cash                quotation through invoicing
D2   Procurement to Pay           supplier order through payment
D3   Plan to Produce              demand through production
D4   Receive to Inspect           material arrival through quality clearance
D5   Inspect to Disposition       inspection through accept/reject decision
D6   NC to CAPA                   nonconformance through corrective action close
D7   Document to Release          document draft through controlled release
D8   Train to Qualify             training assignment through certification
D9   Maintain to Restore          equipment maintenance from PM through return-to-service
D10  Batch to Release             pharma batch from start through release (vertical)
D11  Release to Trace             finished goods release through customer delivery
D12  Complaint to Recall          customer complaint through recall (when warranted)
D13  Audit to Remediate           audit finding through corrective action close
D14  Validate to Qualify          URS through PQ for regulated systems
```

These are the 14 chapters of Part D plus this overview (D0).

---

## 2. Per-chapter shape

Every workflow chapter follows the same shape:

```
1.  Workflow identity (id, name, owner role)
2.  Purpose (the business outcome)
3.  Trigger (what starts the workflow)
4.  Actors (the roles involved)
5.  Steps (the sequence of activities)
6.  Decision points (branching logic)
7.  Data flow (what records are created or updated)
8.  Evidence captured (what audit / regulatory evidence is produced)
9.  Cross-domain footprint (which domains in C touch the workflow)
10. State machines involved (which from B4)
11. APIs invoked (cross-reference to E)
12. Frontend surfaces involved (cross-reference to F)
13. Regulatory considerations
14. Wave target
15. Failure modes and recovery
16. Decision phrase
```

---

## 3. Workflow vs capability distinction

A capability (Part C) is what one domain does. A workflow (Part D) is
how multiple domains coordinate.

For example:
- "Inspection planning" is a capability of Quality (C7 CAP-C7-01).
- "Receive to Inspect" is a workflow that involves Procurement, Inventory,
  and Quality.

You can read Part C without Part D and understand domain function. You
can read Part D without Part C, but the references back to capabilities
matter. A Part D chapter without Part C cross-references would be
re-stating capabilities; with cross-references it tells the flow story.

---

## 4. Workflow ownership

Each workflow has a primary owner role plus participating roles.

| Workflow | Primary owner | Key participants |
|---|---|---|
| D1 Order to Cash | Commercial Lead | Logistics, Production, Quality, Finance |
| D2 Procurement to Pay | Procurement Lead | Quality, Logistics, Finance |
| D3 Plan to Produce | Planning Lead | Production, Procurement, Inventory |
| D4 Receive to Inspect | Logistics Lead | Procurement, Quality |
| D5 Inspect to Disposition | Quality Lead | Production, Logistics |
| D6 NC to CAPA | Quality Lead | Engineering, Procurement, Production |
| D7 Document to Release | Document Control Lead | Engineering, Quality, HR |
| D8 Train to Qualify | HR Lead | Quality, Engineering |
| D9 Maintain to Restore | Maintenance Lead | Production, Quality |
| D10 Batch to Release | Quality Lead (Pharma) | Production, Compliance |
| D11 Release to Trace | Quality Lead | Logistics, Commercial |
| D12 Complaint to Recall | Quality Lead | Commercial, Regulatory, Logistics |
| D13 Audit to Remediate | Quality Lead | All other domains as audited |
| D14 Validate to Qualify | Validation Lead | Compliance, Engineering |

---

## 5. Reading order within Part D

```
D0  this overview (3 min)
D1  Order to Cash (15 min)
D2  Procurement to Pay (12 min)
D3  Plan to Produce (15 min)
D4  Receive to Inspect (10 min)
D5  Inspect to Disposition (12 min)
D6  NC to CAPA (15 min — densest workflow)
D7  Document to Release (12 min)
D8  Train to Qualify (8 min)
D9  Maintain to Restore (10 min)
D10 Batch to Release (15 min — pharma vertical)
D11 Release to Trace (12 min)
D12 Complaint to Recall (15 min)
D13 Audit to Remediate (10 min)
D14 Validate to Qualify (15 min)
```

Total: ~3 hours for full Part D absorption.

---

## 6. Decision phrase

```
PART_D_OVERVIEW_BASELINE_LOCKED
NEXT: D1_ORDER_TO_CASH.md
```
